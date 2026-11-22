---
title: "#155 run.hud.teamItems: both bags stacked on the lower right as pixel pockets; item details live in the pause screen (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then docs/HUD-STYLE.md \"Roster, berry bag and run items\"."
---
# 2026-11-20: #155 run.hud.teamItems: both bags stacked on the lower right as pixel pockets; item details live in the pause screen (Jess)

- A bag is a bag: the team items pocket takes the berry pocket's set up (2026-11-19 berry pocket): panel.pixel in
  color.pocketItems holding only the bought slots as 36 px wells two to a row (grey.panel inside; an ink ring when
  empty, the pocket's base when it holds an item), the 32 px icon at 1x, no names. Amends
  2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest for the run items (and main.inventory.slot follows
  at #126): the bags are pixel, everything else the team shares stays clean.
- Places: the team items pocket in the lower right corner at today's run item column (24 px from the right, 42 px
  up); the berry pocket moves from above the roster to stack on top of it, 12 px apart, both right-aligned. Why: the
  roster alone on the lower left, both bags on the lower right, balances the run screen.
- Changes the game: the run HUD drops each team item's name, short description and live tracker (Amulet Coin's
  coins, Snowball's stacks; G.Items.runHud). They live in the pause screen only. Today the pause inventory's run item
  tooltip shows only the name and description (js/ui/pause-inventory.js heldTip), so #126 must add the live tracker
  to it, or the tracker is lost.
- Supersedes HUD-STYLE.md "Run items: the B2 item box" (the name band, patch and tracker) once #126 applies it.
- Board: tools/library/hud-team-items-draft.js; the bag is teamPocket in hud-team-slot-draft.js.
- APPROVED as drawn (Jess 2026-11-21): the board page's two states, both bags lower right.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Roster, berry bag and run items".
