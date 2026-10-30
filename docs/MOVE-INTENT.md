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

### aqua-ring
- [Approved] Aqua Ring heals 6.25% max HP/s, accepted. Built. (review 9.9 S6)
- Ledger: B4-I01

### aura-sphere
- [Approved] Its reach (about 160 px by the curve math) is fine, verify only. (slice-4c.md decisions, Jess 2026-10-27; review 9.7 item 6) Verified in slice 4c-3: 159.5 px measured at dt 1/60, 159.3 at 1/30.
- Ledger: B4-I02

### aerial-ace
- [Approved] Teleport to the nearest enemy's centre, capped by range 420 and walls; the 46 px hitbox is live for its 0.1 s, knockback 80 away from the landing point, 50% confusion. No return and no movement lock. i-frames: 0.3 s once from the cast, not re-raised (4c-2 handoff test 6). Built in slice 4c-2.
- [Approved] A rooted commitment holds the teleport too, the same as Quick Attack: it waits and casts as the root ends. (Jess, 2026-10-29) Built (4c-2 review).
- Ledger: none (entry added 2026-10-29 by the 4c-2 build)

### bonemerang
- [Approved] Two bones out and back, hitting on both legs. (combat-validation 2.5 scenario 2; review 9.1 Q2)
- [Approved] Per-move `delivery.range` 230 px; the 2 s time cap stays as a safety net. (review 9.3 F2)
- [Approved] The return-leg knockback pulls enemies toward the caster (the back leg's travel direction). The pull is clamped so an enemy never ends past the caster's edge. (slice-4c.md decisions, Jess 2026-10-27; closes review 9.5 S12) Built in slice 4c-2.
- Ledger: B4-I03

### bug-bite
- [Approved] cd 0.42 (written to move-overrides.js); berrySteal stays a stub. (review 9.4 C10, 9.5)
- Ledger: B4-I04

### bug-buzz
- [Approved] No per-move cap on its foe Sp. Def -1: each enemy's tracker climbs -1 per Gate while it stays in the aura and ends one Duration after it leaves (COMBAT-RULES "Stat stages", SS2 and SS4). Supersedes the 2026-10-28 CP3 cap of 1 and the 2026-10-29 "marked once, never stacks" reading. (Jess, 2026-10-30) Code differs, see TODO: built in slice 5.
- [Legacy behavior] New path today: authored maxStacks 1, so the drop holds at -1 (slice 4c-0). Removed by slice 5.
- [Approved] The Sp. Def drop has no chance field, so it applies at 100% on every eligible hit (move-consistency-review:CP1-Q14). The source's 10% was dropped on purpose in the 2026-10-24 conversion. (Jess, 2026-10-29)
- [Approved] Cadence stays rehit 0.5 at full power per tick (about 180 Power/s to every enemy within 120 px, roughly 3.5x legacy). Not retuned now: it is a throughput outlier for the slice 6 balance pass (move-consistency-review S1). (Jess, 2026-10-29)
- Ledger: B4-I27

### dragon-dance
- [Approved] No per-move exception: COMBAT-RULES "Stat stages" applies, one tracker each on Attack and Speed, +1 per climb; as a pure buff move it has no cooldown of its own and casts when its Gate opens (SS1, SS8). The 2026-10-28 CP3 exception to DECISIONS:Q13 (raises shorter than the cooldown, maxStacks floor 1) is retired with Q13 and maxStacks. (Jess, 2026-10-30) Code differs, see TODO: built in slice 5.
- [Legacy behavior] New path today: duration 4 s and cooldown 8 s on both raises, maxStacks 1. Removed by slice 5.
- Ledger: B4-I05

### dragon-rage
- [Approved] cd 3.5 (move-overrides.js), not the legacy 1: flat 40 to everything in its 250 x 30 band, so it fires about 3.5x less often than today. Playtested in batch 1. (Jess, 2026-10-29, Stage 0 cd ruling)

### fire-spin
- [Approved] Burn at the full standard length (half-burn dropped), trap, no strip. The persistent orbit damage stays as authored. (Q17; QA-10)
- New-path data already matches: damage, burn 100% and trap 100% on the foe (slice-4c-1-codehandoff.md:10, :46). The trap and burn rules themselves are in docs/COMBAT-RULES.md "Trap, enemies" and "Damage over time".
- [Legacy behavior] The legacy path strips every beneficial stat stage and burns for half the normal length (js/data/moves.js:61, `strip` and `burnHalf`). Removed by slice 7.
- Ledger: B4-I06

### flamethrower
- [Approved] Caster-state commitment: slowed plus freeze(all) for its 1.0 s cone. Built. (review 9.9 S13, S14)
- [Approved] aimTrack is implemented and changes Flamethrower (the data already says it tracks). The aimTrack target rule is sticky: the cast target while it lives and is in range, then the nearest, re-picked whenever lost. (slice-4c.md 4c-3 decisions, Jess 2026-10-27) Built in slice 4c-3.
- [Approved] "In range" for tracking means within the cone's reach, min(range 420, 250 + the enemy's radius), the same limit as its cast gate. An enemy that walks past reach is dropped and the nearest within reach re-picked; with none the heading holds. (Jess, 2026-10-29) Built in slice 4c-3.
- Ledger: B4-I07

### gust
- [Approved] Per-shot spread: the 3 projectiles fire at once as an even fan using the existing `spread` field (the total fan), not the legacy +-0.03 jitter and not a new aim-jitter field, so the three shots read as separate. Fan width 0.5 rad total, so shots at -0.25, 0 and +0.25 rad. (Jess, 2026-10-30, D-GUST and the approved slice 4d plan; review 9.4 C4, 9.7 item 4) Built in slice 4d.
- [Approved] cd 0.5 (formula), not the legacy 0.26: Gust is now a cast that emits 3 projectiles with a normal cooldown, not an orbit with a re-hit. (Jess, 2026-10-29, Stage 0 cd ruling)
- Ledger: B4-I08

### hail
- [Approved] PARKED as a toggle skill item; setWeather tested through a synthetic move. Its cd 1.2 vs duration 10 (review S6) is owned by the parked Hail toggle item. (review 9.9 S2, 9.7 item 6)
- Ledger: B4-I09

### hex
- [Approved] Doubles POWER (inside the attacker half, not a final x2) on a major ailment (paralysis, freeze, sleep, burn, poison, toxic; confusion and trap do not count), checked on every chain hop. Built. (review 9.1 Q9; slice 4b S8; combat-architecture D13)
- Ledger: B4-I10

### ice-beam
- [Approved] No per-move cap on its foe Speed -1: it climbs -1 per Gate on each enemy it keeps hitting (COMBAT-RULES "Stat stages", SS2 and SS4). Supersedes the 2026-10-28 CP3 cap of 1. (Jess, 2026-10-30) Code differs, see TODO: built in slice 5.
- [Legacy behavior] New path today: authored maxStacks 1, so the drop holds at -1 (slice 4c-0). Removed by slice 5.
- Ledger: B4-I28

### karate-chop
- [Approved] Karate Chop is Fighting. (review 9.1 Q11)
- Ledger: B4-I11

### leaf-storm
- [Approved] Persistent. (review 9.2 C13)
- [Approved] Its self Sp. Atk -2 follows COMBAT-RULES "Stat stages" on the Self-drop Gate (SS12, 12.0 s at base): -2 at 0 s, -4 at 12 s, -6 at 24 s while it keeps hitting, and it ends one Duration (6.1 s) after the last hit, including after the move stops being active. The team Gate and Duration cards act on it too (SS10). Swapping off is a reward, not a requirement: at -6 it still hits at about Ember level (docs/proposals/stat-stage-model.md, design intent). Supersedes D-LEAF and the review 9.8 D-2 hold at -2. (Jess, 2026-10-30) Code differs, see TODO: built in slice 5.
- [Legacy behavior] New path today (D-LEAF, slice 4c-1): maxStacks 1, so the -2 holds at -2 and refreshes its 6 s on each hit. Removed by slice 5.
- Ledger: B4-I12

### meteor-mash
- [Approved] The projectile hits enemy 1. At enemy 1's position at impact, a 3-projectile fan is emitted that ignores enemy 1. Emit `count` 1, child `space.count` 3. (review 9.2 D-3; combat-validation 2.5 scenario 3)
- [Approved] Its Attack raise is scope `team`, matching Metal Claw. APPLIED (commit a68a366). (review 9.1 Q15)
- [Legacy behavior] maxStacks 1 (authored since slice 4c-0, was 2). Removed by slice 5: its Attack raise then follows COMBAT-RULES "Stat stages" with no per-move rule (one roll per cast on its first enemy hit, SS2). (Jess, 2026-10-30)
- Shards deal full parent power: combat-architecture H13.
- Ledger: B4-I13

### metal-claw
- [Legacy behavior] maxStacks 1 (authored since slice 4c-0, was 2). Removed by slice 5: its Attack raise then follows COMBAT-RULES "Stat stages" with no per-move rule (one roll per cast on its first enemy hit, SS2). (Jess, 2026-10-30)
- Ledger: B4-I14

### night-shade
- [Approved] Arrives in 4c-1 as a persistent static circle; flat level damage with no target cap is a balance-pass item. (slice-4c.md decisions; review 9.9 S3) Built in slice 4c-1.
- Ledger: B4-I15

### psychic
- [Approved] An arc wave starts at the player at radArc 0.5 and widens to 2.0 as it moves outward, homing. (combat-validation 2.5 scenario 5; review 9.1 Q1)
- [Approved] Psychic stays a filled wedge that grows from 0.5 to 2.0 rad, travels and steers (cast target while it lives, then the nearest enemy). No band thickness, no grammar change. (slice-4c.md decisions, Jess 2026-10-27, after first asking for an arc) Built in slice 4c-3.
- [Approved] "Then the nearest" means ONE re-pick (D-PSY): when the cast target is lost, the wedge re-picks the nearest live enemy within range once; if that one is lost too it flies straight. Same rule as Confusion and every turnRate move (combat-architecture:D23, H11). (Jess, 2026-10-29)
- [Open] The widening barely matters against stationary enemies to the side. With 80 px/s travel and a half arc growing 0.75 rad/s, the apex outruns them: validation 2.5 scenario 5's side enemies (plus and minus 50 degrees at 90 px) are never inside the wedge, not "hit once it has widened". Only enemies about 65 to 80 px ahead and off the line benefit (move-travel-harness Test 6). Keep as built, or retune travel or growth in the balance pass? (4c-3 build finding, 2026-10-29)
- Ledger: B4-I16

### quick-attack
- [Approved] Dash from A to B, hit at B, return to A. Pierce exhaustion disarms the hitbox but does not end a `repositions` instance (R1). Data: `returnHits` becomes `out`. (review 9.1 Q3; combat-validation 2.5 scenario 1)
- [Approved] The landing point is the target enemy's centre (no stand-off); i-frames cover the whole dash plus a 0.3 s tail; the swept dash holds walking through the existing mvRoot flag. Quick Attack hits one enemy at the arrival point, unlike the legacy dash. (slice-4c.md 4c-2 decisions, Jess 2026-10-27; this extends review 9.3 F5, "i-frames for the whole dash") Built in slice 4c-2.
- [Approved] Dash speed is 10 x the owner's full final move speed (stages, status, weather, liquid, run items), read once when the dash starts; a slow or Agility landing mid-dash does not change it. (Jess, 2026-10-29)
- [Approved] A new Quick Attack (or any reposition) waits while the owner's dash is still live, so two dashes never fight over the position; a swept dash at speed 0 waits too. The cooldown counts from when the dash can start. (Jess approved the 4c-2 build, 2026-10-29)
- [Approved] A rooted movement commitment from a move in the same active group holds Quick Attack at the cast gate: it waits and casts as the root ends, so rooted means you cannot move. The cooldown counts from when it can start. No current move roots its caster (Flamethrower's commitment is slowed, which does not hold a dash; its Speed -2 just makes the dash slower), so this guards future moves. (Jess, 2026-10-29) Built (4c-2 review).
- [Approved] The dash carries a 3 s time cap as a safety net (endOn time 3 beside returned); a normal dash takes about 0.5 s. If the cap fires mid-dash, the owner stays where it is and the root lifts; no snap back. Every swept dash needs a time cap (validator rule swept-needs-time). (Jess, 2026-10-29) Built (4c-2 review).
- [Open] `priority: 1` ("always first" in a bonded group) is not built: the move sim does not order casts by priority. TODO.md Backlog.
- Ledger: B4-I17

### razor-leaf
- [Approved] Per-move `delivery.range` 210 px; the 2 s time cap stays as a safety net. The back leg may hit again. (review 9.3 F2, 9.1 Q2)
- Ledger: B4-I18

### rock-slide
- [Approved] The telegraph delay lives on the instance (`delivery.delay`). (review 9.1 Q17)
- [Approved] Stays one boulder (S11). The telegraph is drawn as a low-opacity ring (a warning, not a zone effect). (slice-4c.md decisions, Jess 2026-10-27) Built in slice 4c-3: 0.4 s wait, then live 0.2 s.
- Ledger: B4-I19

### spikes
- [Approved] Deliberately NOT persistent. Keeps no timeout; it is bounded by the instance cap (combat-architecture H6). (review 9.2 C13, 9.1 Q16)
- [Approved] cd 1.1 (move-overrides.js), not the legacy 1.2. (Jess, 2026-10-29, Stage 0 cd ruling)
- [Approved] locationPick caster: mines are placed at the caster's feet (as in the legacy game), not on a random enemy, so kiting lays a minefield along the player's path. (Jess, 2026-10-30, D-LOC) Built in slice 4d.
- Ledger: B4-I20

### string-shot
- [Approved] Under COMBAT-RULES "Stat stages" the second shot of a cast refreshes the first shot's Speed -2 but does not climb, since the Gate is closed (SS4): one cast gives -2, and an enemy climbs -2 per Gate while String Shot keeps landing on it. Supersedes the review 9.8 S7 double application (-4 per cast). Shot spacing (#15) is now readability only. (Jess, 2026-10-30) Code differs, see TODO: built in slice 5.
- [Legacy behavior] New path today: both shots stack, -4 per cast (review 9.8 S7; an uncapped foe drop under D-FOECAP). Removed by slice 5.
- [Approved] cd 1.1 (move-overrides.js), the legacy value: the 0.5 the new path had was a regression. The cooldown does not cause the two shots of one cast reading as one (#15); that is shot spacing. (Jess, 2026-10-29, Stage 0 cd ruling)
- Ledger: B4-I21

### substitute
- [Approved] 4 s shield, 12 s cooldown armed when the shield ends (expiry, break, swap, faint). Cast waits at HP at or below the cost and while a shield lives. Built. (review 9.9 S1)
- Ledger: B4-I22

### tackle
- [Approved] Tackle reach stays as built, judged by feel, any fix is data. (slice-3d.md decision D3; closes the review 9.2 note that its 48 px circle no longer includes the player's body)
- Ledger: B4-I23

### thunderbolt
- [Approved] Instant strike on the nearest enemy with chain hops; paralysis rides each hop at half the previous hop's chance (chance x 0.5^k). Hop k deals x (1 - hopReduction)^k applied last. (review 9.1 Q10, superseded targeting and falloff, Jess 2026-10-27)
- [Approved] Overlap rule: the targeted enemy starts the chain; other enemies inside the strike circle take the strike only. (review 9.5, default accepted; combat-validation 3.6)
- Ledger: B4-I24

### toxic
- [Approved] Impossible as described, accepted: escalating DoT, ribbon. (combat-validation 2.3)
- Ledger: B4-I25

### toxic-spikes
- [Approved] One placed emitter lasting 3 s that every 0.25 s emits a 100 px circle growing 400 px/s for 0.25 s, poisoning what it touches. (review 9.1 Q7; combat-validation 2.5 scenario 6)
- [Approved] It never emits at or after its end, so it gets 11 emissions in 3 s. (review 9.3 F6; slice-4d.md decisions)
- [Approved] locationPick caster: the emitter is placed at the caster's feet (as in the legacy game), a trap the chasing horde walks into. (Jess, 2026-10-30, D-LOC) Built in slice 4d.
- Ledger: B4-I26

### will-o-wisp
- [Approved] locationPick caster: the turret is placed at the caster's feet (as in the legacy game), a defensive turret that fires at enemies within its range. (Jess, 2026-10-30, D-LOC) Built in slice 4d.
- [Approved] Shot range 300 px (the legacy turret's range), set on the emitted shot, not the resolver's 420; the 420 px placement gate is unchanged. (Jess, 2026-10-30, slice 4d plan decision A) Built in slice 4d.
