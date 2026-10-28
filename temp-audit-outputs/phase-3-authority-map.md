# Phase 3: Documentation authority map (proposal for owner review)

Baseline: branch chore/documentation-authority-audit at e2acd82 (whether this is the right baseline is owner decision OD-01). Inputs: the Phase 2 register (decision-conflicts.json, 25 findings), phase-2-summary.md, implementation-evidence.md, reference-integrity.md, the Phase 1 inventory (103 documents), and targeted read-only checks made in this phase (listed in section 2.4).

Everything here is a recommendation. Nothing is approved, and no project file was changed. "Canonical candidate" means "proposed for the owner to confirm". Labels used: **[Evidence]** traces to a cited source, **[New proposal]** is a structural suggestion made in this phase with no prior project record.

Companion files: phase-3-document-map.json (every inventoried path mapped to a role), phase-3-owner-decisions.md, phase-3-migration-plan.md, phase-3-summary.md.

---

## 1. The short version

The project does not need more documents. It needs **one precedence rule per question type** and **status recorded in one place per effort** instead of in every file header. Most Phase 2 findings come from two habits: status lines in headers that were never refreshed, and supersessions that changed one document without annotating the older ruling.

Proposed authority chain, from strongest to weakest:

| Level | Category | Governing document(s) | Decides |
|---|---|---|---|
| A1 | Agent and workflow rules | CLAUDE.md (wins), CONTEXT.md (pointer), docs/PM-WORKFLOW.md (tracker detail) | How assistants work |
| A2 | Decision register | DECISIONS.md | Which rulings are in force, and what superseded what |
| A3 | Canonical subsystem specs | One per subsystem: BOSS-REWORK.md (boss/gym, candidate), docs/MOVE-AXIS-SCHEMA.md (move grammar), combat-architecture.md (move-combat contracts) | The detailed design of a system |
| A4 | Active plans and status | slice-overview.md + slice files + handoffs; STATE.md; GitHub board (TODO.md mirrors it); BALANCE.md for tuned-value history | What is being built, what is done, what is next |
| A5 | Reference | GDD.md (baseline), ONBOARDING.md, GLOSSARY.md, README.md, survivor reference, ASCII maps, generated reports | Background; never overrides A1 to A4 |
| A6 | Historical | Archives, DEVLOG.md, applied proposals, redirect stubs | Nothing; rationale only |
| A0 | Outside the model | Legal files, tooling configs, third-party skills, temp-audit-outputs/ | Nothing |

New documents needed: **none**. Every proposed change is an annotation, a header rewrite, or a pointer fix in an existing file (see phase-3-migration-plan.md).

---

## 2. Evidence base

### 2.1 What the inventory covers

103 documents (96 tracked). Subsystems by count: move-schema rewrite 35, 2026-10-17/18 proposals 18, agent instructions and workflow 17, upstream design baseline 10, project memory and logs 8, stats/items/balance designs 6, boss/gym/encounters 5, deferred cloud/MP 3, input port 1. Phase 3 confirmed that every tracked .md and .txt file outside pokeapi-master/ is in the inventory, and that all 103 inventory paths exist. Excluded by Phase 1 (scope question Q-15, accepted here): docs/move_rework_holding/ datasets, pokeapi-master/, _delete_/, harness and diff files.

### 2.2 Highest-priority findings

- **F-001 (P1)**: GDD.md claims to be current and CLAUDE.md calls it authoritative, but its boss, rift and Judgment sections describe systems that BOSS-REWORK.md removes and the code disables.
- **F-007 (P1)**: two declared move-schema decision registers (DECISIONS.md and review section 9); slice 4c decisions are only in DECISIONS.md and slice-4c.md.
- **NEW-01 (proposed P2, found in this phase; see 2.4)**: an active, unannotated DECISIONS.md entry depends on the 30-minute boss that BOSS-REWORK.md removed.
- P2 group: F-002, F-003, F-004 (boss/gym status and loops), F-005, F-006, F-010 (move-schema approval and sign-off provenance), F-009 (DMG_SCALAR), F-012, F-013 (agent git and commit rules), F-017 (run instructions), F-021 (CREDITS contact data).

### 2.3 Classification check (Phase 2 findings re-examined)

| Type | Findings | Phase 3 view |
|---|---|---|
| Confirmed text contradiction | F-012 (git rule), F-018 (GitHub Pages) | Agreed. Both are supersessions that were not annotated, not live disputes. |
| Supersession, not annotated | F-001, F-009, F-019, NEW-01 | Agreed for F-009 and F-019 (code and git show the later state). F-001 and NEW-01 need owner confirmation because approval is only in-document. |
| Scope difference | F-004 (probably), F-014, F-020 | F-004 stays unresolved until the owner defines "loop" (OD-04). |
| Implementation discrepancy | F-009, F-025, F-001 (cleanup) | F-009 is a doc defect (code is the tuned state per BALANCE.md). F-025 is a deliberate placeholder. |
| Stale status labels | F-002, F-005, F-010, F-011, F-016 | Agreed. These are a single systemic problem, addressed by rule R4 (section 5). |
| Ambiguous authority | F-003, F-007, F-013, F-015, F-021, F-024 | Need owner decisions; see phase-3-owner-decisions.md. |
| Reference defects | F-022, F-023, reference-integrity.md | Agreed; safe cleanup. |

**Evidence too weak to support a recommendation:** F-004 (meaning of "loop" in BOSS-REWORK section 4), F-021 (consent of the CREDITS contacts), G14 BOSS-AUTHORING.md status, G31 SIM-PRESENT-BOUNDARY.md, G34 and G35 stats/items design notes (never investigated beyond inventory headers), and anything about board state (outside the repo).

**Register and reports are consistent:** 25 findings in both JSON and Markdown; priority counts (P1 2, P2 11, P3 12) and classification counts match phase-2-summary.md; candidate counts (6 confirmed, 5 unresolved, 1 deferred) match phase-2-progress.md.

### 2.4 Corrections and additions to Phase 2 evidence (re-investigation needed)

These were found with read-only checks in this phase. Phase 2's register is not rewritten; these notes say what should be updated.

- **EC-01 (changes F-006's interpretation, strengthens its concern).** Phase 2 suggested the Checkpoint 1 resolutions were lost when the review moved folders. Git says otherwise: the review was first committed in a68a366 (2026-10-26) with sections 0 to 8 only (Q1 to Q17 posed as open questions in section 4, no section 9; `grep -c "^## 9"` on that version returns 0). combat-architecture.md, added **in the same commit**, already says the resolutions are "in its section 9". So the original answers never existed in the repository. The only in-repo record of the owner's Q1 to Q17 answers is the AI-written DECIDED column in combat-architecture.md and its later copy in review section 9.1. Recommendation: owner ratification (OD-07), not a further git search.
- **EC-02 (new finding NEW-01, proposed P2, POSSIBLE_SUPERSESSION).** DECISIONS.md:226-248 (2026-10-17, "Enemy HP model ... two-phase difficulty") is active and unannotated, and states that difficulty is "gated by the planned 30-minute boss" with a Phase 2 choice (Standard Run vs Unlock Safeties) after beating it. BOSS-REWORK.md:15 (section 1, LOCKED) removes Arceus's Judgment at 30:00, and BOSS-REWORK.md:18 (LOCKED 2026-10-19) defines the post-30:00 curve as an L50 clamp until all gyms are beaten, then a slow ramp. Code: js/core/stats.js:52 `levelForTime(t, gymsDone)` clamps at L50 and does not use `gymsDone` yet. Phase 1 to 2 compared GDD with BOSS-REWORK but not this DECISIONS entry. The Phase 1 linear L1 to L50 curve agrees across all three; only the post-30:00 part conflicts. Whether the Standard Run / Unlock Safeties choice survives in some other form (for example after Gym 8) is not stated anywhere: owner decision OD-03.
- **EC-03 (refines F-014).** DECISIONS.md:138 lists "ISSUES" among free-edit docs. TODO.md's title is "TODO / ISSUES", so the reference most likely means TODO.md. Downgrade from "dangling reference" to "ambiguous name".
- **EC-04 (refines F-005).** The "PROPOSAL, awaiting Jess's approval" text Phase 2 cited is the section 9 preamble (move-consistency-review.md:641). The same section records "Architecture approval: DONE (Jess, 2026-10-26)" at about line 677 (section 9.2). This is an internal stale preamble, which supports Phase 2's "stale headers" interpretation.
- **EC-05 (scopes F-007).** Section 9 is complete through slice 4b (9.8 slice 4a decisions, 9.9 slice 4b decisions). DECISIONS.md holds move-schema entries for slice 1 and 2 (2026-10-25/26, lines 280-306) and for 4c planning (2026-10-27, lines 307-320). So the split is not clean by date either: slices 1 and 2 and 4c are in DECISIONS.md, Checkpoints 1 to 3 and slices 3a to 4b are in section 9. A full per-decision matrix was not built; this bounded check is enough for the owner to choose a register (OD-06).

---

## 3. Proposed authority model

Kept to six levels because each one answers a different question. No new files.

### A1. Agent and workflow rules
- **Purpose:** how any assistant behaves in this repo.
- **Belongs:** edit boundary, git rules, i18n rules, startup ritual, tracker workflow, prose style, scope boundary (local-first).
- **Does not belong:** design rules, status, numbers.
- **Governs on conflict:** CLAUDE.md. CONTEXT.md is the startup pointer and one-line reminders; it should say "if this file and CLAUDE.md differ, CLAUDE.md wins". docs/PM-WORKFLOW.md is delegated detail for the tracker. docs/ORIGINAL-OWNER-RULES.md is dormant reference (A5) until the publish or cloud phase. **[New proposal]** for the explicit precedence line; the division of labour itself is already declared (CLAUDE.md:3-4, CONTEXT.md core rules).
- **Relation to A2:** workflow rulings in DECISIONS.md record when and why a rule was adopted; the current wording lives in CLAUDE.md. When a rule changes, both must change in the same commit (rule R6). F-012 is the example where this failed.
- **Change type:** revise existing (CLAUDE.md, CONTEXT.md).
- **Caveat:** the Amazon Quick agent's own instructions sit outside the repo. Any A1 change must be mirrored there by the owner.

### A2. Decision register
- **Purpose:** the one list of rulings in force and of what superseded what.
- **Belongs:** short dated rulings (rule plus why), supersession notes, owner tag.
- **Does not belong:** long specs, status, session narrative.
- **Governs on conflict:** DECISIONS.md over its archive (already stated), over specs **only where the ruling is newer and not itself superseded**; a spec section that is newer than a DECISIONS entry wins only if the supersession is recorded (rule R3). Until then the conflict is flagged, not silently resolved.
- **Change type:** revise existing (annotate superseded entries; move-schema scope per OD-06).

### A3. Canonical subsystem specs
- **Purpose:** the detailed design of one system.
- **Proposed homes:**
  - Bosses, gyms, elites, run length and level curve: **BOSS-REWORK.md** (candidate, OD-03), with docs/GYM-ROSTERS.md as its data and docs/BOSS-AUTHORING.md as its authoring schema.
  - Move grammar: **docs/MOVE-AXIS-SCHEMA.md**.
  - Move-combat architecture and cross-system contracts (invariants I1 to I10, equations, R-rules): **docs/current feature planning/combat-architecture.md**.
  - Everything else (core loop, items, stats, enemies): no fork spec exists. GDD.md stays the baseline reference (A5) for areas no fork spec covers, with a banner, unless the owner chooses to keep GDD living (OD-02).
- **Does not belong:** status lines ("approved", "built", "waiting for playtest"). A spec states its role and points to where status lives.
- **Cross-system requirements:** stated once in the spec that owns them, cited by path and ID (for example "combat-architecture I8") elsewhere, never restated (rule R7). F-008 shows four copies of the reposition grammar; they agree today, but only one should be normative.

### A4. Active plans and status
- **Purpose:** what is being built now, what is done, what is next.
- **Homes:** per effort, one status home. Move schema: slice-overview.md (slice files and handoffs are subordinate plans). Boss/gym: the change log section of BOSS-REWORK.md or the board (owner choice in OD-03). Cross-cutting handoff: STATE.md. Work queue: GitHub board, mirrored by TODO.md (board wins, already stated in PM-WORKFLOW.md and TODO.md). Tuned values: BALANCE.md records history and rationale; the code holds the current value.
- **STATE.md** should name the active tracker, so CONTEXT.md does not hard-code it (fixes F-003 permanently).

### A5. Reference
Non-binding background. GDD.md, ONBOARDING.md (architecture map; code wins for structure), GLOSSARY.md, README.md, docs/survivor-like-design-reference.md, pokeapi-master/ (mainline data, already declared source of truth for mainline mechanics, which is a data source, not a design authority), ASCII maps, generated reports, parked design notes, deferred cloud/MP docs.

### A6. Historical
docs/DECISIONS-archive.md, docs/DEVLOG-archive.md, docs/TODO-archive.md, DEVLOG.md, applied proposals under docs/proposals/, redirect stubs, the per-move audit sections 1 to 8 of the review. Rationale is preserved here and never competes, because A2 always holds the in-force ruling with a pointer back.

### A0. Outside the model
Legal files and CREDITS.md, .github/FUNDING.yml, opencode.json, .aider.chat.history.md, ponytail/skills/ (third-party skills: recommend one CLAUDE.md line saying they never override project rules), temp-audit-outputs/.

---

## 4. Document-role mapping (significant documents)

Full per-path mapping, with evidence lists, is in phase-3-document-map.json (40 groups, 103 paths, no duplicates or gaps).

| Path | Current purpose | Proposed role | Level | Status | Confidence | Action | Basis |
|---|---|---|---|---|---|---|---|
| CLAUDE.md | Detailed agent rules | Governing workflow rules | A1 | canonical candidate | high | clarify | F-012, F-014, F-022; GDD reference line (F-001) |
| CONTEXT.md | Startup ritual, pointer | Startup pointer, subordinate to CLAUDE.md | A1 | active | high | clarify | F-003 hard-coded tracker; F-022 |
| docs/PM-WORKFLOW.md | Tracker rules | Delegated tracker detail | A1 | active | high | retain | CLAUDE.md delegates here |
| docs/ORIGINAL-OWNER-RULES.md | Upstream publish rules | Dormant reference | A5 | reference-only | medium | clarify | F-014 "Part 1", F-019 |
| DECISIONS.md | Rulings | Decision register | A2 | canonical candidate | high (role) | clarify | F-009, F-012, F-019, NEW-01, F-003 |
| STATE.md | Handoff | Current-state snapshot, names active tracker | A4 | active | high | retain | F-016 |
| BALANCE.md | Tuning ledger | Tuned-value history | A4 | active | medium | retain | F-009, F-025 |
| TODO.md | Board mirror plus design notes | Mirror, board wins | A4 | active | medium | retain | F-015, OD-09 |
| BOSS-REWORK.md | Boss/gym tracker | Boss/gym/elite spec | A3 | canonical candidate | medium | owner decision | F-001 to F-004, NEW-01 |
| docs/GYM-ROSTERS.md | Gym data | Spec data under BOSS-REWORK | A3 | active | medium | retain | defers to BOSS-REWORK |
| docs/BOSS-AUTHORING.md | Authoring schema | Spec under BOSS-REWORK | A3 | unresolved | low | clarify | F-002 DRAFT vs built |
| docs/FULL-GAME-STRUCT.md | Undated loop note | Unresolved | n/a | unresolved | low | owner decision | F-004, Q-07 |
| GDD.md | Upstream design doc | Baseline reference, boss/rift sections superseded | A5 | superseded candidate | medium | owner decision | F-001 |
| ONBOARDING.md | Architecture map | Reference (code wins) | A5 | active | medium | clarify | F-017, F-019 |
| GLOSSARY.md, README.md | Terms, public readme | Reference | A5 | reference-only | medium | clarify / owner | F-017, F-018 |
| docs/MOVE-AXIS-SCHEMA.md | Move grammar | Move grammar spec | A3 | canonical candidate | medium | clarify header | F-005, F-008 |
| .../combat-architecture.md | Checkpoint 2 | Move-combat contracts spec | A3 | canonical candidate | medium | clarify header | F-005, EC-01, EC-04 |
| .../move-consistency-review.md | Audit plus section 9 | s1-8 historical; s9 register through 4b (fate per OD-06) | A2 or A6 | unresolved | medium | owner decision | F-007, EC-05 |
| .../combat-validation-and-handoff.md | Checkpoint 3 | Validation plan | A4 | active | medium | retain, repoint table 3.6 | F-007 |
| .../move-schema/slice-overview.md | Branch index | Plan index and status home | A4 | active | medium-high | clarify | F-007, F-010 |
| .../move-schema/slice-*.md, stage-0.md, handoffs | Slice plans | Plans / records | A4 | active | medium-high | clarify 4a, 4b status lines | F-010 |
| docs/proposals/*-proposal.md (13) | 2026-10-17/18 proposals | Applied records | A6 | historical | high | archive (banner, no move) | F-011 |
| docs/DECISIONS-archive.md, DEVLOG-archive.md, TODO-archive.md, DEVLOG.md | History | Historical | A6 | historical | high | retain (fix F-023 header) | F-023 |
| FEATURES_GRAB.md, parked design notes (G35), ASCII maps | Parked or illustrative | Reference | A5 | unresolved / reference | low-medium | owner (OD-11) | F-024 |
| CREDITS.md | Upstream credits | Outside model | A0 | reference-only | high (role) | owner (OD-10) | F-021 |

**Documents whose purpose remains unclear:** docs/FULL-GAME-STRUCT.md, docs/BOSS-AUTHORING.md (draft vs implemented), docs/SIM-PRESENT-BOUNDARY.md, the four parked design notes in G35, FEATURES_GRAB.md, and section 9 of the review (depends on OD-06).

---

## 5. Authority and status rules (proposed)

These are **prospective** rules. The project has no recorded approval process beyond in-document labels such as "LOCKED, Jess" and "[Jess decided]", all written by AI tools in sessions. Past approvals cannot be independently reconstructed (F-006, F-010, EC-01). Rule R1's ratification step is how the historical gap is closed, not by inventing a history.

- **R1. What counts as an approved decision.** An owner decision is approved when it is recorded as a dated DECISIONS.md entry tagged with the owner, in the same session it was given, and the owner commits it (the owner runs every commit, so the commit is the owner's own act). Historical labels (LOCKED, DECIDED, signed off) are treated as **owner-labelled, unverified** until the owner ratifies them, either one by one or in bulk (OD-07). **[New proposal]**, building on the existing DECISIONS.md convention.
- **R2. How a decision becomes canonical.** It becomes binding when it is in DECISIONS.md (R1); its detailed form becomes canonical when the owning A3 spec is updated in the same commit, with the spec citing the DECISIONS entry by date and title.
- **R3. How supersession is recorded.** The new entry says "Supersedes: <date, title>". The old entry is kept in place and gets a one-line "SUPERSEDED by <date, title>" marker (or is moved verbatim to the archive with the same marker). Partial supersession names the superseded part (for example: NEW-01 would supersede only Phase 2 of the 2026-10-17 difficulty entry). Without this record, an apparent conflict is reported to the owner, not resolved by date. Grounded in existing practice: the 2026-10-20 workflow entry already says "supersedes the 'propose a diff' step of the 2026-10-17 Edit boundary entry".
- **R4. Proposed, approved, built, verified.** Four states, defined once (proposed: written, not approved; approved: R1 satisfied; built: in code on the branch, commit named; verified: harness passes and, for feel-affecting work, the owner's playtest sign-off is recorded). Each effort records state in **one** status home (A4). Specs and slice files carry a role line and a pointer to the status home instead of their own status line. This removes the cause of F-002, F-005, F-010, F-011.
- **R5. Code vs specification.** Neither wins automatically. The code tells you what the game does now; the spec tells you what was intended. A discrepancy is recorded (status home or an issue) and the owner decides which side changes. Exceptions already defined by the project: BALANCE.md records retunes, so for a tuned number the code plus BALANCE.md's final-state line is the current value and DECISIONS.md needs a supersession note (F-009). Deliberate placeholders are marked TEMP in code and named in the status home with their removal condition (F-025).
- **R6. Rule changes reach agent context.** Any change to an A1 rule, or to a spec or decision that changes what agents must do at startup, updates CLAUDE.md (and CONTEXT.md only if its one-line reminder changes) in the same commit, plus a DECISIONS.md entry. The owner mirrors the change into the Amazon Quick agent instructions. STATE.md mentions it in the next handoff.
- **R7. Cross-system requirements.** Stated once in the owning spec with a stable ID (I-n, D-n, R-n, section number); other documents cite the ID and path. Duplicated tables are allowed only in generated reports.
- **R8. Historical material.** Archives and applied records are never edited except for a one-line status banner or header fix; they never govern. The live register always points back to them when they hold the rationale.
- **R9. Precedence when documents disagree.** For agent behaviour: CLAUDE.md, then CONTEXT.md and PM-WORKFLOW.md. For design: the newest non-superseded DECISIONS.md ruling, then the owning A3 spec, then active plans, then reference, then history. For status: the effort's status home, then STATE.md, then everything else; the board wins for "what next". For "what does the game do": the code. Any unresolved disagreement is reported to the owner.

Check for circular or competing authority: A1 is the only level that tells agents how to work; A2 is the only level that records rulings; each subsystem has one A3 home; each effort has one status home. The two remaining competing pairs (DECISIONS.md vs review section 9; BOSS-REWORK.md vs GDD.md) are blocked on OD-06 and OD-02 and are marked unresolved, not designated.

---

## 6. Minimum viable target structure

No new files. Paths below are current paths; nothing is moved.

```
CLAUDE.md                     A1  governing rules (+ precedence line, + third-party skill line)
CONTEXT.md                    A1  startup pointer (tracker comes from STATE.md)
docs/PM-WORKFLOW.md           A1  tracker detail
DECISIONS.md                  A2  rulings + supersession markers
  docs/DECISIONS-archive.md   A6
BOSS-REWORK.md                A3  boss/gym/elite spec (if OD-03 confirms)
  docs/GYM-ROSTERS.md         A3  data
  docs/BOSS-AUTHORING.md      A3  authoring schema
docs/MOVE-AXIS-SCHEMA.md      A3  move grammar
docs/current feature planning/
  combat-architecture.md      A3  move-combat contracts
  combat-validation-and-handoff.md   A4
  move-consistency-review.md  s1-8 A6; s9 per OD-06
  move-schema/slice-overview.md      A4  status home for the move schema
  move-schema/slice-*.md, *-codehandoff.md  A4
STATE.md                      A4  handoff, names active tracker
TODO.md  (board wins)         A4
BALANCE.md                    A4  tuned-value history
GDD.md, ONBOARDING.md, GLOSSARY.md, README.md, docs/survivor-like-design-reference.md   A5
DEVLOG.md, docs/DEVLOG-archive.md, docs/TODO-archive.md, docs/proposals/   A6
```

- **Stay authoritative:** CLAUDE.md, DECISIONS.md, MOVE-AXIS-SCHEMA.md, combat-architecture.md, slice-overview.md (status), STATE.md (handoff), board (work queue). BOSS-REWORK.md pending OD-03.
- **Should point instead of duplicating:** CONTEXT.md (rules point to CLAUDE.md, tracker points to STATE.md); slice files and handoffs (decisions point to the register); combat-validation-and-handoff.md table 3.6; DECISIONS.md move-grammar entry (point to MOVE-AXIS-SCHEMA, F-008); GYM-ROSTERS (already defers).
- **Mark historical or superseded:** docs/proposals/ applied proposals; GDD.md boss/rift/Judgment sections (pending OD-02); DECISIONS.md entries for DMG_SCALAR 2.0, "never runs git", SEO in tools/, two-phase difficulty Phase 2 (pending OD-03, OD-05); review sections 1 to 8.
- **Implementation status and verification evidence live in:** the effort's status home (slice-overview.md for the move schema), with harness names and the owner's sign-off date. Verification results themselves stay in the harnesses and `node tools/check.js` output, not copied into docs.
- **Genuinely new documents:** none.

---

## 7. Conflict-by-conflict recommendations

| ID | Recommendation type | Recommendation | Evidence |
|---|---|---|---|
| F-001 | Superseded (needs owner confirmation) | BOSS-REWORK.md appears to govern bosses, rifts, gyms; GDD.md's matching sections appear superseded. Do not designate until OD-02 and OD-03. | BOSS-REWORK s1 LOCKED; judgment.js:34, rift.js:27; BOSS-REWORK s5 names GDD for update |
| NEW-01 | Superseded (needs owner confirmation) | Phase 2 of the 2026-10-17 difficulty entry appears superseded by BOSS-REWORK s1 level curve; the Standard Run / Unlock Safeties idea's fate is unstated. | DECISIONS.md:233-248; BOSS-REWORK.md:15, :18; stats.js:52 |
| F-002 | Clarify (owner confirms per-section status) | Treat sub-section labels as the latest; section 3 heading is stale. Ratify under OD-07. | BOSS-REWORK 3a, 3d, 3e labels; GYM-ROSTERS:3-4 |
| F-003 | Clarify scope | CONTEXT.md should take the active tracker from STATE.md. The boss-rework branch status is the owner's call. | CONTEXT.md:47; STATE.md:7; BOSS-REWORK:3-5 |
| F-004 | Insufficient evidence | Owner must define "loop" and whether difficulty rises per loop (OD-04). Not a confirmed contradiction. | FULL-GAME-STRUCT:1-8; BOSS-REWORK s4, 3e; gym.js:21 |
| F-025 | Low impact, defer | Known placeholder. Owner says whether the gym-cycle hook is queued; record it in the status home. | elites.js K.first/K.every TEMP; BALANCE.md:39 |
| F-005 | Clarify | Replace header status lines with role plus pointer to slice-overview.md (R4). | EC-04; slice-overview:38-46; code files exist |
| F-006 | Owner must ratify | Answers were never committed (EC-01). Ratify Q1 to Q17 as recorded in combat-architecture.md, or correct them. | a68a366 history |
| F-007 | Owner decides register | Recommend DECISIONS.md as the single register from now on, with section 9 frozen as the register for Checkpoints 1 to 3 and slices 3a to 4b, and merged at slice 7 as already planned. | EC-05; slice-7.md:6; PM-WORKFLOW "a ruling goes in DECISIONS.md" |
| F-008 | Clarify (low) | MOVE-AXIS-SCHEMA.md owns the grammar; others cite it. No conflict today. | move-attributes.js:73,168,175 |
| F-010 | Clarify plus ratify | slice-overview.md is the status home; fix the two stale lines after the owner confirms sign-off. | slice-4a.md:3; slice-overview:4,45-46; STATE.md:7 |
| F-009 | One source superseded | Code 1.0 plus BALANCE.md final state govern the value; annotate DECISIONS.md:101 (principle stands). | stats.js:79; BALANCE.md:54-55 |
| F-012 | Owner confirms supersession | CLAUDE.md/CONTEXT.md read-only rule appears to be the current intent; record a DECISIONS entry superseding 2026-10-17 "Git execution" and the 2026-10-20 "UNCHANGED" clause. | 598211b; CLAUDE.md:59-61 |
| F-013 | One source authoritative | The project rule (no trailers) governs commits Jess makes; the assistant never commits under CLAUDE.md anyway. Owner confirms (OD-05). | CLAUDE.md:69; DECISIONS.md:73 |
| F-014 | Clarify | Add the precedence line; fix "Part 1"; "ISSUES" probably means TODO.md (EC-03). | CLAUDE.md:3-4; CONTEXT.md:1-3 |
| F-017 | Owner decides scope of upstream docs | Source-checkout instructions should say dev.html; whether README/ONBOARDING are maintained is OD-08. | DECISIONS.md:151-166; .gitignore |
| F-018 | One source authoritative | DECISIONS.md (no GitHub Pages) governs; README line is stale and its link is broken. | DECISIONS.md:157-158; README.md:90 |
| F-019 | One source superseded | 2026-10-20 entry supersedes 2026-10-17; annotate. ORIGINAL-OWNER-RULES build line fixed at publish time. | f853071 deletion |
| F-021 | Owner decision, out of migration | Flag only (OD-10). Editing the file would not remove history. | .gitignore:25-26; CREDITS.md table |
| F-011 | Superseded/historical | Mark applied proposals historical with a banner; do not move. | DECISIONS.md:58-68; commits |
| F-015 | Owner decides | Board wins for what next (already declared). Decide whether snapshots are tracked or stop being cited (OD-09). | PM-WORKFLOW:11; .gitignore:65 |
| F-016 | Low impact, defer | Expected behaviour of the ritual; optional wording "uncommitted at time of writing". | e2acd82 file list |
| F-020 | Low impact, defer | Recommend the rule applies to newly written fork prose; archives and upstream text exempt. Owner confirms in the minor-confirmations list. | archive headers say verbatim |
| F-022 | Clarify (safe) | delete/ to _delete_/ in CLAUDE.md and CONTEXT.md. | .ignore:6 |
| F-023 | Clarify (safe) | Fix the DEVLOG-archive header. | DEVLOG.md:5 |
| F-024 | Low impact, owner groups | One-line status headers or leave as is (OD-11). | reference-integrity.md |

---

## 8. Validation of this proposal

- Every recommendation above cites a finding ID, a path and line, or is labelled [New proposal].
- Cited paths: all document paths come from the inventory (all exist). New line citations made in this phase were read directly (DECISIONS.md:226-248, BOSS-REWORK.md:1-8, :15, :18, stats.js:52, move-consistency-review.md:641 and section 9 headings, TODO.md:1, git a68a366).
- Finding IDs F-001 to F-025 all exist in decision-conflicts.json. NEW-01 and EC-01 to EC-05 are Phase 3 additions, labelled as such.
- JSON: phase-3-document-map.json parses, maps 103 of 103 inventory paths once each, and uses the same OD numbering as phase-3-owner-decisions.md.
- Circular authority: none found in the proposed structure; the two competing pairs are left unresolved pending OD-02/OD-03 and OD-06.
- Duplication in the target: the only intentional duplication is CONTEXT.md's one-line reminders of CLAUDE.md rules, kept because CONTEXT.md is the startup file for both tools.
- Repository untouched: see phase-3-summary.md for the git check.
