# MicroSprouts payments — Stripe Checkout

Existing Stripe-hosted checkout is reused for Single Pack (200g), Family Pack
(500g), delivery, one-time purchase, weekly and fortnightly subscriptions,
the SPROUT promotion and the Stripe customer portal.

The connected MicroSprouts live Stripe account has products, prices, coupon
and customer portal configured. The homepage routes to live Stripe Checkout
ONLY when Cloudflare is explicitly configured for the live environment
and the owner confirms Stripe payment emails and manual order review.

For the current production checklist and the Cloudflare release switches,
see [LIVE_CHECKOUT_SETUP.md](LIVE_CHECKOUT_SETUP.md).

**Important:** the previous Cloudflare D1 and Resend order-recording/notification
system has been retired. Stripe Dashboard is now the sole payment/subscription
record. The account owner must regularly check Stripe orders, renewals and
payment failures, and arrange fulfillment personally. Stripe's payment
notification emails may not include all product and delivery metadata.

Real charges are **not** enabled merely by publishing code to GitHub.
The Cloudflare runtime must have the correct encrypted Stripe live key and
explicit release variables, with end-to-end verification before launch.
