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
console.log("\nMicroSprouts static smoke tests passed: " + total);
