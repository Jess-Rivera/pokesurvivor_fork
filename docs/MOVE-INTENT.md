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
- [Approved] Its reach (about 160 px by the curve math) is fine, verify only. (slice-4c.md decisions, Jess 2026-10-27; review 9.7 item 6)
- Ledger: B4-I02

### bonemerang
- [Approved] Two bones out and back, hitting on both legs. (combat-validation 2.5 scenario 2; review 9.1 Q2)
- [Approved] Per-move `delivery.range` 230 px; the 2 s time cap stays as a safety net. (review 9.3 F2)
- [Approved] The return-leg knockback pulls enemies toward the caster (the back leg's travel direction). The pull is clamped so an enemy never ends past the caster's edge. (slice-4c.md decisions, Jess 2026-10-27; closes review 9.5 S12) Code differs, see TODO: slice 4c-2.
- Ledger: B4-I03

### bug-bite
- [Approved] cd 0.42 (written to move-overrides.js); berrySteal stays a stub. (review 9.4 C10, 9.5)
- Ledger: B4-I04

### bug-buzz
- [Approved] Per-move rule over Q16: its foe Sp. Def -1 debuff has maxStacks 1 (as authored), although foe debuffs have no per-move cap in general. (Jess, 2026-10-28, CP3)
- Ledger: B4-I27

### dragon-dance
- [Approved] Per-move rule over the Q13 invariant: its raises may last shorter than its cooldown (data today: duration 4 s, cooldown 8 s on both its Attack and Speed raises). maxStacks has a floor of 1; all other rules of the maxStacks equation apply, so the cap is max(1, min(floor(duration / cooldown), 6)). (Jess, 2026-10-28, CP3) Code differs, see TODO: the upgrade formula is not built (QA-11 follow-up).
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
- [Approved] aimTrack is implemented and changes Flamethrower (the data already says it tracks). The aimTrack target rule is sticky: the cast target while it lives and is in range, then the nearest, re-picked whenever lost. (slice-4c.md 4c-3 decisions, Jess 2026-10-27) Code differs, see TODO: slice 4c-3.
- Ledger: B4-I07

### gust
- [Open] Per-shot spread (review 9.4 C4, 9.7 item 4). Options recorded in slice-4d.md: a data change to a 3-count simultaneous fan, or accept the legacy +-0.03 jitter, or a new emit-level aim jitter field (a new field is a stop-and-ask). Needed before slice 4d.
- [Approved] cd 0.5 (formula), not the legacy 0.26: Gust is now a cast that emits 3 projectiles with a normal cooldown, not an orbit with a re-hit. (Jess, 2026-10-29, Stage 0 cd ruling)
- Ledger: B4-I08

### hail
- [Approved] PARKED as a toggle skill item; setWeather tested through a synthetic move. Its cd 1.2 vs duration 10 (review S6) is owned by the parked Hail toggle item. (review 9.9 S2, 9.7 item 6)
- Ledger: B4-I09

### hex
- [Approved] Doubles POWER (inside the attacker half, not a final x2) on a major ailment (paralysis, freeze, sleep, burn, poison, toxic; confusion and trap do not count), checked on every chain hop. Built. (review 9.1 Q9; slice 4b S8; combat-architecture D13)
- Ledger: B4-I10

### ice-beam
- [Approved] Per-move rule over Q16: its foe Speed -1 debuff has maxStacks 1 (as authored), although foe debuffs have no per-move cap in general. (Jess, 2026-10-28, CP3)
- Ledger: B4-I28

### karate-chop
- [Approved] Karate Chop is Fighting. (review 9.1 Q11)
- Ledger: B4-I11

### leaf-storm
- [Approved] Persistent. (review 9.2 C13)
- [Approved] maxStacks 1 on its self Sp. Atk -2: the stage holds at -2 over many hits (never -4) and refreshes its 6 s each hit. (review 9.8 D-2; Q14; slice-4c-1-codehandoff.md P6)
- [Approved] Per-move rule (D-LEAF): the self Sp. Atk -2 refreshes its standard duration on each hit (maxStacks 1, holds at -2). In play an enemy is almost always in orbit reach, so it reads as on while the move is active; after the last hit, including when the move stops being active, it lasts the standard duration and then ends. It can lapse while active if nothing is in reach for longer than that; accepted. Standard duration: docs/COMBAT-RULES.md "Stat stages and maxStacks" (6 s). No upgrade path shortens it. Supersedes the 2026-10-28 CP3 "held while active" wording, so there is no grammar gap. (Jess, 2026-10-29)
- Ledger: B4-I12

### meteor-mash
- [Approved] The projectile hits enemy 1. At enemy 1's position at impact, a 3-projectile fan is emitted that ignores enemy 1. Emit `count` 1, child `space.count` 3. (review 9.2 D-3; combat-validation 2.5 scenario 3)
- [Approved] Its Attack raise is scope `team`, matching Metal Claw. APPLIED (commit a68a366). (review 9.1 Q15)
- [Approved] maxStacks 1 (the default; authored 1 since slice 4c-0, was 2). (review 9.8 D-2, superseded by Q14)
- Shards deal full parent power: combat-architecture H13.
- Ledger: B4-I13

### metal-claw
- [Approved] maxStacks 1 (the default; authored 1 since slice 4c-0, was 2). (review 9.8 D-2, superseded by Q14)
- Ledger: B4-I14

### night-shade
- [Approved] Arrives in 4c-1 as a persistent static circle; flat level damage with no target cap is a balance-pass item. (slice-4c.md decisions; review 9.9 S3) Code differs, see TODO: slice 4c-1.
- Ledger: B4-I15

### psychic
- [Approved] An arc wave starts at the player at radArc 0.5 and widens to 2.0 as it moves outward, homing. (combat-validation 2.5 scenario 5; review 9.1 Q1)
- [Approved] Psychic stays a filled wedge that grows from 0.5 to 2.0 rad, travels and steers (cast target while it lives, then the nearest enemy). No band thickness, no grammar change. (slice-4c.md decisions, Jess 2026-10-27, after first asking for an arc) Code differs, see TODO: slice 4c-3.
- [Approved] "Then the nearest" means ONE re-pick (D-PSY): when the cast target is lost, the wedge re-picks the nearest live enemy within range once; if that one is lost too it flies straight. Same rule as Confusion and every turnRate move (combat-architecture:D23, H11). (Jess, 2026-10-29)
- Ledger: B4-I16

### quick-attack
- [Approved] Dash from A to B, hit at B, return to A. Pierce exhaustion disarms the hitbox but does not end a `repositions` instance (R1). Data: `returnHits` becomes `out`. (review 9.1 Q3; combat-validation 2.5 scenario 1)
- [Approved] The landing point is the target enemy's centre (no stand-off); i-frames cover the whole dash plus a 0.3 s tail; the swept dash holds walking through the existing mvRoot flag. Quick Attack hits one enemy at the arrival point, unlike the legacy dash. (slice-4c.md 4c-2 decisions, Jess 2026-10-27; this extends review 9.3 F5, "i-frames for the whole dash") Code differs, see TODO: slice 4c-2.
- Ledger: B4-I17

### razor-leaf
- [Approved] Per-move `delivery.range` 210 px; the 2 s time cap stays as a safety net. The back leg may hit again. (review 9.3 F2, 9.1 Q2)
- Ledger: B4-I18

### rock-slide
- [Approved] The telegraph delay lives on the instance (`delivery.delay`). (review 9.1 Q17)
- [Approved] Stays one boulder (S11). The telegraph is drawn as a low-opacity ring (a warning, not a zone effect). (slice-4c.md decisions, Jess 2026-10-27) Code differs, see TODO: slice 4c-3.
- Ledger: B4-I19

### spikes
- [Approved] Deliberately NOT persistent. Keeps no timeout; it is bounded by the instance cap (combat-architecture H6). (review 9.2 C13, 9.1 Q16)
- [Approved] cd 1.1 (move-overrides.js), not the legacy 1.2. (Jess, 2026-10-29, Stage 0 cd ruling)
- Ledger: B4-I20

### string-shot
- [Approved] The double application (Speed -2 twice, -4) is allowed. No data change. (review 9.8 S7) Shot spacing goes to the feel issue and slice 4d. (slice-4c.md decisions)
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
- Ledger: B4-I26
