import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const source=fs.readFileSync(path.join(import.meta.dirname,"../cart-preview.js"),"utf8");
let checks=0;
const check=(label,ok)=>{assert.ok(ok,label);checks++;console.log("✓ "+label)};
const map=new Map();
let document;
class Fake {
 constructor(id){this.id=id;this.dataset={};this.listeners={};this.attributes={};this.hidden=false;
  this.value="";this.disabled=false;this.textContent="";this.required=false;this.min="";
  this.classList={values:new Set(),add(k){this.values.add(k)},remove(k){this.values.delete(k)}};
 }
 addEventListener(type,cb){this.listeners[type]=cb}
 setAttribute(k,v){this.attributes[k]=String(v)}
 focus(){document.activeElement=this}
 closest(){return null}
 getClientRects(){return [1]}
 querySelector(){return null}
 querySelectorAll(){return []}
}
function add(id){const x=new Fake(id);map.set(id,x);return x}
const ids=[
 "cart-overlay","open-cart","basket-flow-form","basket","basket-back","basket-pay",
 "basket-total","basket-total-type","basket-total-note","basket-item-count","basket-add-another",
 "basket-remove-one","nav-cart-count","basket-postcode-wrap","basket-postcode","basket-code",
 "basket-name","basket-email","basket-whatsapp","basket-date","basket-error",
 "basket-pack-200-price","basket-pack-500-price","basket-delivery-price",
 "basket-items-control","basket-selected-pack","basket-selected-order","basket-selected-delivery",
 "close-cart","checkout-button"
];
ids.forEach(add);
const el=id=>map.get(id);
el("cart-overlay").hidden=true;
el("checkout-button").dataset.pack="500";
el("checkout-button").dataset.frequency="once";
const stages=["pack","order","delivery","details"].map(id=>{
 const item=new Fake(id);item.dataset.basketStage=id;return item
});
const packButtons=["200","500"].map(size=>{const b=new Fake(size);b.dataset.flowPack=size;return b});
const orderButtons=["once","weekly"].map(type=>{const b=new Fake(type);b.dataset.flowOrder=type;return b});
const methodButtons=["pickup","delivery"].map(type=>{const b=new Fake(type);b.dataset.flowMethod=type;return b});
const editButtons=["pack","order","delivery"].map(type=>{
 const b=el("basket-selected-"+type);b.dataset.editStep=type;return b
});
for(const [s,b] of stages.map((x,i)=>[x,[packButtons[0],orderButtons[0],methodButtons[0],el("basket-name")][i]])){
 s.querySelector=()=>b;
}
el("basket-flow-form").querySelectorAll=sel=>{
 if(sel==="[data-basket-stage]")return stages;
 if(sel==="[data-flow-pack]")return packButtons;
 if(sel==="[data-flow-order]")return orderButtons;
 if(sel==="[data-flow-method]")return methodButtons;
 if(sel==="[data-edit-step]")return editButtons;
 return [];
};
el("basket-flow-form").querySelector=sel=>{
 const found=sel.match(/data-basket-stage="([^"]+)"/);return found?stages.find(s=>s.dataset.basketStage===found[1]):null;
};
el("basket").querySelectorAll=()=>[el("close-cart"),...packButtons,...orderButtons,...methodButtons,el("basket-email"),el("basket-pay")];
const addButtons=[el("checkout-button"),new Fake("once-card"),new Fake("weekly-card")];
addButtons[1].dataset.frequency="once";
addButtons[2].dataset.frequency="weekly";
const backdrop=new Fake("backdrop");
const photo=new Fake("photo");photo.complete=false;photo.naturalWidth=100;
photo.parentElement={classList:{add(k){photo.fallback=k}}};
let paymentUrl=null,submitted=null;
const store=new Map();
const sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
document={
 activeElement:null,events:{},body:new Fake("body"),
 getElementById:id=>el(id)||null,
 addEventListener(k,fn){this.events[k]=fn},
 querySelectorAll(sel){
  if(sel==="[data-cart-open]")return addButtons;
  if(sel==="[data-cart-close]")return [el("close-cart"),backdrop];
  if(sel===".sprout-orb__photo")return [photo];
  return [];
 }
};
const fetch=async (url,options={})=>{
 if(url==="/api/checkout/status")return {ok:true,json:async()=>({
 enabled:true,mode:"live",manual_order_handling:true,minimum_date:"2026-11-08"
 })};
 if(url==="/api/checkout/session"){submitted=JSON.parse(options.body);return {
 ok:true,json:async()=>({url:"https://checkout.stripe.com/c/pay/test"})
 }}
 throw Error("Unexpected network endpoint "+url);
};
vm.runInNewContext(source,{document,sessionStorage,fetch,location:{search:""},
 window:{location:{assign(url){paymentUrl=url}}},URLSearchParams,Date,Event:class Event{
 constructor(type){this.type=type}
}});
await new Promise(resolve=>setTimeout(resolve,0));
check("No pack selected and no checkout fields exposed on load",
 el("nav-cart-count").textContent==="0"&&
 !stages[0].hidden&&stages.slice(1).every(x=>x.hidden)&&
 el("basket-total").textContent==="—");
el("checkout-button").focus();
el("checkout-button").listeners.click({preventDefault(){}});
check("Checkout opens the in-page drawer starting with pack choice",
 !el("cart-overlay").hidden&&!stages[0].hidden&&document.activeElement===el("close-cart"));
packButtons[1].listeners.click();
check("Choosing Family Pack hides pack buttons and reveals only order type",
 stages[0].hidden&&!stages[1].hidden&&stages[2].hidden&&
 el("basket-total").textContent==="£16.99"&&
 el("nav-cart-count").textContent==="1");
orderButtons[1].listeners.click();
check("Weekly choice replaces order type with fulfilment",
 stages[1].hidden&&!stages[2].hidden&&
 el("basket-total").textContent==="£15.49"&&
 el("basket-delivery-price").textContent==="Free");
methodButtons[1].listeners.click();
check("Delivery choice reveals final details only and postcode is required",
 stages[2].hidden&&!stages[3].hidden&&
 !el("basket-postcode-wrap").hidden&&el("basket-postcode").required&&
 el("basket-total").textContent==="£15.49");
el("basket-add-another").listeners.click();
check("Add another broccoli pack increments count without quantity control",
 el("basket-item-count").textContent==="2 packs"&&
 el("nav-cart-count").textContent==="2"&&
 el("basket-total").textContent==="£30.98");
el("basket-remove-one").listeners.click();
check("Removing a pack restores the total",el("basket-total").textContent==="£15.49");
el("basket-selected-order").listeners.click();
check("Editing a completed choice returns to that specific button row",
 !stages[1].hidden&&stages[0].hidden&&stages[3].hidden);
orderButtons[0].listeners.click();methodButtons[1].listeners.click();
check("One-time delivery is exactly £2.30",
 el("basket-total").textContent==="£19.29"&&el("basket-delivery-price").textContent==="£2.30");
el("basket-code").value="SPROUT";el("basket-code").listeners.input();
check("One-time promo updates subtotal without altering weekly rates",
 el("basket-total").textContent==="£15.89");
el("basket-code").value="";
el("basket-date").value="2026-11-10";el("basket-name").value="Test Customer";
el("basket-email").value="test@example.com";el("basket-postcode").value="SE1 1AA";
el("basket-flow-form").listeners.submit({preventDefault(){}});
await new Promise(resolve=>setTimeout(resolve,0));
check("Final form submits the complete order directly to Stripe without another form page",
 submitted?.pack==="500"&&submitted?.quantity===1&&
 submitted?.frequency==="once"&&submitted?.method==="delivery"&&
 submitted?.postcode==="SE1 1AA"&&submitted?.return_to_basket===true&&
 paymentUrl==="https://checkout.stripe.com/c/pay/test");
document.events.keydown({key:"Escape",preventDefault(){}});
check("Escape closes drawer and restores focus",
 el("cart-overlay").hidden&&!document.body.classList.values.has("overlay-open")&&
 document.activeElement===el("checkout-button"));
photo.listeners.error();
check("Sprout photos still have fallbacks",photo.hidden&&photo.fallback==="sprout-orb--photo-missing");
console.log("\nCompact basket flow tests passed: "+checks);
