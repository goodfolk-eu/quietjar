# Competitors

Fees checked against public sources in the first week of September 2026. They change often. Verify before any number goes on the site. Competitor prices stay in their published currency.

## The map

Two axes: quality of the on-page experience, and who is allowed to use it.

- High on-page quality, nonprofits only: Fundraise Up, Givebutter, Donorbox, Zeffy
- Low on-page quality, open to anyone: Buy Me a Coffee, Ko-fi, Liberapay, PayPal
- High on-page quality, developers only: Polar, Stripe direct
- High on-page quality, open to anyone: empty. That is our quadrant

The threat is not a direct competitor. It is Ko-fi or Buy Me a Coffee shipping a real embed, or Stripe making embedded checkout trivial for non-developers.

## Hosted creator tip platforms

### Buy Me a Coffee

- 5% platform fee on tips, memberships, and shop. No monthly plan. Processing on top
- Creators connect their own Stripe account. PayPal in some regions
- Button and floating widget open a Buy Me a Coffee flow, not the host site's
- Strength: friendly brand, strong casual conversion, huge installed base on blogs and READMEs
- Gap: no local EU methods, redirect flow, the coffee metaphor

### Ko-fi

- Free plan: 0% on one-off donations, 5% on shop and memberships. A "Contributor" status charging 5% on everything is on by default for new accounts (artcurator.org, January 2026)
- Ko-fi Gold removes platform fees. Price reported as $12/month (cartmango.com, August 2026); older sources say $6 or $8. Verify
- Pays out instantly to the creator's own Stripe or PayPal
- Buttons, floating widget, and a WordPress plugin, all handing off to a Ko-fi-hosted flow
- Strength: fee-free tips are one Gold subscription away, and free-plan tips can be too if Contributor status is turned off. Ko-fi self-reports over 1 million creators
- Gap: PayPal-heavy, no wallets or iDEAL, English-only interface, the button is an afterthought

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

Niche. Not relevant to the on-page wedge.

## DIY payment rails

### Stripe direct

- EU domestic cards 1.5% + €0.25. iDEAL €0.29 flat. SEPA 0.35% capped at €5. International cards +1.5%, currency conversion +1% (checkoutpage.com, payrequest.io, 2026)
- Payment Links redirect to a Stripe-hosted page. Embedded Checkout and Elements stay on-page but need code
- This is our real price anchor. A technical creator can build a "good enough" on-page button for processing cost alone. Our fee has to buy what they cannot easily build: suppression, goals, design matching, wallets and local methods pre-wired, zero upkeep

### PayPal donate button

- Redirects, dated, universal. Roughly 3.49% + fixed fee

### Mollie, Payrequest, Tikkie

- EU payment links with strong local methods. No persistent on-site widget with tipping logic. Potential partners more than competitors

## Comparison table

| | Platform fee | Monthly | On-page checkout | Wallets | EU local methods | Steps back after giving | Who can use it |
|---|---|---|---|---|---|---|---|
| QuietJar | 5%, no cap | none | yes | yes | yes | yes, server-side | anyone with a site |
| Buy Me a Coffee | 5% | none | no | limited | no | no | anyone |
| Ko-fi | 5% tips by default, 0% on Gold | Gold optional | no | no | no | no | anyone |
| Liberapay | 0% | none | no | no | no | n/a | anyone |
| Fundraise Up | 4% | none | yes | yes | partial | no | nonprofits |
| Givebutter | 0% (tips on) / 3% | none | partial | yes | no | no | nonprofits |
| Donorbox | 1.75% to 3.95% | some plans | yes (forms) | yes | partial | no | nonprofits |
| GitHub Sponsors | 0% | none | no | no | no | n/a | GitHub users |
| Open Collective | 0% + host 4% to 10% | for orgs | no | no | partial | no | projects |
| Polar | 5% + $0.50 | optional | yes | yes | yes | no | developers |
| Stripe direct | 0% | none | if you code it | yes | yes | no | anyone technical |

Processing fees apply on top for every row.

## How to write about them

Acknowledge the strength first, then ask the question that exposes the gap. Never trash-talk.

- Ko-fi: "5% on tips by default, free only on a paid Gold plan. How many of your visitors finish the payment after the redirect?"
- Buy Me a Coffee: "The friendliest brand in the space. Does a coffee cup fit your site?"
- Stripe direct: "You can build this yourself. How many weekends, and who maintains it?"
- GitHub Sponsors: "The right default for maintainers. How many of your users ever open the repo?"

## Verify before publishing

- Ko-fi Gold price and whether Contributor is still on by default
- Whether Buy Me a Coffee's widget now supports Apple Pay
- Fundraise Up and Donorbox EU payment method coverage
- Polar roadmap for donations or pay-what-you-want
- Any 2026 widget launches from Mollie or Payrequest
