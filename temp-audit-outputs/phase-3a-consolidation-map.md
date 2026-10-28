# Phase 3A: Canonical consolidation map (proposal for owner review)

Baseline: branch chore/documentation-authority-audit at e2acd82. Nothing here is approved and no project file was changed.

Inputs: the Phase 3 deliverables (phase-3-authority-map.md, phase-3-document-map.json, phase-3-owner-decisions.md, phase-3-migration-plan.md, phase-3-summary.md), the Phase 2 register (decision-conflicts.json/.md, F-001 to F-025), the Phase 1 inventory (document-inventory.json, 103 paths), and targeted read-only checks of the original documents and code made in this phase (listed as NE-01 to NE-17 in section 2).

Labels:
- **[Evidence]** a fact traced to a path and line or section.
- **[Recommendation]** this phase's proposal; needs no new design intent.
- **[Owner decision]** cannot be settled from the evidence; see phase-3a-owner-questionnaire.md (IDs QA-nn).

IDs introduced in this phase: S-nn (subjects), C-nn (cross-system contracts), SG-nn (semantic gaps), NE-nn (new evidence). Phase 2 and 3 IDs (F-nnn, NEW-01, EC-nn, OD-nn) are reused unchanged.

Companion files: phase-3a-owner-questionnaire.md, phase-3a-migration-plan.md, phase-3a-summary.md.

---

## 1. Review of the Phase 3 proposal

### 1.1 Verdict: Phase 3 reorganizes; it does not consolidate

Phase 3 assigned every document a role and level (A0 to A6), added status and supersession rules (R1 to R9), and planned annotations, banners and pointer fixes with "no new documents" and "no file moved". That is a sound authority map, but it leaves the **content** where it is. After Phase 3's migration, an agent looking for the current rule on most subjects would still read two to six documents and follow supersession markers between them.

Specific Phase 3 actions that would preserve competing active descriptions:

| Phase 3 action | Why it keeps competing sources | Evidence |
|---|---|---|
| A2: DECISIONS.md stays the "decision register" holding detailed rulings | DECISIONS.md is a de facto spec. The gym escalation mechanism, the damage formula, the HP model and three move-grammar entries are written there in full, and also (partly) in BOSS-REWORK.md, combat-architecture.md and MOVE-AXIS-SCHEMA.md. Two homes per rule. | DECISIONS.md:9-23, :96-121, :197-207, :226-248, :280-320 |
| R3: supersession by a "SUPERSEDED by" marker on the old entry, kept in place | This is the X to Y to Z chain the target model forbids. Example: normalization has three live entries (DECISIONS.md:291-305); the reader must read all three to learn there is none. | DECISIONS.md:294, :297-301, :303-305 |
| OD-06 (recommended): freeze review section 9 as the register through 4b, DECISIONS.md from 4c, merge at slice 7 | Keeps two move-schema registers active for the rest of the branch, plus slice-4c.md, which repeats the 4c entries. A coding chat must read three places and work out which is newer. | slice-overview.md:24; DECISIONS.md:307-320; slice-4c.md "Decisions" |
| R6: change CLAUDE.md and DECISIONS.md in the same commit | Institutionalizes duplication of workflow rules instead of removing it. F-012 is what happens when the sync is missed. | DECISIONS.md:70-73, :123-142, :192-195, :219-224 vs CLAUDE.md |
| CONTEXT.md one-line rule reminders kept "intentionally" | CONTEXT.md and CLAUDE.md are both auto-loaded at startup (CLAUDE.md "Efficient repository exploration"), so the reminder copy gives no access benefit and a second wording to drift. STATE.md carries a third copy ("Standing rules"). | CONTEXT.md "Core working rules"; STATE.md last section |
| A6: docs/DECISIONS-archive.md is "historical, never governs" | The archive holds **still-valid requirements** that live documents cite as current rules (NE-01). Demoting it silently drops them; leaving it as is keeps an "archive" that is really an active source. | BUFF-TABLE.md:4; BOSS-REWORK.md:11, section 3c last bullet; archive :364-480 |
| OD-02 option (c): banner GDD's boss, rift and Judgment sections, keep the rest as baseline | GDD is stale well beyond the boss sections (NE-11): enemy cap, elite crowd bonus, items, move families, ticket sources, targeting, its own "Pending" list. "Baseline for areas no fork spec covers" would keep a competing description of enemies, items and economy. | GDD.md:75-88, :169-200, :227-249, :314-320 |
| G31: SIM-PRESENT-BOUNDARY.md proposed historical | It has an active pay-down log and a list of remaining offenders (NE-15). It is the live architecture-direction document. | SIM-PRESENT-BOUNDARY.md:46-51 |

### 1.2 Subjects Phase 3 did not identify

Phase 3 grouped documents by file and never examined G34/G35 or the archive's content. Content review shows these subjects have **no canonical home** today and are spread across the archive, BOSS-REWORK.md, GDD.md, BALANCE.md and move-schema documents:
- Combat math (stats, HP, damage formula, scalars, type chart, crit) (S-09).
- Status effects and stat stages (S-10), which have a three-step supersession chain in the archive and a fourth layer in the move schema.
- Enemies (S-13) and items/economy (S-14), whose fork rulings live only in the archive.
- Cross-system contracts between the new move system and gyms/enemies (C-01 to C-06), including one requirement with no authoritative definition after slice 7 (SG-15).

### 1.3 What Phase 3 got right and this phase keeps

- OD-01 (baseline tree) is still the first decision.
- R4 (one status home per effort, specs carry a role line not a status line) and R5 (code vs spec goes to the owner) carry over unchanged.
- Batch 1 path fixes, applied proposals as history, deferred cloud/MP reference, legal files outside the model.
- EC-01 (the Checkpoint 1 answers were never committed) still means "approved" labels need owner ratification before a consolidated spec can call them approved.

---

## 2. New evidence found in Phase 3A

All read-only. Line numbers are at e2acd82.

| ID | Finding | Evidence |
|---|---|---|
| NE-01 | docs/DECISIONS-archive.md holds active rules that live docs cite as current: status engine (Slice C), stat stages (D1, superseded in part by E2a), player statuses (E1), team stage buffs (E2a), item three-tier model, boss rework design, DoT on base HP. DECISIONS.md:5 calls the archive "older and superseded entries". | archive :364, :379, :393, :398, :456, :472, :503, :526; BUFF-TABLE.md:4 ("Rules and reasoning: DECISIONS.md, 2026-10-20 Status Slice E2a", which is only in the archive); BOSS-REWORK.md:11 and section 3c last bullet |
| NE-02 | DMG_SCALAR 2.0 appears in three live DECISIONS entries, not one: :101, :200 ("SCALAR = 2.0 (locked)") and :211 ("at scalar 2.0"). Phase 2/3 flagged only :101 (F-009). | DECISIONS.md:101, :200, :211; js/core/stats.js:79 (1.0); combat-architecture.md D7 ("code wins") |
| NE-03 | Accuracy: DECISIONS 2026-10-26 says accuracy "passes through" and "stays out of dmg"; Q6 (review 9.1), combat-architecture D1 and the resolver fold accuracy into basePower. Not annotated. | DECISIONS.md:300, :304; review 9.1 Q6; js/data/move-resolver.js:66 |
| NE-04 | MOVE-AXIS-SCHEMA.md:8 still says a legacy kind exists "in the resolver's bridge projection", which DECISIONS 2026-10-25 (slice 2 prep) and slice-overview.md abolished. The proposed canonical grammar spec carries a superseded rule. | MOVE-AXIS-SCHEMA.md:8; DECISIONS.md:282 vs :292; slice-overview.md "What this branch is" |
| NE-05 | Quick Attack: DECISIONS 2026-10-24 gives `returnHits outAndBack` as the canonical return dash; Q3 changed it to `out` (applied in 3a); 4c-2 adds "hits one enemy at the arrival point". | DECISIONS.md:15; review 9.1 Q3, 9.6; DECISIONS.md:316 |
| NE-06 | Review 9.5 and 9.7 still list as open or ownerless several items DECISIONS.md and slice-4c.md later decided: Aura Sphere reach, Rock Slide boulder count, Bonemerang return-leg knockback, Psychic steering, String Shot spacing; F5 i-frames refined to "whole dash plus 0.3 s tail". | review 9.5 rows, 9.7 item 6; DECISIONS.md:309-316; slice-4c.md "Decisions" |
| NE-07 | Trap on enemies, three steps: Slice C (own state, 1/16 max HP per 2 s, x0.25 movement) then E1 ("Enemies cannot be trapped any more") then Q5/9.8 (root for 2 s on the new path, behind `?newcombat`). | archive :472-480, :379-390 (E1 TRAP bullet); review 9.1 Q5, 9.8 |
| NE-08 | Stat stages, four layers: BOSS-REWORK 3c (mainline table 0.25 to 4.0, 12 s then 6 s per application), archive D1, archive E2a (one base number B per stat, "supersedes the D1 Speed -6 = x0.25 ruling", no explicit cap, cd = duration = 8 s), move schema Q4 and 9.8 (per-move maxStacks, default duration 6 s, maxStacks 6). Code: G.Stages.add takes a maxStacks argument from move riders. | BOSS-REWORK.md section 3c; archive :456, :364; review 9.1 Q4, 9.8 D-2; js/systems/move-effects.js:117-119; BUFF-TABLE.md |
| NE-09 | Type chart: implemented softened chart (x1.6/x0.6/x0.3, cap 0.3 to 2.4); stat-model notes list "Full mainline type chart" as locked; TODO and BOSS-REWORK 3d say the canonical chart is ON HOLD; GDD's own Pending list still says "Type effectiveness on damage" is not done. | js/data/types.js:6-8, :34; GDD.md:162-167, :316; docs/stat-model-design-notes.md section 4; BOSS-REWORK.md 3d item (4); TODO.md "tune/damage CARRY-OVERS" |
| NE-10 | Gym AI depends on the legacy move system: gyms.js allows only ids from G.Moves (js/data/moves.js); enemy.js gym casting filters by `m.kind`; BOSS-REWORK 3a keys boss forms by move kind and says gym casts use "per-cast normalization". The move schema removes kind and normalization, and slice-7.md says gym and enemy use of the new definitions "is not covered by any earlier slice". | js/data/gyms.js:3, :146; js/entities/enemy.js:797; BOSS-REWORK.md 3a; slice-7.md:5; DECISIONS.md:303-305 |
| NE-11 | GDD stale outside the boss sections: enemy cap 280 (code CAP = 64); crowd "elite" x1.6 HP and XP, x1.25 damage (BOSS-REWORK: XP only, damage part dropped); "Equippable items (one per run)" (archive: three-tier model supersedes it); "52 moves in 7 families"; x10 tickets from bosses and rift legendaries (both removed; current x10 sources not documented in any document reviewed); targeting "the boss if in range" (new path: plain nearest, 3c S3). | GDD.md:79-84, :179-180, :227-231, :244-249; js/systems/spawner.js:16; BOSS-REWORK.md:30; archive :398; review 9.2 slice 3c S3 |
| NE-12 | Two cited documents no longer exist: docs/MOVES-IMPORT-PLAN.md (cited in TODO.md "In progress") and MOVES-REFACTOR-PLAN.md (cited at MOVE-AXIS-SCHEMA.md:5). Both deleted in 050437e (2026-10-24). Not in reference-integrity.md. | TODO.md "MOVES IMPORT" bullet; MOVE-AXIS-SCHEMA.md:5; `git show --stat 050437e` |
| NE-13 | Gym gate escalation rules exist only in DECISIONS 2026-10-22 and BALANCE.md; the boss/gym spec candidate does not contain them, and its section 7 says a gym's level "LOCKS when its gate spawns". Compatible (locked base plus bump read once at entry), but the canonical candidate is incomplete. | DECISIONS.md:17-23; BALANCE.md:222; BOSS-REWORK.md section 7 |
| NE-14 | BOSS-REWORK internal supersession: section 2 "OPEN: whether elites run through the Elite Four phase"; section 7 "RESOLVED 2026-10-19 ... Elites run in the Elite Four phase". | BOSS-REWORK.md sections 2 and 7 |
| NE-15 | SIM-PRESENT-BOUNDARY.md is active: "Paid down (log)" and "Remaining gym-side offenders (convert when the next slice touches them)". DECISIONS 2026-10-22 points to it for "Full detail". | SIM-PRESENT-BOUNDARY.md:46-51; DECISIONS.md:29 |
| NE-16 | Enemy cast size: GDD says 7 per tier; the archived DECISIONS heading says "Cast composition rule (9 per tier)". Not checked in code. | GDD.md:171-172; DECISIONS.md:48 |
| NE-17 | stat-model-design-notes.md section 4 says the first slice has "IV/EV feeding in"; DECISIONS 2026-10-17 fixes IV/EV at 0 and unstored. Its section 5 "Housekeeping" names an uncommitted tree and a deleted SEO tool. The note is a dated analysis whose locked items were restated in DECISIONS. | stat-model-design-notes.md:3, sections 4-5; DECISIONS.md:176-190, :250-256 |

---

## 3. Consolidation model

### 3.1 Principles applied to this project

1. **One canonical spec per subject.** A spec states the current rule in full, with a stable ID per rule (existing IDs such as I1, D7, R2, Q-numbers may be kept as anchors).
2. **DECISIONS.md becomes a decision log, not a second spec** (QA-01). Each entry keeps the date, the owner tag, a one to three line summary of what was decided and why, and a `Canonical:` pointer to the spec section that now holds the rule. Detailed rule text moves into the spec. DECISIONS.md stays the canonical home only for project-wide principles that have no subsystem (density north star, performance stance, local-first, docs portability), and even those are worded once (in CLAUDE.md where they are agent rules).
3. **Superseded entries leave the live files.** When a rule is consolidated, the older entries that stated a different version move verbatim to docs/DECISIONS-archive.md under a one-line header naming the current canonical section. No chain is ever needed to find a current rule: the spec has it; the log points to the spec; the archive points to the spec.
4. **Archive extraction before demotion.** Still-valid requirements found in the archive are copied into their canonical spec first; only then is the archive treated as history.
5. **Status in one place.** Specs carry a role header and per-requirement tags; build and verification state lives in the effort's status home (R4 from Phase 3).
6. **Thin context.** CLAUDE.md holds agent rules; CONTEXT.md holds the startup and end ritual plus pointers; STATE.md holds the handoff only.

### 3.2 Spec header and requirement tags (proposed, [Recommendation])

Every canonical spec starts with five lines: **Role** (what this document is canonical for), **Owns** (subject list), **Does not own** (subject, then the canonical path), **Status home** (where build and verification state lives), **Last reconciled** (date and commit of the last consolidation pass).

Requirement tags, one per rule or rule group, never mixed into prose:
- `[Approved]` owner-approved intended behavior (ratified per QA-07).
- `[Approved, not built]` approved, no code yet.
- `[Approved, flag only]` built only behind `?newcombat` (legacy path still live); used for the move schema until slice 7.
- `[Proposed]` written, not approved.
- `[Open]` question recorded, no answer.
- `[Legacy behavior]` describes what the live game does today where it differs from an approved future rule (makes intended vs implemented explicit, see SG-01, SG-03, SG-11).
"Verified" is never a spec tag; the status home records harness names and owner sign-off dates.

### 3.3 Proposed canonical documentation set

| Subject | Canonical home | Change type | Phase 3 equivalent |
|---|---|---|---|
| Agent working rules | CLAUDE.md | trim duplicates elsewhere | same home; Phase 3 kept copies |
| Startup and end ritual, pointers | CONTEXT.md | pointer-only | Phase 3 kept rule reminders |
| Tracker workflow | docs/PM-WORKFLOW.md | unchanged | same |
| Handoff | STATE.md | drop "Standing rules" copy | same |
| Game overview, screen flow, world, enemies summary, items, economy and meta | GDD.md, rewritten as the fork's living umbrella (QA-02) | rewrite sections into current summaries plus pointers | Phase 3: frozen baseline with banners |
| Run progression, level curve, gyms, elites, Elite Four, region completion, loops | BOSS-REWORK.md as spec only (QA-06), with docs/GYM-ROSTERS.md (data) and docs/BOSS-AUTHORING.md (authoring format) | absorb DECISIONS and archive rulings, FULL-GAME-STRUCT, remove tracker and change log | Phase 3: candidate, tracker role kept |
| Combat math, status effects, stat stages | **docs/COMBAT-RULES.md (new, the only new document; QA-03)** | created from DECISIONS, archive, BOSS-REWORK 3c, stat-model notes | Phase 3: none |
| Move data grammar | docs/MOVE-AXIS-SCHEMA.md | absorb grammar decisions | same home |
| Move runtime pipeline | docs/current feature planning/combat-architecture.md | absorb runtime decisions; D6 to D11 cite COMBAT-RULES | same home |
| Per-move intended behavior | docs/current feature planning/combat-validation-and-handoff.md, re-roled as "Move intent and validation" (QA-04) | absorb per-move rulings from review 9.5, DECISIONS, slice-4c.md | Phase 3: none |
| Architecture, module map, build and run | ONBOARDING.md (map, build, run) and docs/SIM-PRESENT-BOUNDARY.md (direction) | fix run/build lines; absorb DECISIONS build entries | Phase 3: SIM-PRESENT historical |
| Tuned values history | BALANCE.md | rule text points to specs; numbers stay | same |
| Move-schema status | slice-overview.md | status home only; decisions pointer | same |
| Decision log | DECISIONS.md | convert to log with pointers (QA-01) | Phase 3: register of rulings |

Net document count: one new document (COMBAT-RULES.md). Documents that stop being active sources: review section 9 (to history with pointer), FULL-GAME-STRUCT.md (folded, if QA-08 approves), stat-model-design-notes.md (analysis history), the BOSS-REWORK change log (to history), GDD's decision log section (history).

---

## 4. Subject map

Format per subject: canonical destination, sources, unique requirements, conflicts, duplication, historical value, disposition, evidence and confidence, validation criteria.

### S-01 Agent working rules
1. **Destination:** CLAUDE.md.
2. **Sources:** CLAUDE.md; CONTEXT.md "Core working rules"; STATE.md "Standing rules"; DECISIONS.md 2026-10-17 Local-first, English-native, Edit boundary, Git execution, Docs portability, Remote visibility, Performance stance, changelog.js exception; DECISIONS.md 2026-10-20 Workflow update; 2026-10-21 no native browser dialogs; docs/ORIGINAL-OWNER-RULES.md (commit hygiene, dormant publish rules); slice-overview.md "Rules for every coding chat" 2 and 5; docs/PM-WORKFLOW.md (tracker).
3. **Unique requirements:** DECISIONS 2026-10-21 "New code must use G.UI.ask, never confirm/alert/prompt" is a coding rule absent from CLAUDE.md. DECISIONS 2026-10-17 "Remote visibility via local checkout" (no GitHub connector; agent reads the working tree) is absent from CLAUDE.md. DECISIONS 2026-10-20 "Jess feel-tests after each change, so applied changes are not described as untested" is absent. slice-overview rule 5 "Done means" is a branch-specific definition and stays there.
4. **Conflicts:** F-012 read-only git (DECISIONS.md:141-142, :73 vs CLAUDE.md git section). F-013 trailers (project rule vs tool defaults). F-014 precedence. EC-03 "ISSUES".
5. **Duplication:** local-first (3 copies plus DECISIONS), English-native (3 plus DECISIONS), workflow/edit boundary (CLAUDE, CONTEXT, STATE, DECISIONS x2, slice-overview), git rule (CLAUDE, CONTEXT, STATE, DECISIONS x2, slice-overview), em-dash rule (CLAUDE, CONTEXT, STATE), performance stance (CLAUDE, DECISIONS), changelog exception (CLAUDE, CONTEXT, DECISIONS), session ritual (CLAUDE "Session rituals" and CONTEXT).
6. **Historical value:** dates of adoption and the reasons ("i dont want Pages", why read-only git) belong in the log.
7. **Disposition:** consolidate into CLAUDE.md; CONTEXT.md and STATE.md keep a single pointer line; DECISIONS workflow entries become log lines with `Canonical: CLAUDE.md <section>`; superseded git entries to archive. ROUTINE once QA-15 confirms the read-only git rule.
8. **Evidence and confidence:** F-012, F-013, F-014, F-022; CONTEXT.md and STATE.md as read. High confidence on duplication; medium on whether the Amazon Quick agent reads CLAUDE.md (outside the repo).
9. **Validation:** a grep for each rule's key phrase ("read-only git", "Co-Authored-By", "em-dash", "prose plan", "local-first", "G.UI.ask") finds full rule text only in CLAUDE.md; other hits are one-line pointers. Startup test: a fresh session asked "catch me up" names the right tracker and states the git rule correctly. Owner confirms the Quick agent instructions match.

### S-02 Session context, handoff and work status
1. **Destination:** CONTEXT.md (ritual and pointers), STATE.md (handoff), the GitHub board (queue), one status home per effort (slice-overview.md for the move schema; for gym progression, the board, QA-06).
2. **Sources:** CONTEXT.md, CLAUDE.md "Session rituals", STATE.md, TODO.md (mirror plus long-form design notes), docs/issues-snapshot.md (gitignored), BOSS-REWORK.md header (tracker role), slice-overview.md, slice headers.
3. **Unique requirements:** TODO.md "In progress" and "Backlog" contain design content not stored anywhere else: region-select design (DESIGNED, not built), Bond rework scope, hitbox notes, canonical type chart prerequisites, boss damage slice. These are proposals or open items, not approved rules, and stay as backlog items; but where they record owner rulings (for example "Jess 2026-10-18: LEAVE THE RIFT FIX") those belong in the relevant spec's `[Open]` or log.
4. **Conflicts:** F-003 (active tracker), F-010 (4a/4b sign-off lines), F-015 (board vs mirror), F-016 (STATE git lines).
5. **Duplication:** session ritual in CLAUDE.md and CONTEXT.md; slice status in slice-overview, slice headers, STATE.md.
6. **Historical value:** none beyond DEVLOG.
7. **Disposition:** CONTEXT.md owns the ritual (CLAUDE.md "Session rituals" becomes one pointer line); CONTEXT names "the tracker named in STATE.md"; slice headers lose status lines (Phase 3 batch 2). TODO.md stays a mirror; its long-form design notes are triaged into issues or spec `[Open]` items (DEFERRED, OD-09).
8. **Evidence:** F-003, F-010, F-015, F-016. High.
9. **Validation:** CONTEXT.md contains no rule text beyond pointers; STATE.md names the active tracker; slice files contain no status line other than in slice-overview.md.

### S-03 Build, run, publish and repository
1. **Destination:** ONBOARDING.md section 3 (build and run) for developers; DECISIONS log keeps the why; docs/ORIGINAL-OWNER-RULES.md stays dormant reference for the publish phase.
2. **Sources:** DECISIONS 2026-10-17 Source-only repo, SEO pipeline dormant; 2026-10-20 No external links, website files parked; README.md; ONBOARDING.md; GDD.md:8; CONTRIBUTING.md:22; CLAUDE.md debugging order; ORIGINAL-OWNER-RULES.md.
3. **Unique requirements:** DECISIONS 2026-10-20 "Ko-fi disabled by blanking kofi in js/data/funding.js; credits plain text; mailto stays" exists only in DECISIONS (a product rule, belongs in GDD screen-flow/menus section, S-14 or a short GDD "Menus" line). "Build with --sin-seo" exists only in DECISIONS.
4. **Conflicts:** F-017, F-018, F-019.
5. **Duplication:** "run via dev.html" in DECISIONS, CLAUDE.md, CONTEXT.md.
6. **Historical value:** rationale for source-only repo and no GitHub Pages.
7. **Disposition:** consolidate run/build instructions into ONBOARDING.md section 3; README keeps a one-line pointer (OD-08 scope, DEFERRED for publish text). Superseded SEO entry to archive.
8. **Evidence:** F-017 to F-019. High.
9. **Validation:** README, ONBOARDING, GDD and CONTRIBUTING no longer instruct opening index.html from a source checkout; the only full build description is ONBOARDING section 3.

### S-04 Architecture and module boundaries
1. **Destination:** ONBOARDING.md (module map, load order, G namespace) and docs/SIM-PRESENT-BOUNDARY.md (sim/present direction). combat-architecture.md cites I8 to SIM-PRESENT-BOUNDARY for the general rule.
2. **Sources:** ONBOARDING.md; CLAUDE.md "Debugging order"; DECISIONS 2026-10-17 Stat formulas centralized in G.Stats (load order rule); DECISIONS 2026-10-22 Language split and sim/present boundary; SIM-PRESENT-BOUNDARY.md; combat-architecture.md A (I6 to I8) and B; docs/ASCII Concept Maps (illustrations); PERF-HOTPATH-NOTES.md (analysis).
3. **Unique requirements:** "new combat-stat formulas live in G.Stats, never duplicated per entity; stats.js loads right after util" exists only in DECISIONS.md:258-264. "Client stays JS in the browser forever; server language deferred" only in DECISIONS.md:25-28.
4. **Conflicts:** none found. NE-15 corrects Phase 3's G31 role.
5. **Duplication:** sim/present discipline in DECISIONS:29, SIM-PRESENT-BOUNDARY, combat-architecture B and I8 (consistent).
6. **Historical value:** the Go vs JS reasoning.
7. **Disposition:** consolidate G.Stats centralization and load-order rule into ONBOARDING module map; language direction into SIM-PRESENT-BOUNDARY "The decision this came out of"; DECISIONS keeps log lines. ROUTINE.
8. **Evidence:** NE-15; DECISIONS lines cited. Medium-high (ONBOARDING not read in full).
9. **Validation:** each rule appears in full once; ONBOARDING module list matches dev.html script order (manual check).

### S-05 Move data grammar
1. **Destination:** docs/MOVE-AXIS-SCHEMA.md.
2. **Sources:** MOVE-AXIS-SCHEMA.md; DECISIONS 2026-10-24 (per-move JSON shape, pierce scope, hitPolicy, reposition), 2026-10-25 slice 1 (pierce semantics, kind removed, spread, spikes, schema additions), 2026-10-25 slice 2 prep (file roles, derived cd); review 9.1 Q1, Q4, Q7, Q12, Q13, Q16, Q17, 9.2 persistent flag, stat key map C8, 9.3 F1, F3, 9.6; combat-validation 2.4 validator rules; js/data/move-attributes.js (the grammar in code).
3. **Unique requirements absent from MOVE-AXIS-SCHEMA (to verify per field):** per-move JSON shape rule (top level = raw-source lifts only; omit derivable fields) (DECISIONS:12); "dashes default pierce 0" (DECISIONS:13); Q4 stat defaults duration 6 and maxStacks 6 (grep finds maxStacks once); Q16 instance cap 8 for placed objects; Q17 `delivery.delay`; Q12 critChance in percent points; C8 stat key mapping; persistent flag validator rule ("persistent forbids cd and requires endOn notActive"); file roles and "described.json is the single source of move facts". 9.6 says some were written into the grammar comment and the schema doc; a field-by-field check is part of batch B3.
4. **Conflicts:** NE-04 (legacy bridge line still in the schema doc). NE-05 (Quick Attack example). SG-08 pierce (consistent, already reconciled in the schema doc).
5. **Duplication:** hitPolicy and reposition grammar in DECISIONS:14-15, MOVE-AXIS-SCHEMA, combat-architecture R1/R2/D27, move-attributes.js (F-008).
6. **Historical value:** why "return to current position" was rejected (DECISIONS:15); why hitCap was removed.
7. **Disposition:** consolidate; DECISIONS move-grammar entries become log lines; review 9 grammar rows marked "absorbed into MOVE-AXIS-SCHEMA <section>". OWNER_CONFIRMATION (QA-05) for timing; content ROUTINE.
8. **Evidence:** F-005, F-008, NE-04, NE-05; MOVE-AXIS-SCHEMA.md:8, :54, :75-76, :288-296. Medium (not every field compared).
9. **Validation:** every field and enum in move-attributes.js has a matching definition in MOVE-AXIS-SCHEMA (scripted key list comparison, then human review of meaning); no grammar rule remains only in DECISIONS or review 9; MOVE-AXIS-SCHEMA header has no "not yet implemented".

### S-06 Move runtime pipeline (new combat path)
1. **Destination:** docs/current feature planning/combat-architecture.md.
2. **Sources:** combat-architecture.md A to G; review 9.1 Q2, Q3, Q5, Q8, Q10, Q14; 9.2 slice 3b geometry and 3c sim core rulings (S1 to S10, timing); 9.3 F2, F5, F6; 9.8 root and enemy movement; 9.9 S1 to S15; DECISIONS 2026-10-26 normalization removed; DECISIONS 2026-10-27 4c entries (deep-freeze first, landing point, i-frames, mvRoot, pierce resets per leg, aimTrack sticky rule); slice-4c.md; the 4c handoffs; slice-overview "Decisions that span slices".
3. **Unique requirements absent from the architecture doc:** all 9.2 slice 3b/3c rulings (apex rule D18 amendment, lens placement, S1 to S10, timing tolerance); 9.8 root phases and pushes; 9.9 chain rules (fresh-first hop order S15, x(1 - hopReduction)^k last); 4c-2 and 4c-3 rulings. The architecture doc was written before these and says "Nothing here is built".
4. **Conflicts:** NE-03 accuracy; SG-06 normalization chain; NE-06 items still listed open; F5 refined.
5. **Duplication:** invariants I1 to I10 restated in slice-overview (one line each, acceptable as an index if marked "summary, canonical in architecture A"); 4c decisions in DECISIONS.md and slice-4c.md and STATE.md.
6. **Historical value:** checkpoint reasoning in architecture section F suggestions, review sections 1 to 8.
7. **Disposition:** consolidate; slice files keep plan and scope and point to architecture sections for rules; review 9 to history with "absorbed" pointers. OWNER_CONFIRMATION (QA-05, QA-07).
8. **Evidence:** F-005, F-007, EC-04, EC-05, NE-03, NE-06. Medium-high.
9. **Validation:** a per-decision ledger (every row of review 9.1 to 9.9, every DECISIONS move entry, every slice-4c decision) has a destination section and a reviewer tick; no row ends in two homes; the D-table "source" column shows Approved or Proposed tags, not "PROPOSED placement" leftovers.

### S-07 Per-move intended behavior
1. **Destination:** combat-validation-and-handoff.md re-roled as "Move intent and validation" with one per-move table (QA-04). Alternative: an appendix of MOVE-AXIS-SCHEMA.md.
2. **Sources:** review 9.5 (28 NEEDS REVIEW moves), review sections 1 to 8 (per-move audit), combat-validation 2.3 and 2.5 (worked scenarios), DECISIONS 2026-10-27 (Psychic, Aura Sphere, Bonemerang, Rock Slide, Night Shade, Quick Attack), slice-4b.md S1 to S15, slice-4c.md, described.json (data).
3. **Unique requirements:** per-move rulings that are not grammar and not engine rules (Psychic stays a filled growing wedge; Bonemerang return pull clamped at the caster's edge; Rock Slide one boulder; Substitute 4 s shield and 12 s cd; Night Shade flat level damage). Today they exist only in decision lists.
4. **Conflicts:** NE-06 (open vs decided); Gust per-shot spread genuinely open; Fire Spin legacy strip (SG-02).
5. **Duplication:** the same per-move ruling in DECISIONS, slice file, STATE.md, review 9.5.
6. **Historical value:** review 1 to 8 audit rationale.
7. **Disposition:** consolidate into one table (move id, intended behavior, rule IDs used, tag, open question). OWNER_CONFIRMATION (QA-04).
8. **Evidence:** NE-06. Medium.
9. **Validation:** each of the 63 described moves has at most one row; every per-move ruling found in the sources maps to a row; open items appear once with `[Open]`.

### S-08 Move-schema decision records (the "register" question)
1. **Destination:** none as a separate register. Rules go to S-05, S-06, S-07; DECISIONS.md keeps dated log lines; review section 9 becomes history.
2. **Sources:** review section 9; DECISIONS.md:280-320; slice-overview.md:24; combat-validation 3.6; slice-7.md:6 (planned merge); slice-4b.md, slice-4c.md decision sections.
3. **Unique requirements:** see S-05 to S-07.
4. **Conflicts:** F-007; EC-05.
5. **Duplication:** 4c decisions in three places.
6. **Historical value:** section 9's labels (DECIDED, PROPOSED, DEFAULT ACCEPTED) record how each item was settled; keep verbatim in history.
7. **Disposition:** supersedes Phase 3 OD-06. Interim (time-sensitive, ROUTINE): slice-overview.md:24 says "decisions from 4c on are in DECISIONS.md and slice-4c.md" until batch B3 lands. Then absorb (QA-05).
8. **Evidence:** F-007, EC-05. High.
9. **Validation:** after B3, a search for "single source" in docs/ returns only canonical spec headers; slice-overview points to specs, not to a register.

### S-09 Combat math: stats, HP, damage, type chart, crit
1. **Destination:** docs/COMBAT-RULES.md (new, QA-03).
2. **Sources:** DECISIONS 2026-10-17 Base-stats model (Speed identity), HP/damage scalars orthogonal, Damage model, Naked layer upgrade-dependent, Enemy HP model (first part), IV/EV deferred; 2026-10-18 Swap rule (cooldowns); docs/stat-model-design-notes.md (analysis, section 4 locked list); BALANCE.md (values); combat-architecture.md D6 to D11; GDD.md section 3 and 4.2; archive fix/attack-calc entries (cd formula BETA), Status Slice D closed (crit rules); docs/SPEED-IVEV-SLICE.md (unbuilt design); js/core/stats.js, js/data/types.js (implemented).
3. **Unique requirements:** "naked base-stat layer is intentionally upgrade-dependent; do not flatten" (DECISIONS only); "move Power is a damage-side term; HP never re-solved for a power migration" (DECISIONS only); Speed identity and transfer bounds 0.25x to 2.0x; crit rules "no base chance, +3% per card level, x1.5" (archive only); swap rule (independent cooldowns, 0.4 s hold) (DECISIONS only); "floor of 1 damage" and "immunity vs floor" open (stat-model only).
4. **Conflicts:** NE-02 DMG_SCALAR value; NE-09 type chart intended vs implemented; NE-17 IV/EV wording.
5. **Duplication:** damage formula in DECISIONS:197-207, combat-architecture D6/D7, stat-model section 2; HP formula in DECISIONS:227 and BALANCE.
6. **Historical value:** stat-model analysis tables; reasoning for orthogonal dials.
7. **Disposition:** create COMBAT-RULES.md; values point to code plus BALANCE final-state lines (Phase 3 R5); D6 to D11 in combat-architecture cite COMBAT-RULES instead of restating (keep only move-path specifics such as basePower in D5); stat-model notes become history. OWNER_CONFIRMATION (QA-03, QA-12).
8. **Evidence:** F-009, NE-02, NE-09, NE-17. Medium (archive crit and fix/attack-calc entries read by heading only).
9. **Validation:** COMBAT-RULES formulas checked line by line against js/core/stats.js and js/data/types.js by a reviewer; every number in COMBAT-RULES is either labelled "current value, see code" or matches code; no other live doc states the damage formula in full.

### S-10 Status effects and stat stages
1. **Destination:** docs/COMBAT-RULES.md (status and stages sections).
2. **Sources:** archive Status Slice C (:472), D1 (:456), D2 flinch (:448), D3 drain (:433), D closed (:393), E1 (:379), E2a (:364), E2b/d/e (:354), slice A/B (:569, :579), DoT on base HP (:526); BOSS-REWORK.md 3c; docs/BUFF-TABLE.md (authoring sheet); BALANCE.md status, flinch, stage sections; move schema Q4, Q5, Q9, Q10, Q14, 9.8; js/systems/status.js, stages.js, move-effects.js.
3. **Unique requirements:** nearly all of it is unique to the archive: one shared status engine for every host; one major status at a time; 25% duration plus 10 s no-reapply window on bosses, elites, gym leaders; per-status numbers; player shake-off; stage scope (raises team-wide, drops per Pokemon); stage ladders; grace 0.1 s; benched ticking; DoT on base HP (also in BOSS-REWORK 3c).
4. **Conflicts:** SG-01 trap chain (NE-07); SG-02 Fire Spin chain; SG-03 stage ladder layers (NE-08); E1 "hard CC on the player: every timer full" vs Slice C "the player: freeze and sleep last 25%" (E1 is later and says so for the player; needs the consolidated rule to state E1).
5. **Duplication:** DoT on base HP in archive and BOSS-REWORK 3c; stage multipliers in BOSS-REWORK 3c (stale) and BUFF-TABLE.
6. **Historical value:** why no blanket boss immunity; why crit stages were dropped; Agility "nuts" feel test.
7. **Disposition:** extract into COMBAT-RULES with `[Approved]` for archive rulings (after QA-07), `[Approved, flag only]` for new-path rules, `[Legacy behavior]` where the live path differs; BOSS-REWORK 3c replaced by a pointer; BUFF-TABLE stays as the authoring data sheet and cites COMBAT-RULES. OWNER_DECISION for Fire Spin (QA-10), confirmation for trap and stages (QA-10, QA-11).
8. **Evidence:** NE-01, NE-07, NE-08. Medium (archive entries read in part; D2, D3, A, B by heading).
9. **Validation:** each archive status entry listed in the ledger with its destination; reviewer checks status.js and stages.js constants against COMBAT-RULES numbers; BUFF-TABLE and BOSS-REWORK cite COMBAT-RULES, not the archive.

### S-11 Run progression, level curve and difficulty
1. **Destination:** BOSS-REWORK.md (as the progression and encounters spec), section 1 and 4.
2. **Sources:** BOSS-REWORK 1, 3, 4, 7; DECISIONS 2026-10-17 Enemy HP model second part (two-phase difficulty); DECISIONS 2026-10-22 gym gate escalation; docs/FULL-GAME-STRUCT.md (loops, checkpoints, legendaries, tiers, Arceus superboss); docs/GYM-ROSTERS.md rules (six loops, level across loops); archive XP curve (:224), Opening pacing (:5), Region-select (archived heading, TODO backlog); BALANCE XP curve, run opening, escalation; GDD 4 and 7; js/core/stats.js:52 levelForTime.
3. **Unique requirements:** FULL-GAME-STRUCT checkpoints per loop, legendary unlock, shiny tiers, game tiers, Arceus inheritor (no other source); escalation (DECISIONS only, NE-13); XP curve rulings (archive only).
4. **Conflicts:** NEW-01 (two-phase difficulty after a removed 30-minute boss); F-004 (difficulty per loop); "no ramp on repeat clears" vs Keep Going "multipliers go up each loop" vs "gym level rises across loops" (GYM-ROSTERS).
5. **Duplication:** L1 to L50 linear curve in DECISIONS:234-236 and BOSS-REWORK:18 (agree).
6. **Historical value:** two-phase idea and DDA rationale (if superseded).
7. **Disposition:** OWNER_DECISION_REQUIRED (QA-08) before consolidation of post-30:00 and loop rules; the L1 to L50 curve and escalation are ROUTINE.
8. **Evidence:** NEW-01, EC-02, F-004, NE-13. Medium.
9. **Validation:** exactly one statement of the level curve (with the post-30:00 and post-region branches); every loop-related rule in GYM-ROSTERS points to BOSS-REWORK; no live document describes a 30-minute boss.

### S-12 Encounters: gyms, elites, Elite Four, removed bosses
1. **Destination:** BOSS-REWORK.md sections 2 to 4 (spec), docs/GYM-ROSTERS.md (per-leader data), docs/BOSS-AUTHORING.md (authoring format and validation).
2. **Sources:** BOSS-REWORK; GYM-ROSTERS (its 80-line "Rules that apply to every roster"); BOSS-AUTHORING; DECISIONS 2026-10-19 badge boosts; DECISIONS 2026-10-22 escalation; archive boss rework (:503), run flow (:531), gym timing (:542), elites locked (:547), elites built (:495); BALANCE elites and gyms; docs/ASCII Concept Maps/Gym Flow.txt; GDD 4.0, 5 (bosses); js/systems/gym.js, elites.js, js/data/gyms.js.
3. **Unique requirements:** badge rules (DECISIONS only: Boulder +10% Attack, no leader XP, leaders move at species speed); escalation (DECISIONS only); stage-threshold convention (GYM-ROSTERS only).
4. **Conflicts:** F-002 section status labels; F-025 elite cadence placeholder; NE-14; SG-15 move dependency.
5. **Duplication:** ALL AT ONCE rule in BOSS-REWORK 3e and GYM-ROSTERS rules (near-verbatim); arena reuse of rift flow in BOSS-REWORK and Gym Flow.txt.
6. **Historical value:** BOSS-REWORK change log and code touch points; the Option A timing debate.
7. **Disposition:** consolidate; GYM-ROSTERS rules section shrinks to a pointer plus roster-only conventions; change log to history; tracker role removed (QA-06). ROUTINE for duplication, OWNER_CONFIRMATION for section status.
8. **Evidence:** F-001 to F-004, F-025, NE-13, NE-14. Medium.
9. **Validation:** each encounter rule appears once; BOSS-REWORK contains no "DRAFT" or "OPEN" heading whose content is resolved elsewhere in the same file.

### S-13 Enemies (wild spawning, behavior, cap)
1. **Destination:** GDD.md section 5 rewritten as the canonical enemy summary (QA-02); detailed numbers in BALANCE.md and code.
2. **Sources:** GDD 5 and 5.1 (upstream personalities); archive enemy taxonomy, stat-derived behavior, cast composition, spacing bands, enemy attacks behavior-driven (headings at DECISIONS.md:41-55); docs/proposals/enemy-behavior-game-proposal.md, support-contact-flanker, logger-and-spacing-bands (applied); BALANCE enemies; TODO tune/damage carry-overs; js/systems/spawner.js, js/data/enemies.js, enemy-classes.js.
3. **Unique requirements:** fork enemy model lives in the archive and applied proposals only.
4. **Conflicts:** NE-11 cap 280 vs 64; NE-16 cast 7 vs 9 per tier; personalities table vs stat-derived classes (not checked).
5. **Duplication:** unknown until the archive content is read.
6. **Historical value:** proposals as applied records (F-011).
7. **Disposition:** DEFERRED for content (evidence gap: archive enemy entries and proposals not read beyond headings); the GDD rewrite must not copy section 5 forward unverified.
8. **Evidence:** NE-11, NE-16. Low.
9. **Validation:** a reviewer checks every number in the rewritten section against spawner.js and enemies.js.

### S-14 Items, economy and meta progression
1. **Destination:** GDD.md section 7 (economy, upgrades, items, gacha, tickets), rewritten (QA-02). docs/RUN-ITEM-THINK-DOC.md stays the run-item brainstorm (reference, its section 2 specs absorbed).
2. **Sources:** GDD 7.x; archive item rework entries (:329 to :428); DECISIONS 2026-10-20 Gacha tickets are Pokeballs and Master Balls, No external links; RUN-ITEM-THINK-DOC; TODO "Item rework" and type-chart held items; BALANCE drops/economy; FEATURES_GRAB.md (parked port plan).
3. **Unique requirements:** item tiers, holder rules ("held effects only while the holder is active"), stat items use a separate multiplier, Stones ignore resistance and immunity (archive only).
4. **Conflicts:** GDD 7.2a one item per run vs three-tier model (archive says it supersedes); x10 ticket sources (NE-11).
5. **Duplication:** run item specs in archive and RUN-ITEM-THINK-DOC section 2.
6. **Historical value:** superseded one-item model.
7. **Disposition:** consolidate into GDD 7 after QA-02; ticket source is a documentation gap to fill from code (ROUTINE research), not a design decision.
8. **Evidence:** NE-01, NE-11. Medium-low (item entries read in part).
9. **Validation:** GDD 7 matches js/data/items.js tiers and drop sources (reviewer check).

### S-15 Upgrades, level-up cards and Bond
1. **Destination:** GDD.md section 7.2 and a level-up subsection; move-path card rules in combat-architecture D4 and slice-5 until slice 5 lands.
2. **Sources:** archive upgrade rework slices 1 to 2d (headings DECISIONS.md:63-68); docs/proposals/upgrade-slice*.md (applied); GDD 7.2, 7.2c; TODO Bond rework, upgrade follow-ups; slice-5.md; combat-architecture D4.
3. **Unique requirements:** not determined (evidence gap).
4. **Conflicts:** GDD 7.2 permanent per-Pokemon upgrades list not checked against code.
5. **Duplication:** unknown.
6. **Historical value:** applied proposals.
7. **Disposition:** DEFERRED (content audit needed before consolidation).
8. **Evidence:** headings only. Low.
9. **Validation:** as S-13.

### S-16 Deferred cloud and multiplayer
- **Destination:** unchanged reference (docs/FIREBASE.md, docs/TURN.md, docs/MP-PARKED-NOTES.md); local-first rule canonical in CLAUDE.md. MP-relevant rulings in DECISIONS (density north star MP sizing, language split server choice, escalation "deferred cloud/MP") stay as log lines. Disposition: retain as reference; no consolidation (out of scope by the local-first rule). Validation: no live spec restates MP design; each MP hook is a one-line `[Deferred]` note in the owning spec.

### S-17 Parked designs and analyses
- **Sources:** docs/BULLET-TIME-DESIGN.md (two owner DECISIONS inside: run clock stays real-time, solo only), docs/SPEED-IVEV-SLICE.md, docs/PERF-HOTPATH-NOTES.md (FG1 to FG4 "approved-pending"), docs/RUN-ITEM-THINK-DOC.md, FEATURES_GRAB.md.
- **Unique requirements:** the two bullet-time owner rulings and PERF "explicitly NOT doing (vision-protecting)" are rulings inside parked docs. They stay with the parked design (it is the only consumer), tagged `[Approved, not built]`; the owning spec (COMBAT-RULES for speed, ONBOARDING for perf) carries a one-line pointer.
- **Disposition:** retain as proposals with a role header (Phase 3 OD-11). DEFERRED.
- **Validation:** each file has a role line; no parked doc is cited as a current rule by a spec.

### S-18 History and archives
- **Sources:** docs/DECISIONS-archive.md, docs/DEVLOG-archive.md, docs/TODO-archive.md, DEVLOG.md, docs/proposals/ (applied), review sections 1 to 8 (and 9 after B3), stat-model-design-notes.md (after B4), BOSS-REWORK change log (after B5), GDD decision log, redirect stubs.
- **Disposition:** history, but only after extraction (NE-01). The archive gets a header: "Historical. Current rules are in the canonical specs listed in CONTEXT.md; entries here explain why." Superseded live entries are appended verbatim with a one-line "Current rule: <path section>" header (no chains).
- **Validation:** no live document cites the archive as the source of a current rule; the ledger has no "archive only" rows left.

### S-19 Data sources and generated reports
- **Sources:** docs/move_rework_holding/move-conversions-described.json (declared single source of move facts, DECISIONS.md:281), pokeapi-master/ (mainline data), move-coverage-report.md and move-parity-report.md (generated), docs/proposals/*-harness.js (verification evidence).
- **Gap:** the canonical move database sits in a folder named "holding" that CLAUDE.md and CONTEXT.md tell agents to normally skip ("large staged datasets under docs/move_rework_holding/"). CLAUDE.md allows opening it when the task requires it, so this is a clarity issue, not a contradiction (SG-22).
- **Disposition:** MOVE-AXIS-SCHEMA "File roles" names the database path explicitly; CLAUDE.md skip list notes the one exception. ROUTINE. Moving the file is code-affecting (tools/export_moves.js reads it) and out of scope.

---

## 5. Cross-system contracts

Each contract needs one owning section that both sides cite.

| ID | Contract | Consumers | Proposed owner | Gap |
|---|---|---|---|---|
| C-01 | Stat stage store and multipliers (G.Stages: ladders, scope, durations, caps) | legacy buff moves, move-schema riders (move-effects.js:117-119), gym leader Harden, status SLOW | COMBAT-RULES stages section | four layered descriptions (SG-03) |
| C-02 | Status engine (G.Status: major status rule, durations, boss 25% rule, immunities, fizzle) | wild enemies, elites, gym leaders, player, move-schema riders | COMBAT-RULES status section | rules only in archive |
| C-03 | Gym and enemy use of move definitions (catalog, boss forms, cast power, cooldown) | gyms.js, enemy.js gym AI, slice 7 | BOSS-REWORK 3a, citing MOVE-AXIS-SCHEMA | no definition after slice 7 (SG-15) |
| C-04 | Level curve and escalation bump (levelForTime pure; escBump read at two sites) | spawner/enemy, gym.js, HUD | BOSS-REWORK section 1 | escalation only in DECISIONS (NE-13) |
| C-05 | Damage halves (attacker at cast, defender at impact; DMG_SCALAR; STAB; type) | legacy combat.js, move-effects.js (copied defender helpers until slice 7, 9.2 S7) | COMBAT-RULES damage section; combat-architecture D6 to D11 cite it | three statements (S-09) |
| C-06 | Sim/present event boundary (SimBus plain-data events) | move-sim, move-render, future server | SIM-PRESENT-BOUNDARY (general), combat-architecture I8 (move-specific) | consistent; needs explicit "general rule lives in" line |

---

## 6. Semantic gaps

Type key: **OLD** older document holds a requirement missing from the canonical candidate; **CHG** a later document changed a rule without saying whether other old rules remain; **SCOPE** different scopes need explicit boundaries; **IvI** apparent conflict is intended vs implemented; **UNDEF** referenced requirement with no authoritative definition; **RAT** rationale worth keeping, old document should stop governing; **AMB** too ambiguous to consolidate safely.

| ID | Type | Gap | Recommended resolution | Class |
|---|---|---|---|---|
| SG-01 | CHG, IvI | Trap on enemies: Slice C, then E1 (no trap on enemies), then Q5 (2 s root, new path only) | COMBAT-RULES: Q5 rule `[Approved, flag only]`; E1 rule `[Legacy behavior]` until slice 7; Slice C to history | OWNER_CONFIRMATION (QA-10) |
| SG-02 | CHG, AMB | Fire Spin: trap (C), then strip stages plus half burn (E1), then persistent damage move (schema); review 9.7 asks whether strip and half burn are dropped on purpose | Owner answer needed | OWNER_DECISION_REQUIRED (QA-10) |
| SG-03 | CHG, SCOPE | Stage multipliers and caps in four layers (NE-08) | E2a ladder is the multiplier rule for every host; Q4/9.8 maxStacks is a per-move application cap layered on it; BOSS-REWORK 3c table and D1 to history. Code supports layering (G.Stages.add takes maxStacks). | OWNER_CONFIRMATION (QA-11) |
| SG-04 | CHG | Accuracy pass-through vs folded into basePower (NE-03) | Q6 is current (later, applied in 3a, code agrees). Log line for 2026-10-26 entry notes the accuracy clause was replaced. | ROUTINE (subject to QA-07 ratification) |
| SG-05 | CHG | Legacy kind bridge still described in MOVE-AXIS-SCHEMA:8 and DECISIONS slice 1 (NE-04) | Remove from schema doc; log points to "no bridge" rule | ROUTINE |
| SG-06 | CHG, SCOPE | Normalization: three DECISIONS entries; BOSS-REWORK 3a says gym casts use per-cast normalization (legacy path) | combat-architecture states "no normalization on the new path; revisited in slice 6 by simulator evidence" once; the two superseded entries go to archive; gym part moves to C-03 | ROUTINE for move path; gym part in QA-13 |
| SG-07 | CHG | Quick Attack returnHits (NE-05) | Per-move table states Q3 plus 4c-2 rule; DECISIONS 2026-10-24 example line archived | ROUTINE |
| SG-08 | none | Pierce wording in DECISIONS 10-24 vs 10-25; schema doc already reconciled | Log only | ROUTINE |
| SG-09 | CHG | Items listed open in review 9.5/9.7 but decided later (NE-06) | Absorb the later decision; review 9 frozen as history | ROUTINE |
| SG-10 | IvI | DMG_SCALAR 2.0 in three DECISIONS entries vs 1.0 in code and BALANCE (NE-02, F-009) | COMBAT-RULES names the dial and its principle, value "see stats.js; history in BALANCE"; the three entries become log lines | ROUTINE |
| SG-11 | IvI, AMB | Type chart: softened implemented, mainline "locked" in an analysis note, "on hold" in TODO and BOSS-REWORK (NE-09) | COMBAT-RULES: current = softened `[Approved]`; mainline chart `[Proposed, on hold]` with its prerequisites (immunity vs floor, boss-immunity rule) | OWNER_CONFIRMATION (QA-12) |
| SG-12 | CHG, AMB | Post-30:00 and post-region difficulty: two-phase choice, slow ramp, Keep Going multipliers, six loops "no ramp on repeat clears", gym level rising across loops | One owner answer, then a single rule in BOSS-REWORK 1/4 | OWNER_DECISION_REQUIRED (QA-08) |
| SG-13 | OLD | Escalation missing from the boss/gym spec (NE-13) | Absorb into BOSS-REWORK 3 with the "locked base plus bump read once" wording | ROUTINE |
| SG-14 | CHG | BOSS-REWORK 2 open vs 7 resolved (NE-14); F-002 headings | Spec states resolved rules; open index lists only open items | ROUTINE |
| SG-15 | UNDEF | Gym and enemy use of moves after slice 7 (NE-10) | Record as `[Open]` in BOSS-REWORK 3a and slice-7.md now; decide when slice 7 is planned | OWNER_DECISION_REQUIRED, may defer (QA-13) |
| SG-16 | OLD | Active rules only in the archive (NE-01) | Extract before treating the archive as history (B4, B5, B6) | ROUTINE (large) |
| SG-17 | OLD, CHG | GDD stale in many sections (NE-11) | Rewrite as umbrella (QA-02) | OWNER_DECISION_REQUIRED (QA-02) |
| SG-18 | SCOPE | Crit: card crit rules (archive D closed) vs per-move critChance (Q12, D10) | COMBAT-RULES states both sources and how they add (D10 already does); no conflict | ROUTINE |
| SG-19 | RAT | stat-model-design-notes: locked list duplicated and partly stale (NE-17) | Absorb locked items into COMBAT-RULES; notes become analysis history | ROUTINE |
| SG-20 | SCOPE | Cooldown formula for damaging moves vs hand-tuned status moves (BOSS-REWORK 3c "cooldown fact"; combat-architecture D2) | One statement in combat-architecture D2 (new path) and COMBAT-RULES (legacy, until slice 7) | ROUTINE |
| SG-21 | CHG | Agent rules in six documents, F-012 | S-01 disposition | OWNER_CONFIRMATION (QA-15) |
| SG-22 | AMB | Canonical move DB in a "holding" folder agents normally skip | Explicit exception line and file-roles entry | ROUTINE |
| SG-23 | UNDEF | Deleted documents still cited (NE-12) | Remove or repoint citations | ROUTINE |
| SG-24 | AMB | Approval provenance: Q1 to Q17 answers never committed (EC-01), sign-offs only in AI prose (F-006, F-010) | Ratify in bulk so tags can say Approved | OWNER_DECISION_REQUIRED (QA-07) |
| SG-25 | AMB | Enemies, upgrades: fork rules in archive and applied proposals not yet read; GDD 7 vs 9 per tier (NE-16) | Content audit before consolidation | DEFERRED (QA-14) |
| SG-26 | OLD | Coding rules found only in DECISIONS: G.UI.ask, G.Stats centralization, client stays JS | Into CLAUDE.md (coding conventions) or ONBOARDING | ROUTINE (QA-15 places them) |

---

## 7. Validation of this map

- Every inventory path belongs to at least one subject: S-01 (G01 to G04, G40), S-02 (G05, G10, G11, G21), S-03 (G18 to G20), S-04 (G16, G18, G31, G35 perf), S-05 to S-08 (G22 to G30), S-09 and S-10 (G09, G34, G35 speed), S-11 and S-12 (G12 to G16), S-13 to S-15 (G17, G32, G33, G36), S-16 (G37), S-17 (G35, G36), S-18 (G07, G08, G29, G32, G33), S-19 (G30), A0 files (G39, X01) unchanged. Groups follow phase-3-document-map.json.
- All cited paths exist at e2acd82 except the two reported as missing in NE-12 (checked with a file test).
- Line numbers for DECISIONS.md, the archive headings, review section 9, BOSS-REWORK.md, MOVE-AXIS-SCHEMA.md, GDD.md, move-resolver.js, move-effects.js, types.js, spawner.js, gyms.js and enemy.js were read directly in this phase.
- Not verified: field-by-field grammar parity (S-05 item 3), archive enemy, upgrade and item entries beyond headings or partial reads, ONBOARDING in full, the board, and any harness execution.
