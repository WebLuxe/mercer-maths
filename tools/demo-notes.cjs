// Turns the written demo notes in tools/notes-demo/<course>.json into PDFs in assets/notes/demo/<course>/.
// Run: npm run notes   (needs Microsoft Edge or Chrome on this computer; set BROWSER to its path if not found)
// Then npm run build picks them up. Kavish's own notes in assets/notes/<course>/ always win over these.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const { stages } = require('./syllabus.cjs');
const ROOT = path.join(__dirname, '..'), SRC = path.join(__dirname, 'notes-demo'), OUT = path.join(ROOT, 'assets', 'notes', 'demo');
const slug = t => t.toLowerCase().replace(/[\u2019']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* the small notation the writers use: **bold**, x^{2}, a_{n} */
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>').replace(/_\{([^}]*)\}/g, '<sub>$1</sub>');

const CSS = `
@page{size:A4;margin:16mm 16mm 18mm}
*{box-sizing:border-box}
body{margin:0;font:10.5pt/1.5 "Segoe UI",Inter,Arial,sans-serif;color:#1c1c33}
.top{margin:-16mm -16mm 8mm;padding:12mm 16mm 9mm;background:linear-gradient(120deg,#7c5cff,#5b3fe0 60%,#22a6c8);color:#fff}
.top small{display:block;font-size:7.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.top .ch{margin-top:5mm;font-size:11pt;opacity:.85}
.top h1{margin:1mm 0 0;font:700 24pt/1.15 "Segoe UI",Arial,sans-serif;letter-spacing:-.01em}
.sum{margin:0 0 6mm;padding:3.5mm 4.5mm;border-left:3px solid #22d3ee;background:#effbfd;font-size:10.5pt}
h2{margin:6mm 0 2.5mm;font:700 13.5pt "Segoe UI",Arial,sans-serif;color:#5b3fe0;break-after:avoid}
h2 .n{display:inline-block;width:7mm;height:7mm;margin-right:2mm;border-radius:50%;background:#7c5cff;color:#fff;font-size:9.5pt;line-height:7mm;text-align:center;vertical-align:1px}
ul{margin:0;padding-left:5mm}li{margin:1mm 0}
.f{margin:2.5mm 0 1mm;padding:2.5mm 4mm;border:1px solid #d9d2ff;border-radius:2.5mm;background:#f6f4ff;break-inside:avoid}
.f div{margin:.8mm 0;font-family:"Cambria Math",Cambria,"Times New Roman",serif;font-size:11.5pt}
.ex{margin:3mm 0;border:1px solid #e1e3ee;border-radius:2.5mm;break-inside:avoid;overflow:hidden}
.ex .q{padding:2.5mm 4mm;background:#f3f4f9;font-weight:600}
.ex .q span{color:#5b3fe0;margin-right:2mm}
.ex ol{margin:2mm 0;padding:0 4mm 0 9mm}
.ex .a{padding:2mm 4mm 2.5mm;border-top:1px dashed #e1e3ee;font-weight:600;color:#0b7a5c}
.pr{margin:0;padding-left:6mm}.pr li{margin:1.6mm 0}
.tip{margin:5mm 0 0;padding:3mm 4.5mm;border-radius:2.5mm;background:#fff6dc;border:1px solid #f6d77a;break-inside:avoid}
.tip b{color:#8a5a00}
.ans{margin-top:6mm;padding-top:3mm;border-top:1px solid #e1e3ee;font-size:9pt;color:#555a75;break-inside:avoid}
.ans b{color:#1c1c33}.ans span{display:inline-block;margin-right:5mm}
sup,sub{font-size:70%;line-height:0}`;

function page(c, num, title, n) {
  const sec = (n.sections || []).map((s, i) => `<h2><span class="n">${i + 1}</span>${md(s.h)}</h2><ul>${(s.body || []).map(b => `<li>${md(b)}</li>`).join('')}</ul>` +
    (s.formulas && s.formulas.length ? `<div class="f">${s.formulas.map(f => `<div>${md(f)}</div>`).join('')}</div>` : '')).join('');
  const ex = (n.examples || []).map((e, i) => `<div class="ex"><div class="q"><span>Example ${i + 1}</span>${md(e.q)}</div><ol>${(e.steps || []).map(s => `<li>${md(s)}</li>`).join('')}</ol><div class="a">Answer: ${md(e.answer)}</div></div>`).join('');
  const pr = (n.practice || []);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="top"><small>Kavish Maths \u00b7 ${esc(c.board)}${c.code && c.code !== 'NCE' ? ' (' + esc(c.code) + ')' : ''}</small><div class="ch">Chapter ${num}</div><h1>${esc(title)}</h1></div>
${n.summary ? `<p class="sum">${md(n.summary)}</p>` : ''}${sec}
${ex ? `<h2>Worked examples</h2>${ex}` : ''}
${pr.length ? `<h2>Practice</h2><ol class="pr">${pr.map(p => `<li>${md(p.q)}</li>`).join('')}</ol>` : ''}
${n.tip ? `<p class="tip"><b>Exam tip:</b> ${md(n.tip)}</p>` : ''}
${pr.length ? `<div class="ans"><b>Answers</b>&nbsp;&nbsp; ${pr.map((p, i) => `<span>${i + 1}. ${md(p.a)}</span>`).join(' ')}</div>` : ''}
</body></html>`;
}

const FOOT = (c, num) => `<div style="width:100%;margin:0 16mm;font:7pt 'Segoe UI',Arial;color:#8a8fa8;display:flex;justify-content:space-between"><span>Kavish Maths \u00b7 ${esc(c.name)} \u00b7 Chapter ${num} \u00b7 demo notes for the website preview</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;

(async () => {
  const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => /\.json$/.test(f)) : [];
  const content = {};
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    Object.assign(content[j.course] = content[j.course] || {}, j.chapters);
  }
  const exe = process.env.BROWSER || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
  const br = await chromium.launch(exe ? { executablePath: exe } : {});
  const pg = await br.newPage();
  fs.rmSync(OUT, { recursive: true, force: true });
  let made = 0;
  for (const st of stages) for (const c of st.courses) {
    let num = 0;
    for (const [, chapters] of c.parts) for (const [title] of chapters) {
      num++;
      const n = (content[c.id] || {})[title];
      if (!n) continue;
      await pg.setContent(page(c, num, title, n), { waitUntil: 'load' });
      fs.mkdirSync(path.join(OUT, c.id), { recursive: true });
      await pg.pdf({ path: path.join(OUT, c.id, String(num).padStart(2, '0') + '-' + slug(title) + '.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: FOOT(c, num), margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' } });
      made++;
    }
    for (const t of Object.keys(content[c.id] || {})) if (!c.parts.some(([, ch]) => ch.some(([x]) => x === t))) console.warn('  ! ' + c.id + ': no chapter called "' + t + '"');
  }
  await br.close();
  console.log('demo notes: ' + made + ' PDFs in assets/notes/demo/');
})().catch(e => { console.error(e); process.exit(1); });
