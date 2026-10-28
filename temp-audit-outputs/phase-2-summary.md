# Phase 2 summary

Register: 25 findings from 12 investigated candidates. Source of truth: decision-conflicts.json. Baseline tree: chore/documentation-authority-audit at e2acd82 (open owner question Q-01 whether this is the right baseline).

## Findings by priority

| P0 | P1 | P2 | P3 |
|---|---|---|---|
| 0 | 2 | 11 | 12 |

No finding rose to P0: the code already matches the locked boss-rework design and no document conflict would by itself cause an incorrect architectural change.

## Findings by primary classification

| Classification | Count |
|---|---|
| MISSING_AUTHORITY | 7 |
| HISTORICAL_DIFFERENCE | 5 |
| STATUS_AMBIGUITY | 4 |
| POSSIBLE_SUPERSESSION | 3 |
| IMPLEMENTATION_DISCREPANCY | 2 |
| DIRECT_CONTRADICTION | 2 |
| DUPLICATED_REQUIREMENT | 1 |
| REFERENCE_DEFECT | 1 |

## Candidates

CONFIRMED 6, UNRESOLVED 5, DEFERRED 1, NOT_A_CONFLICT or SCOPE_DIFFERENCE as sub-results inside candidates (see phase-2-queue.json).

## Highest-impact findings

- F-001 (P1, POSSIBLE_SUPERSESSION): GDD.md claims to describe the current game and CLAUDE.md lists it as authoritative, but its rift, five-timed-boss and Arceus Judgment sections describe systems that BOSS-REWORK.md replaces and that the code has switched off (judgment.js ENABLED=false, rift.js RANDOM_RIFTS=false).
- F-007 (P1, MISSING_AUTHORITY): DECISIONS.md and move-consistency-review.md section 9 each claim to be the move-schema decision register; the 2026-10-27 slice 4c decisions are in DECISIONS.md and slice-4c.md but not in section 9, so the register the overview tells readers to use is already incomplete.

Confirmed text-level contradictions: F-012 (git execution rule: 'never runs git, ever' in DECISIONS.md vs read-only git allowed in CLAUDE.md and CONTEXT.md; supersession approval unrecorded) and F-018 (README suggests GitHub Pages, DECISIONS rejects it).

## Subsystems with unclear authority

- Boss, rift and gym design: GDD.md vs BOSS-REWORK.md vs GYM-ROSTERS.md vs FULL-GAME-STRUCT.md (F-001, F-002, F-003, F-004).
- Move-schema decisions: DECISIONS.md vs review section 9 vs slice files; status lines of the architecture chain (F-005 to F-007).
- Agent workflow rules: CLAUDE.md vs CONTEXT.md vs DECISIONS.md, and project commit rule vs session tooling (F-012 to F-014).
- Work status: GitHub board (outside the repo) vs TODO.md mirror vs gitignored snapshots (F-015).

## Significant implementation discrepancies

- F-009: DMG_SCALAR is 1.0 in code and BALANCE.md but 2.0 in DECISIONS.md (known, queued for slice 7).
- F-025: elite cadence is a TEMP placeholder although the design ties it to gym cycles and gyms now exist.
- F-001: BOSS_SLOTS and judgment.js still in the tree and loaded; disabled but not removed.
- Verified matches (not conflicts): GRACE, ESC_STEP, FIRST_AT, RANGE, INSTANCE_CAP, HP_SCALAR and the move grammar fields agree with their documents.

## Questions for the project owner

1. Is GDD.md a living fork document, a frozen upstream baseline, or superseded in the boss and rift sections? (F-001, Q-05)
2. Is BOSS-REWORK.md the approved canonical design and is its branch still active? Which tracker is the active one? (F-002, F-003)
3. Do difficulty multipliers rise per loop or on repeat clears, and what is FULL-GAME-STRUCT.md's status? (F-004)
4. Which register governs move-schema decisions before slice 7? (F-007)
5. Did you approve the 2026-10-25 relaxation allowing read-only git, and should DECISIONS.md be annotated? (F-012)
6. Does the project rule against commit trailers govern over session tooling defaults? (F-013)
7. Which tree is the documentation baseline: the move-schema branch or main (69 files differ)? (Q-01)
8. Is CREDITS.md exempt from the no-third-party-contacts policy? It contains 10 email-like strings in a public repo. (F-021)
9. Are README, ONBOARDING and other upstream-derived docs maintained, archival or deferred? (F-017)

## Evidence gaps

- Owner approvals appear only as in-document labels and AI-written prose; no independent approval record was found for BOSS-REWORK 'LOCKED' sections, slice sign-offs, or the Checkpoint 1 answers (F-006).
- GitHub board state is outside the repository (F-015).
- No tests or harnesses were executed; only their existence was recorded.
- Large documents (GDD, combat-architecture D-table, MOVE-AXIS-SCHEMA open items, TODO backlog) were searched, not read in full.

## Deferred

- PQ-12 deep review of orphaned and unclear-authority documents (ponytail skills, ASCII maps' remaining values, generated reports' hand-filled column): low value for Phase 3 and mostly third-party or inert.
- Full comparison of move-schema equations and cross-axis rules against code.
- Searching git history for the original Checkpoint 1 resolutions (F-006).

## Recommended Phase 3 focus

1. Settle authority for boss/gym design (F-001 to F-004) and for move-schema decisions (F-005 to F-007) with the owner before any canonical designation.
2. Treat all header status lines as unreliable; use code and git plus owner confirmation.
3. Handle the DECISIONS.md annotations together (F-009, F-012, F-019).
4. Leave reference and style cleanup (reference-integrity.md, F-020, F-022, F-023) for last.
5. Do not use git commit trailers if Phase 3 commits anything (F-013).