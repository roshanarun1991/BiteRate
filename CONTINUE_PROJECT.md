# Bite Rate: continue on a new Windows computer

## Start here

1. Download [Start-BiteRate.bat](https://github.com/roshanarun1991/BiteRate/raw/refs/heads/main/Start-BiteRate.bat). Save it as `.bat`, not `.txt`.
2. Double-click it. Internet access and Windows 10/11 are required. Approve Windows prompts to install missing tools. If WinGet is missing, update **App Installer** in Microsoft Store and rerun.
3. The launcher installs missing Git, Node LTS, GitHub CLI and Python, downloads the project to your Windows **Documents\BiteRate** folder and builds it.
4. Select **1** to finish Cloudflare. Sign in to your own GitHub and Cloudflare accounts in the browser when prompted. Confirm that the Cloudflare account is on **Workers Free**. If asked to register a workers.dev subdomain, choose one in Cloudflare and rerun.
5. Select **2** for checks or **3** for the project folder and these notes.

The BAT contains its own setup code: no companion download is needed. It stops on failed commands and preserves existing edits. Rerun after a cancelled login or interrupted install. It never deletes an existing project folder, resets Git, force-pushes, buys a paid plan, or enables Google billing. If Node older than 22 is already installed, update to Node LTS first. Corporate installation policies may require your administrator.

Cloudflare setup reuses the configured VOTES database, deploys the Worker, creates a random admin token in memory, writes it to the Worker secret and GitHub Actions secret, verifies read-only endpoints, and commits/pushes just the two connection configuration files. Repeating that option renews the private token on both services. If interrupted between the two secret updates, rerun option 1 to repair both sides. Credentials are never placed in source files. OAuth credentials are stored by the official tools on the new computer.

If a push is rejected because GitHub has newer commits, keep your local commit, review `git status`, then integrate the remote changes and push normally. Never use force-push to resolve it. Check the [Actions page](https://github.com/roshanarun1991/BiteRate/actions) for a successful deployment.

## Continue improving with Codex

Install/sign in to the desktop app separately, select the downloaded project folder, and start a chat. See [official desktop app guidance](https://learn.chatgpt.com/docs/app).

Paste this:

> Read CONTINUE_PROJECT.md and README.md. Continue Bite Rate from its actual current files and GitHub state. Help me finish any remaining Cloudflare setup using the free plan, then improve and test the website. Keep the text title BITE RATE STOCKHOLM, real 3D map and working day/night mode. Preserve user edits, never expose secrets, and do not enable paid APIs or services. Explain what you find before making further product changes.

The launcher transfers the project and these handoff notes. It does not transfer this computer's chat history, browser sessions, passwords or application settings, and it does not start an autonomous AI session.

## Current state at handoff (20 October 2026)

- Repository: https://github.com/roshanarun1991/BiteRate (branch `main`).
- Published website: https://roshanarun1991.github.io/BiteRate/
- GitHub Pages already uses GitHub Actions. Site hosting and scheduled jobs do not depend on a personal computer.
- Text-only BITE RATE STOCKHOLM title; 66 editorial places, including 7 Viral Food and 21 Date Night picks.
- MapLibre 5.6.0 with OpenFreeMap provides real streets and 3D building footprints. Day/night styles work; a schematic fallback handles map-loading failure. No Google map key needed.
- Recent fixes cover mobile controls, filters, search, saved places, sharing, forms, deep links, attribution and 3D building layer order.
- Previous website QA: 209 browser checks across five screen sizes, shared-vote mock checks, data/build/agent/Worker tests, and live 3D day/night inspection.
- At handoff, Cloudflare shared voting is **not yet deployed**: `data/config.json` has an empty `votes_api`, and `worker/wrangler.toml` has a placeholder KV ID. The launcher resumes this remaining step.
- `GOOGLE_PLACES_API_KEY` remains unset to honor the free-only requirement. Automatic Google discovery skips without it. A Google billing account is not needed for maps or manually curated locations.
- Add new places in `src/data.js` with a unique ID, approximate coordinates, categories, source/website and checked date; commit and GitHub deploys them.
- Weekly GitHub job runs Monday 05:17 UTC. With Cloudflare configured it can save vote/suggestion snapshots; Google discovery still needs its optional API key.

## Files and checks

- `src/`: page layout, styles, map, interactions and curated places.
- `data/`: automatic places, candidates, closed places and connection configuration.
- `worker/`: Cloudflare voting/suggestion server and unit tests.
- `agent/`: scheduled discovery/review/snapshot scripts.
- `.github/workflows/site.yml`: hosted tests, scheduled job and Pages deployment.
- `build.py`: creates `dist/index.html`; edit sources, not generated output.

Run the launcher with `--self-test` for offline installer checks (no installs or deployments).
Full website checks are available through menu option 2. They install Playwright and Chromium for local browser QA; production tests run separately in GitHub Actions.

## Practical limits and next improvements

- The free Cloudflare plan has quotas; excessive traffic can make requests fail. Do not upgrade billing automatically.
- Current votes use KV lists and per-vote records. Larger traffic needs aggregation and pagination work to keep requests inside free quotas. Rate limiting is best-effort, not election-grade protection.
- Local-only browser votes/suggestions do not automatically transfer between computers. Once Cloudflare is connected, shared data lives in Cloudflare; credentials stay on their respective services.
- Review venue details periodically; "viral" is an editorial category, not a live social ranking.
- Consider a better editorial submission/review workflow and free discovery sources before enabling any Google billing.
- A fresh-Windows installation and real account sign-in still require the new computer. Local launcher self-tests do not prove every installer, company policy or authentication flow will succeed.

References: [WinGet installation](https://learn.microsoft.com/en-us/windows/package-manager/winget/install), [Cloudflare KV commands](https://developers.cloudflare.com/workers/wrangler/commands/kv/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
