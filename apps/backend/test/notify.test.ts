import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "bun:test";
import { emailState, resetEmail, sentEmails, users } from "./harness";

// The harness sets the database URL and registers mock.module replacements
// before any src module loads; static imports would hoist past that setup.
const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { createSite } = await import("../src/sites/store");
const { saveDonationDetails } = await import("../src/pay/store");
const { sendPendingDonationEmails } = await import("../src/notify/donation");

await ensureSchema();

const MINUTE_MS = 60 * 1000;
const NOW = Date.UTC(2026, 8, 14, 12, 0, 0);

let siteId = "";

async function seedDonation(input: {
  amount?: number;
  currency?: string;
  createdAt?: number;
  name?: string;
  message?: string;
}): Promise<string> {
  const sessionId = randomUUID();
  await libsqlClient.execute({
    sql: `INSERT INTO donations
            (id, site_id, account_id, session_id, payment_intent_id,
             amount, currency, application_fee, created_at)
          VALUES (?, ?, 'acct_test', ?, NULL, ?, ?, 0, ?)`,
    args: [
      randomUUID(),
      siteId,
      sessionId,
      input.amount ?? 2500,
      input.currency ?? "eur",
      input.createdAt ?? NOW - 10 * MINUTE_MS,
    ],
  });
  if (input.name !== undefined || input.message !== undefined) {
    await saveDonationDetails({
      sessionId,
      name: input.name ?? null,
      message: input.message ?? null,
    });
  }
  return sessionId;
}

async function notifiedAt(sessionId: string): Promise<number | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT notified_at FROM donations WHERE session_id = ?",
    args: [sessionId],
  });
  const row = result.rows[0] as unknown as { notified_at: number | null } | undefined;
  return row?.notified_at ?? null;
}

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM donation_details");
  await libsqlClient.execute("DELETE FROM donations");
  await libsqlClient.execute("DELETE FROM sites");
  resetEmail();
  const site = await createSite({ userId: "user_1", currency: "eur" });
  siteId = site.id;
  users.user_1 = { id: "user_1", email: "creator@example.com" };
});

describe("sendPendingDonationEmails", () => {
  test("emails the creator once, with the amount and the supporter's words", async () => {
    await seedDonation({ amount: 2500, name: "Dan", message: "Thanks for the docs." });

    await sendPendingDonationEmails(NOW);

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe("creator@example.com");
    expect(sentEmails[0].subject).toBe("Dan became a supporter");
    expect(sentEmails[0].html).toContain("€25.00 received");
    expect(sentEmails[0].html).toContain("Dan wrote:");
    expect(sentEmails[0].html).toContain("Thanks for the docs.");
  });

  test("a second sweep sends nothing for a donation already announced", async () => {
    const sessionId = await seedDonation({ name: "Dan" });

    await sendPendingDonationEmails(NOW);
    await sendPendingDonationEmails(NOW + MINUTE_MS);

    expect(sentEmails).toHaveLength(1);
    expect(await notifiedAt(sessionId)).toBe(NOW);
  });

  test("holds a donation back until the grace period has passed", async () => {
    await seedDonation({ createdAt: NOW - MINUTE_MS, name: "Dan", message: "Hello." });

    await sendPendingDonationEmails(NOW);
    expect(sentEmails).toHaveLength(0);

    await sendPendingDonationEmails(NOW + 5 * MINUTE_MS);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].html).toContain("Hello.");
  });

  test("sends nothing when the creator turned the emails off, and does not catch up later", async () => {
    users.user_1 = { id: "user_1", email: "creator@example.com", notifyOnDonation: false };
    const sessionId = await seedDonation({ name: "Dan" });

    await sendPendingDonationEmails(NOW);

    expect(sentEmails).toHaveLength(0);
    expect(await notifiedAt(sessionId)).toBe(NOW);

    users.user_1 = { id: "user_1", email: "creator@example.com", notifyOnDonation: true };
    await sendPendingDonationEmails(NOW + 10 * MINUTE_MS);
    expect(sentEmails).toHaveLength(0);
  });

  test("treats an account that never saw the setting as opted in", async () => {
    users.user_1 = { id: "user_1", email: "creator@example.com", notifyOnDonation: null };
    await seedDonation({});

    await sendPendingDonationEmails(NOW);

    expect(sentEmails).toHaveLength(1);
  });

  test("sends a bare email when the supporter left no name and no message", async () => {
    await seedDonation({ amount: 500 });

    await sendPendingDonationEmails(NOW);

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toBe("Someone became a supporter");
    expect(sentEmails[0].html).toContain("€5.00 received");
    expect(sentEmails[0].html).not.toContain("wrote:");
  });

  test("a failed send is not retried and does not stall the rest of the batch", async () => {
    const failing = await seedDonation({ createdAt: NOW - 20 * MINUTE_MS, name: "First" });
    await seedDonation({ createdAt: NOW - 10 * MINUTE_MS, name: "Second" });
    emailState.failNextSend = true;

    await sendPendingDonationEmails(NOW);

    expect(sentEmails.map((mail) => mail.subject)).toEqual(["Second became a supporter"]);
    expect(await notifiedAt(failing)).toBe(NOW);

    await sendPendingDonationEmails(NOW + 10 * MINUTE_MS);
    expect(sentEmails).toHaveLength(1);
  });

  test("capitalises the supporter's name in the subject and the body", async () => {
    await seedDonation({ name: "dan", message: "Hello." });

    await sendPendingDonationEmails(NOW);

    expect(sentEmails[0].subject).toBe("Dan became a supporter");
    expect(sentEmails[0].html).toContain("Dan wrote:");
  });

  test("keeps a name's own casing past the first letter", async () => {
    await seedDonation({ name: "danMcGrath" });

    await sendPendingDonationEmails(NOW);

    expect(sentEmails[0].subject).toBe("DanMcGrath became a supporter");
    expect(sentEmails[0].html).toContain("From DanMcGrath.");
  });

  test("escapes a supporter's markup instead of putting it in the email", async () => {
    await seedDonation({ name: "<b>Dan</b>", message: "<script>alert(1)</script>" });

    await sendPendingDonationEmails(NOW);

    expect(sentEmails[0].html).toContain("&lt;b&gt;Dan&lt;/b&gt; wrote:");
    expect(sentEmails[0].html).not.toContain("<script>");
  });
});
