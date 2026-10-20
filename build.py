#!/usr/bin/env python3
"""Assemble src/* + data/*.json into dist/index.html (one self-contained page)."""
import json, pathlib, sys
from urllib.parse import quote

ROOT = pathlib.Path(__file__).parent
SRC, DATA, DIST = ROOT / "src", ROOT / "data", ROOT / "dist"


def read(p):
    return (SRC / p).read_text(encoding="utf8")


def load_json(name, default):
    try:
        return json.loads((DATA / name).read_text(encoding="utf8"))
    except FileNotFoundError:
        return default


def build():
    logo = "data:image/svg+xml," + quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#FFD928"/><text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="34" fill="#161713">BR</text></svg>')
    auto = load_json("places_auto.json", [])
    closed = load_json("closed.json", [])
    data = read("data.js").replace(
        "var AUTO_PLACES = [], CLOSED = []; /*AUTO_DATA*/",
        "var AUTO_PLACES = %s, CLOSED = %s;" % (json.dumps(auto, ensure_ascii=False), json.dumps(closed, ensure_ascii=False)),
    )
    api = (load_json("config.json", {}).get("votes_api") or "").rstrip("/")
    assert not api or api.startswith("https://"), "votes_api must be an https URL"
    data = data.replace('var SRV_API = ""; /*SRV_API*/', "var SRV_API = %s;" % json.dumps(api))
    assert "AUTO_DATA" not in data and "/*SRV_API*/" not in data
    js = "\n".join([data, read("map.js"), read("app1.js"), read("shared.js"), read("app2.js")])
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Bite Rate Stockholm</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Bite Rate: a map of Stockholm's best fika, dates, vegan food and viral spots. Say GO or SKIP.">
<link rel="icon" href="{logo}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Courier+Prime:wght@400;700&display=swap">
<style>
{read("style.css")}
</style></head><body>
{read("body.html").replace("{{LOGO}}", logo)}
<script>(function(){{"use strict";
{js}
}})();</script>
</body></html>
"""
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(html, encoding="utf8")
    (DIST / ".nojekyll").write_text("")
    return DIST / "index.html", len(auto)


if __name__ == "__main__":
    out, n = build()
    print(f"built {out} ({out.stat().st_size // 1024} KB, {n} auto places)")
