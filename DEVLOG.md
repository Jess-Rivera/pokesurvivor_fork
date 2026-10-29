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
- Jess ran check.js, move-motion-mutate.js and move-persist-mutate.js on the 4c-2 tree: all green. 4c-2 signed off; slice-overview and slice-4c-2 results updated.
- 4c-3 handoff re-verified against today's code (aimTrack, location, delay and falls unimplemented as stated; most Flamethrower tests aim straight ahead and survive the tracking change; Confusion and Bubble Beam have no MOVE-INTENT entry, so they go through the batch review). Prose plan given; not approved.
- Raised: aimTrack should track only within the cone's reach (250 + radius), not range 420. Awaiting Jess.
- No game code changed this part; board mirror re-synced (no changes since noon).
- Stopped at: Jess commits and pushes, answers the aimTrack question, approves 4c-3.
