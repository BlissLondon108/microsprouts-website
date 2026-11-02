/* Browses all eight sprouts without changing basket prices or pack state.
 * Existing broccoli photos remain in their original gallery on the first slide. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const items = [
  ['broccoli','Broccoli','Grown with love and care. Naturally contains glucoraphanin, the precursor to sulforaphane.'],
  ['radish','Radish','Bright, peppery little greens that bring a lively crunch to everyday meals.'],
  ['mung-bean','Mung Bean','Juicy and crisp with a gentle nutty flavour. Lovely in noodles and stir-fries.'],
  ['leek','Leek','Fine green shoots with a savoury, onion-like flavour. A fresh finishing touch.'],
  ['mustard','Mustard','Zesty sprouts with a distinctive mustardy bite for salads and sandwiches.'],
  ['fenugreek','Fenugreek','Aromatic, earthy sprouts with a gentle nutty flavour and plenty of character.'],
  ['alfalfa','Alfalfa','Light, tender shoots with a mild, fresh flavour for wraps, salads and toast.'],
  ['green-pea','Green Pea','Sweet, fresh pea shoots that add colour and a delicate crunch to your plate.']
 ];
 const photo=$('hero-photo'),frame=document.querySelector('.gallery-main'),gallery=$('hero-product-gallery');
 const heroRoot=$('hero'),content=$('products');
 const arrows=[$('hero-variety-prev'),$('hero-variety-next')].filter(Boolean);
 const row=$('gallery-thumbs'),originalThumbs=[...document.querySelectorAll('#gallery-thumbs .gallery-thumb')];
 const heading=$('product-heading'),desc=document.querySelector('#hero-variety-panel .description');
 const chooser=$('hero-package-options'),checkout=$('checkout-button');
 const path=slug=>'assets/sprout-orbs/'+slug+'.webp';
 const packs={'200':['Single Pack','assets/single-ornate-wide-v1.svg'],'500':['Family Pack','assets/family-ornate-wide-v1.svg']};
 let current=0,pack='200',photoRequest=0,transitioning=false;
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const imageSource=index=>index===0?packs[pack][1]:path(items[index][0]);
 function imageForCurrent(preloaded=false){
  const item=items[current],broccoli=current===0;
  const src=imageSource(current);
  const alt=broccoli?'Fresh broccoli sprouts on a porcelain plate, '+packs[pack][0]:'Fresh '+item[1].toLowerCase()+' sprouts';
  const token=++photoRequest;
  const apply=()=>{
   if(token!==photoRequest||!photo)return;
   photo.src=src;photo.alt=alt;
   photo.classList.toggle('is-pack-photo',broccoli);
   photo.classList.toggle('is-variety-photo',!broccoli);
   frame?.classList.toggle('is-variety-view',!broccoli);
  };
  if(preloaded){apply();return}
  const image=new Image();
  image.onload=apply;
  image.src=src;
 }
 function previewButtons(){
  if(!row)return;
  row.querySelectorAll('.hero-variety-preview').forEach(button=>button.remove());
  originalThumbs.forEach(button=>{button.hidden=current!==0;if(current!==0)button.setAttribute('aria-pressed','false')});
  row.classList.toggle('is-variety-previews',current!==0);
  gallery?.setAttribute('aria-label',items[current][1]+' sprouts gallery');
  if(current===0)return;
  for(const delta of [-1,0,1,2]){
   const i=(current+delta+items.length)%items.length,entry=items[i],button=document.createElement('button');
   button.type='button';button.className='gallery-thumb hero-variety-preview';
   button.setAttribute('aria-label','Choose '+entry[1]+' sprouts');
   button.setAttribute('aria-pressed',String(i===current));
   const image=document.createElement('img');image.src=path(entry[0]);image.alt='';image.loading='lazy';
   const caption=document.createElement('span');caption.className='hero-variety-preview__name';caption.textContent=entry[1];
   button.append(image,caption);
   button.addEventListener('click',()=>select(i,i<current?-1:1));
   row.appendChild(button);
  }
 }
 function fitTitle(){
  if(!heading)return;
  // Preserve the intended headline size for short names. Reduce only when
  // a longer sprout title would exceed its available single line.
  heading.style.fontSize='';
  const width=heading.clientWidth;
  const full=heading.scrollWidth;
  if(width>0&&full>width){
   const baseSize=parseFloat(window.getComputedStyle(heading).fontSize);
   if(Number.isFinite(baseSize)&&baseSize>0){
    heading.style.fontSize=Math.max(18,Math.floor(baseSize*(width-5)/full))+'px';
   }
  }
 }
 window.addEventListener('resize',fitTitle);
 function render(preloaded=false){
  const item=items[current];
  heading.textContent=item[1]+' Sprouts';fitTitle();desc.textContent=item[2];
  chooser?.setAttribute('aria-label','Choose your '+item[1].toLowerCase()+' sprouts pack');
  if(checkout){
   checkout.dataset.variety=item[0];checkout.dataset.pack=pack;
   checkout.setAttribute('aria-label','Open shopping basket for '+item[1]+' sprouts, '+packs[pack][0]);
  }
  imageForCurrent(preloaded);previewButtons();
 }
 /* Create an inert picture of the outgoing two-column showcase,
    then slide it off while the new complete showcase enters beside it.
    The fixed navbar, green frame and overlay arrows never move. */
 function moveShowcase(target,dir,preloaded){
  if(!content||!heroRoot||!content.animate){
   current=target;render(preloaded);transitioning=false;
   arrows.forEach(button=>button.disabled=false);
   return;
  }
  const oldRect=content.getBoundingClientRect();
  const hostRect=heroRoot.getBoundingClientRect();
  const outgoing=content.cloneNode(true);
  outgoing.removeAttribute('id');
  outgoing.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  outgoing.setAttribute('aria-hidden','true');
  outgoing.inert=true;
  outgoing.classList.add('hero-variety-ghost');
  outgoing.style.left=(oldRect.left-hostRect.left)+'px';
  outgoing.style.top=(oldRect.top-hostRect.top)+'px';
  outgoing.style.width=oldRect.width+'px';
  outgoing.style.height=oldRect.height+'px';
  heroRoot.appendChild(outgoing);
  current=target;render(preloaded);
  const distance=oldRect.width;
  const step=dir<0?-1:1;
  const settings={duration:480,easing:'cubic-bezier(.22,.76,.22,1)',fill:'both'};
  // Hold enough room for both content states during the slide.
  const oldMinHeight=content.style.minHeight;
  content.style.minHeight=Math.max(oldRect.height,content.getBoundingClientRect().height)+'px';
  content.inert=true;
  let exit,entry;
  const finish=()=>{
   outgoing.remove();
   content.inert=false;
   content.style.minHeight=oldMinHeight;
   transitioning=false;
   arrows.forEach(button=>button.disabled=false);
  };
  try{
   exit=outgoing.animate([
    {transform:'translateX(0px)'},
    {transform:'translateX('+(-step*distance)+'px)'}
   ],settings);
   entry=content.animate([
    {transform:'translateX('+(step*distance)+'px)'},
    {transform:'translateX(0px)'}
   ],settings);
  }catch{finish();return}
  Promise.allSettled([exit.finished,entry.finished]).then(finish);
 }
 function select(index,dir=1){
  const target=(index+items.length)%items.length;
  if(target===current||transitioning)return;
  if(reduced()){
   current=target;render();
   return;
  }
  transitioning=true;
  arrows.forEach(button=>button.disabled=true);
  // Preload the incoming picture so the entire new slide is ready
  // before its coordinated movement begins.
  const preload=new Image();
  preload.onload=()=>moveShowcase(target,dir,true);
  preload.onerror=()=>moveShowcase(target,dir,false);
  preload.src=imageSource(target);
 }
 $('hero-variety-prev')?.addEventListener('click',()=>select(current-1,-1));
 $('hero-variety-next')?.addEventListener('click',()=>select(current+1,1));
 window.MicroHeroVarieties={
  onPack(value){
   if(!packs[value])return false;
   pack=value;
   if(checkout){
    checkout.dataset.pack=pack;
    checkout.setAttribute('aria-label','Open shopping basket for '+items[current][1]+' sprouts, '+packs[pack][0]);
   }
   if(current===0)return false;
   imageForCurrent();return true;
  }
 };
 // Fit the initial Broccoli heading too, including on the first mobile render.
 fitTitle();
 // Variety changes are click-only. Touch/swipe navigation will be designed separately.
})();
