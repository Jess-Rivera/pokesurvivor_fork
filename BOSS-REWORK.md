# BOSS-REWORK, tracker for branch feature/boss-rework

- **Role:** Progression and encounters spec (QA-06). Body not yet reconciled to this role.
- **Owns:** Run progression, level curve, gyms, elites, Elite Four, escalation, badges, region completion and loops.
- **Does not own:** Combat rules including status effects (docs/COMBAT-RULES.md); gym roster data (docs/GYM-ROSTERS.md); authoring format (docs/BOSS-AUTHORING.md); tuned numbers (BALANCE.md); work tracking (STATE.md).
- **Status home:** STATE.md.
- **Last reconciled:** not yet

Single place to see the design, the decisions and every change for this branch. Opened 2026-10-19.
Durable rulings also get a dated entry in DECISIONS.md; this file is the working view and the change log.
Read this at session start while the branch is active (CONTEXT.md points here).

Status legend: LOCKED (agreed, build to it), DRAFT (under discussion), OPEN (not decided), DEFERRED (own branch or later).

---

## 1. Overview (LOCKED, see docs/DECISIONS-archive.md, 2026-10-19 boss rework)
Replaces the three old boss systems:
- Rifts with legendaries -> GYM fights (gate on the map -> type-matched arena -> the leader's signature Pokemon with hand-authored real moves, level = run-time level + 4, sized up).
- BOSS_SLOTS bosses (3, 6, 9, 12, 15 min) -> overworld ELITES (level offset +1 or +2, sized up).
- Arceus's Judgment at 30:00 -> removed. Region Complete (finish the region's ordered encounter list) replaces it.
- Region Complete: Return Home (completion bonus) now; Keep Going (loops, two signatures at once, bonus per loop) DEFERRED to feature/continue-option.
- Badge per gym win: run-long boost, guaranteed item, guaranteed level, a Bond, full team revive to 100%.
- ENEMY LEVEL CURVE (LOCKED 2026-10-19): time under 30:00 -> linear L1 to L50. From 30:00, if the gym list is NOT complete -> clamped at L50. Once all gyms are beaten (Gym 8 in Kanto) -> the slow ramp (starts linear, transitions to exponential, math TBD) and the Elite Four phase starts. levelForTime therefore takes the gym-list completion time as an input. Nothing punishes a slow player before that beyond the L50 wild, so the tempo incentive is the Return Home time bonus (section 4).

## 2. Overworld Elites (LOCKED 2026-10-19 by Jess, numbers marked TUNE are set at build time)
- NO level offset (a +1/+2 offset is only about +14% stats at L10 and +6% at L30, so it solves nothing). The elite is a normal-level enemy of a stronger species with two multipliers.
- Species: region accurate (regionOK), no legendaries, no repeats in a run, drawn from ONE BST TIER ABOVE the highest tier active in the wild bag at that time. When the top tier is already active, use the old boss BST bands (600 to 700, the pseudo-legendary band). Draw rule to confirm at build.
- Sized up: scale in 0.5 steps (pixel crispness), 1.5x for small species up to 2x; name tag, boss-style HP bar, off-screen arrow.
- Levers: HP multiplier and power multiplier (TUNE). HP multiplier is derived, not hand-typed: target time-to-kill 20 to 30 s of focused fire at the player's expected DPS at the spawn time (calibrate offline from stats.js and the logger). Elite HP must skip the opening wild HP discount (openingHpK) so it is not softened at 2:00.
- Attack path: the wild ratio path (atkFactor at the elite's level) times the power multiplier. No authored moves for elites.
- ENGAGEMENT = the player's first hit on the elite. 60 s after engagement the elite becomes ENRAGED: its damage multiplier ramps up and possibly its move speed (TUNE: ramp length, cap, speed on or off). Show the enrage countdown on the elite HP bar. With a 20 to 30 s TTK enrage should be rare, it is the soft fail for an under-powered player.
- Spawn pressure on spawn: wild cap drops to 50% of normal (32 of 64) and the wild spawn rate halves, for 60 s from the elite's spawn, then ramps back to normal (TUNE: ramp length, default 30 s). Time-based from the spawn, so an ignored or unkilled elite cannot hold the swarm down. Wild units above the new cap walk off screen and are deleted (units already off screen first, then the farthest), no XP for deleted units.
- Cadence: the first elite at 2:00; each later elite 2:00 after the player returns to the overworld from a gym. One elite per gym cycle, none while one is alive. Elites stop at the end of the encounter list. (Rule to confirm: do they also run through the Elite Four phase.)
- Reward: kill pays XP = wild yield x the elite's HP multiplier x 1.2 (LOCKED, a kill-equivalent plus a 20% premium), a chance at an item (G.Items.roll), and a guaranteed Berry (the `heal` pickup).
- DENSITY BONUS (LOCKED 2026-10-19): the old crowd bump (called 'elite' in the code) is KEPT, renamed, and is XP ONLY: x1.6 XP on spawns while 54 or more units are alive (absolute count, so it cannot fire inside an elite's halved-cap window), switched on at XP_BOOST_END (180 s) so it never stacks with the x2 boost. The x1.25 damage part is DROPPED (a damage bump on a crowded screen punishes the player who is already behind).
- OPEN: how the enrage ramps (numbers); whether elites run through the Elite Four phase.

## 3. Gyms (DRAFT, not yet discussed in detail)
Agreed so far: gate on the map reusing the rift flow (portal, closed arena, stash of map enemies, return), mainline order per region, hand-authored real moves, +4 level offset, sized up, badge package (section 1). Pilot gym is Brock (Kanto).
Jess's gate spec (2026-10-19): Gym 1 spawns at 4:00; each later gym spawns 4:00 after the previous gym is beaten AND the player has returned to the overworld; gates stay open and are done in order. LOCKED as 'Option A' (2026-10-19): the 30:00 target for Gym 8 is DROPPED. Gym 8 spawns at 4:00 + 7 x (4:00 + fight time), so about 39 to 46 min. Consequence: enemy level sits on the L50 clamp from 30:00 until Gym 8 is beaten (see the enemy level curve in section 1), so Gyms 6 to 8 (about) are all clamp + 4. The slow ramp only starts after the gym list is complete. Open: arena visuals per type, authored-move data format, move Kind -> telegraphed attack translation, badge boost definitions, Bond reward, Elite Four rewards and level offset, Champion.

### 3d. Pilot gym: Brock (2026-10-19)
### 3e. Multi-mon gyms (LOCKED 2026-10-22, Jess) — ALL AT ONCE
Loops field the leader's first N mons SIMULTANEOUSLY (not sequential): loop 1 = slot 1 alone,
loop 6 = all six on screen together, a brawl. Arena size scales with the mon count (ARENA_R becomes
count-based, not the constant 11). Win = every leader mon down (arenaTick tracks a SET of boss ids,
won() only when all are dead, not a single arena.bossId). Enrage = one SHARED gym clock from the first
hit on any leader mon (proposed, TUNE), not per-mon. Difficulty is multiplicative (N simultaneous attack
patterns), so loop 6 is a tuning watch item; pairs with the gate-escalation pressure. Rosters + the
six-line / loop-N-fields-first-N data live in docs/GYM-ROSTERS.md (Brock locked 2026-10-22).
Loop 1 fields the first signature only: Geodude alone. Moves: Tackle, Harden (stands in for Defense Curl, which is not in the catalog) and Rock Throw (Jess's addition). Entry is in docs/BOSS-AUTHORING.md. Geodude is Rock/Ground, stats 40/80/100/30/30/20, BST 300. RESOLVED 2026-10-19: (1) a near-stationary Geodude is accepted, Rock Throw carries the fight. (2) GYM FAILURE = RUN ENDS: a team wipe in a gym is death, which commits EVs and progress (the original rift behavior of being spat out at 35% health is NOT used). (3) No arena timer; the gym boss ENRAGES 120 s after engagement (TUNE), same mechanism as elites, which also prevents stalling. (4) The canonical type chart stays ON HOLD and untouched; its boss-immunity rule must be settled before it goes live, since a Rock/Ground boss is Electric-immune.

### 3a. Gym move vocabulary (LOCKED 2026-10-19 rule, boss forms DRAFT)
- Gym signature Pokemon use ONLY moves already in the catalog (js/data/moves.js, 64 moves) and ONLY the warning shapes that already exist (ground zone circle, ground beam line) plus the existing aimed enemy shots. Jess hand-authors which catalog moves each signature uses. Nothing outside the catalog is accepted, so there is nothing to approximate. A move missing from the catalog is added to the catalog first (propose-first, it is game data).
- Each move kind has ONE fixed boss form (a table, not a per-move guess). Proposed forms: projectile, cone and nova = aimed shots with a ~0.6 s wind-up ring; melee = zone on the boss (stomp); dash = charge along a beam warning; beam = beam hazard; meteor = zones landing on and around the player; self-buff (Harden, Swords Dance, Agility, Dragon Dance; there is NO Defense Curl in the catalog) = a self stat-stage change (see 3c); SECOND WAVE (only zone and beam shapes, no new hazard type): aura = repeated zone pulses centered on the boss; mine = delayed zones around the player; trail = zones laid behind the boss as it moves; boomerang = a beam out and a beam back; chain = a few zones in sequence near the player; orbit = a ring of zones around the boss; turret (Substitute, Will-O-Wisp) stays inert.
- Casts use the player's per-cast normalization (total Power split across pellets). Enemy attack strength needs a Power parameter (stats.js enemyAttackFactor hard-codes Power 40 today). Cooldowns come from the catalog times a tier factor. Authoring hints per move: weight, range tag (close, far, any), optional only-below-X%-HP. Fury phase: OFF for now (Jess 2026-10-19; the schema keeps the optional field, unused). Self-boost for buff moves = a stage change (3c).
- Catalog coverage with the v1 forms (first wave only): rock 2, ground 1 (Mud Shot), water 4, electric 1 (Thunder Shock), grass 1 (Vine Whip), poison 2, psychic 3, fire 3, ice 2, fighting 2, ghost 2, dragon 1 plus Dragon Dance, normal 4 plus 3 self-buffs. Thin: Surge (electric), Erika (grass), Giovanni (ground). The second wave's AURA form alone unlocks 7 more moves, among them Discharge, Giga-Drain and Bulldoze, which are exactly those three types. Normal-type moves (Quick Attack, Tackle, Body Slam, Hyper Voice) are the mainline-accurate filler for the rest.

### 3b. Authoring schema (DRAFT 2026-10-19)
The format Jess fills in lives in docs/BOSS-AUTHORING.md (fields, move-line hints, validation rules, a template and an illustrative Brock example). It becomes js/data/gyms.js at build time (propose-first).

### 3c. Status, stages and bosses (2026-10-19)
General status, damage-over-time and stat stage rules now live in docs/COMBAT-RULES.md (sections "Status effects", "Damage over time" and "Stat stages and maxStacks") and apply to bosses, elites and gym leaders as to every other host. Superseded here and no longer stated: the 2026-10-19 stage multiplier table, the "about 12 s" application length and the Speed-stage-before-shaping line (replaced by the Status Slice D1 and E2a entries in docs/DECISIONS-archive.md, summarized in COMBAT-RULES "Stat stages and maxStacks"). Gym-only rules that stay here (LOCKED by Jess unless marked):
- Phasing: the pilot gym (Brock) uses DAMAGE moves plus Harden only. No player-side status needed for it. Then a minimal player status core before Gym 3 (burn and poison on the DoT table, paralysis as a slow, stat drops), then control statuses in Slice C. Slice C is needed very soon (promote it right after the pilot).
- DoT on base HP and no blanket boss immunity: see COMBAT-RULES "Damage over time" and "Other status effects".
- Stages adopted 2026-10-19 (Jess: 'Adopt the Stages yes'): see COMBAT-RULES "Stat stages and maxStacks".
- Boss Harden = +1 Def stage per cast (x1.5 Defense), stacking, instead of my earlier flat 14%.
- Cooldown fact (verified 2026-10-19): damaging moves use cd = 0.5 x (35 / PP) (DECISIONS 2026-10-18, BETA 1.0), but STATUS moves (dmg 0) keep their hand-tuned catalog cd. Harden is hand-tuned 0.85 s (PP 30 would give 0.58 s). Boss rule proposal: cast period = the move's cd times the tier factor, never shorter than wind-up plus recovery (about 1.0 s), so a boss cannot spam a move that is fast for the player.
- BUILT 2026-10-19 (Slice D1): G.Stages with a 6 s per-application duration (the 12 s above was a placeholder), gym leader Harden = +1 Def stage per cast with the move's stacks as the stage cap, gym attacks read the Atk or SpA stage, player-side buffs still on pl.buffs. See DECISIONS 2026-10-19 Status Slice D1.

## 4. Elite Four phase, Region Complete, Return Home (flow LOCKED 2026-10-19, numbers TBD)
- Trigger: Gym 8 beaten and the player back on the map. Then (1) the slow level ramp starts and (2) ALL FOUR Elite Four gates open at once, spread across the map so every gate is off screen from the others. The gate shows its level, and so does the direction arrow that points to it.
- Elite Four levels are HARD-SET per encounter (authored in the region data), not clock-based and not wild + 4. The player sees the difficulty and picks the order. Gym levels stay clock-based (wild level + 4).
- Region Complete = all 8 gym leaders and all 4 Elite Four defeated (Champion not in Kanto's list for now).
- Return Home bonus: a multiplier on total run time. Under 60 min raises it, over 90 min lowers it, flat between (curve shape, steps vs continuous, and numbers TBD). Death still commits EVs and progress.
- Keep Going: DEFERRED (feature/continue-option). Idea: XP, damage and HP multipliers all go up each loop.
- Schedule floor (design note): with 4:00 gaps, Gym 8 spawns at about 39 min even if every gym fight takes 1 min, so the best clear is roughly 45 to 50 min. Skill shows up as short fights and no deaths, not as skipping waits. Pick the 60 and 90 min bonus marks after the pilot gym gives real fight times.

## 5. Cleanup list (DEFERRED to the last slice of this branch)
- Unhook rift spawning (rift.js) but keep legendary flags, data and code for the later legendary feature.
- Remove Arceus's Judgment (judgment.js 706 lines, its hooks in spawner.js and rift.js, `G.Judgment.AT`, related achievements, missions and lang-en.js keys).
- Remove the old boss AI (bossInit, bossMove, bossStart, bossCast, bossEnd, enrage in enemy.js) once nothing uses it.
- Remove BOSS_SLOTS, bossScale (enemies.js), spawnBoss and bossIdx (spawner.js).
- Mark GLOSSARY entries (jefe / grieta) and update ONBOARDING / GDD.

## 6. Change log (code and data changed on this branch)
- 2026-10-19, Boulder Badge boost BUILT (+10% Atk, whole team, Player.badge/incOf, G.Game.badgeBoost, gyms.js boost field); gym leader drops no XP (toast + guaranteed level instead).
- 2026-10-19, Brock pilot gym BUILT (see DEVLOG): js/data/gyms.js, js/systems/gym.js, rift.js (gate, no timer, random rifts off), enemy.js (gym AI casting the player's own moves), stats.js (power/cat), game.js (grantLevels, reviveTeam, gym death ends the run), hud.js, elites.js (afterGate), debug.js (G.Debug.gym()). Boost is a stub; tuning pending the feel test.
- 2026-10-19, Overworld Elites slice BUILT: new js/systems/elites.js; eliteDef() in enemies.js; XP_BOOST_END in stats.js; spawner.js (placeElite, elite cap/rate, Density Bonus, boss spawn and bossFight removed); enemy.js (elite descriptor, exclusions, walk-off, drops, name tag); hud.js (elite bar and arrow); judgment.js unhooked (ENABLED = false); progress.js (elite counts as boss kill); debug.js (G.Debug.elite()); dev.html; changelog.js; docs/proposals/elites-harness.js. Open: BOSS_SLOTS/BOSSES/bossScale data still present (cleanup list), TTK and power retune after feel tests.

### Code touch points found so far (baseline for the change log)
- js/data/enemies.js: BOSS_SLOTS, rollRun() boss draw, bossScale(t), BOSSES getter, upcomingDex().
- js/systems/spawner.js: bossIdx, spawnBoss(), bossFight (25% spawn rule and no tides), crowd bump line 109 and ELITE_FROM (RENAME to density bonus, gate on bossIdx > 0 replaced by the 180 s constant), XP boost window and its announcement (lines 32 and 207 read BOSS_SLOTS[0].at; LOCKED: read the shared run-time constant XP_BOOST_END = 180 s).
- js/data/enemies.js line 66: openingHpK also reads BOSS_SLOTS[0].at (same constant, 180 s, must survive the BOSS_SLOTS removal).
- js/entities/enemy.js: `boss` constructor flag and about 30 branches on it, bossScale(dex) sizing, boss HP / speed / atkFactor null, die() drops (coins plus an item), boss movement and attack functions, boss HP bar.
- js/systems/combat.js: boss contact uses the flat path and reach 1.0, defender level falls back to the player's level for bosses (atkLvl 0).
- js/systems/hazards.js: hazards carry atkFactor; bosses pass null.
- js/systems/rift.js and judgment.js: the arena and portal flow gyms will reuse; Judgment to be removed.
- js/net/coop.js: rift, arena and hazard messages (co-op is deferred, note only).

## 7. Open questions index
- RESOLVED 2026-10-19: gym timing = Option A (keep 4:00 gaps, drop the 30:00 target); elite XP = wild yield x HP multiplier x 1.2; XP boost and opening HP discount read one run-time constant.
- RESOLVED: Density Bonus is XP only (section 2). Run-time constant XP_BOOST_END = 180 s approved.
- RESOLVED 2026-10-19: a gym's level LOCKS when its gate spawns and is displayed on the gate (same as the Elite Four). Elites run in the Elite Four phase: one elite 2:00 after each return from ANY gate, none while one is alive, timers never stack. Elite Four give the badge package WITHOUT the guaranteed full revive (gym leaders keep the revive).
- Elite Four details still open: order freedom is implied by the hard-set levels (all four gates open at once), hard-set level lists for Kanto, whether any gate-skipping is allowed.
- Post-gym ramp math, and its link to the 60 and 90 min bonus marks (proposal: it should bite noticeably by 90 min so both incentives agree).
- Elites: enrage numbers and ramp length. Elites in the Elite Four phase: proposal is one elite 2:00 after each return from ANY gate (gym or Elite Four), none while one is alive, timers never stack.
- Post-gym ramp (deferred): shape and numbers of the slow ramp that starts when the gym list is complete; it also needs the levelForTime change described in section 1.
- Gyms and the rest: see sections 3 and 4.

- 2026-10-19, FEATURE CLOSED: Overworld Elites + Brock pilot gym (Boulder Badge +10% Atk, no leader XP, plain species speed) feel-tested and merged. Remaining work moves to status Slice C, then Kanto roster / Elite Four / Region Complete.
