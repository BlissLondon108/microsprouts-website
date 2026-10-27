# MicroSprouts Stripe checkout — catalogue, subscriptions, customer portal (sandbox)

## Status and environments

- The MicroSprouts website hosts sandbox checkout at https://microsprouts.bhaktivedanta-london.workers.dev/checkout.html .
- The user reported that Cloudflare's **runtime** `/api/checkout/status` returned `{"enabled":true,"mode":"test"}` on 27 October 2026. Only `sk_test_` secret keys are supported. **Real payments are not enabled.**
- The homepage still links to the established WhatsApp enquiry form. It has not been switched to live paid checkout.
- Important: Stripe's test-mode sandbox attached to a regular Stripe account and a separately named Stripe sandbox may be **different environments with separate product catalogues**. The ChatGPT-connected "MicroSprouts sandbox" has a completed catalogue, but the site may use a different test key. **Never hard-code a price ID from another Stripe environment.** The site now self-provisions the same named products/prices in the test environment authenticated by Cloudflare's secret key.

## Fixed product catalogue

The Worker module `stripe-catalog.js` defines **three** reusable Stripe Products and **seven** current new-sale Prices (plus preserved legacy v1 recurring prices) with stable lookup keys. The amounts below are in GBP.

| Product | One-time | Weekly | Fortnightly |
| --- | --- | --- | --- |
| Single Pack · 200g broccoli sprouts | £9.99 | **£8.99 per week** | **£8.99 every two weeks** |
| Family Pack · 500g broccoli sprouts | £16.99 | **£15.49 per week** | **£15.49 every two weeks** |
| Personal London delivery | £2.30 per order | **Free** | **Free** |

Collection is free by appointment; delivery and growing lead time still require personal confirmation. For subscriptions, each renewal bills only the discounted sprouts packs. No delivery charge is added to recurring invoices.

All catalog lookup keys have the stable form:
- `ms_broccoli_200g_once_v1`, `ms_broccoli_200g_weekly_v2`, `ms_broccoli_200g_fortnightly_v2`
- `ms_broccoli_500g_once_v1`, `ms_broccoli_500g_weekly_v2`, `ms_broccoli_500g_fortnightly_v2`
- `ms_delivery_london_once_v1` (one-time delivery only; subscription delivery is free)

For new Stripe test environments, **the first successfully validated checkout request** creates any missing fixed products/prices; later checkouts look them up and verify the configured amount, interval and active status. The provisioning process is idempotent, bounded to the fixed MicroSprouts catalogue and never uses customer-supplied price names, prices or product identifiers. This means products in the *Cloudflare-key* test account may not appear in the Dashboard until the first checkout after the latest deployment.

`SPROUT` on the site is a one-time-only discount. The Worker creates or reuses a fixed 20% Stripe coupon (`MS_SPROUT20_V1`) that applies **only to the two broccoli products**, not the delivery product. The checkout uses reusable Price IDs even with the coupon. The backend computes the expected discounted order amount and verifies it after Stripe confirms the payment.

## Subscription behaviour

Choose **Weekly subscription** or **Fortnightly subscription** at `/checkout.html`. The backend creates a hosted Stripe Checkout Session in `mode=subscription`, using the matching recurring Price for the selected broccoli pack, quantity and optional personal delivery. Stripe creates an actual Customer and Subscription **only after the customer completes the subscription signup and required payment**. Creating a Price or plan does not create a subscriber.

Customers are charged for the corresponding weekly/two-week period. Their preferred first collection or delivery date is provisional. Dates are not booked on the server and are not automatically added to a calendar.

## Customer portal

- Stripe self-service portal: `https://microsprouts.bhaktivedanta-london.workers.dev/manage-subscription.html`
- Public API `GET /api/checkout/portal` reads the account-specific Stripe-hosted `login_page.url`; sign-in is handled by Stripe via an email link. No MicroSprouts password or custom account is required.
- The configured portal includes **invoice/payment history, payment method updates, and subscription cancellations at the end of the current billing period**. Stripe's no-code email-login portal may not allow customers to update their email address, even if that feature is enabled in the underlying portal configuration. Plan-switching is disabled because a change to the broccoli plan could leave recurring delivery prices or the growing schedule out of sync.
- On a newly encountered test environment, the Stripe portal configuration is created together with the reusable catalogue on the first validated checkout. Its login page then becomes available through the website and on the paid-subscription confirmation page.
- The ChatGPT-connected "MicroSprouts sandbox" has already had this configuration created and verified via its Stripe API, but **that is not proof the separate Cloudflare-key test environment already contains it**.

## Safe testing procedure

1. Verify GitHub Actions quality checks passed. In Cloudflare's **Settings → Runtime variables and secrets**, ensure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are saved as runtime **Secrets** and `PAYMENTS_ENABLED` is a runtime **Variable** set to `true`. Do not put keys in `Builds → Variables and secrets`, Github or chat.
2. Open `/checkout.html` and make a **new test purchase after the catalogue deployment**. It should redirect to Stripe hosted checkout. The very first request may take longer because Stripe provisions the fixed catalogue in the configured test account.
3. In the Stripe Dashboard test/sandbox environment **associated with the Cloudflare key**, open Product catalog. Confirm the three products and all seven new-sale prices exist, with correct amounts and intervals. Other Stripe sandboxes are isolated and will not display these prices.
4. Test **Weekly subscription** and **Fortnightly subscription** with Stripe test card `4242 4242 4242 4242`, an expiry in the future and any valid CVC. Check they appear under Stripe Billing → Subscriptions and that Stripe displays the recurring line items at the expected interval.
5. Open `/manage-subscription.html`; sign in using the subscriber email via Stripe's no-code portal and verify payment history, update-payment-method UI and at-period-end cancellation. Use only test subscribers.
6. Check the paid-order success page only shows confirmation when `GET /api/checkout/verify` sees a paid Stripe session with the exact expected GBP total; test payment cancellation and failed payments. The WhatsApp follow-up is for scheduling, not a payment substitute.
7. No real orders/charges should be created until the user explicitly approves live activation.

## Important unfinished production work

- **Order fulfilment/alerts:** Stripe webhook endpoint verifies the event signature, logs subscription/invoice/payment events, and responds. It does not yet persist orders or send owner notifications. Implement a durable and idempotent order queue (such as Cloudflare D1) and reliable owner notifications before production. Never depend on the customer actually clicking WhatsApp to learn about an order.
- **Google Calendar:** No automatic calendar creation or renewal synchronisation has been implemented. The user's Google Calendar is connected to ChatGPT, but not to the public Worker.
- **Customer portal in live mode:** The test portal is set up in test environment only. It and other Stripe resources need separate live-mode configuration and business owner approval before launch.
- **Operational/legal:** Confirm fulfilment availability and subscription renewal schedules, cancellation/refund policies, UK sole-trader privacy and business details, contact information, appropriate tax treatment, legal food-labelling/food-safety duties and subscription terms. The first requested date is not a guaranteed booking.
- **Security:** `worker.js` and `stripe-catalog.js` are not served as static assets thanks to `.assetsignore`; no Stripe secrets should ever be committed to GitHub. Stripe prices and discounts are server-controlled.

## Technical flow

`checkout.html` → `checkout.js` → Worker `POST /api/checkout/session` → `ensureCatalog()` using Cloudflare Stripe test key → reusable Stripe `line_items[][price]`, coupon if eligible → hosted Stripe Checkout (`payment` or `subscription`) → Stripe paid session confirmation → `checkout-success.html` → WhatsApp delivery/collection planning. For subscriptions, the customer can visit `manage-subscription.html` → `GET /api/checkout/portal` → Stripe secure email login.

Official references:
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/billing/subscriptions/build-subscriptions
- https://docs.stripe.com/customer-management/configure-portal
- https://docs.stripe.com/checkout/fulfillment
- https://developers.cloudflare.com/workers/configuration/secrets/

## Updated subscription prices and pack photos

From 27 October 2026, new weekly and fortnightly subscriptions use Single Pack (200g) £8.99 or Family Pack (500g) £15.49 **per billing period**, including complimentary eligible London personal delivery. One-time prices remain £9.99 and £16.99, with £2.30 delivery. New v2 recurring Stripe prices leave existing v1 subscription billing unchanged; prices do not create subscribers by themselves.

The homepage and sandbox checkout now use two matched broccoli-sprout photos on beautiful dark stone plates: `assets/single-plate.webp` and `assets/family-plate.webp`. The 500g image shows a visibly bigger portion. The homepage remains a WhatsApp enquiry flow until real-payment activation is separately authorised; Google Calendar, fulfilment notifications and production subscription operations are separate tasks.
