/* MicroSprouts — arched product carousel, no payment or order confirmation */
(() => {
  'use strict';
  const root = document.getElementById('product-carousel');
  const track = document.getElementById('product-track');
  if (!root || !track) return;

  const slides = [...track.querySelectorAll('.arch-slide')];
  const dots = [...root.querySelectorAll('[data-slide-to]')];
  const prev = root.querySelector('[data-slide-prev]');
  const next = root.querySelector('[data-slide-next]');
  const label = document.getElementById('selected-pack-name');
  const subtitle = document.getElementById('selected-pack-subtitle');
  const price = document.getElementById('selected-pack-price');
  const orderLink = document.getElementById('selected-pack-order');
  if (!slides.length || !label || !subtitle || !price || !orderLink) return;

  const products = [
    { grams: '200', name: 'Pack of Sprouts (200g)', subtitle: 'Week supply', price: '£9.99' },
    { grams: '500', name: 'Family Pack (500g)', subtitle: 'For the whole family', price: '£16.99' }
  ];
  let active = 0;
  let frame = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = root.closest('.arch-hero');
  const details = root.querySelector('.arch-details');
  let lastPainted = -1;

  function setActive(i) {
    active = Math.min(products.length - 1, Math.max(0, i));
    const product = products[active];
    const changed = lastPainted !== active;
    hero?.setAttribute('data-active', product.grams);
    if (changed && lastPainted !== -1 && details && !reducedMotion.matches) {
      details.classList.remove('is-switching');
      // Restart the short transition for deliberate pack changes.
      void details.offsetWidth;
      details.classList.add('is-switching');
    }
    lastPainted = active;
    label.textContent = product.name;
    subtitle.textContent = product.subtitle;
    price.textContent = product.price;
    orderLink.dataset.pack = product.grams;
    orderLink.setAttribute('aria-label', 'Enquire about ' + product.name + ' for ' + product.price);
    dots.forEach((dot, index) => {
      dot.setAttribute('aria-current', String(index === active));
      dot.setAttribute('aria-label', products[index].name + (index === active ? ' — selected' : ''));
    });
    slides.forEach((slide, index) => {
      slide.toggleAttribute('inert', index !== active);
      slide.setAttribute('aria-hidden', String(index !== active));
    });
  }

  function goTo(index) {
    const target = (index + slides.length) % slides.length;
    setActive(target);
    track.scrollTo({
      left: target * track.clientWidth,
      behavior: reducedMotion.matches ? 'auto' : 'smooth'
    });
  }

  prev?.addEventListener('click', () => goTo(active - 1));
  next?.addEventListener('click', () => goTo(active + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));

  root.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    if (event.target instanceof HTMLElement && event.target.closest('a, input, select, textarea')) return;
    event.preventDefault();
    goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
  });

  // Track native touch swipes and update all visible pack information together.
  track.addEventListener('scroll', () => {
    if (frame) return;
    frame = true;
    requestAnimationFrame(() => {
      frame = false;
      const selected = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (selected !== active) setActive(selected);
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    track.scrollLeft = active * track.clientWidth;
  }, { passive: true });

  setActive(0);
})();