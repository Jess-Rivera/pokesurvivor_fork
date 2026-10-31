# Move Axis Schema (from-scratch design)

- **Role:** Move data grammar spec.
- **Owns:** Per-move data shape, axes, fields and enums, file roles, validator rules.
- **Does not own:** Runtime pipeline rules (docs/current feature planning/combat-architecture.md); per-move rulings (docs/MOVE-INTENT.md); general combat rules (docs/COMBAT-RULES.md).
- **Status home:** docs/current feature planning/move-schema-post-auth/slice-overview.md.
- **Last reconciled:** not yet

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
| `persistent` | Optional boolean at the top level of the move. `true` = the slot owns the move's life (combat-architecture:H25): no cooldown; while the slot is in the active group and the owner is not stunned it keeps one live group (the `count` shapes of one spawn); leaving the active group or a stun ends it (reason notActive), a faint ends it (ownerDeath), and a group that ends by its own `endOn` is spawned again on the next tick. So an aura is `persistent: true` with no `endOn`, and a pulse is `persistent: true` plus `endOn: [{ time: T }]`. A persistent move never lists `{ notActive: true }` (validator `persistent-no-notactive`). Absent = a normal cooldown move, which needs an `endOn` unless it is a self-cast (`needs-end`). A placed instance that merely ends on deselect (Spikes) is NOT persistent. The resolver reads the flag; it no longer guesses from `endOn`. (Jess, 2026-10-29) A persistent move needs a shape, an emitter, or a payload of only self heals (a heal aura: Aqua Ring, slice 5a, 2026-10-31); a heal over time with no `duration` lasts until its group ends and is only valid on a persistent move (validator `heal-needs-duration`). |
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
| spread | radians; the TOTAL angular fan across all instances, centered on the aim and evenly spaced across it (offsets run from -spread/2 to +spread/2). At 2 pi or more the instances are instead spaced 2 pi / count around the full circle, so Mud Shot and Aura Sphere (6.2832) read as "evenly around". Only used when count>1: the executor ignores it at count 1, but the authored value stays in the data so a count upgrade has a fan to use. A count upgrade makes the fan denser, not wider. High count + large spread = a radial nova made of points. |
| `pierce` | Number of enemy contacts a directional instance passes through before terminating. `0` means terminate on the first enemy hit, `n` means terminate after passing through n enemies, and omitting it means `UNLIMITED` (so a one-hit projectile must say `pierce: 0`). This owns enemy-contact termination; enemy contact is not also an `endOn` condition. |
| `chainHops` | Extra targets hit after the first. Pairs with `hopRange` (px). A chain is one hit that retargets; `count` creates separate instances. Hop k goes to the nearest enemy within `hopRange` of the previous hop, never that enemy, unhit enemies first, then revisits. Its damage is the full hit for that target times (1 - `hopReduction`)^k (declared by a `chainDamageFalloff` special, 0 when absent); rider chances halve per hop. |
| `splash` | Optional secondary area hit at an impact event: `{ radius, falloff, trigger }`. Radius `0` disables splash (the default; a card raises it, turning a single-target shot into an AoE). `trigger` defines when the burst fires: `enemyHit` (default), `terrainHit`, or `termination`; the default lives in the grammar (move-attributes.js), not per move. The splash burst is a SEPARATE event downstream of the primary shape's impact: it never consumes `pierce` (owned by the primary shape; a 4-enemy splash does not spend 4 pierce). `falloff` is linear from full damage at the center to a floor fraction at the edge radius. Splash CARRIES the payload's riders (ailment, knockback, stat) at HALF their primary chance: a 10% burn on the primary applies at 5% to each splash-caught enemy (round the halved chance as the proc model defines). Stat/knockback riders that are not chance-based apply at half magnitude on splash-caught targets. The resolver derives the splash rider set from the move's own payload; splash does not get an independent payload list. |

All shape-size values describe collision geometry, not merely rendering. The renderer may use the same values for visuals, but collision is authoritative. Numeric fields are upgradeable by default unless excluded through `cardLock`; each upgrade must still respect the field's valid range and geometry constraints.

## Axis 2: DELIVERY (how the shape gets there)

| field | values | meaning |
| --- | --- | --- |
| `anchor` | `caster`, `target`, `world`, or `self` | What the instance is attached to. `caster` follows or originates from the caster; `target` follows a selected target; `world` remains at a world position; `self` identifies a shapeless self-cast rather than a hitbox. `self` is reserved for shapeless casts. Anchor does not choose the target. |
| `targeting` | e.g. `direction`, `nearest`, `selected`, `location`, `self`, `none` | How the destination or affected target is selected. This is separate from `anchor`: a caster-anchored cone can aim at the nearest foe, while a caster-anchored projectile can fire in a direction. Define the allowed values and requirements in the grammar. |
| `locationPick` | `caster` or `enemy` | ONLY with `targeting: location`: where the instance lands. `enemy` (the default, written by the resolver) = a random enemy within `range`; `caster` = at the caster's feet. |
| `range` | px | One tunable reach. Covers `nearest` acquisition, `location` reach, the `returns` turnaround distance and the maximum `repositions` distance. Absent = the resolver fills the global default (G.MoveResolver.TUNING.RANGE, 420) where one of those applies; a move's own value wins (Razor Leaf 210, Bonemerang 230). |
| `delay` | seconds | Wind-up on the INSTANCE (the meteor telegraph). The instance has no hitbox until it ends, and `endOn` time counts from activation. Moved here from `casterState`. |
| `motion` | `static`, `travels`, `falls`, `returns`, `orbits`, `repositions` | How the instance moves. `repositions` moves the caster; other values describe the shape/instance. |
| `moveSpeed` | px/s | Linear travel speed. Absent for motion that does not translate linearly. |
| `angularSpeed` | rad/s | Rotation rate, used for orbiting or other explicitly angular motion. Do not overload linear `moveSpeed` for rotation. |
| `orbitRadius` | px | Required for `motion: orbits`; distance from caster to the orbit path. Distinct from `radRadius`, the orb's hit size. |
| path | `{ curve?, oscillate? }` (optional, default straight) | HOW a traveling shape weaves through space, independent of any target. A SET of optional, composable perturbations (NOT one mutually-exclusive type): `curve: <rad/s>` steadily rotates the heading (arcs/spirals); `oscillate: {amplitude: <px off-axis>, frequency: <Hz>}` applies a sine weave perpendicular to travel. A shot can have curve only, oscillate only, BOTH at once (a spiral-with-wobble), or neither (omit = straight). They are independent velocity perturbations applied each frame, so they coexist. ORTHOGONAL to turnRate (homing/target-seeking) and grow (expansion); path is target-independent and composes with both (a curving shot can still home and still pierce). NOTE: two DIFFERENT path patterns within one move (e.g. 6 shots curve left, 6 right) is NOT a second path field, it is multiplicity, a count-group or a multi-cast/bond concern, each group carrying its own path. |
| repositionMode | teleport, swept | ONLY on motion:repositions. Two values describing HOW the caster travels: `teleport` = jump instantly to the end point (today's dash); `swept` = real traversal to the end point (speed-driven, see `dashMult`). WHETHER the caster comes back is a separate, orthogonal axis, `returnToOrigin`, so these two modes combine with that boolean to cover all four behaviours (plain dash, teleport-and-back, sweep-and-back) without enumerating them as mode names. |
| returnToOrigin | boolean | ONLY on motion:repositions. `true` = after reaching the target the caster returns to the launch point (the position captured at cast time), travelling back the same way its `repositionMode` says (a teleport jumps back, a swept sweep sweeps back). `false`/omitted = no return, the caster ends at the target. Orthogonal to `repositionMode`. On a caster reposition there is no actor left behind at the origin, so "return toward the caster's CURRENT position" is incoherent (that would be motion:returns, a boomerang, a different mechanic): the only meaningful question is come-back-to-launch vs stay-at-target, hence a boolean. With `true`, `returnHits` picks which legs strike and the instance ends on `{ returned: true }`. |
| returnHits | out, outAndBack | ONLY meaningful with `returnToOrigin: true`. `out` (default) = strike only on the way out; `outAndBack` = strike on both legs. |
| dashMult | number | ONLY on `repositionMode: swept` (a teleport is instantaneous and ignores it). Traversal speed = `dashMult` x the caster's final move speed. The dash duration is DERIVED from distance / speed, so the move does not pin a fixed time. Example: Quick Attack `dashMult: 10` sweeps at 10x the caster's current move speed out to the target and (with `returnToOrigin: true`) back. Supersedes the vaguer `dashSpeedMult` wording. |
| `grow` | `{ growSpeed, dim?, per?, max? }` (optional) | Expands one named dimension. `growSpeed` is px/s (radians/s when `dim` is `radArc`); `dim` defaults to `radRadius`; `per` is `time` (default) or `distance` (px of growth per px travelled); `max` optionally caps the grown dimension (Psychic's arc stops growing at 2.0). The authored dimension is the START value and `grow.max` is the end (DECIDED CP1-Q1). Specify `radArc` for a widening arc or `linLength` for an extending beam. Travel remains the job of `moveSpeed`, so a shape can travel and grow simultaneously. Collision rules must define how expansion crosses enemies; for an expanding ring, track previous/current radius and hit each enemy at most once per instance. |
| turnRate | rad/s, 0 = off | Homing steering: the heading turns toward the current target by at most turnRate x dt per step (a clamped turn, not the legacy damp; DECIDED CP1-Q13). One number; the old `tracking` bool was just turnRate>0. Rejected on static shapes. |
| aimTrack | rad/s, 0 = off | For a STATIC-aimed shape (cone, beam): how fast its AIM ANGLE rotates to follow its tracked enemy. The tracked enemy is sticky: the cast target while it lives within the shape's reach (min(range, reach + its radius), the cast gate's limit), then the nearest within that reach, re-picked whenever lost; with none in reach the angle holds (MOVE-INTENT flamethrower, built slice 4c-3). Same units as a turn rate, but it rotates the shape's facing, not a projectile's velocity (that is turnRate's job, and turnRate stays rejected on static shapes). Flamethrower aimTrack 1.4 = the cone swivels toward its tracked enemy at 1.4 rad/s. 0 = fires in the fixed aim direction. Distinct from turnRate so steering-a-bullet and swiveling-a-cone stay separate mechanisms. |

### Instance lifetime: `endOn`

There is no separate `lifetime` enum. An instance ends when the first condition in its `endOn` list fires. A timer is `{ time: N }`; a simple timed instance can use that as its only condition. A cast may resolve immediately while its resulting payload effects persist independently.

| condition | meaning |
| --- | --- |
| `{ time: N }` | Instance ends after N seconds. `{ time: 0 }` resolves immediately. |
| `{ contact: "wall" }` | Instance contacts terrain/prop. Separate from enemy contact. |
| `{ ownerDeath: true }` | The source object is destroyed or removed. |
| `{ notActive: true }` | The move is no longer the active selected skill. For a NON-persistent instance that should end on deselect (Spikes). Never on a persistent move: its slot already ends it (`persistent` row, combat-architecture:H25). |
| `{ offScreen: true }` | Instance leaves the permitted play area. |
| `{ returned: true }` | The reposition's return leg (or a `motion: returns` instance's trip) has completed and arrived back. The natural terminator for a `returnToOrigin: true` reposition and for boomerang-style returns, which are speed-driven (see `dashMult`), not time-capped. |

Enemy contact is owned by `pierce`: `pierce: 0` terminates on the first enemy hit, while `pierce: 2` permits two enemies to be passed through and terminates on the third hit. `endOn` handles independent termination conditions such as time, wall contact, owner death, inactive selection, or leaving the play area.

A mine's proximity detonation is a separate `trigger`, not pierce or an `endOn` condition. Its placement/emitter definition detonates once on `trigger: contact` and is gone. A timeout is optional: Spikes lasts until triggered (ending only if the move is no longer active), while Toxic Spikes is a timed placed emitter that emits on an interval (MOVE-INTENT toxic-spikes). A turret can end on owner death or a time cap, whichever happens first.

## Axis 3: PAYLOAD (what happens when the move resolves or hits)

An ordered list of effect records. Payload effects are decoupled from geometry, so the same handler can serve a melee hit, beam tick, or nova pulse. Each effect declares its target (`side`/scope as appropriate) and its own duration when it persists beyond the hit event. A hitbox's `endOn` never implicitly expires an already-applied status, shield, heal-over-time, or other persistent effect.

| effect `t` | carries | meaning |
| --- | --- | --- |
| `damage` | Uses source `power` and the game's damage formula unless a named handler overrides it. | Default direct-damage effect. |
| `knockback` | Distance in px | Push applied to the affected target. Omit or use `0` for no push. |
| `ailment` | Ailment ID, chance, `side`, optional `duration` | Burn/poison/paralysis/trap/etc. Chance comes from source data where available; the game's proc model owns application. Applied ailments have their own duration/tick rules and are not tied to the originating hitbox's lifetime. |
| `stat` | Stat ID, `stages`, `side`, explicit `scope`, optional `chance` | Stage change. `chance` is the percent proc chance when the stage change is a rider (absent means it always applies). `stages` is what one success gives (pokeapi). How a change behaves over time (trackers, Gate, Duration, the Cap) is a combat rule, docs/COMBAT-RULES.md "Stat stages", not a move field. `duration` and `maxStacks` are retired (see "Retired stat fields" below). Scope is explicit (`caster`, `individual`, `team`, or another validated target scope); it is never inferred from the sign of `stages`. |
| `heal` | Amount formula and `side` | Recovery from damage dealt, a flat amount, or a fraction of max HP. Drain is a heal with `from: dealt`, not a separate primitive. |
| `shield` | Amount formula, optional `max`, `regen`, `absorbsAll`, `overflow`, `blocksStatus`, and `duration` | Temporary HP pool. `regen` is HP/s. `absorbsAll` routes incoming HP loss through the shield but does not prevent status application. `overflow` lets excess damage spill into real HP. `blocksStatus` prevents new ailments while active. `duration` controls shield expiration independently of the move instance. |
| `flinch` | Chance and optional duration | Lost-action roll. Resolve as a target effect, independent of the source hitbox lifetime. |
| `multihit` | `{ hits: N }` or `{ min, max }`, optional `normalize` | Repeats hits against one target from a single hitbox. Fixed or rolled hit count. `normalize: true` divides source power by the base hit count once during resolution; `false` gives every hit full power. This differs from `count`, which creates separate instances. |
| `crit` | `critChance`, in percent points | Critical-hit-rate modifier. `critChance` is divided by 100 in exactly one place (DECIDED CP1-Q12; combat-architecture D10). |
| `recoil` | Fraction or formula, plus `trigger` | Self-damage paid on cast or after a hit. The trigger determines when it resolves; hitbox termination does not. |
| `emit` | `move` (ID or inline), `every`, `trigger`, `endOn` | Places an emitter with no HP or AI that creates/fires a move on an interval or trigger. The emitted move owns its own geometry, motion, payload, and lifetime. Supports turrets, mines, and trails. |
| `spawn` | `entity` (ID or inline), `allegiance`, `endOn` | Places a combatant with HP, AI, and a moveset. `allegiance` determines its relationship to the summoner and its targets. |
| `special` | Handler ID and validated parameters | Escape hatch for genuinely bespoke mechanics, such as fixed/level/conditional damage, weather changes, OHKO, Bide, Counter, Metronome, or Transform. Use a special only when the behavior cannot be represented cleanly by existing primitives. A different numeric damage formula alone should not require a unique handler per move. |

**Normalization rule:** `normalize: true` establishes base per-hit/per-tick damage once during resolution, using source power divided by the base hit/tick count. The result is applied once in the damage formula; it is not recalculated every cast. Damage upgrades and duration/rehit upgrades apply afterward. Therefore, adding ticks increases total damage, with each tick using the normalized base. `normalize: false` gives every hit/tick full power. This policy applies to multihit and any persistent/count-based move explicitly configured to use it.

### Retired stat fields (`maxStacks`, `duration`)

Formerly "maxStacks field rule"; a pointer to that title means this section.

- [Approved] `maxStacks` and the `stat` effect's `duration` are retired by the stat stage tracker model: the Cap, the Gate and the Duration are global combat rules (docs/COMBAT-RULES.md "Stat stages", SS1 to SS7), so no move authors either field. (Jess, 2026-10-30) Code differs, see TODO: removed in slice 5 from the new-path data, the resolver defaults and the overrides once the tracker harness passes; the validator then rejects both fields. The legacy table's own fields go with the legacy path in slice 7b. (Jess, 2026-10-30)
- Removed 2026-10-31 (slice 5a pass 2): the grammar has neither field, the resolver fills neither, and tools/validate_moves.js rejects both as unknown fields. Before that `maxStacks` defaulted to 1 on self-side `stat` effects (foe caps only when authored: Ice Beam, Bug Buzz) and `duration` to 6 s. (Q14; D-FOECAP; combat-architecture:H24)
- History: the default of 6 (this file before 2026-10-28, review section 9.1 Q4), then Q14, Q15, Q16 and D-FOECAP.

### Shapeless state-change moves

Some moves change global state rather than creating a hitbox. They use `anchor: self`, `targeting: none`, and a `special` state-change handler, with no SPACE fields.

- Weather: `{ t: special, handler: setWeather, weather: <kind>, duration: N }`. The handler calls the weather system for N seconds. A player-cast weather effect overrides ambient weather for its duration.
- Terrain/field: Electric/Grassy/Misty/Psychic Terrain and effects such as Trick Room use corresponding named handlers when implemented.

The move's cast/activation lifetime and the weather/terrain effect duration are separate. The global state effect persists for its declared duration even if the move's cast has already completed.

`side` describes the affected relationship (`self`, `ally`, or `foe`). It does not replace explicit targeting or stat scope. Effects that can affect different sides must state their intended target rather than relying on the effect type alone.

`emit` and `spawn` remain separate primitives. An emitter has no HP, AI, or allegiance; a spawned combatant has all three. They can compose: a spawned combatant's moveset may itself emit or spawn other objects.

## Caster state (effects on the caster while casting or moving)

This group is not a hit axis because it changes the caster rather than the hit target. It is optional and absent from most moves. All of its fields live under a single `casterState` object on the move.

| field | meaning |
| --- | --- |
| `iframes` | Seconds of invulnerability. For swept dashes, may be expressed as travel duration plus a trailing interval; teleport dashes use a duration beginning on arrival. |
| `commitment.movement` | `(type, t)`, written `{ type, t }`. `type` is `slowed` (the caster gets -2 Speed stages for `t`) or `rooted` (the caster's move speed is 0 for `t`, like the enemy trap root). `t` defaults to the parent's `endOn` time. |
| `commitment.cooldown` | `freeze(id, t)`, written `{ type: freeze, id, t }` (absent = normal cooldown ticking, there is no `tick` value).  `id` defaults to all cooldowns, or names a move id or a list. `t` defaults to the parent's `endOn` time, may be seconds, or `untilEffectEnd` (an instant self-cast such as Substitute: the shield's life, ended early by a break, swap or faint). Frozen timers do not run; they arm when the freeze ends. |
| `delay` | MOVED to `delivery.delay` (the instance carries its own wind-up). Not a caster-state field any more. |

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

[Approved] Note (2026-10-28): this example predates CP1-Q1. Under Q1 the authored `radRadius` is the START size and `grow.max` is the end; novas are re-authored with `max` = today's radius, a 1 px start and growSpeed unchanged. Current data: see js/data/moves-generated.js.

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
  cd: 12            # hand override (move-overrides.js)
  anchor: self
  targeting: self
  casterState: { commitment: { cooldown: { type: freeze, id: substitute, t: untilEffectEnd } } }
  payload: [
    { t: recoil, fraction: 0.25, trigger: cast },
    { t: shield,
      amount: { op: multiply, args: [{ op: ref, path: cast.paid }, 2] },
      max: { op: multiply, args: [{ op: ref, path: cast.paid }, 2] },
      regen: { op: ref, path: effect.max },
      duration: 4,
      absorbsAll: true,
      overflow: true }
  ]
}
```

With 100 max HP, the cast pays 25 HP and creates a 50-HP shield that regenerates at 50 HP/s for 4 seconds. The 12 s cooldown is frozen while the shield lives and starts when it ends (expiry, a break to 0, a swap or a faint). The cast waits while HP is at or below the cost (recoil never kills) and while a shield is live. Incoming damage drains the shield first; excess damage spills into real HP. Status can still be applied, but its damage-over-time drains the shield. The formula examples above use a restricted, typed formula representation, not executable JavaScript strings.

## Presets and validation

A preset (for example, `beam`, `nova`, or `melee`) is authoring shorthand: a named bundle of defaults. The resolver expands presets at load time, applies explicit overrides, and passes only resolved definitions to the runtime. The executor never interprets presets.

Keep the grammar and presets separate:

- `move-attributes.js` defines legal fields/values, primitive IDs, defaults, and `needs`/`allow`/`reject` constraints.
- `move-classification.js` defines presets.
- `check.js` runs the generic validator against the grammar and the same resolver used by the game.

Validation rules should be data-driven where practical. Examples: `grow` requires a finite lifetime or another terminating condition; `returns` requires a compatible point/linear geometry; area geometry rejects `pierce`; `turnRate` requires moving, steerable geometry; `aimTrack` requires a directional static shape; `orbitRadius` and `angularSpeed` require `motion: orbits`.

Avoid booleans that duplicate derivable numeric state. Keep a field's constraints with its definition, and avoid encoding the same event in two independent fields.

- [Approved] Persistent rule: `persistent` forbids `cd` (`persistent-no-cd`) and forbids `endOn notActive` (`persistent-no-notactive`); its `endOn`, when present, lists only instance ends, each followed by a respawn. A move that is not persistent needs an `endOn` unless it is a self-cast, and a self-cast rejects one because its effects carry their own duration (`needs-end`, `self-has-no-end`). Supersedes the review 9.2 C13 wording "requires an endOn notActive". (Jess, 2026-10-29; combat-architecture:H25)
- [Approved] The ten combination rules in docs/current feature planning/combat-validation-and-handoff.md section 2.4 are added in slice 4c-1 (Jess, 2026-10-27, slice-4c.md). Built 2026-10-29; the rule ids are listed in combat-validation-and-handoff:2.4.

## File roles

Copied from docs/current feature planning/move-schema/slice-overview.md, "File roles" (2026-10-27).

1. docs/move_rework_holding/move-conversions-described.json: source of truth database (63 moves, Bubble excluded).
2. js/data/move-attributes.js: the grammar (fields, defaults, cross-field rules).
3. js/data/moves-generated.js: the database as usable JS (generated by tools/export_moves.js, never hand-edit).
4. js/data/move-overrides.js: per-move overrides only (hand cds).
5. js/data/move-handler.js: special handler declarations (6; executors in move-effects.js since 4b, berrySteal still a stub).
6. js/data/move-resolver.js: defaults, derived values (cd, basePower, range, locationPick), overrides, handler attachment, G.MoveDefs. TUNING holds the cd constants, RANGE 420 and INSTANCE_CAP 8.
7. New from slice 3b (loaded by the game since 3d, active only with ?dev&newcombat): js/systems/move-geom.js (G.MoveGeom, pure math), move-sim.js (G.MoveSim), move-effects.js (G.MoveEffects), move-route.js (G.MoveRoute, the flag and the ONE routed list), move-render.js (G.MoveRender, drawing and cast glue).

Runtime behavior of the files in item 7 is owned by docs/current feature planning/combat-architecture.md.

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
- `kind` is not a schema field (removed 2026-10-25). Behavior is read from the axes. Any legacy kind exists only as a derived compatibility value in the resolver's bridge projection, deleted when the legacy path is removed.

## Grammar decisions absorbed from review section 9 (2026-10-28)

Source: docs/current feature planning/move-consistency-review.md section 9 (Checkpoints 1 to 3). Rulings about one move live in docs/MOVE-INTENT.md; runtime rules live in combat-architecture.md section H.

- [Approved] Grow start (CP1-Q1): the authored dimension is the START value and `grow.max` is the end. Nova start value 1 px (Jess, 2026-10-26); it passes the existing `radRadius` greater-than-0 rule, so no grammar change is needed. See the `grow` row.
- Stat riders (CP1-Q4): `duration` and `maxStacks` are gone (retired 2026-10-30, removed 2026-10-31), see "Retired stat fields".
- [Approved] Emit counts (CP1-Q7): emit `count` = total emissions, child `space.count` = shapes per emission.
- [Approved] Range (CP1-Q8): one tunable `range`, global default 420 px as a named constant beside the cooldown tuning (G.MoveResolver.TUNING), optional per-move `delivery.range`. See the `range` row.
- [Approved] critChance units (CP1-Q12): percent points, divided by 100 in exactly one place. See the `crit` row.
- [Approved] turnRate units (CP1-Q13): rad/s, a clamped turn (not the legacy damp). See the `turnRate` row.
- [Approved] Delay (CP1-Q17): the telegraph delay lives on the instance (`delivery.delay`), not on `casterState`. See the `delay` row.
- [Approved] Persistent flag (C13): an explicit top-level `persistent` boolean replaces the "no cd means persistent" inference. See the `persistent` row and "Presets and validation".
- [Approved] Spread (F1, 2026-10-26): spread is the total fan, evenly spaced at 2 pi or more. See the `spread` row.
- [Approved] Location pick (F3): an enum, "at caster" or "random enemy within range", defaulting to the enemy. See the `locationPick` row.
- [Approved] A radial shape with no radArc is a point (slice 3b geometry, Jess 2026-10-26).
- [Open] C14: power 0 vs null (Will-O-Wisp, Substitute). Review section 9.4 says "Harmless, not decided".

## Settled design decisions (2026-10-24)

- Unlimited pierce (SETTLED): represented by a named constant `UNLIMITED`, never by overloading `0`. `pierce: 0` already means "dies on the first enemy hit", so an uncapped shape uses `pierce: UNLIMITED`, which is also the default when `pierce` is omitted (decided 2026-10-25; a one-hit projectile must say `pierce: 0`). The constant is defined once in move-attributes.js. (`hitCap` was an artifact of an earlier schema pass and is removed.)
- Traveling growth (SETTLED): `grow` expands exactly ONE named dimension via `grow.dim` (defaults to `radRadius`); dimensions never expand together implicitly. Rate is driven by `grow.per` (`time` = px/s, default; `distance` = px of growth per px travelled). See the `grow` entry in Axis 2 for the full definition. To grow two dimensions you author two intentions, not one `grow` that touches both.
- `hitPolicy` vocabulary (SETTLED): the complete set for persistent/re-hitting shapes is exactly three values. `oncePerInstance` = a shape damages each enemy at most once for its whole life (one-shot projectiles, a single nova pass). `interval` = a shape may re-damage the same enemy every `rehit` seconds (orbs, auras, sustained beams); `rehit` supplies the interval. `onReentry` = a shape re-damages an enemy only when the enemy leaves the hitbox and re-enters it (no fixed clock). Default is `oncePerInstance`; `interval` requires a `rehit` value. No fourth policy is planned; a genuinely new contact rule would be added here deliberately, not improvised per move.

## Parked decisions (deferred with reason, not open design gaps)

- Size upgrades on a pierce-0 point can produce edge clipping or weak-feeling upgrades. PARKED, blocked on a gameplay feel-test: this is a play-and-see tuning call that cannot be settled on paper, revisit when the Size card is built.
- Exact collision tolerance for growing rings and persistent shapes at large simulation timesteps. PARKED, blocked on the collision implementation: the rule (compare previous/current radius each step, hit once per instance) is fixed in the `grow` entry; the numeric tolerance is a build-time decision made when the collision code is written, not a design decision.
