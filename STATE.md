# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-11, Claude Code (home): SV type colours game-wide (#68), gyms recoloured (#69), type chips restyled (#81); all three closed.
Branch: feature/leader-roster-ui (branched from feature/gym-leader-ai at f9478ea0; carries its unmerged work).
No branch rules file for this branch; docs/branch-rules/feature-gym-leader-ai.md still governs the leader AI work it carries.

## START HERE (next session, either tool)
1. Jess pushes this branch, then pulls it on the other machine.
2. Owed by Jess: the #80 glance (no feet rings), the #64 frame-rate check on the work laptop, the #59 feel test.
3. Next: #77 (needs Jess's rate-card ruling), then triage (#73, #74, #75, stale `blocked` on #29).

## Where we are
- Type colours: G.U.TYPE_COLOR (SV Base), TYPE_COLOR_LIGHT, TYPE_COLOR_DARK in js/core/util.js; the HUD kit reads them.
  tools/type_colors.js (in check.js) keeps them equal to HUD-STYLE "Type colours". Map text uses Light.
- Type chips: G.UI.typeChip (js/ui/ui.js), style in css/style.css `.type`; spec HUD-STYLE "Type chips".
- Gym art: recoloured by tools/gym_recolor.js (--sheet preview, --write); rerun node tools/gym_colors.js after.
  PNG writer shared in tools/png.js.
- Character panel chips (#76): good and bad bands; reader createEffectChipReader in js/ui/hud-overlay.js.
- On-sprite status animations (#78): js/ui/status-fx.js; no feet arcs (#80).
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
