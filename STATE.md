# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-10, Claude Code (home): #65 closed (map panel, weather card, kills line).
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch (this session's commits), then pulls it on the other machine. There: python tools/grid_rips.py.
2. Owed by Jess: the #64 frame-rate check on the work laptop (Settings > FPS, G.Debug.hudOverlay() in a heavy run); the #59 feel test.
3. Next HUD work: #66 (it replaces the canvas buff chips), then #67; #68 and #69 any time.

## Where we are
- HUD: docs/HUD-STYLE.md is the look spec. The overlay is a core (js/ui/hud-overlay.js: palette, pixel shapes, B2 life
  bar, shared chips, item square, icon canvas, cursor) plus panels: boss (#64), player (#62), roster and run items (#63),
  map (#65, js/ui/hud-map-panel.js). Canvas pieces stay only as the fallback if the overlay fails.
- Map panel: World Level (the old ENEMY LV), Region, Map (the biome name until #75), and the weather card: the B2 tab
  (b2-lower Y1 to AA3) at 3x in the weather's type colours, Slate body, white Bulbapedia icon behind the stripe, timer
  inside the lower rim. It slides in with a bounce, slides off; Clear Sky slides in, holds 2 s, fades. Kills line top
  centre, hidden in arenas. Coins are no longer on the run HUD.
- Weather icons: assets/icons/weather/*-white.png in use; the cut circles in unofficial/ are spare art (#74).
- Leader AI (carried from gym-leader-ai): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- A few late-gen species names show in Spanish on the HUD (pokedex.js): #73. Mobile dropped for now: no touch on overlay panels (#72).
- Board drift: #66 and #67 sit in Blocked (on #61) though labelled ready; #61 is a soft dependency.
- Headless Chromium blocks fonts over file://: screenshot HUD text over http (python -m http.server as a background task).
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes and non-ASCII (use Write for scripts).

## Open owner decisions
- Bait (#60). Bench recharge. Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Non-major status icon animations (#71). HUD-STYLE open questions: Psychic rim vs bond pink, bond count spot, dim timer.
- Whether the spare weather art becomes new weathers (#74); named places for the Map line (#75).

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
