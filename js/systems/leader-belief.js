/* ============ leader-belief.js: what a leader's AI player believes (G.LeaderBelief) ============
 * Spec: docs/LEADER-AI.md "The Decider (#49)" (BELIEF, COOLDOWN WINDOW, OPPONENT MODEL); #50, #49 slice 1. One per fight, between
 * G.LeaderInfo (perception: what the screen shows) and the Decider (G.LeaderAI), and the Decider's only door to what it knows. It only
 * derives; G.LeaderInfo and the run store (G.LeaderMemory) keep the raw observations, so retuning applies to old ones too.
 *   PASS-THROUGH  the fight's events, the rolling windows, your threats, your reveals, the run record and the key of a mon of yours.
 *   COOLDOWN WINDOW  per revealed move of yours: opened on its base cooldown (TUNE.startWidth wide), then every clean gap G.LeaderInfo
 *            saw (GAPS, field time) is replayed in order: a gap outside the window stretches it to the gap plus an overshoot
 *            (startWidth x memoryUse), then each edge closes on the gap by memoryUse; never narrower than TUNE.minWidth (the cooldown
 *            fairness limit). Readiness: 0 before the window, a straight ramp across it, 1 after; an unrevealed move, or one not cast
 *            since your last switch this fight, is believed ready. Decision 2026-11-09-50-cooldown-window-memoryuse-and-baseline.
 *   DERIVED  the matchup and your most threatening attack (moved from the Decider unchanged, slice 2 #31); danger (your likely next
 *            hit on a leader mon: that attack's visible size x its readiness) and opportunity (that mon's best hit on your mon on the
 *            field among its moves ready now, from its own exact timers), both fractions of the struck mon's max HP (G.Stats
 *            visibleHitFrac). No reader until #51.
 * memoryUse is the Decider's setting (G.LeaderAI.BASE), handed in on each tick.
 */
G.LeaderBelief = (() => {
  let cur = null;
  /** All TUNE (BALANCE.md "Leader AI"): the window's starting and minimum width (s), and the power assumed for your own-type guess.
   *  #51: how far ahead your position is guessed (s, a straight line from your last frame's motion), and your own-type guess's
   *  believed cycle (s) and reach (px, used as your best reach until a move of yours with a reach is revealed). */
  const TUNE = Object.freeze({
    startWidth: 1.8,
    minWidth: 0.2,
    guessPower: 60,
    leadSeconds: 0.25,
    guessCycle: 1,
    guessReach: 160,
  });

  /** A fresh window for a move of base cooldown `baseCd`: { lo, hi }, centered on it. */
  function opened(baseCd) {
    return { lo: Math.max(0, baseCd - TUNE.startWidth / 2), hi: baseCd + TUNE.startWidth / 2 };
  }
  /** One clean gap learned: stretch to cover a gap outside the window (plus the overshoot), then each edge closes on the gap by
   *  memoryUse; then the minimum width, about the window's middle. */
  function learn(win, gap, memoryUse) {
    let lo = win.lo,
      hi = win.hi;
    const overshoot = TUNE.startWidth * memoryUse;
    if (gap < lo) lo = gap - overshoot;
    else if (gap > hi) hi = gap + overshoot;
    lo += (gap - lo) * memoryUse;
    hi -= (hi - gap) * memoryUse;
    if (hi - lo < TUNE.minWidth) {
      const mid = (lo + hi) / 2;
      lo = mid - TUNE.minWidth / 2;
      hi = mid + TUNE.minWidth / 2;
    }
    return { lo: Math.max(0, lo), hi };
  }
  /** How ready a move is believed to be, `since` s after its last cast: 0 before the window, a ramp across it, 1 after. */
  function readinessIn(win, since) {
    if (!win || since == null || since >= win.hi) return 1;
    if (since <= win.lo) return 0;
    return (since - win.lo) / (win.hi - win.lo);
  }

  const typesOf = (m) => (m && m.mon && m.mon.types) || (m && G.DEX_BY[m.dex] && G.DEX_BY[m.dex].types) || [];
  const statsOf = (m) => (m && m.mon && m.mon.stats) || (m && G.DEX_BY[m.dex] && G.DEX_BY[m.dex].stats) || null;
  const levelOf = (m) => (m && m.level) || (G.Game.player && G.Game.player.level) || 1;
  const yours = () => {
    const r = G.Game.roster;
    return r ? r[G.Game.activeIndex] || null : null;
  };
  /** The moves leader mon m moves for: the open moves of all its slots (its own exact state). */
  const poolOf = (m) => m.slots.flat().filter((s) => G.Boss.open(m, s));

  /** Your mon's most threatening revealed damaging move against m: the highest type multiplier, then the higher power. Before any is
   *  revealed, a guess of its own type (a two-type mon: the type that hits m harder). Only what G.LeaderInfo has seen is read. */
  function yourAttack(m, you = yours(), belief = cur) {
    let best = null;
    for (const id of you && belief ? belief.reveals(you).moves : []) {
      const d = G.MoveDefs[id];
      if (!d || !(d.basePower > 0)) continue;
      const k = G.Types.mult(d.type, m.types);
      if (!best || k > best.k || (k === best.k && d.basePower > best.power))
        best = { id, type: d.type, k, power: d.basePower };
    }
    if (best) return best;
    for (const type of you ? typesOf(you) : []) {
      const k = G.Types.mult(type, m.types);
      if (!best || k > best.k) best = { id: null, type, k, power: 0 };
    }
    return best || { id: null, type: 'normal', k: 1, power: 0 };
  }
  /** LEADER-AI MATCHUP (slice 2): m's best open damaging move on your mon (type x STAB) over your best attack's multiplier on m. */
  function matchup(m, you = yours(), belief = cur) {
    if (!you) return 1;
    const yt = typesOf(you);
    let off = 0;
    for (const s of poolOf(m)) {
      const d = m.moveDef(s.id);
      if (!(d.basePower > 0)) continue;
      off = Math.max(off, G.Types.mult(d.type, yt) * (m.types.includes(d.type) ? 1.5 : 1));
    }
    return off / Math.max(0.25, G.Types.mult(yourAttack(m, you, belief).type, m.types));
  }

  /** A hit's visible size on `target` (a fraction of its max HP), from `attacker`: power, category, type multiplier and STAB, at the
   *  damage scale of the side it lands on (G.Stats.visibleHitFrac, species stats and levels only). #51: then read against the max HP
   *  its HP bar shows, so an authored HP multiplier (a leader's hpMult) counts: the bar's drop is on screen. */
  function hitSize(attacker, target, power, category, type, scale, barMax = target && target.maxHp) {
    const stab = typesOf(attacker).includes(type) ? G.Stats.STAB : 1,
      stats = statsOf(target),
      bar = barMax > 0 && stats ? G.Stats.hpForLevel(stats[0], levelOf(target)) / barMax : 1;
    return (
      bar *
      G.Stats.visibleHitFrac(
        statsOf(attacker),
        levelOf(attacker),
        statsOf(target),
        levelOf(target),
        power,
        category,
        stab,
        G.Types.mult(type, typesOf(target)),
        scale
      )
    );
  }
  /** A move's attack form and reach (G.Gyms.formOf and reachOf); reach Infinity when it has no attack form the leader reads. */
  function reachOfMove(d) {
    let form = null;
    try {
      form = G.Gyms.formOf(d);
    } catch (err) {
      form = null;
    }
    if (!form || form === 'buff' || form === 'heal') return { form, reach: Infinity };
    return { form, reach: G.Gyms.reachOf(d, form) };
  }
  /** A guaranteed rider (no chance, or 100) that sets you back: a major ailment while you carry none, any other foe ailment, or a foe
   *  stage drop not already on you from this move and mon. */
  function setsBack(e, d, pl) {
    const major = G.Status.majorKind(pl),
      sure = (fx) => fx.chance == null || fx.chance >= 100,
      src = G.MoveEffects.srcOf(d, e);
    return (d.payload || []).some((fx) => {
      if (fx.side !== 'foe' || !sure(fx)) return false;
      if (fx.t === 'ailment') return !(major && G.Boss.TUNE.MAJOR.has(fx.id));
      if (fx.t === 'stat' && fx.stages < 0) return !G.Stages.tracker(pl, G.MoveEffects.statKey(fx.stat), src, false);
      return false;
    });
  }
  /** A self heal's size as a fraction of max HP (its heal riders that do not come from damage dealt), else a half. */
  function healFractionOf(d) {
    let total = 0;
    for (const fx of d.payload || []) {
      const a = fx.amount;
      if (fx.t !== 'heal' || !a || a.from === 'dealt' || !(a.fraction > 0)) continue;
      total += a.fraction * Math.max(1, (fx.duration || 0) / (fx.per || 1));
    }
    return total > 0 ? total : 0.5;
  }

  class Belief {
    /** @param info the fight's G.LeaderInfo record */
    constructor(info) {
      this.info = info;
      this.memoryUse = G.LeaderAI ? G.LeaderAI.BASE.memoryUse : 0.5;
      this.feed = [];
    }
    /** One frame: perception runs, and its events wait here for the Decider. */
    tick(dt, memoryUse = this.memoryUse) {
      this.memoryUse = memoryUse;
      this.info.tick(dt);
      for (const ev of this.info.events()) this.feed.push(ev);
    }
    events() {
      return this.feed.splice(0);
    }
    windows() {
      return this.info.windows();
    }
    threats(body, horizon, dt) {
      return this.info.threats(body, horizon, dt);
    }
    reveals(m) {
      return this.info.reveals(m);
    }
    keyOf(m) {
      return this.info.keyOf(m);
    }
    get mem() {
      return this.info.mem;
    }
    get t() {
      return this.info.t;
    }
    /** The cooldown window of revealed move `id` of mon `m` of yours: { lo, hi } s, or null (not revealed, or no cooldown). */
    window(m, id) {
      const d = G.MoveDefs[id];
      if (!m || !d || !(d.cd > 0) || !this.reveals(m).moves.includes(id)) return null;
      let win = opened(d.cd);
      for (const gap of this.info.gapsOf(m, id)) win = learn(win, gap, this.memoryUse);
      return win;
    }
    /** How ready move `id` of mon `m` of yours is believed to be, 0 to 1. */
    readiness(m, id) {
      const win = this.window(m, id);
      return win ? readinessIn(win, this.info.sinceCast(m, id)) : 1;
    }
    yourAttack(m, you = yours()) {
      return yourAttack(m, you, this);
    }
    matchup(m, you = yours()) {
      return matchup(m, you, this);
    }
    /** Seconds since your mon `m` last cast move `id`, in field time (null: never this fight, or not since a switch). */
    sinceCast(m, id) {
      return this.info.sinceCast(m, id);
    }
    /** Your motion as last seen: { x, y, vx, vy }, or null. */
    yourMotion() {
      const at = this.info.youAt,
        pl = G.Game.player;
      return at || (pl ? { x: pl.x, y: pl.y, vx: 0, vy: 0 } : null);
    }
    /** Where you are guessed to be TUNE.leadSeconds from now: a straight line from your motion (LEADER-AI BELIEF). */
    yourGuess() {
      const at = this.yourMotion();
      return at ? { x: at.x + at.vx * TUNE.leadSeconds, y: at.y + at.vy * TUNE.leadSeconds } : null;
    }
    /** Your shots as the planner sees them, against leader mon m: each revealed damaging move of yours (its visible size on m, its
     *  reach, its believed cycle, the window's middle, and when it is next believed ready: the middle less the time since its last
     *  cast, 0 when never cast), or, before any is revealed, your own-type guess (ready, reach unknown). */
    yourThreats(m, you = yours()) {
      const out = [];
      if (!m || !you) return out;
      for (const id of this.reveals(you).moves) {
        const d = G.MoveDefs[id];
        if (!d || !(d.basePower > 0)) continue;
        const win = this.window(you, id),
          cycle = win ? (win.lo + win.hi) / 2 : d.cd > 0 ? d.cd : TUNE.guessCycle,
          since = this.sinceCast(you, id);
        out.push({
          id,
          category: d.category,
          hitFraction: hitSize(you, m, d.basePower, d.category, d.type, G.Stats.DMG_SCALAR),
          reach: reachOfMove(d).reach,
          travelSpeed: reachOfMove(d).form === 'shot' ? (d.delivery && d.delivery.moveSpeed) || 0 : 0,
          cycle,
          nextFireIn: since != null ? Math.max(0, cycle - since) : 0,
        });
      }
      if (out.length) return out;
      const a = yourAttack(m, you, this),
        stats = statsOf(you),
        category = stats ? G.Stats.enemyCat(stats[1], stats[3]) : 'physical';
      out.push({
        id: null,
        category,
        hitFraction: hitSize(you, m, TUNE.guessPower, category, a.type, G.Stats.DMG_SCALAR),
        reach: Infinity,
        travelSpeed: 0,
        cycle: TUNE.guessCycle,
        nextFireIn: 0,
      });
      return out;
    }
    /** The planner's world (G.LeaderPlanner): leader mon e's own exact state, your guessed position and motion, your shots, and the
     *  settings it plans with. Null when there is no you to plan against. #52: its bench (each living bench mon as the planner reads
     *  it after a swap), its sleep or freeze left, the dodge (when its dodges are on) and whether a swap is open now (`opts.swap`,
     *  the AI's: your rules and its stall guards). `opts.expect`: the mon of yours it expects (the lead read), whose shots it plans
     *  against instead of the one on the field. */
    snapshot(e, settings, confidence, opts = {}) {
      const you = opts.expect || yours(),
        pl = G.Game.player,
        at = this.yourMotion(),
        guess = this.yourGuess();
      if (!e || e.dead || !you || !pl || pl.dead || !at) return null;
      const [ux, uy] = G.U.norm(at.x - e.x, at.y - e.y),
        threats = this.yourThreats(e, you),
        finite = threats.filter((t) => t.id != null && Number.isFinite(t.reach)),
        charges = (e.dodges && e.dodges.cd) || [],
        spent = charges.filter((c) => c > 0),
        major = e.stMajor,
        team = e.ai && e.ai.team,
        D = G.PlayerEntity.DODGE;
      const bench = [];
      if (team && opts.swap)
        team.members.forEach((m, j) => {
          if (j === team.activeIdx || m.dead) return;
          const mine = this.yourThreats(m, you);
          bench.push({
            name: m.name,
            team: j,
            hpFraction: m.hp / m.maxHp,
            healsLeft: m.healsLeft || 0,
            speed: m.spd,
            radius: m.r || 0,
            activeSlot: m.active,
            slots: m.slots.map((group, index) => ({
              index,
              moves: group.filter((s) => G.Boss.open(m, s)).map((s) => this.moveView(m, s, pl, you, mine)),
            })),
            threats: mine,
          });
        });
      return {
        distance: Math.hypot(guess.x - e.x, guess.y - e.y),
        preferredRange: settings.range,
        aimError: settings.aimError,
        risk: settings.risk,
        stubbornness: settings.stubbornness,
        randomness: settings.randomness,
        confidence,
        reflex: settings.reflex,
        dodgeRead: settings.dodgeRead,
        bag: G.LeaderAI ? G.LeaderAI.BAG : 10,
        dodge: opts.dodges ? { dist: D.dist, time: D.dur } : null,
        swap: bench.length ? { allowed: true, iframes: G.Team.SWAP_IFRAME, will: settings.swapWill } : null,
        bench,
        own: {
          speed: e.spd,
          radius: e.r || 0,
          hpFraction: e.hp / e.maxHp,
          healsLeft: e.healsLeft || 0,
          activeSlot: e.active,
          stunLeft: major && (major.k === 'sleep' || major.k === 'freeze') ? Math.max(0, major.t) : 0,
          dodgeReserve: settings.dodgeReserve || 0,
          dodgeCharges: {
            ready: charges.length - spent.length,
            total: charges.length,
            nextBackIn: spent.length ? Math.min(...spent) : 0,
          },
        },
        slots: e.slots.map((group, index) => ({
          index,
          moves: group.filter((s) => G.Boss.open(e, s)).map((s) => this.moveView(e, s, pl, you, threats)),
        })),
        you: {
          hpFraction: pl.maxHp > 0 ? pl.hp / pl.maxHp : 1,
          radius: pl.r || 0,
          sidewaysSpeed: Math.abs(at.vx * uy - at.vy * ux),
          bestReach: finite.length ? Math.max(...finite.map((t) => t.reach)) : TUNE.guessReach,
          bestHit: Math.max(0, ...threats.map((t) => t.hitFraction)),
          baitMoveId: yourAttack(e, you, this).id,
          threats,
        },
      };
    }
    /** One open move of leader mon e as the planner reads it (its own exact state: timers, reach, its hit on you). */
    moveView(e, s, pl, you, threats) {
      const d = e.moveDef(s.id),
        { form, reach } = reachOfMove(d),
        tempo = (e.gym && e.gym.tempo) || 1,
        backs = !!form && form !== 'buff' && form !== 'heal' && setsBack(e, d, pl);
      let tag = 'none';
      if (form === 'heal' || form === 'buff') tag = form;
      else if (form && d.basePower > 0) tag = 'attack';
      else if (backs) tag = 'status';
      const view = {
        id: s.id,
        form,
        tag,
        reach: Number.isFinite(reach) ? reach : 0,
        cooldown: (d.cd || 0) * (e.cdMul || 1),
        remaining: Math.max(0, s.t || 0),
        hitFraction:
          tag === 'attack' ? hitSize(e, you, d.basePower, d.category, d.type, G.Stats.ENEMY_DMG_SCALAR, pl.maxHp) : 0,
        tell: e.tellsOn && G.Boss.TUNE.TELL[form] ? G.Boss.TUNE.TELL[form] / tempo : 0,
        travelSpeed: form === 'shot' ? (d.delivery && d.delivery.moveSpeed) || 0 : 0,
        halfWidth: (d.space && (d.space.radRadius || (d.space.linWidth || 0) / 2)) || 10,
        setsBack: backs,
      };
      if (tag === 'buff') {
        view.buffValue = this.buffValue(e, d, threats, you);
        view.buffReady = G.MoveEffects.statReady(d, e) && view.buffValue > 0;
      }
      if (tag === 'heal') view.healFraction = healFractionOf(d);
      return view;
    }
    /** What a buff's stage is worth over the planner's buffWindow (LEADER-AI GOAL VALUE AND SCORE): an Attack or Sp. Atk raise is the
     *  extra damage its best matching hit deals (its hit x the casts that fit x the stage's gain); a Defense or Sp. Def raise is the
     *  damage it keeps off (your believed shots of that category per second x the window x the share the stage removes). Speed: 0. */
    buffValue(e, d, threats, you) {
      const window = G.LeaderPlanner ? G.LeaderPlanner.TUNE.buffWindow : 10;
      let total = 0;
      for (const fx of d.payload || []) {
        if (fx.t !== 'stat' || fx.side === 'foe' || !(fx.stages > 0)) continue;
        const stat = G.MoveEffects.statKey(fx.stat),
          now = G.Stages.stage(e, stat);
        if (now >= 6) continue;
        const up = Math.min(6, now + fx.stages);
        if (stat === 'atk' || stat === 'spa') {
          const cat = stat === 'atk' ? 'physical' : 'special';
          let best = 0;
          for (const s of poolOf(e)) {
            const m = e.moveDef(s.id);
            if (!(m.basePower > 0) || m.category !== cat) continue;
            const hit = hitSize(e, you, m.basePower, m.category, m.type, G.Stats.ENEMY_DMG_SCALAR, G.Game.player.maxHp),
              casts = window / Math.max(0.25, (m.cd || 1) * (e.cdMul || 1));
            best = Math.max(best, hit * casts);
          }
          total += best * (G.Stages.ladder(stat, up) / G.Stages.ladder(stat, now) - 1);
        } else if (stat === 'def' || stat === 'spd') {
          const cat = stat === 'def' ? 'physical' : 'special',
            rate = threats
              .filter((t) => t.category === cat)
              .reduce((sum, t) => sum + t.hitFraction / Math.max(0.05, t.cycle), 0);
          total += rate * window * (1 - G.Stages.ladder(stat, now) / G.Stages.ladder(stat, up));
        }
      }
      return total;
    }
    /** Your likely next hit on leader mon m: your most threatening attack's visible size x its readiness (your own-type guess,
     *  TUNE.guessPower, is believed ready). */
    danger(m, you = yours()) {
      if (!m || !you) return 0;
      const a = yourAttack(m, you, this),
        d = a.id && G.MoveDefs[a.id],
        stats = statsOf(you),
        cat = d ? d.category : stats ? G.Stats.enemyCat(stats[1], stats[3]) : 'physical',
        stab = typesOf(you).includes(a.type) ? G.Stats.STAB : 1,
        size = G.Stats.visibleHitFrac(
          stats,
          levelOf(you),
          statsOf(m),
          levelOf(m),
          a.id ? a.power : TUNE.guessPower,
          cat,
          stab,
          a.k,
          G.Stats.DMG_SCALAR
        );
      return size * (a.id ? this.readiness(you, a.id) : 1);
    }
    /** Leader mon m's best hit on your mon on the field, among its damaging moves ready now (its own exact timers). Your mon takes
     *  your damage-taken scale (G.Stats.ENEMY_DMG_SCALAR). */
    opportunity(m, you = yours()) {
      if (!m || !you) return 0;
      const yt = typesOf(you);
      let best = 0;
      for (const s of poolOf(m)) {
        const d = m.moveDef(s.id);
        if (s.t > 0 || !d || !(d.basePower > 0)) continue;
        const stab = typesOf(m).includes(d.type) ? G.Stats.STAB : 1,
          size = G.Stats.visibleHitFrac(
            statsOf(m),
            levelOf(m),
            statsOf(you),
            levelOf(you),
            d.basePower,
            d.category,
            stab,
            G.Types.mult(d.type, yt),
            G.Stats.ENEMY_DMG_SCALAR
          );
        best = Math.max(best, size);
      }
      return best;
    }
  }

  return {
    TUNE,
    opened,
    learn,
    readinessIn,
    yourAttack,
    matchup,
    /** A switched gym's fight starts: the Belief over its G.LeaderInfo record. */
    create(info) {
      return (cur = info ? new Belief(info) : null);
    },
    /** The fight is over (or the arena reset). */
    end() {
      cur = null;
    },
    get current() {
      return cur;
    },
  };
})();
