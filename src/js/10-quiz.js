/* ==================================================================
   Quiz
================================================================== */
if ($("#quizStage")) {
  const QUIZ = [
    { q: "If log<sub>2</sub> x = 5, what is x?", opts: ["10", "25", "32", "7"], a: 2,
      why: "<strong>log₂ x = 5 means 2⁵ = x.</strong> So x = 32. Logs are just powers asked backwards." },
    { q: "Differentiate y = 3x<sup>4</sup>.", opts: ["12x³", "3x³", "12x⁴", "4x³"], a: 0,
      why: "<strong>Bring the power down, then drop it by one:</strong> 3 × 4 × x³ = 12x³." },
    { q: "How many real roots does x<sup>2</sup> + 4x + 5 = 0 have?", opts: ["Two", "One", "None", "Infinitely many"], a: 2,
      why: "<strong>b² − 4ac = 16 − 20 = −4.</strong> A negative discriminant means the curve never touches the x-axis." },
  ];
  const stage = $("#quizStage"), dots = $$("#quizDots i"), countEl = $("#quizCount"), burstEl = $("#quizBurst"), box = $("#quizBox");
  let idx = 0, score = 0;

  const burst = (fromEl, n = 16) => {
    if (reduce) return;
    const b = box.getBoundingClientRect(), r = fromEl.getBoundingClientRect();
    const cx = r.left - b.left + r.width / 2, cy = r.top - b.top + r.height / 2;
    const sym = "∑∫π√∞Δθ✓+=";
    const colors = ["#8b5cf6", "#22d3ee", "#f472b6", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.textContent = sym[(Math.random() * sym.length) | 0];
      s.style.left = cx + "px"; s.style.top = cy + "px"; s.style.color = colors[i % 4];
      burstEl.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160;
      gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 },
        { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, scale: 1 + Math.random(), rotate: (Math.random() - 0.5) * 180, opacity: 0, duration: 1.2 + Math.random() * 0.6, ease: "expo.out", onComplete: () => s.remove() });
    }
  };

  const setDots = () => dots.forEach((d, i) => { d.classList.toggle("is-done", i < idx); d.classList.toggle("is-now", i === idx); });

  const swap = (render) => {
    const kids = [...stage.children];
    if (!kids.length) { render(); return; }
    gsap.to(kids, { y: -24, opacity: 0, duration: 0.35, stagger: 0.04, ease: "power2.in", onComplete: () => { render(); ScrollTrigger.refresh(); } });
  };

  function showQuestion() {
    const item = QUIZ[idx];
    setDots();
    countEl.textContent = `Question ${idx + 1} of ${QUIZ.length}`;
    swap(() => {
      stage.innerHTML = `<h3 class="quiz__q">${item.q}</h3><div class="quiz__opts">${item.opts
        .map((o, i) => `<button class="quiz__opt" data-i="${i}"><b>${"ABCD"[i]}</b>${o}</button>`).join("")}</div>`;
      gsap.from(".quiz__q", { y: 30, opacity: 0, duration: 0.8, ease: "expo.out" });
      gsap.from(".quiz__opt", { y: 30, opacity: 0, duration: 0.7, stagger: 0.06, delay: 0.1, ease: "expo.out" });
      $$(".quiz__opt", stage).forEach((btn) => btn.addEventListener("click", () => answer(btn)));
    });
  }

  function answer(btn) {
    const item = QUIZ[idx], pick = +btn.dataset.i, opts = $$(".quiz__opt", stage);
    opts.forEach((o) => (o.disabled = true));
    opts[item.a].classList.add("is-right");
    if (pick === item.a) { score++; burst(btn); } else btn.classList.add("is-wrong");
    bus.emit(pick === item.a ? "quiz:right" : "quiz:wrong", { btn, right: opts[item.a], idx });
    const last = idx === QUIZ.length - 1;
    const why = document.createElement("div");
    why.innerHTML = `<p class="quiz__why">${item.why}</p><button class="btn btn--fill quiz__next"><span>${last ? "See my score" : "Next question"}</span><span>→</span></button>`;
    stage.appendChild(why);
    gsap.from(why.children, { y: 20, opacity: 0, duration: 0.7, stagger: 0.1, ease: "expo.out" });
    why.querySelector(".quiz__next").addEventListener("click", () => { idx++; last ? showEnd() : showQuestion(); });
  }

  function showEnd() {
    setDots();
    countEl.textContent = "Your score";
    bus.emit("quiz:end", { score, total: QUIZ.length });
    const msg = [
      "That's exactly what the diagnostic paper is for. Every one of these is fixable in a few lessons.",
      "A start. The gaps are usually just one or two habits, and they're quick to fix.",
      "Nearly there. One slip on the day costs a grade, and that's what exam technique fixes.",
      "Full marks. You'd fit straight into the Grade 11 Add Maths group.",
    ][score];
    swap(() => {
      stage.innerHTML = `<div class="quiz__end"><div class="score"><span id="qs">0</span>/${QUIZ.length}</div><p>${msg}</p>
        <div class="row"><a href="#contact" class="btn btn--fill" id="qBook"><span>Book a free trial</span><span>↗</span></a><button class="btn btn--ghost" id="qAgain"><span>Try again</span></button></div></div>`;
      const o = { v: 0 };
      gsap.from(".quiz__end > *", { y: 30, opacity: 0, duration: 0.9, stagger: 0.1, ease: "expo.out" });
      gsap.to(o, { v: score, duration: 1, delay: 0.2, ease: "power2.out", onUpdate: () => ($("#qs").textContent = Math.round(o.v)) });
      if (score === QUIZ.length) gsap.delayedCall(0.9, () => burst($(".quiz__end .score"), 36));
      $("#qBook").addEventListener("click", (e) => { e.preventDefault(); openBook(); });
      $("#qAgain").addEventListener("click", () => { idx = 0; score = 0; showQuestion(); });
    });
  }

  showQuestion();
}
