import {
  M,
  r
} from "./chunk-XPTDVJ6V.js";

// node_modules/@ionic/core/components/p-CJgshb3W.js
var r2 = (r3, a) => {
  const i = "40px", n = "back" === a.direction, s = a.leavingEl, e = M(a.enteringEl), c = e.querySelector("ion-toolbar"), p = r();
  if (p.addElement(e).fill("both").beforeRemoveClass("ion-page-invisible"), n ? p.duration((a.duration ?? 0) || 200).easing("cubic-bezier(0.47,0,0.745,0.715)") : p.duration((a.duration ?? 0) || 280).easing("cubic-bezier(0.36,0.66,0.04,1)").fromTo("transform", `translateY(${i})`, "translateY(0px)").fromTo("opacity", 0.01, 1), c) {
    const o = r();
    o.addElement(c), p.addAnimation(o);
  }
  if (s && n) {
    p.duration((a.duration ?? 0) || 200).easing("cubic-bezier(0.47,0,0.745,0.715)");
    const r4 = r();
    r4.addElement(M(s)).onFinish(((t) => {
      1 === t && r4.elements.length > 0 && r4.elements[0].style.setProperty("display", "none");
    })).fromTo("transform", "translateY(0px)", `translateY(${i})`).fromTo("opacity", 1, 0), p.addAnimation(r4);
  }
  return p;
};

export {
  r2 as r
};
//# sourceMappingURL=chunk-TGTKANMM.js.map
