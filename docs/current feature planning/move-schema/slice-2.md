# Slice 2: resolver, overrides and handler skeleton (PLANNING)

Back to slice-overview.md. Prior slice: slice-1.md.
Status: APPROVED 2026-10-26 (see Decisions). Code handoff: slice-2-codehandoff.md. No code written yet.

## Direction (decided 2026-10-25)
No legacy bridge: no derived `kind`, no flat projection in old field names. The resolver emits only the new resolved definition. The parity report compares numbers only against legacy moves.js.

## Inputs
G.MoveAttrs (grammar, UNLIMITED, FORMULA) and G.MoveData (63 moves of raw facts including pp, power, accuracy, priority, balanceClass, flavor_text). Defaults are NOT applied in the data; the grammar carries them (field `d`) and the resolver applies them.

## Build (one step after Jess OKs)
1. js/data/move-overrides.js: keyed by move id, only overridden fields. Seed: fire-spin, leaf-storm, gust (orbit) and flame-wheel (trail), whose legacy cd is a hand-set re-hit or spacing value, not the PP formula.
2. js/data/move-handler.js: registry for the 6 specials, each declaring a trigger and an optional condition from closed lists the validator checks (the grammar already has condition targetHasBerry on berrySteal, and trigger/endOn vocabularies). berrySteal is a stub (no berry system). Nothing executes in this slice.
3. js/data/move-resolver.js: eager at load. Order: defaults, derived values, overrides, handler attachment.
4. Parity tool in tools/ writing a report next to the coverage report: cd and power (vs legacy dmg) for all 63 moves. Jess marks any difference intended or regression; none is expected.
5. tools/check.js runs the parity tool. Synthetic timing (1000 fake moves, printed as a report line, not a gate) only if Jess wants it.
6. At the end: update this file, slice-overview.md, STATE.md, DEVLOG.md.

## Formulas
- Cooldown = 0.5 x (35 / PP) for damaging moves. Status moves and the four overridden orbit/trail moves keep hand-set cooldowns.
- NO damage normalization in slice 2 (decision 1). The resolved definition keeps the raw power; there is no dmg, E or floor. Accuracy, flavor_text and every other raw fact pass through untouched.

## Findings (read-only check against legacy, 2026-10-25)
- Legacy dmg equals Power for all 51 damaging moves (12 status moves are 0).
- Legacy cd equals 0.5 x (35 / PP) for 45 damaging moves; the exceptions are the four orbit and trail moves above.
- Legacy computed norm = (acc/100) x hits / E and floor = 1 / max(1, E) from kind (cone min(pellets, 3), boomerang 2, orbit orbs x speed/2pi x period, trail 2 x period / 0.5, aura 1, others 1). Legacy norm, floor and E are NOT carried into the new schema (decision 1).

## Decisions (Jess, 2026-10-26)
1. NO normalization (final). dmg = Power / E, E, the cone cap and the per-hit floor are all removed from slice 2 (and so is the earlier pellet-only E rule). Whether normalization is needed will be decided later with a damage simulator script (pick a move, upgrades, enemy type and level, see damage and enemy HP drop). If it is needed, it comes back as its own step, driven by that data.
2. desc: pass the API flavor_text through; hand-written descriptions wait for the UI slice.
3. Timing line: yes. Synthetic 1000-move resolve time printed as a report line (not a gate), plus the projected size of moves-generated.js at 1000 moves.
4. Housekeeping: upgrade-slice2b-harness.js added to KNOWN_STALE in tools/check.js (done, check.js now 17/17).
Status: the file contents are approved and written in slice-2-codehandoff.md. The build happens in a separate coding chat.

## Parity expectation
cd matches legacy for all 63 moves (formula for 45 damaging moves, overrides for the four orbit/trail moves, hand cd for status moves) and power equals legacy dmg for all 51 damaging moves. Any difference is a finding. Behavior changes (Quick Attack swept lunge, Aerial Ace teleport, Psychic traveling arc, Heat Wave ring) are not numeric cd or power differences and are slice 3 combat work.

## In legacy but not in the schema
Random aim jitter of +/-0.03 rad on every projectile (combat.js fireProjectiles) stays in combat. Hand-written desc text. Legacy norm, floor and E (dropped, see decision 1). Bubble stays in moves.js until the purge.
