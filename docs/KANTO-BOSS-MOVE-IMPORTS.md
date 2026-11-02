# Kanto boss move imports

Every move the Kanto lore movesets call for that the move catalog does not have yet. Compiled 2026-11-01 from `docs/ASCII Concept Maps/Kanto Boss Movesets by Loop.txt` (gyms 2 to 8 and the Elite Four) against the 63 moves in `js/data/moves-generated.js`. Names, types, categories, power and generation come from pokeapi-master.

## Scope

- Counted: every loop set (L1 to L6) on every boss mon, including borrowed (+), subset (^) and composite sets. Holds (=) repeat an earlier set and add nothing.
- Not counted: the "alts" lines (alternative sets that were not picked) and Brock (his map is `Brock Movesets by Loop.txt`).
- The map is a planning draft with a stale slot order (TODO.md: redo it to the Gen-1 order). Reordering moves sets between loops but does not change which moves appear, so this list holds unless sets themselves change.
- "Sets" is how many loop sets name the move, a rough import priority.
- Hi Jump Kick (Yellow and Crystal spelling) and High Jump Kick (Let's Go) are one move, `high-jump-kick`.

## Totals

| | Moves |
|---|---|
| Distinct moves in the map | 219 |
| Already in the catalog | 42 |
| To import | **177** (81 physical, 42 special, 54 status) |
| To import, introduced after Gen 1 | 104 |

## Most used imports

The imports named by four or more loop sets. Importing these first covers the most sets.

| Move | Type | Category | Sets |
|---|---|---|---|
| Earthquake | Ground | physical | 22 |
| Hyper Beam | Normal | special | 18 |
| Sludge Bomb | Poison | special | 18 |
| Crunch | Dark | physical | 15 |
| Double Team | Normal | status | 14 |
| Thunder Punch | Electric | physical | 14 |
| Confuse Ray | Ghost | status | 13 |
| Surf | Water | special | 13 |
| Thunder | Electric | special | 12 |
| Fire Blast | Fire | special | 11 |
| Hypnosis | Psychic | status | 11 |
| Reflect | Psychic | status | 11 |
| Blizzard | Ice | special | 10 |
| Flare Blitz | Fire | physical | 10 |
| Ice Punch | Ice | physical | 10 |
| Iron Tail | Steel | physical | 10 |
| Superpower | Fighting | physical | 10 |
| Waterfall | Water | physical | 10 |
| Outrage | Dragon | physical | 9 |
| Thunder Wave | Electric | status | 9 |
| Fire Punch | Fire | physical | 8 |
| Leech Life | Bug | physical | 8 |
| Slash | Normal | physical | 8 |
| Mega Drain | Grass | special | 7 |
| Poison Jab | Poison | physical | 7 |
| Screech | Normal | status | 7 |
| Acid | Poison | special | 6 |
| Dragon Pulse | Dragon | special | 6 |
| Dream Eater | Psychic | special | 6 |
| Lovely Kiss | Normal | status | 6 |
| Recover | Normal | status | 6 |
| Sleep Powder | Grass | status | 6 |
| Solar Beam | Grass | special | 6 |
| Stun Spore | Grass | status | 6 |
| Sunny Day | Fire | status | 6 |
| Brick Break | Fighting | physical | 5 |
| Calm Mind | Psychic | status | 5 |
| Explosion | Normal | physical | 5 |
| Supersonic | Normal | status | 5 |
| Air Slash | Flying | special | 4 |
| Cross Chop | Fighting | physical | 4 |
| Earth Power | Ground | special | 4 |
| Fly | Flying | physical | 4 |
| Focus Blast | Fighting | special | 4 |
| Glare | Normal | status | 4 |
| High Jump Kick | Fighting | physical | 4 |
| Megahorn | Bug | physical | 4 |
| Petal Dance | Grass | special | 4 |
| Power Whip | Grass | physical | 4 |
| Protect | Normal | status | 4 |
| Signal Beam | Bug | special | 4 |
| Stone Edge | Rock | physical | 4 |
| Sucker Punch | Dark | physical | 4 |
| Swift | Normal | special | 4 |
| Water Pulse | Water | special | 4 |

## To import, by type

Sorted by sets, then name. Power is mainline (blank for status and variable-power moves).

### Normal (50)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Hyper Beam | `hyper-beam` | special | 150 | 1 | 18 | Lt. Surge (Magneton); Erika (Exeggutor); Lance (Dragonite, Aerodactyl, Gyarados, Charizard, Kingdra, Dragonair) |
| Double Team | `double-team` | status |  | 1 | 14 | Lt. Surge (Electrode, Magneton); Koga (Crobat, Venomoth); Lorelei (Dewgong); Bruno (Hitmonlee, Hitmonchan); Agatha (Gengar, Arbok) |
| Slash | `slash` | physical | 70 | 1 | 8 | Giovanni (Dugtrio, Persian); Lance (Charizard) |
| Screech | `screech` | status |  | 1 | 7 | Lt. Surge (Electrode); Koga (Muk, Arbok); Giovanni (Persian); Agatha (Arbok) |
| Lovely Kiss | `lovely-kiss` | status |  | 1 | 6 | Sabrina (Jynx); Lorelei (Jynx) |
| Recover | `recover` | status |  | 1 | 6 | Misty (Starmie); Lt. Surge (Porygon); Sabrina (Alakazam) |
| Explosion | `explosion` | physical | 250 | 1 | 5 | Lt. Surge (Electrode); Erika (Exeggutor); Koga (Weezing) |
| Supersonic | `supersonic` | status |  | 1 | 5 | Lt. Surge (Magneton); Koga (Venomoth); Lorelei (Cloyster); Agatha (Crobat) |
| Glare | `glare` | status |  | 1 | 4 | Koga (Arbok); Agatha (Arbok) |
| Protect | `protect` | status |  | 2 | 4 | Koga (Crobat, Weezing, Venomoth); Lorelei (Cloyster) |
| Swift | `swift` | special | 60 | 1 | 4 | Misty (Starmie); Lt. Surge (Electrode, Magneton); Lance (Aerodactyl) |
| Attract | `attract` | status |  | 2 | 3 | Lorelei (Jynx); Agatha (Mismagius) |
| Double Slap | `double-slap` | physical | 15 | 1 | 3 | Sabrina (Mr. Mime); Lorelei (Jynx) |
| Fake Out | `fake-out` | physical | 40 | 3 | 3 | Lt. Surge (Raichu); Giovanni (Persian) |
| Feint | `feint` | physical | 30 | 4 | 3 | Giovanni (Persian); Bruno (Hitmonlee) |
| Foresight | `foresight` | status |  | 2 | 3 | Bruno (Machamp, Hitmonlee) |
| Mega Kick | `mega-kick` | physical | 120 | 1 | 3 | Lt. Surge (Raichu); Sabrina (Hypno); Bruno (Hitmonlee) |
| Safeguard | `safeguard` | status |  | 2 | 3 | Lorelei (Dewgong); Lance (Dragonite, Dragonair) |
| Smokescreen | `smokescreen` | status |  | 1 | 3 | Koga (Weezing) |
| Spike Cannon | `spike-cannon` | physical | 20 | 1 | 3 | Lorelei (Cloyster) |
| Swagger | `swagger` | status |  | 2 | 3 | Bruno (Hitmonlee) |
| Take Down | `take-down` | physical | 90 | 1 | 3 | Blaine (Arcanine); Lorelei (Dewgong) |
| Tri Attack | `tri-attack` | special | 80 | 1 | 3 | Lt. Surge (Magneton, Porygon); Sabrina (Alakazam) |
| Baton Pass | `baton-pass` | status |  | 2 | 2 | Sabrina (Mr. Mime) |
| Disable | `disable` | status |  | 1 | 2 | Misty (Golduck) |
| Extreme Speed | `extreme-speed` | physical | 80 | 2 | 2 | Blaine (Arcanine); Lance (Dragonite) |
| Flail | `flail` | physical |  | 2 | 2 | Lance (Gyarados) |
| Growl | `growl` | status |  | 1 | 2 | Lt. Surge (Raichu) |
| Leer | `leer` | status |  | 1 | 2 | Bruno (Machamp); Lance (Gyarados) |
| Mega Punch | `mega-punch` | physical | 80 | 1 | 2 | Lt. Surge (Raichu); Sabrina (Hypno) |
| Minimize | `minimize` | status |  | 1 | 2 | Koga (Muk) |
| Psych Up | `psych-up` | status |  | 2 | 2 | Misty (Golduck) |
| Roar | `roar` | status |  | 1 | 2 | Blaine (Arcanine); Giovanni (Nidoqueen) |
| Self-Destruct | `self-destruct` | physical | 200 | 1 | 2 | Lt. Surge (Electrode); Koga (Weezing) |
| Wrap | `wrap` | physical | 15 | 1 | 2 | Koga (Arbok); Agatha (Arbok) |
| Bind | `bind` | physical | 15 | 1 | 1 | Erika (Tangela) |
| Double-Edge | `double-edge` | physical | 120 | 1 | 1 | Lorelei (Mamoswine) |
| Focus Energy | `focus-energy` | status |  | 1 | 1 | Bruno (Hitmonlee) |
| Fury Attack | `fury-attack` | physical | 15 | 1 | 1 | Blaine (Rapidash) |
| Lock-On | `lock-on` | status |  | 2 | 1 | Lt. Surge (Magneton) |
| Mean Look | `mean-look` | status |  | 2 | 1 | Koga (Crobat) |
| Rapid Spin | `rapid-spin` | physical | 50 | 2 | 1 | Misty (Starmie) |
| Scary Face | `scary-face` | status |  | 2 | 1 | Bruno (Machamp) |
| Sing | `sing` | status |  | 1 | 1 | Misty (Lapras) |
| Stomp | `stomp` | physical | 65 | 1 | 1 | Blaine (Rapidash) |
| Strength | `strength` | physical | 80 | 1 | 1 | Bruno (Machamp) |
| Tail Whip | `tail-whip` | status |  | 1 | 1 | Blaine (Ninetales) |
| Thrash | `thrash` | physical | 120 | 1 | 1 | Lorelei (Jynx) |
| Wring Out | `wring-out` | special |  | 4 | 1 | Erika (Tangela) |
| Yawn | `yawn` | status |  | 3 | 1 | Sabrina (Slowbro) |

### Fighting (17)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Superpower | `superpower` | physical | 120 | 3 | 10 | Misty (Poliwrath); Blaine (Flareon); Giovanni (Nidoqueen); Bruno (Machamp, Poliwrath, Alolan Golem) |
| Brick Break | `brick-break` | physical | 75 | 3 | 5 | Lt. Surge (Raichu, Electabuzz); Erika (Parasect); Blaine (Magmar); Bruno (Machamp) |
| Cross Chop | `cross-chop` | physical | 100 | 2 | 4 | Lt. Surge (Electabuzz); Bruno (Machamp) |
| Focus Blast | `focus-blast` | special | 120 | 4 | 4 | Misty (Golduck); Sabrina (Alakazam); Blaine (Magmar, Charizard) |
| High Jump Kick | `high-jump-kick` | physical | 130 | 1 | 4 | Bruno (Hitmonlee) |
| Close Combat | `close-combat` | physical | 120 | 4 | 3 | Blaine (Arcanine); Bruno (Hitmonlee, Hitmonchan) |
| Submission | `submission` | physical | 80 | 1 | 3 | Misty (Poliwrath); Giovanni (Marowak); Bruno (Machamp) |
| Double Kick | `double-kick` | physical | 30 | 1 | 2 | Bruno (Hitmonlee) |
| Bulk Up | `bulk-up` | status |  | 3 | 1 | Bruno (Machamp) |
| Counter | `counter` | physical |  | 1 | 1 | Bruno (Hitmonchan) |
| Drain Punch | `drain-punch` | physical | 75 | 4 | 1 | Bruno (Hitmonchan) |
| Dynamic Punch | `dynamic-punch` | physical | 100 | 2 | 1 | Bruno (Machamp) |
| Focus Punch | `focus-punch` | physical | 150 | 3 | 1 | Lt. Surge (Raichu) |
| Mach Punch | `mach-punch` | physical | 40 | 2 | 1 | Bruno (Hitmonchan) |
| Reversal | `reversal` | physical |  | 2 | 1 | Bruno (Hitmonlee) |
| Sky Uppercut | `sky-uppercut` | physical | 85 | 3 | 1 | Bruno (Hitmonchan) |
| Vital Throw | `vital-throw` | physical | 70 | 2 | 1 | Bruno (Machamp) |

### Psychic (13)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Hypnosis | `hypnosis` | status |  | 1 | 11 | Erika (Exeggutor); Sabrina (Hypno, Gengar); Blaine (Rapidash, Ninetales); Agatha (Gengar) |
| Reflect | `reflect` | status |  | 1 | 11 | Lt. Surge (Jolteon); Erika (Victreebel, Tangela); Sabrina (Alakazam, Mr. Mime); Blaine (Arcanine) |
| Dream Eater | `dream-eater` | special | 100 | 1 | 6 | Sabrina (Hypno, Jynx, Gengar) |
| Calm Mind | `calm-mind` | status |  | 3 | 5 | Sabrina (Alakazam, Mr. Mime, Hypno, Slowbro) |
| Future Sight | `future-sight` | special | 120 | 2 | 3 | Sabrina (Alakazam) |
| Light Screen | `light-screen` | status |  | 1 | 3 | Misty (Golduck); Lt. Surge (Electabuzz); Sabrina (Mr. Mime) |
| Barrier | `barrier` | status |  | 1 | 2 | Sabrina (Mr. Mime) |
| Psyshock | `psyshock` | special | 80 | 5 | 2 | Erika (Exeggutor); Sabrina (Alakazam) |
| Skill Swap | `skill-swap` | status |  | 3 | 2 | Sabrina (Alakazam, Mr. Mime) |
| Amnesia | `amnesia` | status |  | 1 | 1 | Misty (Poliwrath) |
| Meditate | `meditate` | status |  | 1 | 1 | Sabrina (Hypno) |
| Mirror Coat | `mirror-coat` | special |  | 2 | 1 | Lt. Surge (Electrode) |
| Rest | `rest` | status |  | 1 | 1 | Lorelei (Dewgong) |

### Electric (11)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Thunder Punch | `thunder-punch` | physical | 75 | 1 | 14 | Lt. Surge (Raichu, Electabuzz); Sabrina (Hypno); Blaine (Magmar); Giovanni (Marowak, Rhydon); Bruno (Hitmonchan, Alolan Golem); Lance (Charizard) |
| Thunder | `thunder` | special | 110 | 1 | 12 | Lt. Surge (Raichu, Magneton, Electabuzz, Jolteon); Koga (Weezing); Sabrina (Mr. Mime); Giovanni (Nidoqueen); Lorelei (Lapras); Agatha (Weezing); Lance (Dragonite) |
| Thunder Wave | `thunder-wave` | status |  | 1 | 9 | Lt. Surge (Raichu, Electrode); Sabrina (Mr. Mime); Lance (Dragonite, Gyarados) |
| Wild Charge | `wild-charge` | physical | 90 | 5 | 3 | Lt. Surge (Electabuzz); Blaine (Arcanine, Rapidash) |
| Charge Beam | `charge-beam` | special | 50 | 4 | 2 | Lt. Surge (Electrode); Sabrina (Alakazam) |
| Electro Ball | `electro-ball` | special |  | 5 | 1 | Lt. Surge (Electrode) |
| Magnet Rise | `magnet-rise` | status |  | 4 | 1 | Lt. Surge (Magneton) |
| Shock Wave | `shock-wave` | special | 60 | 3 | 1 | Lt. Surge (Magneton) |
| Thunder Fang | `thunder-fang` | physical | 65 | 4 | 1 | Lance (Aerodactyl) |
| Volt Tackle | `volt-tackle` | physical | 120 | 3 | 1 | Lt. Surge (Raichu) |
| Zap Cannon | `zap-cannon` | special | 120 | 2 | 1 | Lt. Surge (Magneton) |

### Grass (11)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Mega Drain | `mega-drain` | special | 40 | 1 | 7 | Erika (Vileplume, Tangela, Exeggutor); Koga (Venomoth, Muk, Tentacruel); Agatha (Gengar) |
| Sleep Powder | `sleep-powder` | status |  | 1 | 6 | Erika (Victreebel, Vileplume, Tangela) |
| Solar Beam | `solar-beam` | special | 120 | 1 | 6 | Erika (Exeggutor, Parasect); Sabrina (Mr. Mime); Blaine (Ninetales) |
| Stun Spore | `stun-spore` | status |  | 1 | 6 | Erika (Victreebel, Vileplume) |
| Petal Dance | `petal-dance` | special | 120 | 1 | 4 | Erika (Vileplume) |
| Power Whip | `power-whip` | physical | 120 | 4 | 4 | Erika (Victreebel, Tangela, Venusaur) |
| Energy Ball | `energy-ball` | special | 90 | 4 | 3 | Sabrina (Alakazam, Jynx); Blaine (Ninetales) |
| Grass Knot | `grass-knot` | special |  | 4 | 3 | Misty (Starmie); Lt. Surge (Raichu); Erika (Victreebel) |
| Spore | `spore` | status |  | 1 | 2 | Erika (Parasect) |
| Leaf Blade | `leaf-blade` | physical | 90 | 3 | 1 | Erika (Victreebel) |
| Synthesis | `synthesis` | status |  | 2 | 1 | Erika (Victreebel) |

### Ground (9)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Earthquake | `earthquake` | physical | 100 | 1 | 22 | Misty (Poliwrath); Lt. Surge (Electabuzz); Erika (Tangela, Venusaur); Giovanni (Dugtrio, Nidoking, Rhydon); Lorelei (Mamoswine, Alolan Sandslash); Bruno (Machamp, Poliwrath, Steelix, Alolan Golem); Agatha (Arbok); Lance (Aerodactyl, Gyarados) |
| Earth Power | `earth-power` | special | 90 | 4 | 4 | Giovanni (Nidoqueen, Nidoking) |
| Dig | `dig` | physical | 80 | 1 | 2 | Blaine (Arcanine); Giovanni (Dugtrio) |
| Fissure | `fissure` | physical |  | 1 | 2 | Giovanni (Marowak); Agatha (Arbok) |
| Bone Club | `bone-club` | physical | 65 | 1 | 1 | Giovanni (Marowak) |
| Drill Run | `drill-run` | physical | 80 | 5 | 1 | Blaine (Rapidash) |
| Mud-Slap | `mud-slap` | special | 20 | 2 | 1 | Giovanni (Dugtrio) |
| Sand Attack | `sand-attack` | status |  | 1 | 1 | Giovanni (Dugtrio) |
| Sand Tomb | `sand-tomb` | physical | 35 | 3 | 1 | Giovanni (Dugtrio) |

### Poison (9)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Sludge Bomb | `sludge-bomb` | special | 90 | 2 | 18 | Erika (Vileplume, Tangela, Exeggutor); Koga (Weezing, Venomoth, Muk, Arbok, Tentacruel); Agatha (Gengar, Crobat, Arbok, Weezing) |
| Poison Jab | `poison-jab` | physical | 80 | 4 | 7 | Erika (Victreebel); Giovanni (Nidoqueen, Nidoking); Lorelei (Cloyster); Bruno (Hitmonlee); Agatha (Arbok) |
| Acid | `acid` | special | 40 | 1 | 6 | Erika (Victreebel, Vileplume); Koga (Arbok) |
| Poison Fang | `poison-fang` | physical | 50 | 3 | 2 | Koga (Crobat); Agatha (Crobat) |
| Sludge Wave | `sludge-wave` | special | 95 | 5 | 2 | Giovanni (Nidoqueen, Nidoking) |
| Acid Armor | `acid-armor` | status |  | 1 | 1 | Koga (Muk) |
| Cross Poison | `cross-poison` | physical | 70 | 4 | 1 | Koga (Crobat) |
| Gunk Shot | `gunk-shot` | physical | 120 | 4 | 1 | Koga (Muk) |
| Poison Powder | `poison-powder` | status |  | 1 | 1 | Erika (Victreebel) |

### Water (9)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Surf | `surf` | special | 90 | 1 | 13 | Misty (Starmie, Golduck); Sabrina (Slowbro); Giovanni (Nidoqueen); Lorelei (Lapras, Cloyster, Dewgong); Lance (Gyarados, Kingdra) |
| Waterfall | `waterfall` | physical | 80 | 1 | 10 | Misty (Gyarados, Poliwrath, Dewgong); Lorelei (Dewgong); Bruno (Poliwrath); Lance (Gyarados) |
| Water Pulse | `water-pulse` | special | 60 | 3 | 4 | Misty (Starmie, Golduck, Lapras) |
| Aqua Jet | `aqua-jet` | physical | 40 | 4 | 3 | Misty (Golduck, Dewgong); Lorelei (Dewgong) |
| Rain Dance | `rain-dance` | status |  | 2 | 3 | Lt. Surge (Jolteon); Lorelei (Cloyster); Lance (Gyarados) |
| Scald | `scald` | special | 80 | 5 | 2 | Misty (Golduck); Sabrina (Slowbro) |
| Aqua Tail | `aqua-tail` | physical | 90 | 4 | 1 | Giovanni (Nidoking) |
| Clamp | `clamp` | physical | 35 | 1 | 1 | Lorelei (Cloyster) |
| Dive | `dive` | physical | 80 | 3 | 1 | Lorelei (Cloyster) |

### Fire (7)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Fire Blast | `fire-blast` | special | 110 | 1 | 11 | Koga (Weezing); Blaine (Arcanine, Rapidash, Magmar, Ninetales); Agatha (Weezing); Lance (Dragonite) |
| Flare Blitz | `flare-blitz` | physical | 120 | 4 | 10 | Blaine (Arcanine, Rapidash, Flareon); Agatha (Alolan Marowak); Lance (Charizard) |
| Fire Punch | `fire-punch` | physical | 75 | 1 | 8 | Lt. Surge (Electabuzz); Sabrina (Hypno); Blaine (Magmar); Bruno (Hitmonchan); Lance (Dragonite) |
| Sunny Day | `sunny-day` | status |  | 2 | 6 | Erika (Victreebel, Vileplume, Exeggutor); Blaine (Magmar) |
| Overheat | `overheat` | special | 130 | 3 | 3 | Blaine (Rapidash, Magmar, Flareon) |
| Blaze Kick | `blaze-kick` | physical | 85 | 3 | 2 | Bruno (Hitmonlee) |
| Fire Fang | `fire-fang` | physical | 65 | 4 | 1 | Lance (Charizard) |

### Dark (6)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Crunch | `crunch` | physical | 80 | 2 | 15 | Misty (Gyarados); Koga (Crobat); Blaine (Arcanine); Giovanni (Nidoqueen); Bruno (Steelix); Agatha (Crobat, Arbok); Lance (Aerodactyl) |
| Sucker Punch | `sucker-punch` | physical | 70 | 4 | 4 | Erika (Victreebel); Giovanni (Dugtrio); Agatha (Gengar) |
| Foul Play | `foul-play` | physical | 95 | 5 | 1 | Lt. Surge (Electrode) |
| Hone Claws | `hone-claws` | status |  | 5 | 1 | Misty (Golduck) |
| Nasty Plot | `nasty-plot` | status |  | 4 | 1 | Blaine (Ninetales) |
| Throat Chop | `throat-chop` | physical | 80 | 7 | 1 | Giovanni (Nidoking) |

### Dragon (6)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Outrage | `outrage` | physical | 120 | 2 | 9 | Misty (Gyarados); Erika (Venusaur); Blaine (Arcanine); Giovanni (Marowak); Lance (Dragonite, Dragonair) |
| Dragon Pulse | `dragon-pulse` | special | 85 | 4 | 6 | Blaine (Charizard); Lorelei (Lapras); Lance (Gyarados, Charizard, Kingdra) |
| Draco Meteor | `draco-meteor` | special | 130 | 4 | 1 | Lance (Dragonite) |
| Dragon Breath | `dragon-breath` | special | 60 | 2 | 1 | Bruno (Steelix) |
| Dragon Claw | `dragon-claw` | physical | 80 | 3 | 1 | Lance (Charizard) |
| Twister | `twister` | special | 40 | 2 | 1 | Lance (Dragonite) |

### Ice (6)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Blizzard | `blizzard` | special | 110 | 1 | 10 | Misty (Golduck); Sabrina (Jynx); Giovanni (Nidoking); Lorelei (Lapras, Cloyster, Mamoswine); Lance (Dragonite) |
| Ice Punch | `ice-punch` | physical | 75 | 1 | 10 | Lt. Surge (Electabuzz); Sabrina (Jynx); Lorelei (Jynx, Alolan Sandslash); Bruno (Machamp, Hitmonchan); Lance (Dragonite) |
| Ice Shard | `ice-shard` | physical | 40 | 4 | 3 | Misty (Dewgong); Lorelei (Dewgong, Alolan Sandslash) |
| Aurora Beam | `aurora-beam` | special | 65 | 1 | 1 | Lorelei (Dewgong) |
| Frost Breath | `frost-breath` | special | 60 | 5 | 1 | Sabrina (Jynx) |
| Ice Fang | `ice-fang` | physical | 65 | 4 | 1 | Lance (Gyarados) |

### Rock (5)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Stone Edge | `stone-edge` | physical | 100 | 4 | 4 | Giovanni (Marowak, Rhydon); Bruno (Machamp) |
| Ancient Power | `ancient-power` | special | 60 | 2 | 3 | Erika (Tangela); Lance (Aerodactyl) |
| Rock Tomb | `rock-tomb` | physical | 60 | 3 | 3 | Bruno (Machamp, Hitmonchan, Steelix) |
| Sandstorm | `sandstorm` | status |  | 2 | 1 | Giovanni (Dugtrio) |
| Stealth Rock | `stealth-rock` | status |  | 4 | 1 | Giovanni (Dugtrio) |

### Bug (4)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Leech Life | `leech-life` | physical | 80 | 1 | 8 | Erika (Parasect); Koga (Crobat, Venomoth); Agatha (Crobat) |
| Megahorn | `megahorn` | physical | 120 | 2 | 4 | Blaine (Rapidash); Giovanni (Nidoking, Rhydon) |
| Signal Beam | `signal-beam` | special | 75 | 3 | 4 | Lt. Surge (Electrode, Magneton, Jolteon); Lorelei (Dewgong) |
| U-turn | `u-turn` | physical | 70 | 4 | 1 | Koga (Crobat) |

### Flying (4)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Air Slash | `air-slash` | special | 75 | 4 | 4 | Blaine (Charizard); Agatha (Crobat); Lance (Charizard) |
| Fly | `fly` | physical | 90 | 1 | 4 | Koga (Crobat); Lance (Aerodactyl) |
| Air Cutter | `air-cutter` | special | 60 | 3 | 2 | Agatha (Crobat) |
| Bounce | `bounce` | physical | 85 | 3 | 2 | Blaine (Rapidash) |

### Ghost (4)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Confuse Ray | `confuse-ray` | status |  | 1 | 13 | Misty (Starmie, Lapras); Sabrina (Gengar); Blaine (Magmar, Ninetales); Lorelei (Lapras); Agatha (Gengar, Crobat) |
| Shadow Punch | `shadow-punch` | physical | 60 | 3 | 2 | Agatha (Gengar) |
| Nightmare | `nightmare` | status |  | 2 | 1 | Agatha (Gengar) |
| Shadow Claw | `shadow-claw` | physical | 70 | 4 | 1 | Lance (Charizard) |

### Fairy (3)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Moonblast | `moonblast` | special | 95 | 6 | 2 | Erika (Vileplume); Koga (Muk) |
| Play Rough | `play-rough` | physical | 90 | 6 | 2 | Blaine (Arcanine); Giovanni (Persian) |
| Moonlight | `moonlight` | status |  | 2 | 1 | Erika (Vileplume) |

### Steel (3)

| Move | id | Category | Power | Gen | Sets | Used by |
|---|---|---|---|---|---|---|
| Iron Tail | `iron-tail` | physical | 100 | 2 | 10 | Misty (Gyarados, Dewgong); Lt. Surge (Raichu); Koga (Arbok); Blaine (Flareon); Lorelei (Alolan Sandslash); Bruno (Steelix); Lance (Dragonite) |
| Bullet Punch | `bullet-punch` | physical | 40 | 4 | 3 | Bruno (Machamp, Hitmonchan) |
| Mirror Shot | `mirror-shot` | special | 65 | 4 | 1 | Lt. Surge (Magneton) |

## Already in the catalog (42)

These need no import. Hail is in the data but retired (`G.Moves.RETIRED`, D-HAIL), so Lorelei's Cloyster L2 and Dewgong L4 sets still need a ruling or a stand-in.

| Move | Sets | Used by |
|---|---|---|
| Psychic | 32 | Misty (Starmie, Golduck, Poliwrath); Erika (Exeggutor); Koga (Venomoth); Sabrina (Alakazam, Mr. Mime, Jynx, Slowbro, Gengar); Blaine (Magmar); Lorelei (Lapras, Jynx); Agatha (Gengar, Mismagius) |
| Ice Beam | 19 | Misty (Starmie, Golduck, Poliwrath, Lapras); Sabrina (Slowbro); Lorelei (Lapras, Cloyster, Dewgong, Jynx); Lance (Dragonite, Kingdra) |
| Thunderbolt | 18 | Misty (Starmie, Lapras); Lt. Surge (Raichu, Electrode, Porygon); Koga (Weezing); Blaine (Magmar); Giovanni (Persian); Agatha (Gengar, Weezing, Mismagius); Lance (Dragonite) |
| Quick Attack | 17 | Lt. Surge (Raichu, Electabuzz, Jolteon); Koga (Crobat); Blaine (Rapidash, Ninetales, Flareon); Agatha (Crobat) |
| Toxic | 17 | Koga (Crobat, Weezing, Venomoth, Muk, Tentacruel); Blaine (Flareon); Giovanni (Persian); Agatha (Gengar, Crobat) |
| Shadow Ball | 16 | Lt. Surge (Jolteon); Sabrina (Alakazam, Hypno, Jynx, Slowbro); Agatha (Gengar, Crobat, Weezing, Alolan Marowak, Mismagius) |
| Rock Slide | 12 | Erika (Tangela); Giovanni (Dugtrio); Lorelei (Mamoswine); Bruno (Machamp, Hitmonlee, Alolan Golem); Agatha (Alolan Marowak); Lance (Aerodactyl) |
| Body Slam | 10 | Misty (Poliwrath, Lapras); Erika (Vileplume); Blaine (Arcanine); Giovanni (Marowak); Lorelei (Lapras); Bruno (Poliwrath) |
| Hydro Pump | 9 | Misty (Starmie, Lapras); Koga (Tentacruel); Lorelei (Lapras, Cloyster); Lance (Gyarados) |
| Wing Attack | 7 | Koga (Crobat); Agatha (Crobat); Lance (Dragonite, Aerodactyl, Charizard) |
| Flamethrower | 5 | Blaine (Arcanine, Ninetales, Charizard); Giovanni (Nidoqueen); Lance (Charizard) |
| Giga Drain | 5 | Erika (Victreebel, Vileplume, Tangela); Agatha (Arbok) |
| Bonemerang | 4 | Giovanni (Marowak); Agatha (Alolan Marowak) |
| Bite | 3 | Koga (Arbok); Blaine (Arcanine); Agatha (Crobat) |
| Bubble Beam | 3 | Giovanni (Persian); Lorelei (Dewgong) |
| Dazzling Gleam | 3 | Misty (Starmie); Sabrina (Alakazam, Mr. Mime) |
| Dragon Rage | 3 | Blaine (Arcanine); Lance (Gyarados, Dragonair) |
| Flash Cannon | 3 | Lt. Surge (Magneton); Lance (Kingdra) |
| Psybeam | 3 | Lt. Surge (Porygon); Sabrina (Alakazam, Mr. Mime) |
| Razor Leaf | 3 | Erika (Victreebel) |
| Sludge | 3 | Koga (Weezing) |
| Swords Dance | 3 | Erika (Victreebel, Tangela) |
| Aerial Ace | 2 | Lance (Aerodactyl) |
| Bug Buzz | 2 | Koga (Venomoth) |
| Dark Pulse | 2 | Koga (Muk); Blaine (Ninetales) |
| Dragon Dance | 2 | Lance (Gyarados, Kingdra) |
| Fire Spin | 2 | Blaine (Rapidash) |
| Hail (retired) | 2 | Lorelei (Cloyster, Dewgong) |
| Leaf Storm | 2 | Erika (Victreebel, Venusaur) |
| Substitute | 2 | Bruno (Hitmonchan); Agatha (Gengar) |
| Tackle | 2 | Misty (Starmie); Koga (Weezing) |
| Will-O-Wisp | 2 | Blaine (Magmar); Agatha (Gengar) |
| Confusion | 1 | Sabrina (Hypno) |
| Discharge | 1 | Lt. Surge (Magneton) |
| Gust | 1 | Koga (Venomoth) |
| Harden | 1 | Misty (Starmie) |
| Heat Wave | 1 | Blaine (Ninetales) |
| Karate Chop | 1 | Bruno (Machamp) |
| Lick | 1 | Agatha (Gengar) |
| Spikes | 1 | Lorelei (Cloyster) |
| Thunder Shock | 1 | Lt. Surge (Raichu) |
| Vine Whip | 1 | Erika (Tangela) |

## Decisions needed (2026-11-01)

Goal (Jess, 2026-11-01): import all 177 moves normally, so the player can use them too, then translate them to the bosses. This section sorts the 177 by how much design work each needs before it can be authored. The counts are a first pass from the mainline effects, not rulings.

| Bucket | Moves | Work |
|---|---|---|
| Whole-field | 7 | Waits on the open whole-field decision (STATE.md) |
| Unique decisions | 38 (about 24 distinct rulings) | A ruling each, recorded as MOVE-INTENT entries |
| Existing pattern, one ruling per pattern | 18 | One ruling covers the group |
| Maps to the schema | about 114 | Normal batch review (CLAUDE.md "Move review rule") |

### Whole-field (7)

RULED (Jess, 2026-11-01, set 4): team-side fields (weather via setWeather; screens and Safeguard as timed team buffs; Stealth Rock as field hazards). Per move: MOVE-INTENT.

Sunny Day, Rain Dance, Sandstorm, Reflect, Light Screen, Safeguard, Stealth Rock. Weather has a handler (`setWeather`); screens, Safeguard and hazards do not.

### Unique decisions (38)

| Group | Moves | What has to be decided |
|---|---|---|
| Accuracy and evasion (6) RULED: miss chance (MOVE-INTENT) | Double Team, Minimize, Sand-Attack, Smokescreen, Lock-On, Foresight | COMBAT-RULES skips accuracy and evasion stages, so these do nothing today. One ruling covers all six, plus the accuracy riders on Mud-Slap, Mirror Shot and Hone Claws (drop them, or give them a meaning). |
| Power from HP (3) RULED: mainline curve | Flail, Reversal, Wring Out | Power that scales with the user's or the target's HP. One ruling. |
| Damage from other stats (4) RULED: mainline, weight from the dex | Foul Play, Psyshock, Electro Ball, Grass Knot | Foul Play uses the target's Attack, Psyshock hits Defense, Electro Ball scales with Speed, Grass Knot with weight (not tracked). |
| Damage reflection (2) RULED: stance window | Counter, Mirror Coat | Return damage taken. One ruling. |
| Turn or action conditions (5) RULED: real-time analogs (Feint waits on Protect) | Sucker Punch, Fake Out, Feint, Focus Punch, High Jump Kick | "Foe is attacking", "first turn", "breaks Protect", "fails if hit while charging", "crash damage on a miss": what each condition means in real time. |
| Sleep-dependent (2) RULED: sleep only | Dream Eater, Nightmare | Only work on a sleeping target. One ruling. |
| Switching (2) RULED: U-turn clears the swap lock; Baton Pass [Open] | U-turn, Baton Pass | Tie into the swap rule; Baton Pass also falls under the open stage-manipulation decision. |
| User faints (2) RULED: real faint | Explosion, Self-Destruct | What fainting the caster means for the player's mon and a boss mon. |
| One-hit KO (1) RULED: wild only | Fissure | What a one-hit KO means against a swarm, a player and a boss. |
| New status mechanics (11) RULED except Psych Up and Swagger (still [Open]); Skill Swap not imported | Attract, Yawn, Rest, Protect, Disable, Roar, Psych Up, Swagger, Skill Swap, Focus Energy, Magnet Rise | Attract needs a new ailment (infatuation); Yawn is a delayed sleep; Rest is self-sleep plus a full heal; Focus Energy is a crit stage (stages cover five stats today); Psych Up and Swagger are open owner decisions already (stage manipulation, raises on foes); Skill Swap has no abilities to swap. |

### Existing pattern, one ruling per pattern (18)

- RULED (set 4, priority ignored, they import by shape and power) Priority (6): Aqua Jet, Mach Punch, Ice Shard, Bullet Punch, Extreme Speed, Vital Throw. Follow the Quick Attack dash; waits on the open Quick Attack priority decision.
- RULED (set 4, delay plus i-frames) Two-turn (6): Fly, Dig, Dive, Bounce, Solar Beam, Future Sight. `delivery.delay` and caster i-frames exist; confirm the shape once.
- RULED (set 4, mainline analogs) Rampage and recharge (4): Outrage, Thrash, Petal Dance (lock in, then self confusion), Hyper Beam (a lockout after firing; today's commitment covers only the cast).
- [Proposed] mainline (set 4) Random ailment (1): Tri Attack picks one of burn, paralysis or freeze.
- RULED (set 4, team-side fields) Hazard clear (1): Rapid Spin. Damage and the Speed raise map; clearing hazards follows the whole-field ruling.

### Maps to the schema (about 114)

Plain damage; damage with riders (burn, poison, paralysis, freeze, confusion, flinch, stat drops, high crit, recoil, drain, multihit, trap); self raises (Calm Mind, Bulk Up, Amnesia, Barrier, Acid Armor, Meditate, Nasty Plot); foe drops (Growl, Leer, Tail Whip, Scary Face, Screech); pure ailment moves (Thunder Wave, Glare, Hypnosis, Sing, Spore, Sleep Powder, Stun Spore, Poison Powder, Lovely Kiss, Confuse Ray, Supersonic, Mean Look as trap); heals (Recover, Synthesis, Moonlight). Self drops after an attack (Superpower, Close Combat, Overheat, Draco Meteor) are `stat` effects with `side: self`.

## Batch 1 (2026-11-01)

Built on fix/playtest-kanto-moves: 110 of the "Maps to the schema" moves are in the catalog, held out of player pools (`G.Moves.HELD`, js/data/moves.js) until pools follow mainline learnsets. Held back to later slices: Mud-Slap, Mirror Shot, Hone Claws (accuracy trackers), Throat Chop (silence).

- Source: `tools/kanto_batch1.js` builds each move from pokeapi plus a pattern copied off a catalog move (melee swing, shot, beam, strike, falls, ring, burst, status shot, self-cast, multi-hit). `--apply` splices them into move-conversions-described.json; then `node tools/export_moves.js`.
- Review: `tools/kanto-batch1-review.html` shows each move's facts, the proposal in words, and override slots (pattern, shape, delivery, payload, cooldown, note). Export saves `kanto-batch1-overrides.json`; put it in docs/move_rework_holding/ and rerun the generator. Plain-text overrides are applied by hand.
- Runtime added: `sleep` is a legal ailment in the grammar; recoil `trigger: hit` pays a fraction of the damage dealt (gym leaders pay nothing yet, they have no payHp). Self heals (Recover, Synthesis, Moonlight) are one 0.1 s heal-over-time tick of 50% max HP.
- Status cooldowns (move-overrides.js, proposed): sleep shots 4 s; paralysis, poison, confusion and trap shots 3.5 s; foe drops 3 s; heals 12 s. Pure raises have none (they cast when their Gate opens).
- Scenarios: one placeholder per move in move-intent-scenarios.json, blocked on the shape review; the hand-derived scenarios and the batchReviewed sign-off come after it.

## Notes for the import work

- Each import goes through the move data pipeline (`docs/MOVE-AXIS-SCHEMA.md`, the source JSON under `docs/move_rework_holding/`, then `tools/export_moves.js`) and the move review rule in CLAUDE.md.
- A move also needs a gym form (`G.Gyms.formOf`: melee, nova, strike, shot or buff) before a leader can cast it. Status moves that are not self raises (Thunder Wave, Hypnosis, Confuse Ray, Reflect, Screech) have no leader form today.
- The rulings in "Decisions needed" become MOVE-INTENT entries, so each move is owned from then on (CLAUDE.md "Move review rule").
