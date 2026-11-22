---
title: "#155 the Move Shop's replace-a-move buy: pick, a popup to choose the move, then a Replace or Go Back ask (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it."
---
# 2026-11-20: #155 the Move Shop's replace-a-move buy: pick, a popup to choose the move, then a Replace or Go Back ask (Jess)

- A Move Trainer or TR Mart buy into full slots goes: pick the move or TR, a popup panel to choose which loose move to
  replace (bonds disabled), then a dialog "Replace X with Y?" with Replace (red, Negative) and Go Back (teal, Neutral),
  opening on Go Back. A forgotten move gets no refund, so this is the dialog rule's loss case; it settles the last case
  that 2026-11-19-155-dialog-clean-cancel-state-and-input-modes left pending.
- A buy into a free slot does not ask (Silver, like coins, is earned again). Go Back returns to the popup panel.
- Board: run.hud.moveMart, run.hud.trMart and the popup (run.hud.forgetMove, name to confirm); the ask is on the Modal
  page's Negative sample. Applied at #126. Plan: docs/AI Outputs/Issue-155/155 - Run Shops Layout.md.

Canonical: this file until #126 applies it.
