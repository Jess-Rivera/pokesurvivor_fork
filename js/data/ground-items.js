/* ============ ground-items.js, ground items (tier 3 of the item rework, DECISIONS 2026-10-20) ============
 * Ground items activate the moment you touch them (kind 'ground', value = id). Nothing is stored. Every timed effect is TEAM-WIDE and
 * lives in the shared stage store (pl.stgTeam, see systems/stages.js), so it keeps ticking while a Pokemon is benched and a second
 * pickup of the SAME item renews the timer instead of stacking (different items do stack). New store keys used here:
 *   guard_<type>  1     super-effective hits of <type> deal half damage (Player.hurt; Chilan halves every Normal hit)
 *   pct_def / pct_spd   +fraction on Def / Sp. Def, added to the stat-card pool (Player.incOf)
 *   crit          +fraction of critical hit chance (combat.js isCrit)
 *   drop          +fraction on the ground drop chance of wild kills (G.Grounds.dropRate)
 * Item families (Jess, 2026-10-20): X items, Oran and Sitrus, the type-guard berries, the pinch berries, Kee / Maranga, the Pinaps.
 * Status berries (Cheri, Chesto, Pecha, Rawst, Aspear, Persim, Lum, F3a-2) are the one exception: touching one STORES it in the team's berry bag
 * (pl.berries, ONE array shared by the roster, G.Grounds.berrySlots(save) slots, default 1). G.Status calls berryGuard(h, kind) the moment a status
 * would land on a Pokemon: a matching berry is consumed and the status never applies. A full bag, or a berry you already hold, leaves the pickup on the ground.
 * Names and text are English; icons come from the Pokesprite sheet ('ps:<category>.<name>', data/pokesprite-index.js).
 */
G.Grounds = (() => {
  const BASE_RATE = 0.01;                 // extra ground roll per wild kill (Jess: 1%)
  const X_DUR = 30, BERRY_DUR = 10, PINAP_DUR = 60;
  const HEAL_ORAN = 0.30, HEAL_SITRUS = 0.50;
  const LANSAT_CRIT = 0.20;
  const STATS = ['atk', 'def', 'spa', 'spd', 'spe'];
  const STAT_LABEL = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
  const STAT_COL = { atk: '#ff6b4d', def: '#b0b8c8', spa: '#b99dff', spd: '#6ea4ff', spe: '#7fe0ff' };

  /** One live application per (key, src): picking the same item again refreshes its timer (and value) instead of stacking. */
  function renew(store, key, n, dur, src) {
    const L = store[key] || (store[key] = []);
    const a = L.find(x => x.src === src);
    if (a) { a.n = n; a.t = dur; a.dur = dur; } else L.push({ n, t: dur, dur, src });
  }
  function say(pl, msg, color) { if (G.FX && G.FX.dmgText) G.FX.dmgText(pl.x, pl.y - (pl.bodyH || 30) - 8, msg, color); }
  function ring(pl, color) { if (G.FX && G.FX.ring) G.FX.ring(pl.x, pl.y, 6, 60, color, 0.4, 3); }

  /** +n stages on `stat` for the whole team. */
  function stage(stat, n, dur, src) {
    return pl => { renew(pl.stgTeam, stat, n, dur, src); say(pl, STAT_LABEL[stat] + ' +' + n, STAT_COL[stat]); ring(pl, STAT_COL[stat]); };
  }
  function heal(frac) { return pl => { pl.heal(pl.maxHp * frac); ring(pl, '#5fe08a'); }; }
  function team(key, n, dur, src, msg, color) {
    return pl => { renew(pl.stgTeam, key, n, dur, src); say(pl, msg, color); ring(pl, color); };
  }

  const LIST = [];
  const add = (id, name, icon, w, apply, desc) => LIST.push({ id, name, icon, w, apply, desc });
  const addBag = (id, name, icon, w, desc) => LIST.push({ id, name, icon, w, desc, bag: true, apply: pl => store(pl, id) });

  // ---- X items: +1 stage for 30 s, whole team ----
  add('x-attack',  'X Attack',  'battle-item.x-attack',  6, stage('atk', 1, X_DUR, 'x:atk'), 'Team Attack +1 for 30 s');
  add('x-defense', 'X Defense', 'battle-item.x-defense', 6, stage('def', 1, X_DUR, 'x:def'), 'Team Defense +1 for 30 s');
  add('x-sp-atk',  'X Sp. Atk', 'battle-item.x-sp-atk',  6, stage('spa', 1, X_DUR, 'x:spa'), 'Team Sp. Atk +1 for 30 s');
  add('x-sp-def',  'X Sp. Def', 'battle-item.x-sp-def',  6, stage('spd', 1, X_DUR, 'x:spd'), 'Team Sp. Def +1 for 30 s');
  add('x-speed',   'X Speed',   'battle-item.x-speed',   6, stage('spe', 1, X_DUR, 'x:spe'), 'Team Speed +1 for 30 s');

  // ---- immediate berries ----
  add('oran',   'Oran Berry',   'berry.oran',   9,   heal(HEAL_ORAN),   'Heals 30% of max HP');
  add('sitrus', 'Sitrus Berry', 'berry.sitrus', 6.5, heal(HEAL_SITRUS), 'Heals 50% of max HP');

  // ---- type-guard berries: 10 s, super-effective hits of that type deal half damage ----
  const GUARD = { occa: 'fire', passho: 'water', wacan: 'electric', rindo: 'grass', yache: 'ice', chople: 'fighting', kebia: 'poison',
                  shuca: 'ground', coba: 'flying', payapa: 'psychic', tanga: 'bug', charti: 'rock', kasib: 'ghost', haban: 'dragon',
                  colbur: 'dark', babiri: 'steel', roseli: 'fairy', chilan: 'normal' };
  const cap = s => s[0].toUpperCase() + s.slice(1);
  for (const b in GUARD) {
    const t = GUARD[b];
    add(b, cap(b) + ' Berry', 'berry.' + b, 20 / 18, pl => {
      renew(pl.stgTeam, 'guard_' + t, 1, BERRY_DUR, 'guard:' + t);
      const col = (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[t]) || '#ffd23f';
      say(pl, cap(t) + ' guard', col); ring(pl, col);
    }, t === 'normal' ? 'Halves Normal-type hits for 10 s' : 'Halves super-effective ' + cap(t) + ' hits for 10 s');
  }

  // ---- pinch berries: 10 s ----
  const PINCH = { liechi: 'atk', ganlon: 'def', salac: 'spe', petaya: 'spa', apicot: 'spd' };
  for (const b in PINCH) {
    const s = PINCH[b];
    add(b, cap(b) + ' Berry', 'berry.' + b, 2.5, stage(s, 1, BERRY_DUR, 'pinch:' + b), 'Team ' + STAT_LABEL[s] + ' +1 for 10 s');
  }
  add('starf', 'Starf Berry', 'berry.starf', 1.5, pl => {
    const s = STATS[Math.floor(Math.random() * STATS.length)];
    renew(pl.stgTeam, s, 2, BERRY_DUR, 'pinch:starf'); say(pl, STAT_LABEL[s] + ' +2', STAT_COL[s]); ring(pl, STAT_COL[s]);
  }, 'A random team stat +2 for 10 s');
  add('lansat', 'Lansat Berry', 'berry.lansat', 1, team('crit', LANSAT_CRIT, BERRY_DUR, 'lansat', 'Crit +20%', '#ffb347'), '+20% critical hit chance for 10 s');

  // ---- Kee / Maranga: +10% Def / Sp. Def for 10 s (stat-card pool) ----
  add('kee',     'Kee Berry',     'berry.kee',     3, team('pct_def', 0.10, BERRY_DUR, 'kee', 'Defense +10%', STAT_COL.def), '+10% Defense for 10 s');
  add('maranga', 'Maranga Berry', 'berry.maranga', 3, team('pct_spd', 0.10, BERRY_DUR, 'maranga', 'Sp. Def +10%', STAT_COL.spd), '+10% Sp. Def for 10 s');

  // ---- Pinaps: +1 / +5 / +10 points on the ground drop chance for 60 s ----
  add('pinap',        'Pinap Berry',        'berry.pinap',        2.5, team('drop', 0.01, PINAP_DUR, 'pinap',  'Drops +1%',  '#ffd23f'), 'Ground drop chance +1 point for 60 s');
  add('silver-pinap', 'Silver Pinap Berry', 'berry.silver-pinap', 1,   team('drop', 0.05, PINAP_DUR, 'silver-pinap', 'Drops +5%',  '#dfe6f2'), 'Ground drop chance +5 points for 60 s');
  add('golden-pinap', 'Golden Pinap Berry', 'berry.golden-pinap', 0.5, team('drop', 0.10, PINAP_DUR, 'golden-pinap', 'Drops +10%', '#ffc21a'), 'Ground drop chance +10 points for 60 s');

  // ---- status berries: stored in the team berry bag, consumed automatically when the status would land ----
  const BERRY_CURES = { cheri: ['paralysis'], chesto: ['sleep'], pecha: ['poison'], rawst: ['burn'], aspear: ['freeze'], persim: ['confusion'] };
  const LUM_COVERS = ['paralysis', 'sleep', 'poison', 'burn', 'freeze', 'confusion'];       // the six main statuses (Jess), not Trap, Daze or Drowsy
  const STATUS_LABEL = { paralysis: 'Paralysis', sleep: 'Sleep', poison: 'Poison', burn: 'Burn', freeze: 'Freeze', confusion: 'Confusion' };
  const BERRY_SLOTS_DEFAULT = 1, BERRY_SLOTS_MAX = 4;
  /** Berry slots a save owns. Absent in old saves, so it defaults to 1 (meta progression can raise it later). */
  function berrySlots(save) { const n = (save && save.berrySlots) | 0; return Math.max(BERRY_SLOTS_DEFAULT, Math.min(BERRY_SLOTS_MAX, n || BERRY_SLOTS_DEFAULT)); }
  function store(pl, id) { pl.berries.push(id); say(pl, BY[id].name + ' stored', '#9fe8ff'); ring(pl, '#9fe8ff'); }
  addBag('cheri',  'Cheri Berry',  'berry.cheri',  1.5, 'Stored in the berry bag: blocks the next Paralysis');
  addBag('chesto', 'Chesto Berry', 'berry.chesto', 1.5, 'Stored in the berry bag: blocks the next Sleep');
  addBag('pecha',  'Pecha Berry',  'berry.pecha',  1.5, 'Stored in the berry bag: blocks the next Poison');
  addBag('rawst',  'Rawst Berry',  'berry.rawst',  1.5, 'Stored in the berry bag: blocks the next Burn');
  addBag('aspear', 'Aspear Berry', 'berry.aspear', 1.5, 'Stored in the berry bag: blocks the next Freeze');
  addBag('persim', 'Persim Berry', 'berry.persim', 1.5, 'Stored in the berry bag: blocks the next Confusion');
  addBag('lum',    'Lum Berry',    'berry.lum',    0.5, 'Stored in the berry bag: blocks the next of any of those six statuses');

  const BY = {};
  for (const it of LIST) BY[it.id] = it;
  const TOTAL_W = LIST.reduce((s, i) => s + i.w, 0);

  /** A random ground item id, by weight (the weights read as percentages: they add up to 100). */
  function roll(rnd = Math.random) {
    let r = rnd() * TOTAL_W;
    for (const it of LIST) { if ((r -= it.w) < 0) return it.id; }
    return LIST[LIST.length - 1].id;
  }

  /** Chance that a wild kill also drops a ground item: 1% plus the live Pinap bonus. `pl` is any roster member (the store is shared). */
  function dropRate(pl) {
    const bonus = pl && pl.stgTeam ? G.Stages.teamSum(pl.stgTeam, 'drop') : 0;
    return BASE_RATE + bonus;
  }

  /** Can the pickup be taken right now? Berry-bag items need a free slot and no copy already in the bag; everything else always can. */
  function canTake(id, pl) {
    const it = BY[id];
    if (!it || !it.bag) return true;
    return !!pl && !!pl.berries && pl.berries.length < berrySlots(G.DB && G.DB.save) && !pl.berries.includes(id);
  }

  /**
   * Called by G.Status just before a status of `kind` lands on player Pokemon `h`: a matching berry from the shared bag is consumed and the status is blocked
   * (returns true). A berry that matches exactly goes first, Lum last. Nothing is consumed when the status would not have landed anyway.
   */
  function berryGuard(h, kind) {
    const bag = h && h.berries;
    if (!bag || !bag.length) return false;
    const k = kind === 'toxic' ? 'poison' : kind;
    let i = bag.findIndex(id => BERRY_CURES[id] && BERRY_CURES[id].includes(k));
    if (i < 0) i = bag.findIndex(id => id === 'lum' && LUM_COVERS.includes(k));
    if (i < 0) return false;
    const id = bag.splice(i, 1)[0], name = BY[id].name, what = STATUS_LABEL[k] || k;
    if (h.benched && G.UI && G.UI.toast) G.UI.toast(name + ' protected ' + h.mon.name + ' from ' + what, 2400);
    else { say(h, name + ' blocked ' + what + '!', '#9fe8ff'); ring(h, '#9fe8ff'); }
    return true;
  }

  /** Apply ground item `id` to the team (called when the active Pokemon touches the pickup). */
  function apply(pl, id) {
    const it = BY[id];
    if (!it || !pl) return false;
    it.apply(pl);
    return true;
  }

  /** HUD chip for a non-stat store key: { label, color } or null. */
  function chip(key, sum) {
    const pct = Math.round(sum * 100);
    if (key.startsWith('guard_')) {
      const t = key.slice(6);
      return { label: t.toUpperCase() + ' GUARD', color: (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[t]) || '#ffd23f' };
    }
    if (key === 'pct_def') return { label: 'DEF +' + pct + '%', color: STAT_COL.def };
    if (key === 'pct_spd') return { label: 'SP.DEF +' + pct + '%', color: STAT_COL.spd };
    if (key === 'crit') return { label: 'CRIT +' + pct + '%', color: '#ffb347' };
    if (key === 'drop') return { label: 'DROPS +' + pct + '%', color: '#ffd23f' };
    return null;
  }

  return { LIST, BY, GUARD, TOTAL_W, BASE_RATE, BERRY_CURES, LUM_COVERS, roll, dropRate, apply, canTake, berryGuard, berrySlots, chip };
})();
