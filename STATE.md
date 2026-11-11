# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-11, Claude Code (home): on feature/pause-menu-rework (branched off feature/gym-leader-ai). Slice 1 (#88)
shipped and closed. docs/branch-rules/feature-gym-leader-ai.md governs the parent branch; no rules file for this one.

## START HERE (next session, either tool)
1. Branch: feature/pause-menu-rework. Spec: docs/PAUSE-MENU.md (Jess's design, mockup assets/ui/In Run Menu Reduced.png).
2. Next: open #89 (slice 2, Pokemon detail panel and team panel): agree goal, done-condition and test, then the plan.
3. When the pause menu (#82) is done, merge this branch back into feature/gym-leader-ai (side-branch pattern,
   decision 2026-11-11-side-branches-off-gym-leader-ai). gym-leader-ai merges to main only after #30.

## Where we are
- Pause menu #82 (In Progress): slices #88 (shell, done), #89 (detail and team panels), #90 (inventory and held items,
  Temporary Pocket), #91 (Run Info and per-Pokemon stats, new tracking and a best-record save field), #83 (Cards Taken),
  #92 (end-of-run Team screen). #93 move tooltip rework is separate (needs-triage).
- js/ui/pause-menu.js and css/pause-menu.css: Preact on the HUD kit, its own clickable layer (z 15). The kit now
  shares moveSlotRow (run screen slots and menu buttons). Test: tools/smoke-pause-menu.js (all passed).
- Co-op pause keeps the old sheet (scr-pause); G.UI.ask unchanged.
- Leader AI (parked by choice): next #53, then #39. check.js red only on gym-harness and leader-stats-harness until #30.

## Watch
- Headless frame-rate checks need the GPU flags (tools/smoke-status-fx.js). Headless file:// blocks fonts.
- Bash heredocs with long JS break: write edit scripts to the scratchpad and run them.
- Untracked art in assets/raw and assets/excalidraw (Jess's; never staged by the assistant).

## Open owner decisions
- #86 whole levels (gym leaders round down too?). Bait (#60). #93 tooltip scope.
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out. #74 spare weather art.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
