/* ==================================================================
   Kavish Maths — "Pure" edition. One small script for all five pages.
   No libraries: Web Animations for the load, one scroll handler, one
   IntersectionObserver for everything that arrives on scroll.
================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = matchMedia("(max-width: 760px)");
  const WHATSAPP = "23059238436";
  const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

  /* ---- nav: the black pill sits under the current page and slides to whichever link the pointer is on ---- */
  const nav = $(".nav");
  if (nav) {
    const pill = $(".nav__pill", nav), links = $$("a", nav), here = links.find((a) => a.hasAttribute("aria-current")) || links[0];
    const put = (a) => {
      pill.style.setProperty("--x", a.offsetLeft + "px");
      pill.style.setProperty("--w", a.offsetWidth + "px");
      links.forEach((l) => l.classList.toggle("is-on", l === a));
    };
    pill.style.transition = "none";
    put(here);
    requestAnimationFrame(() => requestAnimationFrame(() => (pill.style.transition = "")));
    links.forEach((a) => { a.addEventListener("pointerenter", () => put(a)); a.addEventListener("focus", () => put(a)); });
    nav.addEventListener("pointerleave", () => put(here));
    nav.addEventListener("focusout", () => put(here));
    addEventListener("resize", () => put(here));
    document.fonts?.ready.then(() => put(here));
  }

  /* ---- the date in the corner is today's ---- */
  const date = $("#date");
  if (date) {
    const tick = () => {
      const d = new Date(), two = (n) => String(n).padStart(2, "0");
      date.innerHTML = `${d.toLocaleDateString("en-GB", { weekday: "long" })}<br>${two(d.getHours())}.${two(d.getMinutes())} – ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
    };
    tick();
    setInterval(tick, 30000);
  }

  /* ---- numbers count up ---- */
  const count = (el, dur = 1400) => {
    const to = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "", suf = el.dataset.suf || "";
    const show = (v) => (el.textContent = pre + v.toFixed(dec) + suf);
    if (reduce) return show(to);
    const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / dur); show(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(step); };
    show(0);
    requestAnimationFrame(step);
  };

  /* ---- load: the title rises out of its masks, the photo un-blurs, everything else follows ---- */
  if (!reduce) {
    const up = (el, delay, dist = 14, dur = 900) => el.animate([{ opacity: 0, transform: `translateY(${dist}px)` }, { opacity: 1, transform: "none" }], { duration: dur, delay, easing: EASE, fill: "backwards" });
    $$(".mask > span").forEach((s, i) => s.animate([{ transform: "translateY(108%)" }, { transform: "none" }], { duration: 1000, delay: 120 + i * 110, easing: EASE, fill: "backwards" }));
    const photo = $(".hero__photo");
    photo?.animate([{ opacity: 0, transform: "translateY(40px)", filter: "grayscale(1) blur(14px)" }, { opacity: 1, transform: "none", filter: "grayscale(1) contrast(1.06) blur(0)" }], { duration: 1300, delay: 80, easing: EASE, fill: "backwards" });
    $$(".nav, .top__date, .top__cta").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(-18px)" }, { opacity: 1, transform: "none" }], { duration: 800, delay: 60 + i * 70, easing: EASE, fill: "backwards" }));
    $$("[data-rise]").forEach((el, i) => up(el, 380 + i * 55));
    $(".out__line i")?.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 1400, delay: 900, easing: EASE, fill: "backwards" });
  }
  $$(".hero [data-count], .phero [data-count]").forEach((el) => setTimeout(() => count(el), reduce ? 0 : 500));

  /* ---- statement: cut into words, which fill from grey to white in reading order as the block crosses the screen ---- */
  const say = $(".say__big");
  let words = [];
  if (say && !reduce) {
    const cut = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t.trim()) return frag.append(t);
            const w = document.createElement("span");
            w.className = "w"; w.textContent = t;
            frag.append(w); words.push(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") cut(n);
      });
    };
    cut(say);
    words.forEach((w) => (w._k = -1));
  }
  const fill = () => {
    if (!words.length) return;
    const r = say.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.88 - r.top) / (r.height + vh * 0.42))), head = p * (words.length + 3);
    words.forEach((w, i) => {
      const k = Math.round(Math.min(1, Math.max(0, (head - i) / 3)) * 20) / 20;      // a three-word soft edge
      if (k === w._k) return;
      w._k = k;
      const c = Math.round(111 + (244 - 111) * k);
      w.style.color = `rgb(${c},${c},${c})`;
    });
  };

  /* ---- scroll: the hero photo drifts, the statement fills ---- */
  const photo = $(".hero__photo");
  let queued = false;
  const onScroll = () => {
    queued = false;
    if (photo && !reduce && !phone.matches && scrollY < innerHeight * 1.4) photo.style.transform = `translateY(${(scrollY * 0.12).toFixed(1)}px)`;
    fill();
  };
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* ---- things that arrive as they scroll into view (.rv), each a beat after its neighbour ---- */
  document.documentElement.classList.add("js");
  $$(".rv").forEach((el) => el.style.setProperty("--i", [...el.parentNode.children].filter((c) => c.classList.contains("rv")).indexOf(el)));
  $$(".faces span").forEach((el, i) => el.style.setProperty("--i", i + 3));
  const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    seen.unobserve(en.target);
    en.target.classList.add("is-in");
    $$("[data-count]", en.target).forEach((n) => count(n));
    if (en.target.matches("[data-count]")) count(en.target);
  }), { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$(".rv, .bars").forEach((el) => seen.observe(el));

  /* ---- the laurel round the badge: two sprays of leaves ---- */
  const laurel = $(".laurel g");
  if (laurel) {
    let d = "";
    for (let i = 0; i < 9; i++) {                                     // from the bottom, up the left side; the right side mirrors it
      const th = 245 - i * 16.25, a = (th * Math.PI) / 180, x = 75 + 52 * Math.cos(a), y = 62 - 52 * Math.sin(a), rot = 180 - th - 24;
      for (const s of [1, -1]) { const X = (s === 1 ? x : 150 - x).toFixed(1); d += `<ellipse cx="${X}" cy="${y.toFixed(1)}" rx="4" ry="9" transform="rotate(${(s * rot).toFixed(1)} ${X} ${y.toFixed(1)})"/>`; }
    }
    laurel.innerHTML = d;
  }

  /* ---- classes: the weekly timetable, filtered by stage; a slot opens the contact page with that class filled in ---- */
  const tt = $("#tt");
  if (tt) {
    const SLOTS = [
      ["Mon", "15:30", "Grade 9", "7-9", "NCE Maths", 2], ["Mon", "17:30", "Grade 11", "10-11", "Add Maths", 1],
      ["Tue", "15:30", "Grade 7", "7-9", "Maths", 3], ["Tue", "17:30", "Grade 13", "12-13", "A Level Maths", 0],
      ["Wed", "15:30", "Grade 10", "10-11", "Maths", 2], ["Wed", "18:00", "Grade 11", "10-11", "Add Maths · online", 4],
      ["Thu", "15:30", "Grade 8", "7-9", "Maths", 1], ["Thu", "17:30", "Grade 12", "12-13", "A Level Maths", 3],
      ["Fri", "15:30", "Grade 10", "10-11", "Add Maths", 2], ["Fri", "17:30", "Grade 11", "10-11", "Maths", 0],
      ["Sat", "08:30", "Grade 13", "12-13", "A Level Maths", 1], ["Sat", "10:30", "Grade 9", "7-9", "NCE Maths", 4],
    ];
    const DAYS = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
    tt.innerHTML = Object.keys(DAYS).map((d) => `<div class="tt__day rv"><h3>${DAYS[d]}</h3>${SLOTS.filter((s) => s[0] === d).map(([, time, grade, band, subject, left]) =>
      `<a class="slot" data-band="${band}" href="contact.html?class=${encodeURIComponent(`${grade} ${subject}, ${DAYS[d]} ${time}`)}"><b>${time}</b><span>${grade}</span><span>${subject}</span><em>${left ? left + (left === 1 ? " seat left" : " seats left") : "Waiting list"}</em></a>`).join("")}</div>`).join("");
    $$(".rv", tt).forEach((el, i) => { el.style.setProperty("--i", i); seen.observe(el); });
    const chips = $$("#ttChips button");
    chips.forEach((b) => b.addEventListener("click", () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", c === b));
      $$(".slot", tt).forEach((s) => s.classList.toggle("is-dim", b.dataset.band !== "all" && s.dataset.band !== b.dataset.band));
    }));
  }

  /* ---- notes: every chapter, filtered by stage; a row asks for that chapter's notes on WhatsApp ---- */
  const notes = $("#notes");
  if (notes) {
    const COURSES = [
      ["7-9", "Grade 7", ["Integers and fractions", "Ratio and percentages", "Algebraic expressions", "Angles and triangles", "Area and perimeter"]],
      ["7-9", "Grade 8", ["Linear equations", "Indices", "Pythagoras' theorem", "Coordinates and graphs", "Data handling"]],
      ["7-9", "Grade 9 · NCE", ["Simultaneous equations", "Quadratic expressions", "Mensuration", "Trigonometry basics", "Probability"]],
      ["10-11", "O Level Maths · 4024", ["Variation", "Functions", "Circle theorems", "Vectors", "Matrices", "Statistics"]],
      ["10-11", "Add Maths · 4037", ["Quadratics", "Logarithms", "Differentiation", "Integration", "Trigonometric identities", "Binomial theorem"]],
      ["12-13", "A Level · 9709", ["Pure 1: Series", "Pure 1: Circular measure", "Pure 3: Complex numbers", "Pure 3: Differential equations", "Mechanics: Forces and equilibrium", "Statistics: The normal distribution"]],
    ];
    let n = 0;
    notes.innerHTML = COURSES.map(([band, course, chapters]) => chapters.map((c) =>
      `<a class="row" data-band="${band}" target="_blank" rel="noopener" href="${wa(`Hello, could I get the notes for ${course}: ${c}?`)}"><span class="row__n">${String(++n).padStart(2, "0")}</span><span class="row__t">${c}</span><span class="row__d">${course}</span><span class="tag">Request ↗</span></a>`).join("")).join("");
    const chips = $$("#noteChips button"), total = $("#noteCount");
    const show = (band) => {
      let k = 0;
      $$(".row", notes).forEach((r) => { const hid = band !== "all" && r.dataset.band !== band; r.classList.toggle("is-hid", hid); if (!hid) k++; });
      if (total) total.textContent = k;
    };
    chips.forEach((b) => b.addEventListener("click", () => { chips.forEach((c) => c.setAttribute("aria-pressed", c === b)); show(b.dataset.band); }));
    show("all");
  }

  /* ---- contact: the form writes the WhatsApp message ---- */
  const form = $("#book");
  if (form) {
    const asked = new URLSearchParams(location.search).get("class");
    if (asked) form.elements.message.value = `I'd like to try this class: ${asked}.`;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements;
      const text = [`Hello, I'd like to book a free trial lesson.`, `Name: ${f.name.value.trim()}`, `Grade: ${f.grade.value}`, `Format: ${f.format.value}`, f.message.value.trim() && `Note: ${f.message.value.trim()}`].filter(Boolean).join("\n");
      window.open(wa(text), "_blank", "noopener");
    });
  }
})();
