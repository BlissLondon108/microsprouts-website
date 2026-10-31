/* MicroSprouts hover-glow spheres. Vanilla JS; no React/Tailwind dependency. */
(()=>{
 "use strict";
 const field=document.querySelector('[data-ms-orb-scene]');
 if(!field||field.dataset.orbReady)return;
 field.dataset.orbReady='true';
 const display=field.querySelector('[data-ms-orb-current]');
 const links=[...field.querySelectorAll('.ms-orb-link')];
 links.forEach(link=>{
  const defaultName=link.dataset.sproutName||'';
  link.addEventListener('pointermove',event=>{
   const r=link.getBoundingClientRect();
   link.style.setProperty('--orb-pointer-x',((event.clientX-r.left)/r.width*100).toFixed(1)+'%');
   link.style.setProperty('--orb-pointer-y',((event.clientY-r.top)/r.height*100).toFixed(1)+'%');
  },{passive:true});
  link.addEventListener('pointerenter',()=>{if(display)display.textContent=defaultName;});
  link.addEventListener('pointerleave',()=>{if(display)display.textContent='Explore the collection';});
  link.addEventListener('focus',()=>{if(display)display.textContent=defaultName;});
  link.addEventListener('blur',()=>{if(display)display.textContent='Explore the collection';});
 });
})();
