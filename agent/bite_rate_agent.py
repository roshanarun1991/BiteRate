#!/usr/bin/env python3
"""
Bite Rate review agent (runs weekly in GitHub Actions, or by hand).

What it does, per run:
  1. Takes candidate places (candidates.json, or discovers them with Google Places text search).
  2. Fetches each place's rating count and review texts from the Google Places API (New).
  3. Skips a place unless it has MORE THAN 5 reviews in total.
  4. Asks a local Ollama model to read the review texts and answer in JSON:
     is it good, which cuts fit, and a short why/get/skip written ONLY from what the reviews say.
  5. Appends approved places to data/places_auto.json (at most 5 per run). The site build bakes them in.
  6. With --recheck, looks up every place once and hides permanently closed ones (data/closed.json).
  Everything already judged is remembered in data/state.json.

Local use:
  ollama serve & ollama pull llama3.2:3b     (any instruct model: set OLLAMA_MODEL)
  export GOOGLE_PLACES_API_KEY=...           (Places API (New) enabled)
  python3 agent/bite_rate_agent.py --discover --recheck
"""
import json, os, re, sys, time, urllib.request, urllib.error

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")
MIN_REVIEWS = 5            # approve only when total review count is MORE than this
MIN_POSITIVE = 0.7         # share of read reviews the model must judge positive
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "places_auto.json")      # approved places; build.py bakes these into the site
STATE = os.path.join(DATA, "state.json")          # what was already judged, and when the agent last ran
CLOSED = os.path.join(DATA, "closed.json")        # names of places found permanently closed; hidden by the site
CANDS = os.path.join(DATA, "candidates.json")     # optional hand-fed names: [{"name": "..."}]
MAX_NEW_PER_RUN = int(os.environ.get("MAX_NEW_PER_RUN", "5"))

CUTS = {
    "og": "long-time Stockholm classic", "fika": "coffee and a bun or pastry", "coffee": "quick good coffee",
    "breakfast": "breakfast", "brunch": "weekend brunch", "vegan": "fully vegan or very strong vegan menu",
    "viral": "famous on social media or known for queues", "date": "romantic dinner", "first": "relaxed first date",
    "friends": "catch-up with friends", "aw": "afterwork", "beer": "beer", "fancy": "cocktails",
    "wine": "wine", "sweet": "dessert or sweet treat",
}
AREAS = ["Gamla Stan", "Södermalm", "Norrmalm", "Östermalm", "Vasastan", "Kungsholmen", "Djurgården"]
# One query per week, rotating, so coverage widens over time without a burst of API calls.
DISCOVER_QUERIES = [
    "vegan restaurant Stockholm", "viral cafe Stockholm", "best cinnamon bun Stockholm", "cocktail bar Stockholm",
    "natural wine bar Stockholm", "date night restaurant Stockholm", "specialty coffee Stockholm", "brunch Stockholm",
    "bakery Stockholm", "afterwork bar Stockholm", "dessert cafe Stockholm", "plant based cafe Stockholm",
    "trending restaurant Stockholm", "craft beer bar Stockholm", "first date cafe Stockholm", "pastry Stockholm",
]


def http_json(url, payload=None, headers=None, timeout=120):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def places_search(query):
    body = {"textQuery": query, "locationBias": {"circle": {"center": {"latitude": 59.3293, "longitude": 18.0686}, "radius": 6000.0}}, "maxResultCount": 10}
    h = {"X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress"}
    return http_json("https://places.googleapis.com/v1/places:searchText", body, h).get("places", [])


def place_details(pid):
    h = {"X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,userRatingCount,reviews,googleMapsUri,businessStatus"}
    return http_json("https://places.googleapis.com/v1/places/" + pid, None, h)


def ask_ollama(name, area_hint, reviews):
    texts = "\n".join("- " + r[:400].replace("\n", " ") for r in reviews if r)
    cut_help = "\n".join("  %s: %s" % (k, v) for k, v in CUTS.items())
    prompt = f"""You help a Stockholm restaurant guide. Read ONLY the reviews below for "{name}".
Reviews:
{texts}

Reply with JSON only, with these keys:
  "positive_share": number 0 to 1, share of the reviews that are clearly positive
  "cuts": list of 1 to 3 ids from this list that the reviews support (empty if unsure):
{cut_help}
  "area": one of {AREAS} or "" if you cannot tell
  "why": one plain sentence (max 200 chars) on why people like it, using only facts in the reviews
  "get": what reviewers say to order (max 60 chars, "" if none mentioned)
  "skip": who it is not for, from complaints in the reviews (max 60 chars, "" if none)
Do not invent anything that is not in the reviews."""
    out = http_json(OLLAMA_URL + "/api/chat", {"model": OLLAMA_MODEL, "stream": False, "format": "json", "options": {"temperature": 0.1},
                    "messages": [{"role": "user", "content": prompt}]})
    return json.loads(out["message"]["content"])


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower().replace("å", "a").replace("ä", "a").replace("ö", "o")).strip("-")
    return s[:60]


def evaluate(details, existing_names, llm=ask_ollama):
    """Return (record or None, reason)."""
    name = (details.get("displayName") or {}).get("text", "")
    n = int(details.get("userRatingCount") or 0)
    if not name:
        return None, "no name"
    if details.get("businessStatus") not in (None, "OPERATIONAL"):
        return None, "not operational"
    if name.lower() in existing_names:
        return None, "already on the site"
    if n <= MIN_REVIEWS:
        return None, "only %d reviews" % n
    texts = [((r.get("text") or r.get("originalText") or {}).get("text") or "") for r in details.get("reviews", [])]
    texts = [t for t in texts if t.strip()]
    if len(texts) < 3:
        return None, "too few review texts to read"
    try:
        v = llm(name, "", texts)
    except Exception as e:  # model offline or bad JSON: do not approve
        return None, "model error: %s" % e
    pos = float(v.get("positive_share", 0) or 0)
    cuts = [c for c in v.get("cuts", []) if c in CUTS][:3]
    if pos < MIN_POSITIVE:
        return None, "reviews not positive enough (%.2f)" % pos
    if not cuts:
        return None, "no cut fits"
    loc = details.get("location") or {}
    area = v.get("area") if v.get("area") in AREAS else ""
    return {
        "id": slug(name), "name": name, "area": area or "Norrmalm", "addr": (details.get("formattedAddress") or "").split(",")[0],
        "lat": loc.get("latitude"), "lng": loc.get("longitude"), "cuts": cuts,
        "why": str(v.get("why", ""))[:280], "get": str(v.get("get", ""))[:80], "skip": str(v.get("skip", ""))[:80],
        "link": details.get("googleMapsUri", ""),
        "reviews": {"n": n, "pos": round(pos, 2), "src": "google"},
        "area_guessed": not area,
    }, "approved"


def load(path, default):
    try:
        with open(path, encoding="utf8") as f:
            return json.load(f)
    except Exception:
        return default


def save(path, obj):
    with open(path, "w", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2, sort_keys=False)
        f.write("\n")


def known_names():
    """Every place name already on the site (hand-picked in src/data.js plus auto-added)."""
    names = set()
    try:
        txt = open(os.path.join(ROOT, "src", "data.js"), encoding="utf8").read()
        names |= {m.lower() for m in re.findall(r'name: "([^"]+)"', txt)}
    except OSError:
        pass
    names |= {p["name"].lower() for p in load(OUT, [])}
    return names


def week_number():
    return int(time.time() // (7 * 86400))


def recheck_closures(state):
    """Look up every place on the site once a month; hide permanently closed ones."""
    txt = open(os.path.join(ROOT, "src", "data.js"), encoding="utf8").read()
    names = sorted(set(re.findall(r'\{ id: "[a-z0-9-]+", name: "([^"]+)"', txt)) | {p["name"] for p in load(OUT, [])})
    closed = set(load(CLOSED, []))
    for nm in names:
        try:
            hits = places_search(nm + " Stockholm")
            if not hits:
                continue
            d = place_details(hits[0]["id"])
        except Exception as e:
            print("recheck failed", nm, e); continue
        got = (d.get("displayName") or {}).get("text", "")
        # only trust the match when the names clearly agree
        if got.lower()[:6] != nm.lower()[:6]:
            continue
        if d.get("businessStatus") == "CLOSED_PERMANENTLY" and nm not in closed:
            closed.add(nm); print("CLOSED:", nm)
        time.sleep(0.3)
    save(CLOSED, sorted(closed))
    state["last_recheck"] = time.strftime("%Y-%m-%d")


def main():
    args = sys.argv[1:]
    state = load(STATE, {"seen": {}})
    state["last_run"] = time.strftime("%Y-%m-%d %H:%M:%S")   # always changes: keeps the repo active so scheduled runs are never disabled
    if not API_KEY:
        save(STATE, state)
        print("GOOGLE_PLACES_API_KEY is not set: nothing was checked.")
        return
    existing = known_names()
    ids = []
    for c in load(CANDS, []):
        hits = places_search(c["name"] + " Stockholm")
        if hits:
            ids.append(hits[0]["id"])
    if "--discover" in args:
        q = DISCOVER_QUERIES[week_number() % len(DISCOVER_QUERIES)]
        print("discover:", q)
        ids += [p["id"] for p in places_search(q)]
    approved = load(OUT, [])
    have = {a["id"] for a in approved}
    added = 0
    for pid in dict.fromkeys(ids):
        if added >= MAX_NEW_PER_RUN:
            print("cap reached for this run"); break
        if pid in state["seen"] and state["seen"][pid] != "retry":
            continue
        try:
            d = place_details(pid)
        except urllib.error.URLError as e:
            print("details failed", pid, e); continue
        rec, why = evaluate(d, existing)
        name = (d.get("displayName") or {}).get("text", pid)
        print("%-32s %s" % (name[:32], why))
        # too few reviews: look again on later runs. Every other verdict is final.
        state["seen"][pid] = "retry" if why.startswith("only") else why
        if rec and rec["id"] not in have:
            rec["added"] = time.strftime("%Y-%m-%d")
            approved.append(rec); have.add(rec["id"]); existing.add(name.lower()); added += 1
        time.sleep(0.3)
    if "--recheck" in args:
        recheck_closures(state)
    save(OUT, approved)
    save(STATE, state)
    print("approved total:", len(approved), "(+%d this run)" % added)


if __name__ == "__main__":
    main()
