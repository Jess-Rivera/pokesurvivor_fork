# feature/gym-leader-ai: Structural Review (2026-11-14, Quick)

Rulebook: .claude/skills/structural-review/SKILL.md. Scope: 212 commits, 570 files, +89,877 / -3,781.
Reviewed js/ and dev.html; js/net/ skipped (deferred). Limit: Quick has no hunk diff, so modified files were judged
from numstat plus the current code. New files were read whole where it mattered.

## Verdict

```mermaid
flowchart LR
  A["212 commits, 570 files"] --> B{"Blockers?"}
  B -->|"save data, G.Stats, shared paths"| C["Clean"]
  B -->|"2 new files over 1000 lines"| D["D1: does the rule apply?"]
  C --> E["VERDICT: DISCUSS"]
  D --> E
```

## Findings

```mermaid
flowchart TB
  subgraph RS["Restructure"]
    F1["F1 hud-overlay.js<br/>new, 1232 lines<br/>the whole UI kit in one file"]
  end
  subgraph MD["Medium"]
    F2["F2 leader-ai.js<br/>new, 1089 lines<br/>about 130 lines are tuning tables"]
    F3["F3 leader-planner.js step<br/>11-way if/else on the verb"]
    F6["F6 debug.js<br/>+382, now 1724"]
  end
  subgraph SM["Small"]
    F4["F4 game.js togglePause<br/>asks the pause menu 4 questions"]
    F5["F5 game.js Region Best<br/>belongs in run-stats.js"]
    F7["F7 tools/out/la-mutate.json<br/>run output committed"]
  end
```

Every remedy keeps behavior. Game-code remedies still go through a plan and your OK.

| # | Remedy | Load-order cost | Tests to repoint or keep green |
|---|---|---|---|
| F1 | Split on its section headers: shapes, buttons, stage fit; tooltip layer, scroll box; roster card; chips | 4 scripts in dev.html and NEED, before the HUD panels | run-info-mutate (2 patterns); smoke-hud-overlay, smoke-pause-menu |
| F2 | BASE, INTELLIGENCE_CURVES, CONF, UNSTICK, limits and timings to a js/data file | 1 script before leader-ai.js; keep the G.LeaderAI.BASE name or move readers (plan call) | leader-ai, leader-slots, gym-leader mutate; harness 17f |
| F3 | One step handler per verb in a table, as use already hands off to useSlot | none | leader-ai-mutate; harness 15 and 16 |
| F4 | Pause menu answers "pause key pressed: handled?"; game.js only flips paused and playing; one hide-all helper | none | run-info, pokebox-evs, player-entity mutate; smoke-pause-menu |
| F5 | Region key and lookup into run-stats.js; game.js keeps one call | none | run-info, run-stats mutate; run-stats-harness |
| F6 | The branch's leader, HUD and pause dev helpers to their own debug file on G.Debug | 1 script after debug.js | debug-movechecker, pokebox-evs, pokebox-stats, run-info, team-cards, type-chart mutate |
| F7 | Runner output to tools/cache/ or ignore tools/out/*.json; you untrack the file | none | none |

## Checked, no finding

- Save data: regionBest and the new settings default through the save template, merge and settings defaults.
- Shared paths: leader logic stays in its own modules; game.js, move-effects, stages, team-cards, util carry no
  leader checks.
- player.js and run-ui.js shrank. gyms.js +201 is exempt (content).
- Preact and htm in js/vendor: decision 2026-11-10-hud-on-preact-and-pngs-as-design-basis.
- boss-ai.js +48 / -17 reads as tuning shared with the new path, not new GymBrain features (a read, not a proof).

## Decisions for Jess

```mermaid
flowchart TB
  D1{"D1: 1000-line rule for files born on this branch?"}
  D1 -->|"a: applies"| A1["F1 and F2 block the merge"]
  D1 -->|"b: grandfathered"| B1["F1 and F2 become issues"]
  D1 -.->|"recommended"| R1["F2 before the merge<br/>F1 the first issue after"]
  D2{"D2: F3 to F7, before or after?"}
  D2 -.->|"recommended"| R2["Before the merge: F4, F7"]
  D2 -.->|"recommended"| R3["Issues: F3, F5, F6"]
```
