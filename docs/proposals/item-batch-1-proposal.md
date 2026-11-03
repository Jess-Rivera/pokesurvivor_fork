# Item batch 1 proposal (feature/item-rework-v2)

Status: [Proposed], 2026-11-03. Nothing here is built. Jess's later rulings and corrected hooks are in docs/proposals/item-rework-v2-handoff.md, which wins where they differ. Effects are drafted from pokeapi (pokeapi-master/data/v2/csv: items, item_prose, berries, item_categories) and adapted to survivor play. Every number is a placeholder for Jess to edit.
Feasibility notes come from the code I have read (the Player.hurt type-guard path, stage trackers and team timers, hasItem hooks, the drop table). I have not read every hook, so "check" means verify before building.

## Berries: we already have the playable ones

pokeapi lists 68 berries. We have 37 (both heals, 18 type guards, 5 pinch stat berries, Starf, Lansat, Kee, Maranga, Pinap, 7 status cures), plus our own Silver and Golden Pinap tiers. Of the 31 missing, 20 do nothing in play (Pokeblock and Poffin ingredients, EV-reducing berries). The real gaps are below, so "more berries" is a short list.

## Ground items (new)

Weights are shares of the ground pool, which must total 100, so the existing items would scale down by about 20%. Total new weight here is 19.5.

| Item | Source (pokeapi) | Proposed effect | Weight | Feasibility |
| --- | --- | --- | --- | --- |
| Enigma Berry | held, heals 1/4 when hit super-effectively | 10 s: the first super-effective hit the team takes heals 25% max HP, then it is used up | 1.5 | fits the guard-berry hit path |
| Jaboca Berry | held, hurts attacker when hit physically | 10 s: enemies that hit you physically take 12.5% of their max HP (bosses, elites, gyms capped at a wild unit's HP at that level, like the bomb) | 1.5 | fits the hit path, check enemy attack category |
| Rowap Berry | same, special hits | same as Jaboca for special hits | 1.5 | same |
| White Herb | resets lowered stats | Clears every lowered stat stage on the team | 2 | fits stage trackers |
| Guard Spec. | no stat changes for 5 turns | 30 s: enemies cannot lower your stat stages | 2 | check, needs a stage-lowering guard |
| Dire Hit | raises crit chance | 30 s: team crit +10% (X item family) | 3 | fits (Lansat already adds crit) |
| Max Mushrooms | raises all stats | 30 s: all five stats +1 stage, team | 1 | fits (X item style) |
| Revive | revives with half HP | Revives one fainted teammate at 50% HP. Cannot be picked up while nobody is fainted (it waits on the ground, like a full berry bag) | 2 | check a single-revive call; reviveTeam exists |
| Max Revive | revives with full HP | Same at 100% HP | 1 | same |
| Sacred Ash | revives all fainted, full HP | Revives every fainted teammate at 100% HP | 0.5 | same |
| Leppa Berry | restores PP | Resets all move cooldowns now | 2 | check the cooldown API |
| Custap Berry | moves first | 10 s: move cooldowns tick 50% faster | 1.5 | check, cdMul exists for items |

Skipped on purpose:
- Figy, Wiki, Mago, Aguav, Iapapa: five berries that all heal 12.5% and only differ by flavour. Oran and Sitrus already cover healing.
- Micle Berry (accuracy): blocked on the accuracy trackers slice (Smokescreen), same as X Accuracy.
- Potions, Fresh Water, Lemonade and the rest: healing is covered. An optional rare Max Potion (full heal) or Full Restore (full heal plus cures) could be added if you want a third heal tier.
- Gems (18, one-shot 1.5x on the next move of a type): needs a new "next N hits" counter. Better as its own slice.

## Pokemon items (new)

Drop chance is uniform across the tier (1 in 36 now), so adding 12 items dilutes every existing one to 1 in 48.

| Item | Source (pokeapi) | Proposed effect | Feasibility |
| --- | --- | --- | --- |
| Focus Band | 10% to survive a hit at 1 HP | 10% chance to survive a lethal hit at 1 HP, no cooldown (Focus Sash stays once per minute at full HP) | fits the Focus Sash hook |
| Weakness Policy | +2 Atk and Sp. Atk when hit super-effectively | Holder only: when it takes a super-effective hit, Atk and Sp. Atk +2 for 10 s, 30 s cooldown | fits the hit path and stages |
| Absorb Bulb | +1 Sp. Atk when hit by Water | Holder: hit by a Water move, Sp. Atk +1 for 10 s | fits |
| Cell Battery | +1 Atk when hit by Electric | same with Electric and Atk | fits |
| Luminous Moss | +1 Sp. Def when hit by Water | same with Water and Sp. Def | fits |
| Snowball | +1 Atk when hit by Ice | same with Ice and Atk (our run item is also named Snowball Badge, keep the names distinct) | fits |
| Covert Cloak | blocks added effects of moves | Holder ignores statuses and stat drops from enemy hits | check against the status path |
| Shed Shell | escapes trapping | Holder is immune to the trap status | fits (trap is in COMBAT-RULES) |
| Eviolite | 1.5x Def and Sp. Def if not fully evolved | Same 1.5x, only while the holder's species can still evolve | check, needs evolution data |
| Bright Powder | +11% evasion | Adapted: dodge cooldown 15% shorter | fits the dodge system |
| King's Rock | 10% flinch | 10% of hits flinch the target | check, is flinch in the status model? |
| Eject Button | swaps out when hit | When the holder is hit, it swaps to the next teammate (cooldown 20 s) | check the swap rule in COMBAT-RULES |

Species-locked items (decision needed): Light Ball (Pikachu, 2x Atk and Sp. Atk), Thick Club (Cubone and Marowak, 2x Atk), Lucky Punch (Chansey, +2 crit stages), Leek (Farfetch'd, +2 crit stages), and later Metal Powder and Quick Powder (Ditto). They need an item that only works for one species, and the drop roll should only pick items some roster member can use, or most drops would be dead. This is a bigger feature than a data change, so I'd treat it as its own slice.

Held for later (need new systems): Choice Specs (see the open question below), Metronome, Punching Glove, Loaded Dice (need move flags), Air Balloon, Red Card, the Seeds (terrain), and the weather rocks (no weather yet).

## Run items (new)

Today there are 25 run items, but 18 are the Power Stones, so there are only 7 distinct effects. For a run-only boss pool we need variety. These are the ones I could draw from pokeapi that fit a team-wide, whole-run role.

| Item | Source (pokeapi) | Proposed effect | Feasibility |
| --- | --- | --- | --- |
| Shiny Charm | raises shiny chance | Shiny spawn rate x3 | fits the spawner shiny roll, check |
| Dowsing Machine | finds hidden items | Wild ground item drop rate +0.5 points (1% to 1.5%), like a permanent Pinap (Jess, 2026-11-03, was +1) | fits (the drop bonus already exists) |
| Berry Pouch | holds berries | +1 status berry bag slot for the run | fits (berry slots exist) |
| Berry Pots | grows berries | Timed berry effects last 50% longer (10 s to 15 s) | fits the berry duration constant |
| Smoke Ball | escape from battle | +1 dodge charge (2 to 3) | fits the dodge system |
| Mach Bike | fast travel | +15% move speed | fits (a speed multiplier exists) |
| White Flute | doubles wild encounter rate | Wild spawn rate x2 (more XP and drops, more danger) | check, balance-sensitive |
| Black Flute | halves wild encounter rate | Wild spawn rate x0.5 (calmer, slower leveling) | check, balance-sensitive |
| Vs. Seeker | rebattle trainers | Elites appear 25% sooner | check, elite cadence is TEMP |

That brings the total to 34 run items (16 distinct effects). Future flagship ideas, not in this batch: Mega Ring or Dynamax Band (needs a transformation system and art).

## Decisions (Jess, 2026-11-03)

- This first pass is ground and Pokemon items only. Run items are a second pass (the run item table above is parked).
- No species-locked items. Their icons become survivor-style items, proposed below.
- Choice Band becomes physical-only (+40% physical damage), Choice Specs is special-only (+40% special damage). Both keep the move lock. [Approved] Needs a check of how moves are tagged physical or special, and Band loses power for special users.
- Gems are delayed to a later slice.

## What is in the first pass now

- Ground items: the 12 rows above. Total weight 19.5, existing ones scale down about 20%.
- Pokemon items: the 12 rows above, plus Choice Specs, plus the repurposed icons below (17 new, 53 in the tier, each existing item drops 1 in 53 instead of 1 in 36).

| Item | Icon from | Proposed survivor effect | Feasibility |
| --- | --- | --- | --- |
| Thick Club | Cubone and Marowak item | +30% physical damage, 10% slower moves | fits the damage and speed multipliers |
| Light Ball | Pikachu item | +30% special damage, 10% slower moves | same |
| Lucky Punch | Chansey item | +15% crit chance | fits (Scope Lens and Razor Claw add crit) |
| Leek | Farfetch'd item | Critical hits deal 50% more damage | check, needs a crit damage multiplier |

Optional, not counted above: Metal Powder (+15% Def and Sp. Def) and Quick Powder (+15% speed), same idea.

## Still open

1. Which rows to cut from the 17 Pokemon items and 12 ground items, and any number changes.
2. Add Metal Powder and Quick Powder?
