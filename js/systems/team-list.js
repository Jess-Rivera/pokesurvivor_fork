/* ============ team-list.js, the Team menu's filters and sorts (G.TeamList; #167) ============
 * What the portrait grid shows and in which order. An entry is { copy, species } on a box tab, or { copy: null, species }
 * on the Pokedex tab. The Pokedex screen (js/ui/menu-dex-grid.js) uses the same species filter and move search.
 * No page and no drawing: docs/proposals/team-menu-harness.js tests it.
 */
G.TeamList = (() => {
  const MOVE_QUERY_MIN = 3; // letters typed before the search also reads move names
  const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']; // the game's stat order
  const sum = (six) => six.reduce((total, value) => total + value, 0);
  const dexNumber = (species) => String(species.dex).padStart(3, '0');

  // ---------- the search ----------
  /** The moves a typed text matches: strong when the move's name starts with it, weak when a later word does. Null when
   *  the text is too short or matches none. */
  function moveQuery(query) {
    if (!query || query.length < MOVE_QUERY_MIN) return null;
    const strong = new Set(),
      weak = new Set();
    for (const move of G.Moves.ALL) {
      if (G.Moves.RETIRED[move.id]) continue;
      const name = move.name.toLowerCase();
      if (name.startsWith(query)) strong.add(move.id);
      else if (name.split(/[\s-]+/).some((word) => word.startsWith(query))) weak.add(move.id);
    }
    return strong.size || weak.size ? { strong, weak } : null;
  }
  const learnsAny = (species, moveIds) => G.Moves.poolFor(species).some((id) => moveIds.has(id));
  /** Whether a species answers the search by name (only one you own) or number. */
  const namedBy = (species, query, owned) =>
    (owned && species.name.toLowerCase().includes(query)) ||
    dexNumber(species).includes(query) ||
    String(species.dex) === query;

  // ---------- the filter ----------
  const newFilter = () => ({
    query: '',
    own: 'all', // 'all', 'own' or 'miss'; the Pokedex tab only
    regions: [],
    types: [],
    rarity: [],
    bst: [],
    favorite: false,
    locked: false,
  });

  /** Whether a species passes everything but the search. Within a group any choice matches; each group must. */
  function speciesMatches(species, filter, owned) {
    if (filter.own === 'own' && !owned) return false;
    if (filter.own === 'miss' && owned) return false;
    if (filter.regions.length && !filter.regions.includes(species.gen)) return false;
    if (filter.types.length && !filter.types.some((type) => species.types.includes(type))) return false;
    if (filter.rarity.length && !filter.rarity.includes(species.rarity)) return false;
    if (!filter.bst.length) return true;
    return G.Copies.BST_BANDS.some(
      (band) => filter.bst.includes(band.k) && species.bst >= band.lo && species.bst <= band.hi
    );
  }
  /** Whether a species answers the search; moves is moveQuery's answer for the same text. */
  const speciesFound = (species, query, moves, owned) =>
    !query ||
    namedBy(species, query, owned) ||
    (!!moves && (learnsAny(species, moves.strong) || learnsAny(species, moves.weak)));

  const boxEntries = (save, box) =>
    G.Copies.all(save)
      .filter((copy) => copy.box === box && G.DEX_BY[copy.speciesID])
      .map((copy) => ({ copy, species: G.DEX_BY[copy.speciesID] }));
  const speciesEntries = () => G.DEX.map((species) => ({ copy: null, species }));

  /** The entries the filter shows. Favorite and Locked together show a copy with either mark. */
  function filtered(entries, filter, save) {
    const query = filter.query.trim().toLowerCase(),
      moves = moveQuery(query),
      found = new Map(); // by species: many copies share one, and the move search is slow
    const speciesShown = (species, owned) => {
      if (!found.has(species.dex))
        found.set(species.dex, {
          matches: speciesMatches(species, filter, owned),
          found: speciesFound(species, query, moves, owned),
        });
      return found.get(species.dex);
    };
    return entries.filter(({ copy, species }) => {
      const shown = speciesShown(species, !!copy || !!save.owned[species.dex]);
      if (!shown.matches) return false;
      if (copy && (filter.favorite || filter.locked)) {
        const marked = (filter.favorite && copy.isFavorite) || (filter.locked && copy.isLocked);
        if (!marked) return false;
      }
      return shown.found || (!!copy && copy.nickname.toLowerCase().includes(query));
    });
  }

  // ---------- the sorts ----------
  const typeOrder = (type) => Object.keys(G.U.TYPE_COLOR).indexOf(type);
  const typeRank = ({ types }) => {
    const second = types[1] ? 1 + typeOrder(types[1]) : 0;
    return typeOrder(types[0]) * (1 + Object.keys(G.U.TYPE_COLOR).length) + second;
  };
  const statSorts = (group, prefix, read, copyOnly) =>
    STATS.map((label, stat) => ({
      key: prefix + stat,
      label,
      group,
      copyOnly,
      value: (entry) => read(entry)[stat],
    }));
  /** key, label, group (its accordion, or null), copyOnly, value(entry). Ascending puts marked copies first. */
  const SORTS = [
    { key: 'dex', label: 'Dex Number', value: ({ species }) => species.dex },
    {
      key: 'level',
      label: 'Level',
      copyOnly: true,
      value: ({ copy }) => G.Candy.levelFor(copy.speciesID, copy.candyXp),
    },
    { key: 'type', label: 'Type', value: ({ species }) => typeRank(species) },
    { key: 'favorite', label: 'Favorited', copyOnly: true, value: ({ copy }) => (copy.isFavorite ? 0 : 1) },
    { key: 'locked', label: 'Locked', copyOnly: true, value: ({ copy }) => (copy.isLocked ? 0 : 1) },
    {
      key: 'name',
      label: 'Name',
      value: ({ copy, species }) => ((copy && copy.nickname) || species.name).toLowerCase(),
    },
    { key: 'bst', label: 'BST', value: ({ species }) => species.bst },
    { key: 'rarity', label: 'Rarity', value: ({ species }) => species.rarity },
    { key: 'date', label: 'Date Caught', copyOnly: true, value: ({ copy }) => copy.dateObtained },
    {
      key: 'price',
      label: 'Sell Price',
      copyOnly: true,
      value: ({ copy }) => G.Copies.priceFor(copy.speciesID, copy.isShiny),
    },
    ...statSorts('Base Stats', 'base', ({ species }) => species.stats, false),
    { key: 'ivTotal', label: 'Total', group: 'IVs', copyOnly: true, value: ({ copy }) => sum(copy.iv) },
    ...statSorts('IVs', 'iv', ({ copy }) => copy.iv, true),
    { key: 'evTotal', label: 'Total', group: 'EVs', copyOnly: true, value: ({ copy }) => copy.evTotal },
    ...statSorts('EVs', 'ev', ({ copy }) => copy.ev, true),
  ];
  const SORT_BY = new Map(SORTS.map((sort) => [sort.key, sort]));
  const compare = (first, second) => (first < second ? -1 : first > second ? 1 : 0);

  /** The sorts a tab offers: the Pokedex tab has no copies, so none of theirs. */
  const sortsFor = (pokedexTab) => SORTS.filter((sort) => !pokedexTab || !sort.copyOnly);
  /** The sort in use: a copy's sort has no meaning on the Pokedex tab, which then goes by Dex number, ascending. */
  function sortInUse(key, direction, pokedexTab) {
    const sort = SORT_BY.get(key);
    return pokedexTab && sort.copyOnly ? { sort: SORT_BY.get('dex'), direction: 1 } : { sort, direction };
  }

  /** The entries in order: by the sort, direction 1 up or -1 down; ties by Dex number, then oldest first. */
  function sorted(entries, key, direction) {
    if (!entries.length) return [];
    const used = sortInUse(key, direction, !entries[0].copy);
    return entries
      .map((entry) => ({ entry, value: used.sort.value(entry) }))
      .sort(
        (a, b) =>
          used.direction * compare(a.value, b.value) ||
          a.entry.species.dex - b.entry.species.dex ||
          (a.entry.copy ? a.entry.copy.dateObtained - b.entry.copy.dateObtained : 0)
      )
      .map(({ entry }) => entry);
  }

  return {
    STATS,
    SORTS,
    newFilter,
    moveQuery,
    learnsAny,
    namedBy,
    speciesMatches,
    speciesFound,
    boxEntries,
    speciesEntries,
    filtered,
    sortsFor,
    sortInUse,
    sorted,
  };
})();
