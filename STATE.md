# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 end of session (Claude Code, home; slice 7b done, the move schema branch merged into main).

## Where we are
- feature-test/new-move-schema is MERGED into main (merge commit f9a2f2c, --no-ff, so it reverts as one unit). Work continues from main on new branches. Keep the old branch until main is feel-tested, then delete it.
- One move path: every move, player and gym leader, runs in G.MoveSim from its resolved def. No ?newcombat flag, no legacy engine. Plan history: docs/current feature planning/move-schema-post-auth/ (slice-overview.md, slice-7b.md "Results").
- 7b-3 done: docs sweep (12 files), DECISIONS line "Slice 7b done: one move path", smoke tools load plain ?dev only. log.js cleanup skipped (Jess).
- Tests on main: check.js 30/30, guards ok; smoke-ui and smoke-newcombat pass (run on the identical branch tree).
- New rule: tools/ is free edit (CLAUDE.md "Edit boundary").

## Next (in order)
1. Jess: a quick feel run on main (dev.html?dev).
2. Board: #17 unblocked (drop `blocked`, move from waiting); #1 and #6 still In progress.
3. Choose the next branch off main: the gym-roster move-import branch (Brock slot order, enemy-owned riders on the player, TODO), or #17 ESLint + Prettier (TODO "Lint and format tooling"; build config, so prose plan first).

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results).
- [Open] loop 2+: do a gym's mons share stat raises (TODO). Enemy-owned riders on the player (TODO, gym-roster branch).
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Gym AI Tier 2 (own branch). js/net/coop.js calls removed legacy hooks (co-op redesign, TODO). Three stale move-sim mutations (TODO Backlog).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
