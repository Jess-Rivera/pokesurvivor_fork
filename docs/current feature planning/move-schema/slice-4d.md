# Slice 4d: emitters, placed objects and the instance cap

Back to slice-overview.md. Prior slice: slice-4b.md and slice-4c.md.

## Objective
emit with every trigger, inline children, placed objects and mines, and the cap on unbounded placed objects. After this slice all 63 moves run behind the flag.

## Before starting (Jess)
Gust per-shot spread is still open: a data change to a 3-count simultaneous fan, or accept the legacy +-0.03 jitter, or a new emit-level aim jitter field (a new field is a stop-and-ask).

## Decisions (moved)
Decisions formerly listed here (answered by Jess, 2026-10-27, and since reconciled) now live in docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). The removed text is preserved verbatim in the Phase 4 ledger (B4b rows); the DEVLOG 2026-10-28 B9 entry names the commit that holds it. Build steps are unchanged (Q23).

Conflicts with the owning documents (B4a conflict list, approved at CP3). Resolve these when the slice is built; do not follow the old text where it conflicts:
- slice-4d.md "Reads": "Review section 9.1 rows Q7, Q16" points at text that is now history. Read instead: combat-architecture H4, H6, H14 and D29; MOVE-INTENT toxic-spikes, spikes and meteor-mash.

## Reads
Architecture D29, F (R6), C5, C6, E (runEmitters, checkEnd). Review section 9.1 rows Q7, Q16. Validation 2.5 scenarios 3 and 6.

## Build
- runEmitters by trigger: cast (first emission at activation, then every), interval (first at every), casterMove (one emission per every seconds of owner moving time), termination (once when the carrier ends), enemyHit (once per hit). `count` caps total emissions; the child's own space.count is shapes per emission.
- Children inherit the cast and the parent's id, power and type. They are inserted at the end of the step and act from the next frame (R6). An enemyHit child inherits the parent's hit record for the struck enemy.
- Placed objects: contact-triggered mines detonate once on contact (Spikes). Objects with neither a time lifetime nor HP are capped at INSTANCE_CAP (8) per move slot; the 9th removes that slot's oldest. Trail patches are independent instances.

## Canary moves
Gust, Discharge, Toxic, Flame Wheel, Toxic Spikes, Will-O-Wisp, Meteor Mash, Spikes.

## Tests
Gust emits at 0, 0.08 and 0.16 s. Discharge emits two rings 0.2 s apart. Toxic Spikes: 11 poison applications over its life for a close enemy, the first ring reaches an enemy at 150 px 0.125 s after emission, no hit on an enemy at 250 px. Meteor Mash: the struck enemy takes 1 parent hit and 0 shard hits, 3 shards spawn at the impact point, enemies on the shard lines are hit once each. Trail patch counts match owner moving time. A ninth Spikes mine removes the oldest.

## Proceed when
All 63 moves run behind the flag, the harness is green, and the whole intent scenario suite from Stage 0 passes.
