import {
  n
} from "./chunk-AZOYSDTW.js";
import {
  h,
  r
} from "./chunk-MJVHGBYJ.js";
import "./chunk-AKECGBUJ.js";
import "./chunk-FBOO75ZN.js";
import "./chunk-5K356HEJ.js";

// node_modules/@ionic/core/components/p-yjLe0sN2.js
var s = (s2, e, n2, a, c) => {
  const p = s2.ownerDocument.defaultView;
  let i = r(s2);
  const m = (t) => i ? -t.deltaX : t.deltaX;
  return n({ el: s2, gestureName: "goback-swipe", gesturePriority: 101, threshold: 10, canStart: (t) => (i = r(s2), ((t2) => {
    const { startX: o } = t2;
    return i ? o >= p.innerWidth - 50 : o <= 50;
  })(t) && e()), onStart: n2, onMove: (t) => {
    const o = m(t);
    a(o / p.innerWidth);
  }, onEnd: (o) => {
    const r2 = m(o), s3 = p.innerWidth, e2 = r2 / s3, n3 = ((t) => i ? -t.velocityX : t.velocityX)(o), a2 = n3 >= 0 && (n3 > 0.2 || r2 > s3 / 2), j = (a2 ? 1 - e2 : e2) * s3;
    let l = 0;
    if (j > 5) {
      const t = j / Math.abs(n3);
      l = Math.min(t, 540);
    }
    c(a2, e2 <= 0 ? 0.01 : h(0, e2, 0.9999), l);
  } });
};
export {
  s as createSwipeBackGesture
};
//# sourceMappingURL=p-yjLe0sN2-3KAAO5LB.js.map
