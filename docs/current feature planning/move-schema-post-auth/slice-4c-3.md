# Slice 4c-3: delay, falls, aimTrack and the travelling moves

Back to slice-overview.md. Prior: slice-4r.md (built first). Next: slice-4d.md.

## Build plan
../move-schema/slice-4c-3-codehandoff.md (approved; Q23). Read it with the corrections below.

## Objective
aimTrack with the sticky target rule (changes Flamethrower), `location` targeting with the seeded-rng pick and both locationPick values, instance delay (D28), `falls` as a stationary world shape, and routing of Psychic, Confusion, Bubble Beam, Aura Sphere, Rock Slide (33 routed).

## Rulings to build (owners)
MOVE-INTENT flamethrower (sticky aimTrack), psychic (filled wedge, 0.5 to 2.0 rad), rock-slide (one boulder, low-opacity ring telegraph, delay on the instance), aura-sphere (reach about 160 px accepted). MOVE-AXIS-SCHEMA `delay`, `locationPick`, `aimTrack`, `range` rows. Architecture D18, D21, D23, D24, D28, R8, R9, H11, H23 (seeded-rng location pick).

## Decision (D-PSY, answered 2026-10-29)
Psychic re-picks its steering target once: when the cast target is lost it turns toward the nearest live enemy within range, and if that one is lost too it flies straight (combat-architecture:D23; MOVE-INTENT psychic, Jess 2026-10-29). The handoff's P7, Test 6 and the "re-picks every step" mutation stand as written.

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
BUILT 2026-10-29 (Claude Code, home), plan approved by Jess the same day with the aimTrack limit at the cone's reach (D-AIM). Awaiting his feel test.

What changed (all behind ?dev&newcombat; flag off the game is unchanged):
- move-sim.js. aimTrack: a caster-anchored static shape follows the owner, then turns at most aimTrack x dt toward a sticky target (cast target while alive within min(range, reach + radius), else the nearest within that reach, re-picked whenever lost, heading holds with none). location: a new aim entry; candidates are live enemies within range sorted by id, and the one rng draw happens only after every cast gate (stun, cost, dash, fizzle), so a waiting slot never draws; locationPick caster uses the owner position. delay: whole waiting steps (no motion, aging, collision or endOn; only a faint ends it where it would end anyway), then the first live step comes `delay` s after the cast frame and emits 'move:land'. falls: a world shape that never moves.
- move-route.js: the five moves routed (53 of 63). move-render.js: Rock Slide telegraph ring, dropping boulder, landing kick (0.35) and flash; Psychic wedge filled; Aura Sphere trail; overlay wait and track id. debug.js: newcombat('extras') and ('falls').
- Tests: new docs/proposals/move-travel-harness.js (79 checks, handoff Tests 1 to 10) and move-travel-mutate.js (26 of 26 caught, including move-geom growth mutations). Seven pending intent scenarios unblocked, psychic-repick's second enemy moved (it was nearer than the cast target), three added (confusion-pierce, bubble-beam-volley, aura-sphere-curve). Two move-sim-mutate.js mutations retargeted (their search text now matched new code). Smoke: extras and falls pages.
- Numbers: Rock Slide first hit exactly 0.4 s after the cast, live 12 steps at 1/60; Aura Sphere reach 159.5 px (1/60) and 159.3 (1/30); Flamethrower swing seen in the browser 1.12 rad; skipTo(20) density 16.6 ms/frame on both new sets (60 fps).
- Nothing needed fixing in the existing travel code: grow on a travelling wedge, oscillate per shot, curve with a full fan and the Psychic re-pick all worked as built in 3c.
- moveSpeed on falls: no move uses it; ignored, as the plan said.

Findings for Jess:
- Psychic scenario 5 as written cannot happen with the approved data: the side enemies are never inside the wedge, because the apex outruns them. Recorded as [Open] under MOVE-INTENT psychic (keep, or retune in the balance pass).
- Flamethrower feels different: a cone that swings at 1.4 rad/s for 1 s, still slowed and freezing cooldowns.
- Confusion and Bubble Beam have no MOVE-INTENT entry: they need the batch review (tools/move_report.js lists them).

Tests run: check.js 26/26 harnesses, I1 ok, move data ok; intent 608/608 (74 scenarios, none pending); mutation runners travel 26/26, sim 29/29, motion 24/24, persist 17/17, riders 24/24, selfcast 35/35; smoke all passed (two earlier runs each had one local-server resource error, ERR_NO_BUFFER_SPACE and ERR_FAILED, on different pages; the third run was clean).

### Whole 4c summary
4c-0 set the maxStacks default to 1 and capped foe debuffs per move. 4c-1 added persistence (the slot owns a persistent group's life, R7) and orbits on a true circle. 4c-2 added legs with per-leg pierce, returns, swept and teleport repositions, travel knockback with the pull clamp, i-frames and the shared root. 4r (swapped in between) routed 20 plain moves without a sim change. 4c-3 added aimTrack, location targeting, delay and falls and routed the last five 4c moves. Every motion and targeting value in the grammar is now built except emit and emitters (4d). Routed: 53 of 63; the rest is 4d (9 moves) and Hail (D-HAIL).
