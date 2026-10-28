import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const code=fs.readFileSync(path.join(import.meta.dirname,"../carousel-interaction.js"),"utf8");
let checks=0;
function check(label,ok){assert.ok(ok,label);console.log("✓ "+label);checks++}
const handlers={};
const classes=new Set();
let time=1000,hold=false,resumed=false,prevented=0,stopped=0,capture=false;
const animation={
  currentTime:23000,
  effect:{getTiming:()=>({duration:46000})},
  pause(){hold=true;resumed=false},
  play(){resumed=true;hold=false}
};
const group={getBoundingClientRect:()=>({width:1000})};
const track={
  querySelector:s=>s===".sprout-marquee__group"?group:null,
  getAnimations:()=>[animation]
};
const marquee={
  querySelector:s=>s===".sprout-marquee__track"?track:null,
  addEventListener(name,fn){handlers[name]=fn},
  classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)},
  setPointerCapture(){capture=true},
  hasPointerCapture:()=>capture,
  releasePointerCapture(){capture=false}
};
const document={querySelector:s=>s===".sprout-marquee"?marquee:null};
vm.runInNewContext(code,{document,performance:{now:()=>time}});
const pointer=(pointerId,clientX,other={})=>({
  pointerId,clientX,pointerType:"touch",button:0,cancelable:true,
  preventDefault(){prevented++},...other
});
handlers.pointerdown(pointer(1,250));
check("Touch down pauses the animation before manual drag",hold===true);
handlers.pointermove(pointer(1,247));
check("A slight tap movement is ignored",animation.currentTime===23000&&!classes.has("is-dragging"));
handlers.pointermove(pointer(1,170));
check("Dragging left moves the carousel left by the same distance",
  Math.abs(animation.currentTime-(23000-80*46))<.01&&
  classes.has("is-dragging")&&capture===true&&prevented===1);
handlers.pointermove(pointer(1,320));
check("Dragging right reverses the carousel smoothly",
  Math.abs(animation.currentTime-(23000+70*46))<.01);
handlers.pointerup(pointer(1,320));
check("After drag the animation resumes and pointer capture is released",
  resumed===true&&!classes.has("is-dragging")&&capture===false);
handlers.click({
  preventDefault(){prevented++},
  stopImmediatePropagation(){stopped++}
});
check("A drag release does not accidentally open the sprout picker",stopped===1);
time+=700;
handlers.click({
  preventDefault(){prevented++},
  stopImmediatePropagation(){stopped++}
});
check("A subsequent genuine click remains available",stopped===1);
handlers.pointerdown(pointer(2,270));
handlers.pointerup(pointer(2,270));
time+=1;
handlers.click({
  preventDefault(){prevented++},
  stopImmediatePropagation(){stopped++}
});
check("A genuine tap is not prevented",stopped===1);
const beforeWheel=animation.currentTime;
handlers.wheel({
  deltaX:100,deltaY:3,cancelable:true,
  preventDefault(){prevented++}
});
check("Horizontal trackpad scroll scrubs the same timeline",
  Math.abs(animation.currentTime-(beforeWheel-100*46))<.01);
const beforeVertical=animation.currentTime;
handlers.wheel({deltaX:3,deltaY:90,cancelable:true,preventDefault(){prevented++}});
check("Vertical page scroll is not hijacked",animation.currentTime===beforeVertical);
const beforeKey=animation.currentTime;
handlers.keydown({
  key:"ArrowRight",target:{closest:s=>s===".sprout-tile"?{}:null},
  preventDefault(){prevented++}
});
check("Right arrow can move a focused sprout tile without opening picker",
  Math.abs(animation.currentTime-(beforeKey+175*46))<.01);
handlers.pointerdown(pointer(3,120));
handlers.pointermove(pointer(3,90));
handlers.pointercancel(pointer(3,90));
check("Cancelled gestures leave no stuck dragging state",
  !classes.has("is-dragging")&&capture===false&&resumed===true);
console.log("\nCarousel gesture tests passed: "+checks);
