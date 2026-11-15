(async () => {
const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

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

/* ==================================================================
   Text splitting
================================================================== */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  for (const c of text) {
    const s = document.createElement("span");
    s.className = "ch";
    s.setAttribute("aria-hidden", "true");
    s.textContent = c === " " ? " " : c;
    el.appendChild(s);
  }
  const chars = $$(".ch", el);
  chars.forEach((c, i) => { c.style.setProperty("--i", i); c.style.setProperty("--n", chars.length); });
  return chars;
}
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { const w = document.createElement("span"); w.className = "w"; w.textContent = part; frag.appendChild(w); }
        });
        n.replaceWith(frag);
      } else walk(n);
    });
  };
  walk(el);
  return $$(".w", el);
}
$$("[data-split]").forEach(splitChars);

/* ==================================================================
   Smooth scroll
================================================================== */
let lenis = null;
/* ==================================================================
   Full-screen section snapping (desktop)
   One flick = one section. Sections taller than the screen scroll
   freely until their end, then the next flick snaps onward.
   Registered before Lenis so it gets first say on wheel events.
================================================================== */
const panelMQ = matchMedia("(min-width: 900px) and (min-height: 560px)");
const snapOn = finePointer && !reduce;
const snapActive = () => snapOn && panelMQ.matches;
const snap = { busy: false, consumed: false, edge: false, lastWheel: 0 };
const sectionEls = $$("main > section");
const sectionBounds = () => sectionEls.map((el) => {
  const r = el.getBoundingClientRect();
  return { el, top: r.top + scrollY, bottom: r.top + scrollY + r.height };
});
const easeSnap = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
const ui = { book: false };
function snapTo(y, dur = 1.2) {
  if (!lenis) return;
  snap.busy = true;
  snap.consumed = true;
  lenis.scrollTo(y, { duration: dur, easing: easeSnap, lock: true, force: true, onComplete: () => (snap.busy = false) });
  setTimeout(() => (snap.busy = false), dur * 1000 + 300); // safety net
}
// the 3D carousel section has one stop per card
const carouselStops = (sec) => {
  const range = sec.bottom - sec.top - innerHeight, n = $$("#showTrack .card").length;
  return Array.from({ length: n }, (_, k) => sec.top + (range * k) / (n - 1));
};
function snapStep(dir, delta) {
  const secs = sectionBounds(), vh = innerHeight;
  const y = lenis.targetScroll;
  let i = 0;
  secs.forEach((s, k) => { if (s.top <= y + 2) i = k; });
  const cur = secs[i], minY = cur.top, maxY = Math.max(cur.top, cur.bottom - vh);
  if (cur.el.id === "method") {
    const stops = carouselStops(cur);
    const to = dir > 0 ? stops.find((p) => p > y + 2) : [...stops].reverse().find((p) => p < y - 2);
    if (to !== undefined) return snapTo(to, 0.95);
    if (dir > 0 && secs[i + 1]) return snapTo(secs[i + 1].top);
    if (dir < 0 && secs[i - 1]) { const p = secs[i - 1]; return snapTo(Math.max(p.top, p.bottom - vh)); }
    return;
  }
  if (dir > 0) {
    if (y < maxY - 2) {                         // still content below in this section
      const to = Math.min(y + delta, maxY);
      lenis.scrollTo(to, { lerp: 0.1 });
      if (to >= maxY - 2) snap.edge = true;
      return;
    }
    if (snap.edge || !secs[i + 1]) return;     // wait for a fresh flick at the edge
    snapTo(secs[i + 1].top);
  } else {
    if (y > minY + 2) {
      const to = Math.max(y + delta, minY);
      lenis.scrollTo(to, { lerp: 0.1 });
      if (to <= minY + 2) snap.edge = true;
      return;
    }
    if (snap.edge || !secs[i - 1]) return;
    const prev = secs[i - 1];
    snapTo(Math.max(prev.top, prev.bottom - vh));   // land on the end of a tall previous section
  }
}
if (snapOn) {
  addEventListener("wheel", (e) => {
    if (ui.book || !lenis || !snapActive() || document.body.classList.contains("is-loading")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const now = performance.now(), gap = now - snap.lastWheel;
    snap.lastWheel = now;
    if (gap > 220) { snap.consumed = false; snap.edge = false; }   // a new gesture started
    if (snap.busy || snap.consumed) return;                        // swallow trackpad inertia
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= innerHeight;
    if (Math.abs(d) < 1) return;
    snapStep(Math.sign(d), d);
  }, { passive: false, capture: true });

  addEventListener("keydown", (e) => {
    if (ui.book || !lenis || !snapActive() || document.body.classList.contains("is-loading")) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    let dir = { ArrowDown: 1, PageDown: 1, " ": 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (!dir || (e.key === " " && e.target.closest("button, a"))) return;
    if (e.key === " " && e.shiftKey) dir = -1;
    e.preventDefault();
    if (snap.busy) return;
    snap.edge = false;
    snapStep(dir, dir * innerHeight * 0.6);
  }, { capture: true });
}

// side dots: one per section, click to jump
const dotsEl = $("#dots");
const DOT_LABELS = { teaser: "Tuition", timetable: "Timetable", about: "Tutor", results: "Results", subjects: "Subjects", method: "Method", example: "Lesson", quiz: "Quiz", journey: "Story", students: "Students", fees: "Fees", faq: "FAQ", contact: "Contact" };
sectionEls.forEach((el, i) => {
  const b = document.createElement("button");
  b.setAttribute("aria-label", "Go to " + (DOT_LABELS[el.id] || "Home"));
  b.innerHTML = `<span>${DOT_LABELS[el.id] || "Home"}</span>`;
  b.addEventListener("click", () => (lenis ? snapTo(sectionBounds()[i].top) : el.scrollIntoView()));
  dotsEl.appendChild(b);
});
const dotBtns = [...dotsEl.children];
const navLinks = $$(".nav__links a");
let activeDot = -1;
function updateDots() {
  const mid = scrollY + innerHeight * 0.45;
  let i = 0;
  sectionBounds().forEach((s, k) => { if (s.top <= mid) i = k; });
  if (i === activeDot) return;
  activeDot = i;
  dotBtns.forEach((b, k) => b.classList.toggle("is-on", k === i));
  const id = sectionEls[i].id;
  navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
}


if (!reduce && Lenis) {
  lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.stop();
  lenis.on("scroll", ScrollTrigger.update);
  lenis.on("scroll", () => updateDots());
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
if (!lenis) addEventListener("scroll", () => updateDots(), { passive: true });
updateDots();
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id === "#" || a.hasAttribute("data-book")) return;
    e.preventDefault();
    const target = id === "#top" ? 0 : $(id);
    lenis ? lenis.scrollTo(target, { duration: 1.8 }) : target === 0 ? scrollTo({ top: 0 }) : target.scrollIntoView();
  })
);

/* ==================================================================
   Three.js — particles that morph through mathematical shapes
================================================================== */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const SHAPES = [
  ["fig. 1", "x² + y² + z² = r²"],
  ["fig. 2", "torus knot (2, 3)"],
  ["fig. 3", "z = sin x · cos y"],
  ["fig. 4", "z = x² − y²"],
  ["fig. 5", "r = a·e^(bθ)"],
  ["fig. 6", PAGE === "tuition" ? "A* = Σ effort" : "JM = f(you)"],
];

const canvas = $("#webgl");
// MSAA off: points and a full-screen shader gain nothing from it, and it's a big GPU cost
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
const DPR_MAX = Math.min(devicePixelRatio, isMobile ? 1.25 : 1.5);
let dpr = DPR_MAX;
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x07060b, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07060b, 0.06);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);
const world = new THREE.Group();
scene.add(world);

// shared motion state, fed by scroll speed and clicks
const motion = { vel: 0, dir: 1, shockT: -10 };

// ---- living background: aurora + nebula + warped graph paper + click ripples + comets + speed streaks
const bgMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {
    uTime: { value: 0 }, uScroll: { value: 0 }, uIntro: { value: 0 }, uVel: { value: 0 }, uDir: { value: 1 },
    uRes: { value: new THREE.Vector2(innerWidth, innerHeight) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uRipple: { value: new THREE.Vector2(0.5, 0.5) }, uRippleT: { value: -10 },
  },
  vertexShader: /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: /* glsl */ `
    ${NOISE}
    uniform float uTime, uScroll, uIntro, uVel, uDir, uRippleT; uniform vec2 uRes, uMouse, uRipple;
    float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 3; i++){ s += a * snoise(p); p *= 2.03; a *= .5; } return s; }
    float hash(float n){ return fract(sin(n) * 43758.5453); }

    // a shooting star that crosses the screen once per period
    float comet(vec2 p, float period, float seed){
      float k = floor(uTime / period), ph = fract(uTime / period);
      if (ph > .22) return 0.;
      float u = ph / .22, h = hash(k * 7.13 + seed);
      vec2 dir = normalize(vec2(-1., -.25 - h * .35));
      vec2 head = vec2(.95 + h * .5, .15 + h * .5) + dir * u * 2.8;
      vec2 d = p - head;
      float along = dot(d, -dir), perp = abs(dot(d, vec2(-dir.y, dir.x)));
      float tail = step(0., along) * smoothstep(.6, 0., along) * smoothstep(.005, 0., perp);
      float glow = smoothstep(.035, 0., length(d));
      return (tail * .8 + glow) * sin(u * 3.1416);
    }

    void main(){
      vec2 frag = gl_FragCoord.xy;
      float asp = uRes.x / uRes.y;
      vec2 p = (frag - .5 * uRes) / uRes.y;
      float t = uTime * .05;
      float v = clamp(uVel, 0., 1.5);
      vec3 base = vec3(.027, .024, .043);
      vec3 col = base;

      // click ripple: an expanding ring that bends the grid
      vec2 rp = (uRipple - .5) * vec2(asp, 1.);
      float age = uTime - uRippleT;
      float rd = length(p - rp);
      float ring = step(0., age) * smoothstep(.07, 0., abs(rd - age * .85)) * exp(-age * 1.4);

      // aurora ribbons (hue drifts with scroll, brighter while scrolling fast)
      float n = fbm(vec3(p * 1.3, t + uScroll * 1.5));
      float b1 = smoothstep(.32, 0., abs(p.y * .9 + .25 * sin(p.x * 2.2 + t * 6. + n * 2.) + n * .35 - .18));
      float b2 = smoothstep(.42, 0., abs(p.y + .3 * cos(p.x * 1.6 - t * 5. + n * 2.5) - n * .4 + .38));
      vec3 c1 = mix(vec3(.545, .361, .965), vec3(.133, .827, .933), .5 + .5 * sin(uScroll * 6.283 + t * 2.));
      vec3 c2 = mix(vec3(.957, .447, .714), vec3(.545, .361, .965), .5 + .5 * cos(uScroll * 4.4 - t * 1.5));
      float boost = 1. + v * 1.4;
      col += (c1 * b1 * .17 + c2 * b2 * .12) * boost;

      // nebula
      float neb = snoise(vec3(p * .7 + 3., t * .6));
      col += vec3(.18, .1, .36) * smoothstep(.0, .9, neb) * .3;

      // warped graph paper: warps harder while scrolling, bends around ripples
      vec2 q = p * 9. + vec2(snoise(vec3(p * 1.4, t)), snoise(vec3(p * 1.4 + 5., t))) * (.55 + v * 1.1);
      q += normalize(p - rp + .0001) * ring * 1.6;
      q.y += uScroll * 30.;
      vec2 gq = abs(fract(q - .5) - .5) / fwidth(q);
      float grid = 1. - min(min(gq.x, gq.y), 1.);
      vec2 m = (uMouse - .5) * vec2(asp, 1.);
      float md = length(p - m);
      float mask = smoothstep(1.15, .15, length(p));
      col += vec3(.75, .72, .95) * grid * (.03 * mask + .13 * smoothstep(.55, 0., md) + v * .05 + ring * .5);
      col += vec3(.35, .25, .75) * smoothstep(.55, 0., md) * .1;
      col += mix(c1, c2, .5) * ring * .45;

      // speed streaks while scrolling
      float s = max(snoise(vec3(p.x * 55., p.y * 1.1 + uTime * 2.5 * uDir, 1.7)), 0.);
      col += vec3(.65, .7, 1.) * pow(s, 7.) * v * .9;

      // shooting stars
      col += vec3(.85, .9, 1.) * (comet(p, 9., 1.) + comet(p, 13., 4.) * .8);

      col += (fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
      gl_FragColor = vec4(mix(base, col, uIntro), 1.);
    }`,
});
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bg.frustumCulled = false;
bg.renderOrder = -1;
scene.add(bg);
const bgSize = new THREE.Vector2();
const syncBgRes = () => bgMat.uniforms.uRes.value.copy(renderer.getDrawingBufferSize(bgSize));
syncBgRes();
let scrollSmooth = 0, maxScroll = 1;
const syncMax = () => (maxScroll = Math.max(1, ScrollTrigger.maxScroll(window)));
ScrollTrigger.addEventListener("refresh", syncMax);
syncMax();

// ---- particles
const COUNT = isMobile ? 6000 : 15000;
const A = new Float32Array(COUNT * 3), B = new Float32Array(COUNT * 3), C = new Float32Array(COUNT * 3),
      D = new Float32Array(COUNT * 3), E = new Float32Array(COUNT * 3), F = new Float32Array(COUNT * 3);
const rnd = new Float32Array(COUNT), col = new Float32Array(COUNT * 3);
const palette = [new THREE.Color("#8b5cf6"), new THREE.Color("#22d3ee"), new THREE.Color("#f472b6"), new THREE.Color("#ffffff")];
const golden = Math.PI * (3 - Math.sqrt(5));
const side = Math.ceil(Math.sqrt(COUNT)), S = 3.8;

for (let i = 0; i < COUNT; i++) {
  const i3 = i * 3;
  const y = 1 - (i / (COUNT - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i, R = 2.6 + (Math.random() - 0.5) * 0.25;
  A[i3] = Math.cos(th) * r * R; A[i3 + 1] = y * R; A[i3 + 2] = Math.sin(th) * r * R;
  const t = (i / COUNT) * Math.PI * 2, kr = 2 + Math.cos(3 * t), tube = 0.38 * Math.sqrt(Math.random()), ang = Math.random() * Math.PI * 2;
  B[i3] = kr * Math.cos(2 * t) * 1.05 + Math.cos(ang) * tube;
  B[i3 + 1] = kr * Math.sin(2 * t) * 1.05 + Math.sin(ang) * tube;
  B[i3 + 2] = Math.sin(3 * t) * 1.2 + Math.cos(ang + 1.3) * tube;
  const gx = -S + ((i % side) / (side - 1)) * 2 * S + (Math.random() - 0.5) * 0.04;
  const gz = -S + (Math.floor(i / side) / (side - 1)) * 2 * S + (Math.random() - 0.5) * 0.04;
  C[i3] = gx; C[i3 + 1] = Math.sin(gx * 1.1) * Math.cos(gz * 1.1) * 1.1; C[i3 + 2] = gz;
  D[i3] = gx; D[i3 + 1] = (gx * gx - gz * gz) * 0.12; D[i3 + 2] = gz;
  const arm = i % 3, dist = Math.pow(Math.random(), 1.6) * 5.5, spin = dist * 1.1 + (arm / 3) * Math.PI * 2;
  const sc = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.6;
  E[i3] = Math.cos(spin) * dist + sc; E[i3 + 1] = (Math.random() - 0.5) * 0.35 * (1 - dist / 6); E[i3 + 2] = Math.sin(spin) * dist + sc;
  rnd[i] = Math.random();
  const c = palette[Math.random() < 0.08 ? 3 : i % 3];
  col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(A, 3));
pGeo.setAttribute("aB", new THREE.BufferAttribute(B, 3));
pGeo.setAttribute("aC", new THREE.BufferAttribute(C, 3));
pGeo.setAttribute("aD", new THREE.BufferAttribute(D, 3));
pGeo.setAttribute("aE", new THREE.BufferAttribute(E, 3));
F.set(A);
pGeo.setAttribute("aF", new THREE.BufferAttribute(F, 3));
pGeo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));
pGeo.setAttribute("aCol", new THREE.BufferAttribute(col, 3));

const pMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 }, uMorph: { value: 0 }, uIntro: { value: 0 }, uVel: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) }, uShock: { value: new THREE.Vector3(99, 99, 0) }, uShockAge: { value: 10 },
    uSize: { value: 28 * dpr },
  },
  vertexShader: /* glsl */ `
    ${NOISE}
    uniform float uTime, uMorph, uIntro, uSize, uVel, uShockAge; uniform vec3 uMouse, uShock;
    attribute vec3 aB, aC, aD, aE, aF, aCol; attribute float aRnd;
    varying vec3 vCol; varying float vAlpha;
    float st(float k){ return smoothstep(0., 1., clamp((uMorph - k) * 1.3 - aRnd * .3, 0., 1.)); }
    void main(){
      vec3 p = mix(position, aB, st(0.));
      p = mix(p, aC, st(1.));
      p = mix(p, aD, st(2.));
      p = mix(p, aE, st(3.));
      p = mix(p, aF, st(4.));
      p *= mix(6.0 + aRnd * 6.0, 1.0, uIntro);
      float n = snoise(p * .45 + uTime * .15);
      p += normalize(p + .0001) * n * (.22 + uVel * .9);          // shape breathes harder while scrolling
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      vec3 d = mv.xyz - uMouse; float dl = length(d.xy);
      mv.xy += normalize(d.xy + .0001) * smoothstep(1.6, 0., dl) * .9;
      vec2 sd = mv.xy - uShock.xy; float sl = length(sd);          // click shockwave
      float wave = smoothstep(.9, 0., abs(sl - uShockAge * 5.)) * exp(-uShockAge * 2.2);
      mv.xy += normalize(sd + .0001) * wave * 1.4;
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * (.35 + aRnd * .9) * (1. + wave * 1.5) / -mv.z;
      vCol = aCol; vAlpha = (.45 + n * .5 + wave) * uIntro;
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vCol; varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - .5);
      float a = smoothstep(.5, .0, d);
      gl_FragColor = vec4(vCol * (1. + a), a * a * vAlpha);
    }`,
});
const points = new THREE.Points(pGeo, pMat);
world.add(points);

// ---- liquid blob (desktop only; detail 40 looks identical to 96 at this size, at a fraction of the cost)
const blobMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: { uTime: { value: 0 }, uAmp: { value: 0.35 }, uAlpha: { value: 0 } },
  vertexShader: /* glsl */ `
    ${NOISE}
    uniform float uTime, uAmp; varying vec3 vN; varying vec3 vV; varying float vD;
    void main(){
      float d = snoise(normal * 1.4 + uTime * .35) * uAmp + snoise(normal * 3.5 - uTime * .2) * uAmp * .3;
      vec3 p = position + normal * d; vD = d;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform float uTime, uAlpha; varying vec3 vN; varying vec3 vV; varying float vD;
    void main(){
      float f = pow(1. - max(dot(vN, vV), 0.), 2.2);
      vec3 a = vec3(.545,.361,.965), b = vec3(.133,.827,.933), c = vec3(.957,.447,.714);
      float t = vD * 2.2 + f * 1.5 + uTime * .1;
      vec3 col = mix(a, b, .5 + .5 * sin(t * 3.)); col = mix(col, c, .5 + .5 * sin(t * 2. + 2.));
      gl_FragColor = vec4(col * (.12 + f * 1.4), (.25 + f) * uAlpha);
    }`,
});
const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, isMobile ? 16 : 40), blobMat);
world.add(blob);

{ // background dust
  const n = 1200, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) a[i] = (Math.random() - 0.5) * 60;
  g.setAttribute("position", new THREE.BufferAttribute(a, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.03, color: 0x9a94b8, transparent: true, opacity: 0.5, depthWrite: false })));
}

// ---- floating maths symbols in 3D space (built after fonts load, see makeSymbols)
const symbols = [];
const symGroup = new THREE.Group();
scene.add(symGroup);
const symState = { alpha: 0 };
function makeSymbols() {
  const glyphs = ["∑", "∫", "π", "√", "Δ", "∞", "θ", "λ", "x²", "dy/dx", "e^x", "≠", "sin", "∂"];
  const tints = ["#8b5cf6", "#22d3ee", "#f472b6", "#ffffff"];
  const cache = {};
  const texFor = (g) => cache[g] || (cache[g] = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    x.font = `700 ${g.length > 3 ? 34 : g.length > 1 ? 50 : 78}px "Space Grotesk", sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = "#fff"; x.shadowBlur = 12; x.fillStyle = "#fff";
    x.fillText(g, 64, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })());
  const n = isMobile ? 10 : 22;
  for (let i = 0; i < n; i++) {
    const mat = new THREE.SpriteMaterial({ map: texFor(glyphs[i % glyphs.length]), color: tints[i % 4], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(mat);
    const scale = 0.7 + Math.random() * 1.1;
    s.scale.set(scale, scale, 1);
    s.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, -3 - Math.random() * 10);
    s.userData = { vy: 0.15 + Math.random() * 0.25, vr: (Math.random() - 0.5) * 0.4, base: 0.18 + Math.random() * 0.3, ph: Math.random() * 6.28 };
    symGroup.add(s);
    symbols.push(s);
  }
}

// sample the pixels of a word into particle targets
function buildTextShape(str, width) {
  const W = 1024, H = 512, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = '700 380px "Space Grotesk", sans-serif';
  x.fillText(str, W / 2, H / 2 + 20);
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += 3) for (let X = 0; X < W; X += 3) if (d[(y * W + X) * 4 + 3] > 128) pts.push(X, y);
  if (!pts.length) return;
  let minX = W, maxX = 0;
  for (let k = 0; k < pts.length; k += 2) { minX = Math.min(minX, pts[k]); maxX = Math.max(maxX, pts[k]); }
  const sc = width / Math.max(1, maxX - minX), cxm = (minX + maxX) / 2, n = pts.length / 2;
  for (let i = 0; i < COUNT; i++) {
    const k = ((Math.random() * n) | 0) * 2;
    F[i * 3] = (pts[k] - cxm) * sc;
    F[i * 3 + 1] = -(pts[k + 1] - H / 2 - 20) * sc;
    F[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  }
  pGeo.attributes.aF.needsUpdate = true;
}
const sceneState = PAGE === "tuition"
  ? { morph: 5, rotX: 0, x: isMobile ? 0 : 2.7, y: isMobile ? 1.2 : 0, z: 0, blobScale: 0 }
  : { morph: 0, rotX: 0, x: isMobile ? 0 : 2.6, y: 0, z: 0, blobScale: isMobile ? 0 : 1.5 };
if (isMobile) blob.visible = false;
const mouse = { x: 0, y: 0, tx: 0, ty: 0, seen: false };
addEventListener("pointermove", (e) => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = -(e.clientY / innerHeight) * 2 + 1;
  mouse.seen = true;
}, { passive: true });

// click anywhere: ripple through the grid + shockwave through the particles
addEventListener("pointerdown", (e) => {
  if (reduce) return;
  bgMat.uniforms.uRipple.value.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
  bgMat.uniforms.uRippleT.value = bgMat.uniforms.uTime.value;
  pMat.uniforms.uShock.value.copy(pMat.uniforms.uMouse.value);
  motion.shockT = clock.getElapsedTime();
}, { passive: true });

// HUD: names the shape currently on screen
const hudFn = $("#hudFn"), hudIdx = $("#hudIdx");
let hudShape = 0;
function updateHud(k) {
  if (k === hudShape) return;
  hudShape = k;
  gsap.timeline()
    .to(hudFn, { yPercent: -80, opacity: 0, duration: 0.2, ease: "power2.in" })
    .call(() => { hudIdx.textContent = SHAPES[k][0]; hudFn.textContent = SHAPES[k][1]; })
    .fromTo(hudFn, { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
}

// ---- adaptive quality: drop resolution if frames get slow, raise it back when there's headroom
const applyDpr = () => {
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  syncBgRes();
  pMat.uniforms.uSize.value = 28 * dpr;
};
const perf = { frames: 0, acc: 0, last: performance.now(), warm: performance.now() + 3000 };
function watchPerf() {
  const now = performance.now(), dt = now - perf.last;
  perf.last = now;
  if (now < perf.warm || dt > 250) return;          // ignore the loader and tab switches
  perf.acc += dt; perf.frames++;
  if (perf.frames < 90) return;
  const avg = perf.acc / perf.frames;
  perf.frames = 0; perf.acc = 0;
  if (avg > 21 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); applyDpr(); }
  else if (avg < 12 && dpr < DPR_MAX) { dpr = Math.min(DPR_MAX, dpr + 0.25); applyDpr(); }
}

// ---- one render loop, driven by GSAP's ticker (same frame as Lenis + ScrollTrigger)
const clock = new THREE.Clock(), ndc = new THREE.Vector3(), tmp = new THREE.Vector3();
let prevScroll = scrollY, spin = 0;
function render() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  watchPerf();

  // scroll speed (0 = still, ~1 = flicking through sections)
  const sy = scrollY, rawV = lenis ? Math.abs(lenis.velocity) / 45 : Math.abs(sy - prevScroll) / 45;
  if (sy !== prevScroll) motion.dir = sy > prevScroll ? 1 : -1;
  prevScroll = sy;
  motion.vel += (Math.min(rawV, 1.5) - motion.vel) * 0.08;
  const v = reduce ? 0 : motion.vel;

  mouse.x += (mouse.tx - mouse.x) * 0.06;
  mouse.y += (mouse.ty - mouse.y) * 0.06;
  scrollSmooth += (sy / maxScroll - scrollSmooth) * 0.08;

  const bu = bgMat.uniforms;
  bu.uTime.value = reduce ? 0 : t;
  bu.uScroll.value = scrollSmooth;
  bu.uVel.value = v;
  bu.uDir.value = motion.dir;
  bu.uMouse.value.set((mouse.x + 1) / 2, (mouse.y + 1) / 2);

  const pu = pMat.uniforms;
  pu.uTime.value = t;
  pu.uMorph.value = sceneState.morph;
  pu.uVel.value = v;
  pu.uShockAge.value = t - motion.shockT;
  blobMat.uniforms.uTime.value = t;
  updateHud(Math.round(sceneState.morph));

  if (mouse.seen) {
    ndc.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const dist = (camera.position.z - world.position.z) / -ndc.z;
    tmp.copy(camera.position).add(ndc.multiplyScalar(dist));
    pu.uMouse.value.copy(tmp.applyMatrix4(camera.matrixWorldInverse));
  }

  spin += dt * (0.06 + v * 0.9) * motion.dir;
  world.position.set(sceneState.x, sceneState.y, sceneState.z);
  const tw = Math.min(1, Math.max(0, sceneState.morph - 4));
  points.rotation.y = (spin + mouse.x * 0.3) * (1 - tw) + mouse.x * 0.35 * tw;
  points.rotation.x = (sceneState.rotX + mouse.y * 0.15) * (1 - tw) - mouse.y * 0.2 * tw;
  if (blob.visible = sceneState.blobScale > 0.01) {
    blob.rotation.y = t * 0.1;
    blob.scale.setScalar(sceneState.blobScale);
  }

  // symbols drift upwards, rush past while scrolling, wrap around
  for (const s of symbols) {
    const u = s.userData;
    s.position.y += (u.vy + v * 9 * motion.dir) * dt;
    if (s.position.y > 8) s.position.y = -8;
    if (s.position.y < -8) s.position.y = 8;
    s.material.rotation += u.vr * dt;
    s.material.opacity = symState.alpha * (u.base + Math.sin(t * 0.8 + u.ph) * 0.08 + v * 0.25);
  }
  symGroup.position.x = -mouse.x * 0.6;
  symGroup.position.y = -mouse.y * 0.4;

  // warp: widen the lens a touch at speed
  camera.fov = 45 + v * 9;
  camera.updateProjectionMatrix();
  camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.05;
  camera.position.y += (mouse.y * 0.3 - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}
gsap.ticker.add(render);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  syncBgRes();
});

/* ==================================================================
   Loader → intro
================================================================== */
const count = { v: 0 };
const statuses = ["Sharpening pencils", "Expanding brackets", "Differentiating", "Checking the mark scheme", "Ready"];
const ready = Promise.all([
  document.fonts?.ready ?? Promise.resolve(),
  new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r))),
]);
const loadTl = gsap.timeline();
loadTl
  .to(".loader__word .ch", { y: 0, duration: 0.7, stagger: 0.025, ease: "expo.out" })
  .to(count, {
    v: 100, duration: reduce ? 0.3 : 1.3, ease: "power2.inOut",
    onUpdate() {
      const v = Math.round(count.v);
      $("#loaderCount").textContent = v;
      $("#loaderBar").style.transform = `scaleX(${count.v / 100})`;
      $("#loaderStatus").textContent = statuses[Math.min(4, Math.floor(v / 25))];
    },
  }, 0.2);
const ptIn = document.documentElement.classList.contains("pt-in");
if (ptIn) {
  loadTl.kill();
  $("#loader")?.remove();
  ready.then(() => {
    document.body.classList.remove("is-loading");
    buildTextShape(PAGE === "tuition" ? "A*" : "JM", PAGE === "tuition" ? 5.2 : 4.2);
    intro();
    lenis?.start();
    ScrollTrigger.refresh();
    const target = location.hash && $(location.hash);
    if (target) lenis ? lenis.scrollTo(target, { immediate: true, force: true }) : target.scrollIntoView();
    revealPage();
  });
} else {
  Promise.all([ready, loadTl.then()]).then(() => {
    buildTextShape(PAGE === "tuition" ? "A*" : "JM", PAGE === "tuition" ? 5.2 : 4.2);
    intro();
  });
}

function intro() {
  const tl = gsap.timeline({
    onComplete() {
      $("#loader")?.remove();
      document.body.classList.remove("is-loading");
      lenis?.start();
      ScrollTrigger.refresh();
    },
  });
  tl.to(".loader__inner", { y: -40, opacity: 0, duration: 0.6, ease: "power3.in" })
    .to(".loader__panel--top", { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "-=0.1")
    .to(".loader__panel--bot", { yPercent: 100, duration: 1.1, ease: "expo.inOut" }, "<")
    .to(pMat.uniforms.uIntro, { value: 1, duration: 2.6, ease: "expo.out" }, "<0.2")
    .to(bgMat.uniforms.uIntro, { value: 1, duration: 2.2, ease: "power2.out" }, "<")
    .call(makeSymbols, null, "<")
    .to(symState, { alpha: 1, duration: 2.5, ease: "power2.out" }, "<0.3")
    .from("#dots button", { x: 30, opacity: 0, duration: 0.8, stagger: 0.04, ease: "expo.out" }, "<0.6")
    .call(() => scramble($(".hero .eyebrow")), null, "<0.6")
    .to(blobMat.uniforms.uAlpha, { value: 1, duration: 2, ease: "power2.out" }, "<0.4")
    .from(".hero__title .ch", { yPercent: 120, rotate: 12, duration: 1.3, stagger: 0.03, ease: "expo.out" }, "<0.1")
    .from(".hero-fade", { y: 30, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out" }, "<0.4")
    .to("#portraitFrame", { clipPath: "inset(0% 0 0 0 round 28px)", duration: 1.5, ease: "expo.inOut" }, "<-0.3")
    .to("#portraitFrame img", { scale: 1, duration: 2, ease: "expo.out" }, "<0.3")
    .from(".portrait__name", { y: 20, opacity: 0, duration: 1, ease: "expo.out" }, "<0.5")
    .from(".portrait__badge", { scale: 0, opacity: 0, duration: 0.9, stagger: 0.15, ease: "back.out(2)" }, "<0.2")
    .fromTo(".nav", { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out" }, "<")
    .from(".hud", { opacity: 0, y: 20, duration: 1, ease: "expo.out" }, "<0.2")
    .from(".hero__scroll", { opacity: 0, duration: 1 }, "<0.3");
  setupScroll();
}

/* ==================================================================
   Scroll choreography
================================================================== */
function setupScroll() {
  // pinned sections first, so every trigger below them measures the extra pin space
  setupCarousel();

  gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  const nav = $("#nav");
  let navHidden = false;
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (s) => {
      const hide = s.direction === 1 && s.scroll() > 400;
      if (hide !== navHidden) {
        navHidden = hide;
        gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.6, ease: "expo.out", overwrite: "auto" });
      }
      nav.classList.toggle("is-solid", s.scroll() > 80);
    },
  });

  // 3D: walk through the five shapes across the page
  const sideL = isMobile ? 0 : -2.4, sideR = isMobile ? 0 : 2.4;
  const walk = gsap.timeline({ scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: 1.2 }, defaults: { ease: "none" } });
  if (PAGE === "tuition") {
    walk.to(sceneState, { x: 0, y: -0.3, morph: 4, rotX: 0.9, duration: 1 })
      .to(sceneState, { x: sideL, y: 0, morph: 3, rotX: 0.55, duration: 1 })
      .to(sceneState, { x: sideR, morph: 2, rotX: 0.55, duration: 1 })
      .to(sceneState, { x: 0, morph: 1, rotX: 0.4, duration: 1 })
      .to(sceneState, { morph: 0, z: 1.5, rotX: 0.2, duration: 1 });
  } else {
    walk.to(sceneState, { x: 0, blobScale: 0, morph: 1, rotX: 0.4, duration: 1 })
      .to(sceneState, { x: sideL, morph: 2, rotX: 0.55, duration: 1 })
      .to(sceneState, { x: sideR, morph: 3, rotX: 0.6, duration: 1 })
      .to(sceneState, { x: 0, y: -0.4, morph: 4, rotX: 1.05, duration: 1 })
      .to(sceneState, { y: 0.4, z: -2.5, morph: 5, rotX: 0, duration: 1 });
  }

  // depth between panels: the section you're leaving eases back, shrinks and dims
  if (!reduce) {
    $$("main > section.sec:not(.show)").forEach((sec) => {
      const inner = sec.querySelector(":scope > .wrap");
      if (!inner) return;
      gsap.fromTo(inner, { yPercent: 0, scale: 1, opacity: 1, rotationX: 0 }, {
        yPercent: -8, scale: 0.9, opacity: 0.1, rotationX: 16, transformPerspective: 1400, transformOrigin: "50% 100%", ease: "none",
        scrollTrigger: { trigger: sec, start: "bottom 85%", end: "bottom 15%", scrub: true },
      });
    });
  }

  // hero parallax out
  gsap.to(".hero__title", { yPercent: -35, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to("#portrait", { yPercent: 22, scale: 0.92, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // marquee skews with scroll speed
  const track = $(".marquee__track");
  const skewTo = gsap.quickTo(track, "skewX", { duration: 0.6, ease: "power3" });
  ScrollTrigger.create({ onUpdate: (s) => { skewTo(gsap.utils.clamp(-12, 12, s.getVelocity() / -250)); gsap.delayedCall(0.15, () => skewTo(0)); } });

  // about: words light up as you scroll
  // (time-based, not scroll-scrubbed: a snapped panel never scrolls "through" its own content)
  if ($("#aboutText")) gsap.to(splitWords($("#aboutText")), { opacity: 1, duration: 0.5, stagger: 0.07, ease: "power2.out", scrollTrigger: { trigger: "#aboutText", start: "top 80%" } });

  // headings
  $$(".reveal-line > span").forEach((el) =>
    gsap.from(el, { yPercent: 110, rotate: 4, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } })
  );
  $$("main section:not(.hero) .eyebrow, .reveal").forEach((el) =>
    gsap.from(el, { opacity: 0, x: -30, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } })
  );
  $$("main section:not(.hero) .eyebrow").forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: () => scramble(el) })
  );

  // quiz + FAQ entrances
  gsap.from("#quizBox", { y: 80, opacity: 0, scale: 0.96, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: "#quizBox", start: "top 88%" } });
  gsap.from(".faq__item", { y: 30, opacity: 0, duration: 0.9, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: "#faqList", start: "top 85%" } });

  // mobile booking bar: visible between the hero and the contact section
  const mbar = $("#mbar");
  ScrollTrigger.create({
    trigger: ".hero", start: "bottom 70%", endTrigger: "#contact", end: "top 85%",
    onToggle: (s) => mbar.classList.toggle("is-on", s.isActive),
  });

  // stats
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" }, onUpdate: () => (el.textContent = o.v.toFixed(dec)) });
  });
  gsap.from(".stat", { y: 60, opacity: 0, duration: 1.1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".stats", start: "top 85%" } });

  // chart
  gsap.from("#chart", { y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "#chart", start: "top 90%" } });
  if ($("#chart")) ScrollTrigger.create({ trigger: "#chart", start: "top 75%", once: true, onEnter: () => drawChart(currentSet, true) });

  // subjects
  $$(".subject").forEach((s) => {
    gsap.from(s, { y: 80, opacity: 0, rotateX: -12, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 88%" } });
    gsap.from(s.querySelectorAll("li"), { x: -30, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 70%" } });
  });

  setupWorked();

  // timeline
  gsap.to("#tlFill", { scaleY: 1, duration: 1.8, ease: "power2.inOut", scrollTrigger: { trigger: "#timeline", start: "top 80%" } });
  $$(".tl").forEach((el) => gsap.from(el, { x: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } }));

  gsap.from(".quote", { y: 80, opacity: 0, rotate: 2, duration: 1.2, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: ".quotes", start: "top 82%" } });
  gsap.from(".format", { y: 80, opacity: 0, duration: 1.2, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: ".formats", start: "top 82%" } });

  gsap.from(".contact__big", { yPercent: 40, scale: 0.85, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".contact", start: "top 75%" } });
  gsap.from(".contact__cta .btn, .contact__info > div", { y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".contact__cta", start: "top 92%" } });
}

/* ---------- section 4: 3D carousel, cards on a spinning cylinder ---------- */
function setupCarousel() {
  if (!$("#showTrack")) return;
  const ring = $("#showTrack"), cards = $$(".card", ring), N = cards.length, STEP = 360 / N;
  const now = $("#cardNow"), bar = $("#cardBar");
  const state = { rot: 0 };
  let R = 400, front = -1;
  const layout = () => {
    R = (cards[0].offsetWidth / 2) / Math.tan(Math.PI / N) + 60;
    cards.forEach((c, i) => (c.style.transform = `rotateY(${i * STEP}deg) translateZ(${R}px)`));
    apply();
  };
  const apply = () => {
    ring.style.transform = `translateZ(${-R}px) rotateY(${state.rot}deg)`;
    let best = 0, bestCos = -2;
    cards.forEach((c, i) => {
      let a = (i * STEP + state.rot) % 360;
      if (a > 180) a -= 360; if (a < -180) a += 360;
      const f = Math.cos((a * Math.PI) / 180);
      c.style.opacity = (0.12 + 0.88 * Math.pow(Math.max(f, 0), 1.6)).toFixed(3);
      if (f > bestCos) { bestCos = f; best = i; }
    });
    if (best !== front) {
      cards[front]?.classList.remove("is-front");
      cards[best].classList.add("is-front");
      front = best;
      now.textContent = String(best + 1).padStart(2, "0");
      gsap.fromTo(cards[best].querySelector(".card__sym"), { rotateY: -90, opacity: 0 }, { rotateY: 0, opacity: 1, duration: 0.9, ease: "expo.out", overwrite: true });
    }
  };
  const tween = gsap.to(state, {
    rot: -(N - 1) * STEP, ease: "none", onUpdate: apply,
    scrollTrigger: {
      trigger: "#method", pin: "#showPin", start: "top top", end: () => "+=" + innerHeight * 0.9 * (N - 1),
      scrub: true, invalidateOnRefresh: true,
      onUpdate: (st) => (bar.style.transform = `scaleX(${st.progress})`),
    },
  });
  // click a side card to spin it to the front
  cards.forEach((c, i) => c.addEventListener("click", (e) => {
    if (i === front || e.target.closest("a")) return;
    const st = tween.scrollTrigger, y = st.start + ((st.end - st.start) * i) / (N - 1);
    lenis ? snapTo(y, 1) : scrollTo({ top: y, behavior: "smooth" });
  }));
  ScrollTrigger.addEventListener("refresh", layout);
  layout();
}

/* ---------- worked example: board lines + parabola drawn on scroll ---------- */
function setupWorked() {
  if (!$("#parab")) return;
  const svg = $("#parab");
  const X = (x) => 30 + ((x + 1.5) / 6) * 370;
  const Y = (y) => 20 + ((10 - y) / 17.5) * 300;
  const g = svgEl("g", { class: "grid" }, svg);
  for (let x = -1; x <= 4; x++) svgEl("line", { x1: X(x), y1: Y(10), x2: X(x), y2: Y(-7.5) }, g);
  for (let y = -6; y <= 10; y += 2) svgEl("line", { x1: X(-1.5), y1: Y(y), x2: X(4.5), y2: Y(y) }, g);
  svgEl("line", { x1: X(-1.5), y1: Y(0), x2: X(4.5), y2: Y(0), class: "ax" }, svg);
  svgEl("line", { x1: X(0), y1: Y(10), x2: X(0), y2: Y(-7.5), class: "ax" }, svg);
  svgEl("text", { x: X(4.5) - 8, y: Y(0) - 8 }, svg).textContent = "x";
  svgEl("text", { x: X(0) + 8, y: Y(10) + 10 }, svg).textContent = "y";
  const sym = svgEl("line", { x1: X(1.25), y1: Y(9), x2: X(1.25), y2: Y(-6.125), stroke: "rgba(244,114,182,.45)", "stroke-dasharray": "4 5" }, svg);

  let d = "";
  for (let i = 0; i <= 120; i++) {
    const x = -1.3 + (i / 120) * 5.2, y = 2 * x * x - 5 * x - 3;
    d += (i ? "L" : "M") + X(x).toFixed(2) + " " + Y(y).toFixed(2);
  }
  const path = svgEl("path", { d, class: "curve" }, svg);
  const pl = path.getTotalLength();
  gsap.set(path, { strokeDasharray: pl, strokeDashoffset: pl });

  const r1 = svgEl("circle", { cx: X(-0.5), cy: Y(0), r: 6, class: "root" }, svg);
  const r2 = svgEl("circle", { cx: X(3), cy: Y(0), r: 6, class: "root" }, svg);
  const vx = svgEl("circle", { cx: X(1.25), cy: Y(-6.125), r: 5, class: "vx" }, svg);
  const t1 = svgEl("text", { x: X(-0.5) - 62, y: Y(0) - 10, class: "rl" }, svg); t1.textContent = "x = −½";
  const t2 = svgEl("text", { x: X(3) + 10, y: Y(0) + 22, class: "rl" }, svg); t2.textContent = "x = 3";
  const t3 = svgEl("text", { x: X(1.25) + 10, y: Y(-6.125) + 4 }, svg); t3.textContent = "(1.25, −6.125)";

  gsap.from(".worked__board, .worked__plot", { y: 80, opacity: 0, duration: 1.2, stagger: 0.15, ease: "expo.out", scrollTrigger: { trigger: "#worked", start: "top 88%" } });
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
  ScrollTrigger.create({ trigger: "#worked", start: "top 80%", once: true, onEnter: () => tl.timeScale(1.4).play() });
  $$(".worked__line").forEach((ln, i) => {
    tl.from(ln.querySelector(".eq"), { clipPath: "inset(0 100% 0 0)", duration: 1, ease: "none" }, i * 1.1)
      .from(ln.querySelector(".note"), { x: 20, opacity: 0, duration: 0.6 }, i * 1.1 + 0.6);
  });
  tl.to(path, { strokeDashoffset: 0, duration: 3.2, ease: "none" }, 0.4)
    .from(sym, { opacity: 0, duration: 0.6 }, 2.6)
    .from([vx, t3], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 2.4)
    .from([r1, t1], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 3.4)
    .from([r2, t2], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 3.7);
}

/* ==================================================================
   Grade chart
================================================================== */
const DATA = {
  maths: { label: "Mathematics", grades: [["A*", 7], ["A", 11], ["B", 9], ["C", 6], ["D", 3], ["E/U", 2]] },
  add:   { label: "Add Maths",   grades: [["A*", 6], ["A", 8], ["B", 7], ["C", 3], ["D", 1], ["E/U", 1]] },
};
const AXIS_MAX = 0.4;
const rowsEl = $("#chartRows"), tip = $("#tip");
if (rowsEl) DATA.maths.grades.forEach(([g]) => {
  const row = document.createElement("div");
  row.className = "chart__row";
  row.innerHTML = `<span class="chart__grade">${g}</span><div class="chart__track"><div class="chart__bar"></div></div><span class="chart__val">0%</span>`;
  rowsEl.appendChild(row);
});
let currentSet = "maths", chartShown = false;
function drawChart(key, first) {
  currentSet = key;
  chartShown = true;
  const set = DATA[key], total = set.grades.reduce((a, [, n]) => a + n, 0);
  $("#chartSub").textContent = `${set.label} · ${total} students`;
  $$(".chart__row").forEach((row, i) => {
    const [g, n] = set.grades[i], share = n / total;
    row.dataset.tip = `<b>Grade ${g}</b> · ${n} of ${total} students (${Math.round(share * 100)}%)`;
    gsap.to(row.querySelector(".chart__bar"), { scaleX: share / AXIS_MAX, duration: first ? 1.5 : 0.9, delay: (first ? 0.08 : 0.03) * i, ease: "expo.out" });
    const val = row.querySelector(".chart__val"), o = { v: +(val.dataset.v || 0) };
    gsap.to(o, { v: share * 100, duration: 1, ease: "power3.out", onUpdate: () => { val.innerHTML = `${Math.round(o.v)}% <span>(${n})</span>`; val.dataset.v = o.v; } });
  });
  $("#chartTable").innerHTML =
    `<table><thead><tr><th>Grade</th><th>Students</th><th>Share</th></tr></thead><tbody>` +
    set.grades.map(([g, n]) => `<tr><td>${g}</td><td>${n}</td><td>${Math.round((n / total) * 100)}%</td></tr>`).join("") +
    `</tbody></table>`;
}
$$(".chart__tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    $$(".chart__tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
    drawChart(b.dataset.set, !chartShown);
  })
);
$("#tableToggle")?.addEventListener("click", (e) => {
  const t = $("#chartTable"), open = t.hidden;
  t.hidden = !open;
  e.currentTarget.setAttribute("aria-expanded", open);
  e.currentTarget.textContent = open ? "Hide table" : "View as table";
  ScrollTrigger.refresh();
});
rowsEl?.addEventListener("pointermove", (e) => {
  const row = e.target.closest(".chart__row");
  if (!row || !row.dataset.tip) return tip.classList.remove("is-on");
  tip.innerHTML = row.dataset.tip;
  tip.style.left = e.clientX + "px";
  tip.style.top = e.clientY + "px";
  tip.classList.add("is-on");
});
rowsEl?.addEventListener("pointerleave", () => tip.classList.remove("is-on"));

/* ==================================================================
   Interaction: cursor, magnets, portrait tilt, spotlight, typed text
================================================================== */
if (finePointer) {
  const cursor = $("#cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring");
  const dx = gsap.quickTo(dot, "x", { duration: 0.1 }), dy = gsap.quickTo(dot, "y", { duration: 0.1 });
  const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
  addEventListener("pointermove", (e) => { cursor.style.opacity = 1; dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
  document.addEventListener("pointerover", (e) => cursor.classList.toggle("is-hover", !!e.target.closest("a, button, .card, .stat, .chart__row")));

  $$("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.35);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });

  const card = $("#portraitCard"), host = $("#portrait");
  if (card) {
    const holo = document.createElement("i");
    holo.className = "holo";
    $("#portraitFrame").after(holo);
    const tX = gsap.quickTo(card, "rotationY", { duration: 0.8, ease: "power3" });
    const tY = gsap.quickTo(card, "rotationX", { duration: 0.8, ease: "power3" });
    addEventListener("pointermove", (e) => {
      if (scrollY > innerHeight) return;
      const r = host.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tX(gsap.utils.clamp(-18, 18, (px - 0.5) * 22));
      tY(gsap.utils.clamp(-18, 18, -(py - 0.5) * 22));
      card.style.setProperty("--hx", px * 100 + "%");
      card.style.setProperty("--hy", py * 100 + "%");
    });
  }
}
$$(".stat").forEach((s) =>
  s.addEventListener("pointermove", (e) => {
    const r = s.getBoundingClientRect();
    s.style.setProperty("--mx", `${e.clientX - r.left}px`);
    s.style.setProperty("--my", `${e.clientY - r.top}px`);
  })
);

{ // typed topic
  const el = $("#typed");
  const words = ["differentiation", "logarithms", "vectors", "trig identities", "integration", "quadratics"];
  let w = 0;
  const type = (word) => {
    const tl = gsap.timeline({ onComplete: () => { w = (w + 1) % words.length; setTimeout(() => type(words[w]), 1600); } });
    const cur = el.textContent;
    for (let i = cur.length; i >= 0; i--) tl.call(() => (el.textContent = cur.slice(0, i)), null, (cur.length - i) * 0.03);
    const base = cur.length * 0.03 + 0.2;
    for (let i = 1; i <= word.length; i++) tl.call(() => (el.textContent = word.slice(0, i)), null, base + i * 0.06);
  };
  if (!reduce && el) setTimeout(() => { w = 1; type(words[1]); }, 5200);
}

/* ==================================================================
   Text scramble: labels resolve out of maths symbols
================================================================== */
function scramble(el) {
  if (!el || reduce) return;
  const GLYPHS = "∑∫πΔ√∞θλμσ≈≠±÷×∂";
  const final = el.dataset.text || (el.dataset.text = el.textContent);
  const o = { p: 0 };
  gsap.to(o, {
    p: 1, duration: 0.9, ease: "power2.out",
    onUpdate() {
      const k = Math.floor(o.p * final.length);
      let s = final.slice(0, k);
      for (let i = k; i < final.length; i++) s += /\s/.test(final[i]) ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = s;
    },
    onComplete: () => (el.textContent = final),
  });
}

/* ==================================================================
   Quiz
================================================================== */
if ($("#quizStage")) {
  const QUIZ = [
    { q: "If log<sub>2</sub> x = 5, what is x?", opts: ["10", "25", "32", "7"], a: 2,
      why: "<strong>log₂ x = 5 means 2⁵ = x.</strong> So x = 32. Logs are just powers asked backwards." },
    { q: "Differentiate y = 3x<sup>4</sup>.", opts: ["12x³", "3x³", "12x⁴", "4x³"], a: 0,
      why: "<strong>Bring the power down, then drop it by one:</strong> 3 × 4 × x³ = 12x³." },
    { q: "How many real roots does x<sup>2</sup> + 4x + 5 = 0 have?", opts: ["Two", "One", "None", "Infinitely many"], a: 2,
      why: "<strong>b² − 4ac = 16 − 20 = −4.</strong> A negative discriminant means the curve never touches the x-axis." },
  ];
  const stage = $("#quizStage"), dots = $$("#quizDots i"), countEl = $("#quizCount"), burstEl = $("#quizBurst"), box = $("#quizBox");
  let idx = 0, score = 0;

  const burst = (fromEl, n = 16) => {
    if (reduce) return;
    const b = box.getBoundingClientRect(), r = fromEl.getBoundingClientRect();
    const cx = r.left - b.left + r.width / 2, cy = r.top - b.top + r.height / 2;
    const sym = "∑∫π√∞Δθ✓+=";
    const colors = ["#8b5cf6", "#22d3ee", "#f472b6", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.textContent = sym[(Math.random() * sym.length) | 0];
      s.style.left = cx + "px"; s.style.top = cy + "px"; s.style.color = colors[i % 4];
      burstEl.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160;
      gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 },
        { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, scale: 1 + Math.random(), rotate: (Math.random() - 0.5) * 180, opacity: 0, duration: 1.2 + Math.random() * 0.6, ease: "expo.out", onComplete: () => s.remove() });
    }
  };

  const setDots = () => dots.forEach((d, i) => { d.classList.toggle("is-done", i < idx); d.classList.toggle("is-now", i === idx); });

  const swap = (render) => {
    const kids = [...stage.children];
    if (!kids.length) { render(); return; }
    gsap.to(kids, { y: -24, opacity: 0, duration: 0.35, stagger: 0.04, ease: "power2.in", onComplete: () => { render(); ScrollTrigger.refresh(); } });
  };

  function showQuestion() {
    const item = QUIZ[idx];
    setDots();
    countEl.textContent = `Question ${idx + 1} of ${QUIZ.length}`;
    swap(() => {
      stage.innerHTML = `<h3 class="quiz__q">${item.q}</h3><div class="quiz__opts">${item.opts
        .map((o, i) => `<button class="quiz__opt" data-i="${i}"><b>${"ABCD"[i]}</b>${o}</button>`).join("")}</div>`;
      gsap.from(".quiz__q", { y: 30, opacity: 0, duration: 0.8, ease: "expo.out" });
      gsap.from(".quiz__opt", { y: 30, opacity: 0, duration: 0.7, stagger: 0.06, delay: 0.1, ease: "expo.out" });
      $$(".quiz__opt", stage).forEach((btn) => btn.addEventListener("click", () => answer(btn)));
    });
  }

  function answer(btn) {
    const item = QUIZ[idx], pick = +btn.dataset.i, opts = $$(".quiz__opt", stage);
    opts.forEach((o) => (o.disabled = true));
    opts[item.a].classList.add("is-right");
    if (pick === item.a) { score++; burst(btn); } else btn.classList.add("is-wrong");
    const last = idx === QUIZ.length - 1;
    const why = document.createElement("div");
    why.innerHTML = `<p class="quiz__why">${item.why}</p><button class="btn btn--fill quiz__next"><span>${last ? "See my score" : "Next question"}</span><span>→</span></button>`;
    stage.appendChild(why);
    gsap.from(why.children, { y: 20, opacity: 0, duration: 0.7, stagger: 0.1, ease: "expo.out" });
    why.querySelector(".quiz__next").addEventListener("click", () => { idx++; last ? showEnd() : showQuestion(); });
  }

  function showEnd() {
    setDots();
    countEl.textContent = "Your score";
    const msg = [
      "That's exactly what the diagnostic paper is for. Every one of these is fixable in a few lessons.",
      "A start. The gaps are usually just one or two habits, and they're quick to fix.",
      "Nearly there. One slip on the day costs a grade, and that's what exam technique fixes.",
      "Full marks. You'd fit straight into the Form V Add Maths group.",
    ][score];
    swap(() => {
      stage.innerHTML = `<div class="quiz__end"><div class="score"><span id="qs">0</span>/${QUIZ.length}</div><p>${msg}</p>
        <div class="row"><a href="#contact" class="btn btn--fill" id="qBook"><span>Book a free trial</span><span>↗</span></a><button class="btn btn--ghost" id="qAgain"><span>Try again</span></button></div></div>`;
      const o = { v: 0 };
      gsap.from(".quiz__end > *", { y: 30, opacity: 0, duration: 0.9, stagger: 0.1, ease: "expo.out" });
      gsap.to(o, { v: score, duration: 1, delay: 0.2, ease: "power2.out", onUpdate: () => ($("#qs").textContent = Math.round(o.v)) });
      if (score === QUIZ.length) gsap.delayedCall(0.9, () => burst($(".quiz__end .score"), 36));
      $("#qBook").addEventListener("click", (e) => { e.preventDefault(); openBook(); });
      $("#qAgain").addEventListener("click", () => { idx = 0; score = 0; showQuestion(); });
    });
  }

  showQuestion();
}

/* ==================================================================
   FAQ accordion
================================================================== */
$$(".faq__q").forEach((b) =>
  b.addEventListener("click", () => {
    const open = b.getAttribute("aria-expanded") === "true";
    $$('.faq__q[aria-expanded="true"]').forEach((o) => {
      if (o === b) return;
      o.setAttribute("aria-expanded", "false");
      gsap.to(o.nextElementSibling, { height: 0, duration: 0.5, ease: "power3.inOut" });
    });
    b.setAttribute("aria-expanded", String(!open));
    gsap.to(b.nextElementSibling, { height: open ? 0 : "auto", duration: 0.6, ease: "power3.inOut", onComplete: () => ScrollTrigger.refresh() });
  })
);
/* ==================================================================
   3D tilt + glare on cards
================================================================== */
if (finePointer && !reduce) {
  $$(".stat, .subject, .chart, .quiz, .worked__board, .worked__plot, .quote, .format, .contact__info > div").forEach((el) => {
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const g = document.createElement("i");
    g.className = "glare";
    el.appendChild(g);
    gsap.set(el, { transformPerspective: 1000 });
    const big = el.matches(".chart, .quiz, .worked__board, .worked__plot");
    const max = big ? 3.5 : 8;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * max * 2);
      rx(-(py - 0.5) * max * 2);
      el.style.setProperty("--gx", px * 100 + "%");
      el.style.setProperty("--gy", py * 100 + "%");
      el.classList.add("is-tilting");
    });
    el.addEventListener("pointerleave", () => { rx(0); ry(0); el.classList.remove("is-tilting"); });
  });
}

/* ==================================================================
   Booking drawer: 3 quick steps → a ready-to-send WhatsApp / email
================================================================== */
const bookEl = $("#book"), bookPanel = $(".book__panel"), bookScrim = $(".book__scrim");
const bookSteps = $$(".book__step"), bookBars = $$(".book__bar i"), bookErr = $("#bookErr");
const bookNext = $("#bookNext"), bookBack = $("#bookBack"), bookForm = $("#bookForm"), bookDone = $("#bookDone");
const booking = {};
let bookStep = 0, bookFocus = null;
const FIELD_LABELS = { form: "Form", syllabus: "Syllabus", format: "Format", day: "Best time" };

function pickChip(group, btn) {
  $$("button", group).forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
  booking[group.dataset.field] = btn.textContent;
}
$$(".chips", bookEl).forEach((g) => {
  const f = g.dataset.field;
  if (FIELD_LABELS[f]) g.insertAdjacentHTML("beforebegin", `<span class="chips__label">${FIELD_LABELS[f]}</span>`);
  $$("button", g).forEach((b) => {
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      pickChip(g, b);
      bookErr.textContent = "";
      gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: "back.out(3)" });
      if (bookStep === 0) setTimeout(() => showBookStep(1, 1), 260);   // one tap is enough on step 1
    });
  });
});

function showBookStep(i, dir = 1) {
  bookStep = i;
  bookBars.forEach((b, k) => b.classList.toggle("is-on", k <= i));
  bookBack.style.visibility = i ? "visible" : "hidden";
  bookNext.querySelector("span").textContent = i === bookSteps.length - 1 ? "Create message" : "Next";
  bookSteps.forEach((st, k) => st.classList.toggle("is-on", k === i));
  bookErr.textContent = "";
  if (!reduce) gsap.fromTo(bookSteps[i].children, { x: 50 * dir, opacity: 0, rotationY: 18 * dir, transformPerspective: 900 },
    { x: 0, opacity: 1, rotationY: 0, duration: 0.7, stagger: 0.05, ease: "expo.out" });
}

function bookProblem() {
  const need = [["subject"], ["form", "syllabus", "format"], ["day"]][bookStep];
  const missing = need.find((k) => !booking[k]);
  if (bookStep === 2) {
    const name = bookForm.name.value.trim(), phone = bookForm.phone.value.replace(/\D/g, "");
    bookForm.name.classList.toggle("is-bad", !name);
    bookForm.phone.classList.toggle("is-bad", phone.length < 7);
    if (!name) return "Add the student's name.";
    if (phone.length < 7) return "That phone number looks too short.";
  }
  return missing ? `Pick a ${FIELD_LABELS[missing]?.toLowerCase() || missing} to continue.` : "";
}

bookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const problem = bookProblem();
  if (problem) {
    bookErr.textContent = problem;
    gsap.fromTo(bookPanel, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    return;
  }
  if (bookStep < bookSteps.length - 1) return showBookStep(bookStep + 1, 1);
  finishBooking();
});
bookBack.addEventListener("click", () => bookStep > 0 && showBookStep(bookStep - 1, -1));

function finishBooking() {
  const name = bookForm.name.value.trim(), phone = bookForm.phone.value.trim();
  const msg = `Hi Mercer Maths! I'd like to book a free trial lesson.

Student: ${name}
Subject: ${booking.subject}
Form: ${booking.form} (${booking.syllabus})
Format: ${booking.format}
Best time: ${booking.day}
Parent's WhatsApp: ${phone}`;
  $("#bookPreview").textContent = msg;
  $("#sendWa").href = "https://wa.me/?text=" + encodeURIComponent(msg);
  $("#sendMail").href = "mailto:hello@mercermaths.example?subject=" + encodeURIComponent("Free trial lesson: " + name) + "&body=" + encodeURIComponent(msg);
  bookBars.forEach((b) => b.classList.add("is-on"));
  gsap.to(bookForm, { opacity: 0, y: -20, duration: 0.3, onComplete: () => {
    bookForm.hidden = true;
    bookDone.hidden = false;
    gsap.from(bookDone.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: "expo.out" });
    gsap.from(".book__tick", { scale: 0, rotate: -180, duration: 1, ease: "back.out(2)" });
  } });
  // celebrate in the background: ripple from the panel
  const r = bookPanel.getBoundingClientRect();
  bgMat.uniforms.uRipple.value.set((r.left + r.width / 2) / innerWidth, 1 - (r.top + r.height / 2) / innerHeight);
  bgMat.uniforms.uRippleT.value = bgMat.uniforms.uTime.value;
}

function openBook(preset) {
  if (ui.book) return;
  ui.book = true;
  bookFocus = document.activeElement;
  // reopened after finishing: start a fresh booking view
  if (bookForm.hidden) { bookForm.hidden = false; bookDone.hidden = true; gsap.set(bookForm, { opacity: 1, y: 0 }); }
  const pre = typeof preset === "string" ? (preset ? { format: preset } : {}) : preset || {};
  Object.entries(pre).forEach(([field, val]) => {
    const g = $(`.chips[data-field="${field}"]`, bookEl), b = g && $$("button", g).find((x) => x.textContent === val);
    if (b) pickChip(g, b);
  });
  bookEl.classList.add("is-open");
  bookEl.setAttribute("aria-hidden", "false");
  lenis?.stop();
  gsap.to(bookScrim, { opacity: 1, duration: 0.5 });
  gsap.fromTo(bookPanel, { xPercent: 110, rotationY: -28, transformPerspective: 1400, transformOrigin: "100% 50%" },
    { xPercent: 0, rotationY: 0, duration: reduce ? 0 : 1, ease: "expo.out" });
  showBookStep(0, 1);
  setTimeout(() => $(".book__step.is-on button, .book__step.is-on input", bookEl)?.focus({ preventScroll: true }), 350);
}
function closeBook() {
  if (!ui.book) return;
  gsap.to(bookScrim, { opacity: 0, duration: 0.4 });
  gsap.to(bookPanel, { xPercent: 110, rotationY: -18, duration: reduce ? 0 : 0.6, ease: "expo.in", onComplete: () => {
    bookEl.classList.remove("is-open");
    bookEl.setAttribute("aria-hidden", "true");
    ui.book = false;
    lenis?.start();
    bookFocus?.focus?.({ preventScroll: true });
  } });
}
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-book]");
  if (trigger) { e.preventDefault(); openBook(trigger.dataset.book || ""); return; }
  if (e.target.closest("[data-close]")) closeBook();
});
addEventListener("keydown", (e) => { if (e.key === "Escape") closeBook(); });

/* ==================================================================
   Page transitions: five glowing bars sweep in, the next page builds out of them
================================================================== */
function revealPage() {
  let label = "";
  try { label = sessionStorage.getItem("pt") || ""; sessionStorage.removeItem("pt"); } catch (e) {}
  $("#ptLabel").textContent = label;
  gsap.timeline({ onComplete: () => document.documentElement.classList.remove("pt-in") })
    .set("#pt i", { scaleY: 1, transformOrigin: "50% 0%" })
    .set("#ptLabel", { opacity: 1, y: 0 })
    .to("#ptLabel", { opacity: 0, y: -50, duration: 0.45, ease: "power3.in" }, 0.15)
    .to("#pt i", { scaleY: 0, duration: 0.95, stagger: 0.07, ease: "expo.inOut" }, 0.3);
}
function leaveTo(url, label) {
  try { sessionStorage.setItem("pt", label); } catch (e) {}
  $("#ptLabel").textContent = label;
  lenis?.stop();
  gsap.timeline({ onComplete: () => (location.href = url) })
    .fromTo("#pt i", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.8, stagger: 0.06, ease: "expo.inOut" })
    .fromTo("#ptLabel", { opacity: 0, y: 70, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out" }, "-=0.35")
    .to({}, { duration: 0.12 });
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-page]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  const url = a.getAttribute("href"), [file, hash] = url.split("#");
  const here = location.pathname.split("/").pop() || "index.html";
  if (file === here) {                                   // same page: just glide
    const t = hash ? $("#" + hash) : 0;
    lenis ? lenis.scrollTo(t, { duration: 1.4, force: true }) : scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  leaveTo(url, a.dataset.page);
});
addEventListener("pageshow", (e) => {                     // back button from the browser cache
  if (!e.persisted) return;
  gsap.set("#pt i", { scaleY: 0 });
  gsap.set("#ptLabel", { opacity: 0 });
  lenis?.start();
});

/* ==================================================================
   Tabs: a pill that slides to whichever tab you point at
================================================================== */
{
  const tabs = $(".tabs"), pill = $(".tabs__pill"), tabEls = $$(".tabs__tab");
  const current = tabEls.find((t) => t.classList.contains("is-current")) || tabEls[0];
  const moveTo = (t, instant) => {
    tabEls.forEach((x) => x.classList.toggle("is-hot", x === t));
    gsap.to(pill, { x: t.offsetLeft - 4, width: t.offsetWidth, duration: instant ? 0 : 0.55, ease: "expo.out" });
  };
  if (tabs && current) {
    const place = () => moveTo(current, true);
    document.fonts?.ready.then(place);
    place();
    addEventListener("resize", place);
    tabEls.forEach((t) => t.addEventListener("pointerenter", () => moveTo(t)));
    tabs.addEventListener("pointerleave", () => moveTo(current));
  }
}

/* ==================================================================
   Comet cursor trail
================================================================== */
if (finePointer && !reduce) {
  const cv = $("#trail"), cx = cv.getContext("2d");
  const N = 24, pts = Array.from({ length: N }, () => ({ x: -200, y: -200 }));
  let mx = -200, my = -200, live = false, still = 0;
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
  size();
  addEventListener("resize", size);
  addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY; still = 0;
    if (!live) { pts.forEach((p) => { p.x = mx; p.y = my; }); live = true; }
  }, { passive: true });
  gsap.ticker.add(() => {
    if (!live) return;
    pts[0].x += (mx - pts[0].x) * 0.65; pts[0].y += (my - pts[0].y) * 0.65;
    for (let i = 1; i < N; i++) { pts[i].x += (pts[i - 1].x - pts[i].x) * 0.42; pts[i].y += (pts[i - 1].y - pts[i].y) * 0.42; }
    cx.clearRect(0, 0, cv.width, cv.height);
    if (++still > 90) { live = false; return; }          // stops drawing when the mouse rests
    cx.globalCompositeOperation = "lighter";
    cx.lineCap = "round";
    for (let i = 1; i < N; i++) {
      const t = 1 - i / N;
      cx.strokeStyle = `hsla(${275 - i * 4}, 95%, ${55 + t * 20}%, ${t * 0.8})`;
      cx.lineWidth = t * 8;
      cx.beginPath(); cx.moveTo(pts[i - 1].x, pts[i - 1].y); cx.lineTo(pts[i].x, pts[i].y); cx.stroke();
    }
  });
}

/* ==================================================================
   Hero letters swell and lift as the cursor passes
================================================================== */
if (finePointer && !reduce) {
  const chars = $$(".hero__title .ch");
  const to = chars.map((c) => ({ y: gsap.quickTo(c, "y", { duration: 0.6, ease: "power3" }), s: gsap.quickTo(c, "scale", { duration: 0.6, ease: "power3" }) }));
  let raf = 0, px = 0, py = 0;
  addEventListener("pointermove", (e) => {
    px = e.clientX; py = e.clientY;
    if (raf || scrollY > innerHeight * 0.8) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const rects = chars.map((c) => c.getBoundingClientRect());
      rects.forEach((r, i) => {
        const k = Math.max(0, 1 - Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2)) / 230);
        to[i].y(-k * k * 26);
        to[i].s(1 + k * k * 0.3);
      });
    });
  }, { passive: true });
}

/* ==================================================================
   Spotlight inside every button
================================================================== */
document.addEventListener("pointermove", (e) => {
  const b = e.target.closest?.(".btn");
  if (!b) return;
  const r = b.getBoundingClientRect();
  b.style.setProperty("--bx", e.clientX - r.left + "px");
  b.style.setProperty("--by", e.clientY - r.top + "px");
}, { passive: true });

// teaser cards tilt too
if (finePointer && !reduce) {
  $$(".teaser__card").forEach((el) => {
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3" }), ry = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 18);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 18);
    });
    el.addEventListener("pointerleave", () => { rx(0); ry(0); });
  });
  gsap.from(".teaser__card", { y: 80, opacity: 0, rotationX: -30, duration: 1.2, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".teaser", start: "top 85%" } });
}

/* ==================================================================
   Timetable: filter by form, cards flip in 3D, tap a slot to book it
================================================================== */
if ($("#ttGrid")) {
  const SLOTS = [
    { day: "Mon", time: "16:00", form: "Form IV", subject: "Add Maths", taken: 4 },
    { day: "Mon", time: "18:00", form: "Form V", subject: "Mathematics", taken: 5 },
    { day: "Tue", time: "16:00", form: "Form III", subject: "Mathematics", taken: 3 },
    { day: "Tue", time: "18:00", form: "Form V", subject: "Add Maths", taken: 6 },
    { day: "Wed", time: "16:00", form: "Form IV", subject: "Mathematics", taken: 4 },
    { day: "Wed", time: "18:30", form: "Form V", subject: "Add Maths", taken: 2, online: true },
    { day: "Thu", time: "16:00", form: "Form III", subject: "Mathematics", taken: 5 },
    { day: "Thu", time: "18:00", form: "Form IV", subject: "Add Maths", taken: 4 },
    { day: "Fri", time: "16:00", form: "Form V", subject: "Mathematics", taken: 3 },
    { day: "Fri", time: "18:00", form: "Form IV", subject: "Add Maths", taken: 6 },
    { day: "Sat", time: "08:30", form: "Form V", subject: "Add Maths", taken: 5 },
    { day: "Sat", time: "10:30", form: "Form III", subject: "Mathematics", taken: 2 },
  ];
  const DAYS = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
  const grid = $("#ttGrid");
  grid.innerHTML = Object.keys(DAYS).map((d) => `<div class="tt__day"><h4><span>${d}</span><span class="tt__long">${DAYS[d].slice(3)}</span></h4>${SLOTS.filter((x) => x.day === d).map((x) => {
    const left = 6 - x.taken, full = left <= 0;
    const dots = Array.from({ length: 6 }, (_, k) => `<i class="${k >= x.taken ? "is-free" : ""}"></i>`).join("");
    return `<button class="slot${full ? " is-full" : ""}${x.online ? " slot--online" : ""}" data-form="${x.form}" data-subject="${x.subject}" data-online="${x.online ? 1 : ""}" ${full ? 'aria-disabled="true"' : ""}>
      <span class="slot__time">${x.time}</span><b>${x.subject}</b><span class="slot__meta">${x.form} · ${x.online ? "Online" : "In class"}</span>
      <span class="slot__seats">${dots}</span><span class="slot__left">${full ? "Full, join the waitlist" : left === 1 ? "1 seat left" : left + " seats left"}</span></button>`;
  }).join("")}</div>`).join("");

  const slots = $$(".slot", grid);
  slots.forEach((b) => b.addEventListener("click", () => {
    openBook({ subject: b.dataset.subject, form: b.dataset.form, format: b.dataset.online ? "Live online" : "Small group" });
  }));
  $$(".tt__filters button").forEach((f) => f.addEventListener("click", () => {
    $$(".tt__filters button").forEach((x) => x.setAttribute("aria-selected", String(x === f)));
    const want = f.dataset.form;
    slots.forEach((sl) => sl.classList.toggle("is-dim", want !== "all" && sl.dataset.form !== want));
    if (!reduce) gsap.fromTo(slots, { rotationY: -100, opacity: 0 }, { rotationY: 0, opacity: (i, el) => (el.classList.contains("is-dim") ? 0.14 : 1), duration: 0.8, stagger: { each: 0.035, from: "start" }, ease: "expo.out", transformPerspective: 900, clearProps: "opacity" });
  }));
  gsap.from(".tt__day", { y: 60, opacity: 0, rotationX: -35, transformPerspective: 900, duration: 1.1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".tt", start: "top 85%" } });
}

})();
