/* ============ social.js — nickname, friends, online, invitations and rooms ============
 * Only works with a cloud account (G.DB.online). Uses:
 *
 *   Firestore
 *     names/{nickname lowercase}   { uid }               unique nicknames
 *     profiles/{uid}               { name, lower, at }   public nickname
 *     friendships/{uidA_uidB}      { users, from, to, status: 'pending'|'ok', names, at }
 *
 *     pres/{uid}                   { on, at, room, play } online (approximate)
 *     inv/{para_de}                { to, from, room, name, at } invitaciones
 *
 *   Realtime Database: ONLY while you are in a room or group game
 *     rooms/{id}          { host, open, at, m: { uid: { name, dex, shiny } }, q: ... }
 *                         the room; q/ are the net.js messages
 *
 * Why this way: the free Firebase plan only allows 100 connections at
 * once to the Realtime Database. If everyone were connected for the
 * online, that would be the max number of players. Now only those who
 * are in a room count; online goes through Firestore with a heartbeat every 10 min
 * and is only read on opening Friends or the room (what is read lasts 1 min).
 *
 * The rest of the game listens to the changes with G.Social.on(fn).
 */
G.Social = (() => {
  const VALID = /^[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]{3,16}$/;
  const MAX_PLAYERS = 4;
  const INVITE_TTL = 3 * 60 * 1000;
  /*
   * Real time: the website server's (Date header of version.json, free).
   * If the device clock is ahead (e.g. the timezone set wrong),
   * all invitations looked expired and were deleted without being shown, and
   * friends always showed as offline (happened in 2026-10).
   */
  let skew = 0;
  const now = () => Date.now() + skew;
  function measureSkew() {
    const t0 = Date.now();
    fetch('version.json?t=' + t0, { method: 'HEAD', cache: 'no-store' }).then(r => {
      const d = Date.parse(r.headers.get('date') || '');
      if (!d) return;
      const s = d + 500 - (t0 + Date.now()) / 2;          // (la cabecera va en segundos)
      skew = Math.abs(s) > 60000 ? s : 0;
      if (skew) console.warn('[Social] el reloj de este aparato va desfasado', Math.round(skew / 60000), 'min: se corrige');
    }).catch(() => {});
  }
  // Presence heartbeat: every 30 min (was 15; before 10). 57,000 players with
  // friends wrote it 4 times an hour (2026-10-13, less Firestore cost).
  const BEAT = 30 * 60 * 1000;
  const ONLINE = 40 * 60 * 1000;        // "online" if the last heartbeat is more recent
  const PRES_TTL = 60 * 1000;           // what is read from friends lasts 1 min

  let fb = null, uid = null;
  let me = null;                    // { uid, name }
  let friends = new Map();          // otherUid -> { uid, name, pid, status: 'ok'|'in'|'out', online, play }
  let unFriends = null;
  let beatT = 0, presAt = 0, unInv = null;
  const pres = new Map();           // otherUid -> { online, play, room, seen } (the last read)
  const sentInv = new Set();        // who you invited (to withdraw it on leaving)
  let room = null;                  // { id, host, isHost, members: [{ uid, name, dex, shiny }] }
  let roomRefs = [];
  const invites = new Map();        // fromUid -> { from, name, room, at }
  const listeners = new Set();
  let started = false;

  function emit(what) { listeners.forEach(fn => { try { fn(what); } catch (e) { console.warn(e); } }); }
  const ts = () => firebase.database.ServerValue.TIMESTAMP;
  const fts = () => firebase.firestore.FieldValue.serverTimestamp();
  const msOf = v => (v && v.toMillis ? v.toMillis() : +v || 0);
  const pidOf = (a, b) => (a < b ? a + '_' + b : b + '_' + a);

  // ---------------- arranque ----------------

  /** After signing in. -> 'ok' | 'need-nick' | 'off' (no cloud) */
  async function start() {
    if (!G.DB.online) return 'off';
    if (started) return me ? 'ok' : 'need-nick';
    fb = G.DB.fb; uid = fb.uid;
    started = true;
    measureSkew();
    // The nickname never changes: it is remembered in this browser so the
    // profile is not read on every visit (one fewer read per player and session).
    const NICK = 'ps.nick.' + uid;
    let cachedNick = null;
    try { cachedNick = localStorage.getItem(NICK); } catch (e) { /* nada */ }
    const prof = cachedNick ? { name: cachedNick }
      : await fb.fs.collection('profiles').doc(uid).get().then(s => s.exists ? s.data() : null).catch(() => null);
    if (prof) {
      me = { uid, name: prof.name };
      if (G.DB.user !== prof.name) G.DB.setName(prof.name);
      try { localStorage.setItem(NICK, prof.name); } catch (e) { /* nada */ }
    }
    else if (G.DB.nameAccount) {
      // Name-and-password accounts: their name is already unique, used as the nickname.
      const r = await claimNick(G.DB.save.name);
      if (!r.ok) return 'need-nick';
    } else return 'need-nick';
    online();
    return 'ok';
  }

  /** Reserves a unique nickname and creates the public profile. */
  async function claimNick(name) {
    name = (name || '').trim();
    if (!VALID.test(name)) return { ok: false, error: 'El apodo debe tener 3-16 letras, números o _.' };
    const lower = name.toLowerCase();
    try {
      await fb.fs.runTransaction(async tx => {
        const nref = fb.fs.collection('names').doc(lower);
        const n = await tx.get(nref);
        if (n.exists && n.data().uid !== uid) throw { code: 'taken' };
        if (!n.exists) tx.set(nref, { uid });
        tx.set(fb.fs.collection('profiles').doc(uid),
          { name, lower, at: firebase.firestore.FieldValue.serverTimestamp() });
      });
    } catch (e) {
      if (e && e.code === 'taken') return { ok: false, error: 'Ese apodo ya lo tiene otro jugador.' };
      return { ok: false, error: 'No se pudo guardar el apodo (' + ((e && e.code) || 'error') + ').' };
    }
    me = { uid, name };
    try { localStorage.setItem('ps.nick.' + uid, name); } catch (e) { /* nada */ }
    G.DB.setName(name);
    if (started && !beatT) online();
    publishProfile(true);
    return { ok: true };
  }

  /** Presence (heartbeat), friends and invitations. None of this uses the Realtime Database. */
  function online() {
    if (beatT) return;                        // ya estaba en marcha
    if (fb.rtdb) fb.rtdb.goOffline();         // connects only on entering a room
    writeStatus();
    clearInterval(beatT);
    beatT = setInterval(() => { if (document.visibilityState === 'visible') writeStatus(); }, BEAT);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);
    listenFriends();
  }

  /** Room invitations: they can only come from friends, so with no friends it does not listen (reads). */
  function listenInvites() {
    if (unInv || !fb) return;
    unInv = fb.fs.collection('inv').where('to', '==', uid).onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        const v = ch.doc.data();
        if (ch.type === 'removed') { invites.delete(v.from); emit('invites'); return; }
        onInvite(ch.doc.ref, v);
      });
    }, e => console.warn('[Social] invitaciones:', e.code || e.message));
  }

  let playing = false, lastBeat = 0;
  /** Is there anyone who can read your "online"? (only confirmed friends) */
  const hasFriends = () => [...friends.values()].some(f => f.status === 'ok');
  function writeStatus(on = true) {
    // With no friends no one reads it: a write is not spent (Firebase daily quota).
    if (!fb || !me || !hasFriends()) return;
    lastBeat = Date.now();
    fb.fs.collection('pres').doc(uid).set({ on, at: fts(), room: room ? room.id : '', play: playing }).catch(() => {});
  }
  function setPlaying(p) { if (playing !== !!p) { playing = !!p; writeStatus(); } }
  // On returning to the tab after a while, a heartbeat; on closing it, "offline".
  function onVisible() { if (document.visibilityState === 'visible' && Date.now() - lastBeat > BEAT) writeStatus(); }
  function onHide() { writeStatus(false); }

  async function stop(why) {
    if (!started) return;
    await leaveRoom().catch(() => {});
    if (unFriends) { unFriends(); unFriends = null; }
    if (unInv) { unInv(); unInv = null; }
    clearInterval(beatT); beatT = 0;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pagehide', onHide);
    if (me) await fb.fs.collection('pres').doc(uid).delete().catch(() => {});
    if (why === 'delete') {
      try { localStorage.removeItem('ps.nick.' + uid); } catch (e) { /* nada */ }
      await deleteAll().catch(e => console.warn('[Social] borrar:', e));
    }
    friends.clear(); invites.clear(); sentInv.clear(); pres.clear(); presAt = 0;
    me = null; started = false; fb = null; uid = null; playing = false;
    emit('stop');
  }

  /** On deleting the account: friendships, ranking records, profile and nickname. */
  async function deleteAll() {
    // Each step separately: if one fails, the rest are deleted anyway.
    const step = async (what, fn) => { try { await fn(); } catch (e) { console.warn('[Social] no se pudo borrar ' + what + ':', e.code || e.message); } };
    const del = async q => { const s = await q.get(); await Promise.all(s.docs.map(d => d.ref.delete().catch(() => {}))); };
    await step('amistades', () => del(fb.fs.collection('friendships').where('users', 'array-contains', uid)));
    await step('filas del ranking', () => G.Ranking.removeMine());
    await step('invitaciones', () => del(fb.fs.collection('inv').where('to', '==', uid)));
    await step('marcas', () => del(fb.fs.collectionGroup('e').where('uids', 'array-contains', uid)));
    await step('partida en curso', () => fb.fs.collection('runs').doc(uid).delete());
    await step('apodo', async () => {
      const prof = await fb.fs.collection('profiles').doc(uid).get();
      const lower = prof.exists ? prof.data().lower : me && me.name.toLowerCase();
      if (lower) await fb.fs.collection('names').doc(lower).delete().catch(() => {});
      if (prof.exists) await fb.fs.collection('profiles').doc(uid).delete();
    });
  }

  // ---------------- amigos ----------------

  function listenFriends() {
    unFriends = fb.fs.collection('friendships').where('users', 'array-contains', uid).onSnapshot(snap => {
      const next = new Map();
      snap.forEach(d => {
        const f = d.data();
        const other = f.users[0] === uid ? f.users[1] : f.users[0];
        next.set(other, Object.assign({
          uid: other, pid: d.id, name: (f.names && f.names[other]) || '???',
          status: f.status === 'ok' ? 'ok' : f.to === uid ? 'in' : 'out',
          online: false, play: false, room: '', seen: 0
        }, pres.get(other) || {}));
      });
      // A new friend (or just accepted): it checks if they are online.
      const added = [...next.values()].some(f => f.status === 'ok' && (!friends.has(f.uid) || friends.get(f.uid).status !== 'ok'));
      const hadFriends = hasFriends();
      friends = next;
      emit('friends');
      // Your first friend: now there is someone to read your "online" and invite you.
      if (!hadFriends && hasFriends()) writeStatus();
      if (hasFriends()) listenInvites();
      // It checks if they are online a moment later: your friend has also just
      // received the friendship and is recording their "online" at the same time.
      if (added) setTimeout(() => { if (started) refreshPresence(true); }, 2500);
    }, e => console.warn('[Social] amigos:', e.code || e.message));
  }

  /**
   * Reads your friends' "online" (1 read per friend). It is only called on
   * opening Friends or the room, and what is read lasts 1 min.
   */
  async function refreshPresence(force = false) {
    if (!fb || (!force && Date.now() - presAt < PRES_TTL)) return;
    presAt = Date.now();
    const ok = [...friends.values()].filter(f => f.status === 'ok');
    const docs = await Promise.all(ok.map(f => fb.fs.collection('pres').doc(f.uid).get().catch(() => null)));
    const t = now();
    ok.forEach((f, i) => {
      const v = docs[i] && docs[i].exists ? docs[i].data() : null;
      const on = !!(v && v.on && t - msOf(v.at) < ONLINE);
      const p = { online: on, play: !!(on && v.play), room: on ? v.room : '', seen: v ? msOf(v.at) : 0 };
      pres.set(f.uid, p);
      // The friends list may have refreshed while reading: it is applied to the current one.
      const cur = friends.get(f.uid);
      if (cur) Object.assign(cur, p);
    });
    emit('presence');
  }

  /** Sends a friend request (or accepts the one they already sent you). */
  async function request(name) {
    name = (name || '').trim();
    if (!me) return { ok: false, error: 'Primero elige tu apodo.' };
    if (!VALID.test(name)) return { ok: false, error: 'Escribe el apodo exacto de tu amigo.' };
    const n = await fb.fs.collection('names').doc(name.toLowerCase()).get().catch(() => null);
    if (!n || !n.exists) return { ok: false, error: 'No hay ningún jugador con ese apodo.' };
    const other = n.data().uid;
    if (other === uid) return { ok: false, error: 'Ese eres tú.' };
    const f = friends.get(other);
    if (f && f.status === 'ok') return { ok: false, error: 'Ya sois amigos.' };
    if (f && f.status === 'out') return { ok: false, error: 'Ya le enviaste una solicitud.' };
    if (f && f.status === 'in') return accept(other);
    const prof = await fb.fs.collection('profiles').doc(other).get().catch(() => null);
    const otherName = prof && prof.exists ? prof.data().name : name;
    const users = [uid, other].sort();
    try {
      await fb.fs.collection('friendships').doc(users[0] + '_' + users[1]).set({
        users, from: uid, to: other, status: 'pending',
        names: { [uid]: me.name, [other]: otherName },
        at: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { ok: true, msg: 'Solicitud enviada a ' + otherName };
    } catch (e) { return { ok: false, error: 'No se pudo enviar (' + (e.code || 'error') + ').' }; }
  }

  async function accept(other) {
    const f = friends.get(other);
    if (!f || f.status !== 'in') return { ok: false, error: 'No hay solicitud.' };
    try {
      await fb.fs.collection('friendships').doc(f.pid).update({
        status: 'ok', at: firebase.firestore.FieldValue.serverTimestamp(), ['names.' + uid]: me.name
      });
      return { ok: true, msg: 'Ahora eres amigo de ' + f.name };
    } catch (e) { return { ok: false, error: 'No se pudo aceptar (' + (e.code || 'error') + ').' }; }
  }

  async function remove(other) {
    const f = friends.get(other);
    if (!f) return { ok: false };
    try { await fb.fs.collection('friendships').doc(f.pid).delete(); return { ok: true }; }
    catch (e) { return { ok: false, error: 'No se pudo borrar (' + (e.code || 'error') + ').' }; }
  }

  // ---------------- salas ----------------

  function memberInfo() {
    const s = G.DB.save;
    return { name: me.name, dex: s.partner, shiny: !!s.partnerShiny && G.DB.ownsShiny(s.partner), at: ts() };
  }

  /**
   * The Realtime Database only connects while you are in a room: each
   * open connection uses downloads (charged beyond 360 MB a day).
   * (On 2026-10-11 there was an online-people counter that kept it always
   * connected; it was removed for that reason.)
   */
  function rtOn() { if (fb.rtdb) fb.rtdb.goOnline(); }
  function rtOff() { if (fb && fb.rtdb && !room) fb.rtdb.goOffline(); }

  async function createRoom() {
    if (room) return room;
    rtOn();
    const id = fb.rtdb.ref('rooms').push().key;
    await fb.rtdb.ref('rooms/' + id).set({ host: uid, open: true, at: ts(), m: { [uid]: memberInfo() } });
    enterRoom(id, uid);
    return room;
  }

  async function joinRoom(id) {
    if (room && room.id === id) return { ok: true };
    if (room) await leaveRoom();
    rtOn();
    let open = null, host = null;
    try {
      open = (await fb.rtdb.ref('rooms/' + id + '/open').get()).val();
      host = (await fb.rtdb.ref('rooms/' + id + '/host').get()).val();
    } catch (e) { /* sala borrada */ }
    if (!host) { rtOff(); return { ok: false, error: 'Esa sala ya no existe.' }; }
    if (open !== true) { rtOff(); return { ok: false, error: 'La partida de esa sala ya ha empezado.' }; }
    try { await fb.rtdb.ref('rooms/' + id + '/m/' + uid).set(memberInfo()); }
    catch (e) { rtOff(); return { ok: false, error: 'No se pudo entrar en la sala.' }; }
    const n = (await fb.rtdb.ref('rooms/' + id + '/m').get()).numChildren();
    if (n > MAX_PLAYERS) {
      await fb.rtdb.ref('rooms/' + id + '/m/' + uid).remove();
      rtOff();
      return { ok: false, error: 'La sala está llena (máximo ' + MAX_PLAYERS + ').' };
    }
    enterRoom(id, host);
    return { ok: true };
  }

  function enterRoom(id, host) {
    room = { id, host, isHost: host === uid, members: [], open: true };
    watchRoomDisconnect();
    const mref = fb.rtdb.ref('rooms/' + id + '/m');
    mref.on('value', s => {
      if (!room || room.id !== id) return;
      const m = s.val() || {};
      // The host always first; the rest in order of arrival.
      room.members = Object.keys(m).map(k => Object.assign({ uid: k }, m[k]))
        .sort((a, b) => (a.uid === room.host ? -1 : b.uid === room.host ? 1 : (a.at || 0) - (b.at || 0)));
      emit('room');
    }, () => closedRoom());
    const href = fb.rtdb.ref('rooms/' + id + '/host');
    href.on('value', s => { if (room && room.id === id && !s.val()) closedRoom(); }, () => closedRoom());
    const oref = fb.rtdb.ref('rooms/' + id + '/open');
    oref.on('value', s => { if (room && room.id === id) { room.open = s.val() === true; emit('room'); } }, () => {});
    roomRefs = [mref, href, oref];
    writeStatus();
    emit('room');
  }

  /** If the browser closes, the room (host) or your spot (guest) are deleted on their own. */
  function watchRoomDisconnect() {
    if (!room) return;
    const ref = room.isHost ? fb.rtdb.ref('rooms/' + room.id) : fb.rtdb.ref('rooms/' + room.id + '/m/' + uid);
    ref.onDisconnect().remove();
  }

  function detachRoom() {
    for (const r of roomRefs) r.off();
    roomRefs = [];
  }

  function closedRoom() {
    if (!room) return;
    detachRoom();
    room = null;
    retractInvites();
    writeStatus();
    rtOff();
    emit('room-closed');
  }

  async function leaveRoom() {
    if (!room) return;
    const r = room;
    detachRoom();
    room = null;
    const ref = r.isHost ? fb.rtdb.ref('rooms/' + r.id) : fb.rtdb.ref('rooms/' + r.id + '/m/' + uid);
    ref.onDisconnect().cancel().catch(() => {});
    await ref.remove().catch(() => {});
    retractInvites();
    writeStatus();
    rtOff();
    emit('room');
  }

  /** The host closes the room to new players when starting the game. */
  function setOpen(open) {
    if (room && room.isHost) fb.rtdb.ref('rooms/' + room.id + '/open').set(!!open).catch(() => {});
  }

  /** Updates your Pokemon in the room (if you change companion). */
  function refreshMember() {
    if (room && me) fb.rtdb.ref('rooms/' + room.id + '/m/' + uid).update(
      { dex: G.DB.save.partner, shiny: !!G.DB.save.partnerShiny && G.DB.ownsShiny(G.DB.save.partner) }).catch(() => {});
  }

  // ---------------- invitaciones ----------------

  async function invite(other) {
    const f = friends.get(other);
    if (!f || f.status !== 'ok') return { ok: false, error: 'Sólo puedes invitar a tus amigos.' };
    if (room && room.members.length >= MAX_PLAYERS) return { ok: false, error: 'La sala está llena.' };
    if (room && !room.isHost) return { ok: false, error: 'Sólo el anfitrión de la sala puede invitar.' };
    if (!room) await createRoom();
    try {
      await fb.fs.collection('inv').doc(other + '_' + uid).set({ to: other, from: uid, room: room.id, name: me.name, at: fts() });
    } catch (e) { return { ok: false, error: 'No se pudo invitar (' + (e.code || 'error') + ').' }; }
    sentInv.add(other);
    return { ok: true, msg: 'Invitación enviada a ' + f.name };
  }

  /** Withdraws the invitations you sent (on leaving the room). */
  function retractInvites() {
    if (!fb) return;
    for (const o of sentInv) fb.fs.collection('inv').doc(o + '_' + uid).delete().catch(() => {});
    sentInv.clear();
  }

  function onInvite(ref, v) {
    // The expired ones are deleted; only ones from confirmed friends are accepted.
    if (!v || (v.at && now() - msOf(v.at) > INVITE_TTL)) { ref.delete().catch(() => {}); return; }
    const f = friends.get(v.from);
    if (f && f.status !== 'ok') return;
    invites.set(v.from, { from: v.from, name: v.name, room: v.room, at: msOf(v.at) || now() });
    emit('invites');
  }

  const invDoc = from => fb.fs.collection('inv').doc(uid + '_' + from);

  async function acceptInvite(from) {
    const inv = invites.get(from);
    if (!inv || now() - inv.at > INVITE_TTL) { invites.delete(from); emit('invites'); return { ok: false, error: 'La invitación ha caducado.' }; }
    invites.delete(from);
    invDoc(from).delete().catch(() => {});
    emit('invites');
    return joinRoom(inv.room);
  }

  function declineInvite(from) {
    invites.delete(from);
    invDoc(from).delete().catch(() => {});
    emit('invites');
  }

  // ---------------- public profile ----------------

  /** What is shown about you (also for your preview, without uploading it). */
  function profileData() {
    const s = G.DB.save, st = s.stats, prof = s.profile || {};
    const unlocked = G.AchDefs.LIST.filter(a => s.ach && s.ach[a.id]);
    const medals = unlocked.slice().sort((a, b) => (b.tier - a.tier) || (s.ach[b.id] - s.ach[a.id])).slice(0, 8).map(a => a.id);
    return {
      name: me ? me.name : G.DB.user,
      favs: (prof.favs || []).slice(0, 3).map(f => ({ dex: f.dex | 0, shiny: !!f.shiny })),
      title: prof.title || '',
      best: { solo: st.bestTime | 0, group: st.bestGroupTime | 0, level: st.bestLevel | 0, bosses: st.bossesTotal | 0,
              legends: Object.keys(s.legends || {}).length, kills: st.totalKills | 0, medals: unlocked.length },
      medals
    };
  }

  let pubT = 0, pubAt = 0, pubLast = '';
  /**
   * Uploads your profile (with a little delay, in case you change several things
   * in a row), but ONLY if something visible at a glance changed:
   * time and level records, legendaries, medals, title or favorites.
   * Bosses and defeats (which change every game) are uploaded with the rest
   * when due, not on their own: the profile was being written 200,000 times a day
   * (2026-10-13). If you change favorites or title (force), right away.
   */
  function publishProfile(force = false) {
    if (!me || !fb) return;
    if (!force && Date.now() - pubAt < 2 * 3600 * 1000) return;    // como mucho cada 2 h (era 30 min)
    clearTimeout(pubT);
    pubT = setTimeout(() => {
      if (!me || !fb) return;
      const d = profileData();
      // To decide whether to upload (remembered between sessions): without bosses or defeated.
      const key = JSON.stringify(Object.assign({}, d, { best: Object.assign({}, d.best, { kills: 0, bosses: 0 }) }));
      const lsKey = 'ps.pub.' + uid;
      if (!pubLast) { try { pubLast = localStorage.getItem(lsKey) || ''; } catch (e) { /* nada */ } }
      if (key === pubLast) return;
      pubLast = key; pubAt = Date.now();
      try { localStorage.setItem(lsKey, key); } catch (e) { /* nada */ }
      fb.fs.collection('profiles').doc(uid).set(Object.assign(d, {
        name: me.name, lower: me.name.toLowerCase(), at: firebase.firestore.FieldValue.serverTimestamp()
      })).catch(e => { pubLast = ''; console.warn('[Social] perfil:', e.code || e.message); });
    }, 800);
  }

  /** Another player's public profile. */
  const profCache = new Map();
  async function getProfile(other) {
    if (!fb) return null;
    // Yours comes from your save (reading nothing and always up to date).
    if (other === uid && me) return Object.assign(profileData(), { name: me.name });
    const c = profCache.get(other);
    if (c && Date.now() - c.at < 10 * 60 * 1000) return c.v;     // what is read lasts 10 min
    const d = await fb.fs.collection('profiles').doc(other).get().catch(() => null);
    const v = d && d.exists ? d.data() : null;
    profCache.set(other, { at: Date.now(), v });
    return v;
  }

  // On signing out or deleting the account.
  G.DB.onLeave(why => stop(why));

  return {
    start, stop, claimNick, request, accept, remove, publishProfile, getProfile, profileData,
    createRoom, joinRoom, leaveRoom, setOpen, refreshMember, setPlaying, refreshPresence,
    invite, acceptInvite, declineInvite,
    on(fn) { listeners.add(fn); }, off(fn) { listeners.delete(fn); },
    get me() { return me; },
    get started() { return started; },
    get friends() { return [...friends.values()]; },
    get invites() { return [...invites.values()]; },
    get room() { return room; },
    get uid() { return uid; },
    /** The real time (corrects the device clock if it is off). */
    now,
    VALID, MAX_PLAYERS
  };
})();
