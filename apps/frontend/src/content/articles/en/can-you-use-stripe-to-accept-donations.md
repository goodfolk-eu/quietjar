---
title: Can you use Stripe to accept donations on a personal website?
description: Often yes, but Stripe's rules for individuals are strict and partly unclear. Here is what Stripe says about tips and donations, and your options.
publishedDate: 2026-11-16
pillar: audience
draft: true
faq:
  - question: Can I accept donations with Stripe without a registered business?
    answer: You can open a Stripe account as a sole proprietor without a separate company. What you may accept is a different question. Stripe's rules say a tip must be for a good or service you provided, and a donation must be tied to a specific charitable purpose.
  - question: Why did Stripe flag my donation link?
    answer: Stripe does not explain every decision. Its list of restricted businesses includes crowdfunding and fundraising, and it does not support personal or peer-to-peer money transfers. A general "support me" link can look like either one, which is how some site owners ended up in a review.
  - question: Is a tip different from a donation for Stripe?
    answer: Yes. Stripe says a tip must be given for a good or service that has been provided, such as content. A donation must be tied to a specific charitable purpose that you commit to carry out, and must be used for that purpose.
  - question: Why can Ko-fi and Buy Me a Coffee take tips through Stripe?
    answer: They run a platform, and creators join through it. Stripe's list says individual creators on approved platforms do not need preapproval. Creators on a platform still have to follow Stripe's rules, including the ban on personal money transfers.
  - question: Is this legal advice?
    answer: No. This article summarizes Stripe's public pages as of November 2026. If your situation is unclear, ask Stripe support before you launch, and ask a local advisor about anything legal or tax related.
---

Often yes, but it depends on what people pay you for. Stripe lets individuals sign up as sole proprietors, and it allows tips for content you provide. A general "support me" link with nothing behind it is a gray area, and some site owners have had their accounts flagged for exactly that.

This article goes through what Stripe's own pages say, why personal tip links get flagged, and what your options are. It is a summary of public rules, not legal advice.

## Can an individual open a Stripe account?

Yes. You do not need a company to use Stripe. Stripe says you can sell "if you have not established a separate business entity", and you then sign up as a [sole proprietorship](https://support.stripe.com/questions/selling-on-stripe-without-a-separate-business-entity).

That is the easy part. Even as a sole proprietor, you are a business in Stripe's eyes. The harder question is what you are allowed to accept money for.

## What does Stripe say about tips and donations?

Stripe has a short support page on [requirements for accepting tips or donations](https://support.stripe.com/questions/requirements-for-accepting-tips-or-donations). It draws three lines:

- **Tips.** "A tip must be given for a good or service that has been provided (e.g., content)."
- **Donations.** "A donation must be tied to a specific charitable purpose that you're committing to accomplish." The money must go to the purpose you described to the donor, and you cannot accept donations on behalf of someone else.
- **Personal transfers.** "Stripe does not support payment processing for personal or peer-to-peer money transmission." Sending money between friends is the example Stripe gives.

The same page lists extra limits per country. In Japan, for example, donations to individuals are not supported, and in Hong Kong and Thailand donations are not supported at all.

So for a personal website, "tip" is the closer fit. If your site has articles, a tool, a podcast or open source code, a visitor who pays you is tipping for content you provided.

## What does the restricted businesses list add?

Stripe's [prohibited and restricted businesses list](https://stripe.com/gb/legal/restricted-businesses) is where it gets less clear. Three entries matter here.

**Peer-to-peer money transmission is prohibited.** It sits in the list of financial services Stripe does not support. Stripe also prohibits "processing where there is no bona fide good or service sold, or donation accepted".

**Content creation is restricted, but creators on their own site are named.** Platforms that let creators receive tips need extra review. Then comes a note that matters for you: "Individual content creators on approved platforms (for example, connected accounts of an approved Stripe Connect user) and those directly distributing their own content (for example, on their own website) do not require preapproval." Creators still have to follow the list and "are subject to monitoring by Stripe".

**Crowdfunding and fundraising are restricted.** This covers fundraising by nonprofits, charities and political organizations, and crowdfunding platforms. "Organisations fundraising for a charitable purpose" are, per the list, supported only in Australia, Canada, the United Kingdom and the United States, and "prohibited in all other countries".

Read together, our understanding is this. Tips for your own content on your own website are allowed without preapproval. A button framed as a "donation" for a cause, or a fundraiser that looks like crowdfunding, falls under stricter rules. For organisations raising money for a charitable purpose, the list rules out every country except four. That is our reading of public pages, not Stripe's ruling on your case.

## Why do personal tip links get flagged?

Because "support me" can look like several things Stripe treats differently. It can look like a tip for content, which is fine. It can also look like crowdfunding, a donation without a charitable purpose, or a personal money transfer.

Stripe also reviews new accounts. Its page on [how to accept donations](https://support.stripe.com/questions/how-to-accept-donations-through-stripe) notes that "additional reviews to ensure compliance may be required".

Here is one real example. In a [Ghost forum thread](https://forum.ghost.org/t/buy-me-a-coffee-or-donate-model/11171), a site owner added a Stripe donation link to his site. Stripe then threatened to close his account because it saw the link as crowdfunding, a restricted business. He wrote that emails and a phone call with support never made the problem clear, and he moved his donate button to another provider.

This does not mean Stripe flags every tip link. Plenty of people use one without trouble. It does mean that the wording on your page and your account description matter, and that Stripe does not always explain its decision.

## Why are Ko-fi, Buy Me a Coffee and QuietJar a different situation?

They run the payment platform, and you join through them. That puts you in a different category from someone who opens their own Stripe account and pastes a donation link.

Stripe's FAQ on the [restricted businesses list](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs) explains the split. It describes an approved crowdfunding platform as "a crowdfunding platform that has been approved by Stripe to use Stripe Connect", and says "no additional approval is required for merchants who wish to fundraise on an approved crowdfunding platform". For creators, the list itself says the same about connected accounts of an approved platform.

Someone on Hacker News once asked [how Ko-fi can connect to Stripe](https://news.ycombinator.com/item?id=41465944) when Stripe restricts crowdfunding. The answers there were guesses. The FAQ above is the closest thing to an official answer: the platform goes through Stripe's review, and creators on an approved platform do not each need preapproval.

This does not make you exempt from the rules. Platforms have to "prevent use of their services to facilitate personal or peer-to-peer money transmission", and you still have to follow Stripe's terms. A platform is not a way around the rules. It is a setup the rules already expect.

How each one works:

- **Ko-fi** connects your own Stripe or PayPal account to Ko-fi, and pays you directly into it ([Ko-fi help](https://help.ko-fi.com/hc/en-us/articles/24482435253661-What-payment-methods-are-available-on-Ko-fi)).
- **Buy Me a Coffee** pays out to your bank account and is available to creators in 44 countries ([Buy Me a Coffee FAQ](https://buymeacoffee.com/faq)).
- **QuietJar** is built on Stripe and opens the payment account for you during setup. You give your details, a bank account and a short identity check. You never build a Stripe integration yourself.

## What are your options?

There are three realistic routes. Each one has a clear best fit.

| | Stripe Payment Links | Build your own on Stripe | A platform (Ko-fi, Buy Me a Coffee, QuietJar) |
| --- | --- | --- | --- |
| Setup | No code, in the Stripe Dashboard | Code, webhooks, hosting | Sign up and paste a button or snippet |
| Where people pay | Stripe-hosted page | On your site, if you build it | On your site or the platform's page |
| Who deals with Stripe | You | You | The platform, with your identity check |
| Platform fee | None, Stripe fees only | None, Stripe fees only | Depends on the platform |
| Upkeep | Low | Yours | None |

### Stripe Payment Links

Payment Links are the simplest way to take money with your own Stripe account. You create a link in the Dashboard and share it or add it as a button. Stripe's [donations guide](https://support.stripe.com/questions/how-to-accept-donations-through-stripe) says you can set a fixed amount (one-time or recurring) or let people choose their amount, but a chosen amount works for one-time payments only. You can also change the button text from "pay" to "donate".

The checkout opens on a [Stripe-hosted page](https://docs.stripe.com/payment-links), and you only pay Stripe's fees. The rules above still apply to your account, so describe what people pay for honestly, ideally as tips for your content.

### Build your own

If you are a developer, you can build an on-page checkout with Stripe's embedded components. You need a server for payment sessions, webhooks to record each payment, and domain registration for Apple Pay and Google Pay. Goals and a progress bar are your own code too.

That is a few weekends of work. The account rules are exactly the same as with Payment Links, so building it yourself does not change your position with Stripe. The question is who maintains it when something breaks in the middle of the month.

If you want a head start, QuietJar's code is [open source under the AGPL-3.0](https://codefloe.com/Goodfolk.eu/quietjar). You can read how it handles checkout, goals and webhooks, or run it yourself on your own Stripe account.

### Use a platform

A platform takes the account question off your plate and adds things a bare link does not have. Ko-fi and Buy Me a Coffee have large communities, memberships and shops, and both take payment on your page with a button or widget.

QuietJar is smaller and does one thing. You set a goal for a real cost, like this month's hosting. The button shows the progress, supporters pay right on your page with Apple Pay, Google Pay, cards or iDEAL, and the button [steps aside once the goal is met](/articles/donate-button-that-disappears-when-goal-is-met/). It costs [5% per donation, minimum €0.50](/pricing/), with card fees included and no monthly fee.

## Which route should you pick?

Pick the one that fits who you are, not the one with the lowest fee on paper.

- **You have a Stripe account already and only need a link:** try Payment Links, and describe the payments as tips for your content.
- **You are a registered charity:** Stripe's FAQ says "most registered charities may use Stripe to fundraise". Check the country notes on the restricted list first.
- **You want memberships or a shop:** Ko-fi or Buy Me a Coffee. See how they compare on our [Ko-fi](/compare/ko-fi/) and [Buy Me a Coffee](/compare/buymeacoffee/) pages.
- **You want a polite button on your own site for a real cost:** QuietJar. Read how to [cover your hosting bill with a monthly goal](/articles/cover-your-hosting-bill-with-a-monthly-goal/).

If your case is unclear, ask Stripe support before you launch rather than after the first payment. Stripe's answer for your account is the one that counts.

## The short version

Stripe allows tips for content on your own site, and it lets individuals sign up as sole proprietors. It does not support personal money transfers, and it treats donations and crowdfunding more strictly, so a vague "support me" link can get flagged.

If you would rather not deal with that yourself, a platform handles the Stripe side for you. You can [add QuietJar to your site](/) in a few minutes, or compare more tools in [the best donation widgets for your website](/articles/best-donation-widgets-for-your-website/).
