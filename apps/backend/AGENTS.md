# AGENTS.md

Elysia + BetterAuth API (email OTP). Workspace: `@quietjar/backend`.

- Dev: `bun dev` (port 3000)
- Auth flow: email OTP, auto-creates user on first verify.
- Email delivery: Scaleway Transactional Email REST API over HTTPS (not SMTP, which Bunny Magic Containers blocks).
- Deploy: `bun deploy` builds the image for `linux/amd64`, pushes it to Docker Hub (image tag = git short SHA), syncs the backend env vars from `.env` onto the Bunny container, then triggers a redeploy. Flags: `--dry-run`, `--skip-typecheck`, `--skip-build`, `--skip-login`, `--skip-redeploy`.
