# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-30 afternoon (Quick, work machine; design session, docs only).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 4d signed off, 62 of 63 routed (Hail in 7b).
- Today: D-MC5 discussion turned into a from-scratch stat stage model, written up as [Proposed] in docs/proposals/stat-stage-model.md (R1 to R12). Core: one tracker per (Pokemon, move, stat); each climb adds the move's pokeapi stages; global Gate 6.0 s and Duration 6.1 s; every success refreshes, a success with the Gate open climbs; a dry window resets only that move; self-side rolls once per cast on the first enemy hit, foe-side per enemy hit; self drops climb on Gate x 2 (Leaf Storm -6 at 24 s, swap is a reward not a requirement); two team-wide cards (Gate, Duration) hit everything the team causes, including self drops.
- If approved it retires maxStacks, Q13, Q15/QA-11, D-FOECAP, D-LEAF, the Dragon Dance and String Shot exceptions, and D-MC5.
- Slice 5 plan is ON HOLD until Jess rules on the model.
- No game code or js/data touched today; check.js not needed. Quick cannot run Node: Jess runs every check here.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- Stat stage model [Proposed]: Jess has one more set of questions. Open inside it: Bond tax (to the Bond branch), Q3 (Haze, Psych Up, Heart Swap, Spectral Thief, Topsy-Turvy), raises on foes and whole-field moves, a check against BOSS-REWORK strong-host rules.
- Psychic widening [Open] (slice 6). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open].
- Spikes on an owner faint: deferred to the MP phase.

## Docs and code still differ (approved, not built)
- In this branch: QA-11 formula (5, may be retired by the model); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization; DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess commits and pushes today's docs (4d too, if not done).
2. Jess's remaining questions on the stat stage model, then Q3, then approve or revise it.
3. Re-plan slice 5 against the ruling (targeted read, per-feature prose plan, tests section naming every new file).
4. Board: re-sync (today's fetch failed); #16 animation sync is filed but unlabeled. #15 waits for slice 6.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for plain routing, the simulator CLI, docs and catch-ups; Opus for new runtime (5, D-ENEMY, 7b, the stat stage model build); Haiku for searches.

Rules: CLAUDE.md.
