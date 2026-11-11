# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-11, Claude Code (home): #71 settled, #78 built and closed (on-sprite status animations, minor chips).
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch, then pulls it on the other machine.
2. Owed by Jess: the #64 frame-rate check on the work laptop; the #59 feel test.
3. Next: retire the team-raise feet arcs in js/entities/player.js (they double the #78 stat-up effect; Jess to OK), then #77.

## Where we are
- Status animations: js/ui/status-fx.js draws every Pokemon's statuses and stat changes from G.STATUS_ANIMS
  (js/data/status-anims.js). Art in assets/status/ (Jess's own redraw, ships). After changing a sheet or its JSON, run
  node tools/status_anims.js (check.js fails on drift). Spec: docs/HUD-STYLE.md "On-sprite status icons (#71)".
- Character panel chips: majors solid, minors hollow (CNF, DZE, TRP, DRW); roster rows keep majors only.
- HUD: overlay core js/ui/hud-overlay.js plus panels (#62 to #66); #67 wayfinding arrows done.
- Leader AI (carried): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Headless frame-rate checks need the GPU flags (see tools/smoke-status-fx.js); without them big sprites look slow.
- Paralysis plus the trap web can hide a small Pokemon; Attack yellow and the birds fade on yellow Pokemon.
- Shops in the same direction as the gym: their arrows and labels overlap (predates #67).
- Some late-gen species names show in Spanish on the HUD: #73. Mobile dropped for now (#72).
- Headless file:// blocks fonts: screenshot HUD text over http. Python on Windows writes CRLF (use newline='').

## Open owner decisions
- #77 rate-card wording vs maths. #76 chip spot for the buffs. Bait (#60).
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- #61 close or keep as the guide's tracker. #74 spare weather art; #75 named places for the Map line.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
