/* ============ team-draft.js, the Team menu's roster rules (G.TeamDraft; #167) ============
 * The Team menu edits a copy of save.team and writes it back after every change (commit). The roster as it was when the
 * menu opened is kept apart, so Revert can put it back. Every way a Pokemon moves (a drag, a lift by keyboard, a number key, a double
 * click, a right click) is one drop() here, so the rules hold whatever the input: slot 1 is never empty, a copy is in one
 * slot only, no copy is lost. No page and no drawing: docs/proposals/team-menu-harness.js tests it.
 * Rules: decisions 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings and 2026-11-24-167-team-menu-saves-at-once.
 *
 * A draft is { team }: six slots, each { dex, shiny, uid } or null. A held Pokemon is { uid, fromSlot } (fromSlot null when
 * it came from a box). Functions that can refuse return { ok: true, ... } or { ok: false, error }.
 */
G.TeamDraft = (() => {
  const LEAD = 0;
  const slotOf = (member) => (member ? { dex: member.dex, shiny: !!member.shiny, uid: member.uid } : null);
  const teamKey = (team) =>
    JSON.stringify(team.map((member) => member && [member.dex, !!member.shiny, member.uid || null]));
  const refused = (error) => ({ ok: false, error });

  const open = (save) => ({ team: save.team.map(slotOf) });
  /** Whether two rosters differ (drafts, or the save's). */
  const differs = (draft, other) => teamKey(draft.team) !== teamKey(other.team);
  /** The roster's copies (not the saved team's): no sale may take one. */
  const uids = (draft) => draft.team.filter((member) => member && member.uid).map((member) => member.uid);
  const slotOfUid = (draft, uid) => draft.team.findIndex((member) => member && member.uid === uid);

  /** A slot as it was, its species and shiny read again from its copy (it may have evolved); null when that is gone. */
  function restored(member, save) {
    if (!member || !member.uid) return slotOf(member);
    const copy = G.Copies.get(save, member.uid);
    return copy ? { dex: copy.speciesID, shiny: copy.isShiny, uid: member.uid } : null;
  }
  /**
   * Puts back the roster as it was opened. A copy you no longer own leaves its slot empty; since the lead's slot is never
   * empty, the first copy still owned moves up into it. With none left the roster stays as it is. The caller commits.
   * Returns { ok, missing }: missing lists the slots whose copy is gone.
   */
  function revert(draft, opened, save) {
    const team = opened.team.map((member) => restored(member, save));
    const missing = opened.team.flatMap((member, slot) => (member && !team[slot] ? [slot] : []));
    if (!team[LEAD]) {
      const next = team.findIndex(Boolean);
      if (next < 0) return { ok: false, missing };
      team[LEAD] = team[next];
      team[next] = null;
    }
    draft.team = team;
    return { ok: true, missing };
  }

  /** Writes the roster to the save; the lead is also the companion. The caller saves. */
  function commit(draft, save) {
    save.team = draft.team.map(slotOf);
    save.partner = save.team[LEAD].dex;
    save.partnerShiny = save.team[LEAD].shiny;
  }

  /** A copy into a slot: the one there makes way, or the two swap when it was on the roster already. */
  function place(draft, save, uid, slot) {
    const copy = G.Copies.get(save, uid);
    if (!copy || !G.DEX_BY[copy.speciesID] || !(slot >= 0 && slot < draft.team.length)) return refused('none');
    const from = slotOfUid(draft, uid),
      displaced = draft.team[slot];
    if (from === slot) return { ok: true, swapped: null };
    if (from === LEAD && !displaced) return refused('lead');
    if (from >= 0) draft.team[from] = displaced;
    draft.team[slot] = { dex: copy.speciesID, shiny: copy.isShiny, uid };
    return { ok: true, swapped: from >= 0 ? displaced : null };
  }

  /** Empties a slot; the lead's never empties. */
  function free(draft, slot) {
    if (slot === LEAD) return refused('lead');
    if (!draft.team[slot]) return refused('none');
    draft.team[slot] = null;
    return { ok: true };
  }

  /**
   * Drops a held Pokemon on a target: { kind: 'slot', slot }, { kind: 'grid' } or { kind: 'box', box }. On the grid a
   * roster member leaves its slot and a box copy stays put. On a box tab the copy moves there (its slot, if any, is
   * untouched); that changes the save at once, so the caller saves when moved is true.
   */
  function drop(draft, save, held, target) {
    if (target.kind === 'slot') return place(draft, save, held.uid, target.slot);
    if (target.kind === 'box') {
      const result = G.Copies.move(save, held.uid, target.box);
      return result === 'ok' ? { ok: true, moved: true } : refused(result);
    }
    return held.fromSlot == null ? { ok: true } : free(draft, held.fromSlot);
  }

  // ---------- selling ----------
  const onTeam = (draft, save, uid) =>
    slotOfUid(draft, uid) >= 0 || save.team.some((member) => member && member.uid === uid);

  /** Why this copy cannot be sold on its own, or null. */
  function sellRefusal(draft, save, copy) {
    if (onTeam(draft, save, copy.pokemonUUID)) return 'Remove it from your team first.';
    return copy.isLocked ? 'Unlock it first.' : null;
  }
  /** Why this copy cannot be part of a bulk sale, or null. */
  const bulkSellRefusal = (draft, save, copy) =>
    sellRefusal(draft, save, copy) || (copy.isFavorite ? 'Bulk sell skips favorites.' : null);

  return { open, differs, uids, slotOfUid, revert, commit, place, free, drop, sellRefusal, bulkSellRefusal };
})();
