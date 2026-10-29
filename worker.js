import {ensureCatalog,ensurePortal,findPortal,priceLookupKey,PRODUCT_DEFINITIONS,
  preconfiguredLiveCatalog} from "./stripe-catalog.js";
/* MicroSprouts server-side Stripe Checkout API. Cloudflare Worker, no secrets in source.
 * STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be runtime encrypted secrets.
 * Sandbox by default. Live mode uses Stripe as the sole order/payment record.
 * Owner-confirmed Stripe emails and two release switches are required.
 * PAYMENTS_ENABLED=false disables checkout.
 */
const PRICE_PENCE = Object.freeze({ "200":999, "500":1699 });
const SUBSCRIPTION_PRICE_PENCE = Object.freeze({ "200":899, "500":1549 });
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
const validRequestedDate=(value)=> {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<minimumDate())return false;
  const d=new Date(value+"T12:00:00Z");
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value&&[2,3,4,5].includes(d.getUTCDay());
};
const validPostcode = str => /^(?:GIR\s?0AA|(?:[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}))$/i.test(str);
// Direct legacy checkout still collects a UK address itself. The newer
// progressive basket delegates shipping-address collection to Stripe Checkout.
const validShippingAddress=(address,city,postcode)=>
  address.length>=8&&address.length<=160&&
  !/[<>\x00-\x1F]/.test(address)&&
  city.length>=2&&city.length<=80&&!/[<>\x00-\x1F]/.test(city)&&
  validPostcode(postcode);
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
// Cloudflare deployment may omit ordinary runtime vars while retaining secrets.
// Sandbox remains test-only; live requires owner-verified Stripe notifications,
// deliberate release flags, and a live API key. PAYMENTS_ENABLED=false blocks both.
const ready=env=>
  env.PAYMENT_MODE!=="live"&&
  env.PAYMENTS_ENABLED!=="false"&&env.PAYMENTS_ENABLED!==false&&
  typeof env.STRIPE_SECRET_KEY==="string"&&env.STRIPE_SECRET_KEY.startsWith("sk_test_")&&
  typeof env.STRIPE_WEBHOOK_SECRET==="string"&&env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_");
// Live API keys alone never enable payment. The account owner first confirms
// Stripe email notifications and commits to manual order review in Stripe.
const hasLiveStripeKey=env=>
  typeof env.STRIPE_SECRET_KEY==="string"&&
  (env.STRIPE_SECRET_KEY.startsWith("sk_live_")||env.STRIPE_SECRET_KEY.startsWith("rk_live_"));
// Stripe credentials already identify the payment environment; no plain-text
// PAYMENT_MODE variable is needed. Both explicit owner release flags are
// required for any real charge. Explicit PAYMENT_MODE=test remains an override.
const liveConfigured=env=>
  env.PAYMENT_MODE!=="test"&&env.LIVE_CHECKOUT_ENABLED==="true"&&
  env.STRIPE_NOTIFICATIONS_CONFIRMED==="true"&&
  env.PAYMENTS_ENABLED!=="false"&&env.PAYMENTS_ENABLED!==false&&
  hasLiveStripeKey(env);
const paymentMode=async env=>liveConfigured(env)?"live":ready(env)?"test":"not-configured";
// Read-only diagnosis for the existing Cloudflare live key. This endpoint
// never creates Checkout Sessions, Products, Prices, Coupons, or customers.
// Responses omit Stripe objects, account information, secrets and customer data.
const inspectLiveStripe=async env=>{
  const liveKey=hasLiveStripeKey(env);
  if(!liveKey)
    return json({live_key_detected:false,connection:"not_checked",
      reason:"live_key_missing",checkout_enabled:false});
  const expected=PRODUCT_DEFINITIONS.flatMap(product=>
    (product.kind==="delivery"?["once"]:["once","weekly","fortnightly"])
      .map(frequency=>({product,frequency,key:priceLookupKey(product,frequency)})));
  const tasks=[
    ["products",async()=>{
      const responses=await Promise.all(PRODUCT_DEFINITIONS.map(p=>
        stripeRequest(env,"products/"+encodeURIComponent(p.id))));
      return responses.every((value,i)=>value.id===PRODUCT_DEFINITIONS[i].id&&
        value.active!==false&&value.name===PRODUCT_DEFINITIONS[i].name);
    }],
    ["prices",async()=>{
      const params=new URLSearchParams({limit:"100"});
      for(const x of expected)params.append("lookup_keys[]",x.key);
      const results=await stripeRequest(env,"prices?"+params);
      return expected.every(x=>(results.data||[]).some(p=>
        p.lookup_key===x.key&&p.product===x.product.id&&p.active!==false&&
        p.currency==="gbp"&&p.unit_amount===
          (x.frequency==="once"?x.product.amount:x.product.subscriptionAmount)&&
        (p.recurring?.interval||null)===(x.frequency==="once"?null:"week")&&
        (p.recurring?.interval_count||null)===(x.frequency==="once"?null:x.frequency==="weekly"?1:2)));
    }],
    ["discount",async()=>{
      const coupon=await stripeRequest(env,"coupons/MS_SPROUT20_V1?expand%5B%5D=applies_to");
      const targets=coupon.applies_to?.products||[];
      return coupon.valid!==false&&coupon.percent_off===20&&coupon.duration==="once"&&
        PRODUCT_DEFINITIONS.slice(0,2).every(p=>targets.includes(p.id))&&
        !targets.includes(PRODUCT_DEFINITIONS[2].id);
    }],
    ["subscription_portal",async()=>{
      const list=await stripeRequest(env,"billing_portal/configurations?limit=100");
      return (list.data||[]).some(p=>p.active!==false&&
        p.name?.startsWith("MicroSprouts customer subscription portal")&&
        p.login_page?.enabled===true&&
        p.features?.subscription_cancel?.enabled===true);
    }],
    ["checkout_session_read",async()=>{
      const sessions=await stripeRequest(env,"checkout/sessions?limit=1");
      return Array.isArray(sessions.data);
    }]
  ];
  const checks={};
  for(const [name,job] of tasks){
    try{checks[name]=await job()?"ok":"mismatch"}
    catch(error){
      checks[name]="error";
      // Public diagnostics intentionally report only a coarse HTTP status.
      return json({live_key_detected:true,connection:"failed",
        failed_check:name,stripe_http_status:!Number.isInteger(error.stripeStatus)?null:error.stripeStatus,
        checks,checkout_enabled:false});
    }
    if(checks[name]!=="ok")
      return json({live_key_detected:true,connection:"catalogue_mismatch",
        failed_check:name,checks,checkout_enabled:false});
  }
  return json({live_key_detected:true,connection:"verified_read_only",checks,
    checkout_enabled:await paymentMode(env)==="live",
    note:"No payment or Checkout Session was created. Write permission and notifications still need testing."});
};
const put=(params,key,value)=>params.append(key,String(value));
// Multi-entry basket: each broccoli pack has its own size, frequency and
// fulfilment method. Mixed weekly + one-time packs share one Stripe Checkout;
// one-time prices appear on its first invoice only. No custom product prices.
const createBasketSession=async(input,request,env)=>{
  const raw=input.items;
  if(!Array.isArray(raw)||raw.length<1||raw.length>10)
    return issue("Choose between 1 and 10 broccoli packs.");
  const entries=[];
  for(const item of raw){
    if(!item||typeof item!=="object"||Array.isArray(item)||
      !["200","500"].includes(item.pack)||
      !["once","weekly"].includes(item.frequency)||
      !["pickup","delivery"].includes(item.method))
      return issue("Choose a valid pack, order type and collection or delivery for each item.");
    entries.push({pack:item.pack,frequency:item.frequency,method:item.method});
  }
  const hasDelivery=entries.some(item=>item.method==="delivery");
  const hasWeekly=entries.some(item=>item.frequency==="weekly");
  const hasOnce=entries.some(item=>item.frequency==="once");
  const deliveryCharge=entries.some(item=>item.method==="delivery"&&item.frequency==="once")?DELIVERY_PENCE:0;
  // The basket sends no personal details. Stripe Checkout collects the
  // customer's required full name and email, plus UK shipping address when needed.
  const date=String(input.date||"");
  const promo=String(input.code||"").trim().toUpperCase();
  if(!validRequestedDate(date))
    return issue("Choose an available Tuesday–Friday date at least seven days ahead.");
  if(promo&&promo!=="SPROUT")return issue("That promotional code is not recognised.");
  if(promo&&hasWeekly)return issue("SPROUT applies only to baskets with one-time orders.");
  const goods=entries.reduce((sum,item)=>sum+
    (item.frequency==="once"?PRICE_PENCE[item.pack]:SUBSCRIPTION_PRICE_PENCE[item.pack]),0);
  const weekly=entries.filter(item=>item.frequency==="weekly")
    .reduce((sum,item)=>sum+SUBSCRIPTION_PRICE_PENCE[item.pack],0);
  const discount=promo==="SPROUT"?Math.round(goods*.2):0;
  const total=goods-discount+deliveryCharge;
  let catalog;
  try{
    // The live account already has all seven verified prices. Checkout needs
    // permission to create a Session, not to edit the Stripe catalogue.
    catalog=await paymentMode(env)==="live"&&!discount?preconfiguredLiveCatalog():
      await ensureCatalog((path,options)=>stripeRequest(env,path,options),{promo:discount>0});
  }catch(error){
    const safeStage=typeof error.stage==="string"&&/^[a-z0-9_]{1,75}$/i.test(error.stage)?error.stage:"unknown";
    const safeCode=typeof error.stripeCode==="string"&&/^[a-z0-9_]{1,65}$/i.test(error.stripeCode)?error.stripeCode:null;
    const safeParam=typeof error.stripeParam==="string"&&/^[a-z0-9_\[\].]{1,90}$/i.test(error.stripeParam)?error.stripeParam:null;
    console.error("MicroSprouts basket catalogue error",safeStage,Number(error.stripeStatus)||0,safeCode,safeParam);
    return json({error:"Payment is temporarily unavailable. Please try again.",
      setup_stage:safeStage,stripe_http_status:Number.isInteger(error.stripeStatus)?error.stripeStatus:null,
      stripe_error_code:safeCode,stripe_error_param:safeParam},503);
  }
  const form=new URLSearchParams(),origin=new URL(request.url).origin;
  put(form,"mode",hasWeekly?"subscription":"payment");
  put(form,"success_url",origin+"/checkout-success.html?session_id={CHECKOUT_SESSION_ID}");
  put(form,"cancel_url",origin+"/?checkout_cancelled=1#basket");
  // Omitting customer_email makes Stripe request an email address at checkout.
  // First-class individual name collection is supported from Clover onward.
  put(form,"name_collection[individual][enabled]","true");
  put(form,"name_collection[individual][optional]","false");
  put(form,"client_reference_id",crypto.randomUUID());
  put(form,"billing_address_collection","auto");
  // Stripe gathers one complete UK shipping address for all shipped entries,
  // including mixed one-time and weekly orders, and retains it in Checkout.
  if(hasDelivery)put(form,"shipping_address_collection[allowed_countries][0]","GB");
  if(hasWeekly)put(form,"payment_method_collection","always");
  put(form,"locale","en-GB");
  const groups=new Map();
  for(const item of entries){
    const k=item.pack+":"+item.frequency;
    groups.set(k,(groups.get(k)||0)+1);
  }
  let index=0;
  for(const [key,quantity] of groups){
    const [pack,frequency]=key.split(":");
    const product=PRODUCT_DEFINITIONS.find(p=>p.grams===Number(pack));
    const price=catalog.prices[priceLookupKey(product,frequency)];
    if(!price)return issue("This sprouts price is not available.",503);
    put(form,"line_items["+index+"][price]",price);
    put(form,"line_items["+index+"][quantity]",quantity);
    index++;
  }
  if(deliveryCharge){
    const product=PRODUCT_DEFINITIONS.find(p=>p.kind==="delivery");
    const price=catalog.prices[priceLookupKey(product,"once")];
    if(!price)return issue("This delivery price is not available.",503);
    put(form,"line_items["+index+"][price]",price);
    put(form,"line_items["+index+"][quantity]",1);
  }
  if(discount)put(form,"discounts[0][coupon]",catalog.coupon);
  // Compact, explicitly validated item-level fulfilment information stays in
  // Stripe metadata for manual packing without an extra database.
  const encoded=entries.map(item=>item.pack+":"+
    (item.frequency==="weekly"?"w":"o")+":"+(item.method==="delivery"?"d":"p")).join("|");
  const first=entries[0];
  const metadata={
    pack:entries.every(x=>x.pack===first.pack)?first.pack:"mixed",
    quantity:String(entries.length),
    frequency:hasWeekly?(hasOnce?"mixed":"weekly"):"once",
    method:entries.every(x=>x.method===first.method)?first.method:"mixed",
    preferred_date:date,shipping_country:hasDelivery?"GB":"",
    promo:discount?"SPROUT":"",
    subtotal_pence:String(goods),
    delivery_pence:String(deliveryCharge),
    subscription_savings_pence:String(entries.reduce((sum,item)=>
      sum+(item.frequency==="weekly"?PRICE_PENCE[item.pack]-SUBSCRIPTION_PRICE_PENCE[item.pack]:0),0)),
    total_pence:String(total),renewal_pence:String(weekly),basket_entries:encoded
  };
  for(const [key,value] of Object.entries(metadata))put(form,"metadata["+key+"]",value);
  if(hasWeekly){
    // Subscription metadata must describe ONLY recurring items, since Stripe
    // renewals exclude the one-time products from their first invoice.
    const renewals=entries.filter(item=>item.frequency==="weekly");
    const renewalFirst=renewals[0];
    const recurringMetadata={
      ...metadata,
      pack:renewals.every(item=>item.pack===renewalFirst.pack)?renewalFirst.pack:"mixed",
      quantity:String(renewals.length),
      frequency:"weekly",
      method:renewals.every(item=>item.method===renewalFirst.method)?renewalFirst.method:"mixed",
      promo:"",subtotal_pence:String(weekly),delivery_pence:"0",
      total_pence:String(weekly),basket_entries:renewals.map(item=>
        item.pack+":w:"+(item.method==="delivery"?"d":"p")).join("|")
    };
    for(const [key,value] of Object.entries(recurringMetadata))
      put(form,"subscription_data[metadata]["+key+"]",value);
    put(form,"subscription_data[description]","MicroSprouts "+renewals.length+" recurring broccoli packs");
  }else{
    for(const [key,value] of Object.entries(metadata))put(form,"payment_intent_data[metadata]["+key+"]",value);
  }
  try{
    const result=await stripeRequest(env,"checkout/sessions",{
      method:"POST",body:form,
      headers:{"content-type":"application/x-www-form-urlencoded",
        "Stripe-Version":"2025-09-30.clover",
        "idempotency-key":crypto.randomUUID()}
    });
    if(result.mode!==(hasWeekly?"subscription":"payment")||
       !result.url?.startsWith("https://checkout.stripe.com/"))throw Error("Unexpected Stripe response");
    return json({url:result.url});
  }catch(error){
    console.error("Stripe multi-entry checkout session failure",error.stripeStatus||500);
    return issue("Stripe checkout could not start. Please try again.",502);
  }
};

const createSession=async(request,env)=>{
  if(await paymentMode(env)==="not-configured")return issue("Secure checkout is not configured. Please use the enquiry form for now.",503);
  if(request.headers.get("content-type")?.split(";")[0]!=="application/json")return issue("Send JSON.");
  const length=Number(request.headers.get("content-length")||0);
  if(length>8192)return issue("Request too large.",413);
  let input;
  try{const text=await request.text();if(text.length>8192)return issue("Request too large.",413);input=JSON.parse(text)}
  catch{return issue("Invalid checkout details.")}
  if(!input||typeof input!=="object"||Array.isArray(input))return issue("Invalid checkout details.");
  if(Object.hasOwn(input,"items"))return createBasketSession(input,request,env);
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
  const address=String(input.address||"").trim();
  const city=String(input.city||"").trim();
  const promo=String(input.code||"").trim().toUpperCase();
  if(!Object.hasOwn(PRICE_PENCE,pack)||!Number.isInteger(count)||count<1||count>10||!GOOD_FREQUENCIES.has(frequency))return issue("Choose a valid pack, quantity and frequency.");
  if(method!=="pickup"&&!delivery)return issue("Choose collection or delivery.");
  if(customerName.length<2||customerName.length>100||!/^.{2,100}$/u.test(customerName))return issue("Please enter your full name.");
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return issue("Enter a valid email address.");
  if(whatsapp&&(whatsapp.length>28||!/^\+?[\d\s()\-]{7,28}$/.test(whatsapp)))return issue("Please check your WhatsApp number.");
  if(!validRequestedDate(date,delivery))return issue("Choose an available Tuesday–Friday date at least seven days ahead.");
  if(delivery&&!validShippingAddress(address,city,postcode))
    return issue("Enter your full UK shipping address, city and postcode.");
  if(promo&&promo!=="SPROUT")return issue("That promotional code is not recognised.");
  if(promo&&frequency!=="once")return issue("SPROUT applies only to one-time orders.");

  const recurringPurchase=frequency!=="once";
  const amount=recurringPurchase?SUBSCRIPTION_PRICE_PENCE[pack]:PRICE_PENCE[pack];
  const subtotal=amount*count;
  const discounted=promo==="SPROUT"&&frequency==="once";
  const chargedGoods=discounted?subtotal-Math.round(subtotal*.2):subtotal;
  const deliveryCharge=delivery&&!recurringPurchase?DELIVERY_PENCE:0;
  const recurring=frequency==="weekly"?{interval:"week",interval_count:1}:frequency==="fortnightly"?{interval:"week",interval_count:2}:null;
  // The verified live account uses preconfigured price IDs; no live product
  // write/read permissions are needed on every checkout. Sandboxes still use
  // environment-specific catalogue provisioning.
  let catalog;
  try{catalog=await paymentMode(env)==="live"&&!discounted?preconfiguredLiveCatalog():
    await ensureCatalog((path,options)=>stripeRequest(env,path,options),{promo:discounted});}
  catch(error){
    const safeStage=typeof error.stage==="string"&&/^[a-z0-9_]{1,75}$/i.test(error.stage)?error.stage:"unknown";
    const safeCode=typeof error.stripeCode==="string"&&/^[a-z0-9_]{1,65}$/i.test(error.stripeCode)?error.stripeCode:null;
    const safeParam=typeof error.stripeParam==="string"&&/^[a-z0-9_\[\].]{1,90}$/i.test(error.stripeParam)?error.stripeParam:null;
    const stripeStatus=Number.isInteger(error.stripeStatus)?error.stripeStatus:null;
    console.error("Stripe catalogue setup failed",safeStage,stripeStatus,safeCode,safeParam);
    return json({error:"Payment is temporarily unavailable. Please try again.",
      setup_stage:safeStage,stripe_http_status:stripeStatus,stripe_error_code:safeCode,
      stripe_error_param:safeParam},503);
  }
  const form=new URLSearchParams();
  const siteOrigin=new URL(request.url).origin;
  put(form,"mode",recurring?"subscription":"payment");
  put(form,"success_url",siteOrigin+"/checkout-success.html?session_id={CHECKOUT_SESSION_ID}");
  // Restore the in-page basket after Stripe cancellation; legacy checkout
  // links still return to their original standalone form.
  const cancelPath=input.return_to_basket===true?
    "/?checkout_cancelled=1&pack="+encodeURIComponent(pack)+
    "&frequency="+encodeURIComponent(frequency)+"#basket":
    "/checkout.html?cancelled=1";
  put(form,"cancel_url",siteOrigin+cancelPath);
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
  if(deliveryCharge){
    const deliveryProduct=PRODUCT_DEFINITIONS.find(p=>p.kind==="delivery");
    const deliveryPrice=catalog.prices[priceLookupKey(deliveryProduct,frequency)];
    if(!deliveryPrice)return issue("This delivery price is not available.",503);
    put(form,"line_items[1][price]",deliveryPrice);
    put(form,"line_items[1][quantity]",1);
  }
  if(discounted)put(form,"discounts[0][coupon]",catalog.coupon);
  const metadata={name:customerName,email,whatsapp,pack,quantity:String(count),
    frequency,method,preferred_date:date,postcode:delivery?postcode:"",
    shipping_address:delivery?address:"",shipping_city:delivery?city:"",
    promo:discounted?"SPROUT":"",subtotal_pence:String(subtotal),
    delivery_pence:String(deliveryCharge),
    subscription_savings_pence:String(recurringPurchase?(PRICE_PENCE[pack]-amount)*count:0),
    total_pence:String(chargedGoods+deliveryCharge)};
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
    console.error("Stripe checkout session failure",e.stripeStatus||500);
    return issue("Stripe checkout could not start. Please try again.",502);
  }
};
const verifySession=async(request,env)=>{
  if(await paymentMode(env)==="not-configured")return issue("Checkout verification is not yet enabled.",503);
  const id=new URL(request.url).searchParams.get("session_id");
  if(!id||!SESS_RE.test(id))return issue("Invalid checkout session.");
  try{
    // Request a Checkout API version that includes first-class individual names.
    const session=await stripeRequest(env,"checkout/sessions/"+encodeURIComponent(id),{
      headers:{"Stripe-Version":"2025-09-30.clover"}
    });
    const paid=session.payment_status==="paid";
    const meta=session.metadata||{};
    if(!paid)return json({paid:false});
    const expected=Number(meta.total_pence);
    const actual=Number(session.amount_total);
    if(!Number.isSafeInteger(expected)||expected<1||actual!==expected||session.currency!=="gbp")return issue("Payment details could not be verified.",409);
    const items=typeof meta.basket_entries==="string"?
      meta.basket_entries.split("|").map(piece=>{
        const [pack,f,m]=piece.split(":");
        return {
          pack,frequency:f==="w"?"weekly":"once",
          method:m==="d"?"delivery":"pickup"
        };
      }).filter(item=>["200","500"].includes(item.pack)):[];
    return json({paid:true,reference:session.client_reference_id||session.id,
      pack:meta.pack,quantity:meta.quantity,frequency:meta.frequency,
      method:meta.method,date:meta.preferred_date,
      postcode:session.collected_information?.shipping_details?.address?.postal_code||
        session.shipping_details?.address?.postal_code||meta.postcode||"",
      name:session.collected_information?.individual_name||
        session.customer_details?.individual_name||
        session.customer_details?.name||
        session.collected_information?.shipping_details?.name||
        session.shipping_details?.name||meta.name||"",
      email:session.customer_details?.email||session.customer_email||meta.email||"",
      shipping:session.collected_information?.shipping_details||session.shipping_details||null,
      total_pence:actual,renewal_pence:Number(meta.renewal_pence||0),items});
  }catch{return issue("Unable to verify this payment. Please check again.",502)}
};
const getPortalLogin=async(env)=>{
  if(await paymentMode(env)==="not-configured")return issue("Customer portal is unavailable until Stripe is configured.",503);
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
  const mode=await paymentMode(env);
  if(mode==="not-configured"||!env.STRIPE_WEBHOOK_SECRET)return issue("Webhook not configured.",503);
  const payload=await request.text();
  if(payload.length>1024*1024)return issue("Payload too large.",413);
  if(!await verifySignature(payload,request.headers.get("stripe-signature"),env.STRIPE_WEBHOOK_SECRET))return issue("Invalid signature.",400);
  let event;try{event=JSON.parse(payload)}catch{return issue("Invalid event JSON.")}
  // Optional signed diagnostic endpoint. Stripe Dashboard remains the
  // payment/order system of record. Owner notifications are set in Stripe.
  console.log("Verified Stripe event",String(event.type||"unknown").slice(0,80),String(event.id||"").slice(0,100));
  return json({received:true});
};
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(path==="/api/checkout/status"&&request.method==="GET"){
      const mode=await paymentMode(env);
      return json({enabled:mode!=="not-configured",mode,
        manual_order_handling:mode==="live",minimum_date:minimumDate(),
        checks:{
          activation:mode==="live"?"stripe_owner_confirmed":"sandbox_credentials",
          explicitly_disabled:env.PAYMENTS_ENABLED==="false"||env.PAYMENTS_ENABLED===false,
          sandbox_key_available:typeof env.STRIPE_SECRET_KEY==="string"&&env.STRIPE_SECRET_KEY.startsWith("sk_test_"),
          webhook_secret_available:typeof env.STRIPE_WEBHOOK_SECRET==="string"&&env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")
        }});
    }
    if(path==="/api/checkout/preflight"&&request.method==="GET")return inspectLiveStripe(env);
    if(path==="/api/checkout/session"&&request.method==="POST")return createSession(request,env);
    if(path==="/api/checkout/verify"&&request.method==="GET")return verifySession(request,env);
    if(path==="/api/checkout/portal"&&request.method==="GET")return getPortalLogin(env);
    if(path==="/api/stripe/webhook"&&request.method==="POST")return webhook(request,env);
    if(path.startsWith("/api/"))return issue("Not found",404);
    return env.ASSETS.fetch(request);
  }
};
