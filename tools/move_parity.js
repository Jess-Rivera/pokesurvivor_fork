// tools/move_parity.js: resolves the 63 moves and compares cd and power against legacy js/data/moves.js.
// Usage: node tools/move_parity.js            self-test, parity summary, timing line
//        node tools/move_parity.js --report   also write docs/current feature planning/move-parity-report.md
// A report, not a gate: exit code 1 only if the self-test fails or the resolver throws.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
global.G = {};
for (const f of ['move-attributes', 'moves-generated', 'move-overrides', 'move-handler', 'move-resolver']) require(path.join(root, 'js/data', f + '.js'));
const D = G.MoveData, O = G.MoveOverrides, H = G.MoveHandlers, R = G.MoveResolver.resolve, defs = G.MoveDefs;

// ---------- self-test ----------
const throws = (f, text) => { try { f(); } catch (e) { return e.message.includes(text); } return false; };
const cases = [
  ['Tackle cd is 0.5', () => defs.tackle.cd === 0.5],
  ['grammar default applied (pierce)', () => defs.tackle.space.pierce === Infinity],
  ['status move keeps a hand cd', () => R({ s: { ...D['swords-dance'], cd: 3 } }, {}, H).s.cd === 3],
  ['gated defaults stay absent', () => !('turnRate' in defs.tackle.delivery) && !('returnHits' in defs.tackle.delivery)],
  ['BETA 0.5 compresses (PP 35 anchor, PP 140 gives 0.25)', () => R({ t: { ...D.tackle, pp: 140 } }, {}, H, { ...G.MoveResolver.TUNING, BETA: 0.5 }).t.cd === 0.25],
  ['override applied', () => R(D, { tackle: { cd: 2 } }, H).tackle.cd === 2],
  ['empty override (why only) leaves the move as resolved', () => { const r = R({ s: { ...D['swords-dance'] }, t: D.tackle }, { s: { why: 'only a note' } }, H); return r.s.cd === undefined && r.t.cd === 0.5; }],
  ['freeze of an unknown move rejected', () => throws(() => R({ s: { ...D.substitute, casterState: { commitment: { cooldown: { type: 'freeze', id: 'ghost' } } } } }, {}, H), 'unknown move "ghost"')],
  ['move that lasts while active gets no cd', () => ['fire-spin', 'leaf-storm', 'flame-wheel', 'bug-buzz'].every(i => defs[i].cd === undefined)],
  ['Gust gets the formula cd', () => defs.gust.cd === 0.5],
  ['basePower is power x accuracy / 100', () => defs['hydro-pump'].basePower === 88 && defs['night-shade'].basePower === 0 && defs.tackle.basePower === 40],
  ['persistent move gets no cd, a non-persistent one is untouched', () => defs['fire-spin'].persistent === true && defs['fire-spin'].cd === undefined && defs.spikes.persistent === undefined],
  ['range default only where it has meaning, a move range wins', () => defs.tackle.delivery.range === 420 && !('range' in defs['water-gun'].delivery) && defs['razor-leaf'].delivery.range === 210],
  ['location pick defaults to enemy', () => defs['rock-slide'].delivery.locationPick === 'enemy' && !('locationPick' in defs.tackle.delivery)],
  ['stat effect carries no duration or maxStacks (retired, slice 5a)', () => { const e = defs['ice-beam'].payload.find(x => x.t === 'stat'); return !('duration' in e) && !('maxStacks' in e); }],
  ['handler attached with its trigger', () => defs.hail.handlers[0].trigger === 'cast' && defs['bug-bite'].handlers[0].condition === 'targetHasBerry'],
  ['source data not mutated', () => !('cd' in D.tackle) && !('handlers' in D.hail)],
  ['unknown override field rejected', () => throws(() => R(D, { tackle: { bogus: 1 } }, H), 'unknown field "bogus"')],
  ['override of an unknown move rejected', () => throws(() => R(D, { ghost: { cd: 1 } }, H), 'not a move')],
  ['unknown handler name rejected', () => throws(() => R(D, {}, { ...H, byName: {} }), 'unknown handler')],
];
let fails = 0;
for (const [name, f] of cases) { let ok = false; try { ok = f(); } catch (e) { console.log('  threw: ' + e.message); } if (!ok) { fails++; console.log('SELFTEST FAIL: ' + name); } }
console.log('self-test: ' + (cases.length - fails) + '/' + cases.length + ' passed');

// ---------- legacy moves.js (a browser IIFE using G): run it in a vm sandbox with a stub G ----------
const sandbox = { G: {}, console }; sandbox.window = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/data/moves.js'), 'utf8'), sandbox);
const L = sandbox.G.Moves.BY_ID;

// ---------- parity ----------
const NOTES = { 'fire-spin': 'intended: lasts while active, pacing is rehit 0.4', 'leaf-storm': 'intended: lasts while active, pacing is rehit 0.25',
  'flame-wheel': 'intended: lasts while active, fields laid every 0.12 (rehit 0.3)', 'bug-buzz': 'intended: lasts while active, pacing is rehit 0.5',
  gust: 'intended: now a cast that emits 3 projectiles, normal cooldown (was an orbit with a 0.26 re-hit)' };
const rows = Object.keys(D).map(id => {
  const n = defs[id], l = L[id], p = n.power || 0;
  const active = !!D[id].persistent;     // slice 4c-1: persistence is the flag (combat-architecture:H25); persistent moves no longer list notActive
  return { id, src: n.cd === undefined ? (n.power > 0 && active ? 'none (lasts while active)' : 'none (no cd set)') : O[id] && 'cd' in O[id] ? 'override' : 'formula', note: NOTES[id] || '', cdNew: n.cd, cdOld: l.cd, pNew: p, pOld: l.dmg,
    cdDiff: n.cd === undefined || Math.abs(n.cd - l.cd) > 1e-9, pDiff: p !== l.dmg };
});
const cdDiffs = rows.filter(r => r.cdDiff), pDiffs = rows.filter(r => r.pDiff);
const count = s => rows.filter(r => r.src === s).length;
const summary = 'parity: ' + rows.length + ' moves, cd differs on ' + cdDiffs.length + ', power differs on ' + pDiffs.length + ' (cd source: ' + count('formula') + ' formula, ' + count('override') + ' override, ' + (rows.length - count('formula') - count('override')) + ' none)';
console.log(summary);

// ---------- timing: the 63 moves cloned up to 1000 synthetic ones (originals kept, so the overrides still apply) ----------
const ids = Object.keys(D), fake = {};
for (let i = 0; i < 1000; i++) { const base = ids[i % ids.length], id = i < ids.length ? base : base + '-x' + i; fake[id] = { ...D[base], id }; }
const t0 = process.hrtime.bigint(); R(fake, O, H); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
const kb = fs.statSync(path.join(root, 'js/data/moves-generated.js')).size / 1024;
const timing = 'timing: resolve of ' + Object.keys(fake).length + ' synthetic moves took ' + ms.toFixed(1) + ' ms; moves-generated.js is ' + kb.toFixed(0) + ' KB for ' + ids.length + ' moves, projected ' + (kb * 1000 / ids.length).toFixed(0) + ' KB at 1000';
console.log(timing);

if (process.argv.includes('--report')) {
  const f = v => v === undefined ? '-' : v;
  const line = r => '| ' + r.id + ' | ' + r.src + ' | ' + f(r.cdNew) + ' | ' + r.cdOld + ' | ' + r.pNew + ' | ' + r.pOld + ' | ' + (r.cdDiff ? 'cd ' : '') + (r.pDiff ? 'power' : '') + ' | ' + r.note + ' | |';
  const head = '| move | cd source | cd new | cd legacy | power new | power legacy | differs | note | Jess: intended / regression |\n|---|---|---|---|---|---|---|---|---|\n';
  const out = path.join(root, 'docs/current feature planning/move-parity-report.md');
  fs.writeFileSync(out, '# Move parity report (generated by tools/move_parity.js, do not edit)\n\nResolved cd and power (new, from js/data/move-resolver.js) against legacy js/data/moves.js (cd and dmg). Power of a status move is null or 0 in the new data and dmg 0 in legacy, both count as 0.\n\n'
    + '- ' + summary + '\n- ' + timing + '\n\n## Differences (' + new Set([...cdDiffs, ...pDiffs]).size + ')\n\n'
    + (cdDiffs.length || pDiffs.length ? head + rows.filter(r => r.cdDiff || r.pDiff).map(line).join('\n') : 'None.') + '\n\n## All moves\n\n' + head + rows.map(line).join('\n') + '\n');
  console.log('wrote ' + path.relative(root, out));
}
process.exit(fails ? 1 : 0);
