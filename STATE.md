# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-10, Claude Code (home): #61 palettes settled, #64 HUD pilot built and closed.
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch, then pulls it on the other machine. There: python tools/grid_rips.py (the rip grids are git-ignored).
2. Owed by Jess: the #64 frame-rate check on the work laptop (Settings > FPS, toggle G.Debug.hudOverlay() in a heavy run).
   Then #59 feel test (still in Needs Playtest).
3. Next HUD work: rest of #61 (shapes, motion and sizes for the other panels), #68, #69. #62, #63, #65 to #67 stay blocked on #61.

## Where we are
- HUD: docs/HUD-STYLE.md is the look spec. Palette is a working pool (every colour has a job; add or retire as needed).
  Lean on 2x text (20 px). The pilot (#64) is the first HTML overlay: js/ui/hud-overlay.js + css/hud-overlay.css on
  Preact, htm and Signals vendored in js/vendor. It reads the frame, never writes game state.
- Portraits: assets/pokemon/<dex>/Portrait.png and s/Portrait.png (tools/copy_portraits.js, from C:\dev\SpriteCollab).
- Rip references: name spots as "<short name> <cell>" on assets/ui/BW Pokedex rip/_grid (its README maps names).
- Leader AI (carried from gym-leader-ai): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- The canvas run timer and "GYM · area" line overlap the overlay's name line (left for their own HUD slices).
- Headless Chromium blocks fonts over file://: screenshot HUD text over http (python -m http.server).
- tools/pack_itch.js ships all of assets/: keep reference-only files out of it (the grids are ignored for this reason).
- Planner cost ~3.4 ms per choice, 10.4 ms worst. leader-ai-mutate not run since #59. 42 STALE mutation patterns (#56).
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Write for scripts).

## Open owner decisions
- Bait (#60). Bench recharge. Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Non-major status icon animations (#71). Whether the HUD and the menus share one palette (raised, pulled back).

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
