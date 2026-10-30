**中文** · [README.md](./README.md)

<p align="center">
  <img src="assets/banner.svg" alt="Forest Focus">
</p>

[![License](https://img.shields.io/github/license/huanweide/forest-focus)](LICENSE)
[![CI](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml/badge.svg)](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml)
[![Stars](https://github.com/huanweide/forest-focus/stargazers)](https://github.com/huanweide/forest-focus/stargazers)
[![PWA](https://img.shields.io/badge/PWA-installable%20%C2%B7%20offline-7C5CBF)](https://huanweide.github.io/forest-focus/)
[![Release](https://img.shields.io/github/v/release/huanweide/forest-focus)](https://github.com/huanweide/forest-focus/releases/latest)

# Azusa's Forest · Forest Focus

> **Not another pomodoro timer — it's a complete "focus → dress-up → nurture" loop.**
> Every focus session plants a tree for Azusa and unlocks a new outfit. It turns dry self-discipline into a visible collection journey.

Use it now: **https://huanweide.github.io/forest-focus/**

[How It Differs](#how-it-differs-from-an-ordinary-pomodoro) · [Features](#features) · [Quick Start](#quick-start) · [How It Works](#how-it-works) · [Development](#development) · [Quality Assurance](#quality-assurance) · [Contributing](#contributing)

---

## Who Should Use It / Who Should NOT

**Good fit if —**

- You want a pomodoro timer that gives **long-term motivation** — collection, achievements, and a companion — not just a checkmark.
- You want a **PWA you can install on your phone and use offline**, with local-first data.
- You're a student or self-learner who likes gamified focus (habits, outfits, streaks).

**Not for you if —**

- You just want a **plain timer** — pomotroid, Marinara, or PomodoroLogger already do that well for free.
- You want **cross-device cloud sync** — data is local-only by design, no account, no server.

---

## How It Differs from an Ordinary Pomodoro

Pomodoro timing itself has no moat: pomotroid, Marinara, and PomodoroLogger are all mature, free implementations — if you just want a timer, use them. This project solves a different thing — **making "sticking with it" itself produce feedback**:

| | Ordinary pomodoro | Azusa's Forest |
|---|---|---|
| What you get when the timer ends | a checkmark | a tree + an outfit-unlock step |
| Long-term motivation | self-discipline alone | 14-level outfit collection route + 17 achievements |
| Cost of interrupting | none felt | wagered coins, habit streak days, a consumed charm |
| Data | mostly single-day stats | habit heatmap / goal progress / dashboard (day·week·month·year) / diary |
| Companionship | none | Azusa's expression feedback, offline chat, coin shop |
| Form | mostly web or client | PWA: install to home screen, offline-capable, all data local |

One sentence: **it turns "I should focus" into "I want to see Azusa's next outfit".**

## Features

| Feature | Description |
|------|------|
| Pomodoro timer | 20 / 25 / 30 / 45 / 60 minute options, purple gradient timer ring |
| Tree planting & outfit collection | each completed focus advances an unlock step; a 14-level collection route |
| Wardrobe gallery | layered art (body / top / bottom / headwear / background), freely mix and save |
| Habit check-in | three difficulty tiers, streak days, health value, monthly heatmap, make-up cards |
| Goal tracking | pomodoro-count progress, manually incrementable |
| Data dashboard | pie chart, streak days, toggle today / this week / this month / this year |
| Achievement system | 17 achievements, with rarity tiers and progress bars |
| Coin economy | focus produces coins; buy items in the shop, or bet to double (win or lose) |
| Focus lock | switching away from the page triggers an overlay; Android can deep-link-launch "Azusa's Focus Lock" soft-lock |
| Diary & sharing | focus diary, generate share text |
| Dark mode | one-click toggle, preference saved locally |
| Azusa chat | lightweight companion chat with Azusa (available in offline mode) |
| PWA | add to home screen, offline-capable, Service Worker cache |

## Azusa Outfit Unlock Route

| Level | Outfit | Focus sessions needed |
|------|------|-------------|
| 0 | Seed | initial |
| 1 | Default outfit | 1 |
| 2 | New Year outfit | 5 |
| 3 | Summer outfit | 12 |
| 4 | Panda Azusa | 20 |
| 5 | Bunny Azusa | 30 |
| 6 | Frog Azusa | 40 |
| 7 | Butterfly Azusa | 55 |
| 8 | Eggplant Azusa | 70 |
| 9 | Spring Azusa | 90 |
| 10 | Chibi Azusa | 110 |
| 11 | Gift Azusa (Live2D) | 130 |
| 12 | Ninja Azusa | 155 |
| 13 | Ultimate Azusa | 180 |

## Quick Start

**Web version**: just open the [app link](https://huanweide.github.io/forest-focus/) in a browser and use it — no install.

**Install to phone (PWA)**:

1. Open the [app link](https://huanweide.github.io/forest-focus/) in a browser
2. iPhone: tap "Share" → "Add to Home Screen"
3. Android: tap the menu → "Add to Home Screen"
4. An Azusa icon appears on the home screen; tap to run full-screen, usable offline

**Run locally**:

```bash
# any static server works, e.g.
python -m http.server 8080
# visit http://localhost:8080
```

## How It Works

```text
Start focus (pick a duration)
      │  timing in progress
      │  if you switch away and "Focus Lock" is on → overlay blocks
      ▼
Focus complete ✔
      │  focus count +1, produce coins
      ▼
Reached outfit-unlock threshold? ── yes ──▶ unlock Azusa's new outfit (wardrobe gallery updates)
      │  no
      ▼
Sync habit check-in / goal progress / achievement progress / data dashboard
      │
      ▼
Local storage persists (survives refresh and offline)
```

## Directory Structure

```
index.html              SPA entry (dev mode, modules loaded in order via <script>)
manifest.json          PWA manifest (name / icons / theme color)
sw.js                  Service Worker (offline cache + LRU eviction)
build.py               build script: inline CSS/JS into dist/index.html
src/css/               styles (variables / base / timer / outfits / stats / chat / effects / desktop)
src/js/                logic modules
  ├─ core.js           core state, storage, event bus
  ├─ timer.js          pomodoro timing
  ├─ habits.js         habit check-in      ├─ goals.js        goal tracking
  ├─ stats.js          data dashboard      ├─ achievements.js achievement system
  ├─ economy.js        coin economy        ├─ betting.js      bet-to-double
  ├─ shop.js           shop                ├─ checkin.js      check-in & make-up
  ├─ dressup.js        outfit unlock & gallery ├─ effects.js   visual effects
  ├─ diary.js          diary               ├─ chat.js         chat with Azusa
  ├─ share.js          share text          └─ pwa.js         PWA registration
src/images/azusa/      Azusa character and outfit assets
scripts/audit.mjs      source static audit (see "Quality Assurance")
tests/                 Node unit tests + Playwright end-to-end scripts
android/ build-apk.js  Android TWA packaging (APK published to Release, not committed)
focus-lock/             Android "Azusa's Focus Lock" and deep-link protocol
PROCESS/                iteration process log
```

## Development

```bash
npm run audit     # source static audit
npm test          # core-logic unit tests (node:test)
npm run build     # build dist/index.html
npm run verify    # the above three + artifact check, one command
```

`scripts/audit.mjs` depends on no npm packages; `npm run audit` works out of the box.

## Quality Assurance

This is a build-free SPA of "one HTML + several global scripts": modules are concatenated by `<script>` order and interactions bind via `onclick="fn()"` strings. This structure has three classes of problems that **fail silently instead of erroring**, and all have happened historically — so they're now hardened into automatic checks:

| Historical incident | Symptom | Current defense |
|---|---|---|
| Forgot to bundle `desktop.css` | online desktop layout entirely broken, `.sidebar` and all `@media` gone | build manifest parses `index.html` as the single source of truth; audit compares against disk files |
| Forgot to bundle `share.js` | top-bar share button threw `ReferenceError`, a dead button | audit scans whether every `onclick`-bound function is actually defined |
| Two `updateBetInfo` | two files with the same function name overwriting each other, one permanently dead code | audit checks global function name collisions |
| `AppState` referenced a snapshot | after state was replaced wholesale, external code still held the old array; changes lost on refresh | reference-type state uniformly moved to a `_state` read/write proxy; unit tests cover persistence round-trips |

Every push / PR runs: source audit → unit tests → build → artifact check. Before deploying to GitHub Pages, the artifact is verified again, so a broken version never ships. Additionally, every Monday it auto-checks the live site (desktop styles, share function, icon reachability); failures auto-open an issue.

## Data Privacy

All progress is stored in your browser's localStorage — no upload, no account, no backend. Clearing browser data clears progress too; you can export a backup from "My Data" and migrate.

## Project Merge Note

This repo has merged and superseded [`self-discipline-forest`](https://github.com/huanweide/self-discipline-forest) (that repo is now archived). Future maintenance is unified here.

## Contributing

- Feature suggestions or bug reports go through [Issues](https://github.com/huanweide/forest-focus/issues).
- Before submitting, run `npm run verify` to ensure audit, unit tests, and build all pass.
- When adding a CSS / JS module, remember to add the reference in the `BUILD:` comment block in `index.html` — `build.py` depends on it; forgetting means the module gets left out of the bundle (audit catches it, but running locally first is faster).
- Respect the copyright of Azusa's image and copy; fan use only, non-commercial.

## License

[MIT License](LICENSE)

## Author

Maintained by **huanweide** · [GitHub profile](https://github.com/huanweide)

If this project helped you, a [Star](https://github.com/huanweide/forest-focus) is appreciated.

---

## Portability · Offline PWA

- Pure static site, installable and offline-capable; focus / habit / achievement data is local-first.
- Shares the same nurturing methodology with self-discipline-forest (the Flutter native version); pick whichever platform you like.

← [More open-source tools · huanweide](https://github.com/huanweide)
