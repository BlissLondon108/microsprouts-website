import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source=fs.readFileSync(path.join(import.meta.dirname,"../cart-preview.js"),"utf8");
let checks=0;
const check=(label,result)=>{assert.ok(result,label);checks++;console.log("✓ "+label)};
let document;
class Fake {
 constructor(tag="div"){
  this.tagName=tag;this.dataset={};this.listeners={};this.attributes={};
  this.hidden=false;this.value="";this.disabled=false;this.required=false;
  this.min="";this.complete=false;this.naturalWidth=100;this.children=[];
  this._text="";this.classList={values:new Set(),add(k){this.values.add(k)},remove(k){this.values.delete(k)}};
 }
 set textContent(value){this._text=String(value);this.children=[]}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join("")}
 addEventListener(k,fn){this.listeners[k]=fn}
 setAttribute(k,v){this.attributes[k]=String(v)}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes];this._text=""}
 focus(){document.activeElement=this}
 getClientRects(){return [1]}
 closest(selector){
  if(selector==="[data-entry-id]"&&this.dataset.entryId)return this;
  if(selector==="[data-remove-entry]"&&this.dataset.removeEntry)return this;
  return null;
 }
 querySelectorAll(){return this.children}
 querySelector(){return null}
}
const ids=[
 "cart-overlay","open-cart","basket-flow-form","basket","basket-back","basket-pay",
 "basket-total","basket-total-type","basket-total-note","basket-add-another",
 "basket-remove-entry","nav-cart-count","basket-postcode-wrap","basket-postcode",
 "basket-address-wrap","basket-address","basket-city-wrap","basket-city",
 "basket-name","basket-email","basket-date","basket-error",
 "basket-pack-200-price","basket-pack-500-price","basket-delivery-price",
 "basket-items-control","basket-selected-pack","basket-selected-order","basket-selected-delivery",
 "basket-other-items","close-cart","checkout-button"
];
const elements=new Map(ids.map(id=>[id,new Fake(id)]));
const el=id=>elements.get(id);
el("cart-overlay").hidden=true;
el("checkout-button").dataset.pack="500";
el("checkout-button").dataset.frequency="once";
el("basket-city").value="London";
const stages=["pack","order","delivery","details"].map(id=>{
 const section=new Fake(id);section.dataset.basketStage=id;return section;
});
const packButtons=["200","500"].map(v=>{const b=new Fake("button");b.dataset.flowPack=v;return b});
const orderButtons=["once","weekly"].map(v=>{const b=new Fake("button");b.dataset.flowOrder=v;return b});
const methodButtons=["pickup","delivery"].map(v=>{const b=new Fake("button");b.dataset.flowMethod=v;return b});
const editButtons=["pack","order","delivery"].map(type=>{
 const b=el("basket-selected-"+type);b.dataset.editStep=type;return b
});
stages.forEach((s,i)=>{
 s.querySelector=()=>[packButtons[0],orderButtons[0],methodButtons[0],el("basket-name")][i];
});
el("basket-flow-form").querySelectorAll=selector=>{
 if(selector==="[data-basket-stage]")return stages;
 if(selector==="[data-flow-pack]")return packButtons;
 if(selector==="[data-flow-order]")return orderButtons;
 if(selector==="[data-flow-method]")return methodButtons;
 if(selector==="[data-edit-step]")return editButtons;
 return [];
};
el("basket-flow-form").querySelector=selector=>{
 const match=selector.match(/data-basket-stage="([^"]+)"/);
 return match?stages.find(s=>s.dataset.basketStage===match[1]):null;
};
el("basket").querySelectorAll=()=>[el("close-cart"),...packButtons,...orderButtons,...methodButtons,el("basket-email"),el("basket-pay")];
const buttons=[el("checkout-button"),new Fake("once-card"),new Fake("weekly-card")];
buttons[1].dataset.frequency="once";buttons[2].dataset.frequency="weekly";
const backdrop=new Fake("backdrop"),photo=new Fake("photo");
photo.parentElement={classList:{add(key){photo.fallback=key}}};
let submitted=null,paymentUrl=null;
const saved=new Map();
const sessionStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
document={
 activeElement:null,events:{},body:new Fake("body"),
 getElementById:id=>el(id)||null,
 createElement:tag=>new Fake(tag),
 addEventListener(k,fn){this.events[k]=fn},
 querySelectorAll(selector){
  if(selector==="[data-cart-open]")return buttons;
  if(selector==="[data-cart-close]")return [el("close-cart"),backdrop];
  if(selector===".sprout-orb__photo")return [photo];
  return [];
 }
};
const fetch=async (url,options={})=>{
 if(url==="/api/checkout/status")return {ok:true,json:async()=>({
 enabled:true,mode:"live",manual_order_handling:true,minimum_date:"2026-11-08"
 })};
 if(url==="/api/checkout/session"){
  submitted=JSON.parse(options.body);
  return {ok:true,json:async()=>({url:"https://checkout.stripe.com/c/pay/test"})};
 }
 throw Error("Unexpected request: "+url);
};
vm.runInNewContext(source,{document,sessionStorage,fetch,location:{search:""},
 window:{location:{assign(url){paymentUrl=url}}},URLSearchParams,Date});
await new Promise(resolve=>setTimeout(resolve,0));
check("Initial basket has no selected product",el("nav-cart-count").textContent==="0"&&
 !stages[0].hidden&&el("basket-total").textContent==="—");
el("checkout-button").focus();
el("checkout-button").listeners.click({preventDefault(){}});
check("Hero checkout opens the first pack editor",
 !el("cart-overlay").hidden&&!stages[0].hidden);
packButtons[1].listeners.click();
check("Family pack chip appears above product with no Edit text",
 el("basket-selected-pack").textContent==="500g"&&!el("basket-selected-pack").textContent.includes("edit")&&
 !stages[1].hidden);
orderButtons[1].listeners.click();methodButtons[1].listeners.click();
check("First entry is an independent 500g weekly delivery",
 el("basket-total").textContent==="£15.49"&&
 el("basket-total-note").textContent==="£15.49 / week after today"&&
 el("basket-delivery-price").textContent==="London · Free");
el("basket-add-another").listeners.click();
check("Add another creates an unconfigured second product, not a quantity increment",
 !stages[0].hidden&&el("nav-cart-count").textContent==="1"&&
 el("basket-other-items").children.length===1&&
 el("basket-other-items").children[0].textContent.includes("500g")&&
 el("basket-total").textContent==="£15.49");
packButtons[0].listeners.click();orderButtons[0].listeners.click();methodButtons[0].listeners.click();
check("Second entry has its own 200g one-time collection settings",
 el("basket-total").textContent==="£25.48"&&
 el("basket-total-note").textContent==="£15.49 / week after today"&&
 el("nav-cart-count").textContent==="2"&&
 el("basket-selected-pack").textContent==="200g"&&
 el("basket-selected-order").textContent==="One-time");
const stored=JSON.parse(saved.get("microsprouts-basket-entries-v2"));
check("Both entries are separately persisted without personal information",
 stored.entries.length===2&&stored.entries[0].pack==="500"&&
 stored.entries[1].pack==="200"&&
 !saved.get("microsprouts-basket-entries-v2").includes("email"));
el("basket-selected-delivery").listeners.click();
methodButtons[1].listeners.click();
check("One-time London delivery fee is charged once alongside free weekly delivery",
 el("basket-total").textContent==="£27.78"&&
 !el("basket-postcode-wrap").hidden&&
 !el("basket-address-wrap").hidden&&
 !el("basket-city-wrap").hidden);
const previous=el("basket-other-items").children[0];
const firstPackChip=previous.children[0].children[0];
el("basket-other-items").listeners.click({target:firstPackChip});
check("Tapping previous entry's chip activates its own editor",
 !stages[0].hidden&&el("basket-selected-pack").textContent==="500g");
packButtons[0].listeners.click();orderButtons[1].listeners.click();methodButtons[1].listeners.click();
check("Editing first size changes only first entry and recalculates both totals",
 el("basket-total").textContent==="£21.28"&&
 el("basket-total-note").textContent==="£8.99 / week after today");
packButtons[1].listeners.click();orderButtons[1].listeners.click();methodButtons[1].listeners.click();
el("basket-date").value="2026-11-10";
el("basket-name").value="Test Customer";
el("basket-email").value="test@example.com";
el("basket-postcode").value="SE1 1AA";
el("basket-address").value="12 Sprout Street";
const shippingOptions=el("basket-date").children.map(option=>option.value).filter(Boolean);
check("Shipping date selector contains Tuesday–Friday, not Monday or weekends",
 shippingOptions.length>0&&
 shippingOptions.every(iso=>[2,3,4,5].includes(new Date(iso+"T12:00:00Z").getUTCDay()))&&
 shippingOptions.includes("2026-11-13")&&
 !shippingOptions.includes("2026-11-14"));
el("basket-flow-form").listeners.submit({preventDefault(){}});
await new Promise(resolve=>setTimeout(resolve,0));
check("Stripe receives two individually configured line items, not quantity=2",
 submitted?.items?.length===2&&
 submitted.items[0].pack==="500"&&submitted.items[0].frequency==="weekly"&&
 submitted.items[0].method==="delivery"&&
 submitted.items[1].pack==="200"&&submitted.items[1].frequency==="once"&&
 submitted.items[1].method==="delivery"&&
 submitted.quantity===undefined&&
 submitted.address==="12 Sprout Street"&&submitted.city==="London"&&
 submitted.code===""&&submitted.whatsapp===""&&
 submitted.return_to_basket===true&&
 paymentUrl==="https://checkout.stripe.com/c/pay/test");
el("basket-remove-entry").listeners.click();
check("Remove active entry leaves other entry independently configured",
 el("nav-cart-count").textContent==="1"&&
 el("basket-total").textContent==="£12.29");
el("basket-selected-delivery").listeners.click();
methodButtons[0].listeners.click();
const collectionDates=el("basket-date").children.map(option=>option.value).filter(Boolean);
check("Collection hides all shipping address fields",
 el("basket-postcode-wrap").hidden&&el("basket-address-wrap").hidden&&
 el("basket-city-wrap").hidden&&
 !el("basket-postcode").required&&!el("basket-address").required&&!el("basket-city").required&&
 collectionDates.some(iso=>new Date(iso+"T12:00:00Z").getUTCDay()===1));
document.events.keydown({key:"Escape",preventDefault(){}});
check("Escape closes basket",el("cart-overlay").hidden);
photo.listeners.error();
check("Broken photo fallback remains",photo.hidden&&photo.fallback==="sprout-orb--photo-missing");
console.log("\nMulti-entry basket tests passed: "+checks);
