/* Fixed MicroSprouts Stripe catalogue.
 * Reusable Price lookup keys are portable across Stripe test accounts, unlike price IDs.
 * Provisioning is idempotent and limited to the predefined MicroSprouts
 * products and prices in the selected Stripe test or live account.
 * Called only on validated checkout POSTs.
 */
export const PRODUCT_DEFINITIONS=Object.freeze([
  {id:"prod_microsprouts_broccoli_200g",name:"MicroSprouts Broccoli Sprouts — Single Pack 200g",amount:999,subscriptionAmount:899,grams:200,kind:"sprouts",
   description:"200g fresh broccoli sprouts, grown in London. Collection by appointment or local delivery.",type:"good",shippable:true},
  {id:"prod_microsprouts_broccoli_500g",name:"MicroSprouts Broccoli Sprouts — Family Pack 500g",amount:1699,subscriptionAmount:1549,grams:500,kind:"sprouts",
   description:"500g fresh broccoli sprouts, grown in London. Collection by appointment or local delivery.",type:"good",shippable:true},
  {id:"prod_microsprouts_delivery_london",name:"MicroSprouts Personal London Delivery",amount:230,grams:0,kind:"delivery",
   description:"Personal delivery in eligible London areas, normally Tuesday to Thursday.",type:"service",shippable:false}
]);
export const BILLING_FREQUENCIES=Object.freeze(["once","weekly","fortnightly"]);
export const PROMO_COUPON_ID="MS_SPROUT20_V1";
const PORTAL_NAME="MicroSprouts customer subscription portal";
const SITE_ORIGIN="https://microsprouts.bhaktivedanta-london.workers.dev";

// Machine-readable, bounded stage labels aid sandbox debugging without exposing
// credentials, Stripe API responses, customer details, or raw error messages.
export class CatalogSetupError extends Error {
 constructor(stage,cause){
  super("Stripe setup failed at "+stage);
  this.name="CatalogSetupError";
  this.stage=stage;
  this.stripeStatus=cause?.stripeStatus||null;
  this.stripeCode=cause?.stripeCode||null;
  this.stripeParam=cause?.stripeParam||null;
 }
}
async function step(label,job){
 try{return await job()}catch(error){
  if(error instanceof CatalogSetupError)throw error;
  throw new CatalogSetupError(label,error);
 }
}

const formBody=values=>{
 const data=new URLSearchParams();
 for(const [key,value] of Object.entries(values))data.append(key,String(value));
 return data;
};
const post=async(request,path,fields,idempotencyKey)=>{
 return request(path,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",
  "idempotency-key":"microsprouts-catalog-v1-"+idempotencyKey},
 body:formBody(fields)});
};
async function maybeGet(request,path){
 try{return await request(path)}
 catch(error){if(error.stripeStatus===404)return null;throw error}
}
function productMetadata(p){
 return {brand:"MicroSprouts",kind:p.kind,sku:p.grams?("MS-BROC-"+p.grams):"MS-DELIVERY-LONDON"};
}
async function ensureProduct(request,p){
 let product=await maybeGet(request,"products/"+encodeURIComponent(p.id));
 if(!product){
  const fields={id:p.id,name:p.name,description:p.description,type:p.type};
  if(p.shippable)fields.shippable="true";
  for(const [k,v] of Object.entries(productMetadata(p)))fields["metadata["+k+"]"]=v;
  product=await post(request,"products",fields,"product-"+p.id);
 }
 if(product.id!==p.id||product.active===false)
  throw new Error("Unexpected or inactive MicroSprouts product: "+p.id);
 // The former 200g product was called "Week Supply". Rename its existing
 // Product so payments and Stripe invoices consistently say "Single Pack".
 if(product.name!==p.name){
  product=await post(request,"products/"+encodeURIComponent(p.id),
    {name:p.name,description:p.description},"product-rename-v2-"+p.id);
 }
 if(product.name!==p.name)throw new Error("Could not update MicroSprouts product name: "+p.id);
 return product;
}
export const priceLookupKey=(product,frequency)=>{
 if(!BILLING_FREQUENCIES.includes(frequency))throw new Error("Unsupported billing frequency");
 if(product.kind==="delivery"&&frequency!=="once")
   throw new Error("Subscriptions include complimentary delivery; no recurring delivery price");
 const sku=product.kind==="delivery"?"delivery_london":"broccoli_"+product.grams+"g";
 // Stripe prices are immutable. v2 introduces lower recurring prices without
 // altering subscriptions that might still reference the original v1 prices.
 const version=product.kind==="sprouts"&&frequency!=="once"?"v2":"v1";
 return "ms_"+sku+"_"+frequency+"_"+version;
};
async function ensurePrice(request,product,frequency){
 const lookup_key=priceLookupKey(product,frequency);
 const expectedAmount=frequency==="once"?product.amount:product.subscriptionAmount;
 const query=new URLSearchParams();
 query.append("lookup_keys[]",lookup_key);
 query.set("active","true");
 query.set("limit","3");
 let result=await request("prices?"+query.toString());
 let price=(result.data||[]).find(p=>p.lookup_key===lookup_key);
 if(!price){
  const fields={product:product.id,currency:"gbp",unit_amount:expectedAmount,
    lookup_key,nickname:"MicroSprouts "+(product.grams?product.grams+"g":"delivery")+" "+frequency,
    "metadata[brand]":"MicroSprouts","metadata[frequency]":frequency};
  if(frequency!=="once"){
   fields["recurring[interval]"]="week";
   fields["recurring[interval_count]"]=frequency==="weekly"?"1":"2";
  }
  price=await post(request,"prices",fields,"price-"+lookup_key);
 }
 const interval=frequency==="once"?null:"week";
 const intervalCount=frequency==="once"?null:frequency==="weekly"?1:2;
 if(price.active===false||price.product!==product.id||price.currency!=="gbp"||
    price.unit_amount!==expectedAmount||price.lookup_key!==lookup_key||
    (price.recurring?.interval||null)!==interval||
    (price.recurring?.interval_count||null)!==intervalCount)
  throw new Error("Stripe catalogue price mismatch for "+lookup_key);
 return price;
}
async function ensureCoupon(request){
 // In Stripe's current API applies_to is includable and excluded by default;
 // expand it or a correctly limited coupon appears to be unrestricted.
 const detail="coupons/"+encodeURIComponent(PROMO_COUPON_ID)+"?expand%5B%5D=applies_to";
 let coupon=await maybeGet(request,detail);
 if(!coupon){
  const fields={id:PROMO_COUPON_ID,name:"SPROUT — 20% off broccoli sprouts",
    percent_off:20,duration:"once",
    "metadata[brand]":"MicroSprouts","metadata[promotion]":"SPROUT"};
  for(let i=0;i<2;i++)fields["applies_to[products]["+i+"]"]=PRODUCT_DEFINITIONS[i].id;
  await post(request,"coupons",fields,"coupon-v1");
  coupon=await maybeGet(request,detail);
 }
 const targets=coupon?.applies_to?.products||[];
 if(coupon.valid===false||coupon.percent_off!==20||coupon.duration!=="once"||
    !PRODUCT_DEFINITIONS.slice(0,2).every(p=>targets.includes(p.id))||
    targets.includes(PRODUCT_DEFINITIONS[2].id))
  throw new Error("Stripe SPROUT coupon is not restricted to sprouts");
 return coupon;
}
export async function findPortal(request){
 const list=await request("billing_portal/configurations?limit=100");
 return (list.data||[]).find(config=>config.active!==false&&
   config.name?.startsWith(PORTAL_NAME)&&
   config.login_page?.enabled===true&&
   config.features?.subscription_cancel?.enabled===true&&
   config.features?.payment_method_update?.enabled===true)||null;
}
export async function ensurePortal(request){
 let portal=await findPortal(request);
 if(!portal){
  const fields={
    name:PORTAL_NAME+" (sandbox)",default_return_url:SITE_ORIGIN+"/",
    "business_profile[headline]":"Manage your MicroSprouts subscriptions",
    "login_page[enabled]":"true",
    "features[customer_update][enabled]":"true",
    "features[customer_update][allowed_updates][0]":"email",
    "features[customer_update][allowed_updates][1]":"name",
    "features[invoice_history][enabled]":"true",
    "features[payment_method_update][enabled]":"true",
    "features[subscription_cancel][enabled]":"true",
    "features[subscription_cancel][mode]":"at_period_end",
    "features[subscription_cancel][proration_behavior]":"none",
    "features[subscription_update][enabled]":"false"
  };
  portal=await post(request,"billing_portal/configurations",fields,"portal-v1");
 }
 if(!portal.login_page?.enabled||!portal.login_page.url?.startsWith("https://billing.stripe.com/"))
  throw new Error("Customer portal login was not enabled");
 return portal;
}
export async function ensureCatalog(request,{promo=false}={}){
 const products=[];
 // Sequential provisioning avoids bursts of writes to newly opened Stripe accounts.
 for(const p of PRODUCT_DEFINITIONS){
  products.push(await step("product_"+(p.grams||"delivery"),()=>ensureProduct(request,p)));
 }
 const prices=Object.create(null);
 for(const product of PRODUCT_DEFINITIONS){
  for(const frequency of (product.kind==="delivery"?["once"]:BILLING_FREQUENCIES)){
   const key=priceLookupKey(product,frequency);
   const price=await step("price_"+key,()=>ensurePrice(request,product,frequency));
   prices[key]=price.id;
  }
 }
 // The catalogue is independent of Billing Customer Portal. A portal configuration
 // error must never block a customer's payment checkout.
 const coupon=promo?await step("coupon",()=>ensureCoupon(request)):null;
 return {prices,coupon:coupon?.id||null,product_count:products.length,
   price_count:Object.keys(prices).length};
}
