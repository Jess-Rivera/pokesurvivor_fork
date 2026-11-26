---
title: "#97 Upgrade popup: switch arrows beside the portrait (wrap, Q and E, 1 to 6), no shine on a bought card (Jess)"
date: 2026-11-26
issues: [97, 171]
area: ui
canonical: "js/ui/menu-upgrades.js header"
---
# 2026-11-26, #97 Upgrade popup: switch arrows and no shine (Jess, after the slice C review)

- [Approved] The sketch's arrows beside the portrait are built: they move to the previous or next caught team member
  and wrap around. With one caught member they are hidden.
- [Approved] Keys: Q is the left arrow (previous), E the right (next), each labelled; 1 to 6 jump to that team slot, as
  the slot numbers do in a run. The arrow keys keep moving the cursor. E's button is mirrored (cut corner, bar and
  focus swipe flipped, the label not) so both point outward from the portrait.
- [Approved] A fully bought card has no buy button and keeps its normal coloured edge. The sketch's circling white
  shine is dropped. The circling rim as a selected-portrait look is an idea on #171.

Canonical: js/ui/menu-upgrades.js header.
