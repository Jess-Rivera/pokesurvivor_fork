# Slice 4c-0: maxStacks default and the foe-debuff cap

Back to slice-overview.md. Prior: slice-0-doc-fixes.md. Next: slice-4c-1.md.

## Objective
Bring the new path's stat-stage stacking to the approved rules before more moves are routed. Closes three STATE.md code gaps: the maxStacks default (6 in code, 1 approved), Metal Claw and Meteor Mash authored at 2, and the per-move cap on foe debuffs.

## Rules (read, do not restate)
- docs/COMBAT-RULES.md "Stat stages and maxStacks" (default 1; self-buffs only; foe debuffs stack to the -6 ladder).
- docs/MOVE-AXIS-SCHEMA.md "maxStacks field rule" (including the code-gap note).
- docs/MOVE-INTENT.md ice-beam, bug-buzz (per-move foe cap 1), metal-claw, meteor-mash (1), string-shot (double application allowed).
- combat-architecture.md D30, H2, H16, H18.

## Current data (resolved, 2026-10-28)
Self raises: Swords Dance, Agility, Harden, Dragon Dance (both raises) authored 1; Metal Claw and Meteor Mash authored 2; Leaf Storm self drop authored 1. Foe drops authored 1: Ice Beam, Bug Buzz. Foe drops on the grammar default (6 today): Shadow Ball, Flash Cannon, Psychic, Mud Shot, Bulldoze, String Shot, Bubble Beam.

## Scope
- Grammar default for `maxStacks` from 6 to 1 (move-attributes.js), Metal Claw and Meteor Mash to 1 in the source JSON, then regenerate (flagged data edits).
- New path only: a foe-side stat effect has no per-move cap, except where MOVE-INTENT names one. The legacy path (TEAM_LIVE 8, removed in 7b) is untouched.
- Expected to change move-effects.js (which passes the cap) and possibly move-resolver.js. If js/systems/stages.js must change, stop and ask first (the 4c handoffs keep it off-limits).

## Decision (D-FOECAP, answered 2026-10-29)
Reading (a), Jess 2026-10-29: the resolver fills the `maxStacks` default on self-side stat effects only, so an authored value is the only thing that caps a foe drop (Ice Beam, Bug Buzz). Owners: MOVE-AXIS-SCHEMA "maxStacks field rule", combat-architecture:H24. No new field.

## Tests (harness, extending move-riders and selfcast)
- A foe drop without an authored cap stacks per application up to -6 (Mud Shot hit repeatedly reaches -6, never past).
- Ice Beam and Bug Buzz foe drops hold at -1.
- Metal Claw and Meteor Mash self raises hold at one live application per Pokemon (H18 tag).
- Swords Dance, Agility, Harden, Dragon Dance unchanged (already 1).
- String Shot still reaches -4 from its two strands (MOVE-INTENT).
- Flag off identical; validator and --resolved checks pass; all earlier harnesses green.

## Exclusions
The self-buff upgrade formula (slice 5). Strong-host rules (BOSS-REWORK.md). Legacy stacking.

## Proceed when
Harness green, Jess has feel-tested the riders set (G.Debug.newcombat('riders')) and the self-casts set.

## Results
(not started)
