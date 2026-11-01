/* MicroSprouts sprout cards: replace, do not append, information in a
   fixed-size panel. Keyboard and screen-reader focus follow the active view. */
(() => {
  "use strict";
  document.querySelectorAll(".sprouts-page .sprouts-grid .sprout-card").forEach(card => {
    const learn=card.querySelector("[data-sprout-learn]");
    const back=card.querySelector("[data-sprout-back]");
    const intro=card.querySelector('[data-sprout-panel="intro"]');
    const detail=card.querySelector('[data-sprout-panel="details"]');
    if(!learn||!back||!intro||!detail)return;
    const setOpen=(open) => {
      card.dataset.detailOpen=String(open);
      learn.setAttribute("aria-expanded",String(open));
      intro.inert=open;
      detail.inert=!open;
      intro.setAttribute("aria-hidden",String(open));
      detail.setAttribute("aria-hidden",String(!open));
      (open?back:learn).focus({preventScroll:true});
    };
    learn.addEventListener("click",()=>setOpen(true));
    back.addEventListener("click",()=>setOpen(false));
  });
})();
