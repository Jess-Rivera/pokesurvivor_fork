/* ============ status.js - shared status engine (status rework, slice C) ============
 * ONE engine for every host that can carry a status: wild enemies, elites, bosses, gym leaders AND the player.
 * A host is any object with x, y, maxHp, hp, a types list (host.types, or host.mon.types for the player) and
 * the state fields below. Enemies keep their slice A burn / poison fields (burn, poison, ...); the player,
 * which has none, gets the same numbers through stDot. Both count as the one "major" status.
 *
 * Host state (all null until used):
 *   stMajor  { k, t, age }              paralysis | freeze | sleep   (one major at a time, with burn / poison)
 *   stCnf    { t, wa, wt }              confusion: wander angle wa, retarget timer wt
 *   stTrap   { left, tick, mul }        trap: damage per turn, left = turns still to come
 *   stWin    { freeze, sleep }          seconds during which that hard CC cannot be applied again
 *   stDot    { k, left, tick, n, mul }  player only: burn | poison | toxic
 *
 * Rules (Jess 2026-10-19):
 *   - one major status at a time (burn, poison, paralysis, sleep, freeze); a new one never overwrites the old
 *   - bosses, elites, gym leaders and the player: freeze and sleep last 25% as long, then a 10 s no-reapply window;
 *     paralysis, slow, trap and confusion work at full strength
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
    trap:      { major: false, turns: 4, immune: ['ghost'],       speed: 0.25, frac: 1 / 16, color: '#b0743a', label: 'Trapped' }
  };
  const STRONG = { cut: 0.25, window: 10 };      // bosses, elites, gym leaders and the player: hard CC (freeze, sleep)

  const strong = h => !!(h.boss || h.elite || h.gym || h.isPlayer);
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
  function apply(h, kind, mul = 1) {
    const S = CONTROL[kind];
    if (!S || h.dead) return 'none';
    if (immune(h, kind)) { text(h, 'Immune', '#a3abb8'); return 'immune'; }
    if (S.major) {
      const cur = majorKind(h);
      if (cur && cur !== kind) return 'blocked';
      if (cur === kind) {                                     // paralysis refreshes; freeze and sleep never extend (no lock)
        if (kind === 'paralysis') h.stMajor.t = Math.max(h.stMajor.t, dur(h, kind));
        return 'refresh';
      }
      if (h.stWin && h.stWin[kind] > 0) return 'window';
      h.stMajor = { k: kind, t: dur(h, kind), age: 0 };
      text(h, S.label, S.color);
      return 'ok';
    }
    if (kind === 'confusion') {
      const t = dur(h, kind), was = !!h.stCnf;
      if (was) h.stCnf.t = Math.max(h.stCnf.t, t);
      else { h.stCnf = { t, wa: G.U.rand(0, 6.2832), wt: G.U.rand(0.5, 1.1) }; text(h, S.label, S.color); }
      return was ? 'refresh' : 'ok';
    }
    // trap
    const was = !!h.stTrap;
    if (was) { h.stTrap.left = Math.max(h.stTrap.left, S.turns); if (mul > h.stTrap.mul) h.stTrap.mul = mul; }
    else { h.stTrap = { left: S.turns, tick: TURN, mul }; text(h, S.label, S.color); }
    return was ? 'refresh' : 'ok';
  }

  /** Burn / poison / toxic on a host that has no slice A fields (the player). Same table, same immunities and numbers. */
  function applyDot(h, kind, mul = 1) {
    const S = G.Enemies.STATUS[kind];
    if (!S || h.dead) return 'none';
    if (immune(h, kind)) { text(h, 'Immune', '#a3abb8'); return 'immune'; }
    if (blocked(h, kind)) return 'blocked';
    const d = h.stDot;
    if (d) {
      if (kind === 'toxic' && d.k !== 'toxic') { d.k = 'toxic'; d.n = 0; }            // poison upgrades to toxic, never back
      d.left = Math.max(d.left, S.turns);
      if (mul > d.mul) d.mul = mul;
      return 'refresh';
    }
    h.stDot = { k: kind, left: S.turns, tick: S.turn, n: 0, mul };
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
    const T = h.stTrap;
    if (T) {
      T.tick -= dt;
      if (T.tick <= 0) {
        T.tick += TURN;
        damage(h, 'trap', h.maxHp * CONTROL.trap.frac * T.mul, CONTROL.trap.color);
        if (--T.left <= 0) h.stTrap = null;
      }
    }
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

  /** Movement multiplier from paralysis (x0.5) and trap (x0.25); they multiply with each other and with the old `slow`. */
  function speedMul(h) {
    let m = 1;
    if (h.stMajor && h.stMajor.k === 'paralysis') m *= CONTROL.paralysis.speed;
    if (h.stTrap) m *= CONTROL.trap.speed;
    return m;
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

  function clear(h) { h.stMajor = h.stCnf = h.stTrap = h.stWin = h.stDot = null; }

  /** Active statuses for the HUD: [{ k, label, color, t }]. */
  function list(h) {
    const out = [];
    if (h.stMajor) out.push({ k: h.stMajor.k, label: CONTROL[h.stMajor.k].label, color: CONTROL[h.stMajor.k].color, t: h.stMajor.t });
    const d = h.stDot || (h.burn > 0 ? { k: 'burn' } : h.poison > 0 ? { k: h.poison === 2 ? 'toxic' : 'poison' } : null);
    if (d) { const S = G.Enemies.STATUS[d.k]; out.push({ k: d.k, label: d.k === 'burn' ? 'Burned' : d.k === 'toxic' ? 'Badly poisoned' : 'Poisoned', color: S.color, t: null }); }
    if (h.stCnf) out.push({ k: 'confusion', label: CONTROL.confusion.label, color: CONTROL.confusion.color, t: h.stCnf.t });
    if (h.stTrap) out.push({ k: 'trap', label: CONTROL.trap.label, color: CONTROL.trap.color, t: h.stTrap.left * TURN });
    return out;
  }

  return { CONTROL, STRONG, TURN, isControl, strong, immune, majorKind, blocked, apply, applyDot, tick, stunned, speedMul, fizzle, wander, onHit, clear, list };
})();
