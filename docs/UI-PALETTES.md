# UI-PALETTES, mainline colour sets kept for future UI work

Reference, not rules: these are Bulbapedia's three-tone palettes (light, base, dark), logged from assets/ui/palettes_rough.txt
(Jess, 2026-11-10). A set becomes canonical only when docs/HUD-STYLE.md (or a later UI style doc) adopts it; the type palette
already has (HUD-STYLE "Colour palette"). Every value is written `#RRGGBB` so colour previews in VS Code pick it up.

Candidate uses (ideas, not decisions):
- **Regions:** the Map panel (#65) and region select (Kanto `#80BB1D`).
- **Time and Seasons:** a time-of-day or weather tint, if the run ever gets one.
- **Attacks:** move slots' damage class mark (Physical, Special, Status) in the character info panel (#62).
- **Bag:** berry slots (Berries pocket), run items and held items (Items, Battle Items, Medicine), the Inventory.
- **Pokemon Stats:** stat upgrades in the team upgrades list (#66) and the level-up screen.
- **Egg Groups:** nothing yet.

### Time

- Colorscheme is derived from Pokémon Pokopia.

| Name | Light | Base | Dark |
|---|---|---|---|
| Morning | `#A2DFEB` | `#70CEE0` | `#498692` |
| Day | `#AAD6FC` | `#7CC0FA` | `#517DA3` |
| Evening | `#EFBFA4` | `#E79D73` | `#96664B` |
| Night | `#CFC2EF` | `#B5A1E6` | `#766996` |

### Seasons

| Name | Light | Base | Dark |
|---|---|---|---|
| Spring | `#C7FA89` | `#B0F858` | `#7BAE3D` |
| Summer | `#A0DEFA` | `#78D0F8` | `#5492AE` |
| Autumn | `#FAB189` | `#F89058` | `#AE653D` |
| Winter | `#F4E3FA` | `#F0D8F8` | `#A897AE` |

### Regions

| Name | Light | Base | Dark |
|---|---|---|---|
| Kanto | `#ACD36C` | `#80BB1D` | `#537A13` |
| Johto | `#DCD677` | `#CAC02E` | `#837D1E` |
| Hoenn | `#9CD7C8` | `#67C1AB` | `#437E6F` |
| Sinnoh | `#B7A3C3` | `#9072A3` | `#5E4A6A` |
| Unova | `#9FCADF` | `#6BAECE` | `#467186` |
| Kalos | `#DD608C` | `#CB0B4F` | `#840733` |
| Alola | `#E89483` | `#DC5A40` | `#8F3B2A` |
| Galar | `#C97DC0` | `#AC379E` | `#702467` |
| Isle of Armor | `#FDE060` | `#FCD00B` | `#A48707` |
| Crown Tundra | `#66CA9C` | `#15AE68` | `#0D7143` |
| Hisui | `#7C93A9` | `#36597B` | `#233A50` |
| Paldea | `#E8CC59` | `#DCB000` | `#8F7200` |
| Kitakami | `#59C3BB` | `#00A398` | `#006A62` |
| Blueberry | `#5987A7` | `#004878` | `#002E4E` |
| Lumiose | `#82C7E0` | `#3FA9D0` | `#296E87` |
| Hyperspace | `#858585` | `#444444` | `#2C2C2C` |
| Orange | `#FFAC59` | `#FF7F00` | `#A65300` |
| Orre | `#ADA588` | `#817548` | `#544C2F` |
| PokéPark | `#A7DB8D` | `#78C850` | `#4E8234` |
| Sevii | `#8FDEB8` | `#52CC91` | `#35855E` |

### Attacks

- These colors are pulled from the icons in Masters EX. The text color is white to symbolize how the icons have appeared in Generations VIII and IX.
- Special color is darkened to differentiate it from the Dragon-type color.

| Name | Light | Base | Dark | Text |
|---|---|---|---|---|
| Physical | `#F29173` | `#EB5628` | `#99381A` | `#FFFFFF` |
| Special | `#7D94CD` | `#375AB2` | `#243B74` | `#FFFFFF` |
| Status | `#AEAEAE` | `#828282` | `#555555` | `#FFFFFF` |

### Bag

- Apricorn uses the Apricorn Box from HeartGold and SoulSilver as a color base.
- The Cologne color is a custom color as the Scent case has no color to use as a base.
- Items, Key Items, Berries, Battle Items, Mail, Medicine, Poké Balls, TMs and HMs; use Generation IV bag pockets as a color base.
- Z-Crystals use Generation VII core series game bag pockets as a color base.
- Treasures uses Sword and Shield's Treasures bag pocket as a color base.

| Name | Light | Base | Dark |
|---|---|---|---|
| Apricorn | `#F5C169` | `#F0A018` | `#9C6810` |
| Battle items pocket | `#78A2EB` | `#3070E0` | `#1F4992` |
| Berries pocket | `#6EC188` | `#20A048` | `#15682F` |
| Cologne | `#D2CCDC` | `#BAB1C9` | `#797383` |
| Ingredients Pocket | `#CA8263` | `#AD3F0F` | `#70290A` |
| Items pocket | `#D89DB7` | `#C86890` | `#82445E` |
| Key items pocket | `#B788E6` | `#9048D8` | `#5E2F8C` |
| Mail pocket | `#69B7CC` | `#1890B0` | `#105E72` |
| Medicine pocket | `#EBA27E` | `#E07038` | `#924924` |
| Poké Balls pocket | `#DBB26E` | `#C88820` | `#825815` |
| TMs and HMs pocket | `#ACC66E` | `#80A820` | `#536D15` |
| Treasures Pocket | `#F7DB8C` | `#F2C74E` | `#9D8133` |
| Z-Crystals pocket | `#CEB38A` | `#B48A4B` | `#755A31` |

### Pokémon Stats

- These colors are derived from those used on the level up screen in Sun, Moon, Ultra Sun and Ultra Moon.
- The "Special" stat from Generation I has no template; its row below uses the colours Bulbapedia gives for it.

| Name | Light | Base | Dark |
|---|---|---|---|
| Attack | `#F5DE69` | `#EFCC18` | `#9B8510` |
| Defense | `#F09A65` | `#E86412` | `#97410C` |
| HP | `#9EE865` | `#69DC12` | `#448F0C` |
| Special Attack | `#66D8F6` | `#14C3F1` | `#0D7F9D` |
| Special Defense | `#899EEA` | `#4A6ADF` | `#304591` |
| Speed | `#E46CCA` | `#D51DAD` | `#8B1370` |
| Special (Gen I) | `#78BBF0` | `#2F97E8` | `#1F6297` |

### Egg Groups

| Name | Light | Base | Dark |
|---|---|---|---|
| Monster egg | `#BBA38B` | `#97724C` | `#624A31` |
| Water 1 egg | `#9FE1FB` | `#6BD1F9` | `#4688A2` |
| Bug egg | `#C8D775` | `#AAC22A` | `#6F7E1B` |
| Flying egg | `#B7CBF6` | `#90AFF1` | `#5E7290` |
| Field egg | `#EED29B` | `#E5BA65` | `#957942` |
| Fairy egg | `#FFC0D2` | `#FF9EB9` | `#A66778` |
| Grass egg | `#AEE294` | `#82D25A` | `#55893B` |
| Human-Like egg | `#87D0CA` | `#47B7AE` | `#2E7771` |
| Water 3 egg | `#6FA3CE` | `#2271B4` | `#164975` |
| Mineral egg | `#BBB79C` | `#979067` | `#625E43` |
| Amorphous egg | `#C1AEDE` | `#9F82CC` | `#675585` |
| Water 2 egg | `#8AB9F3` | `#4B94ED` | `#31609A` |
| Ditto egg | `#D0C8E4` | `#B6AAD5` | `#766F8A` |
| Dragon egg | `#9692D5` | `#5E57BF` | `#3D397C` |
| No Eggs Discovered egg | `#F5E059` | `#EFCF00` | `#9B8700` |
