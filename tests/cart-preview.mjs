import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const source=fs.readFileSync(path.join(import.meta.dirname,"../cart-preview.js"),"utf8");
let n=0;
const check=(label,ok)=>{assert.ok(ok,label);console.log("✓ "+label);n++};
let document;
class Fake {
 constructor(id){this.id=id;this.value="";this.dataset={};this.handlers={};
 this.attributes={};this.hidden=false;this.complete=false;this.naturalWidth=1;
 this.classSet=new Set();this.classList={add:k=>this.classSet.add(k),remove:k=>this.classSet.delete(k)};
 }
 addEventListener(type,fn){this.handlers[type]=fn}
 setAttribute(k,v){this.attributes[k]=String(v)}
 dispatchEvent(e){this.handlers[e.type]?.(e)}
 focus(){document.activeElement=this}
 closest(){return null}
 querySelectorAll(){return []}
 querySelector(sel){return sel===".cart-overlay__panel"?elements.get("panel"):null}
}
const keys=["cart-overlay","open-cart","stripe-checkout-form","panel","close-cart","pack","quantity",
 "frequency","nav-cart-count","checkout-button"];
const elements=new Map(keys.map(k=>[k,new Fake(k)]));
const get=id=>elements.get(id);
get("cart-overlay").hidden=true;
get("pack").value="200";get("quantity").value="1";get("frequency").value="once";
get("checkout-button").dataset.pack="500";
get("checkout-button").dataset.frequency="once";
get("checkout-button").dataset.cartOpen="";
const once=new Fake("once"),weekly=new Fake("weekly");
once.dataset.frequency="once";weekly.dataset.frequency="weekly";
const backdrop=new Fake("backdrop");
let changes=0;
get("pack").addEventListener("change",()=>changes++);
get("frequency").addEventListener("change",()=>changes++);
const photo=new Fake("photo");
photo.parentElement={classList:{add(name){photo.failedClass=name}}};
const focusNodes=[get("close-cart"),get("pack"),get("quantity"),get("frequency")];
get("panel").querySelectorAll=()=>focusNodes;
document={
 getElementById:id=>get(id)||null,
 activeElement:null,events:{},
 body:new Fake("body"),
 addEventListener(type,fn){this.events[type]=fn},
 querySelectorAll(sel){
  if(sel==="[data-cart-open]")return [get("checkout-button"),once,weekly];
  if(sel==="[data-cart-close]")return [get("close-cart"),backdrop];
  if(sel===".sprout-orb__photo")return [photo];
  return [];
 }
};
class SimEvent{constructor(type){this.type=type}}
vm.runInNewContext(source,{document,Event:SimEvent});
check("Existing quantity is represented on navigation basket badge",
 get("nav-cart-count").textContent==="1"&&get("open-cart").attributes["aria-label"].includes("1 pack"));
let prevented=0;
get("checkout-button").focus();
get("checkout-button").handlers.click({preventDefault(){prevented++}});
check("Hero Checkout opens drawer with selected Family Pack",
 !get("cart-overlay").hidden&&get("pack").value==="500"&&
 get("frequency").value==="once"&&prevented===1&&changes>=2);
check("Opening basket locks background scroll and moves focus to close button",
 document.body.classSet.has("overlay-open")&&document.activeElement===get("close-cart"));
const keydown=document.events.keydown;
keydown({key:"Escape",preventDefault(){prevented++}});
check("Escape closes basket and restores focus",get("cart-overlay").hidden&&
 !document.body.classSet.has("overlay-open")&&
 document.activeElement===get("checkout-button"));
weekly.focus();weekly.handlers.click({preventDefault(){prevented++}});
check("Weekly ordering card opens drawer and preselects recurring billing",
 !get("cart-overlay").hidden&&get("frequency").value==="weekly"&&get("pack").value==="500");
get("quantity").value="3";get("quantity").handlers.input();
check("Quantity updates the cart badge",get("nav-cart-count").textContent==="3");
document.activeElement=get("frequency");
keydown({key:"Tab",shiftKey:false,preventDefault(){prevented++}});
check("Keyboard tab wraps within dialog",document.activeElement===get("close-cart"));
document.activeElement=get("close-cart");
keydown({key:"Tab",shiftKey:true,preventDefault(){prevented++}});
check("Shift-tab wraps to last control",document.activeElement===get("frequency"));
get("close-cart").handlers.click();
check("Close button unlocks page, preserving form selections",
 get("cart-overlay").hidden&&get("frequency").value==="weekly"&&get("quantity").value==="3");
photo.handlers.error();
check("Unavailable generated photograph has a fallback",photo.hidden===true&&
 photo.failedClass==="sprout-orb--photo-missing");
check("Payment is handled by existing checkout.js, not drawer UI code",
 !source.includes("/api/checkout/session")&&!source.includes("checkout.stripe.com"));
console.log("\nBasket checkout drawer tests passed: "+n);
