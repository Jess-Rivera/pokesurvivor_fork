# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-27 (late), home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
#173 (held catch compare) is BUILT and committed 2026-11-27; Jess felt it once ("ok"). Next session:
a fuller feel test (catch screen panels, keep-or-sell owned box and Sell, the Team menu's detail panel), then close
#173. Still open on this branch: #139 (8b, 8c), #140, #141, #142, #143 (#144 deferred). Merge to main only after #143.

## Landed 2026-11-27 (home)
- #173 built: a held catch is a whole copy (rolled when the catch window opens), placed as it is; both screens get
  short detail panels (G.MenuTeamDetail.ShortPanel), the keep-or-sell list an owned box and Sell. Plan and what differs:
  docs/AI Outputs/Issue-173/173 - Held Catch Compare Plan.md. Rulings: decision 2026-11-27-173-mockup-short-detail-panels.
- Tests: keep-sell-harness (13 sections), smoke-keep-sell, new tools/smoke-catch-detail.js, all passing.
- #146 closed (feel test passed 2026-11-27).

## Watch
- Starting moves are bought and saved but act only with #150. Shedinja's greyed HP card waits on #142.
- smoke-ui and smoke-pause-menu were not rerun to the end after #173 (smoke-ui had 15 old failures).
- Gen 8 and 9 learnsets look thin: the 178 imported moves are all Gen 1 to 6 (89 from Gen 1).
- tools/smoke-pause-menu.js throws in its EV screen section, and its stat hex check fails when the starter has #97
  upgrades: both on #170.
- The EXP Bag popup covers the bottom right portraits until #158.
- PokeCoin income per run is estimated from the payout formula only (about 3,500 a full run); #166 replaces it.
- tools/smoke-ui.js has 15 failures that predate #167 (run shop, catch window height, Shop balls).
- assets/ui/upgrades/ art is unused since the old screen went.
- Up from the Box 3 to 5 tabs reaches the detail panel's Moves, not the grid (Jess: fine for now, dropped).

## Open owner decisions
- #174 shiny catches (new). #166 slice opening (goal, done, test). #164 sidegrades (own grilling); #165 open items. Type-to-material map and
  shop price (#163), friendship calculation, fatigue numbers, "last Elite Four beaten" wording.
- #131 (Silver bonuses, shops 2 to 4 check), #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
