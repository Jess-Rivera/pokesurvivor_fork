# 2026-11-19: #155 chips are one B2 capsule; chip.status is Silver 10 at 1 px, chip.type is Silver 10 at 1 px or Silver 20 at 2 px, in capitals (Jess)

- One shape, the B2 capsule (corners stepped 2, 2, 1, 1, a 2 art pixel shade rim), for the status, effect and type
  chips. A chip names what one Pokemon has, so it is pixel (2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest).
- chip.status, the run screen's status and effect chips: 1 px per art pixel, Silver 10, 40 x 17 (was 70 x 24 at 2 px,
  HudText 20). The chip's pixel and the font's match. Solid (fill over shade) and hollow (the minors) as today; the
  glow and the one art pixel timer stay, at the chip's scale. The HUD's chip area shrinks from 114 px tall to 86.
- chip.type: either 1 px per art pixel with Silver 10 (60 x 17) or 2 px with Silver 20 (116 x 32). The same capsule,
  base over dark, no glow, no timer. Which place takes which is decided in the composites.
- Type names are capitals (FIGHTING, not Fighting): capitals never fall below the line, so no tail touches the rim.
  This reverses the casing line of 2026-11-11-81-type-chips-and-type-text-on-the-map ("Ghost", not "GHOST").
- Colours: the Fold Map's (status chips on the canon type ramps, REG green, LAN Fighting, PIN Electric light).
- Not taken: Silver 20 on a 32 px chip for every chip (kept only as chip.type's 2 px scale); Silver 10 on today's
  2 px chip (1 px letters on a 2 px chip).
- Open: the 1 px chips beside the HUD's 2 px art, judged in run.hud.playerActive. Applied at #126.
  Board: Chips, Unified tab (tools/library/chips-draft.js, chips-draft.css).

Canonical: docs/HUD-STYLE.md "Status chips" and "Type chips", once #126 applies it; until then this file.
