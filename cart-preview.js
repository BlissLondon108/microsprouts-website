/* Real in-page shopping basket: shares the existing Stripe checkout form
 * and Worker safeguards. Stripe alone takes payment; this script only opens
 * and configures the drawer.
 */
(() => {
 "use strict";
 const byId = id => document.getElementById(id);
 const overlay = byId("cart-overlay");
 const trigger = byId("open-cart");
 const form = byId("stripe-checkout-form");
 if (!overlay || !trigger || !form) return;
 const panel = overlay.querySelector(".cart-overlay__panel");
 const closeButton = byId("close-cart");
 const pack = byId("pack");
 const qty = byId("quantity");
 const frequency = byId("frequency");
 const badge = byId("nav-cart-count");
 let returnFocus = null;
 const changed = input => input.dispatchEvent(new Event("change",{bubbles:true}));
 const focusable = () => [...panel.querySelectorAll(
   "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])"
 )].filter(node => !node.closest("[hidden]"));
 function openCart(option = {}) {
   returnFocus = document.activeElement;
   if (["200","500"].includes(option.pack)) {
     pack.value = option.pack;
     changed(pack);
   }
   if (["once","weekly","fortnightly"].includes(option.frequency)) {
     frequency.value = option.frequency;
     changed(frequency);
   }
   overlay.hidden = false;
   document.body.classList.add("overlay-open");
   trigger.setAttribute("aria-expanded","true");
   closeButton.focus();
 }
 function closeCart() {
   if (overlay.hidden) return;
   overlay.hidden = true;
   trigger.setAttribute("aria-expanded","false");
   document.body.classList.remove("overlay-open");
   returnFocus?.focus?.();
 }
 trigger.addEventListener("click",()=>openCart());
 document.querySelectorAll("[data-cart-open]").forEach(button=>
   button.addEventListener("click",event=>{
     event.preventDefault();
     openCart({pack:button.dataset.pack||byId("checkout-button")?.dataset.pack||"200",
       frequency:button.dataset.frequency||"once"});
   }));
 document.querySelectorAll("[data-cart-close]").forEach(button=>
   button.addEventListener("click",closeCart));
 function updateBadge() {
   const n=Math.max(1,Math.min(10,Number(qty.value)||1));
   badge.textContent=String(n);
   trigger.setAttribute("aria-label","Open shopping basket, "+n+(n===1?" pack":" packs"));
 }
 qty.addEventListener("change",updateBadge);
 qty.addEventListener("input",updateBadge);
 updateBadge();
 document.addEventListener("keydown",event=>{
   if (overlay.hidden) return;
   if (event.key==="Escape") {
     event.preventDefault();closeCart();return;
   }
   if (event.key!=="Tab") return;
   const nodes=focusable();
   if (!nodes.length) return;
   const first=nodes[0],last=nodes[nodes.length-1];
   if (event.shiftKey && document.activeElement===first) {
     event.preventDefault();last.focus();
   } else if (!event.shiftKey && document.activeElement===last) {
     event.preventDefault();first.focus();
   }
 });
 // Fallback letters are displayed only when an actual illustrated sprout
 // photograph fails to load (never during normal image loading).
 document.querySelectorAll(".sprout-orb__photo").forEach(photo=>{
   const unavailable=()=>{photo.hidden=true;photo.parentElement?.classList.add("sprout-orb--photo-missing")};
   photo.addEventListener("error",unavailable);
   if(photo.complete&&!photo.naturalWidth)unavailable();
 });
})();
