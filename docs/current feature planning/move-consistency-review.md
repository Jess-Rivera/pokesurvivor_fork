# Move consistency review (Checkpoint 1)

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). Section 9 below is absorbed into docs/MOVE-AXIS-SCHEMA.md, combat-architecture.md and docs/MOVE-INTENT.md; read the header at section 9. The "single source" wording in this file is historical. Body unchanged.

Date: 2026-10-26. Branch: feature-test/new-move-schema. Review only: no game code, data, generated file, test or git state was changed.
Scope: all 63 moves in docs/move_rework_holding/move-conversions-described.json (Bubble excluded by `forgottenSkips`).
DECISIONS: sections 1 to 8 are the Checkpoint 1 snapshot and are not rewritten. Section 9 is the single source for every decision and open item since (Checkpoints 2 and 3), so read the NEEDS REVIEW tags and Q-lists above against it.

## 0. Repository and validation state (verified)

- Branch `feature-test/new-move-schema`, HEAD `7f69252 Slice 2 implementation`.
- Working tree: ONE uncommitted change, js/data/move-overrides.js. It fills `cd` for 12 of the 14 empty slots (swords-dance 8, agility 8, harden 8, aqua-ring 8, dragon-dance 8, string-shot 0.5, spikes 1.1, toxic-spikes 1.1, hail 1.2, will-o-wisp 3.5, substitute 4, dragon-rage 3.5) and DELETES the toxic and night-shade entries. Every `why` still says "no cd set yet". This review reads the working tree, so resolved cd values below include those edits.
- `node tools/check.js` (run on the working tree, tree unchanged afterwards): syntax 98/98, harnesses 17/17 (2 skipped as known stale), export current (63), grammar 63/63 valid, resolved 63/63 valid, **move_parity FAIL**: self-test "empty override (why only) leaves the move as resolved" asserts `G.MoveDefs.hail.cd === undefined`. The override edit sets hail to 1.2. This is a **test defect** (the case hard-codes hail as its example of an empty slot), not a gameplay regression. Proposed correction for the coding chat: point that case at a synthetic override, not a real move.
- docs/current feature planning/move-parity-report.md is stale relative to the working tree (it still reports 18 moves with no cd).

### Actual pipeline (verified by reading the files)

1. api_move_dataset.json and build_move_conversions.py are UPSTREAM SEED tooling only. described.json says `generated_by: "hand (feel-described pass)"`. Nothing at build or load time reads the API file.
2. described.json (source of truth) -> tools/export_moves.js (drops `kind`, `feel`, `reviewStatus`, `note`; maps "UNLIMITED" to the constant) -> js/data/moves-generated.js (G.MoveData).
3. js/data/move-resolver.js folds: grammar defaults (move-attributes.js `d`, except gated turnRate/aimTrack/returnHits), cd formula (Power above 0 and not `endOn notActive`), move-overrides.js (whole top-level field replace), handler attachment from move-handler.js -> G.MoveDefs.
4. None of these files is in dev.html or the main.js NEED array. The running game still uses js/data/moves.js and js/systems/combat.js. So "resolved definition" here means G.MoveDefs as loaded by tools/move_parity.js, not anything the game executes.

### Layer agreement (verified for all 63)

- Generated vs described: a per-move comparison (my script, same strip rule as the exporter) found `moves-generated.js == strip(described)` for all 63, and `export_moves.js --check` agrees. **No move has a generation defect.** Per-move "Generated" lines below therefore just say "matches".
- Resolver additions are uniform: `space.count` 1 and `space.spread` 0 when absent, `space.pierce` UNLIMITED when absent (every static area, beam default, and inline children), `delivery.motion` static and top-level `hitPolicy` oncePerInstance on shapeless and emitter parents, cd by formula, overrides, `handlers` list for specials. No resolver addition contradicts a value that was present in the data.
- Numeric facts vs API `source` (modern values): power, pp, accuracy, priority, category match for 61 of 63. Differences: will-o-wisp and substitute power 0 (API null); bite type dark and gust type flying (API says normal); 6 flavor texts blanked or replaced. See finding C9 for why the API `type` field itself is wrong for 3 moves.

### Evidence key used per move

D = described.json `moves.<id>` (incl. `feel`), API = api_move_dataset.json (source + meta), R = G.MoveDefs (resolver output), L = legacy moves.js BY_ID (reference only), S = existing runtime systems (status.js, stages.js, combat.js). Status values: OK, NEEDS REVIEW, UNVERIFIABLE. "Expected gameplay" is my interpretation of the schema; no rendering or runtime behavior of the new path exists to observe.

"Power/s" in this document is a crude throughput proxy: summed Power of all hits one target can take per cast, divided by cd. It ignores the damage formula, STAB, type, crit and stats. It exists only to point the damage simulator at outliers.

---

## 1. Per-move audit

### 1. tackle | OK
- Source: Power 40, PP 35, acc 100, physical, no rider.
- Conversion: radial arc 1.7 rad x 48 px, caster, nearest, static, endOn 0.15 s, oncePerInstance, damage + knockback 90.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.5 (formula anchor).
- Expected gameplay: a 0.15 s wedge in front of the caster facing the nearest enemy, hits each enemy inside once, pushes 90 px. Power/s 80 (the reference).
- Consistency: coherent. Geometry smaller than legacy (60 px, 2.13 rad), intentional per feel.
- Evidence: D, R, L.

### 2. swords-dance | OK
- Source: status, Atk +2 (user), PP 20.
- Conversion: shapeless self cast, stat atk +2 side self scope team, duration 8.
- Generated: matches. Resolution: motion static and hitPolicy oncePerInstance added (meaningless on a shapeless cast, harmless); cd 8 from the uncommitted override.
- Expected gameplay: every 8 s the whole team gets +2 Atk for 8 s, so a near-permanent +2 while selected.
- Consistency: coherent. cd = duration means one live application (stages.js renews within its 0.1 s grace).
- Evidence: D, R, move-overrides.js (working tree), S stages.js teamAdd.

### 3. agility | OK
- Source: status, Speed +2, psychic type.
- Conversion: as Swords Dance with stat spd +2.
- Generated: matches. Resolution: as Swords Dance; cd 8 (override).
- Expected gameplay: team +2 Speed for 8 s every 8 s.
- Consistency: coherent. Type psychic matches source (legacy had normal). Note the `spd` naming hazard (C8): in the schema `spd` is Speed, in stages.js `spd` is Sp. Def.
- Evidence: D, API, R, S stages.js.

### 4. harden | OK
- Source: status, Def +1.
- Conversion: stat def +1 team, duration 8.
- Generated: matches. Resolution: cd 8 (override).
- Expected gameplay: team +1 Def near-permanently while selected.
- Consistency: coherent.
- Evidence: D, R.

### 5. water-gun | OK
- Source: Power 40, PP 25, no rider.
- Conversion: point 6 px, count 1, pierce 1, spread 0.1, direction, travels 350 px/s, endOn 1.5 s / wall / offScreen.
- Generated: matches. Resolution: cd 0.7.
- Expected gameplay: one shot in the aim direction, passes through 1 enemy and dies on the second, range about 525 px. Spread is ignored at count 1 (slice 1 rule).
- Consistency: coherent; identical numbers to legacy.
- Evidence: D, R, L.

### 6. ember | OK
- Source: Power 40, PP 25, burn 10%.
- Conversion: point 7 px, pierce 0, spread 0.12, travels 310, endOn 1.6 / wall / offScreen, damage + burn 10% foe.
- Generated: matches. Resolution: cd 0.7.
- Expected gameplay: single shot, dies on first enemy, about 496 px range, 10% burn.
- Consistency: coherent, canonical template.
- Evidence: D, R.

### 7. hydro-pump | OK
- Source: Power 110, PP 5, acc 80.
- Conversion: linear 250 x 30, pierce UNLIMITED (explicit), nearest, static, endOn 0.5.
- Generated: matches. Resolution: count 1, spread 0, cd 3.5.
- Expected gameplay: a 0.5 s beam toward the nearest enemy, hits every enemy in the band once. Power/s 31.
- Consistency: coherent. Accuracy 80 has no defined runtime meaning (Q6).
- Evidence: D, R.

### 8. vine-whip | OK
- Source: Power 45, PP 25.
- Conversion: arc 1.3 x 68, static, nearest, 0.15 s, knockback 60.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.7.
- Expected gameplay: narrower, longer Tackle.
- Consistency: coherent.
- Evidence: D, R.

### 9. aqua-ring | OK
- Source: status, heals 1/16 max HP per turn.
- Conversion: shapeless self, heal {fraction 0.0625 of maxHP} per 1 s, side self, duration 8.
- Generated: matches. Resolution: cd 8 (override).
- Expected gameplay: caster regenerates 6.25% max HP per second, continuously while selected (cd = duration). That is 50% max HP every 8 s.
- Consistency: coherent. Feel says self only (not team); stages.js today stores Aqua Ring regen in the TEAM store (combat.js comment at line 262), so the new path changes scope. Intentional per feel, flagged so the executor does not copy the old team behavior.
- Evidence: D, R, S combat.js 262-273, stages.js header.

### 10. razor-leaf | NEEDS REVIEW
- Source: Power 55, PP 25, acc 95, high crit (crit_rate 1), all-opponents.
- Conversion: 2 points 6 px, spread 0.5, pierce UNLIMITED, direction, motion returns 330 px/s, returnHits outAndBack, endOn 2 s / returned, oncePerInstance, damage only.
- Generated: matches. Resolution: cd 0.7.
- Expected gameplay: two leaves fly out and come back, passing through everything. Intended to strike on both legs.
- Consistency: **contradiction**. `hitPolicy: oncePerInstance` means an enemy can be damaged once for the instance's whole life, so the return leg can only hit enemies the outward leg missed. That defeats `outAndBack`, and DECISIONS 2026-10-26 says "each pass hits at full power if the enemy is still in the path". Also: the schema has no turnaround distance for `returns` (legacy radius 210), so how far a leaf goes before turning back is undefined; `endOn time 2` may cut the return short depending on that rule. Crit identity dropped here (feel: "TBD") but kept on Psycho Cut.
- Evidence: D (hitPolicy, returnHits), move-attributes.js DELIVERY (no return-distance field), DECISIONS.md 2026-10-26, L radius 210.

### 11. giga-drain | OK
- Source: Power 75, PP 10, drain 50%.
- Conversion: point 8 px, pierce 0, travels 290, endOn 1.5 / wall / offScreen, damage + heal {from dealt, 0.5} self, cardLock count and pierce.
- Generated: matches. Resolution: spread 0, cd 1.75.
- Expected gameplay: single slow shot, heals the caster for half the damage it dealt.
- Consistency: coherent.
- Evidence: D, API drain 50, R.

### 12. body-slam | OK
- Source: Power 85, PP 15, paralysis 30%.
- Conversion: arc 2.2 x 46, static, nearest, 0.15 s, damage + paralysis 30% + knockback 140.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 1.167.
- Expected gameplay: wide short swing, strong push, frequent paralysis.
- Consistency: coherent.
- Evidence: D, R.

### 13. poison-sting | OK
- Source: Power 15, PP 35, poison 30%.
- Conversion: point 4 px, pierce 0, spread 0.08, travels 420, endOn 1.0 / wall / offScreen.
- Generated: matches. Resolution: cd 0.5.
- Expected gameplay: fast dart, about 420 px range.
- Consistency: coherent.
- Evidence: D, R.

### 14. bug-bite | NEEDS REVIEW
- Source: Power 60, PP 20; double damage and eat the berry if the target holds one.
- Conversion: arc 1.6 x 44, static, nearest, 0.15 s, damage + knockback 40 + special berrySteal (condition targetHasBerry, damageMult 2, consumesBerry).
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.875 (formula), handler berrySteal trigger enemyHit, stub.
- Expected gameplay: a short cone; the special never fires (no holdable system).
- Consistency: the feel states "'Faster' is the cooldown (fork cd 0.42), which lives in the overrides layer". move-overrides.js has no bug-bite entry, so the resolved cd is 0.875, about twice the stated intent. Berry steal is UNVERIFIABLE by design (stub).
- Evidence: D feel, move-overrides.js, R, move-handler.js.

### 15. rock-throw | OK
- Source: Power 50, PP 15, acc 90.
- Conversion: point 9 px, pierce 0, spread 0.12, travels 260, endOn 1.4 / wall / offScreen, damage + knockback 90.
- Generated: matches. Resolution: cd 1.167.
- Expected gameplay: slow heavy shot with push, about 364 px range.
- Consistency: coherent.
- Evidence: D, R.

### 16. ice-beam | NEEDS REVIEW
- Source: Power 90, PP 10, freeze 10%.
- Conversion: linear 290 x 20, pierce UNLIMITED, static, nearest, 0.5 s, damage + freeze 10% + stat spd -1 foe individual maxStacks 1 (no chance, no duration).
- Generated: matches. Resolution: count 1, spread 0, cd 1.75.
- Expected gameplay: long narrow beam, every enemy hit loses one Speed stage (always) and may freeze.
- Consistency: the speed debuff has no `duration`. The grammar gives stat effects no default duration, so whether this is permanent, 6 s (stages.js DUR) or something else is undefined (Q4). With maxStacks 1 and no duration it reads as a permanent slow on every enemy the beam touches. Also uses `spd` (Speed in the schema, Sp. Def in stages.js, C8).
- Evidence: D, move-attributes.js EFFECT.stat (no d on duration), S stages.js DUR 6.

### 17. karate-chop | NEEDS REVIEW
- Source: Power 50, PP 25, high crit. Modern type is Fighting.
- Conversion: arc 1.2 x 50, static, nearest, 0.15 s, damage + knockback 110, type normal "kept normal per Jess".
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.7.
- Expected gameplay: narrow chop with strong push.
- Consistency: the `normal` type comes from a data defect, not from the source: api_move_dataset.json `type` is computed from `resolved_source.type_id` (changelog rolled back to Generation 1, where Karate Chop was Normal), while every numeric fact uses the modern `source`. Legacy had fighting. The decision "type kept normal" may have rested on that artifact. Crit flavor dropped (no-move-crit lean).
- Evidence: API source.type_id 2 vs resolved_source.type_id 1, D feel, L type fighting.

### 18. aura-sphere | NEEDS REVIEW
- Source: Power 80, PP 20, never misses (acc null), single target.
- Conversion: 6 points 8 px, spread 2 pi, pierce 0, targeting none, travels 120 px/s, path curve 1.5 rad/s, endOn 2 / wall / offScreen.
- Generated: matches. Resolution: cd 0.875.
- Expected gameplay: six slow orbs fanned around the caster, each turning at a constant 1.5 rad/s.
- Consistency: deliberate redesign per feel. But the math does not give a spiral "outward": constant speed with constant turn rate traces a circle of radius v / w = 80 px that passes back through the caster. Maximum distance from the caster is 160 px, reached at about 2.1 s, so with endOn 2 s each orb tops out near 160 px. A pinwheel of short loops, far shorter reach than legacy (about 600 px). Needs a gameplay look.
- Evidence: D, MOVE-AXIS-SCHEMA.md `path.curve` definition, L speed 300 life 2.

### 19. lick | OK
- Source: Power 30, PP 30, paralysis 30%.
- Conversion: arc 0.8 x 64, static, nearest, 0.15 s, damage + paralysis 30%.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.583.
- Expected gameplay: thin long poke.
- Consistency: coherent.
- Evidence: D, R.

### 20. shadow-ball | NEEDS REVIEW
- Source: Power 80, PP 15, 20% chance Sp. Def -1.
- Conversion: point 9 px, pierce 1, spread 0.1, travels 280, endOn 1.2 / wall / offScreen, damage + stat spDef -1 foe individual (no chance, no duration).
- Generated: matches. Resolution: cd 1.167 (formula, equals legacy).
- Expected gameplay: shot through one enemy, always lowers Sp. Def on both hits.
- Consistency: (a) source chance 20 dropped, making the debuff 100%; the feel does not say it was dropped on purpose. (b) Feel says the debuff is compensated by "longer cooldown (cd lives in the overrides file)", but there is no override, so the cd is the plain formula. (c) Duration undefined (Q4).
- Evidence: D feel, API stat_chance 20, move-overrides.js, R.

### 21. dragon-rage | OK
- Source: fixed 40 damage, PP 10, power null.
- Conversion: linear 250 x 30, pierce UNLIMITED, static, nearest, 0.5 s, special fixedDamage 40 ignoring type and defense.
- Generated: matches. Resolution: count 1, spread 0, handler fixedDamage (enemyHit, stub), cd 3.5 from the uncommitted override (legacy 1).
- Expected gameplay: Hydro Pump beam that deals a flat 40 to everything in it.
- Consistency: coherent. Flat 40 cannot scale with enemy HP growth (DECISIONS 2026-10-17 says enemy HP grows about 10x over a run), so this falls off late unless upgrades touch `amount`; that is design, not a defect.
- Evidence: D, R, move-handler.js.

### 22. dragon-dance | OK
- Source: status, Atk +1 and Speed +1.
- Conversion: two stat effects, team, duration 4 each.
- Generated: matches. Resolution: cd 8 (override).
- Expected gameplay: 4 s of +1/+1 every 8 s (50% uptime), deliberate per feel.
- Consistency: coherent. Legacy carried `stage2.stat 'spe'` with `dur 8`; new data is cleaner.
- Evidence: D, R, L.

### 23. metal-claw | NEEDS REVIEW
- Source: Power 50, PP 35, acc 95, 10% chance user Atk +1.
- Conversion: arc 1.6 x 50, static, nearest, 0.15 s, damage + stat atk +1 side self scope team (no chance, no duration) + knockback 60.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.5.
- Expected gameplay (schema reading): the payload runs per enemy hit, so EVERY enemy struck adds one team Atk application. Three enemies in the cone = +3 in one swing, every 0.5 s, clamped only by the +-6 cap.
- Consistency: (a) source chance 10 dropped without a stated reason. (b) A self or team rider placed in a per-hit payload multiplies with crowd size; the schema has no "once per cast" trigger for non-emit effects. (c) No duration (Q4). (d) Scope team here vs individual on Meteor Mash for the same kind of rider (Q15).
- Evidence: D, API stat_chance 10, move-attributes.js EFFECT (only recoil has a trigger), S stages.js (stage = sum of live applications).

### 24. flash-cannon | NEEDS REVIEW
- Source: Power 80, PP 10, 10% Sp. Def -1.
- Conversion: linear 220 x 30, pierce UNLIMITED, static, nearest, 0.5 s, damage + stat spDef -1 foe individual (no chance).
- Generated: matches. Resolution: count 1, spread 0, cd 1.75.
- Expected gameplay: beam, every enemy hit always loses one Sp. Def stage.
- Consistency: source chance 10 dropped without a stated reason (compare Psychic, which keeps its 10). Duration undefined (Q4).
- Evidence: D, API stat_chance 10.

### 25. bite | OK
- Source: Power 60, PP 25, flinch 30%. Modern type Dark (API file says normal, C9).
- Conversion: arc 1.5 x 46, static, nearest, 0.15 s, damage + knockback 70 + flinch 30.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.7.
- Expected gameplay: short cone with push and flinch.
- Consistency: coherent; the hand correction to dark is right and matches legacy.
- Evidence: D, API source.type_id 17, L.

### 26. bonemerang | NEEDS REVIEW
- Source: Power 50, PP 10, acc 90, hits twice.
- Conversion: 2 points 8 px, spread 0.5, pierce UNLIMITED, direction, returns 300 px/s, outAndBack, endOn 2 / returned, oncePerInstance, damage + knockback 40 along travel.
- Generated: matches. Resolution: cd 1.75.
- Expected gameplay: two bones out and back.
- Consistency: same contradiction as Razor Leaf (oncePerInstance vs outAndBack). Here it matters more: "hits twice" is the source identity and outAndBack is its only carrier. No turnaround distance (legacy 230). Knockback "along travel" reverses on the return leg, pulling enemies toward the caster; worth a look.
- Evidence: D, API hits 2-2, DECISIONS.md 2026-10-26.

### 27. psycho-cut | NEEDS REVIEW
- Source: Power 70, PP 20, high crit.
- Conversion: arc 1.7 x 48, static, nearest, 0.15 s, damage + crit {critChance 15}.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.875.
- Expected gameplay: Tackle-shaped cut with +15 percentage points of crit chance.
- Consistency: unit mismatch risk. The grammar types critChance as an integer (15). Existing combat.js computes crit as a probability (`pl.critChance`, compared with Math.random()). The executor must divide by 100; nothing documents that.
- Evidence: D, move-attributes.js EFFECT.crit, S combat.js 609-610.

### 28. quick-attack | NEEDS REVIEW
- Source: Power 40, PP 30, priority +1.
- Conversion: point 46 px around the caster, pierce 0, nearest, repositions swept, dashMult 10, returnToOrigin true, returnHits outAndBack, endOn returned, casterState iframes 0.3, oncePerInstance, damage only.
- Generated: matches. Resolution: spread 0, cd 0.583.
- Expected gameplay (intended): lunge to the nearest enemy and back, hitting on both legs.
- Consistency: **three-way contradiction**. pierce 0 means "the instance terminates on its first enemy hit" (pierce owns enemy-contact termination), so the instance ends at the first contact, before any return, and `endOn returned` never fires; even if it did, oncePerInstance blocks a second hit on the same enemy, so outAndBack can only add hits on other enemies, which pierce 0 forbids. Separately: no maximum dash distance in the schema (legacy 110 px), so "to the nearest enemy" is unbounded; and 0.3 s of i-frames is fixed while traversal time is derived (2 x distance / (10 x move speed)), so a long dash outlives its i-frames. Knockback dropped vs legacy (40), not mentioned in feel.
- Evidence: D, MOVE-AXIS-SCHEMA.md pierce and endOn sections, DECISIONS.md 2026-10-24 REPOSITION, L radius 110.

### 29. flamethrower | NEEDS REVIEW
- Source: Power 90, PP 15, burn 10%.
- Conversion: arc 0.9 x 250, nearest, static, aimTrack 1.4 rad/s, endOn 1.0, interval rehit 0.2, damage + burn 10%.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 1.167. aimTrack kept (data sets it).
- Expected gameplay: a swiveling 250 px cone that re-damages anything inside every 0.2 s for 1 s.
- Consistency: structurally coherent. Suspected balance outlier: 5 full-power ticks per cast, Power/s about 386 vs Tackle 80. Normalization was removed on purpose, so this is a simulator question, not a defect. Burn rolls 5 times per cast unless the legacy 0.5 s roll gap is carried over (Q14).
- Evidence: D, DECISIONS.md 2026-10-26 (normalization removed), S combat.js procAilments roll gap.

### 30. fire-spin | NEEDS REVIEW
- Source: Power 35, PP 15, acc 85, trap 100% for 4-5 turns. No burn in source.
- Conversion: 3 points 14 px orbiting at 90 px, 3 rad/s, pierce UNLIMITED, endOn notActive, interval rehit 0.4, damage + burn 100% + trap 100%.
- Generated: matches. Resolution: spread 0, no cd (lasts while active, intended per parity notes).
- Expected gameplay: three fire orbs circle the caster while selected and burn whatever they touch.
- Consistency: (a) **trap does nothing to enemies**: status.js `apply` returns 'none' for trap on any non-player host ("player-only swap lock"). The trap rider is dead weight. (b) Burn 100% on every 0.4 s tick; legacy throttled rolls to one per 0.5 s per move per target and used a half-strength burn plus a stat strip (`strip`, `burnHalf`), neither of which survives in the new data or the feel. (c) Power/s per orb contact 87.5.
- Evidence: D, S status.js line 84 and line 33, L strip/burnHalf.

### 31. heat-wave | OK
- Source: Power 95, PP 10, acc 90, burn 10%, all opponents.
- Conversion: full circle radius 250, caster, none, static, grow radRadius 625 px/s per time, endOn 0.4, oncePerInstance, damage + burn 10%.
- Generated: matches. Resolution: count 1, spread 0, pierce UNLIMITED, cd 1.75.
- Expected gameplay: a ring expanding 0 to 250 px in 0.4 s, hitting each enemy once as it passes.
- Consistency: coherent under the worked example's rule (radRadius is the MAX, growth starts at 0, growSpeed x time = radRadius exactly). See Psychic for the conflicting reading (C3).
- Evidence: D, MOVE-AXIS-SCHEMA.md "expanding-ring nova".

### 32. leaf-storm | NEEDS REVIEW
- Source: Power 130, PP 5, user Sp. Atk -2 after attacking.
- Conversion: 4 points 14 px orbiting at 95 px, 5 rad/s, endOn notActive, interval rehit 0.25, damage + stat spAtk -2 side self scope individual (no chance, duration, maxStacks).
- Generated: matches. Resolution: spread 0, no cd (lasts while active).
- Expected gameplay (schema reading): every damage tick on every enemy also applies -2 Sp. Atk to the caster. One orb grinding one enemy applies it 4 times a second, so the caster sits at -6 Sp. Atk almost immediately and stays there.
- Consistency: feel says "spAtk -2 on SELF after cast". The data puts it in the per-hit payload, and the schema has no per-cast trigger for a stat effect. Intent and representation disagree (C7). Also the self debuff hits the move's own damage (special), so Leaf Storm would quarter itself. Power/s per orb contact 520, the largest in the set.
- Evidence: D feel and payload, move-attributes.js EFFECT, S stages.js (sum of applications, clamp 6).

### 33. discharge | NEEDS REVIEW
- Source: Power 80, PP 15, paralysis 30%, hits all others.
- Conversion: shapeless parent (caster, none, static, endOn 0.6) with emit {every 0.2, count 2, trigger cast} of an inline full-circle 220 px world-anchored ring growing 550 px/s, endOn 0.4, damage + paralysis 30%.
- Generated: matches. Resolution: child count 1, spread 0, pierce UNLIMITED; parent hitPolicy default; cd 1.167.
- Expected gameplay: two rings 0.2 s apart blooming from where the caster stood, each a full 80-power hit.
- Consistency: the feel wants both rings to carry the rider, which implies two full hits per cast (Power/s about 137). Undocumented emit timing contract: whether `trigger cast` + `every` + `count` means "first at t=0, then every 0.2 s" is not written in the grammar or the schema doc (Q7). Child takes power and type from the parent (grammar comment on INLINE), so each child is a full-power hit.
- Evidence: D, move-attributes.js INLINE comment, MOVE-AXIS-SCHEMA.md emit row (no `count`).

### 34. thunderbolt | NEEDS REVIEW
- Source: Power 90, PP 15, paralysis 10%.
- Conversion: point 10 px anchored on the target, nearest, static, endOn 0, chainHops 4, hopRange 140, cardLock count, damage + paralysis 10% + special chainDamageFalloff 0.33.
- Generated: matches. Resolution: spread 0, pierce UNLIMITED, cd 1.167, handler (enemyHit, stub).
- Expected gameplay: instant strike on the nearest enemy, then four jumps at 0.33x damage.
- Consistency: structurally coherent. Unresolved: do chain hits roll the paralysis rider, and at what chance (splash halves riders; chains have no rule) (Q10). Whether a chain may revisit an enemy is implied by oncePerInstance but not stated.
- Evidence: D, MOVE-AXIS-SCHEMA.md chainHops and splash rows.

### 35. psychic | NEEDS REVIEW
- Source: Power 90, PP 10, 10% Sp. Def -1.
- Conversion: arc 0.5 rad x 70 px, caster, nearest, travels 80 px/s, turnRate 2.5, grow radArc 1.5 rad/s per time max 2.0, endOn 1.2 / offScreen, damage + stat spDef -1 chance 10.
- Generated: matches. Resolution: spread 0, pierce UNLIMITED, cd 1.75.
- Expected gameplay (intended): a wedge that starts at 0.5 rad, widens to 2.0 rad by t = 1.0 s, drifting about 96 px total while homing.
- Consistency: **conflicts with every other grow move (C3)**. Here the authored dimension is the START value and `max` the cap; in the five novas the authored radRadius is the END value and growth starts from 0 with no `max`. One executor rule cannot satisfy both. Also undefined: what "a traveling arc" is (does the apex travel with the wedge opening along the heading?), and turnRate units (schema doc calls it a "damp coefficient", feel treats it as homing strength).
- Evidence: D, move-attributes.js grow, MOVE-AXIS-SCHEMA.md grow and turnRate rows, heat-wave entry.

### 36. mud-shot | OK
- Source: Power 55, PP 15, acc 95, 100% Speed -1.
- Conversion: 6 points 7 px, spread 2 pi, pierce 0, direction, travels 300, endOn 1.2 / wall / offScreen, damage + stat spd -1 chance 100.
- Generated: matches. Resolution: cd 1.167.
- Expected gameplay: ring of six blobs, each slows what it hits.
- Consistency: coherent (point-blank, one enemy can take at most one or two blobs). Duration undefined (Q4); `spd` naming hazard (C8).
- Evidence: D, R.

### 37. gust | NEEDS REVIEW
- Source: Power 40, PP 35. Modern type Flying (API file says normal, C9).
- Conversion: shapeless parent (direction, static, endOn 0.4) emitting {every 0.08, count 3, cast} an inline point 7 px, count 1, pierce 0, spread 0.25, travels 380, endOn 1.2 / wall / offScreen, damage + knockback 70.
- Generated: matches. Resolution: parent hitPolicy default, cd 0.5 (formula; legacy 0.26 as an orbit, intended change).
- Expected gameplay: three quick shots in sequence.
- Consistency: **defect against intent**. The feel says each shot has "a slight aim spread so the three don't stack perfectly". The child's spread 0.25 sits on count 1, and the slice 1 rule is that spread is ignored at count 1, so all three shots fly the same line (apart from the legacy +-0.03 rad jitter, which is combat code, not data). Also: 3 full-power hits per cast, Power/s up to 240. Emitter lifetime 0.4 s vs 3 x 0.08 s leaves room for only a couple more shots if a card raises the emit count (S10).
- Evidence: D feel, DECISIONS.md 2026-10-25 spread rule, slice-2.md "random aim jitter".

### 38. hyper-voice | OK
- Source: Power 90, PP 10.
- Conversion: full circle 380 px, grow 760 px/s, endOn 0.5, oncePerInstance, damage.
- Generated: matches. Resolution: count 1, spread 0, pierce UNLIMITED, cd 1.75.
- Expected gameplay: biggest ring, 0 to 380 px in 0.5 s.
- Consistency: coherent (760 x 0.5 = 380).
- Evidence: D, R.

### 39. toxic | OK
- Source: status, badly poisons, acc 90.
- Conversion: shapeless parent (endOn notActive) emitting {every 0.1, trigger casterMove} inline world patches 22 px, pierce UNLIMITED, interval rehit 0.25, endOn 0.6, poison 100%.
- Generated: matches. Resolution: child spread 0, parent hitPolicy default, no cd (working tree removed its override; power null so the formula never applies).
- Expected gameplay: while selected and moving, the caster leaves a ribbon of short poison patches.
- Consistency: coherent with the accepted stand-in (no ribbon primitive, no escalating DoT). Standing still lays nothing; that matches "trail". Note that "no cd" here means "cast once when selected", the same meaning as Fire Spin, but it reached that state by deleting an override, not by the resolver's persistent-move rule (C13).
- Evidence: D, move-overrides.js diff, move-resolver.js lastsWhileActive.

### 40. bulldoze | OK
- Source: Power 60, PP 20, 100% Speed -1, hits all others.
- Conversion: full circle 200 px, grow 500 px/s, endOn 0.4, damage + stat spd -1 chance 100.
- Generated: matches. Resolution: count 1, spread 0, pierce UNLIMITED, cd 0.875.
- Expected gameplay: medium stomp ring that slows everything it passes.
- Consistency: coherent. Duration undefined (Q4).
- Evidence: D, R.

### 41. string-shot | NEEDS REVIEW
- Source: status, Speed -2 (API stat_changes -2), acc 95.
- Conversion: 2 points 7 px, spread 0, pierce 0, direction, travels 320, endOn 1.2 / wall / offScreen, stat spd -2 foe individual + trap 100%.
- Generated: matches. Resolution: cd 0.5 (uncommitted override; legacy 1.1).
- Expected gameplay: two strands on the same line.
- Consistency: (a) trap does nothing to enemies (status.js), so half the payload is inert. (b) Spread 0 at count 2 stacks both strands on one line; both strike the same first enemy, applying -2 twice (-4) unless stacking rules say otherwise. Feel says "stacked" deliberately, so confirm the double application is wanted. (c) Duration undefined (Q4).
- Evidence: D, S status.js line 84.

### 42. bug-buzz | OK
- Source: Power 90, PP 10, 10% Sp. Def -1.
- Conversion: full circle 120 px, caster, none, static, endOn notActive, interval rehit 0.5, damage + stat spDef -1 maxStacks 1 (no chance).
- Generated: matches. Resolution: count 1, spread 0, no cd (lasts while active, Jess confirmed).
- Expected gameplay: a permanent 120 px damaging aura, 90 power every 0.5 s to everything inside, each enemy debuffed once.
- Consistency: coherent with the feel (debuffs once). The 10% chance was dropped; the feel's "debuffs just once" reads as intended. Suspected balance outlier: Power/s 180 to every enemy in range, uncapped by targets (S1).
- Evidence: D, parity report note.

### 43. rock-slide | NEEDS REVIEW
- Source: Power 75, PP 10, acc 90, flinch 30%, all opponents.
- Conversion: full circle 70 px, world, location, falls, endOn 0.2, casterState delay 0.4, damage + flinch 30.
- Generated: matches. Resolution: count 1, spread 0, pierce UNLIMITED, cd 1.75.
- Expected gameplay: one telegraphed impact circle.
- Consistency: (a) feel says "boulders" (plural), data has count 1 (legacy 3). (b) `targeting: location` has no rule for which location (nearest enemy, densest cluster, random in range). (c) `falls` has no speed and the grammar does not define what falls does beyond static; it currently means nothing mechanically. (d) The telegraph delay lives in casterState, which the schema defines as effects on the CASTER; whether the caster is held for 0.4 s is unstated (no commitment given, so presumably not).
- Evidence: D, MOVE-AXIS-SCHEMA.md caster state, move-attributes.js (no `falls` rule).

### 44. powder-snow | OK
- Source: Power 40, PP 25, freeze 10%.
- Conversion: arc 1.7 x 48, static, nearest, 0.15 s, damage + freeze 10%.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.7.
- Expected gameplay: Tackle-shaped ice jab.
- Consistency: coherent; intentional conversion to melee.
- Evidence: D, R.

### 45. fairy-wind | OK
- Source: Power 40, PP 30.
- Conversion: parent emitting {every 0.08, count 3, cast} inline point 7 px, pierce 0, spread 0, travels 340, curve 2.0 rad/s, endOn 1.2 / wall / offScreen, damage.
- Generated: matches. Resolution: parent hitPolicy default, cd 0.583.
- Expected gameplay: three shots in sequence on one curving line (turn radius 170 px, about 137 degrees of turn over the lifetime).
- Consistency: coherent; zero spread is explicit here, unlike Gust. 3 full-power hits per cast, Power/s up to 206.
- Evidence: D, R.

### 46. dazzling-gleam | OK
- Source: Power 80, PP 10, all opponents.
- Conversion: half circle (3.1416) 130 px, caster, nearest, grow 650 px/s, endOn 0.2, cardLock radArc.
- Generated: matches. Resolution: count 1, spread 0, pierce UNLIMITED, cd 1.75.
- Expected gameplay: fast half-ring flash toward the nearest enemy.
- Consistency: coherent (650 x 0.2 = 130).
- Evidence: D, R.

### 47. dark-pulse | OK
- Source: Power 80, PP 15, flinch 20%.
- Conversion: full circle 200 px, grow 500, endOn 0.4, damage + flinch 20.
- Generated: matches. Resolution: count 1, spread 0, pierce UNLIMITED, cd 1.167.
- Expected gameplay: ring with flinch.
- Consistency: coherent.
- Evidence: D, R.

### 48. night-shade | OK
- Source: damage equal to user level, power null.
- Conversion: full circle 120 px, endOn notActive, interval rehit 0.5, special levelDamage.
- Generated: matches. Resolution: count 1, spread 0, handler levelDamage (enemyHit, stub); no cd (override removed in working tree; power null).
- Expected gameplay: a permanent aura dealing (active Pokemon level) per 0.5 s to everything within 120 px.
- Consistency: coherent. Same implicit "no cd = persistent" contract as Toxic (C13).
- Evidence: D, R, move-overrides.js diff.

### 49. spikes | NEEDS REVIEW
- Source: status field hazard.
- Conversion: world point 40 px, location, static, trigger contact, endOn notActive, trap 100%.
- Generated: matches. Resolution: spread 0, pierce UNLIMITED, cd 1.1 (override).
- Expected gameplay (intended): lay mines that trap an enemy that steps on them.
- Consistency: **the move does nothing to enemies**. Its only payload is trap, and status.js ignores trap on non-player hosts. Also: a new mine every 1.1 s with no timeout and no instance cap accumulates without limit while selected (S6, G4); `location` selection undefined (Q8); whether detonation affects one enemy or all within 40 px is unstated (pierce default UNLIMITED suggests all).
- Evidence: D, S status.js line 84, move-attributes.js (no instance cap).

### 50. toxic-spikes | OK
- Source: status field hazard (poison).
- Conversion: world point 40 px, location, static, endOn 3 s; emit on termination {count 1} an inline full circle 100 px growing 400 px/s for 0.25 s with poison 100%.
- Generated: matches. Resolution: spread 0, pierce UNLIMITED (parent and child), child count 1, cd 1.1 (override).
- Expected gameplay: a mine that bursts into a poison ring 3 s after being laid; about three alive at once.
- Consistency: coherent. The parent's 40 px body has no contact payload (inert by design). `location` selection undefined (Q8).
- Evidence: D, R.

### 51. hail | NEEDS REVIEW
- Source: status, hail for five turns.
- Conversion: shapeless self (targeting none), special setWeather snow duration 10.
- Generated: matches. Resolution: handler setWeather (cast, stub), cd 1.2 (override).
- Expected gameplay: snow weather while selected.
- Consistency: cd 1.2 with duration 10 recasts the weather about 8 times per duration, so the duration is meaningless and the weather is permanent while selected. The feel said duration and cd were to be hand-set; the two values do not look coordinated. Weather id `snow` exists in weather.js.
- Evidence: D, move-overrides.js, weather.js.

### 52. meteor-mash | NEEDS REVIEW
- Source: Power 90, PP 10, acc 90, 20% user Atk +1.
- Conversion: point 9 px, pierce 0, travels 330, cardLock count and pierce, damage + stat atk +1 self individual chance 20 + emit {trigger enemyHit, count 3} of inline points 6 px with space.count 3, spread 0.6, world, direction, travels 360, endOn 0.8 / wall / offScreen, damage.
- Generated: matches. Resolution: parent spread 0, cd 1.75.
- Expected gameplay (intended): punch lands, bursts into a 3-shard fan.
- Consistency: **double count**. emit.count 3 AND child space.count 3: the data says either 3 shards or 9 (3 emissions of a 3-shard fan); nothing defines which. Children are full power (90 each). Children spawn at the impact point with pierce 0 and `oncePerInstance` is per instance, so a shard can immediately hit the enemy that was just struck (S8). Child `targeting: direction` from a world anchor has no defined direction source (parent heading at impact is the obvious reading). Self rider scope individual vs Metal Claw team (Q15).
- Evidence: D, move-attributes.js emit and INLINE.

### 53. will-o-wisp | OK
- Source: status, burns, acc 85, power null.
- Conversion: world turret 12 px, location, static, endOn ownerDeath / 6 s, emit {every 0.8, interval} inline point 7 px, pierce 0, world, nearest, travels 300, endOn 1.5 / wall / offScreen, burn 100%.
- Generated: matches. Resolution: spreads 0, parent pierce UNLIMITED, cd 3.5 (override).
- Expected gameplay: a turret placed somewhere that spits burning wisps at the nearest enemy every 0.8 s for 6 s; two turrets overlap at cd 3.5.
- Consistency: coherent. Minor: power 0 where the API has null (violates the "verbatim raw-source lift" rule in DECISIONS 2026-10-24; harmless to the resolver). `ownerDeath` owner is undefined for a team game (caster dying, or the active member swapping).
- Evidence: D, API power null, DECISIONS.md 2026-10-24.

### 54. substitute | NEEDS REVIEW
- Source: status, 1/4 max HP into a decoy.
- Conversion: shapeless self, recoil 0.25 on cast, shield amount = 2 x paid, max = 2 x paid, regen = effect.max per s, duration 6, absorbsAll, overflow.
- Generated: matches. Resolution: cd 4 (override), power 0 (API null, as Will-O-Wisp).
- Expected gameplay: pay 25% HP, get a 50%-max-HP shield that refills fully every second for 6 s.
- Consistency: grammar and formula refs are valid. Suspected interaction: cd 4 is shorter than the 6 s shield, so a second cast lands while the first shield is up, paying another 25% HP; stacking or refresh of shields is not defined. The schema worked example used cd 30. A full refill each second makes the caster close to immune to anything under 50% max HP per second.
- Evidence: D, MOVE-AXIS-SCHEMA.md Substitute example (cd 30), move-overrides.js.

### 55. aerial-ace | NEEDS REVIEW
- Source: Power 60, PP 20, never misses.
- Conversion: point 46 px around the caster, nearest, repositions teleport, returnToOrigin false, endOn 0.1, iframes 0.3, damage + knockback 80 + confusion 50%.
- Generated: matches. Resolution: spread 0, pierce UNLIMITED, cd 0.875.
- Expected gameplay: blink onto the nearest enemy and slash everything within 46 px.
- Consistency: structurally coherent. No maximum teleport distance in the schema (legacy 120 px), so the caster can blink across the screen every 0.875 s. 50% confusion has no API basis (source has no ailment); it is a design addition stated in the feel, fine, noted.
- Evidence: D, API meta, L radius 120.

### 56. flame-wheel | NEEDS REVIEW
- Source: Power 60, PP 25, burn 10%.
- Conversion: shapeless parent (endOn notActive) emitting {every 0.12, casterMove} inline world patches 24 px, pierce UNLIMITED, interval rehit 0.3, endOn 0.7, damage + burn 10%.
- Generated: matches. Resolution: child spread 0, parent hitPolicy default, no cd (lasts while active).
- Expected gameplay: fire puddles trail behind the moving caster.
- Consistency: each patch is its own instance with its own rehit clock, so an enemy standing where patches overlap is hit by each one. At a caster speed near 150 px/s, patches are about 18 px apart with 48 px diameters, so 2 to 3 overlap at any point: roughly 400 to 600 Power/s for an enemy that follows the caster. Not a schema defect; a strong simulator candidate.
- Evidence: D, MOVE-AXIS-SCHEMA.md hitPolicy (per instance).

### 57. bubble-beam | NEEDS REVIEW
- Source: Power 65, PP 20, 10% Speed -1.
- Conversion: 7 points 7 px, spread 0.12, pierce 0, direction, travels 330, path oscillate amplitude 18 freq 3, endOn 1.4 / wall / offScreen, damage + stat spd -1 chance 10.
- Generated: matches. Resolution: cd 0.875.
- Expected gameplay: a weaving narrow stream of 7 bubbles.
- Consistency: coherent schema. Suspected outlier: a tight 0.12 rad fan at close range lands most of 7 full-power bubbles on one target, up to 455 Power per cast (Power/s up to 520); legacy normalized this to one third.
- Evidence: D, L norm 0.333.

### 58. hex | NEEDS REVIEW
- Source: Power 65, PP 10, double power if the target has a MAJOR status ailment.
- Conversion: point 8 px, pierce 0, chainHops 1, hopRange 150, direction, travels 420, damage + special statusBonus x2.
- Generated: matches. Resolution: spread 0, cd 1.75, handler statusBonus (enemyHit, stub).
- Expected gameplay: fast shot that jumps once, double damage on afflicted targets.
- Consistency: the feel says "if the target already has a status condition"; the source says major ailment. status.js distinguishes major (paralysis, freeze, sleep, plus burn/poison as DoTs) from control (confusion, trap, daze, drowsy) and stat stages. Which set doubles Hex is undefined (Q9). Whether the chain hop also gets the bonus is undefined.
- Evidence: D, API short_effect, S status.js CONTROL table.

### 59. thunder-shock | OK
- Source: Power 40, PP 30, paralysis 10%.
- Conversion: point 7 px, pierce 0, chainHops 1, hopRange 60, direction, travels 480, endOn 1.5 / wall / offScreen, damage + paralysis 10%.
- Generated: matches. Resolution: spread 0, cd 0.583.
- Expected gameplay: fast shot that forks once to a nearby enemy.
- Consistency: coherent. Chain hops deal full damage here (no falloff handler), unlike Thunderbolt; consistent with "little sibling", but note it (chain damage policy lives in a handler only for Thunderbolt).
- Evidence: D, R.

### 60. confusion | OK
- Source: Power 50, PP 25, confusion 10%.
- Conversion: point 7 px, pierce 0, nearest, travels 280, turnRate 3, endOn 1.6 / wall / offScreen, damage + confusion 10%.
- Generated: matches. Resolution: spread 0, cd 0.7.
- Expected gameplay: slow homing bolt.
- Consistency: coherent. turnRate units undefined (Q13; legacy `homing 2` was a damp coefficient).
- Evidence: D, MOVE-AXIS-SCHEMA.md turnRate.

### 61. psybeam | OK
- Source: Power 65, PP 20, confusion 10%.
- Conversion: linear 215 x 30, pierce UNLIMITED, static, nearest, 0.5 s, damage + confusion 10%.
- Generated: matches. Resolution: count 1, spread 0, cd 0.875.
- Expected gameplay: shorter confuse beam.
- Consistency: coherent.
- Evidence: D, R.

### 62. sludge | OK
- Source: Power 65, PP 20, poison 30%.
- Conversion: point 7 px, pierce 0, travels 310, endOn 1.6 / wall / offScreen, damage + poison 30%.
- Generated: matches. Resolution: spread 0, cd 0.875.
- Expected gameplay: Ember template with poison.
- Consistency: coherent.
- Evidence: D, R.

### 63. wing-attack | OK
- Source: Power 60, PP 35. Modern Power 60 (resolved_source shows the old 35).
- Conversion: arc 1.9 x 58, static, nearest, 0.15 s, damage + knockback 70.
- Generated: matches. Resolution: pierce UNLIMITED, spread 0, cd 0.5.
- Expected gameplay: broad wing sweep, Power/s 120 (higher than Tackle at the same cd, by Power).
- Consistency: coherent.
- Evidence: D, R.

### Tally
OK 35, NEEDS REVIEW 28, UNVERIFIABLE 0 (Bug Bite's berry special is unverifiable by design; the move itself is graded on its cd).

---

## 2. Confirmed inconsistencies and defects

| id | finding | moves | layer |
|---|---|---|---|
| C1 | `hitPolicy: oncePerInstance` contradicts `returnHits: outAndBack`; the back leg cannot re-hit, against DECISIONS 2026-10-26 ("each pass hits at full power") | razor-leaf, bonemerang, quick-attack | data vs grammar semantics |
| C2 | Quick Attack `pierce: 0` ends the instance on first contact, before `endOn returned`, making the return and outAndBack unreachable | quick-attack | data |
| C3 | Grow base value means END (novas: radRadius = max, start 0) in five moves and START (Psychic: radArc 0.5 grows to max 2.0) in one | heat-wave, hyper-voice, bulldoze, dark-pulse, dazzling-gleam, discharge child, toxic-spikes child vs psychic | schema semantics |
| C4 | Child spread on a count-1 inline move is ignored by the settled rule, so Gust's three shots stack, against its feel | gust | data vs rule |
| C5 | Meteor Mash sets emit.count 3 and child space.count 3; 3 or 9 shards is undefined | meteor-mash | schema semantics |
| C6 | Trap is a player-only swap lock; `G.Status.apply` returns 'none' for trap on enemies. Spikes is a no-op; trap riders on Fire Spin and String Shot are inert | spikes, fire-spin, string-shot | data vs runtime |
| C7 | Self/team stat riders sit in the per-hit payload, so they fire once per enemy hit; Leaf Storm's feel says "after cast". No per-cast trigger exists for non-emit effects | leaf-storm, metal-claw (also meteor-mash, giga-drain heal is fine per hit) | schema gap |
| C8 | Stat key collision: schema `spd` = Speed, `spDef` = Sp. Def; stages.js `spd` = Sp. Def, `spe` = Speed, `spa` = Sp. Atk. combat.js already maps 'spd' to 'spe' for buffs. A naive pass-through swaps Speed and Sp. Def silently | every stat move (17 effects) | contract |
| C9 | api_move_dataset.json `type` comes from `resolved_source` (changelog rolled back to Gen 1) while numerics come from modern `source`. Karate Chop's `normal` type rests on this; Bite and Gust were hand-corrected | karate-chop (bite, gust fixed) | upstream data |
| C10 | Overrides promised in the feel are missing: Bug Bite cd 0.42; Shadow Ball "longer cooldown" | bug-bite, shadow-ball | overrides |
| C11 | Source stat chances dropped with no stated reason, turning riders into 100% | metal-claw (10), flash-cannon (10), shadow-ball (20) | conversion |
| C12 | check.js fails on the working tree: move_parity self-test hard-codes `hail.cd === undefined`. Test defect. Parity report is stale | tooling | test |
| C13 | "No cd" means two things: unset, and cast-once-while-selected. The resolver's `lastsWhileActive` rule keys on any `endOn notActive`, which also describes a placed instance that merely dies on deselect (Spikes). A future damaging mine with that endOn would silently lose its cooldown | resolver; toxic, night-shade reached "no cd" by deleting overrides | resolver |
| C14 | Power 0 where the source has null, against the verbatim-lift rule | will-o-wisp, substitute | data (harmless) |

## 3. Suspected issues requiring gameplay validation

- S1. Throughput outliers (Power/s proxy, not damage): leaf-storm 520 per orb contact, bubble-beam up to 520, flame-wheel about 400 to 600 for a follower, flamethrower 386, gust 240, fairy-wind 206, bug-buzz 180 to every enemy within 120 px, discharge 137, vs tackle 80. This is exactly the damage-simulator question; no normalization proposed here.
- S2. Aura Sphere reach is about 160 px by the curve math, a large drop from legacy.
- S3. Quick Attack i-frames (fixed 0.3 s) vs derived traversal time; Quick Attack and Aerial Ace have no distance cap.
- S4. Overlapping trail patches multiply hits (flame-wheel, toxic).
- S5. Substitute cd 4 shorter than its 6 s shield; repeated 25% HP payments, undefined shield stacking.
- S6. Hail cd 1.2 vs duration 10; Spikes unbounded accumulation.
- S7. String Shot's two stacked strands double-apply the debuff.
- S8. Meteor Mash shards spawned on the impact point can hit the enemy just struck.
- S9. Fire Spin 100% burn every 0.4 s; legacy roll gap and half burn dropped.
- S10. Emitter parent lifetimes (Gust 0.4 s, Fairy Wind 0.4 s, Discharge 0.6 s) clip extra emissions if a card raises emit count.
- S11. Rock Slide count 1 vs "boulders"; knockback dropped vs legacy.
- S12. Bonemerang's knockback "along travel" pulls enemies toward the caster on the return leg.

## 4. Ambiguous design decisions (your call)

- Q1 (blocking). Grow: is the authored dimension the start or the end? Options: (a) authored = end, growth from 0, optional `max` unused (Psychic must change to radArc 2.0 with some start); (b) authored = start, `max` = end (every nova needs radRadius tiny plus max); (c) add an explicit `from` to grow.
- Q2 (blocking). Return legs: should an enemy hit on the way out be hittable again on the way back? If yes, the cleanest expression is a hit-eligibility reset at the turnaround, not a new hitPolicy.
- Q3 (blocking). Quick Attack: should it hit one enemy (then pierce 0 must not end the dash) or dash through? What ends a dash instance, contact or return?
- Q4 (blocking for stat executor). Stat effects with no `duration`: 6 s like stages.js, permanent, or required? Default for `maxStacks`? Do self/team riders fire per hit or once per cast?
- Q5. Trap on enemies: give it an enemy meaning (root or slow) or replace those riders. Spikes needs something either way.
- Q6. Accuracy: miss roll, expected-value multiplier, or ignored? (DECISIONS 2026-10-26 leaves it to combat.)
- Q7. Emit contract: meaning of `count` with `every` and `trigger cast` (first emission at t = 0?), emit.count vs child space.count, children at full parent power (current reading) or not.
- Q8. Targeting: max acquisition range for `nearest`; how `location` picks a point; maximum reposition distance.
- Q9. Hex: which statuses double it (major only, any ailment, stat drops)? Does the chain hop get it?
- Q10. Do chain hops roll riders, and at what chance?
- Q11. Type source: modern types (Karate Chop = fighting) or keep normal?
- Q12. critChance units (percent points, presumably).
- Q13. turnRate units (rad/s, or a damping coefficient as in legacy homing).
- Q14. Keep the legacy 0.5 s per-move-per-target roll gap for ailments, flinch and stat riders on interval moves?
- Q15. Self raise scope: Metal Claw team vs Meteor Mash individual. Intended difference?
- Q16. Concurrent instance cap for placed objects (mines, turrets, patches)?
- Q17. `falls`: is it presentation only (telegraph then impact), and should the delay live on the instance rather than the caster?

## 5. Schema expressiveness gaps

- G1. `returns` has no turnaround distance or range; legacy used 210 to 230 px.
- G2. No per-cast trigger for stat, heal or other non-emit effects (only `recoil` has a trigger).
- G3. No acquisition range for `nearest`; no point-selection rule for `location`; no maximum reposition distance.
- G4. No concurrent-instance cap.
- G5. No escalating DoT (Toxic accepted without it).
- G6. No per-leg hit-eligibility reset (needed for C1 without abusing `interval`).
- G7. Rider inheritance for chain hops and emitted children is undefined (splash has a rule, nothing else does).
- G8. `multihit` and `spawn` exist in MOVE-AXIS-SCHEMA.md but not in the grammar (unused by the 63, so not urgent).
- G9. `cardLock` entries are free strings, not checked against real field names.
- G10. Grow has no explicit start value (see Q1).

Behavior the 63 moves do not exercise at all: splash (0 moves), `onReentry` (0), `selected` targeting (0), grow `per: distance` (0), grow on `linLength` (0), a traveling linear shape (0), turnRate on `returns` (0), `casterState.commitment` (0), `offScreen`-only lifetimes, emit with `termination` on a damaging parent, and enemy-cast use of any new definition (gym leaders still read legacy fields). Any combat path built only against these 63 will leave those branches untested.

## 6. Highest priority before combat implementation

1. Settle Q1, Q2, Q3 (grow start/end, return re-hit, dash termination). They decide the collision and hit-eligibility core every other slice builds on.
2. Settle Q4 and lock the stat-key mapping (C8) in writing, so the first stat executor cannot swap Speed and Sp. Def.
3. Settle Q7 (emit contract) before any emitter work; fix Meteor Mash and Gust data after.
4. Decide Q5 (trap on enemies) since Spikes is otherwise a dead move.
5. Close the bookkeeping: fill or justify Bug Bite and Shadow Ball overrides (C10), confirm the dropped chances (C11), fix the parity self-test and commit the override edit (C12).
6. Separate "persistent" from "cd unset" explicitly (C13), for example a resolved flag, so the executor does not infer cast-once behavior from a missing number.

## 7. Recommendation

The pipeline itself is sound: generation is lossless for all 63, the resolver does only what it documents, and grammar validation passes. The data is a faithful record of the feel pass. What is not ready is the **semantics** of a few axes the executor must interpret: grow start/end, return-leg hit eligibility, pierce on dashes, stat duration and trigger, and the emit contract. Those are short decisions, not redesigns.

Verdict: **ready for architectural design after limited clarifications** (Q1 to Q4, plus Q7 before emitter slices). The core path (static and traveling shapes, oncePerInstance and interval hit policies, damage, ailments) can be designed now; returns, repositions, stat riders and emitters should wait on their questions.

## 8. What this review did not do

- No new-path runtime exists, so nothing was executed or seen on screen. All gameplay descriptions are schema readings.
- combat.js, status.js and stages.js were searched and read in parts, not end to end.
- No headless-browser test was run (nothing in the new path is loaded by the game).


---

## 9. Consolidated decisions and status (updated 2026-10-26, after Checkpoints 2 and 3)

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This section is no longer the single source for move decisions. Absorbed into: docs/MOVE-AXIS-SCHEMA.md (grammar and data rules), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules, stages, maxStacks). Where this text and those documents differ, those documents win. Body below unchanged.

This section is the single source for decisions. Sources: docs/current feature planning/combat-architecture.md (Checkpoint 2, status PROPOSAL, awaiting Jess's approval) and combat-validation-and-handoff.md (Checkpoint 3).
Labels: DECIDED = Jess's answer. PROPOSED = a recommendation in a combat doc, not yet approved. OPEN = needs Jess. APPLIED = already in the data.
Caveat: the DECIDED labels for Q1 to Q17 are taken from combat-architecture.md, because the original resolutions text was not in this copy of the review.

### 9.1 Questions Q1 to Q17

| id | status | resolution | lands in |
|---|---|---|---|
| Q1 grow | DECIDED | The authored dimension is the START value and `grow.max` is the end. Novas are re-authored with `max` = today's radius and growSpeed unchanged (D-1). Start value DECIDED (Jess, 2026-10-26): 1 px, replacing D-1's "near the body radius". It passes the existing `radRadius` greater-than-0 rule, so no grammar change is needed. Psychic already conforms | slice 3a data |
| Q2 return legs | DECIDED | The back leg may hit again. Mechanism PROPOSED: hit records keyed by leg (R2), no new field | slice 4c |
| Q3 Quick Attack | DECIDED | Dash from A to B, hit at B, return to A. PROPOSED R1: pierce exhaustion disarms the hitbox but does not end a `repositions` instance. Data: `returnHits` becomes `out` | 3a data, 4c |
| Q4 stat riders | DECIDED | Stat `duration` defaults to 6 s and `maxStacks` to 6. Live applications from one move on one host are capped at maxStacks, and a capped application refreshes that move's oldest. Self and team riders still fire per hit, bounded by the cap (C7) | 3a grammar, 4a |
| Q5 trap | DECIDED | Trap on an enemy is a root (movement multiplier 0). Needs a status.js change | 4a |
| Q6 accuracy | DECIDED | Accuracy folds into `basePower` = power x accuracy / 100 (resolver) | 3a resolver |
| Q7 emit | DECIDED | An emitter is its own instance. Toxic Spikes becomes a 3 s placed emitter, interval every 0.25 s, child ring starts at 100 px. PROPOSED schedule (D29): `cast` emits first at activation, `interval` first at `every`. Emit `count` = total emissions, child `space.count` = shapes per emission | 3a data, 4d |
| Q8 range | DECIDED (Checkpoint 3) | One tunable `range`. Global default 420 px as a named constant beside the cooldown tuning (G.MoveResolver.TUNING), optional per-move `delivery.range`. Covers `nearest` acquisition, `location` reach, `returns` turnaround and maximum reposition distance | 3a, 3c, 4c |
| Q9 Hex | DECIDED | Doubles POWER (inside the attacker half, not a final x2) on a major ailment (paralysis, freeze, sleep, burn, poison, toxic; confusion and trap do not count), checked on every chain hop (Jess 2026-10-27, slice 4b S8; built) | 4b |
| Q10 chain riders | DECIDED | Chain hops roll riders at half chance per hop (chance x 0.5^k). Superseded targeting and falloff (Jess 2026-10-27, slice 4b S7, S10, S15): hop k deals x (1 - hopReduction)^k applied last; each hop picks the nearest enemy within `hopRange` of the previous hop, never that enemy, unhit enemies first, then revisits (two enemies ping-pong). Built | 4b |
| Q11 type | DECIDED | Karate Chop is Fighting | 3a data |
| Q12 crit units | DECIDED | `critChance` is percent points, divided by 100 in exactly one place | 3c / 4a |
| Q13 turnRate | DECIDED | rad/s, a clamped turn (not the legacy damp) | 3c |
| Q14 roll gap | DECIDED | Every eligible hit rolls its riders. The legacy 0.5 s roll gap is dropped for the new path, and the rehit time is the throttle | 4a |
| Q15 raise scope | APPLIED | Meteor Mash's Attack raise is scope `team`, matching Metal Claw (commit a68a366, verified in described.json) | done |
| Q16 instance cap | DECIDED (Checkpoint 3) | Placed objects with neither a time lifetime nor HP are capped at 8 live per move slot (named constant, default 8). A 9th removes that slot's oldest. Timed objects are bounded by their lifetime. Spikes keeps no timeout | 3a constant, 4d |
| Q17 delay | DECIDED | The telegraph delay lives on the instance (`delivery.delay`), not on `casterState`. Rock Slide moves | 3a grammar and data |

### 9.2 Other decisions

- **Persistent flag (C13): DECIDED.** An explicit top-level `persistent` boolean replaces the "no cd means persistent" inference. PROPOSED set for the flag: Fire Spin, Leaf Storm, Bug Buzz, Night Shade, Toxic, Flame Wheel. Spikes is deliberately NOT persistent. Validator rule: persistent forbids `cd` and requires an `endOn notActive`.
- **D-3, Meteor Mash: DECIDED.** The projectile hits enemy 1. At enemy 1's position at impact, a 3-projectile fan is emitted that ignores enemy 1. This fixes C5: emit `count` becomes 1 and the child `space.count` stays 3.
- **D-4, routing: DECIDED.** Per-move routing behind `?newcombat` until slice 7.
- **Normalization: none** (earlier decision, restated). The Power/s proxy (D37) is for tools only and never gameplay.
- **Stat key map (C8): PROPOSED.** One mapping function (schema `spd` is Speed, `spDef` is Sp. Def, stages.js `spd` is Sp. Def, `spe` is Speed). Renaming the 17 data effects is not recommended.
- **Slice 3b geometry (Jess, 2026-10-26): DECIDED.** D18 amended with an apex rule (an enemy covering the arc origin is inside at any angle). The lens is applied in shapeOf, after growth and its cap, to the radius and radArc only (beams are never widened); spawnInstance must not pre-scale. boundsOf takes the largest enemy radius for linear shapes. A radial shape with no radArc is a point.
- **Slice 3c sim core (Jess, 2026-10-26): DECIDED.** S1 a caster-anchored static shape gates on min(range, reach + target radius), reach from shapeOf at full growth with the lens (R9). S2 `direction` waits for any enemy within range, `none` never waits. S3 aim for `direction` and `none` is owner.aim at cast; `nearest` is the plain nearest (no player.js boss/threat priority, a 3d behavior change). S4 turnRate steers at the cast target, then one re-pick (D23). S5 offScreen uses a view rectangle passed as data (setView). S6 G.Status.fizzle takes an optional rng. S7 defender helpers copied into move-effects.js until slice 7. S8 pierce counts distinct enemies, spent in sweep order (ties by id); interval re-hits do not spend it. S9 root instances act in their cast frame (only children are deferred, R6). S10 nearest ties by enemy id, no rng. Lens: beam length scales, width never (D36); orbit radius stays in 4c. Timing: age advances before collision, an endOn time T instance collides on ceil(T / dt) steps, 1e-9 tolerance on time comparisons.
- **Still open from 3c (needed in 3d):** do player moves hit props (rocks, chests, grass), and do solid props spend pierce as in legacy? Tackle's 48 px circle no longer includes the player's body (legacy melee added player r x 1.3): check the feel in 3d.
- **Architecture approval: DONE (Jess, 2026-10-26).** combat-architecture.md is approved. Items marked PROPOSED are accepted as written, and every "recommend" default not otherwise decided is accepted.

### 9.3 New findings from Checkpoint 3

| id | finding | status |
|---|---|---|
| F1 | `spread` has three definitions (schema doc: angle between instances; legacy: total fan, capped at 2 pi; data: authored as total fan) | DECIDED (2026-10-26): spread is the total fan, evenly spaced at 2 pi or more. Write it into the grammar comment and MOVE-AXIS-SCHEMA.md |
| F2 | 420 px default range cuts the 2 s boomerang lifetime mid-return (Razor Leaf, Bonemerang) | DECIDED: Razor Leaf 210 px, Bonemerang 230 px (per-move `delivery.range`), the 2 s time cap stays as a safety net |
| F3 | `location` has no pick rule (legacy: mines at the feet, meteors on random enemies, turrets behind the caster) | DECIDED: an enum, "at caster" or "random enemy within range", defaulting to the enemy. Grammar in 3a, used by 4c and 4d |
| F4 | Emitted children deal full parent power each (Gust, Fairy Wind 3 hits, Discharge 2, Meteor Mash 1 + 3) | DEFAULT ACCEPTED: measure in the Stage 5 simulator first |
| F5 | Quick Attack's 0.3 s i-frames only cover the trip out at range 420 | DEFAULT ACCEPTED: i-frames for the whole dash. Slice 4c |
| F6 | Toxic Spikes emission count depends on whether an emission exactly at the end counts (11 or 12) | DEFAULT ACCEPTED: an emitter never emits at or after its end |

### 9.4 Defects C1 to C14, status

| id | status |
|---|---|
| C1 return legs vs oncePerInstance | Resolved by Q2 (slice 4c) |
| C2 Quick Attack pierce ends the dash | Resolved by Q3 and R1 |
| C3 grow start vs end | Resolved by Q1 (data re-authored in 3a) |
| C4 Gust spread ignored at count 1 | OPEN (Gust per-shot spread, Jess) |
| C5 Meteor Mash double count | Resolved by D-3 (data edit in 3a) |
| C6 trap inert on enemies | Resolved by Q5 (slice 4a) |
| C7 per-hit self riders | Bounded by Q4 maxStacks. OPEN: maxStacks values for Leaf Storm (recommend 1) and Metal Claw (small cap) are Jess's to-do, needed before 4a (D-2) |
| C8 Speed / Sp. Def key collision | PROPOSED, one mapping function |
| C9 Karate Chop type | Resolved by Q11 |
| C10 missing cds (Bug Bite, Shadow Ball) | Resolved: Bug Bite 0.42 and Shadow Ball 1.2 are written in move-overrides.js |
| C11 dropped stat chances (Metal Claw 10, Flash Cannon 10, Shadow Ball 20) | Decided: not intentional, restore the chances (Metal Claw 10, Flash Cannon 10, Shadow Ball 20). Data edit pending |
| C12 move_parity self-test hard-codes hail | Test defect, fix in slice 3a (point it at a synthetic override) |
| C13 persistent vs cd unset | Resolved by the explicit flag (9.2) |
| C14 power 0 vs null (Will-O-Wisp, Substitute) | Harmless, not decided |

### 9.5 The 28 NEEDS REVIEW moves

"Settled" means a decision above covers it and no per-move design work is left, though the slice-3a data edit may still be pending.

| move | settled by | still needs Jess |
|---|---|---|
| razor-leaf | Q2, F2 (range 210 px) | nothing |
| bug-bite | cd 0.42 (written to move-overrides.js) | nothing; berrySteal stays a stub |
| ice-beam | Q4 default duration, C8 mapping | nothing |
| karate-chop | Q11 | nothing (data edit pending) |
| aura-sphere | F1 (total fan) | reach of about 160 px (S2) has no owner |
| shadow-ball | Q4 duration, cd 1.2 (written to move-overrides.js) | restore the 20% chance (data edit pending) |
| metal-claw | Q4 | maxStacks (D-2); restore the 10% chance (data edit pending) |
| flash-cannon | Q4 duration | restore the 10% chance (data edit pending) |
| bonemerang | Q2, F2 (range 230 px), F1 | knockback pulling on the return leg (S12) has no owner |
| psycho-cut | Q12 | nothing |
| quick-attack | Q3, R1, Q8 cap, F5 (i-frames for the whole dash, default accepted) | nothing (data edit pending) |
| flamethrower | Q14 | nothing now; balance goes to the Stage 5 simulator |
| fire-spin | Q5, Q14, persistent | confirm the legacy stat strip and half-strength burn are dropped on purpose |
| leaf-storm | persistent, Q4 | maxStacks (D-2, recommend 1) |
| discharge | Q7, F4 (measure first, default accepted) | nothing; its ring is re-authored to start 1 plus max |
| thunderbolt | Q10, overlap rule (the target starts the chain, others take the strike only, default accepted) | nothing |
| psychic | Q1, Q13, wedge shape, steering at the cast target then nearest (default accepted) | nothing |
| gust | none | per-shot spread (genuinely open) |
| string-shot | Q4, Q5 | the double application of -2 from two stacked strands (S7) has no owner |
| rock-slide | Q17, F3 | count 1 vs "boulders" (S11) has no owner |
| spikes | Q5, Q16, F3, not persistent | nothing |
| hail | none | cd 1.2 vs duration 10 (S6) has no owner |
| meteor-mash | Q7, Q15, D-3, F1 | nothing (data edit pending) |
| substitute | none | cd 4 vs the 6 s shield (S5) has no owner |
| aerial-ace | Q8 distance cap | nothing |
| flame-wheel | persistent | overlap multiplying hits (S4) goes to the Stage 5 simulator |
| bubble-beam | F1 | balance goes to the Stage 5 simulator |
| hex | Q9 | nothing |

### 9.6 Slice 3a edits (APPLIED 2026-10-26, except the runtime items at the end)

- Grammar: top-level `persistent`, `delivery.delay`, optional `delivery.range`, stat defaults (duration 6, maxStacks 6), the `location` pick enum (F3), and the spread definition (F1) written into the grammar comment and MOVE-AXIS-SCHEMA.md. Resolver: read `persistent`, derive `basePower`, TUNING constants (range 420, instance cap 8).
- Moves: Quick Attack `returnHits` out; Karate Chop type fighting; Meteor Mash emit count 1; Toxic Spikes interval emitter every 0.25 with a 100 px start child; Heat Wave, Hyper Voice, Bulldoze, Dark Pulse, Dazzling Gleam and the Discharge ring to start 1 plus `grow.max` = old radius; Razor Leaf `delivery.range` 210 and Bonemerang 230; restore the stat chances (Metal Claw 10, Flash Cannon 10, Shadow Ball 20); Rock Slide delay moved to the instance; `persistent` on the six moves in 9.2.
- Left out of 3a by scope: the move_parity `hail` self-test fix, the section 2.4 validator rules, deep-freezing G.MoveDefs, setting `locationPick` per move. `check.js` is green except that one self-test.
- Runtime, later slices: trap as root (4a), leg-keyed re-hits (4c), Meteor Mash shards ignoring the struck enemy (4d).

### 9.7 Still open, in the order slices need them

1. Architecture approval: DONE (2026-10-26).
2. Slice 3a: no open decisions remain (nova start size decided as 1 px). The stat-chance restoration is a pending data edit, not a question.
3. Before 4a: DONE 2026-10-27 (9.8): Leaf Storm 1, Metal Claw 2, Meteor Mash 2.
4. Before 4d: Gust per-shot spread (genuinely open, no recommendation accepted).
5. Low: confirm Fire Spin's legacy stat strip and half-strength burn are dropped on purpose; correct the DMG_SCALAR doc mismatch (code 1.0, DECISIONS text 2.0). Orbit y-squash in rendering only is a default accepted.
6. No owner yet: Aura Sphere reach (S2), Hail cd vs duration (S6, now owned by the parked Hail toggle item), Substitute cd vs shield (S5, settled in 4b: 4 s shield, 12 s cd armed at shield end), Rock Slide boulder count (S11), String Shot double application (S7), Bonemerang return-leg knockback (S12). Shadow Ball cd 1.2 is only 0.03 s above the formula value (1.167), so its "longer cooldown" compensation is nominal.

### 9.8 Slice 4a decisions (Jess, 2026-10-27)

- **D-2 maxStacks: DECIDED.** Metal Claw 2, Meteor Mash 2, Leaf Storm 1. Caps are per move and add across moves. Data edit lands in slice 4a.
- **Q5 trap length: DECIDED.** Trap on a wild enemy is a root for 2 s. The player's 8 s swap lock stays. Bosses, elites and gym leaders: 25% length then a 10 s no-reapply window, as freeze and sleep.
- **S7 String Shot: DECIDED.** The double application (Speed -2 twice, -4) is allowed. No data change.
- **Slice 3d: signed off by Jess**, 2026-10-27.
- **Root and enemy movement (4a build): DECIDED.** Four phases bypass the speed product (leaving units, jumpers, boss dash, boss leap); Jess OKed enemy.js. A jump in the air lands, a crouch waits, leaving units are rooted, a boss dash stays in place. Strong hosts are not extended while rooted; wild roots refresh to the longer. Pushes (separation, knockback, flinch recoil) still move a rooted enemy.

### 9.9 Slice 4b decisions (Jess, 2026-10-27; full text in move-schema/slice-4b.md S1 to S15)

- **S1 Substitute: DECIDED and built.** 4 s shield, 12 s cooldown armed when the shield ends (expiry, break, swap, faint). Cast waits at HP at or below the cost and while a shield lives.
- **S2 Hail: PARKED** as a toggle skill item; setWeather tested through a synthetic move. **S3 Night Shade: to 4c.**
- **S4 stat stacking per Pokemon**, **S5 flat damage is flat**, **S6 Aqua Ring 6.25% max HP/s accepted**: built.
- **S7, S8, S9, S10 chains and Hex: built** (sequential hops, x (1 - hopReduction)^k last, per-hop rolls, riders x 0.5^k, the target starts the chain, field renamed to hopReduction).
- **S13, S14 caster-state commitment: built**; Flamethrower slowed plus freeze(all) for its 1.0 s cone.
- **S15 chain hop order: DECIDED (Jess, 2026-10-27, during the build).** Fresh first: a hop picks the nearest enemy this chain has not hit yet; only when none is in range may it revisit (never the enemy just hit). A uniform line goes forward, two enemies still ping-pong.
