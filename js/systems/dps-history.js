/* ============ dps-history.js: the run's damage record, one bucket per second (G.DpsHistory, #66) ============
 * Records every second of the run for your team: the team's damage, which roster slot was on the field, and each roster
 * member's own damage. Kept for the whole run (never trimmed), so the HUD's DPS-Upgrades panel (js/ui/hud-dps-panel.js)
 * reads the last 30 s, and a later pause screen or end-of-run screen can read any of it. Run state only, never saved.
 *
 * Who owns what: game.js creates one record per run (runTeam.dpsHistory) and advances its clock once per frame of run
 * time, so a pause or the death beat stops it too. Player.onDealt adds each hit to the member that dealt it, so a move
 * still in flight after a swap credits the Pokemon that cast it. Leader teams get no record.
 *
 *   create()                          a fresh record
 *   advance(record, dt, active)       move the clock on; a second remembers the slot on the field when it ended
 *   record(record, member, damage)    add damage to the current second, for the team and for the member's slot
 *   finishedSeconds(record)           whole seconds completed so far (the current second is still filling)
 *   averageDps(record, seconds, slot) damage per second over the last finished seconds; slot null for the whole team
 *   recent(record, count)             the last finished seconds: { teamDamage, outSlot } arrays, oldest first
 */
G.DpsHistory = (() => {
  const AVERAGE_SECONDS = 5; // the panel's number and the pause screen's average (Jess, 2026-11-10)

  function create() {
    return {
      time: 0, // run seconds this record has seen
      teamDamage: [], // per second: the whole team's damage
      outSlot: [], // per second: the teamSlot on the field when that second ended
      memberDamage: [], // per teamSlot (0 to 5): per second, that member's own damage (holes read as 0)
      lastOutSlot: 0,
    };
  }

  /** Make sure the bucket for second `index` (and every second before it) exists. */
  function fillTo(history, index) {
    while (history.teamDamage.length <= index) {
      history.teamDamage.push(0);
      history.outSlot.push(history.lastOutSlot);
    }
  }

  /** One frame of run time: `active` was on the field for it, so it is the slot of the second the frame ran in (the
   *  last frame of a second wins, so a second shows whoever ended it, the same Pokemon the panel's header names). */
  function advance(history, dt, active) {
    if (!history) return;
    const second = Math.floor(history.time);
    fillTo(history, second);
    if (active && active.teamSlot != null) history.lastOutSlot = history.outSlot[second] = active.teamSlot;
    history.time += dt;
    fillTo(history, Math.floor(history.time));
  }

  function record(history, member, damage) {
    if (!history || !(damage > 0)) return;
    const second = Math.floor(history.time);
    fillTo(history, second);
    history.teamDamage[second] += damage;
    const slot = member && member.teamSlot != null ? member.teamSlot : history.lastOutSlot;
    const own = history.memberDamage[slot] || (history.memberDamage[slot] = []);
    own[second] = (own[second] || 0) + damage;
  }

  const finishedSeconds = (history) => (history ? Math.floor(history.time) : 0);

  function averageDps(history, seconds = AVERAGE_SECONDS, slot = null) {
    const finished = finishedSeconds(history),
      from = Math.max(0, finished - seconds);
    if (finished <= from) return 0;
    const damage = slot == null ? history.teamDamage : history.memberDamage[slot] || [];
    let total = 0;
    for (let second = from; second < finished; second++) total += damage[second] || 0;
    return total / (finished - from);
  }

  function recent(history, count) {
    const finished = finishedSeconds(history),
      from = Math.max(0, finished - count);
    return {
      teamDamage: history ? history.teamDamage.slice(from, finished) : [],
      outSlot: history ? history.outSlot.slice(from, finished) : [],
    };
  }

  return { AVERAGE_SECONDS, create, advance, record, finishedSeconds, averageDps, recent };
})();
