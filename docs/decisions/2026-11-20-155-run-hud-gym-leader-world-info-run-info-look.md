# 2026-11-20: #155 the run screen's top: run.hud.gymLeader, run.hud.worldInfo and run.hud.runInfo looks (Jess)

- Names: run.hud.worldInfo is the map panel (World Level, Region, Map, the weather card) and the kills line;
  run.hud.runInfo is the DPS-Upgrades panel, top left. run.hud.portrait is gone: the portrait is part of
  run.hud.playerActive.area.
- run.hud.gymLeader: the approved bar.life at 3 px per art pixel (693 px; today 696), the name and Lv above it in
  Silver 20, one 48 px portrait.round per filled leader slot under it (the active one in the gym's type base, the
  rest ink, fainted dimmed). Elites: the same bar, no circles.
- run.hud.worldInfo: today's layout and weather card shape, Unified colours (the card's outline grey.panel, body
  grey.slate, dim text grey.mid). Fonts by tier: World Level and kills in BoldPixels (48, 16), the label, Region, Map
  and the card's effect line in monogram 16, the weather's name in monogram 32 (today HudText 20 and 30).
- run.hud.runInfo: today's layout, sizes and Michroma, Unified colours (grey.panel at 50% with a grey.slate edge,
  the DPS number yellow.base, pick counts teal.base, the strip grey.panel in an ink outline). Square corners (today
  4 px stepped); the edge a real border, since the body is see-through.
- Board: tools/library/hud-top-draft.js. Applied at #126.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md's sections for each panel.
