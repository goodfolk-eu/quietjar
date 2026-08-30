import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import robotsTxt from "astro-robots-txt";
import { llmMarkdown } from "./src/integrations/llm-markdown.ts";
import { sitemapIndexLastmod } from "./src/integrations/sitemap-index-lastmod.js";
import {
  buildLastmodMap,
  authoredLastmod,
  buildChunkLastmods,
} from "./src/lib/sitemap-lastmod.js";
import { defaultLocale, locales } from "./src/i18n/config.ts";

/**
 * Backend origin forwarded to in local dev.
 * The Astro dev server proxies /api -> backend so auth cookies stay
 * same-origin (avoids cross-site cookie + CORS pain during development).
 */
const BACKEND_ORIGIN = process.env.BACKEND_URL ?? "http://localhost:3000";

const site = process.env.PUBLIC_FRONTEND_URL ?? "https://quietjar.com";

// Origin the browser talks to for /api calls. Cross-origin in production
// (api.quietjar.com), same-origin in dev via the apiProxy.
const apiOrigin = process.env.PUBLIC_API_URL ?? "https://api.quietjar.com";

// Minimal Vite plugin that forwards /api requests to the backend during dev.
const apiProxy = () => ({
  name: "quietjar-api-proxy",
  configureServer(server) {
    // Mount WITHOUT a path prefix — connect strips the prefix otherwise.
    server.middlewares.use(async (req, res, next) => {
      const reqPath = req.url ?? "/";
      if (!reqPath.startsWith("/api")) {
        next();
        return;
      }
      try {
        const target = new URL(reqPath, BACKEND_ORIGIN);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v !== undefined) headers.set(k, v);
        }
        let body;
        if (!["GET", "HEAD"].includes((req.method ?? "GET").toUpperCase())) {
          body = await new Promise((resolve) => {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", () => resolve(Buffer.concat(chunks)));
          });
        }
        const upstream = await fetch(target, { method: req.method, headers, body });
        res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
        res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch (err) {
        console.error("[api-proxy]", err);
        next(err);
      }
    });
  },
});

const lastmodMap = buildLastmodMap();

const AI_USER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "ChatGPT-User",
  "CCBot",
  "Applebot-Extended",
];

const integrations = [
  icon(),
  llmMarkdown({
    siteName: "QuietJar",
    description:
      "A donation button that lives on your own site, so your supporters can pay without leaving your page.",
  }),
  sitemap({
    changefreq: "weekly",
    priority: 0.7,
    i18n: {
      defaultLocale,
      locales: Object.fromEntries(locales.map((l) => [l, l])),
    },
    serialize: (item) => {
      const path = new URL(item.url).pathname;
      const authored = authoredLastmod(path, lastmodMap);
      if (authored) item.lastmod = authored;
      return item;
    },
    filter: (page) => !page.includes("/dashboard") && !page.includes("/api/"),
  }),
  sitemapIndexLastmod({ chunkLastmods: buildChunkLastmods(lastmodMap) }),
  robotsTxt({
    host: true,
    policy: [
      { userAgent: "*", disallow: ["/dashboard/", "/api/"] },
      // Each AI agent gets its own group, which overrides the wildcard group
      // above, so the dashboard/api disallow must be repeated here.
      ...AI_USER_AGENTS.map((agent) => ({
        userAgent: agent,
        allow: "/",
        disallow: ["/dashboard/", "/api/"],
      })),
    ],
  }),
];

/**
 * Preline's per-plugin bundles (`preline/plugins/*`) export nothing — they
 * self-init on window load and assign to `window.HS*`. Its package.json
 * `sideEffects` list omits those dist files, so Vite marks them side-effect-free
 * and Rollup drops the bare imports, silently shipping no JS. Re-resolve them
 * ahead of `vite:resolve` and flag them as side-effectful.
 *
 * Without this, importing the `preline` barrel is the only thing that works, and
 * that barrel is one 376 kB pre-bundled chunk (apexcharts, datatables, dropzone,
 * ...) that cannot be tree-shaken.
 */
const prelineSideEffects = () => ({
  name: "quietjar-preline-side-effects",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (!source.startsWith("preline/plugins/")) return null;
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    return resolved ? { ...resolved, moduleSideEffects: true } : null;
  },
});

export default defineConfig({
  output: "static",
  site,
  integrations,
  i18n: {
    defaultLocale,
    locales: [...locales],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' " + apiOrigin,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'none'",
        "media-src 'none'",
        "worker-src 'none'",
        "upgrade-insecure-requests",
      ],
    },
  },
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    plugins: [tailwindcss(), apiProxy(), prelineSideEffects()],
  },
});