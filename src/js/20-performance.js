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

// add ?fps to the URL to see real numbers on your own machine
if (/[?&]fps\b/.test(location.search)) {
  const box = document.createElement("div");
  box.className = "fps";
  document.body.appendChild(box);
  let frames = 0, t0 = performance.now();
  gsap.ticker.add(() => {
    frames++;
    const now = performance.now();
    if (now - t0 < 500) return;
    const fps = Math.round((frames * 1000) / (now - t0));
    box.textContent = `${fps} fps page\n3D every ${renderEvery} frame${renderEvery > 1 ? "s" : ""} · res ${dpr.toFixed(2)}x\nparticles ${perfState.low ? "60%" : "100%"}${perf.avg ? " · 3D frame " + perf.avg.toFixed(1) + "ms" : ""}`;
    frames = 0; t0 = now;
  });
}
