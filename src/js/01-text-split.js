/* ==================================================================
   Text splitting
================================================================== */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  for (const c of text) {
    const s = document.createElement("span");
    s.className = "ch";
    s.setAttribute("aria-hidden", "true");
    s.textContent = c === " " ? " " : c;
    el.appendChild(s);
  }
  const chars = $$(".ch", el);
  chars.forEach((c, i) => { c.style.setProperty("--i", i); c.style.setProperty("--n", chars.length); });
  return chars;
}
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { const w = document.createElement("span"); w.className = "w"; w.textContent = part; frag.appendChild(w); }
        });
        n.replaceWith(frag);
      } else walk(n);
    });
  };
  walk(el);
  return $$(".w", el);
}
// A heading line → words that never break inside (so the line still only wraps between words), each word a
// small mask (.rw), each letter its own piece (.ch). With byWord the pieces are whole words instead: the
// fallback for a line whose letters, set one by one, would wrap differently (no kerning between pieces).
// Each piece knows its place (--i) and the line knows how many there are (--n): that staggers the rise and lets a
// gradient line give every piece its own slice of the gradient (see .is-split in the base styles).
// Returns the number of pieces. (Written as one string: a page has a couple of hundred letters to make.)
function splitLine(el, byWord) {
  const safe = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let i = 0;
  el.innerHTML = el.textContent.trim().split(/\s+/).map((word) =>
    `<span class="rw">${(byWord ? [word] : [...word]).map((c) => `<span class="ch" style="--i:${i++}">${safe(c)}</span>`).join("")}</span>`).join(" ");
  el.style.setProperty("--n", i);
  return i;
}
$$("[data-split]").forEach(splitChars);
