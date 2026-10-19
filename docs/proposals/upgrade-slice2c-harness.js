// Slice 2c offline checks (Node only). Usage from the repo root:  node docs/proposals/upgrade-slice2c-harness.js .
// Covers: scoped mechanics (legality, summing with Increased Effect), stat cards (eligibility, weights, apply),
// the Player stat seams (HP, Atk/SpA, Def/SpD, Speed) using the real Player class with stubbed engine globals,
// and the family draw with the new Stats family. The screens are covered by a headless-browser run.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'));
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
global.G = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), pickN(a, n) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b.slice(0, n); } }, Log: { on: false } };
['js/core/stats.js', 'js/systems/status.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/levelup.js'].forEach(load);
let fail = 0; const bad = m => { fail++; if (fail < 25) console.log('FAIL', m); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

// 1. scoped mechanics: registered, outside ALL, one key shared with Increased Effect
if (G.Mechanics.ALL.some(x => x.scoped)) bad('scoped mechanics leaked into ALL');
console.log('1 scoped mechanics:', G.Mechanics.SCOPED.length, '(types + damage kinds)');
for (const x of G.Mechanics.SCOPED) if (G.Mechanics.BY_ID[x.id] !== x) bad(x.id + ' not in BY_ID');

// 2. legality: only matching damage moves; buffs never; stacking sums with Increased Effect
let n2 = 0;
for (const d of G.Moves.ALL) {
  const m = G.Moves.instance(d.id);
  for (const x of G.Mechanics.SCOPED) {
    const c = G.Mechanics.check(m, x), want = (x.scope.type ? m.type === x.scope.type : m.kind === x.scope.kind) && m.kind !== 'buff' && m.dmg > 0;
    n2++; if (c.ok !== want) bad(`${d.id} ${x.id} ok=${c.ok} want=${want} (${c.why || ''})`);
  }
}
console.log('2 legality checked:', n2);
{ const m = G.Moves.instance('ember'), base = m.dmg;
  G.Moves.addStack(m, 'effect'); G.Moves.addStack(m, 't:' + m.type); G.Moves.addStack(m, 'k:' + m.kind);
  if (!near(m.dmg, base * (1 + 0.10 + 0.15 + 0.15))) bad('effect + type + kind do not sum: ' + m.dmg + ' vs ' + base * 1.4);
  const order = G.Moves.instance('ember'); G.Moves.addStack(order, 'k:' + m.kind); G.Moves.addStack(order, 't:' + m.type); G.Moves.addStack(order, 'effect');
  if (!near(order.dmg, m.dmg)) bad('stack order matters');
  const p = G.Mechanics.preview(G.Moves.instance('ember'), G.Mechanics.BY_ID['t:fire']); if (!/to/.test(p)) bad('scoped preview text: ' + p);
  const txt = G.Mechanics.text(m, G.Mechanics.BY_ID['t:fire']); if (txt !== '+15% Fire Damage') bad('scoped text: ' + txt);
  const why = G.Mechanics.reason(G.Moves.instance('ember'), G.Mechanics.BY_ID['t:water']); if (why !== 'Not a Water move') bad('scoped reason: ' + why); }
console.log('3 scoped stacking sums with Increased Effect, order independent');

// 3. real Player with stubbed engine globals
G.Sprites = new Proxy({ Animator: class { } }, { get: (t, k) => (k in t ? t[k] : () => 20) }); G.Weather = { speedFor: () => 1, mult: () => 1 };
G.World = { liquidEffect: () => ({ slow: 1 }) }; G.Types = { mult: () => 1, label: () => '' };
G.Input = {}; G.Audio = { sfx() {} }; G.DB = { save: {} }; G.Items = { BY: {} };
G.Log = { on: false };
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined });
global.G = new Proxy(global.G, { get: (t, k) => (k in t ? t[k] : noop) });     // unknown engine pieces (Camera, FX...) are no-ops
global.window = global; global.document = undefined;
try { load('js/entities/player.js'); } catch (e) { console.log('Player load failed:', e.message); process.exit(1); }
const mon = { dex: 6, name: 'Charizard', types: ['fire', 'flying'], hp: 100, spd: 100, atk: 10, stats: [78, 84, 78, 109, 85, 100] };
const mkp = () => { const p = new G.Player(mon, {}); p.addMove('ember'); return p; };
const p0 = mkp();
// 3a zero stacks: identical to baseline formulas
const ember = p0.moves[0], phys = Object.assign({}, ember, { cat: 'physical' }), spec = Object.assign({}, ember, { cat: 'special' });
const f0 = { phys: p0.moveFactor(phys), spec: p0.moveFactor(spec), spd: p0.spd, max: p0.maxHp };
if (!near(f0.max, G.Stats.hpForLevel(78, 1))) bad('zero-stack max HP changed: ' + f0.max);
// 3b each stat card only moves its own seam
const p = mkp(); p.addStat('atk');
if (!near(p.moveFactor(phys), f0.phys * 1.05)) bad('Protein physical ' + p.moveFactor(phys) + ' vs ' + f0.phys * 1.05);
if (!near(p.moveFactor(spec), f0.spec)) bad('Protein leaked into special');
const q = mkp(); q.addStat('spa');
if (!near(q.moveFactor(spec), f0.spec * 1.05)) bad('Calcium special');
if (!near(q.moveFactor(phys), f0.phys)) bad('Calcium leaked into physical');
const st = Object.assign({}, ember, { cat: 'status', dmg: 0 });
if (q.moveFactor(st) !== 0) bad('status move factor not 0');
const s = mkp(); s.addStat('spe'); if (!near(s.spd, f0.spd * 1.05)) bad('Carbos ' + s.spd + ' vs ' + f0.spd * 1.05);
const h = mkp(); h.hp = h.maxHp - 3; h.addStat('hp');
const wantMax = Math.round(G.Stats.hpForLevel(78, 1) * 1.05); if (!near(h.maxHp, wantMax)) bad('HP Up max ' + h.maxHp + ' vs ' + wantMax);
if (!near(h.hp, h.maxHp - 3, 1e-6)) bad('HP Up did not top up by the gain: hp ' + h.hp + ' max ' + h.maxHp);
const dd = mkp(); dd.hp = 0; dd.dead = true; dd.addStat('hp'); if (dd.hp !== 0) bad('HP Up revived a fainted mon');
// levelling keeps the HP Up bonus
h.gainXp(1e9); if (!near(h.maxHp, Math.round(G.Stats.hpForLevel(78, h.level) * 1.05))) bad('HP Up lost on level up');
const b = mkp(); b.addStat('hp'); b.syncLevel(10); if (!near(b.maxHp, Math.round(G.Stats.hpForLevel(78, 10) * 1.05))) bad('HP Up lost on syncLevel');
// 3c defense: Iron / Zinc shrink incoming damage, never to zero, zero stacks unchanged
const hit = (pl, cat) => { pl.hp = pl.maxHp; pl.invuln = 0; pl.hurt(60, null, false, { factor: 400, cat, mul: 1 }, 'x'); return pl.maxHp - pl.hp; };
const base = { phys: hit(mkp(), 'physical'), spec: hit(mkp(), 'special') };
const iron = mkp(); iron.addStat('def'); const zinc = mkp(); zinc.addStat('spd');
const ip = hit(iron, 'physical'), is = hit(iron, 'special'), zp = hit(zinc, 'physical'), zs = hit(zinc, 'special');
if (!(ip < base.phys)) bad(`Iron did not reduce physical (${ip} vs ${base.phys})`);
if (!near(is, base.spec)) bad('Iron leaked into special'); if (!near(zp, base.phys)) bad('Zinc leaked into physical');
if (!(zs < base.spec)) bad('Zinc did not reduce special');
const big = mkp(); for (let i = 0; i < 500; i++) big.addStat('def'); if (!(hit(big, 'physical') >= 1)) bad('damage reached 0 at 500 Iron');
console.log('4 Player seams: Atk/SpA by category, status 0, Speed, HP top-up, Def/SpD, level up keeps HP Up');

// 4. cards and the draw
const mk = (ids, types = ['fire']) => ({ mon: { types }, slots: ids.map(() => []), maxMoves: 4, moves: ids.map(i => G.Moves.instance(i)), banned: new Set(), hasMove(id) { return this.moves.some(m => m.id === id); }, level: 3, rerolls: 0, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
const physM = G.Moves.ALL.find(m => m.cat === 'physical' && m.kind !== 'buff' && m.dmg > 0).id;
const specM = G.Moves.ALL.find(m => m.cat === 'special' && m.kind !== 'buff' && m.dmg > 0).id;
const buffM = G.Moves.ALL.find(m => m.kind === 'buff').id;
{ const t = mk([buffM]); const fam = G.LevelUp.families(t, [t]);
  const keys = (fam.Stats || []).map(c => c.key).sort().join(','); if (keys !== 'stat:def,stat:hp,stat:spd,stat:spe') bad('buff-only team stat cards: ' + keys);
  if ((fam.DPS || []).some(c => /^mech:[tk]:/.test(c.key))) bad('scoped card offered to a buff-only team'); }
{ const t = mk([physM]); const fam = G.LevelUp.families(t, [t]); const ks = fam.Stats.map(c => c.key);
  if (!ks.includes('stat:atk') || ks.includes('stat:spa')) bad('physical-only team: ' + ks); }
{ const t = mk([physM, specM, specM === physM ? 'ember' : specM]); }
{ const only = mk([specM]), mixed = mk([physM, specM]);
  const w = (tm, k) => G.LevelUp.families(tm[0], tm).Stats.find(c => c.key === k).w;
  if (w([mixed], 'stat:atk') <= 0.25 - 1e-9 === false && w([mixed], 'stat:atk') < 0.25) bad('weight below floor');
  const lopsided = mk([specM, specM === 'ember' ? 'confusion' : 'ember', physM]);
  console.log('   weights: spec-heavy team atk w', w([lopsided], 'stat:atk').toFixed(2), 'spa w', w([lopsided], 'stat:spa').toFixed(2)); }
// target note + apply
{ const a = mk([physM]), b2 = mk([specM]); a.addStat = function (id) { this.inc[id] += 0.05; return true; };
  const card = G.LevelUp.families(a, [a, b2]).Stats.find(c => c.key === 'stat:atk');
  const ts = card.targets([a, b2]); if (!(ts[0].ok && !ts[1].ok)) bad('atk targets: ' + JSON.stringify(ts.map(x => x.ok)));
  if (!/Attack \+0% to \+5%/.test(ts[0].note)) bad('note text: ' + ts[0].note);
  if (ts[1].note !== 'No physical moves') bad('dim note: ' + ts[1].note);
  card.apply(a, a); if (a.inc.atk !== 0.05) bad('apply did not add'); }
// distribution
const byKind = {}; for (const m of G.Moves.ALL) (byKind[m.kind] = byKind[m.kind] || []).push(m.id);
const team = [mk(['ember', byKind.melee[0]]), mk([byKind.orbit[0], byKind.beam[0]], ['water']), mk([byKind.buff[0]], ['psychic']), mk([byKind.turret[0], byKind.cone[0]], ['dragon'])];
const N = 20000, fam = {}, keyc = {}; let cards = 0, withStat = 0, scopedOffers = 0;
for (let i = 0; i < N; i++) {
  const o = G.LevelUp.offer(team[0], 3, team);
  if (new Set(o.map(c => c.key)).size !== o.length) bad('duplicate in offer');
  let hasStat = false, hasSc = false;
  for (const c of o) { cards++; fam[c.family] = (fam[c.family] || 0) + 1; keyc[c.key.replace(/^mech:([tk]):.*/, 'scoped')] = (keyc[c.key.replace(/^mech:([tk]):.*/, 'scoped')] || 0) + 1;
    if (c.type === 'stat') hasStat = true; if (/^mech:[tk]:/.test(c.key)) hasSc = true;
    if ((c.type === 'mech' || c.type === 'stat') && !c.targets(team).some(t => t.ok)) bad('card with no legal target ' + c.key); }
  if (hasStat) withStat++; if (hasSc) scopedOffers++;
}
console.log('5 draw (4-mon team):', Object.entries(fam).map(([k, v]) => k + ' ' + (100 * v / cards).toFixed(1) + '%').join(', '), '| offers with a stat card', (100 * withStat / N).toFixed(1) + '%', '| with a scoped card', (100 * scopedOffers / N).toFixed(1) + '%');
const top = Object.entries(keyc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + ' ' + (100 * v / N).toFixed(0) + '%/offer'); console.log('   most common cards:', top.join(', '));
console.log(fail ? fail + ' FAILURES' : 'ALL PASS'); process.exit(fail ? 1 : 0);
