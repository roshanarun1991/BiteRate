/* ===== SHARED SERVER (optional): votes + suggestions through the Bite Rate Worker. Off when SRV_API is empty. ===== */
var srvDev, srvTimer;
function srvInit() {
  if (!SRV_API) return;
  srvDev = lsGet("kolla.dev", "");
  if (!srvDev) { srvDev = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 12); lsSet("kolla.dev", srvDev); }
  if (!lsGet("kolla.synced", false) && Object.keys(S.myLocal).length) {
    srvPost("/vote", { votes: S.myLocal }).then(function () { lsSet("kolla.synced", true); }).catch(function () {});
  } else lsSet("kolla.synced", true);
  srvPull(); srvTimer = setInterval(srvPull, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) srvPull(); });
}
function srvPost(path, body) {
  var b = {}; for (var k in body) b[k] = body[k]; b.device = srvDev;
  return fetch(SRV_API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
}
function srvVote(pid, v) { if (SRV_API && srvDev) srvPost("/vote", { pid: pid, v: v }).catch(function () {}); }
function srvPull() {
  fetch(SRV_API + "/tallies?device=" + encodeURIComponent(srvDev)).then(function (r) { return r.json(); }).then(function (j) {
    S.remote = j.tallies || {};
    S.remoteSugg = (j.suggestions || []).map(function (x) { return mapSuggObj(x.id, x); }).filter(function (s) { return s.name; });
    renderAll(); renderDetail();
  }).catch(function () {});
}
function srvSuggest(rec, done, fallback) {
  srvPost("/suggest", { s: rec }).then(function (r) {
    S.remoteSugg.unshift(mapSuggObj(r.id, r.s));
    done("Thanks! It's in the queue for everyone. Share the page to get votes.", "s_" + r.id);
  }).catch(fallback);
}
