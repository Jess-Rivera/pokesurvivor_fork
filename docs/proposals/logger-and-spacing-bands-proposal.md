# Proposal: dev logger additions + slice 1b (spacing bands)

Status: APPROVED AND APPLIED 2026-10-18 as written (Decision A: agreed numbers kept for the first playtest). Uncommitted, awaiting playtest. One approval covered both parts.
Branch suggestion: stay on `refactor/enemy-behavior` (slice 1 is committed there), or cut `refactor/enemy-spacing` off it. Jess runs git.
The diffs below are real: built on copies of the current tree, `node --check` clean, and `patch --dry-run` applies them to the real files.

## What it does

### Part A: dev logger (js/systems/log.js, dev-only, inert without ?dev)
Playtest 2026-10-18 showed the log cannot tell me which class an enemy was, who was a runner, or what the cast was. This adds, with no extra cost while you play:
- Class tag on every incoming-hit and kill line: `Kadabra L4.3 (shielder+runner) contact [psychic]`. Bosses and rift legendaries get no tag (they are not in the table). Tank shows as `+tank`, runner as `+runner`. The class comes from the table when the text is built, so recording stays numbers-only.
- Two new numbers on every incoming hit: where the attacker stood relative to you in screen units, and how many enemies were alive. Shown as `s 0.91, 41 alive`. (This closes the "live-enemy count per hit" gap in TODO.) For a shot, `s` is where the shooter is when the shot lands, not where it fired from.
- `G.Log.cast()`: console table of this run's cast, tier by tier, with class, Tank and Runner.
- `G.Log.bands()`: console table of where live enemies stand right now, by behavior (n, min, median, max in screen units, their band, how many are inside it). This is the direct check for part B.
- `G.Log.download()`: the JSON gets a first row `kind: "CAST"` with the region and the cast, so a log can be read without the game open.
- Record width goes from 18 to 20 floats (buffer 590 KB to 655 KB). Flag bits 8 (runner) and 32 (boss) are new in the hit flags; bits 1 and 4 are untouched.
- NOT in this part: burn and poison ticks are still unlogged (still open in TODO).

### Part B: slice 1b, per-class spacing bands (js/data/enemies.js, js/entities/enemy.js)
Implements DECISIONS 2026-10-18 "ranged and support spacing bands" exactly as agreed:
- Ranged and support units hold a distance band measured on screen (`s = hypot(dx / (Camera.w / 2), dy / (Camera.h / 2))`, 1.0 = the edge of the screen in that direction).
- They approach at full speed beyond the outer number, creep (10% speed, Idle) between the two numbers, and back away at 0.8x speed below the inner number.
- Band numbers live in ONE table, `G.Enemies.BANDS` (enemies.js), keyed by behavior id. Tuning later is a one-line change there.
- The shooting and ability gate follows the band: a unit fires or casts when `s < outer x 1.05`, no longer when `dist < def.range`. The healer and summoner therefore keep working at their band depth.
- The shielder gets a band for movement only. It never fires: only the `keepsDistance()` classes enter the shot branch, so its shield stays on its own 6 s timer.
- Status species share the shooter band (they are `ranged` behaviors until slice 2).
- Cornered fix: when the stuck side-step is active (`sideT > 0`), the retreat direction is rotated by `side x 1.25`, the same way the chase direction already is, so a unit slides along a wall instead of pushing into it.
- Path-following is switched off inside the band (as it was inside `range x 0.82`), so units move straight when holding or backing away.
- Bosses and rift legendaries are untouched: `bandOf()` returns null for them, so they keep `bossMove` and the old `def.range` cutoff on the path test. `def.range` is still set in enemies.js and is still read for bosses, so nothing was removed.

| behavior id | class | retreats below | approaches above | 16:9 sideways px | 16:9 up/down px |
|---|---|---|---|---|---|
| fan | fan | 0.30 | 0.40 | 115 to 154 | 65 to 86 |
| beamer | beamer | 0.50 | 0.62 | 192 to 238 | 108 to 134 |
| zoner | zoner | 0.72 | 0.82 | 276 to 315 | 156 to 177 |
| ranged | shooter, status | 0.80 | 0.92 | 307 to 353 | 173 to 199 |
| shielder | shielder (movement only) | 0.45 | 0.58 | 173 to 223 | 97 to 125 |
| healer | healer | 0.70 | 0.82 | 269 to 315 | 151 to 177 |
| summoner | summoner | 0.70 | 0.82 | 269 to 315 | 151 to 177 |

(768 x 432 view: half-width 384, half-height 216. Taller or wider windows change the pixel values, not the screen fractions.)

## Open checks from the 1b design, now answered
1. **Readers of `def.range`:** only `enemy.js` (the path cutoff and the keeps-distance block, both replaced for non-bosses) and `combat.js:390`, which reads the PLAYER move's own `m.range` for homing, unrelated. Bosses reach the old cutoff on the path test only (kept). Nothing else reads it.
2. **Player weapon reach (the finding to decide on, see Decision A).** The player auto-targets the nearest enemy within a reach that depends on the move kind (`combat.js` `reach()`): melee about 90 to 115 px, dash 170 to 180, cone (Flamethrower, Bubble Beam) about 185 to 190, beam 235 to 270, chain 280, meteor 340, projectile 520. A stationary player sees units settle at the INNER edge of a band, because the hold zone creeps inward at 10%. So shooters sit at about 307 px sideways and 173 px up or down. Only projectile, meteor and turret kits reach them sideways; cone, beam and dash kits reach them only roughly above or below you; melee never does. Today shooters hold at about 156 to 176 px in every direction (cone and beam can reach those), and melee already has to chase. Shooters back away at 0.8x their speed, so a chaser only gains on them if it is faster than that: Psyduck backs off at about 74 px/s and Squirtle (76) barely gains, Horsea backs off at about 79 and Squirtle never catches it, Charmander (107) catches both.
3. **Screen sizes:** the view is 768 wide whenever the window is 16:9 or narrower, so a tall window or a phone in portrait has a taller `Camera.h`, and units stand proportionally further up and down. An ultra-wide window fixes the height at 420 and widens the sideways distance. Bands are screen fractions, so they follow the window; weapon reach does not.

## Decisions for Jess
- **A. Shooter and zoner depth (the reach finding).** Keep the agreed numbers for the first playtest (recommended: it is the real test of "shooters stand at the edge", and one line to change), or pull them in now: shooter 0.62 / 0.74 (238 to 284 px sideways, 134 to 160 up or down) and zoner 0.58 / 0.70. If the agreed numbers feel like unkillable edge-sitters for beam, cone or melee kits, the second set is the fallback.
- **B. Runner and shielder tweaks.** Jess said both need tweaking after the slice 1 playtest but not what. The shielder's movement is covered by this part (it stops walking into you). Anything else about the shielder (its shield size, cooldown, whether it should still touch you), and everything about the runner (lead time, how fast, which species), is waiting for Jess's description. Not part of this diff.
- **C. Approve and apply as written?**

## Files
| file | change |
|---|---|
| `js/data/enemies.js` | adds and exports `BANDS`. |
| `js/entities/enemy.js` | `bandOf()` and `screenDist()`; the band computed once per update; the path cutoff and the keeps-distance block rewritten around the band; cornered fix. |
| `js/systems/log.js` | part A. |

## Diffs
```diff
--- a/js/data/enemies.js
+++ b/js/data/enemies.js
@@ -284,8 +284,14 @@
     return out;
   }
 
+  // Spacing bands (slice 1b), in SCREEN units: 1.0 = the edge of the screen in that direction (see Enemy.screenDist).
+  // [retreat below, approach above]; in between the unit holds. Keyed by behavior id, so status species share the
+  // shooter band ('ranged') until slice 2. Tuned by playtest: change the numbers here, nowhere else.
+  const BANDS = { fan: [0.30, 0.40], beamer: [0.50, 0.62], zoner: [0.72, 0.82], ranged: [0.80, 0.92],
+                  shielder: [0.45, 0.58], healer: [0.70, 0.82], summoner: [0.70, 0.82] };
+
   return {
-    TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion, classOf, minionFromCast,
+    TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion, classOf, minionFromCast, BANDS,
     get region() { return region; },           // null = full dex (Paldea-equiv); else gen 1-9
     enemyHp, levelForTime,
     get BOSSES() { if (!bosses) rollRun(); return bosses; },
--- a/js/entities/enemy.js
+++ b/js/entities/enemy.js
@@ -294,6 +294,7 @@
       const spd = this.spd * (1 - this.slow) * terrainMul * G.Weather.speedFor(this.types);
       let [dx, dy] = G.U.norm(pl.x - this.x, pl.y - this.y);
       const dist = G.U.dist(this.x, this.y, pl.x, pl.y);
+      const band = this.bandOf(), s = band ? this.screenDist(pl) : 0;     // spacing band (slice 1b)
       // Treasure imp: it flees from you (zigzagging) as soon as you approach.
       if (this.behavior === 'thief') {
         this.zig = (this.zig || 0) + dt;
@@ -346,7 +347,9 @@
       // Path around the obstacles (the ones that do not fly).
       if (!this.flying && this.phase !== 'dash' && this.sideT <= 0) {
         const pd = G.Path.dirFor(this, pl);
-        if (pd && !(this.keepsDistance() && dist < (this.def.range || 200) * 0.82)) { dx = pd[0]; dy = pd[1]; }
+        // Inside its band a unit moves straight (no path-following); bosses keep the old range test.
+        const near = band ? s < band[1] : this.keepsDistance() && dist < (this.def.range || 200) * 0.82;
+        if (pd && !near) { dx = pd[0]; dy = pd[1]; }
       }
 
       let vx = dx * spd, vy = dy * spd;
@@ -376,17 +379,23 @@
           vx = this.dx * spd * 3.4; vy = this.dy * spd * 3.4;
           if (this.pt <= 0) { this.phase = 'walk'; this.pt = 1.1; }
         }
-      } else if (this.keepsDistance()) {
-        const range = this.def.range || 200;
-        const keep = range * 0.82;
+      } else if (band) {
+        // Spacing band (slice 1b): approach beyond band[1], hold between the two numbers, back away (0.8x) below band[0].
+        // The shielder moves with its band but never shoots: only keepsDistance() classes fire.
         // Straight toward you (not the path) to move away.
         const [ddx, ddy] = G.U.norm(pl.x - this.x, pl.y - this.y);
-        if (dist < keep * 0.75) { vx = -ddx * spd * 0.8; vy = -ddy * spd * 0.8; }
-        else if (dist < keep) { vx *= 0.1; vy *= 0.1; animBase = 'Idle'; }
-        this.shotCd -= dt;
-        if (this.shotCd <= 0 && dist < range) {
-          this.shotCd = this.def.shotCd || 2;
-          this.special(pl, ddx, ddy);
+        if (s < band[0]) {
+          let rx = -ddx, ry = -ddy;
+          // Cornered: the stuck side-step also turns the retreat, so the unit slides along the wall instead of pushing into it.
+          if (this.sideT > 0) { const a = Math.atan2(ry, rx) + this.side * 1.25; rx = Math.cos(a); ry = Math.sin(a); }
+          vx = rx * spd * 0.8; vy = ry * spd * 0.8;
+        } else if (s < band[1]) { vx *= 0.1; vy *= 0.1; animBase = 'Idle'; }
+        if (this.keepsDistance()) {
+          this.shotCd -= dt;
+          if (this.shotCd <= 0 && s < band[1] * 1.05) {      // the ability gate follows the band, not def.range
+            this.shotCd = this.def.shotCd || 2;
+            this.special(pl, ddx, ddy);
+          }
         }
       }
 
@@ -561,6 +570,12 @@
 
     keepsDistance() { return ['ranged', 'fan', 'beamer', 'zoner', 'healer', 'summoner'].includes(this.behavior); }
 
+    /** Spacing band [retreat below, approach above] in screen units, or null. Bosses keep their own movement. */
+    bandOf() { return this.boss ? null : (G.Enemies.BANDS[this.behavior] || null); }
+
+    /** Distance to the player in screen units: 1.0 = the edge of the screen in that direction (the view is wider than tall). */
+    screenDist(pl) { return Math.hypot((pl.x - this.x) / (G.Camera.w / 2), (pl.y - this.y) / (G.Camera.h / 2)); }
+
     shotDmg() { return (this.def.shotDmg || 10) * (this.dmg / this.def.dmg); }
 
     /** Normal enemy shot (one, or several in a fan). */
--- a/js/systems/log.js
+++ b/js/systems/log.js
@@ -6,6 +6,8 @@
  *   G.Log.text(n)      last n records as text (default 40)
  *   G.Log.print(n)     console output, colored by attack type
  *   G.Log.pacing()     table: level reached, run time, seconds since the previous level
+ *   G.Log.cast()       table: this run's cast, tier by tier, with class, Tank and Runner flags
+ *   G.Log.bands()      table: where live enemies stand right now, by behavior, in screen units, against their spacing band
  *   G.Log.download()   JSON of every buffered record (text plus raw slots)
  *   G.Log.clear()
  *
@@ -14,7 +16,7 @@
  * neutral value props use). The buffer keeps the newest 8192 records.
  */
 G.Log = (() => {
-  const CAP = 8192, NF = 18;
+  const CAP = 8192, NF = 20;
   const F = new Float32Array(CAP * NF), K = new Uint8Array(CAP), T = new Float32Array(CAP);
   let head = 0, count = 0;
   const strs = [''], strIx = new Map([['', 0]]);
@@ -45,9 +47,14 @@
     const o = rec(HIT_IN), e = w && w.e;
     F[o] = e ? e.dex : 0; F[o + 1] = (e && e.atkLvl) || 0; F[o + 2] = S(w ? w.kind : 'flat');
     F[o + 3] = cat; F[o + 4] = neutral; F[o + 5] = dStat; F[o + 6] = afterDef; F[o + 7] = typeK; F[o + 8] = wxK;
-    F[o + 9] = red; F[o + 10] = close; F[o + 11] = fin; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = flags;
+    F[o + 9] = red; F[o + 10] = close; F[o + 11] = fin; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = flags | (e && e.def && e.def.runner ? 8 : 0) | (e && e.boss ? 32 : 0);    // 8 = runner, 32 = boss
     F[o + 15] = S(type);
     F[o + 16] = e ? e.spd : 0; F[o + 17] = myPx || 0;   // attacker and your px/s at the moment of the hit
+    // Where the attacker stood relative to you, in screen units (1.0 = screen edge; for a shot, where the shooter is when it lands),
+    // and how many enemies were alive.
+    const me = G.Game.player;
+    F[o + 18] = e && me ? Math.hypot((e.x - me.x) / (G.Camera.w / 2), (e.y - me.y) / (G.Camera.h / 2)) : 0;
+    F[o + 19] = G.EnemyMgr.count;
   };
   api.hitOut = (pl, m, e, cat, factor, dStat, stab, typeK, crit, fin, hp0, hp1, absorbed) => {
     const o = rec(HIT_OUT);
@@ -92,9 +99,15 @@
   const dexName = d => (G.DEX_BY[d] && G.DEX_BY[d].name) || (d ? '#' + d : 'env');
   const CAT = ['physical', 'special', 'status'];
 
+  // Class tag from the class table: " (shielder)", " (plain+tank)", " (charger+runner)". Empty for bosses and anything not in the table.
+  const tagOf = (dex, boss, runner) => {
+    const c = dex && !boss && G.ENEMY_CLASSES && G.ENEMY_CLASSES[dex];
+    return c ? ' (' + c.c + (c.t ? '+tank' : '') + (runner ? '+runner' : '') + ')' : '';
+  };
+
   function lineIn(v) {
-    const [dex, lvl, kS, cat, neu, dS, aD, tK, wK, red, cl, fin, hp0, hp1, fl, tyS, aPx, myPx] = v;
-    const who = (dex ? dexName(dex) + (lvl ? ' L' + n1(lvl) : '') + ' ' : '') + strs[kS];
+    const [dex, lvl, kS, cat, neu, dS, aD, tK, wK, red, cl, fin, hp0, hp1, fl, tyS, aPx, myPx, sCr, live] = v;
+    const who = (dex ? dexName(dex) + (lvl ? ' L' + n1(lvl) : '') + tagOf(dex, fl & 32, fl & 8) + ' ' : '') + strs[kS];
     const p = ['neutral ' + n1(neu)];
     let cur = neu;
     if (dS > 0) { p.push((cat === 1 ? 'SpD ' : 'Def ') + Math.round(dS) + ' ' + sd(aD - cur)); cur = aD; }
@@ -106,6 +119,7 @@
     if (fl & 1) p.push('floor ' + sd(fin - cur));
     if (fl & 4) p.push('pure');
     if (aPx > 0 && myPx > 0) p.push('speed ' + Math.round(aPx) + ' vs you ' + Math.round(myPx));
+    if (sCr > 0) p.push('s ' + sCr.toFixed(2) + ', ' + live + ' alive');
     return 'IN   ' + who + ' [' + (strs[tyS] || 'none') + '] > you | ' + p.join(' | ') +
            ' | FINAL ' + n1(fin) + '  HP ' + n1(hp0) + ' > ' + n1(hp1);
   }
@@ -127,7 +141,7 @@
     let s;
     if (k === HIT_IN) s = lineIn(v);
     else if (k === HIT_OUT) s = lineOut(v);
-    else if (k === KILL) s = 'KILL ' + dexName(v[0]) + (v[1] ? ' (boss)' : '') + (v[2] ? ' L' + n1(v[2]) : '') + ' dropped ' + v[3] + ' xp' + (v[4] ? ' (golden)' : '') + (v[5] ? ' (shiny)' : '');
+    else if (k === KILL) s = 'KILL ' + dexName(v[0]) + (v[1] ? ' (boss)' : tagOf(v[0], 0, 0)) + (v[2] ? ' L' + n1(v[2]) : '') + ' dropped ' + v[3] + ' xp' + (v[4] ? ' (golden)' : '') + (v[5] ? ' (shiny)' : '');
     else if (k === XP) s = 'XP   +' + n1(v[0] * v[1] * v[2]) + ' (orb ' + v[0] + ' x coop ' + v[1] + ' x bonus ' + n1(v[2]) + ')  ' + Math.round(v[5]) + '/' + v[6] + (v[4] > v[3] ? '  LEVEL ' + v[3] + ' > ' + v[4] : '');
     else if (k === OFFER) s = 'OFFER L' + v[0] + ' [' + [v[1], v[2], v[3]].slice(0, v[5]).map(x => strs[x]).join(', ') + '] rerolls used ' + v[4];
     else if (k === PICK) s = 'PICK  ' + strs[v[0]];
@@ -164,8 +178,32 @@
     console.table(rows);
     return rows;
   };
+  api.cast = () => {
+    const rows = [];
+    G.Enemies.cast.forEach((t, ti) => { for (const d of t.list) rows.push({ tier: ti + 1, species: d.name, class: G.Enemies.classOf(G.DEX_BY[d.dex]), tank: d.tank ? 'yes' : '', runner: d.runner ? 'yes' : '' }); });
+    console.table(rows);
+    return rows;
+  };
+  api.bands = () => {
+    const pl = G.Game.player, B = G.Enemies.BANDS, by = {};
+    if (!pl) return [];
+    for (const e of G.EnemyMgr.all()) {
+      if (e.dead || e.boss) continue;
+      (by[e.behavior] = by[e.behavior] || []).push(Math.hypot((e.x - pl.x) / (G.Camera.w / 2), (e.y - pl.y) / (G.Camera.h / 2)));
+    }
+    const rows = Object.keys(by).map(k => {
+      const a = by[k].sort((x, y) => x - y), b = B[k];
+      return { behavior: k, n: a.length, min: +a[0].toFixed(2), median: +a[a.length >> 1].toFixed(2), max: +a[a.length - 1].toFixed(2),
+               band: b ? b[0] + ' to ' + b[1] : '-', inBand: b ? a.filter(x => x >= b[0] && x <= b[1] * 1.05).length : '-' };
+    });
+    console.table(rows);
+    return rows;
+  };
   api.download = () => {
     const rows = order(count).map(i => ({ t: +T[i].toFixed(2), kind: KIND_NAME[K[i]], text: fmt(i), v: Array.from(F.subarray(i * NF, i * NF + NF)) }));
+    // First row: this run's cast with class and modifier flags, so a log can be read without the game open.
+    rows.unshift({ t: 0, kind: 'CAST', v: [], text: 'region ' + (G.Enemies.region == null ? 'all' : G.Enemies.region) + '\n' +
+      G.Enemies.cast.map((t, ti) => 'T' + (ti + 1) + ': ' + t.list.map(d => d.name + ' (' + G.Enemies.classOf(G.DEX_BY[d.dex]) + (d.tank ? '+tank' : '') + (d.runner ? '+runner' : '') + ')').join(', ')).join('\n') });
     const a = document.createElement('a');
     a.href = URL.createObjectURL(new Blob([JSON.stringify(rows)], { type: 'application/json' }));
     a.download = 'pokesurvivor-log-' + Date.now() + '.json';
```

## Verification done (offline, repo untouched)
- `node --check` passes on all three patched files, and `patch --dry-run` applies the combined diff to the real tree.
- Logger: the patched `log.js` was run against the real pokedex and class table with a mock attacker. Hit lines show `Kadabra L4.3 (shielder+runner) contact [psychic] ... s 0.91, 41 alive`, the Tornadus zone shows no tag, kills show `Metapod (shooter)`, and `G.Log.cast()` prints the table.
- Movement: the exact retreat, hold and approach rules were simulated against a stationary player for all seven behaviors, starting outside the band (sideways and above), and from inside. Every one settles at its inner edge: fan 0.30, beamer 0.50, zoner 0.72, shooter 0.80, shielder 0.45, healer 0.70, summoner 0.70. A shooter backed against a wall at 0.77 stays jammed at 0.78 without the cornered fix and slides out to 0.80 with it.
- NOT verified: anything in a browser, the feel, and how the units behave with a moving player and a real crowd. That is the playtest.

## What changes in play
- Ranged and support units stand much further out than today, in the order fan (on you), shielder, beamer, healer and summoner, zoner, shooter (screen edge). Supports sit behind the crowd.
- Shooters at the edge are easy to sidestep (a shot takes about 1.8 s to cross 345 px), so their threat will need tuning through volume, not damage.
- Healers and summoners keep casting at their new depth. Shielders no longer touch you.
- Units no longer freeze when chased: the hold zone is about 0.1 wide instead of about 0.2 of range.
- Boss and rift legendary behavior is unchanged.

## After approval, in this order
1. Apply the three diffs, `node --check` each, rerun the offline checks on the real tree.
2. BALANCE (bands table), DECISIONS note, DEVLOG, an English `changelog.js` entry.
3. Jess playtests a few regions and runs `G.Log.bands()` mid-run (it shows whether units sit inside their bands), then sends the logs. The CAST row and class tags make the logs readable without guessing.
4. Tune `BANDS` from that.
