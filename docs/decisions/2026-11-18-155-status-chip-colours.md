# 2026-11-18: #155 status chips take canon type ramps or the unified colours (Jess)

- From Generation VIII the paralysis, frozen, burned and poisoned icons match the Electric, Ice, Fire and Poison type
  icons (Bulbapedia "Status condition"). So PAR, FRZ, BRN and PSN use those type ramps: fill = the type base, shade =
  the type dark.
- The rest:

| Chip | Fill (or rim and text) | Shade | Why |
| --- | --- | --- | --- |
| SLP | grey.mid #828282 | grey.slate #495151 | The Scarlet/Violet sleep icon is grey; no new colours |
| Bad PSN | Poison dark #5e2a84 | #341749 (55% of it, ramp rule) | From Gen V bad poison's flag is darker than poison's |
| CNF (hollow) | yellow.base #fff000 | | The birds are yellow; 14.5 from PAR's Electric fill |
| DZE (hollow) | blue.base #00baf3 | | The question mark is blue |
| DRW (hollow) | Psychic base #ef4179 | | The nearest canon to today's #e73963 (5.0) |
| TRP (hollow) | Normal light #c1c2c1 | | Wrap and Bind are Normal moves |

- The whole status kit now uses type colours and the 28 unified colours, plus one new shade (bad poison).
- Distances are CIEDE2000 (about 1 the smallest visible step, over 5 clearly different). Biggest change on screen: FRZ
  goes from #218cf7 to the Ice base #3dcef3 (24.4).
- The game is unchanged until #126; HUD-STYLE "Status chips" updates then.

Canonical: tools/library.html, Colours 2.0 Unified, Status group (STATUS_TYPE_SWATCHES).
