// Mutation check for Leader AI slices 2 (#31, swap and dodge decisions), 3 (#32, confidence, pacing, triggers and lines), 4
// (#33, run memory and the lead read), 5a (#34), #40 (the leader's frame takes your shape) and #50 (Belief, the cooldown window) (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/leader-ai-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs leader-ai-harness.js against it
// (LA_<FILE>). The harness must fail every time; a miss is a gap, a stale pattern is reported as STALE.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const AI = 'js/entities/leader-ai.js',
  IN = 'js/systems/leader-info.js',
  BE = 'js/systems/leader-belief.js',
  MM = 'js/systems/leader-memory.js',
  AR = 'js/systems/gym-arena.js',
  LD = 'js/entities/gym-leader.js',
  BR = 'js/entities/boss-ai.js',
  GY = 'js/data/gyms.js',
  SM = 'js/systems/move-sim.js',
  EF = 'js/systems/move-effects.js';
const ENV = { [AI]: 'LA_AI', [IN]: 'LA_INFO', [BE]: 'LA_BELIEF', [MM]: 'LA_MEM', [AR]: 'LA_ARENA', [LD]: 'LA_LEADER', [BR]: 'LA_BRAIN', [GY]: 'LA_GYMS', [SM]: 'LA_SIM', [EF]: 'LA_EFFECTS' };
const M = [
  // #50 (#49 slice 1): Belief, the cooldown window and the gaps it is derived from
  ['the window never narrows', BE, '    lo += (gap - lo) * memoryUse;\n', ''],
  ['a gap outside has no overshoot', BE, 'if (gap < lo) lo = gap - overshoot;', 'if (gap < lo) lo = gap;'],
  ['no minimum width', BE, 'if (hi - lo < TUNE.minWidth) {', 'if (false) {'],
  ['readiness has no ramp', BE, 'return (since - win.lo) / (win.hi - win.lo);', 'return 1;'],
  ['danger ignores readiness', BE, 'return size * (a.id ? this.readiness(you, a.id) : 1);', 'return size;'],
  ['opportunity ignores its timers', BE, 'if (s.t > 0 || !d ||', 'if (!d ||'],
  ['a switch keeps the gap clean', IN, '      if (last) last.clear(); // GAPS: a switch between two casts spoils the gap\n', ''],
  ['the cast clock runs on the bench', IN, 'return this.field.get(key) || 0;', 'return this.t;'],
  ['the gaps are not kept for the run', IN, 'for (const store of mem ? [own, mem.gaps] : [own]) {', 'for (const store of [own]) {'],
  ['the long window stays 15 s', IN, 'LONG = 10;', 'LONG = 15;'],
  ['the Decider keeps its memoryUse', AI, 'info.tick(dt, S.memoryUse);', 'info.tick(dt);'],
  ['the Decider reads Info directly', AI, '  watch(e, dt) {\n    const info = G.LeaderBelief.current;', '  watch(e, dt) {\n    const info = G.LeaderInfo.current;'],
  // slice 5a (#34): a leader on your sim scheduler
  ['your scheduler ignores castDue', SM, '(o.castDue ? o.castDue(slot, def, now) : castSlot(o, slot, def, now))', 'castSlot(o, slot, def, now)'],
  ['the active slot recharges twice', SM, '            if (act.includes(slot)) continue;\n', ''],
  ['the caster skips your sim pass', LD, '    G.MoveSim.turn(dt, e, now);\n', ''],
  // #40: the leader's frame takes your shape (decision 2026-11-09-every-player-entity-runs-one-flow-decide-hands-body-sim)
  ['a stun leaves the wind-up running', LD, 'if (e.tell && !e.tell.fired && G.Status.stunned(e)) this.cancel(e);', ''],
  ['a cancelled attack counts as cast', LD, 'c.slot.last = c.prevLast;', ''],
  ['a stunned body starts a wind-up', LD, 'return this.acceptsCast() && !this.stFl', 'return !this.stFl'], // #41 retarget: the Body's acceptance (#43: built on your acceptsCast)
  ['the body never reads its slot keys', LD, '    this.takeSlotInput();\n', ''],
  ['the sim pass runs before the body', LD, '    super.update(dt);\n    this.lastStep = { moved: Math.hypot(this.x - ox, this.y - oy), dt }; // state the Decider reads (its edge unstick, #41)\n    this.tickSlotLock(dt);\n    if (!this.dead) G.GymLeader.SimPass.frame(this, dt, G.Gym.now());', '    if (!this.dead) G.GymLeader.SimPass.frame(this, dt, G.Gym.now());\n    super.update(dt);\n    this.lastStep = { moved: Math.hypot(this.x - ox, this.y - oy), dt };\n    this.tickSlotLock(dt);'], // #43 retarget: fieldFrame
  ['the first wait is hard-coded', LD, 'this.firstWaitLeft = rules.firstWait != null ? rules.firstWait : 0;', 'this.firstWaitLeft = 1.6;'],
  // #41: the Body accepts, the SimPass resolves, through your due handoff
  ['the first wait is ignored by the Body', LD, ' && !(this.firstWaitLeft > 0);', ';'],
  ['a flinch hold accepts an attack', LD, 'return this.acceptsCast() && !this.stFl', 'return this.acceptsCast()'],
  ['an attack starts with no due handoff', LD, '    if (running && e.tell === running) this.telling(e, dt, now);', "    if (running && e.tell === running) this.telling(e, dt, now);\n    else if (!e.tell) for (const s of e.activeGroup()) if (s.t <= 0.5) this.due(e, s, e.moveDef(s.id), now);"],
  ['a new wind-up advances on its first frame', LD, '    if (running && e.tell === running) this.telling(e, dt, now);', '    if (e.tell) this.telling(e, dt, now);'],
  ['the AI gates its heading on a stun', AI, 'e.heading = this.unstick(e, dt, this.steer(e, dt, pl));', 'e.heading = G.Status.stunned(e) ? [0, 0] : this.unstick(e, dt, this.steer(e, dt, pl));'],
  ['the AI stops deciding while stunned', AI, 'e.heading = this.unstick(e, dt, this.steer(e, dt, pl));', 'if (G.Status.stunned(e)) return;\n    e.heading = this.unstick(e, dt, this.steer(e, dt, pl));'],
  ['the unstick reads the whole frame, not its own step', LD, 'this.lastStep = { moved: Math.hypot(this.x - ox, this.y - oy), dt };', 'this.lastStep = { moved: 0, dt };'],
  ['a slot press is answered once for good', AI, '        this.slotQ = [];\n        return q;', '        return q;'],
  ['the validator ignores firstWait', GY, "if (rules.firstWait != null && !(typeof rules.firstWait === 'number' && rules.firstWait >= 0))", 'if (false)'],
  // #41 (decision 2026-11-09-four-roles-decider-controller-body-sim-pass): each role does only its own job
  ['a leader always takes the wild divisor', EF, " && pl.rule('wildStatusDivisor') === true;", ';'],
  ['a leader never takes the wild divisor', EF, " && pl.rule('wildStatusDivisor') === true;", ' && false;'],
  ['the validator ignores wildStatusDivisor', GY, "if (rules.wildStatusDivisor != null && typeof rules.wildStatusDivisor !== 'boolean')", 'if (false)'],
  ['a heal waits until hurt again', LD, '    if (e.healsLeft <= 0) return;', '    if (!(e.hp < e.maxHp) || e.healsLeft <= 0) return;'],
  ['unhurt it sits on the heal slot', AI, 'if (choice >= 0 || S.hpFrac < 1) return choice;', 'return choice;'],
  ['the AI keeps its stun exception', AI, 'const free = !this.busy(e);', 'const free = G.Status.stunned(e) || !this.busy(e);'],
  // the stall guards and STAY
  ['minField is ignored', AI, "if (this.fieldT < S.minField - LeaderAI.EPS) return 'minField';", ''],
  ['swapLimit is ignored', AI, "if (S.swapLimit != null && this.swaps >= S.swapLimit) return 'swapLimit';", ''],
  ['a send-in does not restart the clock', AR, 't.ai.arrived(false);', ''],
  ['a voluntary swap does not restart the clock', AR, 't.ai.arrived(true);', ''],
  ['the margin is off', AI, 'if (best.score < S.stay * margin - LeaderAI.EPS) {', 'if (best.score < S.stay - LeaderAI.EPS) {'],
  ['a swap is decided inside a tell', AI, 'const free = !this.busy(e);', 'const free = true;'],
  ['the recovery counts as the tell', AI, 'return !!((c && !c.fired) || e.mvRoot', 'return !!(c || e.mvRoot'],
  // the triggers
  ['cc ignores the time left', AI, 'M.t >= S.ccLeft - LeaderAI.EPS', 'M.t > 0'],
  ['the low HP save repeats', AI, 'if (frac(e) < S.lowHp && !this.saved.has(e) && !this.healLeft(e)) {', 'if (frac(e) < S.lowHp && !this.healLeft(e)) {'],
  ['a spent heal cap still counts', AI, 'return e.healsLeft > 0 && this.pool(e)', 'return this.pool(e)'],
  ['the matchup HP floor is off', AI, 'if (frac(c.m) < S.matchupHp - LeaderAI.EPS) continue;', ''],
  // the matchup
  ['no STAB', BE, '(m.types.includes(d.type) ? 1.5 : 1)', '1'],
  ['every move of yours counts as revealed', BE, "for (const id of you && belief ? belief.reveals(you).moves : []) {", "for (const id of ['vine-whip', 'ember', 'tackle', 'growl']) {"],
  ['a tie ignores power', BE, '(k === best.k && d.basePower > best.power)', 'false'],
  ['the guess takes the first type', BE, 'if (!best || k > best.k) best = { id: null, type, k, power: 0 };', 'if (!best) best = { id: null, type, k, power: 0 };'],
  // dodges
  ['no reflex', AI, 'this.pending = { at: this.clock + S.reflex, serial: th.serial };', 'this.pending = { at: this.clock, serial: th.serial };'],
  ['a dodge inside a commitment', AI, 'if (this.busy(e)) return; // held', 'if (false) return; // held'],
  ['a dodge with no charge to spare', AI, 'if (ready <= S.dodgeReserve) {', 'if (ready <= 0 && false) {'],
  ['dodgeReserve is ignored', AI, 'if (ready <= S.dodgeReserve) {', 'if (ready <= 0) {'],
  ['the bag rolls dice', AI, 'for (let i = 0; i < n; i++) a.push(i < this.reads);', 'for (let i = 0; i < n; i++) a.push(this.rng() < this.reads / n);'],
  ['the floor is ignored', AI, 'left = Math.abs(l - r) < LeaderAI.UNSTICK.tie ? off >= 0 : l > r;', 'left = off >= 0;'],
  ['it dodges toward the path', AI, '? off >= 0 : l > r;', '? off < 0 : l > r;'],
  ['a still shape: dodged sideways', AI, 'if (!th.vx && !th.vy) return this.lean(e, G.U.norm(e.x - th.x, e.y - th.y));', ''],
  ['a miss is a threat', IN, 'if (d2 > reach * reach) return null;', ''],
  // the swap consequences
  ['a bench faint is not paid', AR, 'G.EnemyMgr.payKill(f, G.Game.player);', ''],
  ['a bench faint is the boss kill', AR, 'f.boss = false;\n', ''],
  ['a bench faint is loud', LD, 'if (this.benched) return; // a faint on the bench', 'if (false) return; // a faint on the bench'],
  // slice 3 (#32): confidence
  ['aggr ignores confidence', AI, '(this.conf - 0.5) * LeaderAI.CONF.pull', '0'],
  ['the swap margin ignores confidence', AI, '(1 + (this.conf - 0.5) * LeaderAI.CONF.marginK)', '1'],
  ['no floor or ceiling', AI, 'this.conf = G.U.clamp(this.conf, S.confMin, S.confMax);', ''],
  ['its own faint lifts it', AI, "(ev.side === 'yours' ? C.faint : -C.faint)", 'C.faint'],
  ['confSwing is ignored', AI, 'k = LeaderAI.off.confidence ? 0 : S.confSwing;', 'k = LeaderAI.off.confidence ? 0 : 1;'],
  ['no drift', AI, 'if (Math.abs(lead) >= C.trade - LeaderAI.EPS) this.conf +=', 'if (false) this.conf +='],
  ['the long window never empties', IN, 'while (this.hits.length && this.hits[0].t < this.t - LONG) this.hits.shift();', ''],
  ['any shape counts as hers', IN, 'if (inst && inst.cast && team.includes(inst.cast.owner) && pl)', 'if (pl)'],
  ['its own faints are not seen', IN, "if (m.dead && !this.downOwn[i]) this.feed.push({ k: 'faint', side: 'own' });", ''],
  ['your send-in is not seen', IN, "this.feed.push({ k: 'sendIn' });", ''],
  // pacing
  ['the breather cap is off', AI, "const cap = this.stance === 'breather' && this.breathT >= S.breatherMax * this.clock - LeaderAI.EPS;", 'const cap = false;'],
  ['no wait between breathers', AI, 'this.clock >= this.breathNext - LeaderAI.EPS &&', 'true &&'],
  ['a breather length ignores aggression', AI, 'P.breathLen * (1.5 - a)', 'P.breathLen'],
  ['frustration ignores aggression', AI, 'S.pushAfter * (1.5 - a)', 'S.pushAfter'],
  ['a landed hit does not end a push', AI, "if (this.stance === 'push') this.endStance('landed a hit');", ''],
  ['no pressing an advantage', AI, 'if (this.conf >= P.pressConf - LeaderAI.EPS && you && you.hp < you.maxHp * P.pressHp)', 'if (false)'],
  ['a mon arriving keeps the stance', AI, "if (this.stance !== 'neutral') this.endStance('a mon arrives');", ''],
  ['a swap resets the breather share', AI, "if (this.stance !== 'neutral') this.endStance('a mon arrives');", "this.breathT = 0;\n    if (this.stance !== 'neutral') this.endStance('a mon arrives');"],
  ['a breather picks no quiet slot', AI, 'if (q >= 0) i = q !== e.active ? q : -1;', ''],
  ['a breather holds back casts', LD, '    if (!pl || !e.acceptsAttack()', "    if (!pl || e.ai.stance === 'breather' || !e.acceptsAttack()"], // #40, #41, #47a retarget: the attack start is the SimPass's
  ['the stance hold is ignored', BR, "if (this.hold) this.mode = tight ? 'far' : this.hold;", ''],
  // the lean and the gap-closing dodge
  ['no lean', AI, 'if (!p || Math.abs(a) < LeaderAI.EPS) return [dx, dy];', 'return [dx, dy];'],
  ['the lean goes past you', AI, '(a > 0 ? Math.min(a, Math.abs(to)) : a)', 'a'],
  ['the lean goes the wrong way', AI, 'r = Math.sign(to) *', 'r = -Math.sign(to) *'],
  ['gapClose is ignored', AI, 'if (this.aggr() < S.gapClose - LeaderAI.EPS || this.pending || e.dodgeT > 0) return;', 'if (this.pending || e.dodgeT > 0) return;'],
  ['a gap-close spends the last charge', AI, 'if (ready <= S.dodgeReserve + 1) return;', 'if (ready <= S.dodgeReserve) return;'],
  ['a gap-close with no close move ready', AI, 'if (!this.pool(e).some((s) => s.t <= 0 && LeaderAI.CLOSE', 'if (false && !this.pool(e).some((s) => s.t <= 0 && LeaderAI.CLOSE'],
  ['a gap-close ignores the dodge length', AI, 'if (d <= reach || d - G.PlayerEntity.DODGE.dist > reach) return;', 'if (d <= reach) return;'],
  ['a gap-close in a breather', AI, "if (!info || this.stance === 'breather') return;", 'if (!info) return;'],
  // triggers and lines
  ['repeat is ignored', AI, 'if (tr.fired && !tr.d.repeat) continue;', 'if (tr.fired) continue;'],
  ['once is ignored', AI, 'if (tr.fired && !tr.d.repeat) continue;', ''],
  ['a trigger fires inside a commitment', AI, 'if (free) this.fireTriggers(e);', 'this.fireTriggers(e);'],
  ['an HP line never re-arms', AI, 'if (frac >= d.below) tr.arm = true;', ''],
  ['a set lasts forever', AI, 'd.for != null ? this.clock + d.for : Infinity', 'Infinity'],
  ['a trigger slot skips your slot hold', AI, 'if (d.slot != null) this.pressSlot(e, d.slot - 1, true);', 'if (d.slot != null) e.setActive(d.slot - 1, true);'],
  ['a line ignores the banner', AI, 'if (G.Spawner.banner()) return;', ''],
  ['a line is never dropped', AI, 'if (this.clock - l.at > LeaderAI.LINE_WAIT + LeaderAI.EPS) {', 'if (false) {'],
  ['no swing line cooldown', AI, 'if (this.clock - this.swingAt >= C.swingCd - LeaderAI.EPS) {', 'if (true) {'],
  // the validator and the authoring
  ['the 0 to 1 check is off', GY, "if (vals.some((x) => typeof x === 'number' && x > 1)) bad.push(", 'if (false) bad.push('],
  ['a trigger may do nothing', GY, "if (t.line == null && t.slot == null && t.swap == null && t.set == null) bad.push(T + ' does nothing');", ''],
  ["Misty's aggression is the baseline", GY, 'aggression: 0.68,', 'aggression: 0.5,'],
  // slice 4 (#33): the store and the pattern
  ['the store outlives the run', MM, '    end() {\n      store = null;', '    end() {'],
  ['learnRate is ignored', MM, 'return best && !tie && best.n >= learnRate ? best : null;', 'return best && !tie ? best : null;'],
  ['a tie is a pattern', MM, '} else if (n === best.n) tie = true;', '}'],
  // the feed
  ['the lead is the first mon seen', IN, 'if (t > 0 && (!best || t > best.t)) best = { k, t };', 'if (t > 0 && !best) best = { k, t };'],
  ['a faint send-in is a swap', IN, 'if (out.dead) return G.LeaderMemory.bump(this.mem.team.afterFaint, kIn);', ''],
  ['every swap is low HP', IN, 'm.hp / m.maxHp < LOW', 'm.hp / m.maxHp < 1'],
  ['sentIn never ends', IN, 'if (this.t - this.leaderAt <= SENT) out.push', 'if (true) out.push'],
  ['a dodge counts every frame', IN, 'started = dodging && !this.dodging;', 'started = dodging;'],
  // stale reveals
  ['no stale reveals', IN, 'for (const id of this.staleOf(key, m.maxMoves || FULL))', 'for (const id of [])'],
  ['a stale move outlives 10 s', IN, '(this.field.get(key) || 0) >= STALE - 1e-9', 'false'],
  ['a stale move is never seen missing', IN, 'return seen.length >= full ? [] : old.filter', 'return old.filter'],
  // the read
  ['no read', AI, 'if (!this.opened) this.open(e);', ''],
  ['the read waits out minField', AI, 'if (best.j === here) return;', 'if (best.j === here || this.swapGate()) return;'],
  ['the cap is ignored', AI, 'if (!mem.cap.next()) return', 'if (false) return'],
  ['a tie swaps', AI, '(b.score > a.score + LeaderAI.EPS ? b : a)', '(b.score >= a.score - LeaderAI.EPS ? b : a)'],
  ['the read is of your mon on the field', AI, 'for (const c of list) c.score = this.matchup(c.m, you);', 'for (const c of list) c.score = this.matchup(c.m);'],
  ['the memory switch is ignored', AI, 'if (LeaderAI.off.memory || !mem) return;', 'if (!mem) return;'],
  ['the read line waits its turn', AI, 'if (d.line) this.say(d.line, d.on === \'exploit\');', 'if (d.line) this.say(d.line);'],
  ['no exploit trigger', AI, "(ev.k === 'exploit' && d.on === 'exploit')", 'false'],
  // the authoring and the validator
  ["Misty's learnRate is the baseline", GY, '        learnRate: 2,\n', ''],
  ['the predictCap check is off', GY, 'if (caps.some((x) => typeof x === \'number\' && x > 10))', 'if (false)'],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leader-ai-mut-'));
let caught = 0,
  bad = 0;
for (const [name, file, a, b] of M) {
  const s = fs.readFileSync(path.join(root, file), 'utf8');
  if (!s.includes(a)) {
    console.log('STALE mutation (pattern not found): ' + name);
    bad++;
    continue;
  }
  const out = path.join(tmp, path.basename(file));
  fs.writeFileSync(out, s.replace(a, b));
  const env = Object.assign({}, process.env, { [ENV[file]]: out });
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/leader-ai-harness.js')], { env, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n');
  if (r.status !== 0) {
    caught++;
    console.log('caught  ' + name + '  (' + (lines.find((l) => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')');
  } else {
    bad++;
    console.log('MISSED  ' + name);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(caught + '/' + M.length + ' mutations caught');
process.exit(bad ? 1 : 0);
