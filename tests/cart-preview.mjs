import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source=fs.readFileSync(path.join(import.meta.dirname,"../cart-preview.js"),"utf8");
let checks=0;
const check=(label,condition)=>{assert.ok(condition,label);checks++;console.log("✓ "+label)};
let document;
class FakeElement{
  constructor(tag="div"){
    this.tagName=tag;this.children=[];this.dataset={};this.listeners={};
    this.attributes={};this.hidden=false;this.disabled=false;this._text="";
    this.className="";this.classList={
      values:new Set(),add(name){this.values.add(name)},remove(name){this.values.delete(name)},
      contains(name){return this.values.has(name)}
    };
  }
  set textContent(value){this._text=String(value);this.children=[]}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join("")}
  setAttribute(name,value){this.attributes[name]=String(value)}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes];this._text=""}
  addEventListener(name,fn){this.listeners[name]=fn}
  contains(node){return this===node||this.children.some(child=>child.contains(node))}
  closest(selector){
    if(selector==="button[data-pick-sku]"&&this.dataset.pickSku)return this;
    if(selector==="button[data-basket-sku]"&&this.dataset.basketSku)return this;
    return null;
  }
  querySelectorAll(){return this.children}
  querySelector(selector){return selector===".basket-preview__cta"?basketLink:null}
  focus(){document.activeElement=this}
}
const ids=[
  "basket-items","basket-count","basket-subtotal","basket-unpriced","basket-feedback",
  "open-cart","nav-cart-count","cart-overlay","close-cart","sprout-picker",
  "close-picker","sprout-picker-title","sprout-picker-description","sprout-picker-choices"
];
const dom=new Map(ids.map(id=>[id,new FakeElement(id)]));
const kinds=["broccoli","radish","mung","leek"];
const tiles=kinds.map(kind=>{
  const button=new FakeElement("button");button.dataset.sproutChoice=kind;return button
});
const storage=new Map();
const basketLink=new FakeElement("a");
const photos=Array.from({length:4},()=>new FakeElement("img"));
for(const photo of photos){photo.complete=false;photo.naturalWidth=180}
document={
  getElementById:id=>dom.get(id)||null,
  createElement:tag=>new FakeElement(tag),
  activeElement:null,
  body:new FakeElement("body"),
  listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn},
  querySelectorAll(selector){
    if(selector==="[data-sprout-choice]")return tiles;
    if(selector==="[data-cart-close]")return [dom.get("close-cart")];
    if(selector==="[data-picker-close]")return [dom.get("close-picker")];
    if(selector===".sprout-orb__photo")return photos;
    return [];
  }
};
dom.get("cart-overlay").hidden=true;
dom.get("sprout-picker").hidden=true;
const localStorage={
  getItem:key=>storage.get(key)||null,
  setItem:(key,value)=>storage.set(key,value)
};
vm.runInNewContext(source,{document,localStorage});
const get=id=>dom.get(id);
const count=()=>get("basket-count").textContent;
const amount=()=>get("basket-subtotal").textContent;
const select=(kind,index=0)=>{
  const tile=tiles[kinds.indexOf(kind)];
  tile.focus();tile.listeners.click();
  check(kind+" opens a variety picker",get("sprout-picker").hidden===false);
  const choice=get("sprout-picker-choices").children[index];
  get("sprout-picker-choices").listeners.click({target:choice});
};
check("Navigation basket starts empty",count()==="0"&&amount()==="£0.00"&&get("nav-cart-count").textContent==="0");
photos[0].listeners.error();
check("If an external mature vegetable photo fails, its circular fallback appears",photos[0].hidden===true);
photos[1].complete=true;photos[1].naturalWidth=0;
check("Image fallback is checked during initialisation",source.includes("photo.complete&&!photo.naturalWidth"));
get("open-cart").focus();get("open-cart").listeners.click();
check("Cart opens as an overlay and locks background scrolling",
  get("cart-overlay").hidden===false&&
  document.body.classList.contains("overlay-open")&&
  get("open-cart").attributes["aria-expanded"]==="true");
document.listeners.keydown({key:"Escape",preventDefault(){}});
check("Escape closes cart, unlocks scrolling, and restores focus",
  get("cart-overlay").hidden===true&&
  !document.body.classList.contains("overlay-open")&&
  document.activeElement===get("open-cart"));
get("open-cart").listeners.click();
basketLink.listeners.click();
check("Shop broccoli link closes drawer so chosen checkout is visible",
  get("cart-overlay").hidden===true&&!document.body.classList.contains("overlay-open"));
const broccoli=tiles[0];broccoli.focus();broccoli.listeners.click();
check("Broccoli displays precisely 200g and 500g choices before adding anything",
  get("sprout-picker-choices").children.length===2&&
  get("sprout-picker-choices").children[0].dataset.pickSku==="broccoli-200"&&
  get("sprout-picker-choices").children[1].dataset.pickSku==="broccoli-500"&&
  count()==="0");
get("close-picker").listeners.click();
check("Closing picker without choosing does not add an item",
  get("sprout-picker").hidden===true&&count()==="0"&&document.activeElement===broccoli);
select("broccoli",0);
check("200g broccoli adds £9.99, updates top badge and opens cart",
  count()==="1"&&amount()==="£9.99"&&
  get("nav-cart-count").textContent==="1"&&get("cart-overlay").hidden===false);
get("close-cart").listeners.click();
check("Returning from cart restores focus to selected circle",document.activeElement===broccoli);
select("broccoli",1);
check("500g broccoli is a separate £16.99 item",
  count()==="2"&&amount()==="£26.98");
get("close-cart").listeners.click();
select("radish");
check("Enquiry-only radish never adds an invented price",
  count()==="3"&&amount()==="£26.98"&&
  get("basket-unpriced").hidden===false&&
  get("basket-items").children[2].textContent.includes("Price on request"));
const plus=get("basket-items").children[0].children[1].children[2];
get("basket-items").listeners.click({target:plus});
check("Adding more broccoli updates quantity, subtotal and cart badge",
  count()==="4"&&amount()==="£36.97"&&get("nav-cart-count").textContent==="4");
const minus=get("basket-items").children[0].children[1].children[0];
get("basket-items").listeners.click({target:minus});
check("Removing one pack updates subtotal",count()==="3"&&amount()==="£26.98");
check("Only safe SKU and quantity information persists",
  JSON.parse(storage.get("microsprouts-basket-preview-v1"))["broccoli-200"]===1);
get("close-cart").listeners.click();
for(let i=0;i<15;i++){
  const tile=tiles[0];tile.listeners.click();
  get("sprout-picker-choices").listeners.click({target:get("sprout-picker-choices").children[0]});
  get("close-cart").listeners.click();
}
check("Each variety has a ten-item limit",
  JSON.parse(storage.get("microsprouts-basket-preview-v1"))["broccoli-200"]===10);
get("open-cart").listeners.click();
for(let i=0;i<10;i++){
  const remove=get("basket-items").children[0].children[1].children[0];
  get("basket-items").listeners.click({target:remove});
}
check("Removing the last broccoli 200g item removes the row",
  !JSON.parse(storage.get("microsprouts-basket-preview-v1"))["broccoli-200"]&&
  count()==="2");
check("Basket preview cannot take payments",!/checkout\/session|checkout\.stripe\.com|fetch\(/.test(source));
console.log("\nBasket overlay interaction tests passed: "+checks);
