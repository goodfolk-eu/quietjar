# Article brief for AI writers

Read this before drafting any article. It holds the product facts, the rules and the format. The content plan (`content-plan.md`) explains why; this file explains how.

Reference article, already reviewed: `apps/frontend/src/content/articles/en/donate-button-that-disappears-when-goal-is-met.md`. Match its tone, structure and front matter.

## Before you write

1. **Read the house style:** `.agents/skills/load-context/references/writing.md` and `.agents/skills/load-context/SKILL.md`. For comparisons also `references/competitors.md`.
2. **Read what people ask:** `docs/marketing/research/questions.md`, and for your prompt the AI answers in `docs/marketing/research/ai-panel/chatgpt/<nn>.md` and `claude/<nn>.md`. Your article must give a better, more specific answer than both.
3. **Verify every competitor fact on the competitor's own site** (pricing page, help center, docs) with WebFetch or WebSearch. Note the URL. If you cannot confirm something, leave it out or write "not that we found". Never rely on third-party listicles for numbers.
4. **Test what you can.** If the article contains setup steps for a framework, build a throwaway site in `/tmp` and check the snippet ends up in the built HTML. If you cannot test something (for example the tool is not installed), say so in your report, and do not install software on this machine.

## Product facts (checked against the code, November 2026)

Only claim what is on this list. If you need a fact that is not here, check the code under `apps/` and the copy in `apps/frontend/src/i18n/en/`, or leave it out.

**What it is.** QuietJar is a small donation widget for your own website. You set a goal for a real cost, the button shows progress, supporters pay right on your page, and the button steps aside once the goal is met.

**Setup.** Sign up with your email (a one-time code, no password). Add your site and payout details: country, currency, site address, then personal details, a bank account and a short identity check. Paste the snippet just before `</body>`:

```html
<script>
  window.QuietJar = { site: "qj_your_site_id" };
</script>
<script src="https://quietjar.com/js/latest/quietjar.js" async></script>
```

Works on any site that lets you paste HTML. The developer page says Astro, Hugo, Docusaurus and VitePress work the same way: the snippet goes in the layout or the page. Payments are only accepted from the site address you registered and your hosted page.

**No website?** Every account gets a hosted page at `quietjar.com/@yourname` that you can share instead.

**Goals.** Create goals in the dashboard (up to 20). Each has a target in your payout currency and is either **monthly** (starts again on the first of each month) or **lifetime** (keeps counting). Attach one goal to the widget; the button becomes a card with a progress meter that updates as donations come in. Setting: `goal` (a goal id).

**When the goal is reached** (`goalReached`): `hide` (default, the widget stops rendering), `show` (keeps taking donations, no bar), `show-with-bar` (keeps the filled bar).

**Polite by design.** After a completed donation the widget stays hidden for that visitor for 30 days by default (`donation.hideDays`), and shows a thank-you instead of asking again. This lives in the visitor's browser (localStorage), nothing on our servers. Safari clears it after 7 days without a visit. Closing the widget hides it for the rest of the session by default (`close.after`: `session`, `days`, `never`, `forever`; `close.days` defaults to 7).

**Payment methods.** Apple Pay (iPhone, iPad, Mac), Google Pay (Chrome, Android), cards (Visa, Mastercard, Amex, Cartes Bancaires), Link (Stripe's wallet), iDEAL, and where available Bancontact, EPS, Revolut Pay, BLIK, Satispay, Pay by Bank. Local methods need a short request in the dashboard and a review; cards work in the meantime. iDEAL asks sole proprietors for a tax identification number. Local methods are not available for accounts in every country. Apple Pay and Google Pay only appear on devices that support them.

**Payments infrastructure.** Built on Stripe. QuietJar opens the payment account for you during setup; you do not need your own Stripe integration.

**Performance.** Script 38.6 kB (11.7 kB gzipped). Around 40 ms to load on a cold cache. Floats in a fixed corner layer, so zero layout shift. Stripe's payment code only loads when someone opens the checkout. No tracking, no cookies, no cookie banner needed.

**Customization.** Position (six corners: bottom or top, left, center or right), accent color, font (system, serif, rounded, mono), icon, headline, body, button label, preset amounts (up to 4), currency, custom CSS. `mount.target` places the widget inline inside an element instead of floating. `window.QuietJar.open()` opens the checkout from your own button or link.

**For READMEs and newsletters.** A dynamic image that shows the widget with live goal progress and links into the donation panel, for places where scripts cannot run.

**Amounts.** In EUR, donations from €1 to €500. Many currencies are supported; amounts and presets follow the currency.

**Pricing.** 5% per donation, minimum €0.50. QuietJar pays the card and payment fees, so what you receive does not depend on how the supporter paid. No monthly fee, no plans. Supporters are never surcharged. Link to `/pricing/`.

**Payouts.** You pay out from the dashboard once your balance reaches €50 (or the local equivalent).

**Company.** QuietJar is made by Goodfolk B.V. in Amsterdam. EU-based.

**Open source.** The widget, dashboard and API are public under the AGPL-3.0 at https://codefloe.com/Goodfolk.eu/quietjar. Use it as proof of trust and craft ("read every line that runs on your page"), strongest with developers and maintainers. One line where it fits, never the lead, and never imply the hosted service is free. If self-hosting comes up: you can run it yourself under the AGPL-3.0, but then you also run the payments account, payouts, fraud checks, tax and upkeep; the 5% covers all of that.

**Case study (the only numbers we have).** TCG Pocket Collection Tracker (tcgpocketcollectiontracker.com) set a €50 goal for its September 2026 hosting. It raised €97 in 12 hours, then the button disappeared until October. The same site's Buy Me a Coffee button averaged about €30 a month. Do not add details beyond this.

## Claims you must not make

- That Ko-fi or Buy Me a Coffee redirect visitors to pay. Both take payment on the page.
- That Ko-fi's or Buy Me a Coffee's website button or widget shows goal progress. It does not; their goals live on their profile pages. Do not mention a Ko-fi goal bar embed.
- That QuietJar has a WordPress plugin, Ghost integration, Zapier integration, memberships, a shop, or analytics. It has none of these.
- Any conversion rate, traffic number or revenue figure that is not sourced.
- Anything about VAT or tax treatment of donations. We have no formal advice yet.

## Structure

1. **Title** in sentence case, matching how people search.
2. **Answer first.** The first two or three sentences answer the question completely.
3. **Question-shaped H2s** with a direct one-paragraph answer under each, then detail. H3s for steps.
4. **At least one table or concrete number with a source.** For competitor facts, a "checked in November 2026" note.
5. **Something only we can say:** a tested snippet, a real setting, the case study, a fair comparison.
6. **Fair to competitors:** strength first, then the gap, phrased as a question where it fits. Say who each option is best for, including when QuietJar is not the right choice.
7. **Internal links** (locale-neutral, they get `/en` added automatically): `/features/`, `/pricing/`, `/developers/`, `/compare/ko-fi/`, `/compare/buymeacoffee/`, `/articles/donate-button-that-disappears-when-goal-is-met/`, and the other articles in this batch by slug. End with one clear next step.
8. **Length:** as long as the answer needs. Most land between 900 and 1,600 words. Do not pad.
9. **No FAQ section in the body.** The FAQ goes in front matter (3 to 5 real questions from the research) and the layout renders it.

## Style rules that get missed

- Sentence case for every heading. No em-dashes anywhere, not even in tables. No exclamation marks.
- Paragraphs of two or three sentences. Active voice. Plain words for a European reader whose first language is not English.
- Euros for our figures; competitor prices in their own published currency.
- Banned: delve, tapestry, testament, moreover, leverage, seamless, robust, game-changer, unlock, elevate, "in today's", "it's worth noting".
- Write "QuietJar" (capital J) in article text.

## Front matter

```yaml
---
title: Sentence case title
description: One or two sentences, under 160 characters, that answer the question.
publishedDate: 2026-11-16
pillar: goals | craft | audience | quiet
draft: true
faq:
  - question: ...
    answer: ...
---
```

New articles start as `draft: true`. The reviewer flips them to `false`.

## Your report back

List: the file you wrote, every competitor fact with the URL you verified it on, what you tested and how, anything you could not verify or test, and any product question you could not answer from this brief or the code.
