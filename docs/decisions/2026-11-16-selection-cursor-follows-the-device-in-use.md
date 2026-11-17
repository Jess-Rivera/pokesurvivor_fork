# 2026-11-16: the selection cursor follows the device in use (Jess)

- Using the mouse (a real move, not a jitter of a few pixels, or a click): the selection cursor shows only on the eligible
  item under the mouse, or nowhere. It never stays behind on an item the mouse has left.
- Using the keyboard: any key press snaps the cursor back to the last eligible item it was on.
- Tab icons are never eligible (the Shop's tabs switch by click or Q / E).
- Built first in the Main Menu Shop (#149a). The page-wide mode lives in the HUD kit (`inputMode`, js/ui/hud-kit.js) so
  every screen can read it; the catch screen and the other cursor screens adopt it with the UI unification (#126).

Superseded in part (2026-11-17): with the mouse no corners show at all; see 2026-11-17-no-selection-cursor-with-the-mouse.

Canonical: js/ui/hud-kit.js "the input mode" comment; js/ui/gacha-ui.js header for the Shop.
