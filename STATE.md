# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-18 night, Claude Code (home). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. Push if not yet done: `git push origin feature/128-acquisition` (six local commits from 2026-11-18 night).
1. #155 UI Library v2, board work (the 155 plan docs before 155e are stale; trust the code):
   - #157 clean panel in the button.glitch style (the places in decision 2026-11-18-155-pixel-panels-for-one-pokemon-
     clean-for-the-rest), drafted on Primitives, Panels one state at a time, as the button was.
   - Still owed from earlier: Fonts feel test (Michroma's size set, the 9 inferred Fold Map rows, tooltip Silver 20 or 10).
   - Then the TODO #155 list (colour names, rims, smoke rewrite, 155d, Pause composites, #156).
2. Then #128: #138, then #146. #145 small and ready.

## Landed this session (2026-11-18 night, home)
- Board moved to tools/library/index.html: board.css plus plain scripts in load order; tools/library.html redirects.
  eslint has a block for the board's shared globals (lint 0 errors). Pikachu path fixed for the new folder.
- Primitives, Buttons, Glitch Draft: `button.glitch`, done and feel-tested. States rest, refused, disabled, then per
  intent (Neutral teal, Negative red.base, Positive green.base): focus (120 ms swipe), press (CRT off and on, ink),
  refusedFocus (grey.mid body, the intent's colour on the bar; press shakes), glitch (secret: burst, gap, count).
- Primitives, Toggles: `toggle.power`, off (ring, teal.dark) and on (bar, teal.base) only; flips are the CRT on its
  side, in a fixed 22 px box.
- Decisions: button.glitch replaces button.slanted and button.rounded at #126 (Current tab marked retiring); pixel
  panels for one Pokemon, clean for the rest. docs/META-NARRATIVE.md committed. #126 has the swap list.

## Watch
- The game is unchanged: js/ changes this session were formatting only, plus the board-only Pikachu path.
- smoke-ui-library still fails its Colours checks until its rewrite; it was not run this session (Jess: board only).
- smoke-pause-menu: the known 401 px failure. tokens.js pokeBW and michroma job text backwards (fix at #126).
- Board drift: #29 in Blocked with no label; #155 card sits in Triage; #156 needs triage.

## Open owner decisions
- Jess: the poor UX calls in the ask dialog. #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
