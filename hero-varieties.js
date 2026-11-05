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
 const galleryPath=(slug,stage)=>'assets/variety-gallery/'+slug+'-'+stage+'.webp'+((slug==='fenugreek'||slug==='mustard')?'?v='+(stage==='serving'?7:6):slug==='mung-bean'?'?v='+(stage==='serving'?4:2):slug==='alfalfa'?'?v=2':slug==='green-pea'?'?v=2':(slug==='radish'||slug==='leek'?'?v=3':''));
 // The four photo slots follow the approved broccoli gallery's progression.
 const galleryStages=[
  ['seeds','Seeds before sprouting'],
  ['sprouting','Seeds beginning to sprout'],
  ['closeup','Mature sprouts close-up'],
  ['serving','A fresh serving idea']
 ];
 const packs={'200':['Single Pack','assets/single-ornate-wide-v1.svg'],'500':['Family Pack','assets/family-ornate-wide-v1.svg']};
 let current=0,pack='200',photoRequest=0,transitioning=false;
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 // The third thumbnail is the first visible hero photo for every variety.
 const imageSource=index=>index===0?'assets/approved/macro.webp':galleryPath(items[index][0],'closeup');
 function imageForCurrent(preloaded=false){
  const item=items[current],broccoli=current===0;
  const src=imageSource(current);
  const alt=broccoli?'Close-up of fresh broccoli sprouts, fine stems and paired green leaves':'Close-up of fresh '+item[1].toLowerCase()+' sprouts';
  const token=++photoRequest;
  const apply=()=>{
   if(token!==photoRequest||!photo)return;
   photo.src=src;photo.alt=alt;
   photo.classList.remove('is-pack-photo');
   photo.classList.toggle('is-variety-photo',!broccoli);
   photo.classList.toggle('is-variety-detail-photo',!broccoli);
   frame?.classList.toggle('is-variety-view',!broccoli);
   frame?.classList.toggle('is-variety-detail-view',!broccoli);
   frame?.style.removeProperty('--variety-detail-image');
  };
  if(preloaded){apply();return}
  const image=new Image();
  image.onload=apply;
  image.src=src;
 }
 function showVarietyDetail(src,description,selected){
  const token=++photoRequest;
  const image=new Image();
  image.onload=()=>{
   // Navigating to another sprout invalidates the previous image request.
   if(token!==photoRequest||current===0||!photo)return;
   photo.src=src;
   photo.alt=items[current][1]+' sprouts: '+description.toLowerCase();
   photo.classList.remove('is-pack-photo');
   photo.classList.add('is-variety-photo','is-variety-detail-photo');
   frame?.classList.add('is-variety-view','is-variety-detail-view');
   row?.querySelectorAll('.hero-variety-preview').forEach(
    button=>button.setAttribute('aria-pressed',String(button===selected))
   );
  };
  image.src=src;
 }
 function previewButtons(){
  if(!row)return;
  row.querySelectorAll('.hero-variety-preview').forEach(button=>button.remove());
  originalThumbs.forEach(button=>{
   button.hidden=current!==0;
   button.setAttribute('aria-pressed',String(current===0&&button.dataset.gallery==='macro'));
  });
  row.classList.toggle('is-variety-previews',current!==0);
  gallery?.setAttribute('aria-label',items[current][1]+' sprouts gallery');
  if(current===0)return;
  const item=items[current];
  for(const [stage,description] of galleryStages){
   const src=galleryPath(item[0],stage);
   const button=document.createElement('button');
   button.type='button';
   button.className='gallery-thumb hero-variety-preview';
   button.setAttribute('aria-label','View '+item[1]+' sprouts: '+description.toLowerCase());
   button.setAttribute('aria-pressed',String(stage==='closeup'));
   const image=document.createElement('img');
   image.src=src;image.alt='';image.loading='eager';image.decoding='async';
   button.appendChild(image);
   button.addEventListener('click',()=>showVarietyDetail(src,description,button));
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
 /* Both showcase slides live in one fixed-size track. Moving one track
    avoids the old two-animation race that caused a visible snap/jitter.
    Live checkout remains in the DOM but is concealed during the motion. */
 function snapshot(){
  const copy=content.cloneNode(true);
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  copy.setAttribute('aria-hidden','true');
  copy.inert=true;
  copy.classList.add('hero-variety-ghost');
  return copy;
 }
 function moveShowcase(target,dir,preloaded){
  if(!content||!heroRoot||!content.animate){
   current=target;render(preloaded);transitioning=false;
   arrows.forEach(button=>button.disabled=false);
   return;
  }
  const previous=content.getBoundingClientRect();
  const container=heroRoot.getBoundingClientRect();
  const outgoing=snapshot();
  const oldVisibility=content.style.visibility;
  const oldMinHeight=content.style.minHeight;
  const oldInert=content.inert;
  current=target;
  render(preloaded);
  const incoming=snapshot();
  const requiredHeight=Math.max(previous.height,content.getBoundingClientRect().height);
  content.style.minHeight=requiredHeight+'px';
  content.style.visibility='hidden';
  content.inert=true;
  const viewport=document.createElement('div');
  viewport.className='hero-variety-carousel-viewport';
  viewport.setAttribute('aria-hidden','true');
  viewport.inert=true;
  viewport.style.left=(previous.left-container.left)+'px';
  viewport.style.top=(previous.top-container.top)+'px';
  viewport.style.width=previous.width+'px';
  viewport.style.height=requiredHeight+'px';
  const track=document.createElement('div');
  track.className='hero-variety-carousel-track';
  if(dir<0)track.append(incoming,outgoing);
  else track.append(outgoing,incoming);
  viewport.appendChild(track);
  heroRoot.classList.add('is-hero-moving');
  heroRoot.appendChild(viewport);

  const distance=previous.width;
  const start=dir<0?-distance:0;
  const end=dir<0?0:-distance;
  const options={duration:900,easing:'cubic-bezier(.38,0,.22,1)',fill:'both'};
  let done=false;
  const finish=()=>{
   if(done)return;done=true;
   viewport.remove();
   content.style.visibility=oldVisibility;
   content.style.minHeight=oldMinHeight;
   content.inert=oldInert;
   heroRoot.classList.remove('is-hero-moving');
   transitioning=false;
   arrows.forEach(button=>button.disabled=false);
  };
  try{
   const animation=track.animate([
    {transform:'translate3d('+start+'px,0,0)'},
    {transform:'translate3d('+end+'px,0,0)'}
   ],options);
   animation.finished.then(finish,finish);
  }catch{finish()}
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
  // The incoming hero photograph and its previews load before movement,
  // preventing image changes halfway through the visual transition.
  const urls=[imageSource(target)];
  if(target!==0){
   for(const [stage] of galleryStages){
    urls.push(galleryPath(items[target][0],stage));
   }
  }
  Promise.allSettled([...new Set(urls)].map(src=>new Promise(resolve=>{
   const image=new Image();
   image.onload=resolve;image.onerror=resolve;image.src=src;
  }))).then(()=>moveShowcase(target,dir,true));
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
   // A pack selection changes only basket details, never the selected image.
   // This also preserves the third-photo default for Broccoli.
   return true;
  }
 };
 // Fit the initial Broccoli heading too, including on the first mobile render.
 fitTitle();
 // Variety changes are click-only. Touch/swipe navigation will be designed separately.
})();
