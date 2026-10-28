# Phase 4: Approved consolidation plan

Approved 2026-10-28. Supersedes phase-4-plan.md section B onward; phase-4-plan.md stays as the record of the review and the Q1 to Q24 answers. Nothing in this file has been executed. Baseline: branch chore/documentation-authority-audit at e3fa3a0. IDs refer to phase-3a-owner-questionnaire.md (QA, R, D), phase-3a-consolidation-map.md (S, SG, NE, C, F, EC) and phase-4-plan.md section A (Q1 to Q24).

CP0 is closed: every question has an answer. One deferred balance lever (A.3, item 3) is recorded as `[Proposed]`, not `[Open]`, because it does not block any batch.

---

## 0. What was verified

| Claim | Result |
| --- | --- |
| combat-validation-and-handoff.md is "299 lines / 32 KB" | 298 lines, 32,046 bytes. Section 2.5 is "six hard moves". |
| "63 original moves" | Confirmed (slice-overview.md, file roles 1: 63, Bubble excluded). |
| Fire Spin "burn and trap, no strip" (QA-10, Q17) | New-path data already has damage, burn 100% and trap 100% (slice-4c-1-codehandoff.md:10, :46). The legacy path still strips and halves burn (`js/data/moves.js:61`: `strip`, `burnHalf`). No new-path data change is needed; the legacy path is tagged `[Legacy behavior]` until slice 7. |
| The grammar can express burn plus trap | Yes. Both are `ailment` riders (MOVE-AXIS-SCHEMA.md:107). |
| QA-11 "never exceeds 6" | Already true in code: `js/systems/stages.js:33,45` clamps to +-6. The legacy rule at stages.js:17 says "duration / cooldown is the cap". |
| QA-11 "default maxStacks 1" (confirmed by Q14) | Overrides MOVE-AXIS-SCHEMA.md:108 (default 6), review 9 Q4 (DECIDED, :652), architecture D30 and the D-2 values (Metal Claw 2, Meteor Mash 2; Leaf Storm 1 already matches). Code gap: move-attributes.js defaults to 6, and DEVLOG.md:95 records the per-move cap applied in stages.js on `add` and `teamAdd` (foe debuffs included). |
| QA-08 in-region loop vs LOCKED rules | Consistent once Q2 to Q7 are applied. "Last gymTrigger" (answers:82) means the Option A anchor (BOSS-REWORK:35). Elite cadence (BOSS-REWORK:28), escalation (DECISIONS:17-23, including the leader-level bump that Q7 refers to), the L50 clamp until the gym list is complete (BOSS-REWORK:18) and the all-at-once Elite Four are all kept. |
| Return Home bonus | BOSS-REWORK:18 cites the "Return Home time bonus (section 4)" (60 and 90 minute). The completion bonus replaces it (A.3, item 1). |
| Strong hosts | Boss, elite, gym leader (slice-4a-codehandoff.md:22). These keep their own status rules; owner item A.3-2 refers to them. |
| Player trap rule | Different from the enemy rule (status.js:10: no damage, no slow, swaps locked). Consolidation must keep it. |
| Standard Run / Unlock Safeties | Still live in DECISIONS.md:226-248, already SUPERSEDED in DECISIONS-archive.md:512. Q8 drops the DDA version; B5 moves the live entry to history. |
| slice-7.md:6 | Says to "move the Checkpoint 1 to 3 decisions into DECISIONS.md". Contradicts QA-01 and QA-05; must be rewritten. |
| Citations of the boss docs | Stable: renames are deferred to a later organization branch (Q1). `js/systems/elites.js:6` and `js/systems/gym.js:7` cite BOSS-REWORK sections 2 and 3, so those section numbers must not change. `js/data/gyms.js:19` cites FULL-GAME-STRUCT.md, which stays in place. |
| Commits on the branch | 745b9c5 and e3fa3a0 hold about 15k lines of temp-audit-outputs. The owner deletes the folder before the merge (Q24). |
| `node tools/check.js` as proof that no code changed | Wrong. It syntax-checks JS and runs harnesses. Only `git diff` against the base proves no code was touched. |
| Quick agent loads CLAUDE.md | Confirmed by the owner (Q22), who will update the Quick instructions the same day as B7. |
| Still unverified | The original Checkpoint 1 answers (EC-01, never committed). Whether legacy enemies are still un-trappable (E1). |

---

## A. Settled answers

### A.1 Run loop (QA-08, Q2 to Q12)

The in-region loop keeps every LOCKED rule. QA-08 only adds to it.

| Topic | Approved rule | Source status |
| --- | --- | --- |
| Gym cadence (Q2) | Gym 1 at 4:00; each later gym 4:00 after the previous gym is beaten and the player has returned | Unchanged (LOCKED Option A) |
| Elite cadence (Q3) | First elite at 2:00; each later elite 2:00 after return; none while one is alive | Unchanged (LOCKED) |
| Escalation (Q4) | 37 s grace, then +1 every 10 s, uncapped | Unchanged |
| Level curve (Q5) | Linear to L50 by 30:00; clamped at L50 until all 8 gyms are beaten; then the post-gym slow ramp | Unchanged |
| Level clock across loops (Q5) | Uncapped across loops and Next Region | New |
| Elite Four (Q6) | All four at once, hard-set levels, player picks the order | Unchanged (LOCKED) |
| Gym level (Q7) | Wild level + 4, locked at spawn, plus the escalation bump read at entry | Unchanged (DECISIONS:19) |
| Unlock Safeties (Q8) | Means "continue to Loop N+1". The performance-scaled (DDA) version from 2026-10-17 is dropped | Replaces DECISIONS:226-248 |
| Descendant Mutation (Q9) | Your mon's moves and typing go to another mon | Reverses FULL-GAME-STRUCT's inheritor graft |
| Arceus gate (Q10) | The 9th completion point of The Climb | Replaces FGS "own every legendary" |
| Other FGS items (Q11) | Shiny tiers, gold-toll re-challenge, Uber modifiers, per-region legendary counts, one-sitting achievement | `[Proposed]` |
| Return Home bonus (Q12, A.3-1) | The completion bonus (escalating per loop) replaces the 60 and 90 minute time bonus | Replaces BOSS-REWORK section 4 time bonus |

### A.2 Combat rules (QA-10, QA-11, Q13 to Q17)

- **Fire Spin (Q17):** burn at the full standard length (half-burn dropped), trap, no strip. The persistent orbit damage stays as authored.
- **maxStacks scope (Q16, A.3-2):** maxStacks applies only to self-buffs. Debuffs on enemies have no per-move cap; they stack freely up to the -6 ladder limit. Strong hosts (boss, elite, gym leader) keep their own rules. This supersedes the wording in answers:124 ("player or enemy") and :127 ("all Stat Stages").
- **maxStacks default (Q14):** every move defaults to maxStacks 1, including Metal Claw and Meteor Mash (authored 2 today). Authored values are a balancing lever for later passes.
- **Upgrade formula (QA-11):** for a self-buff, maxStacks = min(floor(duration / cooldown), 6). New path only (Q15); the legacy "duration / cooldown is the cap" stays `[Legacy behavior]` until slice 7.
- **Invariant (Q13):** a self-buff's duration is never shorter than its cooldown. Duration upgrades raise duration; cooldown upgrades lower cooldown. So the formula is always at least 1.

### A.3 Later answers (closing the review's open threads)

1. The Return Home completion bonus replaces the 60 and 90 minute time bonus (Q12).
2. Q16 stands: maxStacks applies only to self-buffs (see A.2).
3. A later authored maxStacks would combine with the formula as `floor(authored, formula)`, a balance lever for later. Recorded as `[Proposed]` with this reading: the authored value acts as a floor, so the effective cap is the larger of the authored value and min(floor(duration / cooldown), 6). (A smaller-of reading would pin every move at the default 1 and make the upgrade formula do nothing.) Not built, not needed by any batch.

### A.4 Process answers

- **Q1:** renames and moves of the boss docs happen in a later organization branch. Nothing is renamed in this branch.
- **Q18 (QA-13):** slice 7 does not implement option (a). After slice 7 the gym is Brock only, either once or every time a gym is called, whichever is simpler to build. Option (a) and the other gyms get their own branch. Naming note: this "option (a)" is unrelated to the gym cadence "Option A".
- **Q19:** DECISIONS entries use ISO dates and a `Canonical:` line naming the section only, no line numbers.
- **Q20:** superseded entries move verbatim to DECISIONS-archive.
- **Q21:** bulk `[Approved]` covers only items marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED, signed off or [Jess decided]. Never DRAFT, PROPOSED, OPEN or TBD.
- **Q22:** the Quick agent loads CLAUDE.md; its instructions change the same day as B7.
- **Q23:** unexecuted 4c handoffs get pointers plus a conflict list, no rewritten build steps.
- **Q24:** the owner deletes temp-audit-outputs before the merge.

---

## B. Plan

Order follows dependency: general combat rules before move-specific rulings; canonical homes before agent pointers; content before the DECISIONS conversion. No renames.

Every two-commit batch has the same rollback: revert (b), then (a). Single-commit batches: revert the commit.

**B0. Baseline**

- Files: STATE.md (active work is the consolidation; coding paused per QA-00); new working ledger temp-audit-outputs/phase-4-ledger.md.
- The QA and Q answers are already recorded in phase-4-plan.md section A and in this file; no separate addendum.
- Not in this batch: DECISIONS entries (written as each canonical section lands, so every `Canonical:` resolves).
- Commits: 1. Risk: low.

**B1. Reference fixes**

- Covers R-01 and Phase 3 batch 1, per reference-integrity.md, including citations of the boss docs (their paths are now stable).
- CLAUDE.md and CONTEXT.md: the `delete/` to `_delete_/` change only.
- Commits: 1. Validation: rerun the reference check.

**B2. Destinations**

- R-14 headers on GDD, BOSS-REWORK, GYM-ROSTERS, BOSS-AUTHORING, MOVE-AXIS-SCHEMA, combat-architecture, combat-validation, ONBOARDING, SIM-PRESENT-BOUNDARY (R-12) and BALANCE.
- New files: skeletons of docs/COMBAT-RULES.md and docs/MOVE-INTENT.md.
- CLAUDE.md: a tag-vocabulary paragraph. The only CLAUDE.md change before B7, purely additive.
- Ledger seeded from every consolidation-map section 4 source row plus every QA and Q answer and A.3.
- Headers say "Last reconciled: not yet".
- Commits: 1. Stop: CP1.

**B3. Combat rules** (QA-03, QA-10, QA-11, QA-12, R-05, R-10, R-11)

- Fill COMBAT-RULES from: DECISIONS 2026-10-17 (stats, damage, orthogonal dials, G.Stats) and the 2026-10-18 swap rule; archive Slices A to E2e and DoT; BOSS-REWORK 3c; stat-model notes section 4; shared parts of architecture D6 to D11 and D30.
- Trap: the enemy rule from QA-10 (2 s root on wild enemies; 25% then a 10 s window on strong hosts) is `[Approved]`; E1 and Fire Spin strip and burnHalf are `[Legacy behavior]`; the player trap rule is kept unchanged.
- Stages (A.2): the +-6 ladder; per-move maxStacks applies to self-buffs only, default 1; the upgrade formula and the duration-not-shorter-than-cooldown invariant; foe debuffs uncapped per move; strong hosts under their own rules; A.3-3 as `[Proposed]`. Code-gap note: the code defaults to 6 and caps foe debuffs per move.
- Commit (b): BOSS-REWORK 3c becomes a pointer plus gym-only rules; BUFF-TABLE repoints; D6 to D11 keep only move-path specifics; stat-model notes get a history header.
- Risk: medium-high. Validation: formulas compared against stats.js, types.js, status.js and stages.js; a search for "2L/5" finds full text only in COMBAT-RULES.
- Stop: CP2 before (b).

**B4. Move schema** (QA-04, QA-05, QA-11 grammar default, R-02, R-03, R-04, R-06, R-16)

- MOVE-AXIS-SCHEMA gets the grammar, file roles and the maxStacks field rule: default 1, meaningful only on self-target stage riders, with a code-gap note (move-attributes.js defaults to 6; Metal Claw and Meteor Mash authored at 2). combat-architecture gets the runtime rules; MOVE-INTENT.md gets the per-move rulings, including Fire Spin (A.2).
- Validation: list every new-path self-buff and check duration against cooldown. A self-buff whose duration is shorter than its cooldown, or a self-buff with no cooldown (persistent), breaks the Q13 invariant: the executor stops and asks.
- QA-04 precedence: a MOVE-INTENT ruling overrides COMBAT-RULES and MOVE-AXIS-SCHEMA defaults for that move. It cannot require something the grammar cannot express; that becomes an `[Open]` grammar gap.
- QA-04 scenarios: combat-validation section 2.5 keeps its scenarios as validation material. Each ruling sentence moves to MOVE-INTENT, and each scenario links to it.
- Name collision: the planned move-intent-scenarios.json (section 1.4) is named in the MOVE-INTENT header.
- Commit (b): review section 9 gets a history header with "absorbed into" pointers; slice-overview's "single source" line repointed; executed slices (stage-0, 1 to 4b, handoffs 2, 3d, 4a, 4b) get history headers; unexecuted slices (4c, 4c-1 to 4c-3, 4d, 5, 6, 7) have decision sections replaced by pointers plus a conflict list (Q23); slice-7.md:6 rewritten; QA-13 recorded as decided in slice-7.md (Brock-only fallback, option (a) is its own branch).
- Note: the only 4c handoff touching Fire Spin or maxStacks (4c-1) already matches Q17 and Leaf Storm maxStacks 1. Any slice or handoff that sets Metal Claw or Meteor Mash to 2 goes on the conflict list.
- Risk: high. Stop: CP3 (handoff conflict list and MOVE-INTENT content).

**B5. Progression** (QA-06, QA-08, R-07, R-08, R-09)

- Commit (a1): consolidate existing rules into BOSS-REWORK (escalation into section 3, badge rules, archive boss entries, duplicates resolved). The kept LOCKED rules from A.1 are tagged `[Approved]`. Section numbers 2 and 3 stay (cited by elites.js and gym.js).
- Commit (a2): the QA-08 design record, dated 2026-10-28, in BOSS-REWORK sections 1 and 4: the end-of-region choice (Return Home, Next Region, Unlock Safeties), loops and Keep Going, the uncapped level clock across loops, the completion bonus replacing the 60 and 90 minute time bonus. BOSS-REWORK:16 ("Keep Going DEFERRED") points to the new design; the build stays deferred. Superseded items (the time bonus, DECISIONS:226-248 DDA Unlock Safeties) go to history.
- Commit (b): change log and touch points to the archive; GYM-ROSTERS rules become a pointer; BOSS-AUTHORING header "implemented for Brock"; FULL-GAME-STRUCT gets a history header but stays in place (gyms.js:19 cites it); DECISIONS Phase 2 text to the archive; QA-13 recorded as decided in BOSS-REWORK 3a.
- Stop: CP4 before (a2).

**B6. GDD umbrella** (QA-02, QA-14, D-07, QA-08 meta)

- A bounded archive read comes first and produces ledger rows. Conflicts with code go to the owner at CP5.
- Commit (a): the new GDD, including the meta and endgame section: Legendary Boss, The Climb, Arceus gated on The Climb's 9th completion point, Descendant Mutation (your mon's moves and typing go to another mon). The Q11 FGS items are `[Proposed]`.
- Commit (b): old decision log to history; GLOSSARY marks removed systems.
- Risk: highest effort. Time-box it.

**B7. Agent rules** (QA-15)

- CLAUDE.md: coding conventions, the precedence paragraph, the skills line, the "where current rules live" list; Session rituals becomes a pointer.
- CONTEXT.md: rule reminders removed. STATE.md: "Standing rules" removed. slice-overview.md: rules 2 and 5 become pointers.
- The owner updates the Quick agent instructions the same day (Q22).
- Commits: 1, so a single revert undoes it. Stop: CP6 before and after.

**B8. DECISIONS log** (QA-01, R-15, R-11, R-10)

- Commit (a): verbatim copies to DECISIONS-archive under "current rule in" headers (Q20); every QA and Q answer gets a new-format entry with an ISO date and a section-only `Canonical:` line (Q19).
- Commit (b): existing entries reduced to log form; history banners and the archive header added.
- Validation: every `Canonical:` section heading exists; no superseded value remains ("never runs git", "30-min", "bridge", "2.0" near DMG_SCALAR, "maxStacks" default 6, the DDA Unlock Safeties).

**B9. Close-out**

- Run every automated check; one reviewer pass per subject; zero unticked ledger rows.
- Rewrite STATE.md, including the code-gap list (section E); DEVLOG entry naming the commit that last holds the ledger.
- The owner removes temp-audit-outputs in its own commit (Q24). Merge.
- Stop: CP7.

### Gates

- **Before any pointer is removed:** the destination row is ticked in the ledger and the (a) commit exists. Rows with changed wording are ticked by the owner, not the executor.
- **Before CLAUDE.md or CONTEXT.md change (B7):** every target in the "where rules live" list exists, the Quick update is scheduled for the same day, and a fresh-session test is ready in both tools.

### Commit commands (the owner runs these)

Commit the answers and this plan now:

```
git add -- temp-audit-outputs/phase-4-plan.md temp-audit-outputs/phase-4-plan-approved.md
git commit -m "docs(audit): owner answers to Phase 4 questions and approved plan"
```

Per batch, `git add -- <listed files>`, then one of these messages:

- `docs(B0): baseline state and consolidation ledger`
- `docs(B1): fix stale paths and deleted-plan citations`
- `docs(B2): spec headers, COMBAT-RULES and MOVE-INTENT skeletons, tag vocabulary`
- `docs(B3a): consolidate combat rules into COMBAT-RULES`
- `docs(B3b): replace old combat rule copies with pointers`
- `docs(B4a): consolidate move-schema rules and per-move intent`
- `docs(B4b): freeze review section 9 and slice decision sections as history`
- `docs(B5a1): consolidate progression rules into BOSS-REWORK`
- `docs(B5a2): record 2026-10-28 end-of-region and loop design (QA-08)`
- `docs(B5b): move boss tracker history to archive, repoint rosters and FULL-GAME-STRUCT`
- `docs(B6a): rewrite GDD as living umbrella`
- `docs(B6b): GDD decision log to history, glossary marks`
- `docs(B7): agent rules live only in CLAUDE.md`
- `docs(B8a): archive full decision texts with current-rule headers`
- `docs(B8b): convert DECISIONS.md to decision log`
- `docs(B9): remove audit working files`

Merge at the end:

```
git push
git switch feature-test/new-move-schema
git pull --ff-only
git merge --no-ff chore/documentation-authority-audit -m "Merge documentation consolidation"
git push
```

### Read-only checks between batches (Git Bash)

```
git status --short
git diff --stat HEAD~1
git diff --name-only feature-test/new-move-schema...HEAD -- js dev.html tools css assets package.json
git diff HEAD~1 -U0 | grep '^+' | LC_ALL=C.UTF-8 grep -n $'\xe2\x80\x94'
git log --oneline feature-test/new-move-schema..HEAD
git fetch && git status -sb
node tools/check.js
```

- The third command must print nothing, for the whole branch. This is the real "no code touched" proof.
- The fourth must print nothing (em-dashes in added lines).
- check.js is a sanity check only.

### Checkpoints (the executor stops and waits for the owner's OK)

| | When | What the owner approves |
| --- | --- | --- |
| CP0 | Closed 2026-10-28 | Q1 to Q24 and A.3 answered |
| CP1 | After B2 | "Owns" boundaries in the headers, and the tag paragraph |
| CP2 | B3, before (b) | Trap, Fire Spin and stage/maxStacks wording, plus every ledger row whose wording changed |
| CP3 | B4, before (b) | MOVE-INTENT content, the handoff conflict list, and any self-buff that breaks the Q13 invariant |
| CP4 | B5, before (a2) | The QA-08 record and the list of superseded items (time bonus, DDA Unlock Safeties, FGS graft and Arceus gate) |
| CP5 | B6, after the bounded read | Conflicts between the archive and code |
| CP6 | Before and after B7 | Before: Quick update scheduled for the same day. After: a fresh session in both tools passes "catch me up" and "where is the trap rule" |
| CP7 | Before merge | Ledger closed and checks clean |

### Files created or deleted

| File | Action | Citations to update | Gated code? |
| --- | --- | --- | --- |
| docs/COMBAT-RULES.md | create (B2) | New pointers from BOSS-REWORK 3c, BUFF-TABLE, architecture D6-D11, GDD and the CLAUDE.md list | no |
| docs/MOVE-INTENT.md | create (B2) | New pointers from combat-validation 2.5 and 3.6, slice-overview, MOVE-AXIS-SCHEMA, architecture and the review section 9 header | no |
| temp-audit-outputs/phase-4-ledger.md | create (B0), deleted with the folder (B9) | none | no |
| temp-audit-outputs/ | delete (B9, by the owner, per Q24) | none found outside itself (grep again at B9) | no |
| docs/FULL-GAME-STRUCT.md | not moved; gets a history header | `js/data/gyms.js:19` keeps resolving | no |

No file is renamed or moved in this branch (Q1).

### Precedence changes

1. DECISIONS.md stops being a settled register and becomes a log. The spec named in `Canonical:` wins (QA-01).
2. Review section 9 loses "single source". MOVE-AXIS-SCHEMA owns grammar, combat-architecture owns runtime, MOVE-INTENT owns per-move rulings (QA-05).
3. MOVE-INTENT beats COMBAT-RULES and grammar defaults for the named move (QA-04).
4. COMBAT-RULES beats BOSS-REWORK 3c, the archive, stat-model notes, BUFF-TABLE, BALANCE and architecture D6-D11 for combat rules (QA-03).
5. GDD changes from "authoritative" to umbrella; subsystem specs win (QA-02). The CLAUDE.md reference line changes to say so.
6. BOSS-REWORK goes from tracker to progression spec; STATE owns tracking. Its LOCKED cadence, escalation, clamp and Elite Four rules are kept; QA-08 adds the end-of-region and loop rules and replaces the section 4 time bonus (QA-06, QA-08).
7. FULL-GAME-STRUCT becomes history. GYM-ROSTERS rules defer to BOSS-REWORK (QA-08, R-09).
8. CLAUDE.md is the only home for agent rules. CONTEXT, STATE, slice-overview and DECISIONS lose rule text (QA-15).
9. DECISIONS-archive moves from "cited as live" to history after extraction (R-10).
10. Stage rules: a per-move cap (default 1) on self-buffs only, raised by the upgrade formula, layered under the +-6 ladder; foe debuffs are capped only by the ladder; strong hosts keep their own rules. The QA-10 trap rule beats E1 on enemies (QA-10, QA-11).

---

## C. Executor guardrails

**Must not:**

- Edit js/, dev.html, tools/, css, assets or package files. Run repo-changing git or gh.
- Rename or move any file (Q1).
- Resolve an unanswered question by picking an option. Write `[Open]` with the question, and stop if it blocks.
- Change a rule's meaning while copying it. Every wording change gets an old-text, new-text ledger row ticked by the owner.
- Rewrite handoff build steps, "improve" designs or retune numbers. Numbers read "current value: see <file>".
- Create files beyond the two specs and the ledger.
- Trim a source before its ledger row is ticked and its (a) commit exists.
- Edit history text beyond adding headers, or mass-fix em-dashes in archives (D-05).
- Overwrite the player trap rule with the enemy rule.
- Apply maxStacks to foe debuffs, or record the per-move cap default as anything but 1.

**Must stop and ask** about: a contradiction the answers do not cover, a doc that disagrees with code, or a self-buff that breaks the Q13 invariant. Rules from QA-07 group 2 (Checkpoint 1 Q1 to Q17) are AI-recorded (EC-01): tag them per QA-07 but flag the rows in the ledger for owner spot-check.

**Tags (QA-07, Q21):**

- `[Approved]`: a source item marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED, signed off or [Jess decided] that no later item supersedes; every QA and Q answer and A.3 items 1 and 2; QA-13 as settled by Q18. A TUNE value is still approved; the value is a dial.
- `[Legacy behavior]`: what the live path does when it differs from the approved rule. Always name the slice that removes it (Fire Spin strip and burnHalf at `js/data/moves.js:61`, E1, the legacy "duration/cooldown is the cap").
- `[Proposed]`: anything marked DRAFT, PROPOSED, recommend or TBD; the mainline type chart (on hold); the Q11 FGS items; the A.3-3 authored-floor lever; GDD rules from the bounded read that code does not confirm.
- `[Open]`: explicit OPEN items and unanswered review questions found during execution.
- Not tags: "superseded" (that text goes to history), and "approved but not built" (the `[Approved]` tag plus a short "code differs, see TODO" note; the gap list lives in STATE.md and TODO).
- Tie-break: a later dated owner decision wins. The 2026-10-28 answers beat everything earlier, and A.3 beats the QA-11 text at answers:124 and :127. Two conflicting sources with the same date become `[Open]`, and the executor stops.

**Ledger and temp-audit-outputs:**

- Ledger columns: source path and section, verbatim source excerpt, destination, tag, QA/Q dependency, wording-changed flag, reviewer tick.
- At B9: zero unticked rows. The DEVLOG entry names the commit hash that last contains the ledger. temp-audit-outputs is deleted in its own commit before the merge.

---

## D. Risks

1. **Meaning drift while copying dense archive and Checkpoint text.** Mitigation: verbatim excerpts in the ledger; the owner ticks every row whose wording changed.
2. **Specs say one thing and code another** (Fire Spin legacy path, maxStacks default 6 in code, foe debuffs capped per move in stages.js, Metal Claw and Meteor Mash at 2), and a later chat "fixes" the wrong side. Mitigation: code-gap notes, the gap list in STATE.md, the section E follow-ups.
3. **B7 breaks startup for one of the tools.** Mitigation: CP6, B7 as a single commit, the same-day Quick update.
4. **The QA-08 additions read as built.** Mitigation: B5a2 as its own dated commit; every new loop rule carries "approved, not built".
5. **The merge carries about 15k lines of audit files into feature-test.** Mitigation: the B9 delete commit and a `--no-ff` merge.

Accepted owner choice: QA-07 bulk approval, with the Checkpoint 1 Q1 to Q17 rows spot-checked, since the originals were never committed.

---

## E. Out of scope (each needs its own prose plan)

- **QA-11:** default maxStacks 1 in move-attributes.js; Metal Claw and Meteor Mash set to 1; per-move cap removed from foe debuffs in stages.js (new path); the resolver deriving self-buff maxStacks from upgraded duration and cooldown; later, the A.3-3 authored floor if needed.
- **QA-10:** remove legacy Fire Spin strip and burnHalf, or leave it to slice 7. Confirm whether E1 still blocks trapping enemies on the live path.
- **QA-08:** the end-of-region choice UI; loops and Keep Going; Next Region carry-over; the level clock past the L50 clamp across loops; the completion bonus replacing the time bonus; Legendary arena, The Climb with team lock, Arceus, Descendant Mutation (moves and typing); backward-compatible save fields for all of these.
- **QA-13:** slice 7 ships the Brock-only gym fallback (Q18); option (a) and the other gyms in their own branch.
- **QA-06:** the boss doc renames and moves in the later organization branch, with comment repoints in `js/systems/elites.js`, `js/systems/gym.js` and `js/data/gyms.js`.
- **Existing items:** optional tools/ check scripts; the BOSS-REWORK section 5 cleanup (BOSS_SLOTS, judgment.js); the elite cadence hook (D-06); the mainline type chart (QA-12, on hold).
