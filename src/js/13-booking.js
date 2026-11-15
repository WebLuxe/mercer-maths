/* ==================================================================
   Booking drawer: 3 quick steps → a ready-to-send WhatsApp / email
================================================================== */
const bookEl = $("#book"), bookPanel = $(".book__panel"), bookScrim = $(".book__scrim");
const bookSteps = $$(".book__step"), bookBars = $$(".book__bar i"), bookErr = $("#bookErr");
const bookNext = $("#bookNext"), bookBack = $("#bookBack"), bookForm = $("#bookForm"), bookDone = $("#bookDone");
const booking = {};
let bookStep = 0, bookFocus = null;
const FIELD_LABELS = { form: "Form", syllabus: "Syllabus", format: "Format", day: "Best time" };

function pickChip(group, btn) {
  $$("button", group).forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
  booking[group.dataset.field] = btn.textContent;
}
$$(".chips", bookEl).forEach((g) => {
  const f = g.dataset.field;
  if (FIELD_LABELS[f]) g.insertAdjacentHTML("beforebegin", `<span class="chips__label">${FIELD_LABELS[f]}</span>`);
  $$("button", g).forEach((b) => {
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      pickChip(g, b);
      bookErr.textContent = "";
      gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: "back.out(3)" });
      if (bookStep === 0) setTimeout(() => showBookStep(1, 1), 260);   // one tap is enough on step 1
    });
  });
});

function showBookStep(i, dir = 1) {
  bookStep = i;
  bookBars.forEach((b, k) => b.classList.toggle("is-on", k <= i));
  bookBack.style.visibility = i ? "visible" : "hidden";
  bookNext.querySelector("span").textContent = i === bookSteps.length - 1 ? "Create message" : "Next";
  bookSteps.forEach((st, k) => st.classList.toggle("is-on", k === i));
  bookErr.textContent = "";
  if (!reduce) gsap.fromTo(bookSteps[i].children, { x: 50 * dir, opacity: 0, rotationY: 18 * dir, transformPerspective: 900 },
    { x: 0, opacity: 1, rotationY: 0, duration: 0.7, stagger: 0.05, ease: "expo.out" });
}

function bookProblem() {
  const need = [["subject"], ["form", "syllabus", "format"], ["day"]][bookStep];
  const missing = need.find((k) => !booking[k]);
  if (bookStep === 2) {
    const name = bookForm.name.value.trim(), phone = bookForm.phone.value.replace(/\D/g, "");
    bookForm.name.classList.toggle("is-bad", !name);
    bookForm.phone.classList.toggle("is-bad", phone.length < 7);
    if (!name) return "Add the student's name.";
    if (phone.length < 7) return "That phone number looks too short.";
  }
  return missing ? `Pick a ${FIELD_LABELS[missing]?.toLowerCase() || missing} to continue.` : "";
}

bookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const problem = bookProblem();
  if (problem) {
    bookErr.textContent = problem;
    gsap.fromTo(bookPanel, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    return;
  }
  if (bookStep < bookSteps.length - 1) return showBookStep(bookStep + 1, 1);
  finishBooking();
});
bookBack.addEventListener("click", () => bookStep > 0 && showBookStep(bookStep - 1, -1));

function finishBooking() {
  const name = bookForm.name.value.trim(), phone = bookForm.phone.value.trim();
  const msg = `Hi Mercer Maths! I'd like to book a free trial lesson.

Student: ${name}
Subject: ${booking.subject}
Form: ${booking.form} (${booking.syllabus})
Format: ${booking.format}
Best time: ${booking.day}
Parent's WhatsApp: ${phone}`;
  $("#bookPreview").textContent = msg;
  $("#sendWa").href = "https://wa.me/?text=" + encodeURIComponent(msg);
  $("#sendMail").href = "mailto:hello@mercermaths.example?subject=" + encodeURIComponent("Free trial lesson: " + name) + "&body=" + encodeURIComponent(msg);
  bookBars.forEach((b) => b.classList.add("is-on"));
  gsap.to(bookForm, { opacity: 0, y: -20, duration: 0.3, onComplete: () => {
    bookForm.hidden = true;
    bookDone.hidden = false;
    gsap.from(bookDone.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: "expo.out" });
    gsap.from(".book__tick", { scale: 0, rotate: -180, duration: 1, ease: "back.out(2)" });
  } });
  // celebrate in the background: ripple from the panel
  const r = bookPanel.getBoundingClientRect();
  bgMat.uniforms.uRipple.value.set((r.left + r.width / 2) / innerWidth, 1 - (r.top + r.height / 2) / innerHeight);
  bgMat.uniforms.uRippleT.value = bgMat.uniforms.uTime.value;
}

function openBook(preset) {
  if (ui.book) return;
  ui.book = true;
  bookFocus = document.activeElement;
  // reopened after finishing: start a fresh booking view
  if (bookForm.hidden) { bookForm.hidden = false; bookDone.hidden = true; gsap.set(bookForm, { opacity: 1, y: 0 }); }
  const pre = typeof preset === "string" ? (preset ? { format: preset } : {}) : preset || {};
  Object.entries(pre).forEach(([field, val]) => {
    const g = $(`.chips[data-field="${field}"]`, bookEl), b = g && $$("button", g).find((x) => x.textContent === val);
    if (b) pickChip(g, b);
  });
  bookEl.classList.add("is-open");
  bookEl.setAttribute("aria-hidden", "false");
  lenis?.stop();
  gsap.to(bookScrim, { opacity: 1, duration: 0.5 });
  gsap.fromTo(bookPanel, { xPercent: 110, rotationY: -28, transformPerspective: 1400, transformOrigin: "100% 50%" },
    { xPercent: 0, rotationY: 0, duration: reduce ? 0 : 1, ease: "expo.out" });
  showBookStep(0, 1);
  setTimeout(() => $(".book__step.is-on button, .book__step.is-on input", bookEl)?.focus({ preventScroll: true }), 350);
}
function closeBook() {
  if (!ui.book) return;
  gsap.to(bookScrim, { opacity: 0, duration: 0.4 });
  gsap.to(bookPanel, { xPercent: 110, rotationY: -18, duration: reduce ? 0 : 0.6, ease: "expo.in", onComplete: () => {
    bookEl.classList.remove("is-open");
    bookEl.setAttribute("aria-hidden", "true");
    ui.book = false;
    lenis?.start();
    bookFocus?.focus?.({ preventScroll: true });
  } });
}
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-book]");
  if (trigger) { e.preventDefault(); openBook(trigger.dataset.book || ""); return; }
  if (e.target.closest("[data-close]")) closeBook();
});
addEventListener("keydown", (e) => { if (e.key === "Escape") closeBook(); });
