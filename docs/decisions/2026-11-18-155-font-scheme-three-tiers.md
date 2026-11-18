# 2026-11-18: #155 the game's text uses four faces in three tiers: meta, Pokemon, world (Jess)

- Meta, "the game talking": Michroma (`HudModule`). Menus, menu buttons, toasts, titles, module panels, the Main Menu,
  Settings, the upgrades screen, item tooltips.
- Pokemon: Silver, re-gridded to 10 font pixels per em with one digit width (crisp at 20, 30, 40; 5, 10, 15 on the 2x
  canvas). Names, Lv, HP, moves, stats, EVs, the catch screen, the roster, move and stat tooltips.
- World numbers: BoldPixels (`HudDigits`). Timer, kills, World Level, counters. Damage numbers at canvas 8 (16 on
  screen), crits at canvas 16 (32 on screen).
- World words: monogram. Weather, map labels, region names.
- Retired: Truth And Ideals (hard to read at speed, Jess's playtests), PokeBW (its Main Menu, Settings and upgrades text
  goes to Michroma), the second Michroma family (same file as `HudModule`).
- Supersedes "Which face for what" (2026-11-13), "Lean on 2x" for HudText (2026-11-10) and, for item tooltips, the
  tooltip font (2026-11-11). The game changes at #126; the board shows it first (155e).

Canonical: docs/HUD-STYLE.md "Fonts".
