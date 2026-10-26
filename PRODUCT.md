# MicroSprouts — Product Context

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary audience (confirmed):** Individual customers and households in London.
- Customers who want fresh broccoli sprouts for home meals and need a convenient, agreed collection or local delivery time.
- The owner is the grower and current operator who prepares batches, manages availability, and confirms customer enquiries.

## Product Purpose

MicroSprouts makes locally grown broccoli sprouts available to London households. The website helps customers understand the product, select a pack and quantity, request a suitable date, and arrange collection or personal delivery directly with the grower.

A successful customer journey ends with an accurately described enquiry and a mutually confirmed arrangement, **not** an unsupported promise of immediate dispatch or payment completion.

## Positioning

Broccoli sprouts grown personally in small batches, with direct contact between London customers and the person growing and handing over their order. The product is **broccoli sprouts, not microgreens or mature broccoli florets**.

The grower describes the methods as organic. Any formal organic-certification claim remains **unverified** and must not be asserted without supporting evidence.

## Operating Context

- Public site: https://microsprouts.bhaktivedanta-london.workers.dev/
- Source repository: `BlissLondon108/microsprouts-website` on GitHub, connected to a Cloudflare Worker named `microsprouts`.
- The current implementation is a static HTML/CSS/JavaScript website. The repository includes `index.html`, `style.css`, `approved.css`, `shop.js`, `site.js`, `assets/`, and `wrangler.jsonc`.
- Customers use the website to choose options and continue an enquiry through WhatsApp: **07386853514**, international link **https://wa.me/447386853514**.
- The owner currently coordinates harvesting, delivery, collection windows, and payment arrangements personally.

## Capabilities and Constraints

### Product and pricing

- **Week Supply:** 200g broccoli sprouts for **£9.99**.
- **Family Pack:** 500g broccoli sprouts for **£16.99**.
- **Collection:** free, by appointment during a specifically agreed collection time window; customers can request any day, subject to availability.
- **Personal delivery:** **£2.30 per order**, in selected London areas, normally **Tuesday, Wednesday or Thursday**. Do not represent delivery as guaranteed before confirming availability.
- **Growing lead time:** broccoli sprouts require **at least six days** to prepare. The current website requires customer requests **at least seven days ahead** to allow a buffer.
- **Promotion:** code `SPROUT` applies a **20% discount to the sprouts subtotal on eligible one-time enquiries**, excluding the delivery fee.

### Current customer workflow

- Product variants, quantities, frequency interest, preferred date, fulfilment method and postcode when needed feed a WhatsApp message.
- The site's prominent **Checkout** label currently leads to an **enquiry**, not a payment transaction. This distinction must remain clear in explanatory copy and customer expectations.
- **No online payment, completed booking, automatically confirmed delivery slot, or automatic subscription is currently implemented.**
- Weekly and fortnightly supply are available as **manual enquiries**, subject to agreement.

### Planned or undecided capabilities — not currently live

- **Revolut** payment integration and possible recurring payments/subscriptions are planned; exact integration and launch timing remain undecided.
- The owner wants a **private password-protected admin dashboard** with customer bookings, quantities, and a Google Calendar integration.
- The owner wants delivery days and pickup time windows to be **customisable**, including exceptions and extra availability. These dashboard features should not be presented as implemented without evidence.

### Non-negotiable product truth

- Show botanically accurate **broccoli sprouts**: fine pale stems, small paired green seed leaves, and occasional seed hulls. Do not misrepresent them as microgreens or broccoli heads.
- Keep collection and personal delivery distinct; do not imply Royal Mail shipping or guaranteed next-day arrival.
- Do not fabricate food-safety certifications, verified nutritional outcomes, reviews, testimonials, harvest statistics, or commercial promises.

## Brand Commitments

- Public-facing name: **MicroSprouts**, consistently written without decorative stars attached to the wordmark.
- First-person growing story: **"I grow my sprouts with love and care."**
- Honest, approachable communication from a small London grower.
- The user has selected Seed's Daily Synbiotic product page as a reference for later website design work. This is a **design reference only**, not permission to claim affiliation or reuse Seed-specific branding, copy, or photography.

## Evidence on Hand

- The repository's `index.html` describes two broccoli-sprout pack sizes, London fulfilment and the public product content.
- `shop.js` contains the current enquiry/price/lead-time logic, including the `SPROUT` promotion and the WhatsApp destination.
- `wrangler.jsonc` configures the existing Cloudflare Worker.
- Product imagery in the current site includes generated or illustrative assets, not verified photographs of delivered MicroSprouts batches.
- **Not on hand:** verified organic certification, genuine customer ratings/testimonials, completed Revolut checkout, working private dashboard, or verified live Google Calendar booking integration.

## Product Principles

1. **Truthful product representation:** use the correct sprouts terminology and only grounded claims.
2. **Freshness requires planning:** communicate growth time and availability before inviting an enquiry.
3. **Personal, local fulfilment:** preserve the customer-to-grower relationship and clearly distinguish collection from personal delivery.
4. **Transparent transactions:** never suggest an enquiry is a paid or confirmed order.
5. **Simplicity for households:** make quantities, prices, preferred dates and the next action understandable without extra explanation.
