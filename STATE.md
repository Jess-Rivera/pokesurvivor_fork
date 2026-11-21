# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-21 afternoon, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
1. #128 S6 Pokeballs look and catch.window: feel tested by Jess 2026-11-21, committed. #137 playtest cleared.
2. Next on #128: #138 S7 (open: floater escort H1, H2), #146, then #139 S8 (open: candy CD1 to CD4,
   friendship minutes), which gates #140 to #143. #128's body lists stale open decisions; check it.
3. #145 small and ready (not #128). Feel test the Ancient Power line.

## Landed 2026-11-21 (Quick)
- Library: Unified tokens (matching old tokens alias them), button.glitch (whole), panel.clean, panel.shopCard,
  cursor.ring (2 px), well, toast, modal.dialog rebuilt, panel.pixel's two-type dither, font.silver; kit BallBelt.
- Screens: the Shop window, rail, Exit and Pokeballs tab; the catch screen. Ball centreShift generated.
- Ruled: unify-work-builds-final-building-blocks, cursor-ring-2px, ball-centring-keeps-wobble-lean, board ends at
  the primitives, Team menu rulings. #155 closed; its drafts not filed (Jess).
- Fixed: the catch throw's first frame (spin frame -1); catch panel and belts placement; cursor.ring under the ball.
- Ruled: cursor-ring-draws-under-what-it-rings.

## Game changes still owed at #126 (ruled)
- The run shops, the bond popup, the TMs tab, team items HUD without names or trackers, cursor.bar, the tooltip
  (#158), reveal-first in the menu windows, dropping the purchase asks.
- Build from the primitives: pause screens, Team, Pokedex, the other main screens, the level-up draft. Box buying
  moves to Character Upgrades.

## Watch
- Canvas HUD holdouts in js/ui/hud.js: left on the canvas for now (Jess 2026-11-21), no issue.
- Board drift: #29 in Blocked with no label; #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage;
  #137 #151 #152 #153 closed but still needs-playtest.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). #156 close or keep. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
