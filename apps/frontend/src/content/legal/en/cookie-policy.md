---
title: "Cookie policy"
description: "The cookies and similar technologies used on the QuietJar website and in the donation checkout: strictly necessary only, no analytics, no advertising."
lastUpdated: 2026-09-06
order: 2
---

The QuietJar marketing site sets no analytics, advertising, or social-media
cookies, so no consent banner is needed there. On a creator's site, the donation
checkout sets the Stripe cookies listed below. This policy lists every cookie
involved.

## What cookies are

Cookies are small text files that a site stores in your browser. They can hold a
session identifier or a preference so that a site works as you expect when you
navigate or return.

## Cookies we use

The marketing site itself sets no cookies at all. The cookies below appear when
you sign in to the dashboard or when a supporter opens the checkout. The widget
itself sets no cookies; it keeps one small record in your browser's local storage,
described below. We use no tracking pixels, no fingerprinting, and no other local
storage for tracking.

## Strictly necessary cookies

| Cookie | Set by | Purpose | Lifetime |
| --- | --- | --- | --- |
| `better-auth.session_token` | QuietJar | Your dashboard session. An httpOnly, signed token that identifies you to the API. | Until it expires or you sign out |
| `qj_auth_marker` | QuietJar | A readable hint that lets the static homepage show "Dashboard" instead of "Log in" without a network request. It contains no personal data and is verified server-side before it grants anything. | Until you sign out or close your browser |
| `__stripe_mid` | Stripe | Fraud prevention. Set on the creator's site when a supporter opens the checkout. | 1 year |
| `__stripe_sid` | Stripe | Fraud prevention for the current checkout session. Set on the creator's site when a supporter opens the checkout. | 30 minutes |

Without the session cookie the dashboard cannot work. Blocking it disables
signing in. Everything else on the QuietJar website works without any cookie.

## Storage used by the widget

The widget stores one small record in your browser's local storage under the name
`quietjar-donated`: the date of your last donation on that site and the site's
public key. This record counts as personal data. It has one purpose: so the widget
can step back for a while instead of asking you again after you have already
donated. Clearing your browser storage removes it. If storage is unavailable, the
widget simply does not know and may ask again.

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
