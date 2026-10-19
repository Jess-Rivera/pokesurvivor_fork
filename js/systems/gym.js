/* ============ gym.js: gym gates, leaders and the badge package (feature/boss-rework) ============
 * Replaces the random legendary rifts. Gym 1 gate opens at 4:00; each later gate opens GAP seconds after the previous gym is beaten
 * AND the player is back on the map. A gate stays until entered. The gym level is the run-time level at gate spawn + LEVEL_OFFSET,
 * locked at spawn and shown on the gate. Inside, the leader fights with hand-authored catalog moves (G.Gyms). Losing (team wipe)
 * ends the run. There is no arena timer: 120 s after the first hit the leader enrages (damage ramps).
 * The arena itself is the rift arena (systems/rift.js); this module owns the schedule, the leader's def and the rewards.
 * Pilot scope: Kanto gym 1 (Brock). The badge run boost is a STUB. See BOSS-REWORK.md section 3 and docs/BOSS-AUTHORING.md.
 */
G.Gym = (() => {
  const FIRST_AT = 240, GAP = 240;       // seconds
  const ENRAGE_RAMP = 30, ENRAGE_MAX = 2;
  let beaten = 0, nextAt = FIRST_AT, gate = null, badges = [];
  const list = () => G.Gyms.listFor(G.Enemies.region);

  function reset() { beaten = 0; nextAt = FIRST_AT; gate = null; badges = []; }

  function now() { return G.Game.st.time; }

  /** Gate schedule: called every game frame (solo / host). */
  function update(dt, pl, t) {
    if (gate || G.Rift.inArena || G.Rift.rift || beaten >= list().length || nextAt == null || t < nextAt) return;
    const entry = list()[beaten], sig = entry.signatures[0];
    const level = Math.round(G.Stats.levelForTime(t)) + G.Gyms.LEVEL_OFFSET;
    gate = { idx: beaten, id: entry.id, leader: entry.leader, badge: entry.badge, arena: entry.arena, dex: sig.dex, species: sig.species, level };
    if (!G.Rift.openGate(gate)) { gate = null; nextAt = t + 2; return; }   // no free spot yet: try again shortly
  }

  /** The leader's def: HP from the elite reference model with the gym's TTK target, at the gym level. */
  function makeDef(g) {
    const entry = list()[g.idx], sig = entry.signatures[0], mon = G.DEX_BY[sig.dex];
    const tEq = Math.max(0, (g.level - 1) / 49 * 1800);
    const base = { dex: sig.dex, baseHp: mon.stats ? mon.stats[0] : 50 };
    const hp = G.Elites.hpFor(base, tEq, G.Gyms.TTK).hp;
    return {
      dex: sig.dex, name: mon.name, hp, spd: G.Stats.speedToPx(mon.stats ? mon.stats[5] : 65),
      dmg: 20, xp: Math.round(400 + g.level * 30), behavior: 'chase', shotDmg: 10, shotCd: 1, range: 260,
      gym: { level: g.level, leader: g.leader, badge: g.badge, species: sig.species, stance: sig.stance, moves: sig.moves.map(m => Object.assign({}, m)), engagedAt: null }
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

  /** Badge package on a win (the item and the Bond come from the existing boss drop / rift win; see Rift.won). */
  function onWin(g) {
    badges.push(g.badge);
    G.Game.grantLevels(1);                 // guaranteed level
    G.Game.reviveTeam();                   // full team revive, fainted members included
    // Run-long boost: STUB until the Bond rework / badge boost decision (Jess, 2026-10-19). Logged so it is visible in the console.
    if (G.Log && G.Log.on) console.log('[Gym] ' + g.badge + ' earned: run boost is a stub, item/level/Bond/revive granted');
    G.Spawner.say(g.badge + ' earned!', 3, true);
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
    FIRST_AT, GAP, reset, update, makeDef, enrageMul, enrageIn, onWin, onReturn, now,
    get gate() { return gate; }, get beaten() { return beaten; }, get badges() { return badges; }
  };
})();
