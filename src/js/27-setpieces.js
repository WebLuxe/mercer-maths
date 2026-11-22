/* ==================================================================
   Set pieces: three small scenes that play as their panel arrives.
   - Results: one ring of light stretches and splits into the three figures
   - Teaser: the four cards arrive as a staircase receding into the shaft, then deal out into their row
   - About: giant phrases cross the screen, one after another, behind the statement
   All three move only transforms and opacity, and none of them runs with reduced motion.
================================================================== */

/* ---- results: one ring becomes three ----
   A ring spins up over the middle figure, stretches sideways, and two more slide out of it to the figures either
   side. As they arrive the numbers start to roll (`roll`), and each ring opens out and fades. Positions are read as
   layout offsets, not screen positions: the panel may still be zooming in when this starts.
   Returns false when there is nothing to split (other pages, reduced motion): the caller then rolls the numbers itself. */
function setupRingSplit(roll) {
  const stats = $(".stats"), cells = stats ? $$(".stat:not(.stat--hero)", stats) : [];
  if (cells.length !== 3 || reduce) return false;
  const fx = document.createElement("div");
  fx.className = "rsplit";
  fx.setAttribute("aria-hidden", "true");
  fx.innerHTML = "<i></i><i></i><i></i>";
  stats.parentNode.appendChild(fx);
  const rings = [...fx.children], [left, mid, right] = rings;
  ScrollTrigger.create({ trigger: stats, start: () => (panelMQ.matches ? "top 78%" : "top 62%"), once: true, onEnter: () => {
    const d = Math.round(Math.min(cells[0].offsetHeight * 0.92, cells[0].offsetWidth * 0.66));
    const at = cells.map((c) => [c.offsetLeft + c.offsetWidth / 2, c.offsetTop + c.offsetHeight / 2]);
    gsap.set(rings, { left: 0, top: 0, width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, x: at[1][0], y: at[1][1], scale: 0.1, opacity: 0, rotate: -140 });
    gsap.timeline({ onComplete: () => fx.remove() })
      .to(rings, { scale: 1, opacity: 1, rotate: 0, duration: 0.5, ease: "back.out(1.7)" })
      .addLabel("split", "+=0.06")
      .to(mid, { scaleX: 1.9, duration: 0.24, ease: "power2.in" }, "split")
      .to(mid, { scaleX: 1, duration: 0.55, ease: "elastic.out(1, 0.55)" }, "split+=0.24")
      .to(left, { x: at[0][0], y: at[0][1], duration: 0.6, ease: "expo.inOut" }, "split+=0.04")
      .to(right, { x: at[2][0], y: at[2][1], duration: 0.6, ease: "expo.inOut" }, "split+=0.04")
      .call(roll, null, "split+=0.3")
      .to(rings, { scale: 1.8, opacity: 0, duration: 0.85, ease: "expo.out", stagger: { each: 0.07, from: "center" } }, "split+=0.7");
  } });
  return true;
}

/* ---- teaser: a staircase of cards ----
   Until the panel has all but landed, the cards stand in the middle of their row as a staircase: each one a step up,
   a step across and a size smaller than the one in front, like panels receding down the shaft. Then they are dealt:
   the front one first, each flying out to its own place in the row. (On a phone, where the row is a 2 × 2 grid, the
   same stack deals out to the four corners.) */
bus.on("scroll:setup", () => {
  const grid = $(".teaser"), cards = grid ? $$(".teaser__card", grid) : [];
  if (!cards.length || reduce) return;
  let dealt = false;
  const stack = () => {
    if (dealt) return;
    const n = cards.length, cx = grid.offsetLeft + grid.offsetWidth / 2, cy = grid.offsetTop + grid.offsetHeight / 2;
    cards.forEach((c, i) => {
      const k = i - (n - 1) / 2, step = Math.min(c.offsetWidth * 0.36, 104);
      gsap.set(c, {
        x: cx - (c.offsetLeft + c.offsetWidth / 2) + k * step, y: cy - (c.offsetTop + c.offsetHeight / 2) - k * step * 0.72,
        scale: 0.92 - i * 0.1, rotation: -5, opacity: 1 - i * 0.17, zIndex: n - i,
      });
    });
  };
  stack();
  ScrollTrigger.addEventListener("refresh", stack);              // (a resize before they are dealt: the middle has moved)
  ScrollTrigger.create({ trigger: grid, start: () => (panelMQ.matches ? "top 72%" : "top 78%"), once: true, onEnter: () => {
    dealt = true;
    gsap.to(cards, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 1.2, ease: "expo.out", stagger: 0.09, overwrite: "auto",
      onComplete: () => gsap.set(cards, { clearProps: "zIndex" }) });
  } });
});

/* ---- about: giant phrases crossing behind the statement ----
   Three phrases, each taller than a line of the statement is long, cross the screen right to left one after another
   in outline. They are plain CSS animations on three text layers (see .cross), so no script runs while they move,
   and like every looping animation they pause while the section is off screen. */
{
  const about = $("#about > .wrap");
  if (about && !reduce) {
    const row = document.createElement("div");
    row.className = "cross";
    row.setAttribute("aria-hidden", "true");
    row.innerHTML = ["foundations first", "past papers, every week", "until it clicks"].map((t, i) => `<span style="--i:${i}">${t}</span>`).join("");
    about.prepend(row);
  }
}
