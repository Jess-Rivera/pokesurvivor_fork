# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-10, Claude Code (home): #71 spec written (on-sprite status icons, all twelve), now in Needs Playtest.
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch, then pulls it on the other machine.
2. Owed by Jess: look over the #71 preview GIF and close #71 (or adjust); the #64 frame-rate check; the #59 feel test.
3. Next: settle the #71 open item (several statuses at once), then plan the #71 build slice. Also #77; #76 waits on a spot.

## Where we are
- On-sprite status icons: docs/HUD-STYLE.md "On-sprite status icons (#71)". Rescue Team icon style, one row per
  status (art, motion, colours, placement, source). Ripped art is reference only (public repo); the build slice redraws.
  Code today: 3-letter pills, a ring under the feet, a text zzz (js/entities/player.js, "slice E1").
- Preview: python tools/status_icon_preview.py writes a sheet and an animated GIF on a Pikachu into
  assets/sprite extraction attempt/status_preview/ (git-ignored).
- HUD: overlay core js/ui/hud-overlay.js plus panels (#62 to #66); #67 wayfinding arrows done.
- Leader AI (carried): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Shops in the same direction as the gym: their arrows and labels overlap (predates #67).
- Some late-gen species names show in Spanish on the HUD: #73. Mobile dropped for now (#72).
- Headless file:// blocks fonts: screenshot HUD text over http. Python on Windows writes CRLF (use newline='').

## Open owner decisions
- #71: what shows when several statuses stack. #77 rate-card wording vs maths. #76 chip spot. Bait (#60).
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- #61 close or keep as the guide's tracker. #74 spare weather art; #75 named places for the Map line.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
