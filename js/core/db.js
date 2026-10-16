/* ============ db.js — database: Firebase (cloud) or local ============
 * ALL access to persistent data goes through here. The rest of the game only
 * uses G.DB.*.
 *
 * Two modes (decided in ready()):
 *
 *   CLOUD  (Firebase Authentication + Cloud Firestore)
 *     If there is config in js/core/firebase-config.js and the game opens
 *     from a website (http/https, localhost too). The save is stored in
 *     saves/{uid} and can be followed on any computer.
 *       - Username + password: Firebase requires an email, so the name is
 *         turned into an internal one (nothing is ever sent to it).
 *       - Google account.
 *     A local copy is also kept so you can play offline; on
 *     syncing it is MERGED (see merge): the collections are joined and you never
 *     lose a Pokemon or a shiny.
 *
 *   LOCAL (localStorage)
 *     If there is no config or it is opened by double-click (file://). Same as
 *     before: accounts and saves only in this browser.
 *       ps.accounts      { key: { name, salt, hash, created } }
 *       ps.save.<key>    that account's save
 *       ps.session       last signed-in account
 *
 * Guest mode plays with an in-memory save that is not stored.
 */
G.DB = (() => {
  const K_ACC = 'ps.accounts', K_SES = 'ps.session', K_SAVE = 'ps.save.';
  const K_CLOUD = 'ps.cloud.', K_MIGRATED = 'ps.migrated.';
  const VERSION = 3;
  const START_COINS = 500;
  const SDK = 'https://www.gstatic.com/firebasejs/13.0.0/';
  const NAME_DOMAIN = 'jugadores.pokesurvivor.net';   // only for the internal email

  let mode = 'local';       // 'cloud' | 'local'
  let localReason = '';     // why there is no cloud: 'file' | 'config' | 'host' | 'error'
  let user = null;          // visible name
  let key = null;           // local key (lowercase) or Firebase uid
  let guest = false;
  let save = null;
  let storageOk = true;

  // ---------------- safe local storage ----------------

  function read(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }
    catch (e) { storageOk = false; return null; }
  }
  function write(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(k, s); return true; }
    catch (e) {
      // Browser full (mostly from what the ranking stores): the
      // disposable data is freed and it retries. Before, the save copy stopped
      // being written silently and, on reloading, it reverted to the cloud one.
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && /^ps\.rk\.c\./.test(key)) localStorage.removeItem(key);
        }
        localStorage.setItem(k, s); return true;
      } catch (e2) { storageOk = false; return false; }
    }
  }
  function remove(k) { try { localStorage.removeItem(k); } catch (e) { /* nothing */ } }

  // ---------------- save ----------------

  function newSave(name) {
    return {
      v: VERSION,
      name,
      created: Date.now(),
      updated: Date.now(),    // last change (for merging)
      coins: START_COINS,
      owned: {},              // dex -> { at, from: 'starter'|'gacha'|'wild' }
      shiny: {},              // dex -> { at, from } — shiny variants obtained
      partner: null,          // dex of the Pokemon you play with
      partnerShiny: false,    // play with its shiny version (if you have it)
      starter: null,          // dex you got in the test
      personality: null,      // { trait, scores }
      upgrades: {},           // (old) account upgrades; now they go per Pokemon
      pupg: {},               // dex -> { id -> level }: each Pokemon's upgrades
      tickets: { t1: 0, t10: 0 },   // gacha tickets (x1 and x10)
      pity: {},               // banner generation -> pulls without a 5-star
      legends: {},            // dex -> date: legendaries beaten in rifts
      arenas: {},             // type -> date: rift arenas won
      itemsFound: {},         // id -> date: equippable items found
      evoMoves: {},           // id -> date: moves ever evolved
      ach: {},                // id -> date: achievements earned
      missions: {},           // daily / weekly missions (systems/progress.js)
      profile: { favs: [], title: '' },   // public profile: 3 favorites and title
      stats: { runs: 0, bestTime: 0, bestLevel: 0, totalKills: 0, pulls: 0, coinsEarned: 0, shinies: 0,
               bossesTotal: 0, riftWins: 0, evolutions: 0, missionsDone: 0, groupRuns: 0, bestGroupTime: 0 }
    };
  }

  /** Fills in missing fields in saves from earlier versions. */
  function migrate(s, name) {
    const base = newSave(name || s.name);
    for (const k in base) if (s[k] == null) s[k] = base[k];
    for (const k in base.stats) if (s.stats[k] == null) s.stats[k] = base.stats[k];
    // v1 -> v2: there was a single banner (Kanto) with pity as a number.
    if (typeof s.pity === 'number') s.pity = { 1: s.pity };
    // v2 -> v3: upgrades belonged to the account; they pass to the companion of that time.
    if (!s.pupgDone) {
      if (s.partner && Object.values(s.upgrades || {}).some(v => v > 0)) {
        s.pupg[s.partner] = Object.assign({}, s.upgrades);
      }
      s.pupgDone = true;
    }
    s.tickets = Object.assign({ t1: 0, t10: 0 }, s.tickets);
    sanitize(s);
    s.v = VERSION;
    return s;
  }

  /**
   * Removes the impossible from a hand-edited save (the browser copy
   * can be tampered with): negative or odd numbers, upgrades above the
   * maximum and Pokemon that do not exist. What is actually possible is stopped by the
   * server (firestore.rules, saves).
   */
  function sanitize(s) {
    const n = v => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : 0);
    s.coins = n(s.coins);
    s.tickets.t1 = n(s.tickets.t1);
    s.tickets.t10 = n(s.tickets.t10);
    if (G.DEX_BY) for (const coll of ['owned', 'shiny']) {
      for (const d of Object.keys(s[coll] || {})) if (!G.DEX_BY[d]) delete s[coll][d];
    }
    // Shortcuts: 4 slots with a move that exists (or null), no repeats.
    if (s.pbind && typeof s.pbind === 'object') {
      for (const d of Object.keys(s.pbind)) {
        const l = Array.isArray(s.pbind[d]) ? s.pbind[d].slice(0, 4) : [];
        const seen = new Set();
        s.pbind[d] = [0, 1, 2, 3].map(i => {
          const id = l[i];
          if (typeof id !== 'string' || (G.Moves && !G.Moves.BY_ID[id]) || seen.has(id)) return null;
          seen.add(id); return id;
        });
      }
    } else s.pbind = {};
    // Veto: lists of moves that exist, no repeats, 3 at most.
    if (s.pban && typeof s.pban === 'object') {
      for (const d of Object.keys(s.pban)) {
        const l = Array.isArray(s.pban[d]) ? s.pban[d] : [];
        s.pban[d] = [...new Set(l.filter(id => typeof id === 'string' && (!G.Moves || G.Moves.BY_ID[id])))].slice(0, 3);
      }
    } else s.pban = {};
    if (G.Upgrades) for (const d of Object.keys(s.pupg || {})) {
      const u = s.pupg[d];
      if (!u || typeof u !== 'object') { delete s.pupg[d]; continue; }
      for (const id of Object.keys(u)) {
        if (!G.Upgrades.BY[id]) delete u[id];
        else u[id] = Math.min(G.Upgrades.BY[id].max, n(u[id]));
      }
    }
  }

  /**
   * Merges two versions of the same save (e.g. one played
   * offline and the cloud one). Nothing earned is ever lost:
   *   - collections (owned, shiny): union
   *   - upgrades and stats: the maximum of each
   *   - coins, companion, pity...: those of the most recent version
   * It is idempotent: merging twice gives the same result.
   */
  function merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    const newer = (a.updated || 0) >= (b.updated || 0) ? a : b;
    const older = newer === a ? b : a;
    const r = JSON.parse(JSON.stringify(newer));
    for (const coll of ['owned', 'shiny']) {
      r[coll] = r[coll] || {};
      for (const k in older[coll] || {}) {
        if (!r[coll][k] || (older[coll][k].at || 0) < (r[coll][k].at || 0)) r[coll][k] = older[coll][k];
      }
    }
    for (const k in older.upgrades || {}) r.upgrades[k] = Math.max(r.upgrades[k] || 0, older.upgrades[k]);
    r.pupg = r.pupg || {};
    for (const d in older.pupg || {}) {
      const mine = r.pupg[d] = r.pupg[d] || {};
      for (const k in older.pupg[d]) mine[k] = Math.max(mine[k] || 0, older.pupg[d][k]);
    }
    r.pupgDone = r.pupgDone || older.pupgDone;
    // What is earned is never lost: union of legendaries, arenas, items, achievements...
    for (const coll of ['legends', 'arenas', 'itemsFound', 'evoMoves', 'ach']) {
      r[coll] = r[coll] || {};
      for (const k in older[coll] || {}) if (!r[coll][k]) r[coll][k] = older[coll][k];
    }
    // Missions from the same day/week: the greater progress and what was already claimed.
    const mo = older.missions || {}, mr = r.missions = r.missions || {};
    for (const [per, list] of [['day', 'daily'], ['week', 'weekly']]) {
      if (mr[per] !== mo[per] || !mr[list] || !mo[list]) continue;
      mr[list].forEach((m, i) => {
        const o = mo[list][i];
        if (!o || o.id !== m.id) return;
        m.prog = Math.max(m.prog || 0, o.prog || 0);
        m.claimed = m.claimed || o.claimed;
        m.told = m.told || o.told;
      });
    }
    for (const k in older.stats || {}) r.stats[k] = Math.max(r.stats[k] || 0, older.stats[k] || 0);
    if (r.starter == null) r.starter = older.starter;
    if (r.personality == null) r.personality = older.personality;
    if (r.partner == null || !r.owned[r.partner]) { r.partner = older.partner; r.partnerShiny = older.partnerShiny; }
    r.created = Math.min(a.created || Date.now(), b.created || Date.now());
    r.updated = Math.max(a.updated || 0, b.updated || 0);
    return r;
  }

  /** Replaces the content of `save` without changing the object (other modules hold it). */
  // Copies `s` over the save WITHOUT changing the objects inside (upgrades,
  // Pokemon...): open screens hold references to them. Before they were
  // replaced and a purchase made right after uploading the save was
  // recorded in the old copy: the coins were charged and the upgrade was lost.
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  function assignDeep(dst, src) {
    for (const k of Object.keys(dst)) if (!(k in src)) delete dst[k];
    for (const k in src) {
      if (isObj(src[k]) && isObj(dst[k])) assignDeep(dst[k], src[k]);
      else dst[k] = src[k];
    }
  }
  function applyInPlace(s) { assignDeep(save, s); }

  const VALID = /^[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]{3,16}$/;

  // =====================================================================
  //                               MODO LOCAL
  // =====================================================================

  async function hash(pass, salt) {
    const text = salt + ':' + pass;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    return 'f' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  function randomSalt() {
    const a = new Uint8Array(12);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < a.length; i++) a[i] = Math.random() * 256;
    return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function loadLocal(k, name) {
    const s = read(K_SAVE + k);
    return s ? migrate(s, name) : newSave(name);
  }

  function beginLocal(k, name) {
    key = k; user = name; guest = false;
    save = loadLocal(k, name);
    write(K_SES, k);
  }

  async function registerLocal(name, pass) {
    const accs = read(K_ACC) || {};
    const k = name.toLowerCase();
    if (accs[k]) return { ok: false, error: 'Ese nombre ya existe.' };
    const salt = randomSalt();
    accs[k] = { name, salt, hash: await hash(pass, salt), created: Date.now() };
    if (!write(K_ACC, accs)) return { ok: false, error: 'El navegador no deja guardar datos (¿modo incógnito?).' };
    beginLocal(k, name);
    write(K_SAVE + k, save);
    return { ok: true, isNew: true };
  }

  async function loginLocal(name, pass) {
    const accs = read(K_ACC) || {};
    const acc = accs[name.toLowerCase()];
    if (!acc || acc.hash !== await hash(pass || '', acc.salt)) {
      return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    }
    beginLocal(name.toLowerCase(), acc.name);
    return { ok: true, isNew: !save.partner };
  }

  function restoreLocal() {
    const k = read(K_SES);
    if (!k) return false;
    const accs = read(K_ACC) || {};
    if (!accs[k]) { remove(K_SES); return false; }
    beginLocal(k, accs[k].name);
    return true;
  }

  /** Save of an old local account, if the name and password match. */
  async function legacySave(name, pass) {
    const k = (name || '').toLowerCase();
    const acc = (read(K_ACC) || {})[k];
    if (!acc || read(K_MIGRATED + k)) return null;
    if (acc.hash !== await hash(pass || '', acc.salt)) return null;
    const s = read(K_SAVE + k);
    return s ? { key: k, save: migrate(s, acc.name) } : null;
  }

  // =====================================================================
  //                               MODO NUBE
  // =====================================================================

  let auth = null, fs = null, rtdb = null, uid = null, unlisten = null;
  let pushT = 0, retryT = 0, pending = false, pushing = null, lastPush = 0;
  // At most one upload every 30 min (with thousands of players, every 5 min
  // was tens of thousands of writes per hour); the stuff that costs something
  // (gacha, upgrades), at 30 s. The local copy is always saved immediately (and merged with the
  // cloud on re-entering), and on hiding or closing the tab what is pending is uploaded.
  // After pulls and purchases it uploads at 3 min (it was 30 s: whoever did many pulls
  // saved twice a minute and it was millions of writes per day). What was done stays
  // in the browser copy immediately, and uploads on leaving the tab.
  // Since 2026-10-13, the normal case every 2 h (it was 30 min: 216,000 players a day
  // saved about 12 million times); on closing the tab, always; on
  // switching tabs, if it has been more than 30 min.
  // The stuff that matters (pulls, purchases, new Pokemon, shinies, prizes,
  // records that enter a top) uploads right away, and on finishing each game
  // at most every 30 min:
  // with 2 h, whoever opened the game on another device (or in another
  // app's browser) saw the old cloud copy and thought they had lost it.
  const PUSH_GAP = 2 * 3600 * 1000, PUSH_GAP_URGENT = 15 * 1000, PUSH_GAP_RUN = 30 * 60 * 1000, HIDE_GAP = 30 * 60 * 1000;
  let syncState = 'local';           // 'ok' | 'syncing' | 'pending' | 'offline' | 'local'
  const listeners = new Set();

  function setSync(s) { syncState = s; listeners.forEach(fn => { try { fn(s); } catch (e) { /* nothing */ } }); }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = src; el.async = true;
      el.onload = res; el.onerror = () => rej(new Error('No se pudo cargar ' + src));
      document.head.appendChild(el);
    });
  }

  /*
   * The cloud (Firebase, the co-op TURN) only from the official site: the
   * code is on GitHub, and a copy published on another site without changing
   * firebase-config.js would store its accounts and saves in OUR project
   * (and we would pay for it). There the game runs in local mode. What really
   * locks it down is the API key restricted to these domains in
   * Google Cloud; this stops the copies that do not even check (2026-10-14).
   */
  const HOSTS = ['pokesurvivor.com', 'www.pokesurvivor.com', 'jpter78.github.io', 'localhost', '127.0.0.1'];

  async function initCloud() {
    const cfg = G.FIREBASE_CONFIG;
    if (!/^https?:$/.test(location.protocol)) { localReason = 'file'; return false; }
    if (cfg && !cfg.emulator && !HOSTS.includes(location.hostname)) { localReason = 'host'; return false; }
    if (!cfg || !cfg.apiKey || !cfg.projectId) { localReason = 'config'; return false; }
    await loadScript(SDK + 'firebase-app-compat.js');
    await loadScript(SDK + 'firebase-auth-compat.js');
    await loadScript(SDK + 'firebase-firestore-compat.js');
    // Realtime database: friends online, invitations and rooms.
    if (cfg.databaseURL) await loadScript(SDK + 'firebase-database-compat.js');
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    fs = firebase.firestore();
    // Some networks and antivirus cut off live updates (friends,
    // invitations): Firebase tries another way to receive them if needed.
    try { fs.settings({ experimentalAutoDetectLongPolling: true }); } catch (e) { /* already set */ }
    rtdb = cfg.databaseURL ? firebase.database() : null;
    // Testing only: { ..., emulator: true } uses the local Firebase emulator.
    if (cfg.emulator) {
      auth.useEmulator('http://127.0.0.1:9099');
      fs.useEmulator('127.0.0.1', 8080);
      if (rtdb) rtdb.useEmulator('127.0.0.1', 9000);
    }
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    auth.languageCode = 'es';
    addEventListener('online', () => { if (pending) pushNow(); });
    // On leaving or closing the tab what is pending uploads, but no more than
    // once every 10 min: people switch tabs often and each game was
    // uploading every ~9 min instead of every 30 (2026-10-12, the biggest Firebase
    // cost). What is not uploaded stays in this browser's copy and
    // uploads on re-entering.
    const hideFlush = () => { if (pending && Date.now() - lastPush > HIDE_GAP) pushNow(); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hideFlush(); });
    // On closing or reloading the page, what is pending always uploads.
    addEventListener('pagehide', () => { if (pending) pushNow(); });
    return true;
  }

  /** Firebase requires an email: the name is encoded into an internal one, unique and valid. */
  function nameToEmail(name) {
    const hex = [...new TextEncoder().encode(name.trim().toLowerCase())].map(b => b.toString(16).padStart(2, '0')).join('');
    return hex + '@' + NAME_DOMAIN;
  }

  function displayNameOf(u) {
    const n = ((u && u.displayName) || 'Entrenador').trim().split(/\s+/)[0].replace(/[^A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]/g, '');
    return (n || 'Entrenador').slice(0, 16);
  }

  const docRef = () => fs.collection('saves').doc(uid);
  const plain = s => JSON.parse(JSON.stringify(s));      // Firestore does not allow undefined

  /** Opens the cloud save of a just-authenticated user. */
  async function openCloud(u, opts = {}) {
    uid = u.uid;
    if (G.Signups) G.Signups.report(u);          // monthly account cap (net/signups.js)
    const cached = read(K_CLOUD + uid);
    let remote = null, online = true;
    try {
      const snap = await docRef().get();
      remote = snap.exists ? snap.data().save : null;
    } catch (e) {
      if (!cached) throw e;                // offline and no copy: there is nothing to open
      online = false;
    }
    let s = merge(cached && migrate(cached), remote && migrate(remote));
    if (!s) s = newSave(opts.name || displayNameOf(u));
    if (opts.legacy) {
      s = merge(s, opts.legacy.save);
      write(K_MIGRATED + opts.legacy.key, uid);
    }
    save = migrate(s, s.name);
    key = uid; user = save.name; guest = false;
    write(K_CLOUD + uid, save);
    // It only uploads if there is something the cloud does not have (new account, progress on
    // this computer not uploaded...), and WITHOUT waiting: before, the menu did not show until
    // the upload finished, and with slow Firebase it took up to 9 s to enter.
    // (Comparing the whole text gave "different" almost always and it uploaded on every
    // entry: now only if this copy is newer than the cloud one.)
    const same = remote && !opts.legacy && (!cached || (cached.updated || 0) <= (remote.updated || 0));
    lastPush = Date.now();       // the first purchase or ticket does not upload immediately: it waits like the rest
    if (!online) { pending = true; setSync('offline'); scheduleRetry(); }
    else if (same) setSync('ok');
    else pushNow();
  }

  /*
   * The document is no longer listened to live (each change cost a read).
   * If you play on two computers, the saves merge on entering and on
   * each upload (a transaction with merge()).
   */
  function stopListening() { if (unlisten) { unlisten(); unlisten = null; } }

  /*
   * If the admin has banned the account from the ranking (ban = true in the cloud, see
   * firestore.rules), every save has to preserve it: it is copied from the cloud.
   * It never uploads twice in under 65 s; meanwhile, everything is in the browser.
   */
  const K_OK = 'ps.cloudok.', MIN_GAP = 65000;
  const sinceOk = () => Date.now() - (+read(K_OK + uid) || 0);

  /** Uploads the save, merging it with whatever is in the cloud (transaction). */
  function pushNow() {
    if (mode !== 'cloud' || guest || !save || !uid) return Promise.resolve();
    // If an upload is already in progress, another is done right after (for whatever changed meanwhile).
    if (pushing) { pending = true; return pushing.then(() => (pending ? pushNow() : undefined)); }
    clearTimeout(pushT); pushT = 0; pushDue = 0;
    if (navigator.onLine === false) {
      pending = true; setSync('offline'); scheduleRetry();
      return Promise.resolve();
    }
    if (sinceOk() < MIN_GAP) {
      pending = true; setSync('pending');
      schedulePush(MIN_GAP - sinceOk() + 500);
      return Promise.resolve();
    }
    pending = false;
    lastPush = Date.now();
    setSync('syncing');
    let merged = null;
    const tr = fs.runTransaction(async tx => {
      const ref = docRef();
      const snap = await tx.get(ref);
      const remote = snap.exists ? migrate(snap.data().save) : null;
      merged = remote ? merge(plain(save), remote) : plain(save);
      const doc = { save: merged, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), v: VERSION };
      if (snap.exists && snap.data().ban === true) doc.ban = true;
      tx.set(ref, doc);
    });
    // If the network drops midway, Firestore can hang waiting: a 12 s cap.
    const timeout = new Promise((_, rej) => setTimeout(() => rej({ code: 'unavailable' }), 12000));
    let failed = false;
    pushing = Promise.race([tr, timeout]).then(() => {
      fails = 0;
      write(K_OK + uid, Date.now());
      // It is MERGED with the current state (not overwritten): if you changed something
      // while it was uploading (choosing a companion, a purchase...), it is not lost.
      if (merged && save) { applyInPlace(merge(plain(save), merged)); write(K_CLOUD + uid, save); }
      setSync(pending ? 'pending' : 'ok');
      if (G.UI && G.UI.refreshCoins) G.UI.refreshCoins();
    }).catch(e => {
      console.warn('[DB] could not sync:', e.code || e.message);
      pending = true; failed = true;
      setSync(navigator.onLine === false || e.code === 'unavailable' ? 'offline' : 'pending');
      scheduleRetry();
    }).finally(() => {
      pushing = null;
      // (If it failed, the retry is already scheduled with its growing wait.)
      if (!failed && pending && syncState === 'pending') schedulePush(Math.max(1500, PUSH_GAP - (Date.now() - lastPush)));
    });
    return pushing;
  }

  // If an upload was already scheduled, it is respected (a purchase does not wait for the next game).
  let pushDue = 0;
  function schedulePush(ms) {
    const due = Date.now() + ms;
    if (pushT && pushDue && pushDue <= due) return;
    clearTimeout(pushT); pushDue = due;
    pushT = setTimeout(() => { pushT = 0; pushDue = 0; pushNow(); }, ms);
  }
  /**
   * Retry with growing wait: 15 s, 30 s, 1 min, 2 min... up to 10 min.
   * With many players, always retrying at 15 s when Firebase fails
   * (quota exhausted, outage) multiplied the reads (it happened on 2026-10-10).
   */
  let fails = 0;
  function scheduleRetry() {
    const ms = Math.min(10 * 60e3, 15e3 * Math.pow(2, fails)) * (0.8 + Math.random() * 0.4);
    fails = Math.min(fails + 1, 8);
    clearTimeout(retryT);
    retryT = setTimeout(() => { if (pending) pushNow(); }, ms);
  }

  function authError(e) {
    const c = (e && e.code) || '';
    const M = {
      'auth/email-already-in-use': 'Ese nombre ya existe.',
      'auth/invalid-credential': 'Usuario o contraseña incorrectos.',
      'auth/invalid-login-credentials': 'Usuario o contraseña incorrectos.',
      'auth/wrong-password': 'Usuario o contraseña incorrectos.',
      'auth/user-not-found': 'Usuario o contraseña incorrectos.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/too-many-requests': 'Demasiados intentos seguidos. Espera un poco.',
      'auth/network-request-failed': 'Sin conexión a internet.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.',
      'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication > Configuración > Dominios autorizados).',
      'auth/operation-not-allowed': 'Ese método de inicio de sesión no está activado en Firebase.',
      // New-account registration disabled in Firebase (Authentication > Settings).
      'auth/admin-restricted-operation': 'Ahora mismo no se pueden crear cuentas nuevas. Si ya tienes cuenta, entra normal; si no, puedes jugar como invitado.',
      'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión y repite la operación.',
      'permission-denied': 'La base de datos rechazó el acceso (revisa las reglas de Firestore).',
      'unavailable': 'Sin conexión con la base de datos.'
    };
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
    // Firebase's "gatekeeper" (functions/index.js) rejected the new account: monthly cap.
    if (/error-code:-47|BLOCKING_FUNCTION|resource-exhausted|cuentas nuevas/i.test(c + ' ' + ((e && e.message) || '')))
      return 'Este mes ya no quedan plazas para cuentas nuevas (vuelven el 1 de ' + (G.Signups ? G.Signups.nextMonthName() : 'mes que viene') + '). Mientras, puedes jugar como invitado.';
    return M[c] || ('Error: ' + (c || (e && e.message) || 'desconocido'));
  }

  // =====================================================================
  //                           PUBLIC API
  // =====================================================================

  let readyP = null;

  /** Starts the database and restores the previous session. → true if there is a session. */
  function ready() {
    if (readyP) return readyP;
    readyP = (async () => {
      try { if (await initCloud()) mode = 'cloud'; }
      catch (e) { console.warn('[DB] no cloud:', e.message); localReason = 'error'; mode = 'local'; }
      if (mode === 'local') { setSync('local'); return restoreLocal(); }
      const u = await new Promise(res => { const off = auth.onAuthStateChanged(x => { off(); res(x); }); });
      if (!u) return false;
      try { await openCloud(u); return true; }
      catch (e) { console.warn('[DB] could not open the save:', e.code || e.message); return false; }
    })();
    return readyP;
  }

  async function register(name, pass) {
    name = (name || '').trim();
    if (!VALID.test(name)) return { ok: false, error: 'El nombre debe tener 3-16 letras, números o _.' };
    const min = mode === 'cloud' ? 6 : 4;
    if ((pass || '').length < min) return { ok: false, error: `La contraseña debe tener al menos ${min} caracteres.` };
    if (mode === 'local') return registerLocal(name, pass);
    // Monthly account cap (Firebase charges beyond 50,000 a month).
    if (G.Signups && !(await G.Signups.check())) return { ok: false, error: 'Este mes ya no quedan plazas para cuentas nuevas (vuelven el 1 de ' + G.Signups.nextMonthName() + '). Mientras, puedes jugar como invitado.' };
    try {
      const legacy = await legacySave(name, pass);
      const cred = await auth.createUserWithEmailAndPassword(nameToEmail(name), pass);
      if (G.Signups) G.Signups.markNew(cred.user.uid);   // the gatekeeper already recorded it
      await openCloud(cred.user, { name, legacy });
      return { ok: true, isNew: !save.partner, imported: !!legacy };
    } catch (e) { return { ok: false, error: authError(e) }; }
  }

  async function login(name, pass) {
    name = (name || '').trim();
    if (mode === 'local') return loginLocal(name, pass);
    try {
      const legacy = await legacySave(name, pass);
      const cred = await auth.signInWithEmailAndPassword(nameToEmail(name), pass || '');
      await openCloud(cred.user, { name, legacy });
      return { ok: true, isNew: !save.partner, imported: !!legacy };
    } catch (e) { return { ok: false, error: authError(e) }; }
  }

  async function loginWithGoogle() {
    if (mode !== 'cloud') return { ok: false, error: 'Entrar con Google necesita la versión publicada del juego.' };
    try {
      const cred = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      // New Google account with the monthly cap reached: it is not created.
      if (cred.additionalUserInfo && cred.additionalUserInfo.isNewUser && G.Signups && !(await G.Signups.check())) {
        await cred.user.delete().catch(() => {});
        await auth.signOut().catch(() => {});
        return { ok: false, error: 'Este mes ya no quedan plazas para cuentas nuevas (vuelven el 1 de ' + G.Signups.nextMonthName() + '). Mientras, puedes jugar como invitado.' };
      }
      if (cred.additionalUserInfo && cred.additionalUserInfo.isNewUser && G.Signups) G.Signups.markNew(cred.user.uid);
      await openCloud(cred.user, { name: displayNameOf(cred.user) });
      return { ok: true, isNew: !save.partner };
    } catch (e) { return { ok: false, error: authError(e) }; }
  }

  /** Changes the name shown in the game (on choosing a nickname). */
  function setName(n) {
    if (!save || guest) return;
    save.name = n; user = n;
    commit();
  }

  function playAsGuest() {
    user = 'Invitado'; key = null; guest = true; uid = null;
    save = newSave('Invitado');
    if (mode === 'local') remove(K_SES);
    return { ok: true, isNew: true };
  }

  /**
   * Saves the current game (does nothing in guest mode). In the browser,
   * immediately; in the cloud:
   * @param urgent  true: the stuff that matters (pulls, purchases, Pokemon, prizes): right away
   *                'run': on finishing a game (at most every 30 min) · false: every 2 h
   */
  function commit(urgent = false) {
    if (guest || !key || !save) return false;
    save.updated = Date.now();
    if (mode === 'local') return write(K_SAVE + key, save);
    write(K_CLOUD + uid, save);
    pending = true;
    setSync('pending');
    const gap = urgent === 'run' ? PUSH_GAP_RUN : urgent ? PUSH_GAP_URGENT : PUSH_GAP;
    schedulePush(Math.max(1200, gap - (Date.now() - lastPush)));
    return true;
  }

  /** Functions run on signing out or deleting the account (friends, rooms...). */
  const leaveHooks = [];

  async function logout() {
    for (const fn of leaveHooks) { try { await fn('logout'); } catch (e) { /* nothing */ } }
    if (mode === 'cloud' && !guest && save) {
      if (pending) { try { await pushNow(); } catch (e) { /* the local copy remains */ } }
      stopListening();
      try { await auth.signOut(); } catch (e) { /* nothing */ }
    } else if (mode === 'local' && !guest) {
      commit();
      remove(K_SES);
    }
    clearTimeout(pushT); clearTimeout(retryT);
    user = key = save = uid = null; guest = false; pending = false;
    setSync(mode === 'cloud' ? 'ok' : 'local');
  }

  function nameAccount() { return !!(auth && auth.currentUser && (auth.currentUser.email || '').endsWith('@' + NAME_DOMAIN)); }

  /*
   * Account recovery: name-and-password accounts have no real email
   * (no link can be sent to them), so they are offered the option to LINK their Gmail:
   * if one day they forget the password, they sign in with Google and it is the same account.
   * Firebase's account system does it (free): not a single read or
   * write of the database.
   */
  function hasGoogle() {
    const u = auth && auth.currentUser;
    return !!(u && u.providerData.some(p => p.providerId === 'google.com'));
  }
  async function linkGoogle() {
    if (!auth || !auth.currentUser) return { ok: false, error: 'Inicia sesión primero.' };
    try {
      await auth.currentUser.linkWithPopup(new firebase.auth.GoogleAuthProvider());
      return { ok: true };
    } catch (e) {
      const c = (e && e.code) || '';
      if (c === 'auth/provider-already-linked') return { ok: true };
      if (c === 'auth/credential-already-in-use' || c === 'auth/email-already-in-use')
        return { ok: false, error: 'Ese Gmail ya tiene su propia cuenta del juego. Usa otro Gmail.' };
      return { ok: false, error: authError(e) };
    }
  }

  /**
   * Deletes the account and the save (in the cloud or in this browser).
   * @param pass  password (name-and-password accounts)
   */
  async function deleteAccount(pass) {
    if (guest || !key) return { ok: false, error: 'No hay cuenta que borrar.' };
    if (mode === 'local') {
      const accs = read(K_ACC) || {};
      delete accs[key];
      write(K_ACC, accs);
      remove(K_SAVE + key); remove(K_SES);
      user = key = save = null;
      return { ok: true };
    }
    try {
      // First it confirms who you are: Firebase only allows deleting the account if
      // you signed in recently. Before, the data was deleted and then that
      // last step failed: the account was left empty but existed and its name
      // could not be reused.
      const cu = auth.currentUser;
      if (nameAccount()) {
        if (!pass) return { ok: false, error: 'Escribe tu contraseña.' };
        await cu.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(cu.email, pass));
      } else {
        await cu.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
      }
      clearTimeout(pushT); clearTimeout(retryT); pending = false;
      stopListening();
      for (const fn of leaveHooks) await fn('delete');
      await docRef().delete();
      remove(K_CLOUD + uid);
      await auth.currentUser.delete();
      user = key = save = uid = null;
      return { ok: true };
    } catch (e) { return { ok: false, error: authError(e) }; }
  }

  // ---------------- save helpers ----------------

  function owns(dex) { return !!(save && save.owned[dex]); }

  function grant(dex, from) {
    if (!save.owned[dex]) save.owned[dex] = { at: Date.now(), from };
  }

  function ownsShiny(dex) { return !!(save && save.shiny && save.shiny[dex]); }

  /** Upgrades bought for a Pokemon: { id -> level }. */
  function upgradesOf(dex) {
    if (!save) return {};
    save.pupg = save.pupg || {};
    return save.pupg[dex] || (save.pupg[dex] = {});
  }

  /** Grants the shiny version (and the normal one, if not owned). Returns true if new. */
  function grantShiny(dex, from) {
    grant(dex, from);
    if (save.shiny[dex]) return false;
    save.shiny[dex] = { at: Date.now(), from };
    return true;
  }

  return {
    ready, register, login, loginWithGoogle, playAsGuest, logout, commit, deleteAccount, flush: pushNow,
    owns, grant, ownsShiny, grantShiny, merge, setName, upgradesOf,
    onSync(fn) { listeners.add(fn); },
    onLeave(fn) { leaveHooks.push(fn); },
    /** Low-level access for the network modules (cloud mode only). */
    get fb() { return mode === 'cloud' ? { auth, fs, rtdb, uid, emulator: !!(G.FIREBASE_CONFIG || {}).emulator } : null; },
    /** Is the online side available (friends, ranking, multiplayer)? */
    get online() { return mode === 'cloud' && !guest && !!uid && !!save; },
    /** Is the account a username-and-password one (not Google)? */
    get nameAccount() { return nameAccount(); },
    get hasGoogle() { return hasGoogle(); }, linkGoogle,
    get mode() { return mode; },
    get localReason() { return localReason; },
    get syncState() { return syncState; },
    get user() { return user; },
    get guest() { return guest; },
    get save() { return save; },
    get loggedIn() { return !!save; },
    get storageOk() { return storageOk; },
    START_COINS
  };
})();
