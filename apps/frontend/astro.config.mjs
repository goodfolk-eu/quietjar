import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
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
import { localizeLinks } from "./src/lib/localize-links.ts";

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
        // Object.fromEntries(headers) keeps only the LAST Set-Cookie, which
        // silently drops the session cookie when the backend sets more than
        // one. Forward them as an array instead.
        const outHeaders = Object.fromEntries(upstream.headers);
        delete outHeaders["set-cookie"];
        const setCookies = upstream.headers.getSetCookie();
        if (setCookies.length > 0) outHeaders["set-cookie"] = setCookies;
        res.writeHead(upstream.status, outHeaders);
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
    // No `host: true` — the `Host:` directive is non-standard (Yandex-only,
    // deprecated there since 2018) and Google Search Console flags it as an
    // ignored rule.
    policy: [
      { userAgent: "*", disallow: ["/en/dashboard/", "/api/"] },
      // Each AI agent gets its own group, which overrides the wildcard group
      // above, so the dashboard/api disallow must be repeated here.
      ...AI_USER_AGENTS.map((agent) => ({
        userAgent: agent,
        allow: "/",
        disallow: ["/en/dashboard/", "/api/"],
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
  redirects: {
    "/legal": "/en/legal/privacy-policy",
    "/en": "/",
  },
  markdown: { syntaxHighlight: false, processor: satteri({ hastPlugins: [localizeLinks] }) },
  i18n: {
    defaultLocale,
    locales: [...locales],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  security: {
    csp: {
      algorithm: "SHA-256",
      styleDirective: {
        // ApexCharts sets inline `style` attributes on the SVG it builds, and
        // the tooltip markup carries one too. Its runtime stylesheet injection
        // is disabled in earnings.astro, so no element-level exception is
        // needed and <style>/<link> stay hash-locked.
        resources: [{ resource: "'unsafe-inline'", kind: "attribute" }],
      },
      scriptDirective: {
        resources: ["'self'", "https://js.stripe.com", "https://*.js.stripe.com", "https://umami.quietjar.com"],
      },
      directives: [
        "default-src 'none'",
        "img-src 'self' data: https://*.stripe.com",
        "font-src 'self'",
        "connect-src 'self' " + apiOrigin + " https://api.stripe.com https://umami.quietjar.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com",
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
    build: {
      // Keep fonts as real files instead of data: URIs, so font-src 'self' is
      // enough and no data: source is needed in the CSP. A flat 0 here used to
      // do that, but Astro's page-CSS inlining ("auto" mode) reuses this same
      // limit to decide whether a page's small CSS chunk gets inlined as a
      // <style> tag - with 0 it never does, so even a 1 KB stylesheet shipped
      // as a separate render-blocking request. Only font files opt out here;
      // everything else (CSS chunks included) falls back to the normal 4 KiB
      // default.
      assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf|eot)$/i.test(filePath) ? false : undefined),
    },
  },
});
