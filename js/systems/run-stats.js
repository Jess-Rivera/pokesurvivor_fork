/* ============ run-stats.js: the run's counters for the pause menu (G.RunStats, #91) ============
 * Spec: docs/PAUSE-MENU.md sections 4 (Run Stats box) and 6 (Run Info). Maps: docs/ASCII Concept Maps/91c, 91d, 91-1.
 * What the DPS record (G.DpsHistory) already holds is never counted here: each member's damage and time on the field are
 * read from it. This file keeps the rest, per team member (keyed by teamSlot, as the DPS record is) and for the whole run.
 * Run state only, never saved. Leader teams get no record, so every hook is a no-op for them.
 *
 * Who writes it: game.js creates one record per run beside the DPS record (runTeam.runStats), then
 *   Player.onDealt      every hit and every burn / poison tick a member deals (best hit, super effective damage, DoT damage)
 *   Player.onInflicted  a status a member newly landed (move-effects.js ailment, ailPlayer)
 *   Player.hurt         HP a member lost to hits and DoT from others (recoil and Life Orb skip hurt, so they never count)
 *   Player.restoreHp    HP a member got back (heal, bench regen, Shell Bell, Regeneration, springs; a revive is not a heal)
 *   Player.onFaint, revive   the faint count and the down clock (run time, so a pause stops it)
 *   enemy.js payKill    the kill (the enemy's last hitter when it is on your team, else the Pokemon on the field), elites
 *   game.js onCollect   item and ground pickups;   spawner.js   shinies seen
 *
 *   create()                                           a fresh record
 *   dealt(record, member, amount, { typeMult, dot, moveId })   a hit (typeMult > 1 is super effective) or a DoT tick
 *                                                    (dot true); the named part is optional
 *   kill(record, member, elite)   inflicted(record, member, kind)   taken / healed(record, member, amount)
 *   faint(record, member, time)   revive(record, member, time)      item(record)   shiny(record)
 *   member(record, slot)          that slot's counters (zeros for a slot with none yet)
 *   downTime(record, slot, now)   seconds that slot spent fainted, an open faint counted up to now
 *   mostFaints(record)            { slot, faints }: the most faints, the lower slot on a tie; null with no faint
 *   totals(record, now)           the team's sums of every per-member counter
 */
G.RunStats = (() => {
  function create() {
    return { members: [], elites: 0, items: 0, shinies: 0, biggestHit: { slot: null, amount: 0, moveId: null } };
  }

  function blank() {
    return {
      kills: 0,
      bestHit: 0,
      bestHitMoveId: null, // the move of that best hit (91-2; the Run Stats box shows it in 91-3)
      superDamage: 0, // damage of its hits that were super effective (the share is read against its DPS record damage)
      dotDamage: 0,
      taken: 0,
      healed: 0,
      faints: 0,
      downTime: 0, // closed faints, in run seconds
      downSince: null, // run time of the faint still open, or null
      statuses: {}, // kind -> times it newly landed
    };
  }

  /** The member's counters, made on first use; null with no record or no team slot. */
  function own(record, member) {
    const slot = member ? member.teamSlot : null;
    if (!record || slot == null) return null;
    return record.members[slot] || (record.members[slot] = blank());
  }

  function dealt(record, member, amount, { typeMult = 1, dot = false, moveId = null } = {}) {
    const counters = amount > 0 ? own(record, member) : null;
    if (!counters) return;
    if (dot) {
      counters.dotDamage += amount; // a tick is no hit: no best hit, no super effective share
      return;
    }
    if (typeMult > 1) counters.superDamage += amount;
    if (amount > counters.bestHit) {
      counters.bestHit = amount;
      counters.bestHitMoveId = moveId;
    }
    if (amount > record.biggestHit.amount) record.biggestHit = { slot: member.teamSlot, amount, moveId }; // ties: first
  }

  function kill(record, member, elite = false) {
    const counters = own(record, member);
    if (counters) counters.kills++;
    if (record && elite) record.elites++;
  }

  function inflicted(record, member, kind) {
    const counters = own(record, member);
    if (counters) counters.statuses[kind] = (counters.statuses[kind] || 0) + 1;
  }

  function taken(record, member, amount) {
    const counters = amount > 0 ? own(record, member) : null;
    if (counters) counters.taken += amount;
  }

  function healed(record, member, amount) {
    const counters = amount > 0 ? own(record, member) : null;
    if (counters) counters.healed += amount;
  }

  function faint(record, member, time) {
    const counters = own(record, member);
    if (!counters) return;
    counters.faints++;
    counters.downSince = time;
  }

  function revive(record, member, time) {
    const counters = own(record, member);
    if (!counters || counters.downSince == null) return;
    counters.downTime += Math.max(0, time - counters.downSince);
    counters.downSince = null;
  }

  function item(record) {
    if (record) record.items++;
  }

  function shiny(record) {
    if (record) record.shinies++;
  }

  const member = (record, slot) => (record && record.members[slot]) || blank();

  function downTime(record, slot, now) {
    const counters = member(record, slot);
    return counters.downTime + (counters.downSince != null ? Math.max(0, now - counters.downSince) : 0);
  }

  function mostFaints(record) {
    let best = null;
    const members = record ? record.members : [];
    for (let slot = 0; slot < members.length; slot++) {
      const counters = members[slot];
      if (!counters || counters.faints <= 0) continue;
      if (!best || counters.faints > best.faints) best = { slot, faints: counters.faints }; // a tie keeps the lower slot
    }
    return best;
  }

  function totals(record, now) {
    const sum = blank();
    delete sum.downSince;
    const members = record ? record.members : [];
    for (let slot = 0; slot < members.length; slot++) {
      const counters = members[slot];
      if (!counters) continue;
      for (const key of ['kills', 'superDamage', 'dotDamage', 'taken', 'healed', 'faints']) sum[key] += counters[key];
      sum.bestHit = Math.max(sum.bestHit, counters.bestHit);
      sum.downTime += downTime(record, slot, now);
      for (const kind in counters.statuses) sum.statuses[kind] = (sum.statuses[kind] || 0) + counters.statuses[kind];
    }
    return sum;
  }

  return {
    create,
    dealt,
    kill,
    inflicted,
    taken,
    healed,
    faint,
    revive,
    item,
    shiny,
    member,
    downTime,
    mostFaints,
    totals,
  };
})();
