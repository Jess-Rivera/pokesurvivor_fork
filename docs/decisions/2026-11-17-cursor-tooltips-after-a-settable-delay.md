# 2026-11-17: the selection cursor shows tooltips after a settable delay (Jess)

- When the selection cursor (keys now, a controller later) rests on an item that has a hover tooltip, the tooltip shows
  after a delay, so keyboard and controller players can read tooltips too. The mouse still shows them at once.
- The delay is a setting: Settings, Controls, Keyboard, "Tooltip Delay" (0.5, 1, 1.5 or 2 s; 1 s by default). It is a
  device setting (G.Settings `cursorTooltipDelay`); a store without it reads as 1 s.
- Built first on the Main Menu Shop's owned team items (#149c). Other cursor screens adopt it with the UI unification (#126).
- Same slice: the Shop's owned-items grid is 4 across and scrolls, since content updates will add many team items.

Canonical: js/core/settings.js header; js/ui/gacha-ui.js header (CursorTip) for the Shop.
