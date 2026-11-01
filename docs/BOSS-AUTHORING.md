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

## Cards (slice 7a, 2026-10-31; replaces the per-move stacks of 2026-10-19)

A slot (signature) may carry `cards`: the player's upgrade cards by id from G.TeamCards (damage, count, velocity, area, presence, reach, cooldown, pierce, knockback, ailment...), for example `cards: damage 3, count 2, velocity 3, area 2`. They are held by that mon only and folded by the same rules as the player's cards, so a card applies to every one of the mon's moves it fits (Area Up grows both Tackle's reach and Rock Throw's rocks). No team cards (Gate, Duration, Regen, Vitamins). The validator rejects an unknown card, a team card, stacks over a card's cap and a card that fits none of the mon's moves. A leader mon plays like the player: its moves autocast on their own cooldowns through G.MoveSim, pure buffs on their Gate, with a tell before every attack (BOSS-REWORK section 3d).

## Signature fields

Optional tuning fields (added 2026-10-19, default 1, range above 0 up to 5): `power` multiplies the leader's damage and `tempo` divides its cooldowns, tells and recovery. Current values: see js/data/gyms.js.

| Field | Values | Notes |
|---|---|---|
| line | the evolution line, base form first, for example Geodude > Graveler > Golem | stored in gyms.js as a stage ladder of national dex numbers, each with the level it appears at; every dex must exist in the Pokedex |
| stance | close, far, mixed | where it likes to fight. Default mixed. |
| cards | upgrade cards by id and stacks, see above | optional; per mon |
| moves | 1 to 4 lines, see below | ids from the new move data (G.MoveDefs) with a gym form |
| fury | optional: hpBelow 50, plus any of speed, cooldown, damage percents | OFF by default. Pending your OK. |

## Stage ladders (added 2026-10-22)

A signature is a roster SLOT, and a slot is an evolution LINE. The stage it shows is the last stage whose level is at or below the gym's effective level (the locked gym level plus any gate-escalation bump), so a slot evolves as the level climbs and evolution requirements are ignored. Default bands (placeholder, TUNE): a 2-stage line shows its final form at level 35, a 3-stage line shows its mid form at 20 and its final form at 35. A line can override the levels. The first stage always starts at level 1. Moves, stance, power and tempo belong to the slot, so one move set serves every stage.

## Validation rules (enforced by G.Gyms.validate, swept by docs/proposals/gym-harness.js)

- every move id exists in the new move data and has a GYM FORM (G.Gyms.formOf): a melee cone (caster radial shape aimed at the nearest foe), a straight shot (travels along the aim) or a pure self buff. Beams, novas, falls, emitters, chains, dashes and persistent moves have no form yet. Add a form only when the GymBrain (js/entities/boss-ai.js) casts it and a harness covers it.
- 1 to 4 moves per slot, at least one damaging move, optional hpBelow in (0, 1); cards as above
- stance close, far or mixed; power and tempo above 0 up to 5
- stage ladder non-empty, first stage at level 1, levels strictly increasing integers, every dex real
- unknown fields on a gym, slot or move are rejected (catches typos)

## Move line fields

One line per move: `move-id | only below X% HP` (weight and range are gone since slice 7a: every move autocasts on its own cooldown)

| Part | Values | Default |
|---|---|---|
| move-id | an id from the new move data, for example rock-throw | required |
| only below | a percent of the signature's HP: the move joins the mon's moves only below it | none |

Rules the converter will enforce (it stops and tells you instead of guessing):
- every move-id must exist in the new move data and have a gym form (see the validation rules)
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
   cards: <card> <stacks>, ...
   moves:
   - <move-id> | <only below %>
   - <move-id>
2. <Species>
   ...
```

## Pilot entry: Brock (Jess's choice, 2026-10-19)

Loop 1 uses the FIRST signature only, so the pilot is Geodude alone. Canon has Tackle and Defense Curl; Defense Curl is not in the catalog, so Harden stands in, and Jess added Rock Throw. Cards chosen by Jess 2026-10-31 (slice 7a).

```
### kanto-gym-1: Brock (rock)
kind: gym
badge: Boulder Badge
boost: atk +10%   (run-long, whole team; stat is hp, atk, def, spa, spd or spe)
signatures:
1. Geodude
   stance: mixed
   cards: damage 3, count 2, velocity 3, area 2
   moves:
   - tackle
   - rock-throw
   - harden
```

Notes: Geodude is Rock/Ground, base stats 40/80/100/30/30/20 (BST 300). Gym 1 spawns at 4:00, so its level is clock level at 4:00 (about 7.5) + 4, roughly L11 or L12 (rounding rule TBD). Speed 20 makes it nearly stationary, so Rock Throw carries the fight. With the cards: Tackle Power 52, reach 70 px; Rock Throw Power 58.5, 3 rocks of 11.7 px at 377 px/s; Harden climbs to +6 Defense in about 30 s.

## Catalog moves available today (js/data/moves.js)

normal: tackle, quick-attack, body-slam, hyper-voice, swords-dance, agility, harden, substitute
rock: rock-throw, rock-slide. ground: mud-shot, bulldoze, bonemerang, spikes. water: water-gun, bubble, bubble-beam, hydro-pump, aqua-ring
electric: thunder-shock, discharge, thunderbolt. grass: vine-whip, razor-leaf, leaf-storm, giga-drain. poison: sludge, poison-sting, toxic, toxic-spikes
psychic: confusion, psybeam, psychic, psycho-cut. fire: ember, flamethrower, fire-spin, heat-wave, will-o-wisp, flame-wheel
ice: ice-beam, powder-snow, hail. fighting: karate-chop, aura-sphere. ghost: lick, shadow-ball, hex. dragon: dragon-rage, dragon-dance
flying: gust, wing-attack, aerial-ace. bug: bug-bite, string-shot, bug-buzz. steel: metal-claw, flash-cannon, meteor-mash
dark: bite, dark-pulse, night-shade. fairy: fairy-wind, dazzling-gleam
