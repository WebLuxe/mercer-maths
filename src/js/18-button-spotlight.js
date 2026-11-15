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
