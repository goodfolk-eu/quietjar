# AGENTS.md

Astro site (static). Workspace: `@quietjar/frontend`.

- Dev: `bun dev` (port 4321)
- Build: `bun run build` -> `dist/`
- Pages: `src/pages/`. Components: `src/components/`.
- API origin via `PUBLIC_API_URL` / `PUBLIC_FRONTEND_URL`; dev proxies `/api` -> `BACKEND_URL` (default `http://localhost:3000`).
- `.env` holds production URLs; `.env.development` overrides them with localhost in `bun run dev`.
- Strict CSP is on (`security.csp` in `astro.config.mjs`). Inline scripts and `<style>` blocks are hashed; `style="..."` attributes and `define:vars` are allowed via `style-src-attr 'unsafe-inline'`. `data:` URIs in CSS are still blocked: keep `vite.build.assetsInlineLimit: 0` so fonts stay real files under `font-src 'self'`.
- The Bunny pull zone sends `Content-Security-Policy: frame-ancestors 'none'` as a response header (plus `X-Content-Type-Options: nosniff`). `frame-ancestors` is ignored in meta policies, so the header carries only it; every other directive lives in the meta CSP above.
- Hosted pages (`/@<handle>`) are one static shell, `src/pages/hosted/index.astro`, that reads the handle from the address and loads the page from `GET /api/hosted/page/:handle`. In dev a Vite middleware in `astro.config.mjs` rewrites `/@*` to it. Production needs a Bunny pull zone edge rule: condition "Request URL" matches `*/@*`, action "Change Origin URL" to `https://quietjar.com/hosted/index.html` (the origin path is not appended, so every handle gets the same shell).
