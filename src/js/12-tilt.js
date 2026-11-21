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

  // The smaller pieces (timetable slots, chapter rows, video cards) don't tilt, but their edge catches the same
  // light. They are drawn and redrawn by other files, so one listener on the page serves them all. It measures at
  // most once a frame, and only while the pointer is moving over one of them.
  let lit = null, last = null, raf = 0;
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest?.(".slot, .chr, .vid");
    if (!el) return;
    lit = el; last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = lit.getBoundingClientRect();
      lit.style.setProperty("--gx", (last.clientX - r.left).toFixed(1) + "px");
      lit.style.setProperty("--gy", (last.clientY - r.top).toFixed(1) + "px");
    });
  }, { passive: true });
}
