/* ==================================================================
   Timetable: filter by form, cards flip in 3D, tap a slot to book it
================================================================== */
if ($("#ttGrid")) {
  // grade bands: 7–9 NCE, 10–11 SC, 12–13 HSC
  const SLOTS = [
    { day: "Mon", time: "15:30", grade: "Grade 9", band: "7-9", subject: "NCE Maths", taken: 4 },
    { day: "Mon", time: "17:30", grade: "Grade 11", band: "10-11", subject: "Add Maths", taken: 5 },
    { day: "Tue", time: "15:30", grade: "Grade 7", band: "7-9", subject: "Maths", taken: 3 },
    { day: "Tue", time: "17:30", grade: "Grade 13", band: "12-13", subject: "A Level Maths", taken: 6 },
    { day: "Wed", time: "15:30", grade: "Grade 10", band: "10-11", subject: "Maths", taken: 4 },
    { day: "Wed", time: "18:00", grade: "Grade 11", band: "10-11", subject: "Add Maths", taken: 2, online: true },
    { day: "Thu", time: "15:30", grade: "Grade 8", band: "7-9", subject: "Maths", taken: 5 },
    { day: "Thu", time: "17:30", grade: "Grade 12", band: "12-13", subject: "A Level Maths", taken: 3 },
    { day: "Fri", time: "15:30", grade: "Grade 10", band: "10-11", subject: "Add Maths", taken: 4 },
    { day: "Fri", time: "17:30", grade: "Grade 11", band: "10-11", subject: "Maths", taken: 6 },
    { day: "Sat", time: "08:30", grade: "Grade 13", band: "12-13", subject: "A Level Maths", taken: 5 },
    { day: "Sat", time: "10:30", grade: "Grade 9", band: "7-9", subject: "NCE Maths", taken: 2 },
  ];
  const SUBJECT_CHIP = { "Maths": "Mathematics", "NCE Maths": "Mathematics", "Add Maths": "Add Maths", "A Level Maths": "A Level Maths" };
  const DAYS = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
  const grid = $("#ttGrid");
  grid.innerHTML = Object.keys(DAYS).map((d) => `<div class="tt__day"><h4><span>${d}</span><span class="tt__long">${DAYS[d].slice(3)}</span></h4>${SLOTS.filter((x) => x.day === d).map((x) => {
    const left = 6 - x.taken, full = left <= 0;
    const dots = Array.from({ length: 6 }, (_, k) => `<i class="${k >= x.taken ? "is-free" : ""}"></i>`).join("");
    return `<button class="slot${full ? " is-full" : ""}${x.online ? " slot--online" : ""}" data-form="${x.band}" data-grade="${x.grade}" data-subject="${x.subject}" data-online="${x.online ? 1 : ""}" ${full ? 'aria-disabled="true"' : ""}>
      <span class="slot__time">${x.time}</span><b>${x.subject}</b><span class="slot__meta">${x.grade} · ${x.online ? "Online" : "In class"}</span>
      <span class="slot__seats">${dots}</span><span class="slot__left">${full ? "Full, join the waitlist" : left === 1 ? "1 seat left" : left + " seats left"}</span></button>`;
  }).join("")}</div>`).join("");

  const slots = $$(".slot", grid);
  slots.forEach((b) => b.addEventListener("click", () => {
    openBook({ subject: SUBJECT_CHIP[b.dataset.subject], grade: b.dataset.grade, format: b.dataset.online ? "Live online" : "Small group" });
  }));
  $$(".tt__filters button").forEach((f) => f.addEventListener("click", () => {
    $$(".tt__filters button").forEach((x) => x.setAttribute("aria-selected", String(x === f)));
    const want = f.dataset.form;
    slots.forEach((sl) => sl.classList.toggle("is-dim", want !== "all" && sl.dataset.form !== want));
    bus.emit("filter:change", { kind: "timetable", value: want, btn: f });
    if (!reduce) gsap.fromTo(slots, { rotationY: -100, opacity: 0 }, { rotationY: 0, opacity: (i, el) => (el.classList.contains("is-dim") ? 0.14 : 1), duration: 0.8, stagger: { each: 0.035, from: "start" }, ease: "expo.out", transformPerspective: 900, clearProps: "opacity" });
  }));
  gsap.from(".tt__day", { y: 60, opacity: 0, rotationX: -35, transformPerspective: 900, duration: 1.1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".tt", start: "top 85%" } });
}
