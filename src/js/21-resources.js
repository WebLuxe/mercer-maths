/* ==================================================================
   Resources: notes + videos, listed in assets/data/resources.json
   Videos never load until someone presses play (privacy-friendly embed).
================================================================== */
if ($("#notesGrid")) {
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const noteCard = (n) => {
    const ready = !!n.file;
    const open = ready ? `<a class="ncard" href="${esc(n.file)}" download data-band="${esc(n.band)}">` : `<div class="ncard is-soon" data-band="${esc(n.band)}">`;
    return `${open}<span class="ncard__top"><span class="ncard__type">PDF</span><span class="ncard__grade b-${esc(n.band)}">${esc(n.grade)}</span></span>
      <b>${esc(n.title)}</b><span class="ncard__foot"><span>${esc(n.pages)} pages</span><span class="ncard__go">${ready ? "Download ↓" : "Coming soon"}</span></span>${ready ? "</a>" : "</div>"}`;
  };
  const videoCard = (v) => `<button class="vid${v.youtube ? "" : " is-soon"}" data-band="${esc(v.band)}" data-yt="${esc(v.youtube)}" data-title="${esc(v.title)}">
      <span class="vid__thumb b-${esc(v.band)}"><i class="vid__play" aria-hidden="true"></i><span class="vid__len">${esc(v.length)}</span></span>
      <b>${esc(v.title)}</b><span class="vid__meta">${esc(v.grade)}${v.youtube ? "" : " · Coming soon"}</span></button>`;

  const wireFilter = (bar, items) => $$("button", bar).forEach((btn) => btn.addEventListener("click", () => {
    $$("button", bar).forEach((x) => x.setAttribute("aria-selected", String(x === btn)));
    const want = btn.dataset.band, els = items();
    els.forEach((el) => el.classList.toggle("is-dim", want !== "all" && el.dataset.band !== want));
    if (!reduce) gsap.fromTo(els, { y: 24, opacity: 0 }, { y: 0, opacity: (i, el) => (el.classList.contains("is-dim") ? 0.14 : 1), duration: 0.6, stagger: 0.03, ease: "expo.out", clearProps: "opacity,transform" });
  }));

  // ---- video player modal (iframe created on open, destroyed on close)
  const modal = $("#vmodal"), frame = $("#vframe");
  let videoFocus = null;
  const openVideo = (id, title) => {
    clearTimeout(videoClosing);
    modal.classList.remove("is-closing");
    videoFocus = document.activeElement;
    ui.book = true;                                   // same lock as the booking panel: no snapping, scene throttled
    lenis?.stop();
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    $("#vtitle").textContent = title;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    gsap.fromTo(".vmodal__scrim", { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(".vmodal__box", { y: 40, scale: 0.94, opacity: 0, rotationX: 12, transformPerspective: 1200 }, { y: 0, scale: 1, opacity: 1, rotationX: 0, duration: 0.8, ease: "expo.out" });
    setTimeout(() => $(".vmodal__x").focus({ preventScroll: true }), 300);
  };
  let videoClosing = 0;
  const closeVideo = () => {
    if (!modal.classList.contains("is-open") || modal.classList.contains("is-closing")) return;
    // state changes now; the fade is only cosmetic (and has a timer backup if the animation clock is asleep)
    frame.innerHTML = "";                             // stops playback and frees the player immediately
    modal.classList.add("is-closing");
    modal.setAttribute("aria-hidden", "true");
    ui.book = false;
    lenis?.start();
    videoFocus?.focus?.({ preventScroll: true });
    const finish = () => { clearTimeout(videoClosing); modal.classList.remove("is-open", "is-closing"); };
    videoClosing = setTimeout(finish, 450);
    gsap.to(".vmodal__box", { y: 30, scale: 0.96, opacity: 0, duration: 0.35, ease: "power2.in" });
    gsap.to(".vmodal__scrim", { opacity: 0, duration: 0.35, onComplete: finish });
  };
  modal.addEventListener("click", (e) => e.target.closest("[data-vclose]") && closeVideo());
  addEventListener("keydown", (e) => e.key === "Escape" && closeVideo());

  fetch("assets/data/resources.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((data) => {
      $("#notesGrid").innerHTML = (data.notes || []).map(noteCard).join("");
      $("#videosGrid").innerHTML = (data.videos || []).map(videoCard).join("");
      wireFilter($('[data-lib="notes"]'), () => $$("#notesGrid > *"));
      wireFilter($('[data-lib="videos"]'), () => $$("#videosGrid > *"));
      $$("#videosGrid .vid").forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.yt) openVideo(b.dataset.yt, b.dataset.title);
        else gsap.fromTo(b, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
      }));
      ["#notesGrid", "#videosGrid"].forEach((g) =>
        gsap.from(`${g} > *`, { y: 50, opacity: 0, rotationX: -25, transformPerspective: 900, duration: 1, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: g, start: "top 88%" } })
      );
      ScrollTrigger.refresh();
    })
    .catch(() => {
      $("#notesGrid").innerHTML = `<p class="lib__err">The list couldn't load. If you opened the file directly, run it through a web server instead (npm run serve).</p>`;
    });
}
