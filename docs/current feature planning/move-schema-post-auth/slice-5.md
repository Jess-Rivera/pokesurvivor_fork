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
- Cards are TEAM-WIDE for the run (Jess, 2026-10-30): the team-wide upgrades branch is folded into 5b, including the two stat stage cards (SS10). Supersedes the earlier same-day call to build them in that branch.
- Gym Harden: slice 7a, not this slice.
- SLOW and HASTE (enemy carrier Speed stages) stay outside the tracker model, on their CARRIER timers (COMBAT-RULES "Stat stages", carrier statuses). The tracker build must leave their stage application working.
- Each tracker is clamped to +-6 on its own (COMBAT-RULES:SS6). A fizzled pure buff waits one Gate (SS8).
- A pure buff casts only while its group is active, and a swap-in cast waits while its Gate is running (COMBAT-RULES:SS8, Jess 2026-10-30). The Bond tax is not in this slice (Bond branch).
- Split (2026-10-30): 5a = stat stage trackers, plan map docs/ASCII Concept Maps/Slice 5a - Stat Stage Trackers.txt, both plan rulings in, build not started. 5b = team-wide upgrade cards from fields, plan map docs/ASCII Concept Maps/Slice 5b - Cards From Fields.txt. 5b builds after 5a (its Gate and Duration cards need the trackers).
- 5b card list (Jess, 2026-10-30): cards grouped General (Type, Gate Reduction, Duration Increase, HP Regen for the bench only, Vitamins with a pick of 3 stat bonuses), Space (Area Up, Presence Up, Count Up only where copies spread out, Pierce Up, Chain Up), Delivery (Reach Up, which also lengthens flight time; Delay Down; Speed Up; Time Up on emitted or spawned things only; Cooldown Down), Payload (Damage Up, Knockback Up, Ailment Chance Up, Heal Up, Shield Up, Recoil Down). Deferred: Dodge Cooldown (dodge branch), Splash. Names are working names. Full field map and defaults in the 5b map.
- Build handoff for 5a and 5b: slice-5-handoff.md.

## Tests
The plan names every new or changed file (harness, mutation runner, intent scenarios, debug sets, check.js) before approval. Expected coverage: same stacks give the same effective definition in any order; G.MoveDefs unchanged after upgrades; cardLock fields never change; no pierce card on UNLIMITED or shapeless moves; the tracker timings reproduce exactly (Swords Dance +6 at 12 s, Harden +6 at 30 s, Leaf Storm -6 at 24 s, a dry window resets only its own tracker); the intent scenarios for the seven moves above are rewritten from the 2026-10-30 rulings; the 4c-0 maxStacks assertions are retired; all earlier harnesses green.

## Proceed when
Harness green, check.js green, Jess plays a full run on the flag with upgrades.

## Results
- 5a DONE 2026-10-31 (Quick): pass 1 (trackers) and pass 2 (retired maxStacks and stat duration) built and verified; Aqua Ring moved to a persistent heal aura. check.js green, mutation runners green, Jess feel-tested. Detail: slice-5-handoff.md. Drop re-review done (Jess).
- 5b: not started.
