/* MicroSprouts: bounded, low-jitter sprout sphere collisions. No dependency. */
(()=>{
 "use strict";
 const field=document.querySelector("[data-ms-orb-scene]");
 if(!field||field.dataset.orbReady)return;
 const links=[...field.querySelectorAll(".ms-orb-link")];
 if(!links.length)return;
 const directions=[-.52,.86,-2.45,1.30,2.77,-1.64,.35,-2.91];
 const speeds=[28,25,30,26,27,23,25,29];
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)");
 const spheres=links.map((link,i)=>{
   const holder=link.closest(".ms-orb-floating");
   const style=holder.style;
   const direction=directions[i%directions.length];
   const speed=speeds[i%speeds.length];
   const state={
     holder,link,x:0,y:0,r:0,
     startX:parseFloat(style.getPropertyValue("--orb-x"))/100||.5,
     startY:parseFloat(style.getPropertyValue("--orb-y"))/100||.5,
     vx:Math.cos(direction)*speed,vy:Math.sin(direction)*speed,
     hovered:false,focused:false
   };
   link.addEventListener("pointermove",event=>{
     const rect=link.getBoundingClientRect();
     if(!rect.width||!rect.height)return;
     link.style.setProperty("--orb-pointer-x",((event.clientX-rect.left)/rect.width*100).toFixed(1)+"%");
     link.style.setProperty("--orb-pointer-y",((event.clientY-rect.top)/rect.height*100).toFixed(1)+"%");
   },{passive:true});
   link.addEventListener("pointerenter",event=>{
     if(event.pointerType!=="touch")state.hovered=true;
   });
   link.addEventListener("pointerleave",()=>{state.hovered=false});
   link.addEventListener("focus",()=>{state.focused=true});
   link.addEventListener("blur",()=>{state.focused=false});
   return state;
 });
 let width=0,height=0,last=0,frameId=0,visible=true,laidOut=false;
 const pinned=s=>s.hovered||s.focused;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const limits=s=>({
   minX:s.r+9,maxX:Math.max(s.r+9,width-s.r-9),
   minY:s.r+9,maxY:Math.max(s.r+9,height-s.r-28)
 });
 const within=s=>{
   const b=limits(s);
   if(s.x<b.minX){s.x=b.minX;s.vx=Math.abs(s.vx)}
   else if(s.x>b.maxX){s.x=b.maxX;s.vx=-Math.abs(s.vx)}
   if(s.y<b.minY){s.y=b.minY;s.vy=Math.abs(s.vy)}
   else if(s.y>b.maxY){s.y=b.maxY;s.vy=-Math.abs(s.vy)}
 };
 const separate=elastic=>{
   for(let i=0;i<spheres.length;i++){
     const a=spheres[i];
     for(let j=i+1;j<spheres.length;j++){
       const b=spheres[j];
       const dx=b.x-a.x,dy=b.y-a.y;
       const separation=a.r+b.r+5;
       const d2=dx*dx+dy*dy;
       if(d2>=separation*separation)continue;
       const dist=Math.sqrt(d2);
       const nx=dist>.0001?dx/dist:Math.cos((i+1)*(j+1));
       const ny=dist>.0001?dy/dist:Math.sin((i+1)*(j+1));
       const invA=pinned(a)?0:1/(a.r*a.r);
       const invB=pinned(b)?0:1/(b.r*b.r);
       const sum=invA+invB;
       if(!sum)continue;
       // Correct penetration first; do not let spheres stick together.
       const overlap=separation-dist+.05;
       a.x-=nx*overlap*invA/sum;
       a.y-=ny*overlap*invA/sum;
       b.x+=nx*overlap*invB/sum;
       b.y+=ny*overlap*invB/sum;
       if(!elastic)continue;
       const approach=((pinned(b)?0:b.vx)-(pinned(a)?0:a.vx))*nx+((pinned(b)?0:b.vy)-(pinned(a)?0:a.vy))*ny;
       if(approach>=0)continue;
       const impulse=-(1+.94)*approach/sum;
       a.vx-=impulse*nx*invA;
       a.vy-=impulse*ny*invA;
       b.vx+=impulse*nx*invB;
       b.vy+=impulse*ny*invB;
     }
   }
 };
 const render=()=>{
   for(const s of spheres){
     s.holder.style.transform="translate3d("+s.x.toFixed(2)+"px,"+s.y.toFixed(2)+"px,0)";
   }
 };
 const arrange=()=>{
   const newWidth=field.clientWidth,newHeight=field.clientHeight;
   if(!newWidth||!newHeight)return;
   const oldWidth=width,oldHeight=height;
   width=newWidth;height=newHeight;
   for(const s of spheres){
     s.r=s.link.offsetWidth/2;
     s.x=laidOut?s.x*width/oldWidth:width*s.startX;
     s.y=laidOut?s.y*height/oldHeight:height*s.startY;
     within(s);
   }
   // Relax any starting or resize overlap before a frame is shown.
   for(let pass=0;pass<90;pass++){
     separate(false);
     for(const s of spheres)within(s);
   }
   laidOut=true;
   render();
   field.dataset.orbReady="true";
 };
 const capSpeed=s=>{
   const speed=Math.hypot(s.vx,s.vy);
   if(speed>45){s.vx*=45/speed;s.vy*=45/speed}
   else if(speed<10 && speed>.001){s.vx*=10/speed;s.vy*=10/speed}
 };
 const tick=now=>{
   frameId=0;
   if(reduced?.matches||!visible||document.visibilityState==="hidden")return;
   const dt=last?Math.min((now-last)/1000,.033):0;
   last=now;
   if(dt>0 && laidOut){
     for(const s of spheres){
       if(pinned(s))continue;
       s.x+=s.vx*dt;s.y+=s.vy*dt;
       within(s);
     }
     // A second pass handles closely packed collisions without shaking.
     for(let pass=0;pass<2;pass++){
       separate(pass===0);
       for(const s of spheres)within(s);
     }
     for(const s of spheres)capSpeed(s);
     render();
   }
   frameId=window.requestAnimationFrame(tick);
 };
 const syncMotion=()=>{
   if(frameId){window.cancelAnimationFrame(frameId);frameId=0}
   last=0;
   if(!reduced?.matches&&visible&&document.visibilityState!=="hidden"&&laidOut){
     frameId=window.requestAnimationFrame(tick);
   }
 };
 arrange();
 if(window.ResizeObserver)new ResizeObserver(()=>arrange()).observe(field);
 else window.addEventListener("resize",arrange,{passive:true});
 if(window.IntersectionObserver)new IntersectionObserver(entries=>{
   visible=entries[0]?.isIntersecting??true;
   syncMotion();
 },{threshold:0}).observe(field);
 if(reduced?.addEventListener)reduced.addEventListener("change",syncMotion);
 document.addEventListener("visibilitychange",syncMotion);
 syncMotion();
})();
