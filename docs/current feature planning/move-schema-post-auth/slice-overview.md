# Move schema (#2), post-authority plan: branch overview

- **Role:** The live slice plan for feature-test/new-move-schema from 2026-10-28 to the merge into main.
- **Owns:** Slice order, slice status, routing coverage, the list of open owner decisions per slice, and the rules for coding chats on this branch.
- **Does not own:** Any combat, grammar, runtime or per-move rule. Those live in the documents listed under "Where the rules live"; this folder points, it does not restate.
- **Status home:** this file.
- **Last reconciled:** 2026-10-28, against CLAUDE.md, STATE.md, docs/COMBAT-RULES.md, docs/MOVE-AXIS-SCHEMA.md, docs/MOVE-INTENT.md, combat-architecture.md section H, js/systems/move-route.js and the resolved G.MoveDefs, and the audit in ../AUDIT-vs-sources-of-truth.md.

Replaces: docs/current feature planning/move-schema/ (slice-overview.md and every slice file there is history from now on, except the three 4c codehandoffs, which stay the approved build steps under Q23 and are read with the corrections in this folder).

## Goal and end of the branch

Goal: one data-driven move system. Every player move runs from its resolved definition (G.MoveDefs) through the new modules, dispatched by axis, with no `kind`. What that means in detail: docs/MOVE-AXIS-SCHEMA.md (data) and combat-architecture.md (runtime).

End state (Jess, 2026-10-28):
1. All 63 moves are imported and run on the new path; the legacy player-move path is deleted (slice 7b).
2. The branch merges back into main after slice 7b.
3. A NEW branch then imports the moves the gym rosters need. Until then the gym is Brock only (Q18, QA-13).

## Code-gap rule (Jess, 2026-10-28)

A STATE.md code-gap item is built in this branch only if it is directly associated with, reflected in, or impacted by the move-schema work. Otherwise it waits for its own branch.

| code gap (STATE.md) | in this branch? | slice |
| --- | --- | --- |
| maxStacks default 6 in code, approved 1 | yes | 4c-0 |
| Metal Claw and Meteor Mash authored at 2, approved 1 | yes | 4c-0 |
| Foe debuffs capped per move on the new path | yes | 4c-0 |
| Self-buff maxStacks formula (QA-11, Q15) | yes | 5 |
| Legacy Fire Spin strip and burnHalf | yes, removed with the legacy path | 7b |
| E1 on the live path (QA-10) | yes, verified gone after the flip | 7b |
| QA-13 Brock-only gym fallback | yes | 7a, 7b |
| Leaf Storm "held while active" grammar gap | yes | 4c-1 (decision first) |
| QA-08 run loop | no, own branch | none |
| Boss doc renames and comment repoints (Q1, QA-06) | no, organization branch | none |
| DoT on base HP for elites, Shedinja 1 HP, Speed-bounds doc wording (COMBAT-RULES gaps) | no, own branch | none |

## Where the rules live

CLAUDE.md "Where current rules live" and "Which document wins". In short: general combat rules in docs/COMBAT-RULES.md; move data grammar in docs/MOVE-AXIS-SCHEMA.md; runtime in combat-architecture.md (section H wins over older D and R rows); per-move rulings in docs/MOVE-INTENT.md; validation scenarios in combat-validation-and-handoff.md. The invariants I1 to I10 are in architecture section A. move-consistency-review.md is history: never a reading for a coding chat and never the place to record a decision.

## Done (history in ../move-schema/)

Slices 1, 2, 3a, 3b, 3c, 3d, 4a, 4b are built and signed off (STATE.md). check.js after 4b: 21/21 harnesses, I1 guard ok, move data ok.

## Routing coverage (21 of 63 routed today)

| slice | moves added to the routed list | routed after |
| --- | --- | --- |
| built (3c to 4b) | tackle, ember, water-gun, hydro-pump, heat-wave, mud-shot, flamethrower, body-slam, string-shot, ice-beam, bite, psycho-cut, giga-drain, bulldoze, swords-dance, dragon-dance, aqua-ring, substitute, dragon-rage, hex, thunderbolt | 21 |
| 4c-1 | fire-spin, leaf-storm, night-shade | 24 |
| 4c-2 | razor-leaf, bonemerang, quick-attack, aerial-ace | 28 |
| 4c-3 | psychic, confusion, bubble-beam, aura-sphere, rock-slide | 33 |
| 4r | the 19 plain moves plus bug-buzz (list in slice-4r.md) | 53 |
| 4d | discharge, gust, toxic, fairy-wind, toxic-spikes, meteor-mash, will-o-wisp, flame-wheel, spikes | 62 |
| decision D-HAIL | hail | 63 or removed |

## Slices, in order

| # | slice | status | blocked by |
| --- | --- | --- | --- |
| 0 | slice-0-doc-fixes.md: apply the audit fixes and repoint status homes | waiting for Jess to approve the item list | none |
| 1 | slice-4c-0.md: maxStacks default 1 and the foe-debuff cap | to plan | D-FOECAP |
| 2 | slice-4c-1.md: persistence and orbits | handoff written | D-LEAF |
| 3 | slice-4c-2.md: returns and repositions | handoff written | 4c-1 |
| 4 | slice-4c-3.md: delay, falls, aimTrack, travelling moves | handoff written | D-PSY |
| 5 | slice-4r.md: route the remaining plain moves and Bug Buzz | to plan | 4c-1 |
| par | stage-0.md: resolved-move report and intent scenarios | to plan, any time | none (needed before 4d closes) |
| 6 | slice-4d.md: emitters, mines, the instance cap | to plan | D-GUST, D-LOC, stage-0 |
| 7 | slice-5.md: upgrades from fields and the self-buff formula | to plan | D-MC5 |
| 8 | slice-6.md: damage simulator, balance pass, stress run | to plan | 5 |
| 9 | slice-7a.md: non-player readers off `kind` (bosses, gyms, UI) | to plan | D-ENEMY, D-COOP |
| 10 | slice-7b.md: flip, purge and merge into main | to plan | D-HAIL, 7a |

Each slice is signed off by Jess (feel test) before the next starts. 4c-0 and 4r may swap with neighbours if Jess prefers; 4r needs only 4c-1.

## Open owner decisions (each blocks the slice named)

| id | question | blocks | where it is recorded |
| --- | --- | --- | --- |
| D-LEAF | Leaf Storm self Sp. Atk -2: build per-hit refresh now, or resolve the grammar gap first (held while active, then standard duration) | 4c-1 | MOVE-INTENT leaf-storm [Open]; audit 2.1 |
| D-PSY | Psychic after its target dies: one re-pick then straight (D23), or re-pick whenever lost | 4c-3 | MOVE-INTENT psychic; audit 2.2 |
| D-FOECAP | How a per-move foe cap (Ice Beam, Bug Buzz authored 1) is told apart from the default once the default is 1 | 4c-0 | slice-4c-0.md |
| D-GUST | Gust per-shot spread | 4d | MOVE-INTENT gust [Open] |
| D-LOC | locationPick for Spikes, Toxic Spikes, Will-O-Wisp (resolver default is enemy; legacy placed mines at the caster's feet) | 4d | slice-4d.md |
| D-MC5 | The QA-11 formula gives Metal Claw min(floor(6 / 0.5), 6) = 6 and Meteor Mash 3, while MOVE-INTENT rules both at 1 | 5 | slice-5.md |
| D-ENEMY | How bosses and gym leaders cast once `kind` and the legacy fields are gone | 7a | slice-7a.md |
| D-COOP | What co-op does after the flip (co-op stays legacy today; net work is deferred scope) | 7a | slice-7a.md |
| D-HAIL | Hail at the flip: build the toggle here, route it as a plain cast, or pull it from the pool | 7b | MOVE-INTENT hail; slice-7b.md |
| C14 | power 0 vs null (Will-O-Wisp, Substitute), harmless | none | MOVE-AXIS-SCHEMA [Open] |

## Rules for every coding chat on this branch

1. Startup: CONTEXT.md, STATE.md, CLAUDE.md (auto), this file, the slice file, then only the owner sections the slice names. Never read the review, moves-generated.js or moves.js whole. Search code by function name.
2. Game code and game data (including files the game does not load yet) follow CLAUDE.md "Edit boundary and workflow": prose plan, Jess's OK, then build, test and write in one step.
3. Do not change the invariants (architecture A), the frame order (B), D-table rules marked EXISTING or DECIDED, the cross-axis list R1 to R9 (plus section H), or G.Combat's ownership of enemy shots and contact damage.
4. A new cross-axis rule, a new field or a different formula is a stop-and-ask. Record Jess's answer in the owner document (grammar: MOVE-AXIS-SCHEMA; runtime: architecture H; one move: MOVE-INTENT; combat: COMBAT-RULES), add a dated DECISIONS.md log line with its `Canonical:`, and note it in the slice file's Results.
5. Done means: the slice's canaries pass, every earlier harness and scenario still passes, `node tools/check.js` is green, the slice file's Results and this file's status table are updated, STATE.md is rewritten and a DEVLOG.md entry appended, and Jess gets the git commands (CLAUDE.md "Git").
6. Old handoffs say to update files in ../move-schema/ (slice-4c.md, slice-overview.md) and review section 9: update this folder instead, and never the review.
