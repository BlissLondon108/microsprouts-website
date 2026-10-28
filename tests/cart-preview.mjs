import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source=fs.readFileSync(path.join(import.meta.dirname,"../cart-preview.js"),"utf8");
let count=0;
const check=(label,ok)=>{assert.ok(ok,label);console.log("✓ "+label);count++};
class FakeElement {
  constructor(tag="div"){
    this.tagName=tag;this.children=[];this.dataset={};this.listeners={};
    this.attributes={};this.hidden=false;this.disabled=false;this._text="";
  }
  set textContent(value){this._text=String(value);this.children=[]}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join("")}
  setAttribute(name,value){this.attributes[name]=String(value)}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes];this._text=""}
  addEventListener(name,fn){this.listeners[name]=fn}
  contains(node){return this===node||this.children.some(child=>child.contains(node))}
  closest(selector){return selector==="button[data-basket-sku]"&&this.dataset.basketSku?this:null}
}
const ids=["basket-items","basket-count","basket-subtotal","basket-unpriced","basket-feedback"];
const dom=new Map(ids.map(id=>[id,new FakeElement()]));
const skuList=["broccoli-200","broccoli-500","radish","mung","leek"];
const tiles=skuList.map(sku=>{const tile=new FakeElement("button");tile.dataset.cartSku=sku;return tile});
const saved=new Map();
const document={
  getElementById:id=>dom.get(id)||null,
  createElement:tag=>new FakeElement(tag),
  querySelectorAll:selector=>selector==="[data-cart-sku]"?tiles:[]
};
const localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
vm.runInNewContext(source,{document,localStorage});
const get=id=>dom.get(id);
check("Preview starts empty",get("basket-count").textContent==="0"&&get("basket-subtotal").textContent==="£0.00");
tiles[0].listeners.click();
check("Broccoli single adds the known £9.99 price",
  get("basket-count").textContent==="1"&&get("basket-subtotal").textContent==="£9.99");
tiles[1].listeners.click();
check("Broccoli family adds £16.99 without replacing first pack",
  get("basket-count").textContent==="2"&&get("basket-subtotal").textContent==="£26.98");
tiles[2].listeners.click();
check("Unpriced radish joins preview but subtotal stays unchanged",
  get("basket-count").textContent==="3"&&get("basket-subtotal").textContent==="£26.98"&&
  get("basket-unpriced").hidden===false);
const radish=get("basket-items").children[2];
check("Unpriced varieties clearly say price on request",
  radish.textContent.includes("Price on request"));
const plus=get("basket-items").children[0].children[1].children[2];
get("basket-items").listeners.click({target:plus});
check("Basket quantity increment updates total",
  get("basket-count").textContent==="4"&&get("basket-subtotal").textContent==="£36.97");
const minus=get("basket-items").children[0].children[1].children[0];
get("basket-items").listeners.click({target:minus});
check("Basket quantity decrement updates total",
  get("basket-count").textContent==="3"&&get("basket-subtotal").textContent==="£26.98");
check("Only SKU quantities are persisted",JSON.parse(saved.get("microsprouts-basket-preview-v1"))["broccoli-200"]===1);
for(let i=0;i<15;i++)tiles[0].listeners.click();
check("Quantity cannot exceed 10",JSON.parse(saved.get("microsprouts-basket-preview-v1"))["broccoli-200"]===10);
for(let i=0;i<10;i++){
  const remove=get("basket-items").children[0].children[1].children[0];
  get("basket-items").listeners.click({target:remove});
}
check("Removing final pack clears the corresponding basket row",
  !JSON.parse(saved.get("microsprouts-basket-preview-v1"))["broccoli-200"]&&
  get("basket-count").textContent==="2");
check("The basket code has no Stripe payment or session creation",
  !/checkout\/session|checkout\.stripe\.com|fetch\(/.test(source));
console.log("\nBasket preview interaction tests passed: "+count);
