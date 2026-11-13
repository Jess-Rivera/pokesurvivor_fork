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

## 3. Run Inventory (top, not in the mockup)
Three partitions, each a 2x2 grid of 4 square slots (Jess, 2026-11-11):
- [Approved] No panel frame (the empty placeholder frame from #88 goes, Jess 2026-11-11): the three tight 2x2 grids sit
  in a 3x1 row, sliding in from the top. The grid is the run screen berry bag's tight grid (HUD-STYLE "Berry bag").
- [Approved] No labels anywhere in the inventory: every item's name and effect is in its hover tooltip.
- [Approved] Left: the Berry Pocket. Slots not yet unlocked show dimmed.
- [Approved] Centre: the run items (team items), locked slots dimmed, with clear padding from the Berry Pocket.
- [Approved] Right: the Temporary Pocket, 4 slots, always open. It holds held items taken off a Pokemon, and berries
  and run items set aside to destroy (Jess, 2026-11-12, #90 feel test). Berries and run items move by click or drag
  between their own bought slots and the pocket only, never onto a Pokemon or the other grid; dropped on a filled slot
  of the same kind they swap. A run item set aside stops working for the whole team until it goes back; the one Stone
  at a time rule still holds (a Stone goes back only onto the carried Stone, swapping them).
- [Approved] Resuming (Resume, Esc or P) with an item in the Temporary Pocket asks inside the ball, like End Run
  (Jess, 2026-11-11, replacing the dialog with "Give to a Pokemon"): the three buttons slide out to one side, left or
  right at random, chased by a three-box column of move slots, "Destroy Items in Pocket?" on top, then a red
  "Destroy" and a grey "No". While it asks, the pocket slots that hold items pulse with a white glow. Destroy empties
  the pocket and resumes; No returns to the buttons. Destroyed items can still be found again as normal pickups.
  End Run is not gated (the pocket ends with the run).

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
- [Approved] Held item: a square slot only, no name and no buttons; its name and effect are in the hover tooltip
  (Jess, 2026-11-11, replacing the Remove and Give buttons).
- [Approved] Moving held items (Jess, 2026-11-11): click, or drag and drop, works for every held item in the menu,
  between the detail panel's held slot, the Temporary Pocket and the team panel's cards. Click picks the item up,
  a second click puts it down; no highlight shows where it can go (Jess, 2026-11-11: the player figures it out).
  Putting it anywhere that is not a fitting slot, Esc, or clicking the item again returns it to where it came from. Putting it on a Pokemon that holds one swaps the two (the other item
  goes where this one came from). The detail held slot onto the pocket takes the item off.
- [Approved] IV hex (Jess, 2026-11-11, settled after three rounds the same day): drawn in real stat numbers from the
  game's formula (G.Stats, nature included; HP at its mainline size, before the game's HP_SCALAR doubling, so it matches
  the online calculators and the other five's scale, while the HP bar keeps the game's number) with the species'
  base stats and this copy's IVs and EVs. Three bands, each growing out from the one inside it (no overlap): the first
  type's colour at 60% = the stats at level 1; white = the growth from level 1 to its level now; yellow = what cards
  and run effects add (the bonus combat uses). The edge (Jess, 2026-11-11, replacing "50, then the next 100 up") is
  300 when the highest drawn stat is 300 or less, 600 up to 600, else 1000; every value is drawn between 10% and 100%
  of the radius, so a level 1 stat is never a dot and a value past 1000 sits on the rim. The edge number sits in a
  break of the outer line between HP and Atk, turned along it, in blue. Each corner shows the stat name over the final
  stat, with the yellow "+X%" when run effects add some: beside the name at HP and Spe, on its own line under the
  number at the four side corners (Jess, 2026-11-11, #98). The final stat is HP as the game has it (after HP_SCALAR, the HP bar's
  number) though the shape draws it at mainline size, the others with nature, level and run effects. Hovering a corner
  shows the copy's make-up: "Base: N, IV: N, EV: N", always on top of the other corners. The hex is as big as its box
  allows with room for the widest labels (a 4 digit stat with "+100%" under it).
- [Approved] The per-Pokemon stats, Cards Taken, Move List and IV hex panels take b2-lower AA16-AD18 as inspiration,
  like the run screen's team roster slots but without the grid pattern. Borders use the first type's colour.
- [Approved] Cards Taken and Move List scroll, with a scroll bar inspired by dex-buttons AF2-AF20, type coloured.
- [Approved] Prev and next arrows inspired by b2-lower AC8-AD8 (dimmed at rest, brightened on hover). The
  Move_Left and Move_Right keybinds also do prev and next.
- [Approved] Cards Taken lists the cards that apply to this Pokemon (this absorbs #83). Settled (Jess, 2026-11-12,
  docs/decisions/2026-11-12-83-cards-taken-counts-and-move-tooltip-changes.md): the DPS panel's rows, name and pick
  count (Vitamins by the vitamin's name), same order, 26 px rows minimum in the shared scroll box, a long name wraps.
  A move card or type Damage card shows when one of this Pokemon's moves can take it (on the move's own data); Stat
  Climb Speed and Stat Change Duration when one of its moves changes a stat; Bench Regeneration with a team of 2 or
  more; Vitamins always. Those three team-only cards show their real number on hover. Empty: "No cards yet."
- [Approved] The move tooltip's "Cards:" line (Jess, 2026-11-12): each field the team's cards changed on that move,
  the move's own value then the one combat uses ("cd 1.2 s to 0.92 s", "burn 10% to 100% (max)"), "(max)" where a
  cap, floor or pick limit stopped it; a field two cards share is one entry. No line when no card touches the move.
- [Approved] The detail panel's hover tooltip (moves, Run Stats, Cards Taken) is a fixed 558 px wide, spanning the
  gap between Run Info and the detail panel with 16 px clear of each (Jess, 2026-11-12).
- [Approved] Every pause menu tooltip is the topmost layer (Jess, 2026-11-12): all of them (items, held item, stat hex
  corners, moves, Run Stats, Cards Taken) are drawn in one shared tooltip layer, the stage's last child (HUD-STYLE
  "Fonts"). Leaving the anchor, scrolling its box, picking up an item, another Pokemon, or closing the menu hides it.
- [Approved] Move list rows: today's per-move numbers plus the hit damage against a typical enemy. The move tooltip
  rework is a separate issue.
- [Approved] Per Pokemon Run Stats panel holds the per-Pokemon numbers (kills, time on field, damage dealt, best hit,
  times fainted). It grows down into the Cards Taken area (they split that column vertically) or scrolls.
- [Approved] Run Stats box (Jess, 2026-11-12, map docs/ASCII Concept Maps/91d - Run Stats Box (detail panel).txt):
  keeps its 200 px and scrolls its rows (26 px each) in the shared scroll box; Cards Taken keeps its 400 px (Jess,
  2026-11-12, replacing "grows to 360 px, Cards Taken shrinks to 240"). Super eff. is a share of its HIT damage, burn
  and poison ticks left out (RS1); every row shows at zero ("0", "0:00", "--"), so the box never changes (RS3). Rows: Kills, Field, Damage, Share, Best hit, Super
  eff., Taken, Healed, Faints, Down, Statuses (one total, per kind on hover), DoT dmg. Numbers past 9,999 read
  compact (41.2k, 1.3M).
- [Approved] Kill credit (Jess, 2026-11-12): the Pokemon whose hit finished the enemy gets the kill; a burn or poison
  tick that finishes it credits whoever inflicted it. The team kill count is unchanged.
- [Approved] Damage over time on enemies (Jess, 2026-11-12): burn, poison and toxic ticks are credited to the
  Pokemon that inflicted them and join its Damage and the team's DPS (the DPS panel reads higher for status-heavy
  teams). A status already on keeps one inflicter: a stronger source takes it over, a tie keeps the first.
- [Approved] Taken and Healed (Jess, 2026-11-12, TK1 and H1): Taken is HP lost to hits and damage over time from
  others; self costs (move recoil, Life Orb) do not count. Healed is every HP a Pokemon gets back (heals, berries, Shell
  Bell, Regeneration, the HP Regen card on the bench, springs); a revive is not a heal and neither is a max HP gain.
  A badge's full-HP refill on members still standing rides with the revive package and is not Healed (Jess, 2026-11-12).
- Built in 91-1 (2026-11-12): every move hands burn and poison the same strength today, so in practice the first
  inflicter keeps the credit until the status ends. Shell Bell still ignores burn and poison ticks, as before.

## 5. Team panel (bottom)
- [Approved] All 6 Pokemon in 3 columns by 2 rows, clickable, picking what the detail panel shows. Uses the same
  cards as the run screen's roster slots, sized to fit: narrowed to 168 x 64 px with no status chips, long names
  squeezed to fit; the panel is 548 px wide to hold three. Missing team members show as empty frames.
- [Approved] No frame behind the cards: the panel is just the six cards and empty frames (Jess, 2026-11-12).
- [Approved] The cards keep their typed borders. The shown Pokemon's portrait gets a green stroke and a shimmer that
  slides from top left to bottom right, looping (Jess, 2026-11-11). The Pokemon on the field wears the selection cursor.

## 6. Run Info panel (left)
- [Approved] Same design as the DPS-Upgrades panel, different content. Not affected by that panel's opacity or
  on/off setting.
- [Approved] Scope (Jess, 2026-11-12): everything about the run, or team wide / run wide. Anything about one Pokemon
  goes to the detail panel; a per-Pokemon stat shows here only as its team total.
- [Approved] Layout (Jess, 2026-11-12): sections Progress, Combat, Faints, Statuses Inflicted, Loot, EVs Earned,
  Region Best, as in docs/ASCII Concept Maps/91c - Run Info Panel (left).txt. 24 px text, 36 px rows; the panel
  scrolls. Faints shows the team total, Most Faints and time fainted, tracked per Pokemon for the Run Stats box.
  Statuses Inflicted aggregates the per-Pokemon counts per kind, plus damage over time.
- [Approved] Counting rules (Jess, 2026-11-12):
  - A faint is every time a team member reaches 0 HP: on the field, on the bench from DoT, and the final wipe.
    A Focus Sash save is not a faint. Most Faints ties show the lower team slot; with no faints its lines hide.
  - Time fainted is run time from the faint until that member is revived (badge revive, Re-Do) or the run ends.
  - A status counts as inflicted only when it newly lands: a refresh, an immune, a blocked major or a reapply
    window does not count. Only kinds landed this run are listed ("None yet" when empty). Damage over time is
    the status ticks the team deals to enemies (burn, poison, toxic; a trap deals no damage, checked 2026-11-12).
  - The run name and time stay pinned while the rest scrolls; the scroll bar is slate.
  - [Approved] (Jess, 2026-11-12, map 91-2D) DD1: every pause menu scroll bar can be dragged as well as wheeled
    (Run Info, the move list, Cards Taken). DD3: Super effective is a share of the team's HIT damage; burn and poison
    ticks are left out, since a tick can never be super effective.
- [Approved] Region Best (Jess, 2026-11-12): a new save field, per region, absent from old saves (read as "No record
  yet"). Checked when a run ends (faint or End Run). Better = higher loop, then more gyms beaten, then the tie rule:
  same furthest place, two runs that cleared the same gym compare run end (the longer survival wins), two runs that
  died in the same gym's fight compare when that fight began (the sooner wins); an exact tie keeps the old record (DR3,
  Jess 2026-11-12). Distance always beats time: a run that dies one gym short is never a new best however fast.
  Dying inside a gym's fight ranks above clearing the gym before it (DR4). The Best row reads "Loop 3, Gym 3
  cleared, lasted 85:10" or "Died at Loop 3, Gym 4, reached it 82:30" (DR5). Times read mm:ss always,
  minutes past 59 (82:30). Only solo runs set it. End Run pressed during a gym fight counts as dying in that fight
  (RC1). All regions keeps its own record, separate from each region (RC2, Jess 2026-11-12).
  It shows as a pace delta against the record's gym times, growing once the record had already beaten your next gym
  (DR1, Jess 2026-11-12, map 91-2). A run flagged by the debug tools (the flag that keeps it off the ranking) never sets a record. Until the
  loop counter and the Elite Four exist, a real run's record is in practice gyms beaten plus time. Dev verification
  goes through the debug tools in the 91c map (guest saves under ?dev are in memory only).
- [Approved] Contents: total run kills, the best record on this region (two values: run time, and the highest gym or
  Elite Four member beaten on the highest loop). The record is the furthest run (highest loop, then highest gym or
  Elite Four member beaten) and that run's time; ties go to the faster time. A new save field, absent from old saves. loop number, elites killed, items picked
  up, EVs earned this run (per stat), run time, coins, badges this run, biggest single hit, shinies seen.

## 7. End of run (Jess, 2026-11-12; mocks assets/excalidraw/End Run.png and End Run EV.png)
All three screens use the pause menu's pixel style on the 1920 x 1080 stage. Co-op keeps the old screens (deferred).
- [Approved] End Run screen (#103): the title "EXPEDITION OVER" (death or quit) and two buttons. "Run Review" opens
  the Run Review. The second reads "Learn from the Loss" when the run has whole EVs to give (opens the EV screen) and
  "Return Home" when it has none. Nothing else: the old results card is gone, since Run Info already shows coins,
  Silver, shinies seen and caught and the rest. The Ko-fi ask is dropped. Poke Balls and
  Master Balls earned show on no end of run or in-run screen (they still go to the save).
- [Approved] A run ended by quitting (End Run in the pause menu) gives no EVs, so it always shows "Return Home".
- [Approved] Run Review (#92): the pause menu reopened read-only: Run Info, detail and team panels where the pause
  menu has them, all hover tooltips, no Run Inventory, nothing accepts an item. The ball holds one button, "Back", to
  the End Run screen (Enter and Esc too); Move_Left and Move_Right step the Pokemon. The old end-of-run team sheet
  and its Run Cards totals are retired from this path.
- [Approved] EV screen (#104): six portrait circles across the top (an empty circle for a missing slot), "x / 510"
  small under each. Rows HP, Attack, Defense, Speed, Special Defense, Special Attack (the hex's clockwise order), all
  six always. The left column is what is left to give in that stat. Each cell is "- N +": the copy's current EVs in
  white, this screen's additions as a yellow "+N" beside it. + greys out at 252 in a stat, 510 per Pokemon, or nothing
  left in that stat.
- [Approved] EV giving (Jess, 2026-11-13, docs/decisions/2026-11-13-104-ev-screen-giving-and-old-screen-retired.md):
  a click on + or - moves 1 EV, Shift-click moves 10 (cut to what fits), and holding either repeats after 0.35 s at
  about 12 a second. "x / 510" counts this screen's additions as they are made. - only takes back this screen's
  additions (lowering old EVs is the parked 5b berries). Built in js/ui/ev-screen.js.
- [Approved] EV buttons: "Learn" saves what was given and goes home; if EVs are left over it asks first, and they are
  discarded. "Go Home" saves nothing and always asks "Discard all EVs and return?" with "Yes" and "Cancel". The EV
  screen has no way back to End Run or Run Review.
- [Approved] Both asks use the shared confirmation dialog (G.UI.ask) for now; restyling that dialog to the pause
  menu's look is a later issue (Jess, 2026-11-13). Learn has the green focus first; Move_Left and Move_Right move it,
  either Enter key presses, Esc does nothing (End Run's rule). The old allocation screen (scr-evs) is retired.
- [Approved] Learn's goodbye (Jess, 2026-11-13, #104c): once the EVs are saved, the shared toast says "Lessons Learned,
  Returning Home" for 2 s while the EV screen stays up and takes no input, then the main menu. Go Home has no toast.

## Scope notes
- [Approved] Co-op pause keeps the old screen (multiplayer is deferred). Touch versions of the hover tooltips wait
  for #72. Keyboard: Esc cancels a held item move first, then closes the menu; Move_Left and Move_Right do prev and next; either Enter key (main
  or number pad) presses the green button, and the menu's buttons never take the page's focus (the #88 Enter bug, fixed
  in #89).
- [Approved] The end of run uses the pause menu's look: section 7.

## Open questions
Recorded in #82 until answered; answers move into the sections above.
