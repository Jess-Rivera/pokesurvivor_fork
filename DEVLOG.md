# DEVLOG

Log of each working session. Append new entries at the END (the file is no longer reverse-chronological).
Keep each entry to about 6 lines: what changed, what was decided, what broke, where we stopped. Details go in DECISIONS or the harness.
Older entries were rotated to docs/DEVLOG-archive.md (latest rotation 2026-11-15). Rotate again when this file passes about 40 KB.

---

## 2026-11-12 (Quick, work), #91 built end to end: Run Info, Region Best, Run Stats box
- 91-1 checks passed on the machine after two fixes: boss-owner-harness crashed stringifying stDot (its by is now the
  caster); a STALE Brock cards mutant from #84 re-pointed.
- 91-2: hits carry their move id; Silver earned / spent; Region Best (save.regionBest, solo and clean only, pace delta,
  rules DR1 to DR5, RC1, RC2); Run Info panel (pause-run-info.js, pure sections()); debug runinfo / regionbest /
  recordcheck. Cleanups: shared kit ScrollBox (now draggable), Silver kill pays once, onDealt takes named fields.
- 91-3: Run Stats box, 12 rows scrolling in its 200 px box (Jess kept the size); G.U.compact, fieldSeconds, statusList.
- Tests: run-info harness and mutate runner new (78 checks, 28 mutants); run-stats harness 108; all in Quick's sandbox.
- Broke: a changelog entry mis-nested (parsed fine); smoke read the Statuses tooltip as one string. Both fixed.
- Stopped at: Jess re-runs smoke-pause-menu, feel-tests #91; next is #83. GitHub API empty from Quick all session.

## 2026-11-12 evening (Quick, work), design session: types by region, type maps, acquisition rework
- Built a types-by-region dashboard (docs/type-region-dashboard.html). Found Kanto T6 rolls no hordes, publish needs a missing make_seo_pages.py.
- Region type maps designed then PARKED: 8 type maps + a Stage 3 map per region (Biomes v2, decision filed).
- Acquisition rework decided in direction over 16 rounds: gacha out, rescue catch (UberElite, belt, nature flee), Lost
  Pokemon recruits, candy evolution with mainline requirements, Link Cable. Map Acquisition v1, decision filed.
- Filed by Jess: #101 day/night (parked), #102 tooltips everywhere. Nothing in js/ touched; check.js not run.
- Stopped at: file the acquisition parent issue; #83 checks and close still owed from earlier today.

## 2026-11-12 afternoon (Quick, work), #83 Cards Taken and the shared tooltip layer
- #91 feel test passed. #83 built: Cards Taken is the DPS panel's count list, filtered to this Pokemon's cards
  (G.TeamCards.takenBy), team-only cards show real numbers on hover; the move tooltip gets a before/after "Cards:" line
  from the real fold (G.TeamCards.changes). Detail tooltip widened to 558 px (16 px clear of both side panels).
- Decided: every hover tooltip is the topmost layer; the pause menu draws all of them in one shared TooltipLayer
  (chosen over a CSS lift). Everything else is #102. Two decision files filed.
- Tests: team-cards harness 183/183 (25 new) in Quick's sandbox; both pause smokes rewritten for the layer, NOT run.
- Broke: a few Python writes to the device silently did not land; redone with read-back. A smoke variable clashed
  (sides), caught by the syntax check. The device link dropped once mid-session.
- Stopped at: Jess runs check.js and both smokes, feel-tests, commits; check.js not run this session.

## 2026-11-12 night (Claude Code, home), close #83
- #83 closed: checks green (run from Quick, not logged then), feel test passed. Body now also names the shared
  tooltip layer that shipped with it; comment lists what shipped. #82 has only #92 left.
- Looked at moving the team slots above the ball (under the inventory) to free a tooltip zone below it: fits with
  about 16 px spare, Jess dropped it. No code touched.
- Stopped at: #92 next; acquisition parent issue still to file.

## 2026-11-12 late night (Claude Code, home), end of run: #92 Run Review, #103 End Run, no EVs on quit
- Decided from the End Run mocks: End Run screen, Run Review (pause menu read-only), EV screen redesign (#104), a quit
  gives no EVs (crash keeps them), balls earned show nowhere. Decision file and PAUSE-MENU section 7; #103, #104 filed.
- Built #92 (openReview, read-only panels) and #103 (js/ui/end-run.js, SlotButton moved into the HUD kit,
  quitRun(keepsEvs)). Both feel-tested and closed. Fixed on the way: the old Quit button passed its click as keepsEvs.
- Tests: smoke-pause-menu End Run and Run Review sections, pokebox-evs harness 63/63, mutate 31/31. Its Cards Taken
  400 px check reads 401 since #83 (not ours).
- Stopped at: #104 EV screen next, the last child of #82.

## 2026-11-13 morning (Quick, work), #104 EV screen; #82 closed
- Quick agent aligned to CLAUDE.md (git allowlist, a full commit message every slice); its catch-up, wrap-up and
  board-sync workflows updated to match. No repo change for that.
- Built #104 (js/ui/ev-screen.js): six rows, current EVs white and adds yellow, click 1 / Shift 10 / hold; Learn
  saves then a 2 s toast; Go Home asks. Old scr-evs retired. 104b: fitToStage and createButtonRow in the HUD kit,
  cappedEvs and setEvs in copies.js. 104c: the shared toast restyled (charcoal, teal rim, Michroma), centred pop-in.
- Decided: decision files for the 104 giving rules and the 104c toast look; font rule in HUD-STYLE; toast 1 s was
  too fast, 3 s too long, 2 s it is. Doc tidy: PAUSE-MENU open questions, HUD-STYLE pause colours Approved.
- Tests: pokebox-evs harness 72/72 and 32 mutants caught in Quick's sandbox; Jess ran check.js, the mutate runner
  and the smoke, then committed and pushed (results not logged here). Broke: the smoke's third run reused last
  run's 252 EVs (fixed); the toast's pop animation dropped its centring (old bug, fixed).
- Closed #104 and #82; filed #105 (G.UI.ask restyle) and #106 (menu font, a duplicate of #99).
- Built (approved): PausePokemon and PauseInventory in main.js NEED, with a run-info harness check and 2 mutants.
- Merged feature/pause-menu-rework into feature/gym-leader-ai (78d69120) and pushed; a Windows index.lock rename
  failure on the first try cleared on retry.
- Stopped at: on feature/gym-leader-ai; next is the board fixes, then the acquisition parent issue.

## 2026-11-13 afternoon (Quick, work), #56 closed; #53 designed (leader intelligence)
- #56: a scan of all 37 mutate scripts found 64 STALE (not 42); 63 retargeted (55 reformats, 8 re-aimed), 1 removed
  (shop-screens level-up bans). Closed on the scan; the scripts were not re-run (Git Bash cannot redirect node).
- Board fixes drafted (#99, #106, #102, #29, #86, #101, #74). Leader AI refresher: docs/gym-leader-ai-map.html and a text map.
- #53 decided (decision file 2026-11-13-53): one intelligence per leader drives misjudge, reflex, dodgeRead, memoryUse and
  aimError; two-line curves meeting at the default, nothing perfect at the top; fractional dodge reads; overrides;
  misjudge proportional; growth 0..0.2. LEADER-AI updated. Rule change: misjudge 0.1 at the default.
- Nothing in js/ touched this afternoon; check.js not run.
- Stopped at: #53 plan approved (R2, aimError 10 px at the default, confirmed last). A new chat builds it.

## 2026-11-13 evening (Quick, work), #53 built and closed; four agent skills added
- Skills in .claude/skills (adapted from JordanCoin/codingskills, cursor/plugins, iliaal/ai-skills, with Quick twins):
  coding-principles, structural-review, writing-check, review-feedback. The coding-principles plan check ran on #53.
- #53 built from the approved plan plus A1 to A3, T1 and T2: curves, misjudge noise, fractional reads, validator,
  harness section 17, the sharpness duel, 21 mutants (2 retargeted). leader-ai.js is now 1086 lines.
- Broke: gyms-only-harness's judg ban caught misjudge; fixed in the guard (decision 2026-11-13-53-judgment-guard-...).
- check.js: only the two #30 harnesses red; the mutant result was not reported here. Feel test passed; #53 closed.
- Filed #107 (trigger set limits). Context steering for leaders considered and skipped (movement feels fine).
- Stopped at: #39 next (open the slice: goal, done-condition, test).

## 2026-11-14 morning (Quick, work), 39a built and closed; Bait parked; #30 green; tests check relations
- 39a: goal weights and tag multipliers authorable and wired to the planner; Brock (wall) and Misty (tempo) authored.
  Feel test: distinct, overtuned (Brock closes in too much, Misty runs too much); tuning moves to a balance issue.
  #39 closed; 39b not to be filed (#108 was filed from the first draft: close it).
- Decided: Bait parked in code (it won 97 to 98% of think ticks for every leader); fight-simulation tests dropped
  (their scripted player stood still); tests check relations, not values (TEST-FIRST step 3, CLAUDE.md move rule).
- Broke and fixed: the validator read #53's limits from a placeholder G.LeaderAI; two #59 mutants lost their only
  catchers when the duels went (section 9 checks added); 4 leader-stats mutants targeted the old brain (retargeted).
- #30: check.js all passed. Tools: test leaders, MUTATE_ONLY, failure-only harness output. Plan pages now dark HTML.
- Stopped at: gyms 3 to 8 (merge first or migrate first), then the structural review and the merge.

## 2026-11-14 afternoon (Quick, work), the gym-leader-ai merge and the structural review follow-ups
- Merged feature/gym-leader-ai to main (gyms 3 to 8 ruled to migrate after, slice 12 issue filed), after the
  structural review (Mermaid page) and its pre-merge fixes: F2 leader settings into js/data/leader-ai-settings.js,
  F4 the pause key asks the pause menu once, F7 mutate output untracked.
- Then on their own branches, each merged: F1 hud-overlay.js split into a core plus four hud-kit files (38 kit names,
  smoke-hud-overlay checks the wiring); F3 planner STEP_BY_VERB table (new tools/planner-step-parity.js); F6 dev
  tools into debug-run-screens.js and debug-leader.js (new debug-registry-harness.js). F5 ruled not done.
- Decided: new files count against the 1000-line rule; slice shape is repo-wide (CLAUDE.md); non-code outputs are
  Mermaid .md; the split debug files stay out of NEED. Filed: #121, the planner verb test-gap issue, and others.
- Broke: the first merge never ran (git merge -F - does not read stdin), so check.js showed old main's Misty fails.
  smoke-status-fx's frame check failed once on the work machine (GPU). Every check.js run passed after.
- Stopped at: main clean. Next: open the Brock and Misty tuning slice; rule #49.

## 2026-11-14 evening (Quick, work), #109 template check on balance/109-template-check
- Ordering ruled: template check, gyms 3 to 8, then one eight-gym tuning pass (#122 filed). Target feel ruled from canon:
  Brock a ranged wall, Misty a fast aggressor. Board drift fixed (#112 to #115 closed, blocked-by links set).
- Built (js/ touched): round 1 numbers; a trigger may set goal weights (T3, merged); the dev decision trace; the leader
  reads its whole kit (attackTerms shared with the real hit, fan projectiles, its own defense). 16f-g, 16h, 16i, 13 mutants.
- Broke and fixed: 16f-g read before its trigger fired. My trace misreads (a level 12 Brock, a 4% hit) were wrong.
- Found: Finish wins on cost, so goal weights cannot move it. Stopped at: Jess to rule the Decider scale fix.

## 2026-11-15 (Claude Code, home), #109 round 2 and #123 on balance/109-template-check
- Ruled and built: goal weights scale the whole plan score (net above 0 only; weight 0 never ranked); planned hits deal no
  more than your HP left; Brock Finish 0.35 from tools/replay-leader-trace.js on Jess's home traces. #123: move speed
  0.95 to 1.05 for every Player and wild enemy, Speed sets dodge recharge (0.8 to 1.2); the leader reads it at that rate.
- Tests: 16f rewritten, 16f-g, 16j, speed-band-harness (15); pokebox speed checks to relations; move trace re-recorded.
- Broke and fixed: 16e read a dodge whose threat note fell out of the 40-note log; 15c's hand math counted overkill.
- Second trace: Brock holds (Maintain 35%, Endurance 33%, median 158 px), Misty presses; Brock heals over finishing a
  1% mon (KO bonus 0.3 under a big heal), noted on #122. Jess's feel test passed; #109 and #123 closed.
- Stopped at: merged to main (4eb7e1e9). Next: #111 (gyms 3 to 8) on feature/111-gyms-3-to-8.

## 2026-11-15 afternoon (Claude Code, home), queue reset; #124 economy rule built; #125 boost tools
- Jess parked the leader AI (#111) and set a new queue, filed as #124 to #130 (economy, XP, UI umbrella, Main Menu v3.0,
  acquisition, architecture review, regions); #97 stays the upgrade system.
- Ruled: economy independent of XP; XP bands by skill; Silver 1 per kill from 0; move price by slots filled (Trainer 300
  base, 80/60/20/0; TM Mart 450, thirds and ninths); elite and boss bonuses wait for a trace that reaches gym 1.
- Built: run pace trace (G.Debug.runTrace, tools/run-pace-summary.js, smoke-run-trace); the new price and Silver rule in
  shops.js, silver.js, shop-ui.js; G.Debug.xpBoost(on). Silver and shop harnesses and mutations rewritten to the rule.
- Found: the 3-minute boost makes most of the early lead (+2.1 levels at 3:00 against +0.7 without, from 2 traces).
- Broke and fixed: the trace hook staled one shops mutation; the recorder had to attach after game.js loads.
- Stopped at: #124 in Needs Playtest on balance/124-economy-xp; next a boost-off traced run for #125.

## 2026-11-15 night (Claude Code, home), #124 and #125 closed; #128 acquisition started; #132 to #135 built
- Closed #124, #125 (XP boost now off by default, debug only) and #132, #133, #134, #135 after feel tests. #131 holds the Silver leftovers.
- Ruled: #97 is a full redesign shipping with the acquisition new save; Exp Candy drops unparked; tickets pay coins (40 per x1, 400 per x10);
  rescue event first-build rulings (decisions 2026-11-15-128, -132, -133, -135). #128 split into children #132 to #143.
- Built on feature/128-acquisition: save v4 reset; gacha, slot machine and tickets removed (dead CSS and the gacha copy origin too);
  rescue event (G.Rescue, G.UberElite, generated Stage 1 data, green arrow, rescue-harness with 7 deliberate breaks caught).
- Broke and fixed: Escape on a menu screen read the removed pull overlay; a Co-Authored-By line against CLAUDE.md (dropped).
- Stopped at: #145 filed (move tooltip lacks Physical/Special/Status). Next: #136 catch phase and belt, or #145 first.

## 2026-11-15 late (Claude Code, home), #136 catch phase built
- Opened #136 with goal, done and end-goal test; Jess took every recommendation (decision 2026-11-15-136). Filed #146 (keep-or-sell list).
- Built: a won rescue leaves its Stage 1 30 s; touching it opens a BW catch screen (G.Catch, G.CatchUI); Poke Balls only, belt in the save,
  refilled each run until #137; held catches placed at the run end on the EV flag. G.Debug.catch(). Run Info "Caught this run".
- Tests: rescue-harness parts 5e and 6 (relations; two hand mutants caught), smoke-ui catch flow on a real run.
- Broke and fixed: forcing Math.random for a sure catch also made wild shinies, so the smoke counts rescue copies only.
- Stopped at: #136 in Needs Playtest (works as built; Jess polishes its UI later, with #126). Next: feel test, then #137.

## 2026-11-15 (Claude Code, home), #147 UI Library dev page
- tools/ui-library.html: fonts, working colours (B/W pairs split), SV type palette (live from G.U), pieces (real .type, .toast,
  .hud-text; the rest drawn from HUD-STYLE values), per-screen CSS variables read live and flagged when off-spec, UI-PALETTES sets.
- tools/smoke-ui-library.js: every HUD-STYLE palette hex (116) and UI-PALETTES hex (199) shown, 6 faces load, chips take .type.
  Mutation (one hex changed) fails it. Game CSS class names collided (.card, .grid), so page classes are lib- prefixed.
- Then a Components section (Jess: placeholder content is fine): the HUD kit mounted with lorem names and numbers; move
  slots rebuilt from kit parts, main menu markup copied. Smoke checks each piece draws and its images load.
- Stopped at: Jess looks it over; plan in docs/AI Outputs/Issue-155/UI Library - Slice Plan.md.

## 2026-11-16 (Claude Code, home), #136 catch screen redesign (136b) and one tooltip layer
- Built Jess's catch mockup on the HUD kit: type-rimmed panel, catch band (30 wide, one shift per catch), flee ring, three
  belts, owned grid with IV + EV tooltip, team-menu buttons, B2 cursor with arrows / Enter / 1-6; all 17 balls cut to strips.
- Playtest fixes: belt and ball sizes, the owned cursor (clipped by its scroll box), the button shape, all text in Silver on
  its pixel grid (27.1429 / 40.7143 px, read from the font file). Decided: one universal tooltip layer (decision file).
- Broke and fixed: double click died because a click rebuilt the belt (the old smoke passed it anyway); pause tooltips died
  after a catch (one remembered layer). Filed #148 (catch odds too high). #136 feel-tested and closed.
- Stopped at: next session opens #148.

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
