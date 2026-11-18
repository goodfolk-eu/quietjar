# Content plan for search and AI engines

Goal: when someone asks Google, ChatGPT, Claude or Perplexity how to take donations on their own site, Quietjar shows up in the answer. This plan covers what to write, how we pick topics, how much to publish, and how we measure it.

Quietjar is live. This plan replaces the earlier go-to-market doc, which was written around launch phases.

## Content pillars

Every article maps to one of these. If it does not, we do not publish it.

1. **Goals that end.** Why an always-on button turns into wallpaper and a goal with a finish line gets covered. The TCG Pocket case study first, then one case study per new install with good numbers. Invest here most.
2. **Craft notes.** How it is built and why the details matter, written by whoever built it. The code is open source, so link to the real lines in the repo. Zero layout shift, how stepping back works in the browser (and what Safari does to it), one button for iDEAL, Bancontact and Apple Pay. Marketing that does not look like marketing.
3. **Owning your audience.** Plain guides for creators, maintainers and publishers. Adding a support button to Ghost, WordPress, Astro, Hugo. Tips versus memberships. Setting a monthly goal for your hosting bill. Alternatives and comparisons live here too. This is the main search engine.
4. **Quiet by design.** Rare, short, strongly worded pieces on respecting the people who pay. "Ask once." "The thank-you is the product." "Why we don't surcharge your supporters."

## How search and AI engines differ, and why one plan covers both

Google ranks pages. AI engines pick a few sources and quote them. The overlap is large: ChatGPT search pulls from Bing, Google AI Overviews pull from Google's index, Perplexity and Claude run their own web search. A page that ranks well usually gets cited too.

What AI engines add on top:

- **They quote passages, not pages.** A clear two-sentence answer under a question-shaped heading gets lifted. A clever intro does not.
- **They favor specific facts.** Numbers, fees, dates, named sources. "€97 in 12 hours on a €50 goal" is quotable. "Raise more money" is not.
- **They trust what others say about you.** Reddit threads, GitHub awesome lists, AlternativeTo, dev.to posts and comparison pages on other sites carry as much weight as our own site.
- **They answer comparisons a lot.** "What's a good Ko-fi alternative for a European creator" is a typical prompt. We want to be one of the three names in that answer.

So the plan has three parts: articles on our site, technical groundwork so engines can read them, and presence on the sites that engines already trust.

## How we decide what to write

### Step 1: collect questions

Run this once to build the first backlog, then monthly.

| Source | What to pull |
| --- | --- |
| Keyword tool (Ahrefs or Semrush, one month is enough to start) | Queries around "donation button," "tip jar," "buy me a coffee alternative," "ko-fi alternative," "accept donations on website," "fund open source." Also a keyword gap against buymeacoffee.com and ko-fi.com: what they rank for that we could own. |
| Google autocomplete and "People also ask" | Free. Shows the exact phrasing people use. |
| Reddit, Hacker News, Ghost forum, r/opensource, r/selfhosted, r/webdev | Threads where someone asks how to take donations, complains about fees, or compares tools. These are also the threads AI engines cite. |
| AI prompt panel (see measurement) | Ask ChatGPT, Claude and Perplexity our 30 tracked prompts. Note who gets named and which pages get cited. Every cited page is a page we should beat. |
| Google Search Console (from launch) | Queries where we already get impressions but rank 8 to 30. The cheapest wins. |
| Our own data | Questions from users and support, the Unless agent's unanswered questions, install data, goal results. |

### Step 2: score each topic

Score 1 to 3 on each, multiply. Write the highest scores first.

- **Intent.** 3 = looking for a tool now ("ko-fi alternative"). 2 = solving the problem we solve ("how to pay for hosting for my open source project"). 1 = curious ("what is a tip jar").
- **Fit.** 3 = Quietjar is the honest best answer. 2 = Quietjar is a good option among several. 1 = we can only mention it.
- **Winnability.** 3 = weak or outdated pages rank now, or AI answers are vague. 2 = mixed. 1 = big sites with strong pages own it.

A score of 12 or more goes into the next month. Below 6 we drop it.

### Step 3: assign to a pillar and a cluster

Each article belongs to a cluster with one hub page and several spokes that link to it. Clusters tell search engines and AI engines that we cover a topic in depth, which matters more for a new domain than any single article.

## The clusters

### 1. Alternatives and comparisons (highest intent)

Hub: the existing compare pages. Spokes:

- Buy Me a Coffee alternatives for your own website
- Ko-fi alternative with Apple Pay and iDEAL
- Ko-fi vs Buy Me a Coffee: fees and features compared (neutral, we are not in the headline)
- GitHub Sponsors vs a donation button on your docs site
- Stripe Payment Links vs a donation widget
- PayPal donate button alternatives in Europe
- Liberapay, Open Collective and Polar: which fits your project

Rules: fair and factual, strength first, numbers verified against `competitors.md` and the competitor's own pricing page before publishing, with a "last checked" date. "Best X" lists and alternatives pages are both fine, and AI engines lean heavily on them. Include Quietjar where it honestly fits, and say who each option is best for.

### 2. Platform guides (pillar 3, owning your audience)

Hub: "Add a donation button to your website." One spoke per platform, each a real step-by-step with screenshots and the actual snippet:

WordPress, Ghost, Astro, Hugo, Docusaurus, VitePress, Jekyll, Eleventy, Next.js, Squarespace, Webflow, Framer, Wix, Carrd.

These are the closest we get to programmatic SEO. Each one must be tested on a real install. Thin pages that only swap the platform name hurt the whole site.

### 3. Funding open source and side projects (pillar 1, maintainer wedge)

- How to pay for hosting for an open source project
- How much do donation buttons actually make
- Why nobody clicks your support button
- GitHub Sponsors is not enough: where your users actually are
- How to set a monthly funding goal (and what number to pick)
- FUNDING.yml explained, and what it misses

### 4. Goals and the psychology of giving (pillar 1 and 4)

- Why a goal with a finish line gets funded faster
- The TCG Pocket Collection Tracker case study (long read)
- One case study per early install
- Ask once: why we suppress repeat prompts
- The thank-you is the product
- Why we do not surcharge supporters

### 5. Payments, explained plainly (pillar 2, craft notes)

- Accept iDEAL donations on your website
- Apple Pay and Google Pay on a donate button: how it works
- Zero layout shift: how we load the widget
- What happens in Safari after 7 days
- Donation fees explained: what each platform really takes from €5

Tax and VAT topics wait until we have formal advice. They rank well but the risk of being wrong in print is not worth it.

### 6. Original research (our strongest AI citation asset)

AI engines cite first-hand data that exists nowhere else. One study per quarter:

- How many websites use Buy Me a Coffee and Ko-fi buttons, and on what kind of sites (we already have the HTTP Archive dataset)
- Goal results across Quietjar installs: time to fund, amount per goal against the previous monthly average
- Payment methods by country in our checkout

Each study gets its own page with a short summary up top, a methodology section, and a chart that other people can embed with a link back.

### 7. Definitions (low intent, cheap, good for AI)

Short pages, 400 to 700 words: What is a donation widget, tip jar vs membership, what is a funding goal, one-off vs recurring support. AI engines quote definitions often. Only write these once clusters 1 to 3 have their first spokes.

## How many articles per month

| Period | Volume | Focus |
| --- | --- | --- |
| Month 1 | 15 to 20 | All P1 articles in `article-ideas.md`. The empty-answer topics first. |
| Months 2 and 3 | 10 to 12 per month | Platform guides and comparisons built on the shared fee table. |
| From week 8 | Decide from data | Check Search Console and rerun the AI panel. Scale the clusters that get impressions or citations, stop the ones that do not. |

AI writes, a person reviews. That makes 15 to 20 a month realistic, as long as every article passes the review checklist below. The limit is the review, not the writing.

Why not more. A young domain does not rank faster by publishing more. Google judges quality across the whole site, and its scaled content policy targets sites that publish many low-value pages quickly, whoever writes them. ChatGPT already flags our domain as young. A flood of thin pages makes that worse.

Platform guides are the exception. Each one is a real, tested install, so they can go out in batches once the first one exists.

Refreshing counts. From month 4, about one in four slots goes to updating an existing article: new numbers, new screenshots, a new "last updated" date. AI engines and Google both prefer recent pages, and competitor fees change.

## How each article should look

A template that works for readers, Google and AI engines at the same time:

1. **Title** that matches the query, in sentence case.
2. **Answer first.** The first two or three sentences answer the question completely. Someone who reads only that should have the answer.
3. **Question-shaped H2s** ("How much does Ko-fi take from a €5 donation?"), each followed by a direct one-paragraph answer, then detail.
4. **At least one table or concrete number** with a source.
5. **Something only we can say:** a screenshot from a real install, a number from our data, a test we ran.
6. **A short FAQ** at the end with 3 to 5 real questions from step 1.
7. **Author name and "last updated" date** visible on the page.
8. **Links:** up to the cluster hub, sideways to two related spokes, and one clear link to the developer page or signup.

House style from `references/writing.md` applies to all of it. AI writes the drafts. Nothing goes live without a human review against the checklist below.

## Technical setup

In place:

- **Articles section** at `/en/articles/`. Each article is a Markdown file in `apps/frontend/src/content/articles/en/` with title, description, published and updated dates, pillar, FAQ and a draft flag. Drafts show in dev only.
- **Structured data:** `Article` and `FAQPage` JSON-LD on every article, on top of the site-wide `Organization` and `WebApplication` nodes.
- **Sitemap** with each article's own date, an **RSS feed** at `/en/articles/rss.xml`, and **llms.txt** plus a Markdown copy of every page, generated at build.
- **robots.txt** allows AI crawlers.

Still to do:

- **Google Search Console and Bing Webmaster Tools.** Bing matters more than people think, because ChatGPT search runs on it. Turn on IndexNow so new articles reach Bing within hours.
- **`HowTo` structured data** on platform guides, when the first one ships.

## Off-site presence

AI engines name the tools that other sites name. Spend about a fifth of the content time here:

- **AlternativeTo, Product Hunt listing (not a launch), G2 and Capterra profiles.** These show up in "alternative to Ko-fi" answers.
- **GitHub awesome lists** for open source funding and donation tools. Open a PR once we have installs.
- **Reddit and Hacker News.** Answer real questions where Quietjar is genuinely relevant, as the founder, with disclosure. Never astroturf.
- **dev.to and Hashnode** cross-posts of craft notes, with a canonical link to our site.
- **Case study partners** writing about their own results on their own sites.
- **The "powered by" link** on every install. Tasteful, on by default, and the real long-term channel.
- **Communities, for craft notes:** Hacker News, Lobsters, dev.to, r/opensource, r/webdev, Astro and Hugo Discords, Mastodon dev instances. Post the idea, not an announcement.
- **Integrations and directories:** open source listings (the Codefloe repo, a read-only GitHub mirror for discovery, opensourcealternative.to next to Ko-fi and Buy Me a Coffee), Astro integrations, Hugo modules, the Ghost integrations page, and the WordPress plugin directory once the plugin exists.

## Measurement

Track monthly, in one sheet:

- **Search:** impressions, clicks and average position per cluster from Search Console.
- **AI share of voice:** a fixed panel of 30 prompts (for example "best Ko-fi alternative in Europe," "how do I add a donate button to my Astro site," "how can my open source project pay for hosting"). Run them in ChatGPT, Claude, Perplexity and Google AI Overviews. Record whether Quietjar is named and which of our pages are cited. Tools like Peec, Profound or Otterly automate this once the manual version proves useful.
- **AI referrals:** visits from chatgpt.com, perplexity.ai, claude.ai and gemini.google.com in Umami.
- **Conversions:** signups and installs that started on an article.

Product metrics come first: active installs, time to fund a goal, completion rate on the button, and referrals from "powered by" links. Article pageviews alone do not count as success.

## Workflow per article

AI does steps 1 to 4. The reviewer does step 5. Steps 6 and 7 can be either.

1. **Brief:** target query, intent score, cluster, the question to answer in the first two sentences, what only we can add.
2. **Research:** read the current top results and AI answers for the query. Fetch every competitor number from the competitor's own pricing or help page and record the URL and date.
3. **Test:** run every snippet and step on a real test site (Astro, Hugo, WordPress and so on) before writing about it. Note anything that did not work as expected.
4. **Draft** in house style, following the article template above, with sources inline.
5. **Review** against the checklist below. Send it back rather than fixing large problems by hand.
6. **Publish:** submit through IndexNow, add internal links from two older articles.
7. **Distribute:** one line for social, a reply where the question was asked.

Review after 90 days: refresh, merge or remove.

## Review checklist

Aim for 15 to 30 minutes per article. If it takes longer, the draft is not ready.

- **Answer first.** Do the first two or three sentences answer the question completely?
- **True about us.** Every claim about Quietjar matches the product today. No features that do not exist, no numbers that are not ours.
- **Fair to others.** Competitor facts have a source and a date. Strengths come first. Nothing says Ko-fi or Buy Me a Coffee redirect visitors.
- **Something only we can say.** A tested snippet, a screenshot, a number from our data, or a real example. If the article could have been written by anyone, it does not ship.
- **Tested.** Steps and code were run, not assumed.
- **House style.** Sentence case, no em-dashes, short paragraphs, no banned words, no hype.
- **One clear next step.** A link to the developer page, signup, or the relevant hub.

## Open questions

1. **Keyword tool budget.** One month of Ahrefs or Semrush (about $130 to $140) to build the first backlog, or start from free sources only.
2. **Languages.** English only for now. Dutch and German guides could win quickly on iDEAL and local payment queries with very little competition. Worth it after month 6?
