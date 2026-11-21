# 2026-11-19: #155 run.hud.teamSlot: bar.life's format without the background, 2 px cursor gap, the berry pocket in circles (Jess)

- The roster row's HP bar is bar.life's format with no background shape: the HP tab plate and the 5-row track only. The
  name moves 2 px up (top 15) to clear the taller bar.
- The held item sits 10 px off the box (was 8), so 2 px separate it from the cursor bar, on every row. Game change at #126
  (hud-roster-panel.js HELD.gap, and buffsLeft follows).
- The berry pocket is a small panel.pixel in the color.pocketBerries ramp above the roster (12 px gap), holding a 2x2 of
  36 px circles as the move slot's wells, 6 px apart, the inside padded 4 px past the rim. The circles keep a solid dark
  fill (grey.panel); the stroke is ink when empty and color.pocketBerries.base when it holds a berry. No names.
- Replaces the 40 px item squares (today's 20 px gap; a 10 px gap was tried). Panel shape and sizes are board numbers,
  open to Jess's feel test.
- Applied at #126. Board: tools/library/hud-team-slot-draft.js.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Roster, berry bag and run items".
