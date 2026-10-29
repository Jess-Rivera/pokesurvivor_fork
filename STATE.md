# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-28 (Claude Code, home; Phase 4 docs consolidation closed at B9, no game code changed).

## Where we are
- Documentation consolidation (Phase 4, branch chore/documentation-authority-audit) is closed. Jess merges it into feature-test/new-move-schema with --no-ff (CP7). Coding resumes after the merge (QA-00).
- Rules now live in one place each: see CLAUDE.md "Where current rules live". DECISIONS.md is a log; its `Canonical:` line names the spec that wins.
- Move schema: slices 1 to 3d, 4a, 4b DONE. 4c is planned in three sub-slices (4c-1, 4c-2, 4c-3), handoffs in docs/current feature planning/move-schema/. The slice files will be reworked on return to that branch.

## Docs and code still differ (approved, not built; each needs its own prose plan)
- maxStacks: code default is 6 (js/data/move-attributes.js); approved default is 1 (Q14).
- Metal Claw and Meteor Mash are authored at maxStacks 2; approved 1.
- Foe debuffs are capped per move in js/systems/stages.js (add, `live`); approved: no per-move cap on foe debuffs, only the +-6 ladder.
- Self-buff maxStacks derived from upgraded duration and cooldown is not built (QA-11; A.3-3 authored floor only if needed).
- Legacy Fire Spin strip and burnHalf still live (js/data/moves.js:61, js/systems/combat.js); remove now or leave to slice 7 (QA-10).
- E1: unverified whether it still blocks trapping enemies on the live path (QA-10).
- QA-08 run loop not built: end-of-region choice UI, loops and Keep Going, Next Region carry-over, level clock past the L50 clamp, completion bonus replacing the time bonus, Legendary arena, The Climb, Arceus, Descendant Mutation, backward-compatible save fields. Spec: BOSS-REWORK.md 4a, GDD.md.
- QA-13: slice 7 ships the Brock-only gym fallback (Q18).
- Later organization branch: boss doc renames and moves, comment repoints in elites.js, gym.js, gyms.js (Q1, QA-06).

## Next (in order)
1. Merge the consolidation branch (CP7), then pick the first code-gap item or resume 4c-1, Jess's call.
2. After 4c: slice 4d (emitters). Hail toggle item (parked). Balance pass for all routed moves.

## Board note (snapshot 2026-10-27)
- 14 items. Shipped #7, #4. In Progress #2. Blocked #3, #8, #11. Accepted #1, #5, #6, #9, #10, #12, #13, #14. Label vs board drift still to fix.

Rules: CLAUDE.md.
