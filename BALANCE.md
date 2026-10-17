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
(none tuned yet)

## Enemies
(none tuned yet)

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
