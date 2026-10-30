# COMBAT-RULES, general combat rules

- **Role:** The single home for general combat rules (QA-03). Filled in Phase 4 batch B3a from the sources named in each section.
- **Owns:** Stats and HP, damage, orthogonal dials, G.Stats, the swap rule, status effects (including trap), damage over time, stat stages (the tracker model).
- **Does not own:** Move data grammar (docs/MOVE-AXIS-SCHEMA.md); move runtime pipeline (docs/current feature planning/combat-architecture.md); per-move rulings (docs/MOVE-INTENT.md); gym and elite encounter rules (BOSS-REWORK.md); tuned numbers (BALANCE.md; current value: see the code file).
- **Status home:** STATE.md.
- **Last reconciled:** 2026-10-28 (B3a), against js/core/stats.js, js/data/types.js, js/systems/status.js and js/systems/stages.js.

Precedence: this file beats BOSS-REWORK section 3c, the decisions archive, docs/stat-model-design-notes.md, docs/proposals/stat-stage-model.md, docs/BUFF-TABLE.md, BALANCE.md and the combat-architecture D6 to D11 entries for general combat rules. A ruling in docs/MOVE-INTENT.md beats this file for the named move.

Tags are defined in CLAUDE.md: [Approved], [Legacy behavior], [Proposed], [Open].

Paths: "the legacy path" is the live move code (js/data/moves.js, js/systems/combat.js); "the new path" is the move schema path (js/systems/move-*.js). Slice 7 deletes the legacy path.

## Stats and HP

- [Approved] Mainline stat formula with base + IV + EV + level (nature ignored). Other stats: `S = floor((2B + IV + floor(EV/4)) * L / 100) + 5`. HP: `HP = floor((2B + IV + floor(EV/4)) * L / 100) + L + 10`, then multiplied by HP_SCALAR (current value: see js/core/stats.js). (stat-model notes sections 2 and 4; DECISIONS 2026-10-17 Base-stats model)
- [Approved] The other five stats (HP, Atk, Def, SpA, SpD) scale with the player's IN-RUN LEVEL via the mainline formula (level plays the role of the Pokemon's level), so you get stronger as a run progresses. (DECISIONS 2026-10-17 Base-stats model)
- [Approved] SPEED is the deliberate exception: movement reflects the species' Speed IDENTITY and is constant within a run (the identity ratio r = Speed/SPEED_MEDIAN cancels level). It changes ONLY via items or upgrades, never from leveling up mid-run. Speed is the one stat SHAPED by the transfer function g(r) = exp(w * tanh(k * ln(r) / w)) with asymmetric bounds; the Speed stat itself stays raw everywhere else. Bounds, slope, SPEED_MEDIAN and the px/s at r = 1: current value: see js/core/stats.js (MOVE_MIN, MOVE_MAX, MOVE_K, SPEED_MEDIAN, BASE_PX) and BALANCE.md. (DECISIONS 2026-10-17 Base-stats model; stat-model notes sections 2, 4 and 6)
  - Doc gap: DECISIONS 2026-10-17 and stat-model notes still say bounds 0.25x to 2.0x; code and BALANCE.md use the later tuned 0.5x to 3.0x (DEVLOG-archive records it as tuned by feel and the old wording as stale). See CP2 question 2.
- [Approved] Enemy Speed uses the same Speed-identity model as the player, fixed per species, with no in-run time ramp. Bosses keep their own spd path; the 'runner' behavior keeps its x1.6. (archive 2026-10-17 Enemy Speed = fixed species identity)
- [Approved] Enemy level comes from run time; species gating by enemy level only; fixed neutral enemy IVs. The level curve itself is owned by BOSS-REWORK.md. (stat-model notes section 4)
- [Approved] IV/EV are in the formula but fixed at 0 and not stored, pending a per-species persistent-storage design in its own slice. (DECISIONS 2026-10-17 IV/EV deferred)
- [Approved] Shedinja is fixed at 1 HP (bypasses everything), with Wonder Guard coming later via imported ability data. Code differs, see TODO (no Shedinja case in js/core/stats.js). (stat-model notes sections 2 and 4)
- [Approved] HP investment stays faithful (about half as potent as for other stats). (stat-model notes section 4)

## Damage

- [Approved] Player to enemy damage uses the real mainline damage formula, tuned toward survivor feel by ONE scalar: `base = ((2*L/5 + 2) * Power * (Atk/Def)) / 50 + 2`, then `* STAB(1.5) * type * crit * SCALAR`. SCALAR is DMG_SCALAR, current value: see js/core/stats.js. (DECISIONS 2026-10-17 Damage model)
- [Approved] L = attacker level (player's in-run level). Physical moves use Atk vs enemy Def; special moves use SpA vs enemy SpD, each scaled to level by statValue. Category comes from the move's `cat` via G.Stats.moveCat. (DECISIONS 2026-10-17 Damage model)
- [Approved] STAB = 1.5x when the move type matches one of the active fighter's species types. (DECISIONS 2026-10-17 Damage model; combat-architecture D8)
- [Approved] Implementation is split (attacker half at cast, defender half at impact) but is mathematically identical to the single formula; the +2 stays after the division and before the STAB/type/crit/scalar multipliers. (DECISIONS 2026-10-17 Damage model)
  - Attacker half A = ((2L/5 + 2) x P x Astat) / 50 x extraMul. Astat = statValue(SpA or Atk at L). extraMul = atkMulAll x (1 + stat-card inc) x Atk/SpA stage multiplier x run-item multiplier. (combat-architecture D6; js/core/stats.js attackFactor)
  - Defender half D = (A / max(1, Dstat) + 2) x STAB x DMG_SCALAR. Dstat = statValue(Def or SpD at enemy level) x defender Def/SpD stage multiplier; status category uses PROP_DEF 50 and no STAB. (combat-architecture D7; js/core/stats.js applyDamage)
  - typeK = typeChart(moveType, enemyTypes) x weatherMult(moveType); Power Stone floors it at 1 for the held type. (combat-architecture D9)
  - dmg = max(1, D x typeK x itemDmgMul x critMul x handlerMul). (combat-architecture D11; handlerMul is move-path specific, see combat-architecture)
- [Legacy behavior] The legacy path also multiplies the defender half by the move's per-cast normalization `move.norm` (js/core/stats.js applyDamage). The new path has no normalization (combat-architecture D7). Removed by slice 7.
- [Approved] Floor: if reduction would make a hit 0, it does 1. (stat-model notes section 4)
- [Open] Does immunity (0x) override the floor-of-1 rule? Recommended yes. (stat-model notes section 4, Open; no live effect today, since the softened chart has no 0x)
- [Approved] Crit: no base chance, +3% per Critical Hit card level, crit multiplies by 1.5. Move-based crit stages (12.5% / 50% / 100%) are DROPPED. (archive 2026-10-20 Status Slice D CLOSED; combat-architecture D10; CRIT_MUL in js/systems/combat.js)
- [Approved] The naked base-stat layer is intentionally upgrade-dependent: with base stats only, hits-to-kill a common enemy RAMPS over a run. This is BY DESIGN. Do not rebalance base stats to flatten it; tune the upgrade systems to fill the gap. The base layer's only job is a sane early hit-count (about 2 to 4) with a moderate ramp. (DECISIONS 2026-10-17 naked base-stat layer)

### Type chart

- [Approved] Current chart: the mainline chart (6th gen onward), SOFTENED for a survivor; dual types multiply and the result is capped. Multipliers and caps: current value: see js/data/types.js (SOFT, MIN, MAX). Used both ways (player attacks and enemy attacks). (QA-12; js/data/types.js)
- [Proposed] The full mainline type chart (2x / 0.5x / 0x), on hold. Before it goes live: immunity versus the 1-damage floor, a boss-immunity rule (a Rock/Ground boss is Electric-immune), and an optional exception list. (QA-12; stat-model notes section 4; BOSS-REWORK section 3d item 4)

## Orthogonal dials

- [Approved] There are three independent scalars: (1) HP_SCALAR multiplies the HP formula and is SHARED by player AND enemy HP (G.Stats.hpForLevel); its job is HP consistency, nothing to do with damage. (2) DMG_SCALAR multiplies player to enemy DAMAGE; a damage dial. (3) An enemy to player damage scalar. Current values: see js/core/stats.js. (DECISIONS 2026-10-17 orthogonal dials)
- [Approved] RULE: move Power is a DAMAGE-side term. Changing it touches ONLY the damage dial, never HP. Migrating move power does NOT require re-solving enemy HP, player HP or HP_SCALAR. What does need re-solving after a power migration is the PLAYER DMG_SCALAR, re-centered once so the naked baseline still lands in the target hits-to-kill band against the UNCHANGED enemy HP curve. Power = relative balance BETWEEN moves; DMG_SCALAR = overall damage LEVEL. (DECISIONS 2026-10-17 orthogonal dials)
- [Approved] The enemy-damage scalar is solved against PLAYER HP (also unchanged): HP untouched, tune the damage dial. (DECISIONS 2026-10-17 orthogonal dials)

## G.Stats

- [Approved] All base-stats formulas live in ONE module, G.Stats (js/core/stats.js): statValue, HP (hpForLevel), Speed identity (speedToPx, moveTransfer), the enemy levelForTime curve, the tunable constants, and the Attack/Defense/SpA/SpD functions. Both the player and enemies call G.Stats; neither keeps its own copy. New combat-stat formulas, and any retuning of constants like HP_SCALAR or SPEED_MEDIAN, happen in G.Stats, not duplicated per entity. stats.js loads after core/util.js. (DECISIONS 2026-10-17 Stat formulas centralized)

## Swap rule

- [Approved] Every slotted move runs its own independent cooldown, active or not. Only the active group fires. The 35% incoming-wait cap in setActive is removed. (DECISIONS 2026-10-18 Swap rule decided)
- [Approved] A short hold after swapping stops instant back-and-forth swapping; the swapped-in move fires at once. Length: current value: see js/entities/player.js (SWAP_LOCK). (DECISIONS 2026-10-18 Swap rule decided)
- [Approved] Bond is reworked in its own branch (Slot Compression + Synergy). The old "fire several moves at once" role is gone once cooldowns are independent. (DECISIONS 2026-10-18 Swap rule decided)

## Status effects

- [Approved] One status engine (G.Status, js/systems/status.js) for enemies, elites, bosses, gym leaders and the player. (archive 2026-10-19 Status Slice C)
- [Approved] Only one major status at a time: burn, poison (toxic), paralysis, sleep, freeze. Confusion and trap are not major and stack on top. (archive 2026-10-19 Status Slice C)
- "Strong hosts" below means bosses, elites and gym leaders. The player is not a strong host.

### Trap, enemies

- [Approved] Trap on an enemy is a root: movement multiplier 0 while trapped. Wild enemies: 2 s. Strong hosts: 25% of that, no extension, then a 10 s no-reapply window. (QA-10; CP1-Q5; js/systems/status.js CONTROL.trap.root, STRONG)
- [Approved] Ghost types are immune to trap. (archive 2026-10-19 Status Slice C; js/systems/status.js CONTROL.trap)
- [Approved] Fire Spin applies burn at the full standard length and trap, and does not strip. Its persistent orbit damage stays as authored. The full ruling lives in docs/MOVE-INTENT.md. (QA-10; Q17)
- [Legacy behavior] E1 (archive 2026-10-20 Status Slice E1): "Enemies cannot be trapped any more". On the legacy path no move carries a trap ailment, so enemies are never trapped there; status.js already roots any non-player host for the new path. Removed by slice 7.
- [Legacy behavior] Fire Spin on the legacy path (js/data/moves.js:61, fields `strip` and `burnHalf`; js/systems/combat.js procAilments): "strips every beneficial stat stage from the target and burns it for half the normal length. Fire types are immune to the burn, not to the strip." Removed by slice 7. (archive 2026-10-20 Status Slice E1)

### Trap, player

- [Approved] TRAP on the player = no damage, no slow: manual team swaps are locked for 8 s (faint auto-swap still works). (archive 2026-10-20 Status Slice E1; js/systems/status.js:10 and CONTROL.trap.dur)
- This rule is separate from the enemy rule above and does not change with it.

### Other status effects

- [Approved] Wild enemies: freeze 2 s, then a 4 s refreeze window; a Fire hit thaws it, never the same instant; Ice immune. Sleep 2 to 6 s, damage never wakes. Paralysis 10 s, x0.5 movement, 25% of attacks fizzle, Electric immune. Confusion 2 to 8 s, wander + 50% fizzle. A turn is 2 s. (archive 2026-10-19 Status Slice C)
- [Approved] Strong hosts: freeze and sleep last 25% as long, then a 10 s no-reapply window. Paralysis, slow, trap (except the root above) and confusion work at full strength. No blanket boss immunity. (archive 2026-10-19 Status Slice C; BOSS-REWORK section 3c)
- [Approved] Trapped and paralysed enemies still attack. Frozen and sleeping ones do not move or attack. (archive 2026-10-19 Status Slice C)
- [Approved] HARD CC ON THE PLAYER: every timer is FULL (no 25% cut). After a hard CC (sleep, freeze, paralysis) ends there is a 2.5 s grace with no new hard CC (TUNE). Major statuses still compete (one at a time). (archive 2026-10-20 Status Slice E1)
- [Approved] SHAKE OFF (player): each tap takes 0.25 s off the most restrictive mashable status, floor 0.5 s remaining, at most 12 taps per second. Mashable: sleep, freeze, paralysis, confusion, trap, daze. Not mashable: burn, poison, toxic, drowsy, slow, stat drops. (archive 2026-10-20 Status Slice E1)
- [Approved] AUTO-SHAKE (accessibility setting, default off) taps Shake off at 3 taps per second while anything is shakeable; each tap has the normal effect. (archive 2026-10-20 Status Slice E2e)
- [Approved] DAZE = movement heading jitters up to +-35 degrees, re-rolled every 0.2 to 0.4 s and eased, 6 s, no fizzle. SLOW = Speed -1 stage for 6 s. HASTE = a nova that gives allies Speed +1 for 6 s, stacking to 2; the caster is excluded, bosses and gym leaders skipped. DROWSY (8 s) multiplies every sleep-effect chance by 1.5, capped at 100%. (archive 2026-10-20 Status Slice E1) SLOW and HASTE stay outside the stat stage tracker model ("Stat stages", carrier statuses).
- [Approved] FLINCH: chance from the move's PokeAPI flinch value, one roll per move per target per 0.5 s. EVERYONE can flinch (wild, elites, bosses, gym leaders), with no window and no lockout. Frozen or asleep units cannot flinch. The lost action, recoil and freeze rules are in the source entry. (archive 2026-10-19 Status Slice D2)
- [Approved] BENCH: every per-Pokemon effect (statuses, stages, DoT, own drops) KEEPS TICKING on the bench; only skill cooldown does not tick. A benched Pokemon can faint to DoT; that shows a red toast. (archive 2026-10-20 Status Slice E2a rulings and E2b)
- [Approved] FAINT AND REVIVE: fainting and revive clear every status, DoT and own drop. The shared TEAM raises stay. (archive 2026-10-20 Status Slice E2b)
- [Approved] FREEZE AND SLEEP DROP THE PLAYER'S ORBS AND PULSES: while the player is stunned, the active orbit move clears its orbs, trail patches stop pulsing and turrets stop firing; placed mines and meteors still go off. (archive 2026-10-20 Status Slice E2d)

## Damage over time

- [Approved] DoT is a fraction of the target's MAX HP per turn: burn 1/16, poison 1/8, Toxic (badly poisoned) N/16 on turn N, N capped at 15. ONE state per status; a re-hit only refreshes the duration and never resets the tick timer. No stacks. (archive 2026-10-18 Status rework slice A; js/data/enemies.js STATUS)
- [Approved] Turn length and ticks per application are table knobs, one row per status. Current values: see js/data/enemies.js STATUS. (archive 2026-10-18 Status rework slice A)
- [Approved] Type immunities: Fire vs burn; Poison and Steel vs poison and Toxic. (archive 2026-10-18 Status rework slice A)
- [Approved] Chance: a move rolls its ailment at most once per 0.5 s per target (any move, any target), so a multi-pellet cast is ONE roll. Status-category moves always apply. (archive 2026-10-18 Status rework slice A; new-path rider rolls are owned by combat-architecture)
- [Approved] DoT follows the damage pool: the DoT multiplier = current Power / base Power of the source move; a target keeps the strongest multiplier while its state lasts. The Ailment Chance card adds +10 percentage points per stack, clamped to 100. (archive 2026-10-18 Status rework slice B)
- [Approved] DoT percentages apply to the target's BASE HP (before the tier HP multiplier), so the multiplier never amplifies DoT. Code differs, see TODO: DoT ticks read max HP, which for an elite includes its HP multiplier (js/entities/enemy.js, js/systems/elites.js). See CP2 question 3. (BOSS-REWORK section 3c; archive 2026-10-19 Status phasing and DoT on base HP)

## Stat stages

Formerly "Stat stages and maxStacks"; a pointer to that title means this section. SS1 to SS13 were approved by Jess on 2026-10-30 (DECISIONS 2026-10-30, stat stage model). Rationale, the pokeapi shape counts, the worked examples and the design intent: docs/proposals/stat-stage-model.md (history; its R1 to R13 are SS1 to SS13 here, and this text wins). Code differs, see TODO: the model is built on the new path in slice 5; the legacy path keeps its own model until slice 7b removes it.

- [Approved] Mainline stat STAGES for Attack, Defense, Sp. Atk, Sp. Def and Speed, on every host (player, wild, elite, boss, gym leader). Accuracy and evasion are skipped. (archive 2026-10-19 Status Slice D1)
- [Approved] The CAP is the +-6 ladder limit: a stat's stage on a host is the sum of its trackers (SS6), clamped to +-6. The maximum stage can never exceed 6 for any single stat. (A.2; archive Slice D1)
- [Approved] STAGE LADDERS: each stat has ONE base number B. A raise of s stages multiplies by (B + s) / B, a drop by B / (B + |s|), the same ladder for raises and drops, on every host. Attack, Defense, Sp. Atk and Sp. Def start at the mainline B = 2; Speed starts at B = 4. Each stat's B is tuned separately; current values: see js/systems/stages.js BASE. (archive 2026-10-20 Status Slice E2a; combat-architecture D30)
- [Approved] SCOPE: every raise is TEAM-WIDE; every drop (enemy-cast or self-cast) is PER POKEMON. The stage of a stat on the player = team raises + own drops, clamped to +-6. (archive 2026-10-20 Status Slice E2a)
- [Approved] WHERE IT IS READ: Attack stage multiplies the attacker factor of PHYSICAL moves only, Sp. Atk stage special moves only, status moves neither. Defense / Sp. Defense stage multiplies the defender's Def / SpD in the damage ratio. The Speed stage multiplies the FINAL movement speed and is not bound by the species-identity shaping; it multiplies with paralysis and trap. (archive 2026-10-20 Status Slice E2a; archive Slice D1 ruling)
- [Approved] Foe drops have no per-move cap: they climb by SS4 up to the Cap. Strong hosts: SS13. (A.2; Q16)

Terms: **stages** = what one success gives, straight from pokeapi (Swords Dance +2, Harden +1, Leaf Storm -2, Bubble Beam -1). **Cap** = the +-6 limit above. **Gate** = the minimum time between two climbs of one tracker (not the "cast gate" in GLOSSARY.md). **Duration** = how long a tracker holds after its last success.

- SS1 [Approved] ONE TRACKER PER (Pokemon, move, stat) on each recipient: its current stages, its Gate timer and its Duration timer. Each Pokemon counts separately (two roster members with Swords Dance are two trackers). A move with several stat entries (Dragon Dance, Shell Smash) has one tracker per stat.
- SS2 [Approved] WHO ROLLS: one roll per recipient, per use. A change on a foe rolls once per enemy hit. A change on the caster or its team rolls once per cast, on the first enemy hit of that cast (a cast that hits nothing rolls nothing). A non-damaging move rolls once per cast. A persistent or rehit move counts each rehit tick as a use. Reads the existing `side` field; no new field.
- SS3 [Approved] FIRST SUCCESS applies the move's pokeapi stages immediately and starts both timers.
- SS4 [Approved] EVERY SUCCESS resets Duration. A success while the Gate is open also CLIMBS: it adds the move's pokeapi stages again and restarts the Gate.
- SS5 [Approved] A Duration window with no success sets that tracker's stages to 0. Only that tracker; other moves on the same stat are untouched.
- SS6 [Approved] A stat's stage on a host = the sum of all trackers on it (team raises plus own drops for a player, as in SCOPE above), clamped to the Cap. Each tracker's own stages are also clamped to +-6, so one move cannot bank stages past the Cap and hide another tracker's reset. (Jess, 2026-10-30)
- SS7 [Approved] BASE TIMERS, global, same for every move: Gate 6.0 s, Duration 6.1 s. Duration is always a little longer than Gate so a move that succeeds every Gate never drops. The gap is at least 0.1 s, not 0.001 s: a frame can be up to 1/30 s, so a smaller gap is decided by update order. This replaces TEAM_GRACE's refresh-instead-of-stack behavior.
- SS8 [Approved] Pure buff moves (no damage) have no cooldown of their own: they cast when their Gate opens. Damaging moves keep their own cooldown, which only decides how often they roll. Strong hosts: see SS13. A pure buff whose cast fizzles waits one Gate before it tries again. (Jess, 2026-10-30)
- SS9 [Approved] Raises are team-wide (unchanged). A benched Pokemon cannot cast, so its trackers stop refreshing and end one Duration after their last success (the bench keeps ticking: "Swap rule" above and BENCH in "Other status effects"). Swap juggling can reach the Cap a few seconds sooner for a fraction of a second; the Cap bounds it.
- SS10 [Approved] UPGRADES: two TEAM-WIDE cards, not per Pokemon and not per move: "Stat Stage Gate -x%" (shorter Gate, faster climbs) and "Stat Stage Duration +x%" (longer Duration, easier to hold). They apply to every stat change the team causes, wherever it lands: raises on the team, drops on foes, AND drops on itself (Leaf Storm climbs faster and lasts longer). That double edge is intended (Brotato-style trade-off, survivor-like-design-reference principle 6). Enemies have no cards and use the base timers. Step size x is a slice 6 number, small, since one team card equals about six per-Pokemon picks. No card raises a move's stages. Code differs, see TODO: the two cards are built in slice 5b with the team-wide card rework (Jess, 2026-10-30; the team-wide upgrades branch is folded into 5b).
- SS11 [Approved] Chance moves (N = 1): a chance move holds while it lands at least one success per Duration window. Hold probability per window = 1 - (1 - p)^k, k = rolls in the window.
- SS12 [Approved] SELF DROPS CLIMB ON A LONGER GATE: a drop a Pokemon puts on itself (the 13 damaging self-drop moves plus Shell Smash's drops) uses Self-drop Gate = Gate x SELF_DROP_GATE_MUL, with SELF_DROP_GATE_MUL = 2 (one tunable constant, slice 6). Duration is unchanged (6.1 s), so the drop still ends 6.1 s after the last hit. The team Gate card scales both Gates proportionally; the Duration card lengthens self drops too, so both cards keep their double edge. No per-move authoring.
- SS13 [Approved] STRONG HOSTS FOLLOW THE MODEL: bosses, elites and gym leaders use SS1 to SS12 with no per-move exception. Stat changes a strong host causes (its own raises, drops it puts on itself or on the player) use Strong-host Gate = Gate x STRONG_HOST_GATE_MUL, with STRONG_HOST_GATE_MUL = 1 (one tunable constant, slice 6; lower it if gym leaders feel soft). Duration is unchanged. Drops the player puts on a strong host use the team's timers like any foe; there is no strong-host stage-drop reduction (the strong-host reductions are freeze, sleep and trap only). This retires BOSS-REWORK 3c's "the move's stacks as the stage cap" for gym Harden. SS13 governs what a success does, not when a strong host casts: cast scheduling for bosses and gym leaders stays with BOSS-REWORK and slice-overview:D-ENEMY (slice 7a), so SS8 does not apply to strong hosts until D-ENEMY rules. Gym Harden moves onto the model in slice 7a, with the boss and gym readers (Jess, 2026-10-30).
- [Open] Bond tax: bonding a buff move adds 50% of its cooldown to the other moves in the group; flat seconds vs +50% of each move's own cooldown not decided. Belongs to the Bond rework branch (TODO Backlog).
- [Open] Stage-manipulation moves: reset, copy, swap, invert, steal (Haze, Clear Smog, Psych Up, Heart Swap, Topsy-Turvy, Spectral Thief). Not in the pool yet.
- [Open] Raises on a foe (Swagger, Flatter, Decorate) and whole-field moves: expected to follow SS1 to SS6 unchanged; not checked at runtime. None is in the pool except Bulldoze, which applies to foes only today.
- [Approved] CARRIER STATUSES STAY OUTSIDE THE MODEL: SLOW (Speed -1, 6 s) and HASTE (nova, Speed +1 for 6 s, stacking to 2) from wild carrier enemies are not move stat changes. They keep their own fixed timers and stack limits from js/data/enemies.js CARRIER ("Other status effects" above), do not climb per Gate, and still sum into the Speed stage under the Cap (SS6). Reason: enemy behavior owns enemy attacks, and HASTE on the model would let every enemy near a haste carrier reach Speed +6 (x2.5) with no hit needed. (Jess, 2026-10-30)
- [Legacy behavior] New path today (slices 4c-0 and 4c-1): per-move maxStacks on self-side stat effects, default 1, filled by the resolver (combat-architecture:H24); authored foe caps of 1 on Ice Beam and Bug Buzz; each application lasts its move's `duration` (default 6 s) on its own timer; a capped application refreshes that move's oldest. Removed by slice 5. Rulings it carried, all retired 2026-10-30: DECISIONS:Q13 (duration never shorter than cooldown), DECISIONS:Q14 (maxStacks default 1), DECISIONS:Q15 / QA-11 (the upgrade formula, never built), D-FOECAP, D-LEAF, D-MC5 and the [Proposed] A.3-3 authored floor.
- [Legacy behavior] Legacy path, NO EXPLICIT CAP: duration / cooldown is the cap. Every cast is its own application on its own timer, the +-6 clamp is the only hard limit, with a safety limit of 8 live applications per move (js/systems/stages.js:17, TEAM_LIVE); rider rolls use ROLL_GAP and procSelf. Removed by slice 7b. (archive 2026-10-20 Status Slice E2a)
