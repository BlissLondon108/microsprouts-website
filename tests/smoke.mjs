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
check("Sulforaphane research link now navigates internally", html.includes('href="science.html#sulforaphane">Read about the research</a>') && idsFor(science).has("sulforaphane"));
check("Cross-page internal links resolve", Object.values(docs).every(markup => [...markup.matchAll(/href="((?:index|sprouts|science)\.html)(?:#([^"]+))?"/g)].every(m => !!docs[m[1]] && (!m[2] || idsFor(docs[m[1]]).has(m[2])))));
check("All new locally hosted images exist", [sprouts,science].every(markup => [...markup.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].every(m => fs.existsSync(path.join(root,m[1])))));
check("New menu script parses", (()=>{try{new vm.Script(pagesJs);return true}catch{return false}})());
check("Interior pages include responsive navigation and compact mobile layouts", pagesCss.includes(".interior-head.menu-open .comp-nav-links") && pagesCss.includes("@media(max-width:520px)") && css.includes("Five-item navigation"));

console.log("\nMicroSprouts static smoke tests passed: " + total);
