# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 (Claude Code, home; branch fix/playtest-kanto-moves, from main).

## Where we are
- Jeremy's playtest notes (docs/ASCII Concept Maps/Jeremy Playtest.txt) triaged. Part 1 BUILT and feel-tested OK (Jess 2026-11-01: bonds work, bombs work, speed feels better):
  - Speed bounds 0.7 to 1.3 (was 0.5 to 3.0). Spe 130 and up all move at 139 px/s; k is the knob if fast mons should differ (BALANCE).
  - Bond belongs to the team: carried on swap; the bond screen first picks the Pokemon (keys 1-6), then its moves.
  - Bomb clears wild enemies in view outright (bosses, gym leaders, elites keep the old damage), then 3 s with no spawns.
- Tests: check.js 30/30, smoke-ui pass, headless checks of all three. smoke-newcombat SKIPPED (flaky; TODO Backlog).
- docs/Economy Balance Ideas.md reviewed: ranks after playtest fixes and move imports; needs coins-per-run data first (CONTRIBUTING now asks). Six open design questions (run-wide stacking, 40-point cap vs run-wide costs, curve per mon or once, unbuilt stats, Starting Moves vs Repertoire, save migration).

## Next (in order)
1. Commit part 1.
2. Kanto move imports: rulings DONE (4 sets, MOVE-INTENT; DECISIONS 2026-11-01). Next: plan import batch 1 (the ~114 moves that map straight), then the new mechanics (accuracy/evasion trackers, Protect, fields, rampage) in their own slices.
3. Cone and area moves ignore walls (Flamethrower etc.; move-sim only stops moving shots). Needs a line-of-sight ruling, own branch.
4. Readability pass (Jeremy): status chips, stat stage visibility, pause menu, explanations. Ask Jeremy what "Bosses" and "Magnetism" meant. Item drop rates and New Move card frequency (part 2).
5. Economy rework once coin data comes in. Bond tax last.
6. Gym cards after playtester runs (tools/move-lab.html). Fix the smoke-newcombat flake.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] stage-manipulation moves (Psych Up, Baton Pass), raises on foes (Swagger). HUD own-drop gap (proposed). Psychic widening [Open]. Base crit for leaders (currently none, by D10).

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2 (movement scoring), js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
