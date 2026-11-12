# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-12, Quick (work machine). Branch: feature/pause-menu-rework (off feature/gym-leader-ai).

## START HERE (next session, either tool)
1. #91 DONE: Jess's feel test passed (2026-11-12, Quick). Owed: comment on #91 and close it (Quick has no gh, Jess runs it).
2. #83 BUILT (Quick, 2026-11-12, decision 2026-11-12-83-cards-taken-counts-and-move-tooltip-changes): Cards Taken is
   the DPS panel's count list for the cards that touch this Pokemon (G.TeamCards.takenBy); the move tooltip's "Cards:"
   line shows before and after (G.TeamCards.changes). team-cards harness 183/183 in a sandbox bundle. Owed: Jess runs
   check.js and smoke-pause-menu (new #83 block), feel test, then #83 comment and close. Then #92. Merge back into
   feature/gym-leader-ai when #82 is done.
3. Triage still waiting (TODO.md "Next" item 3).

## Where we are
- Pause menu left panel: Run Info (js/ui/pause-run-info.js), sections Progress, Combat, Faints, Statuses, Loot, EVs,
  Region Best with a speedrun pace delta. Detail panel: Run Stats box, 12 rows scrolling in its 200 px box.
- Region Best: new save field save.regionBest (per region, 'all' for All regions), set only by clean solo runs.
  Rules DR1 to DR5, RC1, RC2 in PAUSE-MENU 6 and map 91-2; Best = loop, then gyms, then the tie rules.
- Shared kit ScrollBox (hud-overlay.js): every pause menu scroll bar, wheel and drag.
- Debug: G.Debug.runinfo / regionbest / recordcheck (?dev). onDealt and RunStats.dealt take named fields.
- Last check run (Jess, machine): check.js green bar the 2 Misty fails; smoke-pause-menu fixed after one bad read,
  re-run owed.

## Watch
- Quick has no node or browser: its harness runs are sandbox bundles. check.js and the smokes on the machine are truth.
- GitHub API returns empty from Quick almost every time; TODO.md is the fallback list.
- Keep new code within 120 columns, or mutate patterns go STALE (three old ones re-pointed today).
- Changelog edits: check every entry is a pair of strings, not just that the file parses (a bad nest parsed fine).
- Anything that hides .hud-overlay must leave .hud-defs visible. file://: mask-image is blocked (use clip-path).

## Open owner decisions
- #86 whole levels; #93 tooltip scope; #99 menu font; #97 upgrade rework scope (blocks #95); #60 Bait.
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.

Rules: CLAUDE.md. Maps for #91: docs/ASCII Concept Maps/91c, 91d, 91e, 91-1, 91-2, 91-2C, 91-2D, 91-3.
