# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-12, Quick (work machine). Branch: feature/pause-menu-rework (off feature/gym-leader-ai).

## START HERE (next session, either tool)
1. #91 is fully built (91-1, 91-2 A to E, 91-3). Owed: Jess's feel test of the whole thing (91c 7-step debug session,
   then runinfo('full') and flip the team for the Run Stats box). Then comment on #91, card to Needs Playtest / close.
2. Next slice: #83 (fill Cards Taken on the detail panel, 400 px box, scrolls). Then #92. Merge back into
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
