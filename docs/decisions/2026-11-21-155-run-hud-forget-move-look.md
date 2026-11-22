---
title: "#155 run.hud.forgetMove: the four move slots and a wide card; approved (Jess)"
date: 2026-11-21
issues: [155]
area: ui
canonical: "this file until #126 applies it; then docs/HUD-STYLE.md \"Move Shop\"."
---
# 2026-11-21: #155 run.hud.forgetMove: the four move slots and a wide card; approved (Jess)

- A popup (panel.clean) over either shop, the screen under it dimmed (ink at 60%). Title "Replace which move?" in
  Michroma 24, a teal.base line, a divider.
- The Pokemon's four slots 2 x 2 in run.hud.playerActive.area's order (panel.slanted, its wells and family badges),
  6 art rows taller than the HUD's (28 rows, 56 px) with the wells 12 px down, so cursor.ring has 4 px of air inside
  the dark bands. No key labels.
- cursor.ring on the well of the move to replace. Its slot draws normally; the other three dim to the HUD's inactive
  brightness (50%). A bond is disabled: darker still (25%), and the ring skips it.
- Under the slots, a wide panel.shopCard on the ringed move: its type well, name and line, updating as the ring moves.
- Cancel (Neutral) at the bottom right, the shops' Leave size, not full width.
- Picking a move opens the Replace or Go Back ask (2026-11-20-155-move-shop-replace-a-move-asks-replace-or-go-back).
- The name run.hud.forgetMove stays (the open naming question in STATE.md is settled).
- Board: tools/library/run-shops-draft.js; panel.slanted takes a height (tools/library/clean-draft.js). Applied at #126.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Move Shop".
