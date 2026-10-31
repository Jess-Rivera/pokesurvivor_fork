/* ============ debug.js — developer sandbox (only with ?dev) ============
 * Gated behind the ?dev URL flag (same flag the maintenance bypass uses).
 * Without ?dev, every method is a no-op, so this is inert in the published
 * game unless a developer explicitly opts in.
 *
 *   G.Debug.maxAll()   unlock every Pokemon + shiny, max coins/tickets,
 *                      and max every per-Pokemon upgrade. Writes to the
 *                      current save (local or guest).
 *   G.Debug.give(id)   give the active Pokemon a move; G.Debug.stack(mechId, n, moveId) adds upgrade stacks
 *   G.Debug.ground(id) drop a ground item above you, outside pickup range but on screen (no id: logs every id; ids in data/ground-items.js, e.g. 'x-attack', 'sitrus', 'occa', 'pinap')
 *   G.Debug.item(id[, force])   give a Pokemon-tier held item through the real pickup path, chooser included (force=true equips directly; no id: logs every pokemon-tier id; ids in data/items.js, e.g. 'leftovers', 'scopelens', 'expertbelt')
 *   G.Debug.unlockitem(id|'all') unlock a team item for the pre-run loadout (no id: logs the ids). Saved.
 *   G.Debug.loadout(id, id, ...) set the pre-run loadout directly (cleaned: unlocked only, one Stone, within your slots). No ids: logs it. Saved.
 *   G.Debug.coins(n)   set your PokeCoins to n (no arg: logs the balance). Saved. For testing Shop prices.
 *   G.Debug.runslots(n) set how many run-item slots this save has unlocked (1 to 4; no arg: logs the current count). Saved.
 *   G.Debug.runitem(id[, force]) give a run-tier item through the real pickup path, chooser included (force=true equips on the team directly, ignoring slot limits; no id: logs every run-tier id; e.g. 'snowballbadge', 'redo', 'firestone', 'sharpscissors')
 *   G.Game.debugLevelUp()  queue a level-up now (already exists)
 *   G.Debug.elite()    spawn an overworld elite now (watch the HP bar, enrage timer and the [Elite] TTK line in the console)
 *   G.Debug.skipTo(m)  jump the run clock to m minutes (enemy level and elite HP follow it; the run is flagged tampered)
 *   G.Debug.levelUp(n) queue n level-ups (same as calling G.Game.debugLevelUp() n times)
 *   G.Debug.gym()      open the next gym gate now (walk into it to fight; losing ends the run)
 *   G.Debug.status(kind, radius)  put burn|poison|toxic|paralysis|freeze|sleep|confusion|trap on every enemy near you (ignite is the same)
 *   G.Debug.statusSelf(kind)      put one of those statuses on the ACTIVE Pokemon (to feel what a hit would do)
 *   G.Debug.carrier(kind, n)       spawn n Status-class carriers of that status (slow|daze|paralysis|confusion|poison|trap|freeze|haste|sleep) just inside the view, to check the cap of 2, the close band and what a hit does
 *   G.Debug.flinch(radius)         flinch every enemy near you (lose the action; moving ones recoil half a sprite radius back, then stop 0.2 to 0.3 s)
 *   G.Debug.stage(stat, n, radius)  stat stage on every enemy near you: spe|def|spd|atk|spa, n = -1 (6 s each; repeat to stack, +-6 max)
 *   G.Debug.spawn(k)   scale ALL wild spawns by k: 0 stops them (drip, tides, bursts, elites), 0.5 halves, 1 or no argument is normal again
 *   G.Debug.noSpawn() / spawnOn()  shortcuts for spawn(0) / spawn(1)
 *   G.Debug.on         true when ?dev is present.
 *
 * Any run played after maxAll() is flagged tampered via G.Game.debugMaxed(),
 * so a debug sandbox can never post a score to the ranking.
 */
G.Debug = (() => {
  const on = /[?&]dev\b/.test(location.search);

  function maxAll() {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const save = G.DB.save;
    if (!save) { console.warn('[Debug] no active save — log in or play as guest first.'); return false; }

    // Every Pokemon owned + shiny.
    let dexN = 0;
    for (const p of G.DEX) {
      G.DB.grant(p.dex, 'debug');
      G.DB.grantShiny(p.dex, 'debug');
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
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const save = G.DB.save;
    if (!save) { console.warn('[Debug] no active save.'); return false; }
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
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const save = G.DB.save;
    if (!save) { console.warn('[Debug] no active save.'); return false; }
    let anyUp = false;
    for (const p of G.DEX) {
      const u = G.DB.upgradesOf(p.dex);
      for (const up of G.Upgrades.LIST) if ((u[up.id] || 0) > 0) { anyUp = true; break; }
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
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    if (!id) { const ids = G.Grounds.LIST.map(i => i.id).concat(['pokeball', 'masterball']); console.log('[Debug] ground ids: ' + ids.join(', ')); return ids; }
    const BALL = { pokeball: 'ticket', masterball: 'ticket10' };      // gacha tickets: drawn as a Great Ball (x1) and a Master Ball (x10)
    if (BALL[id]) {
      const p = G.Game.player;
      if (!p) return false;
      G.Game.debugMaxed();
      G.Pickups.drop(BALL[id], p.x + G.U.rand(-160, 160), p.y - Math.min(260, (p.magnet || 80) + 90), 1);
      return true;
    }
    if (!G.Grounds.BY[id]) { console.warn('[Debug] unknown ground item ' + id); return false; }
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
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const ids = G.Items.LIST.filter(i => i.tier === 'pokemon').map(i => i.id);
    if (!id) { console.log('[Debug] pokemon item ids: ' + ids.join(', ')); return ids; }
    if (!G.Items.BY[id] || G.Items.BY[id].tier !== 'pokemon') { console.warn('[Debug] unknown pokemon-tier item ' + id); return false; }
    const pl = G.Game && G.Game.player;
    if (!pl) return false;
    if (force) pl.equip(id);                       // bypass: no chooser
    else { G.Game.offerItem(id); return true; }         // the real pickup path (chooser when the Pokemon already holds one)
    if (G.Spawner && G.Spawner.say) G.Spawner.say(pl.mon.name + ' got ' + G.Items.BY[id].name + '!', 2.2, true);
    return true;
  }

  /** Run-tier item `id` through the REAL pickup path (G.Game.offerItem): free slot = equipped, full grid or Stone clash = the chooser. Pass force=true to equip on the team directly (ignores slot limits, no chooser). With no id, logs and returns the run-tier ids. ?dev only. */
  function runitem(id, force) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const ids = G.Items.LIST.filter(i => i.tier === 'run').map(i => i.id);
    if (!id) { console.log('[Debug] run item ids: ' + ids.join(', ')); return ids; }
    if (!G.Items.BY[id] || G.Items.BY[id].tier !== 'run') { console.warn('[Debug] unknown run-tier item ' + id); return false; }
    if (!(G.Game && G.Game.equipRun)) return false;
    if (!force) { G.Game.offerItem(id); return true; }
    G.Game.equipRun(id);
    if (G.Spawner && G.Spawner.say) G.Spawner.say('Picked up ' + G.Items.BY[id].name + '!', 2.2, true);
    return true;
  }

  /** Set PokeCoins to `n` (or log the balance). ?dev only. */
  function coins(n) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const s = G.DB && G.DB.save;
    if (!s) { console.warn('[Debug] no save loaded.'); return false; }
    if (n != null) { s.coins = Math.max(0, Math.floor(+n) || 0); G.DB.commit(); if (G.UI && G.UI.refreshCoins) G.UI.refreshCoins(); }
    console.log('[Debug] PokeCoins: ' + s.coins);
    return s.coins;
  }

  /** Unlock `n` run-item slots (1 to 4) on this save, or log the current count. ?dev only. Saved (save.runSlots, absent in old saves = 1). */
  function runslots(n) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const s = G.DB && G.DB.save;
    if (!s) { console.warn('[Debug] no save loaded.'); return false; }
    if (n == null) { const cur = G.Items.runSlots(s); console.log('[Debug] run slots: ' + cur); return cur; }
    s.runSlots = Math.max(G.Items.RUN_SLOTS_DEFAULT, Math.min(G.Items.RUN_SLOTS_MAX, Math.floor(+n) || 1));
    G.DB.commit();
    console.log('[Debug] run slots set to ' + s.runSlots);
    return s.runSlots;
  }

  /** Unlock a team item (or 'all') on this save for the pre-run loadout. ?dev only. */
  function unlockitem(id) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const ids = G.Items.LIST.filter(i => i.tier === 'run').map(i => i.id), s = G.DB.save;
    if (!id) { console.log('[Debug] team item ids: ' + ids.join(', ')); return ids; }
    const list = id === 'all' ? ids : [id];
    let n = 0;
    for (const x of list) {
      if (!G.Items.BY[x] || G.Items.BY[x].tier !== 'run') { console.warn('[Debug] unknown team item ' + x); continue; }
      if (G.Items.unlock(s, x, 'debug')) n++;
    }
    G.DB.commit();
    console.log('[Debug] unlocked ' + n + ' new team item(s); total ' + Object.keys(s.teamItems).length);
    return n;
  }

  /** Set the pre-run loadout directly. ?dev only. */
  function loadout(...ids) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const s = G.DB.save;
    if (ids.length) { s.teamLoadout = ids; G.Items.cleanLoadout(s); G.DB.commit(); }
    console.log('[Debug] loadout: ' + (s.teamLoadout.join(', ') || '(empty)') + '  (slots: ' + G.Items.runSlots(s) + ')');
    return s.teamLoadout.slice();
  }

  function give(id) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const pl = G.Game && G.Game.player;
    if (!pl || !G.Moves.BY_ID[id]) { console.warn('[Debug] no run in progress, or unknown move id.'); return false; }
    G.Game.debugMaxed();
    return pl.addMove(id);
  }

  /** Put `n` stacks of mechanic `mechId` on a move of the active Pokemon (default: its first move).
   *  Returns how many were accepted. Flags the run as tampered. ?dev only. */
  function stack(mechId, n = 1, moveId) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    const pl = G.Game && G.Game.player;
    const m = pl && (moveId ? pl.moves.find(x => x.id === moveId) : pl.moves[0]);
    if (!m) { console.warn('[Debug] no such move on the active Pokemon.'); return 0; }
    G.Game.debugMaxed();
    let k = 0;
    for (let i = 0; i < n; i++) if (G.Moves.addStack(m, mechId)) k++;
    return k;
  }

  /** Put a status on every enemy around the active Pokemon, for a one-minute check of the DoT numbers:
   *  G.Debug.ignite('burn' | 'poison' | 'toxic', radius = 600). Then G.Log.print(30) shows the DOT lines with % of max HP.
   *  Returns how many enemies were in range. Flags the run as tampered. ?dev only. */
  function status(kind = 'burn', radius = 600) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    const pl = G.Game && G.Game.player;
    if (!pl) { console.warn('[Debug] no run in progress.'); return 0; }
    G.Game.debugMaxed();
    const list = G.EnemyMgr.queryCircle(pl.x, pl.y, radius);
    for (const e of list) {
      if (e.remote) continue;
      if (kind === 'burn') e.applyBurn(1);
      else if (kind === 'toxic') e.applyPoison(2);
      else if (kind === 'poison') e.applyPoison(1);
      else if (G.Status.isControl(kind)) e.applyStatus(kind);
      else { console.warn('[Debug] unknown status: ' + kind); return 0; }
    }
    return list.length;
  }
  const ignite = status;

  /** Flinch check (slice D2): G.Debug.flinch(radius = 600) flinches every enemy near you (they lose their action; the moving ones recoil). ?dev only. */
  function flinch(radius = 600) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    const pl = G.Game && G.Game.player;
    if (!pl) { console.warn('[Debug] no run in progress.'); return 0; }
    G.Game.debugMaxed();
    let n = 0;
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, radius)) if (e.applyFlinch && e.applyFlinch()) n++;
    return n;
  }

  /** Stat stage check (slice D1): G.Debug.stage('spe' | 'def' | 'spd' | 'atk' | 'spa', n = -1, radius = 600) puts one application of n stages
   *  (6 s, then it expires) on every enemy near you. Call it several times to stack (clamped to +-6). Returns how many enemies were hit. ?dev only. */
  function stage(stat = 'spe', n = -1, radius = 600) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    const pl = G.Game && G.Game.player;
    if (!pl) { console.warn('[Debug] no run in progress.'); return 0; }
    if (!G.Stages.STATS.includes(stat)) { console.warn('[Debug] unknown stat: ' + stat); return 0; }
    G.Game.debugMaxed();
    const list = G.EnemyMgr.queryCircle(pl.x, pl.y, radius);
    for (const e of list) if (!e.remote) G.Stages.add(e, stat, n, G.Stages.DUR);
    return list.length;
  }

  /** The same statuses on the active Pokemon. Returns the result ('ok' | 'refresh' | 'immune' | 'blocked' | 'window'). Flags the run as tampered. ?dev only. */
  function statusSelf(kind = 'burn') {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return null; }
    const pl = G.Game && G.Game.player;
    if (!pl) { console.warn('[Debug] no run in progress.'); return null; }
    G.Game.debugMaxed();
    if (kind === 'burn' || kind === 'poison' || kind === 'toxic') return G.Status.applyDot(pl, kind);
    if (kind === 'slow') { G.Stages.add(pl, 'spe', -1, G.Enemies.CARRIER.dur.slow); return 'ok'; }
    if (G.Status.isControl(kind)) return G.Status.apply(pl, kind);
    console.warn('[Debug] unknown status: ' + kind);
    return null;
  }

  /** Spawn n Status-class carriers of `kind` around you (slice E1). Primary Status species only, picked at random. Flags the run as tampered. ?dev only. */
  function carrier(kind = 'paralysis', n = 4) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    const pl = G.Game && G.Game.player;
    if (!pl) { console.warn('[Debug] no run in progress.'); return 0; }
    const dexes = Object.keys(G.Enemies.CARRIER_OF).map(Number).filter(d => G.Enemies.CARRIER_OF[d] === kind && G.Enemies.classOf(G.DEX_BY[d]) === 'status');
    if (!dexes.length) { console.warn('[Debug] no primary Status species for "' + kind + '".'); return 0; }
    G.Game.debugMaxed();
    let made = 0;
    for (let i = 0; i < n; i++) {
      const def = G.Enemies.defForDex(G.U.pick(dexes), G.Game.time), a = (i / n) * 6.2832 + Math.random() * 0.4;
      if (!def) continue;
      G.EnemyMgr.add(new G.Enemy(def, pl.x + Math.cos(a) * 380, pl.y + Math.sin(a) * 380, G.Enemies.scale(G.Game.time)));
      made++;
    }
    return made;
  }

  /** Scale every wild spawn by k (0 = none: drip, tides, bursts and elites all stop; 1 = normal). Enemies already alive stay. Flags the run as tampered. ?dev only. */
  function spawn(k = 1) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return null; }
    if (G.Game && G.Game.debugMaxed) G.Game.debugMaxed();
    const v = G.Spawner.debugRate(k);
    console.log('[Debug] spawn rate x' + v + (v === 0 ? ' (spawning stopped; G.Debug.spawnOn() resumes)' : ''));
    return v;
  }
  const noSpawn = () => spawn(0);
  const spawnOn = () => spawn(1);

  /** New move system hitbox overlay (slice 3d): G.Debug.hitbox() toggles, hitbox(true|false) sets. Needs ?dev&newcombat. */
  function hitbox(v) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return null; }
    if (!G.MoveRoute.on) { console.warn('[Debug] add &newcombat to the URL (with ?dev) for the new move system.'); return null; }
    G.MoveRender.overlay = v == null ? !G.MoveRender.overlay : !!v;
    return G.MoveRender.overlay;
  }

  /** New move system quick test (slice 3d, ?dev&newcombat): a set of routed moves, one per slot (cycle slots to try each), wild spawns
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
 *                       Gate before it casts again. */
  const NC_SETS = { core: ['tackle', 'ember', 'water-gun', 'hydro-pump', 'heat-wave', 'mud-shot', 'flamethrower'],
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
    emit: ['discharge', 'gust', 'fairy-wind', 'toxic', 'flame-wheel', 'toxic-spikes', 'will-o-wisp', 'meteor-mash', 'spikes'],
    stages: ['swords-dance', 'leaf-storm', 'bug-buzz', 'string-shot'] };
  // slice 4b: lasting major ailments for the Hex dummies (burn and poison through their own counters, the rest as a major status)
  const NC_AIL = {
    burn: e => { e.burn = 1; e.burnLeft = 1e6; e.burnTick = 1; e.burnMul = 1; },
    poison: e => { e.poison = 1; e.poisonLeft = 1e6; e.poisonTick = 1; e.poisonMul = 1; },
    paralysis: e => { e.stMajor = { k: 'paralysis', t: 1e9, age: 0 }; },
    sleep: e => { e.stMajor = { k: 'sleep', t: 1e9, age: 0 }; }
  };
  function newcombat(set = 'core') {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    if (!G.MoveRoute.on) { console.warn('[Debug] add &newcombat to the URL (with ?dev) for the new move system.'); return 0; }
    const pl = G.Game && G.Game.player;
    if (!pl) { console.warn('[Debug] no run in progress.'); return 0; }
    G.Game.debugMaxed();
    spawn(0);
    G.Projectiles.clearOrbs(pl);
    const ids = NC_SETS[set];
    if (!ids) { console.warn('[Debug] newcombat sets: ' + Object.keys(NC_SETS).join(', ')); return 0; }
    const riders = set === 'riders' || set === 'selfcasts';
    G.MoveSim.clear(pl);     // the old set's live shapes, commitments, heal over time and shield end, as on a Pokemon swap
    pl.moves = ids.filter(id => G.MoveRoute.routed(id)).map(id => G.Moves.instance(id));
    pl.slots = pl.moves.map(m => [m]);
    pl.active = 0;
    G.MoveRender.overlay = true;
    const def = G.Enemies.defForDex(19, G.Game.time) || G.Enemies.defForDex(16, G.Game.time);
    if (!def) { console.warn('[Debug] no enemy definition for the dummies.'); return 0; }
    let n = 0;
    if (set === 'specials') {
      const put = (x, y, ail) => {
        const e = new G.Enemy(Object.assign({}, def, { behavior: 'chase' }), x, y, G.Enemies.scale(G.Game.time));
        e.maxHp = e.hp = 1e9; e.spd = 20;
        if (ail) NC_AIL[ail](e);
        G.EnemyMgr.add(e);
        n++;
      };
      const a = pl.aim || 0;
      for (let i = 0; i < 6; i++) put(pl.x + Math.cos(a) * (80 + 100 * i), pl.y + Math.sin(a) * (80 + 100 * i));
      const ails = ['burn', 'poison', 'paralysis', 'sleep', 'burn', 'poison', 'paralysis', 'sleep'];
      ails.forEach((k, i) => { const b = a + Math.PI / 2 + i * Math.PI / 8; put(pl.x + Math.cos(b) * 200, pl.y + Math.sin(b) * 200, k); });
      console.log('[Debug] new combat test (specials): ' + pl.slots.length + ' routed moves in slots, ' + n + ' slow dummies (a line of 6 ahead, 8 with ailments). G.Debug.hitbox() toggles the overlay.');
      return n;
    }
    if (set === 'persist' || set === 'stages') {     // slice 4c-1: two rings of slow awake dummies, on and just outside the orbits (5a reuses them)
      for (const d of [90, 150]) for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + (d === 150 ? Math.PI / 8 : 0);
        const e = new G.Enemy(Object.assign({}, def, { behavior: 'chase' }), pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, G.Enemies.scale(G.Game.time));
        e.maxHp = e.hp = 1e9; e.spd = 20;
        G.EnemyMgr.add(e);
        n++;
      }
      console.log('[Debug] new combat test (' + set + '): ' + pl.slots.length + ' routed moves in slots, ' + n + ' slow dummies. ' + (set === 'stages' ? 'The overlay prints every dummy\'s stages and yours; G.Stages.trackers(G.Game.player) shows the timers.' : 'Cycle slots or swap Pokemon: the move you leave ends at once, the new one spins up fresh.'));
      return n;
    }
    if (set === 'arcs' || set === 'novas' || set === 'shots' || set === 'buffs') {     // slice 4r: slow awake dummies in two rings, plus a line ahead for the Thunder Shock hop
      for (const d of [70, 140, 230]) for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + (d === 140 ? Math.PI / 8 : 0);
        const e = new G.Enemy(Object.assign({}, def, { behavior: 'chase' }), pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, G.Enemies.scale(G.Game.time));
        e.maxHp = e.hp = 1e9; e.spd = 20;
        G.EnemyMgr.add(e);
        n++;
      }
      console.log('[Debug] new combat test (' + set + '): ' + pl.slots.length + ' routed moves in slots, ' + n + ' slow dummies. Cycle slots to try each; G.Debug.hitbox() toggles the overlay.');
      return n;
    }
    if (set === 'motion') {     // slice 4c-2: a loose crowd, near enough for the dashes (range 420) and the bones (210 and 230)
      for (const d of [140, 260]) for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + (d === 260 ? Math.PI / 6 : 0);
        const e = new G.Enemy(Object.assign({}, def, { behavior: 'chase' }), pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, G.Enemies.scale(G.Game.time));
        e.maxHp = e.hp = 1e9; e.spd = 20;
        G.EnemyMgr.add(e);
        n++;
      }
      console.log('[Debug] new combat test (motion): ' + pl.slots.length + ' routed moves in slots, ' + n + ' slow dummies. Cycle slots: bones out and back, Quick Attack dash and return, Aerial Ace teleport.');
      return n;
    }
    if (set === 'emit') {     // slice 4d: three rings of slow awake dummies, inside and outside the 300 px turret range
      for (const d of [90, 170, 260]) for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + (d === 170 ? Math.PI / 8 : 0);
        const e = new G.Enemy(Object.assign({}, def, { behavior: 'chase' }), pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, G.Enemies.scale(G.Game.time));
        e.maxHp = e.hp = 1e9; e.spd = 20;
        G.EnemyMgr.add(e);
        n++;
      }
      console.log('[Debug] new combat test (emit): ' + pl.slots.length + ' routed moves in slots, ' + n + ' slow dummies. Cycle slots; walk for the trails, stand still to stack Spikes.');
      return n;
    }
    if (set === 'extras' || set === 'falls') {     // slice 4c-3: two rings of awake dummies, half of them walking faster
      for (const d of [120, 240]) for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + (d === 240 ? Math.PI / 8 : 0);
        const e = new G.Enemy(Object.assign({}, def, { behavior: 'chase' }), pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, G.Enemies.scale(G.Game.time));
        e.maxHp = e.hp = 1e9; e.spd = i % 2 ? 45 : 20;
        G.EnemyMgr.add(e);
        n++;
      }
      console.log('[Debug] new combat test (' + set + '): ' + pl.slots.length + ' routed moves in slots, ' + n + ' awake dummies. Cycle slots to try each; G.Debug.hitbox() toggles the overlay.');
      return n;
    }
    for (const d of riders ? [90, 170, 250] : [50, 130, 220]) for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + (d === (riders ? 170 : 130) ? Math.PI / 8 : 0);
      const e = new G.Enemy(riders ? Object.assign({}, def, { behavior: 'chase' }) : def, pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, G.Enemies.scale(G.Game.time));
      e.maxHp = e.hp = 1e9;
      if (riders) e.spd = 40;
      else e.stMajor = { k: 'sleep', t: 1e9, age: 0 };
      G.EnemyMgr.add(e);
      n++;
    }
    console.log('[Debug] new combat test (' + set + '): ' + pl.slots.length + ' routed moves in slots, ' + n + (riders ? ' awake' : '') + ' dummies. G.Debug.hitbox() toggles the overlay.');
    return n;
  }

  /** Give `n` stat cards (`hp|atk|def|spa|spd|spe`) to roster member `idx` (default: the active Pokemon). ?dev only. */
  function stat(id, n = 1, idx) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    const g = G.Game, f = idx != null ? g.roster[idx] : g.player;
    if (!f) { console.warn('[Debug] no such Pokemon.'); return 0; }
    g.debugMaxed();
    let k = 0;
    for (let i = 0; i < n; i++) if (f.addStat(id)) k++;
    return k;
  }

  // Convenience hotkey: Shift+D maxes everything (only with ?dev).
  if (on) {
    addEventListener('keydown', e => {
      if (e.shiftKey && (e.code || '').toLowerCase() === 'keyd' && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault();
        maxAll();
      }
      // Shift+U: toggle maxed per-Pokemon upgrades off/on (to see base-stat values).
      if (e.shiftKey && (e.code || '').toLowerCase() === 'keyu' && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault();
        toggleUpgrades();
      }
    });
    console.log('[Debug] enabled (?dev). Press Shift+D or call G.Debug.maxAll() to unlock everything.');
  }

  /** Spawns an overworld elite right now (dev only): 1-minute feel check for the elite slice. */
  function elite() {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return null; }
    return G.Elites.debugSpawn();
  }

  /** Jumps the run clock to `min` minutes (dev only): enemy level, tiers and elite HP follow the clock. Flags the run as tampered. */
  function skipTo(min) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    const t = Math.max(0, +min * 60);
    if (!isFinite(t)) return false;
    G.Game.debugTime(t);
    G.Elites.setClock(t);
    G.Sprites.preload(G.Enemies.upcomingDex(t, 120));
    console.log('[Debug] run clock set to ' + Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + ' (enemy level ' + Math.floor(G.Stats.levelForTime(t)) + ')');
    return true;
  }

  /** Queues n level-ups (dev only; flags the run as tampered). */
  function levelUp(n = 1) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    for (let i = 0; i < n; i++) G.Game.debugLevelUp();
    return true;
  }

  /** Opens the next gym gate now (dev only). Enter it to fight; a loss ends the run. */
  function gym() {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return false; }
    G.Gym.debugOpen();
    return true;
  }

  return { on, elite, skipTo, levelUp, gym, maxAll, clearUpgrades, toggleUpgrades, give, ground, item, runitem, runslots, coins, unlockitem, loadout, stack, stat, ignite, status, stage, flinch, statusSelf, carrier, spawn, noSpawn, spawnOn, hitbox, newcombat };
})();
