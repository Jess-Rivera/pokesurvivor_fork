# Combat architecture for the move schema (Checkpoint 2)

Date: 2026-10-26. Branch: feature-test/new-move-schema. Status: APPROVED by Jess 2026-10-26 (PROPOSED items accepted as written; open items are tracked in move-consistency-review.md section 9). Nothing here is built.
Inputs: docs/current feature planning/move-consistency-review.md (Checkpoint 1, with Jess's resolutions in its section 9), docs/MOVE-AXIS-SCHEMA.md, js/data/move-attributes.js, js/data/move-resolver.js, legacy js/systems/combat.js, js/entities/projectile.js, js/systems/stages.js, js/systems/status.js, js/core/stats.js, js/core/simbus.js, docs/SIM-PRESENT-BOUNDARY.md.
The existing slice files (docs/current feature planning/move-schema/slice-3.md to slice-7.md) are NOT changed by this document. Section G proposes the replacement plan; the slice files get rewritten only after approval.

Labels used below: EXISTING = in the code today (file named). PROPOSED = my design, needs approval. DECIDED = Jess's Checkpoint 1 answer. OPEN = needs a decision, with a recommendation.

---

## A. Design goals and invariants

### Goals
1. Execute every resolved move (G.MoveDefs) by composing its axes: geometry, delivery (anchor, targeting, motion, grow, lifetime), hit policy and payload. Adding a move with a new combination of existing axis values must need data only, no code.
2. Keep the simulation headless: everything that decides who is hit, for how much and when runs in Node with no canvas, camera, audio or FX. Presentation reads state and listens to events.
3. Reuse the parts of the current game that are right and already tested: the damage model (G.Stats), stat stages (G.Stages), ailments (G.Status), enemy hurt/knockback (Enemy.hurt), spatial queries (G.EnemyMgr.queryCircle), terrain blocking (G.World.projectileBlock, propsInCircle), segDist2, and the SimBus event channel.
4. Be buildable in small slices that each leave the game runnable, with the legacy path untouched until the flip (slice 7).

### Invariants (the coding model must not change these)
- I1. No `kind`. New combat files never read `kind`, never derive it, and never switch on a combination of axis values. tools/check.js gets a grep guard for this.
- I2. G.MoveDefs is read-only at runtime (deep-frozen after resolve). Upgrades produce a separate effective definition per slot; they never mutate the shared definition.
- I3. One dispatch table per axis, nothing else. Motion is stepped by a table keyed by `delivery.motion`; containment by a table keyed by shape family (radial point, radial arc, linear); eligibility by a table keyed by `hitPolicy`; payload by a table keyed by effect `t`; specials by handler name. Every cross-axis rule is listed in section F and lives in exactly one named function.
- I4. Hit eligibility is decided before any payload runs, once per (instance, enemy, step). Payload effects never decide eligibility.
- I5. Instance lifetime and effect lifetime are independent (schema rule): ending an instance never removes an ailment, stage, shield, heal-over-time or weather it applied.
- I6. Collision geometry is authoritative and lives in the sim. The renderer draws from the same instance fields and never computes hits.
- I7. Every sim step takes `dt` and the current time as arguments, and every random roll goes through one injectable random function. No requestAnimationFrame, performance.now(), Math.random() or camera calls inside the sim modules.
- I8. Sim emits plain-data SimBus events ('move:...' types) for facts presentation needs. It does not call G.FX, G.Audio or the Animator directly. EXCEPTION (EXISTING offender, documented in SIM-PRESENT-BOUNDARY.md): Enemy.hurt() still draws its own number and spark; the new path calls it as-is and does not refactor it.
- I9. Units: pixels, seconds, radians, px/s, rad/s. Angles from atan2 on the ground plane. Chances in the data are percent (1 to 100) and are divided by 100 at exactly one place.
- I10. Saves are untouched. Move ids do not change.

### How this avoids moving the kind switch somewhere else
The legacy design maps one label to one hand-written function (melee(), beam(), boomerang()...), so every behavior is a closed combination. Here the unit of code is one axis value: "how a `returns` instance moves", "is an enemy inside a linear band", "may this instance hit this enemy again under `interval`", "apply a `stat` effect". A boomerang is not a function; it is `travels`-like motion with a turnaround (motion table, one entry), a point shape (containment table), a leg-aware eligibility rule (section F, R2) and whatever payload it carries. The test of success: the 63 moves exercise 6 motions, 3 shape families, 3 hit policies and 10 effect types through about 25 small functions, and no function body names a move id or a former kind.

The risk is that cross-axis rules accumulate as scattered `if`s. Section F lists every one that is allowed (R1 to R9). A new cross-axis rule is a design change: it is added to that list first.

---

## B. End-to-end data flow

### Stages (load time, then per frame)

Load time (EXISTING, slice 1 and 2, plus PROPOSED additions marked):
1. described.json -> tools/export_moves.js -> js/data/moves-generated.js (G.MoveData).
2. js/data/move-resolver.js folds: grammar defaults -> derived values (cd; PROPOSED: basePower from accuracy; PROPOSED: `persistent` read, not inferred) -> overrides -> handler attachment -> G.MoveDefs. PROPOSED: deep-freeze the result (I2).

Run time, once per equipped move (PROPOSED):
3. MoveSlot creation: when the player gains a move, its slot gets `eff` = the effective definition. Until slice 5 `eff` is G.MoveDefs[id] itself; from slice 5 it is a fresh fold of def plus the slot's upgrade stacks (same order-independent rule as legacy G.Moves.derive).

Per frame, in this order (PROPOSED; the game loop already clamps dt to 1/30 and scales it by speedK, EXISTING game.js line 746):
4. Cooldowns and casting: every slotted move's timer ticks (EXISTING swap rule: inactive slots recharge too). For the active group: persistent moves make sure their instance exists; cooldown moves cast when ready and the cast gate passes. Cast creates a CastContext and spawns root instances (one per `space.count`, fanned by `spread`).
5. Delay: instances with a pending `delivery.delay` (PROPOSED field, DECIDED Q17) only count down; they have no hitbox yet.
6. Motion: each active instance stores its previous position, then the motion table moves it (and moves the caster for `repositions`). Path perturbations (curve, oscillate) and steering (turnRate, aimTrack) apply here.
7. Growth: grown dimension updated from its start value (DECIDED Q1).
8. Emitters (time-driven triggers: cast, interval, casterMove): due emissions queue child spawns.
9. Collision and eligibility: candidate enemies from queryCircle around the instance's swept bounds; containment test by shape family; eligibility by hit policy and leg; pierce budget; chain hops.
10. Payload: for each eligible (instance, enemy) pair, effects run in data order. Damage goes through G.Stats and Enemy.hurt; riders through G.Status and G.Stages. Event-driven emit triggers (enemyHit) queue child spawns. A 'move:hit' event is emitted.
11. Termination: endOn checks (time, wall, offScreen, returned, ownerDeath, notActive), pierce exhaustion (subject to R1), trigger detonation. `termination` emitters queue children. Ended instances emit 'move:end' and are removed.
12. Deferred spawns: children queued in steps 8, 10 and 11 are inserted now. They take their first step next frame (R6).
13. Presentation (separate pass in the draw phase): the renderer reads the instance list read-only and draws shapes; SimBus subscribers turn 'move:cast', 'move:hit', 'move:end' into FX and sound.

### Where it plugs into the existing loop
game.js today calls G.Combat.tick, G.Projectiles.update, G.Combat.resolve, G.Combat.updateFields (lines 855 to 858) and draws fields and projectiles at lines 900 to 931. PROPOSED: under a dev flag (section G, slice 3d), the active player's moves route to G.MoveSim instead of G.Combat's kind switch; G.MoveSim.step runs right after G.Combat.tick; G.MoveRender draws in the same two layers (ground, air). G.Combat.resolve keeps handling ENEMY projectiles, wall cover for enemy shots and enemy contact damage, which are outside the move schema (see C, "retained mechanics").

### Simulation / presentation boundary

| | Authoritative (sim owns, mutates) | Derived (recomputed, never stored as truth) | Presentation reads |
|---|---|---|---|
| Definitions | G.MoveDefs, slot `eff` | none | name, type (color), geometry for icons |
| Slot | timer `t`, persistent instance handle | ready flag | cooldown ring in HUD |
| Instance | position, prev position, heading, age, leg, delay left, pierce left, hit records, emitter state, current grown dimension | containment shape for this step | shape family, dims, position, heading, age / life fraction, phase (telegraph, active, returning), type, move id |
| Enemy / player | HP, statuses, stages, position (EXISTING owners) | damage numbers | unchanged |
| Events | none (fire and forget) | none | 'move:cast', 'move:hit', 'move:end', 'move:emit' |

Timing and determinism: sim functions take (dt, now, rng). Harnesses step with a fixed dt and a seeded rng and assert on instance state and on SimBus.record() tapes. The live game passes its variable clamped dt; correctness at large dt comes from swept tests (equations section D), not from substeps. OPEN (low): substep instances whose per-step travel exceeds their radius plus the smallest enemy radius; recommend no substeps until a test shows a miss.

---

## C. Runtime structures and contracts

### C1. MoveDef (resolved, static)
- Purpose: the move as data. Owned by move-resolver.js. Created once at load. Never mutated (I2). No presentation-only fields except `name`, `flavor_text`.
- Contents: all schema fields with defaults applied, plus derived `cd` (cooldown moves), PROPOSED derived `basePower`, PROPOSED explicit `persistent`, `handlers`.
- Lifetime: whole session.

### C2. MoveSlot (per equipped move, per Pokemon)
- Purpose: the player's copy of a move: cooldown, upgrades, persistent handle.
- Owned data: id, `def` (pointer to C1), `mods` (upgrade stacks, EXISTING shape), `t` (cooldown timer, EXISTING), `persist` (handle of the live persistent instance or null).
- Derived data: `eff` (effective definition = def plus mods, rebuilt only when mods change).
- Creator: player move-learn path (EXISTING G.Moves.instance today; slice 3d attaches the new fields to the same slot objects so the HUD, swaps and saves keep working).
- Mutations: combat sim changes `t` and `persist`; the upgrade path changes `mods` and rebuilds `eff`. Nothing else.
- Presentation-only: none.

### C3. CastContext (one per cast)
- Purpose: the facts frozen at the moment of casting, shared by every instance of that cast and its descendants.
- Owned data: owner (the player entity), slot id, move id, cast time, origin x/y, aim angle, target enemy id (or null), target point (for `location`), cast serial number.
- Creator: castSlot. Mutations: none after creation. Lifetime: until its last instance ends.
- Note: the attacker half of damage is NOT frozen here; it is computed at hit time from the owner (D7). One rule for all instances, so a stage change mid-flight or a Leaf Storm self-drop affects later hits.

### C4. Instance (one live hitbox, emitter or placed object)
- Purpose: one shape in the world with its own motion and lifetime. Root instances come from a cast; child instances from an `emit`.
- Owned data: serial id, `spec` (pointer to the node of `eff` it executes: the move itself or an inline child), cast (C3), parent id, x, y, prevX, prevY, heading, velocity, age, delay left, leg (0 out, 1 back), grown dimension value, pierce left, chain state, hit records (C5), emitter states (C6), `done` flag with reason, `armed` (for trigger-contact mines), fan index (its slot in the count/spread fan).
- Derived data: the containment shape for the current step (from spec dims, grown value, lens multiplier, position and heading).
- Creator: spawnInstance (only). Mutations: only G.MoveSim step functions. Lifetime: spawn to first endOn (or pierce exhaustion under R1), then removed in the same frame.
- Presentation-only: none stored; the renderer derives visuals.

### C5. Hit record (per instance, keyed by enemy id)
- Purpose: hit eligibility memory.
- Owned data: leg of last hit, time of last hit, `inside` flag (for onReentry).
- Creator and mutator: the eligibility step. Lifetime: the instance's. Orbit-style instances prune records older than `rehit` (EXISTING legacy rule for orbs, kept).

### C6. Emitter state (per `emit` effect on an instance)
- Owned data: next emission time, emissions done, distance or moving-time accumulator (casterMove).
- Lifetime: the carrying instance's (an emitter is its instance, DECIDED Q7).

### C7. Events (SimBus, plain data, I8)
- 'move:cast' { moveId, ownerId, x, y, aim }.
- 'move:hit' { moveId, instId, enemyId, dmg, crit, typeMult, x, y, hop } (hop = chain index, 0 for a direct hit).
- 'move:emit' { moveId, parentId, x, y, count }.
- 'move:end' { moveId, instId, reason, x, y }.
- No entity references, no display text (SimBus rule).

### C8. Retained legacy mechanics (evaluated)
| mechanic | verdict | why |
|---|---|---|
| segDist2 (combat.js) | KEEP, move to the geometry module as a shared pure function; legacy keeps using it | exact swept point-vs-circle test, already proven against tunneling |
| inArc (combat.js) | KEEP the angle wrap, extend with an angular tolerance for enemy radius | correct wrap math; legacy ignores enemy size at the arc edge |
| updateFields lifetime loop | REPLACE by instance endOn handling | it is a kind switch (mine, meteor, turret, patch); its pieces become delay (meteor), trigger contact (mine), interval emit (turret), interval hit policy (patch) |
| drawGroundFields / drawAirFields | KEEP AS VISUAL REFERENCE ONLY | the recipes (patch ellipse, mine blink, meteor shadow that grows during the fall, turret bob) are good; the new renderer chooses them by instance phase and geometry, not kind |
| Enemy projectiles and wall cover (combat.js resolve, first block) | KEEP UNCHANGED in G.Combat.resolve | enemy shots are not player moves; no reason to touch them before slice 7 |
| projectile.js homing via G.U.damp | DO NOT REUSE for turnRate | DECIDED Q13: turnRate is rad/s (clamped turn), legacy homing is an exponential damp |
| projectile.js boomerang (resets `hits` at turnaround) | REUSE THE RULE | it is exactly the leg reset proposed for Q2 |
| procAilments / procFlinch roll gap (0.5 s) | DROP for the new path | DECIDED Q14: every eligible hit rolls; the rehit time is the throttle |
| G.Stages.add / teamAdd / mul / ladder | KEEP, add a per-move live-application cap | DECIDED Q4 maxStacks semantics fit its `src`-tagged application lists |
| G.Stats.attackFactor / applyDamage | KEEP, call with a two-field adapter (category, power) | it reads `move.dmg`, `move.cat`, `move.norm`; the new path passes { cat, dmg } and no norm |
| drainHeal, Big Root, onDealt, dmgDealt, itemDmgMul, typeKFor (Power Stone), isCrit | KEEP | existing item and stat layers must keep working |
| Prop damage (rocks, chests, grass) | KEEP behavior | every legacy kind damages props in its area; the new path does the same via propsInCircle |
| Wide / Zoom Lens radius multiplier | KEEP, mapped to radRadius and radArc | EXISTING F3b item |
| Cast gate (wait for a target, retry 0.05 s) | KEEP for `nearest` and `location` | EXISTING feel rule |
| Stun and fizzle gates | KEEP | EXISTING: stunned casts nothing; fizzle spends the cooldown; stunned owner drops persistent instances (E2d) |

---

## D. Equations and rules

Notation: L = owner level, P = power value used by damage, t = instance age in seconds.

| # | rule | inputs -> output | stage | units | source |
|---|---|---|---|---|---|
| D1 | basePower = power x (accuracy or 100) / 100; null power -> 0 | power, accuracy -> basePower | resolver, derived values | power points | DECIDED Q6, PROPOSED placement. Matches legacy, whose `norm` already carried acc/100 |
| D2 | cd = ANCHOR_CD x (ANCHOR_PP / PP)^BETA, 3 decimals, when basePower > 0 and not persistent; otherwise from overrides; none if persistent | pp -> cd | resolver | s | EXISTING formula; PROPOSED: `persistent` flag replaces the endOn heuristic (C13 in the review) |
| D3 | cast interval = max(0.05, eff.cd x owner.cdMul) | cd, cdMul -> timer | cast | s | EXISTING combat.js tickMove (player.js uses a 0.12 floor for another purpose; keep combat's 0.05) |
| D4 | eff[k] = (def[k] + sum add) x (1 + sum inc) / (1 + sum rate) | def, stacks -> effective field | slot (slice 5) | field units | EXISTING G.Moves.derive; slice 5 maps card keys to schema paths |
| D5 | P = eff.basePower (or eff.power if slice 5 keeps the multiplier on power; same thing since D1 is linear) | | hit | | PROPOSED |
| D6 | Attacker half A = ((2L/5 + 2) x P x Astat) / 50 x extraMul. Astat = statValue(SpA or Atk at L). extraMul = atkMulAll x (1 + stat-card inc) x Atk/SpA stage multiplier x run-item multiplier | owner, category, P -> A | hit time (C3 note) | | EXISTING stats.js attackFactor, player.js moveFactor |
| D7 | Defender half D = (A / max(1, Dstat) + 2) x STAB x DMG_SCALAR. Dstat = statValue(Def or SpD at enemy level) x defender Def/SpD stage multiplier; status category uses PROP_DEF 50 and no STAB. DMG_SCALAR is 1.0 in code (DECISIONS text says 2.0, code wins; flag for BALANCE.md). Legacy `norm` factor is 1 (dropped) | A, enemy -> D | hit | | EXISTING stats.js applyDamage |
| D8 | STAB = 1.5 when move type is one of the owner species' types | | hit | | EXISTING |
| D9 | typeK = typeChart(moveType, enemyTypes) x weatherMult(moveType); Power Stone floors it at 1 for the held type | | hit | | EXISTING combat.js typeKFor |
| D10 | crit if rng < owner.critChance + team crit stages + (crit effect critChance / 100); crit multiplies by 1.5 | | hit | probability | EXISTING plus DECIDED Q12 (percent points) |
| D11 | dmg = max(1, D x typeK x itemDmgMul x critMul x handlerMul) | | hit | HP | EXISTING floor default 1 (legacy floor removed with normalization); handlerMul from D13 |
| D12 | fixedDamage: dmg = amount (ignoresType skips typeK, ignoresDefense skips D7 entirely); no STAB, no crit | | hit | HP | PROPOSED reading of the data flags |
| D13 | statusBonus: when the hop's target has a major ailment (status.js stMajor: paralysis, freeze, sleep; or stDot: burn, poison, toxic; confusion and trap do not count), the move's POWER is multiplied by `multiplier` before the attacker half (D6), checked per target on every chain hop. It is a power term, not a final-damage multiplier | hit | | DECIDED Q9 and Jess 2026-10-27 (S8): doubles power, not final damage |
| D14 | levelDamage: dmg = owner level, no STAB, no type, no crit | | hit | HP | PROPOSED reading of "damage equal to level" |
| D15 | Chain (sequential, Jess 2026-10-27): the first hit lands on the target at hop 0. Hop k (1..chainHops) picks the nearest live enemy (not a prop, not remote) to the enemy hit at hop k-1 within hopRange of it (centre distance), never that previous enemy; enemies this chain has not hit yet come first, and only when none is in range may it revisit an earlier one (S15, Jess 2026-10-27), so A to B to C to A is legal and two enemies ping-pong; it stops early if none (ties: lowest id). The chain starts once per instance, from the cast target when it was struck, else the first enemy struck. Hop damage = the full normal damage for that target (D6 to D11, including statusBonus), multiplied LAST by (1 - reduction)^k (reduction 0.33: 100, 67, 44.89, 30.07, 20.15). Crit, type, riders and thaw roll per hop. Rider chance at hop k = chance x 0.5^k. All hops resolve in the same step; each hop is its own hit and is exempt from oncePerInstance | hit | px, % | DECIDED Q10 (rider halving) and Jess 2026-10-27 (sequential targeting, compounding reduction, per-hop rolls). Data field chainDamageFraction is renamed hopReduction (slice 4b, built) |
| D16 | Pierce: an instance with pierce n may damage n+1 enemies; after that it is exhausted. UNLIMITED never exhausts. Exhaustion ends the instance except under R1 | | collision | count | EXISTING schema rule |
| D17 | Containment, radial point: swept test segDist2(prev, cur, enemy) <= (r + e.r)^2 | | collision | px | EXISTING legacy projectile test |
| D18 | Containment, radial arc (radArc < 2 pi): dist(center, enemy) <= R + e.r AND angular offset from heading <= radArc/2 + asin(min(1, e.r / dist)) | | collision | px, rad | EXISTING inArc wrap, PROPOSED enemy-size tolerance; apex rule added 2026-10-26 (distance at or below e.r counts as inside at any angle) |
| D19 | Containment, full circle (radArc >= 2 pi): dist <= R + e.r | | collision | px | PROPOSED (same as D18 without the angle) |
| D20 | Containment, linear: project enemy onto the band axis from the anchor along heading; 0 - e.r <= along <= linLength + e.r and perpendicular distance <= linWidth/2 + e.r | | collision | px | PROPOSED (legacy beam used segDist2 with a width, equivalent) |
| D21 | Grow: g(t) = min(start + growSpeed x t, max or infinity) for per time; per distance uses distance travelled instead of t. start = the authored dimension | | step | px or rad | DECIDED Q1 |
| D22 | A growing shape tested with D18 to D20 at its current size each step is equivalent to edge crossing under oncePerInstance (an enemy inside at spawn is hit at once, which is right for an authored start size) | | collision | | PROPOSED |
| D23 | Travel: position += velocity x dt. Heading turns by curve x dt each step. Steering toward the current target turns the heading by at most turnRate x dt (DECIDED Q13 rad/s, clamped turn, not damping) | | motion | px, rad | PROPOSED. DECIDED slice 3c: move first, then turn. The steering target is the cast target while it lives, then ONE re-pick of the nearest live enemy within range of the instance; after that it flies straight |
| D24 | Oscillate: lateral offset = amplitude x sin(2 pi x frequency x t) applied perpendicular to the base heading around a base path point (exact amplitude, independent of dt) | | motion | px, Hz | PROPOSED (schema calls it a velocity perturbation; a positional offset gives the authored amplitude exactly) |
| D25 | Orbit: angle phi_i = phase + angularSpeed x t + 2 pi i / count; position = anchor + orbitRadius x (cos, sin). Collision on a true circle | | motion | rad/s, px | EXISTING math; OPEN: legacy squashes y by 0.7 in the SIM, which changes who gets hit. Recommend squash in rendering only |
| D26 | Returns: out leg while distance from origin < range; then velocity points at the owner's current position at moveSpeed; `returned` when within owner.r + own radius | | motion | px | PROPOSED; needs the new `range` field (OPEN Q8, see F R2) |
| D27 | Reposition swept: caster speed = dashMult x owner final move speed (player.spd), travel to target point, then back to the cast origin if returnToOrigin. Teleport: instant. Distance capped by `range` | | motion | px/s | EXISTING schema rule plus PROPOSED cap |
| D28 | Lifetime: an instance ends at the first true endOn. `time` counts from activation (after delay). `{time: 0}` resolves after exactly one collision step | | termination | s | PROPOSED timing convention |
| D29 | Emission schedule: trigger cast -> first emission at activation, then every `every` s; trigger interval -> first at `every`; casterMove -> one emission per `every` s of owner moving time; termination -> once when the carrier ends; enemyHit -> once per hit event. `count` caps total emissions (absent = unlimited while the carrier lives); the child's own space.count is shapes per emission | | emit | s | DECIDED Q7 (emitter is its instance), PROPOSED schedule |
| D30 | Stat application: each application lasts `duration` or 6 s (DECIDED); live applications from THIS move on this host for this stat are capped at `maxStacks` or 6 (DECIDED); a capped application refreshes that move's oldest live one. Stage = clamp(sum of all live applications, -6, 6). Multiplier (B + s)/B for s >= 0, B/(B - s) for s < 0; B = 2 (atk, def, spa, spd), 4 (spe) | | payload | stages, s | EXISTING stages.js plus DECIDED Q4 |
| D31 | Stat key map, schema -> stages.js: atk->atk, def->def, spAtk->spa, spDef->spd, spd->spe. Applied in exactly one function | | payload | | PROPOSED (fixes review C8) |
| D32 | Ailment: each eligible hit rolls chance/100 (DECIDED Q14), duration from status.js unless the effect states one. Trap on an enemy = root: enemy movement multiplier 0 while trapped (DECIDED Q5; needs a status.js change) | | payload | | |
| D33 | Knockback: Enemy.hurt(knock, direction). Direction: from the instance center to the enemy, or the instance's velocity when `direction: travel` | | payload | px | EXISTING hurt signature |
| D34 | Heal from dealt: heal = HP actually removed (shield counted, overkill excluded) x fraction x Big Root 1.3; heal of maxHP: fraction x maxHp every `per` s for `duration` | | payload | HP | EXISTING drainHeal; PROPOSED HoT ticking |
| D35 | Recoil on cast: paid = fraction x maxHp; formula refs `cast.paid`, `effect.max` evaluate after recoil | | cast | HP | EXISTING schema Substitute example |
| D36 | Lens: radRadius x moveRadiusMul; radArc x moveRadiusMul clamped to 2 pi; linLength x moveRadiusMul (never linWidth) | | step (inside G.MoveGeom.shapeOf, after growth and its cap; spawnInstance never pre-scales) | | EXISTING F3b; slices 3b and 3c (beam length, Jess 2026-10-26). Orbit radius: slice 4c |
| D37 | Balance proxy (tools only, never gameplay): Power/s per target = (sum of basePower over the hits one target can take per cast) / cd, or per second for persistent moves | | report | | Checkpoint 1; not a normalization |

Normalization: none. D37 exists only so the damage simulator (STATE.md next steps) has a first ranking to test. Evidence that would justify normalization: simulated time-to-kill against a fixed enemy at fixed levels where the best and worst moves of the same balanceClass and PP differ by more than a factor Jess sets, after upgrades are applied. That is a Checkpoint 3 and simulator question.

---

## E. Function and subsystem responsibilities

Proposed files (all new; none loaded by the game until slice 3d):
- js/systems/move-geom.js (G.MoveGeom): pure math, no state.
- js/systems/move-sim.js (G.MoveSim): slots, casts, instances, motion, eligibility, emitters, termination.
- js/systems/move-effects.js (G.MoveEffects): payload appliers and special handlers, bridging to G.Stats, G.Status, G.Stages, Enemy.hurt.
- js/systems/move-render.js (G.MoveRender): drawing only.

### move-geom.js
| function | responsibility | in -> out | mutates | invariants | deps |
|---|---|---|---|---|---|
| segDist2 | squared distance point to segment | 6 numbers -> number | nothing | same results as legacy | none |
| shapeOf | build the step's containment shape | instance dims, position, heading, lens -> plain shape object | nothing | radArc clamped to 2 pi | none |
| contains | is an enemy circle inside / swept through the shape | shape, prev pos, enemy x,y,r -> bool | nothing | table by shape family only | segDist2 |
| boundsOf | query circle covering the swept shape | shape, prev pos -> {x,y,r} | nothing | must over-cover, never under | none |

### move-sim.js
| function | responsibility | in -> out | mutates | invariants | deps |
|---|---|---|---|---|---|
| tick(dt, owner, now) | entry point: cooldowns, persistent upkeep, casts, then step | | slots, instances | runs once per frame after G.Combat.tick | below |
| upkeepPersistent(owner) | spawn the persistent instance of an active persistent slot, end those whose slot left the active group (notActive) or whose owner is stunned | | instances, slot.persist | one live persistent instance per slot | spawnInstance |
| castSlot(owner, slot, now) | cast gate, fizzle, cooldown spend, CastContext, recoil, root instance fan | -> CastContext or null | slot.t, owner HP (recoil) | never casts while stunned; cd spent on fizzle | spawnInstance, G.Status |
| selectTarget(cast, spec) | pick target enemy or point per `targeting`, within `range` | -> enemy or point or null | nothing | uses rng only for ties | G.EnemyMgr |
| spawnInstance(spec, cast, parent, at) | create C4, apply lens, set start dims, delay, pierce, heading | -> instance | instance list (deferred if mid-step) | the only creator of instances | G.MoveGeom |
| step(dt, now) | run steps 5 to 12 of section B for all instances | | instances | spawned children take their first step next frame (R6) | all below |
| move(inst, dt) | motion table: static, travels, returns, orbits, repositions, falls | | inst position, heading, leg; owner position (repositions) | one table entry per motion value | G.MoveGeom |
| grow(inst, dt) | D21 | | inst grown value | start = authored | none |
| collide(inst, now) | candidates, containment, eligibility, pierce, chain, then payload | | hit records, pierce left | I4: eligibility before payload | G.MoveGeom, eligible, G.MoveEffects |
| eligible(inst, enemy, now) | hit policy table plus leg rule (R2) | -> bool | hit record | the only place hit timing is decided | none |
| runEmitters(inst, dt, trigger, at) | D29 | | emitter state, deferred spawns | children inherit cast and parent id | spawnInstance |
| checkEnd(inst, now) | endOn conditions, pierce exhaustion (R1), trigger detonation | -> reason or null | inst.done | first condition wins | G.World.projectileBlock |
| clear(owner) | remove all instances (run end, death) | | instances | | |
| setRng(fn) | harness hook | | module rng | | |
| setView(rect) | the visible world rectangle {x, y, w, h} for endOn offScreen (260 px margin); set by the game each frame from 3d, fixed in harnesses, so the sim never calls the camera (I7) | | module view | | |

### move-effects.js
| function | responsibility | in -> out | mutates | invariants | deps |
|---|---|---|---|---|---|
| applyHit(inst, enemy, hop, now) | run the spec's payload list in order for one eligible hit | -> dealt HP | enemy, owner (via appliers) | chance = percent / 100 here only (I9); hop halves rider chances (D15) | appliers |
| damage | D6 to D14 | -> HP dealt | enemy HP via Enemy.hurt; owner.dmgDealt, onDealt | adapter { cat, dmg } into G.Stats | G.Stats, G.Types, G.Weather |
| ailment, flinch, knockback, crit, heal, stat, shield, recoil | one applier per effect `t` | | enemy or owner state through existing systems | side decides host; scope team uses owner.stgTeam, individual uses the active Pokemon | G.Status, G.Stages |
| special(name) | handler implementations by name: fixedDamage, levelDamage, statusBonus, chainDamageFalloff, setWeather, berrySteal (stub) | | as above | declarations stay in move-handler.js; an unknown name fails at load | G.Weather |
| statKey(schemaStat) | D31 | -> stages key | nothing | the only translation point | none |
| evalFormula(expr, ctx) | multiply / ref over cast.paid and effect fields | -> number | nothing | no eval, no Function | none |

### move-render.js
| function | responsibility | in -> out | mutates | invariants | deps |
|---|---|---|---|---|---|
| drawGround(ctx) | patches, placed objects, telegraphs (delay pending), ground rings | | canvas only | reads instances, never writes | G.MoveSim instance list, G.Camera, G.VFX |
| drawAir(ctx) | travelling shapes, orbits, falling objects | | canvas only | same | same |
| subscribe() | SimBus listeners for cast / hit / end FX and sound, registered once at boot | | FX, Audio | presentation only | G.SimBus |

Allocation of responsibility: resolver = what a move is; move-sim = where things are and who is touched; move-effects = what touching does; move-render = what you see. G.Combat keeps enemy shots and contact damage until slice 7.

---

## F. High-risk axis interactions and the allowed cross-axis rules

The rules R1 to R9 are the complete list of places where one axis is allowed to change the meaning of another.

| id | interaction | failure mode | boundary | rule (PROPOSED unless marked) | test that catches it |
|---|---|---|---|---|---|
| R1 | pierce x repositions | pierce 0 ends a dash on contact, so the caster never returns (review C2) | checkEnd | For `repositions`, pierce exhaustion disarms the hitbox but does not end the instance; `returned` or time ends it. DECIDED Q3: Quick Attack goes A to B, hits at B, returns to A | Quick Attack harness: caster ends at origin; exactly one enemy damaged once |
| R2 | returns / returnToOrigin x hit policy | oncePerInstance blocks the back leg (review C1) | eligible | Hit records are keyed by leg. `returnHits: outAndBack` starts leg 1 at the turnaround with fresh eligibility (EXISTING legacy boomerang behavior). See the Q2 options below | Razor Leaf harness: an enemy on the path takes exactly 2 hits per leaf, one per leg |
| R3 | grow x lifetime x max | growth outlives intent, or `max` ignored | grow | D21 from the authored start; grow needs an endOn (EXISTING grammar rule) | grow harness: radius at t equals D21; ring stops at max |
| R4 | splash x pierce | splash consuming pierce | collide | Splash never spends pierce (EXISTING schema). No move uses splash: NOT BUILT until one does | none until then |
| R5 | chain x hit policy x riders | a chain loops forever, or oncePerInstance blocks a legitimate revisit | collide | Hops never return to the previous hop's enemy, take unhit enemies first and then revisits (S15), and are bounded by chainHops; chain hits are exempt from oncePerInstance (the initial strike still obeys it); rider chance halves per hop and damage reduces by (1 - reduction)^k (D15) | Thunderbolt harness: a line of 6 enemies gives ratios 1, 0.67, 0.4489, 0.3007, 0.2015; two enemies ping-pong for all hops; one enemy does not hop; rider roll counts follow 0.5^k with a seeded rng |
| R6 | emit x same-frame recursion | a child spawned by enemyHit hits in the same step, or an emitter spawns children that emit in the same step forever | step | Children are deferred to the end of the step and act from the next frame. OPEN D-3: should enemyHit children ignore the triggering enemy (Meteor Mash shards)? Recommend yes: they inherit the parent's hit record for that enemy | Meteor Mash harness: the struck enemy takes 1 parent hit, 0 shard hits; 3 shards spawn (after the data fix) |
| R7 | persistent x cooldown x stun x swap | persistent moves recast every frame, or never despawn, or survive a stun | upkeepPersistent | `persistent: true` (DECIDED explicit flag) means: no cd, one live instance per slot while the slot is in the active group and the owner is not stunned. Cooldown moves never spawn persistent instances | swap harness: instance count 1 while active, 0 after swap, 1 after swapping back; 0 while stunned |
| R8 | anchor x motion | caster-anchored shapes left behind, or world-anchored children following the caster | move | Anchor sets the frame of reference only: `caster` shapes are positioned relative to the owner every step (static and orbits follow; travels starts at the owner and is then free); `target` follows the target until it dies, then freezes; `world` never moves unless its own motion says so | anchor harness: static arc tracks a moving caster; world ring stays put |
| R9 | targeting x range x cast gate | moves cast at nothing, or dash and teleport across the screen | castSlot, selectTarget | `nearest` and `location` wait for a candidate within `range` (EXISTING gate behavior); repositions never travel farther than `range`. DECIDED slice 3c (S1, S2): a caster-anchored STATIC shape waits until the target is within min(range, reach + target radius), reach = the shape's outer radius or length at full growth with the lens (shapeOf); `direction` waits for any live enemy within range (TUNING.RANGE when the move has none); `none` and `self` never wait. Nearest ties go to the lower enemy id (no rng) | move-sim harness: Tackle gate at 57.9 / 100 px, lens 2; Hydro Pump at 265 px; Ember with nothing in range |

Other interactions found in the audit:
- Upgrades x resolved definitions: upgrades never touch G.MoveDefs (I2); a pierce card on an UNLIMITED or shapeless move is excluded at offer time (slice 5).
- Stat riders x maxStacks: Leaf Storm and Metal Claw stack per enemy hit; with D30 the per-move cap bounds them. Recommend data maxStacks 1 on Leaf Storm (holds at -2, matching the EXISTING legacy "renewed single application" rule for guaranteed self-drops) and a small cap on Metal Claw. OPEN D-2.
- Overlapping placed instances (trail patches): each patch is its own instance and hits independently (Flame Wheel). Correct by the rules; flagged for the simulator, not changed.
- Delay x lifetime: D28 starts endOn time after the delay; telegraph is a render phase.
- Enemy hurt invulnerability: Enemy.hurt has no i-frames for enemies today (verify in slice 3c); interval moves rely on that.

### Q2 suggestions: hit eligibility on return legs (DECIDED: back leg may hit again)
1. RECOMMENDED: leg-keyed eligibility. `returnHits: outAndBack` means each leg has its own oncePerInstance memory; turnaround (returns) or arrival back (repositions) starts the next leg. No new field; it is what the data already says, and it matches legacy.
2. onReentry for return moves. Rejected: an enemy that stays inside a slow leaf for both legs would be hit once.
3. interval with a rehit near the leg duration. Rejected: couples hit timing to speed and range; an upgrade to speed breaks it.

---

## G. Implementation slices (proposed replacement for slices 3 to 6)

Each slice is handed to the coding model alone, with this document and the slice file. Game-affecting slices follow the CLAUDE.md workflow (prose plan, Jess OKs, build, harness, write).

### Slice 3a: data and grammar corrections (no combat)
- Objective: make the data say what Checkpoint 1 decided.
- Prerequisites: approval of this document and the OPEN items marked BLOCKING below.
- Files: described.json, move-attributes.js, move-resolver.js, move-overrides.js, tools/validate_moves.js, tools/move_parity.js, regenerated moves-generated.js.
- Changes: grammar adds top-level `persistent` (bool), `delivery.range` (px), `delivery.delay` (s, replaces casterState.delay for instance telegraphs), stat defaults duration 6 and maxStacks 6, emit `count` documented as total emissions; resolver derives basePower (D1), reads `persistent` (no endOn heuristic), deep-freezes output; validator rule: persistent forbids cd and requires a notActive endOn, cooldown moves require cd after resolve. Data: set persistent on fire-spin, leaf-storm, bug-buzz, night-shade, toxic, flame-wheel; novas re-authored to a start size plus grow.max (values per OPEN D-1); Quick Attack returnHits out; Meteor Mash emit count 1 (child count 3 stays); Toxic Spikes emitter per DECIDED Q7 (interval every 0.25, child start 100 px); Karate Chop type fighting; Rock Slide delay moved to delivery; ranges added where needed (OPEN Q8); Bug Bite and Shadow Ball cds; stat chances confirmed (review C11). Parity self-test fixed (no real move hard-coded).
- Tests: check.js fully green; validator self-tests for each new rule; parity report regenerated and marked by Jess.
- Exclusions: no combat code, nothing loaded by the game.
- Proceed when: check.js green and Jess has marked the parity report.

### Slice 3b: geometry module
- Objective: G.MoveGeom with D17 to D22 and a Node harness.
- Files: js/systems/move-geom.js, docs/proposals/move-geom-harness.js.
- Tests: containment truth tables for point (including a fast mover that would tunnel without the sweep), arc edge with enemy radius, full circle, linear band ends and sides, growth at t, segDist2 parity with legacy on random cases.
- Exclusions: no instances, no game wiring.
- Proceed when: harness passes inside check.js.

### Slice 3c: sim core, headless
- Objective: G.MoveSim and the damage applier for the simplest closed set: anchors caster/target/world, motions static and travels (with curve, oscillate, turnRate), grow, endOn time/wall/offScreen/ownerDeath, pierce, hit policies oncePerInstance and interval, payload `damage` only, events, rng hook.
- Files: js/systems/move-sim.js, js/systems/move-effects.js (damage only), harness.
- Tests: Tackle hits every enemy in its arc once; Ember dies on first enemy; Water Gun passes one; Hydro Pump hits all in band; Heat Wave reaches each enemy once as it grows; Flamethrower hits a standing enemy 5 times in 1 s; damage numbers match D6 to D11 computed independently in the harness for a fixed owner and enemy; SimBus tape has one 'move:hit' per hit; I1 grep guard added to check.js.
- Exclusions: riders, emit, returns, orbits, repositions, falls, specials, rendering, game wiring.
- Proceed when: harness green, Jess reviews the numbers table.

### Slice 3d: playable behind a dev flag
- Objective: see the core moves in the real game.
- Files: dev.html (script tags), js/main.js NEED array, js/game.js (call site under the flag), js/systems/move-render.js (outline-quality shapes in type color plus the retained telegraph and patch recipes).
- Routing (OPEN D-4, touches the "no bridge" ruling): with `?newcombat`, a slot whose move id the new path supports runs through G.MoveSim; everything else stays legacy. This is routing by id, not a data bridge; no kind is derived. Recommend yes, removed in slice 7.
- Tests: legacy unchanged without the flag (check.js harnesses untouched); with the flag, the slice 3c moves playable on dev.html?dev&newcombat; framerate check at high density (performance stance: a visible collapse is fixed now).
- Exclusions: upgrades (new-path moves ignore cards until slice 5), riders.
- Proceed when: Jess plays the core set and signs off feel-level issues to the backlog.

### Slice 4a: riders on hit
- Objective: ailment (with trap as root on enemies in status.js), flinch, knockback, crit, heal from dealt, stat with D30 and D31, chance halving hook for chains.
- Files: move-effects.js, js/systems/status.js (trap root for non-player hosts), js/systems/stages.js (per-move cap on host applications), harness.
- Tests: seeded rng proc counts; stage cap example from DECIDED Q4 reproduced exactly (2 existing stages + a maxStacks 1 move reapplied every 3 s with 6 s duration never exceeds 3); speed vs Sp. Def mapping test; trapped enemy does not move.
- Exclusions: self-cast moves, specials.
- Proceed when: harness green and Fire Spin, String Shot, Ice Beam, Mud Shot play correctly with the flag.

### Slice 4b: self-casts and specials
- Objective: shapeless self casts (stat team/individual, heal over time, recoil plus shield with formulas, setWeather) and handlers fixedDamage, levelDamage, statusBonus, chainDamageFalloff plus chains (R5); berrySteal stays a stub.
- Files: move-effects.js, move-sim.js (chain), harness.
- Tests: Substitute numbers (4 s shield, 12 s cd starting at shield end); Hex doubles power only on a major ailment, on each hop; Thunderbolt sequential chain pattern; levelDamage and setWeather through synthetic harness moves (real Night Shade moves to 4c, real Hail is parked as a toggle item, 2026-10-27).
- Proceed when: harness green and the moves play behind the flag.

### Slice 4c: motion extras
- Objective: returns with leg-keyed eligibility (R2), orbits (persistent, R7), repositions swept and teleport with i-frames and range cap (R1, R9), delay and falls, aimTrack.
- Tests: R1, R2, R7, R9 harnesses from section F; Aerial Ace lands within range; Rock Slide hits only after its delay.
- Proceed when: harness green and the moves play behind the flag.

### Slice 4d: emitters
- Objective: emit with every trigger (D29), inline children inheriting power and type, deferred spawns (R6), casterMove trails, turrets, termination bursts.
- Tests: Gust 3 emissions at 0, 0.08, 0.16 s; Toxic Spikes emission count over 3 s; Meteor Mash R6; trail patch counts vs owner movement.
- Proceed when: all 63 run behind the flag.

### Slices 5, 6, 7
Keep the existing placeholders (upgrades from fields, behavior harness and stress run, flip and purge). Slice 6's scope moves into Checkpoint 3's validation plan.

Dependencies: 3a -> 3b -> 3c -> 3d -> 4a -> (4b, 4c in either order) -> 4d -> 5 -> 6 -> 7.

---

## Summary for approval

Recommended architecture: four small modules (pure geometry, sim, effects, render) driven by one table per axis, with a short, closed list of cross-axis rules (R1 to R9), reusing the existing damage, stage, status, hurt and SimBus systems, running behind a dev flag until the flip.

Core invariants: no kind anywhere (I1); resolved definitions frozen (I2); one table per axis (I3); eligibility before payload (I4); effect lifetimes independent of instances (I5); collision only in the sim (I6); injected dt, time and rng (I7); events not FX calls (I8); one place for percent conversion and stat-key mapping (I9, D31).

Open decisions:
- BLOCKING for slice 3a: D-1 start sizes for the re-authored novas (recommend a small start near the caster's body radius, `max` = today's radius, growSpeed unchanged); Q8 `range` values (recommend one field, defaults: nearest acquisition 520 px like legacy, returns turnaround about 210 px like legacy Razor Leaf, repositions 110 to 120 px like legacy dashes, location pick within 340 px like legacy meteors); Q16 Spikes lifetime (recommend a timeout so its concurrent count is bounded like every other placed object).
- Before slice 4a: D-2 maxStacks values for Leaf Storm and Metal Claw.
- Before slice 4d: D-3 whether enemyHit children ignore the triggering enemy; Gust's per-shot spread (data change to a 3-count simultaneous fan, or accept the ±0.03 jitter, or a new emit-level aim jitter field).
- Before slice 3d: D-4 per-move routing behind ?newcombat.
- Low: D25 orbit y-squash (render only, recommended).

Assumptions the implementation model must not change: everything in section A, the D-table formulas marked EXISTING or DECIDED, the R1 to R9 list, the frame order in section B, and that G.Combat keeps enemy shots and contact damage until slice 7.
