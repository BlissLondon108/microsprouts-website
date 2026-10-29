/* Progressive in-page MicroSprouts checkout.
 * Only Stripe Checkout takes money. Product prices and fulfilment terms
 * mirror the existing Worker. No sensitive customer data is stored locally.
 */
(() => {
 "use strict";
 const el=id=>document.getElementById(id);
 const overlay=el("cart-overlay");
 const trigger=el("open-cart");
 const form=el("basket-flow-form");
 if(!overlay||!trigger||!form)return;
 const panel=el("basket"),back=el("basket-back"),pay=el("basket-pay");
 const stages=["pack","order","delivery","details"];
 const prices={once:{"200":999,"500":1699},weekly:{"200":899,"500":1549}};
 const state={pack:null,frequency:null,method:null,count:1,stage:"pack"};
 const storeKey="microsprouts-basket-order-v1";
 let enabled=false,working=false,returnFocus=null;
 const money=p=>"£"+(p/100).toFixed(2);
 const setText=(id,text)=>{el(id).textContent=text};
 function save(){
   try{sessionStorage.setItem(storeKey,JSON.stringify({
     pack:state.pack,frequency:state.frequency,method:state.method,count:state.count
   }))}catch{}
 }
 try{
   const saved=JSON.parse(sessionStorage.getItem(storeKey)||"null");
   if(saved&&["200","500"].includes(saved.pack)){
     state.pack=saved.pack;
     if(["once","weekly"].includes(saved.frequency))state.frequency=saved.frequency;
     if(["pickup","delivery"].includes(saved.method))state.method=saved.method;
     if(Number.isInteger(saved.count)&&saved.count>=1&&saved.count<=10)state.count=saved.count;
     state.stage=state.method?"details":state.frequency?"delivery":"order";
   }
 }catch{}
 const showError=text=>{
   const target=el("basket-error");target.textContent=text;target.hidden=!text;
 };
 const focusable=()=>[...panel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),summary')].filter(e=>!e.closest("[hidden]")&&e.getClientRects().length);
 const total=()=>{
   if(!state.pack)return null;
   const each=prices[state.frequency||"once"][state.pack];
   const goods=each*state.count;
   const code=el("basket-code").value.trim().toUpperCase();
   const discount=state.frequency==="once"&&code==="SPROUT"?Math.round(goods*.2):0;
   const delivery=state.method==="delivery"&&state.frequency!=="weekly"?230:0;
   return goods-discount+delivery;
 };
 function render(){
   form.querySelectorAll("[data-basket-stage]").forEach(section=>{
     section.hidden=section.dataset.basketStage!==state.stage;
   });
   const values={
     pack:state.pack?state.pack+"g":null,
     order:state.frequency==="weekly"?"Weekly":state.frequency==="once"?"One-time":null,
     delivery:state.method==="pickup"?"Collection":state.method==="delivery"?"Delivery":null
   };
   for(const [key,value] of Object.entries(values)){
     const button=el("basket-selected-"+key);button.hidden=!value;
     if(value)button.textContent=value+" · edit";
   }
   el("basket-items-control").hidden=!state.pack;
   setText("basket-item-count",state.count+" "+(state.count===1?"pack":"packs"));
   el("basket-remove-one").hidden=state.count<=1;
   el("basket-add-another").disabled=state.count>=10;
   el("nav-cart-count").textContent=state.pack?String(state.count):"0";
   trigger.setAttribute("aria-label","Open shopping basket, "+(state.pack?state.count:0)+" packs");
   setText("basket-pack-200-price",money(prices[state.frequency||"once"]["200"]));
   setText("basket-pack-500-price",money(prices[state.frequency||"once"]["500"]));
   setText("basket-delivery-price",state.frequency==="weekly"?"Free":"£2.30");
   const sum=total();
   setText("basket-total",sum===null?"—":money(sum));
   setText("basket-total-type",state.frequency==="weekly"?"Weekly total":"Order total");
   setText("basket-total-note",!state.pack?"Choose a pack to begin":
     [state.count+" × "+state.pack+"g",state.frequency==="weekly"?"Weekly":"One-time",
      state.method==="pickup"?"Collection":state.method==="delivery"?"Delivery":""].filter(Boolean).join(" · "));
   el("basket-postcode-wrap").hidden=state.method!=="delivery";
   el("basket-postcode").required=state.method==="delivery";
   el("basket-code").disabled=state.frequency==="weekly";
   if(state.frequency==="weekly")el("basket-code").value="";
   const details=state.stage==="details";
   pay.hidden=!details;
   pay.disabled=!details||!enabled||working;
   pay.textContent=working?"Connecting securely…":"Continue to secure payment →";
   back.hidden=state.stage==="pack";
 }
 function setStage(stage,focus=true){
   if(!stages.includes(stage))return;
   state.stage=stage;showError("");render();
   if(focus){
     const section=form.querySelector('[data-basket-stage="'+stage+'"]');
     (section?.querySelector("button,input")||el("basket-back")).focus();
   }
 }
 function openCart(options={}){
   returnFocus=document.activeElement;
   if(["200","500"].includes(options.pack)){
     state.pack=options.pack;
   }
   if(["once","weekly"].includes(options.frequency)){
     state.frequency=options.frequency;
   }
   // With new entry points the shopper confirms the pack first.
   if(options.reset)state.stage="pack";
   else if(!state.pack)state.stage="pack";
   overlay.hidden=false;document.body.classList.add("overlay-open");
   trigger.setAttribute("aria-expanded","true");
   render();el("close-cart").focus();
 }
 function closeCart(){
   if(overlay.hidden)return;
   overlay.hidden=true;document.body.classList.remove("overlay-open");
   trigger.setAttribute("aria-expanded","false");
   returnFocus?.focus?.();
 }
 trigger.addEventListener("click",()=>openCart());
 document.querySelectorAll("[data-cart-open]").forEach(button=>button.addEventListener("click",event=>{
   event.preventDefault();
   openCart({
     pack:button.dataset.pack||el("checkout-button")?.dataset.pack,
     frequency:button.dataset.frequency,
     reset:true
   });
 }));
 document.querySelectorAll("[data-cart-close]").forEach(button=>button.addEventListener("click",closeCart));
 form.querySelectorAll("[data-flow-pack]").forEach(button=>button.addEventListener("click",()=>{
   state.pack=button.dataset.flowPack;
   save();setStage("order");
 }));
 form.querySelectorAll("[data-flow-order]").forEach(button=>button.addEventListener("click",()=>{
   state.frequency=button.dataset.flowOrder;
   save();setStage("delivery");
 }));
 form.querySelectorAll("[data-flow-method]").forEach(button=>button.addEventListener("click",()=>{
   state.method=button.dataset.flowMethod;
   save();setStage("details");
 }));
 form.querySelectorAll("[data-edit-step]").forEach(button=>button.addEventListener("click",()=>{
   setStage(button.dataset.editStep);
 }));
 back.addEventListener("click",()=>setStage(stages[Math.max(0,stages.indexOf(state.stage)-1)]));
 el("basket-add-another").addEventListener("click",()=>{
   state.count=Math.min(10,state.count+1);save();render();
 });
 el("basket-remove-one").addEventListener("click",()=>{
   state.count=Math.max(1,state.count-1);save();render();
 });
 el("basket-code").addEventListener("input",render);
 document.addEventListener("keydown",event=>{
   if(overlay.hidden)return;
   if(event.key==="Escape"){event.preventDefault();closeCart();return;}
   if(event.key!=="Tab")return;
   const elements=focusable();if(!elements.length)return;
   if(event.shiftKey&&document.activeElement===elements[0]){
     event.preventDefault();elements.at(-1).focus();
   }else if(!event.shiftKey&&document.activeElement===elements.at(-1)){
     event.preventDefault();elements[0].focus();
   }
 });
 const validUKPostcode=s=>/^(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i.test(s);
 function validDate(s){
   if(!s||s<el("basket-date").min)return false;
   const d=new Date(s+"T12:00:00Z");
   if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)return false;
   if(state.method==="delivery"&&![2,3,4].includes(d.getUTCDay()))return false;
   return true;
 }
 function values(){
   return {
     pack:state.pack,quantity:state.count,frequency:state.frequency,
     method:state.method,date:el("basket-date").value,
     postcode:el("basket-postcode").value.trim(),
     code:el("basket-code").value.trim().toUpperCase(),
     name:el("basket-name").value.trim(),email:el("basket-email").value.trim(),
     whatsapp:el("basket-whatsapp").value.trim(),
     return_to_basket:true
   };
 }
 function validate(v){
   if(!["200","500"].includes(v.pack)||!["once","weekly"].includes(v.frequency))return "Choose your pack and order type.";
   if(!["pickup","delivery"].includes(v.method))return "Choose collection or delivery.";
   if(!validDate(v.date))return "Choose a date at least seven days ahead. Delivery is Tuesday to Thursday.";
   if(v.method==="delivery"&&!validUKPostcode(v.postcode))return "Enter a valid UK delivery postcode.";
   if(v.name.length<2||v.name.length>100)return "Please enter your full name.";
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))return "Enter a valid email address.";
   if(v.whatsapp&&!/^\+?[\d\s()\-]{7,28}$/.test(v.whatsapp))return "Please check your WhatsApp number.";
   if(v.code&&v.code!=="SPROUT")return "The promo code is not recognised.";
   if(v.code&&v.frequency!=="once")return "SPROUT is only for one-time orders.";
   return "";
 }
 form.addEventListener("submit",async event=>{
   event.preventDefault();
   if(working)return;
   if(!enabled){showError("Secure payment is currently unavailable. Please try again later.");return;}
   const input=values(),error=validate(input);
   if(error){showError(error);return;}
   working=true;render();showError("");
   try{
     const response=await fetch("/api/checkout/session",{
       method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)
     });
     const payload=await response.json();
     if(!response.ok||typeof payload.url!=="string"||!payload.url.startsWith("https://checkout.stripe.com/"))
       throw Error(payload.error||"Unable to connect to Stripe.");
     window.location.assign(payload.url);
   }catch(error){
     working=false;render();showError(error.message||"Unable to open secure payment.");
   }
 });
 async function status(){
   try{
     const response=await fetch("/api/checkout/status",{cache:"no-store"});
     const data=await response.json();
     enabled=response.ok&&data.enabled===true&&
       (data.mode==="test"||(data.mode==="live"&&data.manual_order_handling===true));
     if(/^\d{4}-\d{2}-\d{2}$/.test(data.minimum_date||""))
       el("basket-date").min=data.minimum_date;
   }catch{enabled=false;}
   if(!el("basket-date").min){
     // Safe client fallback; backend still enforces the lead time in London.
     const dt=new Date();dt.setUTCDate(dt.getUTCDate()+7);
     el("basket-date").min=dt.toISOString().slice(0,10);
   }
   render();
 }
 // Returning from Stripe should restore the compact details flow.
 const params=new URLSearchParams(location.search);
 if(params.get("checkout_cancelled")==="1"){
   openCart({pack:params.get("pack"),frequency:params.get("frequency")});
   state.stage=state.method?"details":state.frequency?"delivery":"order";
   render();showError("Payment cancelled. No charge was made.");
 }
 render();status();
 // Show image initials only for missing photos, not while loading.
 document.querySelectorAll(".sprout-orb__photo").forEach(photo=>{
   const fail=()=>{photo.hidden=true;photo.parentElement?.classList.add("sprout-orb--photo-missing")};
   photo.addEventListener("error",fail);
   if(photo.complete&&!photo.naturalWidth)fail();
 });
})();
