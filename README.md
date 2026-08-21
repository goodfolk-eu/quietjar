# QuietJar

A small, beautifully made donate button you drop straight into your own website. Supporters pay right there, in a couple of taps, without ever leaving your page.

It is the "quiet" tip jar: fast, seamless, and polite. It lives on your site instead of sending people to a profile on someone else's platform, so far more of them actually follow through. It knows when to stop asking people who have already given, and it charges no monthly fee. QuietJar takes a small share of what you actually receive, so it only wins when you do.

## Features

- On-page donation button, no redirect to a third-party page
- Two-tap checkout with familiar payment methods
- Polite by default: stops asking after someone supports you
- Matches your site's design
- No monthly fee, a small share only when you get paid
- Optional hosted page for people who prefer one

## Stack

- **Monorepo:** Bun workspaces
- **Frontend:** Astro + Tailwind CSS v4 (static), in `apps/frontend`
- **Backend:** Elysia + BetterAuth with email OTP, in `apps/backend`

## Getting started

Requirements: Bun. If `bun` is not on your path, use `/usr/local/bin/bun`.

```bash
bun install          # install workspace deps
bun dev              # run backend (3000) + frontend (4321)
```

The frontend dev server proxies `/api` to the backend so auth cookies stay same-origin.

## Development

- Frontend: `bun --cwd apps/frontend dev` (port 4321), build with `bun --cwd apps/frontend build`
- Backend: `bun --cwd apps/backend dev` (port 3000)
- Backend env: copy `apps/backend/.env.example` to `apps/backend/.env`
- Add a dependency: `bun add <pkg>`

## Project structure

```
apps/
  frontend/   Astro site, landing page and dashboard
  backend/    Elysia + BetterAuth API
```

## License

Copyleft.
