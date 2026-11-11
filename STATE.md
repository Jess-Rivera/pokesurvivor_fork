# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-11, Claude Code (home): #76 built and closed (effect chip bands), #80 built (feet arcs retired).
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch, then pulls it on the other machine.
2. Owed by Jess: the #80 glance (no feet rings), the #64 frame-rate check on the work laptop, the #59 feel test.
3. Next: #77 (needs Jess's rate-card ruling), then the SV type colours #68 and #69.

## Where we are
- Character panel chips (#76): a bad band (statuses, net stat drops) at y 172/202 and a good band (net raises, REG,
  berries by name, one chip per guard, altar power) at 238/268; "+N" past 12 per band; Shake Off at y 304.
  Reader: createEffectChipReader in js/ui/hud-overlay.js. Spec: HUD-STYLE "Effect chips: good and bad bands (#76)".
  The canvas buff stack (js/ui/hud.js) draws only when the HTML HUD is off.
- On-sprite status animations (#78): js/ui/status-fx.js from G.STATUS_ANIMS; rerun node tools/status_anims.js after
  changing a sheet. No feet arcs any more (#80); a leader's regen has no visible cue now.
- HUD: overlay core js/ui/hud-overlay.js plus panels (#62 to #67).
- Leader AI (carried): #59 in Needs Playtest, Bait parked on #60, gyms 3 to 8 on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Shake Off sits at a fixed y 304 even with one status chip; reopen as a follow-up if it feels far off.
- Headless frame-rate checks need the GPU flags (see tools/smoke-status-fx.js).
- Shops in the same direction as the gym: their arrows and labels overlap (predates #67).
- Some late-gen species names show in Spanish on the HUD: #73. Mobile dropped for now (#72).
- Headless file:// blocks fonts: screenshot HUD text over http. Python on Windows writes CRLF (use newline='').

## Open owner decisions
- #77 rate-card wording vs maths. Bait (#60).
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- #61 close or keep as the guide's tracker. #74 spare weather art; #75 named places for the Map line.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
