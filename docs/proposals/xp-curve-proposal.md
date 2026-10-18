# feature/xp-curve proposal (APPLIED 2026-10-18)

Opened 2026-10-18. Diff: docs/proposals/xp-curve.diff (9 files, `patch --binary -p1`, dry-run clean on the CRLF tree).
Goal (DECISIONS 2026-10-17): mainline-style XP so that player level (XP) vs enemy level (time) is the core tension.

## Jess's rulings (2026-10-18)
- Cost: mainline Medium Fast, total n^3 (cost of L -> L+1 is 3L^2 + 3L + 1: L1 7, L10 331, L20 1261, L50 7651).
- Yield: Gen 5 scaled formula with each species' own PokeAPI base_experience. K (XP_SCALAR) = 0.035.
- Bosses and Arceus Judgment legendaries: NOT touched (flat def.xp stays). Their own feature rework later.
- No level cap.
- Big orb = worth a share of your next level. Rock = flat 1% of your next-level XP.

## Formula
`yield = XP_SCALAR * ((bx * Le / 5) * ((2*Le + 10) / (Le + Lp + 10))^2.5 + 1) * xpMul`
- bx = species base_experience, Le = the level the enemy spawned at (levelForTime(sc.t), same as its HP), Lp = highest player level at the kill.
- xpMul = tank 1.3 x elite 1.6 x shiny 5 x golden 2 (they were multipliers on a flat number before). Summoner minions: x0.25 (was 0.25 of the parent's flat xp).
- Floats are kept (an L1 kill is worth about 0.9 XP), nothing is rounded.

## Replay (real G.Stats functions from the patched copy, real bx of the 966 species, tier BST bands, rarity < 5)
Player level at time t, K 0.035. Enemy level: 5:00 9.2, 10:00 17.3, 15:00 25.5, 20:00 33.7, 30:00 50.

| kills/s | 0:19 | 1:00 | 5:00 | 10:00 | 15:00 | 20:00 | 30:00 |
|---|---|---|---|---|---|---|---|
| 1.0 | 2 | 3 | 10 | 19 | 26 | 32 | 43 |
| 1.7 (the 549-kill log average) | 2 | 4 | 12 | 21 | 29 | 36 | 49 |
| 2.5 | 2 | 4 | 13 | 23 | 32 | 40 | 54 |

Reading: at the logged kill rate you lead by about 3 levels at 5:00 and finish about 1 level behind the waves. Real kill rate rises with
density, so expect the top row to be the early game and the bottom row the late game. G.Log.pacing() on a real run is the check; K is the one knob.

## What changes (all in docs/proposals/xp-curve.diff)
1. js/core/stats.js: `XP_SCALAR`, `xpToNext(L)`, `xpYield(bx, Le, Lp)`, exported.
2. js/entities/player.js: `xpFor(L)` returns `G.Stats.xpToNext(L)` (run-scoped, no save impact).
3. js/data/enemies.js `defFor`: wild defs carry `bx` and `xpMul` (tank 1.3). The old tier `xp` stays as LEGACY (bosses/minion fallback), now unused for wild XP.
4. js/entities/enemy.js: reads `bx`/`xpMul` in the constructor; `die()` computes `this.xp` from the formula just before `dropXp` (the manager logs the kill after die(), so the KILL line shows the real value);
   shiny and golden multiply `xpMul` too; minion def gets `bx` of its own species and `xpMul` 0.25. Bosses (`bx` undefined) take the old path unchanged.
5. js/systems/spawner.js: `XP_K` 5.6 removed; the elite bump becomes `xpMul *= 1.6`.
6. js/entities/pickup.js: `xpBig` when value >= 5% of the lead player's `xpNext` (`BIG_XP_SHARE`, was flat 20). Boss bursts stay xpBig.
7. js/world/world.js: rock drop = `xpNext * 0.01` of the lead player (was flat 6).
8. js/systems/log.js: KILL and XP lines print XP with 2 decimals (fractional values).
9. tools/add_base_stats.py: also writes `"bx"` into js/data/pokedex.js after `"stats"` (PokeAPI base_experience, default form). Run once: `python tools/add_base_stats.py`.
   Tested on a copy: 966 species, bx 36 to 608, ZERO needed the BST fallback (the 49 blank CSV rows are alternate forms, not in the dex), fallback `round(bst*0.4)` still coded as a safety.
   pokedex.js is generated, so its diff is not in the patch.

## Watch items (known, intended unless you say otherwise)
- Early levels: at L1 to L3 the next level costs 7 to 37 XP, so most kills are 5%+ of a level and every orb draws as the big one. By L10 only shinies, golden and elite kills do. Visual only.
- The perk `xpMul` and the co-op factor still multiply on pickup, so the rock's "1%" is 1% before those bonuses.
- Bosses keep flat 220 to 1800 XP. With the cheaper early cost a boss at 3:00 is worth a few levels, later ones a fraction of a level. Accepted until the boss rework.
- Co-op: copies (`remote`) return before the drop, so only the host computes XP. Level used is the highest among players. Not tested (MP deferred).
- Tank xp in `defFor` is now `xpMul` 1.3, so the legacy `xp` number no longer matters for wild enemies.

## Apply steps (after your OK)
1. `patch --binary -p1 < docs/proposals/xp-curve.diff`, then `python tools/add_base_stats.py` (pokedex.js).
2. `node --check` on the 8 JS files; offline re-run of the replay against the real tree (script in the scratch dir, re-run on the real files).
3. changelog.js entry (English, free-edit), BALANCE "XP curve / run pacing", DECISIONS entry, TODO move to Done, DEVLOG.
4. You: commit, playtest on dev.html?dev, send `G.Log.pacing()` and a few `G.Log.print(30)` outputs. Then retune K from the logs.
