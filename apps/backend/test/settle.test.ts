import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "bun:test";
import { calledWith, resetStripe, stripeCalls, stripeState } from "./harness";

const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { createSite } = await import("../src/sites/store");
const { earningsSum } = await import("../src/pay/store");
const { settlePendingDonations } = await import("../src/pay/settle");

await ensureSchema();

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 24, 12, 0, 0);

let siteId = "";

async function seedDonation(input: {
  paymentIntentId?: string | null;
  net?: number | null;
  applicationFee?: number | null;
  createdAt?: number;
}): Promise<string> {
  const sessionId = randomUUID();
  await libsqlClient.execute({
    sql: `INSERT INTO donations
            (id, site_id, account_id, session_id, payment_intent_id,
             amount, currency, application_fee, net, created_at)
          VALUES (?, ?, 'acct_test', ?, ?, 300, 'eur', ?, ?, ?)`,
    args: [
      randomUUID(),
      siteId,
      sessionId,
      input.paymentIntentId === undefined ? "pi_test" : input.paymentIntentId,
      input.applicationFee ?? null,
      input.net ?? null,
      input.createdAt ?? NOW - 60_000,
    ],
  });
  return sessionId;
}

async function amounts(sessionId: string) {
  const result = await libsqlClient.execute({
    sql: "SELECT net, application_fee FROM donations WHERE session_id = ?",
    args: [sessionId],
  });
  return result.rows[0] as unknown as { net: number | null; application_fee: number | null };
}

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM donations");
  await libsqlClient.execute("DELETE FROM sites");
  siteId = (await createSite({ userId: randomUUID(), currency: "eur" })).id;
  resetStripe();
});

describe("settlePendingDonations", () => {
  test("fills in what a donation settled to, so earnings count it", async () => {
    const sessionId = await seedDonation({});
    expect(await earningsSum(siteId, 0)).toBe(0);

    stripeState.chargeAmounts = { net: 250, applicationFee: 50 };
    expect(await settlePendingDonations(NOW)).toBe(1);

    expect(calledWith("chargeAmounts")).toEqual({
      accountId: "acct_test",
      paymentIntentId: "pi_test",
    });
    expect(await amounts(sessionId)).toEqual({ net: 250, application_fee: 50 });
    expect(await earningsSum(siteId, 0)).toBe(250);
  });

  test("leaves the donation for the next pass while Stripe has no figures yet", async () => {
    const sessionId = await seedDonation({});
    stripeState.chargeAmounts = { net: null, applicationFee: null };
    expect(await settlePendingDonations(NOW)).toBe(0);
    expect(await amounts(sessionId)).toEqual({ net: null, application_fee: null });
  });

  test("does not ask about settled, week-old or intent-less donations", async () => {
    await seedDonation({ net: 250, applicationFee: 50 });
    await seedDonation({ createdAt: NOW - 8 * DAY_MS });
    await seedDonation({ paymentIntentId: null });
    stripeState.chargeAmounts = { net: 250, applicationFee: 50 };

    expect(await settlePendingDonations(NOW)).toBe(0);
    expect(stripeCalls).toHaveLength(0);
  });
});
