# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-24, home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
Slice B, #139 Part F (Level Up, EXP Bag, XP bar) is built and waits for Jess's feel test. After it: slice C, the #97
Upgrade popup. TODO.md "Next" has the order. Run `node tools/catchup.js`.

## Landed 2026-11-24 (home)
- #139 Part F: G.Candy levelUp, giveMany, levelProgress; js/ui/menu-team-exp-bag.js; bar.exp. Rulings: decision
  2026-11-24-139-part-f-candy-in-the-team-menu. Plan and differences: docs/AI Outputs/Issue-139/.
- #167 and #168 closed; decision 2026-11-24-167-team-menu-saves-at-once.

## Watch
- Feel-test: starbursts come 0.15 s apart, closer past 20 levels; the mosaic keeps 4 at once, so a big jump cuts older ones.
- PokeCoin income per run is estimated from the payout formula only (about 3,500 a full run); #166 replaces it.
- The loop counter is dev-set in gym.js and the Elite Four is not built: "N rolls on loop N" is harness-proven only.
- Board fixes are in TODO.md item 6. Canvas HUD holdouts in js/ui/hud.js stay (Jess).
- tools/smoke-ui.js has 15 failures that predate #167 (run shop, catch window height, Shop balls).

## Open owner decisions
- #166 slice opening (goal, done, test). #164 sidegrades (own grilling); #165 open items. Type-to-material map and
  shop price (#163), friendship calculation, fatigue numbers, "last Elite Four beaten" wording.
- #131 (Silver bonuses, shops 2 to 4 check), #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
