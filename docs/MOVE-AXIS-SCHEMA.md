# Move Axis Schema (from-scratch design)

Oct 23, 2026. The move representation for feature/all-moves-import, derived from two facts: the source is PokeAPI, the target is a survivor-like. Design proposal, nothing built in js/ yet. Supersedes the eleven-flat-attribute sketch in MOVES-REFACTOR-PLAN.md.

This is the field-renamed, collapsed revision from the 2026-10-23 review pass. Naming and structure are settled with Jess; the Optimization log at the end records each collapse with its disproof so they are not re-litigated.

## The one framing decision

A turn-based move is an EVENT (one target, one accuracy roll, resolved and done). A survivor-like move is a standing EMITTER (auto-fires on a cooldown, faces a crowd, judged by throughput and readability). The import is the translation event -> emitter. A move's identity here is geometry + cadence + effect.

## Why axes (what the data says)

Of ~238 approved moves scanned cleanly: 157 are `[damage]`, 44 `[damage, ailment]`, 6 `[damage, multihit]`, 12 status-only, the rest a ~15-move long tail. ~85% is "damage, maybe one rider." So effect is factored OUT of geometry: moves share a payload and differ in how they reach the target. Coverage becomes "is each axis complete," not "did we enumerate every combination."

## Top-level move fields

Every move entry carries these at the top level (not in an axis):

| field | meaning |
| --- | --- |
| id, name | identity |
| type | the element (fire, water, ...). STAB and the type chart read this. NOT a payload entry. |
| cd | cooldown (seconds). Every move has one; derived from PP in the resolver, override-able. |
| rehit | seconds (optional). The DAMAGE TICK cadence of a PERSISTENT / re-hitting hitbox: how often one instance may damage the SAME enemy again (orb, aura, trail, a sustained beam). A SEPARATE clock from cd (which is the re-cast / re-layout cadence) and from moveSpeed (spin/travel). Confirmed in code: orbs carry a `rehit` field (default ~0.34s) with a per-enemy hitLog; cd (e.g. Gust 0.26) is the re-layout cadence, NOT the damage tick. Absent on one-shot hitboxes (a projectile hits each enemy once). |
| cardLock | optional list of fields a move locks against upgrade cards (e.g. Giga Drain `['count','pierce']`). Default none. |

Then the three axes + the caster-state group.

## Axis 1: SPACE (the hit geometry)

Shape is TWO families. radial covers circle / arc / point; linear covers beam. Field names are prefixed by family so there is never ambiguity about which applies.

| family | fields | meaning |
| --- | --- | --- |
| radial | `radArc` (radians), `radRadius` (px) | radArc = how much of the circle the shape covers (2*pi = full disc, ~1.57 = a 90deg wedge, tiny = a sliver). radRadius = how far out from the center. A POINT is the degenerate radial: radArc is unused (a dot has no angle), only radRadius applies (its collision radius, e.g. Ember radRadius 7). |
| linear | `linLength` (px), `linWidth` (px) | linLength = anchor -> end distance. linWidth = width of the band (constant along the length; a linear does NOT fan, which is why it is its own family). |

Prefixes are ONLY on these shape-size fields (that is where the family ambiguity was). Everything else (anchor, motion, payload, knockback) is bare.

Count and arrangement (separate from one shape's size):

| field | meaning |
| --- | --- |
| count | how many instances of the shape (1 Ember, 3 a Razor Leaf fan). |
| spread | radians; angular fan BETWEEN instances, only when count>1. Clamped just short of a full circle so a huge count never overlaps. High count + large spread = a radial nova made of points. |
| pierce | how many enemies a directional shape passes THROUGH before stopping. pierce 0 = dies on the first enemy. pierce OWNS enemy-contact ending (see endOn below): it is NOT an endOn condition, because enemy-contact and pierce would otherwise be two mechanisms deciding the same event. |
| chainHops | extra targets a hit bounces to after its first. Point only. 0 = none. Pairs with `hopRange` (px, how far each bounce can reach to find the next target). A chain is `chainHops` + `hopRange`, NOT `count` (count = separate instances; a chain is one strike that re-targets). radRadius stays the strike's own hit size, small, distinct from hopRange. |
| splash | `{ radius, falloff }`, default radius 0 = off. A SECONDARY area hit at the impact point, never counts against pierce/hitCap. The upgrade path that turns a single-target shot into an AoE (Ember/Water Gun start at 0, a card raises it). |

All size numbers are GEOMETRY, not render (confirmed in combat.js: a projectile's `r` = radRadius is used in every hit test). Rendering reads them downstream but that is a consequence. Every numeric field is card-upgradeable by default; `cardLock` is how you lock specific ones.

## Axis 2: DELIVERY (how the shape gets there)

| field | values | meaning |
| --- | --- | --- |
| anchor | caster, target, world | What the shape is pinned to. caster = moves with you / fired from you. target = lands on a foe (meteor, smite). world = fixed in space (mine, trail). anchor encodes a TARGETING MODEL: caster = a skill-shot aimed in a direction (can spatially miss, can line up pierce); target = homing / auto-assigned (cannot spatially miss). |
| motion | static, travels, falls, returns, orbits, repositions | How the shape moves relative to its anchor. travels = a projectile, falls = a meteor drop, returns = a boomerang, orbits = a satellite, repositions = moves the CASTER (dash). |
| moveSpeed | px/s | How fast the shape travels (projectile speed, arc travel speed). Lives on motion, where speed has always belonged. A static shape has none. |
| orbitRadius | px | ONLY on motion:orbits. How far from the caster the orbs circle (the ring they trace). Distinct from radRadius (each orb's own hit size) and from moveSpeed (the spin RATE, rad/s for an orbit). Confirmed needed via code read: orbs anchor to the owner and spin at this distance. |
| path | `{ curve?, oscillate? }` (optional, default straight) | HOW a traveling shape weaves through space, independent of any target. A SET of optional, composable perturbations (NOT one mutually-exclusive type): `curve: <rad/s>` steadily rotates the heading (arcs/spirals); `oscillate: {amplitude: <px off-axis>, frequency: <Hz>}` applies a sine weave perpendicular to travel. A shot can have curve only, oscillate only, BOTH at once (a spiral-with-wobble), or neither (omit = straight). They are independent velocity perturbations applied each frame, so they coexist. ORTHOGONAL to turnRate (homing/target-seeking) and grow (expansion); path is target-independent and composes with both (a curving shot can still home and still pierce). NOTE: two DIFFERENT path patterns within one move (e.g. 6 shots curve left, 6 right) is NOT a second path field, it is multiplicity, a count-group or a multi-cast/bond concern, each group carrying its own path. |
| repositionMode | teleport, swept | ONLY on motion:repositions. teleport = jump to the end (today's dash). swept = real traversal at dashSpeedMult. Per-move choice. |
| grow | `{ growSpeed, dim? }` (optional) | The shape EXPANDS one dimension over its life. growSpeed = px/s of expansion. `dim` DEFAULTS to radRadius and is omitted on novas (a ring only grows outward); specify it only to grow a different dimension (radArc for a widening arc, linLength for an extending beam). ONLY the expansion rate lives here; travel is moveSpeed's job. A nova = static center + grow (an expanding ring); the Psychic arc = travels (moveSpeed) AND grows at once. |
| turnRate | number, 0 = off | Homing steering stiffness (damp coefficient toward the nearest enemy). One number; the old `tracking` bool was just turnRate>0. Rejected on static shapes. |
| aimTrack | rad/s, 0 = off | For a STATIC-aimed shape (cone, beam): how fast its AIM ANGLE rotates to follow the nearest enemy. Same units as a turn rate, but it rotates the shape's facing, not a projectile's velocity (that is turnRate's job, and turnRate stays rejected on static shapes). Flamethrower aimTrack 1.4 = the cone swivels toward the nearest enemy at 1.4 rad/s. 0 = fires in the fixed aim direction. Distinct from turnRate so steering-a-bullet and swiveling-a-cone stay separate mechanisms. |

### Lifetime: endOn (a list of end-conditions)

There is NO separate `lifetime` enum. An instance runs until the FIRST condition in its `endOn` list fires. The timer is just one condition, `{time: N}`. Default `endOn: [{time: <duration>}]` (a plain timer) so simple moves stay terse.

| condition | meaning |
| --- | --- |
| `{time: N}` | ends at N seconds. `{time: 0}` = instant (resolves and vanishes this frame: a melee swing, a smite). The common fallback for everything. |
| `{contact: wall}` | hits terrain/prop. Distinct from enemy-contact (a projectile dies on a wall regardless of pierce). |
| `{ownerDeath}` | the source ended (turret whose owner died / move was replaced). |
| `{notActive}` | the move is no longer the ACTIVE selected skill. The persistence condition for ORBITS (and any always-on-while-selected move): the orbs live while the move is active and are cleared when another move is selected (code: clearOrbs on move-switch). This is how "persistent while selected" is expressed, NOT a timer and NOT cd:null. |
| `{offScreen}` | left the view (the cull). |

ENEMY-CONTACT IS NOT AN endOn CONDITION. It is owned by `pierce` (pierce 0 = ends on first enemy hit, pierce 2 = ends on the third). Putting `contactEnemy` in endOn would duplicate pierce and the two could contradict on the same hit. So: pierce owns the COUNTED enemy-contact ender; endOn carries the UNCOUNTED enders (time, wall, offScreen, ownerDeath). A projectile that hits NOTHING ends on its `{time}`; a projectile that hits enemies ends via pierce.

This also folds the old turret/mine lifetimes in: a turret is `endOn: [{ownerDeath}, {time: 6}]` (owner death OR a 6s cap); a mine is `endOn: [{contact: enemy-is-pierce... no}, {time: 7}]` -- a mine detonates on proximity, which is its own trigger, plus a 7s timeout. (Mine proximity is a placement trigger, not pierce; see emit below.)

## Axis 3: PAYLOAD (what happens to whatever it hits)

An ordered list of effect records. Decoupled from geometry, so one handler serves a melee hit, a beam tick and a nova pulse.

| effect `t` | carries | meaning |
| --- | --- | --- |
| damage | (power + your equations) | the default. |
| knockback | px (default 0) | push applied to the target. Promoted to a payload effect (it acts on whoever is hit). Default 0 = no push. |
| ailment | ailment id, chance, side | burn/poison/para/trap/etc. chance from PokeAPI; your roll-gap model owns application. |
| stat | stat id, stages, side | a stage change. SCOPE FOLLOWS SIGN (DECISIONS Slice E2a): a RAISE is team-wide, a DROP is per-Pokemon. The resolver derives team-vs-individual from the sign. |
| heal | `amount { from, value/frac }` | the single recovery effect. from = dealt (= a drain), flat, or maxFraction. drain is heal with from:dealt, not a separate primitive. Aqua Ring = maxFraction 0.0625, side:self (ACTIVE caster only, NOT team; regen is not a stage so the team rule does not apply). |
| shield | `{ amount, max?, regen?, absorbsAll?, overflow?, blocksStatus? }` | a temporary HP pool, richer than flat temp HP. `amount`/`max` = the pool and its cap. `regen` = HP/s the pool refills while active. `absorbsAll` = ALL incoming HP loss (contact, shots, AND status DoT ticks) drains the shield before real HP (damage only; does NOT stop the status being applied). `overflow` = a hit bigger than the current shield absorbs what the shield has, the rest carries to real HP (so the cap matters). `blocksStatus` = no ailment can be applied at all while it holds (application-immunity; distinct from absorbsAll which is damage-only). |
| flinch | chance | lost-action roll. |
| multihit | `{ hits: N or min/max, normalize: true }` | N hits on ONE target from a single hitbox (Wing Attack's two wing-strikes, Fury Attack 2-5). Fixed count = `hits: N`; rolled = `min/max`. `normalize` (default TRUE) splits power across the hits so total = power (genre-safe: 2 hits of power/2, and upgrades scale power so both grow); `normalize: false` = each hit does FULL power (a real Nx nuke, the canonical mainline model) for a deliberate build-defining multihit. Normalization is a POLICY, not intrinsic to multihit. Distinct from `count` (N separate hitboxes in SPACE, a shotgun); multihit is same-target repeat ticks, they compose. |

NORMALIZE IS A BASE SCALAR, not a live re-division (Jess, 2026-10-23, matches the code's `move.norm`). `normalize: true` sets the move's BASE per-hit/per-tick damage once at author/resolve time = power / (base hit-or-tick count). It is applied ONCE in the damage formula as the `move.norm` factor; it is NOT recomputed per cast. Upgrades (Attack mul, damage cards) and DURATION/rehit upgrades layer on AFTER, so adding ticks via a Duration card DOES increase total damage (more ticks, each at the normalized base), it does not claw back to keep the total at power. So on any `normalize`d move (multihit, rehit cone like Flamethrower, count-burst like Bubble/Mud Shot): normalize tames the BASE (so the move is not a firehose at base), and Duration/count still scale damage from that base. `normalize: false` leaves each hit/tick at full power.
| crit | stage | crit-rate bump. |
| recoil | fraction | self-damage. |
| emit | `move` (id OR inline), every, endOn, trigger | places an EMITTER: a positioned object, no AI, that fires `move` every `every` s (or on `trigger: contact`) until its own endOn fires. `move` is EITHER a named catalog move id (reusable/shared bolt) OR an inline sub-move (a one-off bolt that is an implementation detail, e.g. Will-O-Wisp's burning bolt). The emitter has NO shape and no direct damage; the emitted `move` carries the shape + payload. Folds in turret / mine / trail. |
| spawn | `entity` (id OR inline), allegiance, endOn | places a COMBATANT (HP, AI, moveset). `entity` is EITHER a named entity id (the shared species+moveset+AI definition gyms/wild spawns use) OR an inline entity for a one-off summon. allegiance hostile = targets player (summoner), friendly = targets enemies. |
| special | handler id (+ params) | named escape hatch for bespoke semantics. Keeps coverage finite: every move is (shape x motion x anchor x payload) OR a named special. The handler FAMILY so far: `fixedDamage` {amount} (Dragon Rage = flat 40); `levelDamage` (Night Shade = damage = caster level); `conditionalDamage` {condition, mult} (Hex = 1.7x if condition `targetHasStatus`); `setWeather` {weather, duration?} (Hail = snow, held while active); plus the reserved bespoke ones (OHKO, Bide, Counter, Metronome, Transform). A damage handler computes damage by a RULE instead of flat power (power 0 on those moves). |

### STATE-change moves (weather / terrain): shapeless, a special handler (Jess, 2026-10-23)

Some moves do not hit anything in space, they flip a GLOBAL game-state system for a duration. They have NO shape, NO radius, NO target; forcing them into radial/linear is wrong (that is why the merge left Hail with an empty payload). They are `anchor: self` + a `special` state-change handler, no SPACE fields at all.

- WEATHER: `{t: special, handler: setWeather, weather: <kind>, duration: N}` -> calls G.Weather.start(kind, N). The existing weather system (js/systems/weather.js) already has sun/rain/sand/snow/fog with type multipliers, chip damage, slow and tint. Hail = snow (snow already is "damages all except Ice, boosts Ice, slows"; it IS the Hail effect). A player weather-cast OVERRIDES the ambient random weather for its duration.
- TERRAIN / FIELD (Electric/Grassy/Misty/Psychic Terrain, Trick Room): same shape, a setTerrain/setField handler, when those are built.
- This is a small move FAMILY (weather moves: Hail/Rain Dance/Sunny Day/Sandstorm; terrains; field moves). All shapeless, all anchor:self + a special. Keeps the shape axes strictly about hitboxes.

`side` (self / ally / foe) is a payload property (a move can damage the foe AND buff itself). effect+side enforce: damage/foe-debuff target foes; heal/buff/shield target self/ally.

emit vs spawn stay TWO primitives (an emitter has no AI/HP/allegiance; forcing a turret through spawn means a pile of null fields). They compose: a spawned combatant's moveset may itself contain emit/spawn.

## Group 4: CASTER-STATE (true of the caster while firing)

Not an axis (acts on the caster, not the hit). Optional, absent on most moves.

| field | meaning |
| --- | --- |
| iframes | seconds of invulnerability (reuses `pl.invuln`). Supports `travel + N` for a swept dash (spans the travel plus N trailing; Quick Attack = travel + 0.5). Teleport dash = a flat value on arrival. |
| commitment.movement | none / slowed / rooted, during a long cast. |
| commitment.cooldown | `tick` / `freeze` / `freeze(ids)`. `freeze` alone = ALL cooldowns lock; `freeze(ids)` = only the listed moves (default; Quick Attack freezes only its own, the rest of the kit keeps ticking). |
| delay | seconds of wind-up before the effect lands (charge moves). Same field as a meteor drop-delay. The telegraph the unified executor shows for hostile casters. Interrupted mid-delay reuses the flinch-cancels-cast rule. |

Charge dissolves into delay + commitment; it is not its own payload.

## Worked example: Ember (the canonical entry)

Exercises shape, delivery, pierce-vs-endOn, splash, and a rider payload:

```
ember {
  type: fire
  cd: 0.52
  shape: radial            // point = degenerate radial (radArc unused)
  radRadius: 7
  count: 1
  pierce: 0                // dies on first enemy contact (pierce owns enemy-contact)
  anchor: caster
  motion: travels
  moveSpeed: 310           // travel ~= moveSpeed x the endOn timer = 310 x 1.6 ~= 496px
  endOn: [ {time: 1.6} ]   // ends on timeout if it hits NOTHING; enemy hits end it via pierce
  splash: { radius: 0, falloff: 0 }   // starts off; a card raises it (every number is upgradeable unless cardLock'd)
  payload: [
    { damage },
    { ailment: burn, chance: 10, side: foe }
  ]
}
```

A fire-type single 7px projectile fired from the caster, travels 310px/s for up to 1.6s (~496px), dies on the first enemy (pierce 0) or on timeout, with an upgradeable splash starting at 0, dealing damage + a 10% burn to the foe. Note: `type` is top-level (not a `damageType` payload entry); `side: foe` (not `ailmentHits`); no `upgradeable` flag is needed (everything is upgradeable unless locked by `cardLock`).

## Worked example: the expanding-ring nova

```
heat-wave {
  type: fire
  cd: 1.25
  shape: radial            // nova = expanding ring
  radArc: 6.2832           // full circle
  radRadius: 275           // the MAX radius it grows to (growSpeed 250 x 1.1s)
  anchor: caster
  motion: static           // center fixed; only the radius grows
  grow: { growSpeed: 250 } // dim defaults to radRadius; expands 0 -> 275px at 250px/s
  endOn: [ {time: 1.1} ]   // lifespan: ~1.1s to finish expanding, then done
  payload: [
    { damage },
    { ailment: burn, chance: 10, side: foe }
  ]
}
```

A nova is an expanding ring: radArc full, radRadius grows from 0 to its max via grow.growSpeed, hitting each enemy once as the edge crosses. No pierce (areas do not penetrate), no count, no moveSpeed (the center is static). Upgrade growSpeed = expands faster; upgrade radRadius = grows bigger. Note radRadius is the MAX it grows to (275px here), NOT a point size. Converting Heat Wave from its current burst-of-10-pellets to this ring is a deliberate behavior change the conversion harness will (correctly) flag. (Psychic is the TRAVELING version: same but motion:travels with a moveSpeed, so it moves AND grows at once.)

## Worked example: Substitute (a defensive / shield move)

Exercises a self-cast defensive cooldown: a recoil HP-cost + a rich regenerating shield, no shape/target.

```
substitute {
  type: normal
  cd: 30                    // long cooldown: a panic button, not sustained
  power: 0
  anchor: self              // shapeless self-cast; no shape/radius/target
  endOn: [ {time: 6} ]      // the shield lasts 6s
  payload: [
    { "t": "recoil", "fraction": 0.25 },   // pay 1/4 max HP on cast
    { "t": "shield",
      "amount": "2 * paid",                 // = 1/2 max HP (twice what you paid)
      "max": "2 * paid",                    // capped at that value
      "regen": "= max",                     // regens its own cap per second (50 cap -> 50/s)
      "absorbsAll": true,                   // ALL damage incl. status DoT drains the shield first
      "overflow": true }                    // a hit > the shield: shield eats what it has, the rest carries to real HP
  ]
}
```

Worked (100 max HP): pay 25 -> a 50-HP shield regenerating 50/s for 6s, cd 30. Under ~50 DPS you are effectively untouchable for the window; a 150 burst drains the 50 shield and 100 overflows to real HP (the cap matters). Status still APPLIES but its DoT drains the shield (absorbsAll is damage-only, not blocksStatus). Self-scaling: cap and regen are both 1/2 max HP, so it stays relevant at every level with no retune. This is the schema's first move that pairs a cost (recoil on side:self) with a rich shield, and the first self-cast defensive cooldown.

## Kinds are presets, not types

A "kind" (beam, nova, melee) is a PRESET: a named bundle of default field values, authoring shorthand. The engine never sees it. You write `preset: beam`, the resolver expands it to fields, overrides apply, and after load there is only resolved field sets. THE RULE: kind/preset is consumed ONLY by the resolver at load, NEVER by the executor at runtime. Two files: move-attributes.js (the GRAMMAR: every legal value + primitive id + needs/allow/reject) and move-classification.js (the PRESETS). The engine and check.js read the grammar.

## The validator is DATA, not branches

Each field value declares its own primitive id, defaults, and legal co-values (needs/allow/reject) in move-attributes.js. check.js runs a generic checker that never changes as moves are added. Invariants are data the value owns: grow needs a non-zero life; returns needs point/linear; radial rejects pierce (areas do not penetrate); turnRate rejected on static.

Schema principle from the collapses: NO bool derivable from whether its companion number is present (killed `tracking`, killed `expanding`). A field that must reference another field to mean anything belongs TO that field (killed `contactEnemy(pierce)` -> pierce owns it).

## The resolver is a pure fold

Load order, later wins: raw facts (generated) -> interpretation formulas (pp->cd, accuracy->multiplier, power->dmg, proc->roll model) -> classification (presets + field values) -> overrides (hand-tuned numbers). Pure function, runs at load from file:// like the tilesets, and check.js runs the SAME resolver. One-way generation is structural: the generator writes only the raw facts file; nothing but you writes classification and overrides.

## Coverage test (run BEFORE the importer)

Bucket every approved move into its realized (shape, motion, anchor, payload-set) tuple; every tuple must map to a built primitive OR a named special; the moves in neither bucket are the missing axes. Run it against the unbuilt gym-roster depth (Fighting, Dragon, Ice), the moves that did not inform the design, so "optimally covering" is earned.

## Optimization log (collapses, with disproofs)

- SHAPE five -> TWO families. cone/circle/arc/melee-swing = radial (radArc+radRadius); linear (linLength+linWidth) is separate; point = degenerate radial. Disproof of going to ONE: radial FANS (width grows with distance), linear is PARALLEL (width constant). A radius-0 sector is a ray, not a beam. No single parameter is both proportional-to and constant-with distance, so two is the floor.
- FIELD RENAMES: extent->radArc, reach->radRadius, (beam) length/width -> linLength/linWidth. Prefixes only on shape-size fields.
- LIFETIME enum -> `endOn` list of conditions; the timer is `{time:N}`, `{time:0}` = instant. No privileged field, no magic sentinel. Default `[{time:duration}]` keeps the common case terse.
- ENEMY-CONTACT -> owned by `pierce`, NOT an endOn condition (they would contradict on the same hit). endOn carries only uncounted enders (time, wall, offScreen, ownerDeath). wall-contact and enemy-contact are distinct events.
- `expanding` bool -> `grow {dim, growSpeed}`. `moveSpeed` lives on MOTION (travel is universal), grow carries only the expansion rate (conditional). Keeps each number with its real owner.
- `tracking` bool -> dropped; just `turnRate` (0=off).
- NOVA = an expanding ring (radial, static center, grow radRadius), not an instant pulse and not a burst. speed is the grow rate, lifetime is timed.
- drain -> heal with from:dealt. emit vs spawn -> two primitives. charge -> delay + commitment. knockback -> a payload effect.

## Open

- UNLIMITED on an uncapped pierce / hitCap: 0 or a named constant (lean: named constant).
- splash carries riders or damage-only (lean: damage-only, reduced).
- grow on a traveling arc: grow radRadius only, or radArc too (lean: name the dims in grow when needed).
- size x pierce edge-clip (Size card on a pierce-0 point is a sometimes-weak/edge-clip case): decide by feel-test when the Size card is built.
