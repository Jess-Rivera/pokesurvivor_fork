/* ============ updater.js — automatic updates ============
 * When a new version is published (node tools/build.js writes version.json with
 * the fingerprint of js/app.min.js), every player receives it without losing anything:
 *
 *   - Every 5 min (and on returning to the tab) version.json is checked (served
 *     by GitHub Pages: it costs nothing).
 *   - If NOT in a game: a "updating in 5 s…" notice and it reloads.
 *     If in the gacha, the upgrade shop, the settings or typing in
 *     a field, it waits until done. In a co-op room, it reloads
 *     anyway (decision of 2026-10-12).
 *   - If IN A GAME: it is not touched. On finishing, the run is saved as
 *     always (records, coins, tickets, ranking) and, on returning to the menu, it
 *     reloads.
 *   - Before reloading it waits for the saved game to upload to the cloud
 *     (a few seconds at most; otherwise it stays in this browser and uploads on
 *     entering).
 * It only works on the published site (with app.min.js); in dev.html or by
 * double-click (file://) it does nothing.
 */
G.Updater = (() => {
  const EVERY = 5 * 60 * 1000, COUNTDOWN = 5;
  const tag = document.querySelector('script[src*="app.min.js?v="]');
  const mine = tag ? (tag.getAttribute('src').match(/v=([0-9a-f]+)/) || [])[1] : null;
  let pending = false, lastCheck = 0, timer = 0, counting = false;

  async function check() {
    if (!mine || pending) return;
    lastCheck = Date.now();
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (j && j.v && j.v !== mine) { pending = true; console.log('[Update] new version', j.v, '(this is', mine + ')'); }
    } catch (e) { /* no network: checked next time */ }
  }

  /** Can it reload now without interrupting anything? */
  function safe() {
    if (!G.Game || G.Game.state !== 'ui') return false;                   // in a game or on the summary
    if (['scr-gacha', 'scr-upgrades', 'scr-settings'].some(id => document.getElementById(id) && G.UI.isOpen(id))) return false;
    const fx = document.getElementById('pull-fx');
    if (fx && !fx.classList.contains('hidden')) return false;             // gacha pull in progress
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;   // typing (password, nickname...)
    return true;
  }

  async function reload() {
    // Let the saved data upload to the cloud before reloading (6 s at most).
    const dirty = G.DB.syncState && G.DB.syncState !== 'ok' && G.DB.syncState !== 'local';
    if (dirty) { try { await Promise.race([G.DB.flush(), new Promise(r => setTimeout(r, 6000))]); } catch (e) { /* stays in this browser */ } }
    location.reload();
  }

  function countdown() {
    counting = true;
    let n = COUNTDOWN;
    const tick = () => {
      if (!safe()) { counting = false; G.UI.toast('', 1); return; }     // a game has started: it waits
      if (n <= 0) { reload(); return; }
      G.UI.toast('Hay una versión nueva del juego: actualizando en ' + n + ' s…', 1500);
      n--;
      setTimeout(tick, 1000);
    };
    tick();
  }

  function loop() {
    if (pending && !counting && safe()) countdown();
    if (!pending && Date.now() - lastCheck > EVERY) check();
  }

  function init() {
    if (!mine || !location.protocol.startsWith('http')) return;
    clearInterval(timer);
    timer = setInterval(loop, 2000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastCheck > 60000) check(); });
    setTimeout(check, 30000);
  }

  return { init, check, get pending() { return pending; }, get version() { return mine; } };
})();
