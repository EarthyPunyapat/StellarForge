# 🌟 Stellar Forge — Idle Universe

An addictive idle / incremental web game. Forge stardust, hire a cosmic workforce, unlock upgrades and feats, then collapse your entire empire into **Singularity Shards** for permanent power — and do it all again, bigger.

**No build step, no dependencies.** Pure HTML/CSS/JS.

## ▶️ Play it

- **Locally:** just open `index.html` in any modern browser, or run `python3 -m http.server` in this folder and visit `http://localhost:8000`.
- **GitHub Pages:** in the repo settings, enable Pages on this branch (root folder) and the game is live.

## 🎮 How to play

1. **Click the star** to forge stardust (Space bar works too).
2. **Buy generators** (right panel) — 10 tiers, from Dust Collectors to a tame black hole. Use the ×1 / ×10 / ×100 / Max buy switch.
3. **Buy upgrades** as they reveal themselves — click power, per-generator doublings, global multipliers.
4. **Hit milestones** — every generator doubles its output at 10 / 25 / 50 / 100 / 150 / 200 / 250 / 300 / 400 / 500 owned.
5. **Hunt feats** — 26 achievements, each a permanent **+2% production**.
6. **Prestige** — at 1B lifetime stardust, collapse the forge for Singularity Shards (**+10% production each, forever**) and spend them on permanent shard upgrades: head starts, auto-clicking, cheaper generators, better offline gains and more.

## ✨ Features

- 10 generator tiers with exponential costs (×1.15) and milestone doublings
- 50+ upgrades (click, per-generator, global, click-scales-with-production synergies)
- Full prestige layer with 6 permanent shard upgrades
- 26 achievements that each boost production
- **Offline progress** (60% rate, 8h cap — upgradeable to 100% / 24h)
- Autosave every 20s + save on tab close, with **export / import** save codes
- Animated starfield with shooting stars, click particles, floating numbers, toasts, news ticker, subtle click sounds
- Fully responsive — plays great on phones too
- Progress lives in `localStorage`; a hard-reset option exists for the brave

## 🗂 Structure

```
index.html      — page layout
css/style.css   — all styling (dark cosmic theme)
js/game.js      — the entire game engine and content
```

Balance knobs (generator stats, upgrade lists, prestige formula `⌊√(lifetime / 1e9)⌋`, milestone table) all live at the top of `js/game.js`.
