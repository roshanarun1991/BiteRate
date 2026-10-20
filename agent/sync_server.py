#!/usr/bin/env python3
"""
Pull votes and suggestions from the Bite Rate server into the repo (so they live on GitHub too).

  - Writes data/votes_snapshot.json (all tallies; a backup and history).
  - A suggestion with 5 or more net votes (GO minus SKIP) is "checked out": its name is added to
    data/candidates.json, and the review agent then judges it from Google reviews like any other place.

Needs: data/config.json "votes_api" (the Worker URL) and env BITERATE_ADMIN_TOKEN. Does nothing if either is missing.
"""
import json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
THRESHOLD = 5


def load(name, default):
    try:
        with open(os.path.join(DATA, name), encoding="utf8") as f:
            return json.load(f)
    except Exception:
        return default


def save(name, obj):
    with open(os.path.join(DATA, name), "w", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def promote(export, candidates, seen_names):
    """Return the new candidates list (names of suggestions that reached the threshold)."""
    have = {c["name"].lower() for c in candidates} | seen_names
    out = list(candidates)
    for s in export.get("suggestions", []):
        net = int(s.get("go", 0)) - int(s.get("skip", 0))
        if net >= THRESHOLD and s["name"].lower() not in have:
            out.append({"name": s["name"], "from": "suggestion", "net": net})
            have.add(s["name"].lower())
    return out


def main():
    api = (load("config.json", {}).get("votes_api") or "").rstrip("/")
    token = os.environ.get("BITERATE_ADMIN_TOKEN", "")
    if not api or not token:
        print("votes_api or BITERATE_ADMIN_TOKEN missing: skipping server sync.")
        return 0
    req = urllib.request.Request(api + "/export", headers={"Authorization": "Bearer " + token})
    try:
        export = json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
    except Exception as e:
        print("sync failed:", e)
        return 0   # never fail the whole weekly run because the server is down
    save("votes_snapshot.json", {"exported": export.get("exported"), "tallies": export.get("tallies", {})})
    state = load("state.json", {})
    seen = {n.lower() for n in state.get("promoted", [])}
    cands = promote(export, load("candidates.json", []), seen)
    new = [c for c in cands if c.get("from") == "suggestion" and c["name"].lower() not in seen]
    state["promoted"] = sorted({c["name"] for c in cands if c.get("from") == "suggestion"} | set(state.get("promoted", [])))
    save("candidates.json", cands)
    save("state.json", state)
    print("synced: %d tallies, %d newly promoted suggestions" % (len(export.get("tallies", {})), len(new)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
