# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-12, Claude Code (home): on feature/pause-menu-rework (branched off feature/gym-leader-ai). #90, #94 and
#98 closed after Jess's feel test. docs/branch-rules/feature-gym-leader-ai.md governs the parent branch; none for this one.

## START HERE (next session, either tool)
1. Branch: feature/pause-menu-rework. Spec: docs/PAUSE-MENU.md.
2. Next slice: #91 (Run Info panel and Per Pokemon Run Stats, with the new tracking), then #83 (Cards Taken), then #92
   (end-of-run Team). When #82 is done, merge the branch back into feature/gym-leader-ai.
3. Triage is waiting (see TODO.md item 3).

## Where we are
- Pause menu #82: #88, #89, #90 shipped; #91, #83, #92 remain.
- js/ui/pause-menu.js mounts js/ui/pause-pokemon.js (detail, team) and js/ui/pause-inventory.js (Run Inventory, item
  moves, carry ghost). The Temporary Pocket lives on G.Team and holds three kinds ({ kind: 'held' | 'berry' | 'run',
  id }): swapWithPocket for held items, storeToPocket and pocketToStore for berries and run items (run item on / off for
  every member). G.Game asks G.PauseMenu.blockResume() before every resume.
- Tests: smoke-pause-inventory, smoke-pause-menu, smoke-hud-overlay, smoke-berry-slots all pass.
- Rulings: decisions 2026-11-11-90-run-inventory-pocket-and-item-moves and 2026-11-12-90-pocket-takes-berries-and-run-items.
- Tabled: #95 (hex meta HP band) is blocked by #97 (permanent upgrade rework, needs triage and a design pass).
- Leader AI parked by choice: #53, then #39. check.js red only on gym-harness and leader-stats-harness until #30.

## Watch
- Headless: file:// blocks fonts; click #tap-start first; a run needs save.team set; frame-rate checks need GPU flags.
- elementFromPoint skips pointer-events: none (smokes turn it on to probe a tooltip).
- A CSS filter or animation on a slot traps its tooltip in that slot's layer: put effects on the square, not the slot.
- The pause team cards reuse .hud-roster-row (with .pm-team-card): scope run screen probes with :not(.pm-team-card).
- Bash heredocs with long JS, backticks or quotes break: write edit scripts to the scratchpad and run them.
- Untracked art in assets/excalidraw (Redesign Main Menu) is Jess's; never staged by the assistant.

## Open owner decisions
- #86 whole levels (gym leaders round down too?). Bait (#60). #93 tooltip scope. #99 menu font. #97 upgrade rework scope.
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out. #74 spare weather art.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path).
