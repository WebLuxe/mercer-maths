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
      hero: [0, R, 0, 0, 0, 0], about: [FACE, isMobile ? 0 : 3.1, isMobile ? 1.5 : 0.2, 0, 0, 0], results: [2, 0, -0.4, 0.55, -1, 0],
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

  // depth between panels: the one you leave eases back, the one you enter stands up (see setupDepth)
  setupDepth();

  // hero parallax out
  gsap.to(".hero__title", { yPercent: -35, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to("#portrait", { yPercent: 22, scale: 0.92, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // marquee: it skews with the scroll speed, and its drift follows the scroll too: faster the way you are going,
  // backwards when you scroll back up, easing home to its idle pace when you stop. (The drift is a CSS animation;
  // only its playback rate changes, so the browser keeps moving it by itself.)
  const track = $(".marquee__track");
  if (track) {
    const skewTo = gsap.quickTo(track, "skewX", { duration: 0.6, ease: "power3" });
    const belt = track.parentNode, drift = { rate: 1, set: 1 }, anim = (!reduce && track.getAnimations?.()[0]) || null;
    if (anim) anim.currentTime = (anim.currentTime || 0) + 34e6;   // a thousand laps in hand: room to run backwards for as long as anyone scrolls up
    const setRate = () => {
      if (drift.rate === drift.set || (Math.abs(drift.rate - drift.set) < 0.04 && drift.rate !== 1)) return;   // (small steps are skipped, but it always ends on exactly 1)
      drift.set = drift.rate;
      anim.updatePlaybackRate ? anim.updatePlaybackRate(drift.rate) : (anim.playbackRate = drift.rate);
    };
    const rateTo = anim && gsap.quickTo(drift, "rate", { duration: 0.7, ease: "power2.out", onUpdate: setRate });
    const home = gsap.delayedCall(0.15, () => { skewTo(0); rateTo?.(1); }).pause();   // the scroll has stopped: back to the idle drift
    ScrollTrigger.create({ onUpdate: (s) => {
      const v = s.getVelocity();
      skewTo(gsap.utils.clamp(-12, 12, v / -250));
      if (rateTo && !belt.classList.contains("is-off")) rateTo(gsap.utils.clamp(-5, 7, 1 + v / 320));   // (off screen its animation is paused anyway: nothing to steer)
      home.restart(true);
    } });
  }

  // about: words light up as you scroll
  // (time-based, not scroll-scrubbed: a snapped panel never scrolls "through" its own content)
  if ($("#aboutText")) gsap.to(splitWords($("#aboutText")), { opacity: 1, duration: 0.5, stagger: 0.07, ease: "power2.out", scrollTrigger: { trigger: "#aboutText", start: "top 80%" } });

  // headings: letters rise out of their line (see setupHeadings); eyebrows and lead paragraphs slide in
  setupHeadings();
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

  // stats: the numbers roll into place like a counter while their cards arrive
  const counts = $$("[data-count]"), countText = (el) => (+el.dataset.count).toFixed(+(el.dataset.dec || 0));
  if (reduce) counts.forEach((el) => (el.textContent = countText(el)));
  else if (counts.length) {
    // the three smaller figures wait for the ring that splits into them (27-setpieces.js); the headline figure rolls as its card arrives
    const small = counts.filter((el) => !el.closest(".stat--hero"));
    const split = setupRingSplit(() => small.forEach((el, i) => odometer(el, countText(el), i * 0.08)));
    ScrollTrigger.create({ trigger: ".stats", start: "top 85%", once: true, onEnter: () => counts.forEach((el, i) => (split && small.includes(el)) || odometer(el, countText(el), 0.15 + i * 0.1)) });
  }
  gsap.from(".stat", { y: 60, opacity: 0, duration: 1.1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".stats", start: "top 85%" } });

  // chart
  gsap.from("#chart", { y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "#chart", start: "top 90%" } });
  if ($("#chart")) ScrollTrigger.create({ trigger: "#chart", start: "top 75%", once: true, onEnter: () => drawChart(currentSet, true) });

  // subjects
  $$(".subject").forEach((s) => {
    gsap.from(s, { y: 80, opacity: 0, rotateX: -12, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 88%" } });
    gsap.from([...s.querySelectorAll("li")].slice(0, 10), { x: -30, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out", clearProps: "opacity,transform", scrollTrigger: { trigger: s, start: "top 70%", once: true } });
  });

  setupWorked();
  setupStory();

  // fees: the cards arrive, their prices roll into place and the ticks in each list appear one by one (.is-in)
  $$(".format__price").forEach((p) => {
    const t = p.firstChild, m = t && t.nodeType === 3 && t.textContent.match(/^(\D*)([\d,]+)(.*)$/s);
    if (!m) return;
    const num = document.createElement("span");
    num.className = "format__num";
    num.textContent = m[2];
    t.replaceWith(m[1], num, m[3]);
  });
  if (!reduce) $$(".format").forEach((f) => f.classList.add("is-pre"));
  revealEach(".format", { y: 90, opacity: 0, rotationX: -40, transformPerspective: 1000, transformOrigin: "50% 100%" }, { stagger: 0.12, start: "top 88%", duration: 1.2, then: (cards) => cards.forEach((c, i) => {
    c.classList.add("is-in");
    const num = $(".format__num", c);
    if (num) odometer(num, num.textContent, 0.25 + i * 0.12);
  }) });

  // contact: the buttons and the four details arrive (the headline is one of the headings above), and once the
  // panel has landed its main button asks for attention once: a ring that expands and fades. Not a loop.
  revealEach(".contact__cta .btn", { y: 30, opacity: 0 }, { stagger: 0.08, start: "top 94%", duration: 0.9, ease: "power3.out" });
  revealEach(".contact__info > div", { y: 30, opacity: 0 }, { stagger: 0.08, start: "top 94%", duration: 0.9, ease: "power3.out" });
  const cta = $(".contact__cta .btn--fill");
  if (cta && !reduce) ScrollTrigger.create({ trigger: ".contact", start: "top 20%", once: true, onEnter: () => gsap.delayedCall(0.9, () => {
    const w = cta.offsetWidth, h = cta.offsetHeight, grow = 18, ring = document.createElement("i");
    ring.className = "cta-ring";
    ring.style.cssText = `left:${cta.offsetLeft}px;top:${cta.offsetTop}px;width:${w}px;height:${h}px`;
    cta.parentNode.appendChild(ring);
    gsap.fromTo(ring, { opacity: 0.85, scaleX: 1, scaleY: 1 }, { opacity: 0, scaleX: 1 + (2 * grow) / w, scaleY: 1 + (2 * grow) / h, duration: 1.2, ease: "expo.out", onComplete: () => ring.remove() });
  }) });

  // later files add their own scroll-driven pieces here (after the pin above exists, so they measure its extra space)
  bus.emit("scroll:setup");
  // every trigger above was measured with the panels standing at rest; now the ones still to come can lean back
  depthArm();
}

/* ---------- depth between panels ----------
   Desktop panels change with a zoom-through: the section you leave grows past the camera and fades, and the one
   you enter grows out of the far end of the shaft the background flies down. Both are held in the middle of the
   screen while it happens (a translate cancels the scroll), and both follow the scroll position, so it plays in
   either direction, every time. They act on the same element, so each section keeps two amounts (how far it still
   has to arrive, how far it has left) and ONE function writes the result. At rest that result is exactly "no
   transform at all".
   Phones scroll freely through sections taller than the screen, so there the effect is a gentle rise at the very
   edges of the screen: nothing is dim or small where it is being read. The carousel's panel is pinned by the
   scroll engine, so its parts ease in and out without the zoom. */
const depth = { items: [], measuring: true };
function depthClear(it) {
  if (!it.on) return;
  it.on = false;
  for (const el of it.els) { el.style.transform = ""; el.style.transformOrigin = ""; el.style.opacity = ""; el.style.willChange = ""; el.style.maskImage = el.style.webkitMaskImage = ""; }
}
function depthWrite(it) {
  if (depth.measuring) return;
  const a = it.inST.progress < 1 ? 1 - it.inST.progress : 0, b = it.outST ? it.outST.progress : 0;   // 0..1: still to arrive, already left
  // at rest, and also while a panel has not started to arrive or has fully left: held in the middle of the screen it
  // would lie, unseen, on top of the panel being used and take its clicks
  if ((a < 0.0005 && b < 0.0005) || (panelMQ.matches && !it.flat && (a > 0.9995 || b > 0.9995))) return depthClear(it);
  // On a phone, the first write of a move asks the browser to keep the panel as one picture for as long as it moves.
  // (Desktop panels are kept that way all the time, by the panel styles: asking only when a move began made the
  // browser re-draw the whole panel at that moment and again when it ended, which froze a frame each time.)
  if (!it.on && !panelMQ.matches) for (const el of it.els) el.style.willChange = "transform, opacity";
  it.on = true;
  let tf, op, hole = "";
  if (!panelMQ.matches) {
    tf = `translateY(${(22 * a - 14 * b).toFixed(1)}px) scale(${(1 - 0.03 * a - 0.04 * b).toFixed(4)})`;
    op = (1 - 0.5 * a) * (1 - 0.5 * b);
  } else if (it.flat) {
    tf = `translateY(${(56 * a - 56 * b).toFixed(1)}px) scale(${(1 - 0.08 * a - 0.08 * b).toFixed(4)})`;
    op = (1 - 0.9 * a) * (1 - 0.9 * b);
  } else if (a > b) {
    // Zoom-through, arriving: the translate cancels the scroll, so the panel is held in the middle of the screen
    // and grows out of the far end of the shaft, appearing once the panel before it has gone past.
    const e = 1 - a, k = e * e * (3 - 2 * e);
    tf = `translateY(${(-100 * a).toFixed(2)}vh) scale(${(0.62 + 0.38 * k).toFixed(4)})`;
    op = Math.min(1, Math.max(0, (e - 0.12) / 0.3));
    // ...and it is seen through a round hole that opens from the middle of the screen, where the shaft's light is:
    // the panel is not faded in over the old one, you fly into the hole and it is what is inside. The hole is a
    // mask with a soft edge, and it stays on until the panel is at rest. (It was a clip-path at first: the moment
    // the circle outgrew the screen the browser dropped the clip and drew the panel's layers another way, and
    // the graphics card froze for a tenth of a second building that, in the middle of the zoom.)
    const hr = Math.max(0, e - 0.1) * Math.max(0, e - 0.1) * 150;
    hole = `radial-gradient(circle, #000 ${(hr * 0.9).toFixed(2)}vmax, transparent ${hr.toFixed(2)}vmax)`;
  } else {
    // ...leaving: held in place the same way, it grows past the camera and is gone by the half-way point
    tf = `translateY(${(100 * b).toFixed(2)}vh) scale(${(1 + 1.9 * b * b).toFixed(4)})`;
    op = Math.max(0, 1 - b / 0.5);
  }
  const origin = it.flat || !panelMQ.matches ? "" : "50% 50%";
  for (const el of it.els) { el.style.transform = tf; el.style.transformOrigin = origin; el.style.opacity = op.toFixed(3); el.style.maskImage = el.style.webkitMaskImage = hole; }
}
function depthArm() {
  depth.measuring = false;
  depth.items.forEach(depthWrite);
}
function setupDepth() {
  if (reduce) return;
  $$("main > section.hero, main > section.sec, main > section.contact").forEach((sec) => {
    // the carousel's box is pinned by the scroll engine and can't be moved as well: its heading and its stage move instead, without the tilt
    const flat = sec.classList.contains("show"), els = flat ? $$(".show__head, .show__stage", sec) : $$(":scope > .wrap", sec);
    if (!els.length) return;
    const it = { els, flat, on: false, inST: null, outST: null };
    // desktop panels: over the whole snap (the zoom holds both panels on screen). Phones: only in the bottom / top fifth of the screen (the middle is for reading).
    it.inST = ScrollTrigger.create({ trigger: sec, start: "top bottom", end: () => (panelMQ.matches && !flat ? "top top" : panelMQ.matches ? "top 15%" : "top 78%"), onUpdate: () => depthWrite(it) });
    // (the contact section is the last one: it never leaves)
    if (!sec.classList.contains("contact")) it.outST = ScrollTrigger.create({ trigger: sec, start: () => (panelMQ.matches && !flat ? "bottom bottom" : panelMQ.matches ? "bottom 85%" : "bottom 22%"), end: () => (panelMQ.matches && flat ? "bottom 15%" : "bottom top"),
      onUpdate: (st) => { depthWrite(it); if (panelMQ.matches && st.progress > 0.001 && st.progress < 0.999) dive.st = st; } });
    depth.items.push(it);
  });
  // Triggers are measured with every panel standing at rest: a tilted, shrunken panel would shift whatever is measured inside it.
  ScrollTrigger.addEventListener("refreshInit", () => { depth.measuring = true; depth.items.forEach(depthClear); });
  ScrollTrigger.addEventListener("refresh", depthArm);
}

/* ---------- section headings: the letters rise out of their line one after another ----------
   Every heading line is cut into words (which never break inside) and letters. Letters set one by one lose the
   kerning between them, so a line can come out a hair wider: any line whose height changes falls back to whole
   words, and failing that to the old whole-line rise, so the layout is never different from the plain heading.
   The rise itself is a CSS transition on each letter (see .is-wait in the base styles): this function only cuts
   the lines and lifts the class at the right moment, so the browser runs the motion by itself, off the main
   thread. Once a heading has played and its section is off screen again, it is put back as plain text. */
function setupHeadings() {
  if (reduce) return;
  // the contact headline joins in: its two lines get the same masks as every other heading
  const big = $(".contact__big");
  if (big && !$(".reveal-line", big)) {
    const texts = [$(".grad", big).textContent, big.lastChild.textContent.trim()];
    big.innerHTML = `<span class="reveal-line"><span class="grad"></span></span><span class="reveal-line"><span></span></span>`;
    $$(".reveal-line > span", big).forEach((s, i) => (s.textContent = texts[i]));
  }
  const heads = $$("main h2").filter((h) => $(".reveal-line", h));
  const lines = heads.flatMap((h) => $$(".reveal-line > span", h));
  // three passes over all the lines (read, write, read) rather than line by line: the page is laid out twice, not thirty times
  const plain = lines.map((l) => l.innerHTML), tall = lines.map((l) => l.parentNode.offsetHeight);
  const count = lines.map((l) => { l.classList.add("is-split", "is-wait"); return splitLine(l); });
  const wider = lines.map((l, i) => l.parentNode.offsetHeight !== tall[i]);
  if (wider.includes(true)) {
    lines.forEach((l, i) => { if (wider[i]) count[i] = splitLine(l, true); });
    const stillWider = lines.map((l, i) => wider[i] && l.parentNode.offsetHeight !== tall[i]);
    lines.forEach((l, i) => { if (stillWider[i]) { l.innerHTML = plain[i]; l.classList.replace("is-split", "is-rise"); } });
  }
  const tidy = new Map();                                            // section → put its heading back as plain text
  const offScreen = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting || !tidy.get(en.target)?.()) return;
    offScreen.unobserve(en.target);
  }));
  heads.forEach((h) => {
    const mine = $$(".reveal-line > span", h), sec = h.closest("section");
    let played = false;
    // screen readers get the heading as one phrase, not letter by letter
    h.setAttribute("aria-label", mine.map((l) => l.textContent).join(" "));
    mine.forEach((l, k) => {
      l.setAttribute("aria-hidden", "true");
      l.style.setProperty("--d", k * 0.12 + "s");                    // the second line follows the first
      l.style.setProperty("--s", Math.min(0.024, 0.34 / count[lines.indexOf(l)]).toFixed(4) + "s");   // letter after letter, a long line no slower than a short one
    });
    ScrollTrigger.create({ trigger: h, start: "top 90%", once: true, onEnter: () => {
      mine.forEach((l) => l.classList.remove("is-wait"));
      gsap.delayedCall(0.12 * mine.length + 1.5, () => { played = true; });
    } });
    tidy.set(sec, () => {
      if (!played) return false;
      mine.forEach((l) => { l.innerHTML = plain[lines.indexOf(l)]; l.classList.remove("is-split", "is-rise"); l.removeAttribute("aria-hidden"); l.removeAttribute("style"); });
      h.removeAttribute("aria-label");
      return true;
    });
    offScreen.observe(sec);
  });
}

/* ---------- Profile: the story timeline (the testimonials are 26-scanner.js) ---------- */
function setupStory() {
  // timeline: the line draws itself down the page, and each node lights up, with its year and text arriving,
  // at the moment the line reaches it
  const tline = $("#timeline");
  if (tline) {
    const rows = $$(".tl", tline), fill = $("#tlFill");
    if (reduce) { gsap.set(fill, { scaleY: 1 }); rows.forEach((r) => r.classList.add("is-lit")); }
    else {
      tline.classList.add("is-live");                                // (nodes wait unlit until the line arrives)
      let at = [];                                                   // where each node sits along the line: 0 = top, 1 = bottom
      const measure = () => { const H = tline.offsetHeight || 1; at = rows.map((r) => (r.offsetTop + 13) / H); };
      measure();
      ScrollTrigger.addEventListener("refresh", measure);
      const line = { p: 0, to: 0 };
      rows.forEach((r) => gsap.set(r.children, { x: 40, opacity: 0 }));
      const draw = () => {
        gsap.set(fill, { scaleY: line.p });
        rows.forEach((r, k) => {
          if (line.p < at[k] || r.classList.contains("is-lit")) return;
          r.classList.add("is-lit");
          gsap.to(r.children, { x: 0, opacity: 1, duration: 0.9, stagger: 0.07, ease: "expo.out" });
        });
      };
      // on a desktop panel every row is on screen at once: one unbroken stroke. On a phone each row draws the line down to itself.
      rows.forEach((r, k) => ScrollTrigger.create({ trigger: r, start: "top 90%", once: true, onEnter: () => {
        const to = panelMQ.matches || k === rows.length - 1 ? 1 : at[k] + 0.02;
        if (to <= line.to) return;
        line.to = to;
        gsap.to(line, { p: to, duration: 0.5 + (to - line.p) * 1.3, ease: "sine.inOut", overwrite: true, onUpdate: draw });
      } }));
    }
  }
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
      bus.emit("carousel:front", { i: best, prev: front, el: cards[best] });
      // a band of light crosses the card as it takes the front (not on the very first layout)
      if (front !== -1 && !reduce) try { cards[best].animate([{ translate: "-110% 0" }, { translate: "110% 0" }], { duration: 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::after" }); } catch (e) {}
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
  const glow = svgEl("path", { d, class: "curve curve--glow" }, svg);   // the curve's glow: a wide faint copy drawn under it
  const path = svgEl("path", { d, class: "curve" }, svg);
  const pl = path.getTotalLength();
  gsap.set([glow, path], { strokeDasharray: pl, strokeDashoffset: pl });

  const r1 = svgEl("circle", { cx: X(-0.5), cy: Y(0), r: 6, class: "root" }, svg);
  const r2 = svgEl("circle", { cx: X(3), cy: Y(0), r: 6, class: "root" }, svg);
  const vx = svgEl("circle", { cx: X(1.25), cy: Y(-6.125), r: 5, class: "vx" }, svg);
  const t1 = svgEl("text", { x: X(-0.5) - 62, y: Y(0) - 10, class: "rl" }, svg); t1.textContent = "x = −½";
  const t2 = svgEl("text", { x: X(3) + 10, y: Y(0) + 22, class: "rl" }, svg); t2.textContent = "x = 3";
  const t3 = svgEl("text", { x: X(1.25) + 10, y: Y(-6.125) + 4 }, svg); t3.textContent = "(1.25, −6.125)";
  // a glowing point rides the tip of the curve while it draws. Its route is sampled once, here, so drawing never measures anything.
  const tracer = svgEl("circle", { r: 5, class: "tracer", opacity: 0 }, svg);
  const route = Array.from({ length: 161 }, (_, i) => path.getPointAtLength((pl * i) / 160));
  const draw = { p: 0 };
  const ride = () => {
    const f = draw.p * 160, i = Math.min(159, f | 0), a = route[i], b = route[i + 1], k = f - i;
    tracer.setAttribute("cx", (a.x + (b.x - a.x) * k).toFixed(2));
    tracer.setAttribute("cy", (a.y + (b.y - a.y) * k).toFixed(2));
    path.style.strokeDashoffset = glow.style.strokeDashoffset = pl * (1 - draw.p);
  };

  gsap.from(".worked__board, .worked__plot", { y: 80, opacity: 0, duration: 1.2, stagger: 0.15, ease: "expo.out", scrollTrigger: { trigger: "#worked", start: "top 88%" } });
  // the board writes itself when the board arrives, the curve draws when the plot arrives: side by side on a
  // desktop that is the same moment, on a phone the plot waits until you have scrolled down to it
  const board = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
  const plot = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
  ScrollTrigger.create({ trigger: ".worked__board", start: "top 80%", once: true, onEnter: () => board.timeScale(1.4).play() });
  ScrollTrigger.create({ trigger: ".worked__plot", start: "top 80%", once: true, onEnter: () => plot.timeScale(1.4).play() });
  $$(".worked__line").forEach((ln, i) => {
    board.from(ln.querySelector(".eq"), { clipPath: "inset(0 100% 0 0)", duration: 1, ease: "none" }, i * 1.1)
      .from(ln.querySelector(".note"), { x: 20, opacity: 0, duration: 0.6 }, i * 1.1 + 0.6);
  });
  plot.to(draw, { p: 1, duration: 3.2, ease: "none", onUpdate: ride }, 0.4)
    .to(tracer, { opacity: 1, duration: 0.25 }, 0.4)
    .to(tracer, { opacity: 0, scale: 2.6, transformOrigin: "50% 50%", duration: 0.5 }, 3.6)
    .from(sym, { opacity: 0, duration: 0.6 }, 2.6)
    .from([vx, t3], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 2.4)
    .from([r1, t1], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 3.4)
    .from([r2, t2], { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 }, 3.7);
  if (reduce) tracer.remove();
}
