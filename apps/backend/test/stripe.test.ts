import { beforeEach, describe, expect, test } from "bun:test";
import { calledWith, json, request, resetStripe, session, stripeCalls, stripeState } from "./harness";

const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { stripeRoutes } = await import("../src/stripe/routes");
const { siteRoutes } = await import("../src/sites/routes");
const { createConnection, getConnectionByUserId } = await import("../src/stripe/store");

await ensureSchema();

async function post(path: string, body?: Record<string, unknown>) {
  return json(await stripeRoutes.handle(request("POST", `/api/stripe${path}`, body)));
}

async function get(path: string) {
  return json(await stripeRoutes.handle(request("GET", `/api/stripe${path}`)));
}

/** Runs step one of the dashboard flow: create the site, then fill it in. */
async function completeStepOne(overrides: Record<string, unknown> = {}) {
  await siteRoutes.handle(request("GET", "/api/sites/current"));
  await siteRoutes.handle(
    request("PUT", "/api/sites/current", {
      currency: "eur",
      siteUrl: "example.com",
      country: "NL",
      entityType: "individual",
      ...overrides,
    }),
  );
}

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM sites");
  await libsqlClient.execute("DELETE FROM stripe_connections");
  session.user = { id: "user_1", email: "creator@example.com" };
  resetStripe();
});

describe("POST /api/stripe/connect", () => {
  test("refuses a signed-out caller", async () => {
    session.user = null;
    expect((await post("/connect")).status).toBe(401);
  });

  test("refuses before step one is complete", async () => {
    await siteRoutes.handle(request("GET", "/api/sites/current"));
    const { status, body } = await post("/connect");
    expect(status).toBe(400);
    expect(body.error).toBe("site_not_configured");
    expect(stripeCalls).toHaveLength(0);
  });

  test.each([
    ["site URL", { siteUrl: null }],
    ["country", { country: null }],
    ["entity type", { entityType: null }],
  ])("refuses when the %s is missing", async (_label, missing) => {
    await completeStepOne(missing);
    const { status, body } = await post("/connect");
    expect(status).toBe(400);
    expect(body.error).toBe("site_not_configured");
    expect(stripeCalls).toHaveLength(0);
  });

  test("creates the account prefilled from the site row", async () => {
    await completeStepOne({ country: "SE", currency: "sek" });
    const { status, body } = await post("/connect");
    expect(status).toBe(200);
    expect(body.url).toBe(stripeState.onboardingUrl);
    expect(calledWith("createConnectedAccount")).toEqual({
      country: "SE",
      email: "creator@example.com",
      entityType: "individual",
      currency: "sek",
      businessUrl: "https://example.com",
    });
    expect(calledWith("setManualPayouts")).toEqual({ accountId: stripeState.account.id });
  });

  test("stores the connection so a second call reuses the account", async () => {
    await completeStepOne();
    await post("/connect");
    expect(await getConnectionByUserId("user_1")).not.toBeNull();

    resetStripe();
    const { status } = await post("/connect");
    expect(status).toBe(200);
    // Only a fresh link, no second account.
    expect(stripeCalls.map((call) => call.name)).toEqual(["createOnboardingLink"]);
  });

  test("marks local methods unavailable up front for a country that cannot have any", async () => {
    await completeStepOne({ country: "BR", currency: "brl" });
    await post("/connect");
    const { body } = await get("/connection");
    const connection = body.connection as { onboarding: Record<string, string> };
    expect(connection.onboarding.localMethods).toBe("unavailable");
  });

  test("leaves local methods to Stripe for a country that can have them", async () => {
    await completeStepOne({ country: "NL" });
    await post("/connect");
    const { body } = await get("/connection");
    const connection = body.connection as { onboarding: Record<string, string> };
    expect(connection.onboarding.localMethods).toBe("todo");
  });

  test("reports a Stripe failure without leaving a connection behind", async () => {
    await completeStepOne();
    stripeState.throwOnCreate = new Error("stripe is down");
    const { status, body } = await post("/connect");
    expect(status).toBe(502);
    expect(body.error).toBe("stripe_request_failed");
    expect(await getConnectionByUserId("user_1")).toBeNull();
  });

  test("clears a connection whose account Stripe no longer has", async () => {
    await completeStepOne();
    await createConnection({ userId: "user_1", accountId: "acct_gone" });
    stripeState.throwOnLink = new Error("no such account");
    stripeState.missingAccount = true;

    const { status, body } = await post("/connect");
    expect(status).toBe(409);
    expect(body.error).toBe("connection_reset");
    expect(await getConnectionByUserId("user_1")).toBeNull();
  });
});

describe("POST /api/stripe/onboarding-link", () => {
  test("refuses before an account exists", async () => {
    await completeStepOne();
    const { status, body } = await post("/onboarding-link", { step: "identity" });
    expect(status).toBe(400);
    expect(body.error).toBe("not_connected");
  });

  test("mints a link for a step", async () => {
    await completeStepOne();
    await post("/connect");
    resetStripe();

    const { status, body } = await post("/onboarding-link", { step: "identity" });
    expect(status).toBe(200);
    expect(body.url).toBe(stripeState.onboardingUrl);
  });

  test("asks for everything eventually due on the payouts step", async () => {
    await completeStepOne();
    await post("/connect");
    resetStripe();

    await post("/onboarding-link", { step: "payouts" });
    const link = calledWith("createOnboardingLink") as { fields: string };
    expect(link.fields).toBe("eventually_due");
  });

  test("refuses local methods for an ineligible country without calling Stripe", async () => {
    await completeStepOne({ country: "BR", currency: "brl" });
    await post("/connect");
    resetStripe();

    const { status, body } = await post("/onboarding-link", { step: "localMethods" });
    expect(status).toBe(409);
    expect(body.error).toBe("local_methods_unavailable");
    // Requesting iDEAL would add verification requirements to the account, so
    // an ineligible country must not reach Stripe at all.
    expect(stripeCalls).toHaveLength(0);
  });

  test("requests only the capabilities the country can have", async () => {
    await completeStepOne({ country: "NL" });
    await post("/connect");
    resetStripe();

    const { status } = await post("/onboarding-link", { step: "localMethods" });
    expect(status).toBe(200);
    const call = calledWith("requestLocalPaymentCapabilities") as {
      accountId: string;
      capabilities: string[];
    };
    expect(call.accountId).toBe("acct_test");
    expect(call.capabilities).toContain("ideal_payments");
    expect(call.capabilities).toContain("bancontact_payments");
  });

  test("one method Stripe refuses does not fail the whole group", async () => {
    await completeStepOne({ country: "NL" });
    await post("/connect");
    resetStripe();
    stripeState.account.capabilities = { ideal_payments: "unsupported" };

    const { status } = await post("/onboarding-link", { step: "localMethods" });
    expect(status).toBe(200);
  });

  test("rejects a step that is not one of the three", async () => {
    await completeStepOne();
    await post("/connect");
    expect((await post("/onboarding-link", { step: "banking" })).status).toBe(422);
  });
});

describe("POST /api/stripe/refresh-status", () => {
  test("refuses before an account exists", async () => {
    const { status, body } = await post("/refresh-status");
    expect(status).toBe(400);
    expect(body.error).toBe("not_connected");
  });

  test("re-reads the account and keeps the country's local method verdict", async () => {
    await completeStepOne({ country: "BR", currency: "brl" });
    await post("/connect");
    resetStripe();
    stripeState.account.capabilities = { card_payments: "active", ideal_payments: "active" };

    const { status, body } = await post("/refresh-status");
    expect(status).toBe(200);
    const connection = body.connection as { onboarding: Record<string, string> };
    expect(connection.onboarding.identity).toBe("done");
    // Stripe says active, but the account's country cannot offer it.
    expect(connection.onboarding.localMethods).toBe("unavailable");
  });
});

describe("wallet domain registration", () => {
  test("registers the site's domain when the account is connected", async () => {
    await completeStepOne();
    await post("/connect");

    expect(calledWith("registerWalletDomains")).toEqual({
      accountId: "acct_test",
      siteUrl: expect.any(String),
    });
  });
});

describe("GET /api/stripe/connection", () => {
  test("refuses a signed-out caller", async () => {
    session.user = null;
    expect((await get("/connection")).status).toBe(401);
  });

  test("reports no connection before onboarding starts", async () => {
    expect((await get("/connection")).body.connection).toBeNull();
  });
});

describe("POST /api/stripe/login-link", () => {
  test("refuses before an account exists", async () => {
    const { status, body } = await post("/login-link");
    expect(status).toBe(400);
    expect(body.error).toBe("not_connected");
  });

  test("returns the dashboard link", async () => {
    await completeStepOne();
    await post("/connect");
    const { status, body } = await post("/login-link");
    expect(status).toBe(200);
    expect(body.url).toBe(stripeState.loginUrl);
  });
});

describe("GET /api/stripe/balance", () => {
  test("refuses a signed-out caller", async () => {
    session.user = null;
    expect((await get("/balance")).status).toBe(401);
  });

  test("refuses before an account exists", async () => {
    const { status, body } = await get("/balance");
    expect(status).toBe(400);
    expect(body.error).toBe("not_connected");
  });

  test("returns the balance with the minimum for its currency", async () => {
    await completeStepOne({ country: "SE", currency: "sek" });
    await post("/connect");
    stripeState.balance = { available: 12_000, pending: 3_000, currency: "sek" };
    const { status, body } = await get("/balance");
    expect(status).toBe(200);
    expect(body).toEqual({ available: 12_000, pending: 3_000, currency: "sek", minimum: 60_000 });
    expect(calledWith("retrieveBalance")).toEqual({
      accountId: stripeState.account.id,
      currency: "sek",
    });
  });

  test("resets a connection whose account is gone", async () => {
    await completeStepOne();
    await post("/connect");
    stripeState.missingAccount = true;
    const { status, body } = await get("/balance");
    expect(status).toBe(409);
    expect(body.error).toBe("connection_reset");
    expect(await getConnectionByUserId("user_1")).toBeNull();
  });
});

describe("POST /api/stripe/payout", () => {
  beforeEach(async () => {
    await completeStepOne();
    await post("/connect");
  });

  test("refuses a signed-out caller", async () => {
    session.user = null;
    expect((await post("/payout")).status).toBe(401);
    expect(calledWith("createPayout")).toBeUndefined();
  });

  test("refuses a balance below the minimum", async () => {
    stripeState.balance = { available: 4_999, pending: 10_000, currency: "eur" };
    const { status, body } = await post("/payout");
    expect(status).toBe(400);
    expect(body.error).toBe("below_minimum");
    expect(calledWith("createPayout")).toBeUndefined();
  });

  test("pays out the whole available balance once it reaches the minimum", async () => {
    stripeState.balance = { available: 5_000, pending: 2_500, currency: "eur" };
    const { status, body } = await post("/payout");
    expect(status).toBe(200);
    expect(body).toEqual({ amount: 5_000, currency: "eur" });
    expect(calledWith("createPayout")).toEqual({
      accountId: stripeState.account.id,
      amount: 5_000,
      currency: "eur",
    });
  });

  test("keeps the connection when Stripe refuses the payout", async () => {
    stripeState.balance = { available: 8_000, pending: 0, currency: "eur" };
    stripeState.throwOnPayout = new Error("payouts not allowed");
    const { status, body } = await post("/payout");
    expect(status).toBe(502);
    expect(body.error).toBe("stripe_request_failed");
    expect(await getConnectionByUserId("user_1")).not.toBeNull();
  });
});
