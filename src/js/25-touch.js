/* ==================================================================
   Touch: every tap is acknowledged.
   - The control under a finger looks pressed the moment it is touched
     (.is-press: browsers hold back :active on touch for a tenth of a
     second), and stays pressed just long enough to be seen on a quick tap.
   - A finished tap (quick, and the finger did not travel: a scroll is not
     a tap) leaves a ring where the finger was and is announced as "tap".
   - On phones that can, a tap on a control gives a short tick, a success
     a double tick, a mistake a longer stutter.
================================================================== */
{
  const PRESSABLE = ".btn, .tabs__tab, .chart__tabs button, .tt__filters button, .chips button, .slot, .quiz__opt:not(:disabled), .faq__q, .chr, .vid, .mbar, .subject__courses button, .chx__courses button, .subject__all, .subject__list a, .teaser__card, .rdr__i, .rdr__tabs button";
  const CONTROL = "a, button, input, select, textarea, label, .card";
  let ring = null, down = null, pressed = null, pressT = 0;
  const unpress = () => { clearTimeout(pressT); pressed?.classList.remove("is-press"); pressed = null; };
  addEventListener("pointerdown", (e) => {
    unpress();
    down = e.pointerType === "touch" && e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null;
    if (!down) return;
    pressed = e.target.closest?.(PRESSABLE);
    pressed?.classList.add("is-press");
  }, { passive: true });
  // the browser took the gesture over: it became a scroll, and nothing is pressed any more
  addEventListener("pointercancel", () => { down = null; unpress(); }, { passive: true });
  addEventListener("pointerup", (e) => {
    const d = down;
    down = null;
    if (!d || e.pointerId !== d.id) return unpress();
    const held = performance.now() - d.t;
    pressT = setTimeout(unpress, Math.max(0, 150 - held));                     // a quick tap still shows its press
    if (held > 450 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
    if (document.body.classList.contains("is-loading")) return;                // (nothing to tap during the intro)
    const x = e.clientX, y = e.clientY, el = e.target;
    bus.emit("tap", { x, y, el });
    if (el.closest?.(CONTROL)) buzz(8);
    if (reduce) return;
    if (!ring) {
      ring = document.createElement("i");
      ring.className = "tapring";
      ring.setAttribute("aria-hidden", "true");
      document.body.appendChild(ring);
    }
    // it opens fast and lingers a moment before it fades, so it is seen even under a thumb that is lifting away
    gsap.fromTo(ring, { x, y, scale: 0.3, opacity: 1 }, { scale: 1, duration: 0.6, ease: "expo.out", overwrite: true });
    gsap.to(ring, { opacity: 0, duration: 0.6, ease: "power2.in" });
  }, { passive: true });

  // results are felt as well as seen
  const good = () => buzz([10, 45, 22]), bad = () => buzz([28, 40, 28]);
  bus.on("quiz:right", good);
  bus.on("celebrate", good);
  bus.on("quiz:wrong", bad);
  bus.on("book:error", bad);
}
