"use strict";

// ============================================================
// ตัวช่วยทั่วไป
// ============================================================
const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (c, t) => (t ? Math.round((c / t) * 100) : 0);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* โหมดส่วนตัว ฯลฯ */ } },
};

const LADDERS_PER_GAME = 8, SNAKES_PER_GAME = 8, QUIZ_PER_PLAYER = 3;
const catArt = (cat) => `assets/decor/cat-${cat}.jpg`;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  window.scrollTo(0, 0);
}

// รูปตัวละคร (ถ้ายังไม่ได้เลือกหรือโหลดรูปไม่ได้ จะแสดงตัวอักษรแรกของชื่อแทน)
function avatarHTML(a, name = "", cls = "") {
  const initial = esc((name || "?").trim().charAt(0) || "?");
  const img = a.img ? `<img src="${a.img}" alt="" onerror="this.parentNode.classList.add('noimg');this.remove()">` : "";
  return `<span class="av ${a.img ? "" : "noimg"} ${cls}" style="--c:${a.color}" data-initial="${initial}">${img}</span>`;
}

// ============================================================
// เสียง เต็มจอ และเสียงคลิกทุกปุ่ม
// ============================================================
function renderSoundBtn() {
  const b = $("#btn-sound");
  b.innerHTML = icon(SFX.muted ? "mute" : "sound");
  b.title = SFX.muted ? "เปิดเสียง" : "ปิดเสียง";
  b.classList.toggle("off", SFX.muted);
}
$("#btn-sound").addEventListener("click", () => { SFX.toggle(); renderSoundBtn(); });
renderSoundBtn();

function renderFsBtn() {
  const on = !!document.fullscreenElement;
  $("#btn-fs").innerHTML = icon(on ? "fullscreen-exit" : "fullscreen");
  $("#btn-fs").title = on ? "ออกจากเต็มจอ" : "เต็มจอ";
  document.body.classList.toggle("is-fs", on);
}
if (!document.fullscreenEnabled) $("#btn-fs").remove();
else {
  $("#btn-fs").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  document.addEventListener("fullscreenchange", renderFsBtn);
  renderFsBtn();
}

// เพลงพื้นหลัง (เบราว์เซอร์อนุญาตให้เริ่มเสียงได้หลังผู้ใช้แตะหน้าจอครั้งแรก)
function renderMusicBtn() {
  const b = $("#btn-music");
  b.innerHTML = icon(MUSIC.on ? "music" : "music-off");
  b.title = MUSIC.on ? "ปิดเพลง" : "เปิดเพลง";
  b.classList.toggle("off", !MUSIC.on);
}
$("#btn-music").addEventListener("click", () => { MUSIC.toggle(); renderMusicBtn(); });
renderMusicBtn();

document.addEventListener("pointerdown", () => { SFX.unlock(); MUSIC.start(); }, { once: true });
document.addEventListener("keydown", () => { SFX.unlock(); MUSIC.start(); }, { once: true });
document.addEventListener("click", (e) => {
  if (e.target.closest(".btn, .count-picker button, .seg button")) SFX.click();
});
hydrateIcons();

// ============================================================
// สถิติสะสม (เก็บในเบราว์เซอร์นี้)
// ============================================================
const STORE_KEY = "snl-rights-stats-v1";
const ct = (keys) => Object.fromEntries(Object.keys(keys).map((k) => [k, { c: 0, t: 0 }]));
function emptyStats() {
  return {
    games: 0, answered: 0, correct: 0, quizC: 0, quizT: 0, ladders: 0, snakesAvoided: 0, snakesFallen: 0, tipsRead: 0,
    byCategory: ct(CATEGORIES), byAge: ct(AGE_GROUPS), byGender: ct(GENDERS), seen: {}, tipsSeen: {},
  };
}
function loadStats() {
  const s = Object.assign(emptyStats(), store.get(STORE_KEY, {}));
  ["byCategory", "byAge", "byGender"].forEach((k) => (s[k] = Object.assign(emptyStats()[k], s[k])));
  return s;
}
const saveStats = (s) => store.set(STORE_KEY, s);
let LIFETIME = loadStats();

// บันทึกคำตอบหนึ่งข้อลงสถิติสะสม (แยกตามหมวด อายุ และเพศ)
function recordAnswer(p, category, correct) {
  [LIFETIME.byCategory[category], LIFETIME.byAge[p.age], LIFETIME.byGender[p.gender]].forEach((b) => {
    b.t++; if (correct) b.c++;
  });
}

// ============================================================
// หน้าเริ่มเกม: ชื่อ เพศ อายุ
// ============================================================
const SETUP_KEY = "snl-setup-v1";
let playerCount = 2;
let SETUP = store.get(SETUP_KEY, []);
for (let i = 0; i < 4; i++) SETUP[i] = Object.assign({ name: "", gender: null, age: null }, SETUP[i]);

function setupAvatar(i) {
  const s = SETUP[i];
  return { img: s.gender && s.age ? avatarImg(s.age, s.gender) : null, color: PLAYER_COLORS[i] };
}
function setupComplete() {
  return SETUP.slice(0, playerCount).every((s) => s.gender && s.age);
}
function renderStartState() {
  const ok = setupComplete();
  $("#btn-start").disabled = !ok;
  $("#setup-hint").classList.toggle("hidden", ok);
}

function renderNameFields() {
  const seg = (i, kind, opts) => `<div class="seg ${kind}" data-i="${i}" data-kind="${kind}">${
    Object.entries(opts).map(([k, v]) => `<button type="button" data-v="${k}" class="${SETUP[i][kind] === k ? "sel" : ""}">${v.name}${v.range ? `<small>${v.range}</small>` : ""}</button>`).join("")
  }</div>`;
  $("#name-fields").innerHTML = SETUP.slice(0, playerCount).map((s, i) => `
    <div class="pset" style="--c:${PLAYER_COLORS[i]}">
      <div class="pset-top">
        <span class="pset-av">${avatarHTML(setupAvatar(i), s.name || `ผู้เล่น ${i + 1}`, "xl")}</span>
        <input maxlength="16" data-i="${i}" placeholder="ชื่อผู้เล่น ${i + 1}" value="${esc(s.name)}" aria-label="ชื่อผู้เล่น ${i + 1}">
      </div>
      <div class="seg-label">เพศ</div>${seg(i, "gender", GENDERS)}
      <div class="seg-label">ช่วงอายุ</div>${seg(i, "age", AGE_GROUPS)}
    </div>`).join("");
  renderStartState();
}
$("#name-fields").addEventListener("click", (e) => {
  const b = e.target.closest(".seg button");
  if (!b) return;
  const segEl = b.parentNode, i = +segEl.dataset.i;
  SETUP[i][segEl.dataset.kind] = b.dataset.v;
  segEl.querySelectorAll("button").forEach((x) => x.classList.toggle("sel", x === b));
  const card = segEl.closest(".pset");
  card.querySelector(".pset-av").innerHTML = avatarHTML(setupAvatar(i), SETUP[i].name || `ผู้เล่น ${i + 1}`, "xl");
  FX.flash(card.querySelector(".pset-av"), "pop-in");
  store.set(SETUP_KEY, SETUP);
  renderStartState();
});
$("#name-fields").addEventListener("input", (e) => {
  if (e.target.matches("input[data-i]")) { SETUP[+e.target.dataset.i].name = e.target.value; store.set(SETUP_KEY, SETUP); }
});
$("#count-picker").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  playerCount = +b.dataset.n;
  document.querySelectorAll("#count-picker button").forEach((x) => x.classList.toggle("sel", x === b));
  renderNameFields();
});
renderNameFields();
$("#privacy-note").classList.toggle("hidden", !Analytics.enabled);

// ============================================================
// สถานะเกม
// ============================================================
let G = null;

function newPlayer(s, i) {
  return {
    name: s.name.trim() || `ผู้เล่น ${i + 1}`, gender: s.gender, age: s.age, pos: 0,
    avatar: { img: avatarImg(s.age, s.gender), color: PLAYER_COLORS[i] },
    st: { rolls: 0, ladders: 0, laddersMissed: 0, snakesAvoided: 0, snakesFallen: 0, correct: 0, answered: 0, quizC: 0, quizT: 0, tips: 0, seen: [] },
  };
}

// ---------- สุ่มกระดาน ----------
// สุ่มเลือกสถานการณ์แบบถ่วงน้ำหนัก: เรื่องที่ตรงกับช่วงอายุของผู้เล่นมีโอกาสถูกเลือกมากกว่า
function weightedPick(list, k, weight) {
  const pool = list.slice(), out = [];
  while (out.length < k && pool.length) {
    const total = pool.reduce((s, x) => s + weight(x), 0);
    let r = Math.random() * total, i = 0;
    while ((r -= weight(pool[i])) > 0) i++;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function generateBoard(players) {
  const ages = players.map((p) => p.age);
  const weight = (s) => 1 + 2 * ages.filter((a) => s.ages.includes(a)).length;
  const ladders = weightedPick(SCENARIOS.filter((s) => s.type === "ladder"), LADDERS_PER_GAME, weight);
  const snakes = weightedPick(SCENARIOS.filter((s) => s.type === "snake"), SNAKES_PER_GAME, weight);

  // ไม่ให้บันได/งูเอียงข้ามกระดานมากเกินไป จะได้อ่านง่าย
  const col = (n) => { const r = Math.floor((n - 1) / 10); return r % 2 === 0 ? (n - 1) % 10 : 9 - ((n - 1) % 10); };
  const lean = (a, b) => Math.abs(col(a) - col(b));

  for (let attempt = 0; attempt < 500; attempt++) {
    const used = new Set([1, 100]), placed = [];
    const take = (n) => n >= 2 && n <= 99 && !used.has(n);
    let ok = true;
    // บันไดกระจายแถวละ 1 อัน (แถว 1–8) งูกระจายแถวละ 1 ตัว (แถว 3–10)
    const lRows = shuffle([0, 1, 2, 3, 4, 5, 6, 7]), sRows = shuffle([2, 3, 4, 5, 6, 7, 8, 9]);
    ladders.forEach((s, k) => {
      if (!ok) return;
      for (let t = 0; t < 40; t++) {
        const from = lRows[k] * 10 + rand(1, 10), to = from + rand(10, 32);
        if (take(from) && take(to) && to <= 98 && lean(from, to) <= 2) { used.add(from); used.add(to); placed.push({ ...s, from, to }); return; }
      }
      ok = false;
    });
    snakes.forEach((s, k) => {
      if (!ok) return;
      for (let t = 0; t < 40; t++) {
        const from = sRows[k] * 10 + rand(1, 10), to = from - rand(10, 32);
        if (take(from) && take(to) && lean(from, to) <= 3) { used.add(from); used.add(to); placed.push({ ...s, from, to }); return; }
      }
      ok = false;
    });
    if (ok) return placed;
  }
  throw new Error("สุ่มกระดานไม่สำเร็จ");
}

// แจกความรู้ "รู้หรือไม่" ให้ช่องว่างแต่ละช่อง
function assignTips(at) {
  const order = shuffle(TIPS.map((t, i) => i));
  const tipAt = {};
  let k = 0;
  for (let n = 1; n < 100; n++) if (!at[n]) tipAt[n] = order[k++ % order.length];
  return tipAt;
}

function startGame() {
  const players = SETUP.slice(0, playerCount).map(newPlayer);
  const board = generateBoard(players);
  const at = {};
  board.forEach((s) => (at[s.from] = s));
  G = { players, board, at, tipAt: assignTips(at), turn: 0, busy: false, over: false, winner: null };
  $("#tokens").innerHTML = "";
  buildBoard();
  renderPlayers();
  $("#log").innerHTML = "";
  $("#tip-card").classList.add("hidden");
  log("สุ่มกระดานใหม่แล้ว! ทุกคนเริ่มก่อนช่อง 1");
  setDie(1);
  showScreen("screen-game");
  Analytics.start(players);
  updateTurn();
}
$("#btn-start").addEventListener("click", () => { if (setupComplete()) startGame(); });

$("#btn-quit").addEventListener("click", () => {
  openModal(`
    <h2 class="sc-title">ออกจากเกมนี้?</h2>
    <p>ความคืบหน้าของเกมนี้จะหายไป แต่สถิติที่ตอบไปแล้วและสมุดสิทธิยังเก็บไว้</p>
    <div class="modal-actions">
      <button class="btn ghost" data-close>เล่นต่อ</button>
      <button class="btn primary" id="confirm-quit">ออกจากเกม</button>
    </div>`);
  $("#confirm-quit").onclick = () => { closeModal(); showScreen("screen-setup"); };
});

// ============================================================
// กระดาน
// ============================================================
function cellCenter(n) {
  if (n < 1) n = 1;
  const idx = n - 1, row = Math.floor(idx / 10);
  const col = row % 2 === 0 ? idx % 10 : 9 - (idx % 10);
  return { x: (col + 0.5) * 10, y: (9 - row + 0.5) * 10 };
}
const cellEl = (n) => $(`#board .cell[data-n="${n}"]`);

function buildBoard() {
  const board = $("#board");
  board.querySelectorAll(".cell").forEach((c) => c.remove());
  const frag = document.createDocumentFragment();
  for (let r = 9; r >= 0; r--) {
    for (let c = 0; c < 10; c++) {
      const n = r * 10 + (r % 2 === 0 ? c : 9 - c) + 1;
      const cell = document.createElement("div");
      cell.className = "cell " + ((r + c) % 2 ? "a" : "b");
      cell.dataset.n = n;
      cell.innerHTML = `<span class="num">${n}</span>`;
      const s = G.at[n];
      if (s) {
        cell.classList.add(s.type === "ladder" ? "ladder-base" : "snake-head");
        cell.insertAdjacentHTML("beforeend", `<span class="tag">${icon(s.type)}</span>`);
      } else if (n !== 100) {
        cell.classList.add("tip-cell");
      }
      if (n === 100) { cell.classList.add("goal"); cell.insertAdjacentHTML("beforeend", `<span class="goal-ic">${icon("flag")}</span>`); }
      frag.appendChild(cell);
    }
  }
  board.insertBefore(frag, $("#overlay"));
  drawOverlay();
}

function drawOverlay() {
  let svg = `<defs>
    <linearGradient id="rail" x1="0" x2="1"><stop offset="0" stop-color="#b45309"/><stop offset="1" stop-color="#78350f"/></linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.3" dy="0.6" stdDeviation="0.5" flood-opacity=".35"/></filter>
  </defs>`;
  G.board.filter((s) => s.type === "ladder").forEach((s) => {
    const a = cellCenter(s.from), b = cellCenter(s.to);
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const nx = (-dy / len) * 1.8, ny = (dx / len) * 1.8;
    svg += `<g filter="url(#soft)">`;
    const rungs = Math.max(3, Math.floor(len / 3.2));
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs, x = a.x + dx * t, y = a.y + dy * t;
      svg += `<line x1="${x + nx}" y1="${y + ny}" x2="${x - nx}" y2="${y - ny}" stroke="#f59e0b" stroke-width="0.8" stroke-linecap="round"/>`;
    }
    svg += `<line x1="${a.x + nx}" y1="${a.y + ny}" x2="${b.x + nx}" y2="${b.y + ny}" stroke="url(#rail)" stroke-width="1.1" stroke-linecap="round"/>
      <line x1="${a.x - nx}" y1="${a.y - ny}" x2="${b.x - nx}" y2="${b.y - ny}" stroke="url(#rail)" stroke-width="1.1" stroke-linecap="round"/></g>`;
  });
  const snakeColors = ["#16a34a", "#9333ea", "#dc2626", "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#ea580c"];
  G.board.filter((s) => s.type === "snake").forEach((s, i) => {
    const h = cellCenter(s.from), t = cellCenter(s.to);
    const dx = t.x - h.x, dy = t.y - h.y, len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len, w = Math.min(7, len / 3.5);
    const c1 = { x: h.x + dx * 0.33 + nx * w, y: h.y + dy * 0.33 + ny * w };
    const c2 = { x: h.x + dx * 0.66 - nx * w, y: h.y + dy * 0.66 - ny * w };
    const col = snakeColors[i % snakeColors.length];
    const d = `M${h.x},${h.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${t.x},${t.y}`;
    svg += `<g filter="url(#soft)">
      <path d="${d}" fill="none" stroke="#3b2a1a" stroke-width="3.3" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-width="0.55" stroke-dasharray="0.6 1.6" stroke-linecap="round" opacity=".75"/>
      <circle cx="${h.x}" cy="${h.y}" r="2.3" fill="${col}" stroke="#3b2a1a" stroke-width="0.35"/>
      <circle cx="${h.x - 0.75}" cy="${h.y - 0.5}" r="0.5" fill="#fff"/><circle cx="${h.x + 0.75}" cy="${h.y - 0.5}" r="0.5" fill="#fff"/>
      <circle cx="${h.x - 0.75}" cy="${h.y - 0.45}" r="0.24" fill="#111"/><circle cx="${h.x + 0.75}" cy="${h.y - 0.45}" r="0.24" fill="#111"/>
      <path d="M${h.x - 0.6},${h.y + 0.8} q0.6,0.5 1.2,0" fill="none" stroke="#3b2a1a" stroke-width="0.25" stroke-linecap="round"/>
    </g>`;
  });
  $("#overlay").innerHTML = svg;
}

// ---------- tooltip บนกระดาน ----------
function tipHTMLForCell(n) {
  const s = G.at[n];
  if (n === 100) return `<div class="ct-head">${icon("flag")} ช่อง 100 · เส้นชัย</div>ไปให้ถึงที่นี่ก่อนเพื่อนเพื่อชนะเกม`;
  if (s) {
    const cat = CATEGORIES[s.category];
    return `<div class="ct-head ${s.type}">${icon(s.type)} ช่อง ${n} · ${s.type === "ladder" ? `บันไดไปช่อง ${s.to}` : `งูลงไปช่อง ${s.to}`}</div>
      <div class="ct-cat" style="color:${cat.color}">${cat.name}</div>${esc(s.title)}`;
  }
  const tip = TIPS[G.tipAt[n]];
  return `<div class="ct-head tip">${icon("bulb")} ช่อง ${n} · รู้หรือไม่</div>${esc(tip.text)}`;
}
function showCellTip(cell) {
  const tt = $("#cell-tip"), board = $("#board");
  tt.innerHTML = tipHTMLForCell(+cell.dataset.n);
  tt.classList.remove("hidden");
  const bw = board.clientWidth, cw = cell.offsetWidth;
  const tw = tt.offsetWidth, th = tt.offsetHeight;
  let left = cell.offsetLeft + cw / 2 - tw / 2;
  left = Math.max(4, Math.min(bw - tw - 4, left));
  let top = cell.offsetTop - th - 6;
  if (top < 4) top = cell.offsetTop + cell.offsetHeight + 6;
  tt.style.left = left + "px"; tt.style.top = top + "px";
  document.querySelectorAll(".cell.hover").forEach((c) => c.classList.remove("hover"));
  cell.classList.add("hover");
}
function hideCellTip() {
  $("#cell-tip").classList.add("hidden");
  document.querySelectorAll(".cell.hover").forEach((c) => c.classList.remove("hover"));
}
$("#board").addEventListener("mouseover", (e) => {
  const cell = e.target.closest(".cell");
  if (cell && G) showCellTip(cell);
});
$("#board").addEventListener("mouseleave", hideCellTip);
$("#board").addEventListener("click", (e) => {   // สำหรับจอสัมผัส
  const cell = e.target.closest(".cell");
  if (!cell || !G) return;
  if (cell.classList.contains("hover") && !$("#cell-tip").classList.contains("hidden")) hideCellTip();
  else showCellTip(cell);
});

// ============================================================
// ลูกเต๋า (วาดจุดด้วย CSS)
// ============================================================
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
function setDie(n) {
  $("#die").innerHTML = Array.from({ length: 9 }, (_, i) => `<span class="${PIPS[n].includes(i + 1) ? "pip" : ""}"></span>`).join("");
  $("#die").setAttribute("aria-label", `แต้ม ${n}`);
}

// ============================================================
// ตัวหมากและแผงผู้เล่น
// ============================================================
function renderTokens(slideIdx = -1) {
  const box = $("#tokens");
  if (box.children.length !== G.players.length) {
    box.innerHTML = G.players.map((p, i) =>
      `<div class="token" data-i="${i}" style="--c:${p.avatar.color}">${avatarHTML(p.avatar, p.name)}</div>`).join("");
  }
  G.players.forEach((p, i) => {
    const el = box.children[i];
    const same = G.players.filter((q) => q.pos === p.pos);
    const k = same.indexOf(p), off = same.length > 1 ? (k - (same.length - 1) / 2) * 2.4 : 0;
    const c = cellCenter(p.pos);
    el.classList.toggle("slide", i === slideIdx);
    el.classList.toggle("active", i === G.turn && !G.over);
    el.style.left = `${c.x + off}%`;
    el.style.top = `${c.y + (p.pos === 0 ? 1.5 : 0)}%`;
  });
}

const groupLabel = (p) => `${GENDERS[p.gender].name} · ${AGE_GROUPS[p.age].name}`;

function renderPlayers() {
  $("#players").innerHTML = G.players.map((p, i) => `
    <div class="pcard ${i === G.turn ? "current" : ""}" style="--c:${p.avatar.color}">
      ${avatarHTML(p.avatar, p.name)}
      <div class="info">
        <div class="nm">${esc(p.name)} <span class="grp">${groupLabel(p)}</span></div>
        <div class="mini">
          <span title="ตอบถูก">${icon("check")} ${p.st.correct}/${p.st.answered}</span>
          <span title="ขึ้นบันได">${icon("ladder")} ${p.st.ladders}</span>
          <span title="ตกงู">${icon("snake")} ${p.st.snakesFallen}</span>
          <span title="ความรู้ที่อ่าน">${icon("bulb")} ${p.st.tips}</span>
        </div>
      </div>
      <div class="pos">${p.pos || "–"}</div>
    </div>`).join("");
  renderTokens();
}

function updateTurn() {
  const p = G.players[G.turn];
  $("#turn-name").innerHTML = `${avatarHTML(p.avatar, p.name, "lg")} <span>${esc(p.name)}</span>`;
  $("#btn-roll").disabled = G.busy || G.over;
  renderPlayers();
}

function log(msg) {
  $("#log").insertAdjacentHTML("afterbegin", `<li>${msg}</li>`);
}

// ============================================================
// การเดินหมาก
// ============================================================
$("#btn-roll").addEventListener("click", roll);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && $("#screen-game").classList.contains("active") && $("#modal").classList.contains("hidden")) {
    e.preventDefault();
    roll();
  }
  if (e.key === "Escape" && !MODAL_LOCKED) closeModal();
});

function tokenEl(p) { return $("#tokens").children[G.players.indexOf(p)]; }

async function roll() {
  if (!G || G.busy || G.over) return;
  G.busy = true;
  $("#btn-roll").disabled = true;
  $("#tip-card").classList.add("hidden");
  hideCellTip();
  const p = G.players[G.turn];
  const die = $("#die");

  SFX.dice();
  die.classList.add("rolling");
  for (let i = 0; i < 9; i++) { setDie(rand(1, 6)); await sleep(55); }
  die.classList.remove("rolling");
  const n = rand(1, 6);
  setDie(n);
  FX.flash(die, "landed");
  p.st.rolls++;

  // เดินทีละช่อง (ถ้าเกิน 100 ให้เด้งกลับ)
  let dir = 1;
  for (let i = 0; i < n; i++) {
    if (p.pos === 100) dir = -1;
    p.pos += dir;
    renderPlayers();
    SFX.step(p.pos % 10);
    await sleep(190);
  }
  SFX.land();
  const landed = cellEl(p.pos);
  if (landed) FX.flash(landed, "pulse");
  log(`<b>${esc(p.name)}</b> ทอยได้ ${n} → ช่อง ${p.pos}`);

  const s = G.at[p.pos];
  if (s) await handleScenario(p, s);
  else if (p.pos !== 100) showTip(p, p.pos);

  if (p.pos === 100) {
    G.over = true;
    G.winner = p;
    renderPlayers();
    log(`<b>${esc(p.name)}</b> ถึงเส้นชัย!`);
    SFX.win();
    FX.rain();
    await sleep(900);
    showWinModal(p);
    return;
  }

  G.turn = (G.turn + 1) % G.players.length;
  G.busy = false;
  updateTurn();
}

// ---------- ช่องว่าง: การ์ด "รู้หรือไม่" ----------
function showTip(p, n) {
  const idx = G.tipAt[n], tip = TIPS[idx], cat = CATEGORIES[tip.category];
  p.st.tips++;
  LIFETIME.tipsRead++;
  LIFETIME.tipsSeen[idx] = true;
  saveStats(LIFETIME);
  const card = $("#tip-card");
  card.innerHTML = `
    <button class="tip-close" aria-label="ปิด">${icon("x")}</button>
    <img class="tip-art" src="${catArt(tip.category)}" alt="" onerror="this.remove()">
    <div class="tip-body">
      <div class="tip-head"><span class="tip-badge">${icon("bulb")}</span> รู้หรือไม่ <span class="tip-cat" style="background:${cat.color}">${cat.name}</span></div>
      <p>${esc(tip.text)}</p>
      <div class="tip-foot">ช่อง ${n} · ${esc(p.name)} เก็บความรู้ได้ ${p.st.tips} เรื่อง</div>
    </div>`;
  card.classList.remove("hidden");
  FX.flash(card, "pop-in");
  card.querySelector(".tip-close").onclick = () => card.classList.add("hidden");
  SFX.tip();
  const tk = tokenEl(p);
  if (tk) { const c = FX.centerOf(tk); FX.sparkle(c.x, c.y, 10, "#fbbf24"); FX.floatText(tk, "+ความรู้", "tip"); }
  renderPlayers();
}

async function handleScenario(p, s) {
  await sleep(250);
  const correct = await scenarioModal(p, s);

  p.st.answered++;
  if (correct) p.st.correct++;
  if (!p.st.seen.includes(s.id)) p.st.seen.push(s.id);

  LIFETIME.answered++;
  if (correct) LIFETIME.correct++;
  recordAnswer(p, s.category, correct);
  Analytics.answer(p, "สถานการณ์", s.id, s.title, s.category, correct, G.players.length);
  LIFETIME.seen[s.id] = true;

  const i = G.players.indexOf(p);
  const tk = tokenEl(p);
  if (s.type === "ladder") {
    if (correct) {
      p.st.ladders++; LIFETIME.ladders++;
      p.pos = s.to;
      renderTokens(i);
      SFX.ladder();
      FX.floatText(tk, "ขึ้นบันได!", "good");
      const trail = setInterval(() => { const c = FX.centerOf(tk); FX.sparkle(c.x, c.y, 4, "#fbbf24"); }, 70);
      setTimeout(() => { clearInterval(trail); const c = FX.centerOf(tk); FX.confetti(c.x, c.y, 30, 0.8); }, 900);
      log(`<b>${esc(p.name)}</b> ใช้สิทธิถูกทาง ขึ้นไปช่อง ${s.to}`);
    } else {
      p.st.laddersMissed++;
      FX.floatText(tk, "พลาดบันได", "bad");
      log(`<b>${esc(p.name)}</b> พลาดบันได อยู่ช่องเดิม`);
    }
  } else {
    if (correct) {
      p.st.snakesAvoided++; LIFETIME.snakesAvoided++;
      SFX.shield();
      const c = FX.centerOf(tk); FX.sparkle(c.x, c.y, 18, "#38bdf8");
      FX.floatText(tk, "รอดจากงู!", "good");
      tk.classList.add("shielded"); setTimeout(() => tk.classList.remove("shielded"), 1200);
      log(`<b>${esc(p.name)}</b> รู้ทัน รอดจากงู!`);
    } else {
      p.st.snakesFallen++; LIFETIME.snakesFallen++;
      p.pos = s.to;
      renderTokens(i);
      SFX.snake();
      FX.shake($("#board"));
      FX.flash($("#board"), "hurt");
      FX.floatText(tk, "ตกงู!", "bad");
      log(`<b>${esc(p.name)}</b> ตกงู ไถลลงไปช่อง ${s.to}`);
    }
  }
  saveStats(LIFETIME);
  await sleep(1000);
  renderPlayers();
}

// ============================================================
// Modal
// ============================================================
let MODAL_LOCKED = false;
function openModal(html, { wide = false, locked = false } = {}) {
  MODAL_LOCKED = locked;
  const box = $("#modal-box");
  box.className = "modal-box" + (wide ? " wide" : "");
  box.innerHTML = html;
  $("#modal").classList.remove("hidden");
  box.scrollTop = 0;
  MUSIC.duck(true);   // ลดเพลงลงระหว่างอ่านการ์ด
}
function closeModal() {
  MODAL_LOCKED = false;
  MUSIC.duck(false);
  $("#modal").classList.add("hidden");
}
$("#modal").addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeModal();
  else if (e.target.id === "modal" && !MODAL_LOCKED) closeModal();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]");
  if (!b) return;
  if (b.dataset.open === "stats") showStatsModal();
  if (b.dataset.open === "book") showBookModal();
});

function scenarioHeader(s) {
  const cat = CATEGORIES[s.category];
  const where = s.from ? ` · ช่อง ${s.from}` : "";
  return `<div class="sc-art-wrap"><img class="sc-art" src="${catArt(s.category)}" alt="" onerror="this.parentNode.remove()"></div>
    <div class="sc-head">
      <span class="chip ${s.type}">${icon(s.type)} ${s.type === "ladder" ? "ช่องบันได" : "ช่องงู"}${where}</span>
      <span class="chip" style="background:${cat.color}">${cat.name}</span>
    </div>
    <h2 class="sc-title">${esc(s.title)}</h2>`;
}

function answerBlock(s) {
  return `
    <div class="info-block"><h4>${icon("check")} วิธีแก้</h4>${esc(s.solution)}</div>
    <div class="info-block"><h4>${icon("bulb")} เหตุผล / สิทธิที่เกี่ยวข้อง</h4>${esc(s.reason)}</div>
    <div class="hotline">${icon("phone")} ${esc(s.hotline)}</div>`;
}

function scenarioModal(p, s) {
  return new Promise((resolve) => {
    const order = shuffle(s.choices.map((c, i) => i));
    const stake = s.type === "ladder" ? `ตอบถูก ขึ้นบันไดไปช่อง ${s.to}` : `ตอบผิด ตกงูลงไปช่อง ${s.to}`;
    SFX.card();
    openModal(`
      ${scenarioHeader(s)}
      <div class="label">สถานการณ์ที่เจอ</div>
      <div class="situation">${esc(s.situation)}</div>
      <div class="label who">${avatarHTML(p.avatar, p.name, "sm")} ${esc(p.name)} จะทำอย่างไร? <span style="font-weight:500">(${stake})</span></div>
      <div class="choices">${order.map((i, k) => `<button class="choice" data-i="${i}"><span class="ck">${"กขค"[k]}</span>${esc(s.choices[i].text)}</button>`).join("")}</div>
      <div id="sc-result"></div>`, { locked: true });
    $("#modal-box").classList.add(s.type === "ladder" ? "is-ladder" : "is-snake");

    const buttons = [...document.querySelectorAll("#modal-box .choice")];
    buttons.forEach((btn) => btn.addEventListener("click", () => {
      const picked = +btn.dataset.i;
      const correct = !!s.choices[picked].correct;
      buttons.forEach((b) => {
        b.disabled = true;
        const i = +b.dataset.i;
        if (s.choices[i].correct) b.classList.add("right");
        else if (i === picked) b.classList.add("wrong");
      });
      if (correct) { SFX.correct(); const c = FX.centerOf(btn); FX.confetti(c.x, c.y, 40, 0.9); }
      else { SFX.wrong(); FX.shake($("#modal-box")); }
      const msg = s.type === "ladder"
        ? (correct ? `ถูกต้อง! ได้ขึ้นบันไดไปช่อง ${s.to}` : "ยังไม่ใช่ทางที่ดีที่สุด พลาดบันไดรอบนี้")
        : (correct ? "ถูกต้อง! รู้ทันปัญหา รอดจากงู" : `ยังไม่ใช่ทางที่ดีที่สุด ไถลลงไปช่อง ${s.to}`);
      $("#sc-result").innerHTML = `
        <div class="result-banner ${correct ? "good" : "bad"}">${icon(correct ? "check" : "x")} ${msg}</div>
        ${answerBlock(s)}
        <div class="modal-actions"><button class="btn primary" id="sc-ok">เข้าใจแล้ว ไปต่อ</button></div>`;
      $("#sc-result").scrollIntoView({ behavior: "smooth", block: "start" });
      $("#sc-ok").onclick = () => { closeModal(); resolve(correct); };
    }));
  });
}

function showWinModal(p) {
  openModal(`
    <div style="text-align:center">
      <img class="win-img" src="assets/decor/quiz.jpg" alt="" onerror="this.src='assets/trophy.png';this.onerror=null">
      <h2 class="sc-title" style="justify-content:center">${esc(p.name)} ถึงเส้นชัยแล้ว!</h2>
      <p>ก่อนดูผลสรุป ทุกคนมาตอบ <b>คำถามท้ายบท</b> คนละ ${QUIZ_PER_PLAYER} ข้อ<br>เพื่อทบทวนสิทธิที่ได้เจอระหว่างเกม</p>
      <div class="modal-actions" style="justify-content:center">
        <button class="btn primary big" id="go-quiz">เริ่มคำถามท้ายบท</button>
      </div>
    </div>`, { locked: true });
  $("#go-quiz").onclick = () => { closeModal(); startQuiz(); };
}

// ============================================================
// คำถามท้ายบท
// ============================================================
let Q = null;

function pickQuestionsFor(p) {
  // เลือกคำถามจากหมวดที่ผู้เล่นเจอระหว่างเกมก่อน แล้วค่อยเติมจากหมวดอื่น
  const cats = new Set(p.st.seen.map((id) => SCENARIOS.find((s) => s.id === id).category));
  const pool = shuffle(QUIZ);
  const first = pool.filter((q) => cats.has(q.category));
  const rest = pool.filter((q) => !cats.has(q.category));
  return first.concat(rest).slice(0, QUIZ_PER_PLAYER);
}

function startQuiz() {
  const sets = G.players.map(pickQuestionsFor);
  const queue = [];
  for (let r = 0; r < QUIZ_PER_PLAYER; r++) {
    G.players.forEach((p, i) => { if (sets[i][r]) queue.push({ p, q: sets[i][r] }); });
  }
  Q = { queue, i: 0 };
  showScreen("screen-quiz");
  renderQuestion();
}

function renderQuestion() {
  const { p, q } = Q.queue[Q.i];
  const cat = CATEGORIES[q.category];
  const art = $("#quiz-art");
  art.src = catArt(q.category);
  art.classList.remove("hidden");
  $("#quiz-chip").textContent = `คำถามท้ายบท · ${cat.name}`;
  $("#quiz-chip").style.background = cat.color;
  $("#quiz-progress").textContent = `ข้อ ${Q.i + 1} / ${Q.queue.length}`;
  $("#quiz-bar").style.width = `${(Q.i / Q.queue.length) * 100}%`;
  $("#quiz-player").innerHTML = `${avatarHTML(p.avatar, p.name)} ตาของ ${esc(p.name)}`;
  $("#quiz-q").textContent = q.q;
  const order = shuffle(q.choices.map((c, i) => i));
  $("#quiz-choices").innerHTML = order.map((i, k) => `<button class="choice" data-i="${i}"><span class="ck">${"กขค"[k]}</span>${esc(q.choices[i])}</button>`).join("");
  $("#quiz-feedback").className = "feedback hidden";
  $("#quiz-next").classList.add("hidden");
  FX.flash($(".quiz-card"), "pop-in");

  const buttons = [...document.querySelectorAll("#quiz-choices .choice")];
  buttons.forEach((btn) => btn.addEventListener("click", () => {
    const picked = +btn.dataset.i, correct = picked === q.answer;
    buttons.forEach((b) => {
      b.disabled = true;
      const i = +b.dataset.i;
      if (i === q.answer) b.classList.add("right");
      else if (i === picked) b.classList.add("wrong");
    });
    p.st.quizT++; LIFETIME.quizT++;
    if (correct) { p.st.quizC++; LIFETIME.quizC++; }
    recordAnswer(p, q.category, correct);
    Analytics.answer(p, "ท้ายบท", "quiz-" + QUIZ.indexOf(q), q.q, q.category, correct, G.players.length);
    saveStats(LIFETIME);
    if (correct) { SFX.correct(); const c = FX.centerOf(btn); FX.confetti(c.x, c.y, 40, 0.9); FX.floatText(btn, "+10", "good"); }
    else { SFX.wrong(); FX.shake($(".quiz-card")); }
    $("#quiz-bar").style.width = `${((Q.i + 1) / Q.queue.length) * 100}%`;
    const fb = $("#quiz-feedback");
    fb.className = "feedback " + (correct ? "good" : "bad");
    fb.innerHTML = `<b>${icon(correct ? "check" : "x")} ${correct ? "ถูกต้อง!" : "ยังไม่ถูก"}</b> ${esc(q.explain)}`;
    const next = $("#quiz-next");
    next.textContent = Q.i + 1 < Q.queue.length ? "ข้อต่อไป" : "ดูผลสรุป";
    next.classList.remove("hidden");
  }));
}

$("#quiz-next").addEventListener("click", () => {
  Q.i++;
  if (Q.i < Q.queue.length) renderQuestion();
  else showSummary();
});

// ============================================================
// สรุปผล
// ============================================================
function knowledgeScore(p) {
  return p.st.correct * 10 + p.st.quizC * 10 + p.st.tips * 2 + (G.winner === p ? 20 : 0);
}

function showSummary() {
  LIFETIME.games++;
  Analytics.finish(G.players, G.winner, knowledgeScore);
  saveStats(LIFETIME);

  const ps = G.players;
  const best = ps.reduce((a, b) => (knowledgeScore(b) > knowledgeScore(a) ? b : a));
  const safest = ps.reduce((a, b) => (b.st.snakesAvoided > a.st.snakesAvoided ? b : a));
  const reader = ps.reduce((a, b) => (b.st.tips > a.st.tips ? b : a));
  $("#summary-title").textContent = `${G.winner.name} ชนะเกม!`;

  const award = (ic, label, who) => `<div class="award"><span class="aw-ic">${icon(ic)}</span><div>${label}<b>${who}</b></div></div>`;
  const awards = [
    award("flag", "ถึงเส้นชัยก่อน", esc(G.winner.name)),
    award("star", "รู้สิทธิมากที่สุด", `${esc(best.name)} (${knowledgeScore(best)} คะแนน)`),
  ];
  if (safest.st.snakesAvoided > 0) awards.push(award("shield", "รู้ทันปัญหา", `${esc(safest.name)} (รอดงู ${safest.st.snakesAvoided} ครั้ง)`));
  if (reader.st.tips > 0) awards.push(award("bulb", "นักอ่านความรู้", `${esc(reader.name)} (${reader.st.tips} เรื่อง)`));
  $("#awards").innerHTML = awards.join("");

  $("#summary-table").innerHTML = `
    <tr><th>ผู้เล่น</th><th>กลุ่ม</th><th>ช่อง</th><th>ทอย</th><th>ขึ้นบันได</th><th>รอดงู</th><th>ตกงู</th><th>ความรู้</th><th>ตอบถูกในเกม</th><th>ท้ายบท</th><th>คะแนนรู้สิทธิ</th></tr>
    ${ps.slice().sort((a, b) => knowledgeScore(b) - knowledgeScore(a)).map((p) => `
      <tr>
        <td><span class="td-name">${avatarHTML(p.avatar, p.name, "sm")} ${esc(p.name)}</span></td>
        <td>${groupLabel(p)}</td>
        <td>${p.pos}</td><td>${p.st.rolls}</td><td>${p.st.ladders}</td><td>${p.st.snakesAvoided}</td><td>${p.st.snakesFallen}</td><td>${p.st.tips}</td>
        <td>${p.st.correct}/${p.st.answered} (${pct(p.st.correct, p.st.answered)}%)</td>
        <td>${p.st.quizC}/${p.st.quizT}</td>
        <td><b>${knowledgeScore(p)}</b></td>
      </tr>`).join("")}`;

  const seenIds = [...new Set(ps.flatMap((p) => p.st.seen))];
  $("#learned").innerHTML = seenIds.length
    ? seenIds.map((id) => {
        const s = SCENARIOS.find((x) => x.id === id);
        return `<button class="chip" style="background:${CATEGORIES[s.category].color};border:0" data-book="${s.id}">${esc(s.title)}</button>`;
      }).join("")
    : `<span class="note">เกมนี้ยังไม่ได้เจอสถานการณ์เลย ลองดูในสมุดสิทธิ</span>`;
  showScreen("screen-summary");
  SFX.win();
  setTimeout(() => FX.rain(), 200);
}

$("#learned").addEventListener("click", (e) => {
  const b = e.target.closest("[data-book]");
  if (b) showScenarioDetail(b.dataset.book);
});
$("#btn-again").addEventListener("click", () => showScreen("screen-setup"));

// ============================================================
// สถิติสะสม & สมุดสิทธิ
// ============================================================
function barsHTML(groups, data, color) {
  return Object.entries(groups).map(([k, g]) => {
    const v = data[k];
    return `<div class="bar-row">
      <div>${g.name}</div>
      <div class="bar"><span style="width:${pct(v.c, v.t)}%;background:${g.color || color}"></span></div>
      <div class="pct">${v.t ? `${v.c}/${v.t} (${pct(v.c, v.t)}%)` : "ยังไม่มี"}</div>
    </div>`;
  }).join("");
}

function showStatsModal() {
  const L = LIFETIME;
  openModal(`
    <h2 class="sc-title">${icon("chart")} สถิติของฉัน</h2>
    <div class="kpis">
      <div class="kpi"><div class="v">${L.games}</div><div class="k">เกมที่เล่นจบ</div></div>
      <div class="kpi"><div class="v">${pct(L.correct, L.answered)}%</div><div class="k">ตอบสถานการณ์ถูก (${L.correct}/${L.answered})</div></div>
      <div class="kpi"><div class="v">${pct(L.quizC, L.quizT)}%</div><div class="k">คำถามท้ายบทถูก (${L.quizC}/${L.quizT})</div></div>
      <div class="kpi"><div class="v">${Object.keys(L.seen).length}/${SCENARIOS.length}</div><div class="k">สมุดสิทธิที่ปลดล็อก</div></div>
      <div class="kpi"><div class="v">${Object.keys(L.tipsSeen).length}/${TIPS.length}</div><div class="k">ความรู้ "รู้หรือไม่" ที่เคยอ่าน</div></div>
      <div class="kpi"><div class="v">${L.ladders} / ${L.snakesAvoided}</div><div class="k">ขึ้นบันได / รอดจากงู</div></div>
    </div>
    <div class="label">ความแม่นยำตามหมวดสิทธิ (รวมคำถามท้ายบท)</div>
    <div class="bars">${barsHTML(CATEGORIES, L.byCategory)}</div>
    <div class="stats-2col">
      <div><div class="label">ตามช่วงอายุ</div><div class="bars">${barsHTML(AGE_GROUPS, L.byAge, "#f97316")}</div></div>
      <div><div class="label">ตามเพศ</div><div class="bars">${barsHTML(GENDERS, L.byGender, "#14b8a6")}</div></div>
    </div>
    <p class="note">สถิตินี้เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น</p>
    <div class="modal-actions">
      <button class="btn ghost" id="reset-stats">ล้างสถิติ</button>
      <button class="btn primary" data-close>ปิด</button>
    </div>`, { wide: true });
  $("#reset-stats").onclick = () => {
    if (confirm("ล้างสถิติและสมุดสิทธิทั้งหมด?")) {
      LIFETIME = emptyStats();
      saveStats(LIFETIME);
      showStatsModal();
    }
  };
}

function showBookModal() {
  const items = SCENARIOS.map((s) => {
    const open = LIFETIME.seen[s.id];
    const cat = CATEGORIES[s.category];
    return open
      ? `<button class="book-item" data-book="${s.id}">
          <img class="book-art" src="${catArt(s.category)}" alt="" onerror="this.remove()">
          <span class="chip" style="background:${cat.color}">${cat.name}</span>
          <div class="t">${icon(s.type)} ${esc(s.title)}</div>
          <div class="s">${icon("phone")} ${esc(s.hotline)}</div>
        </button>`
      : `<div class="book-item locked">
          <span class="chip" style="background:${cat.color}">${cat.name}</span>
          <div class="t">${icon("lock")} ยังไม่ปลดล็อก</div>
          <div class="s">เจอสถานการณ์นี้ในเกมเพื่อปลดล็อก</div>
        </div>`;
  }).join("");
  openModal(`
    <h2 class="sc-title">${icon("book")} สมุดสิทธิ (${Object.keys(LIFETIME.seen).length}/${SCENARIOS.length})</h2>
    <p class="note" style="margin-top:0">สถานการณ์ที่เคยเจอในเกมจะถูกเก็บไว้ที่นี่ กดเพื่ออ่านวิธีแก้และเหตุผลซ้ำได้</p>
    <div class="book-grid">${items}</div>
    <p class="note">ข้อมูลสิทธิและสายด่วนอาจเปลี่ยนแปลงได้ โปรดตรวจสอบกับหน่วยงานที่เกี่ยวข้องก่อนใช้งานจริง</p>
    <div class="modal-actions"><button class="btn primary" data-close>ปิด</button></div>`, { wide: true });
}

function showScenarioDetail(id) {
  const s = SCENARIOS.find((x) => x.id === id);
  openModal(`
    ${scenarioHeader(s)}
    <div class="label">สถานการณ์ที่เจอ</div>
    <div class="situation">${esc(s.situation)}</div>
    ${answerBlock(s)}
    <div class="modal-actions">
      <button class="btn ghost" data-open="book">${icon("back")} กลับสมุดสิทธิ</button>
      <button class="btn primary" data-close>ปิด</button>
    </div>`, { wide: true });
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".book-item[data-book]");
  if (b) showScenarioDetail(b.dataset.book);
});
