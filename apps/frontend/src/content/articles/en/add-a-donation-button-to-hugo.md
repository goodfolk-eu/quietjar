---
title: How to add a donation button to a Hugo site
description: Put the snippet in a partial, read your site id from hugo.toml, and call the partial from baseof.html just before </body>. Here is the full setup.
publishedDate: 2026-11-16
pillar: audience
draft: false
faq:
  - question: How do I add a donate button to my Hugo site?
    answer: Put the QuietJar snippet in a partial, for example layouts/_partials/quietjar.html, and call it from your base template just before the closing body tag with {{ partial "quietjar.html" . }}. The button then shows on every page.
  - question: Where do I put the snippet if I use a Hugo theme?
    answer: Check whether your theme has a footer hook. PaperMod, for example, calls an empty extend_footer.html partial that you can override in your own layouts folder. If your theme has no hook, copy its baseof.html into your project's layouts folder and add the partial call there. Files in your project take priority over the theme.
  - question: Can I add a donate button inside a Hugo blog post?
    answer: Yes, with a shortcode. Hugo's Markdown renderer leaves out raw HTML by default, so create a shortcode that outputs an empty element and point the widget's mount.target setting at it. Pages without the shortcode keep the floating corner button.
  - question: Should I hardcode my site id in the template?
    answer: You do not have to. Put it under [params.quietjar] in hugo.toml and read it with site.Params.quietjar.site. That keeps all your QuietJar settings in one place, next to the rest of your site config.
  - question: Will a donate button slow down my Hugo site?
    answer: The QuietJar script is 11.7 kB gzipped and loads in around 40 ms on a cold cache. It loads with async, floats in a fixed corner layer so nothing on your page moves, and Stripe's payment code only loads when someone opens the checkout.
---

To add a donation button to a Hugo site, put the QuietJar snippet in a partial and call that partial from your base template, just before `</body>`. Keep your site id in `hugo.toml` so it is not hardcoded in the template. The button then shows on every page, and supporters pay right there with Apple Pay, Google Pay, cards or iDEAL.

The usual advice is to link to Ko-fi or a Stripe payment page. That works, but it sends people away from your site, and the button asks forever. This guide shows the QuietJar way, with a goal that ends, in the template style the [Hugo docs](https://gohugo.io/templates/types/) use today.

## What do you need before you start?

You need a QuietJar account and your site id. Sign up with your email, add your site address and your payout details, and the dashboard gives you a snippet with the id in it. It starts with `qj_`.

You also need to know which Hugo version you run, because the folder names changed. Hugo v0.146.0 introduced a new template system: `layouts/partials` became `layouts/_partials`, `layouts/shortcodes` became `layouts/_shortcodes`, and `layouts/_default/baseof.html` moved to `layouts/baseof.html`. Run `hugo version` to check. This guide uses the new names, with the old ones in brackets.

## How do you add the donation button to Hugo?

Three files, a few lines each. Here is what goes where:

| File | What it does |
| --- | --- |
| `hugo.toml` | Holds your site id and goal id |
| `layouts/_partials/quietjar.html` | Holds the snippet and reads the settings |
| `layouts/baseof.html` | Calls the partial on every page |

### 1. Add your settings to hugo.toml

Add a `quietjar` table under `params`:

```toml
[params.quietjar]
  site = "qj_your_site_id"
  goal = ""
```

Leave `goal` empty for now, we come back to it below. The [Hugo docs on params](https://gohugo.io/configuration/params/) show this nested style and how to read it with `site.Params`. They recommend camelCase or snake_case for key names, and plain lowercase words like these are the safest choice.

### 2. Create the partial

Create `layouts/_partials/quietjar.html` (or `layouts/partials/quietjar.html` before v0.146.0):

```go-html-template
{{ with site.Params.quietjar }}
<script>
  window.QuietJar = {
    site: "{{ .site }}",
    goal: "{{ .goal }}"
  };
</script>
<script src="https://quietjar.com/js/latest/quietjar.js" async></script>
{{ end }}
```

Three things happen here. The global [site function](https://gohugo.io/functions/global/site/) works in any template, so the partial does not need the page passed in. The [with action](https://gohugo.io/functions/go-template/with/) only renders the block when `params.quietjar` exists, so a config without it renders nothing at all. And inside `with`, the dot is your `quietjar` table, so `.site` and `.goal` read its keys.

Hugo also escapes the values for the script context they land in. We rendered this partial with Go's `html/template` package, which Hugo's templates build on, and the output was exactly the snippet from the dashboard. An empty `goal` comes out as `goal: ""`, which the widget reads as "no goal".

### 3. Call the partial from your base template

Open `layouts/baseof.html` (or `layouts/_default/baseof.html` before v0.146.0) and call the partial with the [partial function](https://gohugo.io/functions/partials/include/), just before `</body>`:

```go-html-template
    {{ partial "quietjar.html" . }}
  </body>
</html>
```

Run `hugo` and open a page in `public/`. The two script tags should sit just before `</body>`. Run `hugo server` to see the button float in the bottom right corner.

## What if your theme owns the base template?

Most Hugo sites use a theme, and the theme ships its own `baseof.html`. You have two options, and the first one is cleaner.

**Use the theme's hook if it has one.** Many themes include an empty partial that exists only so you can override it. [PaperMod](https://github.com/adityatelange/hugo-PaperMod), for example, calls `extend_footer.html` from its footer. Create `layouts/_partials/extend_footer.html` in your own project with one line:

```go-html-template
{{ partial "quietjar.html" . }}
```

Other themes have similar hooks under different names. Look in your theme's README or its `layouts` folder for an empty footer or head partial.

**Otherwise, copy the base template.** Copy the theme's `baseof.html` to the same path in your project's `layouts` folder and add the partial call there. The [Hugo docs on themes](https://gohugo.io/hugo-modules/theme-components/) explain that Hugo looks in your project first, so your copy wins. The catch is that you no longer get the theme's updates to that file.

## How do you show a goal on the button?

Create a goal in your dashboard and paste its id into `hugo.toml`:

```toml
[params.quietjar]
  site = "qj_your_site_id"
  goal = "qg_your_goal_id"
```

The partial already passes it on. The button turns into a small card with a progress meter that updates as donations come in.

A goal is either **monthly**, which starts again on the first of each month, or **lifetime**, which keeps counting. Monthly goals fit running costs, and our guide on [covering your hosting bill with a monthly goal](/articles/cover-your-hosting-bill-with-a-monthly-goal/) walks through one. By default the widget hides once the goal is met and comes back next month. That is the idea behind [a donate button that disappears when the goal is met](/articles/donate-button-that-disappears-when-goal-is-met/).

Other settings, like colors, position or preset amounts, follow the same pattern. Add a key to `hugo.toml` and a line to the config object in the partial. The full list is on the [developer page](/developers/).

## How do you place the button inside a blog post?

Use a shortcode. Hugo's Markdown renderer leaves raw HTML out by default, since the [goldmark `unsafe` setting](https://gohugo.io/configuration/markup/) is `false`, so you cannot just paste a `<div>` into a post. A shortcode gets around that cleanly.

### 1. Create the shortcode

Create `layouts/_shortcodes/quietjar.html` (or `layouts/shortcodes/quietjar.html` before v0.146.0):

```go-html-template
<div id="quietjar"></div>
```

### 2. Point the widget at it

Add `mount` to the config in your partial:

```go-html-template
<script>
  window.QuietJar = {
    site: "{{ .site }}",
    goal: "{{ .goal }}",
    mount: { target: "#quietjar" }
  };
</script>
```

### 3. Use it in your content

Call the [shortcode](https://gohugo.io/templates/shortcode/) anywhere in a Markdown file:

```markdown
If this guide saved you an afternoon, you can help cover the hosting.

{{< quietjar >}}
```

On pages with the shortcode, the card renders inline at that spot. Pages without it fall back to the floating corner button, so one setup covers both.

The corner button sits in a fixed layer and never moves your content. An inline card does take space in the page, so place it near the end of a post, where nothing important sits below it.

## How do you open the checkout from your own button?

Call `window.QuietJar.open()` from a button or link. The checkout opens right on the page, even for a visitor the widget has stepped back for.

To use it in content, make a second shortcode at `layouts/_shortcodes/support-button.html`:

```go-html-template
<button type="button" onclick="window.QuietJar.open()">{{ or (.Get "label") "Support this site" }}</button>
```

Then write `{{< support-button label="Chip in for hosting" >}}` in any post. Without a label, it says "Support this site". The same `<button>` also works directly in a template, for example in your footer.

## Does a donation button slow down your Hugo site?

Barely. People pick Hugo because it is fast, and the button should not change that. The QuietJar script is 38.6 kB, or 11.7 kB gzipped, and loads in around 40 ms on a cold cache, according to our [developer page](/developers/).

The `async` attribute means the browser does not wait for the script before showing your page. The button floats in a fixed corner layer, so there is zero layout shift. Stripe's payment code only loads when someone opens the checkout, and the widget sets no cookies, so you do not need a cookie banner for it.

Want to check before you add it? The script is [open source](https://codefloe.com/Goodfolk.eu/quietjar), so you can read every line that runs on your page.

## Which donation option fits your Hugo site?

A plain link to a [Stripe payment link](https://docs.stripe.com/payment-links) or your Ko-fi page is the simplest choice. It needs no JavaScript, but supporters leave your site to pay, and nothing tells them when you have enough.

Ko-fi and Buy Me a Coffee both have widgets that take payment on your page. [Buy Me a Coffee says](https://help.buymeacoffee.com/en/articles/10206530-creative-ways-to-share-your-buy-me-a-coffee-page) its widget lets supporters "donate without leaving your site". Both also have large communities, memberships and shops, so they are a good fit if you need those. Their goals live on their profile pages, though, not in the button on your site. Checked in November 2026.

QuietJar fits when you have a real cost to cover and want the ask to stop once it is covered. For a wider comparison, see [the best donation widgets for your website](/articles/best-donation-widgets-for-your-website/).

## The short version

Keep your settings in `hugo.toml`, put the snippet in a partial, and call it from `baseof.html` or your theme's footer hook. Add a shortcode when you want the card inside a post.

You can [add QuietJar to your Hugo site](/) in a few minutes. It costs [5% per donation, minimum €0.50](/pricing/), with card fees included and no monthly fee.
