import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "bun:test";
import { calledWith, json, resetStripe } from "./harness";

// The harness sets the database URL and registers mock.module replacements
// before any src module loads; static imports would hoist past that setup.
const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { createSite, updateSite } = await import("../src/sites/store");
const { payRoutes } = await import("../src/pay/routes");
const { createConnection, saveOnboarding } = await import("../src/stripe/store");

await ensureSchema();

let publicKey = "";

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM sites");
  await libsqlClient.execute("DELETE FROM stripe_connections");
  resetStripe();
  publicKey = (await createSite({ userId: "user_1", currency: "eur" })).publicKey;
  await updateSite("user_1", {
    currency: "eur",
    siteUrls: ["https://example.com", "https://project-b.dev"],
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
});

async function createSession(origin: string) {
  return json(
    await payRoutes.handle(
      new Request("http://localhost/api/pay/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          // A fresh caller per request, so the per-IP limit never trips across tests.
          "x-forwarded-for": randomUUID(),
        },
        body: JSON.stringify({ site: publicKey, amount: 10, returnUrl: `${origin}/thanks` }),
      }),
    ),
  );
}

function productName(): unknown {
  return (calledWith("createDonationSession") as { productName?: string } | undefined)
    ?.productName;
}

describe("POST /api/pay/session with several sites", () => {
  test("takes a payment from any listed site and names that site", async () => {
    const { status } = await createSession("https://www.project-b.dev");
    expect(status).toBe(200);
    expect(productName()).toBe("Support for project-b.dev");
  });

  test("refuses a site that is not listed", async () => {
    const { status, body } = await createSession("https://project-c.dev");
    expect(status).toBe(403);
    expect(body.error).toBe("origin_not_allowed");
    expect(calledWith("createDonationSession")).toBeUndefined();
  });

  test("names the main site when the payment comes from the dashboard preview", async () => {
    const { status } = await createSession(process.env.PUBLIC_FRONTEND_URL ?? "");
    expect(status).toBe(200);
    expect(productName()).toBe("Support for example.com");
  });
});
