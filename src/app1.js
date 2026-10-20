/* ===== APP STATE + RENDER ===== */
var LAUNCH = Date.UTC(2026, 9, 19), DAY = 864e5, NEWWIN = 14 * DAY, THRESH = 5;
var AREA_C = { "Gamla Stan": [18.0698, 59.3245], "Södermalm": [18.0560, 59.3120], "Norrmalm": [18.0640, 59.3335], "Östermalm": [18.0850, 59.3365], "Vasastan": [18.0520, 59.3420], "Kungsholmen": [18.0300, 59.3320], "Djurgården": [18.1150, 59.3262] };
var S = { tab: "all", cut: null, showSug: false, sort: "top", sel: null, remote: {}, myDb: {}, myLocal: {}, saved: {}, remoteSugg: [], agentPlaces: [], autoStatic: [], localSugg: [], db: null, uid: null, dbWrite: false, sheet: "peek" };
var PINS = [];
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
var toastT;
function toast(m) { var t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 3200); }
function areaPos(key, area) { var c = AREA_C[area] || AREA_C["Norrmalm"], h = hash(key); return [c[0] + ((h % 61) - 30) * 0.0001, c[1] + (((h >> 6) % 41) - 20) * 0.00008]; }

/* ---- items ---- */
function mk(p, kind, pid, i) { var o = {}; for (var k in p) o[k] = p[k]; o.kind = kind; o.pid = pid; o.order = i; o.addedAt = p.addedAt || LAUNCH; o.why = kind === "p" ? p.line : p.why; if (kind === "q") o.by = "BITE RATE HQ"; return o; }
function allItems() {
  var out = [], seen = {};
  PLACES.forEach(function (p, i) { out.push(mk(p, "p", "p_" + p.id, i)); });
  QUEUE.forEach(function (p, i) { out.push(mk(p, "q", "q_" + p.id, 100 + i)); });
  S.autoStatic.concat(S.agentPlaces).forEach(function (a) { if (!seen[a.pid]) { seen[a.pid] = 1; out.push(a); } });
  S.remoteSugg.concat(S.localSugg).forEach(function (s) { if (seen[s.pid]) return; seen[s.pid] = 1; out.push(s); });
  return out;
}
function itemByPid(pid) { var a = allItems(); for (var i = 0; i < a.length; i++) if (a[i].pid === pid) return a[i]; return null; }
function myVote(pid) { return S.dbWrite ? S.myDb[pid] : S.myLocal[pid]; }
function tally(pid) { var r = S.remote[pid] || { go: 0, skip: 0 }, go = r.go, skip = r.skip, m = myVote(pid); if (m === "go") go++; else if (m === "skip") skip++; return { go: go, skip: skip, net: go - skip }; }
function tabOk(it) { return S.tab === "all" || (S.tab === "new" && Date.now() - it.addedAt <= NEWWIN) || (S.tab === "saved" && S.saved[it.pid]); }
function baseOk(it) { return (it.kind === "p" || S.showSug) && tabOk(it); }
function visible() {
  var list = allItems().filter(function (it) { return baseOk(it) && (!S.cut || it.cuts.indexOf(S.cut) >= 0); });
  list.forEach(function (it) { it._t = tally(it.pid); });
  if (S.sort === "top") list.sort(function (a, b) { return b._t.net - a._t.net || b._t.go - a._t.go || (a.kind === b.kind ? a.order - b.order : (a.kind === "p" ? -1 : 1)); });
  else if (S.sort === "az") list.sort(function (a, b) { return a.name.localeCompare(b.name, "sv"); });
  else list.sort(function (a, b) { return AREAS.indexOf(a.area) - AREAS.indexOf(b.area) || a.name.localeCompare(b.name, "sv"); });
  return list;
}
/* ---- Google Maps links ---- */
function gmQ(it) { return it.name + ", " + ((it.ver === 1 && it.addr) ? it.addr : it.area) + ", Stockholm"; }
function gmUrl(it) { return it.link || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(gmQ(it)); }
function gmDir(it) { return "https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=" + encodeURIComponent(gmQ(it)); }
function placeUrl(it) { return location.origin + location.pathname + location.search + "#p=" + encodeURIComponent(it.pid); }
function websiteUrl(it) {
  try { var u = new URL(it.website); return u.protocol === "https:" && !u.username && !u.password ? u.href : ""; } catch (e) { return ""; }
}
function cleanMapsUrl(s) {
  s = String(s || "").trim(); if (!s) return "";
  var u; try { u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); } catch (e) { return null; }
  var h = u.hostname.replace(/^www\./, ""), short = h === "maps.app.goo.gl" || h === "goo.gl";
  var gm = (h === "google.com" || h === "google.se" || /\.google\.(com|se)$/.test(h)) && u.pathname.indexOf("/maps") === 0;
  if (!short && !gm) return null; if (short) return "https://" + h + u.pathname;
  var out = new URL("https://www.google.com" + u.pathname);
  ["q", "query", "query_place_id", "cid", "destination"].forEach(function (k) { if (u.searchParams.has(k)) out.searchParams.set(k, u.searchParams.get(k)); });
  return out.toString();
}

/* ---- html builders ---- */
function dotHtml(it, cls) {
  var c = CUT_BY[it.cuts[0]] || CUTS[0];
  return it.kind !== "p" ? '<div class="' + cls + '" style="background:var(--pink)"><span class="h-md" style="font-size:' + (cls === "bigdot" ? 26 : 20) + 'px;color:#161713">?</span></div>' : '<div class="' + cls + '" style="background:' + c.col + '">' + ic(c.ic) + "</div>";
}
function tagsHtml(it) {
  var h = it.cuts.map(function (id) { var c = CUT_BY[id]; return c ? '<span class="badge" style="--bc:' + c.col + '">' + ic(c.ic) + esc(c.label) + "</span>" : ""; }).join("");
  if (it.kind !== "p") h += '<span class="badge stamp">Suggestion</span>';
  if (it.auto) h += '<span class="badge stamp">Auto-added' + (it.revN ? " · " + it.revN + " reviews" : "") + "</span>";
  if (it.owner) h += '<span class="badge stamp">Owner</span>';
  if (it.kind === "s" && Date.now() - it.addedAt < NEWWIN) h += '<span class="badge" style="--bc:var(--cyan)">New</span>';
  return h;
}
function saysLabel(it) { return it.auto ? "Review agent says" : it.kind === "p" ? "Bite Rate says" : it.kind === "q" ? "Bite Rate HQ says" : "A reader says"; }
function gsHtml(it) { return (it.get || it.skip) ? '<div class="gs">' + (it.get ? '<p><span class="tagl g">Get</span>' + esc(it.get) + "</p>" : "") + (it.skip ? '<p><span class="tagl s">Skip if</span>' + esc(it.skip) + "</p>" : "") + "</div>" : ""; }
function progHtml(it, t) {
  if (it.kind === "p") return "";
  if (t.net >= THRESH) return '<div class="mini"><span class="badge" style="--bc:var(--green)">Up for review</span></div>';
  var n = Math.max(0, t.net), pct = Math.round(Math.min(100, n / THRESH * 100));
  return '<div class="prog"><span class="code">' + n + " of " + THRESH + ' net votes to be checked out</span><div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div></div>';
}
function voteBtns(it, t, mv, labelled) {
  var nm = esc(it.name);
  return '<div class="votebox" role="group" aria-label="Vote on ' + nm + '">' +
    '<button class="vb go" type="button" data-v="go" aria-pressed="' + (mv === "go") + '" aria-label="Say go to ' + nm + ', ' + t.go + ' so far">' + ic("up") + (labelled ? "<span>Go</span>" : "") + "</button>" +
    '<button class="vb skip" type="button" data-v="skip" aria-pressed="' + (mv === "skip") + '" aria-label="Say skip to ' + nm + ', ' + t.skip + ' so far">' + ic("down") + (labelled ? "<span>Skip</span>" : "") + "</button></div>";
}
function statHtml(t, mv) { return '<span class="code">' + t.go + " say go · " + t.skip + " skip" + (mv ? " · you said " + mv : "") + "</span>"; }
function cardHtml(it) {
  var t = it._t || tally(it.pid), mv = myVote(it.pid), save = !!S.saved[it.pid];
  return '<li class="card' + (S.sel === it.pid ? " on" : "") + '" data-pid="' + esc(it.pid) + '">' +
    '<div class="card-head">' + dotHtml(it, "bigdot") + '<div style="min-width:0"><button class="name" type="button" data-sel="1">' + esc(it.name) + '</button><div class="loc code">' + ic("pin") + esc(it.area) + "</div></div>" + voteBtns(it, t, mv, false) + "</div>" +
    '<div class="tags">' + tagsHtml(it) + "</div>" +
    '<div class="says"><span class="smile">' + ic("smile") + '</span><span class="code">' + saysLabel(it) + "</span></div>" +
    '<p class="say">' + esc(it.why) + "</p><hr class=\"dash\">" + gsHtml(it) + progHtml(it, t) +
    '<div class="stat">' + statHtml(t, mv) + '<span class="mini"><a class="btn sm" target="_blank" rel="noopener" href="' + esc(gmUrl(it)) + '">Maps ↗</a><button class="btn sm" type="button" data-save="1" aria-pressed="' + save + '">' + (save ? "Saved" : "Save") + "</button></span></div></li>";
}
function detailHtml(it) {
  var t = tally(it.pid), mv = myVote(it.pid), save = !!S.saved[it.pid];
  var loc = esc(it.area) + ((it.ver === 1 && it.addr) ? " · " + esc(it.addr) : "");
  return '<button class="closer btn" type="button" data-act="close" aria-label="Close details">' + ic("x") + "</button>" +
    '<div class="head">' + dotHtml(it, "bigdot") + '<div style="min-width:0"><h2 class="name">' + esc(it.name) + '</h2><div class="loc code">' + ic("pin") + loc + "</div></div></div>" +
    '<div class="tags">' + tagsHtml(it) + "</div>" +
    '<div class="says"><span class="smile">' + ic("smile") + '</span><span class="code">' + saysLabel(it) + "</span></div>" +
    '<p class="say">' + esc(it.why) + '</p><hr class="dash">' + gsHtml(it) + progHtml(it, t) +
    '<div class="stat">' + statHtml(t, mv) + "</div>" +
    '<div class="actions">' + voteBtns(it, t, mv, true) +
    '<a class="btn main" target="_blank" rel="noopener" href="' + esc(gmUrl(it)) + '">' + ic("pin") + 'Maps ↗</a>' +
    '<a class="btn cyan" target="_blank" rel="noopener" href="' + esc(gmDir(it)) + '">' + ic("route") + 'Route ↗</a>' +
    '<button class="btn sqb" type="button" data-act="save" aria-pressed="' + save + '" aria-label="' + (save ? "Remove from saved" : "Save this place") + '">' + ic("mark") + "</button>" +
    '<button class="btn sqb" type="button" data-act="share" aria-label="Share this place">' + ic("share") + "</button></div>" +
    (websiteUrl(it) ? '<p class="note"><a href="' + esc(websiteUrl(it)) + '" target="_blank" rel="noopener">Venue website · menu & booking ↗</a></p>' : "") +
    '<p class="note">Pin position is approximate. Open Maps for the exact spot, and check hours before you go.</p>';
}

/* ---- renderers ---- */
function renderChips() {
  var items = allItems().filter(baseOk), n = {};
  items.forEach(function (it) { it.cuts.forEach(function (c) { n[c] = (n[c] || 0) + 1; }); });
  $("cuts").innerHTML = CUTS.map(function (c) {
    return '<li><button class="cut" type="button" data-cut="' + c.id + '" style="--cc:' + c.col + '" aria-pressed="' + (S.cut === c.id) + '"><span class="cutdot" style="background:' + c.col + '">' + ic(c.ic) + "</span><span>" + esc(c.label) + "</span></button></li>";
  }).join("");
  var bs = $("cuts").querySelectorAll(".cut"); for (var i = 0; i < bs.length; i++) { var id = bs[i].getAttribute("data-cut"), sm = document.createElement("small"); sm.textContent = n[id] || 0; bs[i].appendChild(sm); }
}
function renderTabs() {
  var ts = document.querySelectorAll("[data-tab]"); for (var i = 0; i < ts.length; i++) ts[i].setAttribute("aria-pressed", String(ts[i].getAttribute("data-tab") === S.tab));
  $("savedN").textContent = Object.keys(S.saved).length;
  var q = allItems().filter(function (it) { return it.kind !== "p"; }).length; $("sugN").textContent = q; $("sugBtn").setAttribute("aria-pressed", String(S.showSug));
}
function renderList() {
  var list = visible(); $("count").textContent = list.length + (list.length === 1 ? " place" : " places") + (S.cut ? " · " + CUT_BY[S.cut].label : "");
  $("clearFilters").hidden = !S.cut && S.tab === "all";
  var msg = S.cut ? "No matching places with these filters. Clear filters to explore more." : S.tab === "saved" ? "Nothing saved yet. Tap Save on a place you like." : S.tab === "new" ? "No recent additions. Check All for the full collection." : "Nothing here.";
  $("list").innerHTML = list.length ? list.map(cardHtml).join("") : '<li class="empty"><span class="h-md">Nothing here yet</span><span>' + msg + '</span><button class="btn pink" type="button" data-act="suggest">Suggest a place</button></li>';
}
function renderDetail() {
  var it = S.sel ? itemByPid(S.sel) : null, d = $("detail");
  if (!it) { d.hidden = true; $("app").classList.remove("has-detail"); d.innerHTML = ""; return; }
  d.innerHTML = detailHtml(it); d.hidden = false; $("app").classList.add("has-detail");
}
function renderPins() {
  var items = visible(), sel = S.sel; PINS = []; pinsEl.innerHTML = "";
  items.forEach(function (it) {
    var p = proj(it.lng, it.lat), c = CUT_BY[it.cuts[0]] || CUTS[0], q = it.kind !== "p", isSel = sel === it.pid;
    var el = document.createElement("div"); el.className = "pin" + (q ? " q" : "") + (isSel ? " sel" : ""); el.style.setProperty("--pc", c.col);
    var glyph = q ? '<text x="19" y="27" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="22" fill="#161713" stroke="none">?</text>' : '<g class="glyph" transform="translate(8.2 8.2) scale(.9)">' + ICONS[c.ic] + "</g>";
    el.innerHTML = '<button type="button" data-pid="' + esc(it.pid) + '" aria-label="' + esc(it.name) + ", " + esc(it.area) + (q ? ", suggestion" : "") + '"><svg viewBox="0 0 38 50" aria-hidden="true"><path class="drop" d="M19 48C19 48 3 31 3 19a16 16 0 0 1 32 0c0 12-16 29-16 29z"/>' + glyph + "</svg></button>" +
      '<span class="plabel" data-pid="' + esc(it.pid) + '">' + esc(it.name) + "</span>" + ((it.kind === "s" && Date.now() - it.addedAt < NEWWIN) ? '<span class="newtag">NEW</span>' : "");
    pinsEl.appendChild(el);
    PINS.push({ it: it, el: el, lab: el.querySelector(".plabel"), X: p[0], Y: p[1], w: Math.min(190, it.name.length * 7.1 + 18), sel: isSel, net: it._t.net });
  });
  framePins();
}
function overlap(a, b) { return a.x1 < b.x2 + 3 && a.x2 > b.x1 - 3 && a.y1 < b.y2 + 3 && a.y2 > b.y1 - 3; }
function uiRects() {
  var mr = mapEl.getBoundingClientRect(), out = [];
  var els = Array.prototype.slice.call(document.querySelectorAll("#topbar > *, #mapctl, #detail, #panel, #opener"));
  els.forEach(function (e) { if (e.hidden) return; var r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; if (e.id === "panel" && e.classList.contains("closed")) return; out.push({ x1: r.left - mr.left, y1: r.top - mr.top, x2: r.right - mr.left, y2: r.bottom - mr.top }); });
  return out;
}
function framePins() {
  if (!PINS.length) return; var W = mapEl.clientWidth, H = mapEl.clientHeight, vis = [], ui = uiRects();
  PINS.forEach(function (P) {
    var s = worldToScreen(P.X, P.Y); P.sx = s[0]; P.sy = s[1]; P.vis = s[0] > -50 && s[0] < W + 50 && s[1] > -10 && s[1] < H + 70;
    P.el.style.display = P.vis ? "" : "none";
    if (P.vis) { P.el.style.transform = "translate(" + s[0].toFixed(1) + "px," + s[1].toFixed(1) + "px)"; P.el.style.zIndex = P.sel ? 5000 : Math.round(s[1]); vis.push(P); }
  });
  var heads = vis.map(function (P) { return { P: P, x1: P.sx - 19, y1: P.sy - 50, x2: P.sx + 19, y2: P.sy }; }), acc = [];
  function clear(r, P, skipUi) {
    if (r.x1 < 4 || r.x2 > W - 4 || r.y1 < 4) return false;
    var i; for (i = 0; i < acc.length; i++) if (overlap(r, acc[i])) return false;
    for (i = 0; i < heads.length; i++) if (heads[i].P !== P && overlap(r, heads[i])) return false;
    if (!skipUi) for (i = 0; i < ui.length; i++) if (overlap(r, ui[i])) return false;
    return true;
  }
  vis.slice().sort(function (a, b) { return (b.sel ? 1e6 : 0) + b.net * 10 - (a.sel ? 1e6 : 0) - a.net * 10 || a.it.order - b.it.order; }).forEach(function (P) {
    var right = { x1: P.sx + 26, y1: P.sy - 42, x2: P.sx + 26 + P.w, y2: P.sy - 20 }, left = { x1: P.sx - 26 - P.w, y1: P.sy - 42, x2: P.sx - 26, y2: P.sy - 20 }, pick = null, flip = false;
    if (clear(right, P)) pick = right; else if (clear(left, P)) { pick = left; flip = true; }
    if (!pick && P.sel) { pick = right; }
    P.lab.classList.toggle("sel", P.sel); P.lab.classList.toggle("hide", !pick); P.lab.classList.toggle("left", flip);
    if (pick) acc.push(pick);
  });
}
function renderAll() { renderChips(); renderTabs(); renderList(); renderPins(); }

/* ---- selection ---- */
function selectPin(pid, fly) {
  var it = itemByPid(pid); if (!it) return;
  if (!tabOk(it)) S.tab = "all";
  if (it.kind !== "p" && !S.showSug) S.showSug = true;
  if (S.cut && it.cuts.indexOf(S.cut) < 0) S.cut = null;
  S.sel = pid; renderDetail(); renderAll();
  try { history.replaceState(null, "", "#p=" + encodeURIComponent(pid)); } catch (e) {}
  if (fly !== false) { if (isMobile()) { /* detail covers the sheet area */ } focusOn(it.lng, it.lat, isMobile() ? 3 : 3.2); }
  var card = $("list").querySelector('.card[data-pid="' + pid + '"]'); if (card && !isMobile()) card.scrollIntoView({ block: "nearest" });
}
function closeDetail() {
  S.sel = null; renderDetail(); renderPins(); var c = $("list").querySelector(".card.on"); if (c) c.classList.remove("on");
  if (vectorMap) vectorMap.easeTo({ padding: mapPadding(), duration: mapDuration() });
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
function fitVisible() {
  var items = visible(); if (!items.length) return;
  var la = items.map(function (i) { return i.lat; }), ln = items.map(function (i) { return i.lng; });
  var b = [Math.min.apply(null, ln) - 0.004, Math.min.apply(null, la) - 0.002, Math.max.apply(null, ln) + 0.004, Math.max.apply(null, la) + 0.002];
  if (items.length > 1) flyTo(fitBounds(b)); else flyTo(fitBounds([ln[0] - 0.006, la[0] - 0.003, ln[0] + 0.006, la[0] + 0.003]));
}

/* ---- mobile sheet ---- */
var SHEET_PEEK = 142;
function sheetHeights() { var H = window.innerHeight; return { peek: SHEET_PEEK, half: Math.round(H * 0.52), full: Math.round(H * 0.9) }; }
function setSheet(state, instant) {
  var p = $("panel"); if (!isMobile()) { p.style.height = ""; p.classList.remove("peek"); $("app").style.removeProperty("--sheet-h"); return; }
  var h = sheetHeights()[state]; S.sheet = state; if (instant) p.classList.add("drag");
  p.style.height = h + "px"; p.classList.toggle("peek", state === "peek"); $("app").style.setProperty("--sheet-h", h + "px");
  if (instant) requestAnimationFrame(function () { p.classList.remove("drag"); });
  schedule();
}
