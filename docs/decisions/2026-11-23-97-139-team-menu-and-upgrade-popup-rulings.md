---
title: "the Team menu and Upgrade popup: Level Up, candy dragging, box tabs, saving, portrait states (Jess)"
date: 2026-11-23
issues: [97, 139, 126, 150, 167]
area: ui
canonical: "this file and the two sketches until the slice builds the screen."
---
# 2026-11-23: the Team menu and Upgrade popup: Level Up, candy dragging, box tabs, saving, portrait states (Jess)

- [Approved] Sketches: assets/excalidraw/team-menu.excalidraw, poke-upgrade.excalidraw. Stat row pattern:
  assets/screenshots/reference-for-team-menu.jpg, nature arrows included. The rulings below win over the sketches.
- [Approved] Saving: everything saves at once except the team roster, which waits for Commit. Esc steps back one thing
  (held item or Pokemon, sell mode, popup), then discards roster changes with a toast and no dialog.
- [Approved] Level Up (click: next level, Shift: +10) and dragged candy (onto a slot, portrait or the detail panel)
  replace Give and the Give until control. XP past 100 is lost. No evolution tick on the XP bar.
- [Approved] Pokedex and Box N tabs sit under the box panel, with price tabs for locked boxes; Sell Pokemon sits by
  EXP Bag. Replaces box buying in Character Upgrades (2026-11-21-team-menu-rebuild-rulings).
- [Approved] Keys: 1 to 6 puts the selected Pokemon in that slot; Shift+1 to 5 moves it to that box (toast when full).
  A box Pokemon lifted by keyboard goes right to the tabs.
- [Approved] Portraits: portrait.round.rest; selected is portrait.round.selected with shimmer, the keyboard cursor the
  same without it; a team member shows its slot number upper left in font.michroma. All carry favorite and lock icons.
- [Approved] Only team members can be upgraded. Rename is a pencil in the detail panel. Moves opens the learnset and,
  once bought, the starting move picks (#150). Select repeats goes. Regeneration keeps the #97 design (field and bench).
- [Approved] Sort, both directions, accordions where they group: Dex number, Level, Type, Favorited and Locked (then by
  Dex number), Name, BST, each base stat, Rarity, IV total, each IV, EV total, each EV, Date Caught, Sell Price.
- [Approved] Picked for sale: the selected look in color.red.dark with a dark shimmer.
- [Approved] Three slices: A the screen (#167), B candy (#139 Part F), C the Upgrade popup (#97). Openings are on the issues.
- [Approved] Space is reserved for Evolve only (beside Moves, a portrait corner for "ready"). Friendship, fatigue and
  use-item wait for their slices. The background animation is its own slice.

Canonical: this file and the two sketches until the slice builds the screen.
