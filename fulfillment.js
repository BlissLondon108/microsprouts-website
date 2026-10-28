/* Signed Stripe events -> durable D1 order records + retryable owner email outbox.
   No secrets are stored in GitHub or returned through public APIs. */
const TRACKED = new Set([
  "checkout.session.completed","checkout.session.async_payment_succeeded",
  "invoice.paid","invoice.payment_failed",
  "customer.subscription.updated","customer.subscription.deleted"
]);
const isMoney = n => Number.isSafeInteger(n) && n >= 0;
const bounded = (value, max=255) => String(value ?? "").slice(0,max);
const readPack = m => {
  const pack=String(m.pack||""),quantity=Number(m.quantity);
  if(!["200","500"].includes(pack)||!Number.isInteger(quantity)||quantity<1||quantity>10)
    throw new Error("Stripe order metadata is incomplete");
  return {pack:Number(pack),quantity};
};
export const hasNotificationConfiguration = env =>
  !!env?.ORDERS_DB?.prepare &&
  typeof env?.RESEND_API_KEY==="string" && env.RESEND_API_KEY.length>8 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ORDER_ALERT_TO||"") &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ORDER_ALERT_FROM||"");

export async function storageReady(env) {
  if(!hasNotificationConfiguration(env))return false;
  try {
    await env.ORDERS_DB.prepare("SELECT order_key FROM orders LIMIT 1").first();
    await env.ORDERS_DB.prepare("SELECT alert_key FROM alert_outbox LIMIT 1").first();
    return true;
  } catch {return false;}
}
async function normalize(event,loadSubscription) {
  if(!TRACKED.has(event.type))return null;
  const o=event?.data?.object||{};
  if(!o.id || typeof o.id!=="string")throw new Error("Stripe event lacks object ID");
  const kind=event.type;
  if(kind==="checkout.session.completed"||kind==="checkout.session.async_payment_succeeded"){
    if(o.payment_status!=="paid")return null; // async methods wait for success.
    const m=o.metadata||{},amount=Number(o.amount_total);
    const pack=readPack(m);
    if(o.currency!=="gbp"||!isMoney(amount)||amount<1||amount!==Number(m.total_pence))
      throw new Error("Stripe checkout amount mismatch");
    return {alertKey:"order:"+o.id,eventType:kind,ref:o.id,
      subject:"MicroSprouts: paid new order",
      order:{orderKey:"checkout:"+o.id,kind:"checkout",stripeRef:o.id,
        subscription:bounded(o.subscription,120),customerName:bounded(m.name,120),
        email:bounded(m.email||o.customer_details?.email,254),phone:bounded(m.whatsapp,32),
        pack:pack.pack,quantity:pack.quantity,frequency:bounded(m.frequency,24),
        method:bounded(m.method,24),postcode:bounded(m.postcode,14),
        requestedDate:bounded(m.preferred_date,12),total:amount,status:"paid"}};
  }
  if(kind==="invoice.paid") {
    if(o.billing_reason==="subscription_create")return null; // first order covered by Checkout.
    if(o.currency!=="gbp"||!isMoney(o.amount_paid)||o.amount_paid<1)
      throw new Error("Unexpected invoice amount");
    let subscription=o.subscription||o.parent?.subscription_details?.subscription;
    if(typeof subscription==="object")subscription=subscription.id;
    if(!subscription||!loadSubscription)throw new Error("Subscription lookup unavailable");
    const sub=await loadSubscription(subscription);
    const m=sub?.metadata||{}, pack=readPack(m);
    return {alertKey:"renewal:"+o.id,eventType:kind,ref:o.id,
      subject:"MicroSprouts: paid subscription renewal",
      order:{orderKey:"invoice:"+o.id,kind:"renewal",stripeRef:o.id,
        subscription:bounded(subscription,120),customerName:bounded(m.name,120),
        email:bounded(m.email,254),phone:bounded(m.whatsapp,32),
        pack:pack.pack,quantity:pack.quantity,frequency:bounded(m.frequency,24),
        method:bounded(m.method,24),postcode:bounded(m.postcode,14),
        requestedDate:"",total:Number(o.amount_paid),status:"paid"}};
  }
  // Failures / cancellations also produce durable owner alerts but never paid orders.
  return {alertKey:"event:"+kind+":"+o.id+(kind==="customer.subscription.updated"?":"+event.id:""),
    eventType:kind,ref:o.id,subject:"MicroSprouts: billing attention needed",order:null};
}
function notificationText(normalized) {
  const o=normalized.order;
  if(!o)return ["Stripe event: "+normalized.eventType,
    "Stripe reference: "+normalized.ref,"Check the Stripe Dashboard and customer schedule."].join("\n");
  return [
    normalized.subject,"Reference: "+o.stripeRef,
    "Pack: "+o.pack+"g × "+o.quantity,
    "Frequency: "+o.frequency,"Amount: £"+(o.total/100).toFixed(2),
    "Method: "+o.method,"Requested date: "+(o.requestedDate||"Confirm upcoming renewal schedule"),
    "Postcode: "+(o.postcode||"Collection"),"Name: "+o.customerName,
    "Email: "+o.email,"WhatsApp: "+o.phone,
    "IMPORTANT: Date and delivery/collection window are not yet confirmed."
  ].join("\n");
}
export async function storeStripeEvent(env,event,{loadSubscription}={}) {
  if(!env?.ORDERS_DB?.prepare||!env.ORDERS_DB.batch)throw new Error("Order database unavailable");
  if(typeof event?.id!=="string"||!/^evt_[a-zA-Z0-9_]+$/.test(event.id))throw new Error("Invalid Stripe event");
  const normalized=await normalize(event,loadSubscription);
  if(!normalized)return {handled:false};
  const db=env.ORDERS_DB;
  const statements=[db.prepare("INSERT OR IGNORE INTO stripe_events (event_id,event_type,stripe_ref) VALUES (?,?,?)")
    .bind(event.id,normalized.eventType,normalized.ref)];
  if(normalized.order){
    const o=normalized.order;
    statements.push(db.prepare(`INSERT OR IGNORE INTO orders
      (order_key,kind,stripe_ref,subscription_id,customer_name,customer_email,phone,
       pack_grams,quantity,frequency,method,postcode,preferred_date,total_pence,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      o.orderKey,o.kind,o.stripeRef,o.subscription,o.customerName,o.email,o.phone,
      o.pack,o.quantity,o.frequency,o.method,o.postcode,o.requestedDate,o.total,o.status));
  }
  statements.push(db.prepare(`INSERT OR IGNORE INTO alert_outbox
    (alert_key,event_id,subject,body) VALUES (?,?,?,?)`).bind(
      normalized.alertKey,event.id,normalized.subject,notificationText(normalized)));
  // D1 batch is transactional: failure leaves neither half an order nor an acknowledged event.
  await db.batch(statements);
  return {handled:true};
}
export async function sendPendingAlerts(env,limit=5) {
  if(!hasNotificationConfiguration(env))throw new Error("Owner notification not configured");
  const {results=[]}=await env.ORDERS_DB.prepare(
    "SELECT alert_key,subject,body FROM alert_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT ?"
  ).bind(Math.max(1,Math.min(10,Number(limit)||5))).all();
  let sent=0;
  for(const alert of results){
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{
        "authorization":"Bearer "+env.RESEND_API_KEY,
        "content-type":"application/json",
        "idempotency-key":"microsprouts-"+alert.alert_key
      },
      body:JSON.stringify({
        from:env.ORDER_ALERT_FROM,to:[env.ORDER_ALERT_TO],
        subject:alert.subject,text:alert.body
      })
    });
    if(!response.ok){
      await env.ORDERS_DB.prepare("UPDATE alert_outbox SET attempts=attempts+1 WHERE alert_key=?")
        .bind(alert.alert_key).run();
      throw new Error("Owner email delivery failed");
    }
    await env.ORDERS_DB.prepare(
      "UPDATE alert_outbox SET sent_at=CURRENT_TIMESTAMP, attempts=attempts+1 WHERE alert_key=?"
    ).bind(alert.alert_key).run();
    sent++;
  }
  return sent;
}
