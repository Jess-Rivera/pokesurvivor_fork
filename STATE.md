# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-26, home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
Slice C, the #97 Upgrade popup, is built, reviewed and fixed; Jess's feel test of the whole popup closes it (#97 in
Needs Playtest). After it: TODO.md "Next". Run `node tools/catchup.js`.

## Landed 2026-11-26 (home)
- Grilling of the popup plan: decision 2026-11-26-97-upgrade-popup-open-questions; #169 (leaders with upgrades) split out.
- C1 per-copy upgrade catalog, prices and bands (js/data/upgrades.js); C2 raised base stats in G.Stats, crit, Cooldown,
  Regeneration++ (field and bench); C3 the popup (js/ui/menu-upgrades.js). Plan and notes:
  docs/AI Outputs/Issue-97/97 - Upgrade Popup Plan.md. Checks: upgrades-harness, tools/smoke-upgrade-popup.js.
- The old upgrades and save.pupg are no longer read (Magnet, Fortune, Card Reroll, Veto return in Character Upgrades).
- Review (docs/AI Outputs/Issue-97/97 - Slice C Review.md): keys cursor no longer falls behind the popup; portrait
  switch arrows (Q, E, 1 to 6, wrap) built; card shine dropped; E arrow is a mirrored glitch button; Team menu arrow
  keys follow the cursor bar (tools/smoke-team-menu-keys.js). Two decision files of 2026-11-26.

## Watch
- Starting moves are bought and saved but act only with #150. Shedinja's greyed HP card waits on #142.
- tools/smoke-pause-menu.js throws in its EV screen section (predates slice C): #170.
- The EXP Bag popup covers the bottom right portraits until #158.
- PokeCoin income per run is estimated from the payout formula only (about 3,500 a full run); #166 replaces it.
- tools/smoke-ui.js has 15 failures that predate #167 (run shop, catch window height, Shop balls).
- assets/ui/upgrades/ art is unused since the old screen went.
- Up from the Box 3 to 5 tabs reaches the detail panel's Moves, not the grid (Jess: fine for now, dropped).

## Open owner decisions
- #166 slice opening (goal, done, test). #164 sidegrades (own grilling); #165 open items. Type-to-material map and
  shop price (#163), friendship calculation, fatigue numbers, "last Elite Four beaten" wording.
- #131 (Silver bonuses, shops 2 to 4 check), #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
