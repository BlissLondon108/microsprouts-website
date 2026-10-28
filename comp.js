/* MicroSprouts product gallery and homepage checkout CTAs.
   Both CTAs use the same verified live Stripe checkout page. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hero = $('hero-photo');
  const buttons = [...document.querySelectorAll('.package-option[data-pack]')];
  const thumbs = [...document.querySelectorAll('.gallery-thumb')];
  const stages = [...document.querySelectorAll('.growth-item[data-stage]')];
  let activePack = '200', requestId = 0;

  // Change photographs only on a deliberate visitor selection. Keep the
  // current photograph visible while the next one loads; never fade to a
  // background colour or swap in an interim placeholder during page load.
  function setPhoto(src, alt, isPackPhoto = false) {
    if (!hero) return;
    const current = ++requestId;
    const image = new Image();
    image.onload = () => {
      if (current !== requestId) return;
      hero.src = src;
      hero.alt = alt;
      hero.classList.toggle('is-pack-photo', isPackPhoto);
    };
    image.onerror = () => {
      // Keep the existing photograph visible if the requested asset fails.
    };
    image.src = src;
  }

  const packLabels = {
    '200': { name: 'Single Pack', price: '£9.99', image: 'assets/single-ornate-wide-v1.svg' },
    '500': { name: 'Family Pack', price: '£16.99', image: 'assets/family-ornate-wide-v1.svg' }
  };
  function setPack(pack) {
    if (!packLabels[pack]) return;
    activePack = pack;
    // Keep gallery selection synced with the chosen pack.
    buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.pack === pack)));
    const checkout = $('checkout-button');
    const lowerCheckout = $('bottom-checkout-button');
    const url = 'checkout.html?pack=' + encodeURIComponent(pack);
    if (checkout) {
      checkout.dataset.pack = pack;
      checkout.href = url;
    }
    if (lowerCheckout) lowerCheckout.href = url;
    thumbs.forEach(btn => btn.setAttribute('aria-pressed','false'));
    setPhoto(packLabels[pack].image, 'Fresh broccoli sprouts on an ornate cream-and-gold porcelain plate, ' + pack + ' gram ' + packLabels[pack].name + ' option', true);
    const lowerPack = $('bottom-pack');
    if (lowerPack) lowerPack.value = pack;
  }

  buttons.forEach(btn => btn.addEventListener('click', () => setPack(btn.dataset.pack)));
  $('bottom-pack')?.addEventListener('change', () => setPack($('bottom-pack').value));
  // Checkout labels and real links are already present in HTML on first
  // paint. The secure checkout page and Worker enforce payment availability;
  // no extra status fetch or text rewrite is needed here.
  thumbs.forEach(btn => btn.addEventListener('click', () => {
    const img = btn.querySelector('img');
    const src = img?.getAttribute('src');
    if (!src) return;
    thumbs.forEach(other => other.setAttribute('aria-pressed', String(other === btn)));
    setPhoto(src, img.alt || 'Broccoli sprouts photograph');
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


})();
