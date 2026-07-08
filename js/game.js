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
];

const COST_GROWTH = 1.15;
const GEN_MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500]; // each reached => x2 for that generator

// Per-generator upgrades are generated: at 10 / 25 / 50 / 100 owned, x2 production each.
const GEN_UPGRADE_TIERS = [
  { need: 10,  costMult: 12,     tierName: 'Improved' },
  { need: 25,  costMult: 130,    tierName: 'Automated' },
  { need: 50,  costMult: 1500,   tierName: 'Quantum' },
  { need: 100, costMult: 18000,  tierName: 'Transcendent' },
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
];

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
];

const SAVE_KEY = 'stellarForgeSave_v1';
const SAVE_VERSION = 1;

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
    playtime: 0,         // seconds
    gotOffline: false,
    buyAmount: 1,        // 1 | 10 | 100 | 'max'
    sound: true,
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
  return state.prestigeUpgrades.attune ? 0.15 : 0.10;
}

function recalc() {
  // per-generator multipliers from upgrades + milestones
  for (let i = 0; i < GENERATORS.length; i++) {
    let m = 1;
    GEN_UPGRADE_TIERS.forEach((_, ti) => {
      if (state.upgrades[`g_${GENERATORS[i].id}_${ti}`]) m *= 2;
    });
    for (const ms of GEN_MILESTONES) {
      if (state.gens[i] >= ms) m *= 2; else break;
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
  derived.globalMult = g;

  // stardust per second
  let sps = 0;
  for (let i = 0; i < GENERATORS.length; i++) {
    const s = GENERATORS[i].baseProd * state.gens[i] * derived.genMult[i] * g;
    derived.genSps[i] = s;
    sps += s;
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
  derived.clickPower = 1 * clickMult * g + sps * clickSpsPct;
}

function costReduction() {
  return Math.pow(0.95, state.prestigeUpgrades.bargain || 0);
}

// cost of buying `count` units of generator i, starting from current owned
function bulkCost(i, count) {
  const base = GENERATORS[i].baseCost * costReduction();
  const start = Math.pow(COST_GROWTH, state.gens[i]);
  return base * start * (Math.pow(COST_GROWTH, count) - 1) / (COST_GROWTH - 1);
}

function maxAffordable(i) {
  const base = GENERATORS[i].baseCost * costReduction();
  const start = Math.pow(COST_GROWTH, state.gens[i]);
  const n = Math.floor(Math.log(state.stardust * (COST_GROWTH - 1) / (base * start) + 1) / Math.log(COST_GROWTH));
  return Math.max(0, n);
}

function buyGenerator(i) {
  const amt = state.buyAmount === 'max' ? Math.max(1, maxAffordable(i)) : state.buyAmount;
  const cost = bulkCost(i, amt);
  if (state.stardust < cost) return false;
  state.stardust -= cost;
  state.gens[i] += amt;
  recalc();
  renderGenerators(true);
  renderUpgrades();
  return true;
}

function buyUpgrade(id) {
  const u = UPGRADE_BY_ID[id];
  if (!u || state.upgrades[id] || state.stardust < u.cost) return;
  state.stardust -= u.cost;
  state.upgrades[id] = true;
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
  const gain = pendingShards();
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
      if (state.prestigeUpgrades.headstart) state.gens[0] = 10;
      recalc();
      buildGeneratorDom();
      renderAll();
      toast('💠 Reborn!', `The forge collapses… and reignites. <b>+${fmt(gain)} shards</b>.`);
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { /* storage may be unavailable; keep playing */ }
}

function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* ignore */ }
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

function applyLoadedState(data) {
  const fresh = defaultState();
  state = Object.assign(fresh, data);
  // heal arrays/objects in case of older saves
  const gens = GENERATORS.map(() => 0);
  (data.gens || []).forEach((c, i) => { if (i < gens.length) gens[i] = Math.max(0, Math.floor(c) || 0); });
  state.gens = gens;
  state.upgrades = data.upgrades || {};
  state.achievements = data.achievements || {};
  state.prestigeUpgrades = data.prestigeUpgrades || {};
  state.v = SAVE_VERSION;
}

function grantOfflineProgress() {
  const away = (Date.now() - state.lastSaved) / 1000;
  if (away < 60) return;
  recalc();
  if (derived.sps <= 0) return;
  const capHours = state.prestigeUpgrades.dream ? 24 : 8;
  const rate = state.prestigeUpgrades.dream ? 1.0 : 0.6;
  const effective = Math.min(away, capHours * 3600);
  const gain = derived.sps * effective * rate;
  if (gain <= 0) return;
  state.stardust += gain;
  state.lifetimeRun += gain;
  state.lifetimeAll += gain;
  state.gotOffline = true;
  showModal(
    '🌙 While you were away…',
    `You were gone for <b>${fmtTime(away)}</b>.<br>Your generators kept working at ${Math.round(rate * 100)}% efficiency` +
    `${away > effective ? ` (capped at ${capHours}h)` : ''} and forged<br><br>` +
    `<span style="font-size:1.4rem"><b>✨ ${fmt(gain)} stardust</b></span>`
  );
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

function importSave() {
  const box = document.getElementById('save-io');
  const text = box.value.trim();
  if (!text) { toast('📥 Import', 'Paste an exported save into the box first.'); return; }
  try {
    const json = decodeURIComponent(escape(atob(text)));
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || !Array.isArray(data.gens)) throw new Error('bad save');
    applyLoadedState(data);
    recalc();
    buildGeneratorDom();
    renderAll();
    saveGame();
    toast('📥 Imported', 'Save loaded successfully. Welcome back!');
  } catch (e) {
    toast('⚠️ Import failed', 'That doesn\'t look like a valid Stellar Forge save.');
  }
}

function hardReset() {
  showModal(
    '☠️ Hard reset?',
    'This wipes <b>everything</b> — stardust, shards, upgrades, feats, all of it. There is no undo.',
    () => {
      state = defaultState();
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      recalc();
      buildGeneratorDom();
      renderAll();
      toast('☠️ Reset', 'The universe begins anew.');
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
      const next = GEN_MILESTONES.find(ms => state.gens[i] < ms);
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
      btn.innerHTML = `<span class="u-name">${u.name}</span><span class="u-desc">${u.desc}</span><span class="u-cost">✨ ${fmt(u.cost)}</span>`;
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
    const afford = state.stardust >= u.cost;
    btn.disabled = !afford;
    btn.classList.toggle('affordable', afford);
    if (afford) anyAffordable = true;
  }
  $('no-upgrades').classList.toggle('hidden', anyVisible);
  $('upgrade-notify').classList.toggle('hidden', !anyAffordable);
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

function renderStats() {
  const totalGens = state.gens.reduce((a, b) => a + b, 0);
  const rows = [
    ['Stardust (current)', fmt(state.stardust)],
    ['Stardust per second', fmt(derived.sps, true)],
    ['Click power', fmt(derived.clickPower, true)],
    ['Lifetime stardust (this run)', fmt(state.lifetimeRun)],
    ['Lifetime stardust (all time)', fmt(state.lifetimeAll)],
    ['Total clicks', fmt(state.clicks)],
    ['Generators owned', fmt(totalGens)],
    ['Upgrades owned', String(Object.keys(state.upgrades).length)],
    ['Feats unlocked', `${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length}`],
    ['Global multiplier', '×' + fmt(derived.globalMult, true)],
    ['Forge collapses', String(state.prestigeCount)],
    ['Shards (spendable / ever)', `${fmt(state.shards)} / ${fmt(state.shardsEver)}`],
    ['Time played', fmtTime(state.playtime)],
  ];
  $('stats-list').innerHTML = rows
    .map(([k, v]) => `<div class="stat-card"><div class="s-label">${k}</div><div class="s-value">${v}</div></div>`)
    .join('');
}

function renderTopbar() {
  $('shard-count').textContent = fmt(state.shards);
}

function renderResources() {
  $('stardust-count').textContent = fmt(state.stardust);
  $('sps-display').textContent = fmt(derived.sps, true) + ' per second';
  $('click-display').textContent = fmt(derived.clickPower, true) + ' per click';
  document.title = `${fmt(state.stardust)} ✨ — Stellar Forge`;
}

function renderAll() {
  renderResources();
  renderGenerators(true);
  renderUpgrades();
  renderPrestige();
  renderAchievements();
  renderStats();
  renderTopbar();
  $('opt-sound').checked = state.sound;
  $('opt-particles').checked = state.particles;
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

function clickBlip() {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 620 + Math.random() * 240;
    gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    o.connect(gain).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.13);
  } catch (e) { /* audio unavailable */ }
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
  for (let i = 0; i < 5; i++) {
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

  tick++;
  renderResources();
  renderGenerators(false);
  if (tick % 3 === 0) renderUpgrades();
  if (tick % 10 === 0) { checkAchievements(); renderPrestige(); }
  if (tick % 20 === 0 && document.querySelector('#tab-stats.active')) renderStats();
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
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* =====================  WIRING  ===================== */

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
      if (btn.dataset.tab === 'stats') renderStats();
      if (btn.dataset.tab === 'prestige') renderPrestige();
      if (btn.dataset.tab === 'achievements') renderAchievements();
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

  // settings
  $('save-now').addEventListener('click', () => { saveGame(); toast('💾 Saved', 'Progress stored safely.'); });
  $('export-save').addEventListener('click', exportSave);
  $('import-save').addEventListener('click', importSave);
  $('hard-reset').addEventListener('click', hardReset);
  $('opt-sound').addEventListener('change', e => { state.sound = e.target.checked; });
  $('opt-particles').addEventListener('change', e => { state.particles = e.target.checked; });

  // modal
  $('modal-ok').addEventListener('click', () => closeModal(true));
  $('modal-cancel').addEventListener('click', () => closeModal(false));
  $('modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(false); });

  // save on exit / hide
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

  // keyboard: space clicks the star
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && !['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      starClick({ clientX: window.innerWidth * 0.17, clientY: window.innerHeight * 0.45 });
    }
  });
}

/* =====================  BOOT  ===================== */

function boot() {
  loadGame();
  recalc();
  buildGeneratorDom();
  initUI();
  renderAll();
  grantOfflineProgress();
  recalc();
  renderAll();
  initStarfield();
  rotateNews();
  setInterval(rotateNews, 12000);
  setInterval(gameLoop, 200);
  lastTick = Date.now();
}

boot();
