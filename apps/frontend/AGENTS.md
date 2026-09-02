# AGENTS.md

Astro site (static). Workspace: `@quietjar/frontend`.

- Dev: `bun dev` (port 4321)
- Build: `bun run build` -> `dist/`
- Pages: `src/pages/`. Components: `src/components/`.
- API origin via `PUBLIC_API_URL` / `PUBLIC_FRONTEND_URL`; dev proxies `/api` -> `BACKEND_URL` (default `http://localhost:3000`).
- `.env` holds production URLs; `.env.development` overrides them with localhost in `bun run dev`.
- Strict CSP is on (`security.csp` in `astro.config.mjs`, no `unsafe-inline`/`unsafe-hashes`). Never use `style="..."` attributes or `define:vars` — style attributes can't be hashed and get blocked in production. Use Tailwind classes or a scoped `<style>` block instead. Same for `data:` URIs in CSS: keep `vite.build.assetsInlineLimit: 0` so fonts stay real files under `font-src 'self'`.
