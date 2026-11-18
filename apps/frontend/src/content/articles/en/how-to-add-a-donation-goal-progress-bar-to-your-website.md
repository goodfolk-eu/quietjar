---
title: How to add a donation goal with a progress bar to your website
description: Pick a goal for a real cost, show the amount raised against it, and use a bar that updates by itself. Here are your options and how to set one up.
publishedDate: 2026-11-16
pillar: goals
draft: false
faq:
  - question: How do I show a donation goal with a progress bar on my website?
    answer: Use a donation tool that ties the bar to real payments, so it fills as people give. With QuietJar you create a goal in the dashboard, attach it to the widget and paste one script tag. You can also write the bar in HTML yourself, but then you update the number by hand.
  - question: Can a progress bar update automatically when someone donates?
    answer: Only if it reads the total from the tool that takes the payments. A hand-written HTML bar shows whatever number you typed last. QuietJar, Givebutter and Zeffy all keep the bar in sync with real donations.
  - question: What should a donation progress bar show?
    answer: The amount raised, the target, and what the money pays for. A period helps too, like "this month", so visitors know the ask has an end.
  - question: Do I need to be a nonprofit to show a donation goal?
    answer: Not with QuietJar. Givebutter and Zeffy are built for organizations, and Zeffy only accepts registered nonprofits and charities. QuietJar works for anyone with a website, including individuals.
  - question: What happens to the progress bar when the goal is reached?
    answer: That depends on the tool. QuietJar hides the button by default, and you can choose to keep it with or without the full bar. With a monthly goal, the bar starts again at zero on the first of the month.
---

To add a donation goal with a progress bar, pick a goal for a real cost, show how much has come in against it, and make sure the bar updates when people give. The easy way is a donation tool that draws the bar from real payments. With QuietJar, that is one goal in the dashboard and one script tag on your site.

You can also write the bar in HTML yourself. It looks the same, but you have to update the number by hand every time someone donates.

## Why does a goal tied to a real cost work?

A goal tied to a real cost gives people a reason to act now. "Help cover this month's hosting, €50" is a clear ask with an end. "Support my work" is not, and visitors learn to scroll past it.

The bar does the rest. People can see the gap, and they can see their €5 close part of it. When the number in the goal matches something they understand, like a server bill or a new microphone, they trust it.

That trust is easy to lose, though. A goal that looks far bigger than the cost it names makes people wonder where the rest goes. Keep the number close to the real bill, and say what it pays for.

## What should you show on the progress bar?

Show the amount raised, the target, and what the money is for. Those three things answer the questions a visitor has before they give: how much is needed, how far along it is, and why.

A few things make the bar work better:

- **A real name for the goal.** "This month's hosting" beats "Fundraiser".
- **A period.** "This month" tells people the ask ends, and that their gift counts now.
- **Amounts, not only a percentage.** "€32 of €50 raised" is easier to act on than "64%".
- **The donate button right next to it.** A bar without a way to give is a report, not an ask.

The QuietJar widget shows the bar inside the button card, with a label like "€32 of €50 raised". Once the goal is met, it reads "Goal reached" if you choose to keep it visible.

## What are your options?

There are three common ways to do this. Here is how they compare, checked in November 2026:

| | Bar updates by itself | Who can use it | Bar sits in the donate button | What happens at the goal |
| --- | --- | --- | --- | --- |
| DIY HTML and CSS | No, you edit the number | Anyone | If you build it | Nothing, unless you change it |
| Givebutter | Yes, a goal bar widget | Organizations, mainly in the US | No, a separate widget | Not that we found |
| Zeffy | Yes, an embeddable thermometer | Registered nonprofits in six countries | No, a separate embed | Not that we found |
| GiveWP | Yes, on the donation form | Anyone with a WordPress site | Yes, in the form | Can close the form |
| QuietJar | Yes | Anyone with a website | Yes | Hides the button by default |

### DIY HTML: free, but you update it by hand

A progress bar is a few lines of HTML. Browsers even have a built-in element for it:

```html
<div class="goal">
  <p><strong>This month's hosting:</strong> €32 of €50 raised</p>
  <progress value="32" max="50">64%</progress>
  <a href="https://example.com/your-donation-link">Chip in</a>
</div>
```

This is fine for a short campaign where you check your payments every day. The limit is simple: the page shows whatever you typed last. Each donation means you open your payment account, add up the total, edit the page and publish again.

To make it update by itself, you need a server that listens for payments from your provider, keeps a running total, and serves it to the page. For a monthly goal you also need a reset on the first of each month. That is real work to build, and more work to keep running.

### Nonprofit campaign tools: strong, if you qualify

Givebutter, Zeffy and Donorbox are built for fundraising campaigns, and they do it well. Givebutter has a goal bar widget that updates in real time. Zeffy lets you embed only the thermometer of a campaign on your site, with no platform fee. Donorbox shows a progress meter once you set a campaign goal.

The question is whether you can use them. Givebutter does not support personal fundraising accounts, and it asks for a US bank account. Zeffy is for registered nonprofits and charities in the US, Canada, the UK, Ireland, Australia and Germany. If you run a blog, an open source project or a fan site, these tools are not built for you.

GiveWP is the exception. It is a free WordPress plugin with goal bars on its donation forms, and it can close a form once the goal is met. If your site runs on WordPress and you are a nonprofit, it is a solid choice.

### QuietJar: the bar lives in the button

QuietJar puts the goal inside the donate button itself. The button becomes a small card with a progress meter, supporters pay right on your page, and the meter updates as donations come in. It works on any site that lets you paste HTML, and you do not need to be a nonprofit.

When the goal is met, the button steps aside by default. With a monthly goal, it comes back on the first of the next month. That is the part most goal bars skip: they keep asking after the need is covered.

## How to set up a goal with a progress bar in QuietJar

It takes a few minutes. You sign up with your email (a one-time code, no password), add your site and your payout details, and then follow these steps.

### 1. Create a goal

In your dashboard, go to **Goals** and click **Add goal**. Give it a name (only you see it) and a target in your payout currency.

Then pick how it counts:

- **Monthly** starts again on the first of each month. Use it for costs that come back, like hosting or a domain.
- **Lifetime** keeps counting until you change it. Use it for one-off costs, like a new laptop.

You can keep up to 20 goals and switch between them.

### 2. Attach the goal to your widget

On the **Widget** page, choose the goal. The button turns into a card with a progress meter.

Under **When the goal is reached**, pick what happens next:

- **Hide the widget** (the default). The button steps aside until the goal starts again or you pick a new one.
- **Keep the widget, without the bar.** People can still give, but the goal is no longer shown.
- **Keep the widget, with the bar.** The full bar stays visible.

While you are there, write a short headline and body that say what the goal pays for.

### 3. Paste the snippet

Copy the snippet from your dashboard and paste it just before the closing `</body>` tag:

```html
<script>
  window.QuietJar = { site: "qj_your_site_id" };
</script>
<script src="https://quietjar.com/js/latest/quietjar.js" async></script>
```

The widget floats in a fixed corner layer, so it never pushes your content around. If you would rather show the card inside your page, for example in a sidebar, the `mount.target` setting places it inside an element you choose. The [developer page](/developers/) lists every setting.

No website? Every account also gets a hosted page at `quietjar.com/@yourname`, and it can show the same goal bar.

## Which option should you pick?

Pick the one that matches who you are and how often your goal changes.

- **A one-time campaign that you watch closely:** DIY HTML is fine. Just plan time to update the number.
- **A registered nonprofit with campaigns and events:** Givebutter, Zeffy, Donorbox or GiveWP give you much more than a bar, like donor management and peer-to-peer pages.
- **A creator, maintainer or site owner with a cost that comes back:** QuietJar gives you a bar that fills by itself, resets every month and hides once the cost is covered.

QuietJar is not the right tool if you need donor management, events or memberships. It is a donation widget, and it stays small on purpose.

## The short version

A donation goal works when it names a real cost, shows the amount against it, and updates without you. A hand-written bar gets the look right but not the updates. Nonprofit tools get both, if you qualify.

For a full walkthrough of covering a monthly bill, read [how to cover your hosting bill with a monthly goal](/articles/cover-your-hosting-bill-with-a-monthly-goal/). Or [add QuietJar to your site](/) now. It costs [5% per donation, minimum €0.50](/pricing/), with card fees included and no monthly fee.
