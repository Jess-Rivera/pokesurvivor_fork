# BALANCE

The living record of tuned numbers so balance stays coherent across sessions and across both tools.
Update this whenever a number is changed, with the date and the reasoning.

Keep it concrete: what the value was, what it is now, and why. A number without a reason is hard to
re-tune later.

---

## Conventions
- One section per system (moves, enemies, upgrades, drops, XP curve, run pacing, ...).
- Format per change: `YYYY-MM-DD, <system>, <field>: <old> -> <new> (<why>)`.
- Reference the genre design reference (survivor-like-design-reference.md) for comparison points
  from Vampire Survivors, Brotato, and Halls of Torment where useful.

## Moves
### Canonical power migration (2026-10-17)
- All 64 moves now carry canonical mainline base power in the `dmg` field (Approach B: field name kept,
  values migrated). Status moves = dmg 0 (they route through the neutral denominator, no A/D ratio).
- DMG_SCALAR: 2.0 -> 0.47 (js/core/stats.js). Reason: median damaging-move power rose from fork ~14 to
  canonical ~60, so the global damage dial is divided by ~that ratio to hold the early hits-to-kill band
  (~3-4, playtest-confirmed pre-migration). 0.47 is median-based; mean-based was ~0.46 (within 2%).
  THIS IS A STARTING POINT: canonical power widened the move-to-move spread (per-move ratio 1.88x-12.86x
  vs fork), so re-tune DMG_SCALAR by feel after playtest.
- Representative canonical powers now in use: tackle 40, ember 40, flamethrower 90, hydro-pump 110,
  leaf-storm 130, hyper-voice 90, psychic 90, bug-buzz 90, poison-sting 15. (Fork values were ~7-34.)
- Annotate-only fields added (ailment/ailmentChance/flinch/statChance) but NOT yet wired; current
  burn/poison/slow gameplay unchanged. The melee x1.2 dmg bump was removed (canonical power is the
  baseline); melee radius/arc x1.25 bumps kept.

## Overworld Elites (feature/boss-rework, built 2026-10-19; all numbers TUNE by the [Elite] TTK readout)
- Species: one BST tier above the highest active wild tier; top tier active means BST 600 to 700. Region-accurate (widens downward inside the region before leaving it), no legendaries, no repeats.
- HP: reference model hp = max(refDps x 25 s, 3 x wild HP). refDps = hit / 0.7 s x (1 + 0.2 x minutes) x 0.7 uptime, hit from a base-40, SpAtk-65 attacker at the run level against the elite's own average Def/SpD. First guess: about 170 HP at 2:00, about 640 at 10:00, about 3150 at 30:00 (4x to 13x a wild unit). No opening HP discount.
- Power x1.5 on the wild ratio attack path. Size 1.5 to 2 (the boss sizing, floor 1.5).
- Enrage: 60 s after the first hit, damage x1.0 to x2.0 over 30 s; no speed bonus.
- Wild cap 32 (50%) and spawn rate 50% for 60 s after an elite spawns, back to 100% over the next 30 s. Excess wild units walk off and are deleted, no XP.
- Reward: XP = wild yield x HP multiplier x 1.2, a guaranteed Berry, 50% chance at an item.
- Cadence (TEMP): 2:00 then every 6:00.
- First feel-test readings (2026-10-19, small sample, NOT used to retune): TTK 2.7 to 15.7 s at 0:10 to 1:11, 7.4 s at 2:10 (HP 169), 3.3 s at 5:00 (HP 273, but Pikachu vs Gyarados was x4 and the screen was nearly empty, so best case; about 21 neutral damage per second against the model's 12). The 10:00 and 20:00 readings were invalid (a stale-clock bug in G.Debug.elite(), since fixed). Jess's call: leave the HP model and power as they are until real playtesting gives more data. Tools for later: G.Debug.skipTo(min), G.Debug.levelUp(n), and the [Elite] readout now prints the type matchup.
- Density Bonus: x1.6 XP while 54 or more are alive, from 180 s (damage part removed).

## Gyms (feature/boss-rework, Brock pilot built 2026-10-19; all numbers TUNE)
- Gate: 4:00, then 4:00 after each return. Level = run-time level at gate spawn + 4, locked.
- HP: the elite reference model with TTK 60 s at the gym level (Brock: about 1030 HP at Lv 12, 16.6x a wild unit). Size up to 2x (boss sizing).
- Damage: ratio path, Power and category from the catalog move (Tackle 40 physical, Rock Throw 50 physical). Enrage 120 s after the first hit, x1.0 to x2.0 over 30 s. Fury off.
- FIRST RETUNE (Jess's feel test, Squirtle dual-weak and Charmander, 'not even a little threatened'): a Lv 12 Geodude hit for 5 to 18% of the player's HP per attack and attacked about once per 2.7 s, so the fight was over before it mattered. Jess's diagnosis: the leader's moves have no upgrades, so he is only a stat level-up. SO the real fix is authored upgrade STACKS per gym move (below). The crude per-gym knobs power (damage multiplier) and tempo (attack-rate multiplier) exist but are back at 1 for Brock so the stacks are measured cleanly. A [Gym] readout prints on a win (and G.Gym.report() after a loss): fight time, total and lowest HP, casts per move. Tune from those.
- FEEL TEST RESULT (Jess, 2026-10-19, with the stacks, at the realistic level 7 to 9 versus Brock's 12): Butterfree level 8 was tough and he died once, not cheap, learnable; Ghastly level 8 about the same. Both felt doable with smart play. The earlier tests were at level 12 (no level gap) and before the stacks, hence 'harmless'. ACCEPTED as the Brock baseline; do not retune without new data.
- Brock's stacks (v1, TUNE): Rock Throw = Effect x3 (+30% Power), Count x2 (3 rocks), Recharge x2, Size x1, Speed x1; Tackle = Effect x2, Area x1, Arc x1, Recharge x2; Harden = Buff Stacks x1 (6 stacks, up to -42%), Duration x1. Rock Throw gets STAB (x1.5) like the player's own-type moves.
- Moves are the player's: Tackle (radius 48 from the body edge, arc 1.7), Rock Throw (260 px/s, size 9, life 1.4 s), Harden (7% damage cut per stack, 5 stacks, 7 s shared timer, so at most -35%). Each is telegraphed by a 0.3 to 0.45 s wind-up.
- Cooldown: catalog period (0.5 x 35 / PP) plus 0.2 to 0.5 s of jitter; status moves keep their catalog cd.

## Run opening (tune/damage, applied 2026-10-18 to 2026-10-19, CLOSED; each change feel-tested by Jess, logs 1 to 4)
- FINAL STATE at branch close (2026-10-19; the dated bullets below are the history and some early numbers were retuned): DMG_SCALAR 1.0; XP_BOOST 2.0 until 180 s; elite bump only after the first boss and at 54+ alive; wild-enemy HP x0.55 to x1.0 over 0 to 180 s; FAMILY_SHARE 0.60 / 0.30 / 0.10 (status class counts as melee); HOLDER_CAP share 0.35, floor 2, rerolls 8; BANDS unchanged (shooter 0.80 / 0.92); BAND_JITTER spread 0.20, recheck 0.3 to 0.7 s; NO standard retreat and NO retreat delay; MORALE killFear 0.35, fearRadiusK 6 x the DEAD enemy's body radius (cap 240 px), fearTau 1.2 s, painTau 1.0 s, painFull 0.6 (stored pain capped there), fearWeight 0.6, painWeight 0.6, panicBelow 0.25, panicFireMul 0.5, meterShow 0.5 (morale = (1 - fearWeight x fear) x (1 - painWeight x pain); ranged back away only while panicking, healers / shielders likewise inside SEEK.alone; the DPS part of morale and the retreat delay were removed); status class enemies are chasers; MIX log record every 5 s.
- 2026-10-18, DMG_SCALAR: 0.47 -> 1.0 (js/core/stats.js). Why: slices A and B removed the unlogged burn that carried half to two thirds of Ember's damage. Check log (Typhlosion L1, region 1): neutral Ember 6.4 to 7.0, super effective 11.3, resisted 3.5 against enemy HP 24 to 30, so 4 to 5 hits neutral, 3 super effective, 6 to 7 resisted (target band 3 to 4). The scalar back-solved from the log is 1.01. Only validated at L1 to L2; a 3-minute log is the next check.
- 2026-10-18, opening XP boost: wild-kill XP x1.0 -> x2.0 from 0:00 until the first boss slot (180 s). Constant XP_BOOST in js/systems/spawner.js, read through G.Spawner.xpBoost(); a "3 Min XP boost!" banner shows for 4 s at run start. Why: two logs showed the first offer at 1:07 and 1:25, only 4 offers and level 5 by 3:38, and kills of 0.27 to 0.40 per second against a spawn demand of 0.9 to 2.3 per second (the offline XP replay had assumed 1.0 to 2.5 kills per second). Replaying log 2 with x2 puts offers near 0:55, 1:30 and 2:30 (rough, it ignores the level term in the yield). Bosses, legendaries and rock drops are excluded. XP_SCALAR (0.035) is unchanged, so the 30:00 level target is not reopened.
- 2026-10-18, elites: spawn bump (x1.25 damage, x1.6 XP) now only applies once the first boss has spawned (bossIdx > 0). Threshold unchanged (54 alive). Why: in both logs the alive count passed 54 at about 1:00, so most early spawns were elites.
- 2026-10-19, opening enemy HP discount (js/data/enemies.js, OPENING_HP_START = 0.55, openingHpK): wild-enemy HP x0.55 at 0:00, rising linearly to x1.0 at the first boss slot (180 s), the same window as the XP boost. Applied inside enemyHp, which has one call site (the Enemy constructor), so HP is fixed at spawn time. Base-65 enemy: 13.2 HP at 0:00 (formula 24), 21.7 at 1:00 (31), 33.2 at 2:00 (39), 46 from 3:00. Neutral Ember (6.4 to 7.0 per hit) goes from 4 to 5 hits to about 2 at the start and about 3 at 1:00. Shields are 35% of max HP, so they scale with it. Bosses are untouched. Why: the two logs showed kills at 0.27 to 0.40 per second against spawn demand of 0.9 to 2.3, a swarm that grew to the cap, and a comparison with the original (2.4 hits at the start rising to 4.3 at 1:00, about 3x faster early leveling). Lower HP raises kill throughput (swarm) and levelling together, which the XP boost alone does not. Reintroduces a time-based HP multiplier after the 2026-10-17 cleanup removed the growth multipliers; this one fades out by 3:00 and is meant as an on-ramp.
- 2026-10-19, spawn mix: FAMILY_SHARE melee / range / support 0.45 / 0.40 / 0.15 -> 0.60 / 0.30 / 0.10 (js/data/enemies.js; same per-tier weighting as before, a family a tier lacks still hands its share to the others, status counts as support). Why: the spawn share was 40% ranged but about 89% of kills in the 229 s log were melee-family (8% ranged, 3% support), so ranged units that hold 0.8 to 0.92 screens out (melee reach is about 50 to 110 px) piled up toward the 64 cap; both Typhlosion faints in the two logs ended on a ranged water shot (x1.6 on a fire starter). Reverses the 2026-10-18 slice 1c spawn-mix ruling (40% shooters). Static for now; a per-tier ramp is the follow-up if needed. The pull-in of the spacing bands (BALANCE slice 1b fallback: shooter 0.62/0.74, zoner 0.58/0.70) and a cull at the cap are held until a MIX log shows whether this was enough.
- 2026-10-19, logger: new MIX record every 5 s of run time (js/systems/log.js, G.Log.mix / G.Log.sample, called from the game loop): enemies alive by family (bosses skipped), how many are within 120 px of you (a proxy for melee reach), and their average distance in screen units. Closes the 'alive-by-class sample' gap in TODO. Shows in G.Log.text and the downloaded JSON as 'MIX' lines.
- 2026-10-19, band jitter (NOT playtested): BAND_JITTER in js/data/enemies.js = spread 0.12, recheck 0.3 to 0.7 s. Why: every ranged unit used the same two band numbers and re-decided every frame, so they all stopped on one line (an ellipse in screen units) and showed as a ring around the player. Each unit now scales both its band numbers by 1 +- 0.12 at spawn (shooter band 0.80/0.92 stays the average, about +-0.10 screens) and decides approach / hold / back away only every 0.3 to 0.7 s (random phase), keeping the last decision in between. Band centres, hold speed (0.1x), retreat speed (0.8x) and the shot gate rule are unchanged; the shot gate now uses the unit's own band. A rough model of the movement rule went from a spread of 0.001 to about 0.06 screens (min 0.71, max 0.95). Tune spread first if the ring is still visible, recheck second.
- 2026-10-19, band jitter follow-up (after Jess's feel test: better, wants more spread and a chance to catch them): spread 0.12 -> 0.20 (about +-0.17 screens on the shooter band), recheck unchanged at 0.3 to 0.7 s, and a retreat delay: a unit with you inside its retreat line holds its ground for a random fleeDelayMin..Max = 0.5 to 1.0 s before it backs away (it can still shoot), resetting when you are no longer inside the line. The retreat itself is unchanged (0.8x its speed against your 158, so once it runs you still close on it). NOT playtested.
- 2026-10-19, morale (NOT playtested; second version after two feel tests): the retreat delay and a panic state are driven by a per-unit morale 0..1 (band-holding ranged units only: fan, beamer, zoner, shooter, summoner; bosses, melee, shielders and healers untouched). Config MORALE in js/data/enemies.js. morale = (1 - fear) x (1 - pain). Fear: when a wild enemy dies, each band-holder within fearRadiusK 6 x the DEAD enemy's body radius (cap fearMaxPx 240) gets killFear 0.35, fading linearly to 0 at that edge; decays with time constant fearTau 2 s. Pain: HP the unit lost recently as a fraction of its max HP (shield damage excluded), decaying with painTau 1.5 s; painFull 0.6 means losing 60% of max HP inside about that window is full pain. Delay = lerp(fleeDelayMin 1.0, fleeDelayMax 1.5, morale) s, so an untouched unit holds 1.5 s and a shaken one 1.0 s. Panic: morale under panicBelow 0.25, re-evaluated at each 0.3 to 0.7 s recheck, fires at panicFireMul 0.5x rate (shot cooldown ticks at half speed). History: v1 included a DPS comparison (your damage vs its); removed 2026-10-19 because the player out-damages a ranged unit in nearly every matchup, so it only pushed everyone toward low morale (two retunes, dpsRef 8 then 30, did not fix the design). The v1 kill radius was a flat 300 px, so units bolted at kills far away relative to their size; now it scales with the body radius of the enemy that died (first attempt used the listener's radius, which was backwards) and fades with distance. The MIX log line shows band-holders, panicking count and average morale. The kill-panic direction (kills make neighbours bolt sooner) works against the chase window, bounded by the 1.0 s floor.
- 2026-10-19, morale retune (Jess: still panics too quickly and for too long): stored pain is now capped at painFull (an overkill hit no longer prolongs panic); fear and pain are worth less to morale: morale = (1 - fearWeight 0.6 x fear) x (1 - painWeight 0.6 x pain), so either alone leaves morale at 0.4 at worst and it takes both together (about 0.85 of each) to get under panicBelow 0.25; decays shortened, fearTau 2 -> 1.2 s and painTau 1.5 -> 1.0 s. Delay (1.0 to 1.5 s) and the 0.5x panic fire rate unchanged. NOT playtested.
- 2026-10-19, standard retreat removed (Jess): a ranged unit no longer backs away just because you are inside its retreat line (band[0], now unused) and there is no retreat delay (fleeDelayMin/Max removed, so morale no longer sets a delay). It backs away (0.8x its speed) ONLY while panicking (morale under 0.25, rechecked every 0.3 to 0.7 s): a panicking unit retreats while inside the outer band line (band[1]) and holds instead of approaching beyond it; a calm unit approaches beyond band[1] and holds inside it, so you can walk up to a calm shooter. Panic still halves its fire rate. NOT playtested.
- 2026-10-19, same rule for healers and shielders (Jess): the SEEK floor retreat (back away below 0.30 screens) is removed; they back away at 0.8x only while panicking and only while inside SEEK.alone (0.55 screens), and a panicking one stands still instead of walking toward its group or you. They now take part in morale: they get fear from nearby kills (same radius rule), pain from HP lost, and panic is rechecked every SEEK.every (0.75 s). Panic halves their weak shot (weakCd); heals and shield casts are unchanged. The existing rule that a group on your side of the floor makes them wait (intoFloor) is unchanged. The MIX line's morale count now includes them. NOT playtested.
- 2026-10-19, panic meter (UI only, no balance change; weights untouched at Jess's request): a thin 2 px purple bar directly under the HP bar of a damaged ranged / healer / shielder unit, shown once it is at least MORALE.meterShow (0.5) of the way to panic (100% = the panic line, so (1 - morale) / (1 - panicBelow); a panicking unit shows it full). Never on bosses or undamaged units. With the current 0.6 weights it will rarely appear.
- 2026-10-19, band-holder ceiling + status chasers (NOT playtested). (1) HOLDER_CAP in js/data/enemies.js = share 0.35, floor 2, rerolls 8, applied in Spawner.spawnOne: when a spawn draw is a band-holder (behavior in BANDS: shooter, beamer, fan, zoner, summoner) and band-holders alive are already at least 2 and would pass 35% of the units alive, the draw is repeated up to 8 times (then accepted). It is relative to what is alive, not to the 64 cap, so it also bites early (at 13 alive it stops at about 4 holders; log 4 had 7 to 8) and at the cap it means at most about 22. Healers and shielders are not counted; bosses are not counted. Why: spawn weights cannot fix it because the ranged units live longer than melee ones (a single starter's move set cannot reach them), so the alive pool drifts toward them (log 4 at 3:30: 27 ranged + up to 10 support vs 9 melee). A toy model (melee leave 5%/step, holders 0.8%/step, 40% of draws holders) went from 56% to 84% holders without the ceiling to a steady 32 to 35% with it; not a game measurement. (2) Status class enemies: BEHAVIOR.status 'ranged' -> 'chase' and FAMILY.status 'support' -> 'melee', because they have no status mechanics yet and were just plain shooters sitting at the shooter band (summoners with a secondary status class are unaffected); revisit in the status-on-player slice. Spawn weights (FAMILY_SHARE) unchanged; with status counted as melee the support 10% is now healer / shielder / summoner only.
- Observed 2026-10-19, log 4 (one Charizard, after the no-retreat / morale changes; Jess: 'felt way better'): survived 3:39 (logs 1 to 3: 0:56 to 1:29), level 8, 278 kills (0.23 kills/s in the first 30 s, 2.0 to 2.2/s at 1:30 to 2:00), level-ups at 0:32, 0:49, 1:17, 1:43, 1:49, 2:21, 3:04. Kill families: 78% melee, 19% ranged, 3% support (ranged spawn share is 30%). Panic never showed in any of the 44 MIX samples (panicking 0 every time; lowest average morale 0.40, about 0.95 to 1.0 from 1:30 on); samples are 5 s apart and panic episodes are short, so brief ones could be missed, but it is effectively inert at weights 0.6 / panicBelow 0.25. Ranged stayed out of reach (0 within 120 px in nearly every sample) and piled up late: at 3:30 ranged 27 alive vs melee 9 (alive 46 to 63 from 3:00), so the cap fills with units that are not engaged and the kill rate fell. Damage taken: 66% contact (bug contact at 1.3 to 1.4 each, resisted 0.6x), 34% shots, and 35 of the 136 total HP lost came from two Nidoking boss shots (flat 17.3 each, no defence step) which also ended the run (30 HP to 12.8 to 0). Not changed.
- Observed, not changed: the 64 alive cap was reached by 1:30 in log 2. The first boss (Exeggutor, flat damage path) hit for 31.6 and 12.8 against 30 to 36 HP mons (boss damage slice). The XP display rounds up (6.55 shows as 7/7), so the bar looks full about 13 s before the level-up.

## Status / DoT (status rework slice A, applied 2026-10-18)
- 2026-10-18, burn damage: 1.6 x stacks x (1 + 0.06 x player level) every 0.5 s, 3 s, up to 8 stacks, applied on EVERY hit -> 1/16 of the enemy's max HP per turn, one state, 4 ticks (G.Enemies.STATUS.burn). Why: the old tick scaled with the player's level, not the enemy's HP, and sat outside the damage model; with a 100% proc Ember reached 8 stacks in about 4 s (33 HP/s at player level 5 against ~22 HP enemies), which is why burn did half to two thirds of Ember's damage in the Arcanine log.
- 2026-10-18, poison damage: 1.2% max HP x stacks + 1 every 0.6 s, 4 s, up to 8 stacks, 100% proc -> 1/8 of max HP per turn, one state, 4 ticks (STATUS.poison). Toxic (badly poisoned: Toxic, Toxic Spikes, the poison trap) -> N/16 on turn N, N capped at 15, 8 ticks (STATUS.toxic); it kills any enemy nobody heals at tick 6 (21/16 of max HP, 12 s).
- 2026-10-18, turn length: 2 s for every status (STATUS rows each have their own `turn`). The faithful anchor is 0.5 s (one Tackle, PP 35, cooldown 0.5 s); 2 s is a deliberate 4x discount because DoT works on a whole crowd with no aiming. Per application: burn 25% of max HP (3.1%/s), poison 50% (6.25%/s).
- 2026-10-18, ailment chance: ignored (every hit applied it) -> rolled per hit from the move's ailmentChance (PokeAPI move_meta): Ember, Flamethrower, Heat Wave, Flame Wheel 10%, Sludge and Poison Sting 30%, Fire Spin 100% (ailment trap). Status moves (Will-O-Wisp, Toxic, Toxic Spikes) always apply. A move rolls at most once per 0.5 s per target (STATUS.rollGap), so a multi-pellet cast and trail/orbit/aura ticks are one roll. Expected burn per Ember hit is now 2.5% of max HP; per Poison Sting hit 15%.
- 2026-10-18, type immunities (mainline, not in PokeAPI): Fire cannot be burned; Poison and Steel cannot be poisoned or badly poisoned. Fire Spin's trap damage rides on the burn flag and ignores the Fire immunity until the trap status exists (slice C).
- 2026-10-18, slice B, Ailment Chance card (G.Mechanics 'ailchance', DPS family): +10 percentage POINTS per stack, additive, capped at 100% (derive clamps). Ember, Flamethrower, Heat Wave and Flame Wheel start at 10% (9 stacks to the cap), Sludge and Poison Sting at 30% (7 stacks). Only those 6 moves can take it; Fire Spin is already 100%, status moves always apply, paralysis/freeze/confusion moves wait for slice C. Why points, not a multiplier: 10% x 1.15 is 11.5%, a dead card. Value check: one stack adds about 2.5% of max HP of expected burn per Ember hit, against roughly 4% of an enemy's HP per hit for a +15% damage card (assumes 3 to 4 hits to kill), so chance cards are weaker until the chance is high. The +10 step is a first guess; raise it to 15-20 if they never get picked.
- 2026-10-18, slice B, DoT strength: burn and poison ticks x (the source move's current Power / its base Power) (G.Moves.dotMul), so Increased Effect and the Type and Kind damage cards strengthen DoT in the same additive pool as direct damage. Attack, Sp. Atk and level do not scale it. Status moves (Power 0) stay at 1.0x. Strongest source wins while the state lasts, a new state starts from its own source.
- Expect: fire starters lose most of their old burn damage (restoring player damage is tune/damage-hp), poison beats burn 2:1 (mainline ratio), Toxic is lethal to everything unhealed. Boss and rift legendary DoT is not special-cased (the boss rework owns it).

## Stat stages (status Slice D1, built 2026-10-19; all numbers TUNE)
- Table: stage -6 .. +6 = x0.25, 0.28, 0.33, 0.4, 0.5, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4. Each application lasts 6 s (G.Stages.DUR) on its own timer; the stage is the sum of the live applications, clamped to +-6.
- Rolls: statChance from the move, one roll per move per target per 0.5 s, then a 2 s lockout for that move on that target. Steady held stage: 100% moves -3; 10% moves about -0.85; 20% (Shadow Ball) about -1.4.
- Wired moves (enemy targets): Speed -1 from Bubble, Bubble Beam, Mud Shot, Bulldoze; Sp. Def -1 from Psychic, Bug Buzz, Shadow Ball, Flash Cannon. Leaf Storm, Metal Claw and Meteor Mash (user stats) are inert until slice E.
- Speed stage goes through the movement shaping (stat x stage, then speedToPx, asymptotes 0.5x to 3.0x): median enemy x0.69 / 0.59 / 0.55 / 0.51 at -1 / -2 / -3 / -6; base-130 enemy x0.70 / 0.54 / 0.43 / 0.32; base-15 enemy x0.97 at -1. Def or SpD at -2 about doubles the damage taken from the player's hits.
- Gym leader Harden: +1 Def per cast, cap = the move's stacks (Brock 6), each application the move's dur (9.1 s with his Duration x1). Offline 60 s fight: peak +3 (x2.5 Def), versus the old flat -42% maximum.

## Enemies
### Slice 1c: shots, support, contact, flanker (applied 2026-10-18)
- 2026-10-18, plain shooter shot life: 2.4 s -> 4.8 s (speed 190 px/s unchanged; G.Enemies.SHOT_LIFE, per class). Fans, beamers, zoners, status and bosses unchanged. Real reach is limited by the 260 px off-view cull.
- 2026-10-18, shielder and healer: band 0.45/0.58 and 0.70/0.82 -> seek the biggest ally group (SEEK table), floor 0.30 screens; new weak shot (x0.5 final damage, every 2.5 s) and weak melee (x0.5).
- 2026-10-18, melee contact: stop at 1.15 x radius sum, hit reach 1.3 x (was overlap at 1.0 x). Bosses unchanged. CONTACT table.
- 2026-10-18, runner -> flanker: fastest non-Tank plain and shooter per tier (was fastest plain/charger); max 2 active; speed max(own, min(own x1.6, 2.0 x player)), retreat same formula x1.2; one strike at x1.2 final damage; 1.5 s hold/retry; rest 1.5 s at 1.15 screens. FLANK table. Lead intercept removed.
- 2026-10-18, Player.hurt: atk.mul applies to the final damage after the defense step (weak support, flanker strike).
- 2026-10-18, spawn mix: per-species equal weight -> weight by family inside each tier (G.Enemies.FAMILY_SHARE: melee 0.45, range 0.40, support 0.15; a missing family gives its share to the others). Why: a 5-shooter Tier 1 cast (14% of casts) meant 56% shooters; now a fixed 40%. Status counts as support. Bag cached per tier state, BAG_UNIT 4.
### Enemy behavior refactor, slice 1 (applied 2026-10-18)
- 2026-10-18, enemy cast, tier cast size: 7 -> 9 per tier (1-2 support, 3-5 melee, 3-5 range, one special and one baseline per family from tier 2). Why: room for the class mix without repeating classes.
- 2026-10-18, enemy runner, speed: x1.6 on the fastest plain -> none (a flag on the fastest plain/charger that is not a Tank; its own speed). Why: speed is species identity (Eevee measured 147 vs 92 px/s). Confirmed in the 2026-10-18 playtest logs (Kadabra 164, Magikarp 130 are plain species speed).
- 2026-10-18, enemy bomber, speed: x1.25 -> none (same reason).
- 2026-10-18, enemy tank: dmg x1.2 / xp x1.3 kept, now a flag from the class table on ANY class (49 species) instead of a walking behavior. Note: the dmg x1.2 is currently ignored by the atkFactor damage path.
- 2026-10-18, charger: values unchanged (aim 0.55 s, dash 0.42 s at 3.4x, 1.1 s recharge, trigger 200 px); added a warning line the length of the dash (playtest: "great").
- Offline check on the real tree: 18,000 tier casts (10 region settings x 6 tiers x 300 runs), zero rule violations, including Kanto and Johto tier 6.

### Spacing bands, slice 1b (applied 2026-10-18)
- 2026-10-18, ranged and support units, hold distance: one shared `def.range x 0.82` (about 156-176 px, hold zone about 20% of range) -> per-behavior bands in screen units (1.0 = screen edge), table `G.Enemies.BANDS` in js/data/enemies.js: fan 0.30/0.40, beamer 0.50/0.62, zoner 0.72/0.82, ranged (shooter, status) 0.80/0.92, shielder 0.45/0.58 (movement only), healer and summoner 0.70/0.82. Retreat 0.8x speed, hold zone creeps at 0.1x, approach at full speed. First guesses, tune by playtest with G.Log.bands(). Why: spacing tells you what a unit is; the old single range froze chased units.
- 2026-10-18, ability gate: `dist < def.range` -> `s < outer x 1.05`. Bosses and rift legendaries keep the old range logic.
- Known consequence: shooters now stand about 307 px sideways / 173 px up or down (16:9), out of reach for melee, dash, cone, beam and chain kits (reach 90-280 px). Fallback if it feels bad: shooter 0.62/0.74, zoner 0.58/0.70.

### Enemy -> player damage (sub-slice C) — applied 2026-10-17
- Enemy damage now uses the mainline A/D ratio (mirror of player sub-slice B): enemy real Atk/SpA
  (stats[1]/[3], category = higher stat) scaled to enemy level-for-time, vs player Def/SpD (stats[2]/[4]).
- ENEMY_DMG_SCALAR = 0.5 (js/core/stats.js). Started at 0.35 (early hit ~5.7% of L1 HP, matching the
  measured original ~6.1%), but playtest read as too soft vs SMALL mobs (density-based threat needs a
  crowd; a thin mob left frail mons like Charmander barely scratched at ~7%/hit). Bumped 0.35 -> 0.5
  on 2026-10-17 (frail-mon hit now ~8-10% of HP). Mewtwo still tanks (defense path confirmed working),
  so this raised the overall level without breaking bulky-vs-frail differentiation. Still tune by feel.
- ENEMY_POWER = 40 — flat PLACEHOLDER (no per-enemy move yet). Temporary until enemies draw canonical
  move power. All enemy attacks (contact/shot/hazard) share this flat power; species variety comes from
  the real Atk/SpA stat, not from power (yet).
- Natural ramp (chosen): single-hit absolute damage grows with enemy level (1.4@L1 -> 6.9@L50 for a
  base-65 enemy), but as a %-of-HP it EASES for a player who keeps pace (5.7% -> 2.7%). Late-game threat
  is intended to come from enemy DENSITY, not per-hit lethality.
- Scope: WILD enemies only. Bosses keep their bespoke flat def.dmg (atkFactor null) until a boss slice.
- Non-enemy damage (lava, altar, Judgment, burn/poison DoT) is unchanged/flat — does NOT use the ratio.

## Upgrades
(none tuned yet) 2026-10-18: the old in-run stat cards and move evolutions were removed; the new stat cards and mechanic cards (slice 2) get their first numbers then, from G.Log.pacing().

## Drops / economy
(none tuned yet)

## XP curve / run pacing (feature/xp-curve, applied 2026-10-18)
- Cost: mainline Medium Fast, total n^3. xpToNext(L) = 3L^2 + 3L + 1 (G.Stats.xpToNext): L1 7, L10 331, L20 1261, L50 7651. Replaced floor((8 + 6L + 1.6 L^1.75) * 4).
- Yield per wild kill: XP_SCALAR * ((bx * Le / 5) * ((2Le + 10) / (Le + Lp + 10))^2.5 + 1) * xpMul (G.Stats.xpYield, computed in Enemy.die). bx = species base_experience (pokedex.js "bx", 966 species, 36 to 608).
  Le = enemy spawn level (levelForTime), Lp = highest player level at the kill.
- XP_SCALAR = 0.035 (the one XP knob, js/core/stats.js). Jess chose 0.035 over 0.044 because 63 levels at 30:00 was too fast (that was the Gen 1-4 variant); target is roughly level with the waves at 30:00.
- xpMul: tank 1.3, elite 1.6, shiny 5, golden 2, summoner minion 0.25. Bosses and Judgment legendaries keep flat def.xp (untouched on purpose).
- Orbs: xpBig when value >= BIG_XP_SHARE 0.05 of the lead player's xpNext (pickup.js). Rock drop = 1% of xpNext (world.js).
- Offline replay (real functions + real bx, tier BST bands, K 0.035), player level at 0:19 / 1:00 / 5:00 / 10:00 / 20:00 / 30:00: 1.0 kills/s 2/3/10/19/32/43, 1.7 kills/s 2/4/12/21/36/49, 2.5 kills/s 2/4/13/23/40/54.
  Enemy level 1.5 / 2.6 / 9.2 / 17.3 / 33.7 / 50. NOT yet validated against a real run: retune K from G.Log.pacing().

## HP (base-stats feature, slice 2: player HP) — slice applied 2026-10-17
Player max HP now comes from the real mainline HP formula, scaling with in-run level (1:1 run level
= mainline level). Enemy HP is NOT yet converted (still the tier-scale model); that is the next slice.
- Formula (js/entities/player.js hpForLevel): HP = (floor((2*baseHP + IV + floor(EV/4)) * L/100)
  + L + 10) * HP_SCALAR. baseHP = stats[0]. IV/EV = 0 (deferred).
- HP_SCALAR = 2.0 (chosen deliberately lean via the full-formula tuner; starting floor is low on
  purpose, to be balanced up later with healing + enemy-damage passes).
- Resulting player HP (IV/EV 0): median mon (baseHP 65) L1=24, L10=66, L25=134, L50=250. Run growth
  ~10x L1->L50. Reference: Shuckle(20) L1=22/L50=160; Snorlax(160) L1=28/L50=440; Blissey(255) L1=32/L50=630.
- Level-up behavior: Option A (leveling adds the max-HP gain to current HP too, a small heal each level).
- KNOWN lean-state after this slice (intended, not a bug): early game is fragile (24 vs old flat 99),
  and flat heals/regen still feel strong early / weak late. Fixed by the deferred healing %-conversion.
- perks.hp (flat HP upgrades) still adds on top of the formula.

## Enemy HP (base-stats feature, slice 3: wild enemies) — slice applied 2026-10-17
Wild-enemy HP now uses the SAME mainline formula + HP_SCALAR 2.0 as the player, from the enemy's
real base HP (stats[0]), at a level derived from run time. A base-65 enemy and a base-65 player mon
have identical HP at the same level (consistency goal met).
- js/data/enemies.js: levelForTime(t) = 1 + 49*clamp(t/1800,0,1)  (linear L1 at 0:00 -> L50 at 30:00,
  then holds at 50 until Phase 2). enemyHp(baseHP,t) = (floor(2*baseHP*L/100)+L+10)*2.0.
- Resulting wild-enemy HP (base 65): 0:00=24, 5:00=60, 10:00=99, 15:00=137, 30:00=250.
- REMOVED (all HP multipliers; HP is now purely the formula): tier.hp flat templates, the baseHp()
  reverse-derivation on the HP path, scale(t).hp ramp (1+t/95), the spawner density hpK (3.3-5x),
  the elite x1.6 HP bump, tank/bomber/runner role HP mults, and the co-op scaleHp on HP (dormant with
  deferred MP). dmg/spd ramps and dmg/xp elite/role mults are UNCHANGED (damage is a later slice).
- Magnitude note: this makes enemies ~2x less tanky early rising to ~100x less by 30:00 vs the old
  stacked-multiplier model. Intended: enemies are NOT balanced against player damage yet, so they will
  feel trivially easy this slice. Enemy damage + density/reward balance are later slices.
- Scope: wild enemies only. BOSSES keep their bespoke BOSS_SLOTS hp (def.hp * bossScale) for now.
  Rift legendary untouched (rifts planned for removal).
- Future elite: NOT an HP multiplier — it will be "current enemy level + X" (a higher-level spawn),
  so HP falls out of the formula. (DECISIONS.md.)

## Movement / Speed stat (base-stats feature, slice 1) — LOCKED 2026-10-17
Tunables for the Speed -> movement identity model (see docs/stat-model-design-notes.md). Chosen by
feel with the interactive tuner over the real 966-species roster:
- SPEED_MEDIAN = 65 (VERIFIED from the 966-species roster and default-forms API; the design doc's
  original 70 was the all-forms median and is wrong for this game). Denominator of r = Speed / SPEED_MEDIAN.
- BASE_PX = 107 (px/s at r = 1.0; the old `78 + 0.42*Speed` value for a median mon). Unchanged feel for
  a typical mon; shifts the whole cast at once if changed.
- k (slope at median) = 1.0.
- Transfer bounds: lower 0.5x, upper 3.0x. These are ASYMPTOTES the tanh saturates toward, not values
  mons reach. g(r) = exp(w * tanh(k * ln(r) / w)), w_up = ln(3.0), w_dn = ln(1/0.5)=ln2.
- Resulting felt range on the real cast: ~54 px/s (Shuckle, base Spe 5, floored at 0.5x) to ~250 px/s
  (Regieleki, base Spe 200, r=3.08 -> g=2.33). ~4.6x felt spread (old game was ~1.6x). Median mon = 107.
- Reference points (k=1.0): Spe100 Charizard 161, Spe130 Mewtwo/Jolteon 198, Spe160 Ninjask 225.
- Watch item: 3.0x upper mostly gives Regieleki a dramatic solo top (250); next fast tier sits ~210-225.
  If fast mons feel slippery/hard to control at high density, the upper bound is the first knob to lower.

## 2026-10-18 — fix/attack-calc slice 1 (needs playtest)
- Expect player->enemy damage down ~15-18% from 1:00-10:00 (defender level fix), fading to 0 at level parity. Kill times rise accordingly; DMG_SCALAR retune is tune/damage-hp, last.
- Fractional enemy HP removes rounding noise (average damage unchanged).

## 2026-10-18 — fix/attack-calc slice 2 (needs playtest)
- Flamethrower / Bubble Beam x0.333 per pellet (3 landing = canon power; point blank 2.3x). Razor Leaf x0.475, Psycho Cut x0.5, Bonemerang x0.9. Accuracy-only: Hydro Pump x0.8, Fire Spin x0.85, 0.9 on Heat Wave/Leaf Storm/Rock Throw/Rock Slide/Meteor Mash/Toxic, 0.95 Mud Shot/Metal Claw.

## 2026-10-18 — fix/attack-calc slices 3a+3b (needs playtest)
- Cooldowns from PP: Ember 0.52->0.70, Water Gun 0.44->0.70, Thunder Shock 0.40->0.58, Flamethrower 0.70->1.17, Hydro Pump 1.5->3.5; Tackle unchanged. Starters fire 25-40% slower; DMG_SCALAR retune (tune/damage-hp) is what restores it.
- Sustained budget (power*acc/period) spans 25-120/s, median 69; lowest Hydro Pump 25, Fire Spin 26, Leaf Storm 33. BETA is one constant in moves.js.
- Orbit per pass: Gust x1.50, Fire Spin x0.64, Leaf Storm x0.155. Flame Wheel x0.357 per puddle pulse.

## 2026-10-18 — fix/attack-calc slice 3c (needs playtest)
- Swap rule: independent cooldowns + 0.4 s hold. Swapping no longer speeds up cooldowns; banked moves fire on swap-in. Watch: does 0.4 s feel right, do dropped presses feel bad (buffer is the fix).

- BADGE BOOST (2026-10-19): Boulder Badge +10% Atk for the whole team, same multiplier path as an Atk stat card (additive with cards). Leader XP is 0 (the free level replaces it).
- GYM SPEED (2026-10-19): plain species speed only (Geodude 57 px/s); the old boss 1.1x chase and 0.55x circling no longer apply to gyms; Fury already off.
