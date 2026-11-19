---
title: How to add a donation button to an Astro site
description: Paste two script tags with is:inline into your base layout, just before </body>. Astro ships them as written and the button shows on every page.
publishedDate: 2026-11-16
pillar: audience
draft: false
faq:
  - question: How do I add a donate button to my Astro site?
    answer: Paste the QuietJar snippet into your base layout, just before the closing body tag, and add is:inline to both script tags. Astro then ships them as written, and the button shows on every page that uses the layout.
  - question: Why do I need is:inline on the script tags?
    answer: Without it, Astro processes a plain script tag. In our test the config script came out as a minified type="module" script. With is:inline, Astro leaves both tags exactly as you wrote them.
  - question: Does the donate button work with Astro view transitions?
    answer: Yes, if you add data-astro-rerun to both script tags. The ClientRouter replaces the whole body on every navigation and does not run scripts again that already ran, so without the attribute the button disappears after the first click on a link.
  - question: Can I use my own button instead of the floating one?
    answer: Yes. Call window.QuietJar.open() from any button or link and the checkout opens right on the page. You can also place the widget inside your page with the mount.target setting.
  - question: Will a donate button slow down my Astro site?
    answer: The QuietJar script is 11.7 kB gzipped and loads in around 40 ms on a cold cache. It floats in a fixed corner layer, so it causes no layout shift, and Stripe's payment code only loads when someone opens the checkout.
---

To add a donation button to an Astro site, paste two script tags into your base layout, just before `</body>`, and add `is:inline` to both. Astro then ships them exactly as written, and the button shows up on every page that uses the layout. Supporters pay right on your page, with Apple Pay, Google Pay, cards or iDEAL.

The usual advice is to link to Ko-fi or a Stripe payment page. A link like that works, but visitors leave your site to pay, and the button asks forever. This guide shows the QuietJar way, with a goal that ends. We tested every step on a fresh Astro 7.4 site in November 2026.

## What do you need before you start?

You need a QuietJar account and the snippet from your dashboard. Sign up with your email, add your site address and your payout details, and the dashboard gives you a snippet with your own site id.

You also need a layout that wraps your pages. Most Astro sites have one in `src/layouts/`, often called `Layout.astro` or `BaseLayout.astro`. If your pages each have their own `<html>` and `<body>`, add the snippet to each page instead.

## How do you add the donation button to your Astro layout?

Open your base layout and paste the snippet just before the closing `</body>` tag. Add `is:inline` to both script tags. That is the whole setup.

### 1. Paste the snippet into your base layout

Here is a complete layout with the snippet in place:

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
  </head>
  <body>
    <slot />

    <script is:inline>
      window.QuietJar = { site: "qj_your_site_id" };
    </script>
    <script is:inline src="https://quietjar.com/js/latest/quietjar.js" async></script>
  </body>
</html>
```

Replace `qj_your_site_id` with the id from your dashboard. Payments are only accepted from the site address you registered, so a copied snippet on someone else's site cannot take payments for you.

### 2. Why is:inline matters

By default, Astro processes every `<script>` tag that has no attributes other than `src`. It bundles the script, turns it into `type="module"` and may inline it in a changed form. The [Astro docs on script processing](https://docs.astro.build/en/guides/client-side-scripts/) say `is:inline` opts a script out of all of that.

We checked what happens without it. Astro turned the config script into this:

```html
<script type="module">window.QuietJar={site:`qj_your_site_id`};</script>
```

It still works, but it is no longer the code you wrote, and module scripts run on a different schedule than plain ones. The second tag has `async`, so Astro already leaves it alone. Adding `is:inline` to both makes your intent clear and keeps it that way when you edit the tags later.

### 3. Build and check the output

Run `npm run build` (or `bun run build`) and open a page in `dist/`. In our test, both tags came out exactly as written, just before `</body>`:

```html
<script>
      window.QuietJar = { site: "qj_your_site_id" };
    </script><script src="https://quietjar.com/js/latest/quietjar.js" async></script></body>
```

Then run `npm run preview` and open the site. The button floats in the bottom right corner by default.

## How do you show a goal on the button?

Create a goal in your dashboard, then add its id to the config. The button turns into a small card with a progress meter that updates as donations come in.

```astro
<script is:inline>
  window.QuietJar = {
    site: "qj_your_site_id",
    goal: "qg_your_goal_id",
  };
</script>
```

A goal is either **monthly**, which starts again on the first of each month, or **lifetime**, which keeps counting. A monthly goal fits a running cost like hosting. We wrote a full guide on [covering your hosting bill with a monthly goal](/articles/cover-your-hosting-bill-with-a-monthly-goal/).

By default the widget hides itself once the goal is met, and comes back when the next month starts. If you would rather keep taking donations, set `goalReached` to `"show"` or `"show-with-bar"`. There is more on why hiding works in [a donate button that disappears when the goal is met](/articles/donate-button-that-disappears-when-goal-is-met/).

## Can you put the button inside a page instead of the corner?

Yes. Set `mount.target` to a CSS selector, and the widget renders inside that element instead of floating in the corner.

```astro
<script is:inline>
  window.QuietJar = {
    site: "qj_your_site_id",
    goal: "qg_your_goal_id",
    mount: { target: "#support" },
  };
</script>
```

Then add an empty element wherever you want the card, for example at the end of your blog post layout:

```astro
<div id="support"></div>
```

Pages without a `#support` element fall back to the floating corner. So one config in your base layout can give you an inline card on blog posts and a corner button everywhere else.

The corner button sits in a fixed layer and never moves your content, but an inline card takes up space in the page. Put the slot where nothing important sits below it, like the end of an article or a sidebar, so the card does not push text down as it appears.

## How do you open the checkout from your own button?

Call `window.QuietJar.open()`. The checkout opens right there on the page, next to the widget when it is visible, and centered when it is not.

```astro
<button type="button" onclick="window.QuietJar.open()">
  Support this site
</button>
```

Astro passes the `onclick` attribute through unchanged, which we confirmed in the build output. The call always opens the checkout, even for a visitor the widget has stepped back for. That makes it a good fit for a "Support" link in your footer or a line at the end of each post.

## Does it work with Astro view transitions?

Yes, with one extra attribute. If your site uses `<ClientRouter />`, add `data-astro-rerun` to both script tags.

```astro
<script is:inline data-astro-rerun>
  window.QuietJar = { site: "qj_your_site_id" };
</script>
<script is:inline data-astro-rerun src="https://quietjar.com/js/latest/quietjar.js" async></script>
```

Here is why. The [Astro view transitions docs](https://docs.astro.build/en/guides/view-transitions/) say the ClientRouter replaces the whole `<body>` on every navigation. The widget lives in the body, so it goes too. The router also skips scripts that already ran on an earlier page, so nothing brings the widget back.

With `data-astro-rerun`, both scripts run again after each navigation and the widget mounts fresh on the new page. The browser serves the script from its cache, so this does not mean a new download each time. If you do not use the ClientRouter, you can leave the attribute out.

## Does a donation button slow down your Astro site?

Barely. Astro sites tend to be fast, and a support button should not change that. Here is what the QuietJar script adds, from our [developer page](/developers/):

| What | Value |
| --- | --- |
| Script size | 38.6 kB, or 11.7 kB gzipped |
| Load time | Around 40 ms on a cold cache |
| Layout shift | Zero, the button floats in a fixed corner layer |
| Payment code | Stripe's code loads only when someone opens the checkout |
| Cookies | None, so no cookie banner needed |

The `async` attribute means the browser never waits for the script before it shows your page. Your content comes first, then the button.

Want to check before you add it? The script is [open source](https://codefloe.com/Goodfolk.eu/quietjar), so you can read every line that runs on your page.

## Which donation option fits your Astro site?

It depends on what you want the button to do. Here is how the common options compare, checked in November 2026:

| | Where supporters pay | Goal progress on your site | Hides when the goal is met |
| --- | --- | --- | --- |
| Link to a Stripe payment link | On a Stripe-hosted page | Not that we found | No |
| Ko-fi or Buy Me a Coffee widget | On your page | No, goals live on their profile pages | No |
| QuietJar | On your page | Yes, in the button | Yes, by default |

A plain link is the simplest choice. It needs no JavaScript at all, and [Stripe Payment Links](https://docs.stripe.com/payment-links) handle the checkout on a Stripe-hosted page. Supporters do leave your site to pay, though.

Ko-fi and Buy Me a Coffee both have widgets that take payment on your page, and [Buy Me a Coffee says](https://help.buymeacoffee.com/en/articles/10206530-creative-ways-to-share-your-buy-me-a-coffee-page) its widget lets supporters "donate without leaving your site". They also have large communities, memberships and shops. If you need those, they are a good pick. But does your visitor ever see how close you are to covering this month's costs?

QuietJar fits best when you have a real cost to cover and want the ask to end when it is covered. For a wider look, see [the best donation widgets for your website](/articles/best-donation-widgets-for-your-website/).

## The short version

Paste the snippet into your base layout with `is:inline`, add `data-astro-rerun` if you use view transitions, and attach a goal. Every other setting, from colors to preset amounts, is on the [developer page](/developers/).

You can [add QuietJar to your Astro site](/) in a few minutes. It costs [5% per donation, minimum €0.50](/pricing/), with card fees included and no monthly fee.
