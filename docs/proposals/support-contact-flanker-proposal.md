# Proposal: shot reach, crowd-seeking support, contact gap, flanker (slice 1c)

Status: PROPOSED 2026-10-18, NOT APPLIED. Waiting for Jess's approval. Every design choice below was answered by Jess in chat on 2026-10-18 (see DECISIONS).
Branch suggestion: stay on `refactor/enemy-behavior` (slice 1b is committed there).
The diff at the bottom is real: built on copies of the current tree (clean, slice 1b committed), `node --check` clean, `patch --binary --dry-run` applies it to the real CRLF files, and the patched copy passes the offline simulation described under Tests. NOT run in a browser.

## What it does

### 1. Shooter shots reach twice as long (per-class table)
- `shoot()` takes a `life` (seconds) and a damage `mul`. Speed stays 190 px/s.
- `G.Enemies.SHOT_LIFE = { shooter: 4.8 }`, base `SHOT_LIFE_BASE = 2.4`. Only the PLAIN SHOOTER class gets 4.8 s (about 912 px instead of 456). Fans, beamers, zoners, bosses and every volley/nova keep 2.4.
- Status species are the `ranged` behavior until slice 2 but their class is `status`, so they keep 2.4 too (checked in the simulation).
- Honest limit: enemy shots are discarded 260 px outside the view (`projectile.js`), so the real extra reach is less than the extra life. A shooter holding at the band fires from about 330 px sideways or about 185 px up/down. Before, a missed shot died about 126 px past you sideways and about 270 px past you vertically. Now about 580 sideways and about 480 vertically.
- The "deeper dive" per class (fan, healer, status, bosses) is still open. Adding a class later is one entry in that table.

### 2. Shielder and healer seek the biggest group of allies
- They leave `BANDS`. New table `G.Enemies.SEEK`.
- Every 0.75 s a unit scans allies within 420 px, takes the 8 nearest as candidate group centres, and scores each by how many allies are inside its effect radius (shielder 160 px, healer 150 px). The healer counts only wounded allies (never other healers); with nobody wounded it counts everyone, so it stays with the crowd. It walks toward the best group and only changes target when another group has 2 or more extra allies.
- Floor: never closer to you than 0.30 screens (about 65 to 115 px). Inside it, it backs away at 0.8x. It will not walk into the floor toward a group on your side. With no allies in sight it approaches to 0.55 screens and holds.
- Attacks: a weak shot every 2.5 s while it is within 0.95 screens of you and you are not in touching range; touching it is the weak melee. Never both at once. Both are 0.5x of the final damage, from its own Atk or SpA.
- The shield stays on its 6 s timer and the heal on the species' `shotCd`. The heal is no longer gated by the band, so it also casts while walking toward a group.
- `keepsDistance()` no longer lists the healer; the summoner keeps its band.

### 3. Contact gap
- A melee walker stops at 1.15 x (its radius + yours) and goes Idle facing you. The hit test reaches 1.3 x that sum. Numbers in `G.Enemies.CONTACT = { stop, hit }`.
- Applies to: plain chasers, a charger while walking, a flanker while striking. Not to: bosses (both stay 1.0), the charger's dash, jumpers, bombers.
- Your 0.45 s invulnerability and each enemy's 0.55 s touch cooldown are unchanged, so total melee damage is the same; only the overlap and the sprite flicker go away.

### 4. Flanker (replaces the runner)
- Selection: per tier the fastest non-Tank PLAIN and the fastest non-Tank SHOOTER get `def.flanker` (was: fastest plain or charger). Charger, jumper, bomber, beamer, zoner, fan are never flankers. No speed bonus in the cast itself.
- Cap: at most 2 flanker individuals are ACTIVE at a time (`FLANK.cap`). Extra individuals of the species act as plain or shooter until a slot frees (re-checked every 2 s; an active one stays active until it dies).
- Speed: `max(own speed, min(own speed x mult, 2.0 x your speed))`. Approach mult 1.6, retreat mult 1.2 with the same formula (my reading of "retreat at 1.2x of that"; if you meant 1.2x of the already boosted approach speed, say so and it is a one-line change).
- Phases:
  1. Approach: every 0.5 s the area around you is cut into 8 wedges and enemies within 300 px are counted per wedge; the emptiest wins (ties go to the nearest wedge; the current wedge is kept unless the best is 2 or more emptier). It spirals in to an orbit ring at 140 px (outside the crowd) while circling toward the wedge, then, once within 0.35 rad of the wedge centre, dives to its stand point. Melee flanker stand point: 130 px from you (just outside your melee reach). Shooter flanker stand point: the middle of the shooter band (0.86 screens) on that wedge.
  2. Strike: melee = dives in, the contact gap stops it, and it lands ONE hit at 1.2x the final damage. If your invulnerability swallows it, it holds beside you and retries for up to 1.5 s (the timer starts when it reaches you). Shooter = ONE shot at 1.2x, life 4.8 s.
  3. Retreat: runs straight away from you to 1.15 screens (just off screen) at the retreat speed.
  4. Rest: waits 1.5 s at the edge (`FLANK.rest`, a small addition, see Notes), then approaches again with a fresh wedge pick.
- During approach and retreat an active flanker does no contact damage. The old lead-intercept is deleted.
- Damage multiplier: applied to the FINAL damage (after the defense step), via `atk.mul` in `Player.hurt`. Scaling the attack factor would barely change anything (the "+2" dominates at low level).

## Constants (one table each, in enemies.js)
| table | values |
|---|---|
| SHOT_LIFE | base 2.4 s; shooter 4.8 s |
| SEEK | floor 0.30, alone 0.55, scanR 420, every 0.75, sample 8, switchBy 2, stopK 0.4, weakShot 0.5, weakMelee 0.5, shotCd 2.5, shotS 0.95, meleeGap 30 |
| CONTACT | stop 1.15, hit 1.3 |
| FLANK | cap 2, approach 1.6, strike 1.2, retreat 1.2, maxVsPlayer 2.0, sectors 8, scanR 300, recheck 0.5, switchBy 2, orbit 140, meleeStand 130, alignTol 0.35, hold 1.5, edge 1.15, maxRetreat 5, rest 1.5 |

## Notes and small additions beyond what Jess specified
- `FLANK.rest` 1.5 s is mine. Without it a shooter flanker's "edge" is only about 0.3 screens from its band, so it re-approached at once and fired every 1.7 s (more than a normal shooter at 1.2x damage). With the rest its cycle is about 3.2 s, so about 0.3 shots/s against a normal shooter's 0.45. Set `rest: 0` to match the spec to the letter.
- Retreat target is 1.15 screens (just off screen) instead of 1.0, for the same reason.
- The melee flanker's whole cycle in the simulation (crowd of 10 hugging you) was about 8 s with 1 hit per cycle, so its damage is below a plain unit's; its value is the surprise from the empty side. Raise `strike` first if it feels weak.
- Log: the IN line tag is now `+flanker` (flag bit 8 = ACTIVE flanker, not just the species), `G.Log.cast()` and the CAST row say `flanker`, `G.Log.bands()` shows `floor 0.3` for shielder and healer. The `neutral` figure on an IN line now includes the multiplier (a healer's touch shows half of a plain unit's neutral). No new log fields.
- Co-op: flanker and seeker state live on the host's enemies only; copies just follow positions. Shots carry `mul` locally; remote copies of a shot only display. Not tested in co-op.
- Not changed: boss movement and damage, hazards, the charger, jumper, bomber, summoner band.

## Tests (offline, patched copy, real game files with stubs for rendering)
- 300 random casts: every flanker is the fastest non-Tank plain or shooter of its tier, never more than 2 per tier, none violating class or Tank.
- Contact gap: a plain chaser stops at 26.8 px against 27.6 expected (1.15 x 24) and still hits 12 times in 10 s.
- Melee flanker with 10 enemies hugging you on one side: picked the empty side, circled at about 140 px, dove, hit at x1.2 and ran off, repeating about every 8 s. Shooter flanker: stood at the band on the chosen wedge, fired single x1.2 shots with life 4.8, cycle about 3.2 s.
- 5 flanker-species units spawned together: exactly 2 active.
- Shielder and healer starting 400 px away walked to the group, never closer than 0.34 screens (floor 0.30), finished with all 8 allies inside their effect radius, and fired weak (x0.5) shots every 2.5 s.
- Shot life: shooter 4.8, fan 2.4, status 2.4.
- NOT tested: browser rendering, animation look, co-op, real walls and obstacles (the stub world never collides), real player `hurt` with the multiplier (read, not run).

## Decisions for Jess
- A. Approve and apply as written?
- B. `FLANK.rest` 1.5 s and the 1.15 retreat edge: keep, or set `rest: 0` and `edge: 1.0` for the letter of the spec?
- C. Retreat speed: same formula at 1.2 (as written) or 1.2x of the boosted approach speed?

## Files
| file | change |
|---|---|
| `js/data/enemies.js` | flanker selection; `BANDS` loses shielder and healer; new `SEEK`, `CONTACT`, `FLANK`, `SHOT_LIFE`, `SHOT_LIFE_BASE`; header comment. |
| `js/entities/enemy.js` | `cls`, `fl`, seeker state; runner block removed; `shoot()` takes `life` and `mul`; `shotLife()`, `isSeeker()`, `meleeWalker()`, `contactMul()`, `bandPx()`; `seekPick()`, `seekMove()`; `flankCheck()`, `flankSector()`, `flankPick()`, `flankStruck()`, `flankMove()`; contact-gap stop; healer cast moved into `seekMove`. |
| `js/systems/combat.js` | contact reach 1.3x for non-bosses; flanker only hits in its strike phase and waits out i-frames; `mul` passed on contact and shot hits; `flankStruck()` after a landed hit. |
| `js/entities/player.js` | `atk.mul` applied to the damage after the defense step (and to the logged neutral). |
| `js/systems/log.js` | runner renamed flanker in tags, flag bit 8 and `cast()`; `bands()` floor label. |

## Diffs
```diff
diff -ruN a/js/data/enemies.js b/js/data/enemies.js
--- a/js/data/enemies.js	2026-10-18 14:08:19.322977335 +0000
+++ b/js/data/enemies.js	2026-10-18 14:11:09.606962445 +0000
@@ -23,8 +23,9 @@
  *   fan      shoots in a fan
  *   jumper   jumps and lands on you (the landing shows on the ground first)
  *   status   (slice 2) applies sleep / paralysis / slow to you, or hastes its allies
- *   runner   not a class: a flag on the fastest plain or charger of each tier's cast, at its own
- *            speed. It goes where you are going to be (cuts off whoever only flees).
+ *   flanker  not a class: a flag on the fastest plain and the fastest shooter (never a Tank) of each tier's cast.
+ *            At most FLANK.cap of them act as flankers at a time: they curve round to the emptiest side of you,
+ *            strike once and run to the screen edge (Enemy.flankMove). The rest of the species act as plain / shooter.
  *
  * Every species' class comes from the generated table js/data/enemy-classes.js (G.ENEMY_CLASSES).
  * The warned attacks are in systems/hazards.js.
@@ -192,10 +193,11 @@
       list: castFor(tier, ti).map(p => defFor(p, tier, ti))
     }));
     for (const tier of cast) {
-      // Runner: the fastest plain or charger of the cast (relative, no speed multiplier), never a tank.
-      const fast = tier.list.filter(d => (d.behavior === 'chase' || d.behavior === 'charger') && !d.tank);
-      const r = fast.sort((a, b) => b.spd - a.spd)[0];
-      if (r) r.runner = true;
+      // Flanker: the fastest plain and the fastest shooter of the cast (own speed, no multiplier), never a tank.
+      for (const k of ['plain', 'shooter']) {
+        const f = tier.list.filter(d => classOf(G.DEX_BY[d.dex]) === k && !d.tank).sort((a, b) => b.spd - a.spd)[0];
+        if (f) f.flanker = true;
+      }
     }
     const used = new Set();
     bosses = BOSS_SLOTS.map(slot => {
@@ -288,10 +290,41 @@
   // [retreat below, approach above]; in between the unit holds. Keyed by behavior id, so status species share the
   // shooter band ('ranged') until slice 2. Tuned by playtest: change the numbers here, nowhere else.
   const BANDS = { fan: [0.30, 0.40], beamer: [0.50, 0.62], zoner: [0.72, 0.82], ranged: [0.80, 0.92],
-                  shielder: [0.45, 0.58], healer: [0.70, 0.82], summoner: [0.70, 0.82] };
+                  summoner: [0.70, 0.82] };
+
+  // Shielder and healer hold no band: they seek the biggest group of allies (Enemy.seekMove / seekPick). Screen units.
+  //   floor      never closer to you than this (backs away at 0.8x below it)
+  //   alone      with no allies in sight they approach to this and hold
+  //   scanR/every/sample/switchBy   look for allies within scanR px every `every` s, test the `sample` nearest as group centres,
+  //              and only change target when the new group has `switchBy` more allies in reach
+  //   stopK      they stop once within stopK x their effect radius of the group centre
+  //   weakShot / weakMelee   damage multipliers (on the final damage) of their shot and of touching you; shotCd between
+  //              shots; the shot only fires within shotS of you and while you are not in touching range (meleeGap px more)
+  const SEEK = { floor: 0.30, alone: 0.55, scanR: 420, every: 0.75, sample: 8, switchBy: 2, stopK: 0.4,
+                 weakShot: 0.5, weakMelee: 0.5, shotCd: 2.5, shotS: 0.95, meleeGap: 30 };
+
+  // Melee contact: a walker stops at `stop` x (its radius + yours); the hit test reaches `hit` x that sum.
+  const CONTACT = { stop: 1.15, hit: 1.3 };
+
+  // Flanker. Speed = max(own speed, min(own speed x mult, maxVsPlayer x your speed)): lifts slow species, never slows fast ones.
+  //   approach / retreat   speed multipliers (1.6 curving round, 1.2 running off)
+  //   strike               damage multiplier of its single attack (on the final damage)
+  //   sectors / scanR / recheck / switchBy   the area around you is cut into `sectors` wedges; enemies within scanR px are
+  //              counted every `recheck` s and the emptiest wedge wins (a new one must be `switchBy` emptier to replace it)
+  //   orbit / meleeStand / alignTol   it circles you at `orbit` px (outside the crowd), melee flankers dive in to
+  //              `meleeStand` px (just outside your melee reach); alignTol = radians of the wedge it must face before diving
+  //   hold       seconds a melee flanker, once next to you, waits for your hit-invulnerability to end before giving up
+  //   edge / maxRetreat   it runs until `edge` screens from you (1.0 = the screen edge, 1.15 = just off it), or gives up after maxRetreat s
+  //   rest       seconds it waits at the edge before the next approach (0 = straight back; a shooter's edge is close to its band)
+  const FLANK = { cap: 2, approach: 1.6, strike: 1.2, retreat: 1.2, maxVsPlayer: 2.0, sectors: 8, scanR: 300, recheck: 0.5,
+                  switchBy: 2, orbit: 140, meleeStand: 130, alignTol: 0.35, hold: 1.5, edge: 1.15, maxRetreat: 5, rest: 1.5 };
+
+  // Enemy shot life in seconds by class (shot speed stays 190 px/s). Anything not listed keeps SHOT_LIFE_BASE.
+  // Bosses, fans and everything else call shoot() with the base life.
+  const SHOT_LIFE_BASE = 2.4, SHOT_LIFE = { shooter: 4.8 };
 
   return {
-    TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion, classOf, minionFromCast, BANDS,
+    TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion, classOf, minionFromCast, BANDS, SEEK, CONTACT, FLANK, SHOT_LIFE, SHOT_LIFE_BASE,
     get region() { return region; },           // null = full dex (Paldea-equiv); else gen 1-9
     enemyHp, levelForTime,
     get BOSSES() { if (!bosses) rollRun(); return bosses; },
diff -ruN a/js/entities/enemy.js b/js/entities/enemy.js
--- a/js/entities/enemy.js	2026-10-18 14:08:19.348977332 +0000
+++ b/js/entities/enemy.js	2026-10-18 14:11:09.607962445 +0000
@@ -12,6 +12,8 @@
  */
 (() => {
   let nextId = 1;
+  /** Signed difference a - b of two angles, in [-PI, PI). */
+  const angDiff = (a, b) => ((a - b + Math.PI) % 6.2832 + 6.2832) % 6.2832 - Math.PI;
   /** Bosses are enlarged up to ~110 tall, based on how big their sprite already is. */
   function bossScale(dex) {
     const m = G.Sprites.animMeta(dex, 'Idle');
@@ -91,6 +93,10 @@
       // Stragglers: if they fall behind, out of sight, while you flee,
       // come back out ahead (see EnemyMgr.update).
       this.lagT = 0;
+      // Class from the table (null for bosses); active flanker state (flankCheck); crowd-seeking state (seekMove).
+      this.cls = boss || !G.DEX_BY[def.dex] ? null : G.Enemies.classOf(G.DEX_BY[def.dex]);
+      this.fl = null; this.flT = 0;
+      this.seekT = 0; this.seekTarget = null; this.weakCd = G.U.rand(1, G.Enemies.SEEK.shotCd);
     }
 
     cy() { return this.y; }
@@ -310,12 +316,8 @@
         this.anim.loop('Walk', 1.4);
         return;
       }
-      // Runner: it goes where you ARE GOING to be (it cuts you off if you only flee).
-      if (this.def.runner && pl._vx != null) {
-        const lead = G.U.clamp(dist / Math.max(60, spd), 0, 1.4);
-        [dx, dy] = G.U.norm(pl.x + pl._vx * lead - this.x, pl.y + pl._vy * lead - this.y);
-        if (G.Camera.sees(this.x, this.y, 0) && Math.random() < dt * 10) G.FX.px(this.x - dx * 8 + G.U.rand(-4, 4), this.y, '#e8dcc0', { vy: -12, life: 0.35 });
-      }
+      // Flanker: only a few individuals of the species are active at a time (FLANK.cap).
+      if (this.def.flanker && !this.boss) this.flankCheck(dt);
 
       // --- personality (shields, jumps, explosion) ---
       if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shield = 0;
@@ -345,7 +347,7 @@
       }
 
       // Path around the obstacles (the ones that do not fly).
-      if (!this.flying && this.phase !== 'dash' && this.sideT <= 0) {
+      if (!this.flying && this.phase !== 'dash' && this.sideT <= 0 && !this.fl && !this.isSeeker()) {
         const pd = G.Path.dirFor(this, pl);
         // Inside its band a unit moves straight (no path-following); bosses keep the old range test.
         const near = band ? s < band[1] : this.keepsDistance() && dist < (this.def.range || 200) * 0.82;
@@ -357,6 +359,10 @@
 
       if (this.boss) {
         [vx, vy, animBase] = this.bossMove(dt, pl, dist, dx, dy, spd);
+      } else if (this.fl) {
+        [vx, vy, animBase] = this.flankMove(dt, pl, spd, dist);
+      } else if (this.isSeeker()) {
+        [vx, vy, animBase] = this.seekMove(dt, pl, spd, dist);
       } else if (this.behavior === 'charger') {
         this.pt -= dt;
         if (this.phase === 'walk') {
@@ -381,7 +387,6 @@
         }
       } else if (band) {
         // Spacing band (slice 1b): approach beyond band[1], hold between the two numbers, back away (0.8x) below band[0].
-        // The shielder moves with its band but never shoots: only keepsDistance() classes fire.
         // Straight toward you (not the path) to move away.
         const [ddx, ddy] = G.U.norm(pl.x - this.x, pl.y - this.y);
         if (s < band[0]) {
@@ -399,6 +404,9 @@
         }
       }
 
+      // Contact gap: a melee walker stops a little short of overlapping you; the hit test (combat.js) reaches farther.
+      if (this.meleeWalker() && dist <= (this.r + pl.r) * G.Enemies.CONTACT.stop) { vx = 0; vy = 0; }
+
       // --- integration ---
       const ox = this.x, oy = this.y;
       this.x += this.kx * dt; this.y += this.ky * dt;
@@ -568,7 +576,7 @@
       return [0, 0, 'Idle'];
     }
 
-    keepsDistance() { return ['ranged', 'fan', 'beamer', 'zoner', 'healer', 'summoner'].includes(this.behavior); }
+    keepsDistance() { return ['ranged', 'fan', 'beamer', 'zoner', 'summoner'].includes(this.behavior); }
 
     /** Spacing band [retreat below, approach above] in screen units, or null. Bosses keep their own movement. */
     bandOf() { return this.boss ? null : (G.Enemies.BANDS[this.behavior] || null); }
@@ -578,15 +586,178 @@
 
     shotDmg() { return (this.def.shotDmg || 10) * (this.dmg / this.def.dmg); }
 
+    /** Life (seconds) of this enemy's normal shot: by class, see G.Enemies.SHOT_LIFE. */
+    shotLife() { return (this.cls && G.Enemies.SHOT_LIFE[this.cls]) || G.Enemies.SHOT_LIFE_BASE; }
+
+    /** Shielder and healer: they seek the biggest group of allies instead of holding a band. */
+    isSeeker() { return !this.boss && (this.behavior === 'shielder' || this.behavior === 'healer'); }
+
+    /** Walkers that stop at the contact gap: plain chasers, a charger while walking, a flanker only while striking. */
+    meleeWalker() {
+      if (this.boss) return false;
+      if (this.fl) return this.fl.ph === 'strike' && this.behavior === 'chase';
+      return this.behavior === 'chase' || (this.behavior === 'charger' && this.phase === 'walk');
+    }
+
+    /** Multiplier on the FINAL damage of this enemy's touch (combat.js): weak support melee, the flanker's strike. */
+    contactMul() {
+      if (this.fl) return G.Enemies.FLANK.strike;
+      if (this.isSeeker()) return G.Enemies.SEEK.weakMelee;
+      return 1;
+    }
+
+    /** Pixels from you, along direction `a`, of the middle of the shooter band (screen units to pixels). */
+    bandPx(a) {
+      const b = G.Enemies.BANDS.ranged;
+      return ((b[0] + b[1]) / 2) / Math.hypot(Math.cos(a) / (G.Camera.w / 2), Math.sin(a) / (G.Camera.h / 2));
+    }
+
+    // ---------------- crowd-seeking support (shielder, healer) ----------------
+
+    /** Picks the group of allies to stand by: the one with most allies inside its effect radius (healer: most WOUNDED). */
+    seekPick() {
+      const K = G.Enemies.SEEK, heal = this.behavior === 'healer', R = heal ? 150 : 160;
+      let pool = G.EnemyMgr.queryCircle(this.x, this.y, K.scanR).filter(e => !e.dead && !e.boss && e !== this && !(heal && e.behavior === 'healer'));
+      const hurt = heal ? pool.filter(e => e.hp < e.maxHp) : pool;
+      if (hurt.length) pool = hurt;           // healer with nobody wounded just stays with the crowd
+      if (!pool.length) { this.seekTarget = null; return; }
+      const score = c => { let n = 0; for (const e of pool) if (G.U.dist2(e.x, e.y, c.x, c.y) <= R * R) n++; return n; };
+      const cand = pool.slice().sort((a, b) => G.U.dist2(a.x, a.y, this.x, this.y) - G.U.dist2(b.x, b.y, this.x, this.y)).slice(0, K.sample);
+      let best = null, bs = -1;
+      for (const c of cand) { const sc = score(c); if (sc > bs) { bs = sc; best = c; } }
+      const cur = this.seekTarget && !this.seekTarget.dead && pool.includes(this.seekTarget) ? this.seekTarget : null;
+      if (!cur || bs - score(cur) >= K.switchBy) this.seekTarget = best;
+    }
+
+    /** Shielder / healer movement and attacks. Returns [vx, vy, anim]. */
+    seekMove(dt, pl, spd, dist) {
+      const K = G.Enemies.SEEK, s = this.screenDist(pl);
+      this.seekT -= dt;
+      if (this.seekT <= 0) { this.seekT = K.every; this.seekPick(); }
+      const tg = this.seekTarget && !this.seekTarget.dead ? this.seekTarget : null;
+      const [px, py] = G.U.norm(pl.x - this.x, pl.y - this.y);           // toward you
+      let vx = 0, vy = 0;
+      if (s < K.floor) { vx = -px * spd * 0.8; vy = -py * spd * 0.8; }   // too close: back away
+      else if (tg) {
+        const [tx, ty] = G.U.norm(tg.x - this.x, tg.y - this.y);
+        const R = this.behavior === 'healer' ? 150 : 160;
+        const intoFloor = s < K.floor * 1.15 && tx * px + ty * py > 0;   // the group is on your side of the floor: wait
+        if (!intoFloor && G.U.dist(this.x, this.y, tg.x, tg.y) > R * K.stopK) { vx = tx * spd; vy = ty * spd; }
+      } else if (s > K.alone) { vx = px * spd; vy = py * spd; }          // no allies in sight: stand off at `alone`
+      if ((vx || vy) && this.sideT > 0) {
+        const a = Math.atan2(vy, vx) + this.side * 1.25, m = Math.hypot(vx, vy);
+        vx = Math.cos(a) * m; vy = Math.sin(a) * m;
+      }
+      if (this.behavior === 'healer') {
+        this.shotCd -= dt;
+        if (this.shotCd <= 0) { this.shotCd = this.def.shotCd || 2; this.healAround(); }
+      }
+      // Weak shot from range; touching you is the weak melee (combat.js, contactMul). Never both at once.
+      this.weakCd -= dt;
+      if (this.weakCd <= 0 && s < K.shotS && dist > this.r + pl.r + K.meleeGap) {
+        this.weakCd = K.shotCd;
+        this.shoot(px, py, 0, 1, 1, G.Enemies.SHOT_LIFE_BASE, K.weakShot);
+      }
+      return [vx, vy, vx || vy ? 'Walk' : 'Idle'];
+    }
+
+    // ---------------- flanker ----------------
+
+    /** An individual becomes an ACTIVE flanker only while fewer than FLANK.cap are alive; the rest act as their base class. */
+    flankCheck(dt) {
+      if (this.fl) return;                    // once active it stays active until it dies
+      this.flT -= dt;
+      if (this.flT > 0) return;
+      this.flT = 2;
+      let n = 0;
+      for (const e of G.EnemyMgr.all()) if (e.fl && !e.dead) n++;
+      if (n < G.Enemies.FLANK.cap) this.fl = { ph: 'approach', sector: -1, scanT: 0, t: 0, holdT: 0 };
+    }
+
+    /** Enemies around you per wedge, within FLANK.scanR (it does not count itself). */
+    flankSector(pl) {
+      const F = G.Enemies.FLANK, cnt = new Array(F.sectors).fill(0);
+      for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, F.scanR)) {
+        if (e === this || e.dead) continue;
+        cnt[Math.floor((Math.atan2(e.y - pl.y, e.x - pl.x) + Math.PI) / 6.2832 * F.sectors) % F.sectors]++;
+      }
+      return cnt;
+    }
+
+    /** Chooses the emptiest wedge; keeps the current one unless the best is FLANK.switchBy emptier. */
+    flankPick(pl) {
+      const F = G.Enemies.FLANK, fl = this.fl, cnt = this.flankSector(pl);
+      const me = Math.atan2(this.y - pl.y, this.x - pl.x);
+      let best = 0, bs = Infinity;
+      for (let k = 0; k < cnt.length; k++) {
+        const c = -Math.PI + (k + 0.5) * 6.2832 / F.sectors;
+        const score = cnt[k] + Math.abs(angDiff(c, me)) * 0.01;         // fewest first, the nearer wedge breaks ties
+        if (score < bs) { bs = score; best = k; }
+      }
+      if (fl.sector < 0 || cnt[fl.sector] - cnt[best] >= F.switchBy) fl.sector = best;
+    }
+
+    /** Called by combat.js when its strike landed: now it runs. */
+    flankStruck() { this.fl.ph = 'retreat'; this.fl.t = 0; }
+
+    /**
+     * Phases: approach (curve round to the emptiest wedge, then dive to its stand point) > strike (ONE attack: a hit for
+     * a melee flanker, waiting out your invulnerability up to FLANK.hold s; one shot for a shooter) > retreat (run to the
+     * screen edge) > rest (FLANK.rest s) > approach again. Returns [vx, vy, anim].
+     */
+    flankMove(dt, pl, spd, dist) {
+      const F = G.Enemies.FLANK, fl = this.fl, shooter = this.behavior === 'ranged';
+      const speedAt = m => Math.max(spd, Math.min(spd * m, F.maxVsPlayer * (pl.spd || spd)));
+      const ix = (pl.x - this.x) / (dist || 1), iy = (pl.y - this.y) / (dist || 1);     // toward you
+      const ang = Math.atan2(this.y - pl.y, this.x - pl.x);                              // where it stands around you
+      let vx = 0, vy = 0, sp = speedAt(F.approach);
+      fl.t += dt;
+      if (fl.ph === 'approach') {
+        fl.scanT -= dt;
+        if (fl.sector < 0 || fl.scanT <= 0) { fl.scanT = F.recheck; this.flankPick(pl); }
+        const th = -Math.PI + (fl.sector + 0.5) * 6.2832 / F.sectors;
+        const stand = shooter ? this.bandPx(th) : F.meleeStand;
+        const dth = angDiff(th, ang), aligned = Math.abs(dth) < F.alignTol;
+        // Not yet on its side: spiral inward to the orbit ring while circling toward the wedge. On it: dive to the stand point.
+        const wantR = aligned ? stand : Math.max(stand, F.orbit);
+        const wr = G.U.clamp((dist - wantR) / 80, -1, 1), sg = dth >= 0 ? 1 : -1, wt = aligned ? 0 : 1;
+        const mx = ix * wr - Math.sin(ang) * sg * wt, my = iy * wr + Math.cos(ang) * sg * wt, m = Math.hypot(mx, my) || 1;
+        vx = mx / m * sp; vy = my / m * sp;
+        if (aligned && dist <= stand + 30) { fl.ph = 'strike'; fl.t = 0; fl.holdT = F.hold; }
+      } else if (fl.ph === 'strike') {
+        if (shooter) {
+          this.shoot(ix, iy, 0, 1, 1, this.shotLife(), F.strike);
+          fl.ph = 'retreat'; fl.t = 0;
+        } else {
+          vx = ix * sp; vy = iy * sp;            // dive on you; the contact gap stops it and combat.js lands the hit
+          // The hold timer only runs once it is next to you; fl.t also caps the dive itself.
+          if (dist <= (this.r + pl.r) * G.Enemies.CONTACT.hit + 2) fl.holdT -= dt;
+          if (fl.holdT <= 0 || fl.t > F.hold + 3) { fl.ph = 'retreat'; fl.t = 0; }
+        }
+      } else if (fl.ph === 'rest') {
+        if (fl.t >= F.rest) { fl.ph = 'approach'; fl.sector = -1; fl.scanT = 0; fl.t = 0; }
+      } else {
+        sp = speedAt(F.retreat);
+        vx = -ix * sp; vy = -iy * sp;
+        if (this.screenDist(pl) >= F.edge || fl.t > F.maxRetreat) { fl.ph = 'rest'; fl.t = 0; }
+      }
+      if ((vx || vy) && this.sideT > 0) {
+        const a = Math.atan2(vy, vx) + this.side * 1.25, m = Math.hypot(vx, vy);
+        vx = Math.cos(a) * m; vy = Math.sin(a) * m;
+      }
+      if ((vx || vy) && G.Camera.sees(this.x, this.y, 0) && Math.random() < dt * 10) G.FX.px(this.x - vx / sp * 8 + G.U.rand(-4, 4), this.y, '#e8dcc0', { vy: -12, life: 0.35 });
+      return [vx, vy, vx || vy ? 'Walk' : 'Idle'];
+    }
+
     /** Normal enemy shot (one, or several in a fan). */
-    shoot(ax, ay, spread = 0, n = 1, k = 1) {
+    shoot(ax, ay, spread = 0, n = 1, k = 1, life = G.Enemies.SHOT_LIFE_BASE, mul = 1) {
       const sp = 190, type = this.atkType;
       const base = Math.atan2(ay, ax);
       for (let i = 0; i < n; i++) {
         const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
         const shot = G.Projectiles.spawn({
           x: this.x, y: this.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
-          dmg: this.shotDmg() * k, r: 7, life: 2.4, friendly: false, color: '#ff7a9e', mtype: type,
+          dmg: this.shotDmg() * k, r: 7, life, mul, friendly: false, color: '#ff7a9e', mtype: type,
           atkFactor: this.atkFactor, atkCat: this.atkCat, src: this,
           vis: G.VFX.forType(type)
         });
@@ -616,9 +787,8 @@
           this.anim.play('Shoot');
           break;
         }
-        case 'healer': this.healAround(); break;
         case 'summoner': this.summon(); break;
-        default: this.shoot(dx, dy);
+        default: this.shoot(dx, dy, 0, 1, 1, this.shotLife());
       }
     }
 
diff -ruN a/js/entities/player.js b/js/entities/player.js
--- a/js/entities/player.js	2026-10-18 14:08:19.386977329 +0000
+++ b/js/entities/player.js	2026-10-18 14:09:09.425972954 +0000
@@ -257,14 +257,14 @@
     // damage via this player's base Def/SpD matching the attack category. Non-enemy damage
     // (atk == null: terrain, lava, altar, judgment, DoT) keeps `amount` as-is.
     if (atk && !pure) {
-      const st = this.mon.stats;
+      const st = this.mon.stats, mul = atk.mul || 1;     // mul: weak support / flanker strike, on the final damage
       const defB = st ? st[2] : 50, spdB = st ? st[4] : 50;
       if (LOG) {
-        neutral = (atk.factor / 50 + 2) * G.Stats.ENEMY_DMG_SCALAR;
+        neutral = (atk.factor / 50 + 2) * G.Stats.ENEMY_DMG_SCALAR * mul;
         cat = atk.cat === 'special' ? 1 : 0;
         dStat = cat === 1 ? G.Stats.spDef(spdB, this.level) : G.Stats.defense(defB, this.level);
       }
-      amount = G.Stats.applyPlayerDefense(amount, defB, spdB, atk.cat, this.level);
+      amount = G.Stats.applyPlayerDefense(amount, defB, spdB, atk.cat, this.level) * mul;
     }
     const afterDef = amount;
     let eff = null, tk = 1, wk = 1;
diff -ruN a/js/systems/combat.js b/js/systems/combat.js
--- a/js/systems/combat.js	2026-10-18 14:08:19.368977331 +0000
+++ b/js/systems/combat.js	2026-10-18 14:09:09.425972954 +0000
@@ -585,7 +585,7 @@
         }
         if (G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) * (p.r + pl.r)) {
           const w = G.Log.on ? G.Log.who(p.src, 'shot') : null;
-          if (p.atkFactor != null) pl.hurt(p.atkFactor, p.mtype, false, { factor: p.atkFactor, cat: p.atkCat }, w);
+          if (p.atkFactor != null) pl.hurt(p.atkFactor, p.mtype, false, { factor: p.atkFactor, cat: p.atkCat, mul: p.mul }, w);
           else pl.hurt(p.dmg, p.mtype, false, null, w);
           G.FX.burst(p.x, p.y - G.LIFT, p.color, 7, 110);
           projectiles.splice(i, 1);
@@ -697,14 +697,19 @@
     // --- enemy <-> player contact ---
     if (pl.dead) return;
     for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, pl.r + 40)) {
-      if (G.U.dist2(e.x, e.y, pl.x, pl.y) > (e.r + pl.r) * (e.r + pl.r)) continue;
+      // Contact gap: wild melee reaches CONTACT.hit x the radius sum (it stops at CONTACT.stop x); bosses keep 1.0.
+      const reach = (e.r + pl.r) * (e.boss ? 1 : G.Enemies.CONTACT.hit);
+      if (G.U.dist2(e.x, e.y, pl.x, pl.y) > reach * reach) continue;
       if (e.touchCd > 0 || e.behavior === 'thief') continue;
+      // An active flanker only hits in its strike phase, and waits out your invulnerability instead of wasting the hit.
+      if (e.fl && (e.fl.ph !== 'strike' || pl.invuln > 0)) continue;
       e.touchCd = 0.55;
       e.strike(pl);
       // Wild: enemy attack factor + category via the A/D ratio. Boss: flat def.dmg (deferred).
       const w = G.Log.on ? G.Log.who(e, 'contact') : null;
-      if (e.atkFactor != null) pl.hurt(e.atkFactor, e.atkType, false, { factor: e.atkFactor, cat: e.atkCat }, w);
+      if (e.atkFactor != null) pl.hurt(e.atkFactor, e.atkType, false, { factor: e.atkFactor, cat: e.atkCat, mul: e.contactMul() }, w);
       else pl.hurt(e.dmg, e.atkType, false, null, w);
+      if (e.fl) e.flankStruck();
       if (pl.hasItem('rockyhelmet')) e.hurt(15 + pl.level * 4, '#9aa6b5', e.x - pl.x, e.y - pl.y, 80);
       const [nx, ny] = G.U.norm(e.x - pl.x, e.y - pl.y);
       e.kx += nx * 150; e.ky += ny * 150;
diff -ruN a/js/systems/log.js b/js/systems/log.js
--- a/js/systems/log.js	2026-10-18 14:08:19.404977327 +0000
+++ b/js/systems/log.js	2026-10-18 14:09:09.426972953 +0000
@@ -47,7 +47,7 @@
     const o = rec(HIT_IN), e = w && w.e;
     F[o] = e ? e.dex : 0; F[o + 1] = (e && e.atkLvl) || 0; F[o + 2] = S(w ? w.kind : 'flat');
     F[o + 3] = cat; F[o + 4] = neutral; F[o + 5] = dStat; F[o + 6] = afterDef; F[o + 7] = typeK; F[o + 8] = wxK;
-    F[o + 9] = red; F[o + 10] = close; F[o + 11] = fin; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = flags | (e && e.def && e.def.runner ? 8 : 0) | (e && e.boss ? 32 : 0);    // 8 = runner, 32 = boss
+    F[o + 9] = red; F[o + 10] = close; F[o + 11] = fin; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = flags | (e && e.fl ? 8 : 0) | (e && e.boss ? 32 : 0);    // 8 = active flanker, 32 = boss
     F[o + 15] = S(type);
     F[o + 16] = e ? e.spd : 0; F[o + 17] = myPx || 0;   // attacker and your px/s at the moment of the hit
     // Where the attacker stood relative to you, in screen units (1.0 = screen edge; for a shot, where the shooter is when it lands),
@@ -99,10 +99,10 @@
   const dexName = d => (G.DEX_BY[d] && G.DEX_BY[d].name) || (d ? '#' + d : 'env');
   const CAT = ['physical', 'special', 'status'];
 
-  // Class tag from the class table: " (shielder)", " (plain+tank)", " (charger+runner)". Empty for bosses and anything not in the table.
-  const tagOf = (dex, boss, runner) => {
+  // Class tag from the class table: " (shielder)", " (plain+tank)", " (shooter+flanker)". Empty for bosses and anything not in the table.
+  const tagOf = (dex, boss, flanker) => {
     const c = dex && !boss && G.ENEMY_CLASSES && G.ENEMY_CLASSES[dex];
-    return c ? ' (' + c.c + (c.t ? '+tank' : '') + (runner ? '+runner' : '') + ')' : '';
+    return c ? ' (' + c.c + (c.t ? '+tank' : '') + (flanker ? '+flanker' : '') + ')' : '';
   };
 
   function lineIn(v) {
@@ -180,7 +180,7 @@
   };
   api.cast = () => {
     const rows = [];
-    G.Enemies.cast.forEach((t, ti) => { for (const d of t.list) rows.push({ tier: ti + 1, species: d.name, class: G.Enemies.classOf(G.DEX_BY[d.dex]), tank: d.tank ? 'yes' : '', runner: d.runner ? 'yes' : '' }); });
+    G.Enemies.cast.forEach((t, ti) => { for (const d of t.list) rows.push({ tier: ti + 1, species: d.name, class: G.Enemies.classOf(G.DEX_BY[d.dex]), tank: d.tank ? 'yes' : '', flanker: d.flanker ? 'yes' : '' }); });
     console.table(rows);
     return rows;
   };
@@ -194,7 +194,7 @@
     const rows = Object.keys(by).map(k => {
       const a = by[k].sort((x, y) => x - y), b = B[k];
       return { behavior: k, n: a.length, min: +a[0].toFixed(2), median: +a[a.length >> 1].toFixed(2), max: +a[a.length - 1].toFixed(2),
-               band: b ? b[0] + ' to ' + b[1] : '-', inBand: b ? a.filter(x => x >= b[0] && x <= b[1] * 1.05).length : '-' };
+               band: b ? b[0] + ' to ' + b[1] : (k === 'shielder' || k === 'healer' ? 'floor ' + G.Enemies.SEEK.floor : '-'), inBand: b ? a.filter(x => x >= b[0] && x <= b[1] * 1.05).length : '-' };
     });
     console.table(rows);
     return rows;
@@ -203,7 +203,7 @@
     const rows = order(count).map(i => ({ t: +T[i].toFixed(2), kind: KIND_NAME[K[i]], text: fmt(i), v: Array.from(F.subarray(i * NF, i * NF + NF)) }));
     // First row: this run's cast with class and modifier flags, so a log can be read without the game open.
     rows.unshift({ t: 0, kind: 'CAST', v: [], text: 'region ' + (G.Enemies.region == null ? 'all' : G.Enemies.region) + '\n' +
-      G.Enemies.cast.map((t, ti) => 'T' + (ti + 1) + ': ' + t.list.map(d => d.name + ' (' + G.Enemies.classOf(G.DEX_BY[d.dex]) + (d.tank ? '+tank' : '') + (d.runner ? '+runner' : '') + ')').join(', ')).join('\n') });
+      G.Enemies.cast.map((t, ti) => 'T' + (ti + 1) + ': ' + t.list.map(d => d.name + ' (' + G.Enemies.classOf(G.DEX_BY[d.dex]) + (d.tank ? '+tank' : '') + (d.flanker ? '+flanker' : '') + ')').join(', ')).join('\n') });
     const a = document.createElement('a');
     a.href = URL.createObjectURL(new Blob([JSON.stringify(rows)], { type: 'application/json' }));
     a.download = 'pokesurvivor-log-' + Date.now() + '.json';
```
