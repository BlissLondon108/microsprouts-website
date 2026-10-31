import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source=fs.readFileSync(path.join(import.meta.dirname,"../cart-preview.js"),"utf8");
let checks=0;
const check=(label,ok)=>{assert.ok(ok,label);checks++;console.log("✓ "+label)};
let document;
class Fake {
 constructor(tag="div"){
  this.tagName=tag;this.dataset={};this.listeners={};this.attributes={};
  this.hidden=false;this.value="";this.disabled=false;this.children=[];
  this._text="";this.classList={values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)}};
 }
 set textContent(v){this._text=String(v);this.children=[]}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join("")}
 addEventListener(k,fn){this.listeners[k]=fn}
 setAttribute(k,v){this.attributes[k]=String(v)}
 append(...nodes){
  for(const node of nodes){
   if(node.parentElement)node.parentElement.children=
     node.parentElement.children.filter(x=>x!==node);
   node.parentElement=this;this.children.push(node);
  }
 }
 replaceChildren(...nodes){
  for(const old of this.children)old.parentElement=null;
  this.children=[];this._text="";
  this.append(...nodes);
 }
 focus(){document.activeElement=this}
 getClientRects(){return [1]}
 closest(sel){
  let node=this;
  while(node){
   if(sel==="[data-entry-id]"&&node.dataset.entryId)return node;
   if(sel==="[data-remove-entry]"&&node.dataset.removeEntry)return node;
   if(sel==="[data-open-entry]"&&node.dataset.openEntry)return node;
   if(sel==="[data-sprout-add]"&&node.dataset.sproutAdd)return node;
   if(sel==="button[data-calendar-date]"&&node.dataset.calendarDate)return node;
   node=node.parentElement;
  }
  return null;
 }
 querySelectorAll(){return this.children}
 querySelector(sel){
  if(sel.startsWith("[data-calendar-date=")){
   const match=sel.match(/\[data-calendar-date="([^"]+)"\]/);
   return this.children.find(x=>x.dataset.calendarDate===match?.[1])||null;
  }
  return null;
 }
}
const ids=[
 "cart-overlay","open-cart","basket-flow-form","basket","basket-pay",
 "basket-total","basket-total-type","basket-total-note","basket-add-another",
 "basket-remove-entry","nav-cart-count","basket-date","basket-error","basket-empty","basket-start","basket-sprout-picker","basket-sprout-track","basket-sprout-prev","basket-sprout-next","basket-sprout-progress","basket-current-shipping",
 "basket-pack-200-price","basket-pack-500-price","basket-delivery-price",
 "basket-items-control","basket-stage","basket-current-item","basket-current-price","basket-shared-details",
 "basket-calendar-grid","basket-calendar-month","basket-calendar-prev","basket-calendar-next",
 "basket-date-label","basket-selected-pack","basket-selected-order","basket-selected-delivery",
 "basket-other-items","close-cart","checkout-button","basket-add-variety","basket-current-photo","basket-current-name"
];
const elements=new Map(ids.map(id=>[id,new Fake(id)]));
const el=id=>elements.get(id);
// Simulate real document connectivity: removing the reusable editor from
// its parent makes getElementById fail until the editor is reattached.
el("basket-other-items").append(el("basket-current-item"));
const sproutSlugs=["broccoli","radish","mung-bean","leek","mustard","fenugreek","alfalfa","green-pea"];
const sproutCards=sproutSlugs.map((slug,i)=>{
 const card=new Fake("article");card.dataset.sproutCard=slug;card.offsetLeft=220*i;return card;
});
const broccoliAdd=new Fake("button");
broccoliAdd.dataset.sproutAdd="broccoli";sproutCards[0].append(broccoliAdd);
const radishAdd=new Fake("button");radishAdd.dataset.sproutAdd="radish";sproutCards[1].append(radishAdd);
const sproutTrack=el("basket-sprout-track");
sproutTrack.append(...sproutCards);
sproutTrack.scrollLeft=0;
sproutTrack.querySelectorAll=selector=>selector==="[data-sprout-card]"?sproutCards:[];
sproutTrack.scrollTo=({left})=>{sproutTrack.scrollLeft=left;};
el("basket-sprout-picker").hidden=true;
el("cart-overlay").hidden=true;
el("checkout-button").dataset.pack="500";
el("checkout-button").dataset.frequency="once";
const stages=["pack","order","delivery","details"].map(id=>{
 const section=new Fake(id);section.dataset.basketStage=id;return section;
});
const packs=["200","500"].map(v=>{const b=new Fake("button");b.dataset.flowPack=v;return b});
const orders=["once","weekly"].map(v=>{const b=new Fake("button");b.dataset.flowOrder=v;return b});
const methods=["pickup","delivery"].map(v=>{const b=new Fake("button");b.dataset.flowMethod=v;return b});
const edits=["pack","order","delivery"].map(type=>{
 const b=el("basket-selected-"+type);b.dataset.editStep=type;return b;
});
stages.forEach((stage,i)=>{
 stage.querySelector=()=>[packs[0],orders[0],methods[0],el("basket-calendar-prev")][i];
});
el("basket-flow-form").querySelectorAll=sel=>{
 if(sel==="[data-basket-stage]")return stages;
 if(sel==="[data-flow-pack]")return packs;
 if(sel==="[data-flow-order]")return orders;
 if(sel==="[data-flow-method]")return methods;
 if(sel==="[data-edit-step]")return edits;
 return [];
};
el("basket-flow-form").querySelector=sel=>{
 const match=sel.match(/data-basket-stage="([^"]+)"/);
 return match?stages.find(x=>x.dataset.basketStage===match[1]):null;
};
el("basket").querySelectorAll=()=>[el("close-cart"),...packs,...orders,...methods,el("basket-pay")];
const openButtons=[el("checkout-button"),new Fake("once-card"),new Fake("weekly-card")];
const directButtons=[
 Object.assign(new Fake("button"),{dataset:{variety:"green-pea"}}),
 Object.assign(new Fake("button"),{dataset:{variety:"radish"}})
];
openButtons[1].dataset.frequency="once";openButtons[2].dataset.frequency="weekly";
const backdrop=new Fake("backdrop"),photo=new Fake("photo");
photo.complete=false;photo.naturalWidth=100;
photo.parentElement={classList:{add(k){photo.fallback=k}}};
let submitted=null,paymentUrl=null;
const saved=new Map();
saved.set("microsprouts-basket-entries-v2",JSON.stringify({entries:[
 {id:1,pack:"200",frequency:"once",method:"delivery"}],activeId:1,nextId:2}));
const sessionStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
document={
 activeElement:null,events:{},body:new Fake("body"),
 getElementById:id=>{
  if(id==="basket-current-item"&&
     !el("basket-other-items").children.includes(el("basket-current-item")))return null;
  return el(id)||null;
 },
 createElement:tag=>new Fake(tag),
 addEventListener(k,fn){this.events[k]=fn},
 querySelectorAll(sel){
  if(sel==="[data-cart-open]")return openButtons;
  if(sel==="[data-cart-close]")return [el("close-cart"),backdrop];
  if(sel==="[data-cart-add-variety]")return directButtons;
  if(sel===".sprout-orb__photo")return [photo];
  return [];
 }
};
const fetch=async(url,options={})=>{
 if(url==="/api/checkout/status")return {ok:true,json:async()=>({
  enabled:true,mode:"live",manual_order_handling:true,minimum_date:"2026-11-05"
 })};
 if(url==="/api/checkout/session"){
  submitted=JSON.parse(options.body);
  return {ok:true,json:async()=>({url:"https://checkout.stripe.com/c/pay/test"})};
 }
 throw Error("Unexpected request "+url);
};
vm.runInNewContext(source,{document,sessionStorage,fetch,location:{search:""},
 window:{location:{assign(url){paymentUrl=url}}},URLSearchParams,Date,Intl});
await new Promise(resolve=>setTimeout(resolve,0));
check("Nav basket opens truly empty while retaining its hidden editor in DOM",
 el("basket-other-items").children.length===1&&
 el("basket-other-items").children[0]===el("basket-current-item")&&
 !el("basket-empty").hidden&&
 el("basket-other-items").hidden&&
 el("nav-cart-count").textContent==="0"&&
 el("basket-total").textContent==="—"&&
 el("basket-pay").hidden);
el("open-cart").listeners.click();
check("Opening nav basket doesn't add broccoli or start checkout",
 !el("cart-overlay").hidden&&
 el("basket-other-items").children.length===1&&
 el("basket-other-items").hidden&&
 el("nav-cart-count").textContent==="0");
el("close-cart").listeners.click();
el("basket-start").listeners.click();
check("Add Sprouts opens the eight-variety picker without adding a product",
 !el("basket-sprout-picker").hidden&&
 el("basket-start").attributes["aria-expanded"]==="true"&&
 el("nav-cart-count").textContent==="0"&&
 el("basket-other-items").hidden&&
 el("basket-sprout-progress").textContent==="1 of 8"&&
 el("basket-sprout-prev").disabled&&
 !el("basket-sprout-next").disabled);
el("basket-sprout-next").listeners.click();
check("Carousel next arrow advances to radish, updating progress and scroll",
 el("basket-sprout-progress").textContent==="2 of 8"&&
 sproutTrack.scrollLeft===220);
sproutTrack.scrollLeft=1540;
sproutTrack.listeners.scroll();
check("Touch scrolling updates picker progress and arrow bounds",
 el("basket-sprout-progress").textContent==="8 of 8"&&
 el("basket-sprout-next").disabled);
el("basket-sprout-prev").listeners.click();
check("Previous arrow returns to alfalfa",
 el("basket-sprout-progress").textContent==="7 of 8"&&
 sproutTrack.scrollLeft===1320);
sproutTrack.listeners.click({target:broccoliAdd});
check("Selecting broccoli reveals the pack editor and updates badge",
 el("basket-empty").hidden&&!el("basket-other-items").hidden&&
 el("basket-sprout-picker").hidden&&
 !el("basket-remove-entry").hidden&&
 el("basket-other-items").children[0]===el("basket-current-item")&&
 document.getElementById("basket-current-item")===el("basket-current-item")&&
 el("nav-cart-count").textContent==="1"&&
 el("basket-total").textContent==="—"&&
 !stages[0].hidden);
el("basket-remove-entry").listeners.click();
check("Removing last unconfigured pack returns to empty without detaching editor",
 el("basket-other-items").children.length===1&&
 el("basket-other-items").children[0]===el("basket-current-item")&&
 document.getElementById("basket-current-item")===el("basket-current-item")&&
 !el("basket-empty").hidden&&
 el("nav-cart-count").textContent==="0");
el("checkout-button").focus();
el("checkout-button").listeners.click({preventDefault(){}});
check("Hero add-to-basket immediately opens visible product with live badge",
 !el("cart-overlay").hidden&&
 !el("basket-other-items").hidden&&
 el("nav-cart-count").textContent==="1"&&
 el("basket-current-price").textContent==="£16.99"&&
 el("basket-empty").hidden);
packs[1].listeners.click();orders[1].listeners.click();methods[1].listeners.click();
check("First item is 500g weekly UK shipping with an expanded price",
 el("basket-total").textContent==="£15.49"&&
 el("basket-current-price").textContent==="£15.49"&&
 !el("basket-current-price").hidden&&
 el("basket-current-shipping").textContent==="Shipping · Free"&&
 el("basket-delivery-price").textContent==="UK · Free"&&
 !el("basket-remove-entry").hidden);
const grid=el("basket-calendar-grid");
const available=grid.children.filter(button=>button.dataset.calendarDate&&!button.disabled);
check("Small single-line date strip appears at the shared details stage",
 !stages[3].hidden&&grid.children.length===4&&available.length===4);
check("Partial first week still shows four consecutive available dates",
 available.every(button=>[2,3,4,5].includes(new Date(button.dataset.calendarDate+"T12:00:00Z").getUTCDay()))&&
 grid.children.map(x=>x.dataset.calendarDate).join(",")==="2026-11-05,2026-11-06,2026-11-10,2026-11-11"&&
 el("basket-calendar-month").textContent==="November 2026");
el("basket-calendar-next").listeners.click();
check("Next arrow advances four available dates, not a partial calendar week",
 grid.children.length===4&&
 grid.children.map(x=>x.dataset.calendarDate).join(",")==="2026-11-12,2026-11-13,2026-11-17,2026-11-18");
el("basket-calendar-prev").listeners.click();
check("Previous arrow restores the four earliest choices",
 grid.children[0].dataset.calendarDate==="2026-11-05"&&el("basket-calendar-prev").disabled);
el("basket-add-another").listeners.click();
const list=el("basket-other-items");
check("Adding a second item leaves first product at top and editor at bottom",
 list.children.length===2&&list.children[0].textContent.includes("500g")&&
 list.children[1]===el("basket-current-item"));
check("Collapsed pack shows price, free shipping and top-right remove control",
 list.children[0].children[1].children[0].textContent==="Broccoli Sprouts"&&
 list.children[0].children[1].children[1].children[0].textContent==="£15.49"&&
 list.children[0].children[1].children[1].children[1].textContent==="Shipping · Free"&&
 list.children[0].children[2].dataset.removeEntry==="1");
packs[0].listeners.click();orders[0].listeners.click();methods[0].listeners.click();
check("Second item gets its own 200g one-time collection",
 el("basket-total").textContent==="£25.48"&&
 el("basket-current-price").textContent==="£9.99"&&
 el("basket-current-shipping").textContent==="Collection · Free"&&
 el("basket-selected-pack").textContent==="200g"&&
 el("nav-cart-count").textContent==="2");
const firstRow=list.children[0];
const firstHeading=firstRow.children[1];
el("basket-other-items").listeners.click({target:firstHeading});
check("Clicking anywhere in collapsed card opens that broccoli entry",
 !stages[2].hidden&&el("basket-selected-pack").textContent==="500g");
check("Expanding the first entry preserves its position above the second",
 list.children[0]===el("basket-current-item")&&
 list.children[1].textContent.includes("200g"));
methods[1].listeners.click();
const secondEdit=list.children[1].children[0].children[2];
el("basket-other-items").listeners.click({target:secondEdit});
check("Editing second item puts the editor back in second position, never on top",
 list.children[0].textContent.includes("500g")&&list.children[1]===el("basket-current-item"));
methods[1].listeners.click();
check("One-time UK shipping charges £2.30 once, shown beneath pack price",
 el("basket-total").textContent==="£27.78"&&
 el("basket-current-price").textContent==="£9.99"&&
 el("basket-current-shipping").textContent==="+ £2.30 shipping"&&
 el("basket-name")===undefined&&el("basket-email")===undefined&&
 el("basket-pay").textContent==="Continue to payment →");
const november10=el("basket-calendar-grid").children.find(x=>x.dataset.calendarDate==="2026-11-10");
el("basket-calendar-grid").listeners.click({target:november10});
check("Calendar click chooses a real date with no separate date input",
 el("basket-date").value==="2026-11-10"&&
 el("basket-date-label").textContent.includes("Tuesday"));
el("basket-flow-form").listeners.submit({preventDefault(){}});
await new Promise(resolve=>setTimeout(resolve,0));
check("Stripe gets both unique pack schedules and date but no customer details",
 submitted?.items?.length===2&&submitted.items[0].pack==="500"&&
 submitted.items[1].pack==="200"&&submitted.items[1].method==="delivery"&&
 submitted.name===undefined&&submitted.email===undefined&&
 submitted.date==="2026-11-10"&&submitted.address===undefined&&submitted.postcode===undefined&&
 paymentUrl==="https://checkout.stripe.com/c/pay/test");
check("Browser basket storage contains only pack selections",
 !saved.get("microsprouts-basket-entries-v3").includes("email")&&
 !saved.get("microsprouts-basket-entries-v3").includes("SE1"));
check("Active item exposes the top-right removal control",
 !el("basket-remove-entry").hidden&&
 typeof el("basket-remove-entry").listeners.click==="function");
el("basket-remove-entry").listeners.click();
check("Removing active item preserves first card and its settings",
 el("nav-cart-count").textContent==="1"&&el("basket-total").textContent==="£15.49");
el("basket-selected-order").listeners.click();
orders[0].listeners.click();methods[1].listeners.click();
check("One-time 500g shipping shows fee separately under £16.99",
 el("basket-current-price").textContent==="£16.99"&&
 el("basket-current-shipping").textContent==="+ £2.30 shipping"&&
 el("basket-total").textContent==="£19.29");
el("basket-add-another").listeners.click();
packs[0].listeners.click();orders[0].listeners.click();methods[1].listeners.click();
check("Shipping is charged only once across multiple one-time packs",
 el("basket-total").textContent==="£29.28"&&
 el("basket-current-price").textContent==="£9.99"&&
 el("basket-current-shipping").textContent==="Shipping · Included"&&
 el("basket-other-items").children[0].children[1].children[1].children[1].textContent==="+ £2.30 shipping");
el("basket-remove-entry").listeners.click();
el("basket-remove-entry").listeners.click();
check("Removing all packs leaves an empty basket with reusable editor intact",
 el("nav-cart-count").textContent==="0"&&
 el("basket-total").textContent==="—"&&
 !el("basket-empty").hidden&&el("basket-pay").hidden&&
 document.getElementById("basket-current-item")===el("basket-current-item"));
el("basket-start").listeners.click();
check("Picker reopens after emptying without auto-adding broccoli",
 el("nav-cart-count").textContent==="0"&&
 !el("basket-sprout-picker").hidden&&
 el("basket-sprout-progress").textContent==="1 of 8");
sproutTrack.listeners.click({target:broccoliAdd});
check("Choosing broccoli again works without refresh",
 el("nav-cart-count").textContent==="1"&&
 el("basket-empty").hidden&&
 !el("basket-other-items").hidden&&
 document.getElementById("basket-current-item")===el("basket-current-item"));
document.events.keydown({key:"Escape",preventDefault(){}});
check("Escape closes basket",el("cart-overlay").hidden);
photo.listeners.error();
check("Broken photo fallback remains",photo.hidden&&photo.fallback==="sprout-orb--photo-missing");
el("basket-remove-entry").listeners.click();
el("basket-start").listeners.click();
sproutTrack.listeners.click({target:radishAdd});
check("Choosing radish creates a distinctly named, priced basket entry",
 el("basket-current-name").textContent==="Radish Sprouts"&&
 el("basket-current-photo").src==="assets/sprout-orbs/radish.webp"&&
 el("nav-cart-count").textContent==="1");
packs[0].listeners.click();orders[0].listeners.click();methods[0].listeners.click();
check("Radish selection stores its variant and shows the approved pack price",
 JSON.parse(saved.get("microsprouts-basket-entries-v3")).entries[0].variety==="radish"&&
 el("basket-current-name").textContent==="Radish Sprouts"&&
 el("basket-total").textContent==="£9.99");
el("basket-add-variety").listeners.click();
check("Customers can choose additional varieties without removing their existing pack",
 !el("basket-sprout-picker").hidden&&el("nav-cart-count").textContent==="1");
directButtons[0].listeners.click();
check("Add to Basket creates green pea with size left to choose",
 !el("cart-overlay").hidden&&
 el("basket-current-name").textContent==="Green pea Sprouts"&&
 el("basket-selected-pack").hidden&&
 el("basket-total").textContent==="£9.99"&&
 !stages[0].hidden&&
 JSON.parse(saved.get("microsprouts-basket-entries-v3")).entries.at(-1).variety==="green-pea"&&
 JSON.parse(saved.get("microsprouts-basket-entries-v3")).entries.at(-1).pack===null);
packs[1].listeners.click();
check("Basket lets customers choose 500g after clicking Add to Basket",
 el("basket-selected-pack").textContent==="500g"&&
 el("basket-total").textContent==="£26.98"&&
 !stages[1].hidden);
orders[0].listeners.click();methods[0].listeners.click();
directButtons[1].listeners.click();
check("Add to Basket adds radish without choosing an arbitrary pack",
 el("nav-cart-count").textContent==="3"&&
 el("basket-current-name").textContent==="Radish Sprouts"&&
 !stages[0].hidden&&el("basket-selected-pack").hidden&&
 JSON.parse(saved.get("microsprouts-basket-entries-v3")).entries.at(-1).variety==="radish"&&
 JSON.parse(saved.get("microsprouts-basket-entries-v3")).entries.at(-1).pack===null&&
 el("basket-total").textContent==="£26.98");
packs[0].listeners.click();
check("Adding a 200g pack updates the mixed-variety total",
 el("basket-total").textContent==="£36.97"&&
 !stages[1].hidden);
console.log("\nOrdered basket + inline calendar tests passed: "+checks);
