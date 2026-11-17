/* ==================================================================
   Chapters: every chapter for Grades 7–13, from assets/data/chapters.json
   (built by tools/notes.cjs). A chapter opens its notes in the reader below,
   which draws the PDF pages right on the page with PDF.js, so notes open on
   phones too (a plain PDF frame shows nothing on most phones).
================================================================== */
if ($("#chList")) {
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const list = $("#chList"), courseBar = $("#chCourses"), info = $("#chInfo"), bandBar = $('[data-lib="chapters"]');
  let stages = [], course = null, filter = "";
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const chaptersOf = (c) => c.parts.flatMap((p) => p.ch);
  // desktop panels: the list is its own scroll box (03-snap.js gives it the wheel first)
  const boxMode = () => {
    const on = panelMQ.matches;
    list.toggleAttribute("data-scroll-box", on);
    list.toggleAttribute("data-lenis-prevent", on);
    list.tabIndex = on ? 0 : -1;
  };
  boxMode();
  panelMQ.addEventListener?.("change", boxMode);
  // page height only changes when the list isn't boxed (phones); re-measure once, after typing stops
  let refreshT = 0;
  const remeasure = () => { if (panelMQ.matches) return; clearTimeout(refreshT); refreshT = setTimeout(() => ScrollTrigger.refresh(), 250); };
  const tag = { real: "Kavish’s notes", demo: "Notes", sample: "Sample" };

  // ---------------------------------------------------------------- reader
  const R = (() => {
    const box = $("#rdr"), pages = $("#rdrPages"), pgEl = $("#rdrPg"), tabs = $("#rdrTabs"), dl = $("#rdrDl");
    let open = false, pdf = null, io = null, job = 0, zoom = 1, ratios = [], lib = null, files = [], head = "", focusBack = null, ignorePop = false;
    const MAXPX = 12e6; // phones refuse very large canvases
    const loadLib = () => lib || (lib = new Promise((ok, no) => {
      if (window.pdfjsLib) return ok(window.pdfjsLib);
      const s = document.createElement("script");
      s.src = "assets/vendor/pdf/pdf.min.js";
      s.onload = () => { const L = window.pdfjsLib; if (!L) return no(); L.GlobalWorkerOptions.workerSrc = "assets/vendor/pdf/pdf.worker.min.js"; ok(L); };
      s.onerror = () => { lib = null; s.remove(); no(); };
      document.head.appendChild(s);
    }));
    const baseW = () => Math.min(pages.clientWidth - 28, 880);
    const lay = () => {
      const w = Math.round(baseW() * zoom);
      $$(".rdr__p", pages).forEach((el, i) => {
        el.style.width = w + "px"; el.style.height = Math.round(w * ratios[i]) + "px"; el.dataset.w = w;
        if (io) { io.unobserve(el); io.observe(el); }
      });
    };
    const render = (el) => {
      const w = +el.dataset.w, my = job;
      if (+el.dataset.r === w || !pdf) return;
      el.dataset.r = w;
      pdf.getPage(+el.dataset.n + 1).then((page) => {
        if (my !== job) return;
        const v1 = page.getViewport({ scale: 1 });
        let s = (w / v1.width) * Math.min(devicePixelRatio || 1, 2);
        if (v1.width * v1.height * s * s > MAXPX) s = Math.sqrt(MAXPX / (v1.width * v1.height));
        const vp = page.getViewport({ scale: s }), c = document.createElement("canvas");
        c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        return page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise.then(() => {
          if (my !== job || +el.dataset.r !== w) return;
          const old = $("canvas", el); old ? old.replaceWith(c) : el.appendChild(c);
        });
      }).catch(() => { el.dataset.r = ""; });
    };
    const count = () => {
      if (!pdf) return;
      const ps = $$(".rdr__p", pages), mid = pages.scrollTop + pages.clientHeight / 3;
      let i = 0;
      while (i < ps.length - 1 && ps[i + 1].offsetTop <= mid) i++;
      pgEl.textContent = `${i + 1} / ${ps.length}`;
    };
    const setZoom = (z) => {
      z = Math.min(3, Math.max(0.6, z));
      if (!pdf || z === zoom) return;
      const y = pages.scrollTop / Math.max(1, pages.scrollHeight), x = pages.scrollLeft / Math.max(1, pages.scrollWidth);
      zoom = z; lay();
      pages.scrollTop = y * pages.scrollHeight; pages.scrollLeft = x * pages.scrollWidth;
    };
    const load = (i) => {
      const f = files[i], my = ++job;
      if (io) io.disconnect(); io = null;
      if (pdf) { pdf.destroy(); pdf = null; }
      zoom = 1; pgEl.textContent = "";
      $$("button", tabs).forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
      $("#rdrT").textContent = f.t ? `${head}: ${f.t}` : head;
      dl.href = f.u; dl.setAttribute("download", ($("#rdrT").textContent).replace(/[\\/:*?"<>|]/g, "") + ".pdf");
      pages.innerHTML = `<div class="rdr__msg"><span class="rdr__spin"></span><p>Opening the notes…</p></div>`;
      pages.scrollTop = 0;
      const file = fetch(f.u).then((r) => { if (!r.ok) throw new Error("missing"); return r.arrayBuffer(); });
      Promise.all([loadLib(), file]).then(([L, buf]) => {
        if (my !== job) return;
        return L.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise.then((p) => {
          if (my !== job) { p.destroy(); return; }
          pdf = p;
          return Promise.all(Array.from({ length: p.numPages }, (_, k) => p.getPage(k + 1).then((pg) => { const v = pg.getViewport({ scale: 1 }); return v.height / v.width; }))).then((r) => {
            if (my !== job) return;
            ratios = r;
            pages.innerHTML = r.map((_, k) => `<div class="rdr__p" data-n="${k}" role="img" aria-label="Page ${k + 1} of ${r.length}"></div>`).join("");
            io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && render(e.target)), { root: pages, rootMargin: "900px 0px" });
            lay(); count();
          });
        });
      }).catch(() => {
        if (my !== job) return;
        pages.innerHTML = `<div class="rdr__msg"><p>These notes couldn’t open here.</p><a class="btn btn--fill" href="${esc(f.u)}" target="_blank" rel="noopener"><span>Open the PDF</span><span>↗</span></a></div>`;
      });
    };
    const api = {
      open(ch, c) {
        files = ch.f; head = ch.t;
        $("#rdrS").textContent = `Chapter ${ch.n} · ${c.name}${c.code && c.code !== "NCE" ? " (" + c.code + ")" : ""}${ch.kind === "sample" ? " · sample" : ch.kind === "demo" ? " · demo notes" : ""}`;
        tabs.innerHTML = files.length > 1 ? files.map((f, i) => `<button role="tab" aria-selected="false" data-rf="${i}">${esc(f.t || "Notes " + (i + 1))}</button>`).join("") : "";
        tabs.hidden = files.length < 2;
        if (!open) {
          open = true; focusBack = document.activeElement;
          ui.book = true; lenis?.stop();               // same lock as the video player: no snapping, scene throttled
          box.classList.add("is-open"); box.setAttribute("aria-hidden", "false");
          document.documentElement.classList.add("rdr-on");
          history.pushState({ rdr: 1 }, "");
          if (!reduce) gsap.fromTo(box, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", clearProps: "transform" });
          setTimeout(() => $(".rdr__i", box).focus({ preventScroll: true }), 50);
        }
        load(0);
      },
      close(fromPop) {
        if (!open) return;
        open = false; job++;
        if (io) io.disconnect(); io = null;
        if (pdf) { pdf.destroy(); pdf = null; }
        box.classList.remove("is-open"); box.setAttribute("aria-hidden", "true");
        document.documentElement.classList.remove("rdr-on");
        pages.innerHTML = "";
        ui.book = false; lenis?.start();
        focusBack?.focus?.({ preventScroll: true });
        if (!fromPop) { ignorePop = true; history.back(); }
      }
    };
    box.addEventListener("click", (e) => {
      if (e.target.closest("[data-rclose]")) api.close();
      const z = e.target.closest("[data-rzoom]"); if (z) setZoom(zoom * (z.dataset.rzoom === "in" ? 1.25 : 0.8));
      const t = e.target.closest("[data-rf]"); if (t) load(+t.dataset.rf);
    });
    pages.addEventListener("scroll", count, { passive: true });
    addEventListener("keydown", (e) => { if (open && e.key === "Escape") api.close(); });
    addEventListener("popstate", () => { if (ignorePop) { ignorePop = false; return; } if (open) api.close(true); });
    addEventListener("resize", () => { if (open && pdf) lay(); });
    return api;
  })();

  // ---------------------------------------------------------------- chapter list
  const drawCourses = () => {
    const st = stages.find((s) => s.courses.includes(course));
    $$("button", bandBar).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.band === st.band)));
    courseBar.innerHTML = st.courses.map((c) => `<button role="tab" aria-selected="${c === course}" data-co="${c.id}">${esc(c.name)}${c.code && c.code !== "NCE" ? `<small>${esc(c.code)}</small>` : ""}</button>`).join("");
  };
  const drawInfo = () => {
    const all = chaptersOf(course), own = all.filter((x) => x.kind === "real").length, demo = all.filter((x) => x.kind === "demo").length;
    info.innerHTML = `<div class="chx__head"><b>${esc(course.board)}${course.code && course.code !== "NCE" ? " (" + esc(course.code) + ")" : ""}</b>
      <span>${all.length} chapters${own ? ` · ${own} with Kavish’s notes` : ""}${demo ? ` · ${demo} with demo notes` : ""}${course.note ? " · " + esc(course.note) : ""}</span></div>
      <label class="chx__q"><span class="sr">Find a chapter</span><input type="search" id="chQ" placeholder="Find a chapter or topic" autocomplete="off" value="${esc(filter)}"></label>`;
  };
  const row = (ch) => `<button class="chr is-${ch.kind}" data-c="${ch.n}">
      <span class="chr__n">${ch.n}</span>
      <span class="chr__t"><b>${esc(ch.t)}</b><small>${ch.s.map(esc).join(" · ")}</small></span>
      <span class="chr__k">${tag[ch.kind]}${ch.f.length > 1 ? ` · ${ch.f.length}` : ""}</span></button>`;
  const drawList = (animate) => {
    const f = filter.trim().toLowerCase();
    const html = course.parts.map((p) => {
      const rows = p.ch.filter((ch) => !f || (ch.t + " " + ch.s.join(" ")).toLowerCase().includes(f));
      return rows.length ? `<div class="chx__part"><h3>${esc(p.name)}<span>${p.ch.length}</span></h3><div class="chx__rows">${rows.map(row).join("")}</div></div>` : "";
    }).join("");
    gsap.killTweensOf($$(".chr", list));
    list.innerHTML = html || `<p class="lib__err">No chapter matches “${esc(filter.trim())}”.</p>`;
    if (animate) list.scrollTop = 0;
    if (animate && !reduce) gsap.fromTo($$(".chr", list).slice(0, 14), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02, ease: "expo.out", clearProps: "opacity,transform" });
    remeasure();
  };
  const pick = (c) => {
    if (!c || c === course) return;
    course = c; filter = "";
    store.set("kt_course", c.id);
    drawCourses(); drawInfo(); drawList(true);
  };

  bandBar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-band]"); if (!b) return;
    const st = stages.find((s) => s.band === b.dataset.band);
    if (st && !st.courses.includes(course)) pick(st.courses[0]);
  });
  courseBar.addEventListener("click", (e) => { const b = e.target.closest("[data-co]"); if (b) pick(stages.flatMap((s) => s.courses).find((c) => c.id === b.dataset.co)); });
  info.addEventListener("input", (e) => { if (e.target.id === "chQ") { filter = e.target.value; drawList(false); } });
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-c]"); if (!b) return;
    const ch = chaptersOf(course).find((x) => x.n === +b.dataset.c);
    if (ch) R.open(ch, course);
  });

  fetch("assets/data/chapters.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((data) => {
      stages = data;
      const q = new URLSearchParams(location.search), all = stages.flatMap((s) => s.courses), want = q.get("course") || store.get("kt_course");
      course = all.find((c) => c.id === want) || all.find((c) => c.id === "add-maths") || all[0];
      if (q.get("course") && course.id === q.get("course")) store.set("kt_course", course.id);
      // ?course=add-maths&ch=4 (from the Tuition page) opens that chapter's notes once the page has arrived
      const deep = q.get("ch") && chaptersOf(course).find((x) => x.n === +q.get("ch"));
      if (q.has("ch")) { q.delete("ch"); const rest = q.toString(); history.replaceState(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash); }
      if (deep) {
        const go = () => (document.body.classList.contains("is-loading") || document.documentElement.classList.contains("pt-in") ? setTimeout(go, 150) : R.open(deep, course));
        go();
      }
      drawCourses(); drawInfo(); drawList(false);
      if (!reduce) gsap.from($$(".chr", list).slice(0, 14), { y: 40, opacity: 0, duration: 0.9, stagger: 0.02, ease: "expo.out", clearProps: "opacity,transform", scrollTrigger: { trigger: "#chList", start: "top 92%", once: true } });
    })
    .catch(() => { list.innerHTML = `<p class="lib__err">The chapters couldn’t load. If you opened the file directly, run it through a web server instead (npm run serve).</p>`; });
}
