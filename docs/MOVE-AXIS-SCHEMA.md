# Move Axis Schema (from-scratch design)

**Updated:** Oct 24, 2026 (canonical; merged from the Oct 23 revision + the original from-scratch draft)  
**Status:** Design proposal; not yet implemented in `js/`  
**Scope:** Translate PokeAPI move facts into a data-driven survivor-like combat model. Supersedes the eleven-flat-attribute sketch in `MOVES-REFACTOR-PLAN.md`.

This revision preserves the core axis model while tightening lifetime ownership, targeting, collision, formulas, and effect scope. The optimization log records the major structural decisions; unresolved decisions remain listed at the end.

## Core framing

A turn-based move is an event: it selects a target, resolves accuracy, and completes. A survivor-like move is usually a recurring emitter: it activates on a cooldown, interacts with a crowd, and is judged by throughput and readability. Importing a move is therefore a translation from turn-based event semantics into real-time combat behavior.

A move's identity is expressed through geometry, cadence, delivery, and effects.

## Why axes (what the data says)

Of ~238 approved moves scanned cleanly: 157 are `[damage]`, 44 `[damage, ailment]`, 6 `[damage, multihit]`, 12 status-only, the rest a ~15-move long tail. ~85% is "damage, maybe one rider." So effect is factored OUT of geometry: moves share a payload and differ in how they reach the target. Coverage becomes "is each axis complete," not "did we enumerate every combination."

## Top-level move fields

Every move entry carries these at the top level (not in an axis):

| field | meaning |
| --- | --- |
| `id`, `name` | Stable identity and display name. |
| `type` | Element used by STAB and the type chart. Not a payload effect. |
| `category` | Source damage category: `physical`, `special`, or `status`. Preserve this source fact even if the game maps categories to its own scaling rules. |
| `power` | Source move power, retained as source data. The resolver derives the game's base damage from it; named damage handlers may override the normal formula. |
| `cd` | Cooldown in seconds. Derived from PP by the resolver, then optionally overridden. |
| `rehit` | Optional damage-tick interval for a persistent hitbox. Controls how often one instance can damage the same enemy again. Separate from `cd` (recast/re-layout cadence) and movement speed. Absent for one-hit-per-instance shapes. |
| `hitPolicy` | Collision policy for repeated contact: e.g. `oncePerInstance`, `interval`, or `onReentry`. `rehit` supplies the interval when the policy uses one. The grammar defines valid combinations and defaults. |
| `cardLock` | Optional list of fields that upgrade cards cannot modify, e.g. `['count', 'pierce']`. Default: none. |

Then the three axes + the caster-state group.

## Axis 1: SPACE (hit geometry)

There are two geometry families. `radial` covers circles, arcs, cones, melee swings, and points. `linear` covers beams and other constant-width bands. Shape-size fields are prefixed by family so their meaning is unambiguous.

| family | fields | meaning |
| --- | --- | --- |
| radial | `radArc` (radians), `radRadius` (px) | radArc = how much of the circle the shape covers (2*pi = full disc, ~1.57 = a 90deg wedge, tiny = a sliver). radRadius = how far out from the center. A POINT is the degenerate radial: radArc is unused (a dot has no angle), only radRadius applies (its collision radius, e.g. Ember radRadius 7). |
| linear | `linLength` (px), `linWidth` (px) | linLength = anchor -> end distance. linWidth = width of the band (constant along the length; a linear does NOT fan, which is why it is its own family). |

Only shape-size fields use the `rad` and `lin` prefixes. Other fields (`anchor`, `motion`, payload effects, and knockback) remain unprefixed.

Count and arrangement are independent of an individual shape's size:

| field | meaning |
| --- | --- |
| count | how many instances of the shape (1 Ember, 3 a Razor Leaf fan). |
| spread | radians; angular fan BETWEEN instances, only when count>1. Clamped just short of a full circle so a huge count never overlaps. High count + large spread = a radial nova made of points. |
| `pierce` | Number of enemy contacts a directional instance passes through before terminating. `0` means terminate on the first enemy hit. This owns enemy-contact termination; enemy contact is not also an `endOn` condition. |
| `chainHops` | Extra targets hit after the first. Pairs with `hopRange` (px). A chain is one hit that retargets; `count` creates separate instances. |
| `splash` | Optional secondary area hit at an impact event: `{ radius, falloff, trigger }`. Radius `0` disables splash (the default; a card raises it, turning a single-target shot into an AoE). `trigger` defines when the burst fires: `enemyHit` (default), `terrainHit`, or `termination`; the default lives in the grammar (move-attributes.js), not per move. The splash burst is a SEPARATE event downstream of the primary shape's impact: it never consumes `pierce` and never counts against `hitCap` (those are owned by the primary shape; a 4-enemy splash does not spend 4 pierce). `falloff` is linear from full damage at the center to a floor fraction at the edge radius. Splash CARRIES the payload's riders (ailment, knockback, stat) at HALF their primary chance: a 10% burn on the primary applies at 5% to each splash-caught enemy (round the halved chance as the proc model defines). Stat/knockback riders that are not chance-based apply at half magnitude on splash-caught targets. The resolver derives the splash rider set from the move's own payload; splash does not get an independent payload list. |

All shape-size values describe collision geometry, not merely rendering. The renderer may use the same values for visuals, but collision is authoritative. Numeric fields are upgradeable by default unless excluded through `cardLock`; each upgrade must still respect the field's valid range and geometry constraints.

## Axis 2: DELIVERY (how the shape gets there)

| field | values | meaning |
| --- | --- | --- |
| `anchor` | `caster`, `target`, `world`, or `self` | What the instance is attached to. `caster` follows or originates from the caster; `target` follows a selected target; `world` remains at a world position; `self` identifies a shapeless self-cast rather than a hitbox. `self` is reserved for shapeless casts. Anchor does not choose the target. |
| `targeting` | e.g. `direction`, `nearest`, `selected`, `location`, `self`, `none` | How the destination or affected target is selected. This is separate from `anchor`: a caster-anchored cone can aim at the nearest foe, while a caster-anchored projectile can fire in a direction. Define the allowed values and requirements in the grammar. |
| `motion` | `static`, `travels`, `falls`, `returns`, `orbits`, `repositions` | How the instance moves. `repositions` moves the caster; other values describe the shape/instance. |
| `moveSpeed` | px/s | Linear travel speed. Absent for motion that does not translate linearly. |
| `angularSpeed` | rad/s | Rotation rate, used for orbiting or other explicitly angular motion. Do not overload linear `moveSpeed` for rotation. |
| `orbitRadius` | px | Required for `motion: orbits`; distance from caster to the orbit path. Distinct from `radRadius`, the orb's hit size. |
| path | `{ curve?, oscillate? }` (optional, default straight) | HOW a traveling shape weaves through space, independent of any target. A SET of optional, composable perturbations (NOT one mutually-exclusive type): `curve: <rad/s>` steadily rotates the heading (arcs/spirals); `oscillate: {amplitude: <px off-axis>, frequency: <Hz>}` applies a sine weave perpendicular to travel. A shot can have curve only, oscillate only, BOTH at once (a spiral-with-wobble), or neither (omit = straight). They are independent velocity perturbations applied each frame, so they coexist. ORTHOGONAL to turnRate (homing/target-seeking) and grow (expansion); path is target-independent and composes with both (a curving shot can still home and still pierce). NOTE: two DIFFERENT path patterns within one move (e.g. 6 shots curve left, 6 right) is NOT a second path field, it is multiplicity, a count-group or a multi-cast/bond concern, each group carrying its own path. |
| repositionMode | teleport, swept | ONLY on motion:repositions. teleport = jump to the end (today's dash). swept = real traversal at dashSpeedMult. Per-move choice. |
| `grow` | `{ growSpeed, dim? }` (optional) | Expands one named dimension over time. `growSpeed` is px/s; `dim` defaults to `radRadius`. Specify `radArc` for a widening arc or `linLength` for an extending beam. Travel remains the job of `moveSpeed`, so a shape can travel and grow simultaneously. Collision rules must define how expansion crosses enemies; for an expanding ring, track previous/current radius and hit each enemy at most once per instance. |
| turnRate | number, 0 = off | Homing steering stiffness (damp coefficient toward the nearest enemy). One number; the old `tracking` bool was just turnRate>0. Rejected on static shapes. |
| aimTrack | rad/s, 0 = off | For a STATIC-aimed shape (cone, beam): how fast its AIM ANGLE rotates to follow the nearest enemy. Same units as a turn rate, but it rotates the shape's facing, not a projectile's velocity (that is turnRate's job, and turnRate stays rejected on static shapes). Flamethrower aimTrack 1.4 = the cone swivels toward the nearest enemy at 1.4 rad/s. 0 = fires in the fixed aim direction. Distinct from turnRate so steering-a-bullet and swiveling-a-cone stay separate mechanisms. |

### Instance lifetime: `endOn`

There is no separate `lifetime` enum. An instance ends when the first condition in its `endOn` list fires. A timer is `{ time: N }`; a simple timed instance can use that as its only condition. A cast may resolve immediately while its resulting payload effects persist independently.

| condition | meaning |
| --- | --- |
| `{ time: N }` | Instance ends after N seconds. `{ time: 0 }` resolves immediately. |
| `{ contact: "wall" }` | Instance contacts terrain/prop. Separate from enemy contact. |
| `{ ownerDeath: true }` | The source object is destroyed or removed. |
| `{ notActive: true }` | The move is no longer the active selected skill; used for persistent orbs and similar selected-skill instances. |
| `{ offScreen: true }` | Instance leaves the permitted play area. |

Enemy contact is owned by `pierce`: `pierce: 0` terminates on the first enemy hit, while `pierce: 2` permits two enemies to be passed through and terminates on the third hit. `endOn` handles independent termination conditions such as time, wall contact, owner death, inactive selection, or leaving the play area.

A mine's proximity detonation is a separate `trigger`, not pierce or an `endOn` condition. Its placement/emitter definition should detonate on `trigger: contact` and also expire on a timeout. A turret can end on owner death or a time cap, whichever happens first.

## Axis 3: PAYLOAD (what happens when the move resolves or hits)

An ordered list of effect records. Payload effects are decoupled from geometry, so the same handler can serve a melee hit, beam tick, or nova pulse. Each effect declares its target (`side`/scope as appropriate) and its own duration when it persists beyond the hit event. A hitbox's `endOn` never implicitly expires an already-applied status, shield, heal-over-time, or other persistent effect.

| effect `t` | carries | meaning |
| --- | --- | --- |
| `damage` | Uses source `power` and the game's damage formula unless a named handler overrides it. | Default direct-damage effect. |
| `knockback` | Distance in px | Push applied to the affected target. Omit or use `0` for no push. |
| `ailment` | Ailment ID, chance, `side`, optional `duration` | Burn/poison/paralysis/trap/etc. Chance comes from source data where available; the game's proc model owns application. Applied ailments have their own duration/tick rules and are not tied to the originating hitbox's lifetime. |
| `stat` | Stat ID, `stages`, `side`, and explicit `scope` | Stage change. Scope is explicit (`caster`, `individual`, `team`, or another validated target scope); it is never inferred from the sign of `stages`. |
| `heal` | Amount formula and `side` | Recovery from damage dealt, a flat amount, or a fraction of max HP. Drain is a heal with `from: dealt`, not a separate primitive. |
| `shield` | Amount formula, optional `max`, `regen`, `absorbsAll`, `overflow`, `blocksStatus`, and `duration` | Temporary HP pool. `regen` is HP/s. `absorbsAll` routes incoming HP loss through the shield but does not prevent status application. `overflow` lets excess damage spill into real HP. `blocksStatus` prevents new ailments while active. `duration` controls shield expiration independently of the move instance. |
| `flinch` | Chance and optional duration | Lost-action roll. Resolve as a target effect, independent of the source hitbox lifetime. |
| `multihit` | `{ hits: N }` or `{ min, max }`, optional `normalize` | Repeats hits against one target from a single hitbox. Fixed or rolled hit count. `normalize: true` divides source power by the base hit count once during resolution; `false` gives every hit full power. This differs from `count`, which creates separate instances. |
| `crit` | Stage | Critical-hit-rate modifier. |
| `recoil` | Fraction or formula, plus `trigger` | Self-damage paid on cast or after a hit. The trigger determines when it resolves; hitbox termination does not. |
| `emit` | `move` (ID or inline), `every`, `trigger`, `endOn` | Places an emitter with no HP or AI that creates/fires a move on an interval or trigger. The emitted move owns its own geometry, motion, payload, and lifetime. Supports turrets, mines, and trails. |
| `spawn` | `entity` (ID or inline), `allegiance`, `endOn` | Places a combatant with HP, AI, and a moveset. `allegiance` determines its relationship to the summoner and its targets. |
| `special` | Handler ID and validated parameters | Escape hatch for genuinely bespoke mechanics, such as fixed/level/conditional damage, weather changes, OHKO, Bide, Counter, Metronome, or Transform. Use a special only when the behavior cannot be represented cleanly by existing primitives. A different numeric damage formula alone should not require a unique handler per move. |

**Normalization rule:** `normalize: true` establishes base per-hit/per-tick damage once during resolution, using source power divided by the base hit/tick count. The result is applied once in the damage formula; it is not recalculated every cast. Damage upgrades and duration/rehit upgrades apply afterward. Therefore, adding ticks increases total damage, with each tick using the normalized base. `normalize: false` gives every hit/tick full power. This policy applies to multihit and any persistent/count-based move explicitly configured to use it.

### Shapeless state-change moves

Some moves change global state rather than creating a hitbox. They use `anchor: self`, `targeting: none`, and a `special` state-change handler, with no SPACE fields.

- Weather: `{ t: special, handler: setWeather, weather: <kind>, duration: N }`. The handler calls the weather system for N seconds. A player-cast weather effect overrides ambient weather for its duration.
- Terrain/field: Electric/Grassy/Misty/Psychic Terrain and effects such as Trick Room use corresponding named handlers when implemented.

The move's cast/activation lifetime and the weather/terrain effect duration are separate. The global state effect persists for its declared duration even if the move's cast has already completed.

`side` describes the affected relationship (`self`, `ally`, or `foe`). It does not replace explicit targeting or stat scope. Effects that can affect different sides must state their intended target rather than relying on the effect type alone.

`emit` and `spawn` remain separate primitives. An emitter has no HP, AI, or allegiance; a spawned combatant has all three. They can compose: a spawned combatant's moveset may itself emit or spawn other objects.

## Caster state (effects on the caster while casting or moving)

This group is not a hit axis because it changes the caster rather than the hit target. It is optional and absent from most moves.

| field | meaning |
| --- | --- |
| `iframes` | Seconds of invulnerability. For swept dashes, may be expressed as travel duration plus a trailing interval; teleport dashes use a duration beginning on arrival. |
| `commitment.movement` | `none`, `slowed`, or `rooted` during a long cast. |
| `commitment.cooldown` | `tick`, `freeze`, or `freeze(ids)`. `freeze` locks all cooldowns; `freeze(ids)` locks only the listed moves. |
| `delay` | Wind-up duration before an effect resolves. Used by charge moves and meteor drops; can be telegraphed to the player. A flinch during the delay interrupts the cast. |

Charge dissolves into delay + commitment; it is not its own payload.

## Worked example: Ember (the canonical entry)

Exercises shape, delivery, pierce-vs-endOn, splash, and a rider payload:

```
ember {
  type: fire
  category: special
  power: 40
  cd: 0.52
  shape: radial
  radRadius: 7
  count: 1
  pierce: 0
  anchor: caster
  targeting: direction
  motion: travels
  moveSpeed: 310
  endOn: [{ time: 1.6 }]
  splash: { radius: 0, falloff: 0, trigger: enemyHit }
  payload: [
    { t: damage },
    { t: ailment, id: burn, chance: 10, side: foe }
  ]
}
```

A single 7px fire projectile travels at 310 px/s for up to 1.6 seconds (about 496px), terminates on its first enemy hit or timeout, and applies damage plus a 10% burn chance. Splash is disabled initially (radius 0) and can be enabled by an upgrade; once enabled, the burst fires on `enemyHit`, deals `falloff`-reduced damage, and carries the 10% burn at HALF chance (5%) to each splash-caught enemy, without consuming pierce. Source category is retained independently of elemental type.

## Worked example: the expanding-ring nova

```
heat-wave {
  type: fire
  category: special
  power: 95
  cd: 1.25
  shape: radial
  radArc: 6.2832
  radRadius: 275
  anchor: caster
  targeting: none
  motion: static
  grow: { growSpeed: 250, dim: radRadius }
  hitPolicy: oncePerInstance
  endOn: [{ time: 1.1 }]
  payload: [
    { t: damage },
    { t: ailment, id: burn, chance: 10, side: foe }
  ]
}
```

A nova is an expanding ring. Its radius grows from 0 to 275px at 250 px/s; each enemy is hit at most once as the ring's collision edge crosses it. The collision implementation must compare previous and current radii each simulation step so fast expansion cannot skip an enemy. `radRadius` is the maximum radius, not the projectile's point size. Converting Heat Wave from a burst of pellets to a ring is an intentional behavior change that the conversion harness should flag. A traveling variant can combine `motion: travels` with `grow`.

## Formula values

Fields that need calculated values use a restricted, typed formula object rather than executable strings. The initial formula grammar should support only named operations and validated references, for example:

```js
{ op: "multiply", args: [{ op: "ref", path: "cast.paid" }, 2] }
{ op: "ref", path: "effect.max" }
```

The resolver validates each operation, argument type, reference, and dependency before runtime. It must reject unknown operations, invalid paths, cycles, and type mismatches. Formula references such as `paid` must be defined by the triggering effect or cast context. Do not use `eval`, `Function`, or arbitrary JavaScript expressions in content data.

## Worked example: Substitute (a defensive / shield move)

Exercises a shapeless self-cast defensive cooldown: recoil HP cost plus a regenerating shield. The cast resolves immediately; the shield has its own duration.

```
substitute {
  type: normal
  category: status
  power: 0
  cd: 30
  anchor: self
  targeting: self
  payload: [
    { t: recoil, fraction: 0.25, trigger: cast },
    { t: shield,
      amount: { op: multiply, args: [{ op: ref, path: cast.paid }, 2] },
      max: { op: multiply, args: [{ op: ref, path: cast.paid }, 2] },
      regen: { op: ref, path: effect.max },
      duration: 6,
      absorbsAll: true,
      overflow: true }
  ]
}
```

With 100 max HP, the cast pays 25 HP and creates a 50-HP shield that regenerates at 50 HP/s for 6 seconds. Incoming damage drains the shield first; excess damage spills into real HP. Status can still be applied, but its damage-over-time drains the shield. The formula examples above use a restricted, typed formula representation, not executable JavaScript strings.

## Presets and validation

A preset (for example, `beam`, `nova`, or `melee`) is authoring shorthand: a named bundle of defaults. The resolver expands presets at load time, applies explicit overrides, and passes only resolved definitions to the runtime. The executor never interprets presets.

Keep the grammar and presets separate:

- `move-attributes.js` defines legal fields/values, primitive IDs, defaults, and `needs`/`allow`/`reject` constraints.
- `move-classification.js` defines presets.
- `check.js` runs the generic validator against the grammar and the same resolver used by the game.

Validation rules should be data-driven where practical. Examples: `grow` requires a finite lifetime or another terminating condition; `returns` requires a compatible point/linear geometry; area geometry rejects `pierce`; `turnRate` requires moving, steerable geometry; `aimTrack` requires a directional static shape; `orbitRadius` and `angularSpeed` require `motion: orbits`.

Avoid booleans that duplicate derivable numeric state. Keep a field's constraints with its definition, and avoid encoding the same event in two independent fields.

## The resolver is a pure fold

Resolution order, with later layers taking precedence:

1. Generated source facts.
2. Interpretation formulas (PP to cooldown, accuracy to game-specific hit/proc rules, power to base damage).
3. Classification and preset expansion.
4. Hand-authored overrides.

The resolver is pure and runs at load time; `check.js` invokes the same resolver. The generator writes only the raw-facts file. Classification and overrides remain hand-authored.

Formula values use a restricted typed expression format with a documented set of operators and references. Never evaluate arbitrary JavaScript from move data. Validate formula references and types during resolution.

## Coverage and behavior tests (before the importer)

Bucket every approved move by its realized geometry, motion, anchor, targeting, and payload set. Every move must map to supported primitives or a documented special. Run the audit against moves that did not inform the design, including the Fighting, Dragon, and Ice gym-roster depth.

For representative moves, verify both schema validity and runtime behavior: collision timing, repeated-hit policy, effect duration, splash trigger, targeting, damage scaling, and upgrade interactions. Compare against the current implementation and flag intentional behavior changes separately from regressions.

Add stress tests with realistic late-game entity counts. The schema itself does not guarantee runtime performance.

## Optimization log

- Two shape families: radial geometry covers cones, circles, arcs, melee swings, and points; linear geometry covers constant-width beams.
- Shape fields use explicit prefixes: `extent` becomes `radArc`, `reach` becomes `radRadius`, and beam dimensions become `linLength`/`linWidth`.
- Instance lifetime uses `endOn`; payload effects such as ailments, shields, and weather have their own duration.
- `pierce` owns counted enemy-contact termination; mine proximity is a separate trigger.
- `grow` carries expansion rate and dimension; `moveSpeed` carries linear travel speed.
- Homing uses `turnRate`; aiming a static cone/beam uses `aimTrack`.
- A nova is modeled as an expanding radial edge, not automatically as an instant pulse or pellet burst.
- Drain is represented as heal-from-damage. Emitters and combatants remain separate primitives. Charge is represented through delay and commitment. Knockback is a payload effect.

## Settled design decisions (2026-10-24)

- Unlimited pierce/hit cap (SETTLED): represented by a named constant `UNLIMITED`, never by overloading `0`. `pierce: 0` already means "dies on the first enemy hit" and `hitCap: 0` would be ambiguous against that, so an uncapped shape uses `pierce: UNLIMITED` / `hitCap: UNLIMITED`. The constant is defined once in move-attributes.js.
- Traveling growth (SETTLED): `grow` expands exactly ONE named dimension via `grow.dim` (defaults to `radRadius`); dimensions never expand together implicitly. Rate is driven by `grow.per` (`time` = px/s, default; `distance` = px of growth per px travelled). See the `grow` entry in Axis 2 for the full definition. To grow two dimensions you author two intentions, not one `grow` that touches both.
- `hitPolicy` vocabulary (SETTLED): the complete set for persistent/re-hitting shapes is exactly three values. `oncePerInstance` = a shape damages each enemy at most once for its whole life (one-shot projectiles, a single nova pass). `interval` = a shape may re-damage the same enemy every `rehit` seconds (orbs, auras, sustained beams); `rehit` supplies the interval. `onReentry` = a shape re-damages an enemy only when the enemy leaves the hitbox and re-enters it (no fixed clock). Default is `oncePerInstance`; `interval` requires a `rehit` value. No fourth policy is planned; a genuinely new contact rule would be added here deliberately, not improvised per move.

## Parked decisions (deferred with reason, not open design gaps)

- Size upgrades on a pierce-0 point can produce edge clipping or weak-feeling upgrades. PARKED, blocked on a gameplay feel-test: this is a play-and-see tuning call that cannot be settled on paper, revisit when the Size card is built.
- Exact collision tolerance for growing rings and persistent shapes at large simulation timesteps. PARKED, blocked on the collision implementation: the rule (compare previous/current radius each step, hit once per instance) is fixed in the `grow` entry; the numeric tolerance is a build-time decision made when the collision code is written, not a design decision.
