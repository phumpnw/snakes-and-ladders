// เอฟเฟกต์ภาพ: พลุกระดาษ ประกาย ตัวเลขลอย กระดานสั่น
const FX = (() => {
  const canvas = document.getElementById("fx");
  const g = canvas.getContext("2d");
  const parts = [];
  let running = false;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#f97316", "#fbbf24", "#22c55e", "#3b82f6", "#ec4899", "#14b8a6", "#a855f7"];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();

  function loop() {
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= 1; p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.life <= 0 || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
      const a = Math.min(1, p.life / 30);
      g.save(); g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color;
      if (p.shape === "rect") g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.shape === "star") { star(p.size); g.fill(); }
      else { g.beginPath(); g.arc(0, 0, p.size / 2, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    if (parts.length) requestAnimationFrame(loop); else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function star(r) {
    g.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.25 : r; const a = (i * Math.PI) / 4; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath();
  }
  function add(p) { parts.push(p); if (!running) { running = true; requestAnimationFrame(loop); } }

  function confetti(x, y, n = 80, spread = 1) {
    if (reduce) n = Math.min(n, 15);
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * spread, sp = 6 + Math.random() * 9;
      add({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, grav: 0.28, drag: 0.985, life: 90 + Math.random() * 60,
        size: 7 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[i % COLORS.length], shape: Math.random() < 0.7 ? "rect" : "dot" });
    }
  }
  function sparkle(x, y, n = 14, color = "#fbbf24") {
    if (reduce) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3.5;
      add({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, grav: 0.02, drag: 0.94, life: 35 + Math.random() * 25,
        size: 6 + Math.random() * 6, rot: 0, vr: 0.1, color, shape: "star" });
    }
  }
  function centerOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function floatText(el, text, cls = "") {
    const c = centerOf(el);
    const d = document.createElement("div");
    d.className = "float-text " + cls; d.textContent = text;
    d.style.left = c.x + "px"; d.style.top = c.y + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }
  function shake(el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 600); }
  function flash(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); }

  return { confetti, sparkle, centerOf, floatText, shake, flash,
    rain() { // พลุกระดาษเต็มจอ
      for (let k = 0; k < 4; k++) setTimeout(() => confetti(innerWidth * (0.15 + 0.23 * k), innerHeight * 0.75, 50, 0.6), k * 180);
    } };
})();
