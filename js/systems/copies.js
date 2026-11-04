/* ============ copies.js, unique copies of a Pokemon (G.Copies) ============
 * Every Pokemon a player owns is one copy with its own UUID, rolled once when it is created (docs/proposals/pokebox-plan.md).
 * save.box holds them in a compact form and this module is the only code that reads that form; the rest of the game
 * gets the full field names from read(). A copy's IVs and nature set its stats in a run (profileOf, G.Stats.profile; pokebox step 4).
 *
 * Compact keys; a value at its default is left out:
 *   u UUID in 22 characters   d dex   t obtained, seconds   m method letter   n nature, pokeapi id   i IVs, one character each
 *   g 0 male 1 female 2 none  x y height and weight scale   a ability slot    s shiny   e EVs   k nickname   h friendship
 *   v starting move override  p upgrades (id -> rank)       f favorite   l locked   o original trainer, if not this save   r form
 *   b box, counted from 0, left out for the first box
 * Stat order everywhere: HP, Atk, Def, SpA, SpD, Spe (the game's stats array and pokeapi).
 */
G.Copies = (() => {
  const IV_MAX = 31,
    EV_MAX = 252,
    EV_TOTAL = 510,
    SCALE_MAX = 255,
    NICK_MAX = 16, // pokebox 3b-2 E1 (was 12)
    FRIEND_MAX = 255,
    RANK_MAX = 5,
    BOX_SIZE = 500,
    BOX_START = 2,
    BOX_MAX = 5;
  const BOX_PRICES = { 3: 10000, 4: 25000, 5: 60000 }; // pokebox-plan "Rulings for step 3", bought in order
  const SELL_PRICE = { 1: 15, 2: 30, 3: 60, 4: 120, 5: 300 }; // by the species' rarity, pokebox-plan "Rulings for step 3"
  const SHINY_SELL = 3; // a shiny sells for 3 times its rarity's price
  const HIDDEN_CHANCE = 0.05;
  const IV_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // position = the IV, so a saved IV can never pass 31
  const GENDERS = ['male', 'female', 'none'];
  const titled = (s) => s.charAt(0).toUpperCase() + s.slice(1);
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
      natureName: titled(nature[0]),
      box: c.b || 0,
      iv: [...c.i].map((ch) => IV_CHARS.indexOf(ch)),
      gender: GENDERS[c.g],
      heightScale: c.x,
      weightScale: c.y,
      heightM: scaled(t[2], c.x) / 10,
      weightKg: scaled(t[3], c.y) / 10,
      abilitySlot: c.a,
      ability: t[1][c.a - 1],
      abilityName: G.SpeciesTraits.ABILITY_NAMES[t[1][c.a - 1]],
      abilityHidden: c.a === 3,
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

  /** The stat profile (G.Stats.profile: IVs and nature) of a team slot's copy. A missing copy, a malformed id, or a copy of
   *  another species plays neutral (pokebox step 4 D4). */
  function profileOf(save, id, dex) {
    let c = null;
    try {
      c = typeof id === 'string' && save ? get(save, id) : null;
    } catch (e) {
      c = null; // a malformed id plays neutral too
    }
    return G.Stats.profile(c && (dex == null || c.speciesID === dex) ? c : null);
  }

  /** Debug only (G.Debug.ivs): set a copy's six IVs to `iv` (0 to 31) and, when given, its nature by name. The caller saves.
   *  Returns the read copy, { error: 'nature' } for an unknown nature name (nothing changes), or null when the copy is gone. */
  function setIvNature(save, id, iv, natureName) {
    const u = shortId(id),
      c = (save.box || []).find((x) => x.u === u);
    if (!c) return null;
    let n = 0;
    if (natureName != null) {
      n = G.SpeciesTraits.NATURES.findIndex((x) => x[0] === String(natureName).toLowerCase()) + 1;
      if (!n) return { error: 'nature' };
    }
    if (iv != null) c.i = IV_CHARS[Math.min(IV_MAX, Math.max(0, Math.floor(+iv) || 0))].repeat(6);
    if (n) c.n = n;
    return read(c, save);
  }

  /** What every copy of a species shares: its possible abilities and its real size (the Pokedex tab). */
  function species(dex) {
    const t = traitsOf(dex);
    return {
      abilities: t[1]
        .map((id, i) => (id ? { name: G.SpeciesTraits.ABILITY_NAMES[id], hidden: i === 2 } : null))
        .filter(Boolean),
      heightM: t[2] / 10,
      weightKg: t[3] / 10,
    };
  }

  // ---------------- boxes ----------------

  const boxCount = (save) => Math.max(BOX_START, Math.min(BOX_MAX, Math.floor(+save.boxCount) || BOX_START));
  const inBox = (save, box) => (save.box || []).filter((c) => (c.b || 0) === box).length;

  /** PokeCoins for box number n (counted from 1), or null for a box that is never sold (1, 2, past the max). */
  const boxPrice = (n) => BOX_PRICES[n] || null;

  /**
   * Buys the next box, in order (3, then 4, then 5).
   * @returns { ok: true, boxes, price } | { ok: false, error: 'max' | 'poor' }
   */
  function buyBox(save) {
    const n = boxCount(save);
    if (n >= BOX_MAX) return { ok: false, error: 'max' };
    const price = boxPrice(n + 1);
    if (!(save.coins >= price)) return { ok: false, error: 'poor' };
    save.coins -= price;
    save.boxCount = n + 1;
    return { ok: true, boxes: n + 1, price };
  }

  /** The first box with room, or -1 when every box is full (pokebox 3a-4: a new Pokemon is then sold on arrival). */
  function freeBox(save) {
    const n = boxCount(save);
    for (let b = 0; b < n; b++) if (inBox(save, b) < BOX_SIZE) return b;
    return -1;
  }

  /** Free places across the boxes you have (500 each, minus what they hold). */
  function freePlaces(save) {
    const n = boxCount(save),
      per = new Array(n).fill(0);
    for (const c of save.box || []) {
      const b = c.b || 0;
      if (b < n) per[b]++;
    }
    return per.reduce((a, k) => a + Math.max(0, BOX_SIZE - k), 0);
  }

  /** A new copy in the first box with room. Returns the compact record, or null when every box is full (nothing is saved). */
  function add(save, o, rnd = Math.random) {
    const b = freeBox(save);
    if (b < 0) return null;
    const c = roll(o, rnd);
    if (b) c.b = b;
    save.box.push(c);
    return c;
  }

  /** Move a copy to another box. @returns 'ok' | 'full' | 'none' */
  function move(save, id, box) {
    const u = shortId(id),
      c = (save.box || []).find((x) => x.u === u);
    if (!c || box < 0 || box >= boxCount(save)) return 'none';
    if ((c.b || 0) === box) return 'ok';
    if (inBox(save, box) >= BOX_SIZE) return 'full';
    if (box) c.b = box;
    else delete c.b;
    return 'ok';
  }

  // ---------------- selling (step 3a-3) ----------------

  /** PokeCoins a species sells for: its rarity price, x3 for a shiny. A species with no rarity sells as 1 star. */
  function priceFor(dex, shiny) {
    const p = G.DEX_BY && G.DEX_BY[dex],
      r = p && SELL_PRICE[p.rarity] ? p.rarity : 1;
    return SELL_PRICE[r] * (shiny ? SHINY_SELL : 1);
  }

  /** What a compact copy sells for. */
  const priceOf = (c) => priceFor(c.d, !!c.s);

  const isId = (id) => typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id);

  /** What copy `id` sells for, or null if the save has no such copy. */
  function sellPrice(save, id) {
    if (!isId(id)) return null;
    const u = shortId(id),
      c = (save.box || []).find((x) => x.u === u);
    return c ? priceOf(c) : null;
  }

  /**
   * Sells copy `id`: it leaves save.box and its price goes to save.coins. Never a copy on save.team, in `also`
   * (the Team screen's uncommitted edits, as UUIDs), or locked. The Pokedex record (save.owned) is not touched.
   * @returns { ok: true, coins, last } (last: no copy of the species is left) | { ok: false, error: 'team' | 'locked' | 'none' }
   */
  function sell(save, id, also = []) {
    if (!isId(id)) return { ok: false, error: 'none' };
    const u = shortId(id),
      i = (save.box || []).findIndex((x) => x.u === u);
    if (i < 0) return { ok: false, error: 'none' };
    const c = save.box[i];
    if ((save.team || []).some((t) => t && t.uid === id) || also.includes(id)) return { ok: false, error: 'team' };
    if (c.l) return { ok: false, error: 'locked' };
    const coins = priceOf(c);
    save.box.splice(i, 1);
    save.coins = (Math.floor(+save.coins) || 0) + coins;
    return { ok: true, coins, last: !save.box.some((x) => x.d === c.d) };
  }

  // ---------------- lock and favorite (step 3b-1) ----------------

  /** Turns a copy's one-letter flag on (1) or off (the key is removed, the compact form's default). False if no such copy. */
  function setFlag(save, id, key, on) {
    if (!isId(id)) return false;
    const u = shortId(id),
      c = (save.box || []).find((x) => x.u === u);
    if (!c) return false;
    if (on) c[key] = 1;
    else delete c[key];
    return true;
  }

  /** Locked: never sold (box, gacha card, bulk). It still moves between boxes and goes on the team. */
  const setLocked = (save, id, on) => setFlag(save, id, 'l', on);
  /** Favorite: a mark that bulk sell skips (3b-3); a single sale still works. */
  const setFavorite = (save, id, on) => setFlag(save, id, 'f', on);

  // ---------------- nicknames (step 3b-2) ----------------

  /** Characters that could break out of markup, an attribute or a string, dropped even though the font has them (3b-2 E2). */
  const NICK_DROP = new Set(['<', '>', '&', '"', "'", '`', '\\', '=', '{', '}']);

  /**
   * A nickname made safe (3b-2 D6 and E2): only the trimmed game font's Latin set (U+0020 to U+007E, U+00A0 to U+024F),
   * no markup characters, no-break spaces as spaces, no soft hyphen; then spaces squeezed and trimmed, at most 16.
   * Used as you type (typing = true: no squeeze or trim yet, so a space can be typed) and on save and every load.
   */
  function cleanNickname(text, typing = false) {
    let out = '';
    for (const ch of String(text == null ? '' : text)) {
      const cp = ch.codePointAt(0);
      if (cp === 0xad) continue;
      const c = cp === 0xa0 ? ' ' : ch;
      const inFont = (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0x24f);
      if (!inFont || NICK_DROP.has(c)) continue;
      out += c;
    }
    if (!typing) out = out.replace(/ {2,}/g, ' ').trim();
    out = [...out].slice(0, NICK_MAX).join('');
    return typing ? out : out.trim();
  }

  /** Sets copy `id`'s nickname, cleaned. Empty after cleaning clears it (the species name shows). @returns the stored name ('' when cleared), or null if no such copy. */
  function setNickname(save, id, text) {
    if (!isId(id)) return null;
    const u = shortId(id),
      c = (save.box || []).find((x) => x.u === u);
    if (!c) return null;
    const k = cleanNickname(text);
    if (k) c.k = k;
    else delete c.k;
    return k;
  }

  // ---------------- bulk sell (step 3b-3) ----------------

  /**
   * Sells every copy in `ids` that may be sold, each once: never one on save.team or in `also` (the uncommitted team
   * edits), a locked one, or a favorite (bulk sell skips favorites, 3b D2).
   * @returns { sold, coins, ids (the ones sold), skipped: { team, locked, favorite, none } }
   */
  function sellMany(save, ids, also = []) {
    const out = { sold: 0, coins: 0, ids: [], skipped: { team: 0, locked: 0, favorite: 0, none: 0 } };
    for (const id of new Set(ids || [])) {
      const c = isId(id) ? (save.box || []).find((x) => x.u === shortId(id)) : null;
      if (!c) {
        out.skipped.none++;
        continue;
      }
      if (c.f) {
        out.skipped.favorite++;
        continue;
      }
      const r = sell(save, id, also);
      if (r.ok) {
        out.sold++;
        out.coins += r.coins;
        out.ids.push(id);
      } else out.skipped[r.error]++;
    }
    return out;
  }

  /**
   * "Select repeats" (3b D10): in box `box` (from 0), every copy of a species beyond the one kept. Normal and shiny copies
   * are counted apart, so a shiny is never sold to keep a normal one. Kept, in order: on the team (save.team or `also`),
   * locked, favorite, highest IV total, oldest, then box order. Never returns a team, locked or favorite copy. Other boxes
   * do not count.
   */
  function repeatsIn(save, box, also = []) {
    const team = new Set(
      (save.team || [])
        .filter((t) => t && t.uid)
        .map((t) => t.uid)
        .concat(also)
    );
    const groups = new Map();
    for (const c of save.box || []) {
      if ((c.b || 0) !== box) continue;
      const k = c.d + (c.s ? 's' : 'n');
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
    const ivSum = (c) => [...c.i].reduce((a, ch) => a + IV_CHARS.indexOf(ch), 0);
    const out = [];
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const ranked = list
        .map((c, i) => ({
          c,
          i,
          s: [team.has(longId(c.u)) ? 1 : 0, c.l ? 1 : 0, c.f ? 1 : 0, ivSum(c), -c.t],
        }))
        .sort((a, b) => {
          for (let k = 0; k < a.s.length; k++) if (a.s[k] !== b.s[k]) return b.s[k] - a.s[k];
          return a.i - b.i;
        });
      for (const { c } of ranked.slice(1)) {
        const id = longId(c.u);
        if (!team.has(id) && !c.l && !c.f) out.push(id);
      }
    }
    return out;
  }

  // ---------------- keeping the save right ----------------

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
    save.boxCount = boxCount(save);
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
      const nick = typeof c.k === 'string' ? cleanNickname(c.k) : ''; // a hand-edited or old save is cleaned like typed text
      if (nick) c.k = nick;
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
      if (c.b != null) c.b = whole(c.b, save.boxCount - 1);
      if (!c.b) delete c.b;
      return true;
    });
  }

  return {
    uuid,
    shortId,
    longId,
    roll,
    read,
    all,
    get,
    profileOf,
    setIvNature,
    species,
    add,
    move,
    boxCount,
    inBox,
    freePlaces,
    boxPrice,
    buyBox,
    priceFor,
    sellPrice,
    sell,
    setLocked,
    setFavorite,
    sellMany,
    repeatsIn,
    cleanNickname,
    setNickname,
    NICK_MAX,
    SELL_PRICE,
    linkTeam,
    clean,
    IV_MAX,
    EV_MAX,
    EV_TOTAL,
    BOX_SIZE,
    BOX_START,
    BOX_MAX,
  };
})();
