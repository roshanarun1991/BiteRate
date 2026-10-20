"""Builds the page with a fake votes_api and checks that votes and suggestions go to the server and come back. Restores config afterwards."""
import json, pathlib, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
cfg = ROOT / "data/config.json"
orig = cfg.read_text()
cfg.write_text(json.dumps({"votes_api": "https://api.test"}))
try:
    subprocess.run([sys.executable, str(ROOT / "build.py")], check=True, capture_output=True)
    posts, fails = [], []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))

        def handle(route):
            req = route.request
            hdr = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json"}
            if req.method == "OPTIONS":
                return route.fulfill(status=204, headers=hdr)
            if req.method == "POST":
                body = json.loads(req.post_data)
                posts.append((req.url.split("api.test")[1], body))
                if req.url.endswith("/suggest"):
                    return route.fulfill(headers=hdr, body=json.dumps({"ok": True, "id": "abc123", "s": dict(body["s"], id="abc123", ts=1)}))
                return route.fulfill(headers=hdr, body='{"ok":true}')
            return route.fulfill(headers=hdr, body=json.dumps({"tallies": {"p_pelikan": {"go": 3, "skip": 1}}, "suggestions": []}))

        pg.route("https://api.test/**", handle)
        pg.goto((ROOT / "dist/index.html").as_uri())
        pg.wait_for_timeout(800)
        pg.fill("#q", "pelikan"); pg.keyboard.press("Enter"); pg.wait_for_timeout(800)
        txt = pg.inner_text("#detail")
        ok = "3 SAY GO" in txt.upper() and "1 SKIP" in txt.upper()
        print("PASS" if ok else "FAIL", "server tallies shown:", txt.upper().count("SAY GO"), repr(txt[-60:]))
        if not ok: fails.append("tallies")
        pg.click("#detail .vb.go"); pg.wait_for_timeout(500)
        txt = pg.inner_text("#detail").upper()
        ok = "4 SAY GO" in txt
        print("PASS" if ok else "FAIL", "my vote added on top of server tallies")
        if not ok: fails.append("add")
        ok = any(p[0] == "/vote" and p[1].get("pid") == "p_pelikan" and p[1].get("v") == "go" and len(p[1]["device"]) >= 8 for p in posts)
        print("PASS" if ok else "FAIL", "vote POSTed to server"); 
        if not ok: fails.append("post")
        pg.click("#detail .vb.go"); pg.wait_for_timeout(400)
        ok = any(p[0] == "/vote" and p[1].get("v") is None for p in posts)
        print("PASS" if ok else "FAIL", "un-vote POSTed as null")
        if not ok: fails.append("unvote")
        pg.click("#detail [data-act=close]")
        pg.click("#openSuggest"); pg.fill("#fName", "Server Test Bageri")
        pg.click('#cutPick [data-c="fika"]'); pg.fill("#fWhy", "Cardamom buns baked on site, go before ten on weekends.")
        pg.click("#submitBtn"); pg.wait_for_timeout(800)
        ok = any(p[0] == "/suggest" and p[1]["s"]["name"] == "Server Test Bageri" for p in posts)
        print("PASS" if ok else "FAIL", "suggestion POSTed")
        if not ok: fails.append("suggest")
        ok = (pg.evaluate("document.querySelector('#detail h2') && document.querySelector('#detail h2').textContent") or "").upper().startswith("SERVER TEST")
        print("PASS" if ok else "FAIL", "new suggestion selected on map")
        if not ok: fails.append("select")
        print("errors:", errs)
        if errs: fails.append("errors")
        b.close()
finally:
    cfg.write_text(orig)
    subprocess.run([sys.executable, str(ROOT / "build.py")], capture_output=True)
sys.exit(1 if fails else 0)
