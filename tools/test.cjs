// Browser tests for the whole site: npm test
// Runs the real pages in Edge or Chrome (headless) at two desktop sizes and a phone size.
// Set BROWSER=<path to chrome/edge> if neither is found. Screenshots go to test-shots/ (git-ignored).
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, ".."), OUT = path.join(ROOT, "test-shots");
const BROWSERS = [process.env.BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge"].filter(Boolean);
const exe = BROWSERS.find((p) => fs.existsSync(p));
if (!exe) { console.error("No Edge/Chrome found. Run with BROWSER=/path/to/chrome npm test"); process.exit(1); }

// tiny static server (same as GitHub Pages: plain files)
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".pdf": "application/pdf", ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

let B = "";
const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ok   " : "  FAIL ") + msg); if (!ok) fails.push(msg); };
const ready = (p) => p.waitForFunction(() => !document.body.classList.contains("is-loading") && !document.documentElement.classList.contains("pt-in"), null, { timeout: 40000 });
const watch = (p, errors) => {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("response", (r) => r.status() >= 400 && errors.push(r.status() + " " + r.url()));
};

async function desktop(br, vw, vh) {
  const tag = `${vw}x${vh}`, errors = [];
  console.log(`\nDesktop ${tag}`);
  const ctx = await br.newContext({ viewport: { width: vw, height: vh } });
  const p = await ctx.newPage();
  watch(p, errors);
  const box = (s) => p.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; }, s);

  // RESOURCES: notes
  await p.goto(B + "resources.html"); await ready(p); await p.waitForTimeout(1200);
  await p.click("#dots button:nth-child(2)"); await p.waitForTimeout(2000);
  const notes = await box("#notes"), wrap = await box("#notes > .wrap");
  check(wrap.bottom <= notes.bottom + 1 && wrap.top >= notes.top - 1, `notes stay inside their section (${wrap.top}..${wrap.bottom} in ${notes.top}..${notes.bottom})`);
  const still = [];
  for (const band of ["7-9", "12-13", "10-11", "7-9"]) {
    await p.click(`[data-lib="chapters"] [data-band="${band}"]`); await p.waitForTimeout(800);
    const t = await box('[data-lib="chapters"]'), l = await box("#chList");
    still.push(t.top + "/" + (await p.evaluate(() => scrollY)));
    check(l.bottom <= vh, `grade ${band}: chapter list fits the screen (bottom ${l.bottom})`);
  }
  await p.click(`[data-lib="chapters"] [data-band="10-11"]`); await p.waitForTimeout(600);
  for (const co of ["o-maths", "add-maths"]) {
    await p.click(`#chCourses [data-co="${co}"]`); await p.waitForTimeout(600);
    still.push((await box('[data-lib="chapters"]')).top + "/" + (await p.evaluate(() => scrollY)));
  }
  check(new Set(still).size === 1, `tabs and page never move when switching grade or course (${[...new Set(still)]})`);
  await p.click(`#chCourses [data-co="o-maths"]`); await p.waitForTimeout(600);
  const lb = await box("#chList");
  await p.mouse.move(vw / 2, lb.top + 60);
  const y0 = await p.evaluate(() => scrollY);
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(60); }
  await p.waitForTimeout(600);
  const st = await p.evaluate(() => ({ y: scrollY, lt: document.querySelector("#chList").scrollTop }));
  check(st.y === y0 && st.lt > 0, `wheel over the list scrolls the list (${st.lt}px), not the page`);
  await p.screenshot({ path: `${OUT}/${tag}-notes.png` });
  await p.evaluate(() => { const l = document.querySelector("#chList"); l.scrollTop = l.scrollHeight; });
  await p.waitForTimeout(400);
  await p.mouse.wheel(0, 120); await p.waitForTimeout(1800);
  const yv = await p.evaluate(() => Math.round(scrollY)), vtop = await p.evaluate(() => Math.round(document.querySelector("#videos").getBoundingClientRect().top + scrollY));
  check(Math.abs(yv - vtop) < 3, `at the end of the list, the next flick goes to Videos`);

  // RESOURCES: videos
  const vt = [];
  for (const band of ["7-9", "12-13", "10-11", "all"]) {
    await p.click(`[data-lib="videos"] [data-band="${band}"]`); await p.waitForTimeout(800);
    const vis = await p.$$eval("#videosGrid .vid", (els) => els.filter((e) => !e.hidden && e.offsetParent).map((e) => e.dataset.band));
    vt.push((await box('[data-lib="videos"]')).top);
    check(band === "all" ? vis.length >= 1 : vis.every((b) => b === band), `video filter "${band}" shows only matching videos (${vis.length})`);
  }
  check(new Set(vt).size === 1, `video filter tabs stay still (${vt})`);

  // RESOURCES: reader
  await p.mouse.wheel(0, -120); await p.waitForTimeout(1900);
  const yb = await p.evaluate(() => Math.round(scrollY));
  await p.evaluate(() => (document.querySelector("#chList").scrollTop = 0));
  await p.click("#chList .chr >> nth=0"); await p.waitForTimeout(3000);
  check((await p.$$eval(".rdr__p canvas", (c) => c.length)) > 0, `the notes reader draws PDF pages`);
  await p.screenshot({ path: `${OUT}/${tag}-reader.png` });
  await p.keyboard.press("Escape"); await p.waitForTimeout(900);
  check((await p.evaluate(() => Math.round(scrollY))) === yb, `closing the reader returns to the same spot`);
  await p.click(`#chCourses [data-co="add-maths"]`); await p.waitForTimeout(600);
  const real = await p.$("#chList .chr.is-real");
  if (real) {
    await real.click(); await p.waitForTimeout(3500);
    check((await p.$$eval(".rdr__p canvas", (c) => c.length)) > 0, `Kavish's own notes open`);
    if ((await p.$$eval("#rdrTabs button", (b) => b.length)) > 1) { await p.click("#rdrTabs button >> nth=1"); await p.waitForTimeout(3000); check((await p.$$eval(".rdr__p canvas", (c) => c.length)) > 0, `a chapter's second notes file opens`); }
    await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  }
  await p.fill("#chQ", "integr"); await p.waitForTimeout(400);
  check((await p.$$eval("#chList .chr", (r) => r.length)) >= 1, `chapter search finds "integr"`);
  await p.fill("#chQ", "zzzz"); await p.waitForTimeout(300);
  check(!!(await p.$("#chList .lib__err")), `chapter search shows a no-match message`);
  await p.fill("#chQ", "");

  // TUITION
  await p.goto(B + "tuition.html"); await ready(p); await p.waitForTimeout(1000);
  await p.click("#dots button:nth-child(2)"); await p.waitForTimeout(2200);
  const sec = await box("#subjects"), grid = await box("#subjects .subjects");
  check(grid.bottom <= sec.bottom + 1, `subject cards fit their section`);
  check((await p.$$eval("#subjects .subject", (cs) => cs.map((c) => c.querySelectorAll("li > a").length))).every((n) => n >= 8), `subject cards list every chapter`);
  await p.click('#subjects .subject__courses [data-co="o-maths"]'); await p.waitForTimeout(700);
  check((await p.$$eval('#subjects [data-band="10-11"] li > a', (a) => a.length)) === 33, `Grades 10–11 → Mathematics lists all 33 chapters`);
  const card = await box('#subjects [data-band="10-11"] .subject__list');
  await p.mouse.move(vw / 2, card.top + 40);
  const ty = await p.evaluate(() => scrollY);
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(60); }
  await p.waitForTimeout(500);
  const tst = await p.evaluate(() => ({ y: scrollY, lt: document.querySelector('#subjects [data-band="10-11"] .subject__list').scrollTop }));
  check(tst.y === ty && tst.lt > 0, `wheel scrolls a subject card's list, not the page`);
  await p.screenshot({ path: `${OUT}/${tag}-subjects.png` });
  await p.click("#dots button:nth-child(3)"); await p.waitForTimeout(2000);
  await p.click('.tt__filters [data-form="12-13"]'); await p.waitForTimeout(1200);
  check((await p.$$eval(".slot.is-dim", (s) => s.length)) > 0, `timetable filter works`);
  // booking → WhatsApp
  await p.click(".slot:not(.is-dim):not(.is-full) >> nth=0"); await p.waitForTimeout(1200);
  for (let i = 0; i < 3 && !(await p.isVisible("#bookDone")); i++) {
    const step = await p.$('.book__step.is-on, .book__step[aria-hidden="false"]');
    await p.$$eval(".book__step .chips", (cs) => cs.forEach((c) => { if (c.offsetParent && !c.querySelector(".is-on, [aria-pressed=true]")) c.querySelector("button").click(); }));
    if (await p.isVisible('input[name="name"]')) { await p.fill('input[name="name"]', "Test"); await p.fill('input[name="phone"]', "5 123 4567"); }
    await p.click("#bookNext"); await p.waitForTimeout(900);
  }
  const wa = await p.getAttribute("#sendWa", "href");
  check(/^https:\/\/wa\.me\/23059238436\?text=/.test(wa || ""), `booking writes a WhatsApp message to +230 5923 8436`);
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);

  // Tuition chapter → Resources opens those notes
  await p.goto(B + "tuition.html"); await ready(p); await p.waitForTimeout(800);
  await p.click("#dots button:nth-child(2)"); await p.waitForTimeout(2000);
  await p.click('#subjects [data-band="12-13"] li > a >> nth=1');
  await p.waitForURL(/resources\.html/, { timeout: 15000 }); await ready(p); await p.waitForTimeout(3500);
  const rd = await p.evaluate(() => ({ open: document.querySelector("#rdr").classList.contains("is-open"), c: document.querySelectorAll(".rdr__p canvas").length, url: location.href }));
  check(rd.open && rd.c > 0 && !/ch=/.test(rd.url), `a chapter link on Tuition opens its notes on Resources`);
  await p.keyboard.press("Escape"); await p.waitForTimeout(800);
  check(Math.abs(await p.evaluate(() => Math.round(document.querySelector("#notes").getBoundingClientRect().top))) < 5, `…and closing them lands on the Notes section`);

  // PROFILE + contact links on every page
  for (const pg of ["index.html", "tuition.html", "resources.html"]) {
    await p.goto(B + pg); await ready(p); await p.waitForTimeout(600);
    const links = await p.$$eval('a[href^="https://wa.me/23059238436"]', (a) => a.length);
    const credit = await p.getAttribute(".credit a", "href");
    check(links >= 2 && credit === "https://webluxe.github.io/WebLuxe/", `${pg}: WhatsApp links and WebLuxe credit present`);
  }
  for (let i = 0; i < 8; i++) { await p.mouse.move(vw / 2, vh / 2); await p.mouse.wheel(0, 200); await p.waitForTimeout(1400); }
  check(errors.length === 0, `no console errors or failed requests${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

async function phone(br) {
  console.log(`\nPhone 390x844`);
  const errors = [];
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  watch(p, errors);
  for (const pg of ["index.html", "tuition.html", "resources.html"]) {
    await p.goto(B + pg); await ready(p); await p.waitForTimeout(800);
    check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${pg}: no sideways scroll`);
  }
  await p.evaluate(() => document.querySelector("#notes").scrollIntoView()); await p.waitForTimeout(800);
  for (const band of ["7-9", "12-13", "10-11"]) { await p.tap(`[data-lib="chapters"] [data-band="${band}"]`); await p.waitForTimeout(600); }
  await p.tap("#chList .chr >> nth=2"); await p.waitForTimeout(3500);
  check((await p.$$eval(".rdr__p canvas", (c) => c.length)) > 0, `the reader draws pages on a phone`);
  await p.screenshot({ path: `${OUT}/phone-reader.png` });
  await p.tap("[data-rclose]"); await p.waitForTimeout(600);
  await p.goto(B + "tuition.html"); await ready(p); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector("#subjects").scrollIntoView()); await p.waitForTimeout(1500);
  const before = await p.$$eval('#subjects [data-band="7-9"] .subject__list > li', (l) => l.filter((x) => x.offsetParent).length);
  await p.tap('#subjects [data-band="7-9"] .subject__all'); await p.waitForTimeout(800);
  const after = await p.$$eval('#subjects [data-band="7-9"] .subject__list > li', (l) => l.filter((x) => x.offsetParent).length);
  check(before <= 9 && after > before, `phone subject cards start short, "Show all" reveals every chapter (${before} → ${after})`);
  await p.screenshot({ path: `${OUT}/phone-subjects.png` });
  check(errors.length === 0, `no console errors on the phone${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

async function offline(br) {
  console.log(`\nNo third-party scripts (everything but Google Fonts blocked)`);
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.route((u) => u.hostname !== "127.0.0.1" && !/fonts\.(googleapis|gstatic)\.com/.test(u.hostname), (r) => r.abort());
  await p.goto(B + "resources.html"); await ready(p); await p.waitForTimeout(1500);
  check((await p.$$eval(".chr", (r) => r.length)) > 0, `the site starts and lists chapters without any CDN`);
  await ctx.close();
}

async function slowPhone(br) {
  console.log(`\nSlow phone (CPU 4x slower)`);
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.goto(B + "tuition.html"); await ready(p); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => new Promise((ok) => {
    const f = []; let last = performance.now(), y = 0;
    const loop = (t) => { f.push(t - last); last = t; y += 9; scrollTo(0, y); if (f.length < 240) requestAnimationFrame(loop); else ok(f.slice(5).sort((a, b) => a - b)); };
    requestAnimationFrame(loop);
  }));
  const med = r[r.length >> 1], p95 = r[Math.floor(r.length * 0.95)];
  console.log(`         frame time while scrolling: median ${med.toFixed(1)}ms, 95th ${p95.toFixed(1)}ms`);
  check(med < 34, `scrolling stays smooth on a slow phone (median frame ${med.toFixed(1)}ms)`);
  await ctx.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  B = `http://127.0.0.1:${server.address().port}/`;
  const br = await chromium.launch({ executablePath: exe });
  try {
    await desktop(br, 1440, 900);
    await desktop(br, 1280, 720);
    await phone(br);
    await offline(br);
    await slowPhone(br);
  } finally { await br.close(); server.close(); }
  console.log(fails.length ? `\n${fails.length} FAILED` : `\nAll checks passed. Screenshots in test-shots/`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
