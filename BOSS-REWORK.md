# BOSS-REWORK, tracker for branch feature/boss-rework

- **Role:** Progression and encounters spec (QA-06). Body partly reconciled to this role (B5a1: escalation, badges and the pilot gym rulings added; the in-region rules from the 2026-10-28 answers tagged). The loop design (QA-08) is recorded in section 4a (B5a2, 2026-10-28, approved, not built); the change log and touch points move to history in B5b.
- **Owns:** Run progression, level curve, gyms, elites, Elite Four, escalation, badges, region completion and loops.
- **Does not own:** Combat rules including status effects (docs/COMBAT-RULES.md); gym roster data (docs/GYM-ROSTERS.md); authoring format (docs/BOSS-AUTHORING.md); tuned numbers (BALANCE.md); work tracking (STATE.md).
- **Status home:** STATE.md.
- **Last reconciled:** 2026-10-28 (B5a1, sections 1 to 4; B5a2, section 4a), against js/systems/gym.js, js/systems/elites.js, js/data/gyms.js and js/core/stats.js (levelForTime).

Single place to see the design, the decisions and every change for this branch. Opened 2026-10-19.
Durable rulings also get a dated entry in DECISIONS.md; this file is the working view and the change log.
Read this at session start while the branch is active (CONTEXT.md points here).

Status legend: LOCKED (agreed, build to it), DRAFT (under discussion), OPEN (not decided), DEFERRED (own branch or later).

Tags are defined in CLAUDE.md: [Approved], [Legacy behavior], [Proposed], [Open]. Where a line carries a tag, the tag gives its status, ahead of the status word in its section heading. Duplicates across sources were resolved by keeping the later dated owner decision; the 2026-10-28 answers beat everything earlier.

---

## 1. Overview (LOCKED, see docs/DECISIONS-archive.md, 2026-10-19 boss rework)
Replaces the three old boss systems:
- Rifts with legendaries -> GYM fights (gate on the map -> type-matched arena -> the leader's signature Pokemon with hand-authored real moves, level = run-time level + 4, sized up).
- BOSS_SLOTS bosses (3, 6, 9, 12, 15 min) -> overworld ELITES (sized up). The +1 or +2 level offset in the original design was dropped the same day: elites have NO level offset (section 2).
- Arceus's Judgment at 30:00 -> removed. Region Complete (finish the region's ordered encounter list) replaces it.
- Region Complete: Return Home (completion bonus) now; Keep Going and the loop design are recorded in section 4a (approved 2026-10-28, approved, not built); the build stays DEFERRED to feature/continue-option. (Superseded, history: the old "two signatures at once" wording, replaced by "Loop N fields the first N".)
- [Approved] Badge per gym win: run-long boost, guaranteed item, guaranteed level, a Bond, full team revive to 100%. Details in section 3g.
- [Approved] ENEMY LEVEL CURVE (LOCKED 2026-10-19; confirmed by Q5, 2026-10-28): time under 30:00 -> linear L1 to L50. From 30:00, if the gym list is NOT complete -> clamped at L50. Once all gyms are beaten (Gym 8 in Kanto) -> the slow ramp (starts linear, transitions to exponential, math TBD) and the Elite Four phase starts. levelForTime therefore takes the gym-list completion time as an input. Code differs, see TODO: levelForTime accepts a gymsDone argument but ignores it and always clamps at L50 past 30:00, so the post-gym slow ramp is not built (js/core/stats.js).
  - (Superseded 2026-10-28, history: "the tempo incentive is the Return Home time bonus (section 4)". The 60 and 90 minute time bonus is replaced by the escalating completion bonus, see section 4a.)
- [Approved] The linear phase restates the 2026-10-17 Enemy HP model (DECISIONS): level(t) = 1 + 49 * clamp(t/1800, 0, 1), HP via the mainline formula. That entry's 'PHASE 2' (Standard Run / Unlock Safeties choice after a 30-minute boss) is superseded (docs/DECISIONS-archive.md, 2026-10-19 boss rework design).
- [Approved] Gate escalation adds a temporary, uncapped bump to wild spawn levels and to the gym leader's level while a gate is open past its grace period (section 3f). levelForTime itself stays pure.

## 2. Overworld Elites (LOCKED 2026-10-19 by Jess, numbers marked TUNE are set at build time)
- NO level offset (a +1/+2 offset is only about +14% stats at L10 and +6% at L30, so it solves nothing). The elite is a normal-level enemy of a stronger species with two multipliers.
- Species: region accurate (regionOK), no legendaries, no repeats in a run, drawn from ONE BST TIER ABOVE the highest tier active in the wild bag at that time. When the top tier is already active, use the old boss BST bands (600 to 700, the pseudo-legendary band). Draw rule to confirm at build.
- Sized up: scale in 0.5 steps (pixel crispness), 1.5x for small species up to 2x; name tag, boss-style HP bar, off-screen arrow.
- Levers: HP multiplier and power multiplier (TUNE). HP multiplier is derived, not hand-typed: target time-to-kill 20 to 30 s of focused fire at the player's expected DPS at the spawn time (calibrate offline from stats.js and the logger). Elite HP must skip the opening wild HP discount (openingHpK) so it is not softened at 2:00.
- Attack path: the wild ratio path (atkFactor at the elite's level) times the power multiplier. No authored moves for elites.
- ENGAGEMENT = the player's first hit on the elite. 60 s after engagement the elite becomes ENRAGED: its damage multiplier ramps up and possibly its move speed (TUNE: ramp length, cap, speed on or off). Show the enrage countdown on the elite HP bar. With a 20 to 30 s TTK enrage should be rare, it is the soft fail for an under-powered player.
- Spawn pressure on spawn: wild cap drops to 50% of normal (32 of 64) and the wild spawn rate halves, for 60 s from the elite's spawn, then ramps back to normal (TUNE: ramp length, default 30 s). Time-based from the spawn, so an ignored or unkilled elite cannot hold the swarm down. Wild units above the new cap walk off screen and are deleted (units already off screen first, then the farthest), no XP for deleted units.
- [Approved] Cadence (confirmed by Q3, 2026-10-28): the first elite at 2:00; each later elite 2:00 after the player returns to the overworld from a gym. One elite per gym cycle, none while one is alive. Elites stop at the end of the encounter list. Code differs, see TODO: js/systems/elites.js still runs the TEMP cadence (first: 120, every: 360) beside afterGate, so a further elite can spawn 6:00 after the last one within the same gym cycle.
- [Approved] Elites run through the Elite Four phase: one elite 2:00 after each return from ANY gate (gym or Elite Four), none while one is alive, timers never stack. (RESOLVED 2026-10-19, section 7; docs/DECISIONS-archive.md 2026-10-19 late morning addendum) Code differs, see TODO: the Elite Four is not built.
- Reward: kill pays XP = wild yield x the elite's HP multiplier x 1.2 (LOCKED, a kill-equivalent plus a 20% premium), a chance at an item (G.Items.roll), and a guaranteed Berry (the `heal` pickup).
- [Approved] DENSITY BONUS (LOCKED 2026-10-19; built, docs/DECISIONS-archive.md 2026-10-19 Overworld Elites BUILT; the same-day archive entries that removed the bump or named it SWARM BONUS are superseded by this): the old crowd bump (called 'elite' in the code) is KEPT, renamed, and is XP ONLY: x1.6 XP on spawns while 54 or more units are alive (absolute count, so it cannot fire inside an elite's halved-cap window), switched on at XP_BOOST_END (180 s) so it never stacks with the x2 boost. The x1.25 damage part is DROPPED (a damage bump on a crowded screen punishes the player who is already behind).
- [Open] How the enrage ramps (numbers). (Whether elites run through the Elite Four phase is resolved, see Cadence above.)
- Built value, for reference (docs/DECISIONS-archive.md 2026-10-19 Overworld Elites BUILT): damage x1.0 to x2.0 over 30 s, starting 60 s after the first hit, no speed bonus. Current value: see js/systems/elites.js.

## 3. Gyms (status per line: see the tags; untagged text keeps its own LOCKED, DRAFT or OPEN marker)
Agreed so far: gate on the map reusing the rift flow (portal, closed arena, stash of map enemies, return), mainline order per region, hand-authored real moves, +4 level offset, sized up, badge package (section 1). Pilot gym is Brock (Kanto).
- [Approved] Gym level (Q7, 2026-10-28): wild level + 4 (LEVEL_OFFSET), locked when the gate spawns and shown on the gate, plus the escalation bump read ONCE at entry (section 3f). (RESOLVED 2026-10-19, section 7; DECISIONS 2026-10-22 gym gate escalation)
- [Approved] A roster slot's evolution stage follows the effective gym level (the locked level plus the escalation bump), read at entry. (docs/DECISIONS-archive.md 2026-10-22 Gym roster data model; settled by Q7, since docs/GYM-ROSTERS.md rules say "the GYM's LOCKED LEVEL") Stage bands are TUNE, current value: see js/data/gyms.js.
- [Approved] Gym cadence (confirmed by Q2, 2026-10-28). Jess's gate spec (2026-10-19): Gym 1 spawns at 4:00; each later gym spawns 4:00 after the previous gym is beaten AND the player has returned to the overworld; gates stay open and are done in order. LOCKED as 'Option A' (2026-10-19): the 30:00 target for Gym 8 is DROPPED. Gym 8 spawns at 4:00 + 7 x (4:00 + fight time), so about 39 to 46 min. Consequence: enemy level sits on the L50 clamp from 30:00 until Gym 8 is beaten (see the enemy level curve in section 1), so Gyms 6 to 8 (about) are all clamp + 4. The slow ramp only starts after the gym list is complete.
- [Open] Arena visuals per type, authored-move data format, move Kind -> telegraphed attack translation, badge boost definitions, Bond reward, Elite Four rewards and level offset, Champion. (Later progress on some of these: the authored-move format is drafted in section 3b and docs/BOSS-AUTHORING.md; the Elite Four level is hard-set, section 4; the Elite Four reward is the badge package without the full revive, section 3g.)

### 3d. Pilot gym: Brock (2026-10-19)
Build rulings, copied from docs/DECISIONS-archive.md 2026-10-19 Brock pilot gym BUILT (LOCKED as built unless marked):
- [Approved] A team wipe in a gym ends the run (the arena no longer throws you back for gyms). No arena timer; the enrage starts 120 s after the first hit (damage x1.0 to x2.0 over 30 s, current value: see js/data/gyms.js). Fury stays off for gyms.
- [Approved] Random legendary rifts are OFF (RANDOM_RIFTS = false in rift.js).
- [Approved] Gym leaders use the PLAYER's version of each move (shape, speed, size, life, spread, pierce, visuals). Only the damage differs: the enemy ratio path with the catalog Power and category. A 0.3 to 0.45 s wind-up (Charge animation plus a ring) telegraphs every move, with the aim locked at its start.
- [Approved] GYM MOVES CARRY UPGRADE STACKS: a leader's move is a player move plus authored upgrade-card stacks (`stacks: { mechanicId: n }` on the move line in js/data/gyms.js), applied through the same G.Moves.addStack rules as the player's cards. The leader's moves also get STAB on its own types. The validator rejects a stack the real rules would refuse.
- [Approved] Gym tuning knobs: each signature may carry power (damage multiplier) and tempo (attack-rate multiplier), default 1, valid in (0, 5]. Brock's values are TUNE, current value: see js/data/gyms.js.
- [Approved] Boss forms built: melee = the player's cone swing, projectile (and any kind without a form yet) = the player's projectile, buff = the player's buff cast. Validation (2026-10-22, docs/DECISIONS-archive.md Gym roster data model): every move kind must be in G.Gyms.BOSS_FORMS; 1 to 4 moves, at least one damaging; unknown fields rejected; ladders checked.
- Superseded detail: the archive entry's Harden description (7% damage cut per stack, 5 stacks, 7 s shared timer) and "Stat stages are NOT built" were replaced by Slice D1 stages (section 3c and docs/COMBAT-RULES.md).
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

### 3f. Gate escalation (LOCKED 2026-10-22, Jess; copied from DECISIONS 2026-10-22, Gym gate is a pressure mechanic)
A gym gate is a pressure mechanic, not come-when-ready.
- [Approved] (confirmed by Q4, 2026-10-28) A gym gate opens, then a GRACE period (37 s, = the current ~per-level wild time, a deliberate "one free level" window) runs with no penalty. After grace, escalation: every ESC_STEP (10 s) BOTH the wild spawn level AND the gym leader's locked level climb by +1. UNCAPPED on purpose (Jess: "if you delay you get fucked"; gates spawn close, so staying out is a choice). A toast fires each tick ("<leader> gets stronger, and so does the world!").
- [Approved] Mechanism: ONE shared integer bump, G.Gym.escBump() (0 during grace / no gate). Read at exactly two sites; G.Stats.levelForTime stays PURE (no bump) so the HUD run level and the gate's own base-level calc do not compound. (1) Wild spawn (enemy.js): PLAIN wild only (not boss/gym/elite) adds bump to HP + atkLvl; level is frozen at spawn, so the map ramps as new mobs spawn in hot (slight lag = intended ramp, not a wall). (2) Gym leader (gym.js makeDef): effective level = locked base + escBump() read ONCE at entry (leader is only built when you walk in) -> the longer you wait, the stronger the leader you face.
- [Approved] Snap-back: on the win (onReturn) the bump clears; new wild spawns read 0 and the map returns to the true run-time level. A "The world calms..." toast fires if the fight was escalated. Wilds already on the map were stashed for the arena, so there is no lingering-hot-enemy carryover.
- [Approved] Reading A (confirmed): the wild bump is a temporary +N offset removed on win, NOT a restore-to-a-frozen-level. "Proper level for the run time" = levelForTime(now) with no bump.
- [Approved] Gauge (readability, genre pattern): the gate shows the escalated level, a grace countdown, then "+N ESCALATING"; the opening notice warns about the 37 s window.
- Deferred (cloud/MP): the escalation clock + bump need host authority and sync. SP-only now.
- Current values (GRACE, ESC_STEP): see js/systems/gym.js.

### 3g. Badges and the gym reward (LOCKED 2026-10-19)
- [Approved] Badge package on a gym win: a run-long boost, a guaranteed item, a guaranteed level, a Bond, and a full team revive to 100% HP (fainted members included). (docs/DECISIONS-archive.md 2026-10-19 Boss rework design)
- [Approved] Each gym badge carries a run-long team stat boost; Boulder Badge = +10% Attack for the whole team (all roster members). Stored in Player.badge, separate from stat cards, read through incOf(). (DECISIONS 2026-10-19 Badge boosts and the gym reward)
- [Approved] The gym leader drops no XP. The win is a toast plus an automatic level bump (guaranteed level, normal level-up cards still open). Item, coins, Bond and full revive unchanged. (same entry)
- [Approved] Gym leaders move at their species speed with no modifiers (Jess, 2026-10-19): no 1.1x chase bonus, no 0.55x circling (boss code kept for non-gym bosses); standing still while casting stays. (same entry)
- [Approved] Elite Four give the badge package WITHOUT the guaranteed full revive (gym leaders keep the revive). (RESOLVED 2026-10-19, section 7; docs/DECISIONS-archive.md 2026-10-19 late morning addendum) Code differs, see TODO: the Elite Four is not built.
- [Open] Badge boost definitions for the other badges (mainline-accurate per region or uniform stat bumps), and what a 'Bond' badge reward means until the Bond rework decides. (docs/DECISIONS-archive.md 2026-10-19 Boss rework design, OPEN list)

## 4. Elite Four phase, Region Complete, Return Home (flow LOCKED 2026-10-19, numbers TBD)
- [Approved] Trigger: Gym 8 beaten and the player back on the map. Then (1) the slow level ramp starts and (2) ALL FOUR Elite Four gates open at once, spread across the map so every gate is off screen from the others. The gate shows its level, and so does the direction arrow that points to it. (confirmed by Q6, 2026-10-28) Code differs, see TODO: the Elite Four and the slow ramp are not built.
- [Approved] Elite Four levels are HARD-SET per encounter (authored in the region data), not clock-based and not wild + 4. The player sees the difficulty and picks the order. Gym levels stay clock-based (wild level + 4).
- [Approved] Region Complete = all 8 gym leaders and all 4 Elite Four defeated (Champion not in Kanto's list for now).
- (Superseded 2026-10-28, history: "Return Home bonus: a multiplier on total run time. Under 60 min raises it, over 90 min lowers it, flat between." Replaced by the completion bonus in section 4a.) Death still commits EVs and progress.
- Keep Going: DEFERRED (feature/continue-option). The loop design is in section 4a. The old idea "XP, damage and HP multipliers all go up each loop" is not adopted, see 4a O6.
- Schedule floor (design note): with 4:00 gaps, Gym 8 spawns at about 39 min even if every gym fight takes 1 min, so the best clear is roughly 45 to 50 min. Skill shows up as short fights and no deaths, not as skipping waits. (Superseded 2026-10-28, history: "Pick the 60 and 90 min bonus marks after the pilot gym gives real fight times.")

### 4a. End of region and loops (2026-10-28, Jess; answers QA-08, Q2 to Q12, A.3-1)
Every rule below is [Approved] and approved, not built (code differs, see TODO: no loops, no Next Region, no completion bonus, no Loop counter exist yet).
- [Approved] A run starts at Loop 1. Loop N fields the first N mons of every gym and Elite Four roster, all at once (section 3e). Six loops per region. Each loop runs the in-region rules unchanged (sections 2, 3, 3f, 3g and 4).
- [Approved] After the fourth Elite Four of Loop 1, the player chooses Return Home, Next Region or Unlock Safeties.
  - Return Home: back to the main menu, with the completion bonus on the rewards.
  - Next Region: the next region's map. Its clock starts at the previous region's end time. The team and all upgrades are kept.
  - Unlock Safeties: same map, the timer continues, Loop becomes N+1, and the gyms and Elite Four run again. The name means only "continue to Loop N+1" (Q8). The performance-scaled (DDA) version from 2026-10-17 is dropped.
- [Approved] After each later loop the choice is Return Home or Keep Going. Return Home pays the completion bonus, escalating per loop completed. Keep Going is Unlock Safeties.
- [Approved] The level clock is uncapped across loops and Next Region (Q5). The L50 clamp applies only until all 8 gyms of the current run are beaten, as in section 1.
- [Approved] The completion bonus (escalating per loop) replaces the 60 and 90 minute time bonus (Q12, A.3-1). Bonus numbers: current value TBD, see BALANCE.md when set.
- [Approved] Later runs in a region may start at any loop already cleared, with the clock at 0:00.
- Pointer: the Legendary Boss after Loop 6, The Climb, Arceus and Descendant Mutation are recorded in GDD.md (B6a).
- [Open] O1. When does Gym 1 of Loop N+1 spawn (4:00 after returning from the fourth Elite Four)?
- [Open] O2. In Loop 2 and later, does the post-gym slow ramp simply continue, and what curve applies to a run started at Loop N from 0:00?
- [Open] O3. Elite Four levels are hard-set; with an uncapped clock in later loops, do they stay at the authored values?
- [Open] O4. Do badge boosts stack again when the same gym is beaten in a later loop?
- [Open] O5. Which loop does Next Region start at (Loop 1?)
- [Open] O6. The old Keep Going idea "XP, damage and HP multipliers all go up each loop": drop it, or keep it as [Proposed]?
- History (superseded, never tagged): QA-08 answer items 3a, 4a and 5 (elite trigger, gym trigger, Elite Four one at a time), overridden by Q3, Q2 and Q6; the DECISIONS.md 2026-10-17 Enemy HP model "PHASE 2" Unlock Safeties text (DECISIONS:226-248, moves to the archive in B8, Q20); docs/FULL-GAME-STRUCT.md:11 inheritor graft (replaced by Descendant Mutation, moves and typing go to another mon, Q9) and Arceus gated on owning every legendary (replaced by The Climb's 9th completion point, Q10).

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
- Post-gym ramp math. (Superseded 2026-10-28, history: "its link to the 60 and 90 min bonus marks (proposal: it should bite noticeably by 90 min so both incentives agree)"; the time bonus is replaced, see section 4a.)
- Elites: enrage numbers and ramp length. (Elites in the Elite Four phase: resolved, see the RESOLVED line above and section 2.)
- Post-gym ramp (deferred): shape and numbers of the slow ramp that starts when the gym list is complete; it also needs the levelForTime change described in section 1.
- Gyms and the rest: see sections 3 and 4.

- 2026-10-19, FEATURE CLOSED: Overworld Elites + Brock pilot gym (Boulder Badge +10% Atk, no leader XP, plain species speed) feel-tested and merged. Remaining work moves to status Slice C, then Kanto roster / Elite Four / Region Complete.
