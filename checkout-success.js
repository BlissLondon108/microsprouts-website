(()=>{"use strict";
const $=id=>document.getElementById(id);
const id=new URL(location.href).searchParams.get("session_id");
const status=$("payment-status");
if(!id||!/^cs_(?:test_|live_)[A-Za-z0-9_]+$/.test(id)){
 $("payment-title").textContent="No payment reference found";
 status.textContent="We can't confirm a payment from this link. Please contact MicroSprouts if you've already paid.";
 return;
}
(async()=>{
 try{
  const res=await fetch("/api/checkout/verify?session_id="+encodeURIComponent(id),{cache:"no-store"});
  const data=await res.json();
  if(!res.ok||!data.paid){
   $("payment-title").textContent="Payment not yet confirmed";
   status.textContent=res.ok?"Stripe has not confirmed a completed payment. If you just paid, please check again shortly.":(data.error||"Unable to verify payment. Please contact us.");
   return;
  }
  $("payment-title").textContent="Payment confirmed.";
  status.textContent="Thank you for your order!";
  $("order-reference").textContent=data.reference||"";
  const items=Array.isArray(data.items)?data.items.filter(item=>
    ["200","500"].includes(item.pack)&&["once","weekly"].includes(item.frequency)&&
    ["pickup","delivery"].includes(item.method)):[];
  const lines=["Hello MicroSprouts! I've paid for my order.","","Order reference: "+data.reference];
  if(items.length){
    const name=item=>item.pack+"g broccoli sprouts · "+
      (item.frequency==="weekly"?"weekly":"one-time")+" · "+
      (item.method==="delivery"?"delivery":"collection");
    $("paid-summary").textContent=items.length+" broccoli "+(items.length===1?"pack":"packs")+
      " · Preferred first date "+data.date+" · £"+(Number(data.total_pence)/100).toFixed(2)+
      (Number(data.renewal_pence)>0?" today, then £"+
        (Number(data.renewal_pence)/100).toFixed(2)+" weekly":"");
    lines.push("Broccoli packs:",...items.map((item,i)=>(i+1)+". "+name(item)));
    lines.push("Preferred first date: "+data.date);
  }else{
    const method=data.method==="delivery"?"local delivery":"free collection";
    const cadence=data.frequency==="weekly"?"Weekly subscription":
      data.frequency==="fortnightly"?"Fortnightly subscription":"One-time order";
    $("paid-summary").textContent=cadence+" · "+data.quantity+" × "+data.pack+"g broccoli sprouts · "+
      method+" · Preferred first date "+data.date+" · £"+(Number(data.total_pence)/100).toFixed(2);
    lines.push("Order: "+data.quantity+" × "+data.pack+"g broccoli sprouts",
      "Frequency: "+cadence,"Collection / delivery: "+method,
      "Preferred first date: "+data.date);
  }
  if(data.postcode)lines.push("Postcode: "+data.postcode);
  lines.push("","Please can we arrange the exact date and time?");
  $("paid-whatsapp").href="https://wa.me/447386853514?text="+encodeURIComponent(lines.join("\n"));
  $("paid-details").hidden=false;
  $("manage-subscription-link").hidden=items.length?!items.some(i=>i.frequency==="weekly"):data.frequency==="once";
 }catch{
  $("payment-title").textContent="Verification unavailable";
  status.textContent="We couldn't check Stripe just now. Please try reloading the page or contact MicroSprouts. Do not pay again without checking.";
 }
})();
})();