# MicroSprouts — Approved Visual System

<!-- impeccable:design-source approved-comp 2026-10-26 -->

## Visual authority

The approved visual comp is the image generated in the conversation on 26 October 2026, "a_high_end_clean_modern_e_commerce_landing_page.png", nominal reference frame **1169 × 1279 pixels**.

This file documents the implemented design decisions. Follow the approved comp rather than inventing another visual direction. Keep product truth in [PRODUCT.md](PRODUCT.md).

## Tone and concept

An elevated London-grown botanical food product. The reference is an editorial product launch: deep forest green, highly art-directed broccoli-sprout photography, quiet typography, cream sections, and a tight purchase experience.

Do not confuse broccoli sprouts with microgreens or mature broccoli heads.

## Structure

1. Deep green header and immediate two-column product hero.
2. Four images underneath the large hero image.
3. Product name, concise tagline, short description, selectable 200g / 500g packs, Checkout button and fulfilment summary on the right.
4. Wide "From Seed to Fresh Sprouts" botanical banner.
5. Warm cream "From Seed to Harvest" growing timeline with four stages.
6. Two side-by-side benefit cards plus a centred sulforaphane science card.
7. Customer enquiry form and FAQ below the approved visual composition to preserve actual business functionality.

## Palette

- Deep forest hero: \`#042b12\`.
- Forest-dark edge: \`#00210b\`.
- Light cream: \`#f8f6ee\`.
- Accent lime: \`#d6e9a7\`.
- Ink: \`#102617\`.
- Soft divider: \`#dfe5d4\`.

## Type

- Editorial headings: Georgia/serif, normal weight and tight but legible tracking.
- Interface and body: Arial/Helvetica/sans-serif.
- Keep body text readable and concise, with no decorative star attached to the MicroSprouts brand.
- Product headline around 60px at the reference desktop frame; timeline headline around 45px.

## Desktop composition at 1169px wide

- Header: approximately 63px high.
- Hero group: ends near y=530px; main photograph approximately 302px tall.
- Product thumbnails: four across, 133px high, small gaps and fine light borders.
- Two-column hero: left about 60%, right about 38%, separated by roughly 40px.
- Middle botanical banner: around 150px high.
- Growing timeline: warm cream surface, four even columns with arrow dividers.
- Benefit cards: two columns, approximately 225px tall.
- Checkout details sit further down the page, preserving the user's approved first screen.

These are targets rather than an automated pixel-diff guarantee.

## Interaction conventions

- Selecting 200g or 500g updates pack highlights, hero photograph and the enquiry form.
- Thumbnails switch the main product image without opening a modal or zoom overlay.
- Timeline buttons update active state, with keyboard arrow-key support; no extra explanatory line appears on click.
- Checkout scrolls to the WhatsApp enquiry form. Do not imply payment happens here.
- Motion is subtle; respect \`prefers-reduced-motion\`.
- Mobile stacks product photography and purchase controls, switches the growing timeline to a two-column grid, and stacks benefits.

## Images

Current code uses original product images and approved illustrative photographs from \`assets/approved/\`, loaded by \`comp.js\` when its manifest and images are available. Existing images remain safe fallbacks. The visuals are illustrative rather than verified photographs of particular delivered MicroSprouts packs.

Do not falsely label generated/illustrative imagery as a photograph of delivered MicroSprouts packs.

## Product rules that design must preserve

- 200g Week Supply: £9.99.
- 500g Family Pack: £16.99.
- London personal delivery: £2.30; usually Tuesday, Wednesday or Thursday.
- Collection free by appointment.
- Minimum six days' growth; site accepts preferred dates at least seven days ahead.
- SPROUT promotion: 20% off eligible one-time sprouts orders, delivery excluded.
- Checkout remains a WhatsApp enquiry, not a payment gateway.

## Additional pages (2026-10-27)

- `sprouts.html` — **More Sprouts**: broccoli, radish, mung bean and leek. Broccoli links to existing priced enquiries; the other varieties have separate WhatsApp availability enquiries without invented prices.
- `science.html` — **Science of Sprouts**: three independently linked scientific publications, with short summaries. The two link labels in the first two homepage benefit cards were removed. The third benefit card's "Read about the research" link goes to `science.html#sulforaphane`.
- `pages.css` and `pages.js` support both pages, retaining the MicroSprouts forest-green/cream visual language. Interior mobile navigation must remain accessible.
- On every page, navigation places **More Sprouts** immediately before **Science of Sprouts**, and the latter can grow as additional research is supplied.
- Keep species-specific imagery botanically accurate. Abstract letter artwork on new enquiry-only varieties is temporary; do not substitute broccoli imagery for radish, mung bean or leek.
