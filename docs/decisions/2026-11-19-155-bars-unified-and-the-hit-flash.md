---
title: "#155 the bars fold to the Unified colours; a hit's cut piece flashes white, goes grey and falls (Jess)"
date: 2026-11-19
issues: [155]
area: ui
canonical: "js/ui/lib/primitives/bar/bar.js header and docs/HUD-STYLE.md \"Motion\", once #126 applies it; until then this file."
---
# 2026-11-19: #155 the bars fold to the Unified colours; a hit's cut piece flashes white, goes grey and falls (Jess)

- bar.life keeps its B2 shape. Colours fold by the Fold Map: tab, body and outline greys keep their hex; the track
  moves to grey.slate and grey.mid; HP high to green.base and green.dark; HP middle to the canon Electric #FAC000 and
  #A37D00 (as Lv); HP low to red (same hex). bar.timer is unchanged (its white is grey.white).
- The hit: the cut piece no longer keeps its band colour (a green piece hung off a bar that had just turned yellow). It
  flashes pure white 80 ms while hopping up 4 px, goes grey (grey.paper middle row, grey.mid shade rows) and falls at
  once, 40 px below the track, fading over 400 ms, drifting 8 px right (off the track's empty end) at a steady rate, a
  thrown arc. Today's 1 s hold before the fall is dropped. Cut to gone is about 0.5 s.
- Not taken: a flat paper piece; a drift to the left, alternating, or away from the attacker.
- Applied at #126. Board: Bars, Unified tab (tools/library/bars-draft.js, bars-draft.css).

Canonical: js/ui/lib/primitives/bar/bar.js header and docs/HUD-STYLE.md "Motion", once #126 applies it; until then this file.
