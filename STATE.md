# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-11, Claude Code (home): on feature/pause-menu-rework (branched off feature/gym-leader-ai). #89 and #96
closed; #90 built and in Needs Playtest. docs/branch-rules/feature-gym-leader-ai.md governs the parent branch; none for this one.

## START HERE (next session, either tool)
1. Branch: feature/pause-menu-rework. Spec: docs/PAUSE-MENU.md (sections 3 and 4 updated for #90).
2. #90 waits on the rest of Jess's feel test: item moves (click and drag), the in-ball Destroy prompt, the run screen berry
   bag. Tooltips already confirmed. Fix what it finds, then close.
3. #98 (hex +X% under the number on the side corners): small, and it fixes the one red check in tools/smoke-pause-menu.js
   (fit check fails at Jess's hex radius 110, passes at 92).
4. Then #91, #83, #92 (children of #82); merge back into feature/gym-leader-ai when #82 is done.

## Where we are
- Pause menu #82: #88 and #89 shipped, #90 Needs Playtest, then #91 (Run Info), #83 (Cards Taken), #92 (end-of-run Team).
- js/ui/pause-menu.js mounts js/ui/pause-pokemon.js (detail, team) and js/ui/pause-inventory.js (Run Inventory, held item
  moves, carry ghost). The Temporary Pocket lives on G.Team (pocket, swapWithPocket, swapPocketSlots, emptyPocket).
  G.Game asks G.PauseMenu.blockResume() before every resume. Kit ItemGrid is shared with the run screen berry bag.
- Tests: tools/smoke-pause-inventory.js and smoke-berry-slots.js pass; smoke-pause-menu has the one #98 failure.
- Rulings: decision 2026-11-11-90-run-inventory-pocket-and-item-moves.
- Tabled: #95 (hex meta HP band) is blocked by #97 (permanent upgrade rework, needs triage and a design pass).
- Leader AI parked by choice: #53, then #39. check.js red only on gym-harness and leader-stats-harness until #30.

## Watch
- Headless: file:// blocks fonts; click #tap-start first; frame-rate checks need the GPU flags (tools/smoke-status-fx.js).
- elementFromPoint skips pointer-events: none (smokes turn it on to probe a tooltip).
- A CSS filter or animation on a slot traps its tooltip in that slot's layer: put effects on the square, not the slot.
- Bash heredocs with long JS or quotes break: write edit scripts to the scratchpad and run them.
- Untracked art in assets/excalidraw (Redesign Main Menu) is Jess's; never staged by the assistant.

## Open owner decisions
- #86 whole levels (gym leaders round down too?). Bait (#60). #93 tooltip scope. #99 menu font. #97 upgrade rework scope.
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out. #74 spare weather art.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path).
