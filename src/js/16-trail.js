/* ==================================================================
   Comet cursor trail
================================================================== */
if (finePointer && !reduce) {
  const cv = $("#trail"), cx = cv.getContext("2d");
  const N = 24, pts = Array.from({ length: N }, () => ({ x: -200, y: -200 }));
  let mx = -200, my = -200, live = false, still = 0;
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
  size();
  addEventListener("resize", size);
  addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY; still = 0;
    if (!live) { pts.forEach((p) => { p.x = mx; p.y = my; }); live = true; }
  }, { passive: true });
  gsap.ticker.add(() => {
    if (!live || perfState.low) return;
    pts[0].x += (mx - pts[0].x) * 0.65; pts[0].y += (my - pts[0].y) * 0.65;
    for (let i = 1; i < N; i++) { pts[i].x += (pts[i - 1].x - pts[i].x) * 0.42; pts[i].y += (pts[i - 1].y - pts[i].y) * 0.42; }
    cx.clearRect(0, 0, cv.width, cv.height);
    if (++still > 90) { live = false; return; }          // stops drawing when the mouse rests
    cx.globalCompositeOperation = "lighter";
    cx.lineCap = "round";
    for (let i = 1; i < N; i++) {
      const t = 1 - i / N;
      cx.strokeStyle = `hsla(${275 - i * 4}, 95%, ${55 + t * 20}%, ${t * 0.8})`;
      cx.lineWidth = t * 8;
      cx.beginPath(); cx.moveTo(pts[i - 1].x, pts[i - 1].y); cx.lineTo(pts[i].x, pts[i].y); cx.stroke();
    }
  });
}
