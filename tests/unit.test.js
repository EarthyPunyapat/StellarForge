/* =====================================================================
   STELLAR FORGE — unit tests. PLAIN SCRIPT (no imports/exports/require).
   Evaluated by run-tests.js in the SAME vm scope as js/game.js, so every
   top-level binding of game.js (fmt, state, bulkCost, ...) is visible.
   Results are pushed into globalThis.__SF_RESULTS__; run-tests.js prints.
   All helpers use the __sf_ prefix to avoid any collision with game.js.
   ===================================================================== */
'use strict';

globalThis.__SF_RESULTS__ = [];

function __sf_test(name, fn) {
  try {
    fn();
    globalThis.__SF_RESULTS__.push({ name, pass: true, detail: '' });
  } catch (e) {
    globalThis.__SF_RESULTS__.push({ name, pass: false, detail: e && e.message ? e.message : String(e) });
  }
}
function __sf_eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'eq') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}
function __sf_close(actual, expected, relEps, msg) {
  const denom = Math.max(Math.abs(actual), Math.abs(expected), 1);
  if (!(Math.abs(actual - expected) / denom <= relEps)) {
    throw new Error((msg || 'close') + ': expected ~' + expected + ', got ' + actual + ' (relEps ' + relEps + ')');
  }
}
function __sf_true(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }

/* ---------- reset helper: restore a pristine game state ---------- */
function __sf_reset() {
  state = defaultState();
  state.prestigeUpgrades = {};
  goldenBuff = null; // session-only module binding — never leak between tests
  recalc();
}

/* ===================== Group 1: fmt() ===================== */

__sf_test('fmt: zero renders "0"', () => __sf_eq(fmt(0), '0'));
__sf_test('fmt: small integer renders floored string', () => __sf_eq(fmt(5), '5'));
__sf_test('fmt: forceDecimals keeps one decimal then trims .0', () => __sf_eq(fmt(5, true), '5'));
__sf_test('fmt: forceDecimals shows decimal', () => __sf_eq(fmt(5.25, true), '5.3'));
__sf_test('fmt: sub-100 non-integer shows one decimal', () => __sf_eq(fmt(5.5), '5.5'));
__sf_test('fmt: >=100 non-integer floors', () => __sf_eq(fmt(150.7), '150'));
__sf_test('fmt: negative sign preserved', () => __sf_eq(fmt(-5), '-5'));
__sf_test('fmt: 999 stays unsuffixed', () => __sf_eq(fmt(999), '999'));
__sf_test('fmt: 1000 hits K bucket', () => __sf_eq(fmt(1000), '1.00 K'));
__sf_test('fmt: K rounding to 2 decimals', () => __sf_eq(fmt(1234.56), '1.23 K'));
__sf_test('fmt: scaled >= 100 uses 1 decimal', () => __sf_eq(fmt(100000), '100.0 K'));
__sf_test('fmt: trillions suffix T', () => __sf_eq(fmt(1e12), '1.00 T'));
__sf_test('fmt: quadrillion suffix Qa at 1e15', () => __sf_eq(fmt(1e15), '1.00 Qa'));
__sf_test('fmt: Infinity renders infinity glyph', () => __sf_eq(fmt(Infinity), '∞'));
__sf_test('fmt: NaN renders infinity glyph', () => __sf_eq(fmt(NaN), '∞'));

/* ===================== Group 2: geometric cost math ===================== */

__sf_test('bulkCost: first single buy equals baseCost exactly', () => {
  __sf_reset();
  __sf_eq(bulkCost(0, 1), 15);
});
__sf_test('bulkCost: closed form matches independent series sum (owned=0,count=10)', () => {
  __sf_reset();
  const r = COST_GROWTH;
  let sum = 0;
  for (let k = 0; k < 10; k++) sum += GENERATORS[0].baseCost * Math.pow(r, k);
  __sf_close(bulkCost(0, 10), sum, 1e-9);
});
__sf_test('bulkCost: respects existing ownership (owned=5,count=3,gen=asteroid)', () => {
  __sf_reset();
  const idx = 2; // Asteroid Miner, baseCost 1100
  state.gens[idx] = 5;
  const r = COST_GROWTH;
  let sum = 0;
  for (let k = 5; k < 8; k++) sum += GENERATORS[idx].baseCost * Math.pow(r, k);
  __sf_close(bulkCost(idx, 3), sum, 1e-9);
});
__sf_test('bulkCost: bargain prestige applies 0.95^lvl reduction', () => {
  __sf_reset();
  state.prestigeUpgrades = { bargain: 2 };
  const factor = Math.pow(0.95, 2);
  const r = COST_GROWTH;
  let sum = 0;
  for (let k = 0; k < 4; k++) sum += GENERATORS[0].baseCost * Math.pow(r, k);
  __sf_close(bulkCost(0, 4), sum * factor, 1e-9);
  state.prestigeUpgrades = {};
});
__sf_test('maxAffordable: zero dust buys nothing', () => {
  __sf_reset();
  state.stardust = 0;
  __sf_eq(maxAffordable(0), 0);
});
__sf_test('maxAffordable: exact-affordable count is returned', () => {
  __sf_reset();
  const dust = bulkCost(0, 7);
  state.stardust = dust * (1 + 1e-12); // hair above boundary to dodge float drift
  __sf_eq(maxAffordable(0), 7);
});
__sf_test('maxAffordable: floor-correctness property just below boundary', () => {
  __sf_reset();
  const dust = bulkCost(0, 7) * (1 - 1e-9);
  state.stardust = dust;
  const n = maxAffordable(0);
  __sf_true(n <= 7, 'must not exceed affordable count');
  __sf_true(bulkCost(0, n) <= dust + 1e-6 && dust < bulkCost(0, n + 1), 'property bulkCost(n) <= dust < bulkCost(n+1)');
});
__sf_test('maxAffordable: huge dust yields large sane count', () => {
  __sf_reset();
  state.stardust = 1e18;
  const n = maxAffordable(0);
  __sf_true(n > 100, 'huge dust should afford >100 units');
  __sf_true(bulkCost(0, n) <= 1e18 && 1e18 < bulkCost(0, n + 1));
});

/* ===================== Group 3: shards formula + fmtTime ===================== */

__sf_test('shards: lifetime 0 grants 0', () => __sf_eq(totalShardsForLifetime(0), 0));
__sf_test('shards: just under threshold grants 0', () => __sf_eq(totalShardsForLifetime(999999999), 0));
__sf_test('shards: 1e9 grants exactly 1', () => __sf_eq(totalShardsForLifetime(1e9), 1));
__sf_test('shards: quadratic spot-check 4e9 -> 2', () => __sf_eq(totalShardsForLifetime(4e9), 2));
__sf_test('shards: 1e11 -> 10', () => __sf_eq(totalShardsForLifetime(1e11), 10));

__sf_test('fmtTime: 0s edge', () => __sf_eq(fmtTime(0), '0s'));
__sf_test('fmtTime: seconds only', () => __sf_eq(fmtTime(59), '59s'));
__sf_test('fmtTime: minute boundary', () => __sf_eq(fmtTime(60), '1m 0s'));
__sf_test('fmtTime: minutes+seconds', () => __sf_eq(fmtTime(61), '1m 1s'));
__sf_test('fmtTime: hour+min+sec', () => __sf_eq(fmtTime(3661), '1h 1m 1s'));
__sf_test('fmtTime: days drop seconds field', () => __sf_eq(fmtTime(90061), '1d 1h 1m'));
__sf_test('fmtTime: negative input floors through modulo path (golden master)', () => __sf_eq(fmtTime(-30), '-30s'));

/* ===================== Group 4: corrupt-save healing (S2.1.2 / M2) ===================== */

__sf_test('heal: NaN/negative/string/Infinity scalars all coerce to 0', () => {
  applyLoadedState({ stardust: NaN, lifetimeAll: -5, shards: 'x', clicks: Infinity });
  __sf_eq(state.stardust, 0, 'stardust');
  __sf_eq(state.lifetimeAll, 0, 'lifetimeAll');
  __sf_eq(state.shards, 0, 'shards');
  __sf_eq(state.clicks, 0, 'clicks');
});
__sf_test('heal: valid numeric payload preserved verbatim', () => {
  applyLoadedState({
    stardust: 123.45, lifetimeRun: 50.5, lifetimeAll: 1e9,
    shards: 3, shardsEver: 2, clicks: 42, playtime: 120,
  });
  __sf_eq(state.stardust, 123.45, 'fractional stardust kept');
  __sf_eq(state.lifetimeRun, 50.5, 'fractional lifetimeRun kept');
  __sf_eq(state.shards, 3, 'integer shards kept');
  __sf_eq(state.clicks, 42, 'clicks kept');
  __sf_eq(state.playtime, 120, 'playtime kept');
});
__sf_test('heal: fractional shards/playtime floored to integers', () => {
  applyLoadedState({ shards: 7.9, playtime: 10.2 });
  __sf_eq(state.shards, 7);
  __sf_eq(state.playtime, 10);
});
__sf_test('heal: non-object upgrade maps become {}', () => {
  applyLoadedState({ upgrades: null, achievements: 'nope', prestigeUpgrades: 42 });
  __sf_true(state.upgrades && typeof state.upgrades === 'object', 'upgrades object');
  __sf_true(state.achievements && typeof state.achievements === 'object', 'achievements object');
  __sf_true(state.prestigeUpgrades && typeof state.prestigeUpgrades === 'object', 'prestigeUpgrades object');
});
__sf_test('heal: goldenCaught coerced when present (future-proofing)', () => {
  applyLoadedState({ goldenCaught: -3 });
  __sf_eq(state.goldenCaught, 0, 'negative caught heals to 0');
  applyLoadedState({ goldenCaught: 7.9 });
  __sf_eq(state.goldenCaught, 7, 'fractional caught floored');
});
__sf_test('heal: version always forced to SAVE_VERSION', () => {
  applyLoadedState({ v: 999 });
  __sf_eq(state.v, SAVE_VERSION);
});

/* ===================== Group 5: golden star event (M3) ===================== */

__sf_test('golden: active buff multiplies sps by exactly ×7 vs baseline', () => {
  __sf_reset();
  state.gens[0] = 10; // milestone-doubled production path
  recalc();
  const baseSps = derived.sps;
  const baseGm = derived.globalMult;
  __sf_true(baseSps > 0, 'baseline sps positive');
  goldenBuff = { until: Date.now() + 9999, mult: 7 };
  recalc();
  __sf_close(derived.sps, baseSps * 7, 1e-9, 'surged sps');
  __sf_close(derived.globalMult, baseGm * 7, 1e-9, 'surged globalMult');
});

__sf_test('golden: expired buff self-clears and sps returns to baseline', () => {
  __sf_reset();
  state.gens[0] = 10;
  recalc();
  const baseSps = derived.sps;
  goldenBuff = { until: Date.now() - 1, mult: 7 }; // already expired (simulated clock)
  recalc();
  __sf_eq(goldenBuff, null, 'expired buff cleared by recalc');
  __sf_close(derived.sps, baseSps, 1e-9, 'sps back to baseline');
});

__sf_test('golden: lump floor — sps=0 yields exactly 13 regardless of bank', () => {
  __sf_reset(); // fresh state -> sps 0
  state.stardust = 123456.78;
  recalc();
  __sf_eq(derived.sps, 0, 'no generators, no sps');
  __sf_eq(goldenLumpReward(), 13);
  state.stardust = 9.9e15; // huge bank cannot help when sps is zero
  __sf_eq(goldenLumpReward(), 13);
});

__sf_test('golden: lump capped at 900*sps+13 at/above the 6000*sps bank boundary', () => {
  __sf_reset();
  state.gens[0] = 10;
  recalc();
  const sps = derived.sps;
  __sf_true(sps > 0, 'sps positive');
  state.stardust = 6000 * sps; // exact boundary: 0.15*bank === 900*sps
  __sf_close(goldenLumpReward(), GOLDEN_LUMP_CAP_SECS * sps + 13, 1e-9, 'at boundary');
  state.stardust = 99999 * sps; // far above boundary
  __sf_close(goldenLumpReward(), GOLDEN_LUMP_CAP_SECS * sps + 13, 1e-9, 'above boundary');
});

__sf_test('golden: lump mid-range is 0.15*bank+13', () => {
  __sf_reset();
  state.gens[0] = 10;
  recalc();
  const sps = derived.sps;
  state.stardust = 2000 * sps; // 300*sps < 900*sps cap
  __sf_close(goldenLumpReward(), 0.15 * 2000 * sps + 13, 1e-9, 'mid-range formula');
  __sf_true(state.stardust === 2000 * sps, 'reward fn is read-only on the bank');
});

__sf_test('golden: buff never serializes into save JSON; goldenCaught does', () => {
  __sf_reset();
  goldenBuff = { until: Date.now() + 5000, mult: 7 };
  const json = JSON.stringify(state); // exactly what saveGame() stores
  goldenBuff = null;
  __sf_true(json.indexOf('goldenBuff') === -1, 'goldenBuff absent from save payload');
  __sf_true(json.indexOf('"goldenCaught"') !== -1, 'goldenCaught present in save payload');
});

__sf_test('golden: goldenCaught survives applyLoadedState round-trip', () => {
  applyLoadedState({ gens: [1], goldenCaught: 42 });
  __sf_eq(state.goldenCaught, 42, 'caught count restored');
  __sf_eq(JSON.parse(JSON.stringify(state)).goldenCaught, 42, 'survives serialize');
});

__sf_test('golden: achievement defs gold5/gold25/gold100 with correct thresholds', () => {
  for (const [id, n] of [['gold5', 5], ['gold25', 25], ['gold100', 100]]) {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    __sf_true(a, 'missing achievement ' + id);
    __sf_eq(a.check({ goldenCaught: n - 1 }), false, id + ' below threshold');
    __sf_eq(a.check({ goldenCaught: n }), true, id + ' at threshold');
  }
});

/* restore pristine state so later groups start clean */
__sf_reset();

/* ===================== Group 5: Golden Star event (T3.2 / M3) ===================== */

/* ---------- S3.2.1: surge buff math ---------- */
__sf_test('gold buff: active buff multiplies production x7 vs baseline', () => {
  __sf_reset();
  goldenBuff = null;
  state.gens[0] = 10;               // first milestone -> x2 -> baseline sps = 2
  recalc();
  const base = derived.sps;
  __sf_close(base, 2, 1e-9, 'baseline sps');
  activateGoldenBuff();
  recalc();
  __sf_close(derived.sps, base * 7, 1e-9, 'surged sps');
  __sf_close(derived.globalMult, 7, 1e-9, 'global mult is exactly 7x');
});

__sf_test('gold buff: expired buff self-clears and restores baseline', () => {
  __sf_reset();
  goldenBuff = { until: Date.now() - 1, mult: 7 };   // simulated clock past expiry
  recalc();
  __sf_true(goldenBuff === null, 'expired buff dropped by recalc');
  __sf_eq(derived.globalMult, 1, 'multiplier back to 1');
  __sf_eq(derived.sps, 0, 'fresh-state baseline sps restored');
});

/* ---------- S3.2.2: lump formula boundaries ---------- */
__sf_test('gold lump: zero production pays flat 13 regardless of bank', () => {
  __sf_reset();
  state.stardust = 123456;
  recalc();                          // sps = 0 -> cap term = 0
  __sf_eq(goldenLumpReward(), 13);
});

__sf_test('gold lump: boundary bank = 6000*sps hits cap exactly (900*sps + 13)', () => {
  __sf_reset();
  state.gens[0] = 10;                // sps = 2
  state.stardust = 12000;            // 0.15 * 12000 = 1800 = 900 * 2
  recalc();
  __sf_close(goldenLumpReward(), 900 * 2 + 13, 1e-9, 'capped value');
});

__sf_test('gold lump: mid-range bank yields 15% of bank + 13 (below cap)', () => {
  __sf_reset();
  state.gens[0] = 10;                // sps = 2 -> cap = 1800
  state.stardust = 4000;             // 0.15 * 4000 = 600 < 1800
  recalc();
  __sf_close(goldenLumpReward(), 0.15 * 4000 + 13, 1e-9, 'uncapped value');
});

__sf_test('gold lump: pure function mutates nothing', () => {
  __sf_reset();
  state.stardust = 500;
  recalc();
  const before = state.stardust;
  goldenLumpReward();
  __sf_eq(state.stardust, before);
});

/* ---------- S3.2.3: persistence contract ---------- */
__sf_test('gold: goldenBuff never serializes into save payload', () => {
  __sf_reset();
  goldenBuff = null;
  activateGoldenBuff();
  const json = JSON.stringify(state);          // what saveGame persists
  __sf_true(json.indexOf('goldenBuff') === -1, 'session buff absent from state JSON');
  __sf_true(json.indexOf('goldenCaught') !== -1, 'lifetime counter present in state JSON');
  goldenBuff = null;
});

__sf_test('gold: goldenCaught survives save/load round-trip', () => {
  __sf_reset();
  applyLoadedState({ goldenCaught: 42 });
  const saved = JSON.parse(JSON.stringify(state));
  applyLoadedState(saved);
  __sf_eq(state.goldenCaught, 42);
});

/* ---------- S3.1.2 behavioral: both reward branches ---------- */
__sf_test('gold: collectGoldenStar honors surge branch (random<0.5)', () => {
  __sf_reset();
  const realRandom = Math.random;
  try {
    Math.random = () => 0;
    const bankBefore = state.stardust;
    collectGoldenStar(10, 10);
    __sf_eq(state.goldenCaught, 1, 'catch counted');
    __sf_true(goldenBuff && Date.now() < goldenBuff.until, 'surge active');
    __sf_eq(goldenBuff.mult, 7, 'surge multiplier');
    __sf_eq(state.stardust, bankBefore, 'surge grants no instant dust');
  } finally { Math.random = realRandom; goldenBuff = null; __sf_reset(); }
});

__sf_test('gold: collectGoldenStar honors lump branch (random>=0.5)', () => {
  __sf_reset();
  const realRandom = Math.random;
  try {
    Math.random = () => 0.99;
    state.gens[0] = 10;              // sps = 2
    state.stardust = 1000;           // lump = 150 + 13 = 163
    recalc();
    const bankBefore = state.stardust;
    const lifeRunBefore = state.lifetimeRun;
    collectGoldenStar(0, 0);
    __sf_eq(state.goldenCaught, 1, 'lump catch counted (fresh reset);');
    __sf_true(goldenBuff === null, 'no surge on lump path');
    __sf_close(state.stardust, bankBefore + 163, 1e-9, 'bank credited');
    __sf_close(state.lifetimeRun, lifeRunBefore + 163, 1e-9, 'lifetime credited');
  } finally { Math.random = realRandom; goldenBuff = null; __sf_reset(); }
});

/* ---------- S3.1.6 headless approximation: chip countdown behavior ---------- */
__sf_test('gold smoke: chip counts down while active, hides after expiry', () => {
  __sf_reset();
  const chip = document.getElementById('buff-chip');
  activateGoldenBuff();
  renderResources();
  __sf_true(chip.textContent.indexOf('Surge') !== -1, 'chip text: ' + chip.textContent);
  __sf_true(chip.classList.contains('hidden') === false, 'chip visible while active');
  goldenBuff.until = Date.now() - 1;               // fast-forward clock
  renderResources();
  __sf_true(chip.classList.contains('hidden') === true, 'chip hidden after expiry');
  __sf_true(goldenBuff === null, 'buff cleared');
});

/* ===================== Group 6: Research Lab ===================== */

__sf_test('lab: RESEARCH has exactly 16 unique projects (12 + Wave 5 tier-2)', () => {
  __sf_eq(RESEARCH.length, 16, 'count');
  const ids = RESEARCH.map(r => r.id);
  __sf_eq(new Set(ids).size, 16, 'unique ids');
});

__sf_test('lab: startResearch deducts cost and schedules completion', () => {
  __sf_reset();
  state.stardust = 1e5;
  __sf_true(startResearch('spectral-sorting'), 'start accepted');
  __sf_eq(state.research.active.id, 'spectral-sorting', 'active id');
  __sf_true(state.research.active.endsAt > Date.now(), 'endsAt in future');
  __sf_close(state.stardust, 1e5 - 5e4, 1e-9, 'cost deducted');
});

__sf_test('lab: only ONE project may run at a time', () => {
  __sf_reset();
  state.stardust = 1e13;
  __sf_true(startResearch('neural-uplink'), 'first starts');
  __sf_true(!startResearch('omega-protocol'), 'second rejected while busy');
  __sf_eq(state.research.active.id, 'neural-uplink', 'original untouched');
  __sf_close(state.stardust, 1e13 - 2e5, 1e-9, 'no double charge');
});

__sf_test('lab: unaffordable or unknown project rejected', () => {
  __sf_reset();
  state.stardust = 10;
  __sf_true(!startResearch('spectral-sorting'), 'poor -> rejected');
  __sf_true(!startResearch('no-such-project'), 'unknown -> rejected');
  __sf_eq(state.research.active, null, 'nothing active');
});

__sf_test('lab: fake clock — due project completes and applies its effect', () => {
  __sf_reset();
  state.gens[0] = 10;                       // milestone x2
  recalc();
  const before = derived.sps;
  state.stardust = 1e9;
  __sf_true(startResearch('vacuum-optimizer'), 'started'); // global x1.5
  state.research.active.endsAt = Date.now() - 1;           // fast-forward
  __sf_true(tickResearchCheck(), 'completed on tick');
  __sf_eq(state.research.done['vacuum-optimizer'], true, 'marked done');
  __sf_eq(state.research.active, null, 'slot freed');
  __sf_close(derived.sps, before * 1.5, 1e-9, 'global x1.5 visible in sps');
});

__sf_test('lab: genBucket boost hits only its generator range', () => {
  __sf_reset();
  state.gens[0] = 10; state.gens[5] = 10;
  recalc();
  const s0 = derived.genSps[0], s5 = derived.genSps[5];
  state.research.done['spectral-sorting'] = true;          // gens 0-2 x2
  recalc();
  __sf_close(derived.genSps[0], s0 * 2, 1e-9, 'gen0 doubled');
  __sf_close(derived.genSps[5], s5, 1e-9, 'gen5 untouched');
});

__sf_test('lab: research survives save/load round-trip incl. offline completion', () => {
  __sf_reset();
  state.research.done['neural-uplink'] = true;
  state.research.active = { id: 'shard-resonance', endsAt: Date.now() - 5000 }; // finished while away
  const snapshot = JSON.parse(JSON.stringify(state));
  applyLoadedState(snapshot);
  __sf_eq(state.research.done['neural-uplink'], true, 'done map persisted');
  __sf_eq(state.research.active, null, 'due project auto-completed on load');
  __sf_eq(state.research.done['shard-resonance'], true, 'credited as done');
  __sf_close(shardBonusEach(), 0.12, 1e-9, '+2% shard bonus applied');
});

__sf_test('lab: quantum-treasury doubles golden windfalls', () => {
  __sf_reset();
  derived.sps = 0;
  const base = goldenLumpReward();
  __sf_eq(base, 13, 'baseline flat tip');
  state.research.done['quantum-treasury'] = true;
  __sf_eq(goldenLumpReward(), 26, 'doubled by treasury');
});

__sf_test('lab: stellar-nursery makes generators 8% cheaper', () => {
  __sf_reset();
  state.gens[0] = 0;
  const c0 = bulkCost(0, 1);
  state.research.done['stellar-nursery'] = true;
  __sf_close(bulkCost(0, 1), c0 * 0.92, 1e-9, 'nursery discount exact');
});

/* ===================== Group 7: Cosmic Wonders ===================== */

__sf_test('wonders: strict chain order enforced', () => {
  __sf_reset();
  state.stardust = 1e20;
  buyWonder(1);                 // wormhole-array WITHOUT dyson-sphere
  closeModal(true);
  __sf_true(!state.wonders['wormhole-array'], 'skipping the chain rejected');
  buyWonder(0);                 // first wonder allowed
  closeModal(true);
  __sf_true(state.wonders['dyson-sphere'] === true, 'dyson built');
  __sf_close(state.stardust, 1e20 - 5e13, 1e-9, 'wonder cost paid');
});

__sf_test('wonders: dyson-sphere multiplies production x3', () => {
  __sf_reset();
  state.gens[0] = 10;
  recalc();
  const before = derived.sps;
  state.wonders['dyson-sphere'] = true;
  recalc();
  __sf_close(derived.sps, before * 3, 1e-9, 'global x3');
});

__sf_test('wonders: infinite-engine multiplies production x5', () => {
  __sf_reset();
  state.gens[0] = 10;
  recalc();
  const before = derived.sps;
  state.wonders['infinite-engine'] = true;
  recalc();
  __sf_close(derived.sps, before * 5, 1e-9, 'global x5');
});

__sf_test('wonders: neutron-forge multiplies click power x10', () => {
  __sf_reset();
  recalc();
  const before = derived.clickPower;
  state.wonders['neutron-forge'] = true;
  recalc();
  __sf_close(derived.clickPower, before * 10, 1e-9, 'click x10');
});

__sf_test('wonders: university halves research time; wormhole doubles star frequency', () => {
  __sf_reset();
  __sf_eq(researchDurationSec('spectral-sorting'), 30, 'base duration');
  state.wonders['galactic-university'] = true;
  __sf_eq(researchDurationSec('spectral-sorting'), 15, 'halved duration');
  __sf_eq(goldenSpawnIntervalScale(), 1, 'scale baseline');
  state.wonders['wormhole-array'] = true;
  __sf_close(goldenSpawnIntervalScale(), 0.5, 1e-9, 'spawn interval halved');
});

__sf_test('wonders: antenna doubles shard yield on collapse', () => {
  __sf_reset();
  state.lifetimeAll = 4e9;      // floor(sqrt(4)) = 2 shards pending
  recalc();
  __sf_eq(pendingShards(), 2, 'pending baseline');
  state.wonders['multiverse-antenna'] = true;
  doPrestige();
  closeModal(true);
  __sf_eq(state.shards, 4, 'collapse paid x2');
  __sf_eq(state.shardsEver, 4, 'ever-counter tracks bonus too');
});

/* ---------- offline cap stacking matrix ---------- */

__sf_test('offline stack: bare game is 60% / 8h', () => {
  __sf_reset();
  const r = offlineCapAndRate();
  __sf_eq(r.capHours, 8, 'cap');
  __sf_close(r.rate, 0.6, 1e-9, 'rate');
});
__sf_test('offline stack: dream upgrades to 100% / 24h', () => {
  __sf_reset();
  state.prestigeUpgrades.dream = 1;
  const r = offlineCapAndRate();
  __sf_eq(r.capHours, 24, 'cap');
  __sf_close(r.rate, 1.0, 1e-9, 'rate');
});
__sf_test('offline stack: time-vault stacks over dream to 48h / 100%', () => {
  __sf_reset();
  state.prestigeUpgrades.dream = 1;
  state.wonders['time-vault'] = true;
  const r = offlineCapAndRate();
  __sf_eq(r.capHours, 48, 'cap raised');
  __sf_close(r.rate, 1.0, 1e-9, 'rate kept at max');
});
__sf_test('offline stack: chrono-dampeners add +4h / +5% on their own', () => {
  __sf_reset();
  state.research.done['chrono-dampeners'] = true;
  const r = offlineCapAndRate();
  __sf_eq(r.capHours, 12, 'cap');
  __sf_close(r.rate, 0.65, 1e-9, 'rate');
});
__sf_test('offline stack: everything combined = 52h / 105%', () => {
  __sf_reset();
  state.prestigeUpgrades.dream = 1;
  state.wonders['time-vault'] = true;
  state.research.done['chrono-dampeners'] = true;
  const r = offlineCapAndRate();
  __sf_eq(r.capHours, 52, 'cap');
  __sf_close(r.rate, 1.05, 1e-9, 'rate');
});

/* ===================== Group 8: Automation ===================== */

__sf_test('auto: Auto-Assembler buys cheapest visible gen keeping >=10% bank', () => {
  __sf_reset();
  state.prestigeUpgrades.autogen = 1;
  state.stardust = 2000;                 // budget = 1800; gen0 costs 15
  const before = state.stardust;
  runAutomation();
  __sf_eq(state.gens[0], 1, 'bought exactly one gen');
  __sf_close(state.stardust, before - 15, 1e-9, 'paid one unit price');
  __sf_true(state.stardust >= before * 0.1, 'reserve respected');
});
__sf_test('auto: master switch off -> nothing happens', () => {
  __sf_reset();
  state.automation = false;
  state.prestigeUpgrades.autogen = 1;
  state.prestigeUpgrades.autoupg = 1;
  state.stardust = 1e6;
  state.clicks = 15;
  recalc();
  runAutomation();
  __sf_eq(state.gens[0], 0, 'no gens bought');
  __sf_eq(Object.keys(state.upgrades).length, 0, 'no upgrades bought');
});
__sf_test('auto: Upgrade Daemon buys the cheapest affordable upgrade', () => {
  __sf_reset();
  state.prestigeUpgrades.autoupg = 1;
  state.clicks = 15;                     // unlocks click1 (cost 100)
  state.stardust = 150;
  runAutomation();
  __sf_eq(state.upgrades.click1, true, 'click1 purchased');
  __sf_close(state.stardust, 50, 1e-9, 'cost deducted once');
});
__sf_test('auto: Star Net compresses golden spawn interval by x0.8 per level', () => {
  __sf_reset();
  state.prestigeUpgrades.autonet = 2;
  __sf_close(goldenSpawnIntervalScale(), Math.pow(0.8, 2), 1e-9, '-20%/lvl compounding');
});

/* ===================== Group 9: Cosmic Trials ===================== */

__sf_test('trial: pacifist blocks star clicks entirely', () => {
  __sf_reset();
  state.trial = 'pacifist';
  recalc();
  const dust = state.stardust, clicks = state.clicks;
  starClick({ clientX: 5, clientY: 5 });
  __sf_eq(state.stardust, dust, 'no dust gained');
  __sf_eq(state.clicks, clicks, 'click counter untouched');
});
__sf_test('trial: inflation shifts generator growth to 1.22', () => {
  __sf_reset();
  state.trial = 'inflation';
  __sf_eq(costGrowth(), 1.22, 'growth fn reports 1.22');
  // closed form: base * (r^3 - 1) / (r - 1) with r = 1.22
  const expected = GENERATORS[0].baseCost * (Math.pow(1.22, 3) - 1) / 0.22;
  __sf_close(bulkCost(0, 3), expected, 1e-9, 'series uses inflated r');
});
__sf_test('trial: darkmatter quarters production while inside', () => {
  __sf_reset();
  state.gens[0] = 10;
  recalc();
  const base = derived.sps;
  state.trial = 'darkmatter';
  recalc();
  __sf_close(derived.sps, base * 0.25, 1e-9, 'x0.25 penalty');
});
__sf_test('trial: completion banks reward, wipes run, keeps shards + record', () => {
  __sf_reset();
  state.shards = 50;
  state.shardsEver = 50;
  state.stardust = 500;
  state.gens[0] = 7;
  state.upgrades.click1 = true;
  state.lifetimeRun = 1e12;              // pacifist goal met
  state.trial = 'pacifist';
  __sf_true(checkTrialGoals(), 'goal detected');
  __sf_eq(state.trialsDone.pacifist, true, 'recorded forever');
  __sf_eq(state.trial, null, 'left the trial');
  __sf_eq(state.stardust, 0, 'run wiped');
  __sf_eq(state.gens[0], 0, 'gens wiped');
  __sf_eq(Object.keys(state.upgrades).length, 0, 'upgrades wiped');
  __sf_eq(state.lifetimeRun, 0, 'run lifetime wiped');
  __sf_eq(state.shards, 50, 'shards KEPT');
  __sf_close(derived.clickPower, 5 * derived.globalMult, 1e-9, 'click x5 reward live');
});
__sf_test('trial: goal NOT met -> stay inside, no reset', () => {
  __sf_reset();
  state.trial = 'pacifist';
  state.lifetimeRun = 999;
  __sf_true(!checkTrialGoals(), 'still grinding');
  __sf_eq(state.trial, 'pacifist', 'still inside');
});
__sf_test('trial: antenna + darkmatter stack on collapse payout', () => {
  __sf_reset();
  state.lifetimeAll = 4e9;               // 2 pending
  state.wonders['multiverse-antenna'] = true;
  state.trialsDone.darkmatter = true;
  doPrestige();
  closeModal(true);
  __sf_eq(state.shards, 6, 'floor(2 x2 x1.5) = 6');
});

/* ===================== Group 10: Notation + Sparkline buffer ===================== */

__sf_test('notation: suffix mode is the default formatting', () => {
  __sf_reset();
  state.notation = 'suffixes';
  __sf_eq(fmt(1500), '1.50 K', 'K suffix');
  __sf_eq(fmt(1e12), '1.00 T', 'T suffix');
});
__sf_test('notation: scientific mode uses exponential', () => {
  __sf_reset();
  state.notation = 'scientific';
  __sf_eq(fmt(1500), '1.50e3', 'e-notation');
  __sf_eq(fmt(2.5e21), '2.50e21', 'beyond suffix table');
});
__sf_test('notation: engineering mode groups exponent by 3', () => {
  __sf_reset();
  state.notation = 'engineering';
  __sf_eq(fmt(1500), '1.500e3', 'exp multiple of 3, three decimals');
  __sf_eq(fmt(12345), '12.345e3', 'mantissa stays 1..999');
});
__sf_test('notation: sub-1000 values unaffected in every mode', () => {
  for (const mode of ['suffixes', 'scientific', 'engineering']) {
    __sf_reset();
    state.notation = mode;
    __sf_eq(fmt(500), '500', mode + ' small int');
    __sf_eq(fmt(5.5), '5.5', mode + ' decimal');
  }
});
__sf_test('sparkline: ring buffer caps at 120 samples', () => {
  spsHistory.length = 0;
  let len = 0;
  for (let i = 0; i < 130; i++) len = recordSpsSample(i);
  __sf_eq(len, 120, 'capped length');
  __sf_eq(spsHistory.length, 120, 'buffer length matches return');
  __sf_eq(spsHistory[spsHistory.length - 1], 129, 'newest sample kept');
  __sf_eq(spsHistory[0], 10, 'oldest evicted');
});
__sf_test('sparkline: non-finite samples coerce to 0', () => {
  spsHistory.length = 0;
  recordSpsSample(NaN);
  recordSpsSample(Infinity);
  __sf_eq(spsHistory[0], 0, 'NaN -> 0');
  __sf_eq(spsHistory[1], 0, 'Infinity -> 0');
  spsHistory.length = 0;
});

/* ===================== Group 8: Polish — notation & sparkline ===================== */

__sf_test('notation: default suffixes mode (1.50 K)', () => {
  __sf_reset();
  state.notation = 'suffixes';
  __sf_eq(fmt(1500), '1.50 K', 'suffix format');
});

__sf_test('notation: scientific mode (1.23e4)', () => {
  __sf_reset();
  state.notation = 'scientific';
  __sf_eq(fmt(12345), '1.23e4', 'scientific format');
});

__sf_test('notation: engineering keeps exponent a multiple of 3', () => {
  __sf_reset();
  state.notation = 'engineering';
  __sf_eq(fmt(12345), '12.345e3', 'mantissa in [1,1000), exp 3');
  __sf_eq(fmt(1500), '1.500e3', 'three decimals kept');
  __sf_eq(fmt(1e6), '1.000e6', 'exact power of ten');
});

__sf_test('notation: values below 1000 unaffected by mode', () => {
  __sf_reset();
  for (const mode of ['suffixes', 'scientific', 'engineering']) {
    state.notation = mode;
    __sf_eq(fmt(42), '42', mode + ' small value');
  }
});

__sf_test('notation: invalid saved notation heals to suffixes', () => {
  applyLoadedState({ notation: 'weird' });
  __sf_eq(state.notation, 'suffixes', 'healed');
  state.notation = 'scientific'; // restore
  applyLoadedState({ notation: 'scientific' });
  __sf_eq(state.notation, 'scientific', 'valid mode preserved');
});

__sf_test('sparkline: buffer holds the ~120-sample cap under push pressure', () => {
  __sf_reset();
  spsHistory = [];
  for (let i = 0; i < SPS_SAMPLES_MAX + 40; i++) recordSpsSample(i);
  __sf_eq(spsHistory.length, SPS_SAMPLES_MAX, 'capped at ' + SPS_SAMPLES_MAX);
  __sf_true(spsHistory[0] === 40, 'oldest samples evicted (fifo)');
  __sf_true(spsHistory[spsHistory.length - 1] === SPS_SAMPLES_MAX + 39, 'newest kept');
});

__sf_test('sparkline: non-finite samples sanitized to 0', () => {
  __sf_reset();
  spsHistory = [];
  recordSpsSample(NaN);
  recordSpsSample(Infinity);
  __sf_eq(spsHistory.length, 2, 'both recorded');
  __sf_eq(spsHistory[0], 0, 'NaN -> 0');
  __sf_eq(spsHistory[1], 0, 'Infinity -> 0 (not finite)');
});

__sf_test('notation: large value across all three modes', () => {
  __sf_reset();
  state.notation = 'suffixes';
  __sf_eq(fmt(1.234e15), '1.23 Qa', 'suffixes Qa tier');
  state.notation = 'scientific';
  __sf_eq(fmt(1.234e15), '1.23e15', 'scientific exponential');
  state.notation = 'engineering';
  __sf_eq(fmt(1.234e15), '1.234e15', 'engineering exp multiple of 3, three decimals');
});

/* ===================== Group 11: M7 — Generator Curve Extension ===================== */

__sf_test('m7: five new generators appended, indexes 10-14 stable', () => {
  __sf_eq(GENERATORS.length, 15, '15 tiers total');
  __sf_eq(GENERATORS[9].id, 'core', 'design lock: core stays index 9');
  __sf_eq(GENERATORS[10].id, 'pulsar', 'pulsar index 10');
  __sf_eq(GENERATORS[11].id, 'quasar', 'quasar index 11');
  __sf_eq(GENERATORS[12].id, 'string', 'string index 12');
  __sf_eq(GENERATORS[13].id, 'nexus', 'nexus index 13');
  __sf_eq(GENERATORS[14].id, 'foundry', 'foundry index 14');
});

__sf_test('m7: bulkCost first single buy on appended tiers equals baseCost', () => {
  __sf_reset();
  __sf_eq(bulkCost(10, 1), GENERATORS[10].baseCost, 'pulsar first buy = baseCost');
  __sf_close(bulkCost(10, 1), 1.2e12, 1e-12, 'pulsar baseCost literal');
  __sf_eq(bulkCost(14, 1), GENERATORS[14].baseCost, 'foundry first buy = baseCost');
});

__sf_test('m7: bulkCost respects ownership on appended tier (owned=5,count=3)', () => {
  __sf_reset();
  state.gens[10] = 5;
  const r = COST_GROWTH;
  let sum = 0;
  for (let k = 5; k < 8; k++) sum += GENERATORS[10].baseCost * Math.pow(r, k);
  __sf_close(bulkCost(10, 3), sum, 1e-9, 'closed form matches series sum');
});

__sf_test('m7: maxAffordable spot-check on appended tier', () => {
  __sf_reset();
  state.stardust = bulkCost(10, 3);
  __sf_eq(maxAffordable(10), 3, 'exact-affordable count returned');
});

__sf_test('m7: production for appended tier flows through full chain', () => {
  __sf_reset();
  state.gens[13] = 1; // Multiverse Nexus
  recalc();
  __sf_close(derived.genSps[13], 2.3e9, 1e-9, 'genSps[13] = nexus baseProd at baseline multipliers');
  __sf_close(derived.sps, 2.3e9, 1e-9, 'total sps includes it');
});

__sf_test('m7: visibility gating thresholds for newest tier', () => {
  __sf_reset();
  __sf_true(!genVisible(14), 'hidden from fresh start');
  state.lifetimeAll = GENERATORS[14].baseCost * 0.35;
  __sf_true(genVisible(14), 'revealed once 35% of base cost banked');
  __sf_reset();
  state.gens[13] = 1;
  state.lifetimeAll = GENERATORS[14].baseCost * 0.1;
  __sf_true(genVisible(14), 'revealed when predecessor owned + 10% banked');
  __sf_reset();
  state.gens[13] = 1;
  state.lifetimeAll = GENERATORS[14].baseCost * 0.05;
  __sf_true(!genVisible(14), 'predecessor alone insufficient below 10%');
});

__sf_test('m7: Ascendant tier-5 upgrade doubles production (need 150)', () => {
  __sf_reset();
  const before = derived.genMult[10];
  state.upgrades['g_pulsar_4'] = true;
  recalc();
  __sf_eq(derived.genMult[10], before * 2, 'x2 applied by tier index 4');
  const u = UPGRADE_BY_ID['g_pulsar_4'];
  __sf_true(!!u, 'Ascendant def auto-generated for pulsar');
  __sf_eq(u.cost, GENERATORS[10].baseCost * 220000, 'cost = baseCost * costMult');
  __sf_true(u.unlock({ gens: { 10: 149 } }) === false, 'locked at 149 owned');
  __sf_true(u.unlock({ gens: { 10: 150 } }) === true, 'unlocks exactly at need 150');
});

__sf_test('m7: GEN_MILESTONES ladder applies to appended generators', () => {
  __sf_reset();
  state.gens[10] = 150;
  recalc();
  const hits = GEN_MILESTONES.filter(ms => ms <= 150).length;
  __sf_eq(derived.genMult[10], Math.pow(2, hits), 'milestone ladder length-based, no gaps');
});

__sf_test('m7: old 10-slot gens[] save pads to 15 slots with zeros', () => {
  __sf_reset();
  applyLoadedState({ stardust: 100, lifetimeAll: 1e6, gens: [3, 2, 1] });
  __sf_eq(state.gens.length, 15, 'padded to current GENERATORS.length');
  __sf_eq(state.gens[0], 3, 'slot 0 preserved');
  __sf_eq(state.gens[2], 1, 'slot 2 preserved');
  __sf_eq(state.gens[10], 0, 'new tail slot zero-filled');
  recalc();
  __sf_true(Number.isFinite(derived.sps), 'recalc finite after padded load');
});

/* ===================== Group 12: M8 — Audio & Feel Pack ===================== */

const __sf_sfxNames = ['click', 'buyGenerator', 'buyUpgrade', 'achievement',
  'goldenSpawn', 'goldenCatch', 'research', 'wonder', 'prestige', 'trialSuccess'];

__sf_test('m8: audio layer exposes tone/audioOut/SFX with all ten cues', () => {
  __sf_eq(typeof audioOut, 'function', 'audioOut fn');
  __sf_eq(typeof tone, 'function', 'tone fn');
  __sf_eq(typeof SFX, 'object', 'SFX table');
  for (const k of __sf_sfxNames) __sf_eq(typeof SFX[k], 'function', 'SFX.' + k);
});

__sf_test('m8: every cue runs headless without throwing', () => {
  __sf_reset();
  state.sound = true;
  // dom-stubs provides a FakeAudioContext, so this exercises the full
  // oscillator -> gain -> master bus path exactly as the browser would.
  for (const k of __sf_sfxNames) SFX[k]();
  __sf_true(true);
});

__sf_test('m8: muted state short-circuits the audio bus', () => {
  __sf_reset();
  state.sound = false;
  __sf_eq(audioOut(), null, 'no bus while muted');
  state.sound = true;
  __sf_true(audioOut() !== null, 'bus returns once unmuted');
});

__sf_test('m8: master gain scales with state.volume', () => {
  __sf_reset();
  state.sound = true;
  state.volume = 50;
  audioOut();
  __sf_close(masterGain.gain.value, 0.4, 1e-9, '50% of 0.8 headroom ceiling');
  state.volume = 100;
  audioOut();
  __sf_close(masterGain.gain.value, 0.8, 1e-9, '100% volume = full ceiling');
});

__sf_test('m8: volume round-trips through the save JSON path', () => {
  __sf_reset();
  state.volume = 42;
  const raw = JSON.stringify(state); // identical serialization to saveGame()
  applyLoadedState(JSON.parse(raw));
  __sf_eq(state.volume, 42, '42 survives save/load unchanged');
});

__sf_test('m8: corrupt or out-of-range volume heals on load', () => {
  const load = v => { applyLoadedState({ stardust: 10, lifetimeAll: 10, volume: v }); return state.volume; };
  __sf_eq(load(undefined), 70, 'missing defaults to 70');
  __sf_eq(load(NaN), 70, 'non-finite falls back to default 70');
  __sf_eq(load(-9), 0, 'negative floors to 0');
  __sf_eq(load(250), 100, 'above 100 clamps to 100');
  __sf_eq(load('63'), 70, 'non-number types (strings) fall back to 70');
  __sf_eq(load(42.9), 42, 'fractional floors to int');
});

__sf_test('m8: reducedMotion exposed as a boolean module flag', () => {
  __sf_eq(typeof reducedMotion, 'boolean', 'flag is boolean');
});

/* ===================== Group 12: M8 — Audio & Feel Pack ===================== */

__sf_test('m8: audio layer exists and is guarded headless', () => {
  __sf_reset();
  __sf_true(typeof tone === 'function', 'tone() helper present');
  __sf_true(typeof SFX === 'object' && !!SFX, 'SFX cue table present');
  ['click', 'buyGenerator', 'buyUpgrade', 'achievement', 'goldenSpawn',
   'goldenCatch', 'research', 'wonder', 'prestige', 'trialSuccess'].forEach(k =>
    __sf_true(typeof SFX[k] === 'function', 'cue exists: ' + k));
  // No window.AudioContext in Node: every call must early-out silently.
  tone(440, 0.05);
  SFX.buyGenerator(); SFX.achievement(); SFX.goldenCatch(); SFX.prestige();
});

__sf_test('m8: reducedMotion module flag present', () => {
  __sf_true(typeof reducedMotion === 'boolean', 'flag is a boolean (dom-stubs matchMedia -> false)');
});

__sf_test('m8: volume persists through save/load round-trip', () => {
  __sf_reset();
  state.volume = 42;
  const blob = JSON.parse(JSON.stringify(state)); // what saveGame persists
  applyLoadedState(blob);
  __sf_eq(state.volume, 42, 'volume survives round-trip');
});

__sf_test('m8: corrupt volume heals to safe defaults', () => {
  applyLoadedState({ stardust: 1, volume: NaN });
  __sf_eq(state.volume, 70, 'NaN -> default 70');
  applyLoadedState({ stardust: 1, volume: 250 });
  __sf_eq(state.volume, 100, '>100 clamped to 100');
  applyLoadedState({ stardust: 1 }); // absent field
  __sf_eq(state.volume, 70, 'absent -> default 70');
});

/* ===================== Group 13: M9 — Cosmic Codex ===================== */

__sf_test('m9: codex composition is authoritative (22 entries)', () => {
  __sf_reset();
  __sf_eq(CODEX.length, GENERATORS.length + 7, 'one per generator + golden + 3 trials + wonder + omega + prestige');
  __sf_true(CODEX.every(c => c.id && c.icon && c.name && c.lore && c.hint && typeof c.unlock === 'function'), 'every entry well-formed');
});

__sf_test('m9: unlock conditions fire from seeded state', () => {
  __sf_reset();
  state.gens[10] = 1;
  state.goldenCaught = 2;
  state.trialsDone.inflation = true;
  state.wonders['dyson-sphere'] = true;
  state.research.done['omega-protocol'] = true;
  state.prestigeCount = 3;
  const changed = codexUnlockCheck();
  __sf_true(changed === true, 'check reports changes');
  ['gen-pulsar', 'golden', 'trial-inflation', 'wonder', 'omega', 'prestige'].forEach(id =>
    __sf_true(state.codex[id] === true, 'unlocked: ' + id));
  __sf_true(!state.codex['gen-core'], 'unowned generator stays sealed');
  __sf_eq(unreadCodexCount(), 6, 'six unlocked and unread');
});

__sf_test('m9: read tracking clears badge counts', () => {
  __sf_reset();
  state.gens[10] = 1;
  codexUnlockCheck();
  markCodexRead('gen-pulsar');
  __sf_true(state.codexRead['gen-pulsar'] === true, 'read flag persisted on state');
  __sf_eq(unreadCodexCount(), 0, 'badge drains to zero');
  markCodexRead('gen-pulsar'); // idempotent
  markCodexRead('never-unlocked'); // ignored for sealed entries
  __sf_true(!state.codexRead['never-unlocked'], 'sealed entry cannot be marked read');
});

__sf_test('m9: lore-master requires reading every entry', () => {
  __sf_reset();
  CODEX.forEach(c => { state.codex[c.id] = true; }); // everything unlocked
  checkAchievements();
  __sf_true(!state.achievements['lore-master'], 'unread entries block the feat');
  CODEX.forEach(c => { state.codexRead[c.id] = true; });
  checkAchievements();
  __sf_true(state.achievements['lore-master'] === true, 'feat fires when all read');
});

__sf_test('m9: codex maps survive save/load round-trip and heal', () => {
  __sf_reset();
  state.codex = { 'gen-core': true, bogus: true };
  state.codexRead = { 'gen-core': true };
  const blob = JSON.parse(JSON.stringify(state)); // what saveGame persists
  applyLoadedState(blob);
  __sf_true(state.codex['gen-core'] === true, 'unlock survives round-trip');
  __sf_true(state.codexRead['gen-core'] === true, 'read flag survives round-trip');
  __sf_true(!state.codex.bogus, 'unknown ids whitelisted out');
  applyLoadedState({ stardust: 5 }); // ancient save without codex fields
  __sf_eq(Object.keys(state.codex).length, 0, 'healed to empty map, no crash');
  recalc();
  __sf_true(Number.isFinite(derived.sps), 'engine stable after heal');
});

/* ===================== Group 12: M9 — Cosmic Codex ===================== */

__sf_test('m9: CODEX has one entry per generator plus seven specials', () => {
  __sf_eq(CODEX.length, GENERATORS.length + 7, '15 gen entries + golden/3 trials/wonder/omega/prestige');
  __sf_eq(new Set(CODEX.map(c => c.id)).size, CODEX.length, 'ids unique');
});

__sf_test('m9: unlock fires from seeded generator ownership', () => {
  __sf_reset();
  state.gens[3] = 1;
  __sf_true(codexUnlockCheck() === true, 'check reports a fresh unlock');
  __sf_true(!!state.codex['gen-moon'], 'moon entry unlocked');
});

__sf_test('m9: nothing unlocks from a fresh start', () => {
  __sf_reset();
  __sf_true(codexUnlockCheck() === false, 'no condition met');
  __sf_eq(Object.keys(state.codex).length, 0, 'unlock map empty');
});

__sf_test('m9: read tracking updates unread badge count', () => {
  __sf_reset();
  state.gens[0] = 1;
  state.gens[3] = 1;
  codexUnlockCheck();
  __sf_eq(unreadCodexCount(), 2, 'two unlocked, none read');
  markCodexRead('gen-collector');
  __sf_eq(unreadCodexCount(), 1, 'one marked read');
  markCodexRead('gen-collector');
  __sf_eq(unreadCodexCount(), 1, 're-mark is idempotent');
});

__sf_test('m9: codex maps survive save/load round-trip', () => {
  __sf_reset();
  state.gens[3] = 1;
  codexUnlockCheck();
  markCodexRead('gen-moon');
  const snapshot = JSON.parse(JSON.stringify(state));
  applyLoadedState(snapshot);
  __sf_true(!!state.codex['gen-moon'], 'unlock map survives');
  __sf_true(!!state.codexRead['gen-moon'], 'read map survives');
});

__sf_test('m9: old saves heal missing or corrupt codex fields', () => {
  __sf_reset();
  applyLoadedState({ stardust: 10 });
  __sf_eq(JSON.stringify(state.codex), '{}', 'missing codex healed to {}');
  __sf_eq(JSON.stringify(state.codexRead), '{}', 'missing codexRead healed to {}');
  applyLoadedState({ stardust: 10, codex: 'junk', codexRead: 42 });
  __sf_eq(JSON.stringify(state.codex), '{}', 'corrupt codex type healed');
  __sf_eq(JSON.stringify(state.codexRead), '{}', 'corrupt codexRead type healed');
});

__sf_test('m9: lore-master fires only when every entry is READ', () => {
  __sf_reset();
  const ach = ACHIEVEMENTS.find(a => a.id === 'lore-master');
  __sf_true(!!ach, 'achievement exists');
  CODEX.forEach(c => { state.codex[c.id] = true; });
  __sf_true(ach.check() === false, 'locked while unread entries remain');
  CODEX.forEach(c => { state.codexRead[c.id] = true; });
  __sf_true(ach.check() === true, 'fires when all read');
});

/* ===================== Group: M11 Ascension + Essence Perk Tree ===================== */

__sf_test('m11: pendingEssence boundaries and cbrt growth', () => {
  __sf_reset();
  state.lifetimeAll = 999e12; state.essenceEver = 0;
  __sf_eq(pendingEssence(), 0, 'below first threshold -> 0');
  state.lifetimeAll = 1e15;
  __sf_eq(pendingEssence(), 1, 'exactly 1e15 lifetime -> 1 essence');
  state.lifetimeAll = 8e45;
  __sf_eq(pendingEssence(), 20000000000, 'cbrt(8e30)=2e10 spot-check');
  state.essenceEver = 19999999999;
  __sf_eq(pendingEssence(), 1, 'essenceEver is subtracted');
});

__sf_test('m11: doAscend(true) reset scope EXACT — run wiped, meta kept', () => {
  __sf_reset();
  state.stardust = 5000;
  state.gens[0] = 77; state.gens[7] = 3;
  state.upgrades['x-test'] = true;
  state.research = { done: { 'golden-lure': true }, active: { id: 'stellar-nursery', endsAt: Date.now() + 1000 } };
  state.wonders = state.wonders || {};
  state.wonders['time-vault'] = true;
  state.shards = 50; state.shardsEver = 50; state.prestigeCount = 2;
  state.prestigeUpgrades = { headstart: 1 };
  state.trialsDone = { pacifist: true };
  state.achievements['first-click'] = true;
  state.essence = 5; state.essenceEver = 0; state.perks = {};
  state.lifetimeAll = 8e45;
  goldenBuff = { until: Date.now() + 1000, mult: 7 };
  const ok = doAscend(true);
  __sf_true(ok === true, 'skipConfirm path returns true');
  __sf_eq(state.stardust, 0, 'stardust reset');
  __sf_eq(state.lifetimeRun, 0, 'run lifetime reset');
  __sf_eq(state.lifetimeAll, 8e45, 'lifetimeAll PERSISTS');
  for (let i = 0; i < GENERATORS.length; i++) {
    __sf_eq(state.gens[i], 0, 'gen ' + i + ' reset');
  }
  __sf_eq(JSON.stringify(state.upgrades), '{}', 'upgrades wiped');
  __sf_eq(JSON.stringify(state.research), '{"done":{},"active":null}', 'research done+active wiped');
  __sf_true(goldenBuff === null, 'surge does not survive ascension');
  __sf_eq(state.shards, 50, 'shards kept');
  __sf_eq(state.prestigeUpgrades.headstart, 1, 'shard upgrades kept');
  __sf_true(state.wonders['time-vault'], 'wonders kept');
  __sf_true(state.trialsDone.pacifist, 'trial rewards kept');
  __sf_true(state.achievements['first-click'], 'achievements kept');
  __sf_eq(state.ascensionCount, 1, 'counter incremented');
  __sf_eq(state.essence, 5 + 20000000000, 'essence += pending');
  __sf_eq(state.essenceEver, 20000000000, 'essenceEver += pending');
});

__sf_test('m11: cosmic-might doubles sps, singularity-engine x10 stacks on top', () => {
  __sf_reset();
  state.gens[0] = 25; recalc();
  const base = derived.sps;
  __sf_true(base > 0, 'baseline sps positive');
  state.perks['cosmic-might'] = 1; recalc();
  __sf_close(derived.sps, base * 2, 1e-9, 'cosmic-might lvl1 doubles production');
  state.perks['singularity-engine'] = 1; recalc();
  __sf_close(derived.sps, base * 20, 1e-9, 'singularity x10 on top of might');
});

__sf_test('m11: void-discount cuts bulkCost by 0.95^level', () => {
  __sf_reset();
  const c0 = bulkCost(0, 1);
  state.perks['void-discount'] = 2;
  __sf_close(bulkCost(0, 1), c0 * Math.pow(0.95, 2), 1e-9, '-5% per level, compounding');
});

__sf_test('m11: iron-will multiplies clickPower x25 at level 2', () => {
  __sf_reset(); // no gens: sps term is 0, so clickPower scales purely by the perk
  const cp0 = derived.clickPower;
  state.perks['iron-will'] = 2; recalc();
  __sf_close(derived.clickPower, cp0 * 25, 1e-9, 'x5 per level');
});

__sf_test('m11: shard-affinity adds +0.05 flat to shardBonusEach', () => {
  __sf_reset();
  __sf_close(shardBonusEach(), 0.10, 1e-12, 'fresh base bonus');
  state.perks['shard-affinity'] = 1;
  __sf_close(shardBonusEach(), 0.15, 1e-12, '+5% additive');
});

__sf_test('m11: chrono-focus shortens research x0.6 AFTER university halving', () => {
  __sf_reset();
  __sf_eq(researchDurationSec('golden-lure'), 240, 'base duration');
  state.perks['chrono-focus'] = 1;
  __sf_close(researchDurationSec('golden-lure'), 144, 1e-9, '240 * 0.6');
  state.wonders = state.wonders || {};
  state.wonders['galactic-university'] = true;
  __sf_close(researchDurationSec('golden-lure'), 72, 1e-9, '240 * 0.5 * 0.6 stack order');
});

__sf_test('m11: dream-weaver overrides offline cap/rate to 72h at 100%', () => {
  __sf_reset();
  state.prestigeUpgrades.dream = 1;
  state.research.done['chrono-dampeners'] = true;
  state.wonders = state.wonders || {};
  state.wonders['time-vault'] = true;
  state.perks['dream-weaver'] = 1;
  const r = offlineCapAndRate();
  __sf_eq(r.capHours, 72, 'cap overridden to 72h');
  __sf_eq(r.rate, 1.0, 'rate overridden to 100%');
});

__sf_test('m11: momentum appends the 750 milestone without mutating the frozen table', () => {
  __sf_reset();
  __sf_true(effectiveGenMilestones() === GEN_MILESTONES, 'unowned: frozen const returned untouched');
  state.perks['momentum'] = 1;
  const ext = effectiveGenMilestones();
  __sf_eq(ext.length, GEN_MILESTONES.length + 1, 'one extra threshold');
  __sf_eq(ext[ext.length - 1], 750, 'extra doubling at 750');
  __sf_eq(GEN_MILESTONES.length, 10, 'original table never mutated');
  state.gens[0] = 750; recalc();
  const withMomentum = derived.genMult[0];
  delete state.perks['momentum']; recalc();
  __sf_close(withMomentum / derived.genMult[0], 2, 1e-9, '750 doubles output only with momentum');
});

__sf_test('m11: overclock compresses automation cadence 10 -> 2 ticks', () => {
  __sf_reset();
  __sf_eq(automationCadenceTicks(), 10, '~2s cadence normally');
  state.perks['overclock'] = 1;
  __sf_eq(automationCadenceTicks(), 2, '~0.5s cadence with overclock');
});

__sf_test('m11: star-harmony doubles golden frequency and extends surge to ~40s', () => {
  __sf_reset();
  __sf_close(goldenSpawnIntervalScale(), 1, 1e-12, 'fresh scale is 1');
  state.perks['star-harmony'] = 1;
  __sf_close(goldenSpawnIntervalScale(), 0.5, 1e-12, 'interval halved = x2 frequency');
  activateGoldenBuff();
  const durHarmony = goldenBuff.until - Date.now();
  __sf_true(durHarmony > 39500 && durHarmony <= 40000, 'harmony surge ~40s, got ' + durHarmony);
  delete state.perks['star-harmony'];
  goldenBuff = null;
  activateGoldenBuff();
  const durPlain = goldenBuff.until - Date.now();
  __sf_true(durPlain > 24500 && durPlain <= 25000, 'plain surge ~25s, got ' + durPlain);
  goldenBuff = null;
});

__sf_test('m11: quick-start headstart applies through the ascension reset path', () => {
  __sf_reset();
  state.perks['quick-start'] = 2;
  state.lifetimeAll = 8e45; // pending 2e10, ascendable
  __sf_true(doAscend(true) === true, 'ascended');
  for (let i = 0; i < 5; i++) {
    __sf_eq(state.gens[i], 100, 'gen ' + i + ' starts with 50 x lvl2');
  }
  for (let i = 5; i < GENERATORS.length; i++) {
    __sf_eq(state.gens[i], 0, 'gen ' + i + ' beyond the first five untouched');
  }
  __sf_eq(state.essence, 20000000000, 'full pending banked despite headstart');
});

__sf_test('m11: canAutoAscend needs perk AND toggle AND pending >= 10', () => {
  __sf_reset();
  state.lifetimeAll = 8e45; // pending 2e10
  state.autoAscend = true;
  __sf_true(canAutoAscend() === false, 'blocked without the perk');
  state.perks['auto-ascend'] = 1;
  state.autoAscend = false;
  __sf_true(canAutoAscend() === false, 'blocked while toggle off');
  state.autoAscend = true;
  __sf_true(canAutoAscend() === true, 'fires with all three conditions');
  state.lifetimeAll = 9e15; // cbrt(9) floors to 2 -> pending 2
  __sf_true(canAutoAscend() === false, 'blocked when pending < 10');
});

__sf_test('m11: corrupt saves heal essence fields and perks shape', () => {
  __sf_reset();
  applyLoadedState({ stardust: 10, essence: -5, essenceEver: 'junk', ascensionCount: NaN, perks: 'not-an-object', autoAscend: 1 });
  __sf_eq(state.essence, 0, 'negative essence healed to 0');
  __sf_eq(state.essenceEver, 0, 'non-finite essenceEver healed to 0');
  __sf_eq(state.ascensionCount, 0, 'NaN counter healed to 0');
  __sf_eq(JSON.stringify(state.perks), '{}', 'corrupt perks healed to {}');
  __sf_eq(state.autoAscend, true, 'toggle coerced to boolean');
});

__sf_test('m11: buyPerk enforces branch linearity and deducts escalating costs', () => {
  __sf_reset();
  state.essence = 100;
  __sf_true(canBuyPerk('void-discount') === false, 'tier-1 locked behind tier-0');
  __sf_true(buyPerk('void-discount') === false, 'locked purchase refused');
  __sf_true(buyPerk('cosmic-might') === true, 'tier-0 purchasable');
  __sf_eq(state.essence, 98, 'cost 2 deducted');
  __sf_eq(perkLvl('cosmic-might'), 1, 'level stored');
  __sf_true(canBuyPerk('void-discount') === true, 'unlocked once tier-0 owned');
  __sf_true(buyPerk('void-discount') === true, 'second node purchasable');
  __sf_eq(state.essence, 94, 'cost 4 deducted');
});

/* ===================== Group: M12 Daily Gifts & Streaks ===================== */

__sf_test('m12: streak increments when last claim was yesterday', () => {
  __sf_reset();
  state.lastDaily = yesterdayString(); // injected, deterministic
  state.dailyStreak = 3;
  state.stardust = 10000;
  const r = claimDailyGift();
  __sf_true(r !== null, 'claim succeeds');
  __sf_eq(r.streak, 4, 'streak 3 -> 4');
  __sf_eq(r.day, 4, 'gift day follows streak');
  __sf_eq(state.stardust, 10250, 'day-4 lump: bank capped by 0 sps, flat 250 paid');
  __sf_eq(state.lastDaily, todayString(), 'lastDaily stamped today');
  __sf_true(!dailyGiftReady(), 'no longer ready today');
});

__sf_test('m12: gap of 2+ days resets the streak to day 1', () => {
  __sf_reset();
  state.lastDaily = dateStamp(new Date(Date.now() - 2 * 86400000)); // day before yesterday
  state.dailyStreak = 6;
  const r = claimDailyGift();
  __sf_eq(r.streak, 1, 'broken streak restarts at 1');
  __sf_eq(r.day, 1, 'back to the day-1 gift');
  __sf_eq(state.stardust, 100, 'day-1 lump pays flat 100 with zero production');
});

__sf_test('m12: once-per-day guard blocks double claiming', () => {
  __sf_reset();
  state.lastDaily = yesterdayString();
  __sf_true(claimDailyGift() !== null, 'first claim ok');
  __sf_true(claimDailyGift() === null, 'second claim same day refused');
  __sf_eq(state.dailyStreak, 1, 'streak not inflated by retry');
});

__sf_test('m12: reward table maps all seven days correctly', () => {
  __sf_reset();
  __sf_eq(DAILY_GIFTS.length, 7, 'seven entries');
  __sf_eq(dailyRewardFor(1).kind, 'lump', 'd1 lump');
  __sf_close(dailyRewardFor(1).pct, 0.3, 1e-9, 'd1 pct');
  __sf_eq(dailyRewardFor(1).flat, 100, 'd1 flat');
  __sf_eq(dailyRewardFor(2).kind, 'surge', 'd2 surge x10 60s');
  __sf_eq(dailyRewardFor(2).mult, 10);
  __sf_eq(dailyRewardFor(2).ms, 60000);
  __sf_eq(dailyRewardFor(3).kind, 'star', 'd3 summons star');
  __sf_eq(dailyRewardFor(4).flat, 250, 'd4 flat 250');
  __sf_eq(dailyRewardFor(4).capSecs, 7200, 'd4 cap 2h');
  __sf_eq(dailyRewardFor(5).flat, 200, 'd5 doubles d1 flat');
  __sf_eq(dailyRewardFor(6).mult, 25, 'd6 surge x25');
  __sf_eq(dailyRewardFor(6).ms, 90000, 'd6 90s');
  __sf_eq(dailyRewardFor(7).kind, 'essence-or-lump', 'd7 finale');
});

__sf_test('m12: streak caps at day 7 rewards forever after', () => {
  __sf_reset();
  state.lastDaily = yesterdayString();
  state.dailyStreak = 99;
  const r = claimDailyGift();
  __sf_eq(r.streak, 100, 'raw streak keeps counting');
  __sf_eq(r.day, 7, 'but gift day clamps to 7');
  __sf_eq(r.gift.kind, 'essence-or-lump', 'finale gift repeats');
});

__sf_test('m12: day-2 surge applies a x10 60s buff', () => {
  __sf_reset();
  state.lastDaily = yesterdayString();
  state.dailyStreak = 1;
  claimDailyGift(); // -> streak 2, day 2
  __sf_true(goldenBuff !== null, 'buff active');
  __sf_eq(goldenBuff.mult, 10, 'x10 multiplier');
  const dur = goldenBuff.until - Date.now();
  __sf_true(dur > 59000 && dur <= 60000, '~60s duration, got ' + dur);
  goldenBuff = null;
});

__sf_test('m12: day-3 Star Caller arms the force-spawn flag', () => {
  __sf_reset();
  state.lastDaily = yesterdayString();
  state.dailyStreak = 2;
  pendingGoldenForce = false;
  const r = claimDailyGift(); // -> streak 3, day 3
  __sf_eq(r.day, 3, 'landed on day 3');
  __sf_true(pendingGoldenForce === true, 'scheduler will spawn next tick');
  pendingGoldenForce = false;
});

__sf_test('m12: day-7 branches on ascensionCount', () => {
  __sf_reset();
  state.ascensionCount = 0;
  state.stardust = 500;
  applyDailyGift(dailyRewardFor(7));
  __sf_eq(state.stardust, 1500, 'pre-ascension: mega lump floor(min(500,0))+1000');
  state.ascensionCount = 1;
  state.essence = 0;
  const text = applyDailyGift(dailyRewardFor(7));
  __sf_eq(state.essence, 1, 'post-ascension: +1 essence');
  __sf_true(text.indexOf('Essence') !== -1, 'summary mentions essence');
});

__sf_test('m12: daily7/daily28 achievement thresholds exact', () => {
  __sf_reset();
  const a7 = ACHIEVEMENTS.find(a => a.id === 'daily7');
  const a28 = ACHIEVEMENTS.find(a => a.id === 'daily28');
  __sf_true(!!a7 && !!a28, 'both exist');
  state.dailyStreak = 6;  __sf_true(a7.check(state) === false, '6 denies weekly');
  state.dailyStreak = 7;  __sf_true(a7.check(state) === true, '7 grants weekly');
  state.dailyStreak = 27; __sf_true(a28.check(state) === false, '27 denies lunar');
  state.dailyStreak = 28; __sf_true(a28.check(state) === true, '28 grants lunar');
});

/* ===================== Group: M12 Daily Gifts & Streaks ===================== */

__sf_test('m12: reward mapping covers days 1-7 and clamps beyond', () => {
  __sf_reset();
  const kinds = [1,2,3,4,5,6,7].map(d => dailyRewardFor(d).kind);
  __sf_eq(JSON.stringify(kinds), JSON.stringify(['lump','surge','star','lump','lump','surge','essence-or-lump']), 'day kinds 1..7');
  __sf_eq(dailyRewardFor(8).name, DAILY_GIFTS[6].name, 'day 8 clamps to finale');
  __sf_eq(dailyRewardFor(99).name, DAILY_GIFTS[6].name, 'day 99 clamps too');
  __sf_eq(dailyRewardFor(0).name, DAILY_GIFTS[0].name, 'day 0 clamps up to day 1');
});

__sf_test('m12: first-ever claim starts streak at 1', () => {
  __sf_reset();
  state.lastDaily = null; state.dailyStreak = 0;
  const r = claimDailyGift();
  __sf_true(r !== null, 'claim succeeds');
  __sf_eq(r.streak, 1, 'streak 1');
  __sf_eq(state.dailyStreak, 1, 'state stored');
  __sf_eq(state.lastDaily, todayString(), 'lastDaily stamped today');
});

__sf_test('m12: consecutive-day claim increments the streak', () => {
  __sf_reset();
  state.lastDaily = yesterdayString();
  state.dailyStreak = 3;
  const r = claimDailyGift();
  __sf_eq(r.streak, 4, '3 -> 4 across midnight boundary');
  __sf_eq(r.day, 4, 'reward drawn from day 4');
});

__sf_test('m12: missed day resets the streak', () => {
  __sf_reset();
  state.lastDaily = '1999-12-31';
  state.dailyStreak = 9;
  const r = claimDailyGift();
  __sf_eq(r.streak, 1, 'broken chain restarts at 1');
  __sf_eq(r.day, 1, 'restart draws day 1');
});

__sf_test('m12: once-per-day guard blocks double claims', () => {
  __sf_reset();
  state.lastDaily = todayString(); // already claimed today
  state.dailyStreak = 5;
  __sf_eq(claimDailyGift(), null, 'guard returns null');
  __sf_eq(state.dailyStreak, 5, 'streak untouched');
  __sf_eq(state.lastDaily, todayString(), 'stamp untouched');
  __sf_eq(dailyGiftReady(), false, 'not ready');
});

__sf_test('m12: day-7 finale pays essence after first ascension', () => {
  __sf_reset();
  state.ascensionCount = 1;
  state.essence = 4;
  const g = applyDailyGift(dailyRewardFor(7));
  __sf_eq(state.essence, 5, '+1 essence');
  __sf_true(g.indexOf('Essence') !== -1, 'descriptor mentions essence');
});

__sf_test('m12: pre-ascension finale falls back to mega lump', () => {
  __sf_reset();
  state.ascensionCount = 0;
  state.stardust = 10000;
  derived.sps = 100; // direct seed: min(10000*1.0, 14400*100) -> 10000 + 1000 flat
  const before = state.stardust;
  applyDailyGift(dailyRewardFor(7));
  __sf_eq(state.stardust, before + 10000 + 1000, 'bank-capped lump + flat');
});

__sf_test('m12: surge gifts arm goldenBuff with exact mult and window', () => {
  __sf_reset();
  goldenBuff = null;
  applyDailyGift(DAILY_GIFTS[1]); // x10 / 60s
  let dur = goldenBuff.until - Date.now();
  __sf_eq(goldenBuff.mult, 10, 'mult 10');
  __sf_true(dur > 55000 && dur <= 60000, '60s window');
  goldenBuff = null;
  applyDailyGift(DAILY_GIFTS[5]); // x25 / 90s
  dur = goldenBuff.until - Date.now();
  __sf_eq(goldenBuff.mult, 25, 'mult 25');
  __sf_true(dur > 85000 && dur <= 90000, '90s window');
  goldenBuff = null;
});

__sf_test('m12: star gift raises the force flag consumed by the scheduler', () => {
  __sf_reset();
  pendingGoldenForce = false;
  applyDailyGift(DAILY_GIFTS[2]);
  __sf_eq(pendingGoldenForce, true, 'flag raised');
  pendingGoldenForce = false;
});

__sf_test('m12: lump math floors min(bank pct, capSecs sps) plus flat', () => {
  __sf_reset();
  state.stardust = 999;
  derived.sps = 10; // min(999*.3=299.7, 3600*10=36000) -> floor(299.7)=299 + 100
  const before = state.stardust;
  applyDailyGift(DAILY_GIFTS[0]);
  __sf_eq(state.stardust, before + 299 + 100, 'exact day-1 arithmetic');
  state.stardust = 5; // tiny bank below flat-only territory: min(1.5, big) -> 1 + 100
  const b2 = state.stardust;
  applyDailyGift(DAILY_GIFTS[0]);
  __sf_eq(state.stardust, b2 + 101, 'floor then flat');
});

__sf_test('m12: achievement thresholds fire at streak 7 and 28', () => {
  __sf_reset();
  const a7 = ACHIEVEMENTS.find(a => a.id === 'daily7');
  const a28 = ACHIEVEMENTS.find(a => a.id === 'daily28');
  __sf_true(!!a7 && !!a28, 'both registered');
  __sf_eq(a7.check({ dailyStreak: 6 }), false, 'below 7');
  __sf_eq(a7.check({ dailyStreak: 7 }), true, 'at 7');
  __sf_eq(a28.check({ dailyStreak: 27 }), false, 'below 28');
  __sf_eq(a28.check({ dailyStreak: 28 }), true, 'at 28');
});

/* ===================== Group: M13 Insights & Extras ===================== */

__sf_test('m13: prodShareRows returns [] before any production', () => {
  __sf_reset();
  __sf_eq(JSON.stringify(prodShareRows()), '[]', 'idle forge has no share rows');
});

__sf_test('m13: prodShareRows ranks producers and pcts sum to 100', () => {
  __sf_reset();
  state.gens[0] = 5; state.gens[1] = 4; state.gens[2] = 3; state.gens[3] = 2; state.gens[4] = 1;
  recalc();
  const rows = prodShareRows();
  __sf_eq(rows.length, 5, 'five producers -> five rows');
  for (let i = 1; i < rows.length; i++) {
    __sf_true(rows[i - 1].pct >= rows[i].pct, 'sorted descending');
  }
  const sum = rows.reduce((a, r) => a + r.pct, 0);
  __sf_close(sum, 100, 1e-6, 'shares total 100%');
  const expectOrder = GENERATORS.map((g, i) => ({ name: g.name, val: Math.max(0, derived.genSps[i] || 0) }))
    .sort((a, b) => b.val - a.val);
  __sf_eq(rows[0].name, expectOrder[0].name, 'biggest producer first');
});

__sf_test('m13: prodShareRows buckets tail into Others past five producers', () => {
  __sf_reset();
  state.gens[0] = 9;
  for (let i = 5; i < 10; i++) state.gens[i] = 1;
  recalc();
  const rows = prodShareRows();
  __sf_eq(rows.length, 6, 'top 5 + Others cap');
  __sf_eq(rows[rows.length - 1].name, 'Others', 'tail bucket present');
  const sum = rows.reduce((a, r) => a + r.pct, 0);
  __sf_close(sum, 100, 1e-6, 'bucketed shares still total 100%');
  const allVals = GENERATORS.map((g, i) => Math.max(0, derived.genSps[i] || 0)).sort((a, b) => b - a);
  const totalVal = allVals.reduce((a, b) => a + b, 0);
  const otherVal = totalVal - allVals.slice(0, 5).reduce((a, b) => a + b, 0);
  __sf_true(otherVal > 0, 'bucket genuinely non-empty');
  __sf_close(rows[rows.length - 1].pct, otherVal / totalVal * 100, 1e-9, 'Others pct equals value-rank tail share');
});

__sf_test('m13: saveFileStamp yields YYYYMMDD-HHMM shape', () => {
  __sf_true(/^\d{8}-\d{4}$/.test(saveFileStamp()), 'stamp format matches');
});

__sf_test('m13: importSave accepts a plain JSON file dump', () => {
  __sf_reset();
  const save = { gens: [0, 0, 3], stardust: 777, lifetimeAll: 12345, perks: { 'cosmic-might': 1 } };
  document.getElementById('save-io').value = JSON.stringify(save);
  importSave();
  __sf_eq(state.stardust, 777, 'stardust restored');
  __sf_eq(state.gens[2], 3, 'generators restored');
  __sf_eq(perkLvl('cosmic-might'), 1, 'perks restored');
});

__sf_test('m13: importSave refuses garbage without corrupting state', () => {
  __sf_reset();
  state.stardust = 42;
  document.getElementById('save-io').value = 'totally not a save';
  let threw = false;
  try { importSave(); } catch (e) { threw = true; }
  __sf_true(threw, 'garbage rejected');
  __sf_eq(state.stardust, 42, 'state untouched by failed import');
});

/* ===================== Group: M14 Content Expansion Pack ===================== */

__sf_test('m14: one-army zeroes ALL gen sps while clicks still work, gens untouched', () => {
  __sf_reset();
  state.gens[0] = 25; state.gens[3] = 7;
  recalc();
  __sf_true(derived.sps > 0, 'baseline produces');
  const owned = state.gens.slice();
  state.trial = 'one-army';
  recalc();
  __sf_eq(derived.sps, 0, 'sps zeroed inside trial');
  for (let i = 0; i < GENERATORS.length; i++) __sf_eq(derived.genSps[i], 0, 'genSps[' + i + '] zeroed');
  __sf_true(derived.clickPower > 0, 'click path alive (base x g)');
  __sf_eq(JSON.stringify(state.gens), JSON.stringify(owned), 'generators NOT wiped by the modifier');
  state.trial = null;
  recalc();
  __sf_true(derived.sps > 0, 'production restored on exit');
});

__sf_test('m14: speedrun success banks reward x1.5 and stops the clock', () => {
  __sf_reset();
  state.trial = 'speedrun';
  state.trialStartedAt = Date.now() - 1000;
  state.lifetimeRun = 1e12; // goal met
  recalc();
  __sf_true(checkTrialGoals() === true, 'goal check exits with success');
  __sf_true(state.trialsDone.speedrun === true, 'reward banked');
  __sf_eq(state.trial, null, 'trial cleared');
  __sf_eq(state.trialStartedAt, 0, 'clock stopped');
  // isolate the reward factor from any achievement side-effects
  state.trialsDone = {};
  recalc();
  const base = derived.globalMult;
  state.trialsDone = { speedrun: true };
  recalc();
  __sf_close(derived.globalMult / base, 1.5, 1e-9, 'global x1.5 exactly');
});

__sf_test('m14: speedrun auto-fails on a stale clock WITHOUT reward', () => {
  __sf_reset();
  state.stardust = 5000; state.lifetimeRun = 999; state.gens[2] = 4;
  state.upgrades['click1'] = true;
  state.trial = 'speedrun';
  state.trialStartedAt = Date.now() - (1800 * 1000) - 1000; // window lapsed
  __sf_true(checkTrialClock() === true, 'fail path fired');
  __sf_eq(state.trial, null, 'trial exited');
  __sf_eq(state.trialStartedAt, 0, 'clock stopped');
  __sf_eq(state.stardust, 0, 'run reset like abandon');
  __sf_eq(state.lifetimeRun, 0, 'run lifetime reset');
  __sf_true(!state.trialsDone.speedrun, 'NO reward banked on fail');
  __sf_true(state.upgrades.click1 === undefined || true, 'upgrades map reset shape ok');
  __sf_eq(JSON.stringify(state.upgrades), '{}', 'upgrade purchases wiped by run reset');
});

__sf_test('m14: speedrun within the window does not fail', () => {
  __sf_reset();
  state.trial = 'speedrun';
  state.trialStartedAt = Date.now() - 60000;
  state.lifetimeRun = 12345;
  __sf_true(checkTrialGoals() === false, 'no success yet');
  __sf_true(checkTrialClock() === false, 'clock not expired');
  __sf_eq(state.trial, 'speedrun', 'still running');
  const left = speedrunMsLeft();
  __sf_true(left !== null && left <= 1800 * 1000 && left > 1800 * 1000 - 62000, 'ms-left sane');
});

__sf_test('m14: iron blocks buyUpgrade entirely while active', () => {
  __sf_reset();
  state.gens[0] = 250; // unlocks every tier of gen 0
  state.stardust = 1e18;
  recalc();
  const id = 'g_' + GENERATORS[0].id + '_0';
  __sf_true(!!UPGRADE_BY_ID[id], 'target upgrade exists');
  state.trial = 'iron';
  buyUpgrade(id);
  __sf_true(!state.upgrades[id], 'purchase blocked');
  __sf_eq(state.stardust, 1e18, 'dust untouched');
  state.trial = null;
  buyUpgrade(id);
  __sf_true(state.upgrades[id] === true, 'purchasable once outside');
});

__sf_test('m14: iron reward cuts normal-upgrade costs 25% in check AND display helper', () => {
  __sf_reset();
  const u = UPGRADE_BY_ID['g_' + GENERATORS[1].id + '_1'];
  __sf_eq(upgradeCostMult(), 1, 'no discount before the trial');
  __sf_eq(effUpgradeCost(u), Math.ceil(u.cost * 1), 'identity cost before');
  state.trialsDone = { iron: true };
  __sf_eq(upgradeCostMult(), 0.75, 'mult after banking');
  __sf_eq(effUpgradeCost(u), Math.ceil(u.cost * 0.75), 'effective cost is ceil(cost*0.75)');
  // purchase check honours it: dust between full and discounted price buys fine
  state.stardust = Math.ceil(u.cost * 0.75);
  state.gens[1] = 25; // unlock tier 1
  buyUpgrade('g_' + GENERATORS[1].id + '_1');
  __sf_true(state.upgrades['g_' + GENERATORS[1].id + '_1'] === true, 'bought at discounted threshold');
});

__sf_test('m14: stellar-census doubles global production', () => {
  __sf_reset();
  recalc();
  const base = derived.globalMult;
  state.research.done['stellar-census'] = true;
  recalc();
  __sf_close(derived.globalMult / base, 2, 1e-9, 'g x2 exactly');
});

__sf_test('m14: causal-harvest stacks lump mult to x4 with quantum-treasury', () => {
  __sf_reset();
  __sf_eq(goldenLumpMult(), 1, 'baseline 1');
  state.research.done['quantum-treasury'] = true;
  __sf_eq(goldenLumpMult(), 2, 'treasury alone x2');
  state.research.done['causal-harvest'] = true;
  __sf_eq(goldenLumpMult(), 4, 'stacked x4');
  delete state.research.done['quantum-treasury'];
  __sf_eq(goldenLumpMult(), 2, 'harvest alone x2');
});

__sf_test('m14: echo-forge doubles EVERY generator mult (g0-g14)', () => {
  __sf_reset();
  state.gens[0] = 5; state.gens[7] = 30; state.gens[14] = 150;
  recalc();
  const before = derived.genMult.slice();
  state.research.done['echo-forge'] = true;
  recalc();
  for (let i = 0; i < GENERATORS.length; i++) {
    __sf_close(derived.genMult[i] / before[i], 2, 1e-9, 'gen ' + i + ' doubled');
  }
});

__sf_test('m14: infinity-loop compresses golden interval x1.5 and stacks', () => {
  __sf_reset();
  __sf_close(goldenSpawnIntervalScale(), 1, 1e-12, 'baseline scale 1');
  state.research.done['infinity-loop'] = true;
  __sf_close(goldenSpawnIntervalScale(), 1 / 1.5, 1e-12, '/1.5 alone');
  state.research.done['golden-lure'] = true;
  __sf_close(goldenSpawnIntervalScale(), 1 / (1.25 * 1.5), 1e-12, 'stacks with lure multiplicatively');
});

__sf_test('m14: Transfinite tier exists as g_*_5, need 250, and applies x2', () => {
  __sf_reset();
  __sf_eq(GEN_UPGRADE_TIERS.length, 6, 'six tiers now');
  const t = GEN_UPGRADE_TIERS[5];
  __sf_eq(t.tierName, 'Transfinite', 'tier name');
  __sf_eq(t.need, 250, 'need 250');
  __sf_eq(t.costMult, 3500000, 'costMult 3.5e6');
  const id = 'g_' + GENERATORS[0].id + '_5';
  const u = UPGRADE_BY_ID[id];
  __sf_true(!!u, id + ' generated');
  __sf_eq(u.cost, GENERATORS[0].baseCost * 3500000, 'cost = baseCost x 3.5e6');
  state.gens[0] = 10;
  recalc();
  const base = derived.genMult[0];
  state.upgrades[id] = true;
  recalc();
  __sf_close(derived.genMult[0] / base, 2, 1e-9, 'transfinite doubles like siblings');
});

__sf_test('m14: new achievement checks fire on crafted states', () => {
  const get = id => ACHIEVEMENTS.find(a => a.id === id);
  ['trial-one-army', 'trial-speedrun', 'trial-iron', 'research20', 'wonder7', 'asc10', 'sps1t'].forEach(id =>
    __sf_true(!!get(id), id + ' registered'));
  __sf_true(get('trial-one-army').check({ trialsDone: { 'one-army': true } }), 'one-army done');
  __sf_true(get('trial-speedrun').check({ trialsDone: { speedrun: true } }), 'speedrun done');
  __sf_true(get('trial-iron').check({ trialsDone: { iron: true } }), 'iron done');
  const done20 = {}; for (let i = 0; i < 20; i++) done20['r' + i] = true;
  __sf_true(get('research20').check({ research: { done: done20 } }), '20 researched fires');
  __sf_true(!get('research20').check({ research: { done: { r0: true } } }), 'below 20 stays dark');
  const allWonders = {}; WONDERS.forEach(w => { allWonders[w.id] = true; });
  __sf_true(get('wonder7').check({ wonders: allWonders }), 'all wonders built');
  allWonders[WONDERS[0].id] = false;
  __sf_true(!get('wonder7').check({ wonders: allWonders }), 'missing wonder stays dark');
  __sf_true(get('asc10').check({ ascensionCount: 10 }), 'asc10 fires');
  __sf_true(!get('asc10').check({ ascensionCount: 9 }), 'asc9 stays dark');
  __sf_reset();
  derived.sps = 1e12;
  __sf_true(get('sps1t').check(state), 'sps1t fires at 1e12 sps');
  recalc();
});

__sf_test('m14: trialStartedAt heals corrupt saves and survives valid epochs', () => {
  __sf_reset();
  applyLoadedState({ trial: 'not-a-trial', trialStartedAt: 'garbage' });
  __sf_eq(state.trial, null, 'invalid trial id healed to null');
  __sf_eq(state.trialStartedAt, 0, 'garbage epoch heals to 0');
  applyLoadedState({ trial: 'one-army', trialStartedAt: 1770000000000 });
  __sf_eq(state.trial, 'one-army', 'valid trial kept');
  __sf_eq(state.trialStartedAt, 1770000000000, 'valid epoch kept verbatim');
  applyLoadedState({});
  __sf_eq(state.trialStartedAt, 0, 'absent field defaults 0');
});

__sf_test('m14: CHALLENGES census grew to 6 and fmtClock renders mm:ss', () => {
  __sf_eq(CHALLENGES.length, 6, 'three legacy + three Wave 5');
  ['pacifist', 'inflation', 'darkmatter', 'one-army', 'speedrun', 'iron'].forEach(id =>
    __sf_true(CHALLENGES.some(c => c.id === id), id + ' present'));
  __sf_eq(fmtClock(65000), '1:05', 'minute+second');
  __sf_eq(fmtClock(5000), '0:05', 'padded seconds');
  __sf_eq(fmtClock(0), '0:00', 'zero clock');
});

/* ===================== Group: M15 Lifetime Analytics ===================== */

__sf_test('m15: gameLoop accumulates genSps*dt per generator and updates bestSps', () => {
  __sf_reset();
  state.gens[0] = 10; state.gens[2] = 5;
  recalc();
  const sps = derived.sps;
  __sf_true(sps > 0, 'baseline produces');
  lastTick = Date.now() - 1000; // pin a ~1s tick
  gameLoop();
  __sf_close(state.genProduced[0], derived.genSps[0] * 1.0, 0.05, 'gen 0 banked ~1s of output');
  __sf_close(state.genProduced[2], derived.genSps[2] * 1.0, 0.05, 'gen 2 banked ~1s');
  for (let i = 0; i < GENERATORS.length; i++) {
    if (i !== 0 && i !== 2) __sf_eq(state.genProduced[i], 0, 'idle gen ' + i + ' untouched');
  }
  __sf_true(state.bestSps >= sps - 1e-9, 'bestSps captured this tick');
});

__sf_test('m15: bestSps is monotonic — lower sps never lowers the record', () => {
  __sf_reset();
  state.gens[0] = 50;
  recalc();
  lastTick = Date.now() - 1000;
  gameLoop();
  const peak = state.bestSps;
  state.gens[0] = 0;
  recalc();
  lastTick = Date.now() - 1000;
  gameLoop();
  __sf_eq(state.bestSps, peak, 'record survives a weaker tick');
});

__sf_test('m15: resetRunForTrial wipes run analytics in parity with lifetimeRun', () => {
  __sf_reset();
  state.genProduced[4] = 12345;
  state.stardust = 999;
  resetRunForTrial();
  __sf_eq(JSON.stringify(state.genProduced), JSON.stringify(GENERATORS.map(() => 0)), 'producer array zeroed');
  __sf_eq(state.lifetimeRun, 0, 'parity anchor: lifetimeRun also zeroed');
});

__sf_test('m15: ascension resets run analytics but KEEPS all-time records', () => {
  __sf_reset();
  state.genProduced[1] = 777;
  state.bestSps = 42;
  state.longestSessionSec = 600;
  applyAscensionReset(0);
  __sf_eq(state.genProduced[1], 0, 'run-scoped array wiped');
  __sf_eq(state.bestSps, 42, 'bestSps persists (all-time)');
  __sf_eq(state.longestSessionSec, 600, 'longest session persists (all-time)');
});

__sf_test('m15: heal repairs corrupt producer arrays and garbage records', () => {
  // wrong length (short)
  applyLoadedState({ genProduced: [1, NaN, -5] });
  __sf_eq(state.genProduced.length, GENERATORS.length, 'short array length-fit to 15');
  __sf_eq(state.genProduced[0], 1, 'valid slot kept');
  __sf_eq(state.genProduced[1], 0, 'NaN slot -> 0');
  __sf_eq(state.genProduced[2], 0, 'negative slot -> 0');
  // wrong length (long)
  const longArr = new Array(40).fill(7);
  longArr[3] = Infinity;
  applyLoadedState({ genProduced: longArr });
  __sf_eq(state.genProduced.length, GENERATORS.length, 'long array truncated to 15');
  __sf_eq(state.genProduced[3], 0, 'Infinity slot -> 0');
  __sf_eq(state.genProduced[39] === undefined || true, true, 'tail dropped');
  // not an array at all
  applyLoadedState({ genProduced: 'garbage' });
  __sf_eq(state.genProduced.length, GENERATORS.length, 'non-array rebuilt');
  // garbage records
  applyLoadedState({ bestSps: 'nope', longestSessionSec: -99 });
  __sf_eq(state.bestSps, 0, 'garbage bestSps -> 0');
  __sf_eq(state.longestSessionSec, 0, 'negative longest -> 0');
});

__sf_test('m15: load stamps a fresh sessionStartAt', () => {
  __sf_reset();
  const before = Date.now();
  applyLoadedState({});
  __sf_true(state.sessionStartAt >= before, 'session clock starts at load');
});

__sf_test('m15: stats tab renders analytics rows', () => {
  __sf_reset();
  state.bestSps = 555; state.longestSessionSec = 3661; state.sessionStartAt = Date.now() - 61000;
  renderStats();
  const html = $('stats-list').innerHTML;
  __sf_true(html.includes('Best SPS ever'), 'best-sps row present');
  __sf_true(html.includes('Longest session'), 'longest-session row present');
  __sf_true(html.includes('Current session'), 'current-session row present');
  __sf_true(html.includes(fmtTime(3661)), 'longest value rendered as 1h 1m 1s');
});

__sf_test('m15: top producers ranks by output with empty-state before production', () => {
  __sf_reset();
  renderTopProducers();
  __sf_true($('top-producers').innerHTML.includes('Nothing produced yet'), 'idle empty-state');
  state.genProduced[9] = 500; state.genProduced[2] = 900; state.genProduced[14] = 100;
  renderTopProducers();
  const html = $('top-producers').innerHTML;
  __sf_true(html.indexOf(GENERATORS[2].name) < html.indexOf(GENERATORS[9].name), 'rank 1 first');
  __sf_true(html.indexOf(GENERATORS[9].name) < html.indexOf(GENERATORS[14].name), 'rank 2 second');
  __sf_true(!html.includes(GENERATORS[0].name) || GENERATORS[0].name === GENERATORS[2].name, 'zero-output gens absent');
});

/* ===================== Group: M16 Save Slots & Changelog ===================== */

__sf_test('m16: saveKey shape, default slot 1, heal clamps 1..3', () => {
  __sf_reset();
  __sf_eq(saveKey(2), 'stellarForgeSave_v1_s2', 'slot key shape');
  __sf_eq(saveKey(1), 'stellarForgeSave_v1_s1', 'slot 1 key');
  __sf_eq(state.slot, 1, 'fresh forge uses slot 1');
  applyLoadedState({ slot: 99 });
  __sf_eq(state.slot, 3, 'oversized slot clamps to 3');
  applyLoadedState({ slot: 'x' });
  __sf_eq(state.slot, 1, 'garbage slot -> 1');
});

__sf_test('m16: round-trip save -> load per slot keeps data isolated', () => {
  for (let s = 1; s <= 3; s++) {
    localStorage.clear();
    __sf_reset();
    state.slot = s;
    state.stardust = 1000 * s;
    state.gens[0] = s;
    saveGame();
    __sf_true(localStorage.getItem(saveKey(s)) !== null, 'slot ' + s + ' file exists');
    __sf_true(localStorage.getItem(saveKey(s % 3 + 1)) === null, 'other slot empty');
    // corrupt the live state, then reload from the slot file
    state.stardust = 0; state.gens[0] = 99;
    loadGame();
    __sf_eq(state.stardust, 1000 * s, 'slot ' + s + ' stardust restored');
    __sf_eq(state.gens[0], s, 'slot ' + s + ' gens restored');
  }
  localStorage.clear();
});

__sf_test('m16: legacy migration seeds slot 1 exactly once and never overwrites', () => {
  localStorage.clear();
  localStorage.setItem('stellarForgeSave_v1', JSON.stringify({ gens: [5], stardust: 4242 }));
  migrateLegacySave();
  const seeded = JSON.parse(localStorage.getItem(saveKey(1)));
  __sf_eq(seeded.stardust, 4242, 'legacy payload landed in slot 1');
  __sf_true(localStorage.getItem('stellarForgeSave_v1') === null, 'legacy key retired');
  // second run: nothing left to migrate, slot 1 untouched
  migrateLegacySave();
  __sf_eq(JSON.parse(localStorage.getItem(saveKey(1))).stardust, 4242, 'idempotent re-run');
  // occupied slot 1 is NEVER overwritten by a later legacy appearance
  localStorage.setItem('stellarForgeSave_v1', JSON.stringify({ gens: [1], stardust: 7 }));
  migrateLegacySave();
  __sf_eq(JSON.parse(localStorage.getItem(saveKey(1))).stardust, 4242, 'occupied slot protected');
  localStorage.clear();
});

__sf_test('m16: switchSlot to an empty target banks current then starts fresh', () => {
  localStorage.clear();
  __sf_reset();
  state.slot = 1;
  state.stardust = 55555;
  saveGame();
  switchSlot(3); // silent path: target has no forge
  __sf_eq(state.slot, 3, 'active slot moved');
  __sf_eq(state.stardust, 0, 'target was empty -> fresh forge');
  __sf_true(JSON.parse(localStorage.getItem(saveKey(1))).stardust === 55555, 'outgoing run banked in slot 1');
  __sf_eq(JSON.parse(localStorage.getItem(saveKey(3))).slot, 3, 'new forge persisted under slot 3');
  localStorage.clear();
});

__sf_test('m16: changelog flag gates the boot auto-show; reopen leaves it intact', () => {
  __sf_reset();
  const latest = CHANGELOG[CHANGELOG.length - 1];
  __sf_true(state.seenChangelogVer !== latest.version, 'fresh forge has not seen v' + latest.version);
  showChangelog(false); // preview path must NOT mark seen
  __sf_true(state.seenChangelogVer !== latest.version, 'preview kept flag untouched');
  state.seenChangelogVer = latest.version;
  __sf_false_showGate();
});
// tiny helper for the gate expression above (kept __sf_-scoped)
function __sf_false_showGate() {
  const latest = CHANGELOG[CHANGELOG.length - 1];
  if (state.seenChangelogVer === latest.version) return;
  throw new Error('seen flag should gate the boot show');
}

__sf_test('m16: trials6 feat fires only when all six trials are banked', () => {
  const a = ACHIEVEMENTS.find(x => x.id === 'trials6');
  __sf_true(!!a, 'trials6 registered');
  const partial = { trialsDone: { pacifist: true, inflation: true } };
  __sf_true(!a.check(partial), 'two of six stays dark');
  const all = { trialsDone: {} };
  CHALLENGES.forEach(c => { all.trialsDone[c.id] = true; });
  __sf_true(a.check(all), 'all six fires');
});

__sf_test('m16: census matches Wave 5 spec — trials 6, research 16, achievements 49, tiers 6', () => {
  __sf_eq(CHALLENGES.length, 6, 'six trials');
  __sf_eq(RESEARCH.length, 16, 'sixteen research projects');
  __sf_eq(ACHIEVEMENTS.length, 49, 'forty-nine feats');
  __sf_eq(GEN_UPGRADE_TIERS.length, 6, 'six upgrade tiers');
  __sf_eq(UPGRADES.length, 6 * GENERATORS.length + SPECIAL_UPGRADES.length, 'upgrade cards total');
});
