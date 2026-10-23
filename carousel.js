/* MicroSprouts product selector: native swipe + accessible controls */
(() => {
  'use strict';
  const track = document.getElementById('product-track');
  const root = document.getElementById('product-carousel');
  if (!track || !root) return;

  const slides = Array.from(track.querySelectorAll('.product-slide'));
  const previous = root.querySelector('[data-slide-prev]');
  const next = root.querySelector('[data-slide-next]');
  const dots = Array.from(root.querySelectorAll('[data-slide-to]'));
  const counter = root.querySelector('[data-slide-count]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let pendingFrame = false;

  const updateState = (index) => {
    current = Math.min(slides.length - 1, Math.max(0, index));
    dots.forEach((dot, i) => {
      dot.setAttribute('aria-current', i === current ? 'true' : 'false');
      dot.setAttribute('aria-label', 'Show ' + slides[i].dataset.packSize + ' broccoli sprouts' + (i === current ? ' (current)' : ''));
    });
    if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
    slides.forEach((slide, i) => {
      // Offscreen order links remain reachable through the slide controls.
      slide.toggleAttribute('inert', i !== current);
      slide.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    });
  };

  const go = (index, focusDot = false) => {
    const clamped = (index + slides.length) % slides.length;
    updateState(clamped);
    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: reduceMotion.matches ? 'instant' : 'smooth'
    });
    if (focusDot) dots[clamped]?.focus();
  };

  previous?.addEventListener('click', () => go(current - 1));
  next?.addEventListener('click', () => go(current + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => go(index)));
  root.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target instanceof HTMLElement && event.target.closest('a,input,select,textarea')) return;
    event.preventDefault();
    go(current + (event.key === 'ArrowRight' ? 1 : -1));
  });

  track.addEventListener('scroll', () => {
    if (pendingFrame) return;
    pendingFrame = true;
    requestAnimationFrame(() => {
      pendingFrame = false;
      const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (index !== current) updateState(index);
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    track.scrollLeft = current * track.clientWidth;
  }, { passive: true });

  updateState(0);
})();