/* ==================================================================
   Grade chart
================================================================== */
const DATA = {
  maths: { label: "Mathematics", grades: [["A*", 7], ["A", 11], ["B", 9], ["C", 6], ["D", 3], ["E/U", 2]] },
  add:   { label: "Add Maths",   grades: [["A*", 6], ["A", 8], ["B", 7], ["C", 3], ["D", 1], ["E/U", 1]] },
};
const AXIS_MAX = 0.4;
const rowsEl = $("#chartRows"), tip = $("#tip");
if (rowsEl) DATA.maths.grades.forEach(([g]) => {
  const row = document.createElement("div");
  row.className = "chart__row";
  row.innerHTML = `<span class="chart__grade">${g}</span><div class="chart__track"><div class="chart__bar"></div><i class="chart__tip"></i></div><span class="chart__val">0%</span>`;
  rowsEl.appendChild(row);
});
let currentSet = "maths", chartShown = false;
function drawChart(key, first) {
  currentSet = key;
  chartShown = true;
  bus.emit("chart:draw", { key, first: !!first });
  const set = DATA[key], total = set.grades.reduce((a, [, n]) => a + n, 0);
  $("#chartSub").textContent = `${set.label} · ${total} students`;
  $$(".chart__row").forEach((row, i) => {
    const [g, n] = set.grades[i], share = n / total, to = share / AXIS_MAX;
    row.dataset.tip = `<b>Grade ${g}</b> · ${n} of ${total} students (${Math.round(share * 100)}%)`;
    // each row keeps its own bar length (s) and shown value (v), so switching subject flows on from wherever they are
    const st = row._st || (row._st = { s: 0, v: 0, bar: row.querySelector(".chart__bar"), tip: row.querySelector(".chart__tip"), val: row.querySelector(".chart__val"), tl: null });
    const paint = () => {
      st.bar.style.transform = `scaleX(${st.s.toFixed(4)})`;
      st.tip.style.transform = `translateX(${((st.s - 1) * 100).toFixed(2)}%)`;      // the spark sits on the bar's tip
      st.val.innerHTML = `${Math.round(st.v)}% <span>(${n})</span>`;
    };
    st.tl?.kill();
    if (reduce) { st.s = to; st.v = share * 100; paint(); return; }
    // the first time, the bars shoot out past their mark and settle back, top row first; switching subject re-flows them.
    // A bright spark rides each tip and fades as the bar lands.
    const dur = first ? 1.15 : 0.8;
    st.tl = gsap.timeline({ delay: (first ? 0.09 : 0.04) * i })
      .set(st.tip, { opacity: 1 })
      .to(st, { s: to, duration: dur, ease: first ? "back.out(1.6)" : "power3.inOut" }, 0)
      .to(st, { v: share * 100, duration: dur, ease: first ? "power3.out" : "power3.inOut", onUpdate: paint }, 0)   // (the later of the two: it paints both)
      .to(st.tip, { opacity: 0, duration: 0.45, ease: "power2.in" }, dur * 0.62);
  });
  $("#chartTable").innerHTML =
    `<table><thead><tr><th>Grade</th><th>Students</th><th>Share</th></tr></thead><tbody>` +
    set.grades.map(([g, n]) => `<tr><td>${g}</td><td>${n}</td><td>${Math.round((n / total) * 100)}%</td></tr>`).join("") +
    `</tbody></table>`;
}
$$(".chart__tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    $$(".chart__tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
    drawChart(b.dataset.set, !chartShown);
  })
);
$("#tableToggle")?.addEventListener("click", (e) => {
  const t = $("#chartTable"), open = t.hidden;
  t.hidden = !open;
  e.currentTarget.setAttribute("aria-expanded", open);
  e.currentTarget.textContent = open ? "Hide table" : "View as table";
  ScrollTrigger.refresh();
});
rowsEl?.addEventListener("pointermove", (e) => {
  const row = e.target.closest(".chart__row");
  if (!row || !row.dataset.tip) return tip.classList.remove("is-on");
  tip.innerHTML = row.dataset.tip;
  tip.style.left = e.clientX + "px";
  tip.style.top = e.clientY + "px";
  tip.classList.add("is-on");
});
rowsEl?.addEventListener("pointerleave", () => tip.classList.remove("is-on"));
