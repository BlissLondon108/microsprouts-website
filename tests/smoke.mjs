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
const flowCss=read("basket-flow.css");
const required=["checkout-button","open-cart","nav-cart-count","cart-overlay","close-cart","basket","basket-title",
 "basket-flow-form","basket-pack-label","basket-order-label","basket-delivery-label",
 "basket-current-price","basket-total","basket-pay","basket-date","basket-calendar-grid",
 "basket-calendar-month","basket-calendar-prev","basket-calendar-next","basket-date-label",
 "basket-other-items","basket-empty","basket-start","basket-sprout-picker","basket-sprout-track","basket-sprout-prev","basket-sprout-next","basket-sprout-progress","basket-current-shipping","basket-add-another","basket-shared-details",
 "basket-remove-entry","sprout-scroll","order-options","explore-sprouts"];
check("Cart starts genuinely empty until a shopper adds broccoli",
 cartClient.includes('const state={entries:[],activeId:null,stage:"pack",nextId:1}')&&
 cartClient.includes('const storeKey="microsprouts-basket-entries-v3"')&&
 html.includes('id="basket-empty"')&&html.includes('Your basket is empty.')&&
 html.includes('id="basket-start"')&&
 cartClient.includes('if(options.add)addEntry(options)')&&
 cartClient.includes('el("basket-start").addEventListener("click"')&&
 cartClient.includes('state.entries=state.entries.filter(entry=>entry.id!==id)'));
check("Add Sprouts opens an accessible eight-variety carousel, without selling unpriced varieties",
 html.includes('>Add Sprouts <span')&&
 html.includes('id="basket-sprout-picker"')&&
 (html.match(/data-sprout-card="/g)||[]).length===8&&
 html.includes('data-sprout-add="broccoli"')&&
 (html.match(/class="basket-sprout-card__action" href="https:\/\/wa\.me\//g)||[]).length===7&&
 cartClient.includes('const sproutCards=[...sproutTrack.querySelectorAll("[data-sprout-card]")]')&&
 cartClient.includes('sproutTrack.addEventListener("scroll"')&&
 cartClient.includes('sproutTrack.addEventListener("click"')&&
 cartClient.includes('if(button?.dataset.sproutAdd!=="broccoli")return;')&&
 flowCss.includes('.basket-flow [hidden]{display:none!important}')&&
 flowCss.includes('scroll-snap-type:x mandatory'));
check("Pack banners show product price and fee without double-counting shipping",
 html.includes('id="basket-current-shipping"')&&
 cartClient.includes('const shippingLine=entry=>')&&
 cartClient.includes('"+ £2.30 shipping"')&&
 cartClient.includes('"Collection · Free"')&&
 cartClient.includes('"Shipping · Free"')&&
 cartClient.includes('const charged=state.entries.find(')&&
 cartClient.includes('delivery=valid.some(')&&
 !html.includes('Continue to secure payment')&&
 html.includes('>Continue to payment <span'));
check("Multi-entry basket keeps the four minimal decision stages",
 required.every(id=>idSet.has(id))&&
 ["pack","order","delivery","details"].every(stage=>
   html.includes('data-basket-stage="'+stage+'"'))&&
 html.includes('id="basket" role="dialog" aria-modal="true"')&&
 (html.match(/class="basket-flow__choice"/g)||[]).length===6&&
 !html.includes('id="quantity"')&&
 !html.includes('id="basket-item-count"')&&
 !html.includes('id="stripe-checkout-form"')&&
 !html.includes('class="checkout-alert"')&&
 !html.includes('class="checkout-summary"')&&
 html.includes('src="cart-preview.js?v=13"')&&
 html.includes('href="basket-flow.css?v=9"'));
check("Chips appear before active broccoli heading and never say Edit",
 html.indexOf('id="basket-selections"')<html.indexOf('class="basket-flow__product"')&&
 cartClient.includes('button.textContent=label')&&
 !cartClient.includes('label+" · edit"')&&
 !html.includes('1 pack</span>')&&
 cartClient.includes('button.setAttribute("aria-label","Change "+label)'));
check("Adding broccoli creates independent entries with size, frequency, method and removal",
 cartClient.includes('const makeEntry=id=>({id,pack:null,frequency:null,method:null})')&&
 cartClient.includes('state.entries.push(entry)')&&
 cartClient.includes('state.activeId=entry.id')&&
 cartClient.includes('const entry=active()')&&
 cartClient.includes('renderOther()')&&
 cartClient.includes('data-entry-id')&&
 cartClient.includes('data-remove-entry')&&
 cartClient.includes('state.entries=state.entries.filter(entry=>entry.id!==id)'));
check("Basket allows mixed weekly and one-time checkout with one payment",
 cartClient.includes('items:state.entries.map(item=>({pack:item.pack,frequency:item.frequency,method:item.method}))')&&
 cartClient.includes('fetch("/api/checkout/session"')&&
 checkoutWorker.includes('const createBasketSession=async(input,request,env)=>')&&
 checkoutWorker.includes('if(Object.hasOwn(input,"items"))return createBasketSession')&&
 checkoutWorker.includes('hasWeekly?"subscription":"payment"')&&
 checkoutWorker.includes('basket_entries:encoded')&&
 checkoutWorker.includes('input.return_to_basket===true')&&
 cartClient.includes('return_to_basket:true'));
check("Multi-entry basket shows due-today and weekly renewal totals with correct prices",
 cartClient.includes('once:{"200":999,"500":1699}')&&
 cartClient.includes('weekly:{"200":899,"500":1549}')&&
 cartClient.includes('money(amounts.weekly)+" / week after today"')&&
 cartClient.includes('state.method==="delivery"')===false&&
 checkoutWorker.includes('entries.some(item=>item.method==="delivery"&&item.frequency==="once")?DELIVERY_PENCE:0')&&
 cartClient.includes('calc()'));
check("Only the preferred date is collected in the basket, with identity at Stripe",
 !html.includes('id="basket-name"')&&!html.includes('id="basket-email"')&&
 !html.includes('id="basket-shipping-notice"')&&
 html.includes('id="basket-date" type="hidden"')&&
 html.includes('id="basket-shared-details"')&&
 html.indexOf('id="basket-shared-details"')>html.indexOf('id="basket-items-control"')&&
 !html.includes('id="basket-postcode"')&&
 !html.includes('id="basket-address"')&&
 !html.includes('id="basket-city"')&&
 !html.includes('id="basket-code"')&&
 !html.includes('id="basket-whatsapp"')&&
 html.includes('id="checkout-button" aria-label="Open shopping basket')&&
 html.includes('data-cart-open data-frequency="once"')&&
 html.includes('data-cart-open data-frequency="weekly"')&&
 !app.includes("checkout.href = 'checkout.html?pack='")&&
 flowCss.includes('width:min(480px,100vw)')&&
 cartClient.includes('event.key==="Escape"'));
check("One-row calendar offers only Tuesday–Friday across browsable weeks",
 html.includes('class="basket-flow__calendar"')&&
 html.includes('id="basket-calendar-grid"')&&
 html.includes('id="basket-calendar-month" class="basket-flow__month-name"')&&
 html.includes('id="basket-calendar-prev"')&&
 html.includes('id="basket-calendar-next"')&&
 cartClient.includes('const allowedDay=day=>[2,3,4,5].includes(day.getUTCDay())')&&
 cartClient.includes('for(let i=0;i<=90;i++)')&&
 cartClient.includes('const shown=dates.slice(dateOffset,dateOffset+4)')&&
 cartClient.includes('renderCalendar()')&&
 checkoutWorker.includes('[2,3,4,5].includes(d.getUTCDay())'));
check("Stripe collects a single UK shipping address for all delivery entries",
 !html.includes('id="basket-shipping-notice"')&&
 checkoutWorker.includes('put(form,"name_collection[individual][enabled]","true")')&&
 checkoutWorker.includes('put(form,"name_collection[individual][optional]","false")')&&
 !cartClient.includes('el("basket-name")')&&!cartClient.includes('el("basket-email")')&&
 checkoutWorker.includes('put(form,"shipping_address_collection[allowed_countries][0]","GB")')&&
 checkoutWorker.includes('session.collected_information?.shipping_details')&&
 read("checkout.js").includes('Enter a full UK shipping address and city.')&&
 read("checkout.html").includes('id="shipping-address-fields"')&&
 read("checkout.js").includes('el("shipping-address-fields").hidden=method()!=="delivery"'));
check("Stripe shows preferred first date and shipping/collection beside payment",
 checkoutWorker.includes('put(form,"custom_text[submit][message]"')&&
 checkoutWorker.includes('put(form,"custom_text[shipping_address][message]"')&&
 checkoutWorker.includes('const orderSummary=entries.map(itemSummary).join("; ")')&&
 checkoutWorker.includes('preferred_date_readable:readableDate')&&
 checkoutWorker.includes('fulfilment:fulfilment,order_summary:orderSummary')&&
 checkoutWorker.includes('put(form,"payment_intent_data[description]"')&&
 checkoutWorker.includes('put(form,"subscription_data[description]"'));
check("A tap anywhere on a minimized pack expands it without reordering",
 html.includes('id="basket-current-item"')&&
 !html.includes('id="basket-back"')&&
 cartClient.includes('article.dataset.openEntry=String(entry.id)')&&
 cartClient.includes('const row=event.target.closest("[data-open-entry]")')&&
 cartClient.includes('expandEntry(Number(row.dataset.openEntry))')&&
 cartClient.includes('el("basket-other-items").addEventListener("keydown"')&&
 cartClient.includes('if(event.key!=="Enter"&&event.key!==" ")return;'));
check("Expanded broccoli pack also has a top-right remove button",
 html.includes('class="basket-flow__mini-remove basket-flow__current-remove" id="basket-remove-entry"')&&
 html.indexOf('id="basket-remove-entry"')<html.indexOf('id="basket-selections"')&&
 flowCss.includes('.basket-flow__current{position:relative}')&&
 flowCss.includes('.basket-flow__current-remove{')&&
 cartClient.includes('el("basket-remove-entry").addEventListener("click",()=>removeEntry(state.activeId))'));
check("Collapsed pack price sits beside its name, with remove button at upper right",
 cartClient.includes('appendNode(cost,"strong","basket-flow__previous-price"')&&
 cartClient.includes('appendNode(article,"button","basket-flow__mini-remove"')&&
 flowCss.includes('.basket-flow__previous-price{')&&
 flowCss.includes('position:static;font-size:clamp(20px,4.2vw,25px)')&&
 flowCss.includes('.basket-flow__mini-remove{')&&
 flowCss.includes('position:absolute;top:6px;right:7px'));
check("Expanded pack also shows its live recalculated price beside product title",
 html.includes('id="basket-current-price"')&&
 html.includes('class="basket-flow__product-name"')&&
 cartClient.includes('currentPrice.hidden=!entry.pack')&&
 cartClient.includes('currentPrice.textContent=money(prices[entry.frequency||"once"][entry.pack])')&&
 flowCss.includes('.basket-flow__current-price{')&&
 flowCss.includes('font-weight:800!important'));
check("Small month header replaces Your details, with four consecutive available days",
 !html.includes('id="basket-details-label"')&&
 !html.includes('>Your details</h3>')&&
 !html.includes('basket-flow__calendar-caption')&&
 html.includes('id="basket-calendar-month" class="basket-flow__month-name"')&&
 cartClient.includes('function availableDates()')&&
 cartClient.includes('if(allowedDay(day))dates.push(isoDate(day))')&&
 cartClient.includes('const shown=dates.slice(dateOffset,dateOffset+4)')&&
 flowCss.includes('.basket-flow__month-heading{'));
check("Date and shared details are below all items; total remains below them",
 html.indexOf('id="basket-shared-details"')>html.indexOf('id="basket-items-control"')&&
 html.indexOf('id="basket-shared-details"')<html.indexOf('class="basket-flow__footer"')&&
 flowCss.includes('grid-template-columns:25px minmax(0,1fr) 25px')&&
 flowCss.includes('grid-template-columns:repeat(4,minmax(0,1fr))')&&
 flowCss.includes('.basket-flow__shared{')&&
 flowCss.includes('max-height:min(50vh,305px)')&&
 !html.includes('id="basket-back"'));
check("Editing an earlier pack does not reorder its entry",
 html.includes('id="basket-current-item"')&&
 html.includes('id="basket-other-items"')&&
 cartClient.includes('for(const entry of state.entries)')&&
 cartClient.includes('box.append(current)')&&
 cartClient.includes('state.entries.push(entry)')&&
 !cartClient.includes('if(entry.id===state.activeId)continue;'));
check("Sprout packs are visually separated by broccoli-green backgrounds",
 html.includes('id="basket-current-item"')&&
 flowCss.includes('.basket-flow__previous-item{')&&
 flowCss.includes('border-bottom:4px solid')&&
 flowCss.includes('.basket-flow__current{')&&
 flowCss.includes('.basket-flow__field--name'));
check("Three order choices remain above manual sprout gallery",
 html.indexOf('id="order-options"')<html.indexOf('id="explore-sprouts"')&&
 html.indexOf('id="explore-sprouts"')<html.indexOf('id="faq"')&&
 (html.match(/<article class="order-choice-card/g)||[]).length===3&&
 ["One-time order","Weekly subscription","Custom subscription"].every(x=>html.includes(x))&&
 html.includes("https://wa.me/447386853514?text=Hello%20MicroSprouts%21")&&
 ["broccoli","radish","mung-bean","leek"].every(name=>
  html.includes('class="sprout-tile" href="sprouts.html#'+name+'"'))&&
 html.includes('src="carousel-interaction.js?v=2"')&&
 carouselClient.includes('viewport.scrollBy({left: delta, behavior:"smooth"})'));
check("Legacy standalone checkout remains unchanged",
 read("checkout.html").includes('id="stripe-checkout-form"')&&
 read("checkout.html").includes('src="checkout.js?v=stripe-only-live-3"'));
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
check("Seven day lead and Tue–Fri UK dates retained",
  checkoutWorker.includes("d.setUTCDate(d.getUTCDate()+7)")&&
  checkoutWorker.includes("[2,3,4,5]"));
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
check("All eight varieties appear on More Sprouts", (sprouts.match(/<article class="sprout-card"/g) || []).length === 8 && ["broccoli","radish","mung-bean","leek","mustard","fenugreek","alfalfa","green-pea"].every(id => sprouts.includes('id="'+id+'"')));
check("Redundant notes removed and the approved glowing hero replaces the jar",
 !sprouts.includes('Broccoli packs are available through our secure checkout.')&&
 !sprouts.includes('All varieties are subject to growing schedules')&&
 sprouts.includes('class="ms-orb-scene"')&&
 !sprouts.includes('Small seeds. Fresh beginnings.'));
check("Broccoli retains checkout link, price and pack size", sprouts.includes('href="index.html#products"') && ["£9.99","£16.99","200g","500g"].every(t => sprouts.includes(t)));
check("All seven unpriced varieties retain direct WhatsApp enquiries", ["radish%20sprouts","mung%20bean%20sprouts","leek%20sprouts","mustard%20sprouts","fenugreek%20sprouts","alfalfa%20sprouts","green%20pea%20sprouts"].every(q => sprouts.includes(q)) && !sprouts.includes("£0.00"));
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

check("More Sprouts hero uses the eight approved botanical glow spheres", 
 (sproutsDetails.match(/class="ms-orb-link"/g)||[]).length===8 &&
 sproutsDetails.includes('sprouts-orbs.css?v=2')&&sproutsDetails.includes('sprouts-orbs.js?v=2')&&
 read('sprouts-orbs.css').includes('prefers-reduced-motion:reduce')&&
 read('sprouts-orbs.js').includes('pointermove')&&
 ['broccoli','radish','mung-bean','leek','mustard','fenugreek','alfalfa','green-pea']
 .every(name=>fs.existsSync(path.join(root,'assets','sprout-orbs',name+'.webp'))));

check("Orb artwork has no opaque secondary glass disk, and unnecessary counter is removed",
 !sproutsDetails.includes('ms-orb-eyebrow')&&
 !sproutsDetails.includes('Explore the collection')&&
 !read('sprouts-orbs.css').includes('backdrop-filter')&&
 read('sprouts-orbs.css').includes('background:transparent')&&
 read('sprouts-orbs.css').includes('.ms-orb-link::after{content:none}'));
check("Animated orbs use bounded collision physics instead of CSS drift",
 read('sprouts-orbs.js').includes('requestAnimationFrame')&&
 read('sprouts-orbs.js').includes('const separate=elastic=>')&&
 read('sprouts-orbs.js').includes('const within=s=>')&&
 read('sprouts-orbs.js').includes('prefers-reduced-motion: reduce')&&
 !read('sprouts-orbs.css').includes('@keyframes ms-orb-drift'));
