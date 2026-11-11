# Pause menu (in-run menu) design

Spec for #82, built on feature/pause-menu-rework. Owner: Jess (design doc pasted 2026-11-11). Mockup:
`assets/ui/In Run Menu Reduced.png`. Grid references (A11-E14 and so on) name cells in the gridded rips under
`assets/ui/BW Pokedex rip/_grid/` (see its README); a bare reference means `b2-lower`. The rips are inspiration;
the game draws its own versions.

Tags follow CLAUDE.md "Requirement tags". Everything Jess wrote is `[Approved]`; questions are `[Open]` until answered.

## 1. Opening
- [Approved] On pause, the grey back circle fades in fast (about 0.1 to 0.2 s) while the rest of the screen dims.
- [Approved] A Poke Ball in the style of b2-lower A11-E14 comes in with the circle, fully closed. Once ball and frame
  are in, the ball plays an open animation to the look of b2-lower F15-J18, cut inside the circle as in the mockup.
- [Approved] The centre of the open ball holds three buttons: Resume, End Run and Settings. All white, with a green
  focus rim on hover or keyboard selection (Jess, 2026-11-11).
- [Approved] End Run asks first: a confirmation "End Run?" with "No" (white, the default) and "End" (red).
- [Approved] Closing plays the opening in reverse: panels slide out, the ball closes, circle and dim fade.

## 2. Panels slide in, timing and layout (feel test, Jess 2026-11-11)

- [Approved] The panels slide in WHILE the ball opens (one step): Run Info from the left, the Pokemon detail panel
  from the right, the team panel from the bottom, the Run Inventory from the top.
- [Approved] The caps are a layer above the buttons, so the opening ball uncovers them.
- [Approved] Closed, the halves meet and a white centre button with a black stroke fills the hole between their
  notches; it rides on the top cap as the ball opens.
- [Approved] Buttons take the run screen's move slot shape, flat body, no grid.
- [Approved] Opening about 0.31 s (0.075 s dim and closed ball, 0.235 s ball and panels); closing is the reverse
  at about twice the speed (about 0.16 s). The second feel test halved both (Jess, 2026-11-11).
- [Approved] The ball sits at the screen's centre. Run Info is the same size as the Pokemon detail panel, both the
  same distance either side of the ball; team and Run Inventory are centred under and over it.

## 3. Run Inventory panel (top, not in the mockup)
Three partitions, each a 2x2 grid of 4 square slots (Jess, 2026-11-11):
- [Approved] Left: the Berry Pocket. Slots not yet unlocked show dimmed. Icons only; hover tooltip with the berry's name and what it does.
- [Approved] Centre: the run items (team items), locked slots dimmed, in the same squares with clear padding from the Berry Pocket. Icon
  only, hover tooltip with name and effect.
- [Approved] Right: the Temporary Pocket, 4 slots. Remove on the detail panel puts the held item here.
- [Approved] Resuming with an item in the Temporary Pocket opens a prompt: "Can't resume with an item in the Temporary
  Pocket. Destroy items in Temporary Pocket?" with "Destroy" and "Give to a Pokemon". Give returns to the menu.
  Destroy loses the items (they can still be found again as normal pickups).

## 4. Pokemon detail panel (right)
Layout per the mockup: name, level and HP bar in the top bar; portrait; held item; per-Pokemon run stats; IV hex;
cards taken; move list (bonded groups shown); prev and next arrows in the bottom bar.
- [Approved] Panel size is static.
- [Approved] Top and bottom bars use the type colour (dual types: top bar first type, bottom bar second type) with a 1px `#212121` frame. Back panel `#181818`.
- [Approved] Portrait copies the character panel's (sprite circle with the EXP frame). The HP bar copies the
  character panel's, cut to fit, current/max percentage exact.
- [Approved] Held item: a square slot with Remove (sends the item to the Temporary Pocket) and Give. Give puts the
  yellow corner highlight on the team panel and dims the giver as not selectable; its label becomes "Cancel" while
  giving; Cancel or Esc cancels and the label returns to "Give".
- [Approved] IV hex, three layers (Jess, 2026-11-11): black at 50% opacity = base + IV + EV at level 1; white
  (today's opacity) = the stats grown by level; yellow = what cards and run effects add.
- [Approved] The per-Pokemon stats, Cards Taken, Move List and IV hex panels take b2-lower AA16-AD18 as inspiration,
  like the run screen's team roster slots but without the grid pattern. Borders use the first type's colour.
- [Approved] Cards Taken and Move List scroll, with a scroll bar inspired by dex-buttons AF2-AF20, type coloured.
- [Approved] Prev and next arrows inspired by b2-lower AC8-AD8 (dimmed at rest, brightened on hover). The
  Move_Left and Move_Right keybinds also do prev and next.
- [Approved] Cards Taken lists the cards that apply to this Pokemon (this absorbs #83).
- [Approved] Move list rows: today's per-move numbers plus the hit damage against a typical enemy. The move tooltip
  rework is a separate issue.
- [Approved] Per Pokemon Run Stats panel holds the per-Pokemon numbers (kills, time on field, damage dealt, best hit,
  times fainted). It grows down into the Cards Taken area (they split that column vertically) or scrolls.

## 5. Team panel (bottom)
- [Approved] All 6 Pokemon in 3 columns by 2 rows, clickable, picking what the detail panel shows. Uses the same
  cards as the run screen's roster slots, sized to fit. Missing team members show as empty frames.

## 6. Run Info panel (left)
- [Approved] Same design as the DPS-Upgrades panel, different content. Not affected by that panel's opacity or
  on/off setting.
- [Approved] Contents: total run kills, the best record on this region (two values: run time, and the highest gym or
  Elite Four member beaten on the highest loop). The record is the furthest run (highest loop, then highest gym or
  Elite Four member beaten) and that run's time; ties go to the faster time. A new save field, absent from old saves. loop number, elites killed, items picked
  up, EVs earned this run (per stat), run time, coins, badges this run, biggest single hit, shinies seen.

## Scope notes
- [Approved] Co-op pause keeps the old screen (multiplayer is deferred). Touch versions of the hover tooltips wait
  for #72. Keyboard: Esc cancels Give and closes the menu; Move_Left and Move_Right do prev and next.
- [Approved] The end-of-run Team screen moves to the new detail and team panels later on this branch.

## Open questions
Recorded in #82 until answered; answers move into the sections above.
