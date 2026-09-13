import { existsSync } from "node:fs";
import { Elysia, t } from "elysia";
import { GOAL_PROGRESS_TTL_MS } from "../goals/window";
import { renderWidgetImage } from "./render";
import {
  decodeImageConfig,
  imageKeyFor,
  imageStoreFromEnv,
  MAX_BLOB_LENGTH,
  type StoredImage,
  type WidgetImageStore,
} from "./storage";

/**
 * The image route is embedded as <img> across the web: no credentials and no
 * CORS involvement. A config without a goal is cacheable forever, because the
 * blob in the path fully determines the bytes. A goal makes the bytes depend
 * on how much has been raised, so those expire on the same five minute window
 * as the progress endpoint and the bar can never lag the live meter by more
 * than one of them.
 */
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const GOAL_CACHE_CONTROL = `public, max-age=${GOAL_PROGRESS_TTL_MS / 1000}`;

/**
 * Local bundle shipped in the Docker image; the deployed bundle otherwise.
 * Both the container and the dev script set WIDGET_BUNDLE_PATH, because
 * without it the render page screenshots the deployed widget and a feature
 * that only exists locally silently fails to appear in the image.
 */
function bundleSource(): string | null {
  const path = process.env.WIDGET_BUNDLE_PATH;
  return path && existsSync(path) ? path : null;
}

const FALLBACK_BUNDLE_URL = "https://quietjar.com/js/latest/quietjar.js";

function png(data: Uint8Array<ArrayBuffer>, cacheControl: string): Response {
  return new Response(data, {
    headers: { "content-type": "image/png", "cache-control": cacheControl },
  });
}

/** The goal the config names, or null when it names none. */
function goalOf(config: unknown): string | null {
  const goal = (config as { goal?: unknown }).goal;
  if (typeof goal !== "string") return null;
  const trimmed = goal.trim();
  return trimmed === "" ? null : trimmed;
}

function renderPage(blob: string, origin: string): Response {
  const config = decodeImageConfig(blob);
  if (!config) {
    return new Response("invalid widget config", { status: 400 });
  }
  // The close control is interactive widget chrome; a static image is the
  // button alone, so it is never rendered into the screenshot.
  const patchable = config as Record<string, unknown>;
  const close = patchable.close;
  patchable.close = {
    ...(typeof close === "object" && close !== null ? close : {}),
    enabled: false,
  };
  // The renderer loads this page from the backend serving it, so pointing the
  // widget at the same origin keeps the goal lookup in-process instead of
  // reaching the production API from a dev box or from CI.
  patchable.api = origin;
  // Script-tag safety: the config is attacker-controlled input in principle.
  const json = JSON.stringify(patchable)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const src = bundleSource() ? "/widget/quietjar.js" : FALLBACK_BUNDLE_URL;
  const html =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;background:transparent}</style></head>` +
    `<body><script>window.QuietJar=${json};</script><script src="${src}"></script></body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function bundle(): Response {
  const path = bundleSource();
  if (!path) return new Response("widget bundle not configured", { status: 404 });
  return new Response(Bun.file(path), {
    headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * A bucket that did not report a write time counts as stale, so the bar
 * refreshes rather than freezing on a copy whose age is unknown.
 */
function isStale(cached: StoredImage): boolean {
  return cached.storedAt === null || Date.now() - cached.storedAt >= GOAL_PROGRESS_TTL_MS;
}

/**
 * Keys with a background render already running. Without this, every request
 * arriving inside the same stale window would queue its own browser: with
 * immutable images a stampede happened once per config ever, but an expiring
 * one comes round again every five minutes.
 */
const refreshing = new Set<string>();

async function refresh(store: WidgetImageStore, key: string, config: object): Promise<void> {
  if (refreshing.has(key)) return;
  refreshing.add(key);
  try {
    await store.put(key, await renderWidgetImage(config));
  } catch (err) {
    // The stale copy keeps being served and the next window tries again.
    console.error("[widget/image] background refresh failed:", (err as Error).message);
  } finally {
    refreshing.delete(key);
  }
}

export const widgetRoutes = new Elysia()
  .get(
    // The config blob is the path, not a query string: BunnyCDN keys its cache
    // on the path and ignores query strings, so query-encoded settings would
    // all share one cached image. The .png file name keeps the URL cacheable.
    "/api/widget/image/:file",
    async ({ params }) => {
      const store = await imageStoreFromEnv();
      const blob = params.file.replace(/\.png$/i, "");
      const config = decodeImageConfig(blob);
      if (!config) {
        return new Response("invalid widget config", { status: 400 });
      }
      const expires = goalOf(config) !== null;
      const cacheControl = expires ? GOAL_CACHE_CONTROL : IMMUTABLE_CACHE_CONTROL;
      const key = imageKeyFor(blob);

      if (store) {
        const cached = await store.get(key, expires);
        if (cached) {
          // Stale bar: the old bytes still go out now and a fresh render
          // overwrites the same key in the background, so no request waits on a
          // browser and the stored copy never multiplies into one object per
          // window.
          if (expires && isStale(cached)) void refresh(store, key, config);
          return png(cached.data, cacheControl);
        }
      }

      const image = await renderWidgetImage(config);
      // The response goes out first; the stored copy serves future misses.
      if (store) void store.put(key, image);
      return png(image, cacheControl);
    },
    {
      params: t.Object({
        file: t.String({ minLength: 1, maxLength: MAX_BLOB_LENGTH }),
      }),
    },
  )
  .get("/widget/render", ({ query, request }) => renderPage(query.c, new URL(request.url).origin), {
    query: t.Object({
      c: t.String({ minLength: 1, maxLength: MAX_BLOB_LENGTH }),
    }),
  })
  .get("/widget/quietjar.js", () => bundle());
