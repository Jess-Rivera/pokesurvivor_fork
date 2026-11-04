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
   * @param statProf the team copy's IVs and nature (G.Stats.profile, pokebox step 4); none plays neutral
   */
  constructor(mon, perks = {}, shiny = false, statProf = null) {
    this.mon = mon;
    this.dex = mon.dex;
    this.shiny = shiny && G.Sprites.hasShiny(mon.dex);
    this.anim = new G.Sprites.Animator(mon.dex, 1, this.shiny);
    this.x = 0;
    this.y = 0;
    this.r = G.Sprites.bodyRadius(mon.dex);
    this.bodyH = G.Sprites.bodyHeight(mon.dex);

    this.atkMul = perks.atkMul || 1;
    this.physMul = 1; // held items that boost one damage category (G.Stats.itemCatMul)
    this.specMul = 1;
    this.defItemMul = 1; // held items that raise Def and Sp. Def (Eviolite, Metal Powder), read in hurt()
    this.spdMul = perks.spdMul || 1;
    this.cdMul = perks.cdMul || 1;
    this.dmgReduce = perks.dmgReduce || 0;
    this.moveRadiusMul = 1; // Wide Lens / Zoom Lens: scales move radius + arc for this holder (F3b lens slice)
    this.typeBoost = null; // type-damage held items (Charcoal, Mystic Water, ...): +20% to moves of this type (F3b)
    // ---- F3c run-item flags (team-wide; set by equipRun on/off). Effects read in get spd / G.Combat / typeK. ----
    this.sharpScissors = false; // team-HP-scaled speed (needs roster 3+)
    this.brassKnuckles = false; // team-HP-scaled damage (needs roster 3+)
    this.snowball = false; // damage scales with total HP of enemies killed this run
    this.redo = false; // once-per-run full-team revive on final death
    this.pikaTear = false; // +1.1x damage & speed per fainted teammate
    this.stoneType = null; // Power Stone: this type's moves ignore resistance + immunity (typeK)
    this.regenFlat = perks.regen || 0;
    this.magnet = 120 * (perks.magnetMul || 1); // pull radius for XP orbs, the permanent upgrade scales it
    this.itemMagnet = 78; // pull radius for every other pickup (coins, berries, items, tickets, magnet, bomb), fixed
    this.xpMul = perks.xpMul || 1;
    this.coinMul = perks.coinMul || 1;

    // Mainline-scaled HP from the real base HP stat (stats[0]); grows with run level.
    // perks.hp (flat HP upgrades) still adds on top. IVs and nature from the copy (statProf, pokebox step 4); EVs 0 until step 5.
    this.perksHp = perks.hp || 0;
    this.statProf = statProf || G.Stats.NEUTRAL_PROFILE;
    // Stat cards (upgrade rework slice 2c): sum of increased percentages per stat, absent = 0.
    this.inc = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    this.badge = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }; // run-long gym badge boosts (systems/gym.js), kept apart from the stat cards
    this.baseHpStat = mon.stats && mon.stats[0] != null ? mon.stats[0] : null;
    this.maxHp =
      (this.baseHpStat != null ? G.Stats.hpForLevel(this.baseHpStat, 1, this.statIv(0)) : mon.hp) + this.perksHp;
    this.hp = this.maxHp;
    // Movement from the real base Speed stat (stats[5]) via the identity model;
    // fall back to the old pre-derived mon.spd if stats are somehow absent.
    this.baseSpd =
      mon.stats && mon.stats[5] != null ? G.Stats.speedToPx(mon.stats[5], this.statIv(5), this.statNat(5)) : mon.spd;
    this.baseAtk = mon.atk;
    // Real base Atk/SpA (stats[1]/stats[3]) for the A/D damage model; scale with run level
    // via G.Stats. Fallback 50 keeps a mon with no stats array working.
    this.baseAtkStat = mon.stats && mon.stats[1] != null ? mon.stats[1] : 50;
    this.baseSpAStat = mon.stats && mon.stats[3] != null ? mon.stats[3] : 50;
    this.myTypes = mon.types || [];

    this.moves = []; // todos los movimientos aprendidos
    this.slots = []; // huecos: cada uno, una lista de movimientos que se lanzan a la vez
    this.active = 0; // hueco activo
    this.swapT = 0; // hold left (s) before you may swap slots again
    this.maxMoves = 4; // huecos
    this.bonds = 0; // links to use (reward from gym wins)

    // Team stage raises (slice E2a): the live applications of Swords Dance, Agility, Harden, Dragon Dance and Aqua Ring's regen. game.js
    // points every roster member at ONE shared object, so a raise cast by a teammate stays on whoever is on the field until it runs out.
    // { stat: [{ n, t, dur, src }] } with stat in atk, def, spa, spd, spe, regen. Timed keys from berries (data/ground-items.js); move raises are team trackers (G.Stages).
    this.stgTeam = {};

    this.level = 1;
    this.xp = 0;
    this.xpNext = Player.xpFor(1);
    this.kills = 0;
    this.bosses = 0;
    this.rerolls = 0; // veces que ha cambiado las cartas de nivel en esta run
    this.rerollBonus = perks.rerolls || 0; // rerolls bought in Upgrades (plus the free one)
    this.critChance = perks.crit || 0; // critical hit chance (Upgrades)
    this.critDmgMul = 1; // on top of the base crit multiplier (Leek)
    this.banned = new Set(); // movimientos vetados (Mejoras → Veto): no salen en las cartas
    this.bind = {}; // movimiento -> hueco fijo (0-3), elegido en Mejoras
    this.coins = 0; // monedas recogidas en esta run
    this.t1 = 0;
    this.t10 = 0; // tickets del gacha recogidos en esta run
    this.dmgDealt = 0;

    this.invuln = 0;
    this.flyT = 0; // Fly (Jess 2026-11-02): seconds of flight left; while above 0 terrain, contact, shots and your own casts are off
    this.flyCd = 0; // seconds until Fly can be pressed again, counted from landing
    this.dodges = { cd: [0, 0], gap: 0 }; // dodge charge cooldowns and the gap after a dodge; game.js shares ONE object across the roster
    this.dodgeT = 0; // seconds left of the dodge in progress
    this.dodgeEl = 0; // seconds since it started
    this.dodgeVx = 0;
    this.dodgeVy = 0;
    this.dodgeR0 = 0; // the body radius to restore after the shrink (0 = not shrunk)
    this.iceGlide = false; // a dodge ended on ice: dodge speed is kept until you leave the ice
    this.flash = 0;
    this.aim = Math.PI / 2;
    this.moveAngle = Math.PI / 2;
    this.walking = false;
    this.inLiquid = false;
    this.lavaTick = 0;
    this.attackFace = 0; // tiempo que sigue mirando al objetivo tras atacar
    this.dead = false;
    this.power = null; // poder de altar activo: { def, t, dur }
    this.slowT = 0; // pegado por una trampa
    this.shield = null; // move schema slice 4b (Substitute): { v, max, regen, t, dur, overflow, src }, set by G.MoveEffects, absorbed in hurt()
    this.mvRoot = false; // move schema slice 4b: a rooted commitment (G.MoveSim) holds move speed at 0
    // Statuses (slice C, G.Status): the player is a host like any enemy. stDot is the player's burn / poison / toxic.
    this.isPlayer = true;
    this.stMajor = null;
    this.stCnf = null;
    this.stTrap = null;
    this.stWin = null;
    this.stDot = null;
    this.stDaze = null;
    this.stDrow = null;
    this.shakeCd = 0;
    this.stg = null; // fixed-timer stat applications (carrier SLOW, commitment slow); move stages are trackers (h.trk)
    this.item = null; // held Pokemon-tier item id (data/items.js), one per Pokemon; works only while this one is active
    this.berries = []; // status-berry ids in the team berry bag: ONE array shared by the whole roster (game.js), never reassigned after the run starts
    this.runItems = []; // run-tier item ids (data/items.js): ONE array shared by the whole roster (game.js), never reassigned after the run starts
    this.sashT = -999; // last time the Focus Band saved you
    this.bellHeal = 0; // pending healing from the Shell Bell
  }

  /** Seconds you must stay next to a downed teammate to lift them. */
  static get REVIVE_TIME() {
    return 3;
  }

  /** Dodge (Space, Jess 2026-11-02): 150 px in 0.5 s along your heading, 2 charges with their own cooldown (paused while a dodge
   *  runs), 0.2 s between dodges. For the first 0.3 s the body circle is 20% of normal, so shots miss more and small gaps fit. */
  static get DODGE() {
    return { dist: 150, dur: 0.5, cd: 7, gap: 0.2, shrinkT: 0.3, shrink: 0.2, charges: 2 }; // TUNE (BALANCE.md "Dodge")
  }

  // Mainline Medium Fast cost curve (total n^3), see G.Stats.xpToNext. The old hand-made
  // curve was floor((8 + 6L + 1.6 L^1.75) * 4).
  static xpFor(level) {
    return G.Stats.xpToNext(level);
  }

  cy() {
    return this.y;
  }

  // ---------------- stats efectivos ----------------
  get atk() {
    return this.baseAtk * this.atkMul * G.Stages.mul(this, 'atk');
  }
  // Multiplier layer that used to be folded into the flat pl.atk (upgrades), now passed into the A/D attacker
  // factor so the ratio stays proportional. The Attack / Sp. Atk STAGE is applied per move category in moveFactor.
  get atkMulAll() {
    return this.atkMul;
  }
  // Attacker half of the damage formula for move `m` (see G.Stats.attackFactor). The
  // defender half completes at impact (combat.js hit()/resolve()) against the enemy's Def/SpD.
  moveFactor(m) {
    const c = G.Stats.moveCat(m);
    const si = c === 'special' ? this.incOf('spa') : c === 'status' ? 0 : this.incOf('atk'); // Protein / Calcium
    const stg = c === 'special' ? G.Stages.mul(this, 'spa') : c === 'status' ? 1 : G.Stages.mul(this, 'atk'); // stage raises and drops (slice E2a)
    return G.Stats.attackFactor(
      this.baseAtkStat,
      this.baseSpAStat,
      this.level,
      m,
      this.atkMulAll * G.Stats.itemCatMul(this, c) * (1 + si) * stg * this.runDmgMul(),
      this.statProf
    ); // run items (Brass Knuckles, Pikachu's Tear, Snowball); statProf: this copy's IVs and nature
  }
  /** Max HP at `level`: mainline HP x (1 + HP Up percentages) + flat perks. */
  maxHpAt(level) {
    const hp = G.Stats.hpForLevel(this.baseHpStat, level, this.statIv(0));
    return Math.round(hp * (1 + this.incOf('hp'))) + this.perksHp;
  }
  /** This copy's IV for stat i (HP, Atk, Def, SpA, SpD, Spe), 0 with no profile (pokebox step 4). */
  statIv(i) {
    return this.statProf ? this.statProf.iv[i] : 0;
  }
  /** This copy's nature multiplier for stat i: 1.1, 0.9 or 1. HP's is always 1. */
  statNat(i) {
    return this.statProf ? this.statProf.nat[i] : 1;
  }
  /** Stat bonus fraction: the stat cards plus the gym badge boosts, plus the team Vitamins card (slice 5b: a team read, so every member,
   *  bench and later ones included, has it). */
  incOf(k) {
    return (
      this.inc[k] +
      this.badge[k] +
      G.Stages.teamSum(this.stgTeam, 'pct_' + k) +
      (this.teamCards ? G.TeamCards.vit(this.teamCards, k) : 0)
    );
  } // + timed Kee / Maranga berries (pct_def, pct_spd)
  /** A gym badge's run-long boost: +pct on a stat (hp, atk, def, spa, spd, spe). Applies like the matching stat card. */
  addBadgeBoost(stat, pct) {
    if (!(stat in this.badge)) return false;
    this.badge[stat] += pct;
    if (stat === 'hp' && this.baseHpStat != null) {
      const newMax = this.maxHpAt(this.level),
        gain = newMax - this.maxHp;
      this.maxHp = newMax;
      if (gain > 0 && !this.dead) this.hp += gain;
    }
    return true;
  }
  /** Slice 5b: re-derive max HP after a team HP bonus (the HP Vitamin). Tops up the gain like a level-up. */
  refreshMaxHp() {
    if (this.baseHpStat == null) return;
    const newMax = this.maxHpAt(this.level),
      gain = newMax - this.maxHp;
    this.maxHp = newMax;
    if (gain > 0 && !this.dead) this.hp += gain; // never revives a fainted member
  }
  // STAB flag: the move's type matches one of the active mon's species types.
  stabFor(m) {
    return this.myTypes.includes(m.type);
  }
  get spd() {
    return this.mvRoot ? 0 : this.unrootedSpd;
  } // mvRoot: slice 4b rooted commitment or a live swept dash (G.MoveSim)
  /** The final move speed as if not rooted: a swept dash reads its speed here (move-sim.js speedOf). */
  get unrootedSpd() {
    const s = this.baseSpd * this.spdMul * (1 + this.incOf('spe')) * (this.slowT > 0 ? 0.5 : 1);
    const w = G.Weather.speedFor(this.mon.types);
    let slow = this.inLiquid ? G.World.liquidEffect(this.mon.types).slow || 1 : 1;
    // Surf (Jess 2026-11-02): in water or swamp, no slowdown and a small boost (Water types already swim unslowed)
    const surf = this.inLiquid && ['water', 'swamp'].includes(G.World.liquidKind()) && this.skillFx('surf');
    if (surf) slow = surf.speedMul;
    return s * slow * w * G.Status.speedMul(this) * G.Stages.speedMul(this) * this.runSpeedMul();
  }
  /** Run-item SPEED multipliers, applied last: Sharp Scissors (team-HP-scaled, roster 3+) and Pikachu's Tear (1.1x per fainted). */
  runSpeedMul() {
    let m = 1;
    if (this.sharpScissors) m *= G.Items.teamHpMul(this);
    if (this.pikaTear) m *= G.Items.faintMul(this);
    return m;
  }
  /** Run-item DAMAGE multiplier: Brass Knuckles (team-HP-scaled, roster 3+), Pikachu's Tear, Snowball Badge. Folded into moveFactor. */
  runDmgMul() {
    let m = 1;
    if (this.brassKnuckles) m *= G.Items.teamHpMul(this);
    if (this.pikaTear) m *= G.Items.faintMul(this);
    if (this.snowball) m *= G.Items.snowballMul();
    return m;
  }
  get reduction() {
    return Math.min(0.8, this.dmgReduce);
  }
  get regen() {
    return this.regenFlat + G.Stages.teamSum(this.stgTeam, 'regen');
  }

  // ---------------- movimientos ----------------
  addMove(id) {
    if (this.slots.length >= this.maxMoves || this.hasMove(id)) return false;
    const m = G.Moves.instance(id, 1);
    this.moves.push(m);
    const group = [m];
    this.slots.push(group);
    this.arrange();
    // It switches to the new one, unless you are using a link (it does not take the group off you).
    if (!(this.slots[this.active] && this.slots[this.active].length > 1))
      this.setActive(this.slots.indexOf(group), true);
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
    const want = (g) => {
      let k = Infinity;
      for (const m of g) if (this.bind[m.id] != null) k = Math.min(k, this.bind[m.id]);
      return k;
    };
    const cur = this.slots[this.active];
    const out = new Array(n).fill(null);
    const bound = this.slots.filter((g) => want(g) < Infinity).sort((a, b) => want(a) - want(b));
    for (const g of bound) {
      let p = Math.min(want(g), n - 1);
      while (p >= 0 && out[p]) p--; // ocupado: el de antes
      if (p < 0) {
        p = 0;
        while (out[p]) p++;
      } // o el primero libre
      out[p] = g;
    }
    for (const g of this.slots) if (!out.includes(g)) out[out.indexOf(null)] = g;
    this.slots = out;
    if (cur) this.active = out.indexOf(cur);
  }

  hasMove(id) {
    return this.moves.some((m) => m.id === id);
  }

  /** Minimum time (s) you stay on a slot after switching to it by hand. The new move fires at once if it is
   *  ready; this only stops instant back-and-forth swapping. Every move keeps its own cooldown (Combat.tick),
   *  so it is a feel limit, not a throughput limit. */
  static get SWAP_LOCK() {
    return 0.4;
  }

  /** @param free  true for switches the game makes itself (learning a move, run start): never blocked, no hold. */
  /** The movement skill in slot i ('surf', 'fly') or null. A skill never becomes the active slot (Jess 2026-11-02). */
  skillAt(i) {
    const g = this.slots[i];
    return g && g.length === 1 ? G.MoveEffects.skillOf(G.MoveDefs[g[0].id]) : null;
  }
  /** The numbers of skill k ('surf', 'fly') if a slot holds it, else null. */
  skillFx(k) {
    for (let i = 0; i < this.slots.length; i++)
      if (this.skillAt(i) === k) return G.MoveEffects.skillFx(G.MoveDefs[this.slots[i][0].id]);
    return null;
  }
  /** Fly: takes off for its duration, unless already up, cooling down, asleep, frozen or committed to a move. */
  takeOff() {
    const fx = this.skillFx('fly');
    if (!fx || this.dead || this.flyT > 0 || this.flyCd > 0 || G.Status.stunned(this) || this.mvRoot || this.frozen)
      return false;
    this.flyT = fx.duration;
    G.Audio.sfx('select');
    G.FX.ring(this.x, this.y - G.LIFT * 0.5, 6, this.r * 3.4, G.U.TYPE_COLOR.flying, 0.3, 3);
    return true;
  }
  /** Fly ends: where you come down decides (G.World.landing): a wall costs 1/16 max HP once and puts you on the nearest ground,
   *  a solid object moves you on along your heading; anything else works on you as usual from the next frame. */
  land() {
    const fx = this.skillFx('fly');
    this.flyT = 0;
    this.flyCd = fx ? fx.cooldown : 20;
    const L = G.World.landing(this.x, this.y, this.r, this.moveAngle);
    this.x = L.x;
    this.y = L.y;
    if (L.wall && !this.dead) this.payHp(this.maxHp / 16);
    G.World.collide(this);
    G.FX.burst(this.x, this.y, '#d8d0b8', 6, 60);
  }
  /** Dodge charges recharge on their own, but every timer waits while a dodge runs. */
  tickDodges(dt) {
    if (this.dodgeT > 0) return;
    const c = this.dodges;
    if (c.gap > 0) c.gap = Math.max(0, c.gap - dt);
    // Bright Powder: 15% shorter by ticking faster, since the charges are the team's and only the holder has the item on the field
    const dc = this.hasItem('brightpowder') ? dt / 0.85 : dt;
    for (let i = 0; i < c.cd.length; i++) if (c.cd[i] > 0) c.cd[i] = Math.max(0, c.cd[i] - dc);
  }
  /** Starts a dodge along (ax, ay), or your last heading when standing still. Needs a ready charge, the gap after the last dodge to
   *  be over, and nothing holding your movement (frozen, asleep, flinched, pushed, or a move's dash or root). */
  tryDodge(ax, ay) {
    const D = Player.DODGE,
      c = this.dodges,
      i = c.cd.indexOf(0);
    if (this.dead || this.dodgeT > 0 || c.gap > 0 || i < 0) return false;
    if (this.frozen || this.stFl || this.stPush || this.mvRoot || G.Status.stunned(this)) return false;
    const [nx, ny] = ax || ay ? G.U.norm(ax, ay) : [Math.cos(this.moveAngle), Math.sin(this.moveAngle)],
      v = D.dist / D.dur;
    c.cd[i] = D.cd;
    this.dodgeT = D.dur;
    this.dodgeEl = 0;
    this.dodgeVx = nx * v;
    this.dodgeVy = ny * v;
    this.iceGlide = false;
    if (!this.dodgeR0) {
      this.dodgeR0 = this.r;
      this.r *= D.shrink;
    }
    G.FX.burst(this.x, this.y, '#d8d0b8', 6, 60);
    return true;
  }
  /** Ends the dodge (finished, cancelled, or swapped out): the body grows back and the gap before the next dodge starts. */
  endDodge() {
    if (this.dodgeR0) {
      this.r = this.dodgeR0;
      this.dodgeR0 = 0;
      if (!(this.flyT > 0)) G.World.collide(this);
    }
    if (this.dodgeT <= 0) return;
    this.dodgeT = 0;
    this.dodges.gap = Player.DODGE.gap;
  }

  setActive(i, free = false) {
    const sk = this.skillAt(i);
    if (sk) {
      if (sk === 'fly' && !free) this.takeOff(); // its key flies; it never becomes the active slot
      return;
    }
    if (i < 0 || i >= this.slots.length || i === this.active) return;
    if (!free && this.swapT > 0) return; // still holding the slot you just switched to
    // Choice Band and Choice Specs: you cannot switch moves.
    if (this.choiceLocked() && this.slots[this.active]) {
      G.FX.dmgText(this.x, this.y - this.bodyH - 8, G.Items.BY[this.item].name, '#ff8ad8');
      return;
    }
    this.active = i;
    G.Audio.sfx('select');
    if (!free) this.swapT = Player.SWAP_LOCK;
    const m = this.slots[i][0];
    G.FX.ring(this.x, this.y - G.LIFT * 0.5, 6, this.r * 3.4, G.U.TYPE_COLOR[m.type], 0.3, 3);
  }

  cycle(dir) {
    if (!this.slots.length) return;
    const n = this.slots.length; // skills are stepped over
    for (let k = 1; k <= n; k++) {
      const i = (((this.active + dir * k) % n) + n) % n;
      if (!this.skillAt(i)) return this.setActive(i);
    }
  }

  // ---------------- links (fusions) ----------------
  // Each gym win gives a link. With it, moves are combined into a
  // single slot and fired at once. Only one group grows (up to BOND_MAX); if
  // none is in progress, the link joins two loose moves.
  static get BOND_MAX() {
    return 4;
  }

  /** What a link can do now: add to a group or join two loose ones. */
  bondOptions() {
    const loose = this.slots.filter((s, i) => s.length === 1 && !this.skillAt(i)).map((s) => s[0]); // a skill never bonds
    const grow = this.slots.find((s) => s.length > 1 && s.length < Player.BOND_MAX);
    if (grow) return loose.length ? { mode: 'add', group: grow, loose } : null;
    return loose.length >= 2 ? { mode: 'pair', group: null, loose } : null;
  }

  /** Combines `moves` (loose) into the group `group` (or a new one) and spends a link. */
  fuse(moves, group = null) {
    const target = group || this.slots.find((s) => s[0] === moves[0]);
    const cur = this.slots[this.active];
    for (const m of moves) {
      if (target.includes(m)) continue;
      const i = this.slots.findIndex((s) => s.length === 1 && s[0] === m);
      if (i < 0) continue;
      this.slots.splice(i, 1);
      target.push(m);
    }
    this.arrange();
    // It switches to the group, except with a Choice item (you stay on the slot you had, if it remains).
    const a = this.slots.indexOf(cur);
    this.active = this.choiceLocked() && a >= 0 ? a : this.slots.indexOf(target);
    this.bonds = Math.max(0, this.bonds - 1);
    return target;
  }

  /** Moves launched now (the group of the active slot). */
  activeGroup() {
    return this.slots[this.active] || [];
  }

  activeMove() {
    return this.activeGroup()[0];
  }

  /**
   * Called by combat.js when launching a move. It picks the PMD animation and
   * speeds it up if the cooldown is shorter than the animation, so it chains.
   */
  cast(m) {
    const def = G.MoveDefs[m.id],
      fam = G.MoveInfo.badge(m.id); // slice 7a: the resolved def and the display family, never the legacy table
    // Life Orb: each attack costs a little health (it never leaves you KO). An always-on move (a persistent def) is not an attack.
    if (this.hasItem('lifeorb') && !(def && def.persistent) && !this.remote) {
      this.hp = Math.max(1, this.hp - Math.max(1, this.maxHp * 0.01));
    }
    const anim =
      {
        melee: 'Attack',
        beam: 'Shoot',
        projectile: 'Shoot',
        nova: 'Attack',
        aura: 'Charge',
        buff: 'Charge',
        orbit: 'Charge',
        boomerang: 'Shoot',
        chain: 'Shoot',
        mine: 'Charge',
        meteor: 'Charge',
        turret: 'Charge',
        dash: 'Attack',
        trail: 'Walk',
        cone: 'Shoot',
      }[fam] || 'Attack';
    // The new families sound like the similar one of the usual ones.
    const SND = {
      boomerang: 'projectile',
      chain: 'beam',
      mine: 'nova',
      meteor: 'nova',
      turret: 'buff',
      dash: 'melee',
      trail: 'aura',
      cone: 'projectile',
    };
    // The trail does not play a sound at each puddle (it would be a constant buzz).
    if (fam !== 'trail') G.Audio.sfx('shot', { kind: SND[fam] || fam || 'melee', type: m.type });
    if (fam === 'trail') return;
    // Do not restart an animation that is halfway through: it would look choppy.
    if (this.anim.busy() && this.anim.progress() < 0.65) return;
    const meta = G.Sprites.animMeta(this.dex, anim);
    const len = meta ? meta.d.reduce((a, b) => a + b, 0) / 60 : 0.4;
    const cd = Math.max(0.12, (m.simCd || m.cd || 0.5) * this.cdMul); // simCd: the team's folded cd, set by move-render on each cast
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
    const C = G.Enemies.CARRIER,
      dm = half ? C.secHalf : 1;
    switch (kind) {
      case 'slow':
        if (G.Stages.stage(this, 'spe') > -2) G.Stages.add(this, 'spe', -1, C.dur.slow * dm);
        break;
      case 'poison':
        G.Status.applyDot(this, 'poison', 1, dm);
        break;
      case 'sleep':
        if (Math.random() < G.Status.sleepChance(this, C.sleepBase)) G.Status.apply(this, 'sleep', 1, dm);
        else G.FX.dmgText(this.x, this.y - this.bodyH - 4, 'Resisted', '#a3abb8');
        break;
      default:
        G.Status.apply(this, kind, 1, dm); // paralysis, freeze, confusion, daze, drowsy, trap: the CONTROL table's durations
    }
  }

  /**
   * Flinch from a gym leader's hit (COMBAT-RULES "Flinch on the player", Jess 2026-11-01): the active group's cooldowns restart plus a
   * 0.3 s hold (G.MoveSim.flinch), and you recoil as an enemy does: moving, back half your body at 2x your speed, then still 0.2 to
   * 0.3 s; standing, still only. Input is ignored while it lasts. Frozen or asleep, you cannot flinch. Returns true when it applied.
   */
  applyFlinch() {
    if (this.dead || G.Status.stunned(this)) return false;
    G.MoveSim.flinch(this);
    const sp = this.walking ? Math.hypot(this.svx || 0, this.svy || 0) : 0;
    this.stFl =
      sp > 0
        ? { ph: 'back', dx: -this.svx / sp, dy: -this.svy / sp, sp: 2 * sp, t: this.r / 2 / (2 * sp) }
        : { ph: 'hold', dx: 0, dy: 0, sp: 0, t: G.U.rand(0.2, 0.3) };
    G.FX.dmgText(this.x, this.y - this.bodyH - 4, 'Flinched', '#e8d5a0');
    return true;
  }
  /** A push-only move from a gym leader (Roar, MOVE-INTENT roar, Jess 2026-11-02): you slide `dist` px along (dx, dy) over PUSH_T
   *  seconds (0.2), walls stopping you, input ignored. In the air (Fly) nothing reaches you. */
  push(dx, dy, dist) {
    if (this.dead || this.flyT > 0 || !(dist > 0)) return;
    const PUSH_T = 0.2, // TUNE: seconds the slide lasts (140 px is 700 px/s)
      [nx, ny] = G.U.norm(dx, dy);
    this.stPush = { vx: (nx * dist) / PUSH_T, vy: (ny * dist) / PUSH_T, t: PUSH_T };
  }
  /** Velocity during the flinch: back at 2x for half the body, then still for 0.2 to 0.3 s. */
  flinchMove(dt) {
    const F = this.stFl;
    F.t -= dt;
    if (F.ph === 'back') {
      if (F.t <= 0) {
        F.ph = 'hold';
        F.t = G.U.rand(0.2, 0.3);
      }
      return [F.dx * F.sp, F.dy * F.sp];
    }
    if (F.t <= 0) this.stFl = null;
    return [0, 0];
  }

  statusDot(kind, amount, color) {
    if (this.dead) return;
    const inv = this.invuln;
    this.invuln = 0;
    this.dot = true; // status damage still lands in the air (Fly)
    this.hurt(amount, null, true);
    this.dot = false;
    if (!this.dead) this.invuln = inv;
  }

  /**
   * @param type  attack type (type chart and weather); with no type, damage as-is
   * @param pure  damage not reduced by defense or melee (fixed-damage sources)
   */
  hurt(amount, type = null, pure = false, atk = null, who = null) {
    if (this.flyT > 0 && !this.dot && !this.dead) return; // in the air: hits miss, but status damage over time (statusDot) lands
    if (this.invuln > 0 || this.dead) {
      if (G.Log.on && !this.dead) G.Log.block(who, atk ? atk.factor : amount, this.invuln);
      return;
    }
    const LOG = G.Log.on,
      hp0 = this.hp;
    let neutral = amount,
      dStat = 0,
      cat = -1;
    // Enemy attack (sub-slice C): `amount` is the enemy attacker FACTOR; convert to raw
    // damage via this player's base Def/SpD matching the attack category. Non-enemy damage
    // (atk == null: terrain, lava, altar, DoT) keeps `amount` as-is.
    if (atk && !pure) {
      const st = this.mon.stats,
        mul = atk.mul || 1; // mul: weak support / flanker strike, on the final damage
      const defB = st ? st[2] : 50,
        spdB = st ? st[4] : 50;
      const defMul =
        (1 + (atk.cat === 'special' ? this.incOf('spd') : this.incOf('def'))) *
        G.Stages.mul(this, atk.cat === 'special' ? 'spd' : 'def') *
        (this.defItemMul || 1); // Iron / Zinc, then the Def / Sp. Def stage (slice E2a), then Eviolite and Metal Powder
      if (LOG) {
        neutral = (atk.factor / 50 + 2) * G.Stats.ENEMY_DMG_SCALAR * mul;
        cat = atk.cat === 'special' ? 1 : 0;
        dStat =
          (cat === 1
            ? G.Stats.spDef(spdB, this.level, this.statIv(4), 0, this.statNat(4))
            : G.Stats.defense(defB, this.level, this.statIv(2), 0, this.statNat(2))) * defMul;
      }
      amount = G.Stats.applyPlayerDefense(amount, defB, spdB, atk.cat, this.level, defMul, this.statProf) * mul;
    }
    const afterDef = amount;
    let eff = null,
      tk = 1,
      wk = 1;
    if (type) {
      tk = G.Types.mult(type, this.mon.types);
      wk = G.Weather.mult(type);
      eff = G.Types.label(tk);
      // Type-guard berry (ground item, 10 s): a super-effective hit of its type is halved (Chilan: every Normal hit).
      const guard =
        this.stgTeam && G.Stages.teamSum(this.stgTeam, 'guard_' + type) > 0 && (tk > 1 || type === 'normal') ? 0.5 : 1;
      amount *= tk * wk * guard;
    }
    // With a melee attack active you take 25% less: you have to
    // be on top of the enemies to hit (they lagged far behind).
    const close = this.activeGroup().some((m) => G.MoveDefs[m.id] && G.MoveDefs[m.id].balanceClass === 'melee')
      ? 0.75
      : 1;
    const raw = pure ? amount : amount * (1 - this.reduction) * close;
    let d = Math.max(1, raw);
    if (this.shield) {
      // move schema slice 4b (Substitute): the shield takes the final damage first
      const took = this.absorb(d);
      if (took >= d) return; // fully absorbed: a blue number only, no invulnerability, flash, sound or camera kick
      d -= took; // the spill goes down the normal path
    }
    this.hp -= d;
    if (LOG)
      G.Log.hitIn(
        who,
        type,
        cat,
        neutral,
        dStat,
        afterDef,
        tk,
        wk,
        pure ? 0 : this.reduction,
        pure ? 1 : close,
        d,
        hp0,
        Math.max(0, this.hp),
        (d > raw ? 1 : 0) | (pure ? 4 : 0),
        this.spd
      );
    this.invuln = 0.45;
    this.flash = 0.14;
    if (!this.benched) {
      // a benched Pokemon taking DoT is silent: no shake, sound or numbers at its stale position (the toast says it fainted)
      G.Audio.sfx('hurt');
      G.Camera.kick(0.28);
      G.FX.dmgText(
        this.x,
        this.y - this.bodyH - 4,
        '-' + Math.round(d),
        eff === 'super' ? '#ff3048' : eff === 'weak' ? '#c9a0a8' : '#ff6b7a',
        eff === 'super' || !!(atk && atk.crit) // a gym leader's crit shows big
      );
      G.FX.burst(this.x, this.y - this.bodyH * 0.5, '#ff5f6d', 6, 90);
    }
    // Focus Band: survives the hit with 1 health (once every 60 s).
    if (this.hp <= 0 && this.hasItem('focussash') && performance.now() - this.sashT > 60000) {
      this.sashT = performance.now();
      this.hp = 1;
      this.invuln = 1.2;
      if (LOG) G.Log.faint(true, 1);
      G.FX.dmgText(this.x, this.y - this.bodyH - 16, 'Focus Sash!', '#ff9a3d', true);
      G.FX.ring(this.x, this.y, 6, 70, '#ff9a3d', 0.5, 4);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.flyT = 0; // a faint in the air ends the flight where it is
      if (LOG) G.Log.faint(false, 0);
      this.anim.play('Faint', { hold: true });
      this.reviveT = 0;
      this.shield = null; // slice 4b: a faint ends the shield
      this.clearEffects(); // slice E2b: fainting wipes every status and own stage drop
    }
  }

  /** Every status (major, confusion, trap, daze, drowsy, DoT, windows) and this Pokemon's own stage drops. The TEAM raises are shared and stay. */
  clearEffects() {
    G.Status.clear(this);
    G.Stages.clear(this);
  }

  /**
   * A benched, standing team member (slice E2b, Jess 2026-10-20): statuses, DoT and its own stage drops keep ticking; only skill cooldowns do not
   * (combat.js). DoT can faint it, silently: game.js shows the red toast. Called once per frame by the game loop for every non-active, non-fainted member.
   */
  benchUpdate(dt) {
    if (this.dead) return;
    this.benched = true;
    if (this.slowT > 0) this.slowT -= dt;
    G.Status.tick(this, dt);
    G.Stages.tick(this, dt);
    // Slice 5b HP Regen card: benched members only (a reason to swap); no floating number on the bench (Jess, 2026-10-31)
    const rg = this.teamCards ? G.TeamCards.regen(this.teamCards) : 0;
    if (rg > 0 && !this.dead && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + rg * this.maxHp * dt);
    this.benched = false;
  }

  /** Move schema slice 4b: the shield takes up to `d` of a final hit. Returns what it absorbed (all of `d` when overflow is off).
   *  A shield drained to 0 is broken for good (its regen does not bring it back). The absorbed part shows as a blue number. */
  absorb(d) {
    const sh = this.shield;
    const took = Math.min(sh.v, d);
    sh.v -= took;
    if (sh.v <= 1e-9) this.shield = null;
    if (!this.benched && took > 0) G.FX.dmgText(this.x, this.y - this.bodyH - 4, '-' + Math.round(took), '#6ec8ff');
    return sh.overflow ? took : d;
  }
  /** Shield regen and lifetime (slice 4b), once per frame from update(). */
  tickShield(dt) {
    const sh = this.shield;
    if (!sh) return;
    if ((sh.t -= dt) <= 0) {
      this.shield = null;
      return;
    }
    sh.v = Math.min(sh.max, sh.v + sh.regen * dt);
  }
  /** A cast's HP cost (slice 4b recoil): taken directly, not through hurt (no invulnerability, flash, sound or kick); never below 1 HP. */
  payHp(n) {
    const before = this.hp;
    this.hp = Math.max(1, this.hp - n);
    if (!this.benched && before - this.hp >= 1)
      G.FX.dmgText(this.x, this.y - this.bodyH - 4, '-' + Math.round(before - this.hp), '#c9c9d6');
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const got = Math.round(this.hp - before);
    if (G.Log.on) G.Log.heal(amount, this.hp - before, this.hp, this.maxHp);
    if (got >= 1) G.FX.dmgText(this.x, this.y - this.bodyH - 6, '+' + got, '#5fe08a');
  }

  addMaxHp(amount) {
    this.maxHp += amount;
    this.hp += amount;
  }

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
      if (gain > 0) {
        this.maxHp = newMax;
        this.hp += gain;
      }
    }
    return leveled;
  }

  /** Bring a benched teammate up to the shared run level: recompute maxHp for the
   *  new level, preserving current-hp fraction (so swapping is neither a free heal
   *  nor a penalty). The ACTIVE fighter uses gainXp instead. */
  syncLevel(level) {
    if (this.baseHpStat == null || level <= this.level) {
      this.level = level;
      this.xpNext = Player.xpFor(level);
      return;
    }
    const frac = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.level = level;
    this.xpNext = Player.xpFor(level);
    this.maxHp = this.maxHpAt(level);
    this.hp = Math.round(this.maxHp * frac);
  }

  // ---------------- held items ----------------
  /** True when `id` is in effect for this Pokemon: its own held item while it is NOT benched (held effects only work
   *  on the field), or any run-tier item the team carries. */
  choiceLocked() {
    return this.hasItem('choiceband') || this.hasItem('choicespecs');
  }
  hasItem(id) {
    return (!this.benched && this.item === id) || this.runItems.includes(id);
  }

  /** Equips a Pokemon-tier item on THIS Pokemon (and removes whatever it carried). Run-tier items go through G.Game. */
  equip(id) {
    if (this.item) G.Items.BY[this.item].off(this);
    this.item = id;
    if (id) G.Items.BY[id].on(this);
  }

  /**
   * Move this Pokemon's held item to `other`, or swap items when `other` holds one too (team sheet, F2). Each item is
   * unequipped from its old holder (off) and equipped on its new one (on), so every stat multiplier stays exact.
   * The Focus Sash cooldown (sashT) travels with the item, so passing a spent sash gives no instant second save.
   * @returns {{a: string|null, b: string|null}|null} items this one held / other held before the swap; null if nothing happened
   */
  swapHeldItem(other) {
    if (!other || other === this || (!this.item && !other.item)) return null;
    const a = this.item,
      b = other.item,
      ta = this.sashT,
      tb = other.sashT;
    if (a) G.Items.BY[a].off(this);
    if (b) G.Items.BY[b].off(other);
    this.item = b;
    other.item = a;
    if (b) G.Items.BY[b].on(this);
    if (a) G.Items.BY[a].on(other);
    this.sashT = tb;
    other.sashT = ta;
    return { a, b };
  }

  /** Shell Bell: a little health for the damage you do (cap 4/s). */
  onDealt(dmg) {
    if (this.hasItem('shellbell')) this.bellHeal = Math.min(4, this.bellHeal + dmg * 0.04);
  }

  /** An altar's power (see systems/interact.js): it applies and removes itself. */
  addPower(def, dur) {
    if (this.power) this.power.def.off(this);
    def.on(this);
    this.power = { def, t: dur, dur };
  }

  // ---------------- ciclo ----------------
  update(dt) {
    this.anim.update(dt);
    if (this.dead) return;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.attackFace > 0) this.attackFace -= dt;
    if (this.flyT > 0 && (this.flyT -= dt) <= 0) this.land();
    else if (this.flyT <= 0 && this.flyCd > 0) this.flyCd = Math.max(0, this.flyCd - dt);
    this.tickDodges(dt);
    if (this.skillAt(this.active)) {
      // a skill never stays active (it may land there when slots change): the first castable slot takes over
      const i = this.slots.findIndex((g, k) => !this.skillAt(k));
      if (i >= 0) this.active = i;
    }

    G.Stages.teamTick(this.stgTeam, dt); // the shared team raises: only the active member runs update(), so they tick exactly once per frame
    if (this.slowT > 0) this.slowT -= dt;
    G.Status.tick(this, dt);
    G.Stages.tick(this, dt);
    if (this.dead) return;
    if (this.bellHeal > 0) {
      const h = Math.min(this.bellHeal, 4 * dt);
      this.hp = Math.min(this.maxHp, this.hp + h);
      this.bellHeal -= h;
    }
    if (this.power && (this.power.t -= dt) <= 0) {
      this.power.def.off(this);
      this.power = null;
    }
    this.tickShield(dt);
    if (this.regen > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    // Black Sludge on a non-Poison holder: small chip, never lethal (F3b).
    if (this.sludgeHurt && !this.dead) this.hp = Math.max(1, this.hp - this.maxHp * 0.01 * dt);

    // --- movement with collisions ---
    // (In co-op pausing does not stop the game: you just stay still.)
    let [ax, ay] = this.frozen || this.stFl || this.stPush || G.Status.stunned(this) ? [0, 0] : G.Input.axis(); // frozen, asleep, flinched or pushed: no input
    if (this.stCnf && (ax || ay)) {
      // confused: your heading drifts (half weight)
      const m = Math.hypot(ax, ay),
        w = G.Status.wander(this, ax / m, ay / m, 0.5);
      ax = w[0] * m;
      ay = w[1] * m;
    }
    if (this.stDaze && (ax || ay)) {
      // dazed: the heading is jittered (slice E1)
      const m = Math.hypot(ax, ay),
        j = G.Status.jitter(this, ax / m, ay / m);
      ax = j[0] * m;
      ay = j[1] * m;
    }
    // Dodge: a push, a flinch, freezing or sleep cancels the one in progress (its charge stays spent).
    if (this.dodgeT > 0 && (this.frozen || this.stFl || this.stPush || G.Status.stunned(this))) this.endDodge();
    if (G.Input.action('dodge')) this.tryDodge(ax, ay);
    const dodging = this.dodgeT > 0;
    this.walking = ax !== 0 || ay !== 0 || dodging;
    const s = this.spd;
    // Ice: you slide (the velocity changes slowly).
    const slide = this.inLiquid && G.World.liquidEffect(this.mon.types).slide;
    if (!slide) this.iceGlide = false;
    if (this.stPush) {
      // a push (Roar) moves you; it ends after PUSH_T
      this.svx = this.stPush.vx;
      this.svy = this.stPush.vy;
      if ((this.stPush.t -= dt) <= 0) this.stPush = null;
    } else if (this.stFl)
      [this.svx, this.svy] = this.flinchMove(dt); // the flinch recoil moves you
    else if (dodging) {
      // a dodge holds its heading and speed, ice or not
      this.svx = this.dodgeVx;
      this.svy = this.dodgeVy;
    } else if (this.iceGlide) {
      // a dodge that ended on ice keeps its speed until you leave the ice; your keys turn the heading as slowly as ice steering
      const v = Player.DODGE.dist / Player.DODGE.dur,
        [hx, hy] = ax || ay ? [ax, ay] : G.U.norm(this.svx || 0, this.svy || 0);
      const gx = G.U.damp(this.svx || 0, hx * v, 1.6, dt),
        gy = G.U.damp(this.svy || 0, hy * v, 1.6, dt),
        g = Math.hypot(gx, gy) || 1;
      this.svx = (gx / g) * v;
      this.svy = (gy / g) * v;
    } else {
      this.svx = slide ? G.U.damp(this.svx || 0, ax * s * 1.15, 1.6, dt) : ax * s;
      this.svy = slide ? G.U.damp(this.svy || 0, ay * s * 1.15, 1.6, dt) : ay * s;
    }
    // Fast moves step in 4 px pieces so the shrunk body cannot skip over a thin obstacle on a long frame.
    const steps = Math.max(1, Math.ceil((Math.hypot(this.svx, this.svy) * dt) / 4));
    for (let k = 0; k < steps; k++) {
      this.x += (this.svx * dt) / steps;
      this.y += (this.svy * dt) / steps;
      if (this.flyT > 0) this.keepInArena();
      else G.World.collide(this); // in the air walls and objects do not block
    }
    if (dodging) {
      this.moveAngle = Math.atan2(this.dodgeVy, this.dodgeVx);
      this.dodgeEl += dt;
      // past the shrink window the body grows back as soon as it fits where you stand (it never pops out of a gap mid-dodge)
      const fits = this.flyT > 0 || G.World.isFree(this.x, this.y, this.dodgeR0, true);
      if (this.dodgeR0 && this.dodgeEl >= Player.DODGE.shrinkT && fits) {
        this.r = this.dodgeR0;
        this.dodgeR0 = 0;
      }
      if (this.dodgeT > dt + 1e-6)
        this.dodgeT -= dt; // the epsilon keeps 0.5 s at 30 frames, not 31
      else {
        this.endDodge();
        this.iceGlide =
          !(this.flyT > 0) && G.World.isLiquid(this.x, this.y) && !!G.World.liquidEffect(this.mon.types).slide;
      }
    } else if (this.walking) this.moveAngle = Math.atan2(ay, ax);

    // --- liquid terrain ---
    this.inLiquid = !(this.flyT > 0) && G.World.isLiquid(this.x, this.y);
    if (this.inLiquid) {
      const le = G.World.liquidEffect(this.mon.types);
      if (le.dmg) {
        this.lavaTick -= dt;
        if (this.lavaTick <= 0) {
          this.lavaTick = le.every;
          this.invuln = 0;
          this.hurt(Math.max(le.flat, this.maxHp * le.dmg * 0.5));
          G.FX.burst(this.x, this.y - 4, le.color, 5, 70);
        }
      } else if (this.walking && Math.random() < dt * 8) {
        G.FX.burst(this.x, this.y, le.slide ? '#ffffff' : '#b3defa', 2, 40);
      }
    }

    // --- targeting: nearest enemy; if none, toward where you walk ---
    // Target priority based on the active attack:
    //   ranged (a shot that travels, or a beam): the boss if in range > what is touching you > the nearest
    //   melee and the rest:           what is touching you > the boss > the nearest
    // With a horde on top something is almost always touching you; if that always won,
    // ranged attacks would never hit the boss.
    // With no enemies, it targets the nearest rock or chest.
    const all = G.EnemyMgr.all();
    const m = this.activeMove();
    const md = m && G.MoveDefs[m.id];
    const ranged = !!md && ((md.delivery || {}).motion === 'travels' || (md.space || {}).shape === 'linear');
    const threat = G.Projectiles.nearest(all, this.x, this.y, this.r + 24);
    const boss = all.find((e) => e.boss && !e.dead && G.U.dist(this.x, this.y, e.x, e.y) < 330);
    const tg =
      (ranged ? boss || threat : threat || boss) ||
      G.Projectiles.nearest(all, this.x, this.y, 520) ||
      G.World.nearestBreakable(this.x, this.y, 200);
    this.target = tg;
    if (tg) this.aim = Math.atan2(tg.y - this.y, tg.x - this.x);
    else if (this.walking) this.aim = this.moveAngle;

    // --- animation: look at the target when attacking, otherwise where it walks ---
    const face = this.attackFace > 0 || !this.walking ? this.aim : this.moveAngle;
    this.anim.dir = G.Sprites.dirFromAngle(face);
    this.anim.loop(this.walking ? 'Walk' : 'Idle', this.walking ? s / 110 : 1);
  }

  /** A flying player stays inside a gym arena's circle (its walls no longer hold it). */
  keepInArena() {
    const a = G.GymArena && G.GymArena.arena;
    if (!a) return;
    const max = (a.r - 1.4) * G.World.TS,
      dx = this.x - a.x,
      dy = this.y - a.y,
      d = Math.hypot(dx, dy);
    if (d > max) {
      this.x = a.x + (dx / d) * max;
      this.y = a.y + (dy / d) * max;
    }
  }

  /** Gets back up (revived by a teammate in co-op). */
  revive(frac = 0.5) {
    this.clearEffects(); // slice E2b: a revive starts clean
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
    if (G.U.dist2(this.x, this.y, n.x, n.y) > 300 * 300) {
      this.x = n.x;
      this.y = n.y;
    } else {
      this.x = G.U.damp(this.x, n.x, 14, dt);
      this.y = G.U.damp(this.y, n.y, 14, dt);
    }
    if (n.hp < this.hp - 0.5 && !n.dead) this.flash = 0.14;
    this.hp = n.hp;
    this.maxHp = n.maxHp;
    this.magnet = n.mag || this.magnet;
    this.reviveT = n.rev || 0;
    if (n.dead && !this.dead) {
      this.dead = true;
      this.anim.play('Faint', { hold: true });
    } else if (!n.dead && this.dead) this.revive(n.hp / (n.maxHp || 1));
    // Active move (for the halo and the HUD).
    if (n.mv && (!this.moves[0] || this.moves[0].id !== n.mv) && G.MoveDefs[n.mv]) {
      this.moves = [G.Moves.instance(n.mv)];
      this.slots = [this.moves.slice()];
      this.active = 0;
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
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r * 1.5, this.r * 0.6, 0, 0, 6.2832);
      ctx.stroke();
      ctx.restore();
    }
    G.Sprites.drawShadow(ctx, this.dex, this.x, this.y);
    // Altar power: a ring of its color pulsing under the feet.
    if (this.power && !this.dead) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 120) * 0.15;
      ctx.strokeStyle = this.power.def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r * 2.1, this.r * 0.85, 0, 0, 6.2832);
      ctx.stroke();
      ctx.restore();
    }

    const alpha = this.invuln > 0 && !this.dead ? (Math.floor(this.invuln * 18) % 2 ? 0.45 : 1) : 1;
    const lift = this.flyT > 0 ? 22 + Math.sin(performance.now() / 160) * 3 : 0; // Fly: the sprite rises, the shadow stays on the ground
    this.anim.draw(
      ctx,
      this.x,
      this.y - lift,
      Object.assign({ flash: this.flash > 0, softFlash: true, alpha, color: '#ffcb3d' }, G.Status.tintOf(this))
    );

    // Dodge charges: two rings to the right of the body while one recharges (outer = first charge); each fills as it comes back.
    const dc = this.dodges.cd;
    if (!this.dead && dc.some((t) => t > 0)) {
      const cx = this.x + this.r + 12,
        cy = this.y - lift - this.bodyH * 0.5;
      ctx.save();
      ctx.lineWidth = 2;
      dc.forEach((t, k) => {
        const rr = k ? 3.5 : 7;
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, 6.2832);
        ctx.stroke();
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = t > 0 ? '#9fe8ff' : '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + 6.2832 * (1 - t / Player.DODGE.cd));
        ctx.stroke();
      });
      ctx.restore();
    }

    // Buff arcs around the feet.
    const COL = { atk: '#ff6b4d', spe: '#7fe0ff', def: '#b0b8c8', regen: '#5fe08a', spa: '#b99dff', spd: '#6ea4ff' };
    let i = 0;
    for (const k of G.Stages.teamKeys(this.stgTeam)) {
      // legacy keys plus team tracker stats (slice 5a)
      const L = this.stgTeam[k] || [];
      if (!COL[k] || !G.Stages.teamLive(this.stgTeam, k)) continue; // berry keys (guard_*, pct_*, crit, drop) show in the HUD chips, not as feet arcs
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
      const S = G.Status,
        cs = this.stMajor
          ? S.CONTROL[this.stMajor.k]
          : this.stCnf
            ? S.CONTROL.confusion
            : this.stDaze
              ? S.CONTROL.daze
              : this.stTrap
                ? S.CONTROL.trap
                : this.stDrow
                  ? S.CONTROL.drowsy
                  : null;
      if (cs) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = cs.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r * 1.35, this.r * 0.55, 0, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
      }
      if (this.stDrow || (this.stMajor && this.stMajor.k === 'sleep')) {
        const t = performance.now() / 1000;
        ctx.save();
        ctx.font = '800 9px GameFont,"Segoe UI",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cfc6ff';
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.7 + i / 3) % 1; // three letters rising and fading in turn
          ctx.globalAlpha = Math.sin(ph * Math.PI);
          const zx = this.x + 8 + ph * 8,
            zy = this.y - this.bodyH - 4 - ph * 16;
          ctx.strokeText('z', zx, zy);
          ctx.fillText('z', zx, zy);
        }
        ctx.restore();
      }
    }

    // Status icons above the head (slice E1): a small 3-letter pill per status with a thin timer bar. Drowsy has its zzz instead.
    if (!this.dead) {
      const L = G.Status.list(this).filter((x) => x.k !== 'drowsy');
      const mx = this._stMax || (this._stMax = {});
      for (const k in mx) if (!L.some((x) => x.k === k)) delete mx[k];
      if (L.length) {
        const TAG = {
          burn: 'BRN',
          poison: 'PSN',
          toxic: 'TOX',
          paralysis: 'PAR',
          sleep: 'SLP',
          freeze: 'FRZ',
          confusion: 'CNF',
          daze: 'DZE',
          trap: 'TRP',
          slow: 'SLW',
        };
        ctx.save();
        ctx.font = '800 7px GameFont,"Segoe UI",sans-serif';
        ctx.textAlign = 'center';
        const gap = 2,
          h = 9,
          ws = L.map((x) => Math.ceil(ctx.measureText(TAG[x.k] || x.k.slice(0, 3).toUpperCase()).width) + 6);
        let x = this.x - (ws.reduce((a, b) => a + b, 0) + gap * (L.length - 1)) / 2;
        const y = this.y - this.bodyH - (this.tag ? 24 : 14);
        L.forEach((st, i) => {
          if (st.t != null) mx[st.k] = Math.max(mx[st.k] || 0, st.t);
          ctx.fillStyle = 'rgba(20,0,6,.82)';
          ctx.beginPath();
          ctx.roundRect(x, y, ws[i], h, 3);
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = st.color;
          ctx.stroke();
          ctx.fillStyle = st.color;
          ctx.fillText(TAG[st.k] || st.k.slice(0, 3).toUpperCase(), x + ws[i] / 2, y + 7);
          if (st.t != null && mx[st.k] > 0) {
            ctx.fillRect(x + 1, y + h + 1, (ws[i] - 2) * Math.max(0, Math.min(1, st.t / mx[st.k])), 1.5);
          }
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
      ctx.ellipse(
        this.x,
        this.y,
        this.r * 2.4,
        this.r * 1.0,
        0,
        -Math.PI / 2,
        -Math.PI / 2 + 6.2832 * Math.min(1, this.reviveT / G.Player.REVIVE_TIME)
      );
      ctx.stroke();
      ctx.restore();
    }
    if (this.tag) {
      ctx.save();
      ctx.font = '700 7px GameFont,"Segoe UI",sans-serif';
      ctx.textAlign = 'center';
      const y = this.y - this.bodyH - 8;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(this.tag, this.x, y);
      ctx.fillStyle = this.dead ? '#ff8a96' : this.tagColor || '#fff';
      ctx.fillText(this.tag, this.x, y);
      if (this.dead) {
        ctx.font = '700 6px GameFont,"Segoe UI",sans-serif';
        ctx.strokeText(this.revLabel || '', this.x, y - 8);
        ctx.fillText(this.revLabel || '', this.x, y - 8);
      }
      ctx.restore();
    }
  }
};
