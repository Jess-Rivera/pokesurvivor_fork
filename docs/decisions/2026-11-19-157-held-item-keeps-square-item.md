# 2026-11-19: #157 the held item keeps square.item, folded to the Unified colours (Jess)

- The held item is one Pokemon's, so it is pixel. It keeps square.item (the B2 bag button: chamfered corners and a 1 art
  pixel rim) at today's sizes, 48 px on pause.pokemonDetail.heldItem and 40 px on run.hud.heldItem.
- Unified colours: outline grey.ink, empty rim grey.slate, checker grey.panel and grey.raised (all the same hex as
  today); the filled rim moves from the Lv yellow #f3b200 to typeElectric.base #FAC000, as Lv does in the Unified fold.
- The body takes panel.slanted's slot grid (8 x 8 px tiles: 6 px grey.panel squares, 2 px grey.raised lines) in place
  of today's 1 art pixel checker (Jess 2026-11-19), so the held item and the move slot share one pixel body.
- Not taken: panel.pixel at 64 px. Its rim and corner bumps need about 64 px to clear a 32 px icon (under 44 px it cannot
  draw), so held items would grow and crowd the run HUD. square.item is B2 art, which the pixel list allows.
- Applied at #126. Board: Squares, Unified tab (tools/library/squares-draft.js).

Canonical: js/ui/lib/primitives/square/square.js header, once #126 applies it; until then this file.
