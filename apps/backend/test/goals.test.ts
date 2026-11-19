import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "bun:test";
import { calledWith, json, request, resetStripe, session, stripeState } from "./harness";

// The harness sets the database URL and registers mock.module replacements
// before any src module loads; static imports would hoist past that setup.
const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { goalRoutes, publicGoalRoutes } = await import("../src/goals/routes");
const { createSite, updateSite } = await import("../src/sites/store");
const { createGoal } = await import("../src/goals/store");
const { payRoutes } = await import("../src/pay/routes");
const { stripeRoutes } = await import("../src/stripe/routes");
const { createConnection, saveOnboarding } = await import("../src/stripe/store");

await ensureSchema();

const DAY_MS = 24 * 60 * 60 * 1000;

let siteId = "";

function monthStart(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

async function seedDonation(input: {
  goalId: string | null;
  amount: number;
  createdAt: number;
  siteId?: string;
}): Promise<void> {
  await libsqlClient.execute({
    sql: `INSERT INTO donations
            (id, site_id, account_id, session_id, payment_intent_id,
             amount, currency, application_fee, email, net, goal_id, created_at)
          VALUES (?, ?, 'acct_test', ?, NULL, ?, 'eur', 0, NULL, NULL, ?, ?)`,
    args: [
      randomUUID(),
      input.siteId ?? siteId,
      randomUUID(),
      input.amount,
      input.goalId,
      input.createdAt,
    ],
  });
}

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM donations");
  await libsqlClient.execute("DELETE FROM goals");
  await libsqlClient.execute("DELETE FROM stripe_connections");
  await libsqlClient.execute("DELETE FROM sites");
  session.user = { id: "user_1", email: "creator@example.com" };
  resetStripe();
  siteId = (await createSite({ userId: "user_1", currency: "eur" })).id;
});

describe("POST /api/goals", () => {
  async function create(body: Record<string, unknown>) {
    return json(await goalRoutes.handle(request("POST", "/api/goals", body)));
  }

  test("stores the target in minor units and starts at nothing raised", async () => {
    const { status, body } = await create({ name: "Server costs", target: 100, window: "monthly" });
    expect(status).toBe(200);
    expect(body.goal).toMatchObject({
      name: "Server costs",
      target: 10_000,
      window: "monthly",
      raised: 0,
    });
    expect((body.goal as { id: string }).id).toStartWith("qg_");
  });

  test("refuses a blank name, an unknown window and an out-of-range target", async () => {
    expect((await create({ name: "   ", target: 100, window: "monthly" })).status).toBe(400);
    expect((await create({ name: "Costs", target: 100, window: "weekly" })).status).toBe(400);
    expect((await create({ name: "Costs", target: 0, window: "monthly" })).status).toBe(400);
    expect((await create({ name: "Costs", target: 2_000_000, window: "monthly" })).status).toBe(400);
  });

  test("stops at twenty active goals but counts archived ones out", async () => {
    for (let index = 0; index < 20; index += 1) {
      await createGoal({ siteId, name: `Goal ${index}`, target: 10_000, window: "lifetime" });
    }
    expect((await create({ name: "One more", target: 100, window: "monthly" })).status).toBe(409);

    await libsqlClient.execute("UPDATE goals SET archived_at = 1 WHERE name = 'Goal 0'");
    expect((await create({ name: "One more", target: 100, window: "monthly" })).status).toBe(200);
  });

  test("refuses a caller without a session", async () => {
    session.user = null;
    expect((await create({ name: "Costs", target: 100, window: "monthly" })).status).toBe(401);
  });
});

describe("GET /api/goals", () => {
  test("reports a monthly goal's current month and a lifetime goal's whole history", async () => {
    const now = Date.now();
    const monthly = await createGoal({
      siteId,
      name: "This month",
      target: 10_000,
      window: "monthly",
    });
    const lifetime = await createGoal({
      siteId,
      name: "Forever",
      target: 50_000,
      window: "lifetime",
    });
    // One inside the current month, one comfortably before it.
    await seedDonation({ goalId: monthly.id, amount: 2500, createdAt: monthStart(now) + DAY_MS });
    await seedDonation({ goalId: monthly.id, amount: 4000, createdAt: monthStart(now) - DAY_MS });
    await seedDonation({ goalId: lifetime.id, amount: 2500, createdAt: monthStart(now) + DAY_MS });
    await seedDonation({ goalId: lifetime.id, amount: 4000, createdAt: monthStart(now) - DAY_MS });

    const { body } = await json(await goalRoutes.handle(request("GET", "/api/goals")));
    expect(body.currency).toBe("eur");
    expect(body.goals).toEqual([
      { id: monthly.id, name: "This month", target: 10_000, window: "monthly", raised: 2500 },
      { id: lifetime.id, name: "Forever", target: 50_000, window: "lifetime", raised: 6500 },
    ]);
  });

  test("leaves out archived goals and unattributed donations", async () => {
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });
    const gone = await createGoal({ siteId, name: "Old", target: 10_000, window: "lifetime" });
    await libsqlClient.execute({
      sql: "UPDATE goals SET archived_at = ? WHERE id = ?",
      args: [Date.now(), gone.id],
    });
    await seedDonation({ goalId: goal.id, amount: 1000, createdAt: Date.now() });
    await seedDonation({ goalId: null, amount: 9000, createdAt: Date.now() });

    const { body } = await json(await goalRoutes.handle(request("GET", "/api/goals")));
    expect(body.goals).toEqual([
      { id: goal.id, name: "Costs", target: 10_000, window: "lifetime", raised: 1000 },
    ]);
  });

  test("answers no_site for a creator who has not set one up", async () => {
    session.user = { id: "user_without_site", email: "new@example.com" };
    const { status, body } = await json(await goalRoutes.handle(request("GET", "/api/goals")));
    expect(status).toBe(404);
    expect(body.error).toBe("no_site");
  });
});

describe("PUT /api/goals/:id", () => {
  test("recomputes progress under the new window", async () => {
    const now = Date.now();
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });
    await seedDonation({ goalId: goal.id, amount: 3000, createdAt: monthStart(now) + DAY_MS });
    await seedDonation({ goalId: goal.id, amount: 5000, createdAt: monthStart(now) - DAY_MS });

    const { status, body } = await json(
      await goalRoutes.handle(
        request("PUT", `/api/goals/${goal.id}`, {
          name: "Monthly costs",
          target: 40,
          window: "monthly",
        }),
      ),
    );
    expect(status).toBe(200);
    expect(body.goal).toEqual({
      id: goal.id,
      name: "Monthly costs",
      target: 4000,
      window: "monthly",
      raised: 3000,
    });
  });

  test("cannot touch another creator's goal", async () => {
    const other = await createSite({ userId: "user_2", currency: "eur" });
    const goal = await createGoal({
      siteId: other.id,
      name: "Theirs",
      target: 10_000,
      window: "lifetime",
    });
    const { status } = await json(
      await goalRoutes.handle(
        request("PUT", `/api/goals/${goal.id}`, {
          name: "Mine now",
          target: 100,
          window: "lifetime",
        }),
      ),
    );
    expect(status).toBe(404);
  });
});

describe("DELETE /api/goals/:id", () => {
  test("archives the goal and keeps its donations", async () => {
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });
    await seedDonation({ goalId: goal.id, amount: 1000, createdAt: Date.now() });

    expect((await json(await goalRoutes.handle(request("DELETE", `/api/goals/${goal.id}`)))).status)
      .toBe(200);

    const { body } = await json(await goalRoutes.handle(request("GET", "/api/goals")));
    expect(body.goals).toEqual([]);
    const donations = await libsqlClient.execute("SELECT COUNT(*) AS total FROM donations");
    expect((donations.rows[0] as unknown as { total: number }).total).toBe(1);
  });
});

describe("GET /api/widget/goal/:id/progress", () => {
  async function progress(id: string) {
    const response = await publicGoalRoutes.handle(
      request("GET", `/api/widget/goal/${id}/progress`),
    );
    return { response, ...(await json(response)) };
  }

  test("reports the amounts and nothing else, cached for five minutes", async () => {
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });
    await seedDonation({ goalId: goal.id, amount: 4500, createdAt: Date.now() });

    const { status, body, response } = await progress(goal.id);
    expect(status).toBe(200);
    expect(body).toEqual({ raised: 4500, target: 10_000, currency: "eur" });
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });

  test("counts only the current month for a monthly goal", async () => {
    const now = Date.now();
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "monthly" });
    await seedDonation({ goalId: goal.id, amount: 4500, createdAt: monthStart(now) });
    await seedDonation({ goalId: goal.id, amount: 9900, createdAt: monthStart(now) - 1 });

    expect((await progress(goal.id)).body.raised).toBe(4500);
  });

  test("does not report an archived or unknown goal", async () => {
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });
    await libsqlClient.execute({
      sql: "UPDATE goals SET archived_at = ? WHERE id = ?",
      args: [Date.now(), goal.id],
    });
    expect((await progress(goal.id)).status).toBe(404);
    expect((await progress("qg_nope")).status).toBe(404);
  });
});

describe("donation attribution", () => {
  let publicKey = "";

  async function connectedSite(): Promise<void> {
    await updateSite("user_1", {
      currency: "eur",
      siteUrls: ["https://example.com"],
      country: "NL",
      entityType: "individual",
    });
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await saveOnboarding("acct_test", {
      identity: "done",
      localMethods: "done",
      payouts: "done",
      issues: {},
    });
  }

  async function createSession(goal?: string) {
    return json(
      await payRoutes.handle(
        new Request("http://localhost/api/pay/session", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "https://example.com" },
          body: JSON.stringify({
            site: publicKey,
            amount: 10,
            returnUrl: "https://example.com/thanks",
            ...(goal === undefined ? {} : { goal }),
          }),
        }),
      ),
    );
  }

  /** Runs the webhook Stripe would send back for a session carrying `metadata`. */
  async function completeDonation(metadata: Record<string, string>) {
    stripeState.webhookEvent = {
      type: "checkout.session.completed",
      account: "acct_test",
      data: {
        object: {
          id: `cs_${randomUUID()}`,
          payment_status: "paid",
          amount_total: 1000,
          currency: "eur",
          payment_intent: `pi_${randomUUID()}`,
          metadata,
          customer_details: { email: "supporter@example.com" },
        },
      },
    };
    return json(
      await stripeRoutes.handle(
        new Request("http://localhost/api/stripe/webhook", {
          method: "POST",
          headers: { "stripe-signature": "t=1,v1=sig" },
          body: "payload",
        }),
      ),
    );
  }

  async function goalIdOnDonations(): Promise<(string | null)[]> {
    const result = await libsqlClient.execute("SELECT goal_id FROM donations");
    return result.rows.map((row) => (row as unknown as { goal_id: string | null }).goal_id);
  }

  beforeEach(async () => {
    await connectedSite();
    const site = await libsqlClient.execute({
      sql: "SELECT public_key FROM sites WHERE id = ?",
      args: [siteId],
    });
    publicKey = (site.rows[0] as unknown as { public_key: string }).public_key;
  });

  test("carries a usable goal into the session metadata and onto the donation", async () => {
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });

    expect((await createSession(goal.id)).status).toBe(200);
    expect(calledWith("createDonationSession")).toMatchObject({ goalId: goal.id });

    await completeDonation({ quietjar_site: publicKey, quietjar_goal: goal.id });
    expect(await goalIdOnDonations()).toEqual([goal.id]);

    const { body } = await json(await goalRoutes.handle(request("GET", "/api/goals")));
    expect((body.goals as { raised: number }[])[0].raised).toBe(1000);
  });

  test("takes the payment but sets up no attribution against an archived goal", async () => {
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });
    await libsqlClient.execute({
      sql: "UPDATE goals SET archived_at = ? WHERE id = ?",
      args: [Date.now(), goal.id],
    });

    expect((await createSession(goal.id)).status).toBe(200);
    expect(calledWith("createDonationSession")).toMatchObject({ goalId: null });
  });

  test("archiving mid-payment does not rewrite what the goal raised", async () => {
    const goal = await createGoal({ siteId, name: "Costs", target: 10_000, window: "lifetime" });
    expect((await createSession(goal.id)).status).toBe(200);

    // The owner archives the goal while the supporter is still paying.
    await libsqlClient.execute({
      sql: "UPDATE goals SET archived_at = ? WHERE id = ?",
      args: [Date.now(), goal.id],
    });
    await completeDonation({ quietjar_site: publicKey, quietjar_goal: goal.id });

    expect(await goalIdOnDonations()).toEqual([goal.id]);
  });

  test("cannot point a widget at another site's goal", async () => {
    const other = await createSite({ userId: "user_2", currency: "eur" });
    const goal = await createGoal({
      siteId: other.id,
      name: "Theirs",
      target: 10_000,
      window: "lifetime",
    });

    expect((await createSession(goal.id)).status).toBe(200);
    expect(calledWith("createDonationSession")).toMatchObject({ goalId: null });

    await completeDonation({ quietjar_site: publicKey, quietjar_goal: goal.id });
    expect(await goalIdOnDonations()).toEqual([null]);
  });

  test("an unknown goal id is ignored rather than failing the payment", async () => {
    expect((await createSession("qg_nope")).status).toBe(200);
    expect(calledWith("createDonationSession")).toMatchObject({ goalId: null });
  });

  test("a donation with no goal in its metadata stays unattributed", async () => {
    await completeDonation({ quietjar_site: publicKey });
    expect(await goalIdOnDonations()).toEqual([null]);
  });
});
