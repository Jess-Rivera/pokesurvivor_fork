# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02 (Claude Code, home). fix/playtest-kanto-moves MERGED into main; next branch starts from main.

## Where we are
- Kanto import batch 1 DONE and signed off (111 moves, held out of player pools). Player learnset pools PARKED (Jess 2026-11-02: the imports are for the bosses).
- Gym loop-1 lore sets: slices 1 to 3 BUILT (Jess felt slice 3 good enough; balance passes wait for playtesters). Imports Roar (Blaine), Fissure (Giovanni), Future Sight (Sabrina) BUILT, not feel-tested. Loop 1 lacks only Reflect (Sabrina, fields slice) and Smokescreen (Koga, accuracy slice). Loops 2 to 6 hold the provisional sets.
- Tests: check.js 30/30, intent 2193, boss-owner 245 (18: imports), gym harness ALL OK, live loop-1 fights of Blaine, Sabrina, Giovanni on file:// (no page errors). smoke-newcombat SKIPPED (flaky).

## Next (in order)
1. Jess: quick feel of the imports: Roar's push on you (140 px, 0.2 s; cd 5 [Proposed] TUNE), Future Sight's 2 s marker, Fissure's heavy hit.
2. Remaining loop-1 gaps ride other slices (GitHub issues filed, status blocked): Reflect with the FIELDS SLICE, Smokescreen with the accuracy slice. Those two slices still need their own issues. Self-Destruct comes with later loops.
3. Then later loops, gym by gym (Psycho Cut still stands in for Psybeam on Porygon and Venomoth). Recoil and heals for the Elite Four come with that phase.
4. Cone and area moves ignore walls: needs a line-of-sight ruling, own branch.
5. Readability pass (Jeremy) and part 2 (item drops, New Move card frequency). Ask Jeremy about "Bosses" and "Magnetism".
6. Economy rework once coin data comes in. Fix the smoke-newcombat flake.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] Psych Up, Baton Pass, Swagger. HUD own-drop gap (proposed). Psychic widening [Open]. Base crit for leaders (none, by D10).

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
