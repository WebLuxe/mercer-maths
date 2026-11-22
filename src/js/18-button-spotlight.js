/* ==================================================================
   Buttons: a light inside that follows the pointer, a gradient fill that
   grows from where the pointer came in and drains toward where it left,
   and an arrow that flies through. (One set of listeners for every .btn,
   including the ones other files create later.)
================================================================== */
document.addEventListener("pointermove", (e) => {
  const b = e.target.closest?.(".btn");
  if (!b) return;
  const r = b.getBoundingClientRect();
  b.style.setProperty("--bx", e.clientX - r.left + "px");
  b.style.setProperty("--by", e.clientY - r.top + "px");
}, { passive: true });
{
  // where the fill starts from, or drains to: the pointer's spot at the moment it crosses the button's edge
  const origin = (b, e) => {
    const r = b.getBoundingClientRect();
    b.style.setProperty("--ox", gsap.utils.clamp(0, r.width, e.clientX - r.left).toFixed(1) + "px");
    b.style.setProperty("--oy", gsap.utils.clamp(0, r.height, e.clientY - r.top).toFixed(1) + "px");
  };
  const ARROWS = { "→": [1, 0], "↗": [1, -1], "↓": [0, 1], "↑": [0, -1] };
  document.addEventListener("pointerover", (e) => {
    const b = e.target.closest?.(".btn");
    if (!b || b.contains(e.relatedTarget)) return;
    origin(b, e);
    // an arrow at the end of the label is told which way it points, so it can fly out that way on hover
    const a = b.children.length > 1 && b.lastElementChild, dir = a && !a.classList.contains("btn__arrow") && ARROWS[a.textContent.trim()];
    if (dir) { a.style.setProperty("--fx", dir[0]); a.style.setProperty("--fy", dir[1]); a.classList.add("btn__arrow"); }
  }, { passive: true });
  document.addEventListener("pointerout", (e) => {
    const b = e.target.closest?.(".btn");
    if (b && !b.contains(e.relatedTarget)) origin(b, e);
  }, { passive: true });
  // a finger never "comes in": its fill starts under the fingertip
  document.addEventListener("pointerdown", (e) => {
    const b = e.pointerType !== "mouse" && e.target.closest?.(".btn");
    if (b) origin(b, e);
  }, { passive: true });
}

// teaser cards tilt too, with the same glare and lit edge as the other tilting cards (12-tilt.js)…
if (finePointer && !reduce) {
  $$(".teaser__card").forEach((el) => {
    el.insertAdjacentHTML("beforeend", `<i class="glare"></i>`);
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3" }), ry = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 18);
      rx(-(py - 0.5) * 18);
      el.style.setProperty("--gx", px * 100 + "%");
      el.style.setProperty("--gy", py * 100 + "%");
      el.classList.add("is-tilting");
    });
    el.addEventListener("pointerleave", () => { rx(0); ry(0); el.classList.remove("is-tilting"); });
  });
}
// (how they arrive, as a staircase that deals out into the row, is in 27-setpieces.js)
