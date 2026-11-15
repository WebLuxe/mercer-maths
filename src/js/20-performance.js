/* ==================================================================
   Performance engine: pause what you can't see
================================================================== */
{
  // CSS animations inside off-screen blocks stop ticking (marquee, glows, scroll hint, rings…)
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.target.classList.toggle("is-off", !en.isIntersecting)),
    { rootMargin: "120px 0px" }
  );
  $$("main > section, .marquee, .portrait").forEach((el) => io.observe(el));
  // page in a background tab or minimised: put the whole animation clock to sleep
  document.addEventListener("visibilitychange", () => (document.hidden ? gsap.ticker.sleep() : gsap.ticker.wake()));
}
