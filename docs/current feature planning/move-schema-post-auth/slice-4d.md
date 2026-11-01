# Slice 4d: emitters, mines and the instance cap

Back to slice-overview.md. Prior: slice-4r.md. Next: slice-5.md.

## Objective
`emit` with every trigger, inline children, deferred spawns (R6), contact-triggered mines, and the cap on unbounded placed objects. Route the last nine moves (62 routed; Hail is decided in 7b).

## Rules (owners)
Architecture D29, R6, C5, C6, H4 (emitter is its own instance), H6 (instance cap, TUNING), H13 (children deal full parent power), H14 (never emit at or after the end). MOVE-INTENT meteor-mash (fan of 3 at enemy 1's position, ignoring enemy 1), toxic-spikes (11 emissions in 3 s), spikes (not persistent, no timeout, bounded by the cap), toxic (escalating DoT and ribbon accepted as stand-ins), gust [Open]. MOVE-AXIS-SCHEMA `emit` row, emit counts (CP1-Q7), `locationPick`.

## Blocking decisions
- D-GUST: RESOLVED (Jess, 2026-10-30). Even 3-shot fan fired at once via the existing `spread` field; no new field. Ruling in MOVE-INTENT gust.
- D-LOC: RESOLVED (Jess, 2026-10-30). locationPick caster (the caster's feet) for Spikes, Toxic Spikes and Will-O-Wisp. Rulings in MOVE-INTENT spikes, toxic-spikes, will-o-wisp.

## Moves
discharge, gust, fairy-wind (cast or interval emitters), toxic and flame-wheel (persistent emitters, casterMove trail for Flame Wheel), toxic-spikes and will-o-wisp (placed emitters), meteor-mash (enemyHit emitter), spikes (contact mine).

## Tests
Per the owners: Meteor Mash struck enemy takes 1 parent hit and 0 shard hits, 3 shards spawn at the impact point; Toxic Spikes 11 applications, first ring reaches an enemy at 150 px 0.125 s after emission, none at 250 px; Discharge two rings; trail patch count follows owner moving time; a 9th Spikes mine removes that slot's oldest; Gust per the D-GUST answer. All earlier harnesses and the Stage 0 suite pass.

## Proceed when
62 moves routed, the harness and the whole Stage 0 intent suite pass, check.js green, Jess signs off the emitter set in play.

## Results
Built 2026-10-30 (Quick, work machine), from the approved prose plan. Jess ran check.js on the work machine and reported it green (output not pasted); he feel-tested the nine moves in newcombat('emit') and they behave as intended, tuning left for slice 6. move-emit-mutate.js: 25/25 mutations caught (Jess, 2026-10-30).
- Data (move-conversions-described.json, re-exported to moves-generated.js by an emulation of tools/export_moves.js that reproduced the old file byte for byte first): Gust one cast emission of 3 shapes, spread 0.5; locationPick caster on Spikes, Toxic Spikes, Will-O-Wisp; Will-O-Wisp shot range 300.
- move-sim.js: emit with the cast, interval, casterMove and enemyHit triggers (D29), children deferred to the end of the step (R6), inline children carry the parent's identity and power (H13), never at or after the end (H14), shapeless emitters as instances (H4, Gust, Fairy Wind, Discharge, Toxic, Flame Wheel), pure emitters have no hitbox, the contact trigger (reason `triggered`), the instance cap (H6, reason `cap`), the `notActive` endOn check, a turret shot not fired with nothing in its range, the 'move:emit' event (C7). Termination trigger (added the same day on Jess's approval): one burst when the carrier ends naturally (time, pierce, wall, triggered, returned, arrived, offScreen), never on ownerDeath, notActive or cap, at the carrier's final position; children wait for the end of the step. No routed move uses it yet, so only synthetic moves cover it (harness test 11).
- move-effects.js: shapeless casts accept `emit` (the sim schedules it). move-render.js: the debug overlay skips shapeless emitters. move-route.js: the nine routed (62). debug.js: newcombat('emit').
- Tests: docs/proposals/move-emit-harness.js (tests 0 to 11) and move-emit-mutate.js (25 mutations); 10 intent scenarios (every routed move needs one). Unrun.
- Owner decisions closed here: D-GUST, D-LOC, Will-O-Wisp shot range 300 (decision A). Left open: Spikes on an owner faint (decision B, single player ends the run, a co-op hook later). Fairy Wind unchanged (decision C).
- Batch reviewed and signed off by Jess 2026-10-30 (feel-test of newcombat('emit')): all nine 4d moves added to `batchReviewed`. Tuning left for slice 6.
