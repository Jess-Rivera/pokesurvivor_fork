# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02 (Claude Code, home; branch fix/playtest-kanto-moves, from main).

## Where we are
- Playtest fixes part 1 and the Team menu rework: built and feel-tested OK (Jess 2026-11-01). Team menu sprite centring works over http only.
- Kanto import batch 1 DONE and signed off (Jess 2026-11-02): 111 moves, shapes kept as built, a hand-derived scenario each, Sand Tomb cd 2.5. Still held out of player pools (G.Moves.HELD) until learnset pools. Detail: docs/KANTO-BOSS-MOVE-IMPORTS.md "Batch 1".
- Learnset pools step 1 DONE: the dataset (api_learnset_dataset.lean.json) now uses each Pokemon's latest game with a level-up list. Level-up + egg against our catalog: median 7 moves, 75 of 966 under 4 (Kanto: median 8, 8 under 4: Caterpie, Weedle, Metapod, Kakuna, Lickitung, Magikarp, Abra 0, Ditto 0).
- Tests: intent harness 2136/2136 (247 scenarios, 0 blocked), check.js 30/30, move report 0 reviews and 0 cd rulings pending. smoke-newcombat SKIPPED (flaky; TODO Backlog).

## Next (in order)
1. Learnset pools step 2 (game code, js/data/moves.js poolFor). Waits on four decisions: learn methods (proposed level-up + egg), type-pool top-up to 4 for thin learnsets (proposed), learn levels (proposed ignored for now), moves in old saves the species no longer learns (proposed kept). Then G.Moves.HELD empties.
2. The boss translation of the imports (gym forms, recoil for leaders).
3. New mechanics slices: accuracy/evasion trackers (+ Mud-Slap, Mirror Shot, Hone Claws), fields (Hail toggle + weather moves, TODO), Protect, rampage.
4. Cone and area moves ignore walls: needs a line-of-sight ruling, own branch.
5. Readability pass (Jeremy) and part 2 (item drops, New Move card frequency). Ask Jeremy about "Bosses" and "Magnetism".
6. Economy rework once coin data comes in. Gym cards after playtester runs. Fix the smoke-newcombat flake.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] Psych Up, Baton Pass, Swagger. HUD own-drop gap (proposed). Psychic widening [Open]. Base crit for leaders (none, by D10).

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
