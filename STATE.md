# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-28 (Claude Code, home; post-consolidation audit and new slice plan, no game code changed).

## Where we are
- Branch feature-test/new-move-schema, consolidation merged (04ecc29). Coding has not resumed yet.
- Move schema: slices 1 to 3d, 4a, 4b DONE (21 of 63 moves routed behind ?dev&newcombat).
- NEW live slice plan: docs/current feature planning/move-schema-post-auth/slice-overview.md. The old move-schema/ folder is history except the three 4c codehandoffs (still the build steps, Q23, read with the corrections in the new 4c-n files). Slice 0 pass 1 (items 1 to 4) done 2026-10-29; passes 2 to 4 open.
- Audit of planning docs vs sources of truth: docs/current feature planning/AUDIT-vs-sources-of-truth.md (3 HIGH, 20 MEDIUM, 11 LOW).
- Branch end (Jess, 2026-10-28): merge into main after slice 7b with all moves on the new path; then a new branch imports the gym-roster moves. A code gap is built here only if tied to the move work (table in the new overview).

## Open owner decisions (block the slice named)
- D-LEAF (4c-1) Leaf Storm self-drop lifetime. D-PSY (4c-3) Psychic re-pick. D-FOECAP (4c-0) authored vs default foe cap.
- D-GUST, D-LOC (4d). D-MC5 (5) QA-11 formula vs Metal Claw/Meteor Mash at 1. D-ENEMY, D-COOP (7a). D-HAIL (7b).

## Docs and code still differ (approved, not built)
- In this branch: maxStacks default 6 vs 1, Metal Claw/Meteor Mash at 2, foe debuff per-move cap (all 4c-0); QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess reviews and approves the item list in move-schema-post-auth/slice-0-doc-fixes.md; apply it.
2. Answer D-FOECAP and D-LEAF, then plan 4c-0 and build 4c-1.

## Board note (snapshot 2026-10-27)
- 14 items. Shipped #7, #4. In Progress #2. Blocked #3, #8, #11. Accepted #1, #5, #6, #9, #10, #12, #13, #14. Label vs board drift still to fix.

Rules: CLAUDE.md.
