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

## Results (built 2026-10-29, Quick)
- js/systems/move-sim.js: instance `leg` and `armed`; hit records keyed by leg and a fresh pierce budget per leg (R2, H1, H22); `returns` motion (D26: out to exactly range, leg 1 on the next step, homes on the owner, `returned`); `repositions` (D27, R1, R9: point = target centre capped by range, 8 px isFree walk, World.collide; swept dash at 10 x final speed read at the cast, hitbox off in transit, one armed step at B as a circle, back to the exact origin; teleport placed at cast); END.returned; pierce exhaustion disarms and never ends returns or repositions; a faint ends both. I-frames raised every step of a swept dash (whole dash plus 0.3 s tail, never lowered); teleport gets 0.3 s once from the cast (handoff test 6). The root: rootOf rebuilds mvRoot from rooted commitments OR a live swept dash, so neither ends the other; clear() drops it on a new run.
- New rule beyond the handoff (MOVE-INTENT quick-attack): a reposition waits while the owner's dash lives (Quick Attack cd 0.583 is shorter than a long dash), and a swept dash waits at speed 0.
- js/systems/move-effects.js: knockOf (D33): `direction: travel` uses the instance velocity; a pull toward the owner is clamped to its edge gap / SLIDE 0.18 (Enemy.hurt knock is a decaying velocity); pushes unclamped.
- js/systems/move-route.js: Razor Leaf, Bonemerang, Quick Attack, Aerial Ace routed (28). js/systems/move-render.js: spinning bones with a trail, dash streak and afterimage, teleport flashes, armed-only dash hitbox, overlay leg and invuln. js/core/debug.js: newcombat('motion').
- Tests: new docs/proposals/move-motion-harness.js (cases 1 to 8 of the handoff list) and move-motion-mutate.js (22 mutations). Written without running Node (this machine cannot); recorded as all green at work (2026-10-29). Home rerun the same evening (Claude Code, Node on the pushed tree 5f21db5): check.js green, harness 64/64, persist runner 17/17, but move-motion-mutate.js caught 20/22 and exits 1. Survivors: "knockback ignores travel" (every test enemy sits dead ahead of the bone, where travel and away-from-centre agree) and "no 0.3 s tail" (the tail check cannot see a one-frame difference). The four 4c-2 intent scenarios still carried waitsFor "slice 4c-2" and never ran; unblocked 2026-10-29, they pass (intent 316/316).
- Review fixes (built 2026-10-29, Claude Code, approved by Jess): off-axis knockback cases and an exact end-of-dash i-frame check; Quick Attack endOn time 3 beside returned (owner stays put if it fires) and validator rule swept-needs-time; a one-way swept dash ends `arrived` after its hit at B; a rooted commitment holds every reposition at the cast gate (MOVE-INTENT quick-attack, aerial-ace); G.Enemy.KNOCK_DECAY named once in enemy.js, and the harness checks SLIDE covers it at the 1/30 frame cap; player.js unrootedSpd replaces the mvRoot flip in speedOf. Harness 75/75, motion runner 24/24 (three new mutations, one stale one replaced), validator self-test 50/50, check.js green, smoke-newcombat all passed, plus a one-off browser pass of newcombat('motion') and ('persist') with no errors.
- Not built: Quick Attack priority 1 (the sim does not order casts by priority; TODO Backlog); the on-request decoy in newcombat('motion') (the harness adds its decoy after the cast instead, since a decoy on the line would be the nearest target).
- Behavior change vs legacy: the legacy dash hit everything on its path; the new Quick Attack hits one enemy at B.
