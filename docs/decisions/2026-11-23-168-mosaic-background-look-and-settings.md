---
title: "#168 the Team menu's mosaic background: look, level-up starburst, water waves, two settings (Jess)"
date: 2026-11-23
issues: [168, 167, 126]
area: ui
canonical: "this file and the values in js/ui/lib/primitives/mosaic/mosaic.js (DEFAULTS)."
---
# 2026-11-23: #168 the Team menu's mosaic background: look, level-up starburst, water waves, two settings (Jess)

- [Approved] The Team menu's lowest layer, between the teal lines and under every panel: an animated mosaic. Team menu
  only for now. One fixed teal set; no second colour set and no type colours. Player input never moves it.
- [Approved] Values: MOSAIC_DEFAULTS in tools/library/background-draft.js (Jess's pasted settings). Tiles are 6 px at
  every screen size and never scale with the menu (the pixelated surface effect).
- [Approved] A level up plays one starburst in the Pokemon's primary type, from under the top of the detail panel. It
  cuts the teal light and leaves waves in it, like an object moving through water. About 37 s to full rest is kept.
- [Approved] Two settings: level-up starburst off, and static background instead of animated (performance).
- [Approved] It waits and mounts with the new Team menu (#167); today's Team screen does not get it.
- [Approved] The look holds after the level fix, with rings a second at 2. The build works out each burst's star shape
  once, to cut the cost of overlapping bursts (four cost about 21 ms a frame on the tuning page).

Canonical: this file and the values in js/ui/lib/primitives/mosaic/mosaic.js (DEFAULTS).
