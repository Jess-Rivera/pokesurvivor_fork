# BOSS-AUTHORING, how to write a gym or Elite Four encounter (DRAFT schema, 2026-10-19)

- **Role:** Authoring format and validation for writing a gym or Elite Four encounter.
- **Owns:** The authoring template and which fields the game derives.
- **Does not own:** Roster contents (docs/GYM-ROSTERS.md); progression and encounter rules (BOSS-REWORK.md); combat rules (docs/COMBAT-RULES.md).
- **Status home:** STATE.md.
- **Implemented for Brock:** the schema is implemented for Kanto gym 1, Brock (js/data/gyms.js); other gyms and the Elite Four are not authored in game data yet.
- **Last reconciled:** not yet

This is the human-friendly form you fill in. Claude turns it into game data later (js/data/gyms.js, propose-first since it is game data).
Design background: BOSS-REWORK.md sections 3, 3a and 4. Built so far (2026-10-22): Kanto gym 1, Brock, with the full six-slot roster in js/data/gyms.js (slots 2 to 6 have provisional moves). Roster design for every gym and Elite Four member: docs/GYM-ROSTERS.md.

## What you author and what the game derives

You author (per encounter):
- who the leader is, the arena type, the badge name
- the ordered list of signature Pokemon
- for each signature: species, stance, and 1 to 4 catalog moves with optional hints
- Elite Four only: the hard-set level

The game derives (never type these):
- Level: a gym is run-time level + 4, locked when its gate spawns and shown on the gate. An Elite Four member uses the level you write.
- HP: species HP at that level times the tier HP multiplier (set by the 20 to 30 s time-to-kill target).
- Damage: the move's Power and category, the species Attack or Sp. Atk at that level, the player's defense, the type chart, times the tier power multiplier.
- Size: from the tier table (sized up, 0.5 steps).
- Cooldowns and telegraph timing: from the catalog and the kind's boss form (BOSS-REWORK.md 3a).
- The badge package (boost, guaranteed item, guaranteed level, a Bond, and the full revive for gym leaders only) comes from the tier table. Override only if you want a specific badge to differ.

## Encounter fields

| Field | Values | Notes |
|---|---|---|
| id | short slug, for example kanto-gym-1 | unique, used by save data and logs |
| kind | gym, elite4 | champion can be added later |
| leader | display name | for example Brock |
| arena | a type name | picks the arena tint, for example rock |
| badge | display name | gyms and Elite Four both give the package |
| level | a number | ELITE FOUR ONLY, hard-set. Leave out for gyms. |
| boost | stat and percent | optional override of the badge's run boost |
| signatures | ordered list, 1 to 6 | order matters: loop N fields the first N at once (G.Gyms.lineup) |

## Move stacks (added 2026-10-19)

A move line may carry `stacks`: upgrade-card stacks the move has, by mechanic id (effect, recharge, count, pierce, area, width, arc, size, range, speed, duration, knock, stacks), for example `rock-throw | 3 | any | stacks: effect 3, count 2, recharge 2`. They use the same rules as the player's cards, so only stacks the move can really take are allowed (the validator checks each one in order). This is what makes a leader's move a leveled-up player move instead of a stat bump.

## Signature fields

Optional tuning fields (added 2026-10-19, default 1, range above 0 up to 5): `power` multiplies the leader's damage and `tempo` multiplies its attack rate (shorter wind-up, recovery and cooldown). Brock uses power 2 and tempo 1.4.

| Field | Values | Notes |
|---|---|---|
| line | the evolution line, base form first, for example Geodude > Graveler > Golem | stored in gyms.js as a stage ladder of national dex numbers, each with the level it appears at; every dex must exist in the Pokedex |
| stance | close, far, mixed | where it likes to fight. Default mixed. |
| moves | 1 to 4 lines, see below | catalog moves only |
| fury | optional: hpBelow 50, plus any of speed, cooldown, damage percents | OFF by default. Pending your OK. |

## Stage ladders (added 2026-10-22)

A signature is a roster SLOT, and a slot is an evolution LINE. The stage it shows is the last stage whose level is at or below the gym's effective level (the locked gym level plus any gate-escalation bump), so a slot evolves as the level climbs and evolution requirements are ignored. Default bands (placeholder, TUNE): a 2-stage line shows its final form at level 35, a 3-stage line shows its mid form at 20 and its final form at 35. A line can override the levels. The first stage always starts at level 1. Moves, stance, power and tempo belong to the slot, so one move set serves every stage.

## Validation rules (enforced by G.Gyms.validate, swept by docs/proposals/gym-harness.js)

- every move id exists in the catalog; the move's kind must have a BOSS FORM that is built. Today only melee, projectile and buff are built (Enemy.gymCast: melee and buff have their own form, every other kind falls through to the projectile path), so G.Gyms.BOSS_FORMS lists exactly those three. Add a kind there only when its boss form is built and tested.
- 1 to 4 moves per slot, at least one damaging move, weight above 0, range close, far or any, optional hpBelow, stacks accepted by the real upgrade rules
- stance close, far or mixed; power and tempo above 0 up to 5
- stage ladder non-empty, first stage at level 1, levels strictly increasing integers, every dex real
- unknown fields on a gym, slot or move are rejected (catches typos)

## Move line fields

One line per move: `move-id | weight | range | only below X% HP`

| Part | Values | Default |
|---|---|---|
| move-id | an id from js/data/moves.js, for example rock-throw | required |
| weight | a number, how often it is picked | 1 |
| range | close, far, any | any |
| only below | a percent of the signature's HP | none |

Rules the converter will enforce (it stops and tells you instead of guessing):
- every move-id must exist in the catalog, and its kind must have a boss form that is built (first wave: projectile, cone, nova, melee, dash, beam, meteor, self-buff; the second wave adds aura, mine, trail, boomerang, chain, orbit; turret moves are inert)
- 1 to 4 moves per signature, at least one damaging move
- an Elite Four entry must have a level, a gym entry must not
- a species can repeat across leaders

## Template

```
### <id>: <Leader> (<arena type>)
kind: gym | elite4
badge: <Badge name>
level: <Elite Four only>
signatures:
1. <Species>
   stance: close | far | mixed
   moves:
   - <move-id> | <weight> | <range> | <only below %>
   - <move-id>
2. <Species>
   ...
```

## Pilot entry: Brock (Jess's choice, 2026-10-19)

Loop 1 uses the FIRST signature only, so the pilot is Geodude alone. Canon has Tackle and Defense Curl; Defense Curl is not in the catalog, so Harden stands in, and Jess added Rock Throw. Weights and ranges below are proposals, edit freely. Onix (signature #2) is added later, when Keep Going exists.

```
### kanto-gym-1: Brock (rock)
kind: gym
badge: Boulder Badge
boost: atk +10%   (run-long, whole team; stat is hp, atk, def, spa, spd or spe)
signatures:
1. Geodude
   stance: mixed
   moves:
   - tackle | 2 | close
   - rock-throw | 3 | any
   - harden | 1 | any
```

Notes: Geodude is Rock/Ground, base stats 40/80/100/30/30/20 (BST 300). Gym 1 spawns at 4:00, so its level is clock level at 4:00 (about 7.5) + 4, roughly L11 or L12 (rounding rule TBD). Speed 20 makes it nearly stationary, so Tackle will rarely land and Rock Throw carries the fight.

## Catalog moves available today (js/data/moves.js)

normal: tackle, quick-attack, body-slam, hyper-voice, swords-dance, agility, harden, substitute
rock: rock-throw, rock-slide. ground: mud-shot, bulldoze, bonemerang, spikes. water: water-gun, bubble, bubble-beam, hydro-pump, aqua-ring
electric: thunder-shock, discharge, thunderbolt. grass: vine-whip, razor-leaf, leaf-storm, giga-drain. poison: sludge, poison-sting, toxic, toxic-spikes
psychic: confusion, psybeam, psychic, psycho-cut. fire: ember, flamethrower, fire-spin, heat-wave, will-o-wisp, flame-wheel
ice: ice-beam, powder-snow, hail. fighting: karate-chop, aura-sphere. ghost: lick, shadow-ball, hex. dragon: dragon-rage, dragon-dance
flying: gust, wing-attack, aerial-ace. bug: bug-bite, string-shot, bug-buzz. steel: metal-claw, flash-cannon, meteor-mash
dark: bite, dark-pulse, night-shade. fairy: fairy-wind, dazzling-gleam
