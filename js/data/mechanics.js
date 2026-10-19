/* ============ mechanics.js — upgrade mechanics catalogue (upgrade rework, slice 2a) ============
 *
 * A mechanic is a card that raises ONE stat key of ONE move. Which moves can take it is decided from
 * the move's own fields and G.Kinds (never from a kind name or a move id), so imported moves work
 * with no change here.
 *
 *   mode 'add'   value = base + stacks x step              (Count, Pierce, Buff Stacks)
 *   mode 'inc'   value = base x (1 + stacks x step)        (Increased Effect, Area, Width, ...)
 *   mode 'rate'  value = base / (1 + stacks x step)        (a PERIOD in seconds: Recharge, Fire Rate;
 *                                                           additive in rate, so it never reaches 0)
 * Several mechanics on the same key share one pool: all `inc` stacks on a key are SUMMED
 * (x(1 + sum)); then `add` stacks are added to the base first. Order: (base + adds) x (1 + incs).
 * A 'rate' key divides by (1 + sum).
 *
 *   class  DPS | Coverage | Utility   (the three value classes; used for the card draw)
 *   live   false = registered but never offered (the engine cannot honor it yet)
 *   keyFor(m)   the stat key this mechanic raises on move `m`
 *   needs(m, base)  extra eligibility beyond "the kind supports the key"; returns a reason string
 *                   when NOT eligible, else null. `base` is the key's current value (0 when absent).
 *
 * Steps are PLACEHOLDERS, tuned after the catalogue works (see DECISIONS 2026-10-18).
 * A move instance keeps `mods = { mechanicId: stacks }`; G.Moves.derive(m) rebuilds the live fields.
 */
G.Mechanics = (() => {
  const TWO_PI = 6.2832;

  // Burn / poison flags stand for the ailment ('trap' moves such as Fire Spin ride on burn until slice C).
  const ailOf = m => (m.poison ? 'poison' : m.burn ? 'burn' : null);
  const ailName = m => (ailOf(m) === 'poison' ? 'Poison' : 'Burn');
  /** Why `m` cannot take Ailment Chance (a reason string), or null when it can. */
  function ailNeeds(m, base) {
    if (!ailOf(m)) return !m.ailment || m.ailment === 'none' ? 'has no ailment' : 'its ailment is not wired yet';
    if (m.cat === 'status') return 'always applies';
    if (!(base > 0)) return 'no chance to raise';
    if (base >= 100) return 'chance already 100%';
    return null;
  }

  const ALL = [
    // --- DPS ---
    { id: 'effect',   label: 'Increased Effect', cls: 'DPS', mode: 'inc',  step: 0.10, live: true,
      keyFor: m => G.Kinds.effectKey(m.kind),
      needs: (m, base) => (base > 0 ? null : 'power 0, nothing to increase') },
    { id: 'recharge', label: 'Recharge Speed',   cls: 'DPS', mode: 'rate', step: 0.15, live: true,
      keyFor: () => 'cd', needs: () => null },
    { id: 'count',    label: 'Count',            cls: 'DPS', mode: 'add',  step: 1,    live: true,
      keyFor: () => 'count', needs: () => null },
    { id: 'firerate', label: 'Fire Rate',        cls: 'DPS', mode: 'rate', step: 0.15, live: true,
      keyFor: () => 'rate', needs: () => null },
    // Percentage POINTS added to the move's burn / poison chance (a multiplier on a 10% chance would be worthless); capped at 100.
    { id: 'ailchance', label: 'Ailment Chance',  cls: 'DPS', mode: 'add',  step: 10,   live: true,
      keyFor: () => 'ailmentChance', needs: (m, base) => ailNeeds(m, base) },
    // --- Coverage ---
    { id: 'pierce',   label: 'Pierce',           cls: 'Coverage', mode: 'add', step: 1, live: true,
      keyFor: () => 'pierce', needs: () => null },
    { id: 'area',     label: 'Area',             cls: 'Coverage', mode: 'inc', step: 0.15, live: true,
      keyFor: () => 'radius', needs: () => null },
    { id: 'width',    label: 'Width',            cls: 'Coverage', mode: 'inc', step: 0.15, live: true,
      keyFor: () => 'width', needs: () => null },
    { id: 'arc',      label: 'Arc',              cls: 'Coverage', mode: 'inc', step: 0.15, live: true,
      keyFor: () => 'arc', needs: (m, base) => (base >= TWO_PI - 0.01 ? 'arc already at 360 degrees' : null) },
    { id: 'size',     label: 'Size',             cls: 'Coverage', mode: 'inc', step: 0.15, live: true,
      keyFor: () => 'size', needs: () => null },
    { id: 'range',    label: 'Shot Range',       cls: 'Coverage', mode: 'inc', step: 0.15, live: true,
      keyFor: () => 'life', needs: () => null },
    // --- Utility ---
    { id: 'speed',    label: 'Projectile Speed', cls: 'Utility', mode: 'inc', step: 0.15, live: true,
      keyFor: () => 'speed', needs: () => null },
    { id: 'duration', label: 'Duration',         cls: 'Utility', mode: 'inc', step: 0.15, live: true,
      keyFor: () => 'dur', needs: () => null },
    { id: 'knock',    label: 'Knockback',        cls: 'Utility', mode: 'inc', step: 0.20, live: true,
      keyFor: () => 'knock', needs: (m, base) => (base > 0 ? null : 'knockback is 0') },
    { id: 'stacks',   label: 'Buff Stacks',      cls: 'Utility', mode: 'add', step: 1, live: true,
      keyFor: () => 'stacks', needs: () => null }
  ];
  const BY_ID = {};
  for (const x of ALL) BY_ID[x.id] = x;

  // --- Scoped cards (slice 2c): "+15% Fire Damage", "+15% Projectile Damage". They raise the SAME key as
  // Increased Effect, so they sum with it in one pool. Kept out of ALL: the draw offers ONE random scope per
  // offer (levelup.js), so 18 types + 14 kinds cannot flood the DPS family.
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const SCOPED = [];
  const scoped = (id, name, test, scope) => {
    const x = { id, label: name + ' Damage', cls: 'DPS', mode: 'inc', step: 0.15, live: true, scoped: true, scope,
      keyFor: m => G.Kinds.effectKey(m.kind),
      needs: (m, base) => {
        const k = G.Kinds.BY[m.kind];
        if (!k || k.payload !== 'damage') return 'not a damage move';
        if (!test(m)) return 'not a ' + name + ' move';
        return base > 0 ? null : 'power 0, nothing to increase';
      } };
    SCOPED.push(x); BY_ID[id] = x;
  };
  for (const t of Object.keys(G.U.TYPE_COLOR)) scoped('t:' + t, cap(t), m => m.type === t, { type: t });
  for (const k of Object.keys(G.Kinds.BY)) if (G.Kinds.BY[k].payload === 'damage') scoped('k:' + k, cap(G.Kinds.BY[k].wkind), m => m.kind === k, { kind: k });

  // --- Stat cards (slice 2c): per Pokemon, percentage only. Names are PLACEHOLDERS. cat = which moves make it useful.
  const STATS = [
    { id: 'hp',  label: 'HP Up',   stat: 'HP',      step: 0.05, color: '#5fcb6a', cat: null },
    { id: 'atk', label: 'Protein', stat: 'Attack',  step: 0.05, color: '#ff8a4d', cat: 'physical' },
    { id: 'def', label: 'Iron',    stat: 'Defense', step: 0.05, color: '#ffd23f', cat: null },
    { id: 'spa', label: 'Calcium', stat: 'Sp. Atk', step: 0.05, color: '#b99dff', cat: 'special' },
    { id: 'spd', label: 'Zinc',    stat: 'Sp. Def', step: 0.05, color: '#6ea4ff', cat: null },
    { id: 'spe', label: 'Carbos',  stat: 'Speed',   step: 0.05, color: '#4dd6c8', cat: null }
  ];
  const STAT_BY = {};
  for (const s of STATS) STAT_BY[s.id] = s;

  /** Current value of `key` on `m`, treating an absent key as 0 (the kind default for 'add' mechanics). */
  const cur = (m, key) => (m[key] == null ? 0 : m[key]);

  /**
   * Can move `m` (a definition or an instance) take one more stack of `mech`?
   * @returns {{ok:boolean, why?:string, defaulted?:boolean}}
   */
  function check(m, mech) {
    if (!mech.live) return { ok: false, why: 'not live yet' };
    const key = mech.keyFor(m);
    if (!G.Kinds.hasKey(m.kind, key)) return { ok: false, why: 'kind has no ' + key };
    const has = m[key] != null;
    // 'add' mechanics default to 0 when the kind supports the key (a cone without `pierce` can take Pierce).
    if (!has && mech.mode !== 'add') return { ok: false, why: 'move has no ' + key };
    const why = mech.needs(m, cur(m, key));
    return why ? { ok: false, why } : { ok: true, defaulted: !has };
  }

  /** Every live mechanic move `m` can take now. */
  function eligibleFor(m) { return ALL.filter(x => check(m, x).ok); }

  /** Card wording: noun table lives in G.Kinds, step in the mechanic. */
  function noun(m, mech) {
    switch (mech.id) {
      case 'effect':   return G.Kinds.BY[m.kind] && G.Kinds.BY[m.kind].payload === 'buff' ? 'Potency' : 'Damage';
      case 'recharge': return G.Kinds.noun(m.kind, 'recharge', 'Recharge Speed');
      case 'count':    return G.Kinds.noun(m.kind, 'count', 'Count');
      case 'area':     return G.Kinds.noun(m.kind, 'area', 'Area');
      case 'speed':    return G.Kinds.noun(m.kind, 'speed', 'Projectile Speed');
      case 'range':    return 'Range';
      case 'ailchance': return ailName(m) + ' Chance';
      case 'stacks':   return 'Max Stack';
      default:         return mech.label;
    }
  }
  function text(m, mech) {
    if (mech.id === 'ailchance') return '+' + mech.step + ' points ' + ailName(m) + ' Chance';
    return (mech.mode === 'add' ? '+' + mech.step : '+' + Math.round(mech.step * 100) + '%') + ' ' + noun(m, mech);
  }

  const f = x => { const v = +x; return Math.abs(v) >= 100 ? String(Math.round(v)) : String(+v.toFixed(Math.abs(v) < 1 ? 3 : 2)); };

  /** "before to after" for one more stack on `m`, computed with the real derive() so it can never disagree with it. */
  function preview(m, mech) {
    const key = mech.keyFor(m), base = cur(m, key);
    const c = Object.assign({}, m, { mods: Object.assign({}, m.mods) });
    c.mods[mech.id] = (c.mods[mech.id] || 0) + 1;
    G.Moves.derive(c);
    const next = c[key];
    if (mech.id === 'ailchance') return f(base) + '% to ' + f(next) + '%';
    if (mech.id === 'effect' || mech.scoped) return key === 'amount' ? 'Potency ' + f(base * 100) + '% to ' + f(next * 100) + '% per stack' : 'Power ' + f(base) + ' to ' + f(next);
    if (mech.id === 'recharge') return f(base) + ' s to ' + f(next) + ' s';
    if (mech.id === 'firerate') return 'shoots every ' + f(base) + ' s to ' + f(next) + ' s';
    return f(base) + ' to ' + f(next);
  }

  /** Short player-facing reason a move cannot take `mech` (for dimmed rows). */
  function reason(m, mech) {
    const c = check(m, mech);
    if (c.ok) return '';
    const w = c.why || '';
    if (/^power 0/.test(w)) return 'Does no damage';
    if (/^arc already/.test(w)) return 'Arc is already 360\u00b0';
    if (/^knockback/.test(w)) return 'Has no knockback';
    if (/^kind has no ailmentChance/.test(w)) return 'Has no ailment';     // buff kinds never roll one
    if (/^always applies/.test(w)) return 'Always applies';
    if (/^has no ailment/.test(w)) return 'Has no ailment';
    if (/^its ailment/.test(w)) return 'Ailment not in the game yet';
    if (/^chance already/.test(w)) return 'Chance is already 100%';
    if (/^no chance/.test(w)) return 'No chance to raise';
    if (/^not a /.test(w)) return w.charAt(0).toUpperCase() + w.slice(1);
    if (/^(kind|move) has no/.test(w)) return 'Has no ' + noun(m, mech).toLowerCase();
    return w;
  }

  /**
   * One line about a move's burn / poison for the team sheet (chance, DoT per tick as % of max HP, ticks), built from
   * the LIVE move so cards show up in it. '' for moves with no live ailment. Toxic (poison 2) rises by its first-tick amount
   * every turn, so it has no flat total.
   */
  function ailmentText(m) {
    const a = ailOf(m);
    if (!a) return '';
    const bad = a === 'poison' && m.poison >= 2, S = G.Enemies.STATUS[bad ? 'toxic' : a];
    const r = x => String(+(+x).toFixed(1));
    const per = (bad ? S.step : S.frac) * 100 * G.Moves.dotMul(m);
    const head = bad ? 'Bad poison' : a === 'poison' ? 'Poison' : 'Burn';
    const when = m.cat === 'status' ? ' chance always' : ' chance ' + r(m.ailmentChance) + '% per hit';
    if (bad) return head + when + ': ' + r(per) + '% max HP, rising by ' + r(per) + '% every ' + S.turn + ' s, up to ' + S.turns + ' times';
    return head + when + ': ' + r(per) + '% max HP every ' + S.turn + ' s, ' + S.turns + ' times';
  }

  return { ALL, SCOPED, STATS, STAT_BY, BY_ID, check, eligibleFor, text, noun, preview, reason, ailmentText, TWO_PI };
})();
