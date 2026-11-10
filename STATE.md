# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-10, Claude Code (home): #66 closed (DPS-Upgrades panel, DPS history module, setting and opacity slider).
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch (this session's commits), then pulls it on the other machine. There: python tools/grid_rips.py.
2. Owed by Jess: the #64 frame-rate check on the work laptop (Settings > FPS, G.Debug.hudOverlay() in a heavy run); the #59 feel test.
3. Next HUD work: #67 (floating arrows); #76 needs Jess to pick a spot for the buff and status chips first. #77 card wording.

## Where we are
- HUD: docs/HUD-STYLE.md is the look spec. The overlay is a core (js/ui/hud-overlay.js) plus panels: boss (#64), player
  (#62), roster and run items (#63), map (#65), DPS-Upgrades (#66, js/ui/hud-dps-panel.js). Canvas pieces stay only as the
  fallback, except the timed buff and leftover status chips, still drawn by the canvas until #76.
- DPS-Upgrades panel, top left: active Pokemon's name and the team's 5 s DPS, a 30 s sparkline in each Pokemon's type
  colour with swap ticks, the run's team cards. Michroma (a "module" panel, HUD-STYLE Fonts). Settings: DPS Panel
  (default on) and DPS Panel Opacity (20 to 100%, default 60%).
- G.DpsHistory (js/systems/dps-history.js): every second of the run, team and per member, run state only; for a later
  pause screen (5 s average) and end-of-run graph.
- Leader AI (carried from gym-leader-ai): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Rate cards (Cooldown Down, Gate Reduction, Delay Down) divide, so the run total reads lower than the card's step x picks: #77.
- A few late-gen species names show in Spanish on the HUD (pokedex.js): #73. Mobile dropped for now: no touch on overlay panels (#72).
- Headless file:// blocks fonts and stylesheet rules: screenshot HUD text over http (python -m http.server).
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes and non-ASCII (use Write for scripts).

## Open owner decisions
- #77 rate-card wording vs maths. #76 where the buff and status chips live. Bait (#60). Bench recharge. Boss pool size;
  sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Non-major status icon animations (#71). HUD-STYLE open questions: Psychic rim vs bond pink, bond count spot, dim timer.
- Whether the spare weather art becomes new weathers (#74); named places for the Map line (#75).

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
