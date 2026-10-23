# GYM & ELITE FOUR ROSTERS

Per-leader rosters for the boss rework. Companion to BOSS-REWORK.md (gym framework,
locked design) and docs/FULL-GAME-STRUCT.md (loop/region scope). This file is the
roster DATA; the rules that consume it live in those two docs. Species, types and
base stats are sourced from pokeapi-master (data/v2/csv); the roster CHOICE (which
mons, in what order) is a design decision per leader.

## Rules that apply to every roster here (do not relitigate; see the source docs)

- SIX LOOPS per region (FULL-GAME-STRUCT). Loop N fields the FIRST N mons of a
  leader's roster, in slot order. Loop 1 = slot 1 only; loop 6 = the full six.
  Twelve boss fights per loop (8 gyms + 4 Elite Four).
- ALL AT ONCE (LOCKED 2026-10-22, Jess): the loop's mons are fielded SIMULTANEOUSLY,
  not one-at-a-time. Loop 6 = all six leader mons on screen together (a brawl, not a
  boss-rush). Consequences: (a) ARENA SIZE scales with the mon count (bigger arena for
  more mons; today ARENA_R is a constant in rift.js and must become count-based);
  (b) WIN = every leader mon down (arenaTick must track a SET of boss ids, not one
  arena.bossId, and only call won() when all are dead); (c) ENRAGE = one SHARED gym
  clock from the first hit on ANY leader mon (proposed, TUNE), not independent
  per-mon clocks, so stacked enrages cannot make a 6-mon fight unwinnable;
  (d) difficulty is MULTIPLICATIVE (six simultaneous attack patterns), so loop 6 is a
  tuning watch item and pairs with the gate-escalation "you dawdled, now you pay" intent.
- SLOT ORDER = send-out order. The roster below is written top-to-bottom in that order.
- EVOLUTION STAGE follows the GYM's LOCKED LEVEL (gym.level = levelForTime(gate) +
  LEVEL_OFFSET, locked at gate spawn; BOSS-REWORK section 1 & 3). Each slot is an
  evolution LINE; the stage shown is whichever is level-appropriate for that gym's
  locked level. Because the gym level rises across loops, a slot naturally advances
  (e.g. Geodude -> Graveler -> Golem) as loops progress, with no separate per-loop
  stage table. Evolution REQUIREMENTS (trade, min-level, happiness) are IGNORED: the
  leader simply has the stage the level calls for (he is a leader, not a wild catch).
- Gym leader mons use ONLY catalog moves and the existing warning shapes
  (BOSS-REWORK section 3a). Authored move/stack data per mon lives in gyms.js /
  docs/BOSS-AUTHORING.md, NOT here. This file is the roster line-up only.
- Stage thresholds per line (the level at which a slot shows its next stage) are a
  TUNE value, set when the multi-mon gym flow is built. Placeholder bands are noted
  per line where useful; they are not locked.
- MONO-TYPE by default, OFF-TYPE allowed for sparse pools (LOCKED 2026-10-22, Jess).
  A gym's roster is the leader's type where the pool allows it. When a type is too
  thin in the chosen generation to field six distinct non-legendary lines (Gen-1
  Electric is the first case: only 8 species, Zapdos excluded as a legendary), the
  remaining slot(s) may use an OFF-TYPE thematic pick that fits the leader's identity
  (e.g. Porygon for Lt. Surge, the Game-Corner tech mon). Legendaries are NEVER gym
  mons (they are unique, rift/bespoke content). An off-type pick is a feature, not a
  fallback apology: it doubles as anti-cheese (a mon the obvious counter-type cannot
  sweep). Prefer evolving/mono-type first; reach for off-type only when the pool runs out.
- LINE-COMPLETION TO GEN-2 allowed (LOCKED 2026-10-22, Jess). A roster slot that is a
  Gen-1 line MAY complete into that line's Gen-2 evolution as its final stage (the mon
  is an evolution of a Gen-1 species, not a wholly-new-gen import). First case: Koga's
  Zubat -> Golbat -> CROBAT. This is a STANDING rule, so it applies everywhere and
  RETROACTIVELY enables (not requires) Gen-2 caps on already-locked gyms where it fits:
  e.g. Brock's Onix -> Steelix, and any other Gen-1 line with a Gen-2 final. It does NOT
  force these; each roster notes whether it takes the Gen-2 cap. Distinction from the
  off-type rule: this is same-line evolution, always on-type-appropriate, not a sparse
  fill. Gen-2 evos still obey: no legendaries, and the stage still follows gym level
  (the Gen-2 final only appears at high-enough gym level, like any final stage).

- CROSS-ROSTER REUSE (LOCKED 2026-10-22, Jess): a species MAY appear in more than one
  leader's roster, "if the lore is better". First cases: Rhydon (Brock and Giovanni),
  Gengar (Sabrina and Agatha). The ELITE FOUR may freely reuse gym species (Gen-1 pools
  for Ice, Ghost, Fighting and Dragon are exhausted or thin once gyms 1-8 are authored).
  Prefer a fresh species when the lore is equal; reuse when it is not.
- LEGENDARY RULE REAFFIRMED (2026-10-22, Jess): Mewtwo was considered as a gym mon
  (Blaine for the Cinnabar lab, Giovanni for the anime Team Rocket link) and REJECTED.
  Reason: regional legendaries are bespoke scripted fights and a post-loop-6 unlock
  (FULL-GAME-STRUCT); a gym Mewtwo would pre-empt that fight and muddy the per-legendary
  achievement. No exceptions are open.

- ELITE FOUR OUTSIDE GEN-1 (LOCKED 2026-10-22, Jess): the E4 is the final round before
  Region 2, so it may use NON-Gen-1 species when lore or game accurate. TEST: the species
  is on that member's team in some core-series game, or evolves from a species that is
  (stage still follows level). Gen-1 species need no justification. Passed: Mamoswine
  (Piloswine, Lorelei FRLG rematch), Steelix (Bruno FRLG rematch), Crobat (Golbat),
  Kingdra (Seadra, Lance in Let's Go), Mismagius (Misdreavus, Agatha). ALOLAN FORMS are
  IN (Jess 2026-10-22: they exist in the games, so rosters name them). pokedex.js has no
  regional forms today, so building them needs dex, sprite and data support (code plan,
  tracked in TODO.md); until then the regular form is the stand-in. First cases: Alolan
  Sandslash (Lorelei), Alolan Marowak (Agatha). Alolan Ninetales still fails the canon
  test (not on Lorelei's team).
- PINNED-STAGE SLOT (LOCKED 2026-10-22, Jess): a slot may be pinned to a stage so one
  evolution line can fill two slots. First case: Lance slot 6, the Dratini line pinned
  to DRAGONAIR (his canon Dragonair + Dragonite pairing). A pinned slot never evolves.
- E4 order is ACE-FIRST like the gyms (slot 1 = signature mon, so loop 1 is a lone ace).
  E4 levels are HARD-SET per encounter (BOSS-REWORK section 4), so stage follows the
  authored level, not the gate clock.

## Stage-threshold convention (placeholder, TUNE)

Until the multi-mon flow is built, assume each line advances at roughly:
  - 2-stage line: final stage at gym level >= 35.
  - 3-stage line: mid stage at gym level >= 20, final at >= 35.
Single-stage lines (Onix, Aerodactyl, etc.) never change. These numbers are a
starting point only; real bands get set and recorded in BALANCE.md at build time.

---

## Kanto

### Gym 1 - Brock (Rock)   [ROSTER LOCKED 2026-10-22; moves/stacks still in gyms.js]

Source: Pokemon Crystal rematch party (Graveler, Rhyhorn, Omastar, Kabutops, Onix)
+ Aerodactyl (Brock's Red/Blue Anniversary party). Six Rock-type lines.

Slot | Line (base -> mid -> final)        | Types (final)  | BST (final) | Role
-----|------------------------------------|----------------|-------------|---------------------------
  1  | Geodude -> Graveler -> Golem       | Rock/Ground    | 495         | spine; evolves across loops
  2  | Rhyhorn -> Rhydon                  | Ground/Rock    | 485         | Ground-lean bruiser
  3  | Omanyte -> Omastar                 | Rock/Water     | 495         | special threat (SpA 115)
  4  | Kabuto -> Kabutops                 | Rock/Water     | 495         | fast physical (Spe 80)
  5  | Onix                               | Rock/Ground    | 385         | the Def-160 wall
     |   -> Steelix (Gen-2 line-completion, Jess 2026-10-22) | Steel/Ground | 510 | Def-200 wall at high gym level; off-Rock typing accepted
  6  | Aerodactyl                         | Rock/Flying    | 515         | speed ace (Spe 130)

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Geodude    40/ 80/100/ 30/ 30/ 20 (BST 300)   Graveler 55/ 95/115/ 45/ 45/ 35 (390)
  Golem      80/120/130/ 55/ 65/ 45 (495)        Rhyhorn  80/ 85/ 95/ 30/ 30/ 25 (345)
  Rhydon    105/130/120/ 45/ 45/ 40 (485)        Omanyte  35/ 40/100/ 90/ 55/ 35 (355)
  Omastar    70/ 60/125/115/ 70/ 55 (495)        Kabuto   30/ 80/ 90/ 55/ 45/ 55 (355)
  Kabutops   60/115/105/ 65/ 70/ 80 (495)        Onix     35/ 45/160/ 30/ 45/ 70 (385)
  Aerodactyl 80/105/ 65/ 60/ 75/130 (515)

Per-loop lineup (count = loop number; ALL fielded at once; stage shown is the
expected stage at that loop's typical gym level, per the placeholder bands above):
  Loop 1: Geodude
  Loop 2: Geodude/Graveler, Rhyhorn
  Loop 3: + Omanyte/Omastar
  Loop 4: + Kabuto/Kabutops
  Loop 5: + Onix
  Loop 6: Golem, Rhydon, Omastar, Kabutops, Onix/Steelix, Aerodactyl   (full team)

Note (2026-10-22): slot 5 takes the line-completion rule: Onix caps at STEELIX
(Steel/Ground, Def 200, BST 510) at high-enough gym level. This puts a Steel-type in
the Rock gym (accepted; it is the canonical evolution). Stage still follows gym level,
so early loops still show Onix; Steelix only appears once the gym level is high enough.

Defensive spread (design note): three profiles across the six, so no single
starter hard-counters the whole roster. Rock/Ground (Geodude line, Onix) is
double-weak to Water+Grass; Rock/Water (Omastar, Kabutops) is weak to
Grass/Electric/Fighting/Ground; Rock/Flying (Aerodactyl) is weak to
Electric/Water/Rock/Steel/Ice. Interaction with the softened SOFT type chart and
the Rock/Ground Electric-immunity question is still open (BOSS-REWORK 3d note 4).

### Gym 2 - Misty (Water)   [ROSTER LOCKED 2026-10-22; Gen-1 only; moves/stacks still in gyms.js]

Source: games primary, anime secondary. Gen-1-ONLY by request (the earlier mixed-gen
options (Politoed, Lanturn, Quagsire) were Gen 2 and are swapped for Gen-1 lines).
Caveat: team MEMBERSHIP leans on recall of Misty's games/anime rosters (not yet
source-verified against Bulbapedia); the stats/types below are from pokeapi-master.

Slot | Line (base -> final)               | Types (final)  | BST (final) | Role / canon
-----|------------------------------------|----------------|-------------|---------------------------
  1  | Staryu -> Starmie                  | Water/Psychic  | 520         | signature ace (games + anime)
  2  | Magikarp -> Gyarados               | Water/Flying   | 540         | physical powerhouse (anime)
  3  | Psyduck -> Golduck                 | Water          | 500         | Psyduck is iconic anime; Golduck scales it
  4  | Poliwag -> Poliwhirl -> Poliwrath  | Water/Fighting | 510         | anime Poliwag line; adds a Fighting profile
  5  | Lapras                             | Water/Ice      | 535         | bulky Water/Ice anchor
  6  | Seel -> Dewgong                    | Water/Ice      | 475         | HGSS-era Water/Ice line (Gen-1 6th slot)

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Staryu    30/ 45/ 55/ 70/ 55/ 85 (340)   Starmie  60/ 75/ 85/100/ 85/115 (520)
  Magikarp  20/ 10/ 55/ 15/ 20/ 80 (200)   Gyarados 95/125/ 79/ 60/100/ 81 (540)
  Psyduck   50/ 52/ 48/ 65/ 50/ 55 (320)   Golduck  80/ 82/ 78/ 95/ 80/ 85 (500)
  Poliwag   40/ 50/ 40/ 40/ 40/ 90 (300)   Poliwhirl 65/ 65/ 65/ 50/ 50/ 90 (385)
  Poliwrath 90/ 95/ 95/ 70/ 90/ 70 (510)   Lapras  130/ 85/ 80/ 85/ 95/ 60 (535)
  Seel      65/ 45/ 55/ 45/ 70/ 45 (325)   Dewgong  90/ 70/ 80/ 70/ 95/ 70 (475)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the gym level):
  Loop 1: Staryu/Starmie
  Loop 2: + Gyarados line
  Loop 3: + Golduck line
  Loop 4: + Poliwrath line
  Loop 5: + Lapras
  Loop 6: Starmie, Gyarados, Golduck, Poliwrath, Lapras, Dewgong   (full team)

Defensive spread (design note): Water/Psychic, Water/Flying, pure Water, Water/Fighting,
Water/Ice x2. The whole team is ELECTRIC-weak and most are Grass-weak, since there is no
Gen-1 Water/Ground to patch it (that was the cut Quagsire's job), so a Gen-1 Misty is
genuinely hard-countered by an Electric or Grass starter. Canon-accurate for an early
Water gym; flagged as a lower anti-cheese spread than the mixed-gen version.
### Gym 3 - Lt. Surge (Electric)   [ROSTER LOCKED 2026-10-22; Gen-1 only; moves/stacks still in gyms.js]

Source: games primary, anime secondary. Gen-1-ONLY. NOTE: the Gen-1 Electric pool is
tiny, with only 8 non-legendary species (Pikachu/Raichu, Voltorb/Electrode,
Magnemite/Magneton, Electabuzz, Jolteon; Zapdos excluded as a legendary). That is not
enough distinct lines for six, so slot 6 uses an OFF-TYPE thematic pick (see the
off-type rule below). Caveat: membership from recall, not Bulbapedia-verified; stats
from pokeapi-master.

Slot | Line (base -> final)       | Types (final)   | BST (final) | Role / canon
-----|----------------------------|-----------------|-------------|---------------------------
  1  | Pikachu -> Raichu          | Electric        | 485         | signature ace (games + anime)
  2  | Voltorb -> Electrode       | Electric        | 490         | fastest (Spe 150); RBY->HGSS
  3  | Magnemite -> Magneton      | Electric/Steel  | 465         | special attacker, different typing
  4  | Electabuzz                 | Electric        | 490         | mixed attacker (HGSS roster)
  5  | Jolteon                    | Electric        | 525         | speed glass-cannon (design add, not canon-Surge)
  6  | Porygon                    | Normal          | 395         | OFF-TYPE: tech/Game-Corner theme fits Surge; off-type anti-cheese

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Pikachu    35/ 55/ 40/ 50/ 50/ 90 (320)   Raichu    60/ 90/ 55/ 90/ 80/110 (485)
  Voltorb    40/ 30/ 50/ 55/ 55/100 (330)   Electrode 60/ 50/ 70/ 80/ 80/150 (490)
  Magnemite  25/ 35/ 70/ 95/ 55/ 45 (325)   Magneton  50/ 60/ 95/120/ 70/ 70 (465)
  Electabuzz 65/ 83/ 57/ 95/ 85/105 (490)   Jolteon   65/ 65/ 60/110/ 95/130 (525)
  Porygon    65/ 60/ 70/ 85/ 75/ 40 (395)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the gym level):
  Loop 1: Pikachu/Raichu
  Loop 2: + Voltorb/Electrode line
  Loop 3: + Magnemite/Magneton line
  Loop 4: + Electabuzz
  Loop 5: + Jolteon
  Loop 6: Raichu, Electrode, Magneton, Electabuzz, Jolteon, Porygon   (full team)

Defensive spread (design note): mostly mono-Electric (shared Ground weakness, so a
Ground starter walks this gym), with two exceptions that add texture: Magneton
(Electric/Steel, no Ground immunity but many resistances) and the off-type Porygon
(Normal, NOT Ground-weak, which makes it the one mon a Ground starter cannot shred; Fighting-weak
instead). Porygon is the deliberate anti-cheese seam here.
### Gym 4 - Erika (Grass)   [ROSTER LOCKED 2026-10-22; Gen-1 only; moves/stacks still in gyms.js]

Source: games primary, anime secondary. Gen-1-ONLY. Venusaur is canon (Erika's
Pokemon Let's Go rematch roster), so no design-add this time. Pool is ample (14
Gen-1 Grass species), so all six are Grass-family, no off-type needed.
Caveat: membership from recall + Jess's Let's Go confirmation; stats from pokeapi-master.

Slot | Line (base -> final)                 | Types (final)  | BST (final) | Role / canon
-----|--------------------------------------|----------------|-------------|---------------------------
  1  | Bellsprout -> Weepinbell -> Victreebel | Grass/Poison  | 490         | RBY ace + anime
  2  | Oddish -> Gloom -> Vileplume          | Grass/Poison   | 490         | RBY + anime (her Gloom)
  3  | Tangela                               | Grass          | 435         | RBY team; the one pure-Grass, Def-115 wall
  4  | Exeggcute -> Exeggutor                | Grass/Psychic  | 530         | highest BST, special nuke (SpA 125), off-color typing
  5  | Paras -> Parasect                     | Bug/Grass      | 405         | Bug typing; spore/status flavor
  6  | Bulbasaur -> Ivysaur -> Venusaur      | Grass/Poison   | 525         | iconic Grass ace (Let's Go rematch roster)

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Bellsprout 50/ 75/ 35/ 70/ 30/ 40 (300)  Weepinbell 65/ 90/ 50/ 85/ 45/ 55 (390)
  Victreebel 80/105/ 65/100/ 70/ 70 (490)  Oddish    45/ 50/ 55/ 75/ 65/ 30 (320)
  Gloom      60/ 65/ 70/ 85/ 75/ 40 (395)  Vileplume 75/ 80/ 85/110/ 90/ 50 (490)
  Tangela    65/ 55/115/100/ 40/ 60 (435)  Exeggcute 60/ 40/ 80/ 60/ 45/ 40 (325)
  Exeggutor  95/ 95/ 85/125/ 75/ 55 (530)  Paras     35/ 70/ 55/ 45/ 55/ 25 (285)
  Parasect   60/ 95/ 80/ 60/ 80/ 30 (405)  Bulbasaur 45/ 49/ 49/ 65/ 65/ 45 (318)
  Ivysaur    60/ 62/ 63/ 80/ 80/ 60 (405)  Venusaur  80/ 82/ 83/100/100/ 80 (525)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the gym level):
  Loop 1: Bellsprout/Victreebel line
  Loop 2: + Oddish/Vileplume line
  Loop 3: + Tangela
  Loop 4: + Exeggcute/Exeggutor line
  Loop 5: + Paras/Parasect line
  Loop 6: Victreebel, Vileplume, Tangela, Exeggutor, Parasect, Venusaur   (full team)

Defensive spread (design note): heavily Grass/Poison (four of six), so the team is
badly FIRE-weak and FLYING-weak (Parasect is 4x Fire-weak as Bug/Grass) and a Fire or
Flying starter walks this gym, which is canon-accurate for Erika. CORRECTION
2026-10-22: Exeggutor (Grass/Psychic) does NOT break the pattern: it is also Fire and
Flying weak (and 4x Bug-weak). Only Poison coverage differs. Tangela is pure Grass
(Def-115 wall) and equally Fire/Flying weak. Fire hits all six; Flying hits all six. Low anti-cheese vs Fire/Flying by
design; the Grass/Poison stack is the point.
### Gym 5 - Koga (Poison)   [ROSTER LOCKED 2026-10-22; Gen-1 + line-completion; moves/stacks still in gyms.js]

Source: games primary, anime secondary. Jess's lineup. Uses the LINE-COMPLETION rule
(Zubat line caps at Crobat, Gen-2). Nidoran lines deliberately NOT used here so they
stay free for Giovanni (Gym 8, Ground). No overlap with Erika (Grass/Poison excluded)
or Agatha (Ghost/Poison, the Gengar line, reserved for the Ghost E4). Caveat:
membership from Jess + recall; stats from pokeapi-master.

Slot | Line (base -> final)           | Types (final)  | BST (final) | Role / canon
-----|--------------------------------|----------------|-------------|---------------------------
  1  | Zubat -> Golbat -> Crobat      | Poison/Flying  | 535         | signature ace (anime Golbat->Crobat); Ground-IMMUNE; Spe 130
  2  | Koffing -> Weezing             | Poison         | 490         | RBY + anime signature; Def-120 wall
  3  | Venonat -> Venomoth            | Bug/Poison     | 450         | RBY + anime; adds Bug typing
  4  | Grimer -> Muk                  | Poison         | 500         | RBY team; bulky (HP 105)
  5  | Ekans -> Arbok                 | Poison         | 448         | anime-iconic pure Poison
  6  | Tentacool -> Tentacruel        | Water/Poison   | 515         | Water/Poison; special-bulk (SpD 120); only Water coverage on the team

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Zubat     40/ 45/ 35/ 30/ 40/ 55 (245)   Golbat    75/ 80/ 70/ 65/ 75/ 90 (455)
  Crobat    85/ 90/ 80/ 70/ 80/130 (535)   Koffing   40/ 65/ 95/ 60/ 45/ 35 (340)
  Weezing   65/ 90/120/ 85/ 70/ 60 (490)   Venonat   60/ 55/ 50/ 40/ 55/ 45 (305)
  Venomoth  70/ 65/ 60/ 90/ 75/ 90 (450)   Grimer    80/ 80/ 50/ 40/ 50/ 25 (325)
  Muk      105/105/ 75/ 65/100/ 50 (500)   Ekans     35/ 60/ 44/ 40/ 54/ 55 (288)
  Arbok     60/ 95/ 69/ 65/ 79/ 80 (448)   Tentacool 40/ 40/ 35/ 50/100/ 70 (335)
  Tentacruel 80/ 70/ 65/ 80/120/100 (515)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the gym level):
  Loop 1: Zubat/Golbat/Crobat line
  Loop 2: + Koffing/Weezing line
  Loop 3: + Venonat/Venomoth line
  Loop 4: + Grimer/Muk line
  Loop 5: + Ekans/Arbok line
  Loop 6: Crobat, Weezing, Venomoth, Muk, Arbok, Tentacruel   (full team)

Defensive spread (design note, CORRECTED 2026-10-22): every mon carries Poison, and
Poison is weak to Psychic and Ground, so the team is weaker than first noted. PSYCHIC
hits ALL six at 2x (Crobat, Weezing, Venomoth, Muk, Arbok, Tentacruel; none resists it).
GROUND hits five of six (Crobat is Flying, so immune). Venomoth is Bug/Poison, which is
2x Psychic (not 4x), and it 4x-resists Grass. The spread comes from the second types:
Flying (Crobat) takes Electric/Ice/Rock, Bug/Poison (Venomoth) takes Fire/Flying/Rock,
Water/Poison (Tentacruel) takes Electric/Ground/Psychic. So a Psychic starter is the
hard counter (Sabrina-style), and a Ground starter nearly is. Lower anti-cheese than
first claimed; accepted as canon-accurate for Koga. Nidoran lines reserved for Giovanni.
### Gym 6 - Sabrina (Psychic)   [ROSTER LOCKED 2026-10-22; Gen-1 only; moves/stacks still in gyms.js]

Source: games primary, anime secondary. Gen-1-ONLY. 6th slot = Gengar (her iconic
anime ghost ace); Jess accepts the overlap with Agatha (Ghost E4), who also wants the
Gastly line, choosing faithfulness over avoiding the shared line. (Espeon was
considered and rejected: it is a Gen-2 import, not a Gen-1 line-completion.)
Caveat: membership from recall + Jess; stats from pokeapi-master.

Slot | Line (base -> final)        | Types (final)  | BST (final) | Role / canon
-----|-----------------------------|----------------|-------------|---------------------------
  1  | Abra -> Kadabra -> Alakazam | Psychic        | 500         | signature ace (games + anime); SpA 135, Spe 120
  2  | Mr. Mime                    | Psychic/Fairy  | 460         | RBY + anime; barrier/support flavor
  3  | Drowzee -> Hypno            | Psychic        | 483         | RBY team; SpD-115 wall
  4  | Jynx                        | Ice/Psychic    | 455         | RBY team; adds Ice, special attacker
  5  | Slowpoke -> Slowbro         | Water/Psychic  | 490         | Water/Psychic, Def-110 wall, off-color profile
  6  | Gastly -> Haunter -> Gengar | Ghost/Poison   | 500         | her anime ace; SpA 130, Spe 110 (OVERLAPS Agatha, accepted)

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Abra      25/ 20/ 15/105/ 55/ 90 (310)   Kadabra  40/ 35/ 30/120/ 70/105 (400)
  Alakazam  55/ 50/ 45/135/ 95/120 (500)   Mr. Mime 40/ 45/ 65/100/120/ 90 (460)
  Drowzee   60/ 48/ 45/ 43/ 90/ 42 (328)   Hypno    85/ 73/ 70/ 73/115/ 67 (483)
  Jynx      65/ 50/ 35/115/ 95/ 95 (455)   Slowpoke 90/ 65/ 65/ 40/ 40/ 15 (315)
  Slowbro   95/ 75/110/100/ 80/ 30 (490)   Gastly   30/ 35/ 30/100/ 35/ 80 (310)
  Haunter   45/ 50/ 45/115/ 55/ 95 (405)   Gengar   60/ 65/ 60/130/ 75/110 (500)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the gym level):
  Loop 1: Abra/Kadabra/Alakazam line
  Loop 2: + Mr. Mime
  Loop 3: + Drowzee/Hypno line
  Loop 4: + Jynx
  Loop 5: + Slowpoke/Slowbro line
  Loop 6: Alakazam, Mr. Mime, Hypno, Jynx, Slowbro, Gengar   (full team)

OVERLAP NOTE: Gengar (Gastly line) is Gen-1's ONLY Ghost line, and Agatha (Ghost E4)
also fields it. Jess accepts a species appearing in both. When Agatha is authored,
decide whether she uses a different Gastly-line stage, a different Ghost mon, or shares
Gengar outright. Flagged so it is not a surprise.

Defensive spread (design note): mostly Psychic (Dark/Bug/Ghost-weak), with texture
from the dual-types: Jynx (Ice/Psychic, +Fire/Rock/Steel-weak), Slowbro (Water/Psychic),
Mr. Mime (Psychic/Fairy, Steel/Poison-weak), Gengar (Ghost/Poison, Dark/Ground/Psychic-
weak and immune to Normal/Fighting). A Dark starter hits most of the team; Gengar and
the dual-types keep it from being a clean single-type sweep.
### Gym 7 - Blaine (Fire)   [ROSTER LOCKED 2026-10-22; Gen-1 only; moves/stacks still in gyms.js]

Source: games primary, anime secondary. Gen-1-ONLY. The Gen-1 Fire pool has exactly six
non-legendary lines (Moltres excluded), so the roster is the whole pool and no off-type
is needed. Canon core: Growlithe/Arcanine, Ponyta/Rapidash, Magmar, Ninetales; Flareon
and Charizard are Jess's picks. Magmar is single-stage here (Magmortar is Gen 4, so the
line-completion rule does not allow it). Caveat: membership from Jess + recall; stats
from pokeapi-master.

Slot | Line (base -> final)              | Types (final) | BST (final) | Role / canon
-----|-----------------------------------|---------------|-------------|---------------------------
  1  | Growlithe -> Arcanine             | Fire          | 555         | signature ace; highest BST of the six
  2  | Ponyta -> Rapidash                | Fire          | 500         | fast physical (Spe 105)
  3  | Magmar                            | Fire          | 495         | special attacker (SpA 100); single stage
  4  | Vulpix -> Ninetales               | Fire          | 505         | SpD 100 / Spe 100 balanced
  5  | Flareon                           | Fire          | 525         | physical bruiser (Atk 130, SpD 110)
  6  | Charmander -> Charmeleon -> Charizard | Fire/Flying | 534       | capstone; the only non-mono-Fire mon

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Growlithe  55/ 70/ 45/ 70/ 50/ 60 (350)   Arcanine  90/110/ 80/100/ 80/ 95 (555)
  Ponyta     50/ 85/ 55/ 65/ 65/ 90 (410)   Rapidash  65/100/ 70/ 80/ 80/105 (500)
  Magmar     65/ 95/ 57/100/ 85/ 93 (495)   Vulpix    38/ 41/ 40/ 50/ 65/ 65 (299)
  Ninetales  73/ 76/ 75/ 81/100/100 (505)   Flareon   65/130/ 60/ 95/110/ 65 (525)
  Charmander 39/ 52/ 43/ 60/ 50/ 65 (309)   Charmeleon 58/ 64/ 58/ 80/ 65/ 80 (405)
  Charizard  78/ 84/ 78/109/ 85/100 (534)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the gym level):
  Loop 1: Growlithe/Arcanine
  Loop 2: + Ponyta/Rapidash
  Loop 3: + Magmar
  Loop 4: + Vulpix/Ninetales
  Loop 5: + Flareon
  Loop 6: Arcanine, Rapidash, Magmar, Ninetales, Flareon, Charizard   (full team)

Defensive spread (design note): five mono-Fire plus Charizard (Fire/Flying), so the
team is badly WATER-weak and ROCK-weak (Rock hits all six, Charizard at 4x), and
GROUND hits five of six (Charizard is immune). Electric hits only Charizard. A Water
starter walks this gym. Accepted by Jess (Mewtwo was considered as a patch and rejected;
see the legendary ruling in the rules section). Average final BST ~519, the highest of
any gym so far, so the power curve is already front-loaded; watch loop 6 tuning.

### Gym 8 - Giovanni (Ground)   [ROSTER LOCKED 2026-10-22; Gen-1 only; moves/stacks still in gyms.js]

Source: games primary. Gen-1-ONLY, and Jess's six are the RBY/Let's Go-style Giovanni
core with Marowak added. Uses the cross-roster reuse rule for RHYDON (also Brock's slot
2): Rhydon is Giovanni's canon ace, so it is kept. The Nidoran lines Koga left free are
used here as Nidoqueen and Nidoking. Persian is the canon off-type pick (Normal, the
Meowth line). Caveat: membership from Jess + recall; stats from pokeapi-master.

Slot | Line (base -> final)                    | Types (final)  | BST (final) | Role / canon
-----|------------------------------------------|----------------|-------------|---------------------------
  1  | Diglett -> Dugtrio                       | Ground         | 425         | glass cannon (Atk 100, Spe 120); a fair solo loop-1 fight
  2  | Cubone -> Marowak                        | Ground         | 425         | Def-110 wall; see lore note below
  3  | Meowth -> Persian                        | Normal         | 440         | OFF-TYPE, canon; Spe 115; the one mon Electric can hit
  4  | Nidoran(F) -> Nidorina -> Nidoqueen      | Poison/Ground  | 505         | bulky (HP 90) mixed attacker
  5  | Nidoran(M) -> Nidorino -> Nidoking       | Poison/Ground  | 505         | physical-leaning (Atk 102, SpA 85)
  6  | Rhyhorn -> Rhydon                        | Ground/Rock    | 485         | the ace; SHARED with Brock slot 2 (Atk 130, Def 120)

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Diglett    10/ 55/ 25/ 35/ 45/ 95 (265)   Dugtrio   35/100/ 50/ 50/ 70/120 (425)
  Cubone     50/ 50/ 95/ 40/ 50/ 35 (320)   Marowak   60/ 80/110/ 50/ 80/ 45 (425)
  Meowth     40/ 45/ 35/ 40/ 40/ 90 (290)   Persian   65/ 70/ 60/ 65/ 65/115 (440)
  Nidoran(F) 55/ 47/ 52/ 40/ 40/ 41 (275)   Nidorina  70/ 62/ 67/ 55/ 55/ 56 (365)
  Nidoqueen  90/ 92/ 87/ 75/ 85/ 76 (505)   Nidoran(M) 46/ 57/ 40/ 40/ 40/ 50 (273)
  Nidorino   61/ 72/ 57/ 55/ 55/ 65 (365)   Nidoking  81/102/ 77/ 85/ 75/ 85 (505)
  Rhyhorn    80/ 85/ 95/ 30/ 30/ 25 (345)   Rhydon   105/130/120/ 45/ 45/ 40 (485)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the gym level):
  Loop 1: Diglett/Dugtrio
  Loop 2: + Cubone/Marowak
  Loop 3: + Meowth/Persian
  Loop 4: + Nidoqueen line
  Loop 5: + Nidoking line
  Loop 6: Dugtrio, Marowak, Persian, Nidoqueen, Nidoking, Rhydon   (full team)

Lore note (Marowak): in Pokemon Tower, Team Rocket killed a Cubone's mother (the ghost
Marowak). Giovanni fielding a Marowak is dark irony or a lore slip depending on taste.
Jess kept it. Revisit if it reads wrong in play.

Defensive spread (design note): the lowest average BST of any gym (~464), as the Kanto
finale, so move stacks and level scaling carry its difficulty. WATER and ICE hit five of
six (Persian is Normal, so neither lands), Grass hits Dugtrio, Marowak and Rhydon (4x on
Rhydon), Psychic hits both Nidos, Fighting hits Persian and Rhydon. ELECTRIC is immune on
five of six (only Persian takes it), so Electric starters are walled hard: the gym's one
real anti-cheese edge, plus Persian as the single non-Ground mon. Rhydon is shared with
Brock, so a loop-6 player faces it in two gyms.

### Elite Four 1 - Lorelei (Ice)   [ROSTER LOCKED 2026-10-22; moves/stacks still in gyms.js]

Source: core-series teams (Bulbapedia, Serebii). Dewgong, Cloyster, Jynx, Lapras and
Slowbro are on her team in every Gen-1-era game. Mamoswine is the outside pick (her FRLG
rematch fields Piloswine). ALOLAN SANDSLASH (Ice/Steel) is her Let's Go rematch pick and
Jess wants it (2026-10-22), so it takes slot 6 and Slowbro is cut. Jess's earlier Alolan
Ninetales was dropped (not on her team).

Slot | Line (base -> final)                 | Types (final) | BST (final) | Role / canon
-----|--------------------------------------|---------------|-------------|---------------------------
  1  | Lapras                               | Water/Ice     | 535         | her ace in every game (HP 130)
  2  | Shellder -> Cloyster                 | Water/Ice     | 525         | Def-180 wall
  3  | Seel -> Dewgong                      | Water/Ice     | 475         | canon
  4  | Jynx                                 | Ice/Psychic   | 455         | canon; special attacker (SpA 115)
  5  | Swinub -> Piloswine -> Mamoswine     | Ice/Ground    | 530         | OUTSIDE pick (Piloswine FRLG rematch); Atk 130
  6  | Alolan Sandshrew -> Alolan Sandslash | Ice/Steel     | 450         | Let's Go rematch canon; ALOLAN form (needs dex support)

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Lapras    130/ 85/ 80/ 85/ 95/ 60 (535)   Shellder  30/ 65/100/ 45/ 25/ 40 (305)
  Cloyster   50/ 95/180/ 85/ 45/ 70 (525)   Seel      65/ 45/ 55/ 45/ 70/ 45 (325)
  Dewgong    90/ 70/ 80/ 70/ 95/ 70 (475)   Jynx      65/ 50/ 35/115/ 95/ 95 (455)
  Swinub     50/ 50/ 40/ 30/ 30/ 50 (250)   Piloswine 100/100/ 80/ 60/ 60/ 50 (450)
  Mamoswine 110/130/ 80/ 70/ 60/ 80 (530)   A-Sandshrew 50/ 75/ 90/ 10/ 35/ 40 (300)
  A-Sandslash 75/100/120/ 25/ 65/ 65 (450)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the authored level):
  Loop 1: Lapras
  Loop 2: + Shellder/Cloyster
  Loop 3: + Seel/Dewgong
  Loop 4: + Jynx
  Loop 5: + Swinub/Piloswine/Mamoswine
  Loop 6: Lapras, Cloyster, Dewgong, Jynx, Mamoswine, Alolan Sandslash   (full team)

Reuse: Lapras and Dewgong (Misty), Jynx (Sabrina). Fresh: Cloyster, Mamoswine, Alolan
Sandslash. Average final BST ~495.
Defensive spread (design note): three Water/Ice (Electric, Grass, Fighting, Rock weak),
Jynx (Fire, Rock, Steel, Bug, Ghost, Dark weak), Mamoswine (Fire, Water, Grass, Fighting,
Steel weak; Electric-IMMUNE) and Alolan Sandslash (Ice/Steel: Fire and Fighting 4x, Ground
2x, resists Grass). FIGHTING hits five of six (Jynx neutral), Grass four, Electric three
(Mamoswine immune); no single type clears the team, so a better spread than most gyms.

### Elite Four 2 - Bruno (Fighting)   [ROSTER LOCKED 2026-10-22; moves/stacks still in gyms.js]

Source: core-series teams. His Let's Go rematch is Onix, Hitmonchan, Hitmonlee, Poliwrath,
Golem (Alolan there), Machamp, which is Jess's list plus Hitmonchan; Steelix is the FRLG
rematch form of Onix. All Gen-1 except Steelix (Onix line-completion, already allowed).
Hitmontop (Johto Bruno) was considered and left out. Golem is the regular form (Rock/Ground)
standing in for the Alolan Rock/Electric Golem.

Slot | Line (base -> final)               | Types (final)  | BST (final) | Role / canon
-----|------------------------------------|----------------|-------------|---------------------------
  1  | Machop -> Machoke -> Machamp       | Fighting       | 505         | his ace in every game (Atk 130)
  2  | Hitmonlee                          | Fighting       | 455         | canon; Atk 120, SpD 110
  3  | Hitmonchan                         | Fighting       | 455         | canon; every game
  4  | Poliwag -> Poliwhirl -> Poliwrath  | Water/Fighting | 510         | Let's Go canon; shared with Misty
  5  | Onix                               | Rock/Ground    | 385         | canon in every game
     |   -> Steelix (line-completion; FRLG rematch) | Steel/Ground | 510 | Def-200 wall; shared with Brock slot 5
  6  | Geodude -> Graveler -> Golem       | Rock/Ground    | 495         | Let's Go rematch (Alolan there); shared with Brock slot 1

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Machop     70/ 80/ 50/ 35/ 35/ 35 (305)   Machoke   80/100/ 70/ 50/ 60/ 45 (405)
  Machamp    90/130/ 80/ 65/ 85/ 55 (505)   Hitmonlee 50/120/ 53/ 35/110/ 87 (455)
  Hitmonchan 50/105/ 79/ 35/110/ 76 (455)   Poliwag   40/ 50/ 40/ 40/ 40/ 90 (300)
  Poliwhirl  65/ 65/ 65/ 50/ 50/ 90 (385)   Poliwrath 90/ 95/ 95/ 70/ 90/ 70 (510)
  Onix       35/ 45/160/ 30/ 45/ 70 (385)   Steelix   75/ 85/200/ 55/ 65/ 30 (510)
  Geodude    40/ 80/100/ 30/ 30/ 20 (300)   Graveler  55/ 95/115/ 45/ 45/ 35 (390)
  Golem      80/120/130/ 55/ 65/ 45 (495)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the authored level):
  Loop 1: Machop/Machoke/Machamp
  Loop 2: + Hitmonlee
  Loop 3: + Hitmonchan
  Loop 4: + Poliwag line
  Loop 5: + Onix/Steelix
  Loop 6: Machamp, Hitmonlee, Hitmonchan, Poliwrath, Steelix, Golem   (full team)

Reuse: Poliwrath (Misty), Steelix (Brock), Golem (Brock). Fresh: Machamp, Hitmonlee,
Hitmonchan. Average final BST ~488.
Defensive spread (design note): three pure Fighting plus Poliwrath (Water/Fighting) means
FLYING and PSYCHIC each hit four of six (Steelix and Golem resist Flying), and Fairy hits
the same four. Steelix (Steel/Ground: Fire, Water, Fighting, Ground weak) and Golem
(Rock/Ground: Water and Grass 4x) are the ground-and-rock half; Steelix is Electric- and
Poison-immune. A Flying or Psychic starter clears the Fighting four, a Water starter
clears the back two, so no single type sweeps.

### Elite Four 3 - Agatha (Ghost)   [ROSTER LOCKED 2026-10-22; moves/stacks still in gyms.js]

Source: core-series teams. Her Gen-1 era teams are Poison-heavy (Gengar, Golbat, Arbok,
Haunter; Let's Go adds Weezing and Alolan Marowak), so a Poison-leaning Ghost roster is
canon. Mismagius is the outside pick (Misdreavus is on her core-series teams per
Bulbapedia trivia; the exact game was not confirmed). ALOLAN MAROWAK (Fire/Ghost, her
Let's Go rematch) is Jess's pick (2026-10-22) and takes slot 5, replacing Muk.

Slot | Line (base -> final)             | Types (final) | BST (final) | Role / canon
-----|----------------------------------|---------------|-------------|---------------------------
  1  | Gastly -> Haunter -> Gengar      | Ghost/Poison  | 500         | her ace (Gengar twice in most games); shared with Sabrina
  2  | Zubat -> Golbat -> Crobat        | Poison/Flying | 535         | Golbat canon; line-completion; shared with Koga
  3  | Ekans -> Arbok                   | Poison        | 448         | canon every game; shared with Koga
  4  | Koffing -> Weezing               | Poison        | 490         | Let's Go canon; shared with Koga
  5  | Cubone -> Alolan Marowak         | Fire/Ghost    | 425         | Let's Go rematch canon; ALOLAN form (needs dex support)
  6  | Misdreavus -> Mismagius          | Ghost         | 495         | OUTSIDE pick; the pure-Ghost, non-Poison profile

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Gastly     30/ 35/ 30/100/ 35/ 80 (310)   Haunter   45/ 50/ 45/115/ 55/ 95 (405)
  Gengar     60/ 65/ 60/130/ 75/110 (500)   Zubat     40/ 45/ 35/ 30/ 40/ 55 (245)
  Golbat     75/ 80/ 70/ 65/ 75/ 90 (455)   Crobat    85/ 90/ 80/ 70/ 80/130 (535)
  Ekans      35/ 60/ 44/ 40/ 54/ 55 (288)   Arbok     60/ 95/ 69/ 65/ 79/ 80 (448)
  Koffing    40/ 65/ 95/ 60/ 45/ 35 (340)   Weezing   65/ 90/120/ 85/ 70/ 60 (490)
  Cubone     50/ 50/ 95/ 40/ 50/ 35 (320)   A-Marowak 60/ 80/110/ 50/ 80/ 45 (425)
  Misdreavus 60/ 60/ 60/ 85/ 85/ 85 (435)   Mismagius 60/ 60/ 60/105/105/105 (495)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the authored level):
  Loop 1: Gastly/Haunter/Gengar
  Loop 2: + Zubat/Golbat/Crobat
  Loop 3: + Ekans/Arbok
  Loop 4: + Koffing/Weezing
  Loop 5: + Cubone/Alolan Marowak
  Loop 6: Gengar, Crobat, Arbok, Weezing, Alolan Marowak, Mismagius   (full team)

Reuse: Gengar (Sabrina), Crobat, Arbok and Weezing (all Koga). Fresh: Alolan Marowak
(a different form from Giovanni's Marowak) and Mismagius. Average final BST ~482.
Defensive spread (design note): Psychic hits four of six (the four Poison mons), Ground
hits four (Crobat is immune; Alolan Marowak is Ground-weak), Ghost and Dark hit Gengar,
Alolan Marowak and Mismagius, and Water/Rock hit Alolan Marowak. Gengar and Mismagius are
Normal- and Fighting-immune. Psychic is still the best single type but no longer clears
five of six, a better spread than Koga's.

### Elite Four 4 - Lance (Dragon)   [ROSTER LOCKED 2026-10-22; moves/stacks still in gyms.js]

Source: core-series teams. Dragonite, Aerodactyl, Gyarados, Charizard (GSC, Let's Go) and
Dragonair (RBY, FRLG) are canon. Kingdra passes the outside test via Seadra (Lance's Let's
Go team). Slot 6 uses the PINNED-STAGE rule: the Dratini line, always Dragonair, mirroring
his Red/Blue/Yellow pairing of Dragonair next to Dragonite.

Slot | Line (base -> final)                 | Types (final)  | BST (final) | Role / canon
-----|--------------------------------------|----------------|-------------|---------------------------
  1  | Dratini -> Dragonair -> Dragonite    | Dragon/Flying  | 600         | his ace in every game (Atk 134); highest BST in the doc
  2  | Aerodactyl                           | Rock/Flying    | 515         | canon every game; shared with Brock
  3  | Magikarp -> Gyarados                 | Water/Flying   | 540         | canon every game; shared with Misty
  4  | Charmander -> Charmeleon -> Charizard | Fire/Flying   | 534         | GSC and Let's Go canon; shared with Blaine
  5  | Horsea -> Seadra -> Kingdra          | Water/Dragon   | 540         | Seadra canon (Let's Go); Kingdra by line-completion
  6  | Dratini -> Dragonair (PINNED)        | Dragon         | 420         | pinned stage: never evolves; second slot of slot 1's line

Base-stat reference (pokeapi-master; HP/Atk/Def/SpA/SpD/Spe):
  Dratini    41/ 64/ 45/ 50/ 50/ 50 (300)   Dragonair 61/ 84/ 65/ 70/ 70/ 70 (420)
  Dragonite  91/134/ 95/100/100/ 80 (600)   Aerodactyl 80/105/ 65/ 60/ 75/130 (515)
  Magikarp   20/ 10/ 55/ 15/ 20/ 80 (200)   Gyarados  95/125/ 79/ 60/100/ 81 (540)
  Charmander 39/ 52/ 43/ 60/ 50/ 65 (309)   Charmeleon 58/ 64/ 58/ 80/ 65/ 80 (405)
  Charizard  78/ 84/ 78/109/ 85/100 (534)   Horsea    30/ 40/ 70/ 70/ 25/ 60 (295)
  Seadra     55/ 65/ 95/ 95/ 45/ 85 (440)   Kingdra   75/ 95/ 95/ 95/ 95/ 85 (540)

Per-loop lineup (count = loop number; ALL fielded at once; stage per the authored level):
  Loop 1: Dratini/Dragonair/Dragonite
  Loop 2: + Aerodactyl
  Loop 3: + Magikarp/Gyarados
  Loop 4: + Charmander/Charmeleon/Charizard
  Loop 5: + Horsea/Seadra/Kingdra
  Loop 6: Dragonite, Aerodactyl, Gyarados, Charizard, Kingdra, Dragonair   (full team)

Reuse: Aerodactyl (Brock), Gyarados (Misty), Charizard (Blaine). Fresh: Dragonite, Kingdra,
Dragonair. Average final BST ~525, the highest of any roster; loop 6 is a tuning watch item.
Defensive spread (design note): five of six are Flying or Dragon, but the weaknesses
scatter: Rock hits four (Charizard 4x), Ice hits three (Dragonite 4x), Electric hits three
(Gyarados 4x), Dragon and Fairy hit Dragonite, Kingdra and Dragonair. No single type
clears the team, the best anti-cheese spread of any roster so far.

- Champion - (not in Kanto's list for now; BOSS-REWORK section 4)

Note: Elite Four levels are HARD-SET per encounter (authored, not clock-based;
BOSS-REWORK section 4), unlike gyms whose level is clock-based. Their rosters still
follow the same six-line / loop-N-fields-first-N rule.

---

## Other regions            [TBD - one section per region, same format]

Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Paldea. Each gets the same
six-slot roster-line structure when authored. Per-region legendary counts and the
loop/legendary scope are in docs/FULL-GAME-STRUCT.md.
