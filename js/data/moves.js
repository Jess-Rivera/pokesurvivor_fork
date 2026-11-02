/* ============ moves.js: which moves a Pokemon can learn, and its starting move ============
 * Slice 7b-2a (Jess 2026-11-01): every move runs in G.MoveSim from its resolved def (G.MoveDefs), so the legacy move
 * table, its per-move upgrade cards (mechanics.js) and its `kind` families (kinds.js) are gone. A frozen copy of the
 * old table lives in docs/move_rework_holding/legacy-moves.js for the parity and report tools.
 *
 *   G.Moves.ALL           every resolved def (built on first use: moves.js loads before the resolver)
 *   G.Moves.RETIRED       retired id -> replacement id (D-BUBBLE, D-HAIL): out of every pool; a save naming one loads the replacement
 *   G.Moves.HELD          ids in the catalog but out of every player pool (Kanto batch 1, until learnset pools)
 *   G.Moves.poolFor(mon)  the move ids it can learn: its types' pools plus the shared Normal pool
 *   G.Moves.instance(id)  a move in a slot: id, name, type and cd from the def, and its timer t
 *   G.Moves.startFor(mon) its starting move by main type (when the Pokemon does not bring one)
 *
 * The icon is not stored here: G.Icons composes it (type emblem + family badge), see ui/icons.js.
 */
(() => {
  // Retired moves (slice 7b, D-BUBBLE and D-HAIL, Jess 2026-11-01): out of every pool; a save that names one loads its replacement.
  const RETIRED = { bubble: 'water-gun', hail: 'water-gun' };
  // Kanto import batch 1 (Jess 2026-11-01): in the catalog (gym leaders, debug) but out of every player pool until pools follow
  // mainline learnsets; the type pools would otherwise triple and the shared Normal pool go from 7 to 31. Defense Curl joined
  // 2026-11-02 for Brock's loop-1 Geodude.
  const HELD = new Set(
    (
      'slash screech lovely-kiss recover supersonic glare swift double-slap mega-kick spike-cannon take-down growl ' +
      'leer mega-punch wrap bind double-edge fury-attack mean-look scary-face sing stomp strength tail-whip ' +
      'superpower brick-break cross-chop focus-blast close-combat submission double-kick bulk-up drain-punch ' +
      'dynamic-punch sky-uppercut hypnosis calm-mind barrier amnesia meditate thunder-punch thunder thunder-wave ' +
      'wild-charge charge-beam shock-wave thunder-fang volt-tackle zap-cannon mega-drain sleep-powder stun-spore ' +
      'power-whip energy-ball spore leaf-blade synthesis earthquake earth-power bone-club drill-run sand-tomb ' +
      'sludge-bomb poison-jab acid poison-fang sludge-wave acid-armor cross-poison gunk-shot poison-powder surf ' +
      'waterfall water-pulse scald aqua-tail clamp fire-blast flare-blitz fire-punch overheat blaze-kick fire-fang ' +
      'crunch nasty-plot dragon-pulse draco-meteor dragon-breath dragon-claw twister blizzard ice-punch aurora-beam ' +
      'frost-breath ice-fang stone-edge ancient-power rock-tomb leech-life megahorn signal-beam air-slash air-cutter ' +
      'confuse-ray shadow-punch shadow-claw moonblast play-rough moonlight iron-tail fly defense-curl'
    ).split(' ')
  );

  let all = null,
    pool = null;
  function build() {
    all = Object.values(G.MoveDefs);
    pool = {};
    for (const d of all) if (!RETIRED[d.id] && !HELD.has(d.id)) (pool[d.type] = pool[d.type] || []).push(d.id);
  }

  /** Moves this Pokemon can learn (its types + normal). */
  function poolFor(mon) {
    if (!pool) build();
    const ids = new Set(pool.normal);
    for (const t of mon.types) for (const id of pool[t] || []) ids.add(id);
    return [...ids];
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
    HELD,
    poolFor,
    instance,
    startFor,
  };
})();
