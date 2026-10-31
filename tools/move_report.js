// tools/move_report.js: the Stage 0 resolved-move report (docs/current feature planning/move-schema-post-auth/stage-0.md).
// Usage: node tools/move_report.js            summary to the console
//        node tools/move_report.js --report   also write docs/current feature planning/move-report.md
// One row per move: the derived values of combat-validation-and-handoff:1.6 (basePower, cd or persistent, range used, reach,
// instances alive at once, emissions per cast, rider chance per chain hop, the Power/s proxy of combat-architecture:D37 with its
// hit-count assumption), the review state under the Stage 0 review rule, the scenarios that cover it, and the cd parity against
// legacy js/data/moves.js. A report, not a gate: exit code 1 only if loading fails. Scenario pass or fail comes from
// docs/proposals/move-intent-harness.js (run by tools/check.js), not from here.
// Review rule (Jess 2026-10-29): a move with a MOVE-INTENT entry is reviewed when its data and code match it (its scenarios pass);
// a move without one is reviewed with the batch that routes it (listed in the scenarios file `batchReviewed`).
// cd parity: a difference is explained when the move is persistent (it lasts while active), or its override `why` gives a reason
// (anything but the "no cd set yet" placeholder), or its MOVE-INTENT entry talks about its cooldown. Rulings go in MOVE-INTENT.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
global.G = {};
// @@LOAD-BEGIN (tools that bundle this file replace this block)
for (const f of ['move-attributes', 'moves-generated', 'move-overrides', 'move-handler', 'move-resolver']) require(path.join(root, 'js/data', f + '.js'));
const legacyBox = { G: {}, console }; legacyBox.window = legacyBox;
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/data/moves.js'), 'utf8'), legacyBox);
const LEGACY = legacyBox.G.Moves.BY_ID;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const SCEN = JSON.parse(read('docs/move_rework_holding/move-intent-scenarios.json')), ROUTE_SRC = read('js/systems/move-route.js'), INTENT_SRC = read('docs/MOVE-INTENT.md');
const OUT = path.join(root, 'docs/current feature planning/move-report.md'), WRITE = process.argv.includes('--report');
// @@LOAD-END
const D = G.MoveData, O = G.MoveOverrides, defs = G.MoveDefs, RANGE = G.MoveResolver.TUNING.RANGE;

// ---- routed list and MOVE-INTENT entries (text, as in the intent harness) ----
const routedBlock = (ROUTE_SRC.match(/ROUTED\s*=\s*new Set\(\[([\s\S]*?)\]\)/) || [])[1] || '';
const ROUTED = new Set((routedBlock.match(/'([a-z0-9-]+)'/g) || []).map(s => s.slice(1, -1)));
const INTENT = {};
for (const part of INTENT_SRC.split(/^### /m).slice(1)) { const id = part.split('\n')[0].trim(); INTENT[id] = part.slice(id.length); }
const BATCH = new Set(SCEN.batchReviewed || []);

// ---- derived values (all by hand-checkable formulas; the D-table row named beside each) ----
const r2 = v => Math.round(v * 100) / 100;
const lifeOf = d => { const ts = (d.delivery.endOn || []).filter(e => e.time != null).map(e => e.time); return ts.length ? Math.min(...ts) : null; };
const usesRange = d => ['nearest', 'location'].includes(d.delivery.targeting) || ['returns', 'repositions'].includes(d.delivery.motion);
const rangeOf = d => d.delivery.range != null ? d.delivery.range : RANGE;
function reach(d) {     // how far from the caster the move can land a hit
  const dl = d.delivery, sp = d.space || {}, L = lifeOf(d), body = sp.radRadius || (sp.linWidth ? sp.linWidth / 2 : 0);
  if (dl.targeting === 'self') return '-';
  if (!(d.space && d.space.shape) && (d.payload || []).some(p => p.t === 'emit')) return 'via emitted children';
  if (dl.motion === 'travels') {
    const c = dl.path && dl.path.curve, v = dl.moveSpeed;
    if (L == null) return '?';
    return c ? r2(2 * (v / c) * Math.sin(Math.min(c * L / 2, Math.PI / 2))) + ' (curve, D23)' : r2(v * L) + ' (speed x life)';
  }
  if (dl.motion === 'returns') return rangeOf(d) + ' (turnaround)';
  if (dl.motion === 'orbits') return r2(dl.orbitRadius + body) + ' (orbit + body)';
  if (dl.motion === 'repositions' || dl.targeting === 'location' || dl.anchor === 'target') return r2(rangeOf(d) + body) + ' (range + body)';
  if (dl.grow) return dl.grow.max != null ? dl.grow.max + ' (grow max, D21)' : 'grows uncapped';
  return sp.shape === 'linear' ? sp.linLength + ' (band length)' : (sp.radRadius || 0) + ' (radius)';
}
function alive(d) {
  const n = (d.space && d.space.count) || 1, L = lifeOf(d);
  if (d.persistent) return n + ' (persistent)';
  if (d.delivery.targeting === 'self') return '-';
  if (L == null || !d.cd) return n + '+';
  return Math.max(1, Math.ceil(L / d.cd - 1e-9)) * n;     // an instant (life 0) still counts once
}
function emissions(d) {
  const em = (d.payload || []).filter(p => p.t === 'emit');
  if (!em.length) return '-';
  return em.map(e => {
    const L = lifeOf(d);
    if (e.trigger === 'enemyHit' || e.trigger === 'termination') return (e.count || 1) + ' per ' + (e.trigger === 'enemyHit' ? 'hit' : 'end');
    if (e.trigger === 'casterMove') return '1 per ' + e.every + ' s moving';
    if (L == null) return 'every ' + e.every + ' s while alive';
    const k = e.trigger === 'interval' ? Math.ceil(L / e.every - 1e-9) - 1 : Math.ceil(L / e.every - 1e-9);     // never at or after the end (H14); interval starts at `every` (D29)
    return String(e.count != null ? Math.min(e.count, k) : k);
  }).join(', ');
}
function hopChances(d) {
  const hops = d.space && d.space.chainHops; if (!hops) return '-';
  const riders = (d.payload || []).filter(p => p.chance != null && p.chance < 100);
  if (!riders.length) return 'no chance riders';
  return riders.map(p => (p.id || p.stat || p.t) + ' ' + Array.from({ length: hops + 1 }, (_, k) => r2(p.chance * 0.5 ** k)).join('/') + '%').join('; ');
}
function powerPerSec(d) {     // D37: tools only, never gameplay (H8)
  const sp = (d.payload || []).find(p => p.t === 'special' && /fixedDamage|levelDamage/.test(p.handler));
  if (sp) return [sp.handler === 'fixedDamage' ? 'fixed ' + sp.amount : 'level', 'not power-based'];
  if (!(d.basePower > 0)) return ['-', 'no damage'];
  const L = lifeOf(d), rh = d.rehit;
  if (d.persistent) return rh ? [r2(d.basePower / rh), '1 hit per rehit ' + rh + ' s, per second'] : ['-', 'damage comes from emitted children'];
  if (!(d.space && d.space.shape) && (d.payload || []).some(p => p.t === 'emit')) return [r2(d.basePower / d.cd), 'per emitted child, children x per cast'];
  let hits = 1, why = '1 hit per cast';
  if (d.hitPolicy === 'interval' && rh && L) { hits = Math.ceil(L / rh - 1e-9); why = hits + ' hits (life ' + L + ' / rehit ' + rh + ')'; }
  else if (d.delivery.returnHits === 'outAndBack') { hits = 2; why = '2 hits (out and back)'; }
  if (d.space && d.space.chainHops) why += ', target only (hops hit others)';
  return [r2(d.basePower * hits / d.cd), why];
}
// SS8 (slice 5a): a pure buff (no shape, payload only self stat changes) casts on its Gate with no cooldown. Mirrors G.MoveEffects.isPureBuff; keep them in step.
const pureBuff = m => !m.space && (m.payload || []).length > 0 && m.payload.every(fx => fx.t === 'stat' && fx.side !== 'foe');
function cdParity(id) {
  const n = defs[id], l = LEGACY[id] || {}, ov = O[id], ent = INTENT[id] || '';
  const same = n.cd !== undefined && l.cd !== undefined && Math.abs(n.cd - l.cd) < 1e-9;
  if (same) return { diff: false, note: '' };
  if (n.persistent) return { diff: true, ok: true, note: 'lasts while active' };
  if (n.cd === undefined && pureBuff(n)) return { diff: true, ok: true, note: 'casts on its Gate (SS8)' };
  if (ov && ov.why && !/^no cd set yet/.test(ov.why)) return { diff: true, ok: true, note: 'override: ' + ov.why };
  if (/\bcd\s*[0-9]|cooldown/i.test(ent)) return { diff: true, ok: true, note: 'MOVE-INTENT entry' };
  return { diff: true, ok: false, note: 'needs a ruling' };
}
function review(id) {
  if (INTENT[id]) return ROUTED.has(id) ? 'MOVE-INTENT (reviewed when its scenarios pass)' : 'MOVE-INTENT (checked when routed)';
  if (!ROUTED.has(id)) return 'with its batch';
  return BATCH.has(id) ? 'batch reviewed' : 'NEEDS BATCH REVIEW';
}
function scen(id) {
  const ss = SCEN.scenarios.filter(s => s.move === id);
  if (!ss.length) return 'none';
  const k = s => s.blockedBy ? 'blocked ' + s.blockedBy : (s.waitsFor || !ROUTED.has(id)) ? 'pending' : 'runs';
  const c = {}; for (const s of ss) c[k(s)] = (c[k(s)] || 0) + 1;
  return Object.entries(c).map(([a, b]) => b + ' ' + a).join(', ');
}

const rows = Object.keys(D).sort().map(id => {
  const d = defs[id], [pps, ppsWhy] = powerPerSec(d), cp = cdParity(id), l = LEGACY[id] || {};
  return { id, routed: ROUTED.has(id), intent: !!INTENT[id], review: review(id), bp: d.basePower, cd: d.persistent ? 'persistent' : d.cd === undefined ? '-' : d.cd,
    legacy: l.cd === undefined ? '-' : l.cd, cp, range: usesRange(d) ? rangeOf(d) : '-', reach: reach(d), alive: alive(d), emit: emissions(d), hops: hopChances(d), pps, ppsWhy, scen: scen(id) };
});
const need = rows.filter(r => r.review === 'NEEDS BATCH REVIEW'), cdOpen = rows.filter(r => r.cp.diff && !r.cp.ok);
const summary = 'move report: ' + rows.length + ' moves, ' + rows.filter(r => r.routed).length + ' routed, ' + rows.filter(r => r.intent).length + ' with a MOVE-INTENT entry; '
  + need.length + ' routed moves need a batch review (' + need.map(r => r.id).join(', ') + '); cd differs from legacy on ' + rows.filter(r => r.cp.diff).length
  + ', ' + cdOpen.length + ' need a ruling (' + cdOpen.map(r => r.id + ' ' + r.cd + ' vs ' + r.legacy).join(', ') + ')';
console.log(summary);

if (WRITE) {
  const esc = v => String(v).replace(/\|/g, '/');
  const head = '| move | routed | review | basePower | cd | legacy cd | cd parity | range | reach (px) | alive at once | emissions per cast | rider % per hop | Power/s (D37) | Power/s assumes | scenarios |\n|' + '---|'.repeat(15) + '\n';
  const line = r => '| ' + [r.id, r.routed ? 'yes' : '', r.review, r.bp, r.cd, r.legacy, r.cp.diff ? (r.cp.ok ? 'differs, ' : 'DIFFERS, ') + r.cp.note : 'same', r.range, r.reach, r.alive, r.emit, r.hops, r.pps, r.ppsWhy, r.scen].map(esc).join(' | ') + ' |';
  const text = '# Move report (generated by tools/move_report.js --report, do not edit)\n\n'
    + 'Stage 0 resolved-move report (docs/current feature planning/move-schema-post-auth/stage-0.md). Derived values follow combat-validation-and-handoff:1.6 and the combat-architecture D-table. '
    + 'Scenario results come from docs/proposals/move-intent-harness.js (run by tools/check.js). Rulings and batch sign-offs do not go here (this file is regenerated): '
    + 'rulings go in docs/MOVE-INTENT.md, batch sign-offs in the `batchReviewed` list of docs/move_rework_holding/move-intent-scenarios.json.\n\n'
    + '- ' + summary + '\n\n'
    + '## Routed moves needing a batch review (' + need.length + ')\n\n' + (need.length ? need.map(r => '- ' + r.id).join('\n') : 'None.') + '\n\n'
    + '## cd differences needing a ruling (' + cdOpen.length + ')\n\n' + (cdOpen.length ? cdOpen.map(r => '- ' + r.id + ': ' + r.cd + ' s now, ' + r.legacy + ' s legacy').join('\n') : 'None.') + '\n\n'
    + '## All moves\n\n' + head + rows.map(line).join('\n') + '\n';
  fs.writeFileSync(OUT, text);
  console.log('wrote ' + path.relative(root, OUT).replace(/\\/g, '/'));
}
