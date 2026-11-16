# Security policy

QuietJar handles payments, so we take reports seriously.

## Reporting a vulnerability

Email **security@quietjar.com** with a description, the steps to reproduce it, and the impact you expect. Please do not open a public issue or pull request.

We confirm receipt within 3 working days and keep you posted until it is fixed. Once a fix is live, we are happy to credit you, if you want that.

## Scope

- The widget script served from quietjar.com
- The API and dashboard at quietjar.com
- The code in this repository

Payment card data never reaches our servers. It goes straight to Stripe, so report issues with Stripe itself to [Stripe](https://stripe.com/docs/security).

Please do not test against other people's accounts or donations. Use your own account and Stripe test mode.
