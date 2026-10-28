# MicroSprouts — controlled production checkout

STATUS: Code staged; real customer payments remain OFF until account configuration, successful end-to-end tests, and the owner's final launch approval.

## Stripe live-account configuration (verified 28 October 2026)

The live MicroSprouts Stripe account is connected and reports charges and payouts enabled.
Live Stripe products, prices and subscription portal were created separately from the sandbox.
The live catalogue now contains:

- Single Pack 200g: £9.99 once, £8.99 weekly, £8.99 fortnightly.
- Family Pack 500g: £16.99 once, £15.49 weekly, £15.49 fortnightly.
- London delivery: £2.30 once; free on subscriptions (no recurring delivery price).
- Coupon MS_SPROUT20_V1: 20% off broccoli products, one time.
- Live Stripe billing portal: email login, payment method updates, invoice history and cancellation at the end of the billing period.
- Live webhook endpoint created at https://microsprouts.bhaktivedanta-london.workers.dev/api/stripe/webhook
  for checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid,
  invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted.
  Webhook ID: we_1UVWwCJ8HaF2s5A92H7kgpkQ.
  The live webhook is intentionally DISABLED until its signing secret is installed in
  Cloudflare, D1 and owner alerts are verified, and a signed event has been tested.
  Re-enable it in Stripe before enabling customer checkout.

**Still required**: Set this live endpoint's signing secret as STRIPE_WEBHOOK_SECRET
in Cloudflare's Worker runtime; provide the corresponding live STRIPE_SECRET_KEY in
Cloudflare runtime; create and migrate the D1 database; configure and test owner email
notifications; confirm subscription cancellation/fulfillment behaviour; and verify
real end-to-end webhook processing before enabling the public checkout. Never place
Stripe secrets in GitHub or chat.

## 1. Create the order database in Cloudflare

Use the owner's authenticated Cloudflare account. Create a Cloudflare D1 database in a suitable region (WEUR may be appropriate subject to a data-protection decision):

    npx wrangler d1 create microsprouts-orders --location weur --binding ORDERS_DB --update-config
    npx wrangler d1 migrations apply microsprouts-orders --remote

Commit the REAL D1 database_id returned by Cloudflare in wrangler.jsonc; no database binding has been invented in this repository. Confirm the ORDERS_DB binding is available to the deployed Worker and that the orders, stripe_events, and alert_outbox tables exist. The migration is at migrations/0001_fulfillment.sql.

The order ledger contains customer contact details. Restrict access, decide retention/deletion periods, and provide an appropriate UK privacy notice.

## 2. Configure reliable owner notification

Resend is used to send owner email, with a retryable D1 outbox. Verify the sending domain first. Configure only in Cloudflare Worker Settings > Runtime variables and secrets:

- RESEND_API_KEY: encrypted runtime secret.
- ORDER_ALERT_FROM: email address at a verified sender domain.
- ORDER_ALERT_TO: owner's private inbox address.

Every signed paid Checkout event is stored as a unique order. Successful recurring invoices record renewal orders; failed invoices and subscription cancellations create owner alerts. The Worker retries unsent notifications on its five-minute Cron Trigger. A stable idempotency key prevents duplicate sends for webhook retries. Test real inbox delivery; a provider success response alone is not sufficient.

## 3. Test sandbox end to end

Test all pack sizes and frequencies, pickup, delivery, SPROUT promotion, payment success and cancellation, weekly and fortnightly subscriptions, later invoice renewals, failed payments, and portal cancellations. Re-send the same signed Stripe webhook twice; verify a single order record and notification. Simulate an email delivery error and verify a later retry. Check that paid orders are recorded even if a customer never opens the WhatsApp link. Do not assume successful CI proves live resources exist.

## 4. Explicit live launch gate

After meeting food-safety, food-labeling, privacy, terms, cancellation/refund, recurring billing consent, tax, delivery capacity and fulfillment requirements, configure the correct live Stripe account in Cloudflare Worker runtime:

- STRIPE_SECRET_KEY: encrypted LIVE secret (sk_live_...).
- STRIPE_WEBHOOK_SECRET: encrypted signing secret for the LIVE endpoint (whsec_...).
- PAYMENT_MODE: live.
- LIVE_CHECKOUT_ENABLED: true.
- OWNER_ALERT_VERIFIED: true, ONLY after the owner has verified a real notification from the configured service.
- PAYMENTS_ENABLED: must not be false.

Live Stripe has its own products/prices, coupons, billing portal, webhook endpoint, and subscription test requirements. Ensure the provider account is the right one and all production resources are verified.

The Worker refuses live checkout unless the LIVE flags, both secrets, configured email service and functioning D1 schema are present. Only then does the homepage show Checkout and route to the paid checkout page with the selected 200g or 500g pack. Before readiness, the homepage stays on WhatsApp enquiry. The separate sandbox checkout page remains available while in test mode.

## 5. Monitor and reconcile

Monitor Cloudflare Worker errors, Stripe payment and invoice events, orders and unsent alert_outbox records. Reconcile Stripe sales to order records and owner emails. The customer's preferred date is provisional; recurring harvest/collection/delivery is NOT automatically scheduled. A future calendar integration needs to be built and tested separately.

IMPORTANT: GitHub access does not grant Cloudflare database provisioning, verified sender configuration or proof of live delivery. This repository change is not a live payments launch.