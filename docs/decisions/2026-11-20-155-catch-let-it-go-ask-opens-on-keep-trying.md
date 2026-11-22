---
title: "#155 the catch screen's Let It Go keeps its ask and opens on Keep trying (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then the dialog rule's home in docs/HUD-STYLE.md or the modal spec."
---
# 2026-11-20: #155 the catch screen's Let It Go keeps its ask and opens on Keep trying (Jess)

- Letting a rescue go is a loss the player cannot earn back, so under the dialog rule (only such losses get a
  dialog, and it always opens on the back-out, whose intent is Neutral) Let It Go keeps its ask. This settles the case the
  rule left pending on 2026-11-19.
- The ask is modal.dialog's Negative ask with today's words ("Let it go?", "Let it go", "Keep trying"), opening on
  Keep trying. Let it go is red (Negative), Keep trying is teal (Neutral): see
  2026-11-20-155-dialog-answers-never-share-an-intent.
- Changes the game: today G.UI.ask opens it on its confirm. At #126 it opens on Keep trying, so a stray Enter keeps
  the Pokemon. Esc on the catch screen still opens the ask; Esc in the ask still cancels.
- Still pending under the same rule: a Move Shop buy that replaces a move (no refund for the old one).
- Board: tools/library/catch-draft.js (CATCH_ASK). Applied at #126.

Canonical: this file until #126 applies it; then the dialog rule's home in docs/HUD-STYLE.md or the modal spec.
