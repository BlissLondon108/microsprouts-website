/* MicroSprouts sprout carousel: automatic movement + direct gestures.
 * Uses the existing CSS marquee animation as the single source of position,
 * so touch, mouse and trackpad interaction does not restart the animation.
 * This module never creates payments or modifies the shopping basket.
 */
(() => {
  "use strict";
  const marquee = document.querySelector(".sprout-marquee");
  const track = marquee?.querySelector(".sprout-marquee__track");
  const firstGroup = track?.querySelector(".sprout-marquee__group");
  if (!marquee || !track || !firstGroup) return;

  const motion = () => track.getAnimations?.().find(animation => {
    const duration = animation.effect?.getTiming?.().duration;
    return typeof duration === "number" && duration > 0;
  }) || null;
  const cycleWidth = () => Math.max(1, firstGroup.getBoundingClientRect().width);
  const duration = animation => animation.effect.getTiming().duration;
  const wrap = (value, length) => ((value % length) + length) % length;
  let drag = null;
  let suppressClickUntil = 0;

  function moveBy(pixels, animation = motion()) {
    if (animation) {
      const ms = duration(animation);
      animation.currentTime = wrap((Number(animation.currentTime) || 0) +
        pixels * ms / cycleWidth(), ms);
    } else {
      // Simple progressive enhancement for older browsers.
      marquee.scrollLeft -= pixels;
    }
  }

  marquee.addEventListener("pointerdown", event => {
    if (drag || (event.pointerType === "mouse" && event.button !== 0)) return;
    const animation = motion();
    animation?.pause();
    drag = {
      id: event.pointerId,
      x: event.clientX,
      lastX: event.clientX,
      moved: false,
      animation
    };
  });
  marquee.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(event.clientX - drag.x) < 9) return;
    if (!drag.moved) {
      drag.moved = true;
      marquee.classList.add("is-dragging");
      try { marquee.setPointerCapture?.(event.pointerId); } catch {}
    }
    if (event.cancelable) event.preventDefault();
    const delta = event.clientX - drag.lastX;
    moveBy(delta, drag.animation);
    drag.lastX = event.clientX;
  });
  const finish = event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) suppressClickUntil = performance.now() + 450;
    marquee.classList.remove("is-dragging");
    try {
      if (marquee.hasPointerCapture?.(drag.id)) marquee.releasePointerCapture(drag.id);
    } catch {}
    drag.animation?.play();
    drag = null;
  };
  marquee.addEventListener("pointerup", finish);
  marquee.addEventListener("pointercancel", finish);

  // A drag starting on a circular product button must not also open the
  // variety picker on pointer release; genuine taps remain normal clicks.
  marquee.addEventListener("click", event => {
    if (performance.now() <= suppressClickUntil) {
      suppressClickUntil = 0;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Two-finger horizontal swipes on trackpads move the same timeline.
  marquee.addEventListener("wheel", event => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    if (event.cancelable) event.preventDefault();
    const animation = motion();
    animation?.pause();
    moveBy(-event.deltaX, animation);
    animation?.play();
  }, {passive:false});

  // Keyboard support is available when a sprout tile is focused.
  marquee.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (!event.target.closest?.(".sprout-tile")) return;
    event.preventDefault();
    const animation = motion();
    animation?.pause();
    moveBy(event.key === "ArrowLeft" ? -175 : 175, animation);
    animation?.play();
  });
})();
