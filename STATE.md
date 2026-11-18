# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-18 evening, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. Commit the glitch draft and the handoff (two commits drafted at session end), then push. If not yet done:
   `python tools/make_silver_font.py` (needs fonttools), then `node tools/smoke-ui-library.js`.
1. #155 UI Library v2, board work (the 155 plan docs before 155e are stale; trust the code):
   - Feel test Tokens, Fonts (155e): tier samples, ticking counters, the 2x canvas strip, pick Michroma's size set,
     the Fold Map's 9 inferred rows, and the move and stat tooltip size (Silver 20 or 10).
   - Primitives, Buttons, Glitch Draft tab: a possible new button design. Rest and focus built; next states
     (pressed, refused, disabled, negative), then whether it replaces button.slanted and button.rounded.
   - Then the TODO #155 list (colour names, rims, smoke rewrite, 155d, Pause composites).
2. Then #128: #138, then #146. #145 small and ready.

## Landed this session (2026-11-18 evening, untested in a browser)
- Font scheme ruled (decision 2026-11-18-155-font-scheme-three-tiers): Michroma for meta, Silver re-gridded to 10 px
  per em for Pokemon, BoldPixels for world numbers (damage canvas 8, crits 16), monogram for world words. Truth And
  Ideals and PokeBW retire. Menu buttons use Michroma (decision 2026-11-18-155-menu-buttons-use-michroma).
- tools/make_silver_font.py writes assets/fonts/Silver-10px.ttf (board only until #126). Committed 271920.
- Board: Fonts has Unified, Fold Map (40 places) and Reference tabs; smoke-ui-library checkFontsPage (6 checks).
- Board: Buttons has Current and Glitch Draft tabs. Glitch: grey.raised body, white bar and text on a grey.panel
  box; focus is one right-to-left swipe to an ink bar, teal #8cfff7 body and ink text, 200 ms. Not committed.

## Watch
- The game still loads today's fonts; nothing in js/ or css/ changed this session.
- tokens.js font job text for pokeBW and michroma is backwards (fix at #126, when both go).
- tools/library.html is about 1,750 lines (over the 1,000-line mark; split is #129's call).
- smoke-ui-library still fails its Colours checks until its rewrite. smoke-pause-menu: the known 401 px failure.
- Board drift: #29 in Blocked with no blocked label; #156 needs triage and a type label.

## Open owner decisions
- Jess: the poor UX calls in the ask dialog. #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
