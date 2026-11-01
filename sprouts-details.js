/* MicroSprouts sprout cards: keep the original in-card slide transition.
   Details gain space when Learn more folds away; a tiny title-area back arrow
   restores the summary. Keyboard focus follows the visible control. */
(() => {
  "use strict";
  document.querySelectorAll(".sprouts-page .sprouts-grid .sprout-card").forEach(card => {
    const toggle=card.querySelector("[data-sprout-learn]");
    const back=card.querySelector("[data-sprout-back]");
    const intro=card.querySelector('[data-sprout-panel="intro"]');
    const detail=card.querySelector('[data-sprout-panel="details"]');
    if(!toggle||!back||!intro||!detail)return;

    const setOpen=(open,moveFocus)=>{
      card.dataset.detailOpen=String(open);
      toggle.setAttribute("aria-expanded",String(open));
      toggle.inert=open;
      toggle.setAttribute("aria-hidden",String(open));
      back.inert=!open;
      back.setAttribute("aria-hidden",String(!open));
      intro.inert=open;
      detail.inert=!open;
      intro.setAttribute("aria-hidden",String(open));
      detail.setAttribute("aria-hidden",String(!open));
      if(!open)detail.scrollTop=0;
      if(moveFocus)(open?back:toggle).focus();
    };

    toggle.addEventListener("click",()=>setOpen(true,true));
    back.addEventListener("click",()=>setOpen(false,true));
  });
})();
