# 2026-11-20: #155 run.hud.playerActive.area: the inactive move slots are dimmed; the wells clear the slot's bands (Jess)

- Active slot: the slot the keys use now draws as it is; the other three are dimmed to 50% brightness (darkened, not
  see-through, so the map never shows through). No cursor on the move slots: cursor.bar stays the menus' key focus.
  Tried and dropped the same day: the cursor bar beside the slot (no room in the 6 px column gap), the active body in
  its rim's dark.
- Wells: 32 px, 6 px down, so 2 px clear of the slot's dark bands above and below (today 36 px at 4 px, flush with
  both); centres unchanged (47 px in from each end). The type glyph fills the inside of the well's 2 px ring.
- Family badge: 7 x 7 art at 2 px in the well's bottom right corner, clear of the bottom band (today it hangs 2 px
  past the well). Its glyph takes yellow.base; its square keeps today's #2b3454 (no Unified tone yet).
- Cast flash: unchanged (white, 55% peak, fading over 180 ms).
- Bond count: above Silver, one stack gap (8 px) over the Silver count, right edges flush with Silver and the portrait;
  the icon, then its count (×N in Silver 20) from two bonds up. Today it sits under the Lv number, which here left it
  4 px off the screen's bottom.
- Shake Off prompt: today's B2 badge in the Lv yellow, centred on the slots (today 18 px left of centre), one stack gap
  over the good chip band; its text in Michroma 20 (the game talking; today HudText 30).
- The run timer is unchanged in place (BoldPixels 16, dim, centred under the slots).
- Applied at #126 (js/ui/hud-player-panel.js, css/hud-overlay.css). Board: tools/library/hud-area-draft.js.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Character info panel".
