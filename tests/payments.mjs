import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import worker from "../worker.js";

globalThis.crypto ||= webcrypto;
const base="https://microsprouts.bhaktivedanta-london.workers.dev";
const envOff={ASSETS:{fetch:async()=>new Response("asset fetched")}};
const envOn={...envOff,STRIPE_SECRET_KEY:"sk_test_mock_value",PAYMENTS_ENABLED:"true",STRIPE_WEBHOOK_SECRET:"whsec_mock"};
let checks=0;
function check(label,truth){assert.ok(truth,label);console.log("✓ "+label);checks++}
async function api(path,init={},env=envOff){return worker.fetch(new Request(base+path,init),env)}
async function checkout(body,env=envOn){return api("/api/checkout/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)},env)}
function validDate(delivery=false){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 const date=new Date([parts.year,parts.month,parts.day].join("-")+"T12:00:00Z");
 date.setUTCDate(date.getUTCDate()+9);
 if(delivery)while(![2,3,4].includes(date.getUTCDay()))date.setUTCDate(date.getUTCDate()+1);
 return date.toISOString().slice(0,10);
}
const customer={pack:"200",quantity:2,frequency:"once",method:"pickup",date:validDate(),postcode:"",code:"",name:"Test Customer",email:"test@example.com",whatsapp:""};
let resp=await api("/api/checkout/status");
let state=await resp.json();
check("Checkout disabled until explicitly configured",!state.enabled&&state.mode==="not-configured");
resp=await checkout(customer,envOff);
check("No payments accepted without Stripe key and enable flag",resp.status===503);
resp=await api("/index.html",{},envOff);
check("Original static storefront remains accessible",await resp.text()==="asset fetched");
let captured;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{
 captured={url,init,params:new URLSearchParams(init.body)};
 return new Response(JSON.stringify({mode:captured.params.get("mode"),
   url:"https://checkout.stripe.com/c/pay/cs_test_mock"}),{status:200,headers:{"content-type":"application/json"}});
};
try{
 resp=await checkout({...customer,total_pence:1,unit_amount:1,discount:999});
 check("Sandbox accepts server-priced guest order",resp.status===200);
 let payload=await resp.json();
 check("Checkout URL is hosted on Stripe",payload.url.startsWith("https://checkout.stripe.com/"));
 check("Server sets correct 200g price and quantity",captured.params.get("line_items[0][price_data][unit_amount]")==="999"&&captured.params.get("line_items[0][quantity]")==="2");
 check("Server ignores forged client prices",!captured.init.body.toString().includes("unit_amount=1")&&captured.params.get("metadata[total_pence]")==="1998");
 check("Email and customer details copied to Stripe",captured.params.get("customer_email")==="test@example.com"&&captured.params.get("metadata[name]")==="Test Customer");
 check("One-time flow uses payment mode",captured.params.get("mode")==="payment");
 check("One-time flow omits subscription-only option",!captured.params.has("payment_method_collection"));
 const disabled=await checkout({...customer,email:""});
 check("Email required before Stripe session",disabled.status===400);
 const tooSoon=await checkout({...customer,date:"2020-01-01"});
 check("Minimum lead time enforced on backend",tooSoon.status===400);
 const invalidDelivery=await checkout({...customer,method:"delivery",date:validDate(true),postcode:"not a postcode"});
 check("Delivery postcode validated on backend",invalidDelivery.status===400);
 const badCoupon=await checkout({...customer,code:"FREE"});
 check("Only official promo supported",badCoupon.status===400);
 resp=await checkout({...customer,quantity:3,code:"SPROUT"});
 check("One-time discount checkout accepted",resp.status===200);
 check("Server calculates exact 20% discount across pack subtotal",captured.params.get("line_items[0][price_data][unit_amount]")==="2398"&&captured.params.get("line_items[0][quantity]")==="1");
 const weekly={...customer,frequency:"weekly",method:"delivery",date:validDate(true),postcode:"SE1 1AA"};
 resp=await checkout(weekly);
 check("Weekly subscription checkout accepted",resp.status===200);
 check("Weekly recurring Stripe prices and delivery fee",captured.params.get("mode")==="subscription"&&captured.params.get("line_items[0][price_data][recurring][interval_count]")==="1"&&captured.params.get("line_items[1][price_data][recurring][interval_count]")==="1"&&captured.params.get("line_items[1][price_data][unit_amount]")==="230");
 resp=await checkout({...weekly,frequency:"fortnightly"});
 check("Fortnightly billing uses two-week interval",resp.status===200&&captured.params.get("line_items[0][price_data][recurring][interval_count]")==="2"&&captured.params.get("line_items[1][price_data][recurring][interval_count]")==="2");
 resp=await checkout({...weekly,code:"SPROUT"});
 check("Promotion rejected on subscriptions",resp.status===400);
 let session={
   payment_status:"paid",amount_total:1998,currency:"gbp",client_reference_id:"sample-reference",
   metadata:{total_pence:"1998",pack:"200",quantity:"2",frequency:"once",
    method:"pickup",preferred_date:validDate(),name:"Test Customer",postcode:""}
 };
 globalThis.fetch=async()=>new Response(JSON.stringify(session),{status:200,headers:{"content-type":"application/json"}});
 resp=await api("/api/checkout/verify?session_id=cs_test_example",{},envOn);
 payload=await resp.json();
 check("Paid Stripe session creates customer-facing confirmation",resp.status===200&&payload.paid&&payload.reference==="sample-reference");
 session={...session,payment_status:"unpaid"};
 resp=await api("/api/checkout/verify?session_id=cs_test_example",{},envOn);
 check("Unpaid session cannot reach confirmation",(await resp.json()).paid===false);
 session={...session,payment_status:"paid",amount_total:1};
 resp=await api("/api/checkout/verify?session_id=cs_test_example",{},envOn);
 check("Total mismatch blocks paid confirmation",resp.status===409);
 resp=await api("/api/checkout/verify?session_id=INVALID",{},envOn);
 check("Invalid session IDs rejected",resp.status===400);
 resp=await api("/api/stripe/webhook",{method:"POST",headers:{"stripe-signature":"t=1,v1=incorrect"},body:"{}"},envOn);
 check("Webhook rejects invalid signatures",resp.status===400);
}finally{globalThis.fetch=originalFetch}
console.log("\nStripe sandbox checkout tests passed: "+checks);
