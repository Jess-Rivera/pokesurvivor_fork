/* DISABLED since 2026-10-11: all accounts are accepted (no cap). The
 * trigger was removed from Firebase; CAUTION: `firebase deploy --only functions` would
 * put it back. See js/net/signups.js and cloudflare/turn-worker.js (LIMIT). */
/* ============ functions/index.js — new-account "gatekeeper" ============
 *
 * Firebase (Identity Platform) charges beyond 50,000 account users per
 * month. This function runs BEFORE creating any account (from the game,
 * with Google or by calling Firebase directly: there is no way to skip it).
 * It asks the Cloudflare Worker (cloudflare/turn-worker.js, /mau/new), which
 * keeps the month's count and records it; if the cap (48,000) has been reached, the
 * account is not created until the 1st.
 *
 * Cost: it only runs when creating accounts (2 million free executions per
 * month). If the Worker does not respond, NO one is blocked.
 * Names starting with "zzcerrado" are always rejected: it is to test
 * that the rejection works without actually closing registration.
 */
// 1st generation: with the 2nd, Google calls the function with one address
// (cloudfunctions.net) and the library expects another (run.app), and it rejected ALL
// the accounts (happened on 2026-10-11 for 5 minutes).
const functions = require('firebase-functions/v1');

const URL = 'https://turn.pokesurvivor.com/mau/new';
const MSG = 'Este mes ya no quedan plazas para cuentas nuevas. Mientras, puedes jugar como invitado.';
// "zzcerrado" in the game's internal name format (hex of the lowercase name).
const TEST_PREFIX = Buffer.from('zzcerrado').toString('hex');

exports.portero = functions.region('europe-west1')
  .runWith({ secrets: ['MAU_SECRET'], memory: '256MB', timeoutSeconds: 10, maxInstances: 10 })
  .auth.user().beforeCreate(async user => {
    if ((user.email || '').startsWith(TEST_PREFIX)) throw new functions.auth.HttpsError('resource-exhausted', MSG);
    let j = null;
    try {
      const r = await fetch(URL + '?uid=' + encodeURIComponent(user.uid), { method: 'POST', headers: { 'X-PS-Secret': process.env.MAU_SECRET } });
      if (r.ok) j = await r.json();
    } catch (e) { console.warn('[portero] el Worker no responde:', e.message); }
    if (j && j.open === false) throw new functions.auth.HttpsError('resource-exhausted', MSG);
  });
