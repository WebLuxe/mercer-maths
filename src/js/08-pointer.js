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
    let tiltRaf = 0, lastEv = null;
    addEventListener("pointermove", (ev) => {
      lastEv = ev;
      if (tiltRaf || scrollY > innerHeight) return;
      tiltRaf = requestAnimationFrame(() => {
      tiltRaf = 0;
      const e = lastEv, r = host.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tX(gsap.utils.clamp(-18, 18, (px - 0.5) * 22));
      tY(gsap.utils.clamp(-18, 18, -(py - 0.5) * 22));
      card.style.setProperty("--hx", px * 100 + "%");
      card.style.setProperty("--hy", py * 100 + "%");
      });
    }, { passive: true });
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
