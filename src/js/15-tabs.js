/* ==================================================================
   Tabs: a pill that slides to whichever tab you point at
================================================================== */
{
  const tabs = $(".tabs"), pill = $(".tabs__pill"), tabEls = $$(".tabs__tab");
  const current = tabEls.find((t) => t.classList.contains("is-current")) || tabEls[0];
  const moveTo = (t, instant) => {
    tabEls.forEach((x) => x.classList.toggle("is-hot", x === t));
    gsap.to(pill, { x: t.offsetLeft - 4, width: t.offsetWidth, duration: instant ? 0 : 0.55, ease: "expo.out" });
  };
  if (tabs && current) {
    const place = () => moveTo(current, true);
    document.fonts?.ready.then(place);
    place();
    addEventListener("resize", place);
    tabEls.forEach((t) => t.addEventListener("pointerenter", () => moveTo(t)));
    tabs.addEventListener("pointerleave", () => moveTo(current));
  }
}
