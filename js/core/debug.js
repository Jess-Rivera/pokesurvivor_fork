/* ============ debug.js — developer sandbox (only with ?dev) ============
 * Gated behind the ?dev URL flag (same flag the maintenance bypass uses).
 * Without ?dev, every method is a no-op, so this is inert in the published
 * game unless a developer explicitly opts in.
 *
 *   G.Debug.maxAll()   unlock every Pokemon + shiny, max coins/tickets,
 *                      and max every per-Pokemon upgrade. Writes to the
 *                      current save (local or guest).
 *   G.Debug.give(id)   give the active Pokemon a move; G.Debug.stack(mechId, n, moveId) adds upgrade stacks
 *   G.Game.debugLevelUp()  queue a level-up now (already exists)
 *   G.Debug.elite()    spawn an overworld elite now (watch the HP bar, enrage timer and the [Elite] TTK line in the console)
 *   G.Debug.skipTo(m)  jump the run clock to m minutes (enemy level and elite HP follow it; the run is flagged tampered)
 *   G.Debug.levelUp(n) queue n level-ups (same as calling G.Game.debugLevelUp() n times)
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
  function ignite(kind = 'burn', radius = 600) {
    if (!on) { console.warn('[Debug] add ?dev to the URL to enable debug tools.'); return 0; }
    const pl = G.Game && G.Game.player;
    if (!pl) { console.warn('[Debug] no run in progress.'); return 0; }
    G.Game.debugMaxed();
    const list = G.EnemyMgr.queryCircle(pl.x, pl.y, radius);
    for (const e of list) {
      if (e.remote) continue;
      if (kind === 'burn') e.applyBurn(1);
      else if (kind === 'toxic') e.applyPoison(2);
      else e.applyPoison(1);
    }
    return list.length;
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

  return { on, elite, skipTo, levelUp, maxAll, clearUpgrades, toggleUpgrades, give, stack, stat, ignite };
})();
