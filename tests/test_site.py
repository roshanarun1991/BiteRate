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


def test_map_theme_and_editorial_metadata():
    script = r"""
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = {console, URL, window:{matchMedia:()=>({matches:true})}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8') + '\n' + fs.readFileSync('src/map.js','utf8'), ctx);
const recent = ctx.PLACES.filter(p=>p.checkedAt==='2026-10-20');
assert.equal(recent.length,12);
for (const p of recent) {
  assert.equal(new URL(p.website).protocol,'https:');
  assert.equal(new URL(p.source).protocol,'https:');
  assert(p.addedAt && p.addr);
}
let dark=false, tilted=true, calls=[], added;
ctx.effectiveTheme=()=>dark?'dark':'light';
ctx.mapEl={classList:{contains:()=>tilted}};
const layers=[
 {id:'background',type:'background'},
 {id:'building',type:'fill',source:'openmaptiles','source-layer':'building'},
 {id:'labels',type:'symbol',layout:{'text-field':'name'}}
];
const map={
 getStyle:()=>({layers}), getLayer:()=>added,
 addLayer:layer=>{added=layer;},setPaintProperty:(...x)=>calls.push(x),
 setLayoutProperty:(...x)=>calls.push(x),setStyle:(...x)=>calls.push(x),
 getZoom:()=>12,easeTo:options=>calls.push(options)
};
ctx.vectorMap=map;
ctx.decorateMap(map);
assert.equal(added.type,'fill-extrusion');
assert.equal(added.source,'openmaptiles');
assert.equal(added.paint['fill-extrusion-color'],'#c7c4b7');
dark=true; added=null; calls=[];
ctx.syncMapTheme();
assert(calls[0][0].endsWith('/dark'));
assert.equal(calls[0][1].diff,false);
ctx.decorateMap(map);
assert.equal(added.paint['fill-extrusion-color'],'#626574');
calls=[]; ctx.syncVectorView(true);
assert.equal(calls.at(-1).pitch,55);
assert.equal(calls.at(-1).zoom,15.5);
tilted=false; calls=[]; ctx.syncVectorView(false);
assert.equal(calls.at(-1).pitch,0);
assert(calls.some(x=>Array.isArray(x)&&x[2]==='none'));
console.log('map day/night rebuild, 3D/2D controls and 12 sourced places OK');
"""
    r = subprocess.run(["node", "-e", script], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
