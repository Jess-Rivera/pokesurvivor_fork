/* ============ team-cards.js: team-wide upgrade cards on the new move path (G.TeamCards, slice 5b) ============
 *
 * Jess 2026-10-30 / 31: every card is TEAM-WIDE for the run. A pick adds one stack to the run's ONE team store, shared by the whole
 * roster (game.js, like stgTeam). Which moves a card touches comes from the move's own fields, never `kind`.
 *
 * Effective definition (combat-architecture D4, I2, section C step 3): one copy per move id, built LAZILY. A pick only raises the
 * store's cards-picked count `n`; defOf() refolds a copy built at an older count FROM SCRATCH (the frozen def plus ALL team stacks),
 * so the order of picks never matters and a move learned later gets every card picked so far. G.MoveDefs is never written. With no
 * store (harness fixtures) or no card picked, defOf returns G.MoveDefs[id] itself. A refold that changes nothing keeps the old
 * object, so a live persistent group only respawns when its own numbers changed.
 *
 * Fold per field: (base + sum add) x (1 + sum inc) / (1 + sum rate), then the field's floor (a fraction of base) and max. A formula
 * field (Substitute's shield) is wrapped in a multiply. Stacks over a card's cap count as the cap. cardLock (the root move's list)
 * blocks a field everywhere in the move, inline emitted children included; children are folded with their parent (they are the
 * team's move) and named children fold by their own id (move-sim childOf). Team cards (Gate, Duration, HP Regen, Vitamins) change no
 * move field; their readers are stages.js, move-effects.js and player.js.
 * Steps, caps and weights are PLACEHOLDERS for slice 6. Plan: docs/ASCII Concept Maps/Slice 5b - Build Plan.txt, section 3.
 *
 *   store()                  a fresh team store { n, stacks, cache }
 *   add(store, id, k = 1)    k more stacks of card `id` (n goes up by k); returns the card's new stack count
 *   stacks(store, id)        current stacks of card `id`
 *   defOf(o, id)             the effective def for owner `o` (o.teamCards), refolded on its first read after a pick
 *   fold(def, stacks)        the pure fold (tests, tools); returns `def` itself when no field changes
 *   targets(card, def)       the [object, key, lock, opts] fields `card` changes on `def` (empty = the move cannot use it)
 *   usable(card, def)        true when one more stack of `card` changes `def`
 *   CARDS, BY_ID, TYPES, cardOf(id)   (type cards are 'type:fire' and so on)
 *   gateMul(o), durOf(o)     part C (COMBAT-RULES:SS10): the caster team's Gate multiplier and stat stage Duration (1 and 6.1 s with no store)
 *   regen(store), vit(store, k)   part D: the benched heal per second (fraction of max HP) and the team Vitamins bonus on stat k
 *   hasStat(def), selfOnly(def)   part E: a Gate / Duration taker; the new-path buff test for the 2-buff limit (every effect on its own side)
 *   stepText(card), summary(store)   parts E and F: card text, and the team sheet's "Run Cards" rows { id, label, family, stacks, total }
 */
G.TeamCards = (() => {
  const TAU = 6.2832, EPS = 1e-9;
  const TYPES = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock',
    'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  const num = v => typeof v === 'number' && isFinite(v);
  const emitsOf = d => (d.payload || []).filter(fx => fx.t === 'emit');
  const kidsOf = d => emitsOf(d).filter(fx => fx.move && typeof fx.move === 'object');
  /** The root and every inline emitted child, each as [node, its emit effect or null]. */
  const nodes = d => [[d, null], ...kidsOf(d).map(fx => [fx.move, fx])];
  const fxOf = (d, t) => { const o = []; for (const [n] of nodes(d)) for (const fx of n.payload || []) if (fx.t === t) o.push(fx); return o; };
  const isPureBuff = d => !d.space && (d.payload || []).length > 0 && d.payload.every(fx => fx.t === 'stat' && fx.side !== 'foe');
  const spreads = s => !!s && (s.count > 1 || s.spread > EPS);
  const T = (o, k, lock = k, opt = null) => [o, k, lock, opt];

  // ---- field maps, one per card (section 3 of the build plan) ----
  function area(d) {
    const out = [];
    for (const [n] of nodes(d)) {
      const s = n.space, dv = n.delivery || {}, g = dv.grow;
      if (s && num(s.radRadius)) out.push(T(s, 'radRadius'));
      if (s && num(s.linLength)) out.push(T(s, 'linLength'));
      if (num(dv.orbitRadius)) out.push(T(dv, 'orbitRadius'));
      if (g && (g.dim || 'radRadius') !== 'radArc') {     // a growing size scales its whole curve, like the lens (D36)
        const dim = g.dim || 'radRadius';
        if (num(g.growSpeed)) out.push(T(g, 'growSpeed', dim));
        if (num(g.max)) out.push(T(g, 'max', dim));
      }
    }
    return out;
  }
  function presence(d) {
    const out = [];
    for (const [n] of nodes(d)) {
      const s = n.space, g = (n.delivery || {}).grow;
      if (s && num(s.radArc) && s.radArc < TAU - 0.01) out.push(T(s, 'radArc', 'radArc', { max: TAU }));     // never a point (no radArc), never a full circle
      if (s && num(s.linWidth)) out.push(T(s, 'linWidth'));
      if (g && g.dim === 'radArc') {
        if (num(g.growSpeed)) out.push(T(g, 'growSpeed', 'radArc'));
        if (num(g.max) && g.max < TAU - 0.01) out.push(T(g, 'max', 'radArc', { max: TAU }));
      }
    }
    return out;
  }
  /** Only copies that spread out: a fan or several shapes, an orbit, an emitter's fan, or emissions spaced in time. */
  function count(d) {
    const s = d.space, dv = d.delivery || {};
    if (s && num(s.count) && (spreads(s) || dv.motion === 'orbits')) return [T(s, 'count')];
    const out = [];
    for (const fx of kidsOf(d)) {
      const ks = fx.move.space;
      if (ks && num(ks.count) && spreads(ks)) out.push(T(ks, 'count'));
      else if (num(fx.count) && num(fx.every)) out.push(T(fx, 'count'));
    }
    return out;
  }
  const pierce = d => nodes(d).filter(([n]) => n.space && num(n.space.pierce)).map(([n]) => T(n.space, 'pierce'));     // UNLIMITED is Infinity: never
  const chain = d => nodes(d).filter(([n]) => n.space && num(n.space.chainHops)).map(([n]) => T(n.space, 'chainHops'));
  /** Root only: the range where range is the reach, and the flight time of a travelling root (so a shot reaches farther). */
  function reach(d) {
    const dv = d.delivery || {}, mo = dv.motion, out = [];
    const reaches = mo === 'travels' || mo === 'returns' || mo === 'repositions' || mo === 'falls' || dv.targeting === 'location';
    if (reaches && dv.locationPick !== 'caster' && num(dv.range)) out.push(T(dv, 'range'));
    if (mo === 'travels' || mo === 'returns') for (const e of dv.endOn || []) if (num(e.time) && e.time > 0) out.push(T(e, 'time'));
    return out;
  }
  const delay = d => { const dv = d.delivery || {}; return num(dv.delay) && dv.delay > 0 ? [T(dv, 'delay', 'delay', { floor: 0.5 })] : []; };
  function velocity(d) {
    const out = [];
    for (const [n] of nodes(d)) {
      const dv = n.delivery || {};
      if (num(dv.moveSpeed) && dv.moveSpeed > 0) out.push(T(dv, 'moveSpeed'));
      if (num(dv.angularSpeed) && dv.angularSpeed !== 0) out.push(T(dv, 'angularSpeed'));
    }
    return out;
  }
  /** PLACED things only (Jess, 2026-10-31): each inline child that sits still (puddles, trail patches, Discharge rings; never a shot that
   *  travels, and never an uncapped growth, whose timer IS its size), plus the root's timer when the root is a placed world emitter
   *  (Toxic Spikes, Will-O-Wisp's turret). Never a plain move's own timer. */
  function time(d) {
    const out = [];
    for (const fx of kidsOf(d)) {
      const kd = fx.move.delivery || {};
      if (kd.motion !== 'static' || (kd.grow && !num(kd.grow.max))) continue;
      for (const e of kd.endOn || []) if (num(e.time) && e.time > 0) out.push(T(e, 'time'));
    }
    const dv = d.delivery || {};
    if (emitsOf(d).length && dv.anchor === 'world') for (const e of dv.endOn || []) if (num(e.time) && e.time > 0) out.push(T(e, 'time'));
    return out;
  }
  /** cd on a cooldown move; rehit on persistent or ticking hitboxes; an emitter's interval (not a trail's spacing). Never a pure buff. */
  function cooldown(d) {
    if (isPureBuff(d)) return [];
    const out = [];
    if (!d.persistent && num(d.cd) && d.cd > 0) out.push(T(d, 'cd'));
    for (const [n] of nodes(d)) if (num(n.rehit) && n.rehit > 0) out.push(T(n, 'rehit'));
    for (const fx of emitsOf(d)) if (num(fx.every) && fx.every > 0 && fx.trigger !== 'casterMove') out.push(T(fx, 'every'));
    return out;
  }
  const damage = d => (num(d.basePower) && d.basePower > 0 ? [T(d, 'basePower', 'power')] : []);     // D5: P = basePower; inline children inherit it
  const knockback = d => fxOf(d, 'knockback').filter(fx => num(fx.distance) && fx.distance > 0).map(fx => T(fx, 'distance', 'knockback'));
  const ailment = d => fxOf(d, 'ailment').filter(fx => num(fx.chance) && fx.chance > 0 && fx.chance < 100).map(fx => T(fx, 'chance', 'chance', { max: 100 }));
  const heal = d => fxOf(d, 'heal').filter(fx => fx.amount && num(fx.amount.fraction)).map(fx => T(fx.amount, 'fraction', 'heal'));
  const shield = d => { const o = []; for (const fx of fxOf(d, 'shield')) { if (fx.amount != null) o.push(T(fx, 'amount', 'shield')); if (fx.max != null) o.push(T(fx, 'max', 'shield')); } return o; };
  /** Recoil Down. A shield built from the HP paid (Substitute: 2 x paid) is compensated so it stays at full size (Jess, 2026-10-31):
   *  `comp` multiplies by (1 + stacks x step), undoing the smaller payment exactly. */
  const paysShield = fx => JSON.stringify(fx).includes('cast.paid');
  function recoil(d) {
    const out = fxOf(d, 'recoil').filter(fx => num(fx.fraction) && fx.fraction > 0).map(fx => T(fx, 'fraction', 'recoil', { floor: 0 }));
    if (out.length) for (const fx of fxOf(d, 'shield')) for (const k of ['amount', 'max']) if (fx[k] != null && paysShield(fx[k])) out.push(T(fx, k, 'recoil', { comp: true }));
    return out;
  }

  // ---- the catalogue (Jess, 2026-10-30; build plan 2026-10-31). `team` cards change no move field. ----
  const CARDS = [
    { id: 'gate',      label: 'Gate Reduction',    family: 'General',  team: true, mode: 'rate', step: 0.10 },
    { id: 'duration',  label: 'Duration Increase', family: 'General',  team: true, mode: 'inc',  step: 0.10 },
    { id: 'regen',     label: 'HP Regen',          family: 'General',  team: true, mode: 'add',  step: 0.005 },
    { id: 'vitamins',  label: 'Vitamins',          family: 'General',  team: true, mode: 'add',  step: 0.05 },
    { id: 'area',      label: 'Area Up',           family: 'Space',    mode: 'inc',  step: 0.15, targets: area },
    { id: 'presence',  label: 'Presence Up',       family: 'Space',    mode: 'inc',  step: 0.15, targets: presence },
    { id: 'count',     label: 'Count Up',          family: 'Space',    mode: 'add',  step: 1, cap: 3, w: 0.5, targets: count },
    { id: 'pierce',    label: 'Pierce Up',         family: 'Space',    mode: 'add',  step: 1, cap: 4, w: 0.5, targets: pierce },
    { id: 'chain',     label: 'Chain Up',          family: 'Space',    mode: 'add',  step: 1, targets: chain },
    { id: 'reach',     label: 'Reach Up',          family: 'Delivery', mode: 'inc',  step: 0.15, targets: reach },
    { id: 'delay',     label: 'Delay Down',        family: 'Delivery', mode: 'rate', step: 0.15, targets: delay },
    { id: 'velocity',  label: 'Velocity Up',       family: 'Delivery', mode: 'inc',  step: 0.15, targets: velocity },
    { id: 'time',      label: 'Time Up',           family: 'Delivery', mode: 'inc',  step: 0.15, targets: time },
    { id: 'cooldown',  label: 'Cooldown Down',     family: 'Delivery', mode: 'rate', step: 0.15, targets: cooldown },
    { id: 'damage',    label: 'Damage Up',         family: 'Payload',  mode: 'inc',  step: 0.10, targets: damage },
    { id: 'knockback', label: 'Knockback Up',      family: 'Payload',  mode: 'inc',  step: 0.20, targets: knockback },
    { id: 'ailment',   label: 'Ailment Chance Up', family: 'Payload',  mode: 'add',  step: 10, targets: ailment },
    { id: 'heal',      label: 'Heal Up',           family: 'Payload',  mode: 'inc',  step: 0.15, targets: heal },
    { id: 'shield',    label: 'Shield Up',         family: 'Payload',  mode: 'inc',  step: 0.15, targets: shield },
    { id: 'recoil',    label: 'Recoil Down',       family: 'Payload',  mode: 'rate', step: 0.15, targets: recoil }
  ];
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  for (const t of TYPES) CARDS.push({ id: 'type:' + t, label: cap1(t) + ' Damage', family: 'General', mode: 'inc', step: 0.15, type: t,
    targets: d => (d.type === t ? damage(d) : []) });     // shares Damage Up's pool (same field)
  const BY_ID = {};
  for (const c of CARDS) BY_ID[c.id] = c;
  const cardOf = id => BY_ID[id] || null;

  /** Fields `card` changes on `def`: cardLock and maxed fields removed. */
  function targets(card, def) {
    if (!card || !card.targets || !def) return [];
    const lock = def.cardLock || [];
    return card.targets(def).filter(([o, k, l, opt]) => !lock.includes(l) && !(opt && opt.max != null && num(o[k]) && o[k] >= opt.max - EPS));
  }
  const usable = (card, def) => targets(card, def).length > 0;

  // ---- fold ----
  const clone = v => (Array.isArray(v) ? v.map(clone) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v);
  const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) freeze(o[k]); } return o; };
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => same(a[k], b[k]));
  }

  function fold(base, stacks) {
    if (!base) return base;
    const d = clone(base), pools = new Map();
    let touched = false;
    for (const id of Object.keys(stacks || {}).sort()) {     // sorted: the pool sums never depend on the order of picks
      const c = BY_ID[id], n = stacks[id];
      if (!c || !c.targets || !(n > 0)) continue;
      const k = c.cap ? Math.min(n, c.cap) : n;
      for (const [o, key, , opt] of targets(c, d)) {
        let P = pools.get(o);
        if (!P) pools.set(o, (P = {}));
        const p = P[key] || (P[key] = { add: 0, inc: 0, rate: 0, comp: 0, floor: null, max: null });
        p[opt && opt.comp ? 'comp' : c.mode] += k * c.step;
        if (opt && opt.floor != null) p.floor = opt.floor;
        if (opt && opt.max != null) p.max = opt.max;
        touched = true;
      }
    }
    if (!touched) return base;
    for (const [o, P] of pools) for (const key of Object.keys(P)) {
      const p = P[key], b = o[key];
      if (typeof b === 'number') {
        let v = (b + p.add) * (1 + p.inc) * (1 + p.comp) / (1 + p.rate);
        if (p.floor != null) v = Math.max(v, b * p.floor);
        if (p.max != null) v = Math.min(v, p.max);
        o[key] = v;
      } else if (b && typeof b === 'object') o[key] = { op: 'multiply', args: [b, (1 + p.inc) * (1 + p.comp) / (1 + p.rate)] };     // a formula (Substitute's shield)
    }
    return freeze(d);
  }

  // ---- the team store and the lazy effective def ----
  const store = () => ({ n: 0, stacks: {}, cache: new Map() });
  function add(s, id, k = 1) { s.stacks[id] = (s.stacks[id] || 0) + k; s.n += k; return s.stacks[id]; }
  const stacks = (s, id) => (s && s.stacks[id]) || 0;
  function defOf(o, id) {
    const base = G.MoveDefs[id], s = o && o.teamCards;
    if (!s || !s.n || !base) return base;
    const e = s.cache.get(id);
    if (e && e.n === s.n && e.base === base) return e.def;
    let def = fold(base, s.stacks);
    if (e && e.base === base && same(e.def, def)) def = e.def;     // nothing changed for this move: keep the object (a live group keeps running)
    s.cache.set(id, { n: s.n, base, def });
    return def;
  }

  // ---- parts C and D: the team cards' readers (Jess 2026-10-31; plan: Slice 5b - Parts C to G Plan.txt) ----
  const STEP = id => BY_ID[id].step;
  /** COMBAT-RULES:SS10. The caster team's Gate multiplier: a rate card, 1 / (1 + stacks x step). 1 with no store (enemies, fixtures). */
  function gateMul(o) { return 1 / (1 + stacks(o && o.teamCards, 'gate') * STEP('gate')); }
  /** COMBAT-RULES:SS10. The caster team's stat stage Duration in seconds: the base x (1 + stacks x step). */
  function durOf(o) { return G.Stages.DURATION * (1 + stacks(o && o.teamCards, 'duration') * STEP('duration')); }
  /** HP Regen: the fraction of max HP a BENCHED member regains per second. */
  const regen = s => stacks(s, 'regen') * STEP('regen');
  /** Vitamins: the team's bonus fraction on stat `k` (hp, atk, def, spa, spd, spe), stored as 'vitamins:<k>' stacks (the fold skips them). */
  const vit = (s, k) => stacks(s, 'vitamins:' + k) * STEP('vitamins');

  // ---- part E: what the offer needs to know about a move ----
  /** Visits the move and every emitted child, inline or named, once each; true as soon as `fn` is true for one. */
  function walk(d, fn, seen = new Set()) {
    if (!d || typeof d !== 'object' || seen.has(d)) return false;
    seen.add(d);
    if (fn(d)) return true;
    for (const fx of d.payload || []) if (fx.t === 'emit' && fx.move && walk(typeof fx.move === 'string' ? G.MoveDefs[fx.move] : fx.move, fn, seen)) return true;
    return false;
  }
  /** A stat change anywhere in the move: Gate Reduction and Duration Increase have a taker. */
  const hasStat = d => walk(d, n => (n.payload || []).some(fx => fx.t === 'stat'));
  /** The 2-buff learn limit (Jess, 2026-10-31, self-only): a new-path move is a buff when EVERY effect in it, emitted children included,
   *  lands on the caster's own side: a self or team stat change, a self heal, a shield, a recoil cost. One foe-side effect (damage, an
   *  ailment, a foe stat drop, a flinch, a knockback, a weather) and it is not a buff; a move with no effect is not one either. */
  const SELF_T = new Set(['heal', 'shield', 'recoil']);
  function selfOnly(d) {
    let n = 0;
    const foe = walk(d, x => (x.payload || []).some(fx => {
      if (fx.t === 'emit') return false;
      n++;
      return !(fx.t === 'stat' ? fx.side !== 'foe' : SELF_T.has(fx.t));
    }));
    return !foe && n > 0;
  }

  // ---- parts E and F: card text and the run summary ----
  const r1 = v => String(Math.round(v * 10) / 10);
  /** The step as card text: '+15%', '-15%', '+1', '+10 pts', '+0.5%/s'. */
  function stepText(c) {
    if (c.id === 'regen') return '+' + r1(c.step * 100) + '%/s';
    if (c.id === 'ailment') return '+' + c.step + ' pts';
    if (c.mode === 'add' && c.step >= 1) return '+' + c.step;
    return (c.mode === 'rate' ? '-' : '+') + Math.round(c.step * 100) + '%';
  }
  const FAM = ['General', 'Space', 'Delivery', 'Payload'];
  const STAT_NAME = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
  /** The total of `n` stacks: a rate card shows its real cut (1 - 1 / (1 + total)), a capped card counts to its cap. */
  function totalText(c, n) {
    const k = c.cap ? Math.min(n, c.cap) : n, v = k * c.step, capped = c.cap && n >= c.cap ? ' (max)' : '';
    if (c.id === 'regen') return '+' + r1(v * 100) + '% max HP/s, benched only';
    if (c.id === 'ailment') return '+' + v + ' pts';
    if (c.mode === 'add' && c.step >= 1) return '+' + v + capped;
    if (c.mode === 'rate') return '-' + Math.round((1 - 1 / (1 + v)) * 100) + '%';
    return '+' + Math.round(v * 100) + '%';
  }
  /** The team sheet's "Run Cards" rows, General first, then Space, Delivery, Payload; by label inside a family. */
  function summary(s) {
    const out = [];
    for (const id of Object.keys((s && s.stacks) || {})) {
      const n = s.stacks[id];
      if (!(n > 0)) continue;
      if (id.startsWith('vitamins:')) {
        const k = id.slice(9);
        out.push({ id, label: 'Vitamins: ' + (STAT_NAME[k] || k), family: 'General', stacks: n, total: '+' + Math.round(n * STEP('vitamins') * 100) + '%' });
        continue;
      }
      const c = BY_ID[id]; if (!c) continue;
      out.push({ id, label: c.label, family: c.family, stacks: n, total: totalText(c, n) });
    }
    return out.sort((a, b) => FAM.indexOf(a.family) - FAM.indexOf(b.family) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  }

  return { CARDS, BY_ID, TYPES, cardOf, targets, usable, fold, store, add, stacks, defOf, same,
    gateMul, durOf, regen, vit, hasStat, selfOnly, stepText, summary, STAT_NAME };
})();
