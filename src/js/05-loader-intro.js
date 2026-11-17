/* ==================================================================
   Loader → intro
================================================================== */
const count = { v: 0 };
const statuses = ["Sharpening pencils", "Expanding brackets", "Differentiating", "Checking the mark scheme", "Ready"];
const ready = Promise.all([
  document.fonts?.ready ?? Promise.resolve(),
  new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r))),
]);
// the curve plots itself as the count climbs, with a light riding its tip
const ldCurve = $("#loaderCurve"), ldGlow = $(".loader__glow"), ldDot = $("#loaderDot");
const ldLen = ldCurve ? ldCurve.getTotalLength() : 0;
if (ldCurve) gsap.set([ldCurve, ldGlow], { strokeDasharray: ldLen, strokeDashoffset: ldLen });
const loadTl = gsap.timeline();
loadTl
  .to(".loader__word .ch", { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.035, ease: "expo.out" })
  .from(".loader__fx, .loader__bar, .loader__status", { y: 14, opacity: 0, duration: 0.7, stagger: 0.06, ease: "power3.out" }, 0.15)
  .to(count, {
    v: 100, duration: reduce ? 0.3 : 1.6, ease: "power2.inOut",
    onUpdate() {
      const v = Math.round(count.v), k = count.v / 100;
      $("#loaderCount").textContent = v;
      $("#loaderBar").style.transform = `scaleX(${k})`;
      $("#loaderStatus").textContent = statuses[Math.min(4, Math.floor(v / 25))];
      if (ldCurve) {
        const off = ldLen * (1 - k), pt = ldCurve.getPointAtLength(ldLen * k);
        ldCurve.style.strokeDashoffset = ldGlow.style.strokeDashoffset = off;
        ldDot.setAttribute("cx", pt.x); ldDot.setAttribute("cy", pt.y);
      }
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
  // the page opens out of the light at the end of the curve (skipped after a page transition: no loader then)
  const loader = $("#loader");
  if (loader) {
    const dotBox = ldDot?.getBoundingClientRect();
    const ox = dotBox ? dotBox.left + dotBox.width / 2 : innerWidth / 2, oy = dotBox ? dotBox.top + dotBox.height / 2 : innerHeight / 2;
    const far = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)) + 60;
    gsap.set(loader, { "--x": ox + "px", "--y": oy + "px", "--r": "0px" });
    tl.to(ldDot, { attr: { r: 9 }, duration: 0.35, ease: "back.out(3)" })
      .to(".loader__word .ch", { y: "-110%", opacity: 0, filter: "blur(8px)", duration: 0.5, stagger: 0.02, ease: "power3.in" }, "<")
      .to(".loader__fx, .loader__bar, .loader__status, .loader__eqs", { y: -16, opacity: 0, duration: 0.4, stagger: 0.04, ease: "power2.in" }, "<")
      .to(".loader__plot .loader__grid, .loader__plot .loader__axis", { opacity: 0, duration: 0.4 }, "<")
      .set(".loader__iris", { opacity: 1 })
      .to(loader, { "--r": far + "px", duration: 1.15, ease: "power3.inOut" }, "-=0.05")
      .to(".loader__plot", { opacity: 0, scale: 1.12, filter: "blur(4px)", duration: 0.7, ease: "power2.in" }, "<0.1")
      .to(".loader__iris", { opacity: 0, duration: 0.4, ease: "power1.in" }, "-=0.4")
      .call(unlock);
  }                                                     // (after a page transition the page is already unlocked above)
  // the page builds itself: particles pour in, then the words, then the details
  tl.to(pMat.uniforms.uIntro, { value: 1, duration: 2.6, ease: "expo.out" }, loader ? "<-1" : 0.15)
    .to(bgMat.uniforms.uIntro, { value: 1, duration: 2.2, ease: "power2.out" }, "<")
    .call(makeSymbols, null, "<")
    .to(symState, { alpha: 1, duration: 2.5, ease: "power2.out" }, "<0.3")
    .from(".hero__title .ch", { yPercent: 120, rotate: 12, duration: 1.3, stagger: 0.03, ease: "expo.out" }, "<0.1")
    .fromTo(".nav", { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out" }, "<0.1")
    .call(() => scramble($(".hero .eyebrow")), null, "<")
    .from(".hero-fade", { y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out" }, "<0.25")
    .from("#dots button", { x: 30, opacity: 0, duration: 0.8, stagger: 0.04, ease: "expo.out" }, "<0.1")
    .to(blobMat.uniforms.uAlpha, { value: 1, duration: 2, ease: "power2.out" }, "<")
    .to("#portraitFrame", { clipPath: "inset(0% 0 0 0 round 28px)", duration: 1.5, ease: "expo.inOut" }, "<-0.2")
    .to("#portraitFrame img", { scale: 1, duration: 2, ease: "expo.out" }, "<0.3")
    .from(".portrait__name", { y: 20, opacity: 0, duration: 1, ease: "expo.out" }, "<0.4")
    .from(".portrait__badge", { scale: 0, opacity: 0, duration: 0.9, stagger: 0.15, ease: "back.out(2)" }, "<0.2")
    .from(".hud", { opacity: 0, y: 20, duration: 1, ease: "expo.out" }, "<")
    .from(".hero__scroll", { opacity: 0, duration: 1 }, "<0.3");
  setupScroll();
}
