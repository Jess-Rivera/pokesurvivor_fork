# PERFORMANCE HOT-PATH NOTES (frontier-efficiency scan, 2026-10-21)

Read-only scan of the real per-frame hot paths (EnemyMgr.update -> rebuildGrid -> per-enemy update ->
separate -> combat resolve). Goal: frontier efficiency gains that do NOT cost the game's vision
(uncapped projectiles, density-first swarm, gym-leader uniqueness, mainline-faithful damage math all
stay sacred). Architecture is already sound (grid-bucketed queryCircle/separate with dist2,
reverse-splice removal, single global dt) so there is NO O(n^2) problem. The real cost is per-frame
ALLOCATION churn -> GC pauses -> mid-swarm frame hitches. These gains attack that.

Target branch when built: perf/hot-paths (its own branch, separate commit per gain, each
check.js-verified + dense-swarm feel-test). All four are behavior-preserving (same gameplay, same
numbers, same feel).

---

## FG1: reuse grid bucket arrays in rebuildGrid() [PLANNED, approved-pending]
PROBLEM: rebuildGrid() runs every frame (correct — enemies move, the proximity INDEX must refresh; this
is the collision/lookup grid, NOT the visual map). But it does grid.clear() + allocates a brand-new []
per occupied cell every frame. At 64 enemies across ~20-40 cells that is dozens of throwaway arrays x
60fps -> steady GC fuel -> hitches, worst during a dense swarm (exactly when it hurts).

FIX (reuse + prune-on-rebuild, option b — strictly better than current):
```
function rebuildGrid() {
  for (const b of grid.values()) b.length = 0;      // empty existing buckets IN PLACE (keep the array objects)
  for (const e of list) {
    if (e.dead) continue;
    const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    let b = grid.get(k);
    if (!b) grid.set(k, b = []);                     // allocate ONLY when a new cell is first touched
    b.push(e);
  }
  for (const [k, b] of grid) if (b.length === 0) grid.delete(k);   // prune cells the swarm left
}
```
Same algorithm (clear + re-sort everyone; deaths skipped for free). Only memory behavior changes:
bucket arrays persist frame to frame (b.length=0 empties in place, keeping the heap allocation + backing
buffer), so steady-state grid allocation ~= zero. The prune pass keeps queryCircle exactly as fast as
today (no lingering empty buckets). EDGE CASES: identical correctness to current (dead skipped on
rebuild, added-mid-frame appears next frame, same hash key() = same pre-existing collision property).
VISION COST: zero (invisible bookkeeping). File: js/entities/enemy.js, ~4 lines.

## FG2: queryCircleEach callback form (zero-allocation queries) [PLANNED, approved-pending]
PROBLEM: queryCircle allocates `const out = []` every call, called many times per frame (every
aura/nova/beam/chain/melee/meteor/mine/haste-nova/seek/flank). Dense swarm + AoE = dozens of throwaway
arrays/frame. Same GC root cause as FG1.

FIX: add a callback variant, reimplement queryCircle on top of it (one traversal to maintain):
```
function queryCircleEach(x, y, r, fn) {
  const c0x = Math.floor((x - r) / CELL) - 1, c1x = Math.floor((x + r) / CELL) + 1;
  const c0y = Math.floor((y - r) / CELL) - 1, c1y = Math.floor((y + r) / CELL) + 1;
  for (let cy = c0y; cy <= c1y; cy++)
    for (let cx = c0x; cx <= c1x; cx++) {
      const b = grid.get(key(cx, cy));
      if (!b) continue;
      for (const e of b) { if (e.dead) continue; const rr = r + e.r; if (G.U.dist2(x, y, e.x, e.y) <= rr * rr) fn(e); }
    }
}
function queryCircle(x, y, r) { const out = []; queryCircleEach(x, y, r, e => out.push(e)); return out; }
```
CONVERT (pure for-of hot callers): the aura/nova/beam/melee/chain/meteor hit loops (combat.js) and the
haste-nova/seek/flank scans (enemy.js). LEAVE on the array form (they need the array): callers that
chain .filter / .length / build a ranked pool (enemy.js pool/hurt/near; combat.js mine-trigger .length).
CAVEAT: a callback must not ADD enemies to the grid mid-iteration (mutation during iteration). Hits do
not (spawns append to list, grid not re-read until next rebuild), but verify each converted caller's fn
does not add enemies; leave any that does on the array form. VISION COST: zero. Files: enemy.js, combat.js.

## FG3: moveCat / defender-stat per-hit recompute [RE-ASSESSED — mostly a NON-ISSUE, do NOT build]
The audit flagged moveCat recomputed per hit. On closer read this is overstated: moveCat() already
short-circuits on m.cat (`if (m && m.cat) return m.cat`), and most moves in moves.js already carry an
explicit cat field, so in normal play it is already just a property read. The only redundancy is moveCat
called twice in the LOGGING path (applyDamage + the `c` log var), and logging only runs when G.Log.on
(dev mode), not normal play. So there is effectively no normal-play cost. NOT worth a change. Recorded
here so it is not re-flagged later. (If ever wanted: cache m._cat at derive() time — trivial, but
pointless while m.cat already exists.)

## FG4: off-screen projectile broad-phase [PLANNED, the one that protects the uncapped vision]
PROBLEM (and the constraint it respects): projectiles are UNCAPPED by design (Jess: intentional until a
physical engine wall). So the array grows; the resolve loop (already reverse-splice, correct) runs a full
enemy-collision test for EVERY projectile including ones far off-screen that cannot hit anything visible.
FIX: a cheap broad-phase skip — if a projectile is well outside the camera + margin AND heading away,
skip the expensive per-enemy collision test this frame (keep the projectile alive, still integrate its
position / lifetime). This cuts per-projectile work at high counts WITHOUT capping or culling anything.
VISION COST: zero, and it specifically preserves uncapped projectiles (nothing is removed; off-screen
ones just do not pay collision cost until relevant). RISK: moderate — the "cannot hit anything" test must
be correct so nothing phantom-passes through an on-screen enemy. Verify carefully. Build AFTER FG1/FG2.

---

## Ranking (value-to-risk)
1. FG1 grid bucket reuse — biggest GC win, zero risk, scales with density. Do first.
2. FG2 queryCircleEach — large alloc win in AoE-heavy frames, low risk.
3. FG4 off-screen projectile broad-phase — buys uncapped-projectile headroom, low-moderate risk.
(FG3 dropped — already handled by the m.cat short-circuit.)

## Explicitly NOT doing (vision-protecting)
No projectile cap/cull (FG4 gives headroom instead). No enemy-cap reduction. No type-chart/damage-math
simplification (mainline faithful). No gym-leader templating. No lowering the 64-alive cap or spawn density.
