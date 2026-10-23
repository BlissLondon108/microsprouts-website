/* MicroSprouts Atelier: visual polish only; ordering remains the existing WhatsApp flow. */
(() => {
  'use strict';

  const header = document.querySelector('.page-header');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Third-party stock photography should never leave the product carousel blank.
  for (const image of document.querySelectorAll('img[data-fallback]')) {
    const showFallback = () => {
      if (image.dataset.fallbackUsed === 'true') return;
      image.dataset.fallbackUsed = 'true';
      image.src = image.dataset.fallback;
    };
    image.addEventListener('error', showFallback);
    // Also catch images that fail before deferred scripts finish parsing.
    if (image.complete && image.naturalWidth === 0) showFallback();
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [...document.querySelectorAll('[data-reveal]')];
  if (targets.length && !reduceMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, observerInstance) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('editorial-copy')) {
          entry.target.closest('.editorial-section')?.classList.add('is-visible');
        }
        observerInstance.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -18px 0px' });

    // Do not fade anything that's already on screen when script becomes ready.
    for (const target of targets) {
      const box = target.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) {
        target.classList.add('is-visible');
        target.closest('.editorial-section')?.classList.add('is-visible');
      } else {
        observer.observe(target);
      }
    }
    document.documentElement.classList.add('js-motion');
  } else {
    targets.forEach(target => {
      target.classList.add('is-visible');
      target.closest('.editorial-section')?.classList.add('is-visible');
    });
  }

  // Native scroll-snap handles swiping; allow mouse dragging on the arched photo
  // without interfering with keyboard focus or buttons.
  const track = document.getElementById('product-track');
  if (!track) return;

  let originX = 0;
  let originScroll = 0;
  let activeDrag = false;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    originX = event.clientX;
    originScroll = track.scrollLeft;
    activeDrag = true;
  });
  track.addEventListener('pointermove', event => {
    if (!activeDrag) return;
    const delta = event.clientX - originX;
    if (Math.abs(delta) > 6) {
      track.classList.add('is-dragging');
      track.scrollLeft = originScroll - delta;
    }
  });
  const stopDrag = () => {
    if (!activeDrag) return;
    activeDrag = false;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    // Let the carousel's own scroll listener update selection and labels.
    track.scrollTo({ left: index * track.clientWidth, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    track.classList.remove('is-dragging');
  };
  track.addEventListener('pointerup', stopDrag);
  track.addEventListener('pointercancel', stopDrag);
  track.addEventListener('pointerleave', stopDrag);
})();