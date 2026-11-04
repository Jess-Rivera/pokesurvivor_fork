# Pokebox and unique Pokemon copies (plan, 2026-11-03)

Source: Jess's field list in docs/ASCII Concept Maps/pokemon-unique-copy.txt. Steps 1 and 2 are built; "Build order" has the status and "Step 3 handoff" is where to pick up. Tags follow CLAUDE.md "Requirement tags".

## Why
IVs, natures, gender and EVs belong to one copy of a Pokemon, not to a species, so the box comes first and IVs and EVs build on it.

## Rulings (Jess, 2026-11-03)
- [Approved] The player can own many copies of a species, shinies included, and can field the same species more than once on a team. Fielding is built; more than one copy needs G.Debug.addCopy until step 3.
- [Approved] A gacha pull always gives a copy. Selling happens from the box, or from the gacha results screen. Code differs: repeats pay coins and a repeat shiny re-rolls (js/systems/gacha.js).
- [Approved] Natures affect stats (mainline +10% and -10%). Code differs: not in G.Stats.
- [Approved] Gender is mainly for fun, with no combat effect.
- [Approved] The box lives on the Team screen, in place of a single unified scroll, with one tab row: Pokedex, Box 1, Box 2 and so on. A player starts with 2 boxes and can buy up to 3 more.
- [Approved] 500 copies per box, so a complete collection fits: 2 boxes hold every normal species (966), 4 also hold every shiny, and 5 hold 2500 copies.
- [Approved] Gender, height, weight, nature, ability and IVs are visible on the Team screen (Jess, 2026-11-03, replaces hiding IVs, nature and ability). Friendship and the other no-effect values stay debug-only.
- [Approved] Team screen display: gender at the end of the name on the team slot and detail window. Detail rows in this order under the hexagon: Nature, Ability, Height, Weight, then the moves box. The hexagon shows a see-through white base shape with a see-through type-colored band over it showing only the IV increase. The band draws 2 IVs as one base point, as in the stat formula. The Nature row shows only the name; what it does can go in a later in-game doc or tooltip. Each stat's number is the base in a larger font with "+iv" in a smaller font right beside it, and the stat text is a little bigger.
- [Approved] The copy structure below, including abilitySlot and the upgrades map.
- [Approved] Clean save checkpoint: only playtesters have saves and this is a huge change, so saves from before the box are not migrated. The old save is kept in the browser as a backup (localStorage ps.backup.prebox.<account>), the player starts over, and a one-button notice says why.
- [Approved] personalityValue is dropped.
- [Approved] Ability roll: 5% hidden, the rest split evenly between normal abilities.
- [Approved] startingMove is an override for a future feature: empty on every copy, and nothing can change it for now.
- [Approved] Stat order is the pokeapi and game order everywhere: HP, Atk, Def, SpA, SpD, Spe.
- [Approved] Values no screen shows yet exist in the data and can be viewed with a debug command (G.Debug.copy).

## The copy
Rolled means set once when the copy is created. Default means left out of the save until it differs.

| Field | Type | How it is set | Default | Reader today |
|---|---|---|---|---|
| pokemonUUID | UUID v4 | Created | | Team slots |
| speciesID | Dex number | From the source | | Everything |
| form | Enum | From the source | base | None until regional forms (#9) |
| originalTrainerID | UUID | The save's trainer id | This save's id | None until trading |
| nickname | Text, 16 characters, cleaned (3b-2) | Player, Team screen rename | Empty, shows the species name | Team screen |
| dateObtained | Timestamp | Created | | Debug view |
| obtainedMethod | Enum: starter, gacha, wild, rescue, debug, other | From the source | | Debug view |
| nature | pokeapi id 1 to 25 | Rolled evenly | | Team screen; stats from step 4 |
| iv | 6 integers, 0 to 31 | Rolled evenly | | Team screen; stats from step 4 |
| gender | Enum: male, female, none | Rolled from the species' real ratio | | Team screen, display only |
| heightScale | Integer, 0 to 255 | Rolled, see below | | Team screen |
| weightScale | Integer, 0 to 255 | Rolled, see below | | Team screen |
| abilitySlot | 1, 2 or 3 (hidden) | Rolled, see below | | Team screen, no effect until abilities exist |
| isShiny | Boolean | From the source | false | Sprites |
| ev | 6 integers, 252 each, 510 total | Earned | All 0 | Stats, from the EV step |
| friendship | Integer, 0 to 255 | Future feature | The species' base_happiness | None |
| startingMove | Move id | Future override | Empty, uses G.startMoveOf | Move setup |
| upgrades | Map of upgrade id to rank | Upgrade catalog | Empty | None until the catalog is wired |
| box | Box number, from the first | First box with room, or player | First box | Box tabs |
| isFavorite | Boolean | Nothing sets it yet | false | None yet |
| isLocked | Boolean | Nothing sets it yet | false | Will block selling (step 3) |

[Approved] Changes from the concept list: personalityValue is removed. `ability` becomes `abilitySlot`, and the ability's name comes from species data, so a data fix cannot leave a copy with a wrong ability. `upgradesPicked` becomes `upgrades`, a map, since the catalog has ranks I to V.

Not on a copy: level (per run), moves (bought during a run, docs/ASCII Concept Maps/Move Shop.txt), held items (run only).

### Ability roll, species in the game (966)
| Species' abilities | Species | Slot 1 | Slot 2 | Hidden |
|---|---|---|---|---|
| Two normal and a hidden | 499 | 47.5% | 47.5% | 5% |
| One normal and a hidden | 314 | 95% | | 5% |
| One normal | 153 | 100% | | |

### Gender, species in the game (966)
Female chance is pokeapi gender_rate out of 8. 140 species are genderless, 24 male only, 37 female only.

### Height and weight
[Approved] A copy has its own height and weight, for fun (Jess, 2026-11-03).
[Approved] Each copy stores two scales, rolled separately so a copy can be short and heavy. A scale is the sum of two random numbers (0 to 128 and 0 to 127), so most copies land near average and extremes are rare. Shown size = species value from pokeapi x (0.8 + 0.4 x scale / 255), so 80% to 120% of the species value. Display only: no effect on the sprite, hit circle or combat. Storing the scale keeps a species data fix from leaving a copy with a stale size.

## Worked example: Snorlax (dex 143)
Species data is real, and every stat goes through the real G.Stats formulas. The rolled and player values are hand-picked for the example. Nature is applied by hand, since it is not in the game yet.

| Field | Value | Where it came from |
|---|---|---|
| pokemonUUID | 7f3c2a9e-4b1d-4e8a-9c21-5d0e8f6a1b34 | Created |
| speciesID | 143 (Snorlax) | Gacha result |
| form | base | Default |
| originalTrainerID | This save's trainer id | Default |
| nickname | Mochi | Player |
| dateObtained | 2026-11-03 | Created |
| obtainedMethod | gacha | Source |
| nature | 11, Adamant (+Atk, -SpA) | Rolled |
| iv (HP, Atk, Def, SpA, SpD, Spe) | 28, 31, 12, 5, 22, 9 | Rolled |
| gender | male | Rolled, 87.5% male for this species |
| heightScale | 142, shows 2.15 m (species 2.1 m) | Rolled |
| weightScale | 97, shows 438.0 kg (species 460 kg) | Rolled |
| abilitySlot | 2, Thick Fat | Rolled from Immunity, Thick Fat, hidden Gluttony |
| isShiny | true | Gacha result |
| ev (HP, Atk, Def, SpA, SpD, Spe) | 180, 252, 78, 0, 0, 0 | Earned, 510 total |
| friendship | 120 | Example, base is 70 |
| startingMove | Empty | Default |
| upgrades | Damage rank 3, Maximum HP rank 2 | Example |
| isFavorite | true | Player |
| isLocked | true | Player |

Stats this copy gets at level 50 (plain means 0 IV, 0 EV, no nature):

| Stat | Base | IV | EV | Nature | Plain | This copy | Change |
|---|---|---|---|---|---|---|---|
| HP | 160 | 28 | 180 | | 440 | 512 | +16% |
| Atk | 110 | 31 | 252 | +10% | 115 | 178 | +55% |
| Def | 65 | 12 | 78 | | 70 | 85 | +21% |
| SpA | 65 | 5 | 0 | -10% | 70 | 64 | -9% |
| SpD | 110 | 22 | 0 | | 115 | 126 | +10% |
| Spe | 30 | 9 | 0 | | 35 | 39 | +11% |

Movement goes from 76.0 to 76.9 px/s, since Speed passes through the transfer curve. Upgrades would apply on top once the catalog is wired.

## Saved form
[Approved] Game code uses the full names above through one module, G.Copies. The save holds a compact form, and only G.Copies reads it: one-letter keys, defaults left out, the UUID in 22 characters, one character per IV, seconds for the date.

Fresh copy, 108 bytes:
{"u":"fzwqnksdToqcIV0Oj2obNA","d":143,"t":1793736000,"m":"g","n":11,"i":"47MFWJ","g":0,"x":142,"y":97,"a":2}

The Snorlax above, 190 bytes:
{"u":"fzwqnksdToqcIV0Oj2obNA","d":143,"t":1793736000,"m":"g","n":11,"i":"47MFWJ","g":0,"x":142,"y":97,"a":2,"s":1,"e":[180,252,78,0,0,0],"k":"Mochi","h":120,"p":{"dmg":3,"hp":2},"f":1,"l":1}

| Form | Fresh copy | 500 copies | 2500 copies |
|---|---|---|---|
| Written out in full | 304 bytes | 148 KB | 742 KB |
| Short names, full values | 171 bytes | 84 KB | 417 KB |
| Compact (built) | 108 bytes | 53 KB | 264 KB |
| Compact, no key names | 67 bytes | 33 KB | 164 KB |

No key names is smallest, but the position of every value becomes permanent, which makes adding fields riskier. Compact keeps named fields, and a new field is simply absent from old saves.

## Build order (branch feature/pokeboxes)
1. BUILT, committed, feel-tested. Copies, and a clean save checkpoint instead of migrating old saves. Keep `owned` as the Pokedex record. Team slots keep dex and shiny and gain the UUID. Debug viewers: G.Debug.copies, G.Debug.copy. Until step 3, G.Copies.fill turns new `owned` and `shiny` entries into copies; step 3 creates copies at the source and removes fill, or a sold copy would come back.
2. BUILT, committed, feel-tested. Box screen: the tab row on the Team screen (Pokedex, Box 1, Box 2, and so on), choosing a specific copy for a team slot, repeats allowed on a team, the display rulings above. Adds a `box` field to a copy (which box it sits in, default the first) and a box count to the save (2 at the start).
3. IN PROGRESS, in microsteps (Jess, 2026-11-04). 3a: copies at the source, selling, buying boxes. 3b later: lock and favorite buttons, nicknames, bulk sell.
   - 3a-1 buying boxes: BUILT 2026-11-04, awaiting Jess's node checks and feel-test. Plan map: docs/ASCII Concept Maps/Pokebox 3a-1 - Buying Boxes.txt. G.Copies.boxPrice and G.Copies.buyBox; price tabs on the Team screen tab row (js/ui/menu.js rosRenderTabs, rosBuyBox); harness section 11; mutation runner docs/proposals/pokebox-copies-mutate.js.
   - 3a-2 copies at the source: BUILT 2026-11-04, awaiting Jess's node checks and feel-test. Plan map: docs/ASCII Concept Maps/Pokebox 3a-2 - Copies at the Source.txt. G.DB.obtain (record, then one copy, every time) used by the gacha, rescues, wild shinies, the starter and debug; G.Copies.fill removed; harness sections 5, 7, 10 reworked and 12, 13 added; new docs/proposals/pokebox-sources-harness.js. Ride-along fix: G.DB.commit redraws the top bar coins.
   - 3a-2b live price tabs and ticket debug: BUILT 2026-11-04, awaiting Jess's checks and feel-test. Plan map: docs/ASCII Concept Maps/Pokebox 3a-2b - Live Price Tabs and Ticket Debug.txt. G.DB.onSave listeners run on every save write; the Team screen redraws its tab row and the Shop its current tab while open; G.Debug.tickets(n, m); harness section 14.
   - 3a-3 selling: BUILT 2026-11-04, awaiting Jess's checks and feel-test. Plan map: docs/ASCII Concept Maps/Pokebox 3a-3 - Selling.txt. G.Copies.sellPrice and G.Copies.sell (SELL_PRICE owned by copies.js, gacha REFUND points at it); Sell under Moves in the Team detail pane (js/ui/menu.js rosSellHtml, rosSell); Sell on repeat gacha cards (js/ui/gacha-ui.js sellCard); harness sections 15 and 16, sources harness section 6.
   - 3a-4 full boxes: BUILT 2026-11-04, awaiting Jess's checks and feel-test. Plan map: docs/ASCII Concept Maps/Pokebox 3a-4 - Full Boxes.txt. G.Copies.freePlaces and priceFor; add returns null when full; G.DB.obtain sells on arrival; the gacha rolls first and places by priority when short; the Shop warning; "Box full · sold" cards; run banner; G.Debug.fillBoxes. Harness sections 17 and 18, sources harness section 7. 3a is complete once Jess signs off; 3b (lock, favorite, nicknames, bulk sell) next.
   - 3b approved 2026-11-04 in three microsteps (map: docs/ASCII Concept Maps/Pokebox 3b - Lock, Favorite, Nicknames, Bulk Sell.txt), with Jess's edits to 3b-2: nickname cleaning against injection, 16 characters, and Favorites / Locked filter chips after BST.
   - 3b-1 lock and favorite: BUILT 2026-11-04, awaiting Jess's checks and feel-test. G.Copies.setLocked and setFavorite; Lock and Favorite buttons beside Sell; heart and padlock marks on box cells (new 'lock' icon in js/ui/icons.js); favorite note in the sell confirm; harness sections 19 and 19b. Next: 3b-2.
   - 3b-2 nicknames and mark filters: BUILT 2026-11-04, awaiting Jess's checks and feel-test. G.Copies.cleanNickname (font Latin set, markup characters dropped, spaces squeezed, 16 max; on typing, on save and in clean() on every load) and setNickname; inline rename in the detail header (pencil icon, new in js/ui/icons.js; Enter saves, Esc or clicking away cancels); Favorites and Locked chips after BST (dev.html #ros-marks, box tabs only, either mark when both are on). Harness sections 20 and 20b. Next: 3b-3.
   - 3b-3 bulk sell: BUILT 2026-11-04, awaiting Jess's checks and feel-test. G.Copies.sellMany (each once; team, pending, locked, favorite skipped and counted) and repeatsIn (D10, normal and shiny counted apart); G.Gacha.bulkSellable (D11). Team screen Select mode in the shown-count line (Select repeats, Clear, Sell N for X, Cancel; one confirm); "Sell repeats +N" above Continue on the results. Harness section 21, sources harness section 8. Step 3 is complete once Jess signs off; step 4 (IVs and natures apply) next.
4. BUILT 2026-11-04, checks passed and feel-tested (Jess, 2026-11-04). Stats: IVs and natures apply, the first step that changes balance. Plan map: docs/ASCII Concept Maps/Pokebox 4 - IVs and Natures Apply.txt. G.Stats.NEUTRAL_PROFILE, profile(copy), a nature argument on statValue and the four stat functions, a profile on attackFactor and applyPlayerDefense, Speed IV and nature on speedToPx; G.Player takes the profile (statProf, statIv, statNat); game.js buildFighter passes the slot uid through G.Copies.profileOf; G.Copies.setIvNature for debug. Debug: G.Debug.fighter(), G.Debug.ivs(slot, v, nature). New docs/proposals/pokebox-stats-harness.js (in check.js) and pokebox-stats-mutate.js (21 mutations).
5. BUILT 2026-11-04, checks passed and feel-tested (Jess, 2026-11-04). EVs per docs/proposals/ev-progression.md; plan map docs/ASCII Concept Maps/Pokebox 5 - EVs.txt (v3, F1 to F10). Species yields in species-traits.js (6th field); G.Copies EV_RATE, killEvs, wholeEvs, addEvs, applyEvPlan; G.Game evKill and the run banks; the end-of-run allocation screen (dev.html #scr-evs, run-ui.js showEvs); the EVs row on the Team screen; G.Debug.evbank. New pokebox-evs-harness.js and pokebox-evs-mutate.js (29 mutations). Ride-along (Jess, same day): the dead timed-boss data in js/data/enemies.js removed (BOSS_SLOTS, the bosses roll, BOSSES, bossScale).
5b. PARKED 2026-11-04 until Jess's UI mockups (Photoshop, at home); decisions G1 to G6 open: docs/ASCII Concept Maps/Pokebox 5b - EV-Lowering Berries.txt (the six mainline EV-lowering berries, bought in the Shop, used on the Team screen).

## Step 3 handoff (start here)
Give Jess a no-code plan first and wait for his OK (CLAUDE.md "Edit boundary"). Then build, test, and hand over for a feel-test.

Scope:
- Copies at the source: js/systems/gacha.js pull() (a pull always makes a copy; drop the repeat refund and the repeat-shiny re-roll), js/game.js G.onRescue and G.onShinyCaught, js/ui/test.js starter, js/core/debug.js. Use G.Copies.add. Keep writing `owned` and `shiny`, since they are the Pokedex record.
- Remove G.Copies.fill and its call in normalizeTeam, or a sold copy comes back. Every source must create its copy first. The harness sections on fill move to the new path.
- Selling: from the box, and from the gacha results screen, at the sell price below. A sold copy leaves save.box. Add a G.Copies sell function, and test it against team slots.
- Full boxes: the warning and auto-sell below. G.Copies.add currently overflows into the last box; a pull must sell the overflow instead.
- Buying boxes 3 to 5 at the prices below, raising save.boxCount (2 to 5).
- The gacha results UI (js/ui/gacha-ui.js) reads `isNew` and `refund`; check it against the new results.

Where things are:
- Compact form and rolls: js/systems/copies.js. Species data: js/data/species-traits.js, generated by tools/species_traits.js, kept current by check.js.
- Team screen: js/ui/menu.js (rosRenderTabs, rosRenderBox, fillCopyCell, rosAssign, rosPlace, rosRenderDetail). Styles: css/bw-team.css. Hexagon: js/ui/statchart.js opts.teamHex and opts.iv.
- Debug: G.Debug.copies(dex), G.Debug.copy(id), G.Debug.addCopy(dex, n, shiny).
- Harness: docs/proposals/pokebox-copies-harness.js, in check.js. Also run tools/smoke-ui.js and a file:// headless run. Skip tools/smoke-newcombat.js.

Traps found so far: run npm run format last and read check.js's format line, it only warns. Edit scripts with non-ASCII text or regexes go in a file, not a heredoc. Prettier reflows CSS and data files, so match current text.

## Rulings for step 3
- [Approved] Price of boxes 3, 4 and 5 (Jess, 2026-11-03): 10,000, 25,000, 60,000, in line with the team item slots (9,000, 23,000, 60,000). Run length for reference: early runs average 7 to 15 minutes, a full run (8 gyms and the Elite Four) about an hour.
- [Approved] Full boxes on a pull (Jess, 2026-11-03): the pull is not blocked. When the free space is less than the pull's size, warn: "You don't have enough space. Any pokemon pulled that can't be placed in a slot will be automatically sold." Whatever does not fit is sold at the sell price.
- [Approved] Sell price (Jess, 2026-11-03): the current repeat refund by rarity, 15, 30, 60, 120, 300, x3 for a shiny. Today a first copy pays nothing, so selling it is new income, about one sale per species at most.
- [Approved] Where boxes are bought (Jess, 2026-11-04): on the Team screen only, as price tabs after the owned box tabs, each one the coin icon and the price (10,000, 25,000, 60,000). Bought in order; the later ones show dimmed with a tooltip; an unaffordable next box is dimmed and its click says so; a confirm first; the purchase saves at once outside Commit and opens the new box. The Shop has no box panel. Step 3 scope (same day): 3a now (copies at the source, selling, buying boxes), lock, favorite, nicknames and bulk sell in 3b.
- [Approved] Copies at the source (Jess, 2026-11-04, 3a-2 map D1 to D7): every gacha pull, rescue, wild shiny, starter and debug grant makes one new copy through G.DB.obtain, repeats included. Gacha repeats pay nothing from 3a-2 on (selling arrives in 3a-3). A repeat gacha shiny is kept, not re-rolled. A repeat rescue or repeat wild shiny is a copy with no coins (was +150 and +300). A shiny of a species you do not own gives only the shiny copy; the Pokedex record still marks the species owned. Repeat messages are English: "<name> joined your box!", "Another shiny <name>! Added to your box.", gacha cards "To Box N". No safety net re-creates missing copies.
- [Approved] Top bar coins (Jess, 2026-11-04, D8 and D9): every save write (G.DB.commit) redraws the top bar while it shows, and the top bar reads 12,000 like the Shop.
- [Approved] Selling (Jess, 2026-11-04, 3a-3 map D1 to D6): the last copy of a species can be sold, with a "your last one" note, and the Pokedex keeps the species. A copy on the saved team or in the uncommitted team edits cannot be sold, nor a locked one. Only repeat gacha cards get a Sell button. Gacha cards sell 1 to 3 star normals in one click and confirm 4 and 5 stars and any shiny; the box always confirms. After a box sale the detail pane shows the species, not the next copy.
- [Approved] Full boxes (Jess, 2026-11-04, 3a-4 map D1 to D6): the pull warning uses the 2026-11-03 text with a count line, "Pull anyway" or "Cancel". When a pull is short of places they go to new species, then shinies, then higher rarity, then pull order; the rest are sold on arrival. A rescue or wild shiny with full boxes is sold on arrival too, coins to the saved PokeCoins. A Pokemon sold on arrival still counts in the Pokedex. G.Debug.addCopy stops at full boxes and never sells; G.Debug.fillBoxes(leave) tops boxes up.
- [Approved] Lock, favorite, nicknames, bulk sell (Jess, 2026-11-04, 3b map D1 to D12, with edits): a locked copy is never sold but still moves and goes on the team; a favorite is a mark bulk sell and "Select repeats" skip, a single sale still works; no reordering by favorite. Nicknames edit inline in the detail header, are cleaned against injection, and allow 16 characters (was 12); runs keep the species name for now. Bulk sell: a Select mode per box tab, "Select repeats" keeps one per species (team, locked, favorite, best IVs, oldest), the gacha "Sell repeats" sells 1 to 3 star normal repeats, a box batch confirms once. Favorites and Locked filter chips come after BST.
- [Approved] Select repeats counts normal and shiny copies apart (Jess, 2026-11-04, refines 3b D10): a shiny is never ticked to keep a normal copy of the same species, and a lone shiny is never a repeat.

## Rulings for step 4
- [Approved] (Jess, 2026-11-04, step 4 map D1 to D7) D1 mainline nature math: x1.1 / x0.9 on the final stat after the +5, rounded down, in whole numbers; HP never; the 5 neutral natures do nothing. D2 enemies (wild, elites, gyms, Elite Four) stay 0 IV and neutral. D3 Speed IVs and nature change movement through the transfer curve. D4 a slot with a missing or mismatched copy plays neutral, no error. D5 no Team screen change. D6 co-op stays neutral (TODO). D7 the nature is its own argument beside IV and EV, not folded into the stage and item multipliers.

## Rulings for step 5
- [Approved] (Jess, 2026-11-04) Source design docs/proposals/ev-progression.md: typed mainline yields into six run banks, whole EVs given out at the end of the run to any team copy, fractions and ungiven EVs discarded, 252 per stat and 510 per Pokemon, EVs permanent.
- [Approved] F1 rates by class: wild 1/1000, elite 1/500, gym 1x, shiny x2 of its class; TUNE before playtesters. F2 the class reads the gym and elite flags; golden and thief units are wild; there are no non-gym bosses; the Elite Four will use the gym rate when built. F3 allocation after the run-over screen on a death and a quit; debug runs still allocate. F4 the run's team copies only, fainted included. F5 one confirm before discarding. F6 any stat up to 252, any Pokemon up to 510 total. F7 EVs apply to all six stats, enemies stay at 0. F8 EV-lowering items are step 5b. F9 the sell confirm warns; Select repeats keeps most EVs before best IVs. F10 a run with no whole EVs skips the screen with one line.

## Open for later steps
- [Closed 2026-11-04 by the step 5 rulings] EV spending, earning, fill rate and Speed. Recommendations made to Jess: kills earn points by real yield and the player spends them on the Team screen with free refunds; only the Pokemon on the field earns, banked at run end, dead or not; a single tuning number aiming for about 8 to 10 full runs to reach 510; keep the plain Speed curve and show the real px/s gain, since at the 0.7x to 1.3x bounds fast species gain nothing from Speed investment.
- [Open] A tooltip or in-game doc for natures and IVs. Accurate wording: at level 100, each IV adds 1 to the stat and each base point adds 2.

## Deferred hooks (cloud and multiplayer phase)
Cloud save merge must union copies by UUID: until it does, merging two versions keeps only the newer box. The clean save checkpoint runs on local saves only: a pre-box cloud save would keep its progress and get freshly rolled copies, so decide what it should do when the cloud phase starts. Co-op reads species only. A Firestore document is limited to 1 MB, so check the save size against it if saves move to the cloud.
