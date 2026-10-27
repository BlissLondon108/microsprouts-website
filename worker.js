import {ensureCatalog,ensurePortal,findPortal,priceLookupKey,PRODUCT_DEFINITIONS} from "./stripe-catalog.js";
/* MicroSprouts server-side Stripe Checkout API. Cloudflare Worker, no secrets in source.
 * STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be runtime encrypted secrets.
 * Only sandbox (sk_test_) payments are accepted; PAYMENTS_ENABLED=false disables checkout.
 */
const PRICE_PENCE = Object.freeze({ "200":999, "500":1699 });
const DELIVERY_PENCE = 230;
const WHATSAPP = "447386853514";
const GOOD_FREQUENCIES = new Set(["once","weekly","fortnightly"]);
const SESS_RE = /^cs_(?:test_|live_)[A-Za-z0-9_]+$/;
const json = (data, status=200) => new Response(JSON.stringify(data),{
  status, headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
    "x-content-type-options":"nosniff","referrer-policy":"no-referrer"}
});
const issue = (message,status=400) => json({error:message},status);
const londonDay = (instant=new Date()) => {
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
    timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(instant).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return parts.year+"-"+parts.month+"-"+parts.day;
};
const minimumDate = () => {
  const day=londonDay();
  const d=new Date(day+"T12:00:00Z");
  d.setUTCDate(d.getUTCDate()+7);
  return d.toISOString().slice(0,10);
};
const validRequestedDate=(value,delivery)=> {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<minimumDate())return false;
  const d=new Date(value+"T12:00:00Z");
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value&&(!delivery||[2,3,4].includes(d.getUTCDay()));
};
const validPostcode = str => /^(?:GIR\s?0AA|(?:[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}))$/i.test(str);
const stripeRequest = async(env,path,options={})=>{
  const response=await fetch("https://api.stripe.com/v1/"+path,{
    ...options,
    headers:{"authorization":"Bearer "+env.STRIPE_SECRET_KEY,
      ...options.headers}
  });
  const raw=await response.text();
  let parsed;
  try{parsed=JSON.parse(raw)}catch{parsed={error:{message:"Stripe returned an invalid response."}}}
  if(!response.ok){
    const failure=new Error(parsed.error?.message||"Stripe request failed");
    failure.stripeStatus=response.status;
    failure.stripeCode=parsed.error?.code||parsed.error?.type||null;
    failure.stripeParam=parsed.error?.param||null;
    throw failure;
  }
  return parsed;
};
// The Cloudflare GitHub build can omit ordinary runtime vars while retaining encrypted
// Worker secrets. Sandbox checkout is authorised by the presence of BOTH sandbox secrets.
// An explicit PAYMENTS_ENABLED=false still disables checkout; live Stripe keys never work.
const ready=env=>
  env.PAYMENTS_ENABLED!=="false"&&env.PAYMENTS_ENABLED!==false&&
  typeof env.STRIPE_SECRET_KEY==="string"&&env.STRIPE_SECRET_KEY.startsWith("sk_test_")&&
  typeof env.STRIPE_WEBHOOK_SECRET==="string"&&env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_");
const put=(params,key,value)=>params.append(key,String(value));
const createSession=async(request,env)=>{
  if(!ready(env))return issue("Secure Stripe sandbox checkout is being configured. Please use the existing enquiry form for now.",503);
  if(request.headers.get("content-type")?.split(";")[0]!=="application/json")return issue("Send JSON.");
  const length=Number(request.headers.get("content-length")||0);
  if(length>8192)return issue("Request too large.",413);
  let input;
  try{const text=await request.text();if(text.length>8192)return issue("Request too large.",413);input=JSON.parse(text)}
  catch{return issue("Invalid checkout details.")}
  if(!input||typeof input!=="object"||Array.isArray(input))return issue("Invalid checkout details.");
  const pack=String(input.pack);
  const count=Number(input.quantity);
  const frequency=String(input.frequency||"once");
  const method=String(input.method||"");
  const delivery=method==="delivery";
  const customerName=String(input.name||"").trim();
  const email=String(input.email||"").trim();
  const whatsapp=String(input.whatsapp||"").trim();
  const date=String(input.date||"");
  const postcode=String(input.postcode||"").trim().toUpperCase().replace(/\s+/g," ");
  const promo=String(input.code||"").trim().toUpperCase();
  if(!Object.hasOwn(PRICE_PENCE,pack)||!Number.isInteger(count)||count<1||count>10||!GOOD_FREQUENCIES.has(frequency))return issue("Choose a valid pack, quantity and frequency.");
  if(method!=="pickup"&&!delivery)return issue("Choose collection or delivery.");
  if(customerName.length<2||customerName.length>100||!/^.{2,100}$/u.test(customerName))return issue("Please enter your full name.");
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return issue("Enter a valid email address.");
  if(whatsapp&&(whatsapp.length>28||!/^\+?[\d\s()\-]{7,28}$/.test(whatsapp)))return issue("Please check your WhatsApp number.");
  if(!validRequestedDate(date,delivery))return issue("Choose a valid date at least seven days ahead; delivery is usually Tuesday–Thursday.");
  if(delivery&&!validPostcode(postcode))return issue("Enter a valid UK postcode for delivery.");
  if(promo&&promo!=="SPROUT")return issue("That promotional code is not recognised.");
  if(promo&&frequency!=="once")return issue("SPROUT applies only to one-time orders.");

  const amount=PRICE_PENCE[pack],subtotal=amount*count;
  const discounted=promo==="SPROUT"&&frequency==="once";
  const chargedGoods=discounted?subtotal-Math.round(subtotal*.2):subtotal;
  const recurring=frequency==="weekly"?{interval:"week",interval_count:1}:frequency==="fortnightly"?{interval:"week",interval_count:2}:null;
  // Provision fixed products and reusable prices in the SAME Stripe environment as
  // the test API key stored in Cloudflare. Stripe Price IDs are not portable.
  let catalog;
  try{catalog=await ensureCatalog((path,options)=>stripeRequest(env,path,options),{promo:discounted});}
  catch(error){
    const safeStage=typeof error.stage==="string"&&/^[a-z0-9_]{1,75}$/i.test(error.stage)?error.stage:"unknown";
    const safeCode=typeof error.stripeCode==="string"&&/^[a-z0-9_]{1,65}$/i.test(error.stripeCode)?error.stripeCode:null;
    const safeParam=typeof error.stripeParam==="string"&&/^[a-z0-9_\[\].]{1,90}$/i.test(error.stripeParam)?error.stripeParam:null;
    const stripeStatus=Number.isInteger(error.stripeStatus)?error.stripeStatus:null;
    console.error("Stripe catalogue setup failed",safeStage,stripeStatus,safeCode,safeParam);
    return json({error:"Stripe sandbox catalogue setup failed. No payment has been taken.",
      setup_stage:safeStage,stripe_http_status:stripeStatus,stripe_error_code:safeCode,
      stripe_error_param:safeParam},503);
  }
  const form=new URLSearchParams();
  const siteOrigin=new URL(request.url).origin;
  put(form,"mode",recurring?"subscription":"payment");
  put(form,"success_url",siteOrigin+"/checkout-success.html?session_id={CHECKOUT_SESSION_ID}");
  put(form,"cancel_url",siteOrigin+"/checkout.html?cancelled=1");
  put(form,"customer_email",email);
  put(form,"client_reference_id",crypto.randomUUID());
  put(form,"billing_address_collection","auto");
  if(recurring)put(form,"payment_method_collection","always");
  put(form,"locale","en-GB");
  // Reusable Stripe Prices, not inline price_data.
  const product=PRODUCT_DEFINITIONS.find(p=>p.grams===Number(pack));
  const packPrice=catalog.prices[priceLookupKey(product,frequency)];
  if(!packPrice)return issue("This sprouts price is not available.",503);
  put(form,"line_items[0][price]",packPrice);
  put(form,"line_items[0][quantity]",count);
  if(delivery){
    const deliveryProduct=PRODUCT_DEFINITIONS.find(p=>p.kind==="delivery");
    const deliveryPrice=catalog.prices[priceLookupKey(deliveryProduct,frequency)];
    if(!deliveryPrice)return issue("This delivery price is not available.",503);
    put(form,"line_items[1][price]",deliveryPrice);
    put(form,"line_items[1][quantity]",1);
  }
  if(discounted)put(form,"discounts[0][coupon]",catalog.coupon);
  const metadata={name:customerName,email,whatsapp,pack,quantity:String(count),
    frequency,method,preferred_date:date,postcode:delivery?postcode:"",
    promo:discounted?"SPROUT":"",subtotal_pence:String(subtotal),
    delivery_pence:String(delivery?DELIVERY_PENCE:0),
    total_pence:String(chargedGoods+(delivery?DELIVERY_PENCE:0))};
  for(const [k,v] of Object.entries(metadata))put(form,"metadata["+k+"]",v);
  if(recurring){
    for(const [k,v] of Object.entries(metadata))put(form,"subscription_data[metadata]["+k+"]",v);
    put(form,"subscription_data[description]","MicroSprouts "+pack+"g x "+count+" "+frequency);
  }else{
    for(const [k,v] of Object.entries(metadata))put(form,"payment_intent_data[metadata]["+k+"]",v);
  }
  try{
    const response=await stripeRequest(env,"checkout/sessions",{method:"POST",body:form,
      headers:{"content-type":"application/x-www-form-urlencoded","idempotency-key":crypto.randomUUID()}});
    if(response.mode!==(recurring?"subscription":"payment")||!response.url?.startsWith("https://checkout.stripe.com/"))throw Error("Unexpected Stripe response");
    return json({url:response.url});
  }catch(e){
    console.error("Sandbox Stripe session failure",e.stripeStatus||500);
    return issue("Stripe checkout could not start. Please try again.",502);
  }
};
const verifySession=async(request,env)=>{
  if(!ready(env))return issue("Checkout verification is not yet enabled.",503);
  const id=new URL(request.url).searchParams.get("session_id");
  if(!id||!SESS_RE.test(id))return issue("Invalid checkout session.");
  try{
    const session=await stripeRequest(env,"checkout/sessions/"+encodeURIComponent(id));
    const paid=session.payment_status==="paid";
    const meta=session.metadata||{};
    if(!paid)return json({paid:false});
    const expected=Number(meta.total_pence);
    const actual=Number(session.amount_total);
    if(!Number.isSafeInteger(expected)||expected<1||actual!==expected||session.currency!=="gbp")return issue("Payment details could not be verified.",409);
    return json({paid:true,reference:session.client_reference_id||session.id,
      pack:meta.pack,quantity:meta.quantity,frequency:meta.frequency,
      method:meta.method,date:meta.preferred_date,
      postcode:meta.postcode||"",name:meta.name,
      total_pence:actual});
  }catch{return issue("Unable to verify this payment. Please check again.",502)}
};
const getPortalLogin=async(env)=>{
  if(!ready(env))return issue("Customer portal is unavailable until Stripe is configured.",503);
  try{
    const stripe=(path,options)=>stripeRequest(env,path,options);
    // Portal setup runs independently. A checkout can succeed even if Billing
    // portal configuration is unavailable in a particular Stripe test account.
    const portal=await findPortal(stripe)||await ensurePortal(stripe);
    const url=portal?.login_page?.url;
    if(!url||!url.startsWith("https://billing.stripe.com/"))return issue("Customer portal is not configured yet.",503);
    return json({url});
  }catch{return issue("Unable to open the customer portal at present.",502)}
};
const encoder=new TextEncoder();
const secureEqual=(a,b)=>{
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
};
const verifySignature=async(payload,header,secret)=>{
  if(!secret||!header)return false;
  const parts=Object.fromEntries(header.split(",").map(piece=>piece.split("=",2)));
  const timestamp=Number(parts.t);
  if(!Number.isInteger(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)return false;
  const mac=await crypto.subtle.sign("HMAC",await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]),encoder.encode(parts.t+"."+payload));
  const hex=Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,"0")).join("");
  return header.split(",").some(piece=>piece.startsWith("v1=")&&secureEqual(piece.slice(3),hex));
};
const webhook=async(request,env)=>{
  if(!ready(env)||!env.STRIPE_WEBHOOK_SECRET)return issue("Webhook not configured.",503);
  const payload=await request.text();
  if(payload.length>1024*1024)return issue("Payload too large.",413);
  if(!await verifySignature(payload,request.headers.get("stripe-signature"),env.STRIPE_WEBHOOK_SECRET))return issue("Invalid signature.",400);
  let event;try{event=JSON.parse(payload)}catch{return issue("Invalid event JSON.")}
  // Stripe remains the payment and subscription system of record. Avoid PII in logs.
  if(["checkout.session.completed","checkout.session.async_payment_succeeded","invoice.paid","invoice.payment_failed",
    "customer.subscription.updated","customer.subscription.deleted"].includes(event.type)){
    console.log("Verified Stripe event",event.type,event.id);
  }
  return json({received:true});
};
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(path==="/api/checkout/status"&&request.method==="GET")
      return json({enabled:ready(env),mode:ready(env)?"test":"not-configured",
        minimum_date:minimumDate(),
        checks:{
          activation:"sandbox_credentials",
          explicitly_disabled:env.PAYMENTS_ENABLED==="false"||env.PAYMENTS_ENABLED===false,
          sandbox_key_available:typeof env.STRIPE_SECRET_KEY==="string"&&env.STRIPE_SECRET_KEY.startsWith("sk_test_"),
          webhook_secret_available:typeof env.STRIPE_WEBHOOK_SECRET==="string"&&env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")
        }});
    if(path==="/api/checkout/session"&&request.method==="POST")return createSession(request,env);
    if(path==="/api/checkout/verify"&&request.method==="GET")return verifySession(request,env);
    if(path==="/api/checkout/portal"&&request.method==="GET")return getPortalLogin(env);
    if(path==="/api/stripe/webhook"&&request.method==="POST")return webhook(request,env);
    if(path.startsWith("/api/"))return issue("Not found",404);
    return env.ASSETS.fetch(request);
  }
};
