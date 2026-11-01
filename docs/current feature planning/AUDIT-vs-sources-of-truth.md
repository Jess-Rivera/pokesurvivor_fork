# Audit: planning docs vs sources of truth

Date: 2026-10-28. Branch: feature-test/new-move-schema (after 04ecc29). Read-only audit; no other file was changed. Scope and rules: post-authority-audit-prompt.txt. All three tiers were covered in one pass (built slices with a HISTORY banner were checked by banner and keyword search, see section 7).

## 1. Summary

Counts: HIGH 3 (2 of them need an owner decision), MEDIUM 20, LOW 11, SUSPECTED 3.

Most need your attention:
1. **Leaf Storm's self-drop (4c-1) cannot be built as ruled.** The 4c-1 conflict list says not to follow P6 and Test 5 (per-hit refresh), but MOVE-INTENT records the replacement ("held while active, then standard duration") as an [Open] grammar gap. The coding chat has no buildable instruction. Needs owner decision (2.1).
2. **Psychic steering (4c-3): one re-pick or keep re-picking?** MOVE-INTENT says "cast target while it lives, then the nearest enemy"; architecture D23 and the 4c-3 handoff say exactly one re-pick, then straight, and the mutation list treats more re-picks as a bug. Needs owner decision (2.2).
3. **slice-4c.md Build says aimTrack follows "the nearest enemy"**, which contradicts the approved sticky rule (MOVE-INTENT flamethrower) and is not in slice-4c's own conflict list (3.2, F-4C-1).
4. **Bare Q-numbers now mean two things.** DECISIONS.md Q1 to Q24 (2026-10-28 owner answers) collide with review Checkpoint 1 Q1 to Q17, which architecture, validation, slice-4c and the 4c handoffs still cite bare (for example "Q17" is delay in 4c-3 but Fire Spin in DECISIONS) (3.1, F-ARCH-1).
5. **Orphaned local decision IDs in the 4c handoffs.** 4c-2 P8 cites "(D2)" and "(D3)", 4c-3 P2 cites "(D1, D2)"; the local decision list was moved out, so these now resolve to architecture D1 to D3 (basePower, cd formula, cast interval) (3.3, F-4C2-1).

## 2. Needs owner decision

### 2.1 Leaf Storm Sp. Atk -2 lifetime (HIGH, blocks 4c-1 P6 and Test 5)
- slice-4c-1-codehandoff.md, P6: "its 6 s duration refreshes on each hit". Tests item 5: "refreshes its 6 s each hit, and recovers 6 s after the last hit".
- Same file, "Conflicts with the owning documents": "conflicts with the CP3 ruling ... the Sp. Atk -2 stays on while the move is active, hit or not, then lasts the standard duration ... The grammar gap is [Open]."
- docs/MOVE-INTENT.md, leaf-storm: [Approved] "The drop stays on for as long as the move is active ..." and [Open] "Grammar gap: a `stat` effect has one `duration`; the grammar cannot say 'held while the move is active, then the standard duration' ... Not resolved here; the grammar is not changed."
- Authority: MOVE-INTENT wins for the named move, but it says the ruling cannot require what the grammar cannot express (its own precedence line), and the handoff rule says a new field or rule is a stop-and-ask.
- Reading A: build 4c-1 as written (per-hit refresh, can lapse with no enemy in reach) and leave the gap [Open] for a later slice.
- Reading B: resolve the grammar gap first (a new field or a persistent-move runtime rule in combat-architecture), then build the CP3 behavior in 4c-1.

### 2.2 Psychic steering target after the cast target dies (HIGH, 4c-3)
- docs/MOVE-INTENT.md, psychic: "travels and steers (cast target while it lives, then the nearest enemy)".
- combat-architecture.md D23: "The steering target is the cast target while it lives, then ONE re-pick of the nearest live enemy within range of the instance; after that it flies straight". Same in H11 (S4).
- slice-4c-3-codehandoff.md P7 and Test 6: "toward the cast target then ONE re-pick"; Mutation list: "Psychic ... re-picks every step" is a defect.
- Authority: MOVE-INTENT beats runtime defaults for the named move, but its wording does not say whether "then the nearest" is one re-pick or continuous. The map does not decide it.
- Reading A: one re-pick then straight (D23, as built in 3c and as planned in 4c-3).
- Reading B: re-pick the nearest whenever the target is lost (like the sticky aimTrack rule for Flamethrower); then D23 needs a Psychic exception and 4c-3 Test 6 and the mutation change.

## 3. Confirmed findings

### 3.1 combat-architecture.md

- **F-ARCH-1 (MEDIUM, C) Bare Q-numbers collide with DECISIONS.md.** Architecture uses review CP1 numbering: "DECIDED Q14: every eligible hit rolls" (C8 row procAilments; D32), "DECIDED Q13" turnRate (C8, D23), "DECIDED Q17" delay (B step 5), "DECIDED Q4" (C8, D30), "Q5" trap (D32), "Q8" range (D26). DECISIONS.md now has Q13 "duration never shorter than cooldown", Q14 "maxStacks 1", Q16 "foe debuffs have no per-move cap", Q17 "Fire Spin", Q4 "Gate escalation", Q5 "Level is linear to L50", Q8 "Unlock Safeties". COMBAT-RULES and MOVE-AXIS-SCHEMA already disambiguate with "CP1-Q4", "CP1-Q1". Same issue in combat-validation (section 0, 2.5), slice-4c.md, and all three 4c handoffs ("Q3 decided" in 4c-2; "Q13", "Q17" in 4c-3 P2, P5). Change: prefix review numbers as CP1-Qn in every in-scope doc.
- **F-ARCH-2 (MEDIUM, F) "Summary for approval" is stale and contradicts decisions.** It lists as BLOCKING: D-1, "Q8 ... nearest acquisition 520 px", "Q16 Spikes lifetime (recommend a timeout)", D-2 "Before slice 4a", D-3, D-4, D25. Owners: MOVE-AXIS-SCHEMA `range` row (global default 420), MOVE-INTENT spikes ("Keeps no timeout"), MOVE-INTENT meteor-mash (D-3), H7 (D-4), H15 (D25), Q14 (maxStacks). Section H's "row here wins" note covers D and R rows, not this summary. Change: mark the summary historical or trim it to a pointer to section H.
- **F-ARCH-3 (MEDIUM, A) Metal Claw cap still open in "Other interactions".** Line: "Recommend data maxStacks 1 on Leaf Storm ... and a small cap on Metal Claw. OPEN D-2." COMBAT-RULES "Stat stages and maxStacks": "Default is 1 for every move, including Metal Claw and Meteor Mash." COMBAT-RULES wins (combat rules). Change: point the bullet at COMBAT-RULES and H16.
- **F-ARCH-4 (MEDIUM, A/D) C8 row for G.Stages describes the code's cap as the rule.** "G.Stages.add / teamAdd / mul / ladder | KEEP, add a per-move live-application cap | DECIDED Q4 maxStacks semantics". No self-buff limit and no gap note. COMBAT-RULES: "Per-move maxStacks applies to self-buffs only"; "Foe debuffs have no per-move cap"; STATE lists the stages.js foe cap as a known gap. D30 is correct; C8 is not. Change: limit the C8 wording to self-buffs and add the "code differs, see TODO" note.
- **F-ARCH-5 (MEDIUM, F) Section G is superseded but reads as live.** Line 11: slice files "get rewritten only after approval"; G slice 3a: "stat defaults duration 6 and maxStacks 6" (contradicts Q14, COMBAT-RULES); G 4c has no 4c-1/2/3 split; G Slices 5 to 7 says "Keep the existing placeholders". The slice files are now the plans. Change: mark section G historical, pointing at slice-overview.md.
- **F-ARCH-6 (MEDIUM, C) Status line points at the review as the tracker.** Line 9: "open items are tracked in move-consistency-review.md section 9. Nothing here is built." The review is history; slices 3b to 4b are built. Change: repoint to section H and STATE, drop "Nothing here is built".
- **F-ARCH-7 (LOW, F) Stale OPEN notes in D and R rows** superseded by H: D25 "OPEN: legacy squashes y" (H15), D26 "needs the new range field (OPEN Q8)", D32 "needs a status.js change" (built in 4a), R6 "OPEN D-3 ... Recommend yes" (MOVE-INTENT meteor-mash). H says its rows win, so no build risk.
- **F-ARCH-8 (LOW, D) Labels.** Status says "APPROVED ... PROPOSED items accepted as written", yet D, E, F rows still say PROPOSED; H9 is tagged "[Approved] (PROPOSED, accepted ...)". Per CLAUDE.md tags, approved rules should not read as proposed.

### 3.2 slice-4c.md

- **F-4C-1 (HIGH, A/E) aimTrack target.** Build: "aimTrack rotates a static shape's facing toward the nearest enemy." MOVE-INTENT flamethrower: "The aimTrack target rule is sticky: the cast target while it lives and is in range, then the nearest, re-picked whenever lost." 4c-3 P2 builds sticky. MOVE-INTENT wins. slice-4c's conflict list covers only "Reads". A coding chat reads slice-4c.md before the handoff. Change: add this line to the conflict list or point the bullet at MOVE-INTENT.
- **F-4C-2 (MEDIUM, E) R2 test wording.** Tests: "R2: a two-leg move gives exactly 2 hits per enemy per leg". 4c-2 Test 2 and validation 2.5 scenario 2: "exactly 2 hits per enemy per bone, one per leg". As written it asks for 4 per bone. Change: correct to "per bone, one per leg".
- **F-4C-3 (LOW, E) Razor Leaf canary.** Tests: "Razor Leaf is not in the canary list, so run it on Bonemerang plus a synthetic move"; Split and DECISIONS 2026-10-27 4c-2: "Razor Leaf joins 4c-2", and 4c-2 P1 routes and tests it. Canary list omits it. Change: add Razor Leaf to the canaries and drop the parenthetical.
- **F-4C-4 (LOW, B) Build bullet "casterState iframes"** omits the ruling (whole dash plus 0.3 s tail, MOVE-INTENT quick-attack). Point at MOVE-INTENT instead of restating.

### 3.3 slice-4c-1, 4c-2, 4c-3 codehandoffs

- **F-4C2-1 (MEDIUM, C) Orphaned local D-IDs.** 4c-2 P8: "Caster state i-frames (D2) and the dash lock (D3)". 4c-3 P2: "aimTrack (D1, D2)". These were the handoffs' own decision numbers; that list was moved out ("Decisions (moved)"). In combat-architecture, D1 is basePower, D2 the cd formula, D3 the cast interval. 4c-1 P6 "(D1)" is correct (basePower). Change: repoint to MOVE-INTENT quick-attack (i-frames, mvRoot) and MOVE-INTENT flamethrower (aimTrack), or drop the IDs.
- **F-4C-ALL-1 (MEDIUM, C) Startup still sends coding chats to the review.** 4c-1: "review section 9.7 item 5"; 4c-2: "Review section 9.1 rows Q2, Q3, Q8 and F5" (F5 is in 9.3, not 9.1); 4c-3: "review section 9.1 row Q17 (delay)". The conflict lists flag the Finish/P-docs edits to the review but not these Startup reads. Owners: H15; MOVE-INTENT quick-attack, bonemerang; MOVE-AXIS-SCHEMA `range` and `delay` rows. Change: add to each conflict list, or repoint Startup.
- **F-4C1-2 (LOW, C) 4c-1 "What the planning chat verified"** says squash is "Decided ... (D25)"; D25 still reads OPEN; the owner is H15.
- No other contradictions found in the 4c handoffs: Fire Spin data and trap (COMBAT-RULES, MOVE-INTENT), Bonemerang clamp, Quick Attack centre landing, i-frames whole dash plus 0.3 s, mvRoot, Rock Slide one boulder and low-opacity ring, Aura Sphere reach, 2.4 validator rules in 4c-1 (MOVE-AXIS-SCHEMA) all agree. Routed count base (21 today, 24 after 4c-1) matches js/systems/move-route.js.

### 3.4 Rule homes for the 2026-10-27 4c decisions

- **F-HOME-1 (MEDIUM, C/F) Two approved rules have no canonical home.** DECISIONS 2026-10-27 "Slice 4c-2 planning": "the pierce budget resets per leg", Canonical: MOVE-INTENT "Per-move rulings". DECISIONS 2026-10-27 "Slice 4c-3 planning": "its location pick uses the seeded rng", same Canonical. Neither rule is in MOVE-INTENT, and combat-architecture R2/D16 (pierce) and R9/selectTarget (location) do not state them. They live only in 4c-2 P2 and 4c-3 P4. The 4c handoffs build them correctly, so this is drift risk, not a wrong build. Change: add both to combat-architecture (R2 or D16; R9 or selectTarget) as runtime rules (they are not per-move).

### 3.5 combat-validation-and-handoff.md

- **F-VAL-1 (MEDIUM, A) Thunderbolt scenario ratios.** 2.5 scenario 4: "four jumps at 33% damage" and Test "damage ratios 1 : 0.33 : 0.33 : 0.33 : 0.33". Architecture D15 and MOVE-INTENT thunderbolt: "x (1 - hopReduction)^k", "100, 67, 44.89, 30.07, 20.15"; slice-4b.md Results measured 1, 0.67, 0.4489. MOVE-INTENT wins. Built already, but Stage 0 (move-intent-scenarios.json, not yet written) is built from these scenarios. Change: correct the scenario and test line or point them at MOVE-INTENT.
- **F-VAL-2 (MEDIUM, A) Nova start size.** Section 0 table: "D-1 | Re-authored novas start near the caster's body radius". 3.6: "16 px unless Jess prefers another". MOVE-AXIS-SCHEMA "Grammar decisions": "Nova start value 1 px (Jess, 2026-10-26)"; slice-3a built 1 px. Section 0 is not under the 3.6 status note, so it reads as current. Change: point section 0 D-1 at MOVE-AXIS-SCHEMA.
- **F-VAL-3 (MEDIUM, E) When the 2.4 validator rules land.** 2.4: "Recommend adding them as validator rules in slice 3a"; 3.8 slice 3a scope: "add the validator rules in 2.4". MOVE-AXIS-SCHEMA "Presets and validation": "added in slice 4c-1 ... not built yet". Later dated owner decision (2026-10-27) wins.
- **F-VAL-4 (MEDIUM, F/C) Section 3.8 reads as live handoff rules.** "Each coding chat receives: this document, combat-architecture.md, the review"; the 3a scope says "stat duration default 6 and maxStacks default 6" (contradicts Q14). Slice-overview now holds the coding-chat rules. Also line 9 "Nothing here is built", 3.9 "should be copied into DECISIONS.md". Change: mark 3.1 to 3.9 historical (3.6 already has a status note), or trim to pointers.
- **F-VAL-5 (MEDIUM, B) "Intended" sentences still duplicated.** 2.5 header: "The 'Intended' sentences are copied there and are removed here in a later commit, once their ledger rows are ticked." DEVLOG B9: "ledger closed with zero unticked rows". All six "Intended" lines and the "Open" lines remain, and several "Open" items are now resolved (Quick Attack F5, Bonemerang F1/F2/S12, Thunderbolt overlap, Psychic, Toxic Spikes F3/F6). Change: remove "Intended" and resolved "Open" lines per the header.
- **F-VAL-6 (LOW, F) Stale status text.** Section 0: "D-2 ... Jess's to-do" (resolved by Q14). 2.1: "Fire Spin's legacy stat strip ... (dropped; confirm this is intended)" (decided, QA-10/Q17). 2.6: trap root "missing (status.js, 4a)" (built). 1.5 4c canary list lacks Razor Leaf and Night Shade (slice-4c split).

### 3.6 move-schema/slice-overview.md

- **F-OV-1 (MEDIUM, C) Rules 1 and 4 treat the review as live.** Rule 1: "Then only the architecture sections the slice names and review section 9." Rule 4: "Record the answer in the slice file and in review section 9." Line 7 of the same file calls the review history; CLAUDE.md names the owners. A coding chat would record new decisions in a frozen history file. Change: point both rules at the four owners (and DECISIONS for the log line).
- **F-OV-2 (MEDIUM, E) Line 3: "Each slice file holds that slice's decisions and plan"** contradicts the "Decisions (moved)" sections and line 24 of the same file.
- **F-OV-3 (MEDIUM, B) Restated rule text.** "File roles" is a full copy (MOVE-AXIS-SCHEMA "File roles" says "Copied from ... slice-overview.md"; DECISIONS 2026-10-25 names MOVE-AXIS-SCHEMA as canonical). Invariants I1 to I10 are restated "in one line each". CLAUDE.md: slice-overview does not restate rule text. Change: keep pointers only.
- **F-OV-4 (LOW, C) Status is stale.** Line 4 "Status updated: 2026-10-27 (slice 4b built, waiting for Jess's playtest)" and slice list "4b. BUILT ... waiting"; STATE: "slices 1 to 3d, 4a, 4b DONE". This file is the "Status home" of MOVE-AXIS-SCHEMA, MOVE-INTENT, architecture and validation.

### 3.7 Slices 4d, 5, 6, 7

- **F-S5-1 (MEDIUM, A) Slice 5 omits the Dragon Dance exception.** Gap note cites "the Q13 invariant (a self-buff's duration is never shorter than its cooldown)". MOVE-INTENT dragon-dance: "Per-move rule over the Q13 invariant: its raises may last shorter than its cooldown ... cap is max(1, min(floor(duration / cooldown), 6))". A plan written from slice-5 alone could enforce Q13 on Dragon Dance and break it. Change: add a pointer to MOVE-INTENT dragon-dance in the gap note.
- **F-S6-1 (LOW, F) Slice 6** lists "the Aura Sphere reach" as a question; MOVE-INTENT aura-sphere: "[Approved] ... is fine, verify only". "F4" should point to H13.
- **F-S4D-1 (LOW, B) Slice 4d Build** restates D29 and H6 numbers (INSTANCE_CAP 8). Accurate today; drift risk only.

### 3.8 Reports and leftover files

- **F-REP-1 (MEDIUM, F) move-parity-report.md is stale and unmarked.** File: "cd differs on 12"; `node tools/move_parity.js` today prints "cd differs on 13" (last regenerated 2026-10-26, 1c5bf4c). The "Jess: intended / regression" column is empty for every row, although slice-3a's "Proceed when" required marking; Dragon Rage (cd 3.5 vs legacy 1) has no note. Change: regenerate with --report and mark it, or label it a snapshot.
- **F-REP-2 (LOW, F) move-coverage-report.md is one line stale.** File: "damage + special:statusBonus (1): hex"; the validator now buckets Hex as "damage + special:chainDamageFalloff + special:statusBonus". Change: regenerate.
- **F-REP-3 (LOW, F) move-schema-slices.md** is a 4-line redirect to slice-overview.md. Nothing in scope links to it (only DEVLOG history). Candidate for deletion.

## 4. Suspected findings

- **S-1 (MEDIUM) Per-leg pierce reset may be an unlisted cross-axis rule.** Architecture F: "R1 to R9 are the complete list ... A new cross-axis rule is a design change: it is added to that list first." 4c-2 P2 resets the pierce budget per leg (pierce x returns), which R2 (hit records by leg) and D16 do not say. It is owner-approved (DECISIONS 2026-10-27), so it is probably an R2 amendment rather than a violation; confirm when acting on F-HOME-1.
- **S-2 (LOW) The sticky aimTrack rule is general, but it is recorded per move.** 4c-3 P2 applies it to every aimTrack move; the only record is MOVE-INTENT flamethrower; MOVE-AXIS-SCHEMA's `aimTrack` row says "follow the nearest enemy". Only Flamethrower uses aimTrack today, so no build risk; 4c-3 P10 already plans the grammar comment update. A runtime home (architecture D23 or E) may be the right place.
- **S-3 (LOW) Slice 4d Gust test assumes the emit design survives.** "Gust emits at 0, 0.08 and 0.16 s" while Gust spread is [Open] (MOVE-INTENT gust); option "a 3-count simultaneous fan" would invalidate the test.

## 5. Broken or stale references

| citing doc | cited target | status |
| --- | --- | --- |
| slice-4c-2-codehandoff P8 | "(D2)", "(D3)" | wrong target: architecture D2 cd formula, D3 cast interval |
| slice-4c-3-codehandoff P2 | "(D1, D2)" | wrong target: architecture D1 basePower, D2 cd formula |
| slice-4c-2-codehandoff Startup | review 9.1 row F5 | F5 is in review 9.3; review is history |
| slice-4c-1 / 4c-3 Startup | review 9.7 item 5; review 9.1 Q17 | history, not in the conflict lists |
| slice-overview rules 1, 4 | review section 9 | history used as live input and decision store |
| architecture line 9 | review section 9 as tracker | history |
| combat-validation 3.8 | "the review" as coding-chat input | history |
| architecture, validation, slice-4c, 4c handoffs | bare Q1 to Q17 | collide with DECISIONS.md Q1 to Q24 |
| all "Decisions (moved)" blocks | "Phase 4 ledger (B4b rows)", "DEVLOG 2026-10-28 B9 entry names the commit" | resolves: DEVLOG names 5274f4b:temp-audit-outputs/phase-4-ledger.md; working tree copy deleted (88fd244) |
| all "Decisions (moved)" blocks | Q23 | resolves (DECISIONS 2026-10-28 Q23) |
| slice-4c-1 Startup | move-attributes.js "rule list at lines 134 to 157" | approximate; rules now run about lines 131 to 158 |
| 4c handoffs | "Contracts" parts of slice-3c.md | section is titled "Contracts for 3d" (3b has "Contracts for 3c and later"); resolves loosely |
| combat-validation 1.4, stage-0 | docs/move_rework_holding/move-intent-scenarios.json | does not exist (planned, Stage 0 not built); correct as a plan |
| DECISIONS 2026-10-27 4c-2, 4c-3 | Canonical: MOVE-INTENT "Per-move rulings" | per-leg pierce and seeded location rng are not there (F-HOME-1) |
| slice-overview line 4 | move-coverage-report.md, move-parity-report.md | exist; both stale (F-REP-1, F-REP-2) |
| architecture I8 | SIM-PRESENT-BOUNDARY Enemy.hurt offender | resolves ("Known offenders", item 1) |
| slice-7 | DMG_SCALAR text fixed in B8 | resolves (no 2.0 left in DECISIONS.md; code 1.0) |
| COMBAT-RULES, MOVE-INTENT | js/data/moves.js:61 strip, burnHalf | resolves |

## 6. Docs that are clean

- stage-0.md, slice-1.md, slice-2.md, slice-3.md, slice-3a.md, slice-3b.md, slice-4.md, slice-4a.md: HISTORY banner present and says the owners win; old values inside (for example maxStacks 6 in 3a and 4a) are history, not live rules.
- slice-7.md: clean; its own gap note already lists the legacy items it must remove, and the QA-13/Q18 Brock-only ruling matches STATE.
- slice-4d.md: clean apart from F-S4D-1 and S-3; its conflict list covers the review citation.
- No em-dashes in any in-scope file. No new Spanish strings, confirm/alert/prompt, stat formulas outside G.Stats, or cloud/MP scope found in planning text (the handoffs exclude co-op and net sync explicitly).

## 7. Not verified, and why

- Built slices slice-2-codehandoff, slice-3c, slice-3d, slice-3d-codehandoff, slice-4a-codehandoff, slice-4b, slice-4b-codehandoff: checked by HISTORY banner and keyword search (review, 9.x, maxStacks, re-pick), not read line by line. All carry the banner, so any old value inside is history by rule.
- The Phase 4 ledger B4b rows (git 5274f4b): not read; I did not verify that each moved decision text matches what now sits in the owners.
- move-consistency-review.md: checked only for its banner and that cited rows exist (9.1 Q1 to Q17, 9.3 F5), as instructed.
- The external Playwright path C:\Users\boric\tools\playwright named in the handoffs: outside the repo.
- Report freshness was checked by running tools/move_parity.js and tools/validate_moves.js without --report (no file written); I did not check whether the parity "cd source" counts are correct beyond the totals.
- Out of scope but noticed: DECISIONS 2026-10-26 normalization entries name MOVE-AXIS-SCHEMA "Formula values" as Canonical, a section about typed formula objects; the no-normalization rule actually lives in architecture D37 and H8.
