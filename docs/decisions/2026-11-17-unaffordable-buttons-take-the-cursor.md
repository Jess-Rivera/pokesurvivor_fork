# 2026-11-17: a button you cannot afford still takes the selection cursor, and says why (Jess)

- In every menu, the keyboard selection cursor moves onto a buy button you cannot afford and highlights it as normal.
  Its label stays dimmed (white at 45%).
- Pressing it buys nothing and shows the toast "Unable to Afford" (today the only reason a buy fails).
- This replaces the 149b and 149c rule that an unaffordable Buy is disabled and the cursor skips it.
- An unaffordable pocket Buy (Character Upgrades) gets the Team Items look: normal rim, greyed label.
- Not built yet: #151 (cursor and toast) and #152 (pocket look). Open on #151: a Full button stays skipped by default.

Canonical: #151 and #152 until built; then js/ui/menu-window-kit.js CursorButton.
