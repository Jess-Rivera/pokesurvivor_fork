# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date in Amazon Quick (work machine), from the 2026-11-12 night home session
Jess runs these in a terminal at the repo root; the Quick agent does not (CLAUDE.md "Git and GitHub").
1. Before leaving home: `git push origin feature/pause-menu-rework`.
2. At work, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
3. `git fetch origin`, then `git checkout feature/pause-menu-rework`, then `git pull --ff-only`. If it refuses, the two
   machines diverged: stop and tell the agent, do not merge or force.
4. Check: `git log --oneline -1` shows "Session end: close #83, STATE, TODO, DEVLOG".
   `git log --oneline feature/pause-menu-rework..origin/main` should print nothing (main has not moved).
5. `node tools/check.js`: expect "check: FAILED (2 harness)", only gym-harness and leader-stats-harness (red until #30).
   Any other failure is new: tell the agent.
6. Tell the Quick agent "catch me up". It has no gh, so the open items below are its source.
7. Before leaving work: commit and `git push origin feature/pause-menu-rework`, so home starts from the same tree.

## Next (from the 2026-11-12 night home session that closed #83)
1. End of run (PAUSE-MENU section 7): #92 Run Review, then #103 End Run screen (+ no EVs on quit), then #104 EV
   screen. Then close #82 and merge back into feature/gym-leader-ai.
2. Owner decisions that block or shape work: #97 (permanent upgrade rework, blocks #95), #86 (gym leaders round down?),
   #99 (menu font), #93 (tooltip scope).
3. Triage: needs-triage on #93 #75 #97 #99 #100 #101 #102 (#101 has no type or area label); #72, #79 (deferred) and #74
   sit in Triage; #86 is `ready` but its card is in Triage; #29 has a stale `blocked` label (blocker #27 closed).
4. Acquisition rework (Quick, 2026-11-12): gacha out; rescue catch (UberElite + Pokeball Belt), Lost Pokemon recruits,
   candy evolution with mainline requirements, legendaries by loop. Decision
   2026-11-12-acquisition-no-gacha-catch-candy-legendaries, map Acquisition v1 (rounds 1 to 16). Design only.
   To file: one parent issue, then slices. Children it spawns: the 8-move import (T3b), 15 new evolution items +
   Link Cable (Shop), Accelgor route (no Shelmet sprites).
5. New issue to file: region type maps, PARKED. 8 type maps + 1 Stage 3 map per region (decision
   2026-11-12-region-type-maps-fill-rules, map Region Type Maps - Biomes v2). Design only; D4 to D16 open.
   Related finding: Kanto T6 rolls no hordes (hordeTypes empty, events.js swaps in gold); Kanto T6 has 7 wild species.
   Tool gap: tools/make_seo_pages.py is missing, so the publish command's last step fails.
6. Leader AI when ready: #53, then #39; planner gaps #57, #58; #30 before gym-leader-ai merges to main.
7. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
   feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1, fix/ui-upgrade).
8. Chore (found in the 91-3 STALE scan): debug-movechecker-mutate.js has about 8 debug.js patterns written before a
   Prettier pass, so they no longer match. Re-point them to the current debug.js lines and re-run (overlaps #56).
9. Deferred hook (#91-2 C, map 91-2C): when the real loop counter lands (#24), Region Best's "gyms" must become gyms
   cleared on the final loop, not G.Gym.splits.length.
10. Possible issue: PausePokemon and PauseInventory are not in main.js NEED (ready-guarded instead); PauseRunInfo is.
    Decide whether to add the two.
11. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op. Add an SV_PANEL entry
    when co-op work starts.
12. #100 (FPS counter freezes behind the pause menu). Also possible: lighter HUD paint, only if a new profile shows it.
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30.

## Open issues by area (numbers only, titles via gh, checked 2026-11-12 night)
- UI and HUD: #25 #61 #74 #75 #82 (#92 #103 #104) #93 #95 #99 #100 #102 #72 #79 (deferred)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #53 #57 #58 #60
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48 #56 #86 #97 #101 (day/night, parked)
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
