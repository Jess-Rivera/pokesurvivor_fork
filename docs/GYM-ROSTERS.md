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

Note (2026-10-22): slot 5 takes the line-completion rule — Onix caps at STEELIX
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
options — Politoed, Lanturn, Quagsire — were Gen 2 and are swapped for Gen-1 lines).
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
Water/Ice x2. The whole team is ELECTRIC-weak and most are Grass-weak — there is no
Gen-1 Water/Ground to patch it (that was the cut Quagsire's job), so a Gen-1 Misty is
genuinely hard-countered by an Electric or Grass starter. Canon-accurate for an early
Water gym; flagged as a lower anti-cheese spread than the mixed-gen version.
### Gym 3 - Lt. Surge (Electric)   [ROSTER LOCKED 2026-10-22; Gen-1 only; moves/stacks still in gyms.js]

Source: games primary, anime secondary. Gen-1-ONLY. NOTE: the Gen-1 Electric pool is
tiny — only 8 non-legendary species (Pikachu/Raichu, Voltorb/Electrode,
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

Defensive spread (design note): mostly mono-Electric (shared Ground weakness — a
Ground starter walks this gym), with two exceptions that add texture: Magneton
(Electric/Steel, no Ground immunity but many resistances) and the off-type Porygon
(Normal, NOT Ground-weak — the one mon a Ground starter cannot shred; Fighting-weak
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
badly FIRE-weak and FLYING-weak (Parasect is 4x Fire-weak as Bug/Grass) — a Fire or
Flying starter walks this gym, which is canon-accurate for Erika. The two breaks in
the pattern: Exeggutor (Grass/Psychic — Bug/Ghost/Dark/Fire-weak, not Flying-weak the
same way) and Tangela (pure Grass, Def-115 wall). Low anti-cheese vs Fire/Flying by
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
  6  | Tentacool -> Tentacruel        | Water/Poison   | 515         | Water/Poison; special-bulk (SpD 120); breaks the Psychic-weak pattern

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

Defensive spread (design note): better than Erika's uniform fold, because Poison's
dual-typings scatter the weaknesses. Psychic hits most (pure-Poison Weezing/Muk/Arbok
and Bug/Poison Venomoth, which is 4x Psychic-weak), BUT Crobat (Poison/Flying,
Ground-immune, fast) and Tentacruel (Water/Poison) are not clean Psychic sweeps, and
Ground hits Weezing/Muk/Arbok but NOT Crobat (Flying) or Tentacruel. So no single
starter type clears all six. Nidoran lines reserved for Giovanni.
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
### Gym 7 - Blaine (Fire)            [ROSTER TBD]
### Gym 8 - Giovanni (Ground)        [ROSTER TBD]

### Elite Four + Champion            [ROSTERS TBD]
- E4 1 - Lorelei (Ice)
- E4 2 - Bruno (Fighting)
- E4 3 - Agatha (Ghost)
- E4 4 - Lance (Dragon)
- Champion - (not in Kanto's list for now; BOSS-REWORK section 4)

Note: Elite Four levels are HARD-SET per encounter (authored, not clock-based;
BOSS-REWORK section 4), unlike gyms whose level is clock-based. Their rosters still
follow the same six-line / loop-N-fields-first-N rule.

---

## Other regions            [TBD - one section per region, same format]

Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Paldea. Each gets the same
six-slot roster-line structure when authored. Per-region legendary counts and the
loop/legendary scope are in docs/FULL-GAME-STRUCT.md.
