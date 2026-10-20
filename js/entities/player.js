/* ============ player.js — the Pokemon you control ============
 * (x, y) are the FEET. Only ONE move is active at a time: it fires
 * on its own and is changed with 1-4 / Q / E. Each shot plays the animation of
 * Mystery Dungeon attack that applies (Attack, Shoot or Charge).
 */
/* Base-stats model (Speed -> movement px/s, HP -> maxHp) lives in js/core/stats.js
 * as G.Stats, shared with enemies. See docs/stat-model-design-notes.md, BALANCE.md. */
G.Player = class Player {
  /**
   * @param mon   entrada de G.DEX
   * @param perks mejoras permanentes ya resueltas (ver data/upgrades.js)
   */
  constructor(mon, perks = {}, shiny = false) {
    this.mon = mon;
    this.dex = mon.dex;
    this.shiny = shiny && G.Sprites.hasShiny(mon.dex);
    this.anim = new G.Sprites.Animator(mon.dex, 1, this.shiny);
    this.x = 0; this.y = 0;
    this.r = G.Sprites.bodyRadius(mon.dex);
    this.bodyH = G.Sprites.bodyHeight(mon.dex);

    this.atkMul = perks.atkMul || 1;
    this.spdMul = perks.spdMul || 1;
    this.cdMul = perks.cdMul || 1;
    this.dmgReduce = perks.dmgReduce || 0;
    this.regenFlat = perks.regen || 0;
    this.magnet = 78 * (perks.magnetMul || 1);
    this.xpMul = perks.xpMul || 1;
    this.coinMul = perks.coinMul || 1;

    // Mainline-scaled HP from the real base HP stat (stats[0]); grows with run level.
    // perks.hp (flat HP upgrades) still adds on top. IV/EV 0 this slice (deferred).
    this.perksHp = perks.hp || 0;
    // Stat cards (upgrade rework slice 2c): sum of increased percentages per stat, absent = 0.
    this.inc = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    this.badge = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };   // run-long gym badge boosts (systems/gym.js), kept apart from the stat cards
    this.baseHpStat = (mon.stats && mon.stats[0] != null) ? mon.stats[0] : null;
    this.maxHp = (this.baseHpStat != null ? G.Stats.hpForLevel(this.baseHpStat, 1) : mon.hp) + this.perksHp;
    this.hp = this.maxHp;
    // Movement from the real base Speed stat (stats[5]) via the identity model;
    // fall back to the old pre-derived mon.spd if stats are somehow absent.
    this.baseSpd = (mon.stats && mon.stats[5] != null) ? G.Stats.speedToPx(mon.stats[5]) : mon.spd;
    this.baseAtk = mon.atk;
    // Real base Atk/SpA (stats[1]/stats[3]) for the A/D damage model; scale with run level
    // via G.Stats. Fallback 50 keeps a mon with no stats array working.
    this.baseAtkStat = (mon.stats && mon.stats[1] != null) ? mon.stats[1] : 50;
    this.baseSpAStat = (mon.stats && mon.stats[3] != null) ? mon.stats[3] : 50;
    this.myTypes = mon.types || [];

    this.moves = [];           // todos los movimientos aprendidos
    this.slots = [];           // huecos: cada uno, una lista de movimientos que se lanzan a la vez
    this.active = 0;           // hueco activo
    this.swapT = 0;            // hold left (s) before you may swap slots again
    this.maxMoves = 4;         // huecos
    this.bonds = 0;            // links to use (reward from the legendaries)

    // Team stage raises (slice E2a): the live applications of Swords Dance, Agility, Harden, Dragon Dance and Aqua Ring's regen. game.js
    // points every roster member at ONE shared object, so a raise cast by a teammate stays on whoever is on the field until it runs out.
    // { stat: [{ n, t, dur, src }] } with stat in atk, def, spa, spd, spe, regen. See G.Stages.teamAdd.
    this.stgTeam = {};

    this.level = 1;
    this.xp = 0;
    this.xpNext = Player.xpFor(1);
    this.kills = 0;
    this.bosses = 0;
    this.rerolls = 0;          // veces que ha cambiado las cartas de nivel en esta run
    this.rerollBonus = perks.rerolls || 0;   // rerolls bought in Upgrades (plus the free one)
    this.critChance = perks.crit || 0;       // critical hit chance (Upgrades)
    this.banned = new Set();                 // movimientos vetados (Mejoras → Veto): no salen en las cartas
    this.bind = {};                          // movimiento -> hueco fijo (0-3), elegido en Mejoras
    this.coins = 0;            // monedas recogidas en esta run
    this.t1 = 0; this.t10 = 0; // tickets del gacha recogidos en esta run
    this.dmgDealt = 0;

    this.invuln = 0;
    this.flash = 0;
    this.aim = Math.PI / 2;
    this.moveAngle = Math.PI / 2;
    this.walking = false;
    this.inLiquid = false;
    this.lavaTick = 0;
    this.attackFace = 0;       // tiempo que sigue mirando al objetivo tras atacar
    this.dead = false;
    this.power = null;         // poder de altar activo: { def, t, dur }
    this.slowT = 0;            // pegado por una trampa
    // Statuses (slice C, G.Status): the player is a host like any enemy. stDot is the player's burn / poison / toxic.
    this.isPlayer = true;
    this.stMajor = null; this.stCnf = null; this.stTrap = null; this.stWin = null; this.stDot = null; this.stDaze = null; this.stDrow = null; this.shakeCd = 0;
    this.stg = null; this.stgRoll = null;      // stat stages (slice E1: Speed drops only)
    this.item = null;          // objeto equipado (data/items.js), uno por run
    this.sashT = -999;         // last time the Focus Band saved you
    this.bellHeal = 0;         // pending healing from the Shell Bell
  }

  /** Seconds you must stay next to a downed teammate to lift them. */
  static get REVIVE_TIME() { return 3; }

  // Mainline Medium Fast cost curve (total n^3), see G.Stats.xpToNext. The old hand-made
  // curve was floor((8 + 6L + 1.6 L^1.75) * 4).
  static xpFor(level) {
    return G.Stats.xpToNext(level);
  }

  cy() { return this.y; }

  // ---------------- stats efectivos ----------------
  get atk() { return this.baseAtk * this.atkMul * G.Stages.mul(this, 'atk'); }
  // Multiplier layer that used to be folded into the flat pl.atk (upgrades), now passed into the A/D attacker
  // factor so the ratio stays proportional. The Attack / Sp. Atk STAGE is applied per move category in moveFactor.
  get atkMulAll() { return this.atkMul; }
  // Attacker half of the damage formula for move `m` (see G.Stats.attackFactor). The
  // defender half completes at impact (combat.js hit()/resolve()) against the enemy's Def/SpD.
  moveFactor(m) {
    const c = G.Stats.moveCat(m);
    const si = c === 'special' ? this.incOf('spa') : c === 'status' ? 0 : this.incOf('atk');     // Protein / Calcium
    const stg = c === 'special' ? G.Stages.mul(this, 'spa') : c === 'status' ? 1 : G.Stages.mul(this, 'atk');     // stage raises and drops (slice E2a)
    return G.Stats.attackFactor(this.baseAtkStat, this.baseSpAStat, this.level, m, this.atkMulAll * (1 + si) * stg);
  }
  /** Max HP at `level`: mainline HP x (1 + HP Up percentages) + flat perks. */
  maxHpAt(level) { return Math.round(G.Stats.hpForLevel(this.baseHpStat, level) * (1 + this.incOf('hp'))) + this.perksHp; }
  /** Stat bonus fraction: the stat cards plus the gym badge boosts. */
  incOf(k) { return this.inc[k] + this.badge[k]; }
  /** A gym badge's run-long boost: +pct on a stat (hp, atk, def, spa, spd, spe). Applies like the matching stat card. */
  addBadgeBoost(stat, pct) {
    if (!(stat in this.badge)) return false;
    this.badge[stat] += pct;
    if (stat === 'hp' && this.baseHpStat != null) {
      const newMax = this.maxHpAt(this.level), gain = newMax - this.maxHp;
      this.maxHp = newMax;
      if (gain > 0 && !this.dead) this.hp += gain;
    }
    return true;
  }
  /** Take one stat card (HP Up, Protein, Iron, Calcium, Zinc, Carbos). */
  addStat(id) {
    const st = G.Mechanics.STAT_BY[id];
    if (!st || !(id in this.inc)) return false;
    this.inc[id] += st.step;
    if (id === 'hp' && this.baseHpStat != null) {
      const newMax = this.maxHpAt(this.level), gain = newMax - this.maxHp;
      this.maxHp = newMax;
      if (gain > 0 && !this.dead) this.hp += gain;       // tops up like a level-up; a fainted mon is not revived
    }
    return true;
  }
  // STAB flag: the move's type matches one of the active mon's species types.
  stabFor(m) { return this.myTypes.includes(m.type); }
  get spd() {
    const s = this.baseSpd * this.spdMul * (1 + this.incOf('spe')) * (this.slowT > 0 ? 0.5 : 1);
    const w = G.Weather.speedFor(this.mon.types);
    const slow = this.inLiquid ? G.World.liquidEffect(this.mon.types).slow || 1 : 1;
    return s * slow * w * G.Status.speedMul(this) * G.Stages.speedMul(this);
  }
  get reduction() { return Math.min(0.8, this.dmgReduce); }
  get regen() { return this.regenFlat + G.Stages.teamSum(this.stgTeam, 'regen'); }

  // ---------------- movimientos ----------------
  addMove(id) {
    if (this.slots.length >= this.maxMoves || this.hasMove(id)) return false;
    const m = G.Moves.instance(id, 1);
    this.moves.push(m);
    const group = [m];
    this.slots.push(group);
    this.arrange();
    // It switches to the new one, unless you are using a link (it does not take the group off you).
    if (!(this.slots[this.active] && this.slots[this.active].length > 1)) this.setActive(this.slots.indexOf(group), true);
    return true;
  }

  /**
   * Fixed slots (Upgrades -> Shortcuts): each move with a chosen slot is placed
   * on that number for muscle memory (Confusion always on 1...).
   * Until you have that many moves, it goes to the nearest one; the rest
   * fill the free slots in the order you learned them.
   */
  arrange() {
    const n = this.slots.length;
    if (n < 2 || !this.bind) return;
    const want = g => { let k = Infinity; for (const m of g) if (this.bind[m.id] != null) k = Math.min(k, this.bind[m.id]); return k; };
    const cur = this.slots[this.active];
    const out = new Array(n).fill(null);
    const bound = this.slots.filter(g => want(g) < Infinity).sort((a, b) => want(a) - want(b));
    for (const g of bound) {
      let p = Math.min(want(g), n - 1);
      while (p >= 0 && out[p]) p--;                          // ocupado: el de antes
      if (p < 0) { p = 0; while (out[p]) p++; }              // o el primero libre
      out[p] = g;
    }
    for (const g of this.slots) if (!out.includes(g)) out[out.indexOf(null)] = g;
    this.slots = out;
    if (cur) this.active = out.indexOf(cur);
  }

  hasMove(id) { return this.moves.some(m => m.id === id); }

  /** Minimum time (s) you stay on a slot after switching to it by hand. The new move fires at once if it is
   *  ready; this only stops instant back-and-forth swapping. Every move keeps its own cooldown (Combat.tick),
   *  so it is a feel limit, not a throughput limit. */
  static get SWAP_LOCK() { return 0.4; }

  /** @param free  true for switches the game makes itself (learning a move, run start): never blocked, no hold. */
  setActive(i, free = false) {
    if (i < 0 || i >= this.slots.length || i === this.active) return;
    if (!free && this.swapT > 0) return;           // still holding the slot you just switched to
    // Choice Band: you cannot switch moves.
    if (this.hasItem('choiceband') && this.slots[this.active]) {
      G.FX.dmgText(this.x, this.y - this.bodyH - 8, 'Cinta Elección', '#ff8ad8');
      return;
    }
    this.active = i;
    G.Projectiles.clearOrbs(this);
    G.Audio.sfx('select');
    if (!free) this.swapT = Player.SWAP_LOCK;
    const m = this.slots[i][0];
    G.FX.ring(this.x, this.y - G.LIFT * 0.5, 6, this.r * 3.4, G.U.TYPE_COLOR[m.type], 0.3, 3);
  }

  cycle(dir) {
    if (!this.slots.length) return;
    this.setActive((this.active + dir + this.slots.length) % this.slots.length);
  }

  // ---------------- links (fusions) ----------------
  // Each legendary beaten gives a link. With it, moves are combined into a
  // single slot and fired at once. Only one group grows (up to BOND_MAX); if
  // none is in progress, the link joins two loose moves.
  static get BOND_MAX() { return 4; }

  /** What a link can do now: add to a group or join two loose ones. */
  bondOptions() {
    const loose = this.slots.filter(s => s.length === 1).map(s => s[0]);
    const grow = this.slots.find(s => s.length > 1 && s.length < Player.BOND_MAX);
    if (grow) return loose.length ? { mode: 'add', group: grow, loose } : null;
    return loose.length >= 2 ? { mode: 'pair', group: null, loose } : null;
  }

  /** Combines `moves` (loose) into the group `group` (or a new one) and spends a link. */
  fuse(moves, group = null) {
    const target = group || this.slots.find(s => s[0] === moves[0]);
    const cur = this.slots[this.active];
    for (const m of moves) {
      if (target.includes(m)) continue;
      const i = this.slots.findIndex(s => s.length === 1 && s[0] === m);
      if (i < 0) continue;
      this.slots.splice(i, 1);
      target.push(m);
    }
    this.arrange();
    // It switches to the group, except with the Choice Band (you stay on the slot you had, if it remains).
    const a = this.slots.indexOf(cur);
    this.active = this.hasItem('choiceband') && a >= 0 ? a : this.slots.indexOf(target);
    this.bonds = Math.max(0, this.bonds - 1);
    G.Projectiles.clearOrbs(this);
    return target;
  }

  /** Moves launched now (the group of the active slot). */
  activeGroup() { return this.slots[this.active] || []; }

  activeMove() { return this.activeGroup()[0]; }

  /**
   * Called by combat.js when launching a move. It picks the PMD animation and
   * speeds it up if the cooldown is shorter than the animation, so it chains.
   */
  cast(m) {
    // Life Orb: each attack costs a little health (it never leaves you KO).
    if (this.hasItem('lifeorb') && m.kind !== 'orbit' && m.kind !== 'trail' && !this.remote) {
      this.hp = Math.max(1, this.hp - Math.max(1, this.maxHp * 0.01));
    }
    const anim = { melee: 'Attack', beam: 'Shoot', projectile: 'Shoot', nova: 'Attack',
                   aura: 'Charge', buff: 'Charge', orbit: 'Charge', boomerang: 'Shoot', chain: 'Shoot',
                   mine: 'Charge', meteor: 'Charge', turret: 'Charge', dash: 'Attack', trail: 'Walk', cone: 'Shoot' }[m.kind] || 'Attack';
    // The new families sound like the similar one of the usual ones.
    const SND = { boomerang: 'projectile', chain: 'beam', mine: 'nova', meteor: 'nova', turret: 'buff', dash: 'melee', trail: 'aura', cone: 'projectile' };
    // The trail does not play a sound at each puddle (it would be a constant buzz).
    if (m.kind !== 'trail') G.Audio.sfx('shot', { kind: SND[m.kind] || m.kind, type: m.type });
    if (m.kind === 'trail') return;
    // Do not restart an animation that is halfway through: it would look choppy.
    if (this.anim.busy() && this.anim.progress() < 0.65) return;
    const meta = G.Sprites.animMeta(this.dex, anim);
    const len = meta ? meta.d.reduce((a, b) => a + b, 0) / 60 : 0.4;
    const cd = Math.max(0.12, m.cd * this.cdMul);
    this.anim.play(anim, { speed: Math.max(1, len / (cd * 0.9)) });
    this.attackFace = 0.35;
  }

  // ---------------- damage and healing ----------------
  /** Damage over time from G.Status (burn, poison, trap): a share of max HP, not reduced by defense, and it ignores the post-hit invulnerability. */
  /**
   * An enemy Status-class carrier's shot or touch lands (slice E1). `half` = a secondary carrier: half the duration.
   * slow = a Speed -1 stage (never below -2 from this source); sleep rolls CARRIER.sleepBase, x1.5 while drowsy.
   */
  inflict(kind, half = false) {
    const C = G.Enemies.CARRIER, dm = half ? C.secHalf : 1;
    switch (kind) {
      case 'slow': if (G.Stages.stage(this, 'spe') > -2) G.Stages.add(this, 'spe', -1, C.dur.slow * dm); break;
      case 'poison': G.Status.applyDot(this, 'poison', 1, dm); break;
      case 'sleep':
        if (Math.random() < G.Status.sleepChance(this, C.sleepBase)) G.Status.apply(this, 'sleep', 1, dm);
        else G.FX.dmgText(this.x, this.y - this.bodyH - 4, 'Resisted', '#a3abb8');
        break;
      default: G.Status.apply(this, kind, 1, dm);          // paralysis, freeze, confusion, daze, drowsy, trap: the CONTROL table's durations
    }
  }

  statusDot(kind, amount, color) {
    if (this.dead) return;
    const inv = this.invuln;
    this.invuln = 0;
    this.hurt(amount, null, true);
    if (!this.dead) this.invuln = inv;
  }

  /**
   * @param type  attack type (type chart and weather); with no type, damage as-is
   * @param pure  damage not reduced by defense or melee (Arceus)
   */
  hurt(amount, type = null, pure = false, atk = null, who = null) {
    if (this.invuln > 0 || this.dead) {
      if (G.Log.on && !this.dead) G.Log.block(who, atk ? atk.factor : amount, this.invuln);
      return;
    }
    const LOG = G.Log.on, hp0 = this.hp;
    let neutral = amount, dStat = 0, cat = -1;
    // Enemy attack (sub-slice C): `amount` is the enemy attacker FACTOR; convert to raw
    // damage via this player's base Def/SpD matching the attack category. Non-enemy damage
    // (atk == null: terrain, lava, altar, judgment, DoT) keeps `amount` as-is.
    if (atk && !pure) {
      const st = this.mon.stats, mul = atk.mul || 1;     // mul: weak support / flanker strike, on the final damage
      const defB = st ? st[2] : 50, spdB = st ? st[4] : 50;
      const defMul = (1 + (atk.cat === 'special' ? this.incOf('spd') : this.incOf('def'))) * G.Stages.mul(this, atk.cat === 'special' ? 'spd' : 'def');     // Iron / Zinc, then the Def / Sp. Def stage (slice E2a)
      if (LOG) {
        neutral = (atk.factor / 50 + 2) * G.Stats.ENEMY_DMG_SCALAR * mul;
        cat = atk.cat === 'special' ? 1 : 0;
        dStat = (cat === 1 ? G.Stats.spDef(spdB, this.level) : G.Stats.defense(defB, this.level)) * defMul;
      }
      amount = G.Stats.applyPlayerDefense(amount, defB, spdB, atk.cat, this.level, defMul) * mul;
    }
    const afterDef = amount;
    let eff = null, tk = 1, wk = 1;
    if (type) {
      tk = G.Types.mult(type, this.mon.types);
      wk = G.Weather.mult(type);
      eff = G.Types.label(tk);
      amount *= tk * wk;
    }
    // With a melee attack active you take 25% less: you have to
    // be on top of the enemies to hit (they lagged far behind).
    const close = this.activeGroup().some(m => m.kind === 'melee') ? 0.75 : 1;
    const raw = pure ? amount : amount * (1 - this.reduction) * close;
    const d = Math.max(1, raw);
    this.hp -= d;
    if (LOG) G.Log.hitIn(who, type, cat, neutral, dStat, afterDef, tk, wk, pure ? 0 : this.reduction, pure ? 1 : close, d,
                         hp0, Math.max(0, this.hp), (d > raw ? 1 : 0) | (pure ? 4 : 0), this.spd);
    this.invuln = 0.45;
    this.flash = 0.14;
    G.Audio.sfx('hurt');
    G.Camera.kick(0.28);
    G.FX.dmgText(this.x, this.y - this.bodyH - 4, '-' + Math.round(d), eff === 'super' ? '#ff3048' : eff === 'weak' ? '#c9a0a8' : '#ff6b7a', eff === 'super');
    G.FX.burst(this.x, this.y - this.bodyH * 0.5, '#ff5f6d', 6, 90);
    // Focus Band: survives the hit with 1 health (once every 60 s).
    if (this.hp <= 0 && this.hasItem('focussash') && performance.now() - this.sashT > 60000) {
      this.sashT = performance.now();
      this.hp = 1; this.invuln = 1.2;
      if (LOG) G.Log.faint(true, 1);
      G.FX.dmgText(this.x, this.y - this.bodyH - 16, '¡Banda Focus!', '#ff9a3d', true);
      G.FX.ring(this.x, this.y, 6, 70, '#ff9a3d', 0.5, 4);
    }
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      if (LOG) G.Log.faint(false, 0);
      this.anim.play('Faint', { hold: true });
      G.Projectiles.clearOrbs(this);
      this.reviveT = 0;
    }
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const got = Math.round(this.hp - before);
    if (G.Log.on) G.Log.heal(amount, this.hp - before, this.hp, this.maxHp);
    if (got >= 1) G.FX.dmgText(this.x, this.y - this.bodyH - 6, '+' + got, '#5fe08a');
  }

  addMaxHp(amount) { this.maxHp += amount; this.hp += amount; }

  /** Returns how many levels it gained (there can be several at once). */
  gainXp(amount) {
    this.xp += amount * this.xpMul;
    let leveled = 0;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Player.xpFor(this.level);
      leveled++;
    }
    // HP scales with run level (mainline formula). Leveling tops up current HP by the
    // max-HP gain (Option A), so a level-up gives a little relief, not just a bigger bar.
    if (leveled && this.baseHpStat != null) {
      const newMax = this.maxHpAt(this.level);
      const gain = newMax - this.maxHp;
      if (gain > 0) { this.maxHp = newMax; this.hp += gain; }
    }
    return leveled;
  }

  /** Bring a benched teammate up to the shared run level: recompute maxHp for the
   *  new level, preserving current-hp fraction (so swapping is neither a free heal
   *  nor a penalty). The ACTIVE fighter uses gainXp instead. */
  syncLevel(level) {
    if (this.baseHpStat == null || level <= this.level) { this.level = level; this.xpNext = Player.xpFor(level); return; }
    const frac = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.level = level;
    this.xpNext = Player.xpFor(level);
    this.maxHp = this.maxHpAt(level);
    this.hp = Math.round(this.maxHp * frac);
  }

  // ---------------- objeto equipado ----------------
  hasItem(id) { return this.item === id; }

  /** Equips an item (and removes whatever was carried). */
  equip(id) {
    if (this.item) G.Items.BY[this.item].off(this);
    this.item = id;
    if (id) G.Items.BY[id].on(this);
  }

  /** Shell Bell: a little health for the damage you do (cap 4/s). */
  onDealt(dmg) {
    if (this.item === 'shellbell') this.bellHeal = Math.min(4, this.bellHeal + dmg * 0.04);
  }

  /** An altar's power (see systems/interact.js): it applies and removes itself. */
  addPower(def, dur) {
    if (this.power) this.power.def.off(this);
    def.on(this);
    this.power = { def, t: dur, dur };
  }

  /** A buff move's cast (slice E2a): one team application of `n` stages on `stat` (or `n` HP/s of regen), lasting `dur` s. Returns true when the effective stage changed. */
  addTeamStage(stat, n, dur, src) {
    const before = stat === 'regen' ? 0 : G.Stages.stage(this, stat);
    G.Stages.teamAdd(this.stgTeam, stat, n, dur, src);
    if (stat === 'regen') return true;
    return G.Stages.stage(this, stat) !== before;
  }

  // ---------------- ciclo ----------------
  update(dt) {
    this.anim.update(dt);
    if (this.dead) return;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.attackFace > 0) this.attackFace -= dt;

    G.Stages.teamTick(this.stgTeam, dt);       // the shared team raises: only the active member runs update(), so they tick exactly once per frame
    if (this.slowT > 0) this.slowT -= dt;
    G.Status.tick(this, dt);
    G.Stages.tick(this, dt);
    if (this.dead) return;
    if (this.bellHeal > 0) { const h = Math.min(this.bellHeal, 4 * dt); this.hp = Math.min(this.maxHp, this.hp + h); this.bellHeal -= h; }
    if (this.power && (this.power.t -= dt) <= 0) { this.power.def.off(this); this.power = null; }
    if (this.regen > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);

    // --- movement with collisions ---
    // (In co-op pausing does not stop the game: you just stay still.)
    let [ax, ay] = this.frozen || G.Status.stunned(this) ? [0, 0] : G.Input.axis();     // frozen or asleep: you cannot move
    if (this.stCnf && (ax || ay)) {                                                    // confused: your heading drifts (half weight)
      const m = Math.hypot(ax, ay), w = G.Status.wander(this, ax / m, ay / m, 0.5);
      ax = w[0] * m; ay = w[1] * m;
    }
    if (this.stDaze && (ax || ay)) {                                                   // dazed: the heading is jittered (slice E1)
      const m = Math.hypot(ax, ay), j = G.Status.jitter(this, ax / m, ay / m);
      ax = j[0] * m; ay = j[1] * m;
    }
    this.walking = ax !== 0 || ay !== 0;
    const s = this.spd;
    // Ice: you slide (the velocity changes slowly).
    const slide = this.inLiquid && G.World.liquidEffect(this.mon.types).slide;
    this.svx = slide ? G.U.damp(this.svx || 0, ax * s * 1.15, 1.6, dt) : ax * s;
    this.svy = slide ? G.U.damp(this.svy || 0, ay * s * 1.15, 1.6, dt) : ay * s;
    this.x += this.svx * dt;
    this.y += this.svy * dt;
    G.World.collide(this);
    if (this.walking) this.moveAngle = Math.atan2(ay, ax);

    // --- liquid terrain ---
    this.inLiquid = G.World.isLiquid(this.x, this.y);
    if (this.inLiquid) {
      const le = G.World.liquidEffect(this.mon.types);
      if (le.dmg) {
        this.lavaTick -= dt;
        if (this.lavaTick <= 0) {
          this.lavaTick = le.every; this.invuln = 0;
          this.hurt(Math.max(le.flat, this.maxHp * le.dmg * 0.5));
          G.FX.burst(this.x, this.y - 4, le.color, 5, 70);
        }
      } else if (this.walking && Math.random() < dt * 8) {
        G.FX.burst(this.x, this.y, le.slide ? '#ffffff' : '#b3defa', 2, 40);
      }
    }

    // --- targeting: nearest enemy; if none, toward where you walk ---
    // Target priority based on the active attack:
    //   ranged (projectile, beam): the boss if in range > what is touching you > the nearest
    //   melee and the rest:           what is touching you > the boss > the nearest
    // With a horde on top something is almost always touching you; if that always won,
    // ranged attacks would never hit the boss.
    // With no enemies, it targets the nearest rock or chest.
    const all = G.EnemyMgr.all();
    const m = this.activeMove();
    const ranged = !!m && (m.kind === 'projectile' || m.kind === 'beam');
    const threat = G.Projectiles.nearest(all, this.x, this.y, this.r + 24);
    const boss = all.find(e => e.boss && !e.dead && G.U.dist(this.x, this.y, e.x, e.y) < 330);
    const tg = (ranged ? boss || threat : threat || boss)
            || G.Projectiles.nearest(all, this.x, this.y, 520)
            || G.World.nearestBreakable(this.x, this.y, 200);
    this.target = tg;
    if (tg) this.aim = Math.atan2(tg.y - this.y, tg.x - this.x);
    else if (this.walking) this.aim = this.moveAngle;

    // --- animation: look at the target when attacking, otherwise where it walks ---
    const face = this.attackFace > 0 || !this.walking ? this.aim : this.moveAngle;
    this.anim.dir = G.Sprites.dirFromAngle(face);
    this.anim.loop(this.walking ? 'Walk' : 'Idle', this.walking ? s / 110 : 1);
  }

  /** Gets back up (revived by a teammate in co-op). */
  revive(frac = 0.5) {
    this.dead = false;
    this.hp = Math.max(1, this.maxHp * frac);
    this.invuln = 2;
    this.reviveT = 0;
    this.anim._start('Idle', false);
    G.FX.ring(this.x, this.y, 6, 70, '#5fe08a', 0.5, 4);
    G.FX.burst(this.x, this.y - this.bodyH * 0.5, '#9dffb8', 18, 150);
    G.Audio.sfx('heal');
  }

  // ---------------- companion (co-op) ----------------

  /**
   * A teammate on another computer: their owner sends their state (position, health,
   * active move...) and it is followed smoothly here.
   * n = { x, y, ang, walk, hp, maxHp, dead, mv, ml, mag, aim, rev }
   */
  netUpdate(dt) {
    this.anim.update(dt);
    const n = this.net;
    if (!n) return;
    if (this.flash > 0) this.flash -= dt;
    if (this.attackFace > 0) this.attackFace -= dt;
    if (G.U.dist2(this.x, this.y, n.x, n.y) > 300 * 300) { this.x = n.x; this.y = n.y; }
    else { this.x = G.U.damp(this.x, n.x, 14, dt); this.y = G.U.damp(this.y, n.y, 14, dt); }
    if (n.hp < this.hp - 0.5 && !n.dead) this.flash = 0.14;
    this.hp = n.hp; this.maxHp = n.maxHp;
    this.magnet = n.mag || this.magnet;
    this.reviveT = n.rev || 0;
    if (n.dead && !this.dead) { this.dead = true; this.anim.play('Faint', { hold: true }); G.Projectiles.clearOrbs(this); }
    else if (!n.dead && this.dead) this.revive(n.hp / (n.maxHp || 1));
    // Active move (for the halo, the HUD and the orbs).
    if (n.mv && (!this.moves[0] || this.moves[0].id !== n.mv) && G.Moves.BY_ID[n.mv]) {
      this.moves = [G.Moves.instance(n.mv)];
      this.slots = [this.moves.slice()];
      this.active = 0;
      G.Projectiles.clearOrbs(this);
    }
    if (this.dead) return;
    this.walking = !!n.walk;
    this.moveAngle = n.ang;
    this.aim = n.aim;
    const face = this.attackFace > 0 || !this.walking ? this.aim : this.moveAngle;
    this.anim.dir = G.Sprites.dirFromAngle(face);
    this.anim.loop(this.walking ? 'Walk' : 'Idle', this.walking ? this.baseSpd / 110 : 1);
  }

  draw(ctx) {
    // Halo of the active move's type, on the ground.
    const m = this.activeMove();
    if (m && !this.dead) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = G.U.TYPE_COLOR[m.type];
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.5, this.r * 0.6, 0, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }
    G.Sprites.drawShadow(ctx, this.dex, this.x, this.y);
    // Altar power: a ring of its color pulsing under the feet.
    if (this.power && !this.dead) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 120) * 0.15;
      ctx.strokeStyle = this.power.def.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 2.1, this.r * 0.85, 0, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }

    const alpha = this.invuln > 0 && !this.dead ? (Math.floor(this.invuln * 18) % 2 ? 0.45 : 1) : 1;
    this.anim.draw(ctx, this.x, this.y, Object.assign({ flash: this.flash > 0, softFlash: true, alpha, color: '#ffcb3d' }, G.Status.tintOf(this)));

    // Buff arcs around the feet.
    const COL = { atk: '#ff6b4d', spe: '#7fe0ff', def: '#b0b8c8', regen: '#5fe08a', spa: '#b99dff', spd: '#6ea4ff' };
    let i = 0;
    for (const k in this.stgTeam) {
      const L = this.stgTeam[k];
      if (!L.length) continue;
      const frac = k === 'regen' ? Math.min(1, L.length / 4) : Math.min(1, G.Stages.teamSum(this.stgTeam, k) / 6);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = COL[k];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r * 1.8 + i * 5, (this.r * 1.8 + i * 5) * 0.42, 0, 0, 6.2832 * frac);
      ctx.stroke();
      ctx.restore();
      i++;
    }

    // Statuses (slice E1): a coloured ring under the feet for the most restrictive one, and a floating zzz while drowsy or asleep.
    if (!this.dead) {
      const S = G.Status, cs = this.stMajor ? S.CONTROL[this.stMajor.k] : this.stCnf ? S.CONTROL.confusion : this.stDaze ? S.CONTROL.daze
              : this.stTrap ? S.CONTROL.trap : this.stDrow ? S.CONTROL.drowsy : null;
      if (cs) {
        ctx.save();
        ctx.globalAlpha = 0.55; ctx.strokeStyle = cs.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.35, this.r * 0.55, 0, 0, 6.2832); ctx.stroke();
        ctx.restore();
      }
      if (this.stDrow || (this.stMajor && this.stMajor.k === 'sleep')) {
        const t = performance.now() / 1000;
        ctx.save();
        ctx.font = '800 9px Pixelify,"Segoe UI",sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#cfc6ff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.7 + i / 3) % 1;                      // three letters rising and fading in turn
          ctx.globalAlpha = Math.sin(ph * Math.PI);
          const zx = this.x + 8 + ph * 8, zy = this.y - this.bodyH - 4 - ph * 16;
          ctx.strokeText('z', zx, zy); ctx.fillText('z', zx, zy);
        }
        ctx.restore();
      }
    }

    // Status icons above the head (slice E1): a small 3-letter pill per status with a thin timer bar. Drowsy has its zzz instead.
    if (!this.dead) {
      const L = G.Status.list(this).filter(x => x.k !== 'drowsy');
      const mx = this._stMax || (this._stMax = {});
      for (const k in mx) if (!L.some(x => x.k === k)) delete mx[k];
      if (L.length) {
        const TAG = { burn: 'BRN', poison: 'PSN', toxic: 'TOX', paralysis: 'PAR', sleep: 'SLP', freeze: 'FRZ', confusion: 'CNF', daze: 'DZE', trap: 'TRP', slow: 'SLW' };
        ctx.save();
        ctx.font = '800 7px Pixelify,"Segoe UI",sans-serif'; ctx.textAlign = 'center';
        const gap = 2, h = 9, ws = L.map(x => Math.ceil(ctx.measureText(TAG[x.k] || x.k.slice(0, 3).toUpperCase()).width) + 6);
        let x = this.x - (ws.reduce((a, b) => a + b, 0) + gap * (L.length - 1)) / 2;
        const y = this.y - this.bodyH - (this.tag ? 24 : 14);
        L.forEach((st, i) => {
          if (st.t != null) mx[st.k] = Math.max(mx[st.k] || 0, st.t);
          ctx.fillStyle = 'rgba(20,0,6,.82)'; ctx.beginPath(); ctx.roundRect(x, y, ws[i], h, 3); ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = st.color; ctx.stroke();
          ctx.fillStyle = st.color; ctx.fillText(TAG[st.k] || st.k.slice(0, 3).toUpperCase(), x + ws[i] / 2, y + 7);
          if (st.t != null && mx[st.k] > 0) { ctx.fillRect(x + 1, y + h + 1, (ws[i] - 2) * Math.max(0, Math.min(1, st.t / mx[st.k])), 1.5); }
          x += ws[i] + gap;
        });
        ctx.restore();
      }
    }

    // Co-op: a "reviving" ring and the name above.
    if (this.dead && this.reviveT > 0) {
      ctx.save();
      ctx.strokeStyle = '#5fe08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r * 2.4, this.r * 1.0, 0, -Math.PI / 2, -Math.PI / 2 + 6.2832 * Math.min(1, this.reviveT / G.Player.REVIVE_TIME));
      ctx.stroke();
      ctx.restore();
    }
    if (this.tag) {
      ctx.save();
      ctx.font = '700 7px Pixelify,"Segoe UI",sans-serif';
      ctx.textAlign = 'center';
      const y = this.y - this.bodyH - 8;
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(this.tag, this.x, y);
      ctx.fillStyle = this.dead ? '#ff8a96' : this.tagColor || '#fff';
      ctx.fillText(this.tag, this.x, y);
      if (this.dead) {
        ctx.font = '700 6px Pixelify,"Segoe UI",sans-serif';
        ctx.strokeText(this.revLabel || '', this.x, y - 8);
        ctx.fillText(this.revLabel || '', this.x, y - 8);
      }
      ctx.restore();
    }
  }
};
