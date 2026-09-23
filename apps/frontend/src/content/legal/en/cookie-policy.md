---
title: "Cookie policy"
description: "The cookies and similar technologies used on the QuietJar website and in the donation checkout: strictly necessary only, no analytics, no advertising."
lastUpdated: 2026-09-23
order: 2
---

This policy covers every place QuietJar touches your browser, divided into
three parts: the website, the dashboard, and the widget. The website sets
nothing. The dashboard sets two cookies, both for authentication. The widget
itself sets nothing; the only network calls it makes are a goal's progress
and the checkout itself. No analytics, no advertising, no tracking, so there
is no consent banner.

## What cookies are

Cookies are small text files that a site stores in your browser. They can hold a
session identifier or a preference so that a site works as you expect when you
navigate or return.

## The website

The QuietJar website sets no cookies, stores nothing in your browser, and
runs no tracking. There is nothing to consent to.

## The dashboard

The dashboard uses two cookies, both for authentication:

| Cookie | Set by | Purpose | Lifetime |
| --- | --- | --- | --- |
| `better-auth.session_token` | QuietJar | Your dashboard session. An httpOnly, signed token that identifies you to the API. | Until it expires or you sign out |
| `qj_auth_marker` | QuietJar | A readable hint that lets the static pages show "Dashboard" instead of "Log in" without a network request. It contains no personal data and is verified server-side before it grants anything. | Until you sign out or close your browser |

Without the session cookie the dashboard cannot work. Blocking it disables
signing in. Everything else on the QuietJar website works without any cookie.

After you sign in, the dashboard also keeps one record in your browser's
local storage: your site's public key, under `qj_site_key`, so the
developers page can fill it into the embed snippet without another request.
It contains no personal data.

## The widget

The widget sets no cookies and runs no tracking. It talks to the network in
only two situations:

- When the site you are visiting has a goal, the widget fetches that goal's
  progress once, and the answer is at most five minutes old.
- When you donate, the checkout runs, and Stripe sets the two cookies in the
  table below.

| Cookie | Set by | Purpose | Lifetime |
| --- | --- | --- | --- |
| `__stripe_mid` | Stripe | Fraud prevention. Set on the creator's site when the checkout opens. | 1 year |
| `__stripe_sid` | Stripe | Fraud prevention for the current checkout. Set on the creator's site when the checkout opens. | 30 minutes |

### Storage used by the widget

The widget stores records in your browser's storage. Under `quietjar-donated` in
local storage: the date of your last donation on that site, the site's public
key, and how long the widget stays hidden afterwards. When you close the widget
on a site that configured a lasting hide, a record under `quietjar-dismissed` is
added: in session storage for the current session, or in local storage for a
number of days or until you clear it. These records count as personal data. They
have one purpose: so the widget can step back for a while instead of asking you
again after you have already donated. Clearing your browser storage removes them.
If storage is unavailable, the widget simply does not know and may ask again.

## The hosted page

The optional hosted page uses the same checkout as the widget, so Stripe sets the
same cookies there.

## How to manage cookies

You can delete and block cookies in your browser settings at any time. Signing out
removes your session. If you block the session cookie, you can still read every
page of the site but you cannot sign in.

## Changes to this policy

We publish every change on this page with a new last-updated date. If a new cookie
were ever strictly necessary, we would list it here before it is set.

## Contact us

Our company details and contact addresses are in the [imprint](/legal/imprint/).
