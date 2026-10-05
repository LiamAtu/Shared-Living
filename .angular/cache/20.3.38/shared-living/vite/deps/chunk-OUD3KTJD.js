import {
  n
} from "./chunk-MJVHGBYJ.js";
import {
  h
} from "./chunk-AKECGBUJ.js";
import {
  __async
} from "./chunk-5K356HEJ.js";

// node_modules/@ionic/core/components/p-B8HBLiYi.js
var r = "ion-content";
var e = ".ion-content-scroll-host";
var t = `${r}, ${e}`;
var n2 = (o) => "ION-CONTENT" === o.tagName;
var a = (s) => __async(null, null, function* () {
  return n2(s) ? (yield new Promise(((r2) => n(s, r2))), s.getScrollElement()) : s;
});
var i = (o) => o.querySelector(e) || o.querySelector(t);
var l = (o) => o.closest(t);
var f = (o) => o.querySelector(e);
var u = (o) => {
  if (n2(o)) return o.querySelector("ion-refresher");
  const s = o.closest(r);
  if (null === s) return null;
  const e2 = f(s);
  return null !== e2 && e2.contains(o) ? s.querySelector("ion-refresher") : null;
};
var c = (o, s) => n2(o) ? o.scrollToTop(s) : Promise.resolve(o.scrollTo({ top: 0, left: 0, behavior: "smooth" }));
var h2 = (o, s, r2, e2) => n2(o) ? o.scrollByPoint(s, r2, e2) : Promise.resolve(o.scrollBy({ top: r2, left: s, behavior: e2 > 0 ? "smooth" : "auto" }));
var m = (o) => h(o, r);
var p = (o) => {
  if (n2(o)) {
    const s = o.scrollY;
    return o.scrollY = false, s;
  }
  return o.style.setProperty("overflow", "hidden"), true;
};
var d = (o, s) => {
  n2(o) ? o.scrollY = s : o.style.removeProperty("overflow");
};

export {
  r,
  e,
  n2 as n,
  a,
  i,
  l,
  f,
  u,
  c,
  h2 as h,
  m,
  p,
  d
};
//# sourceMappingURL=chunk-OUD3KTJD.js.map
