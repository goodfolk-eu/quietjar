# AI prompt panel, baseline

Run on 16 November 2026. 30 prompts, each asked once in ChatGPT and once in Claude. Raw answers are in `chatgpt/` and `claude/`, the prompts in `prompts.tsv`, and brand counts in `analysis.json`.

## How it was run

- **ChatGPT:** chatgpt.com, logged out, fresh chat per prompt, driven through Orca's browser. Logged-out ChatGPT localizes to the Netherlands, so some answers lean Dutch (Petje.af, Mollie, Donoor). The "sources" it lists are often logo and image hits, so treat them as weak.
- **Claude:** Claude Sonnet through the CLI, with web search and fetch enabled, in an empty folder with no project context. Similar to claude.ai with search on, but not identical.
- One run per prompt. Answers vary between runs, so treat single mentions as signals, not facts. Rerun monthly with the same prompts.

## Headline findings

1. **ChatGPT already knows Quietjar.** Asked "What is Quietjar?", it describes us correctly: embedded donations, two taps with Apple Pay and iDEAL, funding goals, the button disappearing at the goal, 5% fee. It then adds "Is it legitimate?", cites the domain registration date (20 August 2026) and ScamAdviser's caution about the young domain, and calls us early-stage. **Trust signals on and off the site matter now, not later.**
2. **Claude cannot find us.** It suggests blenders and a noise app. Claude's search uses a different index than ChatGPT (which runs on Bing), so being indexed in one does not mean the other.
3. **Nobody owns "a widget that hides at the goal."** Claude assembled a GiveWP setting, an Invision forum post and a XenForo feature request. ChatGPT named Donorbox and Givebutter, then admitted neither hides automatically. Our main feature has no competitor in AI answers.
4. **Quietjar is named in 0 of 29 category prompts** in both engines. Expected for a young site. This is the baseline to beat.
5. **The category answers are built on weak sources.** Comparison and fee answers cite pages.dev sites, Medium posts, schoolmaker.com, and logo download pages. Fee numbers conflict between sources (Ko-fi Gold at $6, $8 or $12). A sourced, dated page will beat these.
6. **The "does it work?" prompts get no sources at all.** "Does a donate button make money?" and "Why does nobody click my donate button?" are answered from memory, with ranges like "0.5 to 2% of visitors." Real numbers, like the TCG Pocket case study, would be quoted.
7. **Engines disagree on Stripe for personal donations.** ChatGPT says yes, Claude says it is a gray area under Stripe's rules. Contradictory answers mean the question is open for whoever writes the clearest answer.
8. **Nonprofit tools dominate website prompts.** For "embeddable donation widget", "progress bar" and "Apple Pay, Google Pay and iDEAL", both engines reach for Donorbox, Givebutter, Zeffy and GiveWP, which target registered charities. Individuals and creators with a website have no good answer.

## Who gets named

Mentions across 30 answers per engine:

| Brand | ChatGPT | Claude |
| --- | --- | --- |
| Stripe | 18 | 20 |
| Ko-fi | 13 | 19 |
| PayPal | 13 | 12 |
| Buy Me a Coffee | 10 | 16 |
| Patreon | 6 | 10 |
| Donorbox | 6 | 7 |
| GitHub Sponsors | 5 | 9 |
| Open Collective | 4 | 8 |
| Ghost | 4 | 4 |
| Mollie | 4 | 1 |
| Liberapay | 3 | 7 |
| Givebutter | 3 | 6 |
| Zeffy | 1 | 5 |
| GiveWP | 1 | 5 |
| Quietjar | 1 (brand prompt only) | 0 |

Smaller players that showed up for specific prompts: PayRequest (Apple Pay, Google Pay and iDEAL, Claude), Donoor and Petje.af (Dutch, ChatGPT), Tipeee and Steady (European alternatives), Polar and thanks.dev (open source).

## Scoring

Each prompt scored 1 to 3 on three things, then multiplied (max 27):

- **Intent:** 3 = looking for a tool now, 2 = solving our problem, 1 = curious or strategic.
- **Fit:** 3 = Quietjar is the honest best answer, 2 = a good option among several, 1 = only a mention.
- **Openness:** 3 = no good answer exists (no product fits, no sources, engines disagree), 2 = mixed, 1 = a strong consistent answer with good sources.

| # | Prompt | Intent | Fit | Open | Score | What the engines said |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | Donation widget that hides itself once the goal is reached? | 3 | 3 | 3 | **27** | No product does it. Forum posts and feature requests. |
| 25 | Which donation button supports Apple Pay, Google Pay and iDEAL? | 3 | 3 | 3 | **27** | Donorbox, Donoor (ChatGPT), PayRequest from its own page only (Claude). |
| 18 | Donation goal with a progress bar on my website? | 3 | 3 | 3 | **27** | ChatGPT wrote DIY HTML. Claude listed nonprofit tools. |
| 10 | Embeddable donation widget for any website? | 3 | 3 | 3 | **27** | Nonprofit tools and obscure form builders. |
| 17 | Best way to accept donations on a documentation site? | 3 | 3 | 3 | **27** | GitHub Sponsors and Ko-fi links. No sources. |
| 09 | Donation button on an Astro or Hugo site? | 3 | 3 | 3 | **27** | "Link to Ko-fi or Stripe." No sources in Claude. |
| 03 | European alternative to Buy Me a Coffee or Patreon? | 3 | 3 | 3 | **27** | Liberapay, Tipeee, Steady, Petje.af. Listicle sources. |
| 01 | Best alternative to Buy Me a Coffee? | 3 | 3 | 2 | **18** | Ko-fi first in both. Thin sources. |
| 04 | PayPal donate button alternatives? | 3 | 3 | 2 | **18** | Nonprofit tools, Stripe, Ko-fi. |
| 06 | How do I add a donate button to my website? | 3 | 3 | 2 | **18** | PayPal, Stripe, Donorbox. |
| 11 | Can I use Stripe for donations on my personal site? | 2 | 3 | 3 | **18** | Engines disagree. |
| 12 | Stripe Payment Links or Ko-fi for small donations? | 3 | 3 | 2 | **18** | Split answer, weak sources. |
| 19 | Cover my monthly hosting bill with donations? | 2 | 3 | 3 | **18** | Platform list, no goal concept. |
| 07 | Donate button on WordPress without PayPal? | 3 | 2 | 2 | **12** | GiveWP, Stripe plugins. |
| 08 | Accept tips on my Ghost blog? | 3 | 2 | 2 | **12** | Ghost's native tips. |
| 15 | Open source project pay for hosting? | 2 | 3 | 2 | **12** | GitHub Sponsors, Open Collective, grants. |
| 26 | Fastest way to donate without an account? | 2 | 3 | 2 | **12** | Stripe Payment Links with wallets. |
| 21 | Does a donate button actually make money? | 1 | 3 | 3 | **9** | Answered from memory. |
| 22 | Why does nobody click my donate button? | 1 | 3 | 3 | **9** | Answered from memory. |
| 23 | Ask readers for support without annoying them? | 1 | 3 | 3 | **9** | Answered from memory. |
| 02 | Ko-fi vs Buy Me a Coffee? | 2 | 2 | 2 | **8** | Ko-fi wins on fees in both. |
| 05 | GitHub Sponsors vs Ko-fi vs Open Collective? | 2 | 2 | 2 | **8** | GitHub Sponsors for most projects. |
| 14 | Lowest fees for small donations? | 2 | 2 | 2 | **8** | Zeffy (nonprofit). |
| 27 | Musician accepting tips on their own site? | 2 | 2 | 2 | **8** | Ko-fi, Bandcamp, PayPal. |
| 28 | Patreon alternative for a writer with a website? | 2 | 2 | 2 | **8** | Ghost, Memberful. |
| 24 | One-time or monthly for a small creator? | 1 | 2 | 3 | **6** | Answered from memory. |
| 16 | Is GitHub Sponsors worth it for a small project? | 1 | 2 | 2 | **4** | Mostly no. |
| 13 | How much does Ko-fi take? | 1 | 1 | 2 | **2** | 0% on tips, conflicting Gold price. |
| 29 | Monetize my blog without ads? | 1 | 1 | 1 | **1** | Crowded, broad. |
| 30 | What is Quietjar? | | | | brand | ChatGPT: accurate, plus a trust warning. Claude: not found. |

## Groups

### A. Empty answer: write these first (score 27)

Prompts 03, 09, 10, 17, 18, 20, 25. No product fits the answer the engines give, sources are thin, and Quietjar is the honest answer. One strong page per prompt is a realistic route into the answer within a few months.

### B. Contested: win with better pages (score 12 to 18)

Prompts 01, 04, 06, 07, 08, 11, 12, 15, 19, 26. Someone is already named, usually Ko-fi, PayPal or Stripe, but the sources are weak or the engines disagree. Fair comparison pages and step-by-step guides with tested code and current numbers can win.

### C. Thought leadership: needs our data (score 6 to 9)

Prompts 21, 22, 23, 24. Low buying intent, but engines have no sources and answer from memory. This is where the TCG Pocket case study and the "goals that end" argument fit. Original numbers get quoted, and these pages also support every page in A and B.

### D. Low priority

Prompts 02, 05, 13, 14, 16, 27, 28, 29. Either Quietjar is not the answer (fees for Ko-fi, Patreon alternatives with memberships) or the space is crowded. Cover some later as supporting pages.

### E. Brand and trust

Prompt 30. Needs work outside articles: an about page with the people behind it, company details and address, a clear "how payouts work" page, and listings on AlternativeTo, Product Hunt, GitHub and Trustpilot so third parties say something about us. Also get indexed in more places than Bing (Claude did not find us).

## Next run

Rerun monthly, same prompts, same setup. Track: is Quietjar named (per engine), which of our pages are cited, and whether the trust warning on prompt 30 goes away.
