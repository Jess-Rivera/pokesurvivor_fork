/* ============ signups.js — monthly account cap ============
 *
 * Firebase gives 50,000 active account users per month free; beyond
 * each one bills there. The Cloudflare Worker (cloudflare/turn-worker.js, /mau)
 * keeps the month's count:
 *   - report(): the first time an account enters in the month, it reports (with its
 *     Firebase token; once a month per account and browser). The accounts
 *     just-created ones do not report: the gatekeeper already recorded them (functions/index.js).
 *   - check(): are there spots left for new accounts? It is only asked when going to
 *     "Create account" and the answer is cached 30 min (also between sessions).
 *     If not (48,000), "Create account" is removed and playing as a guest is offered
 *     until the next month. Whoever already has an account always enters.
 * The free Workers plan gives 100,000 calls a day for everything (including the
 * co-op TURN keys and the gatekeeper): each call counts. That is why the
 * token goes in the body as text (so the browser does not make the
 * OPTIONS preflight, which would also count).
 * If the Worker does not respond, nothing is blocked.
 *
 * OFF since 2026-10-11: all accounts are accepted (no cap) so there is no
 * Worker calls are spent. To turn it back on: OFF = false, a
 * LIMIT in cloudflare/turn-worker.js and re-enable the gatekeeper.
 */
G.Signups = (() => {
  const URL = 'https://turn.pokesurvivor.com/mau';
  const CACHE = 30 * 60 * 1000, K_OPEN = 'ps.mau.open';
  let open = true, checkedAt = 0;
  try {
    const c = JSON.parse(localStorage.getItem(K_OPEN) || 'null');
    if (c && typeof c.open === 'boolean') { open = c.open; checkedAt = c.t || 0; }
  } catch (e) { /* nada */ }

  const month = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 7);
  const OFF = true;
  const enabled = () => !OFF && /^https?:$/.test(location.protocol) && !(G.FIREBASE_CONFIG || {}).emulator;
  const reportedKey = uid => 'ps.mau.' + uid + '.' + month();

  function remember(j) {
    if (typeof j.open !== 'boolean') return;
    open = j.open; checkedAt = Date.now();
    try { localStorage.setItem(K_OPEN, JSON.stringify({ open, t: checkedAt })); } catch (e) { /* nada */ }
  }

  /** Can new accounts be created this month? */
  async function check() {
    if (!enabled()) return true;
    if (Date.now() - checkedAt < CACHE) return open;
    try { remember(await (await fetch(URL)).json()); } catch (e) { /* no response: nothing is blocked */ }
    return open;
  }

  /** Just-created account: the gatekeeper already recorded it, no need to report. */
  function markNew(uid) {
    try { localStorage.setItem(reportedKey(uid), '1'); } catch (e) { /* nada */ }
  }

  /** This account has entered: recorded once a month. */
  async function report(user) {
    if (!enabled() || !user) return;
    const key = reportedKey(user.uid);
    try { if (localStorage.getItem(key)) return; } catch (e) { /* nada */ }
    try {
      const tok = await user.getIdToken();
      const r = await fetch(URL, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: tok });
      if (r.ok) {
        remember(await r.json());
        try { localStorage.setItem(key, '1'); } catch (e) { /* nada */ }
      }
    } catch (e) { /* retried next time */ }
  }

  /** Name of the next month (for the notice). */
  function nextMonthName() {
    const d = new Date(); d.setMonth(d.getMonth() + 1, 1);
    const en = G.I18n && G.I18n.lang === 'en';
    return d.toLocaleString(en ? 'en-US' : 'es-ES', { month: 'long' });
  }

  return { check, report, markNew, nextMonthName, get closed() { return !open; } };
})();
