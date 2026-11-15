/* ==================================================================
   Scroll choreography
================================================================== */
function setupScroll() {
  // pinned sections first, so every trigger below them measures the extra pin space
  setupCarousel();

  gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  const nav = $("#nav");
  let navHidden = false;
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (s) => {
      const hide = s.direction === 1 && s.scroll() > 400;
      if (hide !== navHidden) {
        navHidden = hide;
        gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.6, ease: "expo.out", overwrite: "auto" });
      }
      nav.classList.toggle("is-solid", s.scroll() > 80);
    },
  });

  // Each section owns one finished shape + camera spot. Arriving at a section eases the scene there
  // (time-based, so fast scrolling never drags the particles through half-made shapes).
  const L = isMobile ? 0 : -2.5, R = isMobile ? 0 : 2.6;
  const STATES = {
    profile: {
      hero: [0, R, 0, 0, 0, isMobile ? 0 : 1.5], about: [1, R, 0, 0.4, 0, 0], results: [2, 0, -0.4, 0.55, -1, 0],
      journey: [3, L, 0, 0.6, 0, 0], students: [4, 0, -0.3, 1.05, 0, 0], teaser: [2, R, 0, 0.5, -1, 0],
      contact: [5, 0, 0.4, 0, -2.5, 0],
    },
    tuition: {
      hero: [5, isMobile ? 0 : 2.7, isMobile ? 1.2 : 0, 0, 0, 0], subjects: [4, 0, -0.3, 0.9, -1, 0], timetable: [3, L, 0, 0.55, -1, 0],
      method: [1, 0, 0, 0.4, -2, 0], example: [2, R, 0, 0.55, 0, 0], quiz: [0, L, 0, 0.2, 0, 0], fees: [4, 0, -0.3, 1, -1, 0],
      faq: [1, L, 0, 0.4, 0, 0], contact: [0, 0, 0, 0.2, 1.5, 0],
    },
    resources: {
      hero: [5, isMobile ? 0 : 2.7, 0, 0, 0, 0], notes: [1, 0, 0, 0.4, -2.5, 0], videos: [4, 0, -0.3, 1, -1.5, 0], contact: [0, 0, 0, 0.2, 1.5, 0],
    },
  }[PAGE] || {};
  const goState = (key, instant) => {
    const s = STATES[key];
    if (!s) return;
    const [shape, x, y, rotX, z, blobScale] = s;
    setShape(shape, instant);
    gsap.to(sceneState, { x, y, rotX, z, blobScale, duration: instant ? 0 : 1.8, ease: "power3.inOut", overwrite: "auto" });
  };
  $$("main > section").forEach((sec) => {
    const key = sec.classList.contains("hero") ? "hero" : sec.id;
    ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 45%", onToggle: (st) => st.isActive && goState(key) });
  });

  // depth between panels: the section you're leaving eases back, shrinks and dims
  if (!reduce) {
    $$("main > section.sec:not(.show)").forEach((sec) => {
      const inner = sec.querySelector(":scope > .wrap");
      if (!inner) return;
      gsap.fromTo(inner, { yPercent: 0, scale: 1, opacity: 1, rotationX: 0 }, {
        yPercent: -8, scale: 0.9, opacity: 0.1, rotationX: 16, transformPerspective: 1400, transformOrigin: "50% 100%", ease: "none",
        scrollTrigger: { trigger: sec, start: "bottom 85%", end: "bottom 15%", scrub: true },
      });
    });
  }

  // hero parallax out
  gsap.to(".hero__title", { yPercent: -35, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to("#portrait", { yPercent: 22, scale: 0.92, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // marquee skews with scroll speed
  const track = $(".marquee__track");
  const skewTo = gsap.quickTo(track, "skewX", { duration: 0.6, ease: "power3" });
  ScrollTrigger.create({ onUpdate: (s) => { skewTo(gsap.utils.clamp(-12, 12, s.getVelocity() / -250)); gsap.delayedCall(0.15, () => skewTo(0)); } });

  // about: words light up as you scroll
  // (time-based, not scroll-scrubbed: a snapped panel never scrolls "through" its own content)
  if ($("#aboutText")) gsap.to(splitWords($("#aboutText")), { opacity: 1, duration: 0.5, stagger: 0.07, ease: "power2.out", scrollTrigger: { trigger: "#aboutText", start: "top 80%" } });

  // headings
  $$(".reveal-line > span").forEach((el) =>
    gsap.from(el, { yPercent: 110, rotate: 4, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } })
  );
  $$("main section:not(.hero) .eyebrow, .reveal").forEach((el) =>
    gsap.from(el, { opacity: 0, x: -30, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } })
  );
  $$("main section:not(.hero) .eyebrow").forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: () => scramble(el) })
  );

  // quiz + FAQ entrances
  gsap.from("#quizBox", { y: 80, opacity: 0, scale: 0.96, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: "#quizBox", start: "top 88%" } });
  gsap.from(".faq__item", { y: 30, opacity: 0, duration: 0.9, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: "#faqList", start: "top 85%" } });

  // mobile booking bar: visible between the hero and the contact section
  const mbar = $("#mbar");
  ScrollTrigger.create({
    trigger: ".hero", start: "bottom 70%", endTrigger: "#contact", end: "top 85%",
    onToggle: (s) => mbar.classList.toggle("is-on", s.isActive),
  });

  // stats
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" }, onUpdate: () => (el.textContent = o.v.toFixed(dec)) });
  });
  gsap.from(".stat", { y: 60, opacity: 0, duration: 1.1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".stats", start: "top 85%" } });

  // chart
  gsap.from("#chart", { y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "#chart", start: "top 90%" } });
  if ($("#chart")) ScrollTrigger.create({ trigger: "#chart", start: "top 75%", once: true, onEnter: () => drawChart(currentSet, true) });

  // subjects
  $$(".subject").forEach((s) => {
    gsap.from(s, { y: 80, opacity: 0, rotateX: -12, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 88%" } });
    gsap.from(s.querySelectorAll("li"), { x: -30, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 70%" } });
  });

  setupWorked();

  // timeline
  gsap.to("#tlFill", { scaleY: 1, duration: 1.8, ease: "power2.inOut", scrollTrigger: { trigger: "#timeline", start: "top 80%" } });
  $$(".tl").forEach((el) => gsap.from(el, { x: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } }));

  gsap.from(".quote", { y: 80, opacity: 0, rotate: 2, duration: 1.2, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: ".quotes", start: "top 82%" } });
  gsap.from(".format", { y: 80, opacity: 0, duration: 1.2, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: ".formats", start: "top 82%" } });

  gsap.from(".contact__big", { yPercent: 40, scale: 0.85, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".contact", start: "top 75%" } });
  gsap.from(".contact__cta .btn, .contact__info > div", { y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".contact__cta", start: "top 92%" } });
}

/* ---------- section 4: 3D carousel, cards on a spinning cylinder ---------- */
function setupCarousel() {
  if (!$("#showTrack")) return;
  const ring = $("#showTrack"), cards = $$(".card", ring), N = cards.length, STEP = 360 / N;
  const now = $("#cardNow"), bar = $("#cardBar");
  const state = { rot: 0 };
  let R = 400, front = -1;
  const layout = () => {
    R = (cards[0].offsetWidth / 2) / Math.tan(Math.PI / N) + 60;
    cards.forEach((c, i) => (c.style.transform = `rotateY(${i * STEP}deg) translateZ(${R}px)`));
    apply();
  };
  const apply = () => {
    ring.style.transform = `translateZ(${-R}px) rotateY(${state.rot}deg)`;
    let best = 0, bestCos = -2;
    cards.forEach((c, i) => {
      let a = (i * STEP + state.rot) % 360;
      if (a > 180) a -= 360; if (a < -180) a += 360;
      const f = Math.cos((a * Math.PI) / 180);
      c.style.opacity = (0.12 + 0.88 * Math.pow(Math.max(f, 0), 1.6)).toFixed(3);
      if (f > bestCos) { bestCos = f; best = i; }
    });
    if (best !== front) {
      cards[front]?.classList.remove("is-front");
      cards[best].classList.add("is-front");
      front = best;
      now.textContent = String(best + 1).padStart(2, "0");
      gsap.fromTo(cards[best].querySelector(".card__sym"), { rotateY: -90, opacity: 0 }, { rotateY: 0, opacity: 1, duration: 0.9, ease: "expo.out", overwrite: true });
    }
  };
  const tween = gsap.to(state, {
    rot: -(N - 1) * STEP, ease: "none", onUpdate: apply,
    scrollTrigger: {
      trigger: "#method", pin: "#showPin", start: "top top", end: () => "+=" + innerHeight * 0.9 * (N - 1),
      scrub: true, invalidateOnRefresh: true,
      onUpdate: (st) => (bar.style.transform = `scaleX(${st.progress})`),
    },
  });
  // click a side card to spin it to the front
  cards.forEach((c, i) => c.addEventListener("click", (e) => {
    if (i === front || e.target.closest("a")) return;
    const st = tween.scrollTrigger, y = st.start + ((st.end - st.start) * i) / (N - 1);
    lenis ? snapTo(y, 1) : scrollTo({ top: y, behavior: "smooth" });
  }));
  ScrollTrigger.addEventListener("refresh", layout);
  layout();
}

/* ---------- worked example: board lines + parabola drawn on scroll ---------- */
function setupWorked() {
  if (!$("#parab")) return;
  const svg = $("#parab");
  const X = (x) => 30 + ((x + 1.5) / 6) * 370;
  const Y = (y) => 20 + ((10 - y) / 17.5) * 300;
  const g = svgEl("g", { class: "grid" }, svg);
  for (let x = -1; x <= 4; x++) svgEl("line", { x1: X(x), y1: Y(10), x2: X(x), y2: Y(-7.5) }, g);
  for (let y = -6; y <= 10; y += 2) svgEl("line", { x1: X(-1.5), y1: Y(y), x2: X(4.5), y2: Y(y) }, g);
  svgEl("line", { x1: X(-1.5), y1: Y(0), x2: X(4.5), y2: Y(0), class: "ax" }, svg);
  svgEl("line", { x1: X(0), y1: Y(10), x2: X(0), y2: Y(-7.5), class: "ax" }, svg);
  svgEl("text", { x: X(4.5) - 8, y: Y(0) - 8 }, svg).textContent = "x";
  svgEl("text", { x: X(0) + 8, y: Y(10) + 10 }, svg).textContent = "y";
  const sym = svgEl("line", { x1: X(1.25), y1: Y(9), x2: X(1.25), y2: Y(-6.125), stroke: "rgba(244,114,182,.45)", "stroke-dasharray": "4 5" }, svg);

  let d = "";
  for (let i = 0; i <= 120; i++) {
    const x = -1.3 + (i / 120) * 5.2, y = 2 * x * x - 5 * x - 3;
    d += (i ? "L" : "M") + X(x).toFixed(2) + " " + Y(y).toFixed(2);
  }
  const path = svgEl("path", { d, class: "curve" }, svg);
  const pl = path.getTotalLength();
  gsap.set(path, { strokeDasharray: pl, strokeDashoffset: pl });

  const r1 = svgEl("circle", { cx: X(-0.5), cy: Y(0), r: 6, class: "root" }, svg);
  const r2 = svgEl("circle", { cx: X(3), cy: Y(0), r: 6, class: "root" }, svg);
  const vx = svgEl("circle", { cx: X(1.25), cy: Y(-6.125), r: 5, class: "vx" }, svg);
  const t1 = svgEl("text", { x: X(-0.5) - 62, y: Y(0) - 10, class: "rl" }, svg); t1.textContent = "x = −½";
  const t2 = svgEl("text", { x: X(3) + 10, y: Y(0) + 22, class: "rl" }, svg); t2.textContent = "x = 3";
  const t3 = svgEl("text", { x: X(1.25) + 10, y: Y(-6.125) + 4 }, svg); t3.textContent = "(1.25, −6.125)";

  gsap.from(".worked__board, .worked__plot", { y: 80, opacity: 0, duration: 1.2, stagger: 0.15, ease: "expo.out", scrollTrigger: { trigger: "#worked", start: "top 88%" } });
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
  ScrollTrigger.create({ trigger: "#worked", start: "top 80%", once: true, onEnter: () => tl.timeScale(1.4).play() });
  $$(".worked__line").forEach((ln, i) => {
    tl.from(ln.querySelector(".eq"), { clipPath: "inset(0 100% 0 0)", duration: 1, ease: "none" }, i * 1.1)
      .from(ln.querySelector(".note"), { x: 20, opacity: 0, duration: 0.6 }, i * 1.1 + 0.6);
  });
  tl.to(path, { strokeDashoffset: 0, duration: 3.2, ease: "none" }, 0.4)
    .from(sym, { opacity: 0, duration: 0.6 }, 2.6)
    .from([vx, t3], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 2.4)
    .from([r1, t1], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 3.4)
    .from([r2, t2], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 3.7);
}
