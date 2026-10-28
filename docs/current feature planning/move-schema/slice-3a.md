# Slice 3a: data and grammar corrections (DONE 2026-10-26)

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This is the record of an executed slice. Its decisions are absorbed into docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). Where this text and those documents differ, those documents win. Body below unchanged.

Back to slice-overview.md. Prior slice: slice-2.md. Next: slice-3b.md.
No combat code. Nothing the game loads.

## What was built
- Grammar (move-attributes.js): top-level `persistent`; `delivery.delay`, `delivery.range`, `delivery.locationPick` (caster or enemy, only with targeting location); stat `duration` and `maxStacks` default to 6; `casterState.delay` retired; the spread definition (total fan, evenly spaced, 2 pi / count at 2 pi or more) written into the grammar comment and docs/MOVE-AXIS-SCHEMA.md.
- Resolver (move-resolver.js): reads `persistent` instead of guessing from endOn; derives `basePower` = power x accuracy / 100; fills `range` (TUNING.RANGE 420) where a move acquires a nearest target, picks a location, returns or repositions (also on inline emit children, one level deep); fills `locationPick` enemy; TUNING.INSTANCE_CAP 8 (read by the executor in 4d).
- Data: Quick Attack returnHits out; Karate Chop fighting; Meteor Mash emit count 1; Toxic Spikes interval emitter every 0.25 with a 100 px start child; Heat Wave, Hyper Voice, Bulldoze, Dark Pulse, Dazzling Gleam and the Discharge ring start at 1 px with grow.max = the old radius; Rock Slide delay on the instance; persistent on Fire Spin, Leaf Storm, Bug Buzz, Night Shade, Toxic, Flame Wheel; range 210 on Razor Leaf and 230 on Bonemerang; stat chances restored (Metal Claw 10, Flash Cannon 10, Shadow Ball 20); Bug Bite cd 0.42 and Shadow Ball cd 1.2 in move-overrides.js.
- Tools: 5 validator self-tests and 5 resolver self-tests added; coverage and parity reports regenerated.

## Results
check.js: 17/17 harnesses, export current, 63/63 valid, resolved 63/63 valid. One failure remains by scope: the move_parity self-test hard-codes hail.

## Left out by scope (decide before or during later slices)
- Fix the move_parity hail self-test (point it at a synthetic override).
- The review section 2.4 validator rules (persistent forbids cd and needs notActive; cooldown moves need a cd; pierce on shapeless moves; turnRate or aimTrack with direction or none targeting; contact trigger with time 0; interval shorter than rehit; emit count above 1 on one-shot triggers; grow on a full arc or max below start; stat side foe with team scope; returnHits without a turnaround).
- Deep-freeze G.MoveDefs (invariant I2). Until then nothing may mutate it.
- Set `locationPick` per move if the enemy default is wrong for one (Spikes, Rock Slide, Toxic Spikes, Will-O-Wisp use it).
