/* ============ levelup.js — the three level-up cards ============
 * Upgrade rework (DECISIONS 2026-10-18). Two kinds of card:
 *   new   learn a new move (active Pokemon only; only if there is a free slot; a link frees slots)
 *   stat  a per-Pokemon stat card (HP Up, Protein, ...): after picking it the player chooses a Pokemon (no move step)
 *   mech  a mechanic card (data/mechanics.js): +1 Projectile, +15% Area, ... It is MOVE-SPECIFIC: after
 *         picking it the player chooses a Pokemon, then one of its moves (run-ui.js does the steps).
 * The draw rolls a FAMILY first, then a card inside it, so the 14 mechanics cannot swamp new moves.
 * A card is only offered if at least one move on the team can take it. Weights are a draft (balance later).
 * Slice 5b (?dev&newcombat, single player): offer() draws from teamFamilies() instead: team-wide cards from G.TeamCards (General, Space,
 * Delivery, Payload) plus New Move, and no legacy mechanic or stat card. Plan: docs/ASCII Concept Maps/Slice 5b - Parts C to G Plan.txt.
 */
G.LevelUp = (() => {

  // Family weights: new move, then the three mechanic value classes.
  const FAMILY_W = { newmove: 10, DPS: 14, Coverage: 10, Utility: 6, Stats: 8 };
  const CLASS_COLOR = { DPS: '#ff8a4d', Coverage: '#6ea4ff', Utility: '#b99dff' };
  const NEW_CANDIDATES = 6;

  /** For every team member, which of its moves can take `mech` (and why not, for the dimmed rows). */
  function targetsOf(roster, mech) {
    return roster.map(f => {
      const moves = f.moves.map(m => {
        const c = G.Mechanics.check(m, mech);
        return { m, ok: c.ok, why: c.ok ? '' : G.Mechanics.reason(m, mech) };
      });
      return { pl: f, moves, ok: moves.some(x => x.ok) };
    });
  }

  const stepText = mech => (mech.mode === 'add' ? '+' + mech.step : '+' + Math.round(mech.step * 100) + '%');

  function mechCard(mech, roster) {
    const ts = targetsOf(roster, mech);
    const ok = [];
    for (const t of ts) for (const x of t.moves) if (x.ok) ok.push(x.m);
    if (!ok.length) return null;
    const texts = [...new Set(ok.map(m => G.Mechanics.text(m, mech)))];
    const names = [...new Set(ok.map(m => m.name))];
    const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ' +' + (names.length - 3) + ' more' : '');
    return {
      w: mech.w || 1, family: mech.cls, type: 'mech', key: 'mech:' + mech.id, mech,
      icon: null, ico: stepText(mech), color: CLASS_COLOR[mech.cls] || '#9fb1c9', tag: mech.cls,
      title: texts.length === 1 ? texts[0] : mech.label + ' ' + stepText(mech),
      desc: 'Applies to one move. Works on: ' + shown,
      targets: r => targetsOf(r, mech),
      apply: (active, tp, m) => G.Moves.addStack(m, mech.id)
    };
  }

  /** A stat card: applies to one Pokemon. Protein / Calcium are only offered when a Pokemon has moves of that category,
   *  and are drawn lighter when few of the team's moves are (share floored at 0.25). */
  function statCard(st, roster) {
    const pct = v => Math.round(v * 100) + '%';
    const targets = r => r.map(f => {
      const dmg = f.moves.filter(m => G.Stats.moveCat(m) !== 'status');
      const n = st.cat ? dmg.filter(m => G.Stats.moveCat(m) === st.cat).length : 1;
      const ok = n > 0, cur = f.inc[st.id];
      return { pl: f, moves: [], ok, share: dmg.length ? n / dmg.length : 0,
        note: ok ? st.stat + ' +' + pct(cur) + ' to +' + pct(cur + st.step) : 'No ' + st.cat + ' moves' };
    });
    const ts = targets(roster);
    if (!ts.some(t => t.ok)) return null;
    return {
      w: st.cat ? Math.max(0.25, ...ts.map(t => t.share)) : 1, family: 'Stats', type: 'stat', key: 'stat:' + st.id, stat: st,
      icon: null, ico: '+' + pct(st.step), color: st.color, tag: 'Stat',
      title: st.label + ' +' + pct(st.step),
      desc: 'Raises one Pokémon\'s ' + st.stat + ' by ' + pct(st.step),
      targets,
      apply: (active, tp) => tp.addStat(st.id)
    };
  }

  /** The candidate cards grouped by family (empty families are left out). */
  function families(pl, roster) {
    const fam = {};
    const add = (k, c) => { if (c) (fam[k] = fam[k] || []).push(c); };

    // --- new moves (active Pokemon only) ---
    if (pl.slots.length < pl.maxMoves) {
      // With 2 buffs no more are offered: buffs do no damage and
      // filling the 4 slots with them leaves the run with no way out.
      const buffs = pl.moves.filter(m => m.kind === 'buff').length;
      const pool = G.Moves.poolFor(pl.mon).filter(id =>
        !pl.hasMove(id) && !(pl.banned && pl.banned.has(id)) && !(buffs >= 2 && G.Moves.BY_ID[id].kind === 'buff'));
      for (const id of G.U.pickN(pool, NEW_CANDIDATES)) {
        const d = G.Moves.BY_ID[id];
        add('newmove', {
          w: 1, family: 'newmove', type: 'new', key: 'new:' + id,
          icon: 'move:' + id, color: G.U.TYPE_COLOR[d.type],
          tag: G.U.TYPE_NAME[d.type],
          title: d.name, desc: d.desc,
          apply: p => p.addMove(id)
        });
      }
    }

    // --- mechanic cards, by value class ---
    for (const mech of G.Mechanics.ALL) {
      if (mech.live) add(mech.cls, mechCard(mech, roster));
    }

    // --- scoped damage: ONE random scope per offer (all scopes together count as a single DPS entry) ---
    const sc = G.Mechanics.SCOPED.map(x => mechCard(x, roster)).filter(Boolean);
    if (sc.length) add('DPS', sc[Math.floor(Math.random() * sc.length)]);

    // --- stat cards ---
    for (const st of G.Mechanics.STATS) add('Stats', statCard(st, roster));
    return fam;
  }

  // ---- slice 5b: team-wide cards on the new move path (build plan section 3; Parts C to G plan section 2E) ----
  // Weights and steps are slice 6 placeholders.
  const TEAM_W = { newmove: 10, General: 8, Space: 10, Delivery: 8, Payload: 12 };
  const TEAM_COLOR = { General: '#5fcb6a', Space: '#6ea4ff', Delivery: '#4dd6c8', Payload: '#ff8a4d' };
  const VIT_PICK = 3;
  const teamOn = () => !!(G.MoveRoute && G.MoveRoute.on === true && !(G.Coop && G.Coop.active));
  const r1 = v => String(Math.round(v * 10) / 10);
  /** The 2-buff learn limit: a new-path move is a buff when every effect lands on its own side (G.TeamCards.selfOnly, Jess 2026-10-31);
   *  an unrouted move keeps its legacy kind. */
  const teamBuff = id => (G.MoveRoute.routed(id) ? G.TeamCards.selfOnly(G.MoveDefs[id]) : !!(G.Moves.BY_ID[id] && G.Moves.BY_ID[id].kind === 'buff'));
  /** Every routed move the team knows, once per id, with its folded def (one team store, so any holder gives the same copy). */
  function teamMoves(roster) {
    const out = [], seen = new Set();
    for (const f of roster) for (const m of f.moves || []) {
      if (seen.has(m.id) || !G.MoveRoute.routed(m.id)) continue;
      seen.add(m.id);
      const def = G.TeamCards.defOf(f, m.id);
      if (def) out.push({ id: m.id, name: m.name || def.name, def });
    }
    return out;
  }
  const namesOf = list => { const nm = list.map(x => x.name); return nm.slice(0, 3).join(', ') + (nm.length > 3 ? ' +' + (nm.length - 3) + ' more' : ''); };

  /** The candidate cards on the new path, grouped by family. A card is offered only when a team move can take it. */
  function teamFamilies(pl, roster) {
    const TC = G.TeamCards, s = pl.teamCards, fam = {}, moves = teamMoves(roster);
    const add = (k, c) => { if (c) (fam[k] = fam[k] || []).push(c); };
    const mk = (c, o) => Object.assign({ w: c.w || 1, family: c.family, type: 'team', key: 'team:' + c.id, team: c.id, icon: null,
      ico: TC.stepText(c), color: TEAM_COLOR[c.family] || '#9fb1c9', tag: c.family, title: c.label + ' ' + TC.stepText(c),
      apply: () => TC.add(s, c.id) }, o);

    // --- Space, Delivery, Payload: a field card needs a taker; a card at its cap leaves the pool ---
    for (const c of TC.CARDS) {
      if (c.team || c.type) continue;
      if (c.cap && TC.stacks(s, c.id) >= c.cap) continue;
      const takers = moves.filter(x => TC.usable(c, x.def));
      if (!takers.length) continue;
      add(c.family, mk(c, { desc: 'Team-wide. Works on: ' + namesOf(takers) }));
    }
    // --- General: ONE random Type card per offer (it shares Damage Up's pool) ---
    const types = TC.TYPES.map(t => TC.cardOf('type:' + t)).map(c => ({ c, takers: moves.filter(x => TC.usable(c, x.def)) })).filter(x => x.takers.length);
    if (types.length) {
      const { c, takers } = types[Math.floor(Math.random() * types.length)];
      add('General', mk(c, { color: (G.U.TYPE_COLOR && G.U.TYPE_COLOR[c.type]) || '#9fb1c9', desc: 'Team-wide. Works on: ' + namesOf(takers) }));
    }
    // --- General: the stat stage cards, only when a team move changes a stat (COMBAT-RULES:SS10) ---
    if (moves.some(x => TC.hasStat(x.def))) {
      const gc = TC.cardOf('gate'), dc = TC.cardOf('duration');
      const g0 = G.Stages.GATE * TC.gateMul(pl), g1 = G.Stages.GATE / (1 + (TC.stacks(s, 'gate') + 1) * gc.step);
      add('General', mk(gc, { desc: 'Team-wide. Stat stage Gate ' + r1(g0) + ' s to ' + r1(g1) + ' s: stat changes your team causes climb sooner' }));
      const d0 = TC.durOf(pl), d1 = G.Stages.DURATION * (1 + (TC.stacks(s, 'duration') + 1) * dc.step);
      add('General', mk(dc, { desc: 'Team-wide. Stat stage Duration ' + r1(d0) + ' s to ' + r1(d1) + ' s: stat changes your team causes last longer' }));
    }
    // --- General: HP Regen heals the bench only, so it needs a second member ---
    if (roster.length >= 2) {
      const c = TC.cardOf('regen'), a = TC.regen(s);
      add('General', mk(c, { desc: 'Benched Pokémon regain ' + r1(a * 100) + '% to ' + r1((a + c.step) * 100) + '% of their max HP per second' }));
    }
    // --- General: Vitamins, a pick of 3 stats; Attack / Sp. Atk only when a team move uses that category (the old Protein / Calcium rule) ---
    {
      const cats = new Set();
      for (const f of roster) for (const m of f.moves || []) cats.add(G.Stats.moveCat(m));
      const opts = G.U.pickN(G.Mechanics.STATS.filter(st => !st.cat || cats.has(st.cat)), VIT_PICK).slice(0, VIT_PICK);
      if (opts.length) {
        const c = TC.cardOf('vitamins');
        const card = mk(c, { type: 'vitamins', choice: null,
          desc: 'Team-wide. Choose one: ' + opts.map(st => st.label + ' (' + st.stat + ')').join(', '),
          options: opts.map(st => ({ id: st.id, label: st.label, stat: st.stat, color: st.color, now: TC.vit(s, st.id), next: TC.vit(s, st.id) + c.step })) });
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
      const buffs = pl.moves.filter(m => teamBuff(m.id)).length;
      const pool = G.Moves.poolFor(pl.mon).filter(id => !pl.hasMove(id) && !(pl.banned && pl.banned.has(id)) && !(buffs >= 2 && teamBuff(id)));
      for (const id of G.U.pickN(pool, NEW_CANDIDATES)) {
        const d = G.Moves.BY_ID[id];
        add('newmove', {
          w: 1, family: 'newmove', type: 'new', key: 'new:' + id,
          icon: 'move:' + id, color: G.U.TYPE_COLOR[d.type],
          tag: G.U.TYPE_NAME[d.type],
          title: d.name, desc: d.desc,
          apply: p => p.addMove(id)
        });
      }
    }
    return fam;
  }

  /** Weighted pick of an index: `ws` is a list of weights. */
  function rollIndex(ws) {
    const total = ws.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; }
    return ws.length - 1;
  }

  /**
   * Returns up to `n` different cards (an empty list when nothing is left to offer).
   * @param roster  the team (every member's moves count as targets); defaults to just `pl`
   */
  function offer(pl, n = 3, roster = [pl]) {
    const team = teamOn() && !!pl.teamCards, fam = team ? teamFamilies(pl, roster) : families(pl, roster), W = team ? TEAM_W : FAMILY_W;
    const picked = [];
    while (picked.length < n) {
      const names = Object.keys(fam).filter(k => fam[k].length);
      if (!names.length) break;
      const k = names[rollIndex(names.map(x => W[x] || 1))];
      const cards = fam[k];
      picked.push(cards.splice(rollIndex(cards.map(c => c.w)), 1)[0]);
    }
    if (G.Log.on) {
      G.Log.offer(pl.level, picked, pl.rerolls || 0);
      for (const c of picked) {
        const f = c.apply;
        c.apply = function (p, tp, m) { G.Log.pick(c.key + (m ? '>' + m.id : c.type === 'stat' && tp ? '>' + tp.mon.name : c.choice ? '>' + c.choice : '')); return f.apply(this, arguments); };
      }
    }
    return picked;
  }

  return { offer, families, targetsOf, FAMILY_W, teamFamilies, teamOn, teamBuff, TEAM_W };
})();
