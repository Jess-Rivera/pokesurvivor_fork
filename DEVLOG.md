# DEVLOG

Log of each working session. Append new entries at the END (the file is no longer reverse-chronological).
Keep each entry to about 6 lines: what changed, what was decided, what broke, where we stopped. Details go in DECISIONS or the harness.
Older entries were rotated to docs/DEVLOG-archive.md (latest rotation 2026-11-09). Rotate again when this file passes about 40 KB.

---

## 2026-11-05, gym cards become the leader's pool (Claude Desktop)
- Changed: gym `cards` moved from the roster slot to the gym, keyed by loop, holding the cards GAINED that loop; the pool for loop N is the running sum (G.Gyms.cardsFor) and every mon the gym fields holds it (gyms.js, gym.js makeDef). Brock's loop 1 pool is the old Geodude cards, so loop 1 is unchanged; loop 2 on he gains nothing yet (TUNE). Validator: loop key 1 to 6, whole stacks, running total within the cap, each card fits a move fielded the loop it is gained. BOSS-AUTHORING Cards section and move-lab text updated.
- Decided (Jess): authored schedule, not mirroring the player; the number per loop is a TUNE value (a player holds about 60 upgrades by Brock loop 2). Also made docs/ASCII Concept Maps/Kanto Gyms 2-8 - Mons and Moves.txt (generated sheet of every gym 2 to 8 mon and move).
- Tests: gym-harness (new 8b pool checks, 4 new negative cases), boss-owner-harness 247 (pool and cap-across-loops checks), check.js green; boss-owner-mutate 55/60 caught, 0 missed, 5 STALE patterns that were already stale at HEAD (melee tell, chain form, nova order, strike spot x2).
- Stopped at: card numbers per gym not authored yet; Misty loop 1 is first.

## 2026-11-05, host model: docs and audit (Claude Desktop)
- Changed: step 0 and step 1 of Jess's host model. COMBAT-RULES "Host model" (strong hosts follow all player rules; weak hosts follow wild rules; legacy note on "strong host" meaning), two DECISIONS entries, a GLOSSARY row (not the co-op host), TODO item. New docs/proposals/host-model-audit.md (16-row gap table, five findings, architecture options A to C, restriction sketch, slice order, open decisions) and host-model-handoff.md for an Opus planning chat. No game code changed.
- Decided (Jess): leaders swap as a team like the player; elites are weak hosts with added rules; tells stay for now.
- Found: Player reads input in two places only; the team and swap layer lives in G.Game; status.js strong() is true for boss, elite and gym and false for the player (the opposite of the new model); the arena fields slot 0 only, so slice B changes shape.
- Stopped at: Jess to commit this branch and open the Opus chat; gym cards for gyms 3 to 8 wait on its plan.

## 2026-11-05, entity model plan and slice 1 (Claude Code)
- Decided (Jess): `PlayerEntity` and `WildEntity` bases with sub-entities, reusable modules, one hit contract; each family owns its attack and defense calculations; Elites do not change. Plan: docs/proposals/host-model-plan.md, 12 slices. Merged the gym branch to main; work moved to feature/entity-model.
- Changed: slice 1, structure only. enemy.js class is `G.WildEntity` (`G.Enemy` still names it); new js/entities/elite.js holds only the Elite mods; status.js and move-effects.js read named rules. Elite-class harness 67 checks, mutation runner 34/34. Fixtures in elites, status-sliceC, move-riders and boss-owner harnesses use the new class or rules, expectations unchanged.
- Verified: check.js 43/43, smoke-ui, and a real Elite fought over file://.
- Left on purpose: `e.elite` classification checks outside the class, including the two in the manager (bosses stat, no relocating).
- Then planned slice 2 (Team module), detail in the plan. Found: no test covers real swapping, so a file:// smoke test comes first, on the current code.
- Stopped at: slice 1 committed; slice 2 plan awaits Jess's OK, no slice 2 code written. Slice 1 feel test not confirmed.

## 2026-11-06, slice 2 review and smoke test (Quick)
- Reviewed slice 2 as an ASCII map (docs/ASCII Concept Maps/Entity Model Slice 2 - Team Module.txt). Slice 2 approved.
- Decided (Jess): D1, the unspent-link count `pl.bonds` becomes a shared Team store (bond groups stay per-mon slot data); D2, Team takes only the 5 s team swap lock, `pl.swapT` is the "slot hold".
- Changed: new tools/smoke-team.js (step 1: swap, lock, faint order, links, bench poison, Re-Do, wipe over file://). No game code.
- Not verified: Quick cannot run node here and the work machine has no Playwright, so the smoke has never run. GitHub API empty again; board mirror still 2026-11-04.
- Stopped at: run check.js and smoke-team.js at home on the current code, then build team.js.

## 2026-11-06, slice 2 built (Quick)
- Playwright installed on the work machine; smoke scripts now also find <user folder>\tools\playwright. smoke-team passed 34/34 on the pre-slice code.
- Changed: new js/systems/team.js (`G.Team`); game.js uses it (`runTeam`, `carryRun`, `field`); player.js `bonds` reads the Team count; dev.html and NEED; team-harness.js and team-mutate.js (46 mutations). No changelog entry: nothing a player sees changes.
- Found: Chromium blocks the Silver font over file:// (CORS); the smoke reports it as a note. May affect real play in Chrome.
- Stopped at: Jess to run check.js, smoke-team, team-mutate and smoke-ui on the new code, then the feel test.

## 2026-11-06, slice 3 planned and built (Quick)
- Slice 2 came back green (check.js, smoke-team, team-mutate, smoke-ui).
- Decided (Jess): slice 3 D1 one file, D2 `isPlayer` means "follows Player entity rules" (all 13 sites already do), D3 berry guards stay a Player-entity rule, D4 the in-play slot keys go through the controller now.
- Changed: player.js split into `G.PlayerEntity` and `G.HumanPlayer` (`G.Player` names the human); game.js swap keys, Shake off and slot keys ask `pl.controller`; NEED; player-entity-harness.js and player-entity-mutate.js (35). No changelog: nothing a player sees changes.
- Broke: first run failed 6 move harnesses and smoke-newcombat. The new aim method `foes()` collided with G.MoveSim's enemy-owner mark (slice 7a: a caster with foes() is a gym leader's mon), so your moves aimed at you. Renamed `aimTargets()`, added a harness check and a mutation.
- Stopped at: Jess to run the checks, the mutation runner and the three smokes, then the feel test.
- Re-run green: check.js 45/45, player-entity-mutate 35/35, smoke-newcombat all passed, smoke-team and smoke-ui re-run. Quick feel test OK (no gym). Committed slices 2 and 3 together.

## 2026-11-06, slice 4 planned (Quick)
- Decided (Jess): slice 4 splits into 4a (neutral hit contract) and 4b (balance): STAB everywhere at the mainline spot, wild STAB with ENEMY_POWER 40 to 27, the 0.5 scale is the human's, side effects picked by the target, flat damage stays flat, mainline type chart both ways with true x0 immunity (no boss exception, fixed-damage moves check immunity only). Lifts QA-12.
- Changed: COMBAT-RULES "Damage" and "Type chart" ([Approved], code differs until 4b), a DECISIONS entry, the slice 4 map.
- Found: leader STAB is folded before the +2 (about 0.5 HP low); wild contact and shots use the enemy's first type; every starter opens with a Grass, Fire or Water move, so no new team is fully walled by immunity.
- Stopped at: build 4a, parity harness first.

## 2026-11-06, slice 4a built (Quick)
- hit-parity-harness passed 100/100 on the pre-4a code (after a fixture fix: the test Substitute lacked overflow, the expected numbers did not move).
- Changed: PlayerEntity.takeHit and takeDot, dmgTakenScale (base 1.0, human 0.5); move-effects blowOf, hurtPlayer via takeHit, applyHit routed by target; combat.js and hazards.js via takeHit; WildEntity takeDot; status.js prefers takeDot; stats.js applyDamage and applyPlayerDefense take STAB and the scale. No numbers change.
- Deviations: wild defense stays in move-effects (move-sim-harness fakes); boss-ai.js untouched. Test edits: parity sections 7 and 8, player-entity pinned list (+dmgTakenScale), boss-owner and gym-harness fixtures, 4 moved mutation patterns. New hit-parity-mutate.js (31).
- Ran: everything green except player-entity-harness's isPlayer count in move-effects.js (2; 4a's target routing is a 3rd by design). Count 2 -> 3, plus a check that the 3rd is the routing.
- Stopped at: rerun player-entity-harness, feel test, commit 4a.

## 2026-11-06, slice 4b built (Quick)
- 4a committed (one stale count fixed: 3 isPlayer sites in move-effects by design).
- Decided (Jess): D-T, test dummies are typeless (harnesses and the debug test page) so true x0 does not wall the test sets.
- Changed: mainline type chart with true x0 (types.js, move-effects gate, player.js, status.js Immune note), STAB everywhere (boss-ai stabFor, combat.js and hazards.js), ENEMY_POWER 27, debug dummies typeless, changelog 2026-11-06. Deliberate test edits listed in the slice 4 map "4b AS BUILT". New type-chart-harness.js and type-chart-mutate.js.
- Stopped at: Jess to run the checks, both mutation runners and the smokes, then a balance feel test.

## 2026-11-06, end of day (Quick)
- Wrapped with slice 4b built and committed but NEVER RUN: check.js, both new mutation runners and the smokes were not run on 4b. STATE.md "START HERE" lists the exact first steps.
- Board mirror not re-synced: the GitHub API returned empty all day (mirror still 2026-11-04).
- Next: verify 4b and its balance feel test, then plan slice 5 (GymLeader, Misty first).

## 2026-11-06, night (Claude Code, home)
- 4b: checks green once real; Jess's feel test passed. Two http smokes fail intermittently on a Windows socket limit (ERR_NO_BUFFER_SPACE), not the game.
- Decided (Jess): slice 5 D1 to D6 as recommended (one flat damage entry, Misty hpMult 26, restrictions start with tells and healLimit, cushion and player flinch off for leaders until slice 8, boss look kept).
- Built slice 5: G.GymLeader on PlayerEntity, shared GymBrain, leader status set, no touch damage, Misty switched on. New smoke-gym, gym-leader harness (140) and mutate (51).
- Repaired 30 stale mutation patterns. The map's AS BUILT lists every deviation and test edit.
- Stopped at: Jess's feel test of Misty and Brock, then commit.

## 2026-11-07 (Claude Code, home)
- Slice 5 feel test PASSED (Jess): Misty feels good; she stutters on an arena edge now and then (TODO Up next, tune later).
- Planned slice 6 (map: Entity Model Slice 6 - Leader Stats and Cards.txt). Found: her attack still uses the wild formula (same numbers today), Zinc is blocked only by the validator, max HP is set before her cards load.
- Decided (Jess): a leader is another player's team run by AI; anything a player can have, it can have; every difference hand authored. Recorded as the LEADER PRINCIPLE (COMBAT-RULES "Host model", DECISIONS 11-07); stale "no team cards" lines in SS10 and BOSS-REWORK fixed.
- Slice 6 answers: player attack formula, enrage to go, any card, IV/EV/nature keys, items in this slice, fight-time report scrapped, Misty hpMult 25.
- Stopped at: Jess answers Q1 to Q5 (enrage, power and tempo, built-in leader status rules, item tiers, card budget), then the map is redrawn for approval. No game code changed.

## 2026-11-07, late morning (Quick, work)
- Slice 6 BUILT in three steps (0 neutral parity, A neutral pipeline, B Misty). Leaders use your attack formula; IVs, EVs, nature, team cards, held and run items authored per gym; status differences, i-frames, auto shake and enrage are authored restrictions; Life Orb pays its cost; validator, item ban list and card budget warning. Misty: Zinc 3, hpMult 25, no enrage.
- Decided (Jess): Q1 to Q5 and N1 to N6 as recommended, plus Choice Band and Specs never on a leader, Bright Powder allowed, Rocky Helmet marked bugged and rejected (TODO). CLAUDE.md wins over the Quick agent setup (read-only git allowed, plans prose only).
- Tests: leader-stats-harness (197) and leader-stats-mutate (38); first run caught 34, the 4 misses fixed (one was a real gap: the ban list was read from code). Jess ran check.js, both mutate runners, smoke-gym: clean. Feel test passed.
- Close-out: npm ci, Prettier on 3 files, lint errors 22 to 0 (lang-en.js duplicate keys, two generated files ignored), 5 mutants re-pointed after formatting. Docs swept: host-model plan, BOSS-AUTHORING, COMBAT-RULES, BOSS-REWORK, BALANCE, DECISIONS, TODO, changelog.
- Broke: nothing in game. Misty's arena-edge stutter (slice 5) persists. GitHub API empty all session, board mirror not re-synced.
- Stopped at: slice 6 done; next is planning slice 7.

## 2026-11-07, afternoon (Quick, work)
- Misty's arena-edge stutter FIXED: G.GymLeader takes the wild body's stuck side-step (35% slip for 0.35 s, 0.7 s turn of 1.25 rad) plus a smart side (24 px look-ahead both ways, ties go to her circling side). AI only; your movement untouched.
- Tests: gym-leader-harness section 11 (pinned, corner, free, not-stuck frames), 7 new mutants. Jess ran the checks: clean. Feel test passed, committed.
- Process slip: the plan said the map was saved before it was; written at build time. Plans now get written before they are referenced.
- Stopped at: planning slice 7 (map: Entity Model Slice 7 - Leader Team and Faint Swaps.txt), awaiting Jess's answers.

## 2026-11-07, late afternoon (Quick, work)
- Slice 7 planned and 7a BUILT: a switched gym fields its loop lineup as one G.Team; 1.3 s send-out beat at the fainted spot; win on wipe; per-mon kill vs once-only boss credit; HUD team pips; Misty hpMult {1: 25, 2: 19}.
- Decided (Jess): Q1 to Q4 as recommended; Q5 corrected, leader stages exactly as yours (raises carry past a faint, end one Duration later). SS13 closed; COMBAT-RULES LEADER TEAM added.
- Tests: new leader-team-harness.js (loop 1, loop 2 send-out, stores, raises, credit, bench DoT, scope guard, builder, data) and leader-team-mutate.js (15). Not run here (no node in the Quick sandbox).
- Found: the edge unstick left one gym-leader-mutate pattern STALE ("the brain steps while frozen"); re-pointed. Loop 2+ is dev-only (no real loop counter), TODO.
- Calls answered (Jess): Snowball per mon kept; win line now "Gym Leader <leader> Defeated!" (all gyms); enrage clock field only. 2 more mutants (17).
- 7a checks green, loop 2 feel test passed (Jess). Stopped at: planning 7b.

## 2026-11-07, evening (Quick, work)
- Slice 7b BUILT: the team-reading items read the holder's team (items.js teamOf, yours unchanged); Re-Do on a leader (wipe, 1.3 s beat, team back, last to fall out, once); Regen legal at a loop of 2+ mons; four items off the leader ban list; 3+ dev warning.
- Decided (Jess): Q1 to Q6 as recommended. No changelog line (Misty authors none, nothing a player sees changes).
- Tests: new leader-items-harness.js (yours parity, Brass Knuckles 1.667 on her 3, Tear reads hers, Re-Do flow and credit, Regen 0.5%/s, validator) and leader-items-mutate.js (17). Re-pointed: leader-stats harness (ban list six, Regen message) and mutant; leader-team "the first faint wins". Not run here.
- Stopped at: Jess runs the checks.

## 2026-11-07, wrap-up (Quick, work)
- Session: Misty edge unstick (done, committed), slice 7 planned, 7a built (checks green, feel test passed), 7b built.
- Game code touched this session: gym-leader.js, gym-arena.js, hud.js, gyms.js, items.js, changelog.js. check.js for 7b NOT run yet.
- Lesson: re-check every mutate runner's patterns after any code edit; the edge unstick left one STALE that its close-out missed.
- Board: GitHub API empty all session, TODO.md mirror not re-synced (still 2026-11-04).
- Stopped at: 7b checks owed; next is planning slice 8 in a new chat.

## 2026-11-07, late (Quick, work)
- Slice 8 planned (map: docs/ASCII Concept Maps/Entity Model Slice 8 - Leader Slot Choice.txt), Q1 to Q10 as recommended, BUILT: one slot per move line, one active slot under your 0.4 s hold, stay unless 1.5x, heal then buff visits, bonds, your melee cushion and flinch rule on leaders.
- Files: boss-ai.js, gym-leader.js, player.js (onSwitchFeel hook), gyms.js (bond key + validator), changelog.js; docs COMBAT-RULES, BOSS-AUTHORING.
- Tests: NEW leader-slots-harness.js, leader-slots-mutate.js (22), leader-dps-report.js; changed gym-leader harness/mutate, leader-stats and player-entity harnesses, smoke-gym. STALE scan clean. Not run (no node here).
- Stopped at: Jess runs the checks, the DPS report (Q10) and the Misty feel test.

## 2026-11-07, close-out (Quick, work)
- Jess ran the 7b and 8 checks: green. Slice 9 v1 and v2 maps shelved: the GymLeaderAI gets its own branch (feature/gym-leader-ai), Director-style.
- Close-out approved (B1 to B6 as recommended) and BUILT: Brock on G.GymLeader beside Misty (hpMult 16 / 12, Misty's restrictions). Gyms 3 to 8 stay on the old brain for the playtesters.
- Tests: gym-leader-harness section 10 + new section 12 (Brock's moves on the new body); Lt. Surge is the old-body example in leader-stats, leader-team, smoke-gym; four old-brain harnesses turn Brock's switch off. Changelog line; a cut Misty line fixed.
- Stopped at: Jess runs the checks and the Brock feel test, then commit, merge, new branch.

## 2026-11-08 (Claude Code, home)
- Workflow overhaul: guard hook (.claude/hooks/guard-git.js, allowlist) and CLAUDE.md "Git and GitHub" let the assistant commit and manage issues, board and PRs; TODO.md became a handoff, the old notes are frozen in docs/TODO-notes-2026-11.md.
- Skills from Pocock's set, adapted: grilling, triage, diagnosing-bugs installed; tdd became docs/TEST-FIRST.md; domain-modeling became GLOSSARY.md (Spanish tables moved to docs/SPANISH-CODE-REFERENCE.md); codebase-design became glossary terms and TEST-FIRST rules. Skipped: code-review, git-guardrails.
- Issues filed: #22 to #28 (#26 stale TODO.md references, high priority; #27 DECISIONS split; #28 architecture skill, blocked on #27). Labels added: priority:high, needs-info, wontfix.
- No game code touched; check.js not run. Commits f1730d03, f2b27f79, 91799748 on chore/skill-choice-update.
- Stopped at: Jess merges the branch, starts chore/docs-cleanup in a new session.

## 2026-11-08 (Claude Code, home), docs cleanup
- #26: stale TODO.md references repointed to docs/TODO-notes-2026-11.md, issues #9 and #17, or plan docs; two slice overviews now cite CLAUDE.md "Git and GitHub"; MOVE-INTENT priority:1 retagged [Approved] (ignored as a mechanic). Commit b0122f5a.
- #27: DECISIONS.md split into 135 files in docs/decisions/ (lossless, bytes verified) with an index. Decided: decisions are cited by file name alone, Q/QA numbers are history; CLAUDE.md rule and CONTEXT.md pointers updated. Commit 5fcfe971. Filed #29 (promote review CP1 rulings).
- Not green: gym-harness and leader-stats-harness each fail one Misty check, lint shows 7 errors in guard-git.js. No js/ change on this branch, so none caused here; not investigated. /triage did not show in the session skill list.
- Stopped at: Jess pushes and merges chore/docs-cleanup into main, then pulls main into feature/gym-leader-ai.

## 2026-11-08 (Claude Code, home), triage fix and leader AI design
- /triage was never broken: disable-model-invocation hides it from the model's list. The real fault was diagnosing-bugs, whose unquoted description broke its YAML (quoted). Triage pass: #14 #24 #25 ready, label and board mismatches fixed, #5 closed (superseded by slice 7a), #28 ready.
- Leader AI designed fresh by grilling (old proposal frozen first), then compared with it and the slice 9 v2 map (both now history). Spec: docs/LEADER-AI.md; decision 2026-11-08-leader-ai-an-ai-player-through-your-controls; 8 glossary terms; COMBAT-RULES LEADER VOLUNTARY SWAPS.
- Filed #31 to #35; #22 rescoped as slice 1. Branch rules now live in docs/branch-rules/feature-gym-leader-ai.md (slice shape rule moved out of CLAUDE.md).
- No game code touched; check.js red only on the two #30 harnesses.
- Stopped at: open slice 1 (#22) in a new chat by agreeing its goal, done check and test.

## 2026-11-08 (Claude Code, home), leader AI slice 1 (#22)
- Drift cleanup: #23 closed by Jess (the slice 1 Elite fight item made no sense), TODO and STATE fixed, area:docs label added (#28, #29). Held-item reveals split to #36 (may ride an item rework).
- Rulings (in docs/LEADER-AI.md REVEALS): "on screen" = cast since the fight's start; a bond = two different moves of one mon cast with no slot switch seen between them, no time window (Jess dropped the 0.4 s window).
- Built: G.LeaderAI (one per leader team, answers the seven controller calls, wraps GymBrain), G.LeaderInfo (rosters, move and bond reveals, keyed by copy uid else team slot), the leader's swap step through your rules, G.Debug.leaderSwap, a ?dev overlay. Shared with you: G.Team.requested and PlayerEntity.takeSlotInput. move:cast gains ownerUid, ownerSlot, rival; new slot:switch event.
- Test: docs/proposals/leader-ai-harness.js (55 checks; parity against a trace recorded before the build). Harness and mutate retargets in 9 files. Smokes gym and team green; check red only on the two #30 harnesses.
- Jess feel-tested a loop 2 Misty fight: all good (the reveal overlay needs G.Debug.hitbox(), not ?dev alone). #22 closed and shipped, #31 now ready.
- Stopped at: open #31 (slice 2) in a new chat.

## 2026-11-08 (Claude Code, home), leader AI slice 2 (#31)
- Korataki is personal-use only: Michroma replaces it (decision file, #37). New #38: a swap keeps moves already in flight, for every Player entity (rule change; today a swap deletes them).
- Rulings (docs/LEADER-AI.md): dodge sideways to the open floor (later leaned by aggression and confidence, plus a gap-closing dodge, both in #32); dodgeRead is a seeded shuffle bag, 6 per 10, no streak cap; threats noticed on any frame, answered exactly reflex later, 0.6 s window; matchup tie-breaks; dodges in loop 1 too.
- Built: swap triggers vs STAY, stall guards, matchup, dodges, the bag, the decision log (G.LeaderAI), threats (G.LeaderInfo), bench faint paid silently (EnemyMgr.payKill split out), `ai` settings per gym, G.Debug.leaderAI.
- Found while building: at close range GymBrain is in a tell or its recovery 86% of the time, so Misty never swapped. Built as [Proposed] TELL READING (wind-up only; a held tick waits for the first free frame), for Jess to confirm.
- Test: leader-ai-harness 159 checks, leader-ai-mutate 27/27; five old leader harnesses run with the AI's decisions off; silver and EV text checks follow payKill. check red only on the two #30 harnesses (same failures as before); smokes gym and team green.
- Jess feel-tested slice 2: approved ("craaaazy, in a good way"); TELL READING promoted to [Approved]. #31 closed and shipped, #32 unblocked (ready).
- Stopped at: open #32 (slice 3) in a new chat.

## 2026-11-08 (Claude Code, home), leader AI slice 3 (#32)
- Opened #32 with Jess: confidence shifts an effective aggression (aggression + (conf - 0.5) x 0.6) and the swap margin; pacing is a leader-wide stance (neutral, push, breather), a push on frustration or to press an advantage. Ruling: a breather is back off plus a slot choice, never a held cast (moves auto-fire; decision file). Misty 0.68 (hit and run), Brock 0.35 (wall). Gap-close keeps one charge back; lines queue behind the banner.
- Built: fight events and 2 s / 15 s windows (G.LeaderInfo), confidence, pacing, lean, gap-closing dodge, triggers and lines (G.LeaderAI), GymBrain `hold`, validator for ai.triggers and ai.lines, Misty and Brock authoring, overlay status, G.Debug.leaderAI switches.
- Calls made without a ruling (on #32): a line waits 4 s, not 3 (the send-out banner is 3.2 s); a trigger swap skips minField and swapLimit.
- Test: leader-ai-harness 324, leader-ai-mutate 68/68; five old leader harnesses load leader-info and run with slice 3 off; check red only on the two #30 harnesses (failures identical to HEAD); smoke-gym green; a file:// Misty probe saw real hits move confidence, gap-closing dodges and both lines.
- Jess feel-tested slice 3: approved ("feel test is great"), with both build calls (line wait 4 s; trigger swaps skip the stall guards). #32 closed and shipped; #33 unblocked (ready).
- Stopped at: open #33 (slice 4) in a new chat.

## 2026-11-08 (Claude Code, home), leader AI slice 4 (#33)
- Opened #33 with Jess: the only exploit is your usual lead (the mon with the most field time in a fight, believed at learnRate sightings with no tie); learnRate 3, Misty authors 2; predictCap 7 in 10 as a run-long seeded bag; the read skips minField and speaks even with no swap; a dev seed for the feel test (rematches are dev-only until #24).
- Built: G.LeaderMemory (new js/systems/leader-memory.js, startRun/endRun, never saved), the G.LeaderInfo feed (moves, bonds, switches, tagged swaps, dodges, field time, range, lead sighting), stale reveals, the read and the `exploit` trigger in G.LeaderAI, validator keys, G.Debug.leaderMemory and leaderLead.
- Calls made without a ruling: "seen missing" = 4 other moves cast; tag lines 30% HP and 2 s; the read line goes first (the start line drops on a read fight).
- Test: leader-ai-harness 449, leader-ai-mutate 89/89; check red only on the two #30 harnesses; smoke-gym green; a file:// probe saw Misty open with Seel and say her line at 2.4 s.
- Jess feel-tested slice 4: approved ("it feels awesome"), with the three calls. #33 closed and shipped; #34 unblocked (ready).
- Stopped at: open #34 (slice 5) in a new chat.

## 2026-11-08 (Claude Code, home), leader AI slice 5a (#34)
- Opened #34 with Jess: slice 5 split into 5a (#34, GymBrain out, behavior-neutral) and 5b (#39, personalities, every remaining style and memory setting; Brock a wall, Misty tempo). Casting on your path with the tell as the authored difference; GymBrain's reach filter kept for 5a.
- Step 1 (b91e26a7): a 5a parity trace (all AI decisions on, loops 1 and 2) recorded on GymBrain first; movement and slot choice moved to G.LeaderAI, the cast rules to G.GymLeader.Caster, tuning shared as G.Boss.TUNE. Trace matched tick for tick.
- Step 2: leaders run G.MoveSim.turn (tick without the step; castDue hook) after their slot press. Found and fixed a double recharge (the inactive loop compared groups; a leader's active group is a filtered copy). Drift: at most 3 frames, 4.6 px; Jess accepted, traces re-recorded.
- Test: leader-ai-harness 470, mutate checks 92/92, 58/58, 22/22, 38/38; check red only on the two #30 harnesses; smoke-gym green.
- Found: a leader's timers pause while it is stunned (yours run); left for Jess to rule. Stopped at: Jess's feel test of 5a.
- Jess feel-tested 5a: approved ("looks great"). #34 closed and shipped; #39 unblocked (ready).

## 2026-11-09 (Claude Code, home), stunned-leader ruling and the GymLeader vs HumanPlayer audit
- Jess ruled: a stunned leader keeps its timers running like yours (decision 2026-11-09-a-stunned-leader-keeps-its-timers-running-like-you); #40 filed.
- Root cause: 5a moved GymBrain's one step into G.LeaderAI whole, so the sim pass and slot press sit inside steering, skipped while stunned.
- Audit of GymLeader vs HumanPlayer: 15 differences marked. #40 widened to items 1 to 4 (frame takes your shape, stun mid wind-up cancels it, authored first-attack wait); #41 cleanup (5 to 9); #42 needs rulings (10 to 15). All before #39.
- Branch rules gained "Why #40 to #42 exist"; GLOSSARY gained Body, AI and Controller. No code changed.
- Found: docs/proposals/items-f3d2-harness.js moved to the repo root mid-session (not by the assistant, not committed); Jess to restore. Stopped at: #40 build, waiting on the firstWait placement.

## 2026-11-09 (Claude Code, home), #40 built: the leader's frame runs your flow
- Jess ruled: firstWait defaults to 0 (you attack at once, so the leader does); every Player entity runs one flow, decide, hands, body, sim pass (two new decisions; GLOSSARY gained Sim pass).
- Built #40: G.LeaderAI decides with no stun gate, slot presses are queued controller answers; G.GymLeader reads its keys, runs the body, then Caster.frame (first wait, stun cancel with freshness restored, G.MoveSim.turn, the tell); the `firstWait` restriction and validator.
- Tests first: leader-ai-harness section 12 (508 pass), leader-ai-mutate 102/102 (10 new); gym-leader, leader-slots and leader-team harness and mutate sets adapted (one already-stale pattern fixed); smoke-gym passes on file://.
- Both parity traces re-recorded: the order shift alone is at most 2 frames and 5.5 px a cast (one Brock reach-edge flip in the slice 1 trace), then firstWait 0.
- Jess feel-tested #40: passed; closed and shipped. Stopped at: next #41.

## 2026-11-09 (Claude Code, home), #41 built: four roles, the Caster split
- Jess tightened the terms: Decider, Controller, Body, SimPass (a refusal passes nothing on); authoring layers Player, class, instance; the AI chooses its attacks; items 5 and 6 take your baseline; the Caster splits; a bonded group fires as yours; names are descriptive (CLAUDE.md). Four decision files.
- Built #41 in five steps, tests first (leader-ai-harness section 13): dead fields gone, no AI stun exception, `wildStatusDivisor` (off), Body `acceptsAttack` plus G.GymLeader.SimPass plus the attack score in G.LeaderAI, heal whenever due with the Decider moving off a heal-only slot, edge unstick on the Decider (reads the Body's `lastStep`).
- Broke and fixed: the first unstick measured the whole frame (410 false side-steps); the Body now records its own step. Mutation counts are vacuous while a harness is red (memory note).
- Tests: leader-ai 544, gym-leader 161, leader-slots 41 all pass; parity traces unchanged; mutate 113, 59, 22; smoke-gym passes. Filed #43 (movement split), #44 (flat moves both ways).
- Jess short feel test passed; #41 stays in Needs Playtest for playtesters. Stopped at: next #42 items 11 to 15.

## 2026-11-09 (Claude Code, home), #42 ruled; #45 and #37 built; #41 shipped
- Slice 8 Q10 (DPS report) closed as superseded: the report compares two GymBrain versions and broke at leader AI slice 1 (#22).
- #42 items 11 to 15 ruled, closed: 11 the leader's attacks wait on your cast gate, Body reach check out, a move-in score (#47); 12 strongHost out (#45); 13 one swap clock and swap point (into #43); 14 two sides, HumanPlayers and everyone else (#46); 15 autoShake is your accessibility setting, on. My mistake on 11 (I said your moves ignore reach; they have a cast gate) was caught and corrected before the ruling.
- #45 built and shipped (behavior-neutral); #37 Michroma replaces Korataki (Regular weight, files deleted, history left), look approved, shipped.
- PM rule fixed in CLAUDE.md and PM-WORKFLOW: the assistant closes and ships once Jess confirms; Needs Playtest is for feel tests.
- #41 shipped (initial playtest reports good), #43 unblocked. Pre-existing STALE: boss-owner-mutate "far mode ignores a short ready shot". DEVLOG rotated. Stopped at: open #43 next session.
