import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const source=fs.readFileSync(path.join(import.meta.dirname,"../carousel-interaction.js"),"utf8");
let total=0;
function check(label,ok){assert.ok(ok,label);total++;console.log("✓ "+label)}
const handlers={};
const classes=new Set();
const arrows=[-1,1].map(direction=>({
  dataset:{sproutScroll:String(direction)},listeners:{},
  addEventListener(type,fn){this.listeners[type]=fn}
}));
let prevented=0,stopped=0,captured=false;
const viewport={
  scrollLeft:120, calls:[],
  addEventListener(type,fn){handlers[type]=fn},
  querySelector(){return null},
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
  scrollBy(options){this.calls.push(options);this.scrollLeft+=options.left},
  setPointerCapture(){captured=true},
  hasPointerCapture(){return captured},
  releasePointerCapture(){captured=false}
};
const document={
  querySelector:s=>s===".sprout-marquee"?viewport:null,
  querySelectorAll:s=>s==="[data-sprout-scroll]"?arrows:[]
};
vm.runInNewContext(source,{document});
check("Carousel has no automatic animation or timers",
  !/getAnimations|requestAnimationFrame|setInterval|setTimeout|\.animate\(/.test(source));
check("No movement on initialisation",viewport.scrollLeft===120&&viewport.calls.length===0);
arrows[1].listeners.click();
check("Right arrow manually scrolls right",viewport.scrollLeft===355);
arrows[0].listeners.click();
check("Left arrow returns to previous position",viewport.scrollLeft===120);
const pointer=(x,other={})=>({
 pointerId:1,clientX:x,button:0,pointerType:"mouse",cancelable:true,
 preventDefault(){prevented++},...other
});
handlers.pointerdown(pointer(300));
handlers.pointermove(pointer(296));
check("Small accidental movement does not start dragging",viewport.scrollLeft===120&&!captured);
handlers.pointermove(pointer(215));
check("Mouse drag moves the carousel without links opening",
  viewport.scrollLeft===205&&captured&&classes.has("is-dragging")&&prevented===1);
handlers.pointerup(pointer(215));
check("Releasing pointer stops dragging",!captured&&!classes.has("is-dragging"));
handlers.click({preventDefault(){prevented++},stopImmediatePropagation(){stopped++}});
check("Click after a real drag is suppressed",stopped===1);
handlers.click({preventDefault(){prevented++},stopImmediatePropagation(){stopped++}});
check("Next genuine click still navigates normally",stopped===1);
const beforeTouch=viewport.scrollLeft;
handlers.pointerdown(pointer(300,{pointerType:"touch"}));
handlers.pointermove(pointer(215,{pointerType:"touch"}));
handlers.pointerup(pointer(215,{pointerType:"touch"}));
check("Touch gestures use native horizontal scroll instead of hijacking events",
 viewport.scrollLeft===beforeTouch&&!captured);
handlers.keydown({key:"ArrowRight",preventDefault(){prevented++}});
check("Keyboard right arrow scrolls intentionally",viewport.scrollLeft===beforeTouch+235);
handlers.keydown({key:"ArrowLeft",preventDefault(){prevented++}});
check("Keyboard left arrow returns to previous item",viewport.scrollLeft===beforeTouch);
handlers.pointerdown(pointer(180));
handlers.pointermove(pointer(120));
handlers.pointercancel(pointer(120));
check("Cancelled drags clean up pointer capture",!captured&&!classes.has("is-dragging"));
console.log("\nManual carousel tests passed: "+total);
