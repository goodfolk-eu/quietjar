# Open decisions

Everything unresolved, in one place. Check this before writing anything with a number in it. When a decision lands, move it to the top as "Decided" with the date, and update the file that depends on it.

## Decided

- **Lead with goals that end (2026-09-25).** Goals that hide the button when met replace "no redirect" as the headline. Ko-fi and Buy Me a Coffee both have on-page widgets, so the redirect claim is out. First proof: TCG Pocket Collection Tracker, €50 goal for September 2026 hosting, €97 raised in 12 hours, against a €30 monthly average on Buy Me a Coffee. Approved for public use, site named.
- **The exact fee and cap (2026-09-09).** 5% flat per payment, no per-transaction cap. Shipped on the homepage, developers page, and compare page.
- **Payout schedule (2026-09-23).** Manual payouts: the creator pays out the full available balance from the dashboard once it reaches 50 EUR (or the local equivalent). Replaces Stripe's daily automatic payouts, which cost a fee per payout and made nearly every account count as active for Stripe's monthly per-account charge.

## Blocking the redesign copy

1. **VAT treatment.** Gift or taxable supply. Formal advice required before launch and before any publisher outreach.

## Product questions that shape copy

- Is the hosted page (mentioned in the current FAQ) meant for creators who want a shareable link? If so, it needs a line in the positioning.
- Is the "powered by" link on by default, and can site owners remove it? This decides the weight of channel 4.
- Is a WordPress plugin or Ghost integration on the roadmap, and when? Without one the creator segment is mostly technical users.
- Is recurring support on the roadmap? It changes the market we are in and the competitors we face.

## Facts to verify before publishing

- Ko-fi Gold price ($6, $8, or $12 per month) and whether Contributor status is still on by default
- Whether Buy Me a Coffee's floating widget now supports Apple Pay
- Whether Ko-fi or Buy Me a Coffee can hide their button when a goal is met, or reset goals monthly
- Fundraise Up and Donorbox EU payment method coverage
- Polar roadmap for donations or pay-what-you-want
- Any 2026 widget launches from Mollie or Payrequest

## Data we need from the first installs

Each of these replaces an assumption in market.md and a placeholder in positioning.md:

- Actual completion rate, per site
- Actual average support amount, with and without a goal
- Time to fund a goal, and raised per goal against the site's previous monthly average
- Actual payment method mix
- Measured load time and script size on a real page

## Team questions

- Who writes the craft notes? They need an engineer's voice.
- Which platform guide ships first? Depends on where the first installs land.
- Wordmark casing convention in prose. Currently lowercase on the site; this file set uses QuietJar.
