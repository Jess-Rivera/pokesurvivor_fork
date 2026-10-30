# Combat validation strategy, schema assessment and handoff (Checkpoint 3)

- **Role:** Validation strategy, schema assessment and handoff for the move-schema rewrite.
- **Owns:** Validation plan, validation scenarios, schema assessment and the handoff list.
- **Does not own:** Per-move rulings (docs/MOVE-INTENT.md); move data grammar (docs/MOVE-AXIS-SCHEMA.md); runtime rules (docs/current feature planning/combat-architecture.md); general combat rules (docs/COMBAT-RULES.md).
- **Status home:** docs/current feature planning/move-schema-post-auth/slice-overview.md.
- **Last reconciled:** not yet

Date: 2026-10-26. Branch: feature-test/new-move-schema. Status: final planning artifact for the move-schema combat rewrite (Checkpoint 3). Build status: STATE.md (slices 3a to 4b are built).
Read with: docs/current feature planning/move-consistency-review.md (Checkpoint 1) and docs/current feature planning/combat-architecture.md (Checkpoint 2). Section references like "R2" or "D21" point into the architecture document.

## 0. Decisions recorded this round (Jess, 2026-10-26)

| id | decision |
| --- | --- |
| move-consistency-review:CP1-Q8 / range | One `range` value, tunable. Global default 420 px, kept as a named constant beside the cooldown tuning (G.MoveResolver.TUNING), with an optional per-move `delivery.range` override. Covers: `nearest` acquisition, `location` reach, `returns` turnaround distance, maximum reposition distance |
| D-1 | Re-authored novas start at 1 px (MOVE-AXIS-SCHEMA "Grammar decisions", Jess 2026-10-26; built in slice 3a), `grow.max` = today's radius, growSpeed unchanged. The original "near the caster's body radius" wording is superseded |
| Instance cap | Placed objects that have neither a time lifetime nor HP are capped at 8 live per move slot (named constant, default 8); placing a 9th removes that slot's oldest. Timed objects are bounded by their lifetime. Spikes keeps no timeout |
| D-2 | maxStacks values for Leaf Storm and Metal Claw. Settled: default 1 for every move (DECISIONS:Q14). Superseded 2026-10-30: maxStacks is retired (COMBAT-RULES "Stat stages"; DECISIONS 2026-10-30) |
| D-3 | Meteor Mash: the projectile hits enemy 1; at enemy 1's position at impact, a 3-projectile fan is emitted that ignores enemy 1 |
| D-4 | Approved: per-move routing behind `?newcombat` until slice 7 |

Still open from Checkpoint 2: Gust's per-shot spread (only D-3 of item 5 was answered).

---

## 1. Pre-integration validation strategy

### 1.1 What "correct" means, in five separate layers

| layer | question | judged by | can it be checked before combat exists? |
| --- | --- | --- | --- |
| Numerical | are the resolved numbers right (basePower, cd, ranges, chances, rider chance per hop, stage multipliers, damage per hit for given stats)? | arithmetic against the D-table | YES, now |
| Schema interpretation | what does the data imply (reach, end size of a grown shape, emissions per cast, instances alive at once, hits per target per cast)? | analytic derivation from the resolved definition | YES, now, as estimates; confirmed later by simulation |
| Simulation | does the executor do what the rules say (who is hit, when, how often, in what order, with which effects)? | headless harness with fixed dt, seeded rng and scripted enemies | only after slice 3b/3c, and only for the axes built so far |
| Visual | does what is drawn match what the sim decided? | eyes on the real game, with a hitbox overlay drawn from the sim's own shapes | only after slice 3d |
| Feel and balance | is it fun, readable, fair, fast enough? | playing, plus the damage simulator for time-to-kill | only with the real game; the simulator narrows it first |

The trap the prompt describes (a second visualizer that recomputes geometry and then disagrees with the executor) is avoided by one rule: **there is exactly one geometry implementation, G.MoveGeom (slice 3b).** The executor, the harness, the hitbox overlay and the renderer all call it. Nothing else computes a hit shape.

### 1.2 The alternatives, evaluated

| option | what it catches | what it cannot catch | cost | verdict |
| --- | --- | --- | --- | --- |
| 1. Static report of resolved properties and implied throughput | numerical and schema-interpretation errors, today (it would have caught Aura Sphere's 160 px reach and the boomerang time cut below) | anything about execution | small: extend the existing tools/validate_moves.js report | YES, Stage 0, now |
| 2. Math workbench (inputs: stats, STAB, defense, factors) | damage-formula and balance questions | geometry and timing | medium | YES, as a Node CLI script that loads the REAL G.Stats and G.MoveDefs (this is the damage simulator STATE.md already plans). REJECT a spreadsheet: it would re-implement the formula (a second implementation, the exact trap above). An interactive dev-page panel is a later nicety, not a requirement |
| 3. Debug mode: selected move plus controlled dummy targets in the real game | visual and feel; integration with items, stages, statuses | precise timing (frame-rate dependent) | small once slice 3d exists: G.Debug already has spawn(0), give(id), status, stage | YES, from slice 3d |
| 4. Geometry preview using the actual implementation | visual vs sim mismatch | anything the sim gets wrong consistently | small: an overlay toggle that draws G.MoveGeom.shapeOf for live instances and flashes on 'move:hit' | YES, as a dev overlay inside the game, from 3d. A standalone preview is REJECTED: it cannot exist without the sim it is meant to check |
| 5. Automated simulation tests | collision, eligibility, timing, lifetimes, damage, riders, emitters, deterministically | how it looks or feels | medium, but the harness pattern already exists (docs/proposals/*-harness.js load real files with a G stub and a seeded Math.random) | YES, the backbone, every slice |
| 6. Staged combination | all of the above in dependency order | | | RECOMMENDED |

Better than the listed options in one respect: an **intent scenario file** (1.4) that is written once and used twice, first by the static report (predicted outcome) and later by the simulation harness (actual outcome). It turns "does the schema say what Jess means" into a checked artifact before any combat code exists.

### 1.3 Minimum prerequisites for each kind of check

- Static report, intent predictions, math CLI: the resolver only (exists). Requires slice 3a for the corrected data, but can be built against today's data and rerun.
- Geometry truth tables: slice 3b only.
- Simulation of any move: slices 3b and 3c, and only for the axes 3c implements (anchors, static and travels, grow, endOn time/wall/offScreen/ownerDeath, pierce, oncePerInstance and interval, damage).
- Hit counts for the damage simulator: 3c. Before that the simulator uses the static report's analytic hit counts, clearly labeled as estimates.
- Visual check and hitbox overlay: 3d.
- Each remaining move: the slice that builds its last missing axis (coverage matrix 1.5).

### 1.4 Intent scenario file (PROPOSED)

A data file (docs/move_rework_holding/move-intent-scenarios.json) with one or more scenarios per move: enemy layout (positions, radii, whether they move), caster position and aim, duration, and the expected outcome in checkable terms (which enemies are hit, how many times, at what times within a tolerance, final caster position, number of instances alive, statuses present at the end). Jess approves the expected outcomes, because they ARE the design intent.

- Stage 0 use: the static tool predicts outcomes analytically where it can (reach, counts, timings without collision order) and reports disagreements with intent.
- Stage 2+ use: the simulation harness runs every scenario whose move is fully supported and asserts on the actual outcome. Unsupported moves are listed as "pending axis X", so coverage is visible.

### 1.5 Testing representative moves before all 63 are playable (canary sets)

Each slice is accepted on a small set that covers every axis value it introduces. The rest of the 63 are run by the intent harness as they become supported.

| slice | new axis values | canary moves |
| --- | --- | --- |
| 3c / 3d core | radial arc, radial point travel, linear, full circle, grow (time), count with spread, pierce 0 / n / UNLIMITED, oncePerInstance, interval, damage | Tackle, Ember, Water Gun, Hydro Pump, Heat Wave, Mud Shot, Flamethrower (aimTrack ignored until 4c) |
| 4a riders | ailment incl. trap root, flinch, knockback, crit, heal from dealt, stat on foe | Body Slam, String Shot, Ice Beam, Bite, Psycho Cut, Giga Drain, Bulldoze |
| 4b self and specials | shapeless self casts, team and individual stats, heal over time, recoil and shield, setWeather, fixed/level/status damage, chain | Swords Dance, Dragon Dance, Aqua Ring, Substitute, Hail, Dragon Rage, Night Shade (needs persistent from 4c, or test as a single pulse first), Hex, Thunderbolt |
| 4c motion extras | returns with legs, orbits and persistence, repositions, delay and falls, aimTrack, turnRate, path curve and oscillate | Bonemerang, Fire Spin, Leaf Storm, Night Shade, Razor Leaf, Quick Attack, Aerial Ace, Rock Slide, Psychic, Aura Sphere, Bubble Beam, Confusion (4c-1 to 4c-3 split: move-schema-post-auth/slice-overview.md) |
| 4d emitters | cast, interval, casterMove, termination, enemyHit triggers; instance cap | Gust, Discharge, Toxic, Flame Wheel, Toxic Spikes, Will-O-Wisp, Meteor Mash, Spikes |

### 1.6 Staged validation plan with acceptance criteria

**Stage 0 (now, no combat code): resolved-move report and intent predictions.**
Build: extend the resolved report (tools) with, per move: basePower, cd or "persistent", range used, reach (travel speed x lifetime, or turnaround, or orbit radius, or grown end size), lifetime vs cd overlap (instances alive at once), emissions per cast, rider chance per chain hop, Power/s proxy (D37) with the hit-count assumption printed beside it.
Accept when: every one of the 63 has a row; every derived value is reproducible by hand from the D-table; Jess has read the table and marked surprises; the two known interpretation hazards (spread definition, 1.7 F1; boomerang time cap, F2) are visible in it.

**Stage 1 (slice 3b): geometry truth.**
Accept when: containment matches hand-computed truth tables for every shape family, including a fast point that would tunnel without the sweep, arc edges with enemy radius, linear band ends; segDist2 agrees with legacy on random cases; the I1 grep guard is in check.js.

**Stage 2 (slice 3c): core simulation.**
Accept when: all core canaries pass their intent scenarios headlessly with a fixed dt (1/60 and 1/30 both) and a seeded rng; per-hit damage equals an independent hand computation of D6 to D11 for a fixed owner and enemy within 1e-9; SimBus tape shows exactly one 'move:hit' per landed hit and one 'move:end' per instance with the right reason; running the same scenario twice with the same seed gives an identical tape.

**Stage 3 (slice 3d): in-game, flag on.**
Accept when: legacy is unchanged with the flag off (all existing harnesses pass, a short play on dev.html?dev shows no difference); with ?dev&newcombat the core canaries are playable; the hitbox overlay shows shapes that line up with the drawn effects and hit flashes appear only on enemies inside them; no visible framerate collapse at high density (CLAUDE.md performance stance, compare with the flag off at the same G.Debug.skipTo minute).

**Stage 4 (slices 4a to 4d): per-slice canaries plus the growing intent suite.**
Accept each slice when: its canaries pass headless and in game; every previously passing intent scenario still passes; its section F rule tests pass (R1, R2, R5, R6, R7, R9 as they arrive).

**Stage 5 (after 4d, before slice 5): damage simulator and balance pass.**
Build the Node CLI on the real stats and the real sim: move, owner species and level, stages, upgrades, enemy species and level, layout; outputs damage per hit, hits per cast, per-cast damage, time to kill, and the same against a crowd layout.
Accept when: Jess has a ranked table and has decided whether any normalization is needed, by the evidence rule in architecture section D (same balanceClass and PP differing by more than a factor Jess sets after upgrades).

**Only gameplay can settle:** feel (snappiness, readability, telegraph clarity), whether a move's identity reads on screen, and how moves feel with upgrades and items in a full run.

---

## 2. Schema expressiveness against design intent

### 2.1 Can the axes express the 63 moves?

Yes, after the slice 3a grammar additions (persistent, range, instance-level delay, stat duration and maxStacks defaults, start-size grow, the instance cap constant) and two definitions since settled (spread, move-consistency-review:F1, and location pick, move-consistency-review:F3: MOVE-AXIS-SCHEMA `spread` and `locationPick` rows). Behavior that remains intentionally unexpressed: Toxic's escalating poison and continuous ribbon (accepted stand-ins), source priority (no real-time analogue), Fire Spin's legacy stat strip and half-strength burn (dropped, confirmed: DECISIONS:QA-10 and DECISIONS:Q17, burn at full standard length plus trap, no strip).

### 2.2 New findings from this pass (not in Checkpoint 1)

- **F1. `spread` has three definitions.** MOVE-AXIS-SCHEMA.md says it is the angle BETWEEN instances. Legacy combat.js uses a total fan of spread x count, capped at 2 pi (n - 1) / n. The data is authored as the TOTAL fan: Mud Shot and Aura Sphere use 6.2832 to mean "evenly around the circle" (under "between" they would all fly the same way), and Bubble Beam's "very NARROW spread (0.12)" for 7 bubbles only reads as narrow if it is the total. Meteor Mash's 0.6 differs by definition: total 0.6 (offsets +-0.3), between 0.6 (+-0.6), legacy (+-0.9). Recommendation: spread = total fan angle; when spread is at least 2 pi, instances are spaced 2 pi / count. This also decides what a count upgrade does (denser fan, not wider). BLOCKING for slice 3c because Mud Shot is a core canary.
- **F2. The 2 s boomerang lifetime cuts the return at the new default range.** With range 420: Razor Leaf goes out 420 px at 330 px/s (1.27 s) and needs at least as long to come back, Bonemerang 1.4 s each way at 300 px/s. Both exceed their `endOn time 2`, so the leaves would vanish mid-return. Fix in slice 3a data: per-move `range` (legacy 210 and 230 fit inside 2 s) or drop the time cap and rely on `returned`. Jess's call; recommend per-move range, which keeps the time cap as a safety net.
- **F3. `location` has no pick rule.** Legacy placed mines at the caster's feet, meteors on random enemies in reach, turrets behind the caster. The schema has one value. Recommendation: add a small enum beside it (at caster, or at a random enemy within range, defaulting to the enemy). Needed before slice 4c (Rock Slide) and 4d (Spikes, Toxic Spikes, Will-O-Wisp).
- **F4. Emitted children are full power each.** The grammar comment says children take damage and type from the parent, so Gust and Fairy Wind are 3 full hits, Discharge 2, Meteor Mash 1 + 3. Consistent with the no-normalization decision, but confirm it is intended rather than inherited by accident; the Stage 5 simulator measures it.
- **F5. Quick Attack's i-frames only cover the trip out at range 420.** With dashMult 10 and a caster speed around 150 px/s, each leg takes about 0.28 s and the i-frames last 0.3 s. Low priority; options: i-frames for the whole dash, or a shorter range for this move.
- **F6. Toxic Spikes emission count depends on a boundary convention.** Under D29 (interval: first emission at `every`) and a 3 s life, emissions land at 0.25 to 2.75 s (11) or also at 3.0 s (12) depending on whether an emission exactly at the end counts. Recommend: an emitter never emits at or after its end; if Jess wants 12, the first interval emission happens at activation.

### 2.3 Moves that are ambiguous, awkward or impossible today

| move | status after 3a | what remains |
| --- | --- | --- |
| Gust | awkward | per-shot spread (open) |
| Psychic | ambiguous | filled wedge vs moving crescent; steer toward the cast target or the current nearest (2.5 below) |
| Thunderbolt | ambiguous | other enemies inside the 10 px strike circle (2.5) |
| Toxic Spikes | ambiguous | F6 |
| Rock Slide, Spikes, Toxic Spikes, Will-O-Wisp | ambiguous | F3 |
| Razor Leaf, Bonemerang | broken by default range | F2 |
| Mud Shot, Aura Sphere, Bubble Beam, Meteor Mash, Razor Leaf, Bonemerang, String Shot | ambiguous | F1 |
| Leaf Storm, Metal Claw | pending | D-2 |
| Bug Bite, Shadow Ball, Metal Claw, Flash Cannon | pending | missing cds and dropped chances (review C10, C11) |
| Toxic | impossible as described, accepted | escalating DoT, ribbon |

### 2.4 Combinations that validate individually but are incoherent together

These pass today's grammar. They are added as validator rules in slice 4c-1 (MOVE-AXIS-SCHEMA "Presets and validation", Jess 2026-10-27), not slice 3a as first recommended. Built 2026-10-29: each rule names its validator id, in js/data/move-attributes.js or, where the condition language cannot express it, tools/validate_moves.js. All 63 moves pass, raw and resolved:

1. `persistent` with a `cd`. Done: `persistent-no-cd`. Changed 2026-10-29 (combat-architecture:H25): a persistent move must NOT list `endOn notActive` (`persistent-no-notactive`), a move that is neither persistent nor a self-cast needs an `endOn` (`needs-end`), and a self-cast rejects one (`self-has-no-end`).
2. A non-persistent move with no cd after resolution. Done: `resolved-needs-cd` (validate_moves --resolved).
3. `pierce` on a shapeless move or an emitter parent (no hitbox). Done: `pierce-needs-hitbox` (raw data; a shapeless move has no space to carry pierce).
4. `turnRate` or `aimTrack` with targeting `direction` or `none` (nothing to steer toward). Done: `steer-needs-target`.
5. `trigger: contact` together with `endOn time 0`. Done: `contact-not-instant`.
6. `hitPolicy: interval` with a lifetime shorter than `rehit` (it can never re-hit). Done: `interval-life-covers-rehit` (validate_moves).
7. Emit `count` greater than 1 with trigger `termination` or `enemyHit` (both are one-shot events; count would be emissions per event, which is what the child's space.count is for). Done: `one-shot-emit-count`.
8. `grow.dim: radArc` on a shape already at 2 pi, or `grow.max` below the start size. Done: `arc-grow-room` and `grow-max-above-start` (validate_moves).
9. A stat effect with side `foe` and scope `team` (a team scope is a player-side concept). Done: `foe-not-team`.
10. `returnHits` without a turnaround (`returns` needs a range; resolved default covers it, so this checks overrides). Done: the existing `hits-need-return` plus `resolved-returns-range` (validate_moves --resolved), so overrides are checked too.

### 2.5 Intent-driven validation of six hard moves

Each scenario links to its ruling in docs/MOVE-INTENT.md (QA-04), which owns intent. The "Intended" sentences were removed on 2026-10-29 after the ledger closed (DEVLOG B9); resolved "Open" items point at their owner.

**1. Quick Attack** (reposition, pierce, legs, i-frames)

- Ruling: docs/MOVE-INTENT.md, `quick-attack` (the ruling owns intent; this scenario is validation material).

- Representation after 3a: radial point 46 px, pierce 0, nearest, repositions swept, dashMult 10, returnToOrigin true, returnHits out, endOn returned, i-frames 0.3, range 420 (default).
- Execution: castSlot picks B within 420 px; motion moves the caster at 10 x player speed; on arrival the hitbox tests once (R1: pierce exhaustion disarms but does not end); the caster travels back; `returned` ends the instance.
- Resolved: move-consistency-review:F5 (i-frames cover the whole dash plus a 0.3 s tail) and the out-leg question (one enemy hit at B): MOVE-INTENT quick-attack.
- Test: scenario with B at 200 px and a decoy enemy on the path; expect B hit once, decoy 0, caster within 1 px of A at the end, duration = 2 x 200 / (10 x speed) within one step.

**2. Bonemerang** (returns, legs, knockback direction)

- Ruling: docs/MOVE-INTENT.md, `bonemerang` (the ruling owns intent; this scenario is validation material).

- Representation after 3a: 2 points 8 px, spread 0.5 (F1), pierce UNLIMITED, returns at 300 px/s, outAndBack, endOn 2 s or returned, range per F2, knockback 40 along travel.
- Execution: out leg until range, leg 1 starts with fresh eligibility (R2), velocity toward the owner's current position, `returned` ends it.
- Resolved: move-consistency-review:F1 (spread, MOVE-AXIS-SCHEMA `spread`); move-consistency-review:F2 (range 230) and move-consistency-review:S12 (pull clamped at the caster's edge): MOVE-INTENT bonemerang.
- Test: one enemy on each bone's path; expect exactly 2 hits per enemy per bone (one per leg), both bones end by `returned`, not by time.

**3. Meteor Mash** (emit on enemyHit, exclusion, inheritance)

- Ruling: docs/MOVE-INTENT.md, `meteor-mash` (the ruling owns intent; this scenario is validation material).

- Representation after 3a: parent point 9 px, pierce 0, cardLock count and pierce, damage + team atk +1 at 20% + emit {enemyHit, count 1} of a child with count 3, spread 0.6, anchor world, targeting direction, travels 360 px/s, endOn 0.8.
- Execution: collision lands on enemy 1, payload runs, the enemyHit emitter queues one emission at enemy 1's position with the parent's heading; pierce 0 ends the parent; the deferred spawn creates 3 shards next frame whose hit record already holds enemy 1 (R6).
- Resolved: move-consistency-review:F1 (fan angles follow MOVE-AXIS-SCHEMA `spread`); move-consistency-review:F4 (each shard deals full parent power, combat-architecture:H13, measured in the Stage 5 simulator).
- Test: enemy 1 plus three enemies placed on the expected shard lines; expect enemy 1 hit exactly once, each other enemy hit once, 3 shards spawned at enemy 1's impact position.

**4. Thunderbolt** (target anchor, instant lifetime, chain, falloff, rider halving)

- Ruling: docs/MOVE-INTENT.md, `thunderbolt` (the ruling owns intent; this scenario is validation material).

- Representation: point 10 px anchored on the target, endOn time 0, chainHops 4, hopRange 140, cardLock count, hopReduction 0.33 (renamed from chainDamageFalloff in slice 4b).
- Execution: one collision step at the target (D28), chain hops pick nearest unhit enemies within 140 px of the previous node (D15), hop k deals x (1 - 0.33)^k applied last (combat-architecture:D15), rider chance halves per hop.
- Resolved: the targeted enemy starts the chain; other enemies inside the strike circle take the strike only (MOVE-INTENT thunderbolt; combat-architecture:H20).
- Test: 6 enemies in a line 100 px apart; expect hits on 5 enemies with damage ratios 1 : 0.67 : 0.4489 : 0.3007 : 0.2015 (combat-architecture:D15); with a seeded rng over 10,000 casts, paralysis frequency per hop within 1 point of 10, 5, 2.5, 1.25, 0.625%.

**5. Psychic** (traveling arc, start-size grow, steering)

- Ruling: docs/MOVE-INTENT.md, `psychic` (the ruling owns intent; this scenario is validation material).

- Representation: arc 0.5 rad x 70 px, travels 80 px/s, turnRate 2.5 rad/s, grow radArc 1.5 rad/s to max 2.0, endOn 1.2 s.
- Execution: the wedge apex moves with the instance, heading turns toward the target by at most 2.5 x dt per step, radArc follows D21 and reaches 2.0 at t = 1.0 s, D18 containment each step, oncePerInstance.
- Resolved: Psychic stays a filled wedge and steers on the cast target while it lives, then the nearest (MOVE-INTENT psychic; combat-architecture:D23).
- Test: an enemy straight ahead at 120 px and two enemies at plus and minus 50 degrees at 90 px; expect the straight one hit early, the side ones hit only once the arc has widened past them (time window computed from D21), each hit once.
- Built slice 4c-3 (docs/proposals/move-travel-harness.js Test 6). Derived from D18 and D21 with the approved data, the straight one is hit once at age 0.5, but the side ones are never inside the wedge: the apex outruns them (their angle off the heading rises faster than the half arc widens). The harness asserts that, plus a widened-only hit on an enemy at (150, 45) at age 1.048. Raised to Jess as an [Open] line under MOVE-INTENT psychic.

**6. Toxic Spikes** (placed emitter, interval child, start-size grow, cap)

- Ruling: docs/MOVE-INTENT.md, `toxic-spikes` (the ruling owns intent; this scenario is validation material).

- Representation after 3a: placed point 40 px at `location` (F3), endOn time 3, emit {interval, every 0.25} of a full circle starting at 100 px, grow 400 px/s, endOn 0.25, poison 100%.
- Execution: emitter places, emits per D29 (F6 boundary), each ring tests every step and hits each enemy once per ring, poison applied (and refreshed) each time; lifetime bounds concurrency (two or three emitters alive at cd 1.1).
- Resolved: move-consistency-review:F3 (location pick, MOVE-AXIS-SCHEMA `locationPick`); move-consistency-review:F6 (never emits at or after its end, combat-architecture:H14).
- Test: an enemy standing 150 px from the emitter; expect the first ring to reach it at 0.125 s after emission, about 11 poison applications, 0 hits on an enemy at 250 px.

### 2.6 Missing schema capability vs missing implementation

| item | schema? | implementation? |
| --- | --- | --- |
| Leg-keyed eligibility | data already expresses it (outAndBack) | missing (4c) |
| Trap as root on enemies | schema fine | built (status.js, slice 4a) |
| Turnaround distance, acquisition range, dash cap | was missing; `range` added in 3a | missing (3c, 4c) |
| Instance delay / telegraph | was on the caster; moves to the instance in 3a | missing (4c) |
| Persistence | was inferred; explicit flag in 3a | missing (4c) |
| Instance cap | constant, not schema | missing (4d) |
| Spread definition | definition missing (F1) | legacy differs |
| Location pick | missing (F3) | legacy hard-codes per kind |
| Per-shot jitter for sequential emits | missing (Gust) | legacy jitter exists in code |
| Escalating DoT, ribbon | missing, accepted | n/a |
| Splash, onReentry, selected targeting, per-distance grow, linear grow or travel, commitment, multihit, spawn | in schema (multihit and spawn only in the doc, not the grammar) | missing, unused by the 63 |

### 2.7 Structural changes to make before combat depends on the grammar

All belong in slice 3a: `persistent`, `delivery.range` plus the tunable default, `delivery.delay`, stat defaults, the instance cap constant, the spread definition written into the grammar comment and the schema doc, the location pick rule, the validator rules in 2.4, and basePower in the resolver. Not recommended: renaming the schema's stat keys to match stages.js; one mapping function (D31) is less churn than renaming 17 data effects and the grammar.

### 2.8 Behavior classes the 63 moves do not cover (future needs)

Splash bursts; re-entry hit policy; manually selected targets; per-distance growth; extending or travelling beams; channelled moves that root or slow the caster (commitment); multi-hit on one target; summons with HP and AI (spawn); healing or shielding allies (side ally); pull knockback; conditional triggers other than berries; flinch interrupting a delay; enemy and gym-leader use of the new definitions (gyms still read legacy fields until slice 7). Any of these should arrive with its own canary scenario and validator rules, not as a special case in an existing executor.

### 2.9 Final schema recommendation

**Ready after limited clarifications and changes.**
Evidence: generation is lossless for all 63 and the grammar validates them; every move maps onto existing axis values once the 3a additions land; the architecture covers every axis value with one table entry; no move needs a new primitive or a move-specific code path. Not "ready now", because three definitions the executor needs on day one are missing or contradictory (spread F1, location F3, persistence), the default range breaks two moves (F2), and grow semantics require re-authoring seven shapes. Not "missing foundational capabilities", because each gap is a field, a constant or a definition, not a new axis.

---

## 3. Final synthesis and implementation handoff

> **HISTORY (Checkpoint 3 record, 2026-10-26).** Sections 3.1 to 3.9 are kept as the record and are not live. Coding-chat rules and slice plans: docs/current feature planning/move-schema-post-auth/slice-overview.md. Current rulings: docs/MOVE-INTENT.md, docs/MOVE-AXIS-SCHEMA.md, combat-architecture section H, docs/COMBAT-RULES.md. Status: STATE.md.

### 3.1 Repository and validation status

Branch feature-test/new-move-schema at 7f69252, uncommitted: js/data/move-overrides.js (12 cds filled, toxic and night-shade entries removed), described.json (Meteor Mash raise scope team), and the three planning documents. tools/check.js: everything passes except move_parity's self-test, which hard-codes hail as an empty override (test defect, fixed in 3a). The new move files are not loaded by the game.

### 3.2 Highest-priority consistency findings

Confirmed defects (review section 2): return legs blocked by oncePerInstance (C1), Quick Attack's pierce ending the dash (C2), contradictory grow semantics (C3, now decided), Gust spread ignored (C4), Meteor Mash double count (C5, now decided), trap inert on enemies (C6, now decided), per-hit self riders (C7, bounded by maxStacks), Speed / Sp. Def key collision (C8, D31 fixes), Karate Chop type artifact (C9, now decided), missing promised overrides and dropped chances (C10, C11, Jess's to-do), parity self-test (C12). New this round: F1 spread, F2 boomerang time cut, F3 location rule.

### 3.3 Schema readiness

Ready after limited changes (2.9). All changes are scoped into slice 3a.

### 3.4 Architecture and core invariants

Four modules (geometry, sim, effects, render), one table per axis, cross-axis rules R1 to R9 only, existing damage/stage/status/hurt/SimBus reused, dev-flag routing until slice 7. Invariants I1 to I10 (architecture section A).

### 3.5 Validation strategy

Stage 0 report and intent scenarios now; geometry truth (3b); deterministic headless simulation with seeded rng and canary sets per slice (3c onward); in-game flag, dummy setup and sim-drawn hitbox overlay (3d onward); damage simulator on the real code before upgrades and balance (Stage 5). One geometry implementation, used by everything.

### 3.6 Decisions still needed (in the order slices need them)

Status note (2026-10-28): the rows below are kept as the Checkpoint 3 record. Current rulings: docs/MOVE-INTENT.md (per move), docs/MOVE-AXIS-SCHEMA.md (grammar), combat-architecture.md section H (runtime).

| needed by | decision | recommendation |
| --- | --- | --- |
| 3a | F2 boomerang range vs time cap | per-move range 210 / 230 |
| 3a | exact nova start size (D-1 says "near body radius") | 16 px unless Jess prefers another |
| 3a | C10 cds for Bug Bite (feel says 0.42) and Shadow Ball; C11 confirm dropped chances on Metal Claw, Flash Cannon, Shadow Ball | Jess |
| 3a (definition), 3c (use) | F1 spread definition | total fan, evenly spaced at 2 pi or more |
| 3a (definition), 4c | F3 location pick | enum: at caster, or at a random enemy within range (default) |
| 4a | D-2 maxStacks for Leaf Storm and Metal Claw | Leaf Storm 1 (legacy hold at -2) |
| 4b | Thunderbolt overlap in the strike circle | target starts the chain, others take the strike only |
| 4c | Psychic wedge vs crescent; steering target | wedge; cast target, then nearest |
| 4c | Quick Attack return i-frames (F5) | i-frames for the whole dash |
| 4d | Gust per-shot spread | Jess |
| 4d | F6 emission at the end boundary | never at or after end |
| Stage 5 | F4 children at full power | measure first |
| low | orbit y-squash render-only; Fire Spin strip dropped; DMG_SCALAR 1.0 in code vs 2.0 in DECISIONS text | render-only; confirm; correct the doc |

### 3.7 Implementation slices and dependencies

3a data and grammar -> 3b geometry -> 3c headless core -> 3d flag in game -> 4a riders -> 4b self and specials / 4c motion extras -> 4d emitters -> 5 upgrades from fields -> 6 behavior and stress (absorbed by Stage 4 and 5 here) -> 7 flip and purge. Stage 0 (report and intent scenarios) can run in parallel with 3a. Details per slice: architecture section G.

### 3.8 Handoff rules for the coding model (one slice at a time)

Each coding chat receives: this document, combat-architecture.md, the review, and its slice file. It must:

1. Present a prose plan (no code in chat, CLAUDE.md) and wait for Jess's OK, since every slice except Stage 0 changes game files or game data.
2. Not change: architecture invariants I1 to I10, the frame order (architecture B), the D-table rules marked EXISTING or DECIDED, the R1 to R9 list, or G.Combat's ownership of enemy shots and contact damage.
3. Treat any behavior that needs a new cross-axis rule, a new field, or a different formula as a stop-and-ask, recorded in the slice file.
4. Leave the slice's canary scenarios passing, all earlier scenarios passing, and check.js green, then update STATE.md and DEVLOG.md and hand Jess the git commands.

Slice 3a scope, precise enough to plan from:

- Grammar: add `persistent` (bool, top level), `delivery.range` (px, optional; resolver fills the tunable default 420 only where it has meaning: targeting nearest or location, motion returns or repositions), `delivery.delay` (s; instance activation delay), the location pick enum (F3), stat duration default 6 and maxStacks default 6; document spread (F1) and emit count (total emissions; child space.count is shapes per emission); add the validator rules in 2.4.
- Resolver: basePower = power x accuracy / 100 (null power or accuracy handled per D1); cd only for non-persistent moves with basePower above 0; read `persistent` (delete the endOn heuristic); range default from TUNING; instance cap constant 8 in TUNING; deep-freeze the output.
- Data (described.json, then re-export): persistent on Fire Spin, Leaf Storm, Bug Buzz, Night Shade, Toxic, Flame Wheel; re-author Heat Wave, Hyper Voice, Bulldoze, Dark Pulse, Dazzling Gleam and the Discharge child to start size plus grow.max (old radius); Toxic Spikes to an interval emitter (every 0.25) with the 100 px start child; Quick Attack returnHits out; Meteor Mash emit count 1; Karate Chop type fighting; Rock Slide delay to the instance; Razor Leaf and Bonemerang range per F2; Bug Bite and Shadow Ball cds and the confirmed chances when Jess supplies them.
- Tools: fix the parity self-test, regenerate the parity and coverage reports.
- Not in 3a: any combat code, anything loaded by the game.
- Done when: check.js green, validator self-tests cover each new rule, Jess has marked the regenerated parity report.

### 3.9 Documents and their purpose

| document | purpose |
| --- | --- |
| docs/current feature planning/move-consistency-review.md | Checkpoint 1: per-move audit of all 63, defects, gaps, Jess's resolutions (section 9) |
| docs/current feature planning/combat-architecture.md | Checkpoint 2: design goals, data flow, structures, equations, functions, cross-axis rules, slices |
| docs/current feature planning/combat-validation-and-handoff.md | Checkpoint 3 (this file): validation plan, schema assessment, open decisions, handoff |

Not updated by this engagement (by its own rules): the slice-3 to slice-7 files, STATE.md, DEVLOG.md, DECISIONS.md. The Checkpoint 1 to 3 decisions should be copied into DECISIONS.md and the slice files rewritten from architecture section G once Jess approves.
