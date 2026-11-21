# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-21 midday, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`, then `node tools/check.js` and `npm run format` (neither ran from Quick today), commit, and
   `git push origin feature/128-acquisition`.
1. Close #155 and file the two new issues from docs/ASCII Concept Maps/155 - Close-out Drafts.md.
2. Feel test the Ancient Power line ("10% team all stats +1") on its card and in the pause sheet.
3. Then #128 (#138, then #146), or #126 (applies the board). #145 small and ready.

## Landed 2026-11-21 (Quick)
- Board approved: run.hud.moveMart, .trMart, .forgetMove, .bondSelection (team rows, the four slots in one row,
  the first pick's rim bond pink, a Bond or Cancel ask), .teamItems; main.shop.tms (Able to Learn 12 px on two
  lines, one bar row as wide as the grid, the search fills the rest).
- Ruled: the board ends at the primitives and the approved composites (decision
  2026-11-21-155-board-ends-at-primitives). The main.team first pass and the Pause placeholders are gone. #155 done.
- Ruled for #126: the Team menu mockup and five rulings (decision 2026-11-21-team-menu-rebuild-rulings).
- Game code (morning, approved): js/ui/move-info.js folds five matching stat raises into "all stats".

## Game changes owed at #126 (ruled)
- The run shops, the bond popup, the TMs tab, team items HUD without names or trackers, catch result a toast,
  window 980 x 424, Let It Go ask, cursor ring with no blink, G.UI.ask takes the confirm's intent only.
- Build in the game from the primitives: pause screens, Team (per its decision), Pokedex, the other main screens,
  the level-up draft. Box buying moves to Character Upgrades.

## Watch
- Board drift: #29 in Blocked with no label; #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage;
  #137 #151 #152 #153 closed but still needs-playtest.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). #156 close or keep.
- #126: reveal-first and fewer dialogs; cursor.bar with the mouse. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
