# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-10, Claude Code (home): #62 character info panel built, three feel-test rounds; level-up flow changed.
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch (4 HUD commits plus session end), then pulls it on the other machine. There: python tools/grid_rips.py.
2. Owed by Jess: the #62 feel test (Needs Playtest), the #64 frame-rate check on the work laptop (Settings > FPS,
   G.Debug.hudOverlay() in a heavy run), then #59.
3. Next HUD work: #63 (roster, berry, run items), then #65 to #67; #68 and #69 any time. #72 (touch) is deferred.

## Where we are
- HUD: docs/HUD-STYLE.md is the look spec; #61 is a soft dependency (each panel locks its own choices).
  The overlay is a core (js/ui/hud-overlay.js: palette, pixel shapes, the B2 life bar at any scale) plus panels:
  hud-boss-panel.js (#64) and hud-player-panel.js (#62). Canvas pieces stay only as the fallback if the overlay fails.
- Level up: the Lv number rattles while you play; the cards open 1.1 s of run time later (LEVEL_CARDS_DELAY,
  js/game.js) with confetti from the popup's corners (js/ui/confetti.js).
- HUD open questions in HUD-STYLE: Psychic rim vs bond pink, bond count spot, dim timer.
- Leader AI (carried from gym-leader-ai): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Mobile is dropped for now: with the overlay up, move slots and Shake Off are not touch buttons (#72).
- The canvas "GYM · area" line still overlaps the enemy name line (its own HUD slice, #65).
- Headless Chromium blocks fonts over file://: screenshot HUD text over http (python -m http.server).
- tools/pack_itch.js ships all of assets/: keep reference-only files out of it.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes and non-ASCII (use Write for scripts).

## Open owner decisions
- Bait (#60). Bench recharge. Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Non-major status icon animations (#71).

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
