/* ==================================================================
   Kavish Maths — "Pure" edition. One script for all five pages, no
   libraries. In order: the curtain between pages, the tabs, the load
   animation, the deck (one screen per section on a desktop), what
   arrives on scroll, the pointer effects, and each page's own parts.
================================================================== */
(() => {
  window.__pure = true;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const deckMQ = matchMedia("(min-width: 761px) and (min-height: 480px)");
  const WHATSAPP = "23059238436";
  const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)", INOUT = "cubic-bezier(0.76, 0, 0.24, 1)";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  root.classList.add("js");

  /* ---- the curtain: every page arrives from behind a black sheet that lifts, and leaves behind one that rises ---- */
  const curtain = $(".curtain"), shutters = curtain ? $$("i", curtain) : [], word = curtain && $("b", curtain);
  let shows = 0;                                                    // ms until the page starts to show (the load animation waits for it)
  if (curtain && !reduce && root.classList.contains("cur-in")) {
    shows = 560;
    const ups = shutters.map((c, k) => c.animate([{ transform: "none" }, { transform: "translateY(-101%)" }], { duration: 780, delay: 300 + k * 75, easing: INOUT, fill: "forwards" }));
    $$("b, span", curtain).forEach((t) => t.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-30%) scale(0.9)" }], { duration: 380, delay: 180, easing: "ease-in", fill: "forwards" }));
    Promise.all(ups.map((u) => u.finished)).then(() => { root.classList.remove("cur-in"); curtain.getAnimations({ subtree: true }).forEach((x) => x.cancel()); }).catch(() => {});
  } else root.classList.remove("cur-in");
  if (curtain && !reduce) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname) || url.pathname === location.pathname) return;
      e.preventDefault();
      word.textContent = { "index.html": "Pure Maths", "classes.html": "Classes", "results.html": "Results", "notes.html": "Notes", "contact.html": "Contact" }[url.pathname.split("/").pop() || "index.html"] || "";
      const downs = shutters.map((c, k) => c.animate([{ transform: "translateY(101%)" }, { transform: "none" }], { duration: 520, delay: k * 60, easing: INOUT, fill: "forwards" }));
      $$("b, span", curtain).forEach((t) => t.animate([{ opacity: 0, transform: "translateY(60%) scale(1.15)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: 300, easing: EASE, fill: "forwards" }));
      Promise.all(downs.map((d) => d.finished)).then(() => setTimeout(() => (location.href = url.href), 160));
    });
    addEventListener("pageshow", (e) => { if (e.persisted) { curtain.getAnimations({ subtree: true }).forEach((x) => x.cancel()); root.classList.remove("cur-in"); } });
  }

  /* ---- warm-up, while the curtain is still down: every picture is decoded, and every panel is drawn once (each is
     lifted onto the screen, all but invisible, for a moment). The first time a browser draws something it has work
     to do, and without this that work landed in the middle of the first slide to each panel. ---- */
  $$("img").forEach((im) => im.decode?.().catch(() => {}));
  ["img/chalk.jpg", "img/board.jpg", "img/feed.jpg", "img/student.jpg"].forEach((src) => { const im = new Image(); im.src = src; im.decode?.().catch(() => {}); });
  if (!reduce && deckMQ.matches) {
    const later = $$(".panel").slice(1);
    later.forEach((p) => { p.style.position = "fixed"; p.style.inset = "0"; p.style.opacity = "0.01"; p.style.pointerEvents = "none"; });
    const back = () => later.forEach((p) => (p.style.position = p.style.inset = p.style.opacity = p.style.pointerEvents = ""));
    setTimeout(back, 420);
    ["wheel", "keydown", "pointerdown", "touchstart"].forEach((ev) => addEventListener(ev, back, { once: true, capture: true, passive: true }));
  }

  /* ---- tabs: the black pill sits under the current page and springs to whichever link the pointer is on ---- */
  const nav = $(".nav");
  if (nav) {
    const pill = $(".nav__pill", nav), links = $$("a", nav), here = links.find((a) => a.hasAttribute("aria-current"));
    const put = (a) => {
      pill.style.setProperty("--x", (a ? a.offsetLeft : 0) + "px");
      pill.style.setProperty("--w", (a ? a.offsetWidth : 0) + "px");
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
  const count = (el, dur = 1500) => {
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
    $$(".mask > span").forEach((line, i) => {
      line.closest("h1")?.setAttribute("aria-label", line.closest("h1").textContent.replace(/\s+/g, " ").trim());
      const text = line.textContent;
      line.textContent = "";
      [...text].forEach((c, k) => {
        const ch = document.createElement("span");
        ch.className = "ch"; ch.textContent = c; ch.setAttribute("aria-hidden", "true");
        line.append(ch);
        ch.animate([{ opacity: 0, transform: "translateY(55%) rotateX(-100deg) scale(0.7)" }, { opacity: 1, transform: "translateY(-6%) rotateX(12deg) scale(1.04)", offset: 0.62 }, { opacity: 1, transform: "none" }], { duration: 1000, delay: shows + 60 + i * 150 + k * 42, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)", fill: "backwards" });
      });
    });
    $(".hero__photo")?.animate([{ opacity: 0, transform: "translateY(90px) scale(1.22)", filter: "blur(22px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1700, delay: shows, easing: EASE, fill: "backwards" });
    $(".phero__img")?.animate([{ opacity: 0, transform: "scale(1.12)" }, { opacity: 0.16, transform: "none" }], { duration: 1800, delay: shows, easing: EASE, fill: "backwards" });
    $$(".nav, .hdate, .hcta").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(-22px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: shows + i * 80, easing: EASE, fill: "backwards" }));
    $$("[data-rise]").forEach((el, i) => el.animate([{ opacity: 0, transform: "perspective(800px) translateY(60px) rotateX(-55deg) scale(0.8)" }, { opacity: 1, transform: "perspective(800px) translateY(-4px) rotateX(6deg) scale(1.02)", offset: 0.65 }, { opacity: 1, transform: "perspective(800px) translateY(0) rotateX(0deg) scale(1)" }], { duration: 1050, delay: shows + 320 + i * 70, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)", fill: "backwards" }));
    $(".out__line i")?.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 1400, delay: shows + 900, easing: EASE, fill: "backwards" });
    $$(".bar .art > *").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 800, delay: shows + 700 + i * 90, easing: EASE, fill: "backwards" }));
  }
  $$(".hero [data-count], .phero [data-count]").forEach((el) => setTimeout(() => count(el), reduce ? 0 : shows + 450));

  /* ---- words: headings are cut into words that rise one by one; the statement into words that fill grey → white ---- */
  if (!reduce) $$(".head h2").forEach((h) => {
    let k = 0;
    const cut = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((t) => {
          if (!t.trim()) return frag.append(t);
          const o = document.createElement("span"), i = document.createElement("span");
          o.className = "wd"; i.textContent = t; i.style.setProperty("--w", k++);
          o.append(i); frag.append(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) { n.style.setProperty("--w", k++); }           // (a counter or other element inside the heading stays whole)
    });
    h.setAttribute("aria-label", h.textContent.trim());
    cut(h);
  });
  const say = $(".say__big");
  const words = [];
  if (say && !reduce) {
    const frag = document.createDocumentFragment();
    say.textContent.split(/(\s+)/).forEach((t) => {
      if (!t.trim()) return frag.append(t);
      const w = document.createElement("span");
      w.className = "w"; w.textContent = t; w._k = -1;
      frag.append(w); words.push(w);
    });
    say.replaceChildren(frag);
  }
  const fillTo = (p) => {                                            // p: 0 = all grey, 1 = all white, with a three-word soft edge between
    const head = p * (words.length + 3);
    words.forEach((w, i) => {
      const k = Math.round(clamp((head - i) / 3) * 20) / 20;
      if (k === w._k) return;
      w._k = k;
      const c = Math.round(111 + (244 - 111) * k);
      w.style.color = `rgb(${c},${c},${c})`;
    });
  };
  let filled = false;
  const fillByClock = () => {
    if (filled || !words.length) return;
    filled = true;
    const t0 = performance.now() + 350, dur = 2400;
    const step = (now) => { const p = clamp((now - t0) / dur); fillTo(p); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  /* ---- desktop: one screen per panel, with smooth snapping. One flick of the wheel or the trackpad, an arrow key or a dot
     glides the page exactly one panel (eased in and out, a little over a second) and it always rests on a whole panel.
     What happens in between follows the glide, so it also plays backwards:
       - the edge of the arriving panel bulges like a wave (see .cap in the styles);
       - what is inside each panel travels in layers at different speeds: headings lead, the blocks under them follow,
         and on the way out they stream off ahead of their panel;
       - the panel being left fades. ---- */
  const panels = $$(".panel"), inners = panels.map((p) => $(":scope > .panel__in", p));
  const stepper = fine && !reduce && panels.length > 1;
  if (stepper) root.classList.add("stepper");
  // each panel's layers and how far each travels (a share of the screen's height per screen scrolled).
  // The heroes' layers are moved by the styles instead, from --d (they already shift with the pointer there).
  const layers = panels.map((p, i) => {
    if (p.matches(".hero, .phero")) return null;
    const wrap = $(":scope > .wrap", inners[i]), head = wrap && $(":scope > .head", wrap);
    const rest = (wrap ? [...wrap.children] : [...inners[i].children]).filter((c) => c !== head);
    const out = head ? [[head, -0.1]] : [];
    if (!wrap) [...inners[i].children].forEach((c, k) => { if (c.classList.contains("wrap")) [...c.children].forEach((x, j) => out.push([x, -0.2 - j * 0.07])); else out.push([c, -0.12 - k * 0.1]); });
    else rest.forEach((c, k) => out.push([c, -0.24 - k * 0.08]));
    return out;
  });
  // the wave on each edge of each panel: an element before the panel's content (top edge) and one after it (bottom edge)
  const caps = panels.map((p) => {
    if (!stepper) return null;
    const t = document.createElement("i"), b = document.createElement("i");
    t.className = "cap cap--t"; b.className = "cap cap--b";
    t.setAttribute("aria-hidden", "true"); b.setAttribute("aria-hidden", "true");
    p.prepend(t); p.append(b);
    return [t, b];
  });
  let cur = 0, busy = false, glide = 0, dir = 1, lastY = scrollY, dots = [];
  const inDeck = () => deckMQ.matches;
  const mark = (i) => { dots.forEach((d, k) => d.setAttribute("aria-current", k === i)); };
  const paint = () => {
    const y = scrollY / innerHeight, live = inDeck() && !reduce;
    if (scrollY !== lastY) { dir = scrollY > lastY ? 1 : -1; lastY = scrollY; }
    panels.forEach((p, i) => {
      // d: −1 = a full screen below (still to arrive), 0 = filling the screen, 1 = a full screen above (gone)
      const d = live ? Math.round(clamp(y - i, -1, 1) * 800) / 800 : 0;
      if (d === p._d) return;
      p._d = d;
      inners[i].style.opacity = d > 0 ? (1 - 0.8 * d).toFixed(3) : "";
      if (!layers[i]) p.style.setProperty("--d", d);
      else for (const [el, k] of layers[i]) el.style.translate = d ? `0 ${(d * k * 100).toFixed(2)}vh` : "";
    });
    // the wave: on the leading edge of whichever panel is arriving (its top edge going down the page, its bottom edge going up)
    const low = Math.floor(y), amp = live ? Math.round(Math.sin(Math.PI * (y - low)) * 500) / 500 : 0;
    panels.forEach((p, i) => {
      const t = dir > 0 && i === low + 1 ? amp : 0, b = dir < 0 && i === low ? amp : 0;
      if (!caps[i]) return;
      if (t !== p._t) { p._t = t; caps[i][0].style.transform = `scaleY(${t})`; }
      if (b !== p._b) { p._b = b; caps[i][1].style.transform = `scaleY(${b})`; p.style.zIndex = b ? "3" : ""; }   // (a panel's bottom edge has to be drawn over the panel below it)
    });
    if (!busy) { const i = Math.round(y); if (i !== cur) { cur = i; mark(i); } }
    if (!inDeck() && words.length) { const r = say.getBoundingClientRect(); fillTo(clamp((innerHeight * 0.88 - r.top) / (r.height + innerHeight * 0.42))); }
  };
  const go = (i) => {
    i = clamp(i, 0, panels.length - 1);
    const from = scrollY, to = i * innerHeight;
    if (Math.abs(to - from) < 2) return;
    if (!stepper) return scrollTo({ top: to, behavior: "smooth" });
    const dur = 1150 + 260 * Math.max(0, Math.abs(to - from) / innerHeight - 1);     // (a jump over several panels takes a little longer)
    cur = i; mark(i);
    busy = true;
    root.classList.add("is-gliding");
    cancelAnimationFrame(glide);
    const t0 = performance.now(), ease = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + (to - from) * ease(p));
      paint();
      if (p < 1) glide = requestAnimationFrame(step); else { busy = false; root.classList.remove("is-gliding"); }
    };
    glide = requestAnimationFrame(step);
  };
  if (panels.length > 1 && fine) {
    const box = document.createElement("div");
    box.className = "dots";
    box.innerHTML = panels.map((p, i) => `<button type="button" aria-label="Go to section ${i + 1} of ${panels.length}"></button>`).join("");
    document.body.append(box);
    dots = $$("button", box);
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
  }
  cur = Math.round(scrollY / innerHeight);
  mark(cur);
  if (stepper) {
    let last = 0, used = false, settle = 0;
    addEventListener("wheel", (e) => {
      if (!inDeck() || e.ctrlKey) return;
      e.preventDefault();
      const now = performance.now();
      if (now - last > 180) used = false;                             // a new flick (one continuous spin or swipe counts once)
      last = now;
      if (busy || used || Math.abs(e.deltaY) < 3) return;
      used = true;
      go(cur + Math.sign(e.deltaY));
    }, { passive: false });
    addEventListener("keydown", (e) => {
      if (!inDeck() || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      const d = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key] || (e.key === " " && !e.target.closest?.("a, button, summary") ? (e.shiftKey ? -1 : 1) : 0);
      const to = e.key === "Home" ? 0 : e.key === "End" ? panels.length - 1 : d ? cur + d : null;
      if (to === null) return;
      e.preventDefault();
      if (!busy) go(to);
    });
    // anything else that scrolls the page (the scrollbar, Tab moving focus, find in page) also ends on a whole panel
    addEventListener("scroll", () => { clearTimeout(settle); if (!busy && inDeck()) settle = setTimeout(() => { if (!busy) go(Math.round(scrollY / innerHeight)); }, 170); }, { passive: true });
    addEventListener("resize", () => { if (inDeck()) scrollTo(0, cur * innerHeight); });
  }
  $$('a[href="#start"]').forEach((a) => a.addEventListener("click", (e) => { if (inDeck()) { e.preventDefault(); go(1); } }));
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; paint(); }); } }, { passive: true });
  addEventListener("resize", paint);
  paint();

  /* ---- things that arrive as they come into view (.rv), each a beat after its neighbour ---- */
  $$(".rv").forEach((el) => el.style.setProperty("--i", [...el.parentNode.children].filter((c) => c.classList.contains("rv")).indexOf(el)));
  $$(".faces span").forEach((el, i) => el.style.setProperty("--i", i + 3));
  const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    seen.unobserve(el);
    el.classList.add("is-in");
    $$("[data-count]", el).forEach((n) => count(n));
    if (el.matches("[data-count]")) count(el);
    if (el.contains(say)) { if (inDeck()) fillByClock(); }
    if (el.id === "notes") popRows();
    setTimeout(() => el.classList.add("is-done"), 1500 + (+el.style.getPropertyValue("--i") || 0) * 80);
  }), { threshold: 0.2, rootMargin: "0px 0px -5% 0px" });
  $$(".rv, .bars, .say, #notes").forEach((el) => seen.observe(el));

  /* ---- pointer (mouse only): a ring that trails it, cards that lean toward it, buttons that reach for it,
     the hero's layers shifting with it, and a picture that follows it over the index ---- */
  if (fine && !reduce) {
    const ring = document.createElement("i"), peek = document.createElement("div");
    ring.className = "ring"; ring.setAttribute("aria-hidden", "true");
    peek.className = "peek"; peek.setAttribute("aria-hidden", "true"); peek.innerHTML = "<img alt=''>";
    document.body.append(ring, peek);
    const m = { x: innerWidth / 2, y: innerHeight / 2, rx: 0, ry: 0, px: 0, py: 0, hx: 0, hy: 0, on: false };
    const HOT = "a, button, summary, select, input, textarea";
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      m.x = e.clientX; m.y = e.clientY;
      if (!m.on) { m.on = true; m.rx = m.px = m.x; m.ry = m.py = m.y; ring.classList.add("is-on"); }
      ring.classList.toggle("is-big", !!e.target.closest?.(HOT));
    }, { passive: true });
    document.addEventListener("pointerleave", () => { m.on = false; ring.classList.remove("is-on"); });
    // the first panel's layers and cube read --mx / --my (−1 … 1 from the middle of the screen: see "The 3D layer" in the styles)
    const stage = panels[0] || document.body, cubes = $$(".trust .cube");
    const loop = () => {
      m.rx += (m.x - m.rx) * 0.2; m.ry += (m.y - m.ry) * 0.2;
      const vx = m.x - m.px;                                          // how far the picture is behind the pointer = how fast it is moving
      m.px += vx * 0.11; m.py += (m.y - m.py) * 0.11;
      ring.style.transform = `translate(${m.rx.toFixed(1)}px,${m.ry.toFixed(1)}px)`;
      peek.style.transform = `translate(${m.px.toFixed(1)}px,${m.py.toFixed(1)}px) perspective(600px) rotateY(${clamp(vx * 0.18, -38, 38).toFixed(1)}deg) rotate(${clamp(vx * 0.06, -14, 14).toFixed(1)}deg)`;
      const tx = clamp((m.x - innerWidth / 2) / (innerWidth / 2), -1, 1), ty = clamp((m.y - innerHeight / 2) / (innerHeight / 2), -1, 1);
      m.hx += (tx - m.hx) * 0.07; m.hy += (ty - m.hy) * 0.07;
      const sx = m.hx.toFixed(3), sy = m.hy.toFixed(3);
      if (sx !== m.sx || sy !== m.sy) {
        m.sx = sx; m.sy = sy;
        if (cur === 0) { stage.style.setProperty("--mx", sx); stage.style.setProperty("--my", sy); }
        cubes.forEach((c) => { c.style.setProperty("--mx", sx); c.style.setProperty("--my", sy); });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    $$("[data-peek]").forEach((row) => {
      row.addEventListener("pointerenter", () => { peek.firstChild.src = row.dataset.peek; peek.classList.add("is-on"); });
      row.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
    });
    $$(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.28).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1)}px`; });
      b.addEventListener("pointerleave", () => (b.style.translate = ""));
    });
    $$(".card, .tcard").forEach((c) => {
      c.classList.add("tilt");
      if (getComputedStyle(c).position === "static") c.style.position = "relative";
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty("--ry", ((x - 0.5) * 22).toFixed(2) + "deg"); c.style.setProperty("--rx", ((0.5 - y) * 20).toFixed(2) + "deg");
        c.style.setProperty("--gx", (x * 100).toFixed(1) + "%"); c.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
        c.classList.add("is-hot");
      });
      c.addEventListener("pointerleave", () => { c.classList.remove("is-hot"); c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
    });
  }

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
  function popRows() {                                               // the rows that are showing arrive one after another
    if (!notes) return;
    $$(".row:not(.is-hid)", notes).forEach((r, k) => { r.classList.remove("is-pop"); r.style.setProperty("--k", k); void r.offsetWidth; r.classList.add("is-pop"); });
  }
  if (notes) {
    const COURSES = [
      ["7-9", "Grade 7", ["Integers and fractions", "Ratio and percentages", "Algebraic expressions", "Angles and triangles", "Area and perimeter"]],
      ["7-9", "Grade 8", ["Linear equations", "Indices", "Pythagoras' theorem", "Coordinates and graphs", "Data handling"]],
      ["7-9", "Grade 9 · NCE", ["Simultaneous equations", "Quadratic expressions", "Mensuration", "Trigonometry basics", "Probability"]],
      ["10-11", "O Level · 4024", ["Variation", "Functions", "Circle theorems", "Vectors", "Matrices", "Statistics"]],
      ["10-11", "Add Maths · 4037", ["Quadratics", "Logarithms", "Differentiation", "Integration", "Trigonometric identities", "Binomial theorem"]],
      ["12-13", "A Level · 9709", ["P1: Series", "P1: Circular measure", "P3: Complex numbers", "P3: Differential equations", "M1: Forces and equilibrium", "S1: The normal distribution"]],
    ];
    let n = 0;
    notes.innerHTML = COURSES.map(([band, course, chapters]) => chapters.map((c) =>
      `<a class="row" data-band="${band}" target="_blank" rel="noopener" href="${wa(`Hello, could I get the notes for ${course}: ${c}?`)}"><span class="row__n">${String(++n).padStart(2, "0")}</span><span class="row__t">${c}</span><span class="row__d">${course}</span><span class="row__go">↗</span></a>`).join("")).join("");
    const chips = $$("#noteChips button"), total = $("#noteCount");
    const show = (band, animate) => {
      let k = 0;
      $$(".row", notes).forEach((r) => { const hid = band !== "all" && r.dataset.band !== band; r.classList.toggle("is-hid", hid); if (!hid) k++; });
      if (total) total.textContent = k;
      if (animate) popRows();
    };
    chips.forEach((b) => b.addEventListener("click", () => { chips.forEach((c) => c.setAttribute("aria-pressed", c === b)); show(b.dataset.band, true); }));
    show("all", false);
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
