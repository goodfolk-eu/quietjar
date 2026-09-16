---
name: lighthouse-audit
description: Run a Lighthouse audit against a quietjar page on mobile and desktop, compare against the previous local baseline, and produce a ranked Claude Code fix plan. Use when the user asks to run a Lighthouse audit, check performance/accessibility/SEO scores, or investigate a Lighthouse-related issue such as "investigate and fix lighthouse performance score."
argument-hint: [url-or-page]
---

Run a Lighthouse audit for `$ARGUMENTS` (or the home page if empty), on mobile and desktop, and turn the result into a fix plan.

## 1. Decide the target URL(s)

- Default to the live home page, `https://quietjar.com/`, unless the user names a different page or an issue points at one.
- One URL is normally enough. Quietjar's home page already embeds the full widget demo (`BrowserMock`, mounted via `hero.astro`) and all three site fonts, so it exercises the same critical path as any other marketing page. Only add a second URL if the thing you're investigating (a component, a font, a script) genuinely does not appear on home - state the reason if you do.
- Prefer the live production URL over a local dev server unless the user is testing unreleased changes, in which case run `astro dev` or `astro preview` in `apps/frontend` first and audit that URL instead.

## 2. Environment

This runs fine directly on the developer's machine (macOS, Chrome installed, `npx lighthouse` available) - no sandbox, proxy, or headless-Chromium workaround is needed here. If you ever run this in an environment without Chrome, install `lighthouse` and `chrome-launcher` and get a headless Chromium first, but don't carry over sandbox-specific hacks (proxy flags, missing-library stubs) unless that specific environment actually needs them.

## 3. Run the audit

Make sure the output directory exists (gitignored, persists across sessions so future runs have a baseline to compare against):

```bash
mkdir -p lighthouse-reports
```

Pick a short slug for the page (`home`, `pricing`, `developers`, ...) and today's date (`YYYYMMDD`). Run mobile and desktop:

```bash
SLUG="home"
URL="https://quietjar.com/"
DATE=$(date +%Y%m%d)

npx lighthouse "$URL" \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output=json \
  --output-path="lighthouse-reports/quietjar-${SLUG}-mobile-${DATE}" \
  --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
  --chrome-flags="--headless=new --disable-gpu" --quiet

npx lighthouse "$URL" \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output=json \
  --output-path="lighthouse-reports/quietjar-${SLUG}-desktop-${DATE}" \
  --preset=desktop \
  --chrome-flags="--headless=new --disable-gpu" --quiet
```

## 4. Compare against the baseline

For each form factor, look in `lighthouse-reports/` for the most recent prior JSON for the same slug (excluding the pair you just created). If one exists, that's the baseline; otherwise this run becomes the baseline and you should say so.

Pull scores and core web vitals with `jq`:

```bash
jq -r '.categories | to_entries[] | "\(.key): \((.value.score*100)|round)"' report.json
jq -r '.audits as $a | "FCP: \($a["first-contentful-paint"].displayValue)", "LCP: \($a["largest-contentful-paint"].displayValue)", "TBT: \($a["total-blocking-time"].displayValue)", "CLS: \($a["cumulative-layout-shift"].displayValue)", "SI: \($a["speed-index"].displayValue)"' report.json
```

Flag any category that dropped 3+ points, or a core web vital that got materially worse, versus the baseline. Call out anything that would produce a different conclusion between form factors (e.g. an audit that only fails on mobile or only on desktop).

## 5. Find what's actually failing

List every non-passing, non-manual, non-notApplicable audit:

```bash
jq -r '.audits | to_entries[] | select(.value.score != null and .value.score < 1 and .value.scoreDisplayMode != "notApplicable" and .value.scoreDisplayMode != "manual") | "\(.key) | score=\(.value.score) | \(.value.title)"' report.json
```

For each one that matters, pull the concrete failing element(s) so the fix plan can point at real code, not a generic audit name:

```bash
jq -r '.audits["<audit-id>"].details.items[] | "\(.node.selector) | \(.node.snippet)"' report.json
```

Then find where that markup actually lives in the repo (`apps/frontend/src`) - grep for the class names or text in the snippet/nodeLabel to locate the exact `.astro` file and line.

## 6. Report to the user

Sander (the user) prefers: bullet points, ranked by priority, American English, no emojis, no corporate jargon, no em-dashes (use a regular dash).

Include:
- A scores table (Performance, Accessibility, Best practices, SEO) per form factor, plus FCP/LCP/TBT/CLS/Speed Index.
- Baseline comparison and any flagged drops (or "no prior baseline, this run is the new baseline").
- The failing audits, in plain language, with the file/line where the fix belongs.
- If the audit is being run because of a specific issue (e.g. "issue says mobile was ~85 but this run scores 100"), call out the discrepancy explicitly rather than silently reporting only the new number - suggest checking PageSpeed Insights field data if a lab run doesn't reproduce a field complaint.

## 7. Write the fix plan

Write `lighthouse-reports/lighthouse-fix-plan-YYYYMMDD.md`, meant to be pasted into Claude Code at the repo root. For each issue, ordered by impact (things that cost score points first, informational "insight" audits after):
- What to change.
- Where to look (exact file and line).
- Whether the fix could behave differently on another page (the standard trap here is fonts: a font can be dead weight on one page but load-bearing above the fold on another - check `apps/frontend/src/pages/**` for other uses before assuming a font is safe to defer or drop, and require verification on any other page that uses it).
- An acceptance criterion.

End the plan with a verify step: re-run this same audit (mobile and desktop, same URL) and confirm the fixed categories reach 100 (or the expected score) with no new regressions.

## 8. Don't commit or publish anything

Present the HTML reports, the fix-plan markdown, and a short summary to the user. Do not commit the `lighthouse-reports/` output, open a PR, or publish anything unless the user explicitly asks. Implementing the fixes themselves is a separate step - ask before making code changes.
