# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-10, Claude Code (home): #67 built (chevron wayfinding arrows, roof labels), in Needs Playtest.
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch, then pulls it on the other machine. There: python tools/grid_rips.py.
2. Owed by Jess: #67 feel test (then HUD-STYLE "Wayfinding arrows" goes Proposed to Approved and #67 closes); the #64
   frame-rate check on the work laptop; the #59 feel test.
3. Next HUD work: #77 card wording; #76 needs Jess to pick a spot for the buff and status chips first.

## Where we are
- HUD: docs/HUD-STYLE.md is the look spec. The overlay is a core (js/ui/hud-overlay.js) plus panels: boss (#64), player
  (#62), roster and run items (#63), map (#65), DPS-Upgrades (#66). Canvas pieces stay only as the fallback, except the
  timed buff and status chips (canvas until #76) and world things (arrows, damage numbers).
- Wayfinding (#67, js/ui/hud.js floatArrow): off screen, three chevrons (gym Attacks/Special, shops Attacks/Physical)
  with a snap, bounce, strained hold, slide loop and compact labels ("Gym·Lv.5·10m·29s"). On screen, roof labels only
  ("Gym Leader Brock" over "Lv.5 +n Escalating"). Timings and sizes are CHEVRON_* constants. Elite Four gates are not in
  the game yet; their label will read "Elite Four <name>".
- G.DpsHistory (js/systems/dps-history.js): every second of the run, for a later pause screen and end-of-run graph.
- Leader AI (carried from gym-leader-ai): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Shops in the same direction as the gym: their arrows and labels overlap (predates #67).
- Rate cards (Cooldown Down and friends) divide, so run totals read lower than step x picks: #77.
- Some late-gen species names show in Spanish on the HUD: #73. Mobile dropped for now (#72).
- Headless file:// blocks fonts: screenshot HUD text over http (python -m http.server).
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes and non-ASCII (use Write for scripts).

## Open owner decisions
- #77 rate-card wording vs maths. #76 where the buff and status chips live. Bait (#60). Bench recharge. Boss pool size;
  sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- #71 non-major status icon animations. #61 still open though #67 no longer waits on it (close it or keep it as the guide's tracker).
- #74 spare weather art; #75 named places for the Map line.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
