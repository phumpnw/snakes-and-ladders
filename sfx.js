// เสียงเอฟเฟกต์สังเคราะห์ด้วย Web Audio (ไม่ต้องใช้ไฟล์เสียง)
const SFX = (() => {
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem("snl-muted") === "1"; } catch (e) {}

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // โน้ตเดี่ยว: ความถี่ เริ่ม(วินาทีจากตอนนี้) ความยาว ชนิดคลื่น ความดัง ความถี่ปลายทาง(ถ้าจะสไลด์)
  function tone(freq, start = 0, dur = 0.15, type = "sine", vol = 0.3, endFreq = null) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(start = 0, dur = 0.05, vol = 0.2, hp = 1500) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + start;
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  const C = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.5];

  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("snl-muted", muted ? "1" : "0"); } catch (e) {}
      if (!muted) this.click();
      return muted;
    },
    unlock() { ac(); },
    // ให้เพลงพื้นหลังใช้ AudioContext เดียวกัน (ไม่ขึ้นกับปุ่มปิดเสียงเอฟเฟกต์)
    audio() { return ac() ? { ctx, out: master } : null; },
    click()  { tone(900, 0, 0.05, "triangle", 0.15); },
    dice()   { for (let i = 0; i < 7; i++) noise(i * 0.06, 0.04, 0.25, 1200 + Math.random() * 2000); tone(440, 0.45, 0.08, "square", 0.08); },
    step(i = 0) { tone(C[i % C.length], 0, 0.09, "triangle", 0.18); },
    land()   { tone(330, 0, 0.12, "sine", 0.25); tone(495, 0.05, 0.12, "sine", 0.15); },
    card()   { tone(660, 0, 0.1, "sine", 0.2); tone(990, 0.08, 0.18, "sine", 0.15); },
    tip()    { tone(1318.5, 0, 0.25, "sine", 0.15); tone(1760, 0.1, 0.35, "sine", 0.1); },
    correct(){ [0, 4, 7].forEach((n, i) => tone(C[n], i * 0.09, 0.25, "triangle", 0.25)); },
    wrong()  { tone(220, 0, 0.18, "sawtooth", 0.12); tone(185, 0.16, 0.3, "sawtooth", 0.12); },
    ladder() { for (let i = 0; i < 8; i++) tone(C[i] , i * 0.08, 0.14, "triangle", 0.2); },
    snake()  { tone(900, 0, 0.9, "sawtooth", 0.1, 120); tone(600, 0.05, 0.85, "sine", 0.12, 90); noise(0, 0.8, 0.05, 3000); },
    shield() { tone(523.25, 0, 0.12, "square", 0.1); tone(1046.5, 0.1, 0.3, "triangle", 0.2); },
    win() {
      const seq = [[0, 0], [2, .12], [4, .24], [7, .36], [4, .6], [7, .72], [9, .84]];
      seq.forEach(([n, t]) => tone(C[n], t, 0.3, "triangle", 0.25));
      [0, 4, 7].forEach((n) => tone(C[n] / 2, 1.0, 1.0, "sine", 0.18));
    },
  };
})();
