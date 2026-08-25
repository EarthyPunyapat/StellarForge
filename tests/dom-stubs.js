/* =====================================================================
   STELLAR FORGE — headless DOM stubs for the zero-dependency test runner.
   CommonJS module. Installs inert browser-like globals onto globalThis so
   js/game.js can be evaluated verbatim under node:vm without a browser.
   Contract: ANY element lookup returns an inert stub (never null/throw).
   ===================================================================== */
'use strict';

/* ---- canvas 2d context stub: every method a no-op, props assignable ---- */
function makeCtx2d() {
  const gradient = { addColorStop() {} };
  const noopNames = [
    'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'closePath',
    'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect',
    'fill', 'stroke', 'save', 'restore',
    'translate', 'rotate', 'scale', 'setTransform', 'resetTransform',
    'drawImage', 'putImageData', 'setLineDash',
  ];
  const ctx = { canvas: null };
  for (const name of noopNames) ctx[name] = function () {};
  ctx.createLinearGradient = function () { return Object.create(gradient); };
  ctx.createRadialGradient = function () { return Object.create(gradient); };
  ctx.createPattern = function () { return {}; };
  ctx.getImageData = function () { return { data: [] }; };
  ctx.measureText = function () { return { width: 0 }; };
  // assignable styling props (game writes these freely)
  ctx.fillStyle = ''; ctx.strokeStyle = ''; ctx.globalAlpha = 1;
  ctx.lineWidth = 1; ctx.font = ''; ctx.shadowBlur = 0; ctx.shadowColor = '';
  return ctx;
}

/* ---- universal inert Element stub (memoized per lookup key by callers) ---- */
function makeElement(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    children: [],
    attributes: {},
    handlers: {},
    classList: {
      _set: new Set(),
      add(...names) { names.forEach((n) => this._set.add(n)); },
      remove(...names) { names.forEach((n) => this._set.delete(n)); },
      toggle(n) { this._set.has(n) ? this._set.delete(n) : this._set.add(n); },
      contains(n) { return this._set.has(n); },
    },
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } },
    dataset: {},
    getBoundingClientRect() {
      return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 };
    },
    addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
    removeEventListener() {},
    dispatch(type, ev) { (this.handlers[type] || []).forEach((fn) => fn(ev || { preventDefault() {}, target: this })); },
    click() { this.dispatch('click'); },
    focus() {}, blur() {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      return child;
    },
    insertBefore(child, ref) {
      const i = ref ? this.children.indexOf(ref) : -1;
      if (i >= 0) this.children.splice(i, 0, child); else this.children.push(child);
      return child;
    },
    replaceChild(nu, old) {
      const i = this.children.indexOf(old);
      if (i >= 0) this.children[i] = nu;
      return old;
    },
    remove() {},
    querySelector(sel) { return lookupStub('sel:' + sel); },   // NEVER null
    querySelectorAll() { return []; },
    getContext() { if (!this._ctx) { this._ctx = makeCtx2d(); this._ctx.canvas = this; } return this._ctx; },
  };
  // ordinary writable props used by the game
  el.id = ''; el.className = ''; el.title = '';
  el.textContent = ''; el.innerHTML = '';
  el.value = ''; el.disabled = false;
  el.offsetWidth = 0; el.offsetHeight = 0;
  el.hidden = false; el.type = ''; el.placeholder = '';
  // live child accessors — game code reads zone.firstChild after appendChild
  Object.defineProperty(el, 'firstChild', { get() { return el.children[0] || null; } });
  Object.defineProperty(el, 'lastChild', { get() { return el.children[el.children.length - 1] || null; } });
  return el;
}

/* ---- memoized stub registry: same key always yields the SAME stub ---- */
const stubRegistry = new Map();
function lookupStub(key) {
  let s = stubRegistry.get(key);
  if (!s) { s = makeElement(key.startsWith('sel:') ? 'div' : 'div'); stubRegistry.set(key, s); }
  return s;
}

/* ---- document / window / storage / misc globals ---- */
function makeStorage() {
  const m = new Map();
  return {
    getItem(k) { return m.has(String(k)) ? m.get(String(k)) : null; },
    setItem(k, v) { m.set(String(k), String(v)); },
    removeItem(k) { m.delete(String(k)); },
    clear() { m.clear(); },
    key(i) { return Array.from(m.keys())[i] ?? null; },
    get length() { return m.size; },
  };
}

const documentStub = {
  getElementById(id) { return lookupStub('id:' + id); },       // NEVER null/throw
  createElement(tag) { return makeElement(tag); },
  createDocumentFragment() { return makeElement('#fragment'); },
  createTextNode(t) { return { textContent: t }; },
  body: makeElement('body'),
  head: makeElement('head'),
  documentElement: makeElement('html'),
  activeElement: { tagName: 'BODY' },
  hidden: false,
  visibilityState: 'visible',
  readyState: 'complete',
  addEventListener() {}, removeEventListener() {},
  querySelector(sel) { return lookupStub('doc-sel:' + sel); },
  querySelectorAll() { return []; },
};

function installGlobals() {
  const g = globalThis;

  if (!g.document) g.document = documentStub;
  else Object.assign(g.document, documentStub);

  if (!g.window) {
    g.window = {
      innerWidth: 1280,
      innerHeight: 800,
      devicePixelRatio: 1,
      location: { href: 'http://localhost/' },
      navigator: {},
      addEventListener() {}, removeEventListener() {},
      matchMedia() { return { matches: false, addListener() {}, addEventListener() {} }; },
      requestAnimationFrame() {},   // NO-OP: never schedules → runner terminates
      setTimeout, clearTimeout, setInterval, clearInterval,
    };
  }
  if (!g.location) g.location = { href: 'http://localhost/' };
  if (!g.navigator) g.navigator = {};
  if (!g.matchMedia) g.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} });

  if (!g.requestAnimationFrame) g.requestAnimationFrame = function () {};
  if (!g.cancelAnimationFrame) g.cancelAnimationFrame = function () {};

  if (!g.localStorage) g.localStorage = makeStorage();

  // Minimal WebAudio stand-ins (game wraps real usage in try/catch anyway).
  class FakeAudioNode {
    connect(x) { return x; }
    start() {} stop() {}
  }
  class FakeAudioContext {
    get destination() { return new FakeAudioNode(); }
    createOscillator() {
      const o = new FakeAudioNode();
      o.type = '';
      o.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
      return o;
    }
    createGain() {
      const gn = new FakeAudioNode();
      gn.gain = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
      return gn;
    }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  if (!g.AudioContext) g.AudioContext = FakeAudioContext;
  if (!g.webkitAudioContext) g.webkitAudioContext = FakeAudioContext;
  // Mirror onto the stub window: game code reads window.AudioContext, and the
  // fake window above is a plain object that would otherwise miss it.
  if (g.window && !g.window.AudioContext) {
    g.window.AudioContext = g.AudioContext;
    if (!g.window.webkitAudioContext) g.window.webkitAudioContext = g.webkitAudioContext;
  }

  // btoa/atob exist natively in Node >= 16; polyfill-guard only.
  if (!g.btoa) g.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  if (!g.atob) g.atob = (s) => Buffer.from(s, 'base64').toString('binary');
}

module.exports = { installGlobals, makeElement, makeStorage, makeCtx2d };
