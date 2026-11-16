# Competitors

Fees checked against public sources in the first week of September 2026. They change often. Verify before any number goes on the site. Competitor prices stay in their published currency.

## The map

Two axes: quality of the on-page experience, and who is allowed to use it. On top of the map, one feature nobody else has: a button that shows up for a goal and disappears once the goal is met. Every tool below either has no goals or shows a goal bar next to a button that is always on.

- High on-page quality, nonprofits only: Fundraise Up, Givebutter, Donorbox, Zeffy
- Low on-page quality, open to anyone: Buy Me a Coffee, Ko-fi, Liberapay, PayPal
- High on-page quality, developers only: Polar, Stripe direct
- High on-page quality, open to anyone: empty. That is our quadrant

The threat is not a direct competitor. It is Ko-fi or Buy Me a Coffee tying their widget to their goals (hide when met, monthly reset), adding wallets, or Stripe making embedded checkout trivial for non-developers.

## Hosted creator tip platforms

### Buy Me a Coffee

- 5% platform fee on tips, memberships, and shop. No monthly plan. Processing on top
- Creators connect their own Stripe account. PayPal in some regions
- Button links to the hosted page. The floating widget takes payment on the host site, in a Buy Me a Coffee panel (buymeacoffee.com and WordPress plugin docs, checked September 2026)
- Goals since July 2024: a target and progress bar on the profile page. The button stays up whether the goal is met or not
- Strength: friendly brand, strong casual conversion, huge installed base on blogs and READMEs
- Gap: no local EU methods, limited wallets, a button that always asks, the coffee metaphor

### Ko-fi

- Free plan: 0% on one-off donations, 5% on shop and memberships. A "Contributor" status charging 5% on everything is on by default for new accounts (artcurator.org, January 2026)
- Ko-fi Gold removes platform fees. Price reported as $12/month (cartmango.com, August 2026); older sources say $6 or $8. Verify
- Pays out instantly to the creator's own Stripe or PayPal
- Buttons, floating button with an on-page tip panel, and a WordPress plugin (help.ko-fi.com, checked September 2026)
- Goals: one active goal at a time, shown on the profile and in an embeddable goal bar widget. The creator starts a new goal by hand. The button stays up whether the goal is met or not
- Strength: fee-free tips are one Gold subscription away, and free-plan tips can be too if Contributor status is turned off. Ko-fi self-reports over 1 million creators
- Gap: PayPal-heavy, no wallets or iDEAL, English-only interface, a button that always asks

### Liberapay

- 0% platform fee, recurring only, nonprofit, EU-based, open source
- Badge or link to a Liberapay profile. No embed
- Strength: trusted by European open source developers
- Gap: no one-off tips, dated UX

### Patreon (adjacent)

- Membership, not tipping. 8% to 12% plus processing. Over $2 billion paid to creators per year (Patreon via Variety, 2026)
- Owns the "support a creator" mental model. Not a direct competitor

## Nonprofit donation tech

### Fundraise Up

- 4% platform fee, no monthly fee, plus processing (Stripe 2.2% + $0.30 at the nonprofit rate)
- Fundraise Up states 92% of supporters choose to cover transaction costs (fundraiseup.com support pages)
- Best embed engineering in the category: on-page checkout, wallets, recurring, upsells. Their pitch is conversion, same as ours
- Nonprofits only, enterprise-leaning, US-centric

### Givebutter

- 0% platform fee when optional donor tips are on (default tip 15%). Flat 3% platform fee when tips are off. Processing 2.9% + 30¢ on cards, 1.9% + 30¢ on ACH (givebutter.com/pricing)
- Givebutter states more than 95% of donors cover fees when asked
- "Donation bubbles" sit on every page of a site. Closest thing to a persistent on-page widget among incumbents
- Nonprofits only, US processing only

### Donorbox

- Platform fee 1.75% to 3.95% depending on plan, processing 2.2% + $0.30 (donorbox.org)
- Embeddable forms, strong recurring giving
- Nonprofit focus, form-heavy, not built for €3 support

### Zeffy

- 0% platform and 0% processing for nonprofits, funded by voluntary donor contributions
- Relevant only as proof that "free to the recipient" is a strong hook

## Developer and open source funding

### GitHub Sponsors

- 0% fee for individual sponsors
- Both sides need a GitHub account. Recurring by default. Lives on GitHub, not on the maintainer's site
- Default choice for maintainers. FUNDING.yml makes it a one-line setup

### Open Collective

- Platform is free for collectives. Fiscal hosts charge a host fee, typically 4% to 10% (documentation.opencollective.com, June 2026)
- New organization pricing from March 2026. Stewarded by OFi Consortium since October 2024
- For projects that manage money as a group, not for a solo creator's button

### Polar

- Merchant of record for developers selling software and digital goods. Handles VAT
- Starter plan 5% + $0.50 per transaction for organizations created on or after May 27, 2026. Previously 4% + $0.40 plus 0.5% on subscriptions, grandfathered for earlier accounts (polar.sh/blog/introducing-polar-plans)
- Paid plans lower the rate: Pro $20/month, Growth $100/month, Scale $400/month. International cards add 1.5%. Disputes cost $15
- Stockholm-based, Accel-backed, open source
- Not a tip button today, but donations are a short step from what it does. Watch it

### thanks.dev, IssueHunt, Tidelift

Niche. Not relevant to the goals wedge.

## DIY payment rails

### Stripe direct

- EU domestic cards 1.5% + €0.25. iDEAL €0.29 flat. SEPA 0.35% capped at €5. International cards +1.5%, currency conversion +1% (checkoutpage.com, payrequest.io, 2026)
- Payment Links redirect to a Stripe-hosted page. Embedded Checkout and Elements stay on-page but need code
- This is our real price anchor. A technical creator can build a "good enough" on-page button for processing cost alone. Our fee has to buy what they cannot easily build: goals that hide the button when met, suppression, design matching, wallets and local methods pre-wired, zero upkeep

### PayPal donate button

- Redirects, dated, universal. Roughly 3.49% + fixed fee

### Mollie, Payrequest, Tikkie

- EU payment links with strong local methods. No persistent on-site widget with tipping logic. Potential partners more than competitors

## Comparison table

| | Platform fee | Monthly | On-page checkout | Wallets | EU local methods | Goals | Button hides when goal is met | Steps back after giving | Who can use it | Open source |
|---|---|---|---|---|---|---|---|---|---|---|
| QuietJar | 5%, no cap | none | yes | yes | yes | yes, monthly or one-off | yes, by default | yes, in the browser | anyone | yes, AGPL-3.0 |
| Buy Me a Coffee | 5% | none | yes, widget | limited | no | yes, on profile | no | no | anyone | no |
| Ko-fi | 5% tips by default, 0% on Gold | Gold optional | yes, tip panel | no | no | yes, profile and goal bar widget | no | no | anyone | no |
| Liberapay | 0% | none | no | no | no | yes, on profile | no | n/a | anyone | yes |
| Fundraise Up | 4% | none | yes | yes | partial | yes | no | no | nonprofits | no |
| Givebutter | 0% (tips on) / 3% | none | partial | yes | no | yes | no | no | nonprofits | no |
| Donorbox | 1.75% to 3.95% | some plans | yes (forms) | yes | partial | yes | no | no | nonprofits | no |
| GitHub Sponsors | 0% | none | no | no | no | yes, on profile | no | n/a | GitHub users | no |
| Open Collective | 0% + host 4% to 10% | for orgs | no | no | partial | yes | no | no | projects | yes |
| Polar | 5% + $0.50 | optional | yes | yes | yes | no | no | no | developers | yes |
| Stripe direct | 0% | none | if you code it | yes | yes | if you code it | if you code it | no | anyone technical | n/a |

Processing fees apply on top for every row.

## How to write about them

Acknowledge the strength first, then ask the question that exposes the gap. Never trash-talk.

- Ko-fi: "5% on tips by default, free only on a paid Gold plan. Its button asks every visitor, every day. What if it only asked while a real cost was open?"
- Goals, any incumbent: "Goal bars are everywhere. Does your button know when the goal is met?"
- Never write that Ko-fi or Buy Me a Coffee redirect to pay. Both have on-page widgets
- Buy Me a Coffee: "The friendliest brand in the space. Does a coffee cup fit your site?"
- Stripe direct: "You can build this yourself. How many weekends, and who maintains it?"
- GitHub Sponsors: "The right default for maintainers. How many of your users ever open the repo?"

## Verify before publishing

- Ko-fi Gold price and whether Contributor is still on by default
- Whether Buy Me a Coffee's widget now supports Apple Pay
- Whether Ko-fi or Buy Me a Coffee can hide their widget or button when a goal is met, or reset goals monthly. Not found in September 2026; recheck before every compare page change
- Fundraise Up and Donorbox EU payment method coverage
- Polar roadmap for donations or pay-what-you-want
- Any 2026 widget launches from Mollie or Payrequest
