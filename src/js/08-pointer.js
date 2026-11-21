/* ==================================================================
   Interaction: cursor, magnets, portrait tilt, spotlight, typed text
================================================================== */
if (finePointer) {
  const cursor = $("#cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring");
  // the word the ring carries over things worth pressing ("Book", "Read"…). It travels with the ring but is its
  // own element, so it stays upright while the ring stretches and turns.
  const label = document.createElement("div");
  label.className = "cursor__label";
  label.innerHTML = "<b></b>";
  cursor.appendChild(label);
  gsap.set(label, { xPercent: -50, yPercent: -50 });               // centred on the pointer, whatever word it holds
  const dx = gsap.quickTo(dot, "x", { duration: 0.1 }), dy = gsap.quickTo(dot, "y", { duration: 0.1 });
  const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
  const lx = gsap.quickTo(label, "x", { duration: 0.45, ease: "power3" }), ly = gsap.quickTo(label, "y", { duration: 0.45, ease: "power3" });

  // A ring with weight: it stretches along its direction of travel in proportion to its speed and relaxes when
  // it stops; it squeezes while the button is down (tighter still while a charge builds) and springs back when
  // let go. The ticker below only runs while something is moving: a resting pointer costs nothing.
  const w = { x: 0, y: 0, s: 0, ang: 0, k: 1, live: false, idle: 0, popped: false };
  const at = gsap.getProperty(ring);
  const setRot = gsap.quickSetter(ring, "rotation", "deg"), setSX = gsap.quickSetter(ring, "scaleX"), setSY = gsap.quickSetter(ring, "scaleY");
  const tick = () => {
    const x = at("x"), y = at("y"), r = gsap.ticker.deltaRatio(60);
    const vx = (x - w.x) / r, vy = (y - w.y) / r, speed = Math.min(Math.hypot(vx, vy) / 46, 1);   // 46px a frame = flat out
    w.x = x; w.y = y;
    w.s += (speed - w.s) * 0.3;
    if (speed > 0.03) w.ang = Math.atan2(vy, vx) * 57.2958;
    setRot(w.ang); setSX((1 + w.s * 0.5) * w.k); setSY((1 - w.s * 0.28) * w.k);
    if (w.s > 0.004 || gsap.isTweening(w)) w.idle = 0;
    else if (++w.idle > 6) { gsap.ticker.remove(tick); w.live = false; setSX(w.k); setSY(w.k); }
  };
  const wake = () => {
    if (w.live || reduce) return;
    w.live = true; w.idle = 0; w.x = at("x"); w.y = at("y");
    gsap.ticker.add(tick);
  };
  const letGo = () => { wake(); gsap.to(w, { k: 1, duration: 0.6, ease: "elastic.out(1, 0.5)", overwrite: true }); };
  addEventListener("pointermove", (e) => { cursor.style.opacity = 1; dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); lx(e.clientX); ly(e.clientY); wake(); });
  if (!reduce) {
    addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; wake(); gsap.to(w, { k: 0.8, duration: 0.14, ease: "power2.out", overwrite: true }); }, { passive: true });
    addEventListener("pointerup", () => { if (w.popped) w.popped = false; else letGo(); }, { passive: true });
    addEventListener("pointercancel", letGo, { passive: true });
    bus.on("charge:start", () => { wake(); gsap.to(w, { k: 0.5, duration: 1.5, ease: "power2.out", overwrite: true }); });
    // released with a charge: the ring pops out past its size, the harder the longer it was held, and rings down
    bus.on("charge:release", ({ power, cancelled }) => {
      if (cancelled) return letGo();
      w.popped = true;                                             // (this release's own pointerup, which arrives right after, leaves the pop alone)
      wake();
      gsap.fromTo(w, { k: 1.25 + power * 0.7 }, { k: 1, duration: 0.9, ease: "elastic.out(1, 0.4)", overwrite: true });
    });
  }

  // what the ring says over what: the first match wins. (Buttons already say what they do in their own words, and
  // a second word laid over them only fights with the first: they keep the plain ring.)
  const LABELS = [[".btn", ""], ["[data-book], .slot", "Book"], [".chr", "Read"], [".vid:not(.is-soon)", "Play"], [".teaser__card, .subject__list a", "Open"], [".show .card:not(.is-front)", "Next"]];
  let said = "";
  document.addEventListener("pointerover", (e) => {
    const t = e.target, word = (LABELS.find(([sel]) => t.closest(sel)) || [])[1] || "";
    cursor.classList.toggle("is-hover", !!t.closest("a, button, .card, .stat, .chart__row"));
    if (word === said) return;
    said = word;
    if (word) label.firstChild.textContent = word;                 // (when it hides, it keeps its word while it fades)
    cursor.classList.toggle("is-label", !!word);
  });

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
