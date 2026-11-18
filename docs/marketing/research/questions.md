# Question bank

What people search for and ask about taking donations on their own site. Collected in November 2026 for the content plan in `../content-plan.md`. This is step 1 of that plan. Scoring is the next step.

## Sources

| Source | What we got | File |
| --- | --- | --- |
| Google autocomplete, US and NL | 3,752 suggestions from 30 seed terms, filtered to 1,442 on-topic | `autocomplete-raw.csv`, `autocomplete-relevant.csv` |
| Hacker News, 2021 to now | 277 threads on donations and funding, top comments read for 11 | `hn-threads.csv` |
| Forums and discussions | About 45 sources: Ask HN, GitHub community discussions, Ghost forum, WordPress support, Trustpilot, Ko-fi help, Reddit post titles | Linked below |

**Gaps.** Autocomplete shows phrasing, not search volume. Reddit blocks scripts, so we only have post titles and no comment threads. The creator side (writers, musicians, artists, podcasters) is thinner than the maintainer side. We found almost no first-person demand for iDEAL or Bancontact; the closest is Europeans asking for SEPA instead of PayPal.

To close the gaps: read r/artbusiness, r/writing, r/podcasting and r/WeAreTheMusicMakers by hand; get volumes from a keyword tool; run the AI prompt panel at the bottom.

Signal: **high** means many autocomplete variants plus repeated forum threads. **Medium** means one of the two. **Low** means a few mentions.

## 1. Adding a donate button to a website

Signal: **high**. Persona: creator, publisher.

How people phrase it:

- how to add donate button to website / to wordpress / on wix / to squarespace / to shopify
- can i put a donate button on my website
- best way to accept donations on website
- donate button html, donation form html
- linktree donation button
- "I want to add a donation button to my website, not a PayPal one" ([source](https://www.inmotionhosting.com/support/questions/communities/1/topics/15909-i-want-to-add-a-give-donation-button-to-my-website-not-a-paypal-give))

Most autocomplete results here route through PayPal: "how to add paypal donate button to website", "paypal donate button wordpress", "paypal donate button not working", "paypal donate button personal account".

Article ideas:

- How to add a donate button to your website (hub)
- One guide per platform: WordPress, Wix, Squarespace, Ghost, Shopify, Webflow, Framer, Carrd, Astro, Hugo, Docusaurus
- PayPal donate button: how to set it up, and what to use instead

## 2. Alternatives and comparisons

Signal: **high**. Persona: all.

How people phrase it:

- buy me a coffee alternative / ko-fi alternatives / patreon alternative / github sponsors alternative / liberapay alternative / open collective alternative
- buy me a coffee vs ko-fi (plus "reddit"), ko-fi vs patreon, buy me a coffee vs patreon vs ko-fi, buy me a coffee vs paypal / substack / gumroad
- github sponsors vs ko-fi / vs patreon / vs buy me a coffee, open collective vs github sponsors, ko-fi vs liberapay
- "Stripe Payment Link vs Ko-fi for small donations" ([source](https://reddit.com/r/stripe/comments/1fczn4f/stripe_payment_link_vs_kofi_for_small_donations/))
- "What's the best donation/tip jar for a blog?" ([source](https://news.ycombinator.com/item?id=22080502))
- "Are there any gotchas about each service?" ([source](https://news.ycombinator.com/item?id=24532494))
- "Should I use multiple options?" against "two support links force your audience to choose" ([source](https://news.ycombinator.com/item?id=22080502))
- "Does Substack have Ko-fi features like embeddable donate buttons?" ([source](https://reddit.com/r/Substack/comments/1wlizua/does_substack_have_kofi_features_like_embeddable/))

Article ideas:

- Buy Me a Coffee alternatives for your own website
- Ko-fi vs Buy Me a Coffee vs Patreon, fees and features side by side (neutral)
- GitHub Sponsors vs a donate button on your docs site
- Stripe Payment Links vs a donation widget
- Should you offer more than one support option?

## 3. The European angle

Signal: **medium**, stronger than expected. Persona: all.

How people phrase it:

- buy me a coffee european alternative, buy me a coffee deutsche alternative, buy me a coffee alternative uk
- patreon eu alternative, patreon european alternative, patreon alternative deutschland, patreon alternatives europe
- buy me a coffee supported countries, github sponsors supported countries, liberapay supported countries
- "BuyMeACoffee silently dropped support for many countries" (318 comments) ([source](https://news.ycombinator.com/item?id=44002333))
- Europeans asking for SEPA instead of PayPal ([source](https://news.ycombinator.com/item?id=47714700))

Article ideas:

- A European alternative to Buy Me a Coffee and Patreon
- Which donation platforms work in which countries
- Taking donations in Europe: iDEAL, Bancontact, SEPA and wallets explained

## 4. Fees and what you actually receive

Signal: **high**. Persona: all.

How people phrase it:

- how much does ko-fi take, ko-fi fees paypal, does buy me a coffee charge, buy me a coffee fees calculator, does github sponsors take a cut, open collective fees, liberapay fees, stripe donation fees, paypal donate button fees
- donation site with no fees, donation website without fees
- "Why are my transaction fees via PayPal so much higher than the purported 3-5%?" ([source](https://reddit.com/r/Kofi/comments/1g8noh7/new_on_kofi_confused_about_high_transaction_fees/))
- "Does Ko-fi charge 0% or 5%?" ([source](https://news.ycombinator.com/item?id=42511816))
- "Is Buy Me a Coffee 5% including Stripe or on top?" ([source](https://news.ycombinator.com/item?id=19488180))
- "For $1, a collective got ~$0.56" (Open Collective) ([source](https://news.ycombinator.com/item?id=26579903))
- Fixed fees eat small recurring gifts: "$2 per month... they would end up with $19.7 per year" ([source](https://news.ycombinator.com/item?id=25797190))
- "How many percent should I add to my price so I receive what I wish for?" ([source](https://reddit.com/r/Kofi/comments/1tgoiy3/how_do_i_set_up_prices/))

Article ideas:

- What each platform really takes from a €5 donation (table, last-checked date)
- Why small donations lose so much to fees
- "Free" donation platforms: who pays the fees

This is the topic AI engines most often answer with stale numbers. A current, sourced table is a strong citation target.

## 5. Does anyone actually donate?

Signal: **high** in discussions, low in autocomplete. Persona: maintainer, publisher. This is our pillar 1.

How people phrase it:

- "What is the chance of getting a donation through GitHub Sponsors?" ([source](https://news.ycombinator.com/item?id=45073573))
- "Is asking for donations a viable business model?" ([source](https://news.ycombinator.com/item?id=31481974))
- "Donation button: how much to expect? How does it compare with ads?" ([source](https://news.ycombinator.com/item?id=18967014))
- "Has GitHub Sponsors actually worked for anyone with a small app? 41 stars, exactly zero sponsors" ([source](https://reddit.com/r/indiebiz/comments/1vwc8r5/has_github_sponsors_actually_worked_for_anyone/))
- "1/4206 conversion rate on Buy Me a Coffee" ([source](https://www.indiehackers.com/post/1-4206-conversion-rate-on-buy-me-a-coffee-1ed21a2288))
- "About 30€ per 100 000 visitors" ([source](https://news.ycombinator.com/item?id=25552578))
- "Nobody will click that small donate button" unless you say what the money pays for ([source](https://news.ycombinator.com/item?id=4495129))
- "Why a 'Buy Me a Coffee' prompt yielded $0 and churned our power users" ([source](https://news.ycombinator.com/item?id=47587315))
- "Donation fatigue even is more real than subscription fatigue" ([source](https://news.ycombinator.com/item?id=41470591))
- When should I start asking? ([source](https://reddit.com/r/WeTrakr/comments/1wy80xj/wetrakr_now_accepts_donations_on_kofi/))

Article ideas:

- How much does a donate button actually make? (with the TCG Pocket numbers)
- Why nobody clicks your donate button
- When to start asking for support
- How to ask without annoying your users

## 6. Goals and paying for hosting

Signal: **medium**. Persona: maintainer, publisher. Core to pillar 1.

How people phrase it:

- donation goal widget, donation goal website, custom donation goal widget, fundraising thermometer widget, donation progress bar, kofi donation goal widget, kofi monthly goal (most results are streamer tools, the website version is open)
- "Running an open source app: usage, costs and community donations" (148 comments) ([source](https://news.ycombinator.com/item?id=41879845))
- "Invite donations to specifically cover hosting costs... and you'd very quickly get a surplus" ([source](https://news.ycombinator.com/item?id=45903589))
- Distrust of goals that look too big: "$53.53/month in costs, but we need $5,800/month" ([source](https://news.ycombinator.com/item?id=44922972))
- "What happens when the funding doesn't reach the amount? Does it stay open?" ([source](https://news.ycombinator.com/item?id=15749839))
- One-off vs recurring: "unwilling to make an upfront ongoing commitment" ([source](https://news.ycombinator.com/item?id=44087191))

Article ideas:

- How to add a donation goal with a progress bar to your website
- How to cover your hosting bill with a monthly goal
- How to set a funding goal people trust (and what number to pick)
- One-off or monthly support: which to ask for

## 7. Funding open source

Signal: **high**. Persona: maintainer.

How people phrase it:

- how are open source projects funded, how do open source projects get funding, funding for open source projects, open source grants, eu open source funding
- github sponsors: how to enable, how to get sponsors, requirements, supported countries, button not showing, payout, tax
- "Any programmers making a living off of GitHub Sponsors?" ([source](https://news.ycombinator.com/item?id=27083129))
- "GitHub Sponsors application pending for almost 3 weeks" ([source](https://github.com/orgs/community/discussions/213205)), "payouts held for 5 months" ([source](https://github.com/orgs/community/discussions/212834))
- FUNDING.yml limits: custom URLs need a scheme, maximum four ([source](https://github.com/orgs/community/discussions/213189))
- "How to distribute sponsorship money to contributors?" ([source](https://github.com/orgs/community/discussions/211810))

Article ideas:

- How open source projects get funded in 2026 (grants, sponsors, donations, with real numbers)
- GitHub Sponsors: setup, countries, payouts, and its limits
- FUNDING.yml explained, and adding a button to your docs site
- Your docs site gets more visitors than your repo

## 8. Stripe and PayPal for donations

Signal: **high**. Persona: maintainer, creator.

How people phrase it:

- can i use stripe for donations, stripe donation button / link / embed / page / wordpress, stripe recurring donations, stripe monthly donation
- can i accept donations with a personal paypal account, paypal me vs donate button
- "Is Stripe the new PayPal, cancelling accounts without explanation?" ([source](https://news.ycombinator.com/item?id=40513782))
- "Why does Ko-fi connect to Stripe when Stripe doesn't allow crowdfunding?" ([source](https://news.ycombinator.com/item?id=41465944))
- Stripe threatened to close an account over a donation link on a Ghost site ([source](https://forum.ghost.org/t/buy-me-a-coffee-or-donate-model/11171))
- PayPal holds Ko-fi tips for up to 21 days ([source](https://help.ko-fi.com/hc/en-us/articles/4417462197521-Why-are-my-PayPal-funds-on-hold))
- "Placed a PayPal donate button which didn't work even once" at 40k visitors a month ([source](https://news.ycombinator.com/item?id=13912865))

Article ideas:

- Can you use Stripe to accept donations? (and why a personal tip link gets flagged)
- PayPal donate button vs a donation widget
- Should you build your own donate button with Stripe?

## 9. Platform-specific pain

Signal: **medium**. Persona: publisher, creator.

- Ghost: one-time supporters show up as free members; one Stripe account for memberships and tips "could be a problem"; native tips create cancelled Stripe payments on every page view ([source](https://forum.ghost.org/t/tips-and-donations/50315), [source](https://forum.ghost.org/t/using-stripe-integration-for-subscriptions-memberships-and-tip-jar-etc/45322))
- WordPress: Apple Pay and Google Pay not showing on donation forms, often behind premium add-ons ([source](https://wordpress.org/support/topic/apple-pay-google-pay-not-showing-up/)); the BMC plugin breaks on updates ([source](https://wphive.com/plugins/buymeacoffee))
- how to monetize ghost blog, how to monetize wix blog, how to monetize a blog without ads

Article ideas:

- Tips on Ghost without the workarounds
- Apple Pay and Google Pay on a WordPress donate button
- How to monetize a blog without ads

## 10. Trust, safety and privacy

Signal: **medium**. Persona: creator.

- is buy me a coffee legit / safe, is ko-fi legit / safe, buy me a coffee trustpilot, open collective shutting down
- Ko-fi receipts expose the creator's name and email ([source](https://reddit.com/r/ContentCreators/comments/1lmcbzr/alternatives_to_kofi_that_keep_your_name_and/))
- Account suspensions and held payouts on Buy Me a Coffee ([source](https://uk.trustpilot.com/review/buymeacoffee.com?page=7))
- Donor friction: "I don't want to fill out your stupid long form, create a password... If a platform takes Apple Pay, the friction is even less" ([source](https://news.ycombinator.com/item?id=39934087))

Article ideas:

- Is it safe for my readers to pay on my site?
- What your supporters see: privacy on donation platforms
- The shortest path from "I want to support this" to done

## 11. Creators by type

Signal: **medium** in autocomplete, thin in forums.

- tip jar for musicians, tip jar app for musicians, best tip jar for musicians
- patreon alternative for writers / artists / musicians / authors
- best donation platforms for creators, donation sites for content creators

Article ideas: one guide per creator type, written once we have a creator case study. Needs the manual Reddit pass first.

## 12. Tax and legal (hold)

Signal: **medium**. Recorded, not to be answered until we have formal advice.

- buy me a coffee taxes, buy me a coffee vat, github sponsors tax, github sponsors steuern, open collective tax
- "Are those people paying users or is it like tips?" ([source](https://news.ycombinator.com/item?id=33601353))
- "Donate has a very specific meaning" (donation vs tip wording) ([source](https://news.ycombinator.com/item?id=3318170))

## AI prompt panel

Run these monthly in ChatGPT, Claude, Perplexity and Google AI Overviews. Record which tools get named and which pages get cited. Use a fresh, logged-out session where possible.

1. What's the best alternative to Buy Me a Coffee?
2. Ko-fi vs Buy Me a Coffee, which is better?
3. Is there a European alternative to Buy Me a Coffee or Patreon?
4. How do I add a donate button to my website?
5. How do I add a donate button to my WordPress site without PayPal?
6. How do I accept tips on my Ghost blog?
7. How do I add a donation button to my Astro or Hugo site?
8. Can I use Stripe to accept donations on my website?
9. How much does Ko-fi take from a donation?
10. Which donation platform has the lowest fees?
11. How can my open source project pay for its hosting costs?
12. Is GitHub Sponsors worth it for a small project?
13. How do open source projects get funded?
14. Best way to accept donations on a docs site?
15. How do I show a donation goal with a progress bar on my website?
16. Does a donate button on a website actually make money?
17. Why does nobody click my donate button?
18. How do I ask my readers for support without annoying them?
19. Donation button that supports Apple Pay and iDEAL?
20. How can a musician accept tips on their own website?
21. Best Patreon alternative for writers with their own site?
22. How do I monetize my blog without ads?
23. One-time donations or monthly memberships, which works better?
24. Embeddable donation widget for any website?
25. Stripe Payment Links vs Ko-fi for donations?
26. PayPal donate button alternatives?
27. Is Buy Me a Coffee safe and legit?
28. What is Quietjar?
29. Quietjar vs Ko-fi?
30. How do I fund a website with a monthly goal?

Prompts 28 and 29 check how engines describe us. Until launch they will likely return nothing or the wrong thing, which is the baseline.
