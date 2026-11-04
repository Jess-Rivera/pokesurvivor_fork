/* ============ copies.js, unique copies of a Pokemon (G.Copies) ============
 * Every Pokemon a player owns is one copy with its own UUID, rolled once when it is created (docs/proposals/pokebox-plan.md).
 * save.box holds them in a compact form and this module is the only code that reads that form; the rest of the game
 * gets the full field names from read(). Values with no effect yet (IVs, nature, ability) are debug-only (G.Debug.copy).
 *
 * Compact keys; a value at its default is left out:
 *   u UUID in 22 characters   d dex   t obtained, seconds   m method letter   n nature, pokeapi id   i IVs, one character each
 *   g 0 male 1 female 2 none  x y height and weight scale   a ability slot    s shiny   e EVs   k nickname   h friendship
 *   v starting move override  p upgrades (id -> rank)       f favorite   l locked   o original trainer, if not this save   r form
 * Stat order everywhere: HP, Atk, Def, SpA, SpD, Spe (the game's stats array and pokeapi).
 */
G.Copies = (() => {
  const IV_MAX = 31,
    EV_MAX = 252,
    EV_TOTAL = 510,
    SCALE_MAX = 255,
    NICK_MAX = 12,
    FRIEND_MAX = 255,
    RANK_MAX = 5;
  const HIDDEN_CHANCE = 0.05;
  const IV_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // position = the IV, so a saved IV can never pass 31
  const GENDERS = ['male', 'female', 'none'];
  const METHODS = { starter: 's', gacha: 'g', wild: 'w', rescue: 'r', debug: 'd', other: 'o' };
  const METHOD_NAME = {};
  for (const name in METHODS) METHOD_NAME[METHODS[name]] = name;

  const traitsOf = (dex) => G.SpeciesTraits.SPECIES[dex];
  const pick = (n, rnd) => Math.floor(rnd() * n);

  // ---------------- UUID ----------------

  /** UUID v4. crypto.randomUUID only exists on secure pages, so build it from getRandomValues (fine on file://). */
  function uuid() {
    const b = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.random() * 256;
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((v) => v.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  function shortId(id) {
    const bytes = id
      .replace(/-/g, '')
      .match(/../g)
      .map((h) => parseInt(h, 16));
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  function longId(s) {
    const h = [...atob(s.replace(/-/g, '+').replace(/_/g, '/'))]
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  // ---------------- rolls ----------------

  /** Most copies land near the middle and extremes are rare: the sum of two even rolls, 0 to 255. */
  const rollScale = (rnd) => pick(129, rnd) + pick(128, rnd);

  function rollGender(dex, rnd) {
    const rate = traitsOf(dex)[0];
    if (rate < 0) return 2;
    return rnd() * 8 < rate ? 1 : 0;
  }

  /** 5% hidden when the species has one, the rest split evenly between its normal abilities. */
  function rollAbility(dex, rnd) {
    const a = traitsOf(dex)[1];
    if (a[2] && rnd() < HIDDEN_CHANCE) return 3;
    return a[1] && rnd() < 0.5 ? 2 : 1;
  }

  /** A fresh compact copy. @param o { dex, shiny, at (ms), from (method name) } */
  function roll(o, rnd = Math.random) {
    const c = {
      u: shortId(uuid()),
      d: o.dex,
      t: Math.floor((o.at || Date.now()) / 1000),
      m: METHODS[o.from] || METHODS.other,
      n: 1 + pick(25, rnd),
      i: Array.from({ length: 6 }, () => IV_CHARS[pick(IV_MAX + 1, rnd)]).join(''),
      g: rollGender(o.dex, rnd),
      x: rollScale(rnd),
      y: rollScale(rnd),
      a: rollAbility(o.dex, rnd),
    };
    if (o.shiny) c.s = 1;
    return c;
  }

  // ---------------- read ----------------

  const scaled = (value, scale) => value * (0.8 + (0.4 * scale) / SCALE_MAX);

  /** The full copy from a compact record (a new object: writing to it does not change the save). */
  function read(c, save) {
    const t = traitsOf(c.d),
      nature = G.SpeciesTraits.NATURES[c.n - 1];
    return {
      pokemonUUID: longId(c.u),
      speciesID: c.d,
      form: c.r || 'base',
      originalTrainerID: c.o || (save && save.trainerId) || null,
      nickname: c.k || '',
      dateObtained: c.t * 1000,
      obtainedMethod: METHOD_NAME[c.m] || 'other',
      nature: nature[0],
      natureUp: nature[1],
      natureDown: nature[2],
      iv: [...c.i].map((ch) => IV_CHARS.indexOf(ch)),
      gender: GENDERS[c.g],
      heightScale: c.x,
      weightScale: c.y,
      heightM: scaled(t[2], c.x) / 10,
      weightKg: scaled(t[3], c.y) / 10,
      abilitySlot: c.a,
      ability: t[1][c.a - 1],
      isShiny: !!c.s,
      ev: c.e ? c.e.slice() : [0, 0, 0, 0, 0, 0],
      friendship: c.h != null ? c.h : t[4],
      startingMove: c.v || null,
      upgrades: Object.assign({}, c.p),
      isFavorite: !!c.f,
      isLocked: !!c.l,
    };
  }

  const all = (save) => (save.box || []).map((c) => read(c, save));

  function get(save, id) {
    const u = shortId(id),
      c = (save.box || []).find((x) => x.u === u);
    return c ? read(c, save) : null;
  }

  // ---------------- keeping the save right ----------------

  /**
   * Every owned species has a normal copy and every owned shiny a shiny copy. Only adds what is missing, so it is safe to call
   * as often as needed. Until step 3 this is how a new Pokemon becomes a copy: gacha, rescues, wild shinies and starters still
   * only write save.owned and save.shiny. Step 3 creates copies at the source and removes this, or a sold copy would come back.
   */
  function fill(save, rnd = Math.random) {
    if (!Array.isArray(save.box)) save.box = [];
    const have = new Set(save.box.map((c) => c.d + (c.s ? 's' : 'n')));
    const add = (coll, shiny) => {
      for (const k of Object.keys(save[coll] || {})) {
        const dex = +k;
        if (have.has(dex + (shiny ? 's' : 'n')) || !traitsOf(dex)) continue;
        const rec = save[coll][k] || {};
        save.box.push(roll({ dex, shiny, at: rec.at, from: rec.from }, rnd));
      }
    };
    add('owned', false);
    add('shiny', true);
  }

  /** Point each team slot at a copy: it keeps a copy that still matches its species and shiny flag, otherwise it takes the first free match. */
  function linkTeam(save) {
    const byId = new Map((save.box || []).map((c) => [c.u, c]));
    const fits = (c, t) => c.d === t.dex && !!c.s === !!t.shiny;
    const used = new Set();
    for (const t of save.team) {
      if (!t || !t.uid) continue;
      const u = /^[0-9a-f-]{36}$/.test(t.uid) ? shortId(t.uid) : null,
        c = u && byId.get(u);
      if (c && fits(c, t) && !used.has(u)) used.add(u);
      else delete t.uid;
    }
    for (const t of save.team) {
      if (!t || t.uid) continue;
      const c = (save.box || []).find((x) => fits(x, t) && !used.has(x.u));
      if (!c) continue;
      used.add(c.u);
      t.uid = longId(c.u);
    }
  }

  /** Removes the impossible from a hand-edited box (same job as DB sanitize): bad records go, out-of-range values are clamped. */
  function clean(save) {
    if (!Array.isArray(save.box)) {
      save.box = [];
      return;
    }
    const whole = (v, max) => (Number.isFinite(+v) ? Math.max(0, Math.min(max, Math.floor(+v))) : 0);
    const seen = new Set();
    save.box = save.box.filter((c) => {
      if (!c || typeof c.u !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(c.u) || seen.has(c.u)) return false;
      const t = traitsOf(c.d);
      if (!t || (G.DEX_BY && !G.DEX_BY[c.d])) return false;
      seen.add(c.u);
      c.t = whole(c.t, Number.MAX_SAFE_INTEGER);
      if (!METHOD_NAME[c.m]) c.m = METHODS.other;
      c.n = Math.max(1, Math.min(25, whole(c.n, 25)));
      const iv = typeof c.i === 'string' ? [...c.i] : [];
      c.i = [0, 1, 2, 3, 4, 5].map((k) => (IV_CHARS.includes(iv[k]) ? iv[k] : IV_CHARS[0])).join('');
      const sexed = t[0] >= 0;
      if (!sexed) c.g = 2;
      else if (t[0] === 0 || t[0] === 8) c.g = t[0] === 8 ? 1 : 0;
      else if (c.g !== 0 && c.g !== 1) c.g = 0;
      c.x = whole(c.x, SCALE_MAX);
      c.y = whole(c.y, SCALE_MAX);
      if (![1, 2, 3].includes(c.a) || !t[1][c.a - 1]) c.a = 1;
      if (c.s) c.s = 1;
      else delete c.s;
      if (c.e) {
        let left = EV_TOTAL;
        c.e = [0, 1, 2, 3, 4, 5].map((k) => {
          const v = Math.min(left, whole(Array.isArray(c.e) ? c.e[k] : 0, EV_MAX));
          left -= v;
          return v;
        });
        if (!c.e.some((v) => v > 0)) delete c.e;
      }
      if (typeof c.k === 'string' && c.k) c.k = c.k.slice(0, NICK_MAX);
      else delete c.k;
      if (c.h != null) c.h = whole(c.h, FRIEND_MAX);
      if (c.v != null && (typeof c.v !== 'string' || (G.MoveDefs && !G.MoveDefs[c.v]))) delete c.v;
      if (c.p && typeof c.p === 'object') for (const id of Object.keys(c.p)) c.p[id] = whole(c.p[id], RANK_MAX);
      else delete c.p;
      for (const flag of ['f', 'l'])
        if (c[flag]) c[flag] = 1;
        else delete c[flag];
      if (typeof c.o !== 'string' || !c.o) delete c.o;
      if (typeof c.r !== 'string' || !c.r) delete c.r;
      return true;
    });
  }

  return { uuid, shortId, longId, roll, read, all, get, fill, linkTeam, clean, IV_MAX, EV_MAX, EV_TOTAL };
})();
