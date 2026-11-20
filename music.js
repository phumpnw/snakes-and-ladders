// เพลงพื้นหลัง: สร้างสดด้วย Web Audio (ไม่ใช้ไฟล์เสียง ไม่มีปัญหาลิขสิทธิ์)
// โทนสดใสสบาย ๆ แบบมาริมบา + เบส + คอร์ดแพด + เชคเกอร์
// ทำนองสุ่มสร้างใหม่ทุก 2 รอบ จึงไม่ซ้ำจนน่าเบื่อ
const MUSIC = (() => {
  let on = true;
  try { on = localStorage.getItem("snl-music") !== "0"; } catch (e) {}

  const VOL = 0.28, DUCK = 0.08;        // ความดังปกติ / ตอนเปิดการ์ด (ลดเสียงให้อ่านสบาย)
  const BPM = 92, ST = 60 / BPM / 4;    // ความยาว 1 จังหวะย่อย (โน้ตตัวเขบ็ต 2 ชั้น)
  const BARS = 8, STEPS = BARS * 16;

  // คอร์ด 8 ห้อง: C G Am F | C F G C
  const CHORDS = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65], [60, 64, 67], [57, 60, 65], [59, 62, 67], [60, 64, 67]];
  const ROOTS = [48, 43, 45, 41, 48, 41, 43, 48];
  const SCALE = [72, 74, 76, 79, 81, 84, 86, 88];          // เพนทาโทนิก C (ฟังสบาย ไม่มีโน้ตชนกัน)
  const RHYTHMS = [[0, 4, 8, 12], [0, 6, 8, 12, 14], [0, 3, 6, 8, 12], [0, 4, 6, 8, 10, 12], [0, 8, 12], [0, 2, 4, 8, 12]];

  let A = null, bus = null, timer = null, nextT = 0, step = 0, loops = 0, phrase = null, noise = null, ducked = false;
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function makePhrase() {
    const notes = {}, starts = [];
    let idx = 2;
    for (let b = 0; b < BARS; b++) {
      const rhythm = b === BARS - 1 ? [0, 4, 8] : pick(RHYTHMS);
      rhythm.forEach((s, k) => {
        if (k === 0) {
          // จังหวะแรกของห้องใช้โน้ตในคอร์ดที่ใกล้โน้ตก่อนหน้าที่สุด
          let best = idx, bestD = 99;
          SCALE.forEach((m, i) => {
            if (CHORDS[b].some((c) => (m - c) % 12 === 0) && Math.abs(i - idx) < bestD) { best = i; bestD = Math.abs(i - idx); }
          });
          idx = best;
        } else {
          idx = Math.max(0, Math.min(SCALE.length - 1, idx + pick([-2, -1, -1, 1, 1, 2])));
        }
        if (b === BARS - 1 && k === rhythm.length - 1) idx = 0;   // จบประโยคที่โน้ต C
        notes[b * 16 + s] = SCALE[idx];
        starts.push(b * 16 + s);
      });
    }
    // ความยาวโน้ต = ถึงโน้ตถัดไป (ไม่เกิน 6 จังหวะย่อย)
    const out = {};
    starts.forEach((s, i) => {
      const gap = (starts[i + 1] ?? STEPS) - s;
      out[s] = { m: notes[s], d: Math.min(gap, 6) * ST };
    });
    return out;
  }

  function env(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function osc(type, freq, t, dur, peak, attack = 0.005) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    env(g, t, peak, attack, dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // มาริมบา: เสียงพื้นฐาน + ฮาร์โมนิกสูงที่หายเร็ว
  function pluck(m, t, d) {
    const len = Math.max(0.35, d * 1.6);
    osc("sine", mf(m), t, len, 0.22);
    osc("sine", mf(m) * 4, t, 0.08, 0.05);
    osc("triangle", mf(m), t, len * 0.6, 0.05);
  }
  function bass(m, t, d) { osc("triangle", mf(m), t, d, 0.28, 0.01); }
  function pad(chord, t, d) {
    chord.forEach((m) => {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain(), f = A.ctx.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = mf(m - 12); o.detune.value = (Math.random() - 0.5) * 12;
      f.type = "lowpass"; f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.5);
      g.gain.setValueAtTime(0.022, t + d - 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + d);
      o.connect(f); f.connect(g); g.connect(bus);
      o.start(t); o.stop(t + d + 0.05);
    });
  }
  function shaker(t, vol) {
    if (!noise) {
      noise = A.ctx.createBuffer(1, A.ctx.sampleRate * 0.08, A.ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    const src = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    src.buffer = noise; f.type = "highpass"; f.frequency.value = 7000; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t);
  }

  function play(st, t) {
    const bar = Math.floor(st / 16) % BARS, s = st % 16;
    if (s === 0) pad(CHORDS[bar], t, 16 * ST);
    if (s === 0 || s === 8) bass(ROOTS[bar], t, ST * 5);
    if (s === 14 && bar % 2 === 1) bass(ROOTS[bar] + 7, t, ST * 2);
    if (s % 4 === 2) shaker(t, 0.05);
    else if (s % 2 === 1) shaker(t, 0.015);
    const n = phrase[st % STEPS];
    if (n) pluck(n.m, t, n.d);
  }

  function tick() {
    while (nextT < A.ctx.currentTime + 0.15) {
      play(step, nextT);
      nextT += ST;
      step++;
      if (step % STEPS === 0 && ++loops % 2 === 0) phrase = makePhrase();
    }
  }

  const level = () => (ducked ? DUCK : VOL);

  function start() {
    if (!on || timer) return;
    A = SFX.audio();
    if (!A) return;
    if (!bus) { bus = A.ctx.createGain(); bus.gain.value = 0.0001; bus.connect(A.out); }
    if (!phrase) phrase = makePhrase();
    const now = A.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.linearRampToValueAtTime(level(), now + 1.5);
    nextT = now + 0.1;
    timer = setInterval(tick, 30);
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer); timer = null;
    const now = A.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0.0001, now + 0.4);
  }

  // หยุดเพลงเมื่อสลับไปแท็บอื่น เพื่อประหยัดแบตเตอรี่
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  return {
    get on() { return on; },
    get playing() { return !!timer; },
    start, stop,
    toggle() {
      on = !on;
      try { localStorage.setItem("snl-music", on ? "1" : "0"); } catch (e) {}
      on ? start() : stop();
      return on;
    },
    duck(b) {
      ducked = b;
      if (bus && timer) bus.gain.setTargetAtTime(level(), A.ctx.currentTime, 0.25);
    },
  };
})();
