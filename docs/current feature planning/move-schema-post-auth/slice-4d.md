# Slice 4d: emitters, mines and the instance cap

Back to slice-overview.md. Prior: slice-4r.md. Next: slice-5.md.

## Objective
`emit` with every trigger, inline children, deferred spawns (R6), contact-triggered mines, and the cap on unbounded placed objects. Route the last nine moves (62 routed; Hail is decided in 7b).

## Rules (owners)
Architecture D29, R6, C5, C6, H4 (emitter is its own instance), H6 (instance cap, TUNING), H13 (children deal full parent power), H14 (never emit at or after the end). MOVE-INTENT meteor-mash (fan of 3 at enemy 1's position, ignoring enemy 1), toxic-spikes (11 emissions in 3 s), spikes (not persistent, no timeout, bounded by the cap), toxic (escalating DoT and ribbon accepted as stand-ins), gust [Open]. MOVE-AXIS-SCHEMA `emit` row, emit counts (CP1-Q7), `locationPick`.

## Blocking decisions
- D-GUST: Gust per-shot spread (MOVE-INTENT gust lists the three options; a new field is a stop-and-ask). The emission-timing test depends on the answer.
- D-LOC: locationPick for Spikes, Toxic Spikes and Will-O-Wisp. The resolver defaults every location move to a random enemy within range; the legacy game placed mines at the caster's feet. No MOVE-INTENT ruling exists yet. The answers go into MOVE-INTENT.

## Moves
discharge, gust, fairy-wind (cast or interval emitters), toxic and flame-wheel (persistent emitters, casterMove trail for Flame Wheel), toxic-spikes and will-o-wisp (placed emitters), meteor-mash (enemyHit emitter), spikes (contact mine).

## Tests
Per the owners: Meteor Mash struck enemy takes 1 parent hit and 0 shard hits, 3 shards spawn at the impact point; Toxic Spikes 11 applications, first ring reaches an enemy at 150 px 0.125 s after emission, none at 250 px; Discharge two rings; trail patch count follows owner moving time; a 9th Spikes mine removes that slot's oldest; Gust per the D-GUST answer. All earlier harnesses and the Stage 0 suite pass.

## Proceed when
62 moves routed, the harness and the whole Stage 0 intent suite pass, check.js green, Jess signs off the emitter set in play.

## Results
(not started)
