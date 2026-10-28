import assert from "node:assert/strict";
import {hasNotificationConfiguration,storageReady,storeStripeEvent,sendPendingAlerts} from "../fulfillment.js";

let checks=0;
function check(label,value){assert.ok(value,label);checks++;console.log("✓ "+label);}
class MockD1 {
 constructor(){this.events=new Map();this.orders=new Map();this.alerts=new Map();}
 prepare(sql){
  const db=this;
  const stmt={
   bind(...values){this.values=values;return this;},
   async first(){
    if(sql.includes("FROM orders"))return [...db.orders.values()][0]||null;
    if(sql.includes("FROM alert_outbox"))return [...db.alerts.values()][0]||null;
    throw Error("Unexpected first query: "+sql);
   },
   async all(){
    if(!sql.includes("FROM alert_outbox"))throw Error("Unexpected all query");
    return {results:[...db.alerts.values()].filter(x=>!x.sent_at).slice(0,this.values?.[0]||5)};
   },
   async run(){
    const v=this.values||[];
    if(sql.includes("INTO stripe_events")){
      if(!db.events.has(v[0]))db.events.set(v[0],{event_id:v[0],event_type:v[1]});
    }else if(sql.includes("INTO orders")){
      if(!db.orders.has(v[0]))db.orders.set(v[0],{order_key:v[0],pack_grams:v[7],total_pence:v[13]});
    }else if(sql.includes("INTO alert_outbox")){
      if(!db.alerts.has(v[0]))db.alerts.set(v[0],{alert_key:v[0],event_id:v[1],subject:v[2],body:v[3],attempts:0,sent_at:null});
    }else if(sql.includes("UPDATE alert_outbox")){
      const row=db.alerts.get(v[0]);if(row){row.attempts++;if(sql.includes("sent_at=CURRENT_TIMESTAMP"))row.sent_at="now";}
    }else throw Error("Unexpected run query: "+sql);
    return {success:true};
   }
  };
  return stmt;
 }
 async batch(statements){for(const stmt of statements)await stmt.run();return statements.map(()=>({success:true}));}
}
const db=new MockD1();
const env={ORDERS_DB:db,RESEND_API_KEY:"re_test_for_mock",ORDER_ALERT_TO:"orders@example.org",ORDER_ALERT_FROM:"shop@example.org"};
check("Notification configuration requires storage and verified email details",hasNotificationConfiguration(env));
check("Storage readiness checks available tables",await storageReady(env));
check("Missing database fails safely",!await storageReady({...env,ORDERS_DB:null}));
const metadata={pack:"200",quantity:"2",frequency:"once",method:"pickup",
  total_pence:"1998",preferred_date:"2026-11-10",name:"Example Customer",
  email:"customer@example.org",whatsapp:""};
const paid={id:"evt_checkout_1",type:"checkout.session.completed",data:{object:{
 id:"cs_test_123",currency:"gbp",payment_status:"paid",amount_total:1998,metadata
}}};
check("Paid checkout persisted", (await storeStripeEvent(env,paid)).handled);
check("One paid order and one alert created",db.orders.size===1&&db.alerts.size===1);
await storeStripeEvent(env,paid);
check("Duplicate Stripe event causes no new paid order or alert",db.orders.size===1&&db.alerts.size===1);
const unpaid={...paid,id:"evt_checkout_2",data:{object:{...paid.data.object,id:"cs_test_124",payment_status:"unpaid"}}};
check("Unpaid checkout does not create fulfillment",!(await storeStripeEvent(env,unpaid)).handled&&db.orders.size===1);
const mismatch={...paid,id:"evt_checkout_3",data:{object:{...paid.data.object,amount_total:1,id:"cs_test_125"}}};
await assert.rejects(()=>storeStripeEvent(env,mismatch),/amount mismatch/);
check("Incorrect paid amount is rejected",db.orders.size===1);
const firstInvoice={id:"evt_invoice_init",type:"invoice.paid",data:{object:{
 id:"in_initial",currency:"gbp",amount_paid:899,billing_reason:"subscription_create",subscription:"sub_test"
}}};
check("First subscription invoice does not duplicate Checkout order",
 !(await storeStripeEvent(env,firstInvoice)).handled&&db.orders.size===1);
const renewal={id:"evt_invoice_renewal",type:"invoice.paid",data:{object:{
 id:"in_renew",currency:"gbp",amount_paid:899,billing_reason:"subscription_cycle",subscription:"sub_test"
}}};
const sub={metadata:{...metadata,pack:"200",quantity:"1",frequency:"weekly"}};
check("Paid renewal stored with subscription metadata",
 (await storeStripeEvent(env,renewal,{loadSubscription:async id=>id==="sub_test"?sub:null})).handled);
check("Renewal creates second order and alert",db.orders.size===2&&db.alerts.size===2);
const cancel={id:"evt_subscription_cancel",type:"customer.subscription.deleted",data:{object:{id:"sub_test"}}};
await storeStripeEvent(env,cancel);
check("Subscription cancellation creates an actionable alert",db.alerts.size===3);
const originalFetch=globalThis.fetch;
const sent=[];
globalThis.fetch=async (url,options)=>{
 sent.push({url,options});
 return new Response('{"id":"em_test"}',{status:200,headers:{"content-type":"application/json"}});
};
try {
 check("Pending owner alerts sent with success",await sendPendingAlerts(env,10)===3);
 check("Resend idempotency headers accompany each alert",
  sent.every(x=>x.url==="https://api.resend.com/emails"&&
    x.options.headers["idempotency-key"].startsWith("microsprouts-")));
 check("Cron retry cannot resend alerts already marked sent",await sendPendingAlerts(env,10)===0);
}finally{globalThis.fetch=originalFetch;}
console.log("\nFulfillment and owner notification regression tests: "+checks+" passed.");
