// #91 run counters (slice 91-1) offline checks (Node only). Usage from the repo root:  node docs/proposals/run-stats-harness.js .
// Loads the real js/systems/run-stats.js, dps-history.js, status.js, player.js, player-sim-pass.js, enemy.js and move-effects.js
// with stubbed engine globals (each file can be swapped for a mutation copy, RS_* below). Expected values are hand-derived from
// the approved rules (PAUSE-MENU sections 4 and 6, Jess 2026-11-12): kill credit to the finishing hit's Pokemon (a DoT tick to its
// inflicter), DoT credited to the inflicter (damage and DPS, no hit, no Shell Bell), a faint is any 0 HP (not a Focus Sash save),
// the down clock runs from the faint to a revive, a status counts only when it newly lands, Taken skips self costs (recoil),
// Healed counts every heal but a revive, most faints ties go to the lower slot. Never copied from code output.
// Call sites with no runnable host here (a damage hit, the spawner, game.js, gym.js, springs, dev.html, main.js) are read as text.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const root = process.argv[2] || '.';
const ENV = {
  'js/systems/run-stats.js': 'RS_STATS',
  'js/systems/dps-history.js': 'RS_DPS',
  'js/systems/status.js': 'RS_STATUS',
  'js/entities/player.js': 'RS_PLAYER',
  'js/entities/player-sim-pass.js': 'RS_SIMPASS',
  'js/entities/enemy.js': 'RS_ENEMY',
  'js/systems/move-effects.js': 'RS_EFFECTS',
  'js/systems/spawner.js': 'RS_SPAWNER',
  'js/systems/gym.js': 'RS_GYM',
  'js/game.js': 'RS_GAME',
  'js/systems/interact.js': 'RS_INTERACT',
  'dev.html': 'RS_DEV',
  'js/main.js': 'RS_MAIN',
};
const pathOf = (p) => process.env[ENV[p]] || path.join(root, p);
const text = (p) => fs.readFileSync(pathOf(p), 'utf8');
const load = (p) => vm.runInThisContext(text(p), { filename: p });

let fail = 0,
  n = 0;
const ok = (condition, message) => {
  n++;
  if (!condition) {
    fail++;
    console.log('FAIL ' + message);
  }
};
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ---------- stubbed engine ----------
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const soft = (o) => new Proxy(o, { get: (t, k) => (k in t ? t[k] : noop) });
global.window = global;
global.location = { search: '' };
const base = {};
global.G = new Proxy(base, {
  get: (t, k) => (k in t ? t[k] : noop),
  set: (t, k, v) => {
    t[k] = v;
    return true;
  },
});
base.Log = { on: false };
base.U = soft({ rand: (a, b) => (a + b) / 2, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) });
base.Types = soft({ mult: () => 1, label: () => null });
base.Stages = soft({ teamSum: () => 0, mul: () => 1, clear() {}, tick() {} });
base.TeamCards = soft({ regen: () => 0.01 }); // 1% of max HP per second on the bench
base.Enemies = soft({
  STATUS: {
    burn: { frac: 1 / 16, turn: 2, turns: 4, immune: ['fire'], color: '#f80' }, // js/data/enemies.js STATUS
    poison: { frac: 1 / 8, turn: 2, turns: 4, immune: ['poison', 'steel'], color: '#a4d' },
    toxic: { step: 1 / 16, cap: 15, turn: 2, turns: 8, immune: ['poison', 'steel'], color: '#a4d' },
  },
});
const clock = { time: 0 };
base.Game = soft({ st: clock, evKill() {} });
try {
  for (const p of [
    'js/systems/dps-history.js',
    'js/systems/run-stats.js',
    'js/systems/status.js',
    'js/entities/player.js',
    'js/entities/player-sim-pass.js',
    'js/entities/enemy.js',
    'js/systems/move-effects.js',
  ])
    load(p);
} catch (e) {
  console.log('FAIL a file did not load: ' + e.message);
  process.exit(1);
}
const RS = G.RunStats,
  D = G.DpsHistory,
  PE = G.PlayerEntity;
if (!RS || !D || !PE || !G.WildEntity || !G.EnemyMgr || !G.MoveEffects) {
  console.log('FAIL a module is missing');
  process.exit(1);
}

const team = () => ({ dpsHistory: D.create(), runStats: RS.create() });
const mon = (slot, t, o = {}) =>
  Object.assign(Object.create(PE.prototype), {
    teamSlot: slot,
    team: t,
    x: 0,
    y: 0,
    r: 10,
    bodyH: 20,
    hp: 100,
    maxHp: 100,
    dead: false,
    benched: false,
    invuln: 0,
    flyT: 0,
    flash: 0,
    item: null,
    runItems: [],
    bellHeal: 0,
    sashT: -1e9,
    shield: null,
    slots: [[]],
    active: 0,
    dmgReduce: 0,
    regenFlat: 0,
    kills: 0,
    bosses: 0,
    isPlayer: true,
    mon: { types: ['normal'], stats: null },
    anim: { play() {}, _start() {} },
  }, o);
const wild = (o = {}) =>
  Object.assign(Object.create(G.WildEntity.prototype), {
    hp: 100,
    maxHp: 100,
    dead: false,
    remote: false,
    types: ['normal'],
    burn: 0,
    burnLeft: 0,
    burnTick: 0,
    burnMul: 1,
    burnBy: null,
    poison: 0,
    poisonLeft: 0,
    poisonTick: 0,
    poisonN: 0,
    poisonMul: 1,
    poisonBy: null,
    elite: null,
    statusImmune: () => false,
    immuneText() {},
    hurt(amount) {
      this.hp -= amount;
      if (this.hp <= 0) this.dead = true;
    },
  }, o);
const ownDamage = (t, slot) => (t.dpsHistory.memberDamage[slot] || []).reduce((a, b) => a + (b || 0), 0);
const castOf = (owner, payload, type = 'normal') => ({ spec: { id: 'test', type, category: 'special', payload }, cast: { owner } });
const ailment = (id) => [{ t: 'ailment', id, side: 'foe' }];
const rng = () => 0;

// 1. the module alone
{
  const r = RS.create();
  const a = { teamSlot: 0 },
    b = { teamSlot: 2 };
  const z = RS.member(r, 4);
  ok(z.kills === 0 && z.faints === 0 && z.bestHit === 0 && RS.downTime(r, 4, 99) === 0, 'fresh: every counter is 0');
  ok(RS.mostFaints(r) === null, 'fresh: no most faints');
  RS.dealt(r, a, 30, { typeMult: 2 });
  RS.dealt(r, a, 50);
  RS.dealt(r, a, 20, { typeMult: 0.5 });
  ok(RS.member(r, 0).bestHit === 50, 'best hit is the biggest hit, not a sum (' + RS.member(r, 0).bestHit + ')');
  ok(RS.member(r, 0).superDamage === 30, 'super effective damage counts only hits above x1 (' + RS.member(r, 0).superDamage + ')');
  RS.dealt(r, b, 70);
  ok(r.biggestHit.slot === 2 && r.biggestHit.amount === 70, 'the team biggest hit follows the bigger one, with its slot');
  RS.dealt(r, a, 500, { typeMult: 4, dot: true });
  ok(RS.member(r, 0).dotDamage === 500 && RS.member(r, 0).bestHit === 50 && RS.member(r, 0).superDamage === 30,
    'a DoT tick is DoT damage only: no best hit, no super effective share');
  ok(r.biggestHit.amount === 70, 'a DoT tick is never the biggest hit');
  RS.dealt(r, a, 0, { typeMult: 2 });
  RS.dealt(r, a, -5, { typeMult: 2 });
  ok(RS.member(r, 0).superDamage === 30, 'zero and negative amounts are skipped');
  ok(RS.create().biggestHit.moveId === null && RS.member(r, 5).bestHitMoveId === null, 'fresh: no move on any best hit (91-2)');
  RS.dealt(r, a, 60, { moveId: 'ember' });
  ok(RS.member(r, 0).bestHit === 60 && RS.member(r, 0).bestHitMoveId === 'ember', "a member's best hit keeps its move (91-2)");
  RS.dealt(r, b, 90, { moveId: 'flamethrower' });
  ok(r.biggestHit.slot === 2 && r.biggestHit.amount === 90 && r.biggestHit.moveId === 'flamethrower',
    'the team biggest hit keeps its move (91-2)');
  RS.dealt(r, a, 90, { moveId: 'surf' });
  ok(r.biggestHit.slot === 2 && r.biggestHit.moveId === 'flamethrower', 'a biggest hit tie keeps the first (DH1)');
  ok(RS.member(r, 0).bestHitMoveId === 'surf', "a member's new best hit takes the new move");
  RS.faint(r, a, 10);
  RS.faint(r, b, 12);
  RS.revive(r, b, 15);
  RS.faint(r, b, 20);
  ok(RS.member(r, 2).faints === 2 && RS.member(r, 0).faints === 1, 'faints count per member');
  ok(near(RS.downTime(r, 2, 26), 3 + 6), 'down time: a closed faint (3 s) plus the open one up to now (6 s)');
  RS.revive(r, b, 26);
  ok(near(RS.downTime(r, 2, 40), 9), 'after a revive the down clock stops (still 9 s at 40)');
  RS.revive(r, b, 30);
  ok(near(RS.downTime(r, 2, 40), 9), 'a revive with no open faint changes nothing');
  ok(RS.mostFaints(r).slot === 2 && RS.mostFaints(r).faints === 2, 'most faints: slot 2 with 2');
  RS.revive(r, a, 20); // slot 0 was down 10 s (10 to 20)
  RS.faint(r, a, 41);
  ok(RS.mostFaints(r).slot === 0, 'most faints tie (2 and 2): the lower slot shows');
  RS.inflicted(r, a, 'burn');
  RS.inflicted(r, a, 'burn');
  RS.inflicted(r, b, 'paralysis');
  RS.kill(r, a, false);
  RS.kill(r, b, true);
  RS.taken(r, a, 12);
  RS.healed(r, b, 7);
  RS.item(r);
  RS.item(r);
  RS.shiny(r);
  const sum = RS.totals(r, 41);
  ok(sum.kills === 2 && r.elites === 1, 'kills per member; an elite also counts as an elite');
  ok(sum.statuses.burn === 2 && sum.statuses.paralysis === 1, 'statuses per kind, summed over the team');
  ok(sum.taken === 12 && sum.healed === 7 && sum.faints === 4 && sum.dotDamage === 500, 'team totals are the member sums');
  ok(near(sum.downTime, 10 + 9), 'team down time: slot 0 10 s (and 0 s open), slot 2 9 s (' + sum.downTime + ')');
  ok(r.items === 2 && r.shinies === 1, 'items and shinies count');
  RS.dealt(null, a, 10);
  RS.kill(null, a, true);
  RS.item(null);
  RS.dealt(r, { teamSlot: null }, 10);
  ok(true, 'no record or no slot: every write is a no-op (no throw)');
}

// 2. hits, Shell Bell and old callers (Player.onDealt)
{
  const t = team(),
    A = mon(0, t),
    B = mon(1, t),
    e = wild();
  A.onDealt(5);
  ok(ownDamage(t, 0) === 5 && !e.lastHitBy, 'an old caller (damage only) still records damage and marks nobody');
  A.onDealt(40, { target: e, typeMult: 2 });
  ok(e.lastHitBy === A && RS.member(t.runStats, 0).superDamage === 40, 'a hit marks its target and feeds super effective damage');
  B.onDealt(0, { target: e });
  ok(e.lastHitBy === A, 'a 0 damage hit (immune) does not take the last hit');
  A.item = 'shellbell';
  A.onDealt(100, { target: e, dot: true });
  ok(A.bellHeal === 0, 'Shell Bell ignores a DoT tick, as before');
  A.onDealt(100, { target: e });
  ok(near(A.bellHeal, 4), 'Shell Bell still hears a hit');
  A.onDealt(300, { target: e, moveId: 'hyper-beam' });
  ok(RS.member(t.runStats, 0).bestHitMoveId === 'hyper-beam' && t.runStats.biggestHit.moveId === 'hyper-beam',
    'onDealt hands the move to the record (91-2)');
  A.onDealt(400, { target: e, dot: true, moveId: 'ember' });
  ok(t.runStats.biggestHit.amount === 300 && t.runStats.biggestHit.moveId === 'hyper-beam', 'a tick never takes the biggest hit');
}

// 3. kill credit (enemy.js payKill, D1)
{
  const t = team(),
    A = mon(0, t),
    B = mon(1, t),
    other = mon(0, {});
  const e1 = wild(),
    e2 = wild(),
    e3 = wild({ lastHitBy: other }),
    e4 = wild({ elite: { tier: 1 } }),
    e5 = wild({ boss: true });
  A.onDealt(30, { target: e1 }); // A hits, then B is on the field when it dies (a move still flying after a swap)
  G.EnemyMgr.payKill(e1, B);
  G.EnemyMgr.payKill(e2, B); // never hit: the field Pokemon
  G.EnemyMgr.payKill(e3, B); // last hit by someone not on your team
  ok(RS.member(t.runStats, 0).kills === 1 && RS.member(t.runStats, 1).kills === 2, 'kill credit: the last hitter on your team, else the field Pokemon');
  ok(B.kills === 3, 'the team count (on the field Pokemon) is unchanged: 3');
  G.EnemyMgr.payKill(e4, B);
  G.EnemyMgr.payKill(e5, B);
  ok(t.runStats.elites === 1, 'an elite counts as an elite; a boss does not (' + t.runStats.elites + ')');
}

// 4. statuses on wild enemies (move-effects.js ailment) and their ticks (enemy.js dot)
{
  const t = team(),
    A = mon(0, t),
    B = mon(1, t),
    e = wild({ hp: 20, maxHp: 20 }),
    ME = G.MoveEffects;
  base.Game.player = B; // B on the field while A's burn ticks
  ME.applyHit(castOf(A, ailment('burn'), 'fire'), e, 0, rng);
  ok(e.burn > 0 && e.burnBy === A, 'a burn lands and remembers its caster');
  ok((RS.member(t.runStats, 0).statuses.burn || 0) === 1, 'a newly landed burn counts once');
  ME.applyHit(castOf(A, ailment('burn'), 'fire'), e, 0, rng);
  ME.applyHit(castOf(B, ailment('burn'), 'fire'), e, 0, rng);
  ok(RS.member(t.runStats, 0).statuses.burn === 1 && !RS.member(t.runStats, 1).statuses.burn, 'a refresh counts nothing, for anyone');
  ok(e.burnBy === A, 'the first caster keeps the burn (P6)');
  e.dot('burn', 8, '#f80');
  ok(ownDamage(t, 0) === 8 && ownDamage(t, 1) === 0, "a burn tick lands in the burner's DPS record, not the field Pokemon's");
  ok(RS.member(t.runStats, 0).dotDamage === 8, 'and in its DoT damage');
  e.dot('burn', 50, '#f80'); // 12 HP left: the tick that finishes it
  ok(RS.member(t.runStats, 0).dotDamage === 20, 'a tick credits the HP it took, not the overkill (8 + 12)');
  G.EnemyMgr.payKill(e, B);
  ok(RS.member(t.runStats, 0).kills === 1, 'a burn tick that kills is the burner\'s kill');
  const p = wild();
  ME.applyHit(castOf(B, ailment('poison')), p, 0, rng);
  ok(p.poisonBy === B && RS.member(t.runStats, 1).statuses.poison === 1, 'a poison lands, counts and remembers its caster');
  const q = wild();
  q.applyPoison(2, 1); // a ground trap: no caster
  q.dot('toxic', 5, '#a4d');
  ok(ownDamage(t, 0) === 20 && ownDamage(t, 1) === 0, 'a tick with no caster credits nobody');
  const s = wild();
  ME.applyHit(castOf(A, ailment('paralysis'), 'electric'), s, 0, rng);
  ME.applyHit(castOf(A, ailment('paralysis'), 'electric'), s, 0, rng);
  ok(RS.member(t.runStats, 0).statuses.paralysis === 1, 'a control status counts once; its refresh does not');
  const im = wild({ types: ['electric'] });
  ME.applyHit(castOf(A, ailment('paralysis'), 'electric'), im, 0, rng);
  ok(RS.member(t.runStats, 0).statuses.paralysis === 1, 'an immune target counts nothing');
}

// 5. statuses and ticks on a Player entity (a gym leader's mon: ailPlayer, statusDot)
{
  const t = team(),
    A = mon(0, t),
    L = mon(0, {}); // a leader's mon: its team has no records
  G.MoveEffects.applyHit(castOf(A, ailment('burn'), 'fire'), L, 0, rng);
  ok(L.stDot && L.stDot.by === A && RS.member(t.runStats, 0).statuses.burn === 1, 'a burn on a leader lands, counts and keeps its caster');
  G.MoveEffects.applyHit(castOf(A, ailment('burn'), 'fire'), L, 0, rng);
  ok(RS.member(t.runStats, 0).statuses.burn === 1, 'its refresh counts nothing');
  L.statusDot('burn', 10, null);
  ok(ownDamage(t, 0) === 10 && RS.member(t.runStats, 0).dotDamage === 10, "the leader's burn tick is the burner's damage");
  ok(L.lastHitBy === A, 'and its last hit');
  L.onDealt(10, { target: A });
  L.onFaint();
  ok(true, 'a leader with no record: its hooks are no-ops (no throw)');
}

// 6. faints, the down clock, Taken (Player.hurt, onFaint, revive, payHp)
{
  const t = team(),
    A = mon(0, t),
    B = mon(1, t, { item: 'focussash' });
  clock.time = 5;
  A.hurt(30, null, true);
  ok(RS.member(t.runStats, 0).taken === 30, 'Taken: the HP a hit took');
  A.payHp(10);
  ok(RS.member(t.runStats, 0).taken === 30, 'Taken skips recoil (a self cost)');
  A.invuln = 0;
  A.hurt(500, null, true);
  ok(A.dead && RS.member(t.runStats, 0).faints === 1, 'reaching 0 HP is a faint');
  ok(RS.member(t.runStats, 0).taken === 90, 'Taken stops at the HP it had (30 + 60), no overkill');
  B.hurt(500, null, true);
  ok(!B.dead && RS.member(t.runStats, 1).faints === 0, 'a Focus Sash save is not a faint');
  const bench = mon(2, t, { benched: true, hp: 5 });
  bench.statusDot('poison', 9, null);
  ok(bench.dead && RS.member(t.runStats, 2).faints === 1, 'a bench DoT faint counts');
  clock.time = 12;
  ok(near(RS.downTime(t.runStats, 0, clock.time), 7), 'down 7 s so far (5 to 12)');
  const healedBefore = RS.member(t.runStats, 0).healed;
  A.revive(1);
  ok(RS.member(t.runStats, 0).healed === healedBefore, 'a revive is not a heal');
  clock.time = 30;
  ok(near(RS.downTime(t.runStats, 0, clock.time), 7), 'the revive stopped the down clock at 7 s');
}

// 7. Healed (heal, restoreHp, bench regen, Shell Bell, Regeneration)
{
  const t = team(),
    A = mon(0, t, { hp: 50 });
  A.heal(20);
  ok(RS.member(t.runStats, 0).healed === 20, 'heal(): what it gave');
  A.restoreHp(1000);
  ok(RS.member(t.runStats, 0).healed === 50, 'restoreHp stops at max HP: only what it added (30)');
  const B = mon(1, t, { hp: 50, teamCards: {} });
  B.benchUpdate(1);
  ok(near(RS.member(t.runStats, 1).healed, 1), 'bench regen counts as Healed (1% of 100)');
  const C = mon(2, t, { hp: 50, bellHeal: 4 });
  PE.SimPass.overTime(C, 1);
  ok(near(RS.member(t.runStats, 2).healed, 4), 'Shell Bell counts as Healed');
  const R2 = mon(3, t, { hp: 50, regenFlat: 2 });
  PE.SimPass.overTime(R2, 1);
  ok(near(RS.member(t.runStats, 3).healed, 2), 'Regeneration counts as Healed');
}

// 8. call sites read as text
{
  const fx = text('js/systems/move-effects.js');
  ok(fx.includes('o.onDealt(dmg, { target: e, typeMult: hit.typeMult, moveId: def.id })'),
    'a damage hit hands its target, type multiplier and move');
  ok(fx.includes('o.onDealt(dmg, { target: e, moveId: def.id })'),
    'flat damage hands its target and move, no type multiplier');
  ok(fx.includes('b.owner.onDealt(hit.dealt, { target: pl, typeMult: hit.typeMult, moveId: def.id })'),
    'a hit on a Player entity hands its target, type multiplier and move');
  const sp = text('js/systems/spawner.js');
  ok((sp.match(/\bshinySeen\(\);/g) || []).length === 2 && sp.includes('G.RunStats.shiny('), 'both shiny rolls (wild and elite) count a shiny seen');
  const gm = text('js/game.js');
  ok(gm.includes('runTeam.runStats = G.RunStats.create();'), 'a run makes its record beside the DPS record');
  ok(/if \(mine && \(p\.kind === 'item' \|\| p\.kind === 'ground'\)\) G\.RunStats\.item\(runTeam\.runStats\);/.test(gm), 'item and ground pickups count (D4)');
  ok(/get runStats\(\) \{\s*return runTeam \? runTeam\.runStats : null;/.test(gm), 'G.Game.runStats reads the record');
  const gy = text('js/systems/gym.js');
  ok(/badges\.push\(g\.badge\);\s*splits\.push\(now\(\)\);/.test(gy) && /badges = \[\];\s*splits = \[\];/.test(gy), 'a badge stamps its split; a run clears them');
  ok(text('js/systems/interact.js').includes('pl.restoreHp(pl.maxHp * 0.14 * dt)'), 'a spring heals through restoreHp');
  const dev = text('dev.html');
  const at = (s) => dev.indexOf('<script defer src="js/systems/' + s + '"></script>');
  ok(at('run-stats.js') > at('dps-history.js') && at('dps-history.js') > 0, 'dev.html loads run-stats.js, after dps-history.js');
  ok(/'DpsHistory',\s*'RunStats',/.test(text('js/main.js')), 'the NEED array lists RunStats');
}

// 9. Region Best (#91-2 part C, map docs/ASCII Concept Maps/91-2C; DR1, DR3, DR4, RC1, Jess 2026-11-12). Expected values are
// hand-derived from the approved rules and the map's timeline (best: gym 1 at 4:52, gym 2 at 9:10, gym 3 at 14:20).
{
  const entry = (o) => RS.regionEntry(Object.assign({ loop: 1, splits: [], fightStartedAt: null, endTime: 0 }, o));
  const better = (mine, best) => RS.compareRegion(mine, best).better;
  const cleared3 = entry({ splits: [292, 550, 860], endTime: 1203 });
  ok(cleared3.loop === 1 && cleared3.gyms === 3 && !cleared3.fighting && cleared3.reachedAt === null && cleared3.endTime === 1203,
    'regionEntry: gyms cleared are the splits; a death in the field is not in a fight');
  const inFight = entry({ splits: [292, 550], fightStartedAt: 800, endTime: 845 });
  ok(inFight.gyms === 2 && inFight.fighting && inFight.reachedAt === 800, 'regionEntry: ended inside a gym fight (RC1)');
  const live = [1];
  const copied = entry({ splits: live });
  live.push(2);
  ok(copied.splits.length === 1, 'regionEntry keeps its own copy of the splits');
  ok(better(cleared3, null) && RS.compareRegion(cleared3, null).reason.length > 0, 'no record yet: the first run is the record');
  const many = [1, 2, 3, 4, 5, 6, 7, 8];
  ok(better(entry({ loop: 2 }), entry({ splits: many })) && !better(entry({ splits: many }), entry({ loop: 2 })),
    'a higher loop beats more gyms on a lower loop');
  ok(better(entry({ splits: [1, 2, 3], endTime: 10 }), entry({ splits: [1, 2], endTime: 9999 })), 'more gyms beat a longer run');
  ok(!better(entry({ loop: 3, splits: [1, 2], endTime: 3615 }), entry({ loop: 3, splits: [1, 2, 3], endTime: 4950 })),
    "Jess's example: dying after loop 3 gym 2 at 60:15 never beats loop 3 gym 3 at 82:30");
  const fight3 = entry({ splits: [1, 2], fightStartedAt: 900, endTime: 950 });
  ok(better(fight3, entry({ splits: [1, 2], endTime: 5000 })), 'dying in the gym 3 fight outranks clearing gym 2 (DR4)');
  ok(!better(entry({ splits: [1, 2], endTime: 5000 }), fight3), 'and clearing gym 2 never beats the gym 3 fight');
  ok(better(entry({ splits: [1, 2, 3], endTime: 960 }), fight3), 'clearing gym 3 outranks dying in its fight');
  ok(better(entry({ splits: [1, 2, 3], endTime: 5113 }), entry({ splits: [1, 2, 3], endTime: 5110 })),
    'both cleared gym 3: the later run end wins (85:13 over 85:10, DR3)');
  ok(!better(entry({ splits: [1, 2, 3], endTime: 5107 }), entry({ splits: [1, 2, 3], endTime: 5110 })),
    'both cleared gym 3: the earlier run end does not win');
  const bestFight = entry({ splits: [1, 2], fightStartedAt: 4950, endTime: 5000 });
  ok(better(entry({ splits: [1, 2], fightStartedAt: 4805, endTime: 4900 }), bestFight),
    'both died in the gym 3 fight: the sooner arrival wins (80:05 over 82:30, DR3)');
  ok(!better(entry({ splits: [1, 2], fightStartedAt: 4960, endTime: 9000 }), bestFight),
    'a later arrival at the same fight loses, however long it lasted');
  ok(!better(entry({ splits: [1, 2, 3], endTime: 5110 }), entry({ splits: [1, 2, 3], endTime: 5110 })),
    'an exact tie keeps the old record');
  ok(better(entry({ splits: [1] }), {}), 'a record missing its fields reads as loop 1 with no gyms (old or hand-edited save)');
  const best = cleared3;
  const pace = (mine, now) => RS.pace(mine, now, best);
  ok(RS.pace([], 100, null).kind === 'none', 'pace with no record: none');
  let p = pace([], 100);
  ok(p.kind === 'onPace' && p.next.gym === 1 && p.next.at === 292, 'no gym yet, before 4:52: on pace, next gym 1 at 4:52');
  p = pace([], 300);
  ok(p.kind === 'behind' && near(p.delta, 8), 'no gym yet at 5:00, the record had gym 1 at 4:52: behind by 0:08');
  p = pace([270], 280);
  ok(p.kind === 'ahead' && near(p.delta, 22) && p.next.gym === 2 && p.next.at === 550, 'gym 1 at 4:30: ahead by 0:22');
  p = pace([270], 545);
  ok(p.kind === 'ahead', 'still ahead at 9:05: the record had not beaten gym 2 yet');
  p = pace([270, 590], 600);
  ok(p.kind === 'behind' && near(p.delta, 40), 'gym 2 at 9:50: behind by 0:40');
  p = pace([270, 590], 905);
  ok(p.kind === 'behind' && near(p.delta, 45), 'paused at 15:05 without gym 3 (the record had it at 14:20): behind by 0:45');
  p = pace([292], 300);
  ok(p.kind === 'even' && p.delta === 0, 'gym 1 at exactly 4:52: even');
  p = pace([270, 540, 850], 900);
  ok(p.kind === 'newBest' && p.next === null, "past the record's last gym: new best pace, no next gym");
  const gm = text('js/game.js');
  const end = gm.slice(gm.indexOf('  function endRun('));
  const writeAt = end.indexOf('regionRecord({ write: ok && !coop });'),
    commitAt = end.indexOf("G.DB.commit('run');");
  ok(writeAt > 0 && writeAt < commitAt, 'endRun keeps a better record for solo, clean runs only, before the run is saved');
  ok((end.slice(0, end.indexOf('\n  }\n')).match(/\bclean\(\);/g) || []).length === 1, 'endRun calls clean() once');
  ok(/if \(written\) \{/.test(gm) && /const written = !!\(write && verdict\.better\);/.test(gm),
    'regionRecord writes only when asked and only a better run');
  ok(/G\.RunStats\.compareRegion\(entry, best\)/.test(gm) && /\n    regionRecord,\n/.test(gm),
    'regionRecord uses the one compare and is on G.Game (for G.Debug.recordcheck)');
  ok(/G\.Enemies\.region == null \? 'all' : String\(G\.Enemies\.region\)/.test(gm), "All regions keeps its own key, 'all' (RC2)");
  ok(/get fightStartedAt\(\) \{\s*return fight \? fight\.t0 : null;/.test(text('js/systems/gym.js')),
    'G.Gym.fightStartedAt reads the fight readout start');
}

console.log(fail ? 'run-stats-harness: ' + fail + ' of ' + n + ' FAILED' : 'run-stats-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
