/* MicroSprouts basket & sprout choice prototype.
 * Explicitly not connected to payment creation. Existing Stripe checkout
 * remains separate, and enquiry-only varieties have no invented prices.
 */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const items=byId("basket-items");
  const cart=byId("cart-overlay");
  const picker=byId("sprout-picker");
  if(!items||!cart||!picker)return;
  const counter=byId("basket-count");
  const navCounter=byId("nav-cart-count");
  const navButton=byId("open-cart");
  const subtotal=byId("basket-subtotal");
  const enquiryNote=byId("basket-unpriced");
  const feedback=byId("basket-feedback");
  const pickerTitle=byId("sprout-picker-title");
  const pickerDescription=byId("sprout-picker-description");
  const pickerChoices=byId("sprout-picker-choices");
  const catalogue=Object.freeze({
    "broccoli-200":{name:"Broccoli · Single Pack",detail:"200g",pennies:999},
    "broccoli-500":{name:"Broccoli · Family Pack",detail:"500g",pennies:1699},
    radish:{name:"Radish sprouts",detail:"Pack and price by enquiry",pennies:null},
    mung:{name:"Mung bean sprouts",detail:"Pack and price by enquiry",pennies:null},
    leek:{name:"Leek sprouts",detail:"Pack and price by enquiry",pennies:null}
  });
  const sproutChoices=Object.freeze({
    broccoli:{name:"Broccoli sprouts",description:"Choose the perfect pack for you.",options:["broccoli-200","broccoli-500"]},
    radish:{name:"Radish sprouts",description:"Bright and peppery. Pack sizes and prices will be confirmed personally.",options:["radish"]},
    mung:{name:"Mung bean sprouts",description:"Fresh and crunchy. Pack sizes and prices will be confirmed personally.",options:["mung"]},
    leek:{name:"Leek sprouts",description:"Gentle and savoury. Pack sizes and prices will be confirmed personally.",options:["leek"]}
  });
  const key="microsprouts-basket-preview-v1";
  const quantities=Object.create(null);
  const money=pennies=>"£"+(pennies/100).toFixed(2);
  let previousFocus=null;

  try{
    const saved=JSON.parse(localStorage.getItem(key)||"{}");
    if(saved&&typeof saved==="object"&&!Array.isArray(saved)){
      for(const sku of Object.keys(catalogue)){
        const quantity=saved[sku];
        if(Number.isInteger(quantity)&&quantity>0&&quantity<=10)quantities[sku]=quantity;
      }
    }
  }catch{/* Storage is optional for a visual prototype. */}
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(quantities));}catch{}};
  const element=(tag,className,content)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(content!==undefined)node.textContent=content;
    return node;
  };
  const focusables=dialog=>[...dialog.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])")];
  const overlayOpen=()=>!cart.hidden||!picker.hidden;
  function openCart(){
    const fromPicker=!picker.hidden;
    if(fromPicker)closePicker(false);
    if(!fromPicker)previousFocus=document.activeElement;
    cart.hidden=false;
    document.body.classList.add("overlay-open");
    navButton?.setAttribute("aria-expanded","true");
    byId("close-cart").focus();
  }
  function closeCart(restore=true){
    if(cart.hidden)return;
    cart.hidden=true;
    navButton?.setAttribute("aria-expanded","false");
    if(!overlayOpen())document.body.classList.remove("overlay-open");
    if(restore)previousFocus?.focus?.();
  }
  function openPicker(sprout){
    if(!Object.hasOwn(sproutChoices,sprout))return;
    if(!cart.hidden)closeCart(false);
    previousFocus=document.activeElement;
    const choice=sproutChoices[sprout];
    pickerTitle.textContent=choice.name;
    pickerDescription.textContent=choice.description;
    pickerChoices.replaceChildren();
    for(const sku of choice.options){
      const product=catalogue[sku];
      const button=element("button","sprout-picker__option");
      button.type="button";
      button.dataset.pickSku=sku;
      const detail=element("span","sprout-picker__option-name",
        choice.options.length>1?product.detail:"Add to enquiry basket");
      const price=element("strong","sprout-picker__option-price",
        product.pennies===null?"Price on request":money(product.pennies));
      const arrow=element("span","sprout-picker__option-arrow","＋");
      arrow.setAttribute("aria-hidden","true");
      button.append(detail,price,arrow);
      pickerChoices.append(button);
    }
    picker.hidden=false;
    document.body.classList.add("overlay-open");
    byId("close-picker").focus();
  }
  function closePicker(restore=true){
    if(picker.hidden)return;
    picker.hidden=true;
    if(!overlayOpen())document.body.classList.remove("overlay-open");
    if(restore)previousFocus?.focus?.();
  }
  function render(){
    const skus=Object.keys(catalogue).filter(sku=>quantities[sku]>0);
    const count=skus.reduce((sum,sku)=>sum+quantities[sku],0);
    const price=skus.reduce((sum,sku)=>{
      const pennies=catalogue[sku].pennies;
      return sum+(pennies===null?0:pennies*quantities[sku]);
    },0);
    counter.textContent=String(count);
    counter.setAttribute("aria-label",count+(count===1?" item":" items"));
    if(navCounter)navCounter.textContent=String(count);
    navButton?.setAttribute("aria-label","Open shopping basket, "+count+(count===1?" item":" items"));
    subtotal.textContent=money(price);
    enquiryNote.hidden=!skus.some(sku=>catalogue[sku].pennies===null);
    items.replaceChildren();
    if(!skus.length){
      items.append(element("li","basket-preview__empty",
        "Your basket is waiting for something green. Choose a sprout to get started."));
      return;
    }
    for(const sku of skus){
      const product=catalogue[sku];
      const item=element("li","basket-item");
      const body=element("div","basket-item__details");
      body.append(element("strong","basket-item__name",product.name));
      body.append(element("span","basket-item__detail",product.detail));
      body.append(element("span","basket-item__price",
        product.pennies===null?"Price on request":money(product.pennies*quantities[sku])));
      const controls=element("div","basket-item__controls");
      const minus=element("button","basket-item__adjust","−");
      minus.type="button";minus.dataset.basketSku=sku;minus.dataset.basketDelta="-1";
      minus.setAttribute("aria-label","Remove one "+product.name);
      const quantity=element("span","basket-item__qty",String(quantities[sku]));
      const plus=element("button","basket-item__adjust","+");
      plus.type="button";plus.dataset.basketSku=sku;plus.dataset.basketDelta="1";
      plus.disabled=quantities[sku]>=10;
      plus.setAttribute("aria-label","Add one "+product.name);
      controls.append(minus,quantity,plus);
      item.append(body,controls);
      items.append(item);
    }
  }
  function update(sku,delta){
    if(!Object.hasOwn(catalogue,sku)||!Number.isInteger(delta))return;
    const old=quantities[sku]||0;
    const next=Math.max(0,Math.min(10,old+delta));
    if(next===old){
      if(delta>0)feedback.textContent="Maximum 10 packs per variety in this preview.";
      return;
    }
    if(next)quantities[sku]=next;
    else delete quantities[sku];
    save();render();
    feedback.textContent=delta>0?catalogue[sku].name+" added to your basket preview.":
      catalogue[sku].name+(next?" quantity updated.":" removed from your basket preview.");
  }
  navButton?.addEventListener("click",openCart);
  document.querySelectorAll("[data-cart-close]").forEach(button=>
    button.addEventListener("click",()=>closeCart()));
  document.querySelectorAll("[data-picker-close]").forEach(button=>
    button.addEventListener("click",()=>closePicker()));
  document.querySelectorAll("[data-sprout-choice]").forEach(button=>
    button.addEventListener("click",()=>openPicker(button.dataset.sproutChoice)));
  pickerChoices.addEventListener("click",event=>{
    const button=event.target.closest("button[data-pick-sku]");
    if(!button||!pickerChoices.contains(button))return;
    update(button.dataset.pickSku,1);
    openCart();
  });
  items.addEventListener("click",event=>{
    const button=event.target.closest("button[data-basket-sku]");
    if(!button||!items.contains(button))return;
    update(button.dataset.basketSku,Number(button.dataset.basketDelta));
  });
  document.addEventListener("keydown",event=>{
    const dialog=!picker.hidden?picker:!cart.hidden?cart:null;
    if(!dialog)return;
    if(event.key==="Escape"){
      event.preventDefault();
      if(dialog===picker)closePicker();else closeCart();
    }else if(event.key==="Tab"){
      const controls=focusables(dialog);
      if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  render();
})();
