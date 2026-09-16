import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import "./harness";
import * as storage from "../src/widget/storage";

// bun's mock.module rebinds already-imported namespaces, so the real store
// builder is captured before the mock registers for the routes to pick up.
const realImageStoreFromEnv = storage.imageStoreFromEnv;

// The image route must never need a real browser or network in tests, so both
// the render step and the store are replaced. The storage mock spreads the
// real module so the blob codec stays the production code.
delete process.env.BUNNY_S3_ENDPOINT;
delete process.env.BUNNY_S3_BUCKET;
delete process.env.BUNNY_S3_SECRET;
delete process.env.BUNNY_S3_ACCESS_KEY;
delete process.env.WIDGET_BUNDLE_PATH;

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);
const renders: unknown[] = [];
let renderError: Error | null = null;
/** Set to hold renders open, so a concurrency test is not decided by timing. */
let renderGate: Promise<void> | null = null;
mock.module("../src/widget/render", () => ({
  renderWidgetImage: async (config: unknown) => {
    renders.push(config);
    if (renderGate) await renderGate;
    if (renderError) throw renderError;
    return new Uint8Array(PNG);
  },
}));

const stored = new Map<string, { data: Uint8Array<ArrayBuffer>; storedAt: number | null }>();
let storeEnabled = false;
/** Whether the last read asked for the extra HEAD that carries the write time. */
let askedWriteTime: boolean | null = null;
mock.module("../src/widget/storage", () => ({
  ...storage,
  imageStoreFromEnv: () => {
    if (!storeEnabled) return null;
    return {
      get: async (key: string, withWriteTime: boolean) => {
        askedWriteTime = withWriteTime;
        return stored.get(key) ?? null;
      },
      put: async (key: string, data: Uint8Array<ArrayBuffer>) => {
        stored.set(key, { data, storedAt: Date.now() });
      },
    };
  },
}));

/** Puts a copy in the store as though it had been written `ageMs` ago. */
function seedStored(blob: string, data: number[], ageMs = 0): void {
  stored.set(storage.imageKeyFor(blob), {
    data: new Uint8Array(data),
    storedAt: Date.now() - ageMs,
  });
}

/** The background refresh is fire-and-forget, so tests wait for it to land. */
async function settled(done: () => boolean): Promise<void> {
  for (let i = 0; i < 50 && !done(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const GOAL_CONFIG = { color: "#0284c7", goal: "qg_abc" };

const { widgetRoutes } = await import("../src/widget/routes");

const IMAGE = "/api/widget/image";

function blobOf(config: object): string {
  return storage.encodeImageConfig(config);
}

function encodeRaw(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

async function call(path: string): Promise<Response> {
  return widgetRoutes.handle(new Request(`http://localhost${path}`));
}

beforeEach(() => {
  renders.length = 0;
  renderError = null;
  renderGate = null;
  askedWriteTime = null;
  stored.clear();
  storeEnabled = false;
});

describe("GET /api/widget/image", () => {
  test("renders and serves a cacheable png for a valid config blob", async () => {
    const response = await call(`${IMAGE}/${blobOf({ color: "#0284c7" })}.png`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG);
    expect(renders).toEqual([{ color: "#0284c7" }]);
  });

  test("rejects an undecodable blob without rendering", async () => {
    const response = await call(`${IMAGE}/!!!not-json!!!.png`);
    expect(response.status).toBe(400);
    expect(renders).toHaveLength(0);
  });

  test("rejects a blob that is not an object", async () => {
    const response = await call(`${IMAGE}/${encodeRaw([1, 2])}.png`);
    expect(response.status).toBe(400);
    expect(renders).toHaveLength(0);
  });

  test("an oversized blob fails validation", async () => {
    const response = await call(`${IMAGE}/${"a".repeat(storage.MAX_BLOB_LENGTH + 1)}.png`);
    expect(response.status).toBe(422);
    expect(renders).toHaveLength(0);
  });

  test("serves the stored copy without rendering", async () => {
    const blob = blobOf({ color: "#ff0000" });
    seedStored(blob, [9, 9, 9]);
    storeEnabled = true;

    const response = await call(`${IMAGE}/${blob}.png`);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([9, 9, 9]));
    expect(renders).toHaveLength(0);
  });

  test("stores the rendered image on a cache miss", async () => {
    const blob = blobOf({ color: "#00ff00" });
    storeEnabled = true;

    const response = await call(`${IMAGE}/${blob}.png`);
    expect(response.status).toBe(200);
    expect(stored.get(storage.imageKeyFor(blob))?.data).toEqual(PNG);
    expect(renders).toHaveLength(1);
  });

  test("a failed render surfaces as an error response", async () => {
    renderError = new Error("no browser available");
    const response = await call(`${IMAGE}/${blobOf({})}.png`);
    expect(response.status).toBe(500);
  });
});

describe("GET /api/widget/image with a goal", () => {
  test("expires on the same window as the progress endpoint", async () => {
    const response = await call(`${IMAGE}/${blobOf(GOAL_CONFIG)}.png`);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });

  test("an empty goal is still an immutable image", async () => {
    const response = await call(`${IMAGE}/${blobOf({ color: "#0284c7", goal: "  " })}.png`);
    expect(response.headers.get("cache-control")).toContain("immutable");
  });

  test("a stored copy inside the window serves without rendering", async () => {
    const blob = blobOf(GOAL_CONFIG);
    seedStored(blob, [1, 1, 1], 60_000);
    storeEnabled = true;

    const response = await call(`${IMAGE}/${blob}.png`);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 1, 1]));
    expect(renders).toHaveLength(0);
  });

  test("a stale copy is served immediately and refreshed behind it", async () => {
    const blob = blobOf(GOAL_CONFIG);
    const key = storage.imageKeyFor(blob);
    seedStored(blob, [1, 1, 1], 6 * 60 * 1000);
    storeEnabled = true;

    // The supporter gets the old bar rather than waiting on a browser.
    const response = await call(`${IMAGE}/${blob}.png`);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 1, 1]));

    await settled(() => renders.length > 0);
    expect(renders).toEqual([GOAL_CONFIG]);
    // Overwritten in place, so the bucket never grows a copy per window.
    expect(stored.size).toBe(1);
    expect(stored.get(key)?.data).toEqual(PNG);
  });

  test("a copy of unknown age counts as stale", async () => {
    const blob = blobOf(GOAL_CONFIG);
    stored.set(storage.imageKeyFor(blob), { data: new Uint8Array([1]), storedAt: null });
    storeEnabled = true;

    await call(`${IMAGE}/${blob}.png`);
    await settled(() => renders.length > 0);
    expect(renders).toHaveLength(1);
  });

  test("a goal-less copy never goes stale, and is not asked its age", async () => {
    const blob = blobOf({ color: "#ff0000" });
    seedStored(blob, [9], 400 * 24 * 60 * 60 * 1000);
    storeEnabled = true;

    await call(`${IMAGE}/${blob}.png`);
    await settled(() => renders.length > 0);
    expect(renders).toHaveLength(0);
    // The extra HEAD is only worth paying for on the images that expire.
    expect(askedWriteTime).toBe(false);
  });

  test("a goal image is asked its age", async () => {
    const blob = blobOf(GOAL_CONFIG);
    seedStored(blob, [1], 60_000);
    storeEnabled = true;

    await call(`${IMAGE}/${blob}.png`);
    expect(askedWriteTime).toBe(true);
  });

  test("requests inside the same stale window share one render", async () => {
    const blob = blobOf(GOAL_CONFIG);
    seedStored(blob, [1, 1, 1], 6 * 60 * 1000);
    storeEnabled = true;
    // The first render is held open, so the later requests arrive while it is
    // genuinely still running rather than after it happened to finish.
    let release = () => {};
    renderGate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await Promise.all([
      call(`${IMAGE}/${blob}.png`),
      call(`${IMAGE}/${blob}.png`),
      call(`${IMAGE}/${blob}.png`),
    ]);
    expect(renders).toHaveLength(1);

    release();
    await settled(() => stored.get(storage.imageKeyFor(blob))?.data.length === PNG.length);
    expect(stored.get(storage.imageKeyFor(blob))?.data).toEqual(PNG);
  });

  test("a failed background refresh keeps serving the stale copy", async () => {
    const blob = blobOf(GOAL_CONFIG);
    seedStored(blob, [1, 1, 1], 6 * 60 * 1000);
    storeEnabled = true;
    renderError = new Error("no browser available");

    const response = await call(`${IMAGE}/${blob}.png`);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 1, 1]));
    await settled(() => renders.length > 0);
    expect(stored.get(storage.imageKeyFor(blob))?.data).toEqual(new Uint8Array([1, 1, 1]));
  });
});

describe("GET /widget/render", () => {
  test("embeds the config with the close control off and never caches", async () => {
    const response = await call(
      `/widget/render?c=${blobOf({ color: "#0284c7", close: { enabled: true, after: "session", days: 7 } })}`,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain("window.QuietJar=");
    expect(html).toContain("#0284c7");
    // The close control is widget chrome; a static image is the button alone.
    expect(html).toContain('"enabled":false');
    expect(html).not.toContain('"enabled":true');
  });

  test("keeps the goal and points the widget at the origin serving the page", async () => {
    const response = await call(`/widget/render?c=${blobOf(GOAL_CONFIG)}`);
    const html = await response.text();
    // The goal survives, so the render captures a real progress bar.
    expect(html).toContain('"goal":"qg_abc"');
    // And its lookup stays in-process rather than reaching the production API.
    expect(html).toContain('"api":"http://localhost"');
  });

  test("a widget that hides on a reached goal still renders, without its bar", async () => {
    const response = await call(
      `/widget/render?c=${blobOf({ goal: "qg_abc", goalReached: "hide" })}`,
    );
    const html = await response.text();
    // Nothing would be left to screenshot otherwise.
    expect(html).toContain('"goalReached":"show"');
    expect(html).not.toContain('"goalReached":"hide"');
  });

  test("an older snippet without the setting is forced off hiding too", async () => {
    const response = await call(`/widget/render?c=${blobOf(GOAL_CONFIG)}`);
    // Hiding is the widget's default, so leaving it unset would break the image.
    expect(await response.text()).toContain('"goalReached":"show"');
  });

  test("keeps a bar the owner asked to stay on", async () => {
    const response = await call(
      `/widget/render?c=${blobOf({ goal: "qg_abc", goalReached: "show-with-bar" })}`,
    );
    expect(await response.text()).toContain('"goalReached":"show-with-bar"');
  });

  test("rejects an undecodable blob", async () => {
    const response = await call(`/widget/render?c=${encodeURIComponent("!!!")}`);
    expect(response.status).toBe(400);
  });
});

describe("GET /widget/quietjar.js", () => {
  test("404s without a configured bundle", async () => {
    const response = await call("/widget/quietjar.js");
    expect(response.status).toBe(404);
  });
});

describe("blob codec", () => {
  test("round-trips a config", () => {
    const config = { site: "qj_x", labels: { headline: "Support us" } };
    expect(storage.decodeImageConfig(storage.encodeImageConfig(config))).toEqual(config);
  });

  test("rejects arrays, nulls, and garbage", () => {
    expect(storage.decodeImageConfig(encodeRaw([1]))).toBeNull();
    expect(storage.decodeImageConfig(encodeRaw(null))).toBeNull();
    expect(storage.decodeImageConfig("%%%%")).toBeNull();
    expect(storage.decodeImageConfig("")).toBeNull();
  });

  test("hashes identical blobs identically and others differently", () => {
    const a = storage.imageKeyFor(blobOf({ color: "#111111" }));
    const again = storage.imageKeyFor(blobOf({ color: "#111111" }));
    const b = storage.imageKeyFor(blobOf({ color: "#222222" }));
    expect(again).toBe(a);
    expect(b).not.toBe(a);
    expect(a.startsWith("widget-button-cache/images/")).toBe(true);
    expect(a.endsWith(".png")).toBe(true);
  });
});

describe("S3 credential resolution", () => {
  const originalFetch = globalThis.fetch;

  function fakeFetch(body: unknown): void {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("resolves the zone password and hostname", async () => {
    fakeFetch({
      Items: [{ Name: "zone-abc", Password: "zone-pw", StorageHostname: "de.storage.bunnycdn.com" }],
    });
    const credentials = await storage.resolveS3Credentials("key", "zone-abc");
    expect(credentials).toEqual({ password: "zone-pw", hostname: "de.storage.bunnycdn.com" });
  });

  test("caches positive lookups per zone", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ Items: [{ Name: "zone-cached", Password: "pw" }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    await storage.resolveS3Credentials("key", "zone-cached");
    await storage.resolveS3Credentials("key", "zone-cached");
    expect(calls).toBe(1);
  });

  test("returns null when the zone is not on the account", async () => {
    fakeFetch({ Items: [{ Name: "other", Password: "pw" }] });
    expect(await storage.resolveS3Credentials("key", "zone-missing")).toBeNull();
  });

  test("returns null when the API rejects the key", async () => {
    globalThis.fetch = (async () => new Response("denied", { status: 401 })) as unknown as typeof fetch;
    expect(await storage.resolveS3Credentials("key", "zone-denied")).toBeNull();
  });

  test("returns null when the API is unreachable", async () => {
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await storage.resolveS3Credentials("key", "zone-offline")).toBeNull();
  });

  test("imageStoreFromEnv needs both the API key and the zone", async () => {
    expect(await storage.imageStoreFromEnv({})).toBeNull();
    expect(await storage.imageStoreFromEnv({ BUNNY_API_KEY: "key" })).toBeNull();
    expect(await storage.imageStoreFromEnv({ BUNNY_S3_BUCKET: "zone" })).toBeNull();
  });

  test("imageStoreFromEnv builds a store from the resolved zone", async () => {
    fakeFetch({ Items: [{ Name: "zone-store", Password: "pw" }] });
    const store = await realImageStoreFromEnv({
      BUNNY_API_KEY: "key",
      BUNNY_S3_BUCKET: "zone-store",
      BUNNY_S3_ENDPOINT: "http://127.0.0.1:1",
    });
    expect(store).not.toBeNull();
    // Reads against the unreachable endpoint degrade to null.
    expect(await store!.get("img/widget/missing.png", false)).toBeNull();
  });
});
