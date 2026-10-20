/* ===== VOTING, SAVING, SHARING ===== */
var writeChain = Promise.resolve();
function effectiveTheme() { return document.documentElement.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
function syncThemeButton() {
  var dark = effectiveTheme() === "dark", b = $("themeBtn");
  b.setAttribute("aria-pressed", String(dark));
  b.setAttribute("aria-label", dark ? "Night mode on. Switch to day mode" : "Day mode on. Switch to night mode");
  b.title = dark ? "Switch to day mode" : "Switch to night mode";
  b.innerHTML = dark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.6 8.6 0 1 0 20.2 15.1z"/></svg>';
}
function syncMapViewButton() {
  var b = $("viewBtn"), tilted = !!vectorMap && $("map").classList.contains("is-3d");
  b.disabled = !vectorMap;
  b.setAttribute("aria-pressed", String(tilted));
  b.setAttribute("aria-label", !vectorMap ? "3D map unavailable" : tilted ? "Switch to flat 2D map" : "Show 3D buildings");
  b.title = !vectorMap ? "3D buildings need the street map to load" : tilted ? "3D buildings · click for flat view" : "Show 3D buildings";
  b.textContent = tilted ? "2D" : "3D";
}
function refreshOne(pid, focusSel) {
  var it = itemByPid(pid); if (!it) return; it._t = tally(pid);
  var li = $("list").querySelector('.card[data-pid="' + pid + '"]');
  if (li) { li.outerHTML = cardHtml(it); if (focusSel) { var b = $("list").querySelector('.card[data-pid="' + pid + '"] ' + focusSel); if (b) b.focus(); } }
  if (S.sel === pid) { $("detail").innerHTML = detailHtml(it); if (focusSel) { var d = $("detail").querySelector(focusSel); if (d) d.focus(); } }
  renderTabs();
}
function setVote(pid, val) {
  var cur = myVote(pid), next = cur === val ? null : val, store = S.dbWrite ? S.myDb : S.myLocal;
  if (next) store[pid] = next; else delete store[pid];
  refreshOne(pid, '.vb[data-v="' + val + '"]');
  if (S.dbWrite && S.db && S.uid) {
    var snap = {}; for (var k in S.myDb) snap[k] = S.myDb[k];
    writeChain = writeChain.then(function () { return S.db.doc("votes/" + S.uid).set({ v: snap, ts: Date.now() }); }).catch(function () {
      S.myLocal = {}; for (var k2 in S.myDb) S.myLocal[k2] = S.myDb[k2]; S.dbWrite = false; lsSet("kolla.votes", S.myLocal);
      toast("Couldn't save to the shared list. Kept on this device."); renderAll(); updateNote();
    });
  } else lsSet("kolla.votes", S.myLocal);
  srvVote(pid, next);
  if (next) toast(next === "go" ? "Go counted" : "Skip counted");
}
function toggleSave(pid) {
  if (S.saved[pid]) delete S.saved[pid]; else S.saved[pid] = 1; lsSet("kolla.saved", S.saved);
  refreshOne(pid, '[data-save], [data-act="save"]'); toast(S.saved[pid] ? "Saved" : "Removed from saved");
  if (S.tab === "saved") {
    var scroll = $("list").scrollTop;
    if (!S.saved[pid] && S.sel === pid) closeDetail();
    renderAll(); $("list").scrollTop = scroll;
    if (!S.saved[pid]) $("clearFilters").focus();
  }
}
function sharePlace(it) {
  var url = it.local ? gmUrl(it) : placeUrl(it), text = it.name + " · " + it.area + ", Stockholm";
  if (navigator.share) { navigator.share({ title: it.name, text: text, url: url }).catch(function () {}); return; }
  var full = url;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(function () { toast("Link copied"); }, function () { toast("Couldn't copy. Use the Maps button to share."); });
  else toast("Copy this page's address to share this place.");
}

/* ===== MODALS ===== */
var lastFocus = null, openModalId = null;
function openModal(id) {
  lastFocus = document.activeElement; openModalId = id; $(id).hidden = false;
  var f = $(id).querySelector("input, select, textarea, button:not(.closer)"); setTimeout(function () { if (f) f.focus(); }, 30);
}
function closeModal() { if (!openModalId) return; $(openModalId).hidden = true; openModalId = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

/* ===== SEARCH ===== */
function doSearch() {
  var v = norm($("q").value), box = $("results"), inp = $("q");
  if (!v) { box.hidden = true; inp.setAttribute("aria-expanded", "false"); return; }
  var items = allItems().filter(function (it) { return norm(it.name + " " + it.area + " " + it.cuts.map(function (c) { return CUT_BY[c] ? CUT_BY[c].label : ""; }).join(" ")).indexOf(v) >= 0; }).slice(0, 8);
  box.innerHTML = items.length ? items.map(function (it) { return '<button type="button" role="option" data-pid="' + esc(it.pid) + '">' + dotHtml(it, "cutdot") + '<span><span class="nm">' + esc(it.name) + '</span><br><span class="code">' + esc(it.area) + (it.kind !== "p" ? " · suggestion" : "") + "</span></span></button>"; }).join("") : '<div class="none">No match. Try the area, or suggest it.</div>';
  box.hidden = false; inp.setAttribute("aria-expanded", "true");
}
function closeSearch(clear) { if (clear) $("q").value = ""; $("results").hidden = true; $("q").setAttribute("aria-expanded", "false"); }

/* ===== SUGGEST FORM ===== */
var formCuts = [];
function renderCutPick() {
  $("cutPick").innerHTML = CUTS.map(function (c) { return '<button type="button" data-c="' + c.id + '" style="--cc:' + c.col + '" aria-pressed="' + (formCuts.indexOf(c.id) >= 0) + '">' + ic(c.ic).replace("<svg", '<svg width="14" height="14" fill="none" stroke="#161713" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"') + esc(c.label) + "</button>"; }).join("");
}
function findDupe(name) {
  var n = norm(name); if (n.length < 3) return null; var all = allItems();
  for (var i = 0; i < all.length; i++) { var m = norm(all[i].name); if (m === n || (n.length > 5 && (m.indexOf(n) === 0 || n.indexOf(m) === 0))) return all[i]; }
  return null;
}
var dupePid = null;
function onName() {
  var v = $("fName").value.trim(), d = findDupe(v), a = $("findMaps");
  if (v.length > 2) { a.hidden = false; a.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(v + ", Stockholm"); } else a.hidden = true;
  if (d) { dupePid = d.pid; var t = tally(d.pid); $("dupe").hidden = false; $("dupeT").innerHTML = "<b>" + esc(d.name) + "</b> is already here with " + t.go + " go and " + t.skip + " skip. Back it instead of adding a copy."; } else { dupePid = null; $("dupe").hidden = true; }
}
function showErr(id, m) {
  var e = $(id); e.textContent = m || ""; e.hidden = !m;
  var field = $({ eName: "fName", eWhy: "fWhy", eLink: "fLink", eCut: "cutPick" }[id]);
  if (field) { field.setAttribute("aria-invalid", String(!!m)); field.setAttribute("aria-describedby", id); }
}
function validate() {
  var ok = true, name = $("fName").value.trim(), why = $("fWhy").value.trim(), link = $("fLink").value.trim();
  ["eName", "eWhy", "eLink", "eCut"].forEach(function (i) { showErr(i, ""); });
  if (name.length < 2) { showErr("eName", "Add the name of the place."); ok = false; } else if (findDupe(name)) { showErr("eName", "Already on the list. Use the button to back it."); ok = false; }
  if (!formCuts.length) { showErr("eCut", "Pick at least one cut."); ok = false; }
  if (why.length < 20) { showErr("eWhy", "Add a line on what to order or why you love it (20+ characters)."); ok = false; }
  else if (/\?\s*$/.test(why) || /^(what|where|how|which|can|should)\b/i.test(why)) { showErr("eWhy", "That reads as a question. Tell us what you recommend."); ok = false; }
  else if (/(https?:\/\/|www\.|\b\d{7,}\b)/i.test(why)) { showErr("eWhy", "Keep links and phone numbers out of the text. Use the Maps link field."); ok = false; }
  if (link && cleanMapsUrl(link) === null) { showErr("eLink", "Not a Google Maps link. Paste a Share link or leave it empty."); ok = false; }
  return ok;
}
function todayN() { var r = lsGet("kolla.rate", { d: "", n: 0 }), d = new Date().toISOString().slice(0, 10); return r.d === d ? r.n : 0; }
function bumpN() { lsSet("kolla.rate", { d: new Date().toISOString().slice(0, 10), n: todayN() + 1 }); }
function resetForm() { $("form").reset(); formCuts = []; renderCutPick(); $("cnt").textContent = "0/280"; $("dupe").hidden = true; $("findMaps").hidden = true; ["eName", "eWhy", "eLink", "eCut"].forEach(function (i) { showErr(i, ""); }); }
function submitForm(ev) {
  ev.preventDefault();
  if (!validate()) { var f = $("form").querySelector('[aria-invalid="true"]'); if (f) { (f.matches("input,textarea") ? f : f.querySelector("button")).focus(); f.scrollIntoView({ block: "center" }); } return; }
  if (todayN() >= 5) { showErr("eName", "That's 5 for today. Back a few others for now."); return; }
  var rec = { name: $("fName").value.trim(), cuts: formCuts.slice(), area: $("fArea").value, why: $("fWhy").value.trim(), get: $("fGet").value.trim(), skip: $("fSkip").value.trim(), link: cleanMapsUrl($("fLink").value) || "", owner: $("fOwn").checked, ts: Date.now(), by: S.uid || "" };
  var btn = $("submitBtn"); btn.disabled = true; btn.textContent = "Suggesting…";
  function done(msg, pid) { bumpN(); resetForm(); btn.disabled = false; btn.textContent = "Suggest it"; closeModal(); S.showSug = true; S.tab = "all"; S.cut = null; renderAll(); if (pid) selectPin(pid); toast(msg); }
  function local() { var p = areaPos("l" + rec.ts, rec.area), it = { pid: "l_" + rec.ts, kind: "s", name: rec.name, cuts: rec.cuts, area: rec.area, why: rec.why, get: rec.get, skip: rec.skip, link: rec.link, owner: rec.owner, by: rec.by, addedAt: rec.ts, order: 1000, ver: 0, lng: p[0], lat: p[1], local: true };
    S.localSugg.unshift(it); lsSet("kolla.sugg", S.localSugg); done("Added on this device. It's a pink ? pin on the map.", it.pid); }
  if (SRV_API && !S.dbWrite) { srvSuggest(rec, done, local); return; }
  if (S.db && S.dbWrite) S.db.collection("suggestions").add(rec).then(function (ref) { done("Thanks! It's in the queue. Share the page to get votes.", "s_" + ref.id); }).catch(function () { S.dbWrite = false; local(); updateNote(); });
  else local();
}
function updateNote() { $("storeNote").textContent = (SRV_API && !S.dbWrite) ? "Votes and suggestions are shared with everyone who visits Bite Rate. No account needed." : S.dbWrite ? "Suggestions and votes are shared with everyone who opens this page." : "Votes and suggestions are saved on this device only."; }

/* ===== SHARED STORE ===== */
function mapSuggDoc(d) { return mapSuggObj(d.id, d.data() || {}); }
function mapSuggObj(id, x) {
  var area = AREAS.indexOf(x.area) >= 0 ? x.area : "Norrmalm", cuts = (Array.isArray(x.cuts) ? x.cuts : []).filter(function (c) { return CUT_BY[c]; }).slice(0, 3); if (!cuts.length) cuts = ["fika"];
  var pid = "s_" + id, p = areaPos(pid, area);
  return { pid: pid, kind: "s", name: String(x.name || "").slice(0, 70), cuts: cuts, area: area, why: String(x.why || "").slice(0, 280), get: String(x.get || "").slice(0, 80), skip: String(x.skip || "").slice(0, 80), link: cleanMapsUrl(x.link) || "", owner: !!x.owner, by: x.by || "", addedAt: Number(x.ts) || 0, order: 1000, ver: 0, lng: p[0], lat: p[1] };
}
function mapAgentDoc(d) { return mapAgentObj(d.id, d.data() || {}); }
function mapAgentObj(id, x) {
  var num = function (v) { return typeof v === "number" && isFinite(v) ? v : null; };
  var area = AREAS.indexOf(x.area) >= 0 ? x.area : "Norrmalm", cuts = (Array.isArray(x.cuts) ? x.cuts : []).filter(function (c) { return CUT_BY[c]; }).slice(0, 3); if (!cuts.length) return null;
  var pid = "a_" + id, p = areaPos(pid, area), la = num(x.lat), ln = num(x.lng);
  if (la !== null && ln !== null && (la < 59.28 || la > 59.37 || ln < 17.95 || ln > 18.17)) { la = null; ln = null; }
  var r = x.reviews || {};
  return { pid: pid, kind: "p", auto: true, name: String(x.name || "").slice(0, 70), cuts: cuts, area: area, addr: String(x.addr || "").slice(0, 80), line: String(x.why || "").slice(0, 280), why: String(x.why || "").slice(0, 280), get: String(x.get || "").slice(0, 80), skip: String(x.skip || "").slice(0, 80), link: cleanMapsUrl(x.link) || "", revN: num(r.n), revPos: num(r.pos), addedAt: Number(x.ts) || Date.now(), order: 500, ver: x.addr ? 1 : 0, lng: ln !== null ? ln : p[0], lat: la !== null ? la : p[1] };
}
function importAgentFile(file) {
  var msg = $("importMsg"); msg.textContent = "";
  if (!S.db || !S.isOwner) { msg.textContent = "Only the owner can import, and the shared store must be on."; return; }
  var fr = new FileReader();
  fr.onload = function () {
    var arr; try { arr = JSON.parse(fr.result); } catch (e) { msg.textContent = "That file is not valid JSON."; return; }
    if (!Array.isArray(arr)) { msg.textContent = "Expected a list of places."; return; }
    var ok = 0, skip = 0, chain = Promise.resolve();
    arr.slice(0, 50).forEach(function (x) {
      var id = String(x && x.id || "").replace(/[^a-z0-9-]/g, "").slice(0, 60), n = x && x.reviews && x.reviews.n;
      if (!id || !x.name || !Array.isArray(x.cuts) || !(n > 5)) { skip++; return; }
      var doc = { name: String(x.name).slice(0, 70), area: x.area, addr: String(x.addr || "").slice(0, 80), lat: x.lat, lng: x.lng, cuts: x.cuts.slice(0, 3), why: String(x.why || "").slice(0, 280), get: String(x.get || "").slice(0, 80), skip: String(x.skip || "").slice(0, 80), link: x.link || "", reviews: { n: n, pos: x.reviews.pos, src: String(x.reviews.src || "").slice(0, 40) }, ts: Date.now() };
      chain = chain.then(function () { return S.db.doc("places/" + id).set(doc); }).then(function () { ok++; });
    });
    chain.then(function () { msg.textContent = "Imported " + ok + ", skipped " + skip + " (needs more than 5 reviews, a name, an id and a cut)."; }).catch(function () { msg.textContent = "Import stopped part-way. " + ok + " added."; });
  };
  fr.readAsText(file);
}
function initStore() {
  var c = window.claude; if (!c || !c.use) { updateNote(); return; }
  Promise.all([c.use("db"), c.use("user")]).then(function (r) {
    var db = r[0], user = r[1]; if (!db) { updateNote(); return; } S.db = db;
    return (user && user.id ? user.id() : Promise.resolve(null)).then(function (uid) {
      S.uid = uid; return Promise.resolve(user && user.can ? user.can("data.write") : null).then(function (cw) {
        S.dbWrite = !!uid && cw !== false; if (S.dbWrite) { S.myDb = {}; for (var k in S.myLocal) S.myDb[k] = S.myLocal[k]; }
        db.collection("votes").onSnapshot(function (snap) {
          var rem = {}; snap.docs.forEach(function (d) {
            var v = (d.data() || {}).v || {};
            if (S.uid && d.id === S.uid) { if (S.dbWrite) { S.myDb = {}; for (var k3 in v) S.myDb[k3] = v[k3]; } return; }
            Object.keys(v).forEach(function (k4) { var o = rem[k4] || (rem[k4] = { go: 0, skip: 0 }); if (v[k4] === "go") o.go++; else if (v[k4] === "skip") o.skip++; });
          }); S.remote = rem; renderAll(); renderDetail();
        }, function () {});
        db.collection("suggestions").orderBy("ts", "desc").limit(300).onSnapshot(function (snap) { S.remoteSugg = snap.docs.map(mapSuggDoc).filter(function (s) { return s.name; }); renderAll(); renderDetail(); }, function () {});
        db.collection("places").limit(300).onSnapshot(function (snap) { S.agentPlaces = snap.docs.map(mapAgentDoc).filter(function (s) { return s && s.name; }); renderAll(); renderDetail(); }, function () {});
        S.isOwner = !!(user && user.isOwner && user.isOwner()); var ib = $("importBox"); if (ib) ib.hidden = !S.isOwner;
        updateNote();
      });
    });
  }).catch(function () { updateNote(); });
}

/* ===== INIT ===== */
function init() {
  if (CLOSED.length) PLACES = PLACES.filter(function (p) { return CLOSED.indexOf(p.name) < 0; });
  S.autoStatic = AUTO_PLACES.map(function (x) { return mapAgentObj(x.id, x); }).filter(function (s) { return s && s.name; });
  var imf = $("importFile"); if (imf) imf.addEventListener("change", function () { if (imf.files[0]) importAgentFile(imf.files[0]); });
  S.myLocal = lsGet("kolla.votes", {}); S.localSugg = lsGet("kolla.sugg", []); S.saved = lsGet("kolla.saved", {});
  var th = lsGet("kolla.theme", null); if (th === "light" || th === "dark") document.documentElement.setAttribute("data-theme", th);
  syncThemeButton();
  $("fArea").innerHTML = AREAS.map(function (a) { return '<option value="' + esc(a) + '">' + esc(a) + "</option>"; }).join("");
  renderCutPick();
  initMap(framePins);
  syncMapViewButton();
  renderAll(); setSheet("peek", true);
  requestAnimationFrame(function () { setSheet("peek", true); flyTo(defaultView(), true); });
  updateNote();

  /* map controls */
  $("zin").addEventListener("click", function () { zoomAt(mapEl.clientWidth / 2, mapEl.clientHeight / 2, 1.5); });
  $("zout").addEventListener("click", function () { zoomAt(mapEl.clientWidth / 2, mapEl.clientHeight / 2, 1 / 1.5); });
  $("zfit").addEventListener("click", function () { closeDetail(); fitVisible(); });
  $("brand").addEventListener("click", function (e) { e.preventDefault(); closeDetail(); S.cut = null; S.tab = "all"; renderAll(); flyTo(defaultView()); });
  pinsEl.addEventListener("click", function (e) { var b = e.target.closest("[data-pid]"); if (b) selectPin(b.getAttribute("data-pid")); });

  /* theme + panel */
  $("themeBtn").addEventListener("click", function () { var r = document.documentElement, n = effectiveTheme() === "dark" ? "light" : "dark"; r.setAttribute("data-theme", n); lsSet("kolla.theme", n); syncThemeButton(); syncMapTheme(); });
  $("viewBtn").addEventListener("click", function () { if (!vectorMap) return; mapEl.classList.toggle("is-3d"); lsSet("kolla.map3d", mapEl.classList.contains("is-3d")); syncMapViewButton(); syncVectorView(true); });
  var scheme = window.matchMedia("(prefers-color-scheme: dark)");
  if (scheme.addEventListener) scheme.addEventListener("change", function () { if (!lsGet("kolla.theme", null)) { syncThemeButton(); syncMapTheme(); } });
  function togglePanel(open) { var p = $("panel"), closed = !open; p.classList.toggle("closed", closed); $("app").classList.toggle("panel-closed", closed); setTimeout(function () { schedule(); }, 240); }
  $("collapse").addEventListener("click", function () { togglePanel(false); });
  $("opener").addEventListener("click", function () { togglePanel(true); });
  $("filterBtn").addEventListener("click", function () { if (isMobile()) { closeDetail(); setSheet(S.sheet === "peek" ? "half" : "peek"); } else togglePanel($("panel").classList.contains("closed")); });
  $("opener").addEventListener("keydown", function () {});

  /* tabs, cuts, suggestions, sort */
  $("clearFilters").addEventListener("click", function () { S.cut = null; S.tab = "all"; closeDetail(); renderAll(); fitVisible(); });
  document.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { S.tab = b.getAttribute("data-tab"); if (S.sel && !tabOk(itemByPid(S.sel))) closeDetail(); renderAll(); fitVisible(); }); });
  $("cuts").addEventListener("click", function (e) { var b = e.target.closest("[data-cut]"); if (!b) return; var id = b.getAttribute("data-cut"); S.cut = S.cut === id ? null : id; if (S.sel) { var it = itemByPid(S.sel); if (it && S.cut && it.cuts.indexOf(S.cut) < 0) { S.sel = null; renderDetail(); } } renderAll(); fitVisible(); if (isMobile() && S.cut && S.sheet === "full") setSheet("half"); });
  $("sugBtn").addEventListener("click", function () { S.showSug = !S.showSug; if (!S.showSug && S.sel && itemByPid(S.sel).kind !== "p") closeDetail(); renderAll(); });
  $("sort").addEventListener("change", function (e) { S.sort = e.target.value; renderList(); });

  /* list + detail delegation */
  $("list").addEventListener("click", function (e) {
    var li = e.target.closest(".card"), a = e.target.closest("[data-act]"); if (a && a.getAttribute("data-act") === "suggest") { openModal("suggestModal"); return; } if (!li) return;
    var pid = li.getAttribute("data-pid"), v = e.target.closest(".vb"); if (v) { setVote(pid, v.getAttribute("data-v")); return; }
    if (e.target.closest("[data-save]")) { toggleSave(pid); return; } if (e.target.closest("[data-sel]")) selectPin(pid);
  });
  $("detail").addEventListener("click", function (e) {
    var pid = S.sel; if (!pid) return; var v = e.target.closest(".vb"); if (v) { setVote(pid, v.getAttribute("data-v")); return; }
    var a = e.target.closest("[data-act]"); if (!a) return; var act = a.getAttribute("data-act");
    if (act === "close") closeDetail(); else if (act === "save") toggleSave(pid); else if (act === "share") sharePlace(itemByPid(pid));
  });

  /* search */
  var q = $("q"); q.addEventListener("input", doSearch); q.addEventListener("focus", doSearch);
  q.addEventListener("keydown", function (e) {
    var bs = $("results").querySelectorAll("button"); if (e.key === "ArrowDown" && bs.length) { e.preventDefault(); bs[0].focus(); } else if (e.key === "Enter" && bs.length) { e.preventDefault(); var pid = bs[0].getAttribute("data-pid"); closeSearch(true); q.blur(); selectPin(pid); } else if (e.key === "Escape") closeSearch();
  });
  $("results").addEventListener("keydown", function (e) { var bs = Array.prototype.slice.call($("results").querySelectorAll("button")), i = bs.indexOf(document.activeElement); if (e.key === "ArrowDown" && i < bs.length - 1) { e.preventDefault(); bs[i + 1].focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? bs[i - 1] : q).focus(); } else if (e.key === "Escape") { closeSearch(); q.focus(); } });
  $("results").addEventListener("click", function (e) { var b = e.target.closest("[data-pid]"); if (!b) return; closeSearch(true); q.blur(); selectPin(b.getAttribute("data-pid")); });
  document.addEventListener("pointerdown", function (e) { if (!e.target.closest(".search")) closeSearch(); });

  /* modals + form */
  $("openSuggest").addEventListener("click", function () { openModal("suggestModal"); });
  $("openHow").addEventListener("click", function () { openModal("howModal"); });
  document.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", closeModal); });
  ["suggestModal", "howModal"].forEach(function (id) { $(id).addEventListener("pointerdown", function (e) { if (e.target === $(id)) closeModal(); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (openModalId) closeModal(); else if (S.sel) closeDetail(); }
    if (e.key === "Tab" && openModalId) { var f = Array.prototype.slice.call($(openModalId).querySelectorAll("a[href]:not([hidden]), button:not([disabled]), input, select, textarea")).filter(function (n) { return n.offsetParent !== null; }); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  $("cutPick").addEventListener("click", function (e) { var b = e.target.closest("[data-c]"); if (!b) return; var id = b.getAttribute("data-c"), i = formCuts.indexOf(id); if (i >= 0) formCuts.splice(i, 1); else if (formCuts.length < 3) formCuts.push(id); else toast("Pick up to 3 cuts"); renderCutPick(); });
  $("fName").addEventListener("input", onName);
  $("fWhy").addEventListener("input", function (e) { $("cnt").textContent = e.target.value.length + "/280"; });
  $("dupeBack").addEventListener("click", function () { if (!dupePid) return; var pid = dupePid; if (myVote(pid) !== "go") setVote(pid, "go"); resetForm(); closeModal(); selectPin(pid); });
  $("form").addEventListener("submit", submitForm);

  /* mobile sheet drag */
  var panel = $("panel"), drag = null;
  function dStart(e) { if (!isMobile()) return; if (e.target.closest("button") && !e.target.closest("#grip")) return; drag = { y: e.clientY, h: panel.offsetHeight, moved: false, el: e.currentTarget }; panel.classList.add("drag"); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} }
  function dMove(e) { if (!drag) return; var dy = drag.y - e.clientY; if (Math.abs(dy) > 4) drag.moved = true; var H = window.innerHeight, h = Math.max(SHEET_PEEK, Math.min(H * 0.92, drag.h + dy)); panel.style.height = h + "px"; panel.classList.toggle("peek", h < SHEET_PEEK + 50); $("app").style.setProperty("--sheet-h", h + "px"); schedule(); }
  function dEnd(e) {
    if (!drag) return; var moved = drag.moved, el = drag.el; drag = null; panel.classList.remove("drag");
    if (!moved) { if (el.id === "grip") setSheet(S.sheet === "peek" ? "half" : S.sheet === "half" ? "full" : "peek"); else setSheet(S.sheet); return; }
    var hs = sheetHeights(), h = panel.offsetHeight, best = "peek", bd = 1e9; Object.keys(hs).forEach(function (k) { var d = Math.abs(hs[k] - h); if (d < bd) { bd = d; best = k; } }); setSheet(best);
  }
  [$("grip"), document.querySelector(".panel-head")].forEach(function (el) { el.addEventListener("pointerdown", dStart); el.addEventListener("pointermove", dMove); el.addEventListener("pointerup", dEnd); el.addEventListener("pointercancel", dEnd); });
  $("grip").addEventListener("click", function (e) { if (e.detail === 0 && isMobile()) setSheet(S.sheet === "peek" ? "half" : S.sheet === "half" ? "full" : "peek"); });
  window.addEventListener("resize", function () { if (isMobile()) setSheet(S.sheet, true); else setSheet("peek"); });

  /* deep link */
  var m = /#p=([^&]+)/.exec(location.hash || ""); if (m) { try { var pid = decodeURIComponent(m[1]); setTimeout(function () { selectPin(pid); }, 60); } catch (e) {} }
  srvInit();
  initStore();
}
init();
