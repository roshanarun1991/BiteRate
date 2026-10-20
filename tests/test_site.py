"""Fast checks run before every deploy: data is valid, the page builds, the script parses."""
import json, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import build  # noqa: E402

AREAS = ["Gamla Stan", "Södermalm", "Norrmalm", "Östermalm", "Vasastan", "Kungsholmen", "Djurgården"]


def cut_ids():
    txt = (ROOT / "src/data.js").read_text(encoding="utf8")
    return set(re.findall(r'\{ id: "([a-z]+)",\s+label:', txt))


def test_cuts_present():
    ids = cut_ids()
    assert {"date", "first", "friends", "vegan", "viral", "fika"} <= ids
    assert "lunch" not in ids and "full" not in ids


def test_places_valid():
    txt = (ROOT / "src/data.js").read_text(encoding="utf8")
    block = txt.split("var PLACES = [")[1].split("\n];")[0]
    entries = re.findall(r'\{ id: "([^"]+)", name: "([^"]+)", area: "([^"]+)".*?lat: ([\d.]+), lng: ([\d.]+), cuts: \[([^\]]*)\]', block)
    assert len(entries) >= 50, len(entries)
    ids = [e[0] for e in entries]
    assert len(ids) == len(set(ids)), "duplicate id"
    valid = cut_ids()
    for _id, name, area, lat, lng, cuts in entries:
        assert area in AREAS, (name, area)
        assert 59.28 < float(lat) < 59.37 and 17.95 < float(lng) < 18.17, name
        cs = re.findall(r'"([a-z]+)"', cuts)
        assert cs and set(cs) <= valid, (name, cs)


def test_auto_places_valid():
    auto = json.loads((ROOT / "data/places_auto.json").read_text(encoding="utf8"))
    valid = cut_ids()
    seen = set()
    for p in auto:
        assert p["id"] not in seen
        seen.add(p["id"])
        assert p["name"] and set(p["cuts"]) <= valid and p["cuts"]
        assert p["reviews"]["n"] > 5, p["name"]


def test_build_and_syntax():
    out, _ = build.build()
    html = out.read_text(encoding="utf8")
    assert "Bite Rate" in html and "{{LOGO}}" not in html and "AUTO_DATA" not in html
    js = html.split("<script>")[1].split("</script>")[0]
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf8") as f:
        f.write(js)
    r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
