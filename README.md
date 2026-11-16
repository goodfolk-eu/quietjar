# QuietJar

A support button for your own website that only asks when it matters.

Set a goal for a real cost, like this month's hosting or the next release. The button shows up on your site, your supporters cover it in a couple of taps, and the button goes quiet until the next goal.

A button that is always there turns into wallpaper. A goal with a finish line gives people a reason to act now. TCG Pocket Collection Tracker set a €50 goal for its September 2026 hosting and raised €97 in 12 hours. Its Buy Me a Coffee button averaged €30 a month.

Use it at [quietjar.com](https://quietjar.com), or read the code here. QuietJar is open source under the [AGPL-3.0](LICENSE) license.

<a href="https://quietjar.com?qj_open=1"><img src="https://api.quietjar.com/api/widget/image/eyJzaXRlIjoicWpfOWJkYTAzODU2MTY0ZTkzZjhiNzE1MDMwIiwiY3VycmVuY3kiOiJldXIiLCJsYWJlbHMiOnsiaGVhZGxpbmUiOiJTdXBwb3J0IHRoaXMgcHJvamVjdCIsImJvZHkiOiIiLCJhY3Rpb24iOiJTdXBwb3J0IiwiaWNvbiI6InBpZ2d5In0sInN0eWxlIjp7ImNvbG9yIjoiIzAzNjlhMSIsImZvbnQiOiJyb3VuZGVkIn0sImNsb3NlIjp7ImVuYWJsZWQiOnRydWUsImFmdGVyIjoic2Vzc2lvbiIsImRheXMiOjd9LCJkb25hdGlvbiI6eyJoaWRlRGF5cyI6MzB9LCJwb3NpdGlvbiI6eyJjb3JuZXIiOiJib3R0b20tcmlnaHQifSwiZ29hbCI6InFnXzQ4YTg1NGY4MDYyZjUyZDAiLCJnb2FsUmVhY2hlZCI6ImhpZGUifQ.png" alt="Support this project" width="384"></a>

## What it does

- **Goals that end.** Monthly or one-off goals with a progress bar. Once a goal is met, the button steps aside until the next one starts.
- **Checkout on your page.** Apple Pay, Google Pay, cards, iDEAL and Bancontact, in two taps, with no layout shift.
- **Polite to supporters.** After someone gives, the button thanks them and stops asking for a while.
- **Small and fast.** One script tag, 11.7 kB gzipped, around 40 ms to load.
- **No monthly fee.** The hosted service takes 5% of each donation, minimum €0.50, and pays the card fees.

## Stack

- **Monorepo:** Bun workspaces
- **Frontend:** Astro and Tailwind CSS v4 (static), in `apps/frontend`
- **Widget:** the embeddable script, in `apps/widget`
- **Backend:** Elysia, BetterAuth with email codes, libsql and Stripe, in `apps/backend`

## Getting started

You need [Bun](https://bun.sh) and a Stripe account in test mode.

```bash
bun install
cp apps/backend/.env.example apps/backend/.env.development
# fill in BETTER_AUTH_SECRET and your Stripe test keys
bun dev
```

`bun dev` runs the backend on port 3000 and the frontend on port 4321. The frontend proxies `/api` to the backend, so auth cookies stay on the same origin. Without email settings, sign-in codes show up in the backend console.

Useful commands:

- `bun run lint` checks formatting and lint rules (Biome)
- `bun run test` runs every workspace's tests
- `bun run build` builds the backend, widget and frontend

## Contributing

Bug reports, ideas and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before you start. To report a security issue, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

Copyright © Goodfolk B.V.

QuietJar is free software: you can redistribute it and modify it under the terms of the GNU Affero General Public License, version 3. If you run a modified version as a network service, you must offer its source code to the people who use it. See [LICENSE](LICENSE) for the full text.

The QuietJar name and logo are not covered by the license. Please do not use them for a fork or a competing service.
