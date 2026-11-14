/* ============ boss-ai.js: boss brains (G.Boss) ============
 * A boss is the shared Enemy body (enemy.js: HP, hurt, die, status, stages, the grid slot) plus a brain that makes every
 * decision. The body only delegates: Enemy.update calls brain.step, Enemy.applyFlinch calls brain.flinch. G.Boss.make is
 * the only way to spawn a boss (gym-arena.js). Gyms only since 2026-10-31, so the GymBrain is the only brain; a later boss
 * type (the Elite Four, or a multi-mon gym arena that needs its own pacing) gets its own brain here, with no edit to the wild AI.
 *
 * GymBrain (slice 7a, D-ENEMY, Jess 2026-10-31): a leader's mon plays like the player. The body becomes a G.MoveSim owner: its
 * authored moves (G.Gyms) sit in one group and cast through the sim (G.MoveSim.castAt), each attack on its own cooldown (the folded
 * def's cd, divided by tempo) and a pure buff the moment its Gate opens (COMBAT-RULES:SS8 and SS13, so Harden climbs to +6 in about
 * 30 s), with no tell. Its upgrade cards (G.Gyms `cards`) belong to this mon only and are folded by G.TeamCards like the player's.
 * The attack is picked by a utility score (attack(): freshness x fit x opportunity, Jess 2026-11-01). Every attack is telegraphed: a tell (Charge animation plus a ring) with the aim locked at its start, 0.45 s for a melee cone or a
 * nova and 0.5 s for a shot or a strike (a strike locks your spot instead of the aim), then 0.35 s of recovery, all divided by tempo; one tell at a time, standing still.
 * Lore-set slice 3 (Jess 2026-11-02): a returns move (Razor Leaf) and a beam (Psybeam, with a warning line) tell 0.5 s, a burst (Fury
 * Attack) 0.45 s with each jab re-aimed at you; a trail (Toxic) is a persistent slot kept by G.MoveSim.persist, with no tell. A hit on the player lands
 * its riders too (G.MoveEffects: ailments, drops, flinch, crits; the mon's own raises and drain heal). Recoil costs the mon HP (never
 * below 1) and a self heal (Recover) casts with no tell while it is hurt (Jess 2026-11-02). Movement (Tier 1): the stance alternation (far / close) as before, made aware of its moves: in close mode it
 * walks in while a melee move is ready and circles just outside its reach while it recharges; in far mode it keeps 170 to 300 px,
 * closer while its longest ready ranged move falls short of that (it walks in to use it, Jess 2026-11-01);
 * below 30% HP it favors far. Touching the body hurts with the melee move's numbers (the contact move), recomputed every step so the
 * enrage and stages count. There is no fury: the enrage is the 120 s clock (systems/gym.js).
 * Entity model slice 8 (Jess 2026-11-07, map: docs/ASCII Concept Maps/Entity Model Slice 8 - Leader Slot Choice.txt): on a G.GymLeader
 * each authored move line is its own slot (bonded lines share one) and only the active slot casts, as yours. pickSlot chooses the slot
 * under your 0.4 s slot hold: a self heal first, then stay unless another slot scores SWITCH_MARGIN times more, then a buff visit
 * when nothing in reach is ready. Movement still reads every open slot. The wild body keeps one group and is unchanged.
 */
G.Boss = (() => {
  // seconds of wind-up before an attack (Jess 2026-10-31; dash TUNE 2026-11-02; returns, beam, multi TUNE 2026-11-02), divided by tempo; a
  // pure buff, a self heal and a trail have none
  // a delayed mark (Future Sight) has none: its own delay, with the marker drawn on your locked spot, is the warning (Jess 2026-11-02)
  const TELL = {
    melee: 0.45,
    nova: 0.45,
    multi: 0.45,
    shot: 0.5,
    strike: 0.5,
    returns: 0.5,
    beam: 0.5,
    dash: 0.6,
    delayed: 0,
  };
  const CLOSE = ['melee', 'nova', 'multi']; // forms cast from the body, so the close stance walks in for them
  const RANGED = ['shot', 'strike', 'dash', 'returns', 'beam', 'delayed']; // forms far mode keeps you inside of
  const ORDER = ['melee', 'nova', 'multi', 'strike', 'delayed', 'dash', 'beam', 'returns', 'shot']; // the attack forms; on equal scores the earlier form wins, then the earlier move
  const POINT_BLANK = 0.5; // TUNE: a shot or strike's score when you are inside the mon's close reach, so up close it prefers its melee
  // TUNE, the opportunity factor (Jess 2026-11-01): a Hex-like move (statusBonus) while you carry a major ailment; a move whose major
  // ailment cannot land since you already carry one; a move whose foe stat drop is not on you yet
  const OPP_HEX = 1.5,
    OPP_BLOCKED = 0.75,
    OPP_DROP = 1.25;
  const MAJOR = new Set(['burn', 'poison', 'toxic', 'paralysis', 'freeze', 'sleep']);
  const RECOVER = 0.35; // seconds standing still after the release, divided by tempo
  const LOW_HP = 0.3; // below this fraction of max HP the leader favors fighting from range
  const NEAR = 170,
    FAR = 300; // far mode: backs off inside NEAR, circles you inside FAR, walks in beyond it
  const SHOT_IN = 20, // far mode with a short ranged move ready: FAR shrinks to its reach minus this, so it lands
    BAND = 40; // and NEAR to at most this much inside the shrunk FAR
  const adapt = (d) => ({ cat: d.category, dmg: d.basePower || 0, type: d.type }); // the damage adapter G.MoveEffects uses (D5: P = basePower)
  const SWITCH_MARGIN = 1.5; // TUNE (slice 8, Q2): another slot must score this many times the active one to pull a leader off it
  const SPOT = ['strike', 'dash', 'delayed']; // forms that lock your spot at the tell's start
  /** An hpBelow move joins only below its line (slice 8: a leader's slot that holds one is closed above it). */
  const open = (e, s) => s.hpBelow == null || e.hp < e.maxHp * s.hpBelow;
  /** Slice 8 (Q1, Q5): a Player-entity leader's slots, one per authored move line. The lines marked `bond` join one group, placed
   *  where the first of them stands (your rule: one group grows). */
  function slotsOf(moves) {
    const out = [];
    let bond = null;
    for (const m of moves) {
      const s = { id: m.id, t: 0, hpBelow: m.hpBelow };
      if (!m.bond) out.push([s]);
      else if (bond) bond.push(s);
      else out.push((bond = [s]));
    }
    return out;
  }
  /** Slice 8 (Q9): what a leader senses of the scene, with no gym rule in it, so a later brain (slice 9 swaps, the Director) can reuse
   *  it. Your missing stat drops stay per move in opp(), since they depend on the move's source. */
  function sense(self, foe) {
    return {
      dist: G.U.dist(self.x, self.y, foe.x, foe.y),
      hpFrac: self.maxHp > 0 ? self.hp / self.maxHp : 1,
      foeMajor: G.Status.majorKind(foe),
      foeR: foe.r || 0,
    };
  }

  class GymBrain {
    /** The body becomes a sim owner: one group with the authored moves, its own card store, tempo as the cooldown multiplier, the player
     *  as its only foe. The contact move is the first damaging melee move (else the first damaging move). */
    constructor(e) {
      this.e = e;
      this.on = false; // the fight state starts on the first step (init)
      const g = e.gym;
      e.atkLvl = g.level;
      // slice 8: a Player-entity leader takes one slot per line (its `active` starts at 0, G.PlayerEntity); the wild body one group
      e.slots = e.isPlayer ? slotsOf(g.moves) : [g.moves.map((m) => ({ id: m.id, t: 0, hpBelow: m.hpBelow }))];
      e.teamCards = G.TeamCards.store();
      for (const id of Object.keys(g.cards || {})) G.TeamCards.add(e.teamCards, id, g.cards[id]);
      e.cdMul = 1 / g.tempo;
      const rules = g.restrictions || {}; // the gym's authored restrictions (js/data/gyms.js); absent means the defaults below
      this.tells = rules.tells !== false;
      this.healsLeft = rules.healLimit != null ? rules.healLimit : Math.max(1, Math.floor(g.loop) || 1); // self heals this mon may cast this fight: by default the loop number (Jess 2026-11-05)
      e.aim = 0;
      e.foes = () => {
        const p = G.Game.player;
        return p && !p.dead ? [p] : [];
      };
      // the open moves of the active slot (a leader's; the wild body's one group)
      e.activeGroup = () => (e.isPlayer ? e.slots[e.active] || [] : e.slots[0]).filter((s) => open(e, s));
      // A G.GymLeader inherits these four from G.PlayerEntity (slice 5; the attack factor since slice 6, plan D1: your formula, so
      // Protein, IVs, nature and held items count); the wild body gets them here.
      if (!e.isPlayer) {
        e.stabFor = (m) => e.types.includes(m.type); // slice 4b (H1): a leader's STAB, as the player's
        e.heal = (n) => this.heal(n); // a drain move (Giga Drain) heals from the damage dealt to you, a self heal (Recover) from max HP
        e.payHp = (n) => this.payHp(n); // recoil (Take Down, Jess 2026-11-02): the mon pays as the player does, never below 1 HP
        e.moveFactor = (m) => this.factor(m); // the wild attack factor: power, enrage and the stage
      }
      const dmg = g.moves.map((m) => m.id).filter((id) => this.def(id).basePower > 0);
      this.contact = e.isPlayer ? null : dmg.find((id) => G.Gyms.formOf(this.def(id)) === 'melee') || dmg[0] || null; // a Player entity has no touch damage
      this.touch();
      e.atkFactor0 = e.atkFactor;
    }

    init() {
      const st = this.e.gym.stance;
      this.on = true;
      this.melee = this.e.slots.flat().some((s) => CLOSE.includes(G.Gyms.formOf(this.def(s.id))));
      this.farLike = st === 'far' ? 0.8 : st === 'close' ? 0.2 : 0.5;
      this.mode = st === 'far' || !this.melee ? 'far' : 'close';
      this.modeT = G.U.rand(6, 8);
      this.tell = null;
      this.wait = 1.6;
      this.side = Math.random() < 0.5 ? -1 : 1;
      this.low = false;
    }

    /** The def this mon casts: the frozen move data with its cards folded in (G.TeamCards). */
    def(id) {
      return G.TeamCards.defOf(this.e, id);
    }

    /** One frame of movement and casting; returns [vx, vy, anim] for the body's integration. `onPick(i)` (a Player-entity leader,
     *  LEADER-AI slice 1): the slot pickSlot chose, or -1, handed to the AI player, which presses it through your controls here,
     *  before the casts, so the frame runs as when the brain switched by itself. */
    step(dt, pl, dist, dx, dy, spd, onPick = null) {
      if (!this.on) this.init();
      const e = this.e,
        now = G.Gym.now();
      this.touch();
      // every move recharges, inactive slots too, as the player's do
      for (const g of e.slots) for (const s of g) if (s.t > 0) s.t = Math.max(0, s.t - dt);
      if (this.wait > 0) this.wait -= dt;
      if (e.isPlayer && onPick) onPick(this.pickSlot(pl, now)); // slice 8: the slot choice, before the casts, under your slot hold
      this.buffs(now);
      this.heals(now);
      G.MoveSim.persist(e, now); // a persistent slot (Toxic's trail) lives while it is in the active group, as the player's does
      G.MoveEffects.upkeep(dt, e); // heal over time ticks (a self heal lands on its first tick), as the sim does for the player
      if (e.mvRoot) return [0, 0, 'Walk']; // a live dash (Quick Attack) carries the body; the brain does not steer until it is back
      if (this.tell) return this.telling(dt, now);
      if (!this.low && e.hp < e.maxHp * LOW_HP) {
        this.low = true;
        this.farLike = 0.8;
      }
      // LEADER-AI slice 3 (#32): the AI player's pacing holds a stance ('close' a push, 'far' a breather) and pauses the alternation; a
      // push with no melee move walks to the inner edge of its far band instead (tight)
      const tight = this.hold === 'close' && !this.melee;
      if (this.hold) this.mode = tight ? 'far' : this.hold;
      else this.modeT -= dt;
      // It always alternates: at its favorite range it stays longer (7-9 s) than at the other (4-5 s). A mon with no melee move stays far.
      if (!this.hold && this.modeT <= 0) {
        this.mode = this.mode === 'far' && this.melee ? 'close' : 'far';
        this.modeT = (this.mode === 'far') === this.farLike > 0.5 ? G.U.rand(7, 9) : G.U.rand(4, 5);
        this.side = -this.side;
      }
      // A gym leader moves at its species speed, always: no chase bonus, no slower circling (Jess, 2026-10-19).
      let vx = dx * spd,
        vy = dy * spd;
      const [ux, uy] = G.U.norm(pl.x - e.x, pl.y - e.y);
      const circle = () => {
        vx = -uy * spd * this.side;
        vy = ux * spd * this.side;
      };
      if (this.mode === 'far') {
        let out = Math.min(FAR, this.ranged() - SHOT_IN),
          inn = Math.min(NEAR, out - BAND);
        if (tight) [out, inn] = [inn, inn - BAND];
        if (dist < inn) {
          vx = -ux * spd;
          vy = -uy * spd;
        } else if (dist < out) circle();
      } else if (!CLOSE.some((f) => this.ready(f))) {
        // close, every close move recharging: circle just outside its reach
        const r = this.reach() + (pl.r || 0) + 30;
        if (dist < r) {
          vx = -ux * spd;
          vy = -uy * spd;
        } else if (dist < r + 40) circle();
      }
      if (this.wait <= 0 && !e.stFl && this.attack(dist, pl, now)) return [0, 0, 'Idle'];
      return [vx, vy, 'Walk'];
    }

    /** Every move the mon moves for (slice 8): on a leader the open moves of all its slots, so it walks in for a move on another slot
     *  and switches to it once in reach; on the wild body its one group, as before. */
    pool() {
      const e = this.e;
      return e.isPlayer ? e.slots.flat().filter((s) => open(e, s)) : e.activeGroup();
    }

    /** The first ready move of `form` the mon moves for (pool), or null. */
    ready(form) {
      for (const s of this.pool()) if (s.t <= 0 && G.Gyms.formOf(this.def(s.id)) === form) return s;
      return null;
    }
    /** The reach of the mon's close moves (the largest melee cone or nova), from its center: the player's reach, since the mon is player-sized. */
    reach() {
      let r = 0;
      for (const s of this.e.slots.flat()) {
        const d = this.def(s.id),
          f = G.Gyms.formOf(d);
        if (CLOSE.includes(f)) r = Math.max(r, G.Gyms.reachOf(d, f));
      }
      return r;
    }

    /** The reach of the longest ready ranged move it moves for (RANGED, pool), or Infinity when none is ready: far mode keeps you inside it. */
    ranged() {
      let r = -Infinity;
      for (const s of this.pool()) {
        if (s.t > 0) continue;
        const d = this.def(s.id),
          f = G.Gyms.formOf(d);
        if (RANGED.includes(f)) r = Math.max(r, G.Gyms.reachOf(d, f));
      }
      return r > -Infinity ? r : Infinity;
    }

    /** The utility pick (Jess 2026-11-01): every ready attack you are in reach of (a melee cone or a nova: its reach plus your body; a
     *  strike: its range; a shot: how far it flies, capped at its range) gets a score, and the highest starts its tell. Score = freshness x fit. Freshness: seconds since the
     *  move's last tell started (the fight's first pick for one never cast), over its cooldown, so every move gets turns and fast moves
     *  still come more often. Fit: 1, or POINT_BLANK for a shot or strike while you are inside the mon's close reach. Ties: ORDER, then
     *  the move's place in the group. Opportunity: see opp(). No randomness. this.scores keeps the last pick's scores for the ?dev overlay.
     *  Slice 8: `group` defaults to the active group; `dry` only scores it and returns the best candidate (pickSlot reads every slot). */
    attack(dist, pl, now, group = this.e.activeGroup(), dry = false) {
      if (this.t0 == null) this.t0 = now;
      const close = this.reach(),
        blank = close > 0 && dist <= close + (pl.r || 0);
      let best = null;
      const scores = [];
      for (const s of group) {
        if (s.t > 0) continue;
        const d = this.def(s.id),
          form = G.Gyms.formOf(d),
          rank = ORDER.indexOf(form);
        if (rank < 0) continue;
        const near = CLOSE.includes(form);
        if (dist > G.Gyms.reachOf(d, form) + (near ? pl.r || 0 : 0)) continue;
        const fresh = (now - (s.last != null ? s.last : this.t0)) / Math.max(0.05, d.cd * this.e.cdMul),
          c = { s, d, form, rank, score: fresh * (blank && !near ? POINT_BLANK : 1) * this.opp(d, pl) };
        scores.push(c);
        if (!best || c.score > best.score || (c.score === best.score && c.rank < best.rank)) best = c;
      }
      if (dry) return best;
      this.scores = scores.map((c) => ({ id: c.s.id, score: c.score, picked: c === best }));
      if (!best) return false;
      best.s.last = now;
      this.start(best.s, best.d, best.form, pl);
      return true;
    }

    /** Slice 8 (Q2 to Q4, Jess 2026-11-07): a leader's slot choice, under your 0.4 s slot hold and never inside a tell. In order:
     *  1 a self heal slot that can cast while hurt (the heal cap still counts); 2 stay on the active slot while it has a ready move in
     *  reach that no other slot beats by SWITCH_MARGIN; 3 else the slot with the best attack score; 4 with nothing ready in reach, a
     *  buff slot whose Gate is open. A switch is your setActive: the hold and the type ring, no sound (Q8).
     *  LEADER-AI slice 1: it only chooses. It returns the slot to switch to, or -1 to stay, and the AI player presses it. */
    pickSlot(pl, now) {
      const e = this.e;
      if (e.slots.length < 2 || this.tell || e.mvRoot || e.stFl || e.swapT > 0) return -1;
      const S = sense(e, pl),
        go = (i) => (i !== e.active ? i : -1),
        slotWith = (form, ok) =>
          e.slots.findIndex((g) =>
            g.some((s) => open(e, s) && s.t <= 0 && G.Gyms.formOf(this.def(s.id)) === form && ok(s))
          );
      if (S.hpFrac < 1 && this.healsLeft > 0) {
        const h = slotWith('heal', () => true);
        if (h >= 0) return go(h);
      }
      let cur = null,
        top = null,
        at = -1;
      e.slots.forEach((g, i) => {
        const c = this.attack(
          S.dist,
          pl,
          now,
          g.filter((s) => open(e, s)),
          true
        );
        if (!c) return;
        if (i === e.active) cur = c;
        if (!top || c.score > top.score || (c.score === top.score && c.rank < top.rank)) {
          top = c;
          at = i;
        }
      });
      if (top) return !cur || top.score >= SWITCH_MARGIN * cur.score ? go(at) : -1;
      const b = slotWith('buff', (s) => G.MoveEffects.statReady(this.def(s.id), e));
      return b >= 0 ? go(b) : -1;
    }

    /** Slice 8 (Q5): the other attack moves of the active slot that are ready now (a bonded slot holds 2 to 4), marked as cast now. */
    bondOf(slot) {
      const now = G.Gym.now(),
        out = [];
      for (const s of this.e.activeGroup()) {
        const form = G.Gyms.formOf(this.def(s.id));
        if (s === slot || s.t > 0 || ORDER.indexOf(form) < 0) continue;
        s.last = now;
        out.push({ s, form });
      }
      return out;
    }

    /** Opportunity (Jess 2026-11-01): x OPP_HEX for a statusBonus move while you carry a major ailment, x OPP_BLOCKED for a move with a
     *  major ailment rider while you already carry one, x OPP_DROP for a move with a foe stat drop that is not on you yet (no tracker from
     *  this move and mon). Each applies once; 1 otherwise. */
    opp(d, pl) {
      const p = d.payload || [],
        major = G.Status.majorKind(pl);
      let k = 1;
      if (major && p.some((fx) => fx.t === 'special' && fx.handler === 'statusBonus')) k *= OPP_HEX;
      if (major && p.some((fx) => fx.t === 'ailment' && fx.side === 'foe' && MAJOR.has(fx.id))) k *= OPP_BLOCKED;
      const src = G.MoveEffects.srcOf(d, this.e);
      if (
        p.some(
          (fx) =>
            fx.t === 'stat' &&
            fx.side === 'foe' &&
            fx.stages < 0 &&
            !G.Stages.tracker(pl, G.MoveEffects.statKey(fx.stat), src, false)
        )
      )
        k *= OPP_DROP;
      return k;
    }

    /** The tell: the aim is locked now; the move fires along it when the tell ends, whether or not you are still there. A strike locks
     *  your spot instead and marks it on the ground; a nova's ring shows its full reach. A dash locks your spot too and shows the wild
     *  charger's warning line to it (capped at its range) plus its hit circle there (Jess 2026-11-02). */
    start(slot, d, form, pl) {
      const e = this.e,
        tempo = e.gym.tempo,
        ang = Math.atan2(pl.y - e.y, pl.x - e.x),
        col = G.U.TYPE_COLOR[d.type] || '#ff7a9e';
      // slice 8 (Q5): the other ready attacks of a bonded slot fire with this one
      const bond = e.isPlayer ? this.bondOf(slot) : [],
        // a gym with tells off fires on the next frame, with no warning shown; a bonded tell lasts its longest member's
        wind = this.tells ? bond.reduce((w, b) => Math.max(w, TELL[b.form]), TELL[form]) / tempo : 0,
        spot = form === 'strike' || form === 'dash' || form === 'delayed' ? { x: pl.x, y: pl.y } : null;
      this.tell = { slot, id: d.id, form, t: 0, wind, after: RECOVER / tempo, ang, spot, fired: false };
      if (bond.length) Object.assign(this.tell, { bond, lock: { x: pl.x, y: pl.y } });
      e.aim = ang;
      if (!this.tells) return;
      e.anim.play('Charge', { speed: 1.4 });
      if (form === 'dash') {
        const len = Math.min(Math.hypot(spot.x - e.x, spot.y - e.y), G.Gyms.reachOf(d, form)),
          end = { x: e.x + Math.cos(ang) * len, y: e.y + Math.sin(ang) * len },
          w = {
            kind: 'beam',
            warn: true,
            src: e,
            x: e.x,
            y: e.y,
            angle: ang,
            len,
            w: d.space.radRadius * 2,
            delay: wind,
            dmg: 0,
            type: d.type,
            color: col,
          };
        G.Hazards.add(w);
        G.Hazards.add(Object.assign({}, w, { kind: 'zone', x: end.x, y: end.y, r: d.space.radRadius }));
      } else if (form === 'beam')
        // the warning line along the locked aim, the beam's full length and width (Jess 2026-11-02)
        G.Hazards.add({
          kind: 'beam',
          warn: true,
          src: e,
          x: e.x,
          y: e.y,
          angle: ang,
          len: d.space.linLength,
          w: d.space.linWidth,
          delay: wind,
          dmg: 0,
          type: d.type,
          color: col,
        });
      else if (form === 'delayed')
        return; // the marker is the move's own instance, drawn through its delay (move-render.js)
      else if (spot) G.FX.ring(spot.x, spot.y, d.space.radRadius * 3, d.space.radRadius, col, wind, 2);
      else G.FX.ring(e.x, e.y, e.r, form === 'nova' ? G.Gyms.reachOf(d, form) : e.r * 2.4, col, wind, 2);
    }

    telling(dt, now) {
      const e = this.e,
        c = this.tell;
      c.t += dt;
      if (!c.fired && c.t >= c.wind) {
        c.fired = true;
        e.aim = c.ang;
        if (G.MoveSim.castAt(e, c.slot, this.def(c.id), now, c.ang, c.spot)) {
          G.Gym.noteCast(c.id);
          this.orbCost(this.def(c.id));
          e.anim.play(CLOSE.includes(c.form) || c.form === 'dash' ? 'Attack' : 'Shoot', { speed: 1.4 });
        }
        if (c.bond) for (const b of c.bond) this.fireBond(b, c, now);
      }
      if (c.t >= c.wind + c.after) this.tell = null;
      return [0, 0, 'Idle'];
    }

    /** A bonded member's cast on the tell's release (slice 8, Q5): the same aim; a spot form takes your spot locked at the tell's start. */
    fireBond(b, c, now) {
      const d = this.def(b.s.id);
      if (!G.MoveSim.castAt(this.e, b.s, d, now, c.ang, SPOT.includes(b.form) ? c.lock : null)) return;
      G.Gym.noteCast(b.s.id);
      this.orbCost(d);
    }

    /** Pure buffs cast the moment their Gate opens (SS8), with no tell, even during an attack's tell. A fizzle waits one Gate (the sim).
     *  On a leader (slice 8, Q3) only from the active slot, so pickSlot visits it. */
    buffs(now) {
      const e = this.e;
      for (const s of e.activeGroup()) {
        const d = this.def(s.id);
        if (s.t > 0 || G.Gyms.formOf(d) !== 'buff' || !G.MoveEffects.statReady(d, e)) continue;
        if (!G.MoveSim.castAt(e, s, d, now, e.aim)) continue;
        G.Gym.noteCast(s.id);
        this.orbCost(d);
        const col = G.U.TYPE_COLOR[d.type] || '#ff7a9e',
          vis = G.VFX.forMove(d); // the player's buff look: a ring and rising sprites
        G.FX.ring(e.x, e.y, e.r * 2.4, e.r * 1.1, col, 0.35, 2.5);
        for (let i = 0; i < 3; i++)
          G.FX.sp(
            vis.buff || 'arrow',
            vis.pal,
            e.x + G.U.rand(-e.r * 1.4, e.r * 1.4),
            e.y - G.U.rand(0, e.bodyH * 0.8),
            { vy: -70, life: 0.6 }
          );
      }
    }

    /** Self heals (Recover, Synthesis, Moonlight; Jess 2026-11-02, mainline strength) cast with no tell, as buffs do, whenever the mon
     *  is hurt and the move is off cooldown, at most as many times per fight as the loop number (loop 1: once, loop 2: twice; Jess
     *  2026-11-05). A drain move (Giga Drain) is not a self heal and is never counted. */
    heals(now) {
      const e = this.e;
      if (!(e.hp < e.maxHp)) return;
      for (const s of e.activeGroup()) {
        if (this.healsLeft <= 0) return;
        const d = this.def(s.id);
        if (s.t > 0 || G.Gyms.formOf(d) !== 'heal') continue;
        if (!G.MoveSim.castAt(e, s, d, now, e.aim)) continue;
        this.healsLeft--;
        G.Gym.noteCast(s.id);
        this.orbCost(d);
        G.FX.ring(e.x, e.y, e.r * 2.4, e.r * 1.1, '#5fe08a', 0.35, 2.5);
      }
    }

    /** Flinch (slice D2): a tell in progress is cancelled (that move's cooldown is spent) and the next attack waits one recovery. */
    flinch() {
      if (!this.on) return;
      const c = this.tell;
      if (c && !c.fired) c.slot.t = Math.max(0.05, this.def(c.id).cd * this.e.cdMul);
      this.tell = null;
      this.wait = Math.max(this.wait, RECOVER / this.e.gym.tempo);
    }

    /** Attack factor for a move (the sim's damage adapter): the folded Power, category from the move, level locked at gate spawn, STAB on
     *  the mon's own types, the power knob, the enrage and the Attack or Sp. Atk stage. Player.hurt does the defender half. */
    factor(m) {
      const e = this.e,
        special = m.cat === 'special';
      // slice 4b (H1, Jess 2026-11-06): no STAB here; the hit carries it (stabFor below, after the +2, the mainline spot)
      return (
        G.Stats.enemyAttackFactor(e.atkBase, e.spaBase, e.gym.level, m.dmg || 40, special ? 'special' : 'physical') *
        e.gym.power *
        G.Gym.enrageMul(e) *
        G.Stages.mul(e, special ? 'spa' : 'atk')
      );
    }

    /** Life Orb on a leader (slice 6, N6): each cast costs 1% of max HP (at least 1), never below 1 HP, the rule Player.cast applies to
     *  you. An always-on move (a persistent def) is not an attack. The wild body holds no items. */
    orbCost(d) {
      const e = this.e;
      if (e.isPlayer && e.hasItem('lifeorb') && !(d && d.persistent))
        e.hp = Math.max(1, e.hp - Math.max(1, e.maxHp * 0.01));
    }

    /** A cast's HP cost (recoil) on the mon: taken directly, never below 1 HP, with a grey number (Player.payHp's rule). */
    payHp(n) {
      const e = this.e,
        before = e.hp;
      e.hp = Math.max(1, e.hp - n);
      const got = Math.round(before - e.hp);
      if (got >= 1) G.FX.dmgText(e.x, e.y - (e.bodyH || 20) - 6, '-' + got, '#c9c9d6');
    }

    /** A heal on the mon (Giga Drain's drain, a self heal's tick): up to its max HP, with a green number. */
    heal(n) {
      const e = this.e,
        before = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + n);
      const got = Math.round(e.hp - before);
      if (got >= 1) G.FX.dmgText(e.x, e.y - (e.bodyH || 20) - 6, '+' + got, '#5fe08a');
    }

    /** The body's contact numbers (combat.js reads atkFactor, atkCat and atkType when you touch it): the contact move, never swapped. */
    touch() {
      const e = this.e,
        d = this.contact && this.def(this.contact);
      if (!d) return;
      e.atkFactor = this.factor(adapt(d));
      e.atkCat = d.category === 'special' ? 'special' : 'physical';
      e.atkType = d.type;
    }
  }

  /** The only boss spawn: a G.GymLeader for a switched gym (slice 5, js/entities/gym-leader.js); else a boss body (enemy.js) with a GymBrain when the def carries a gym leader descriptor. */
  function make(def, x, y) {
    if (def.gym && def.gym.playerEntity) return new G.GymLeader(def, x, y);
    const e = new G.Enemy(def, x, y, { hp: 1, spd: 1, dmg: 1 }, true);
    if (e.gym) e.brain = new GymBrain(e);
    return e;
  }

  // Leader AI slice 5a (#34): the tuning a Player-entity leader shares with GymBrain (G.GymLeader.SimPass, G.LeaderAI read it), one
  // copy until gyms 3 to 8 switch (slice 12)
  const TUNE = Object.freeze({
    TELL,
    RECOVER,
    CLOSE,
    RANGED,
    ORDER,
    SPOT,
    POINT_BLANK,
    OPP_HEX,
    OPP_BLOCKED,
    OPP_DROP,
    MAJOR,
    LOW_HP,
    NEAR,
    FAR,
    SHOT_IN,
    BAND,
    SWITCH_MARGIN,
  });
  return { make, GymBrain, TELL, RECOVER, sense, SWITCH_MARGIN, TUNE, slotsOf, open };
})();
