
## Kinds are presets, not types (Jess, review 2026-10-23)

A "kind" (beam, nova, melee, the 19 names) is NOT a runtime type the engine switches on. It is a PRESET: a named bundle of default attribute values, pure authoring shorthand. This is the core of the refactor.

- TODAY: `kind` is a discriminator. combat.js branches on it (`if kind==='beam' ... else if kind==='nova'`) and each branch is a hand-written function. The kind IS the behavior.
- NEW: the engine never sees "beam". It sees `shape:line, motion:static, pierce:N` and runs the line primitive. "beam" has no runtime meaning. It exists only so you (and the classifier) can write `preset: beam` and have it expand to the eleven attributes, then override just what differs (Ice Beam = the beam preset + a freeze ailment payload). That is the move-classification.js layer: "kind preset plus only the attributes that differ".

Two definition files, different jobs (do not conflate):
- move-attributes.js = the GRAMMAR: every legal value of every axis, its engine-primitive id, defaults, and legal co-values (needs/allow/reject, the validator-as-data). Describes what an attribute CAN be. The engine and check.js read this.
- move-classification.js = the PRESETS: "beam = {these attribute values}", a dictionary of named starting points. Pure sugar; the resolver expands it into attributes at load, then applies per-move overrides on top. After load there is no "beam" in G.MOVES, only resolved attribute sets.

THE RULE that keeps presets from silently becoming types again: `kind` / `preset` is consumed ONLY by the resolver at load time, NEVER by the executor at runtime. The moment the executor reads `kind` for anything other than load-time default expansion, the if-ladder is back. Test: two moves with identical attributes must behave identically regardless of their kind label, and any move must be reclassifiable to a different preset without touching engine code. Presets may be lossy shorthand; they may not carry behavior.

## From schema to screen (Jess, review 2026-10-23)

How a resolved move becomes pixels, and the discipline that stops rendering from re-introducing a per-kind switch.

The chain: move-attributes + move-classification -> (resolver, at load) -> G.MOVES[id] = resolved attribute set -> (executor, at cast: `executor(caster, move, aim)`) -> a live INSTANCE in the world (a hitbox at position P, angle, size, born at T) -> (present layer, every frame) -> a DRAWABLE the renderer paints. This is the existing G.SimBus sim/present boundary: the executor is sim (owns the hitbox and what it touches), the drawable is present (renders from instance state).

What you draw is a function of the SHAPE primitive, NOT the kind. The renderer never asks "is this Ice Beam" or "is this a beam". It asks the instance "what shape are you and what is your current geometry/state" and draws that. One draw routine per shape (5 total): a `line` instance draws a rectangle from origin along its angle, length = current reach, width W; a `circle` draws a disc of radius R (and if `expanding`, R grows over the lifetime so the ring animates for free); a `point` draws a sprite at its position; etc.

A move's look has three INDEPENDENT inputs, and keeping them independent is what removes the per-move switch:
1. SHAPE -> the hitbox geometry drawing. Finite (5 shapes), generic. Expansion, lifetime fade and tick pulses fall out of instance state, not the move id.
2. TYPE -> the skin (palette + particle sprites + impact FX). Ice Beam and Hydro Pump are the SAME line primitive; type is what makes one frost and one water. A lookup table (18 types -> palette+particles), the same principle as G.Icons composing the move icon from the type emblem today.
3. OVERRIDE -> the rare bespoke look. An optional `vfx` field in the OVERRIDES file (same layer as hand-tuned numbers). Present = renderer uses it; absent (the default) = compose from shape+type. Keeps special visuals as data, not draw-code branches.

So 833 moves render from 5 shape-draw routines x an 18-entry type palette + a short override list. No `switch(kind)` in the draw code.

Worked proof it reaches pixels: Thunderbolt (smite: shape point, anchor target) draws the strike sprite AT the target, no travel. Thunder Shock (shape point, anchor caster, motion travels) draws the same sprite but tweens it across the screen. The visual difference between a smite and a projectile is produced entirely by anchor+motion driving where the instance lives and whether it moves; the renderer never knew either move's name. Ice Beam vs Hydro Pump: identical line draw routine, different type skin, zero extra draw code. Heat Wave (circle, expanding) animates its ring just by reading its live radius each frame.

THE RENDERER DISCIPLINE (twin of the presets rule): the renderer may read shape, instance state, type, and the optional vfx override, and nothing else. Never kind or move id. If a move needs a look those four cannot produce, the answer is a new shape primitive (rare: field, wall) or a vfx override entry (data), never a branch in the draw routine.


Oct 23, 2026. A concrete schema for the data-driven, one-way-generation move system, derived from two facts only: the source is PokeAPI, and the target is a survivor-like. This is a design proposal, nothing is built. It is meant to sit beside MOVES-REFACTOR-PLAN.md and make the attribute layer concrete enough to build or to argue with.

Grounded in the real data: the 373 approved moves in docs/move_rework_holding/moves.generated.js already carry a first-pass delivery + payload split and the full PokeAPI fact set. A scan of them is what the numbers below are based on.

## The one framing decision everything hangs on

A turn-based move is an EVENT: one target, one accuracy roll, one PP decrement, resolved and done. A survivor-like move is a standing EMITTER: it auto-fires on a cooldown, faces a crowd, and is judged by sustained throughput and screen readability. The whole import is the translation event -> emitter. Written down first because otherwise it leaks into a hundred per-move guesses.

Consequence: a move's identity in this game is geometry + cadence + effect, not "what it does on a turn." The axes exist to capture exactly those three.

## Why axes at all (what the data says)

Of the ~238 approved moves the scan parsed cleanly, the payload distribution is:

- 157 are `[damage]`
- 44 are `[damage, ailment]`
- 6 are `[damage, multihit]`
- 12 are status-only `[]` (buff / heal / ward, payload sits elsewhere)
- the entire rest (stat combos, drain, shield, recoil, charge, crit) is a ~15-move long tail, each 1 to 2 moves.

So about 85% of the catalog is "damage, maybe one rider." That is the empirical proof that effect should be factored OUT of geometry: nearly every move shares one of two payloads and differs only in how it reaches the target. A kind enum re-encodes the geometry into the payload and loses that; axes keep them independent, so coverage becomes "is each axis complete," not "did we enumerate every combination."

## Three primary axes, not eleven flat attributes

Same expressive power as the eleven-attribute list in MOVES-REFACTOR-PLAN.md, but structured as three questions with sub-parameters hanging off each. The hierarchy is the point: it tells you where a new attribute belongs and stops the schema flattening into flag-soup (the splash/tracking-as-lonely-booleans smell).

The three independent questions:

1. SPACE. Where does the hit happen and how is it shaped? -> the `shape` axis + its size/count sub-params. This is the hit test itself, not a projectile-pattern label.
2. DELIVERY. How does that shape get there and what is it pinned to? -> `anchor` + `motion` + `lifetime`, plus `expanding` / `tracking` as sub-flags of motion.
3. PAYLOAD. What happens to whatever it touches? -> an ordered list of effects, fully decoupled from space and delivery.

Orthogonality check: any shape can carry any payload and move any way. A cone can damage (Flamethrower), a cone could heal (a frontal mend), a circle can damage (nova) or buff (a team aura). Because that holds, the three axes are genuinely independent and the factoring is cut at the joint.

### Axis 1: SPACE

| Field | Values | Meaning |
| --- | --- | --- |
| shape | point, line, cone, circle, arc | The hit-test geometry. point = a dot (a projectile or a melee contact test), line = a beam/segment, cone = a wedge, circle = a disc, arc = a partial ring. |
| radius / width / length | numbers | Size of the shape. Which ones apply is a property of the shape (cone uses radius+arc, line uses length+width, circle uses radius). |
| count | number | How many instances of the shape (3 for a Razor Leaf fan, 1 for Ember). |
| spread | number (radians) | Angular spread when count > 1. |
| hitCap | number, or UNLIMITED | How many primary targets ONE instance may hit. 1 = a rocket that stops at the first. 5 = a piercing shot through five. UNLIMITED = an area. Folds in the old single/multi/area/pierce. |
| pierce | number | Longitudinal penetration: how many bodies a DIRECTIONAL shape passes through along its axis before stopping. Its own value, NOT an alias of hitCap. Allowed on point and line only (rejected on circle/cone/arc: areas cover, they do not penetrate). For a beam it sets how far down the lane the box extends (length is an output of pierce up to a max range). For a width-0 point the two coincide (hitCap = pierce + 1), which is the degenerate case, not the general rule. |
| chainHops | number | How many extra targets a hit bounces to after its first. Only meaningful when `shape: point` (chain is a point that re-targets, not its own geometry). 0 = no chaining. |

Every sub-param is conditionally relevant to the shape, which is normal for this axis and the attribute record declares the gating (its `needs` / `allow` lists): `arc` only means something for cone, `length` only for line, `spread` only when `count > 1`, `chainHops` only for point. So `chainHops` is an ordinary SPACE sub-param (same category as radius/count/spread/hitCap), NOT a bolted-on chain-specific field. It just happens to be legal on one shape.

shape does real work: it is the hit test. chain is therefore NOT a shape, it is `shape: point` + `chainHops`. That keeps the shape axis to five true geometries.

pierce and hitCap are DIFFERENT fields (Jess, review 2026-10-23), because once a shape has width they measure different things: pierce is longitudinal (how deep down the axis it penetrates, which sets a beam's length), hitCap is a total-body ceiling across the whole area this tick, and width is lateral coverage (the Area card scales it). The disproof of folding them: a beam of `width: wide, pierce: 1, hitCap: 4` stops one body deep on its axis, catches off-axis bodies by width, and still caps total hits at 4, three independent numbers that no single field can carry. Beams typically default hitCap to UNLIMITED (the thread-the-needle fantasy: aim down a packed lane and melt everything), with pierce as the primary limiter, but hitCap stays authorable so a capped beam remains legal. The `hitCap = pierce + 1` identity holds ONLY for a width-0 point.

### Axis 2: DELIVERY

| Field | Values | Meaning |
| --- | --- | --- |
| anchor | caster, target, world | What the shape is pinned to. caster = moves with you (orbit, aura). target = lands on a foe (meteor). world = fixed in space (mine, trail, field). Replaces "follows user / follows target". |
| motion | static, travels, falls, returns, orbits, repositions | How the shape moves relative to its anchor. travels = a projectile, falls = a meteor drop, returns = a boomerang, orbits = a satellite, repositions = a dash that moves the CASTER. |
| lifetime | instant, timed, persistent, untilTriggered | How long the shape lives. instant = one resolve (projectile hit), timed = a duration (cone spray, aura), persistent = stays until killed (turret), untilTriggered = waits (mine). |
| expanding | bool | Does the shape grow over its lifetime (a nova ring). Sub-flag of motion; requires circle/arc/cone. |
| tracking + turnRate | bool + number | Does it steer toward a target. Off by default, never guessed by the importer, rejected on static shapes (mines). |

### Axis 3: PAYLOAD

An ordered list of effect records applied to whatever the shape hits. Decoupled from space and delivery, so the same handler serves a melee hit, a beam tick and a nova pulse.

| effect `t` | carries | Meaning |
| --- | --- | --- |
| damage | (uses the move's power + your equations) | The default. 221 of the parsed moves have it. |
| ailment | ailment id, chance | burn/poison/para/etc. Chance comes from PokeAPI; your roll-gap model owns how chance becomes application. |
| stat | stat id, stages, side (self/foe) | A stage change. side says who. |
| heal | amount `{ from, value/frac }` | The single recovery effect. `from` selects the source: `dealt` (frac x damage this hit = a drain), `flat` (a fixed number), `maxFraction` (frac x max HP = Recover / Roost / Aqua Ring). drain is NOT a separate primitive, it is `heal` with `from: dealt`. |
| shield | amount | Temporary HP. |
| flinch | chance | Lost-action roll. |
| multihit | count range | Rolls the mainline pellet count; total normalized by your equations. |
| crit | stage | Crit-rate bump. |
| recoil | fraction | Self-damage. |
| field | field id | Places a world effect (collapses into anchor:world + a field payload). |
| emit | move id, every, dur, trigger | Places an EMITTER: a positioned object with no AI that re-casts a move on a timer (trigger: timer) or on contact (trigger: contact), for `dur`. Folds in turret (timer), mine and trail (contact / once). NOT a combatant. |
| spawn | entity id, allegiance, lifetime | Places a COMBATANT: a full entity with HP, AI, movement and its own moveset. `allegiance` hostile = targets the player (enemy summoner), friendly = targets enemies (a future player summon). References the SHARED species+moveset+AI entity definition, not a bespoke summon format. |
| special | handler id | Named escape hatch, see below. |

### emit vs spawn: two placement primitives, not one (Jess, review 2026-10-23)

The representability test on the 19 current kinds classified 18 cleanly and found ONE real gap: `turret` is not shape+payload, it is a persistent object that CASTS ANOTHER MOVE on a timer. The axes could not express "this move places a thing that runs moves." Closing that gap generalized into two payload primitives that also absorb mine, trail and the enemy summoner class:

- `emit` places an EMITTER: position + a move + an interval/trigger + a lifetime. No AI, no HP, no allegiance logic. It just fires move X every N seconds (or on contact) for `dur`. turret = emit on a timer; mine = emit once on contact; trail = emit a short-lived damage tick along a path.
- `spawn` places a COMBATANT: a full entity with HP, AI, movement and a moveset, plus an `allegiance` bit. Enemy summoner = spawn hostile (chases the player); a future friendly summon = spawn friendly (chases enemies). Jess's insight: a summoned minion and a hostile summon are the SAME primitive with the allegiance flag flipped.

Why two and not one: forcing a turret through `spawn` means giving it a null AI, no movement and no allegiance, a pile of N/A fields (the sentinel smell). An emitter has a genuinely smaller contract than a combatant, so different inputs -> different primitives (same reasoning as heal vs drain). But they COMPOSE and bottom out together: both ultimately "run a move entry", and a spawned combatant's own moveset may itself contain an emit or spawn payload (a minion that drops turrets). Both are payload types so a move can damage AND place (a damaging shot that also leaves a turret).

Shared-entity rule: `spawn` references the same species+moveset+AI entity definition that gym rosters and wild spawns use (the "species + moveset + AI profile" shape the moves import is moving toward), so there is ONE entity model across wild / gym / summoned, not a separate summon format.

This retroactively folds four kinds: turret / mine / trail -> `emit`; enemy summoner -> `spawn`. Field and wall (deferred) are the only remaining true-new geometry.

### drain is heal composed, not a third primitive (Jess, review 2026-10-23)

drain and heal both add HP, but they are one effect with different SOURCES, not two effects. The defining trait of a drain is that its output is a function of damage dealt; the defining trait of a flat heal is that its output is independent of damage. So `heal.amount.from` selects the source, and drain drops out of the primitive list entirely:

```
heal.amount = { from: 'dealt',       frac: 0.5 }   // Giga Drain: 50% of damage this hit
heal.amount = { from: 'flat',        value: 20  }   // a fixed restore
heal.amount = { from: 'maxFraction', frac: 0.25 }   // Recover / Roost / Aqua Ring tick
```

A drain move is then the payload LIST `[ {t:damage}, {t:heal, amount:{from:'dealt', frac:0.5}} ]`: damage the foe, then heal the caster from what the prior effect dealt. That is the payload-list doing its job (composition), and it reduces the primitive count by one.

Rejected alternative (considered and dropped): a single additive equation `HP += (dmg_out + base_heal) * drain_frac`, with drain = `(dmg,0)*0.5` and heal = `(0,amount)*1.0`. It unifies them too, but it forces a sentinel in every move (heal must pin `drain_frac` to 1.0 as a no-op, or it silently scales the authored amount) and models a `dmg_out + base_heal` sum that no real move ever uses (every move is drain XOR heal, never both). The typed-source form says the same thing with no magic constant and no dead input quadrant, and it gives `maxFraction` recovery for free.

side (self / ally / foe) is a payload property, not a top-level axis, because different effects in the same move can target differently (a damage+self-buff move). effect + side together enforce the only hard rule: damage and foe-debuff target foes; heal/buff/shield target self or ally.

This is where the five "unbuilt kinds" evaporate: control = any shape + an ailment payload. mend = `shape:point, anchor:caster, side:self` + a heal payload. ward = same + a shield payload. None of them is new geometry. Only field and wall need genuinely new shapes, and both are deferrable.

## The validator is the product, and it is DATA not branches

An orthogonal space is combinatorially large and most of it is nonsense (a world-anchored returns motion is meaningless). The component that makes this engineering rather than a data pile is the constraint layer. Design it as data: each axis value declares, in move-attributes.js, its own (a) engine-primitive id, (b) default sub-params, and (c) legal co-values. Adding `cone` to the shape axis is adding one record ("cone is an area, allows expanding, rejects splash"), not editing the validator. check.js runs a GENERIC constraint checker that never changes as moves are added.

Example shape of one attribute record (illustrative, not final):

```
shape: {
  cone:   { prim: 'hitCone',   needs: ['radius','arc'], area: true,  allow: ['expanding'], reject: ['splash'] },
  point:  { prim: 'hitPoint',  needs: ['size'],         area: false, allow: ['count','spread','pierce','chainHops','tracking'] },
  circle: { prim: 'hitCircle', needs: ['radius'],       area: true,  allow: ['expanding'], reject: ['splash'] },
  ...
}
```

Invariants become data each value owns, instead of a growing if-ladder: expanding needs circle/arc/cone; returns needs point/line; falls needs point/scatter/circle; untilTriggered needs anchor:world + motion:static; orbits/repositions need anchor:caster; tracking rejected on static; area shapes reject splash. Every one of those is a `needs`/`allow`/`reject` entry on the value that owns it.

## The named-special escape hatch (coverage gets a finite boundary)

Some moves are not geometry+payload, they are bespoke semantics the axes should not try to express:

- Horn Drill, Fissure, Sheer Cold, Guillotine: OHKO.
- Bide: delayed reflected damage.
- Counter / Mirror Coat: reflect the last hit.
- Metronome, Assist, Sleep Talk: call another move.
- Transform, Mimic: copy.
- Beat Up, Reversal, Final Gambit: power is a formula, not a number (the review already flags these 5 as varPower).

Rather than contort the axes or footnote them, declare a payload value `t: special, handler: 'hornDrill'`. They live INSIDE the schema as named handlers. Coverage then has a precise, finite, visible boundary: every move is `(shape x motion x anchor x payload)` OR a named special, and the special list is a short enumerated set, not an open-ended "and some edge cases."

## The resolver is a pure fold

Load order, later wins: raw facts -> interpretation formulas (your equations: pp->cooldown, accuracy->multiplier, power->dmg, proc->roll model) -> classification (the axis values) -> overrides (hand-tuned numbers). The resolver is a pure function (same inputs -> same G.MOVES), so it runs at load from file:// like the tilesets, and check.js runs THE SAME resolver to validate (no second implementation to drift). One-way generation is then structural: the generator writes only the raw facts file; the resolver only reads; nothing but you writes classification and overrides.

The interpretation layer is named here deliberately even though the equations live elsewhere already. Siting them as a layer (not an unlabeled load step) is what guarantees both regeneration and the resolver route through the same translation, instead of per-move hand-conversion.

## Coverage test, done right (run BEFORE the importer)

Not "can the axes express the 19 built kinds" (circular: the axes were derived from those). The real test, in order:

1. Run every approved move through the classifier, bucket each into its realized `(shape, motion, anchor, payload-set)` tuple.
2. Every tuple must map to a built primitive OR a named special. Count distinct tuples: that is the actual surface area, and the data above says it is SMALL (two payload sets cover 85%).
3. The moves that land in neither bucket are the missing axes. Specifically run the unbuilt gym-roster depth (Fighting, Dragon, Ice), because those are the moves that did not inform the axis design.

If the schema survives step 3 against moves it was not shaped around, "optimally covering" is earned, not asserted.

## Classification findings from real moves (Jess review 2026-10-23)

First live test of the schema: hand-classifying real moves from their PokeAPI facts and seeing whether the attributes fall out. Verdict so far: the classifier is mostly working. Facts (type, power, pp, acc, ailment, flags, target) auto-classify DELIVERY and PAYLOAD at high confidence. The one axis the facts can never settle is SHAPE, which is the human-feel call. That split IS the answer to the plan's low-confidence open question: auto-accept lane = facts + delivery + payload; human-review lane = shape (and the nova/burst fork).

Settled while classifying:

- SMITE IDIOM. `anchor: target` + `motion: static` + `lifetime: instant` = a hit that appears ON the target, nothing travels (Thunderbolt, Jess's read). Distinct from anchor:caster + travels (a dodgeable skill-shot bolt) and anchor:target + falls (a delayed meteor). All three are already expressible, no new attribute. IMPORTANT: `anchor` encodes a TARGETING MODEL, not just visuals, caster = skill-shot aimed in a direction (positioning matters, can spatially miss, can line up pierce); target = homing/auto-assigned (the game picks who it hits, cannot spatially miss). Choosing anchor is a feel decision about agency, not art.
- CHARGE DISSOLVES into two existing parameters, it is not its own payload (Jess): `delay: t` (the effect lands t seconds after the cast, the SAME field as a meteor drop-delay or a mine arm-time) + a `commitment` flag "pause other cooldowns during the charge". Generalizes to every charge move (Solar Beam, Sky Attack, Skull Bash, Razor Wind). This IS the telegraph parameter the unified executor uses: a boss and a player Solar Blade are one move, the boss just shows a warning shape during `delay`.
  - commitment is TWO independent axes, not one enum: MOVEMENT commitment (none / slowed / rooted, can you walk while charging) and COOLDOWN commitment (do your other moves tick during the charge, or freeze). A move can root you but let other moves cool, or let you walk but freeze your kit.
  - INTERRUPTION: a charge interrupted mid-`delay` reuses the existing flinch-cancels-cast-in-progress rule (DECISIONS slice D2). No new behavior. Confirmed by Jess 2026-10-23.
- PULSE / SOUND FLAG -> NOVA about 90% of the time (Jess). The classifier drafts a move carrying the pulse or sound flag as nova (shape circle, motion static, expanding true); Jess's feel overrides the ~10% where a single-target blast reads better as a projectile. So the flag is a STRONG DEFAULT applied automatically but kept in the review lane, not a hard rule. Worked example: Dragon Pulse (single-target 85, no spread) classified as NOVA by this rule, Jess accepted.

Classified and accepted this session: Thunderbolt (smite: point, anchor target, static, instant, payload damage + 10% paralysis, chainHops 0 upgradeable, the electric-arc fantasy), Solar Blade (line, caster, static, timed, delay + commitment charge, payload damage), Dragon Pulse (nova per the pulse-flag rule, payload damage).

## What this differs from MOVES-REFACTOR-PLAN.md

- Three primary axes with sub-params, instead of eleven flat peers. Same power, but a hierarchy that resists flag-soup drift and tells you where new attributes go.
- Validator-as-data from day one: constraints live on each attribute value (needs/allow/reject + primitive id + defaults), so check.js is a generic checker and extension is pure data.
- A declared `special` payload handler so OHKO/Bide/Counter/Metronome are named members of the schema, giving coverage a finite boundary.
- Interpretation formulas promoted to a named layer, so the event->emitter translation has one home.

Everything else (four files, one-way generation, one caster-agnostic executor, interning words to ints) is identical, because it falls directly out of the two facts.

## Open, same as the refactor plan

- UNLIMITED hitCap as 0 or a named constant (lean: named constant, 0 is a misread waiting to happen).
- SETTLED 2026-10-23: commitment is two caster-side fields (movement none/slowed/rooted + cooldown tick/freeze), not a shape property. See the classification-findings section.
- SETTLED 2026-10-23: nova vs burst split = pulse/sound flag -> nova ~90% (auto-draft, review-lane, Jess's feel overrides). Heat Wave still a judgment call.
- Does splash carry riders or damage-only (lean: damage-only at reduced strength).
