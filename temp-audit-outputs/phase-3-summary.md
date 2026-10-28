# Phase 3 summary

Baseline: chore/documentation-authority-audit at e2acd82. Proposal only; nothing approved or changed.

## Proposed structure
Six authority levels, no new documents:
- A1 agent rules: CLAUDE.md wins; CONTEXT.md is the startup pointer; docs/PM-WORKFLOW.md is tracker detail.
- A2 decision register: DECISIONS.md, with explicit supersession markers.
- A3 one spec per subsystem: BOSS-REWORK.md (boss/gym, candidate), docs/MOVE-AXIS-SCHEMA.md (grammar), combat-architecture.md (move-combat contracts).
- A4 plans and status: one status home per effort (slice-overview.md for the move schema), STATE.md for handoff, the board for work queue (TODO.md mirrors), BALANCE.md for tuned-value history.
- A5 reference: GDD.md, ONBOARDING.md, GLOSSARY.md, README.md, design reference, maps, generated reports.
- A6 historical: archives, DEVLOG, applied proposals. A0: legal, tooling, temp files.

## Major recommendations
1. Adopt nine prospective rules (R1 to R9): approval is a dated owner-tagged DECISIONS entry committed by the owner; supersession is recorded on both entries; status lives only in the status home; code vs spec goes to the owner; rule changes reach CLAUDE.md, DECISIONS.md and the Quick agent together.
2. Treat GDD.md's boss, rift and Judgment sections as superseded and stop calling GDD "authoritative" in CLAUDE.md (pending OD-02).
3. DECISIONS.md becomes the single register for new move-schema decisions; review section 9 is frozen through slice 4b until the planned slice-7 merge (pending OD-06, time-sensitive before 4c-1 coding).
4. Replace header status lines with a role line plus pointer (fixes F-002, F-005, F-010, F-011 at the root).
5. Annotate four superseded DECISIONS.md entries (git, DMG_SCALAR, SEO, two-phase difficulty).

## Evidence corrections (Phase 3)
- EC-01: the Checkpoint 1 answers (Q1 to Q17) were never committed; combat-architecture.md cited a section 9 that did not exist in the same commit (a68a366). Only AI-written restatements exist, so the owner needs to ratify them.
- NEW-01 (proposed P2): DECISIONS.md 2026-10-17 two-phase difficulty still depends on the 30-minute boss that BOSS-REWORK.md removed; code follows BOSS-REWORK (stats.js:52).
- EC-03 to EC-05: "ISSUES" probably means TODO.md; the "PROPOSAL" citation is a stale preamble within section 9; the register split is by slice, not by date.

## Unresolved (owner decisions)
Blocking: OD-01 baseline tree, OD-02 GDD role, OD-03 boss/gym spec and the 30-minute boss successor, OD-05 agent rules, OD-06 move-schema register. Material: OD-04 loops, OD-07 approval rule and bulk ratification, OD-08 upstream docs. Low: OD-09 status snapshots, OD-10 CREDITS contacts, OD-11 parked docs.

## Weak or missing evidence
No harness executed in any phase; board state outside the repo; approvals exist only as in-document AI-written labels; G14, G31, G34, G35 documents never read beyond headers; F-004 depends on undefined terms; NEW-01 not cross-checked against GDD and BALANCE.md difficulty text.

## Validation
- JSON valid; phase-3-document-map.json maps 103 of 103 inventory paths once, 40 groups; OD numbering matches phase-3-owner-decisions.md.
- All F-IDs cited exist in decision-conflicts.json; Phase 3 additions are labelled NEW-01, EC-01 to EC-05.
- Repository check: HEAD still e2acd82; `git status` shows only temp-audit-outputs/ untracked; no tracked file changed; inventory hash unchanged.

## Readiness
Ready for owner review. Answering OD-01, OD-05 and OD-06 lets batches 1, 3, 4 (partly) and 6 start; the design batches wait on OD-02 to OD-04.
