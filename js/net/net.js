/* ============ net.js — connection between the players in a room ============
 * Star topology: the HOST talks with each guest; the guests
 * only talk with the host (it forwards whatever is needed).
 *
 * Dos caminos, a la vez:
 *   direct   WebRTC (data channel between browsers, without going through any
 *            server). The negotiation (signaling) goes through the database.
 *            If the network does not allow a direct connection (some routers and mobile
 *            mobile), WebRTC goes through Cloudflare's TURN (it is still
 *            "direct" for the game). The keys are given by cloudflare/turn-worker.js
 *            only to players with an account.
 *   relay    If not even then (or the Worker does not respond), the messages go through the
 *            Realtime Database: rooms/{sala}/q/{destinatario}/{id}. Funciona,
 *            but it costs $1 per GB: before TURN it was almost all the cost.
 *
 * It is sent over the direct channel if open; otherwise, over the relay. The one that
 * receives listens to both, so there is no need to agree.
 *
 * API:  open(roomId, isHost, hostUid) · close() · send(to, msg) · toHost(msg)
 *       broadcast(msg) · on(fn(from, msg)) · onPeer(fn(uid, state))
 *       peers() · mode(uid) -> 'connecting' | 'direct' | 'relay' | 'closed'
 */
G.Net = (() => {
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
               { urls: 'stun:stun.cloudflare.com:3478' }];
  const DIRECT_TIMEOUT = 9000;     // ms to get a direct channel before using the relay
  // Relay via the Realtime Database OFF (2026-10-12): at $1 per GB it was the biggest
  // co-op cost. Without a direct connection or TURN, that pair cannot play
  // together ('failed') and the host retries every RETRY_MS. Through the database
  // only the signaling goes (a few small messages to connect).
  const ALLOW_RELAY = false, RETRY_MS = 15000;

  // ---------------- TURN (Cloudflare) ----------------
  const TURN_URL = 'https://turn.pokesurvivor.com/';
  let turn = null, turnAt = 0, turnReq = null;
  /** Requests (or reuses) TURN credentials. It never fails: without them, it continues as before. */
  function fetchTurn() {
    const fb = G.DB.fb;
    if (!fb || fb.emulator || !fb.auth || !fb.auth.currentUser) return Promise.resolve(null);
    if (turn && Date.now() - turnAt < (turn.ttl - 600) * 1000) return Promise.resolve(turn);
    if (turnReq) return turnReq;
    turnReq = fb.auth.currentUser.getIdToken()
      .then(tok => fetch(TURN_URL, { headers: { Authorization: 'Bearer ' + tok } }))
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j && j.iceServers) { turn = { servers: [].concat(j.iceServers), ttl: j.ttl || 3600 }; turnAt = Date.now(); }
        return turn;
      })
      .catch(e => { console.warn('[Net] TURN:', e.message); return null; })
      .finally(() => { turnReq = null; });
    return turnReq;
  }
  /** Waits for the credentials 2.5 s at most (if they take longer, it connects without them). */
  const waitTurn = () => Promise.race([fetchTurn(), new Promise(r => setTimeout(r, 2500))]);
  const iceServers = () => (turn ? ICE.concat(turn.servers) : ICE);

  let rtdb = null, uid = null, roomId = null, isHost = false, hostUid = null;
  let qref = null;
  const peers = new Map();         // uid -> { pc, dc, mode, timer }
  const handlers = new Set(), peerHandlers = new Set();
  let stats = { sent: 0, recv: 0, relaySent: 0 };

  function emitPeer(u) {
    const p = peers.get(u);
    peerHandlers.forEach(fn => { try { fn(u, p ? p.mode : 'closed'); } catch (e) { console.warn(e); } });
  }

  // ---------------- apertura ----------------

  function open(id, host, hostId) {
    if (roomId === id) return;
    close();
    const fb = G.DB.fb;
    rtdb = fb.rtdb; uid = fb.uid;
    roomId = id; isHost = host; hostUid = hostId;
    fetchTurn();                    // se piden ya, para tenerlas al conectar
    qref = rtdb.ref('rooms/' + id + '/q/' + uid);
    qref.on('child_added', s => {
      const raw = s.val();
      s.ref.remove().catch(() => {});
      let m;
      try { m = JSON.parse(raw); } catch (e) { return; }
      if (!m || !m.f) return;
      if (m.sig) onSignal(m.f, m.sig);
      else deliver(m.f, m.d);
    });
    // Guest: a slot for the host right away (replaced when its
    // offer arrives). This way, if it never arrives, the relay is used and you know when it leaves.
    if (!isHost) {
      const p = { pc: null, dc: null, mode: 'connecting', timer: 0 };
      p.timer = setTimeout(() => { if (p.mode === 'connecting') { p.mode = ALLOW_RELAY ? 'relay' : 'failed'; emitPeer(hostId); } }, DIRECT_TIMEOUT + 3000);
      peers.set(hostId, p);
    }
  }

  function close() {
    for (const u of [...peers.keys()]) drop(u);
    if (qref) { qref.off(); qref = null; }
    roomId = null; isHost = false; hostUid = null;
  }

  /** The host calls this when the room members change. */
  function syncMembers(uids) {
    if (!roomId) return;
    if (isHost) {
      for (const u of uids) if (u !== uid && !peers.has(u)) connect(u);
      for (const u of [...peers.keys()]) if (!uids.includes(u)) drop(u);
    } else if (!uids.includes(hostUid)) {
      drop(hostUid);
    }
  }

  // ---------------- WebRTC ----------------

  function newPeer(u) {
    const p = { pc: null, dc: null, mode: 'connecting', timer: 0 };
    peers.set(u, p);
    // No WebRTC (old or blocked browser): straight to the relay.
    let pc;
    try { pc = p.pc = new RTCPeerConnection({ iceServers: iceServers() }); }
    catch (e) { p.mode = 'relay'; emitPeer(u); return p; }
    pc.onicecandidate = e => { if (e.candidate) signal(u, { c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && p.mode !== 'closed') useRelay(u);
    };
    // If there is no direct channel within a few seconds, the relay is used.
    p.timer = setTimeout(() => { if (p.mode === 'connecting') useRelay(u); }, DIRECT_TIMEOUT);
    emitPeer(u);
    return p;
  }

  function wireChannel(u, p, dc) {
    p.dc = dc;
    dc.onopen = () => { clearTimeout(p.timer); p.mode = 'direct'; emitPeer(u); checkTurn(p); };
    dc.onclose = () => { if (p.mode === 'direct') { p.mode = 'connecting'; useRelay(u); } };
    dc.onmessage = e => {
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      deliver(u, m);
    };
  }

  /**
   * Does the "direct" channel actually go through Cloudflare's TURN? Then it
   * sends less often (see coop.js): TURN is paid per GB beyond 1,000 a month.
   */
  async function checkTurn(p) {
    try {
      const st = await p.pc.getStats();
      st.forEach(s => {
        if (s.type !== 'candidate-pair' || !s.nominated || s.state !== 'succeeded') return;
        const l = st.get(s.localCandidateId), r = st.get(s.remoteCandidateId);
        if ((l && l.candidateType === 'relay') || (r && r.candidateType === 'relay')) p.turn = true;
      });
    } catch (e) { /* nada */ }
  }

  function useRelay(u) {
    const p = peers.get(u);
    if (!p || p.mode === 'direct' || p.mode === 'closed' || p.mode === 'failed') return;
    if (ALLOW_RELAY) { p.mode = 'relay'; emitPeer(u); return; }
    // No relay: you cannot play with that person for now. The host retries.
    clearTimeout(p.timer);
    p.mode = 'failed';
    try { if (p.pc) p.pc.close(); } catch (e) { /* nada */ }
    emitPeer(u);
    if (isHost) p.timer = setTimeout(() => { if (peers.get(u) === p && p.mode === 'failed' && roomId) { drop(u, true); connect(u); } }, RETRY_MS);
  }

  /** Host: opens a connection with a guest. */
  async function connect(u) {
    await waitTurn();
    if (!roomId || peers.has(u)) return;
    const p = newPeer(u);
    if (!p.pc) return;
    wireChannel(u, p, p.pc.createDataChannel('g', { ordered: true }));
    try {
      const offer = await p.pc.createOffer();
      await p.pc.setLocalDescription(offer);
      signal(u, { sdp: p.pc.localDescription.toJSON() });
    } catch (e) { useRelay(u); }
  }

  const pendingIce = new Map();     // candidatos que llegan antes que la oferta

  async function onSignal(from, sig) {
    let p = peers.get(from);
    try {
      if (sig.sdp && sig.sdp.type === 'offer') {
        if (isHost) return;
        if (p) drop(from, true);
        await waitTurn();
        p = newPeer(from);
        if (!p.pc) return;
        p.pc.ondatachannel = e => wireChannel(from, p, e.channel);
        await p.pc.setRemoteDescription(sig.sdp);
        const ans = await p.pc.createAnswer();
        await p.pc.setLocalDescription(ans);
        signal(from, { sdp: p.pc.localDescription.toJSON() });
        for (const c of pendingIce.get(from) || []) await p.pc.addIceCandidate(c).catch(() => {});
        pendingIce.delete(from);
      } else if (sig.sdp && sig.sdp.type === 'answer') {
        if (p && p.pc) await p.pc.setRemoteDescription(sig.sdp);
      } else if (sig.c) {
        if (p && p.pc && p.pc.remoteDescription) await p.pc.addIceCandidate(sig.c).catch(() => {});
        else { if (!pendingIce.has(from)) pendingIce.set(from, []); pendingIce.get(from).push(sig.c); }
      }
    } catch (e) {
      console.warn('[Net] señalización:', e.message);
      useRelay(from);
    }
  }

  function signal(to, sig) { relayPush(to, { f: uid, sig }); }

  function drop(u, silent) {
    const p = peers.get(u);
    if (!p) return;
    clearTimeout(p.timer);
    p.mode = 'closed';
    try { if (p.dc) p.dc.close(); } catch (e) { /* nada */ }
    try { if (p.pc) p.pc.close(); } catch (e) { /* nada */ }
    peers.delete(u);
    if (!silent) emitPeer(u);
  }

  // ---------------- send / receive ----------------

  function relayPush(to, env) {
    if (!rtdb || !roomId) return;
    rtdb.ref('rooms/' + roomId + '/q/' + to).push(JSON.stringify(env)).catch(e => console.warn('[Net] relé:', e.code || e.message));
  }

  function send(to, msg) {
    if (!roomId) return;
    const p = peers.get(to);
    stats.sent++;
    if (p && p.dc && p.dc.readyState === 'open') {
      try { p.dc.send(JSON.stringify(msg)); return; } catch (e) { /* falls to the relay */ }
    }
    // Without a relay, the game data does not go through the database (lost: that
    // pair is not connected). Only the start notice goes through.
    if (!ALLOW_RELAY && !(msg && msg.k === 'start')) return;
    stats.relaySent++;
    relayPush(to, { f: uid, d: msg });
  }

  function toHost(msg) { if (!isHost && hostUid) send(hostUid, msg); }
  function broadcast(msg, except) { for (const u of peers.keys()) if (u !== except) send(u, msg); }

  function deliver(from, msg) {
    stats.recv++;
    handlers.forEach(fn => { try { fn(from, msg); } catch (e) { console.error('[Net] mensaje:', e); } });
  }

  return {
    open, close, syncMembers, send, toHost, broadcast,
    on(fn) { handlers.add(fn); }, off(fn) { handlers.delete(fn); },
    onPeer(fn) { peerHandlers.add(fn); },
    mode(u) { const p = peers.get(u); return p ? p.mode : 'closed'; },
    /** Is it going over the relay (or no connection)? Then it is sent less often. */
    slow(u) { const p = peers.get(u); return !p || p.mode !== 'direct'; },
    /** Is it direct but through Cloudflare's TURN? (sent a bit less) */
    viaTurn(u) { const p = peers.get(u); return !!p && p.mode === 'direct' && !!p.turn; },
    peers() { return [...peers.keys()]; },
    get open_() { return !!roomId; },
    get isHost() { return isHost; },
    get uid() { return uid; },
    get hostUid() { return hostUid; },
    stats,
    /** Are there TURN credentials? (for testing and diagnostics) */
    get turn() { return !!turn; }
  };
})();
