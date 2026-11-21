/* ==================================================================
   Page transitions: five liquid columns rise to cover, then rise away on the next page
================================================================== */
const ptLabel = (text) => {
  $("#ptLabel").innerHTML = [...text].map((c) => `<span class="c">${c === " " ? "&nbsp;" : c.replace(/[&<>]/g, "")}</span>`).join("");
  return $$("#ptLabel .c");
};
// GSAP owns these transforms from the start (so it never stacks its offset on top of the CSS one)
gsap.set("#pt i", { y: 0, yPercent: document.documentElement.classList.contains("pt-in") ? 0 : 105 });
function revealPage() {
  let label = "";
  try { label = sessionStorage.getItem("pt") || ""; sessionStorage.removeItem("pt"); } catch (e) {}
  const chars = ptLabel(label);
  gsap.set("#pt i", { y: 0, yPercent: 0 });
  gsap.set(chars, { y: 0, yPercent: 0 });
  document.documentElement.classList.remove("pt-in");
  bus.emit("page:reveal", { label });
  gsap.timeline({ onComplete: () => gsap.set("#pt i", { yPercent: 105 }) })
    .to(chars, { yPercent: -110, duration: 0.55, stagger: 0.03, ease: "power3.in" }, 0.1)
    .to("#pt i", { yPercent: -105, duration: 1.15, stagger: { each: 0.07, from: "center" }, ease: "expo.inOut" }, 0.3);
}
function leaveTo(url, label) {
  try { sessionStorage.setItem("pt", label); } catch (e) {}
  const chars = ptLabel(label);
  lenis?.stop();
  bus.emit("page:leave", { url, label });
  if (reduce) { location.href = url; return; }
  gsap.timeline({ onComplete: () => (location.href = url) })
    .fromTo("#pt i", { yPercent: 105 }, { yPercent: 0, duration: 0.9, stagger: { each: 0.06, from: "edges" }, ease: "expo.inOut" })
    .fromTo(chars, { y: 0, yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: 0.035, ease: "expo.out" }, "-=0.4")
    .to({}, { duration: 0.1 });
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-page]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  const url = a.getAttribute("href"), [file, hash] = url.split("#");
  const here = location.pathname.split("/").pop() || "index.html";
  if (file === here) {                                   // same page: just glide
    const t = hash ? $("#" + hash) : 0;
    lenis ? lenis.scrollTo(t, { duration: 1.4, force: true }) : scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  leaveTo(url, a.dataset.page);
});
addEventListener("pageshow", (e) => {                     // back button from the browser cache
  if (!e.persisted) return;
  gsap.set("#pt i", { yPercent: 105 });
  $("#ptLabel").innerHTML = "";
  lenis?.start();
});
