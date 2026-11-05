// Text-field keys (onboarding fix, 2026-11-05) offline checks (Node only). Usage from the repo root:  node docs/proposals/input-keys-harness.js
// Loads the real js/core/input.js (or IK_INPUT, for docs/proposals/input-keys-mutate.js) with a fake window and fake key events.
// Expected outcomes are the testers' bug and the fix's rule, not the code's output: a key typed in a text field keeps the browser
// default (Tab moves focus, Space types, the arrows move the cursor); the same keys anywhere else stay blocked, and Tab still
// counts for cycle_next in a run.
const fs = require('fs'), vm = require('vm');
const file = process.env.IK_INPUT || 'js/core/input.js';
const L = {};
global.window = global;
global.addEventListener = (t, f) => (L[t] = L[t] || []).push(f);
global.G = { Settings: { get: () => null, set: () => {} } };
vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL ' + m); } };
const el = (tagName, editable) => ({ tagName, isContentEditable: !!editable });
// One key press (down then up) on a target; returns whether the browser default was blocked.
const press = (code, target) => {
  const e = { code, key: code, target, blocked: false, preventDefault() { this.blocked = true; } };
  for (const f of L.keydown || []) f(e);
  for (const f of L.keyup || []) f(e);
  return e.blocked;
};
const GUARDED = ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// 1. text fields: the browser keeps every guarded key (the login bug: Tab did not move to the password field)
for (const k of GUARDED) ok(!press(k, el('INPUT')), k + ' in an input is not blocked');
ok(!press('Tab', el('TEXTAREA')), 'Tab in a textarea is not blocked');
ok(!press('Tab', el('SELECT')), 'Tab in a select is not blocked');
ok(!press('Space', el('DIV', true)), 'Space in a contenteditable is not blocked');
ok(!press('KeyA', el('INPUT')), 'a letter in an input is not blocked');

// 2. everywhere else nothing changes: no page scroll or focus jump during a run or on a menu
for (const t of [el('CANVAS'), el('BODY'), el('BUTTON'), el('DIV'), null])
  for (const k of GUARDED) ok(press(k, t), k + ' on ' + (t ? t.tagName : 'the window') + ' is blocked');

// 3. Tab still reaches the game: it counts for cycle_next, from the canvas as before
G.Input.endFrame();
{ const e = { code: 'Tab', key: 'Tab', target: el('CANVAS'), preventDefault() {} };
  for (const f of L.keydown) f(e);
  ok(G.Input.action('cycle_next'), 'Tab on the canvas counts for cycle_next');
  for (const f of L.keyup) f(e); }
G.Input.endFrame();

console.log(fail ? 'input-keys harness: ' + fail + ' FAILED of ' + n : 'input-keys harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
