# Slice 4a: riders on hit

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This is the record of an executed slice. Its decisions are absorbed into docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). Where this text and those documents differ, those documents win. Body below unchanged.

Back to slice-overview.md. Prior slice: slice-3d.md (signed off by Jess 2026-10-27). Next: slice-4b.md or slice-4c.md. Build plan: slice-4a-codehandoff.md (APPROVED and BUILT 2026-10-27; waiting for Jess's playtest).

## Objective
The payload effects that ride on a damaging hit: ailment, flinch, knockback, crit, heal from dealt, and stat on foes.

## Before starting (Jess)
DONE 2026-10-27, see Decisions below.

## Reads
Architecture D10, D30 to D34, E (move-effects table), F (R5 hook only). Review section 9.1 rows Q4, Q5, Q12, Q14. Search status.js (apply, trap handling for non-player hosts), stages.js (add, teamAdd, ladder, src-tagged applications), Enemy.hurt.

## Build
- move-effects.js appliers, one per effect type. Chance is percent divided by 100 in this one place. Every eligible hit rolls its riders (no 0.5 s roll gap). Hit chance halving per chain hop is a hook here, used by 4b.
- Stat effects: schema keys map to stages.js keys in exactly one function (spAtk to spa, spDef to spd, spd to spe). Duration defaults to 6 s. Live applications from one move on one host are capped at maxStacks (default 6); a capped application refreshes that move's oldest. Stage is the clamped sum of live applications; multiplier per D30.
- status.js: trap on a non-player host becomes a root (movement multiplier 0). The existing player-side swap lock must not change.
- stages.js: the per-move live-application cap.
- Knockback direction: from the instance center to the enemy, or along travel when the effect says so. Heal from dealt uses HP actually removed and the Big Root multiplier.

## Canary moves
Body Slam, String Shot, Ice Beam, Bite, Psycho Cut, Giga Drain, Bulldoze. (Fire Spin was named in the architecture here, but it is an orbit and needs 4c, so its trap root is verified there.)

## Tests
Seeded rng proc counts match the chances. The Q4 stage-cap example reproduces exactly: two existing stages plus a maxStacks 1 move reapplied every 3 s with 6 s duration never exceeds 3. Speed versus Sp. Def mapping. A trapped enemy does not move. All existing status and stages harnesses still pass.

## Exclusions
Self-casts, specials, chains.

## Proceed when
Harness green and String Shot, Ice Beam, Mud Shot play correctly behind the flag.

## Decisions (Jess, 2026-10-27; also review 9.8)
- D1 maxStacks (D-2): Metal Claw 2, Meteor Mash 2, Leaf Storm 1. Source JSON edit, regenerate moves-generated.js.
- D2 Trap on a wild enemy is a root for 2 s. The player's 8 s swap lock is unchanged.
- D3 Bosses, elites and gym leaders get trap cut like freeze and sleep (25% length, then a 10 s no-reapply window).
- D4 String Shot's two stacked strands both apply Speed -2 (-4 total). Allowed, no data change.

## Found while planning (details in the handoff)
- Four additions to the written spec, all existing behavior or plumbing, no new rule: Fire hits thaw ice (G.Status.onHit), a hit with no damage (String Shot) still emits 'move:hit' with dmg 0, crit and knockback are read by the damage applier (one Enemy.hurt call), and the rider-test dummies must be awake (sleeping dummies block burn, paralysis and freeze as a second major status).
- The routed list adds the 7 canaries (14 in total). Fire Spin and Leaf Storm wait for 4c, Meteor Mash for 4d.
- Q14 means Flamethrower procs burn about 2.5 times as often as legacy. Balance goes to the Stage 5 simulator.

## Scope change during the build (Jess, 2026-10-27)
- The movement check found four phases that ignore the speed product, so a root alone would not hold them: units leaving for an elite, jumpers (start and the jump itself), the boss dash cast and the boss leap (it uses the jump). Jess OKed adding js/entities/enemy.js. Defaults taken (Jess did not pick): a jump already in the air lands, a crouching one waits; leaving units are rooted. Bosses are being replaced by the gym-leader system, so their handling is minimal (dash runs its timer in place).
- Left alone on purpose (pushes, not walking): crowd separation (about 42 px/s), knockback, flinch recoil, the spawner moving far units near you, the rift arena clamp.

## What was built (2026-10-27, Claude Code)
- move-effects.js: one applier per effect (damage, ailment, flinch, stat, heal; crit and knockback as table entries read by damage). pct() is the only percent conversion, rolls() the one chance helper (no chance = no roll, hop halving hook), statKey() the only stat translation. Damage records HP actually removed (shield counted, overkill excluded) for heal; one Enemy.hurt carries the crit bonus and the knockback distance. Foe riders skip dead and remote enemies; self riders still apply after a kill. G.Status.onHit once per landed hit. An unknown effect type throws; emit, shield, recoil and special are skipped until 4b and 4d.
- move-sim.js: every landed enemy hit emits 'move:hit' (dmg 0 for String Shot). Consumers checked: overlay and harness tape only.
- stages.js: add() takes optional src and live (per-move cap; at the cap the move's oldest application is dropped and the new one added at full duration, even at the clamp; text only when the stage changed). teamAdd() takes an optional live (default TEAM_LIVE 8). Legacy callers unchanged.
- status.js: trap on a non-player host is a root, 2 s (CONTROL.trap.root), an effect's own duration wins; strong hosts 25% then a 10 s stWin.trap window, no extension while rooted; wild hosts refresh to the longer. rooted(h) exported; speedMul returns 0 for a rooted non-player. The player's trap is unchanged (8 s swap lock, speed x1).
- enemy.js: rooted units do not start a jump, hold a crouch, do not walk while leaving, and a boss dash stays in place.
- move-route.js: 14 routed ids (the 7 canaries added). Data: maxStacks Metal Claw 2, Meteor Mash 2, Leaf Storm 1 in the source JSON, regenerated.
- debug.js: G.Debug.newcombat('riders') loads the 4a seven with 24 awake chase dummies (40 px/s, 1e9 HP) at 90, 170, 250 px; newcombat() is still the 3d seven with sleeping dummies. The hitbox overlay prints each enemy's statuses (seconds left) and stat stages.
- Harness docs/proposals/move-riders-harness.js (97 checks, real status, stages and enemy plus the sim). Mutation runner move-riders-mutate.js (24 mutations, run by hand). Updated: status-sliceC harness (two checks asserted the old "enemies cannot be trapped" rule), move-sim harness (stub rider methods; seeded rng only for worlds with chance riders, so a stray roll still throws), tools/smoke-newcombat.js (rider page; Life Orb check now uses Ember because Tackle's knockback pushes the near dummies out of reach).

## Results
- check.js: 20/20 harnesses, I1 guard ok on 5 files, only the old hail self-test fails. Riders harness 97/97; move-sim 1,980/1,980; mutations 24/24 (riders) and 29/29 (sim).
- Smoke (Playwright, check only): flag off clean; 3d page unchanged; rider page: String Shot target still for 1.5 s (Speed -4) then walks again, Body Slam / Bite knock (impulse 250), Speed drops on all 24 dummies, paralysis or freeze seen, Giga Drain healed 12 HP, no errors. Density at skipTo(20): 64 to 66 enemies, 16.6 ms/frame both ways (vsync capped).
- Not checked by machine: feel (String Shot root strength, Flamethrower burn uptime from Q14), the look of the dev status line in a crowd (it overlaps).
