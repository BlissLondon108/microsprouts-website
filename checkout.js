(()=>{"use strict";
const form=document.getElementById("stripe-checkout-form");if(!form)return;
const el=id=>document.getElementById(id);
const money=value=>"£"+(value/100).toFixed(2);
let enabled=false,working=false;
const pack=el("pack"),qty=el("quantity"),frequency=el("frequency"),date=el("date"),postcode=el("postcode"),code=el("code");
const method=()=>form.querySelector('input[name="method"]:checked')?.value||"pickup";
const subtotal=()=>((pack.value==="500")?1699:999)*Number(qty.value||1);
const isPromo=()=>frequency.value==="once"&&code.value.trim().toUpperCase()==="SPROUT";
const count=()=>Math.max(1,Math.min(10,Number(qty.value)||1));
const getValues=()=>({pack:pack.value,quantity:count(),frequency:frequency.value,
 method:method(),date:date.value,postcode:postcode.value.trim(),
 code:code.value.trim().toUpperCase(),name:el("name").value.trim(),
 email:el("email").value.trim(),whatsapp:el("whatsapp").value.trim()});
function update(){
 const goods=((pack.value==="500")?1699:999)*count();
 const fee=method()==="delivery"?230:0;
 const discount=isPromo()?Math.round(goods*.2):0;
 el("subtotal").textContent=money(goods);
 el("deliveryfee").textContent=fee?money(fee):"FREE";
 el("discount-row").hidden=!discount;
 el("discount").textContent="−"+money(discount);
 el("total").textContent=money(goods+fee-discount);
 const recurring=frequency.value!=="once";
 el("total-label").textContent=recurring?"Each billing period":"Total today";
 el("repeat-summary").textContent=recurring?
   (frequency.value==="weekly"?"Automatically billed every week.":"Automatically billed every two weeks.")+" Delivery is charged each period if selected.":
   "A one-time order.";
 el("subscription-disclosure").hidden=!recurring;
 el("frequency-note").textContent=recurring?"Recurring charges continue until the subscription is cancelled. Dates and times are arranged separately.":"One-time purchase. You pay once.";
 el("postcode-field").hidden=method()!=="delivery";
 postcode.required=method()==="delivery";
 el("checkout-message").textContent=enabled?"Your date will be confirmed personally after payment.":"Secure checkout is not enabled yet; no payment will be taken here.";
 el("pay-button").disabled=!enabled||working;
 el("pay-button").textContent=working?"Connecting to Stripe…":"Continue to secure payment →";
}
form.querySelectorAll("input, select").forEach(input=>{
 input.addEventListener("input",update);input.addEventListener("change",update);
});
const chosen=new URL(location.href).searchParams;
if(["200","500"].includes(chosen.get("pack")))pack.value=chosen.get("pack");
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
   if(!response.ok||!payload.url)throw Error(payload.error||"Checkout unavailable.");
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
   enabled=response.ok&&result.enabled===true&&result.mode==="test";
   if(result.minimum_date)date.min=result.minimum_date;
   el("checkout-state").textContent=enabled?
     "Stripe sandbox checkout is ready for test payments. Real cards are not accepted here.":
     "This checkout is in preparation and cannot take payments yet. The existing WhatsApp enquiry form is still available.";
 }catch{
   enabled=false;el("checkout-state").textContent="Secure checkout is not configured yet. No payment can be taken here.";
 }finally{update();}
}
update();status();
})();