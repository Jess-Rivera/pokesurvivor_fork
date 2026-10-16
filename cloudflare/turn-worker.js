/* ============ turn-worker.js — TURN keys for co-op ============
 *
 * Cloudflare Worker (free) that gives temporary credentials for Cloudflare's
 * Realtime TURN to the players. Without TURN, group games that cannot
 * get a direct connection (mobile data, some routers) were relayed
 * through Firebase's Realtime Database, at $1 per GB. With TURN they go through
 * Cloudflare: 1,000 GB free per month and then $0.05 per GB.
 *
 * Credentials are only given to players with a game account: the game sends its
 * Firebase token and here it is checked (Google's signature, project and expiry).
 * This way no outsider can spend the quota.
 *
 * Variables del Worker (Settings -> Variables and Secrets, tipo "Secret"):
 *   TURN_KEY_ID         the "Turn Token ID" from Cloudflare Realtime -> TURN
 *   TURN_KEY_API_TOKEN  the "API Token" of that same key
 * Dominio: turn.pokesurvivor.com (Settings -> Domains & Routes -> Custom domain).
 * Ver docs/TURN.md.
 *
 * /online — approximate counter of people playing (no cost: free plan of
 * Workers). Each tab reports on opening and every 20 min with a session id; a
 * Durable Object ("Online") remembers who reported in the last 25 min and
 * returns how many there are. If it exceeds the day's free quota, it simply fails
 * and the game does not show the number. Deployed with wrangler (wrangler.toml).
 * REMOVED FROM THE GAME on 2026-10-11: it took half of the 100,000 calls
 * daily of the free plan. The route stays only for tabs that remain open.
 *
 * /mau — monthly account cap. Firebase (Identity Platform) gives 50,000
 * active account users per month free and after that charges ~$0.0055 for each
 * one. The game reports here (with its token) the first time each account enters
 * in the month; on reaching LIMIT, GET /mau says open:false and the game removes
 * "Create account" until the next month (guests never count).
 * /mau/new — called by Firebase's "gatekeeper" (functions/index.js) BEFORE
 * creating any account, whether from the game or not: it records the account and says whether it
 * can be created. Protected with the MAU_SECRET key (secret of the Worker and the
 * function), so no one else can touch the counter.
 */
// Firebase projects whose accounts are valid. On 2026-10-12 the game moved to
// pokesurvivor-free (without Identity Platform: free accounts); the old one
// (pokesurvivor-jpter) was deleted on 2026-10-13.
const PROJECTS = ['pokesurvivor-free'];
// TURN cap: 1,000 GB free per month. Past TURN_CAP_GB this month it stops
// give TURN servers (STUN only): those games use the Firebase relay. This way
// Cloudflare never exceeds the plan's $5. It needs the CF_ANALYTICS_TOKEN secret
// (an API token with "Account Analytics: Read" permission) and the ACCOUNT_ID variable;
// without them there is no cap (as before).
const TURN_CAP_GB = 900;
const ORIGINS = ['https://pokesurvivor.com', 'https://www.pokesurvivor.com', 'http://127.0.0.1:8765', 'http://localhost:8765'];
const TTL = 4 * 3600;                         // segundos que valen las credenciales
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let keys = null, keysAt = 0;                  // Google's public keys (cache)

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',          // el navegador no repite la consulta OPTIONS (cada una cuenta)
    'Vary': 'Origin'
  };
}

const b64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));

/** Is it a valid Firebase token for this project? Returns the uid or null. */
async function verify(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  let head, body;
  try { head = JSON.parse(new TextDecoder().decode(b64url(parts[0]))); body = JSON.parse(new TextDecoder().decode(b64url(parts[1]))); }
  catch (e) { return null; }
  const now = Math.floor(Date.now() / 1000);
  if (head.alg !== 'RS256' || !PROJECTS.includes(body.aud) || body.iss !== 'https://securetoken.google.com/' + body.aud) return null;
  if (!body.sub || body.exp < now || body.iat > now + 300) return null;
  if (!keys || Date.now() - keysAt > 3600e3) {
    const r = await fetch(JWKS);
    keys = (await r.json()).keys; keysAt = Date.now();
  }
  const jwk = keys.find(k => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  return ok ? body.sub : null;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    // Manual adjustment (with the key): the month's counter cannot be less than N
    // (e.g. the accounts that entered before the counter existed).
    if (new URL(req.url).pathname === '/mau/seed') {
      if (!env.MAU_SECRET || req.headers.get('X-PS-Secret') !== env.MAU_SECRET) return new Response('{"error":"no autorizado"}', { status: 401 });
      const n = parseInt(new URL(req.url).searchParams.get('n') || '0', 10);
      const r = await env.MAU.get(env.MAU.idFromName(monthKey())).fetch('https://mau/?seed=' + (n > 0 ? n : 0));
      return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json' } });
    }
    // No cap (LIMIT = 0): nothing is counted and the Durable Object is not woken.
    if (LIMIT <= 0 && new URL(req.url).pathname.startsWith('/mau') && new URL(req.url).pathname !== '/mau/seed')
      return new Response('{"open":true,"v":3}', { headers: { ...h, 'content-type': 'application/json', 'cache-control': 'no-store' } });
    if (new URL(req.url).pathname === '/mau/new') {
      if (!env.MAU_SECRET || req.headers.get('X-PS-Secret') !== env.MAU_SECRET) return new Response('{"error":"no autorizado"}', { status: 401 });
      const uid = new URL(req.url).searchParams.get('uid') || '';
      if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return new Response('{"error":"uid"}', { status: 400 });
      const r = await env.MAU.get(env.MAU.idFromName(monthKey())).fetch('https://mau/?new=1&uid=' + encodeURIComponent(uid));
      return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json' } });
    }
    if (new URL(req.url).pathname === '/mau') {
      const stub = env.MAU.get(env.MAU.idFromName(monthKey()));
      let uid = '';
      if (req.method === 'POST') {
        // The token goes in the body (text/plain, no OPTIONS preflight) or, in old games, in Authorization.
        const tok = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '') || (await req.text()).trim().slice(0, 4096);
        uid = await verify(tok);
        if (!uid) return new Response(JSON.stringify({ error: 'no autorizado' }), { status: 401, headers: { ...h, 'content-type': 'application/json' } });
      }
      const r = await stub.fetch('https://mau/?uid=' + encodeURIComponent(uid));
      return new Response(r.body, { status: r.status, headers: { ...h, 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    // The "playing now" counter is no longer in the game: old tabs
    // get a 404 immediately, without touching the Durable Object.
    if (new URL(req.url).pathname === '/online') return new Response('{}', { status: 404, headers: h });
    if (new URL(req.url).pathname === '/online-old') {
      // ?s=1: the sampled count (1 in every 10 tabs reports); without it, the old one.
      const r = await env.ONLINE.get(env.ONLINE.idFromName(new URL(req.url).searchParams.get('s') ? 'sample' : 'global')).fetch(req);
      return new Response(r.body, { status: r.status, headers: { ...h, 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    const uid = await verify((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
    if (!uid) return new Response(JSON.stringify({ error: 'no autorizado' }), { status: 401, headers: { ...h, 'content-type': 'application/json' } });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.TURN_KEY_API_TOKEN, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: TTL })
    });
    if (!r.ok) return new Response(JSON.stringify({ error: 'turn ' + r.status }), { status: 502, headers: { ...h, 'content-type': 'application/json' } });
    const data = await r.json();
    let ice = data.iceServers;
    // Month's quota almost spent: STUN only (no TURN, which is what is paid for).
    if (await turnFull(env)) {
      ice = [].concat(ice).map(s => Object.assign({}, s, { urls: [].concat(s.urls).filter(u => /^stuns?:/.test(u)) }))
        .filter(s => s.urls.length);
    }
    return new Response(JSON.stringify({ iceServers: ice, ttl: TTL }), {
      headers: { ...h, 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  }
};

// ---------------- tope del TURN ----------------

/**
 * Has almost all the free TURN for the month been spent? It checks the real usage in the
 * Cloudflare analytics API and caches it 30 min (it does not spend
 * plan requests: it is a subrequest). If something fails, it cuts nothing off.
 */
async function turnFull(env) {
  if (!env.CF_ANALYTICS_TOKEN || !env.ACCOUNT_ID) return false;
  const month = new Date().toISOString().slice(0, 7);
  const cacheKey = new Request('https://turn-budget.internal/' + month);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return (await hit.text()) === '1';
  let full = false;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const query = `{ viewer { accounts(filter: { accountTag: "${env.ACCOUNT_ID}" }) {
      callsTurnUsageAdaptiveGroups(limit: 40, filter: { date_geq: "${month}-01", date_leq: "${today}" }) { sum { egressBytes } } } } }`;
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.CF_ANALYTICS_TOKEN, 'content-type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const j = await r.json();
    const rows = (j.data && j.data.viewer.accounts[0] && j.data.viewer.accounts[0].callsTurnUsageAdaptiveGroups) || [];
    const gb = rows.reduce((a, x) => a + (x.sum.egressBytes || 0), 0) / 1e9;
    full = gb >= TURN_CAP_GB;
  } catch (e) { full = false; }
  await cache.put(cacheKey, new Response(full ? '1' : '0', { headers: { 'cache-control': 'max-age=1800' } }));
  return full;
}

// ---------------- online-people counter ----------------

const WINDOW = 25 * 60 * 1000;               // counts whoever reported in the last 25 min
const PER_IP = 6;                            // 6 tabs per connection at most (anti-cheat)

export class Online {
  // sid -> { t, ip }. Stored in the Durable Object's storage at
  // most once per minute: if Cloudflare restarts it, it does not go back to zero.
  constructor(ctx) {
    this.ctx = ctx; this.seen = new Map(); this.prunedAt = 0; this.savedAt = 0;
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get('seen');
      if (saved) this.seen = new Map(saved);
    });
  }

  async fetch(req) {
    const url = new URL(req.url);
    const sid = (url.searchParams.get('sid') || '').slice(0, 40);
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const now = Date.now();
    if (now - this.prunedAt > 60e3) {
      for (const [k, v] of this.seen) if (now - v.t > WINDOW) this.seen.delete(k);
      this.prunedAt = now;
    }
    if (/^[a-z0-9]{8,40}$/i.test(sid) && (this.seen.has(sid) || this.countIp(ip) < PER_IP)) this.seen.set(sid, { t: now, ip });
    if (now - this.savedAt > 60e3) { this.savedAt = now; await this.ctx.storage.put('seen', [...this.seen]); }
    return new Response(JSON.stringify({ n: this.seen.size }));
  }

  countIp(ip) { let n = 0; for (const v of this.seen.values()) if (v.ip === ip) n++; return n; }
}

// ---------------- monthly account cap ----------------

// Monthly account cap. 0 = no cap (since 2026-10-11: all are accepted;
// past the 50,000 free Firebase charges ~$0.0055 per account). To re-enable it
// set it: a number (e.g. 48000) and `npx wrangler deploy`. It keeps counting the same.
const LIMIT = 0;
const full = n => LIMIT > 0 && n >= LIMIT;

/** Google's billing month (Pacific time, approximate). */
function monthKey() { return new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 7); }

export class Mau {
  constructor(ctx) { this.ctx = ctx; }

  async fetch(req) {
    const q = new URL(req.url).searchParams;
    const uid = q.get('uid') || '';
    let n = (await this.ctx.storage.get('n')) || 0;
    const seed = parseInt(q.get('seed') || '0', 10);
    if (seed > n) { n = seed; await this.ctx.storage.put('n', n); }
    const known = uid && (await this.ctx.storage.get('u:' + uid));
    // NEW account with the cap reached: it is not recorded and the answer is no.
    if (q.get('new') && !known && full(n)) return new Response(JSON.stringify({ n, limit: LIMIT, open: false }));
    if (uid && !known) {
      n++;
      await this.ctx.storage.put({ ['u:' + uid]: 1, n });
    }
    return new Response(JSON.stringify({ n, limit: LIMIT, open: !full(n), v: 3 }));
  }
}
