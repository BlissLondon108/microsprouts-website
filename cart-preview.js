/* MicroSprouts multi-entry progressive basket.
 * Each broccoli pack is an independently editable order line.
 * Stripe Checkout remains the sole place where money can be taken.
 */
(() => {
 "use strict";
 const el=id=>document.getElementById(id);
 const overlay=el("cart-overlay"),trigger=el("open-cart"),form=el("basket-flow-form");
 if(!overlay||!trigger||!form)return;
 const panel=el("basket"),pay=el("basket-pay");
 const stages=["pack","order","delivery","details"];
 const prices={once:{"200":999,"500":1699},weekly:{"200":899,"500":1549}};
 const varietyNames={"broccoli":"Broccoli","radish":"Radish","mung-bean":"Mung bean","leek":"Leek","mustard":"Mustard","fenugreek":"Fenugreek","alfalfa":"Alfalfa","green-pea":"Green pea"};
 const validVariety=variety=>Object.hasOwn(varietyNames,variety);
 const varietyLabel=entry=>varietyNames[entry.variety||"broccoli"]||"Broccoli";
 const makeEntry=(id,variety="broccoli")=>({id,variety,pack:null,frequency:null,method:null});
 // Truly empty by default. The old v2 key contained an implicit broccoli
 // draft; do not restore it as an item on existing visitors' next load.
 const state={entries:[],activeId:null,stage:"pack",nextId:1};
 const storeKey="microsprouts-basket-entries-v3";
 // The picker is for discovering the eight varieties. Only broccoli has
 // the same owner-approved Stripe amounts across all varieties.
 const sproutPicker=el("basket-sprout-picker"),sproutTrack=el("basket-sprout-track");
 const sproutCards=[...sproutTrack.querySelectorAll("[data-sprout-card]")];
 let sproutIndex=0;
 function setSproutIndex(next,scroll=true){
   sproutIndex=Math.max(0,Math.min(sproutCards.length-1,next));
   el("basket-sprout-prev").disabled=sproutIndex===0;
   el("basket-sprout-next").disabled=sproutIndex>=sproutCards.length-1;
   setText("basket-sprout-progress",(sproutIndex+1)+" of "+sproutCards.length);
   if(scroll&&typeof sproutTrack.scrollTo==="function"){
     const first=sproutCards[0],selected=sproutCards[sproutIndex];
     sproutTrack.scrollTo({left:selected.offsetLeft-first.offsetLeft,
       behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"instant":"smooth"});
   }
 }
 function closeSproutPicker(){
   sproutPicker.hidden=true;
   el("basket-start").setAttribute("aria-expanded","false");
 }
 let enabled=false,working=false,returnFocus=null;
 let minimumDate="",dateOffset=0;
 const money=p=>"£"+(p/100).toFixed(2);
 const setText=(id,value)=>{el(id).textContent=value};
 const active=()=>state.entries.find(entry=>entry.id===state.activeId)||state.entries[0]||null;
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
         id,variety:validVariety(v.variety)?v.variety:"broccoli",
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
 const shippingLine=entry=>{
   if(!entry||!entry.method)return "";
   if(entry.method==="pickup")return "Collection · Free";
   if(entry.frequency==="weekly")return "Shipping · Free";
   const charged=state.entries.find(item=>item.method==="delivery"&&item.frequency==="once");
   return charged?.id===entry.id?"+ £2.30 shipping":"Shipping · Included";
 };
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
   const current=el("basket-current-item");
   box.replaceChildren();
   for(const entry of state.entries){
     // Move the same editor into its original slot rather than moving products
     // above one another when a previously completed entry is edited.
     if(entry.id===state.activeId){
       box.append(current);
       continue;
     }
     const article=appendNode(box,"article","basket-flow__previous-item");
     article.dataset.openEntry=String(entry.id);
     article.tabIndex=0;
     article.setAttribute("role","group");
     article.setAttribute("aria-label",varietyLabel(entry)+" Sprouts pack "+entry.pack+" grams. Click or press Enter to expand.");
     const chips=appendNode(article,"div","basket-flow__previous-chips");
     const selections=[
       ["pack",entry.pack?entry.pack+"g":"Choose pack"],
       ["order",entry.frequency==="weekly"?"Weekly":entry.frequency==="once"?"One-time":"Choose type"],
       ["delivery",entry.method==="pickup"?"Collection":entry.method==="delivery"?"Shipping":"Choose shipping"]
     ];
     for(const [step,label] of selections){
       const chip=appendNode(chips,"button","basket-flow__mini-chip",label);
       chip.type="button";chip.dataset.entryId=String(entry.id);
       chip.dataset.entryStage=step;chip.setAttribute("aria-label","Edit "+label+" for this sprout pack");
     }
     const head=appendNode(article,"div","basket-flow__previous-head");
     appendNode(head,"span","basket-flow__previous-name",varietyLabel(entry)+" Sprouts");
     if(entry.pack){
       const cost=appendNode(head,"div","basket-flow__previous-cost");
       appendNode(cost,"strong","basket-flow__previous-price",
         money(prices[entry.frequency||"once"][entry.pack]));
       const line=shippingLine(entry);
       if(line)appendNode(cost,"small","basket-flow__shipping-note",line);
     }
     const remove=appendNode(article,"button","basket-flow__mini-remove","×");
     remove.type="button";
     remove.dataset.removeEntry=String(entry.id);
     remove.setAttribute("aria-label","Remove this "+varietyLabel(entry)+" pack");
   }
 }
 function render(){
   const entry=active();
   const isEmpty=!entry;
   el("basket-empty").hidden=!isEmpty;
   el("basket-other-items").hidden=isEmpty;
   el("basket-shared-details").hidden=isEmpty;
   if(isEmpty){
     el("basket-remove-entry").hidden=true;
     // Keep the reusable editor connected to the document even when no
     // products exist. Detaching it makes getElementById return null when
     // the visitor adds the first pack, breaking the live basket render.
     const current=el("basket-current-item");
     el("basket-other-items").replaceChildren(current);
     el("basket-items-control").hidden=true;
     el("basket-stage").hidden=true;
     el("basket-pay").hidden=true;
     el("basket-pay").disabled=true;
     el("nav-cart-count").textContent="0";
     trigger.setAttribute("aria-label","Open shopping basket, 0 packs");
     setText("basket-total-type","Due today");
     setText("basket-total","—");
     setText("basket-total-note","No items yet");
     return;
   }
   form.querySelectorAll("[data-basket-stage]").forEach(section=>{
     section.hidden=section.dataset.basketStage!==state.stage;
   });
   el("basket-stage").hidden=state.stage==="details";
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
   el("basket-remove-entry").hidden=false;
   // A newly added (not-yet-configured) pack is still an item in the basket.
   // The nav badge updates immediately, before its size is chosen.
   const photo=el("basket-current-photo");
   if(photo){photo.src="assets/sprout-orbs/"+(entry.variety||"broccoli")+".webp";
     photo.alt=varietyLabel(entry)+" sprouts";}
   if(el("basket-current-name"))setText("basket-current-name",varietyLabel(entry)+" Sprouts");
   const count=state.entries.length;
   const pricedCount=state.entries.filter(i=>i.pack).length;
   setText("nav-cart-count",String(count));
   trigger.setAttribute("aria-label","Open shopping basket, "+count+(count===1?" pack":" packs"));
   setText("basket-pack-200-price",money(prices[entry.frequency||"once"]["200"]));
   setText("basket-pack-500-price",money(prices[entry.frequency||"once"]["500"]));
   const currentPrice=el("basket-current-price");
   currentPrice.hidden=!entry.pack;
   if(entry.pack)currentPrice.textContent=money(prices[entry.frequency||"once"][entry.pack]);
   const currentShipping=el("basket-current-shipping");
   const line=shippingLine(entry);
   currentShipping.hidden=!line;
   currentShipping.textContent=line;
   setText("basket-delivery-price",entry.frequency==="weekly"?"UK · Free":"UK · £2.30");
   const amounts=calc();
   setText("basket-total",pricedCount?money(amounts.due):"—");
   setText("basket-total-type","Due today");
   const lines=state.entries.filter(i=>i.pack).map(i=>varietyLabel(i)+" "+i.pack+"g "+(i.frequency==="weekly"?"weekly":"once"));
   const note=amounts.weekly?money(amounts.weekly)+" / week after today":
     pricedCount?lines.join(" · "):"Choose a pack to begin";
   setText("basket-total-note",note);
   renderCalendar();
   const details=state.stage==="details";
   pay.hidden=!details;
   pay.disabled=!details||!enabled||working||!state.entries.every(complete);
   pay.textContent=working?"Connecting…":"Continue to payment →";

 }
 function setStage(stage,focus=true){
   if(!stages.includes(stage))return;
   state.stage=stage;showError("");render();
   if(focus){
     const section=form.querySelector('[data-basket-stage="'+stage+'"]');
     (section?.querySelector("button,input")||el("close-cart")).focus();
   }
 }
 function addEntry(options={}){
   if(state.entries.length>=10)return null;
   const entry=makeEntry(state.nextId++,validVariety(options.variety)?options.variety:"broccoli");
   if(["200","500"].includes(options.pack))entry.pack=options.pack;
   if(["once","weekly"].includes(options.frequency))entry.frequency=options.frequency;
   state.entries.push(entry);state.activeId=entry.id;state.stage="pack";
   save();
   return entry;
 }
 function openCart(options={}){
   returnFocus=document.activeElement;
   // The nav cart simply opens the basket. Explicit shopping CTAs create
   // one separate entry, but opening an empty basket never creates broccoli.
   if(options.add){closeSproutPicker();addEntry(options);}
   if(active()&&!complete(active())&&state.stage==="details")
     state.stage=active().frequency?"delivery":active().pack?"order":"pack";
   overlay.hidden=false;document.body.classList.add("overlay-open");
   trigger.setAttribute("aria-expanded","true");
   render();el("close-cart").focus();
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
   openCart({add:true,
     pack:button.dataset.pack||(button.id==="checkout-button"?el("checkout-button")?.dataset.pack:null),
     frequency:button.dataset.frequency,variety:button.dataset.variety});
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
 const expandEntry=id=>{
   const entry=state.entries.find(item=>item.id===id);
   if(!entry)return;
   state.activeId=entry.id;
   save();
   // An already configured pack reopens its last decision; the chips let
   // customers jump straight to any earlier choice.
   const step=!entry.pack?"pack":!entry.frequency?"order":"delivery";
   setStage(step);
 };
 el("basket-other-items").addEventListener("click",event=>{
   const edit=event.target.closest("[data-entry-id]");
   const remove=event.target.closest("[data-remove-entry]");
   if(remove){removeEntry(Number(remove.dataset.removeEntry));return;}
   if(edit){
     state.activeId=Number(edit.dataset.entryId);save();setStage(edit.dataset.entryStage);
     return;
   }
   const row=event.target.closest("[data-open-entry]");
   if(row)expandEntry(Number(row.dataset.openEntry));
 });
 el("basket-other-items").addEventListener("keydown",event=>{
   if(event.key!=="Enter"&&event.key!==" ")return;
   // Keyboard activation of the group itself, never hijack the inner buttons.
   if(!event.target.dataset.openEntry)return;
   event.preventDefault();
   expandEntry(Number(event.target.dataset.openEntry));
 });
 el("basket-start").addEventListener("click",()=>{
   const opening=sproutPicker.hidden;
   sproutPicker.hidden=!opening;
   el("basket-start").setAttribute("aria-expanded",String(opening));
   if(opening)setSproutIndex(0);
 });
 el("basket-sprout-prev").addEventListener("click",()=>setSproutIndex(sproutIndex-1));
 el("basket-sprout-next").addEventListener("click",()=>setSproutIndex(sproutIndex+1));
 sproutTrack.addEventListener("keydown",event=>{
   if(event.key!=="ArrowRight"&&event.key!=="ArrowLeft")return;
   event.preventDefault();
   setSproutIndex(sproutIndex+(event.key==="ArrowRight"?1:-1));
 });
 sproutTrack.addEventListener("scroll",()=>{
   if(sproutPicker.hidden||!sproutCards.length)return;
   const x=sproutTrack.scrollLeft+sproutCards[0].offsetLeft;
   const nearest=sproutCards.reduce((best,card,i)=>
     Math.abs(card.offsetLeft-x)<Math.abs(sproutCards[best].offsetLeft-x)?i:best,0);
   if(nearest!==sproutIndex)setSproutIndex(nearest,false);
 });
 sproutTrack.addEventListener("click",event=>{
   const button=event.target.closest("[data-sprout-add]");
   if(!button||!validVariety(button.dataset.sproutAdd))return;
   closeSproutPicker();
   if(addEntry({variety:button.dataset.sproutAdd}))setStage("pack");
 });
 el("basket-add-another").addEventListener("click",()=>{
   if(state.entries.length>=10||!complete(active()))return;
   if(addEntry())setStage("pack");
 });
 el("basket-add-variety")?.addEventListener("click",()=>{
   if(state.entries.length>=10||!complete(active()))return;
   const opening=sproutPicker.hidden;
   sproutPicker.hidden=!opening;
   if(opening)setSproutIndex(0);
 });
 function removeEntry(id){
   state.entries=state.entries.filter(entry=>entry.id!==id);
   if(!state.entries.length){
     state.activeId=null;state.nextId=1;state.stage="pack";
     closeSproutPicker();
     save();showError("");render();el("basket-start").focus();return;
   }
   if(state.activeId===id)state.activeId=state.entries.at(-1).id;
   save();setStage(complete(active())?"details":active().frequency?"delivery":active().pack?"order":"pack");
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
 const isoDate=day=>day.toISOString().slice(0,10);
 const fullLabel=new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",
   weekday:"long",day:"numeric",month:"long",year:"numeric"});
 const monthLabel=new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",month:"long",year:"numeric"});
 const shortMonth=new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",month:"short"});
 const weekdayLabel=new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",weekday:"short"});
 const allowedDay=day=>[2,3,4,5].includes(day.getUTCDay());
 const maxDate=()=>{
   const end=new Date(minimumDate+"T12:00:00Z");
   end.setUTCDate(end.getUTCDate()+90);
   return isoDate(end);
 };
 function availableDates(){
   if(!minimumDate)return [];
   const dates=[],first=new Date(minimumDate+"T12:00:00Z");
   const limit=maxDate();
   // Walk actual available dates rather than calendar weeks, so the strip
   // always shows four choices even when the earliest week has only 1-2 left.
   for(let i=0;i<=90;i++){
     const day=new Date(first.getTime());
     day.setUTCDate(first.getUTCDate()+i);
     if(isoDate(day)>limit)break;
     if(allowedDay(day))dates.push(isoDate(day));
   }
   return dates;
 }
 const dateFromISO=value=>new Date(value+"T12:00:00Z");
 const headingFor=dates=>{
   const first=dateFromISO(dates[0]),last=dateFromISO(dates.at(-1));
   if(first.getUTCFullYear()===last.getUTCFullYear()&&
      first.getUTCMonth()===last.getUTCMonth())
     return monthLabel.format(first);
   if(first.getUTCFullYear()===last.getUTCFullYear())
     return shortMonth.format(first)+" – "+shortMonth.format(last)+" "+first.getUTCFullYear();
   return shortMonth.format(first)+" "+first.getUTCFullYear()+" – "+
     shortMonth.format(last)+" "+last.getUTCFullYear();
 };
 function renderCalendar(){
   const dates=availableDates();
   if(!dates.length)return;
   const lastStart=Math.max(0,dates.length-4);
   dateOffset=Math.max(0,Math.min(dateOffset,lastStart));
   const shown=dates.slice(dateOffset,dateOffset+4);
   const selected=el("basket-date").value;
   el("basket-calendar-prev").disabled=dateOffset===0;
   el("basket-calendar-next").disabled=dateOffset>=lastStart;
   setText("basket-calendar-month",headingFor(shown));
   const grid=el("basket-calendar-grid");
   grid.replaceChildren();
   for(const value of shown){
     const day=dateFromISO(value);
     const button=appendNode(grid,"button","basket-flow__calendar-day");
     button.type="button";
     button.dataset.calendarDate=value;
     button.setAttribute("aria-label",fullLabel.format(day));
     button.setAttribute("aria-pressed",String(value===selected));
     if(value===selected)button.classList.add("is-selected");
     appendNode(button,"span","basket-flow__date-weekday",weekdayLabel.format(day));
     appendNode(button,"strong","basket-flow__date-number",String(day.getUTCDate()));
     appendNode(button,"span","basket-flow__date-month",shortMonth.format(day));
   }
   setText("basket-date-label",selected?
     "Selected: "+fullLabel.format(dateFromISO(selected)):
     "Choose one of the next available Tuesday–Friday dates");
 }
 function validDate(value){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!minimumDate||
      value<minimumDate||value>maxDate())return false;
   const day=dateFromISO(value);
   return !Number.isNaN(day.getTime())&&isoDate(day)===value&&allowedDay(day);
 }
 el("basket-calendar-prev").addEventListener("click",()=>{
   dateOffset=Math.max(0,dateOffset-4);
   renderCalendar();
 });
 el("basket-calendar-next").addEventListener("click",()=>{
   const max=Math.max(0,availableDates().length-4);
   dateOffset=Math.min(max,dateOffset+4);
   renderCalendar();
 });
 el("basket-calendar-grid").addEventListener("click",event=>{
   const button=event.target.closest("button[data-calendar-date]");
   if(!button||button.disabled||!validDate(button.dataset.calendarDate))return;
   el("basket-date").value=button.dataset.calendarDate;
   renderCalendar();
   el("basket-calendar-grid").querySelector('[data-calendar-date="'+button.dataset.calendarDate+'"]')?.focus();
   showError("");
 });
 function values(){
   return {
     items:state.entries.map(item=>({variety:item.variety||"broccoli",pack:item.pack,frequency:item.frequency,method:item.method})),
     date:el("basket-date").value,
     return_to_basket:true
   };
 }
 function validate(v){
   if(!state.entries.every(complete))return "Complete each sprout pack before continuing.";
   if(!validDate(v.date))return "Choose an available Tuesday–Friday date at least seven days ahead.";
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
 const incomingVariety=params.get("add-sprout");
 if(validVariety(incomingVariety)){
   openCart({add:true,variety:incomingVariety});
   try{window.history?.replaceState(null,"",location.pathname+"#basket")}catch{}
 }
 if(params.get("checkout_cancelled")==="1"){
   openCart();
   state.stage=complete(active())?"details":active()?.frequency?"delivery":"pack";
   render();showError("Payment cancelled. No charge was made.");
 }
 render();status();
 document.querySelectorAll(".sprout-orb__photo").forEach(photo=>{
   const fail=()=>{photo.hidden=true;photo.parentElement?.classList.add("sprout-orb--photo-missing")};
   photo.addEventListener("error",fail);
   if(photo.complete&&!photo.naturalWidth)fail();
 });
})();
