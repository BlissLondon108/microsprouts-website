(()=>{"use strict";
const form=document.getElementById("stripe-checkout-form");if(!form)return;
const el=id=>document.getElementById(id);
const money=value=>"£"+(value/100).toFixed(2);
let enabled=false,working=false;
const pack=el("pack"),qty=el("quantity"),frequency=el("frequency"),date=el("date"),postcode=el("postcode"),code=el("code");
const method=()=>form.querySelector('input[name="method"]:checked')?.value||"pickup";
const basePrice=()=>pack.value==="500"?1699:999;
const subscriptionPrice=()=>pack.value==="500"?1549:899;
const isPromo=()=>frequency.value==="once"&&code.value.trim().toUpperCase()==="SPROUT";
const count=()=>Math.max(1,Math.min(10,Number(qty.value)||1));
const getValues=()=>({pack:pack.value,quantity:count(),frequency:frequency.value,
 method:method(),date:date.value,postcode:postcode.value.trim(),
 code:code.value.trim().toUpperCase(),return_to_basket:Boolean(el("cart-overlay")),name:el("name").value.trim(),
 email:el("email").value.trim(),whatsapp:el("whatsapp").value.trim()});
function update(){
 const n=count(),base=basePrice(),recurring=frequency.value!=="once";
 const sproutSubtotal=base*n;
 const subscriptionSaving=recurring?(base-subscriptionPrice())*n:0;
 const fee=method()==="delivery"&&!recurring?230:0;
 const discount=isPromo()?Math.round(sproutSubtotal*.2):0;
 const total=sproutSubtotal-subscriptionSaving+fee-discount;
 el("subtotal").textContent=money(sproutSubtotal);
 el("subscription-savings-row").hidden=!recurring;
 el("subscription-savings").textContent="−"+money(subscriptionSaving);
 el("subscription-savings-label").textContent="Subscription saving ("+money(base-subscriptionPrice())+" / pack)";
 el("deliveryfee").textContent=fee?money(fee):recurring&&method()==="delivery"?"FREE · included":"FREE";
 el("discount-row").hidden=!discount;
 el("discount").textContent="−"+money(discount);
 el("total").textContent=money(total);
 el("total-label").textContent=recurring?"Price per "+(frequency.value==="weekly"?"week":"2 weeks"):"Total today";
 el("repeat-summary").textContent=recurring?
   "Automatically billed "+money(total)+(frequency.value==="weekly"?" every week.":" every two weeks.")+
   " Cancel future renewals via the secure Stripe customer portal.":
   "A one-time order. You will be charged only once.";
 el("subscription-disclosure").hidden=!recurring;
 el("subscription-perk").hidden=!recurring;
 el("subscription-delivery-hint").hidden=!recurring;
 el("frequency-note").textContent=recurring?
   "Save "+money(base-subscriptionPrice())+" per pack on each order, with free London delivery. "+
   (frequency.value==="weekly"?"Billed weekly.":"Billed every two weeks."):
   "One-time purchase. You pay once.";
 el("delivery-method-price").textContent=recurring?"FREE with your subscription":"£2.30 per one-time delivery";
 el("postcode-field").hidden=method()!=="delivery";
 postcode.required=method()==="delivery";
 code.disabled=recurring;
 if(recurring&&code.value.trim())code.value="";
 el("summary-product-title").textContent=(pack.value==="500"?"Family Pack · 500g":"Single Pack · 200g")+" × "+n;
 const photo=el("summary-photo");
 photo.src=pack.value==="500"?"assets/family-ornate-v3.webp":"assets/single-ornate-v3.webp";
 photo.alt=(pack.value==="500"?"Family Pack":"Single Pack")+" broccoli sprouts on an ornate porcelain plate";
 form.querySelectorAll("[data-pack-choice]").forEach(button=>
   button.setAttribute("aria-pressed",String(button.dataset.packChoice===pack.value)));
 el("checkout-message").textContent=enabled?
   "Your preferred date and exact delivery/collection time are subject to confirmation.":
   "Secure checkout is not enabled yet; no payment will be taken here.";
 el("pay-button").disabled=!enabled||working;
 el("pay-button").textContent=working?"Connecting to Stripe…":"Continue to secure payment →";
}
form.querySelectorAll("input, select").forEach(input=>{
 input.addEventListener("input",update);input.addEventListener("change",update);
});
form.querySelectorAll("[data-pack-choice]").forEach(button=>
 button.addEventListener("click",()=>{
   pack.value=button.dataset.packChoice;
   pack.dispatchEvent(new Event("change",{bubbles:true}));
 }));
const chosen=new URL(location.href).searchParams;
if(["200","500"].includes(chosen.get("pack")))pack.value=chosen.get("pack");
// Order cards can preselect one-time or weekly without changing the existing
// checkout controls or the backend's permitted billing frequencies.
if(["once","weekly"].includes(chosen.get("frequency")))frequency.value=chosen.get("frequency");
if(chosen.get("cancelled")==="1")el("checkout-state").textContent="Payment cancelled. You have not been charged here. You can review your details below.";
function validate(v){
 if(!["200","500"].includes(v.pack)||!Number.isInteger(v.quantity)||v.quantity<1||v.quantity>10)return "Choose between 1 and 10 packs.";
 if(!["once","weekly","fortnightly"].includes(v.frequency))return "Choose your frequency.";
 if(!v.name||v.name.length<2)return "Enter your full name.";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))return "Enter a valid email address.";
 if(!v.date||v.date<date.min)return "Choose a preferred date at least seven days ahead.";
 const d=new Date(v.date+"T12:00:00Z");
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==v.date)return "Please select a valid date.";
 if(v.method==="delivery"&&![2,3,4].includes(d.getUTCDay()))return "Personal deliveries are usually Tuesday, Wednesday or Thursday.";
 if(v.method==="delivery"&&!/^(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i.test(v.postcode))return "Please enter a valid delivery postcode.";
 if(v.code&&v.code!=="SPROUT")return "This promo code is not recognised.";
 if(v.code&&v.frequency!=="once")return "SPROUT applies only to one-time purchases.";
 return "";
}
form.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!enabled||working)return;
 const values=getValues();
 const error=validate(values);
 if(error){el("checkout-message").textContent=error;return;}
 if(!form.reportValidity())return;
 working=true;update();
 try{
   const response=await fetch("/api/checkout/session",{method:"POST",
     headers:{"content-type":"application/json"},body:JSON.stringify(values)});
   const payload=await response.json();
   if(!response.ok||!payload.url){
     const diagnostic=typeof payload.setup_stage==="string"?
       " (step: "+payload.setup_stage+
       "; Stripe HTTP: "+(payload.stripe_http_status??"n/a")+
       "; code: "+(payload.stripe_error_code??"n/a")+
       "; field: "+(payload.stripe_error_param??"n/a")+")":"";
     throw Error((payload.error||"Checkout unavailable.")+diagnostic);
   }
   if(!payload.url.startsWith("https://checkout.stripe.com/"))throw Error("Invalid checkout address.");
   window.location.assign(payload.url);
 }catch(error){
   working=false;update();el("checkout-message").textContent=error.message||"Unable to open payment checkout. Please try again.";
 }
});
async function status(){
 try{
   const response=await fetch("/api/checkout/status",{cache:"no-store"});
   const result=await response.json();
   enabled=response.ok&&result.enabled===true&&
     (result.mode==="test"||(result.mode==="live"&&result.manual_order_handling===true));
   if(result.minimum_date)date.min=result.minimum_date;
   el("checkout-state").textContent=enabled?
     (result.mode==="live"?
       "Secure live Stripe checkout is ready. You will be charged only after confirming your payment at Stripe.":
       "Stripe sandbox checkout is ready for test payments. Real cards are not accepted here."):
     "This checkout is in preparation and cannot take payments yet. The existing WhatsApp enquiry form is still available.";
 }catch{
   enabled=false;el("checkout-state").textContent="Secure checkout is not configured yet. No payment can be taken here.";
 }finally{update();}
}
update();status();
})();