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

// real browser windows on common laptops/monitors (screen size minus tabs, address bar and taskbar)
const LAPTOPS = [[1280, 650], [1366, 625], [1440, 790], [1536, 730], [1600, 780], [1920, 960], [2560, 1300], [1024, 640]];
async function laptops(br) {
  console.log(`\nLaptop & desktop windows: every section fits, nothing overlaps`);
  for (const [w, h] of LAPTOPS) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w === 1440 ? 2 : 1 });
    const p = await ctx.newPage();
    const bad = [];
    for (const pg of ["index.html", "tuition.html", "resources.html"]) {
      await p.goto(B + pg); await ready(p); await p.waitForTimeout(3500);   // let the hero intro settle (letters rise from below)
      const r = await p.evaluate(() => {
        const out = [];
        if (document.documentElement.scrollWidth > innerWidth) out.push("sideways scroll");
        document.querySelectorAll("main > section:not(.show)").forEach((s) => {
          const over = s.scrollHeight - s.clientHeight;
          if (over > 2) out.push(`#${s.id || "hero"} overflows by ${over}px`);
        });
        // the hero's text must sit between the nav and the bottom of the screen
        const navB = document.querySelector(".nav .wrap").getBoundingClientRect().bottom;
        const items = [...document.querySelectorAll(".hero .wrap > div:first-child > *")].map((e) => e.getBoundingClientRect());
        const top = Math.min(...items.map((b) => b.top)), bot = Math.max(...items.map((b) => b.bottom));
        if (top < navB + 4) out.push(`hero text starts under the nav (${Math.round(top)} < ${Math.round(navB)})`);
        if (bot > innerHeight - 4) out.push(`hero text runs off the bottom (${Math.round(bot)} > ${innerHeight})`);
        return out;
      });
      r.forEach((x) => bad.push(`${pg} ${x}`));
    }
    await p.screenshot({ path: `${OUT}/laptop-${w}x${h}.png` });
    check(bad.length === 0, `${w}x${h}${bad.length ? ": " + bad.join("; ") : ""}`);
    await ctx.close();
  }
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

// Pages in the two suites below arrive the way they do after a page transition (no logo intro to sit through);
// the scroll set-up they test is the same either way.
const viaTransition = (ctx) => ctx.addInitScript(() => { try { sessionStorage.setItem("pt", "Test"); } catch (e) {} });

// What the motion work promises on a desktop: numbers land on their values, headings stay whole, panels rest
// flat, and holding the mouse down is harmless.
async function motion(br) {
  console.log(`\nMotion (desktop 1440x900)`);
  const errors = [];
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  await viaTransition(ctx);
  const p = await ctx.newPage();
  watch(p, errors);
  for (const pg of ["index.html", "tuition.html", "resources.html"]) {
    await p.goto(B + pg); await ready(p); await p.waitForTimeout(900);
    if (pg === "index.html") {
      // hold the mouse down on empty space, drag a little, let go
      await p.mouse.move(500, 860); await p.mouse.down(); await p.waitForTimeout(650);
      const held = await p.evaluate(() => document.documentElement.classList.contains("is-charging"));
      await p.mouse.move(560, 830, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(400);
      const let_go = await p.evaluate(() => !document.documentElement.classList.contains("is-charging"));
      check(held && let_go, `holding the mouse down on empty space charges the particles, and letting go ends it`);
      // …and the page still works: the Results dot travels there, and the four stats roll to their values
      await p.click("#dots button:nth-child(3)"); await p.waitForTimeout(3700);
      const at = await p.evaluate(() => Math.round(document.querySelector("#results").getBoundingClientRect().top));
      const stats = await p.$$eval("[data-count]", (els) => els.map((e) => e.textContent));
      check(Math.abs(at) < 3, `…and the page still works afterwards (Results is ${at}px from the top)`);
      check(stats.join(" ") === "412 81 1.7 96", `once Results has landed the stats read 412, 81, 1.7 and 96 (${stats.join(", ")})`);
    }
    // walk the whole page so every reveal plays, then give the last ones time to finish
    const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y < max; y += 450) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(110); }
    await p.evaluate((y) => scrollTo(0, y), max); await p.waitForTimeout(2000);
    const heads = await p.evaluate(() => [...document.querySelectorAll("main h2")].filter((h) => h.querySelector(".reveal-line")).map((h) => {
      // what a screen reader gets: the label if there is one, otherwise the text (which must then not be hidden from it)
      const said = h.getAttribute("aria-label") || (h.querySelector('[aria-hidden="true"]') ? "" : h.textContent);
      // every piece of every line is back at rest: nothing left on it, and it sits inside its line
      const stuck = [...h.querySelectorAll(".reveal-line")].filter((line) => {
        const lr = line.getBoundingClientRect();
        return [...line.querySelectorAll(".ch"), line.firstElementChild].some((el) => {
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return (s.transform !== "none" && s.transform !== "matrix(1, 0, 0, 1, 0, 0)") || +s.opacity < 1 || r.top < lr.top - r.height / 2 || r.bottom > lr.bottom + r.height / 2;
        });
      }).length;
      return { ok: said.replace(/\s+/g, "") === h.textContent.replace(/\s+/g, "") && said.trim().length > 3 && !stuck, text: h.textContent.trim().slice(0, 28), stuck };
    }));
    const badHeads = heads.filter((h) => !h.ok);
    check(heads.length >= 2 && !badHeads.length, `${pg}: all ${heads.length} headings keep their full text and finish their reveal${badHeads.length ? " (not: " + badHeads.map((h) => h.text + (h.stuck ? " [stuck]" : "")).join(" | ") + ")" : ""}`);
    // a panel at rest carries no leftover tilt, shrink or dimming, and everything in it has arrived
    const leaning = await p.evaluate(async () => {
      const KEY = "h2, .eyebrow, p, .about__text .w, .stat, .chart, .tl > *, .quote, .teaser__card, .subject, .tt__day, .worked__board, .worked__plot, .quiz, .format, .faq__item, .contact__cta .btn, .contact__info > div, .chx__info, .chr, .vid";
      const out = [];
      for (const sec of document.querySelectorAll("main > section.sec:not(.show), main > section.contact")) {
        scrollTo(0, Math.round(sec.getBoundingClientRect().top + scrollY));
        await new Promise((r) => setTimeout(r, 110));
        const s = getComputedStyle(sec.querySelector(":scope > .wrap"));
        if (s.transform !== "none" || s.opacity !== "1") out.push(`#${sec.id} ${s.transform} opacity ${s.opacity}`);
        for (const el of sec.querySelectorAll(KEY)) {
          const r = el.getBoundingClientRect();
          if (!r.height || r.bottom < 0 || r.top > innerHeight) continue;
          let o = 1;
          for (let n = el; n && n !== sec; n = n.parentElement) o *= +getComputedStyle(n).opacity;
          if (o < 0.95) out.push(`#${sec.id} ${el.className ? "." + String(el.className).split(" ")[0] : el.tagName.toLowerCase()} is at ${o.toFixed(2)}`);
        }
      }
      return out;
    });
    check(!leaning.length, `${pg}: every panel stands flat at rest, with everything in it fully visible${leaning.length ? " (" + [...new Set(leaning)].slice(0, 6).join("; ") + ")" : ""}`);
  }
  check(errors.length === 0, `no console errors${errors.length ? ": " + [...new Set(errors)].join(" | ") : ""}`);
  await ctx.close();
}

// …and on a phone: a tap is acknowledged, and nothing is left hidden or dim where it is being read.
async function touch(br) {
  console.log(`\nTouch (phone 390x844)`);
  const errors = [];
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await viaTransition(ctx);
  const p = await ctx.newPage();
  watch(p, errors);
  for (const pg of ["index.html", "tuition.html", "resources.html"]) {
    await p.goto(B + pg); await ready(p); await p.waitForTimeout(900);
    if (pg === "index.html") {
      await p.touchscreen.tap(200, 240);                           // on the headline: nothing to press there
      await p.waitForTimeout(90);
      const ring = await p.evaluate(() => { const r = document.querySelector(".tapring"); return r ? +getComputedStyle(r).opacity : -1; });
      check(ring > 0, `a tap leaves a ring where the finger was (opacity ${ring})`);
    }
    // to the bottom of the page and back up again; on the way back, whatever is in the middle of the screen must be fully visible
    const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight), stops = [];
    for (let y = 0; y < max; y += 420) stops.push(y);
    stops.push(max);
    for (const y of stops) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(70); }
    await p.waitForTimeout(1300);
    const dim = [];
    for (const y of stops.reverse()) {
      await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(170);
      const found = await p.evaluate(() => {
        const KEY = "main h2, main .eyebrow, main p, .about__text .w, .stat, .chart, .tl > *, .quote, .teaser__card, .subject, .tt__day, .worked__board, .worked__plot, .quiz, .format, .faq__item, .contact__cta .btn, .contact__info > div, .chx__info, .chr, .vid";
        const lo = innerHeight * 0.24, hi = innerHeight * 0.76, out = [];
        for (const el of document.querySelectorAll(KEY)) {
          const r = el.getBoundingClientRect();
          if (!r.height || r.bottom < lo || r.top > hi) continue;   // not in the middle of the screen right now
          if (el.closest(".show__track")) continue;                 // the carousel dims its side cards on purpose
          let o = 1;
          for (let n = el; n && n !== document.body; n = n.parentElement) o *= +getComputedStyle(n).opacity;
          if (o < 0.95) out.push((el.id ? "#" + el.id : el.className ? "." + String(el.className).split(" ")[0] : el.tagName.toLowerCase() + ` "${el.textContent.trim().slice(0, 18)}"`) + " at " + o.toFixed(2));
        }
        return out;
      });
      found.forEach((f) => dim.push(`${f} (scroll ${y})`));
    }
    check(!dim.length, `${pg}: everything is fully visible in the middle of the screen after scrolling down and back${dim.length ? ": " + [...new Set(dim)].slice(0, 5).join("; ") : ""}`);
  }
  check(errors.length === 0, `no console errors on the phone${errors.length ? ": " + [...new Set(errors)].join(" | ") : ""}`);
  await ctx.close();
}

// Sound is a choice: a button on desktop that starts silent (nothing audio-related even exists until it is pressed),
// really plays once it is on, goes quiet again when turned off, and isn't offered on phones at all.
async function sound(br) {
  console.log(`\nSound (off until asked for)`);
  const errors = [];
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  await viaTransition(ctx);
  // count the audio engines the page creates and the voices it plays
  await ctx.addInitScript(() => {
    window.__au = { ctx: [], voices: 0 };
    const AC = window.AudioContext;
    if (!AC) return;
    window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__au.ctx.push(this); } };
    for (const k of ["createOscillator", "createBufferSource"]) { const make = AC.prototype[k]; AC.prototype[k] = function () { window.__au.voices++; return make.call(this); }; }
  });
  const p = await ctx.newPage();
  watch(p, errors);
  const au = () => p.evaluate(() => ({ n: window.__au.ctx.length, state: window.__au.ctx[0]?.state || "none", voices: window.__au.voices }));
  const pressed = () => p.getAttribute("#sfx", "aria-pressed");
  await p.goto(B + "index.html"); await ready(p); await p.waitForTimeout(900);
  let a = await au();
  check((await pressed()) === "false" && a.n === 0, `sound is off at first, and no audio engine exists until it is asked for`);
  await p.click("#sfx"); await p.waitForTimeout(800);
  a = await au();
  check((await pressed()) === "true" && a.state === "running", `the sound button turns sound on (audio ${a.state})`);
  const before = a.voices;
  await p.hover(".hero__cta .btn >> nth=0"); await p.waitForTimeout(150);
  await p.hover(".hero__cta .btn >> nth=1"); await p.waitForTimeout(150);
  await p.mouse.move(700, 500); await p.mouse.wheel(0, 200); await p.waitForTimeout(1900);
  a = await au();
  check(a.voices > before + 2, `hovering a control and moving to the next panel are heard (${a.voices - before} voices played)`);
  await p.click("#sfx"); await p.waitForTimeout(900);
  a = await au();
  const quiet = a.voices;
  await p.mouse.move(700, 500); await p.mouse.wheel(0, 200); await p.waitForTimeout(1700);
  check((await pressed()) === "false" && a.state === "suspended" && (await au()).voices === quiet, `turning it off goes silent (audio ${a.state})`);
  check(errors.length === 0, `no console errors${errors.length ? ": " + [...new Set(errors)].join(" | ") : ""}`);
  await ctx.close();

  const pc = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await viaTransition(pc);
  const pp = await pc.newPage();
  await pp.goto(B + "index.html"); await ready(pp); await pp.waitForTimeout(600);
  check(!(await pp.$("#sfx")), `phones aren't offered the sound button`);
  await pc.close();
}

// The suites, in the order they run. Name one or more to run only those:
//   node tools/test.cjs laptops        node tools/test.cjs phone slow        (no names = everything)
const SUITES = [
  ["desktop", (br) => desktop(br, 1440, 900)],
  ["desktop-small", (br) => desktop(br, 1280, 720)],
  ["laptops", laptops],
  ["phone", phone],
  ["motion", motion],
  ["touch", touch],
  ["sound", sound],
  ["offline", offline],
  ["slow", slowPhone],
];

(async () => {
  const want = process.argv.slice(2).map((a) => a.toLowerCase());
  const unknown = want.filter((a) => !SUITES.some(([name]) => name === a));
  if (unknown.length) { console.error(`Unknown suite: ${unknown.join(", ")}. Choose from: ${SUITES.map(([n]) => n).join(", ")}`); process.exit(1); }
  const run = SUITES.filter(([name]) => !want.length || want.includes(name));
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  B = `http://127.0.0.1:${server.address().port}/`;
  const br = await chromium.launch({ executablePath: exe });
  try {
    for (const [, suite] of run) await suite(br);
  } finally { await br.close(); server.close(); }
  // "All checks passed" is only ever printed by a complete run, so a partial run can't be mistaken for one
  const passed = want.length ? `Passed: ${run.map(([n]) => n).join(", ")} (a partial run, not the full suite).` : `All checks passed.`;
  console.log(fails.length ? `\n${fails.length} FAILED` : `\n${passed} Screenshots in test-shots/`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
