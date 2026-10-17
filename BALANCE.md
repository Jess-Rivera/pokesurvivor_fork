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

## Enemies
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
(none tuned yet)

## Drops / economy
(none tuned yet)

## XP curve / run pacing
(none tuned yet)

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
