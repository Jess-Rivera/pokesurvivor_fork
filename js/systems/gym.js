/* ============ gym.js: gym gates, leaders and the badge package (feature/boss-rework) ============
 * Replaces the random legendary rifts. Gym 1 gate opens at 4:00; each later gate opens GAP seconds after the previous gym is beaten
 * AND the player is back on the map. A gate stays until entered. The gym level is the run-time level at gate spawn + LEVEL_OFFSET,
 * locked at spawn and shown on the gate. Inside, the leader fights with hand-authored catalog moves (G.Gyms). Losing (team wipe)
 * ends the run. There is no arena timer: 120 s after the first hit the leader enrages (damage ramps).
 * The arena itself is the rift arena (systems/rift.js); this module owns the schedule, the leader's def and the rewards.
 * Pilot scope: Kanto gym 1 (Brock). The badge boost is a team-wide stat bonus (Player.badge). See BOSS-REWORK.md section 3 and docs/BOSS-AUTHORING.md.
 */
G.Gym = (() => {
  const FIRST_AT = 240, GAP = 240;       // seconds
  const ENRAGE_RAMP = 30, ENRAGE_MAX = 2;
  let beaten = 0, nextAt = FIRST_AT, gate = null, badges = [];
  let fight = null;      // readout of the current gym fight: { t0, hp, minFrac, taken, casts }
  const list = () => G.Gyms.listFor(G.Enemies.region);

  function reset() { beaten = 0; nextAt = FIRST_AT; gate = null; badges = []; fight = null; }

  function now() { return G.Game.st.time; }

  /** Gate schedule: called every game frame (solo / host). */
  function update(dt, pl, t) {
    if (G.Rift.isGym) trackFight(dt, pl, t);
    if (gate || G.Rift.inArena || G.Rift.rift || beaten >= list().length || nextAt == null || t < nextAt) return;
    const entry = list()[beaten], sig = entry.signatures[0];
    const level = Math.round(G.Stats.levelForTime(t)) + G.Gyms.LEVEL_OFFSET;
    gate = { idx: beaten, id: entry.id, leader: entry.leader, badge: entry.badge, arena: entry.arena, boost: entry.boost || null, dex: sig.dex, species: sig.species, level };
    if (!G.Rift.openGate(gate)) { gate = null; nextAt = t + 2; return; }   // no free spot yet: try again shortly
  }

  /** Readout for tuning: how long, how much of your HP it took, the lowest you got, and what it cast. */
  function trackFight(dt, pl, t) {
    if (!fight) fight = { t0: t, hp: pl.hp, minFrac: 1, taken: 0, casts: {}, who: pl.mon && pl.mon.name };
    if (pl.hp < fight.hp) fight.taken += (fight.hp - pl.hp) / (pl.maxHp || 1);
    fight.hp = pl.hp;
    if (pl.maxHp) fight.minFrac = Math.min(fight.minFrac, pl.hp / pl.maxHp);
  }
  function noteCast(id) { if (fight) fight.casts[id] = (fight.casts[id] || 0) + 1; }
  function report(result) {
    if (!fight) return null;
    const secs = Math.round(now() - fight.t0), s = (result || 'fight') + ' after ' + secs + ' s: ' + (fight.who || 'player') + ' took ' + Math.round(fight.taken * 100) + '% of its max HP in total, lowest ' + Math.round(fight.minFrac * 100) + '% HP, casts ' + JSON.stringify(fight.casts);
    console.log('[Gym] ' + s);
    return s;
  }

  /** A leader's move as a live player-style move instance: the catalog move plus its authored upgrade stacks. */
  function buildMove(m) {
    const inst = G.Moves.instance(m.id);
    for (const id in m.stacks || {}) for (let i = 0; i < m.stacks[id]; i++) G.Moves.addStack(inst, id);
    return inst;
  }

  /** The leader's def: HP from the elite reference model with the gym's TTK target, at the gym level. */
  function makeDef(g) {
    const entry = list()[g.idx], sig = entry.signatures[0], mon = G.DEX_BY[sig.dex];
    const tEq = Math.max(0, (g.level - 1) / 49 * 1800);
    const base = { dex: sig.dex, baseHp: mon.stats ? mon.stats[0] : 50 };
    const hp = G.Elites.hpFor(base, tEq, G.Gyms.TTK).hp;
    return {
      dex: sig.dex, name: mon.name, hp, spd: G.Stats.speedToPx(mon.stats ? mon.stats[5] : 65),
      dmg: 20, xp: 0, behavior: 'chase', shotDmg: 10, shotCd: 1, range: 260,
      gym: { level: g.level, leader: g.leader, badge: g.badge, species: sig.species, stance: sig.stance, power: sig.power || 1, tempo: sig.tempo || 1, moves: sig.moves.map(m => Object.assign({}, m, { inst: buildMove(m) })), engagedAt: null }
    };
  }

  /** Damage multiplier from the enrage clock: x1 until ENRAGE_AFTER s after the first hit, then up to x2 over ENRAGE_RAMP s. */
  function enrageMul(e) {
    const x = e.gym;
    if (!x || x.engagedAt == null) return 1;
    const s = now() - x.engagedAt - G.Gyms.ENRAGE_AFTER;
    return s <= 0 ? 1 : 1 + (ENRAGE_MAX - 1) * Math.min(1, s / ENRAGE_RAMP);
  }
  /** Seconds to enrage (0 once enraged), or null before the first hit. */
  function enrageIn(e) {
    const x = e.gym;
    if (!x || x.engagedAt == null) return null;
    return Math.max(0, G.Gyms.ENRAGE_AFTER - (now() - x.engagedAt));
  }

  /** Badge package on a win: level, team revive, the run-long team boost. The item and the Bond come from the boss drop / rift win (Rift.won). */
  function onWin(g) {
    badges.push(g.badge);
    report('won');
    fight = null;
    G.Game.grantLevels(1);                 // guaranteed level (no XP is dropped; the leader pays a level, not orbs)
    G.Game.reviveTeam();                   // full team revive, fainted members included
    let boostText = '';
    if (g.boost) {                         // the badge's run-long team buff (mainline Boulder Badge: +10% Attack)
      G.Game.badgeBoost(g.boost.stat, g.boost.pct);
      boostText = ' +' + Math.round(g.boost.pct * 100) + '% ' + G.Gyms.STAT_LABEL[g.boost.stat] + ' for the whole team,';
    }
    G.Spawner.say(g.badge + ' earned!' + boostText + ' and a level up', 3.6, true);
  }

  /** Back on the map after the arena: schedule the next gate and the next elite. */
  function onReturn(g) {
    beaten++; gate = null;
    nextAt = beaten < list().length ? now() + GAP : null;
    G.Elites.afterGate(now());
  }

  return {
    /** Dev: open the next gate on the next frame. */
    debugOpen() { nextAt = 0; },
    FIRST_AT, GAP, reset, update, noteCast, report, makeDef, enrageMul, enrageIn, onWin, onReturn, now,
    get gate() { return gate; }, get beaten() { return beaten; }, get badges() { return badges; }
  };
})();
