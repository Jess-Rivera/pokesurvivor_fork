# DEVLOG

Log of each working session. Append new entries at the END (the file is no longer reverse-chronological).
Keep each entry to about 6 lines: what changed, what was decided, what broke, where we stopped. Details go in DECISIONS or the harness.
Older entries were rotated to docs/DEVLOG-archive.md (latest rotation 2026-11-22). Rotate again when this file passes about 40 KB.

---

## 2026-11-16 (Claude Code, home), #148 catch odds: Jess's shake formula
- Options map (A to C, retuned star bands) dropped for Jess's own mainline-style formula (pokeball-math-human-made.txt).
- Decided: capture_rate back (overrides round 5), faster win = easier, critical = sure catch, Timer Ball for long fights.
- Built: pokedex cr via tools/add_base_stats.py; catch.js ODDS + rateParts; separate critical and shake rolls with one wobble
  per passed shake; 148b flee ring after the break-out and G.Debug.catchMath. Harness 6a to relations, mutants checked.
- Fixed in Jess's txt: step 7's critical was 4096x too big. Found: WL 1 early bonus makes most 1 and 2 stars sure catches.
- Stopped at: Jess's feel test, then tuning (star curve, early bonus, 0 badge penalty).

## 2026-11-16 (Claude Code, home), #148c catch tuning, #148 closed, #149 Shop UI rework filed
- Jess's tuning picks after the feel test: Steep star curve (1 / .5 / .25 / .1 / .05, 5 star its own value), early World
  Level bonus x2 at WL 1 fading evenly to x1 at WL 13 (rescale, not a clip), badge penalty unchanged. Decision file.
- Built test first: harness 6a gained three relations (WL 1 rate at most twice WL 13, bonus shrinks every level, 5 star
  below 4 star), red on the old numbers; four mutants fail it. check.js and smoke-ui pass. Jess: feels good, #148 closed.
- Filed #149: Shop menu UI rework on sub-branch rework/shop, before #137. Rescue pick stays star weighted (no new issue).
- Stopped at: Jess makes the Shop mockup; next session opens #149.

## 2026-11-16 (Claude Code, home, late), #149 opened: Main Menu Shop, 149a shell built
- #149 is the Main Menu Shop (not the in-run shop; the issue named the wrong file, fixed). Jess's mockups committed.
- Rulings: four tabs (Pokeballs, Character Upgrades, Team Items, TRs) plus the Inventory restyle; a TR is learned for good and
  joins the Move Trainer pool, priced by move power; TR starting move is #150 (blocked). Sub-slices a to f; merge before #137.
- Built 149a: window over the dimmed Main Menu, flush icon rail (no cursor, Q / E), smaller Exit, old panes inside. Feel-test
  fixes, then the cursor follows the device in use (kit inputMode; decision). smoke-ui Shop pass, 11 checks, green.
- Stopped at: 149a Needs Playtest, not closed; next 149b Character Upgrades.

## 2026-11-17 (Claude Code, home), #149b and #149c built and signed off
- 149b Character Upgrades: two pocket cards (2x2 slot grid, Buy for the next slot, Full when done). Kit: Box body, TeamButton disabled.
- 149c Team Items: searchable 3-column sale cards beside a searchable owned panel 4 across; Inventory beside Exit. New
  Tooltip Delay setting (keys show tooltips after it). Kit: ItemGrid columns and overlay, SearchBar.
- Three feel-test rounds: pane scrolled with scrollIntoView (now overflow clip, own-box scrolling, whole cards); cursor corners
  clipped; WASD moves the cursor; Up row by row, search bar only from the top row; no cursor with the mouse, none on search bars.
- Decisions: cursor tooltips after a settable delay; no selection cursor with the mouse. smoke-ui Shop pass 30 checks.
- Stopped at: 149c signed off; next session opens 149d (Inventory screen).

## 2026-11-17 (Claude Code, home, second session), #149d built and signed off
- 149d Inventory: the Shop's window; searchable 3-column cards (220 wide) with Equip / Unequip / Swap; 4 slot panels drawn
  like the run screen's (unbought dimmed); "Select a slot to swap." (skipped with one slot, or for a second Stone, which toasts).
- Shared: js/ui/menu-window-kit.js (the Shop's cursor rules, CursorButton, ItemCard, SearchStop) and the kit's RunItemBox.
  Equip rules moved to G.Items. Old Inventory code, markup and styles gone. smoke-ui Inventory pass 20, Shop 30.
- Broke and fixed: key listener order (Enter reached a second screen); game.js closed the Inventory on any Esc.
- Filed #151, #152 (unaffordable buttons take the cursor, toast "Unable to Afford"; decision), #153 (menu keys differ).
- Stopped at: 149d signed off; next 149e Pokeballs layout.

## 2026-11-17 (Claude Code, home, third session), #151 #152, 149e and 149f built and signed off; #149 closed
- #151 #152: a Buy that cannot buy takes the cursor and toasts why. 149e Pokeballs tab (17 ball cards, the belts, buys inert).
- 149f TMs tab: G.TMs (price by power, teach), a copy's learned TMs (copies.js key j), the Move Trainer pool adds them;
  js/ui/shop-tms.js; kit Dropdown (multi-select). Decision: TM kept for good, the in-run TM Mart renamed TR Shop.
- Broke and fixed: game.js closed the Shop on any Esc; team slots piled in a corner; slow cursor with every Pokemon owned
  (lists recomputed per button); shiny portraits with no file logged 404s.
- Stopped at: #149 closed; next merge rework/shop into feature/128-acquisition, then #137.

## 2026-11-17 (Claude Code, home, fourth session), #154 menu.js split, closed
- js/ui/menu.js (1783 lines) split by duty into menu.js (Main Menu, region select), menu-dex-grid.js, menu-pokedex.js,
  menu-team.js, menu-team-copies.js, menu-upgrades.js; G.MenuUI unchanged for callers; listeners keep their order.
- Decided: the upgrades screen moved now (#97 swaps one file); the shared filter state lives with the shared grid.
- Checks: check.js all passed, smoke-team passed, smoke-ui passed twice (one known asset-load flake). Jess feel-tested.
- #153 built: one menu key set (Enter and Space select; arrows and movement keys move) on Main Menu, Shop, Inventory.
  Broke and fixed: Enter or Space on Play reached the region picker's listener and started a run at once.
- Stopped at: #154 closed; #153 in Needs Playtest; next #137 (needs ball tiers and prices).

## 2026-11-17 (Claude Code, home, fifth session), #137 Shop balls, built
- #153 feel test passed, closed; #147 closed (the UI Library page is in use).
- #137: Poke, Great, Ultra prices and the belt prices in js/data/balls.js; G.Catch buys balls, unlocks and belts; the
  run-start refill is gone; shop-balls.js buys; catch-ui.js throws from every bought belt.
- Decided: B1 to B12 (decision 2026-11-17-137-balls-bought-and-kept-no-refill).
- Checks: rescue-harness, smoke-ui, check.js all passed; smoke-pause-menu only the known 401 px failure.
- Stopped at: #137 in Needs Playtest; next #138.

## 2026-11-17 (Claude Code, home, fifth session, later), #137b ball slots
- Feel test: buying pushed balls down and onto the next belt (counts per tier, redrawn best first on every change).
- save.belt is now a slot layout; buys fill the first empty slot; the Shop moves and swaps balls by click, drag, Enter
  and Space (the in-run Inventory's pick-up model); a throw empties its slot; old saves convert on load.
- Checks: rescue-harness, smoke-ui, check.js all passed; smoke-pause-menu only the known 401 px failure.
- Stopped at: #137 back in Needs Playtest.

## 2026-11-17 (Claude Code, home, sixth session), #137c Pokeballs tab follow-up
- Jess's four asks: belts packed right and numbered; one "Buy Belt N price" beside Exit; Sell Pokeball above Exit
  (half price, red focus rim); an affordable Unlock stays lit on its dimmed card. G.Catch.sellBall, G.BALL_SELL_SHARE.
- Decided: decision 2026-11-17-137c-sell-balls-at-half-price. Sell is wider than Exit so its label fits.
- Broke and fixed: Pane read a signal, so Preact skipped its redraws on save; Sell moved to its own component.
- Checks: rescue-harness, smoke-ui, check.js all passed. Stopped at: #137 in Needs Playtest.

## 2026-11-17 (Claude Code, home), #155 UI Library v2, step 155a
- #137 feel test passed, closed. New dev-process slice #155 (child of #126): a library board as the shared UI language.
  Opening, mockup and plan: docs/AI Outputs/Issue-155/UI Library v2 - Slice Opening.md and 155 - UI Library v2 Build Plan.md.
- 155a: js/ui/lib/tokens/tokens.js holds every colour palette, font and page layer by name; the type colours moved there
  (decision 2026-11-17-155-design-tokens-in-tokens-js). tools/library.html is the board (Tokens pages built).
- No visible change. check.js, smoke-ui, smoke-ui-library all passed. The old page's script list was stale; resynced.
- Stopped at: 155b (Buttons) next, on Jess's OK.

## 2026-11-18 (Quick, work), #155 155b to 155c-6 and the unified colours
- Built: the library primitives (buttons, panels, cards, squares, bars, the ask dialog, round portrait) with the
  screens drawing from them; the Shop Pokeballs and TMs card clip fix and short prices; changelog lines.
- Board: primitive pages show states as tiles and props in a table; Tokens, Colours is now Unified, Fold Map and
  Reference Not in Game (the old Colours page and the other Colours 2.0 tabs retired).
- Decided: pieces named by look; ask dialog keys; states vs props; the UI uses 28 non-canon colours (7 greys, 7
  three-tone ramps); status chips take the canon type ramps; distances in CIEDE2000. Research report in docs.
- Not run: check.js and every smoke (Quick cannot run node). smoke-ui-library will fail until rewritten.
- Stopped at: nothing committed; checks, three commits and push owed; then the TODO #155 list.

## 2026-11-18 evening (Quick, work), #155 155e fonts and the glitch button draft
- Decided: the font scheme (Michroma meta, Silver 10px Pokemon, BoldPixels and monogram world; Truth And Ideals and
  PokeBW retire); menu buttons use Michroma; damage at canvas 8, crits at 16. Two decision files, HUD-STYLE "Fonts".
- Built: tools/make_silver_font.py (Silver-10px.ttf), the Fonts board tabs (Unified, Fold Map, Reference), six
  smoke-ui-library font checks (committed 271920). Then Buttons, Glitch Draft tab: rest and focus swipe.
- Nothing in js/ or css/ touched. check.js and the smokes not run from Quick; results of Jess's 155e run not recorded.
- Stopped at: feel test of Fonts and the glitch draft; next glitch states. Tooltip size decided at the feel test.

## 2026-11-18 night (Claude Code, home), #155 button.glitch, toggle.power, board split
- Built: the board split into tools/library/ (index.html, board.css, plain scripts in load order; the old file redirects).
  button.glitch finished and feel-tested (CRT press, refused shake, disabled, a secret glitch with burst, gap, count);
  toggle.power (ring off, bar on, the CRT on its side, fixed 22 px box). docs/META-NARRATIVE.md committed.
- Decided: button.glitch replaces button.slanted and button.rounded at #126; pixel panels frame one Pokemon, shared
  things and the code's interface go clean (#157 opened). Only Unified colours for new looks (Jess).
- Broke and fixed: the split pointed the Pikachu portrait at tools/assets; lint jumped 212 errors (eslint block added).
- Checks: check.js all passed, lint 0 errors; board pages loaded headless each step; smokes skipped (Jess).
- Stopped at: #157 next. Six commits to push.

## 2026-11-19 morning (Quick, work), #157 clean panels, Unified Panels and Squares, the bar cursor
- Built (board only): Panels and Squares Unified tabs as board copies in Unified colours (panel.clean, the detail
  background, panel.pixel, panel.slanted, square.item, square.clean); a Cursor page (cursor.bar: blink, solid, CRT
  move, arrow demo). Removed Buttons Current and Panels Clean Draft and Current. Stories moved to tools/library/stories/.
- Decided: panel.slanted stays, move slot only; the held item keeps square.item. Tried and dropped: a pixel slanted
  port, a card.horizontal slot, panel.pixel at held item size, the cut corner on panels.
- Nothing in js/ or css/ edited (the story files moved out). check.js, lint and the smokes not run (Quick).
- Stopped at: #157 closing (places not drawn go to the #155 composites and #126); next the rest of #155. Two commits.
- Later: Bars, Unified tab (tools/library/bars-draft.js, .css): bars in Unified colours; the hit's cut piece flashes
  white 80 ms with a 4 px hop, goes grey (paper, mid rows) and falls at once with an 8 px rightward drift (no 1 s hold).
  Decision 2026-11-19-155-bars-unified-and-the-hit-flash. Board only.
- Later: Modal, Unified tab (tools/library/modal-draft.js, .css): panel.clean, Michroma, button.glitch; the new
  button.glitch.cancel state (also on Buttons); keyboard-only focus, the first key from mouse mode only reveals it.
  Decision 2026-11-19-155-dialog-clean-cancel-state-and-input-modes; ask intents and opens-on-cancel still pending.
  Then: reveal-first applies to the menus too at #126 (a game change); the keys start from the last button touched.
- Later: researched confirm dialogs (report in the Quick session workspace). New rule: only a loss you cannot earn back
  or redo gets a dialog (Sell, Delete account, Sign out as guest, leftover EVs); purchases and team edits do not ask.
  The modal designs stay whole (all three intents) for a later positive confirm; #126 changes only how they apply.

## 2026-11-19 evening (Quick, work), #155 Portraits and run.hud.playerActive.bar
- Built (board only): Portraits Unified tab (rest, active, selected in yellow with the shimmer, fainted), pinned.
  run.hud.playerActive.bar: the healthBar and expBar sets merged into one B2-style bar (HP track, EXP strip under it,
  upright Silver labels, EXP off the portrait ring). HP numbers outside, centred on the bar, current HP held still.
- Decided (Jess): one bar for HP and EXP; numbers stay outside. Dropped: numbers inside the holder (no room at 20 px).
- Nothing in js/ or css/ edited. check.js, lint and the smokes not run (Quick). Pages checked headless with stubs.
- Stopped at: the bar's decision file (owed), then run.hud.playerActive and moveSlots. One commit to push.
- Later: Chips page (tools/library/chips-draft.js, .css): one B2 capsule for the status, effect and type chips, text
  Silver 20, so 16 art rows (32 px, was 24); colours read from the Fold Map. Type chips 112 px, no glow or timer.
  Open: the height, type name casing (descenders reach the rim). Rendered headless against the real board files.
  Then (Jess): chip.status goes to Silver 10 at 1 px per art pixel, 40 x 17, so font and chip pixels match; chip.type
  keeps both scales, Silver 10 at 1 px (60 x 17) and Silver 20 at 2 px (116 x 32). Dropped: Silver 10 on a 2 px chip.
  Type names in capitals (reverses 2026-11-11's "Ghost"). Decision 2026-11-19-155-chips-one-capsule-status-1px-type-two-scales.
  Also audited the primitives against the game: missing are the tooltip, slider, text field, tabs and the see-through
  HUD panel. Stopped at: the bar's decision file, then run.hud.playerActive with the 1 px chips. Chips commit to push.

## 2026-11-19 night (Claude Code, home), #155 bar tuning and run.hud.playerActive.area
- Recorded the bar decision Quick missed (2026-11-19-155-hud-bar-one-bar-for-hp-and-exp), then tuned the bar on the board:
  3 x 5 HP and EXP letters on ink plates, a 5-row shaded HP track, an ink row under it, the EXP strip light over dark
  beside the P, shorter than the track; the bar narrowed to the slots' 426 px.
- Built run.hud.playerActive.area (tools/library/hud-area-draft.js, .css): slots and wells, portrait, Lv, bar, chip
  bands, held item, Silver. Decided: it lines up on the slots, one 8 px stack gap, the item's 12 px gap on the left.
- Decided: the library board has no tests; removed tools/smoke-ui-library.js and the board's test-only hooks.
- Open: the active portrait stroke for two types. check.js passes.
- Stopped at: Jess's stroke ruling, then moveSlots detail, the tooltip. Board only; nothing in js/ or css/.

## 2026-11-19 late night (Claude Code, home), #155 run.hud.teamSlot and bar.life
- Built run.hud.teamSlot (tools/library/hud-team-slot-draft.js, .css): two zoomed slots (active with the cursor, benched
  with a chip) and the team of six with the berry pocket, from today's roster numbers in Unified colours.
- Updated Primitives, Bars: bar.life is now the playerActive bar's HP part inside the original B2 background. The team
  slot's HP bar is the same without the background. Decisions: ...bar-life-keeps-the-b2-background..., ...team-slot-hp-bar-cursor-gap-and-berry-pocket.
- Decided: held item 10 px off the box (2 px from the cursor), name 2 px up, berry pocket = small panel.pixel in the berries
  ramp with a 2x2 of dark-filled circles whose stroke goes green when a berry is held.
- Broke the board three times (a load-time colour lookup, a missing pocketBerries token, a swapped template id); the last
  fix was checked in a stub-DOM harness first. No screenshots taken (the local server was not allowed), so nothing seen yet.
- Stopped at: Jess's look at the team slot and bars pages. Board only; nothing in js/ or css/. check.js passes.

## 2026-11-20 morning (Quick, work), #155 two-type rim, tooltip, area slot detail, rough shop drafts
- Board: run.hud.teamSlot's two-type rim (first type left, second right, middle 25% dithered); Primitives, Tooltip
  (new) and Inputs (new: field.text, field.dropdown, scroll.bar); run.hud.playerActive.area's slot detail (dimmed
  inactive slots, 32 px wells, badges inside the well, cast flash), bond count above Silver, Shake Off, run timer.
- Decided: every tooltip in Michroma (name 20, text 12); the tooltip look (icons open); four 2026-11-20-155 decision files.
  Filed #158 (pinnable and nested tooltips). Fonts page gained the tooltip and Shake Off rows; HUD-STYLE font note updated.
- Broke: the area page's bond count collapsed off-screen (a bare svg in a piece) and the first well size touched the
  slot's bands; both fixed. Tried and dropped: split / gradient / stepped strokes, a full-width dither, slot cursors.
- Rough drafts of all four main.shop.* tabs: none looked right; kept as NOT APPROVED starting points.
- Stopped at: redo main.shop.character one piece at a time. Nothing in js/ or css/; check.js not run (Quick).

## 2026-11-20 afternoon (Quick, work), #155 main.shop.pokeball and main.shop.character approved, panel.shopCard
- Board: Pokeballs redone to Jess's notes (rail 1 px in, 224 px cards with 140 x 36 buttons, today's ball art centred on
  its filled pixels, belts as panel.pixel with six 52 px wells, belt numbers Michroma 16 with an ink stroke, Sell 204 px).
  New panel.shopCard (grey.raised body, teal edge) on every shop card; Character Upgrades pockets panel.pixel, no grid.
- Decided: both tabs approved; button.glitch's rest body is transparent so the swipe draws it (disabled text grey.slate);
  a dimmed card never dims its button. Four 2026-11-20-155 decision files.
- Broke: the focused button showed a 1 px white sliver of its rest bar (fixed); refused buttons lacked their state class.
- Stopped at: main.shop.items next. Nothing in js/ or css/; check.js not run (Quick).

## 2026-11-20 evening (Quick, work), #155 Team Items, the run screen's top, team items bags, catch.window
- Board: main.shop.items (Pokeballs card at 256 px, item art) and the TMs cards (TM discs, real move lines); owned and
  Pokemon panels grey.raised. New pages: run.hud.teamItems, run.hud.gymLeader, run.hud.worldInfo, run.hud.runInfo
  (hud-top-draft.js), catch.window (catch-draft.js). run.hud.portrait removed; field.dropdown no longer clips y and p.
- Decided: items, gymLeader, worldInfo, runInfo and catch.window approved; bags stacked lower right, HUD drops item
  names and trackers; TM Learned and Known disabled; catch result a toast, window 1020 x 424, Let It Go opens on
  Keep trying. Seven 2026-11-20-155 decision files.
- Broke: the catch ask drew under the window's pieces; one-sided belts; the owned cursor read between faces (fixed).
- Stopped at: main.shop.tms label, then approve it and run.hud.teamItems. Nothing in js/ or css/; check.js not run.

## 2026-11-20 night (Claude Code, home), #155 cursor.ring, dialog rule, run shops
- Board: cursor.ring (round pieces, no blink, CRT) on shop belts, TMs and the catch window (belts back to 84 px, window
  980); modal and glitch pages lose the cancel state; new rough drafts run.hud.moveMart, trMart, forgetMove.
- Decided: a dialog's answers never share an intent (back-out Neutral); replace-a-move is pick, popup, Replace or Go
  Back ask; run shops mirrored, no Silver purchase ask. Three decision files, a layout map in docs/AI Outputs.
- Broke: the ring did not blink (rule named only the bar; moot once blink was removed). check.js and format pass.
- Stopped at: Jess's move-trainer and tr-mart mockups (assets/excalidraw) were found at wrap-up and differ from the
  drafts; redraw to them next. The run-shop pages were never rendered by the assistant. Nothing in js/ or css/.

## 2026-11-21 morning (Quick, work), #155 run shops approved, Ancient Power description fold
- Board: run.hud.moveMart stacked (teamSlot rows with type chips, cards with a Silver price line, no Buy), trMart its
  top-to-bottom mirror (TM discs, ring on the picked disc, status per row), forgetMove (four taller slots, ring on the
  move, bonds darker and skipped, wide card). Shared shop helpers; panel.slanted takes a height. All three approved.
- Game: js/ui/move-info.js folds five matching stat raises into "all stats" (Ancient Power 126 to 47 chars), sheet
  too; harness relations, a 100-character fit check, two mutants; changelog. New tools/move_desc_lengths.js.
- Not run from Quick: check.js, format, the ui-readers harness and mutants. Stopped at: main.shop.tms label.

## 2026-11-21 midday (Quick, work), #155 closes: bond popup, TMs bar, the board ends at primitives
- Board: run.hud.bondSelection approved (team rows, four slots in one row, the first pick's rim bond pink, a Bond or
  Cancel ask); main.shop.tms (Able to Learn 12 px on two lines, one bar row) and run.hud.teamItems approved.
- Decided: the board stops at the primitives and the approved composites; the rest is built in the game at #126. The
  main.team first pass and the Pause placeholders were removed. Team menu mockup and rulings kept for #126.
- Broke: nothing known. Nothing in js/ or css/; check.js and format not run, board pages not rendered from Quick.
- Stopped at: closing #155 (drafts in docs/AI Outputs/Issue-155/155 - Close-out Drafts.md).

## 2026-11-21 evening (Quick, work), #138 Lost Pokemon built; #139 grilled
- Changed: #138 built (pool of evolvable Stage 1s from any region with floaters, nature toast, hover escort, safe
  liquid spots, recruit 20 / 12 / 6% held like a catch, English lines, G.Debug.lost; new lost-pokemon harness and
  10 mutants; gyms-only harness reads pool()). Committed ce57625 and 4cf32cb, pushed.
- Decided: #138 H1, H2, D1 to D9; #139 opening, then a grilling that replaced CD1, CD3, F0 and F1 (out-of-run level,
  candy sources, starting and egg moves, friendship model, fatigue). Agent corrected for deciding too much alone.
- Broke: the gyms-only guard ("not legendary" comment, old pool regex), fixed. check.js clean on Jess's machine.
- Stopped at: the 8a build plan. Research noted as a forming idea, no scope yet.

## 2026-11-22 (home), branch recovery; #139 8a candy designed
- Changed: moved from the stale feature/128-acquisition to feature/138-146-lost-and-full-box (dashboard commits
  cherry-picked, format pass and doc-colours regenerated, check.js passes). Lost-pokemon mutate: 10/10 caught.
  Wrote the candy decision file, the opening-doc revision and docs/AI Outputs/Issue-139/139a - Candy Build Plan.md.
  Filed #163 (materials shop tab).
- Decided: target 40,007 XP (3-stage fully level-based median; Quick's 33,084 was the 25th percentile); canon candy
  sizes; base 44,100 XP a full run; a drop ladder (Common to Jackpot) in G.Drops; elite floor weights; materials
  separate ladders, derived from the leader's type, one roll per source per loop, shop stock of one per beating.
- Broke: nothing. No game code touched.
- Stopped at: the 8a build plan awaiting Jess's OK on the fixed tier-to-size rule and two open items (elite berry
  and ground item beside the ladder; UberElite and elite counts). Part A is next.

## 2026-11-22 (home, Claude Code, evening): working-process cleanup
- Built tools/catchup.js (one command prints the whole catch-up briefing with issue titles, writes gitignored
  catchup-latest.md) and its harness. CONTEXT.md session start runs it; Quick reads the file Jess generates.
- Renamed docs/ASCII Concept Maps to docs/AI Outputs, sorted 132 files into Issue-N and topic folders, rewrote every
  path reference (153 files), updated the CLAUDE.md output-format rule (chat first, Mermaid file only for real plans).
- Merged the STATE and TODO overlap, dropped the stale issues-by-area list, refreshed the memory files.
- Broke: nothing. check.js passes. Stopped at: #139 8a awaiting the three candy plan answers.

## 2026-11-22 (home, Claude Code, night): #139 8a built except the Team menu (Part F)
- Replanned 139a: "upgrade" had been read literally. Now ONE drop function for every loot drop (tiers rarest first,
  stop at the first hit, Common otherwise, unnamed tiers fall to Common, weighted lists, roll count per source); candy
  is its own table. Fixed tier-to-size rule rejected. Candy tables, berries off elites, elite coins (4 to 7 worth 3)
  and Pokemon item approved. Built Parts A to E and G: G.Drops tiered entries, G.Candy, growth-curves.js, save key c.
- Tests: candy-harness (floor vs the pokeapi median), drops-harness cases, candy-mutate 13/13, smoke-gym banks candy.
- Broke: nothing. Stopped at: Part F, three questions logged in the decision file and STATE.

## 2026-11-23 (home, Claude Code): #97 upgrade numbers drafted in #131, telemetry issue
- Drafted the #97 numbers with Jess: exponential prices per level (x1.6 base stat, x2 crit/cooldown/regen), every
  per-copy price scaled by BST stars / 3, bands at OOR 1/10/20/40/80. Shape [Approved], numbers [Proposed] until real
  PokeCoin income exists (no trace has reached gym 1). Decision 2026-11-23-97-upgrade-price-shape-bst-and-bands.
- Opened #166 (PokeCoins in the run trace, a traces folder, an HTML telemetry dashboard), on the board in Triage.
- Fixed two Mermaid labels in the #97 design doc (a % sign breaks the parser).
- Broke: nothing. Stopped at: Jess designs the Team menu and Upgrade tab; next session builds them, then #97, then #139.

## 2026-11-23 (home, Claude Code): Team menu and Upgrade popup ruled on, mosaic background tuned
- Reviewed Jess's two sketches against the gap review; rulings in decision 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings.
  Three slices with openings agreed: A #167 (new), B #139 Part F, C #97. The evolution tick and Give until control are gone.
- Opened #168 and built its tuning page (tools/library, Backgrounds): teal mosaic, level-up starburst, water waves in the
  light. Settings and rulings in decision 2026-11-23-168-mosaic-background-look-and-settings. Mounts with #167.
- CLAUDE.md: a commit with no code skips check.js and format.
- Broke: nothing. Stopped at: the slice A (#167) prose plan is next.

## 2026-11-23 (home, Claude Code): the new Team menu (#167) and its mosaic (#168) built
- Plan approved with six rulings (decision 2026-11-23-167-slice-a-plan-rulings). Rules first: G.TeamDraft and G.TeamList
  with the end-goal test (team-menu-harness, 18 mutations caught), then the library pieces (portrait states, field,
  toggle, chip.type, row.stat, cursor.bar, scroll.bar look, mosaic), the screen, and the old Team screen removed.
- Mosaic is a library piece the tuning page runs too; two settings; mosaic-harness; 60 fps at 1440p headless with GPU.
- Broke: nothing found. smoke-ui has 15 failures that were there before (same list on the commit before the screen).
- Stopped at: Jess's feel test of #167 and #168; then slice B (#139 Part F).

## 2026-11-24 (home, Claude Code): Team menu feel test, round 1 (#167)
- Roster saves at once, Back and Revert (by UUID), held Sell and tab buttons (button.glitch held), still silhouettes, the
  detail panel's equal bars with Moves in the lower one, no teal box on a selected Pokemon.
- Layout follows the window: fixed 30 px bars (round 2, was 48), side panels anchored, the grid fills; a small window scales the panels.
- Headless software rendering shows a see-through strip over the mosaic; not with a GPU or in a headed window.
- Jess approved rounds 1 and 2. Empty wells show in boxes (drawn only; autosort kept, no saved spots). Next: slice B.
- Closed #167 and #168. Stopped at: slice B (#139 Part F) prose plan, next session.

## 2026-11-24 (home, Claude Code): candy in the Team menu (#139 Part F)
- Jess ruled on eight open points (decision 2026-11-24-139-part-f-candy-in-the-team-menu). Rules first: candy-harness, 18 of 18
  mutants caught. Then the XP bar, Level Up on slots and the detail panel, the EXP Bag popup, pointer-dragged candy, bursts.
- Chromium starts no browser drag while Shift is down, so candy is dragged by pointer. Toasts no longer take clicks.
- Driven headless on file:// at 1920x1080 and 1280x720 (drags scaled down too). smoke-ui: the same 15 old failures.
- Jess feel-tested it: all good; the popup's position waits for drag windows (#158). Stopped at: slice C (#97 popup).

## 2026-11-26 (Claude Code, home), #97 slice C: Upgrade popup grilled and built
- Grilled the plan's eight open questions (decision 2026-11-26-97-upgrade-popup-open-questions); #169 leaders split out.
- C1 catalog, BST-star prices (3-star floor), OOR bands, per-upgrade save caps; old upgrades and save.pupg unread.
- C2 raised bases in G.Stats (attackFactor, applyPlayerDefense, Player HP/Speed/dodge), crit, Cooldown, Regeneration++.
- C3 the popup as a Team menu piece, sketch names, hover preview; old B/W screen removed; attack colour tokens added.
- Found: smoke-pause-menu throws in the EV section before this slice too (#170). Stopped at: Jess's feel test of #97.

## 2026-11-26 (Claude Code, home, later), #97 slice C review and follow-ups
- Reviewed C1 to C3 (report: docs/AI Outputs/Issue-97/97 - Slice C Review.md). Rules, stats and saves match the plan.
- Fixed: buying a card out by keys dropped the cursor onto the Team menu behind the popup (Enter lifted slot 1).
- Built from the sketch (the plan had missed it): switch arrows by the portrait, wrapping, hidden with one member, Q / E
  and 1 to 6; E is a mirrored glitch button. Card shine dropped (it was in the sketch; I first said it was not). #171 filed.
- Team menu arrow keys follow the cursor bar (slot buttons, slot, grid). Up from the box tabs left as is (Jess).
- Stopped at: Jess's feel test of the whole slice, then close #97 slice C.

## 2026-11-26 (Claude Code, home, afternoon), #97 and #145 closed, #172 filed, #146 opened
- #97 slice C feel test passed; the only bug, "Needs Lv N" running past the buy button, now reads "Lv N". #97 closed;
  the account-wide remainder is #172 (Character Upgrades).
- #145 built test first: the damage class badge (Jess chose assets/icons/category over a text pill) beside the move name
  in every move tooltip. Feel-tested, closed. Found: smoke-pause-menu's hex check fails with #97 upgrades (on #170).
- Explained thin Gen 8 and 9 learnsets: the imported moves are all Gen 1 to 6, and the bake unions every game.
- Stopped at: #146 slice opening written, four open decisions wait for Jess.

## 2026-11-26 to 27 (Claude Code, home), #146 keep-or-sell list built and closed
- Jess answered the four opening decisions (decision 2026-11-26-146-keep-or-sell-open-decisions); the look was sketched
  on the library board first (main.keepOrSell) and approved with three fixes.
- Built: overflow catches wait in save.heldCatches; the Main Menu list (fitting catches start as Keep, Keep refused past
  the free places), Make Room round trip through the Team menu, Confirm or Esc places and sells; unanswered sells on load.
- Tests: keep-sell-harness, smoke-keep-sell. Feel test passed 2026-11-27; #146 closed. Follow-up filed: #173.
- Stopped at: #173 next; the branch stays open for #139 8b and 8c, #140, #141, #142, #143 before the merge to main.

## 2026-11-27 (Claude Code, home), #146 closed, #173 opened
- #146 feel test passed; closed. Corrected the handoff: the branch stays open for #139 8b and 8c, #140 to #143.
- #173 opening written; Jess ruled (decision 2026-11-27-173-held-catch-fully-rolled-and-owned-box): the whole copy rolls
  when the catch window opens, both the catch screen and the keep-or-sell list show it, the list gains an owned box
  (team copies included) the cursor can enter; the look is sketched first from Jess's mockup. Filed #174 (shiny catches).
- Stopped at: Jess agrees #173's goal, done and test and drafts the mockup.

## 2026-11-27 (Claude Code, home), #173 built
- Jess's two mockups ruled (decision 2026-11-27-173-mockup-short-detail-panels): short detail panels either side of the
  catch window and the keep-or-sell list, hover previews and a click pins, Esc unpins first, owned Sell by Team rules.
- Built: held catches carry the copy rolled at the catch window (G.Copies.place, obtain takes it, held copies cleaned
  on load); the Team detail panel split into shared pieces; catch window 948 px; keep-or-sell 948 x 600 with owned box.
- Tests: keep-sell-harness +6 sections, smoke-keep-sell #173 part, new smoke-catch-detail; all pass. Jess felt it once.
- Stopped at: fuller feel test, then close #173.

## 2026-11-27 (Claude Code, home), #173 closed
- Jess's fuller feel test of the held catch compare passed; #173 closed with a comment.
- Smokes rerun: smoke-ui had one new failure, a stale check expecting the hover tooltip #173 replaced with side panels;
  the check now looks for the right side panel, back to the 15 old failures. smoke-pause-menu: the known #170 only.
- Drift: TODO and STATE no longer cite closed #97 or #173.
- Stopped at: branch work (#141 and #140, then #139 8b), and the #174 slice opening.
