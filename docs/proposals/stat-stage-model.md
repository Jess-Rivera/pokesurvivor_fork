# Stat stage model, from scratch (APPROVED 2026-10-30, now history)

Status: APPROVED by Jess 2026-10-30 (DECISIONS 2026-10-30). HISTORY from approval: R1 to R13 below are COMBAT-RULES:SS1 to SS13 (docs/COMBAT-RULES.md "Stat stages"), and the text there wins; the [Proposed] tags below are as written before approval. This file keeps the rationale, the shape counts, the worked examples and the design intent. The Open items moved to COMBAT-RULES "Stat stages" as [Open].
Started from pokeapi data only (stat, stages, chance, target, damage class). No in-game cooldown, duration or maxStacks value was used as an input.
Replaces the D-MC5 question (slice-overview:D-MC5) if approved: there is no maxStacks formula left to decide.

## Why
The live rules tie stat stacking to maxStacks, duration and cooldown together (COMBAT-RULES "Stat stages and maxStacks", DECISIONS:Q13, DECISIONS:Q14, DECISIONS:Q15 / QA-11, D-FOECAP, D-LEAF, MOVE-INTENT dragon-dance). They conflict on Metal Claw and Meteor Mash (D-MC5) and need a per-move exception list. The move schema covers what a stat change IS (stat, stages, side, scope, chance) but not how it behaves over time, which is what this note defines. Importing the rest of the mainline moves needs one rule with no per-move authoring.

## The shapes (pokeapi move_meta + move_meta_stat_changes, counts are mainline moves)
| Shape | Count | In the pool today |
|---|---|---|
| Buff to self, no damage | 40 | Swords Dance, Agility, Harden, Dragon Dance |
| Damage + buff to self | 15 | Metal Claw, Meteor Mash |
| Damage + drop on self | 13 | Leaf Storm |
| Drop on foe, no damage | 26 | String Shot |
| Damage + drop on foe | 51 | Bubble Beam, Psychic, Shadow Ball, Mud Shot, Bug Buzz, Flash Cannon, Bulldoze |
| Buff and drop on self, no damage | 1 | none (Shell Smash) |
| Raise on a foe | 3 | none (Swagger, Flatter, Decorate) |
| Whole field | 3 | Bulldoze (applied to foes only today) |
| Reset, copy, swap, steal stages | several (category unique) | none (Haze, Psych Up, Heart Swap, Spectral Thief, Topsy-Turvy) |

## Rules
Terms: **stages** = what one success gives, straight from pokeapi (Swords Dance +2, Harden +1, Leaf Storm -2, Bubble Beam -1). **Cap** = the +-6 limit on a stat's total, nothing else. **Gate** = the minimum time between two climbs. **Duration** = how long a contribution lasts after its last success.

- R1 [Proposed] ONE TRACKER PER (Pokemon, move, stat) on each recipient: its current stages, its Gate timer and its Duration timer. Each Pokemon counts separately (two roster members with Swords Dance are two trackers). A move with several stat entries (Dragon Dance, Shell Smash) has one tracker per stat.
- R2 [Proposed] WHO ROLLS: one roll per recipient, per use. A change on a foe rolls once per enemy hit. A change on the caster or its team rolls once per cast, on the first enemy hit of that cast (a cast that hits nothing rolls nothing). A non-damaging move rolls once per cast. A persistent or rehit move counts each rehit tick as a use. Reads the existing `side` field; no new field.
- R3 [Proposed] FIRST SUCCESS applies the move's pokeapi stages immediately and starts both timers.
- R4 [Proposed] EVERY SUCCESS resets Duration. A success while the Gate is open also CLIMBS: it adds the move's pokeapi stages again and restarts the Gate.
- R5 [Proposed] A Duration window with no success sets that tracker's stages to 0. Only that tracker; other moves on the same stat are untouched.
- R6 [Proposed] A stat's stage on a host = the sum of all trackers on it (team raises plus own drops for a player, as today), clamped to the Cap.
- R7 [Proposed] BASE TIMERS, global, same for every move: Gate 6.0 s, Duration 6.1 s. Duration is always a little longer than Gate so a move that succeeds every Gate never drops. The gap is at least 0.1 s, not 0.001 s: a frame can be up to 1/30 s, so a smaller gap is decided by update order. This replaces TEAM_GRACE's refresh-instead-of-stack behavior.
- R8 [Proposed] Pure buff moves (no damage) have no cooldown of their own: they cast when their Gate opens. Damaging moves keep their own cooldown, which only decides how often they roll.
- R9 [Proposed] Raises are team-wide (unchanged). A benched Pokemon cannot cast, so its trackers stop refreshing and end one Duration after their last success (bench keeps ticking, COMBAT-RULES "Swap rule" and BENCH). Swap juggling can reach the Cap a few seconds sooner for a fraction of a second; the Cap bounds it.
- R10 [Proposed] UPGRADES: two TEAM-WIDE cards, not per Pokemon and not per move: "Stat Stage Gate -x%" (shorter Gate, faster climbs) and "Stat Stage Duration +x%" (longer Duration, easier to hold). They apply to every stat change the team causes, wherever it lands: raises on the team, drops on foes, AND drops on itself (Leaf Storm climbs faster and lasts longer). That double edge is intended (Brotato-style trade-off, survivor-like-design-reference principle 6). Enemies have no cards and use the base timers. Step size x is a slice 6 number, small, since one team card equals about six per-Pokemon picks. No card raises a move's stages.
- R11 [Proposed] Chance moves (N = 1): a chance move holds while it lands at least one success per Duration window. Hold probability per window = 1 - (1 - p)^k, k = rolls in the window.
- R12 [Proposed] SELF DROPS CLIMB ON A LONGER GATE: a drop a Pokemon puts on itself (the 13 damaging self-drop moves plus Shell Smash's drops) uses Self-drop Gate = Gate x SELF_DROP_GATE_MUL, with SELF_DROP_GATE_MUL = 2 (one tunable constant, slice 6). Duration is unchanged (6.1 s), so the drop still ends 6.1 s after the last hit. The team Gate card scales both Gates proportionally; the Duration card lengthens self drops too, so both cards keep their double edge. No per-move authoring. (Jess, 2026-10-30)

## Worked examples (base timers, no cards)
- Swords Dance (+2, always lands): +2 at 0 s, +4 at 6 s, +6 at 12 s, then holds.
- Harden (+1): one step every 6 s, +6 at 30 s.
- Brock's Harden (R13, STRONG_HOST_GATE_MUL 1): same as above, +6 at 30 s of steady casting (today it caps within a few seconds). At 0.5 it would be +6 at 15 s.
- Swords Dance + Dragon Dance on one Pokemon: two trackers on Atk climb in parallel, Cap at +6.
- Metal Claw (+1, 10% once per cast): climbs on a success after its Gate opens; a dry 6.1 s window resets only Metal Claw to 0. If another tracker already holds Atk at +6, its resets do not show.
- Leaf Storm (-2 on itself, orbit hits constantly, R12 Self-drop Gate 12.0 s): -2 at 0 s (x0.5 Sp. Atk), -4 at 12 s (x0.33), -6 at 24 s (x0.25), like mainline repeated use but slower. Expected rhythm: stay out 12 to 20 s, swap off, the drop clears 6.1 s later on the bench, swap back after the lockout to a fresh -2. A team Gate card makes the climb faster.
- Same rhythm for the other -2 nukes (Overheat, Draco Meteor, Fleur Cannon, Psycho Boost). The -1 self-drop moves (Close Combat, Superpower, Hammer Arm and others) reach their floor much later.
- Bubble Beam on one enemy: climbs -1 per Gate while it keeps landing on that enemy; stops landing, that drop ends.

## Design intent: swapping is a reward, not a requirement
Mainline's real cost for Leaf Storm is the switch; here the bench already exists and the swap is the player's only input besides movement, so "nuke, then rotate out" gives the swap a recurring job and keeps the mid-run active (survivor-like-design-reference: Halls of Torment front-loaded-decisions pitfall). But the genre collapses inputs to movement (principle 1), so forgetting to swap must never make a move dead: at -6 (x0.25 on the B = 2 ladder) Leaf Storm still hits at about Ember level. A player who never swaps keeps a weak move; one who rotates gets full power. If feel tests show the floor too punishing, tune SELF_DROP_GATE_MUL first, not the rule.

## What it retires (if approved)
- The `maxStacks` field (self and foe) and live-copy counting per move.
- DECISIONS:Q13 (duration never shorter than cooldown), DECISIONS:Q15 / QA-11 formula, DECISIONS:Q14's "maxStacks 1 default" part, D-FOECAP (combat-architecture:H24).
- MOVE-INTENT dragon-dance exceptions, MOVE-INTENT leaf-storm D-LEAF (replaced by R4, R5 and R12), MOVE-INTENT bug-buzz and ice-beam held-at -1, String Shot's two -2 hits ruling.
- D-MC5.
- The legacy ROLL_GAP and procSelf model stay on the legacy path until slice 7b removes it.

## Open
- Bond tax [Open]: Jess's idea, bonding a buff move adds 50% of its cooldown to the other moves in the group. Flat seconds vs +50% of each move's own cooldown not decided. Belongs to the Bond rework branch (TODO Backlog).
- Stage-manipulation moves [Open]: reset, copy, swap, invert, steal (Haze, Clear Smog, Psych Up, Heart Swap, Topsy-Turvy, Spectral Thief). Not in the pool yet.
- Raise on a foe (Swagger, Flatter) and whole-field moves: should follow R1 to R6 unchanged; not checked at runtime.
- Bosses, elites, gym leaders: CHECKED 2026-10-30. Only conflict was gym Harden's stacks cap and ramp (BOSS-REWORK 3c); Jess ruled strong hosts follow the model (R13). COMBAT-RULES "Foe debuffs ... Strong hosts keep their own rules" points at nothing in BOSS-REWORK; remove that clause on approval.


## Slice impact (if approved)
- Slice 5 loses the self-buff cap formula. It gains the two team cards (or they move to the upgrade rework branch, see TODO).
- The tracker model is a stages.js change on the new path: new runtime, needs a prose plan and tests section before any build.
- Pure buff cooldowns in js/data/move-overrides.js (the "no cd set yet" entries) become unused for timing under R8.
