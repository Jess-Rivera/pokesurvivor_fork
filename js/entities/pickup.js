/* ============ pickup.js — experience orbs and items ============
 * The orbs stay still until you enter the magnet radius; then
 * accelerate toward you. So thousands do not pile up, past MAX they merge
 * the oldest ones.
 *
 * Co-op: the objects are created by the host (each with its id) and the
 * others receive a copy. They all fly toward the nearest player; who
 * decides who picked it up is the host.
 */
G.Pickups = (() => {
  let list = [];
  const MAX = 420;
  let nextId = 1;

  const KIND = {
    xp:    { color: '#7fe0ff', glow: '#2a8fd0', r: 4.5 },
    xpBig: { color: '#ffd95e', glow: '#c08a10', r: 7 },
    heal:  { color: '#5fe08a', glow: '#1f8f4d', r: 6.5 },
    magnet:{ color: '#ff9ed8', glow: '#b03d84', r: 6.5 },
    bomb:  { color: '#ff7b3d', glow: '#b03d10', r: 6.5 },
    coin:  { color: '#ffd23f', glow: '#b8860b', r: 5.5 },
    ticket:   { color: '#ffd23f', glow: '#c08a10', r: 7 },
    ticket10: { color: '#c47bff', glow: '#8a3fd0', r: 8 },
    item:     { color: '#ffd23f', glow: '#c08a10', r: 9 }       // value = id del objeto
  };
  /** Chance that a normal Pokemon drops a gacha ticket. */
  const BOSS_T10 = 1 / 3;               // ticket ×10 de un jefe normal
  const LEGEND_T10 = 1 / 2;             // ticket ×10 del legendario de la grieta
  const BIG_XP_SHARE = 0.05;           // an orb worth >= 5% of the next level draws as the big one
  const TICKET_RATE = 1 / 400;          // (was 1/260; rarer since 2026-10-10)

  function clear() { list = []; }
  function all() { return list; }

  function push(o) {
    // In co-op only the host creates objects (the copies arrive over the network).
    if (G.Coop.active && !G.Coop.isHost) return;
    o.id = nextId++;
    list.push(o);
    if (G.Coop.isHost) G.Coop.pickupAdded(o);
    if (list.length > MAX) {
      // Merges the two oldest XP ones to avoid growing without limit.
      const i = list.findIndex(p => p.kind === 'xp' || p.kind === 'xpBig');
      if (i >= 0) {
        const a = list.splice(i, 1)[0];
        const j = list.findIndex(p => p.kind === 'xp' || p.kind === 'xpBig');
        if (j >= 0) { list[j].value += a.value; list[j].kind = 'xpBig'; }
        if (G.Coop.isHost) G.Coop.pickupGone(a.id);
      } else {
        const a = list.shift();
        if (G.Coop.isHost) G.Coop.pickupGone(a.id);
      }
    }
  }

  /** Copy of a host's object. */
  function addRemote(id, kind, x, y, value) {
    if (list.some(p => p.id === id)) return;
    const o = orb(kind, x, y, value);
    o.id = id;
    list.push(o);
  }

  function removeId(id) {
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return null;
    return list.splice(i, 1)[0];
  }

  /** Magnet: everything flies toward the nearest player. */
  function pullAll() { for (const o of list) o.pulled = true; }

  /** @param plain  experience only (the legendaries of Arceus's Judgment) */
  function dropXp(x, y, value, boss = false, legend = false, plain = false) {
    if (boss) {
      // Bosses burst into a bunch of big orbs + rewards.
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.2832, d = G.U.rand(10, 70);
        push(orb('xpBig', x + Math.cos(a) * d, y + Math.sin(a) * d, Math.ceil(value / 14)));
      }
      if (plain) return;
      push(orb('heal', x + 24, y, 0));
      push(orb('magnet', x - 24, y, 0));
      // x10 ticket: always the rift legendary; a normal boss, 1 in 3 times.
      // (Until 2026-10-12 the rift legendary always gave 2: too many came out.)
      if (Math.random() < (legend ? LEGEND_T10 : BOSS_T10)) push(orb('ticket10', x, y - 20, 1));
      return;
    }
    // Big orb = worth at least BIG_XP_SHARE of the next level (was a flat 20 XP).
    const lead = G.Game.everyone()[0];
    push(orb(lead && value >= lead.xpNext * BIG_XP_SHARE ? 'xpBig' : 'xp', x, y, value));
    if (Math.random() < TICKET_RATE) push(orb('ticket', x + G.U.rand(-6, 6), y, 1));

    // Drops ocasionales.
    const r = Math.random();
    if (r < 0.012) push(orb('heal', x + G.U.rand(-8, 8), y, 0));
    else if (r < 0.020) push(orb('magnet', x, y, 0));
    else if (r < 0.026) push(orb('bomb', x, y, 0));
  }

  /** Suelta un objeto suelto: 'heal' | 'magnet' | 'bomb' | 'coin'. */
  function drop(kind, x, y, value = 0) {
    push(orb(kind, x, y, value));
  }

  function orb(kind, x, y, value) {
    const a = Math.random() * 6.2832;
    return {
      kind, x, y, value,
      vx: Math.cos(a) * G.U.rand(10, 46), vy: Math.sin(a) * G.U.rand(10, 46),
      t: Math.random() * 6.28, pulled: false
    };
  }

  /**
   * @param players  a player or the list of players (the downed ones do not pick up)
   * @param onCollect(pickup, jugador)
   */
  function update(dt, players, onCollect) {
    if (!Array.isArray(players)) players = [players];
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t += dt * 4;

      // The nearest live player (solo, always you).
      let pl = null, d2 = Infinity;
      for (const o of players) {
        if (o.dead && players.length > 1) continue;
        const dd = G.U.dist2(o.x, o.y, p.x, p.y);
        if (dd < d2) { d2 = dd; pl = o; }
      }
      if (!pl) continue;
      const dx = pl.x - p.x, dy = pl.y - p.y;
      const mag2 = pl.magnet * pl.magnet;

      if (p.pulled || d2 < mag2) {
        p.pulled = true;
        const d = Math.sqrt(d2) || 1;
        const pull = 240 + 1400 / d;
        p.vx = G.U.damp(p.vx, (dx / d) * pull, 7, dt);
        p.vy = G.U.damp(p.vy, (dy / d) * pull, 7, dt);
      } else {
        p.vx *= Math.pow(0.02, dt);
        p.vy *= Math.pow(0.02, dt);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (d2 < 15 * 15) {
        list.splice(i, 1);
        onCollect(p, pl);
      }
    }
  }

  function draw(ctx) {
    for (const p of list) {
      if (!G.Camera.sees(p.x, p.y, 30)) continue;
      const k = KIND[p.kind];
      const bounce = Math.abs(Math.sin(p.t * 0.8)) * 3;
      const r = k.r;
      const y = p.y - 6 - bounce;

      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.9, r * 0.35, 0, 0, 6.2832); ctx.fill();

      ctx.globalAlpha = 0.3;
      ctx.fillStyle = k.glow;
      ctx.beginPath(); ctx.arc(p.x, y, r * 2, 0, 6.2832); ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = k.color;
      if (p.kind === 'xp' || p.kind === 'xpBig') {
        ctx.beginPath();
        ctx.moveTo(p.x, y - r); ctx.lineTo(p.x + r * 0.78, y);
        ctx.lineTo(p.x, y + r); ctx.lineTo(p.x - r * 0.78, y);
        ctx.closePath(); ctx.fill();
      } else if (p.kind === 'coin') {
        // A spinning coin: an ellipse that narrows.
        const sx = Math.max(0.25, Math.abs(Math.cos(p.t * 0.9)));
        ctx.beginPath(); ctx.ellipse(p.x, y, r * sx, r, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#b8860b';
        ctx.beginPath(); ctx.ellipse(p.x, y, r * sx * 0.5, r * 0.5, 0, 0, 6.2832); ctx.fill();
      } else {
        // Berry, magnet and bomb: their pixel-art icon.
        const ICON = { heal: 'berry', magnet: 'magnet', bomb: 'bomb', ticket: 'ticket', ticket10: 'ticket10' };
        const sz = p.kind === 'ticket10' || p.kind === 'item' ? 24 : 18;
        if (p.kind === 'item') {
          // Item: a pulsing golden glow, so it is seen from afar.
          ctx.globalAlpha = 0.35 + Math.sin(p.t * 1.5) * 0.15;
          ctx.fillStyle = '#ffe14d';
          ctx.beginPath(); ctx.arc(p.x, y, 18, 0, 6.2832); ctx.fill();
          ctx.globalAlpha = 1;
        }
        G.Icons.draw(ctx, p.kind === 'item' ? p.value : ICON[p.kind], p.x - sz / 2, y - sz / 2 - 1, sz);
        continue;
      }
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.arc(p.x - r * 0.25, y - r * 0.3, r * 0.28, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return { clear, all, dropXp, drop, update, draw, addRemote, removeId, pullAll, KIND, get count() { return list.length; } };
})();
