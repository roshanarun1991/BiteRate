/**
 * Bite Rate shared-votes server (Cloudflare Worker + one KV namespace named VOTES).
 * Anonymous: each browser has a random device id. One vote per device per place. No accounts, no personal data.
 *
 * GET  /tallies?device=ID  -> { tallies: {pid: {go, skip}}, suggestions: [...] }   (other people's votes only)
 * POST /vote     {device, pid, v: "go"|"skip"|null}  or  {device, votes: {pid: v}}
 * POST /suggest  {device, s: {name, area, cuts[], why, get, skip, link, owner}} -> {id, s}
 * GET  /export   Authorization: Bearer ADMIN_TOKEN -> full tallies + suggestions with net votes (used by the weekly Action)
 */
const AREAS = ["Gamla Stan", "Södermalm", "Norrmalm", "Östermalm", "Vasastan", "Kungsholmen", "Djurgården"];
const CUTS = ["og", "fika", "coffee", "breakfast", "brunch", "vegan", "viral", "date", "first", "friends", "aw", "beer", "fancy", "wine", "sweet"];
const RE_DEV = /^[A-Za-z0-9-]{8,64}$/;
const RE_PID = /^[pqsla]_[A-Za-z0-9_-]{1,64}$/;

function cors(env) {
  return { "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Access-Control-Max-Age": "86400" };
}
function json(env, obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(env) } });
}
async function rateLimit(env, key, max, ttl) {
  const k = "r:" + key;
  const n = parseInt((await env.VOTES.get(k)) || "0", 10);
  if (n >= max) return false;
  await env.VOTES.put(k, String(n + 1), { expirationTtl: ttl });
  return true;
}
async function listAll(env, prefix) {
  const out = [];
  let cursor;
  for (let i = 0; i < 30; i++) {
    const r = await env.VOTES.list({ prefix, cursor });
    out.push(...r.keys);
    if (r.list_complete) break;
    cursor = r.cursor;
  }
  return out;
}
async function putVote(env, device, pid, v) {
  if (!RE_PID.test(pid)) return false;
  const key = `v:${pid}:${device}`;
  if (v === "go" || v === "skip") await env.VOTES.put(key, v, { metadata: { v } });
  else if (v === null) await env.VOTES.delete(key);
  else return false;
  return true;
}
async function tallies(env, excludeDevice) {
  const t = {};
  for (const k of await listAll(env, "v:")) {
    const [, pid, dev] = k.name.split(":");
    if (excludeDevice && dev === excludeDevice) continue;
    const v = k.metadata && k.metadata.v;
    if (v !== "go" && v !== "skip") continue;
    (t[pid] || (t[pid] = { go: 0, skip: 0 }))[v]++;
  }
  return t;
}
async function suggestions(env, limit = 200) {
  const keys = (await listAll(env, "s:")).slice(0, limit);       // keys sort newest first (see /suggest)
  const rows = await Promise.all(keys.map((k) => env.VOTES.get(k.name, "json")));
  return rows.filter(Boolean);
}
function clean(s, max) { return String(s == null ? "" : s).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max); }
function validSuggestion(s) {
  const name = clean(s.name, 70), why = clean(s.why, 280);
  if (name.length < 2 || why.length < 20) return null;
  if (/https?:\/\/|www\./i.test(why)) return null;
  if (!AREAS.includes(s.area)) return null;
  const cuts = (Array.isArray(s.cuts) ? s.cuts : []).filter((c) => CUTS.includes(c)).slice(0, 3);
  if (!cuts.length) return null;
  let link = "";
  if (s.link) {
    try {
      const u = new URL(String(s.link));
      const h = u.hostname.replace(/^www\./, "");
      const ok = h === "maps.app.goo.gl" || h === "goo.gl" || ((h === "google.com" || h === "google.se") && u.pathname.startsWith("/maps"));
      if (ok) link = u.toString().slice(0, 300);
    } catch (e) { /* ignore bad link */ }
  }
  return { name, area: s.area, cuts, why, get: clean(s.get, 80), skip: clean(s.skip, 80), link, owner: !!s.owner };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    const url = new URL(req.url);
    const ip = req.headers.get("CF-Connecting-IP") || "x";
    try {
      if (req.method === "GET" && url.pathname === "/tallies") {
        const dev = url.searchParams.get("device") || "";
        return json(env, { tallies: await tallies(env, RE_DEV.test(dev) ? dev : ""), suggestions: await suggestions(env) });
      }
      if (req.method === "GET" && url.pathname === "/export") {
        if (!env.ADMIN_TOKEN || req.headers.get("Authorization") !== "Bearer " + env.ADMIN_TOKEN) return json(env, { error: "forbidden" }, 403);
        const t = await tallies(env, "");
        const sugg = (await suggestions(env, 1000)).map((s) => ({ ...s, ...(t["s_" + s.id] || { go: 0, skip: 0 }) }));
        return json(env, { exported: new Date().toISOString(), tallies: t, suggestions: sugg });
      }
      if (req.method === "POST") {
        const body = await req.json().catch(() => null);
        if (!body || !RE_DEV.test(body.device || "")) return json(env, { error: "bad device" }, 400);
        if (url.pathname === "/vote") {
          if (!(await rateLimit(env, "ipv:" + ip + ":" + new Date().toISOString().slice(0, 13), 400, 3700))) return json(env, { error: "slow down" }, 429);
          if (body.votes && typeof body.votes === "object") {
            let n = 0;
            for (const [pid, v] of Object.entries(body.votes).slice(0, 200)) if (await putVote(env, body.device, pid, v)) n++;
            return json(env, { ok: true, n });
          }
          return (await putVote(env, body.device, String(body.pid || ""), body.v)) ? json(env, { ok: true }) : json(env, { error: "bad vote" }, 400);
        }
        if (url.pathname === "/suggest") {
          const day = new Date().toISOString().slice(0, 10);
          if (!(await rateLimit(env, "sd:" + body.device + ":" + day, 5, 90000)) || !(await rateLimit(env, "sip:" + ip + ":" + day, 20, 90000))) return json(env, { error: "daily limit" }, 429);
          const s = validSuggestion(body.s || {});
          if (!s) return json(env, { error: "invalid suggestion" }, 400);
          const ts = Date.now(), id = ts.toString(36) + Math.random().toString(36).slice(2, 7);
          const rec = { id, ts, ...s };
          await env.VOTES.put(`s:${String(9e12 - ts).padStart(14, "0")}:${id}`, JSON.stringify(rec));
          return json(env, { ok: true, id, s: rec });
        }
      }
      return json(env, { error: "not found" }, 404);
    } catch (e) {
      return json(env, { error: "server error" }, 500);
    }
  },
};
