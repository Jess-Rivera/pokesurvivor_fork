# Phase 3A summary

Baseline: chore/documentation-authority-audit at e2acd82. Proposal only; nothing approved, executed or changed outside temp-audit-outputs/.

Deliverables: phase-3a-consolidation-map.md (subjects S-01 to S-19, contracts C-01 to C-06, gaps SG-01 to SG-26, new evidence NE-01 to NE-17), phase-3a-owner-questionnaire.md (QA-00 to QA-15, routine list R-01 to R-16, deferred list D-01 to D-07), phase-3a-migration-plan.md (batches B0 to B9, completion criteria, automated checks).

## How this differs from Phase 3
- **Phase 3 reorganized; Phase 3A consolidates.** Phase 3 mapped roles and planned annotations with no content moved. Its register model (DECISIONS.md holding full rulings, supersession markers left in place, two move-schema registers until slice 7, CLAUDE.md and DECISIONS.md kept in sync, CONTEXT.md rule reminders) would keep two to six live statements of many rules.
- **DECISIONS.md becomes a log** (QA-01): date, owner tag, one to three lines, `Canonical:` pointer. Rule text lives in specs. Superseded entries go to the archive with a "current rule in" header, so no chains.
- **GDD.md becomes the fork's living umbrella** (QA-02), reversing Phase 3's banner recommendation, because GDD is stale far beyond the boss sections and is the natural home for enemies, items and economy, whose fork rules currently exist only in the archive.
- **One new document, docs/COMBAT-RULES.md** (QA-03), for stats, damage, type chart, crit, status and stat stages. Phase 3 said no new documents; this subject has no home and is shared by the legacy and new combat paths.
- **Move-schema decisions absorbed into the specs** (QA-05) instead of freezing two registers; per-move rulings get one table (QA-04).
- **The archive is not purely historical** (NE-01). Active rules are extracted from it before it is treated as history.
- **SIM-PRESENT-BOUNDARY.md stays active** (NE-15), correcting Phase 3's proposal to make it historical.

## Biggest opportunities to eliminate competing sources
1. DECISIONS.md as a second spec (escalation, damage model, HP model, move grammar, workflow rules).
2. Move-schema decisions in review section 9, DECISIONS.md, slice-4b/4c.md, STATE.md and handoffs; section 9 still lists as open items later decided (NE-06).
3. Status and stat stages across the archive (C, D1, E1, E2a), BOSS-REWORK 3c, BUFF-TABLE, BALANCE and the move schema (SG-01, SG-03).
4. Agent rules in CLAUDE.md, CONTEXT.md, STATE.md, DECISIONS.md (six entries), slice-overview.md and ORIGINAL-OWNER-RULES.md.
5. GDD.md as a stale parallel description of the whole game.

## Older documents with potentially unique requirements
- docs/DECISIONS-archive.md: status engine and stage rules, crit rules, item three-tier model and holder rulings, boss-rework design, XP curve, enemy taxonomy and behavior, upgrade rework (cited as live by BUFF-TABLE.md and BOSS-REWORK.md).
- DECISIONS.md: gym escalation (absent from BOSS-REWORK), badge rules, G.UI.ask rule, G.Stats centralization, naked-layer and orthogonal-dials principles, swap rule.
- docs/FULL-GAME-STRUCT.md: loops, checkpoints, legendary unlocks, shiny tiers, Arceus inheritor (no other source).
- review section 9.2: slice 3b and 3c sim rulings absent from combat-architecture.md.
- TODO.md long-form notes: region-select design and other proposals (proposals, not rules).
- docs/BULLET-TIME-DESIGN.md and docs/PERF-HOTPATH-NOTES.md: owner rulings inside parked designs.
- docs/GYM-ROSTERS.md: stage-threshold convention.

## Decisions that genuinely need the owner
- QA-00 baseline tree (carried over).
- QA-02 role of GDD.md.
- QA-07 bulk ratification of historical approval labels (the Checkpoint 1 answers were never committed, EC-01).
- QA-08 late-run and repeat-play difficulty (two-phase choice, slow ramp, Keep Going, six loops, gym level across loops).
- QA-10 Fire Spin's legacy strip and half burn.
- QA-13 how gyms and enemies use moves after slice 7 (may be deferred to slice 7 planning, but recorded now).
Confirmations with a recommendation: QA-01, QA-03, QA-04, QA-05 (time-sensitive), QA-06, QA-10 (trap), QA-11, QA-12, QA-15. Sixteen routine items need one blanket approval (section E).

## Migration batches
B0 owner answers and an interim 4c pointer fix; B1 reference fixes; B2 spec headers, tags, COMBAT-RULES skeleton and the consolidation ledger; B3 move-schema consolidation (between 4c sub-slices); B4 combat rules; B5 progression and encounters; B6 GDD umbrella rewrite; B7 agent context and instructions (late, so pointers resolve); B8 DECISIONS.md to log plus history markers; B9 validation. Each content batch is copy-verify-then-trim in two commits, so rollback never loses content.

## Validation criteria (summary)
One home per subject; zero unticked ledger rows; no full rule text in two live docs; history headers everywhere; no supersession chains; status only as tags or in status homes; CLAUDE.md lists where rules live and CONTEXT.md holds no rule text; no undocumented behavior change; gaps explicit as `[Open]`; links resolve. Scripts (links, authority phrases, metadata, tags, duplicate text, pointers) find candidates only; semantic equivalence needs the ledger review.

## Limitations and evidence gaps
- No harness was run in any phase; "verified" is never asserted.
- Archive entries for enemies, upgrades and items, and the applied proposals, were read by heading or in part (S-13 to S-15 are low confidence; QA-14).
- Field-by-field parity between move-attributes.js and MOVE-AXIS-SCHEMA.md was spot-checked, not complete.
- ONBOARDING.md was read by headings only; the board and the Amazon Quick agent instructions are outside the repo.
- Approval evidence is only AI-written in-document labels plus the owner's commits.
- x10 ticket sources after boss removal are not documented in any reviewed document (D-07).

## Repository check
See the final response; HEAD and the working tree were re-checked after writing these files.
