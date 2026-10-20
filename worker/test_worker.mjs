// Run: node worker/test_worker.mjs   (uses an in-memory KV, no Cloudflare needed)
import w from "./index.js";
const store = new Map();
const KV = {
  async get(k, t) { const v = store.get(k); if (!v) return null; return t === "json" ? JSON.parse(v.value) : v.value; },
  async put(k, value, o = {}) { store.set(k, { value, metadata: o.metadata }); },
  async delete(k) { store.delete(k); },
  async list({ prefix = "" } = {}) { const keys = [...store.entries()].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, v]) => ({ name, metadata: v.metadata })); return { keys, list_complete: true }; },
};
const env = { VOTES: KV, ADMIN_TOKEN: "secret", ALLOWED_ORIGIN: "https://x.github.io" };
const call = async (m, p, body, h = {}) => { const r = await w.fetch(new Request("https://w.test" + p, { method: m, headers: { "Content-Type": "application/json", ...h }, body: body ? JSON.stringify(body) : undefined }), env); return [r.status, await r.json()]; };
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error("FAIL", msg, JSON.stringify(a), "!=", JSON.stringify(b)); process.exit(1); } console.log("ok", msg); };
const A = "device-aaaaaaaa", B = "device-bbbbbbbb";
eq((await call("POST", "/vote", { device: A, pid: "p_pelikan", v: "go" }))[0], 200, "vote go");
eq((await call("POST", "/vote", { device: B, pid: "p_pelikan", v: "skip" }))[0], 200, "vote skip");
eq((await call("GET", "/tallies?device=" + A))[1].tallies, { p_pelikan: { go: 0, skip: 1 } }, "A sees only B's vote");
eq((await call("GET", "/tallies"))[1].tallies, { p_pelikan: { go: 1, skip: 1 } }, "anonymous sees both");
await call("POST", "/vote", { device: A, pid: "p_pelikan", v: "skip" });
eq((await call("GET", "/tallies"))[1].tallies, { p_pelikan: { go: 0, skip: 2 } }, "re-vote replaces, no double count");
await call("POST", "/vote", { device: A, pid: "p_pelikan", v: null });
eq((await call("GET", "/tallies"))[1].tallies, { p_pelikan: { go: 0, skip: 1 } }, "unvote removes");
eq((await call("POST", "/vote", { device: "x", pid: "p_a", v: "go" }))[0], 400, "bad device rejected");
eq((await call("POST", "/vote", { device: A, pid: "../etc", v: "go" }))[0], 400, "bad pid rejected");
eq((await call("POST", "/vote", { device: A, pid: "p_a", v: "maybe" }))[0], 400, "bad value rejected");
eq((await call("POST", "/vote", { device: A, votes: { p_a: "go", p_b: "skip", bad: "go" } }))[1].n, 2, "bulk sync skips invalid pids");
const good = { name: "Café Test", area: "Södermalm", cuts: ["fika", "nonsense"], why: "Cardamom buns with a view over the water.", link: "https://www.google.com/maps/place/x" };
const [st, sr] = await call("POST", "/suggest", { device: A, s: good });
eq([st, sr.s.cuts, sr.s.link !== ""], [200, ["fika"], true], "suggestion accepted and cleaned");
eq((await call("POST", "/suggest", { device: A, s: { ...good, why: "short" } }))[0], 400, "short why rejected");
eq((await call("POST", "/suggest", { device: A, s: { ...good, why: "visit https://spam.example now please ok" } }))[0], 400, "links in text rejected");
eq((await call("POST", "/suggest", { device: A, s: { ...good, link: "https://evil.example/maps" } }))[1].s.link, "", "non-Google link dropped");
eq((await call("GET", "/tallies"))[1].suggestions.length, 2, "suggestions listed");
await call("POST", "/vote", { device: B, pid: "s_" + sr.id, v: "go" });
const ex = await call("GET", "/export", null, { Authorization: "Bearer secret" });
eq([ex[0], ex[1].suggestions.find((s) => s.id === sr.id).go], [200, 1], "export includes net votes");
eq((await call("GET", "/export"))[0], 403, "export needs token");
for (let i = 0; i < 4; i++) await call("POST", "/suggest", { device: A, s: { ...good, name: "Café " + i } });
eq((await call("POST", "/suggest", { device: A, s: good }))[0], 429, "daily suggestion limit per device");
console.log("ALL WORKER TESTS PASS");
