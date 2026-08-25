#!/usr/bin/env node
/* =====================================================================
   STELLAR FORGE — zero-dependency test runner (Node builtins only).

   WHY ONE COMBINED SOURCE STRING:
   game.js declares its state via top-level const/let, which live in that
   script's lexical scope and are NOT visible to later vm.runInThisContext
   calls. So we concatenate game.js + unit.test.js into ONE source and run
   it as a single script — the tests then share scope with the engine.

   boot() installs setInterval timers; we process.exit() explicitly so a
   green/final report can never be held hostage by pending timers.
   ===================================================================== */
'use strict';

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const { installGlobals } = require(path.join(__dirname, 'dom-stubs.js'));

installGlobals();

const root = path.join(__dirname, '..');
let src;
try {
  src =
    fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8') +
    '\n;\n' +
    fs.readFileSync(path.join(__dirname, 'unit.test.js'), 'utf8');
} catch (e) {
  console.error('FATAL: could not read sources:', e.message);
  process.exit(2);
}

try {
  vm.runInThisContext(src, { filename: 'stellarforge-combined.js' });
} catch (e) {
  console.error('FATAL: game.js + unit.test.js failed to load under stubs:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(2);
}

const results = globalThis.__SF_RESULTS__ || [];
if (results.length === 0) {
  console.error('FATAL: no test results recorded — did unit.test.js run?');
  process.exit(2);
}

let passed = 0;
let failed = 0;
for (const r of results) {
  if (r.pass) {
    passed++;
    console.log('PASS: ' + r.name);
  } else {
    failed++;
    console.log('FAIL: ' + r.name + (r.detail ? ' — ' + r.detail : ''));
  }
}

console.log('\n===== SUMMARY =====');
console.log(`Total: ${results.length}  Pass: ${passed}  Fail: ${failed}`);
console.log(failed === 0 ? 'ALL TESTS PASSED' : 'TESTS FAILED');

// Explicit exit: boot()'s setInterval(gameLoop,200)/news-timer must not hang CI.
process.exit(failed > 0 ? 1 : 0);
