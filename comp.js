/* MicroSprouts approved-comp presentation.
   Existing shop.js remains the source of truth for prices, dates and WhatsApp enquiries. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hero = $('hero-photo');
  const buttons = [...document.querySelectorAll('.package-option[data-pack]')];
  const thumbs = [...document.querySelectorAll('.gallery-thumb')];
  const stages = [...document.querySelectorAll('.growth-item[data-stage]')];
  let activePack = '200', requestId = 0, selectedGallery = 'pack';
  const approved = new Map();

  function setPhoto(src, alt) {
    if (!hero) return;
    const current = ++requestId;
    const image = new Image();
    image.onload = () => {
      if (current !== requestId) return;
      hero.classList.add('is-switching');
      hero.src = src;
      hero.alt = alt;
      requestAnimationFrame(() => hero.classList.remove('is-switching'));
    };
    image.onerror = () => {
      if (current !== requestId) return;
      const fallback = activePack === '500' ? 'assets/family-ornate-wide-v1.svg' : 'assets/single-ornate-wide-v1.svg';
      hero.src = fallback;
      hero.alt = 'Fresh broccoli sprouts arranged on a natural stone plate';
      hero.classList.remove('is-switching');
    };
    image.src = src;
  }

  const packLabels = {
    '200': { name: 'Single Pack', price: '£9.99', image: 'assets/single-ornate-wide-v1.svg' },
    '500': { name: 'Family Pack', price: '£16.99', image: 'assets/family-ornate-wide-v1.svg' }
  };
  function setPack(pack, updateForm = true) {
    if (!packLabels[pack]) return;
    activePack = pack;
    selectedGallery = 'pack';
    hero?.classList.add('is-pack-photo');
    buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.pack === pack)));
    const checkout = $('checkout-button');
    if (checkout) checkout.dataset.pack = pack;
    thumbs.forEach(btn => btn.setAttribute('aria-pressed','false'));
    const assetKey = pack === '500' ? 'family' : 'week';
    setPhoto(packLabels[pack].image, 'Fresh broccoli sprouts on an ornate cream-and-gold porcelain plate, ' + pack + ' gram ' + packLabels[pack].name + ' option');
    const select = $('pack');
    if (updateForm && select) {
      select.value = pack;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  buttons.forEach(btn => btn.addEventListener('click', () => setPack(btn.dataset.pack)));
  $('pack')?.addEventListener('change', () => {
    const pack = $('pack').value;
    if (pack !== activePack) setPack(pack, false);
  });
  $('checkout-button')?.addEventListener('click', () => {
    const select = $('pack');
    if (select) {
      select.value = activePack;
      select.dispatchEvent(new Event('change',{ bubbles: true }));
    }
  });

  const map = { seeds:'assets/day0.svg',germination:'assets/day1.svg',macro:'assets/macro.webp',tray:'assets/tray.webp' };
  thumbs.forEach(btn => btn.addEventListener('click', () => {
    const name = btn.dataset.gallery;
    const url = approved.get(name) || btn.dataset.url || map[name];
    selectedGallery = name;
    if (!url) return;
    hero?.classList.remove('is-pack-photo');
    thumbs.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    const img = btn.querySelector('img');
    setPhoto(url,img?.alt||'Broccoli sprouts photograph');
  }));

  stages.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      stages.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    });
    btn.addEventListener('keydown', e => {
      const move = {ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];
      if (!move) return;
      e.preventDefault();
      const next = (index + move + stages.length) % stages.length;
      stages[next].focus();
      stages[next].click();
    });
  });

  const menuButton = $('menu-toggle'), menuRoot = $('hero');
  menuButton?.addEventListener('click', () => {
    const open = menuRoot?.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(Boolean(open)));
  });
  document.querySelectorAll('.comp-nav-links a').forEach(link => link.addEventListener('click', () => {
    menuRoot?.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded','false');
  }));


  // Assets are opt-in: nothing on the public site breaks before the photo folder
  // is uploaded. A single manifest request gates every approved-image request.
  // Once files exist, they replace placeholder imagery without another code change.
  const allowedPhotos = new Set(['week','family','seeds','germination','macro','jar','woman','toast','harvest']);
  const imageAlt = {
    week:'Fresh broccoli sprouts in a clear glass container',
    family:'Family Pack of broccoli sprouts in a clear container',
    seeds:'Broccoli seeds falling onto fresh seeds',
    germination:'New sprouts emerging from broccoli seeds',
    macro:'Close-up of broccoli sprouts',
    jar:'Broccoli sprouts grown in a glass jar',
    woman:'Smiling woman receiving a container of broccoli sprouts',
    toast:'Broccoli sprouts served on avocado toast',
    harvest:'Fresh broccoli sprouts in a glass container'
  };
  if (typeof fetch === 'function') {
    fetch('assets/approved/manifest.json', { cache:'no-cache' })
      .then(response => response.ok ? response.json() : null)
      .then(manifest => {
        if (!Array.isArray(manifest?.assets)) return;
        const declared = new Set(manifest.assets.map(a => a.name));
        for (const key of allowedPhotos) {
          if (!declared.has(key+'.webp')) continue;
          const url = 'assets/approved/'+key+'.webp';
          const preload = new Image();
          preload.onload = () => {
            approved.set(key,url);
            document.querySelectorAll('img[data-asset="'+key+'"]').forEach(img => {
              if (img === hero) return;
              img.src = url;
              if (img.getAttribute("alt") && imageAlt[key]) img.alt = imageAlt[key];
            });
            document.querySelectorAll('.gallery-thumb[data-asset="'+key+'"] img').forEach(img => {
              img.src = url;
              if (img.getAttribute("alt") && imageAlt[key]) img.alt = imageAlt[key];
            });
            if (key === 'macro') {
              document.querySelector('.banner')?.style.setProperty('--approved-banner-photo','url("'+url+'")');
            }
            // Keep the new stone-plate photos as the permanent pack images.
            // Older approved Week/Family assets may still serve growth-stage media,
            // but they must never override a product photo.
            if (selectedGallery === key && key !== 'week' && key !== 'family') {
              setPhoto(url,imageAlt[key]);
            }
          };
          // A missing image leaves the established image alone.
          preload.onerror = () => {};
          preload.src = url;
        }
      })
      .catch(() => {});
  }

  // Keep externally hosted lifestyle photos from rendering as broken icons.
  document.querySelectorAll('img').forEach(img => {
    if (img.src.startsWith('https://images.pexels.com/')) {
      const fallback = () => {
        if (img.dataset.fallbackUsed) return;
        img.dataset.fallbackUsed='1';
        img.src='assets/harvest.webp';
      };
      img.addEventListener('error',fallback);
      if(img.complete && !img.naturalWidth) fallback();
    }
  });
})();
