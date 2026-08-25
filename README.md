# 🌟 Stellar Forge — Idle Universe

An addictive idle / incremental web game. Forge stardust, run a research lab, raise cosmic wonders, survive trials, automate the grind — then collapse your entire empire into **Singularity Shards** for permanent power, and when even that plateaus, **Transcend Reality** into Cosmic Essence ✧ and buy perks that outlive every reset. Then do it all again, bigger.

**No build step, no dependencies.** Pure HTML/CSS/JS.

## ▶️ Play it

- **Locally:** just open `index.html` in any modern browser, or run `python3 -m http.server` in this folder and visit `http://localhost:8000`.
- **GitHub Pages:** in the repo settings, enable Pages on this branch (root folder) and the game is live.

## 🎮 How to play

1. **Click the star** to forge stardust (Space bar works too).
2. **Buy generators** — 15 tiers, from Dust Collectors to a Reality Foundry that melts causality into coins. Use the ×1 / ×10 / ×100 / Max switch.
3. **Buy upgrades** as they reveal themselves; **fund lab projects** that finish in real time (even offline) and grant permanent effects.
4. **Catch golden stars** drifting across the sky — a ×7 surge or an instant windfall.
5. **Prestige** at 1B lifetime stardust: collapse into Singularity Shards (+10% production each, forever) and buy permanent shard upgrades.
6. **Raise Cosmic Wonders** in strict sequence — mega-monuments from a Dyson Sphere to the Infinite Engine.
7. **Enter Cosmic Trials** — handicapped runs with permanent rewards for surviving.
8. **Automate everything** once you own Auto-Assembler and Upgrade Daemon.
9. **Claim your Daily Gift** — the 🎁 badge in the top bar glows when today's gift is ready. Claim every day to grow your streak: the 7-day calendar ends in Cosmic Essence (after your first ascension) and repeats that finale forever. Miss a day and the streak restarts.
10. **Unlock the Cosmic Codex** — sealed lore entries reveal themselves as you play; read them all to become a Loremaster.
11. **Transcend Reality** at 1 Qa lifetime stardust: melt the universe into **Cosmic Essence ✧** (`⌊∛(lifetimeAll / 1e15)⌋ − essence ever`) and spend it on the 12-node **Essence Perk Tree** — production, power and meta perks that survive every reset, including auto-ascend.

## ✨ Features

- 15 generator tiers with exponential costs (×1.15) and milestone doublings — from Dust Collectors through Pulsar Arrays, Multiverse Nexi and the Reality Foundry
- 100 upgrades + **Research Lab**: 16 timed projects with permanent effects (production buckets, click power, offline boosts, golden-star lures…)
- **Cosmic Wonders**: 7 sequential one-off mega-builds with game-wide effects
- Full prestige layer with shard upgrades incl. **automation** (Auto-Assembler, Upgrade Daemon, Star Net)
- **Ascension + Essence perk tree**: reset the run (not your legacy) for ✧ Cosmic Essence — 12 perks incl. ×2 production stacks, cheaper generators, milestone extensions, offline overhaul (100% / 72h), golden-star harmony, overclocked automation and silent auto-ascension
- **Daily Gifts & streaks**: a 7-day reward calendar — stardust lumps, production surges, a summoned golden star and an Essence finale; miss a day and the streak restarts
- **Cosmic Trials**: six challenge runs — Pacifist / Inflation / Dark Matter plus One-Man Army ✊ (no generator output), Speedrun ⏱️ (beat the 30-minute clock) and Iron Will II 🛡️ (no upgrade buys) — reset on entry, permanent reward on completion
- **Golden Star event**: random celestial stars grant a ×7 surge or a bank-scaled windfall
- **Audio feel pack**: WebAudio synth cues for every big moment (buys, feats, golden catches, research bells, wonder swells, prestige whooshes…) with a master volume slider
- **Cosmic Codex**: 22 lore entries that unlock as you play, with unread badges on the tab
- 49 achievements, each +2% production
- **Production insights**: live top-5 generator share bars (+ Others), a top-3 all-time-this-run producer board, Best SPS ever and session records in the Stats tab next to the 20-minute sparkline
- **Offline progress** (60% rate / 8h cap → up to 100%+ / 48h+) — lab projects finish while away
- Number notation setting (suffixes / scientific / engineering), production sparkline + a **Production share** breakdown (top-5 generator bars with an Others bucket) in the Stats tab, hotkeys (`Space` click · `M` mute · `Esc` close modal)
- **Accessible & mobile-friendly**: aria-live toasts, dialog semantics, visible focus outlines, reduced-motion support (`prefers-reduced-motion` disables particles/pulses), 56px touch targets and sticky buy-switch on small screens
- Autosave every 20s + save on tab close, export/import save codes, **download your save as a timestamped `.json` file** (or load one back via the file picker), hard reset for the brave
- **Three save slots** with safe switching (your run banks first; occupied targets show a snapshot preview) and legacy-save migration, plus a **📜 What's New** changelog panel that greets each new version once

## 🧪 Tests

A zero-dependency headless test harness lives in `tests/` (Node builtins only):

```bash
node tests/run-tests.js   # runs the full suite; exit code 0 = all green
```

It stubs the DOM/localStorage/canvas/WebAudio, loads `js/game.js` unmodified via `node:vm`, and asserts formatting, cost math, prestige math, golden-star behavior, research lifecycle, wonder gating, trial rules, automation policy, save-healing, codex unlock/read tracking, audio-layer guards, ascension math (essence formula, reset scope, all 12 perks), daily-gift streak/reward rules and the production-share breakdown.

## 🗂 Structure

```
index.html         — page layout & tabs
css/style.css      — all styling (dark cosmic theme)
js/game.js         — the entire game engine and content
tests/dom-stubs.js — fake DOM/localStorage/canvas sandbox factory
tests/run-tests.js — zero-dep test runner (node:vm based, exit-code driven)
tests/unit.test.js — the test suite itself
```

Balance knobs (generator stats, upgrade lists, RESEARCH/WONDERS/CHALLENGES tables, prestige formula `⌊√(lifetime / 1e9)⌋`, milestone table, PERKS + DAILY_GIFTS calendars, ascension formula `⌊∛(lifetimeAll / 1e15)⌋`) all live at the top of `js/game.js`.
