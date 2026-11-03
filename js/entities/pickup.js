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
    xp: { color: '#7fe0ff', glow: '#2a8fd0', r: 4.5 },
    xpBig: { color: '#ffd95e', glow: '#c08a10', r: 7 },
    heal: { color: '#5fe08a', glow: '#1f8f4d', r: 6.5 },
    magnet: { color: '#ff9ed8', glow: '#b03d84', r: 6.5 },
    bomb: { color: '#ff7b3d', glow: '#b03d10', r: 6.5 },
    coin: { color: '#ffd23f', glow: '#b8860b', r: 5.5 },
    ticket: { color: '#ffd23f', glow: '#c08a10', r: 8 },
    ticket10: { color: '#c47bff', glow: '#8a3fd0', r: 8 },
    item: { color: '#ffd23f', glow: '#c08a10', r: 9 }, // value = id del objeto
    ground: { color: '#ffffff', glow: '#9fe8ff', r: 8 }, // ground item (data/ground-items.js), value = its id
  };
  /** Chance that a normal Pokemon drops a gacha ticket. */
  const BIG_XP_SHARE = 0.05; // an orb worth >= 5% of the next level draws as the big one
  const TICKET_RATE = 1 / 400; // (was 1/260; rarer since 2026-10-10)

  // Sprite pickups (data/pickup-sprites.js, 16 px art drawn at 1.5 world units per art pixel): the coin is the
  // ringed_gold coin, small XP the aqua gem and big XP the violet gem. Until a sheet has loaded they keep their drawn shapes.
  const SPR = { coin: { gold: true, size: 24 }, xp: { row: 'aqua', size: 24 }, xpBig: { row: 'violet', size: 24 } };
  const sheetImgs = {};
  function sheetImg(src) {
    let e = sheetImgs[src];
    if (!e) {
      e = sheetImgs[src] = { ready: false, img: new Image() };
      e.img.onload = () => {
        e.ready = true;
      };
      e.img.src = src;
    }
    return e.ready ? e.img : null;
  }
  /** Draws a pickup's spinning sprite centred on (x, y); false when it has none or its sheet is not loaded yet. */
  function drawSprite(ctx, p, x, y) {
    const S = SPR[p.kind],
      D = G.PickupSprites;
    if (!S || !D) return false;
    let sheet, ms, n, sy;
    if (S.gold) {
      sheet = D.gold;
      n = sheet.n;
      ms = sheet.ms;
      sy = sheet.y;
    } else {
      sheet = D.sheets.spin16;
      n = sheet.n;
      ms = sheet.ms;
      sy = D.rows.indexOf(S.row) * (sheet.cell + D.pad);
    }
    const img = sheetImg(sheet.src);
    if (!img) return false;
    // p.t runs 4 per second from a random start, so the coins and gems are out of step and the animation pauses with the game.
    const t = p.t * 250,
      per = ms[0] * n; // every frame of these rows lasts the same
    const f = Math.floor((t % per) / ms[0]) % n;
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      f * (sheet.cell + D.pad),
      sy,
      sheet.cell,
      sheet.cell,
      x - S.size / 2,
      y - S.size / 2,
      S.size,
      S.size
    );
    ctx.imageSmoothingEnabled = sm;
    return true;
  }

  function clear() {
    list = [];
  }
  function all() {
    return list;
  }

  function push(o) {
    // In co-op only the host creates objects (the copies arrive over the network).
    if (G.Coop.active && !G.Coop.isHost) return;
    o.id = nextId++;
    list.push(o);
    if (G.Coop.isHost) G.Coop.pickupAdded(o);
    if (list.length > MAX) {
      // Merges the two oldest XP ones to avoid growing without limit.
      const i = list.findIndex((p) => p.kind === 'xp' || p.kind === 'xpBig');
      if (i >= 0) {
        const a = list.splice(i, 1)[0];
        const j = list.findIndex((p) => p.kind === 'xp' || p.kind === 'xpBig');
        if (j >= 0) {
          list[j].value += a.value;
          list[j].kind = 'xpBig';
        }
        if (G.Coop.isHost) G.Coop.pickupGone(a.id);
      } else {
        const a = list.shift();
        if (G.Coop.isHost) G.Coop.pickupGone(a.id);
      }
    }
  }

  /** Copy of a host's object. */
  function addRemote(id, kind, x, y, value) {
    if (list.some((p) => p.id === id)) return;
    const o = orb(kind, x, y, value);
    o.id = id;
    list.push(o);
  }

  function removeId(id) {
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return null;
    return list.splice(i, 1)[0];
  }

  /** Magnet: everything flies toward the nearest player. */
  function pullAll() {
    for (const o of list) o.pulled = true;
  }

  /** @param burst  a burst of big orbs and nothing else (overworld elites) */
  function dropXp(x, y, value, burst = false) {
    if (burst) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.2832,
          d = G.U.rand(10, 70);
        push(orb('xpBig', x + Math.cos(a) * d, y + Math.sin(a) * d, Math.ceil(value / 14)));
      }
      return;
    }
    // Big orb = worth at least BIG_XP_SHARE of the next level (was a flat 20 XP).
    const lead = G.Game.everyone()[0];
    push(orb(lead && value >= lead.xpNext * BIG_XP_SHARE ? 'xpBig' : 'xp', x, y, value));
    if (Math.random() < TICKET_RATE) push(orb('ticket', x + G.U.rand(-6, 6), y, 1));

    // Drops ocasionales.
    const r = Math.random();
    if (r < 0.012) push(orb('heal', x + G.U.rand(-8, 8), y, 0));
    else if (r < 0.02) push(orb('magnet', x, y, 0));
    else if (r < 0.026) push(orb('bomb', x, y, 0));

    // Ground item (data/ground-items.js): its own roll, 1% plus the live Pinap bonus.
    if (Math.random() < G.Grounds.dropRate(lead))
      push(orb('ground', x + G.U.rand(-10, 10), y + G.U.rand(-6, 6), G.Grounds.roll()));
  }

  /** Suelta un objeto suelto: 'heal' | 'magnet' | 'bomb' | 'coin'. */
  function drop(kind, x, y, value = 0) {
    push(orb(kind, x, y, value));
  }

  function orb(kind, x, y, value) {
    const a = Math.random() * 6.2832;
    return {
      kind,
      x,
      y,
      value,
      vx: Math.cos(a) * G.U.rand(10, 46),
      vy: Math.sin(a) * G.U.rand(10, 46),
      t: Math.random() * 6.28,
      pulled: false,
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
      let pl = null,
        d2 = Infinity;
      for (const o of players) {
        if (o.dead && players.length > 1) continue;
        const dd = G.U.dist2(o.x, o.y, p.x, p.y);
        if (dd < d2) {
          d2 = dd;
          pl = o;
        }
      }
      if (!pl) continue;
      const dx = pl.x - p.x,
        dy = pl.y - p.y;
      const mag2 = pl.magnet * pl.magnet;

      // A status berry the team cannot take (bag full, or already holding that one) just sits there: no pull, no pickup.
      const stuck = p.kind === 'ground' && !G.Grounds.canTake(p.value, pl);
      if (!stuck && (p.pulled || d2 < mag2)) {
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

      if (!stuck && d2 < 15 * 15) {
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
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.9, r * 0.35, 0, 0, 6.2832);
      ctx.fill();

      if (!SPR[p.kind] || !G.PickupSprites) {
        // The spinning sprites need no glow; the drawn shapes and the other pickups keep it.
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = k.glow;
        ctx.beginPath();
        ctx.arc(p.x, y, r * 2, 0, 6.2832);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      if (drawSprite(ctx, p, p.x, y)) continue;
      ctx.fillStyle = k.color;
      if (p.kind === 'xp' || p.kind === 'xpBig') {
        ctx.beginPath();
        ctx.moveTo(p.x, y - r);
        ctx.lineTo(p.x + r * 0.78, y);
        ctx.lineTo(p.x, y + r);
        ctx.lineTo(p.x - r * 0.78, y);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'coin') {
        // A spinning coin: an ellipse that narrows.
        const sx = Math.max(0.25, Math.abs(Math.cos(p.t * 0.9)));
        ctx.beginPath();
        ctx.ellipse(p.x, y, r * sx, r, 0, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = '#b8860b';
        ctx.beginPath();
        ctx.ellipse(p.x, y, r * sx * 0.5, r * 0.5, 0, 0, 6.2832);
        ctx.fill();
      } else {
        // Berry, magnet and bomb: their pixel-art icon.
        const ICON = { heal: 'berry', magnet: 'magnet', bomb: 'bomb', ticket: 'ticket', ticket10: 'ticket10' };
        const sz =
          p.kind === 'ticket10' || p.kind === 'ticket' ? 32 : p.kind === 'item' ? 24 : p.kind === 'ground' ? 22 : 18;
        if (p.kind === 'ground') {
          // Ground item: a soft white pulse under its Pokesprite icon.
          ctx.globalAlpha = 0.18 + Math.sin(p.t * 1.5) * 0.08;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, y, 13, 0, 6.2832);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (p.kind === 'item') {
          // Item: a pulsing golden glow, so it is seen from afar.
          ctx.globalAlpha = 0.35 + Math.sin(p.t * 1.5) * 0.15;
          ctx.fillStyle = '#ffe14d';
          ctx.beginPath();
          ctx.arc(p.x, y, 18, 0, 6.2832);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        G.Icons.draw(
          ctx,
          p.kind === 'item'
            ? p.value
            : p.kind === 'ground'
              ? 'ps:' + ((G.Grounds.BY[p.value] || {}).icon || 'berry.oran')
              : ICON[p.kind],
          p.x - sz / 2,
          y - sz / 2 - 1,
          sz
        );
        continue;
      }
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath();
      ctx.arc(p.x - r * 0.25, y - r * 0.3, r * 0.28, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    clear,
    all,
    dropXp,
    drop,
    update,
    draw,
    addRemote,
    removeId,
    pullAll,
    KIND,
    get count() {
      return list.length;
    },
  };
})();
