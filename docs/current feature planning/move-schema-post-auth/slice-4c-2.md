# Slice 4c-2: returns and repositions

Back to slice-overview.md. Prior: slice-4c-1.md. Next: slice-4c-3.md.

## Build plan
../move-schema/slice-4c-2-codehandoff.md (approved; Q23). Read it with the corrections below.

## Objective
Leg-keyed hit records and the per-leg pierce budget (R2), returns motion (D26), swept and teleport repositions capped by range (D27, R1, R9), knockback `direction: travel` with the pull clamp, i-frames and the dash lock. Route Razor Leaf, Bonemerang, Quick Attack, Aerial Ace (28 routed).

## Rulings to build (owners)
MOVE-INTENT quick-attack (centre landing, one enemy hit at B, i-frames whole dash plus 0.3 s tail, mvRoot), bonemerang (back-leg pull clamped at the caster's edge, range 230), razor-leaf (range 210, back leg may hit). Architecture R1, R2, R9, D16, D26, D27, D33, H1. Per-leg pierce reset: DECISIONS 2026-10-27 "Slice 4c-2 planning" (runtime home: combat-architecture:H22).

## Corrections to the handoff
- Startup: read the owners above instead of "Review section 9.1 rows Q2, Q3, Q8 and F5".
- P8 "(D2)" and "(D3)": these mean MOVE-INTENT quick-attack (i-frames, dash lock), not architecture D2 and D3.
- "Q3 decided" means move-consistency-review:CP1-Q3 (Quick Attack), not DECISIONS:Q3.
- P12 Docs: update architecture D26, D27, D33, R1, R2 and this file; the F5 and review 9.7 edits are dropped (MOVE-INTENT holds them).
- Finish: update this file and slice-overview.md in this folder.
- The R2 test is "2 hits per enemy per bone, one per leg" (the old slice-4c.md wording "per leg" is wrong).

## Canaries
Razor Leaf, Bonemerang, Quick Attack, Aerial Ace.

## Proceed when
The handoff's tests pass, check.js green, Jess signs off G.Debug.newcombat('motion').

## Results
(not started)
