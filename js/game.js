/* =====================================================================
   STELLAR FORGE — Idle Universe
   A complete idle / incremental game in one file. No dependencies.
   ===================================================================== */
'use strict';

/* =====================  CONTENT DEFINITIONS  ===================== */

const GENERATORS = [
  { id: 'collector',  name: 'Dust Collector',    icon: '🧹', baseCost: 15,      baseProd: 0.1,     flavor: 'Sweeps loose stardust from the void.' },
  { id: 'comet',      name: 'Comet Harvester',   icon: '☄️', baseCost: 100,     baseProd: 1,       flavor: 'Lassos comets and wrings them dry.' },
  { id: 'asteroid',   name: 'Asteroid Miner',    icon: '⛏️', baseCost: 1100,    baseProd: 8,       flavor: 'Cracks space rocks like walnuts.' },
  { id: 'moon',       name: 'Moon Excavator',    icon: '🌙', baseCost: 12000,   baseProd: 47,      flavor: 'Strip-mines moons. The tides complain.' },
  { id: 'planet',     name: 'Planet Cracker',    icon: '🪐', baseCost: 130000,  baseProd: 260,     flavor: 'Opens planets along the seam.' },
  { id: 'siphon',     name: 'Star Siphon',       icon: '⭐', baseCost: 1.4e6,   baseProd: 1400,    flavor: 'Drinks starlight through a very long straw.' },
  { id: 'nebula',     name: 'Nebula Condenser',  icon: '🌫️', baseCost: 2e7,     baseProd: 7800,    flavor: 'Squeezes nebulae into neat little bricks.' },
  { id: 'galaxy',     name: 'Galaxy Loom',       icon: '🌌', baseCost: 3.3e8,   baseProd: 44000,   flavor: 'Weaves spiral arms into pure profit.' },
  { id: 'void',       name: 'Void Engine',       icon: '🕳️', baseCost: 5.1e9,   baseProd: 260000,  flavor: 'Runs on nothing. Produces everything.' },
  { id: 'core',       name: 'Singularity Core',  icon: '💠', baseCost: 7.5e10,  baseProd: 1.6e6,   flavor: 'A tame black hole with a day job.' },
  { id: 'pulsar',     name: 'Pulsar Array',      icon: '📡', baseCost: 1.2e12,  baseProd: 9.5e6,   flavor: 'Turns lighthouse duty into a subscription service.' },
  { id: 'quasar',     name: 'Quasar Tap',        icon: '🔆', baseCost: 2e13,    baseProd: 5.8e7,   flavor: 'Siphons the brightest objects in physics through a very small valve.' },
  { id: 'string',     name: 'Cosmic String Weaver', icon: '🧵', baseCost: 3.4e14, baseProd: 3.6e8, flavor: 'Knits defects in spacetime into artisanal goods.' },
  { id: 'nexus',      name: 'Multiverse Nexus',  icon: '🕸️', baseCost: 6e15,    baseProd: 2.3e9,   flavor: 'Outsources production to universes with cheaper physics.' },
  { id: 'foundry',    name: 'Reality Foundry',   icon: '🔮', baseCost: 1.1e17,  baseProd: 1.5e10,  flavor: 'Melts down causality and casts it into currency.' },
];

const COST_GROWTH = 1.15;
const GEN_MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500]; // each reached => x2 for that generator

// Per-generator upgrades are generated: at 10 / 25 / 50 / 100 / 150 owned, x2 production each.
const GEN_UPGRADE_TIERS = [
  { need: 10,  costMult: 12,     tierName: 'Improved' },
  { need: 25,  costMult: 130,    tierName: 'Automated' },
  { need: 50,  costMult: 1500,   tierName: 'Quantum' },
  { need: 100, costMult: 18000,  tierName: 'Transcendent' },
  { need: 150, costMult: 220000, tierName: 'Ascendant' },
  { need: 250, costMult: 3500000, tierName: 'Transfinite' }, // Wave 5: g_*_5, ×2 like every sibling tier
];

// Hand-written upgrades (click power + global multipliers).
const SPECIAL_UPGRADES = [
  { id: 'click1', name: 'Reinforced Cursor',   desc: 'Clicking is twice as effective.',            cost: 100,   type: 'click', mult: 2, unlock: s => s.clicks >= 15 },
  { id: 'click2', name: 'Stellar Gloves',      desc: 'Clicking is twice as effective.',            cost: 2500,  type: 'click', mult: 2, unlock: s => s.upgrades.click1 },
  { id: 'click3', name: 'Graviton Touch',      desc: 'Clicking is twice as effective.',            cost: 5e4,   type: 'click', mult: 2, unlock: s => s.upgrades.click2 },
  { id: 'click4', name: 'Supernova Palm',      desc: 'Clicking is 3× as effective.',               cost: 1e6,   type: 'click', mult: 3, unlock: s => s.upgrades.click3 },
  { id: 'click5', name: 'Midas Hand',          desc: 'Clicks also gain +1% of your production per second.', cost: 5e7, type: 'clickSps', pct: 0.01, unlock: s => s.upgrades.click4 },
  { id: 'click6', name: 'Cosmic Conductor',    desc: 'Clicks gain a further +4% of production per second.', cost: 5e9, type: 'clickSps', pct: 0.04, unlock: s => s.upgrades.click5 },
  { id: 'glob1',  name: 'Astral Codex',        desc: 'All production ×1.5.',                       cost: 1e5,   type: 'global', mult: 1.5, unlock: s => s.lifetimeAll >= 2e4 },
  { id: 'glob2',  name: 'Dark Matter Lens',    desc: 'All production ×2.',                         cost: 1e8,   type: 'global', mult: 2,   unlock: s => s.upgrades.glob1 && s.lifetimeAll >= 2e7 },
  { id: 'glob3',  name: 'Quantum Chorus',      desc: 'All production ×2.',                         cost: 1e11,  type: 'global', mult: 2,   unlock: s => s.upgrades.glob2 && s.lifetimeAll >= 2e10 },
  { id: 'glob4',  name: 'Event Horizon Hymn',  desc: 'All production ×3.',                         cost: 1e14,  type: 'global', mult: 3,   unlock: s => s.upgrades.glob3 && s.lifetimeAll >= 2e13 },
];

function buildUpgrades() {
  const list = [...SPECIAL_UPGRADES];
  GENERATORS.forEach((g, gi) => {
    GEN_UPGRADE_TIERS.forEach((tier, ti) => {
      list.push({
        id: `g_${g.id}_${ti}`,
        name: `${tier.tierName} ${g.name}s`,
        desc: `${g.name}s are twice as productive.`,
        cost: g.baseCost * tier.costMult,
        type: 'gen', gen: gi, mult: 2,
        unlock: s => s.gens[gi] >= tier.need,
      });
    });
  });
  return list;
}
const UPGRADES = buildUpgrades();
const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

const PRESTIGE_UPGRADES = [
  { id: 'headstart',  name: 'Head Start',      icon: '🚀', desc: 'Begin every rebirth with 10 free Dust Collectors.',           cost: 5,  max: 1 },
  { id: 'quickclick', name: 'Quick Fingers',   icon: '🖐️', desc: 'Click power ×5, forever.',                                    cost: 10, max: 1 },
  { id: 'autoclick',  name: 'Cosmic Fingers',  icon: '🤖', desc: 'The star clicks itself once per second (per level).',         cost: 15, max: 5, costMult: 2 },
  { id: 'bargain',    name: 'Void Bargainer',  icon: '🏷️', desc: 'All generators are 5% cheaper (per level).',                  cost: 20, max: 5, costMult: 2 },
  { id: 'dream',      name: 'Dream Engine',    icon: '😴', desc: 'Offline earnings: 60% → 100%, and the cap rises 8h → 24h.',   cost: 25, max: 1 },
  { id: 'attune',     name: 'Shard Attunement',icon: '💠', desc: 'Each shard grants +15% production instead of +10%.',          cost: 60, max: 1 },
  { id: 'autogen',    name: 'Auto-Assembler',  icon: '🏗️', desc: 'Every 2s: buys the cheapest visible generator (one), keeping ≥10% bank.', cost: 100, max: 1 },
  { id: 'autoupg',    name: 'Upgrade Daemon',  icon: '🧾', desc: 'Every 2s: buys the cheapest affordable upgrade.',             cost: 250, max: 1 },
  { id: 'autonet',    name: 'Star Net',        icon: '🕸️', desc: 'Golden stars appear 20% more often (per level).',             cost: 150, max: 3, costMult: 2 },
];

/* =====================  COSMIC CODEX  ===================== */
// Lore entries unlock as the player explores every system. Composition is
// authoritative: one entry per generator tier + golden catch + each trial +
// first wonder + omega-protocol + first prestige = GENERATORS.length + 7.

const GEN_CODEX_LORE = {
  collector: 'Before the forge there was a broom and a dream. Every empire of light begins with someone sweeping the void for loose change.',
  comet:     'You learned to lasso comets mid-flight and wring them dry. The comets filed complaints. HR is a black hole, so nothing came of it.',
  asteroid:  'Space rocks cracked like walnuts against the anvil of progress. The trick is never asking what is inside them.',
  moon:      'Strip-mined moons now orbit crooked, like wobbly shopping carts. The tides have unionized; negotiations are ongoing.',
  planet:    'Planets open along the seam if you know where to press. Warranty void, obviously. The core makes lovely paperweights.',
  siphon:    'A very long straw dipped directly into starlight. Do not slurp. Sip. The universe can tell the difference.',
  nebula:    'Nebulae squeezed into neat little bricks and stacked on cosmic pallets. Interstellar masonry pays surprisingly well.',
  galaxy:    'Spiral arms woven on a loom older than time. Each thread is a few billion suns, give or take. Do not pull one.',
  void:      'Runs on nothing. Produces everything. Economists hate this one weird engine, physicists refuse to comment.',
  core:      'A tame black hole with a steady day job. It works hard because the alternative is being eaten, and it prefers not.',
  pulsar:    'Lighthouse duty rebranded as a subscription service. The beat never drops, because it never exactly started either.',
  quasar:    'The brightest objects in existence, tapped through a valve rated for slightly less than that. Safety first-ish.',
  string:    'Defects in spacetime knitted into artisanal goods. Each scarf holds a small universe together. Machine-wash cold.',
  nexus:     'Production outsourced to universes with cheaper physics. Their minimum wage is our violation of thermodynamics.',
  foundry:   'Causality melted down and cast into currency at scale. Every coin minted here has technically already happened.',
};

const CODEX = [
  ...GENERATORS.map((g, i) => ({
    id: 'gen-' + g.id,
    icon: g.icon,
    name: g.name,
    lore: GEN_CODEX_LORE[g.id] || g.flavor,
    hint: `Own your first ${g.name}.`,
    unlock: s => s.gens[i] >= 1,
  })),
  { id: 'golden', icon: '⭐', name: 'Golden Star',
    lore: 'They say catching falling stars is impossible. You made a habit of it, and the sky has started sending invoices.',
    hint: 'Catch a golden star.', unlock: s => s.goldenCaught >= 1 },
  { id: 'trial-pacifist', icon: '🧘', name: 'The Pacifist',
    lore: 'An entire run without clicking once. Enlightenment through extreme patience, rewarded with hands of absolute fury.',
    hint: 'Complete the Pacifist trial.', unlock: s => !!s.trialsDone.pacifist },
  { id: 'trial-inflation', icon: '📈', name: 'The Inflation',
    lore: 'Costs grew faster than greed itself. You bought everything anyway, mostly out of spite.',
    hint: 'Complete the Inflation trial.', unlock: s => !!s.trialsDone.inflation },
  { id: 'trial-darkmatter', icon: '🌑', name: 'The Dark Matter',
    lore: 'The universe dimmed to quarter power and called it character building. You survived; the dark filed no objection.',
    hint: 'Complete the Dark Matter trial.', unlock: s => !!s.trialsDone.darkmatter },
  { id: 'wonder', icon: '🏛️', name: 'Monumental',
    lore: 'Your first Cosmic Wonder stands forever, humming with borrowed divinity. Neighbors unimpressed but jealous, as foretold.',
    hint: 'Raise your first wonder.', unlock: s => WONDERS.some(w => s.wonders[w.id]) },
  { id: 'omega', icon: '♾️', name: 'Omega Protocol',
    lore: 'The final research file contained only a mirror and a sticky note: "you are the protocol." Production tripled. So did questions.',
    hint: 'Complete omega-protocol research.', unlock: s => !!(s.research.done && s.research.done['omega-protocol']) },
  { id: 'prestige', icon: '💠', name: 'Reborn',
    lore: 'You collapsed an entire empire into a handful of shards, then started over on purpose. Wisdom, or a very expensive hobby.',
    hint: 'Collapse the forge once.', unlock: s => s.prestigeCount >= 1 },
];

function codexUnlockCheck() {
  let changed = false;
  for (const c of CODEX) {
    if (!state.codex[c.id] && c.unlock(state)) { state.codex[c.id] = true; changed = true; }
  }
  return changed;
}

function unreadCodexCount() {
  return CODEX.reduce((n, c) => n + (state.codex[c.id] && !state.codexRead[c.id] ? 1 : 0), 0);
}

function renderCodexBadge() {
  const el = $('codex-count');
  if (!el) return;
  const n = unreadCodexCount();
  el.textContent = n > 0 ? String(n) : '';
}

function markCodexRead(id) {
  if (!state.codex[id] || state.codexRead[id]) return;
  state.codexRead[id] = true;
  renderCodex();
  saveGame(); // reading progress persists
}

function renderCodex() {
  const list = $('codex-list');
  if (!list) return;
  list.innerHTML = '';
  CODEX.forEach(c => {
    const card = document.createElement('button'); // native button: keyboard-reachable
    const unlocked = !!state.codex[c.id];
    card.className = 'upgrade-card codex-card' + (unlocked ? '' : ' locked-codex');
    card.disabled = !unlocked;
    card.innerHTML = unlocked
      ? `<span class="u-name">${c.icon} ${c.name}${state.codexRead[c.id] ? '' : ' <span class="done">NEW</span>'}</span>` +
        `<span class="u-desc">${c.lore}</span>`
      : `<span class="u-name">🔒 Sealed entry</span><span class="u-desc">${c.hint}</span>`;
    if (unlocked) {
      if (!state.codexRead[c.id]) card.title = 'Click to mark as read.';
      card.addEventListener('click', () => markCodexRead(c.id));
    }
    list.appendChild(card);
  });
  renderCodexBadge();
}

const ACHIEVEMENTS = [
  { id: 'click1',    name: 'First Spark',       desc: 'Click the star.',                          check: s => s.clicks >= 1 },
  { id: 'click100',  name: 'Warm Hands',        desc: 'Click the star 100 times.',                check: s => s.clicks >= 100 },
  { id: 'click1k',   name: 'Carpal Comet',      desc: 'Click the star 1,000 times.',              check: s => s.clicks >= 1000 },
  { id: 'click10k',  name: 'The Clicking',      desc: 'Click the star 10,000 times.',             check: s => s.clicks >= 10000 },
  { id: 'dust1k',    name: 'Pocket Nebula',     desc: 'Earn 1,000 lifetime stardust.',            check: s => s.lifetimeAll >= 1e3 },
  { id: 'dust1m',    name: 'Dust Tycoon',       desc: 'Earn 1 million lifetime stardust.',        check: s => s.lifetimeAll >= 1e6 },
  { id: 'dust1b',    name: 'Gravity Magnate',   desc: 'Earn 1 billion lifetime stardust.',        check: s => s.lifetimeAll >= 1e9 },
  { id: 'dust1t',    name: 'Stellar Baron',     desc: 'Earn 1 trillion lifetime stardust.',       check: s => s.lifetimeAll >= 1e12 },
  { id: 'dust1qa',   name: 'Cosmic Emperor',    desc: 'Earn 1 quadrillion lifetime stardust.',    check: s => s.lifetimeAll >= 1e15 },
  { id: 'sps100',    name: 'Humming Along',     desc: 'Reach 100 stardust per second.',           check: () => derived.sps >= 100 },
  { id: 'sps10k',    name: 'Industrial Void',   desc: 'Reach 10,000 stardust per second.',        check: () => derived.sps >= 1e4 },
  { id: 'sps1m',     name: 'Forge of Worlds',   desc: 'Reach 1 million stardust per second.',     check: () => derived.sps >= 1e6 },
  { id: 'sps1b',     name: 'Engine of Creation',desc: 'Reach 1 billion stardust per second.',     check: () => derived.sps >= 1e9 },
  { id: 'own1',      name: 'Hired Help',        desc: 'Own your first generator.',                check: s => s.gens.some(c => c > 0) },
  { id: 'own10all',  name: 'Full Roster',       desc: 'Own at least 1 of every generator.',       check: s => s.gens.every(c => c > 0) },
  { id: 'own50any',  name: 'Bulk Buyer',        desc: 'Own 50 of a single generator.',            check: s => s.gens.some(c => c >= 50) },
  { id: 'own100any', name: 'Centurion',         desc: 'Own 100 of a single generator.',           check: s => s.gens.some(c => c >= 100) },
  { id: 'own200any', name: 'Monopolist',        desc: 'Own 200 of a single generator.',           check: s => s.gens.some(c => c >= 200) },
  { id: 'gens500',   name: 'Galactic Payroll',  desc: 'Own 500 total generators.',                check: s => s.gens.reduce((a, b) => a + b, 0) >= 500 },
  { id: 'upg10',     name: 'Tinkerer',          desc: 'Buy 10 upgrades.',                         check: s => Object.keys(s.upgrades).length >= 10 },
  { id: 'upg25',     name: 'Engineer of Suns',  desc: 'Buy 25 upgrades.',                         check: s => Object.keys(s.upgrades).length >= 25 },
  { id: 'prest1',    name: 'Rebirth',           desc: 'Collapse the forge once.',                 check: s => s.prestigeCount >= 1 },
  { id: 'prest5',    name: 'Serial Ascender',   desc: 'Collapse the forge 5 times.',              check: s => s.prestigeCount >= 5 },
  { id: 'shard100',  name: 'Shard Hoarder',     desc: 'Earn 100 total Singularity Shards.',       check: s => s.shardsEver >= 100 },
  { id: 'core1',     name: 'Pet Black Hole',    desc: 'Own a Singularity Core.',                  check: s => s.gens[9] >= 1 },
  { id: 'night',     name: 'It Never Sleeps',   desc: 'Collect offline earnings.',                check: s => s.gotOffline === true },
  { id: 'gold5',     name: 'Golden Eye',        desc: 'Catch 5 golden stars.',                    check: s => s.goldenCaught >= 5 },
  { id: 'gold25',    name: 'Gold Rush',         desc: 'Catch 25 golden stars.',                   check: s => s.goldenCaught >= 25 },
  { id: 'gold100',   name: 'The Gold Standard', desc: 'Catch 100 golden stars.',                  check: s => s.goldenCaught >= 100 },
  { id: 'trial-pacifist',   name: 'Inner Peace',     desc: 'Complete the Pacifist trial.',    check: s => !!s.trialsDone.pacifist },
  { id: 'trial-inflation',  name: 'Hyperinflated',   desc: 'Complete the Inflation trial.',   check: s => !!s.trialsDone.inflation },
  { id: 'trial-darkmatter', name: 'Dark Survivor',   desc: 'Complete the Dark Matter trial.', check: s => !!s.trialsDone.darkmatter },
  { id: 'pulsar1',   name: 'Strong Signal',         desc: 'Own a Pulsar Array.',                      check: s => s.gens[10] >= 1 },
  { id: 'quasar1',   name: 'Bright Idea',           desc: 'Own a Quasar Tap.',                        check: s => s.gens[11] >= 1 },
  { id: 'string1',   name: 'String Theory',         desc: 'Own a Cosmic String Weaver.',              check: s => s.gens[12] >= 1 },
  { id: 'nexus1',    name: 'Many Worlds',           desc: 'Own a Multiverse Nexus.',                  check: s => s.gens[13] >= 1 },
  { id: 'foundry1',  name: 'Reality Check',         desc: 'Own a Reality Foundry.',                   check: s => s.gens[14] >= 1 },
  { id: 'gens2000',  name: 'Intergalactic Payroll', desc: 'Own 2,000 total generators.',              check: s => s.gens.reduce((a, b) => a + b, 0) >= 2000 },
  { id: 'lore-master', name: 'Loremaster',          desc: 'Read every entry in the Cosmic Codex.',    check: () => CODEX.every(c => state.codexRead[c.id]) },
  { id: 'daily7',    name: 'Week Devout',           desc: 'Claim daily gifts 7 days in a row.',       check: s => s.dailyStreak >= 7 },
  { id: 'daily28',   name: 'Lunar Cycle',           desc: 'Claim daily gifts 28 days in a row.',      check: s => s.dailyStreak >= 28 },
  { id: 'trial-one-army', name: 'Self-Made',        desc: 'Complete the One-Man Army trial.',         check: s => !!s.trialsDone['one-army'] },
  { id: 'trial-speedrun', name: 'Against The Clock',desc: 'Complete the Speedrun trial.',             check: s => !!s.trialsDone.speedrun },
  { id: 'trial-iron',     name: 'Unbreakable',      desc: 'Complete the Iron Will II trial.',         check: s => !!s.trialsDone.iron },
  { id: 'research20', name: 'Doctorate of Stardust', desc: 'Finish 20 lab projects.',                 check: s => s.research && Object.keys(s.research.done || {}).length >= 20 },
  { id: 'wonder7',    name: 'Grand Architect',      desc: 'Build every Cosmic Wonder.',               check: s => WONDERS.every(w => s.wonders && s.wonders[w.id]) },
  { id: 'asc10',      name: 'Serial Transcender',   desc: 'Transcend 10 times.',                      check: s => s.ascensionCount >= 10 },
  { id: 'sps1t',      name: 'Engine of Everything', desc: 'Reach 1 trillion stardust per second.',    check: () => derived.sps >= 1e12 },
  // Wave 5 8th feat — the id proposed in the work-log for arbitration ("Hexathlon")
  { id: 'trials6',    name: 'Hexathlon',        desc: 'Complete all six Cosmic Trials.',              check: s => CHALLENGES.every(c => s.trialsDone && s.trialsDone[c.id]) },
  // Wave 6: star-chart feats
  { id: 'charts5',    name: 'Sky Reader',       desc: 'Complete 5 Star Charts.',                      check: s => s.chartsCaught >= 5 },
  { id: 'charts25',   name: 'Constellation Cartographer', desc: 'Complete 25 Star Charts.',           check: s => s.chartsCaught >= 25 },
  { id: 'charts100',  name: 'Master of Heavens', desc: 'Complete 100 Star Charts.',                   check: s => s.chartsCaught >= 100 },
  { id: 'charts-perfect', name: 'Flawless Sky',  desc: 'Perfectly trace a Star Chart (half the window to spare).', check: s => s.perfectCharts >= 1 },
];

const NEWS = [
  'Local star reports feeling "used". More at 11.',
  'Astronomers baffled as another moon goes missing.',
  'Stardust prices hit all-time high; brokers weep with joy.',
  'Comet union threatens strike over harvesting conditions.',
  'Scientists confirm: clicking DOES make it go faster.',
  '"The void called," says Void Engine operator. "It wants a raise."',
  'Galaxy Loom recalls 40,000 spiral arms over stitching defect.',
  'Nearby civilization files noise complaint against your forge.',
  'Singularity Core seen moonlighting as a paperweight.',
  'Dust Collectors demand tiny brooms. Management approves.',
  'Weather forecast: 100% chance of stardust.',
  'Economists warn stardust economy "cannot possibly be real".',
  'Planet Crackers voted "Loudest Workplace" 3rd year running.',
  'Rumor: collapsing your forge makes you stronger. Sounds fake.',
  'Astrologer horrified to discover the stars are, in fact, yours.',
  'Breaking: tiny gold star seen fleeing the scene of a heist.',
  'Golden star sightings up 700%. Scientists call it "probably your fault".',
  'Missing: one golden star. Reward: 15% of everything in your bank.',
  'Tabloids confirm golden stars are just regular stars with confidence.',
];

const SAVE_KEY_LEGACY = 'stellarForgeSave_v1'; // pre-slot saves; seeded into slot 1 once, then retired
// Wave 5: three save slots — state.slot picks the active one
function saveKey(slot) { return 'stellarForgeSave_v1_s' + (slot || 1); }
const SAVE_VERSION = 1;

/* =====================  GOLDEN STAR EVENT  ===================== */

const GOLDEN_BUFF_MULT = 7;            // production multiplier while the surge is active
const GOLDEN_BUFF_MS = 25000;          // surge duration
const GOLDEN_BUFF_MS_HARMONY = 40000;  // surge duration with the star-harmony perk
const GOLDEN_BUFF_CHANCE = 0.5;        // chance a caught star triggers the surge (else a stardust lump)
const GOLDEN_LUMP_PCT = 0.15;          // lump: fraction of current bank…
const GOLDEN_LUMP_CAP_SECS = 900;      // …capped at this many seconds of current production…
const GOLDEN_LUMP_BASE = 13;           // …plus a flat cosmic tip
const GOLDEN_SPAWN_MIN_MS = 60000;     // regular spawn cadence
const GOLDEN_SPAWN_MAX_MS = 180000;
const GOLDEN_FIRST_SPAWN_MIN_MS = 20000; // first spawn of a session comes sooner
const GOLDEN_FIRST_SPAWN_MAX_MS = 40000;
const GOLDEN_FLIGHT_MS = 8000;         // time the golden star takes to drift across the sky
const GOLDEN_RADIUS = 13;              // drawn radius on the canvas
const GOLDEN_HIT_FUDGE = 12;           // extra clickable forgiveness in px

/* ---------- Star Charts event (Wave 6) ---------- */
const CHART_SPAWN_MIN_MS = 180000;     // constellation cadence floor
const CHART_SPAWN_MAX_MS = 360000;     // …and ceiling
const CHART_WINDOW_MS = 12000;         // time to click every node in order
const CHART_HIT_RADIUS = 18;           // pointerdown hit-test radius per node
const CHART_VIEWPORT_SPAN = 0.65;      // nodes live in the central 65% of the sky
const CHART_MIN_NODES = 4;
const CHART_MAX_NODES = 6;

// Deliberately OUTSIDE `state`: buffs are session-only and must never persist
// through save/load/reload. Shape while active: { until:<epoch ms>, mult }
let goldenBuff = null;

// Session-only chartState module binding (Wave 6): an in-flight constellation.
// NEVER saved — a reload simply dissolves any unfinished chart.
// Shape while active: { nodes:[{x,y}], next:0, born:<perf ms>, deadline:<perf ms>,
//                       fading:false, fadeStart }
let chartState = null;


/* =====================  RESEARCH LAB  ===================== */

// Each project: one-off stardust cost, real-time duration, permanent effect once done.
const RESEARCH = [
  { id: 'spectral-sorting',  icon: '🔭', name: 'Spectral Sorting',     desc: 'Dust Collectors, Comet Harvesters & Asteroid Miners ×2.', cost: 5e4,  timeSec: 30,   tag: 'genBucket', from: 0, to: 2, mult: 2 },
  { id: 'plasma-containment',icon: '🧪', name: 'Plasma Containment',   desc: 'Moon Excavators through Star Siphons ×2.',                cost: 5e5,  timeSec: 90,   tag: 'genBucket', from: 3, to: 5, mult: 2 },
  { id: 'horizon-lenses',    icon: '🔎', name: 'Horizon Lenses',       desc: 'Nebula Condensers through Singularity Cores ×2.',      cost: 5e6,  timeSec: 180,  tag: 'genBucket', from: 6, to: 9, mult: 2 },
  { id: 'neural-uplink',     icon: '🧠', name: 'Neural Uplink',        desc: 'Clicking is 3× as effective.',                            cost: 2e5,  timeSec: 120,  tag: 'clickMult', mult: 3 },
  { id: 'chrono-dampeners',  icon: '⏳', name: 'Chrono Dampeners',     desc: 'Offline earnings: cap +4h and efficiency +5%.',           cost: 5e7,  timeSec: 300,  tag: 'offline' },
  { id: 'golden-lure',       icon: '🧲', name: 'Golden Lure',          desc: 'Golden stars appear 25% more often.',                     cost: 3e7,  timeSec: 240,  tag: 'goldenFreq', mult: 1.25 },
  { id: 'shard-resonance',   icon: '📡', name: 'Shard Resonance',      desc: 'Each Singularity Shard grants +2% more production.',      cost: 1e9,  timeSec: 480,  tag: 'shardBonus', add: 0.02 },
  { id: 'vacuum-optimizer',  icon: '🌀', name: 'Vacuum Optimizer',     desc: 'All production ×1.5.',                                    cost: 2e8,  timeSec: 360,  tag: 'global', mult: 1.5 },
  { id: 'entropy-reversal',  icon: '♻️', name: 'Entropy Reversal',     desc: 'All production ×2.',                                      cost: 5e9,  timeSec: 600,  tag: 'global', mult: 2 },
  { id: 'stellar-nursery',   icon: '🌱', name: 'Stellar Nursery',      desc: 'All generators are 8% cheaper.',                          cost: 2e10, timeSec: 720,  tag: 'genCost', mult: 0.92 },
  { id: 'quantum-treasury',  icon: '🏦', name: 'Quantum Treasury',     desc: 'Golden star windfalls are twice as large.',               cost: 1e11, timeSec: 900,  tag: 'lump', mult: 2 },
  { id: 'omega-protocol',    icon: 'Ω',  name: 'Omega Protocol',       desc: 'All production ×3.',                                      cost: 1e12, timeSec: 1200, tag: 'global', mult: 3 },
  { id: 'stellar-census',    icon: '🗺️', name: 'Stellar Census',       desc: 'All production ×2.',                                      cost: 5e13, timeSec: 900,  tag: 'global', mult: 2 },
  { id: 'causal-harvest',    icon: '♋', name: 'Causal Harvest',       desc: 'Golden windfalls are twice as large (stacks).',           cost: 2e14, timeSec: 1080, tag: 'lump', mult: 2 },
  { id: 'echo-forge',        icon: '🔁', name: 'Echo Forge',           desc: 'Every generator produces ×2.',                            cost: 1e15, timeSec: 1260, tag: 'genBucket', from: 0, to: 14, mult: 2 },
  { id: 'infinity-loop',     icon: '♾️', name: 'Infinity Loop',        desc: 'Golden stars appear 50% more often (stacks).',            cost: 5e15, timeSec: 1440, tag: 'goldenFreq', mult: 1.5 },
];

function researchDone(id) {
  return !!(state.research && state.research.done && state.research.done[id]);
}

// total seconds a research project takes right now (galactic-university halves it)
function researchDurationSec(id) {
  const def = RESEARCH.find(r => r.id === id);
  if (!def) return 0;
  let t = def.timeSec * (state.wonders && state.wonders['galactic-university'] ? 0.5 : 1);
  if (perkLvl('chrono-focus')) t *= 0.6; // ascension perk stacks AFTER the university halving
  return t;
}

/* =====================  COSMIC WONDERS  ===================== */

// Monumental one-off builds; strictly sequential unlock chain (each needs the previous).
const WONDERS = [
  { id: 'dyson-sphere',         icon: '🌞', name: 'Dyson Sphere',           desc: 'All production ×3.',                        cost: 5e13 },
  { id: 'wormhole-array',       icon: '🕳️', name: 'Wormhole Array',         desc: 'Golden stars appear twice as often.',       cost: 2e14 },
  { id: 'galactic-university',  icon: '🎓', name: 'Galactic University',    desc: 'Research completes in half the time.',      cost: 1e15 },
  { id: 'neutron-forge',        icon: '⚒️', name: 'Neutron Forge',          desc: 'Clicking is 10× as effective.',             cost: 5e15 },
  { id: 'time-vault',           icon: '🗄️', name: 'Time Vault',             desc: 'Offline earnings: 100% rate, 48h cap.',     cost: 2e16 },
  { id: 'multiverse-antenna',   icon: '📶', name: 'Multiverse Antenna',     desc: 'Collapse grants ×2 shards.',                cost: 1e17 },
  { id: 'infinite-engine',      icon: '♾️', name: 'Infinite Engine',        desc: 'All production ×5.',                        cost: 1e18 },
];

function wonderBuilt(id) {
  return !!(state.wonders && state.wonders[id]);
}

/* =====================  COSMIC TRIALS  ===================== */

// Challenge runs: enter voluntarily, run resets on exit/success, rewards are permanent.
const CHALLENGES = [
  { id: 'pacifist',   icon: '✋', name: 'Pacifist',    desc: 'Clicking the star is disabled.',
    goalText: 'Forge 1.00 T stardust this run (generators only).', rewardText: 'Click power ×5, forever.',
    goal: s => s.lifetimeRun >= 1e12, pct: s => Math.min(100, s.lifetimeRun / 1e12 * 100) },
  { id: 'inflation',  icon: '📈', name: 'Inflation',   desc: 'Generator cost growth 1.15 → 1.22.',
    goalText: 'Own 300 total generators.', rewardText: 'All production ×2, forever.',
    goal: s => s.gens.reduce((a, b) => a + b, 0) >= 300, pct: s => Math.min(100, s.gens.reduce((a, b) => a + b, 0) / 300 * 100) },
  { id: 'darkmatter', icon: '🌑', name: 'Dark Matter', desc: 'All production ×0.25 while inside.',
    goalText: 'Forge 10.0 T stardust this run.', rewardText: 'Future shard gains ×1.5, forever.',
    goal: s => s.lifetimeRun >= 1e13, pct: s => Math.min(100, s.lifetimeRun / 1e13 * 100) },
  { id: 'one-army',   icon: '✊', name: 'One-Man Army', desc: 'Generators produce NOTHING — clicks, golden stars and windfalls only.',
    goalText: 'Forge 1.00 B stardust this run by hand.', rewardText: 'Click power ×3, forever.',
    goal: s => s.lifetimeRun >= 1e9, pct: s => Math.min(100, s.lifetimeRun / 1e9 * 100) },
  { id: 'speedrun',   icon: '⏱️', name: 'Speedrun', desc: 'No modifier — but you only have 30 minutes on the clock.',
    goalText: 'Forge 1.00 T stardust within 30 minutes of entering.', rewardText: 'All production ×1.5, forever.',
    goal: s => s.lifetimeRun >= 1e12, pct: s => Math.min(100, s.lifetimeRun / 1e12 * 100) },
  { id: 'iron',       icon: '🛡️', name: 'Iron Will II', desc: 'Upgrade purchases are blocked while inside.',
    goalText: 'Own 200 total generators.', rewardText: 'Normal upgrades cost 25% less, forever.',
    goal: s => s.gens.reduce((a, b) => a + b, 0) >= 200, pct: s => Math.min(100, s.gens.reduce((a, b) => a + b, 0) / 200 * 100) },
];

// permanent −25% on normal-upgrade costs once the Iron Will II reward is banked.
// Single source of truth: used by BOTH cost display AND every purchase check.
function upgradeCostMult() {
  return state.trialsDone && state.trialsDone.iron ? 0.75 : 1;
}
function effUpgradeCost(u) {
  return Math.ceil(u.cost * upgradeCostMult());
}

// generator cost growth in effect right now (trials may inflate it)
function costGrowth() {
  return state.trial === 'inflation' ? 1.22 : COST_GROWTH;
}

// multiplicative scale applied to golden-star spawn intervals (<1 = more frequent)
function goldenSpawnIntervalScale() {
  let s = 1;
  if (perkLvl('star-harmony')) s /= 2;                        // essence perk: ×2 frequency
  if (researchDone('golden-lure')) s /= 1.25;                 // +25% frequency
  if (wonderBuilt('wormhole-array')) s /= 2;                  // ×2 frequency
  if (researchDone('infinity-loop')) s /= 1.5;                // +50% frequency (stacks)
  if (state.prestigeUpgrades.autonet) s *= Math.pow(0.8, state.prestigeUpgrades.autonet); // Star Net −20%/lvl
  return s;
}

// multiplier applied to golden windfall payouts (quantum-treasury, causal-harvest stack ×4)
function goldenLumpMult() {
  let m = 1;
  if (researchDone('quantum-treasury')) m *= 2;
  if (researchDone('causal-harvest')) m *= 2;
  return m;
}

// single source of truth for offline payout math (dream / chrono-dampeners / time-vault stack)
function offlineCapAndRate() {
  if (perkLvl('dream-weaver')) return { capHours: 72, rate: 1.0 }; // ascension perk overrides everything
  let capHours = state.prestigeUpgrades.dream ? 24 : 8;
  let rate = state.prestigeUpgrades.dream ? 1.0 : 0.6;
  if (wonderBuilt('time-vault')) { capHours = Math.max(capHours, 48); rate = 1.0; } // vault stacks over dream
  if (researchDone('chrono-dampeners')) { capHours += 4; rate += 0.05; }
  return { capHours, rate };
}

/* =====================  ASCENSION (Wave 4)  ===================== */

// Cosmic Essence perk tree: 12 nodes, 3 branches, linear within a branch.
const PERKS = [
  // PRODUCTION branch
  { id: 'cosmic-might',       branch: 'production', tier: 0, icon: '💪', name: 'Cosmic Might',        desc: 'All production ×2 per level.',                                  cost: 2,  max: 5, costMult: 3 },
  { id: 'void-discount',      branch: 'production', tier: 1, icon: '🕳️', name: 'Void Discount',       desc: 'Generators are 5% cheaper per level.',                          cost: 4,  max: 4 },
  { id: 'momentum',           branch: 'production', tier: 2, icon: '🌀', name: 'Momentum',            desc: 'Milestones gain one final doubling at 750 owned.',              cost: 8,  max: 1 },
  // POWER branch
  { id: 'iron-will',          branch: 'power',      tier: 0, icon: '✊', name: 'Iron Will',           desc: 'Click power ×5 per level.',                                     cost: 3,  max: 3 },
  { id: 'star-harmony',       branch: 'power',      tier: 1, icon: '🌟', name: 'Star Harmony',        desc: 'Golden stars appear twice as often; surges last 40s instead of 25s.', cost: 5, max: 1 },
  { id: 'dream-weaver',       branch: 'power',      tier: 2, icon: '🛌', name: 'Dream Weaver',        desc: 'Offline earnings: 100% rate and a 72h cap.',                    cost: 6,  max: 1 },
  // META branch
  { id: 'shard-affinity',     branch: 'meta',       tier: 0, icon: '💠', name: 'Shard Affinity',      desc: 'Each Singularity Shard grants +5% more production.',            cost: 4,  max: 1 },
  { id: 'chrono-focus',       branch: 'meta',       tier: 1, icon: '⏱️', name: 'Chrono Focus',        desc: 'Research projects complete 40% faster.',                        cost: 5,  max: 1 },
  { id: 'quick-start',        branch: 'meta',       tier: 2, icon: '🚀', name: 'Quick Start',         desc: 'Begin every run with 50 of each of the first 5 generators per level.', cost: 3, max: 3, costMult: 2 },
  { id: 'overclock',          branch: 'meta',       tier: 3, icon: '⚡', name: 'Overclock',           desc: 'Automators act every 0.5s instead of every 2s.',                cost: 6,  max: 1 },
  { id: 'auto-ascend',        branch: 'meta',       tier: 4, icon: '♾️', name: 'Auto Ascend',         desc: 'Unlocks a settings toggle that ascends automatically once ≥10 ✧ pends.', cost: 20, max: 1 },
  { id: 'singularity-engine', branch: 'meta',       tier: 5, icon: '🔮', name: 'Singularity Engine',  desc: 'All production ×10.',                                           cost: 15, max: 1 },
  { id: 'auto-lab',           branch: 'meta',       tier: 6, icon: '🧪', name: 'Auto-Lab',            desc: 'Research auto-starts the cheapest affordable project when idle.', cost: 25, max: 1 }, // Wave 6: meta-tier continuation
];
const PERK_BY_ID = {};
for (const p of PERKS) PERK_BY_ID[p.id] = p;

function perkLvl(id) {
  return (state.perks && state.perks[id]) || 0;
}

function perkCost(p) {
  return Math.round(p.cost * Math.pow(p.costMult || 1, perkLvl(p.id)));
}

// linear within a branch: the previous tier must be started; tier-0 nodes are always open
function perkUnlocked(p) {
  if (!p || p.tier === 0) return true;
  const prev = PERKS.find(q => q.branch === p.branch && q.tier === p.tier - 1);
  return prev ? perkLvl(prev.id) >= 1 : true;
}

function canBuyPerk(id) {
  const p = PERK_BY_ID[id];
  if (!p) return false;
  return perkUnlocked(p) && perkLvl(id) < p.max && state.essence >= perkCost(p);
}

function buyPerk(id) {
  if (!canBuyPerk(id)) return false;
  const p = PERK_BY_ID[id];
  state.essence -= perkCost(p);
  state.perks[id] = perkLvl(id) + 1;
  SFX.buyUpgrade();
  recalc();
  toast('✧ Perk acquired', `<b>${p.name}</b> — ${p.desc}`);
  renderAscension();
  saveGame();
  return true;
}

/* ---------- ascend ---------- */

const ESSENCE_LIFETIME = 1e15; // cube-root scaling ⇒ each next ✧ needs ~8× the lifetime

function totalEssenceForLifetime(lifetime) {
  return Math.floor(Math.cbrt(lifetime / ESSENCE_LIFETIME));
}

function pendingEssence() {
  return Math.max(0, totalEssenceForLifetime(state.lifetimeAll) - state.essenceEver);
}

// lifetime needed to claim one MORE ✧ than is currently pending (for the hero hint)
function nextEssenceAt() {
  const cbrtFloor = Math.floor(Math.cbrt(state.lifetimeAll / ESSENCE_LIFETIME));
  return Math.pow(Math.max(cbrtFloor, state.essenceEver) + 1, 3) * ESSENCE_LIFETIME;
}

// quick-start perk headstart, applied by prestige/ascension run resets
function applyQuickStart() {
  const lvl = perkLvl('quick-start');
  if (!lvl) return;
  for (let i = 0; i < 5 && i < GENERATORS.length; i++) state.gens[i] += 50 * lvl;
}

// shared reset core (no UI); caller handles rendering/saving/toasts
function applyAscensionReset(pending) {
  state.essence += pending;
  state.essenceEver += pending;
  state.ascensionCount++;
  state.stardust = 0;
  state.lifetimeRun = 0;   // lifetimeAll PERSISTS — the essence formula depends on it
  state.gens = GENERATORS.map(() => 0);
  state.upgrades = {};
  state.research = { done: {}, active: null };
  state.genProduced = GENERATORS.map(() => 0); // Wave 5: run-scoped analytics reset in parity
  goldenBuff = null; // surges do not survive the end of a reality
  applyQuickStart();
  recalc();
}

function finishAscend(pending) {
  applyAscensionReset(pending);
  buildGeneratorDom();
  renderAll();
  toast('✧ Ascended!', `The forge transcends itself. <b>+${fmt(pending)} ✧ Cosmic Essence</b>.`);
  SFX.prestige();
  saveGame();
}

function doAscend(skipConfirm) {
  const pending = pendingEssence();
  if (pending < 1) return false;
  if (skipConfirm) { finishAscend(pending); return true; }
  showModal(
    '✧ Ascend Beyond?',
    `You will gain <b>${fmt(pending)} ✧ Cosmic Essence</b> for the Ascension perk tree.<br><br>` +
    `Resets: stardust, generators, upgrades, research (done &amp; running), this run's lifetime.<br>` +
    `Keeps: shards &amp; shard upgrades, wonders, codex, trial rewards, feats, <b>essence &amp; perks</b>, daily streak.`,
    () => finishAscend(pending),
    true
  );
  return true;
}

// pure gate for the loop hook — test-friendly, no side effects
function canAutoAscend() {
  return perkLvl('auto-ascend') > 0 && state.autoAscend === true && pendingEssence() >= 10;
}

// automators act every ~2s normally; overclock compresses to every ~0.5s
function automationCadenceTicks() {
  return perkLvl('overclock') ? 2 : 10;
}

/* =====================  DAILY GIFTS  ===================== */

function dateStamp(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayString() { return dateStamp(new Date()); }
function yesterdayString() { return dateStamp(new Date(Date.now() - 86400000)); }

// day = min(streak, 7): the calendar caps at 7 and repeats that finale forever
const DAILY_GIFTS = [
  { icon: '🎁',   name: 'Dust Starter',   kind: 'lump',            pct: 0.3, capSecs: 3600,  flat: 100,  desc: 'A stardust lump: 30% of your bank or 1h of production (whichever is smaller), plus 100.' },
  { icon: '⚡',   name: 'Cosmic Surge',   kind: 'surge',           mult: 10, ms: 60000,                  desc: '×10 production surge for 60 seconds.' },
  { icon: '🌟',   name: 'Star Caller',    kind: 'star',                                        desc: 'Summons a golden star within moments.' },
  { icon: '💰',   name: 'Big Dust Drop',  kind: 'lump',            pct: 1.0, capSecs: 7200,  flat: 250,  desc: 'A stardust lump: your whole bank or 2h of production (whichever is smaller), plus 250.' },
  { icon: '🎁',   name: 'Double Starter', kind: 'lump',            pct: 0.6, capSecs: 7200,  flat: 200,  desc: 'Day 1 again — but doubled.' },
  { icon: '⚡',   name: 'Mega Surge',     kind: 'surge',           mult: 25, ms: 90000,                  desc: '×25 production surge for 90 seconds.' },
  { icon: '✧',    name: 'Ascendant Boon', kind: 'essence-or-lump', pct: 1.0, capSecs: 14400, flat: 1000, desc: '+1 ✧ Cosmic Essence — or, before your first ascension, a mega stardust lump.' },
];

let pendingGoldenForce = false; // Star Caller sets this; the starfield scheduler honors it next tick

// pure descriptor lookup (clamped) — kept separate so tests can assert mapping directly
function dailyRewardFor(day) {
  return DAILY_GIFTS[Math.min(Math.max(day, 1), DAILY_GIFTS.length) - 1];
}

function dailyGiftReady() {
  return state.lastDaily !== todayString();
}

function applyDailyGift(g) {
  if (g.kind === 'lump') {
    const gain = Math.floor(Math.min(state.stardust * g.pct, g.capSecs * derived.sps)) + g.flat;
    state.stardust += gain;
    return '+' + fmt(gain) + ' stardust';
  }
  if (g.kind === 'surge') {
    goldenBuff = { until: Date.now() + g.ms, mult: g.mult };
    return '×' + g.mult + ' production for ' + Math.round(g.ms / 1000) + 's';
  }
  if (g.kind === 'star') {
    pendingGoldenForce = true;
    return 'a golden star is already streaking toward you';
  }
  if (g.kind === 'essence-or-lump') {
    if ((state.ascensionCount || 0) >= 1) {
      state.essence += 1;
      return '+1 ✧ Cosmic Essence';
    }
    const gain = Math.floor(Math.min(state.stardust * g.pct, g.capSecs * derived.sps)) + g.flat;
    state.stardust += gain;
    return '+' + fmt(gain) + ' stardust (mega lump)';
  }
  return '';
}

function claimDailyGift() {
  if (!dailyGiftReady()) return null; // once-per-day guard
  state.dailyStreak = (state.lastDaily === yesterdayString())
    ? (state.dailyStreak || 0) + 1
    : 1;
  state.lastDaily = todayString();
  const day = Math.min(state.dailyStreak, DAILY_GIFTS.length);
  const gift = dailyRewardFor(day);
  const text = applyDailyGift(gift);
  recalc();
  toast('🎁 Daily Gift — Day ' + day, `<b>${gift.icon} ${gift.name}</b> — ${text}.`);
  SFX.goldenCatch();
  renderDailyBadge();
  saveGame();
  return { day, streak: state.dailyStreak, gift };
}

function openGiftModal() {
  if (!dailyGiftReady()) return;
  const nextStreak = (state.lastDaily === yesterdayString()) ? (state.dailyStreak || 0) + 1 : 1;
  const day = Math.min(nextStreak, DAILY_GIFTS.length);
  const gift = dailyRewardFor(day);
  showModal(
    '🎁 Daily Gift — Day ' + day,
    `<b>${gift.icon} ${gift.name}</b><br>${gift.desc}` +
    `<br><br>Streak: <b>${nextStreak}</b> day${nextStreak === 1 ? '' : 's'}. Claim every day — miss one and the streak restarts!`,
    () => { if (claimDailyGift()) renderAll(); }
  );
}

function renderDailyBadge() {
  const dot = document.getElementById('gift-dot');
  if (dot) dot.classList.toggle('hidden', !dailyGiftReady());
}

// boot + tick%50 hook: keeps the gift badge honest without ever auto-claiming
function checkDailyGift() {
  renderDailyBadge();
}


/* =====================  STATE  ===================== */

function defaultState() {
  return {
    v: SAVE_VERSION,
    stardust: 0,
    lifetimeRun: 0,      // this prestige run
    lifetimeAll: 0,      // all time, drives shard formula
    gens: GENERATORS.map(() => 0),
    upgrades: {},        // id -> true
    achievements: {},    // id -> true
    shards: 0,           // spendable
    shardsEver: 0,       // total ever earned, for shard formula
    prestigeCount: 0,
    prestigeUpgrades: {},// id -> level
    clicks: 0,
    goldenCaught: 0,     // lifetime count of caught golden stars (persisted)
    codex: {},           // codex id -> true once unlocked (persisted)
    codexRead: {},       // codex id -> true once read by the player (persisted)
    essence: 0,          // ✧ Cosmic Essence spendable (ascension currency)
    essenceEver: 0,      // total ✧ ever earned; keeps the essence formula idempotent
    ascensionCount: 0,
    perks: {},           // perk id -> level (ascension perk tree)
    autoAscend: false,   // toggle unlocked by the auto-ascend perk
    lastDaily: null,     // date string of last claimed daily gift
    dailyStreak: 0,
    research: { done: {}, active: null }, // lab projects; active = { id, endsAt }
    wonders: {},         // wonderId -> true (sequential build chain)
    trial: null,         // active cosmic trial id | null
    trialStartedAt: 0,   // epoch ms the active trial was entered (drives Speedrun clock)
    trialsDone: {},      // trialId -> true (rewards are permanent)
    genProduced: GENERATORS.map(() => 0), // Wave 5: per-generator output this run (analytics)
    bestSps: 0,          // highest stardust/sec ever observed
    longestSessionSec: 0,
    sessionStartAt: Date.now(),
    slot: 1,             // active save slot 1-3
    seenChangelogVer: null, // "What's New" shown-once marker
    automation: true,    // master switch for bought automators
    notation: 'suffixes', // number formatting: 'suffixes' | 'scientific' | 'engineering'
    playtime: 0,         // seconds
    gotOffline: false,
    buyAmount: 1,        // 1 | 10 | 100 | 'max'
    sound: true,
    volume: 70,          // master volume 0-100 (WebAudio feel pack)
    // Wave 6: economy + theme + star-chart counters
    chartsCaught: 0,     // constellations completed (persisted lifetime count)
    chartsAttempted: 0,  // constellations attempted (spawned) — persisted
    perfectCharts: 0,    // completions with >=50% window remaining
    sellMode: false,     // 'Enable selling' settings toggle (default OFF)
    autoLab: false,      // auto-lab perk toggle (visible once owned)
    theme: 'cosmic',     // 'cosmic' | 'ember' | 'verdant'
    particles: true,
    lastSaved: Date.now(),
    startedAt: Date.now(),
  };
}

let state = defaultState();
const derived = { sps: 0, clickPower: 1, globalMult: 1, genMult: GENERATORS.map(() => 1), genSps: GENERATORS.map(() => 0) };

/* =====================  NUMBER FORMATTING  ===================== */

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function fmt(n, forceDecimals) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, forceDecimals);
  if (n < 1000) {
    if (forceDecimals || (n > 0 && n < 100 && n !== Math.floor(n))) {
      return n.toFixed(1).replace(/\.0$/, '');
    }
    return String(Math.floor(n));
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (state.notation === 'scientific') {
    return n.toExponential(2).replace('e+', 'e');
  }
  if (state.notation === 'engineering') {
    // exponent rounded DOWN to a multiple of 3; mantissa in [1, 1000)
    const exp3 = Math.floor(Math.log10(n) / 3) * 3;
    return (n / Math.pow(10, exp3)).toFixed(3) + 'e' + exp3;
  }
  if (tier < SUFFIXES.length) {
    const scaled = n / Math.pow(10, tier * 3);
    return scaled.toFixed(scaled >= 100 ? 1 : 2) + ' ' + SUFFIXES[tier];
  }
  return n.toExponential(2).replace('+', '');
}

function fmtTime(sec) {
  sec = Math.floor(sec);
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600),
        m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* =====================  CORE MATH  ===================== */

function shardBonusEach() {
  return (state.prestigeUpgrades.attune ? 0.15 : 0.10)
       + (researchDone('shard-resonance') ? 0.02 : 0) // shard-resonance: +2% each
       + (perkLvl('shard-affinity') ? 0.05 : 0);      // ascension: +5% flat
}

function recalc() {
  // per-generator multipliers from upgrades + milestones
  for (let i = 0; i < GENERATORS.length; i++) {
    let m = 1;
    GEN_UPGRADE_TIERS.forEach((_, ti) => {
      if (state.upgrades[`g_${GENERATORS[i].id}_${ti}`]) m *= 2;
    });
    for (const ms of effectiveGenMilestones()) {
      if (state.gens[i] >= ms) m *= 2; else break;
    }
    // research bucket boosts (e.g. spectral-sorting: gens 0-2 ×2)
    for (const r of RESEARCH) {
      if (r.tag === 'genBucket' && researchDone(r.id) && i >= r.from && i <= r.to) m *= r.mult;
    }
    derived.genMult[i] = m;
  }
  // global multiplier
  let g = 1;
  for (const u of SPECIAL_UPGRADES) {
    if (u.type === 'global' && state.upgrades[u.id]) g *= u.mult;
  }
  g *= 1 + state.shards * shardBonusEach();
  g *= Math.pow(1.02, Object.keys(state.achievements).length);
  // research + wonder global production multipliers
  for (const r of RESEARCH) {
    if (r.tag === 'global' && researchDone(r.id)) g *= r.mult;
  }
  if (wonderBuilt('dyson-sphere')) g *= 3;
  if (wonderBuilt('infinite-engine')) g *= 5;
  // cosmic trials: penalty while inside, inflation/speedrun rewards after survival
  if (state.trial === 'darkmatter') g *= 0.25;
  if (state.trialsDone && state.trialsDone.inflation) g *= 2;
  if (state.trialsDone && state.trialsDone.speedrun) g *= 1.5;
  // golden star surge: ×7 while active; expired buffs self-clear here
  if (goldenBuff) {
    if (Date.now() < goldenBuff.until) g *= goldenBuff.mult;
    else goldenBuff = null;
  }
  // ascension perks: global production multipliers
  g *= Math.pow(2, perkLvl('cosmic-might'));
  if (perkLvl('singularity-engine')) g *= 10;
  derived.globalMult = g;

  // stardust per second
  let sps = 0;
  for (let i = 0; i < GENERATORS.length; i++) {
    const s = GENERATORS[i].baseProd * state.gens[i] * derived.genMult[i] * g;
    derived.genSps[i] = s;
    sps += s;
  }
  // One-Man Army trial: generators produce NOTHING (clicks/golden stars/windfalls only)
  if (state.trial === 'one-army') {
    for (let i = 0; i < GENERATORS.length; i++) derived.genSps[i] = 0;
    sps = 0;
  }
  derived.sps = sps;

  // click power
  let clickMult = 1;
  let clickSpsPct = 0;
  for (const u of SPECIAL_UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (u.type === 'click') clickMult *= u.mult;
    if (u.type === 'clickSps') clickSpsPct += u.pct;
  }
  if (state.prestigeUpgrades.quickclick) clickMult *= 5;
  // research + wonder click multipliers
  for (const r of RESEARCH) {
    if (r.tag === 'clickMult' && researchDone(r.id)) clickMult *= r.mult;
  }
  if (wonderBuilt('neutron-forge')) clickMult *= 10;
  // pacifist survivors click ×5 forever
  if (state.trialsDone && state.trialsDone.pacifist) clickMult *= 5;
  // One-Man Army survivors click ×3 forever
  if (state.trialsDone && state.trialsDone['one-army']) clickMult *= 3;
  // ascension: iron-will ×5 per level
  if (perkLvl('iron-will')) clickMult *= Math.pow(5, perkLvl('iron-will'));
  derived.clickPower = 1 * clickMult * g + sps * clickSpsPct;
}

function costReduction() {
  let c = Math.pow(0.95, state.prestigeUpgrades.bargain || 0);
  if (researchDone('stellar-nursery')) c *= 0.92; // stellar-nursery: gens −8%
  c *= Math.pow(0.95, perkLvl('void-discount')); // ascension: gens −5% per level
  return c;
}

// momentum appends a final doubling threshold; the frozen const is never mutated
function effectiveGenMilestones() {
  return perkLvl('momentum') ? GEN_MILESTONES.concat([750]) : GEN_MILESTONES;
}

// cost of buying `count` units of generator i, starting from current owned
function bulkCost(i, count) {
  const r = costGrowth();
  const base = GENERATORS[i].baseCost * costReduction();
  const start = Math.pow(r, state.gens[i]);
  return base * start * (Math.pow(r, count) - 1) / (r - 1);
}

function maxAffordable(i) {
  const r = costGrowth();
  const base = GENERATORS[i].baseCost * costReduction();
  const start = Math.pow(r, state.gens[i]);
  const n = Math.floor(Math.log(state.stardust * (r - 1) / (base * start) + 1) / Math.log(r));
  return Math.max(0, n);
}

function buyGenerator(i) {
  const amt = state.buyAmount === 'max' ? Math.max(1, maxAffordable(i)) : state.buyAmount;
  const cost = bulkCost(i, amt);
  if (state.stardust < cost) return false;
  state.stardust -= cost;
  state.gens[i] += amt;
  SFX.buyGenerator();
  recalc();
  renderGenerators(true);
  renderUpgrades();
  return true;
}

/* ---------- selling (Wave 6, 'Enable selling' toggle) ---------- */

// PURE: refund for selling `amt` units from `owned` — 50% of the geometric
// cost of those units AT POST-SALE ownership (start = r^(owned-amt)).
function sellRefund(i, owned, amt) {
  const n = Math.max(0, Math.min(amt, owned)); // never below zero
  if (!(n > 0)) return 0;
  const r = costGrowth();
  const base = GENERATORS[i].baseCost * costReduction();
  const start = Math.pow(r, owned - n);
  return 0.5 * base * start * (Math.pow(r, n) - 1) / (r - 1);
}

// How many the ✕ click would sell: current ×1/×10/×100/max semantics clamped to owned.
function sellAmountFor(i) {
  return state.buyAmount === 'max' ? state.gens[i] : Math.min(state.buyAmount, state.gens[i]);
}

function sellGenerator(i) {
  if (!state.sellMode) return false; // master toggle off: no selling ever
  const amt = sellAmountFor(i);
  if (!(amt > 0)) return false;
  const refund = sellRefund(i, state.gens[i], amt);
  state.gens[i] -= amt;
  state.stardust += refund;
  state.lifetimeRun += refund;
  state.lifetimeAll += refund;
  SFX.sellThunk();
  recalc();
  renderGenerators(true);
  renderUpgrades(); // affordability may have shifted
  saveGame();
  toast('💸 Generators sold', `<b>×${amt} ${GENERATORS[i].name}</b> refunded <b>${fmt(refund)}</b> stardust.`);
  return true;
}

function buyUpgrade(id) {
  const u = UPGRADE_BY_ID[id];
  if (!u || state.upgrades[id]) return;
  if (state.trial === 'iron') return; // Iron Will II: upgrade purchases blocked while inside
  const cost = effUpgradeCost(u);     // Iron Will II reward: −25% forever once banked
  if (state.stardust < cost) return;
  state.stardust -= cost;
  state.upgrades[id] = true;
  SFX.buyUpgrade();
  recalc();
  toast('⚙️ Upgrade purchased', `<b>${u.name}</b> — ${u.desc}`);
  renderUpgrades();
  renderGenerators(true);
}

function buyPrestigeUpgrade(id) {
  const u = PRESTIGE_UPGRADES.find(p => p.id === id);
  const lvl = state.prestigeUpgrades[id] || 0;
  if (!u || lvl >= u.max) return;
  const cost = Math.round(u.cost * Math.pow(u.costMult || 1, lvl));
  if (state.shards < cost) return;
  state.shards -= cost;
  state.prestigeUpgrades[id] = lvl + 1;
  recalc();
  toast('💠 Shard upgrade', `<b>${u.name}</b> level ${lvl + 1}`);
  renderPrestige();
  renderTopbar();
}

/* ---------- prestige ---------- */

function totalShardsForLifetime(lifetime) {
  return Math.floor(Math.sqrt(lifetime / 1e9));
}

function pendingShards() {
  return Math.max(0, totalShardsForLifetime(state.lifetimeAll) - state.shardsEver);
}

function doPrestige() {
  let gain = pendingShards();
  if (wonderBuilt('multiverse-antenna')) gain *= 2;              // antenna doubles collapse yield
  if (state.trialsDone && state.trialsDone.darkmatter) gain *= 1.5; // darkmatter survivor bonus
  gain = Math.floor(gain);
  if (gain <= 0) return;
  showModal(
    '💠 Collapse the Forge?',
    `You will gain <b>${fmt(gain)}</b> Singularity Shard${gain === 1 ? '' : 's'} ` +
    `(+${Math.round(gain * shardBonusEach() * 100)}% permanent production).<br><br>` +
    `Your stardust, generators and normal upgrades will reset. ` +
    `Shards, shard upgrades and feats are kept.`,
    () => {
      state.shards += gain;
      state.shardsEver += gain;
      state.prestigeCount++;
      state.stardust = 0;
      state.lifetimeRun = 0;
      state.gens = GENERATORS.map(() => 0);
      state.upgrades = {};
      state.genProduced = GENERATORS.map(() => 0); // Wave 5: analytics parity with trial/ascension resets
      if (state.prestigeUpgrades.headstart) state.gens[0] = 10;
      applyQuickStart(); // essence perk: free generators at the start of every run
      recalc();
      buildGeneratorDom();
      renderAll();
      toast('💠 Reborn!', `The forge collapses… and reignites. <b>+${fmt(gain)} shards</b>.`);
      SFX.prestige();
      saveGame();
    },
    true
  );
}

/* =====================  ACHIEVEMENTS  ===================== */

function checkAchievements() {
  let newOnes = 0;
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.check(state)) {
      state.achievements[a.id] = true;
      newOnes++;
      SFX.achievement();
      toast('🏆 Feat unlocked!', `<b>${a.name}</b> — ${a.desc} <span class="dim">(+2% production)</span>`);
    }
  }
  if (newOnes) {
    recalc();
    renderAchievements();
  }
}

/* =====================  SAVE / LOAD  ===================== */

function saveGame() {
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(saveKey(state.slot), JSON.stringify(state));
  } catch (e) { /* storage may be unavailable; keep playing */ }
}

function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(saveKey(state.slot)); } catch (e) { /* ignore */ }
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    applyLoadedState(data);
    return true;
  } catch (e) {
    console.warn('Save corrupted, starting fresh.', e);
    return false;
  }
}

// coerce a possibly-corrupt save value into a finite, non-negative number
function saneNumber(v, floored) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return floored ? Math.floor(n) : n;
}

function applyLoadedState(data) {
  const fresh = defaultState();
  state = Object.assign(fresh, data);
  // heal scalar numbers from corrupt saves (NaN/negatives/strings)
  state.stardust = saneNumber(state.stardust, false);
  state.lifetimeRun = saneNumber(state.lifetimeRun, false);
  state.lifetimeAll = saneNumber(state.lifetimeAll, false);
  state.shards = saneNumber(state.shards, true);
  state.shardsEver = saneNumber(state.shardsEver, true);
  state.clicks = saneNumber(state.clicks, true);
  state.playtime = saneNumber(state.playtime, true);
  if (data && 'goldenCaught' in data) state.goldenCaught = saneNumber(data.goldenCaught, true);
  // heal enum + boolean flags
  state.buyAmount = [1, 10, 100, 'max'].includes(state.buyAmount) ? state.buyAmount : 1;
  state.gotOffline = !!state.gotOffline;
  state.sound = !!state.sound;
  state.particles = !!state.particles;
  // heal arrays/objects in case of older saves
  const gens = GENERATORS.map(() => 0);
  (data.gens || []).forEach((c, i) => { if (i < gens.length) gens[i] = Math.max(0, Math.floor(c) || 0); });
  state.gens = gens;
  state.upgrades = (data.upgrades && typeof data.upgrades === 'object') ? data.upgrades : {};
  state.achievements = (data.achievements && typeof data.achievements === 'object') ? data.achievements : {};
  state.prestigeUpgrades = (data.prestigeUpgrades && typeof data.prestigeUpgrades === 'object') ? data.prestigeUpgrades : {};
  state.codex = (data.codex && typeof data.codex === 'object') ? data.codex : {};
  state.codexRead = (data.codexRead && typeof data.codexRead === 'object') ? data.codexRead : {};
  // heal research lab: object shapes + offline-safe completion of finished projects
  state.research = { done: {}, active: null };
  if (data.research && typeof data.research === 'object') {
    if (data.research.done && typeof data.research.done === 'object') {
      for (const r of RESEARCH) if (data.research.done[r.id]) state.research.done[r.id] = true;
    }
    const act = data.research.active;
    if (act && typeof act === 'object' && RESEARCH.some(r => r.id === act.id) && Number.isFinite(act.endsAt)) {
      if (Date.now() >= act.endsAt) state.research.done[act.id] = true; // completed while away
      else state.research.active = { id: act.id, endsAt: act.endsAt };
    }
  }
  // heal wonders map
  state.wonders = {};
  if (data.wonders && typeof data.wonders === 'object') {
    for (const w of WONDERS) if (data.wonders[w.id]) state.wonders[w.id] = true;
  }
  // heal trials
  state.trialsDone = {};
  if (data.trialsDone && typeof data.trialsDone === 'object') {
    for (const c of CHALLENGES) if (data.trialsDone[c.id]) state.trialsDone[c.id] = true;
  }
  state.trial = CHALLENGES.some(c => c.id === data.trial) ? data.trial : null;
  // Wave 5: sane epoch heal — invalid/missing anchors become 0 (= "no clock running")
  state.trialStartedAt = saneNumber(state.trialStartedAt, true) || 0;
  // Wave 5: analytics healing — length-fit the producer array, coerce every slot finite >= 0
  if (!Array.isArray(state.genProduced)) state.genProduced = GENERATORS.map(() => 0);
  state.genProduced.length = GENERATORS.length;
  for (let i = 0; i < GENERATORS.length; i++) {
    const v = Number(state.genProduced[i]);
    state.genProduced[i] = Number.isFinite(v) && v >= 0 ? v : 0;
  }
  state.bestSps = saneNumber(state.bestSps, false);
  state.longestSessionSec = saneNumber(state.longestSessionSec, true);
  // Wave 5: slot + changelog markers
  state.slot = Math.min(3, Math.max(1, saneNumber(state.slot, true) || 1));
  state.seenChangelogVer = (typeof state.seenChangelogVer === 'string') ? state.seenChangelogVer : null;
  // Wave 6: chart counters, economy toggles, theme whitelist
  state.chartsCaught = saneNumber(state.chartsCaught, true);
  state.chartsAttempted = saneNumber(state.chartsAttempted, true);
  state.perfectCharts = saneNumber(state.perfectCharts, true);
  state.sellMode = !!state.sellMode;
  state.autoLab = !!state.autoLab;
  if (!['cosmic', 'ember', 'verdant'].includes(state.theme)) state.theme = 'cosmic';
  // heal codex unlock/read maps: whitelist against known entry ids only
  const __codexIds = new Set(CODEX.map(c => c.id));
  state.codex = {};
  if (data.codex && typeof data.codex === 'object') {
    for (const k of Object.keys(data.codex)) if (data.codex[k] && __codexIds.has(k)) state.codex[k] = true;
  }
  state.codexRead = {};
  if (data.codexRead && typeof data.codexRead === 'object') {
    for (const k of Object.keys(data.codexRead)) if (data.codexRead[k] && __codexIds.has(k)) state.codexRead[k] = true;
  }
  // automation flag defaults ON for saves from before it existed
  state.automation = (data && 'automation' in data) ? !!data.automation : true;
  state.notation = ['suffixes', 'scientific', 'engineering'].includes(state.notation) ? state.notation : 'suffixes';
  state.volume = Number.isFinite(state.volume) ? saneNumber(state.volume, true) : 70;
  state.volume = Math.min(100, Math.max(0, state.volume));
  // Wave 4: ascension + daily gift fields (heal from corrupt/old saves)
  state.essence = saneNumber(state.essence, true);
  state.essenceEver = saneNumber(state.essenceEver, true);
  state.ascensionCount = saneNumber(state.ascensionCount, true);
  state.perks = (data && data.perks && typeof data.perks === 'object') ? data.perks : {};
  state.autoAscend = !!state.autoAscend;
  state.lastDaily = (typeof state.lastDaily === 'string') ? state.lastDaily : null;
  state.dailyStreak = saneNumber(state.dailyStreak, true);
  state.sessionStartAt = Date.now(); // Wave 5: fresh session clock on every load
  state.v = SAVE_VERSION;
}

// PURE (Wave 6): format the away report from collected events.
// Event shapes: {type:'offline', amount, duration, capped, rate}
//               {type:'research', names:[...]} | {type:'dailyReady'}
function buildAwayReport(events) {
  if (!Array.isArray(events)) events = [];
  const parts = [];
  for (const ev of events) {
    if (!ev || !ev.type) continue;
    if (ev.type === 'offline') {
      parts.push(
        '🌙 Away for <b>' + fmtTime(ev.duration) + '</b>' +
        ' — your generators kept working at ' + Math.round((ev.rate || 0) * 100) + '%' +
        (ev.capped ? ' <span class="dim">(capped)</span>' : '') +
        ':<br><span style="font-size:1.4rem"><b>✨ ' + fmt(ev.amount) + ' stardust</b></span>'
      );
    } else if (ev.type === 'research') {
      const names = (ev.names || []).filter(Boolean);
      if (names.length) parts.push('🔬 Research completed while away:<br><b>' + names.join('</b>, <b>') + '</b>');
    } else if (ev.type === 'dailyReady') {
      parts.push('🎁 A daily gift is ready to claim.');
    }
  }
  return parts.join('<br><br>');
}

function grantOfflineProgress(awayInfo) {
  awayInfo = awayInfo || {};
  const away = (Date.now() - state.lastSaved) / 1000;
  recalc();
  const events = [];
  if (away >= 60 && derived.sps > 0) {
    const { capHours, rate } = offlineCapAndRate(); // dream / chrono-dampeners / time-vault stack
    const effective = Math.min(away, capHours * 3600);
    const gain = derived.sps * effective * rate;
    if (gain > 0) {
      state.stardust += gain;
      state.lifetimeRun += gain;
      state.lifetimeAll += gain;
      state.gotOffline = true;
      events.push({ type: 'offline', amount: gain, duration: away, capped: away > effective, rate });
    }
  }
  const rNames = Array.isArray(awayInfo.researchNames) ? awayInfo.researchNames : [];
  if (rNames.length) events.push({ type: 'research', names: rNames });
  if (awayInfo.dailyReady) events.push({ type: 'dailyReady' });
  if (!events.length) return; // zero events: skip the modal entirely
  showModal('🌙 While you were away…', buildAwayReport(events)); // Wave 6: single summary modal
}

function exportSave() {
  saveGame();
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  const box = document.getElementById('save-io');
  box.value = encoded;
  box.select();
  try { document.execCommand('copy'); toast('📤 Exported', 'Save copied to the box (and clipboard).'); }
  catch (e) { toast('📤 Exported', 'Save placed in the box below.'); }
}

// S13.1.2 - timestamped filename for downloaded save files
function saveFileStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
}

function downloadSave() {
  try {
    saveGame();
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const name = 'stellarforge-save-' + saveFileStamp() + '.json';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('\u{1F4BE} Save downloaded', name);
  } catch (e) {
    toast('\u{1F4BE} Download failed', String((e && e.message) || e));
  }
}

function importSaveFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const box = document.getElementById('save-io');
    box.value = String(reader.result || '');
    importSave();
  };
  reader.onerror = () => toast('\u{1F4E5} Import failed', 'Could not read that file.');
  reader.readAsText(file);
}

function importSave() {
  const box = document.getElementById('save-io');
  const text = box.value.trim();
  if (!text) { toast('📥 Import', 'Paste an exported save into the box first.'); return; }
  let data;
  try {
    data = JSON.parse(decodeURIComponent(escape(atob(text))));   // classic box export (base64)
  } catch (e) {
    data = JSON.parse(text);                                     // plain JSON (e.g. a downloaded save file)
  }
  try {
    if (!data || typeof data !== 'object' || !Array.isArray(data.gens)) throw new Error('bad save');
    applyLoadedState(data);
    recalc();
    buildGeneratorDom();
    renderAll();
    saveGame();
    toast('📥 Imported', 'Save loaded successfully. Welcome back!');
  } catch (err2) {
    toast('⚠️ Import failed', "That doesn't look like a valid Stellar Forge save.");
  }
}

function hardReset() {
  showModal(
    '☠️ Hard reset?',
    'This wipes <b>everything</b> — stardust, shards, upgrades, feats, all of it. There is no undo.',
    () => {
      const deadSlot = state.slot; // capture BEFORE the state swap changes the active key
      try { localStorage.removeItem(saveKey(deadSlot)); } catch (e) { /* ignore */ }
      state = defaultState();
      recalc();
      buildGeneratorDom();
      renderAll();
      toast('☠️ Reset', 'The universe begins anew.');
    },
    true
  );
}

// Wave 5: pre-slot saves live under the legacy keyless id. Seed slot 1 with it
// exactly once (only if slot 1 is empty), then retire the legacy key.
function migrateLegacySave() {
  let legacy = null;
  try { legacy = localStorage.getItem(SAVE_KEY_LEGACY); } catch (e) { return; }
  if (!legacy) return;
  try {
    if (!localStorage.getItem(saveKey(1))) localStorage.setItem(saveKey(1), legacy);
    localStorage.removeItem(SAVE_KEY_LEGACY);
  } catch (e) { /* storage blocked: leave everything untouched */ }
}

// Switch the active slot: bank the outgoing run, then load the target
// (confirm first when the target already holds a forge — preview its raw snapshot).
function switchSlot(target) {
  target = Math.min(3, Math.max(1, Math.floor(Number(target) || 0)));
  if (!target || target === state.slot) return;
  const doSwitch = () => {
    saveGame(); // outgoing run banks into its own slot
    state.slot = target;
    if (!loadGame()) { // empty target: a fresh forge begins
      state = defaultState();
      state.slot = target;
    }
    recalc();
    buildGeneratorDom();
    renderAll(); // full repaint from the loaded forge (incl. slot radio reflection)
    saveGame();
    toast('💾 Slot switched', 'Active slot is now <b>' + target + '</b>.');
  };
  let snap = null;
  try {
    const raw = localStorage.getItem(saveKey(target));
    if (raw) {
      const d = JSON.parse(raw);
      snap = { stardust: d && d.stardust, playtime: d && d.playtime };
    }
  } catch (e) { /* unreadable target: treat as empty */ }
  if (snap) {
    showModal(
      '💾 Switch to slot ' + target + '?',
      'That slot holds a forge with <b>' + fmt(snap.stardust || 0) + '</b> stardust · ' +
        fmtTime(snap.playtime || 0) + ' played.<br>Your current run is saved first.',
      doSwitch,
      true
    );
  } else {
    doSwitch();
  }
}

/* =====================  WHAT'S NEW  ===================== */

const CHANGELOG = [
  { version: '2.5', date: '2026-08-25', items: [
    'Three new Cosmic Trials: One-Man Army ✊, Speedrun ⏱️ and Iron Will II 🛡️',
    'Four late-game research projects plus the Transfinite upgrade tier',
    'Lifetime analytics: top producers, Best SPS ever and session records',
    'Three save slots and this What\'s New panel',
  ]},
];

function showChangelog(markSeen) {
  const entry = CHANGELOG[CHANGELOG.length - 1];
  showModal(
    '📜 What\'s New — v' + entry.version,
    '<ul class="changelog-list">' + entry.items.map(i => '<li>' + i + '</li>').join('') + '</ul>',
    () => {
      if (markSeen && state.seenChangelogVer !== entry.version) {
        state.seenChangelogVer = entry.version;
        saveGame();
      }
    },
    true
  );
}

/* =====================  UI: DOM BUILDING  ===================== */

const $ = id => document.getElementById(id);
const genDom = []; // cached per-row nodes

function buildGeneratorDom() {
  const list = $('generator-list');
  list.innerHTML = '';
  genDom.length = 0;
  GENERATORS.forEach((g, i) => {
    const btn = document.createElement('button');
    btn.className = 'gen-row';
    btn.innerHTML =
      `<div class="g-icon">${g.icon}</div>
       <div class="g-info">
         <div class="g-name">${g.name}</div>
         <div class="g-detail"></div>
         <div class="g-milestone"></div>
       </div>
       <div class="g-right">
         <div class="g-owned">0</div>
         <div class="g-cost"></div>
         <div class="g-buyamt"></div>
       </div>`;
    btn.title = g.flavor;
    btn.addEventListener('click', () => buyGenerator(i));
    list.appendChild(btn);
    genDom.push({
      row: btn,
      detail: btn.querySelector('.g-detail'),
      milestone: btn.querySelector('.g-milestone'),
      owned: btn.querySelector('.g-owned'),
      cost: btn.querySelector('.g-cost'),
      buyamt: btn.querySelector('.g-buyamt'),
    });
  });
}

function genVisible(i) {
  if (i === 0) return true;
  if (state.gens[i] > 0) return true;
  return state.lifetimeAll >= GENERATORS[i].baseCost * 0.35 || state.gens[i - 1] > 0 && state.lifetimeAll >= GENERATORS[i].baseCost * 0.1;
}

/* =====================  UI: RENDERING  ===================== */

function renderGenerators(structureChanged) {
  for (let i = 0; i < GENERATORS.length; i++) {
    const d = genDom[i], g = GENERATORS[i];
    const visible = genVisible(i);
    if (!visible) {
      d.row.classList.add('locked-gen');
      d.row.disabled = true;
      d.owned.textContent = '?';
      d.cost.textContent = '???';
      d.detail.textContent = 'Something stirs in the dark…';
      d.milestone.textContent = '';
      d.buyamt.textContent = '';
      continue;
    }
    d.row.classList.remove('locked-gen');
    const amt = state.buyAmount === 'max' ? Math.max(1, maxAffordable(i)) : state.buyAmount;
    const cost = bulkCost(i, amt);
    const afford = state.stardust >= cost;
    d.row.disabled = !afford;
    d.row.classList.toggle('affordable', afford);
    d.owned.textContent = fmt(state.gens[i]);
    d.cost.textContent = '✨ ' + fmt(cost);
    d.buyamt.textContent = amt > 1 ? `buy ×${fmt(amt)}` : '';
    if (structureChanged || tick % 5 === 0) {
      const each = state.gens[i] > 0 ? derived.genSps[i] / state.gens[i] : g.baseProd * derived.genMult[i] * derived.globalMult;
      d.detail.textContent = state.gens[i] > 0
        ? `${fmt(derived.genSps[i], true)}/s total · ${fmt(each, true)}/s each`
        : `produces ${fmt(each, true)}/s`;
      const next = effectiveGenMilestones().find(ms => state.gens[i] < ms);
      d.milestone.textContent = next ? `×2 output at ${next} owned (${state.gens[i]}/${next})` : '★ all milestones reached';
    }
  }
}

const upgDom = new Map(); // id -> button

function renderUpgrades() {
  const listEl = $('upgrade-list');
  let anyVisible = false;
  let anyAffordable = false;
  for (const u of UPGRADES) {
    const owned = !!state.upgrades[u.id];
    const unlocked = !owned && u.unlock(state);
    let btn = upgDom.get(u.id);
    if (owned || !unlocked) {
      if (btn) { btn.remove(); upgDom.delete(u.id); }
      continue;
    }
    anyVisible = true;
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'upgrade-card';
      btn.innerHTML = `<span class="u-name">${u.name}</span><span class="u-desc">${u.desc}</span><span class="u-cost">✨ ${fmt(effUpgradeCost(u))}</span>`;
      btn.addEventListener('click', () => buyUpgrade(u.id));
      upgDom.set(u.id, btn);
      // keep definition order: insert before the first later upgrade already in DOM
      let anchor = null;
      const idx = UPGRADES.indexOf(u);
      for (let j = idx + 1; j < UPGRADES.length; j++) {
        const later = upgDom.get(UPGRADES[j].id);
        if (later && later.parentNode === listEl) { anchor = later; break; }
      }
      listEl.insertBefore(btn, anchor);
    }
    // Wave 5: keep the price label live — Iron Will II's −25% lands after creation
    const costEl = btn.querySelector('.u-cost');
    if (costEl) costEl.textContent = '✨ ' + fmt(effUpgradeCost(u));
    const afford = state.stardust >= effUpgradeCost(u);
    btn.disabled = !afford;
    btn.classList.toggle('affordable', afford);
    if (afford) anyAffordable = true;
  }
  $('no-upgrades').classList.toggle('hidden', anyVisible);
  $('upgrade-notify').classList.toggle('hidden', !anyAffordable);
}

/* ---------- ascension UI (hero + perk tree live in the Prestige tab) ---------- */

function renderAscension() {
  const bal = $('ascend-balance');
  if (!bal) return;
  const pending = pendingEssence();
  bal.textContent = fmt(state.essence);
  $('ascend-pending').textContent = fmt(pending);
  $('ascend-count').textContent = fmt(state.ascensionCount);
  $('ascend-button').disabled = pending < 1;
  const next = nextEssenceAt();
  $('ascend-req').textContent = pending > 0
    ? `Next ✧ at ${fmt(next)} lifetime stardust (you have ${fmt(state.lifetimeAll)}).`
    : `Reach ${fmt(next)} lifetime stardust to earn ✧ (you have ${fmt(state.lifetimeAll)}).`;
  // settings toggle surfaces only once the auto-ascend perk is owned
  const row = $('autoascend-row');
  if (row) row.classList.toggle('hidden', perkLvl('auto-ascend') < 1);
  if ($('opt-autoascend')) $('opt-autoascend').checked = !!state.autoAscend;
  renderPerks();
}

function renderPerks() {
  const tree = $('perk-tree');
  if (!tree) return;
  tree.innerHTML = '';
  const chip = $('essence-chip');
  if (chip) chip.textContent = '✧ ' + fmt(state.essence);
  const branches = [['production', '🌌 Production'], ['power', '⚡ Power'], ['meta', '🔮 Meta']];
  for (const [branch, label] of branches) {
    const col = document.createElement('div');
    col.className = 'perk-branch';
    col.innerHTML = `<h4>${label}</h4>`;
    PERKS.filter(p => p.branch === branch)
      .sort((a, b) => a.tier - b.tier)
      .forEach(p => {
        const lvl = perkLvl(p.id);
        const maxed = lvl >= p.max;
        const open = perkUnlocked(p);
        const cost = perkCost(p);
        const afford = state.essence >= cost;
        const card = document.createElement('button'); // native button: keyboard-reachable
        card.className = 'upgrade-card perk-card' +
          (maxed ? ' maxed' : !open ? ' locked-perk' : afford ? ' affordable' : '');
        card.disabled = maxed || !open || !afford;
        card.innerHTML =
          `<span class="u-name">${open ? p.icon : '🔒'} ${p.name}${p.max > 1 ? ` <span class="dim">(${lvl}/${p.max})</span>` : ''}</span>` +
          `<span class="u-desc">${p.desc}</span>` +
          `<span class="u-cost">${maxed ? '✓ MAXED' : '✧ ' + fmt(cost)}</span>`;
        card.title = open
          ? 'Bought with Cosmic Essence ✧ — survives everything.'
          : 'Own the previous perk in this branch first.';
        if (!maxed && open) card.addEventListener('click', () => buyPerk(p.id));
        col.appendChild(card);
      });
    tree.appendChild(col);
  }
}

function renderPrestige() {
  const gain = pendingShards();
  $('prestige-pending').textContent = fmt(gain);
  $('prestige-current-bonus').textContent = '+' + Math.round(state.shards * shardBonusEach() * 100) + '%';
  $('prestige-after-bonus').textContent = '+' + Math.round((state.shards + gain) * shardBonusEach() * 100) + '%';
  $('shard-bonus-each').textContent = Math.round(shardBonusEach() * 100);
  $('prestige-button').disabled = gain <= 0;
  const nextTotal = totalShardsForLifetime(state.lifetimeAll) + 1;
  const next = Math.max(nextTotal, state.shardsEver + 1) ** 2 * 1e9;
  $('prestige-req').textContent = gain > 0
    ? `Next shard at ${fmt(next)} lifetime stardust (you have ${fmt(state.lifetimeAll)}).`
    : `Reach ${fmt(next)} lifetime stardust to earn a shard (you have ${fmt(state.lifetimeAll)}).`;
  $('prestige-notify').classList.toggle('hidden', gain <= 0);

  // shard upgrades
  const list = $('prestige-upgrade-list');
  list.innerHTML = '';
  for (const u of PRESTIGE_UPGRADES) {
    const lvl = state.prestigeUpgrades[u.id] || 0;
    const maxed = lvl >= u.max;
    const cost = Math.round(u.cost * Math.pow(u.costMult || 1, lvl));
    const btn = document.createElement('button');
    btn.className = 'upgrade-card shard-upg' + (maxed ? ' maxed' : '');
    btn.innerHTML =
      `<span class="u-name">${u.icon} ${u.name}${u.max > 1 ? ` <span class="dim">(${lvl}/${u.max})</span>` : ''}</span>
       <span class="u-desc">${u.desc}</span>
       <span class="u-cost">${maxed ? '✓ MAXED' : '💠 ' + fmt(cost)}</span>`;
    btn.disabled = maxed || state.shards < cost;
    if (!maxed) btn.addEventListener('click', () => buyPrestigeUpgrade(u.id));
    list.appendChild(btn);
  }
  renderAscension(); // ascend hero + essence perk tree (above the collapse hero)
  renderWonders(); // wonders live inside the Prestige tab, below shard upgrades
}

function renderAchievements() {
  const list = $('achievement-list');
  list.innerHTML = '';
  let unlocked = 0;
  for (const a of ACHIEVEMENTS) {
    const has = !!state.achievements[a.id];
    if (has) unlocked++;
    const card = document.createElement('div');
    card.className = 'ach-card ' + (has ? 'unlocked' : 'locked');
    card.innerHTML = `<div class="a-name">${has ? '🏆' : '🔒'} ${a.name}</div><div class="a-desc">${a.desc}</div>`;
    list.appendChild(card);
  }
  $('ach-count').textContent = `${unlocked}/${ACHIEVEMENTS.length}`;
}

/* ---------- sps sparkline (Stats tab) ---------- */

const SPS_SAMPLES_MAX = 120;   // ~20 minutes of history at one sample / 10s
let spsHistory = [];           // module binding on purpose: session-only, never saved

// headless-testable: push one sample, enforce the cap, return new length
function recordSpsSample(v) {
  spsHistory.push(Number.isFinite(v) ? v : 0);
  if (spsHistory.length > SPS_SAMPLES_MAX) spsHistory.shift();
  return spsHistory.length;
}

function drawSparkline() {
  const canvas = $('sps-sparkline');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (spsHistory.length < 2) return; // nothing to draw yet
  const max = Math.max(...spsHistory, 1e-9);
  ctx.strokeStyle = '#ffd75e'; // var(--gold)
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < spsHistory.length; i++) {
    const x = (i / (SPS_SAMPLES_MAX - 1)) * (w - 4) + 2; // anchored right, grows left
    const y = h - 3 - (spsHistory[i] / max) * (h - 8);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// S13.1.1 - per-generator production share: top 5 by sps + an Others bucket. [] while idle.
function prodShareRows() {
  const vals = derived.genSps.map((v, i) => ({ name: GENERATORS[i].name, icon: GENERATORS[i].icon, val: Math.max(0, v || 0) }));
  const total = vals.reduce((a, b) => a + b.val, 0);
  if (!(total > 0)) return [];
  vals.sort((a, b) => b.val - a.val);
  const top = vals.slice(0, 5);
  const rest = vals.slice(5);
  const otherVal = rest.reduce((a, b) => a + b.val, 0);
  if (otherVal > 0) top.push({ name: 'Others', icon: '\u2728', val: otherVal });
  return top.map(r => ({ name: r.name, icon: r.icon, pct: r.val / total * 100 }));
}

function renderProdShare() {
  const host = $('prod-share');
  if (!host) return;
  const rows = prodShareRows();
  if (!rows.length) { host.innerHTML = '<p class="dim small">Produce some stardust to see your breakdown.</p>'; return; }
  host.innerHTML = rows.map(r =>
    '<div class="share-row">' +
      '<span class="share-name">' + r.icon + ' ' + r.name + '</span>' +
      '<span class="share-bar"><span class="share-fill" style="width:' + Math.max(2, r.pct).toFixed(1) + '%"></span></span>' +
      '<span class="share-pct">' + r.pct.toFixed(1) + '%</span>' +
    '</div>'
  ).join('');
}

function renderStats() {
  const totalGens = state.gens.reduce((a, b) => a + b, 0);
  const rows = [
    ['Stardust (current)', fmt(state.stardust)],
    ['Stardust per second', fmt(derived.sps, true)],
    ['Click power', fmt(derived.clickPower, true)],
    ['Lifetime stardust (this run)', fmt(state.lifetimeRun)],
    ['Lifetime stardust (all time)', fmt(state.lifetimeAll)],
    ['Total clicks', fmt(state.clicks)],
    ['⭐ Golden stars caught', fmt(state.goldenCaught)],
    ['Generators owned', fmt(totalGens)],
    ['Upgrades owned', String(Object.keys(state.upgrades).length)],
    ['Feats unlocked', `${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length}`],
    ['Global multiplier', '×' + fmt(derived.globalMult, true)],
    ['Forge collapses', String(state.prestigeCount)],
    ['Shards (spendable / ever)', `${fmt(state.shards)} / ${fmt(state.shardsEver)}`],
    ['Time played', fmtTime(state.playtime)],
    // Wave 5 analytics records
    ['Best SPS ever', fmt(state.bestSps, true)],
    ['Longest session', fmtTime(state.longestSessionSec)],
    ['Current session', fmtTime((Date.now() - state.sessionStartAt) / 1000)],
  ];
  $('stats-list').innerHTML = rows
    .map(([k, v]) => `<div class="stat-card"><div class="s-label">${k}</div><div class="s-value">${v}</div></div>`)
    .join('');
  renderProdShare();
  renderTopProducers();
}

// Wave 5: top-3 generators by everything they made this run
function renderTopProducers() {
  const el = $('top-producers');
  if (!el) return;
  const top = state.genProduced
    .map((v, i) => ({ name: GENERATORS[i].name, icon: GENERATORS[i].icon, v }))
    .filter(r => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3);
  if (!top.length) {
    el.innerHTML = '<div class="dim small">Nothing produced yet this run.</div>';
    return;
  }
  el.innerHTML = top
    .map((r, i) => `<div class="tp-row"><span class="tp-rank">#${i + 1}</span><span class="tp-name">${r.icon} ${r.name}</span><b>${fmt(r.v)}</b></div>`)
    .join('');
}

function renderTopbar() {
  $('shard-count').textContent = fmt(state.shards);
}

function renderBuffChip() {
  const chip = $('buff-chip');
  const remaining = goldenBuff ? goldenBuff.until - Date.now() : 0;
  if (remaining > 0) {
    chip.textContent = `⚡ ×${goldenBuff.mult} Surge ${Math.ceil(remaining / 1000)}s`;
    chip.classList.remove('hidden');
  } else {
    if (goldenBuff) { goldenBuff = null; recalc(); } // expired between recalcs — drop & restore baseline
    chip.classList.add('hidden');
  }
}

function renderResources() {
  $('stardust-count').textContent = fmt(state.stardust);
  $('sps-display').textContent = fmt(derived.sps, true) + ' per second';
  $('click-display').textContent = fmt(derived.clickPower, true) + ' per click';
  renderBuffChip();
  document.title = `${fmt(state.stardust)} ✨ — Stellar Forge`;
}

function renderAll() {
  renderResources();
  renderGenerators(true);
  renderUpgrades();
  renderLab();
  renderPrestige();
  renderAchievements();
  renderCodexBadge(); // restored saves show unread lore immediately
  renderStats();
  renderTopbar();
  $('opt-sound').checked = state.sound;
  $('opt-particles').checked = state.particles;
  if ($('opt-volume')) {
    $('opt-volume').value = Number.isFinite(state.volume) ? state.volume : 70;
    if ($('opt-volume-val')) $('opt-volume-val').textContent = $('opt-volume').value;
  }
  if ($('opt-automation')) $('opt-automation').checked = state.automation !== false;
  document.querySelectorAll('input[name="notation"]').forEach(r => { r.checked = r.value === state.notation; });
  document.querySelectorAll('input[name="slot"]').forEach(r => { r.checked = Number(r.value) === state.slot; });
  renderTrials();
  document.querySelectorAll('#buy-amount-switch button').forEach(b => {
    b.classList.toggle('active', String(state.buyAmount) === b.dataset.amt);
  });
}

/* =====================  UI: TOASTS & MODAL  ===================== */

function toast(title, html) {
  const zone = $('toast-zone');
  if (zone.children.length >= 4) zone.firstChild.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<b>${title}</b><br>${html}`;
  zone.appendChild(t);
  setTimeout(() => t.classList.add('fade'), 3800);
  setTimeout(() => t.remove(), 4300);
}

let modalConfirm = null;

function showModal(title, html, onOk, withCancel) {
  $('modal-title').innerHTML = title;
  $('modal-body').innerHTML = html;
  $('modal-cancel').classList.toggle('hidden', !withCancel);
  modalConfirm = onOk || null;
  $('modal-backdrop').classList.remove('hidden');
}

function closeModal(confirmed) {
  $('modal-backdrop').classList.add('hidden');
  const fn = modalConfirm;
  modalConfirm = null;
  if (confirmed && fn) fn();
}

/* =====================  CLICKING  ===================== */

let audioCtx = null;
let masterGain = null;
// Set once at load; true when the OS/browser asks for calmer motion.
const reducedMotion = (typeof window !== 'undefined' && window.matchMedia)
  ? !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

// Shared output bus. Returns null when muted or WebAudio is unavailable
// (e.g. Node test harness) so every cue can early-out safely.
function audioOut() {
  if (!state.sound) return null;
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
    }
    const vol = Number.isFinite(state.volume) ? Math.min(100, Math.max(0, state.volume)) : 70;
    masterGain.gain.value = (vol / 100) * 0.8; // headroom for stacked arpeggios
    return masterGain;
  } catch (e) { return null; }
}

// One enveloped oscillator note through the master bus.
// delay (s) sequences arpeggios; endFreq sweeps (whoosh/swell).
function tone(freq, dur, type, peak, delay, endFreq) {
  const out = audioOut();
  if (!out) return;
  try {
    const t0 = audioCtx.currentTime + (delay || 0);
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
    g.gain.setValueAtTime(peak || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (e) { /* audio must never break gameplay */ }
}

// Named cues for game events (all routed through tone -> masterGain).
const SFX = {
  click()        { tone(620 + Math.random() * 240, 0.12, 'sine', 0.045); },
  buyGenerator() { tone(140, 0.09, 'square', 0.06); },
  buyUpgrade()   { tone(523, 0.1, 'triangle', 0.05); tone(784, 0.14, 'triangle', 0.05, 0.08); },
  achievement()  { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.05, i * 0.09)); },
  goldenSpawn()  { tone(1568, 0.3, 'sine', 0.03, 0, 2093); }, // soft shimmer as the star appears
  goldenCatch()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, i * 0.08)); },
  research()     { tone(880, 0.35, 'sine', 0.05); tone(1318, 0.4, 'sine', 0.04, 0.04); },
  wonder()       { tone(98, 1.0, 'sawtooth', 0.05, 0, 49); tone(196, 1.0, 'triangle', 0.04, 0.06, 98); },
  prestige()     { tone(220, 0.8, 'sine', 0.055, 0, 1760); },
  trialSuccess() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.05, i * 0.1)); },
  trialFail()    { [330, 262, 196].forEach((f, i) => tone(f, 0.22, 'sawtooth', 0.04, i * 0.14)); },
  // Wave 6: star charts + selling
  chartPlink(i)  { tone(660 * Math.pow(1.1225, Math.min(i, 7)), 0.14, 'sine', 0.05); }, // rising pitch per node index
  chartComplete(){ SFX.achievement(); },                       // reuse the achievement arpeggio
  chartFanfare() { [659, 831, 988, 1319].forEach((f, i) => tone(f, 0.2, 'sine', 0.05, i * 0.09)); },
  chartFizzle()  { tone(110, 0.28, 'sawtooth', 0.04); },       // low thud
  sellThunk()    { tone(98, 0.15, 'square', 0.06); },          // low thunk on generator sale
};

function clickBlip() {
  SFX.click();
}

function spawnFloat(x, y, text, crit) {
  if (!state.particles) return;
  const el = document.createElement('div');
  el.className = 'float-num' + (crit ? ' crit' : '');
  el.textContent = text;
  el.style.left = (x - 20 + (Math.random() * 40 - 20)) + 'px';
  el.style.top = (y - 20) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
  if (!reducedMotion) for (let i = 0; i < 5; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 40;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }
}

function starClick(ev) {
  if (state.trial === 'pacifist') return; // ✋ trial: clicking disabled
  const gain = derived.clickPower;
  state.stardust += gain;
  state.lifetimeRun += gain;
  state.lifetimeAll += gain;
  state.clicks++;
  const x = ev.clientX || window.innerWidth / 2;
  const y = ev.clientY || window.innerHeight / 2;
  spawnFloat(x, y, '+' + fmt(gain, true));
  clickBlip();
  renderResources();
}

/* =====================  GOLDEN STAR EVENT LOGIC  ===================== */

// Pure/read-only: safe to call from tests, never mutates state or touches DOM.
function goldenLumpReward() {
  return (Math.min(state.stardust * GOLDEN_LUMP_PCT, GOLDEN_LUMP_CAP_SECS * derived.sps) + GOLDEN_LUMP_BASE)
       * goldenLumpMult();
}

function activateGoldenBuff() {
  const dur = perkLvl('star-harmony') ? GOLDEN_BUFF_MS_HARMONY : GOLDEN_BUFF_MS;
  goldenBuff = { until: Date.now() + dur, mult: GOLDEN_BUFF_MULT };
}

// Reward resolution for a caught golden star: surge OR lump, always counted.
function collectGoldenStar(x, y) {
  state.goldenCaught++;
  if (Math.random() < GOLDEN_BUFF_CHANCE) {
    activateGoldenBuff();
    toast('⚡ Stardust Surge!', `<b>×${GOLDEN_BUFF_MULT} production</b> for ${Math.round((perkLvl('star-harmony') ? GOLDEN_BUFF_MS_HARMONY : GOLDEN_BUFF_MS) / 1000)}s`);
    spawnFloat(x, y, `⚡ ×${GOLDEN_BUFF_MULT}!`, true);
  } else {
    const lump = goldenLumpReward();
    state.stardust += lump;
    state.lifetimeRun += lump;
    state.lifetimeAll += lump;
    toast('🌟 Golden Windfall!', `<b>+${fmt(lump)}</b> stardust snatched from the sky.`);
    spawnFloat(x, y, '+' + fmt(lump, true), true);
  }
  SFX.goldenCatch();
  recalc();
  renderResources();
  saveGame(); // persist the catch immediately so a refresh can't lose it
}

/* =====================  STAR CHARTS LOGIC (Wave 6)  ===================== */

// PURE: node placement inside the central 65% of a w×h sky.
function chartNewNodes(w, h, count) {
  const n = Math.max(CHART_MIN_NODES, Math.min(CHART_MAX_NODES, count || (CHART_MIN_NODES + Math.floor(Math.random() * 3))));
  const mx = w * (1 - CHART_VIEWPORT_SPAN) / 2;
  const my = h * (1 - CHART_VIEWPORT_SPAN) / 2;
  const nodes = [];
  for (let i = 0; i < n; i++) {
    nodes.push({ x: mx + Math.random() * (w * CHART_VIEWPORT_SPAN), y: my + Math.random() * (h * CHART_VIEWPORT_SPAN) });
  }
  return nodes;
}

// PURE: index of whichever node sits within hit radius of (x,y), else -1.
function chartHitNode(nodes, x, y) {
  for (let i = 0; i < nodes.length; i++) {
    if (Math.hypot(x - nodes[i].x, y - nodes[i].y) <= CHART_HIT_RADIUS) return i;
  }
  return -1;
}

// PURE: fraction of the catch window still remaining, clamped to [0,1].
function chartRemainingFraction(deadline, nowMs) {
  return Math.max(0, Math.min(1, (deadline - nowMs) / CHART_WINDOW_MS));
}

// PURE: reward tier by remaining-time fraction f.
//   f >= 0.5  -> PERFECT (essence +1 + fanfare)
//   f >= 0.25 -> surge ×15 for 45s
//   else      -> standard lump min(0.2*bank, 2400*sps) + 150
function chartRewardTier(f) {
  if (f >= 0.5) return 'perfect';
  if (f >= 0.25) return 'surge';
  return 'lump';
}

// PURE: lump payout for a chart (consolation pct/cap or standard), mirroring goldenLumpReward's shape.
function chartLumpReward(bank, sps, pct, capSecs, base) {
  return Math.min(bank * pct, capSecs * sps) + base;
}

// Applies a resolved chart outcome to state/UI. Outcome shapes:
//   { kind:'complete', tier } | { kind:'fizzle' }
function resolveChartOutcome(outcome, x, y) {
  if (outcome.kind === 'complete') {
    state.chartsCaught++;
    if (outcome.tier === 'perfect') {
      state.perfectCharts++;
      state.essence += 1; // ascensionCount >= 0 always allows the ✧ drip
      toast('✨ Perfect Tracing!', `<b>+1 ✧ Cosmic Essence</b> — the heavens applaud your precision.`);
      spawnFloat(x, y, '+1 ✧', true);
      SFX.chartFanfare();
    } else if (outcome.tier === 'surge') {
      goldenBuff = { until: Date.now() + 45000, mult: 15 }; // shares the single session buff slot
      toast('🌟 Stellar Surge!', '<b>×15 production</b> for 45s');
      spawnFloat(x, y, '⚡ ×15!', true);
    } else {
      const lump = chartLumpReward(state.stardust, derived.sps, 0.2, 2400, 150);
      state.stardust += lump;
      state.lifetimeRun += lump;
      state.lifetimeAll += lump;
      toast('✨ Chart Complete!', `<b>+${fmt(lump)}</b> stardust traced from the stars.`);
      spawnFloat(x, y, '+' + fmt(lump, true), true);
    }
    SFX.chartComplete();
  } else { // fizzle: wrong node or timeout — tiny consolation
    const lump = chartLumpReward(state.stardust, derived.sps, 0.05, 600, 25);
    state.stardust += lump;
    state.lifetimeRun += lump;
    state.lifetimeAll += lump;
    SFX.chartFizzle();
  }
  recalc();
  renderResources();
  saveGame();
}

/* =====================  RESEARCH LAB LOGIC  ===================== */

// One project at a time; deducts cost and schedules completion by wall clock
// (endsAt is an epoch timestamp, so projects finish even across reloads/offline).
function startResearch(id) {
  const def = RESEARCH.find(r => r.id === id);
  if (!def || state.research.active || state.research.done[id]) return false;
  if (state.stardust < def.cost) return false;
  state.stardust -= def.cost;
  state.research.active = { id, endsAt: Date.now() + researchDurationSec(id) * 1000 };
  toast('🔬 Research started', `<b>${def.name}</b> — ${fmtTime(researchDurationSec(id))}`);
  recalc(); // cost left the bank
  renderLab();
  return true;
}

// Completes any due project; safe to call every tick and right after load.
function tickResearchCheck() {
  const act = state.research && state.research.active;
  if (!act || Date.now() < act.endsAt) return false;
  const def = RESEARCH.find(r => r.id === act.id);
  state.research.done[act.id] = true;
  state.research.active = null;
  recalc();
  if (def) toast('🔬 Research complete!', `<b>${def.icon} ${def.name}</b> — ${def.desc}`);
  SFX.research();
  renderLab();
  return [def && def.name].filter(Boolean); // Wave 6: names for the away report
}

/* ---------- Auto-Lab perk (Wave 6) ---------- */

// PURE-ish: cheapest undone research the bank can afford right now, or null.
function cheapestAutoResearch() {
  let best = null;
  for (const r of RESEARCH) {
    if (state.research.done[r.id]) continue;
    if (!(state.stardust >= r.cost)) continue;
    if (!best || r.cost < best.cost) best = r;
  }
  return best ? best.id : null;
}

// Fires only when idle, affordable, enabled, and the tab is visible.
function canAutoLab() {
  return perkLvl('auto-lab') > 0 && state.autoLab === true &&
         !state.research.active && !document.hidden;
}

function runAutoLab() {
  if (!canAutoLab()) return false;
  const id = cheapestAutoResearch();
  return id ? startResearch(id) : false;
}

function renderLab() {
  const list = $('lab-list');
  if (!list) return;
  list.innerHTML = '';
  for (const def of RESEARCH) {
    const done = researchDone(def.id);
    const isActive = state.research.active && state.research.active.id === def.id;
    let inner;
    if (done) {
      inner = `<span class="u-name">${def.icon} ${def.name}</span><span class="u-desc">${def.desc}</span><span class="u-cost done">✓ COMPLETE</span>`;
    } else if (isActive) {
      const total = researchDurationSec(def.id) * 1000;
      const remain = Math.max(0, state.research.active.endsAt - Date.now());
      const pct = Math.min(100, Math.round((1 - remain / total) * 100));
      inner = `<span class="u-name">${def.icon} ${def.name}</span>` +
              `<div class="r-progress"><div class="r-fill" style="width:${pct}%"></div></div>` +
              `<span class="u-desc">${pct}% — ${fmtTime(remain / 1000)} remaining</span>`;
    } else {
      const busy = !!state.research.active;
      const afford = state.stardust >= def.cost;
      inner = `<span class="u-name">${def.icon} ${def.name}</span>` +
              `<span class="u-desc">${def.desc}<br><span class="dim">${fmtTime(def.timeSec)}</span></span>` +
              `<span class="u-cost">✨ ${fmt(def.cost)}</span>`;
      const card = document.createElement('button');
      card.className = 'upgrade-card lab-card' + (!afford || busy ? '' : ' affordable');
      card.innerHTML = inner;
      card.disabled = busy || !afford;
      card.title = busy ? 'The lab can run only one project at a time.' : '';
      card.addEventListener('click', () => startResearch(def.id));
      list.appendChild(card);
      continue;
    }
    const card = document.createElement('div');
    card.className = 'upgrade-card lab-card' + (done ? ' maxed' : ' running');
    card.innerHTML = inner;
    list.appendChild(card);
  }
}

/* =====================  COSMIC WONDERS LOGIC  ===================== */

function buyWonder(i) {
  const def = WONDERS[i];
  if (!def || wonderBuilt(def.id)) return;
  if (i > 0 && !wonderBuilt(WONDERS[i - 1].id)) return; // strict chain order
  showModal(
    `${def.icon} Raise ${def.name}?`,
    `<b>${def.desc}</b><br>Cost: ✨ <b>${fmt(def.cost)}</b> stardust.<br><br>` +
    `A monument to your patience. It cannot be undone (thankfully).`,
    () => {
      if (state.stardust < def.cost) return;
      state.stardust -= def.cost;
      state.wonders[def.id] = true;
      recalc();
      toast(`${def.icon} Wonder built!`, `<b>${def.name}</b> — ${def.desc}`);
      SFX.wonder();
      NEWS.push(`Local deity completes ${def.name}; neighbors unimpressed but jealous.`);
      renderAll();
      saveGame();
    },
    true
  );
}

function renderWonders() {
  const list = $('wonder-list');
  if (!list) return;
  list.innerHTML = '';
  WONDERS.forEach((w, i) => {
    const built = wonderBuilt(w.id);
    const prevOk = i === 0 || wonderBuilt(WONDERS[i - 1].id);
    const afford = state.stardust >= w.cost;
    const card = document.createElement('button');
    card.disabled = built || !prevOk || !afford;
    card.className = 'upgrade-card wonder-card' +
      (built ? ' built' : prevOk ? afford ? ' affordable' : '' : ' locked-wonder');
    card.innerHTML =
      `<span class="u-name">${built ? '🏛️' : prevOk ? w.icon : '🔒'} ${w.name}${built ? ' <span class="done">✓</span>' : ''}</span>` +
      `<span class="u-desc">${w.desc}</span>` +
      `<span class="u-cost">${built ? 'BUILT' : !prevOk ? `Requires ${WONDERS[i - 1].name}` : '✨ ' + fmt(w.cost)}</span>`;
    card.title = prevOk ? 'A cosmic marvel, forged once and forever.' : 'Finish the previous wonder first.';
    if (!built && prevOk) card.addEventListener('click', () => buyWonder(i));
    list.appendChild(card);
  });
}

/* =====================  COSMIC TRIALS LOGIC  ===================== */

// Wipes the current RUN (stardust/gens/upgrades/lifetimeRun). Shards, feats,
// golden stats, lab, wonders and trial records all survive.
function resetRunForTrial() {
  state.stardust = 0;
  state.lifetimeRun = 0;
  state.gens = GENERATORS.map(() => 0);
  state.upgrades = {};
  state.genProduced = GENERATORS.map(() => 0); // Wave 5: "this run" analytics reset in parity
}

function enterTrial(id) {
  const def = CHALLENGES.find(c => c.id === id);
  if (!def || state.trial || state.trialsDone[id]) return;
  showModal(
    `${def.icon} Enter ${def.name}?`,
    `<b>${def.desc}</b><br>Goal: ${def.goalText}<br>Reward: <b>${def.rewardText}</b><br><br>` +
    `⚠ Entering <b>resets this run</b> (stardust, generators, upgrades). Shards and feats are kept.`,
    () => {
      resetRunForTrial();
      state.trial = id;
      state.trialStartedAt = Date.now(); // wall-clock anchor (drives the Speedrun countdown/auto-fail)
      recalc();
      buildGeneratorDom();
      renderAll();
      toast(def.icon + ' Trial entered', `${def.name} — good luck.`);
      saveGame();
    },
    true
  );
}

function exitTrial() {
  if (!state.trial) return;
  const def = CHALLENGES.find(c => c.id === state.trial);
  showModal(
    '🏳️ Abandon trial?',
    'Leaving now resets your run again — with no reward.',
    () => {
      resetRunForTrial();
      state.trial = null;
      state.trialStartedAt = 0; // abandon: clock stops
      recalc();
      buildGeneratorDom();
      renderAll();
      saveGame();
    },
    true
  );
}

// Called from gameLoop: auto-exits on success, banking the permanent reward.
function checkTrialGoals() {
  if (!state.trial) return false;
  const def = CHALLENGES.find(c => c.id === state.trial);
  if (!def || !def.goal(state)) return false;
  state.trialsDone[def.id] = true;
  resetRunForTrial();
  state.trial = null;
  state.trialStartedAt = 0; // success: clock stops
  recalc();
  toast('🎖️ Trial complete!', `<b>${def.name}</b> conquered — ${def.rewardText}`);
  SFX.trialSuccess();
  checkAchievements();
  renderAll();
  saveGame();
  return true;
}

/* ---------- Speedrun wall-clock enforcement ---------- */

const SPEEDRUN_LIMIT_MS = 1800 * 1000; // 30 minutes from trial entry

function fmtClock(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}

function speedrunMsLeft() {
  if (state.trial !== 'speedrun' || !(state.trialStartedAt > 0)) return null;
  return Math.max(0, state.trialStartedAt + SPEEDRUN_LIMIT_MS - Date.now());
}

// Auto-fail when the 30-minute window lapses without meeting the goal.
// Distinct failure path: exits WITHOUT banking a reward; daily streak & records untouched.
// Runs AFTER checkTrialGoals() so a same-tick success always wins over the clock.
function checkTrialClock() {
  if (state.trial !== 'speedrun') return false;
  const def = CHALLENGES.find(c => c.id === 'speedrun');
  if (!def || def.goal(state)) return false;
  if (Date.now() - state.trialStartedAt < SPEEDRUN_LIMIT_MS) return false;
  resetRunForTrial();
  state.trial = null;
  state.trialStartedAt = 0; // fail: clock stops
  recalc();
  toast('⏱️ Speedrun failed', "The clock beat you — no reward this time. Your streaks and records are safe.");
  SFX.trialFail();
  renderAll();
  saveGame();
  return true;
}

function renderTrials() {
  const list = $('trial-list');
  if (!list) return;
  // active banner
  const banner = $('trial-banner');
  const activeDef = CHALLENGES.find(c => c.id === state.trial);
  if (banner) {
    if (activeDef) {
      const left = speedrunMsLeft(); // null unless the Speedrun clock is running
      banner.innerHTML = `⚔️ <b>${activeDef.icon} ${activeDef.name}</b> — ${activeDesc(activeDef)} · Goal: ${activeDef.goalText}` +
        ` <b>(${Math.floor(activeDef.pct(state))}%)</b>` +
        (left !== null ? ` <span class="trial-clock${left <= 300000 ? ' urgent' : ''}">⏳ ${fmtClock(left)}</span>` : '');
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }
  list.innerHTML = '';
  for (const c of CHALLENGES) {
    const done = !!(state.trialsDone && state.trialsDone[c.id]);
    const isActive = state.trial === c.id;
    const card = document.createElement('div');
    card.className = 'upgrade-card trial-card' + (done ? ' maxed' : isActive ? ' running' : '');
    card.innerHTML =
      `<span class="u-name">${done ? '🎖️' : isActive ? '⚔️' : c.icon} ${c.name}${done ? ' <span class="done">✓</span>' : ''}</span>` +
      `<span class="u-desc">${c.desc}<br>${c.goalText}<br>Reward: <b>${c.rewardText}</b></span>` ||
      '';
    const btnRow = document.createElement('span');
    btnRow.className = 'u-cost';
    if (done) {
      btnRow.textContent = 'COMPLETED';
    } else if (isActive) {
      const btn = document.createElement('button');
      btn.className = 'ghost-btn';
      btn.textContent = '🏳 Abandon';
      btn.addEventListener('click', exitTrial);
      btnRow.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'ghost-btn';
      btn.textContent = state.trial ? 'Busy' : 'Enter';
      btn.disabled = !!state.trial;
      btn.addEventListener('click', () => enterTrial(c.id));
      btnRow.appendChild(btn);
    }
    card.appendChild(btnRow);
    list.appendChild(card);
  }
}

function activeDesc(def) { return def.desc; }

/* =====================  AUTOMATION ENGINE  ===================== */

const automationState = { genToast: false, upgToast: false }; // one welcome-toast per session

function runAutomation() {
  if (!state.automation) return;
  if (state.prestigeUpgrades.autogen) {
    // cheapest VISIBLE generator, single unit, never spending past 90% of bank
    const budget = state.stardust * 0.9;
    let best = -1, bestCost = Infinity;
    for (let i = 0; i < GENERATORS.length; i++) {
      if (!genVisible(i)) continue;
      const c = bulkCost(i, 1);
      if (c <= budget && c < bestCost) { best = i; bestCost = c; }
    }
    if (best >= 0) {
      const cost = bulkCost(best, 1); // amount-independent by design
      state.stardust -= cost;
      state.gens[best]++;
      recalc();
      renderGenerators(true);
      renderUpgrades();
      if (!automationState.genToast) {
        automationState.genToast = true;
        toast('🏗️ Auto-Assembler', `Purchased a <b>${GENERATORS[best].name}</b> for you.`);
      }
    }
  }
  if (state.prestigeUpgrades.autoupg) {
    const avail = UPGRADES
      .filter(u => !state.upgrades[u.id] && u.unlock(state) && state.stardust >= effUpgradeCost(u))
      .sort((a, b) => effUpgradeCost(a) - effUpgradeCost(b));
    if (avail[0]) {
      const u = avail[0];
      state.stardust -= effUpgradeCost(u);
      state.upgrades[u.id] = true;
      recalc();
      renderUpgrades();
      renderGenerators(true);
      if (!automationState.upgToast) {
        automationState.upgToast = true;
        toast('🧾 Upgrade Daemon', `Silently bought <b>${u.name}</b>.`);
      }
    }
  }
}

/* =====================  GAME LOOP  ===================== */

let tick = 0;
let lastTick = Date.now();

function gameLoop() {
  const now = Date.now();
  let dt = (now - lastTick) / 1000;
  lastTick = now;
  if (dt <= 0) return;
  if (dt > 5) dt = 5; // big gaps handled by offline logic on load; clamp tab-throttle jumps

  const autolvl = state.prestigeUpgrades.autoclick || 0;
  const gain = derived.sps * dt + derived.clickPower * autolvl * dt;
  state.stardust += gain;
  state.lifetimeRun += gain;
  state.lifetimeAll += gain;
  state.playtime += dt;
  // Wave 5 analytics: cheap per-tick accounting — per-generator output + all-time record
  for (let i = 0; i < GENERATORS.length; i++) state.genProduced[i] += derived.genSps[i] * dt;
  if (derived.sps > state.bestSps) state.bestSps = derived.sps;

  tick++;
  tickResearchCheck(); // completes due lab projects (offline-safe: endsAt is wall clock)
  renderResources();
  renderGenerators(false);
  if (tick % 3 === 0) renderUpgrades();
  if (tick % 5 === 0 && document.querySelector('#tab-lab.active')) renderLab();
  if (tick % automationCadenceTicks() === 0) {
    runAutomation();      // bought automators act every ~2s (0.5s with overclock)
    checkTrialGoals();    // auto-exit on trial success
    checkTrialClock();    // Wave 5: Speedrun auto-fail when the 30:00 lapses
    checkAchievements();
    renderPrestige();
    if (document.querySelector('#tab-trials.active')) renderTrials();
  }
  if (tick % 20 === 0) {
    if (codexUnlockCheck()) { renderCodexBadge(); saveGame(); } // codex lore unlocks
    if (document.querySelector('#tab-stats.active')) renderStats();
  }
  if (tick % 50 === 0) { // one sps sparkline sample every ~10s
    if (canAutoAscend()) doAscend(true); // auto-ascend perk: silent transcend at 10+ pending
    checkDailyGift(); // daily gift badge stays honest
    recordSpsSample(derived.sps);
    if (document.querySelector('#tab-stats.active')) drawSparkline();
  }
  if (tick % 100 === 0) saveGame(); // every ~20s
}

/* =====================  NEWS TICKER  ===================== */

function rotateNews() {
  const el = $('news-ticker');
  el.style.opacity = 0;
  setTimeout(() => {
    el.textContent = '📰 ' + NEWS[Math.floor(Math.random() * NEWS.length)];
    el.style.opacity = 1;
  }, 600);
}

/* =====================  STARFIELD  ===================== */

function initStarfield() {
  const canvas = $('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: Math.min(200, Math.floor(canvas.width * canvas.height / 9000)) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      p: Math.random() * Math.PI * 2,
      v: 0.3 + Math.random() * 1.2,
    }));
  }
  window.addEventListener('resize', resize);
  resize();

  let shooting = null;

  /* ---------- golden star event ---------- */
  let golden = null;   // { t0, x0, y0, dx, dy, x, y } while in flight
  let sparkles = [];   // fading trail motes ({x,y,born})

  function spawnGoldenStar() {
    if (golden) return; // one at a time
    SFX.goldenSpawn(); // shimmer cue the moment a star appears
    const w = canvas.width, h = canvas.height;
    const fromLeft = Math.random() < 0.5;
    golden = {
      t0: 0,
      x0: fromLeft ? -40 : w + 40,
      y0: h * (0.18 + Math.random() * 0.5),
      dx: (w + 80) * (fromLeft ? 1 : -1),
      dy: (Math.random() * 2 - 1) * h * 0.35,
      x: 0, y: 0,
    };
  }

  // self-rescheduling setTimeout chain; `first` uses the shorter demo window.
  // golden-lure / wormhole-array / Star Net compress the interval (more frequent stars).
  function scheduleGoldenStar(first) {
    const min = first ? GOLDEN_FIRST_SPAWN_MIN_MS : GOLDEN_SPAWN_MIN_MS;
    const max = first ? GOLDEN_FIRST_SPAWN_MAX_MS : GOLDEN_SPAWN_MAX_MS;
    // daily-gift Star Caller: collapse the wait to near-instant, once
    const forced = pendingGoldenForce;
    pendingGoldenForce = false;
    setTimeout(() => {
      spawnGoldenStar();
      scheduleGoldenStar(false);
    }, forced ? 250 : (min + Math.random() * (max - min)) * goldenSpawnIntervalScale());
  }

  /* ---------- star chart event (Wave 6) ---------- */
  function spawnChart() {
    if (chartState) return; // scheduling never overlaps an active chart
    const nodes = chartNewNodes(canvas.width, canvas.height);
    const now = performance.now();
    chartState = { nodes, next: 0, born: now, deadline: now + CHART_WINDOW_MS, fading: false, fadeStart: 0 };
    state.chartsAttempted++; // an attempt begins the moment the chart appears
  }

  function completeChart(x, y) {
    const f = chartRemainingFraction(chartState.deadline, performance.now());
    const tier = chartRewardTier(f);
    chartState = null;
    resolveChartOutcome({ kind: 'complete', tier }, x, y);
  }

  // Wrong node or timeout: consolation lump + fade-out, then the sky is clear.
  function fizzleChart(x, y) {
    resolveChartOutcome({ kind: 'fizzle' }, x, y);
    if (chartState) chartState = Object.assign({}, chartState, { fading: true, fadeStart: performance.now() });
  }

  // Self-rescheduling chain, fully independent of the golden star timer.
  function scheduleChart() {
    setTimeout(() => {
      spawnChart();
      scheduleChart();
    }, CHART_SPAWN_MIN_MS + Math.random() * (CHART_SPAWN_MAX_MS - CHART_SPAWN_MIN_MS));
  }

  // Registered BEFORE the golden-star listener so charts win any overlap.
  canvas.addEventListener('pointerdown', ev => {
    if (!chartState || chartState.fading) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;
    const hit = chartHitNode(chartState.nodes, cx, cy);
    if (hit === -1) return; // empty sky: golden star keeps its chance
    ev.stopImmediatePropagation(); // click belongs to the chart
    if (hit !== chartState.next) {
      fizzleChart(ev.clientX, ev.clientY); // wrong order — fizzle
      return;
    }
    SFX.chartPlink(chartState.next); // rising pitch per index
    chartState.next++;
    if (chartState.next >= chartState.nodes.length) completeChart(ev.clientX, ev.clientY);
  });

  // clickable only during flight; decorative white shooting stars are NOT
  canvas.addEventListener('pointerdown', ev => {
    if (!golden || !golden.t0) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;
    if (Math.hypot(cx - golden.x, cy - golden.y) <= GOLDEN_RADIUS + GOLDEN_HIT_FUDGE) {
      golden = null;
      collectGoldenStar(ev.clientX, ev.clientY);
    }
  });


  function frame(t) {
    if (!document.hidden) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t / 1000 * s.v + s.p));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#cdd6ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // occasional shooting star
      if (!shooting && Math.random() < 0.003) {
        shooting = { x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.4, life: 1 };
      }
      if (shooting) {
        ctx.globalAlpha = shooting.life;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(shooting.x, shooting.y);
        ctx.lineTo(shooting.x - 40, shooting.y - 14);
        ctx.stroke();
        shooting.x += 9;
        shooting.y += 3;
        shooting.life -= 0.02;
        if (shooting.life <= 0) shooting = null;
      }
      /* ---------- golden star: drift + glow + trail ---------- */
      const nowT = t || performance.now();
      if (golden) {
        if (!golden.t0) golden.t0 = nowT;
        const p = (nowT - golden.t0) / GOLDEN_FLIGHT_MS;
        if (p >= 1) {
          golden = null; // flew off / expired uncaught
        } else {
          golden.x = golden.x0 + golden.dx * p;
          golden.y = golden.y0 + golden.dy * p;
          // trail motes only when particles are on and motion is allowed;
          // the star itself always shows
          if (state.particles && !reducedMotion && Math.random() < 0.5) {
            sparkles.push({ x: golden.x + (Math.random() * 14 - 7), y: golden.y + (Math.random() * 14 - 7), born: nowT });
          }
          sparkles = sparkles.filter(s => nowT - s.born < 600);
          for (const s of sparkles) {
            const a = 1 - (nowT - s.born) / 600;
            ctx.globalAlpha = a * 0.8;
            ctx.fillStyle = '#ffd75e';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
          // pulsing gold glow
          const pulse = 1 + 0.25 * Math.sin(nowT / 150);
          const grad = ctx.createRadialGradient(golden.x, golden.y, 0, golden.x, golden.y, GOLDEN_RADIUS * 3 * pulse);
          grad.addColorStop(0, 'rgba(255, 215, 94, 0.85)');
          grad.addColorStop(1, 'rgba(255, 215, 94, 0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(golden.x, golden.y, GOLDEN_RADIUS * 3 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd75e';
          ctx.beginPath();
          ctx.arc(golden.x, golden.y, GOLDEN_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* ---------- star chart render (Wave 6) ---------- */
      if (chartState) {
        const nowC = t || performance.now();
        if (!chartState.fading && nowC >= chartState.deadline) {
          fizzleChart(-1, -1); // window lapsed
        }
        let cAlpha = 1;
        if (chartState && chartState.fading) {
          cAlpha = Math.max(0, 1 - (nowC - chartState.fadeStart) / 450);
          if (cAlpha <= 0) chartState = null;
        }
        if (chartState) {
          // Static render: no motion of its own, so reducedMotion is honored by
          // design; no particle motes are emitted for charts at all.
          ctx.globalAlpha = cAlpha;
          ctx.strokeStyle = 'rgba(124, 140, 255, 0.35)'; // faint connecting lines
          ctx.lineWidth = 1;
          ctx.beginPath();
          chartState.nodes.forEach((n, i) => (i ? ctx.lineTo(n.x, n.y) : ctx.moveTo(n.x, n.y)));
          ctx.stroke();
          ctx.textAlign = 'center';
          chartState.nodes.forEach((n, i) => {
            ctx.globalAlpha = cAlpha * (i < chartState.next ? 0.25 : 1); // traced nodes dim out
            ctx.fillStyle = '#b57cff';
            ctx.font = '16px system-ui, sans-serif';
            ctx.fillText('✦', n.x, n.y);
            ctx.font = '10px monospace';
            ctx.fillStyle = '#e8ecff';
            ctx.fillText(String(i), n.x + 11, n.y - 9); // index label = click order
          });
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  scheduleGoldenStar(true);
  scheduleChart(); // Wave 6: independent constellation cadence
}

/* =====================  WIRING  ===================== */

// Wave 6 themes: body[data-theme] drives the CSS var overrides
// ('cosmic' keeps the :root defaults; 'ember'/'verdant' re-hue accents only).
function applyTheme() {
  document.body.dataset.theme = state.theme;
}

function initUI() {
  // star
  $('star-button').addEventListener('click', starClick);

  // tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'stats') { renderStats(); drawSparkline(); }
      if (btn.dataset.tab === 'lab') renderLab();
      if (btn.dataset.tab === 'trials') renderTrials();
      if (btn.dataset.tab === 'prestige') renderPrestige();
      if (btn.dataset.tab === 'achievements') renderAchievements();
      if (btn.dataset.tab === 'codex') renderCodex();
    });
  });

  // buy amount
  document.querySelectorAll('#buy-amount-switch button').forEach(b => {
    b.addEventListener('click', () => {
      state.buyAmount = b.dataset.amt === 'max' ? 'max' : parseInt(b.dataset.amt, 10);
      document.querySelectorAll('#buy-amount-switch button').forEach(x => x.classList.toggle('active', x === b));
      renderGenerators(true);
    });
  });

  // prestige
  $('prestige-button').addEventListener('click', doPrestige);

  // ascension
  $('ascend-button').addEventListener('click', () => doAscend(false));

  // daily gifts
  $('gift-badge').addEventListener('click', openGiftModal);

  // settings
  $('save-now').addEventListener('click', () => { saveGame(); toast('💾 Saved', 'Progress stored safely.'); });
  $('export-save').addEventListener('click', exportSave);
  $('import-save').addEventListener('click', importSave);
  $('download-save').addEventListener('click', downloadSave);
  $('open-import-file').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    importSaveFile(f);
    e.target.value = '';
  });
  $('hard-reset').addEventListener('click', hardReset);
  $('opt-sound').addEventListener('change', e => { state.sound = e.target.checked; });
  $('opt-volume').addEventListener('input', e => {
    state.volume = Number(e.target.value);
    if ($('opt-volume-val')) $('opt-volume-val').textContent = state.volume;
  });
  $('opt-volume').addEventListener('change', () => { saveGame(); }); // persist on release
  $('opt-particles').addEventListener('change', e => { state.particles = e.target.checked; });
  $('opt-automation').addEventListener('change', e => { state.automation = e.target.checked; });
  $('opt-autoascend').addEventListener('change', e => { state.autoAscend = e.target.checked; saveGame(); });
  document.querySelectorAll('input[name="notation"]').forEach(r => {
    r.addEventListener('change', e => {
      if (e.target.checked) { state.notation = e.target.value; renderAll(); saveGame(); }
    });
  });
  // Wave 5: save-slot radios + What's New reopen button
  document.querySelectorAll('input[name="slot"]').forEach(r => {
    r.addEventListener('change', e => { if (e.target.checked) switchSlot(Number(e.target.value)); });
  });
  if ($('whats-new')) $('whats-new').addEventListener('click', () => showChangelog(true));

  // modal
  $('modal-ok').addEventListener('click', () => closeModal(true));
  $('modal-cancel').addEventListener('click', () => closeModal(false));
  $('modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(false); });

  // save on exit / hide
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Wave 5: bank the session length into the all-time record, then persist
      const secs = Math.floor((Date.now() - state.sessionStartAt) / 1000);
      if (secs > state.longestSessionSec) state.longestSessionSec = secs;
      saveGame();
    } else {
      state.sessionStartAt = Date.now(); // returning tab starts a fresh session segment
    }
  });

  // keyboard: space clicks the star · Escape closes the modal · M toggles sound
  window.addEventListener('keydown', e => {
    const typing = ['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName);
    if (e.code === 'Space' && !e.repeat && !typing) {
      e.preventDefault();
      starClick({ clientX: window.innerWidth * 0.17, clientY: window.innerHeight * 0.45 });
      return;
    }
    if (e.code === 'Escape' && !$('modal-backdrop').classList.contains('hidden')) {
      closeModal(false);
      return;
    }
    if ((e.code === 'KeyM') && !e.repeat && !typing) {
      state.sound = !state.sound;
      if ($('opt-sound')) $('opt-sound').checked = state.sound;
      toast(state.sound ? '🔊 Unmuted' : '🔇 Muted', '');
    }
  });
}

/* =====================  BOOT  ===================== */

function boot() {
  migrateLegacySave(); // Wave 5: pre-slot save lands in slot 1 exactly once
  loadGame();
  applyTheme(); // Wave 6: theme is healed during load; paint it before first render
  recalc();
  const awayResearch = tickResearchCheck() || []; // complete any project that finished while the tab was closed
  buildGeneratorDom();
  initUI();
  renderAll();
  // Wave 6: single away-summary modal (offline gains + finished research + gift hint)
  grantOfflineProgress({ researchNames: awayResearch, dailyReady: dailyGiftReady() });
  recalc();
  renderAll();
  initStarfield();
  rotateNews();
  checkDailyGift(); // light the gift badge on boot if today's gift is unclaimed
  // Wave 5: What's New panel — auto-open once per version, reopenable from settings
  const latest = CHANGELOG[CHANGELOG.length - 1];
  if (state.seenChangelogVer !== latest.version) showChangelog(true);
  setInterval(rotateNews, 12000);
  setInterval(gameLoop, 200);
  lastTick = Date.now();
}

boot();
