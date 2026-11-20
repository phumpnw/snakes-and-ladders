// ไอคอน: ใช้รูปที่สร้างด้วย Codex (assets/icons/<ชื่อ>.png)
// ถ้าโหลดรูปไม่ได้ จะใช้ไอคอน SVG ด้านล่างแทนอัตโนมัติ
const ICON_PATHS = {
  ladder:  '<path d="M7 2v20M17 2v20M7 6h10M7 10.5h10M7 15h10M7 19.5h10"/>',
  snake:   '<path d="M4 20c3 0 4-2 4-4s-2-3-2-5 2-3 4-3 4 1 4 3-2 3-2 5 1 4 4 4"/><circle cx="16" cy="5" r="2.5"/>',
  chart:   '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book:    '<path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z"/><path d="M12 6v14"/>',
  flag:    '<path d="M5 22V3M5 4h12l-2 4 2 4H5"/>',
  check:   '<path d="M4 12.5l5 5L20 6.5"/>',
  x:       '<path d="M6 6l12 12M18 6L6 18"/>',
  shield:  '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  bulb:    '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  phone:   '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  lock:    '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  sound:   '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute:    '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  star:    '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  exit:    '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
  back:    '<path d="M15 5l-7 7 7 7"/>',
  music:             '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  "music-off":       '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/>',
  fullscreen:        '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  "fullscreen-exit": '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
};

function iconSvg(name, cls = "") {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}
function iconFallback(img) {
  img.outerHTML = iconSvg(img.dataset.icon, img.dataset.cls || "");
}
function icon(name, cls = "") {
  return `<img class="ic ic-img ${cls}" src="assets/icons/${name}.png" alt="" draggable="false" data-icon="${name}" data-cls="${cls}" onerror="iconFallback(this)">`;
}

// แทนที่ <i data-icon="..."></i> ใน HTML ด้วยไอคอน
function hydrateIcons(root = document) {
  root.querySelectorAll("i[data-icon]").forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, el.className);
  });
}
