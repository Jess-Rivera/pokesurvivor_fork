# Slice 2: resolver, overrides and handler skeleton (PLANNING)

Back to slice-overview.md. Prior slice: slice-1.md.
Status: plan awaiting Jess's OK on the open decisions below. No code written yet.

## Direction (decided 2026-10-25)
No legacy bridge: no derived `kind`, no flat projection in old field names. The resolver emits only the new resolved definition. The parity report compares numbers only against legacy moves.js.

## Inputs
G.MoveAttrs (grammar, UNLIMITED, FORMULA) and G.MoveData (63 moves of raw facts including pp, power, accuracy, priority, balanceClass, flavor_text). Defaults are NOT applied in the data; the grammar carries them (field `d`) and the resolver applies them.

## Build (one step after Jess OKs)
1. js/data/move-overrides.js: keyed by move id, only overridden fields. Seed: fire-spin, leaf-storm, gust (orbit) and flame-wheel (trail), whose legacy cd is a hand-set re-hit or spacing value, not the PP formula.
2. js/data/move-handler.js: registry for the 6 specials, each declaring a trigger and an optional condition from closed lists the validator checks (the grammar already has condition targetHasBerry on berrySteal, and trigger/endOn vocabularies). berrySteal is a stub (no berry system). Nothing executes in this slice.
3. js/data/move-resolver.js: eager at load. Order: defaults, derived values, overrides, handler attachment.
4. Parity tool in tools/ writing a report next to the coverage report: cd, dmg and E vs legacy for all 63 moves; Jess marks each difference intended or regression.
5. tools/check.js runs the parity tool. Synthetic timing (1000 fake moves, printed as a report line, not a gate) only if Jess wants it.
6. At the end: update this file, slice-overview.md, STATE.md, DEVLOG.md.

## Formulas
- Cooldown = 0.5 x (35 / PP) for damaging moves. Status moves and the four overridden orbit/trail moves keep hand-set cooldowns.
- Base damage = Power / E, emitted as dmg, so upgrades applied later in combat.js scale a base-normalized damage and added pellets add real damage. Example: 7 pellets and 42 power gives E = 7, dmg = 6.
- E = damage events one target takes per cast (projectile count, true multi-hit count, accuracy folded in, boomerang out-and-back, orbit passes per cooldown, interval re-hits). Exact rules are open decision 1.

## Findings (read-only check against legacy, 2026-10-25)
- Legacy dmg equals Power for all 51 damaging moves (12 status moves are 0).
- Legacy cd equals 0.5 x (35 / PP) for 45 damaging moves; the exceptions are the four orbit and trail moves above.
- Legacy computed norm = (acc/100) x hits / E and floor = 1 / max(1, E) from kind (cone min(pellets, 3), boomerang 2, orbit orbs x speed/2pi x period, trail 2 x period / 0.5, aura 1, others 1). The new E derives from the axes instead.

## Open decisions (Jess)
1. E rules: does every pellet count (the 7-pellet example) or should cones keep the legacy min(pellets, 3)? Recommendation: derive from the hit policy and delivery axes, let the parity report show every difference from legacy.
2. floor: should the resolver still emit the per-hit minimum 1 / max(1, E)?
3. desc: pass the API flavor_text through and leave hand-written descriptions to the UI slice?

## Likely intended parity differences
Quick Attack (single-target swept lunge out and back), Aerial Ace (teleport, landing circle), Psychic (traveling tracked arc, was a 12-projectile nova), Heat Wave (ring).

## In legacy but not in the schema
Random aim jitter of +/-0.03 rad on every projectile (combat.js fireProjectiles) stays in combat. Hand-written desc text. Bubble stays in moves.js until the purge.
