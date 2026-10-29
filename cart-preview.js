/* MicroSprouts multi-entry progressive basket.
 * Each broccoli pack is an independently editable order line.
 * Stripe Checkout remains the sole place where money can be taken.
 */
(() => {
 "use strict";
 const el=id=>document.getElementById(id);
 const overlay=el("cart-overlay"),trigger=el("open-cart"),form=el("basket-flow-form");
 if(!overlay||!trigger||!form)return;
 const panel=el("basket"),back=el("basket-back"),pay=el("basket-pay");
 const stages=["pack","order","delivery","details"];
 const prices={once:{"200":999,"500":1699},weekly:{"200":899,"500":1549}};
 const makeEntry=id=>({id,pack:null,frequency:null,method:null});
 const state={entries:[makeEntry(1)],activeId:1,stage:"pack",nextId:2};
 const storeKey="microsprouts-basket-entries-v2";
 let enabled=false,working=false,returnFocus=null;
 let minimumDate="",dateMode="";
 const money=p=>"£"+(p/100).toFixed(2);
 const setText=(id,value)=>{el(id).textContent=value};
 const active=()=>state.entries.find(entry=>entry.id===state.activeId)||state.entries[0];
 const complete=entry=>!!entry&&["200","500"].includes(entry.pack)&&
   ["once","weekly"].includes(entry.frequency)&&["pickup","delivery"].includes(entry.method);
 function save(){
   try{sessionStorage.setItem(storeKey,JSON.stringify({
     entries:state.entries,activeId:state.activeId,nextId:state.nextId
   }))}catch{}
 }
 try{
   const saved=JSON.parse(sessionStorage.getItem(storeKey)||"null");
   if(saved&&Array.isArray(saved.entries)&&saved.entries.length>=1&&saved.entries.length<=10){
     const used=new Set();
     const parsed=saved.entries.map((v,i)=>{
       let id=Number.isInteger(v.id)&&v.id>=1&&v.id<=100000&&!used.has(v.id)?
         v.id:i+1;
       while(used.has(id))id++;
       used.add(id);
       return {
         id,
         pack:["200","500"].includes(v.pack)?v.pack:null,
         frequency:["once","weekly"].includes(v.frequency)?v.frequency:null,
         method:["pickup","delivery"].includes(v.method)?v.method:null
       };
     });
     state.entries=parsed;
     state.nextId=Math.max(...parsed.map(x=>x.id))+1;
     state.activeId=parsed.some(x=>x.id===saved.activeId)?saved.activeId:parsed[0].id;
     const item=active();
     state.stage=complete(item)?"details":item.method?"details":
       item.frequency?"delivery":item.pack?"order":"pack";
   }
 }catch{}
 const showError=message=>{const node=el("basket-error");node.textContent=message;node.hidden=!message};
 const focusable=()=>[...panel.querySelectorAll(
   'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),summary'
 )].filter(node=>!node.closest("[hidden]")&&node.getClientRects().length);
 const calc=()=>{
   const valid=state.entries.filter(entry=>["200","500"].includes(entry.pack));
   const goods=valid.reduce((sum,entry)=>sum+prices[entry.frequency||"once"][entry.pack],0);
   const weekly=valid.filter(entry=>entry.frequency==="weekly")
     .reduce((sum,entry)=>sum+prices.weekly[entry.pack],0);
   const delivery=valid.some(entry=>entry.method==="delivery"&&entry.frequency!=="weekly")?230:0;
   return {due:goods+delivery,weekly,delivery};
 };
 function appendNode(parent,tag,className,value){
   const element=document.createElement(tag);
   if(className)element.className=className;
   if(value!==undefined)element.textContent=value;
   parent.append(element);
   return element;
 }
 function renderOther(){
   const box=el("basket-other-items");
   box.replaceChildren();
   for(const entry of state.entries){
     if(entry.id===state.activeId)continue;
     const article=appendNode(box,"article","basket-flow__previous-item");
     const chips=appendNode(article,"div","basket-flow__previous-chips");
     const selections=[
       ["pack",entry.pack?entry.pack+"g":"Choose pack"],
       ["order",entry.frequency==="weekly"?"Weekly":entry.frequency==="once"?"One-time":"Choose type"],
       ["delivery",entry.method==="pickup"?"Collection":entry.method==="delivery"?"Shipping":"Choose shipping"]
     ];
     for(const [step,label] of selections){
       const chip=appendNode(chips,"button","basket-flow__mini-chip",label);
       chip.type="button";chip.dataset.entryId=String(entry.id);
       chip.dataset.entryStage=step;chip.setAttribute("aria-label","Edit "+label+" for this broccoli pack");
     }
     const head=appendNode(article,"div","basket-flow__previous-head");
     appendNode(head,"span","basket-flow__previous-name","Broccoli Sprouts");
     const remove=appendNode(head,"button","basket-flow__mini-remove","×");
     remove.type="button";
     remove.dataset.removeEntry=String(entry.id);
     remove.setAttribute("aria-label","Remove this broccoli pack");
     if(complete(entry))appendNode(article,"span","basket-flow__previous-price",
       money(prices[entry.frequency][entry.pack]));
   }
 }
 function render(){
   const entry=active();
   form.querySelectorAll("[data-basket-stage]").forEach(section=>{
     section.hidden=section.dataset.basketStage!==state.stage;
   });
   const choices={
     pack:entry.pack?entry.pack+"g":null,
     order:entry.frequency==="weekly"?"Weekly":entry.frequency==="once"?"One-time":null,
     delivery:entry.method==="pickup"?"Collection":entry.method==="delivery"?"Shipping":null
   };
   for(const [key,label] of Object.entries(choices)){
     const button=el("basket-selected-"+key);
     button.hidden=!label;
     if(label){button.textContent=label;button.setAttribute("aria-label","Change "+label)}
   }
   renderOther();
   el("basket-items-control").hidden=!complete(entry);
   el("basket-add-another").disabled=state.entries.length>=10;
   el("basket-remove-entry").hidden=state.entries.length===1&&!entry.pack;
   const count=state.entries.filter(i=>i.pack).length;
   setText("nav-cart-count",String(count));
   trigger.setAttribute("aria-label","Open shopping basket, "+count+(count===1?" pack":" packs"));
   setText("basket-pack-200-price",money(prices[entry.frequency||"once"]["200"]));
   setText("basket-pack-500-price",money(prices[entry.frequency||"once"]["500"]));
   setText("basket-delivery-price",entry.frequency==="weekly"?"London · Free":"London · £2.30");
   const amounts=calc();
   setText("basket-total",count?money(amounts.due):"—");
   setText("basket-total-type","Due today");
   const lines=state.entries.filter(i=>i.pack).map(i=>i.pack+"g "+(i.frequency==="weekly"?"weekly":"once"));
   const note=amounts.weekly?money(amounts.weekly)+" / week after today":
     count?lines.join(" · "):"Choose a pack to begin";
   setText("basket-total-note",note);
   const anyDelivery=state.entries.some(i=>i.method==="delivery");
   for(const name of ["postcode","address","city"]){
     el("basket-"+name+"-wrap").hidden=!anyDelivery;
     el("basket-"+name).required=anyDelivery;
   }
   refreshDates(anyDelivery);
   const details=state.stage==="details";
   pay.hidden=!details;
   pay.disabled=!details||!enabled||working||!state.entries.every(complete);
   pay.textContent=working?"Connecting securely…":"Continue to secure payment →";
   back.hidden=state.stage==="pack";
 }
 function setStage(stage,focus=true){
   if(!stages.includes(stage))return;
   state.stage=stage;showError("");render();
   if(focus){
     const section=form.querySelector('[data-basket-stage="'+stage+'"]');
     (section?.querySelector("button,input")||el("basket-back")).focus();
   }
 }
 function openCart(options={}){
   returnFocus=document.activeElement;
   const entry=active();
   if(["200","500"].includes(options.pack))entry.pack=options.pack;
   if(["once","weekly"].includes(options.frequency))entry.frequency=options.frequency;
   if(options.reset)state.stage="pack";
   else if(!entry.pack)state.stage="pack";
   overlay.hidden=false;document.body.classList.add("overlay-open");
   trigger.setAttribute("aria-expanded","true");
   save();render();el("close-cart").focus();
 }
 function closeCart(){
   if(overlay.hidden)return;
   overlay.hidden=true;document.body.classList.remove("overlay-open");
   trigger.setAttribute("aria-expanded","false");
   returnFocus?.focus?.();
 }
 trigger.addEventListener("click",()=>openCart());
 document.querySelectorAll("[data-cart-open]").forEach(button=>button.addEventListener("click",event=>{
   event.preventDefault();
   openCart({pack:button.dataset.pack||el("checkout-button")?.dataset.pack,
     frequency:button.dataset.frequency,reset:true});
 }));
 document.querySelectorAll("[data-cart-close]").forEach(button=>button.addEventListener("click",closeCart));
 form.querySelectorAll("[data-flow-pack]").forEach(button=>button.addEventListener("click",()=>{
   active().pack=button.dataset.flowPack;save();setStage("order");
 }));
 form.querySelectorAll("[data-flow-order]").forEach(button=>button.addEventListener("click",()=>{
   active().frequency=button.dataset.flowOrder;save();setStage("delivery");
 }));
 form.querySelectorAll("[data-flow-method]").forEach(button=>button.addEventListener("click",()=>{
   active().method=button.dataset.flowMethod;save();setStage("details");
 }));
 form.querySelectorAll("[data-edit-step]").forEach(button=>button.addEventListener("click",()=>{
   setStage(button.dataset.editStep);
 }));
 el("basket-other-items").addEventListener("click",event=>{
   const edit=event.target.closest("[data-entry-id]");
   const remove=event.target.closest("[data-remove-entry]");
   if(edit){
     state.activeId=Number(edit.dataset.entryId);save();setStage(edit.dataset.entryStage);
   }else if(remove){
     removeEntry(Number(remove.dataset.removeEntry));
   }
 });
 back.addEventListener("click",()=>setStage(stages[Math.max(0,stages.indexOf(state.stage)-1)]));
 el("basket-add-another").addEventListener("click",()=>{
   if(state.entries.length>=10||!complete(active()))return;
   const entry=makeEntry(state.nextId++);
   state.entries.push(entry);state.activeId=entry.id;save();setStage("pack");
 });
 function removeEntry(id){
   if(state.entries.length<=1){
     state.entries=[makeEntry(1)];state.nextId=2;state.activeId=1;save();setStage("pack");return;
   }
   state.entries=state.entries.filter(entry=>entry.id!==id);
   if(state.activeId===id)state.activeId=state.entries.at(-1).id;
   save();setStage(complete(active())?"details":"pack");
 }
 el("basket-remove-entry").addEventListener("click",()=>removeEntry(state.activeId));
 document.addEventListener("keydown",event=>{
   if(overlay.hidden)return;
   if(event.key==="Escape"){event.preventDefault();closeCart();return;}
   if(event.key!=="Tab")return;
   const nodes=focusable();if(!nodes.length)return;
   if(event.shiftKey&&document.activeElement===nodes[0]){
     event.preventDefault();nodes.at(-1).focus();
   }else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){
     event.preventDefault();nodes[0].focus();
   }
 });
 const validUKPostcode=s=>/^(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i.test(s);
 const validLondonPostcode=s=>validUKPostcode(s)&&
   /^(?:EC|NW|SW|SE|WC|BR|CR|DA|EN|HA|IG|KT|RM|SM|TW|UB|E|N|W)\d/i.test(s);
 const dateLabel=new Intl.DateTimeFormat("en-GB",{
   timeZone:"UTC",weekday:"short",day:"numeric",month:"short"
 });
 function refreshDates(shipping){
   if(!minimumDate)return;
   const mode=minimumDate+":"+(shipping?"shipping":"collection");
   if(dateMode===mode)return;
   const select=el("basket-date"),previous=select.value;
   select.replaceChildren();
   const placeholder=document.createElement("option");
   placeholder.value="";placeholder.textContent="Choose a date";select.append(placeholder);
   const start=new Date(minimumDate+"T12:00:00Z");
   for(let i=0;i<70;i++){
     const day=new Date(start);day.setUTCDate(start.getUTCDate()+i);
     const weekday=day.getUTCDay();
     if(shipping&&![2,3,4,5].includes(weekday))continue;
     const iso=day.toISOString().slice(0,10);
     const option=document.createElement("option");
     option.value=iso;option.textContent=dateLabel.format(day);
     select.append(option);
   }
   const validOption=[...select.children].some(option=>option.value===previous);
   select.value=validOption?previous:"";
   dateMode=mode;
 }
 function validDate(s){
   if(!s||s<minimumDate)return false;
   const d=new Date(s+"T12:00:00Z");
   if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)return false;
   if(state.entries.some(i=>i.method==="delivery")&&![2,3,4,5].includes(d.getUTCDay()))return false;
   return [...el("basket-date").children].some(option=>option.value===s);
 }
 function values(){
   return {
     items:state.entries.map(item=>({pack:item.pack,frequency:item.frequency,method:item.method})),
     date:el("basket-date").value,
     address:el("basket-address").value.trim(),
     city:el("basket-city").value.trim(),
     postcode:el("basket-postcode").value.trim(),
     code:"",whatsapp:"",
     name:el("basket-name").value.trim(),email:el("basket-email").value.trim(),
     return_to_basket:true
   };
 }
 function validate(v){
   if(!state.entries.every(complete))return "Complete each broccoli pack before continuing.";
   if(!validDate(v.date))return "Choose an available date at least seven days ahead. Shipping runs Tuesday to Friday.";
   if(v.items.some(i=>i.method==="delivery")){
     if(v.address.length<8||v.address.length>160)return "Enter your full street address, including house or flat number.";
     if(v.city.toLowerCase()!=="london")return "Shipping is available in London only. Contact us for other areas.";
     if(!validLondonPostcode(v.postcode))return "Enter an eligible London postcode.";
   }
   if(v.name.length<2||v.name.length>100)return "Please enter your full name.";
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))return "Enter a valid email address.";
   return "";
 }
 form.addEventListener("submit",async event=>{
   event.preventDefault();
   if(working)return;
   if(!enabled){showError("Secure payment is currently unavailable. Please try again later.");return;}
   const input=values(),error=validate(input);
   if(error){showError(error);return;}
   working=true;render();showError("");
   try{
     const response=await fetch("/api/checkout/session",{
       method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)
     });
     const payload=await response.json();
     if(!response.ok||typeof payload.url!=="string"||!payload.url.startsWith("https://checkout.stripe.com/"))
       throw Error(payload.error||"Unable to connect to Stripe.");
     window.location.assign(payload.url);
   }catch(error){
     working=false;render();showError(error.message||"Unable to open secure payment.");
   }
 });
 async function status(){
   try{
     const response=await fetch("/api/checkout/status",{cache:"no-store"});
     const data=await response.json();
     enabled=response.ok&&data.enabled===true&&
       (data.mode==="test"||(data.mode==="live"&&data.manual_order_handling===true));
     if(/^\d{4}-\d{2}-\d{2}$/.test(data.minimum_date||""))
       minimumDate=data.minimum_date;
   }catch{enabled=false;}
   if(!minimumDate){
     const dt=new Date();dt.setUTCDate(dt.getUTCDate()+7);
     minimumDate=dt.toISOString().slice(0,10);
   }
   render();
 }
 const params=new URLSearchParams(location.search);
 if(params.get("checkout_cancelled")==="1"){
   openCart();state.stage=complete(active())?"details":active().frequency?"delivery":"pack";
   render();showError("Payment cancelled. No charge was made.");
 }
 render();status();
 document.querySelectorAll(".sprout-orb__photo").forEach(photo=>{
   const fail=()=>{photo.hidden=true;photo.parentElement?.classList.add("sprout-orb--photo-missing")};
   photo.addEventListener("error",fail);
   if(photo.complete&&!photo.naturalWidth)fail();
 });
})();
