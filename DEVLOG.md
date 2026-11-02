# DEVLOG

Log of each working session. Append new entries at the END (the file is no longer reverse-chronological).
Keep each entry to about 6 lines: what changed, what was decided, what broke, where we stopped. Details go in DECISIONS or the harness.
Older entries (before 2026-10-25) were rotated to docs/DEVLOG-archive.md on 2026-10-27. Rotate again when this file passes about 40 KB.

---


## 2026-10-25 (Claude Desktop, home): #2 new-move-schema slice plan
- Jess created feature-test/new-move-schema for the #2 implementation check. Read move-conversions-described.json (63 moves, all reviewed), MOVE-AXIS-SCHEMA.md, moves.js, kinds.js, combat.js kind dispatch, status.js. No js/ edits.
- Wrote docs/current feature planning/move-schema-slices.md: 7 slices (data+grammar, resolver+parity report, ?newmoves flag, new executors, upgrades, behavior+stress harness, flip+purge).
- Architecture per Jess: raw JSON -> export script -> generated js; handler js + resolver js; combat.js thin. Flat projection bridges the old fields during migration.
- Decisions: derived cd/damage, individual buffs active-only, emit deferred to slice 4. Engine gaps found: emit (8 moves), individual buffs (11 effects), 6 specials, ~10 delivery extras.
- Stopped before slice 1 deep dive (to be done in a fresh chat). REMINDER: commit + push (the plan doc, STATE.md, DEVLOG.md).


## 2026-10-25 (Claude Desktop, home): #2 slice 1 built (groundwork)
- New files, none loaded by the game: js/data/move-attributes.js (grammar), js/data/moves-generated.js (63 moves, generated), tools/export_moves.js (--check guards hand edits), tools/validate_moves.js (21-case self-test, coverage buckets), docs/current feature planning/move-coverage-report.md.
- First validator run was 54/63. Source fixes in described.json: metal-claw side self, Aerial Ace and Psychic pierce omitted (default UNLIMITED), spread kept on count-1 moves; Spikes source was right (lasts until triggered). Grammar fixes: blank flavor_text allowed, trigger needs some endOn, no spread-count rule. Final 63/63.
- Docs: MOVE-AXIS-SCHEMA.md updated (grow.max/per, stat fields, casterState, pierce default, spread, hitCap and kind removed); plan doc has slice 1 results and slice 2 kickoff notes; DECISIONS entry added.
- tools/check.js now runs the freshness check and validator (pass and stale paths tested). 17/18 harnesses pass; upgrade-slice2b-harness.js fails on a missing docs/move-catalogue-preview.json (deleted in 050437e), pre-existing.
- Stopped at: slice 1 done, slice 2 (resolver + parity report) next in a NEW CHAT. REMINDER: commit + push.


## 2026-10-25 (Claude Desktop, home): #2 slice 2 prep, plan docs split
- Direction change: NO legacy bridge (no derived kind, no flat old-name projection); combat.js to be mostly rewritten later, guided by move-coverage-report.md. Architecture is now six files: described.json, move-attributes.js, moves-generated.js, plus new move-overrides.js, move-handler.js, move-resolver.js.
- Read-only check vs legacy moves.js: dmg equals Power for all 51 damaging moves; cd equals 0.5 x (35 / PP) except the 4 orbit/trail moves (fire-spin, leaf-storm, gust, flame-wheel). Resolver will normalize dmg = Power / E.
- Plan doc split into docs/current feature planning/move-schema/ (slice-overview.md plus slice-1..7.md) so a slice chat reads only the overview and its own file; old file is a pointer stub. No game code changed.
- Stopped at: slice 2 plan written, 3 open decisions (E rules, floor, desc) await Jess. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice 2 plan approved, code handoff written
- Jess decided: NO damage normalization in the move schema (no E, cone cap, dmg split or floor; earlier pellet-only E rule superseded). A later damage simulator (move, upgrades, enemy type and level to damage and HP drop) decides if it is needed. flavor_text passes through; 1000-move synthetic timing line wanted.
- tools/check.js: upgrade-slice2b-harness.js added to KNOWN_STALE (needs the deleted docs/move-catalogue-preview.json). check.js now 17/17 harnesses, export freshness and validator ok.
- New per-slice workflow: planning chat writes slice-n.md and slice-n-codehandoff.md, a separate coding chat builds from them. slice-2-codehandoff.md written (the three new files, parity tool, timing line, questions to confirm first).
- Nothing open for the coding chat except how to load legacy moves.js in node for the parity tool. No game code changed.
- Stopped at: slice 2 plan approved, build waits for a new coding chat. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice 2 built (resolver, overrides, handler skeleton, parity tool)
- New: js/data/move-overrides.js (fire-spin, leaf-storm, gust, flame-wheel cd), move-handler.js (6 handlers: trigger enemyHit, setWeather cast; berrySteal stub), move-resolver.js (defaults, cd = 0.5 x 35/PP to 3 decimals for Power above 0, overrides, handler attachment; G.MoveDefs eager), tools/move_parity.js (self-test 9/9, parity, timing), hooked into tools/check.js. Not loaded by the game.
- Parity: power 0 differences; cd 49 match, 14 differ (12 status moves plus Dragon Rage and Night Shade): moves-generated.js has no cd, legacy hand cds have nowhere to come from. Decision for Jess: overrides file or source JSON. Handoff counts (51 damaging, 12 status) were really 49 and 14 by the legacy dmg rule.
- Timing: 1000 synthetic moves resolve in about 16 ms; moves-generated.js projected 593 KB at 1000.
- check.js passes (17/17 harnesses, export current, 63/63 valid, parity ok). Stopped at: the 14-cd decision, then commit + push. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice 2 follow-up (defaults, cd tuning constants)
- Found by walking Spikes through the resolver: blanket grammar defaults put turnRate, aimTrack and returnHits on every move, so all 63 resolved moves broke the grammar rules. Resolver now skips those three; behavior-carrying defaults stay.
- cd formula now reads ANCHOR_CD, ANCHOR_PP, BETA from G.MoveResolver.TUNING (0.5, 35, 1), resolve() takes an optional tuning argument. New: validate_moves.js --resolved, run by check.js (63/63). Parity unchanged (14 cd gaps still await Jess).
- Stopped at: the 14-cd decision. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice 2 follow-up 2 (overrides removed, persistent-move rule)
- Jess pointed out the 4 seed overrides were legacy kind values: orbit and trail moves are on while active (pacing = rehit or emit every), Gust is now a cast that emits 3 projectiles. Overrides deleted; resolver rule: endOn notActive means no cd (fire-spin, leaf-storm, flame-wheel, bug-buzz). Gust gets the formula cd 0.5.
- move-overrides.js now has 14 empty entries (12 status moves, Dragon Rage, Night Shade) as slots for hand cds. Parity: power 0 differences, cd 19 (14 unset, 5 intended with notes). check.js passes, self-test 14/14.
- Stopped at: Jess to fill the 14 cd slots when decided. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice 3a (grammar, resolver and move data per the approved architecture)
- Grammar: persistent, delivery.delay / range / locationPick, stat defaults 6 / 6; casterState.delay retired. Resolver: persistent replaces the endOn guess, basePower, range and locationPick fills, TUNING.RANGE 420 and INSTANCE_CAP 8. 5 validator and 5 parity self-tests added.
- Data: Quick Attack out, Karate Chop fighting, Meteor Mash emit 1, Toxic Spikes interval emitter, six novas start 1 plus grow.max, Rock Slide delay on the instance, six persistent flags, Razor Leaf 210 and Bonemerang 230 range, stat chances restored (10, 10, 20). Docs: MOVE-AXIS-SCHEMA.md updated (spread is the total fan).
- check.js: harnesses 17/17, export current, 63/63 and resolved 63/63; only the old hail self-test in move_parity fails (left out of scope). Not done: deep-freeze, the review 2.4 validator rules.
- Stopped at: commit + push, then slice 3b. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice files rewritten
- slice-overview.md rewritten; new slice-3a (done record), 3b, 3c, 3d, 4a, 4b, 4c, 4d, stage-0; slice-5, 6, 7 rewritten; slice-3.md and slice-4.md are now pointers. Written from the approved architecture section G plus review section 9. Doc-only, no code.
- Source docs disagreed in places: the I1 grep guard goes in 3b (architecture said 3c); Fire Spin's trap test moves from 4a to 4c (orbit); curve, oscillate and turnRate are built in 3c and their moves verified in 4c.
- Stopped at: commit + push, then a fresh chat for slice 3b. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice 3b geometry module built
- New js/systems/move-geom.js (G.MoveGeom: segDist2, shapeOf, contains, boundsOf; tables keyed by shape family) and docs/proposals/move-geom-harness.js (23,746 checks incl. segDist2 parity with the legacy source and a boundsOf never-under-covers test). Not wired into the game.
- tools/check.js gained the I1 guard (word kind banned in js/systems/move-*.js, comments included).
- Decided: D18 apex rule; lens applied in shapeOf (not in spawnInstance); boundsOf takes maxEnemyR for linear shapes; radial with no radArc is a point. Recorded in slice-3b.md, review 9.2, architecture D18.
- check.js: 18/18 harnesses, guard ok, only the old move_parity hail self-test fails (still out of scope).
- Stopped at: commit + push, then slice 3c in a fresh chat. REMINDER: commit + push.

## 2026-10-26 (Claude Desktop, home): #2 slice 3c headless sim core built
- New js/systems/move-sim.js (G.MoveSim) and move-effects.js (damage only); harness docs/proposals/move-sim-harness.js (1,930 checks, every canary at dt 1/60 and 1/30), golden numbers from move-sim-golden.py, mutation runner move-sim-mutate.js (24/24 caught). Not wired into the game.
- Decided S1 to S10 (slice-3c.md, review 9.2, architecture D23, D36, R9, E): reach-based cast gate, aim = owner.aim, setView for offScreen, pierce in sweep order, roots act in their cast frame. Lens gap folded in: beam length scales, width never.
- Touched game-loaded status.js: fizzle takes an optional rng (default unchanged). move-geom.js: linLength takes the lens.
- check.js: 19/19 harnesses, I1 guard ok; only the old move_parity hail self-test fails. Open for 3d: props, Tackle reach feel, boss priority.
- Stopped at: commit + push, then slice 3d in a fresh chat. REMINDER: commit + push.

## 2026-10-27 (Claude Code, home): #2 slice 3d playable behind ?dev&newcombat
- Wired the move data chain and move-geom/sim/effects plus new move-route.js (G.MoveRoute: flag, the ONE routed list of 7 canaries, filter) and move-render.js (G.MoveRender: ground patches, air outlines and balls, hitbox overlay, 'move:cast' glue to Player.cast, castAt and simCd) into dev.html and NEED.
- combat.js tick skips routed slots in both loops (flag on only); game.js ticks the sim after G.Combat.tick and draws in both layers; HUD ring reads simCd with a cd fallback. Props join the sim sweep (solid spend pierce, grass never), no 'move:hit' for props.
- G.Debug.newcombat() (7 routed moves in slots, 24 sleeping dummies, overlay on) and G.Debug.hitbox(). tools/smoke-newcombat.js (Playwright from the external install) passes both pages.
- check.js: 19/19 harnesses (move-sim 1,980 checks), I1 guard ok on 5 files, only the old hail self-test fails. Mutations 29/29 caught.
- Stopped at: Jess's one-minute playtest and sign-off, then slice 4a. REMINDER: commit + push.

## 2026-10-27 (Claude Code, home): #2 slice 4a planned, 3d signed off
- Jess signed off slice 3d (one-minute playtest, Life Orb, swaps, density). He ran the backlog gh commands.
- Planned slice 4a and wrote docs/current feature planning/move-schema/slice-4a-codehandoff.md for the Opus coding chat (status PROPOSED until Jess OKs). Read-only research: no game code touched.
- Decided (Jess): Metal Claw and Meteor Mash maxStacks 2, Leaf Storm 1; trap on wild enemies is a 2 s root, bosses, elites and gym leaders cut like freeze (25%, then 10 s window); String Shot double -2 allowed. Recorded in review 9.8 and slice-4a.md.
- Found: stages.js enemy applications have no source tag, status.js speedMul is shared with the player (root must be non-player only), String Shot has no damage entry, sleeping 3d dummies block burn, paralysis and freeze, and Fire thaw (G.Status.onHit) was missing from the new path. All in the handoff.
- Stopped at: Jess reads the handoff and OKs, then a fresh coding chat builds 4a. REMINDER: commit + push the docs.

## 2026-10-27 (Claude Code, home): #2 slice 4a built (riders on hit)
- move-effects.js gained the rider appliers (ailment, flinch, stat with the D30 per-move cap, heal from dealt; crit and knockback read inside damage), one percent conversion, a hop hook and Fire thaw. String Shot hits emit 'move:hit' with dmg 0. 14 moves routed.
- status.js: trap on a non-player is a 2 s root (strong hosts 0.5 s then a 10 s window); the player's swap lock is unchanged. stages.js: optional src and per-move cap on add and teamAdd. Data: maxStacks Metal Claw 2, Meteor Mash 2, Leaf Storm 1.
- Stopped mid-build to report four enemy phases that ignore speed (leaving, jumps, boss dash and leap); Jess OKed enemy.js. Bosses are being replaced by gym leaders, so their handling is minimal.
- G.Debug.newcombat('riders') with awake dummies and a status line on the overlay. New move-riders harness (97 checks) and mutation runner (24/24); sliceC and move-sim harnesses updated; smoke test extended and all passed.
- Stopped at: Jess commits, pushes and playtests the rider set. REMINDER: commit + push.

## 2026-10-27 (Claude Code, home): 4a signed off, housekeeping
- Jess playtested 4a and committed and pushed (91b6c39). All 14 routed moves work as intended. Balance is deferred to a later pass. Only feel issue: String Shot fires both shots so fast it reads as one shot (later).
- DEVLOG.md rotated: entries before 2026-10-25 moved to docs/DEVLOG-archive.md (48 KB down to about 14 KB). STATE.md rewritten to reflect the sign-off.
- gh issue drafted for the String Shot feel issue (Jess runs it). GitHub board pull could not run from the home shell (gh not installed there).
- Stopped at: choose slice 4b or 4c next. REMINDER: commit + push STATE.md, DEVLOG.md and docs/DEVLOG-archive.md.

## 2026-10-27 (Claude Code, home, pt.2): slice 4b decisions locked, Opus handoff drafted
- Walked 8 open decisions with Jess. Substitute: 4 s shield, 12 s cd that starts when the shield is gone, player.js gains a shield. Chains are sequential (exclude only the previous enemy, x0.67 per hop compounding, riders halve, crit/type/riders per hop); Hex doubles power. Flat damage is flat. Buff stacking per Pokemon. Aqua Ring accepted.
- Hail parked as its own toggle item (no bond, select to toggle, indefinite snow); Night Shade to 4c. Both tested in 4b via synthetic harness moves.
- Docs: slice-4b.md rewritten, slice-4b-codehandoff.md written (DRAFT), architecture D13, D15, R5 and the G entry rewritten, slice-overview 4b line updated.
- Later: caster-state commitment (freeze(id,t), movement(type,t), no tick value) added to 4b and Flamethrower gets both; handoff APPROVED. Stopped at: Jess starts the coding chat. REMINDER: commit + push the docs.

## 2026-10-27 (Claude Code, home, pt.3): slice 4b built
- Built the approved 4b handoff: self-casts (stat per Pokemon, heal over time, recoil plus Substitute shield in player.js), flat damage, Hex power doubling, sequential chains with x0.67^k last, caster-state commitment (cooldown freeze, slowed, rooted). 21 routed moves; Flamethrower now slows its caster and freezes cooldowns for its cone.
- Decided with Jess mid-build (S15): chain hops take unhit enemies first, then may revisit; the strict S7 rule made a line ping-pong.
- Data via source JSON plus regenerate (hopReduction rename, maxStacks 1 on four buffs, Substitute 4 s and cd 12, commitments). move_parity hail self-test fixed.
- Tests: new move-selfcast harness (83) and mutation runner (35/35), check.js 21/21 all green, smoke all passed (one flaky resource fetch on rerun-clean).
- Stopped at: Jess playtests 4b. REMINDER: commit + push (code, data, harnesses, docs).

## 2026-10-27 (evening): slice 4c planning, no game code
- Planned 4c with Jess and split it into 4c-1 persistence, 4c-2 returns and repositions, 4c-3 delay, falls, aimTrack and the travelling moves. Wrote slice-4c-1, 4c-2 and 4c-3 codehandoff.md for the coding chat.
- Decided: Psychic stays a wedge, Bonemerang pull clamped at the caster's edge, orbit radius lens, Razor Leaf into 4c-2, centre landing point, i-frames whole dash plus 0.3 s, aimTrack sticky and now changes Flamethrower, Rock Slide low-opacity telegraph.
- Found: aimTrack, location targeting, delay and falls were never built in the sim; only grammar exists.
- Stopped at: handoffs ready for Jess's review. REMINDER: commit + push the docs (DECISIONS, slice-4c, three handoffs, STATE, DEVLOG).

## 2026-10-28 (Claude Code, home): Phase 4 docs consolidation closed (B9)
- Branch chore/documentation-authority-audit, batches B0 to B9. Rules now live in one place each (CLAUDE.md "Where current rules live"); DECISIONS.md is a log whose `Canonical:` line names the winning spec.
- B9 checks: no code touched on the branch, check.js green, no em-dashes in added text outside archive copies, cited paths resolve, ledger closed with zero unticked rows.
- The Phase 4 ledger (temp-audit-outputs/phase-4-ledger.md, all working files of the audit) last exists in commit 5274f4b. Read it with: git show 5274f4b:temp-audit-outputs/phase-4-ledger.md
- Docs and code still differ on the items in STATE.md (maxStacks default and caps, foe debuff cap, legacy Fire Spin, E1, QA-08 run loop).
- Stopped at: Jess deletes temp-audit-outputs, commits, and merges into feature-test/new-move-schema (CP7).

## 2026-10-28 (Claude Code, home): planning-doc audit and post-authority slice plan
- Audited docs/current feature planning against the new sources of truth: AUDIT-vs-sources-of-truth.md (3 HIGH, 20 MEDIUM, 11 LOW, 3 suspected). Top: Leaf Storm grammar gap blocks 4c-1, Psychic re-pick, bare Q-number collision with DECISIONS, orphaned D-IDs in 4c handoffs.
- Decided (Jess): branch merges into main after slice 7b; gym-roster move import gets a new branch; code gaps join this branch only if tied to the move work.
- Wrote move-schema-post-auth/ (overview plus 0, 4c-0 to 4c-3, 4r, stage-0, 4d, 5, 6, 7a, 7b). Found: 20 moves had no routing slice (new 4r); open decisions D-FOECAP, D-MC5, D-ENEMY, D-COOP, D-HAIL, D-LOC.
- No game code changed. Stopped at: Jess approves slice 0 doc fixes, answers D-FOECAP and D-LEAF.

## 2026-10-29 (Quick, work): slice 0, Stage 0, 4c-0 and 4c-1
- Docs: slice 0 (all four passes) applied; new CLAUDE.md rules for cross-document IDs (`file:ID`) and the move review rule; ONBOARDING module map and tools, GLOSSARY move-schema terms, BALANCE new-path cds; catch-me-up skill now reads CLAUDE.md.
- Built (game code, approved plans): Stage 0 (tools/move_report.js, move-intent-scenarios.json, move-intent harness; batch 1 of 12 moves signed off), String Shot cd 1.1, 4c-0 (maxStacks default 1, filled on self-side effects only), 4c-1 (persistent upkeep and orbits, deep-freeze of G.MoveDefs, the 2.4 validator rules). 24 of 63 moves routed.
- Decided: D-FOECAP (a), D-LEAF per-hit refresh, D-PSY one re-pick, cd rulings (Dragon Rage, Gust, Spikes intended; String Shot regression), persistent owns the slot lifecycle and endOn is instance-only (H25, notActive removed from the six persistent moves).
- Tests: every move harness and the validator passed in a sandbox copy (persist 49, intent 302, riders 103, selfcast 83, sim 1980, validator self-test 48; 16 of 16 mutations caught). check.js NOT yet run on the real tree; Playwright smoke and the skipTo(20) framerate check not run.
- Stopped at: Jess runs check.js, feel-tests riders, persist and String Shot, commits and pushes. Next: plan 4c-2.

## 2026-10-29 (Quick, work, later): Bug Buzz rulings, orphan fix, slice 4c-2 built
- Jess signed off 4c-0 and 4c-1 by feel. Fixed an orphaned persistent group (switching debug move sets left Night Shade running): upkeep ends a group whose slot is gone; newcombat() clears first.
- Decided: Bug Buzz keeps 100% Sp. Def -1 held at -1 and rehit 0.5 (balance in slice 6), stays in 4r; Quick Attack dash speed = full final speed read at dash start; a reposition waits while a dash lives.
- Built 4c-2 (approved plan): legs and per-leg pierce, returns, swept and teleport repositions, travel knockback with the pull clamp, i-frames and the shared root. 28 of 63 routed. New move-motion harness and 22-mutation runner.
- NOT run: this machine cannot run Node, so check.js, both mutation runners and the harnesses are unrun on today's code. Line endings: several docs and JS files were rewritten as CRLF; check git diff --stat for whole-file diffs.
- Stopped at: Jess runs check.js and node docs/proposals/move-motion-mutate.js, feel-tests newcombat('motion') and skipTo(20), commits and pushes. Next: 4c-3.

## 2026-10-29 (Quick, work, evening): 4c-2 green, 4c-3 planned
- Jess ran check.js, move-motion-mutate.js and move-persist-mutate.js on the 4c-2 tree: recorded all green (corrected in the next entry: the motion runner catches 20/22). 4c-2 signed off; slice-overview and slice-4c-2 results updated.
- 4c-3 handoff re-verified against today's code (aimTrack, location, delay and falls unimplemented as stated; most Flamethrower tests aim straight ahead and survive the tracking change; Confusion and Bubble Beam have no MOVE-INTENT entry, so they go through the batch review). Prose plan given; not approved.
- Raised: aimTrack should track only within the cone's reach (250 + radius), not range 420. Awaiting Jess.
- No game code changed this part; board mirror re-synced (no changes since noon).
- Stopped at: Jess commits and pushes, answers the aimTrack question, approves 4c-3.

## 2026-10-29 (Claude Code, home, night): review of Quick's 4c-2 push
- Reran everything with Node on 5f21db5: check.js green (24/24), all six move harnesses pass, validator 63/63, persist runner 17/17. Motion runner 20/22, exit 1: the evening "all green" record was wrong for it (survivors: knockback ignores travel, no 0.3 s tail).
- Docs: unblocked the four 4c-2 intent scenarios (waitsFor removed; intent now 316/316); corrected slice-4c-2 Results, slice-overview and STATE.
- Review found nothing broken. Raised: Quick Attack has no time cap (endOn returned only); a non-returning swept dash would never end; a dash or teleport can move a rooted owner (no ruling); the pull clamp's SLIDE copies enemy.js decay and the dt cap; speedOf flips mvRoot to read speed.
- Jess approved all fixes and ruled: stay put at the cap; option (a), a root holds every reposition. Built: two harness gaps closed, Quick Attack time 3, swept-needs-time rule, one-way dash ends `arrived`, root gate, G.Enemy.KNOCK_DECAY plus a SLIDE check, player unrootedSpd. Correction: no current move roots its caster (Flamethrower slows), so the root gate guards future moves only.
- Tests: check.js green, motion harness 75/75, runners 24/24 (motion), 17/17 (persist), 29/29 (sim), intent 316/316, validator self-test 50/50, smoke-newcombat all passed, one-off browser pass of motion and persist sets clean.
- Stopped at: Jess feel-tests newcombat('motion') (Quick Attack unchanged in normal play), commits. Next: aimTrack question, 4c-3.

## 2026-10-29 (Claude Code, home, late night): model plan, 4r planned
- Model plan agreed: medium effort throughout; Sonnet for plain routing, docs and catch-ups, Opus for new runtime slices, Haiku for searches (recorded in STATE).
- 4r swapped ahead of 4c-3. Re-checked all 20 resolved definitions against the sim: every axis is built. Findings: Thunder Shock is the first travelling chain (one full-power hop), Psybeam the first enemy confusion rider, Dazzling Gleam the first growing partial arc, single shots lose legacy scatter (spread ignored at count 1).
- Jess approved the whole plan, including four debug sets (arcs, novas, shots, buffs) instead of one 'rest' set. Written to slice-4r.md; overview coverage now 4r to 48, then 4c-3 to 53.
- No game code changed. Stopped at: Jess commits, a Sonnet chat builds 4r.

## 2026-10-29 (Claude Code, home, night): slice 4r built
- Routed the 20 plain moves (28 to 48). New move-plain-harness.js (1247 checks: geometry, independent damage, rider rates, knockback, Thunder Shock hop, Bug Bite stub, Bug Buzz rehit, Agility/Harden cap). 33 intent scenarios (hand-derived), debug sets arcs/novas/shots/buffs, a smoke page each.
- No sim change needed: Thunder Shock's chain and Dazzling Gleam's growing arc worked as is. Fixed two of my own expected values (beam layout aim flip, Karate Chop ratio uses the softened chart, 0.375).
- Tests: check.js 25/25, intent 562/562, smoke all passed. gym-harness failed once, not reproducible in 28 reruns (unrelated to routing).
- Stopped at: Jess commits, feel-tests the four sets, signs off the 16-move batch.

## 2026-10-29 (Claude Code, home, late night): slice 4c-3 built
- Jess answered D-AIM (aimTrack tracks only within the cone's reach) and approved the 4c-3 plan. Built: aimTrack (sticky, clamped 1.4 rad/s), location targeting (seeded uniform pick drawn after every gate), delay (whole waiting steps, 'move:land'), falls; Psychic, Confusion, Bubble Beam, Aura Sphere, Rock Slide routed (53 of 63). Render telegraph and boulder, debug sets extras and falls.
- Tests: new move-travel harness 79/79 and runner 26/26; seven intent scenarios unblocked (psychic-repick setup fixed), three added; two sim-runner mutations retargeted. check.js 26/26, intent 608/608, smoke passed (two runs had one local-server resource error each on unrelated pages, third clean). 60 fps at skipTo(20).
- Finding: Psychic scenario 5's side enemies are never inside the wedge (the apex outruns them); [Open] under MOVE-INTENT psychic.
- Stopped at: Jess feel-tests falls and extras (Flamethrower now swings), reviews the Confusion/Bubble Beam batch, commits.

## 2026-10-29 (Claude Code, home, late night): 4c-3 signed off
- Jess feel-tested newcombat('falls') and ('extras'): all work as intended, a few need balance (slice 6). Confusion and Bubble Beam added to batchReviewed. Stopped at: Jess commits and pushes.

## 2026-10-30 (Quick, work): slice 4d built and signed off
- Decided: D-GUST (one emission of 3 shots, 0.5 rad fan), D-LOC (caster's feet for Spikes, Toxic Spikes, Will-O-Wisp), Will-O-Wisp shot range 300, termination bursts on natural ends plus offScreen (not ownerDeath, notActive, cap). Spikes faint question deferred to MP (TODO).
- Built (approved plans): emit with cast, interval, casterMove, enemyHit and termination; R6 deferred children; H13 full parent power; H14; shapeless emitters as instances; contact mines; instance cap 8; notActive endOn; nine moves routed (62). Data re-exported via an emulation verified byte-identical first. New move-emit harness, move-emit-mutate (25), 10 intent scenarios, newcombat('emit'), changelog.
- Docs: MOVE-INTENT, MOVE-AXIS-SCHEMA (stale Toxic Spikes wording), combat-architecture, BALANCE, TODO, slice-4d, slice-overview.
- Tests: Jess ran check.js (green) and the emit runner (25/25); feel-tested all nine, batch signed off. Process note: the first build pass was slow (about 20 small device runs, reads done during the build); plans now carry the targeted read and per-file build map up front.
- Stopped at: Jess commits and pushes. Next: D-MC5, plan slice 5.

## 2026-10-30 (Quick, work, afternoon): stat stage model proposed
- Started on D-MC5. Found the min(floor(dur/cd), 6) formula is approved but not built (move-attributes.js defaults maxStacks 1), and on the new path Metal Claw rolls its 10% on every enemy hit, held at +1 by the cap. Several cap fixes tried and dropped (ratio equation, cap cards, cd/dur retunes).
- Decided to start from pokeapi only. Sorted every mainline stat-change move into nine shapes (5 in the pool, 4 more for later imports). Wrote docs/proposals/stat-stage-model.md [Proposed]: per (Pokemon, move, stat) trackers, pokeapi stages per climb, Gate 6.0 / Duration 6.1, refresh on success, climb on open Gate, dry window resets that move only, self-side once per cast, self drops on Gate x 2, team-wide Gate and Duration cards. Retires maxStacks, Q13, Q15/QA-11, D-FOECAP, D-LEAF, D-MC5 if approved.
- Pointers: COMBAT-RULES [Proposed] line, slice-5 and slice-overview (plan on hold), TODO Backlog (model, team-wide upgrades branch, Bond tax idea), STATE.
- No js/ touched, check.js not run (nothing to check). Board API fetch failed at wrap-up; TODO mirror not re-synced, #16 noted.
- Stopped at: Jess has more questions on the model, then the stage-manipulation moves (Haze, Psych Up and others), then rule it and re-plan slice 5.

## 2026-10-30 (home, Claude Code, night): slice 5 planned end to end
- Reviewed Quick's 5a and 5b maps against the code. 5a fixes: self drops roll on the first enemy hit (SS2), trackers in their own store beside the legacy lists (stgTeam also carries regen, crit, berries), pass 2 adds validate_moves.js, move_parity.js, move_report.js.
- Decided (Jess): pure buffs cast only while their group is active (solo = charge, then swap); swap-in waits while the Gate runs (SS8). Bond tax [Proposed]: 0.5 x Gate x chance, only for changes that help their side (Bond branch).
- Decided (Jess): 5b card list by axis (General, Space, Delivery, Payload), Cooldown Down added, Vitamins replaces the six stat cards, HP Regen bench only. 5b builds after 5a.
- Logged: New Move learning ideas (combined screen, move bank), slice 6 watch items (Leaf Storm about half power, +6 strength, weak chance drops).
- No js/ touched. Stopped at: build handoff written (slice-5-handoff.md); Jess commits, then a build chat.

## 2026-10-31 (Quick, work): slice 5a pass 1 built, stat stage trackers live on the new path
- Built: stages.js trackers (Gate 6.0, Duration 6.1, Self-drop Gate 12, per-tracker clamp, team trackers keyed by the stgTeam object so no player.js/game.js wiring); move-effects.js foe src move@caster, self rolls once per cast (each rehit step a use), pure buffs; move-sim.js buffs cast on their Gate, active group only, fizzle waits a Gate; combat.js/hud.js/feet-arc readers; debug newcombat(ids...), 'stages', 'drops'; changelog.
- Tests: new stat-stage-harness.js (incl. Leaf Storm slot-swap check) + stat-stage-mutate.js (11); riders, selfcast, persist, plain harnesses moved to trackers; 15 intent scenarios (11 edited, 4 new incl. ice-beam-climb); 4 stale mutation patterns (sim, persist, motion) retargeted.
- check.js 28/28 (one test-only fix: riders Ice Beam/String Shot lines used a fresh owner per hit); stat-stage 11/11, riders 23/23, selfcast 35/35. Jess feel-tested: stages behave as expected.
- Decided (Jess): keep SS5 all-at-once reset. Found: a "Leaf Storm drops on swap" report was the overlay's orbit tag, not the drop; own SpA/Def/SpD drops have no lasting HUD readout (backlog).
- Stopped at: pass 2 (retire maxStacks + stat duration), batch re-review of 6 drop moves, re-run of 3 mutate runners; then a new 5b build chat.

## 2026-10-31 (Quick, work, later): slice 5a pass 2 written, retired stat fields removed
- Removed maxStacks (10) and stat duration (5) from the conversions json; grammar, resolver (H24 exception) and the 4 buff cds in overrides follow. validate_moves.js rejects both fields (2 self-test cases) and lets a pure buff have no cd; move_report.js and move_parity.js updated; riders and selfcast harnesses rewritten for the retired fields.
- No gameplay change (pass 1 already ignored the fields). No changelog entry. Docs: MOVE-INTENT, COMBAT-RULES, MOVE-AXIS-SCHEMA, combat-architecture.
- Not run yet: Jess runs export_moves.js, then check.js. Next: an Aqua Ring look (Jess), then the batch re-review, then 5b.
- Aqua Ring (Jess): mainline is 1/16 per turn until it leaves the field; ruled a persistent heal aura at 1/16 every 2 s (3.125%/s, half the old rate), ending on slot swap, stun or faint, no cd. Built: shapeless self-heal persistent marker in move-sim.js, untimed heal in move-effects.js, validator heal-needs-duration, harness/scenario/mutation updates, MOVE-INTENT ruling, changelog. Not run yet: export_moves.js, check.js, selfcast-mutate.
- Closed 2026-10-31: export_moves.js, check.js and selfcast-mutate green (one test-only add: a Pokemon swap ends the Aqua Ring heal). Jess feel-tested, committed and pushed. 5a DONE. Drop re-review and mutate re-runs done (Jess). Stopped at: a new 5b build chat.

## 2026-10-31 (Quick, work, late morning): slice 5b parts A and B, team card store and readers
- Built: js/systems/team-cards.js (store, card field maps, lazy from-scratch rebuild, one copy per move id), dev.html + NEED, game.js store per run; move-sim.js (4 reads + named emit children) and move-render.js (HUD ring) read the team copy; a live persistent group restarts on a changing pick, keeping its heal clock and orb angle, no recast (no Life Orb cost). Changelog entry.
- Decided (Jess): Delay Down and Recoil Down built; Velocity Up replaces Speed Up; Count Up cap +3, Pierce Up +4; lazy rebuild per move id (D4, I2 reworded); Recoil Down keeps Substitute's shield full; Time Up placed things only; all three restart fixes. ESLint + Prettier wait for the post-7b merge (DECISIONS).
- Data: eligible Count 16, Pierce 17, Time 5, Chain 3, Delay 1, Recoil 1 (maps corrected).
- Tests: team-cards-harness (90) and team-cards-mutate (30), green in Quick's sandbox only, plus the 10 move harnesses that load move-sim. check.js NOT run on Jess's machine yet.
- Slow session: the sandbox has no node CLI, so every run was hand-bundled. Stopped at: Jess runs check.js + mutate, then a fresh chat for parts C to G.

## 2026-10-31 (Quick, work, midday): slice 5b parts C to G, team cards playable
- Built: Gate Reduction / Duration Increase on every team-caused stat change (stages.js, move-effects.js, move-sim.js fizzle wait); HP Regen (bench only) and team Vitamins plus refreshMaxHp (player.js); the team card offer (levelup.js teamFamilies) and pick flow with the Vitamins sub-pick (run-ui.js); Run Cards sheet tab (sheet.js, TeamCards.summary); newcombat('cards') and G.Debug.cards. Changelog entry.
- Decided (Jess): sheet move rows stay legacy (TODO, slice 7); Vitamins uses the Protein / Calcium rule; no bench regen text; 2-buff limit counts self-only moves (the five buffs plus Substitute; DECISIONS). My first cut (no damage anywhere) also counted Toxic, String Shot, Spikes, Toxic Spikes, Will-O-Wisp: replaced.
- Tests: team-cards-harness 147, team-cards-mutate 61; retargeted 7 stale patterns (stat-stage 3, move-sim 1, move-persist 1, move-selfcast 2). Jess ran check.js and all six mutation runners on node: green.
- Stopped at: commit + push, then the 5b full-run feel test.
- Closed 2026-10-31: Jess feel-tested 5b (full run with team cards, stages / Gate and regen-while-swapping checks), everything felt good. The verdict was given in a chat that ended before it was written down; recorded in the next session. 5b DONE. Next: slice 6 tuning.

## 2026-10-31 (Quick, work, afternoon): slice 6 rescoped, movechecker, batches 1 and 2
- Decided (Jess): slice 6 is now projectile spacing and nova sizing; the simulator and balance pass move to playtest branches (DECISIONS). A formula DPS table is kept as reference (move-dps-table.md).
- Built: G.Debug.movechecker (up to 6 moves, one pinned dummy, range rings to 600 px, move data in the console). Batch 1: String Shot and Bubble Beam fire one after another on a line (emitter form), Bubble Beam wobble 10 px / 1.5 Hz, Tackle 54, Toxic Spikes one burst on termination, Gust cd 0.7, Discharge 110 px; Count Up / Reach Up follow the emitter shape (D-CARDS).
- Batch 2: new path.loop (combat-architecture D38, centred on the drifting base point); Fairy Wind loop-de-loops, radius 70, 0.6667 Hz, 90 px/s, 3 s. Retuned once after the feel test (first build hung the loop off the caster and ran at 694 px/s).
- Tests: new debug-movechecker harness and mutate; retargeted move-sim, team-cards, stat-stage, move-riders, move-intent (new gaps check), move-travel, move-emit; new scenarios for every ruling. Jess ran check.js and the mutation runners on node: green. Feel test: good.
- Stopped at: commit + push. Next: batch 3 (Quick Attack is nauseating, Aerial Ace needs a rework; causes still to pin down).

## 2026-10-31 (Quick, work, late afternoon): slice 7a decisions, gyms only, 7a-0 commit A built
- Decided (Jess): slice 6 closed at batch 2; D-ENEMY (a) with roster-set boss numbers, Brock slot 1 only; D-COOP no co-op work; boss AI split option B (shared body plus brain); gyms only (rifts, legendary fights and the Judgment removed), D1 gacha legendaries stay, D2 future legendary designs stay as scope, D3 smaller Master Ball supply accepted.
- Built commit A: judgment.js deleted; rift.js replaced by js/systems/gym-arena.js (G.GymArena, gym half only); old boss AI (slam, dash, leap, rain, beam, volley, nova, fury) out of enemy.js, gym leaders keep their path; rift, legendary and minute-30 achievements, the weekly rift mission, the HUD rift labels, drops, music and sounds removed; old save fields kept. Changelog entry added.
- Tests: new gyms-only harness (30 checks) and mutate runner (6/6); gym, gym-reward, status D2 and move-riders harnesses updated; move-riders mutate lost its boss-dash mutant (22/22). Quick sandbox: 29/30 harnesses (items-f3d2, move-geom need node). Not run on node yet.
- Stopped at: Jess runs check.js and the two mutate runners on node, feel-tests Brock, commits A. Next: commit B (GymBrain split).

## 2026-10-31 (Claude Code, home, evening): 7a-0 commit B built, GymBrain split
- Built: js/entities/boss-ai.js (G.Boss). G.Boss.make is the only boss spawn (gym-arena.js uses it); the GymBrain holds the old constructor gym block, the eleven boss methods and the old e.ai state. enemy.js keeps the body and delegates (update -> brain.step, applyFlinch -> brain.flinch). dev.html and main.js NEED updated. No behavior change.
- Proof: a one-off seeded trace (all six Brock slots at levels 12 and 36, 90 s each, moving, flinched and hit on a schedule) matched the pre-split code line for line (45,201 lines).
- Tests: new boss-split harness (24 checks) and mutate (6/6); gym, gym-reward, gyms-only and status D2 harnesses moved to the brain. check.js 32/32 and move data green; gyms-only and move-riders mutate green. Headless Brock fight on ?dev and ?dev&newcombat: brain, every move cast, live flinch, win to the badge cards, no errors.
- Stale tool checks (already failing in HEAD) updated to the Quick rulings: move_parity Gust selftest now expects the hand-set cd 0.7; smoke-newcombat Aqua Ring expects the aura (1/16 max HP every 2 s, two ticks in about 4 s). Smoke all passed.
- Feel test: good (Jess). Stopped at: Jess commits B. Next: the docs sweep, then the 7a slot-1 enemy-owner plan.

## 2026-10-31 (Claude Code, home, night): 7a slot-1 enemy owner, Brock plays like the player
- Decided (Jess): D-ENEMY amendment: gym leader mons play like the player (cards per mon, autocast through G.MoveSim, player size, tells with locked aim, damage-only riders, contact fixed to Tackle, Tier 1 AI now, Tier 2 own branch); Harden has no tell; Brock on the new path on both flags; folded Power; weight and range dropped; Geodude cards Damage 3, Count 2, Velocity 3, Area 2.
- Built: GymBrain rewrite (boss-ai.js), G.MoveSim.castAt and enemy-owner collision, hits on the player in move-effects.js, sim stepped and drawn on both flags, gym mons at scale 1, gyms.js cards and formOf (melee limited to radial cones, since beams look alike), changelog. Docs: BOSS-REWORK 3d/3c, BOSS-AUTHORING, BALANCE, COMBAT-RULES SS13, combat-architecture.
- Tests: new boss-owner harness (89) and mutate (29/29); six harnesses and three mutate runners updated; check.js 33/33; headless Brock fight green on both flags. Six older mutation patterns fail only on this CRLF checkout (TODO).
- Feel test: good (Jess); committed as bc24717. Next: the 7a UI readers.

## 2026-10-31 (Claude Code, home, late night): 7a UI readers off `kind`
- Decided (Jess): 1c generated card text, 2a badges from the def, 3a player.js readers migrated with a parity table, 4a flag-on sheet rows on the folded def.
- Built: js/ui/move-info.js (G.MoveInfo); icons, menu, test, levelup, game, hud, stats, player, sheet migrated; combat.js orbit charge passes the id; tools/kind-guard.js wired into check.js; legacy-7b tags on db/debug (D-BUBBLE), sheet flag-off rows, the Bubble fallback, co-op sync; changelog.
- Play changes vs legacy kind (melee cut, ranged targeting, Life Orb, Substitute buff) and 14 badge changes: slice-7a.md Results.
- Tests: ui-readers harness 119 + mutate 20/20; team-cards harness and mutate updated; tools/smoke-ui.js new, all passed on both flags; check.js 34/34; smoke-newcombat all passed.
- Stopped at: Jess feel-tests, then commits. Next: a run to Brock (7a Proceed when), then the docs sweep.

## 2026-10-31 (Claude Code, home, late night): 7a closed, docs sweep
- Feel test of the UI readers passed and a run reached Brock (Jess): 7a Proceed when met. UI readers committed as e6465d4.
- Docs sweep: GDD (rifts and Judgment removed, gym gate row, 7.4 legacy-card note and G.MoveInfo, Master Ball line), GLOSSARY (rift, 7a terms), ONBOARDING (gym-arena.js, team-cards.js, move-info.js, sheet.js, smoke-ui.js, kind-guard.js; rift.js and judgment.js gone), README (gym gates, link, tickets, no move evolutions), GYM-ROSTERS (cards, not stacks), SIM-PRESENT-BOUNDARY (GymBrain and gym-arena offenders), TODO (rift region bug closed).
- Stopped at: Jess commits the sweep. Next: board cleanup, then the 7b plan.

## 2026-11-01 (Claude Code, home): D-HAIL, D-BUBBLE, 7b-1 flip
- Board cleaned (Jess): #15 closed; In progress #1, #6, #17 (#17 is meant to wait for the post-7b merge). Slice 6 stress run was done (Quick did not log it).
- Decided: D-BUBBLE (Bubble retired, starters 393 and 728 open with Water Gun), D-HAIL (c): Hail out of the pool until its toggle exists, old saves get Water Gun.
- 7b split in three (flip, purge, merge). 7b-1 built: new path always on, team cards only, G.Moves.RETIRED, save shortcuts and vetoes cleaned. Details: slice-7b.md Results.
- Tests: check.js 34/34, smoke-ui and smoke-newcombat pass (three tests updated for the flip).
- Stopped at: Jess feel-tests 7b-1 (run to Brock, stress run), then commits. Next: 7b-2 purge.

## 2026-11-01 (Claude Code, home, later): 7b-2a purge
- 7b-1 feel test and stress run passed (Jess); committed 8b7cbb7. 7b-2 split into 2a (engine purge) and 2b (stage stacking, ROUTED, guard), addendum approved.
- Built 2a: legacy player-move code gone from combat.js and projectile.js; kinds.js and mechanics.js deleted; moves.js slim on G.MoveDefs; choose screen and "+N" badges removed; about 2,900 lines out.
- Broke and fixed: main.js NEED still listed Kinds and Mechanics (boot halted); swap lock lived in G.Combat.tick, moved to game.js.
- Tests: legacy table archived for the tools; 6 legacy harnesses retired, 5 trimmed to engine checks; check.js 30/30, smokes and mutations pass.
- Stopped at: Jess feel-tests 2a, then commits. Next: 7b-2b.

## 2026-11-01 (Claude Code, home, evening): 7b-2b
- 7b-2a feel test passed (Jess); committed 496118a.
- Built 2b: ROUTED replaced by "has a def, not retired"; legacy stage stacking (procMove, procSelf, teamAdd, TEAM_LIVE, ROLL_GAP, strip), enemy ailRoll and the norm factor removed; guard final (no exempt game file).
- Verified: E1 gone (Fire Spin and trap-mine scenarios trap enemies), Brock-only, damage unchanged (no caller passed norm).
- Docs: the 7b [Legacy behavior] lines are dated history notes now. Tests: check.js 30/30, smokes pass.
- Stopped at: Jess feel-tests 2b, then commits. Next: 7b-3 (docs sweep, changelog, merge into main).
- Later: Jess hit a freeze entering the gym with Fire Spin. Cause: the orbit swept across the arena teleport and the prop query generated every chunk on the line (predates 7b, exposed by the flip). Fixed in move-sim.js (a >1,000 px step sweeps nothing); harness and mutation added.

## 2026-11-01 (Claude Code, home): session close
- Jess confirmed the gym freeze fix in play. Committed and pushed: be9b512 (7b-2b), 47f3dd5 (freeze fix).
- 7b-3 handoff written as a numbered work list in slice-7b.md "Steps" (docs sweep counts per file, optional log.js cleanup, DECISIONS line, merge order).
- Stopped at: 7b-3 not started. Next chat: 7b-3, then the merge into main.

## 2026-11-01 (Claude Code, home, night): 7b-3 and the merge
- Docs sweep: stale legacy-path and flag mentions out of 12 files (GDD 7.4 rewritten for team cards; ONBOARDING module map; GLOSSARY; slice-5 [Legacy behavior] lines to History). TODO sheet-numbers item was already built in 7a.
- Decided (Jess): skip the log.js hitOut cleanup; tools/ is free edit (CLAUDE.md). DECISIONS line for the flip added. Smoke tools load plain ?dev; smoke-ui runs one pass.
- Merge: origin/main (issue templates) into the branch, check.js and both smokes green; then the branch into main with --no-ff (f9a2f2c); check.js green on main.
- Snag: Git Bash sed -i stripped CRLF from combat-architecture.md; restored. Use node for in-place edits.
- Stopped at: merged, main pushed. Next: feel run on main, unblock #17, pick gym-roster or lint branch.

## 2026-11-01 (Claude Code, home): #17 ESLint + Prettier setup
- Added eslint.config.js, .prettierrc.json/.prettierignore, .gitattributes, .editorconfig, npm scripts (lint, format, format:check), and a warn-only lint step in tools/check.js.
- First lint run: 5 errors, 69 warnings. Real finds: js/ui/move-info.js:100 calls an undefined legacy() (leftover from 7b; throws if a def is missing); 4 duplicate keys in lang-en.js (inherited).
- Prettier not yet run: 106 files differ, so the format is its own commit next. Stopped before any git.

## 2026-11-01 (Claude Code, home): #17 follow-ups
- Fixed js/ui/move-info.js desc(): the undefined legacy() fallback is gone (unknown id returns ''); ui-readers harness gained a case (117 checks).
- check.js now also prints Prettier drift (report only). Added tools/git-hooks/pre-commit (format gate); Jess installs it with `git config core.hooksPath tools/git-hooks`.

## 2026-11-01 (Claude Code, home): #1 gym gate art
- js/systems/gym-arena.js: the gate draws assets/tileset/gyms/gym-<arena>.png (loaded on gate open, half scale), type-colored open ring, soft ground shadow; purple ellipse and sparkles gone; spawn clearance radius 22 to 60. Removed the old purple gate painter from js/world/tiles.js.
- Fixed on the way: harnesses run without Image, so artFor() returns an empty entry there. Verified: check.js 30/30, smoke-ui and smoke-newcombat pass, headless screenshot of the Brock gate. HUD gate colors left for later (TODO).
- Follow-up: the oval shadow became a north-east silhouette of the building (offset 10,-8, alpha 0.35). Contact and spawn clearance now use Jess's painted mask assets/tileset/gyms/gym-contact.png (whole building minus the roof strip; fallback is that rectangle). Verified: check.js 30/30, headless probe of side, roof, corner, back entry and a clear footprint.

## 2026-11-01 (Claude Code, home): gym contact mask on file://
- Bug: opening dev.html from file:// threw "The operation is insecure" (gym-arena.js:77); Firefox blocks reading canvas pixels of a file:// image, so the painted mask never loaded (rectangle fallback). Smokes run over http, so they missed it.
- Fix: tools/gym_contact.js bakes gym-contact.png into js/data/gym-contact.js (G.GymContact, row runs, 1.8 KB); gym-arena.js reads that, no runtime pixel reads. dev.html loads it after gyms.js (not in NEED: the rectangle fallback stays). check.js fails if the data is stale vs the PNG.
- Verified: check.js 30/30 plus the mask check; headless file:// load clean of gym errors; baked mask equals the browser pixel read (0 of 71424 pixels differ).

## 2026-11-01 (Claude Code, home): Kanto gyms 2 to 8
- js/data/gyms.js: Misty to Giovanni authored (locked rosters, Gen-1 order, provisional catalog move sets, badge boosts); Brock slots reordered (Onix to slot 2). Decisions: Jess approved the boosts; Surge keeps Normal/Steel stand-ins, boss casts and riders come next.
- Found: the brain only lands its longest-reach melee, so each slot carries one melee cone (21 sets trimmed; rule in BOSS-AUTHORING). Harness gym-harness 10b casts every authored move of gyms 2 to 8.
- Found (not fixed, TODO): item choice soft-lock when two items arrive with the replace screen open.
- Verified: check.js 30/30, smoke-ui and smoke-newcombat pass (one boot flake on the first newcombat run), headless probe walks all 8 gyms in order with no page errors (badge boosts stack: Atk and SpA +20%).

## 2026-11-01 (Claude Code, home): soft-lock, gym forms, utility picker
- Item choice soft-lock fixed (js/game.js offerItem: a second item queues while an item choice is open; queue reset at run start). Headless probe failed with the guard removed, passed with it.
- Gym forms: chain hops and homing search the caster's foes (co-op ready), nova, strike (Thunderbolt) and homing forms; Dazzling Gleam lands now. Decided (Jess): flinch on the player restarts the active group's cooldowns plus a 0.3 s hold and the boss recoil; crits on for leaders.
- Found in a headless fight: the fixed form order starved later moves. Jess chose a utility AI for move picks (movement stays a state machine; movement scoring is Gym AI Tier 2). Built: freshness x fit, POINT_BLANK 0.5; every move in the starvation sets now casts.
- Found (TODO (e)): a leader's Psychic never lands (420 px cast gate, about 166 px flight). Next: riders onto the player.
- Verified: check.js 30/30, boss-owner 131 checks, mutations 40/40, smokes pass (one flake each).

## 2026-11-01 (Claude Code, home): riders onto the player
- Gym leader hits now land their whole payload on the player (js/systems/move-effects.js hitPlayer): ailments through G.Status, foe drops on your own tracker (strong-host Gate), Hex x2 vs a major, crits by the D10 rule (only Psycho Cut today), the leader's Metal Claw raise and Giga Drain heal (new brain heal in boss-ai.js).
- Flinch on the player: G.MoveSim.flinch restarts the active group's cooldowns + 0.3 s; Player.applyFlinch recoils (back half the body at 2x, then still 0.2 to 0.3 s), 0.5 s roll gap per move, none while asleep or frozen. COMBAT-RULES rules added.
- Picker: score x opportunity (Hex 1.5, blocked ailment 0.75, absent drop 1.25; BOSS-AUTHORING THE PICK).
- Verified: check.js 30/30, boss-owner harness 164 checks, mutations 54/54, smoke-ui pass; smoke-newcombat every functional check ok on 3 runs, but each run had one "failed to load resource" console error on a different page (local server flake).
- Surge's real Electric sets (js/data/gyms.js): Thunder Shock on every Electric mon, each keeps its Normal/Steel melee for contact, Thunderbolt on Raichu below 50% HP, Jolteon drops Poison Sting. gym-harness 10b: Surge 18/18 moves cast.
- Next: Psychic reach (separate slice), then tune gyms 2 to 8.

## 2026-11-01 (Claude Code, home): shot reach from flight
- Jess feel-tested riders and Surge: good for now.
- G.Gyms.reachOf: a shot reaches speed x lifetime + size, capped at its range (default 420); homing gets no turn credit (Jess). Shadow Ball 345, Rock Throw 373, Psychic 166, Thunder Shock and Confusion 420.
- boss-ai.js far mode: the 170 to 300 band shrinks to the longest ready shot or strike's reach minus 20 (inner edge 40 inside), so a Psychic user walks in and lands it (Jess: "move to use it").
- Verified: check.js 30/30, boss-owner harness 175 (new section 15; section 14 Psychic sets now scored at 150 px), mutations 58/58 (4 new, 1 stale re-pointed), smoke-ui pass. smoke-newcombat skipped from now on by Jess (flaky, slow; TODO Backlog).
- Jess feel-tested: feels good. feature/shot-reach fast-forwarded into feature/gym-roster.
- Next: tune gyms 2 to 8.

## 2026-11-01 (Claude Code, home): Kanto move imports and the Move Lab
- docs/KANTO-BOSS-MOVE-IMPORTS.md: 219 distinct moves in the Kanto lore sets, 42 in the catalog, 177 to import (goal: import for the player, then translate to bosses). Decisions needed: 7 whole-field, 38 unique (about 24 rulings), 18 pattern rulings, about 114 map straight.
- Hail: still parked (D-HAIL, toggle skill item); its follow-up issue may not be filed.
- tools/move-lab.html: dev page that loads the real move scripts; pick a move, stack cards, see base vs effective fields, leader form and reach; build a 4-move slot and copy its moves / cards block for gyms.js. Then: Load gym (leader, loop, level via G.Gyms.lineup) shows every mon of that loop as a 4-move row with its own cards. Then: Load gym (leader, loop, level via G.Gyms.lineup) shows every mon of that loop as a 4-move row with its own cards. Headless load: 62 moves, no page errors; check.js 30/30.
- smoke-newcombat skipped from the routine (Jess) until its flake is fixed.
- Jess: feature/gym-roster done (rosters in); fast-forward to main. Gym cards after playtester feedback.

## 2026-11-01 (Claude Code, home): playtest fixes part 1 (Jeremy's notes), branch fix/playtest-kanto-moves
- Speed transfer bounds 0.5/3.0 -> 0.7/1.3 (Jess's pick over the proposed 0.5/2.0); Spe 130+ now saturates at 139 px/s, k left at 1.0 (BALANCE).
- Bond is the team's: the count rides takeField on swap (was stranded on the mon active at the gym win). The bond screen opens with a Pokemon step (team keys 1-6, ineligible dimmed, skipped when only one can bond); the field does not swap.
- Economy doc (docs/Economy Balance Ideas.md) open questions: run-wide upgrades bought on several mons stacking (Gold Gain x4), run-wide rank III costing 30 of a mon's 40 points, the 371,700-gold curve per mon or once, unbuilt stats (dodge, Status Chance), Starting Moves III vs Repertoire, save migration of the old upgrade levels. Needs coins-per-run data first.
- Bomb: kills wild enemies in view outright (bosses, gym leaders, elites keep the old damage), then a 3 s spawn quiet (G.Spawner.quiet). CONTRIBUTING asks for coins per run.
- Verified: check.js 30/30, smoke-ui pass, headless: speed px, bond pick on a benched mon, bond carried on swap, bomb 26 -> 0 with no spawns for 3 s. smoke-newcombat skipped.
- Jess feel-tested: bonds work, bombs work, speed feels better. Next: the Kanto import rulings.
- Kanto import rulings, 4 sets with Jess: accuracy/evasion as miss chance, HP-curve power, Counter stance, real-faint Explosion; real-time turn conditions, sleep-only Dream Eater, U-turn clears the swap lock, wild-only Fissure; mainline odd stats (weight joins the dex), Protect block, Rest without sleep, status analogs (Skill Swap out); priority ignored, two-turn delay, rampage lock, team-side fields. 64 new MOVE-INTENT entries (plus a line on quick-attack), 4 DECISIONS entries. Still open: Psych Up, Swagger, Baton Pass.


## 2026-11-01 (Claude Code, home): Team menu rework
- Slow list: every menu sprite drew once before IntersectionObserver reported, so opening Team fetched ~946 sheets; ui.js now draws only canvases reported in view (rootMargin 160px). ~45 requests on open.
- Slots: Free Slot N under Put in the detail column, for the highlighted slot, always shown (greyed on the lead and empty slots; Jess moved it there after the first feel test); drag a team card onto the list to free it. Drag list->slot and slot<->slot already worked.
- Upgrades: main menu entry removed; an Upgrade button on the Team detail stage (first a +) opens it on that Pokemon, Back returns to Team keeping the draft. smoke-ui now opens Upgrades that way.
- Menu sprites centre on their visible Idle pixels (G.Sprites.idleBox, scanned once per dex/variant/row); hero views fit by that box. World sprites unchanged.
- Feel test 1 fix: on file:// the pixel scan threw a SecurityError inside the sprite loop, so no menu sprite drew; the scan is now caught and falls back to the old placement (centring works only over http until a precomputed table exists). The + sits a little lower.
- Verified: check.js 30/30, smoke-ui pass, headless over file:// and http, 1600x900 and 1280x720.
- The + became an Upgrade button (Jess). Session closed: part 1, rulings and Team menu all committed on fix/playtest-kanto-moves.

## 2026-11-01 (Claude Code, home): Kanto import batch 1
- Team menu feel test passed (Jess). Batch 1 planned and built: 110 moves from pokeapi plus a pattern each (tools/kanto_batch1.js), held out of player pools (G.Moves.HELD) until learnset pools. Held back: Mud-Slap, Mirror Shot, Hone Claws, Throat Chop.
- Jess: all-foe moves split between ring and Mud Shot burst; review page with override slots (tools/kanto-batch1-review.html, export to docs/move_rework_holding/kanto-batch1-overrides.json); hold list, quick-repeat multi-hit and the simplifications agreed.
- Runtime: sleep allowed in the grammar; recoil on hit from damage dealt (move-effects.js); status cooldowns proposed in move-overrides.js. Harness pins on 63 moves scoped to the pre-Kanto moves; 110 blocked placeholder scenarios.
- Verified: validators 173/173, check.js 30/30, smoke-ui pass, review page and live casts headless on file:// (sleep, paralysis, poison, trap, confusion land; recoil and drain and Recover heal work; no errors).
- Hail toggle: unscheduled since D-HAIL; now a TODO fields slice with the weather moves. Stopped at: waiting on Jess's shape review.

## 2026-11-02, Kanto batch 1 shape rules (Claude Code, home)
- Jess set five shape rules for the imports (melee trade-off vs Tackle, type looks for shots, ring vs burst, mine vs trail, uniques). tools/kanto_batch1.js now derives shapes from them; review rows name the rule.
- Applied and exported (173 moves). New shapes: Shock Wave homing, powder clouds, Sand Tomb patch, Draco Meteor three falls; Blizzard and Twister are bursts.
- Verified: check.js 30/30, validators 173/173, smoke-ui pass, 18 reshaped moves cast and hit live on file://, no page errors.
- Open: Sand Tomb cd resolves to 1.17 s while a patch lasts 2.5 s (patches overlap); needs a cd ruling.

## 2026-11-02, Waves (Claude Code, home)
- Built: a line can grow its width (grammar, move-geom); the lens, Area and Presence follow a line's long and short side. Surf, Sludge Wave and Heat Wave are widening bands at the nearest foe; wave badge reuses nova.
- Tests moved off Heat Wave as the example ring (Hyper Voice, Bulldoze); new hand-derived wave checks in move-sim and team-cards; scenario heat-wave-wave replaces heat-wave-grow.
- Verified: check.js 30/30, validators, smoke-ui pass, the three waves and Hyper Voice cast and hit live on file://.
