# MOVE-INTENT, per-move rulings

- **Role:** The single home for rulings about specific moves (QA-04). Filled in Phase 4 batch B4a from the sources named in the filling note below.
- **Owns:** Per-move intended behavior, keyed by move id, for moves that need specific disambiguation. Moves with no entry here are defined solely by the move data file.
- **Does not own:** General combat rules (docs/COMBAT-RULES.md); move data grammar (docs/MOVE-AXIS-SCHEMA.md); runtime pipeline rules (docs/current feature planning/combat-architecture.md); validation scenarios (docs/current feature planning/combat-validation-and-handoff.md).
- **Status home:** docs/current feature planning/move-schema-post-auth/slice-overview.md.
- **Last reconciled:** 2026-10-28 (B4a), against js/data/move-attributes.js and the resolved G.MoveDefs.

Precedence: a ruling here beats docs/COMBAT-RULES.md and grammar defaults for the named move, but cannot require anything the grammar cannot express. If a ruling needs something the grammar cannot express, it is recorded as an [Open] grammar gap.

Name collision: the planned file move-intent-scenarios.json (combat-validation-and-handoff.md section 1.4) is a different file. It holds validation scenarios, not rulings.

Tags are defined in CLAUDE.md: [Approved], [Legacy behavior], [Proposed], [Open].

## Per-move rulings

Filled 2026-10-28 (Phase 4 batch B4a) from docs/current feature planning/move-consistency-review.md section 9, combat-validation-and-handoff.md sections 2.3 and 2.5, and the slice-3d, slice-4b and slice-4c decision sections. Keyed by move id, alphabetical. Numbers are current data unless a ruling fixes them; current values: see js/data/moves-generated.js and js/data/move-overrides.js.

### aqua-jet
- [Approved] Priority is ignored as a mechanic: the mainline priority field has no runtime meaning. It imports by its shape and power alone. (Jess, 2026-11-01, Kanto import rulings set 4)

### aqua-ring
- [Approved] Aqua Ring is a persistent aura (combat-architecture:H25): while its slot is in the active group and the owner is not stunned it heals 1/16 (6.25%) of max HP every 2 s, the mainline 1/16 per turn on the fork's 2 s turn (3.125% max HP/s). A slot swap, a stun or a faint ends it; coming back starts a fresh tick clock. No cooldown, no duration. (Jess, 2026-10-31; PokeAPI aqua-ring: 1/16 per turn until the user leaves the field)
- [Superseded 2026-10-31] Aqua Ring heals 6.25% max HP/s, 8 s per cast on an 8 s cooldown, accepted. (review 9.9 S6)
- Ledger: B4-I01

### attract
- [Approved] New ailment, infatuation: an infatuated foe sometimes skips attacking (a paralysis-like skip). (Jess, 2026-11-01, Kanto import rulings set 3)
- [Proposed] Gender is not tracked, so it works on any target; skip chance 50% per attack (mainline), for a status Duration.

### aura-sphere
- [Approved] Its reach (about 160 px by the curve math) is fine, verify only. (slice-4c.md decisions, Jess 2026-10-27; review 9.7 item 6) Verified in slice 4c-3: 159.5 px measured at dt 1/60, 159.3 at 1/30.
- Ledger: B4-I02

### aerial-ace
- [Approved] Teleport to the nearest enemy's centre, capped by range 420 and walls; the 46 px hitbox is live for its 0.1 s, knockback 80 away from the landing point, 50% confusion. No return and no movement lock. i-frames: 0.3 s once from the cast, not re-raised (4c-2 handoff test 6). Built in slice 4c-2.
- [Approved] A rooted commitment holds the teleport too, the same as Quick Attack: it waits and casts as the root ends. (Jess, 2026-10-29) Built (4c-2 review).
- Ledger: none (entry added 2026-10-29 by the 4c-2 build)

### baton-pass
- [Open] Waits on the open stage-manipulation decision (STATE.md). When ruled, it also clears the swap lock like u-turn. (Jess, 2026-11-01, Kanto import rulings set 2)

### bonemerang
- [Approved] Two bones out and back, hitting on both legs. (combat-validation 2.5 scenario 2; review 9.1 Q2)
- [Approved] Per-move `delivery.range` 230 px; the 2 s time cap stays as a safety net. (review 9.3 F2)
- [Approved] The return-leg knockback pulls enemies toward the caster (the back leg's travel direction). The pull is clamped so an enemy never ends past the caster's edge. (slice-4c.md decisions, Jess 2026-10-27; closes review 9.5 S12) Built in slice 4c-2.
- Ledger: B4-I03

### bounce
- [Approved] As fly: vanish with i-frames, then strike; keeps its paralysis rider. (Jess, 2026-11-01, Kanto import rulings set 4)

### bubble-beam
- [Approved] A still emitter at the caster fires 7 bubbles one after another, one every 0.075 s, all on the aim line (spread 0), about 25 px apart at 330 px/s, so the volley reads as a stream. Each bubble carries the payload (damage, 10% Speed -1). (Jess, 2026-10-31, slice 6 batch 1) Scenarios: bubble-beam-stream, bubble-beam-volley, bubble-beam-hit.
- [Approved] Each bubble weaves on its own sine, amplitude 10 px at 1.5 Hz (was 18 px at 3 Hz, whose 339 px/s side speed outran the 330 px/s travel and looked odd). 10 px keeps a close enemy inside the 17 px contact reach. (Jess, 2026-10-31, slice 6 batch 1)
- [Approved] Cards follow the emitter shape (D-CARDS): Count Up applies (+1 bubble per pick, cap +3); Reach Up no longer does, since the root is a still emitter. (Jess, 2026-10-31, slice 6 batch 1)
- Ledger: none (entry added 2026-10-31 by slice 6 batch 1)

### bug-bite
- [Approved] cd 0.42 (written to move-overrides.js); berrySteal stays a stub. (review 9.4 C10, 9.5)
- Ledger: B4-I04

### bug-buzz
- [Approved] No per-move cap on its foe Sp. Def -1: each enemy's tracker climbs -1 per Gate while it stays in the aura and ends one Duration after it leaves (COMBAT-RULES "Stat stages", SS2 and SS4). Supersedes the 2026-10-28 CP3 cap of 1 and the 2026-10-29 "marked once, never stacks" reading. (Jess, 2026-10-30)
- [Approved] The Sp. Def drop has no chance field, so it applies at 100% on every eligible hit (move-consistency-review:CP1-Q14). The source's 10% was dropped on purpose in the 2026-10-24 conversion. (Jess, 2026-10-29)
- [Approved] Cadence stays rehit 0.5 at full power per tick (about 180 Power/s to every enemy within 120 px, roughly 3.5x legacy). Not retuned now: it is a throughput outlier for the slice 6 balance pass (move-consistency-review S1). (Jess, 2026-10-29)
- Ledger: B4-I27

### bullet-punch
- [Approved] Priority is ignored as a mechanic: the mainline priority field has no runtime meaning. It imports by its shape and power alone. (Jess, 2026-11-01, Kanto import rulings set 4)

### counter
- [Approved] Stance window: casting opens a short window; PHYSICAL damage the user takes inside it is sent back x2 to each attacker that dealt it (mainline x2). (Jess, 2026-11-01, Kanto import rulings set 1)
- [Proposed] Window 1.0 s; a hit landed inside the window is reflected once, at its final damage after the user's own reductions.

### dig
- [Approved] As fly: vanish with i-frames, then strike. (Jess, 2026-11-01, Kanto import rulings set 4)

### disable
- [Approved] Blocks the target's casting for a while; on a gym leader it locks the move it used last. (Jess, 2026-11-01, Kanto import rulings set 3)
- [Proposed] Duration 4 s.

### discharge
- [Approved] Each of the two rings grows to 110 px (was 220) at 275 px/s, so it still blooms in 0.4 s. Jess asked for "area way less" after the movechecker pass; half is the reading he approved. (Jess, 2026-10-31, slice 6 batch 1) Scenarios: discharge-size, discharge-double.
- Ledger: none (entry added 2026-10-31 by slice 6 batch 1)

### dive
- [Approved] As fly: vanish with i-frames, then strike. (Jess, 2026-11-01, Kanto import rulings set 4)

### double-team
- [Approved] Raises the user's evasion stage +1. Evasion is a new stage tracker: incoming hits get a miss chance from the mainline accuracy/evasion table (stage n of evasion: hit chance 3/(3+n)); a miss deals nothing and applies no rider. (Jess, 2026-11-01, Kanto import rulings set 1)
- Needs a COMBAT-RULES change: evasion and accuracy stages join the tracker model (see "Stat stages").

### dragon-dance
- [Approved] No per-move exception: COMBAT-RULES "Stat stages" applies, one tracker each on Attack and Speed, +1 per climb; as a pure buff move it has no cooldown of its own and casts when its Gate opens (SS1, SS8). The 2026-10-28 CP3 exception to DECISIONS:Q13 (raises shorter than the cooldown, maxStacks floor 1) is retired with Q13 and maxStacks. (Jess, 2026-10-30)
- Ledger: B4-I05

### dragon-rage
- [Approved] cd 3.5 (move-overrides.js), not the legacy 1: flat 40 to everything in its 250 x 30 band, so it fires about 3.5x less often than today. Playtested in batch 1. (Jess, 2026-10-29, Stage 0 cd ruling)

### dream-eater
- [Approved] Sleep only: it damages and drains 50% of the damage dealt only from sleeping targets; awake targets take nothing (it pairs with Hypnosis, Sing, Spore). (Jess, 2026-11-01, Kanto import rulings set 2)

### electro-ball
- [Approved] Mainline: power from the user's Speed over the target's (ratio 4+ = 150, 3+ = 120, 2+ = 80, 1+ = 60, under 1 = 40), live stats with stages. (Jess, 2026-11-01, Kanto import rulings set 3)

### explosion
- [Approved] Real faint: the caster faints after the blast, on both sides. The player's team auto-swaps to the next living member (the normal faint rule); if it was the last, the run ends (Re-Do still applies). A gym leader's mon faints for real. (Jess, 2026-11-01, Kanto import rulings set 1)
- [Proposed] A wide area blast around the caster; mainline power 250, the target's Defense as normal.

### extreme-speed
- [Approved] Priority is ignored as a mechanic: the mainline priority field has no runtime meaning. It imports by its shape and power alone. (Jess, 2026-11-01, Kanto import rulings set 4)

### fake-out
- [Approved] Real-time analog of "first turn only": its flinch lands only on the first cast after this Pokemon enters the field (run start or a swap-in); later casts are plain damage. (Jess, 2026-11-01, Kanto import rulings set 2)
- [Proposed] Flinch 100% on that first cast, mainline power 40.

### feint
- [Approved] Hits through a Protect-style guard window and ends it. Until Protect is ruled (set 3, new status mechanics) it imports as a plain quick hit. (Jess, 2026-11-01, Kanto import rulings set 2)

### fire-spin
- [Approved] Burn at the full standard length (half-burn dropped), trap, no strip. The persistent orbit damage stays as authored. (Q17; QA-10)
- New-path data already matches: damage, burn 100% and trap 100% on the foe (slice-4c-1-codehandoff.md:10, :46). The trap and burn rules themselves are in docs/COMBAT-RULES.md "Trap, enemies" and "Damage over time".
- History (removed in slice 7b-2a, 2026-11-01): the legacy path stripped every beneficial stat stage and burned for half the normal length (`strip`, `burnHalf`).
- Ledger: B4-I06

### fairy-wind
- [Approved] Loop-de-loops travelling out: each of the 3 shots (emitted 0.08 s apart, spread 0) rides path.loop, radius 70 px at 0.6667 loops per s, centred on a base point that drifts straight along the aim at 90 px/s, so the first loop goes round the caster and the shot makes 2 full loops in its 3 s flight, peaking about 280 px out (top speed about 383 px/s). It starts at the top of its loop, one radius across from the caster; all 3 ride the same path. About 15 shots are alive at once at the 0.583 s cd. Supersedes the first build the same day (radius 50, 1.6667 Hz, 170 px/s, 1.2 s, loop hanging off the caster), which Jess found too fast and too low. Replaces the 2 rad/s curve at 340 px/s, which only bent the shot. Runtime rule: combat-architecture D38. (Jess, 2026-10-31, slice 6 batch 2, shape C; retuned after the feel test) Scenarios: fairy-wind-loop, fairy-wind-burst.
- [Approved] Cards: Velocity Up raises the base drift only, so the loops stretch and reach farther; no card scales the loop itself. (Jess, 2026-10-31, slice 6 batch 2)
- Ledger: none (entry added 2026-10-31 by slice 6 batch 2)

### fissure
- [Approved] Wild only: each WILD enemy it hits has the mainline 30% chance to be KO'd outright; bosses, gym leaders, elites and the player never are and take a heavy fixed-power hit instead. A gym leader may cast it at the player as that heavy hit. (Jess, 2026-11-01, Kanto import rulings set 2)
- [Proposed] Fallback power 120 (ground area).

### flail
- [Approved] Mainline curve: power from the USER's live HP fraction at each hit, mainline bands (HP over 68.75% = 20, 35.42% to 68.75% = 40, 20.83% to 35.42% = 80, 10.42% to 20.83% = 100, 4.17% to 10.42% = 150, under 4.17% = 200). (Jess, 2026-11-01, Kanto import rulings set 1)

### flamethrower
- [Approved] Caster-state commitment: slowed plus freeze(all) for its 1.0 s cone. Built. (review 9.9 S13, S14)
- [Approved] aimTrack is implemented and changes Flamethrower (the data already says it tracks). The aimTrack target rule is sticky: the cast target while it lives and is in range, then the nearest, re-picked whenever lost. (slice-4c.md 4c-3 decisions, Jess 2026-10-27) Built in slice 4c-3.
- [Approved] "In range" for tracking means within the cone's reach, min(range 420, 250 + the enemy's radius), the same limit as its cast gate. An enemy that walks past reach is dropped and the nearest within reach re-picked; with none the heading holds. (Jess, 2026-10-29) Built in slice 4c-3.
- Ledger: B4-I07

### fly
- [Approved] A movement skill, never autocast (special handler flight): its slot key (or a tap on its icon) gives 4 s of flight at normal walk speed, then a 20 s cooldown counted from landing. No damage. It never becomes the active slot and never bonds. In the air: walls, objects, liquids, traps, springs and altars do nothing; enemy contact, shots and gym leader moves miss; status damage over time still lands; your own moves pause (no casts, every slot timer frozen; persistent groups end as on a slot switch); team swaps are locked. No takeoff while asleep, frozen or committed to a move. Landing: on floor or a liquid you stay and the tile works on you from the next frame; on a wall you pay 1/16 max HP once and go to the nearest floor; on a solid object you move on along your heading to the first free spot. A flyer stays inside a gym arena's circle. Scenario fly-pressed. (Jess, 2026-11-02)
- [Superseded 2026-11-02] Two-turn as delay plus i-frames: the user vanishes with i-frames, then strikes where it lands. (Jess, 2026-11-01, Kanto import rulings set 4)
- [Superseded 2026-11-02] Vanish about 0.8 s.

### focus-energy
- [Approved] Raises a crit-rate stage on the user (mainline +2), a new tracker beside the five stat stages. (Jess, 2026-11-01, Kanto import rulings set 3)

### focus-punch
- [Approved] A charge before the hit; taking a hit during the charge cancels the cast (the cooldown still runs). (Jess, 2026-11-01, Kanto import rulings set 2)
- [Proposed] Charge 1.0 s, mainline power 150.

### foresight
- [Approved] Cancels the target's evasion stages (resets them to 0 and blocks raises) for its duration; the Ghost immunity part follows the type chart rules. (Jess, 2026-11-01, Kanto import rulings set 1)
- [Proposed] Duration matches a stat-stage Duration (COMBAT-RULES "Stat stages").

### foul-play
- [Approved] Mainline: damage uses the TARGET's Attack (and its Attack stages) in place of the user's, through G.Stats. (Jess, 2026-11-01, Kanto import rulings set 3)

### future-sight
- [Approved] The hit lands at the marked spot after a delay. (Jess, 2026-11-01, Kanto import rulings set 4)
- [Proposed] Delay about 2 s.

### grass-knot
- [Approved] Mainline: power from the target's species weight (under 10 kg = 20, 10+ = 40, 25+ = 60, 50+ = 80, 100+ = 100, 200+ kg = 120). Weight comes from pokeapi-master into the dex as a new field. (Jess, 2026-11-01, Kanto import rulings set 3)

### gust
- [Approved] Per-shot spread: the 3 projectiles fire at once as an even fan using the existing `spread` field (the total fan), not the legacy +-0.03 jitter and not a new aim-jitter field, so the three shots read as separate. Fan width 0.5 rad total, so shots at -0.25, 0 and +0.25 rad. (Jess, 2026-10-30, D-GUST and the approved slice 4d plan; review 9.4 C4, 9.7 item 4) Built in slice 4d.
- [Approved] cd 0.7, hand-set in js/data/move-overrides.js: the 0.5 formula cd felt too fast in the movechecker pass. Supersedes the 2026-10-29 Stage 0 ruling of cd 0.5 (formula, not the legacy 0.26; Gust is a cast that emits 3 projectiles with a normal cooldown, not an orbit with a re-hit). (Jess, 2026-10-31, slice 6 batch 1) Scenario: gust-cd.
- Ledger: B4-I08

### hail
- [Approved] PARKED as a toggle skill item; setWeather tested through a synthetic move. Its cd 1.2 vs duration 10 (review S6) is owned by the parked Hail toggle item. (review 9.9 S2, 9.7 item 6)
- Ledger: B4-I09

### heat-wave
- [Approved] Heat Wave is a wave: a band 16 px deep across the aim, 60 px wide, that travels 300 px/s at the nearest foe and widens 0.667 px per px travelled to 260, ending at 1 s (about 300 px). Passes through every foe, each hit once; 10% burn. It replaces the full ring growing to 250 px. The range upgrade stretches its width, not its depth. Scenario heat-wave-wave. (Jess, 2026-11-02, waves)

### hex
- [Approved] Doubles POWER (inside the attacker half, not a final x2) on a major ailment (paralysis, freeze, sleep, burn, poison, toxic; confusion and trap do not count), checked on every chain hop. Built. (review 9.1 Q9; slice 4b S8; combat-architecture D13)
- Ledger: B4-I10

### high-jump-kick
- [Approved] A dash strike; if it hits nothing, the user takes crash damage of 50% of its max HP (mainline). (Jess, 2026-11-01, Kanto import rulings set 2)

### hone-claws
- [Approved] Raises Attack +1 and the user's accuracy +1 (accuracy cancels foe evasion stage for stage, mainline table). (Jess, 2026-11-01, Kanto import rulings set 1)

### hyper-beam
- [Approved] After firing, the user's moves are locked for a recharge window (a lockout beyond today's cast commitment). (Jess, 2026-11-01, Kanto import rulings set 4)
- [Proposed] Recharge about 1.5 s.

### ice-beam
- [Approved] No per-move cap on its foe Speed -1: it climbs -1 per Gate on each enemy it keeps hitting (COMBAT-RULES "Stat stages", SS2 and SS4). Supersedes the 2026-10-28 CP3 cap of 1. (Jess, 2026-10-30)
- Ledger: B4-I28

### ice-shard
- [Approved] Priority is ignored as a mechanic: the mainline priority field has no runtime meaning. It imports by its shape and power alone. (Jess, 2026-11-01, Kanto import rulings set 4)

### karate-chop
- [Approved] Karate Chop is Fighting. (review 9.1 Q11)
- Ledger: B4-I11

### leaf-storm
- [Approved] Persistent. (review 9.2 C13)
- [Approved] Its self Sp. Atk -2 follows COMBAT-RULES "Stat stages" on the Self-drop Gate (SS12, 12.0 s at base): -2 at 0 s, -4 at 12 s, -6 at 24 s while it keeps hitting, and it ends one Duration (6.1 s) after the last hit, including after the move stops being active. The team Gate and Duration cards act on it too (SS10). Swapping off is a reward, not a requirement: at -6 it still hits at about Ember level (docs/proposals/stat-stage-model.md, design intent). Supersedes D-LEAF and the review 9.8 D-2 hold at -2. (Jess, 2026-10-30)
- Ledger: B4-I12

### light-screen
- [Approved] As reflect, for special damage. (Jess, 2026-11-01, Kanto import rulings set 4)

### lock-on
- [Approved] The user's next hits ignore the target's evasion (and the user's own accuracy drops) for a window. (Jess, 2026-11-01, Kanto import rulings set 1)
- [Proposed] Window 2 s on the targeted foe (mainline: the next move).

### mach-punch
- [Approved] Priority is ignored as a mechanic: the mainline priority field has no runtime meaning. It imports by its shape and power alone. (Jess, 2026-11-01, Kanto import rulings set 4)

### magnet-rise
- [Approved] Timed immunity to Ground moves and ground hazards for the user. (Jess, 2026-11-01, Kanto import rulings set 3)
- [Proposed] Duration matches a stat-stage Duration.

### meteor-mash
- [Approved] The projectile hits enemy 1. At enemy 1's position at impact, a 3-projectile fan is emitted that ignores enemy 1. Emit `count` 1, child `space.count` 3. (review 9.2 D-3; combat-validation 2.5 scenario 3)
- [Approved] Its Attack raise is scope `team`, matching Metal Claw. APPLIED (commit a68a366). (review 9.1 Q15)
- [Approved] No per-move rule: its Attack raise follows COMBAT-RULES "Stat stages" (one roll per cast on its first enemy hit, SS2). Its maxStacks 1 was removed in slice 5a (2026-10-31). (Jess, 2026-10-30)
- Shards deal full parent power: combat-architecture H13.
- Ledger: B4-I13

### metal-claw
- [Approved] No per-move rule: its Attack raise follows COMBAT-RULES "Stat stages" (one roll per cast on its first enemy hit, SS2). Its maxStacks 1 was removed in slice 5a (2026-10-31). (Jess, 2026-10-30)
- Ledger: B4-I14

### minimize
- [Approved] As double-team, evasion +2 (mainline). (Jess, 2026-11-01, Kanto import rulings set 1)

### mirror-coat
- [Approved] As counter, for SPECIAL damage taken: a short stance window, damage taken inside it sent back x2 to the attacker. (Jess, 2026-11-01, Kanto import rulings set 1)
- [Proposed] Window 1.0 s, same reflection rules as counter.

### mirror-shot
- [Approved] Its accuracy-drop rider is kept (accuracy -1 on the target, chance as mainline). (Jess, 2026-11-01, Kanto import rulings set 1)

### mud-slap
- [Approved] Its accuracy-drop rider is kept: accuracy -1 on the target, same meaning as sand-attack. (Jess, 2026-11-01, Kanto import rulings set 1)

### night-shade
- [Approved] Arrives in 4c-1 as a persistent static circle; flat level damage with no target cap is a balance-pass item. (slice-4c.md decisions; review 9.9 S3) Built in slice 4c-1.
- Ledger: B4-I15

### nightmare
- [Approved] Sleep only: a damage-over-time that ticks only while the target sleeps; it ends when the target wakes. (Jess, 2026-11-01, Kanto import rulings set 2)
- [Proposed] 1/4 of max HP per second of sleep for wild targets is mainline-flavored but too strong in real time; tick size set at the batch review.

### outrage
- [Approved] Rampage analog: for a while the move auto-repeats and the user cannot change slots, then the user is confused briefly. (Jess, 2026-11-01, Kanto import rulings set 4)
- [Proposed] Rampage about 2.5 s; confusion a short status Duration.

### petal-dance
- [Approved] As outrage. (Jess, 2026-11-01, Kanto import rulings set 4)

### protect
- [Approved] A short full block: for a brief window the user takes no damage and no riders, on a long cooldown, so it is a timed answer to a big hit or a gym tell. Feint breaks it. (Jess, 2026-11-01, Kanto import rulings set 3)
- [Proposed] Window 0.6 s, cooldown about 8 s.

### psychic
- [Approved] An arc wave starts at the player at radArc 0.5 and widens to 2.0 as it moves outward, homing. (combat-validation 2.5 scenario 5; review 9.1 Q1)
- [Approved] Psychic stays a filled wedge that grows from 0.5 to 2.0 rad, travels and steers (cast target while it lives, then the nearest enemy). No band thickness, no grammar change. (slice-4c.md decisions, Jess 2026-10-27, after first asking for an arc) Built in slice 4c-3.
- [Approved] "Then the nearest" means ONE re-pick (D-PSY): when the cast target is lost, the wedge re-picks the nearest live enemy within range once; if that one is lost too it flies straight. Same rule as Confusion and every turnRate move (combat-architecture:D23, H11). (Jess, 2026-10-29)
- [Open] The widening barely matters against stationary enemies to the side. With 80 px/s travel and a half arc growing 0.75 rad/s, the apex outruns them: validation 2.5 scenario 5's side enemies (plus and minus 50 degrees at 90 px) are never inside the wedge, not "hit once it has widened". Only enemies about 65 to 80 px ahead and off the line benefit (move-travel-harness Test 6). Keep as built, or retune travel or growth in the balance pass? (4c-3 build finding, 2026-10-29)
- Ledger: B4-I16

### psyshock
- [Approved] Mainline: a special move whose damage uses the target's Defense, not Sp. Def, through G.Stats. (Jess, 2026-11-01, Kanto import rulings set 3)

### quick-attack
- [Approved] Dash from A to B, hit at B, return to A. Pierce exhaustion disarms the hitbox but does not end a `repositions` instance (R1). Data: `returnHits` becomes `out`. (review 9.1 Q3; combat-validation 2.5 scenario 1)
- [Approved] The landing point is the target enemy's centre (no stand-off); i-frames cover the whole dash plus a 0.3 s tail; the swept dash holds walking through the existing mvRoot flag. Quick Attack hits one enemy at the arrival point, unlike the legacy dash. (slice-4c.md 4c-2 decisions, Jess 2026-10-27; this extends review 9.3 F5, "i-frames for the whole dash") Built in slice 4c-2.
- [Approved] Dash speed is 10 x the owner's full final move speed (stages, status, weather, liquid, run items), read once when the dash starts; a slow or Agility landing mid-dash does not change it. (Jess, 2026-10-29)
- [Approved] A new Quick Attack (or any reposition) waits while the owner's dash is still live, so two dashes never fight over the position; a swept dash at speed 0 waits too. The cooldown counts from when the dash can start. (Jess approved the 4c-2 build, 2026-10-29)
- [Approved] A rooted movement commitment from a move in the same active group holds Quick Attack at the cast gate: it waits and casts as the root ends, so rooted means you cannot move. The cooldown counts from when it can start. No current move roots its caster (Flamethrower's commitment is slowed, which does not hold a dash; its Speed -2 just makes the dash slower), so this guards future moves. (Jess, 2026-10-29) Built (4c-2 review).
- [Approved] The dash carries a 3 s time cap as a safety net (endOn time 3 beside returned); a normal dash takes about 0.5 s. If the cap fires mid-dash, the owner stays where it is and the root lifts; no snap back. Every swept dash needs a time cap (validator rule swept-needs-time). (Jess, 2026-10-29) Built (4c-2 review).
- [Open] `priority: 1` ("always first" in a bonded group) is not built: the move sim does not order casts by priority. TODO.md Backlog.
- [Approved] Priority is ignored as a mechanic (no cast ordering, no instant cast); a bonded group casts in slot order. Closes the Quick Attack priority question and the bonded-group priority item. (Jess, 2026-11-01, Kanto import rulings set 4)
- Ledger: B4-I17

### rain-dance
- [Approved] Team-side field: sets rain for a while (setWeather). (Jess, 2026-11-01, Kanto import rulings set 4)

### rapid-spin
- [Approved] Damage and the Speed raise map as data; it also clears hazards aimed at the user's side (from a leader's Stealth Rock). (Jess, 2026-11-01, Kanto import rulings set 4)

### razor-leaf
- [Approved] Per-move `delivery.range` 210 px; the 2 s time cap stays as a safety net. The back leg may hit again. (review 9.3 F2, 9.1 Q2)
- Ledger: B4-I18

### reflect
- [Approved] Team-side field: a timed team buff that halves physical damage taken; a leader's Reflect guards its own side the same way. (Jess, 2026-11-01, Kanto import rulings set 4)

### rest
- [Approved] No self-sleep: a big heal on a long cooldown that also clears the user's ailments. (Jess, 2026-11-01, Kanto import rulings set 3)
- [Proposed] Heals to full, cooldown about 30 s.

### reversal
- [Approved] As flail, same bands from the user's live HP. (Jess, 2026-11-01, Kanto import rulings set 1)

### roar
- [Approved] A big knockback burst that scatters the horde around the user; a gym leader's Roar pushes the player away. (Jess, 2026-11-01, Kanto import rulings set 3)

### rock-slide
- [Approved] The telegraph delay lives on the instance (`delivery.delay`). (review 9.1 Q17)
- [Approved] Stays one boulder (S11). The telegraph is drawn as a low-opacity ring (a warning, not a zone effect). (slice-4c.md decisions, Jess 2026-10-27) Built in slice 4c-3: 0.4 s wait, then live 0.2 s.
- Ledger: B4-I19

### safeguard
- [Approved] Team-side field: a timed team buff that blocks new ailments. (Jess, 2026-11-01, Kanto import rulings set 4)

### sand-attack
- [Approved] Lowers the target's accuracy stage -1: the target's own attacks get a miss chance from the mainline table (accuracy stage -n: hit chance 3/(3+n)). (Jess, 2026-11-01, Kanto import rulings set 1)

### sandstorm
- [Approved] Team-side field: sets a sandstorm for a while (setWeather). (Jess, 2026-11-01, Kanto import rulings set 4)

### self-destruct
- [Approved] As explosion: real faint for the caster on both sides. (Jess, 2026-11-01, Kanto import rulings set 1)
- [Proposed] Mainline power 200, a smaller area than explosion.

### skill-swap
- [Approved] Not imported: there are no abilities to swap. (Jess, 2026-11-01, Kanto import rulings set 3)

### smokescreen
- [Approved] As sand-attack, accuracy -1 on the target. (Jess, 2026-11-01, Kanto import rulings set 1)

### solar-beam
- [Approved] A charge before the beam; instant in Sunny weather. (Jess, 2026-11-01, Kanto import rulings set 4)
- [Proposed] Charge 1.0 s.

### spikes
- [Approved] Deliberately NOT persistent. Keeps no timeout; it is bounded by the instance cap (combat-architecture H6). (review 9.2 C13, 9.1 Q16)
- [Approved] cd 1.1 (move-overrides.js), not the legacy 1.2. (Jess, 2026-10-29, Stage 0 cd ruling)
- [Approved] locationPick caster: mines are placed at the caster's feet (as in the legacy game), not on a random enemy, so kiting lays a minefield along the player's path. (Jess, 2026-10-30, D-LOC) Built in slice 4d.
- Ledger: B4-I20

### stealth-rock
- [Approved] Scatters rock hazards around the field that hurt enemies who touch them; a leader's Stealth Rock scatters hazards that hurt the player. (Jess, 2026-11-01, Kanto import rulings set 4)

### string-shot
- [Approved] Under COMBAT-RULES "Stat stages" the second shot of a cast refreshes the first shot's Speed -2 but does not climb, since the Gate is closed (SS4): one cast gives -2, and an enemy climbs -2 per Gate while String Shot keeps landing on it. Supersedes the review 9.8 S7 double application (-4 per cast). Shot spacing (#15) is now readability only. (Jess, 2026-10-30)
- History (removed in slice 5, 2026-10-31): both shots stacked, -4 per cast (review 9.8 S7; an uncapped foe drop under D-FOECAP).
- [Approved] cd 1.1 (move-overrides.js), the legacy value: the 0.5 the new path had was a regression. The cooldown does not cause the two shots of one cast reading as one (#15); that is shot spacing. (Jess, 2026-10-29, Stage 0 cd ruling)
- [Approved] Shot spacing (#15): a still emitter at the caster fires a strand at once and a second 0.11 s later, both on the aim line, about 35 px apart at 320 px/s (Fairy Wind's pattern). Each strand carries the payload (Speed -2 and the trap), so the SS4 refresh ruling above is unchanged. (Jess, 2026-10-31, slice 6 batch 1) Scenarios: string-shot-spacing, string-shot-double.
- [Approved] Cards follow the emitter shape (D-CARDS): Count Up applies (+1 strand per pick, cap +3); Reach Up no longer does, since the root is a still emitter, as for Gust. (Jess, 2026-10-31, slice 6 batch 1)
- Ledger: B4-I21

### substitute
- [Approved] 4 s shield, 12 s cooldown armed when the shield ends (expiry, break, swap, faint). Cast waits at HP at or below the cost and while a shield lives. Built. (review 9.9 S1)
- Ledger: B4-I22

### sucker-punch
- [Approved] Real-time analog of "only if the foe is attacking": bonus power against a target that is mid wind-up (a gym tell) or has a live shot out; plain otherwise. (Jess, 2026-11-01, Kanto import rulings set 2)
- [Proposed] x1.5 power on the bonus condition (mainline power 70 is the base).

### sunny-day
- [Approved] Team-side field: sets the run's weather to sun for a while (setWeather). (Jess, 2026-11-01, Kanto import rulings set 4)

### surf
- [Approved] A movement skill, passive (special handler surfer): while the Pokemon on the field has Surf in any slot and stands in water or swamp, it ignores the slowdown and moves at x1.15. Water types already ignore the slowdown, so they gain the x1.15. Lava, poison and spark still hurt; ice still slides. No damage, never autocast, never the active slot, never bonds. Mainline Surf is an HM learned by many non-Water Pokemon. Scenario surf-passive. (Jess, 2026-11-02)

### tackle
- [Approved] Tackle reach stays as built, judged by feel, any fix is data. (slice-3d.md decision D3; closes the review 9.2 note that its 48 px circle no longer includes the player's body)
- [Approved] Radius 54 (was 48): with a 10 px enemy body it reaches 64 px. The feel fix the line above allows. (Jess, 2026-10-31, slice 6 movechecker pass) Scenarios: tackle-reach, tackle-arc.
- Ledger: B4-I23

### thrash
- [Approved] As outrage. (Jess, 2026-11-01, Kanto import rulings set 4)

### thunderbolt
- [Approved] Instant strike on the nearest enemy with chain hops; paralysis rides each hop at half the previous hop's chance (chance x 0.5^k). Hop k deals x (1 - hopReduction)^k applied last. (review 9.1 Q10, superseded targeting and falloff, Jess 2026-10-27)
- [Approved] Overlap rule: the targeted enemy starts the chain; other enemies inside the strike circle take the strike only. (review 9.5, default accepted; combat-validation 3.6)
- Ledger: B4-I24

### toxic
- [Approved] Impossible as described, accepted: escalating DoT, ribbon. (combat-validation 2.3)
- Ledger: B4-I25

### toxic-spikes
- [Approved] One placed emitter lasting 3 s that every 0.25 s emits a 100 px circle growing 400 px/s for 0.25 s, poisoning what it touches. (review 9.1 Q7; combat-validation 2.5 scenario 6)
- [Approved] It never emits at or after its end, so it gets 11 emissions in 3 s. (review 9.3 F6; slice-4d.md decisions) Superseded 2026-10-31, see the next line.
- [Approved] One burst per plate: the plate emits its ring ONCE, when it ends (the termination trigger, a death effect), not every 0.25 s, which pulsed too fast to read. The ring is unchanged (100 px growing 400 px/s for 0.25 s, 100% poison). Supersedes the two lines above on the emission schedule; placement and lifetime are unchanged. (Jess, 2026-10-31, slice 6 batch 1) Scenario: toxic-spikes-burst.
- [Approved] locationPick caster: the emitter is placed at the caster's feet (as in the legacy game), a trap the chasing horde walks into. (Jess, 2026-10-30, D-LOC) Built in slice 4d.
- Ledger: B4-I26

### tri-attack
- [Proposed] Mainline: 20% chance to inflict one of burn, paralysis or freeze, picked at random. Existing ailment pattern; confirm at the batch review.

### u-turn
- [Approved] Hits, then clears the swap lock (the 5 s lockout), so the player may swap at once; it does not swap by itself. A gym leader's U-turn is a plain hit. (Jess, 2026-11-01, Kanto import rulings set 2)

### vital-throw
- [Approved] Priority is ignored as a mechanic: the mainline priority field has no runtime meaning. It imports by its shape and power alone. (Jess, 2026-11-01, Kanto import rulings set 4)

### will-o-wisp
- [Approved] locationPick caster: the turret is placed at the caster's feet (as in the legacy game), a defensive turret that fires at enemies within its range. (Jess, 2026-10-30, D-LOC) Built in slice 4d.
- [Approved] Shot range 300 px (the legacy turret's range), set on the emitted shot, not the resolver's 420; the 420 px placement gate is unchanged. (Jess, 2026-10-30, slice 4d plan decision A) Built in slice 4d.

### wring-out
- [Approved] Mainline curve: power = 120 x the TARGET's live HP fraction (minimum 1), computed per hit. (Jess, 2026-11-01, Kanto import rulings set 1)

### yawn
- [Approved] A delayed sleep: the target falls asleep after a short delay. (Jess, 2026-11-01, Kanto import rulings set 3)
- [Proposed] Delay 2 s; the sleep then follows the normal Sleep rules (COMBAT-RULES).
