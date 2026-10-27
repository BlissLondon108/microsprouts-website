import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import worker from "../worker.js";
import {PRODUCT_DEFINITIONS,BILLING_FREQUENCIES,priceLookupKey,PROMO_COUPON_ID} from "../stripe-catalog.js";
globalThis.crypto||=webcrypto;
const base="https://microsprouts.bhaktivedanta-london.workers.dev";
const envOff={ASSETS:{fetch:async()=>new Response("asset fetched")}};
const envOn={...envOff,PAYMENTS_ENABLED:"true",STRIPE_SECRET_KEY:"sk_test_mock_value",STRIPE_WEBHOOK_SECRET:"whsec_mock"};
let checks=0;
function check(label,truth){assert.ok(truth,label);checks++;console.log("✓ "+label)}
function response(value,status=200){return new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}})}
const api=(path,init={},env=envOff)=>worker.fetch(new Request(base+path,init),env);
const submit=(data,env=envOn)=>api("/api/checkout/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)},env);
function requestedDate(delivery=false){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 const dt=new Date([parts.year,parts.month,parts.day].join("-")+"T12:00:00Z");
 dt.setUTCDate(dt.getUTCDate()+9);
 if(delivery)while(![2,3,4].includes(dt.getUTCDay()))dt.setUTCDate(dt.getUTCDate()+1);
 return dt.toISOString().slice(0,10);
}
const customer={pack:"200",quantity:2,frequency:"once",method:"pickup",date:requestedDate(),
 postcode:"",code:"",name:"Test Customer",email:"test@example.com",whatsapp:""};
let res=await api("/api/checkout/status");
const initialStatus=await res.json();
check("Checkout remains off without sandbox runtime settings",initialStatus.enabled===false);
check("Disabled state identifies missing runtime values without revealing credentials",
  initialStatus.checks?.activation==="sandbox_credentials"&&
  initialStatus.checks?.sandbox_key_available===false&&
  initialStatus.checks?.webhook_secret_available===false);
const sandboxOnly={...envOn};
delete sandboxOnly.PAYMENTS_ENABLED;
res=await api("/api/checkout/status",{},sandboxOnly);
const sandboxReadyStatus=await res.json();
check("Sandbox works when build omits optional enable toggle",
  sandboxReadyStatus.enabled===true&&sandboxReadyStatus.mode==="test");
res=await api("/api/checkout/status",{}, {...sandboxOnly,PAYMENTS_ENABLED:"false"});
check("Explicit runtime disable switch prevents checkout",(await res.json()).enabled===false);
res=await api("/api/checkout/status",{}, {...envOn,STRIPE_SECRET_KEY:"sk_live_not_permitted"});
check("Live secret keys can never enable this test Worker",(await res.json()).enabled===false);
res=await submit(customer,envOff);
check("Missing test credentials prevents any checkout",res.status===503);
res=await api("/index.html");
check("Public static homepage is served unmodified",await res.text()==="asset fetched");
const products=new Map(),prices=new Map(),coupons=new Map(),portals=new Map();
let deliberatelyFailPriceLookups=false;
 deliberatelyFailPortal=true;
 res=await submit(customer);
 check("Unavailable customer portal does not block an otherwise valid checkout",
   res.status===200&&(await res.json()).url.startsWith("https://checkout.stripe.com/"));
 res=await api("/api/checkout/portal",{},envOn);
 check("Portal setup error is isolated to customer portal, not payments",res.status===502);
 deliberatelyFailPortal=false;
let deliberatelyFailPortal=false;
let session,sessionForm,stats={productCreates:0,priceCreates:0,couponCreates:0,portalCreates:0,checkouts:0};
const originalFetch=globalThis.fetch;
function parseForm(init){return new URLSearchParams(init.body)}
const field=(p,k)=>p.get(k);
const portalLogin="https://billing.stripe.com/p/login/test_microsprouts";
async function mockStripe(input,init={}){
 const u=new URL(input),path=u.pathname.replace(/^\/v1\//,""),method=init.method||"GET";
 const p=init.body?parseForm(init):null;
 if(method==="GET"&&path.startsWith("products/")){
  const value=products.get(decodeURIComponent(path.slice("products/".length)));
  return value?response(value):response({error:{message:"Not found"}},404);
 }
 if(method==="POST"&&path==="products"){
  stats.productCreates++;
  const item={id:field(p,"id"),name:field(p,"name"),active:true,type:field(p,"type"),
    shippable:field(p,"shippable")==="true"};
  products.set(item.id,item);
  return response(item);
 }
 if(method==="GET"&&path==="prices"){
  if(deliberatelyFailPriceLookups&&u.searchParams.get("lookup_keys[]")==="ms_broccoli_200g_once_v1")
    return response({error:{code:"permission_denied",param:"lookup_keys",message:"Mock internal error must never be echoed."}},403);
  return response({data:[...prices.values()].filter(v=>v.lookup_key===u.searchParams.get("lookup_keys[]"))});
 }
 if(method==="POST"&&path==="prices"){
  stats.priceCreates++;
  const item={id:"price_mock_"+stats.priceCreates,product:field(p,"product"),active:true,
    currency:field(p,"currency"),unit_amount:Number(field(p,"unit_amount")),
    lookup_key:field(p,"lookup_key"),recurring:field(p,"recurring[interval]")?
      {interval:field(p,"recurring[interval]"),interval_count:Number(field(p,"recurring[interval_count]"))}:null};
  prices.set(item.lookup_key,item);return response(item);
 }
 if(method==="GET"&&path.startsWith("coupons/")){
  const item=coupons.get(decodeURIComponent(path.slice("coupons/".length)));
  return item?response(item):response({error:{message:"Not found"}},404);
 }
 if(method==="POST"&&path==="coupons"){
  stats.couponCreates++;
  const item={id:field(p,"id"),valid:true,percent_off:Number(field(p,"percent_off")),
    duration:field(p,"duration"),applies_to:{products:[field(p,"applies_to[products][0]"),field(p,"applies_to[products][1]")]}};
  coupons.set(item.id,item);return response(item);
 }
 if(method==="GET"&&path==="billing_portal/configurations"){
  if(deliberatelyFailPortal)
    return response({error:{code:"account_portal_unavailable"}},403);
  return response({data:[...portals.values()]});
 }
 if(method==="POST"&&path==="billing_portal/configurations"){
  stats.portalCreates++;
  const item={id:"bpc_mock",name:field(p,"name"),active:true,login_page:{
    enabled:field(p,"login_page[enabled]")==="true",url:portalLogin
  },features:{subscription_cancel:{enabled:field(p,"features[subscription_cancel][enabled]")==="true"},
    payment_method_update:{enabled:field(p,"features[payment_method_update][enabled]")==="true"}}};
  portals.set(item.id,item);return response(item);
 }
 if(method==="POST"&&path==="checkout/sessions"){
  stats.checkouts++;sessionForm=p;
  return response({mode:field(p,"mode"),url:"https://checkout.stripe.com/c/pay/cs_test_mock"});
 }
 if(method==="GET"&&path==="checkout/sessions/cs_test_example")
  return response(session);
 return response({error:{message:"Unexpected test Stripe path: "+method+" "+path}},404);
}
globalThis.fetch=mockStripe;
try{
 res=await submit({...customer,total_pence:1,unit_amount:1,discount:999});
 check("Sandbox Checkout Session created with fixed prices",res.status===200&&(await res.json()).url.startsWith("https://checkout.stripe.com/"));
 check("All three products provisioned exactly once",products.size===3&&stats.productCreates===3);
 check("Nine recurring and one-time price objects provisioned",prices.size===9&&stats.priceCreates===9);
 check("Every required price lookup key has the right amount",PRODUCT_DEFINITIONS.every(d=>BILLING_FREQUENCIES.every(freq=>{
   const a=prices.get(priceLookupKey(d,freq));
   return a&&a.currency==="gbp"&&a.unit_amount===d.amount&&(freq==="once"?!a.recurring:a.recurring?.interval_count===(freq==="weekly"?1:2));
 })));
 check("Reusable price ID used instead of inline pricing",sessionForm.has("line_items[0][price]")&&!sessionForm.has("line_items[0][price_data][unit_amount]"));
 check("Client cannot supply their own goods price",sessionForm.get("metadata[total_pence]")==="1998"&&sessionForm.get("line_items[0][quantity]")==="2");
 check("Unneeded coupon and portal are not provisioned during normal checkout",
   stats.couponCreates===0&&stats.portalCreates===0);
 res=await api("/api/checkout/portal",{},envOn);
 check("Customer portal is accessible through secure Stripe login",(await res.json()).url===portalLogin);
 check("Customer portal configured independently and cancellation enabled",
   portals.get("bpc_mock")?.login_page?.enabled&&
   portals.get("bpc_mock")?.features?.subscription_cancel?.enabled);
 const snapshot={...stats};
 res=await submit({...customer,quantity:1});
 check("Repeat checkout doesn't create duplicate products/prices",res.status===200&&stats.productCreates===snapshot.productCreates&&stats.priceCreates===snapshot.priceCreates&&stats.portalCreates===snapshot.portalCreates);
 check("Standard one-time purchase has pack quantity",sessionForm.get("mode")==="payment"&&sessionForm.get("line_items[0][quantity]")==="1");
 res=await submit({...customer,quantity:3,code:"SPROUT"});
 check("One-time SPROUT applies product-only coupon, not adjusted custom price",res.status===200&&sessionForm.get("discounts[0][coupon]")===PROMO_COUPON_ID&&sessionForm.get("line_items[0][quantity]")==="3"&&sessionForm.has("line_items[0][price]"));
 check("SPROUT coupon created only when required and excludes delivery",
   stats.couponCreates===1&&coupons.get(PROMO_COUPON_ID)?.applies_to?.products?.every(id=>id!=="prod_microsprouts_delivery_london"));
 check("One-time subtotal discount tracked correctly",sessionForm.get("metadata[total_pence]")==="2398");
 const weekly={...customer,frequency:"weekly",pack:"500",method:"delivery",date:requestedDate(true),postcode:"SE1 1AA"};
 res=await submit(weekly);
 check("Subscription Checkout uses recurring 500g and delivery prices",res.status===200&&sessionForm.get("mode")==="subscription"&&sessionForm.get("line_items[0][price]")===prices.get("ms_broccoli_500g_weekly_v1").id&&sessionForm.get("line_items[1][price]")===prices.get("ms_delivery_london_weekly_v1").id);
 check("Recurring customer metadata and total reflect delivery",sessionForm.get("metadata[total_pence]")==="3628"&&sessionForm.get("subscription_data[metadata][frequency]")==="weekly");
 res=await submit({...weekly,frequency:"fortnightly"});
 check("Fortnightly subscription uses two-week reusable prices",res.status===200&&sessionForm.get("line_items[0][price]")===prices.get("ms_broccoli_500g_fortnightly_v1").id&&sessionForm.get("line_items[1][price]")===prices.get("ms_delivery_london_fortnightly_v1").id);
 res=await submit({...weekly,code:"SPROUT"});
 check("Promo cannot discount recurring subscription",res.status===400);
 res=await submit({...customer,email:""});
 check("Contact email required",res.status===400);
 res=await submit({...customer,date:"2020-01-01"});
 check("Seven-day advance notice enforced",res.status===400);
 res=await submit({...customer,method:"delivery",date:requestedDate(true),postcode:"invalid"});
 check("Delivery postcode validated",res.status===400);
 session={payment_status:"paid",amount_total:1998,currency:"gbp",client_reference_id:"test-order-123",
  metadata:{total_pence:"1998",pack:"200",quantity:"2",frequency:"once",method:"pickup",
    preferred_date:requestedDate(),name:"Test Customer",postcode:""}};
 res=await api("/api/checkout/verify?session_id=cs_test_example",{},envOn);
 check("Paid Stripe session alone creates successful order display",(await res.json()).reference==="test-order-123");
 session={...session,payment_status:"unpaid"};
 res=await api("/api/checkout/verify?session_id=cs_test_example",{},envOn);
 check("Unpaid Stripe sessions never confirm",(await res.json()).paid===false);
 session={...session,payment_status:"paid",amount_total:1};
 res=await api("/api/checkout/verify?session_id=cs_test_example",{},envOn);
 check("Incorrect paid total is rejected",res.status===409);
 res=await api("/api/checkout/verify?session_id=INVALID",{},envOn);
 check("Malformed Stripe session IDs cannot verify",res.status===400);
 res=await api("/api/stripe/webhook",{method:"POST",headers:{"stripe-signature":"t=1,v1=bad"},body:"{}"},envOn);
 check("Unsigned or outdated webhook messages are rejected",res.status===400);
 deliberatelyFailPriceLookups=true;
 res=await submit(customer);
 const failedCatalogue=await res.json();
 check("Failed Stripe catalogue lookup identifies safe step and HTTP status",
   res.status===503&&failedCatalogue.setup_stage==="price_ms_broccoli_200g_once_v1"&&failedCatalogue.stripe_http_status===403&&failedCatalogue.stripe_error_code==="permission_denied");
 check("Stripe failure never exposes API secrets or raw error messages",
   !JSON.stringify(failedCatalogue).includes("sk_test_")&&!JSON.stringify(failedCatalogue).includes("Mock internal error"));
 deliberatelyFailPriceLookups=false;
}finally{globalThis.fetch=originalFetch}
console.log("\nStripe catalogue, recurring billing and portal regression tests: "+checks+" passed.");
