/**
 * บันไดงู รู้สิทธิ — ตัวรับสถิติลง Google Sheets
 *
 * วิธีติดตั้ง (ดูรายละเอียดใน README.md หัวข้อ "เก็บสถิติผู้เล่นด้วย Google Sheets"):
 *   1. เปิด Google Sheet ใหม่ → ส่วนขยาย → Apps Script → วางโค้ดนี้แทนของเดิมทั้งหมด → บันทึก
 *   2. เลือกฟังก์ชัน setup แล้วกด "เรียกใช้" หนึ่งครั้ง (จะสร้างชีต Starts / Answers / Results / Summary)
 *   3. ทำให้ใช้งานได้ → การทำให้ใช้งานได้รายการใหม่ → เว็บแอป
 *      ดำเนินการในฐานะ: ฉัน / ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน → คัดลอก URL ที่ลงท้ายด้วย /exec
 *
 * ข้อมูลที่เกมส่งมาไม่ระบุตัวตน: ไม่มีชื่อผู้เล่น ไม่มี IP มีเฉพาะช่วงอายุ เพศ และผลการเล่น
 */

const SHEETS = {
  Starts: ["เวลา", "รหัสเกม", "จำนวนผู้เล่น", "ช่วงอายุ", "เพศ"],
  Answers: ["เวลา", "รหัสเกม", "ประเภท", "หมวด", "ช่วงอายุ", "เพศ", "รหัสเรื่อง", "หัวข้อ/คำถาม", "จำนวนผู้เล่น", "ตอบถูก (1/0)"],
  Results: ["เวลา", "รหัสเกม", "ช่วงอายุ", "เพศ", "จำนวนผู้เล่น", "ชนะ (1/0)", "คะแนนรู้สิทธิ", "ตอบถูกในเกม", "ตอบในเกม",
            "ท้ายบทถูก", "ท้ายบททั้งหมด", "ขึ้นบันได", "รอดงู", "ตกงู", "ความรู้ที่อ่าน", "จำนวนทอย", "เวลาเล่น (นาที)"],
};
const TYPE_TO_SHEET = { start: "Starts", answer: "Answers", result: "Results" };

// ---------- รับข้อมูลจากเกม ----------
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return text_("busy");
  try {
    const data = JSON.parse(e.postData.contents);
    const name = TYPE_TO_SHEET[data.type];
    if (!name || !Array.isArray(data.rows)) return text_("bad request");
    const sheet = SpreadsheetApp.getActive().getSheetByName(name);
    if (!sheet) return text_("run setup first");
    const width = SHEETS[name].length - 1;   // คอลัมน์แรกเป็นเวลาที่สคริปต์ใส่เอง
    const rows = data.rows.slice(0, 8).map((r) => [new Date()].concat(clean_(r, width)));
    if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, width + 1).setValues(rows);
    return text_("ok");
  } catch (err) {
    return text_("error");
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return text_("บันไดงู รู้สิทธิ: ตัวรับสถิติทำงานอยู่");
}

// จำกัดจำนวนคอลัมน์/ความยาว และกันการแทรกสูตร (ข้อความที่ขึ้นต้นด้วย = + - @)
function clean_(row, width) {
  const out = [];
  for (let i = 0; i < width; i++) {
    let v = Array.isArray(row) ? row[i] : "";
    if (typeof v === "number" && isFinite(v)) { out.push(v); continue; }
    v = String(v == null ? "" : v).slice(0, 200);
    if (/^[=+\-@]/.test(v)) v = "'" + v;
    out.push(v);
  }
  return out;
}

function text_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}

// ---------- ติดตั้งครั้งแรก: สร้างชีตและหน้าสรุป ----------
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach((name) => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight("bold").setBackground("#ffedd5");
    sh.setFrozenRows(1);
  });
  buildSummary_(ss);
  const first = ss.getSheetByName("Sheet1") || ss.getSheetByName("ชีต1");
  if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);
}

function buildSummary_(ss) {
  const sh = ss.getSheetByName("Summary") || ss.insertSheet("Summary", 0);
  sh.clear();
  sh.getRange("A1").setValue("สรุปสถิติ บันไดงู รู้สิทธิ").setFontSize(16).setFontWeight("bold");
  sh.getRange("A2").setValue("อัปเดตอัตโนมัติจากชีต Starts / Answers / Results");

  const kpis = [
    ["เกมที่เริ่มเล่น", "=COUNTA(Starts!B2:B)"],
    ["เกมที่เล่นจบ", "=COUNTUNIQUE(Results!B2:B)"],
    ["อัตราเล่นจบ", "=IFERROR(B5/B4,0)"],
    ["ผู้เล่นทั้งหมด (คน-เกม)", "=SUM(Starts!C2:C)"],
    ["ตอบทั้งหมด", "=COUNT(Answers!J2:J)"],
    ["ตอบถูกโดยรวม", "=IFERROR(AVERAGE(Answers!J2:J),0)"],
    ["เวลาเล่นเฉลี่ย (นาที)", "=IFERROR(AVERAGE(Results!Q2:Q),0)"],
  ];
  sh.getRange(4, 1, kpis.length, 2).setValues(kpis);
  sh.getRange("B6").setNumberFormat("0%");
  sh.getRange("B9").setNumberFormat("0%");
  sh.getRange("B10").setNumberFormat("0.0");
  sh.getRange("A4:A10").setFontWeight("bold");

  const table = (cell, title, col) => {
    const r = sh.getRange(cell);
    r.offset(-1, 0).setValue(title).setFontWeight("bold");
    r.setFormula(`=QUERY(Answers!A:J,"select ${col}, count(J), avg(J) where J is not null group by ${col} order by avg(J) asc label ${col} '', count(J) 'จำนวนตอบ', avg(J) 'ตอบถูก'",1)`);
    r.offset(0, 2, 40, 1).setNumberFormat("0%");
  };
  table("A14", "ตอบถูกตามหมวดสิทธิ", "D");
  table("E14", "ตอบถูกตามช่วงอายุ", "E");
  table("I14", "ตอบถูกตามเพศ", "F");

  sh.getRange("A28").setValue("สถานการณ์ที่ตอบผิดบ่อยที่สุด (ควรเน้นสอน)").setFontWeight("bold");
  sh.getRange("A29").setFormula(`=QUERY(Answers!A:J,"select H, count(J), avg(J) where C = 'สถานการณ์' and J is not null group by H order by avg(J) asc limit 10 label H 'สถานการณ์', count(J) 'จำนวนตอบ', avg(J) 'ตอบถูก'",1)`);
  sh.getRange("C29:C40").setNumberFormat("0%");

  sh.getRange("E28").setValue("คำถามท้ายบทที่ตอบผิดบ่อยที่สุด").setFontWeight("bold");
  sh.getRange("E29").setFormula(`=QUERY(Answers!A:J,"select H, count(J), avg(J) where C = 'ท้ายบท' and J is not null group by H order by avg(J) asc limit 10 label H 'คำถาม', count(J) 'จำนวนตอบ', avg(J) 'ตอบถูก'",1)`);
  sh.getRange("G29:G40").setNumberFormat("0%");

  sh.setColumnWidth(1, 260);
  sh.setColumnWidth(5, 260);
}
