# Move schema implementation: slice plan (#2)

Branch: feature-test/new-move-schema. Status: planning only, nothing in js/ touched.
Source of truth for the schema: docs/MOVE-AXIS-SCHEMA.md. Raw database: docs/move_rework_holding/move-conversions-described.json (63 moves, all reviewed, single file).
Each slice gets its own chat. This file is the handoff: read it, then the one slice you are working on.

## Architecture (Jess's model)

1. Raw database: the JSON above. Stays single-file.
2. Export script (in tools/): converts the JSON into a generated js/data move file (the game loads scripts, it does not fetch JSON). Never hand-edit the output.
3. Handler (new js file): owns everything the schema adds that is not plain data, such as the special handlers (berrySteal, fixedDamage, chainDamageFalloff, levelDamage, statusBonus, setWeather) and later emit and other new features. It keeps that logic out of both the resolver and combat.js.
4. Resolver (new js file): a pure fold. Takes the generated move data and the handler, applies the layers in schema order (source facts, formulas, presets, hand overrides), and outputs the final resolved definition combat needs.
5. End state for combat.js: thin. An entity calls a move, the resolver supplies the resolved definition, combat applies "move does X to entity B" and emits the outcome.
Migration bridge: the resolver also outputs a flat projection in the old field names (dmg, cd, radius, arc, knock, count, pierce, speed, life, dur). Existing combat, upgrade cards (mechanics.js, kinds.js) and HUD keep reading it until the new executors replace them. Move ids do not change, so saves stay compatible.

## Decisions so far

- Cooldown and base damage are DERIVED (PP and Power). Formulas are written and calibrated in slice 2.
- Individual-scope stat buffs apply to the ACTIVE team member only (decided earlier). Built in slice 4.
- Emit: handled when slice 4 gets there.
- Bubble: deprecated (API description says "forgotten"), excluded from the schema pass, removed in the later forgotten-move purge.

## Open for slice 1

- Resolver timing. Recommended: resolve each move lazily on first use and cache it (pure, so safe). Nothing runs in the combat loop, startup cost stays flat as the list grows toward ~1000, and check.js can still resolve all moves eagerly with the same code. Build-time precompute is rejected because handlers are code and cannot be serialized, and it would split the one-resolver rule.
- Real scaling cost is shipped data size, not resolve time. Export should drop defaults and consider splitting by type pool. Measure once the export exists.
- Where the schema's grammar (legal fields, defaults, needs/allow/reject) and presets live: inside the resolver module as data, or as their own files (schema doc names move-attributes.js and move-classification.js). Decide before writing.
- move-conversions-final.json is referenced by the JSON header but is not in the holding folder. Find it or confirm it is superseded.
- Gym bosses and enemies may share move definitions. Check enemy.js, gyms.js and the other readers of move fields before slice 3.

## Slices

1. Data and grammar (no runtime change). Export script, generated move file, grammar, validator wired into tools/check.js. Add the new files to the dev.html script list and the NEED array in js/main.js. Gate: all 63 validate (reject unknown operations, bad references, cycles, grow without an end condition; the string UNLIMITED maps to the named constant). Coverage report buckets every move by geometry, motion, anchor, targeting, payload.
2. Resolver as a pure fold, plus handler skeleton. Outputs resolved definition and flat projection. Gate: parity report of new projection vs legacy moves.js values for all 63; every difference listed for Jess to mark intended or regression.
3. Switch behind a flag. dev.html?newmoves loads resolved moves; default stays legacy. Gate: check.js passes both ways, a run plays on each.
4. New executors, in order: individual (active-only) buffs, special handlers one at a time with a test each, delivery extras (curve, homing, grow, return and reposition, aimTrack), emit last.
5. Upgrades: make kinds.js key lists and cardLock (4 moves) work from the resolved definition.
6. Behavior harness and stress test: per-move scenarios (collision timing, hit policy, durations, targeting, scaling) and a late-game enemy-count run. A visible framerate collapse is fixed now, not deferred.
7. Flip the default, remove the legacy path, purge forgotten moves, patch notes in changelog.js.

Slices 1 to 3 change no gameplay.

## Known engine gaps (from a search, not a full read of combat.js)

- Emit: 8 moves (discharge, gust, toxic, fairy-wind, toxic-spikes, meteor-mash, will-o-wisp, flame-wheel).
- Individual buffs: 11 of 17 stat effects. Specials: 6 moves. Delivery extras: about 10 moves. Interval re-hit: 5 moves.
- All six ailments used (burn, paralysis, poison, freeze, trap, confusion) already exist in status.js. Caster iframes (quick-attack) unverified.
