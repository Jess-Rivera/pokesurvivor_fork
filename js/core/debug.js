/* ============ debug.js — developer sandbox (only with ?dev) ============
 * Gated behind the ?dev URL flag (same flag the maintenance bypass uses).
 * Without ?dev, every method is a no-op, so this is inert in the published
 * game unless a developer explicitly opts in.
 *
 *   G.Debug.maxAll()   unlock every Pokemon + shiny, max coins/tickets,
 *                      and max every per-Pokemon upgrade. Writes to the
 *                      current save (local or guest).
 *   G.Debug.give(id)   give the active Pokemon a move
 *   G.Debug.ground(id) drop a ground item above you, outside pickup range but on screen (no id: logs every id; ids in data/ground-items.js, e.g. 'x-attack', 'sitrus', 'occa', 'pinap')
 *   G.Debug.item(id[, force])   give a Pokemon-tier held item through the real pickup path, chooser included (force=true equips directly; no id: logs every pokemon-tier id; ids in data/items.js, e.g. 'leftovers', 'scopelens', 'expertbelt')
 *   G.Debug.unlockitem(id|'all') unlock a team item for the pre-run loadout (no id: logs the ids). Saved.
 *   G.Debug.loadout(id, id, ...) set the pre-run loadout directly (cleaned: unlocked only, one Stone, within your slots). No ids: logs it. Saved.
 *   G.Debug.coins(n)   set your PokeCoins to n (no arg: logs the balance). Saved. For testing Shop prices.
 *   G.Debug.silver(n)  set this run's Silver to n (no arg: logs it). In a run only, not saved (Silver is run-only). For the Move Shop.
 *   G.Debug.tickets(n, m) set your Pokeballs (x1 tickets) to n and, if given, your Master Balls (x10 tickets) to m (no arg: logs both). Saved.
 *   G.Debug.runslots(n) set how many run-item slots this save has unlocked (1 to 4; no arg: logs the current count). Saved.
 *   G.Debug.runitem(id[, force]) give a run-tier item through the real pickup path, chooser included (force=true equips on the team directly, ignoring slot limits; no id: logs every run-tier id; e.g. 'snowballbadge', 'redo', 'firestone', 'sharpscissors')
 *   G.Game.debugLevelUp()  queue a level-up now (already exists)
 *   G.Debug.elite()    spawn an overworld elite now (watch the HP bar, enrage timer and the [Elite] TTK line in the console)
 *   G.Debug.skipTo(m)  jump the run clock to m minutes (enemy level and elite HP follow it; the run is flagged tampered)
 *   G.Debug.levelUp(n) queue n level-ups (same as calling G.Game.debugLevelUp() n times)
 *   G.Debug.gym(n)     open the next gym gate now, or gym n's (walk into it to fight; losing ends the run)
 *   G.Debug.leaderSwap(slot)  in a switched gym's fight, the leader AI asks to swap to its team slot (1 is the first); your swap rules decide it (Leader AI slice 1)
 *   G.Debug.leaderAI({ swaps, dodges })  turn the leader AI's own swaps or dodges on or off (true / false); no argument prints them and its last decisions (slice 2)
 *   G.Debug.shops()    place a Move Trainer and a TM Mart now, by the normal placement rules (Move Shop step 3; the 2:00 and after-gym schedule is untouched)
 *   G.Debug.trainer() / G.Debug.mart()  open the Move Trainer or TM Mart screen now with fresh stock, no building needed (Move Shop step 4; pair with G.Debug.silver(n))
 *   G.Debug.status(kind, radius)  put burn|poison|toxic|paralysis|freeze|sleep|confusion|trap on every enemy near you (ignite is the same)
 *   G.Debug.statusSelf(kind)      put one of those statuses on the ACTIVE Pokemon (to feel what a hit would do)
 *   G.Debug.carrier(kind, n)       spawn n Status-class carriers of that status (slow|daze|paralysis|confusion|poison|trap|freeze|haste|sleep) just inside the view, to check the cap of 2, the close band and what a hit does
 *   G.Debug.flinch(radius)         flinch every enemy near you (lose the action; moving ones recoil half a sprite radius back, then stop 0.2 to 0.3 s)
 *   G.Debug.stage(stat, n, radius)  stat stage on every enemy near you: spe|def|spd|atk|spa, n = -1 (6 s each; repeat to stack, +-6 max)
 *   G.Debug.spawn(k)   scale ALL wild spawns by k: 0 stops them (drip, tides, bursts, elites), 0.5 halves, 1 or no argument is normal again
 *   G.Debug.noSpawn() / spawnOn()  shortcuts for spawn(0) / spawn(1)
 *   G.Debug.movechecker(id, ...)  range and move-data check (?dev): up to 6 move ids, one per slot, ONE pinned dummy, range rings every 50 px out to 600, each move's data in the console; no id turns it off
 *   G.Debug.copies(dex)  list your Pokemon copies, or one species' (no arg: all), with the box size in the save
 *   G.Debug.copy(id)   every field of one copy, by UUID or dex (no arg: the lead's). Shows the values players do not see yet.
 *   G.Debug.addCopy(dex, n, shiny)  add n more copies of a species (default 1), for testing duplicates; stops when the boxes are full. Saved.
 *   G.Debug.fillBoxes(leave)  top your boxes up with Caterpie copies until `leave` places are free (default 0), to test full boxes. Saved.
 *   G.Debug.fighter()  the active fighter's six stats at its level and its movement px/s: plain (0 IV, 0 EV, no nature) next to this copy
 *   G.Debug.evbank(hp, atk, def, spa, spd, spe)  set THIS run's six EV banks in EVs (decimals allowed, 3.742) to test the end-of-run
 *                      allocation without an hour run; no args: logs them. Flags the run as tampered (it still allocates).
 *   G.Debug.ivs(slot, v, nature)  set the copy in team slot `slot` (0 to 5) to six IVs of v (0 to 31) and, if given, a nature by
 *                      name ('jolly'). Saved; takes effect from the next run, which is flagged tampered.
 *   G.Debug.on         true when ?dev is present.
 *
 * Any run played after maxAll() is flagged tampered via G.Game.debugMaxed(),
 * so a debug sandbox can never post a score to the ranking.
 */
G.Debug = (() => {
  const on = /[?&]dev\b/.test(location.search);

  function maxAll() {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const save = G.DB.save;
    if (!save) {
      console.warn('[Debug] no active save — log in or play as guest first.');
      return false;
    }

    // Every Pokemon owned + shiny, with every box so they all fit: one normal and one shiny copy per species, only where missing.
    save.boxCount = G.Copies.BOX_MAX;
    const have = new Set((save.box || []).map((c) => c.d + (c.s ? 's' : 'n')));
    let dexN = 0;
    for (const p of G.DEX) {
      if (have.has(p.dex + 'n')) G.DB.grant(p.dex, 'debug');
      else G.DB.obtain(p.dex, false, 'debug');
      if (have.has(p.dex + 's')) G.DB.grantShiny(p.dex, 'debug');
      else G.DB.obtain(p.dex, true, 'debug');
      dexN++;
    }

    // Currency.
    save.coins = 9999999;
    save.tickets = { t1: 9999, t10: 9999 };

    // Max every per-Pokemon upgrade, for every owned Pokemon.
    for (const p of G.DEX) {
      const u = G.DB.upgradesOf(p.dex);
      for (const up of G.Upgrades.LIST) u[up.id] = up.max;
    }

    // Flag the session so any run is kept out of the ranking.
    if (G.Game && G.Game.debugMaxed) G.Game.debugMaxed();

    G.DB.commit(true);
    if (G.UI && G.UI.toast) G.UI.toast('Debug: everything unlocked and maxed', 3000);
    console.log('[Debug] maxed:', dexN, 'Pokemon owned + shiny, coins/tickets maxed, all upgrades maxed.');
    return true;
  }

  /** Clears every per-Pokemon upgrade back to 0 (keeps unlocks/currency). The
   *  counterpart to maxAll's upgrade maxing: lets you see true base-stat values
   *  (e.g. raw HP) without the maxed perks piled on. ?dev only. */
  function clearUpgrades() {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const save = G.DB.save;
    if (!save) {
      console.warn('[Debug] no active save.');
      return false;
    }
    for (const p of G.DEX) {
      const u = G.DB.upgradesOf(p.dex);
      for (const up of G.Upgrades.LIST) u[up.id] = 0;
    }
    G.DB.commit(true);
    if (G.UI && G.UI.toast) G.UI.toast('Debug: upgrades cleared to 0', 2500);
    console.log('[Debug] all per-Pokemon upgrades cleared to 0.');
    return true;
  }

  /** Toggle: if any upgrade is above 0, clear them all; otherwise max them all.
   *  One key flips maxed-upgrades off and on, to compare base vs upgraded stats. */
  function toggleUpgrades() {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const save = G.DB.save;
    if (!save) {
      console.warn('[Debug] no active save.');
      return false;
    }
    let anyUp = false;
    for (const p of G.DEX) {
      const u = G.DB.upgradesOf(p.dex);
      for (const up of G.Upgrades.LIST)
        if ((u[up.id] || 0) > 0) {
          anyUp = true;
          break;
        }
      if (anyUp) break;
    }
    if (anyUp) return clearUpgrades();
    for (const p of G.DEX) {
      const u = G.DB.upgradesOf(p.dex);
      for (const up of G.Upgrades.LIST) u[up.id] = up.max;
    }
    if (G.Game && G.Game.debugMaxed) G.Game.debugMaxed();
    G.DB.commit(true);
    if (G.UI && G.UI.toast) G.UI.toast('Debug: upgrades maxed', 2500);
    console.log('[Debug] all per-Pokemon upgrades maxed.');
    return true;
  }

  /** Give the active Pokemon a move (needs a free slot). Flags the run as tampered. ?dev only. */
  /** Drop ground item `id` above the active Pokemon, outside its pickup range and on screen (it applies on contact). With no id, logs and returns the list of ids. */
  function ground(id) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    if (!id) {
      const ids = G.Grounds.LIST.map((i) => i.id).concat(['pokeball', 'masterball']);
      console.log('[Debug] ground ids: ' + ids.join(', '));
      return ids;
    }
    const BALL = { pokeball: 'ticket', masterball: 'ticket10' }; // gacha tickets: drawn as a Great Ball (x1) and a Master Ball (x10)
    if (BALL[id]) {
      const p = G.Game.player;
      if (!p) return false;
      G.Game.debugMaxed();
      G.Pickups.drop(BALL[id], p.x + G.U.rand(-160, 160), p.y - Math.min(260, (p.magnet || 80) + 90), 1);
      return true;
    }
    if (!G.Grounds.BY[id]) {
      console.warn('[Debug] unknown ground item ' + id);
      return false;
    }
    const p = G.Game.player;
    if (!p) return false;
    G.Game.debugMaxed();
    // Above you (the action bar sits below), spread sideways so several drops do not stack on one spot.
    const d = Math.min(260, (p.magnet || 80) + 90);
    G.Pickups.drop('ground', p.x + G.U.rand(-160, 160), p.y - d, id);
    return true;
  }

  /** Give Pokemon-tier item `id` to the active Pokemon through the REAL pickup path (chooser if it already holds one); force=true equips directly. With no id, logs and returns the pokemon-tier ids. ?dev only. */
  function item(id, force) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const ids = G.Items.LIST.filter((i) => i.tier === 'pokemon').map((i) => i.id);
    if (!id) {
      console.log('[Debug] pokemon item ids: ' + ids.join(', '));
      return ids;
    }
    if (!G.Items.BY[id] || G.Items.BY[id].tier !== 'pokemon') {
      console.warn('[Debug] unknown pokemon-tier item ' + id);
      return false;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) return false;
    if (force)
      pl.equip(id); // bypass: no chooser
    else {
      G.Game.offerItem(id);
      return true;
    } // the real pickup path (chooser when the Pokemon already holds one)
    if (G.Spawner && G.Spawner.say) G.Spawner.say(pl.mon.name + ' got ' + G.Items.BY[id].name + '!', 2.2, true);
    return true;
  }

  /** Run-tier item `id` through the REAL pickup path (G.Game.offerItem): free slot = equipped, full grid or Stone clash = the chooser. Pass force=true to equip on the team directly (ignores slot limits, no chooser). With no id, logs and returns the run-tier ids. ?dev only. */
  function runitem(id, force) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const ids = G.Items.LIST.filter((i) => i.tier === 'run').map((i) => i.id);
    if (!id) {
      console.log('[Debug] run item ids: ' + ids.join(', '));
      return ids;
    }
    if (!G.Items.BY[id] || G.Items.BY[id].tier !== 'run') {
      console.warn('[Debug] unknown run-tier item ' + id);
      return false;
    }
    if (!(G.Game && G.Game.equipRun)) return false;
    if (!force) {
      G.Game.offerItem(id);
      return true;
    }
    G.Game.equipRun(id);
    if (G.Spawner && G.Spawner.say) G.Spawner.say('Picked up ' + G.Items.BY[id].name + '!', 2.2, true);
    return true;
  }

  /** Set PokeCoins to `n` (or log the balance). ?dev only. */
  function coins(n) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const s = G.DB && G.DB.save;
    if (!s) {
      console.warn('[Debug] no save loaded.');
      return false;
    }
    if (n != null) {
      s.coins = Math.max(0, Math.floor(+n) || 0);
      G.DB.commit();
      if (G.UI && G.UI.refreshCoins) G.UI.refreshCoins();
    }
    console.log('[Debug] PokeCoins: ' + s.coins);
    return s.coins;
  }

  /** Set this run's Silver to `n` (or log it). ?dev only, in a run only. Not saved: Silver is run-only (js/systems/silver.js). */
  function silver(n) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    if (!G.Game.player) {
      console.warn('[Debug] start a run first: Silver only exists in a run.');
      return false;
    }
    if (n != null) G.Silver.set(n);
    console.log('[Debug] Silver: ' + G.Silver.whole + ' (' + G.Silver.amount.toFixed(2) + ' inside)');
    return G.Silver.whole;
  }

  /** Set the gacha tickets: n Pokeballs (x1), and m Master Balls (x10) when given. No arg: logs both. ?dev only. Saved. */
  function tickets(n, m) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const s = G.DB && G.DB.save;
    if (!s) {
      console.warn('[Debug] no save loaded.');
      return false;
    }
    s.tickets = s.tickets || { t1: 0, t10: 0 };
    const whole = (v) => Math.max(0, Math.floor(+v) || 0);
    if (n != null || m != null) {
      if (n != null) s.tickets.t1 = whole(n);
      if (m != null) s.tickets.t10 = whole(m);
      G.DB.commit();
    }
    console.log('[Debug] Pokeballs: ' + s.tickets.t1 + ' · Master Balls: ' + s.tickets.t10);
    return { pokeballs: s.tickets.t1, masterBalls: s.tickets.t10 };
  }

  /** Unlock `n` run-item slots (1 to 4) on this save, or log the current count. ?dev only. Saved (save.runSlots, absent in old saves = 1). */
  function runslots(n) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const s = G.DB && G.DB.save;
    if (!s) {
      console.warn('[Debug] no save loaded.');
      return false;
    }
    if (n == null) {
      const cur = G.Items.runSlots(s);
      console.log('[Debug] run slots: ' + cur);
      return cur;
    }
    s.runSlots = Math.max(G.Items.RUN_SLOTS_DEFAULT, Math.min(G.Items.RUN_SLOTS_MAX, Math.floor(+n) || 1));
    G.DB.commit();
    console.log('[Debug] run slots set to ' + s.runSlots);
    return s.runSlots;
  }

  /** Unlock a team item (or 'all') on this save for the pre-run loadout. ?dev only. */
  function unlockitem(id) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const ids = G.Items.LIST.filter((i) => i.tier === 'run').map((i) => i.id),
      s = G.DB.save;
    if (!id) {
      console.log('[Debug] team item ids: ' + ids.join(', '));
      return ids;
    }
    const list = id === 'all' ? ids : [id];
    let n = 0;
    for (const x of list) {
      if (!G.Items.BY[x] || G.Items.BY[x].tier !== 'run') {
        console.warn('[Debug] unknown team item ' + x);
        continue;
      }
      if (G.Items.unlock(s, x, 'debug')) n++;
    }
    G.DB.commit();
    console.log('[Debug] unlocked ' + n + ' new team item(s); total ' + Object.keys(s.teamItems).length);
    return n;
  }

  /** Set the pre-run loadout directly. ?dev only. */
  function loadout(...ids) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const s = G.DB.save;
    if (ids.length) {
      s.teamLoadout = ids;
      G.Items.cleanLoadout(s);
      G.DB.commit();
    }
    console.log(
      '[Debug] loadout: ' + (s.teamLoadout.join(', ') || '(empty)') + '  (slots: ' + G.Items.runSlots(s) + ')'
    );
    return s.teamLoadout.slice();
  }

  function give(id) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const pl = G.Game && G.Game.player;
    if (!pl || !G.MoveDefs[id]) {
      console.warn('[Debug] no run in progress, or unknown move id.');
      return false;
    }
    G.Game.debugMaxed();
    return pl.addMove(id);
  }

  /** Put a status on every enemy around the active Pokemon, for a one-minute check of the DoT numbers:
   *  G.Debug.ignite('burn' | 'poison' | 'toxic', radius = 600). Then G.Log.print(30) shows the DOT lines with % of max HP.
   *  Returns how many enemies were in range. Flags the run as tampered. ?dev only. */
  function status(kind = 'burn', radius = 600) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return 0;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) {
      console.warn('[Debug] no run in progress.');
      return 0;
    }
    G.Game.debugMaxed();
    const list = G.EnemyMgr.queryCircle(pl.x, pl.y, radius);
    for (const e of list) {
      if (e.remote) continue;
      if (kind === 'burn') e.applyBurn(1);
      else if (kind === 'toxic') e.applyPoison(2);
      else if (kind === 'poison') e.applyPoison(1);
      else if (G.Status.isControl(kind)) e.applyStatus(kind);
      else {
        console.warn('[Debug] unknown status: ' + kind);
        return 0;
      }
    }
    return list.length;
  }
  const ignite = status;

  /** Flinch check (slice D2): G.Debug.flinch(radius = 600) flinches every enemy near you (they lose their action; the moving ones recoil). ?dev only. */
  function flinch(radius = 600) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return 0;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) {
      console.warn('[Debug] no run in progress.');
      return 0;
    }
    G.Game.debugMaxed();
    let n = 0;
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, radius)) if (e.applyFlinch && e.applyFlinch()) n++;
    return n;
  }

  /** Stat stage check (slice D1): G.Debug.stage('spe' | 'def' | 'spd' | 'atk' | 'spa', n = -1, radius = 600) puts one application of n stages
   *  (6 s, then it expires) on every enemy near you. Call it several times to stack (clamped to +-6). Returns how many enemies were hit. ?dev only. */
  function stage(stat = 'spe', n = -1, radius = 600) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return 0;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) {
      console.warn('[Debug] no run in progress.');
      return 0;
    }
    if (!G.Stages.STATS.includes(stat)) {
      console.warn('[Debug] unknown stat: ' + stat);
      return 0;
    }
    G.Game.debugMaxed();
    const list = G.EnemyMgr.queryCircle(pl.x, pl.y, radius);
    for (const e of list) if (!e.remote) G.Stages.add(e, stat, n, G.Stages.DUR);
    return list.length;
  }

  /** The same statuses on the active Pokemon. Returns the result ('ok' | 'refresh' | 'immune' | 'blocked' | 'window'). Flags the run as tampered. ?dev only. */
  function statusSelf(kind = 'burn') {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) {
      console.warn('[Debug] no run in progress.');
      return null;
    }
    G.Game.debugMaxed();
    if (kind === 'burn' || kind === 'poison' || kind === 'toxic') return G.Status.applyDot(pl, kind);
    if (kind === 'slow') {
      G.Stages.add(pl, 'spe', -1, G.Enemies.CARRIER.dur.slow);
      return 'ok';
    }
    if (G.Status.isControl(kind)) return G.Status.apply(pl, kind);
    console.warn('[Debug] unknown status: ' + kind);
    return null;
  }

  /** Spawn n Status-class carriers of `kind` around you (slice E1). Primary Status species only, picked at random. Flags the run as tampered. ?dev only. */
  function carrier(kind = 'paralysis', n = 4) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return 0;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) {
      console.warn('[Debug] no run in progress.');
      return 0;
    }
    const dexes = Object.keys(G.Enemies.CARRIER_OF)
      .map(Number)
      .filter((d) => G.Enemies.CARRIER_OF[d] === kind && G.Enemies.classOf(G.DEX_BY[d]) === 'status');
    if (!dexes.length) {
      console.warn('[Debug] no primary Status species for "' + kind + '".');
      return 0;
    }
    G.Game.debugMaxed();
    let made = 0;
    for (let i = 0; i < n; i++) {
      const def = G.Enemies.defForDex(G.U.pick(dexes), G.Game.time),
        a = (i / n) * 6.2832 + Math.random() * 0.4;
      if (!def) continue;
      G.EnemyMgr.add(
        new G.Enemy(def, pl.x + Math.cos(a) * 380, pl.y + Math.sin(a) * 380, G.Enemies.scale(G.Game.time))
      );
      made++;
    }
    return made;
  }

  /** Test dummies are typeless (slice 4b, D-T, Jess 2026-11-06): every move lands at x1 and none is immune, so a test set shows
   *  every move working. Immunity is felt on real wild enemies. */
  function dummyTypes(e) {
    e.types = ['typeless'];
    e.atkType = 'typeless';
    return e;
  }

  /** Scale every wild spawn by k (0 = none: drip, tides, bursts and elites all stop; 1 = normal). Enemies already alive stay. Flags the run as tampered. ?dev only. */
  function spawn(k = 1) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    if (G.Game && G.Game.debugMaxed) G.Game.debugMaxed();
    const v = G.Spawner.debugRate(k);
    console.log('[Debug] spawn rate x' + v + (v === 0 ? ' (spawning stopped; G.Debug.spawnOn() resumes)' : ''));
    return v;
  }
  const noSpawn = () => spawn(0);
  const spawnOn = () => spawn(1);

  /** New move system hitbox overlay (slice 3d): G.Debug.hitbox() toggles, hitbox(true|false) sets. Needs ?dev. */
  function hitbox(v) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    G.MoveRender.overlay = v == null ? !G.MoveRender.overlay : !!v;
    return G.MoveRender.overlay;
  }

  /** New move system quick test (slice 3d, ?dev): a set of routed moves, one per slot (cycle slots to try each), wild spawns
   *  stopped, the overlay on, and 24 dummy enemies in 8 directions at 50, 130 and 220 px with a huge HP pool. Returns how many dummies
   *  were placed. Flags the run as tampered.
   *  newcombat()          the slice 3d seven; a dummy sleeps for good (no movement, no attacks, damage never wakes a sleeper).
   *  newcombat('riders')  the slice 4a seven; dummies are AWAKE slow walkers (40 px/s) at 90, 170 and 250 px, so burn, paralysis,
   *                       freeze, flinch, knockback and the trap root can show. The overlay prints each dummy's statuses and stages.
   *  newcombat('selfcasts')  the slice 4b self-casts (Swords Dance, Dragon Dance, Aqua Ring, Substitute) with the 'riders' awake
   *                       dummies, so they reach you and the shield gets hit. The overlay prints your HP, shield and team stages.
   *  newcombat('specials')   Dragon Rage, Hex, Thunderbolt and Flamethrower. Slow awake dummies (20 px/s): a line of 6, 100 px
   *                       apart, in front of you for the Thunderbolt chain, plus 2 each burned, poisoned, paralyzed and asleep at
   *                       200 px for Hex. The overlay also prints your commitment timers (Flamethrower's slow and freeze).
   *  newcombat('persist')   slice 4c-1: Fire Spin, Leaf Storm and Night Shade, one per slot, with two rings of 8 slow awake dummies
   *                       (20 px/s) at 90 and 150 px. Cycle slots or swap Pokemon to check R7: the move you leave ends at once and
   *                       the new one spins up fresh. The overlay prints your live persistent groups and Leaf Storm's Sp. Atk -2.
   *  newcombat('motion')    slice 4c-2: Razor Leaf, Bonemerang, Quick Attack and Aerial Ace, one per slot, with a loose crowd of 12
   *                       slow awake dummies (20 px/s) at 140 and 260 px. Bones go out and come back (Bonemerang pushes out, pulls
   *                       back), Quick Attack dashes to the nearest and returns, Aerial Ace lands on it. The overlay prints each
   *                       bone's or dash's leg and your invulnerability timer.
   *  newcombat('arcs'), ('novas'), ('shots'), ('buffs')   slice 4r, the 20 plain moves: static arcs (Vine Whip, Karate Chop, Lick, Metal
   *                       Claw, Powder Snow, Wing Attack, Bug Bite), nova rings (Dazzling Gleam, Hyper Voice, Dark Pulse, Bug Buzz),
   *                       shots and beams (Poison Sting, Rock Throw, Shadow Ball, Thunder Shock, Sludge, Flash Cannon, Psybeam) and
   *                       the self-buffs (Agility, Harden). Three rings of 8 slow awake dummies (20 px/s) at 70, 140 and 230 px.
   *  newcombat('extras')   slice 4c-3: Psychic, Confusion, Bubble Beam and Aura Sphere, one per slot.
   *  newcombat('falls')    slice 4c-3: Rock Slide and Flamethrower (now tracking with aimTrack). Both sets: two rings of 8 awake dummies
   *                       at 120 and 240 px, every other one walking faster (45 px/s, the rest 20), so the fixed Rock Slide point,
   *                       the swinging cone and the homing shots show. The overlay prints Rock Slide's wait and the cone's target.
   *  newcombat('emit')     slice 4d: the nine emitters, mines and the trail, one per slot (Discharge, Gust, Fairy Wind, Toxic, Flame Wheel,
   *                       Toxic Spikes, Will-O-Wisp, Meteor Mash, Spikes). Three rings of 8 slow awake dummies (20 px/s) at 90, 170
   *                       and 260 px. Walk around for the Toxic and Flame Wheel trails; stand still to stack Spikes (8 at most).
   *  newcombat('stages')   slice 5a, stat stage trackers: Swords Dance, Leaf Storm, Bug Buzz and String Shot, one per slot, with the
   *                       'persist' rings of slow awake dummies. Watch Swords Dance climb +2 / +4 / +6 at 0 / 6 / 12 s, Leaf Storm's
   *                       Sp. Atk -2 turn -4 at 12 s, a dummy in Bug Buzz's aura lose Sp. Def -1 per 6 s, String Shot give -2 per cast.
   *                       Swap off Swords Dance: the raise holds 6.1 s, then drops; swap back inside that window and it waits for its
   *                       Gate before it casts again.
   *  newcombat('drops')    slice 5a batch re-review: Shadow Ball, Flash Cannon, Psychic, Mud Shot, Bulldoze and Bubble Beam (foe stat
   *                       drops that now climb per Gate). The 'arcs' rings of slow awake dummies; the overlay prints each dummy's stages.
   *  newcombat('cards')    slice 5b team-wide cards: Ember, Razor Leaf, Rock Slide and Substitute, one per slot, with the 'arcs' rings.
   *                       Level up for the team card offer, or grant stacks with G.Debug.cards(id, n).
   *  newcombat('shadow-ball', 'flash-cannon', ...)   any routed move ids, one per slot in the order given, with the same rings. An id that
   *                       is unknown or not on the new path yet is skipped with a warning. One argument that names a set loads the set. */
  const NC_SETS = {
    core: ['tackle', 'ember', 'water-gun', 'hydro-pump', 'heat-wave', 'mud-shot', 'flamethrower'],
    riders: ['body-slam', 'string-shot', 'ice-beam', 'bite', 'psycho-cut', 'giga-drain', 'bulldoze'],
    selfcasts: ['swords-dance', 'dragon-dance', 'aqua-ring', 'substitute'],
    specials: ['dragon-rage', 'hex', 'thunderbolt', 'flamethrower'],
    persist: ['fire-spin', 'leaf-storm', 'night-shade'],
    motion: ['razor-leaf', 'bonemerang', 'quick-attack', 'aerial-ace'],
    arcs: ['vine-whip', 'karate-chop', 'lick', 'metal-claw', 'powder-snow', 'wing-attack', 'bug-bite'],
    novas: ['dazzling-gleam', 'hyper-voice', 'dark-pulse', 'bug-buzz'],
    shots: ['poison-sting', 'rock-throw', 'shadow-ball', 'thunder-shock', 'sludge', 'flash-cannon', 'psybeam'],
    buffs: ['agility', 'harden'],
    extras: ['psychic', 'confusion', 'bubble-beam', 'aura-sphere'],
    falls: ['rock-slide', 'flamethrower'],
    emit: [
      'discharge',
      'gust',
      'fairy-wind',
      'toxic',
      'flame-wheel',
      'toxic-spikes',
      'will-o-wisp',
      'meteor-mash',
      'spikes',
    ],
    stages: ['swords-dance', 'leaf-storm', 'bug-buzz', 'string-shot'],
    drops: ['shadow-ball', 'flash-cannon', 'psychic', 'mud-shot', 'bulldoze', 'bubble-beam'],
    cards: ['ember', 'razor-leaf', 'rock-slide', 'substitute'],
  };
  // slice 4b: lasting major ailments for the Hex dummies (burn and poison through their own counters, the rest as a major status)
  const NC_AIL = {
    burn: (e) => {
      e.burn = 1;
      e.burnLeft = 1e6;
      e.burnTick = 1;
      e.burnMul = 1;
    },
    poison: (e) => {
      e.poison = 1;
      e.poisonLeft = 1e6;
      e.poisonTick = 1;
      e.poisonMul = 1;
    },
    paralysis: (e) => {
      e.stMajor = { k: 'paralysis', t: 1e9, age: 0 };
    },
    sleep: (e) => {
      e.stMajor = { k: 'sleep', t: 1e9, age: 0 };
    },
  };
  function newcombat(...args) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return 0;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) {
      console.warn('[Debug] no run in progress.');
      return 0;
    }
    G.Game.debugMaxed();
    spawn(0);
    // one set name (or none: 'core') loads a set; anything else is a list of move ids, one per slot (slice 5a)
    const named = args.length === 0 || (args.length === 1 && NC_SETS[args[0]]);
    const set = named ? args[0] || 'core' : 'custom';
    let ids = NC_SETS[set];
    if (!named) {
      ids = args.filter((id) => {
        if (!G.MoveDefs[id]) {
          console.warn('[Debug] unknown move id, skipped: ' + id);
          return false;
        }
        if (!G.MoveRoute.routed(id)) {
          console.warn('[Debug] not on the new move path yet, skipped: ' + id);
          return false;
        }
        return true;
      });
      if (!ids.length) {
        console.warn('[Debug] no usable move ids. Sets: ' + Object.keys(NC_SETS).join(', '));
        return 0;
      }
    }
    const riders = set === 'riders' || set === 'selfcasts';
    loadSlots(pl, ids);
    G.MoveRender.overlay = true;
    const def = G.Enemies.defForDex(19, G.Game.time) || G.Enemies.defForDex(16, G.Game.time);
    if (!def) {
      console.warn('[Debug] no enemy definition for the dummies.');
      return 0;
    }
    let n = 0;
    if (set === 'specials') {
      const put = (x, y, ail) => {
        const e = new G.Enemy(Object.assign({}, def, { behavior: 'chase' }), x, y, G.Enemies.scale(G.Game.time));
        e.maxHp = e.hp = 1e9;
        dummyTypes(e);
        e.spd = 20;
        if (ail) NC_AIL[ail](e);
        G.EnemyMgr.add(e);
        n++;
      };
      const a = pl.aim || 0;
      for (let i = 0; i < 6; i++) put(pl.x + Math.cos(a) * (80 + 100 * i), pl.y + Math.sin(a) * (80 + 100 * i));
      const ails = ['burn', 'poison', 'paralysis', 'sleep', 'burn', 'poison', 'paralysis', 'sleep'];
      ails.forEach((k, i) => {
        const b = a + Math.PI / 2 + (i * Math.PI) / 8;
        put(pl.x + Math.cos(b) * 200, pl.y + Math.sin(b) * 200, k);
      });
      console.log(
        '[Debug] new combat test (specials): ' +
          pl.slots.length +
          ' routed moves in slots, ' +
          n +
          ' slow dummies (a line of 6 ahead, 8 with ailments). G.Debug.hitbox() toggles the overlay.'
      );
      return n;
    }
    if (set === 'persist' || set === 'stages') {
      // slice 4c-1: two rings of slow awake dummies, on and just outside the orbits (5a reuses them)
      for (const d of [90, 150])
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + (d === 150 ? Math.PI / 8 : 0);
          const e = new G.Enemy(
            Object.assign({}, def, { behavior: 'chase' }),
            pl.x + Math.cos(a) * d,
            pl.y + Math.sin(a) * d,
            G.Enemies.scale(G.Game.time)
          );
          e.maxHp = e.hp = 1e9;
          dummyTypes(e);
          e.spd = 20;
          G.EnemyMgr.add(e);
          n++;
        }
      console.log(
        '[Debug] new combat test (' +
          set +
          '): ' +
          pl.slots.length +
          ' routed moves in slots, ' +
          n +
          ' slow dummies. ' +
          (set === 'stages'
            ? "The overlay prints every dummy's stages and yours; G.Stages.trackers(G.Game.player) shows the timers."
            : 'Cycle slots or swap Pokemon: the move you leave ends at once, the new one spins up fresh.')
      );
      return n;
    }
    if (
      set === 'arcs' ||
      set === 'novas' ||
      set === 'shots' ||
      set === 'buffs' ||
      set === 'drops' ||
      set === 'custom' ||
      set === 'cards'
    ) {
      // 5a: drops and custom lists reuse these rings     // slice 4r: slow awake dummies in two rings, plus a line ahead for the Thunder Shock hop
      for (const d of [70, 140, 230])
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + (d === 140 ? Math.PI / 8 : 0);
          const e = new G.Enemy(
            Object.assign({}, def, { behavior: 'chase' }),
            pl.x + Math.cos(a) * d,
            pl.y + Math.sin(a) * d,
            G.Enemies.scale(G.Game.time)
          );
          e.maxHp = e.hp = 1e9;
          dummyTypes(e);
          e.spd = 20;
          G.EnemyMgr.add(e);
          n++;
        }
      console.log(
        '[Debug] new combat test (' +
          set +
          '): ' +
          pl.slots.length +
          ' routed moves in slots (' +
          ids.filter((id) => G.MoveRoute.routed(id)).join(', ') +
          '), ' +
          n +
          ' slow dummies. Cycle slots to try each; G.Debug.hitbox() toggles the overlay.'
      );
      return n;
    }
    if (set === 'motion') {
      // slice 4c-2: a loose crowd, near enough for the dashes (range 420) and the bones (210 and 230)
      for (const d of [140, 260])
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 + (d === 260 ? Math.PI / 6 : 0);
          const e = new G.Enemy(
            Object.assign({}, def, { behavior: 'chase' }),
            pl.x + Math.cos(a) * d,
            pl.y + Math.sin(a) * d,
            G.Enemies.scale(G.Game.time)
          );
          e.maxHp = e.hp = 1e9;
          dummyTypes(e);
          e.spd = 20;
          G.EnemyMgr.add(e);
          n++;
        }
      console.log(
        '[Debug] new combat test (motion): ' +
          pl.slots.length +
          ' routed moves in slots, ' +
          n +
          ' slow dummies. Cycle slots: bones out and back, Quick Attack dash and return, Aerial Ace teleport.'
      );
      return n;
    }
    if (set === 'emit') {
      // slice 4d: three rings of slow awake dummies, inside and outside the 300 px turret range
      for (const d of [90, 170, 260])
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + (d === 170 ? Math.PI / 8 : 0);
          const e = new G.Enemy(
            Object.assign({}, def, { behavior: 'chase' }),
            pl.x + Math.cos(a) * d,
            pl.y + Math.sin(a) * d,
            G.Enemies.scale(G.Game.time)
          );
          e.maxHp = e.hp = 1e9;
          dummyTypes(e);
          e.spd = 20;
          G.EnemyMgr.add(e);
          n++;
        }
      console.log(
        '[Debug] new combat test (emit): ' +
          pl.slots.length +
          ' routed moves in slots, ' +
          n +
          ' slow dummies. Cycle slots; walk for the trails, stand still to stack Spikes.'
      );
      return n;
    }
    if (set === 'extras' || set === 'falls') {
      // slice 4c-3: two rings of awake dummies, half of them walking faster
      for (const d of [120, 240])
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + (d === 240 ? Math.PI / 8 : 0);
          const e = new G.Enemy(
            Object.assign({}, def, { behavior: 'chase' }),
            pl.x + Math.cos(a) * d,
            pl.y + Math.sin(a) * d,
            G.Enemies.scale(G.Game.time)
          );
          e.maxHp = e.hp = 1e9;
          dummyTypes(e);
          e.spd = i % 2 ? 45 : 20;
          G.EnemyMgr.add(e);
          n++;
        }
      console.log(
        '[Debug] new combat test (' +
          set +
          '): ' +
          pl.slots.length +
          ' routed moves in slots, ' +
          n +
          ' awake dummies. Cycle slots to try each; G.Debug.hitbox() toggles the overlay.'
      );
      return n;
    }
    for (const d of riders ? [90, 170, 250] : [50, 130, 220])
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + (d === (riders ? 170 : 130) ? Math.PI / 8 : 0);
        const e = new G.Enemy(
          riders ? Object.assign({}, def, { behavior: 'chase' }) : def,
          pl.x + Math.cos(a) * d,
          pl.y + Math.sin(a) * d,
          G.Enemies.scale(G.Game.time)
        );
        e.maxHp = e.hp = 1e9;
        dummyTypes(e);
        if (riders) e.spd = 40;
        else e.stMajor = { k: 'sleep', t: 1e9, age: 0 };
        G.EnemyMgr.add(e);
        n++;
      }
    console.log(
      '[Debug] new combat test (' +
        set +
        '): ' +
        pl.slots.length +
        ' routed moves in slots, ' +
        n +
        (riders ? ' awake' : '') +
        ' dummies. G.Debug.hitbox() toggles the overlay.'
    );
    return n;
  }

  /** The active Pokemon gets the routed moves in `ids`, one per slot, slot 0 active, after the old slots' live shapes, commitments,
   *  heal over time and shield end (as on a Pokemon swap). Shared by newcombat and movechecker. Returns the slot count. */
  function loadSlots(pl, ids) {
    G.MoveSim.clear(pl);
    pl.moves = ids.filter((id) => G.MoveRoute.routed(id)).map((id) => G.Moves.instance(id));
    pl.slots = pl.moves.map((m) => [m]);
    pl.active = 0;
    return pl.slots.length;
  }

  /** Range and move-data check (slice 6, ?dev). G.Debug.movechecker('bubble-beam', 'gust', 300): wild spawns stop and the
   *  live enemies are cleared; up to 6 routed move ids go one per slot (cycle slots to try each); ONE dummy stands at the given
   *  distance to your right (a number argument, default 150 px): awake, so every rider can land and Hex sees no status, but pinned
   *  in place (no walking, no knockback slide), no contact damage, HP that never runs out. The hitbox overlay and the range rings
   *  (every 50 px out to 600, centred on you) turn on, and the console prints each move's effective def (team cards folded in, so
   *  what actually runs) and its override row. G.Debug.movechecker() with no id turns it off: rings off, enemies cleared, spawning
   *  back on (the hitbox overlay stays; G.Debug.hitbox(false) hides it). Returns the number of moves loaded. */
  const MC_MAX = 6,
    MC_DIST = 150;
  let mcOn = false;
  function movechecker(...args) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return 0;
    }
    const pl = G.Game && G.Game.player;
    if (!pl) {
      console.warn('[Debug] no run in progress.');
      return 0;
    }
    const strs = args.filter((a) => typeof a === 'string'),
      nums = args.filter((a) => typeof a === 'number' && a > 0);
    if (!strs.length) {
      G.MoveRender.rings = false;
      if (mcOn) G.EnemyMgr.clear(); // the pinned dummy (wild spawns were stopped, so it is the only enemy)
      mcOn = false;
      spawn(1); // movechecker off
      console.log('[Debug] movechecker off: rings off, dummy removed, spawning back on.');
      return 0;
    }
    let ids = strs.filter((id) => {
      if (!G.MoveDefs[id]) {
        console.warn('[Debug] unknown move id, skipped: ' + id);
        return false;
      }
      if (!G.MoveRoute.routed(id)) {
        console.warn('[Debug] not on the new move path yet, skipped: ' + id);
        return false;
      }
      return true;
    });
    if (!ids.length) {
      console.warn('[Debug] no usable move ids, nothing changed.');
      return 0;
    }
    if (ids.length > MC_MAX) {
      console.warn('[Debug] movechecker takes up to ' + MC_MAX + ' moves; using the first ' + MC_MAX + '.');
      ids = ids.slice(0, MC_MAX);
    }
    const dist = nums.length ? nums[0] : MC_DIST;
    const def = G.Enemies.defForDex(19, G.Game.time) || G.Enemies.defForDex(16, G.Game.time);
    if (!def) {
      console.warn('[Debug] no enemy definition for the dummy.');
      return 0;
    }
    spawn(0); // movechecker start (also flags the run as tampered)
    G.EnemyMgr.clear(); // movechecker start: the dummy is the only target
    const n = loadSlots(pl, ids);
    G.MoveRender.overlay = true;
    G.MoveRender.rings = true;
    const e = new G.Enemy(
      Object.assign({}, def, { behavior: 'chase' }),
      pl.x + dist,
      pl.y,
      G.Enemies.scale(G.Game.time)
    );
    e.maxHp = e.hp = 1e9;
    dummyTypes(e);
    e.spd = 0;
    e.touchCd = Infinity; // no contact damage (combat.js skips an enemy whose contact timer is running)
    const ax = e.x,
      ay = e.y,
      step = e.update;
    e.update = function (dt, p) {
      step.call(this, dt, p);
      this.x = ax;
      this.y = ay;
      this.kx = 0;
      this.ky = 0;
    }; // pinned: no walk, slide or straggler move
    G.EnemyMgr.add(e);
    mcOn = true;
    const fin = (k, v) => (v === Infinity ? 'Infinity' : v === -Infinity ? '-Infinity' : v); // JSON would print Infinity as null
    for (const id of ids) {
      const live = G.TeamCards.defOf(pl, id),
        ov = G.MoveOverrides && G.MoveOverrides[id];
      console.log(
        '[movechecker] ' +
          id +
          ', effective def (what runs, team cards folded in):\n' +
          JSON.stringify(live, fin, 2) +
          (ov
            ? '\n[movechecker] ' + id + ', override row (js/data/move-overrides.js):\n' + JSON.stringify(ov, fin, 2)
            : '\n[movechecker] ' + id + ': no override row.')
      );
    }
    console.log(
      '[Debug] movechecker: ' +
        n +
        ' move(s) in slots (' +
        ids.join(', ') +
        '), 1 pinned dummy ' +
        dist +
        ' px to your right, range rings every 50 px out to 600. Cycle slots to try each; G.Debug.movechecker() turns it off.'
    );
    return n;
  }

  // Convenience hotkey: Shift+D maxes everything (only with ?dev).
  if (on) {
    addEventListener('keydown', (e) => {
      if (
        e.shiftKey &&
        (e.code || '').toLowerCase() === 'keyd' &&
        !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')
      ) {
        e.preventDefault();
        maxAll();
      }
      // Shift+U: toggle maxed per-Pokemon upgrades off/on (to see base-stat values).
      if (
        e.shiftKey &&
        (e.code || '').toLowerCase() === 'keyu' &&
        !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')
      ) {
        e.preventDefault();
        toggleUpgrades();
      }
    });
    console.log('[Debug] enabled (?dev). Press Shift+D or call G.Debug.maxAll() to unlock everything.');
  }

  /** Spawns an overworld elite right now (dev only): 1-minute feel check for the elite slice. */
  function elite() {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    return G.Elites.debugSpawn();
  }

  /** Jumps the run clock to `min` minutes (dev only): enemy level, tiers and elite HP follow the clock. Flags the run as tampered. */
  function skipTo(min) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const t = Math.max(0, +min * 60);
    if (!isFinite(t)) return false;
    G.Game.debugTime(t);
    G.Elites.setClock(t);
    G.Sprites.preload(G.Enemies.upcomingDex(t, 120));
    console.log(
      '[Debug] run clock set to ' +
        Math.floor(t / 60) +
        ':' +
        String(Math.floor(t % 60)).padStart(2, '0') +
        ' (enemy level ' +
        Math.floor(G.Stats.levelForTime(t)) +
        ')'
    );
    return true;
  }

  /** Slice 5b team-wide cards (?dev): G.Debug.cards(id, n) grants n stacks of card `id` to the run's team store (Vitamins as
   *  'vitamins:atk' and so on; an HP Vitamin refreshes every member's max HP). No arguments: prints the store and every card id. */
  function copies(dex) {
    if (!on || !G.DB.save) return false;
    const save = G.DB.save,
      list = G.Copies.all(save).filter((c) => dex == null || c.speciesID === dex);
    console.table(
      list.map((c) => ({
        name: (G.DEX_BY[c.speciesID] || {}).name,
        nickname: c.nickname,
        shiny: c.isShiny,
        gender: c.gender,
        nature: c.nature,
        iv: c.iv.join(' '),
        ability: c.ability,
        height: +c.heightM.toFixed(2),
        weight: +c.weightKg.toFixed(1),
        from: c.obtainedMethod,
        uuid: c.pokemonUUID,
      }))
    );
    console.log(
      '[Debug] ' +
        list.length +
        ' of ' +
        save.box.length +
        ' copies. Box ' +
        JSON.stringify(save.box).length +
        ' bytes, whole save ' +
        JSON.stringify(save).length +
        ' bytes.'
    );
    return list.length;
  }

  function addCopy(dex, n = 1, shiny = false) {
    if (!on || !G.DB.save) return false;
    if (!G.DEX_BY[dex]) {
      console.warn('[Debug] no species with dex ' + dex);
      return false;
    }
    // n copies through the same path the game uses (it also writes the Pokedex record); never sells, it stops at full boxes.
    let added = 0;
    for (let i = 0; i < n && G.Copies.freePlaces(G.DB.save) > 0; i++) {
      G.DB.obtain(dex, !!shiny, 'debug');
      added++;
    }
    G.DB.commit(true);
    console.log(
      '[Debug] added ' +
        added +
        ' ' +
        G.DEX_BY[dex].name +
        (shiny ? ' (shiny)' : '') +
        (added < n ? ' (' + (n - added) + ' not added: your boxes are full)' : '') +
        '. Reopen the Team screen to see them.'
    );
    return true;
  }

  /** Top the boxes up with Caterpie copies until `leave` places are free. ?dev only. Saved. */
  function fillBoxes(leave = 0) {
    if (!on || !G.DB.save) return false;
    const s = G.DB.save,
      want = Math.max(0, Math.floor(+leave) || 0);
    let added = 0;
    while (G.Copies.freePlaces(s) > want) {
      if (!G.DB.obtain(10, false, 'debug').uid) break; // no species data: stop rather than loop
      added++;
    }
    G.DB.commit(true);
    console.log(
      '[Debug] added ' + added + ' Caterpie; ' + G.Copies.freePlaces(s) + ' free places left. Reopen the Team screen.'
    );
    return added;
  }

  /** The active fighter's six stats at its level and its movement px/s, plain (0 IV, 0 EV, no nature) next to this copy. Before
   *  cards, stages and items. ?dev only (pokebox step 4). */
  function fighter() {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    const pl = G.Game && G.Game.player;
    if (!pl || !pl.mon || !pl.mon.stats || !pl.statIv) {
      console.warn('[Debug] no run in progress.');
      return null;
    }
    const st = pl.mon.stats,
      L = pl.level,
      S = G.Stats,
      names = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
    const rows = names.map((stat, i) => {
      const iv = pl.statIv(i),
        ev = pl.statEv(i),
        nat = pl.statNat(i);
      return {
        stat,
        base: st[i],
        iv,
        ev,
        nature: nat > 1 ? '+10%' : nat < 1 ? '-10%' : '',
        plain: i === 0 ? S.hpForLevel(st[0], L) : S.statValue(st[i], L),
        copy: i === 0 ? S.hpForLevel(st[0], L, iv, ev) : S.statValue(st[i], L, iv, ev, nat),
      };
    });
    console.table(rows);
    const px0 = S.speedToPx(st[5]),
      px = S.speedToPx(st[5], pl.statIv(5), pl.statNat(5), pl.statEv(5));
    const move = px0.toFixed(1) + ' -> ' + px.toFixed(1) + ' px/s';
    console.log('[Debug] ' + pl.mon.name + ' L' + L + ', movement ' + move + ' (before cards and items).');
    return { rows, px0, px };
  }

  /** Set THIS run's six EV banks, in EVs (decimals allowed: 3.742), to test the end-of-run allocation. No args: logs them. Flags
   *  the run as tampered; it still allocates (pokebox step 5 F3). ?dev only. */
  function evbank(...v) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    if (!G.Game || !G.Game.player) {
      console.warn('[Debug] no run in progress.');
      return null;
    }
    if (v.length) {
      G.Game.evBank = [0, 1, 2, 3, 4, 5].map((k) => Math.round((+v[k] || 0) * G.Copies.EV_UNIT));
      G.Game.debugMaxed();
    }
    const b = G.Game.evBank.map((x) => x / G.Copies.EV_UNIT);
    console.log('[Debug] EV banks (HP Atk Def SpA SpD Spe): ' + b.map((x) => x.toFixed(3)).join(' '));
    return b;
  }

  /** Set the copy in team slot `slot` (0 to 5) to six IVs of `value` (0 to 31) and, if given, a nature by name. ?dev only. Saved.
   *  Takes effect from the next run, which is flagged tampered (pokebox step 4 feel-tests). */
  function ivs(slot = 0, value = null, nature = null) {
    if (!on || !G.DB.save) return false;
    const s = G.DB.save,
      t = s.team && s.team[slot];
    if (!t || !t.uid) {
      console.warn('[Debug] team slot ' + slot + ' has no Pokemon.');
      return false;
    }
    const c = G.Copies.setIvNature(s, t.uid, value, nature);
    if (!c) {
      console.warn('[Debug] the copy in team slot ' + slot + ' is gone.');
      return false;
    }
    if (c.error) {
      const all = G.SpeciesTraits.NATURES.map((x) => x[0]).join(', ');
      console.warn('[Debug] unknown nature ' + nature + '. Natures: ' + all);
      return false;
    }
    G.DB.commit(true);
    G.Game.debugMaxed();
    const name = (G.DEX_BY[c.speciesID] || {}).name;
    const what = name + ': IVs ' + c.iv.join(' ') + ', ' + c.natureName;
    console.log('[Debug] slot ' + slot + ' ' + what + '. Start a new run to use it.');
    return c;
  }

  function copy(id) {
    if (!on || !G.DB.save) return false;
    const save = G.DB.save;
    let c = null;
    if (typeof id === 'string') c = G.Copies.get(save, id);
    else if (id != null) c = G.Copies.all(save).find((x) => x.speciesID === id) || null;
    else if (save.team[0] && save.team[0].uid) c = G.Copies.get(save, save.team[0].uid);
    if (!c) console.warn('[Debug] no copy found for ' + id);
    else console.log('[Debug] ' + (G.DEX_BY[c.speciesID] || {}).name, c);
    return c;
  }

  function cards(id, n = 1) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return 0;
    }
    const pl = G.Game && G.Game.player,
      s = pl && pl.teamCards;
    if (!s) {
      console.warn('[Debug] no run in progress.');
      return 0;
    }
    const ids = G.TeamCards.CARDS.filter((c) => c.id !== 'vitamins')
      .map((c) => c.id)
      .concat(G.TeamCards.STATS.map((st) => 'vitamins:' + st.id));
    if (id == null) {
      console.table(G.TeamCards.summary(s));
      console.log('[Debug] card ids: ' + ids.join(', '));
      return s.n;
    }
    if (!ids.includes(id)) {
      console.warn('[Debug] unknown card id: ' + id + '. Ids: ' + ids.join(', '));
      return 0;
    }
    G.Game.debugMaxed();
    const k = G.TeamCards.add(s, id, Math.max(1, Math.floor(n)));
    if (id === 'vitamins:hp') for (const f of G.Game.roster || [pl]) if (f.refreshMaxHp) f.refreshMaxHp();
    console.log('[Debug] ' + id + ' now x' + k + ' (team-wide). G.Debug.cards() lists the store.');
    return k;
  }

  /** Queues n level-ups (dev only; flags the run as tampered). */
  function levelUp(n = 1) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    for (let i = 0; i < n; i++) G.Game.debugLevelUp();
    return true;
  }

  /** Opens the next gym gate now (dev only), or gym n's (1 is the first) when n is given. Enter it to fight; a loss ends the run. */
  function gym(n) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    G.Gym.debugOpen(n);
    return true;
  }

  /** In a switched gym's fight (dev only): the leader's AI player asks to swap to team slot `slot` (1 is the first). Your swap rules
   *  decide it on the next frame: refused while locked, trapped or in the air, as yours (LEADER-AI slice 1). */
  function leaderSwap(slot) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const ai = G.GymArena.leaderAI;
    if (!ai) {
      console.warn('[Debug] no switched gym fight is running (Misty or Brock).');
      return false;
    }
    ai.requestSwap(slot - 1);
    return true;
  }

  /** Dev only (Leader AI slice 2): turn the leader AI's own swap or dodge decisions on or off, for every fight from now on. With no
   *  argument it prints the switches and, in a fight, the AI player's last decisions. */
  function leaderAI(opts) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const off = G.LeaderAI.off;
    if (opts) {
      if (opts.swaps != null) off.swaps = !opts.swaps;
      if (opts.dodges != null) off.dodges = !opts.dodges;
    }
    const ai = G.GymArena.leaderAI;
    console.log('[LeaderAI] swaps ' + (off.swaps ? 'off' : 'on') + ', dodges ' + (off.dodges ? 'off' : 'on'));
    if (ai) for (const d of ai.log.slice(-12)) console.log('  ' + d.t.toFixed(2) + ' s  ' + d.act + ': ' + d.text);
    return { swaps: !off.swaps, dodges: !off.dodges };
  }

  /** Place a Move Trainer and a TM Mart now (dev only), by the normal placement rules. */
  function shops() {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    if (!G.Game.player) {
      console.warn('[Debug] start a run first.');
      return false;
    }
    const ok = G.Shops.debugPlace();
    console.log(
      ok ? '[Debug] Move Trainer and TM Mart placed, follow the red arrows' : '[Debug] no free ground found, try again'
    );
    return ok;
  }

  /** Open a shop screen now (dev only): 'trainer' or 'mart', fresh stock, no building. */
  function openShopNow(kind) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    if (!G.Game.player) {
      console.warn('[Debug] start a run first.');
      return false;
    }
    const ok = G.Shops.debugOpen(kind);
    if (!ok) console.warn('[Debug] close the open screen (pause, level-up, item, bond) and try again.');
    return ok;
  }
  function trainer() {
    return openShopNow('trainer');
  }
  function mart() {
    return openShopNow('mart');
  }

  return {
    on,
    elite,
    skipTo,
    levelUp,
    gym,
    leaderSwap,
    leaderAI,
    shops,
    trainer,
    mart,
    maxAll,
    clearUpgrades,
    toggleUpgrades,
    give,
    ground,
    item,
    runitem,
    runslots,
    coins,
    silver,
    tickets,
    unlockitem,
    loadout,
    ignite,
    status,
    stage,
    flinch,
    statusSelf,
    carrier,
    spawn,
    noSpawn,
    spawnOn,
    hitbox,
    copies,
    copy,
    addCopy,
    fillBoxes,
    fighter,
    ivs,
    evbank,
    newcombat,
    cards,
    movechecker,
  };
})();
