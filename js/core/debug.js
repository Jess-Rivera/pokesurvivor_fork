/* ============ debug.js — developer sandbox (only with ?dev) ============
 * Gated behind the ?dev URL flag (same flag the maintenance bypass uses).
 * Without ?dev, every method is a no-op, so this is inert in the published
 * game unless a developer explicitly opts in.
 *
 *   G.Debug.maxAll()   unlock every Pokemon + shiny, max coins/tickets,
 *                      and max every per-Pokemon upgrade. Writes to the
 *                      current save (local or guest).
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

  return { on, maxAll, clearUpgrades, toggleUpgrades };
})();
