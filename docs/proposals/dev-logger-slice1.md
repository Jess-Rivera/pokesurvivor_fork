# Proposal: dev logger, slice 1 (dev data only)

Status: APPROVED and APPLIED 2026-10-17 on feature/upgrades-inrun. Verified on disk (node --check, mock test, 4000-case equivalence test). Awaiting in-browser playtest and commit.
Scope per Jess: dev-facing data only. No player-facing view, no HUD panel, no CSS, no save changes.
Branch suggestion: `feature/dev-logger` off an up-to-date `main` (Jess runs git).

## What it does
One new module, `G.Log`, records numeric events into a preallocated ring buffer (newest 8192 records)
and builds text only when asked. It is inert without `?dev` (`G.Log.on` is false, every call site
skips its work). Console API: `G.Log.text(n)`, `G.Log.print(n)` (colored by attack type),
`G.Log.pacing()` (time-to-level table), `G.Log.download()` (JSON), `G.Log.clear()`.

Events: damage you take (full waterfall), damage you deal (full waterfall), hits blocked by
invulnerability frames, heals, faint and Focus Band saves, kills (with XP dropped), XP collected
(with the XP bonus applied), level-up card offers and the card picked.

## Waterfall format
Each damage line starts from a neutral baseline (the hit as if the defender's stat were 50, the same
neutral value props already use), then lists one signed delta per stage. The deltas add up exactly to
FINAL (verified by a mock test, see Verification). Illustrative line, not real game numbers:

    12:41.3  IN   Charmander L24 contact [fire] > you | neutral 31.4 | Def 142 -9.2 | type x2 +22.2 | reduction 12% -5.3 | melee x0.75 -9.8 | FINAL 29.3  HP 212.0 > 182.7
    12:43.0  OUT  Mewtwo L12 psychic [psychic special] > Charmander | neutral 5.6 | STAB x1.5 +2.8 | SpD 80 -2.6 | type x2 +5.8 | crit x1.5 +5.8 | FINAL 17.4 (applied 17)  HP 120.0 > 103.0
    12:43.4  KILL Charmander L9 dropped 14 xp (golden)
    12:44.0  XP   +15.7 (orb 14 x coop 1 x bonus 1.1)  40/631  LEVEL 11 > 12

Known limits of today's data: enemies do not use the move catalog yet (flat ENEMY_POWER 40), so lines
name the attack kind (contact, shot, zone, beam) and type, not a move. Bosses use the flat damage
path, so their lines say "flat (no defense step)". Damage over time (burn, poison, lava) on enemies
and prop damage are not logged in this slice.

## Files and diffs

### 1. NEW js/systems/log.js
(full file at the end of this document)

### 2. dev.html: register the script (after stats.js, line 584)
```diff
 <script defer src="js/core/stats.js"></script>
+<script defer src="js/systems/log.js"></script>
```

### 3. js/main.js: load check (line 5)
```diff
-  const NEED = ['U', 'Stats', 'I18n', ...
+  const NEED = ['U', 'Stats', 'Log', 'I18n', ...
```

### 4. js/game.js
Run clock and reset:
```diff
   function startRun(coop = null) {
+    G.Log.clear(); G.Log.t = 0;
     ...existing body unchanged...
```
```diff
     time += dt;
+    G.Log.t = time;
```
XP collection (inside `onCollect`):
```diff
     if (p.kind === 'xp' || p.kind === 'xpBig') {
       const before = pl.level;
-      pendingLevels += pl.gainXp(p.value * (G.Coop.active ? G.Coop.xpFactor() : 1));
+      const coopK = G.Coop.active ? G.Coop.xpFactor() : 1;
+      pendingLevels += pl.gainXp(p.value * coopK);
+      if (G.Log.on) G.Log.xp(p.value, coopK, pl.xpMul, before, pl.level, pl.xp, pl.xpNext);
```
(`gainXp` multiplies by `xpMul` internally, so the logged gain is value x coop x bonus, matching the code.)

### 5. js/entities/player.js: hurt() and heal() (math unchanged, intermediates captured)
```diff
-  hurt(amount, type = null, pure = false, atk = null) {
-    if (this.invuln > 0 || this.dead) return;
+  hurt(amount, type = null, pure = false, atk = null, who = null) {
+    if (this.invuln > 0 || this.dead) {
+      if (G.Log.on && !this.dead) G.Log.block(who, atk ? atk.factor : amount, this.invuln);
+      return;
+    }
+    const LOG = G.Log.on, hp0 = this.hp;
+    let neutral = amount, dStat = 0, cat = -1;
     if (atk && !pure) {
       const st = this.mon.stats;
       const defB = st ? st[2] : 50, spdB = st ? st[4] : 50;
+      if (LOG) {
+        neutral = (atk.factor / 50 + 2) * G.Stats.ENEMY_DMG_SCALAR;
+        cat = atk.cat === 'special' ? 1 : 0;
+        dStat = cat === 1 ? G.Stats.spDef(spdB, this.level) : G.Stats.defense(defB, this.level);
+      }
       amount = G.Stats.applyPlayerDefense(amount, defB, spdB, atk.cat, this.level);
     }
-    let eff = null;
+    const afterDef = amount;
+    let eff = null, tk = 1, wk = 1;
     if (type) {
-      const k = G.Types.mult(type, this.mon.types);
-      eff = G.Types.label(k);
-      amount *= k * G.Weather.mult(type);
+      tk = G.Types.mult(type, this.mon.types);
+      wk = G.Weather.mult(type);
+      eff = G.Types.label(tk);
+      amount *= tk * wk;
     }
     const close = this.activeGroup().some(m => m.kind === 'melee') ? 0.75 : 1;
-    const d = pure ? Math.max(1, amount) : Math.max(1, amount * (1 - this.reduction) * close);
+    const raw = pure ? amount : amount * (1 - this.reduction) * close;
+    const d = Math.max(1, raw);
     this.hp -= d;
+    if (LOG) G.Log.hitIn(who, type, cat, neutral, dStat, afterDef, tk, wk, pure ? 0 : this.reduction, pure ? 1 : close, d,
+                         hp0, Math.max(0, this.hp), (d > raw ? 1 : 0) | (pure ? 4 : 0));
     ...flash, camera, text unchanged...
     // Focus Band
     if (this.hp <= 0 && this.hasItem('focussash') && performance.now() - this.sashT > 60000) {
       ...unchanged...
+      if (LOG) G.Log.faint(true, 1);
     }
     if (this.hp <= 0) {
       this.hp = 0; this.dead = true;
+      if (LOG) G.Log.faint(false, 0);
       ...unchanged...
```
```diff
   heal(amount) {
     const before = this.hp;
     this.hp = Math.min(this.maxHp, this.hp + amount);
     const got = Math.round(this.hp - before);
+    if (G.Log.on) G.Log.heal(amount, this.hp - before, this.hp, this.maxHp);
```
Note: `tk * wk` is evaluated first exactly as the original `k * G.Weather.mult(type)` was, so the damage
math is bit-identical. The faint record in the Focus Band block fires only when the save triggers.

### 6. js/systems/combat.js
Player to enemy (`hit()`):
```diff
   function hit(pl, e, factor, col, dx, dy, knock, m) {
     const ds = enemyDefStats(e);
     let dmg = G.Stats.applyDamage(factor, ds.def, ds.spd, m, pl.level, pl.stabFor(m));
     const k = typeK(m.type, e);
     const crit = isCrit(pl);
     dmg *= k * (crit ? CRIT_MUL : 1);
+    const LOG = G.Log.on && !ghost, hp0 = e.hp, sh0 = e.shield || 0;
     e.hurt(dmg, col, dx, dy, knock, crit ? 'crit' : G.Types.label(G.Types.mult(m.type, e.types)));
+    if (LOG) {
+      const cat = G.Stats.moveCat(m), c = cat === 'status' ? 2 : cat === 'special' ? 1 : 0;
+      const dS = c === 2 ? 50 : c === 1 ? G.Stats.spDef(ds.spd, pl.level) : G.Stats.defense(ds.def, pl.level);
+      G.Log.hitOut(pl, m, e, c, factor, dS, c !== 2 && pl.stabFor(m) ? G.Stats.STAB : 1, k, crit, dmg, hp0, Math.max(0, e.hp), Math.max(0, sh0 - (e.shield || 0)));
+    }
```
Enemy shot (line 581-582):
```diff
-          if (p.atkFactor != null) pl.hurt(p.atkFactor, p.mtype, false, { factor: p.atkFactor, cat: p.atkCat });
-          else pl.hurt(p.dmg, p.mtype);
+          const w = G.Log.on ? G.Log.who(p.src, 'shot') : null;
+          if (p.atkFactor != null) pl.hurt(p.atkFactor, p.mtype, false, { factor: p.atkFactor, cat: p.atkCat }, w);
+          else pl.hurt(p.dmg, p.mtype, false, null, w);
```
Enemy contact (line 691-692):
```diff
-      if (e.atkFactor != null) pl.hurt(e.atkFactor, e.atkType, false, { factor: e.atkFactor, cat: e.atkCat });
-      else pl.hurt(e.dmg, e.atkType);
+      const w = G.Log.on ? G.Log.who(e, 'contact') : null;
+      if (e.atkFactor != null) pl.hurt(e.atkFactor, e.atkType, false, { factor: e.atkFactor, cat: e.atkCat }, w);
+      else pl.hurt(e.dmg, e.atkType, false, null, w);
```

### 7. js/systems/hazards.js (lines 49-50)
```diff
-          if (h.atkFactor != null && !h.pure) pl.hurt(h.atkFactor, h.type, false, { factor: h.atkFactor, cat: h.atkCat });
-          else pl.hurt(h.pct ? Math.max(h.dmg, pl.maxHp * h.pct) : h.dmg, h.type, !!h.pure);
+          const w = G.Log.on ? G.Log.who(h.src, h.kind) : null;
+          if (h.atkFactor != null && !h.pure) pl.hurt(h.atkFactor, h.type, false, { factor: h.atkFactor, cat: h.atkCat }, w);
+          else pl.hurt(h.pct ? Math.max(h.dmg, pl.maxHp * h.pct) : h.dmg, h.type, !!h.pure, null, w);
```

### 8. js/entities/enemy.js
Constructor (store the level the attack factor was built with):
```diff
+      this.atkLvl = boss ? 0 : G.Stats.levelForTime(sc.t || 0);
-      this.atkFactor = boss ? null : G.Stats.enemyAttackFactor(this.atkBase, this.spaBase, G.Stats.levelForTime(sc.t || 0));
+      this.atkFactor = boss ? null : G.Stats.enemyAttackFactor(this.atkBase, this.spaBase, this.atkLvl);
```
Name the attacker on shots and hazards: add `src: this,` next to `atkFactor: this.atkFactor, atkCat: this.atkCat,`
at all 10 occurrences (shoot() and 9 `G.Hazards.add` calls). Mechanical change; both `Projectiles.spawn` and
`Hazards.add` copy fields with `Object.assign`, and the co-op broadcast sends a fixed field list, so `src`
never crosses the network.
Kill record (EnemyMgr update loop):
```diff
         if (e.dead) {
           pl.kills++;
+          if (G.Log.on) G.Log.kill(e);
```

### 9. js/systems/levelup.js: `offer()` (log the offer, wrap each card to log the pick)
```diff
-    return picked;
+    if (G.Log.on) {
+      G.Log.offer(pl.level, picked, pl.rerolls || 0);
+      for (const c of picked) { const f = c.apply; c.apply = function (p) { G.Log.pick(c.key); return f.call(this, p); }; }
+    }
+    return picked;
```
Rerolls call `offer()` again, so each reroll is logged as its own offer.

## Cost and safety
- Off (no `?dev`): a few `G.Log.on` property reads per hit. No allocation, no behavior change.
- On: numeric writes into typed arrays and one interned-string map lookup per record. No string
  building, no DOM. Memory is fixed (about 0.6 MB).
- Damage math is untouched. The only edits to `hurt()` and `hit()` are capturing intermediates.
- No save-schema change. No co-op or network code touched (local-first).
- New strings are English-only, console-only, and dev-only.

## Dry run already done (scratch copies only, the real files are untouched)
All diffs above were applied to scratch copies of the eight files: every anchor matched (including all 10
`src: this` sites) and every resulting file passes `node --check`. The `log.js` draft was also run against
mock data (waterfalls sum exactly to FINAL, floor and type-0 lines render, ring buffer wraps).

## Verification plan (after approval)
1. `node --check` on every touched file, again on the real files after applying.
2. Re-run the mock harness against the applied `js/systems/log.js`.
3. In browser on `dev.html?dev`: play 1 to 2 minutes, `G.Log.print(30)`, `G.Log.pacing()`. Check that FINAL
   rounded matches the floating damage numbers on screen, and that the XP lines sum to what the bar shows.
4. Without `?dev`: confirm the game plays identically and `G.Log.on === false`.
5. Dense-horde framerate with the log on vs off.
6. Add changelog.js entry? Not needed (dev-only, nothing player-visible).

## Things the log should let us confirm (observations from reading the code, not claims)
- Defense scaling levels: player to enemy scales the ENEMY's Def/SpD at the PLAYER's level (the dStat in
  OUT lines); enemy to player scales the enemy's attack at the enemy's level and the PLAYER's Def/SpD at
  the player's level. The two directions are not symmetric in the code. Possibly intended (DECISIONS says
  the ratio stays proportional at one level); the logged dStat values make it checkable.
- Immunity versus the floor of 1: today an immune hit (type x0) still deals 1 in both directions,
  because `hurt()` uses `Math.max(1, ...)` and `Enemy.hurt` floors at 1. That is the opposite of the
  recommended ruling in the design notes (immunity overrides the floor). Open item, not changed here.

## Full file: js/systems/log.js
```js
/* ============ log.js, developer event log (only with ?dev) ============
 * Records what happens in a run as numbers in preallocated typed arrays, so logging
 * allocates nothing and builds no strings while you play. Text is built on request.
 * Without ?dev, G.Log.on is false and every call site skips its work.
 *
 *   G.Log.text(n)      last n records as text (default 40)
 *   G.Log.print(n)     console output, colored by attack type
 *   G.Log.pacing()     table: level reached, run time, seconds since the previous level
 *   G.Log.download()   JSON of every buffered record (text plus raw slots)
 *   G.Log.clear()
 *
 * Damage lines are a waterfall: a neutral baseline, then one signed delta per stage, adding
 * up to the final damage. Neutral = the hit as if the defender's stat were 50 (the same
 * neutral value props use). The buffer keeps the newest 8192 records.
 */
G.Log = (() => {
  const CAP = 8192, NF = 16;
  const F = new Float32Array(CAP * NF), K = new Uint8Array(CAP), T = new Float32Array(CAP);
  let head = 0, count = 0;
  const strs = [''], strIx = new Map([['', 0]]);
  const S = s => {
    s = s == null ? '' : String(s);
    let i = strIx.get(s);
    if (i === undefined) { i = strs.length; strs.push(s); strIx.set(s, i); }
    return i;
  };
  const HIT_IN = 1, HIT_OUT = 2, KILL = 3, XP = 4, OFFER = 5, PICK = 6, HEAL = 7, FAINT = 8, BLOCK = 9;
  const KIND_NAME = ['', 'HIT_IN', 'HIT_OUT', 'KILL', 'XP', 'OFFER', 'PICK', 'HEAL', 'FAINT', 'BLOCK'];
  const api = { on: /[?&]dev\b/.test(location.search), t: 0 };

  function rec(kind) {
    const i = head;
    head = (head + 1) % CAP;
    if (count < CAP) count++;
    K[i] = kind; T[i] = api.t;
    return i * NF;
  }

  // Reused by Player.hurt call sites to name the attacker without allocating.
  const _who = { e: null, kind: '' };
  api.who = (e, kind) => { _who.e = e; _who.kind = kind; return _who; };

  // ---------------- recorders (numbers only) ----------------
  api.hitIn = (w, type, cat, neutral, dStat, afterDef, typeK, wxK, red, close, fin, hp0, hp1, flags) => {
    const o = rec(HIT_IN), e = w && w.e;
    F[o] = e ? e.dex : 0; F[o + 1] = (e && e.atkLvl) || 0; F[o + 2] = S(w ? w.kind : 'flat');
    F[o + 3] = cat; F[o + 4] = neutral; F[o + 5] = dStat; F[o + 6] = afterDef; F[o + 7] = typeK; F[o + 8] = wxK;
    F[o + 9] = red; F[o + 10] = close; F[o + 11] = fin; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = flags;
    F[o + 15] = S(type);
  };
  api.hitOut = (pl, m, e, cat, factor, dStat, stab, typeK, crit, fin, hp0, hp1, absorbed) => {
    const o = rec(HIT_OUT);
    F[o] = pl.mon.dex; F[o + 1] = S(m.id); F[o + 2] = S(m.type); F[o + 3] = cat; F[o + 4] = pl.level;
    F[o + 5] = factor; F[o + 6] = dStat; F[o + 7] = stab; F[o + 8] = typeK; F[o + 9] = crit ? 1 : 0;
    F[o + 10] = fin; F[o + 11] = e.dex; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = absorbed; F[o + 15] = e.boss ? 1 : 0;
  };
  api.kill = e => {
    const o = rec(KILL);
    F[o] = e.dex; F[o + 1] = e.boss ? 1 : 0; F[o + 2] = e.atkLvl || 0; F[o + 3] = e.xp || 0;
    F[o + 4] = e.golden ? 1 : 0; F[o + 5] = e.shiny ? 1 : 0;
  };
  api.xp = (value, coopK, xpMul, lvl0, lvl1, xp1, xpNext) => {
    const o = rec(XP);
    F[o] = value; F[o + 1] = coopK; F[o + 2] = xpMul; F[o + 3] = lvl0; F[o + 4] = lvl1; F[o + 5] = xp1; F[o + 6] = xpNext;
  };
  api.offer = (level, cards, rerolls) => {
    const o = rec(OFFER);
    F[o] = level; F[o + 4] = rerolls; F[o + 5] = cards.length;
    for (let i = 0; i < 3 && i < cards.length; i++) F[o + 1 + i] = S(cards[i].key);
  };
  api.pick = key => { F[rec(PICK)] = S(key); };
  api.heal = (asked, got, hp, maxHp) => {
    const o = rec(HEAL);
    F[o] = asked; F[o + 1] = got; F[o + 2] = hp; F[o + 3] = maxHp;
  };
  api.faint = (saved, hp) => { const o = rec(FAINT); F[o] = saved ? 1 : 0; F[o + 1] = hp; };
  api.block = (w, factor, invuln) => {
    const o = rec(BLOCK), e = w && w.e;
    F[o] = e ? e.dex : 0; F[o + 1] = S(w ? w.kind : 'flat'); F[o + 2] = factor; F[o + 3] = invuln;
  };
  api.clear = () => { head = 0; count = 0; };

  // ---------------- text (built only on request) ----------------
  const mmss = t => {
    const q = Math.round(t * 10), s = Math.floor(q / 10);   // tenths, rounded (times are stored as float32)
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '.' + (q % 10);
  };
  const n1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const sd = x => (x >= 0 ? '+' : '') + n1(x);
  const dexName = d => (G.DEX_BY[d] && G.DEX_BY[d].name) || (d ? '#' + d : 'env');
  const CAT = ['physical', 'special', 'status'];

  function lineIn(v) {
    const [dex, lvl, kS, cat, neu, dS, aD, tK, wK, red, cl, fin, hp0, hp1, fl, tyS] = v;
    const who = (dex ? dexName(dex) + (lvl ? ' L' + lvl : '') + ' ' : '') + strs[kS];
    const p = ['neutral ' + n1(neu)];
    let cur = neu;
    if (dS > 0) { p.push((cat === 1 ? 'SpD ' : 'Def ') + Math.round(dS) + ' ' + sd(aD - cur)); cur = aD; }
    else if (cat < 0 && dex) p.push('flat (no defense step)');
    if (tK !== 1) { p.push('type x' + tK + ' ' + sd(cur * tK - cur)); cur *= tK; }
    if (wK !== 1) { p.push('weather x' + wK + ' ' + sd(cur * wK - cur)); cur *= wK; }
    if (red) { const nx = cur * (1 - red); p.push('reduction ' + Math.round(red * 100) + '% ' + sd(nx - cur)); cur = nx; }
    if (cl !== 1) { const nx = cur * cl; p.push('melee x' + cl + ' ' + sd(nx - cur)); cur = nx; }
    if (fl & 1) p.push('floor ' + sd(fin - cur));
    if (fl & 4) p.push('pure');
    return 'IN   ' + who + ' [' + (strs[tyS] || 'none') + '] > you | ' + p.join(' | ') +
           ' | FINAL ' + n1(fin) + '  HP ' + n1(hp0) + ' > ' + n1(hp1);
  }
  function lineOut(v) {
    const [pdex, mS, tyS, cat, lvl, factor, dS, stab, tK, crit, fin, edex, hp0, hp1, abs, boss] = v;
    const sc = G.Stats.DMG_SCALAR;
    const neu = (factor / 50 + 2) * sc, st = neu * stab, aD = (factor / Math.max(1, dS) + 2) * stab * sc;
    const p = ['neutral ' + n1(neu)];
    if (stab !== 1) p.push('STAB x' + stab + ' ' + sd(st - neu));
    p.push((cat === 1 ? 'SpD ' : cat === 0 ? 'Def ' : 'prop ') + Math.round(dS) + ' ' + sd(aD - st));
    if (tK !== 1) p.push('type x' + tK + ' ' + sd(aD * tK - aD));
    if (crit) p.push('crit x1.5 ' + sd(aD * tK * 0.5));
    p.push('FINAL ' + n1(fin) + ' (applied ' + Math.max(1, Math.round(fin)) + (abs ? ', shield took ' + Math.round(abs) : '') + ')');
    return 'OUT  ' + dexName(pdex) + ' L' + lvl + ' ' + strs[mS] + ' [' + strs[tyS] + ' ' + CAT[cat] + '] > ' +
           dexName(edex) + (boss ? ' (boss)' : '') + ' | ' + p.join(' | ') + '  HP ' + n1(hp0) + ' > ' + n1(hp1);
  }
  function fmt(i) {
    const v = Array.from(F.subarray(i * NF, i * NF + NF)), k = K[i];
    let s;
    if (k === HIT_IN) s = lineIn(v);
    else if (k === HIT_OUT) s = lineOut(v);
    else if (k === KILL) s = 'KILL ' + dexName(v[0]) + (v[1] ? ' (boss)' : '') + (v[2] ? ' L' + v[2] : '') + ' dropped ' + v[3] + ' xp' + (v[4] ? ' (golden)' : '') + (v[5] ? ' (shiny)' : '');
    else if (k === XP) s = 'XP   +' + n1(v[0] * v[1] * v[2]) + ' (orb ' + v[0] + ' x coop ' + v[1] + ' x bonus ' + n1(v[2]) + ')  ' + Math.round(v[5]) + '/' + v[6] + (v[4] > v[3] ? '  LEVEL ' + v[3] + ' > ' + v[4] : '');
    else if (k === OFFER) s = 'OFFER L' + v[0] + ' [' + [v[1], v[2], v[3]].slice(0, v[5]).map(x => strs[x]).join(', ') + '] rerolls used ' + v[4];
    else if (k === PICK) s = 'PICK  ' + strs[v[0]];
    else if (k === HEAL) s = 'HEAL +' + n1(v[1]) + ' (asked ' + n1(v[0]) + ')  HP ' + n1(v[2]) + '/' + n1(v[3]);
    else if (k === FAINT) s = v[0] ? 'FOCUS BAND saved you at HP ' + v[1] : 'FAINT';
    else if (k === BLOCK) s = 'BLOCKED ' + (v[0] ? dexName(v[0]) + ' ' : '') + strs[v[1]] + ' (i-frames, ' + v[3].toFixed(2) + 's left)';
    else s = '?';
    return mmss(T[i]) + '  ' + s;
  }
  const COLORS = { 3: '#ffd23f', 4: '#5fe08a', 5: '#9fb1c9', 6: '#9fb1c9', 7: '#5fe08a', 8: '#ff3048', 9: '#8a93a3' };
  function color(i) {
    const k = K[i];
    if (k === HIT_IN || k === HIT_OUT) {
      const ty = strs[F[i * NF + (k === HIT_IN ? 15 : 2)]];
      return (G.U.TYPE_COLOR && G.U.TYPE_COLOR[ty]) || '#ccc';
    }
    return COLORS[k] || '#ccc';
  }
  const order = n => {
    const m = Math.min(n, count), out = [];
    for (let j = m; j > 0; j--) out.push((head - j + CAP) % CAP);
    return out;
  };

  api.text = (n = 40) => order(n).map(fmt).join('\n');
  api.print = (n = 40) => { for (const i of order(n)) console.log('%c' + fmt(i), 'color:' + color(i)); };
  api.pacing = () => {
    const rows = []; let prev = 0;
    for (const i of order(count)) {
      if (K[i] !== XP || F[i * NF + 4] <= F[i * NF + 3]) continue;
      rows.push({ level: F[i * NF + 4], at: mmss(T[i]), sinceLast: +(T[i] - prev).toFixed(1) });
      prev = T[i];
    }
    console.table(rows);
    return rows;
  };
  api.download = () => {
    const rows = order(count).map(i => ({ t: +T[i].toFixed(2), kind: KIND_NAME[K[i]], text: fmt(i), v: Array.from(F.subarray(i * NF, i * NF + NF)) }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(rows)], { type: 'application/json' }));
    a.download = 'pokesurvivor-log-' + Date.now() + '.json';
    a.click();
    return rows.length;
  };
  return api;
})();
```
