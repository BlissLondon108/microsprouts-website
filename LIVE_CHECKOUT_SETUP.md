# MicroSprouts — Stripe-only live checkout

**Status (28 October 2026): code prepared; real payments are NOT yet activated.**

## Already configured in the live Stripe account

- Single Pack 200g: £9.99 one-time; £8.99 weekly or fortnightly.
- Family Pack 500g: £16.99 one-time; £15.49 weekly or fortnightly.
- London personal delivery: £2.30 for one-time orders; included in subscriptions.
- One-time discount coupon `MS_SPROUT20_V1` (SPROUT, 20% off broccoli sprouts).
- Secure Stripe customer portal with invoices, payment-method updates and at-period-end subscription cancellation.
- An optional live Stripe webhook exists (`we_1UVWwCJ8HaF2s5A92H7kgpkQ`) but remains **disabled**. This Stripe-only/manual fulfillment setup does not rely on a webhook, separate database or third-party email service.

## Step 1 — Account owner: turn on Stripe payment notifications

Open the **live MicroSprouts Stripe Dashboard** and under your own profile's
Communication preferences enable email alerts for successful payments.
Confirm the email address is one you actively monitor. Stripe customer receipts
are configured separately under customer email settings.

Stripe's official guide:
https://support.stripe.com/questions/set-up-account-email-notifications

**Important:** Stripe's email may not contain the pack, quantity, date and
postcode. Always review the paid Checkout Session or payment metadata in
Stripe before preparing or delivering sprouts. Also regularly review
subscription invoices, renewals and payment failures.

## Step 2 — Cloudflare: install your LIVE Stripe secret

Under Cloudflare → Workers & Pages → `microsprouts` → Settings → Runtime
variables and secrets, supply the **live MicroSprouts account** secret as
an encrypted `STRIPE_SECRET_KEY` (starts with `sk_live_` or `rk_live_`).
A restricted live API key (`rk_live_`) is preferable. Give Write permission
only to Products, Prices, Coupons, Checkout Sessions and Customer portal
(the Worker reads and creates these through its existing Stripe catalogue and
Checkout flow). All other permissions should start as None. If Stripe reports
an additional required permission during controlled testing, investigate that
specific API operation rather than granting unrestricted access.
Do not paste it into chat, GitHub, HTML or a public variable.

For the controlled launch, configure the runtime variables:

- `PAYMENT_MODE=live` — selects the Stripe live environment.
- `STRIPE_NOTIFICATIONS_CONFIRMED=true` — only after verifying Stripe owner email notifications AND committing to manual order review.
- `LIVE_CHECKOUT_ENABLED=true` — final explicit release switch, set only when all tests and operational checks are complete.
- `PAYMENTS_ENABLED=false` — emergency stop switch; false disables payment checkout. Otherwise it can remain true/unset.

The new live checkout **does not require** `ORDERS_DB`, D1,
`RESEND_API_KEY`, `ORDER_ALERT_FROM`, `ORDER_ALERT_TO` or
`OWNER_ALERT_VERIFIED`. Sandbox mode can continue using test Stripe secrets
and its previous optional webhook secret. No API secret belongs in GitHub.

Before BOTH confirmed/enable flags are true, the public homepage still offers
the WhatsApp enquiry form and cannot start a real charge. When live requirements
are satisfied, the existing homepage button becomes **Checkout** and opens
the selected pack in `checkout.html?pack=200` or `?pack=500`.

## Step 3 — Controlled validation before launch

- Confirm the Cloudflare Worker sees the intended live configuration:
  `GET /api/checkout/status` must return `mode: "live"`,
  `enabled: true`, and `manual_order_handling: true` **only during final
  verified release**.
- Perform one expressly authorised small live payment and verify both your
  Stripe payment notification email and its Dashboard payment record.
  Inspect all stored order metadata. Confirm that the customer's receipt works.
- Check one-time purchases and discount calculations, checkout cancellation,
  and the success/verification page.
- Verify weekly/fortnightly subscription terms, automatic renewals,
  customer portal and cancellation policy. Do not offer subscriptions
  until you can safely fulfill them on schedule.
- Maintain a daily manual order/renewal review in Stripe. Email alerts can
  be delayed or filtered; payment notifications alone are not a fulfillment queue.

The user is responsible for applicable UK food-business safety and labeling,
privacy, terms, refunds, subscription disclosures and delivery eligibility.

## Operational status

Live Stripe account resources are configured; Cloudflare's production runtime
secrets and email notification preferences have NOT been directly verified
by ChatGPT. The Stripe-only code is deliberately fail-closed. Do not claim
real live charges have been turned on until the owner completes the settings
and an end-to-end test confirms the whole checkout flow.

The earlier D1/Resend implementation was retired from active code.
Git history retains it if order volume later requires automation.
