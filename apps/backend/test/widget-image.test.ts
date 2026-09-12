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
mock.module("../src/widget/render", () => ({
  renderWidgetImage: async (config: unknown) => {
    renders.push(config);
    if (renderError) throw renderError;
    return new Uint8Array(PNG);
  },
}));

const stored = new Map<string, Uint8Array<ArrayBuffer>>();
let storeEnabled = false;
mock.module("../src/widget/storage", () => ({
  ...storage,
  imageStoreFromEnv: () => {
    if (!storeEnabled) return null;
    return {
      get: async (key: string) => stored.get(key) ?? null,
      put: async (key: string, data: Uint8Array<ArrayBuffer>) => {
        stored.set(key, data);
      },
    };
  },
}));

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
  stored.clear();
  storeEnabled = false;
});

describe("GET /api/widget/image", () => {
  test("renders and serves a cacheable png for a valid config blob", async () => {
    const response = await call(`${IMAGE}?c=${blobOf({ color: "#0284c7" })}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG);
    expect(renders).toEqual([{ color: "#0284c7" }]);
  });

  test("rejects an undecodable blob without rendering", async () => {
    const response = await call(`${IMAGE}?c=${encodeURIComponent("!!!not-json!!!")}`);
    expect(response.status).toBe(400);
    expect(renders).toHaveLength(0);
  });

  test("rejects a blob that is not an object", async () => {
    const response = await call(`${IMAGE}?c=${encodeRaw([1, 2])}`);
    expect(response.status).toBe(400);
    expect(renders).toHaveLength(0);
  });

  test("an oversized blob fails validation", async () => {
    const response = await call(`${IMAGE}?c=${"a".repeat(storage.MAX_BLOB_LENGTH + 1)}`);
    expect(response.status).toBe(422);
    expect(renders).toHaveLength(0);
  });

  test("serves the stored copy without rendering", async () => {
    const blob = blobOf({ color: "#ff0000" });
    stored.set(storage.imageKeyFor(blob), new Uint8Array([9, 9, 9]));
    storeEnabled = true;

    const response = await call(`${IMAGE}?c=${blob}`);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([9, 9, 9]));
    expect(renders).toHaveLength(0);
  });

  test("stores the rendered image on a cache miss", async () => {
    const blob = blobOf({ color: "#00ff00" });
    storeEnabled = true;

    const response = await call(`${IMAGE}?c=${blob}`);
    expect(response.status).toBe(200);
    expect(stored.get(storage.imageKeyFor(blob))).toEqual(PNG);
    expect(renders).toHaveLength(1);
  });

  test("a failed render surfaces as an error response", async () => {
    renderError = new Error("no browser available");
    const response = await call(`${IMAGE}?c=${blobOf({})}`);
    expect(response.status).toBe(500);
  });
});

describe("GET /widget/render", () => {
  test("embeds the config and never caches", async () => {
    const response = await call(`/widget/render?c=${blobOf({ color: "#0284c7" })}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain("window.QuietJar=");
    expect(html).toContain("#0284c7");
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
    expect(await store!.get("img/widget/missing.png")).toBeNull();
  });
});
