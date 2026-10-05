import {
  f
} from "./chunk-MJVHGBYJ.js";
import {
  J,
  a,
  d,
  n,
  v
} from "./chunk-AKECGBUJ.js";
import {
  d as d2
} from "./chunk-FBOO75ZN.js";
import {
  __async
} from "./chunk-5K356HEJ.js";

// node_modules/@ionic/core/components/p-LH1I_Zhd.js
var t;
var i = (e, o, i2) => {
  const n3 = o.startsWith("animation") ? (r3 = e, void 0 === t && (t = void 0 === r3.style.animationName && void 0 !== r3.style.webkitAnimationName ? "-webkit-" : ""), t) : "";
  var r3;
  e.style.setProperty(n3 + o, i2);
};
var n2 = (e = [], o) => {
  if (void 0 !== o) {
    const t3 = Array.isArray(o) ? o : [o];
    return [...e, ...t3];
  }
  return e;
};
var r = (t3) => {
  let r3, a2, s2, d4, f3, l2, c2, v3, m2, u2, p2, y2 = [], g2 = [], A2 = [], b2 = false, C2 = {}, E2 = [], h2 = [], S = {}, k2 = 0, R = false, j2 = false, w2 = true, T = false, D2 = true, F = false;
  const K = t3, W2 = [], I = [], M2 = [], P2 = [], Z = [], x2 = [], B2 = [], J2 = [], q = [], z = [], G = [], H = "function" == typeof AnimationEffect || void 0 !== d2 && "function" == typeof d2.AnimationEffect, L2 = "function" == typeof Element && "function" == typeof Element.prototype.animate && H, N = () => G, O = (e, o) => {
    const t4 = o.findIndex(((o2) => o2.c === e));
    t4 > -1 && o.splice(t4, 1);
  }, Q = (e, o) => ((o?.oneTimeCallback ? I : W2).push({ c: e, o }), p2), U2 = () => {
    L2 && (G.forEach(((e) => {
      e.cancel();
    })), G.length = 0);
  }, V2 = () => {
    x2.forEach(((e) => {
      e?.parentNode && e.parentNode.removeChild(e);
    })), x2.length = 0;
  }, X = () => void 0 !== f3 ? f3 : c2 ? c2.getFill() : "both", Y = () => void 0 !== v3 ? v3 : void 0 !== l2 ? l2 : c2 ? c2.getDirection() : "normal", $ = () => R ? "linear" : void 0 !== s2 ? s2 : c2 ? c2.getEasing() : "linear", _ = () => j2 ? 0 : void 0 !== m2 ? m2 : void 0 !== a2 ? a2 : c2 ? c2.getDuration() : 0, ee = () => void 0 !== d4 ? d4 : c2 ? c2.getIterations() : 1, oe = () => void 0 !== u2 ? u2 : void 0 !== r3 ? r3 : c2 ? c2.getDelay() : 0, te = () => {
    0 !== k2 && (k2--, 0 === k2 && ((() => {
      q.forEach(((e2) => e2())), z.forEach(((e2) => e2()));
      const e = w2 ? 1 : 0, o = E2, t4 = h2, n3 = S;
      P2.forEach(((e2) => {
        const r4 = e2.classList;
        o.forEach(((e3) => r4.add(e3))), t4.forEach(((e3) => r4.remove(e3)));
        for (const o2 in n3) n3.hasOwnProperty(o2) && i(e2, o2, n3[o2]);
      })), m2 = void 0, v3 = void 0, u2 = void 0, W2.forEach(((o2) => o2.c(e, p2))), I.forEach(((o2) => o2.c(e, p2))), I.length = 0, D2 = true, w2 && (T = true), w2 = true;
    })(), c2 && c2.animationFinish()));
  }, ie = () => {
    (() => {
      B2.forEach(((e2) => e2())), J2.forEach(((e2) => e2()));
      const e = g2, o = A2, t4 = C2;
      P2.forEach(((n3) => {
        const r4 = n3.classList;
        e.forEach(((e2) => r4.add(e2))), o.forEach(((e2) => r4.remove(e2)));
        for (const e2 in t4) t4.hasOwnProperty(e2) && i(n3, e2, t4[e2]);
      }));
    })(), y2.length > 0 && L2 && (P2.forEach(((e) => {
      const o = e.animate(y2, { id: K, delay: oe(), duration: _(), easing: $(), iterations: ee(), fill: X(), direction: Y() });
      o.pause(), G.push(o);
    })), G.length > 0 && (G[0].onfinish = () => {
      te();
    })), b2 = true;
  }, ne = (e) => {
    e = Math.min(Math.max(e, 0), 0.9999), L2 && G.forEach(((o) => {
      o.currentTime = o.effect.getComputedTiming().delay + _() * e, o.pause();
    }));
  }, re = (e) => {
    G.forEach(((e2) => {
      e2.effect.updateTiming({ delay: oe(), duration: _(), easing: $(), iterations: ee(), fill: X(), direction: Y() });
    })), void 0 !== e && ne(e);
  }, ae = (e = false, o = true, t4) => (e && Z.forEach(((i2) => {
    i2.update(e, o, t4);
  })), L2 && re(t4), p2), se = () => {
    b2 && (L2 ? G.forEach(((e) => {
      e.pause();
    })) : P2.forEach(((e) => {
      i(e, "animation-play-state", "paused");
    })), F = true);
  }, de = (e) => new Promise(((o) => {
    e?.sync && (j2 = true, Q((() => j2 = false), { oneTimeCallback: true })), b2 || ie(), T && (L2 && (ne(0), re()), T = false), D2 && (k2 = Z.length + 1, D2 = false);
    const t4 = () => {
      O(i2, I), o();
    }, i2 = () => {
      O(t4, M2), o();
    };
    Q(i2, { oneTimeCallback: true }), M2.push({ c: t4, o: { oneTimeCallback: true } }), Z.forEach(((e2) => {
      e2.play();
    })), L2 ? (G.forEach(((e2) => {
      e2.play();
    })), 0 !== y2.length && 0 !== P2.length || te()) : te(), F = false;
  })), fe = (e, o) => {
    const t4 = y2[0];
    return void 0 === t4 || void 0 !== t4.offset && 0 !== t4.offset ? y2 = [{ offset: 0, [e]: o }, ...y2] : t4[e] = o, p2;
  };
  return p2 = { parentAnimation: c2, elements: P2, childAnimations: Z, id: K, animationFinish: te, from: fe, to: (e, o) => {
    const t4 = y2[y2.length - 1];
    return void 0 === t4 || void 0 !== t4.offset && 1 !== t4.offset ? y2 = [...y2, { offset: 1, [e]: o }] : t4[e] = o, p2;
  }, fromTo: (e, o, t4) => fe(e, o).to(e, t4), parent: (e) => (c2 = e, p2), play: de, pause: () => (Z.forEach(((e) => {
    e.pause();
  })), se(), p2), stop: () => {
    Z.forEach(((e) => {
      e.stop();
    })), b2 && (U2(), b2 = false), R = false, j2 = false, D2 = true, v3 = void 0, m2 = void 0, u2 = void 0, k2 = 0, T = false, w2 = true, F = false, M2.forEach(((e) => e.c(0, p2))), M2.length = 0;
  }, destroy: (e) => (Z.forEach(((o) => {
    o.destroy(e);
  })), ((e2) => {
    U2(), e2 && V2();
  })(e), P2.length = 0, Z.length = 0, y2.length = 0, W2.length = 0, I.length = 0, b2 = false, D2 = true, p2), keyframes: (e) => {
    const o = y2 !== e;
    return y2 = e, o && ((e2) => {
      L2 && N().forEach(((o2) => {
        const t4 = o2.effect;
        if (t4.setKeyframes) t4.setKeyframes(e2);
        else {
          const i2 = new KeyframeEffect(t4.target, e2, t4.getTiming());
          o2.effect = i2;
        }
      }));
    })(y2), p2;
  }, addAnimation: (e) => {
    if (null != e) if (Array.isArray(e)) for (const o of e) o.parent(p2), Z.push(o);
    else e.parent(p2), Z.push(e);
    return p2;
  }, addElement: (o) => {
    if (null != o) if (1 === o.nodeType) P2.push(o);
    else if (o.length >= 0) for (let e = 0; e < o.length; e++) P2.push(o[e]);
    else d("createAnimation - Invalid addElement value.");
    return p2;
  }, update: ae, fill: (e) => (f3 = e, ae(true), p2), direction: (e) => (l2 = e, ae(true), p2), iterations: (e) => (d4 = e, ae(true), p2), duration: (e) => (L2 || 0 !== e || (e = 1), a2 = e, ae(true), p2), easing: (e) => (s2 = e, ae(true), p2), delay: (e) => (r3 = e, ae(true), p2), getWebAnimations: N, getKeyframes: () => y2, getFill: X, getDirection: Y, getDelay: oe, getIterations: ee, getEasing: $, getDuration: _, afterAddRead: (e) => (q.push(e), p2), afterAddWrite: (e) => (z.push(e), p2), afterClearStyles: (e = []) => {
    for (const o of e) S[o] = "";
    return p2;
  }, afterStyles: (e = {}) => (S = e, p2), afterRemoveClass: (e) => (h2 = n2(h2, e), p2), afterAddClass: (e) => (E2 = n2(E2, e), p2), beforeAddRead: (e) => (B2.push(e), p2), beforeAddWrite: (e) => (J2.push(e), p2), beforeClearStyles: (e = []) => {
    for (const o of e) C2[o] = "";
    return p2;
  }, beforeStyles: (e = {}) => (C2 = e, p2), beforeRemoveClass: (e) => (A2 = n2(A2, e), p2), beforeAddClass: (e) => (g2 = n2(g2, e), p2), onFinish: Q, isRunning: () => 0 !== k2 && !F, progressStart: (e = false, o) => (Z.forEach(((t4) => {
    t4.progressStart(e, o);
  })), se(), R = e, b2 || ie(), ae(false, true, o), p2), progressStep: (e) => (Z.forEach(((o) => {
    o.progressStep(e);
  })), ne(e), p2), progressEnd: (e, o, t4) => (R = false, Z.forEach(((i2) => {
    i2.progressEnd(e, o, t4);
  })), void 0 !== t4 && (m2 = t4), T = false, w2 = true, 0 === e ? (v3 = "reverse" === Y() ? "normal" : "reverse", "reverse" === v3 && (w2 = false), L2 ? (ae(), ne(1 - o)) : (u2 = (1 - o) * _() * -1, ae(false, false))) : 1 === e && (L2 ? (ae(), ne(o)) : (u2 = o * _() * -1, ae(false, false))), void 0 === e || c2 || de(), p2) };
};

// node_modules/@ionic/core/components/p-CVVUo4J1.js
var r2 = "ionViewWillEnter";
var t2 = "ionViewDidEnter";
var s = "ionViewWillLeave";
var c = "ionViewDidLeave";
var l = "ionViewWillUnload";
var u = (n3) => {
  n3.tabIndex = -1, n3.focus();
};
var d3 = (n3) => null !== n3.offsetParent;
var f2 = "ion-last-focus";
var p = (e) => {
  if (n.get("focusManagerPriority", false)) {
    const n3 = document.activeElement;
    null !== n3 && e?.contains(n3) && n3.setAttribute(f2, "true");
  }
};
var w = (i2) => {
  const a2 = n.get("focusManagerPriority", false);
  if (Array.isArray(a2) && !i2.contains(document.activeElement)) {
    const n3 = i2.querySelector(`[${f2}]`);
    if (n3 && d3(n3)) return void u(n3);
    for (const n4 of a2) switch (n4) {
      case "content":
        const a3 = i2.querySelector('main, [role="main"]');
        if (a3 && d3(a3)) return void u(a3);
        break;
      case "heading":
        const o = i2.querySelector('h1, [role="heading"][aria-level="1"]');
        if (o && d3(o)) return void u(o);
        break;
      case "banner":
        const r3 = i2.querySelector('header, [role="banner"]');
        if (r3 && d3(r3)) return void u(r3);
        break;
      default:
        a(`Unrecognized focus manager priority value ${n4}`);
    }
    u(i2);
  }
};
var v2 = (n3) => new Promise(((e, a2) => {
  J((() => {
    const i2 = A(n3);
    m(n3, i2), b(n3).then(((i3) => {
      i3.animation && i3.animation.destroy(), g(n3), e(i3);
    }), ((e2) => {
      g(n3), a2(e2);
    })).finally((() => {
      D(i2, false);
    }));
  }));
}));
var m = (n3, e) => {
  const i2 = n3.enteringEl, a2 = n3.leavingEl;
  p(a2), B(i2, a2, n3.direction), D(e, true), n3.showGoBack ? i2.classList.add("can-go-back") : i2.classList.remove("can-go-back"), x(i2, false), i2.style.setProperty("pointer-events", "none"), a2 && (x(a2, false), a2.style.setProperty("pointer-events", "none"));
};
var b = (n3) => __async(null, null, function* () {
  const e = yield h(n3);
  return e && v.isBrowser ? y(e, n3) : P(n3);
});
var g = (n3) => {
  const e = n3.enteringEl, i2 = n3.leavingEl;
  e.classList.remove("ion-page-invisible"), e.style.removeProperty("pointer-events"), void 0 !== i2 && (i2.classList.remove("ion-page-invisible"), i2.style.removeProperty("pointer-events")), w(e);
};
var h = (n3) => __async(null, null, function* () {
  if (n3.leavingEl && n3.animated && 0 !== n3.duration) return n3.animationBuilder ? n3.animationBuilder : "ios" === n3.mode ? (yield import("./p-BKxLivx4-TKLK26QX.js")).iosTransitionAnimation : (yield import("./p-CJgshb3W-HPTVPWC7.js")).mdTransitionAnimation;
});
var y = (n3, e) => __async(null, null, function* () {
  yield k(e, true);
  const i2 = n3(e.baseEl, e);
  C(e.enteringEl, e.leavingEl);
  const a2 = yield V(i2, e);
  return e.progressCallback && e.progressCallback(void 0), a2 && E(e.enteringEl, e.leavingEl), { hasCompleted: a2, animation: i2 };
});
var P = (e) => __async(null, null, function* () {
  const i2 = e.enteringEl, a2 = e.leavingEl, o = n.get("focusManagerPriority", false);
  return yield k(e, o), C(i2, a2), E(i2, a2), { hasCompleted: true };
});
var k = (n3, e) => __async(null, null, function* () {
  (void 0 !== n3.deepWait ? n3.deepWait : e) && (yield Promise.all([W(n3.enteringEl), W(n3.leavingEl)])), yield j(n3.viewIsReady, n3.enteringEl);
});
var j = (n3, e) => __async(null, null, function* () {
  n3 && (yield n3(e));
});
var V = (n3, e) => {
  const i2 = e.progressCallback, a2 = new Promise(((e2) => {
    n3.onFinish(((n4) => e2(1 === n4)));
  }));
  return i2 ? (n3.progressStart(true), i2(n3)) : n3.play(), a2;
};
var C = (n3, e) => {
  L(e, s), L(n3, r2);
};
var E = (n3, e) => {
  L(n3, t2), L(e, c);
};
var L = (n3, e) => {
  if (n3) {
    const i2 = new CustomEvent(e, { bubbles: false, cancelable: false });
    n3.dispatchEvent(i2);
  }
};
var U = () => new Promise(((n3) => f((() => f((() => n3()))))));
var W = (n3) => __async(null, null, function* () {
  const e = n3;
  if (e) {
    if (null != e.componentOnReady) {
      if (null != (yield e.componentOnReady())) return;
    } else if (null != e.__registerHost) {
      const n4 = new Promise(((n5) => f(n5)));
      return void (yield n4);
    }
    yield Promise.all(Array.from(e.children).map(W));
  }
});
var x = (n3, e) => {
  e ? (n3.setAttribute("aria-hidden", "true"), n3.classList.add("ion-page-hidden")) : (n3.hidden = false, n3.removeAttribute("aria-hidden"), n3.classList.remove("ion-page-hidden"));
};
var B = (n3, e, i2) => {
  void 0 !== n3 && (n3.style.zIndex = "back" === i2 ? "99" : "101"), void 0 !== e && (e.style.zIndex = "100");
};
var D = (n3, e) => {
  if (!n3) return;
  const i2 = "header-transitioning";
  e ? n3.classList.add(i2) : n3.classList.remove(i2);
};
var M = (n3) => {
  if (n3.classList.contains("ion-page")) return n3;
  return n3.querySelector(":scope > .ion-page, :scope > ion-nav, :scope > ion-tabs") || n3;
};
var A = (n3) => {
  if ("ios" !== n3.mode) return null;
  const e = "back" === n3.direction ? n3.leavingEl : n3.enteringEl;
  return e ? e.querySelector("ion-header") : null;
};

export {
  r,
  r2,
  t2 as t,
  s,
  c,
  l,
  v2 as v,
  L,
  U,
  W,
  x,
  M
};
//# sourceMappingURL=chunk-C2A6QGXM.js.map
