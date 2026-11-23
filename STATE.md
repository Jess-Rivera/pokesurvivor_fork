# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-23, home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
Team menu and Upgrade popup sketches are ruled on (decision 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings).
Three slices, openings agreed: A #167, B #139 Part F, C #97. Next: the slice A prose
plan. #168 (mosaic background) is tuned and mounts with #167 (decision 2026-11-23-168-mosaic-background-look-and-settings).
TODO.md "Next" has the order. Run `node tools/catchup.js`.

## Landed 2026-11-23 (home)
- Team menu sketches reviewed and ruled on; #167 and #168 opened; mosaic tuning page at tools/library, Backgrounds.
- #97 grilled and approved (decision 2026-11-23-97-upgrade-system-redesign).
- #97 numbers drafted in #131 (decision 2026-11-23-97-upgrade-price-shape-bst-and-bands): exponential prices, BST
  star factor, bands at OOR 1/10/20/40/80. Numbers [Proposed]; design doc "Numbers (draft)" in docs/AI Outputs/Issue-97/.
- #166 opened: run telemetry (PokeCoins in the trace, traces folder, HTML dashboard). On the board in Triage.

## Watch
- Candy drops and is saved, but cannot be given yet (no Team menu UI). Changelog says "comes in a later update".
- PokeCoin income per run is estimated from the payout formula only (about 3,500 a full run); #166 replaces it.
- The loop counter is dev-set in gym.js and the Elite Four is not built: "N rolls on loop N" is harness-proven only.
- Board fixes are in TODO.md item 6. Canvas HUD holdouts in js/ui/hud.js stay (Jess).

## Open owner decisions
- #168: look after a reload, and the cost of overlapping bursts (decision file).
- #166 slice opening (goal, done, test). #164 sidegrades (own grilling); #165 open items. Type-to-material map and
  shop price (#163), friendship calculation, fatigue numbers, "last Elite Four beaten" wording.
- #131 (Silver bonuses, shops 2 to 4 check), #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
