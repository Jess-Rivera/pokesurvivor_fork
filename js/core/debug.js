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

  return { on, elite, skipTo, levelUp, gym, maxAll, clearUpgrades, toggleUpgrades, give, ground, item, runitem, runslots, unlockitem, loadout, stack, stat, ignite, status, stage, flinch, statusSelf, carrier, spawn, noSpawn, spawnOn };
})();
