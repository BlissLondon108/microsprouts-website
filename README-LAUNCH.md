# Sprout London — public launch (WhatsApp enquiry edition)

This folder is a **static marketing website**, ready to upload to a static hosting provider. It does **not** take payments, create confirmed bookings, or provide the private admin dashboard. Those remain in the full Cloudflare Worker project, which is separate.

## Why this version

The user requested publication before Revolut was ready. This is the safe interim launch: show product prices and expected collection/delivery options; send customer enquiries via WhatsApp for manual confirmation and payment arrangements. Customers are clearly told that dates, availability and payments are not yet confirmed.

## How to publish on Cloudflare Pages (requires owner account)

1. Sign in at https://dash.cloudflare.com/
2. Navigate to Workers & Pages → Create application → Pages → Direct Upload (interface labels may vary).
3. Upload the **contents of this folder** (`index.html`, `hero.webp`, `robots.txt`) as a project, e.g., `sprout-london`.
4. Verify the generated public `*.pages.dev` URL and test on a phone. The WhatsApp button should open with a prefilled enquiry.
5. If you own a domain, add it through Pages → Custom domains and follow the DNS instructions.

Before announcing the site, review the product description, discount validity, and that you can handle requested enquiries, and publish appropriate UK food-business/privacy/terms information. Avoid claiming certified organic status unless eligible and documented.

## Temporary ordering rules

- 200g: £9.99; 500g: £16.99.
- Free collection. London personal delivery adds £2.30 once per enquiry/order.
- Delivery requests are limited to Tuesday–Thursday; collection requests can be made any day.
- Earliest date shown is today + 7 days (6 days growing plus 1 buffer).
- Weekly/fortnightly options are **requests**, not automated subscriptions.
- SPROUT gives a 20% indicative discount on one-off sprouts; delivery isn't discounted.
- Collection windows, actual daily capacity and postcode exceptions are agreed personally on WhatsApp until the dynamic private-admin Cloudflare Worker is deployed.
- Customer information is not saved by this website; the selections only go to WhatsApp when the customer sends the message.

**Important:** This static site is a functional public enquiry storefront, NOT the full admin/booking infrastructure. Deploying the full Worker requires Cloudflare account authorization, an independent D1 database and configured admin secrets. Revolut can be enabled there once its merchant integration is tested.
