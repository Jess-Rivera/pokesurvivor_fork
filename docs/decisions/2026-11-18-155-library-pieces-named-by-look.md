# 2026-11-18: #155 library pieces are named by their look, never by a screen or a job (Jess)

- A primitive's name says what it looks like: `button.slanted` (the move slot shape, angled ends) and `button.rounded`
  (the B/W bag button, rounded ends). A new style joins the same way (`button.<look>`).
- A state is named by intent, as the piece's name plus the state: button.rounded.rest, .focusPositive (moves forward
  or buys), .focusNegative (takes something away), .refused, .refusedFocus, .disabled.
- Where a piece is used is its place name (screen.panel.part, `pause.menu.resume`), never part of the primitive's name.
- This replaces the `button.menu` example in decision 2026-11-17-155-design-tokens-in-tokens-js and the slice opening.
- One name everywhere: the code says SlantedButton and RoundedButton (G.Lib.Button, the HUD kit, every screen), in
  place of SlotButton and TeamButton. CSS class names (pm-button, hud-team-button) stay until a later #126 slice.

Canonical: js/ui/lib/primitives/button/button.js header. Plan: docs/AI Outputs/Issue-155/155b-2 - Button Shape Names Plan.md.
