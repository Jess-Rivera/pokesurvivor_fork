# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-29 (Quick, work; slice 0, Stage 0, 4c-0 and 4c-1 built, no commit yet).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md (old move-schema/ is history except the three 4c codehandoffs, DECISIONS:Q23).
- Move schema: slices 1 to 3d, 4a, 4b, 4c-0, 4c-1 built; 24 of 63 moves routed behind ?dev&newcombat.
- 2026-10-29: slice 0 doc fixes done (except F-REP-1/2, folded into Stage 0); Stage 0 built (tools/move_report.js, move-intent scenarios and harness), batch 1 (12 moves) reviewed, cd rulings in MOVE-INTENT, String Shot cd back to 1.1; D-FOECAP, D-LEAF, D-PSY answered; 4c-0 (maxStacks default 1, self-side only) and 4c-1 (persistence, orbits, deep-freeze, validator rules) built.
- New rules: cross-document IDs as `file:ID` (CLAUDE.md); persistent owns a move's slot life, endOn is instance-only (combat-architecture:H25).
- Every harness passed in a sandbox copy; Jess still runs check.js on the real tree.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b; then a new branch imports the gym-roster moves.

## Open owner decisions (block the slice named)
- D-GUST, D-LOC (4d). D-MC5 (5) QA-11 formula vs Metal Claw/Meteor Mash at 1. D-ENEMY, D-COOP (7a). D-HAIL (7b).

## Docs and code still differ (approved, not built)
- In this branch: QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess: node tools/check.js; then feel-tests G.Debug.newcombat('riders') (4c-0), G.Debug.newcombat('persist') (4c-1, cycle slots and swap Pokemon), String Shot; G.Debug.skipTo(20) with the persist set for the framerate.
2. Commit and push (several commits, see the session commands).
3. Plan 4c-2 (returns and repositions; handoff written, prose plan first).

## Board note (synced 2026-10-29)
- 15 issues, 13 open. Drift to fix on the board: #4 closed but still a blocker, #3 likely closable, #5/#9/#10 `blocked` with no link, four `needs-triage` (TODO.md Board mirror).

Rules: CLAUDE.md.
