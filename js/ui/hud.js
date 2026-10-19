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

  // ---------- bottom strip: name (left) · HP bar (center) · level (right) ----------
  const HP_ROW = 26;          // height of the strip
  const HP_GAP = 10;          // space between the bottom of the screen and the strip
  // How far the action bar is lifted to make room for the strip. layout-ui.js reads it too.
  const BAR_LIFT = 28;

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
  const BUFF_COL = { atk: '#ff6b4d', spd: '#7fe0ff', def: '#b0b8c8', regen: '#5fe08a' };
  const BUFF_LBL = { atk: 'ATK', spd: 'SPD', def: 'DEF', regen: 'REG' };

  function drawBuffs(ctx, h, pl, x0) {
    const CH = 32, GAPV = 6;
    let y = h - 16;                                  // bottom edge of the lowest chip
    ctx.textAlign = 'left';
    for (const k in pl.buffs) {
      const b = pl.buffs[k];
      if (b.n <= 0) continue;
      ctx.font = F(800, 18);
      const txt = BUFF_LBL[k] + ' ×' + b.n;
      const tw = Math.ceil(ctx.measureText(txt).width) + 20;
      const top = y - CH;
      roundRect(ctx, x0, top, tw, CH, 9);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = BUFF_COL[k]; ctx.stroke();
      ctx.fillStyle = BUFF_COL[k];
      ctx.fillText(txt, x0 + 10, top + 21);
      // Timer: how long is left before this buff runs out (it keeps ticking while benched).
      const frac = b.dur > 0 ? G.U.clamp(b.t / b.dur, 0, 1) : 0;
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(x0 + 8, top + CH - 6, tw - 16, 3);
      ctx.fillStyle = BUFF_COL[k];
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
    drawBuffs(ctx, h, pl, teamRight ? teamRight + 12 : 16);

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
      ctx.fillText(boss.name.toUpperCase(), w / 2, 80);
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
      const label = 'GRIETA · ' + Math.round(G.U.dist(pl.x, pl.y, rift.x, rift.y) / 32) + ' m · ' + Math.ceil(rift.ttl) + ' s';
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
        const l2 = 'GRIETA · ' + Math.ceil(rift.ttl) + ' s';
        ctx.strokeText(l2, 0, -18); ctx.fillStyle = '#e2d0ff'; ctx.fillText(l2, 0, -18);
      }
      ctx.restore();
    }
    if (G.Rift.inArena) {
      ctx.textAlign = 'center';
      ctx.font = F(800, 12);
      ctx.fillStyle = '#d9c2ff';
      ctx.fillText('GRIETA · ' + G.U.mmss(G.Rift.timeLeft), w / 2, boss ? 98 : 76);
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
      const t1 = '¡SE HA ABIERTO UNA GRIETA!', t2 = 'Sigue la flecha morada: dentro te espera un legendario';
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
    const cdOf = m => m.kind === 'orbit' ? 0 : G.U.clamp(m.t / (m.cd * pl.cdMul), 0, 1);

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

      // fondo
      roundRect(ctx, x, y, S, S, 12);
      ctx.fillStyle = on ? 'rgba(20,30,50,.95)' : 'rgba(10,16,28,.8)';
      ctx.fill();
      ctx.lineWidth = on ? 2.5 : fused ? 2 : 1.2;
      // Link: pink border.
      ctx.strokeStyle = fused ? BOND : on ? col : 'rgba(140,170,210,.22)';
      ctx.stroke();

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
        // cooldown: it empties from bottom to top
        const cdFrac = cdOf(m);
        if (cdFrac > 0) {
          ctx.save();
          roundRect(ctx, x, y, S, S, 12); ctx.clip();
          ctx.fillStyle = 'rgba(0,0,0,.6)';
          ctx.fillRect(x, y, S, S * cdFrac);
          ctx.restore();
        }

        // type emblem + family badge
        G.Icons.draw(ctx, 'move:' + m.id, x + (S - 32) / 2, y + (S - 32) / 2 - 2, 32);

        // upgrade stacks taken on this move (badge, hidden at 0)
        const stk = G.Moves.stackTotal(m);
        if (stk > 0) {
          ctx.save();
          ctx.font = F(800, 10); ctx.textAlign = 'center'; ctx.fillStyle = col;
          ctx.fillText('+' + stk, x + S / 2, y + S - 4);
          ctx.restore();
        }
      }

      // key
      ctx.font = F(800, 9);
      ctx.fillStyle = fused ? BOND : on ? col : 'rgba(180,200,230,.6)';
      ctx.textAlign = 'left';
      ctx.fillText(G.Input.keyLabel('attack_' + (i + 1)) || String(i + 1), x + 3, y + 10);

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
        G.Icons.draw(ctx, pl.item, ix + (S - 36) / 2, iy + (S - 36) / 2, 36);
        ctx.font = F(700, 9);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd23f';
        ctx.fillText(G.Items.BY[pl.item].name, ix + S / 2, iy - 6);
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
