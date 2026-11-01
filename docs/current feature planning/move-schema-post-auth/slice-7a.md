# Slice 7a: move every other reader off `kind`

Back to slice-overview.md. Prior: slice-6.md. Next: slice-7b.md.

## Why this slice exists
The legacy move table (js/data/moves.js, `kind`, `cd`, `cat`, `radius`, `arc`, `norm`) is read by more than the player path. Deleting it in 7b would break those readers. The old plan noted that enemy and gym-leader use of the new definitions is covered by no slice.

## Readers to migrate (from ../move-schema/slice-1.md and slice-7.md, re-verify by search at the start)
enemy.js boss casts (kind, cd, cat, radius, arc), gyms.js (BOSS_FORMS, Moves.BY_ID, instance, addStack), gym.js, kinds.js (also slice 5), mechanics.js, icons.js, levelup.js, menu.js, and any other `Moves.BY_ID` or `kind` reader found by search.

## Blocking decisions
- D-ENEMY [Approved] (Jess, 2026-10-31): option (a). Bosses and gym leaders cast through G.MoveSim with an enemy owner, scoped to what Brock needs (Q18); other gyms come with the gym-roster branch. Brock's upgrade stacks become numbers set directly in the roster (no team cards on bosses, no G.Moves.addStack). Rejected: (b), boss-only cast code reading G.MoveDefs (risked a derived `kind`).
  - Code read 2026-10-31 (to confirm in the plan): the sim already runs the frozen G.MoveDefs def for an owner with no team store (move-sim.js defOf), and the Gate falls back to 1. Player-bound today: foe queries are hard-wired to G.EnemyMgr; hits call the enemy's hurt signature; prop damage assumes the player; the owner must supply level, stabFor, moveFactor, item multipliers, unrootedSpd and mvRoot.
- D-COOP [Approved] (Jess, 2026-10-31): no co-op work in 7a. Co-op cannot run in the local-first phase (the net stack it needs is deferred and does not work), so there is no local co-op behavior to preserve. The co-op skip in move-route.js and other legacy co-op hooks are handled with the 7b purge; co-op on the new path is designed in the MP phase (TODO deferred section).

## Scope
UI readers (icons, menu, levelup) read resolved fields or a display name, never `kind`. Gym and boss code per D-ENEMY. Brock's fight works end to end on the new definitions (QA-13). Gym Harden moves onto the stat stage tracker model (COMBAT-RULES:SS13; Jess, 2026-10-30).
- Brock scope (Jess, 2026-10-31): only roster slot 1 (Geodude line: Tackle, Rock Throw, Harden) must work end to end, since loop 1 fields slot 1 only. Slots 2 to 6 keep their PROVISIONAL move sets (picked to fit the old boss forms) and only have to pass the new gym data check; their real move sets come with the gym-roster branch. Order: the boss and gym plan first, the UI readers second.
- 7a-0 first (Jess, 2026-10-31): gyms only. Commit A removes rifts, legendary fights and the Judgment (gym arena moves to js/systems/gym-arena.js); commit B splits the gym AI into js/entities/boss-ai.js (GymBrain), no behavior change. Plan: docs/ASCII Concept Maps/Slice 7a-0 - Gyms Only Plan.txt. The 7a enemy-owner casts then land in GymBrain.

## Tests
A search guard: no `kind` read outside files 7b deletes. Existing boss and gym harnesses green. Brock fight smoke test; Brock's Harden reaches +6 after about 30 s of steady casting (SS13). Menus and level-up screens show every move correctly.

## Proceed when
Every reader is migrated or listed for deletion in 7b, check.js green, Jess plays a run that reaches Brock.

## Results
- 7a-0 commit A BUILT 2026-10-31 (Quick), committed as a2c0cf1. Removed: js/systems/judgment.js, js/systems/rift.js (its gym half is now js/systems/gym-arena.js, G.GymArena), the old boss AI in enemy.js (gym leaders keep bossInit, bossMove, bossEnd and the gym* methods), the rift, legendary and minute-30 achievements, the weekly rift mission, the HUD rift labels, the legendary and boss x10 drops, the rift and Judgment music, the Judgment sounds and hazards. Kept: the pokedex leg flag (spawn exclusion), old save fields (core/db.js), gacha legendaries (D1), js/net/ (deferred; coop.js still names the removed modules, TODO deferred).
- Side effects for Jess to confirm: the 'arenas' achievement (win in 18 rift arenas, it sat in the rift category) is removed too; a gym win no longer fires the rift progress event (its counters had no readers left); a gym leader kill no longer writes save.legends (an old quirk); the arena HUD line reads GYM; the admin run-review warning is now English; bossEnd no longer burns one unused random roll.
- 7a-0 commit B BUILT 2026-10-31 (Claude Code), not yet committed. js/entities/boss-ai.js (G.Boss): G.Boss.make is the only boss spawn; the GymBrain holds every gym leader decision (setup, init, step, end, flinch, factor, buff, pick, cdAfter, start, cast, shoot, restore) and its fight state. enemy.js only delegates (update -> brain.step, applyFlinch -> brain.flinch). A seeded old-vs-new trace matched exactly. New boss-split harness (24 checks) and mutate (6/6). The 7a enemy-owner casts land in GymBrain.cast and GymBrain.shoot. For multi-mon arenas (Loop 2+): one brain per body, so G.Boss.make can run per roster slot; what still assumes one leader is in gym-arena.js (single bossId, one spawn point) and gym.js (per-def enrage clock, one cast tally).
- Tests: docs/proposals/gyms-only-harness.js (new, 30 checks: modules, search guard, lists, old save and goals screen, legendary-free pools, arena pause with a control run, gym win package) and gyms-only-mutate.js (new, 6/6 caught in the sandbox). Updated: gym, gym-reward, status-sliceD2, move-riders harnesses and move-riders-mutate (22/22). Quick sandbox: 29 of 30 harnesses pass; items-f3d2 (runtime-patched db.js) and move-geom (runInNewContext) need node.
