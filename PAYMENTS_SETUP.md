# MicroSprouts Stripe checkout integration — sandbox rollout

## Current status

The new payment-first checkout is available at \`/checkout.html\`, but is **disabled by default**. The public homepage intentionally continues using the established WhatsApp **enquiry** process until the Stripe sandbox has been fully tested and the business owner approves changing the public checkout. The Worker accepts **only Stripe test secret keys**. It cannot take real payments with its current configuration.

Guest checkout is supported. The form collects a required name and email; WhatsApp is optional. **Customer accounts are not implemented**; adding real accounts requires authentication, access controls and a privacy-policy review. Do not display fake login/account creation UI.

The one-time options use the established prices: 200g £9.99 or 500g £16.99, quantity 1–10, plus £2.30 for local delivery or free collection. \`SPROUT\` is 20% off eligible one-time goods only, not delivery. Weekly and fortnightly Stripe subscription sessions recur at the chosen pack price and repeat the £2.30 delivery fee when selected; **each charge covers the corresponding period**. Dates, growing capacity, and the final local delivery/collection times are agreed personally after verified payment.

## Exact next step — connect sandbox secrets to Cloudflare

1. Open the [Stripe Dashboard](https://dashboard.stripe.com/), select **MicroSprouts sandbox / Test mode**, and locate the **sandbox secret API key**. The key must begin \`sk_test_\`. Do **not** share that key in ChatGPT, GitHub or a screenshot. Never use \`sk_live_\` for testing.
2. In your Cloudflare dashboard go to **Workers & Pages → microsprouts → Settings → Variables and Secrets** (UI names can vary).
3. Add these three encrypted Worker secrets:
   - \`STRIPE_SECRET_KEY\`: your \`sk_test_…\` key.
   - \`PAYMENTS_ENABLED\`: \`true\`.
   - \`STRIPE_WEBHOOK_SECRET\`: the signing secret \`whsec_…\` from the Stripe sandbox webhook destination set up below.
4. In Stripe sandbox's event destinations or webhook settings, add HTTPS endpoint:
   \`https://microsprouts.bhaktivedanta-london.workers.dev/api/stripe/webhook\`.
   Subscribe to \`checkout.session.completed\`, \`checkout.session.async_payment_succeeded\`,
   \`invoice.paid\`, \`invoice.payment_failed\`,
   \`customer.subscription.updated\`, and \`customer.subscription.deleted\`.
   Stripe will provide the separate \`whsec_\` endpoint signing secret. Store it in the Cloudflare Worker secret, not this repository.
5. Verify \`/api/checkout/status\` returns \`{"enabled":true,"mode":"test",…}\` and make a **test-card** purchase on \`/checkout.html\`. Confirm the Stripe sandbox contains matching checkout metadata, the correct charge and recurring pricing, that \`/checkout-success.html?session_id=...\` only confirms *paid* sessions, and that WhatsApp opens with the order reference. Test checkout cancellation and retries. Run GitHub Actions smoke and payment tests.
6. **Do not activate real payments yet.** Live activation requires a separate approved release: switch to a \`sk_live_\` secret, explicitly update the Worker to allow production, configure the live Stripe webhook and billing customer portal, test cancellation/refunds/order notifications, verify fulfilment and regulatory requirements, then link the new checkout from the homepage.

## Security and customer-experience details

- Do not place Stripe secret API keys, \`whsec_\` signing keys, or customer records in JS served to customers or any GitHub file.
- Prices, subscription intervals, discount rules, lead-time constraints, names and contact fields are validated **server-side** before Stripe Checkout. The user cannot set their own price.
- The confirmation page calls server-side \`/api/checkout/verify\` to retrieve the Stripe Checkout Session. Returning to a success URL alone does not imply payment.
- Webhooks verify signatures and acknowledge the configured event types; Stripe itself currently stores the order and subscription metadata. This integration **does not yet persist fulfilment state, dispatch email alerts or process refunds automatically**. Before production, provide a reliable owner alert/order queue, webhook event processing and a customer-facing cancellation portal.
- Collection is free by arrangement; Tuesday–Thursday local deliveries cost £2.30 per order, with a requested date at least seven days ahead.
- WhatsApp is shown **only after verified payment** on the new success page. Keep the existing enquiry flow in place until authorised to switch over.
- Do not invent availability, account credentials, delivery reservations, refund terms, health benefits, or food-safety certifications.

## Useful references

- Stripe Checkout Sessions: https://docs.stripe.com/api/checkout/sessions/create
- Stripe subscription checkout: https://docs.stripe.com/billing/subscriptions/build-subscriptions
- Stripe checkout fulfilment and webhook verification: https://docs.stripe.com/checkout/fulfillment
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare static assets Worker binding: https://developers.cloudflare.com/workers/static-assets/binding/

## Architecture

\`/checkout.html\` → \`/checkout.js\` → \`POST /api/checkout/session\` (Worker validates inputs and creates Stripe test Checkout Session) → Stripe-hosted checkout → \`/checkout-success.html\` → \`GET /api/checkout/verify?session_id=...\` (Stripe API confirms paid state and exact amount) → WhatsApp to agree fulfilment.

The API is routed by \`wrangler.jsonc\` \`assets.run_worker_first\` on \`/api/*\`. Other static assets remain served directly. \`.assetsignore\` excludes private backend source and build files from static publishing. Automated tests reside in \`tests/payments.mjs\` and \`tests/smoke.mjs\`.
