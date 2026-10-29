/* Sprout varieties: stationary until a visitor scrolls them.
 * Native touch swipe and trackpad scrolling, plus mouse drag and arrow buttons.
 * A dragged circle must not accidentally navigate to its details page.
 */
(() => {
  "use strict";
  const viewport = document.querySelector(".sprout-marquee");
  if (!viewport) return;
  const arrows = [...document.querySelectorAll("[data-sprout-scroll]")];
  const move = delta => {
    viewport.scrollBy({left: delta, behavior:"smooth"});
  };
  arrows.forEach(button => {
    button.addEventListener("click", () => {
      move(Number(button.dataset.sproutScroll) * 235);
    });
  });
  let drag = null;
  let suppressClick = false;
  viewport.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag = {id:event.pointerId,x:event.clientX,start:viewport.scrollLeft,moved:false};
    suppressClick = false;
  });
  viewport.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved && Math.abs(distance) <= 7) return;
    if (!drag.moved) {
      drag.moved = true;
      viewport.classList.add("is-dragging");
      try { viewport.setPointerCapture?.(drag.id); } catch {}
    }
    viewport.scrollLeft = drag.start - distance;
    if (event.cancelable) event.preventDefault();
  });
  function finish(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) suppressClick = true;
    viewport.classList.remove("is-dragging");
    try {
      if (viewport.hasPointerCapture?.(drag.id)) viewport.releasePointerCapture(drag.id);
    } catch {}
    drag = null;
  }
  viewport.addEventListener("pointerup", finish);
  viewport.addEventListener("pointercancel", finish);
  viewport.addEventListener("click", event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  viewport.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    move(event.key === "ArrowRight" ? 235 : -235);
  });
})();
