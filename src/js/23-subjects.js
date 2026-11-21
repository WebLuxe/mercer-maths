/* ==================================================================
   Tuition → Subjects: every course and every chapter, from the same
   assets/data/chapters.json as the Resources page (so the two never
   disagree). The six topics written in tuition.html stay as the
   fallback if the list can't load.
================================================================== */
if ($("#subjects .subject[data-band]")) {
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cards = $$("#subjects .subject[data-band]");
  const pad = (n) => String(n).padStart(2, "0");
  const label = (c) => c.name + (c.code && c.code !== "NCE" ? ` <small>${esc(c.code)}</small>` : "");

  const fill = (card, st, c) => {
    const ol = $("ol", card), all = c.parts.flatMap((p) => p.ch);
    $$(".subject__courses button", card).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.co === c.id)));
    gsap.killTweensOf($$("li", ol));
    ol.innerHTML = c.parts.map((p) => (c.parts.length > 1 ? `<li class="subject__part">${esc(p.name)}</li>` : "") + p.ch.map((ch) =>
      `<li><a href="resources.html?course=${c.id}&amp;ch=${ch.n}#notes" data-page="Resources" title="Open the notes for ${esc(ch.t)}"><span class="n">${pad(ch.n)}</span><span>${esc(ch.t)}</span><span class="f">${ch.kind === "real" ? "Kavish’s notes" : "Notes"} →</span></a></li>`).join("")).join("");
    ol.scrollTop = 0;
    ol.classList.remove("is-all");
    // phones show the first rows, then "Show all" (desktop scrolls inside the card instead)
    const long = ol.children.length > 9;
    $(".subject__more", card).innerHTML = `${long ? `<button type="button" class="subject__all" aria-expanded="false">Show all ${all.length} chapters ↓</button>` : ""}<span class="subject__count">${all.length} chapters</span><a href="resources.html?course=${c.id}#notes" data-page="Resources">All ${esc(c.name)} notes →</a>`;
    $(".subject__all", card)?.addEventListener("click", (e) => {
      ol.classList.add("is-all");
      e.currentTarget.remove();
      if (!reduce) gsap.from([...ol.children].slice(9), { y: 14, opacity: 0, duration: 0.45, stagger: 0.02, ease: "expo.out", clearProps: "opacity,transform" });
      ScrollTrigger.refresh();
    });
  };

  fetch("assets/data/chapters.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((stages) => {
      cards.forEach((card) => {
        const st = stages.find((s) => s.band === card.dataset.band);
        if (!st) return;
        const ol = $("ol", card);
        ol.classList.add("subject__list");
        ol.setAttribute("data-scroll-box", ""); ol.setAttribute("data-lenis-prevent", "");
        ol.setAttribute("aria-label", "Chapters");
        if (st.courses.length > 1) {
          ol.insertAdjacentHTML("beforebegin", `<div class="subject__courses" role="tablist" aria-label="${esc(st.label)} courses">${st.courses.map((c) => `<button type="button" role="tab" data-co="${c.id}" aria-selected="false">${label(c)}</button>`).join("")}</div>`);
          $(".subject__courses", card).addEventListener("click", (e) => {
            const b = e.target.closest("[data-co]");
            if (!b || b.getAttribute("aria-selected") === "true") return;
            fill(card, st, st.courses.find((c) => c.id === b.dataset.co));
            bus.emit("filter:change", { kind: "subjects", value: b.dataset.co, btn: b });
            if (!reduce) gsap.fromTo($$("li", ol).slice(0, 10), { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.025, ease: "expo.out", clearProps: "opacity,transform" });
          });
        }
        ol.insertAdjacentHTML("afterend", `<div class="subject__more"></div>`);
        // Grades 10–11 opens on Add Maths (the subject most students come for)
        fill(card, st, st.courses.find((c) => c.id === "add-maths") || st.courses[0]);
      });
      // the per-panel wheel rules don't apply on phones: there the lists just grow
      const boxes = () => $$("#subjects .subject__list").forEach((ol) => {
        ol.toggleAttribute("data-scroll-box", panelMQ.matches);
        ol.toggleAttribute("data-lenis-prevent", panelMQ.matches);
      });
      boxes();
      panelMQ.addEventListener?.("change", boxes);
      ScrollTrigger.refresh();
    })
    .catch(() => {});   // keep the six written topics
}
