# AGENTS.md

Astro site (static). Workspace: `@quietjar/frontend`.

- Dev: `bun dev` (port 4321)
- Build: `bun run build` -> `dist/`
- Pages: `src/pages/`. Components: `src/components/`.
- API origin via `PUBLIC_API_URL` / `PUBLIC_FRONTEND_URL`; dev proxies `/api` -> `BACKEND_URL` (default `http://localhost:3000`).
- `.env` holds production URLs; `.env.development` overrides them with localhost in `bun run dev`.
