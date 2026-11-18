# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-17 (seventh session), Claude Code (home). Branch: feature/128-acquisition (rework/shop merged in).
No branch rules file.

## START HERE (next session, either tool)
0. #155 UI Library v2 (child of #126), a dev-process slice: a board page (tools/library.html) as the shared UI
   language. 155a landed (tokens, board shell, Tokens pages; no visible change). Next 155b Buttons, then 155c Panels,
   155d the main.shop.pokeball composite, each on Jess's OK, each with a feel test. Plan and as-built:
   docs/ASCII Concept Maps/155 - UI Library v2 Build Plan.md.
1. Then #128: #138 (Lost Pokemon pool), then #146.
2. Ready with nothing owed: #145 (small tooltip bug). #150 blocked on #97.

## Landed this session (2026-11-17, seventh)
- #137 feel test passed, closed.
- #155 opened with Jess: opening, mockup (assets/excalidraw/pokeswarm-library-html.excalidraw) and survey
  (docs/ASCII Concept Maps/UI Component Inventory.md). Decision 2026-11-17-155-design-tokens-in-tokens-js.
- 155a: js/ui/lib/tokens/tokens.js (G.Tokens) loads first everywhere util.js does; util.js reads the type colours from
  it; the kit's colour tables read it. tools/library_doc_colours.js (in check.js). smoke-ui-library checks the board.

## Watch
- tokens.js must load before util.js: dev.html, main.js NEED, the tools and every harness that loads util.js.
- The board writes nothing to localStorage (file:// shares it with the save).
- smoke-ui-library is not in check.js; run it after touching either library page.
- Preact signals: read signals in a small child component, not in a pane that must redraw on every save.
- game.js handleKeys polls Esc for menu screens; a screen with its own Esc must be left off that list.
- smoke-ui: sometimes one run fails on a local-server asset load; rerun. Layout screenshots: serve over http.
- Board drift: #29 in Blocked with no blocked label; #86, #110, #111, #120, #121 in Triage though labelled ready.

## Open owner decisions
- #97 purpose and shape. #131 bonus sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139).

Rules: CLAUDE.md.
