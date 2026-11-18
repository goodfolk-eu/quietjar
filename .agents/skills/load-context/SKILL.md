---
name: load-context
description: Load this at the start of any AI session on this project. It's the shared grounding — what the product is, who it's for, and how we talk about it. Deeper reference files live in context/ and load on demand.
---

## What it is

An embeddable donation widget built around **goals that end**. The owner sets a goal for a real cost (this month's hosting, the next release), the button appears on their own site, supporters cover it, and the button disappears until the next goal. The widget *is* the product, not a marketing surface for a hosted page. A supporter gives in a couple of taps, right on the page.

## The core argument (lead with this everywhere)

A support button that is always there turns into wallpaper. Visitors learn to scroll past it, and nobody feels their euro matters. A goal with a finish line changes that: the ask is concrete, it only shows up when there is a real need, and it goes quiet once the need is covered. People act when they can see the gap closing.

**Proof:** TCG Pocket Collection Tracker (tcgpocketcollectiontracker.com) set a €50 goal to cover its September 2026 hosting. It raised €97 in 12 hours, then the button disappeared until October. The same site's Buy Me a Coffee button averaged €30 a month. Use this case study, with the site named, wherever a number is needed.

## Who it's for

Open source project developers and non-technical website owners who monetise an audience — creators, writers, musicians, and similar. They own their own site and want support to happen *on it*. The product is positioned as **quiet infrastructure**: understated, well-crafted, trustworthy — never a charity metaphor, never coffee-cup / tip-jar cutesiness.

## What makes it different

- **Goals that end.** The main wedge. Monthly or one-off goals with a progress bar. When the goal is met, the button hides by default and comes back when the next period starts. Visitors only see the ask when it is real, so they never get used to ignoring it. Competitors have goal bars, but their button stays up whether the goal is met or not.
- **Checkout that belongs on your site.** Two taps with Apple Pay, Google Pay, cards, iDEAL and Bancontact, and a checkout that never shifts or stalls. Ko-fi and Buy Me a Coffee also take payment on the page, so never claim they redirect. The difference is quality: wallets, local methods, speed and design matching.
- **Polite by design.** Once someone has donated, the widget suppresses repeat prompts for a while (in the visitor's browser via localStorage; Safari clears it after 7 days without a site visit). It thanks supporters instead of nagging them. Together with goals that end, this is one story: quiet when funded, quiet after giving.
- **Open source.** The widget, dashboard and API are public under the AGPL-3.0 at https://codefloe.com/Goodfolk.eu/quietjar. A trust and craft proof, strongest with maintainers. Supporting message, never the lead.
- **Engineered like a real payments SDK.** Fast, part of the site rather than a clunky bolt-on. This craft is the hardest thing for incumbents to copy.

## Pricing

No monthly fee, no plans. A **small percentage of what's actually received** (with a per-transaction cap). It only costs the owner anything when it's earning them something — incentives aligned. Method-based cost differences are borne by the creator, never surcharged onto the supporter.

## Positioning vs. incumbents

Buy Me a Coffee and Ko-fi are hosted profile pages with an on-page widget attached. Their widgets take payment on the page, but with no or limited wallets, no local EU methods, and a button that asks all the time. Both have goals, but a goal there is a bar on the profile, not something that decides when the button shows up. The best donation-widget engineering (Fundraise Up, Givebutter) is locked to US nonprofits. This product joins the two halves that have never been joined: **excellent embed engineering, available to anyone who owns a site.**

## EU dimension (secondary message)

The product is EU-domiciled and built on European rails and hosting (EU payments, EU data, no cookie banner). This is a real structural advantage, but in marketing it's **deliberately deprioritised** — the goals argument leads, the EU story supports. There are open VAT/tax questions (gift vs. taxable supply) that need formal advice before launch.

## Naming

Quietjar.com

## Voice & tone

- **Quiet confidence, not hype.** No exclamation marks, no spectacle.
- **Benefit-led, plain language** for a non-technical audience — say what it does *for them*, not how it works underneath.
- **Short lines, lots of breathing room.** The copy should feel as clean and unfussy as the product.
- **Lead with goals that end.** If anything has to be cut, keep the "ask when it matters, then go quiet" message and the case study.
- **Never say competitors redirect.** Ko-fi and Buy Me a Coffee both have on-page widgets.

These are the product-specific rules. The general house style (rhythm, banned words, formatting, numbers, how to reference competitors) is in `context/writing.md`. Load it for any writing task.

## Status

Live. Content and search are documented in `docs/marketing/content-plan.md` (pillars, clusters, channels) and `docs/marketing/article-ideas.md`. The logo is final and out of scope for any advice.

## Reference files (load on demand)

Read the file that matches the task. Each one assumes you have read this page and does not repeat it.

- `references/competitors.md` — fees, features, and posture of every tool a visitor might compare us to. Load for compare pages, objection handling, pricing copy.
- `references/audience.md` — three personas, the wedge decision, where each group lives online. Load for any page or post aimed at a specific reader.
- `references/positioning.md` — positioning statement, category name, three pillars, persona-specific leads, objections. Load for homepage, developer page, and any pitch.
- `references/writing.md` — house writing style: rhythm, banned words, formatting, numbers, competitive references. Load for every writing task.
- `references/brand.md` — values, personality, vocabulary rules, visual behaviour. Load for copywriting and design review.
- `references/market.md` — TAM, SAM, SOM with sourced anchors and stated assumptions. Internal only, never for the website.
- `references/open-decisions.md` — the unresolved questions that block copy. Check before writing anything with a number in it.
