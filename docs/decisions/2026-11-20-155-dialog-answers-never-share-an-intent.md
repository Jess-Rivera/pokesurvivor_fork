# 2026-11-20: #155 a dialog's two answers never share an intent; the back-out is Neutral (Jess)

- A binary question has two different answers, so they cannot share an intent. The confirm takes the intent of what
  it does (Positive for a gain or spend, Negative for a loss); the back-out (Keep trying, Keep, Cancel) is always
  Neutral, since going back loses nothing. Each button uses its own normal button.glitch focus look.
- button.glitch.cancel is retired: its ink-body focus read as a black slab on the dialog's grey.panel, and it only
  existed to tell two same-intent buttons apart. The Modal page's cancel section and the Glitch Draft's cancel tiles
  are gone. This supersedes the cancel-state ruling of 2026-11-19-155-dialog-clean-cancel-state-and-input-modes (its
  input-mode rules stand) and the "both buttons red" line of 2026-11-20-155-catch-let-it-go-ask-opens-on-keep-trying.
- An ask whose confirm would be Neutral gains and loses nothing, so it is not asked (the dialog rule). A notice is one
  Neutral button. The board's Neutral sample ask is removed; "Go Home" from the EV screen sits on the Negative ask.
- Let It Go: a red Let it go, a teal Keep trying, opening on Keep trying.
- Changes the game at #126: G.UI.ask takes the confirm's intent only (the back-out is always Neutral). Board:
  tools/library/modal-draft.js, glitch-draft.js.

Canonical: this file until #126 applies it; then the dialog rule's home in docs/HUD-STYLE.md or the modal spec.
