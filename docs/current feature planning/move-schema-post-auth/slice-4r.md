# Slice 4r: route the remaining plain moves

Back to slice-overview.md. Prior: slice-4c-2.md (4r is built before 4c-3; it needs only 4c-1). Next: slice-4c-3.md, then slice-4d.md.

## Why this slice exists
Routing is an explicit id list (js/systems/move-route.js). The old plan routed only each slice's canaries and assumed the rest would follow, so 20 moves that need no new axis have no slice that routes them. Without this slice the flip in 7b would drop them.

## Objective
Route 20 moves whose axes are all built by 4c-1. No new axis, no new rule. Built before 4c-3 (swap allowed by slice-overview): 28 to 48 routed now, 53 once 4c-3 lands.

## Moves (axes from the resolved data, re-checked 2026-10-29)
- Static arcs and circles, nearest or none: vine-whip, karate-chop, lick, metal-claw, powder-snow, dazzling-gleam, wing-attack, bug-bite, hyper-voice, dark-pulse.
- Linear: flash-cannon, psybeam.
- Travelling points: poison-sting, rock-throw, shadow-ball, thunder-shock, sludge.
- Self-casts: agility, harden.
- Persistent static circle: bug-buzz (R7 from 4c-1; its foe Sp. Def cap of 1 is a MOVE-INTENT ruling, built in 4c-0).

## Rulings to respect
MOVE-INTENT bug-bite (cd 0.42, berrySteal stays a stub: routing must not throw on the stub), karate-chop (Fighting), metal-claw (maxStacks 1 after 4c-0), bug-buzz (rehit 0.5 at full power, Sp. Def -1 at 100% held at -1). Nova start sizes (MOVE-AXIS-SCHEMA Q1) for hyper-voice, dark-pulse and dazzling-gleam.

## Approved plan (Jess, 2026-10-29)
Plan written on Opus at home; build in a Sonnet session. Prose only; the build writes the code.

### Data findings (no rule change, know them before the feel test)
1. Thunder Shock is the first chain on a travelling point (Thunderbolt chains from a target-anchored strike). The move-sim chain code is generic. Its one hop (hopRange 60) is at full damage, since the move has no chainDamageFalloff entry (combat-architecture D15 multiplier is 1 without one).
2. Psybeam is the first routed confusion rider on enemies (G.Status confusion exists for enemies).
3. Dazzling Gleam is the first growing partial arc (half circle, radRadius 1 to 130 at 650 px/s) aimed at the nearest enemy. Earlier growing shapes were full rings.
4. Poison Sting, Rock Throw and Shadow Ball lose the small random scatter the legacy shots had: the executor ignores `spread` at count 1 (MOVE-AXIS-SCHEMA `spread` row). Existing rule, a visible difference.
5. Bug Bite: the berrySteal executor is already a no-op stub in move-effects.js; the harness proves a hit does not throw and changes nothing.
6. Metal Claw (47.5) and Rock Throw (45) carry accuracy folded into basePower by the resolver. Existing rule.
7. Agility (Speed +2) and Harden (Defense +1): team self-buffs, duration 8, cd 8, maxStacks 1 (the Swords Dance pattern). Agility's `spd` maps to Speed through D31.
8. Bug Buzz: persistent static circle like Night Shade.

### Build steps
1. js/systems/move-route.js: add the 20 ids to ROUTED as a new line commented "4r plain moves".
2. New harness docs/proposals/move-plain-harness.js, setup copied from the other move harnesses (real stats, status, stages, enemy, player, move data chain, G.MoveGeom, G.MoveSim, G.MoveEffects; stubbed world, FX, enemy manager). For each of the 20:
   - casts headlessly against a standard dummy layout without throwing;
   - geometry: arcs hit inside the arc and miss just outside it, rings hit everything in reach exactly once, beams hit along their line and not beside it, shots hit and end (Shadow Ball pierces one), self-casts touch no enemy;
   - damage equals an independent D6 to D11 computation written in the harness (pattern: move-sim-harness.js property test);
   - riders roll at the data chance over many seeded rolls, within 4 standard deviations (burn, poison, freeze, paralysis, confusion, flinch, knockback, the Sp. Def drops, Metal Claw's Attack raise);
   - special checks: Thunder Shock hops exactly once at full power and only within 60 px; a Bug Bite hit does not throw and the stub changes nothing; Bug Buzz re-hits at 0.5 s and holds Sp. Def at -1; Agility and Harden cap at one application of their stages.
   check.js runs it automatically. No mutation runner (no new runtime logic).
3. Intent scenarios in docs/move_rework_holding/move-intent-scenarios.json: one or two per move, expected outcomes hand-derived from MOVE-INTENT or the data and the D-table, never copied from code output. The 16 moves with no MOVE-INTENT entry are reviewed with the batch (CLAUDE.md "Move review rule"): Jess reviews the tools/move_report.js table and signs off in `batchReviewed`.
4. js/core/debug.js: four new G.Debug.newcombat sets instead of one 'rest' set (approved), each with slow awake dummies (20 px/s) so knockback, confusion wander and the chain show:
   - 'arcs': vine-whip, karate-chop, lick, metal-claw, powder-snow, wing-attack, bug-bite
   - 'novas': dazzling-gleam, hyper-voice, dark-pulse, bug-buzz
   - 'shots': poison-sting, rock-throw, shadow-ball, thunder-shock, sludge, flash-cannon, psybeam
   - 'buffs': agility, harden
5. tools/smoke-newcombat.js: a page per new set; fail on any page or console error, a slot ticked by both systems, or no hits landing ('buffs' checks a stage rises instead).

### Risks
Low. Most likely: Thunder Shock's travelling chain or Dazzling Gleam's growing arc exposes a gap in an existing axis; fix it in the sim and say so. A genuinely new rule is a stop-and-ask (slice-overview rule 4). Bug Buzz at about 3.5x legacy throughput is an approved slice 6 item, not tuned here.

## Exclusions
Emitters, mines and Spikes (4d). Hail (D-HAIL, 7b). Balance (6).

## Proceed when
The new harness and every earlier harness and intent scenario pass, check.js green, smoke passes, Jess feel-tests the four sets and logs feel issues to the board, and signs off the batch in `batchReviewed`.

## Results
(not started; plan approved 2026-10-29)
