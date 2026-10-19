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

## Status / DoT (status rework slice A, applied 2026-10-18)
- 2026-10-18, burn damage: 1.6 x stacks x (1 + 0.06 x player level) every 0.5 s, 3 s, up to 8 stacks, applied on EVERY hit -> 1/16 of the enemy's max HP per turn, one state, 4 ticks (G.Enemies.STATUS.burn). Why: the old tick scaled with the player's level, not the enemy's HP, and sat outside the damage model; with a 100% proc Ember reached 8 stacks in about 4 s (33 HP/s at player level 5 against ~22 HP enemies), which is why burn did half to two thirds of Ember's damage in the Arcanine log.
- 2026-10-18, poison damage: 1.2% max HP x stacks + 1 every 0.6 s, 4 s, up to 8 stacks, 100% proc -> 1/8 of max HP per turn, one state, 4 ticks (STATUS.poison). Toxic (badly poisoned: Toxic, Toxic Spikes, the poison trap) -> N/16 on turn N, N capped at 15, 8 ticks (STATUS.toxic); it kills any enemy nobody heals at tick 6 (21/16 of max HP, 12 s).
- 2026-10-18, turn length: 2 s for every status (STATUS rows each have their own `turn`). The faithful anchor is 0.5 s (one Tackle, PP 35, cooldown 0.5 s); 2 s is a deliberate 4x discount because DoT works on a whole crowd with no aiming. Per application: burn 25% of max HP (3.1%/s), poison 50% (6.25%/s).
- 2026-10-18, ailment chance: ignored (every hit applied it) -> rolled per hit from the move's ailmentChance (PokeAPI move_meta): Ember, Flamethrower, Heat Wave, Flame Wheel 10%, Sludge and Poison Sting 30%, Fire Spin 100% (ailment trap). Status moves (Will-O-Wisp, Toxic, Toxic Spikes) always apply. A move rolls at most once per 0.5 s per target (STATUS.rollGap), so a multi-pellet cast and trail/orbit/aura ticks are one roll. Expected burn per Ember hit is now 2.5% of max HP; per Poison Sting hit 15%.
- 2026-10-18, type immunities (mainline, not in PokeAPI): Fire cannot be burned; Poison and Steel cannot be poisoned or badly poisoned. Fire Spin's trap damage rides on the burn flag and ignores the Fire immunity until the trap status exists (slice C).
- 2026-10-18, slice B, Ailment Chance card (G.Mechanics 'ailchance', DPS family): +10 percentage POINTS per stack, additive, capped at 100% (derive clamps). Ember, Flamethrower, Heat Wave and Flame Wheel start at 10% (9 stacks to the cap), Sludge and Poison Sting at 30% (7 stacks). Only those 6 moves can take it; Fire Spin is already 100%, status moves always apply, paralysis/freeze/confusion moves wait for slice C. Why points, not a multiplier: 10% x 1.15 is 11.5%, a dead card. Value check: one stack adds about 2.5% of max HP of expected burn per Ember hit, against roughly 4% of an enemy's HP per hit for a +15% damage card (assumes 3 to 4 hits to kill), so chance cards are weaker until the chance is high. The +10 step is a first guess; raise it to 15-20 if they never get picked.
- 2026-10-18, slice B, DoT strength: burn and poison ticks x (the source move's current Power / its base Power) (G.Moves.dotMul), so Increased Effect and the Type and Kind damage cards strengthen DoT in the same additive pool as direct damage. Attack, Sp. Atk and level do not scale it. Status moves (Power 0) stay at 1.0x. Strongest source wins while the state lasts, a new state starts from its own source.
- Expect: fire starters lose most of their old burn damage (restoring player damage is tune/damage-hp), poison beats burn 2:1 (mainline ratio), Toxic is lethal to everything unhealed. Boss and rift legendary DoT is not special-cased (the boss rework owns it).

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
