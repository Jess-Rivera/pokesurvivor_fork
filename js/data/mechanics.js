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
      case 'stacks':   return 'Max Stack';
      default:         return mech.label;
    }
  }
  function text(m, mech) {
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
    if (mech.id === 'effect') return key === 'amount' ? 'Potency ' + f(base * 100) + '% to ' + f(next * 100) + '% per stack' : 'Power ' + f(base) + ' to ' + f(next);
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
    if (/^(kind|move) has no/.test(w)) return 'Has no ' + noun(m, mech).toLowerCase();
    return w;
  }

  return { ALL, BY_ID, check, eligibleFor, text, noun, preview, reason, TWO_PI };
})();
