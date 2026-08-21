# AGENTS.md

Bun monorepo. Workspaces: `apps/frontend` (Astro) and `apps/backend` (Elysia/BetterAuth).

- Install: `bun install`
- Dev: `bun dev` (runs backend + frontend)
- Frontend: `bun --cwd apps/frontend dev|build` (port 4321)
- Backend: `bun --cwd apps/backend dev` (port 3000)
- Add deps: `bun add <pkg>`

`bun` may not be on PATH; use `/usr/local/bin/bun` if needed.

## Use a Reference Implementation

- When building something new, always check for a reference implementation and use the same style, tools, libraries, patterns as used in the reference implementation.
- Do not re-invent anything if already used somewhere else in the codebase.

## Code Comments

- Default to no comment. Only add one when the code cannot be made clear on its own.
- Do not mention issue numbers, tickets, or PRs in comments. Do not explain that something was done for a specific issue.
- Do not comment on WHY something is done unless the reasoning is non-obvious and important for a developer to know. Never restate what the code already says.
- Prefer making the code self-explanatory (clear names, small functions) over adding a comment to explain unclear code.
- Comment the non-obvious: workarounds, gotchas, external constraints, and intentional deviations that would surprise a reader.
- Do not leave narration or change-log comments (e.g. "moved this here", "renamed from X", "now handles Y"). Comments describe the code as it is, not its history.
- Do not add TODO/FIXME comments unless the user asks for them.
- Keep JSDoc/docstrings only where they add value beyond the signature; do not document self-evident parameters.

## Code Style

- TypeScript strict mode, no `any` types
- Use named exports, not default exports
- Use Biome formatting and linting rules (found in `/biome.json`) when writing code
- Avoid nested ternaries

## Headings casing
- For headings and titles always use sentence case. Never use Title Case.
- Never use em-dashes. Minimize using dashes. If needed, use a regular dash.

## How to write good tests

**Test behavior, not implementation.**
Tests should verify what a function returns or what side effects it produces - not how it does it internally. If a test would break after a refactor that leaves behavior unchanged, it is testing the wrong thing.

**Avoid over-mocking.**
Only mock what crosses a real boundary: network calls, database queries, time, randomness. Do not mock internal helpers or pure functions just because they are called. A test that mocks every dependency and then asserts specific internal method call order is fragile and provides no safety.

**Assert something meaningful.**
Every test must assert on the actual behavior. A test that calls a function and only checks it does not throw is not a test - it is noise. Assert on return values, on state changes, on what was written to the database.

**Cover real edge cases.**
After writing the happy path, ask yourself: what happens with empty input? What if the list is empty? What if a required field is null or undefined? What if the external call fails? These are the cases that break in production.

**Fewer tests of higher quality is better.**
Do not write tests to hit a coverage number. A small suite of focused, meaningful tests is more valuable than a large suite of shallow ones. Remove or skip tests that do not assert anything useful rather than keeping them for appearances.
