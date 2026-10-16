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

  // Convenience hotkey: Shift+D maxes everything (only with ?dev).
  if (on) {
    addEventListener('keydown', e => {
      if (e.shiftKey && (e.code || '').toLowerCase() === 'keyd' && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault();
        maxAll();
      }
    });
    console.log('[Debug] enabled (?dev). Press Shift+D or call G.Debug.maxAll() to unlock everything.');
  }

  return { on, maxAll };
})();
