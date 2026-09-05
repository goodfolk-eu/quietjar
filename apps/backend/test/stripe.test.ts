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

  test("marks iDEAL unavailable up front for a country that cannot have it", async () => {
    await completeStepOne({ country: "BR", currency: "brl" });
    await post("/connect");
    const { body } = await get("/connection");
    const connection = body.connection as { onboarding: Record<string, string> };
    expect(connection.onboarding.ideal).toBe("unavailable");
  });

  test("leaves iDEAL to Stripe for a country that can have it", async () => {
    await completeStepOne({ country: "NL" });
    await post("/connect");
    const { body } = await get("/connection");
    const connection = body.connection as { onboarding: Record<string, string> };
    expect(connection.onboarding.ideal).toBe("todo");
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

  test("refuses iDEAL for an ineligible country without calling Stripe", async () => {
    await completeStepOne({ country: "BR", currency: "brl" });
    await post("/connect");
    resetStripe();

    const { status, body } = await post("/onboarding-link", { step: "ideal" });
    expect(status).toBe(409);
    expect(body.error).toBe("ideal_unavailable");
    // Requesting the capability would add identity and liveness requirements
    // to the account, so an ineligible country must not reach Stripe at all.
    expect(stripeCalls).toHaveLength(0);
  });

  test("requests the capability for an eligible country", async () => {
    await completeStepOne({ country: "NL" });
    await post("/connect");
    resetStripe();

    const { status } = await post("/onboarding-link", { step: "ideal" });
    expect(status).toBe(200);
    expect(calledWith("requestIdealCapability")).toEqual({ accountId: "acct_test" });
  });

  test("passes on Stripe's own refusal of iDEAL", async () => {
    await completeStepOne({ country: "NL" });
    await post("/connect");
    resetStripe();
    stripeState.account.capabilities = { ideal_payments: "unsupported" };

    const { status, body } = await post("/onboarding-link", { step: "ideal" });
    expect(status).toBe(409);
    expect(body.error).toBe("ideal_unavailable");
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

  test("re-reads the account and keeps the country's iDEAL verdict", async () => {
    await completeStepOne({ country: "BR", currency: "brl" });
    await post("/connect");
    resetStripe();
    stripeState.account.capabilities = { card_payments: "active", ideal_payments: "active" };

    const { status, body } = await post("/refresh-status");
    expect(status).toBe(200);
    const connection = body.connection as { onboarding: Record<string, string> };
    expect(connection.onboarding.identity).toBe("done");
    // Stripe says active, but the account's country cannot offer it.
    expect(connection.onboarding.ideal).toBe("unavailable");
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
