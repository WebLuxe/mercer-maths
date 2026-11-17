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
let keepAfterIntro = 1.06;
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
    // do the one-off heavy work now, behind the veil, so nothing stalls a frame once things move:
    // compile every 3D material (the blob is hidden until the hero, so it would compile mid-pour) and decode the portrait
    const blobWas = blob.visible;
    blob.visible = true; renderer.compile(scene, camera); blob.visible = blobWas;
    $$(".hero img").forEach((im) => im.decode?.().catch(() => {}));
    const h = buildLogoShape();
    buildTextShape(TEXT_SHAPE[0], TEXT_SHAPE[1]);             // the page's own word too, now rather than at the blast
    makeSymbols();                                            // the floating maths symbols (still invisible) too
    $("#loader").style.setProperty("--logo-h", h || 0.2);
    const u = pMat.uniforms;
    u.uSize.value = P_SIZE * dpr * 1.35;                     // fuller…
    u.uBoost.value = 1.5;                                     // …and brighter points while they spell the name
    keepAfterIntro = u.uKeep.value; u.uKeep.value = 1.06;     // every particle takes part, even on the lighter quality tier
    const tl = gsap.timeline({ onComplete: done });
    if (reduce) tl.timeScale(3);
    tl.to(".loader__veil", { opacity: 0, duration: 0.8, ease: "power2.out" })
      .to(pMat.uniforms.uIntro, { value: 1, duration: 2, ease: "expo.out" }, 0)       // particles rush in and lock into letters
      .to(bgMat.uniforms.uIntro, { value: 0.4, duration: 2, ease: "power2.out" }, 0.1)  // the room stays dim: the logo is the light
      .from(".loader__foot", { opacity: 0, y: 10, duration: 0.6, ease: "power2.out" }, 0.2)
      .to(count, { v: 100, duration: 1.8, ease: "power2.inOut", onUpdate: setCount }, 0.1)
      .fromTo("#loaderLogo", { opacity: 0, scale: 1.04 }, { opacity: 0.92, scale: 1, duration: 1.1, ease: "power2.out" }, 0.75)  // the particles fuse into solid letters
      .from(".loader__tag span, .loader__tag em", { yPercent: 120, opacity: 0, duration: 1, stagger: 0.12, ease: "expo.out" }, 0.9)
      .to({}, { duration: 0.5 });                                                        // hold the logo a beat
  }));
  Promise.all([ready, assembled]).then(() => {
    $(".loader__veil")?.remove();
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
    const u = pMat.uniforms, POUR = 2.2;
    tl.to(points.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.45, ease: "power2.in" })
      .to("#loaderLogo", { opacity: 1, scale: 1.03, duration: 0.45, ease: "power2.in" }, 0)            // the word glows up…
      .to(".loader__tag > *", { yPercent: -120, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power2.in" }, 0)
      .to(".loader__foot, .loader__bar", { opacity: 0, duration: 0.35 }, 0)
      .addLabel("blast")
      .call(() => {
        u.uShock.value.set(0, 0, 0);
        u.uShockAmp.value = 1.8;                           // a bigger ring than a click
        motion.shockT = clock.getElapsedTime();
        bgMat.uniforms.uRipple.value.set(0.5, 0.5);
        bgMat.uniforms.uRippleT.value = bgMat.uniforms.uTime.value;
        // one controlled pour from the logo to the page's shape (set directly, so nothing can rush it)
        morph.tween?.kill();
        morph.from = LOGO; morph.to = morph.target = START_SHAPE;
        u.uFrom.value = LOGO; u.uTo.value = START_SHAPE; u.uT.value = 0;
        updateHud(START_SHAPE);
        morph.tween = gsap.to(u.uT, { value: 1, duration: POUR, ease: "power2.inOut", onComplete: () => { morph.tween = null; setShape(morph.target); } });
        gsap.to(sceneState, { ...HERO_SPOT, duration: POUR, ease: "power3.inOut", overwrite: "auto" });
      }, null, "blast")
      .to("#loaderLogo", { opacity: 0, scale: 1.1, duration: 0.3, ease: "power1.out" }, "blast")          // …and shatters with the particles
      .to(u.uSwirl, { value: 0.3, duration: 0.01 }, "blast")                                                // a calm, coherent pour (no random detours)
      .to(points.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "expo.out" }, "blast")
      .to(u.uSize, { value: P_SIZE * dpr, duration: POUR, ease: "power2.inOut" }, "blast")
      .to(u.uBoost, { value: 1, duration: POUR, ease: "power2.inOut" }, "blast")
      .to(u.uShockAmp, { value: 1, duration: 0.4 }, "blast+=1.4")
      .to(bgMat.uniforms.uIntro, { value: 1, duration: 1.8, ease: "power2.out" }, "blast")
      .call(() => document.documentElement.classList.remove("intro"), null, "blast+=0.7")
      .addLabel("build", "blast+=0.7")
      // the scroll engine and unlock wait until the particles have landed, so nothing hitches mid-pour
      .call(() => {
        gsap.to(u.uSwirl, { value: 1, duration: 0.6 });
        gsap.to(u.uKeep, { value: keepAfterIntro, duration: 1.2, ease: "power2.inOut" });
        setupScroll();
        unlock();
      }, null, "blast+=" + (POUR + 0.05));
  } else {
    tl.addLabel("build", 0.15)
      .to(pMat.uniforms.uIntro, { value: 1, duration: 2.6, ease: "expo.out" }, "build")
      .to(bgMat.uniforms.uIntro, { value: 1, duration: 2.2, ease: "power2.out" }, "build");
  }
  // the page builds itself: the words, then the details
  if (!loader) tl.call(makeSymbols, null, "build");
  tl.to(symState, { alpha: 1, duration: 2.5, ease: "power2.out" }, "build+=0.2")
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
