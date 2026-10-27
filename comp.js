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
      const fallback = activePack === '500' ? 'assets/family.webp' : 'assets/week.webp';
      hero.src = fallback;
      hero.alt = 'Fresh broccoli sprouts in a clear container';
      hero.classList.remove('is-switching');
    };
    image.src = src;
  }

  const packLabels = {
    '200': { name: 'Week Supply', price: '£9.99', image: 'assets/week.webp' },
    '500': { name: 'Family Pack', price: '£16.99', image: 'assets/family.webp' }
  };
  function setPack(pack, updateForm = true) {
    if (!packLabels[pack]) return;
    activePack = pack;
    selectedGallery = 'pack';
    buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.pack === pack)));
    const checkout = $('checkout-button');
    if (checkout) checkout.dataset.pack = pack;
    thumbs.forEach(btn => btn.setAttribute('aria-pressed','false'));
    const assetKey = pack === '500' ? 'family' : 'week';
    setPhoto(approved.get(assetKey) || packLabels[pack].image, 'Fresh broccoli sprouts, ' + pack + ' gram ' + packLabels[pack].name + ' option');
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
    thumbs.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    const img = btn.querySelector('img');
    setPhoto(url,img?.alt||'Broccoli sprouts photograph');
  }));

  const details = [
    'Day 0 — Fresh broccoli seeds are prepared for a new growing batch.',
    'Day 1–2 — Germination begins and the earliest pale shoots emerge.',
    'Day 3–5 — The young sprouts develop stems and their first small leaves.',
    'Day 6+ — Sprouts can be assessed for harvest when ready.'
  ];
  stages.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      stages.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      const message = $('growth-detail');
      if(message) message.textContent = details[index];
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
            const packKey = activePack === '500' ? 'family' : 'week';
            if (selectedGallery === 'pack' && key === packKey) {
              setPhoto(url,imageAlt[key]);
            } else if (selectedGallery === key) {
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
