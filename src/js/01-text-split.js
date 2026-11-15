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
$$("[data-split]").forEach(splitChars);
