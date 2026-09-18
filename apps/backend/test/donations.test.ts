import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "bun:test";
import { calledWith, json, request, resetStripe, session, stripeState } from "./harness";
import { getDonationBySessionId } from "../src/pay/store";

// The harness sets the database URL and registers mock.module replacements
// before any src module loads; static imports would hoist past that setup.
const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { donationRoutes } = await import("../src/donations/routes");
const { payRoutes } = await import("../src/pay/routes");
const { stripeRoutes } = await import("../src/stripe/routes");
const { createSite } = await import("../src/sites/store");
const { saveDonationDetails } = await import("../src/pay/store");
const { createConnection } = await import("../src/stripe/store");

await ensureSchema();

const DAY_MS = 24 * 60 * 60 * 1000;

interface Seed {
  amount: number;
  applicationFee: number;
  net: number | null;
  email: string | null;
  createdAt: number;
}

async function seedDonation(seed: Seed): Promise<string> {
  const sessionId = randomUUID();
  await libsqlClient.execute({
    sql: `INSERT INTO donations
            (id, site_id, account_id, session_id, payment_intent_id,
             amount, currency, application_fee, email, net, created_at)
          VALUES (?, ?, 'acct_test', ?, NULL, ?, 'eur', ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      siteId,
      sessionId,
      seed.amount,
      seed.applicationFee,
      seed.email,
      seed.net,
      seed.createdAt,
    ],
  });
  return sessionId;
}

let siteId = "";
let publicKey = "";

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM donation_details");
  await libsqlClient.execute("DELETE FROM donations");
  await libsqlClient.execute("DELETE FROM stripe_connections");
  await libsqlClient.execute("DELETE FROM sites");
  session.user = { id: "user_1", email: "creator@example.com" };
  resetStripe();
  const site = await createSite({ userId: "user_1", currency: "eur" });
  // /api/pay/status only consults Stripe once the creator has a connection,
  // so the suite runs as a connected creator instead of hoping another test
  // file leaves one behind.
  await createConnection({ userId: "user_1", accountId: "acct_test" });
  siteId = site.id;
  publicKey = site.publicKey;
});

describe("GET /api/donations/earnings", () => {
  async function earnings(period: string) {
    return json(
      await donationRoutes.handle(request("GET", `/api/donations/earnings?period=${period}`)),
    );
  }

  test("refuses a signed-out caller", async () => {
    session.user = null;
    const { status, body } = await earnings("30d");
    expect(status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  test("sums the stored net, falling back to gross minus our fee", async () => {
    const now = Date.now();
    await seedDonation({ amount: 1000, applicationFee: 50, net: 900, email: null, createdAt: now });
    await seedDonation({
      amount: 2000,
      applicationFee: 100,
      net: null,
      email: null,
      createdAt: now,
    });
    const { status, body } = await earnings("30d");
    expect(status).toBe(200);
    expect(body.net).toBe(2800);
    expect(body.currency).toBe("eur");
  });

  test("the period window filters the sum", async () => {
    await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now() - 40 * DAY_MS,
    });
    expect((await earnings("30d")).body.net).toBe(0);
    expect((await earnings("90d")).body.net).toBe(900);
    expect((await earnings("all")).body.net).toBe(900);
  });

  test("a creator with no donations sees zero", async () => {
    expect((await earnings("30d")).body.net).toBe(0);
  });
});

describe("GET /api/donations/earnings/series", () => {
  async function series(period: string) {
    return json(
      await donationRoutes.handle(
        request("GET", `/api/donations/earnings/series?period=${period}`),
      ),
    );
  }

  interface Point {
    at: number;
    net: number;
  }

  test("refuses a signed-out caller", async () => {
    session.user = null;
    const { status, body } = await series("30d");
    expect(status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  test("sums each day into what was kept", async () => {
    const now = Date.now();
    await seedDonation({ amount: 1000, applicationFee: 50, net: 900, email: null, createdAt: now });
    await seedDonation({ amount: 500, applicationFee: 25, net: 450, email: null, createdAt: now });

    const { status, body } = await series("30d");
    expect(status).toBe(200);
    expect(body.currency).toBe("eur");
    expect(body.bucket).toBe("day");

    const points = body.points as Point[];
    expect(points.at(-1)?.net).toBe(1350);
  });

  test("a day with no donation is a zero bucket, not a gap", async () => {
    await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now() - 3 * DAY_MS,
    });

    const points = (await series("30d")).body.points as Point[];
    // 30 whole days back plus today.
    expect(points).toHaveLength(31);
    expect(points.every((point) => typeof point.net === "number")).toBe(true);
    expect(points.filter((point) => point.net > 0)).toHaveLength(1);
    expect(points.at(-1)?.net).toBe(0);
  });

  test("the period picks the bucket width", async () => {
    expect((await series("30d")).body.bucket).toBe("day");
    expect((await series("90d")).body.bucket).toBe("week");
    expect((await series("all")).body.bucket).toBe("month");
  });

  test("the change is measured against the window before this one", async () => {
    await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now() - 40 * DAY_MS,
    });

    expect((await series("30d")).body.previous).toBe(900);

    // Nothing precedes all time, so there is nothing to compare against.
    expect((await series("all")).body.previous).toBeNull();
  });

  test("all time starts at the first donation, not at the epoch", async () => {
    await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now() - 40 * DAY_MS,
    });

    const points = (await series("all")).body.points as Point[];
    expect(points.length).toBeLessThanOrEqual(3);
    expect(points[0].at).toBeGreaterThan(Date.now() - 70 * DAY_MS);
  });

  test("a creator with no donations still gets an axis", async () => {
    const { status, body } = await series("all");
    expect(status).toBe(200);
    expect(body.points as unknown[]).toHaveLength(1);
    expect((body.points as Point[])[0].net).toBe(0);
  });
});

describe("GET /api/donations/recent", () => {
  async function recent(offset?: number) {
    const suffix = offset === undefined ? "" : `?offset=${offset}`;
    return json(await donationRoutes.handle(request("GET", `/api/donations/recent${suffix}`)));
  }

  test("refuses a signed-out caller", async () => {
    session.user = null;
    const { status, body } = await recent();
    expect(status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  test("lists newest first with the supporter's details joined", async () => {
    const now = Date.now();
    const old = await seedDonation({
      amount: 500,
      applicationFee: 25,
      net: null,
      email: null,
      createdAt: now - DAY_MS,
    });
    await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: null,
      email: "supporter@example.com",
      createdAt: now,
    });
    await saveDonationDetails({ sessionId: old, name: "Old Name", message: "Old message" });

    const { status, body } = await recent();
    expect(status).toBe(200);
    const donations = body.donations as Array<Record<string, unknown>>;
    expect(donations).toHaveLength(2);
    expect(donations[0].amount).toBe(1000);
    expect(donations[0].email).toBe("supporter@example.com");
    expect(donations[0].name).toBeNull();
    expect(donations[1].name).toBe("Old Name");
    expect(donations[1].message).toBe("Old message");
    expect(body.hasMore).toBe(false);
  });
  test("pages through with hasMore until the list ends", async () => {
    const now = Date.now();
    for (let i = 0; i < 25; i += 1) {
      await seedDonation({
        amount: 100,
        applicationFee: 5,
        net: null,
        email: null,
        createdAt: now - i,
      });
    }
    const first = await recent();
    expect(first.body.donations as unknown[]).toHaveLength(20);
    expect(first.body.hasMore).toBe(true);
    const second = await recent(20);
    expect(second.body.donations as unknown[]).toHaveLength(5);
    expect(second.body.hasMore).toBe(false);
  });

  test("an empty history is an empty page, not an error", async () => {
    const { status, body } = await recent();
    expect(status).toBe(200);
    expect(body.donations as unknown[]).toHaveLength(0);
    expect(body.hasMore).toBe(false);
  });
});

describe("POST /api/pay/details", () => {
  async function postDetails(body: Record<string, unknown>) {
    return json(await payRoutes.handle(request("POST", "/api/pay/details", body)));
  }

  test("stores the submitted name and message against the session", async () => {
    const sessionId = await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: "supporter@example.com",
      createdAt: Date.now(),
    });
    const { status } = await postDetails({
      session: sessionId,
      name: "  Ann  ",
      message: " Hi there ",
    });
    expect(status).toBe(200);
    const { body } = await json(
      await donationRoutes.handle(request("GET", "/api/donations/recent")),
    );
    const donations = body.donations as Array<Record<string, unknown>>;
    expect(donations[0].name).toBe("Ann");
    expect(donations[0].message).toBe("Hi there");
  });

  test("the first submit wins", async () => {
    const sessionId = await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now(),
    });
    await postDetails({ session: sessionId, name: "Ann", message: "First" });
    await postDetails({ session: sessionId, name: "Bob", message: "Second" });
    const { body } = await json(
      await donationRoutes.handle(request("GET", "/api/donations/recent")),
    );
    const donations = body.donations as Array<Record<string, unknown>>;
    expect(donations[0].name).toBe("Ann");
    expect(donations[0].message).toBe("First");
  });

  test("blank fields are stored as absent, not as empty strings", async () => {
    const sessionId = await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now(),
    });
    const { status } = await postDetails({ session: sessionId, name: "   ", message: "" });
    expect(status).toBe(200);
    const { body } = await json(
      await donationRoutes.handle(request("GET", "/api/donations/recent")),
    );
    const donations = body.donations as Array<Record<string, unknown>>;
    expect(donations[0].name).toBeNull();
    expect(donations[0].message).toBeNull();
  });

  test("rejects a message past the visible limit", async () => {
    const sessionId = await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now(),
    });
    const { status } = await postDetails({
      session: sessionId,
      name: "Ann",
      message: "x".repeat(281),
    });
    expect(status).toBe(422);
  });

  test("rate limits a burst from one address", async () => {
    const sessionId = await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: null,
      createdAt: Date.now(),
    });
    let last = 200;
    for (let i = 0; i < 15 && last !== 429; i += 1) {
      last = (await postDetails({ session: sessionId, message: `message ${i}` })).status;
    }
    expect(last).toBe(429);
  });
});

describe("GET /api/pay/status", () => {
  async function status(session: string, site?: string) {
    const suffix = site === undefined ? "" : `&site=${site}`;
    return json(await payRoutes.handle(request("GET", `/api/pay/status?session=${session}${suffix}`)));
  }

  test("reports paid from our own record without asking Stripe", async () => {
    const sessionId = await seedDonation({
      amount: 1000,
      applicationFee: 50,
      net: 900,
      email: "supporter@example.com",
      createdAt: Date.now(),
    });
    const { body } = await status(sessionId);
    expect(body.status).toBe("paid");
    expect(body.amount).toBe(1000);
    expect(calledWith("retrieveDonationSession")).toBeUndefined();
  });

  test("asks Stripe when our record has not landed and reports paid", async () => {
    stripeState.donationSession = { payment_status: "paid", amount_total: 2500, currency: "eur" };
    const { body } = await status("cs_missing", publicKey);
    expect(body.status).toBe("paid");
    expect(body.amount).toBe(2500);
    expect(calledWith("retrieveDonationSession")).toEqual({
      accountId: "acct_test",
      sessionId: "cs_missing",
    });
  });

  test("stays pending while Stripe reports the payment unresolved", async () => {
    stripeState.donationSession = { payment_status: "unpaid" };
    const { body } = await status("cs_missing", publicKey);
    expect(body.status).toBe("pending");
  });

  test("stays pending without a site key, the old contract", async () => {
    const { body } = await status("cs_missing");
    expect(body.status).toBe("pending");
    expect(calledWith("retrieveDonationSession")).toBeUndefined();
  });
});
describe("POST /api/stripe/webhook", () => {
  function donationEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      type: "checkout.session.completed",
      account: "acct_test",
      data: {
        object: {
          id: `cs_${randomUUID()}`,
          payment_status: "paid",
          amount_total: 1000,
          currency: "eur",
          payment_intent: `pi_${randomUUID()}`,
          metadata: { quietjar_site: publicKey },
          customer_details: { email: "supporter@example.com" },
          ...overrides,
        },
      },
    };
  }

  async function postWebhook(event: Record<string, unknown>) {
    stripeState.webhookEvent = event;
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

  async function listed() {
    return json(await donationRoutes.handle(request("GET", "/api/donations/recent")));
  }

  async function earnings(period: string) {
    return json(
      await donationRoutes.handle(request("GET", `/api/donations/earnings?period=${period}`)),
    );
  }

  test("records the donation with the supporter's email and the charge's net", async () => {
    stripeState.chargeAmounts = { net: 890, applicationFee: 110 };
    const { status } = await postWebhook(donationEvent());
    expect(status).toBe(200);
    expect(calledWith("chargeAmounts")).toEqual({
      accountId: "acct_test",
      paymentIntentId: expect.any(String),
    });

    const { body } = await listed();
    const donations = body.donations as Array<Record<string, unknown>>;
    expect(donations).toHaveLength(1);
    expect(donations[0].amount).toBe(1000);
    expect(donations[0].email).toBe("supporter@example.com");
    expect((await earnings("all")).body.net).toBe(890);
  });

  // The platform pricing scheme decides the fee, so the settled figure is the
  // only one we report; nothing here recomputes it.
  test("records the fee Stripe settled", async () => {
    stripeState.chargeAmounts = { net: 890, applicationFee: 110 };
    const event = donationEvent();
    await postWebhook(event);

    const sessionId = (event.data as { object: { id: string } }).object.id;
    expect((await getDonationBySessionId(sessionId))?.applicationFee).toBe(110);
  });

  test("a failed lookup records the donation with the fee left unknown", async () => {
    stripeState.chargeAmounts = null;
    const event = donationEvent();
    await postWebhook(event);

    const sessionId = (event.data as { object: { id: string } }).object.id;
    const donation = await getDonationBySessionId(sessionId);
    expect(donation?.amount).toBe(1000);
    // Guessing would put a second copy of Stripe's rule in our code. The
    // donation counts for nothing until a backfill reads the real figures.
    expect(donation?.applicationFee).toBeNull();
    expect(donation?.net).toBeNull();
    expect((await earnings("all")).body.net).toBe(0);
  });

  test("an unpaid session records nothing", async () => {
    await postWebhook(donationEvent({ payment_status: "unpaid" }));
    expect((await listed()).body.donations as unknown[]).toHaveLength(0);
  });
});
