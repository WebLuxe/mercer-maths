/* ==================================================================
   Tabs: a pill that slides to whichever tab you point at.
   It has two edges that travel separately: the edge facing the way it
   is going leaves first and arrives first, so the pill stretches as it
   travels, and both settle with a small overshoot.
================================================================== */
{
  const tabs = $(".tabs"), pill = $(".tabs__pill"), tabEls = $$(".tabs__tab");
  const current = tabEls.find((t) => t.classList.contains("is-current")) || tabEls[0];
  const edge = { l: 0, r: 0, max: 9999 };
  // (an overshoot at either end presses against the inside of the bar instead of poking out of it)
  const paint = () => { const l = Math.max(-2, edge.l), r = Math.min(edge.max, edge.r); gsap.set(pill, { x: l, width: Math.max(0, r - l) }); };
  const moveTo = (t, instant) => {
    tabEls.forEach((x) => x.classList.toggle("is-hot", x === t));
    const l = t.offsetLeft - 4, r = l + t.offsetWidth;
    if (instant || reduce) { gsap.killTweensOf(edge); edge.l = l; edge.r = r; paint(); return; }
    const right = l + r > edge.l + edge.r;                          // heading right: the right edge leads
    gsap.to(edge, { l, duration: right ? 0.62 : 0.42, ease: right ? "back.out(1.3)" : "back.out(1.9)", overwrite: "auto", onUpdate: paint });
    gsap.to(edge, { r, duration: right ? 0.42 : 0.62, ease: right ? "back.out(1.9)" : "back.out(1.3)", overwrite: "auto", onUpdate: paint });
  };
  if (tabs && current) {
    const place = () => { edge.max = tabs.clientWidth - 6; moveTo(current, true); };
    document.fonts?.ready.then(place);
    place();
    addEventListener("resize", place);
    tabEls.forEach((t) => t.addEventListener("pointerenter", () => moveTo(t)));
    tabs.addEventListener("pointerleave", () => moveTo(current));
  }
}
