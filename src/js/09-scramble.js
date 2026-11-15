/* ==================================================================
   Text scramble: labels resolve out of maths symbols
================================================================== */
function scramble(el) {
  if (!el || reduce) return;
  const GLYPHS = "∑∫πΔ√∞θλμσ≈≠±÷×∂";
  const final = el.dataset.text || (el.dataset.text = el.textContent);
  const o = { p: 0 };
  gsap.to(o, {
    p: 1, duration: 0.9, ease: "power2.out",
    onUpdate() {
      const k = Math.floor(o.p * final.length);
      let s = final.slice(0, k);
      for (let i = k; i < final.length; i++) s += /\s/.test(final[i]) ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = s;
    },
    onComplete: () => (el.textContent = final),
  });
}
