# Move System Plan

Oct 23, 2026 · @Jess Rivera

Moves are built from a flat PokeAPI import plus eleven small attributes, so one resolver and a set of engine primitives replace a hand-coded function per kind.

## Files

Four data files and one resolver. Only the first is generated, so a regenerate can never overwrite your work.

| File | Holds | Written by |
| --- | --- | --- |
| move-data-raw.js | Flat PokeAPI facts: type, power, pp, accuracy, priority, target, class, flags, ailment, stat changes, drain, healing, hit counts, description | Generated from the CSVs |
| move-attributes.js | The attribute vocabulary: every value of every attribute, mapped to an engine primitive id plus default parameters | You (changes rarely) |
| move-classification.js | Per move: its kind preset plus only the attributes that differ from that preset | Drafted by a build tool for moves with no entry yet, then owned by you |
| move-overrides.js | Hand-tuned numbers (radius, speed, count, cooldown, damage multiplier), per move or per kind | You |
| Resolver (code) | Merges the four at load into the final move table | Code |

Load order is raw, then classification, then numbers derived by formula from power, pp and the attributes, then overrides. Later layers win. The build tool is merge-only: it drafts entries for moves that have none and never touches an entry you have reviewed. Your existing hand-tuned moves become override entries. The resolver runs at load (it works from file:// like the tilesets) and check.js runs the same resolver to validate everything.

## Move attributes

Eleven attributes with plain-word values. The file uses the words; the engine interns them into small integer constants at load, so checks are number comparisons.

| Attribute | Values | Set by |
| --- | --- | --- |
| effect | damage, buff, heal, debuff, shield, field | Derived from category and effect in the raw data |
| side | self, ally, foe | Derived from effect (damage and debuff are foe; buff, heal, shield are self or ally) |
| hitCap | A number: 1 = one target (or yourself), N = up to N, unlimited = no cap | Hand-set; replaces single, multi and area. Pierce folds into it |
| reach | touch, near, far | Mostly derived from the contact flag and target; skipped when side is self |
| shape | point, scatter, line, arc, circle, cone | Hand-set, defaulted by kind; skipped for self-only moves and fields |
| lifetime | instant, timed, persistent, untilTriggered | Hand-set, defaulted by kind |
| anchor | caster, target, world | Hand-set; replaces follows user and follows target |
| motion | static, travels, falls, returns, orbits, repositions | Hand-set, defaulted by kind |
| expanding | true, false | Hand-set |
| splash | true, false | Hand-set; off by default; never guessed by the importer |
| tracking | true, false | Hand-set; off by default; never guessed by the importer |

Hit cap counts primary targets. Splash is a separate secondary hit that never counts against it, so a hit cap of 1 with splash on is a rocket, and a hit cap of 5 with splash off is a piercing shot. Chain is a point shape with a hit cap plus a chainHops number, not its own shape.

## Parameters and rules

Attributes say what a move is. Numbers say how big and how fast, and live in the same entries as plain fields.

- **Size and timing:** radius, width, duration, tickRate, delay.
- **Counts:** count (projectiles), chainHops, pierce, hit cap.
- **Aim:** turnRate (how hard tracking steers), spread.
- **Splash:** splashRadius, splashFalloff.
- **Riders:** knockback, slow, and the proc chances and drain from the raw data.
- **Commitment:** none, slowed or rooted, for long casts.

Rules that check.js enforces. These are proposed and untested, and a few have real exceptions (for example a delayed heal like Wish):

1. Buff, heal and shield may only target yourself or your team. Damage and debuff must target foes.
2. A field has no target, reach or shape of its own.
3. Expanding needs a circle, arc or cone.
4. Returns needs a point or line.
5. Falls needs a point, scatter or circle.
6. UntilTriggered needs anchor world and static motion.
7. Orbits and repositions need anchor caster.
8. Tracking is rejected on static things such as mines.
9. Splash is rejected on circle, cone and arc, which are already areas.
10. The 19 existing kinds stay as the whitelisted presets. A move that deviates from its preset passes only if it satisfies these rules.

## Worked examples

Shape now does real work: it is the hit test, not a stand-in for a projectile pattern. Four moves that differ only in their attributes (all four are effect damage, side foe):

| Move | hitCap | shape | lifetime | anchor | motion | expanding | Key numbers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ember (projectile) | 1 | point | instant | caster | travels | false | speed, life, size |
| Flamethrower (spray) | unlimited | cone | timed | caster | static | false | duration, tickRate, range, arc, burn chance, commitment |
| Nova, e.g. a pulse or sound move | unlimited | circle | instant | caster | static | true | radius, expansion speed |
| Burst, e.g. Fairy Wind | 1 per projectile | point | instant | caster | travels | false | count, full-circle spread, pierce |

- **Ember** stays a discrete projectile you can see and dodge.
- **Flamethrower** changes most. Today it fires 7 short-lived projectiles across 0.9 radians. As a real cone it becomes a wedge in front of you that stays active for a long cast and ticks damage, which needs a new animation. Count, spread, speed and per-flame life go away. Damage is re-derived the way the aura is (power, duration, tick rate) in place of the pellet normalization.
- **Nova** is one expanding hit zone that hits everything the ring crosses once. It cannot be slipped between.
- **Burst** is real projectiles fired around a circle. Each one can pierce, be dodged or be blocked, and a small enemy can slip between them. Upgrades differ too: nova scales with radius and expansion speed, burst with count and pierce.

Projectile fans such as Razor Leaf and Bubble Beam stay as point shapes with a count and a spread.

## Decisions and open questions

**Decided**

- Raw data, attributes, classification and overrides are separate files. Only raw is generated.
- Player moves and boss moves use one executor. Only the chooser of move and aim differs.
- Hit cap (a number) replaces single, multi and area. Self-only is side self with hit cap 1.
- Movement is split into anchor (caster, target, world) and motion (static, travels, falls, returns, orbits, repositions). Expanding is a separate boolean.
- Chain is a hop count, not a shape. Lingering and delayed are parameters, not lifetimes.
- Flamethrower becomes a true cone with a long cast. Nova (expanding circle) and burst (projectiles around a circle) are different moves.
- Splash and tracking are booleans, off by default, set by hand in review and never guessed by the importer. Splash does not default on for falls motion.
- Names are plain words in the files, interned to integers at load.

**Open**

- Should an unlimited hit cap be written as 0 or as a named constant, converted by the loader? A bare 0 meaning "no limit" is easy to misread.
- During a long cast, does the player keep moving? Proposed: a commitment parameter (none, slowed, rooted).
- Does the cone aim at the nearest enemy and sweep to follow it, or at the movement direction? Proposed: nearest enemy, as the other moves do.
- How to split the 43 approved moves currently classed as nova between nova and burst. Proposed starting rule: sound or pulse flag becomes nova, everything else becomes burst. Heat Wave is your call.
- Does splash damage apply the burn, paralysis or stat drop, or damage only? Proposed: damage only at reduced strength.
- Representability test: express all 19 current kinds and the 7 entries on the Gaps sheet in the new attributes. Any kind that cannot be written means an attribute is missing.

## What changes in the import slices

The five slices in the file plan keep their order. Two of them change shape.

1. **Housekeeping.** Unchanged.
2. **Importer.** Becomes a raw import into move-data-raw.js, plus the attribute vocabulary and the merge-only classification draft. The harness still has to prove the existing 64 moves are unchanged, now through override entries.
3. **Behavior.** First a single executor with a caster interface, shared by players, wild enemies and bosses, with player and boss behavior proven unchanged. Then engine primitives for each shape, motion, lifetime and effect, in your priority order, replacing a function per kind. Control, ward, mend, field and wall mostly collapse into effect handlers on existing shapes; only field and wall need new geometry.
4. **Learnsets.** Unchanged: a separate generated file of move ids per species, capped per Pokemon.
5. **Gyms.** Bosses no longer need their own forms. A roster entry is species, moveset and AI profile.

Before slice 2, run the representability test above and settle the open questions that affect the schema: the unlimited constant, the commitment parameter and the nova/burst split.

## Status

Nothing in the game code has changed. One file exists in docs/move\_rework\_holding: moves.generated.js, 373 moves (every move approved in the Move Import Review, with the 21 kind overrides applied). It was built against the earlier kind, delivery and payload layout, so it predates this plan. It does include the PokeAPI facts (pid, pp, accuracy, hits, priority, target, flags) that move-data-raw.js needs, and the 31 already-built moves match their hand-tuned values in moves.js exactly. It should be regenerated into the files above, not extended.

The review file reports 11 of the 373 as unbuilt and 5 with no base power (Beat Up, Reversal, Final Gambit, Horn Drill and Bide), which need a formula or special case.
