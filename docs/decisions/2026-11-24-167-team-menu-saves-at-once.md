---
title: "#167 Team menu feel test, round 1: the roster saves at once, Back and Revert, layout that follows the window (Jess)"
date: 2026-11-24
issues: [167, 126]
area: ui
canonical: "this file until a Team menu spec exists."
---
# 2026-11-24: #167 Team menu feel test, round 1 (Jess)

- [Approved] Roster changes save at once. Back (was Commit) and Esc leave. Revert (was Discard) puts back the roster
  as it was when the menu opened and leaves. This replaces the Commit and Discard saving in
  2026-11-23-97-139-team-menu-and-upgrade-popup-rulings.
- [Approved] Revert goes by UUID: a leveled or evolved copy comes back as it is now; a copy no longer owned leaves its
  slot empty, with a toast.
- [Approved] If that copy was the lead, the next one still owned moves up (slot 1 is never empty); if none is left, the
  roster stays as it is.
- [Approved] Bars (round 2): 30 px on the left whatever the window, a 30 degree slope; their text and buttons shrink to
  stay right of it. The detail panel's steps are 45 degrees, the deep end about 1.4 times the band. Team column always left,
  detail panel always far right under the bump, the grid takes the room between. Sell, Pokedex and Box N stay held.
- [Approved] Pokedex silhouettes are still. No teal box round a selected Pokemon; a selected empty slot keeps it.

Canonical: this file until a Team menu spec exists.
