# Phase 4: Review of Phase 3A answers and revised consolidation plan

Planning only. Nothing in this file has been executed. Baseline: branch chore/documentation-authority-audit at 745b9c5; feature-test/new-move-schema is still at e2acd82 (no drift). IDs refer to phase-3a-owner-questionnaire.md (QA, R, D), phase-3a-consolidation-map.md (S, SG, NE, C, F, EC) and the open questions in section A of this file (Q1 to Q24).

---

## 0. What was verified

| Claim | Result |
| --- | --- |
| combat-validation-and-handoff.md is "299 lines / 32 KB" | 298 lines, 32,046 bytes. Section 2.5 is "six hard moves". |
| "63 original moves" | Confirmed (slice-overview.md, file roles 1: 63, Bubble excluded). |
| Fire Spin "burn and trap, no strip" (QA-10) | New-path data already has damage, burn 100% and trap 100% (slice-4c-1-codehandoff.md:10, :46). The legacy path still strips and halves burn (`js/data/moves.js:61`: `strip`, `burnHalf`). No new-path data change is needed; the legacy path is tagged `[Legacy behavior]` until slice 7. |
| The grammar can express burn plus trap | Yes. Both are `ailment` riders (MOVE-AXIS-SCHEMA.md:107). |
| QA-11 "never exceeds 6" | Already true in code: `js/systems/stages.js:33,45` clamps to +-6. The legacy rule at stages.js:17 says "duration / cooldown is the cap". QA-11 makes that implicit cap explicit. |
| QA-11 "default maxStacks 1" | Contradicts MOVE-AXIS-SCHEMA.md:108 (default 6), review 9 Q4 (DECIDED, :652) and architecture D30. Interacts with D-2 (Metal Claw 2, Meteor Mash 2, Leaf Storm 1, review :762). |
| Player trap rule | Different from the enemy rule (status.js:10: no damage, no slow, swaps locked). Consolidation must keep it. |
| Escalation | DECISIONS.md:17-23: a 37 s grace, then +1 every 10 s. QA-08 does not mention the 10 s step. |
| LOCKED BOSS-REWORK rules that QA-08 touches | Gym cadence counts from the previous gym being beaten (:35, Option A). Elites come 2:00 after you return (:28). All four Elite Four gates open at once at hard-set levels (:72-73). L50 clamp from 30:00 (:18). |
| Standard Run / Unlock Safeties | Still live in DECISIONS.md:226-248, but DECISIONS-archive.md:512 already marks it SUPERSEDED. This conflict exists today. |
| slice-7.md:6 | Says to "move the Checkpoint 1 to 3 decisions into DECISIONS.md". Contradicts QA-01 and QA-05; must be rewritten. |
| Citations of files that might be renamed | BOSS-REWORK.md: 16 hits in 8 files, including `js/systems/elites.js:6` ("section 2") and `js/systems/gym.js:7` ("section 3"). BOSS-AUTHORING.md: 6 hits, including `js/data/gyms.js:2` and `gym.js:7`. FULL-GAME-STRUCT.md: cited by `js/data/gyms.js:19` (`LOOPS`). All JS hits are gated code. |
| 745b9c5 contents | About 14.8k lines of temp-audit-outputs, plus table-formatting-only edits to combat-validation-and-handoff.md. Both merge into feature-test unless removed. |
| `node tools/check.js` "proves no code was touched" (draft ground rules) | Wrong. It syntax-checks JS and runs harnesses. Only `git diff` against the base proves no code was touched. |
| Unverified | Whether the Amazon Quick agent loads CLAUDE.md. The original Checkpoint 1 answers (EC-01, never committed). Whether legacy enemies are still un-trappable (E1). |

---

## A. Opinion on the answers

### Answers that most shape Phase 4 risk

1. **QA-08 (run loop).** A new game design, not consolidation. It reverses at least four LOCKED rules (gym cadence, elite cadence, Elite Four format, and possibly the L50 clamp). It redefines "Unlock Safeties" and changes the Arceus reward (FULL-GAME-STRUCT grafts the inheritor's typing and movepool onto your mon; QA-08 adds your mon's moves to another mon).
   - Execute it as a design record in its own commit (B5a2), so it cannot be mistaken for a no-behavior-change edit.
   - Home: the in-region loop goes in BOSS-REWORK sections 1 and 4. The cross-region meta (Legendary Boss, The Climb, Arceus, Descendant Mutation) goes in GDD's meta section.
   - Every unanswered ambiguity below becomes `[Open]`.
2. **QA-11 (maxStacks formula).** A gameplay rule change with code consequences. As written, `min(floor(duration/cooldown), 6)` gives 0 whenever duration is shorter than cooldown, and it is undefined for persistent moves (no cooldown).
   - Home: COMBAT-RULES (base layer) and MOVE-AXIS-SCHEMA (grammar default), tagged `[Approved]` with a code-gap note since move-attributes.js still defaults to 6.
   - Do not execute until Q13 to Q16 are answered.
3. **QA-06 (renames).** Conflicts with itself: "agree with recommended" (path unchanged) versus "rename and move". "At a later date and separate organization branch" reads as covering all three changes. The renames touch three gated JS files. Recommendation: defer (section D).
4. **QA-05 plus QA-00 (absorb now, coding paused).** Removes the time pressure the draft was built around. Widens scope to slice files and handoffs: executed slices get history headers; unexecuted handoffs get pointers plus a conflict list for the owner, not rewritten build steps.

### Conflicts between answers, and which wins

- **QA-07 (bulk `[Approved]`) vs QA-08, QA-10, QA-11.** Older approved items are overridden by newer answers (BOSS-REWORK LOCKED cadence, D-2 values and the Q4 default, E1 Fire Spin). The newer dated answer wins. Superseded items go to history and are never tagged.
- **QA-06 "agree" vs QA-06 renames.** Answer Q1. Recommendation: "agree" wins for this branch.
- **QA-08 vs FULL-GAME-STRUCT.md.** QA-08 wins where they overlap. FGS items QA-08 does not mention need Q11.
- **QA-01 format vs the existing repo.** `DDMMMYYYY` differs from every ISO date in DECISIONS, DEVLOG and BOSS-REWORK. `Canonical:` with line numbers goes stale within this migration. See Q19.

### Open questions (one line each)

**QA-06 (renames)**

- Q1. Rename and move the boss docs in this branch, or in the later organization branch? (Recommended: later.)
- Later.

**QA-08 (run loop)**

- Q2. Next gym spawns 4:00 after the previous gym spawns (as written), or after it is beaten and you return (LOCKED Option A)?
- LOCKED Option A (after it is beaten and you return)

- Q3. Elite spawns 2:00 after gym spawn, or after return (LOCKED)? Does "none while one is alive" still hold?
- after return (LOCKED). none while one is alive still holds.

- Q4. Escalation: a single +1 at 0:37, or the existing 37 s grace then +1 every 10 s?
- existing 37 s grace then +1 every 10 s

- Q5. Is the L50 clamp at 30:00 kept? Is the post-gym slow ramp dropped? Is the level clock uncapped across loops and Next Region?
- L50 clamp is kept at 30:00 until 8 gyms are beaten. Post-Gym slow ramp kept. level clock is uncapped across loops and Next Region

- Q6. Elite Four one at a time on the gym clock (replacing "all four at once, hard-set levels, player picks order")?
- all four at once, hard-set levels, player picks order. We'll keep this.
- Q7. Is gym level still "wild level + 4, locked at spawn"?
- wild level + 4, locked at spawn unless otherwise modified by the Escalation mechanic.

- Q8. Is the 2026-10-17 performance-scaled (DDA) Unlock Safeties dropped entirely, with the name now meaning "continue to Loop N+1"?
- Yes.

- Q9. Descendant Mutation: does QA-08's direction (your mon's moves go to another mon, no typing) replace FGS's inheritor graft?
- Yes, but also typing moves as well. I forgot that in my answer to QA-08.

- Q10. Does The Climb's 9th completion point replace FGS's "own every legendary" as the Arceus gate?
- Yes.

- Q11. FGS items QA-08 does not mention (shiny tiers, gold-toll legendary re-challenge, Uber modifiers, per-region legendary counts, one-sitting achievement): keep as `[Proposed]`, or drop?
- keep as `[Proposed]`.

- Q12. Does the Return Home completion bonus replace or add to BOSS-REWORK section 4's 60 and 90 minute time bonus?
- yes.

**QA-11 (maxStacks)**

- Q13. When duration is shorter than cooldown the formula gives 0. Floor it at 1?
- Duration is never shorter than cooldown. Upgrades to duration increase it's time. Upgrades to cooldown reduce time. Thus a cooldown upgrade goes from 8s to lower than 8s. A duration upgrade goes from 8s to greater than 8s.

- Q14. Does the formula replace authored values (Metal Claw 2, Meteor Mash 2, Leaf Storm 1), or take the larger of the two?
- All moves have the default of maxStacks=1. Including the authored Metal Claw and Meteor Mash values. This will be used as a balancing lever in later passes.

- Q15. Does it apply to legacy buff moves now (a code change), or only on the new path?
- Only new path.

- Q16. For foe debuff riders and persistent moves (no cooldown), what does "cooldown" mean?
- the maxStacks only apply to self-buffs per the Upgrade Layer.

**QA-10 (Fire Spin)**

- Q17. Fire Spin burn at the full standard length (half-burn dropped)? Does the persistent orbit damage stay as authored?
- Full standard length. Yes.

**QA-13 (gym moves after slice 7)**

- Q18. Slice 7 deletes the legacy path the gym AI uses. Does slice 7 implement option (a) for existing gym moves (Brock), so gyms work between the merge to main and the import branch?
- No. Option A is its own branch. After slice 7, it will either be only Brock spawns the one time or Brock spawns each time a gym is called (however it works easiest in the code). Then we will begin option A and adding the other gyms.

**QA-01 (DECISIONS format)**

- Q19. Use ISO dates, and section-only `Canonical:` (no line numbers)?
- Yes

- Q20. Superseded entries move verbatim to the archive (the proposed format has no Superseded status)?
- Yes

**QA-07 (approval tags)**

- Q21. Does bulk `[Approved]` cover only items marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED, signed off or [Jess decided], and never DRAFT, PROPOSED, OPEN or TBD?
- Yes

**QA-15 (agent rules)**

- Q22. Is it confirmed that the Quick agent's instructions load CLAUDE.md, and will they be changed the same day as B7?
- Yes, Yes.

**QA-05 (slice files and handoffs)**

- Q23. Unexecuted 4c handoffs get pointers plus a conflict list only, with no rewritten build steps?
- Yes.

**Close-out**

- Q24. Delete temp-audit-outputs/ before the merge (git history keeps it), or keep the ledger in docs/?
- I will delete the temp-audit-outputs prior to merge.


---

## B. Revised Phase 4 plan

### Comparison with phase-3a-migration-plan.md

With the coding pause, the order follows dependency, not the coding schedule: general combat rules before move-specific rulings; canonical homes before agent pointers; content before the DECISIONS conversion; renames last and separately.

**Still holds:** copy, verify, then trim as two commits per batch; the ledger; agent changes late; the DECISIONS conversion after its targets exist; the completion criteria and the automated-check list.

**Broken by the answers:**

- "No renames, one new file" is now two new files (MOVE-INTENT.md from QA-04), with renames possible.
- B3's "between 4c sub-slices" timing and B0's interim slice-overview pointer are pointless now (QA-00). The pointer would be a fourth pointer.
- "Handoffs left as written" changes under QA-05.
- B7's CONTEXT pointer-block fallback is dropped (QA-15).
- B5 must encode QA-08's reversals of LOCKED rules.

**Wrong anyway:**

- check.js treated as proof that no code changed.
- B0 records QA answers in the old DECISIONS format, which B8 then reconverts.
- Tags defined "in CLAUDE.md or CONTEXT.md"; QA-15 means CLAUDE.md only.
- A spec header on CLAUDE.md, which is not a spec.
- Nothing about merging back, the committed temp-audit-outputs, slice-7.md:6, gated code comments, or the player trap rule.
- No way to mark "approved but code differs".

### Batches

Every two-commit batch has the same rollback: revert (b), then (a). Single-commit batches: revert the commit.

**B0. Baseline**

- Prerequisites: CP0 (Q1 to Q24 answered, or knowingly left `[Open]`).
- Files: STATE.md (active work is the consolidation; coding paused per QA-00); new working ledger temp-audit-outputs/phase-4-ledger.md; an addendum to the answers file with the one-line answers.
- Not in this batch: the draft's interim pointer, and DECISIONS entries (written as each canonical section lands, so every `Canonical:` resolves).
- Commits: 1. Risk: low.

**B1. Reference fixes**

- Covers R-01 and Phase 3 batch 1, per reference-integrity.md.
- Excludes citations of files that Q1 might rename.
- CLAUDE.md and CONTEXT.md: the `delete/` to `_delete_/` change only.
- Commits: 1. Validation: rerun the reference check.

**B2. Destinations**

- R-14 headers on GDD, BOSS-REWORK, GYM-ROSTERS, BOSS-AUTHORING, MOVE-AXIS-SCHEMA, combat-architecture, combat-validation, ONBOARDING, SIM-PRESENT-BOUNDARY (R-12) and BALANCE.
- New files: skeletons of docs/COMBAT-RULES.md and docs/MOVE-INTENT.md.
- CLAUDE.md: a tag-vocabulary paragraph. The only CLAUDE.md change before B7, purely additive.
- Ledger seeded from every consolidation-map section 4 source row plus every QA and Q answer.
- Headers say "Last reconciled: not yet".
- Commits: 1. Stop: CP1.

**B3. Combat rules** (QA-03, QA-10, QA-11, QA-12, R-05, R-10, R-11)

- Fill COMBAT-RULES from: DECISIONS 2026-10-17 (stats, damage, orthogonal dials, G.Stats) and the 2026-10-18 swap rule; archive Slices A to E2e and DoT; BOSS-REWORK 3c; stat-model notes section 4; shared parts of architecture D6 to D11 and D30.
- Trap: the enemy rule from QA-10 is `[Approved]`; E1 and Fire Spin strip/burnHalf are `[Legacy behavior]`; the player trap rule is kept unchanged.
- Commit (b): BOSS-REWORK 3c becomes a pointer plus gym-only rules; BUFF-TABLE repoints; D6 to D11 keep only move-path specifics; stat-model notes get a history header.
- Risk: medium-high. Validation: formulas compared against stats.js, types.js, status.js and stages.js; a search for "2L/5" finds full text only in COMBAT-RULES.
- Stop: CP2 before (b).

**B4. Move schema** (QA-04, QA-05, QA-11 grammar default, R-02, R-03, R-04, R-06, R-16)

- MOVE-AXIS-SCHEMA gets the grammar, file roles and the maxStacks default per Q13 to Q16, with a code-gap note; combat-architecture gets the runtime rules; MOVE-INTENT.md gets the per-move rulings.
- QA-04 precedence: a MOVE-INTENT ruling overrides COMBAT-RULES and MOVE-AXIS-SCHEMA defaults for that move. It cannot require something the grammar cannot express; that becomes an `[Open]` grammar gap.
- QA-04 scenarios: combat-validation section 2.5 keeps its scenarios as validation material. Each ruling sentence moves to MOVE-INTENT, and each scenario links to it.
- Name collision: the planned move-intent-scenarios.json (section 1.4) is named in the MOVE-INTENT header.
- Commit (b): review section 9 gets a history header with "absorbed into" pointers; slice-overview's "single source" line repointed; executed slices (stage-0, 1 to 4b, handoffs 2, 3d, 4a, 4b) get history headers; unexecuted slices (4c, 4c-1 to 4c-3, 4d, 5, 6, 7) have decision sections replaced by pointers; slice-7.md:6 rewritten; QA-13 recorded `[Open]` in slice-7.md.
- Note: the only 4c handoff touching Fire Spin or maxStacks (4c-1) already matches QA-10 and Leaf Storm maxStacks 1.
- Risk: high. Stop: CP3 (handoff conflict list and MOVE-INTENT content).

**B5. Progression** (QA-06, QA-08, R-07, R-08, R-09)

- Commit (a1): consolidate existing rules (escalation into section 3, badge rules, archive boss entries, duplicates resolved). Section numbers 2 and 3 stay (cited by elites.js and gym.js).
- Commit (a2): QA-08 as a dated design change; reversed LOCKED items go to history.
- Commit (b): change log and touch points to the archive; GYM-ROSTERS rules become a pointer; BOSS-AUTHORING header "implemented for Brock"; FULL-GAME-STRUCT gets a history header but stays in place (gyms.js:19 cites it); DECISIONS Phase 2 text to the archive; QA-13 recorded `[Open]` in BOSS-REWORK 3a.
- Stop: CP4 before (a2).

**B6. GDD umbrella** (QA-02, QA-14, D-07, QA-08 meta)

- A bounded archive read comes first and produces ledger rows. Conflicts with code go to the owner at CP5.
- Commit (a): the new GDD, including the meta and endgame section.
- Commit (b): old decision log to history; GLOSSARY marks removed systems.
- Risk: highest effort. Time-box it.

**B7. Agent rules** (QA-15)

- CLAUDE.md: coding conventions, the precedence paragraph, the skills line, the "where current rules live" list; Session rituals becomes a pointer.
- CONTEXT.md: rule reminders removed. STATE.md: "Standing rules" removed. slice-overview.md: rules 2 and 5 become pointers.
- Commits: 1, so a single revert undoes it. Stop: CP6 before and after.

**B8. DECISIONS log** (QA-01, R-15, R-11, R-10)

- Commit (a): verbatim copies to DECISIONS-archive under "current rule in" headers; every QA answer gets a new-format entry.
- Commit (b): existing entries reduced to log form; history banners and the archive header added.
- Validation: every `Canonical:` target resolves; no superseded value remains ("never runs git", "30-min", "bridge", "2.0" near DMG_SCALAR).

**B9. Renames** (only if Q1 = now)

- Commit 1: the moves only, no content edits, so git detects the renames.
- Commit 2: Markdown citations.
- Commit 3 (gated): JS comments, under a separate prose plan and the owner's OK.
- Stop: CP7.

**B10. Close-out**

- Run every automated check from the draft; one reviewer pass per subject; zero unticked ledger rows.
- Rewrite STATE.md; DEVLOG entry naming the commit that holds the ledger.
- Remove temp-audit-outputs (per Q24). Merge.
- Stop: CP8.

### Gates

- **Before any rename:** B3 to B8 committed; fresh grep of citations; prose plan for the JS comments approved; archive and DEVLOG citations left as historical text with a one-line "renamed on" note in each archive header.
- **Before any pointer is removed:** the destination row is ticked in the ledger and the (a) commit exists. Rows with changed wording are ticked by the owner, not the executor.
- **Before CLAUDE.md or CONTEXT.md change (B7):** every target in the "where rules live" list exists, Q22 confirmed, and a fresh-session test ready in both tools.

### Commit commands (the owner runs these)

Commit what is pending now:

```
git add -- temp-audit-outputs/phase-3a-owner-questionnaire-answers.md temp-audit-outputs/phase-3a-review-prompt.md temp-audit-outputs/phase-4-plan.md
git commit -m "docs(audit): Phase 3A owner answers, Phase 4 review prompt and plan"
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
- `docs(B5a2): record 2026-10-28 run loop design (QA-08)`
- `docs(B5b): move boss tracker history to archive, repoint rosters and FULL-GAME-STRUCT`
- `docs(B6a): rewrite GDD as living umbrella`
- `docs(B6b): GDD decision log to history, glossary marks`
- `docs(B7): agent rules live only in CLAUDE.md`
- `docs(B8a): archive full decision texts with current-rule headers`
- `docs(B8b): convert DECISIONS.md to decision log`
- `docs(B9): move boss docs` (moves only)
- `docs(B9): update boss doc citations`
- `docs(B10): remove audit working files`

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

- The third command must print nothing until B9 commit 3. This is the real "no code touched" proof.
- The fourth must print nothing (em-dashes in added lines).
- check.js is a sanity check only.

### Checkpoints (the executor stops and waits for the owner's OK)

| | When | What the owner approves |
| --- | --- | --- |
| CP0 | Before B0 | Answers to Q1 to Q24 |
| CP1 | After B2 | "Owns" boundaries in the headers, and the tag paragraph |
| CP2 | B3, before (b) | QA-10 and QA-11 wording, plus every ledger row whose wording changed |
| CP3 | B4, before (b) | MOVE-INTENT content and the handoff conflict list |
| CP4 | B5, before (a2) | QA-08 encoding and the list of reversed LOCKED rules |
| CP5 | B6, after the bounded read | Conflicts between the archive and code |
| CP6 | Before and after B7 | Before: the Quick agent loads CLAUDE.md. After: a fresh session in both tools passes "catch me up" and "where is the trap rule" |
| CP7 | Before B9 | Renames go or no-go, plus the JS comment prose plan |
| CP8 | Before merge | Ledger closed and checks clean |

### Files created, renamed, moved or deleted

| File | Action | Citations to update | Gated code? |
| --- | --- | --- | --- |
| docs/COMBAT-RULES.md | create (B2) | New pointers from BOSS-REWORK 3c, BUFF-TABLE, architecture D6-D11, GDD and the CLAUDE.md list | no |
| docs/MOVE-INTENT.md | create (B2) | New pointers from combat-validation 2.5 and 3.6, slice-overview, MOVE-AXIS-SCHEMA, architecture and the review section 9 header | no |
| temp-audit-outputs/phase-4-ledger.md | create (B0), delete (B10) | none | no |
| BOSS-REWORK.md moved to docs/BOSS-REWORK.md | B9, only if Q1 = now | Markdown: CONTEXT.md, TODO.md, BOSS-AUTHORING, GYM-ROSTERS, plus any added in B2 to B8 (grep again). JS: `js/systems/elites.js:6`, `js/systems/gym.js:7`. Archives: leave as history. | yes (JS files) |
| docs/BOSS-AUTHORING.md renamed to docs/BOSS-REWORK-AUTHORING.md | B9, only if Q1 = now | Markdown: BOSS-REWORK.md, GYM-ROSTERS. JS: `js/data/gyms.js:2`, `js/systems/gym.js:7` | yes |
| temp-audit-outputs/ | delete (B10, per Q24) | none found outside itself (grep again at B10) | no |
| docs/FULL-GAME-STRUCT.md | not moved; gets a history header | `js/data/gyms.js:19` keeps resolving | no |

### Precedence changes

1. DECISIONS.md stops being a settled register and becomes a log. The spec named in `Canonical:` wins (QA-01).
2. Review section 9 loses "single source". MOVE-AXIS-SCHEMA owns grammar, combat-architecture owns runtime, MOVE-INTENT owns per-move rulings (QA-05).
3. MOVE-INTENT beats COMBAT-RULES and grammar defaults for the named move (QA-04).
4. COMBAT-RULES beats BOSS-REWORK 3c, the archive, stat-model notes, BUFF-TABLE, BALANCE and architecture D6-D11 for combat rules (QA-03).
5. GDD changes from "authoritative" to umbrella; subsystem specs win (QA-02). The CLAUDE.md reference line changes to say so.
6. BOSS-REWORK goes from tracker to progression spec; STATE owns tracking. QA-08 overrides its LOCKED cadence and Elite Four items (QA-06, QA-08).
7. FULL-GAME-STRUCT becomes history. GYM-ROSTERS rules defer to BOSS-REWORK (QA-08, R-09).
8. CLAUDE.md is the only home for agent rules. CONTEXT, STATE, slice-overview and DECISIONS lose rule text (QA-15).
9. DECISIONS-archive moves from "cited as live" to history after extraction (R-10).
10. Stage rules: a per-move cap layered under the +-6 ladder. The QA-10 trap rule beats E1 on enemies (QA-10, QA-11).

---

## C. Executor guardrails

**Must not:**

- Edit js/, dev.html, tools/, css, assets or package files. Run repo-changing git or gh.
- Resolve an unanswered question by picking an option. Write `[Open]` with the question, and stop if it blocks.
- Change a rule's meaning while copying it. Every wording change gets an old-text, new-text ledger row ticked by the owner.
- Rewrite handoff build steps, "improve" designs or retune numbers. Numbers read "current value: see <file>".
- Create files beyond the two specs and the ledger, or rename anything outside B9.
- Trim a source before its ledger row is ticked and its (a) commit exists.
- Edit history text beyond adding headers, or mass-fix em-dashes in archives (D-05).
- Overwrite the player trap rule with the enemy rule.

**Must stop and ask** about: a contradiction the QA answers do not cover, or a doc that disagrees with code. Rules from QA-07 group 2 (Checkpoint 1 Q1 to Q17) are AI-recorded (EC-01): tag them per QA-07 but flag the rows in the ledger for owner spot-check.

**Tags (QA-07):**

- `[Approved]`: a source item marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED, signed off or [Jess decided] that no later item supersedes; every QA and Q answer; the section E items. A TUNE value is still approved; the value is a dial.
- `[Legacy behavior]`: what the live path does when it differs from the approved rule. Always name the slice that removes it (Fire Spin strip and burnHalf at `js/data/moves.js:61`, E1, the legacy "duration/cooldown is the cap").
- `[Proposed]`: anything marked DRAFT, PROPOSED, recommend or TBD; the mainline type chart (on hold); FGS items pending Q11; GDD rules from the bounded read that code does not confirm.
- `[Open]`: explicit OPEN items, unanswered review questions, QA-13's bridging question.
- Not tags: "superseded" (that text goes to history), and "approved but not built" (the `[Approved]` tag plus a short "code differs, see TODO" note; the gap list lives in STATE.md and TODO).
- Tie-break: a later dated owner decision wins. The 2026-10-28 answers beat everything earlier. Two conflicting sources with the same date become `[Open]`, and the executor stops.

**Ledger and temp-audit-outputs:**

- Ledger columns: source path and section, verbatim source excerpt, destination, tag, QA/Q dependency, wording-changed flag, reviewer tick.
- At B10: zero unticked rows. The DEVLOG entry names the commit hash that last contains the ledger. temp-audit-outputs is deleted in its own commit before the merge.

---

## D. Risks and alternatives

### Top five risks

1. **QA-08 and QA-11 ambiguities written down as `[Approved]`, so the next coding chat builds a guess.** Mitigation: CP0, CP2 and CP4; anything unanswered stays `[Open]`.
2. **Meaning drift while copying dense archive and Checkpoint text.** Mitigation: verbatim excerpts in the ledger; the owner ticks every row whose wording changed.
3. **B7 breaks startup for one of the tools.** Mitigation: CP6, B7 as a single commit, a same-day Quick update.
4. **Specs say one thing and code another** (QA-10 and QA-11 rules not built; the maxStacks default is 6 in code), and a later chat "fixes" the wrong side. Mitigation: code-gap notes, the gap list in STATE.md, the section E follow-ups.
5. **The merge carries about 15k lines of audit files into feature-test, or renames break comments in gated code.** Mitigation: the B10 delete commit, a `--no-ff` merge, B9 last and gated.

### Deviations from the owner's answers

- **QA-06 renames: defer to the organization branch.** Rename detection and review work better when a file's path does not change in the same branch that rewrites most of its content. The renames also need a gated code edit, and the planned regional split of GYM-ROSTERS will re-touch the same citations. Doing it now costs one extra gated prose plan and about 25 citation edits, then roughly the same again at the split.
- **QA-01 format: ISO dates and section-only `Canonical:` lines.** Line numbers shift in every later batch, so every entry would need reconciling again at B10. A different date format also breaks sorting and grep against everything else in the repo.
- **QA-05 handoffs: pointers plus a conflict list, not rewrites.** Unexecuted handoffs are build contracts; rewriting them during a docs pass mixes planning with consolidation.
- **QA-08 recorded in a docs branch: accept it, only as its own commit (B5a2) with the reversed LOCKED rules listed at CP4.** The alternative (leave QA-08 out and write a short design spec later) is cleaner but leaves five competing loop statements live through the merge, which defeats the audit. The owner's way is right once Q2 to Q12 are answered.
- **QA-07 bulk approval: fine, with one exception.** Spot-check the Checkpoint 1 Q1 to Q17 rows. The originals were never committed, so "approved" there means an AI's record of what was said.

---

## E. Out of scope (each needs its own prose plan)

- **QA-11:** default maxStacks in move-attributes.js; the resolver deriving maxStacks from upgraded duration and cooldown; possibly the legacy stage path (Q15); re-check the D-2 data values.
- **QA-10:** remove legacy Fire Spin strip and burnHalf, or leave it to slice 7. Confirm whether E1 still blocks trapping enemies on the live path.
- **QA-08:** gym and elite cadence anchors, the escalation step, the clamp and ramp in `levelForTime`; sequential Elite Four; the end-of-region choice UI, Next Region carry-over and loop selection; Legendary arena, The Climb with team lock, Arceus, Descendant Mutation; completion bonuses; backward-compatible save fields for all of these.
- **QA-13:** boss forms and gym casts on the new definitions in slice 7 (Q18); the gym-roster move import branch.
- **B9 (if done):** comment repoints in `js/systems/elites.js`, `js/systems/gym.js` and `js/data/gyms.js`.
- **Existing items:** optional tools/ check scripts; the BOSS-REWORK section 5 cleanup (BOSS_SLOTS, judgment.js); the elite cadence hook (D-06); the mainline type chart (QA-12, on hold).
