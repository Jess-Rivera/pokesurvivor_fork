# fix/attack-calc, slices 3a + 3b — PROPOSED (not applied)

Diff: `docs/proposals/fix-attack-calc-slice3.diff` (ONE file: `js/data/moves.js`; dry-run clean; `node --check` passes; all 50 damaging moves load and the continuous-kind budgets check out).

## 3a: cooldown from PP (BETA = 1.0)
`period = 0.5 * (35 / PP)`. For every damaging move except orbit and trail, `cd = period`.
- Status moves (dmg 0: buffs, mines, turrets, Dragon Rage, Night Shade, Toxic) keep their hand-tuned cd. PP-derived cooldown has no balance meaning for a move with no damage budget.
- Upgrades ("-25% recarga") still multiply cd, and the cooldown perk/card still scales it (they act on the instance, which now starts from the PP value).
- Auras pulse once per cooldown at full damage (norm 1.0). Long-cd auras become shockwaves: Giga Drain, Bug Buzz, Dazzling Gleam 1.75 s, Discharge 1.17 s.

Notable cooldown changes (old -> new, seconds):
| Move | old | new |
|---|---|---|
| Tackle / Wing Attack / Metal Claw | 0.5 / 0.55 / 0.5 | 0.5 |
| Ember / Water Gun / Thunder Shock | 0.52 / 0.44 / 0.40 | 0.70 / 0.70 / 0.58 |
| Vine Whip / Confusion | 0.62 / 0.58 | 0.70 / 0.70 |
| Flamethrower / Bubble Beam | 0.70 / 0.65 | 1.17 / 0.88 |
| Hydro Pump | 1.5 | 3.5 |
| Bug Bite | 0.42 | 0.88 |
| Shadow Ball / Rock Throw | 0.66 / 0.70 | 1.17 |
| Razor Leaf / Quick Attack / Bubble | 0.9 / 0.75 / 1.0 | 0.70 / 0.58 / 0.58 |

## 3b: orbit and trail divisors
Both keep their own `cd` (orbit: re-hit lock; trail: puddle SPACING, a distance), and use `period` only for the damage budget.
- Orbit: `E = orbs * (speed / 2pi) * period` passes per period on a target sitting on the ring. Gust x1.50 per pass (E 0.67), Fire Spin x0.64, Leaf Storm x0.155 (E 5.8, orbs hit 5.8 times per 3.5 s period).
- Trail: `E = 2 * period / 0.5`. Flame Wheel x0.357 per puddle pulse (puddles still drop every 0.28 s, tick every 0.5 s).
- Floor is now `1 / max(1, E)`, so orbits with E < 1 keep a 1 HP floor.
- Check: events per period x norm = accuracy for every continuous move, i.e. sustained damage equals the budget `power * acc / period`.

## Consequences to expect
- Starters fire 25-40% slower (Ember 0.52 -> 0.70), on top of slices 1-2. Nothing offsets this until the DMG_SCALAR retune (tune/damage-hp, last).
- Sustained budget now spans 25-120 power/s (median 69). Lowest: Hydro Pump 25, Fire Spin 26, Leaf Storm 33. BETA is one constant in moves.js if this needs compressing.
- The swap exploit gets worse. `setActive` still caps an incoming move's wait at 35% of its cooldown, so Hydro Pump (3.5 s) is back in at most 1.2 s after a swap. Slice 3c (background cooldowns + swap lock) is the fix and is NOT in this diff.

## Found while checking
Dragon Rage ("40 points") and Night Shade ("damage equal to user's level") have `dmg: 0` and no fixed-damage path, so each hit is only the mainline +2 term (~0.9 damage). Not touched here; belongs in a fixed-damage-moves item.

## Not changed
Status moves' cooldowns, swap rule, props, burn/poison, DMG_SCALAR.
