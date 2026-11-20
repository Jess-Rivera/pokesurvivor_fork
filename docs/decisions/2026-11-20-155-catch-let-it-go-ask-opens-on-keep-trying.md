# 2026-11-20: #155 the catch screen's Let It Go keeps its ask and opens on Keep trying (Jess)

- Letting a rescue go is a loss the player cannot earn back, so under the dialog rule (only such losses get a
  dialog, and it always opens on Cancel with both buttons red) Let It Go keeps its ask. This settles the case the
  rule left pending on 2026-11-19.
- The ask is modal.dialog's Negative ask with today's words ("Let it go?", "Let it go", "Keep trying"), opening on
  Keep trying.
- Changes the game: today G.UI.ask opens it on its confirm. At #126 it opens on Keep trying, so a stray Enter keeps
  the Pokemon. Esc on the catch screen still opens the ask; Esc in the ask still cancels.
- Still pending under the same rule: a Move Shop buy that replaces a move (no refund for the old one).
- Board: tools/library/catch-draft.js (CATCH_ASK). Applied at #126.

Canonical: this file until #126 applies it; then the dialog rule's home in docs/HUD-STYLE.md or the modal spec.
