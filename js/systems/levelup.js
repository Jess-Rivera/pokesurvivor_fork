/* ============ levelup.js: the three level-up cards ============
 * Slice 5b team-wide cards (G.TeamCards: General, Space, Delivery, Payload, Vitamins) plus New Move: learn a new move (active
 * Pokemon only, only with a free slot; a link frees slots). The draw rolls a FAMILY first, then a card inside it. A card is only
 * offered if at least one team move can take it. Slice 7b-2a (Jess 2026-11-01): the legacy per-move mechanic cards and the
 * per-Pokemon stat cards are gone; these are the only cards. Plan: docs/ASCII Concept Maps/Slice 5b - Parts C to G Plan.txt.
 */
G.LevelUp = (() => {
  const NEW_CANDIDATES = 6;

  // ---- slice 5b: team-wide cards on the new move path (build plan section 3; Parts C to G plan section 2E) ----
  // Weights and steps are slice 6 placeholders.
  const TEAM_W = { newmove: 10, General: 8, Space: 10, Delivery: 8, Payload: 12 };
  const TEAM_COLOR = { General: '#5fcb6a', Space: '#6ea4ff', Delivery: '#4dd6c8', Payload: '#ff8a4d' };
  const VIT_PICK = 3;
  const r1 = (v) => String(Math.round(v * 10) / 10);
  /** A "learn a new move" card; name, type and text come from the resolved move data (slice 7a). */
  function newMoveCard(id) {
    const t = G.MoveInfo.type(id);
    return {
      w: 1,
      family: 'newmove',
      type: 'new',
      key: 'new:' + id,
      icon: 'move:' + id,
      color: G.U.TYPE_COLOR[t],
      tag: G.U.TYPE_NAME[t],
      title: G.MoveInfo.name(id),
      desc: G.MoveInfo.desc(id),
      apply: (p) => p.addMove(id),
    };
  }
  /** Every routed move the team knows, once per id, with its folded def (one team store, so any holder gives the same copy). */
  function teamMoves(roster) {
    const out = [],
      seen = new Set();
    for (const f of roster)
      for (const m of f.moves || []) {
        if (seen.has(m.id) || !G.MoveRoute.routed(m.id)) continue;
        seen.add(m.id);
        const def = G.TeamCards.defOf(f, m.id);
        if (def) out.push({ id: m.id, name: m.name || def.name, def });
      }
    return out;
  }
  const namesOf = (list) => {
    const nm = list.map((x) => x.name);
    return nm.slice(0, 3).join(', ') + (nm.length > 3 ? ' +' + (nm.length - 3) + ' more' : '');
  };

  /** The candidate cards on the new path, grouped by family. A card is offered only when a team move can take it. */
  function teamFamilies(pl, roster) {
    const TC = G.TeamCards,
      s = pl.teamCards,
      fam = {},
      moves = teamMoves(roster);
    const add = (k, c) => {
      if (c) (fam[k] = fam[k] || []).push(c);
    };
    const mk = (c, o) =>
      Object.assign(
        {
          w: c.w || 1,
          family: c.family,
          type: 'team',
          key: 'team:' + c.id,
          team: c.id,
          icon: null,
          ico: TC.stepText(c),
          color: TEAM_COLOR[c.family] || '#9fb1c9',
          tag: c.family,
          title: c.label + ' ' + TC.stepText(c),
          apply: () => TC.add(s, c.id),
        },
        o
      );

    // --- Space, Delivery, Payload: a field card needs a taker; a card at its cap leaves the pool ---
    for (const c of TC.CARDS) {
      if (c.team || c.type) continue;
      if (c.cap && TC.stacks(s, c.id) >= c.cap) continue;
      const takers = moves.filter((x) => TC.usable(c, x.def));
      if (!takers.length) continue;
      add(c.family, mk(c, { desc: 'Team-wide. Works on: ' + namesOf(takers) }));
    }
    // --- General: ONE random Type card per offer (it shares Damage Up's pool) ---
    const types = TC.TYPES.map((t) => TC.cardOf('type:' + t))
      .map((c) => ({ c, takers: moves.filter((x) => TC.usable(c, x.def)) }))
      .filter((x) => x.takers.length);
    if (types.length) {
      const { c, takers } = types[Math.floor(Math.random() * types.length)];
      add(
        'General',
        mk(c, {
          color: (G.U.TYPE_COLOR && G.U.TYPE_COLOR[c.type]) || '#9fb1c9',
          desc: 'Team-wide. Works on: ' + namesOf(takers),
        })
      );
    }
    // --- General: the stat stage cards, only when a team move changes a stat (COMBAT-RULES:SS10) ---
    if (moves.some((x) => TC.hasStat(x.def))) {
      const gc = TC.cardOf('gate'),
        dc = TC.cardOf('duration');
      const g0 = G.Stages.GATE * TC.gateMul(pl),
        g1 = G.Stages.GATE / (1 + (TC.stacks(s, 'gate') + 1) * gc.step);
      add(
        'General',
        mk(gc, {
          desc:
            'Team-wide. Stat stage Gate ' +
            r1(g0) +
            ' s to ' +
            r1(g1) +
            ' s: stat changes your team causes climb sooner',
        })
      );
      const d0 = TC.durOf(pl),
        d1 = G.Stages.DURATION * (1 + (TC.stacks(s, 'duration') + 1) * dc.step);
      add(
        'General',
        mk(dc, {
          desc:
            'Team-wide. Stat stage Duration ' +
            r1(d0) +
            ' s to ' +
            r1(d1) +
            ' s: stat changes your team causes last longer',
        })
      );
    }
    // --- General: HP Regen heals the bench only, so it needs a second member ---
    if (roster.length >= 2) {
      const c = TC.cardOf('regen'),
        a = TC.regen(s);
      add(
        'General',
        mk(c, {
          desc:
            'Benched Pokémon regain ' + r1(a * 100) + '% to ' + r1((a + c.step) * 100) + '% of their max HP per second',
        })
      );
    }
    // --- General: Vitamins, a pick of 3 stats; Attack / Sp. Atk only when a team move uses that category (the old Protein / Calcium rule) ---
    {
      const cats = new Set();
      for (const f of roster) for (const m of f.moves || []) cats.add(G.Stats.moveCat(m));
      const opts = G.U.pickN(
        TC.STATS.filter((st) => !st.cat || cats.has(st.cat)),
        VIT_PICK
      ).slice(0, VIT_PICK);
      if (opts.length) {
        const c = TC.cardOf('vitamins');
        const card = mk(c, {
          type: 'vitamins',
          choice: null,
          desc: 'Team-wide. Choose one: ' + opts.map((st) => st.label + ' (' + st.stat + ')').join(', '),
          options: opts.map((st) => ({
            id: st.id,
            label: st.label,
            stat: st.stat,
            color: st.color,
            now: TC.vit(s, st.id),
            next: TC.vit(s, st.id) + c.step,
          })),
        });
        card.apply = () => {
          if (!card.choice) return false;
          TC.add(s, 'vitamins:' + card.choice);
          if (card.choice === 'hp') for (const f of roster) if (f.refreshMaxHp) f.refreshMaxHp();
          return true;
        };
        add('General', card);
      }
    }
    // --- new moves (active Pokemon only): today's draw, with the new-path buff test for the 2-buff limit ---
    if (pl.slots.length < pl.maxMoves) {
      const buffs = pl.moves.filter((m) => G.MoveInfo.isBuff(m.id)).length;
      const pool = G.Moves.poolFor(pl.mon).filter(
        (id) => !pl.hasMove(id) && !(pl.banned && pl.banned.has(id)) && !(buffs >= 2 && G.MoveInfo.isBuff(id))
      );
      for (const id of G.U.pickN(pool, NEW_CANDIDATES)) add('newmove', newMoveCard(id));
    }
    return fam;
  }

  /** Weighted pick of an index: `ws` is a list of weights. */
  function rollIndex(ws) {
    const total = ws.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < ws.length; i++) {
      r -= ws[i];
      if (r <= 0) return i;
    }
    return ws.length - 1;
  }

  /**
   * Returns up to `n` different cards (an empty list when nothing is left to offer).
   * @param roster  the team (every member's moves count as targets); defaults to just `pl`
   */
  function offer(pl, n = 3, roster = [pl]) {
    const fam = teamFamilies(pl, roster),
      W = TEAM_W;
    const picked = [];
    while (picked.length < n) {
      const names = Object.keys(fam).filter((k) => fam[k].length);
      if (!names.length) break;
      const k = names[rollIndex(names.map((x) => W[x] || 1))];
      const cards = fam[k];
      picked.push(cards.splice(rollIndex(cards.map((c) => c.w)), 1)[0]);
    }
    if (G.Log.on) {
      G.Log.offer(pl.level, picked, pl.rerolls || 0);
      for (const c of picked) {
        const f = c.apply;
        c.apply = function () {
          G.Log.pick(c.key + (c.choice ? '>' + c.choice : ''));
          return f.apply(this, arguments);
        };
      }
    }
    return picked;
  }

  return { offer, teamFamilies, teamBuff: (id) => G.MoveInfo.isBuff(id), TEAM_W };
})();
