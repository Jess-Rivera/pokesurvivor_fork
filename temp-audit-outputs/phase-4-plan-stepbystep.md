# Phase 4: Step-by-step execution guide

Companion to `temp-audit-outputs/phase-4-plan-approved.md` (called "the approved plan" below). This file breaks section B of the approved plan into batch sections an agent can run one at a time. It adds no new decisions. When this file and the approved plan disagree, the approved plan wins, and the agent stops and asks.

Baseline: branch `chore/documentation-authority-audit`. The approved plan was committed at fc88980.

---

## How to use this file

**For Jess.** Each batch section opens with a plain summary of what the batch does and why. Hand the agent one batch at a time with a message like "Run B3 from phase-4-plan-stepbystep.md". The agent works until the batch's stop point, then hands you the commit commands. You run those, then say OK to continue. Checkpoints (CP1 to CP7) are moments where you read and approve something before the agent goes on.

**For the agent.** At the start of every batch:

1. Read this file's "Standing rules" section and the section for your batch only.
2. Read the matching item in section B of the approved plan, plus approved plan section C (guardrails). Read section A only for the answers your batch cites.
3. Open `temp-audit-outputs/phase-4-ledger.md` (from B1 onward).
4. Run the read-only checks in the appendix to confirm the previous batch was committed and the tree is clean. If the tree is not clean or the previous batch's commit is missing, stop and tell Jess.
5. Search source files for the sections you need; do not read large files whole (DECISIONS.md, DEVLOG.md, BALANCE.md, docs/DECISIONS-archive.md, combat-validation-and-handoff.md, move-consistency-review.md).

**Model choice.** Each batch (or each commit, where a batch has parts that differ in difficulty) names a recommended model. The rule of thumb: Opus 5.5 where meaning can drift or judgment is needed (merging rules, checking docs against code, startup-critical files); Sonnet 5.5 for careful but well-defined work (pointers, headers, verbatim copies after Jess has approved the content); Haiku 5.5 only for tiny, fully specified edits. Start a fresh session when the model changes; the start-of-batch steps above give the new session all the context it needs. If a Sonnet or Haiku session hits a "stop and ask" situation it cannot settle with Jess, rerun that step on Opus.

| Batch | Model |
| --- | --- |
| B0 | Haiku 5.5 |
| B1 | Sonnet 5.5 |
| B2 | Sonnet 5.5 |
| B3a / B3b | Opus 5.5 / Sonnet 5.5 |
| B4a / B4b | Opus 5.5 / Sonnet 5.5 |
| B5a1 (with CP4 draft) / B5a2 / B5b | Opus 5.5 / Sonnet 5.5 / Sonnet 5.5 |
| B6 read and B6a / B6b | Opus 5.5 / Sonnet 5.5 |
| B7 | Opus 5.5 |
| B8a / B8b | Sonnet 5.5 / Sonnet 5.5 |
| B9 | Opus 5.5 |

Source path shorthand used below:

| Shorthand | Path |
| --- | --- |
| BOSS-REWORK | BOSS-REWORK.md |
| GDD, GLOSSARY, ONBOARDING, BALANCE, DECISIONS | repo root |
| archive | docs/DECISIONS-archive.md |
| GYM-ROSTERS, BOSS-AUTHORING, MOVE-AXIS-SCHEMA, BUFF-TABLE, FULL-GAME-STRUCT, SIM-PRESENT-BOUNDARY | docs/ |
| stat-model notes | docs/stat-model-design-notes.md |
| combat-architecture | docs/current feature planning/combat-architecture.md |
| combat-validation | docs/current feature planning/combat-validation-and-handoff.md |
| review section 9 | docs/current feature planning/move-consistency-review.md, "## 9. Consolidated decisions and status" |
| slices, handoffs | docs/current feature planning/move-schema/ (stage-0, slice-1 to slice-7, slice-overview, *-codehandoff) |
| QA, R, D IDs | temp-audit-outputs/phase-3a-owner-questionnaire.md and its answers file |
| S, SG, NE, C, F, EC IDs | temp-audit-outputs/phase-3a-consolidation-map.md |
| Q1 to Q24 | temp-audit-outputs/phase-4-plan.md section A, summarized in approved plan A |

---

## Standing rules (apply to every batch)

These restate approved plan section C and the repo's CLAUDE.md. They are not optional, and each batch section adds its own on top.

**Git.** The agent never runs a git command that changes anything (add, commit, push, pull, merge, switch, restore, stash, reset and the rest) and never runs `gh` to change the tracker. Read-only git (status, diff, log, show, grep via `git grep`, fetch) is fine. At each stop point the agent prints the exact `git add` and `git commit` commands for Jess. Commit messages carry no Co-Authored-By line and no AI signature.

**Edit boundary.** Only Markdown docs are edited. Never touch js/, dev.html, tools/, css, assets, package files or build config. Never rename or move a file (Q1). Never create a file other than docs/COMBAT-RULES.md, docs/MOVE-INTENT.md and temp-audit-outputs/phase-4-ledger.md.

**Meaning.** Copy rules, do not rewrite them. Any wording change gets a ledger row with the old text, the new text and the wording-changed flag set; only Jess ticks those rows. Do not improve designs, retune numbers or rewrite handoff build steps. Where a number is needed, write "current value: see <file>".

**Questions.** Never resolve an unanswered question by choosing an option. Write `[Open]` with the question, and stop if it blocks the batch. Always stop and ask about: a contradiction the answers do not cover, a doc that disagrees with code, a self-buff that breaks the Q13 invariant, or two conflicting sources with the same date.

**Tags** (full definitions in approved plan section C, "Tags"):

- `[Approved]`: source items marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED, signed off or [Jess decided] and not superseded; every QA and Q answer; A.3 items 1 and 2; QA-13 as settled by Q18. Never DRAFT, PROPOSED, OPEN or TBD.
- `[Legacy behavior]`: what the live path does when it differs from the approved rule, always naming the slice that removes it.
- `[Proposed]`: DRAFT, PROPOSED, recommend, TBD; the mainline type chart; the Q11 FGS items; A.3-3; GDD rules from the bounded read that code does not confirm.
- `[Open]`: explicit OPEN items and new unanswered questions.
- Approved but not built: `[Approved]` plus a short "code differs, see TODO" note.
- Tie-break: a later dated owner decision wins. The 2026-10-28 answers beat everything earlier; A.3 beats the QA-11 text at answers:124 and :127.

**Checkpoint 1 rows (EC-01).** Rules from QA-07 group 2 (Checkpoint 1 Q1 to Q17) were AI-recorded and never committed in their original form. Tag them per QA-07 and set a "spot-check" flag on the ledger row for Jess.

**Trimming.** Never trim or replace a source with a pointer until its ledger row is ticked and the (a) commit that holds the destination text exists in git log.

**History text.** Only add headers to history or archive text. Do not edit it, and do not mass-fix em-dashes in archives (D-05).

**Fixed combat points** (easy to get wrong, so restated):

- The player trap rule is different from the enemy rule and stays unchanged. Never overwrite it with the enemy rule.
- Per-move maxStacks applies to self-buffs only. Default is 1. Foe debuffs have no per-move cap, only the +-6 ladder.

**Prose.** No em-dashes in any added text. Use ISO dates.

**Action List**: During each Batches **Stop and Hand Off** section, include a concrete action list for Jess to complete prior to the git commands. 

---

## B0. Baseline

**What is going on (for Jess).** This batch just sets the stage. STATE.md is updated to say the current work is the documentation consolidation and that coding is paused. The agent also creates an empty ledger: a table that will track every rule being moved, where it came from, where it went, and whether you have checked it. Nothing else changes. Low risk.

Approved plan reference: section B, B0. Checkpoint: none.

**Model: Haiku 5.5.** Two small, fully specified edits (one STATE.md line, an empty table). No judgment calls.

**Scope**

- Edit: STATE.md.
- Create: temp-audit-outputs/phase-4-ledger.md.
- Not in scope: any DECISIONS entry (those are written later, as each canonical section lands); any other doc.

**Steps**

1. In STATE.md, set the active work to "Documentation consolidation (Phase 4, branch chore/documentation-authority-audit)" and note that coding is paused per QA-00. Keep STATE.md under 3 KB. Change only the active-work part; leave other sections for B7 and B9.
2. Create the ledger with a short header (purpose, link to the approved plan, the tick rule from approved plan "Gates") and an empty table with these columns, in this order: ID, source path and section, verbatim source excerpt, destination, tag, QA/Q dependency, wording changed (Y/N), spot-check (Y/N), reviewer tick.
3. Do not seed rows yet; that happens in B2.

**Restrictions**

- Do not add a separate answers addendum; the answers already live in phase-4-plan.md section A and the approved plan.

**Validation**

- STATE.md size under 3 KB.
- No em-dashes in added lines (appendix check 4).

**Stop and hand off.** Give Jess:

```
git add -- STATE.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B0): baseline state and consolidation ledger"
```

Rollback: revert this commit.

---

## B1. Reference fixes

**What is going on (for Jess).** Phase 2 found broken or stale links in the docs: old folder names, files that moved, a deleted script still mentioned, a "Part 1" that does not exist. This batch fixes those links only. It also changes the `delete/` folder name to `_delete_/` in CLAUDE.md and CONTEXT.md, which is the only change those two files get until B7. No rule content moves. Low risk.

Approved plan reference: section B, B1. Checkpoint: none.

**Model: Sonnet 5.5.** Mostly mechanical, but each fix needs its target verified across several files, and the agent must recognize fixes with no clear target and leave them `[Open]` instead of guessing. Haiku is more likely to "fix" those by inventing a target.

**Scope**

- The fixes listed in temp-audit-outputs/reference-integrity.md, section "Confirmed defects worth fixing", and Phase 3 batch 1 in temp-audit-outputs/phase-3-migration-plan.md (search for the batch 1 heading; read only that batch).
- Citations of the boss docs (BOSS-REWORK, GYM-ROSTERS, BOSS-AUTHORING, FULL-GAME-STRUCT) where they are stale. Their paths are now stable because nothing is renamed in this branch.
- CLAUDE.md and CONTEXT.md: only `delete/` to `_delete_/`.

**Steps**

1. Read the two source sections above and build a list of each fix: file, line, old reference, new reference.
2. For each fix, confirm the new target exists (file and, for section citations, the heading) before editing.
3. Apply the fixes. Change only the reference text, not the surrounding sentences.
4. In CLAUDE.md and CONTEXT.md, change `delete/` to `_delete_/` and nothing else.
5. If a fix has no clear target (for example README.md:90 pointing to a missing docs/PUBLICAR.md, which also conflicts with DECISIONS per F-018), and neither source section says what to do, do not invent one. List it as `[Open]` in your hand-off message and leave the line unchanged.

**Restrictions**

- No edits to js/ comments, even where they cite docs (`js/systems/elites.js:6`, `js/systems/gym.js:7`, `js/data/gyms.js:19` stay as they are and must keep resolving).
- No renames, no rule text changes.

**Validation**

- Rerun the reference check using the method in reference-integrity.md, section "Method and results", over the files you touched. Every fixed reference resolves; no new broken references.
- Appendix checks 3 and 4 print nothing.

**Stop and hand off.** Give Jess the list of edited files and:

```
git add -- <each edited file>
git commit -m "docs(B1): fix stale paths and deleted-plan citations"
```

Rollback: revert this commit.

---

## B2. Destinations

**What is going on (for Jess).** Before any rule moves, every important spec gets a short header saying what it owns and what it does not, and two new empty specs are created: COMBAT-RULES.md (general combat rules) and MOVE-INTENT.md (rulings about specific moves). CLAUDE.md gets one new paragraph explaining the four tags. The agent also fills the ledger with one row per rule that will move. At the end you review the "owns" boundaries and the tag paragraph (CP1). Nothing is moved or deleted yet.

Approved plan reference: section B, B2. Checkpoint: CP1 after this batch.

**Model: Sonnet 5.5.** The ownership lines come straight from the approved precedence list and no rule text moves, so the risk is low and CP1 catches boundary mistakes. The ledger seeding is long but structured (one row per listed source). Use Opus only if the seeding turns up sources that do not fit the consolidation map.

**Scope**

- Add R-14 headers to: GDD.md, BOSS-REWORK.md, docs/GYM-ROSTERS.md, docs/BOSS-AUTHORING.md, docs/MOVE-AXIS-SCHEMA.md, combat-architecture, combat-validation, ONBOARDING.md, docs/SIM-PRESENT-BOUNDARY.md (R-12) and BALANCE.md.
- Create skeletons: docs/COMBAT-RULES.md and docs/MOVE-INTENT.md.
- CLAUDE.md: add one tag-vocabulary paragraph. Purely additive.
- Ledger: seed rows.

**Steps**

1. Read the header format in phase-3a-consolidation-map.md section 3.2 and the R-14 answer in the questionnaire answers file. Use that format exactly.
2. Add a header to each listed file: what it owns, what it does not own (with the owning doc named), precedence, and "Last reconciled: not yet". Use the ownership given by approved plan "Precedence changes" items 1 to 10. Insert the header at the top; do not change the body.
3. Create docs/COMBAT-RULES.md with the same header and empty section headings only, covering: stats and HP, damage, orthogonal dials, G.Stats, swap rule, status effects (including trap, with separate player and enemy subsections), DoT, stat stages and maxStacks. No rule text yet.
4. Create docs/MOVE-INTENT.md with the header, a precedence line (a ruling here beats COMBAT-RULES and grammar defaults for the named move, but cannot require what the grammar cannot express), a name-collision note that the planned move-intent-scenarios.json from combat-validation section 1.4 is a different file, and an empty per-move list. No rulings yet.
5. In CLAUDE.md, add one paragraph defining `[Approved]`, `[Legacy behavior]`, `[Proposed]` and `[Open]`, matching approved plan section C. No other CLAUDE.md change.
6. Seed the ledger: one row per source row in phase-3a-consolidation-map.md section 4 (subjects S-01 to S-19), one row per QA and Q answer, and one row each for A.3 items 1 to 3. Fill source, excerpt, planned destination, tag and dependency. Leave the tick column empty. Flag Checkpoint 1 Q1 to Q17 rows as spot-check.

**Restrictions**

- Headers only on existing docs; no body edits.
- Skeletons contain headings, not rules.
- CLAUDE.md: only the one paragraph.

**Validation**

- Every "owned by" target in every header is a file that exists (or one of the two new skeletons).
- Every ledger row has a source and a destination.
- Appendix checks 3 and 4 print nothing.

**Stop and hand off (CP1).** Show Jess a short list of each doc's "owns" line and the tag paragraph. Wait for approval or edits. After approval:

```
git add -- GDD.md BOSS-REWORK.md BALANCE.md ONBOARDING.md CLAUDE.md docs/GYM-ROSTERS.md docs/BOSS-AUTHORING.md docs/MOVE-AXIS-SCHEMA.md docs/SIM-PRESENT-BOUNDARY.md docs/COMBAT-RULES.md docs/MOVE-INTENT.md "docs/current feature planning/combat-architecture.md" "docs/current feature planning/combat-validation-and-handoff.md" temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B2): spec headers, COMBAT-RULES and MOVE-INTENT skeletons, tag vocabulary"
```

Rollback: revert this commit.

---

## B3. Combat rules

**What is going on (for Jess).** General combat rules (stats, damage, status, trap, stat stages) are spread over DECISIONS, the archive, BOSS-REWORK and other notes. This batch copies them into COMBAT-RULES.md as the single home, with your new answers on trap, Fire Spin and maxStacks applied. You check the trap, Fire Spin and stage wording (CP2). Only after that does a second commit turn the old copies into pointers. This is the first batch where meaning could drift, so it is medium-high risk.

Approved plan reference: section B, B3 (QA-03, QA-10, QA-11, QA-12, R-05, R-10, R-11), section A.2, section A.3. Checkpoint: CP2 between (a) and (b).

### B3 commit (a): fill COMBAT-RULES

**Model: Opus 5.5.** Merges dense rules from six sources, applies the new trap and maxStacks answers without blurring the player and enemy rules, and checks formulas against four code files. This is where meaning drift is most likely and most costly.

**Scope**

- Write into: docs/COMBAT-RULES.md, the ledger.
- Read from: DECISIONS 2026-10-17 entries (stats, damage, orthogonal dials, G.Stats) and the 2026-10-18 swap rule; archive Slices A to E2e and DoT; BOSS-REWORK section 3c; stat-model notes section 4; the shared parts of combat-architecture D6 to D11 and D30.
- Verify against (read the relevant functions only): js/systems/stats.js, types.js, status.js, stages.js.

**Steps**

1. For each source, search for the section and copy its rules into the matching COMBAT-RULES section, verbatim where possible. Add a ledger row (or update the seeded one) with the excerpt and wording flag.
2. Trap section:
   - Enemy rule from QA-10: 2 s root on wild enemies; on strong hosts (boss, elite, gym leader) 25% then a 10 s window. Tag `[Approved]`.
   - E1 and the Fire Spin strip and burnHalf (`js/data/moves.js:61`): tag `[Legacy behavior]`, removed by slice 7.
   - Player trap rule (status.js:10: no damage, no slow, swaps locked): copy unchanged in its own subsection.
3. Stages section (A.2):
   - The +-6 ladder (code already clamps, stages.js:33,45).
   - Per-move maxStacks applies to self-buffs only, default 1.
   - Upgrade formula: maxStacks = min(floor(duration / cooldown), 6), new path only.
   - Invariant: a self-buff's duration is never shorter than its cooldown.
   - Foe debuffs have no per-move cap; strong hosts keep their own rules.
   - A.3-3 authored-floor lever as `[Proposed]`, with the reading given in approved plan A.3 item 3.
   - Legacy rule "duration / cooldown is the cap" (stages.js:17) as `[Legacy behavior]` until slice 7.
   - Code-gap note: the code defaults maxStacks to 6 and caps foe debuffs per move.
4. Mainline type chart (QA-12): `[Proposed]`, on hold.
5. Where a doc and the code disagree beyond the gaps already listed above, stop and ask.

**Restrictions**

- Do not touch any source doc in this commit; sources stay intact until (b).
- Do not apply maxStacks to foe debuffs. Do not write any default other than 1.
- Do not merge the player and enemy trap rules.

**Validation**

- Every formula in COMBAT-RULES matches stats.js, types.js, status.js and stages.js, or carries a tag and gap note explaining the difference.
- Appendix checks 3 and 4 print nothing.

**Stop and hand off (CP2).** Show Jess: the trap section, the Fire Spin wording, the stages section, and every ledger row whose wording changed. Wait for approval and for Jess to tick the wording-changed rows. Then:

```
git add -- docs/COMBAT-RULES.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B3a): consolidate combat rules into COMBAT-RULES"
```

### B3 commit (b): old copies become pointers

**Model: Sonnet 5.5.** The content is already approved and committed; this commit swaps ticked text for pointers and keeps source-specific text. Careful but well defined.

**Precondition.** B3a is in git log and every row being trimmed is ticked.

**Scope**

- BOSS-REWORK section 3c becomes a pointer to COMBAT-RULES plus gym-only rules. Section numbers 2 and 3 stay (cited by elites.js and gym.js).
- docs/BUFF-TABLE.md: repoint to COMBAT-RULES.
- combat-architecture D6 to D11: keep only move-path specifics; general rules become pointers.
- stat-model notes: add a history header; do not edit the body.

**Steps**

1. For each source, replace only ticked rule text with a one-line pointer naming the COMBAT-RULES section heading.
2. Keep any text that is specific to the source (gym-only rules, move-path specifics).

**Validation**

- Search the repo docs for "2L/5": full rule text appears only in COMBAT-RULES; other hits are pointers or history.
- Every pointer names a heading that exists in COMBAT-RULES.

**Stop and hand off.**

```
git add -- BOSS-REWORK.md docs/BUFF-TABLE.md docs/stat-model-design-notes.md "docs/current feature planning/combat-architecture.md" temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B3b): replace old combat rule copies with pointers"
```

Rollback: revert (b), then (a).

---

## B4. Move schema

**What is going on (for Jess).** The move-system docs currently compete with each other (review section 9 calls itself the "single source"). This batch gives each doc one job: MOVE-AXIS-SCHEMA owns the data grammar, combat-architecture owns runtime rules, MOVE-INTENT owns rulings about specific moves (like Fire Spin). The agent also checks every self-buff move against the rule "duration is never shorter than cooldown" and stops if any break it. After you approve MOVE-INTENT and a list of slice conflicts (CP3), the second commit freezes old decision sections as history and points unbuilt slices at the new homes. High risk because many files are touched.

Approved plan reference: section B, B4 (QA-04, QA-05, QA-11 grammar default, R-02, R-03, R-04, R-06, R-16), section A.2. Checkpoint: CP3 between (a) and (b).

### B4 commit (a): grammar, runtime, per-move intent

**Model: Opus 5.5.** The highest-risk content batch: it splits review section 9 three ways, checks self-buff data against the Q13 invariant, spots grammar gaps, and builds a conflict list across eight unexecuted slices and handoffs. Accuracy matters more than cost here.

**Scope**

- Write into: docs/MOVE-AXIS-SCHEMA.md, combat-architecture, docs/MOVE-INTENT.md, the ledger.
- Read from: review section 9, slice-overview (file roles), combat-validation sections 1.4, 2.5 and 3.6, the slices and handoffs as needed.
- Verify against: js/data/move-attributes.js (maxStacks default) and the new-path move data for self-buffs.

**Steps**

1. MOVE-AXIS-SCHEMA: add the grammar and file roles from review section 9 and slice-overview. Add the maxStacks field rule: default 1, meaningful only on self-target stage riders. Add a code-gap note: move-attributes.js defaults to 6; Metal Claw and Meteor Mash are authored at 2. This overrides the old default 6 at MOVE-AXIS-SCHEMA.md:108.
2. combat-architecture: add the runtime rules from review section 9.
3. MOVE-INTENT: add the per-move rulings. Fire Spin (Q17): full-length burn (no half-burn), trap, no strip, persistent orbit damage as authored. New-path data already matches (slice-4c-1-codehandoff.md:10, :46); the legacy path is `[Legacy behavior]` until slice 7.
4. combat-validation section 2.5: keep its scenarios as validation material. Move each ruling sentence to MOVE-INTENT and link each scenario to its MOVE-INTENT entry. This edit is part of commit (a) because it is a move, not a trim; the ruling text is removed from 2.5 only after its ledger row is ticked (do that in (b) if not yet ticked).
5. If a ruling needs something the grammar cannot express, record it in MOVE-INTENT as an `[Open]` grammar gap; do not invent grammar.
6. Self-buff check: list every new-path self-buff with its duration and cooldown. Any self-buff with duration shorter than cooldown, or with no cooldown (persistent), breaks the Q13 invariant. Do not fix it; list it for CP3.
7. Build the handoff conflict list: for each unexecuted slice and handoff (4c, 4c-1, 4c-2, 4c-3, 4d, 5, 6, 7), list every decision that conflicts with the new homes. Any slice or handoff setting Metal Claw or Meteor Mash maxStacks to 2 goes on the list. (4c-1 already matches Q17 and Leaf Storm maxStacks 1.)

**Restrictions**

- Do not rewrite handoff build steps (Q23).
- Do not change move data or numbers.

**Validation**

- Every MOVE-INTENT entry names a move and links back to its source in the ledger.
- Appendix checks 3 and 4 print nothing.

**Stop and hand off (CP3).** Show Jess: MOVE-INTENT content, the handoff conflict list, and any self-buff that breaks the Q13 invariant. Wait for approval and ticks. Then:

```
git add -- docs/MOVE-AXIS-SCHEMA.md docs/MOVE-INTENT.md "docs/current feature planning/combat-architecture.md" "docs/current feature planning/combat-validation-and-handoff.md" temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B4a): consolidate move-schema rules and per-move intent"
```

### B4 commit (b): freeze history, repoint slices

**Model: Sonnet 5.5.** Many files, but each edit is a header, a pointer or the CP3-approved conflict list pasted in. The one rewrite (slice-7.md:6) is short and goes through a wording-changed ledger row.

**Precondition.** B4a is in git log; rows being trimmed are ticked.

**Scope and steps**

1. Review section 9: add a history header with "absorbed into" pointers to MOVE-AXIS-SCHEMA, combat-architecture and MOVE-INTENT. Body unchanged.
2. slice-overview: repoint the "single source" line to the three owners.
3. Executed slices (stage-0, slice-1 to slice-4b, and handoffs 2, 3d, 4a, 4b): add a history header. Body unchanged.
4. Unexecuted slices (4c, 4c-1, 4c-2, 4c-3, 4d, 5, 6, 7): replace each decision section with pointers to the owning docs plus that slice's conflict list from CP3. Leave build steps untouched (Q23).
5. slice-7.md:6: rewrite so it no longer says to move Checkpoint 1 to 3 decisions into DECISIONS.md (contradicts QA-01 and QA-05); point to the owning docs instead. Add a wording-changed ledger row.
6. slice-7.md: record QA-13 as decided: after slice 7 the gym is Brock only (once or every time, whichever is simpler to build); option (a) and the other gyms get their own branch. Note that this "option (a)" is unrelated to the gym cadence "Option A".

**Validation**

- No doc other than history still claims to be the "single source" for move rules.
- Appendix checks 3 and 4 print nothing.

**Stop and hand off.**

```
git add -- "docs/current feature planning/move-consistency-review.md" "docs/current feature planning/move-schema" temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B4b): freeze review section 9 and slice decision sections as history"
```

Rollback: revert (b), then (a).

---

## B5. Progression

**What is going on (for Jess).** BOSS-REWORK becomes the one spec for run progression (gyms, elites, escalation, Elite Four, badges), instead of a mix of tracker and rules. The batch has three commits. The first gathers the existing LOCKED rules into it. Then you review the new end-of-region and loop design record (CP4) before the second commit adds it, dated 2026-10-28 and marked "approved, not built" so nobody mistakes it for working code. The third commit moves old tracker history to the archive and points GYM-ROSTERS and FULL-GAME-STRUCT at BOSS-REWORK.

Approved plan reference: section B, B5 (QA-06, QA-08, R-07, R-08, R-09), section A.1, A.3 item 1. Checkpoint: CP4 between (a1) and (a2).

### B5 commit (a1): consolidate existing rules

**Model: Opus 5.5.** Resolves duplicates by date across DECISIONS, the archive and the rosters, and must keep the code-cited section numbers stable. The same session also drafts the QA-08 record and superseded list for CP4, which needs the full A.1 picture.

**Scope.** BOSS-REWORK.md, the ledger. Read from DECISIONS (escalation entries, DECISIONS:17-23), the archive boss entries, GYM-ROSTERS rules, badge rules.

**Steps**

1. Move escalation into BOSS-REWORK section 3. Add badge rules and the archive boss entries. Resolve duplicates by keeping the later dated owner decision; same-date conflicts become `[Open]` and you stop.
2. Tag the kept LOCKED rules from A.1 `[Approved]`: gym cadence Option A, elite cadence, escalation (37 s grace, +1 every 10 s, uncapped), L50 clamp until all 8 gyms are beaten, all-at-once Elite Four, gym level (wild + 4 plus the escalation bump at entry).
3. Keep section numbers 2 and 3 unchanged (cited by elites.js:6 and gym.js:7).

**Restrictions.** Do not add any QA-08 loop content yet. Do not trim sources.

**Hand off.**

```
git add -- BOSS-REWORK.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B5a1): consolidate progression rules into BOSS-REWORK"
```

**Stop (CP4).** Before writing (a2), draft the QA-08 record and the list of superseded items (the 60 and 90 minute time bonus, the DDA Unlock Safeties at DECISIONS:226-248, the FGS inheritor graft, the FGS Arceus gate). Show both to Jess. Wait for approval.

### B5 commit (a2): QA-08 design record

**Model: Sonnet 5.5.** Writes the record Jess already approved at CP4 into BOSS-REWORK, adds "approved, not built" markers and one pointer. No new judgment.

**Scope.** BOSS-REWORK sections 1 and 4, the ledger.

**Steps**

1. Add the approved record, dated 2026-10-28: the end-of-region choice (Return Home, Next Region, Unlock Safeties meaning "continue to Loop N+1"), loops and Keep Going, the uncapped level clock across loops and Next Region, and the completion bonus (escalating per loop) replacing the 60 and 90 minute time bonus.
2. Mark every new loop rule "approved, not built".
3. Change BOSS-REWORK:16 ("Keep Going DEFERRED") to point to the new design; the build stays deferred.
4. Superseded items (time bonus text, the DDA Unlock Safeties) are marked for history; their actual move to the archive happens with DECISIONS in B8 (Q20, verbatim).

**Hand off.**

```
git add -- BOSS-REWORK.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B5a2): record 2026-10-28 end-of-region and loop design (QA-08)"
```

### B5 commit (b): history and pointers

**Model: Sonnet 5.5.** Verbatim moves to the archive, headers and pointers. Sonnet rather than Haiku because verbatim copying of long sections into a large archive file must be exact.

**Precondition.** a1 and a2 are in git log; rows being trimmed are ticked.

**Steps**

1. Move the BOSS-REWORK change log and touch points to docs/DECISIONS-archive.md, verbatim.
2. GYM-ROSTERS: rules become a pointer to BOSS-REWORK; rosters stay.
3. BOSS-AUTHORING: header notes "implemented for Brock".
4. FULL-GAME-STRUCT: add a history header; do not move it (gyms.js:19 cites it).
5. DECISIONS Phase 2 text: move to the archive, verbatim.
6. BOSS-REWORK section 3a: record QA-13 as decided (Brock-only fallback after slice 7; option (a) and other gyms in their own branch).

**Hand off.**

```
git add -- BOSS-REWORK.md DECISIONS.md docs/DECISIONS-archive.md docs/GYM-ROSTERS.md docs/BOSS-AUTHORING.md docs/FULL-GAME-STRUCT.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B5b): move boss tracker history to archive, repoint rosters and FULL-GAME-STRUCT"
```

Rollback: revert (b), then (a2), then (a1).

---

## B6. GDD umbrella

**What is going on (for Jess).** GDD.md stops claiming to be the final word and becomes an umbrella that summarizes the game and points to the subsystem specs, which win on details. It also gains a meta and endgame section from your QA-08 answers (Legendary Boss, The Climb, Arceus, Descendant Mutation). Before writing, the agent does a limited read of the archive to find older GDD rules, and brings any that disagree with the code to you (CP5). This is the biggest writing job, so it is time-boxed.

Approved plan reference: section B, B6 (QA-02, QA-14, D-07, QA-08 meta), section A.1 Q9 to Q11. Checkpoint: CP5 after the bounded read.

**Model: Opus 5.5 for the bounded read and commit (a); Sonnet 5.5 for commit (b).** The read has to judge which old GDD rules the code confirms, and (a) rewrites the whole GDD as an umbrella with accurate pointers, the largest writing job in the plan. Commit (b) is a verbatim move and glossary marks.

**Time-box.** Agree a time limit with Jess at the start. If it runs out, stop and report what is left.

### Bounded archive read

1. Agree the read scope with Jess before starting (which archive sections, by heading). Search, do not read whole files.
2. For each GDD-relevant rule found, add a ledger row. Rules that code does not confirm are `[Proposed]`.

**Stop (CP5).** Present every conflict between the archive and code. Wait for Jess's rulings.

### B6 commit (a): new GDD

**Steps**

1. Rewrite GDD.md as an umbrella: short summaries and pointers to COMBAT-RULES, MOVE-AXIS-SCHEMA, MOVE-INTENT, BOSS-REWORK and other owners. It states that subsystem specs win.
2. Add the meta and endgame section: Legendary Boss, The Climb, Arceus gated on The Climb's 9th completion point, Descendant Mutation (your mon's moves and typing go to another mon). Mark these "approved, not built".
3. Q11 FGS items (shiny tiers, gold-toll re-challenge, Uber modifiers, per-region legendary counts, one-sitting achievement): `[Proposed]`.

**Hand off.**

```
git add -- GDD.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B6a): rewrite GDD as living umbrella"
```

### B6 commit (b): history and glossary

**Precondition.** B6a in git log; rows ticked.

**Steps**

1. Move the old GDD decision log to history (the archive, verbatim, under a header).
2. GLOSSARY.md: mark removed systems as removed. Do not delete entries.

**Hand off.**

```
git add -- GDD.md GLOSSARY.md docs/DECISIONS-archive.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B6b): GDD decision log to history, glossary marks"
```

Rollback: revert (b), then (a).

---

## B7. Agent rules

**What is going on (for Jess).** Right now rules for AI assistants are repeated in CLAUDE.md, CONTEXT.md, STATE.md and slice-overview.md. This batch makes CLAUDE.md the only home and turns the others into pointers. Because both your tools (Claude at home, the Quick agent at work) read these files at startup, a mistake here could confuse a fresh session. So it is one commit that a single revert undoes, and you test a fresh session in both tools afterward (CP6). You update the Quick agent's instructions the same day.

Approved plan reference: section B, B7 (QA-15), Gates, CP6. Checkpoint: CP6 before and after.

**Model: Opus 5.5.** Small in size but the largest blast radius: these files steer every future session in both tools. Gathering rules from four files into CLAUDE.md without changing any meaning (the git prohibition especially) is worth the extra cost.

**Stop (CP6, before).** Confirm with Jess:

- Every target in the planned "where current rules live" list exists (COMBAT-RULES, MOVE-AXIS-SCHEMA, MOVE-INTENT, combat-architecture, BOSS-REWORK, GDD, DECISIONS, STATE and others named).
- The Quick agent update is scheduled for the same day.
- A fresh-session test is ready in both tools.

Do not edit until Jess confirms.

**Scope.** CLAUDE.md, CONTEXT.md, STATE.md, slice-overview.md.

**Steps**

1. CLAUDE.md: add the coding conventions (gathered from CONTEXT, STATE and slice-overview), the precedence paragraph (approved plan "Precedence changes"), the skills line, and the "where current rules live" list. Change the reference line so GDD is described as an umbrella (precedence item 5). Session rituals becomes a pointer.
2. CONTEXT.md: remove the rule reminders, keeping the session ritual and pointers.
3. STATE.md: remove "Standing rules". Keep it under 3 KB.
4. slice-overview.md: rules 2 and 5 become pointers to CLAUDE.md.
5. Ledger rows for every moved rule; wording changes flagged for Jess.

**Restrictions.** One commit only. Do not change the meaning of any agent rule, including the git prohibition.

**Hand off.**

```
git add -- CLAUDE.md CONTEXT.md STATE.md "docs/current feature planning/move-schema/slice-overview.md" temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B7): agent rules live only in CLAUDE.md"
```

**Stop (CP6, after).** Jess opens a fresh session in both tools and asks "catch me up" and "where is the trap rule". Both must answer correctly (the trap rule answer is docs/COMBAT-RULES.md). If either fails, Jess reverts this commit.

Rollback: revert this commit.

---

## B8. DECISIONS log

**What is going on (for Jess).** DECISIONS.md changes from a register of settled rules into a dated log. Each entry says what was decided and names the spec section that now holds the rule ("Canonical:"). The full old texts are first copied word-for-word into the archive, so nothing is lost. This comes last among content batches because every "Canonical:" line must point at a section that already exists.

Approved plan reference: section B, B8 (QA-01, R-15, R-11, R-10), A.4 Q19 and Q20. Checkpoint: none (CP7 covers it).

### B8 commit (a): archive copies and new entries

**Model: Sonnet 5.5.** High volume but well defined: verbatim copies, and new entries whose content is the already-recorded QA and Q answers. Every `Canonical:` target exists by now, so it is lookup, not judgment.

**Steps**

1. For each existing DECISIONS entry, copy it verbatim to docs/DECISIONS-archive.md under a "current rule in <spec section>" header (Q20). Include the superseded items flagged in B5 (time bonus, DDA Unlock Safeties at DECISIONS:226-248).
2. Add a new-format entry for every QA and Q answer: ISO date, one-line summary, and a `Canonical:` line naming the section heading only, no line numbers (Q19).

**Hand off.**

```
git add -- DECISIONS.md docs/DECISIONS-archive.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B8a): archive full decision texts with current-rule headers"
```

### B8 commit (b): convert to log

**Model: Sonnet 5.5.** Shortens entries to log form and runs the superseded-value searches. If a search finds a superseded value somewhere other than history, stop and ask.

**Precondition.** B8a in git log; rows ticked.

**Steps**

1. Reduce each existing DECISIONS entry to log form: date, summary, `Canonical:` line.
2. Add history banners and the archive header (the archive moves from "cited as live" to history, R-10).

**Validation**

- Every `Canonical:` names a heading that exists.
- Search DECISIONS.md and the live specs for superseded values; none may remain outside history: "never runs git", "30-min", "bridge", "2.0" near DMG_SCALAR, maxStacks default 6, the DDA Unlock Safeties.

**Hand off.**

```
git add -- DECISIONS.md docs/DECISIONS-archive.md temp-audit-outputs/phase-4-ledger.md
git commit -m "docs(B8b): convert DECISIONS.md to decision log"
```

Rollback: revert (b), then (a).

---

## B9. Close-out

**What is going on (for Jess).** The final check. All automated checks run, each subject gets one review pass, and the ledger must have zero unticked rows. STATE.md is rewritten with the list of places where docs and code still differ (the follow-up work in approved plan section E). Then you delete the temp-audit-outputs folder in its own commit and merge into feature-test/new-move-schema (CP7).

Approved plan reference: section B, B9, sections D and E. Checkpoint: CP7 before merge.

**Model: Opus 5.5.** The final review across all 19 subjects is the last chance to catch duplicate rules, broken pointers or meaning drift before the merge, and the STATE.md code-gap list must be exact. A weaker reviewer here undermines the whole branch.

**Steps**

1. Run every check in the appendix over the whole branch.
2. One reviewer pass per subject (S-01 to S-19): pointers resolve, tags are present, no duplicate full rule text outside history.
3. Ledger: report every unticked row to Jess. Do not continue until zero remain.
4. Grep for references to temp-audit-outputs outside that folder. Any hit must be fixed before deletion.
5. Rewrite STATE.md (under 3 KB), including the code-gap list from approved plan section E (maxStacks default 6 in code, foe debuffs capped per move in stages.js, Metal Claw and Meteor Mash at 2, legacy Fire Spin strip and burnHalf, E1 still unverified, QA-08 features not built).
6. Append a DEVLOG.md entry (about 6 lines) naming the commit hash that last contains the ledger.

**Plan gap to confirm with Jess.** The approved plan lists one B9 commit message, but STATE and DEVLOG edits must be committed too, and the DEVLOG must name the last commit holding the ledger. Recommended: commit the final ledger ticks first (in B8b or a ledger-only commit), then put STATE.md, DEVLOG.md and the folder deletion in the single B9 commit, so the DEVLOG names the B9 commit's parent. Ask Jess before proceeding.

**Hand off (CP7).** Present: ledger closed, checks clean, STATE and DEVLOG ready. After Jess approves, Jess deletes the folder and commits (path example for the recommended option):

```
git rm -r -- temp-audit-outputs
git add -- STATE.md DEVLOG.md
git commit -m "docs(B9): remove audit working files"
```

Then the merge, run by Jess:

```
git push
git switch feature-test/new-move-schema
git pull --ff-only
git merge --no-ff chore/documentation-authority-audit -m "Merge documentation consolidation"
git push
```

Note: this file is itself deleted with the folder in B9.

---

## Appendix: read-only checks between batches (Git Bash)

From the approved plan. The agent may run these; they change nothing.

```
git status --short
git diff --stat HEAD~1
git diff --name-only feature-test/new-move-schema...HEAD -- js dev.html tools css assets package.json
git diff HEAD~1 -U0 | grep '^+' | LC_ALL=C.UTF-8 grep -n $'\xe2\x80\x94'
git log --oneline feature-test/new-move-schema..HEAD
git fetch && git status -sb
node tools/check.js
```

- Check 3 must print nothing for the whole branch. This is the real proof that no code was touched.
- Check 4 must print nothing (no em-dashes in added lines).
- `node tools/check.js` is a sanity check only, not proof.
- Before a commit exists, use `git diff -U0` (working tree) in place of `git diff HEAD~1 -U0` for check 4.

## Appendix: checkpoint summary

| CP | Where | Jess approves |
| --- | --- | --- |
| CP1 | End of B2 | "Owns" boundaries in headers, the tag paragraph |
| CP2 | B3, between (a) and (b) | Trap, Fire Spin, stage and maxStacks wording, wording-changed rows |
| CP3 | B4, between (a) and (b) | MOVE-INTENT content, handoff conflict list, Q13 invariant breaks |
| CP4 | B5, between (a1) and (a2) | QA-08 record, superseded items list |
| CP5 | B6, after the bounded read | Archive versus code conflicts |
| CP6 | Before and after B7 | Before: Quick update scheduled. After: fresh-session test passes in both tools |
| CP7 | End of B9 | Ledger closed, checks clean |
