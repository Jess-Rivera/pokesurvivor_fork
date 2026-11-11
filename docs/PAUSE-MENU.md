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
- [Approved] End Run asks inside the ball, no popup (Jess, 2026-11-11): Resume slides off to a random side and Settings
  to the other, each vanishing at the ball's inner edge. End (red rim) and No (white rim) chase in behind Settings from
  the side Resume left by, side by side in Settings' row, short enough to fit the ball; End Run stays in the middle. No
  has the focus first; Move_Left and Move_Right switch, Enter presses, Esc or the pause key answer No (the menu stays).
  No sends End and No back out the way they came and Resume and Settings back in. Focused, an answer keeps its rim and
  its body turns the rim's dark shade (End dark red, No dark grey). Snappy: 0.15 s slides, the chasers 0.05 s behind.
- [Approved] Closing plays the opening in reverse: panels slide out, the ball closes, circle and dim fade.

## 2. Panels slide in, timing and layout (feel test, Jess 2026-11-11)

- [Approved] The panels slide in WHILE the ball opens (one step): Run Info from the left, the Pokemon detail panel
  from the right, the team panel from the bottom, the Run Inventory from the top.
- [Approved] The caps are a layer above the buttons, so the opening ball uncovers them.
- [Approved] Closed, the halves meet and a white centre button with a black stroke fills the hole between their
  notches; it rides on the top cap as the ball opens.
- [Approved] Buttons take the run screen's move slot shape, flat body, no grid, at 1.5x size (315 x 66 px, 30 px
  text, 8 px apart), centred on the ball's middle; the open caps part 150 px each way to make room.
- [Approved] Opening about 0.23 s (0.055 s dim and closed ball, 0.175 s ball and panels); closing is the reverse at
  about 0.16 s. The second feel test halved both; the third set the opening halfway to the close (Jess, 2026-11-11).
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
- [Approved] The bars keep the mockup's two-tier shape (Jess, 2026-11-11): the top bar's level box drops below the
  name band with a diagonal step; the bottom bar has a raised tab on the left for the arrows and a diagonal step down
  to the full-width bar.
- [Approved] Top and bottom bars use the type colour (dual types: top bar first type, bottom bar second type) with a 1px `#212121` frame. Back panel `#181818`.
- [Approved] Portrait copies the character panel's (sprite circle with the EXP frame). The HP bar copies the
  character panel's, cut to fit, current/max percentage exact.
- [Approved] Held item: a square slot with Remove (sends the item to the Temporary Pocket) and Give. Give puts the
  yellow corner highlight on the team panel and dims the giver as not selectable; its label becomes "Cancel" while
  giving; Cancel or Esc cancels and the label returns to "Give".
- [Approved] IV hex (Jess, 2026-11-11, settled after three rounds the same day): drawn in real stat numbers from the
  game's formula (G.Stats, nature included; HP at its mainline size, before the game's HP_SCALAR doubling, so it matches
  the online calculators and the other five's scale, while the HP bar keeps the game's number) with the species'
  base stats and this copy's IVs and EVs. Three bands, each growing out from the one inside it (no overlap): the first
  type's colour at 60% = the stats at level 1; white = the growth from level 1 to its level now; yellow = what cards
  and run effects add (the bonus combat uses). The edge is 50 while the highest stat is under 50, else the next
  multiple of 100 up (an HP of 26 sits about halfway). Each corner's text is the copy's make-up, not the drawn number:
  the stat name (with the yellow "+X%" when run effects add some) over "base + [IV/EV]", for example "45 + [19/50]".
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
  cards as the run screen's roster slots, sized to fit: narrowed to 168 x 64 px with no status chips, long names
  squeezed to fit; the panel is 548 px wide to hold three. Missing team members show as empty frames.
- [Approved] The cards keep their typed borders. The shown Pokemon's portrait gets a green stroke and a shimmer that
  slides from top left to bottom right, looping (Jess, 2026-11-11). The Pokemon on the field wears the selection cursor.

## 6. Run Info panel (left)
- [Approved] Same design as the DPS-Upgrades panel, different content. Not affected by that panel's opacity or
  on/off setting.
- [Approved] Contents: total run kills, the best record on this region (two values: run time, and the highest gym or
  Elite Four member beaten on the highest loop). The record is the furthest run (highest loop, then highest gym or
  Elite Four member beaten) and that run's time; ties go to the faster time. A new save field, absent from old saves. loop number, elites killed, items picked
  up, EVs earned this run (per stat), run time, coins, badges this run, biggest single hit, shinies seen.

## Scope notes
- [Approved] Co-op pause keeps the old screen (multiplayer is deferred). Touch versions of the hover tooltips wait
  for #72. Keyboard: Esc cancels Give and closes the menu; Move_Left and Move_Right do prev and next; either Enter key (main
  or number pad) presses the green button, and the menu's buttons never take the page's focus (the #88 Enter bug, fixed
  in #89).
- [Approved] The end-of-run Team screen moves to the new detail and team panels later on this branch.

## Open questions
Recorded in #82 until answered; answers move into the sections above.
