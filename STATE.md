# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-27, home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
#146 is closed. Next: #173 (compare a held catch with owned copies, needs triage and an opening), merging this branch
to main (419 commits ahead; Jess runs it), then TODO.md "Next". Run `node tools/catchup.js`.

## Landed 2026-11-26 to 27 (home)
- #146 closed (feel test passed 2026-11-27): overflow catches wait in save.heldCatches and the Main Menu opens the
  keep-or-sell list (Make Room round trip, unanswered list sells on load). Tests: keep-sell-harness, smoke-keep-sell.
- #97 closed (remainder is #172) and #145 closed (damage class badge in move tooltips), 2026-11-26.

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
- #173 slice opening. #166 slice opening (goal, done, test). #164 sidegrades (own grilling); #165 open items. Type-to-material map and
  shop price (#163), friendship calculation, fatigue numbers, "last Elite Four beaten" wording.
- #131 (Silver bonuses, shops 2 to 4 check), #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
