# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-26 (afternoon), home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
#146 keep-or-sell list: the slice opening waits for Jess (goal, done, test and four open decisions in
docs/AI Outputs/Issue-146/146 - Keep or Sell Slice Opening.md). After it: TODO.md "Next". Run `node tools/catchup.js`.

## Landed 2026-11-26 (home, afternoon)
- #97 closed: slice C feel-tested; the locked buy button reads "Lv N" (fits the button). Remainder filed as #172
  (Character Upgrades).
- #145 closed: move tooltips show the damage class badge (assets/icons/category) beside the name, on the pause menu
  Pokemon screen and the old Team sheet (G.MoveInfo.catIcon via G.Sheet.detailOf; shared tooltip nameIcon).
  Test: tools/smoke-pause-menu.js #145 block.

## Watch
- Starting moves are bought and saved but act only with #150. Shedinja's greyed HP card waits on #142.
- Gen 8 and 9 learnsets look thin: the 178 imported moves are all Gen 1 to 6 (89 from Gen 1).
- tools/smoke-pause-menu.js throws in its EV screen section, and its stat hex check fails when the starter has #97
  upgrades: both on #170.
- The EXP Bag popup covers the bottom right portraits until #158.
- PokeCoin income per run is estimated from the payout formula only (about 3,500 a full run); #166 replaces it.
- tools/smoke-ui.js has 15 failures that predate #167 (run shop, catch window height, Shop balls).
- assets/ui/upgrades/ art is unused since the old screen went.
- Up from the Box 3 to 5 tabs reaches the detail panel's Moves, not the grid (Jess: fine for now, dropped).

## Open owner decisions
- #146 opening and its four decisions. #166 slice opening (goal, done, test). #164 sidegrades (own grilling); #165 open items. Type-to-material map and
  shop price (#163), friendship calculation, fatigue numbers, "last Elite Four beaten" wording.
- #131 (Silver bonuses, shops 2 to 4 check), #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
