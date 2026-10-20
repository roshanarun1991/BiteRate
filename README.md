# Bite Rate · Stockholm

A retro map of Stockholm's fika spots, date-night restaurants, vegan places, bars and viral food. Pick a cut (Date Night, First Date, Catch-Up Crew, Vegan Delight, Viral Food and 10 more), say GO or SKIP, open the place in Google Maps.

![Bite Rate](docs/screenshot-desktop.png)

Design follows the BLR CUTS system: flat colour, 0 radius, hard offset shadows, Impact-style headings, Courier labels.

## How it keeps itself running

Everything runs in GitHub Actions (`.github/workflows/site.yml`). Nothing needs your computer.

| When | What happens |
|---|---|
| Every Monday | The **review agent** searches Google Places for one new topic (16 topics rotate), reads each new place's reviews with a small local model (Ollama, `llama3.2:3b`, installed on the runner), and adds places that pass. |
| First week of each month | The agent also looks up every place and hides ones that closed permanently (`data/closed.json`). |
| After each agent run, and on every push | Tests run, the site is built (`build.py`), a headless-browser smoke test opens it on desktop and phone, then it deploys to GitHub Pages. |

**A place is added only if** Google shows more than 5 reviews, the model judges at least 70% of the review texts it reads as positive, the model assigns it to a cut, and it is not already on the site. At most 5 places per run. Google returns up to 5 review texts per place, so the model reads those.

The agent writes `data/state.json` on every run, so the repo always has fresh activity. GitHub pauses scheduled workflows in repos that go quiet for 60 days; this prevents that.

## One-time setup (5 minutes)

1. **Pages:** repo Settings → Pages → Source: **GitHub Actions**.
2. **API key:** create a Google Cloud key with **Places API (New)** enabled. Add a **budget alert and a daily quota cap** in Google Cloud so the bill can never surprise you. Then Settings → Secrets and variables → Actions → New secret `GOOGLE_PLACES_API_KEY`.
3. Actions tab → "Bite Rate - agent, test, deploy" → Run workflow.

Without the key the site still deploys and works; the agent just skips its checks.

## What the live site can and can't do

- Votes (GO/SKIP), saved places and suggestions are stored **on the visitor's device** (localStorage). A static GitHub Pages site has no database, so votes are not shared between people.
- The map is a hand-drawn schematic. Pins are approximate. The Google Maps link is the exact location.
- The hand-picked places in `src/data.js` are an editor's list, not a ranking.

## Layout

```
src/            page source: data.js (cuts + places), map.js, app1.js, app2.js, style.css, body.html, logo.png
data/           places_auto.json (agent output), closed.json, state.json, candidates.json
agent/          bite_rate_agent.py + tests (standard library only)
tests/          test_site.py (data + build checks), smoke.py (browser)
build.py        src + data -> dist/index.html
```

Local: `python3 tests/test_site.py && python3 build.py` then open `dist/index.html`.

Add a place by hand: add a line to `PLACES` in `src/data.js` (the tests check ids, areas, cuts and coordinates), or put `{"name": "Place name"}` in `data/candidates.json` and let the agent judge it.

## Honest limits

- The agent approves places by review text from Google. It can be wrong. Skim `data/places_auto.json` now and then; delete a bad entry and it stays out, because `state.json` remembers it was judged.
- If Google or Ollama changes its API, the agent step fails but the site keeps deploying with the last good data.
- Check `git log` once in a while. If you never look, the site keeps running but slowly drifts.
