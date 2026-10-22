/* ============ hud.js — interfaz dentro del canvas ============
 * Drawn in SCREEN coordinates (without the camera transform).
 */
G.HUD = (() => {
  const F = (w, s) => `${w} ${s}px Pixelify,"Segoe UI",system-ui,sans-serif`;

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
    roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    if (frac > 0) {
      ctx.save();
      roundRect(ctx, x, y, w, h, h / 2); ctx.clip();
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
      ctx.fillStyle = f.dead ? 'rgba(120,130,145,.6)' : (G.U.TYPE_COLOR[f.mon.types[0]] || '#6b7a94');
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.4, 0, 6.2832); ctx.fill();
      return;
    }
    // Fill the box (scale by the SMALLER side) so the sprite is large; crop the rest.
    const scale = size / Math.min(m.w, m.h);
    const dw = m.w * scale, dh = m.h * scale;
    // Body center: horizontally the frame center, vertically ~55% up from the
    // ground anchor (ay) so the Pokemon's torso lands in the middle of the box.
    const bodyCx = m.w / 2;
    const bodyCy = m.ay != null ? m.ay - (m.ay * 0.42) : m.h * 0.5;
    const prev = ctx.globalAlpha;
    ctx.save();
    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, clipR || 8);
    ctx.clip();
    if (f.dead) ctx.globalAlpha = prev * 0.4;
    ctx.drawImage(s.img, 0, 0, m.w, m.h,
      Math.round(cx - bodyCx * scale), Math.round(cy - bodyCy * scale), dw, dh);
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
    const SLOTS = 6, GAP = 10, BH = 7, R = 12;
    // S matches the attack buttons (54), but shrinks on short screens so all 6 slots fit.
    const stackH = sz => SLOTS * (sz + 5 + BH) + (SLOTS - 1) * (GAP - 5);
    let S = 54;
    while (S > 30 && stackH(S) > h - 130) S -= 2;
    const ROW = S + 5 + BH;                        // icon box + gap + hp bar per slot
    const x = 16;                                  // fixed left column
    const startY = h - stackH(S) - 16;             // stack downward from here (anchored bottom)
    const cdFrac = G.U.clamp(G.Game.swapCooldown / G.Game.swapMax, 0, 1);
    // One row per FIXED team slot, in slot order. An empty slot shows a dim placeholder.
    for (let slot = 0; slot < SLOTS; slot++) {
      const f = roster.find(m => m.teamSlot === slot);
      const y = startY + slot * (ROW + GAP - 5);
      if (!f) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        roundRect(ctx, x, y, S, S, R);
        ctx.fillStyle = 'rgba(10,16,28,.35)'; ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(140,170,210,.22)'; ctx.stroke();
        ctx.restore();
        ctx.font = F(800, 9); ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(180,200,230,.35)';
        ctx.fillText(G.Input.keyLabel('swap_' + (slot + 1)) || String(slot + 1), x + 4, y + 11);
        bar(ctx, x, y + S + 5, S, BH, 0, 'rgba(120,130,145,.3)', 'rgba(0,0,0,.25)');
        continue;
      }
      const on = roster.indexOf(f) === activeIdx;
      const col = f.dead ? 'rgba(120,130,145,.6)' : (G.U.TYPE_COLOR[f.mon.types[0]] || '#6b7a94');
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
      ctx.font = F(800, 9); ctx.textAlign = 'left';
      ctx.fillStyle = on ? '#ffd23f' : 'rgba(180,200,230,.6)';
      const slotNo = slot + 1;   // the key hint follows the SLOT
      ctx.fillText(G.Input.keyLabel('swap_' + slotNo) || String(slotNo), x + 4, y + 11);
      // cooldown overlay on NON-active members during the swap lockout
      if (!on && !f.dead && cdFrac > 0) {
        ctx.save();
        roundRect(ctx, x, y, S, S, R); ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(x, y, S, S * cdFrac);
        ctx.restore();
      }
      // KO overlay
      if (f.dead) {
        ctx.font = F(800, 11); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,138,150,.95)';
        ctx.fillText('KO', x + S / 2, y + S / 2 + 4); ctx.textAlign = 'left';
      }
      // hp bar under the box
      const frac = f.dead ? 0 : f.hp / f.maxHp;
      bar(ctx, x, y + S + 5, S, BH, frac, f.dead ? 'rgba(120,130,145,.6)' : on ? '#ff5f6d' : '#c85059');
    }
    return x + S;                                  // right edge, so the buffs can sit beside the strip
  }

  /** Team berry bag (status berries, F3a-2): one box per slot, directly above the team list (bottom-left corner when the team is a single Pokemon).
   *  A stored berry shows its icon; it is used up on its own when the matching status would land. Returns the right edge when there is no team strip
   *  to sit above (so the buff chips can start after it), else 0. */
  function drawBerryBag(ctx, w, h, hasTeam) {
    const pl = G.Game.player;
    if (!pl || !pl.berries) return 0;
    const slots = G.Grounds.berrySlots(G.DB.save), bs = 44, gap = 8, x = 16;
    let top;
    if (hasTeam) {                                  // same stack maths as drawTeam
      const SL = 6, GAP = 10, BH = 7, stackH = sz => SL * (sz + 5 + BH) + (SL - 1) * (GAP - 5);
      let S = 54;
      while (S > 30 && stackH(S) > h - 130) S -= 2;
      top = h - stackH(S) - 16;
    } else top = h - 16;
    const y = top - bs - (hasTeam ? 12 : 0);
    for (let i = 0; i < slots; i++) {
      const bx = x + i * (bs + gap), id = pl.berries[i], def = id && G.Grounds.BY[id];
      roundRect(ctx, bx, y, bs, bs, 10);
      ctx.fillStyle = def ? 'rgba(10,30,44,.9)' : 'rgba(10,16,28,.55)';
      ctx.fill();
      ctx.lineWidth = def ? 2 : 1; ctx.strokeStyle = def ? '#9fe8ff' : 'rgba(140,170,210,.22)';
      ctx.stroke();
      if (def) G.Icons.draw(ctx, 'ps:' + def.icon, bx + (bs - 32) / 2, y + (bs - 32) / 2, 32);
      else { ctx.font = F(800, 9); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(180,200,230,.35)'; ctx.fillText('BERRY', bx + bs / 2, y + bs / 2 + 3); ctx.textAlign = 'left'; }
    }
    return hasTeam ? 0 : x + slots * (bs + gap) - gap;
  }

  // ---------- bottom strip: name (left) · HP bar (center) · level (right) ----------
  const HP_ROW = 26;          // height of the strip
  const HP_GAP = 10;          // space between the bottom of the screen and the strip
  // How far the action bar is lifted to make room for the strip. layout-ui.js reads it too.
  const BAR_LIFT = 28;

  // Action bar, single (unbonded) move: the bare icon, no box. The cooldown shade and the cast flash are masked to the icon's own
  // pixels (source-atop on a scratch canvas), and the active move gets a yellow outline of its silhouette.
  const PAD = 4;
  let _ic = null, _ol = null;
  function moveIcon(ctx, name, x, y, size, cd, flash, outline) {
    const W = size + PAD * 2;
    if (!_ic) { _ic = document.createElement('canvas'); _ol = document.createElement('canvas'); }
    if (_ic.width !== W) { _ic.width = _ic.height = _ol.width = _ol.height = W; }
    const c = _ic.getContext('2d'), o = _ol.getContext('2d');
    c.clearRect(0, 0, W, W);
    G.Icons.draw(c, name, PAD, PAD, size);
    if (outline) {
      o.clearRect(0, 0, W, W);
      for (let dx = -2; dx <= 2; dx += 2) for (let dy = -2; dy <= 2; dy += 2) if (dx || dy) o.drawImage(_ic, dx, dy);
      o.globalCompositeOperation = 'source-in'; o.fillStyle = '#ffd23f'; o.fillRect(0, 0, W, W);
      o.globalCompositeOperation = 'source-over';
      ctx.drawImage(_ol, x - PAD, y - PAD);
    }
    c.globalCompositeOperation = 'source-atop';
    if (cd > 0) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(PAD, PAD, size, size * cd); }      // empties from bottom to top
    if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (flash * 0.55).toFixed(2) + ')'; c.fillRect(0, 0, W, W); }
    c.globalCompositeOperation = 'source-over';
    ctx.drawImage(_ic, x - PAD, y - PAD);
  }

  /** Active statuses (G.Status.list) as small chips centered above the HP bar: label and seconds left. */
  function drawStatus(ctx, w, by, pl) {
    const L = G.Status.list(pl);
    if (!L.length) return;
    ctx.font = F(700, 11);
    const items = L.map(s => ({ s, txt: s.label + (s.t != null ? ' ' + Math.ceil(s.t) + 's' : '') }));
    const pad = 6, gap = 4, hgt = 16;
    const widths = items.map(i => ctx.measureText(i.txt).width + pad * 2);
    let x = (w - (widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1))) / 2;
    const y = by - hgt - 6;
    ctx.textAlign = 'center';
    items.forEach((i, n) => {
      ctx.fillStyle = i.s.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.roundRect(x, y, widths[n], hgt, 6); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#111';
      ctx.fillText(i.txt, x + widths[n] / 2, y + hgt - 4);
      x += widths[n] + gap;
    });
  }

  function drawHpStrip(ctx, w, h, pl, safeB) {
    const BW = G.U.clamp(w * 0.34, 160, 300), BH = 18;
    const bx = (w - BW) / 2;
    const cy = h - HP_GAP - safeB - HP_ROW / 2;      // vertical center of the strip
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
    while (size > 12 && ctx.measureText(pl.mon.name).width > room) { size--; ctx.font = F(800, size); }
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
    const CH = 32, GAPV = 6;
    let y = h - 16;                                  // bottom edge of the lowest chip
    ctx.textAlign = 'left';
    // One chip per live team buff: the stat stages, then the berry effects (type guards, Kee / Maranga, Lansat, Pinap drop bonus).
    const chips = [];
    for (const k of BUFF_ORDER) {
      const tm = pl.stgTeam && pl.stgTeam[k];
      if (!tm || !tm.length) continue;
      // Team RAISE of the stat (slice E2a): "ATK +2" for a stage, "REG ×2" for Aqua Ring's applications. Drops show in the status list below.
      const raise = k === 'regen' ? tm.length : Math.min(6, G.Stages.teamSum(pl.stgTeam, k));
      chips.push({ txt: BUFF_LBL[k] + (k === 'regen' ? ' ×' : ' +') + raise, col: BUFF_COL[k], k });
    }
    for (const k in (pl.stgTeam || {})) {
      if (BUFF_ORDER.includes(k) || !pl.stgTeam[k].length) continue;
      const c = G.Grounds.chip(k, G.Stages.teamSum(pl.stgTeam, k));
      if (c) chips.push({ txt: c.label, col: c.color, k });
    }
    for (const c of chips) {
      const b = G.Stages.teamTimer(pl.stgTeam, c.k);                     // longest time left among this buff's live applications
      ctx.font = F(800, 18);
      const txt = c.txt;
      const tw = Math.ceil(ctx.measureText(txt).width) + 20;
      const top = y - CH;
      roundRect(ctx, x0, top, tw, CH, 9);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = c.col; ctx.stroke();
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
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = pw.def.color; ctx.stroke();
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
    const L = G.Status.list(pl);
    for (const k in stMax) if (!L.some(s => s.k === k)) delete stMax[k];
    if (!L.length) return;
    ctx.textAlign = 'left';
    for (const s of L) {
      if (s.t != null) stMax[s.k] = Math.max(stMax[s.k] || 0, s.t);
      ctx.font = F(800, 18);
      const txt = s.label.toUpperCase() + (s.t != null ? ' ' + Math.ceil(s.t) + 's' : '');
      const tw = Math.ceil(ctx.measureText(txt).width) + 20;
      const top = y - CH;
      roundRect(ctx, x0, top, tw, CH, 9);
      ctx.fillStyle = 'rgba(40,0,6,.7)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ff5f6d'; ctx.stroke();
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
    if (G.Status.shakeable(pl)) {
      const key = G.Input.keyLabel('shake_off') || '?';
      const txt = G.Settings.get('autoShake') ? 'SHAKING OFF...' : 'TAP ' + key + ' TO SHAKE OFF!';
      ctx.font = F(800, 16);
      const tw = Math.ceil(ctx.measureText(txt).width) + 20, top = y - 26;
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(performance.now() / 90);
      roundRect(ctx, x0, top, tw, 26, 8);
      ctx.fillStyle = '#ffe14d'; ctx.fill();
      ctx.fillStyle = '#2a1d00';
      ctx.fillText(txt, x0 + 10, top + 18);
      ctx.globalAlpha = 1;
      if (G.Touch) G.Touch.addButton(x0, top, tw, 26, () => G.Status.shake(pl), 10);       // on a touch screen the prompt is the button
    }
  }

  function draw(ctx, w, h, pl, st) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    G.Touch.clearButtons();
    const touch = G.Touch.active;

    // ---------- barra de experiencia (borde superior) ----------
    const xpF = pl.xp / pl.xpNext;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(0, 0, w, 7);
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#4fd1ff'); g.addColorStop(1, '#a98bff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w * G.U.clamp(xpF, 0, 1), 7);

    // Name / HP / level now live in the bottom strip (drawn below); top-left is free.
    const px = 16, py = 22;
    const safeB = touch ? Math.min(28, G.Touch.safeArea().bottom) : 0;
    drawHpStrip(ctx, w, h, pl, safeB);

    // ---------- team strip (lower-left, only with a real team) ----------
    const teamRight = drawTeam(ctx, w, h);
    const bagRight = drawBerryBag(ctx, w, h, !!teamRight);
    drawBuffs(ctx, h, pl, teamRight ? teamRight + 12 : bagRight ? bagRight + 12 : 16);

    // ---------- reloj / bioma / kills ----------
    ctx.textAlign = 'center';
    ctx.font = F(800, 26);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.fillText(G.U.mmss(st.time), w / 2, 42);
    ctx.font = F(600, 10);
    ctx.fillStyle = '#8fa3c4';
    ctx.fillText(G.World.biomeName().toUpperCase() + '  ·  ' + pl.kills + ' DERROTADOS  ·  ' + pl.coins + ' MONEDAS', w / 2, 58);

    // Enemy level (top-right): same size/color as the run timer, with an "ENEMY LV"
    // subtitle. Shows the level enemies currently spawn at (see G.Enemies.levelForTime).
    ctx.textAlign = 'right';
    ctx.font = F(800, 26);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.fillText(Math.floor(G.Enemies.levelForTime(st.time)), w - 16, 42);
    ctx.font = F(600, 10);
    ctx.fillStyle = '#8fa3c4';
    ctx.fillText('ENEMY LV', w - 16, 58);
    ctx.textAlign = 'left';

    // ---------- clima (arriba a la derecha) ----------
    const wx = G.Weather.current;
    if (wx) {
      ctx.font = F(800, 11);
      ctx.textAlign = 'left';
      const txt = wx.name.toUpperCase() + ' · ' + Math.ceil(wx.left) + 's';
      const tw = ctx.measureText(txt).width + 40;
      const x0 = w - tw - 16 - (touch ? 56 : 0), y0 = 14;
      roundRect(ctx, x0, y0, tw, 26, 9);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
      G.Icons.draw(ctx, wx.icon, x0 + 6, y0 + 3, 20);
      ctx.fillStyle = wx.color;
      ctx.fillText(txt, x0 + 32, y0 + 17);
    }

    // ---------- boss bar ----------
    const boss = G.EnemyMgr.all().find(e => e.boss && !e.dead);
    if (boss) {
      const bw = Math.min(420, w - 80);
      bar(ctx, (w - bw) / 2, 70, bw, 12, boss.hp / boss.maxHp, '#ffcb3d');
      ctx.font = F(800, 10);
      ctx.fillStyle = '#20160a';
      ctx.fillText(boss.gym ? (boss.gym.leader + "'S " + boss.name + ' · LV ' + boss.gym.level).toUpperCase() : boss.name.toUpperCase(), w / 2, 80);
      if (boss.gym) {
        const left = G.Gym.enrageIn(boss);
        ctx.font = F(700, 10); ctx.fillStyle = left === 0 ? '#ff7070' : '#ffe9b0';
        ctx.fillText(left === 0 ? 'ENRAGED' : left != null ? 'ENRAGE IN ' + Math.ceil(left) + ' s' : 'HIT IT TO ENGAGE', w / 2, 98);
      }
    }

    // ---------- elite bar (an overworld elite; the boss bar wins if both are up) ----------
    const elite = !boss && G.Elites.current();
    if (elite) {
      const bw = Math.min(380, w - 80), left = G.Elites.enrageIn(elite), enr = left === 0;
      bar(ctx, (w - bw) / 2, 70, bw, 12, elite.hp / elite.maxHp, enr ? '#ff5050' : '#ff9f43');
      ctx.font = F(800, 10);
      ctx.fillStyle = '#20160a';
      ctx.fillText('ELITE ' + elite.name.toUpperCase(), w / 2, 80);
      ctx.font = F(700, 10);
      ctx.fillStyle = enr ? '#ff7070' : '#ffd9a8';
      ctx.fillText(enr ? 'ENRAGED' : left != null ? 'ENRAGE IN ' + Math.ceil(left) + ' s' : 'HIT IT TO ENGAGE', w / 2, 98);
    }

    // ---------- aviso ----------
    // ---------- off-screen shinies: a glint at the edge ----------
    const cam = G.Camera, pulse = 0.6 + Math.sin(performance.now() / 160) * 0.4;
    for (const e of G.EnemyMgr.shinies()) {
      const sx = (e.x - cam.left()) * cam.scale, sy = (e.y - cam.top()) * cam.scale;
      if (sx > 0 && sx < w && sy > 0 && sy < h) continue;
      const M = 34;
      const ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 60, h - M - 70);
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
      const sx = (elite.x - cam.left()) * cam.scale, sy = (elite.y - cam.top()) * cam.scale;
      if (!(sx > 0 && sx < w && sy > 0 && sy < h)) {
        const M = 38, ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 60, h - M - 70);
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
        ctx.font = F(800, 10); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText('ELITE', -Math.cos(a) * 20, -Math.sin(a) * 20 + 4);
        ctx.restore();
      }
    }

    if (G.Coop.active) drawCoop(ctx, w, h, pl, px, py + 4);

    // Rift: a big arrow pulsing at the edge if off-screen, and if visible, a
    // an arrow bouncing above; in the arena, a countdown.
    const rift = G.Rift.rift;
    if (rift) {
      const sx = (rift.x - cam.left()) * cam.scale, sy = (rift.y - 40 - cam.top()) * cam.scale;
      const now = performance.now() / 1000, beat = 0.5 + Math.sin(now * 7) * 0.5;
      const label = rift.gym ? 'GYM ' + (rift.gym.idx + 1) + ' · ' + rift.gym.leader.toUpperCase() + ' · LV ' + rift.gym.level + ' · ' + Math.round(G.U.dist(pl.x, pl.y, rift.x, rift.y) / 32) + ' m'
        : 'GRIETA · ' + Math.round(G.U.dist(pl.x, pl.y, rift.x, rift.y) / 32) + ' m · ' + Math.ceil(rift.ttl) + ' s';
      const off = sx < 0 || sx > w || sy < 0 || sy > h;
      ctx.save();
      if (off) {
        const M = 52, ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 70, h - M - 80);
        const a = Math.atan2(sy - ey, sx - ex), ca = Math.cos(a), sa = Math.sin(a);
        ctx.translate(ex, ey);
        // Halo que late.
        ctx.globalAlpha = 0.18 + beat * 0.22;
        ctx.fillStyle = '#b48aff';
        ctx.beginPath(); ctx.arc(0, 0, 30 + beat * 8, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        const tri = (k) => {
          ctx.beginPath();
          ctx.moveTo(ca * 40 * k, sa * 40 * k);
          ctx.lineTo(Math.cos(a + 2.45) * 20 * k, Math.sin(a + 2.45) * 20 * k);
          ctx.lineTo(Math.cos(a - 2.45) * 20 * k, Math.sin(a - 2.45) * 20 * k);
          ctx.closePath();
        };
        tri(1.12); ctx.fillStyle = '#1a0b33'; ctx.fill();
        tri(1); ctx.fillStyle = beat > 0.5 ? '#e2d0ff' : '#a06bff'; ctx.fill();
        ctx.font = F(800, 12);
        ctx.textAlign = ca > 0.3 ? 'right' : ca < -0.3 ? 'left' : 'center';
        const lx = -ca * 34, ly = -sa * 30 + 4;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
        ctx.strokeText(label, lx, ly);
        ctx.fillStyle = '#e2d0ff';
        ctx.fillText(label, lx, ly);
      } else {
        // Above the rift: a bouncing down arrow.
        const by = sy - 46 - Math.abs(Math.sin(now * 4)) * 10;
        ctx.translate(sx, by);
        ctx.beginPath(); ctx.moveTo(-15, -12); ctx.lineTo(15, -12); ctx.lineTo(0, 8); ctx.closePath();
        ctx.lineWidth = 4; ctx.strokeStyle = '#1a0b33'; ctx.stroke();
        ctx.fillStyle = beat > 0.5 ? '#e2d0ff' : '#a06bff'; ctx.fill();
        ctx.font = F(800, 11); ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
        const l2 = rift.gym ? 'GYM · LV ' + rift.gym.level : 'GRIETA · ' + Math.ceil(rift.ttl) + ' s';
        ctx.strokeText(l2, 0, -18); ctx.fillStyle = '#e2d0ff'; ctx.fillText(l2, 0, -18);
      }
      ctx.restore();
    }
    if (G.Rift.inArena) {
      ctx.textAlign = 'center';
      ctx.font = F(800, 12);
      ctx.fillStyle = '#d9c2ff';
      ctx.fillText(G.Rift.isGym ? 'GYM' : 'GRIETA · ' + G.U.mmss(G.Rift.timeLeft), w / 2, boss ? 112 : 76);
    }

    // Events: countdown, arrow to the lost Pokemon / to the mark and to the imps.
    G.Events.drawHud(ctx, w, h, pl, F);

    // Its own notice when a rift opens (the other notices do not cover it).
    if (rift && rift.t < 4.5) {
      const a = Math.min(1, rift.t * 4, (4.5 - rift.t) * 2), pop = 1 + Math.max(0, 0.25 - rift.t) * 1.6;
      const y0 = h * 0.2;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, y0); ctx.scale(pop, pop);
      ctx.font = F(800, 20);
      const t1 = rift.gym ? 'A GYM GATE HAS OPENED' : '¡SE HA ABIERTO UNA GRIETA!', t2 = rift.gym ? rift.gym.leader + ' waits inside (Lv ' + rift.gym.level + '). Follow the purple arrow.' : 'Sigue la flecha morada: dentro te espera un legendario';
      const bw = Math.min(w - 24, Math.max(ctx.measureText(t1).width, (ctx.font = F(700, 11), ctx.measureText(t2).width)) + 36);
      roundRect(ctx, -bw / 2, -26, bw, 52, 10);
      ctx.fillStyle = 'rgba(26,11,51,.88)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#b48aff'; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = F(800, 20); ctx.fillStyle = '#e2d0ff'; ctx.fillText(t1, 0, -2);
      ctx.font = F(700, 11); ctx.fillStyle = '#c9b0ff'; ctx.fillText(t2, 0, 16);
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
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 4;
      ctx.strokeText(ban.text, w / 2, h * 0.3);
      ctx.fillText(ban.text, w / 2, h * 0.3);
      ctx.restore();
    }

    // ---------- ranura de movimientos ----------
    const S = 54, GAP = 9;
    const n = Math.max(1, pl.slots.length);
    const totalW = n * S + (n - 1) * GAP;
    let sx = (w - totalW) / 2;
    // Above the iPhone home bar (there the touches sometimes do not arrive).
    let sy = h - S - 18 - safeB - BAR_LIFT;   // lifted to leave room for the HP strip
    // On mobile, where the player placed it: the item block + all the
    // slots (even if not yet full), by their center, as in the editor
    // (layout-ui.js); the new attacks appear toward the right.
    const pb = touch && G.Touch.spot('bar');
    if (pb) {
      const nAll = Math.max(n, pl.maxMoves), bw = S + 18 + nAll * S + (nAll - 1) * GAP;
      sx = G.U.clamp(pb[0] * w - bw / 2, 6, Math.max(6, w - bw - 6)) + S + 18;
      sy = G.U.clamp(pb[1] * h - S / 2, 24, h - S - 6 - BAR_LIFT);   // never covers the HP strip
    }
    const BOND = '#ff8ad8';
    // A move that is ready but has no target (or the caster is frozen) re-arms m.t to 0.05 every frame (combat.js tickMove): that sawtooth is not a cooldown, so <= 0.05 s reads as ready.
    const cdOf = m => m.kind === 'orbit' || m.t <= 0.05 ? 0 : G.U.clamp(m.t / (m.cd * pl.cdMul), 0, 1);

    for (let i = 0; i < n; i++) {
      const g = pl.slots[i] || [];
      const m = g[0];
      const fused = g.length > 1;
      const on = i === pl.active;
      const x = sx + i * (S + GAP);
      const y = on ? sy - 6 : sy;
      // Tapping (or clicking) an icon activates that move.
      if (m) G.Touch.addButton(x, y, S, S, () => { if (G.Game.state === 'playing' && pl.active !== i) { pl.setActive(i); G.Audio.sfx('click'); } }, GAP / 2 + 3);
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
        const C = 22, P = (S - C * 2) / 3;
        g.forEach((gm, k) => {
          const cx = x + P + (k % 2) * (C + P), cy = y + P + Math.floor(k / 2) * (C + P);
          G.Icons.draw(ctx, 'move:' + gm.id, cx, cy, C);
          const f = cdOf(gm);
          if (f > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(cx, cy, C, C * f); }
          // Destello al lanzarse.
          const fl = 1 - (performance.now() - (gm.castAt || 0)) / 180;
          if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (fl * 0.55).toFixed(2) + ')'; ctx.fillRect(cx, cy, C, C); }
        });
      } else {
        // type emblem + family badge at the box size (54 = 3x the 18 px native icon), cooldown and flash on the icon itself
        moveIcon(ctx, 'move:' + m.id, x, y, S, cdOf(m), 1 - (performance.now() - (m.castAt || 0)) / 180, on);

        // upgrade stacks taken on this move (badge, hidden at 0)
        const stk = G.Moves.stackTotal(m);
        if (stk > 0) {
          ctx.save();
          ctx.font = F(800, 10); ctx.textAlign = 'center'; ctx.fillStyle = col;
          ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
          ctx.strokeText('+' + stk, x + S / 2, y + S - 4);
          ctx.fillText('+' + stk, x + S / 2, y + S - 4);
          ctx.restore();
        }
      }

      // key
      ctx.font = F(800, 9);
      ctx.fillStyle = fused ? BOND : on ? col : 'rgba(180,200,230,.6)';
      ctx.textAlign = 'left';
      const kl = G.Input.keyLabel('attack_' + (i + 1)) || String(i + 1);
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeText(kl, x + 3, y + 10); ctx.restore();
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
    if (pl.bonds > 0) {
      const bx = sx + totalW + 12, by = sy + S / 2 - 12;
      G.Icons.draw(ctx, 'bond', bx, by, 24);
      if (pl.bonds > 1) {
        ctx.font = F(800, 10);
        ctx.textAlign = 'left';
        ctx.fillStyle = BOND;
        ctx.fillText('×' + pl.bonds, bx + 25, by + 20);
      }
    }

    // ---------- equipped item (to the left of the moves) ----------
    {
      const ix = sx - S - 18, iy = sy;
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
    {
      const nSlots = G.Items.runSlots(G.DB.save), GAPR = 10, list = pl.runItems || [];
      let RS = 54;
      while (RS > 30 && nSlots * RS + (nSlots - 1) * GAPR > h - 130) RS -= 2;      // shrink on short screens, like the team column
      const rx = w - RS - 16, bottom = h - 16 - safeB;
      for (let k = 0; k < nSlots; k++) {
        const ry = bottom - (k + 1) * RS - k * GAPR, rid = list[k], def = rid && G.Items.BY[rid];
        roundRect(ctx, rx, ry, RS, RS, 12);
        if (!def) {                                   // empty unlocked slot: dim dashed box
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.fillStyle = 'rgba(10,16,28,.35)'; ctx.fill();
          ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(140,170,210,.22)'; ctx.stroke();
          ctx.restore();
          continue;
        }
        ctx.fillStyle = 'rgba(20,30,50,.95)';           // same neutral dark blue as the team boxes
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(140,170,210,.4)';
        ctx.stroke();
        const IS = Math.round(RS * 0.67);
        G.Icons.draw(ctx, def.icon || rid, rx + (RS - IS) / 2, ry + (RS - IS) / 2, IS);
      }
    }

    // ---------- pause button (touch) ----------
    if (touch) {
      const sa = G.Touch.safeArea();
      const pp = G.Touch.spot('pause');
      const bx = pp ? G.U.clamp(pp[0] * w - 20, 4, w - 44) : w - 52 - Math.min(44, sa.right);
      const by = pp ? G.U.clamp(pp[1] * h - 20, 10, h - 44) : 12 + Math.min(20, sa.top), bs = 40;
      roundRect(ctx, bx, by, bs, bs, 10);
      ctx.fillStyle = 'rgba(10,16,28,.7)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(244,248,255,.8)'; ctx.stroke();
      ctx.fillStyle = '#f4f8ff';
      ctx.fillRect(bx + 13, by + 11, 5, 18); ctx.fillRect(bx + 22, by + 11, 5, 18);
      G.Touch.addButton(bx, by, bs, bs, () => G.Game.togglePause(), 8);
    }

    // pista de controles
    if (st.time < 14) {
      ctx.font = F(600, 10);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,200,230,.55)';
      ctx.fillText(touch ? 'Arrastra el dedo para moverte  ·  toca un ataque para cambiarlo'
                         : 'WASD moverse  ·  1-4 / Q / E o clic en un ataque para cambiarlo  ·  Esc pausa', w / 2, h - 4);
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
      const sx = (o.x - cam.left()) * cam.scale, sy = (o.y - o.bodyH * 0.5 - cam.top()) * cam.scale;
      if (sx > 0 && sx < w && sy > 0 && sy < h) continue;
      const M = 42;
      const ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 70, h - M - 80);
      const a = Math.atan2(sy - ey, sx - ex);
      const metres = Math.round(G.U.dist(pl.x, pl.y, o.x, o.y) / 32);
      const col = o.dead ? (Math.sin(t * 8) > 0 ? '#ff5f6d' : '#ffd0d5') : m.color;
      ctx.save();
      ctx.translate(ex, ey);
      // Flecha
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.2832); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a + 2.4) * 14, Math.sin(a + 2.4) * 14);
      ctx.lineTo(Math.cos(a - 2.4) * 14, Math.sin(a - 2.4) * 14);
      ctx.closePath(); ctx.fill();
      // The teammate's initial inside the circle
      ctx.font = F(800, 14);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(m.name.charAt(0).toUpperCase(), 0, 5);
      // Name and distance: on the opposite side of the arrow, so it does not go off
      const lx = -Math.cos(a) * 30, ly = -Math.sin(a) * 26 + 4;
      ctx.font = F(800, 12);
      const label = (o.dead ? '¡' + m.name + ' necesita ayuda! ' : m.name + ' ') + '· ' + metres + ' m';
      ctx.textAlign = Math.cos(a) > 0.3 ? 'right' : Math.cos(a) < -0.3 ? 'left' : 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
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
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      const msg = G.Coop.players().every(p => p.dead) ? 'Habéis caído todos…' : 'Has caído: un compañero puede levantarte';
      ctx.strokeText(msg, w / 2, h * 0.62);
      ctx.fillStyle = '#ffb0b8';
      ctx.fillText(msg, w / 2, h * 0.62);
      const f = (pl.reviveT || 0) / G.Player.REVIVE_TIME;
      if (f > 0) bar(ctx, w / 2 - 110, h * 0.62 + 12, 220, 10, f, '#5fe08a');
      ctx.restore();
    }
  }

  return { draw, roundRect, bar, BAR_LIFT };
})();
