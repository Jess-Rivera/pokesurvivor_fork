# fix/attack-calc, slice 1 — PROPOSED (not applied)

Diff: `docs/proposals/fix-attack-calc-slice1.diff` (dry-run clean with `patch --binary --dry-run -p1`; `node --check` passes on all 3 files).

## Changes
1. **Defender level.** Enemy Def/SpD are now computed at the enemy's own level (`e.atkLvl`), not the player's. Bosses (atkLvl 0) fall back to the old level. Both sites: `hit()` and the projectile path in combat.js; the dev-log "Def/SpD" numbers use the same level.
2. **Fractional enemy HP.** `Enemy.hurt` no longer rounds to whole HP. The shown number and the co-op network packet stay whole. Shield absorbs fractional damage too.
3. **Per-hit floor.** The "at least 1 HP" rule moves from `hurt()` to the combat call sites (`floorHit`), so slice 2 can floor per cast instead of per event.
4. **Burn/poison logging.** New `DOT` log line (`DOT burn > Charmander | 3.2  HP 40.0 > 36.8`), via `Enemy.dot()`.

## Not changed
- Type immunity stays softened (x0.3, per types.js). Nothing deals 0.
- Burn/poison/lava formulas (status rework is its own branch).
- Co-op host already sends `Math.ceil(e.hp)`, so fractional HP is safe on the wire.

## Expected effect
Player->enemy damage drops about 15-18% from 1:00 to 10:00, fading to 0 at level parity. Everything else is behavior-neutral on average (rounding noise removed).
