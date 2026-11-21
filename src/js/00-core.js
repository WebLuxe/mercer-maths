const THREE = await import(new URL("assets/vendor/three/three.module.min.js", document.baseURI).href);
window.__kmBoot = true;   // the app is running (see the safety net at the end of each page)
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const isMobile = matchMedia("(max-width: 768px)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const PAGE = document.body.dataset.page || "profile";
const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent.appendChild(n);
  return n;
};

/* A tiny event bus. A feature announces what just happened ("snap:go", "quiz:right", "book:open"…)
   and other files react to it (sound, haptics, the 3D scene) without either knowing about the other.
   A listener that throws never breaks the feature that announced: the error is logged and the rest run. */
const bus = {
  map: {},
  on(name, fn) { (bus.map[name] || (bus.map[name] = [])).push(fn); return bus; },
  emit(name, data) {
    const list = bus.map[name];
    if (!list) return;
    for (const fn of list) { try { fn(data || {}); } catch (err) { console.error("bus:" + name, err); } }
  },
};
