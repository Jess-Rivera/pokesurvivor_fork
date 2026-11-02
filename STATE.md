# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02 (Claude Code, home; branch fix/playtest-kanto-moves, from main).

## Where we are
- Playtest fixes part 1 and the Team menu rework: built and feel-tested OK (Jess 2026-11-01). Team menu sprite centring works over http only.
- Kanto import batch 1 BUILT, not yet reviewed: 110 moves in the catalog, held out of player pools (G.Moves.HELD) until learnset pools. Built by tools/kanto_batch1.js; sleep allowed in the grammar; recoil on hit; status cooldowns proposed. Shapes now follow Jess's five shape rules (2026-11-02). Detail: docs/KANTO-BOSS-MOVE-IMPORTS.md "Batch 1" and "Batch 1 shape rules". Waves built (Sludge Wave, Heat Wave); Surf and Fly are movement skills (Fly joined batch 1, 111 moves). Open: Sand Tomb cd (1.17 s vs a 2.5 s patch).
- Tests: validators 173/173, check.js 30/30, smoke-ui pass, live casts headless on file://. smoke-newcombat SKIPPED (flaky; TODO Backlog).

## Next (in order)
1. Jess: open tools/kanto-batch1-review.html, override shapes, Export, put kanto-batch1-overrides.json in docs/move_rework_holding/. Then apply, write the hand-derived scenarios, batch review (move_report.js, batchReviewed).
2. Learnset pools (empties G.Moves.HELD; plan first). Then the boss translation of the imports (gym forms, recoil for leaders).
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
