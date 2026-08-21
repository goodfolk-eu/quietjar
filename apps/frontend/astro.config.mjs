import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

/**
 * Backend origin forwarded to in local dev.
 * The Astro dev server proxies /api -> backend so auth cookies stay
 * same-origin (avoids cross-site cookie + CORS pain during development).
 */
const BACKEND_ORIGIN = process.env.BACKEND_URL ?? "http://localhost:3000";

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

export default defineConfig({
  output: "static",
  site: "http://localhost:4321",
  integrations: [icon()],
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    plugins: [tailwindcss(), apiProxy()],
  },
});
