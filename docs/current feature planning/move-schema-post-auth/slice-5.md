# Slice 5: upgrades from fields and the stat stage tracker model

Back to slice-overview.md. Prior: slice-4d.md. Next: slice-6.md.

## Objective
Upgrade cards work on new-path moves (until this slice new-path moves ignore cards), and the new path's stat stages run on the approved tracker model. Retires maxStacks and the stat `duration` field on the new path; the QA-11 code gap closes by retirement.

## Rules (owners)
- Effective definition per slot: architecture D4, I2, C2 (G.MoveDefs never mutated; a fresh fold per slot when its stacks change).
- Upgradeable keys come from each move's own fields minus `cardLock` (MOVE-AXIS-SCHEMA top-level fields); a pierce card is never offered on an UNLIMITED-pierce or shapeless move (architecture F, "Other interactions").
- Lens and size: architecture D36. The parked "size upgrade on a pierce-0 point" item (MOVE-AXIS-SCHEMA "Parked decisions") is revisited here, by feel.
- Stat stages: COMBAT-RULES "Stat stages" SS1 to SS13; runtime combat-architecture:H26; retired fields MOVE-AXIS-SCHEMA "Retired stat fields"; per-move rulings MOVE-INTENT bug-buzz, dragon-dance, ice-beam, leaf-storm, meteor-mash, metal-claw, string-shot (2026-10-30).
- No normalization: architecture D37, H8.

## Blocking decision
None. D-MC5 was superseded on 2026-10-30 by the stat stage model (DECISIONS 2026-10-30).

## Scope
- Replace the kinds.js per-kind key table for new-path moves with field-derived keys; map card keys to schema paths; levelup.js and the card pool offer only valid cards per move. Legacy moves keep kinds.js until 7b removes it.
- Build the tracker model on the new path (SS1 to SS13), replacing the per-move cap (H2, H24) and the per-move stat `duration`. Pure buff moves cast when their Gate opens (SS8, player side only).
- The legacy path keeps TEAM_LIVE, ROLL_GAP and procSelf until 7b.

## Plan rulings (Jess, 2026-10-30)
- Retired fields: `maxStacks` and stat `duration` are removed from the new-path data, the resolver defaults and the overrides once the tracker harness passes; the validator then rejects both. The legacy table keeps its own fields until 7b.
- The two team cards (SS10): NOT in this slice; built in the team-wide upgrades branch (TODO Backlog). Until then stage timing has no upgrade.
- Gym Harden: slice 7a, not this slice.
- SLOW and HASTE (enemy carrier Speed stages) stay outside the tracker model, on their CARRIER timers (COMBAT-RULES "Stat stages", carrier statuses). The tracker build must leave their stage application working.

## Tests
The plan names every new or changed file (harness, mutation runner, intent scenarios, debug sets, check.js) before approval. Expected coverage: same stacks give the same effective definition in any order; G.MoveDefs unchanged after upgrades; cardLock fields never change; no pierce card on UNLIMITED or shapeless moves; the tracker timings reproduce exactly (Swords Dance +6 at 12 s, Harden +6 at 30 s, Leaf Storm -6 at 24 s, a dry window resets only its own tracker); the intent scenarios for the seven moves above are rewritten from the 2026-10-30 rulings; the 4c-0 maxStacks assertions are retired; all earlier harnesses green.

## Proceed when
Harness green, check.js green, Jess plays a full run on the flag with upgrades.

## Results
(not started)
