# 2026-11-17: a button you cannot afford still takes the selection cursor, and says why (Jess)

- In every menu, the keyboard selection cursor moves onto a buy button you cannot afford and highlights it as normal.
  Its label stays dimmed (white at 45%).
- Pressing it buys nothing and shows the toast "Unable to Afford" (today the only reason a buy fails).
- This replaces the 149b and 149c rule that an unaffordable Buy is disabled and the cursor skips it.
- An unaffordable pocket Buy (Character Upgrades) gets the Team Items look: normal rim, greyed label.
- A Full pocket Buy follows the same path (Jess, same day): it takes the cursor, its label stays dimmed, and pressing
  it shows "All belt slots are full." and buys nothing. Every "Not enough PokéCoins" toast becomes "Unable to Afford".
- Built by #151 and #152 (rework/shop), plan: docs/AI Outputs/Issue-151-152/151-152 - Unaffordable Buttons Plan.md.

Canonical: js/ui/menu-window-kit.js CursorButton (its refusal option).
