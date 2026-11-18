---
title: Donate buttons with Apple Pay, Google Pay and iDEAL
description: Donorbox, Ko-fi, PayRequest, Stripe Payment Links and QuietJar support all three. Here is how wallets and iDEAL work, and what to check first.
publishedDate: 2026-11-16
pillar: audience
draft: true
faq:
  - question: Which donation button supports Apple Pay, Google Pay and iDEAL?
    answer: In November 2026, QuietJar, Donorbox, PayRequest, Ko-fi (with a connected Stripe account) and Stripe Payment Links all listed the three methods. Givebutter and Buy Me a Coffee list Apple Pay and Google Pay, but we found no iDEAL on either.
  - question: Why don't my visitors see the Apple Pay button?
    answer: Apple Pay only appears on a supported Apple device with a card in Apple Wallet. Google Pay needs a supported browser or Android device with a saved card. On other devices, visitors see cards and the other methods instead.
  - question: What is iDEAL?
    answer: iDEAL is a common way to pay online in the Netherlands. The visitor picks their bank and confirms the payment in their own banking app, with no card details to type. It works in euros only and is becoming iDEAL | Wero during 2026 and 2027.
  - question: Do I pay more when a supporter uses iDEAL or Apple Pay?
    answer: With QuietJar, no. The fee is 5% per donation, minimum €0.50, and QuietJar pays the card and payment method fees. What you receive does not depend on how the supporter paid.
  - question: Can I offer iDEAL if I do not live in the Netherlands?
    answer: Often yes, because iDEAL is about where the supporter banks, not where you live. Stripe lists 40 countries whose accounts can accept iDEAL. With QuietJar, local methods are not available for accounts in every country, and need a short request and review.
---

Several donate buttons now support Apple Pay, Google Pay and iDEAL together. When we checked in November 2026, QuietJar, Donorbox, PayRequest, Ko-fi (once you connect Stripe) and Stripe Payment Links all listed the three. The bigger differences are where the payment happens, who may use the tool, and what you need to set up first.

This article explains why these methods matter, how they show up for your visitors, and what each tool offers.

## Why do Apple Pay, Google Pay and iDEAL matter for a donate button?

They remove the card form. A visitor who wants to give €5 on a phone does not want to find a wallet, type 16 digits and wait for a code from the bank. With a wallet, they confirm with Face ID or a fingerprint and they are done.

The difference is biggest on mobile. A small screen makes a long form feel even longer, and a donation is a small, generous impulse that fades fast. One Hacker News commenter put it simply: "If a donation platform takes Apple Pay, the friction is even less" ([source](https://news.ycombinator.com/item?id=39934087)).

For European visitors there is a second reason. Stripe calls iDEAL "a common payment method in the Netherlands", and Dutch visitors who usually pay that way may stop at a checkout that only asks for a card.

## How do Apple Pay and Google Pay show up for visitors?

Wallets are device dependent. A visitor only sees Apple Pay or Google Pay when their device and browser support it and they have a card saved in the wallet. Everyone else sees the other methods, so nobody gets stuck.

In practice:

- **Apple Pay** appears on iPhone, iPad and Mac when there is a card in Apple Wallet. Stripe says plainly that if the device and integration requirements are not met, [it does not show Apple Pay](https://docs.stripe.com/apple-pay?platform=web).
- **Google Pay** appears in Chrome and on Android when the visitor has a card saved to their Google account. Stripe needs a card in the wallet before [Google Pay will display](https://docs.stripe.com/google-pay?platform=web).

So do not panic when you open your own donation page on a laptop and see no Apple Pay button. Try it on a phone with a card in the wallet.

If you build the checkout into your own site, there is one more step. Stripe requires you to [register your domain](https://docs.stripe.com/apple-pay?platform=web) for Apple Pay and Google Pay when you use embedded components. Hosted pages like Payment Links work without it.

## What is iDEAL?

iDEAL is a Dutch payment method that works through the visitor's own bank. The visitor picks their bank, is sent to their own banking app, and confirms the payment there. There is no card number to type.

A few facts from [Stripe's iDEAL documentation](https://docs.stripe.com/payments/ideal):

- It is for customers in the Netherlands and works in euros only.
- All major Dutch banks take part.
- Customers cannot dispute an iDEAL payment with their bank, unlike a card payment.
- iDEAL is becoming **iDEAL | Wero**. Stripe asks businesses to rebrand in the first quarter of 2026 and to switch to Wero during 2026 and 2027.

You do not need to live in the Netherlands to accept iDEAL. Stripe accounts in 40 countries can accept it, including most of the EU, the UK and the US.

## Which donation tools support all three?

Here is what we found on each tool's own site in November 2026. We checked what each tool lists. We did not test which methods appear inside every embedded widget on a real site.

| | Apple Pay | Google Pay | iDEAL | Where people pay | Who can use it |
| --- | --- | --- | --- | --- | --- |
| QuietJar | Yes | Yes | Yes, after a short request and review | On your page, or your hosted page | Anyone, but local methods are not available in every country |
| Donorbox | Yes | Yes | Yes, for Dutch donors on euro forms | Embedded form, pop-up or hosted page | Nonprofits and individuals |
| PayRequest | Listed | Listed | Listed | Not clear from its pages | Free plan or paid plans |
| Ko-fi | Yes, with Stripe connected | Yes, with Stripe connected | Listed, with Stripe connected | Ko-fi page, button or tip panel | Anyone |
| Buy Me a Coffee | Yes | Yes | Not that we found | Buy Me a Coffee page or widget | Creators in 44 countries |
| Givebutter | Yes | Yes | Not that we found | Campaign page or widget | Organizations with a US bank account |
| Stripe Payment Links | Yes | Yes | Yes, turn it on in the Dashboard | Stripe-hosted page | Anyone with a Stripe account |

Sources: [Donorbox donation forms](https://donorbox.org/donation-forms), [Donorbox on iDEAL](https://donorbox.org/nonprofit-blog/?p=7911), [PayRequest](https://payrequest.io/guides/free-donation-button), [PayRequest pricing](https://payrequest.io/pricing), [Ko-fi payment methods](https://help.ko-fi.com/hc/en-us/articles/24482435253661-What-payment-methods-are-available-on-Ko-fi), [Buy Me a Coffee FAQ](https://buymeacoffee.com/faq), [Givebutter payment methods](https://help.givebutter.com/en/articles/1726573-what-payment-methods-do-you-accept), [Givebutter countries](https://help.givebutter.com/en/articles/1726542-supported-countries-and-currencies-on-givebutter), [Stripe Payment Links](https://docs.stripe.com/payment-links).

### Donorbox

Donorbox has strong forms and lists Apple Pay, Google Pay and iDEAL among its payment methods. Its forms work as an embed, a pop-up or a hosted page. For iDEAL, you connect Stripe, turn iDEAL on in Stripe, and set the form to accept euros. Donorbox is built for fundraising, so it fits a charity or a cause better than a €3 thank-you on a blog.

### PayRequest

PayRequest lists cards, Apple Pay, Google Pay, iDEAL, Bancontact, SEPA and PayPal on one checkout. Its free plan charges 2% per payment, capped at €25, with paid plans at €5 and €20 a month. We could not tell from its pages whether the donation checkout opens on your site or on a PayRequest page, and we found no goal progress.

### Ko-fi

Ko-fi has a huge creator community and no monthly subscription. Once you connect a Stripe account, its help center lists Apple Pay, Google Pay and iDEAL for supporters, among many others. Apple Pay on Ko-fi works for one-time tips, not for monthly tips or memberships. Which methods a supporter sees depends on their location, currency, browser and device.

### Buy Me a Coffee

Buy Me a Coffee has the friendliest brand in the space. Its FAQ says supporters can pay with "all major credit and debit cards, Apple Pay, Google Pay, Cash App and other global payment methods". We did not find iDEAL mentioned on its site.

### Givebutter

Givebutter turns Apple Pay and Google Pay on for every campaign. On an embedded widget, Apple Pay only appears after you register your domain in the settings. Givebutter lists no iDEAL, settles in US dollars, and needs a US bank account, so it suits US organizations rather than European creators.

### Stripe Payment Links

If you already have a Stripe account, Payment Links are the cheapest route. Apple Pay works with no extra setup, and you can turn on Google Pay and iDEAL in the Dashboard. The trade-off is that visitors leave your site for a Stripe-hosted page.

There is a catch for iDEAL. Stripe lists "donation-based crowdfunding" and "creator economy and live-streaming businesses" among the categories that are [prohibited or restricted for iDEAL | Wero](https://docs.stripe.com/payments/ideal). Dutch businesses must also show their Chamber of Commerce (KVK) number on their website. Check both before you count on it. For the wider question, read [can you use Stripe to accept donations](/articles/can-you-use-stripe-to-accept-donations/).

## How does QuietJar handle these payment methods?

QuietJar shows the checkout right on your page. Supporters see Apple Pay on iPhone, iPad and Mac, Google Pay in Chrome and on Android, cards (Visa, Mastercard, Amex, Cartes Bancaires) and Link, Stripe's own wallet. iDEAL and, where available, Bancontact, EPS, Revolut Pay, BLIK, Satispay and Pay by Bank are there too.

A few things to know before you rely on local methods:

- **They need a request.** In your dashboard, you ask to enable local payment methods, and the request gets a short review. Cards already work in the meantime.
- **They are not available everywhere.** Local methods are not available for accounts in every country. The dashboard tells you if yours is one of them.
- **iDEAL asks for a tax ID.** If you are a sole proprietor, iDEAL asks you for a tax identification number.
- **Wallets follow the device.** Apple Pay and Google Pay only appear on devices that support them, as with every tool above.

You do not set up Stripe yourself. QuietJar opens the payment account for you during sign-up, and you paste one snippet before `</body>`. See the [developer page](/developers/) for the details and the [features page](/features/) for the full list of methods.

## Does the payment method change what you receive?

With QuietJar, no. You pay [5% per donation, minimum €0.50](/pricing/), and QuietJar pays the card and payment fees. A €5 donation by iDEAL leaves you the same as a €5 donation on a credit card from outside the EU. Supporters are never charged extra.

With most other tools, the payment fee depends on the method and comes on top of any platform fee. That is not a problem, but it does make your income harder to predict.

## Which option is right for you?

It depends on who you are and who your visitors are.

- **A charity or cause with EU donors:** Donorbox gives you full donation forms with iDEAL.
- **A US organization:** Givebutter has wallets on by default, but no iDEAL.
- **A creator who wants a community, memberships or a shop:** Ko-fi or Buy Me a Coffee. Compare them with QuietJar on our [Ko-fi](/compare/ko-fi/) and [Buy Me a Coffee](/compare/buymeacoffee/) pages.
- **A developer who is fine with a Stripe-hosted page:** Stripe Payment Links, if your use fits Stripe's rules.
- **A site owner who wants wallets and iDEAL on the page, tied to a real cost:** QuietJar. Set a goal for this month's hosting, and the button [disappears once the goal is met](/articles/donate-button-that-disappears-when-goal-is-met/).

If you want to compare more widgets side by side, read [the best donation widgets for your website](/articles/best-donation-widgets-for-your-website/). For Europe in particular, see [a European alternative to Buy Me a Coffee and Patreon](/articles/european-alternative-to-buy-me-a-coffee-and-patreon/).

## The short version

Apple Pay and Google Pay make a small donation a single tap on mobile, and iDEAL is how many Dutch visitors expect to pay. Several tools support all three today. Choose on the rest: where people pay, who may use the tool, and what it costs you.

You can [add QuietJar to your site](/) in a few minutes, with wallets on the page from day one and iDEAL after a short review.
