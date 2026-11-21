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
  row.innerHTML = `<span class="chart__grade">${g}</span><div class="chart__track"><div class="chart__bar"></div></div><span class="chart__val">0%</span>`;
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
    const [g, n] = set.grades[i], share = n / total;
    row.dataset.tip = `<b>Grade ${g}</b> · ${n} of ${total} students (${Math.round(share * 100)}%)`;
    gsap.to(row.querySelector(".chart__bar"), { scaleX: share / AXIS_MAX, duration: first ? 1.5 : 0.9, delay: (first ? 0.08 : 0.03) * i, ease: "expo.out" });
    const val = row.querySelector(".chart__val"), o = { v: +(val.dataset.v || 0) };
    gsap.to(o, { v: share * 100, duration: 1, ease: "power3.out", onUpdate: () => { val.innerHTML = `${Math.round(o.v)}% <span>(${n})</span>`; val.dataset.v = o.v; } });
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
