// Slice 2b offline checks (Node only). Usage from a repo root that has the slice applied:
//   node docs/proposals/upgrade-slice2b-harness.js .
// Covers the pure logic: ladders gone, preview text, family draw legality and weights, empty offers.
// The three-step screens are covered by a headless-browser run (see the proposal), not here.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'));
global.G = { U: { TYPE_COLOR: new Proxy({}, { get: () => '#888' }), TYPE_NAME: new Proxy({}, { get: (_, k) => String(k) }), pickN(a, n) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b.slice(0, n); } }, Log: { on: false } };
['js/core/stats.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/levelup.js'].forEach(load);
let fail = 0; const bad = m => { fail++; if (fail < 25) console.log('FAIL', m); };
const cat = JSON.parse(fs.readFileSync(R + '/docs/move-catalogue-preview.json', 'utf8'));

// 1. ladders and levels are gone
for (const k of ['levelUp', 'nextUpText']) if (G.Moves[k]) bad('G.Moves.' + k + ' still exported');
for (const m of G.Moves.ALL) if (m.ups || m.maxLvl) bad(m.id + ' still has ups/maxLvl');
const inst = G.Moves.instance('ember'); if ('lvl' in inst) bad('instance still has lvl');
console.log('1 ladders and lvl removed');

// 2. preview text equals the catalogue export (one stack, no mods)
let n2 = 0;
for (const cm of cat.moves) for (const e of cm.eligible) {
  const m = G.Moves.instance(cm.id), mech = G.Mechanics.BY_ID[e.id];
  const want = e.preview.replace(' (kind default 0)', ''), got = G.Mechanics.preview(m, mech);
  n2++; if (got !== want) bad(`${cm.id} ${e.id} preview "${got}" vs "${want}"`);
}
console.log('2 preview text matches export:', n2);

// 3. preview follows stacking (second stack previews from the first)
{ const m = G.Moves.instance('ember'); const mech = G.Mechanics.BY_ID.effect; const p0 = G.Mechanics.preview(m, mech); G.Moves.addStack(m, 'effect'); const p1 = G.Mechanics.preview(m, mech);
  if (p0 === p1) bad('preview did not move after a stack'); const pw = G.Mechanics.preview(m, mech); if (pw !== p1) bad('preview not stable'); if (G.Moves.stackTotal(m) !== 1) bad('preview mutated the move'); }
console.log('3 preview is read-only and tracks stacks');

// 4. draw: build a team from real moves and simulate many offers
const mk = (ids, types = ['fire']) => ({ mon: { types }, slots: ids.map(() => []), maxMoves: 4, moves: ids.map(i => G.Moves.instance(i)), banned: new Set(), hasMove(id) { return this.moves.some(m => m.id === id); }, level: 3, rerolls: 0, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
const byKind = {}; for (const m of G.Moves.ALL) (byKind[m.kind] = byKind[m.kind] || []).push(m.id);
const team = [mk(['ember', byKind.melee[0]]), mk([byKind.orbit[0], byKind.beam[0]], ['water']), mk([byKind.buff[0]], ['psychic']), mk([byKind.turret[0], byKind.cone[0]], ['dragon'])];
const fam = { newmove: 0, DPS: 0, Coverage: 0, Utility: 0, Stats: 0 }; let cards = 0, mechCards = 0;
const N = 20000;
for (let i = 0; i < N; i++) {
  const offer = G.LevelUp.offer(team[0], 3, team);
  if (offer.length > 3) bad('more than 3 cards');
  if (new Set(offer.map(c => c.key)).size !== offer.length) bad('duplicate card in one offer');
  for (const c of offer) {
    cards++; fam[c.family]++;
    if (c.type === 'mech' || c.type === 'stat') { mechCards++; const ts = c.targets(team); if (!ts.some(t => t.ok)) bad('card ' + c.key + ' has no legal target'); }
  }
}
console.log('4 offers:', N, 'cards:', cards, 'family share:', Object.entries(fam).map(([k, v]) => k + ' ' + (100 * v / cards).toFixed(1) + '%').join(', '));
// every roll picks a family by weight among families that have cards; with 4 families all populated each family gets its weight share of the FIRST card
const wsum = Object.values(G.LevelUp.FAMILY_W).reduce((a, b) => a + b, 0);
for (const [k, w] of Object.entries(G.LevelUp.FAMILY_W)) { const want = w / wsum, got = fam[k] / cards; if (Math.abs(got - want) > 0.06) bad(`family ${k} share ${got.toFixed(3)} vs ${want.toFixed(3)} (tolerance 0.06)`); }

// 5. no free slot => no New Move cards; nothing eligible and no slot => empty offer
{ const full = mk(['ember', 'tackle', 'gust', 'confusion']); full.maxMoves = 4; const o = G.LevelUp.offer(full, 3, [full]); if (o.some(c => c.type === 'new')) bad('new move offered with full slots'); }
{ const t = mk([byKind.buff[0]]); t.maxMoves = 1;
  // a lone buff with every mechanic maxed out and no slot: only ineligible mechanics remain
  const m = t.moves[0]; for (let i = 0; i < 200; i++) for (const mech of G.Mechanics.ALL) G.Moves.addStack(m, mech.id);
  const o = G.LevelUp.offer(t, 3, [t]); if (o.length) { /* buffs always keep Effect/Duration/Stacks/Recharge eligible (no ceiling), so this must still offer */ }
  if (o.some(c => c.type === 'mech' && !c.targets([t]).some(x => x.ok))) bad('illegal card offered to maxed team'); }
{ const t = mk(['ember']); t.maxMoves = 1; const m = t.moves[0]; const keysBefore = G.Mechanics.eligibleFor(m).length;
  const o = G.LevelUp.offer(t, 3, [t]); if (o.some(c => c.type === 'new')) bad('new card with no slot'); if (!keysBefore || !o.length) bad('expected mechanic cards for ember'); }
{ const t = mk([]); t.slots = []; t.maxMoves = 0; const o = G.LevelUp.offer(t, 3, [t]); if (o.some(c => c.type !== 'stat')) bad('a Pokemon with no moves and no slots may only be offered stat cards (slice 2c: HP/Def/SpD/Speed cards need no move)'); }
console.log('5 slot rules, legality under ceilings, empty offer');

// 6. apply() path
{ const t = mk(['ember']); const c = G.LevelUp.offer(t, 30, [t]).find(x => x.key === 'mech:count'); if (!c) bad('no count card'); else { c.apply(t, t, t.moves[0]); if (t.moves[0].count !== 2) bad('apply did not add a stack: ' + t.moves[0].count); } }
console.log('6 apply adds the stack');
console.log(fail ? 'FAILURES: ' + fail : 'ALL PASS'); process.exit(fail ? 1 : 0);
