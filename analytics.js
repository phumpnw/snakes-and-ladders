// ส่งสถิติแบบไม่ระบุตัวตนไปที่ Google Sheets (ผ่าน Apps Script Web App)
// วาง URL ของ Web App (ลงท้ายด้วย /exec) ที่ ANALYTICS_URL — ถ้าเว้นว่างไว้ เกมจะไม่ส่งข้อมูลใด ๆ
// ข้อมูลที่ส่ง: ช่วงอายุ เพศ หมวด และผลถูก/ผิด — ไม่ส่งชื่อผู้เล่น
const ANALYTICS_URL = "";

const Analytics = (() => {
  let session = null, t0 = 0;
  const enabled = () => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(ANALYTICS_URL);
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const who = (p) => [AGE_GROUPS[p.age].name, GENDERS[p.gender].name];

  function send(type, rows) {
    if (!enabled()) return;
    try {
      // text/plain + no-cors เพื่อไม่ให้ติด CORS preflight ของ Apps Script
      fetch(ANALYTICS_URL, {
        method: "POST", mode: "no-cors", keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type, rows }),
      }).catch(() => {});
    } catch (e) { /* ไม่ให้ปัญหาเครือข่ายกระทบการเล่น */ }
  }

  return {
    get enabled() { return enabled(); },
    start(players) {
      session = id(); t0 = Date.now();
      send("start", [[session, players.length,
        players.map((p) => AGE_GROUPS[p.age].name).join(", "),
        players.map((p) => GENDERS[p.gender].name).join(", ")]]);
    },
    // kind: "สถานการณ์" หรือ "ท้ายบท"
    answer(p, kind, itemId, title, category, correct, playerCount) {
      send("answer", [[session, kind, CATEGORIES[category].name, ...who(p), itemId, title, playerCount, correct ? 1 : 0]]);
    },
    finish(players, winner, scoreOf) {
      const mins = Math.round(((Date.now() - t0) / 60000) * 10) / 10;
      send("result", players.map((p) => [session, ...who(p), players.length, p === winner ? 1 : 0, scoreOf(p),
        p.st.correct, p.st.answered, p.st.quizC, p.st.quizT, p.st.ladders, p.st.snakesAvoided, p.st.snakesFallen,
        p.st.tips, p.st.rolls, mins]));
    },
  };
})();
