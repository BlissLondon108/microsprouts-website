/* MicroSprouts catalogue spotlight. Pointer tracking stays inside each card. */
(()=>{
 "use strict";
 const cards=document.querySelectorAll(".sprouts-page .sprout-card[data-spotlight]");
 cards.forEach(card=>{
  const move=event=>{
   const box=card.getBoundingClientRect();
   if(!box.width||!box.height)return;
   const x=Math.max(0,Math.min(100,100*(event.clientX-box.left)/box.width));
   const y=Math.max(0,Math.min(100,100*(event.clientY-box.top)/box.height));
   card.style.setProperty("--spot-x",x.toFixed(2)+"%");
   card.style.setProperty("--spot-y",y.toFixed(2)+"%");
  };
  const reset=()=>{
   card.style.setProperty("--spot-x","50%");
   card.style.setProperty("--spot-y","50%");
  };
  card.addEventListener("pointermove",move,{passive:true});
  card.addEventListener("pointerleave",reset);
  card.addEventListener("focusin",reset);
 });
})();
