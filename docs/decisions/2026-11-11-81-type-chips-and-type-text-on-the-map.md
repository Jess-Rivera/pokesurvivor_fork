## 2026-11-11, #68 and #81: type-coloured text on the map uses Light; type chips in the reference-sheet style (Jess)
Type-coloured text drawn over the map (the horde countdown, the dev console log) uses the SV Light tone, since Base is too dark there for Ghost, Dark and Ground. Fills, projectiles and effects stay Base.
Type chips follow the Spriters Resource Pokedex type sheet: SV Base fill, a 2 px rim in the type's SV Dark tone, white text with a hard pixel shadow one pixel right, down and diagonal.
The shadow is the palette's Text outline `#101010`, not the sheet's own grey: chips use only palette colours. Casing stays "Ghost", not "GHOST".
The level-up card tag gets the same white text and shadow, without the rim, since it is not always a type.
Canonical: docs/HUD-STYLE.md "Type colours" and "Type chips".
