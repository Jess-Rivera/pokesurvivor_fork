# Decision conflicts (Phase 2)

Generated from decision-conflicts.json (the source of truth). Baseline: branch chore/documentation-authority-audit at e2acd82. Facts, interpretations and recommendations are labelled separately. No canonical document is designated here.

| ID | Priority | Classification | Subsystem | Decision |
|---|---|---|---|---|
| F-001 | P1 | POSSIBLE_SUPERSESSION | Boss / rift / gym design | Which document governs bosses, rifts, gyms and the 30:00 endgame: GDD.md or BOSS-REWORK.md |
| F-007 | P1 | MISSING_AUTHORITY | Move schema | Which document is the decision register for move-schema decisions |
| F-002 | P2 | STATUS_AMBIGUITY | Boss / rift / gym design | Approval status of the gym framework and boss authoring schema |
| F-003 | P2 | STATUS_AMBIGUITY | Startup context / trackers | Which tracker is the active branch tracker |
| F-004 | P2 | POSSIBLE_SUPERSESSION | Region loops / difficulty progression | Whether difficulty multipliers rise on each loop or repeat clear |
| F-005 | P2 | STATUS_AMBIGUITY | Move schema | Approval and implementation status of MOVE-AXIS-SCHEMA and combat-architecture |
| F-006 | P2 | MISSING_AUTHORITY | Move schema | Provenance of the Checkpoint 1 DECIDED labels (Q1 to Q17) |
| F-009 | P2 | IMPLEMENTATION_DISCREPANCY | Balance / damage | Value of the player damage dial DMG_SCALAR |
| F-010 | P2 | STATUS_AMBIGUITY | Move schema slices | Sign-off state of slices 4a and 4b |
| F-012 | P2 | DIRECT_CONTRADICTION | Agent workflow rules | Whether the assistant may run read-only git commands |
| F-013 | P2 | MISSING_AUTHORITY | Agent workflow rules | Commit attribution trailers |
| F-017 | P2 | POSSIBLE_SUPERSESSION | Build / run / publish | How the game is run locally and whether a build is required |
| F-021 | P2 | MISSING_AUTHORITY | Repository hygiene | Whether CREDITS.md contact data is exempt from the 'no third-party contacts in the public repo' policy |
| F-008 | P3 | DUPLICATED_REQUIREMENT | Move schema | hitPolicy, reposition and return-leg rules |
| F-011 | P3 | HISTORICAL_DIFFERENCE | Implementation records | Whether proposal documents are pending specs or applied records |
| F-014 | P3 | MISSING_AUTHORITY | Agent workflow rules | Precedence among CLAUDE.md, CONTEXT.md, DECISIONS.md and ORIGINAL-OWNER-RULES.md |
| F-015 | P3 | HISTORICAL_DIFFERENCE | Work tracking | Source of truth for issue and board status |
| F-016 | P3 | HISTORICAL_DIFFERENCE | Startup context | Accuracy of STATE.md git-state lines |
| F-018 | P3 | DIRECT_CONTRADICTION | Build / run / publish | Publishing on GitHub Pages |
| F-019 | P3 | HISTORICAL_DIFFERENCE | Build / run / publish | Where the SEO generator lives |
| F-020 | P3 | MISSING_AUTHORITY | Documentation style | Scope of the 'no em-dashes anywhere' rule |
| F-022 | P3 | REFERENCE_DEFECT | Startup context | Skip-list folder name |
| F-023 | P3 | HISTORICAL_DIFFERENCE | Documentation maintenance | DEVLOG archive header |
| F-024 | P3 | MISSING_AUTHORITY | Documentation maintenance | Authority and status of unreferenced documents |
| F-025 | P3 | IMPLEMENTATION_DISCREPANCY | Boss / rift / gym design | Elite spawn cadence |

## Boss / rift / gym design

### F-001 (P1, POSSIBLE_SUPERSESSION) Which document governs bosses, rifts, gyms and the 30:00 endgame: GDD.md or BOSS-REWORK.md
Also: IMPLEMENTATION_DISCREPANCY, MISSING_AUTHORITY. Queue item: PQ-01.

Priority rationale: CLAUDE.md lists GDD.md as an authoritative reference and GDD declares itself the 'current' state, yet its rift, five-timed-boss and Arceus Judgment sections describe systems the locked boss rework replaces and the code has switched off. An agent grounding work in GDD would plan or rebuild the wrong boss/gym architecture. Not P0: the code already matches BOSS-REWORK, so a wrong change would need an explicit instruction to revive the old design.

**Evidence (facts)**
- `GDD.md` (3-4) [historical record (upstream baseline, self-described as current)]: 'Living design document. It reflects the current state of the game'
- `GDD.md` (107-121, 172-177) [historical record]: Rift every 30 s from 1:15 leads to a legendary arena; 5 bosses at minutes 3, 6, 9, 12, 15; legendaries only in rifts
- `BOSS-REWORK.md` (10-16 (section 1, labelled LOCKED)) [approved requirement (self-labelled LOCKED; owner approval is stated in text only)]: Rifts replaced by gym fights; BOSS_SLOTS bosses replaced by overworld elites; Arceus's Judgment at 30:00 removed
- `BOSS-REWORK.md` (section 5 (Cleanup list, DEFERRED)) [proposal (deferred work item)]: 'Mark GLOSSARY entries and update ONBOARDING / GDD'; remove judgment.js, BOSS_SLOTS, bossScale, spawnBoss
- `CLAUDE.md` (Reference material) [approved requirement (agent instruction)]: Lists ONBOARDING.md, GDD.md, GLOSSARY.md as 'authoritative architecture/design/terminology references'

**Implementation and test evidence**
- js/systems/judgment.js:34 `const ENABLED = false;` (Judgment cannot start; start() is gated by ENABLED at :214).
- js/systems/rift.js:27 `const RANDOM_RIFTS = false;` (random rifts off; gym gates reuse the rift flow).
- js/systems/gym.js and js/systems/elites.js exist and are wired (gym.js FIRST_AT=240, GAP=240; elites.js cadence marked TEMP).
- js/data/enemies.js:48 BOSS_SLOTS still defined and used at :230 and :441 (BOSS-REWORK section 5 cleanup not yet done); BOSS-REWORK section 6 says spawnBoss and bossFight were removed from spawner.js.
- Status: documented (BOSS-REWORK) and implemented in part; old systems disabled but not deleted; GDD describes the disabled systems as current.

**Git / approval evidence**
- BOSS-REWORK.md commits 2026-10-19 (00b6104, 48d11c4, f858960 'Close out boss-rework') and 2026-10-22 (3dfeb23). GDD.md last touched 2026-10-18 (upgrade rework commits); no fork-era boss section. A commit shows change, not owner approval.

**Interpretations (tentative)**
- BOSS-REWORK.md governs the boss/gym/elite design and GDD is a stale upstream baseline in those sections; GDD's own cleanup item is tracked in BOSS-REWORK section 5. (confidence: medium-high; basis: BOSS-REWORK section 5 names GDD for update; code disables Judgment and random rifts; DECISIONS archive records the rework as 'Jess + Claude' / 'Jess decided')
- GDD is frozen upstream reference and was never meant to track the fork. (confidence: low (contradicted by GDD's 'living document' and CLAUDE.md's authoritative label); basis: no fork-era GDD sections; GDD last log entries are upstream)

Confidence in classification: high. Confidence in interpretation: medium-high.

**Unresolved**
- Is GDD.md a living fork document, a frozen upstream baseline, or superseded in the boss/rift sections? (Q-05)
- Is BOSS-REWORK.md section 1 approved by the owner as canonical? Approval appears only as in-document labels (LOCKED) and archive entries tagged with Jess's name.

**Recommended next action:** Owner decision: declare GDD's role (update, freeze with a banner, or mark boss/rift sections superseded). Phase 3: do not migrate GDD content into canonical docs until decided.

### F-002 (P2, STATUS_AMBIGUITY) Approval status of the gym framework and boss authoring schema
Queue item: PQ-01.

Priority rationale: Section-level status labels in the gym/boss design docs disagree with their own content and with dependents, so a reader cannot tell which gym rules are locked, draft or built.

**Evidence (facts)**
- `BOSS-REWORK.md` (33 (section 3 heading)) [proposal (label)]: '3. Gyms (DRAFT, not yet discussed in detail)'
- `BOSS-REWORK.md` (subsections 3a, 3d, 3e) [approved requirement (self-labelled)]: 3e 'LOCKED 2026-10-22, Jess' all-at-once multi-mon gyms; 3a 'LOCKED 2026-10-19 rule, boss forms DRAFT'; 3d Brock pilot with RESOLVED items
- `docs/GYM-ROSTERS.md` (3-4) [implementation note]: Describes BOSS-REWORK.md as 'gym framework, locked design'
- `docs/BOSS-AUTHORING.md` (1, 4) [implementation note]: Title '(DRAFT schema)' yet 'Built so far (2026-10-22): ... Brock'

**Implementation and test evidence**
- js/data/gyms.js, js/systems/gym.js exist; gym.js has `loop` (dev-set, comment says the real loop counter does not exist yet) and roster(g) calling G.Gyms.lineup(..., loop, ...). Multi-mon all-at-once is therefore partly built; end-to-end arena behaviour not verified here.

**Git / approval evidence**
- No approval record beyond in-document labels.

**Interpretations (tentative)**
- Section headings were not updated when sub-sections were locked or built (stale labels, not true ambiguity). (confidence: medium; basis: sub-section labels say LOCKED; GYM-ROSTERS treats the framework as locked)

Confidence in classification: high. Confidence in interpretation: medium.

**Unresolved**
- Which BOSS-REWORK sections are LOCKED today? (Q-06)
- Is BOSS-AUTHORING.md still a draft schema or the implemented one?

**Recommended next action:** Owner or Phase 3 reviewer to confirm per-section status; do not infer lock status from section headings.

### F-025 (P3, IMPLEMENTATION_DISCREPANCY) Elite spawn cadence
Queue item: PQ-01.

Priority rationale: A locked design rule (elite cadence tied to gym cycles) differs from the shipped placeholder. The placeholder is deliberate and documented in three places, so the risk is a forgotten removal, not a hidden defect.

**Evidence (facts)**
- `BOSS-REWORK.md` (28 (section 2, LOCKED)) [approved requirement (self-labelled LOCKED)]: First elite at 2:00; each later elite 2:00 after the player returns to the overworld from a gym; one per gym cycle
- `BALANCE.md` (39) [implementation note]: 'Cadence (TEMP): 2:00 then every 6:00.'
- `docs/DECISIONS-archive.md` (496-497 (2026-10-19 Elites BUILT)) [historical record]: 'Temporary cadence until gyms exist: first elite at 2:00, then every 6:00'

**Implementation and test evidence**
- js/systems/elites.js:7-8 and K.first=120, K.every=360 marked TEMP; no reference to G.Gym in elites.js (grep). Gyms now exist (gym.js), so the stated removal condition appears met. Documented as locked; implemented as a placeholder.

**Git / approval evidence**
- Elites built 2026-10-19; Brock pilot gym built the same day (00b6104).

**Interpretations (tentative)**
- Deliberate temporary placeholder awaiting the gym-cycle hook; no tracker item for it was found in TODO.md, STATE.md or BOSS-REWORK.md (grep for 'cadence'). (confidence: medium-high; basis: three documents label it TEMP)

Confidence in classification: high. Confidence in interpretation: medium-high.

**Unresolved**
- Is the gym-cycle cadence scheduled work, and under which tracker item?

**Recommended next action:** Phase 3: note as a known placeholder; ask the owner whether the gym-cycle hook is queued.

## Move schema

### F-007 (P1, MISSING_AUTHORITY) Which document is the decision register for move-schema decisions
Also: DUPLICATED_REQUIREMENT. Queue item: PQ-02.

Priority rationale: Two registers each claim to be the authority for move-schema decisions. Newer decisions (slice 4c) were recorded in DECISIONS.md and slice-4c.md, not in review section 9 that slice-overview tells readers to treat as the single source, so a reader following the declared source misses current decisions that drive upcoming implementation.

**Evidence (facts)**
- `DECISIONS.md` (3-7) [approved requirement (declared authority, scope: vs archives)]: Standing rulings; 'Once something is here, treat it as settled'; this file wins over archives
- `docs/current feature planning/move-consistency-review.md` (5, 641) [approved requirement (declared authority)]: 'Section 9 is the single source for every decision and open item since (Checkpoints 2 and 3)'
- `docs/current feature planning/move-schema/slice-overview.md` (24) [approved requirement (declared authority)]: 'Every decision and its status: move-consistency-review.md section 9. Do not restate them here.'
- `DECISIONS.md` (307-320) [approved requirement ('Jess' tagged)]: Entries dated 2026-10-27 for slices 4c, 4c-2, 4c-3 (e.g. 'Psychic stays a filled growing wedge') plus 2026-10-26 slice-2 plan entries
- `docs/current feature planning/move-schema/slice-7.md` (6) [proposal]: Plans to 'move the Checkpoint 1 to 3 decisions into DECISIONS.md'

**Implementation and test evidence**
- Search for 'Psychic stays' / 'growing wedge' finds it in DECISIONS.md:309 and slice-4c.md:14 but not in review section 9 (grep). So the split is real, not hypothetical.

**Git / approval evidence**
- e2acd82 (2026-10-27) added the 4c decisions to DECISIONS.md and slice-4c.md.

**Interpretations (tentative)**
- Intentional transitional design: section 9 for Checkpoints 1 to 3, DECISIONS.md for later slice decisions, merged at slice 7. (confidence: medium; basis: slice-7.md:6 plan)
- Drift: overview rule 'do not restate' was not updated after DECISIONS.md began receiving move-schema entries. (confidence: medium; basis: no precedence rule between the two; STATE.md says 4c decisions are in slice-4c.md and DECISIONS.md)

Confidence in classification: high. Confidence in interpretation: medium.

**Unresolved**
- Precedence between DECISIONS.md and review section 9 before slice 7 (Q-04).
- Do any decisions exist in both with different values? Only a spot check was made.

**Recommended next action:** Owner to declare precedence. Phase 3: build a per-decision matrix (DECIDED/OPEN) across the three locations before choosing a canonical home.

### F-005 (P2, STATUS_AMBIGUITY) Approval and implementation status of MOVE-AXIS-SCHEMA and combat-architecture
Also: HISTORICAL_DIFFERENCE. Queue item: PQ-02.

Priority rationale: The move-schema spec chain carries three mutually inconsistent status lines (proposal, approved-nothing-built, partly built), so a reader cannot tell what is approved or implemented from the documents alone.

**Evidence (facts)**
- `docs/MOVE-AXIS-SCHEMA.md` (3-4) [proposal]: Updated Oct 24 2026; 'Status: Design proposal; not yet implemented in js/'
- `docs/current feature planning/combat-architecture.md` (3) [approved requirement (self-stated)]: 'Status: APPROVED by Jess 2026-10-26 ... Nothing here is built.'
- `docs/current feature planning/move-consistency-review.md` (section 9 (about 641)) [implementation note]: Describes combat-architecture as 'status PROPOSAL, awaiting Jess's approval'
- `docs/current feature planning/move-schema/slice-overview.md` (4, 38-46) [implementation note]: Architecture APPROVED 2026-10-26; slices 1 to 3d, 4a DONE, 4b BUILT

**Implementation and test evidence**
- js/data/move-attributes.js, move-resolver.js, moves-generated.js, move-overrides.js, move-handler.js and js/systems/move-geom.js, move-sim.js, move-effects.js, move-route.js, move-render.js all exist (slices 3a to 4b). Documented and implemented in part; 'not implemented' and 'nothing is built' are stale. Tests/harnesses not executed in this phase.

**Git / approval evidence**
- Slice commits 1c5bf4c (3a), 6f39eff (3b), 63e7d10 (3c), 997018f (4b) all 2026-10-26/27.

**Interpretations (tentative)**
- Headers are dated snapshots that were never refreshed (architecture approved 2026-10-26, then built); the review's 'PROPOSAL' wording predates the approval that happened the same day. (confidence: medium-high; basis: all three dated within 2026-10-24 to 10-26)

Confidence in classification: high. Confidence in interpretation: medium-high.

**Unresolved**
- Is combat-architecture.md now a design record (built) or the live spec?

**Recommended next action:** Phase 3 to treat the header status lines as unreliable and rely on slice-overview plus code; owner to confirm architecture approval.

### F-006 (P2, MISSING_AUTHORITY) Provenance of the Checkpoint 1 DECIDED labels (Q1 to Q17)
Queue item: PQ-02.

Priority rationale: The only record of Checkpoint 1 owner answers (Q1 to Q17) is a back-fill from the architecture doc, so the primary approval evidence for many schema decisions is not in the repository.

**Evidence (facts)**
- `docs/current feature planning/move-consistency-review.md` (section 9 preamble) [historical record]: 'Caveat: the DECIDED labels for Q1 to Q17 are taken from combat-architecture.md, because the original resolutions text was not in this copy of the review.'

**Git / approval evidence**
- Not investigated further in git; whether an earlier copy under docs/move_rework_holding/ held the resolutions was not checked (the architecture doc cites that older path, which no longer exists).

**Interpretations (tentative)**
- Resolutions were lost when the review moved from docs/move_rework_holding/ to docs/current feature planning/; DECIDED labels reflect the architecture doc's restatement. (confidence: medium; basis: stale path docs/move_rework_holding/move-consistency-review.md cited in combat-architecture.md)

Confidence in classification: medium-high. Confidence in interpretation: medium.

**Unresolved**
- Does an earlier commit contain the original resolutions text?

**Recommended next action:** Phase 3 reviewer: search git history for the original review resolutions before treating Q1 to Q17 as owner-approved; otherwise ask the owner.

### F-008 (P3, DUPLICATED_REQUIREMENT) hitPolicy, reposition and return-leg rules
Queue item: PQ-02.

Priority rationale: Same rules maintained in four places; the spot-checked fields agree, so the risk is future drift only.

**Evidence (facts)**
- `docs/MOVE-AXIS-SCHEMA.md` (32, 74-76, 292) [approved requirement (SETTLED label)]: hitPolicy has exactly three values; repositionMode teleport|swept; returnToOrigin boolean; returnHits out|outAndBack
- `DECISIONS.md` (2026-10-24 entry) [approved requirement]: Same three hitPolicy values and two orthogonal reposition axes
- `docs/current feature planning/combat-architecture.md` (R1, R2, D27) [approved requirement]: Leg-keyed hit records; swept speed = dashMult x owner speed

**Implementation and test evidence**
- js/data/move-attributes.js:73 and :168,175 define repositionMode ['teleport','swept'], returnToOrigin bool, returnHits ['out','outAndBack'], hitPolicy ['oncePerInstance','interval','onReentry']: matches all three documents. Spot check only; pierce defaults and D1 to D37 equations were not compared.

**Interpretations (tentative)**
- No contradiction among the compared fields. (confidence: medium-high; basis: field-by-field comparison)

Confidence in classification: high. Confidence in interpretation: medium-high.

**Unresolved**
- Pierce defaults and the D-table were not compared (large documents).

**Recommended next action:** Phase 3: designate one home for the grammar to avoid drift; no conflict to resolve.

## Agent workflow rules

### F-012 (P2, DIRECT_CONTRADICTION) Whether the assistant may run read-only git commands
Also: POSSIBLE_SUPERSESSION. Queue item: PQ-06.

Priority rationale: Governs what actions an AI agent may take on the repository. The conflict is limited to read-only git commands (the stricter reading is the safe default), so impact is bounded; but DECISIONS.md calls its entries settled and the relaxation is not recorded there.

**Evidence (facts)**
- `DECISIONS.md` (141-142) [approved requirement (decision entry)]: 'The AI assistant never runs git, ever.' (2026-10-17)
- `DECISIONS.md` (73) [approved requirement (decision entry)]: 2026-10-20 workflow update: 'the hard rule that the assistant never runs git' is UNCHANGED
- `CLAUDE.md` (59-61) [approved requirement (agent instruction)]: 'MAY run read-only git commands ... git fetch is also allowed'; anything that changes the repo is FORBIDDEN
- `CONTEXT.md` (37) [approved requirement (agent instruction)]: Same read-only allowance and the same prohibition on mutating commands

**Git / approval evidence**
- `git log -S'read-only git'` shows the allowance first appears in commit 598211b 'Updating markdowns' (2026-10-25); the 'never runs git, ever' text dates to 5332d56 (2026-10-17). No DECISIONS.md entry records the change (grep for 'read-only' in DECISIONS.md and the archive: none). A commit shows a change occurred, not that the owner approved it.

**Interpretations (tentative)**
- CLAUDE.md and CONTEXT.md (2026-10-25) deliberately relax the 2026-10-17/20 rule; both agree that mutating git stays forbidden. (confidence: medium; basis: later date; two docs agree; explicit read-only list)
- DECISIONS.md still governs ('settled, do not relitigate') and the relaxation is an unapproved edit. (confidence: low-medium; basis: DECISIONS.md:3-4 wording; no recorded approval)

Confidence in classification: high (the text claims are incompatible). Confidence in interpretation: medium.

**Unresolved**
- Did the owner approve the 2026-10-25 relaxation? (Q-03)
- Which doc prevails when CLAUDE.md and DECISIONS.md differ?

**Recommended next action:** Owner to confirm; if approved, annotate or supersede the DECISIONS entries. Phase 3 stays within read-only git meanwhile.

### F-013 (P2, MISSING_AUTHORITY) Commit attribution trailers
Queue item: PQ-06.

Priority rationale: Project rule says commits carry no Co-Authored-By or Claude-Session trailer; the current tooling instructions tell the assistant to add such trailers. No document says which governs; a later phase that commits could violate the project rule.

**Evidence (facts)**
- `CLAUDE.md` (69) [approved requirement (agent instruction)]: 'Commit messages carry no Co-Authored-By line and no AI signature of any kind.'
- `DECISIONS.md` (73) [approved requirement (decision entry)]: 'Commit messages carry no Co-Authored-By or Claude-Session trailer lines.'
- `docs/ORIGINAL-OWNER-RULES.md` (8, 14) [approved requirement]: Commit hygiene kept fully live: no Co-Authored-By or AI signature

**Git / approval evidence**
- No commits were made in Phase 1 or Phase 2 (repository clean except temp-audit-outputs/).

**Interpretations (tentative)**
- Project rule governs; session tooling defaults are overridden by the user's checked-in instructions. (confidence: medium-high; basis: CLAUDE.md is the user's own instruction file)

Confidence in classification: medium-high. Confidence in interpretation: medium-high.

**Unresolved**
- Q-14: confirm that the project rule governs for any later phase that commits.

**Recommended next action:** Owner confirmation; no commits to be created in Phase 3 unless explicitly asked, and then without trailers per the project rule.

### F-014 (P3, MISSING_AUTHORITY) Precedence among CLAUDE.md, CONTEXT.md, DECISIONS.md and ORIGINAL-OWNER-RULES.md
Also: DUPLICATED_REQUIREMENT, REFERENCE_DEFECT. Queue item: PQ-06.

Priority rationale: CONTEXT.md and CLAUDE.md both claim primacy and restate the same rules, but a field-by-field spot check found no incompatible claims besides F-012; remaining defects are dangling references.

**Evidence (facts)**
- `CONTEXT.md` (1-3) [approved requirement (agent instruction)]: 'shared source of truth for any AI assistant'; core rules 'full detail in CLAUDE.md'
- `CLAUDE.md` (3-4) [approved requirement (agent instruction)]: 'CONTEXT.md is the quick session ritual and pointer. This file holds the detailed rules'
- `docs/ORIGINAL-OWNER-RULES.md` (7, 27) [historical record]: 'where it conflicts with Part 1, Part 1 wins' but the file labels only 'PART 2'; no 'Part 1' exists in this repo
- `DECISIONS.md` (138) [historical record]: Edit-boundary entry lists 'ISSUES' among free-edit Markdown docs; no ISSUES file exists in the tree

**Git / approval evidence**
- CLAUDE.md and CONTEXT.md last changed 598211b (2026-10-25), after the 2026-10-24 'dedupe CONTEXT/CLAUDE' commits.

**Interpretations (tentative)**
- A division of labour is declared (CONTEXT quick, CLAUDE detailed); the missing piece is only an explicit conflict rule. (confidence: medium; basis: cross-references in both files)

Confidence in classification: medium-high. Confidence in interpretation: medium.

**Unresolved**
- Q-03

**Recommended next action:** Phase 3: add a single precedence statement; fix the dangling 'Part 1' pointer.

## Balance / damage

### F-009 (P2, IMPLEMENTATION_DISCREPANCY) Value of the player damage dial DMG_SCALAR
Also: HISTORICAL_DIFFERENCE. Queue item: PQ-03.

Priority rationale: An active, 'settled' DECISIONS.md entry states a number the code and BALANCE.md contradict, and it is not marked superseded; a reader of DECISIONS alone would tune from the wrong baseline. Already known and queued for slice 7, which limits the risk.

**Evidence (facts)**
- `DECISIONS.md` (101) [approved requirement (decision entry, later retuned)]: 'DMG_SCALAR = 2.0 -> multiplies player->enemy DAMAGE' (entry dated 2026-10-17)
- `BALANCE.md` (21, 54-55) [historical record + implementation note]: DMG_SCALAR 2.0 -> 0.47, then 0.47 -> 1.0 on 2026-10-18; 'FINAL STATE ... DMG_SCALAR 1.0'
- `docs/current feature planning/move-consistency-review.md` (757) [implementation note]: 'correct the DMG_SCALAR doc mismatch (code 1.0, DECISIONS text 2.0)'
- `docs/current feature planning/move-schema/slice-7.md` (6) [proposal]: Queued: correct the DMG_SCALAR text in DECISIONS

**Implementation and test evidence**
- js/core/stats.js:79 `const DMG_SCALAR = 1.0;` (used at :105 and :109). Also HP_SCALAR = 2.0 at stats.js:17 matches DECISIONS.md:100. Documented as 2.0, implemented as 1.0, correction already queued.

**Git / approval evidence**
- Retune recorded in BALANCE.md 2026-10-18 (after the 2026-10-17 DECISIONS entry).

**Interpretations (tentative)**
- The DECISIONS entry's principle (damage and HP dials are orthogonal) stands; only the example value is historical. (confidence: high; basis: BALANCE.md final-state line; stats.js:79)

Confidence in classification: high. Confidence in interpretation: high.

**Recommended next action:** No decision needed beyond approving the slice-7 text correction; Phase 3 may group with other DECISIONS annotations (F-014, F-022).

## Build / run / publish

### F-017 (P2, POSSIBLE_SUPERSESSION) How the game is run locally and whether a build is required
Also: IMPLEMENTATION_DISCREPANCY, REFERENCE_DEFECT. Queue item: PQ-09.

Priority rationale: Entry-point instructions in README, ONBOARDING and GDD tell readers to open index.html, which is intentionally absent from the source-only repo; a new tool or playtester following them cannot run the game.

**Evidence (facts)**
- `README.md` (7) [historical record (upstream text)]: 'No build, no dependencies'
- `ONBOARDING.md` (19) [historical record (upstream text)]: 'no build step to run it ... Opening index.html works.'
- `GDD.md` (8) [historical record (upstream text)]: 'It opens by double-clicking index.html, no server.'
- `DECISIONS.md` (151-166) [approved requirement (decision entry)]: 2026-10-17: index.html, js/app.min.js, version.json are gitignored build outputs; the game is run via dev.html; `node tools/build.js` only at publish time
- `CLAUDE.md` (98) [approved requirement (agent instruction)]: 'Debug on dev.html, not built index.html'

**Implementation and test evidence**
- Working tree: index.html, js/app.min.js and version.json do not exist; dev.html and tools/build.js do. CONTRIBUTING.md:22 asks testers whether they used 'the normal game (index.html) or the dev build', implying index.html is expected for testers (not checked how testers obtain it).

**Git / approval evidence**
- DECISIONS entry dated 2026-10-17, README/ONBOARDING unchanged since the fork commit 6d44c6f (README) for the cited lines.

**Interpretations (tentative)**
- Upstream text left intentionally as inherited, superseded by the fork decision for the source tree; running from a source checkout needs dev.html. (confidence: medium-high; basis: DECISIONS 2026-10-17; .gitignore)

Confidence in classification: high. Confidence in interpretation: medium-high.

**Unresolved**
- Q-08: are README, ONBOARDING (publish parts) maintained, archival or deferred?

**Recommended next action:** Owner to state whether upstream-derived docs are to be maintained; Phase 3 to avoid treating those lines as current.

### F-018 (P3, DIRECT_CONTRADICTION) Publishing on GitHub Pages
Also: REFERENCE_DEFECT. Queue item: PQ-09.

Priority rationale: Publishing detail with no gameplay impact; README points to a missing document and a hosting route the owner rejected.

**Evidence (facts)**
- `README.md` (90) [historical record (upstream text)]: 'Publishing free on GitHub Pages: docs/PUBLICAR.md'
- `DECISIONS.md` (157-158) [approved requirement (decision entry)]: 'GitHub Pages is explicitly NOT used'; revisit later if a host needs committed build output

**Implementation and test evidence**
- docs/PUBLICAR.md does not exist (automated markdown-link check: the only broken link of 9 inline links in inventoried .md files).

**Interpretations (tentative)**
- README is inherited upstream text, the DECISIONS entry is the fork owner's ruling. (confidence: medium-high; basis: claim types)

Confidence in classification: high. Confidence in interpretation: medium-high.

**Recommended next action:** Phase 3 cleanup candidate (README publishing section).

### F-019 (P3, HISTORICAL_DIFFERENCE) Where the SEO generator lives
Also: REFERENCE_DEFECT. Queue item: PQ-09.

Priority rationale: SEO pipeline location is described three ways; git evidences the later state, and affected docs only matter at publish time.

**Evidence (facts)**
- `DECISIONS.md` (168-175) [approved requirement (decision entry)]: 2026-10-17: tools/make_seo_pages.py stays dormant in tools/
- `DECISIONS.md` (31-34) [approved requirement (decision entry)]: 2026-10-20: 'SEO/website pages and their generators live in _delete_/ (gitignored)'; build with --sin-seo
- `docs/ORIGINAL-OWNER-RULES.md` (12) [historical record]: Build command still includes `python tools/make_seo_pages.py`

**Implementation and test evidence**
- tools/make_seo_pages.py is absent; tools/export_data.js still present; _delete_/ is empty on this checkout.

**Git / approval evidence**
- `git show --stat f853071` (2026-10-20): tools/make_seo_pages.py deleted (630 lines), the same day as the later DECISIONS entry.

**Interpretations (tentative)**
- The 2026-10-20 entry supersedes the 2026-10-17 entry; the older entry was not annotated. (confidence: high; basis: git deletion date; later entry wording)

Confidence in classification: high. Confidence in interpretation: high.

**Unresolved**
- Q-16: where do the generators and SEO pages live now?

**Recommended next action:** Annotate the older DECISIONS entry; fix build commands in ONBOARDING and ORIGINAL-OWNER-RULES at publish time.

## Move schema slices

### F-010 (P2, STATUS_AMBIGUITY) Sign-off state of slices 4a and 4b
Also: HISTORICAL_DIFFERENCE. Queue item: PQ-04.

Priority rationale: The declared read-first tracker (slice-overview.md) still says slice 4b awaits a playtest and slice-4a.md says 4a awaits one, while the overview itself and STATE.md record sign-off; approval status of built slices therefore differs within the planning set. Implementation exists, which limits the consequence.

**Evidence (facts)**
- `docs/current feature planning/move-schema/slice-4a.md` (3) [implementation note]: '(APPROVED and BUILT 2026-10-27; waiting for Jess's playtest)'
- `docs/current feature planning/move-schema/slice-overview.md` (45, 4, 46) [implementation note]: 4a 'DONE 2026-10-27, Jess signed off'; header and 4b 'BUILT ... waiting for Jess's playtest'
- `docs/current feature planning/move-schema/slice-4b.md` (3) [implementation note]: 'Prior slice: slice-4a.md (signed off 2026-10-27)'
- `STATE.md` (7) [implementation note]: 'slice 4b built, playtested by Jess: feels good ... Slices 1 to 3d, 4a, 4b DONE'

**Implementation and test evidence**
- move-effects.js contains executors for statusBonus, chainDamageFalloff, self-casts (6 matching lines); riders and 4b harnesses exist under docs/proposals/ (move-riders-*, move-selfcast-*). Harnesses not executed here.

**Git / approval evidence**
- 91b6c39 'Added art tests, completed slice 4a testing'; 997018f 'Move schema slice 4b ...' (2026-10-27).

**Interpretations (tentative)**
- STATE.md (newest) is correct and the other headers lag; all dated 2026-10-27 so ordering is not provable from dates. (confidence: medium; basis: STATE says playtested)

Confidence in classification: high. Confidence in interpretation: medium.

**Unresolved**
- Where is the owner's sign-off recorded other than AI-written prose? (none found in repo)

**Recommended next action:** Owner to confirm sign-off; Phase 3 should treat sign-off claims as unverified prose.

## Region loops / difficulty progression

### F-004 (P2, POSSIBLE_SUPERSESSION) Whether difficulty multipliers rise on each loop or repeat clear
Also: STATUS_AMBIGUITY. Queue item: PQ-05.

Priority rationale: A gameplay requirement (does difficulty rise per loop or on repeat clears) is stated in incompatible-looking ways by three docs, one of them undated with no status. Nothing is built yet (loop counter is dev-set; Keep Going deferred), so the risk is a wrong future build, not a present defect.

**Evidence (facts)**
- `docs/FULL-GAME-STRUCT.md` (1-8) [proposal (undated, no title or status)]: Six loops per region; loop N adds one more roster mon; 'No difficulty ramp on repeat clears'
- `BOSS-REWORK.md` (section 1 and section 4) [approved requirement (flow LOCKED 2026-10-19, numbers TBD) for a deferred feature]: 'Keep Going (loops, two signatures at once, bonus per loop) DEFERRED'; 'XP, damage and HP multipliers all go up each loop'
- `BOSS-REWORK.md` (3e) [approved requirement (self-labelled)]: LOCKED 2026-10-22: loop N fields the leader's first N mons simultaneously
- `docs/GYM-ROSTERS.md` (11-29) [implementation note]: SIX LOOPS per region (FULL-GAME-STRUCT); gym level rises across loops

**Implementation and test evidence**
- js/systems/gym.js:21 `let loop = 1;` comment: 'Dev-set until the real loop counter exists'; no difficulty-per-loop multiplier found in gym.js (not exhaustively searched). Documented, mostly not implemented.

**Git / approval evidence**
- FULL-GAME-STRUCT.md has one commit, 3dfeb23 'Roster building' (2026-10-22), the same commit that added the six-loop language to BOSS-REWORK/GYM-ROSTERS; origin and approval of the text are not recorded.

**Interpretations (tentative)**
- Different scopes: FULL-GAME-STRUCT's 'repeat clears' means replaying the finished six-loop set; BOSS-REWORK section 4's 'each loop' predates the six-loop model (2026-10-19 vs 2026-10-22) and describes a deferred Keep Going mode. (confidence: medium; basis: date order; section 4 labels Keep Going DEFERRED)
- Genuine contradiction: both state whether multipliers rise per loop. (confidence: low-medium; basis: same words 'loop' used by both)

Confidence in classification: medium. Confidence in interpretation: medium.

**Unresolved**
- Is FULL-GAME-STRUCT.md approved scope, a chat paste or a draft? (Q-07)
- Does 'loop' in BOSS-REWORK section 4 mean the same thing as in the six-loop structure?
- Do gym levels rise across loops (GYM-ROSTERS) and is that a 'ramp'?

**Recommended next action:** Owner to state the loop and ramp rule; confirm provenance of FULL-GAME-STRUCT.md. Not to be classed as a confirmed contradiction until then. Arceus is a separate item: FULL-GAME-STRUCT's end-game superboss is a different feature from the removed 30:00 Judgment (SCOPE_DIFFERENCE, no action).

## Repository hygiene

### F-021 (P2, MISSING_AUTHORITY) Whether CREDITS.md contact data is exempt from the 'no third-party contacts in the public repo' policy
Also: SCOPE_DIFFERENCE. Queue item: PQ-11.

Priority rationale: Repository hygiene with privacy exposure: the public-repo policy comment says third-party emails must never be committed, yet tracked CREDITS.md contains 10 email-like strings. Not evaluated beyond counting; addresses are deliberately not reproduced here.

**Evidence (facts)**
- `.gitignore` (25-26) [implementation note (policy comment)]: 'Contactos privados (emails de terceros): nunca al repositorio publico' (ignores docs/CONTACTOS_CREADORES.md)
- `CREDITS.md` (10-20 (artist table)) [historical record (upstream table)]: 'Contacto' column with Discord IDs and email-like strings (10 counted by regex)

**Git / approval evidence**
- CREDITS.md was introduced in the fork commit 6d44c6f (2026-10-16); DECISIONS.md says the fork repo is public; editing the file will not remove history.

**Interpretations (tentative)**
- The policy targets the ignored contacts file; the upstream CREDITS table is outside its intent. (confidence: low-medium; basis: comment names docs/CONTACTOS_CREADORES.md)

Confidence in classification: medium. Confidence in interpretation: low-medium.

**Unresolved**
- Q-18: is CREDITS.md exempt? Were the contacts published with the artists' consent upstream?

**Recommended next action:** Owner decision; flag only. Not for Phase 3 documentation migration.

## Startup context / trackers

### F-003 (P2, STATUS_AMBIGUITY) Which tracker is the active branch tracker
Also: REFERENCE_DEFECT. Queue item: PQ-01.

Priority rationale: CONTEXT.md is part of the automatic startup set and points agents to BOSS-REWORK.md as the 'Active branch tracker' while the active branch (per STATE.md) is a different effort tracked in slice-overview.md; agents may load the wrong tracker or none.

**Evidence (facts)**
- `CONTEXT.md` (47) [approved requirement (agent instruction)]: 'Active branch tracker: BOSS-REWORK.md'
- `BOSS-REWORK.md` (3-5) [implementation note]: 'Read this at session start while the branch is active (CONTEXT.md points here)'
- `STATE.md` (7) [implementation note]: Active branch is feature-test/new-move-schema; slice-overview.md is its tracker and is not named in CONTEXT.md or CLAUDE.md
- `BOSS-REWORK.md` (section 1) [historical record]: Cites 'DECISIONS 2026-10-19 boss rework'; no such entry exists in DECISIONS.md (grep count 0); it exists only in docs/DECISIONS-archive.md:503, headed 'DESIGN ONLY ... nothing built'

**Git / approval evidence**
- BOSS-REWORK.md last commit 2026-10-22; 'Close out boss-rework' commit 2026-10-19.

**Interpretations (tentative)**
- Branch-conditional wording ('while the branch is active') makes both statements true at different times; the pointer is simply stale. (confidence: medium; basis: BOSS-REWORK.md:3-5 wording)

Confidence in classification: medium-high. Confidence in interpretation: medium.

**Unresolved**
- Is the boss-rework branch still active or closed? (Q-06)
- Should the move-schema tracker be named in startup context?

**Recommended next action:** Owner to state the active tracker; Phase 3 to consider the boss-rework durable ruling living only in the archive.

## Documentation maintenance

### F-023 (P3, HISTORICAL_DIFFERENCE) DEVLOG archive header
Queue item: PQ-11.

Priority rationale: Archive header text out of date.

**Evidence (facts)**
- `docs/DEVLOG-archive.md` (3) [historical record]: 'moved ... on 2026-10-17 ... Verbatim, newest first.'
- `DEVLOG.md` (5) [historical record]: 'rotated to docs/DEVLOG-archive.md on 2026-10-27'
- `docs/DEVLOG-archive.md` (8, 1052) [historical record]: First entry heading dated 2026-10-21, last 2026-10-24 (oldest first)

**Interpretations (tentative)**
- Multiple rotations appended to one archive under the first header. (confidence: medium-high; basis: none cited)

Confidence in classification: high. Confidence in interpretation: medium-high.

**Recommended next action:** Cleanup candidate.

### F-024 (P3, MISSING_AUTHORITY) Authority and status of unreferenced documents
Queue item: PQ-12.

Priority rationale: Documents with no inbound reference and no declared status; none verified to carry normative content that conflicts with anything.

**Evidence (facts)**
- `FEATURES_GRAB.md` (1-6) [proposal]: Port plan from upstream; 'Nothing here has been applied to the game code yet'; no inbound reference from CONTEXT, CLAUDE or STATE
- `docs/ASCII Concept Maps/Gym Flow.txt` (9) [implementation note]: 'FIRST_AT = 240s = gym 1 opens at 4:00'
- `docs/current feature planning/move-parity-report.md` (1) [implementation note]: 'generated by tools/move_parity.js, do not edit'

**Implementation and test evidence**
- js/systems/gym.js:12 FIRST_AT = 240 matches the ASCII map's value (the one normative value checked). 22 of 24 documents the inventory called 'no inbound reference' have no basename reference in any tracked text file; 2 were false positives (.github/ISSUE_TEMPLATE/config.yml cited by DEVLOG-archive; opencode.json cited by STATE.md).

**Git / approval evidence**
- FEATURES_GRAB.md: one commit b095ef6 (2026-10-18).

**Interpretations (tentative)**
- Most are inert (licences, templates, third-party skills, snapshots); FEATURES_GRAB is a parked backlog document. (confidence: medium; basis: none cited)

Confidence in classification: medium. Confidence in interpretation: medium.

**Unresolved**
- Q-09, Q-10, Q-11, Q-12

**Recommended next action:** Deferred to Phase 3 as grouping decisions; no deep read of ponytail skills (third-party).

## Documentation style

### F-020 (P3, MISSING_AUTHORITY) Scope of the 'no em-dashes anywhere' rule
Queue item: PQ-11.

Priority rationale: Style rule violated in fork-authored decision/ledger text; scope of the rule is undeclared and many hits are archives or upstream text. No behavioral impact.

**Evidence (facts)**
- `CLAUDE.md` (83-84) [approved requirement (agent instruction)]: 'No em-dashes, anywhere.'
- `CONTEXT.md` (33-41 (core working rules)) [approved requirement (agent instruction)]: 'No em-dashes in any prose'

**Implementation and test evidence**
- Counted by script over inventoried files: 15 documents with 100 em-dashes; fork-authored: DECISIONS.md 9 (including headings of 2026-10-18 entries, after the rule's introduction on 2026-10-17), BALANCE.md 11, BOSS-REWORK.md 1, CONTRIBUTING.md 2; archives (DEVLOG-archive 22, DECISIONS-archive 10) and MP-PARKED-NOTES 16, PERF-HOTPATH-NOTES 10 are likely inherited or verbatim.

**Git / approval evidence**
- Rule introduced in 5332d56 (2026-10-17).

**Interpretations (tentative)**
- The rule applies to newly written prose; archives are verbatim and upstream material is exempt. (confidence: medium; basis: archive headers say verbatim)

Confidence in classification: high (rule vs content). Confidence in interpretation: medium.

**Unresolved**
- Does the rule cover archives, upstream-derived docs and generated reports?

**Recommended next action:** Owner to state scope; low priority.

## Implementation records

### F-011 (P3, HISTORICAL_DIFFERENCE) Whether proposal documents are pending specs or applied records
Also: STATUS_AMBIGUITY. Queue item: PQ-04.

Priority rationale: Eight proposal files still say 'not applied'; DECISIONS.md and git show the work landed. The folder is named 'proposals' so misreading risk is moderate to low.

**Evidence (facts)**
- `docs/proposals/fix-attack-calc-slice1-proposal.md` (1) [proposal]: 'PROPOSED (not applied)' (same in slice2, slice3, slice3c)
- `docs/proposals/upgrade-slice2b-proposal.md` (3) [proposal]: 'PROPOSAL, built and tested in a work copy, NOT applied'
- `DECISIONS.md` (58-68 (archive index)) [historical record]: fix/attack-calc slices 1, 2, 3a+3b, 3c APPLIED; Upgrade rework slices 1, 2a, 2b, 2c, 2d APPLIED

**Implementation and test evidence**
- Commits exist for each: b1a4048, 5257eea, 4eace39, 3c32bc6 (fix/attack-calc 1, 2, 3a+3b, 3c); 6254cd2, 0f64991, bca831d, e071cb2, 923b63f, 24f676f (upgrade rework). Code spot check: js/systems/combat.js:23-26 implements the swap-rule comment 'DECISIONS 2026-10-18'. Behavior not re-tested; no harness executed.

**Git / approval evidence**
- All commits dated 2026-10-18; they show the changes occurred, not owner approval (DECISIONS entries tag 'Jess' rulings).

**Interpretations (tentative)**
- Proposal headers were written before application and not updated. (confidence: high; basis: commit dates; DECISIONS index)

Confidence in classification: high. Confidence in interpretation: high.

**Unresolved**
- Q-13: classify the 13 proposal documents as historical records?

**Recommended next action:** Phase 3: treat as historical implementation records; no per-file code verification attempted.

## Startup context

### F-016 (P3, HISTORICAL_DIFFERENCE) Accuracy of STATE.md git-state lines
Queue item: PQ-08.

Priority rationale: Stale handoff snapshot; structurally expected because STATE.md is rewritten before commit. Misleads only about git state.

**Evidence (facts)**
- `STATE.md` (7-8) [implementation note]: 'Branch feature-test/new-move-schema, matches origin at 997018f'; uncommitted DECISIONS.md, slice-4c.md, three handoffs, STATE.md, DEVLOG.md; 'opencode.json is untracked and not ours'
- `CONTEXT.md` (27-31) [approved requirement (agent instruction)]: End ritual: rewrite STATE.md, then remind Jess to commit and push

**Git / approval evidence**
- Read-only git: HEAD of the source branch and origin/feature-test/new-move-schema is e2acd82 (2026-10-27 19:28); `git show --stat e2acd82` lists DECISIONS.md, DEVLOG.md, STATE.md, slice-4c.md, three handoffs and opencode.json; `git ls-files` shows opencode.json tracked. Current branch is chore/documentation-authority-audit.

**Interpretations (tentative)**
- STATE.md was written before the commit it describes as uncommitted. (confidence: high; basis: file list identical to the commit)

Confidence in classification: high. Confidence in interpretation: high.

**Unresolved**
- Does the ritual intend a post-commit refresh?

**Recommended next action:** None for Phase 3 beyond awareness.

### F-022 (P3, REFERENCE_DEFECT) Skip-list folder name
Queue item: PQ-11.

Priority rationale: Agents are told to skip a folder name that does not exist; harmless because .ignore covers the real folder.

**Evidence (facts)**
- `CLAUDE.md` (34) [approved requirement (agent instruction)]: 'skip assets/, pokeapi-master/, delete/, node_modules/ ...'
- `CONTEXT.md` (41) [approved requirement (agent instruction)]: Same list
- `.ignore` (6) [implementation note]: `_delete_/`

**Implementation and test evidence**
- `ls` shows _delete_ exists and delete does not.

**Interpretations (tentative)**
- Typo or old name. (confidence: high; basis: none cited)

Confidence in classification: high. Confidence in interpretation: high.

**Recommended next action:** Cleanup candidate (D-03 duplication too).

## Work tracking

### F-015 (P3, HISTORICAL_DIFFERENCE) Source of truth for issue and board status
Also: MISSING_AUTHORITY. Queue item: PQ-07.

Priority rationale: Board status differs across four places, but the differences are explained by sync dates and the board is declared authoritative; limited consequence. The structural gap (the freshest status lives in gitignored files) is noted for the owner.

**Evidence (facts)**
- `TODO.md` (9-30) [historical record]: Board mirror synced 2026-10-24: #4 OPEN needs-triage; #2 CLOSED with an unresolved discrepancy note ('Jess reports #2 was REOPENED')
- `docs/issues-snapshot.md` (51, 67) [historical record]: (snapshot 2026-10-27, gitignored) #4 [CLOSED], #2 [OPEN]
- `STATE.md` (18) [implementation note]: Board note: shipped #7, #4; in progress #2; 'Label vs board drift still to fix'
- `docs/PM-WORKFLOW.md` (11) [approved requirement (agent instruction)]: The board wins for what is next

**Git / approval evidence**
- `git check-ignore` confirms docs/issues-snapshot.md matches .gitignore:65 `docs/*-snapshot.*` (untracked), so other tools cannot read it from the repo.

**Interpretations (tentative)**
- TODO mirror is three days older than the snapshot; #4 was folded into #3 and closed in between; the snapshot agrees with Jess's report that #2 is open. (confidence: medium-high; basis: snapshot text at line 63 'Folds in the three feel-calls formerly tracked as #4')

Confidence in classification: high. Confidence in interpretation: medium-high.

**Unresolved**
- Q-02, Q-17: should status snapshots be tracked, or should citations be dropped?
- Board itself was not inspected (outside repository).

**Recommended next action:** Deferred to owner; Phase 3 should not use TODO.md mirror statuses as authoritative.
