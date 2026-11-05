/* ============ moves.js: which moves a Pokemon can learn, and its starting move ============
 * Slice 7b-2a (Jess 2026-11-01): every move runs in G.MoveSim from its resolved def (G.MoveDefs), so the legacy move
 * table, its per-move upgrade cards (mechanics.js) and its `kind` families (kinds.js) are gone. A frozen copy of the
 * old table lives in docs/move_rework_holding/legacy-moves.js for the parity and report tools.
 *
 *   G.Moves.ALL           every resolved def (built on first use: moves.js loads before the resolver)
 *   G.Moves.RETIRED       retired id -> replacement id (D-BUBBLE, D-HAIL): out of every pool; a save naming one loads the replacement
 *   G.Moves.poolFor(mon)  the move ids it can learn: its level-up and egg moves from any game (G.Learnsets), topped up to TOP_UP
 *   G.Moves.tmList()      every move on some species' TM list (the TM Mart's stock)
 *   G.Moves.canUseTm(mon, id)  can it learn this TM: the move is on its TM list or in its pool
 *   G.Moves.instance(id)  a move in a slot: id, name, type and cd from the def, and its timer t
 *   G.Moves.startFor(mon) its starting move by main type (when the Pokemon does not bring one)
 *
 * The icon is not stored here: G.Icons composes it (type emblem + family badge), see ui/icons.js.
 */
(() => {
  // Retired moves (slice 7b, D-BUBBLE and D-HAIL, Jess 2026-11-01): out of every pool; a save that names one loads its replacement.
  const RETIRED = { bubble: 'water-gun', hail: 'water-gun' };
  // A species with fewer learnset moves than this (Magikarp 1, Ditto 0) tops up from its types and Normal, attacks first (Jess 2026-11-04).
  const TOP_UP = 4;

  let all = null,
    pool = null,
    tms = null;
  const pools = new Map(), // dex -> its move pool
    tmSets = new Map(); // dex -> the Set of its TMs
  function build() {
    all = Object.values(G.MoveDefs);
    pool = {};
    for (const d of all) if (!RETIRED[d.id]) (pool[d.type] = pool[d.type] || []).push(d.id);
  }

  /** The moves of `mon`'s types plus Normal, attacks first. */
  function typePool(mon) {
    if (!pool) build();
    const ids = new Set();
    for (const t of mon.types) for (const id of pool[t] || []) ids.add(id);
    for (const id of pool.normal) ids.add(id);
    const hits = (id) => (G.MoveDefs[id].power != null ? 0 : 1);
    return [...ids].sort((a, b) => hits(a) - hits(b));
  }

  /** A baked learnset list (G.Learnsets: k 0 = level-up and egg, 1 = machine), live moves only; null when the species has no entry. */
  function learnset(dex, k) {
    const L = G.Learnsets,
      row = L && L.by[dex];
    if (!row) return null;
    return row[k]
      ? row[k]
          .split(',')
          .map((i) => L.moves[i])
          .filter((id) => G.MoveDefs[id] && !RETIRED[id])
      : [];
  }

  /** Moves this Pokemon can learn. Ignores learn levels. A caller may filter the result but never changes it. */
  function poolFor(mon) {
    let ids = pools.get(mon.dex);
    if (!ids) {
      ids = learnset(mon.dex, 0);
      if (!ids) return typePool(mon); // no learnset entry: its types and Normal
      for (const id of typePool(mon)) {
        if (ids.length >= TOP_UP) break;
        if (!ids.includes(id)) ids.push(id);
      }
      pools.set(mon.dex, ids);
    }
    return ids;
  }

  /** Every live move that is a TM for some species. */
  function tmList() {
    if (!tms) {
      const seen = new Set();
      for (const dex of Object.keys(G.Learnsets.by)) for (const id of learnset(dex, 1)) seen.add(id);
      tms = [...seen].sort();
    }
    return tms;
  }

  function canUseTm(mon, id) {
    let set = tmSets.get(mon.dex);
    if (!set) tmSets.set(mon.dex, (set = new Set(learnset(mon.dex, 1) || [])));
    return set.has(id) || poolFor(mon).includes(id);
  }

  /** A move in a run's slot. Its numbers come from the team's folded def (G.TeamCards.defOf) when it casts. */
  function instance(id) {
    const d = G.MoveDefs[id];
    return { id, name: d ? d.name : id, type: d ? d.type : 'normal', cd: d ? d.cd : null, t: 0 };
  }

  /** Starting move based on the main type (if the Pokemon does not bring one). */
  const START = {
    fire: 'ember',
    water: 'water-gun',
    grass: 'vine-whip',
    electric: 'thunder-shock',
    psychic: 'confusion',
    poison: 'sludge',
    ground: 'mud-shot',
    flying: 'gust',
    bug: 'bug-bite',
    rock: 'rock-throw',
    ice: 'ice-beam',
    fighting: 'karate-chop',
    ghost: 'shadow-ball',
    dragon: 'dragon-rage',
    fairy: 'fairy-wind',
    steel: 'metal-claw',
    dark: 'bite',
    normal: 'tackle',
  };
  function startFor(mon) {
    if (mon.start && G.MoveDefs[mon.start] && !RETIRED[mon.start]) return mon.start;
    for (const t of mon.types) if (START[t]) return START[t];
    return 'tackle';
  }

  G.Moves = {
    get ALL() {
      if (!all) build();
      return all;
    },
    RETIRED,
    poolFor,
    tmList,
    canUseTm,
    instance,
    startFor,
  };
})();
