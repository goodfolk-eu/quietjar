import { beforeEach, describe, expect, test } from "bun:test";
import { calledWith, json, request, resetStripe, session } from "./harness";

const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { siteRoutes } = await import("../src/sites/routes");
const { createConnection } = await import("../src/stripe/store");

await ensureSchema();

async function get() {
  return json(await siteRoutes.handle(request("GET", "/api/sites/current")));
}

async function put(body: Record<string, unknown>) {
  return json(await siteRoutes.handle(request("PUT", "/api/sites/current", body)));
}

/** A full valid payload, so each test only states the field it is about. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    currency: "eur",
    siteUrls: ["example.com"],
    country: "NL",
    entityType: "individual",
    ...overrides,
  };
}

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM sites");
  await libsqlClient.execute("DELETE FROM stripe_connections");
  await libsqlClient.execute("DELETE FROM hosted_pages");
  session.user = { id: "user_1", email: "creator@example.com" };
  resetStripe();
});

describe("GET /api/sites/current", () => {
  test("refuses a signed-out caller", async () => {
    session.user = null;
    const { status, body } = await get();
    expect(status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  test("creates the site on first read, with nothing chosen yet", async () => {
    const { status, body } = await get();
    expect(status).toBe(200);
    const site = body.site as Record<string, unknown>;
    expect(site.publicKey).toMatch(/^qj_[0-9a-f]{24}$/);
    expect(site.currency).toBe("eur");
    expect(site.siteUrls).toEqual([]);
    expect(site.country).toBeNull();
    expect(site.entityType).toBeNull();
    expect(site.connected).toBe(false);
    expect(site.hostedUrl).toBe(`${process.env.PUBLIC_FRONTEND_URL}/@creator`);
  });

  test("returns the same site on a second read", async () => {
    const first = await get();
    const second = await get();
    expect((second.body.site as Record<string, unknown>).publicKey).toBe(
      (first.body.site as Record<string, unknown>).publicKey,
    );
  });

  test("offers the supported countries and currencies", async () => {
    const site = (await get()).body.site as Record<string, unknown>;
    const countries = site.countries as string[];
    const currencies = site.currencies as string[];
    expect(countries).toContain("NL");
    expect(countries).toContain("US");
    expect(countries).toContain("IN");
    // Zero-decimal currencies would break toMinorUnits, so their countries stay out.
    expect(countries).not.toContain("JP");
    expect(countries).not.toContain("KR");
    expect(currencies).toContain("eur");
    expect(currencies).toContain("usd");
    expect(currencies).not.toContain("jpy");
  });

  test("reports a connection once one exists", async () => {
    await get();
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    expect(((await get()).body.site as Record<string, unknown>).connected).toBe(true);
  });
});

describe("PUT /api/sites/current", () => {
  test("refuses a signed-out caller", async () => {
    session.user = null;
    const { status } = await put(payload());
    expect(status).toBe(401);
  });

  test("saves every field and normalises the site URLs to origins", async () => {
    await get();
    const { status, body } = await put(
      payload({ siteUrls: ["https://example.com/tips?a=1", "project-b.dev", "www.example.com"] }),
    );
    expect(status).toBe(200);
    const site = body.site as Record<string, unknown>;
    expect(site.siteUrls).toEqual(["https://example.com", "https://project-b.dev"]);
    expect(((await get()).body.site as Record<string, unknown>).siteUrls).toEqual([
      "https://example.com",
      "https://project-b.dev",
    ]);
    expect(site.country).toBe("NL");
    expect(site.entityType).toBe("individual");
    expect(((await get()).body.site as Record<string, unknown>).country).toBe("NL");
  });

  test("uppercases the country", async () => {
    await get();
    const { body } = await put(payload({ country: "nl" }));
    expect((body.site as Record<string, unknown>).country).toBe("NL");
  });

  test("refuses a currency outside the supported set", async () => {
    await get();
    const { status, body } = await put(payload({ currency: "jpy" }));
    expect(status).toBe(400);
    expect(body.error).toBe("unsupported_currency");
  });

  test("refuses a country outside the supported set", async () => {
    await get();
    // Japan is a Stripe Connect country but not one of ours.
    const { status, body } = await put(payload({ country: "JP" }));
    expect(status).toBe(400);
    expect(body.error).toBe("unsupported_country");
  });

  test("refuses an entity type that is not individual or company", async () => {
    await get();
    const { status, body } = await put(payload({ entityType: "charity" }));
    expect(status).toBe(400);
    expect(body.error).toBe("invalid_entity_type");
  });

  test("refuses a site URL that is not a host, pointing at the entry", async () => {
    await get();
    const { status, body } = await put(payload({ siteUrls: ["example.com", "not a url"] }));
    expect(status).toBe(400);
    expect(body.error).toBe("invalid_site_url");
    expect(body.index).toBe(1);
  });

  test("refuses more than ten site URLs", async () => {
    await get();
    const siteUrls = Array.from({ length: 11 }, (_, i) => `site${i}.example`);
    const { status, body } = await put(payload({ siteUrls }));
    expect(status).toBe(400);
    expect(body.error).toBe("too_many_site_urls");
  });

  test("accepts an empty list as clearing the sites", async () => {
    await get();
    await put(payload());
    const { status, body } = await put(payload({ siteUrls: [] }));
    expect(status).toBe(200);
    expect((body.site as Record<string, unknown>).siteUrls).toEqual([]);
  });

  test("carries a site saved before the list existed over as the only entry", async () => {
    await get();
    await libsqlClient.execute(
      "UPDATE sites SET site_url = 'https://legacy.example', site_urls = NULL",
    );
    await ensureSchema();
    expect(((await get()).body.site as Record<string, unknown>).siteUrls).toEqual([
      "https://legacy.example",
    ]);
  });

  test("refuses to write before the site exists", async () => {
    const { status, body } = await put(payload());
    expect(status).toBe(400);
    expect(body.error).toBe("no_site");
  });

  test("freezes country and entity type once a Stripe account exists", async () => {
    await get();
    await put(payload({ country: "NL", entityType: "individual" }));
    await createConnection({ userId: "user_1", accountId: "acct_test" });

    // Stripe cannot change either value on a live account, so neither can we.
    const { body } = await put(payload({ country: "US", entityType: "company" }));
    const site = body.site as Record<string, unknown>;
    expect(site.country).toBe("NL");
    expect(site.entityType).toBe("individual");
  });

  // Stripe hides wallets until the domain showing the Payment Element is
  // registered on the connected account.
  test("registers only the newly added domains for wallets", async () => {
    await get();
    await put(payload());
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await put(payload({ siteUrls: ["example.com", "other.example"] }));

    expect(calledWith("registerWalletDomains")).toEqual({
      accountId: "acct_test",
      siteUrls: ["https://other.example"],
    });
  });

  test("skips wallet registration when no site was added", async () => {
    await get();
    await put(payload({ siteUrls: ["example.com", "other.example"] }));
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await put(payload({ siteUrls: ["example.com"] }));

    expect(calledWith("registerWalletDomains")).toBeUndefined();
  });

  test("moves the Stripe business URL to a newly added site", async () => {
    await get();
    await put(payload({ siteUrls: [] }));
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await put(payload({ siteUrls: ["example.com"] }));

    expect(calledWith("updateBusinessUrl")).toEqual({
      accountId: "acct_test",
      businessUrl: "https://example.com",
    });
  });

  test("leaves the Stripe business URL alone when the main site is unchanged", async () => {
    await get();
    await put(payload());
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await put(payload({ currency: "usd", siteUrls: ["example.com", "other.example"] }));

    expect(calledWith("updateBusinessUrl")).toBeUndefined();
  });

  test("moves the Stripe business URL when another site becomes the main one", async () => {
    await get();
    await put(payload({ siteUrls: ["example.com", "other.example"] }));
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await put(payload({ siteUrls: ["other.example"] }));

    expect(calledWith("updateBusinessUrl")).toEqual({
      accountId: "acct_test",
      businessUrl: "https://other.example",
    });
  });

  test("does not reach for Stripe before an account exists", async () => {
    await get();
    await put(payload());
    expect(calledWith("registerWalletDomains")).toBeUndefined();
  });

  test("still allows currency and site URL to change after connecting", async () => {
    await get();
    await put(payload());
    await createConnection({ userId: "user_1", accountId: "acct_test" });

    const { body } = await put(payload({ currency: "usd", siteUrls: ["other.example"] }));
    const site = body.site as Record<string, unknown>;
    expect(site.currency).toBe("usd");
    expect(site.siteUrls).toEqual(["https://other.example"]);
  });
});
