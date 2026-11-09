# Branch rules: feature/gym-leader-ai

Rules that hold only while this branch is open. Read at session start when STATE.md names this branch. General agent rules stay in CLAUDE.md; where the two differ for work on this branch, this file wins.

## What this branch builds
The leader AI: the AI player that drives Player-entity leaders. Spec: docs/LEADER-AI.md (it wins over every older leader-AI text). The old proposal (docs/proposals/gym-leader-ai-design.md) and the slice 9 v2 map are history; do not build on them.
Slices, in order: #22 (slice 1), #31, #32, #33, #34 (5a, GymBrain out), then #40, #41, #42 (the GymBrain shape out, all before 5b; #42 ruled and closed 2026-11-09), #43 (movement split, takes #42 item 13; shipped 2026-11-09), #47 (leader attacks wait on your cast gate, after #43), then #39 (5b, personalities). Any time: #45 (strongHost out, behavior-neutral). After #43, not needed before #39: #46 (explicit sides, leaders off the enemy list). Roster UI: #35 (independent).

## Slice shape (Jess, 2026-11-08)
Every slice opens with three things, agreed with Jess before any build: its goal, how we know it is done, and the test that validates it (written at the slice's start, as the end-goal test). Then the prose plan (CLAUDE.md "Edit boundary and workflow") and the build. A slice closes by updating every doc, issue and plan it touched. The slice's issue carries the three opening items as its done-condition.

## Why #40 to #42 exist (Jess, 2026-11-09)
Slice 5a had to change no behavior, so it moved GymBrain's one step (move, choose, cast, all skipped while stunned) into the AI player whole. The old brain's shape survived inside a Player-entity leader, and nobody compared it to your frame. #40 to #42 remove that shape. They come before #39, because personalities would be built on top of it.
- **The bar:** a Player entity that is not HumanPlayer is your frame plus authored differences, from the authoring layers (the class's list, then the instance's: COMBAT-RULES "Host model", LEADER PRINCIPLE). When it differs from HumanPlayer and `game.js` and no layer authors the difference, it is a bug.
- **How to check:** compare against your code, never against GymBrain's. Parity with GymBrain proves only that nothing changed, not that it's right.
- **How to fix:** each fix keeps the four roles (LEADER-AI "FRAME"): input goes through the Controller, acceptance rules stay in the Body, resolution in the SimPass, decisions in the Decider. A fixed difference becomes an authored setting; Jess rules its baseline per item (so far always yours: firstWait 0, #41 items 5 and 6).
- **The roles:** Decider, Controller, Body, SimPass, each blind to the others' jobs. Rule text: LEADER-AI "FRAME" and the GLOSSARY entries; this file holds none of it. #40 built the order for the frame; #41 and #43 closed the code gaps (both shipped).

## Standing rulings on this branch
- gym-harness and leader-stats-harness stay red until the branch nears completion (#30); `check: FAILED (2 harness)` from those two is expected, any other failure is not.
- Gyms 3 to 8 stay on the old GymBrain; only Misty and Brock get the AI player.

## Before this branch merges
- #30 resolved and `node tools/check.js` ends with "check: all passed".
- Move any rule here that should outlive the branch to its permanent home, then mark this file history.
