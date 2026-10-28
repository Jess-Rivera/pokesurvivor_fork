# GDD, PokeSurvivor . Mystery Dungeon

- **Role:** Living umbrella for the game: short summaries and pointers. Where a subsystem spec covers a topic, the subsystem spec wins (QA-02).
- **Owns:** Game concept, screen flow, world, enemies summary, items, economy and meta summaries.
- **Does not own:** Combat math, status effects and stat stages (docs/COMBAT-RULES.md); move data grammar (docs/MOVE-AXIS-SCHEMA.md); move runtime (docs/current feature planning/combat-architecture.md); per-move rulings (docs/MOVE-INTENT.md); run progression, gyms, elites and loops (BOSS-REWORK.md); tuned numbers (BALANCE.md); decision history (DECISIONS.md).
- **Status home:** STATE.md.
- **Last reconciled:** 2026-10-28 (Phase 4 B6a, bounded read of S-13, S-14, S-15 and D-07 against code; rulings at CP5)

> Living design document. It summarizes the **current** game and points to the subsystem
> specs, which win on details. Tags (`[Approved]`, `[Legacy behavior]`, `[Proposed]`, `[Open]`)
> are defined in CLAUDE.md. Lines labelled "current behavior" describe what the code does
> today and carry no tag; "placeholder behavior" is live but due to be redesigned. Numbers
> read "current value: see <file>"; the file wins. The old decision log is history (docs/DECISIONS-archive.md).

## Where the details live

| Subject | Owner |
|---|---|
| Stats, HP, damage, type chart, statuses, DoT, stat stages, swap rule | docs/COMBAT-RULES.md |
| Move data grammar and fields | docs/MOVE-AXIS-SCHEMA.md |
| Move runtime (how moves execute) | docs/current feature planning/combat-architecture.md |
| Per-move rulings | docs/MOVE-INTENT.md |
| Run progression: level curve, elites, Density Bonus, gyms, badges, Elite Four, end of region, loops | BOSS-REWORK.md |
| Gym rosters | docs/GYM-ROSTERS.md |
| Tuned numbers | BALANCE.md and the js/data files named below |
| Open work and status | STATE.md, TODO.md and the PokeSwarm board |

## 1. Concept

Current behavior.

- **Platform:** browser. It opens by double-clicking `index.html`, no server.
- **Genre:** bullet-heaven / horde survival + **roguelike** + **character gacha**.
- **References:** Survivor.io, Megabonk, Vampire Survivors.
- **Aesthetic:** **Pokemon Mystery Dungeon** (PMD sprites, blue dialog
  boxes, pixel-art icons, village music).
- **The player is a Pokemon.** There are **966 Pokemon** from the 9 generations.
- **Everything is local:** sprites, data, font, music and save. The game makes
  no internet request.

## 2. Screen flow

Current behavior (main menu from dev.html).

```
Login / Create account / Guest
        |
        +- (first time) Personality test --> Assigned companion
        |                                          +- Let's go together!
        |                                          +- Choose another (29 starters)
        v
Main menu  (the world in the background, with wild Pokemon strolling)
   +- Play       -> region select -> run -> summary (+ Poke-coins, shinies, tickets) -> menu
   +- Team       -> fullscreen party editor
   +- Inventory  -> team item loadout for the next run
   +- Upgrades   -> permanent per-Pokemon upgrades (placeholder, section 7.2)
   +- Shop       -> Pokemon (gacha) | Team Items | Team Upgrades
   +- Missions   -> quests, achievements and profile
   +- Friends    -> co-op (deferred, cloud phase)
   +- Ranking    -> time survived (deferred, cloud phase)
   +- Settings   -> sound, graphics, controls, account
```

- **Region select** `[Approved]` (built): Play offers Gen 1 to 9 plus Random. The run's pool is the chosen generation and every earlier one (Kanto = gen 1 only; Paldea = the full dex, so there is no separate All card). Free pick, no unlock gate. Per run only, not saved.
- **In a run:** the pause screen is the team summary sheet (portrait strip, stats hexagon with stat-card bonuses, moves with their upgrade stacks, held item). Level-up cards that target a Pokemon or a move open the same sheet in choose mode. `[Approved]` (slices 2d-1, 2d-2)
- The separate "Pokemon" menu entry was removed (redundant with Team).

### 2.1 Accounts
Current behavior.
- Log in, create an account or **play as a guest** (nothing is saved).
- Provisional in `localStorage` behind `js/core/db.js`. Passwords with salt +
  SHA-256, but it is local: not real security.
- The session is remembered when you reopen the game.
- Cloud accounts and cloud saves are deferred to the cloud phase.

### 2.2 Personality test
Current behavior.
- 8 Mystery Dungeon style questions; each answer adds trait points.
- The dominant trait decides the companion among the **29 starters**: starters
  from the 9 generations + Psyduck + Slowpoke. You can refuse and choose another.

### 2.3 Co-op multiplayer (deferred, cloud phase)
Upstream co-op for up to 4 friends (host-run game, shared experience, revive a downed teammate) exists in js/net/ but is out of scope until the cloud phase. Not exercised against the fork's newer systems. History: docs/DECISIONS-archive.md, "GDD decision log".

### 2.4 Ranking (deferred, cloud phase)
Upstream time-survived ranking (Solo / Group, daily to all-time, friends, by Pokemon). Out of scope until the cloud phase.

## 3. Combat

Summary only. Combat rules: docs/COMBAT-RULES.md. Moves: docs/MOVE-AXIS-SCHEMA.md (data), combat-architecture (runtime), docs/MOVE-INTENT.md (per-move rulings).

- The Pokemon **attacks on its own** with its moves; the team swaps Pokemon in and out (swap rule: COMBAT-RULES).
- Each attack plays the corresponding **PMD animation**: `Attack`, `Shoot` or `Charge`.
- **Targeting** (current behavior): whatever is touching you > the boss if in range > the nearest
  enemy > (no enemies) the nearest rock or chest.
- Moves have no level; they grow through level-up upgrade cards (section 7.4). Move catalog: current value, see js/data/moves.js.
- Controls: current defaults in Settings > Controls (compact and full-keyboard presets).

## 4. World

Current behavior. Open, infinite arena, generated with deterministic noise and painted in pixel
art from code (16 px per tile, x2).

| Element | Effect |
|---|---|
| Rock formations | Block walkers and projectiles |
| Water | Slows (x0.6 player, x0.55 enemies) |
| Lava (volcano biome) | Burns whoever steps on it, you can lure enemies in |
| Trees / crystals | Block; give cover against enemy shots |
| Rocks | Break; drop XP, coins or berries |
| Chests | Break; good coin loot |
| Tall grass | Cut by any attack; sometimes drops something |
| **Power altar** | On touch, 25 s of Fury (damage x2), Thunder (+45% speed), Magnet (x4) or Haste (-40% cooldown); then it goes out |
| **Spring** | Heals while you are on it; it runs out and recharges on its own in ~45 s |
| **Locked chest** | Stay 3.5 s next to it (even if attacked): coins, 1-3 tickets (15% an x10) and experience to level up once |
| **Traps** | Poison, sticky (slows you) or explosive; they trigger when stepped on, by enemies too |
| **Gym gate** | Opens on the map on the gym schedule and takes you to the leader's type arena (BOSS-REWORK section 3) |

- **Fliers, ghosts and bosses** ignore the terrain.
- **3 biomes** that rotate every 4 minutes, each with its own music:
  Shadow Forest, Crystal Cave, Ash Volcano. The change is a **2.6 s fade**
  between the old palette and the new one (ground and objects).
- **Removed:** random legendary rifts (rift.js RANDOM_RIFTS false) and Arceus's Judgment at 30:00 (judgment.js ENABLED false). Gym gates reuse the rift flow and arenas. BOSS-REWORK section 1; code cleanup in its section 5.
- Mid-game events (horde of one type, golden hour, lost Pokemon) and treasure imps (Meowth, Gholdengo): current behavior, see js/systems/events.js.

### 4.0 Type arenas (one per type)
Current behavior. Built for the old rifts, now used by gym gates (the leader fights in the arena of the gym's type). Each
arena has its own palette, decoration, terrain and weather, and plays its own
theme. The opponent collides with walls and columns like you and cannot
leave the circle.

| Type | Arena | Terrain | Weather |
|---|---|---|---|
| Normal | Eternal Meadow | columns | - |
| Fire | Igneous Volcano | lava rivers (burn) | sun |
| Water | Sea Grotto | puddles (slow) | rain |
| Grass | Emerald Jungle | swamp (slows a lot), trees | - |
| Electric | Volt Plant | puddles with discharge | rain |
| Ice | Eternal Glacier | ice sheets (you slip) | snow |
| Fighting | Ancestral Dojo | many columns | - |
| Poison | Toxic Swamp | poison puddles | - |
| Ground | Red Desert | quicksand | sandstorm |
| Flying | Celestial Peak | cloud-trees | - |
| Psychic | Mental Temple | pink crystals, columns | - |
| Bug | Hive Forest | swamp, lots of grass | - |
| Rock | Ancient Quarry | many columns and rocks | sandstorm |
| Ghost | Shadowy Cemetery | dead trees | fog |
| Dragon | Dragon Sanctuary | draconic flames (burn) | - |
| Dark | Dark Alley | columns | - |
| Steel | Steel Fortress | many columns | - |
| Fairy | Enchanted Forest | pink trees, fountains | - |

Terrain immunities: Fire to lava, Poison/Steel to poison,
Electric/Ground to the discharge, Ice to ice. The arena's owner does not suffer its own arena.
Arena visuals per gym type are still `[Open]` (BOSS-REWORK section 3).

### 4.1 Weather (rare event)
Current behavior. From minute 2, each minute there is an 18% chance weather arrives (~1 minute):

| Weather | Effect |
|---|---|
| Scorching sun | Fire x1.5 . Water x0.5 |
| Rain | Water x1.5 . Electric x1.2 . Fire x0.5 |
| Sandstorm | Rock, Ground and Steel x1.3; the rest lose 1.2% health every 2 s (never a KO) |
| Snowfall | Ice x1.5; the rest lose health likewise and move 10% slower |
| Fog | Ghost, Fairy and Psychic x1.3; the vignette closes in a bit |

It affects everyone (you and the enemies). Each biome prefers certain weather.
The visuals are soft: a light tint and few pixel particles.

### 4.2 Type chart
Owned by docs/COMBAT-RULES.md, "Type chart" (the softened chart is live; the canonical chart is on hold).

## 5. Enemies

Summary. Tuned numbers: BALANCE.md and js/data/enemies.js. Enemy level curve, opening HP discount, elites and the Density Bonus: BOSS-REWORK.md sections 1 and 2. Statuses enemies inflict: docs/COMBAT-RULES.md.

- **Pool** `[Approved]`: wild Pokemon come from the run's region pool (the chosen generation and every earlier one, section 2).
- **Cast** `[Approved]`: six tiers by base stat total. Each run draws a cast of 9 species per tier: 1-2 support, 3-5 melee, 3-5 range (usually 1 / 4 / 4). From tier 2 on, at least one melee slot is a Charger, Jumper or Bomber and at least one range slot is a Beamer, Zoner or Fan; tier 1 stays plain (ease-in). Current value: see js/data/enemies.js (TIERS, rollRun).
- **Families and classes** `[Approved]`: one class per species, from a generated table (js/data/enemy-classes.js, built by tools/classify_species.py plus Jess's hand overrides).
  - Order: confident support evidence makes a Support; otherwise the stats set the family (Atk >= SpA is Melee, SpA > Atk is Range); evidence then picks the class inside the family, else the family default.
  - SUPPORT: Healer, Shielder, Summoner, Status. MELEE: Plain (default), Charger, Jumper, Bomber. RANGE: Shooter (default), Beamer, Zoner, Fan.
  - Delivery follows the family, so contact vs ranged is tied to the higher stat. The one exception is the Bomber, picked on evidence regardless of stats (Electrode has SpA > Atk but still runs at you). This answers the 2026-10-17 "STILL OPEN" delivery question (CP5-6).
  - Modifiers, not classes: Tank (high HP, low Speed; damage x1.2, XP x1.3) and Flanker (the fastest Plain and the fastest Shooter of each tier's cast, never a Tank; at most 2 act as flankers at once). Current value: see js/data/enemies.js (FLANK).
- **Speed** `[Approved]`: fixed species identity from the real base Speed, on the same scale as the player, with no in-run time ramp. Difficulty comes from HP, damage and density, not creeping speed.
- **AI principle** `[Approved]`: "Enemy AI stays simple and readable (survivor-like reference): no dodging, no group tactics. Identity comes from WHERE a class stands and what it telegraphs."
  - Ranged and support classes hold a per-class distance band measured on screen; they approach at full speed and retreat slower, so you can chase them down. Ability gates follow the band. Current value: see js/data/enemies.js (BANDS).
  - Warned attacks (charger beam, zones, beams, kamikaze, jumps) are shown on the ground beforehand.
- **Status carriers** `[Approved]`: Status-class species carry one hand-authored status. Only 2 primary carriers are active at a time (haste exempt); inactive ones act as plain chasers. A secondary Status rides on another class at half duration. Current value: see js/data/enemies.js (CARRIER, CARRIER_OF).
- **Ditto** `[Approved]`: a summoner whose minions are random melee or range members of the cast drawn for its tier or an earlier one, never support or bomber (as built, CP5-4).
- **Spawning** `[Approved]`: spawn weight is by family, not species count (current value: see js/data/enemies.js FAMILY_SHARE). A draw that would add a band-holder is re-drawn when band-holders are already a set share of the units alive (current value: see HOLDER_CAP).
- **Spawning** (current behavior): wild cap (current value: see js/systems/spawner.js CAP); tides every ~45 s, none while an elite is alive.
- **Pathfinding** (current behavior): distance field (BFS) around each player; the walkers go
  around rocks, walls and dangerous puddles. Only those that **float in their
  sprite** fly over (`hv` in sprites-meta, tools/hover_flags.py):
  Rowlet or Pidgey walk even though they are Fliers; Gastly or Zubat float.
- **Removed:** the five timed bosses (3, 6, 9, 12, 15 min), random legendary rifts and Arceus's Judgment. Elites and gyms replace them (BOSS-REWORK section 1). BOSS_SLOTS is still rolled in enemies.js but never spawned (cleanup: BOSS-REWORK section 5).

## 6. Shinies

Current behavior.

- **Wild:** each enemy has a **1/4096** chance of being shiny (bosses too).
  It sparkles, has double health, gives x5 experience, does not vanish even if you
  move away, and an arrow at the edge of the screen tells you where it is.
  **If you beat it, you keep it** (and the normal version if you did not have it). If you
  already had that shiny, +300 coins.
- **Gacha:** 1 in every 100 pulls is shiny. A repeated shiny = triple coins.
- **Collection:** on the card of a Pokemon whose shiny you have there is a
  **Normal / Shiny** selector; you choose a companion in the version you want.
- 958 of the 966 Pokemon have an authentic shiny sprite from SpriteCollab.
- Shiny tiers from loops and legendaries: `[Proposed]`, section 12.

## 7. Progression

In-run progression (level curve, gyms, badges, elites, Elite Four, end of region, loops): BOSS-REWORK.md. This section covers the economy, items and upgrades.

### 7.1 Poke-coins
Current behavior. On finishing a run: `time/5 + defeated/4 + 80 per boss + coins collected`,
multiplied by the Fortune upgrade. "Per boss" now counts overworld elites and gym leaders. New account: 500 as a gift.
Coins buy the permanent upgrades and the Shop's Team Items and Team Upgrades tabs; the gacha runs on tickets.

### 7.2 Permanent upgrades, per Pokemon
Placeholder behavior (CP5-8). The upstream Upgrades menu is live with 13 per-Pokemon upgrades: Vitality, Strength, Stride, Reflexes, Carapace, Synthesis, Magnet, Wisdom, Fortune, Repertoire (start with 2 moves), Critical Hit, Card Reroll and Veto (block a move from the cards). Each Pokemon has its own and they only count when you play with it. Current value: see js/data/upgrades.js. The meta-progression redesign is deferred to its own branch (DECISIONS-archive 2026-10-18 Upgrade rework).

### 7.3 Items
`[Approved]` Three tiers, split by where the item lives and how it reaches the player (2026-10-20, Jess decided). Catalog and numbers: current value, see js/data/items.js and js/data/ground-items.js.

- **Ground items** `[Approved]`: activate on contact, never stored. X stat items, medicine berries, type-guard berries, pinch berries and drop-chance berries. The same item renews its timer; different items stack.
- **Berry bag** `[Approved]`: status berries auto-consume to negate the matching status. One team-wide slot at the start, up to 4. Lum covers the six main statuses and is spent last. A full bag leaves the pickup on the ground.
- **Pokemon items** `[Approved]`: each Pokemon holds ONE. A found item goes to the active Pokemon (swap prompt if it already holds one). Held effects work only while the holder is the active Pokemon. Items move between teammates on the pause team sheet.
- **Team items** `[Approved]` (player-facing name for the run tier): run-long items shared by the whole team.
  - Slots: 1 at the start, up to 4, bought in order in the Shop (Team Upgrades tab).
  - Unlock: picking one up in a run unlocks it for good, even if you leave it. Every account starts with Lucky Egg and Amulet Coin unlocked.
  - Loadout: chosen per slot on the Inventory screen and equipped at run start; in-run finds then open the chooser.
  - Stones `[Approved]` (CP5-3): one Power Stone per type. Your attacks of that type ignore enemy resistance AND immunity. Only one Stone at a time; a Stone found while holding a Stone always opens the chooser and can only replace the held Stone.
  - Sharp Scissors and Brass Knuckles `[Approved]` (as built, CP5-1): speed (Scissors) or damage (Knuckles) scales with lost team HP, from 1.0x at full team HP up to 2.0x at a low team-HP floor. They need a roster of 3 or more. Current value: see js/data/items.js (teamHpMul, HP_SCALE_MIN, HP_TEAM_MIN).
  - Snowball Badge, Re-Do, Pikachu's Tear `[Approved]` (as built, CP5-2): Snowball Badge adds damage for the total HP of everything slain; Re-Do revives the whole team once per run when the last Pokemon faints; Pikachu's Tear boosts damage and speed for each fainted teammate.
  - Round Glasses `[Approved]`: crit chance may exceed 100%; a crit on a move over 100% re-casts it 0.2 s later for free with the chance reduced by 100 points. Code differs, see TODO (not built).
- **Drop sources** `[Approved]`: ground items from wild kills (a small extra roll), chests and elites (a guaranteed Oran Berry plus one roll). Pokemon items from chests, elites (a 50% roll) and the gym leader's guaranteed item. Team items from a small chance on the gym leader's item (placeholder) and the Shop. Current value: see js/data/items.js (RUN_CHANCE) and js/systems/elites.js.
- **Shop** `[Approved]`: tabs Pokemon (the gacha, section 7.6) | Team Items (every team item not yet unlocked, flat price) | Team Upgrades (slots 2 to 4). Purchases use the in-game confirm dialog. Prices: current value, see js/data/items.js (TEAM_ITEM_PRICE, SLOT_PRICES). Berry bag slots are not in the Shop yet.

### 7.4 Level-up and in-run upgrades
`[Approved]` (upgrade rework slices 1 to 2d-2, 2026-10-18). Move-path card rules for the new move system: combat-architecture D4.

- On leveling up: **1 of 3 cards**, drawn by family first (new move, DPS, Coverage, Utility, Stats), then a card inside the family, so catalogue size does not skew the odds. Weights: current value, see js/systems/levelup.js (FAMILY_W). Only cards with a legal target on the team are offered.
- **Moves have no level**; they hold any number of upgrades. Unlimited upgrades are the point: a framerate collapse at END GAME from a stacked build is intended, a collapse in a normal-length game is not.
- **Mechanic cards** are move-specific: card, then an eligible Pokemon (any team member, fainted included), then an eligible move. A card whose ceiling is already reached is ineligible (dimmed). Rate mechanics are additive "increased rate".
- **Stat cards** (HP Up, Protein, Iron, Calcium, Zinc, Carbos): per Pokemon, percentage only. **Scoped cards** (one type or one damage kind): applied to one chosen move. All "increased damage" sources sum in one additive pool. Steps: current value, see js/data/mechanics.js and js/data/kinds.js.
- **Removed:** move evolutions, the nine old stat cards and the utility cards (cooldown, regen, pickup radius, XP, heal).
- **Bond** `[Open]`: Bond = Slot Compression + Synergy; synergy rules, bond count per run and BOND_MAX are open. See TODO (Bond rework) and the board.

### 7.5 Gacha tickets: Pokeballs and Master Balls
- `[Approved]` The x1 ticket is shown as a Great Ball labelled "Pokeball"; the x10 ticket as a Master Ball labelled "Master Ball". Code and save names (`ticket`, `ticket10`, `t1`, `t10`) are unchanged.
- **Pokeball sources** (current behavior): each defeated wild Pokemon (current value: see js/entities/pickup.js TICKET_RATE), locked chests (1-3), the lost-Pokemon event, daily missions.
- **Master Ball sources** (current behavior, D-07, from code 2026-10-28): locked chests (15%), the Gholdengo treasure imp (1 in 4 imps), weekly missions (kills; bosses, where elites and gym leaders count; survival time; dailies done) and achievements. Gym leaders and elites drop none. Dormant: the old boss drop and rift legendary drop have no live path, and the weekly "rift" mission and the "Judgment" achievement cannot be completed (see TODO).

### 7.6 Gacha, one banner per region
Current behavior. Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar and Paldea, each with
**its own Pokemon, its 3 featured and its own pity**.

| Rarity | Prob. | Repeat returns |
|---|---|---|
| Common | 45% | 15 |
| Uncommon | 30% | 30 |
| Rare | 17% | 60 |
| Epic | 6.5% | 120 |
| Legendary | 1.5% | 300 |
| *Shiny* | *1% (any rarity)* | *x3* |

- x1 pull: 1 ticket . x10: **10 normal tickets or 1 x10 ticket** (two buttons,
  you choose what to pay with), with **at least one Epic** guaranteed. Repeats
  keep giving coins.
- **Animation: pixel-art slot machine** (lever, 3 reels, bulbs). The symbols
  are the rarity: Poke, Great, Ultra, Luxury and Master Ball (Legendary) and
  the red star (shiny); with Epic or better the last reel makes you wait. The
  x10 is 10 quick pulls that drop to the tray. Click = speed up.
- **Pity:** at 70 pulls with no Legendary in a banner, the next one is.
- Some regions have nearly empty rarities (Galar only has 4 Uncommons);
  if a rarity has no Pokemon in that banner, the nearest one shows up.

### 7.7 Quests, achievements and profile
Current behavior.
- **3 daily + 2 weekly** (prize in tickets and coins); one daily can be
  rerolled per day. The same quests on any computer (seed per account).
- **Achievements** with a medal (bronze, silver, gold), prize and sometimes a
  **title**.
- **Public profile** (from the ranking or the friends list): 3 favorites,
  title, best records and the 8 best medals.

## 8. Music and sound

Current behavior. Composed for the game and played by a Web Audio synthesizer (flute, marimba,
plucked guitar, bass, pad, lead and drums, with reverb). Zero files.

| Theme | Where | Style |
|---|---|---|
| Village | Menus | F major, 100 bpm with swing, flute and marimba |
| Forest | Run (forest) | Adventurous D minor, 122 bpm |
| Cave | Run (cave) | Mysterious A minor, 92 bpm, little bells |
| Volcano | Run (volcano) | Tense E phrygian, 132 bpm |
| Boss | Boss fight | Intense E minor, 150 bpm |

- Effects for buttons, each attack family (with a tone by type),
  hits, downs, experience (rises in pitch on a streak), coins, level, boss,
  shiny, breaks, gacha (drop, shakes, burst by rarity).
- Music and effects volume and a mute button in the top bar; it is remembered in the browser.
- Measured: the 5 themes on par (RMS 0.075-0.09), no clipping even with boss + combat.

## 9. Interface

Current behavior.

- **No emojis.** Pixel-art icons drawn in code (`js/ui/icons.js`):
  each move carries the **emblem of its type** (18) + a **badge of its
  family**; plus heart, glove, boot, clock, shield, sprout, magnet, book,
  coin, cards, berry, bomb, star, shiny sparkle, crown, Poke Ball...
- Menu and item icons also come from the PokeSprite atlas ('ps:' ids).
- Always at integer multiples of their resolution, so the pixel stays crisp.
- New user-facing text is authored in English; inherited Spanish strings are translated at runtime (CLAUDE.md).

## 10. Technical

Current behavior. Architecture: ONBOARDING.md.

- Vanilla HTML + CSS + JavaScript on Canvas 2D. No dependencies.
- **Sprites:** [SpriteCollab](https://github.com/PMDCollab/SpriteCollab), 966
  Pokemon x 7 animations x 8 directions, normal and shiny, in `assets/pokemon/`
  (76 MB, PNG with a lossless palette). **CC BY-NC 4.0: non-commercial use and
  attribution** (114 artists in `CREDITS.md`).
- **Data:** stats and names in Spanish downloaded **once** from PokeAPI.
- **Font:** Pixelify Sans (OFL).
- The generated files are rebuilt with the scripts in `tools/`.

## 11. Pending

Open work is tracked in STATE.md, TODO.md and the PokeSwarm board, not here.

## 12. Meta and endgame (approved, not built)

Recorded from QA-08 (2026-10-28) and Q9 to Q11. Every `[Approved]` line is approved, not built (code differs, see TODO: none of it exists). The loop rules it builds on (six loops per region, Return Home, Next Region, Unlock Safeties, Keep Going) are owned by BOSS-REWORK.md section 4a.

- **Legendary Boss** `[Approved]`: once a player beats the final Post Gym Boss on Loop 6 AND has completed every earlier loop in the same run (no return to the main menu), they are offered a Legendary Boss: a unique arena against a Legendary Pokemon of the region. Win: that Legendary is added to the player's Pokedex as a selection for future teams. Lose: back to the main menu with the Loop 6 completion bonus.
- **The Climb** `[Approved]`: defeating every region's Legendary Boss tells the player "Arceus awaits" and unlocks The Climb, a playthrough of every region through all 6 loops on a single team. The team is locked in once chosen; changing any member erases all Climb progress. A completion point is earned for each region cleared from Loop 1 through Loop 6.
- **Arceus** `[Approved]` (Q10): the 9th completion point of The Climb teleports the player to the Arceus arena for a unique hand-authored encounter. This replaces the earlier gate "own every legendary" (docs/FULL-GAME-STRUCT.md, history).
- **Descendant Mutation** `[Approved]` (Q9): beating Arceus awards a Descendant Mutation: your mon's moves and typing go to another mon (a Pokemon not on the team). That unique copy keeps them for later runs. This reverses the earlier inheritor graft (docs/FULL-GAME-STRUCT.md, history).
- **Other endgame items** `[Proposed]` (Q11, from docs/FULL-GAME-STRUCT.md):
  - Shiny tiers: beating all six loops, and separately sweeping all of a region's legendaries, each unlock a universal shiny palette-and-effect tier per region.
  - Gold-toll re-challenge: re-challenging a legendary costs an expensive gold toll (balancing deferred).
  - Uber modifiers: Arceus unlocks Uber-tier difficulty modifiers above the base skull-style modifiers (content to be brainstormed).
  - Per-region legendary counts: Kanto and Johto five each, Hoenn eight, Sinnoh and Unova nine each, Kalos three, Alola, Galar and Paldea eleven each.
  - One-sitting achievement: a separate achievement for clearing all six loops in one sitting.

---

## Decision log

The upstream decision log (2026-10-07 to 2026-10-10) is history and lives in docs/DECISIONS-archive.md under "GDD decision log". Current decisions: DECISIONS.md.
