# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-11, Claude Code (home): on feature/pause-menu-rework (branched off feature/gym-leader-ai). #88 closed;
#89 built and in Needs Playtest. docs/branch-rules/feature-gym-leader-ai.md governs the parent branch; none for this one.

## START HERE (next session, either tool)
1. Branch: feature/pause-menu-rework. Spec: docs/PAUSE-MENU.md (Jess's design, mockup assets/ui/In Run Menu Reduced.png).
2. #89 waits on Jess's feel test (detail panel, team panel, stat hex, the Enter fix). Fix what it turns up, then close.
3. Next slice: #90 (Run Inventory, held item Remove / Give, Temporary Pocket): goal, done-condition, test, then the plan.
4. When #82 is done, merge this branch back into feature/gym-leader-ai (decision 2026-11-11-side-branches-off-gym-leader-ai).

## Where we are
- Pause menu #82: #88 shell (done), #89 detail and team panels (Needs Playtest), then #90, #91 (Run Info, per-Pokemon
  stats, new tracking, a best-record save field), #83 (Cards Taken), #92 (end-of-run Team screen).
- js/ui/pause-menu.js (ball, buttons, keys) mounts js/ui/pause-pokemon.js (detail and team panels); css/pause-menu.css.
  The HUD kit (hud-overlay.js) now holds RosterCard and its box helpers, shared by the run screen roster and the menu.
  G.Sheet exports summaryOf and detailOf for the move rows. Test: tools/smoke-pause-menu.js (all passed).
- Stat hex rules (settled this session): decision 2026-11-11-89-pause-menu-detail-panel-and-stat-hex.
- #94 (new bug): the Run Item card title sits outside its card. Accepted on the board.
- Leader AI parked by choice: #53, then #39. check.js red only on gym-harness and leader-stats-harness until #30.

## Watch
- Headless: file:// blocks fonts; click #tap-start first; frame-rate checks need the GPU flags (tools/smoke-status-fx.js).
- elementFromPoint skips pointer-events: none (the smoke turns it on to probe a tooltip).
- Bash heredocs with long JS break: write edit scripts to the scratchpad and run them.
- Untracked art in assets/raw, assets/excalidraw, assets/icons/pokeball (Jess's; never staged by the assistant).

## Open owner decisions
- #86 whole levels (gym leaders round down too?). Bait (#60). #93 tooltip scope.
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out. #74 spare weather art.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path).
