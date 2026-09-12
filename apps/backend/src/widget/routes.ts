import { existsSync } from "node:fs";
import { Elysia, t } from "elysia";
import { renderWidgetImage } from "./render";
import { decodeImageConfig, imageKeyFor, imageStoreFromEnv, MAX_BLOB_LENGTH } from "./storage";

/**
 * The image route is embedded as <img> across the web: no credentials, no
 * CORS involvement, and every response is cacheable by construction because
 * the config blob in the query fully determines the bytes.
 */
const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** Local bundle shipped in the Docker image; the deployed bundle otherwise. */
function bundleSource(): string | null {
  const path = process.env.WIDGET_BUNDLE_PATH;
  return path && existsSync(path) ? path : null;
}

const FALLBACK_BUNDLE_URL = "https://quietjar.com/js/latest/quietjar.js";

function png(data: Uint8Array<ArrayBuffer>): Response {
  return new Response(data, {
    headers: { "content-type": "image/png", "cache-control": IMAGE_CACHE_CONTROL },
  });
}

function renderPage(blob: string): Response {
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
      if (store) {
        const cached = await store.get(imageKeyFor(blob));
        if (cached) return png(cached);
      }
      const image = await renderWidgetImage(config);
      // The response goes out first; the stored copy serves future misses.
      if (store) void store.put(imageKeyFor(blob), image);
      return png(image);
    },
    {
      params: t.Object({
        file: t.String({ minLength: 1, maxLength: MAX_BLOB_LENGTH }),
      }),
    },
  )
  .get("/widget/render", ({ query }) => renderPage(query.c), {
    query: t.Object({
      c: t.String({ minLength: 1, maxLength: MAX_BLOB_LENGTH }),
    }),
  })
  .get("/widget/quietjar.js", () => bundle());
