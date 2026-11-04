# Pokebox and unique Pokemon copies (plan, 2026-11-03)

Source: Jess's field list in docs/ASCII Concept Maps/pokemon-unique-copy.txt. Nothing here is built. Tags follow CLAUDE.md "Requirement tags".

## Why
IVs, natures, gender and EVs belong to one copy of a Pokemon, not to a species, so the box comes first and IVs and EVs build on it.

## Rulings (Jess, 2026-11-03)
- [Approved] The player can own many copies of a species, shinies included, and can field the same species more than once on a team. Code differs: normalizeTeam in js/core/db.js removes repeats.
- [Approved] A gacha pull always gives a copy. Selling happens from the box, or from the gacha results screen. Code differs: repeats pay coins and a repeat shiny re-rolls (js/systems/gacha.js).
- [Approved] Natures affect stats (mainline +10% and -10%). Code differs: not in G.Stats.
- [Approved] Gender is mainly for fun, with no combat effect.
- [Approved] The box lives on the Team screen, in place of a single unified scroll, with one tab row: Pokedex, Box 1, Box 2 and so on. A player starts with 2 boxes and can buy up to 3 more.
- [Approved] 500 copies per box, so a complete collection fits: 2 boxes hold every normal species (966), 4 also hold every shiny, and 5 hold 2500 copies.
- [Approved] Gender, height, weight, nature, ability and IVs are visible on the Team screen (Jess, 2026-11-03, replaces hiding IVs, nature and ability). Friendship and the other no-effect values stay debug-only.
- [Approved] Team screen display: gender at the end of the name on the team slot and detail window. Detail rows in this order under the hexagon: Nature, Ability, Height, Weight, then the moves box. The hexagon shows a see-through white base shape with a type-colored band over it showing only the IV increase. The band draws one IV as one base point, a simplification: in the formula a base point counts double at every level. Each stat's number is the base in a larger font with "+iv" in a smaller font right beside it, and the stat text is a little bigger.
- [Approved] The copy structure below, including abilitySlot and the upgrades map.
- [Approved] Clean save checkpoint: only playtesters have saves and this is a huge change, so saves from before the box are not migrated. The old save is kept in the browser as a backup (localStorage ps.backup.prebox.<account>), the player starts over, and a one-button notice says why.
- [Approved] personalityValue is dropped.
- [Approved] Ability roll: 5% hidden, the rest split evenly between normal abilities.
- [Approved] startingMove is an override for a future feature: empty on every copy, and nothing can change it for now.
- [Approved] Stat order is the pokeapi and game order everywhere: HP, Atk, Def, SpA, SpD, Spe.
- [Approved] Values with no effect yet exist in the data and can be viewed with a debug command. Players do not see them yet.

## The copy
Rolled means set once when the copy is created. Default means left out of the save until it differs.

| Field | Type | How it is set | Default | Reader today |
|---|---|---|---|---|
| pokemonUUID | UUID v4 | Created | | Team slots |
| speciesID | Dex number | From the source | | Everything |
| form | Enum | From the source | base | None until regional forms (#9) |
| originalTrainerID | UUID | The save's trainer id | This save's id | None until trading |
| nickname | Text | Player | Empty, shows the species name | Box |
| dateObtained | Timestamp | Created | | Box |
| obtainedMethod | Enum: starter, gacha, wild, rescue, debug | From the source | | Box |
| nature | pokeapi id 1 to 25 | Rolled evenly | | Stats, from the stats step |
| iv | 6 integers, 0 to 31 | Rolled evenly | | Stats, from the stats step |
| gender | Enum: male, female, none | Rolled from the species' real ratio | | Display only |
| heightScale | Integer, 0 to 255 | Rolled, see below | | Debug view until decided |
| weightScale | Integer, 0 to 255 | Rolled, see below | | Debug view until decided |
| abilitySlot | 1, 2 or 3 (hidden) | Rolled, see below | | None until abilities exist |
| isShiny | Boolean | From the source | false | Sprites |
| ev | 6 integers, 252 each, 510 total | Earned | All 0 | Stats, from the EV step |
| friendship | Integer, 0 to 255 | Future feature | The species' base_happiness | None |
| startingMove | Move id | Future override | Empty, uses G.startMoveOf | Move setup |
| upgrades | Map of upgrade id to rank | Upgrade catalog | Empty | None until the catalog is wired |
| box | Box number, from the first | First box with room, or player | First box | Box tabs |
| isFavorite | Boolean | Player | false | Box sort and filter |
| isLocked | Boolean | Player | false | Blocks selling |

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
| Compact (proposed) | 108 bytes | 53 KB | 264 KB |
| Compact, no key names | 67 bytes | 33 KB | 164 KB |

No key names is smallest, but the position of every value becomes permanent, which makes adding fields riskier. Compact keeps named fields, and a new field is simply absent from old saves.

## Build order (branch feature/pokeboxes)
1. BUILT, awaiting feel-test. Copies, and a clean save checkpoint instead of migrating old saves. Keep `owned` as the Pokedex record. Team slots keep dex and shiny and gain the UUID. Debug viewers: G.Debug.copies, G.Debug.copy. Until step 3, G.Copies.fill turns new `owned` and `shiny` entries into copies; step 3 creates copies at the source and removes fill, or a sold copy would come back.
2. BUILT, awaiting feel-test. Box screen: the tab row on the Team screen (Pokedex, Box 1, Box 2, and so on), choosing a specific copy for a team slot, repeats allowed on a team, the display rulings above. Adds a `box` field to a copy (which box it sits in, default the first) and a box count to the save (2 at the start).
3. New copies from gacha, rescues, wild shinies and starters; selling; buying boxes.
4. Stats: IVs and natures apply. First step that changes balance.
5. EVs (docs/SPEED-IVEV-SLICE.md numbers need redoing with the 0.7x to 1.3x speed bounds).

## Open
- [Open] Price of boxes 3, 4 and 5.
- [Open] What a pull does when the boxes are full. An x10 pull needs 10 free spaces.
- [Open] Sell price. Proposed: the current repeat refund by rarity, x3 for a shiny. Today a first copy pays nothing, so selling it is new income, about one sale per species at most.
- [Open] EV spending, earning, fill rate and Speed: see the IV and EV plan questions, to settle at step 5.

## Deferred hooks (cloud and multiplayer phase)
Cloud save merge must union copies by UUID: until it does, merging two versions keeps only the newer box. The clean save checkpoint runs on local saves only: a pre-box cloud save would keep its progress and get freshly rolled copies, so decide what it should do when the cloud phase starts. Co-op reads species only. A Firestore document is limited to 1 MB, so check the save size against it if saves move to the cloud.
