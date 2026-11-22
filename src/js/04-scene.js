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
  ["fig. 6", { tuition: "A* = Σ effort", resources: "π ≈ 3.14159" }[PAGE] || "KS = f(you)"],
  ["fig. 0", "Kavish Maths"],                                    // the intro logotype
];

const canvas = $("#webgl");
// MSAA off: points and a full-screen shader gain nothing from it, and it's a big GPU cost
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
const DPR_MAX = Math.min(devicePixelRatio, isMobile ? 1 : 1.25);
const QKEY = "mm-quality-2";   // (-2: levels saved by the first adjuster are ignored, it could only ever lower them)
let savedQ = null;
try { savedQ = JSON.parse(localStorage.getItem(QKEY) || "null"); } catch (e) {}
let dpr = savedQ ? Math.min(DPR_MAX, savedQ.dpr) : DPR_MAX;
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

// One mood per section: a small hue turn shared by the particles and the aurora, so each section has its own
// tint while the violet / cyan / pink family stays. Stored as (cos, sin) so the shaders never run trig per pixel.
const hueU = { value: new THREE.Vector2(1, 0) };
const HUE = /* glsl */ `
uniform vec2 uHue;
vec3 hueTurn(vec3 c){ const vec3 k = vec3(.57735); return c * uHue.x + cross(k, c) * uHue.y + k * dot(k, c) * (1. - uHue.x); }`;   // a turn about the grey axis

// ---- living background: aurora + nebula + warped graph paper + click ripples + comets + speed streaks
const bgMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {
    uTime: { value: 0 }, uScroll: { value: 0 }, uIntro: { value: 0 }, uVel: { value: 0 }, uDir: { value: 1 },
    uRes: { value: new THREE.Vector2(innerWidth, innerHeight) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uRipple: { value: new THREE.Vector2(0.5, 0.5) }, uRippleT: { value: -10 }, uCharge: { value: 0 }, uHue: hueU,
    uScanT: { value: -10 }, uScanDir: { value: 1 }, uTravel: { value: 0 },
  },
  vertexShader: /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: /* glsl */ `
    ${NOISE}
    ${HUE}
    uniform float uTime, uScroll, uIntro, uVel, uDir, uRippleT, uCharge, uScanT, uScanDir, uTravel; uniform vec2 uRes, uMouse, uRipple;
    float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 2; i++){ s += a * snoise(p); p *= 2.03; a *= .5; } return s; }
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

      // click ripple: an expanding ring that bends the grid, with a fainter second ring trailing it
      vec2 rp = (uRipple - .5) * vec2(asp, 1.);
      float age = uTime - uRippleT, age2 = age - .17;
      float rd = length(p - rp);
      float ring = step(0., age) * smoothstep(.07, 0., abs(rd - age * .85)) * exp(-age * 1.4);
      float echo = step(0., age2) * smoothstep(.05, 0., abs(rd - age2 * .85)) * exp(-age2 * 1.9) * .42;

      // aurora ribbons (hue drifts with scroll, brighter while scrolling fast; the section's mood turns both colours)
      float n = fbm(vec3(p * 1.3, t + uScroll * 1.5));
      float b1 = smoothstep(.26, 0., abs(p.y * .9 + .25 * sin(p.x * 2.2 + t * 6. + n * 2.) + n * .35 - .18)); b1 *= b1;
      float b2 = smoothstep(.32, 0., abs(p.y + .3 * cos(p.x * 1.6 - t * 5. + n * 2.5) - n * .4 + .38)); b2 *= b2;
      vec3 c1 = hueTurn(mix(vec3(.545, .361, .965), vec3(.133, .827, .933), .5 + .5 * sin(uScroll * 6.283 + t * 2.)));
      vec3 c2 = hueTurn(mix(vec3(.957, .447, .714), vec3(.545, .361, .965), .5 + .5 * cos(uScroll * 4.4 - t * 1.5)));
      float boost = 1. + v * 1.4;
      col += (c1 * b1 * .2 + c2 * b2 * .15) * boost;


      // nebula
      float neb = snoise(vec3(p * .7 + 3., t * .6));
      col += vec3(.2, .11, .42) * smoothstep(.15, .95, neb) * .16;

      // The shaft. We look straight down a round shaft whose wall is ruled like graph paper: rings along it, ribs
      // round it. Scrolling is travel along it (uTravel counts screens scrolled), so the whole page is one flight
      // toward the hole in the middle, and scrolling back up flies out again. The far end leans a little toward the
      // pointer, the wall wobbles while moving fast, and a click still sends its ripple through the lines.
      vec2 m = (uMouse - .5) * vec2(asp, 1.);
      float md = length(p - m);
      vec2 tc = p - m * .07 + vec2(snoise(vec3(p * 1.1, t)), snoise(vec3(p * 1.1 + 5., t))) * (.012 + v * .03);
      tc += normalize(p - rp + .0001) * ring * .04;
      float tr = length(tc) + .0001;
      float tz = .42 / tr;                                           // how far down the shaft this pixel looks
      vec2 q = vec2(tz + uTravel * 3. + uTime * .06, atan(tc.y, tc.x) * 3.8197);   // (a ring per unit of depth, 24 ribs)
      // line widths come from the known slope of each coordinate, not from fwidth: the angle jumps where it wraps
      vec2 gq = abs(fract(q - .5) - .5) / (vec2(.42 / (tr * tr), 3.8197 / tr) * 1.6 / uRes.y);
      float grid = 1. - min(min(gq.x, gq.y), 1.);
      float wall = smoothstep(.035, .3, tr) * (.3 + .7 * smoothstep(.15, .85, tr));   // far away the lines sink into the dark
      // scan: on every panel change a ring of light runs the length of the shaft, toward you going down the page
      float sa = uTime - uScanT;
      float zb = uScanDir > 0. ? 5.2 - sa * 4.4 : .8 + sa * 4.4;
      float scan = step(0., sa) * exp(-pow((tz - zb) / .32, 2.)) * smoothstep(1.4, .9, sa);
      col += vec3(.75, .72, .95) * grid * (.13 * wall + .13 * smoothstep(.55, 0., md) + v * .1 * wall + (ring + echo) * .5 + scan * .85);
      col += vec3(.35, .25, .75) * smoothstep(.55, 0., md) * .1;
      vec3 cm = mix(c1, c2, .5);
      // the light at the far end: a soft pool and a bright core, in the section's colours
      col += cm * (exp(-tr * 5.5) * .34 + exp(-tr * 26.) * .5) + vec3(.8, .85, 1.) * exp(-tr * 70.) * .35;
      col += cm * ((ring + echo) * .45 + scan * .12);

      // hold to charge: light gathers at the cursor while a ring closes in on it
      col += cm * uCharge * (smoothstep(.36, 0., md) * .3 + smoothstep(.02, 0., abs(md - mix(.42, .06, uCharge))) * .55);

      // speed streaks while scrolling
      float s = max(snoise(vec3(p.x * 55., p.y * 1.1 + uTime * 2.5 * uDir, 1.7)), 0.);
      col += vec3(.65, .7, 1.) * pow(s, 7.) * v * .9;

      // shooting stars
      col += vec3(.85, .9, 1.) * (comet(p, 9., 1.) + comet(p, 13., 4.) * .8);

      col += (fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
      gl_FragColor = vec4(mix(base, col, uIntro), 1.);
    }`,
});
// The background is soft by nature, so it's drawn at half resolution into a texture and
// stretched to full screen: ~75% fewer shader pixels per frame, no visible difference.
const BG_SCALE = 0.35;
const bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgQuad.frustumCulled = false;
bgScene.add(bgQuad);
const bgTarget = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, stencilBuffer: false });
const bgCopy = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: { tBg: { value: bgTarget.texture } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tBg; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tBg, vUv); }`,
}));
bgCopy.frustumCulled = false;
bgCopy.renderOrder = -1;
scene.add(bgCopy);
const bgSize = new THREE.Vector2();
const syncBgRes = () => {
  renderer.getDrawingBufferSize(bgSize);
  const w = Math.max(2, Math.round(bgSize.x * BG_SCALE)), h = Math.max(2, Math.round(bgSize.y * BG_SCALE));
  bgTarget.setSize(w, h);
  bgMat.uniforms.uRes.value.set(w, h);
};
syncBgRes();
let scrollSmooth = 0, maxScroll = 1;
const syncMax = () => (maxScroll = Math.max(1, ScrollTrigger.maxScroll(window)));
ScrollTrigger.addEventListener("refresh", syncMax);
syncMax();

// ---- particles
const COUNT = isMobile ? 3500 : 7500;
const P_SIZE = isMobile ? 48 : 52;                              // point size: big enough that the shapes read clearly
// first visit: the particles assemble into the KAVISH MATHS logotype (shape 6) before the page builds.
// After a page transition there's no loader, and the page's own shape is used straight away.
const LOGO_INTRO = !!$("#loader") && !document.documentElement.classList.contains("pt-in");
const LOGO = 6;                                                  // the logotype shape slot
const START_SHAPE = PAGE === "profile" ? 0 : 5;                 // tuition + resources open on their word
const FIRST_SHAPE = LOGO_INTRO ? LOGO : START_SHAPE;
const TEXT_SHAPE = { tuition: ["A*", 5.2], resources: ["π", 3.6] }[PAGE] || ["KS", 4.2];
const A = new Float32Array(COUNT * 3), B = new Float32Array(COUNT * 3), C = new Float32Array(COUNT * 3),
      D = new Float32Array(COUNT * 3), E = new Float32Array(COUNT * 3), F = new Float32Array(COUNT * 3), G = new Float32Array(COUNT * 3);
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
G.set(A);
pGeo.setAttribute("aG", new THREE.BufferAttribute(G, 3));
pGeo.setAttribute("aF", new THREE.BufferAttribute(F, 3));
pGeo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));
pGeo.setAttribute("aCol", new THREE.BufferAttribute(col, 3));

const pMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 }, uMorph: { value: 0 }, uIntro: { value: 0 }, uVel: { value: 0 },
    uFrom: { value: FIRST_SHAPE }, uTo: { value: FIRST_SHAPE }, uT: { value: 1 }, uKeep: { value: 1.06 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) }, uShock: { value: new THREE.Vector3(99, 99, 0) }, uShockAge: { value: 10 }, uShockAmp: { value: 1 }, uSwirl: { value: 1 }, uBoost: { value: 1 },
    uSize: { value: P_SIZE * dpr }, uHeat: { value: 1 }, uPull: { value: 0 }, uHole: { value: 1 }, uHue: hueU,
  },
  vertexShader: /* glsl */ `
    ${NOISE}
    ${HUE}
    uniform float uTime, uMorph, uIntro, uSize, uVel, uShockAge, uShockAmp, uSwirl, uBoost, uFrom, uTo, uT, uKeep, uHeat, uPull, uHole; uniform vec3 uMouse, uShock;
    attribute vec3 aB, aC, aD, aE, aF, aG, aCol; attribute float aRnd;
    varying vec3 vCol; varying float vAlpha;
    vec3 shapeAt(float k){
      if (k < .5) return position; if (k < 1.5) return aB; if (k < 2.5) return aC;
      if (k < 3.5) return aD; if (k < 4.5) return aE; if (k < 5.5) return aF; return aG;
    }
    void main(){
      // each particle leaves a little later than the last, so the shape pours rather than jumps
      float tt = smoothstep(0., 1., clamp(uT * 1.35 - aRnd * .35, 0., 1.));
      float fly = sin(tt * 3.14159);                              // 0 at rest in a shape, 1 half-way between two
      vec3 p = mix(shapeAt(uFrom), shapeAt(uTo), tt);
      p += vec3(sin(aRnd * 41.), cos(aRnd * 29.), sin(aRnd * 17. + 1.)) * fly * .55 * uSwirl;   // swirl mid-flight
      p *= mix(6.0 + aRnd * 6.0, 1.0, uIntro);
      float n = snoise(p * .45 + uTime * .15);
      float word = mix(step(4.5, uFrom), step(4.5, uTo), tt);     // 1 while a word (page word or logo) is showing
      p += normalize(p + .0001) * n * (.22 + uVel * .3) * (1. - word * .7);   // breathes (less on words, so letters stay crisp)
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      // the cursor (or a finger) parts the particles. While the mouse is held down they fall toward it instead,
      // spiralling as they go: each one travels a share of its own distance, so none is ever pulled past the centre
      vec3 d = mv.xyz - uMouse; float dl = length(d.xy);
      float pull = min(dl * .78, smoothstep(7., 0., dl) * 2.3) * uPull;
      float turn = uPull * 2.6 * smoothstep(5.5, 0., dl);
      vec2 q = d.xy * cos(turn) + vec2(-d.y, d.x) * sin(turn);
      mv.xy = uMouse.xy + q * ((dl + smoothstep(1.6, 0., dl) * .9 * uHole * (1. - uPull) - pull) / max(dl, .0001));
      vec2 sd = mv.xy - uShock.xy; float sl = length(sd);          // click shockwave
      float wave = smoothstep(.9, 0., abs(sl - uShockAge * 5.)) * exp(-uShockAge * 2.2);
      mv.xy += normalize(sd + .0001) * wave * 1.4 * uShockAmp;
      gl_Position = projectionMatrix * mv;
      float keep = 1. - smoothstep(uKeep - .06, uKeep, aRnd);       // low-power tier fades particles out
      // living particles: hot while in flight between two shapes (bigger, brighter, whiter, cooling as they land),
      // the near side of the cloud a touch brighter than the far side, and each one twinkling at its own pace
      float heat = fly * uHeat;
      float near = clamp((mv.z - modelViewMatrix[3].z) * .3, -1., 1.);
      float twinkle = sin(uTime * (1.1 + aRnd * 2.3) + aRnd * 83.) * (.15 - word * .08);
      float crowd = 1. - uPull * .45 * smoothstep(2.2, 0., dl);     // gathered at the cursor they'd add up to a white blob
      gl_PointSize = uSize * (.35 + aRnd * .9) * (1. + wave * 1.5) * (1. + heat * .3) / -mv.z * step(.001, keep);
      vCol = mix(hueTurn(aCol), vec3(1.), heat * .4);
      vAlpha = (.78 + n * .28 + wave) * uIntro * keep * uBoost * (1. + twinkle) * (1. + near * .2) * (1. + heat * .45) * crowd;   // steady brightness: noise only shimmers it
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vCol; varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - .5);
      if (d > .5) discard;
      float glow = smoothstep(.5, .0, d), core = smoothstep(.2, .02, d);
      // a crisp bright core inside a soft coloured halo
      gl_FragColor = vec4(vCol * (1.05 + core * .85), (glow * glow * .5 + core * .8) * vAlpha);
    }`,
});
const points = new THREE.Points(pGeo, pMat);
points.frustumCulled = false;
const perfState = { low: false };
const goLow = (instant) => {
  perfState.low = true;
  gsap.to(pMat.uniforms.uKeep, { value: 0.6, duration: instant ? 0 : 1.8, ease: "power2.inOut" });
  document.documentElement.classList.add("low-power");
};
if (savedQ?.low) goLow(true);

// ---- shape queue: always one direct morph at a time, never through the shapes in between
const morph = { from: FIRST_SHAPE, to: FIRST_SHAPE, target: FIRST_SHAPE, tween: null };
function setShape(k, instant) {
  morph.target = k;
  const u = pMat.uniforms;
  if (instant) {
    morph.tween?.kill(); morph.tween = null;
    morph.from = morph.to = k; u.uFrom.value = u.uTo.value = k; u.uT.value = 1;
    updateHud(k);
    return;
  }
  if (morph.tween) {                                            // a different shape was asked for mid-pour:
    if (k !== morph.to) morph.tween.timeScale(2.4);               // finish this pour quickly, then go on
    return;                                                       // (asking again for the same shape changes nothing)
  }
  if (morph.target === morph.to) return;
  morph.from = morph.to; morph.to = morph.target;
  u.uFrom.value = morph.from; u.uTo.value = morph.to; u.uT.value = 0;
  updateHud(morph.to);
  bus.emit("shape:change", { from: morph.from, to: morph.to });
  morph.tween = gsap.to(u.uT, { value: 1, duration: reduce ? 0 : 1.6, ease: "power2.inOut",
    onComplete: () => { morph.tween = null; setShape(morph.target); } });
}
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
const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, isMobile ? 12 : 24), blobMat);
world.add(blob);

const dustShift = { value: 0 };                                  // how far the dust has slid with the scroll (world units)
{ // background dust
  const n = 500, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
  // spread wide, but never within 7 units of the camera (z = 9): a dust speck right at the lens is drawn as a big grey square
  for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - 0.5) * 60; a[i * 3 + 1] = (Math.random() - 0.5) * 60; a[i * 3 + 2] = -30 + Math.random() * 32; }
  g.setAttribute("position", new THREE.BufferAttribute(a, 3));
  const mat = new THREE.PointsMaterial({ size: 0.03, color: 0x9a94b8, transparent: true, opacity: 0.5, depthWrite: false });
  // real parallax: the dust slides up as the page scrolls down and wraps round its 60-unit field, so it never runs out.
  // Perspective does the rest: specks near the camera pass quickly, far ones barely move.
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uShift = dustShift;
    sh.vertexShader = "uniform float uShift;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed.y = mod(transformed.y + uShift + 30., 60.) - 30.;");
  };
  const dust = new THREE.Points(g, mat);
  dust.frustumCulled = false;                                    // its box no longer says where the wrapped points are
  scene.add(dust);
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
  const n = isMobile ? 6 : 12;
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
// the intro logotype: KAVISH MATHS in particles, one line on wide screens, two on narrow ones
function buildLogoShape() {
  const W = 1400, H = 640, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d"), wide = innerWidth / innerHeight > 1.05;
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  if (wide) { x.font = '700 200px "Space Grotesk", sans-serif'; x.fillText("KAVISH MATHS", W / 2, H / 2); }
  else { x.font = '700 250px "Space Grotesk", sans-serif'; x.fillText("KAVISH", W / 2, H / 2 - 140); x.fillText("MATHS", W / 2, H / 2 + 140); }
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += 2) for (let X = 0; X < W; X += 2) if (d[(y * W + X) * 4 + 3] > 128) pts.push(X, y);
  if (!pts.length) return 0;
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let k = 0; k < pts.length; k += 2) { minX = Math.min(minX, pts[k]); maxX = Math.max(maxX, pts[k]); minY = Math.min(minY, pts[k + 1]); maxY = Math.max(maxY, pts[k + 1]); }
  // fit the word to the screen: the view at z = 0 is 2·9·tan(22.5°) units tall
  const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360), visW = visH * camera.aspect;
  const sc = Math.min((visW * (wide ? 0.78 : 0.86)) / (maxX - minX), (visH * 0.42) / (maxY - minY));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, n = pts.length / 2;
  for (let i = 0; i < COUNT; i++) {
    const k = ((Math.random() * n) | 0) * 2;
    G[i * 3] = (pts[k] - cx) * sc;
    G[i * 3 + 1] = -(pts[k + 1] - cy) * sc + 0.25;
    G[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
  }
  pGeo.attributes.aG.needsUpdate = true;
  // the same word drawn solid, exactly over the particles (screen px per canvas px = k), so it reads on any screen
  const over = $("#loaderLogo");
  if (over) {
    const r = Math.min(devicePixelRatio || 1, 2), sw = innerWidth, sh = innerHeight, k = (sc * sh) / visH;
    over.width = sw * r; over.height = sh * r;
    const o = over.getContext("2d");
    o.scale(r, r);
    const ox = sw / 2 - cx * k, oy = sh / 2 - (0.25 * sh) / visH - cy * k;   // canvas (0,0) on screen
    const gr = o.createLinearGradient(ox + minX * k, 0, ox + maxX * k, 0);
    gr.addColorStop(0, "#a78bfa"); gr.addColorStop(0.5, "#67e8f9"); gr.addColorStop(1, "#f9a8d4");
    o.fillStyle = gr; o.textAlign = "center"; o.textBaseline = "middle";
    o.shadowColor = "rgba(34, 211, 238, 0.55)"; o.shadowBlur = 28;
    o.font = `700 ${(wide ? 200 : 250) * k}px "Space Grotesk", sans-serif`;
    const put = (t, y) => o.fillText(t, ox + (W / 2) * k, oy + y * k);
    if (wide) put("KAVISH MATHS", H / 2); else { put("KAVISH", H / 2 - 140); put("MATHS", H / 2 + 140); }
  }
  return ((maxY - minY) * sc) / visH;                          // logo height as a share of the screen
}
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
const sceneState = PAGE !== "profile"
  ? { morph: 5, rotX: 0, x: isMobile ? 0 : 2.7, y: isMobile ? 1.2 : 0, z: 0, blobScale: 0 }
  : { morph: 0, rotX: 0, x: isMobile ? 0 : 2.6, y: 0, z: 0, blobScale: 0 };
if (isMobile) blob.visible = false;
const HERO_SPOT = { ...sceneState };                            // where the hero puts the scene
if (LOGO_INTRO) Object.assign(sceneState, { x: 0, y: 0, z: 0, rotX: 0, blobScale: 0 });   // the logo sits dead centre
const mouse = { x: 0, y: 0, tx: 0, ty: 0, seen: false };
addEventListener("pointermove", (e) => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = -(e.clientY / innerHeight) * 2 + 1;
  if (e.pointerType !== "touch") mouse.seen = true;              // a finger parts the particles only while it's down (see finger, below)
}, { passive: true });

// a point on the screen (-1..1 each way) → the matching point in the camera's space, at the depth of the particle cloud
const viewPoint = (nx, ny, out) => {
  ndc.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
  const dist = (camera.position.z - world.position.z) / -ndc.z;
  return out.copy(camera.position).add(ndc.multiplyScalar(dist)).applyMatrix4(camera.matrixWorldInverse);
};

// click anywhere: ripple through the grid + shockwave through the particles
addEventListener("pointerdown", (e) => {
  if (reduce) return;
  const pu = pMat.uniforms, touch = e.pointerType === "touch";
  bgMat.uniforms.uRipple.value.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
  bgMat.uniforms.uRippleT.value = bgMat.uniforms.uTime.value;
  // a mouse click shocks from where the particles already part; a finger has no such spot yet, so it shocks from where it lands
  if (touch) viewPoint((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, pu.uShock.value);
  else pu.uShock.value.copy(pu.uMouse.value);
  if (!document.body.classList.contains("is-loading")) {         // (during the intro the blast sets its own, bigger wave)
    gsap.killTweensOf(pu.uShockAmp);
    pu.uShockAmp.value = touch ? 0.65 : 1;                       // a softer wave for a finger: every scroll starts with a touch
  }
  motion.shockT = clock.getElapsedTime();
  bus.emit("shock", { x: e.clientX, y: e.clientY, target: e.target });
}, { passive: true });

// ---- hold to charge (mouse): hold the button down and the particles fall toward the cursor while light gathers
// there; let go and a shockwave throws them back out, stronger the longer you held. A quick click is untouched:
// charging only begins after the button has been down for a moment.
const charge = { v: 0, on: false, timer: 0, x: 0, y: 0 };
const chargeEnd = (fire) => {
  clearTimeout(charge.timer);
  charge.timer = 0;
  if (!charge.on) return;
  charge.on = false;
  document.documentElement.classList.remove("is-charging");
  const power = charge.v, pu = pMat.uniforms, bu = bgMat.uniforms;
  if (fire) {
    pu.uShock.value.copy(pu.uMouse.value);
    pu.uShockAmp.value = 1 + power * 1.7;
    motion.shockT = clock.getElapsedTime();
    bu.uRipple.value.copy(bu.uMouse.value);
    bu.uRippleT.value = bu.uTime.value;
    gsap.to(pu.uShockAmp, { value: 1, duration: 0.4, delay: 1.3, overwrite: true });   // back to a click-sized shock once this one has passed
  }
  // every "charge:start" is answered by exactly one "charge:release": fired with its power, or cancelled (power 0)
  bus.emit("charge:release", fire ? { power } : { power: 0, cancelled: true });
  gsap.to(charge, { v: 0, duration: fire ? 0.4 : 0.7, ease: fire ? "power3.out" : "power2.inOut", overwrite: true });
};
if (!reduce) {
  addEventListener("pointerdown", (e) => {
    chargeEnd(false);
    if (e.pointerType !== "mouse" || e.button !== 0 || ui.book || document.body.classList.contains("is-loading")) return;
    if (e.target.closest?.("input, textarea, select, .book, .rdr, .vmodal")) return;
    charge.x = e.clientX; charge.y = e.clientY;
    charge.timer = setTimeout(() => {
      charge.timer = 0;
      if (ui.book) return;
      charge.on = true;
      // from here the drag belongs to the gravity well, not to selecting text (html.is-charging: user-select none)
      document.documentElement.classList.add("is-charging");
      getSelection?.()?.removeAllRanges();
      bus.emit("charge:start");
      gsap.to(charge, { v: 1, duration: 1.5, ease: "power2.out", overwrite: true });
    }, 160);
  }, { passive: true });
  // press and drag straight away means "select this text": that stays a plain drag, and no charge begins
  addEventListener("pointermove", (e) => {
    if (charge.timer && Math.hypot(e.clientX - charge.x, e.clientY - charge.y) > 6) { clearTimeout(charge.timer); charge.timer = 0; }
  }, { passive: true });
  addEventListener("pointerup", () => chargeEnd(true), { passive: true });
  // anything that takes the press away ends it quietly: no shockwave, the particles just drift back
  for (const ev of ["pointercancel", "blur", "contextmenu", "dragstart"]) addEventListener(ev, () => chargeEnd(false));
  document.addEventListener("visibilitychange", () => chargeEnd(false));
  for (const ev of ["book:open", "video:open", "reader:open", "page:leave"]) bus.on(ev, () => chargeEnd(false));
}

// ---- phones: while a finger is on the screen the particles part around it (also mid-scroll: touchmove keeps
// coming after the browser has taken the gesture, when pointer events stop). Shortly after it lifts, the gap closes.
const finger = { on: false, k: 0, x: 0, y: 0, tx: 0, ty: 0, timer: 0 };
// …and the scene leans a little with the phone itself. The first reading is the neutral pose; nothing asks for permission.
const tilt = { x: 0, y: 0, tx: 0, ty: 0, b0: null, g0: 0 };
if (!reduce) {
  const track = (e) => {
    const t = e.touches[0];
    if (!t || document.body.classList.contains("is-loading")) return;
    finger.tx = (t.clientX / innerWidth) * 2 - 1;
    finger.ty = -(t.clientY / innerHeight) * 2 + 1;
    if (!finger.on && finger.k < 0.05) { finger.x = finger.tx; finger.y = finger.ty; }   // a new touch starts where it lands (no slide from the last one)
    clearTimeout(finger.timer);
    finger.on = true;
  };
  const lift = (e) => { if (!e.touches.length) { clearTimeout(finger.timer); finger.timer = setTimeout(() => (finger.on = false), 180); } };
  addEventListener("touchstart", track, { passive: true });
  addEventListener("touchmove", track, { passive: true });
  addEventListener("touchend", lift, { passive: true });
  addEventListener("touchcancel", lift, { passive: true });
  if (!finePointer) addEventListener("deviceorientation", (e) => {
    if (e.beta == null || e.gamma == null) return;
    const land = innerWidth > innerHeight, side = land ? e.beta : e.gamma, fwd = land ? e.gamma : e.beta;
    if (tilt.b0 === null) { tilt.b0 = fwd; tilt.g0 = side; }
    tilt.b0 += (fwd - tilt.b0) * 0.004;                          // the neutral pose follows slowly, so a new way of holding the phone becomes "level" again
    tilt.g0 += (side - tilt.g0) * 0.004;
    tilt.tx = gsap.utils.clamp(-1, 1, (side - tilt.g0) / 22);
    tilt.ty = gsap.utils.clamp(-1, 1, (fwd - tilt.b0) / 22);
  }, { passive: true });
}

// HUD: names the shape currently on screen
const hudFn = $("#hudFn"), hudIdx = $("#hudIdx");
let hudShape = 0, hudBtn = null;
const hudLabel = () => hudBtn?.setAttribute("aria-label", `Show the next shape. Now showing ${SHAPES[hudShape][0]}: ${SHAPES[hudShape][1]}`);
function updateHud(k) {
  if (k === hudShape) return;
  hudShape = k;
  hudLabel();
  gsap.timeline()
    .to(hudFn, { yPercent: -80, opacity: 0, duration: 0.2, ease: "power2.in" })
    .call(() => { hudIdx.textContent = SHAPES[k][0]; hudFn.textContent = SHAPES[k][1]; })
    .fromTo(hudFn, { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
}
// On desktop the pill is a real button: press it and the particles pour into the next of the six shapes.
// (The section's own shape returns at the next section change. On touch screens it stays a plain label.)
if (finePointer) {
  const old = $(".hud");
  hudBtn = document.createElement("button");
  hudBtn.type = "button";
  hudBtn.className = "hud hud--btn";
  hudBtn.append(...old.childNodes);
  hudBtn.insertAdjacentHTML("beforeend", `<i class="hud__go" aria-hidden="true"></i>`);
  old.replaceWith(hudBtn);
  hudLabel();
  hudBtn.addEventListener("click", () => {
    if (document.body.classList.contains("is-loading")) return;
    const k = (morph.target + 1) % LOGO;                          // 0…5: the logotype (slot 6) is the intro's alone
    setShape(k);
    bus.emit("hud:next", { shape: k });
  });
}

// ---- adaptive quality: drop resolution if frames get slow, raise it back when there's headroom
const applyDpr = () => {
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  syncBgRes();
  pMat.uniforms.uSize.value = P_SIZE * dpr;
};
// The quality adjuster. It times the gap between 3D frames and compares it with the gap the scene is asked to keep
// (perf.pace: the screen's own frame time, doubled on fast screens where the 3D draws every other frame).
//  - It judges the middle of a window of 60 frames, not the average: one frozen frame (a tab waking up, the graphics
//    card building a program) says nothing about what the machine can sustain, and must not lower the quality.
//  - Lower: the typical frame takes a third longer than asked. Raise: for four windows in a row nine frames in ten were
//    on time. After a raise is followed by a lowering, it stops raising: that level is this machine's.
const perf = { gaps: [], last: performance.now(), warm: performance.now() + 2000, pace: 16.7, calm: 0, raised: false, settled: false };
const saveQ = () => { try { localStorage.setItem(QKEY, JSON.stringify({ dpr, low: perfState.low })); } catch (e) {} };
function watchPerf() {
  const now = performance.now(), dt = now - perf.last;
  perf.last = now;
  if (now < perf.warm || dt > 250 || ui.book) return;   // ignore the loader, tab switches and the booking panel
  perf.gaps.push(dt);
  if (perf.gaps.length < 60) return;
  const sorted = perf.gaps.sort((a, b) => a - b), mid = sorted[30], most = sorted[53];
  perf.avg = mid;
  perf.gaps = [];
  if (mid > perf.pace * 1.33) {
    perf.calm = 0;
    if (perf.raised) perf.settled = true;
    if (dpr > 0.75) perf.pending = "down";
    else if (!perfState.low) perf.pending = "low";
  } else if (most < perf.pace * 1.12) {
    if (++perf.calm >= 4 && !perf.settled && dpr < DPR_MAX && !perfState.low) { perf.pending = "up"; perf.calm = 0; }
  } else perf.calm = 0;
}
// quality changes wait until nothing is moving, so they never show as a jump
function applyPendingQuality() {
  if (!perf.pending || motion.vel > 0.02 || snap.busy || morph.tween) return;
  if (perf.pending === "down") { dpr = Math.max(0.75, dpr - 0.25); applyDpr(); }
  else if (perf.pending === "up") { dpr = Math.min(DPR_MAX, dpr + 0.25); perf.raised = true; applyDpr(); }
  else if (perf.pending === "low") goLow();
  perf.pending = null;
  saveQ();
}

// ---- the scene has mass: it lags behind a scroll and springs back, and the camera makes a small move with every snap
const mass = { x: 0, v: 0 };                                     // a soft spring chasing the signed scroll speed
const camFx = { dolly: 0, roll: 0 };                             // snap move: a step back and a slight roll, in world units / radians
const sceneFx = { warp: 0 };                                     // extra "speed" on top of the scroll's: the jump between pages
bus.on("snap:go", ({ dur, dir }) => {
  if (!reduce) { bgMat.uniforms.uScanT.value = bgMat.uniforms.uTime.value; bgMat.uniforms.uScanDir.value = dir; }
  if (reduce) return;
  const out = dur * 0.5;
  gsap.killTweensOf(camFx);
  gsap.timeline()
    .to(camFx, { dolly: 0.42, roll: dir * 0.018, duration: out, ease: "sine.inOut" })
    // the way back overshoots just as the panel lands, then settles
    .to(camFx, { dolly: 0, duration: out + 0.3, ease: "back.out(1.5)" }, out)
    .to(camFx, { roll: 0, duration: out + 0.3, ease: "back.out(2.6)" }, out);
});
// leaving for another page: the particles rush outward and fade as the columns rise, so the two pages read as one jump
bus.on("page:leave", () => {
  if (reduce) return;
  gsap.to(pMat.uniforms.uIntro, { value: 0, duration: 0.85, ease: "power2.in", overwrite: true });
  gsap.to(sceneFx, { warp: 1, duration: 0.6, ease: "power2.out", overwrite: true });
});
addEventListener("pageshow", (e) => {                            // back from the browser's page cache: the scene as it was
  if (!e.persisted) return;
  gsap.killTweensOf([pMat.uniforms.uIntro, sceneFx]);
  pMat.uniforms.uIntro.value = 1;
  sceneFx.warp = 0;
});

// ---- a mood per section (see hueU): eased on every section change, and set for the section the page starts in
{
  const MOODS = {
    profile: { about: 0.25, results: -0.32, journey: 0.4, students: -0.16, teaser: 0.3 },
    tuition: { subjects: 0.28, timetable: -0.3, method: 0.12, example: -0.42, quiz: 0.38, fees: -0.2, faq: 0.25 },
    resources: { notes: -0.3, videos: 0.35 },
  }[PAGE] || {};                                                 // radians; heroes and contact keep the brand colours as they are
  const mood = { a: 0 };
  const paint = () => hueU.value.set(Math.cos(mood.a), Math.sin(mood.a));
  const setMood = (id, instant) => {
    const a = MOODS[id] || 0;
    if (instant || reduce) { gsap.killTweensOf(mood); mood.a = a; paint(); }
    else gsap.to(mood, { a, duration: 1.6, ease: "power2.inOut", overwrite: true, onUpdate: paint });
  };
  let started = !LOGO_INTRO;                                     // the logo intro keeps the brand colours; the mood arrives with the page
  bus.on("section:change", ({ id }) => started && setMood(id));
  bus.on("intro:done", () => { if (!started) { started = true; setMood(sectionEls[activeDot]?.id); } });
  if (started) setMood(sectionEls[activeDot]?.id, true);
}

// ---- one render loop, driven by GSAP's ticker (same frame as Lenis + ScrollTrigger)
const clock = new THREE.Clock(), ndc = new THREE.Vector3();
let prevScroll = scrollY, spin = 0, spinDir = 1, scrollLag = scrollY, viewH = innerHeight;
// measure the screen's refresh rate once
let frameNo = 0, renderEvery = 1;
{
  // median frame gap, skipping start-up frames (shader compiles make those slow and would hide a 120Hz screen)
  const gaps = [];
  let last = 0;
  const probe = () => {
    const now = performance.now();
    if (last) gaps.push(now - last);
    last = now;
    if (gaps.length < 150) return;
    gsap.ticker.remove(probe);
    const med = gaps.slice(30).sort((a, b) => a - b)[60];
    renderEvery = med < 10 ? 2 : 1;          // under 10ms a frame = 100Hz+ screen
    // the gap between 3D frames the adjuster should expect. No screen is slower than 60Hz, so a longer gap measured
    // here is a slow machine, not a slow screen: capping it lets the adjuster see that and lower the quality.
    perf.pace = Math.min(med, 16.7) * renderEvery;
  };
  gsap.ticker.add(probe);
}
function render() {
  frameNo++;
  if (frameNo % renderEvery) return;              // high-refresh screen: skip every other 3D frame
  if (ui.book && frameNo % 3) return;              // booking panel open: scene behind it at a third
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  watchPerf();
  applyPendingQuality();

  // scroll speed (0 = still, ~1 = flicking through sections)
  const sy = scrollY, signedV = lenis ? lenis.velocity / 45 : (sy - prevScroll) / 45, rawV = Math.abs(signedV);
  if (sy !== prevScroll) motion.dir = sy > prevScroll ? 1 : -1;
  prevScroll = sy;
  motion.vel += (Math.min(rawV, 1.2) - motion.vel) * 0.05;
  const v = reduce ? 0 : Math.min(1.5, motion.vel + sceneFx.warp);

  // mass: a loose spring follows the signed speed, so the cloud is left behind by a scroll, then catches up and settles
  if (!reduce) {
    mass.v += ((gsap.utils.clamp(-1.2, 1.2, signedV) - mass.x) * 50 - mass.v * 6.5) * dt;
    mass.x += mass.v * dt;
    scrollLag += (sy - scrollLag) * 0.12;
    dustShift.value = (scrollLag / viewH) * 2.6;                  // 2.6 world units of dust per screen scrolled
  }

  mouse.x += (mouse.tx - mouse.x) * 0.06;
  mouse.y += (mouse.ty - mouse.y) * 0.06;
  tilt.x += (tilt.tx - tilt.x) * 0.05;
  tilt.y += (tilt.ty - tilt.y) * 0.05;
  const leanX = mouse.x + tilt.x * 0.7, leanY = mouse.y - tilt.y * 0.7;   // what the scene leans toward: the mouse, plus the phone's own tilt
  scrollSmooth += (sy / maxScroll - scrollSmooth) * 0.08;

  const bu = bgMat.uniforms;
  bu.uTime.value = reduce ? 0 : t;
  bu.uScroll.value = scrollSmooth;
  bu.uTravel.value = scrollSmooth * maxScroll / innerHeight;
  bu.uVel.value = v;
  bu.uDir.value = motion.dir;
  bu.uMouse.value.set((mouse.x + 1) / 2, (mouse.y + 1) / 2);
  bu.uCharge.value = charge.v;

  const pu = pMat.uniforms;
  pu.uTime.value = t;

  pu.uVel.value = v;
  pu.uShockAge.value = t - motion.shockT;
  pu.uPull.value = charge.v;
  blobMat.uniforms.uTime.value = t;

  // where the particles part: under the finger while one is down (fading out once it lifts), otherwise around the mouse
  if (finger.on || finger.k > 0.002) {
    finger.k += ((finger.on ? 1 : 0) - finger.k) * (finger.on ? 0.3 : 0.14);
    finger.x += (finger.tx - finger.x) * 0.4;
    finger.y += (finger.ty - finger.y) * 0.4;
    viewPoint(finger.x, finger.y, pu.uMouse.value);
    pu.uHole.value = finger.k;
  } else if (mouse.seen) {
    viewPoint(mouse.x, mouse.y, pu.uMouse.value);
    pu.uHole.value = 1;
  } else pu.uHole.value = 0;

  spinDir += (motion.dir - spinDir) * 0.04;                       // direction changes ease, never flip
  spin += dt * (0.06 + v * 0.3) * spinDir;
  world.position.set(sceneState.x, sceneState.y + mass.x * 0.42, sceneState.z);   // left behind by the scroll: up while travelling down
  const ut = pu.uT.value, tw = (morph.to >= 5 ? ut : 0) + (morph.from >= 5 ? 1 - ut : 0);   // how much a word (page word or logo) is showing
  points.rotation.y = (spin + leanX * 0.3) * (1 - tw) + leanX * 0.35 * tw;
  points.rotation.x = (sceneState.rotX + leanY * 0.15) * (1 - tw) - leanY * 0.2 * tw;
  if (blob.visible = sceneState.blobScale > 0.01) {
    blob.rotation.y = t * 0.1;
    blob.scale.setScalar(sceneState.blobScale);
  }

  // symbols drift upwards, rush past while scrolling, wrap around
  for (const s of symbols) {
    const u = s.userData;
    s.position.y += (u.vy + v * 4 * spinDir) * dt;
    if (s.position.y > 8) s.position.y = -8;
    if (s.position.y < -8) s.position.y = 8;
    s.material.rotation += u.vr * dt;
    s.material.opacity = symState.alpha * (u.base + Math.sin(t * 0.8 + u.ph) * 0.08 + v * 0.25);
  }
  symGroup.position.x = -leanX * 0.6;
  symGroup.position.y = -leanY * 0.4;

  // warp: widen the lens a touch at speed
  const fov = 45 + v * 4;
  if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // the camera drifts with the mouse (or the phone's tilt), steps back and rolls a little during a snap,
  // and pitches slightly the way the page is travelling
  camera.position.x += (leanX * 0.4 - camera.position.x) * 0.05;
  camera.position.y += (leanY * 0.3 - camera.position.y) * 0.05;
  camera.position.z = 9 + camFx.dolly;
  camera.lookAt(0, mass.x * -0.2, 0);
  if (camFx.roll) camera.rotateZ(camFx.roll);
  renderer.setRenderTarget(bgTarget);
  renderer.render(bgScene, bgCam);
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
gsap.ticker.add(render);
addEventListener("resize", () => {
  viewH = innerHeight;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  syncBgRes();
});
updateHud(START_SHAPE);
