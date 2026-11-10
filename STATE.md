# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-10, Claude Code (home): #62 and #63 closed (status chips, roster, berry bag, run items on the HTML HUD).
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch (this session's commits), then pulls it on the other machine. There: python tools/grid_rips.py.
2. Owed by Jess: the #64 frame-rate check on the work laptop (Settings > FPS, G.Debug.hudOverlay() in a heavy run),
   then the #59 feel test.
3. Next HUD work: #65 (map panel and kills line), then #66 (it replaces the canvas buff chips), #67; #68 and #69 any time.

## Where we are
- HUD: docs/HUD-STYLE.md is the look spec (#61 a soft dependency; each panel locks its own choices). The overlay is a core
  (js/ui/hud-overlay.js: palette, pixel shapes, B2 life bar, and the shared chips, item square, icon canvas and cursor)
  plus panels: hud-boss-panel.js (#64), hud-player-panel.js (#62), hud-roster-panel.js and hud-run-items-panel.js (#63).
  Canvas pieces stay only as the fallback if the overlay fails.
- Roster rows are 278 x 64 (longest name plus one chip); a Pokemon holds one major status, so a row never shows two chips.
- The canvas buff chips now start right of the roster's held item squares (G.HudRosterPanel.buffsLeft) until #66.
- Leader AI (carried from gym-leader-ai): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- A few late-gen species names show in Spanish on the HUD (stored that way in pokedex.js): #73.
- Mobile is dropped for now: overlay panels have no touch buttons (#72).
- The canvas "GYM · area" line still overlaps the enemy name line (#65).
- Headless Chromium blocks fonts over file://: screenshot HUD text over http (python -m http.server).
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes and non-ASCII (use Write for scripts).

## Open owner decisions
- Bait (#60). Bench recharge. Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Non-major status icon animations (#71). HUD-STYLE open questions: Psychic rim vs bond pink, bond count spot, dim timer.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
