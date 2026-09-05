# AGENTS.md

Elysia + BetterAuth API (email OTP). Workspace: `@quietjar/backend`.

- Dev: `bun dev` (port 3000)
- Auth flow: email OTP, auto-creates user on first verify.
- Email delivery: Scaleway Transactional Email REST API over HTTPS (not SMTP, which Bunny Magic Containers blocks).
- Stripe env: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` (handed to the widget), `STRIPE_WEBHOOK_SECRET`.
- `/api/pay/*` is public and answers any origin; every other route is limited to the dashboard origin.
  Payments are only accepted from the site URL the creator registered.
- Deploy: `bun deploy` builds the image for `linux/amd64`, pushes it to Docker Hub (image tag = git short SHA), syncs the backend env vars from `.env` onto the Bunny container, then triggers a redeploy. Flags: `--dry-run`, `--skip-typecheck`, `--skip-build`, `--skip-login`, `--skip-redeploy`.
