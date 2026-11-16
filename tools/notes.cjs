// Builds the chapter list for the Resources page (assets/data/chapters.json) and the notes behind it.
// For each chapter, in order of preference:
//   1. Kavish's own notes in assets/notes/<course>/  (standard name, or listed in the chapter's files)
//   2. demo notes in assets/notes/demo/<course>/     (made by: npm run notes)
//   3. a labelled two-page sample, generated here into assets/notes/samples/<course>/
// Also copies the PDF reader (PDF.js) into assets/vendor/pdf/.
const fs = require('fs'), path = require('path');
const { NOTES_BASE, stages } = require('./syllabus.cjs');
const { samplePdf } = require('./samplepdf.cjs');

const ROOT = path.join(__dirname, '..'), NOTES = path.join(ROOT, 'assets', 'notes'), SAMPLES = path.join(NOTES, 'samples');
const slug = t => t.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

fs.rmSync(SAMPLES, { recursive: true, force: true });
const report = [], warn = [];
const out = stages.map(st => ({
  id: st.id, band: st.band, label: st.label, exam: st.exam,
  courses: st.courses.map(c => {
    const dir = path.join(NOTES, c.id), used = new Set();
    let num = 0, real = 0, demo = 0;
    const parts = c.parts.map(([name, chapters]) => ({
      name,
      ch: chapters.map(([title, subs, o = {}]) => {
        num++;
        const std = String(num).padStart(2, '0') + '-' + slug(title) + '.pdf', files = [];
        const add = (file, label) => {
          const p = path.join(dir, file);
          if (!fs.existsSync(p)) { if (file !== std) warn.push(`assets/notes/${c.id}/${file} is listed in tools/syllabus.cjs but isn't in the folder`); return; }
          used.add(file);
          if (!fs.statSync(p).size) { warn.push(`assets/notes/${c.id}/${file} is empty (0 bytes), so it's skipped`); return; }
          files.push({ u: NOTES_BASE + c.id + '/' + encodeURIComponent(file), t: label || '' });
        };
        add(std);
        (o.files || []).forEach(x => Array.isArray(x) ? add(x[0], x[1]) : add(x));
        let kind = 'real';
        if (files.length) real++;
        else if (fs.existsSync(path.join(NOTES, 'demo', c.id, std))) {
          demo++; kind = 'demo';
          files.push({ u: NOTES_BASE + 'demo/' + c.id + '/' + std, t: '' });
        } else {
          kind = 'sample';
          fs.mkdirSync(path.join(SAMPLES, c.id), { recursive: true });
          fs.writeFileSync(path.join(SAMPLES, c.id, std), samplePdf({ num, title, subtopics: subs, course: c.name, board: c.board, code: c.code }));
          files.push({ u: NOTES_BASE + 'samples/' + c.id + '/' + std, t: '' });
        }
        return { n: num, t: title, s: subs, f: files, kind };
      })
    }));
    if (fs.existsSync(dir)) fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f) && !used.has(f)).forEach(f => warn.push(`assets/notes/${c.id}/${f} doesn't match any chapter. Rename it like "07-variation.pdf" or list it in that chapter's files in tools/syllabus.cjs`));
    report.push(`${(st.label + ' ' + c.name).padEnd(30)} ${String(num).padStart(3)} chapters, ${real} with Kavish's notes, ${demo} with demo notes`);
    return { id: c.id, name: c.name, board: c.board, code: c.code, note: c.note || '', parts };
  })
}));

fs.mkdirSync(path.join(ROOT, 'assets', 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets', 'data', 'chapters.json'), JSON.stringify(out));

/* the PDF reader, served from this site */
const pdfjs = path.dirname(require.resolve('pdfjs-dist/package.json'));
fs.mkdirSync(path.join(ROOT, 'assets', 'vendor', 'pdf'), { recursive: true });
['pdf.min.js', 'pdf.worker.min.js'].forEach(f => fs.copyFileSync(path.join(pdfjs, 'build', f), path.join(ROOT, 'assets', 'vendor', 'pdf', f)));

console.log('notes:\n  ' + report.join('\n  '));
warn.forEach(w => console.warn('  ! ' + w));
