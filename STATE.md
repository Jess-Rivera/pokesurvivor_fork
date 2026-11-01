# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 end of session (Claude Code, home; 7b-1, 7b-2a, 7b-2b and the gym freeze fix committed and pushed).

## Where we are
- Branch feature-test/new-move-schema, pushed, clean. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md; 7b detail: slice-7b.md "Steps" and "Results".
- Slices 5, 6, 7a DONE. 7b-1 flip (8b7cbb7), 7b-2a purge (496118a), 7b-2b (be9b512), gym freeze fix (47f3dd5). All feel-tested by Jess.
- One move path now: every move runs in G.MoveSim; the legacy engine, kinds.js, mechanics.js, ROUTED and the legacy stage stacking are gone. Bubble and Hail retired (G.Moves.RETIRED). Legacy table archived at docs/move_rework_holding/legacy-moves.js (tools only).
- Tests: check.js 30/30, guards ok, smoke-ui and smoke-newcombat pass. Board: In progress #1, #6, #17 (#17 waits for the merge).

## Next (in order)
1. 7b-3, the last slice: follow the numbered work list in slice-7b.md "Steps" (docs sweep with per-file counts, optional log.js cleanup, DECISIONS line, merge commands). Main has 2 issue-template commits the branch lacks; merge main into the branch first.
2. After the merge: the gym-roster move-import branch; #17 ESLint + Prettier.

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results).
- [Open] loop 2+: do a gym's mons share stat raises (TODO). Enemy-owned riders on the player (TODO, gym-roster branch).
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Gym AI Tier 2 (own branch). js/net/coop.js calls removed legacy hooks (co-op redesign, TODO). Three stale move-sim mutations (TODO).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
