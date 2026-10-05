import {
  d
} from "./chunk-AKECGBUJ.js";
import {
  d as d2
} from "./chunk-FBOO75ZN.js";

// node_modules/@ionic/core/components/p-Dojwmvde.js
var r = (r3) => {
  for (let t2 = r3; t2; t2 = t2.parentElement) {
    const r4 = t2.getAttribute("dir")?.toLowerCase();
    if ("rtl" === r4) return true;
    if ("ltr" === r4) return false;
  }
  return "rtl" === document?.dir?.toLowerCase();
};

// node_modules/@ionic/core/components/p-DlUdjUlf.js
var r2 = (a, i = 0) => new Promise(((e) => {
  t(a, i, e);
}));
var t = (a, i = 0, e) => {
  let r3, t2;
  const n2 = { passive: true }, o2 = () => {
    r3 && r3();
  }, s2 = (i2) => {
    void 0 !== i2 && a !== i2.target || (o2(), e(i2));
  };
  return a && (a.addEventListener("webkitTransitionEnd", s2, n2), a.addEventListener("transitionend", s2, n2), t2 = setTimeout(s2, i + 500), r3 = () => {
    void 0 !== t2 && (clearTimeout(t2), t2 = void 0), a.removeEventListener("webkitTransitionEnd", s2, n2), a.removeEventListener("transitionend", s2, n2);
  }), o2;
};
var n = (a, i) => {
  a.componentOnReady ? a.componentOnReady().then(((a2) => i(a2))) : f((() => i(a)));
};
var o = (a) => void 0 !== a.componentOnReady;
var s = (a, i = []) => {
  const e = {};
  return i.forEach(((i2) => {
    a.hasAttribute(i2) && (null !== a.getAttribute(i2) && (e[i2] = a.getAttribute(i2)), a.removeAttribute(i2));
  })), e;
};
var l = ["role", "aria-activedescendant", "aria-atomic", "aria-autocomplete", "aria-braillelabel", "aria-brailleroledescription", "aria-busy", "aria-checked", "aria-colcount", "aria-colindex", "aria-colindextext", "aria-colspan", "aria-controls", "aria-current", "aria-describedby", "aria-description", "aria-details", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-flowto", "aria-haspopup", "aria-hidden", "aria-invalid", "aria-keyshortcuts", "aria-label", "aria-labelledby", "aria-level", "aria-live", "aria-multiline", "aria-multiselectable", "aria-orientation", "aria-owns", "aria-placeholder", "aria-posinset", "aria-pressed", "aria-readonly", "aria-relevant", "aria-required", "aria-roledescription", "aria-rowcount", "aria-rowindex", "aria-rowindextext", "aria-rowspan", "aria-selected", "aria-setsize", "aria-sort", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"];
var u = (a) => s(a, l);
var d3 = (a, i, e, r3) => a.addEventListener(i, e, r3);
var c = (a, i, e, r3) => a.removeEventListener(i, e, r3);
var p = (i, e, r3, t2) => {
  const n2 = d2?.document;
  if (!n2 || !i || "undefined" == typeof ResizeObserver) return () => {
  };
  const o2 = n2.createElement("div");
  o2.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:var(${e},0px);`, i.appendChild(o2);
  let s2 = t2;
  const l2 = new ResizeObserver(((a) => {
    const { height: i2 } = a[0].contentRect;
    void 0 !== s2 && i2 !== s2 && r3(i2), s2 = i2;
  }));
  return l2.observe(o2), () => {
    l2.disconnect(), o2.remove();
  };
};
var m = (a, i = a) => a.shadowRoot || i;
var f = (a) => "function" == typeof __zone_symbol__requestAnimationFrame ? __zone_symbol__requestAnimationFrame(a) : "function" == typeof requestAnimationFrame ? requestAnimationFrame(a) : setTimeout(a);
var v = (a) => !!a.shadowRoot && !!a.attachShadow;
var b = (a) => {
  if (a.focus(), a.classList.contains("ion-focusable")) {
    const i = a.closest("ion-app");
    i && i.setFocus([a]);
  }
};
var w = (a, i, e, r3, t2) => {
  {
    let a2 = i.querySelector("input.aux-input");
    a2 || (a2 = i.ownerDocument.createElement("input"), a2.type = "hidden", a2.classList.add("aux-input"), i.appendChild(a2)), a2.disabled = t2, a2.name = e, a2.value = r3 || "";
  }
};
var h = (a, i, e) => Math.max(a, Math.min(i, e));
var x = (a, e) => {
  if (!a) {
    const a2 = "ASSERT: " + e;
    throw d(a2), new Error(a2);
  }
};
var y = (a) => {
  if (a) {
    const i = a.changedTouches;
    if (i && i.length > 0) {
      const a2 = i[0];
      return { x: a2.clientX, y: a2.clientY };
    }
    if (void 0 !== a.pageX) return { x: a.pageX, y: a.pageY };
  }
  return { x: 0, y: 0 };
};
var _ = (a, i) => {
  const r3 = r(i);
  switch (a) {
    case "start":
      return r3;
    case "end":
      return !r3;
    default:
      throw new Error(`"${a}" is not a valid value for [side]. Use "start" or "end" instead.`);
  }
};
var j = (a, i) => {
  const e = a._original || a;
  return { _original: a, emit: T(e.emit.bind(e), i) };
};
var T = (a, i = 0) => {
  let e;
  return (...r3) => {
    clearTimeout(e), e = setTimeout(a, i, ...r3);
  };
};
var q = (a, i) => {
  if (a ??= {}, i ??= {}, a === i) return true;
  const e = Object.keys(a);
  if (e.length !== Object.keys(i).length) return false;
  for (const r3 of e) {
    if (!(r3 in i)) return false;
    if (a[r3] !== i[r3]) return false;
  }
  return true;
};
var E = (a) => "number" == typeof a && !isNaN(a) && isFinite(a);

export {
  r,
  r2,
  n,
  o,
  s,
  l,
  u,
  d3 as d,
  c,
  p,
  m,
  f,
  v,
  b,
  w,
  h,
  x,
  y,
  _,
  j,
  q,
  E
};
//# sourceMappingURL=chunk-MJVHGBYJ.js.map
