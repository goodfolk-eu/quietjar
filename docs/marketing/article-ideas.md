# Article ideas

60 article ideas based on the question bank (`research/questions.md`) and the AI prompt panel (`research/ai-panel/report.md`). Titles are working titles.

**Priority**
- **P1:** the AI answer is empty or weak and Quietjar is the honest answer. Write first. 21 articles, month 1.
- **P2:** solid demand, contested answer. Months 2 and 3.
- **P3:** supporting pages, fill in later.

**Source** points to the panel prompt (`P20`), the question bank topic (`Q5`), or autocomplete (`AC`).

**Persona:** M = maintainer, C = creator, P = publisher.

**Volume:** Google monthly searches worldwide, summed over the article's keywords in `research/keywords.csv` (Keyword Planner, November 2025 to October 2026). 0 means below Planner's threshold, not no interest.

**State:** To do, Next (planned for the next batch, see `research/keywords.md`), Review (written as a draft, waiting for approval), Done (approved and published, `draft: false`).

## Goals that end

The core argument. Every other cluster links back here.

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | How to add a donation goal with a progress bar to your website | Step by step for any site, why a goal tied to a real cost gets funded, and what to show on the bar. Answers the prompt where ChatGPT wrote DIY HTML and Claude listed charity tools. | M, C, P | P18, Q6 | P1 | 500 | Done |
| 2 | A donate button that disappears when the goal is met | What it is, why a button that steps aside gets more support, and how to set one up. No product owns this answer today. | M, C, P | P20 | P1 | 0 | Done |
| 3 | €97 in 12 hours: how a €50 hosting goal beat a year of Buy Me a Coffee | The TCG Pocket Collection Tracker case study as a long read: the setup, the timeline, the numbers against €30 a month before. | M, C | P21, Q5 | P1 | 10 | To do |
| 4 | How to cover your website's hosting bill with a monthly goal | A worked example: add up the real costs, set the goal, explain it in one line, and what happens when it is covered. | M, P | P19, Q6 | P1 | 0 | Done |
| 5 | Why an always-on donate button turns into wallpaper | The essay behind the product. Visitors learn to ignore an ask that never changes; a finish line gives them a reason to act now. | All | Q5, pillar 1 | P1 | 0 | To do |
| 6 | How to set a funding goal people trust | Use real costs, show the math, keep it small enough to finish. Why "$53 in costs, $5,800 goal" makes people suspicious. | M, P | Q6 | P2 | 20 | To do |
| 7 | One-time or monthly support: what works for a small site | Why many visitors will give once but not commit monthly, and how a monthly goal sits between the two. | C, M | P24, Q6 | P2 | 0 | To do |
| 8 | What to do when a funding goal is not reached | Roll it over, keep it open, or explain the shortfall. Honest options and what each says to your visitors. | M, P | Q6 | P3 | 0 | To do |

## Adding a button to your site

The how-to cluster. Each platform guide must be tested on a real install.

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | How to add a donate button to your website | The hub. The four ways to do it (PayPal button, payment link, hosted page, embedded widget), the trade-offs, and step-by-step setup. | All | P06, Q1 | P1 | 270 | Next |
| 10 | The best donation widgets for your website (if you are not a charity) | Most widget lists are written for registered nonprofits. A ranked list for individuals and small projects, judged on wallets, no account, design fit and layout shift. | All | P10 | P1 | 230 | Done |
| 11 | How to add a donation button to an Astro site | Install, configure a goal, and keep zero layout shift. With the actual snippet. | M | P09 | P1 | 0 | Done |
| 12 | How to add a donation button to a Hugo site | Partial or shortcode, goal setup, and testing. With the actual snippet. | M | P09 | P1 | 0 | Done |
| 13 | Add a support button to your docs site: Docusaurus, VitePress, Starlight | Where the ask works on a docs site (not the footer), and setup for the three most common docs frameworks. | M | P17, Q7 | P1 | 0 | Done |
| 14 | How to add a donate button to WordPress without PayPal | The options beyond PayPal and GiveWP, and how to add an embedded widget to posts and pages. | C, P | P07, Q9 | P2 | 60 | To do |
| 15 | Tips on Ghost: native tips or an embedded widget | A fair look at Ghost's built-in tips, where it falls short (pending Stripe payments, one-off supporters shown as free members), and the alternative. | P, C | P08, Q9 | P2 | 0 | To do |
| 16 | How to add a donate button on Squarespace | Code block setup, placement, and testing on mobile. | C | AC | P2 | 80 | To do |
| 17 | How to add a donate button on Wix | Embed setup and what to check in Wix's editor. | C | AC | P2 | 30 | To do |
| 18 | Donate button HTML: a copy-paste snippet for any website | For people who search for the code itself. One snippet, explained line by line. | C, P | AC | P2 | 40 | To do |
| 19 | PayPal donate button: how to set it up, and when to use something else | The full PayPal setup, its limits (personal accounts, no Apple Pay in some places, held funds), and alternatives. | C, P | AC, Q8 | P2 | 3,650 | Next |
| 20 | How to add a donate button on Webflow and Framer | Embed setup for the two design-led builders. | C | AC | P3 | 10 | To do |
| 21 | How to add a donate button to a Next.js or React site | Script loading, avoiding hydration issues, and keeping layout stable. | M | AC | P3 | 0 | To do |
| 22 | Is Ko-fi safe? Is Buy Me a Coffee legit? | What people mean when they ask, what each platform does with payments and personal data, and what visitors see when they pay on your site. Answers "is ko-fi safe" (1,000 a month) and "is buy me a coffee legit" (390). | C, P | Q10 | P2 | 2,040 | Next |

## Alternatives and comparisons

"Best X" lists and alternatives pages are both in scope. Fair, factual, strength first, and say who each option is best for. Every fee checked against the competitor's own page, with a "last checked" date.

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 23 | A European alternative to Buy Me a Coffee and Patreon | What "European" means in practice: where your data lives, which local payment methods work, which country the company is in. An honest look at Liberapay, Tipeee, Steady and Quietjar. | All | P03, Q3 | P1 | 0 | Done |
| 24 | The best Buy Me a Coffee alternatives for your own website | Written for site owners, not profile-page users. A ranked list with who each option is best for. | C, M | P01, Q2 | P1 | 940 | Done |
| 25 | The best PayPal donate button alternatives | Stripe links, hosted platforms and embedded widgets compared on fees, wallets and setup time. | C, P | P04, Q8 | P1 | 10 | To do |
| 26 | Stripe Payment Links vs Ko-fi for small donations | Fees on a €5 gift, setup effort, what the donor sees, and Stripe's rules for personal tips. | M, C | P12, Q2 | P1 | 140 | To do |
| 27 | Ko-fi vs Buy Me a Coffee: fees and features side by side | Neutral comparison with a dated fee table. Quietjar is not in the headline. | C | P02, Q2 | P2 | 1,030 | Next |
| 28 | GitHub Sponsors vs a donate button on your docs site | Where each one works, who can give (GitHub account or not), and why many projects use both. | M | P05, Q7 | P2 | 30 | To do |
| 29 | The best Ko-fi alternatives with Apple Pay and iDEAL | For European creators whose readers pay with local methods. | C | AC, Q3 | P2 | 480 | Next |
| 30 | Liberapay, Open Collective and Polar: which fits your project | Recurring donations, fiscal hosting and paid issues compared. | M | P05, Q7 | P3 | 10 | To do |
| 31 | Patreon or a tip jar on your own site: which suits a writer | Memberships with perks against simple support on your own domain. When each makes sense. | C | P28, Q2 | P3 | 1,270 | Next |
| 32 | Should you offer more than one way to support you? | Choice can lower conversion. When two options help and when they split your audience. | All | Q2 | P3 | 0 | To do |

## Payments, fees and Stripe

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 33 | Donate buttons with Apple Pay, Google Pay and iDEAL | Which tools support all three, how wallets show up on a page, and why it matters for mobile visitors. | All | P25 | P1 | 10 | Done |
| 34 | Can you use Stripe to accept donations on a personal website? | Stripe's rules on tips and donations for individuals, why personal tip links get flagged, and safe ways to do it. The engines currently disagree on this. | M, C | P11, Q8 | P1 | 1,820 | Done |
| 35 | What each platform takes from a €5 donation | A dated table: Ko-fi, Buy Me a Coffee, Patreon, GitHub Sponsors, Open Collective, Liberapay, PayPal, Stripe, Quietjar. Sourced from each pricing page. | All | P13, P14, Q4 | P1 | 2,960 | Next |
| 36 | Why small donations lose so much to fees | The fixed per-transaction fee explained with examples, and what that means for €2 and €5 gifts. | All | Q4 | P2 | 30 | To do |
| 37 | The fastest way for a visitor to donate: no account, two taps | What slows donors down (forms, accounts, redirects to log in) and what a fast checkout looks like. | All | P26, Q10 | P2 | 0 | To do |
| 38 | iDEAL donations on your website, explained | How iDEAL works for the donor, what it costs, and how to offer it. | C, P | Q3 | P2 | 0 | To do |
| 39 | Which donation platforms work in which countries | Supported countries for payouts and for donors, per platform. Updated quarterly. | All | AC, Q3 | P2 | 210 | To do |
| 40 | How Europeans prefer to pay online: iDEAL, Bancontact, SEPA and wallets | Sourced figures per country, and what it means for a support button. | All | Q3 | P3 | 0 | To do |

## Funding open source

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 41 | How to pay for your open source project's hosting | Add up the costs, pick the channel, and set a monthly goal that matches the bill. | M | P15, Q7 | P1 | 0 | To do |
| 42 | GitHub Sponsors: setup, countries, payouts and limits | A practical guide, including the waiting times, payout holds and excluded countries people run into. | M | P16, Q7 | P2 | 3,620 | To do |
| 43 | FUNDING.yml explained, and what it misses | What the sponsor button shows, the four-link limit, the scheme gotcha, and why your docs site needs its own ask. | M | Q7 | P2 | 470 | Next |
| 44 | Your docs site gets more visitors than your repo | Why the ask belongs where your users actually read, with traffic comparisons. | M | Q7 | P2 | 0 | To do |
| 45 | How open source projects get funded in 2026 | Grants, sponsors, donations, paid support. Real numbers and sources for each. | M | Q7, AC | P2 | 230 | To do |
| 46 | Is GitHub Sponsors worth it for a small project? | An honest answer with real numbers from small maintainers. | M | P16 | P3 | 0 | To do |
| 47 | How to split donations across a team of maintainers | Options from one person holding the money to fiscal hosts. | M | Q7 | P3 | 20 | To do |
| 48 | When to start asking for support for your side project | Signals that it is time, and how to word the first ask. | M, C | Q5 | P3 | 0 | To do |

## Does it work, and asking well

Thought leadership. Engines answer these from memory today, so our numbers get quoted.

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 49 | How much does a donate button actually make? | Real numbers: public data points from maintainers and bloggers, plus the TCG Pocket case. What drives the difference. | All | P21, Q5 | P1 | 0 | To do |
| 50 | Why nobody clicks your donate button | The common reasons (invisible, vague, always there, slow checkout) and the fix for each. | All | P22, Q5 | P1 | 0 | To do |
| 51 | How to ask for support without annoying your users | Ask when there is a real need, say what it pays for, stop once covered, thank people. | All | P23, Q5 | P1 | 120 | To do |
| 52 | Ask once: why we stop asking after someone gives | Quiet by design. Why repeat prompts to supporters cost more than they bring in. | All | Pillar 4 | P2 | 0 | To do |
| 53 | How many websites use Buy Me a Coffee and Ko-fi buttons? | Original research from HTTP Archive data: how many sites, what kind, and where on the page. | All | Original data | P2 | 0 | To do |
| 54 | The thank-you is the product | Short essay on what supporters actually get, and why the moment after giving matters. | All | Pillar 4 | P3 | 2,220 | To do |
| 55 | Why we don't surcharge your supporters | Short essay on who should pay for payment-method differences. | All | Pillar 4 | P3 | 0 | To do |

## Craft notes

Written by whoever built it. Developer audience, good for Hacker News and dev.to.

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 56 | Zero layout shift: how we load a payment widget | Reserving space, loading order and measuring it. | M | Pillar 2 | P2 | 0 | To do |
| 57 | What Safari does to "don't ask again" | Storage limits after 7 days without a visit, and how we handle it. | M | Pillar 2 | P3 | 20 | To do |
| 58 | One button for iDEAL, Bancontact and Apple Pay | How the checkout picks the right methods per visitor. | M | Pillar 2 | P3 | 0 | To do |

## Creators

Needs the manual Reddit pass and a creator case study before writing.

| # | Title | Summary | Persona | Source | Priority | Volume | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 59 | How musicians can accept tips on their own website | Tips next to music, shows and merch, without sending fans elsewhere. | C | P27, Q11 | P3 | 110 | To do |
| 60 | Make money from a blog without ads | Reader support that works for small blogs, with honest expectations. | C, P | P29, AC | P3 | 20 | To do |

## Not articles, but needed

The panel showed ChatGPT already describes Quietjar, then warns that the domain is young and cites ScamAdviser. These pages and listings matter before any of the articles above:

- An about page with the people behind Quietjar, company details and address
- A "how payouts work" page
- Listings on AlternativeTo, Product Hunt (listing, not a launch), Trustpilot and GitHub
- Search Console and Bing Webmaster Tools, and checking we are indexed beyond Bing (Claude could not find us)
