/* ==================================================================
   Scanner: the testimonials travel through a beam that turns each
   "before" card into its "after"
================================================================== */
// The page's own markup is three plain quotes (and stays that way with reduced motion). Here they are read once and
// rebuilt as two identical rows of cards, one drawn as "before" and one as "after", laid on top of each other and
// each cut off at the beam by CSS (see .scan in _18-testimonials.scss). Both rows run the same CSS animation, so a
// card changes exactly as it crosses the beam and no script runs while it moves.
{
  const list = $(".quotes");
  if (list && !reduce) {
    const quotes = $$(".quote", list).map((q) => {
      const grades = $$(".quote__shift b", q).map((b) => b.textContent);
      return { tag: $(".quote__shift span", q)?.textContent || "", from: grades[0] || "?", to: grades[1] || "✓",
        text: $("blockquote", q).textContent, who: $("cite", q).textContent };
    });
    const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const before = (q) => `<div class="sq sq--before"><span class="sq__tag">${esc(q.tag)} · before</span><b class="sq__grade">${esc(q.from)}</b><i></i><i></i><i></i><cite>${esc(q.who)}</cite></div>`;
    const after = (q) => `<figure class="sq sq--after"><span class="sq__tag">${esc(q.tag)} · after</span><b class="sq__grade">${esc(q.to)}</b><blockquote>${esc(q.text)}</blockquote><cite>${esc(q.who)}</cite></figure>`;
    // each row holds the set four times: the animation slides it by half its width, so it loops without a seam on any
    // screen. Only the first set of the "after" row is read out by screen readers.
    const row = (card, hidden) => `<div class="scan__track">${[0, 1, 2, 3].map((k) => `<div style="display:contents"${k || hidden ? ' aria-hidden="true"' : ""}>${quotes.map(card).join("")}</div>`).join("")}</div>`;
    const scan = document.createElement("div");
    scan.className = "scan";
    scan.id = "scan";
    scan.innerHTML = `<div class="scan__row scan__row--before" aria-hidden="true">${row(before, true)}</div>`
      + `<div class="scan__row scan__row--after">${row(after, false)}</div>`
      + `<div class="scan__beam" aria-hidden="true"><span>one year with Kavish</span></div>`;
    list.replaceWith(scan);
  }
}
