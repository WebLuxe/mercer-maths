/* ==================================================================
   Kavish Maths — "Pure" edition. One script for all five pages, no
   libraries. In order: set-up, changing pages, the tabs, the load
   animation, the stack of sections with its smooth scrolling, what
   arrives on scroll, the pointer, and each page's own parts.
   Everything that moves is eased by time (not by frame), so it runs
   at the same pace at 60, 120 or 144 frames a second.
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
  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  root.classList.add("js");

  // A page the browser got ready in advance (when the pointer rests on a link to it) waits until it is actually opened.
  const shown = document.prerendering ? new Promise((r) => document.addEventListener("prerenderingchange", r, { once: true })) : Promise.resolve();
  // Arriving from another page of this site: the tabs are already on screen, so they stay still.
  const inSite = (() => { try { return new URL(document.referrer).origin === location.origin; } catch { return false; } })();

  /* ---- changing pages. Browsers with page transitions crossfade by themselves (see the styles). Others fade the page out
     first, so a page never cuts straight to the next. ---- */
  if (!reduce && !("PageRevealEvent" in window)) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      root.classList.add("is-leaving");
      setTimeout(() => (location.href = url.href), 280);
    });
    addEventListener("pageshow", (e) => { if (e.persisted) root.classList.remove("is-leaving"); });
  }

  /* ---- pictures are decoded ahead, so none of them stalls a frame the first time it slides into view ---- */
  $$("img").forEach((im) => im.decode?.().catch(() => {}));
  ["img/chalk.jpg", "img/board.jpg", "img/feed.jpg", "img/student.jpg"].forEach((src) => { const im = new Image(); im.src = src; im.decode?.().catch(() => {}); });

  /* ---- tabs: the dark pill sits under the current page and springs to whichever link the pointer is on ---- */
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

  /* ---- numbers count up, fast at first and settling gently on the figure ---- */
  const count = (el, dur = 1800) => {
    const to = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "", suf = el.dataset.suf || "";
    const show = (v) => (el.textContent = pre + v.toFixed(dec) + suf);
    if (reduce) return show(to);
    let t0 = 0;
    const step = (now) => { t0 ||= now; const p = Math.min(1, (now - t0) / dur); show(p === 1 ? to : to * (1 - Math.pow(2, -10 * p))); if (p < 1) requestAnimationFrame(step); };
    show(0);
    requestAnimationFrame(step);
  };

  /* ---- load: the title's letters rise into their lines, the photo comes forward, and everything else follows ---- */
  const intro = () => {
    if (!reduce) {
      const t = 60;
      $$(".mask > span").forEach((line, i) => {
        const h1 = line.closest("h1");
        if (h1 && !h1.hasAttribute("aria-label")) h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
        const text = line.textContent;
        line.textContent = "";
        [...text].forEach((c, k) => {
          const ch = document.createElement("span");
          ch.className = "ch"; ch.textContent = c; ch.setAttribute("aria-hidden", "true");
          line.append(ch);
          ch.animate([{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 1300, delay: t + 140 + i * 120 + k * 34, easing: EASE, fill: "backwards" });
        });
      });
      $(".hero__photo")?.animate([{ opacity: 0, transform: "scale(1.1)" }, { opacity: 1, transform: "none" }], { duration: 2200, delay: t, easing: EASE, fill: "backwards" });
      $(".phero__img")?.animate([{ opacity: 0, transform: "scale(1.1)" }, { opacity: 0.16, transform: "none" }], { duration: 2200, delay: t, easing: EASE, fill: "backwards" });
      $$(inSite ? ".hdate, .hcta" : ".nav, .hdate, .hcta").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(-1.2rem)" }, { opacity: 1, transform: "none" }], { duration: 1100, delay: t + 200 + i * 80, easing: EASE, fill: "backwards" }));
      $$("[data-rise]").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(2.6rem) scale(0.98)" }, { opacity: 1, transform: "none" }], { duration: 1500, delay: t + 420 + i * 60, easing: EASE, fill: "backwards" }));
      $(".out__line i")?.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 1600, delay: t + 1000, easing: EASE, fill: "backwards" });
      $$(".bar .art > *").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(1.2rem)" }, { opacity: 1, transform: "none" }], { duration: 1100, delay: t + 700 + i * 90, easing: EASE, fill: "backwards" }));
    }
    root.classList.remove("intro");
    $$(".hero [data-count], .phero [data-count]").forEach((el) => setTimeout(() => count(el), reduce ? 0 : 560));
  };
  shown.then(() => Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 500))])).then(intro);   // (the title waits a moment for its typeface, so its letters never jump)

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
  const fillTo = (p) => {                                            // p: 0 = all grey, 1 = all white, with a soft edge four words long
    const head = p * (words.length + 4);
    words.forEach((w, i) => {
      const k = Math.round(clamp((head - i) / 4) * 40) / 40;
      if (k === w._k) return;
      w._k = k;
      const c = Math.round(72 + (245 - 72) * k);
      w.style.color = `rgb(${c},${c},${c + 2})`;
    });
  };
  let filled = false;
  const fillByClock = () => {
    if (filled || !words.length) return;
    filled = true;
    let t0 = 0;
    const step = (now) => { t0 ||= now + 300; const p = clamp((now - t0) / 2600); fillTo(p * p * (3 - 2 * p)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  /* ---- the stack (desktop sizes). Every section fills one screen. Once it does, it stays put and the next one slides up
     over it like a sheet, while the one underneath sinks back and darkens. All of it follows the scroll position, so it
     plays both ways and holds wherever the page holds.
     With a mouse or a trackpad the page moves a section at a time, on a spring: one turn of the wheel, an arrow key or a
     dot glides to the next section, and nothing is ever locked. Turn the wheel again mid-glide and the page carries on to
     the section after without losing speed. A trackpad moves the page directly under the fingers, and when they let go
     it settles on the nearest section (or the next one, if it was pushed a little way toward it). ---- */
  const panels = $$(".panel"), inners = panels.map((p) => $(":scope > .panel__in", p)), n = panels.length;
  const deck = () => deckMQ.matches;
  const stack = !reduce && n > 1, stepper = stack && fine;
  if (stack) root.classList.add("stack");
  if (stepper) root.classList.add("stepper");
  const shades = panels.map((p) => {
    if (!stack) return null;
    const s = document.createElement("i");
    s.className = "shade"; s.setAttribute("aria-hidden", "true");
    p.append(s);
    return s;
  });
  const heroes = panels.map((p) => p.matches(".hero, .phero"));
  const theme = $('meta[name="theme-color"]');
  let H = innerHeight, cur = 0, marked = -1, dots = [], navY = 0, navDark = null, tone = null, poke = () => {};
  let x = scrollY, v = 0, to = x, mode = "rest", w = 7, raf = 0, last = 0;   // the smooth scroll: position, speed, target
  const measure = () => { H = innerHeight; if (nav) { const r = nav.getBoundingClientRect(); navY = r.top + r.height / 2; } };
  measure();
  const mark = (i) => { cur = i; if (i === marked) return; marked = i; dots.forEach((d, k) => d.setAttribute("aria-current", k === i)); poke(); };
  const which = (y) => { let k = 0; for (let i = 0; i < n; i++) if (panels[i].getBoundingClientRect().top <= y) k = i; return k; };
  const render = (y) => {
    const on = stack && deck();
    for (let i = 0; i < n; i++) {
      const e = on && i ? clamp(1 - (i * H - y) / H) : 1;             // 0 = still a screen below, 1 = in place
      const c = on && i < n - 1 ? clamp((y - i * H) / H) : 0;         // 0 = uncovered, 1 = fully covered by the next one
      const key = e * 8192 + c;
      if (key === panels[i]._k) continue;
      panels[i]._k = key;
      const moving = on && e > 0 && e < 1;                             // (a sheet on its way in has rounded top corners and a lit edge)
      if (moving !== panels[i]._m) { panels[i]._m = moving; panels[i].classList.toggle("is-moving", moving); }
      const st = inners[i].style;
      if (e < 1 || c > 0) {
        st.transform = `translate3d(0,${(-(1 - e) * 0.24 * H - c * 0.04 * H).toFixed(2)}px,0) scale(${(1 - c * 0.07).toFixed(4)})`;
        st.opacity = e < 1 ? (0.25 + 0.75 * clamp(e / 0.7)).toFixed(3) : "";
      } else st.transform = st.opacity = "";
      if (shades[i]) shades[i].style.opacity = c > 0 ? Math.pow(c, 1.5).toFixed(3) : "0";
      panels[i].style.visibility = c >= 1 ? "hidden" : "";             // (fully covered: not drawn at all)
      if (heroes[i]) panels[i].style.setProperty("--c", c.toFixed(4));
    }
    // the tabs turn dark over the black sections, and a phone's browser bar takes the colour of the section at the top
    const under = on ? clamp(Math.floor((y + navY) / H), 0, n - 1) : which(navY);
    const dark = !panels[under]?.classList.contains("panel--paper");
    if (nav && dark !== navDark) { navDark = dark; nav.classList.toggle("is-dark", dark); }
    const t = panels[on ? clamp(Math.floor(y / H + 0.02), 0, n - 1) : which(1)]?.classList.contains("panel--paper") ? "#dadada" : "#000000";
    if (theme && t !== tone) { tone = t; theme.content = t; }
    if (mode !== "spring") mark(on ? clamp(Math.round(y / H), 0, n - 1) : which(H / 2));
    if (!on && words.length) { const r = say.getBoundingClientRect(); fillTo(clamp((H * 0.86 - r.top) / (r.height + H * 0.4))); }
  };

  const maxY = () => Math.max(0, root.scrollHeight - innerHeight);
  const pageOf = (y) => clamp(Math.round(y / H), 0, n - 1);
  const loop = (now) => {
    raf = 0;
    const dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
    last = now;
    if (mode === "spring") {                                         // a critically damped spring, solved exactly each frame
      const d = x - to, ex = Math.exp(-w * dt), nx = to + (d + (v + w * d) * dt) * ex;
      v = (v - w * (v + w * d) * dt) * ex;
      x = nx;
      if (Math.abs(x - to) < 1 && Math.abs(v) < 30) { x = to; v = 0; mode = "rest"; }   // (the last pixel is not worth waiting for)
    } else if (mode === "follow") {                                  // a trackpad: follow the fingers closely
      const nx = x + (to - x) * (1 - Math.exp(-dt * 18));
      v = (nx - x) / dt; x = nx;
      if (Math.abs(to - x) < 0.5) { x = to; v = 0; }
    }
    const m = maxY();
    if (x < 0 || x > m) { x = clamp(x, 0, m); v = 0; }
    scrollTo(0, x);
    render(x);
    if (mode === "spring" || (mode === "follow" && x !== to)) raf = requestAnimationFrame(loop);
    else last = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const go = (i) => {
    i = clamp(i, 0, n - 1);
    to = Math.min(i * H, maxY());
    w = 6.8 * Math.pow(Math.max(1, Math.abs(to - x) / H), -0.15);     // (a jump over several sections takes a little longer)
    mode = "spring";
    mark(i);
    kick();
  };
  const halt = () => { cancelAnimationFrame(raf); raf = 0; last = 0; v = 0; mode = "rest"; };

  if (stepper) {
    let lastWheel = 0, g = null, settle = 0;
    // a mouse wheel turns in notches of 120; a trackpad sends a stream of small, uneven steps
    const notch = (e) => e.deltaMode !== 0 || (Math.abs(e.wheelDeltaY || 0) >= 120 && e.wheelDeltaY % 120 === 0 && Math.abs(e.deltaY) >= 25);
    addEventListener("wheel", (e) => {
      if (!deck() || e.ctrlKey) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * H : e.deltaY;
      if (!dy) return;
      const now = performance.now(), dir = Math.sign(dy), step = notch(e);
      if (!g || now - lastWheel > 200 || dir !== g.dir) g = { step, dir, used: false, from: pageOf(mode === "rest" ? x : to) };
      lastWheel = now;
      if (step && g.step) {                                          // a mouse wheel: one turn, one section
        if (!g.used) { g.used = true; go(pageOf(to) + dir); }
        return;
      }
      g.step = false;                                                // a trackpad: follow it, then settle
      if (mode !== "follow") { mode = "follow"; to = x; }
      to = clamp(to + dy, 0, maxY());
      kick();
      clearTimeout(settle);
      settle = setTimeout(() => {
        const moved = x - g.from * H;
        let i = pageOf(x + v * 0.1);
        if (i === g.from && Math.abs(moved) > 0.08 * H) i = g.from + Math.sign(moved);
        go(i);
      }, 140);
    }, { passive: false });
    addEventListener("keydown", (e) => {
      if (!deck() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      const d = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key] || (e.key === " " && !e.target.closest?.("a, button, summary") ? (e.shiftKey ? -1 : 1) : 0);
      const i = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : d ? pageOf(to) + d : null;
      if (i === null) return;
      e.preventDefault();
      if (d && Math.abs(i * H - x) > 2.2 * H) return;                // (a key held down never runs more than two sections ahead)
      go(i);
    });
  }
  // Anything else that scrolls the page (dragging the scrollbar, Tab moving the focus, find in page): take it from wherever
  // it leaves the page, and settle on the nearest section once it stops.
  let ext = 0, queued = false;
  addEventListener("scroll", () => {
    if (stepper && deck() && Math.abs(scrollY - x) >= 2) {
      halt();
      x = to = scrollY;
      clearTimeout(ext);
      ext = setTimeout(() => { if (mode === "rest") go(pageOf(scrollY)); }, 220);
    }
    if (!raf && !queued) { queued = true; requestAnimationFrame(() => { queued = false; if (!raf) render(scrollY); }); }
  }, { passive: true });
  addEventListener("resize", () => {
    measure();
    panels.forEach((p) => (p._k = -1));
    if (stepper && deck()) { halt(); x = to = Math.min(cur * H, maxY()); scrollTo(0, x); }
    render(stepper && deck() ? x : scrollY);
  });
  $$('a[href="#start"]').forEach((a) => a.addEventListener("click", (e) => {
    if (stepper && deck()) { e.preventDefault(); go(1); }
    else if (!reduce) { e.preventDefault(); $("#start")?.scrollIntoView({ behavior: "smooth" }); }
  }));
  if (n > 1 && fine) {
    const box = document.createElement("div");
    box.className = "dots";
    box.innerHTML = panels.map((p, i) => `<button type="button" aria-label="Go to section ${i + 1} of ${n}"></button>`).join("");
    document.body.append(box);
    dots = $$("button", box);
    dots.forEach((d, i) => d.addEventListener("click", () => { if (stepper && deck()) go(i); else scrollTo({ top: i * H, behavior: reduce ? "auto" : "smooth" }); }));
  }
  render(scrollY);

  /* ---- things that arrive as they come into view (.rv), each a beat after its neighbour ---- */
  $$(".rv").forEach((el) => el.style.setProperty("--i", [...el.parentNode.children].filter((c) => c.classList.contains("rv")).indexOf(el)));
  $$(".faces span").forEach((el, i) => el.style.setProperty("--i", i + 3));
  const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    seen.unobserve(el);
    el.classList.add("is-in");
    $$("[data-count]", el).forEach((c) => count(c));
    if (el.matches("[data-count]")) count(el);
    if (el.contains(say) && deck()) fillByClock();
    if (el.id === "notes") popRows();
  }), { threshold: 0.12, rootMargin: deck() ? "0px 0px -22% 0px" : "0px 0px -8% 0px" });
  $$(".rv, .bars, .say, #notes").forEach((el) => seen.observe(el));

  /* ---- pointer (mouse only): cards lean a little toward it, a picture follows it over the index, and the hero's layers
     drift with it. Each eases toward where the pointer is, and only runs while something is still moving. ---- */
  if (fine && !reduce) {
    const peek = document.createElement("div");
    peek.className = "peek"; peek.setAttribute("aria-hidden", "true"); peek.innerHTML = "<img alt=''>";
    document.body.append(peek);
    const stage = panels[0];
    const P = { x: innerWidth / 2, y: innerHeight / 2, px: innerWidth / 2, py: innerHeight / 2, hx: 0, hy: 0, sx: "", sy: "", raf: 0, t: 0 };
    const tick = (now) => {
      const dt = P.t ? clamp((now - P.t) / 1000, 0.001, 0.05) : 1 / 60;
      P.t = now;
      const kp = 1 - Math.exp(-dt * 10), kh = 1 - Math.exp(-dt * 3.5), vx = P.x - P.px;
      P.px += vx * kp; P.py += (P.y - P.py) * kp;
      peek.style.transform = `translate3d(${P.px.toFixed(1)}px,${P.py.toFixed(1)}px,0) rotate(${clamp(vx * 0.05, -7, 7).toFixed(2)}deg)`;
      const on = cur === 0 && deck();
      const tx = on ? clamp((P.x - innerWidth / 2) / (innerWidth / 2), -1, 1) : 0, ty = on ? clamp((P.y - innerHeight / 2) / (innerHeight / 2), -1, 1) : 0;
      P.hx += (tx - P.hx) * kh; P.hy += (ty - P.hy) * kh;
      const sx = P.hx.toFixed(3), sy = P.hy.toFixed(3);
      if (stage && (sx !== P.sx || sy !== P.sy)) { P.sx = sx; P.sy = sy; stage.style.setProperty("--mx", sx); stage.style.setProperty("--my", sy); }
      if (Math.abs(vx) > 0.2 || Math.abs(P.y - P.py) > 0.2 || Math.abs(tx - P.hx) > 0.002 || Math.abs(ty - P.hy) > 0.002) P.raf = requestAnimationFrame(tick);
      else { P.raf = 0; P.t = 0; }
    };
    const wake = () => { if (!P.raf) P.raf = requestAnimationFrame(tick); };
    poke = wake;
    addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; P.x = e.clientX; P.y = e.clientY; wake(); }, { passive: true });
    $$("[data-peek]").forEach((row) => {
      row.addEventListener("pointerenter", () => {
        if (!peek.classList.contains("is-on")) { P.px = P.x; P.py = P.y; }
        peek.firstChild.src = row.dataset.peek; peek.classList.add("is-on"); wake();
      });
      row.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
    });
    // cards: at most a few degrees, eased, with a soft light where the pointer is
    $$(".card, .tcard").forEach((c) => {
      c.classList.add("tilt");
      const s = { ax: 0, ay: 0, h: 0, bx: 0, by: 0, bh: 0, raf: 0, t: 0 };
      const step = (now) => {
        const dt = s.t ? clamp((now - s.t) / 1000, 0.001, 0.05) : 1 / 60;
        s.t = now;
        const k = 1 - Math.exp(-dt * 9);
        s.ax += (s.bx - s.ax) * k; s.ay += (s.by - s.ay) * k; s.h += (s.bh - s.h) * k;
        const a = Math.hypot(s.ax, s.ay);
        c.style.rotate = a > 0.02 ? `${(s.ax / a).toFixed(4)} ${(s.ay / a).toFixed(4)} 0 ${a.toFixed(3)}deg` : "";
        c.style.scale = s.h > 0.002 ? (1 + 0.018 * s.h).toFixed(4) : "";
        if (Math.abs(s.bx - s.ax) + Math.abs(s.by - s.ay) + Math.abs(s.bh - s.h) > 0.004) s.raf = requestAnimationFrame(step);
        else { s.raf = 0; s.t = 0; }
      };
      const go = () => { if (!s.raf) s.raf = requestAnimationFrame(step); };
      c.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        s.bx = (0.5 - py) * 7; s.by = (px - 0.5) * 7; s.bh = 1;
        c.style.setProperty("--gx", (px * 100).toFixed(1) + "%"); c.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        c.classList.add("is-hot");
        go();
      });
      c.addEventListener("pointerleave", () => { s.bx = s.by = s.bh = 0; c.classList.remove("is-hot"); go(); });
    });
  }

  /* ---- chips: a segmented control, whose white pill slides to the choice ---- */
  const segment = (box) => {
    if (!box) return () => {};
    const pill = document.createElement("i");
    pill.className = "chips__pill"; pill.setAttribute("aria-hidden", "true");
    box.prepend(pill); box.classList.add("has-pill");
    const put = (now) => {
      const b = $('[aria-pressed="true"]', box);
      if (!b) return;
      if (now) pill.style.transition = "none";
      pill.style.setProperty("--x", b.offsetLeft + "px"); pill.style.setProperty("--w", b.offsetWidth + "px");
      if (now) requestAnimationFrame(() => requestAnimationFrame(() => (pill.style.transition = "")));
    };
    put(true);
    document.fonts?.ready.then(() => put(true));
    addEventListener("resize", () => put(true));
    return put;
  };

  /* ---- the laurel round the badge: two sprays of leaves ---- */
  const laurel = $(".laurel g");
  if (laurel) {
    let d = "";
    for (let i = 0; i < 9; i++) {                                     // from the bottom, up the left side; the right side mirrors it
      const th = 245 - i * 16.25, a = (th * Math.PI) / 180, lx = 75 + 52 * Math.cos(a), ly = 62 - 52 * Math.sin(a), rot = 180 - th - 24;
      for (const s of [1, -1]) { const X = (s === 1 ? lx : 150 - lx).toFixed(1); d += `<ellipse cx="${X}" cy="${ly.toFixed(1)}" rx="4" ry="9" transform="rotate(${(s * rot).toFixed(1)} ${X} ${ly.toFixed(1)})"/>`; }
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
    const box = $("#ttChips"), chips = $$("button", box), slide = segment(box);
    chips.forEach((b) => b.addEventListener("click", () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", c === b));
      slide();
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
    let k = 0;
    notes.innerHTML = COURSES.map(([band, course, chapters]) => chapters.map((c) =>
      `<a class="row" data-band="${band}" target="_blank" rel="noopener" href="${wa(`Hello, could I get the notes for ${course}: ${c}?`)}"><span class="row__n">${String(++k).padStart(2, "0")}</span><span class="row__t">${c}</span><span class="row__d">${course}</span><span class="row__go">↗</span></a>`).join("")).join("");
    const box = $("#noteChips"), chips = $$("button", box), slide = segment(box), total = $("#noteCount");
    const show = (band, animate) => {
      let shown = 0;
      $$(".row", notes).forEach((r) => { const hid = band !== "all" && r.dataset.band !== band; r.classList.toggle("is-hid", hid); if (!hid) shown++; });
      if (total) total.textContent = shown;
      if (animate) popRows();
    };
    chips.forEach((b) => b.addEventListener("click", () => { chips.forEach((c) => c.setAttribute("aria-pressed", c === b)); slide(); show(b.dataset.band, true); }));
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
