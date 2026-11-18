# Keywords

Search volume lookup for the 60 article ideas and the AI prompt panel.

- `keywords.csv`: one row per keyword with the article number from `../article-ideas.md`, the panel prompts it answers, its role (main or related), whether Google autocomplete suggested it, and empty `google_volume` and `bing_volume` columns.
- `keywords-paste.txt`: the same 211 keywords, one per line, for pasting.

## How to fill in the volumes

1. **Google Keyword Planner:** Tools, Keyword Planner, "Get search volume and forecasts". Paste `keywords-paste.txt`. Set location (for example all countries, or the US, UK, Germany and the Netherlands) and language English. Download the result as CSV.
2. **Bing Webmaster Tools:** Keyword Research works one keyword at a time, so use it for the main keywords only.
3. Drop the export in this folder and ask the AI to merge it into `keywords.csv` and re-rank `../article-ideas.md` on volume plus the panel scores.

`in_autocomplete = yes` only means Google suggested the phrase, so people type it. It says nothing about how often.

## Results, 16 November 2026

Google Keyword Planner, average monthly searches from November 2025 to October 2026, raw export in `keyword-stats-google.csv`. Location: worldwide, all languages in the keyword list are English. Planner folds close variants into one keyword, so four of our keywords have no row of their own and count under their variant. 129 of 211 keywords are below Planner's threshold.

### Where the volume is

| Keyword | Searches a month | Year on year | Fit for us |
| --- | --- | --- | --- |
| paypal donate button | 3,600 | -45% | Medium: how-to, many nonprofits |
| github sponsors | 3,600 | +24% | Low: mostly people navigating to GitHub |
| donation thank you message | 1,900 | -21% | Low: nonprofit fundraising |
| stripe donations | 1,600 | 0% | High |
| patreon fees | 1,300 | -19% | Medium |
| is ko-fi safe | 1,000 | 0% | Medium |
| buy me a coffee alternative | 880 | +22% | High |
| ko-fi vs buy me a coffee | 880 | +120% | High, and growing fastest |
| buy me a coffee vs patreon | 880 | +14% | Medium |
| ko-fi fees | 880 | 0% | High, as part of a fee table |
| donation goal widget | 480 | +418% | Medium: partly streamers |
| ko-fi alternative | 480 | 0% | High |
| buy me a coffee fees | 480 | -19% | High, as part of a fee table |
| is buy me a coffee legit / is ko-fi legit | 390 each | +23% / +50% | Medium |

### What it means

- **Search volume sits on competitor names.** People search for Ko-fi, Buy Me a Coffee, Patreon, PayPal and Stripe, not for "donation widget". The best traffic articles compare, explain fees, or answer trust questions about those brands.
- **Our first batch is mostly long tail.** Astro, Hugo, docs sites, the European alternative and the hosting bill all fall below Planner's threshold. They still matter: they are the prompts where AI answers are empty, and below the threshold is not zero. But they will not bring much Google traffic on their own.
- **Two of the ten have real volume:** the Stripe article (1,820 across its keywords) and Buy Me a Coffee alternatives (940).
- **"ko-fi vs buy me a coffee" is the fastest-growing query** (+120% a year), and "donation goal widget" grew 418%, though partly from streamers.

### Next batch, ranked on volume times fit

Planned, not started. Marked as "Next" in `../article-ideas.md`.

1. #35 What each platform takes from a €5 donation (2,960: Patreon, Ko-fi and Buy Me a Coffee fees)
2. #27 Ko-fi vs Buy Me a Coffee (1,030, growing)
3. #19 PayPal donate button, and when to use something else (3,650)
4. #22 Is Ko-fi safe? Is Buy Me a Coffee legit? (2,040, retitled from "Is it safe for my readers to pay on my website?")
5. #31 Buy Me a Coffee vs Patreon (1,270)
6. #29 The best Ko-fi alternatives (480)
7. #43 FUNDING.yml and the GitHub sponsor button (470)
8. #9 How to add a donate button to your website (270, the hub for all platform guides)

Skip for now despite volume: #42 GitHub Sponsors (navigational) and #54 thank-you messages (nonprofit audience).
