import { beforeEach, describe, expect, test } from "bun:test";
import { calledWith, json, request, resetStripe, session } from "./harness";

const { ensureSchema } = await import("../src/schema");
const { libsqlClient } = await import("../src/db");
const { hostedRoutes, publicHostedRoutes } = await import("../src/hosted/routes");
const { handleProblem, handleVariant, suggestHandle } = await import("../src/hosted/handle");
const { sniffImageType } = await import("../src/hosted/images");
const { siteRoutes } = await import("../src/sites/routes");
const { createGoal, archiveGoal } = await import("../src/goals/store");
const { createConnection, saveOnboarding } = await import("../src/stripe/store");

await ensureSchema();

async function current() {
  return json(await hostedRoutes.handle(request("GET", "/api/hosted/current")));
}

async function put(body: Record<string, unknown>) {
  return json(await hostedRoutes.handle(request("PUT", "/api/hosted/current", body)));
}

async function availability(value: string) {
  const path = `/api/hosted/handle?value=${encodeURIComponent(value)}`;
  return json(await hostedRoutes.handle(request("GET", path)));
}

async function publicPage(handle: string) {
  const response = await publicHostedRoutes.handle(request("GET", `/api/hosted/page/${handle}`));
  return { ...(await json(response)), cacheControl: response.headers.get("cache-control") };
}

async function upload(kind: string, bytes: Uint8Array, type = "image/png") {
  const form = new FormData();
  form.append("file", new File([bytes], "upload", { type }));
  const req = new Request(`http://localhost/api/hosted/current/image/${kind}`, {
    method: "POST",
    body: form,
  });
  return json(await hostedRoutes.handle(req));
}

/** A signed-in creator with a site, as the dashboard leaves them on first load. */
async function signIn(id: string, email: string): Promise<string> {
  session.user = { id, email };
  const { body } = await json(await siteRoutes.handle(request("GET", "/api/sites/current")));
  const result = await libsqlClient.execute({
    sql: "SELECT id FROM sites WHERE user_id = ?",
    args: [id],
  });
  expect(body.site).toBeDefined();
  return result.rows[0]?.id as string;
}

/** A full valid payload, so each test only states the field it is about. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    handle: "creator",
    displayName: "Ada Lovelace",
    title: "Help keep the engine running",
    description: "Every tip goes to spare parts.",
    color: "#047857",
    goalId: null,
    ...overrides,
  };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

beforeEach(async () => {
  await libsqlClient.execute("DELETE FROM sites");
  await libsqlClient.execute("DELETE FROM hosted_pages");
  await libsqlClient.execute("DELETE FROM goals");
  await libsqlClient.execute("DELETE FROM stripe_connections");
  session.user = { id: "user_1", email: "creator@example.com" };
  resetStripe();
});

describe("handle rules", () => {
  test("suggests a slug from a name, dropping accents and punctuation", () => {
    expect(suggestHandle("Zoë O'Brien")).toBe("zoe-o-brien");
    expect(suggestHandle("  --Open Source!!  ")).toBe("open-source");
  });

  test("falls back when the name gives nothing usable", () => {
    expect(suggestHandle("")).toBe("creator");
    expect(suggestHandle("李")).toBe("creator");
    expect(suggestHandle("ab")).toBe("creator");
    expect(suggestHandle("admin")).toBe("creator");
  });

  test("keeps a suggestion inside the length limit without a trailing hyphen", () => {
    const handle = suggestHandle("a very long project name that keeps going on");
    expect(handle.length).toBeLessThanOrEqual(30);
    expect(handle.endsWith("-")).toBe(false);
    expect(handleProblem(handle)).toBeNull();
  });

  test("numbers variants and keeps them inside the limit", () => {
    expect(handleVariant("creator", 1)).toBe("creator-2");
    const long = "a".repeat(30);
    expect(handleVariant(long, 1)).toBe(`${"a".repeat(28)}-2`);
  });

  test("rejects bad spellings and reserved words", () => {
    expect(handleProblem("ok-handle")).toBeNull();
    expect(handleProblem("ab")).toBe("invalid");
    expect(handleProblem("Upper")).toBe("invalid");
    expect(handleProblem("double--hyphen")).toBe("invalid");
    expect(handleProblem("-leading")).toBe("invalid");
    expect(handleProblem("under_score")).toBe("invalid");
    expect(handleProblem("dashboard")).toBe("reserved");
    expect(handleProblem("quietjar")).toBe("reserved");
  });
});

describe("GET /api/hosted/current", () => {
  test("refuses a signed-out caller", async () => {
    session.user = null;
    expect((await current()).status).toBe(401);
  });

  test("gives a new account a working page without any setup", async () => {
    await signIn("user_1", "ada@example.com");
    const { status, body } = await current();
    expect(status).toBe(200);
    const page = body.page as Record<string, unknown>;
    expect(page.handle).toBe("ada");
    expect(page.displayName).toBe("ada");
    expect(page.url).toBe(`${process.env.PUBLIC_FRONTEND_URL}/@ada`);
    expect((await publicPage("ada")).status).toBe(200);
  });

  test("bumps the suggestion when another creator already has it", async () => {
    await signIn("user_1", "ada@example.com");
    await signIn("user_2", "ada@other.example");
    const page = (await current()).body.page as Record<string, unknown>;
    expect(page.handle).toBe("ada-2");
  });
});

describe("GET /api/hosted/handle", () => {
  test("reports each state a typed handle can be in", async () => {
    await signIn("user_1", "ada@example.com");
    await signIn("user_2", "grace@example.com");

    expect((await availability("grace")).body.status).toBe("current");
    expect((await availability("ada")).body.status).toBe("taken");
    expect((await availability("fresh-name")).body.status).toBe("available");
    expect((await availability("pricing")).body.status).toBe("reserved");
    expect((await availability("no spaces")).body.status).toBe("invalid");
  });

  test("compares case-insensitively", async () => {
    await signIn("user_1", "ada@example.com");
    await signIn("user_2", "grace@example.com");
    expect((await availability("ADA")).body.status).toBe("taken");
  });
});

describe("PUT /api/hosted/current", () => {
  test("saves the page and serves it publicly", async () => {
    await signIn("user_1", "creator@example.com");
    const { status } = await put(payload({ handle: "ada-engine" }));
    expect(status).toBe(200);

    const { body } = await publicPage("ada-engine");
    const page = body.page as Record<string, unknown>;
    expect(page.displayName).toBe("Ada Lovelace");
    expect(page.title).toBe("Help keep the engine running");
    expect(page.description).toBe("Every tip goes to spare parts.");
    expect(page.color).toBe("#047857");
    expect(page.currency).toBe("eur");
    expect(page.site).toMatch(/^qj_/);
  });

  test("stores blank optional text as nothing", async () => {
    await signIn("user_1", "creator@example.com");
    const { body } = await put(payload({ title: "  ", description: "", color: null }));
    const page = body.page as Record<string, unknown>;
    expect(page.title).toBeNull();
    expect(page.description).toBeNull();
    expect(page.color).toBeNull();
  });

  test("refuses a handle another creator holds", async () => {
    await signIn("user_1", "ada@example.com");
    await signIn("user_2", "grace@example.com");
    const { status, body } = await put(payload({ handle: "ada" }));
    expect(status).toBe(409);
    expect(body.error).toBe("handle_taken");
    expect((await current()).body.page).toMatchObject({ handle: "grace" });
  });

  test("refuses reserved and malformed handles", async () => {
    await signIn("user_1", "creator@example.com");
    expect((await put(payload({ handle: "support" }))).body.error).toBe("reserved_handle");
    expect((await put(payload({ handle: "a" }))).body.error).toBe("invalid_handle");
  });

  test("refuses an empty display name and a malformed colour", async () => {
    await signIn("user_1", "creator@example.com");
    expect((await put(payload({ displayName: " " }))).body.error).toBe("invalid_display_name");
    expect((await put(payload({ color: "red" }))).body.error).toBe("invalid_color");
  });

  test("only accepts the site's own live goals", async () => {
    const siteId = await signIn("user_1", "creator@example.com");
    const otherSiteId = await signIn("user_2", "other@example.com");
    session.user = { id: "user_1", email: "creator@example.com" };
    const own = await createGoal({ siteId, name: "Server", target: 5000, window: "monthly" });
    const foreign = await createGoal({
      siteId: otherSiteId,
      name: "Theirs",
      target: 5000,
      window: "monthly",
    });

    expect((await put(payload({ goalId: foreign.id }))).body.error).toBe("unknown_goal");
    expect((await put(payload({ goalId: own.id }))).status).toBe(200);
    expect(((await publicPage("creator")).body.page as Record<string, unknown>).goalId).toBe(
      own.id,
    );

    // Archiving a goal takes it off the page without the creator editing it.
    await archiveGoal(own.id);
    expect(((await publicPage("creator")).body.page as Record<string, unknown>).goalId).toBeNull();
  });

  test("the old handle stops resolving after a change", async () => {
    await signIn("user_1", "creator@example.com");
    await put(payload({ handle: "new-name" }));
    const old = await publicPage("creator");
    expect(old.status).toBe(404);
    expect(old.body.error).toBe("unknown_page");
    expect((await publicPage("new-name")).status).toBe(200);
  });

  test("moves the Stripe business URL with the handle when there is no site", async () => {
    const frontend = process.env.PUBLIC_FRONTEND_URL;
    process.env.PUBLIC_FRONTEND_URL = "https://quietjar.test";
    try {
      await signIn("user_1", "creator@example.com");
      await createConnection({ userId: "user_1", accountId: "acct_test" });
      await put(payload({ handle: "renamed" }));
      expect(calledWith("updateBusinessUrl")).toEqual({
        accountId: "acct_test",
        businessUrl: "https://quietjar.test/@renamed",
      });
    } finally {
      process.env.PUBLIC_FRONTEND_URL = frontend;
    }
  });

  test("leaves the Stripe business URL on the creator's own site", async () => {
    await signIn("user_1", "creator@example.com");
    await siteRoutes.handle(
      request("PUT", "/api/sites/current", {
        currency: "eur",
        siteUrls: ["example.com"],
        country: "NL",
        entityType: "individual",
      }),
    );
    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await put(payload({ handle: "renamed" }));
    expect(calledWith("updateBusinessUrl")).toBeUndefined();
  });
});

describe("GET /api/hosted/page/:handle", () => {
  test("answers an unknown handle with a short-lived 404", async () => {
    const { status, body, cacheControl } = await publicPage("nobody-here");
    expect(status).toBe(404);
    expect(body.error).toBe("unknown_page");
    // Without its own header the CDN would hold the miss for a month.
    expect(cacheControl).toBe("public, max-age=60");
  });

  test("reports whether the creator can take payments yet", async () => {
    await signIn("user_1", "creator@example.com");
    const before = (await publicPage("creator")).body.page as Record<string, unknown>;
    expect(before.acceptingPayments).toBe(false);

    await createConnection({ userId: "user_1", accountId: "acct_test" });
    await saveOnboarding("acct_test", {
      identity: "done",
      localMethods: "done",
      payouts: "done",
      issues: {},
    });
    const after = (await publicPage("creator")).body.page as Record<string, unknown>;
    expect(after.acceptingPayments).toBe(true);
  });
});

describe("POST /api/hosted/current/image/:kind", () => {
  test("recognises images by their bytes", () => {
    expect(sniffImageType(PNG)).toBe("png");
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("webp");
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
  });

  test("refuses an SVG even when it claims to be a PNG", async () => {
    await signIn("user_1", "creator@example.com");
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const { status, body } = await upload("avatar", svg, "image/png");
    expect(status).toBe(400);
    expect(body.error).toBe("unsupported_image");
  });

  test("refuses an avatar over its size limit", async () => {
    await signIn("user_1", "creator@example.com");
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    big.set(PNG);
    const { status, body } = await upload("avatar", big);
    expect(status).toBe(413);
    expect(body.error).toBe("image_too_large");
  });
});
