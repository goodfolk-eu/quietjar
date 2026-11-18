---
title: A donate button that disappears when the goal is met
description: Yes, a donate button can hide itself once your goal is covered, then come back when the next cost is due. Here is why that works, and how to set it up.
publishedDate: 2026-11-16
pillar: goals
faq:
  - question: Can a donate button hide itself automatically when the goal is reached?
    answer: Yes. With QuietJar, the button hides by default as soon as the goal is met, with no action from you. GiveWP on WordPress can also close a donation form at its goal. Ko-fi and Buy Me a Coffee have goals on their own pages, but their website buttons do not show goal progress and do not hide when the goal is met.
  - question: When does the button come back?
    answer: With a monthly goal, the button comes back on the first of the next month, when the goal starts again at zero. With a lifetime goal, it stays hidden until you raise the target or pick a new goal.
  - question: Can people still donate after the goal is met?
    answer: Not if the button is hidden, which is the point. If you would rather accept extra support, set the widget to stay visible after the goal, with or without the progress bar.
  - question: Do I lose money by hiding the button?
    answer: You give up some donations that would have come in after the goal. In return, the ask stays rare and specific, which is what makes people act on it. TCG Pocket Collection Tracker raised €97 in 12 hours on a €50 goal, against about €30 a month with an always-on button.
  - question: Does it work on any website?
    answer: It works on any site that lets you paste a script tag, including WordPress, Ghost, Squarespace, Webflow, Astro, Hugo and plain HTML.
---

Yes, a donate button can disappear once your goal is met. You set a goal for a real cost, like this month's hosting, and the button shows how close you are. When supporters cover it, the button hides itself. With a monthly goal, it comes back on the first of the next month.

QuietJar works this way by default. Few other tools do, and the reason is worth a minute of your time.

## Why would you want your donate button to disappear?

A support button that is always there turns into wallpaper. Visitors see it on their first visit, decide "not now", and never look at it again. Nobody feels that their €5 makes a difference to an ask that never changes.

A goal with a finish line works differently. The ask is concrete: this month's server bill, the next release, a new microphone. It only shows up when there is a real cost to cover, so visitors learn that it means something when they see it.

And when the button steps aside, it tells your readers something too. The need was real, and their support covered it.

## What happened when one site tried it

TCG Pocket Collection Tracker is a fan site for a trading card game. Its Buy Me a Coffee button brought in about €30 a month on average.

In September 2026 the site set a €50 goal to cover that month's hosting. It raised €97 in 12 hours. Then the button disappeared until October.

Same site, same audience. The difference was a specific ask with an end.

## How to set it up in QuietJar

It takes a few minutes, and every setting has a sensible default.

### 1. Create a goal

In your dashboard, go to **Goals** and add one. Give it a name (only you see it) and a target in your payout currency.

Then choose how the goal counts:

- **Monthly** starts again on the first of each month. This fits recurring costs like hosting, domains or software.
- **Lifetime** keeps counting until you change it. This fits one-off costs like a new laptop or a conference ticket.

### 2. Attach the goal to your widget

On the **Widget** page, pick the goal. The button becomes a small card with a progress meter that updates as donations come in.

Under **When the goal is reached**, you have three choices:

- **Hide the widget** (the default). The button steps aside until the next month or the next goal.
- **Keep the widget, without the bar.** Supporters can still give, but the goal is no longer shown.
- **Keep the widget, with the bar.** Everything stays visible, including the filled bar.

### 3. Paste the snippet

Copy the snippet from your dashboard and paste it just before the closing `</body>` tag of your site:

```html
<script>
  window.QuietJar = { site: "qj_your_site_id" };
</script>
<script src="https://quietjar.com/js/latest/quietjar.js" async></script>
```

The button loads in a fixed corner layer, so it never pushes your content around. For platform-specific steps, see the [developer page](/developers/).

## It also steps back for people who just gave

Hiding at the goal is one half of being polite. The other half is per visitor.

When someone donates, the widget stays hidden for them for 30 days by default. They get a thank-you, not another ask the next time they visit. If a visitor closes the widget without giving, it stays away for the rest of their visit. You can change both in the widget settings, for example to keep a closed widget away for a week.

Together, these mean your most loyal readers never feel chased. The button shows up when there is a need, and goes quiet when the need is covered or when they have already helped.

## Which tools can hide a donate button at the goal?

Goal bars are everywhere. Very few of them change what the button does when the goal is met. Here is what we found when we checked in November 2026:

| | Goal progress on your own site | Button hides when goal is met | Monthly goals reset by themselves | Works on any website |
| --- | --- | --- | --- | --- |
| QuietJar | Yes, in the button | Yes, by default | Yes | Yes |
| GiveWP | Yes, in the donation form | Closes the form at the goal | Not that we found | WordPress only |
| Ko-fi | No, only on your Ko-fi page | No | No, you start each new goal by hand | Yes, as a button or donation panel |
| Buy Me a Coffee | No, only on your Buy Me a Coffee page | No | Not that we found | Yes, as a button or floating widget |

Ko-fi and Buy Me a Coffee both have goals, but the goal lives on your profile page with them. The button or panel you embed on your own site does not show it, and keeps asking whether the goal is met or not.

They both do a lot well, though. They have large communities, memberships and shops, and both take payments right on your page. If you need those features, they are a good choice.

GiveWP is a solid pick for registered nonprofits on WordPress. Its "close form" option is the closest match we found to a button that steps aside.

If we missed a tool that does this, let us know and we will add it.

## Can you build this yourself?

If you are a developer, yes. You need a payment provider like Stripe, a webhook that records each payment, a running total per goal, a reset on the first of the month, and a script on your site that checks the total before it renders the button. Add caching so the check does not slow your page down.

That is a few weekends of work. The question is who maintains it when the payment provider changes its API, or when a webhook fails silently in the middle of the month.

QuietJar's code is [open source under the AGPL-3.0](https://codefloe.com/Goodfolk.eu/quietjar), so you can read exactly how it handles goals and hiding, or run it yourself. If you do, you also run the payments account, payouts, fraud checks and upkeep.

## When you should keep the button visible

Hiding is the right default for most sites, but not for every one.

Keep the button visible if you rely on donations as income rather than to cover specific costs. A lifetime goal for a large project, like a year of development time, also works better with the bar on display, because people want to see progress over months.

You can switch between these settings at any time, so it is easy to try both and compare the results.

## The short version

A donate button that disappears at the goal asks less often and gets more back. Set a goal for a real cost, let your supporters cover it, and let the button step aside until the next one.

You can [add QuietJar to your site](/) in a few minutes. It costs [5% per donation, minimum €0.50](/pricing/), with card fees included and no monthly fee.
