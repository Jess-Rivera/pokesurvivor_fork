# 2026-11-19: #155 the dialog is panel.clean, Michroma and button.glitch; a cancel state; focus shows only with the keyboard, and from the mouse the first key only reveals it, in menus and dialogs (Jess)

- modal.dialog goes clean: panel.clean frame (720 px), every line in Michroma (sizes settled at the Fonts feel test),
  the note in teal.base, button.glitch for both answers.
- The dialog's design is kept whole (Jess): all three intents (neutral, positive, negative), the intent prop, which
  button it opens on, and button.glitch.cancel, because a positive confirm will be needed later. Only how #126 applies
  them changes: today's asks all guard a loss, so each takes the negative intent and opens on the cancel; the
  one-button notice is neutral. The board's Modal page stays as it is.
- SUPERSEDED 2026-11-20 (2026-11-20-155-dialog-answers-never-share-an-intent: no cancel state, the back-out is
  Neutral). button.glitch.cancel, a new state: at rest exactly button.glitch.rest; under the cursor the same swipe uncovers the
  inverse of the intent's focus look (grey.ink body, the intent's colour for bar and text). The confirm keeps the
  normal focus look (the intent's body, ink bar and text).
- Input modes (the game's inputMode, js/ui/hud-kit.js): with the keyboard one button shows focus; with the mouse
  neither does, both rest and only the one under the pointer plays its hover swipe. Today the mouse moves the green
  focus; that ends.
- From mouse mode the first Enter or Space only reveals the focus, the next presses it; arrows reveal and move; Esc
  cancels at once. So a key never presses a button the player cannot see. This applies everywhere (Jess): the dialog
  and the menu windows. It changes today's menus (js/ui/menu-window-kit.js onKey presses at once when a key switches
  the mode back) and supersedes that part of 2026-11-16-selection-cursor-follows-the-device-in-use.
- After the mouse, the keys start from the last button the mouse touched (Jess), as the menus already do (hovering an
  item makes it the keys' starting point). The dialog adopts it; the menus keep it.
- Sources: hiding focus with the mouse follows :focus-visible (WICG explainer) and the menus' own rule; a key never
  acting on an unseen focus follows Xbox Accessibility Guideline 113 and the mode-error principle (Norman). Reveal-first
  itself is a game and controller pattern (seen in Unity middleware), not the browser norm, where Enter acts at once.
- Which asks are dialogs at all (Jess, after the research report, superseding the open-on-confirm list above it): a
  dialog only guards a loss the player cannot earn back or redo. Purchases do not ask (coins can be earned again);
  committing or discarding team edits does not ask (just redo it). Every dialog left opens on the cancel, so the
  asks #126 wires up are all negative, plus the one-button notice. The intent and opens-on props stay in the design
  for later asks (a positive confirm).
- Dialogs: Sell (one and batch), Delete account, Sign out as guest (it loses the whole save), Discard leftover EVs
  and Go Home from the EV screen (EVs lost; Jess). Notice: New save needed (one OK).
- No dialog: every coin buy (Poke Balls, team items, TMs, boxes, berry and team item slots, a Move Shop buy into an
  empty slot), Discard team changes. No undo toast planned; add one only if misclicks show up in playtests.
- Pending (Jess): Let it go on the catch screen (never owned), and a Move Shop buy that replaces a move (no refund for
  the old move, mid-run).
- Research: deep_research report "pokesurvivor_dialog_confirm_best_practices" (Quick session workspace, 2026-11-19);
  NN/g, Microsoft, GNOME and Material reserve dialogs for serious, irreversible losses and prefer no dialog for the rest.
- Applied at #126 (G.UI.ask and menu-window-kit.js, a game change planned then). Board: Modal, Unified tab
  (tools/library/modal-draft.js); Buttons, Glitch Draft (the cancel tiles).

Canonical: js/ui/lib/primitives/modal/modal.js and js/ui/ui.js G.UI.ask headers, once #126 applies it; until then this file.
