/* ==================================================================
   Page transitions: five glowing bars sweep in, the next page builds out of them
================================================================== */
function revealPage() {
  let label = "";
  try { label = sessionStorage.getItem("pt") || ""; sessionStorage.removeItem("pt"); } catch (e) {}
  $("#ptLabel").textContent = label;
  gsap.timeline({ onComplete: () => document.documentElement.classList.remove("pt-in") })
    .set("#pt i", { scaleY: 1, transformOrigin: "50% 0%" })
    .set("#ptLabel", { opacity: 1, y: 0 })
    .to("#ptLabel", { opacity: 0, y: -50, duration: 0.45, ease: "power3.in" }, 0.15)
    .to("#pt i", { scaleY: 0, duration: 0.95, stagger: 0.07, ease: "expo.inOut" }, 0.3);
}
function leaveTo(url, label) {
  try { sessionStorage.setItem("pt", label); } catch (e) {}
  $("#ptLabel").textContent = label;
  lenis?.stop();
  gsap.timeline({ onComplete: () => (location.href = url) })
    .fromTo("#pt i", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.8, stagger: 0.06, ease: "expo.inOut" })
    .fromTo("#ptLabel", { opacity: 0, y: 70, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out" }, "-=0.35")
    .to({}, { duration: 0.12 });
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
  gsap.set("#pt i", { scaleY: 0 });
  gsap.set("#ptLabel", { opacity: 0 });
  lenis?.start();
});
