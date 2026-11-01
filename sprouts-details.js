/* MicroSprouts sprout cards: slide supplementary information into the same
   fixed-size content area. The purchase button and discreet footer toggle stay
   in place; keyboard and assistive-technology state follow the visible view. */
(() => {
  "use strict";
  document.querySelectorAll(".sprouts-page .sprouts-grid .sprout-card").forEach(card => {
    const toggle=card.querySelector("[data-sprout-learn]");
    const intro=card.querySelector('[data-sprout-panel="intro"]');
    const detail=card.querySelector('[data-sprout-panel="details"]');
    if(!toggle||!intro||!detail)return;

    const setOpen=open => {
      card.dataset.detailOpen=String(open);
      toggle.setAttribute("aria-expanded",String(open));
      toggle.textContent=open?"Show less":"Learn more";
      intro.inert=open;
      detail.inert=!open;
      intro.setAttribute("aria-hidden",String(open));
      detail.setAttribute("aria-hidden",String(!open));
      if(!open)detail.scrollTop=0;
    };

    toggle.addEventListener("click",()=>{
      setOpen(card.dataset.detailOpen!=="true");
    });
  });
})();
