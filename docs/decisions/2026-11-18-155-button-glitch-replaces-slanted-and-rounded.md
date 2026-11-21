# 2026-11-18: #155 button.glitch replaces button.slanted and button.rounded on every screen, the catch screen included (Jess)

- Every button press is the game talking (the code's voice, docs/META-NARRATIVE.md), so every screen's buttons become
  `button.glitch`: the pause menu, End Run, the EV screen, the Main Menu windows and the catch screen.
- The catch screen splits by tier: its buttons (Throw, Let It Go) are `button.glitch` in Michroma; the Pokemon's own
  text there (name, Lv, HP, stats) stays Silver. "The catch screen" in decision 2026-11-18-155-font-scheme-three-tiers
  means that Pokemon text, not its buttons.
- Why one button everywhere: the meta-narrative's glitches only land against a uniform, trustworthy interface, and only
  `button.glitch` has the secret glitch state.
- Applied at #126, when the screens are rebuilt. Until then the board's Buttons, Current tab (button.slanted and
  button.rounded) is marked retiring, and it goes with their code at #126.

Canonical: tools/library/glitch-draft.js header (the board) until #126 moves button.glitch into js/ui/lib/primitives/button/.
