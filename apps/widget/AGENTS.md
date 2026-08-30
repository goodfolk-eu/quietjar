# AGENTS.md

Client-side embed widget, installed by site owners as a single `<script>` tag. Workspace: `@quietjar/widget`.

- Build: `bun run build` bundles `src/index.ts` into a single IIFE at `dist/widget.js`.
- Deploy: no deploy script here. `apps/frontend`'s `build:embed` bundles this app into
  `apps/frontend/public/js/latest/widget.js`, so the frontend deploy uploads it to Bunny and serves
  it at `https://quietjar.com/js/latest/widget.js`, the URL the dashboard puts in the embed snippet.
- Dev: `bun dev` serves a test page with the widget mounted at `http://localhost:5175`. Config lives in `dev-config.json`, page markup in `dev-page.html`; edits to either or `src/` hot reload.
- Typecheck: `bun run typecheck`
- Test: `bun test` (Bun's built-in runner; `test/setup.ts` registers happy-dom globals)
- Config is read from `window.QuietJar`; see `src/config.ts` for the shape and defaults.
