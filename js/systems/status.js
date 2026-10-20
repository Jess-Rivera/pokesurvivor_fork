/* ============ status.js - shared status engine (status rework, slice C) ============
 * ONE engine for every host that can carry a status: wild enemies, elites, bosses, gym leaders AND the player.
 * A host is any object with x, y, maxHp, hp, a types list (host.types, or host.mon.types for the player) and
 * the state fields below. Enemies keep their slice A burn / poison fields (burn, poison, ...); the player,
 * which has none, gets the same numbers through stDot. Both count as the one "major" status.
 *
 * Host state (all null until used):
 *   stMajor  { k, t, age }              paralysis | freeze | sleep   (one major at a time, with burn / poison)
 *   stCnf    { t, wa, wt }              confusion: wander angle wa, retarget timer wt
 *   stTrap   { t }                      trap (player only, Jess 2026-10-20): no damage, no slow; manual team swaps are locked for t s
 *   stDaze   { t, a, ta, wt }           daze: the heading is jittered +-35 deg, re-rolled every 0.2 to 0.4 s and eased (a = current, ta = target)
 *   stDrow   { t }                      drowsy: sleep-effect chance x1.5 (capped at 100%), shown as a floating zzz
 *   stWin    { freeze, sleep, hard }    seconds during which that hard CC cannot be applied again (hard: the player's grace after any hard CC)
 *   shakeCd  number                     player only: seconds until the next Shake off tap counts (12 taps/s cap)
 *   stDot    { k, left, tick, n, mul }  player only: burn | poison | toxic
 *
 * Rules (Jess 2026-10-19):
 *   - one major status at a time (burn, poison, paralysis, sleep, freeze); a new one never overwrites the old
 *   - bosses, elites, gym leaders: freeze and sleep last 25% as long, then a 10 s no-reapply window;
 *     paralysis, slow, daze and confusion work at full strength
 *   - the PLAYER (slice E1, Jess 2026-10-20): every timer is FULL, and the hard CC (sleep, freeze, paralysis, confusion, trap, daze) can be
 *     cut short by Shake off taps (shake()). After a hard CC ends there is a 2.5 s grace in which no new hard CC lands.
 *   - wild enemies: freeze 2 s then a 4 s window; sleep 2-6 s; damage never wakes a sleeper, a Fire hit thaws ice
 *   - a "turn" is 2 s, as in G.Enemies.STATUS
 */
G.Status = (() => {
  const TURN = 2;
  const CONTROL = {
    paralysis: { major: true,  dur: 10,     immune: ['electric'], speed: 0.5,  fizzle: 0.25, color: '#f5d742', label: 'Paralyzed' },
    freeze:    { major: true,  dur: 2,      immune: ['ice'],      window: 4,    thawBy: 'fire', color: '#8fd8f0', label: 'Frozen' },
    sleep:     { major: true,  dur: [2, 6], immune: [],           window: 0,    color: '#b9a3e8', label: 'Asleep' },
    confusion: { major: false, dur: [2, 8], immune: [],           fizzle: 0.5,  color: '#e57fc4', label: 'Confused' },
    trap:      { major: false, dur: 8,      immune: ['ghost'],       color: '#b0743a', label: 'Trapped' },     // player only: swap lock
    daze:      { major: false, dur: 6,      immune: [],           jitter: 35 * Math.PI / 180, color: '#e8b04a', label: 'Dazed' },
    drowsy:    { major: false, dur: 8,      immune: [],           sleepMul: 1.5, color: '#9a8fd8', label: 'Drowsy' }
  };
  const STRONG = { cut: 0.25, window: 10 };      // bosses, elites, gym leaders: hard CC (freeze, sleep)
  // Player only (slice E1): Shake off. Each tap takes `per` s off the status with the most time left among the mashable ones,
  // never below `floor` s remaining; at most `rate` taps count per second. Order = most restrictive first.
  const SHAKE = { per: 0.25, floor: 0.5, rate: 12, order: ['sleep', 'freeze', 'paralysis', 'confusion', 'trap', 'daze'] };
  const GRACE = 2.5;                              // player: seconds after a hard CC ends in which no new hard CC lands
  const HARD = ['sleep', 'freeze', 'paralysis'];

  const strong = h => !!(h.boss || h.elite || h.gym);                  // the player is NOT strong any more (full timers + Shake off)
  const typesOf = h => h.types || (h.mon && h.mon.types) || [];
  const fam = k => (k === 'toxic' ? 'poison' : k);
  const isControl = k => !!CONTROL[k];

  function immune(h, kind) {
    const S = CONTROL[kind] || (G.Enemies && G.Enemies.STATUS[kind]);
    return !!S && S.immune.some(t => typesOf(h).includes(t));
  }

  /** The major status on `h` right now ('burn' | 'poison' | 'toxic' | 'paralysis' | 'freeze' | 'sleep') or null. */
  function majorKind(h) {
    if (h.stMajor) return h.stMajor.k;
    if (h.stDot) return h.stDot.k;
    if (h.burn > 0) return 'burn';
    if (h.poison > 0) return h.poison === 2 ? 'toxic' : 'poison';
    return null;
  }
  /** True when another major status already holds `h` (burn and poison upgrades of their own family are not blocked). */
  function blocked(h, kind) {
    const cur = majorKind(h);
    return !!cur && fam(cur) !== fam(kind);
  }

  function text(h, msg, color) {
    if (G.FX && G.FX.dmgText) G.FX.dmgText(h.x, h.y - (h.bodyH || 30) - 4, msg, color);
  }
  function dur(h, kind) {
    const S = CONTROL[kind];
    const base = Array.isArray(S.dur) ? G.U.rand(S.dur[0], S.dur[1]) : S.dur;
    return (kind === 'freeze' || kind === 'sleep') && strong(h) ? base * STRONG.cut : base;
  }

  /**
   * Put a control status on `h`. Returns 'ok' | 'refresh' | 'immune' | 'blocked' (another major holds it) | 'window' (hard CC cooldown).
   * `mul` is the DoT strength of the source move (only trap uses it).
   */
  function apply(h, kind, mul = 1, durMul = 1) {
    const S = CONTROL[kind];
    if (!S || h.dead) return 'none';
    if (kind === 'trap' && !h.isPlayer) return 'none';                 // trap is a player-only swap lock
    if (immune(h, kind)) { text(h, 'Immune', '#a3abb8'); return 'immune'; }
    if (h.isPlayer && HARD.includes(kind) && h.stWin && h.stWin.hard > 0) return 'window';
    if (S.major) {
      const cur = majorKind(h);
      if (cur && cur !== kind) return 'blocked';
      if (cur === kind) {                                     // paralysis refreshes; freeze and sleep never extend (no lock)
        if (kind === 'paralysis') h.stMajor.t = Math.max(h.stMajor.t, dur(h, kind) * durMul);
        return 'refresh';
      }
      if (h.stWin && h.stWin[kind] > 0) return 'window';
      h.stMajor = { k: kind, t: dur(h, kind) * durMul, age: 0 };
      text(h, S.label, S.color);
      return 'ok';
    }
    if (kind === 'confusion') {
      const t = dur(h, kind) * durMul, was = !!h.stCnf;
      if (was) h.stCnf.t = Math.max(h.stCnf.t, t);
      else { h.stCnf = { t, wa: G.U.rand(0, 6.2832), wt: G.U.rand(0.5, 1.1) }; text(h, S.label, S.color); }
      return was ? 'refresh' : 'ok';
    }
    if (kind === 'daze') {
      const was = !!h.stDaze;
      if (was) h.stDaze.t = Math.max(h.stDaze.t, S.dur * durMul);
      else { h.stDaze = { t: S.dur * durMul, a: 0, ta: 0, wt: 0 }; text(h, S.label, S.color); }
      return was ? 'refresh' : 'ok';
    }
    if (kind === 'drowsy') {
      const was = !!h.stDrow;
      if (was) h.stDrow.t = Math.max(h.stDrow.t, S.dur * durMul);
      else { h.stDrow = { t: S.dur * durMul }; text(h, S.label, S.color); }
      return was ? 'refresh' : 'ok';
    }
    // trap (player only): a swap lock
    const was = !!h.stTrap, t = S.dur * durMul;
    if (was) h.stTrap.t = Math.max(h.stTrap.t, t);
    else { h.stTrap = { t }; text(h, S.label, S.color); }
    return was ? 'refresh' : 'ok';
  }

  /** Burn / poison / toxic on a host that has no slice A fields (the player). Same table, same immunities and numbers. */
  function applyDot(h, kind, mul = 1, durMul = 1) {
    const S = G.Enemies.STATUS[kind];
    if (!S || h.dead) return 'none';
    if (immune(h, kind)) { text(h, 'Immune', '#a3abb8'); return 'immune'; }
    if (blocked(h, kind)) return 'blocked';
    const d = h.stDot;
    if (d) {
      if (kind === 'toxic' && d.k !== 'toxic') { d.k = 'toxic'; d.n = 0; }            // poison upgrades to toxic, never back
      d.left = Math.max(d.left, Math.max(1, Math.round(S.turns * durMul)));
      if (mul > d.mul) d.mul = mul;
      return 'refresh';
    }
    h.stDot = { k: kind, left: Math.max(1, Math.round(S.turns * durMul)), tick: S.turn, n: 0, mul };
    return 'ok';
  }

  function damage(h, name, amount, color) {
    if (h.dot) h.dot(name, amount, color);
    else if (h.statusDot) h.statusDot(name, amount, color);
  }

  function endMajor(h) {
    const M = h.stMajor; if (!M) return;
    const S = CONTROL[M.k], w = strong(h) && (M.k === 'freeze' || M.k === 'sleep') ? STRONG.window : (S.window || 0);
    if (w > 0) (h.stWin || (h.stWin = {}))[M.k] = w;
    if (h.isPlayer && HARD.includes(M.k)) (h.stWin || (h.stWin = {})).hard = GRACE;
    h.stMajor = null;
  }

  /** Advance every control timer on `h`. Called once per frame from Enemy.update and Player.update. */
  function tick(h, dt) {
    if (h.stWin) {
      let any = false;
      for (const k in h.stWin) { if ((h.stWin[k] -= dt) <= 0) delete h.stWin[k]; else any = true; }
      if (!any) h.stWin = null;
    }
    const M = h.stMajor;
    if (M) { M.t -= dt; M.age += dt; if (M.t <= 0) endMajor(h); }
    const C = h.stCnf;
    if (C) {
      C.t -= dt; C.wt -= dt;
      if (C.wt <= 0) { C.wt = G.U.rand(0.5, 1.1); C.wa = G.U.rand(0, 6.2832); }
      if (C.t <= 0) h.stCnf = null;
    }
    if (h.shakeCd > 0) h.shakeCd -= dt;
    const T = h.stTrap;
    if (T && (T.t -= dt) <= 0) h.stTrap = null;
    const Z = h.stDaze;
    if (Z) {
      Z.t -= dt; Z.wt -= dt;
      if (Z.wt <= 0) { Z.wt = G.U.rand(0.2, 0.4); Z.ta = G.U.rand(-1, 1) * CONTROL.daze.jitter; }
      Z.a += (Z.ta - Z.a) * Math.min(1, dt * 10);                          // eased toward the target angle
      if (Z.t <= 0) h.stDaze = null;
    }
    const R = h.stDrow;
    if (R && (R.t -= dt) <= 0) h.stDrow = null;
    const D = h.stDot;
    if (D && !h.dead) {
      D.tick -= dt;
      if (D.tick <= 0) {
        const bad = D.k === 'toxic', S = G.Enemies.STATUS[D.k];
        D.tick += S.turn;
        let frac = S.frac;
        if (bad) { D.n = Math.min(S.cap, D.n + 1); frac = S.step * D.n; }
        damage(h, D.k, h.maxHp * frac * D.mul, S.color);
        if (--D.left <= 0) h.stDot = null;
      }
    }
  }

  /** Frozen or asleep: no movement, no attacks, no casts. */
  function stunned(h) { const M = h.stMajor; return !!M && (M.k === 'freeze' || M.k === 'sleep'); }

  /** Movement multiplier from paralysis (x0.5); it multiplies with the old `slow` and the Speed stage. (Trap no longer slows.) */
  function speedMul(h) {
    return h.stMajor && h.stMajor.k === 'paralysis' ? CONTROL.paralysis.speed : 1;
  }

  /** Daze: rotate the heading (dx, dy) by the current eased jitter angle. */
  function jitter(h, dx, dy) {
    const Z = h.stDaze; if (!Z || !Z.a) return [dx, dy];
    const c = Math.cos(Z.a), s = Math.sin(Z.a);
    return [dx * c - dy * s, dx * s + dy * c];
  }

  /** Chance (0..1) of a sleep effect on `h`, given the base chance: drowsy x1.5, capped at 100%. */
  function sleepChance(h, base) { return Math.min(1, h && h.stDrow ? base * CONTROL.drowsy.sleepMul : base); }

  /** True while manual team swaps are locked (trap on the player). */
  function swapLocked(h) { return !!h.stTrap; }

  function timeOf(h, k) {
    if (k === 'sleep' || k === 'freeze' || k === 'paralysis') return h.stMajor && h.stMajor.k === k ? h.stMajor : null;
    if (k === 'confusion') return h.stCnf;
    if (k === 'trap') return h.stTrap;
    if (k === 'daze') return h.stDaze;
    return null;
  }

  /** Is anything on `h` that Shake off can work on right now? (HUD prompt.) */
  function shakeable(h) { return SHAKE.order.some(k => { const o = timeOf(h, k); return o && o.t > SHAKE.floor + 1e-6; }); }

  /**
   * One Shake off tap (player only). Takes SHAKE.per s off the most restrictive mashable status that still has more than SHAKE.floor s
   * left. Returns true when the tap counted (rate cap respected and something was reduced).
   */
  function shake(h) {
    if (!h.isPlayer || h.dead || h.shakeCd > 1e-4) return false;      // (1e-4: float slack so exactly 12 taps per second all count)
    for (const k of SHAKE.order) {
      const o = timeOf(h, k);
      if (o && o.t > SHAKE.floor + 1e-6) {
        o.t = Math.max(SHAKE.floor, o.t - SHAKE.per);
        h.shakeCd = 1 / SHAKE.rate;
        return true;
      }
    }
    return false;
  }

  /** Roll whether an attack attempt fails: paralysis 25%, confusion 50% (both: 62.5%). */
  function fizzle(h) {
    let ok = 1;
    if (h.stMajor && h.stMajor.k === 'paralysis') ok *= 1 - CONTROL.paralysis.fizzle;
    if (h.stCnf) ok *= 1 - CONTROL.confusion.fizzle;
    const f = ok < 1 && Math.random() >= ok;
    if (f) text(h, 'Fizzled', '#a3abb8');
    return f;
  }

  /** Confusion: the heading (dx, dy) drifts toward a random direction (weight k) that is re-rolled every ~0.8 s. */
  function wander(h, dx, dy, k = 0.75) {
    const C = h.stCnf; if (!C) return [dx, dy];
    const x = dx * (1 - k) + Math.cos(C.wa) * k, y = dy * (1 - k) + Math.sin(C.wa) * k, n = Math.hypot(x, y) || 1;
    return [x / n, y / n];
  }

  /** A hit of `type` lands on `h`: a Fire hit thaws ice (never the same instant it froze). */
  function onHit(h, type) {
    const M = h.stMajor;
    if (M && M.k === 'freeze' && type === CONTROL.freeze.thawBy && M.age > 0.2) endMajor(h);
  }

  function clear(h) { h.stMajor = h.stCnf = h.stTrap = h.stWin = h.stDot = h.stFl = h.stDaze = h.stDrow = null; h.shakeCd = 0; }

  const AIL_COLOR = { slow: '#8ab4e8', poison: '#d47cf0', haste: '#7fe08a' };
  /** Active statuses for the HUD: [{ k, label, color, t, mash }]. t = seconds left (null = unknown); mash = Shake off works on it. */
  function list(h) {
    const out = [];
    if (h.stMajor) { const k = h.stMajor.k; out.push({ k, label: CONTROL[k].label, color: CONTROL[k].color, t: h.stMajor.t, mash: SHAKE.order.includes(k) }); }
    const d = h.stDot || (h.burn > 0 ? { k: 'burn' } : h.poison > 0 ? { k: h.poison === 2 ? 'toxic' : 'poison' } : null);
    if (d) {
      const S = G.Enemies.STATUS[d.k];
      out.push({ k: d.k, label: d.k === 'burn' ? 'Burned' : d.k === 'toxic' ? 'Badly poisoned' : 'Poisoned', color: S.color, t: h.stDot ? Math.max(0, h.stDot.left - 1) * S.turn + h.stDot.tick : null, mash: false });
    }
    if (h.stCnf) out.push({ k: 'confusion', label: CONTROL.confusion.label, color: CONTROL.confusion.color, t: h.stCnf.t, mash: true });
    if (h.stDaze) out.push({ k: 'daze', label: CONTROL.daze.label, color: CONTROL.daze.color, t: h.stDaze.t, mash: true });
    if (h.stTrap) out.push({ k: 'trap', label: CONTROL.trap.label, color: CONTROL.trap.color, t: h.stTrap.t, mash: true });
    const sl = G.Stages ? G.Stages.remaining(h, 'spe', -1) : 0;
    if (sl > 0) out.push({ k: 'slow', label: 'Slowed', color: AIL_COLOR.slow, t: sl, mash: false });
    if (h.stDrow) out.push({ k: 'drowsy', label: CONTROL.drowsy.label, color: CONTROL.drowsy.color, t: h.stDrow.t, mash: false });
    return out;
  }

  /** Shot colour of a carrier's status. */
  function ailColor(k) { return AIL_COLOR[k] || (CONTROL[k] && CONTROL[k].color) || '#ff7a9e'; }

  return { ailColor, CONTROL, STRONG, SHAKE, GRACE, TURN, isControl, strong, immune, majorKind, blocked, apply, applyDot, tick, stunned, speedMul, jitter, sleepChance, swapLocked, shakeable, shake, fizzle, wander, onHit, clear, list };
})();
