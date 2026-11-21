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
  const stage = $("#quizStage"), dots = $$("#quizDots i"), countEl = $("#quizCount");
  let idx = 0, score = 0;

  // symbols burst from the middle of an element (the shared burst, see 01b-motion-kit.js)
  const burstFrom = (el, n, celebrate) => {
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, n, celebrate);
  };
  // an option's letter badge turns into a tick, with a pop
  const tick = (opt, delay) => {
    const b = opt.querySelector("b");
    if (reduce) { b.textContent = "✓"; return; }
    gsap.timeline({ delay })
      .to(b, { scale: 0, duration: 0.12, ease: "power2.in" })
      .call(() => (b.textContent = "✓"))
      .to(b, { scale: 1, duration: 0.5, ease: "back.out(3)" });
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
    // right: the option fills with a quick sweep (.is-picked), its letter becomes a tick, symbols burst out of it.
    // wrong: it shakes, and the right answer pulses once and gets the tick instead.
    btn.classList.add("is-picked");
    opts[item.a].classList.add("is-right");
    if (pick === item.a) { score++; tick(btn, 0); burstFrom(btn, 16); } else { btn.classList.add("is-wrong"); tick(opts[item.a], 0.3); }
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
      // the score rolls into place inside a ring that draws round to the share you got right
      stage.innerHTML = `<div class="quiz__end"><div class="score"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="score__track" cx="60" cy="60" r="54"/><circle class="score__arc" cx="60" cy="60" r="54" pathLength="1"/></svg><span><span id="qs">0</span><small>/${QUIZ.length}</small></span></div><p>${msg}</p>
        <div class="row"><a href="#contact" class="btn btn--fill" id="qBook"><span>Book a free trial</span><span>↗</span></a><button class="btn btn--ghost" id="qAgain"><span>Try again</span></button></div></div>`;
      gsap.from(".quiz__end > *", { y: 30, opacity: 0, duration: 0.9, stagger: 0.1, ease: "expo.out" });
      odometer($("#qs"), score, 0.3);
      // (autoRound off: the ring's length is 1 unit, and GSAP would otherwise snap the offset to whole pixels: 1, then 0)
      gsap.to(".score__arc", { strokeDashoffset: 1 - score / QUIZ.length, autoRound: false, duration: reduce ? 0 : 1.4, delay: reduce ? 0 : 0.3, ease: "power3.inOut" });
      if (score === QUIZ.length) gsap.delayedCall(1.5, () => $(".quiz__end .score") && burstFrom($(".quiz__end .score"), 36, true));   // full marks: celebrate
      $("#qBook").addEventListener("click", (e) => { e.preventDefault(); openBook(); });
      $("#qAgain").addEventListener("click", () => { idx = 0; score = 0; showQuestion(); });
    });
  }

  showQuestion();
}
