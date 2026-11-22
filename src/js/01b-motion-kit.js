/* ==================================================================
   Motion kit: small helpers the feature files share, so the same idea
   moves the same way wherever it appears (rolling numbers, bursts of
   symbols, reveals, a buzz on phones).
================================================================== */

/* ---- rolling numbers: every digit sits in its own masked column and rolls up to its value, left to right.
   Each column is exactly as wide as its final digit (an unseen copy of it holds the space), so nothing
   shifts while it rolls; and when the roll ends the element holds plain text again, so the layout and the
   text that screen readers and tests read are exactly the final number. */
function odometer(el, text, delay = 0) {
  text = String(text);
  el._odo?.kill();
  if (reduce) { el.textContent = text; return; }
  let col = 0;
  const cols = [...text].map((c) => {
    if (c < "0" || c > "9") return c;                             // a decimal point or a thousands comma just sits there
    const steps = 10 * Math.min(++col, 2) + +c;                   // digits that pass: one full turn, two from the second column on
    let strip = "";
    for (let s = 0; s <= steps; s++) strip += `<i>${s % 10}</i>`;
    return `<span class="odo__c"><span class="odo__k">${c}</span><span class="odo__s">${strip}</span></span>`;
  }).join("");
  el.innerHTML = `<span class="sr">${text}</span><span class="odo" aria-hidden="true">${cols}</span>`;
  const tl = (el._odo = gsap.timeline({ delay, onComplete: () => { el.textContent = text; el._odo = null; } }));
  $$(".odo__s", el).forEach((s, i) => {
    const steps = s.children.length - 1;
    tl.to(s, { yPercent: (-100 * steps) / (steps + 1), duration: 1.2 + i * 0.13, ease: "power4.out" }, i * 0.09);
  });
  return tl;
}

/* ---- a burst of maths symbols from a point on the screen: a right answer, full marks, a finished booking.
   They fly on one fixed layer above everything (so they aren't cut off by the card they came from). */
let burstLayer = null;
function burst(x, y, n = 16, celebrate = false) {
  if (celebrate) bus.emit("celebrate", { x, y });
  if (reduce) return;
  if (!burstLayer) {
    burstLayer = document.createElement("div");
    burstLayer.className = "burst";
    burstLayer.setAttribute("aria-hidden", "true");
    document.body.appendChild(burstLayer);
  }
  if (perfState.low) n = Math.ceil(n / 2);                        // lighter on the low-power tier
  const SYM = "∑∫π√∞Δθ✓+=", COLORS = ["#8b5cf6", "#22d3ee", "#f472b6", "#ffffff"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.textContent = SYM[(Math.random() * SYM.length) | 0];
    s.style.color = COLORS[i % 4];
    burstLayer.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160;
    gsap.fromTo(s, { x, y, xPercent: -50, yPercent: -50, scale: 0.4, opacity: 1, rotate: 0 },
      { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 40, scale: 1 + Math.random(), rotate: (Math.random() - 0.5) * 180, opacity: 0, duration: 1.2 + Math.random() * 0.6, ease: "expo.out", onComplete: () => s.remove() });
  }
}

/* ---- a short buzz on phones that can do it. Only ever called from a finished tap or a result (never from a
   scroll), and never when the visitor has asked for less motion. */
const buzz = (pattern) => {
  if (reduce || finePointer || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
};

/* ---- reveals: each thing arrives as it scrolls into view, and things that arrive together (a row of cards)
   are staggered as a group. One trigger for a whole grid used to play the lower rows before a phone had
   scrolled to them. "from" holds only start values (y, x, opacity, scale, rotate…): each goes back to rest.
   With reduced motion nothing is hidden and nothing moves. */
function revealEach(targets, from, { stagger = 0.1, start = "top 90%", duration = 1.1, ease = "expo.out", then } = {}) {
  const els = gsap.utils.toArray(targets);
  if (!els.length || reduce) return;
  gsap.set(els, from);
  const to = { duration, ease, stagger };
  // (transformPerspective and transformOrigin describe the 3D set-up of the move: they stay as they were set)
  for (const k in from) if (k !== "transformPerspective" && k !== "transformOrigin") to[k] = k === "opacity" || k === "scale" ? 1 : 0;
  ScrollTrigger.batch(els, { start, once: true, onEnter: (batch) => { gsap.to(batch, to); then?.(batch); } });
}
