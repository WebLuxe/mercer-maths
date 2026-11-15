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
