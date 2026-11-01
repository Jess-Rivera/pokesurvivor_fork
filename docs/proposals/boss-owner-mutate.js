// Mutation check for slice 7a's gym leader owner (D-ENEMY; Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/boss-owner-mutate.js
// Each mutation breaks boss-ai.js, move-sim.js, move-effects.js, gyms.js, move-route.js, move-render.js or enemy.js in one deliberate way,
// writes the copy to a temp folder, and runs docs/proposals/boss-owner-harness.js against it (OWNER_<FILE> env vars). The harness must fail
// every time.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { brain: ['js/entities/boss-ai.js', 'OWNER_BRAIN'], sim: ['js/systems/move-sim.js', 'OWNER_SIM'], fx: ['js/systems/move-effects.js', 'OWNER_FX'],
  gyms: ['js/data/gyms.js', 'OWNER_GYMS'], route: ['js/systems/move-route.js', 'OWNER_ROUTE'], render: ['js/systems/move-render.js', 'OWNER_RENDER'], enemy: ['js/entities/enemy.js', 'OWNER_ENEMY'] };
const M = [
  ['the cards are not added to the mon', 'brain', [['G.TeamCards.add(e.teamCards, id, g.cards[id]);', '']]],
  ['tempo no longer scales the cooldowns', 'brain', [['e.cdMul = 1 / g.tempo;', 'e.cdMul = 1;']]],
  ['the tell re-aims at the release', 'brain', [['e.aim = c.ang;', 'c.ang = Math.atan2(G.Game.player.y - e.y, G.Game.player.x - e.x); e.aim = c.ang;']]],
  ['a melee tell is as long as a shot', 'brain', [['melee: 0.45, nova: 0.45, shot: 0.5', 'melee: 0.5, nova: 0.45, shot: 0.5']]],
  ['no recovery after the release', 'brain', [['if (c.t >= c.wind + c.after) this.tell = null;', 'if (c.t >= c.wind) this.tell = null;']]],
  ['Harden waits for the attack tell', 'brain', [['      this.buffs(now);', '      if (!this.tell) this.buffs(now);']]],
  ['the melee reach ignores the player body', 'brain', [['(CLOSE.includes(want) ? pl.r || 0 : 0)', '(CLOSE.includes(want) ? -15 : 0)']]],
  ['the shot ignores its range', 'brain', [['if (dist <= G.Gyms.reachOf(d, want) +', "if (want === 'shot' || dist <= G.Gyms.reachOf(d, want) +"]]],
  ['contact swaps to the cast move', 'brain', [['G.MoveSim.castAt(e, c.slot, this.def(c.id), now, c.ang, c.spot)) {', 'G.MoveSim.castAt(e, c.slot, this.def(c.id), now, c.ang, c.spot)) { e.atkType = this.def(c.id).type; return [0, 0, "Idle"];']], ],
  ['the contact move ignores the enrage', 'brain', [['G.Gym.enrageMul(e) *', '1 *']]],
  ['flinch keeps the tell', 'brain', [['if (c && !c.fired) c.slot.t = Math.max(0.05, this.def(c.id).cd * this.e.cdMul);', 'if (c && !c.fired) { c.slot.t = Math.max(0.05, this.def(c.id).cd * this.e.cdMul); return; }']]],
  ['hpBelow ignored', 'brain', [['s.hpBelow == null || e.hp < e.maxHp * s.hpBelow', 'true']]],
  ['the player is not the foe', 'brain', [['return p && !p.dead ? [p] : [];', 'return p ? [p] : [];']]],
  ['the forced aim is ignored', 'sim', [['const gate = forced || (', 'const gate = (']]],
  ['enemy shapes collide with enemies', 'sim', [['    if (o.foes) {', '    if (false) {']]],
  ['enemy casts are not tagged', 'sim', [['enemy: !!o.foes,', 'enemy: false,']]],
  ['a hit on the player names it as an enemy', 'sim', [['enemyId: o.foes ? null : e.id', 'enemyId: e.id']]],
  ['the player takes the knockback', 'fx', [['hp0 = pl.hp;', 'hp0 = pl.hp; pl.x += 20;']]],
  ['a team raise with no team store is lost', 'fx', [["const teamOf = (fx, o) => fx.scope === 'team' && !!o.stgTeam;", "const teamOf = (fx, o) => fx.scope === 'team';"]]],
  ['the strong-host Gate multiplier is dropped', 'fx', [['* (o.strongHost ? G.Stages.STRONG_HOST_GATE_MUL : 1)', '* (o.strongHost ? 2 : 1)']]],
  ['riders are not noted', 'fx', [["noted.add(def.id + ':' + fx.t);", "noted.add(def.id + ':' + fx.t); continue;"]]],
  ['team cards allowed on a leader', 'gyms', [["else if (c.team) bad.push", "else if (false) bad.push"]]],
  ['card caps not checked', 'gyms', [['else if (c.cap && n > c.cap)', 'else if (false)']]],
  ['a beam counts as a melee cone', 'gyms', [["if (v.motion === 'static' && v.targeting === 'nearest' && radial) return 'melee';", "if (v.motion === 'static' && v.targeting === 'nearest') return 'melee';"]]],
  ['a chain move has no gym form again', 'gyms', [["|| d.casterState || v.delay) return null;", "|| d.casterState || v.delay || (d.space && d.space.chainHops)) return null;"]]],
  ['a nova counts as a melee cone', 'gyms', [["grow.dim === 'radRadius') return 'nova';", "grow.dim === 'radRadius') return 'melee';"]]],
  ['the nova reach is its starting radius', 'gyms', [['? d.delivery.grow.max', '? d.space.radRadius']]],
  ['the brain never picks a nova', 'brain', [["const ORDER = ['melee', 'nova', 'strike', 'shot'];", "const ORDER = ['melee', 'strike', 'shot'];"]]],
  ['the strike follows the player instead of the locked spot', 'brain', [["spot = form === 'strike' ? { x: pl.x, y: pl.y } : null;", "spot = form === 'strike' ? pl : null;"]]],
  ['the strike spot never reaches the sim', 'sim', [['castSlot(o, slot, def, now, { aim, target });', 'castSlot(o, slot, def, now, { aim, target: null });']]],
  ['chain hops search the enemy grid', 'sim', [['eachFoe(o, prev.x, prev.y, R, (e) => {', 'G.EnemyMgr.queryCircleEach(prev.x, prev.y, R, (e) => {']]],
  ['homing ignores the caster foes', 'sim', [['inst.steer = nearest(inst.cast.owner,', 'inst.steer = nearest(null,']]],
  ['slot 1 cards changed', 'gyms', [['cards: { damage: 3, count: 2, velocity: 3, area: 2 }', 'cards: { damage: 3, count: 2, velocity: 1, area: 2 }']]],
  ['the render plays your cast for Brock', 'render', [['|| ev.enemy ||', '||']]],
  ['gym leaders keep the boss scale', 'enemy', [['this.scale = def.gym ? 1 : boss', 'this.scale = boss']]]
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bossowner-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/boss-owner-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name);
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught !== M.length) process.exitCode = 1;
