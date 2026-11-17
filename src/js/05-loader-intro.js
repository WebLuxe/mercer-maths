/* ==================================================================
   Intro: the particles fly in from everywhere and spell KAVISH MATHS,
   hold for a beat, then a shockwave blasts the letters apart and they
   pour into the page's own shape while the page builds around them.
   (After a page transition there's no logo: the page builds straight away.)
================================================================== */
const count = { v: 0 };
const statuses = ["Loading", "Plotting points", "Assembling", "Ready"];
const ready = Promise.all([
  document.fonts?.ready ?? Promise.resolve(),
  new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r))),
]);
const setCount = () => {
  const v = Math.round(count.v);
  $("#loaderCount").textContent = v;
  $("#loaderBar").style.transform = `scaleX(${count.v / 100})`;
  $("#loaderStatus").textContent = statuses[v >= 100 ? 3 : Math.min(2, Math.floor(v / 34))];
};
const ptIn = document.documentElement.classList.contains("pt-in");
if (ptIn) {
  $("#loader")?.remove();
  ready.then(() => {
    document.body.classList.remove("is-loading");
    buildTextShape(TEXT_SHAPE[0], TEXT_SHAPE[1]);
    intro();
    lenis?.start();
    ScrollTrigger.refresh();
    const target = location.hash && $(location.hash);
    if (target) lenis ? lenis.scrollTo(target, { immediate: true, force: true }) : target.scrollIntoView();
    revealPage();
  });
} else {
  // the logo is drawn in the site's display font, so wait for that font first (a fraction of a second)
  const font = (document.fonts?.load('700 200px "Space Grotesk"') ?? Promise.resolve()).catch(() => {});
  const assembled = font.then(() => new Promise((done) => {
    const h = buildLogoShape();
    $("#loader").style.setProperty("--logo-h", h || 0.2);
    pMat.uniforms.uSize.value = P_SIZE * dpr * 1.2;           // slightly fuller points while they spell the name
    const tl = gsap.timeline({ onComplete: done });
    if (reduce) tl.timeScale(3);
    tl.to(".loader__veil", { opacity: 0, duration: 0.8, ease: "power2.out" })
      .to(pMat.uniforms.uIntro, { value: 1, duration: 2, ease: "expo.out" }, 0)       // particles rush in and lock into letters
      .to(bgMat.uniforms.uIntro, { value: 0.4, duration: 2, ease: "power2.out" }, 0.1)  // the room stays dim: the logo is the light
      .from(".loader__foot", { opacity: 0, y: 10, duration: 0.6, ease: "power2.out" }, 0.2)
      .to(count, { v: 100, duration: 1.8, ease: "power2.inOut", onUpdate: setCount }, 0.1)
      .from(".loader__tag span, .loader__tag em", { yPercent: 120, opacity: 0, duration: 1, stagger: 0.12, ease: "expo.out" }, 0.9)
      .to({}, { duration: 0.35 });                                                       // hold the logo a beat
  }));
  Promise.all([ready, assembled]).then(() => {
    $(".loader__veil")?.remove();
    buildTextShape(TEXT_SHAPE[0], TEXT_SHAPE[1]);
    intro();
  });
}

function intro() {
  const tl = gsap.timeline();
  if (reduce) tl.timeScale(4);                          // reduced motion: same steps, over in a moment
  // the page can be scrolled as soon as it's open; the hero details keep settling in meanwhile
  const unlock = () => {
    $("#loader")?.remove();
    document.body.classList.remove("is-loading");
    lenis?.start();
    ScrollTrigger.refresh();
    // a link like resources.html#notes, opened directly: go there once the page can scroll
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (target) lenis ? lenis.scrollTo(target, { duration: 1.2, force: true }) : target.scrollIntoView();
  };
  const loader = $("#loader");
  if (loader) {
    // the logo draws in a breath, then a shockwave blasts it apart and the letters pour into the page's shape
    tl.to(points.scale, { x: 1.06, y: 1.06, z: 1.06, duration: 0.4, ease: "power2.in" })
      .to(".loader__tag > *", { yPercent: -120, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power2.in" }, 0)
      .to(".loader__foot, .loader__bar", { opacity: 0, duration: 0.35 }, 0)
      .call(() => {
        pMat.uniforms.uShock.value.set(0, 0, 0);
        pMat.uniforms.uShockAmp.value = 2.6;              // a big one for the intro (clicks get the normal one)
        gsap.to(pMat.uniforms.uShockAmp, { value: 1, duration: 0.1, delay: 1.6 });
        motion.shockT = clock.getElapsedTime();
        bgMat.uniforms.uRipple.value.set(0.5, 0.5);
        bgMat.uniforms.uRippleT.value = bgMat.uniforms.uTime.value;
        setShape(START_SHAPE);                          // the letters pour into the page's shape on impact…
        morph.tween?.timeScale(1.6);                    // …quickly, so they never settle back into the logo
        setupScroll();                                  // the hero takes over its spot in the scene
        gsap.to(sceneState, { ...HERO_SPOT, duration: 1.8, ease: "power3.inOut", overwrite: "auto" });
      })
      .to(points.scale, { x: 1, y: 1, z: 1, duration: 1, ease: "expo.out" })
      .to(pMat.uniforms.uSize, { value: P_SIZE * dpr, duration: 1.2, ease: "power2.out" }, "<")
      .to(bgMat.uniforms.uIntro, { value: 1, duration: 1.8, ease: "power2.out" }, "<")
      .call(() => document.documentElement.classList.remove("intro"), null, "<0.5")
      .addLabel("build", "<")
      .call(unlock, null, "build+=0.6");
  } else {
    tl.addLabel("build", 0.15)
      .to(pMat.uniforms.uIntro, { value: 1, duration: 2.6, ease: "expo.out" }, "build")
      .to(bgMat.uniforms.uIntro, { value: 1, duration: 2.2, ease: "power2.out" }, "build");
  }
  // the page builds itself: the words, then the details
  tl.call(makeSymbols, null, "build")
    .to(symState, { alpha: 1, duration: 2.5, ease: "power2.out" }, "build+=0.2")
    .from(".hero__title .ch", { yPercent: 120, rotate: 12, duration: 1.3, stagger: 0.03, ease: "expo.out" }, "build+=0.05")
    .fromTo(".nav", { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out" }, "<0.1")
    .call(() => scramble($(".hero .eyebrow")), null, "<")
    .from(".hero-fade", { y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out" }, "<0.2")
    .from("#dots button", { x: 30, opacity: 0, duration: 0.8, stagger: 0.04, ease: "expo.out" }, "<0.1")
    .to(blobMat.uniforms.uAlpha, { value: 1, duration: 2, ease: "power2.out" }, "<")
    .to("#portraitFrame", { clipPath: "inset(0% 0 0 0 round 28px)", duration: 1.5, ease: "expo.inOut" }, "<-0.2")
    .to("#portraitFrame img", { scale: 1, duration: 2, ease: "expo.out" }, "<0.3")
    .from(".portrait__name", { y: 20, opacity: 0, duration: 1, ease: "expo.out" }, "<0.4")
    .from(".portrait__badge", { scale: 0, opacity: 0, duration: 0.9, stagger: 0.15, ease: "back.out(2)" }, "<0.2")
    .from(".hud", { opacity: 0, y: 20, duration: 1, ease: "expo.out" }, "<")
    .from(".hero__scroll", { opacity: 0, duration: 1 }, "<0.3");
  if (!loader) setupScroll();
}
