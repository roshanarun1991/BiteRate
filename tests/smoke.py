"""Opens the built page in headless Chromium and exercises the main flows. Needs: pip install playwright && playwright install chromium"""
import pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "dist/index.html").as_uri()
errors, fails = [], []


def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch()
    for label, vp in (("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})):
        pg = b.new_page(viewport=vp)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(URL)
        pg.wait_for_timeout(600)
        check(label + ": title", pg.title() == "Bite Rate Stockholm")
        check(label + ": pins drawn", pg.locator(".pin").count() >= 50)
        check(label + ": 15 cuts", pg.locator(".cut").count() == 15)
        check(label + ": no horizontal overflow", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
        if label == "phone":
            pg.click("#grip")  # open the bottom sheet
            pg.wait_for_timeout(500)
        for cid in ("date", "first", "friends", "vegan", "viral"):
            pg.click(f'.cut[data-cut="{cid}"]')
            n = pg.locator("#list .card").count()
            check(f"{label}: cut {cid} has places", n > 0)
            pg.click(f'.cut[data-cut="{cid}"]')
        pg.close()
    b.close()
check("no page errors", not errors)
print(errors)
sys.exit(1 if fails else 0)
