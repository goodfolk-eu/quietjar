---
title: How to cover your website's hosting bill with a monthly goal
description: Add up what your site really costs each month, set a goal for that amount, and say what it pays for. Here is a worked example with real settings.
publishedDate: 2026-11-16
pillar: goals
draft: false
faq:
  - question: How do I cover my website's monthly hosting bill with donations?
    answer: Add up what the site costs each month, set a monthly goal for that amount plus a little for fees, and put it on a donate button with one line that says what it pays for. Once the goal is covered, let the button step aside until next month.
  - question: What happens if the goal is not reached by the end of the month?
    answer: With a QuietJar monthly goal, the button stays up for the whole month, and the count starts again at zero on the first. The donations that did come in are yours either way.
  - question: What if people give more than the goal?
    answer: With the default setting, the button hides once the goal is met, so the overshoot stays small. If it happens anyway, say on your site what the extra pays for, like next month's bill or a domain renewal.
  - question: How big should my hosting goal be?
    answer: Close to the real cost. People trust a goal that matches the bill they can picture. A goal far above your stated costs makes them wonder where the rest goes.
  - question: Should I ask for monthly or one-off support?
    answer: Many people do not want an ongoing commitment. A monthly goal lets them give once when they see the ask, while the goal itself comes back every month with the bill.
---

To cover your hosting bill with donations, add up what the site really costs each month, set a monthly goal for that amount, and say in one line what it pays for. Supporters fill the bar. Once the bill is covered, the button steps aside, and it comes back on the first of the next month when the next bill is due.

Below is a worked example, from the cost sheet to the settings, so you can copy it for your own site.

## Step 1: what does your site really cost each month?

Start with the bills, not with a number that sounds nice. Open your hosting account, your domain registrar and every service your site depends on, and write down what each one costs.

Turn yearly costs into monthly ones by dividing by 12. Here is an example for a small site. The numbers are made up to show the method, so use your own:

| Cost (example) | Billed | Per month |
| --- | --- | --- |
| Virtual server | €9.00 a month | €9.00 |
| Database backups | €3.00 a month | €3.00 |
| Domain name | €18.00 a year | €1.50 |
| Email sending service | €4.00 a month | €4.00 |
| **Total** | | **€17.50** |

Leave out things you would pay for anyway, like your own laptop. A goal works best when every euro in it maps to a bill your readers can picture.

## Step 2: add a little for fees

The goal counts what your supporters gave, before fees. So if your goal equals the bill exactly, you end up a little short.

QuietJar takes 5% per donation, with a minimum of €0.50, and it pays the card and payment fees itself. For any donation up to €10, the minimum applies. If most of your supporters give €5, you keep €4.50 of each one, about 90%.

In the example, €17.50 divided by 0.9 is €19.44. Round it to €20, and that is your goal. See [pricing](/pricing/) for what you keep on other amounts.

## Step 3: why should the goal stay close to the bill?

Because people check. A goal that matches a bill they can picture feels honest, and one that does not makes them suspicious.

Here is how that looks from the outside. On Hacker News, a commenter pointed at an open source project that [listed $53.53 a month in costs but asked for $5,800 a month](https://news.ycombinator.com/item?id=44922972) in recurring donations. The bigger number had a reason, full-time development, but readers saw the gap first.

If you also want to be paid for your time, that is fair. Make it a separate goal with its own name, rather than hiding it inside "hosting". A €20 hosting goal that gets covered every month builds more trust than a €500 goal that never fills.

## Step 4: write the one-line ask

Your ask needs one line: what the money pays for, and how much. You do not need a story about coffee or a long paragraph about your journey.

Some examples that work:

- "This site costs €20 a month to run. Help cover this month's bill."
- "Hosting for November: €20. Once it is covered, this button goes away."
- "No ads, no tracking. Readers like you pay the €20 server bill."

The second one says something most donate buttons cannot: the ask ends. That tells visitors you will not keep asking once the need is met.

In QuietJar, put the line in the widget's headline and body. The button label can stay short, like "Chip in".

## Step 5: set it up in QuietJar

Sign up with your email, add your site and your payout details, then:

1. Go to **Goals**, click **Add goal**, enter €20 as the target and choose **Monthly**.
2. On the **Widget** page, pick that goal. The button becomes a card with a progress meter, like "€12 of €20 raised".
3. Under **When the goal is reached**, leave **Hide the widget** selected.
4. Write your one-line ask in the headline and body.
5. Paste the snippet just before the closing `</body>` tag of your site:

```html
<script>
  window.QuietJar = { site: "qj_your_site_id" };
</script>
<script src="https://quietjar.com/js/latest/quietjar.js" async></script>
```

It works on any site that lets you paste HTML. For framework-specific steps, see the [developer page](/developers/). If you do not have a website, share your hosted page at `quietjar.com/@yourname` instead.

## What happens when the bill is covered?

The button steps aside. Visitors stop seeing the ask for the rest of the month, because there is nothing left to ask for.

On the first of the next month, the goal starts again at zero and the button comes back. You do not have to do anything. The reset happens at midnight UTC, so it can show up a few hours early or late in your own time zone.

People who just gave are treated well too. After a donation, the widget stays hidden for that visitor for 30 days by default and shows a thank-you instead of another ask. So your most loyal readers do not see the button again the same week they paid for your server.

If you would rather keep taking donations after the goal, you can keep the widget visible, with or without the filled bar. That suits sites where donations are income, not only a way to pay a bill.

## What if the goal is not reached?

Then the button stays up for the whole month. On the first, the count goes back to zero for the new month, and whatever came in is still yours.

If you miss the goal month after month, look at the number before you look at the button. Is the goal close to the real bill? Does the one-line ask say what it is for? A smaller, honest goal that gets covered beats a big one that stays half empty.

## Does this actually work?

We have one site with real numbers, so here they are. TCG Pocket Collection Tracker is a fan site for a trading card game. Its Buy Me a Coffee button brought in about €30 a month on average.

In September 2026, the site set a €50 goal for that month's hosting. It raised €97 in 12 hours. Then the button disappeared until October.

One Hacker News commenter guessed as much: if you [invite donations to cover hosting costs specifically](https://news.ycombinator.com/item?id=45903589), "you'd very quickly get a surplus". It was a guess, but it matches what happened here. A clear bill with a clear end is easy to say yes to.

## When do you get the money?

Donations reach your QuietJar balance after a few days. You pay out to your bank account from the dashboard once the balance reaches €50, or the local equivalent.

With a €20 goal, that means a payout every two or three months. Plan for it: pay the first bills yourself, and let donations refill what you spent. With a bigger goal, you reach the payout threshold sooner.

## Is a monthly goal better than monthly memberships?

For a hosting bill, often yes. Many people do not want to sign up for an ongoing payment, even a small one. A monthly goal lets them give once, when they see the ask, while the goal itself comes back every month like the bill does.

Memberships make sense when you offer something in return, like extra posts or early access. Ko-fi and Buy Me a Coffee both do memberships well. For "please help pay the server", a one-time gift toward a monthly goal is a simpler ask. Read [why a donate button that disappears at the goal works](/articles/donate-button-that-disappears-when-goal-is-met/) for more on that.

## The short version

Add up your real monthly costs. Add about 10% for fees if most donations are small. Set a monthly goal for that number, write one line that says what it pays for, and let the button step aside once the bill is covered.

You can [set up your first goal in QuietJar](/) in a few minutes. For the progress bar itself and other ways to show it, see [how to add a donation goal with a progress bar](/articles/how-to-add-a-donation-goal-progress-bar-to-your-website/).
