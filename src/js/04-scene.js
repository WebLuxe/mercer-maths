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
// The background is soft by nature, so it's drawn at half resolution into a texture and
// stretched to full screen: ~75% fewer shader pixels per frame, no visible difference.
const BG_SCALE = 0.5;
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
points.frustumCulled = false;
const perfState = { low: false };
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
  else if (avg > 21 && !perfState.low) { perfState.low = true; pGeo.setDrawRange(0, Math.floor(COUNT * 0.6)); }
  else if (avg < 12 && dpr < DPR_MAX) { dpr = Math.min(DPR_MAX, dpr + 0.25); applyDpr(); }
}

// ---- one render loop, driven by GSAP's ticker (same frame as Lenis + ScrollTrigger)
const clock = new THREE.Clock(), ndc = new THREE.Vector3(), tmp = new THREE.Vector3();
let prevScroll = scrollY, spin = 0;
// measure the screen's refresh rate once
let frameNo = 0, renderEvery = 1;
{
  let n = 0;
  const t0 = performance.now();
  const probe = () => {
    if (++n < 90) return;
    gsap.ticker.remove(probe);
    renderEvery = 1000 * n / (performance.now() - t0) > 100 ? 2 : 1;
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
  const fov = 45 + v * 9;
  if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.05;
  camera.position.y += (mouse.y * 0.3 - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);
  renderer.setRenderTarget(bgTarget);
  renderer.render(bgScene, bgCam);
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
gsap.ticker.add(render);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  syncBgRes();
});
