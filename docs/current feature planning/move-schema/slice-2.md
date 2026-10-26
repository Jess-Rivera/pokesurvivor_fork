# Slice 2: resolver, overrides and handler skeleton (PLANNING)

Back to slice-overview.md. Prior slice: slice-1.md.
Status: DONE 2026-10-26 (see Results and the two Follow-ups, which supersede the early counts). Left open for Jess: the 14 empty cd slots in move-overrides.js, and marking the parity report. Code handoff: slice-2-codehandoff.md.

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

## Results (built 2026-10-26)
Files: js/data/move-overrides.js (4 seed entries), js/data/move-handler.js (6 handlers, all declarations), js/data/move-resolver.js (G.MoveResolver.resolve, G.MoveDefs eager at load), tools/move_parity.js (self-test 9/9, parity, timing; `--report` writes docs/current feature planning/move-parity-report.md), tools/check.js runs it. Nothing is loaded by the game. check.js: 17/17 harnesses, export current, 63/63 valid, parity step ok.
- Handler triggers: enemyHit for berrySteal, fixedDamage, chainDamageFalloff, levelDamage, statusBonus; cast for setWeather. Verified against the six moves' data.
- Parity: power matches legacy dmg for all 63 moves (0 differences). cd matches for 49 moves (45 by formula, 4 by override). cd differs on 14 moves: swords-dance, agility, harden, aqua-ring, dragon-dance, toxic, string-shot, spikes, toxic-spikes, hail, will-o-wisp, substitute, dragon-rage, night-shade. Cause: moves-generated.js carries no cd for any move, so the hand-tuned legacy cd of non-damaging moves (8, 8, 8, 8, 8, 0.3, 1.1, 1.2, 1.1, 1.2, 3.5, 4, and Dragon Rage 1, Night Shade 0.5) has nowhere to come from. The resolver gives them no cd.
- Count correction: "damaging" follows the legacy rule (power above 0), which is 49 moves, not 51. Dragon Rage and Night Shade are category special but have no Power (handler damage) and legacy dmg 0, so they behave like the 12 status moves. 45 + 4 + 14 = 63.
- Decision for Jess (not made in the build, it would grow the approved scope): put the 14 hand cds in move-overrides.js (one line each, parity then shows 0 differences) or in the source JSON docs/move_rework_holding/move-conversions-described.json (the grammar's cd field, re-run tools/export_moves.js).
- Timing: resolve of 1000 synthetic moves about 16 ms (first run). moves-generated.js is 37 KB for 63 moves, projected about 593 KB at 1000.
- Resolver details: cd rounded to 3 decimals like legacy; overrides replace whole top-level fields; shallow `why` note is dropped from the output; resolved moves with a special effect get a `handlers` list (name, trigger, condition, stub).

## Follow-up (2026-10-26, Jess OK)
- Defaults: the resolver no longer fills turnRate, aimTrack or returnHits (valid only beside a parent field). Behavior-carrying defaults (pierce, count, motion, hitPolicy, spread, splash) are still applied, since an absent value there would mean something else to combat. Absent fields mean combat ignores them.
- Cooldown tuning constants live at the top of move-resolver.js and are exposed as G.MoveResolver.TUNING: ANCHOR_CD 0.5, ANCHOR_PP 35, BETA 1. cd = ANCHOR_CD x (ANCHOR_PP / PP) ^ BETA, rounded to 3 decimals, for Power above 0. BETA below 1 compresses long cooldowns (0.5 = square root).
- New check: tools/validate_moves.js --resolved validates G.MoveDefs against the grammar (63/63 valid), run by tools/check.js. Self-test of move_parity.js is 11/11.

## Follow-up 2 (2026-10-26, Jess OK): overrides removed, persistent-move rule
- The four seed overrides (fire-spin, leaf-storm, gust, flame-wheel) were legacy values (re-hit lock, puddle spacing) and are gone. In the new data the pacing is already explicit: rehit on the orbit moves, emit every on Flame Wheel. Gust is now a cast that emits 3 projectiles, so it gets the normal formula cd (0.5, was 0.26).
- New resolver rule: a move that lasts while active (delivery.endOn has notActive) gets no cooldown. Applies to fire-spin, leaf-storm, flame-wheel and bug-buzz (legacy cd 1.75, Jess confirmed).
- move-overrides.js now holds 14 EMPTY entries (why only) for the moves with no cd: 12 status moves plus Dragon Rage and Night Shade. Fill in `cd` there to give one a cooldown; the legacy hand cd is in each why for reference.
- Parity now: power 0 differences; cd 19 differences: 14 unset (open), 5 intended (the four persistent moves and Gust, each with a note in the report). Supersedes the Results counts above (4 override, 14 none).
