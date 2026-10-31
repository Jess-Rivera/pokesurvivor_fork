// Mutation check for slice 5b, team-wide cards (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/team-cards-mutate.js
// Each mutation breaks team-cards.js, move-sim.js or move-render.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/team-cards-harness.js against it (TC_<FILE> env vars). The harness must fail every time; a mutation it misses is a gap.
// Parts A and B (store, fold, readers), then parts C to G (Gate and Duration cards, HP Regen, Vitamins, the offer, the sheet summary).
// Also not mutated, with the reason: the enemy path (an enemy carries no team store, so there is no code that could apply our cards to
// it; the 'enemy-caused change' row guards the rule); the Vitamins rows on the card screen and the sheet tab markup (DOM, feel-tested;
// the sheet has a static row); debug.js (static rows only).
// Not mutated, with the reason: the sorted stack order in fold (reordering two or three addends of these sizes seldom changes the last
// bit, so a harness catch would be luck; the order row still guards the rule), and the pure-buff guard in Cooldown Down (a pure buff has
// no cd, rehit or emitter, so the guard is a second fence; the eligibility row checks the result).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { cards: ['js/systems/team-cards.js', 'TC_CARDS'], sim: ['js/systems/move-sim.js', 'TC_SIM'], render: ['js/systems/move-render.js', 'TC_RENDER'],
  fx: ['js/systems/move-effects.js', 'TC_FX'], stages: ['js/systems/stages.js', 'TC_STAGES'], player: ['js/entities/player.js', 'TC_PLAYER'],
  levelup: ['js/systems/levelup.js', 'TC_LEVELUP'] };
const M = [
  // ---- fold ----
  ['the fold writes into G.MoveDefs', 'cards', [['const d = clone(base), pools = new Map();', 'const d = base, pools = new Map();']]],
  ['a rate multiplies instead of divides', 'cards', [['let v = (b + p.add) * (1 + p.inc) * (1 + p.comp) / (1 + p.rate);', 'let v = (b + p.add) * (1 + p.inc) * (1 + p.comp) * (1 - p.rate);']]],
  ['cardLock ignored', 'cards', [['filter(([o, k, l, opt]) => !lock.includes(l) &&', 'filter(([o, k, l, opt]) => true &&']]],
  ['caps ignored', 'cards', [['const k = c.cap ? Math.min(n, c.cap) : n;', 'const k = n;']]],
  ['the floor ignored (Delay Down)', 'cards', [['if (p.floor != null) v = Math.max(v, b * p.floor);', '']]],
  ['the max ignored (arc 360, chance 100)', 'cards', [['if (p.max != null) v = Math.min(v, p.max);', '']]],
  ['a refold applies one stack per card (a diff, not from scratch)', 'cards', [['const k = c.cap ? Math.min(n, c.cap) : n;', 'const k = 1;']]],
  ['children are not folded', 'cards', [['const nodes = d => [[d, null], ...kidsOf(d).map(fx => [fx.move, fx])];', 'const nodes = d => [[d, null]];']]],
  ['a type card hits every type', 'cards', [["targets: d => (d.type === t ? damage(d) : [])", 'targets: d => damage(d)']]],
  // ---- field maps ----
  ['Pierce Up on UNLIMITED', 'cards', [['n.space && num(n.space.pierce)', 'n.space && n.space.pierce != null']]],
  ['Count Up ignores the spread rule', 'cards', [["if (s && num(s.count) && (spreads(s) || dv.motion === 'orbits')) return [T(s, 'count')];", "if (s && num(s.count)) return [T(s, 'count')];"]]],
  ['Time Up scales a plain move\'s own timer', 'cards', [["if (emitsOf(d).length && dv.anchor === 'world') for", 'if (true) for']]],
  ['Time Up lengthens travelling shots', 'cards', [["if (kd.motion !== 'static' || (kd.grow && !num(kd.grow.max))) continue;", 'if (kd.grow && !num(kd.grow.max)) continue;']]],
  ['Recoil Down shrinks a paid shield', 'cards', [["p[opt && opt.comp ? 'comp' : c.mode] += k * c.step;", 'if (!(opt && opt.comp)) p[c.mode] += k * c.step;']]],
  ['Reach Up skips the flight time', 'cards', [["if (mo === 'travels' || mo === 'returns') for (const e of dv.endOn || [])", 'if (false) for (const e of dv.endOn || [])']]],
  ['Cooldown Down slows a trail\'s spacing too', 'cards', [["fx.every > 0 && fx.trigger !== 'casterMove'", 'fx.every > 0']]],
  // ---- store and lazy refold ----
  ['a pick does not raise the cards-picked count', 'cards', [['s.stacks[id] = (s.stacks[id] || 0) + k; s.n += k;', 's.stacks[id] = (s.stacks[id] || 0) + k;']]],
  ['a stale copy is never refolded', 'cards', [['if (e && e.n === s.n && e.base === base) return e.def;', 'if (e) return e.def;']]],
  ['an unchanged refold makes a new object', 'cards', [['if (e && e.base === base && same(e.def, def)) def = e.def;', '']]],
  // ---- readers ----
  ['persistent upkeep reads the frozen def', 'sim', [['      const def = defOf(o, slot.id);\n      if (!def || !def.persistent', '      const def = G.MoveDefs[slot.id];\n      if (!def || !def.persistent']]],
  ['the active slot reads the frozen def', 'sim', [['        const def = defOf(o, slot.id);\n        if (!def || !routed(slot.id) || def.persistent) continue;', '        const def = G.MoveDefs[slot.id];\n        if (!def || !routed(slot.id) || def.persistent) continue;']]],
  ['an inactive slot reads the frozen def', 'sim', [['        const def = defOf(o, slot.id);\n        if (!def || !routed(slot.id) || def.persistent || (def.cd == null', '        const def = G.MoveDefs[slot.id];\n        if (!def || !routed(slot.id) || def.persistent || (def.cd == null']]],
  ['a named child reads the frozen def', 'sim', [["if (typeof fx.move === 'string') return defOf(o, fx.move);", "if (typeof fx.move === 'string') return G.MoveDefs[fx.move];"]]],
  ['a changed def never restarts a live persistent group', 'sim', [['else if (slot.persistDef && slot.persistDef !== def) {', 'else if (false) {']]],
  ['the HUD ring reads the frozen cd', 'render', [['slot.simCd = (pl.teamCards ? G.TeamCards.defOf(pl, ev.moveId) : G.MoveDefs[ev.moveId]).cd;', 'slot.simCd = G.MoveDefs[ev.moveId].cd;']]],
  // ---- restart costs (Jess 2026-10-31) ----
  ['a card restart restarts the heal clock', 'sim', [["endGroup(mine, 'notActive', true);", "endGroup(mine, 'notActive');"]]],
  ['a restart keeps the old heal amount', 'fx', [['if (old) { old.left = left; old.frac = fx.amount.fraction; old.per = fx.per || 1; return; }', 'if (old) { old.left = left; return; }']]],
  ['restarted orbs jump back to their start angle', 'sim', [['if (carry && carry.phase != null) for (const r of roots) r.phase = carry.phase;', '']]],
  ['a restart is reported as a cast', 'sim', [['restart: !!carry });', 'restart: false });']]],
  ['the render plays a restart', 'render', [['if (!pl || ev.restart || !G.MoveRoute.routed(ev.moveId)) return;', 'if (!pl || !G.MoveRoute.routed(ev.moveId)) return;']]],
  // ---- part C: Gate Reduction and Duration Increase (SS10) ----
  ['the Gate card is ignored', 'stages', [['return GATE * (selfDrop ? SELF_DROP_GATE_MUL : 1) * mul;', 'return GATE * (selfDrop ? SELF_DROP_GATE_MUL : 1);']]],
  ['Gate Reduction subtracts instead of dividing', 'cards', [["function gateMul(o) { return 1 / (1 + stacks(o && o.teamCards, 'gate') * STEP('gate')); }", "function gateMul(o) { return 1 - stacks(o && o.teamCards, 'gate') * STEP('gate'); }"]]],
  ['the Duration card is ignored on a first success', 'stages', [['g: gate, d: dur, dl: dur };', 'g: gate, d: DURATION, dl: dur };']]],
  ['the Duration card is ignored on a refresh', 'stages', [['      t.d = dur;', '      t.d = DURATION;']]],
  ['self drops skip the Gate card', 'fx', [['else G.Stages.trackOwn(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0, gm), dur);', 'else G.Stages.trackOwn(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0), dur);']]],
  ['foe drops skip the cards', 'fx', [['if (onFoe) G.Stages.trackOwn(e, k, fx.stages, src, G.Stages.gateOf(false, gm), dur);', 'if (onFoe) G.Stages.trackOwn(e, k, fx.stages, src, G.Stages.gateOf(false));']]],
  ['team raises skip the cards', 'fx', [["else if (fx.scope === 'team') G.Stages.trackTeam(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0, gm), dur);", "else if (fx.scope === 'team') G.Stages.trackTeam(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0));"]]],
  ['a fizzled pure buff ignores the Gate card', 'sim', [['slot.t = G.Stages.gateOf(false, o.teamCards ? G.TeamCards.gateMul(o) : 1);', 'slot.t = G.Stages.gateOf(false);']]],
  // ---- part D: HP Regen and Vitamins ----
  ['regen ignores the max HP cap', 'player', [['this.hp = Math.min(this.maxHp, this.hp + rg * this.maxHp * dt);', 'this.hp = this.hp + rg * this.maxHp * dt;']]],
  ['regen heals the fainted', 'player', [['    if (this.dead) return;\n    this.benched = true;', '    this.benched = true;'], ['if (rg > 0 && !this.dead && this.hp < this.maxHp)', 'if (rg > 0 && this.hp < this.maxHp)']]],
  ['regen heals the active member too', 'player', [['  tickShield(dt) {\n', '  tickShield(dt) {\n    if (this.teamCards) this.hp += G.TeamCards.regen(this.teamCards) * this.maxHp * dt;\n']]],
  ['incOf ignores Vitamins', 'player', [[' + (this.teamCards ? G.TeamCards.vit(this.teamCards, k) : 0); }', '; }']]],
  ['the HP refresh revives a fainted member', 'player', [['if (gain > 0 && !this.dead) this.hp += gain;     // never revives', 'if (gain > 0) this.hp += gain;     // never revives']]],
  // ---- part E: the offer ----
  ['the offer shows legacy cards under the flag', 'levelup', [['const team = teamOn() && !!pl.teamCards,', 'const team = false,']]],
  ['the offer keeps a card with no taker', 'levelup', [['      if (!takers.length) continue;', '']]],
  ['a capped card stays in the pool', 'levelup', [['      if (c.cap && TC.stacks(s, c.id) >= c.cap) continue;', '']]],
  ['Gate and Duration offered with no stat move', 'levelup', [['if (moves.some(x => TC.hasStat(x.def))) {', 'if (true) {']]],
  ['HP Regen offered to a team of one', 'levelup', [['if (roster.length >= 2) {', 'if (roster.length >= 1) {']]],
  ['every Type card in one offer', 'levelup', [['if (types.length) {', 'for (const { c, takers } of types) {'], ['const { c, takers } = types[Math.floor(Math.random() * types.length)];', '']]],
  ['a field card applies nothing', 'levelup', [['apply: () => TC.add(s, c.id) }, o);', 'apply: () => 0 }, o);']]],
  ['Vitamins ignores the Protein / Calcium rule', 'levelup', [['.filter(st => !st.cat || cats.has(st.cat))', '']]],
  ['Vitamins written per member at pick time', 'levelup', [["TC.add(s, 'vitamins:' + card.choice);", 'for (const f of roster) f.badge[card.choice] += c.step;']]],
  ['the HP Vitamin skips the max HP refresh', 'levelup', [["if (card.choice === 'hp') for (const f of roster) if (f.refreshMaxHp) f.refreshMaxHp();", '']]],
  ['the buff limit reads the legacy kind on a routed move', 'levelup', [['const teamBuff = id => (G.MoveRoute.routed(id) ? G.TeamCards.selfOnly(G.MoveDefs[id]) :', 'const teamBuff = id => (false ? 0 :']]],
  ['a foe stat change counts as self', 'cards', [["return !(fx.t === 'stat' ? fx.side !== 'foe' : SELF_T.has(fx.t));", "return !(fx.t === 'stat' ? true : SELF_T.has(fx.t));"]]],
  ['ailments count as self', 'cards', [["const SELF_T = new Set(['heal', 'shield', 'recoil']);", "const SELF_T = new Set(['heal', 'shield', 'recoil', 'ailment']);"]]],
  ['a move with no effect counts as a buff', 'cards', [['return !foe && n > 0;', 'return !foe;']]],
  ['the buff test misses emitted children', 'cards', [["for (const fx of d.payload || []) if (fx.t === 'emit' && fx.move && walk(", "for (const fx of []) if (fx.t === 'emit' && fx.move && walk("]]],
  // ---- part F: the sheet summary ----
  ['the summary drops rate cards', 'cards', [['      const c = BY_ID[id]; if (!c) continue;', "      const c = BY_ID[id]; if (!c || c.mode === 'rate') continue;"]]],
  ['a rate card shows its step, not its cut', 'cards', [["if (c.mode === 'rate') return '-' + Math.round((1 - 1 / (1 + v)) * 100) + '%';", "if (c.mode === 'rate') return '-' + Math.round(v * 100) + '%';"]]],
  ['the summary ignores a cap', 'cards', [['const k = c.cap ? Math.min(n, c.cap) : n, v = k * c.step,', 'const k = n, v = k * c.step,']]]
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'team-cards-mut-'));
let caught = 0;
for (const [name, which, edits] of M) {
  const [rel, env] = SRC[which];
  let s = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, path.basename(rel));
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/team-cards-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
