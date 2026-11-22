---
title: "#155 main.shop.tms: the TMs tab as drawn; approved (Jess)"
date: 2026-11-21
issues: [155]
area: ui
canonical: "this file until #126 applies it."
---
# 2026-11-21: #155 main.shop.tms: the TMs tab as drawn; approved (Jess)

- The bar: field.text (Search TMs), the Type field.dropdown and toggle.power "Able to Learn", shown off. The toggle's
  label is 12 px on two lines ("Able to" over "Learn", 14 px line height, centred on the bar; the toggle's own is 18)
  so it sits clear of the Pokemon panel. The bar is one row as wide as the card grid: the toggle right-justified at
  its end, its label left-justified, the Type box fixed (170 px) and the search growing to fill the rest. Tried and dropped the same day: 12 px on one line, 16 px on two lines; the
  18 px narrower-search option is dropped too.
- The cards: the Team Items card carried over on panel.shopCard, the type's TM disc, the move's generated line. Learned
  and Known disabled (2026-11-20-155-tm-learned-and-known-are-disabled); a TM the chosen Pokemon cannot learn dimmed,
  its refused Buy at full strength.
- The Pokemon panel: panel.clean with the cards' grey.raised body, the chosen Pokemon (portrait.round.selected, its
  name in Silver), the team of six (the chosen one selected), a divider, the search and Filter, the Pokebox grid with
  cursor.ring on one face.
- Board: tools/library/shop-draft.js (tmsPane, tmsPanel). Applied at #126 (js/ui/shop-tms.js).

Canonical: this file until #126 applies it.
