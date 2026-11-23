---
title: "#168 the Team menu's mosaic background: look, level-up starburst, water waves, two settings (Jess)"
date: 2026-11-23
issues: [168, 167, 126]
area: ui
canonical: "this file and the values in tools/library/background-draft.js until #168 builds the library piece."
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
- Rings a second showed no difference from 0 to 8 (Jess), so the build leaves it out.
- [Open] Whether the look still holds after a reload (the paste came from a copy without the rings and level fix), and
  whether the build spreads the star-shape cost (four overlapping bursts cost about 21 ms a frame).

Canonical: this file and the values in tools/library/background-draft.js until #168 builds the library piece.
