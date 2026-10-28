# Phase 3A: Revised migration plan (content consolidation)

A plan only; nothing has been executed. It replaces phase-3-migration-plan.md, reusing its batch 1 and its ground rules. IDs refer to phase-3a-consolidation-map.md (S, C, SG, NE) and phase-3a-owner-questionnaire.md (QA, R, D).

## Ground rules

- **Docs only.** Every batch edits Markdown documentation. No game code, js/data/*.js, dev.html, build config or assets. Code cleanups the specs imply (judgment.js, BOSS_SLOTS, elite cadence hook) stay normal game work under CLAUDE.md's prose-plan workflow.
- **Git stays with the owner.** The owner creates the docs branch (QA-00) and runs every commit; the assistant gives the exact commands and commit messages, with no Co-Authored-By or AI trailer.
- **Copy, verify, then trim.** Each content batch is two commits: (a) add the consolidated text to the canonical spec, (b) replace the old copies with pointers or move them to the archive. Reverting (b) restores the duplicates without losing anything; reverting (a) is safe because nothing was removed yet. Unique information is never deleted before a reviewer has ticked its destination in the ledger.
- **The consolidation ledger.** One working table, kept under temp-audit-outputs/ during the migration (not an authoritative document): one row per requirement or rule group, with columns source path and section, destination path and section, tag ([Approved], [Approved, flag only], [Legacy behavior], [Proposed], [Open]), QA answer it depends on, and reviewer tick. A row with no destination is either moved to the archive with a reason or listed as a known gap. This is the main protection against losing requirements and the evidence for completion criterion 2.
- **No renames or moves of files.** Many documents cite paths; consolidation changes content, not locations. The one new file is docs/COMBAT-RULES.md (QA-03).
- **Agent-facing changes are high risk.** Any batch that changes CLAUDE.md, CONTEXT.md, STATE.md, slice-overview.md or the move-schema specs is applied only with the owner's explicit OK for that batch, and only between coding sessions. After CLAUDE.md or CONTEXT.md changes, the owner mirrors them into the Amazon Quick agent instructions.
- **Common checks after every batch:** `git diff --stat` shows only intended .md files; no em-dashes in added lines; STATE.md under 3 KB if touched; the link check (section "Automated checks") shows no new broken references; `node tools/check.js` still passes (proves no code was touched; it is not evidence about documentation).

## Dependency overview

| Batch | Content | Needs | Risk |
|---|---|---|---|
| B0 | Owner answers; interim pointer fix | QA-00 | low |
| B1 | Reference and path fixes | QA-00, section E | low |
| B2 | Spec headers, tags, COMBAT-RULES skeleton, ledger | QA-01, QA-03, QA-07 | low |
| B3 | Move-schema consolidation | QA-04, QA-05, QA-07, B2 | high, time-sensitive |
| B4 | Combat rules consolidation | QA-03, QA-10, QA-11, QA-12, B2 | medium-high |
| B5 | Progression and encounters | QA-06, QA-08, B2 (B4 for C-01/C-02 pointers) | medium-high |
| B6 | GDD rewrite as umbrella | QA-02, QA-14, B4, B5 | high |
| B7 | Agent context and instructions | QA-15, B3 to B6 (pointers must exist) | high |
| B8 | DECISIONS.md to log; history banners; archive header | QA-01, B3 to B7 | medium |
| B9 | Validation and final competing-source review | all | low |

Recommended order: B0, B1, B2, then B3 at the next 4c sub-slice boundary, then B4 and B5 (independent, either order), B6, B7, B8, B9. B7 comes late on purpose: agent instructions should point at canonical homes that already exist.

---

## B0. Decisions and interim fix
- **Scope:** owner answers QA-00, QA-01, QA-02, QA-07 (gating), QA-05 (time-sensitive). Interim fix: one line in docs/current feature planning/move-schema/slice-overview.md "Decisions that span slices" saying 4c decisions are in DECISIONS.md and slice-4c.md until the consolidation lands (S-08).
- **Prerequisites:** none.
- **Expected result:** answers recorded as dated DECISIONS.md entries the owner commits; coding chats for 4c-1 read the right decisions.
- **Risks:** the interim line becomes a fourth pointer if B3 is delayed. Mitigation: it names B3 and is removed by it.
- **Validation:** the line names both locations; nothing else changed.
- **Rollback:** revert the commit.

## B1. Reference and path fixes
- **Scope:** Phase 3 batch 1 (planning/ prefix, moved paths, `delete/` to `_delete_/` in CLAUDE.md and CONTEXT.md, DEVLOG-archive header, "Part 1" in ORIGINAL-OWNER-RULES, BOSS-REWORK's archive citation) plus R-01 (citations of deleted MOVES-IMPORT-PLAN.md and MOVES-REFACTOR-PLAN.md).
- **Paths:** reference-integrity.md list; CLAUDE.md, CONTEXT.md (skip lists only); docs/DEVLOG-archive.md; docs/ORIGINAL-OWNER-RULES.md; BOSS-REWORK.md section 1 heading; TODO.md; docs/MOVE-AXIS-SCHEMA.md:5.
- **Prerequisites:** QA-00; blanket approval of section E.
- **Expected result:** no broken or stale path references.
- **Risks:** low; CLAUDE.md and CONTEXT.md edits are limited to the folder name.
- **Validation:** rerun the reference check; zero confirmed defects from Phase 2 remain.
- **Rollback:** revert.

## B2. Establish destinations and boundaries
- **Scope:** add the spec header (Role, Owns, Does not own, Status home, Last reconciled) to CLAUDE.md, GDD.md, BOSS-REWORK.md, docs/GYM-ROSTERS.md, docs/BOSS-AUTHORING.md, docs/MOVE-AXIS-SCHEMA.md, combat-architecture.md, combat-validation-and-handoff.md, ONBOARDING.md, docs/SIM-PRESENT-BOUNDARY.md, BALANCE.md. Create docs/COMBAT-RULES.md with header and empty section headings (stats, HP, damage, type chart, crit, cooldowns and swap, status engine, stat stages). Replace header status lines with role lines (Phase 3 batch 2, R4). Define the tag vocabulary once (in CLAUDE.md or CONTEXT.md, one short paragraph). Start the ledger with every source section listed in map section 4.
- **Prerequisites:** QA-01, QA-03; QA-07 for the "Approved" wording.
- **Expected result:** every subject has a declared home and declared boundaries before any content moves; the ledger lists every row to move.
- **Risks:** headers that claim ownership before the content arrives. Mitigation: "Last reconciled: not yet" until the content batch lands.
- **Validation:** the metadata check (section "Automated checks") passes; "Owns" lists across all headers have no subject claimed twice; every "Does not own" pointer names an existing file.
- **Rollback:** revert; COMBAT-RULES.md is empty, so removing it loses nothing.

## B3. Move-schema consolidation (time-sensitive)
- **Scope:** S-05, S-06, S-07, S-08. Into MOVE-AXIS-SCHEMA.md: grammar rows of review 9.1 and 9.2, 9.3 F1 and F3, 9.6, DECISIONS 2026-10-24 and 2026-10-25 grammar content, file roles and data source (R-16), with R-02. Into combat-architecture.md: runtime rows (9.1 Q2, Q3, Q5, Q8, Q10, Q14; 9.2 3b and 3c rulings; 9.3 F2, F5, F6; 9.8 root rules; 9.9 S1 to S15), DECISIONS 2026-10-26 normalization (R-04) and 2026-10-27 rules, accuracy (R-03); D6 to D11 get a "canonical in COMBAT-RULES" note (filled by B4). Into the per-move table (QA-04): per-move rulings from 9.5, slice-4b, slice-4c, DECISIONS 2026-10-27 (R-06). Commit (b): review section 9 gets a history header with "absorbed into" pointers per subsection; slice-4b.md and slice-4c.md decision sections become pointers; DECISIONS move entries reduced to log lines (or deferred to B8 if QA-01 is not yet answered); slice-overview.md:24 and the B0 interim line replaced by spec pointers; combat-validation table 3.6 repointed; each 4c handoff gets one pointer line, nothing else.
- **Prerequisites:** QA-04, QA-05, QA-07 (tags); B2. Timing: between 4c sub-slices, no coding chat running.
- **Expected result:** a coding chat finds every current move rule in two specs plus one table; section 9 no longer governs.
- **Risks:** high. (1) A rule copied with a meaning change; mitigation: ledger tick by a second reader (owner or a separate review pass) comparing old and new wording. (2) A handoff contradicts the new spec text; mitigation: handoffs are not rewritten, and any wording difference found is raised to the owner before commit (b). (3) Losing the DECIDED/PROPOSED/DEFAULT ACCEPTED provenance; mitigation: section 9 kept verbatim as history.
- **Validation:** every ledger row for S-05 to S-08 ticked; a search for "section 9" in live docs returns only history pointers; a field list from js/data/move-attributes.js compared against MOVE-AXIS-SCHEMA headings (scripted list, human review of meaning); the I1 guard and harnesses still pass (sanity only).
- **Rollback:** revert commit (b) first, then (a) if needed.

## B4. Combat rules consolidation
- **Scope:** S-09, S-10, C-01, C-02, C-05. Fill docs/COMBAT-RULES.md from DECISIONS 2026-10-17 stat and damage entries (R-05), 2026-10-18 swap rule, the archive status and stage rulings (Slice A, B, C, D1, D2, D3, D closed, E1, E2a, E2b/d/e, DoT on base HP) (R-10), BOSS-REWORK 3c, stat-model section 4 (R-11), combat-architecture D6 to D11 (shared parts), and the QA-10, QA-11, QA-12 answers. Tag each rule; mark `[Legacy behavior]` where the live path and the flagged path differ. Commit (b): BOSS-REWORK 3c becomes a pointer plus gym-specific rules; BUFF-TABLE.md cites COMBAT-RULES instead of the archive; combat-architecture D6 to D11 keep only move-path specifics plus a citation; stat-model notes get a history header; DECISIONS entries become log lines (or wait for B8).
- **Prerequisites:** QA-03, QA-07, QA-10, QA-11, QA-12; B2.
- **Expected result:** one statement of the damage formula, HP model, type chart, crit, status engine and stage rules.
- **Risks:** medium-high: archive entries are dense and partly read in this audit; numbers may have been retuned since (BALANCE.md). Mitigation: numbers in COMBAT-RULES are either "current value: see <file>" or checked against code by a reviewer; numeric history stays in BALANCE.md.
- **Validation:** ledger rows for S-09 and S-10 ticked; reviewer compares formulas with js/core/stats.js, js/data/types.js, js/systems/status.js and stages.js; a search for the damage formula's distinctive term ("2*L/5" or "2L/5") finds full text only in COMBAT-RULES (and verbatim history).
- **Rollback:** revert (b), then (a).

## B5. Progression and encounters
- **Scope:** S-11, S-12, C-03, C-04. BOSS-REWORK.md becomes spec only (QA-06): absorb DECISIONS 2026-10-22 escalation (R-07), 2026-10-19 badge rules, the archive boss-rework and run-flow entries, the QA-08 answer (and FULL-GAME-STRUCT content if folded), resolve internal duplicates (R-08), record SG-15 as `[Open]` in 3a (QA-13). Commit (b): change log and code touch points to the archive with a "current spec: BOSS-REWORK.md" header; GYM-ROSTERS rules section to a pointer (R-09); BOSS-AUTHORING header per QA-06; FULL-GAME-STRUCT.md gets a history or `[Proposed]` header per QA-08; DECISIONS 2026-10-17 two-phase Phase 2 text moved to the archive or kept per QA-08; CONTEXT.md tracker line is handled in B7.
- **Prerequisites:** QA-06, QA-08 (QA-13 optional); B2; B4 for the status and stage pointers.
- **Expected result:** one progression and encounter spec, no 30-minute boss in any live text, loop rules stated once.
- **Risks:** medium-high: BOSS-REWORK.md is cited by GYM-ROSTERS, BOSS-AUTHORING, CONTEXT and slice docs. Mitigation: path unchanged, section numbers kept where cited.
- **Validation:** ledger ticked; searches for "30-minute boss", "30-min boss", "Judgment", "BOSS_SLOTS", "minute 15" in live docs return only history or `[Legacy behavior]` notes about code still present; ALL AT ONCE text exists once.
- **Rollback:** revert (b), then (a).

## B6. GDD rewrite as umbrella
- **Scope:** S-13, S-14, S-15 and GDD-wide. Per QA-02 (a): each GDD section becomes a short current summary plus a pointer (combat to COMBAT-RULES and the move docs; world rifts and bosses to BOSS-REWORK; enemies, items, economy, upgrades written from the archive rulings and code after the bounded read in QA-14). Ticket sources (D-07) documented from code. GDD decision log to history. GLOSSARY entries for removed systems marked (BOSS-REWORK section 5 item).
- **Prerequisites:** QA-02, QA-14; B4 and B5 (pointers must exist).
- **Expected result:** GDD describes the current fork game; nothing in it competes with a subsystem spec.
- **Risks:** high: largest rewrite; enemy and upgrade rules were not audited. Mitigation: the bounded read produces ledger rows first; any rule not confirmed in code is tagged `[Proposed]` or `[Open]`, never `[Approved]` by assumption; upstream text that still holds is kept.
- **Validation:** reviewer checks every number in sections 5 and 7 against code (spawner.js CAP, enemies.js, items.js); GDD contains no rule text that also appears in full in a subsystem spec (overlap check, then human review).
- **Rollback:** revert; the old GDD text survives in git history and, if the owner wants, as a verbatim copy in the archive.

## B7. Agent context and instructions
- **Scope:** S-01, S-02, SG-21, SG-26. Per QA-15: CLAUDE.md gains the coding-conventions lines, the precedence paragraph (Phase 3 R9 short form, rewritten for the new model: "the spec named for a subject wins; DECISIONS.md explains why; history never governs; code shows current behavior and discrepancies go to the owner"), the third-party skill line, the tag vocabulary pointer, and a "Where current rules live" list (one line per subject); CLAUDE.md "Session rituals" becomes a pointer to CONTEXT.md; CLAUDE.md "Reference material" line for GDD per QA-02. CONTEXT.md: rule reminders removed or reduced per QA-15 item 3; "Active branch tracker" becomes "the tracker named in STATE.md"; "Where things live" points to the CLAUDE.md list. STATE.md template drops "Standing rules". slice-overview.md coding rules 2 and 5 point to CLAUDE.md for workflow and git. docs/PM-WORKFLOW.md unchanged except pointers.
- **Prerequisites:** QA-15; B3 to B6 done so every pointer resolves.
- **Expected result:** agents find any rule in one place and any subject's spec from one list.
- **Risks:** high: changes what both tools do at startup; the Amazon Quick agent's instructions are outside the repo. Mitigation: owner mirrors the change the same day; the startup test below.
- **Validation:** read CLAUDE.md and CONTEXT.md end to end: no rule changed except the intended lines; the duplication check finds each rule's full text once; a fresh session asked "catch me up" names the right tracker and states the git rule; a fresh session asked "where is the rule for trap on enemies" answers COMBAT-RULES.md in one step; owner confirms the Quick agent mirror.
- **Rollback:** revert the commit and the Quick agent change together.

## B8. Decision log conversion and history markers
- **Scope:** per QA-01: every DECISIONS.md entry reduced to the log format with `Canonical:`; entries whose content was superseded moved verbatim to docs/DECISIONS-archive.md under a "current rule in" header; project-wide principles keep full text. Archive header rewritten (S-18). History banners on applied proposals (R-15), review sections 1 to 9, stat-model notes, the BOSS-REWORK change log (now in the archive), GDD's old decision log, redirect stubs.
- **Prerequisites:** QA-01; B3 to B7 (every `Canonical:` target must exist).
- **Expected result:** DECISIONS.md is a short chronological index of why; it competes with no spec.
- **Risks:** medium: DECISIONS.md:3 says entries are settled. Mitigation: no entry's meaning is changed; text is moved verbatim, not rewritten; the log line quotes the decision in one sentence.
- **Validation:** every DECISIONS.md entry has a `Canonical:` line whose target exists, or is marked "principle, canonical here"; no entry contains a superseded value (search for "2.0" near DMG_SCALAR, "never runs git", "30-min", "bridge"); the archive has no entry without a current-rule header when its subject has a spec.
- **Rollback:** revert.

## B9. Validation and final review for competing sources
- **Scope:** run every check in "Automated checks"; walk the completion criteria; one reviewer pass per subject asking "if I read only the canonical spec, do I get the current rule, and does any other live document state it differently?"; record remaining gaps in the owning spec as `[Open]` and in STATE.md.
- **Prerequisites:** B1 to B8.
- **Expected result:** the completion criteria below are met or each exception is written down.
- **Risks:** treating script output as proof of semantic equivalence. It is not; the reviewer pass is the proof.
- **Validation:** the criteria themselves.
- **Rollback:** not applicable (no edits beyond recording gaps).

---

## Completion criteria

Consolidation is complete when all of these hold (each has a check):

1. **One home per subject.** Every subject S-01 to S-19 has exactly one canonical document named in CLAUDE.md's "Where current rules live" list, or an explicit `[Open]` authority note there. Check: the list against the spec headers' "Owns" fields; no subject in two "Owns" fields.
2. **No requirement lost.** Every ledger row has a ticked destination, or is archived with a stated reason, or is listed as a known gap. Check: ledger count of unticked rows is zero.
3. **No silent duplicates.** Full rule text for each consolidated rule appears in one live document; other live documents hold at most a one-line summary with a pointer. Check: the overlap script flags candidates; a reviewer clears each flag.
4. **History is distinguishable.** Every historical document or section has a history header naming where current rules live. Check: header grep over the history list in map S-18.
5. **No supersession chains.** No live document says "superseded by" or "supersedes" without the current rule being in a canonical spec; no reader needs more than spec plus one pointer. Check: grep for "supersede" in live docs; each hit is a log line with `Canonical:`.
6. **States not conflated.** Specs use only the tag vocabulary for status; build and verification state appears only in status homes. Check: grep canonical specs for "not yet implemented", "Nothing here is built", "waiting for", "BUILT", "signed off" outside tags and history.
7. **Agent context points to the canon.** CLAUDE.md lists where each subject's rules live; CONTEXT.md contains no rule text; STATE.md names the active tracker. Check: B7 validation and the startup test.
8. **No undocumented behavior change.** Every changed rule wording traces to a ledger row whose old and new text a reviewer judged equivalent, or to a dated owner decision (QA answers). Check: ledger review column; `git diff --stat` across the migration shows only .md files.
9. **Gaps are explicit.** Every open question and documentation gap (SG items not resolved, D-items, the evidence gaps in the summary) appears once as `[Open]` in its owning spec or in the deferred list. Check: compare the SG table against the specs.
10. **Links resolve.** No broken path references. Check: link script.

## Automated checks (lightweight, recommended)

These can be small Node scripts under tools/ (a code change the owner approves separately) or one-off runs; they find candidates, not answers.

- **Link and path check:** every Markdown link and every backticked or plain path that looks like a repo path resolves at HEAD (the Phase 2 reference-integrity approach).
- **Authority declaration check:** the phrases "single source", "source of truth", "authoritative", "canonical", "wins", "settled" appear only in spec headers, CLAUDE.md's list, and history quotes. Any other hit is a competing claim to review.
- **Metadata check:** every file in the canonical list starts with the five header fields; "Last reconciled" is a date and commit.
- **Tag check:** in canonical specs, status words appear only as the defined tags.
- **Duplicate-text check:** sentence or 12-word shingle overlap between canonical specs and other live docs above a threshold is flagged for a human; history files are excluded.
- **Supersession check:** every "Canonical:" target and every "current rule in" pointer resolves to an existing heading.

Limits: none of these can confirm that a consolidated rule means the same thing as its sources, that a number is current, or that intent was approved. The ledger review and owner answers cover that.

## Out of scope
- Game code and data changes the specs imply (BOSS-REWORK section 5 cleanup, elite cadence hook, any tools/ script) need the normal prose-plan workflow.
- Moving or renaming files, including the move database out of docs/move_rework_holding/.
- Cloud and multiplayer documents beyond one-line deferred hooks.
- Running harnesses as proof of "verified" status.
