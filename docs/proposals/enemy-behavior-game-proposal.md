# Proposal: enemy behavior refactor, slice 1 (class table, 9-species cast, modifiers)

Status: PROPOSED. Nothing in js/ or dev.html has been changed. Awaiting Jess's approval.
Branch suggestion: `refactor/enemy-behavior` off an up-to-date `main` (Jess runs git).
Slice 2 (the Status mechanics on the player) is outlined at the end and is NOT part of this approval.
Slice 1b (per-class spacing bands for ranged and support units) was designed with Jess on 2026-10-18; its section is below. No diff is drafted for it yet.

## What it does
Replaces the dex-hash classes in `behaviorOf()` with a generated, fixed table (`js/data/enemy-classes.js`, 879 wild species,
built from the classifier plus Jess's hand tuning). On top of the table it adds the agreed cast rule and the modifier changes:

- Every wild species has one class from the table: plain, charger, jumper, bomber | shooter, beamer, zoner, fan | healer, shielder, summoner, status.
- Each tier's cast is 9 species: 1-2 support, 3-5 melee, 3-5 range (usually 1 / 4 / 4). From tier 2 on each family holds at least one special
  (melee: charger, jumper, bomber; range: beamer, zoner, fan) AND at least one baseline (plain melee, shooter). Tier 1 eases in with plain and shooter
  first. Two supports never share a class.
- Region pools stay cumulative. If a region leaves a tier too thin (only Kanto and Johto tier 6), that tier borrows from the next lower BST band.
- Tank is a modifier (flag `t`), not a behavior: any class can be a Tank. It keeps damage x1.2 and XP x1.3.
- Runner is a flag on the fastest plain or charger in each tier's cast (never a Tank), at its own speed. The x1.6 speed multiplier is removed.
- Bomber loses its x1.25 speed multiplier.
- Ditto is a summoner whose minions are random melee or range members of the cast drawn for this tier or an earlier one (never support or bomber).
- Status species fight as plain shooters for now (placeholder). Their real mechanics are slice 2.

## Decisions (answered by Jess 2026-10-18)
1. Cast of 9 on all six tiers: YES.
2. Mix numbers: settled by the baseline guarantee (one plain melee and one shooter per cast from tier 2). Support 1-2 (30% two) and the 4/4 default stay as drafted.
3. Runner: the fastest plain or charger that is NOT a Tank: YES.
4. Status species fight as shooters until their mechanics exist (slice 2): YES.
5. Move the classifier into `tools/` (with `hand-overrides.json` beside it): YES, done at apply time together with the rest.
6. Ranged and support units hold a per-class distance band instead of one shared range (section "Spacing bands"): YES. The numbers are first guesses, tuned by playtest.
7. Two cheap fixes ride with it: a narrow hold band, and a side-step when a retreating unit is cornered: YES.
8. Shielder joins the spacing logic at a mid band, for movement only: YES.
Open before applying: Jess is still reviewing what each class does now (section below) and has fixed the charger in his own copy of the table; reconcile that with the charger row below before this is applied.

## Files
| file | change |
|---|---|
| NEW `js/data/enemy-classes.js` | the generated table, 879 entries. Draft is `docs/proposals/enemy-classes.draft.js` (checksum 00327d337b). Copied as-is on approval. |
| `js/data/enemies.js` | table lookup replaces the hash; new `castFor`; runner/tank/bomber changes; hordes and bosses read the table; `minionFromCast`. |
| `js/entities/enemy.js` | 2 lines: runner reads `def.runner`; Ditto's summon calls `minionFromCast`. |
| `dev.html` | load the new data file before enemies.js. `tools/build.js` reads the script list from dev.html, so the published build picks it up. |
| `js/main.js` | add `ENEMY_CLASSES` to the NEED list so a missing table fails loudly instead of silently turning everything into plain/shooter. |

A species missing from the table (a future pokedex addition) falls back to plain or shooter by Atk vs SpA, so nothing crashes.

## Diffs

### js/data/enemies.js
```diff
--- a/js/data/enemies.js
+++ b/js/data/enemies.js
@@ -13,5 +13,5 @@
  *   charger  stops, aims and charges
  *   ranged   keeps its distance and shoots
- *   tank     lento, mucha vida
+ *   (tank is no longer a behavior: it is a modifier on any class, flag t in js/data/enemy-classes.js)
  *   ---- with personality ----
  *   healer   heals those around (Chansey, Blissey, Audino...)
@@ -23,6 +23,9 @@
  *   fan      shoots in a fan
  *   jumper   jumps and lands on you (the landing shows on the ground first)
- *   runner   runner: very fast and fragile, goes where you are going to be (cuts
- *            off whoever only flees). One per tier: the fastest of the cast.
+ *   status   (slice 2) applies sleep / paralysis / slow to you, or hastes its allies
+ *   runner   not a class: a flag on the fastest plain or charger of each tier's cast, at its own
+ *            speed. It goes where you are going to be (cuts off whoever only flees).
+ *
+ * Every species' class comes from the generated table js/data/enemy-classes.js (G.ENEMY_CLASSES).
  * The warned attacks are in systems/hazards.js.
  *
@@ -33,10 +36,10 @@
 G.Enemies = (() => {
   const TIERS = [
-    { from: 0,   bst: [180, 330], hp: 17,  spd: 56, dmg: 6,  xp: 3.5, cast: 7 },
-    { from: 70,  bst: [300, 405], hp: 32,  spd: 62, dmg: 8.5, xp: 5,  cast: 7 },
-    { from: 160, bst: [385, 465], hp: 52,  spd: 60, dmg: 11, xp: 8,  cast: 7 },
-    { from: 260, bst: [445, 515], hp: 88,  spd: 70, dmg: 14, xp: 13, cast: 7 },
-    { from: 380, bst: [495, 560], hp: 150, spd: 66, dmg: 22, xp: 24, cast: 7 },
-    { from: 500, bst: [530, 620], hp: 250, spd: 72, dmg: 28, xp: 38, cast: 7 }
+    { from: 0,   bst: [180, 330], hp: 17,  spd: 56, dmg: 6,  xp: 3.5, cast: 9 },
+    { from: 70,  bst: [300, 405], hp: 32,  spd: 62, dmg: 8.5, xp: 5,  cast: 9 },
+    { from: 160, bst: [385, 465], hp: 52,  spd: 60, dmg: 11, xp: 8,  cast: 9 },
+    { from: 260, bst: [445, 515], hp: 88,  spd: 70, dmg: 14, xp: 13, cast: 9 },
+    { from: 380, bst: [495, 560], hp: 150, spd: 66, dmg: 22, xp: 24, cast: 9 },
+    { from: 500, bst: [530, 620], hp: 250, spd: 72, dmg: 28, xp: 38, cast: 9 }
   ];
 
@@ -69,36 +72,22 @@
   function regionOK(p) { return region == null || p.gen <= region; }
 
-  // Fixed personalities of some Pokemon.
-  const HEAL = new Set([35, 36, 113, 173, 183, 184, 242, 301, 440, 531, 594, 700, 764, 858]);
-  const SHIELD = new Set([95, 122, 208, 213, 227, 306, 375, 410, 411, 436, 437, 439, 476, 703]);
-  const BOMB = new Set([74, 75, 76, 100, 101, 102, 109, 110, 337, 338, 343, 344]);
-  // Summoner -> Pokemon of its pack.
-  const SUMMON = { 15: 13, 18: 16, 24: 23, 28: 27, 31: 29, 34: 32, 42: 41, 51: 50, 53: 52, 57: 56, 59: 58,
-                   62: 60, 68: 66, 73: 72, 78: 77, 82: 81, 85: 84, 91: 90, 117: 116, 130: 129, 168: 167, 169: 41,
-                   199: 79, 230: 116, 262: 261, 334: 333, 405: 403, 416: 415, 462: 81, 466: 239, 553: 551, 637: 636 };
-
-  function behaviorOf(p) {
-    const t = p.types, h = H(p.dex, 11);
-    const has = (...xs) => xs.some(x => t.includes(x));
-    if (HEAL.has(p.dex)) return 'healer';
-    if (SHIELD.has(p.dex)) return 'shielder';
-    if (BOMB.has(p.dex)) return 'bomber';
-    if (SUMMON[p.dex] && G.SPRITE_META[SUMMON[p.dex]]) return 'summoner';
-    // Swarms: some Bug ones call more of their own (from the start).
-    if (has('bug') && h >= 0.6 && h < 0.78) return 'summoner';
-    if (has('electric', 'psychic', 'dragon', 'ice') && h < 0.18) return 'beamer';
-    if (has('fire', 'ground', 'poison') && h < 0.18) return 'zoner';
-    if (has('water', 'grass', 'bug', 'fairy') && h >= 0.18 && h < 0.32) return 'fan';
-    if (has('fighting', 'ground', 'normal', 'rock') && h >= 0.42 && h < 0.56) return 'jumper';
-    if (has('psychic', 'electric', 'ghost', 'fairy') && h < 0.4) return 'ranged';
-    if (has('fire', 'water', 'poison', 'ice') && h < 0.22) return 'ranged';
-    if (has('fighting', 'normal', 'ground', 'rock', 'dragon', 'steel', 'dark') && h < 0.4) return 'charger';
-    if (baseHp(p) > 95 && baseSpd(p) < 50) return 'tank';
-    return 'chase';
-  }
+  // ---------------- class table ----------------
+  // Every wild species has a fixed class in js/data/enemy-classes.js (generated, see DECISIONS.md
+  // 2026-10-17 / 2026-10-18): c = class, t = Tank modifier, s = secondary class, fx = status effects,
+  // m = summoner minion dex, u = unique behavior. This replaces the old dex hash.
+  // Class -> the behavior id enemy.js already understands (every other class is its own id).
+  // Slice 1: status enemies fight as shooters until their mechanics land (slice 2).
+  const BEHAVIOR = { plain: 'chase', shooter: 'ranged', status: 'ranged' };
+  const FAMILY = { plain: 'melee', charger: 'melee', jumper: 'melee', bomber: 'melee',
+                   shooter: 'range', beamer: 'range', zoner: 'range', fan: 'range',
+                   healer: 'support', shielder: 'support', summoner: 'support', status: 'support' };
+  // A species the table does not know (added to the pokedex later): family by stats, default class.
+  const infoOf = p => G.ENEMY_CLASSES[p.dex] || { c: (p.stats && p.stats[3] > p.stats[1]) ? 'shooter' : 'plain' };
+  const classOf = p => infoOf(p).c;
+  const behaviorOf = p => { const c = classOf(p); return BEHAVIOR[c] || c; };
 
   /** Builds a Pokemon's enemy definition for a tier. */
   function defFor(p, tier, ti) {
-    const behavior = behaviorOf(p);
+    const behavior = behaviorOf(p), info = infoOf(p);
     const d = {
       dex: p.dex, name: p.name, behavior,
@@ -109,7 +98,8 @@
       // same px/s scale as the player. No tier template, no role mult, no time ramp.
       spd: G.Stats.speedToPx((G.DEX_BY[p.dex] && G.DEX_BY[p.dex].stats) ? G.DEX_BY[p.dex].stats[5] : 65),
-      dmg: Math.round(tier.dmg * (behavior === 'tank' ? 1.2 : 1)),
-      xp: Math.max(3, Math.round(tier.xp * (behavior === 'tank' ? 1.3 : 1)))
+      dmg: Math.round(tier.dmg * (info.t ? 1.2 : 1)),
+      xp: Math.max(3, Math.round(tier.xp * (info.t ? 1.3 : 1)))
     };
+    if (info.t) d.tank = true;
     // The ones that fight from range: shot damage, cooldown and distance.
     const CD = { ranged: 2.2 - ti * 0.15, fan: 3.2 - ti * 0.15, beamer: 4.4 - ti * 0.2, zoner: 4.6 - ti * 0.2,
@@ -120,8 +110,8 @@
       d.range = (behavior === 'beamer' ? 260 : behavior === 'healer' || behavior === 'summoner' ? 230 : 190) + ti * 6;
     }
-    if (behavior === 'summoner') d.minion = SUMMON[p.dex];
+    if (behavior === 'summoner') d.minion = info.m || p.dex;
+    if (info.u) d.unique = info.u;
     if (behavior === 'fan') d.fanN = ti < 2 ? 3 : 5;             // wider fan later on
     if (behavior === 'zoner') d.zones = ti < 2 ? 1 : ti < 4 ? 2 : 3;   // more zones later on
-    if (behavior === 'bomber') { d.spd = Math.round(d.spd * 1.25); }
     return d;
   }
@@ -134,22 +124,61 @@
   // ---------------- the run's cast ----------------
 
-  const PLAIN = ['chase', 'charger', 'ranged', 'tank'];
-  const SUPPORT = ['healer', 'shielder', 'summoner'];
+  const SUPPORT = ['healer', 'shielder', 'summoner', 'status'];
+  const MELEE_SPECIAL = ['charger', 'jumper', 'bomber'], RANGE_SPECIAL = ['beamer', 'zoner', 'fan'];
+  const famCount = pool => { const c = { melee: 0, range: 0, support: 0 }; for (const p of pool) c[FAMILY[classOf(p)]]++; return c; };
+
+  /** The tier's candidates. If the region leaves too few (Kanto and Johto, tier 6), borrow from the next lower band. */
+  function poolFor(tier, ti) {
+    let pool = candidates(tier);
+    const short = () => { const c = famCount(pool); return pool.length < tier.cast || c.melee < 3 || c.range < 3 || c.support < 2; };
+    for (let k = ti - 1; k >= 0 && short(); k--) {
+      const have = new Set(pool.map(p => p.dex));
+      pool = pool.concat(candidates(TIERS[k]).filter(p => !have.has(p.dex)));
+    }
+    return pool;
+  }
 
   /**
-   * A tier's cast: always one "support" (healer, shield or summoner)
-   * and, from the second tier on, also one of the ones that attack with a warning.
-   * In the first there are no more personalities (to ease you in).
+   * A tier's cast: 9 species, 1-2 support, 3-5 melee, 3-5 range (usually 1 / 4 / 4). From tier 2 on
+   * each family holds at least one special (melee: charger, jumper, bomber; range: beamer, zoner, fan)
+   * AND at least one baseline (plain / shooter); tier 1 eases in with plain and shooter first.
+   * Two supports never share a class.
    */
-  function castFor(tier) {
-    const all = candidates(tier);
-    const kind = p => behaviorOf(p);
-    // First the support type (evenly) and then the Pokemon.
-    const kinds = SUPPORT.filter(k => all.some(p => kind(p) === k));
-    const sk = kinds.length ? kinds[Math.floor(Math.random() * kinds.length)] : null;
-    const pick = sk ? G.U.pickN(all.filter(p => kind(p) === sk), 1) : [];
-    if (tier.from > 0) pick.push(...G.U.pickN(all.filter(p => !PLAIN.includes(kind(p)) && !SUPPORT.includes(kind(p))), 1));
-    if (tier.from === 0) return pick.concat(G.U.pickN(all.filter(p => !pick.includes(p) && PLAIN.includes(kind(p))), tier.cast - pick.length));
-    return pick.concat(G.U.pickN(all.filter(p => !pick.includes(p)), tier.cast - pick.length));
+  function castFor(tier, ti) {
+    const pool = poolFor(tier, ti);
+    const fam = f => pool.filter(p => FAMILY[classOf(p)] === f);
+    const sup = fam('support'), mel = fam('melee'), ran = fam('range');
+    // How many of each: 1-2 support (30% two), then 3-5 melee and 3-5 range.
+    let s = Math.random() < 0.3 ? 2 : 1, m;
+    if (s === 1) { const x = Math.random(); m = x < 0.6 ? 4 : x < 0.8 ? 3 : 5; } else m = Math.random() < 0.5 ? 3 : 4;
+    let r = tier.cast - s - m;
+    // A family the pool cannot fill hands its slots to the other one, then to support.
+    s = Math.min(s, sup.length); m = Math.min(m, mel.length); r = Math.min(r, ran.length);
+    let need = tier.cast - s - m - r;
+    const takeM = () => { const a = Math.min(need, mel.length - m); m += a; need -= a; };
+    const takeR = () => { const a = Math.min(need, ran.length - r); r += a; need -= a; };
+    if (mel.length - m >= ran.length - r) { takeM(); takeR(); } else { takeR(); takeM(); }
+    { const a = Math.min(need, sup.length - s); s += a; need -= a; }
+
+    // Support: the class first (evenly), then the species.
+    const picked = [], used = [];
+    for (let i = 0; i < s; i++) {
+      const left = k => sup.some(p => classOf(p) === k && !picked.includes(p));
+      const fresh = SUPPORT.filter(k => !used.includes(k) && left(k));
+      const k = G.U.pick(fresh.length ? fresh : SUPPORT.filter(left));
+      used.push(k);
+      picked.push(G.U.pick(sup.filter(p => classOf(p) === k && !picked.includes(p))));
+    }
+    const fill = (list, n, specials) => {
+      if (ti === 0) {      // tier 1 eases in: no specials unless the pool is short of plain ones
+        const base = list.filter(p => !specials.includes(classOf(p)));
+        return G.U.pickN(base, n).concat(G.U.pickN(list.filter(p => !base.includes(p)), Math.max(0, n - base.length)));
+      }
+      // One special and one baseline (plain / shooter) are guaranteed, the rest is random.
+      const first = G.U.pickN(list.filter(p => specials.includes(classOf(p))), 1)
+        .concat(G.U.pickN(list.filter(p => !specials.includes(classOf(p))), 1)).slice(0, n);
+      return first.concat(G.U.pickN(list.filter(p => !first.includes(p)), n - first.length));
+    };
+    return picked.concat(fill(mel, m, MELEE_SPECIAL), fill(ran, r, RANGE_SPECIAL));
   }
 
@@ -161,10 +190,11 @@
     cast = TIERS.map((tier, ti) => ({
       from: tier.from,
-      list: castFor(tier).map(p => defFor(p, tier, ti))
+      list: castFor(tier, ti).map(p => defFor(p, tier, ti))
     }));
     for (const tier of cast) {
-      const plain = tier.list.filter(d => d.behavior === 'chase' || d.behavior === 'charger' || d.behavior === 'tank');
-      const r = plain.sort((a, b) => b.spd - a.spd)[0];
-      if (r) { r.behavior = 'runner'; r.spd = Math.round(r.spd * 1.6); }
+      // Runner: the fastest plain or charger of the cast (relative, no speed multiplier), never a tank.
+      const fast = tier.list.filter(d => (d.behavior === 'chase' || d.behavior === 'charger') && !d.tank);
+      const r = fast.sort((a, b) => b.spd - a.spd)[0];
+      if (r) r.runner = true;
     }
     const used = new Set();
@@ -183,5 +213,5 @@
         hp: Math.round(slot.hp * 1.35), spd: Math.round(G.U.clamp(40 + baseSpd(p) * 0.5, 40, 100)),
         dmg: Math.round(slot.dmg * 1.2), xp: slot.xp,
-        behavior: behaviorOf(p) === 'ranged' ? 'ranged' : (baseSpd(p) > 90 ? 'charger' : 'chase'),
+        behavior: FAMILY[classOf(p)] === 'range' ? 'ranged' : (baseSpd(p) > 90 ? 'charger' : 'chase'),
         shotDmg: Math.round(slot.dmg * 0.55), shotCd: 1.1, range: 260
       };
@@ -207,8 +237,8 @@
   function tierAt(t) { let ti = 0; TIERS.forEach((tr, i) => { if (t >= tr.from) ti = i; }); return ti; }
 
-  const NO_HORDE = new Set(['bomber', 'healer', 'shielder', 'summoner']);
+  const NO_HORDE = new Set(['bomber', 'healer', 'shielder', 'summoner', 'status']);   // by class
   /** Types with enough Pokemon in the current tier for a horde (events.js). */
   function hordeTypes(t) {
-    const all = candidates(TIERS[tierAt(t)]).filter(p => !NO_HORDE.has(behaviorOf(p)));
+    const all = candidates(TIERS[tierAt(t)]).filter(p => !NO_HORDE.has(classOf(p)));
     return Object.keys(G.U.TYPE_COLOR).filter(ty => all.filter(p => p.types.includes(ty)).length >= 3);
   }
@@ -216,5 +246,5 @@
   function hordeDefs(type, t) {
     const ti = tierAt(t);
-    const pool = candidates(TIERS[ti]).filter(p => p.types.includes(type) && !NO_HORDE.has(behaviorOf(p)));
+    const pool = candidates(TIERS[ti]).filter(p => p.types.includes(type) && !NO_HORDE.has(classOf(p)));
     return G.U.pickN(pool, 4).map(p => defFor(p, TIERS[ti], ti));
   }
@@ -235,4 +265,15 @@
   }
 
+  /** Ditto's summon: a random melee or range member of the cast drawn for this tier or an earlier one (never support or bomber). */
+  function minionFromCast(t, selfDex) {
+    if (!cast) rollRun();
+    const out = [];
+    for (let i = 0; i <= tierAt(t); i++) for (const d of cast[i].list) {
+      const c = classOf(G.DEX_BY[d.dex]);
+      if (d.dex !== selfDex && FAMILY[c] !== 'support' && c !== 'bomber') out.push(d.dex);
+    }
+    return out.length ? G.U.pick(out) : selfDex;
+  }
+
   /** dex of the cast that will appear soon (to preload sprites). */
   function upcomingDex(t, ahead = 60) {
@@ -245,5 +286,5 @@
 
   return {
-    TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion,
+    TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion, classOf, minionFromCast,
     get region() { return region; },           // null = full dex (Paldea-equiv); else gen 1-9
     enemyHp, levelForTime,
```

### js/entities/enemy.js
```diff
--- a/js/entities/enemy.js
+++ b/js/entities/enemy.js
@@ -311,5 +311,5 @@
       }
       // Runner: it goes where you ARE GOING to be (it cuts you off if you only flee).
-      if (this.behavior === 'runner' && pl._vx != null) {
+      if (this.def.runner && pl._vx != null) {
         const lead = G.U.clamp(dist / Math.max(60, spd), 0, 1.4);
         [dx, dy] = G.U.norm(pl.x + pl._vx * lead - this.x, pl.y + pl._vy * lead - this.y);
@@ -653,5 +653,5 @@
       // With the general enemy cap (fewer Pokemon on screen), with a small margin.
       if (this.minions.length >= 4 || G.EnemyMgr.count > G.Spawner.CAP + 15) return;
-      const dex = this.def.minion || this.dex;
+      const dex = this.def.unique === 'summon-from-cast' ? G.Enemies.minionFromCast((this.sc && this.sc.t) || 0, this.dex) : (this.def.minion || this.dex);
       const mon = G.DEX_BY[dex];
       // Minion HP comes from the mainline formula at spawn (via its own baseHp), like any
```

### dev.html
```diff
--- a/dev.html
+++ b/dev.html
@@ -602,4 +602,5 @@
 <script defer src="js/data/types.js"></script>
 <script defer src="js/data/starters.js"></script>
+<script defer src="js/data/enemy-classes.js"></script>
 <script defer src="js/data/enemies.js"></script>
 <script defer src="js/data/upgrades.js"></script>
```

### js/main.js
```diff
--- a/js/main.js
+++ b/js/main.js
@@ -3,5 +3,5 @@
   // If a file fails to load (a mobile connection that drops), it is better
   // to warn than to boot halfway.
-  const NEED = ['U', 'Stats', 'Log', 'I18n', 'Settings', 'DB', 'Audio', 'Input', 'Touch', 'Sprites', 'Camera', 'Moves', 'Enemies', 'Upgrades', 'Items',
+  const NEED = ['U', 'Stats', 'Log', 'I18n', 'Settings', 'DB', 'Audio', 'Input', 'Touch', 'Sprites', 'Camera', 'Moves', 'ENEMY_CLASSES', 'Enemies', 'Upgrades', 'Items',
                 'World', 'FX', 'Projectiles', 'EnemyMgr', 'Pickups', 'Player', 'Combat', 'Spawner', 'LevelUp', 'Gacha',
                 'Rift', 'Weather', 'Progress', 'Hazards', 'Social', 'Net', 'Coop', 'Ranking', 'Icons', 'UI', 'HUD',
```

## What each class does today (review before shipping)
Slice 1 does not change how any class fights; it only changes which species get which class. Exceptions are marked CHANGES. Numbers are from
`js/entities/enemy.js` and `js/data/enemies.js` as they are now. "ti" is the tier index 0-5.

| class | what it does | key numbers |
|---|---|---|
| plain | walks straight at you (path-aware), hurts on contact | contact hit every 0.55 s |
| charger | walks, then within 200 px stops and aims, then dashes in a straight line | aim pause 0.55 s, dash 0.42 s at 3.4x speed, 1.1 s before it can charge again |
| jumper | crouches, leaps in an arc and lands where you WERE; the landing shows on the ground first | needs you within 250 px, every 5-7 s, 0.45 s crouch, 0.6 s flight, landing zone r50 with a 1.05 s warning |
| bomber | runs at you, and when touching range lights a 1 s fuse with a warned blast, then dies | blast r62, 1.0 s warning. CHANGES: loses its x1.25 speed |
| shooter | keeps its distance and fires one projectile | range 190+6ti, shot every 2.2-0.15ti s, shot speed 190 px/s |
| beamer | keeps its distance, shows a strip on the ground, fires a beam after a delay | range 260+6ti, every 4.4-0.2ti s, beam 360 long x 22 wide, 1.0 s warning |
| zoner | keeps its distance, drops warned damage zones on and around you | range 190+6ti, every 4.6-0.2ti s, 1-3 zones (more in later tiers), r44, 1.2 s warning |
| fan | keeps its distance, fires a spread of shots | range 190+6ti, every 3.2-0.15ti s, 3 shots (tiers 1-2) or 5 shots (later) |
| healer | keeps its distance, never attacks, heals its allies | every 3.5 s heals the 3 most wounded allies within 150 px for about 7% of their max HP each; skips other healers; under 35% HP it only heals itself |
| shielder | walks at you like a plain enemy, shields its allies | every 6 s gives up to 6 nearby allies (itself included) a shield of 35% of max HP for 8 s |
| summoner | keeps its distance, never attacks, calls minions | every 7 s adds 2 minions (max 4 alive) of its minion species, fast chasers with 0.6x damage and 0.25x XP |
| status | CHANGES: nothing yet, fights as a shooter until slice 2 | |

Modifiers:
- Tank: CHANGES. Used to be its own plain-walking behavior. Now a flag on any class: damage x1.2 and XP x1.3 (see the damage note below).
- Runner: CHANGES. Used to replace the class and run 1.6x faster. Now a flag on the fastest plain or charger that is not a Tank: it aims at where you are going, at its own speed.

Things to check while reviewing:
- Damage note (existing behavior, not caused by this refactor): since the attack-calc slice, every wild enemy hit (contact, shots, beams, zones,
  jumps, blasts) uses the species' Atk or SpA and level through one formula, and the per-class damage factors in the code are ignored. So fan
  shots (x0.65), the bomber blast (x1.4), the jump (x1.2), beam and zone factors, and Tank's x1.2 damage all currently do nothing. A fan firing 5 shots deals 5 full hits.
  Tank in practice means +30% XP only. Worth deciding whether class damage weights should come back.
- Shielder is a support class that walks into melee, while healer and summoner stay back. Answered: it gets a mid band (see Spacing bands).
- Healers and summoners deal no damage themselves. They are priority targets, marked with an icon.
- Charger has only the aim pause as warning (no ground marking), unlike jumper, bomber, beamer and zoner.
- Fan and zoner scale with tier (3 to 5 shots, 1 to 3 zones), the others do not.
- Enemy damage still scales with run time (x(1 + t/420)) and HP with the level formula, regardless of class.

## Spacing bands (slice 1b, designed 2026-10-18, no diff drafted yet)
Goal: ranged and support units sit at a distance that tells you what they are, without kiting you or freezing in place.
Today every unit on the keeps-distance list (shooter, fan, beamer, zoner, healer, summoner) uses one rule in `enemy.js`: with `keep = def.range x 0.82`, it
walks at you at full speed beyond `keep`, creeps at 10% speed (Idle) between `keep x 0.75` and `keep`, and backs straight away at 0.8x speed inside `keep x 0.75`.
The creep band is about 20% of range wide, which is where a chased unit can look frozen. The existing stuck side-step (`sideT`) only turns the chase direction;
the retreat overwrites it, so a cornered unit pushes into the wall.

What was found while checking the code:
- The camera is not round. `Camera.VIEW_W` is 768 and the height is at least 420, so the screen edge is about 384 px from you sideways and about 210-216 px up or down.
  Current ranged units hold at roughly 156-215 px, which is near the top and bottom edge and well inside the left and right edges. A flat circle bigger than about
  210 px would put units directly above or below you off screen. So bands are measured on screen: `s = hypot(dx / (Camera.w / 2), dy / (Camera.h / 2))`, where s = 1.0 is the edge of the screen in that direction.
- `def.range` also gates the ability (`dist < range`). A healer or summoner that backs out past its range stops healing or summoning, so the ability gate must follow the band.
- Heal and shield are local: heal reaches 150 px from the healer (3 most wounded), shield reaches 160 px from the shielder (6 nearest).
- Adding shielder to `keepsDistance()` as it is would make it fire projectiles: the shot branch calls `special()`, which falls through to a normal shot for unknown classes.
  The shielder needs a movement-only path; its shield stays on the existing 6 s `skillCd` timer.

The bands (first guesses; tune by feel). Everyone approaches at full walking speed and retreats at 0.8x, as today.
| class | retreats when s is below | approaches when s is above | note |
|---|---|---|---|
| fan | 0.30 | 0.40 | shotgun range, about 65-85 px up/down and 115-155 px sideways |
| beamer | 0.50 | 0.62 | room to read the lane |
| zoner | 0.72 | 0.82 | slightly nearer than the shooter so its zones stay reachable |
| shooter | 0.80 | 0.92 | the visible edge; status species share this band until slice 2 |
| shielder | 0.45 | 0.58 | NEW: movement only, shield cast unchanged |
| healer | 0.70 | 0.82 | same depth as shooter and zoner, not beyond; stays inside its ability gate |
| summoner | 0.70 | 0.82 | same as healer |

Between the two numbers the unit holds still (10% speed, Idle). That gap is about 0.1 wide, down from about 0.2 of range today.

Code touch points (not drafted yet):
- `enemy.js` keeps-distance branch: replace `range x 0.82` and the two thresholds with a lookup by class, using the s metric above.
- Cornered fix: when `sideT > 0`, rotate the retreat direction by `side x 1.25`, the same way the chase direction is rotated. About one line.
- Ability gate: `dist < range` becomes `s < outer x 1.05` for these classes. The path-follow cutoff on line 349 (`dist < range x 0.82`) must use the same band.
- `holdsBand()` (movement) is separate from the list that fires `special()`, so the shielder moves with the band without shooting.
- `enemies.js`: `d.range` is no longer the source for these classes. Before removing it, check what else reads `def.range` (bosses included); I have not checked that yet.
- Co-op: measure against the player the unit already targets.

Consequences to accept:
- A shot flies at 190 px/s for 2.4 s. From the sideways edge it takes about 1.8 s to arrive, so edge shooters are easy to sidestep. They become dodgeable and farmable; their threat will need tuning through volume, not damage.
- Spacing becomes readable: fan on you, beamer a step back, shooter and zoner at the edge, supports behind the crowd.

Open checks before this is applied:
- Player weapon reach against the 0.80-0.92 bands. If the shortest-range weapon cannot hit the edge, shooters have to come closer.
- Every reader of `def.range`.
- Screen size varies with the window (minimum 768 x 420), so the pixel values of a band move with it; check a tall and a wide window.

## Verification done (offline, repo untouched)
The patched `enemies.js` was run in node against the real `pokedex.js` and the draft table, with the other modules stubbed.
`node --check` passes on all three patched JS files. The plain/shooter guarantee was added AFTER this simulation (at Jess's request, not re-simulated); I will re-run it on the real tree at apply time. The 8,100 simulated casts (9 regions x 6 tiers x 150 runs, without that guarantee) showed:
- every cast has 9 distinct species, 1-2 support, 3-5 melee, 3-5 range, with no repeated support class;
- tier 2 and up always has a melee special and a range special; tier 1 never has one, in any region (even Kanto's tier 1 has 19 plain and 7 shooter species to draw from);
- at most one runner per cast, never a Tank, and bombers keep their natural speed;
- about 0.55 Tanks per cast on average;
- hordes exclude support, bomber and status; bosses build; Ditto's minions came from 7 different classes and never support or bomber;
- Kanto and Johto tier 6 are the only tiers that borrow from the band below.
Not tested: anything in a browser. The first real check is a playtest.

## What changes in play
- Every species' behavior changes (hash to stats and lore). This is the point, but it is the biggest feel shift in the refactor.
- 9 species per tier instead of 7. Spawns pick from the same bag, so each species shows up a little less often. Sprite preload grows about 29% (54 species across the six tiers vs 42), spread over time.
- Runner is just "the fastest", no longer 60% faster. Bombers are no longer 25% faster. Expect both to feel less threatening until we see logs.
- Tanks are now any class (49 species), so a Tank charger or Tank healer can exist. Before, a Tank always just walked at you.
- Boss AI leans ranged for any range-family species (before: only when the old hash said ranged).
- Status species are shooters in slice 1.

## After approval, in this order
1. Add the table file and apply the four diffs; `node --check` each; run the same simulation again on the real tree.
2. Move the classifier to `tools/` and point its table output at `js/data/` (one command, `--write`).
3. BALANCE.md entries (cast 7 to 9, runner x1.6 gone, bomber x1.25 gone, tank rule), DECISIONS note, DEVLOG, an English `changelog.js` entry.
4. You playtest each region at least once with `?dev`; the dev logger shows pacing. I then tune from the logs.
5. Slice 1b (spacing bands) after that playtest: draft the diff, check `def.range` readers and weapon reach, then playtest again.

## Slice 2 outline (not for approval yet): Status mechanics
Player statuses, all short with a grace window so nothing stunlocks:
- slow: reuse the existing `slowT` (half speed) that the sticky trap already uses.
- daze (from paralysis and confusion moves): attack cooldowns longer for a few seconds, through `cdMul`.
- drowsy (from sleep moves): rooted for under a second after a warned hit, then immune for several seconds.
- haste aura (from ally-buff moves): nearby enemies move faster for a few seconds, cast the way shields already are.
Delivery: the usual warned zone or beam, with a `status` field applied in `hazards.update` when it hits you. Each Status species carries
its effects in the table (`fx`, strongest first, e.g. Vileplume's powders give daze and drowsy). A secondary Status (16 species) casts the same
thing at half strength on its own timer. New icon for the support marker. New strings in English only. Co-op needs the `hz` broadcast to carry
the status field; that is a deferred hook (local-first), noted in TODO.md.

Open for slice 2: exact durations and the stunlock grace window, and whether paralysis should also make you miss turns. I will read `combat.js` for the cooldown hook before proposing numbers.
