# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-18, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. Nothing from 2026-11-18 is committed. Run `npm run format`, `node tools/check.js`, then smoke-hud-overlay,
   smoke-pause-menu, smoke-pause-inventory, smoke-ui and smoke-berry-slots; commit the three drafted commits; push.
   smoke-ui-library will fail on its Colours checks until it is rewritten (TODO #155 list).
1. #155 UI Library v2: feel tests for 155b to 155c-6, then the TODO #155 list (colour names, rims, smoke rewrite,
   155d, Pause composites). Plans and as-builts: docs/ASCII Concept Maps/155b to 155c-6.
2. Then #128: #138, then #146. #145 small and ready.

## Landed this session (2026-11-18, untested in a browser)
- Game: the library primitives buttons (button.slanted, button.rounded), panels (pixel, thin, flat, slanted, card
  vertical and horizontal), item squares and grids, bars (life, timer), the ask dialog (modal.dialog, new keys) and
  the round portrait; screens draw from them. Shop Pokeballs and TMs card clip fixed; short prices.
- Board: primitive pages show states as tiles and props in a table (155c-6). Tokens, Colours has three tabs: Unified
  (7 greys and 7 UI colours, 28 non-canon colours, plus the canon type, status, attack, pocket, stat and time
  ramps), Fold Map (every colour the game uses today and where it lands) and Reference Not in Game.
- Decisions 2026-11-18: library pieces named by look; ask dialog keys; primitive states vs props; accent ramp rule;
  unified palette; status chip colours. Research: docs/ASCII Concept Maps/155 - Game UI Colour Count Research.html.

## Watch
- tokens.js must load before util.js everywhere util.js loads. The board writes nothing to localStorage.
- The Unified colours are a draft on the board only; the game changes when #126 applies them.
- tokens.js job text for typeBodyDark and typeBodyLight changed (descriptions only, the game does not read them).
- smoke-pause-menu: the known 401 px failure. smoke-ui: rerun once on a local-server asset failure.
- Board drift: #29 in Blocked with no blocked label; #156 needs triage and a type label.

## Open owner decisions
- Jess: the poor UX calls in the ask dialog. #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
