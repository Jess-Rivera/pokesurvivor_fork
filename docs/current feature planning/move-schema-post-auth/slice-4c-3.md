# Slice 4c-3: delay, falls, aimTrack and the travelling moves

Back to slice-overview.md. Prior: slice-4c-2.md. Next: slice-4r.md.

## Build plan
../move-schema/slice-4c-3-codehandoff.md (approved; Q23). Read it with the corrections below.

## Objective
aimTrack with the sticky target rule (changes Flamethrower), `location` targeting with the seeded-rng pick and both locationPick values, instance delay (D28), `falls` as a stationary world shape, and routing of Psychic, Confusion, Bubble Beam, Aura Sphere, Rock Slide (33 routed).

## Rulings to build (owners)
MOVE-INTENT flamethrower (sticky aimTrack), psychic (filled wedge, 0.5 to 2.0 rad), rock-slide (one boulder, low-opacity ring telegraph, delay on the instance), aura-sphere (reach about 160 px accepted). MOVE-AXIS-SCHEMA `delay`, `locationPick`, `aimTrack`, `range` rows. Architecture D18, D21, D23, D24, D28, R8, R9, H11, H23 (seeded-rng location pick).

## Blocking decision (D-PSY)
After Psychic's cast target dies: (a) one re-pick of the nearest, then straight (architecture D23, as the handoff plans and as built in 3c), or (b) re-pick whenever the target is lost (MOVE-INTENT's "then the nearest enemy" read as continuous). Reading (b) needs a Psychic exception to D23 and changes Test 6 and the mutation list. Do not start the build until this is answered.

## Corrections to the handoff
- Startup: read MOVE-AXIS-SCHEMA `delay` instead of "review section 9.1 row Q17".
- P2 "(D1, D2)": these mean MOVE-INTENT flamethrower, not architecture D1 and D2. "DECIDED Q13" in P2 and "Q17" in P5 are review Checkpoint 1 numbers (turnRate units, delay), not DECISIONS Q13 or Q17.
- Ignore ../move-schema/slice-4c.md "aimTrack rotates ... toward the nearest enemy"; the sticky rule wins.
- P10 Docs: update architecture D23, D28, R8, R9, validation 2.5 scenario 5 (test only), the MOVE-AXIS-SCHEMA `aimTrack` row and grammar comment (sticky rule), and this file; the review edits are dropped.
- Finish: update this file and slice-overview.md in this folder, including a whole-4c summary.

## Canaries
Flamethrower (now tracking), Psychic, Confusion, Bubble Beam, Aura Sphere, Rock Slide.

## Proceed when
The handoff's tests pass, check.js green, Jess re-playtests Flamethrower and signs off G.Debug.newcombat('extras') and ('falls').

## Results
(not started)
