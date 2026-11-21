/* ==================================================================
   Sound: off until the visitor turns it on (the round button, bottom right, desktop).
   Every sound is made on the spot with the Web Audio API, so there are no audio files to load.
   This file only listens (to the event bus and to the pointer); no other file knows sound exists.
================================================================== */
const sfx = { on: false };
if (finePointer && (window.AudioContext || window.webkitAudioContext)) {
  const KEY = "km-sound", LEVEL = 0.85;
  // D major pentatonic: any two of these notes agree, so sliding the pointer along a row plays a small run
  const SCALE = [293.66, 329.63, 369.99, 440, 493.88];
  const note = (i, oct = 0) => SCALE[((i % 5) + 5) % 5] * 2 ** (oct + Math.floor(i / 5));
  // the quiet chord under everything; it moves to the next one when the section changes (D, B minor, G, A)
  const CHORDS = [[73.42, 110, 146.83, 185, 293.66], [61.74, 92.5, 123.47, 185, 246.94], [98, 146.83, 196, 246.94, 293.66], [82.41, 110, 164.81, 220, 329.63]];
  let ac = null, master = null, dry = null, send = null, noiseBuf = null, pad = null, riser = null, voices = 0, ducked = false;

  // ---------------------------------------------------------------- engine
  const impulse = (secs) => {                                   // a small synthetic room: noise that dies away
    const n = Math.floor(ac.sampleRate * secs), buf = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let last = 0;
      for (let i = 0; i < n; i++) {
        last += ((Math.random() * 2 - 1) * (1 - i / n) ** 2.6 - last) * 0.35;   // the top end softens as it fades
        d[i] = last;
      }
    }
    return buf;
  };
  const start = () => {
    if (ac) return true;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = 0;
    const limit = ac.createDynamicsCompressor();                // a safety net: nothing ever gets loud
    limit.threshold.value = -16; limit.knee.value = 10; limit.ratio.value = 10; limit.attack.value = 0.004; limit.release.value = 0.18;
    master.connect(limit); limit.connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    const verb = ac.createConvolver(); verb.buffer = impulse(2.4);
    send = ac.createGain(); send.gain.value = 0.5; send.connect(verb); verb.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  };
  // every voice ends here: straight to the mix, a share (w) to the room, placed left/right (pan)
  const out = (src, v, w, pan) => {
    src.connect(v);
    let tail = v;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); v.connect(p); tail = p; }
    tail.connect(dry);
    if (w) { const s = ac.createGain(); s.gain.value = w; tail.connect(s); s.connect(send); }
  };
  const count = (node, v) => { voices++; node.onended = () => { voices--; v.disconnect(); }; };
  // one note: f glides to f2, rises in a seconds, fades over d seconds, level g
  const tone = ({ f, f2, type = "sine", at = 0, a = 0.004, d = 0.2, g = 0.05, w = 0.25, pan = 0 }) => {
    if (voices > 30) return;
    const t = ac.currentTime + at, o = ac.createOscillator(), v = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(g, t + a);
    v.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    out(o, v, w, pan);
    o.start(t); o.stop(t + a + d + 0.05);
    count(o, v);
  };
  // a breath of filtered noise: the filter slides from f to f2 (through "via" on the way, if given)
  const hiss = ({ f = 800, f2, via, kind = "bandpass", q = 0.9, at = 0, a = 0.01, d = 0.3, g = 0.2, w = 0.25, pan = 0 }) => {
    if (voices > 30) return;
    const t = ac.currentTime + at, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), v = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = kind; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (via) fl.frequency.exponentialRampToValueAtTime(via, t + a);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(g, t + a);
    v.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(fl); out(fl, v, w, pan);
    s.start(t, Math.random() * 1.5); s.stop(t + a + d + 0.05);
    count(s, v);
  };

  // ---------------------------------------------------------------- the sounds
  const S = {
    hover: (i, pan) => tone({ f: note(i, 1), d: 0.1, g: 0.07, w: 0.4, pan }),
    press: (pan) => { tone({ f: 200, f2: 96, d: 0.075, g: 0.16, w: 0.12, pan }); hiss({ f: 3400, kind: "highpass", q: 0.5, a: 0.001, d: 0.018, g: 0.06, w: 0, pan }); },
    pulse: (pan) => { tone({ f: 118, f2: 56, d: 0.34, g: 0.11, w: 0.3, pan }); hiss({ f: 620, f2: 190, q: 0.7, a: 0.006, d: 0.38, g: 0.1, w: 0.5, pan }); },
    whoosh: (dur, dir, g = 0.2) => hiss(dir > 0 ? { f: 280, via: 1500, f2: 620, a: dur * 0.45, d: dur * 0.55, g, w: 0.35 } : { f: 1400, via: 900, f2: 240, a: dur * 0.4, d: dur * 0.6, g, w: 0.35 }),
    land: () => tone({ f: 96, f2: 60, d: 0.2, g: 0.1, w: 0.15 }),
    shimmer: (n = 4, oct = 1, g = 0.03) => { for (let k = 0; k < n; k++) tone({ f: note((Math.random() * 5) | 0, oct + (k > 1 ? 1 : 0)), type: k % 2 ? "triangle" : "sine", at: k * 0.07 + Math.random() * 0.03, a: 0.008, d: 0.55, g, w: 0.9, pan: Math.random() * 1.2 - 0.6 }); },
    pick: (i = 0, pan = 0) => { tone({ f: note(i, 0), type: "triangle", d: 0.17, g: 0.12, w: 0.3, pan }); tone({ f: note(i, 1), d: 0.1, g: 0.03, w: 0.3, pan }); },
    flick: () => { hiss({ f: 2100, q: 1.4, a: 0.004, d: 0.07, g: 0.16, w: 0.3 }); tone({ f: note(2, 0), d: 0.12, g: 0.04, w: 0.4 }); },
    right: () => { [3, 5].forEach((n, k) => tone({ f: note(n, 1), at: k * 0.09, d: 0.55, g: 0.06, w: 0.7 })); S.shimmer(3, 2, 0.018); },
    wrong: () => { tone({ f: 196, type: "triangle", d: 0.28, g: 0.09, w: 0.2 }); tone({ f: 185, type: "triangle", d: 0.32, g: 0.08, w: 0.2 }); },
    win: (k = 5) => { for (let i = 0; i < k; i++) tone({ f: note([0, 2, 3, 5, 7][i], 1), type: i % 2 ? "sine" : "triangle", at: i * 0.085, d: 0.65, g: 0.055, w: 0.8 }); S.shimmer(5, 2, 0.016); },
    open: () => { hiss({ f: 300, f2: 1500, a: 0.18, d: 0.3, g: 0.2, w: 0.4 }); tone({ f: note(0, 0), d: 0.55, g: 0.04, w: 0.8 }); tone({ f: note(3, 0), at: 0.05, d: 0.55, g: 0.035, w: 0.8 }); },
    close: () => hiss({ f: 1300, f2: 260, a: 0.05, d: 0.32, g: 0.17, w: 0.4 }),
    leave: () => { hiss({ f: 220, f2: 2600, a: 0.7, d: 0.3, g: 0.26, w: 0.5 }); tone({ f: 73.42, f2: 220, a: 0.5, d: 0.4, g: 0.06, w: 0.4 }); },
    arrive: () => { hiss({ f: 2400, f2: 260, a: 0.06, d: 1.1, g: 0.2, w: 0.5 }); tone({ f: 220, f2: 73.42, a: 0.02, d: 0.9, g: 0.06, w: 0.5 }); S.shimmer(3, 1, 0.02); },
    boom: (p = 0.5) => {                                        // p = how big, 0..1
      tone({ f: 130, f2: 40, d: 0.5 + p * 0.4, g: 0.1 + p * 0.07, w: 0.4 });
      hiss({ f: 2600, f2: 240, kind: "lowpass", q: 0.6, a: 0.005, d: 0.5 + p * 0.5, g: 0.07 + p * 0.06, w: 0.6 });
      S.shimmer(3 + Math.round(p * 4), 1, 0.022);
    },
  };

  // the bed: five soft voices that each swell at their own slow pace, kept very quiet
  const startPad = () => {
    if (pad) return;
    const mix = ac.createGain(), lp = ac.createBiquadFilter(), room = ac.createGain();
    mix.gain.value = 0; lp.type = "lowpass"; lp.frequency.value = 560; lp.Q.value = 0.4; room.gain.value = 0.8;
    mix.connect(lp); lp.connect(dry); lp.connect(room); room.connect(send);
    const osc = CHORDS[0].map((f, i) => {
      const o = ac.createOscillator(), v = ac.createGain(), slow = ac.createOscillator(), depth = ac.createGain();
      o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f; o.detune.value = (i - 2) * 4;
      v.gain.value = i === 4 ? 0.45 : 0.55;
      slow.frequency.value = 0.05 + i * 0.023; depth.gain.value = i === 4 ? 0.2 : 0.35;
      slow.connect(depth); depth.connect(v.gain);
      o.connect(v); v.connect(mix); o.start(); slow.start();
      return o;
    });
    mix.gain.setTargetAtTime(0.011, ac.currentTime, 1.4);
    pad = { lp, osc };
  };
  const padChord = (k) => { if (pad) CHORDS[((k % 4) + 4) % 4].forEach((f, i) => pad.osc[i].frequency.setTargetAtTime(f, ac.currentTime, 0.9)); };
  const padLift = (dur) => {                                    // the bed opens up while a panel is travelling
    if (!pad) return;
    const t = ac.currentTime;
    pad.lp.frequency.cancelScheduledValues(t);
    pad.lp.frequency.setTargetAtTime(1150, t, 0.18);
    pad.lp.frequency.setTargetAtTime(560, t + dur * 0.7, 0.5);
  };

  // hold-to-charge: a tone that climbs for as long as the button is held, then the blast
  const hold = (p, t) => { const now = p.value; p.cancelScheduledValues(t); p.setValueAtTime(now, t); };
  const riserStart = () => {
    if (riser) return;
    const t = ac.currentTime, o = ac.createOscillator(), v = ac.createGain(), s = ac.createBufferSource(), fl = ac.createBiquadFilter(), nv = ac.createGain();
    o.frequency.setValueAtTime(73.42, t); o.frequency.exponentialRampToValueAtTime(293.66, t + 1.3);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.05, t + 1.2);
    s.buffer = noiseBuf; s.loop = true; fl.type = "bandpass"; fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(2400, t + 1.3);
    nv.gain.setValueAtTime(0.0001, t); nv.gain.exponentialRampToValueAtTime(0.06, t + 1.2);
    // if the release never comes (the window lost focus mid-hold), it fades by itself
    v.gain.setTargetAtTime(0.0001, t + 3, 0.4); nv.gain.setTargetAtTime(0.0001, t + 3, 0.4);
    o.connect(v); v.connect(dry); s.connect(fl); fl.connect(nv); nv.connect(dry); nv.connect(send);
    o.start(t); s.start(t); o.stop(t + 6); s.stop(t + 6);
    o.onended = () => { v.disconnect(); nv.disconnect(); if (riser && riser.o === o) riser = null; };
    riser = { o, v, s, nv };
  };
  const riserEnd = () => {
    if (!riser) return;
    const t = ac.currentTime, r = riser;
    riser = null;
    [r.v.gain, r.nv.gain].forEach((p) => { hold(p, t); p.setTargetAtTime(0.0001, t, 0.03); });
    r.o.stop(t + 0.25); r.s.stop(t + 0.25);
  };

  // ---------------------------------------------------------------- the button
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "sfx"; btn.id = "sfx";
  btn.setAttribute("aria-label", "Sound");
  btn.innerHTML = '<span class="sfx__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sfx__tip" aria-hidden="true"></span>';
  document.body.appendChild(btn);
  let hint = false, saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const paint = () => {
    btn.classList.toggle("is-on", sfx.on);
    btn.classList.toggle("is-hint", hint && !sfx.on);
    btn.setAttribute("aria-pressed", String(sfx.on));
    $(".sfx__tip", btn).textContent = hint && !sfx.on ? "Try it with sound" : sfx.on ? "Sound on" : "Sound off";
  };
  const live = () => sfx.on && !!ac && ac.state === "running";
  // start (or wake) the audio clock. Browsers only allow this after a click or a key press on the page.
  const wake = () => {
    if (!sfx.on || !start()) return;
    const go = () => {
      if (!sfx.on) return;
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(ducked ? 0 : LEVEL, t, 0.15);
      startPad();
      padChord(Math.max(0, activeDot));
    };
    if (ac.state === "running") go(); else ac.resume().then(go).catch(() => {});
  };
  const setOn = (v, chime) => {
    sfx.on = v;
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {}
    paint();
    if (v) { wake(); if (chime) setTimeout(() => live() && S.win(3), 140); return; }
    if (!ac) return;
    riserEnd();
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
    setTimeout(() => { if (!sfx.on && ac.state === "running") ac.suspend(); }, 500);     // silent = asleep: no work for the browser
  };
  btn.addEventListener("click", () => setOn(!sfx.on, true));
  if (saved === "1") {
    sfx.on = true;
    if (ptIn) wake();                                           // arrived through a click on the last page: allowed to start straight away
    const first = () => { removeEventListener("pointerdown", first, true); removeEventListener("keydown", first, true); wake(); };
    addEventListener("pointerdown", first, true);
    addEventListener("keydown", first, true);
  }
  paint();
  document.addEventListener("visibilitychange", () => {         // a hidden tab is a silent tab
    if (!ac) return;
    if (document.hidden) { if (ac.state === "running") ac.suspend(); } else wake();
  });
  // a small nudge on a first visit: the label shows itself for a few seconds once the page has settled
  bus.on("intro:done", () => {
    let seen = saved !== null;
    try { seen = seen || !!sessionStorage.getItem("km-sound-hint"); sessionStorage.setItem("km-sound-hint", "1"); } catch (e) {}
    if (seen) return;
    setTimeout(() => { hint = true; paint(); setTimeout(() => { hint = false; paint(); }, 5200); }, 1800);
  });

  // ---------------------------------------------------------------- what makes a sound
  const HOT = "a, button, .card, .stat, .chart__row";           // the same things the cursor grows over
  const panOf = (x) => (x / innerWidth) * 1.2 - 0.6;
  const place = (el) => { let i = 0; while (el && (el = el.previousElementSibling)) i++; return i; };
  let lastHot = null, lastTick = 0;
  document.addEventListener("pointerover", (e) => {
    if (!live()) return;
    const el = e.target.closest?.(HOT);
    if (!el || el === lastHot) return;
    lastHot = el;
    const now = performance.now();
    if (now - lastTick < 55) return;
    lastTick = now;
    S.hover((place(el) + place(el.parentElement) * 2) % 10, panOf(e.clientX));   // its place in the row picks the note
  }, { passive: true });
  document.addEventListener("pointerout", (e) => { if (lastHot && !e.relatedTarget?.closest?.(HOT)) lastHot = null; }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (!live() || e.button) return;
    if (e.target.closest?.(HOT + ", input")) S.press(panOf(e.clientX)); else S.pulse(panOf(e.clientX));
  }, { passive: true });

  const when = (name, fn) => bus.on(name, (d) => { if (live()) fn(d); });
  when("snap:go", (d) => { const dur = Math.min(1.4, d.dur || 1.2); S.whoosh(dur, d.dir); padLift(dur); });
  when("snap:land", () => S.land());
  when("shape:change", () => S.shimmer());
  when("section:change", (d) => padChord(d.i));
  when("carousel:front", (d) => { if (d.prev !== -1) S.flick(); });
  when("chart:draw", () => { for (let i = 0; i < 6; i++) tone({ f: note(i, 0), type: "triangle", at: 0.1 + i * 0.08, d: 0.24, g: 0.07, w: 0.5 }); });
  when("quiz:right", () => S.right());
  when("quiz:wrong", () => S.wrong());
  when("quiz:end", (d) => S.win(2 + Math.round((3 * d.score) / Math.max(1, d.total))));
  when("faq:toggle", (d) => tone({ f: note(d.open ? 2 : 3, 1), f2: note(d.open ? 3 : 2, 1), d: 0.15, g: 0.07, w: 0.4 }));
  when("chip:pick", (d) => S.pick(place(d.btn), 0.3));
  when("filter:change", (d) => S.pick(d.btn ? place(d.btn) : 2));
  when("book:open", () => S.open());
  when("book:close", () => S.close());
  when("book:step", (d) => { if (d.i > 0 || d.dir < 0) S.pick(d.i + 1, 0.3); });
  when("book:error", () => S.wrong());
  when("book:done", () => S.win(5));
  when("reader:open", () => S.open());
  when("reader:close", () => S.close());
  when("page:leave", () => S.leave());
  when("page:reveal", () => S.arrive());
  when("intro:blast", () => S.boom(0.6));
  when("charge:start", () => riserStart());
  // (a hold that was called off, by a right-click or a lost window, ends quietly: no blast)
  bus.on("charge:release", (d) => { if (!ac) return; riserEnd(); if (live() && !d.cancelled) S.boom(Math.max(0, Math.min(1, d.power || 0))); });
  when("celebrate", () => S.shimmer(6, 2, 0.02));
  when("hud:next", () => S.pick(4));
  // a playing video has the floor: everything else goes quiet until it closes
  when("video:open", () => { S.open(); ducked = true; master.gain.setTargetAtTime(0, ac.currentTime + 0.45, 0.15); });
  bus.on("video:close", () => {
    if (!ducked) return;
    ducked = false;
    if (!ac || !sfx.on) return;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(LEVEL, ac.currentTime, 0.15);
    if (live()) S.close();
  });
}
