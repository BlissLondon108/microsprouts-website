/* MicroSprouts Edition 02 - gallery, product panel, timeline, accessible motion.
   Payments remain handled personally via the existing shop.js WhatsApp enquiry flow. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hero = $('gallery-main-image');
  const thumbs = [...document.querySelectorAll('.thumb[data-full]')];
  const variantButtons = [...document.querySelectorAll('.variant[data-pack]')];
  const fulfilmentButtons = [...document.querySelectorAll('.fulfilment[data-method]')];
  const packSelect = $('pack');
  const mainPrice = $('main-price');
  const mainPriceLabel = $('main-price-label');
  const cta = $('buy-cta');
  const mobileCTA = $('mobile-cta');
  const dialog = $('gallery-dialog');
  const dialogPhoto = $('dialog-photo');
  const dialogLabel = $('dialog-caption');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let imageRequest = 0;
  let currentPhotoIndex = 0;

  // Gallery images are illustrative until actual MicroSprouts harvest photos replace them.
  function selectPhoto(index) {
    if (!thumbs.length || !hero) return;
    const nextIndex = (index + thumbs.length) % thumbs.length;
    const thumb = thumbs[nextIndex];
    const url = thumb.dataset.full;
    const alt = thumb.dataset.alt || thumb.querySelector('img')?.alt || 'Broccoli sprouts';
    const serial = ++imageRequest;
    thumbs.forEach((item, i) => {
      item.classList.toggle('is-active', i === nextIndex);
      item.setAttribute('aria-pressed', String(i === nextIndex));
    });
    currentPhotoIndex = nextIndex;
    if (!url || hero.src === url) {
      hero.alt = alt;
      return;
    }
    hero.classList.add('fade');
    const preload = new Image();
    preload.onload = () => {
      if (serial !== imageRequest) return;
      hero.src = url;
      hero.alt = alt;
      requestAnimationFrame(() => hero.classList.remove('fade'));
    };
    preload.onerror = () => {
      if (serial !== imageRequest) return;
      hero.src = 'hero.webp';
      hero.alt = 'Broccoli sprouts served on toast';
      hero.classList.remove('fade');
    };
    preload.src = url;
  }

  thumbs.forEach((btn, i) => btn.addEventListener('click', () => selectPhoto(i)));
  const gallery = $('product-gallery');
  gallery?.addEventListener('keydown', e => {
    if (!['ArrowRight','ArrowLeft'].includes(e.key) || !e.target.closest('.thumb-grid')) return;
    e.preventDefault();
    const i = (currentPhotoIndex + (e.key === 'ArrowRight' ? 1 : -1) + thumbs.length) % thumbs.length;
    selectPhoto(i);
    thumbs[i]?.focus();
  });

  let startX = 0;
  const mainArea = $('gallery-main');
  mainArea?.addEventListener('touchstart', e => {startX=e.touches[0].clientX}, {passive:true});
  mainArea?.addEventListener('touchend', e => {
    if (!e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX-startX;
    if (Math.abs(dx)>60) selectPhoto(currentPhotoIndex + (dx<0?1:-1));
  }, {passive:true});

  $('gallery-open')?.addEventListener('click', () => {
    if (!dialog || !dialogPhoto || !dialogLabel || typeof dialog.showModal !== 'function') return;
    dialogPhoto.src = hero.currentSrc || hero.src;
    dialogPhoto.alt = hero.alt;
    dialogLabel.textContent = hero.alt;
    dialog.showModal();
  });
  $('gallery-close')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', event => {if(event.target === dialog) dialog.close()});

  const unitPrices = {'200':999,'500':1699};
  let selectedPack='200';
  function syncProduct(v, syncForm) {
    if(!unitPrices[v]) return;
    selectedPack=v;
    variantButtons.forEach(btn=>{
      btn.classList.toggle('is-selected',btn.dataset.pack===v);
      btn.setAttribute('aria-pressed', String(btn.dataset.pack===v));
    });
    if(mainPrice) mainPrice.textContent='£'+(unitPrices[v]/100).toFixed(2);
    if(mainPriceLabel) mainPriceLabel.textContent=v==='200'?'Week Supply · 200g':'Family Pack · 500g';
    if(cta) {
      cta.dataset.pack=v;
      cta.setAttribute('aria-label','Continue to WhatsApp enquiry for '+v+' grams');
    }
    if(mobileCTA) mobileCTA.dataset.pack=v;
    if(syncForm && packSelect) {
      packSelect.value=v;
      packSelect.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
  variantButtons.forEach(button=>button.addEventListener('click',()=>{
    syncProduct(button.dataset.pack,true);
    // Use a different genuine sprout photograph for each pack selection.
    selectPhoto(button.dataset.pack==='500'?1:0);
  }));
  packSelect?.addEventListener('change',()=>syncProduct(packSelect.value,false));
  document.querySelectorAll('[data-pack]:not(.variant)').forEach(button=>{
    button.addEventListener('click',()=>syncProduct(button.dataset.pack,false));
  });

  function selectMethod(value){
    fulfilmentButtons.forEach(btn=>{
      const isSelected=btn.dataset.method===value;
      btn.classList.toggle('is-selected',isSelected);
      btn.setAttribute('aria-pressed',String(isSelected));
    });
    const formRadio = document.querySelector('input[name="method"][value="'+value+'"]');
    if(formRadio && !formRadio.checked) {
      formRadio.checked=true;
      formRadio.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const panelFulfilment=$('panel-fulfilment');
    if(panelFulfilment) panelFulfilment.textContent=value==='delivery'?'+£2.30 London delivery':'Free collection';
  }
  fulfilmentButtons.forEach(btn=>btn.addEventListener('click',()=>selectMethod(btn.dataset.method)));
  document.querySelectorAll('input[name="method"]').forEach(radio=>radio.addEventListener('change',()=>selectMethod(radio.value)));

  const menu=$('menu-toggle'), header=$('site-header');
  menu?.addEventListener('click',()=>{
    const open=header.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded',String(open));
  });
  document.querySelectorAll('.nav-list a').forEach(link=>link.addEventListener('click',()=>{
    header?.classList.remove('menu-open');
    menu?.setAttribute('aria-expanded','false');
  }));

  // A small interactive growing story: dates vary between actual growing batches.
  const timeline=[
    {title:'Seeds prepared',note:'A fresh batch begins with carefully prepared broccoli seeds.',src:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Broccoli_sprouts.jpg/960px-Broccoli_sprouts.jpg'},
    {title:'Germination',note:'The seeds begin to sprout, forming fine pale stems.',src:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Brokkolisprossen-schale-knolle.jpg/960px-Brokkolisprossen-schale-knolle.jpg'},
    {title:'Sprouts develop',note:'Tiny green cotyledon leaves appear as the sprouts continue growing.',src:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Broccoli_sprouts.jpg/960px-Broccoli_sprouts.jpg'},
    {title:'Harvest when ready',note:'After at least six days, each batch is assessed for harvest and your requested date.',src:'hero.webp'}
  ];
  const stageImage=$('stage-image'),stageTitle=$('stage-title'),stageNote=$('stage-note');
  const steps=[...document.querySelectorAll('[data-stage]')],bars=[...document.querySelectorAll('.timeline-dots>div')];
  steps.forEach((step,index)=>step.addEventListener('click',()=>{
    steps.forEach((s,i)=>s.setAttribute('aria-selected',String(i===index)));
    bars.forEach((b,i)=>b.classList.toggle('active',i===index));
    if(stageTitle)stageTitle.textContent=timeline[index].title;
    if(stageNote)stageNote.textContent=timeline[index].note;
    if(stageImage){
      stageImage.style.opacity='.25';
      const wanted=timeline[index].src;
      const photo=new Image();
      photo.onload=()=>{stageImage.src=wanted;stageImage.alt=timeline[index].title+' — illustrative broccoli sprout photograph';stageImage.style.opacity='1'};
      photo.onerror=()=>{stageImage.src='hero.webp';stageImage.style.opacity='1'};
      photo.src=wanted;
    }
  }));

  const revealTargets=[...document.querySelectorAll('.reveal')];
  if(revealTargets.length && !reduceMotion.matches && 'IntersectionObserver' in window){
    for(const item of revealTargets){
      if(item.getBoundingClientRect().top<innerHeight) item.classList.add('shown');
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('shown');observer.unobserve(entry.target)}});
    },{threshold:.075});
    for(const item of revealTargets)observer.observe(item);
    document.documentElement.classList.add('js-ready');
  } else revealTargets.forEach(item=>item.classList.add('shown'));

  // Fail closed to a first-party image if externally hosted photos are unavailable.
  document.querySelectorAll('img[data-fallback]').forEach(img=>{
    function fallback(){if(img.dataset.failed==='1')return;img.dataset.failed='1';img.src=img.dataset.fallback}
    img.addEventListener('error',fallback);
    if(img.complete && !img.naturalWidth)fallback();
  });

  syncProduct(selectedPack,false);
  selectMethod('pickup');
})();