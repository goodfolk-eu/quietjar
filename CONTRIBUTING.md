# Contributing to QuietJar

Thanks for helping out. Small fixes are welcome without asking first. For anything bigger, open an issue so we can agree on the approach before you write the code.

## Setup

Follow "Getting started" in the [README](README.md). Git hooks install themselves on `bun install`: lint runs before every commit, and lint, build and test run before every push.

## Pull requests

- Keep each pull request focused on one change.
- Add or update tests for behavior you change. Test what the code does, not how it does it.
- Run `bun run lint`, `bun run build` and `bun run test` before you push.
- Write TypeScript in strict mode, with no `any` and named exports only.
- Use sentence case in headings and UI copy.

The full code style lives in [AGENTS.md](AGENTS.md).

## License of contributions

QuietJar is licensed under the [AGPL-3.0](LICENSE). By opening a pull request, you agree that your contribution is licensed under the same terms.

## Security issues

Do not open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md).
