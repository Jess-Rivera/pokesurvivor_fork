/* ============ hud.js — interfaz dentro del canvas ============
 * Drawn in SCREEN coordinates (without the camera transform).
 */
G.HUD = (() => {
  const ENRAGE_LINE_BELOW_OVERLAY = 178; // px from the top: below the overlay's name line, bar and circles (#64)
  const F = (w, s) => `${w} ${s}px GameFont,"Segoe UI",system-ui,sans-serif`;
  // #62: the character info panel (portrait and EXP ring, life meter, status chips, Shake Off, move slots, held item, Lv,
  // Silver, run timer) is on the HTML overlay (js/ui/hud-player-panel.js). Set each frame in draw(); while false (the
  // overlay's libraries failed to load) the canvas keeps drawing its old pieces.
  let overlayDrawsPlayer = false;
  // #63: the team roster, held items and berry bag (js/ui/hud-roster-panel.js) and the run item column
  // (js/ui/hud-run-items-panel.js) are on the overlay too; the same fallback applies.
  let overlayDrawsRoster = false,
    overlayDrawsRunItems = false;
  // #65: World Level, Region, Map, the weather card (top right) and the kills line (top centre) are on the overlay
  // (js/ui/hud-map-panel.js); the old biome, kills and coins line, ENEMY LV and the weather chip are the fallback only.
  let overlayDrawsMap = false;

  /**
   * How much of a move's cooldown is left, 0 (ready) to 1, for its icon's shade. Shared with the overlay's move slots.
   * A move that is ready but has no target (or the caster is frozen) re-arms m.t to 0.05 every frame (combat.js tickMove):
   * that sawtooth is not a cooldown, so <= 0.05 s reads as ready. simCd: the resolver cd, set on a slot routed through the
   * new move system; absent otherwise. An always-on move (a persistent def: orbits, auras, trails) has no cooldown to show
   * (slice 7a). Fly's icon shows the flight left while up, then the recharge from landing.
   */
  function moveCooldownFraction(pl, m) {
    if (G.MoveEffects.skillOf(G.MoveDefs[m.id]) === 'fly') {
      const flyFx = pl.skillFx('fly');
      return pl.flyT > 0 ? G.U.clamp(pl.flyT / flyFx.duration, 0, 1) : G.U.clamp(pl.flyCd / flyFx.cooldown, 0, 1);
    }
    return (G.MoveDefs[m.id] && G.MoveDefs[m.id].persistent) || m.t <= 0.05
      ? 0
      : G.U.clamp(m.t / ((m.simCd || m.cd) * pl.cdMul), 0, 1);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function bar(ctx, x, y, w, h, frac, col, bg = 'rgba(0,0,0,.55)') {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = bg;
    ctx.fill();
    if (frac > 0) {
      ctx.save();
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.clip();
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w * G.U.clamp(frac, 0, 1), h);
      ctx.restore();
    }
  }

  /** Draw a Pokemon's Idle frame fit into a size x size box centered at (cx,cy). */
  /** Draw a Pokemon's Idle frame to fill a `size` box centered at (cx,cy),
   *  clipped to the box. Scaled by the frame's smaller dimension so it fills
   *  (overflow is cropped), and centered on the character's body, not the
   *  frame center — PMD frames anchor the body low (ground anchor m.ay), which
   *  is why a naive center made the sprite ride high with empty space below. */
  function teamIcon(ctx, f, cx, cy, size, clipR) {
    const s = G.Sprites.sheet(f.dex, 'Idle', f.shiny);
    const m = G.Sprites.animMeta(f.dex, 'Idle', f.shiny);
    if (!s || !s.ready || !m) {
      ctx.fillStyle = f.dead ? 'rgba(120,130,145,.6)' : G.U.TYPE_COLOR[f.mon.types[0]] || '#6b7a94';
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.4, 0, 6.2832);
      ctx.fill();
      return;
    }
    // Fill the box (scale by the SMALLER side) so the sprite is large; crop the rest.
    const scale = size / Math.min(m.w, m.h);
    const dw = m.w * scale,
      dh = m.h * scale;
    // Body center: horizontally the frame center, vertically ~55% up from the
    // ground anchor (ay) so the Pokemon's torso lands in the middle of the box.
    const bodyCx = m.w / 2;
    const bodyCy = m.ay != null ? m.ay - m.ay * 0.42 : m.h * 0.5;
    const prev = ctx.globalAlpha;
    ctx.save();
    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, clipR || 8);
    ctx.clip();
    if (f.dead) ctx.globalAlpha = prev * 0.4;
    ctx.drawImage(s.img, 0, 0, m.w, m.h, Math.round(cx - bodyCx * scale), Math.round(cy - bodyCy * scale), dw, dh);
    ctx.restore();
    ctx.globalAlpha = prev;
  }

  /** Team (lower-left): each member is a square icon box the size of an attack
   *  button, with its HP bar underneath. Non-active members that cannot be
   *  swapped to yet show the same bottom-to-top cooldown fill the attacks use. */
  function drawTeam(ctx, w, h) {
    const roster = G.Game.roster;
    if (!roster || roster.length < 2) return 0;
    const activeIdx = G.Game.activeIndex;
    const SLOTS = 6,
      GAP = 10,
      BH = 7,
      R = 12;
    // S matches the attack buttons (54), but shrinks on short screens so all 6 slots fit.
    const stackH = (sz) => SLOTS * (sz + 5 + BH) + (SLOTS - 1) * (GAP - 5);
    let S = 54;
    while (S > 30 && stackH(S) > h - 130) S -= 2;
    const ROW = S + 5 + BH; // icon box + gap + hp bar per slot
    const x = 16; // fixed left column
    const startY = h - stackH(S) - 16; // stack downward from here (anchored bottom)
    const cdFrac = G.U.clamp(G.Game.swapCooldown / G.Game.swapMax, 0, 1);
    // One row per FIXED team slot, in slot order. An empty slot shows a dim placeholder.
    for (let slot = 0; slot < SLOTS; slot++) {
      const f = roster.find((m) => m.teamSlot === slot);
      const y = startY + slot * (ROW + GAP - 5);
      if (!f) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        roundRect(ctx, x, y, S, S, R);
        ctx.fillStyle = 'rgba(10,16,28,.35)';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(140,170,210,.22)';
        ctx.stroke();
        ctx.restore();
        ctx.font = F(800, 9);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(180,200,230,.35)';
        ctx.fillText(G.Input.keyLabel('swap_' + (slot + 1)) || String(slot + 1), x + 4, y + 11);
        bar(ctx, x, y + S + 5, S, BH, 0, 'rgba(120,130,145,.3)', 'rgba(0,0,0,.25)');
        continue;
      }
      const on = roster.indexOf(f) === activeIdx;
      const col = f.dead ? 'rgba(120,130,145,.6)' : G.U.TYPE_COLOR[f.mon.types[0]] || '#6b7a94';
      // box background + border (active = bright type border, like the active attack)
      roundRect(ctx, x, y, S, S, R);
      ctx.fillStyle = on ? 'rgba(20,30,50,.95)' : 'rgba(10,16,28,.8)';
      ctx.fill();
      ctx.lineWidth = on ? 2.5 : 1.2;
      ctx.strokeStyle = on ? col : 'rgba(140,170,210,.22)';
      ctx.stroke();
      // sprite icon: fills the box, centered on the body, overflow cropped
      teamIcon(ctx, f, x + S / 2, y + S / 2, S - 4, R - 2);
      // slot key hint, top-left corner
      ctx.font = F(800, 9);
      ctx.textAlign = 'left';
      ctx.fillStyle = on ? '#ffd23f' : 'rgba(180,200,230,.6)';
      const slotNo = slot + 1; // the key hint follows the SLOT
      ctx.fillText(G.Input.keyLabel('swap_' + slotNo) || String(slotNo), x + 4, y + 11);
      // cooldown overlay on NON-active members during the swap lockout
      if (!on && !f.dead && cdFrac > 0) {
        ctx.save();
        roundRect(ctx, x, y, S, S, R);
        ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(x, y, S, S * cdFrac);
        ctx.restore();
      }
      // KO overlay
      if (f.dead) {
        ctx.font = F(800, 11);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,138,150,.95)';
        ctx.fillText('KO', x + S / 2, y + S / 2 + 4);
        ctx.textAlign = 'left';
      }
      // hp bar under the box
      const frac = f.dead ? 0 : f.hp / f.maxHp;
      bar(ctx, x, y + S + 5, S, BH, frac, f.dead ? 'rgba(120,130,145,.6)' : on ? '#ff5f6d' : '#c85059');
    }
    return x + S; // right edge, so the buffs can sit beside the strip
  }

  /** Team berry bag (status berries, F3a-2): one box per slot, directly above the team list (bottom-left corner when the team is a single Pokemon).
   *  A stored berry shows its icon; it is used up on its own when the matching status would land. Returns the right edge when there is no team strip
   *  to sit above (so the buff chips can start after it), else 0. */
  function drawBerryBag(ctx, w, h, hasTeam) {
    const pl = G.Game.player;
    if (!pl || !pl.berries) return 0;
    const slots = G.Grounds.berrySlots(G.DB.save),
      bs = 44,
      gap = 8,
      x = 16;
    let top;
    if (hasTeam) {
      // same stack maths as drawTeam
      const SL = 6,
        GAP = 10,
        BH = 7,
        stackH = (sz) => SL * (sz + 5 + BH) + (SL - 1) * (GAP - 5);
      let S = 54;
      while (S > 30 && stackH(S) > h - 130) S -= 2;
      top = h - stackH(S) - 16;
    } else top = h - 16;
    const y = top - bs - (hasTeam ? 12 : 0);
    for (let i = 0; i < slots; i++) {
      const bx = x + i * (bs + gap),
        id = pl.berries[i],
        def = id && G.Grounds.BY[id];
      roundRect(ctx, bx, y, bs, bs, 10);
      ctx.fillStyle = def ? 'rgba(10,30,44,.9)' : 'rgba(10,16,28,.55)';
      ctx.fill();
      ctx.lineWidth = def ? 2 : 1;
      ctx.strokeStyle = def ? '#9fe8ff' : 'rgba(140,170,210,.22)';
      ctx.stroke();
      if (def) G.Icons.draw(ctx, 'ps:' + def.icon, bx + (bs - 32) / 2, y + (bs - 32) / 2, 32);
      else {
        ctx.font = F(800, 9);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(180,200,230,.35)';
        ctx.fillText('BERRY', bx + bs / 2, y + bs / 2 + 3);
        ctx.textAlign = 'left';
      }
    }
    return hasTeam ? 0 : x + slots * (bs + gap) - gap;
  }

  // ---------- bottom strip: name (left) · HP bar (center) · level (right) ----------
  const HP_ROW = 26; // height of the strip
  const HP_GAP = 10; // space between the bottom of the screen and the strip
  // How far the action bar is lifted to make room for the strip. layout-ui.js reads it too.
  const BAR_LIFT = 28;

  // Action bar, single (unbonded) move: the bare icon, no box. The cooldown shade and the cast flash are masked to the icon's own
  // pixels (source-atop on a scratch canvas), and the active move gets a yellow outline of its silhouette.
  const PAD = 4;
  let _ic = null,
    _ol = null;
  function moveIcon(ctx, name, x, y, size, cd, flash, outline) {
    const W = size + PAD * 2;
    if (!_ic) {
      _ic = document.createElement('canvas');
      _ol = document.createElement('canvas');
    }
    if (_ic.width !== W) {
      _ic.width = _ic.height = _ol.width = _ol.height = W;
    }
    const c = _ic.getContext('2d'),
      o = _ol.getContext('2d');
    c.clearRect(0, 0, W, W);
    G.Icons.draw(c, name, PAD, PAD, size);
    if (outline) {
      o.clearRect(0, 0, W, W);
      for (let dx = -2; dx <= 2; dx += 2) for (let dy = -2; dy <= 2; dy += 2) if (dx || dy) o.drawImage(_ic, dx, dy);
      o.globalCompositeOperation = 'source-in';
      o.fillStyle = '#ffd23f';
      o.fillRect(0, 0, W, W);
      o.globalCompositeOperation = 'source-over';
      ctx.drawImage(_ol, x - PAD, y - PAD);
    }
    c.globalCompositeOperation = 'source-atop';
    if (cd > 0) {
      c.fillStyle = 'rgba(0,0,0,.6)';
      c.fillRect(PAD, PAD, size, size * cd);
    } // empties from bottom to top
    if (flash > 0) {
      c.fillStyle = 'rgba(255,255,255,' + (flash * 0.55).toFixed(2) + ')';
      c.fillRect(0, 0, W, W);
    }
    c.globalCompositeOperation = 'source-over';
    ctx.drawImage(_ic, x - PAD, y - PAD);
  }

  /** Active statuses (G.Status.list) as small chips centered above the HP bar: label and seconds left. */
  function drawStatus(ctx, w, by, pl) {
    const L = G.Status.list(pl);
    if (!L.length) return;
    ctx.font = F(700, 11);
    const items = L.map((s) => ({ s, txt: s.label + (s.t != null ? ' ' + Math.ceil(s.t) + 's' : '') }));
    const pad = 6,
      gap = 4,
      hgt = 16;
    const widths = items.map((i) => ctx.measureText(i.txt).width + pad * 2);
    let x = (w - (widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1))) / 2;
    const y = by - hgt - 6;
    ctx.textAlign = 'center';
    items.forEach((i, n) => {
      ctx.fillStyle = i.s.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.roundRect(x, y, widths[n], hgt, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#111';
      ctx.fillText(i.txt, x + widths[n] / 2, y + hgt - 4);
      x += widths[n] + gap;
    });
  }

  function drawHpStrip(ctx, w, h, pl, safeB) {
    const BW = G.U.clamp(w * 0.34, 160, 300),
      BH = 18;
    const bx = (w - BW) / 2;
    const cy = h - HP_GAP - safeB - HP_ROW / 2; // vertical center of the strip
    const by = cy - BH / 2;
    bar(ctx, bx, by, BW, BH, pl.hp / pl.maxHp, '#ff5f6d');
    ctx.font = F(700, 13);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(pl.hp) + ' / ' + Math.round(pl.maxHp), w / 2, by + BH - 4);

    // Name: right-aligned against the left end of the bar. Shrinks to fit narrow screens.
    let size = 20;
    const room = bx - 12 - 8;
    ctx.font = F(800, size);
    while (size > 12 && ctx.measureText(pl.mon.name).width > room) {
      size--;
      ctx.font = F(800, size);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#eaf2ff';
    ctx.fillText(pl.mon.name, bx - 12, cy + size * 0.35);

    // Level: left-aligned against the right end of the bar.
    ctx.font = F(700, 16);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffcb3d';
    ctx.fillText('Lv. ' + pl.level, bx + BW + 12, cy + 6);
  }

  // ---------- active buffs: bottom-left, stacking upward ----------
  const BUFF_COL = { atk: '#ff6b4d', spe: '#7fe0ff', def: '#b0b8c8', regen: '#5fe08a', spa: '#b99dff', spd: '#6ea4ff' };
  const BUFF_LBL = { atk: 'ATK', spe: 'SPD', def: 'DEF', regen: 'REG', spa: 'SP.ATK', spd: 'SP.DEF' };
  const BUFF_ORDER = ['atk', 'def', 'spa', 'spd', 'spe', 'regen'];

  function drawBuffs(ctx, h, pl, x0) {
    const CH = 32,
      GAPV = 6;
    let y = h - 16; // bottom edge of the lowest chip
    ctx.textAlign = 'left';
    // One chip per live team buff: the stat stages, then the berry effects (type guards, Kee / Maranga, Lansat, Pinap drop bonus).
    const chips = [];
    for (const k of BUFF_ORDER) {
      if (!G.Stages.teamLive(pl.stgTeam, k)) continue; // a legacy application or a team tracker (slice 5a)
      const tm = (pl.stgTeam && pl.stgTeam[k]) || [];
      // Team RAISE of the stat (slice E2a): "ATK +2" for a stage, "REG ×2" for Aqua Ring's applications. Drops show in the status list below.
      const raise = k === 'regen' ? tm.length : Math.min(6, G.Stages.teamSum(pl.stgTeam, k));
      chips.push({ txt: BUFF_LBL[k] + (k === 'regen' ? ' ×' : ' +') + raise, col: BUFF_COL[k], k });
    }
    for (const k in pl.stgTeam || {}) {
      if (BUFF_ORDER.includes(k) || !pl.stgTeam[k].length) continue;
      const c = G.Grounds.chip(k, G.Stages.teamSum(pl.stgTeam, k));
      if (c) chips.push({ txt: c.label, col: c.color, k });
    }
    for (const c of chips) {
      const b = G.Stages.teamTimer(pl.stgTeam, c.k); // longest time left among this buff's live applications
      ctx.font = F(800, 18);
      const txt = c.txt;
      const tw = Math.ceil(ctx.measureText(txt).width) + 20;
      const top = y - CH;
      roundRect(ctx, x0, top, tw, CH, 9);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = c.col;
      ctx.stroke();
      ctx.fillStyle = c.col;
      ctx.fillText(txt, x0 + 10, top + 21);
      // Timer: how long is left before this buff runs out (it keeps ticking while benched).
      const frac = b && b.dur > 0 ? G.U.clamp(b.t / b.dur, 0, 1) : 0;
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(x0 + 8, top + CH - 6, tw - 16, 3);
      ctx.fillStyle = c.col;
      ctx.fillRect(x0 + 8, top + CH - 6, (tw - 16) * frac, 3);
      y = top - GAPV;
    }
    // Active altar power (Fury, Thunder, Magnet, Haste): same stack, on top of the stat buffs.
    if (pl.power) {
      const pw = pl.power;
      ctx.font = F(800, 18);
      const txt = pw.def.name.toUpperCase() + ' ' + Math.ceil(pw.t) + 's';
      const tw = Math.ceil(ctx.measureText(txt).width) + 20;
      const top = y - CH;
      roundRect(ctx, x0, top, tw, CH, 9);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = pw.def.color;
      ctx.stroke();
      ctx.fillStyle = pw.def.color;
      ctx.fillText(txt, x0 + 10, top + 21);
      const frac = pw.dur > 0 ? G.U.clamp(pw.t / pw.dur, 0, 1) : 0;
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(x0 + 8, top + CH - 6, tw - 16, 3);
      ctx.fillStyle = pw.def.color;
      ctx.fillRect(x0 + 8, top + CH - 6, (tw - 16) * frac, 3);
      y = top - GAPV;
    }
    drawDebuffs(ctx, pl, x0, y, CH, GAPV);
  }

  // Seconds each status started with, for its timer bar (the highest remaining time seen since it appeared).
  const stMax = {};
  /** Statuses on the player (slice E1), stacked above the buffs in the same lower-left column: red border, timer bar, and a "Tap H!" prompt while Shake off can help. */
  function drawDebuffs(ctx, pl, x0, y, CH, GAPV) {
    // #62: with the overlay up, its chips show the major statuses, poison and burn, and it shows the Shake Off prompt
    const L = G.Status.list(pl).filter((s) => !(overlayDrawsPlayer && G.HudPlayerPanel.hasChip(s.k)));
    for (const k in stMax) if (!L.some((s) => s.k === k)) delete stMax[k];
    ctx.textAlign = 'left';
    for (const s of L) {
      if (s.t != null) stMax[s.k] = Math.max(stMax[s.k] || 0, s.t);
      ctx.font = F(800, 18);
      const txt = s.label.toUpperCase() + (s.t != null ? ' ' + Math.ceil(s.t) + 's' : '');
      const tw = Math.ceil(ctx.measureText(txt).width) + 20;
      const top = y - CH;
      roundRect(ctx, x0, top, tw, CH, 9);
      ctx.fillStyle = 'rgba(40,0,6,.7)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff5f6d';
      ctx.stroke();
      ctx.fillStyle = s.color;
      ctx.fillText(txt, x0 + 10, top + 21);
      if (s.t != null && stMax[s.k] > 0) {
        const frac = G.U.clamp(s.t / stMax[s.k], 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(x0 + 8, top + CH - 6, tw - 16, 3);
        ctx.fillStyle = s.color;
        ctx.fillRect(x0 + 8, top + CH - 6, (tw - 16) * frac, 3);
      }
      y = top - GAPV;
    }
    if (!overlayDrawsPlayer && G.Status.shakeable(pl)) {
      const key = G.Input.keyLabel('shake_off') || '?';
      const txt = G.Settings.get('autoShake') ? 'SHAKING OFF...' : 'TAP ' + key + ' TO SHAKE OFF!';
      ctx.font = F(800, 16);
      const tw = Math.ceil(ctx.measureText(txt).width) + 20,
        top = y - 26;
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(performance.now() / 90);
      roundRect(ctx, x0, top, tw, 26, 8);
      ctx.fillStyle = '#ffe14d';
      ctx.fill();
      ctx.fillStyle = '#2a1d00';
      ctx.fillText(txt, x0 + 10, top + 18);
      ctx.globalAlpha = 1;
      if (G.Touch) G.Touch.addButton(x0, top, tw, 26, () => G.Status.shake(pl), 10); // on a touch screen the prompt is the button
    }
  }

  // ---------- Silver counter (Move Shop step 2, js/systems/silver.js) ----------
  // The spinning silver coin (16 art px drawn at 24 with smoothing off, like the gold pickup in js/entities/pickup.js)
  // and the whole-coin count, both standing on one ground line: the coin's lowest opaque row and the digits' lowest
  // pixel sit on the same screen row. Every gain restarts a short pop of the NUMBER only (the coin keeps spinning,
  // Jess 2026-11-05), scaled from the number's bottom-left so it never leaves the ground line, never queued, so it
  // stays readable at high kill rates. The number rolls up toward the real value like a slot reel, at a speed set at
  // each gain so it always lands within SILVER_ROLL seconds. A spend, or a new run, shows the new value straight away.
  const SILVER_POP = 0.18, // s, the pop settles in this long
    SILVER_ROLL = 0.25, // s, the rolling number lands in this long after the last gain
    SILVER_ROLL_MIN = 25, // coins per second, the slowest roll (small gains)
    // Size (Jess 2026-11-05, +50% after the feel test): the 16 art px coin drawn at 36 (x2.25), the number at 30, a 45 px
    // gap from the coin's left edge to the number. FOOT: screen px from the top of the coin cell to the bottom of its
    // lowest opaque row (art rows 2 to 13 in every spin frame, so the bottom edge is art row 14).
    SILVER_COIN = 36,
    SILVER_FONT = 30,
    SILVER_GAP = 45,
    SILVER_COIN_FOOT = (14 * SILVER_COIN) / 16;
  const silver = { img: null, ready: false, shown: -1, target: -1, rate: 0, pop: 0, at: 0, t: 0 };
  function silverImg() {
    if (!silver.img && G.PickupSprites && G.PickupSprites.silver) {
      silver.img = new Image();
      silver.img.onload = () => {
        silver.ready = true;
      };
      silver.img.src = G.PickupSprites.silver.src;
    }
    return silver.ready ? silver.img : null;
  }
  /** x: left edge of the coin; ground: the screen row both the coin's and the digits' bottoms sit on. */
  function drawSilver(ctx, x, ground, st) {
    const now = performance.now() / 1000,
      dt = Math.min(0.1, Math.max(0, now - silver.at)),
      target = G.Silver.whole;
    silver.at = now;
    if (silver.target < 0 || target < silver.target || st.time < silver.t) {
      silver.shown = target; // first frame, a spend or a new run: no roll
      silver.pop = 0;
    } else if (target > silver.target) {
      silver.pop = 1; // a gain restarts the pop
      silver.rate = Math.max(SILVER_ROLL_MIN, (target - silver.shown) / SILVER_ROLL);
    }
    silver.target = target;
    silver.t = st.time;
    if (silver.shown < target) silver.shown = Math.min(target, silver.shown + silver.rate * dt);
    silver.pop = Math.max(0, silver.pop - dt / SILVER_POP);
    const k = 1 + 0.5 * silver.pop * silver.pop, // up to 1.5x, as the overlay's counter (#62)
      img = silverImg(),
      S = G.PickupSprites && G.PickupSprites.silver;
    ctx.save();
    if (img) {
      const f = Math.floor((st.time * 1000) / S.ms[0]) % S.n; // spins on the run clock, so it stops with the game
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        f * (S.cell + G.PickupSprites.pad),
        S.y,
        S.cell,
        S.cell,
        x,
        Math.floor(ground - SILVER_COIN_FOOT), // floor, not round: at x2.25 the foot is 31.5, and rounding up sinks the coin 1 px below the digits
        SILVER_COIN,
        SILVER_COIN
      );
    }
    const txt = Math.floor(silver.shown).toLocaleString('en-US');
    ctx.font = F(800, SILVER_FONT);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // The digits' real bottom, measured in this font (a pixel font can dip below its baseline), so the bottom of the
    // digits, not the baseline, lands on the ground line.
    const m = ctx.measureText('0123456789'),
      foot = m.actualBoundingBoxDescent || 0;
    ctx.translate(x + SILVER_GAP, ground);
    ctx.scale(k, k);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(txt, 0, -foot);
    ctx.fillStyle = '#e8eef7';
    ctx.fillText(txt, 0, -foot);
    ctx.restore();
  }

  // ---------- floating arrows (Move Shop step 3, chevrons #67) ----------
  // An off-screen target gets an arrow that floats ARROW_R world px from the character's middle, pointing at it, with its
  // label beyond the tip. Used by the gym gate (Jess 2026-11-05, it used to sit at the screen edge) and the Move Shop
  // buildings. #67 (Jess, 2026-11-10): three chevrons that snap apart toward the target with a stop-bounce and a shine,
  // hold open trembling as if straining, then slide back closed. Colours: HUD-STYLE "Wayfinding arrows" (the Attacks set
  // of UI-PALETTES: Special for gyms, Physical for shops; Base fill, Dark outline, Light for the shine).
  // A target on screen gets no arrow, only its label over the roof (wayfindingLabel).
  const ARROW_R = 60;
  // The gym building's roof above the gate point, world px (gym-arena.js: 248 px art at GATE_ART_SCALE 0.5, drawn 4 px low).
  const GATE_ROOF_WORLD_PX = 120;
  const GYM_WAYFINDER = { light: '#7D94CD', base: '#375AB2', dark: '#243B74' }, // Attacks / Special
    SHOP_WAYFINDER = { light: '#F29173', base: '#EB5628', dark: '#99381A' }; // Attacks / Physical
  const TEXT_WHITE = '#ffffff',
    TEXT_OUTLINE = '#101010'; // HUD-STYLE Text
  // HUD-STYLE Fonts: Truth And Ideals (HudText, css/hud-overlay.css) at 20 px, outline one font pixel (2 px) of hard shadows.
  const WAYFINDING_FONT = '20px HudText, monospace',
    WAYFINDING_OUTLINE_PX = 2;
  const OUTLINE_OFFSETS = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  /** Standard HUD text on the canvas: white over eight hard #101010 shadows, at whole pixels so the font stays crisp. */
  function wayfindingLabel(ctx, text, x, y, align) {
    const left = Math.round(x),
      baseline = Math.round(y);
    ctx.font = WAYFINDING_FONT;
    ctx.textAlign = align;
    ctx.fillStyle = TEXT_OUTLINE;
    for (const [dx, dy] of OUTLINE_OFFSETS)
      ctx.fillText(text, left + dx * WAYFINDING_OUTLINE_PX, baseline + dy * WAYFINDING_OUTLINE_PX);
    ctx.fillStyle = TEXT_WHITE;
    ctx.fillText(text, left, baseline);
  }
  // Chevron loop timing, seconds. One loop: snap out, stop-bounce, strained hold, slide back, rest.
  const CHEVRON_SNAP_SECONDS = 0.15,
    CHEVRON_BOUNCE_SECONDS = 0.15,
    CHEVRON_STAGGER_SECONDS = 0.03, // each chevron starts its snap this long after the one behind it
    CHEVRON_HOLD_SECONDS = 1.4,
    CHEVRON_SLIDE_SECONDS = 0.45,
    CHEVRON_REST_SECONDS = 0.25;
  const CHEVRON_COUNT = 3;
  const CHEVRON_HOLD_START =
      CHEVRON_SNAP_SECONDS + CHEVRON_BOUNCE_SECONDS + (CHEVRON_COUNT - 1) * CHEVRON_STAGGER_SECONDS,
    CHEVRON_SLIDE_START = CHEVRON_HOLD_START + CHEVRON_HOLD_SECONDS,
    CHEVRON_REST_START = CHEVRON_SLIDE_START + CHEVRON_SLIDE_SECONDS,
    CHEVRON_LOOP_SECONDS = CHEVRON_REST_START + CHEVRON_REST_SECONDS;
  // Chevron geometry, screen px, along the arrow's direction from the anchor ARROW_R out.
  const CHEVRON_HALF_HEIGHT = 14, // 28 px tall
    CHEVRON_DEPTH = 12, // apex to the arms' back ends
    CHEVRON_BACK_OFFSET = -6, // where the back chevron's apex sits
    CHEVRON_GAP_CLOSED = 20,
    CHEVRON_GAP_OPEN = 36,
    CHEVRON_OVERSHOOT_PX = 5, // how far past its open spot the front chevron flies before springing back
    CHEVRON_HOLD_CREEP_PX = 1, // how far the front chevron sags back by the end of the hold
    CHEVRON_TREMBLE_PX = 1, // the strained shake during the hold
    CHEVRON_OUTLINE_WIDTH = 9, // the #101010 edge
    CHEVRON_DARK_WIDTH = 7,
    CHEVRON_BASE_WIDTH = 4,
    CHEVRON_LABEL_GAP = 10; // label start beyond the furthest the front chevron's apex reaches
  const CHEVRON_SPAN_OPEN = (CHEVRON_COUNT - 1) * CHEVRON_GAP_OPEN,
    CHEVRON_SPAN_TRAVEL = CHEVRON_SPAN_OPEN - (CHEVRON_COUNT - 1) * CHEVRON_GAP_CLOSED,
    CHEVRON_OVERSHOOT_FRACTION = CHEVRON_OVERSHOOT_PX / CHEVRON_SPAN_TRAVEL,
    CHEVRON_CREEP_FRACTION = CHEVRON_HOLD_CREEP_PX / CHEVRON_SPAN_TRAVEL;
  const CHEVRON_LABEL_DISTANCE = CHEVRON_BACK_OFFSET + CHEVRON_SPAN_OPEN + CHEVRON_OVERSHOOT_PX + CHEVRON_LABEL_GAP;
  const easeOutCubic = (u) => 1 - (1 - u) * (1 - u) * (1 - u),
    easeInOutQuad = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

  /** How open one chevron's gap is at loopTime: 0 closed, 1 open (a little past 1 during the overshoot). */
  function chevronOpenAmount(loopTime, chevronIndex) {
    const ownTime = loopTime - chevronIndex * CHEVRON_STAGGER_SECONDS;
    if (ownTime < 0) return 0;
    if (ownTime < CHEVRON_SNAP_SECONDS)
      return easeOutCubic(ownTime / CHEVRON_SNAP_SECONDS) * (1 + CHEVRON_OVERSHOOT_FRACTION);
    if (ownTime < CHEVRON_SNAP_SECONDS + CHEVRON_BOUNCE_SECONDS) {
      // One spring back from the overshoot: past 1, a small dip under it, settled at 1.
      const bounceProgress = (ownTime - CHEVRON_SNAP_SECONDS) / CHEVRON_BOUNCE_SECONDS;
      return 1 + CHEVRON_OVERSHOOT_FRACTION * Math.cos(bounceProgress * Math.PI) * (1 - bounceProgress);
    }
    if (loopTime < CHEVRON_SLIDE_START) {
      const holdProgress = Math.max(0, (loopTime - CHEVRON_HOLD_START) / CHEVRON_HOLD_SECONDS);
      return 1 - CHEVRON_CREEP_FRACTION * holdProgress * holdProgress;
    }
    if (loopTime < CHEVRON_REST_START)
      return (
        (1 - CHEVRON_CREEP_FRACTION) * (1 - easeInOutQuad((loopTime - CHEVRON_SLIDE_START) / CHEVRON_SLIDE_SECONDS))
      );
    return 0;
  }

  /** The strained shake while held open: quick and irregular (two unrelated sines), up to CHEVRON_TREMBLE_PX. */
  function chevronTremble(loopTime, chevronIndex, seconds) {
    if (loopTime < CHEVRON_HOLD_START || loopTime >= CHEVRON_SLIDE_START) return 0;
    const wobble =
      Math.sin(seconds * 61 + chevronIndex * 2.1) * 0.6 + Math.sin(seconds * 37 + chevronIndex * 4.3) * 0.4;
    return wobble * CHEVRON_TREMBLE_PX;
  }

  /** The shine's brightness on one chevron: a band sweeping back to front across the snap and bounce. */
  function chevronShine(loopTime, chevronIndex) {
    if (loopTime >= CHEVRON_HOLD_START) return 0;
    const shinePosition = -0.5 + (loopTime / CHEVRON_HOLD_START) * (CHEVRON_COUNT + 0.5);
    return Math.max(0, 1 - Math.abs(chevronIndex - shinePosition));
  }

  /** One open chevron, apex at (apexX, 0), pointing along +x. Black outline, Dark, Base, then the shine in Light. */
  function strokeChevron(ctx, apexX, palette, shine) {
    ctx.beginPath();
    ctx.moveTo(apexX - CHEVRON_DEPTH, -CHEVRON_HALF_HEIGHT);
    ctx.lineTo(apexX, 0);
    ctx.lineTo(apexX - CHEVRON_DEPTH, CHEVRON_HALF_HEIGHT);
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'square'; // every layer squared off, so the ends carry the same border as the sides
    ctx.lineWidth = CHEVRON_OUTLINE_WIDTH;
    ctx.strokeStyle = TEXT_OUTLINE;
    ctx.stroke();
    ctx.lineWidth = CHEVRON_DARK_WIDTH;
    ctx.strokeStyle = palette.dark;
    ctx.stroke();
    ctx.lineWidth = CHEVRON_BASE_WIDTH;
    ctx.strokeStyle = palette.base;
    ctx.stroke();
    if (shine > 0) {
      ctx.globalAlpha = shine;
      ctx.strokeStyle = palette.light;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function floatArrow(ctx, cam, pl, tx, ty, palette, label, textA = 1) {
    const ox = pl.x,
      oy = pl.y - (pl.bodyH || 32) / 2;
    const a = Math.atan2(ty - oy, tx - ox),
      ca = Math.cos(a),
      sa = Math.sin(a);
    const seconds = performance.now() / 1000,
      loopTime = seconds % CHEVRON_LOOP_SECONDS;
    ctx.save();
    ctx.translate((ox + ca * ARROW_R - cam.left()) * cam.scale, (oy + sa * ARROW_R - cam.top()) * cam.scale);
    ctx.save();
    ctx.rotate(a);
    for (let chevronIndex = 0; chevronIndex < CHEVRON_COUNT; chevronIndex++) {
      const gap =
        CHEVRON_GAP_CLOSED + (CHEVRON_GAP_OPEN - CHEVRON_GAP_CLOSED) * chevronOpenAmount(loopTime, chevronIndex);
      const apexX = CHEVRON_BACK_OFFSET + chevronIndex * gap + chevronTremble(loopTime, chevronIndex, seconds);
      strokeChevron(ctx, apexX, palette, chevronShine(loopTime, chevronIndex));
    }
    ctx.restore();
    ctx.globalAlpha = textA;
    const lx = ca * CHEVRON_LABEL_DISTANCE,
      ly = sa * CHEVRON_LABEL_DISTANCE + (sa > 0.3 ? 16 : sa < -0.3 ? -4 : 7);
    wayfindingLabel(ctx, label, lx, ly, ca > 0.3 ? 'left' : ca < -0.3 ? 'right' : 'center');
    ctx.restore();
  }

  function draw(ctx, w, h, pl, st) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    G.Touch.clearButtons();
    const touch = G.Touch.active;

    overlayDrawsPlayer = !!(G.HudPlayerPanel && G.HudPlayerPanel.ready);
    overlayDrawsRoster = !!(G.HudRosterPanel && G.HudRosterPanel.ready);
    overlayDrawsRunItems = !!(G.HudRunItemsPanel && G.HudRunItemsPanel.ready);
    overlayDrawsMap = !!(G.HudMapPanel && G.HudMapPanel.ready);

    // ---------- barra de experiencia (borde superior; #62: the overlay's portrait ring replaces it) ----------
    if (!overlayDrawsPlayer) {
      const xpF = pl.xp / pl.xpNext;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, 0, w, 7);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#4fd1ff');
      g.addColorStop(1, '#a98bff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w * G.U.clamp(xpF, 0, 1), 7);
    }

    // Name / HP / level now live in the bottom strip (drawn below); top-left is free.
    const px = 16,
      py = 22;
    const safeB = touch ? Math.min(28, G.Touch.safeArea().bottom) : 0;
    if (!overlayDrawsPlayer) drawHpStrip(ctx, w, h, pl, safeB);

    // ---------- team strip (lower-left, only with a real team) ----------
    // #76: with the character panel up, its chip bands show the buffs, berries, altar power and stat drops
    if (overlayDrawsRoster) {
      if (!overlayDrawsPlayer) drawBuffs(ctx, h, pl, G.HudRosterPanel.buffsLeft());
    } else {
      const teamRight = drawTeam(ctx, w, h);
      const bagRight = drawBerryBag(ctx, w, h, !!teamRight);
      drawBuffs(ctx, h, pl, teamRight ? teamRight + 12 : bagRight ? bagRight + 12 : 16);
    }

    // ---------- Silver (top-left; hidden in co-op until co-op shops exist, the co-op panel uses this corner) ----------
    if (!G.Coop.active && !overlayDrawsPlayer) {
      const sa = touch ? G.Touch.safeArea() : null;
      drawSilver(ctx, px + (sa ? Math.min(44, sa.left) : 0), 46 + (sa ? Math.min(20, sa.top) : 0), st);
    }

    // ---------- reloj / bioma / kills ----------
    ctx.textAlign = 'center';
    ctx.font = F(800, 26);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    if (!overlayDrawsPlayer) ctx.fillText(G.U.mmss(st.time), w / 2, 42); // #62: the overlay shows it under the moves
    if (!overlayDrawsMap) {
      ctx.font = F(600, 10);
      ctx.fillStyle = '#8fa3c4';
      ctx.fillText(
        G.World.biomeName().toUpperCase() + '  ·  ' + pl.kills + ' DERROTADOS  ·  ' + pl.coins + ' MONEDAS',
        w / 2,
        58
      );
    }

    // Enemy level (top-right): same size/color as the run timer, with an "ENEMY LV"
    // subtitle. Shows the level enemies currently spawn at (see G.Enemies.levelForTime).
    if (!overlayDrawsMap) {
      ctx.textAlign = 'right';
      ctx.font = F(800, 26);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.fillText(Math.floor(G.Enemies.levelForTime(st.time)), w - 16, 42);
      ctx.font = F(600, 10);
      ctx.fillStyle = '#8fa3c4';
      ctx.fillText('ENEMY LV', w - 16, 58);
      ctx.textAlign = 'left';
    }

    // ---------- clima (arriba a la derecha) ----------
    const wx = overlayDrawsMap ? null : G.Weather.current;
    if (wx) {
      ctx.font = F(800, 11);
      ctx.textAlign = 'left';
      const txt = wx.name.toUpperCase() + ' · ' + Math.ceil(wx.left) + 's';
      const tw = ctx.measureText(txt).width + 40;
      const x0 = w - tw - 16 - (touch ? 56 : 0),
        y0 = 14;
      roundRect(ctx, x0, y0, tw, 26, 9);
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fill();
      G.Icons.draw(ctx, wx.icon, x0 + 6, y0 + 3, 20);
      ctx.fillStyle = wx.color;
      ctx.fillText(txt, x0 + 32, y0 + 17);
    }

    // ---------- boss bar ----------
    const boss = G.EnemyMgr.all().find((e) => e.boss && !e.dead);
    // #64: a gym leader's name bar and team circles are on the HTML overlay (js/ui/hud-overlay.js); the canvas keeps the
    // bar for other bosses, and for gyms too if the overlay's libraries failed to load
    const overlayDrawsGym = !!(G.HudOverlay && G.HudOverlay.ready);
    if (boss) {
      if (!(boss.gym && overlayDrawsGym)) {
        const bw = Math.min(420, w - 80);
        bar(ctx, (w - bw) / 2, 70, bw, 12, boss.hp / boss.maxHp, '#ffcb3d');
        ctx.font = F(800, 10);
        ctx.fillStyle = '#20160a';
        ctx.fillText(
          boss.gym
            ? (boss.gym.leader + "'S " + boss.name + ' · LV ' + boss.gym.level).toUpperCase()
            : boss.name.toUpperCase(),
          w / 2,
          80
        );
      }
      if (boss.gym && G.Gym.enrages(boss)) {
        // slice 6 (Q1): no enrage line for a switched gym that does not author one
        const left = G.Gym.enrageIn(boss);
        ctx.font = F(700, 10);
        ctx.fillStyle = left === 0 ? '#ff7070' : '#ffe9b0';
        ctx.fillText(
          left === 0 ? 'ENRAGED' : left != null ? 'ENRAGE IN ' + Math.ceil(left) + ' s' : 'HIT IT TO ENGAGE',
          w / 2,
          overlayDrawsGym ? ENRAGE_LINE_BELOW_OVERLAY : 98 // under the overlay's circles until it gets its own HUD design
        );
      }
    }

    // ---------- leader team pips (slice 7): one per mon, gold standing, grey fainted; teams of 2+ only ----------
    // #64: replaced by the overlay's portrait circles; drawn only if the overlay is not running
    const lt = G.GymArena && G.GymArena.leaderTeam;
    if (!overlayDrawsGym && lt && Array.isArray(lt.members) && lt.members.length > 1) {
      const n = lt.members.length,
        gap = 14;
      lt.members.forEach((m, i) => {
        ctx.beginPath();
        ctx.arc(w / 2 + (i - (n - 1) / 2) * gap, 62, 4, 0, 6.2832);
        ctx.fillStyle = m.dead ? 'rgba(90,90,90,.85)' : '#ffcb3d';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // ---------- elite bar (an overworld elite; the boss bar wins if both are up) ----------
    // The HTML HUD's enemy name bar draws it (hud-boss-panel.js, Jess 2026-11-11); this canvas bar is the fallback without the overlay.
    // The enrage line stays here, under the overlay's bar like a gym's.
    const elite = !boss && G.Elites.current();
    if (elite) {
      const left = G.Elites.enrageIn(elite),
        enr = left === 0;
      if (!overlayDrawsGym) {
        const bw = Math.min(380, w - 80);
        bar(ctx, (w - bw) / 2, 70, bw, 12, elite.hp / elite.maxHp, enr ? '#ff5050' : '#ff9f43');
        ctx.font = F(800, 10);
        ctx.fillStyle = '#20160a';
        ctx.fillText('ELITE ' + elite.name.toUpperCase(), w / 2, 80);
      }
      ctx.font = F(700, 10);
      ctx.fillStyle = enr ? '#ff7070' : '#ffd9a8';
      ctx.fillText(
        enr ? 'ENRAGED' : left != null ? 'ENRAGE IN ' + Math.ceil(left) + ' s' : 'HIT IT TO ENGAGE',
        w / 2,
        overlayDrawsGym ? ENRAGE_LINE_BELOW_OVERLAY : 98
      );
    }

    // ---------- aviso ----------
    // ---------- off-screen shinies: a glint at the edge ----------
    const cam = G.Camera,
      pulse = 0.6 + Math.sin(performance.now() / 160) * 0.4;
    for (const e of G.EnemyMgr.shinies()) {
      const sx = (e.x - cam.left()) * cam.scale,
        sy = (e.y - cam.top()) * cam.scale;
      if (sx > 0 && sx < w && sy > 0 && sy < h) continue;
      const M = 34;
      const ex = G.U.clamp(sx, M, w - M),
        ey = G.U.clamp(sy, M + 60, h - M - 70);
      const a = Math.atan2(sy - ey, sx - ex);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.translate(ex, ey);
      ctx.fillStyle = '#9ae6ff';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24);
      ctx.lineTo(Math.cos(a + 2.5) * 12, Math.sin(a + 2.5) * 12);
      ctx.lineTo(Math.cos(a - 2.5) * 12, Math.sin(a - 2.5) * 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      G.Icons.draw(ctx, 'shiny', -12, -12, 24);
      ctx.restore();
    }

    // Elite: an orange arrow at the edge while it is off screen.
    if (elite) {
      const sx = (elite.x - cam.left()) * cam.scale,
        sy = (elite.y - cam.top()) * cam.scale;
      if (!(sx > 0 && sx < w && sy > 0 && sy < h)) {
        const M = 38,
          ex = G.U.clamp(sx, M, w - M),
          ey = G.U.clamp(sy, M + 60, h - M - 70);
        const a = Math.atan2(sy - ey, sx - ex);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.translate(ex, ey);
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 26, Math.sin(a) * 26);
        ctx.lineTo(Math.cos(a + 2.5) * 14, Math.sin(a + 2.5) * 14);
        ctx.lineTo(Math.cos(a - 2.5) * 14, Math.sin(a - 2.5) * 14);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = F(800, 10);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('ELITE', -Math.cos(a) * 20, -Math.sin(a) * 20 + 4);
        ctx.restore();
      }
    }

    if (G.Coop.active) drawCoop(ctx, w, h, pl, px, py + 4);

    // Gym gate: off screen, chevrons floating off the character (floatArrow); on screen, a "Gym Leader <name>" label
    // over the roof (#67, Jess 2026-11-10; an Elite Four gate will read "Elite Four <name>" once those gates exist);
    // in the arena, a GYM tag.
    const gate = G.GymArena.gate;
    if (gate) {
      const gym = gate.gym;
      const sx = (gate.x - cam.left()) * cam.scale,
        sy = (gate.y - 40 - cam.top()) * cam.scale;
      const escalationBump = G.Gym.escBump(),
        levelText = 'Lv.' + (gym.level + escalationBump);
      const off = sx < 0 || sx > w || sy < 0 || sy > h;
      ctx.save();
      if (off) {
        // "Gym·Lv.5·10m·29s" (Jess, 2026-11-10): seconds while the grace countdown runs; Lv includes any escalation.
        const graceLeft = G.Gym.graceLeft(),
          metres = Math.round(G.U.dist(pl.x, pl.y, gate.x, gate.y) / 32);
        const label =
          'Gym·' +
          levelText +
          '·' +
          metres +
          'm' +
          (graceLeft != null && graceLeft > 0 ? '·' + Math.ceil(graceLeft) + 's' : '');
        floatArrow(ctx, cam, pl, gate.x, gate.y, GYM_WAYFINDER, label);
      } else {
        // Over the roof: the leader's name, then the level and the escalation readout under it.
        const roofY = (gate.y - GATE_ROOF_WORLD_PX - cam.top()) * cam.scale;
        wayfindingLabel(ctx, 'Gym Leader ' + gym.leader, sx, roofY - 32, 'center');
        wayfindingLabel(
          ctx,
          levelText + (escalationBump > 0 ? ' +' + escalationBump + ' Escalating' : ''),
          sx,
          roofY - 10,
          'center'
        );
      }
      ctx.restore();
    }

    // Move Shop buildings (js/systems/shops.js, step 3): off screen, chevrons floating off the character; on screen, a
    // label over the roof. Label: name, seconds left (blinks for the last G.Shops.BLINK s), metres when off screen.
    {
      const now = performance.now() / 1000,
        blinkOff = Math.floor(now * 4) % 2 === 0;
      for (const s of G.Shops.list) {
        const sx = (s.x - cam.left()) * cam.scale,
          sy = (s.y - cam.top()) * cam.scale,
          ta = (s.left <= G.Shops.BLINK && blinkOff ? 0.35 : 1) * s.alpha,
          secs = Math.ceil(s.left) + 's';
        if (sx < 0 || sx > w || sy < 0 || sy > h) {
          // "TM Mart·11m·34s" (Jess, 2026-11-10)
          const m = Math.round(G.U.dist(pl.x, pl.y, s.x, s.y) / 32) + 'm';
          floatArrow(ctx, cam, pl, s.x, s.y, SHOP_WAYFINDER, s.name + '·' + m + '·' + secs, ta);
        } else {
          ctx.save();
          ctx.globalAlpha = ta;
          wayfindingLabel(ctx, s.name + '·' + secs, sx, (s.y - s.h - cam.top()) * cam.scale - 10, 'center');
          ctx.restore();
        }
      }
    }
    if (G.GymArena.inArena) {
      ctx.textAlign = 'center';
      ctx.font = F(800, 12);
      ctx.fillStyle = '#d9c2ff';
      ctx.fillText('GYM', w / 2, boss ? 112 : 76);
    }

    // Events: countdown, arrow to the lost Pokemon / to the mark and to the imps.
    G.Events.drawHud(ctx, w, h, pl, F);

    // Its own notice when a gym gate opens (the other notices do not cover it).
    if (gate && gate.t < 4.5) {
      const a = Math.min(1, gate.t * 4, (4.5 - gate.t) * 2),
        pop = 1 + Math.max(0, 0.25 - gate.t) * 1.6;
      const y0 = h * 0.2;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, y0);
      ctx.scale(pop, pop);
      ctx.font = F(800, 20);
      const t1 = 'A GYM GATE HAS OPENED',
        t2 =
          gate.gym.leader +
          ' waits inside (Lv ' +
          gate.gym.level +
          '). Enter soon: after ' +
          G.Gym.GRACE +
          ' s the gym and the world start getting stronger.';
      const bw = Math.min(
        w - 24,
        Math.max(ctx.measureText(t1).width, ((ctx.font = F(700, 11)), ctx.measureText(t2).width)) + 36
      );
      roundRect(ctx, -bw / 2, -26, bw, 52, 10);
      ctx.fillStyle = 'rgba(26,11,51,.88)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#b48aff';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = F(800, 20);
      ctx.fillStyle = '#e2d0ff';
      ctx.fillText(t1, 0, -2);
      ctx.font = F(700, 11);
      ctx.fillStyle = '#c9b0ff';
      ctx.fillText(t2, 0, 16);
      ctx.restore();
    }

    const ban = G.Spawner.banner();
    if (ban) {
      const a = Math.min(1, ban.t * 1.6);
      ctx.save();
      ctx.globalAlpha = a;
      // Always centered (before it inherited the alignment of the last thing drawn, e.g.
      // the arrow of a treasure imp, and came out misplaced).
      ctx.textAlign = 'center';
      ctx.font = F(800, 22);
      ctx.fillStyle = '#ffcb3d';
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.lineWidth = 4;
      ctx.strokeText(ban.text, w / 2, h * 0.3);
      ctx.fillText(ban.text, w / 2, h * 0.3);
      ctx.restore();
    }

    // ---------- ranura de movimientos ----------
    const S = 54,
      GAP = 9;
    const n = Math.max(1, pl.slots.length);
    const totalW = n * S + (n - 1) * GAP;
    let sx = (w - totalW) / 2;
    // Above the iPhone home bar (there the touches sometimes do not arrive).
    let sy = h - S - 18 - safeB - BAR_LIFT; // lifted to leave room for the HP strip
    // On mobile, where the player placed it: the item block + all the
    // slots (even if not yet full), by their center, as in the editor
    // (layout-ui.js); the new attacks appear toward the right.
    const pb = touch && G.Touch.spot('bar');
    if (pb) {
      const nAll = Math.max(n, pl.maxMoves),
        bw = S + 18 + nAll * S + (nAll - 1) * GAP;
      sx = G.U.clamp(pb[0] * w - bw / 2, 6, Math.max(6, w - bw - 6)) + S + 18;
      sy = G.U.clamp(pb[1] * h - S / 2, 24, h - S - 6 - BAR_LIFT); // never covers the HP strip
    }
    const BOND = '#ff8ad8';
    const cdOf = (m) => moveCooldownFraction(pl, m);

    for (let i = 0; i < n && !overlayDrawsPlayer; i++) {
      const g = pl.slots[i] || [];
      const m = g[0];
      const fused = g.length > 1;
      const on = i === pl.active;
      const x = sx + i * (S + GAP);
      const y = on ? sy - 6 : sy;
      // Tapping (or clicking) an icon activates that move.
      if (m)
        G.Touch.addButton(
          x,
          y,
          S,
          S,
          () => {
            if (G.Game.state === 'playing' && pl.active !== i) {
              pl.setActive(i);
              G.Audio.sfx('click');
            }
          },
          GAP / 2 + 3
        );
      const col = m ? G.U.TYPE_COLOR[m.type] : '#4a5468';

      // Box: only for an empty slot or a bonded group (pink border). A single move is the bare icon.
      if (!m || fused) {
        roundRect(ctx, x, y, S, S, 12);
        ctx.fillStyle = on ? 'rgba(20,30,50,.95)' : 'rgba(10,16,28,.8)';
        ctx.fill();
        ctx.lineWidth = on ? 2.5 : fused ? 2 : 1.2;
        ctx.strokeStyle = fused ? BOND : on ? col : 'rgba(140,170,210,.22)';
        ctx.stroke();
      }

      if (!m) continue;

      if (fused) {
        // Link: the moves in a 2x2 grid, each with its own cooldown.
        const C = 22,
          P = (S - C * 2) / 3;
        g.forEach((gm, k) => {
          const cx = x + P + (k % 2) * (C + P),
            cy = y + P + Math.floor(k / 2) * (C + P);
          G.Icons.draw(ctx, 'move:' + gm.id, cx, cy, C);
          const f = cdOf(gm);
          if (f > 0) {
            ctx.fillStyle = 'rgba(0,0,0,.55)';
            ctx.fillRect(cx, cy, C, C * f);
          }
          // Destello al lanzarse.
          const fl = 1 - (performance.now() - (gm.castAt || 0)) / 180;
          if (fl > 0) {
            ctx.fillStyle = 'rgba(255,255,255,' + (fl * 0.55).toFixed(2) + ')';
            ctx.fillRect(cx, cy, C, C);
          }
        });
      } else {
        // type emblem + family badge at the box size (54 = 3x the 18 px native icon), cooldown and flash on the icon itself
        moveIcon(ctx, 'move:' + m.id, x, y, S, cdOf(m), 1 - (performance.now() - (m.castAt || 0)) / 180, on);
      }

      // key
      ctx.font = F(800, 9);
      ctx.fillStyle = fused ? BOND : on ? col : 'rgba(180,200,230,.6)';
      ctx.textAlign = 'left';
      const kl = G.Input.keyLabel('attack_' + (i + 1)) || String(i + 1);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(kl, x + 3, y + 10);
      ctx.restore();
      ctx.fillText(kl, x + 3, y + 10);

      // name above the active one (with a link: "Ascuas +2")
      if (on) {
        ctx.font = F(700, 10);
        ctx.textAlign = 'center';
        ctx.fillStyle = fused ? BOND : col;
        ctx.fillText(fused ? m.name + ' +' + (g.length - 1) : m.name, x + S / 2, y - 7);
      }
    }

    // ---------- held link (there are not yet two loose moves) ----------
    if (pl.bonds > 0 && !overlayDrawsPlayer) {
      const bx = sx + totalW + 12,
        by = sy + S / 2 - 12;
      G.Icons.draw(ctx, 'bond', bx, by, 24);
      if (pl.bonds > 1) {
        ctx.font = F(800, 10);
        ctx.textAlign = 'left';
        ctx.fillStyle = BOND;
        ctx.fillText('×' + pl.bonds, bx + 25, by + 20);
      }
    }

    // ---------- equipped item (to the left of the moves) ----------
    if (!overlayDrawsPlayer) {
      const ix = sx - S - 18,
        iy = sy;
      roundRect(ctx, ix, iy, S, S, 12);
      ctx.fillStyle = pl.item ? 'rgba(40,30,10,.9)' : 'rgba(10,16,28,.55)';
      ctx.fill();
      ctx.lineWidth = pl.item ? 2 : 1;
      ctx.strokeStyle = pl.item ? '#ffd23f' : 'rgba(140,170,210,.18)';
      ctx.stroke();
      if (pl.item) {
        G.Icons.draw(ctx, G.Items.BY[pl.item].icon || pl.item, ix + (S - 36) / 2, iy + (S - 36) / 2, 36);
        ctx.font = F(700, 9);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd23f';
        ctx.fillText(G.Items.BY[pl.item].name, ix + S / 2, iy - 6);
      }
    }

    // ---------- run items (team-wide): a 1-wide column, bottom-right, mirroring the team column. ONLY unlocked slots are drawn
    // (G.Items.runSlots: 1 by default, up to 4). Slot 1 sits at the bottom and each unlocked slot stacks above it. ----------
    if (!overlayDrawsRunItems) {
      const nSlots = G.Items.runSlots(G.DB.save),
        GAPR = 10,
        list = pl.runItems || [];
      let RS = 54;
      while (RS > 30 && nSlots * RS + (nSlots - 1) * GAPR > h - 130) RS -= 2; // shrink on short screens, like the team column
      // Wide slots on desktop: icon (left RS square) | separator | name + live/description (right 2*RS).
      // On touch or a narrow window, collapse back to the icon-only square column so phones stay compact.
      const wide = !touch && w >= 720;
      const RW = wide ? RS * 3 : RS;
      const rx = w - RW - 16,
        bottom = h - 16 - safeB;
      for (let k = 0; k < nSlots; k++) {
        const ry = bottom - (k + 1) * RS - k * GAPR,
          rid = list[k],
          def = rid && G.Items.BY[rid];
        roundRect(ctx, rx, ry, RW, RS, 12);
        if (!def) {
          // empty unlocked slot: dim dashed box
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.fillStyle = 'rgba(10,16,28,.35)';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = 'rgba(140,170,210,.22)';
          ctx.stroke();
          ctx.restore();
          continue;
        }
        ctx.fillStyle = 'rgba(20,30,50,.95)'; // same neutral dark blue as the team boxes
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(140,170,210,.4)';
        ctx.stroke();
        const IS = Math.round(RS * 0.67);
        G.Icons.draw(ctx, def.icon || rid, rx + (RS - IS) / 2, ry + (RS - IS) / 2, IS);
        if (!wide) continue; // collapsed: icon only
        // separator between icon and text
        ctx.save();
        ctx.strokeStyle = 'rgba(140,170,210,.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx + RS, ry + 6);
        ctx.lineTo(rx + RS, ry + RS - 6);
        ctx.stroke();
        ctx.restore();
        // right panel: clipped so long text can't bleed into the play area
        const tx = rx + RS + 8,
          tw = RW - RS - 14;
        const hud = G.Items.runHud ? G.Items.runHud(rid, pl) : { name: def.name, desc: def.desc, live: null };
        ctx.save();
        ctx.beginPath();
        ctx.rect(rx + RS, ry, RW - RS, RS);
        ctx.clip();
        ctx.textAlign = 'left';
        ctx.font = F(800, 11);
        ctx.fillStyle = '#ffd23f';
        ctx.fillText(hud.name, tx, ry + 16);
        if (hud.live) {
          // live tracker (counter -> bonus), or the inactive reason
          ctx.font = F(700, 11);
          ctx.fillStyle = '#9fe8ff';
          ctx.fillText(hud.live, tx, ry + 34);
        } else if (hud.desc) {
          // static: wrap the description to two short lines
          ctx.font = F(600, 9);
          ctx.fillStyle = 'rgba(200,214,235,.75)';
          const words = hud.desc.split(' ');
          let line = '',
            ly = ry + 32;
          for (const word of words) {
            if (ctx.measureText(line + word + ' ').width > tw && line) {
              ctx.fillText(line.trim(), tx, ly);
              line = '';
              ly += 11;
              if (ly > ry + RS - 3) break;
            }
            line += word + ' ';
          }
          if (line.trim() && ly <= ry + RS - 3) ctx.fillText(line.trim(), tx, ly);
        }
        ctx.restore();
      }
    }

    // ---------- pause button (touch) ----------
    if (touch) {
      const sa = G.Touch.safeArea();
      const pp = G.Touch.spot('pause');
      const bx = pp ? G.U.clamp(pp[0] * w - 20, 4, w - 44) : w - 52 - Math.min(44, sa.right);
      const by = pp ? G.U.clamp(pp[1] * h - 20, 10, h - 44) : 12 + Math.min(20, sa.top),
        bs = 40;
      roundRect(ctx, bx, by, bs, bs, 10);
      ctx.fillStyle = 'rgba(10,16,28,.7)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(244,248,255,.8)';
      ctx.stroke();
      ctx.fillStyle = '#f4f8ff';
      ctx.fillRect(bx + 13, by + 11, 5, 18);
      ctx.fillRect(bx + 22, by + 11, 5, 18);
      G.Touch.addButton(bx, by, bs, bs, () => G.Game.togglePause(), 8);
    }

    // pista de controles
    if (st.time < 14) {
      ctx.font = F(600, 10);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,200,230,.55)';
      ctx.fillText(
        touch
          ? 'Arrastra el dedo para moverte  ·  toca un ataque para cambiarlo'
          : 'WASD moverse  ·  1-4 / Q / E o clic en un ataque para cambiarlo  ·  Esc pausa',
        w / 2,
        h - 4
      );
    }

    ctx.restore();
  }

  // ---------------- cooperativo ----------------

  /**
   * - Each teammate's health below yours.
   * - An arrow at the edge of the screen toward those off-screen, with their name
   *   and how many meters away they are (red and blinking if down).
   * - If you have gone down: a notice and a "you are being lifted" bar.
   */
  function drawCoop(ctx, w, h, pl, px, top) {
    const cam = G.Camera;
    const t = performance.now() / 1000;
    let y = top;
    ctx.textAlign = 'left';
    for (const m of G.Coop.mates) {
      if (!m.connected) continue;
      const o = m.pl;
      ctx.font = F(800, 10);
      ctx.fillStyle = m.color;
      ctx.fillText(m.name, px, y + 9);
      const lx = px + 78;
      bar(ctx, lx, y + 1, 110, 8, o.dead ? 0 : o.hp / o.maxHp, o.dead ? '#ff5f6d' : '#5fe08a');
      if (o.dead) {
        ctx.font = F(800, 9);
        ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff8a96' : '#ffd0d5';
        ctx.fillText('CAÍDO', lx + 116, y + 9);
      }
      y += 15;
    }

    // Arrows toward the teammates off-screen.
    for (const m of G.Coop.mates) {
      if (!m.connected) continue;
      const o = m.pl;
      const sx = (o.x - cam.left()) * cam.scale,
        sy = (o.y - o.bodyH * 0.5 - cam.top()) * cam.scale;
      if (sx > 0 && sx < w && sy > 0 && sy < h) continue;
      const M = 42;
      const ex = G.U.clamp(sx, M, w - M),
        ey = G.U.clamp(sy, M + 70, h - M - 80);
      const a = Math.atan2(sy - ey, sx - ex);
      const metres = Math.round(G.U.dist(pl.x, pl.y, o.x, o.y) / 32);
      const col = o.dead ? (Math.sin(t * 8) > 0 ? '#ff5f6d' : '#ffd0d5') : m.color;
      ctx.save();
      ctx.translate(ex, ey);
      // Flecha
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a + 2.4) * 14, Math.sin(a + 2.4) * 14);
      ctx.lineTo(Math.cos(a - 2.4) * 14, Math.sin(a - 2.4) * 14);
      ctx.closePath();
      ctx.fill();
      // The teammate's initial inside the circle
      ctx.font = F(800, 14);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(m.name.charAt(0).toUpperCase(), 0, 5);
      // Name and distance: on the opposite side of the arrow, so it does not go off
      const lx = -Math.cos(a) * 30,
        ly = -Math.sin(a) * 26 + 4;
      ctx.font = F(800, 12);
      const label = (o.dead ? '¡' + m.name + ' necesita ayuda! ' : m.name + ' ') + '· ' + metres + ' m';
      ctx.textAlign = Math.cos(a) > 0.3 ? 'right' : Math.cos(a) < -0.3 ? 'left' : 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.strokeText(label, lx, ly);
      ctx.fillStyle = col;
      ctx.fillText(label, lx, ly);
      ctx.restore();
    }

    // You, down.
    if (pl.dead) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = F(800, 20);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      const msg = G.Coop.players().every((p) => p.dead)
        ? 'Habéis caído todos…'
        : 'Has caído: un compañero puede levantarte';
      ctx.strokeText(msg, w / 2, h * 0.62);
      ctx.fillStyle = '#ffb0b8';
      ctx.fillText(msg, w / 2, h * 0.62);
      const f = (pl.reviveT || 0) / G.Player.REVIVE_TIME;
      if (f > 0) bar(ctx, w / 2 - 110, h * 0.62 + 12, 220, 10, f, '#5fe08a');
      ctx.restore();
    }
  }

  return { draw, roundRect, bar, BAR_LIFT, moveCooldownFraction };
})();
