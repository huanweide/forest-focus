**中文** · [README.md](./README.md)

<p align="center">
  <img src="assets/banner.svg" alt="Forest Focus">
</p>

<p align="center">
  <a href="#how-is-it-different-from-a-normal-pomodoro">30-second overview</a> · <a href="#core-features">Features</a> · <a href="#quick-start">Quick start</a> · <a href="#how-it-works">Architecture</a> · <a href="#contributing">Contributing</a>
</p>

[![License](https://img.shields.io/github/license/huanweide/forest-focus)](LICENSE)
[![CI](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml/badge.svg)](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml)
[![Stars](https://img.shields.io/github/stars/huanweide/forest-focus)](https://github.com/huanweide/forest-focus/stargazers)
[![PWA](https://img.shields.io/badge/PWA-installable%20%C2%B7%20offline-7C5CBF)](https://huanweide.github.io/forest-focus/)
[![Release](https://img.shields.io/github/v/release/huanweide/forest-focus)](https://github.com/huanweide/forest-focus/releases/latest)

# Forest Focus · Azusa's Forest

> **Not another Pomodoro timer — it's a complete "focus → dress-up → raising" loop.**
> Every focus session plants a tree for Azusa and unlocks a new outfit. It turns dry self-discipline into a visible collection journey.

Use it now: **https://huanweide.github.io/forest-focus/**

## How is it different from a normal Pomodoro

Pomodoro timing itself has no moat: pomotroid, Marinara, PomodoroLogger are all mature and free — if you just want a timer, use them. This project solves a different problem — **making "sticking with it" produce feedback**:

| | Normal Pomodoro | Azusa's Forest |
|---|---|---|
| What you get when time's up | A checkmark | A tree + one outfit-unlock step |
| Long-term motivation | Pure self-discipline | 14-tier outfit collection route + 17 achievements |
| Cost of interrupting | None | Staked coins, habit streak days, consumed lucky charms |
| Data | Mostly single-day stats | Habit heatmap / goal progress / dashboard (day·week·month·year) / diary |
| Sense of company | None | Azusa's表情 feedback, offline chat, coin shop |
| Form factor | Mostly web or client | PWA: installable to home screen, offline, all data local |

In one line: **it turns "I should focus" into "I want to see Azusa's next outfit".**

## Who should use this

- You want a focus timer that keeps you coming back via collection / habit mechanics rather than willpower alone.
- You want a PWA you can install on your phone's home screen and use offline, with all progress on your device.

## Who should NOT use this

- You want a bare-minimum silent timer with no gamification — this is deliberately feature-rich.
- You need cross-device cloud sync — all data is local-only by design.

## Core features

| Feature | Description |
|---------|-------------|
| Pomodoro timer | 20 / 25 / 30 / 45 / 60 minute tiers, purple gradient ring |
| Tree planting & outfit collection | Each completed focus advances unlock progress; 14-tier collection route |
| Wardrobe gallery | Layered illustration (body / top / bottom / headwear / background), free mix and save |
| Habit check-in | Three difficulty tiers, streak days, health value, monthly heatmap, make-up cards |
| Goal tracking | Pomodoro-count progress, manually incrementable |
| Data dashboard | Pie charts, streak days, switch between today / this week / this month / this year |
| Achievement system | 17 achievements with rarity tiers and progress bars |
| Coin economy | Focus yields coins, spend in the shop, or stake for doubles (win some, lose some) |
| Focus lock | Switching away triggers an overlay; Android deep-link launches "Azusa's Focus Lock" soft-lock |
| Diary & sharing | Focus diary, generate share text |
| Dark mode | One-click toggle, preference saved locally |
| Azusa chat | Lightweight in-app conversation companion (works offline) |
| PWA | Add to home screen, offline usable, Service Worker cache |

## Azusa outfit unlock route

| Tier | Outfit | Focus sessions needed |
|------|--------|----------------------|
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

## Quick start

**Web version**: open the [app link](https://huanweide.github.io/forest-focus/) in any browser, no install needed.

**Install to phone (PWA)**:

1. Open the [app link](https://huanweide.github.io/forest-focus/) in a browser.
2. iPhone: tap "Share" → "Add to Home Screen".
3. Android: tap menu → "Add to Home Screen".
4. An Azusa icon appears on the home screen; tap to run fullscreen, usable offline.

**Run locally**:

```bash
# any static server works, e.g.
python -m http.server 8080
# then visit http://localhost:8080
```

## How it works

```
Start focus (pick a duration)
      │  timer running
      │  if you switch away and "focus lock" is on → overlay blocks
      ▼
Focus complete ✔
      │  focus count +1, coins produced
      ▼
Reached outfit-unlock threshold? ── yes ──▶ unlock new Azusa outfit (wardrobe updates)
      │  no
      ▼
Sync habit check-in / goal progress / achievement progress / data dashboard
      │
      ▼
Local-storage persistence (survives refresh and offline)
```

## Directory structure

```
index.html              SPA entry (dev mode, modules loaded by <script> order)
manifest.json           PWA manifest (name / icons / theme color)
sw.js                   Service Worker (offline cache + LRU eviction)
build.py                build script: inlines CSS/JS into dist/index.html
src/css/                styles (variables / base / timer / outfits / stats / chat / effects / desktop)
src/js/                 logic modules
  ├─ core.js            core state, storage, event bus
  ├─ timer.js           Pomodoro timer
  ├─ habits.js          habit check-in      ├─ goals.js        goal tracking
  ├─ stats.js           data dashboard      ├─ achievements.js achievement system
  ├─ economy.js         coin economy        ├─ betting.js      stake-for-double
  ├─ shop.js            shop               ├─ checkin.js      check-in & make-up
  ├─ dressup.js         outfit unlock & gallery ├─ effects.js   visual effects
  ├─ diary.js           diary              ├─ chat.js         chat with Azusa
  ├─ share.js           share text         └─ pwa.js         PWA registration
src/images/azusa/       Azusa character & outfit assets
scripts/audit.mjs       source static audit (see "Quality assurance")
tests/                  Node unit tests + Playwright end-to-end scripts
android/ build-apk.js   Android TWA packaging (APK published to Release, not in repo)
focus-lock/             Android "Azusa's Focus Lock" & deep-link protocol
PROCESS/                iteration process notes
```

## Development

```bash
npm run audit     # source static audit
npm test          # core-logic unit tests (node:test)
npm run build     # build dist/index.html
npm run verify    # all three above + artifact check, one command
```

`scripts/audit.mjs` depends on no npm package; `npm run audit` works out of the box.

## Quality assurance

This is a zero-build SPA of "one HTML + several global scripts": modules are concatenated by `<script>` order and interactions are bound via `onclick="fn()"` strings. This structure has three classes of problems that **fail silently instead of erroring** — and all have happened historically, so they are now hard-coded as automated checks:

| Historical incident | Symptom | Current guard |
|---|---|---|
| Forgot to bundle `desktop.css` | All desktop layout broke online, `.sidebar` and every `@media` gone | Build manifest parses from `index.html` as the single source of truth; audit compares against disk files |
| Forgot to bundle `share.js` | Top-bar share button threw `ReferenceError`, a dead button | Audit scans all `onclick`-bound functions to confirm they are actually defined |
| Two `updateBetInfo` definitions | Two files with the same function name overrode each other; one was dead code never reached | Audit checks global function name collisions |
| `AppState` reference snapshot | After state was replaced wholesale, external code held the old array; changes lost on refresh | Reference-type state unified into a `_state` read/write proxy; unit tests cover persistence round-trip |

Every push / PR runs: source audit → unit tests → build → artifact check. Before deploying to GitHub Pages the artifact is checked again, so a broken version never ships. Additionally, every Monday it auto-checks the live site (desktop styles, share function, icon reachability) and opens an issue on failure.

## Data privacy

All progress is stored in your browser's localStorage — no upload, no account, no backend. Clearing browser data clears progress too; you can export a backup from "My Data" and migrate.

## Project merge note

This repo has merged and replaced [`self-discipline-forest`](https://github.com/huanweide/self-discipline-forest) (that repo is now archived). All future maintenance happens here.

## Contributing

- Feature suggestions or bug reports go through [Issues](https://github.com/huanweide/forest-focus/issues).
- Before submitting, run `npm run verify` to ensure audit, unit tests, and build all pass.
- When adding a CSS / JS module, remember to add its reference in the corresponding `BUILD:` comment block in `index.html` — `build.py` uses that as the source of truth, and forgetting it means the module gets left out of the bundle (the audit will catch it, but running locally first is faster).
- Assets and copy should respect Azusa's character copyright; fan-use only, non-commercial.

## License

[MIT License](LICENSE)

---

Maintained by **huanweide** · [GitHub](https://github.com/huanweide)

If this project helped you, please [give it a Star](https://github.com/huanweide/forest-focus).

## Portability · offline PWA

- Pure static site, installable, offline-capable; focus / habit / achievement data is local-first.
- Shares the same raising methodology with self-discipline-forest (the Flutter native version); pick whichever platform you prefer.

← [More open-source tools · huanweide](https://github.com/huanweide)
