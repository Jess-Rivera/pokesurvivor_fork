# fix/attack-calc, slice 2 — PROPOSED (not applied)

Diff: `docs/proposals/fix-attack-calc-slice2.diff` (dry-run clean with `patch --binary --dry-run -p1`; `node --check` passes on all 4 files; moves load and norms check out in a node test).
Touches: `js/data/moves.js`, `js/core/stats.js`, `js/systems/combat.js`, `js/systems/log.js`.

## Decisions this slice records
- BETA = 1.0 (cd = 0.5 * (35/PP)). Used by slice 3, not here.
- Aura and trail stay on today's delivery (aura = one pulse per cooldown, trail puddle = one pulse per 0.5 s). No tick conversion.

## Why the scope is smaller than the full geometry plan
Orbit, trail and aura divisors depend on the FINAL cooldown (orbit E = orbs x passes/s x cooldown; trail E = overlap x cd / 0.5). With today's hand-tuned cooldowns they come out nonsense (Leaf Storm would get x2.3 per hit, then x0.35 once its PP cooldown is 1.75 s). So those three ship WITH the PP cooldowns (slice 3). Everything whose divisor does not depend on cooldown ships now.

## Mechanism
One number per move, computed once at load from the BASE definition (so upgrades that add pellets/orbs add damage, they do not shrink the per-event share):

`norm = (accuracy/100) * hits / E`, `floor = 1/E`

- `Stats.applyDamage` multiplies the FINAL per-event damage by `move.norm` (after the mainline +2, because the +2 is per event).
- The min-damage floor becomes `move.floor` per event, so a whole cast does at least 1 HP total (was 1 per event).
- New data table `CANON` in moves.js: PP for all 64 moves (unused until slice 3), accuracy where below 100, hits for true multi-hit (Bonemerang = 2).
- Dev log: OUT lines show `per-cast xN` as its own step; "applied" text removed (HP is fractional now).

E values in this slice: cone = MIN(pellets, 3) (typical range), boomerang = 2 (out and back), everything else 1.

## Effect (per-event multiplier on final damage)
| Move | kind | norm | Note |
|---|---|---|---|
| Flamethrower, Bubble Beam | cone, 7 pellets | 0.333 | 3 pellets landing = canonical power; point blank (7) = 2.3x |
| Razor Leaf | boomerang | 0.475 | 0.5 x 95% accuracy |
| Psycho Cut | boomerang | 0.5 | |
| Bonemerang | boomerang | 0.9 | true 2-hit: both hits counted, E = 2, so each pass is a full hit x 90% |
| Hydro Pump | beam | 0.8 | accuracy only |
| Fire Spin | orbit | 0.85 | accuracy only (orbit E waits for slice 3) |
| Heat Wave, Leaf Storm, Rock Throw, Rock Slide, Meteor Mash, Toxic* | various | 0.9 | accuracy only |
| Mud Shot, Metal Claw | nova, melee | 0.95 | accuracy only |
| All other damaging moves (Tackle, Ember, Water Gun, ...) | | 1.0 | unchanged |

*Toxic/Will-O-Wisp/String Shot have power 0, so the accuracy multiplier changes nothing for them today.

## Not changed
- Props (rocks, chests, grass) still take un-normalized damage.
- Cooldowns, aura/trail/orbit delivery, burn/poison, DMG_SCALAR.
- Remaining moves' balance: after this slice, cones and boomerangs are weaker (by design), so expect Flamethrower-style builds to feel worse until the DMG_SCALAR retune in tune/damage-hp.
