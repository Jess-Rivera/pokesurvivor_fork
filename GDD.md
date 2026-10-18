# GDD, PokeSurvivor . Mystery Dungeon

> Living design document. It reflects the **current** state of the game; at the end there is
> a dated decision log.

## 1. Concept

- **Platform:** browser. It opens by double-clicking `index.html`, no server.
- **Genre:** bullet-heaven / horde survival + **roguelike** + **character gacha**.
- **References:** Survivor.io, Megabonk, Vampire Survivors.
- **Aesthetic:** **Pokemon Mystery Dungeon** (PMD sprites, blue dialog
  boxes, pixel-art icons, village music).
- **The player is a Pokemon.** There are **966 Pokemon** from the 9 generations.
- **Everything is local:** sprites, data, font, music and save. The game makes
  no internet request.

## 2. Screen flow

```
Login / Create account / Guest
        |
        +- (first time) Personality test --> Assigned companion
        |                                          +- Let's go together!
        |                                          +- Choose another (29 starters)
        v
Main menu  (the world in the background, with wild Pokemon strolling)
   +- Play       -> run -> summary (+ Poke-coins, shinies obtained) -> menu
   +- Pokemon    -> collection by region, choose companion (normal or shiny)
   +- Upgrades   -> permanent upgrades
   +- Gacha      -> 9 banners, one per region
   +- Friends    -> add by nickname, online, invite -> Room (up to 4) -> group game
   +- Ranking    -> time survived: Solo / Group x day, week, month, year, all-time
```

### 2.3 Co-op multiplayer (up to 4)
- **Friends by nickname.** Name-and-password accounts use their name; Google
  accounts choose a unique nickname (their real name is never shown).
- **Room:** whoever invites is the host; online friends get the invitation in
  the menu. The host starts the game for everyone.
- **Connection:** direct between browsers (WebRTC, star topology with the host);
  if the network does not allow it, through the Realtime Database (slower, but it works).
- **Who is in charge:** the host runs enemies, items, experience and the clock;
  each player their own Pokemon (position, health, attacks). Hits on enemies are
  sent to the host; teammates' attacks are shown as "ghosts".
- **Shared experience**; on leveling up each one picks their own card and the
  game **does not continue until everyone picks**.
- **Going down:** you stay on the ground; a teammate next to you for 3 s lifts
  you with half health. It ends when you all go down.
- **Arrows** at the edge of the screen pointing to teammates off-screen
  (name and meters; red if they are down).
- Difficulty: x(1 + 0.75*(n-1)) enemies and x(1 + 0.3*(n-1)) health; the
  team's experience is divided by (1 + 0.6*(n-1)).
- Pausing does not stop the game; if the host leaves, the game ends for everyone.

### 2.4 Ranking
- Time survived. **Solo / Group** tabs; **daily, weekly, monthly, yearly and
  all-time** periods (Spain time); **everyone or friends only**; **filter by
  Pokemon**; your position at the bottom even if you are not in the top 50.
- One entry per player (or team) and table, only if it improves. In a group the
  whole team shows in the same row (the host uploads it).
- Basic anti-cheat: at the start the server time is recorded and the rules do
  not accept a time greater than the real elapsed time.

### 2.1 Accounts
- Log in, create an account or **play as a guest** (nothing is saved).
- Provisional in `localStorage` behind `js/core/db.js`. Passwords with salt +
  SHA-256, but it is local: not real security.
- The session is remembered when you reopen the game.

### 2.2 Personality test
- 8 Mystery Dungeon style questions; each answer adds trait points.
- The dominant trait decides the companion among the **29 starters**: starters
  from the 9 generations + Psyduck + Slowpoke. You can refuse and choose another.

## 3. Combat

- The Pokemon **attacks on its own** with the **active move** (1 of up to 4).
- You change the active one with `1`-`4` or `Q`/`E`. Move: `WASD` / arrows. Pause: `Esc`.
- Each attack plays the corresponding **PMD animation**: `Attack`, `Shoot` or `Charge`.
- **Targeting:** whatever is touching you > the boss if in range > the nearest
  enemy > (no enemies) the nearest rock or chest.
- **52 moves** in 7 families (projectile, melee, beam, orbs, nova, aura, buff),
  5 levels each. They cover the **18 types**.
- Each Pokemon's pool comes from its types + the common normal pool.
- Buffs do no damage: you enter, build up and go back to an attack one.
  Never more than 2 are offered.
- On leveling up: **1 of 3 cards**.

## 4. World

Open, infinite arena, generated with deterministic noise and painted in pixel
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
| **Rift** | Rare (every 30 s, 14% from minute 1:15; lasts 45 s). It takes you to a legendary's arena |

- **Fliers, ghosts and bosses** ignore the terrain.
- **3 biomes** that rotate every 4 minutes, each with its own music:
  Shadow Forest, Crystal Cave, Ash Volcano. The change is a **2.6 s fade**
  between the old palette and the new one (ground and objects).
- **Rift -> arena:** a round closed zone in the *Distortion Rift* biome,
  against a **legendary** (2 min). You win: an extra x10 ticket, 3 tickets and
  coins, and you return where you were. You lose (you all go down or time runs
  out): you return with no prize at 30% health. Meanwhile, the map's enemies wait.

### 4.0 Rift arenas (one per type)
The legendary waits for you in the arena of **one of its two types, at random**. Each
arena has its own palette, decoration, terrain and weather, and plays its own
theme ("rift"). The legendary collides with walls and columns like you and cannot
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
Electric/Ground to the discharge, Ice to ice. The legendary does not suffer its own arena.

### 4.1 Weather (rare event)
From minute 2, each minute there is an 18% chance weather arrives (~1 minute):

| Weather | Effect |
|---|---|
| Scorching sun | Fire x1.5 . Water x0.5 |
| Rain | Water x1.5 . Electric x1.2 . Fire x0.5 |
| Sandstorm | Rock, Ground and Steel x1.3; the rest lose 1.2% health every 2 s (never a KO) |
| Snowfall | Ice x1.5; the rest lose health likewise and move 10% slower |
| Fog | Ghost, Fairy and Psychic x1.3; the vignette closes in a bit |

It affects everyone (you and the enemies). Each biome prefers certain weather.
The visuals are soft: a light tint and few pixel particles. In a group the host decides.

### 4.2 Type chart (softened)
The one from the games, but x1.6 / x0.6 / x0.3 instead of x2 / x0.5 / x0 (with a
single active attack, a total immunity would leave impossible enemies). Two
types multiply, capped x0.3-x2.4. Your attacks use the move's type;
enemies, their main type (or their shot's). A yellow number when it is super
effective; gray if not (no text, to avoid cluttering the screen).

## 5. Enemies

- **From every generation.** 6 tiers by base stat total; in each run a cast of 7
  Pokemon per tier is drawn, so each game is different.
- AI by types: chase, telegraphed charge (`Charge` -> `Attack`),
  ranged shot or tank.
- **5 bosses** (min. 3, 6, 9, 12, 15): strong **non-legendary** Pokemon
  (pseudo-legendaries, Slaking...) at random, each one stronger; each drops
  an **x10 ticket**. Legendaries only appear in the rifts. During a boss fight
  the waves drop to 25%, there are no tides and the boss theme plays.
- Tides every ~45 s. Cap of **280** enemies at once; when the cap is reached,
  those that keep spawning are elite (x1.6 health and experience, x1.25 damage).
- **Pathfinding:** distance field (BFS) around each player; the walkers go
  around rocks, walls and dangerous puddles. Only those that **float in their
  sprite** fly over (`hv` in sprites-meta, tools/hover_flags.py):
  Rowlet or Pidgey walk even though they are Fliers; Gastly or Zubat float.

### 5.1 Personalities
In each run, each enemy tier brings at least 2 with personality (1 in the first,
to ease you in). The "warned" attacks are shown on the ground beforehand.

| Personality | Who | What it does |
|---|---|---|
| Healer | Chansey, Blissey, Audino, Clefairy... | Heals 15% to those around every 3.5 s |
| Shield | Shuckle, Bronzong, Mr. Mime, Bastiodon... | 35% health shield on 6 teammates |
| Summoner | Nidoqueen, Vespiquen, Golbat, Gyarados... | Calls 2 of its pack (Nidoran, Combee...) |
| Kamikaze | Voltorb, Electrode, Koffing, Geodude... | Approaches and explodes (1 s warning) |
| Beam | Electric, Psychic, Dragon, Ice (some) | Beam with a warning strip |
| Zones | Fire, Ground, Poison (some) | Circles under your feet that burst |
| Fan | Water, Grass, Bug, Fairy (some) | 3 shots in a fan (5 later on) |
| Jumper | Fighting, Ground, Normal, Rock (some) | Jumps and lands where you were |

## 6. Shinies

- **Wild:** each enemy has a **1/4096** chance of being shiny (bosses too).
  It sparkles, has double health, gives x5 experience, does not vanish even if you
  move away, and an arrow at the edge of the screen tells you where it is.
  **If you beat it, you keep it** (and the normal version if you did not have it). If you
  already had that shiny, +300 coins.
- **Gacha:** 1 in every 100 pulls is shiny. A repeated shiny = triple coins.
- **Collection:** on the card of a Pokemon whose shiny you have there is a
  **Normal / Shiny** selector; you choose a companion in the version you want.
- 958 of the 966 Pokemon have an authentic shiny sprite from SpriteCollab.

## 7. Progression

### 7.1 Poke-coins
On finishing a run: `time/5 + defeated/4 + 80 per boss + coins collected`,
multiplied by the Fortune upgrade. New account: 500 as a gift.

Coins are for the **upgrades**; the gacha runs on tickets.

### 7.2 Permanent upgrades, per Pokemon
Vitality, Strength, Stride, Reflexes, Carapace, Synthesis, Magnet, Wisdom, Fortune
and **Repertoire (start with 2 moves)**. Each Pokemon has its own and
they only count when you play with it (on the Upgrades screen you pick which).
The ones bought when they belonged to the account passed to the companion of that time.

### 7.2a Equippable items (one per run)
Leftovers, Choice Band, Quick Claw, Focus Band, Shell Bell, Amulet Coin, Lucky
Egg, Life Orb, Choice Scarf, Rocky Helmet and Assault Vest. They are dropped by
**all bosses**, locked chests (50%) and sometimes the normal ones (8%). If you
already carry one, you choose (solo the game pauses).

### 7.2c Move evolution (REMOVED 2026-10-18)
Move evolutions and the original stat cards were removed in the upgrade rework (see DECISIONS 2026-10-18). Moves now grow through mechanic upgrades chosen per move; design in DECISIONS, build in progress.

### 7.2d Quests, achievements and profile
- **3 daily + 2 weekly** (prize in tickets and coins); one daily can be
  rerolled per day. The same quests on any computer (seed per account).
- **Achievements** with a medal (bronze, silver, gold), prize and sometimes a
  **title**; one for each **legendary** beaten in a rift.
- **Public profile** (from the ranking or the friends list): 3 favorites,
  title, best records and the 8 best medals.

### 7.2b Gacha tickets
- **Ticket** (x1): each defeated Pokemon has a 1/400 chance of dropping one; locked
  chests give 1-3.
- **x10 ticket**: the bosses, the rift legendary (2) and, sometimes, the locked
  chests.
- In a group the tickets belong to the team: everyone gets the ones collected.

### 7.3 Gacha, one banner per region
Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar and Paldea, each with
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

## 8. Music and sound

Composed for the game and played by a Web Audio synthesizer (flute, marimba,
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
- Music and effects volume and a mute button in the top bar and in the pause
  menu; it is remembered in the browser.
- Measured: the 5 themes on par (RMS 0.075-0.09), no clipping even with boss + combat.

## 9. Interface

- **No emojis.** Pixel-art icons drawn in code (`js/ui/icons.js`):
  each move carries the **emblem of its type** (18) + a **badge of its
  family**; plus heart, glove, boot, clock, shield, sprout, magnet, book,
  coin, cards, berry, bomb, star, shiny sparkle, crown, Poke Ball...
- Always at integer multiples of their resolution, so the pixel stays crisp.

## 10. Technical

- Vanilla HTML + CSS + JavaScript on Canvas 2D. No build, no dependencies.
- **Sprites:** [SpriteCollab](https://github.com/PMDCollab/SpriteCollab), 966
  Pokemon x 7 animations x 8 directions, normal and shiny, in `assets/pokemon/`
  (76 MB, PNG with a lossless palette). **CC BY-NC 4.0: non-commercial use and
  attribution** (114 artists in `CREDITS.md`).
- **Data:** stats and names in Spanish downloaded **once** from PokeAPI.
- **Font:** Pixelify Sans (OFL).
- The generated files are rebuilt with the scripts in `tools/`.

## 11. Pending

- [ ] Type effectiveness on damage
- [ ] Custom graphics for the projectiles (now they are colored orbs)
- [ ] Custom moves per Pokemon (now they come from their types)
- [ ] Touch / gamepad controls
- [ ] 59 Pokemon with no sprite in SpriteCollab (mostly gen 5, 8 and 9)

---

## Decision log

**2026-10-07 . first version**
- Vanilla stack + Canvas. 1 active move changed with 1-4. Combat first.

**2026-10-07 . second version**
- Everything local: out with the runtime API.
- Mystery Dungeon sprites (SpriteCollab) with attack animations.
- Tiles painted in code (the PMD ones only exist by ripping the ROM).
- Map: **open arena with obstacles** (not PMD's strict rooms and corridors).
- Save: `localStorage` behind a single data layer.

**2026-10-07 . third version**
- **All generations** (966 with a sprite). Gacha: **one banner per region**.
- **Shinies:** 1/4096 wild, 1/100 in the gacha; the companion is chosen in
  normal or shiny version from the collection.
- **Music composed in code** (Nintendo's cannot be used) + effects.
- **Out with the emojis**: custom pixel-art icons.

**2026-10-07 . combat fix**
- Bug: projectiles were born at the edge of the Pokemon and advanced up to 8 units
  per frame, so **enemies stuck to the player were immune** to all the
  projectile moves (in a survivor, there is almost always one stuck to you).
  Now they are born at the center and the collision is swept (the whole span of the frame).
  In the 10-min simulation it went from 0 to 1 boss defeated per game.
- Demo videos in `videos/` (boss, wild shiny, shiny in the gacha).

**2026-10-07 . effects and visual touches**
- **Attacks with pixel-art sprites** (`js/entities/vfx.js`): 23 shapes (flame,
  drop, bubble, leaf, bolt, crystal, rock, sludge, stinger, star, wind,
  web, wave, half-moon, sound, impact, slash, jaws, arrow,
  sphere, shadow ball, heart...) painted with each type's palette and with
  an outline like the PMD sprites. Beams as jets (flames, water, electric
  zigzag, crystals), hits as a pixelated crescent with extras (jaws,
  slash, impact, leaves/feathers), auras and buffs with type particles,
  trails (embers, drops, poison bubbles, dust...). Enemy shots
  use the enemy's type and carry a red ring on the ground.
- **Same pixel size across the whole interface** (x2): the big legendaries
  looked like another style because they were drawn at x1. Bosses, in multiples of 0.5.
- **Shiny:** a pixel-art gem as the mark and animated pixel sparkles.
- **Menu companion:** a dark box with a border in its type's color.
- **Targeting:** ranged attacks prioritize the boss; melee ones,
  whatever is stuck to you.

**2026-10-07 . database and publishing**
- **Firebase** (Authentication + Firestore): accounts with name + password or
  Google; the save follows you on any computer. A local copy to play
  offline, real-time listening from other computers and a **merge** on
  syncing (collections joined, maximums on upgrades/stats, coins and
  companion from the most recent version). Rules: each player only accesses
  `saves/{their uid}`. Old local accounts are uploaded on entering with the
  same name and password. Tested with the official emulator in two browsers.
- With no setup or opened by double-click, it stays in local mode.
- **Legal notice and privacy** with contact to take down content and a button
  to delete the account. Open source (MIT) on GitHub (JPTER78).
- Measures NOT applied on request: renaming without "Pokemon" and removing the
  sprites ripped from the games (CHUNSOFT's).

**2026-10-08 . new name**
- The game is renamed **PokeSurvivor** (without "Pokemon" in the name, like
  PokeRogue or Showdown). Repository: `pokesurvivor`.
- Firebase: new project **`pokesurvivor-jpter`** (Firestore in eur3, email/
  password and Google active, domains `jpter78.github.io` and `localhost`). The
  projects `pokemon-survivors-jpter` and `asdaad-9e84f` were deleted (30 days
  recoverable in Google Cloud).

**2026-10-09 . mobile and settings**
- **Playable on phone and tablet, in landscape** (in portrait it shows "Rotate
  the phone" and the game pauses). **Floating joystick**: it appears where you put your
  finger. The attack icons are tapped to change them (on PC also with a click) and
  there is a pause button. On switching apps, the game pauses on its own.
- The camera guarantees a minimum world height on very wide screens.
- Compact interface on short screens (menu in two columns, small top
  bar, the credits line moves to Settings -> About).
- **Settings** (PC and mobile): sound; graphics (Auto/High/Medium/Low quality,
  damage numbers, less shake and flashes, FPS, fullscreen);
  controls (joystick size, keys); account (fixed nickname, cloud, sign
  out, delete); about (version, credits, legal notice, contact).
- **Automatic quality**: it lowers effects if the game drops below 45 FPS.
- **Installable as an app** (PWA: icon, fullscreen, opens offline).
- Fixes: the extra orb of the orbit moves when upgraded; sound
  that would not start on mobile; summoners respect the enemy cap;
  a clear notice if a game file fails to load.

**2026-10-09 . spend the minimum of Firebase (free plan)**
- **Ranking with a summary**: an `lbs/{table}` document with the top 50 per
  table (1 read per tab instead of ~52) and a 10-min cache in the
  browser; your own records are remembered to avoid reading before writing.
  The filter by Pokemon stays **only in the all-time table** (half the writes).
- **Approximate "online"** via Firestore (`pres/`, a heartbeat every 10 min, read
  on opening Friends or the room) and **invitations via Firestore** (`inv/`). The
  Realtime Database only connects inside a room: the free plan's 100-connection
  cap no longer limits normal players.
- **Cloud save** at most every 30 s (and on closing), with no live
  listening of your own document; public profile at most every 10 min.
- Measured in the emulator: viewing the whole ranking twice went from 1,275 to 20
  reads; finishing a game from 12 to 3.
- Fewer Pokemon on screen but stronger (x0.45 quantity, x2.1 health,
  x1.35 damage, x2.6 experience) and no "Super effective!" texts.

**2026-10-08 . multiplayer, friends and ranking**
- **Co-op up to 4** with a **friends list** (no room codes or public
  rooms). Shared experience and **cards that wait for everyone**; a downed one
  is **revived** by staying next to them.
- **Direct WebRTC** connection with signaling via the **Realtime Database**
  (new instance `pokesurvivor-jpter-default-rtdb`, europe-west1), and a **relay**
  via that same database if a direct connection fails. No own server
  or paid TURN.
- **Unique nickname** for friends and ranking; Google accounts choose it on
  entering (privacy: their real name is not shown).
- **Time-survived ranking**: Solo / Group, daily to all-time, friends,
  by Pokemon, your position. The group shows whole in one row.
- Privacy notice: in a group the browsers connect directly and
  can see each other's IP (like on a video call).

**2026-10-08 . per-Pokemon upgrades, tickets, rifts and interactives**
- **Per-Pokemon upgrades** (not per account); the ones already bought pass to the
  current companion. Coins stay only for upgrades.
- **Gacha with tickets** earned by playing (no initial gift or conversion
  of coins): x1 from normal Pokemon (1/260), x10 from legendaries (always) and bosses (1 in 3).
- **Casual non-legendary bosses**; the legendaries, only in the **rifts**
  (a separate arena; losing returns you with no prize). In a group you all travel.
- **Altars, springs, locked chests and traps**, in custom pixel art.
- **Fade** between biomes instead of the abrupt change.
- Pokedex: `leg` field (legendary or singular) from PokeAPI.

**2026-10-08 . weather, type chart and slot machine**
- **Weather** as a rare event (sun, rain, sandstorm, snow, fog), soft visuals.
- **Softened type chart** in both directions.
- Gacha with a **pixel-art slot machine** instead of the Poke Ball.

**2026-10-08 . arenas by type**
- Bug: the legendaries (bosses = fliers) passed through the arena's rocks and
  could not be shot (Celebi). Now they collide and do not leave the circle.
- 18 rift arenas, one per type, with terrain that affects play and its own weather;
  a new musical theme for the rift.

**2026-10-08 . more Pokemon icons**
- Shiny: a **red star** with a sparkle (like the games' shiny mark),
  instead of the gem.
- Rarity: no more stars; each rarity is its **Poke Ball**: Poke (Common),
  Great (Uncommon), Ultra (Rare), Luxury (Epic) and **Master (Legendary)**.

**2026-10-08 . camera, performance and AI**
- Camera 20% farther (768 world width instead of 640).
- Performance: the hit flash used `ctx.filter` (x95 more expensive than a
  precomputed white silhouette, which is what is used now); a cap of 70 damage
  numbers; internal resolution x1.5 at most; less off-screen work;
  a cap of 280 enemies with elites once the cap is reached.
- Enemies go around obstacles; only those that float in their sprite fly.

**2026-10-08 . quests, achievements, items, evolutions and enemies with personality**
- Quests 3+2, achievements with a prize and title, public profile (everyone sees it).
- One-use-per-run equippable items (chests and bosses).
- Move evolution: max level + condition, golden card. (Removed 2026-10-18.)
- Enemies with personality: healers, shields, summoners and attacks with a
  warning (beams, zones, kamikazes, fan, jumps). Tuned with an autopilot:
  the average survival is similar to before (89 s versus 60 s).

**2026-10-10 . last details before the website**
- Water-type Pokemon do not slow down in water or the swamp.
- You level up half as fast (experience per level x2).
- Fewer enemies at a time (cap 64) but quite a bit tougher. Those that fall
  behind while you run fade and come back out ahead, so no
  tail forms behind you and you cannot just run away. One "runner" per tier
  (fast and fragile, goes to where you are going to be).
- Bosses and legendaries with 4 warned attacks (stomp, charge or jump, and two
  from range by type: a rain of zones, beams in a fan, a ring or a fan
  of shots). They alternate between coming at you and fighting from range, and below
  half health they enrage. More health (x1.35) and damage (x1.2).
- Rifts: a big pulsing arrow, with distance and time, and its own notice on
  opening.
- "Press to start" screen (the browser does not allow sound without a touch) and
  music also at sign-in and in the personality questions.
- 8 new ways to attack with the same graphics: boomerang, chain, mines,
  meteors, turret, charge, trail and short fan. 7 moves move to
  them (same id) and there are 12 new ones (64 in total).
- Anti-cheat: the server rejects a level and defeated count impossible for the
  time; the game watches the clock, health, speed, attack, level, coins and the
  test tools. If something does not add up, the game does not count for the
  ranking or the records.
- Mid-game events every 4-5 min (systems/events.js): a horde of one type
  (30 s), golden hour (30 s, double experience and coins) and a lost Pokemon
  (you take it to the mark; a heal, coins, a ticket and 1 in 5 joins you).
  Treasure imps 1-2 per game: Meowth (coins) or Gholdengo (x10 ticket;
  Gimmighoul has no sprite). They flee and escape at 15 s. In a group, everything
  shared.
- Later (10-10): level up half as fast again (experience
  per level x4 relative to the original) and x1 tickets rarer (1/400 instead of 1/260).
  Level 8/12/15 quests and level 15 and 30 achievements (before 12/16/20, 20 and 40).
