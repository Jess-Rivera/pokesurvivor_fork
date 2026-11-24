---
title: "#167 Team menu slice A: favorites sell singly, tabs only, lifted Pokemon, Pokedex tab, bulk sell key (Jess)"
date: 2026-11-23
issues: [167, 126]
area: ui
canonical: "this file until the slice builds the screen."
---
# 2026-11-23: #167 Team menu slice A: favorites sell singly, tabs only, lifted Pokemon, Pokedex tab, bulk sell key (Jess)

- [Approved] A single favorite sells after a warning, as today; bulk sell skips favorites. Locked and team copies never
  sell. This corrects "favorite" in #167's end-goal test.
- [Approved] Box tabs only. The sketch's Box N dropdown is stale.
- [Approved] A lifted Pokemon is attached to the cursor until Enter is pressed again; the normal arrow moves carry it.
- [Approved] Pokedex tab: an unowned species is a silhouette; the Owned / Unowned filter stays. Sorts that only fit a
  copy are left out of the Sort list there, and a copy sort falls back to Dex number on that tab (the assistant's
  UX call, as Jess asked).
- [Approved] Shift+Enter or Shift+Space on Sell Pokemon starts bulk sell by keyboard.
- [Approved] Level Up (slots and detail) and EXP Bag are drawn disabled until slice B.

Canonical: this file until the slice builds the screen.
