/* MicroSprouts approved-comp presentation.
   Existing shop.js remains the source of truth for prices, dates and WhatsApp enquiries. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hero = $('hero-photo');
  const buttons = [...document.querySelectorAll('.package-option[data-pack]')];
  const thumbs = [...document.querySelectorAll('.gallery-thumb')];
  const stages = [...document.querySelectorAll('.growth-item[data-stage]')];
  let activePack = '200', requestId = 0;

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
    buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.pack === pack)));
    const checkout = $('checkout-button');
    if (checkout) checkout.dataset.pack = pack;
    thumbs.forEach(btn => btn.setAttribute('aria-pressed','false'));
    setPhoto(packLabels[pack].image, 'Fresh broccoli sprouts, ' + pack + ' gram ' + packLabels[pack].name + ' option');
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

  const map = { harvest:'assets/harvest.webp',macro:'assets/macro.webp',tray:'assets/tray.webp' };
  thumbs.forEach(btn => btn.addEventListener('click', () => {
    const name = btn.dataset.gallery;
    const url = btn.dataset.url || map[name];
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
