/* ===== ICONS ===== */
var ICONS = {
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  bun: '<circle cx="12" cy="12" r="8"/><path d="M12 12a2 2 0 1 1 2 2 4 4 0 1 1-4-4"/>',
  cup: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v3M12 3v3"/>',
  sun: '<path d="M4 17a8 8 0 0 1 16 0z"/><path d="M12 4v3M4.5 8.5l2 2M19.5 8.5l-2 2M2 20h20"/>',
  egg: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-4 15-12 15z"/><path d="M5 19l8-8"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  plate: '<path d="M4 17h16"/><path d="M5 17a7 7 0 0 1 14 0"/><path d="M12 8V6"/>',
  fork: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 2-2 6 0 8v10"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  chat: '<path d="M4 5h16v11H10l-5 4v-4H4z"/>',
  people: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 8-3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  mug: '<path d="M5 6h11v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M16 9h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><path d="M8 10v6M12 10v6"/>',
  cocktail: '<path d="M4 4h16l-8 9z"/><path d="M12 13v7M8 20h8"/>',
  wine: '<path d="M8 3h8v6a4 4 0 0 1-8 0z"/><path d="M12 13v8M8 21h8"/>',
  cone: '<path d="M7 11a5 5 0 0 1 10 0z"/><path d="M7 11l5 10 5-10"/>',
  pin: '<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  smile: '<circle cx="12" cy="12" r="8"/><path d="M8.5 14a4 4 0 0 0 7 0"/><path d="M9 9.5v.5M15 9.5v.5"/>',
  up: '<path d="M12 20V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 4v15M5 12l7 7 7-7"/>',
  mark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
  route: '<circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 17h8a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h8"/>',
  x: '<path d="M5 5l14 14M19 5L5 19"/>'
};
function ic(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || "") + "</svg>"; }

/* ===== MAP ENGINE ===== */
var BX = 17.95, BY = 59.365, KX = 6120, KY = 12000;
function proj(lng, lat) { return [(lng - BX) * KX, (BY - lat) * KY]; }
function f1(n) { return n.toFixed(1); }
function ringPath(pts, closed) {
  var P = pts.map(function (p) { return proj(p[0], p[1]); }), n = P.length;
  var d = "M" + f1(P[0][0]) + " " + f1(P[0][1]);
  var last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p0 = closed ? P[(i - 1 + n) % n] : P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[(i + 1) % n], p3 = closed ? P[(i + 2) % n] : P[Math.min(i + 2, n - 1)];
    var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += "C" + f1(c1x) + " " + f1(c1y) + " " + f1(c2x) + " " + f1(c2y) + " " + f1(p2[0]) + " " + f1(p2[1]);
  }
  return d + (closed ? "Z" : "");
}
var SOUTH = [[17.90,59.2500],[18.25,59.2500],[18.25,59.3000],[18.12,59.3010],[18.10,59.3025],[18.085,59.3010],[18.07,59.3015],[18.055,59.3010],[18.04,59.2995],[18.025,59.3005],[18.01,59.3025],[17.995,59.3050],[17.98,59.3070],[17.90,59.3070]];
var NORTH_FIXED = (function () { var a = GEO.mainland.slice(2, 23); return [[17.90,59.4000],[17.90,59.3520],[17.98,59.3500],[18.030,59.3470]].concat(a).concat([[18.160,59.3420],[18.220,59.3500],[18.220,59.4000]]); })();

function buildWorld() {
  var NS = "http://www.w3.org/2000/svg", g = document.getElementById("world"), h = "";
  function path(cls, pts, closed) { return '<path class="' + cls + '" d="' + ringPath(pts, closed) + '"/>'; }
  h += path("land", SOUTH, true);
  h += path("land", NORTH_FIXED, true);
  ["kungsholmen", "sodermalm", "langholmen", "gamlastan", "skeppsholmen", "djurgarden"].forEach(function (k) { h += path("land", GEO[k], true); });
  ["mainland_", "kungsholmen", "sodermalm", "gamlastan"].forEach(function (k) { if (k === "mainland_") h += path("blocks", NORTH_FIXED, true); else h += path("blocks", GEO[k], true); });
  PARKS.forEach(function (p) { h += path("park", p, true); });
  STREETS.forEach(function (s) { h += path("st-edge", s, false); });
  STREETS.forEach(function (s) { h += path("st", s, false); });
  WATER_LABELS.forEach(function (w) { var p = proj(w.lng, w.lat); h += '<text class="wl" data-px="11" x="' + f1(p[0]) + '" y="' + f1(p[1]) + '" text-anchor="middle">' + w.t + "</text>"; });
  AREA_LABELS.forEach(function (w) { var p = proj(w.lng, w.lat); h += '<text class="al" data-px="26" x="' + f1(p[0]) + '" y="' + f1(p[1]) + '" text-anchor="middle">' + w.t + "</text>"; });
  g.innerHTML = h;
}

var M = { s: 1.5, tx: 0, ty: 0 };
var mapEl, worldEl, pinsEl, S_MIN = 0.45, S_MAX = 18, raf = 0, onFrame = null, anim = null;
function isMobile() { return window.matchMedia("(max-width: 899px)").matches; }
function sheetPx() { var p = document.getElementById("panel"); return p && !p.classList.contains("closed") ? p.offsetHeight : 0; }
function usable() {
  var W = mapEl.clientWidth, H = mapEl.clientHeight, mob = isMobile(), panel = document.getElementById("panel");
  var top = mob ? 132 : 84, right = 12, bottom = 12;
  if (!mob && panel && !panel.classList.contains("closed")) right = panel.offsetWidth + 12;
  if (mob) bottom = (document.getElementById("detail").hidden ? sheetPx() : 0) + 10;
  return { x: 12, y: top, w: Math.max(120, W - 12 - right), h: Math.max(120, H - top - bottom), W: W, H: H };
}
function clampView() {
  var W = mapEl.clientWidth, H = mapEl.clientHeight;
  var cx = (W / 2 - M.tx) / M.s, cy = (H / 2 - M.ty) / M.s;
  var a = proj(17.985, 59.358), b = proj(18.150, 59.300);
  cx = Math.min(Math.max(cx, a[0]), b[0]); cy = Math.min(Math.max(cy, a[1]), b[1]);
  M.tx = W / 2 - cx * M.s; M.ty = H / 2 - cy * M.s;
}
function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; applyView(); }); }
function applyView() {
  worldEl.setAttribute("transform", "translate(" + M.tx.toFixed(2) + " " + M.ty.toFixed(2) + ") scale(" + M.s.toFixed(4) + ")");
  var t = worldEl.querySelectorAll("text");
  for (var i = 0; i < t.length; i++) t[i].setAttribute("font-size", (parseFloat(t[i].getAttribute("data-px")) / M.s).toFixed(2));
  var al = worldEl.querySelectorAll(".al"), show = M.s < 4.5;
  for (var j = 0; j < al.length; j++) al[j].style.display = show ? "" : "none";
  pinsEl.style.setProperty("--ps", Math.min(1, 0.4 + 0.2 * M.s).toFixed(3));
  if (onFrame) onFrame();
}
function worldToScreen(X, Y) { return [M.tx + X * M.s, M.ty + Y * M.s]; }
function zoomAt(px, py, factor) {
  var ns = Math.min(S_MAX, Math.max(S_MIN, M.s * factor)); factor = ns / M.s;
  M.tx = px - (px - M.tx) * factor; M.ty = py - (py - M.ty) * factor; M.s = ns; clampView(); schedule();
}
function fitBounds(b) {
  var u = usable(), a = proj(b[0], b[3]), c = proj(b[2], b[1]);
  var bw = Math.max(40, c[0] - a[0]), bh = Math.max(40, c[1] - a[1]);
  var s = Math.min(u.w / bw, u.h / bh); s = Math.min(S_MAX, Math.max(S_MIN, s));
  return { s: s, tx: u.x + (u.w - bw * s) / 2 - a[0] * s, ty: u.y + (u.h - bh * s) / 2 - a[1] * s };
}
function flyTo(t, instant) {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (anim) cancelAnimationFrame(anim);
  if (instant || reduce) { M.s = t.s; M.tx = t.tx; M.ty = t.ty; clampView(); applyView(); return; }
  var s0 = M.s, x0 = M.tx, y0 = M.ty, t0 = performance.now(), D = 320;
  (function step(now) {
    var k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
    M.s = s0 + (t.s - s0) * e; M.tx = x0 + (t.tx - x0) * e; M.ty = y0 + (t.ty - y0) * e; applyView();
    if (k < 1) anim = requestAnimationFrame(step); else { anim = 0; clampView(); applyView(); }
  })(t0);
}
function focusOn(lng, lat, minS) {
  var u = usable(), p = proj(lng, lat), s = Math.max(M.s, minS || 3);
  var det = document.getElementById("detail"), dh = det.hidden ? 0 : det.offsetHeight, dw = det.hidden ? 0 : det.offsetWidth;
  var sx, sy;
  if (isMobile()) { sx = u.W / 2; sy = u.y + Math.max(40, (u.H - dh - u.y - 12) / 2); }
  else { var freeL = dw ? 16 + dw + 24 : u.x; sx = Math.max(u.x + u.w * 0.5, freeL + (u.x + u.w - freeL) / 2); sx = Math.min(sx, u.x + u.w - 60); sy = dh ? u.y + Math.max(60, (u.H - dh - u.y - 24) / 2) : u.y + u.h * 0.5; }
  flyTo({ s: s, tx: sx - p[0] * s, ty: sy - p[1] * s });
}
function initMap(frameCb) {
  mapEl = document.getElementById("map"); pinsEl = document.getElementById("pins"); onFrame = frameCb;
  buildWorld(); worldEl = document.getElementById("world");
  document.getElementById("bld").setAttribute("patternTransform", "scale(0.62)");
  mapEl.tabIndex = 0;
  var ptrs = {}, last = null, moved = 0, startPinch = 0;
  function pts() { return Object.keys(ptrs).map(function (k) { return ptrs[k]; }); }
  mapEl.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest("button, .plabel, a")) return;
    mapEl.setPointerCapture && mapEl.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    moved = 0; mapEl.classList.add("drag"); if (anim) { cancelAnimationFrame(anim); anim = 0; }
    var p = pts(); last = p.length === 1 ? { x: p[0].x, y: p[0].y } : null; startPinch = p.length === 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
  });
  mapEl.addEventListener("pointermove", function (e) {
    if (!ptrs[e.pointerId]) return;
    var prev = ptrs[e.pointerId]; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; var p = pts();
    var rect = mapEl.getBoundingClientRect();
    if (p.length === 1 && last) { var dx = e.clientX - last.x, dy = e.clientY - last.y; moved += Math.abs(dx) + Math.abs(dy); M.tx += dx; M.ty += dy; last = { x: e.clientX, y: e.clientY }; clampView(); schedule(); }
    else if (p.length === 2) {
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (startPinch > 0 && d > 0) { var cx = (p[0].x + p[1].x) / 2 - rect.left, cy = (p[0].y + p[1].y) / 2 - rect.top; zoomAt(cx, cy, d / startPinch); } startPinch = d;
    }
  });
  function up(e) { delete ptrs[e.pointerId]; var p = pts(); last = p.length === 1 ? { x: p[0].x, y: p[0].y } : null; startPinch = 0; if (!p.length) mapEl.classList.remove("drag"); }
  mapEl.addEventListener("pointerup", up); mapEl.addEventListener("pointercancel", up);
  mapEl.addEventListener("wheel", function (e) { e.preventDefault(); var r = mapEl.getBoundingClientRect(); var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-dy * 0.0016)); }, { passive: false });
  mapEl.addEventListener("dblclick", function (e) { if (e.target.closest("button, .plabel")) return; var r = mapEl.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1.8); });
  mapEl.addEventListener("keydown", function (e) {
    if (e.target !== mapEl) return; var st = 60, k = e.key, W = mapEl.clientWidth, H = mapEl.clientHeight;
    if (k === "ArrowLeft") M.tx += st; else if (k === "ArrowRight") M.tx -= st; else if (k === "ArrowUp") M.ty += st; else if (k === "ArrowDown") M.ty -= st;
    else if (k === "+" || k === "=") { zoomAt(W / 2, H / 2, 1.4); e.preventDefault(); return; } else if (k === "-" || k === "_") { zoomAt(W / 2, H / 2, 1 / 1.4); e.preventDefault(); return; } else return;
    e.preventDefault(); clampView(); schedule();
  });
  window.addEventListener("resize", schedule);
  mapEl.wasDrag = function () { return moved > 6; };
}
function defaultView() { return isMobile() ? fitBounds([18.045, 59.3150, 18.105, 59.3400]) : fitBounds([18.030, 59.3085, 18.125, 59.3470]); }
