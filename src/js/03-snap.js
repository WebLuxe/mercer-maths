/* ==================================================================
   Full-screen section snapping (desktop)
   One flick = one section. Sections taller than the screen scroll
   freely until their end, then the next flick snaps onward.
   Registered before Lenis so it gets first say on wheel events.
================================================================== */
const panelMQ = matchMedia("(min-width: 900px) and (min-height: 560px)");
const snapOn = finePointer && !reduce;
const snapActive = () => snapOn && panelMQ.matches;
const snap = { busy: false, consumed: false, edge: false, lastWheel: 0 };
const sectionEls = $$("main > section");
const sectionBounds = () => sectionEls.map((el) => {
  const r = el.getBoundingClientRect();
  return { el, top: r.top + scrollY, bottom: r.top + scrollY + r.height };
});
const easeSnap = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
const ui = { book: false };
function snapTo(y, dur = 1.2) {
  if (!lenis) return;
  snap.busy = true;
  snap.consumed = true;
  bus.emit("snap:go", { y, dur, dir: Math.sign(y - scrollY) || 1 });
  lenis.scrollTo(y, { duration: dur, easing: easeSnap, lock: true, force: true, onComplete: () => { snap.busy = false; bus.emit("snap:land", { y }); } });
  setTimeout(() => (snap.busy = false), dur * 1000 + 300); // safety net
}
// the 3D carousel section has one stop per card
const carouselStops = (sec) => {
  const range = sec.bottom - sec.top - innerHeight, n = $$("#showTrack .card").length;
  return Array.from({ length: n }, (_, k) => sec.top + (range * k) / (n - 1));
};
// a box that scrolls by itself (the chapter list) gets the wheel first, until it reaches its end
const innerScroller = (el, dir) => {
  const box = el?.closest?.("[data-scroll-box]");
  if (!box || box.scrollHeight <= box.clientHeight + 1) return null;
  const room = dir > 0 ? box.scrollHeight - box.clientHeight - box.scrollTop : box.scrollTop;
  return room > 1 ? box : null;
};
function snapStep(dir, delta) {
  const secs = sectionBounds(), vh = innerHeight;
  const y = lenis.targetScroll;
  let i = 0;
  secs.forEach((s, k) => { if (s.top <= y + 2) i = k; });
  const cur = secs[i], minY = cur.top, maxY = Math.max(cur.top, cur.bottom - vh);
  if (cur.el.id === "method") {
    const stops = carouselStops(cur);
    const to = dir > 0 ? stops.find((p) => p > y + 2) : [...stops].reverse().find((p) => p < y - 2);
    if (to !== undefined) return snapTo(to, 0.95);
    if (dir > 0 && secs[i + 1]) return snapTo(secs[i + 1].top);
    if (dir < 0 && secs[i - 1]) { const p = secs[i - 1]; return snapTo(Math.max(p.top, p.bottom - vh)); }
    return;
  }
  if (dir > 0) {
    if (y < maxY - 2) {                         // still content below in this section
      const to = Math.min(y + delta, maxY);
      lenis.scrollTo(to, { lerp: 0.1 });
      if (to >= maxY - 2) snap.edge = true;
      return;
    }
    if (snap.edge || !secs[i + 1]) return;     // wait for a fresh flick at the edge
    snapTo(secs[i + 1].top);
  } else {
    if (y > minY + 2) {
      const to = Math.max(y + delta, minY);
      lenis.scrollTo(to, { lerp: 0.1 });
      if (to <= minY + 2) snap.edge = true;
      return;
    }
    if (snap.edge || !secs[i - 1]) return;
    const prev = secs[i - 1];
    snapTo(Math.max(prev.top, prev.bottom - vh));   // land on the end of a tall previous section
  }
}
if (snapOn) {
  addEventListener("wheel", (e) => {
    if (ui.book || !lenis || !snapActive() || document.body.classList.contains("is-loading")) return;
    const now = performance.now(), gap = now - snap.lastWheel;
    snap.lastWheel = now;
    if (gap > 220) { snap.consumed = false; snap.edge = false; }   // a new gesture started
    e.stopImmediatePropagation();
    if (!snap.busy && Math.abs(e.deltaY) >= 1 && innerScroller(e.target, Math.sign(e.deltaY))) {
      snap.consumed = true;                                         // the list scrolls natively; this gesture can't also snap
      return;                                                       // (no preventDefault: the browser scrolls the box)
    }
    e.preventDefault();
    if (snap.busy || snap.consumed) return;                        // swallow trackpad inertia
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= innerHeight;
    if (Math.abs(d) < 1) return;
    snapStep(Math.sign(d), d);
  }, { passive: false, capture: true });

  addEventListener("keydown", (e) => {
    if (ui.book || !lenis || !snapActive() || document.body.classList.contains("is-loading")) return;
    if (e.target.closest("input, textarea, select, [contenteditable], [data-scroll-box]")) return;
    let dir = { ArrowDown: 1, PageDown: 1, " ": 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (!dir || (e.key === " " && e.target.closest("button, a"))) return;
    if (e.key === " " && e.shiftKey) dir = -1;
    e.preventDefault();
    if (snap.busy) return;
    snap.edge = false;
    snapStep(dir, dir * innerHeight * 0.6);
  }, { capture: true });
}

// side dots: one per section, click to jump
const dotsEl = $("#dots");
const DOT_LABELS = { notes: "Notes", videos: "Videos", teaser: "Tuition", timetable: "Timetable", about: "Tutor", results: "Results", subjects: "Subjects", method: "Method", example: "Lesson", quiz: "Quiz", journey: "Story", students: "Students", fees: "Fees", faq: "FAQ", contact: "Contact" };
sectionEls.forEach((el, i) => {
  const b = document.createElement("button");
  b.setAttribute("aria-label", "Go to " + (DOT_LABELS[el.id] || "Home"));
  b.innerHTML = `<span>${DOT_LABELS[el.id] || "Home"}</span>`;
  b.addEventListener("click", () => (lenis ? snapTo(sectionBounds()[i].top) : el.scrollIntoView()));
  dotsEl.appendChild(b);
});
const dotBtns = [...dotsEl.children];
const navLinks = $$(".nav__links a");
let activeDot = -1;
function updateDots() {
  const mid = scrollY + innerHeight * 0.45;
  let i = 0;
  sectionBounds().forEach((s, k) => { if (s.top <= mid) i = k; });
  if (i === activeDot) return;
  const prev = activeDot;
  activeDot = i;
  dotBtns.forEach((b, k) => b.classList.toggle("is-on", k === i));
  const id = sectionEls[i].id;
  navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
  // (the first call happens while the page is still starting, before anything listens: read sectionEls[activeDot] for "now")
  bus.emit("section:change", { i, prev, id: id || "hero", el: sectionEls[i] });
}


if (!reduce && Lenis) {
  lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.stop();
  lenis.on("scroll", ScrollTrigger.update);
  lenis.on("scroll", () => updateDots());
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
if (!lenis) addEventListener("scroll", () => updateDots(), { passive: true });
updateDots();
// from here on, when the section changes its dot says its name for a moment, then tucks the label away again
{
  let flashed = null, flashT = 0;
  bus.on("section:change", ({ i }) => {
    clearTimeout(flashT);
    flashed?.classList.remove("is-flash");
    flashed = dotBtns[i];
    flashed.classList.add("is-flash");
    flashT = setTimeout(() => flashed.classList.remove("is-flash"), 1200);
  });
}
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id === "#" || a.hasAttribute("data-book")) return;
    e.preventDefault();
    const target = id === "#top" ? 0 : $(id);
    lenis ? lenis.scrollTo(target, { duration: 1.8 }) : target === 0 ? scrollTo({ top: 0 }) : target.scrollIntoView();
  })
);
