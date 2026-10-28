import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("comp.css");
const app = read("comp.js");
const cartClient = read("cart-preview.js");
const carouselClient = read("carousel-interaction.js");
const paymentClient = read("checkout.js");
const checkoutWorker = read("worker.js");
let total = 0;
function check(label, result) {
  total++;
  if (!result) throw new Error("FAIL: " + label);
  console.log("✓ " + label);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const idSet = new Set(ids);
check("No duplicate IDs", ids.length === idSet.size);
check("All in-page links resolve", [...html.matchAll(/href="#([^"]+)"/g)].every(m => idSet.has(m[1])));
const required = ["sprout-showcase-title","explore-sprouts","basket","basket-title","basket-count","basket-items","basket-subtotal","basket-unpriced","basket-feedback","hero-photo","checkout-button","open-cart","nav-cart-count","cart-overlay","close-cart","sprout-picker","sprout-picker-choices","sprout-picker-title","sprout-picker-description","close-picker"];
check("Navigation basket button and both dialogs are available",required.every(id=>idSet.has(id))&&
  html.includes('class="nav-cart" id="open-cart"')&&
  html.includes('class="cart-overlay" hidden')&&
  html.includes('class="sprout-picker" hidden')&&
  html.includes('role="dialog" aria-modal="true" aria-labelledby="basket-title"')&&
  html.includes('role="dialog" aria-modal="true" aria-labelledby="sprout-picker-title"'));
check("FAQ is a clean questions-only two-column layout",
  html.includes('class="faq-questions"')&&
  !html.slice(html.indexOf('<section class="faq"'),html.indexOf('</section>',html.indexOf('<section class="faq"'))).includes('class="basket-preview"')&&
  css.includes('grid-template-columns:minmax(220px,.76fr) minmax(320px,1.24fr)'));
check("Top Stripe checkout stays available while preview cannot create payments",
  html.includes('id="checkout-button" href="checkout.html?pack=200"')&&
  !html.includes("bottom-checkout-button")&&
  app.includes("checkout.href = 'checkout.html?pack='")&&
  paymentClient.includes('fetch("/api/checkout/status"')&&
  checkoutWorker.includes('if(await paymentMode(env)==="not-configured")return issue(')&&
  !cartClient.includes("/api/checkout")&&
  !cartClient.includes("checkout.stripe.com")&&
  !cartClient.includes("fetch("));
check("Sprout carousel presents four varieties, one tile per variety in each cycle",
  ["broccoli","radish","mung","leek"].every(sprout=>
    (html.match(new RegExp('data-sprout-choice="'+sprout+'"','g'))||[]).length===4)&&
  !html.includes('data-cart-sku=')&&
  (html.match(/class="sprout-marquee__group"/g)||[]).length===2&&
  html.includes('class="sprout-marquee__group" aria-hidden="true"')&&
  !html.includes('sprout-showcase__footer')&&
  !html.includes('Broccoli packs are ready to order')&&
  !html.includes('View your basket <span'));
check("Broccoli selector exposes the two real pack prices and avoids invented prices",
  cartClient.includes('options:["broccoli-200","broccoli-500"]')&&
  ["radish","mung","leek"].every(sprout=>cartClient.includes('options:["'+sprout+'"]'))&&
  cartClient.includes('Price on request')&&
  html.includes("Basket design preview only"));
check("Marquee continues rightward across the full page and respects reduced motion",
  css.includes("@keyframes microSproutsMoveRight{from{transform:translateX(-50%)}to{transform:translateX(0)}}")&&
  css.includes(".sprout-marquee:focus-within .sprout-marquee__track")&&
  css.includes("prefers-reduced-motion:reduce")&&
  css.includes('.sprout-marquee__group[aria-hidden="true"]{display:none}'));
check("Moving sprout carousel is swipeable by touch, mouse, trackpad and keyboard",
  html.includes("Discover distinctive flavours and natural goodness in every sprout.")&&
  html.includes("Swipe left or right to explore")&&
  html.includes('src="carousel-interaction.js?v=1"')&&
  css.includes("touch-action:pan-y")&&
  css.includes(".sprout-marquee.is-dragging")&&
  carouselClient.includes('marquee.addEventListener("pointerdown"')&&
  carouselClient.includes('marquee.addEventListener("pointermove"')&&
  carouselClient.includes('marquee.addEventListener("pointerup"')&&
  carouselClient.includes('marquee.addEventListener("pointercancel"')&&
  carouselClient.includes('marquee.addEventListener("wheel"')&&
  carouselClient.includes('marquee.addEventListener("keydown"')&&
  carouselClient.includes("event.stopImmediatePropagation()")&&
  !carouselClient.includes("Stripe"));
check("Narrow cart slides from the right without displacing top navigation links",
  css.includes('.comp-nav{position:relative}')&&
  css.includes('.comp-nav nav{margin-left:0}')&&
  css.includes('position:absolute;right:10px;top:10px;left:auto')&&
  css.includes('width:clamp(265px,21.5vw,340px)')&&
  css.includes('inset:auto 0 0 auto;top:0;right:0;bottom:0;left:auto')&&
  css.includes('@keyframes microCartEnter{from{transform:translateX(100%)}to{transform:translateX(0)}}')&&
  css.includes('width:min(88vw,355px)')&&
  cartClient.includes('event.key==="Escape"')&&
  cartClient.includes('event.key==="Tab"')&&
  cartClient.includes('focusables(dialog)'));
check("Carousel uses real mature-vegetable photo examples in the same circles",
  ["8538298","6761088","7420818","4965038"].every(id=>
    (html.match(new RegExp('pexels-photo-'+id+'\\.jpeg','g'))||[]).length===4)&&
  (html.match(/class="sprout-orb__photo"/g)||[]).length===16&&
  html.includes("Discover distinctive flavours and natural goodness in every sprout.")&&
  css.includes('.sprout-orb .sprout-orb__photo{')&&
  cartClient.includes('photo.addEventListener("error"')&&
  cartClient.includes("photo.hidden=true"));
check("Two pack selector options", (html.match(/class="package-option"/g)||[]).length === 2);
check("Four gallery thumbnails", (html.match(/class="gallery-thumb"/g)||[]).length === 4);
check("Four growth stages", (html.match(/class="growth-item"/g)||[]).length === 4);
const localAssetPaths = [...new Set([...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(m=>m[1]))];
check("Local images exist", localAssetPaths.every(src => fs.existsSync(path.join(root, src))));
check("Approved homepage photographs are direct, with no old-photo replacement pass",
  html.includes('src="assets/approved/seeds.webp"')&&
  html.includes('src="assets/approved/germination.webp"')&&
  html.includes('src="assets/approved/jar.webp"')&&
  html.includes('src="assets/approved/week.webp"')&&
  html.includes('src="assets/approved/woman.webp"')&&
  html.includes('src="assets/approved/macro.webp"')&&
  html.includes('src="assets/approved/toast.webp"')&&
  html.includes('id="hero-photo" class="is-pack-photo" src="assets/single-ornate-wide-v1.svg"')&&
  !html.includes('src="assets/day0.svg"')&&
  !html.includes('src="assets/day1.svg"')&&
  !app.includes("approved/manifest.json")&&
  !app.includes("dataset.fallbackUsed"));
check("Main photo and gallery load without any opacity fade or banner rewrite",
  !css.includes("is-switching")&&
  !css.includes("transition:opacity")&&
  css.includes('url("assets/approved/macro.webp") right 45%/cover')&&
  !css.includes("--approved-banner-photo")&&
  !app.includes("style.setProperty")&&
  app.includes("image.onload")&&
  app.includes("requestId")&&
  !app.includes("requestAnimationFrame"));
check("Checkout and basket JavaScript parse", (() => { try { new vm.Script(app); new vm.Script(cartClient); new vm.Script(carouselClient); new vm.Script(paymentClient); return true; } catch { return false; } })());
check("Both product prices and delivery cost retained", [999,1699,230].every(n => paymentClient.includes(String(n))));
check("Seven day lead and Tuesday–Thursday delivery retained",
  checkoutWorker.includes("d.setUTCDate(d.getUTCDate()+7)")&&
  checkoutWorker.includes("[2,3,4]"));
check("Retains customer support WhatsApp but no WhatsApp ordering form",
  html.includes('href="https://wa.me/447386853514"')&&
  !html.includes('whatsapp-fallback')&&
  !html.includes('Recurring billing is available through the separate sandbox'));
check("CSS includes mobile and reduced-motion rules", css.includes("@media(max-width:520px)") && css.includes("prefers-reduced-motion"));
check("Approved composition sections present", ["site-hero","banner","growth-section","benefits-section"].every(section => html.includes('class="'+section)));

// New collection and research pages
const sprouts = read("sprouts.html");
const science = read("science.html");
const pagesCss = read("pages.css");
const pagesJs = read("pages.js");
const docs = {"index.html":html, "sprouts.html":sprouts, "science.html":science};
const idsFor = markup => new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
check("New More Sprouts and Science pages render basic page structure", [sprouts,science].every(s => s.includes("<main>") && s.includes("</main>") && s.includes('href="pages.css"') && s.includes('src="pages.js"')));
for (const [name,markup] of Object.entries(docs)) {
  const list=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  check(name + ": no duplicate IDs", list.length === new Set(list).size);
  check(name + ": local hash links resolve", [...markup.matchAll(/href="#([^"]+)"/g)].every(m => list.includes(m[1])));
}
const navMatches = markup => /href="sprouts\.html"[^>]*>More Sprouts<\/a><\/li>\s*<li><a href="science\.html"[^>]*>Science of Sprouts<\/a>/.test(markup);
check("New navigation tabs in requested order on all pages", Object.values(docs).every(navMatches));
check("Four distinct collection varieties", (sprouts.match(/<article class="sprout-card"/g) || []).length === 4 && ["broccoli","radish","mung-bean","leek"].every(id => sprouts.includes('id="'+id+'"')));
check("Broccoli retains checkout link, price and pack size", sprouts.includes('href="index.html#products"') && ["£9.99","£16.99","200g","500g"].every(t => sprouts.includes(t)));
check("Other sprouts use unique WhatsApp availability enquiries", ["radish%20sprouts","mung%20bean%20sprouts","leek%20sprouts"].every(q => sprouts.includes(q)) && !sprouts.includes("£0.00"));
check("Three research articles link to verified originals", (science.match(/<article class="research-card"/g)||[]).length === 3 && ["https://pubmed.ncbi.nlm.nih.gov/9294217/","https://pmc.ncbi.nlm.nih.gov/articles/PMC5773831/","https://pubmed.ncbi.nlm.nih.gov/37650498/"].every(u => science.includes('href="'+u+'"')));
check("Two research links removed from homepage", !html.includes('>Read the original study</a>') && !html.includes('>Explore the nutritional research</a>'));
check("Benefit cards link to useful internal destinations", html.includes('href="science.html#glucoraphanin">Learn more</a>') && html.includes('href="sprouts.html#how-to-eat">How to add sprouts to your diet</a>') && idsFor(sprouts).has("how-to-eat"));
check("Sulforaphane research link now navigates internally", html.includes('href="science.html#sulforaphane">Read about the research</a>') && idsFor(science).has("sulforaphane"));
check("Cross-page internal links resolve", Object.values(docs).every(markup => [...markup.matchAll(/href="((?:index|sprouts|science)\.html)(?:#([^"]+))?"/g)].every(m => !!docs[m[1]] && (!m[2] || idsFor(docs[m[1]]).has(m[2])))));
check("All new locally hosted images exist", [sprouts,science].every(markup => [...markup.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].every(m => fs.existsSync(path.join(root,m[1])))));
check("New menu script parses", (()=>{try{new vm.Script(pagesJs);return true}catch{return false}})());
check("Interior pages include responsive navigation and compact mobile layouts", pagesCss.includes(".interior-head.menu-open .comp-nav-links") && pagesCss.includes("@media(max-width:520px)") && css.includes("Five-item navigation"));

// Checkout, recurring subscription offer and photo accessibility.
const paymentCheckout=read("checkout.html");
const catalog=read("stripe-catalog.js");
check("Homepage uses the new Single Pack name with Family Pack preserved",
  html.includes('>Single Pack</span>')&&html.includes('>Family Pack</span>')&&!html.includes('>Week Supply</span>'));
check("Hero displays the approved wide porcelain-plate image",
  html.includes('id="hero-photo" class="is-pack-photo" src="assets/single-ornate-wide-v1.svg"')&&
  html.includes('ornate cream-and-gold porcelain plate'));
check("Wide pack photos fill unchanged gallery without side panels",
  css.includes(".gallery-main img.is-pack-photo{object-fit:cover;object-position:center}")&&
  css.includes(".gallery-main{height:302px")&&
  !css.includes(".gallery-main:has(img.is-pack-photo)")&&
  app.includes("hero.classList.toggle('is-pack-photo', isPackPhoto)"));
const singlePhoto=path.join(root,"assets/single-ornate-v3.webp");
const familyPhoto=path.join(root,"assets/family-ornate-v3.webp");
check("Original approved product photos remain available",
  fs.existsSync(singlePhoto)&&fs.existsSync(familyPhoto)&&
  fs.readFileSync(singlePhoto).toString("base64")!==fs.readFileSync(familyPhoto).toString("base64"));
const singleWide=read("assets/single-ornate-wide-v1.svg");
const familyWide=read("assets/family-ornate-wide-v1.svg");
check("New wide photos embed original product and tabletop backgrounds",
  singleWide.includes('viewBox="0 0 2400 768"')&&
  familyWide.includes('viewBox="0 0 2400 768"')&&
  (singleWide.match(/data:image\/webp;base64,/g)||[]).length===2&&
  (familyWide.match(/data:image\/webp;base64,/g)||[]).length===2&&
  singleWide!==familyWide);
check("Checkout pack photos fill the cards without side bars",
  read("checkout.css").includes(".checkout-pack-choice img{width:100%;height:158px;object-fit:cover")&&
  read("checkout.css").includes(".checkout-product img{width:96px;height:91px;object-fit:contain"));
check("Checkout displays expanded Single and Family photos",
  paymentCheckout.includes('src="assets/single-ornate-wide-v1.svg"')&&
  paymentCheckout.includes('src="assets/family-ornate-wide-v1.svg"')&&
  app.includes('assets/single-ornate-wide-v1.svg')&&app.includes('assets/family-ornate-wide-v1.svg')&&
  paymentClient.includes('assets/single-ornate-v3.webp')&&
  paymentClient.includes('assets/family-ornate-v3.webp'));
check("Checkout shows both interactive pack photos and visible subscription savings",
  ["data-pack-choice=\"200\"","data-pack-choice=\"500\"","subscription-savings-row","subscription-perk"].every(x=>paymentCheckout.includes(x)));
check("Recurring UI prices and complimentary delivery are reflected in the customer-facing calculator",
  [899,1549,230].every(x=>paymentClient.includes(String(x)))&&
  paymentClient.includes('method()==="delivery"&&!recurring?230:0'));
check("Stripe catalogue uses new v2 recurring prices, preserving v1 one-time prices",
  catalog.includes('?"v2":"v1"')&&catalog.includes('subscriptionAmount:899')&&catalog.includes('subscriptionAmount:1549'));

console.log("\nMicroSprouts static smoke tests passed: " + total);
