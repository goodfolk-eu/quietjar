---
title: "Add a support button to your docs site: Docusaurus, VitePress and Starlight"
description: Your users read your docs far more often than your repo. Here is where a support button belongs on a docs site, with tested config for three frameworks.
publishedDate: 2026-11-16
pillar: audience
draft: false
faq:
  - question: What is the best way to accept donations on a documentation site?
    answer: Put a small support button on the docs site itself, because that is where your users spend their time. Keep it out of the way, tie it to a real cost like hosting, and let it go quiet when that cost is covered. Keep GitHub Sponsors and FUNDING.yml for the people who do visit the repo.
  - question: How do I add a script tag to VitePress, Docusaurus or Starlight?
    answer: In VitePress, use the head option in .vitepress/config. In Starlight, use the head option of the starlight() integration in astro.config.mjs. In Docusaurus, add a small inline plugin with injectHtmlTags in docusaurus.config.js. All three put the script on every page of the built site.
  - question: Should I use GitHub Sponsors or a donate button on my docs?
    answer: Both. GitHub Sponsors and FUNDING.yml put a Sponsor button on your repo, which suits developers who already have a GitHub account. A button on your docs reaches the much larger group who only read the docs, and lets them pay without an account.
  - question: Will a support widget slow down my docs?
    answer: The QuietJar script is 11.7 kB gzipped, loads with async, and floats in a fixed corner layer, so it causes no layout shift. Stripe's payment code only loads when someone opens the checkout.
---

Put the support button on your docs site, not only in your repo. Your users read the docs every day and open the repo rarely. Add a small, quiet button in a corner, tie it to a real cost, and paste one snippet into your framework's head config. Below are tested steps for Docusaurus, VitePress and Starlight.

## Why the docs site, and not the repo?

Because that is where your users are. Most people who use a library install it from a package manager and then live in the docs. They search for an option, copy an example, check the API reference and leave. Many never open the repo at all.

You can check this with your own numbers. GitHub shows repo views for the last 14 days under **Insights > Traffic**. Put that next to the visitors in your docs analytics, and you know where your readers really are.

So a Sponsor button on GitHub reaches the people who file issues and send pull requests. It misses the much larger group who simply use your work. A button on the docs site reaches them at the moment they get value from it.

## Where does an ask work on a docs site?

An ask works when the reader has just been helped and is not in a hurry. It fails when it gets between a reader and the answer they came for.

Places where it works:

- **A small button in a corner** that stays out of the content. Readers who want to give can find it, and everyone else can ignore it.
- **The getting started page and the changelog.** These are the pages people read when things go well.
- **Your own link in the navbar or footer**, if you prefer an ask that only appears when someone looks for it.

Places where it does not work:

- **A popup or modal in the middle of a page.** Someone who is debugging at 11 at night will not thank you for it.
- **Error and troubleshooting pages.** The reader is frustrated. This is the wrong moment.
- **An ask that never changes.** A button that is always there turns into wallpaper. Readers see it once, decide "not now", and never look again.

That last point is why QuietJar works with goals. You set a goal for a real cost, like this month's hosting or the next release. The button shows progress, and when supporters cover it, it hides until the next month. A reader who closes it does not see it again for the rest of their visit. We wrote more about [why a button that disappears works](/articles/donate-button-that-disappears-when-goal-is-met/).

## The snippet

Every framework below adds the same two script tags. The first sets your settings, the second loads the widget:

```html
<script>
  window.QuietJar = { site: "qj_your_site_id" };
</script>
<script src="https://quietjar.com/js/latest/quietjar.js" async></script>
```

Copy your own site id from the dashboard. To show a goal, add `goal: "qg_your_goal_id"` to the settings object. The [developer page](/developers/) lists every other setting, from position and color to how long the widget stays away after someone donates.

One thing to know before you start: payments are only accepted from the site address you registered in QuietJar. Use your production docs domain, not `localhost`.

## How to add it to Docusaurus

Docusaurus has a `scripts` option in its config, but it only loads external files. It cannot hold the inline settings script. The cleanest way to add both tags is a small inline plugin that uses the [injectHtmlTags lifecycle](https://docusaurus.io/docs/api/plugin-methods/lifecycle-apis#injectHtmlTags). Docusaurus allows [plugins defined as functions](https://docusaurus.io/docs/advanced/plugins#function-definition) right in the config file.

### 1. Edit docusaurus.config.js

Add this to the `config` object:

```js
plugins: [
  function quietjarPlugin() {
    return {
      name: 'quietjar',
      injectHtmlTags() {
        return {
          postBodyTags: [
            {
              tagName: 'script',
              innerHTML: 'window.QuietJar = { site: "qj_your_site_id" };',
            },
            {
              tagName: 'script',
              attributes: {
                src: 'https://quietjar.com/js/latest/quietjar.js',
                async: true,
              },
            },
          ],
        };
      },
    };
  },
],
```

If you already have a `plugins` array, add the function to it. `postBodyTags` puts both tags just before `</body>`, which is where the snippet belongs.

### 2. Build and check

Run `npm run build` and open `build/index.html`. Both script tags sit at the end of the body on every page.

You do not need to swizzle a theme component for this. Swizzling only makes sense if you want the widget inline inside a specific part of the layout, and even then `mount.target` in the settings usually does the job.

## How to add it to VitePress

VitePress has a [head option](https://vitepress.dev/reference/site-config#head) in the site config. Each entry is an array of tag name, attributes and, optionally, inner content.

### 1. Edit .vitepress/config.mts

The file may also be called `config.ts` or `config.js`:

```ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'My Docs',
  head: [
    ['script', {}, 'window.QuietJar = { site: "qj_your_site_id" };'],
    ['script', { src: 'https://quietjar.com/js/latest/quietjar.js', async: '' }],
  ],
})
```

Attribute values in VitePress's head config are strings, so `async` gets an empty string. The output is a plain `async` attribute.

### 2. Build and check

Run your `docs:build` script, or `npx vitepress build docs` if your docs live in a `docs` folder. Open `.vitepress/dist/index.html` inside that folder. Both tags are in the head of every page.

## How to add it to Starlight

Starlight, the docs theme for Astro, has a [head option](https://starlight.astro.build/reference/configuration/#head) on the `starlight()` integration. Each entry has a `tag`, optional `attrs` and optional `content`.

### 1. Edit astro.config.mjs

Add `head` next to your `title`:

```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'My Docs',
      head: [
        {
          tag: 'script',
          content: 'window.QuietJar = { site: "qj_your_site_id" };',
        },
        {
          tag: 'script',
          attrs: { src: 'https://quietjar.com/js/latest/quietjar.js', async: true },
        },
      ],
    }),
  ],
});
```

### 2. Build and check

Run `npm run build` and open `dist/index.html`. Both tags are in the head of every page. Building a plain Astro site instead of Starlight? See [adding a donation button to Astro](/articles/add-a-donation-button-to-astro/).

## What we tested

We built a fresh site with each framework in November 2026: Docusaurus 3.10, VitePress 1.6 and Starlight 0.43 on Astro 7.4. We added the config above and ran a production build. In all three, both script tags appeared in the built HTML of every page we checked, in the right order: settings first, then the widget.

VitePress and Docusaurus switch pages in the browser without a full reload. The floating widget attaches to the page body, outside the part of the page those frameworks re-render, so the script only needs to load once.

## Will it slow down your docs?

No, and it will not push your content around. The script is 38.6 kB, or 11.7 kB gzipped, and loads in around 40 ms on a cold cache. The `async` attribute means it never blocks the page from rendering.

The widget floats in a fixed corner layer, so it causes zero layout shift. Stripe's payment code only loads when someone opens the checkout. The widget sets no cookies and does no tracking, so your docs do not need a cookie banner because of it. It is also [open source under the AGPL-3.0](https://codefloe.com/Goodfolk.eu/quietjar), so you can read every line before you add it to your docs.

## What about GitHub Sponsors and FUNDING.yml?

Keep them. GitHub Sponsors is the right default for many maintainers. GitHub charges no fees on sponsorships from personal accounts, and a `FUNDING.yml` file in your repo's `.github` folder adds a Sponsor button to the repo page ([GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository)).

The two reach different people. The Sponsor button reaches developers who visit the repo, and they sponsor through their GitHub account. A button on your docs reaches everyone who reads them, and they can pay with Apple Pay, Google Pay, a card or iDEAL without an account.

You can connect the two. `FUNDING.yml` accepts up to four custom URLs, so you can add your QuietJar page next to your GitHub username:

```yaml
github: your-username
custom: ["https://quietjar.com/@yourname"]
```

Every QuietJar account gets a hosted page at `quietjar.com/@yourname`, so the Sponsor button can link straight to it.

## And for your README?

Scripts cannot run in a GitHub README, so the widget cannot either. For that, QuietJar has a dynamic image. It shows your widget with live goal progress and links into your donation panel. The README you wrote in March still shows the right number in December. It works in newsletters too.

## Next step

Pick your framework, paste the config, and build. It takes about five minutes, and costs [5% per donation, minimum €0.50](/pricing/), with card fees included and no monthly fee.

If hosting is the cost you want covered, read how to [cover your hosting bill with a monthly goal](/articles/cover-your-hosting-bill-with-a-monthly-goal/). Ready to start? [Add QuietJar to your docs](/).
