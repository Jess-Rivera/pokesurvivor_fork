/* ============ stages.js - stat stages (status rework, slice D1) ============
 * Mainline stat stages (-6 to +6) for Atk, Def, SpA, SpD and Spe, on any host that G.Status can carry (wild enemies, elites,
 * bosses, gym leaders). Accuracy and evasion are skipped (the game has no accuracy stat).
 *
 * Stage model: docs/COMBAT-RULES.md "Stat stages". Moves use stat stage TRACKERS (move schema slice 5a, SS1 to SS13,
 * combat-architecture:H26), one per (Pokemon, move, stat) on each recipient: { n, g, d } = its stages, Gate left, Duration left. The first
 * success applies the move's stages and starts both timers; every success resets Duration; a success with the Gate open also climbs (adds the
 * stages again, restarts the Gate); a Duration with no success removes that tracker only. Each tracker is clamped to +-6 on its own and the
 * host's stage is the sum of everything, clamped to +-6. Own trackers live on the host (h.trk[stat][src]); team raises live in a tracker map
 * tied to the shared team store object (h.stgTeam), so every roster member that shares stgTeam shares them.
 *
 * Fixed-timer applications (h.stg = { stat: [{ n, t, src }] }, each expiring on its own) stay for the carrier statuses SLOW and HASTE, the
 * caster's commitment slow (slice 4b) and debug (COMBAT-RULES "Stat stages", carrier statuses; Jess 2026-10-30). The team store also holds
 * the berries' timed keys (pct_def, pct_spd, guard_*, ...; data/ground-items.js). Slice 7b-2b (2026-11-01) removed the legacy move stacking
 * (procMove, procSelf, teamAdd, TEAM_LIVE, the ROLL_GAP roll gap and the Fire Spin strip) with the legacy move path.
 *
 * Where it is read: the defender half of a hit (Def or SpD), the attacker half of a gym leader's moves (Atk or SpA) and movement (Speed
 * multiplies the FINAL movement speed, no bounds, Jess 2026-10-19).
 */
G.Stages = (() => {
  // Stage ladders (Jess 2026-10-20): ONE number per stat, B. A raise of s stages multiplies the stat by (B + s) / B (each raise adds 1 to the numerator),
  // a drop of s stages by B / (B + s) (each drop adds 1 to the denominator). B = 2 is the mainline ladder (+2 = x2, +6 = x4, -2 = x0.5, -6 = x0.25) and is
  // where Attack, Defense, Sp. Atk and Sp. Def start. Speed starts at B = 4 (+2 = x1.5, +4 = x2.0, +6 = x2.5, -2 = x0.67, -6 = x0.4): a gentler ladder for
  // movement, tuned by feel. One shared ladder per stat for raises and drops, on every host (player, wild, elite, boss, gym leader). Raise B to soften a stat.
  const BASE = { atk: 2, def: 2, spa: 2, spd: 2, spe: 4 };
  /** The multiplier of `stat` at stage `s` (-6 .. +6) on its ladder. */
  function ladder(stat, s) {
    const b = BASE[stat] || 2;
    return s >= 0 ? (b + s) / b : b / (b - s);
  }
  const STATS = ['atk', 'def', 'spa', 'spd', 'spe'];
  const LABEL = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
  const DUR = 6; // seconds one application lasts (stat-drop moves)
  const MAX = 6;
  const UP = '#7fe08a',
    DOWN = '#f08a8a';
  const EPS = 1e-9;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- stat stage trackers (slice 5a): base timers SS7, Self-drop Gate SS12 ----
  const GATE = 6.0,
    DURATION = 6.1,
    SELF_DROP_GATE_MUL = 2;
  /** The Gate a success climbs on: the base Gate, x2 for a drop a Pokemon puts on itself (SS12), x `mul` (slice 5b, SS10: the caster
   *  team's Gate card, G.TeamCards.gateMul; 1 for enemies and when omitted). */
  function gateOf(selfDrop, mul = 1) {
    return GATE * (selfDrop ? SELF_DROP_GATE_MUL : 1) * mul;
  }
  const TEAM_TRK = new WeakMap(); // team store object -> its tracker map; shared exactly as far as the store itself is shared
  function teamTrk(store, make) {
    if (!store) return null;
    let m = TEAM_TRK.get(store);
    if (!m && make) TEAM_TRK.set(store, (m = {}));
    return m || null;
  }
  function trkSum(m, stat) {
    const T = m && m[stat];
    let s = 0;
    if (T) for (const k in T) s += T[k].n;
    return s;
  }
  /** Advance a tracker map. Returns true when it is empty afterwards. */
  function trkTick(m, dt) {
    for (const s in m) {
      const T = m[s];
      for (const k in T) {
        const t = T[k];
        t.g = Math.max(0, t.g - dt);
        if ((t.d -= dt) <= 0) delete T[k];
      } // SS5: only this tracker
      let any = false;
      for (const k in T) {
        any = true;
        break;
      }
      if (!any) delete m[s];
    }
    for (const s in m) return false;
    return true;
  }

  /** The stage of `stat` on `h` right now (-6 .. +6). */
  function stage(h, stat) {
    const L = h.stg && h.stg[stat],
      T = h.stgTeam && h.stgTeam[stat],
      A = h.trk,
      B = h.stgTeam ? TEAM_TRK.get(h.stgTeam) : null;
    if (!L && !T && !A && !B) return 0;
    let s = 0;
    if (L) for (const a of L) s += a.n;
    if (T) for (const a of T) s += a.n;
    if (A) s += trkSum(A, stat);
    if (B) s += trkSum(B, stat);
    return clamp(s, -MAX, MAX);
  }
  /** The stat multiplier for `stat` on `h` (1 when it has no stage). */
  function mul(h, stat) {
    const s = h.stg || h.stgTeam || h.trk ? stage(h, stat) : 0;
    return s ? ladder(stat, s) : 1;
  }

  /** SS3 to SS6: one success of `n` stages from `src` on tracker map `m` (host `h` shows the text). Returns true when the host's stage changed. */
  function success(m, h, stat, n, src, gate, dur = DURATION) {
    // 5b: dur is the caster team's Duration (SS10), dl its full length for the HUD
    const T = m[stat] || (m[stat] = {}),
      t = T[src],
      cur = stage(h, stat);
    if (!t)
      T[src] = { n: clamp(n, -MAX, MAX), g: gate, d: dur, dl: dur }; // SS3
    else {
      t.dl = dur;
      t.d = dur; // SS4: every success resets Duration
      if (t.g > EPS) return false; // Gate closed: refresh only
      t.n = clamp(t.n + n, -MAX, MAX);
      t.g = gate; // Gate open: climb, restart the Gate (SS6 per-tracker clamp)
    }
    const now = stage(h, stat);
    if (now !== cur) text(h, LABEL[stat] + ' ' + (now > 0 ? '+' : '') + now, n > 0 ? UP : DOWN);
    return now !== cur;
  }
  /** A success on the host's OWN tracker (a foe drop on an enemy, a self drop, an individual-scope self change). */
  function trackOwn(h, stat, n, src, gate = GATE, dur = DURATION) {
    if (!STATS.includes(stat) || !n || h.dead) return false;
    return success(h.trk || (h.trk = {}), h, stat, n, src, gate, dur);
  }
  /** A success on the TEAM tracker of `o`'s roster (a team raise). Needs the shared team store. */
  function trackTeam(o, stat, n, src, gate = GATE, dur = DURATION) {
    if (!STATS.includes(stat) || !n || !o.stgTeam) return false;
    return success(teamTrk(o.stgTeam, true), o, stat, n, src, gate, dur);
  }
  /** The tracker of (src, stat) on `h`: its own, or its team's with `team`. Null when there is none. */
  function tracker(h, stat, src, team) {
    const m = team ? teamTrk(h.stgTeam, false) : h.trk,
      T = m && m[stat];
    return (T && T[src]) || null;
  }
  /** Debug view of every tracker on `h`: { own, team }. */
  function trackers(h) {
    return { own: h.trk || null, team: teamTrk(h.stgTeam, false) };
  }

  // ---- team store (slice E2a): shared by the whole roster, mutated in place, never reassigned ----
  const TEAM_GRACE = 0.1; // an application stays 0.1 s past its end, and a cast of the same move inside that last 0.1 s REFRESHES it instead of stacking:
  // at cooldown = duration the cast lands within a frame of the old one ending, and without this the stage would dip (or double) for a frame
  /** Advance the team timers once per frame. In place: the roster shares this object. An application is removed TEAM_GRACE s after its time is up. */
  function teamTick(store, dt) {
    for (const s in store) {
      const L = store[s];
      for (let i = L.length - 1; i >= 0; i--) if ((L[i].t -= dt) <= -TEAM_GRACE) L.splice(i, 1);
      if (!L.length) delete store[s];
    }
    const m = TEAM_TRK.get(store);
    if (m && trkTick(m, dt)) TEAM_TRK.delete(store);
  }
  /** The team's raise on `stat` (timed store keys plus team trackers, before the +-6 clamp), and for HUD the longest time left with its full length. */
  function teamSum(store, stat) {
    const L = store && store[stat];
    let s = 0;
    if (L) for (const a of L) s += a.n;
    return s + (store ? trkSum(TEAM_TRK.get(store), stat) : 0);
  }
  function teamTimer(store, stat) {
    const L = store && store[stat];
    let best = null;
    if (L) for (const a of L) if (!best || a.t > best.t) best = { t: a.t, dur: a.dur };
    const T = store && TEAM_TRK.has(store) ? TEAM_TRK.get(store)[stat] : null;
    if (T) for (const k in T) if (!best || T[k].d > best.t) best = { t: T[k].d, dur: T[k].dl || DURATION };
    return best;
  }
  /** True when the team has anything live on `key`: a timed store key or a tracker. */
  function teamLive(store, key) {
    if (!store) return false;
    if (store[key] && store[key].length) return true;
    const m = TEAM_TRK.get(store);
    return !!(m && m[key]);
  }
  /** Every key with something live on the team store: the timed keys, then tracker stats not already listed. */
  function teamKeys(store) {
    const out = store ? Object.keys(store) : [],
      m = store && TEAM_TRK.get(store);
    if (m) for (const s in m) if (!out.includes(s)) out.push(s);
    return out;
  }
  function teamClear(store) {
    for (const s in store) delete store[s];
    TEAM_TRK.delete(store);
  }

  function text(h, msg, color) {
    if (G.FX && G.FX.dmgText) G.FX.dmgText(h.x, h.y - (h.bodyH || 30) - 4, msg, color);
  }

  /**
   * Add one application of `n` stages (negative = a drop) to `stat`, lasting `dur` seconds. `cap` (optional, positive) is the most
   * stages a RAISE may reach (an authored move's stack limit). Returns true when it applied, false when capped.
   * Move schema slice 4a (D30): `src` tags the application with its move id and `live` caps that move's live applications on this
   * stat; at the cap the move's oldest application is dropped and the new one added at full duration (even at the +-6 clamp). With a
   * `src`, the floating text only shows when the stage changed. Without them (every legacy caller) the behavior is as before.
   * Slice 4b: `quiet` (with a src) never shows the text (the caster's commitment slow, S13). A src may name the caster too (move@Pokemon).
   */
  function add(h, stat, n, dur = DUR, cap = MAX, src, live, quiet = false) {
    if (!STATS.includes(stat) || !n || h.dead) return false;
    const cur = stage(h, stat);
    if (src != null && live > 0) {
      const g = h.stg || (h.stg = {}),
        L = g[stat] || (g[stat] = []);
      let mine = 0;
      for (const a of L) if (a.src === src) mine++;
      if (mine >= live)
        L.splice(
          L.findIndex((a) => a.src === src),
          1
        );
      else if ((n > 0 && cur >= Math.min(MAX, cap)) || (n < 0 && cur <= -MAX)) return false;
      L.push({ n, t: dur, src });
      const now = stage(h, stat);
      if (now !== cur && !quiet) text(h, LABEL[stat] + ' ' + (now > 0 ? '+' : '') + now, n > 0 ? UP : DOWN);
      return true;
    }
    if (n > 0 && cur >= Math.min(MAX, cap)) return false;
    if (n < 0 && cur <= -MAX) return false;
    const g = h.stg || (h.stg = {});
    (g[stat] || (g[stat] = [])).push({ n, t: dur });
    text(h, LABEL[stat] + (n > 0 ? ' +' : ' ') + n, n > 0 ? UP : DOWN);
    return true;
  }

  /** Advance every application timer and the trackers. Called once per frame from Enemy.update and the player. */
  function tick(h, dt) {
    if (h.trk && trkTick(h.trk, dt)) h.trk = null; // own trackers (slice 5a): enemies, the active member and the bench all pass through here
    const g = h.stg;
    if (!g) return;
    let live = false;
    for (const s in g) {
      const L = g[s];
      for (let i = L.length - 1; i >= 0; i--) if ((L[i].t -= dt) <= 0) L.splice(i, 1);
      if (L.length) live = true;
      else delete g[s];
    }
    if (!live) h.stg = null;
  }

  /** The Speed STAGE as a movement multiplier on the FINAL speed (Jess 2026-10-19), on the Speed ladder (B = 4: +2 x1.5, +6 x2.5, -2 x0.67, -6 x0.4). The species
   *  Speed shaping (0.5x to 3.0x identity bounds) is a different thing and is not involved. It multiplies with paralysis and trap. */
  function speedMul(h) {
    const s = stage(h, 'spe');
    return s ? ladder('spe', s) : 1;
  }

  /** Longest time left (s) among the applications of `stat` that push the stage down (drop) or up; for the HUD timer bar. */
  function remaining(h, stat, sign = -1) {
    const L = h.stg && h.stg[stat];
    let t = 0;
    if (L) for (const a of L) if (Math.sign(a.n) === sign && a.t > t) t = a.t;
    const T = h.trk && h.trk[stat];
    if (T) for (const k in T) if (Math.sign(T[k].n) === sign && T[k].d > t) t = T[k].d;
    return t;
  }

  function clear(h) {
    h.stg = h.trk = null;
  } // own drops and trackers; the shared team raises stay (FAINT AND REVIVE)
  /** Remove every own application tagged `src` on `h` (slice 4b: a commitment slow ending early, with its instance or on a swap). */
  function drop(h, src) {
    const g = h.stg;
    if (!g) return;
    for (const s in g) {
      g[s] = g[s].filter((a) => a.src !== src);
      if (!g[s].length) delete g[s];
    }
    if (!Object.keys(g).length) h.stg = null;
  }

  /** Active stages for the HUD / debug: [{ stat, label, stage }] for every stat that is not at 0. */
  function list(h) {
    const out = [];
    for (const s of STATS) {
      const v = stage(h, s);
      if (v) out.push({ stat: s, label: LABEL[s], stage: v });
    }
    return out;
  }

  return {
    BASE,
    ladder,
    STATS,
    LABEL,
    DUR,
    MAX,
    TEAM_GRACE,
    stage,
    mul,
    add,
    tick,
    speedMul,
    remaining,
    clear,
    drop,
    list,
    teamTick,
    teamSum,
    teamTimer,
    teamClear,
    teamLive,
    teamKeys,
    UP,
    DOWN,
    GATE,
    DURATION,
    SELF_DROP_GATE_MUL,
    gateOf,
    trackOwn,
    trackTeam,
    tracker,
    trackers,
  };
})();
