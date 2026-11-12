# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date in Amazon Quick (work machine), from the 2026-11-12 home session
Jess runs these in a terminal at the repo root; the Quick agent does not (CLAUDE.md "Git and GitHub").
1. Before leaving home: `git push origin feature/pause-menu-rework`.
2. At work, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
3. `git fetch origin`
4. `git checkout feature/pause-menu-rework`. If the branch does not exist on this machine yet:
   `git checkout -b feature/pause-menu-rework origin/feature/pause-menu-rework` (skip step 5).
5. `git pull --ff-only`. If it refuses, the two machines diverged: stop and tell the agent, do not merge or force.
6. Check: `git log --oneline -3` shows the "TODO: steps for Amazon Quick" commits on top, with "Session end: STATE,
   TODO, DEVLOG, decision for #90 pocket kinds, #94, #98" just below. `git log --oneline feature/pause-menu-rework..origin/main` should print nothing (main has not moved).
7. `node tools/check.js`: expect "check: FAILED (2 harness)", only gym-harness and leader-stats-harness (red until #30).
   Any other failure is new: tell the agent.
8. Open dev.html?dev from disk and start a run: pause it, check the Run Inventory and that a berry or run item can be
   dragged into the Temporary Pocket.
9. Tell the Quick agent "catch me up". It has no gh, so it reads STATE.md and this file; the board and issue list are
   not visible to it, and the open items below are its source.
10. Before leaving work: commit and `git push origin feature/pause-menu-rework`, so home starts from the same tree.

## Next (from the 2026-11-12 Quick session that built all of #91)
1. #91 feel test PASSED (Jess, 2026-11-12). Comment on #91 and close it. #83 (Cards Taken) BUILT: run check.js and
   smoke-pause-menu, feel test, then edit #83's done-condition, comment and close. Then #92 (children of #82; it also
   retires the team sheet's Run Cards totals, still the old ones); merge back into feature/gym-leader-ai when #82 is
   done.
   Pause menu tooltips moved to one shared top layer (with #83): run smoke-pause-menu and smoke-pause-inventory
   (both rewritten to read the layer), feel test. The "every tooltip everywhere" issue is FILED as #102.
2. Owner decisions that block or shape work: #97 (permanent upgrade rework, blocks #95), #86 (gym leaders round down?),
   #99 (menu font), #93 (tooltip scope).
3. Triage: #97 and #99 new in Triage; #93 and #75 carry needs-triage; #72, #79 (deferred) and #74 sit in Triage; #86 is
   `ready` but its card is in Triage; #29 has a stale `blocked` label (blocker #27 closed).
4. Leader AI when ready: #53, then #39; planner gaps #57, #58; #30 before gym-leader-ai merges to main.
5. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
   feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1, fix/ui-upgrade).
6. FILED as #100 (the canvas FPS counter freezes behind the pause menu). Also possible: F3, lighter HUD paint (static pixel SVGs baked to images), only if a new profile still shows it.
7. DONE (Quick, 2026-11-12, 91-2 A): Chore (found in the 91-1 STALE scan): silver-mutate "a kill pays nothing" and pokebox-evs-mutate's
   evKill pattern still carry 10-space indents from before payKill existed, so both are STALE (older than #91). Re-point
   to the 6-space lines in enemy.js payKill and re-run both mutate scripts.
8. Deferred hook (#91-2 C, map 91-2C): when the real loop counter lands and the loop can change mid-run, Region Best's
   "gyms" must become gyms cleared on the final loop, not G.Gym.splits.length.
9. New issue to file (Quick, 2026-11-12): region type maps, PARKED. 8 type maps + 1 Stage 3 map per region (decision
   2026-11-12-region-type-maps-fill-rules, map Region Type Maps - Biomes v2). Design only; D4 to D16 open.
   Related finding: Kanto T6 rolls no hordes (hordeTypes empty, events.js swaps in gold); Kanto T6 has 7 wild species.
   Tool gap: tools/make_seo_pages.py is missing, so the publish command's last step fails.
10. Acquisition rework (Quick, 2026-11-12): gacha out; rescue catch (UberElite + Pokeball Belt), Lost Pokemon recruits,
   candy evolution with mainline requirements, legendaries by loop. Decision
   2026-11-12-acquisition-no-gacha-catch-candy-legendaries, map Acquisition v1 (rounds 1 to 16). Design only.
   To file: one parent issue, then slices. Children it spawns: the 8-move import (T3b), 15 new evolution items +
   Link Cable (Shop), Accelgor route (no Shelmet sprites). Day/night is FILED as #101 (parked for its own dive).
11. Chore (Quick, 2026-11-12, found in the 91-3 STALE scan): debug-movechecker-mutate.js has about 8 debug.js patterns
   written before a Prettier pass ("spawn(0);     // movechecker start" with wide spacing), so they no longer match.
   Older than #91. Re-point them to the current debug.js lines and re-run the script.
12. Possible issue (Quick, 2026-11-12): PausePokemon and PauseInventory are not in main.js NEED (ready-guarded instead);
    CLAUDE.md says every new file goes there. PauseRunInfo is. Decide whether to add the two.
13. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op (silver-harness cannot swap
    that file). Add an SV_PANEL entry when co-op work starts.
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30.

## Open issues by area (numbers only, titles via gh)
Partly checked against the GitHub API 2026-11-12 (Quick saw #85 to #102 only): #91 is CLOSED; #101, #102 are new.
- UI and HUD: #25 #61 #74 #75 #82 (#83 #92) #93 #95 #99 #100 #102 #72 #79 (deferred)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #53 #57 #58 #60
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48 #56 #86 #97 #101 (day/night, parked)
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
