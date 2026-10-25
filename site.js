/* MicroSprouts: visual gallery, product selection, and growing journey.
 * Checkout currently leads to a WhatsApp enquiry, not payment. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hero = $('hero-photo');
  const thumbs = [...document.querySelectorAll('[data-gallery]')];
  const url = name => 'assets/' + name + '.webp';
  const womanUrl = 'https://images.pexels.com/photos/5622196/pexels-photo-5622196.jpeg?auto=compress&cs=tinysrgb&w=900';
  let currentPack = '200', photoSerial = 0;

  const choiceImage = pack => url(pack === '500' ? 'family' : 'week');
  const loadPhoto = (image, alt) => {
    if (!hero) return;
    const token = ++photoSerial;
    const next = new Image();
    next.onload = () => {
      if (token !== photoSerial) return;
      hero.classList.add('fading');
      const swap = () => {
        if (token !== photoSerial) return;
        hero.src = image;
        hero.alt = alt;
        hero.classList.remove('fading');
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) swap();
      else setTimeout(swap, 120);
    };
    next.onerror = () => {
      if (token !== photoSerial) return;
      hero.src = choiceImage(currentPack);
      hero.alt = 'Fresh broccoli sprouts in a clear container';
      hero.classList.remove('fading');
    };
    next.src = image;
  };

  thumbs.forEach(button => button.addEventListener('click', () => {
    thumbs.forEach(item => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    const photoUrl = button.dataset.galleryUrl || (button.dataset.gallery === 'woman' ? womanUrl : url(button.dataset.gallery));
    loadPhoto(photoUrl, button.querySelector('img')?.alt || 'Fresh broccoli sprouts');
  }));

  function selectPack(pack, fromForm = false) {
    if (!['200', '500'].includes(pack)) return;
    currentPack = pack;
    const money = pack === '200' ? '£9.99' : '£16.99';
    const desc = (pack === '200' ? 'Week Supply' : 'Family Pack') + ' · ' + pack + 'g';

    if ($('display-price')) $('display-price').textContent = money;
    if ($('display-subtitle')) $('display-subtitle').textContent = desc;
    if ($('mobile-product')) $('mobile-product').textContent = (pack === '200' ? 'Week Supply' : 'Family Pack') + ' · ' + money;
    for (const button of document.querySelectorAll('button.choice')) {
      const active = button.dataset.pack === pack;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    }
    if ($('panel-order')) $('panel-order').dataset.pack = pack;
    if ($('mobile-cta-link')) $('mobile-cta-link').dataset.pack = pack;
    thumbs.forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-pressed', 'false');
    });
    loadPhoto(choiceImage(pack), 'Fresh broccoli sprouts pack (' + pack + 'g option)');
    if (!fromForm && $('pack')) {
      $('pack').value = pack;
      $('pack').dispatchEvent(new Event('input', { bubbles:true }));
    }
  }

  document.querySelectorAll('button.choice').forEach(button => button.addEventListener('click', () => selectPack(button.dataset.pack)));
  $('pack')?.addEventListener('change', () => selectPack($('pack').value, true));
  document.querySelectorAll('a[data-pack]').forEach(link => link.addEventListener('click', () => selectPack(link.dataset.pack)));

  const menu = $('menu-toggle'), header = $('header');
  menu?.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => {
    header?.classList.remove('menu-open');
    menu?.setAttribute('aria-expanded', 'false');
  }));

  const growthCards = [...document.querySelectorAll('.grow-card')];
  const growthDescriptions = [
    'Day 0 — Broccoli seeds are prepared and sown for a fresh batch.',
    'Days 1–2 — The seeds absorb water and the earliest tiny sprouts emerge.',
    'Days 3–5 — Pale stems lengthen and green leaves form as the sprouts develop.',
    'Day 6+ — Each batch is checked and harvested when ready.'
  ];
  growthCards.forEach((card, index) => {
    card.addEventListener('click', () => {
      growthCards.forEach((item,i) => {
        item.classList.toggle('active',i === index);
        item.setAttribute('aria-pressed',String(i === index));
      });
      if ($('growth-detail')) $('growth-detail').textContent = growthDescriptions[index];
    });
    card.addEventListener('keydown', event => {
      const dir = {ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
      if (!dir) return;
      event.preventDefault();
      const target = (index + dir + growthCards.length) % growthCards.length;
      growthCards[target].focus();
      growthCards[target].click();
    });
  });
})();
