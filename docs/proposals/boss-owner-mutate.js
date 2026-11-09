// Mutation check for slice 7a's gym leader owner (D-ENEMY; Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/boss-owner-mutate.js
// Each mutation breaks boss-ai.js, move-sim.js, move-effects.js, gyms.js, move-route.js, move-render.js, enemy.js or player.js in one deliberate way,
// writes the copy to a temp folder, and runs docs/proposals/boss-owner-harness.js against it (OWNER_<FILE> env vars). The harness must fail
// every time.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { brain: ['js/entities/boss-ai.js', 'OWNER_BRAIN'], sim: ['js/systems/move-sim.js', 'OWNER_SIM'], fx: ['js/systems/move-effects.js', 'OWNER_FX'],
  gyms: ['js/data/gyms.js', 'OWNER_GYMS'], route: ['js/systems/move-route.js', 'OWNER_ROUTE'], render: ['js/systems/move-render.js', 'OWNER_RENDER'], enemy: ['js/entities/enemy.js', 'OWNER_ENEMY'],
  player: ['js/entities/player.js', 'OWNER_PLAYER'] };
const M = [
  ['the cards are not added to the mon', 'brain', [['G.TeamCards.add(e.teamCards, id, g.cards[id]);', '']]],
  ['tempo no longer scales the cooldowns', 'brain', [['e.cdMul = 1 / g.tempo;', 'e.cdMul = 1;']]],
  ['the tell re-aims at the release', 'brain', [['e.aim = c.ang;', 'c.ang = Math.atan2(G.Game.player.y - e.y, G.Game.player.x - e.x); e.aim = c.ang;']]],
  ['a melee tell is as long as a shot', 'brain', [['melee: 0.45,\n', 'melee: 0.5,\n']]],
  ['the self heal cap is gone', 'brain', [['if (this.healsLeft <= 0) return;', '']]],
  ['a self heal does not use up the cap', 'brain', [['this.healsLeft--;', '']]],
  ['the cap ignores the loop', 'brain', [['Math.max(1, Math.floor(g.loop) || 1)', '1']]],
  ['no recovery after the release', 'brain', [['if (c.t >= c.wind + c.after) this.tell = null;', 'if (c.t >= c.wind) this.tell = null;']]],
  ['Harden waits for the attack tell', 'brain', [['      this.buffs(now);', '      if (!this.tell) this.buffs(now);']]],
  ['the melee reach ignores the player body', 'brain', [['(near ? pl.r || 0 : 0)', '(near ? -15 : 0)']]],
  ['the shot ignores its range', 'brain', [['if (dist > G.Gyms.reachOf(d, form) +', "if (form !== 'shot' && dist > G.Gyms.reachOf(d, form) +"]]],
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
  ['ailments skip the player', 'fx', [['    ailment: ailPlayer,', '    ailment: inDamage,']]],
  ['burn and poison go through the control table', 'fx', [['if (DOT.has(fx.id)) {', 'if (false) {']]],
  ['foe drops skip the player', 'fx', [['    flinch: flinchPlayer,\n    stat,', '    flinch: flinchPlayer,\n    stat: inDamage,']]],
  ['the leader drain heals nothing', 'brain', [['e.hp = Math.min(e.maxHp, e.hp + n);', '']]],
  ['Hex ignores your ailment', 'fx', [['(sb && G.Status.majorKind(e) ? sb.multiplier : 1)', '1']]],
  ['leader crits deal no extra damage', 'fx', [['critMul: CRIT_MUL * (o.critDmgMul || 1),', 'critMul: 1,']]],
  ['leader hits get a base crit chance', 'fx', [['crit: c > 0 && rng() < c,', 'crit: rng() < c + 0.05,']]],
  ['no flinch roll gap', 'fx', [['now - last[inst.spec.id] < FLINCH_GAP - EPS', 'false']]],
  ['an asleep player can flinch', 'player', [['if (this.dead || G.Status.stunned(this)) return false;\n    G.MoveSim.flinch(this);', 'if (this.dead) return false;\n    G.MoveSim.flinch(this);']]],
  ['no recoil while moving', 'player', [['const sp = this.walking ?', 'const sp = false ?']]],
  ['no flinch hold', 'sim', [['* (o.cdMul || 1)) + FLINCH_HOLD;', '* (o.cdMul || 1));']]],
  ['no Hex opportunity', 'brain', [['k *= OPP_HEX;', '']]],
  ['a blocked ailment keeps its score', 'brain', [['k *= OPP_BLOCKED;', '']]],
  ['the drop opportunity ignores the tracker', 'brain', [['!G.Stages.tracker(pl, G.MoveEffects.statKey(fx.stat), src, false)', 'true']]],
  ['the opportunity is left out of the score', 'brain', [['* this.opp(d, pl) };', ' };']]],
  ['team cards allowed on a leader', 'gyms', [["else if (c.team && !g.playerEntity)", "else if (false)"]]], // slice 6 retarget; close-out: a gym with the switch off still rejects them
  ['card caps not checked', 'gyms', [['if (c.cap && total[id] > c.cap)', 'if (false)']]],
  ['a beam counts as a melee cone', 'gyms', [["if (v.motion === 'static' && v.targeting === 'nearest' && radial) return 'melee';", "if (v.motion === 'static' && v.targeting === 'nearest') return 'melee';"]]],
  ['a chain move has no gym form again', 'gyms', [["if (d.casterState) return null;", "if (d.casterState || (d.space && d.space.chainHops)) return null;"]]],
  ['a nova counts as a melee cone', 'gyms', [["grow.dim === 'radRadius') return 'nova';", "grow.dim === 'radRadius') return 'melee';"]]],
  ['the nova reach is its starting radius', 'gyms', [["if (form === 'nova') return d.delivery.grow.max;", "if (form === 'nova') return d.space.radRadius;"]]],
  ['a shot reaches its range, not its flight', 'gyms', [["if (form !== 'shot') return range;", 'return range;']]],
  ['a long shot is not capped at its range', 'gyms', [['return life ? Math.min(range, ', 'return life ? (']]],
  ['far mode ignores a short ready shot', 'brain', [['let out = Math.min(FAR, this.ranged() - SHOT_IN)', 'let out = FAR']]],
  ['far mode closes in to the shot reach with no band', 'brain', [['inn = Math.min(NEAR, out - BAND);', 'inn = NEAR;']]],
  ['the brain never picks a nova', 'brain', [["const ORDER = ['melee', 'nova', 'multi',", "const ORDER = ['melee', 'multi',"]]],
  ['the strike follows the player instead of the locked spot', 'brain', [["form === 'delayed' ? { x: pl.x, y: pl.y } : null;", "form === 'delayed' ? pl : null;"]]],
  ['the strike spot never reaches the sim', 'sim', [['castSlot(o, slot, def, now, target ? { aim, target, point: { x: target.x, y: target.y } } : { aim, target });', 'castSlot(o, slot, def, now, { aim, target: null });']]],
  ['chain hops search the enemy grid', 'sim', [['eachFoe(o, prev.x, prev.y, R, (e) => {', 'G.EnemyMgr.queryCircleEach(prev.x, prev.y, R, (e) => {']]],
  ['homing ignores the caster foes', 'sim', [['inst.steer = nearest(inst.cast.owner,', 'inst.steer = nearest(null,']]],
  ['Brock loop 1 cards changed', 'gyms', [['cards: { 1: { damage: 3, count: 2, velocity: 3, area: 2 } }', 'cards: { 1: { damage: 3, count: 2, velocity: 1, area: 2 } }']]],
  ['the card pool does not accumulate across loops', 'gyms', [['if (Number(k) > want) continue;', 'if (Number(k) !== want) continue;']]],
  ['the card cap ignores earlier loops', 'gyms', [['total[id] = (total[id] || 0) + n;', 'total[id] = n;']]],
  ['freshness ignores the cooldown', 'brain', [['/ Math.max(0.05, d.cd * this.e.cdMul)', '/ 1']]],
  ['no point-blank cut', 'brain', [['score: fresh * (blank && !near ? POINT_BLANK : 1)', 'score: fresh']]],
  ['the last cast is stamped at the release, not the tell', 'brain', [['best.s.last = now;', ''], ['          G.Gym.noteCast(c.id);', '          G.Gym.noteCast(c.id); c.slot.last = now;']]],
  ['ties are broken by a coin flip', 'brain', [['(c.score === best.score && c.rank < best.rank)', '(c.score === best.score && Math.random() < 0.5)']]],
  ['the old fixed order is back', 'brain', [['if (!best || c.score > best.score ||', 'if (!best || c.rank < best.rank ||']]],
  ['the render plays your cast for Brock', 'render', [['|| ev.enemy ||', '||']]],
  ['gym leaders keep the boss scale', 'enemy', [['return def.gym ? 1 : boss ? bossScale(def.dex) : 1;', 'return boss ? bossScale(def.dex) : 1;']]]
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
