import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const sproutsDetails = read("sprouts.html");
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
const required=["checkout-button","open-cart","nav-cart-count","cart-overlay","close-cart","basket","basket-title",
 "stripe-checkout-form","checkout-state","pack","quantity","frequency","date","postcode","code",
 "name","email","whatsapp","pay-button","checkout-message","subtotal","total","deliveryfee",
 "subscription-disclosure","subscription-perk","subscription-savings-row","discount-row","sprout-scroll",
 "order-options","explore-sprouts"];
check("Real in-page shopping basket contains every essential Stripe checkout field",
 required.every(id=>idSet.has(id))&&
 html.includes('id="basket" role="dialog" aria-modal="true"')&&
 html.includes('id="stripe-checkout-form"')&&
 html.includes('id="checkout-button"')&&
 html.includes('data-cart-open data-frequency="once"')&&
 html.includes('data-cart-open data-frequency="weekly"')&&
 !html.includes('href="checkout.html?pack=200&amp;frequency=once"')&&
 !html.includes('href="checkout.html?pack=200&amp;frequency=weekly"'));
check("Ordering choices appear above the static sprout gallery",
 html.indexOf('id="order-options"')<html.indexOf('id="explore-sprouts"')&&
 html.indexOf('id="explore-sprouts"')<html.indexOf('id="faq"')&&
 (html.match(/<article class="order-choice-card/g)||[]).length===3&&
 ["One-time order","Weekly subscription","Custom subscription"].every(x=>html.includes(x))&&
 html.includes("https://wa.me/447386853514?text=Hello%20MicroSprouts%21"));
check("Product circles remain links to matching sprout information",
 ["broccoli","radish","mung-bean","leek"].every(name=>
 html.includes('class="sprout-tile" href="sprouts.html#'+name+'"'))&&
 !html.includes('data-sprout-choice')&&
 !html.includes("animation:microSproutsMoveRight"));
check("Drawer keeps pack prices, date and delivery rules from secure checkout",
 paymentClient.includes('fetch("/api/checkout/status"')&&
 paymentClient.includes('fetch("/api/checkout/session"')&&
 checkoutWorker.includes('if(await paymentMode(env)==="not-configured")return issue(')&&
 ["200","500","once","weekly","fortnightly"].every(x=>html.includes('value="'+x+'"'))&&
 html.includes('id="subscription-disclosure"')&&
 html.includes('id="discount-row"')&&
 html.includes('id="postcode-field"')&&
 html.includes('href="manage-subscription.html"')&&
 html.includes('src="checkout.js?v=drawer-1"')&&
 html.includes('href="basket-checkout.css?v=1"'));
check("Hero and order options open drawer rather than taking customers to a second form",
 html.includes('id="checkout-button" aria-label="Open shopping basket')&&
 cartClient.includes('document.querySelectorAll("[data-cart-open]")')&&
 cartClient.includes('frequency.value = option.frequency')&&
 cartClient.includes('pack.value = option.pack')&&
 cartClient.includes('closeCart()')&&
 !app.includes("checkout.href = 'checkout.html?pack='"));
check("Drawer has a narrow responsive layout and supports keyboard use",
 css.includes('width:clamp(265px,21.5vw,340px)')&&
 read("basket-checkout.css").includes('width:min(490px,100vw)')&&
 cartClient.includes('event.key==="Escape"')&&
 cartClient.includes('event.key!=="Tab"'));
check("Generated sprout collection is manually navigable",
 html.includes('src="carousel-interaction.js?v=2"')&&
 css.includes('scroll-snap-type:x proximity')&&
 carouselClient.includes('viewport.scrollBy({left: delta, behavior:"smooth"})')&&
 !carouselClient.includes("getAnimations"));
check("Standalone checkout remains intact as a direct fallback",
 read("checkout.html").includes('id="stripe-checkout-form"')&&
 read("checkout.html").includes('src="checkout.js?v=stripe-only-live-1"'));
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
