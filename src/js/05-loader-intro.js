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
    buildTextShape(TEXT_SHAPE[0], TEXT_SHAPE[1]);
    intro();
    lenis?.start();
    ScrollTrigger.refresh();
    const target = location.hash && $(location.hash);
    if (target) lenis ? lenis.scrollTo(target, { immediate: true, force: true }) : target.scrollIntoView();
    revealPage();
  });
} else {
  Promise.all([ready, loadTl.then()]).then(() => {
    buildTextShape(TEXT_SHAPE[0], TEXT_SHAPE[1]);
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
      // a link like resources.html#notes, opened directly: go there once the page can scroll
      const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (target) lenis ? lenis.scrollTo(target, { duration: 1.2, force: true }) : target.scrollIntoView();
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
