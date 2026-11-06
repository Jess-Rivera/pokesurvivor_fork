/* ============ shops.js: the Move Shop buildings on the map (G.Shops) ============
 * Move Shop step 3 (docs/proposals/move-shop-plan.md "Shops on the map"; plan: docs/ASCII Concept Maps/Move Shop step 3 -
 * Buildings and arrows.txt). A Move Trainer and a TM Mart appear together at 2:00, and again AFTER_GYM s after each return
 * from a gym (G.Gym.onReturn calls afterGym). Both doors spawn beyond the view radius + NEAR, more than 90 degrees apart as
 * seen from the player (the second bearing is the first + 100 to 260 degrees), on free ground. If either finds no spot, both
 * retry RETRY s later. Each pair lasts LIFE s on the run clock (the dt it is given), so a pause or a menu stops it; it fades
 * out over the last FADE s. Walking onto a building's contact area enters it once; you step off before you can enter again.
 * Entering opens the shop screen (G.Game.openShop, js/ui/shop-ui.js, Move Shop step 4) and pauses the run. It never opens over
 * another screen: the game refuses, and the visit is not used up (it tries again next frame while you stand on it).
 * Step 4, stock and buying (plan: docs/ASCII Concept Maps/Move Shop step 4 - Shop screens.txt): the Trainer offers each member 4
 * random moves from its level-up and egg pool it does not know, rolled the first time you look at that member and kept for this
 * building; the Mart offers 4 random TMs, once per building, never sold out. Price: 5 x the whole ENEMY LV x the run level, paid on
 * confirm. Full slots (or a third buff) go through a forget step: only LOOSE moves can be forgotten, since bonds are fixed (Jess
 * 2026-11-05); with 2 buffs already, a buff may only replace a buff. No refund for a forgotten move. A purchase never changes the
 * active slot. Fainted members cannot shop.
 * In a gym arena the shops are hidden and their clock stops (cannot happen in the normal schedule, a guard). Co-op: no
 * shops until co-op shops exist (TODO.md, deferred section).
 * Contact areas: G.ShopContact (js/data/shop-contact.js, baked by tools/gym_contact.js), so no canvas pixels are read on file://.
 * Drawn like the gym gate (js/systems/gym-arena.js): door at the building's feet, a north-east shadow, Y-sorted with the scene.
 * Checks: docs/proposals/shops-harness.js (mutations: shops-mutate.js).
 */
G.Shops = (() => {
  const FIRST_AT = 120, // s, the first pair
    AFTER_GYM = 90, // s after a gym return
    LIFE = 60, // s each pair stays (run clock)
    BLINK = 10, // s left when the HUD label starts to blink
    FADE = 1, // s, the fade out at the end
    RETRY = 2; // s, retry when no free spot was found
  const NEAR = 140,
    FAR = 320; // world px beyond G.Camera.outerRadius() where the doors spawn (TUNE)
  const TRIES = 24; // random spots tried per building
  const SCALE = 1.5; // art px to world px (TUNE by feel; the gym is 288 x 248 at 0.5)
  const DEG = Math.PI / 180;
  const CLEAR_STEP = 16,
    CLEAR_R = 8; // spawn clearance, the same grid as the gym gate
  const SHADOW_DX = 10,
    SHADOW_DY = -8,
    SHADOW_A = 0.35; // the building's shadow, as the gym gate's
  const KINDS = {
    trainer: { name: 'Move Trainer', src: 'assets/tileset/move-trainer.png' },
    mart: { name: 'TM Mart', src: 'assets/tileset/tm-mart.png' },
  };
  const ORDER = ['trainer', 'mart'];
  let shops = []; // { kind, x, y, t, on }: x, y = the door (the building's feet); t = age in s; on = standing on it
  let nextAt = FIRST_AT; // run time of the next pair, null when none is due

  // ---- contact masks (1 = solid), from the baked rows ----
  const masks = {};
  for (const k of ORDER) {
    const c = G.ShopContact && G.ShopContact[k];
    if (!c) continue;
    const solid = new Uint8Array(c.w * c.h);
    c.rows.split('/').forEach((row, y) => {
      if (row)
        for (const run of row.split(',')) {
          const [x0, x1] = run.split('-').map(Number);
          solid.fill(1, y * c.w + x0, y * c.w + x1);
        }
    });
    masks[k] = { w: c.w, h: c.h, solid };
  }
  if (ORDER.some((k) => !masks[k]))
    console.warn('[Shops] contact data missing (js/data/shop-contact.js): shops cannot be placed or entered');

  /** Is world point (x, y) on the contact area of a `kind` building whose door is at (gx, gy)? */
  function onBuilding(kind, gx, gy, x, y) {
    const m = masks[kind];
    if (!m) return false;
    const ix = Math.floor((x - gx) / SCALE + m.w / 2),
      iy = Math.floor((y - gy - 4) / SCALE + m.h);
    if (ix < 0 || iy < 0 || ix >= m.w || iy >= m.h) return false;
    return m.solid[iy * m.w + ix] === 1;
  }

  /** Is the whole contact area of a `kind` building at (gx, gy) on free ground? */
  function spotClear(kind, gx, gy) {
    const m = masks[kind];
    if (!m) return false;
    const w = m.w * SCALE,
      h = m.h * SCALE;
    for (let y = gy + 4 - h; y <= gy + 4; y += CLEAR_STEP)
      for (let x = gx - w / 2; x <= gx + w / 2; x += CLEAR_STEP) {
        const px = Math.min(x, gx + w / 2 - 1),
          py = Math.min(y, gy + 3);
        if (onBuilding(kind, gx, gy, px, py) && !G.World.isFree(px, py, CLEAR_R)) return false;
      }
    return true;
  }

  /** Places one of each building around the player. False, and nothing placed, if either finds no free spot. */
  function place(pl) {
    const R0 = G.Camera.outerRadius(),
      got = [];
    let a0 = null;
    for (const kind of ORDER) {
      let spot = null;
      for (let i = 0; i < TRIES && !spot; i++) {
        const a = a0 == null ? Math.random() * 360 * DEG : a0 + (100 + Math.random() * 160) * DEG,
          d = R0 + NEAR + Math.random() * (FAR - NEAR),
          x = pl.x + Math.cos(a) * d,
          y = pl.y + Math.sin(a) * d;
        if (spotClear(kind, x, y)) spot = { kind, x, y, a };
      }
      if (!spot) return false;
      if (a0 == null) a0 = spot.a;
      got.push(spot);
    }
    shops = got.map((s) => fresh(s.kind, s.x, s.y));
    for (const s of shops) artFor(s.kind);
    return true;
  }

  /** Walking in (once per visit): the game opens the shop screen. False when it cannot now (another screen is open). */
  function enter(s) {
    return G.Game.openShop(s);
  }

  /** Every map frame (solo). t = run time. */
  function update(dt, pl, t) {
    if (G.Coop.active) return; // no shops in co-op until co-op shops exist
    if (G.GymArena.inArena) return; // hidden in an arena, and their minute stops
    for (const s of shops) s.t += dt;
    shops = shops.filter((s) => s.t < LIFE);
    if (nextAt != null && t >= nextAt && !shops.length && !pl.dead) {
      if (place(pl)) nextAt = null;
      else nextAt = t + RETRY; // no free ground yet: both try again shortly
    }
    for (const s of shops) {
      const on = !pl.dead && onBuilding(s.kind, s.x, s.y, pl.x, pl.y);
      if (on && !s.on && !enter(s)) continue; // refused (another screen is open): the visit is not used up
      s.on = on;
    }
  }

  // ---- Move Shop step 4: stock, price and buying ----
  const STOCK = 4; // offers per member (Trainer) or per building (Mart)
  // Step 4c (Jess 2026-11-05): the old Ban upgrade becomes Shop Rerolls. Each building has its own count, shared by the whole team:
  // 1 free (R2) plus the Shop Rerolls rank. The rank reads 0 until upgrade points are wired (js/ui/menu.js UPG_COLS, display only;
  // TODO.md "Upgrade points"), so this is the one hook to change then. No save field.
  const FREE_REROLLS = 1;
  const rerollRank = () => 0;

  /** A shop on the map (or a debug one): its door, age, the standing-on flag, its stock and its rerolls left. */
  function fresh(kind, x, y) {
    return { kind, x, y, t: 0, on: false, stock: new Map(), tms: null, rerolls: FREE_REROLLS + rerollRank() };
  }

  /** Silver for one move: 5 x the whole world level (the HUD's ENEMY LV) x the run level. */
  function price(t, lvl) {
    return 5 * Math.floor(G.Stats.levelForTime(t)) * lvl;
  }
  const priceNow = () => price(G.Game.st.time, G.Game.player ? G.Game.player.level : 1);

  /** What this shop offers member f now. Trainer: f's 4, rolled once per building, known moves left out. Mart: the 4 TMs. */
  function offers(shop, f) {
    if (shop.kind === 'mart') {
      if (!shop.tms) shop.tms = G.U.pickN(G.Moves.tmList(), STOCK);
      return shop.tms.slice();
    }
    if (!f) return [];
    let ids = shop.stock.get(f);
    if (!ids)
      shop.stock.set(
        f,
        (ids = G.U.pickN(
          G.Moves.poolFor(f.mon).filter((id) => !f.hasMove(id)),
          STOCK
        ))
      );
    return ids.filter((id) => !f.hasMove(id));
  }

  /**
   * Step 4c: re-rolls this shop's offers, free, one from the building's count (shared by the team, R3/R4). Trainer: member f's 4;
   * Mart: the 4 TMs. The new ones never include a known move and avoid the 4 just shown while the pool has enough others; a small
   * pool fills back up from them. False, and nothing spent, with none left or no one to shop for.
   */
  function reroll(shop, f) {
    if (!(shop.rerolls > 0)) return false;
    const mart = shop.kind === 'mart';
    if (!mart && (!f || f.dead)) return false;
    const shown = offers(shop, f),
      pool = mart ? G.Moves.tmList() : G.Moves.poolFor(f.mon).filter((id) => !f.hasMove(id)),
      next = G.U.pickN(
        pool.filter((id) => !shown.includes(id)),
        STOCK
      );
    if (next.length < STOCK) next.push(...G.U.pickN(shown, STOCK - next.length));
    if (mart) shop.tms = next;
    else shop.stock.set(f, next);
    shop.rerolls--;
    return true;
  }
  const rerollsLeft = (shop) => Math.max(0, shop.rerolls | 0);

  /**
   * Can member f buy move `id` here now? { ok, why, cost, forget, allowed }. forget: the purchase needs the forget step, allowed =
   * the slot indexes that may be forgotten (loose moves only; with 2 buffs already and a buff bought, buffs only).
   */
  function check(shop, f, id) {
    const cost = priceNow();
    if (!f || f.dead) return { ok: false, why: 'Fainted', cost };
    if (f.hasMove(id)) return { ok: false, why: 'Knows it', cost };
    if (shop.kind === 'mart' ? !(shop.tms || []).includes(id) : !offers(shop, f).includes(id))
      return { ok: false, why: 'Not sold here', cost };
    if (shop.kind === 'mart' && !G.Moves.canUseTm(f.mon, id)) return { ok: false, why: "Can't learn", cost };
    if (G.Silver.whole < cost) return { ok: false, why: "Can't afford", cost };
    const isBuff = G.MoveInfo.isBuff,
      capped = isBuff(id) && f.moves.filter((m) => isBuff(m.id)).length >= 2;
    if (f.slots.length < f.maxMoves && !capped) return { ok: true, cost, forget: false };
    const allowed = [];
    f.slots.forEach((g, i) => {
      if (g.length === 1 && (!capped || isBuff(g[0].id))) allowed.push(i);
    });
    if (!allowed.length)
      return { ok: false, why: f.slots.every((g) => g.length > 1) ? 'Every slot is bonded' : '2 buffs already', cost };
    return { ok: true, cost, forget: true, allowed };
  }

  /** Buys `id` for member f, forgetting the move in `slot` when the forget step is needed. True when bought (and paid). */
  function buy(shop, f, id, slot = null) {
    const c = check(shop, f, id);
    if (!c.ok) return false;
    if (c.forget) {
      if (slot == null || !c.allowed.includes(slot)) return false;
      if (!f.replaceMove(f.slots[slot][0].id, id)) return false;
    } else if (!f.addMove(id, true)) return false; // a purchase never changes the active slot
    G.Silver.spend(c.cost);
    if (shop.kind === 'trainer') {
      const ids = shop.stock.get(f),
        k = ids ? ids.indexOf(id) : -1;
      if (k >= 0) ids.splice(k, 1); // a bought move leaves the stock
    }
    return true;
  }

  function reset() {
    shops = [];
    nextAt = FIRST_AT;
  }

  // ---- drawing ----
  const art = {}; // kind -> { img, shadow, ok }

  /** A black copy of an image (same shape), for the building's shadow. */
  function silhouette(img) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function artFor(kind) {
    let a = art[kind];
    if (!a) {
      a = art[kind] = { img: null, shadow: null, ok: false };
      if (typeof Image === 'undefined') return a; // the offline harnesses run without a DOM
      a.img = new Image();
      a.img.onload = () => {
        a.shadow = silhouette(a.img);
        a.ok = true;
      };
      a.img.src = KINDS[kind].src;
    }
    return a;
  }
  const alphaOf = (s) => Math.max(0, Math.min(1, s.t * 2, (LIFE - s.t) / FADE));
  const hidden = () => G.Coop.active || G.GymArena.inArena;

  /** The buildings, to sort them by Y with the rest of the scene. */
  function drawables() {
    if (hidden()) return [];
    return shops.map((s) => ({
      y: s.y,
      draw(ctx) {
        const a = artFor(s.kind);
        if (!a.ok) return;
        const w = a.img.width * SCALE,
          h = a.img.height * SCALE,
          x = Math.round(s.x - w / 2),
          y = Math.round(s.y - h + 4),
          k = alphaOf(s);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = SHADOW_A * k;
        ctx.drawImage(a.shadow, x + SHADOW_DX, y + SHADOW_DY, w, h);
        ctx.globalAlpha = k;
        ctx.drawImage(a.img, x, y, w, h);
        ctx.restore();
      },
    }));
  }

  return {
    BLINK,
    reset,
    update,
    drawables,
    onBuilding,
    price,
    offers,
    check,
    buy,
    reroll,
    rerollsLeft,
    nameOf: (kind) => (KINDS[kind] ? KINDS[kind].name : kind),
    /** Back on the map after a gym (G.Gym.onReturn): the next pair is due AFTER_GYM s later. */
    afterGym(t) {
      nextAt = t + AFTER_GYM;
    },
    /** The shops on the map, for the HUD and the checks (copies). h = the building's drawn height (world px). */
    get list() {
      if (hidden()) return [];
      return shops.map((s) => ({
        kind: s.kind,
        name: KINDS[s.kind].name,
        x: s.x,
        y: s.y,
        left: LIFE - s.t,
        alpha: alphaOf(s),
        h: (masks[s.kind] ? masks[s.kind].h : 0) * SCALE,
      }));
    },
    get nextAt() {
      return nextAt;
    },
    /** G.Debug.shops(): place both now, by the normal rules (the schedule is untouched). */
    debugPlace() {
      const pl = G.Game.player;
      if (!pl) return false;
      shops = [];
      return place(pl);
    },
    /** G.Debug.trainer() / mart(): open that shop's screen now with fresh stock, no building needed. */
    debugOpen(kind) {
      if (!KINDS[kind] || !G.Game.player) return false;
      return G.Game.openShop(fresh(kind, G.Game.player.x, G.Game.player.y));
    },
  };
})();
