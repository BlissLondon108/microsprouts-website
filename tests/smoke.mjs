import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("comp.css");
const app = read("comp.js");
const checkout = read("shop.js");
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
const required = ["interest-form","pack","qty","frequency","date","postcode","postcode-field","code","subtotal","deliveryfee","discountline","discount","total","datehint","promo-hint","form-message","whatsapp-fallback","hero-photo","checkout-button"];
check("Enquiry fields and gallery controls exist", required.every(id => idSet.has(id)));
check("Two pack selector options", (html.match(/class="package-option"/g)||[]).length === 2);
check("Four gallery thumbnails", (html.match(/class="gallery-thumb"/g)||[]).length === 4);
check("Four growth stages", (html.match(/class="growth-item"/g)||[]).length === 4);
const localAssetPaths = [...new Set([...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(m=>m[1]))];
check("Local images exist", localAssetPaths.every(src => fs.existsSync(path.join(root, src))));
check("Source JavaScript parses", (() => { try { new vm.Script(app); new vm.Script(checkout); return true; } catch { return false; } })());
check("Both product prices and delivery cost retained", [999,1699,230].every(n => checkout.includes(String(n))));
check("Seven day lead and Tuesday–Thursday delivery retained", checkout.includes("min.getUTCDate()+7") && checkout.includes("[2,3,4]"));
check("WhatsApp enquiry target retained", checkout.includes("https://wa.me/447386853514"));
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
const paymentClient=read("checkout.js");
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
  app.includes("hero?.classList.add('is-pack-photo')"));
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
