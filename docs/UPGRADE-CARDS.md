# Upgrade cards: what they say vs what they do

Audit for #77 (2026-11-11), updated for the #84 renames (docs/decisions/2026-11-11-84-upgrade-card-names-and-speed-framing.md).
Source: js/systems/team-cards.js (catalogue, fold, card text, hints), js/systems/levelup.js (offer and descriptions),
js/entities/player.js (Vitamins, Bench Regeneration). Every number in the tables was measured by running the real fold
(`G.TeamCards.fold`, `gateMul`, `durOf`, `regen`, `vit`) at 1, 2, 5, 10 and 25 picks, not worked out by hand.
The steps, caps and weights are still slice 6 placeholders (team-cards.js header). The internal card ids (in brackets
below) never change, so saves and gym rosters keep working.

## How the cards work

- **Team-wide.** A pick adds one stack to the run's single team store. Every move on every roster member reads it, including
  moves learned later. The order you pick cards in never matters.
- **Three modes.** Each move field folds all its cards at once:

  `value = (base + sum of add) × (1 + sum of inc) / (1 + sum of rate)`, then the field's floor and max.

  - `add` cards add a flat amount (Projectile Count, Pierce, Chain Hops, Ailment Chance).
  - `inc` cards add percentages *to each other*, then multiply once: two +15% picks give +30%, not +32.25%.
  - `rate` cards *divide* a wait: n picks give `1 / (1 + n × step)`. Dividing a wait by 1.15 is exactly 15% more per
    second, so since #84 three of them are named as speeds (Stat Climb Speed, Attack Speed, Impact Speed) and say "+X%".
    Recoil Reduction is the only one still shown as a cut.
- **Card text** (the level-up card's headline) is `stepText`: the step, the same on every pick ("+15%", "+1").
  Below it, the card's one-line hint (`hintText`), then "Team-wide. Works on: ...". A capped card adds
  "Can be taken N times per run". Recoil Reduction's line shows its real share of base recoil now and after the pick.
- **DPS-Upgrades panel:** each card's name and pick count ("Attack Speed Up x3", Vitamins by name: "Protein x2"), #77.
- **Team sheet run total** (Run Cards tab) is `totalText`: speed cards show their speed, Recoil Reduction its real cut,
  other cards `picks × step`, and only Projectile Count and Pierce know about a cap. #83 makes it match the real effect.
- **cardLock:** a move can block a card's field (its `cardLock` list), so that card never touches that move.

## Remaining gaps (for #83)

| Card | Real effect | Team sheet total |
|---|---|---|
| Ailment Chance Up | capped at 100% chance | overstates once a move hits 100% (+250 pts at 25) |
| Width Up | arc capped at a full circle | overstates once an arc reaches 360° |
| Size Up | +15% covered area; a circle's radius grows only √1.15, about +7% | matches the card ("area"), not the radius |
| All Damage Up and type Damage | one shared pool | shown as separate totals |

---

## General family

### Stat Climb Speed Up [gate] (rate as speed, step 0.1)
- **Says:** "Stat Climb Speed Up +10%". Description: "Stat stage Gate X s to Y s: stat changes your team causes climb sooner".
- **Does:** the team's stat stage Gate (base 6.0 s, the wait before a stat stage climbs) becomes `6.0 / (1 + 0.1 × n)`,
  so stages climb `0.1 × n` faster. Offered only when a team move changes a stat.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +10% | +20% | +50% | +100% | +250% |
| Real Gate | 5.45 s | 5.00 s | 4.00 s | 3.00 s | 1.71 s |
| Real climb speed | +10% | +20% | +50% | +100% | +250% |

### Stat Change Duration Up [duration] (inc, step 0.1)
- **Says:** "Stat Change Duration Up +10%". Description: "Stat stage Duration X s to Y s: stat changes your team causes last longer".
- **Does:** the team's stat stage Duration (base 6.1 s) becomes `6.1 × (1 + 0.1 × n)`. Offered only when a team move changes a stat.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +10% | +20% | +50% | +100% | +250% |
| Real Duration | 6.71 s | 7.32 s | 9.15 s | 12.2 s | 21.35 s |

### Bench Regeneration Up [regen] (add, step 0.005)
- **Says:** "Bench Regeneration Up +0.5%/s". Description: "Benched Pokémon regain X% to Y% of their max HP per second".
- **Does:** each *benched* member (never the active one) heals `0.005 × n × max HP` per second (player.js benchUpdate).
  Offered only with 2 or more team members.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +0.5%/s | +1%/s | +2.5%/s | +5%/s | +12.5%/s |
| Bench time from 0 to full HP | 200 s | 100 s | 40 s | 20 s | 8 s |

### Pick a Vitamin [vitamins] (add, step 0.05)
- **Says:** "Pick a Vitamin +5%". Choose one of 3 random stats (HP Up, Protein, Iron, Calcium, Zinc, Carbos). Protein and
  Calcium are offered only when a team move is physical or special.
- **Does:** each stat stacks separately. The bonus is added to that stat's bonus fraction, alongside stat cards and badges:
  `stat × (1 + other bonuses + 0.05 × n)`. Applies to the whole team, bench and later members included.

| Picks on one stat | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total ("Vitamins: Attack") | +5% | +10% | +25% | +50% | +125% |
| Real stat multiplier (no other bonus) | ×1.05 | ×1.10 | ×1.25 | ×1.50 | ×2.25 |

### Type Damage cards: Fire Damage, Water Damage and so on [type:fire ...] (inc, step 0.15)
- **Says:** "Fire Damage +15%", hint "Fire moves hit harder. Adds with All Damage Up." One random type per offer, among
  the types your team's moves use. Normal Damage is one of them.
- **Does:** basePower of moves of that type × (1 + 0.15 × n). **Shares one pool with All Damage Up**, so they add:
  2 All Damage Up and 2 Fire Damage on a fire move give 1 + 0.1 + 0.3 = ×1.4.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +15% | +30% | +75% | +150% | +375% |
| Real power on that type | ×1.15 | ×1.30 | ×1.75 | ×2.50 | ×4.75 |

---

## Space family

### Size Up [area] (inc, step 0.15, "areal" on radii)
- **Says:** "Size Up +15%", hint "The whole attack grows (+15% area)."
- **Does:** adds covered area by the same step for every shape (Jess, 2026-11-04).
  - Circle radius (radRadius, and a growing circle's speed and max): `r × √(1 + 0.15 × n)`, so the area grows by 15% per pick.
  - Beam long side (linLength; a wave's linWidth), and orbit radius: `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +15% | +30% | +75% | +150% | +375% |
| Real covered area | +15% | +30% | +75% | +150% | +375% |
| Real circle radius | +7.2% | +14.0% | +32.3% | +58.1% | +117.9% |
| Real beam length / orbit radius | +15% | +30% | +75% | +150% | +375% |

### Width Up [presence] (inc, step 0.15, arc max 360°)
- **Says:** "Width Up +15%", hint "Attacks get wider, never longer: cones open, beams thicken."
- **Does:** the short side: a cone's arc (radArc), a beam's width (a wave's length), a growing arc's speed and max. `× (1 + 0.15 × n)`.
  An arc stops at a full circle; a move whose arc is already full leaves the pool.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +15% | +30% | +75% | +150% | +375% |
| Real width / arc | +15% | +30% | +75% | +150% | +375% (arc capped at 360°) |

Example: a 90° cone reaches 360° at about 20 picks (90 × 4 = 360). After that the team sheet total keeps rising but the arc doesn't.

### Projectile Count Up [count] (add, step 1, cap 3, weight 0.5)
- **Says:** "Projectile Count Up +1", hint "One more projectile. Can be taken 3 times per run."
- **Does:** `count + n`, up to +3. Only on moves that spread out: a fan, several shapes, an orbit, an emitter's fan, or emissions
  spaced in time. Leaves the pool at the cap, and is offered half as often as other cards.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +1 | +2 | +3 (max) | not offered | not offered |
| Real | +1 | +2 | +3 | +3 | +3 |

### Pierce Up [pierce] (add, step 1, cap 4, weight 0.5)
- **Says:** "Pierce Up +1", hint "Shots pass through one more foe. Can be taken 4 times per run."
- **Does:** `pierce + n`, up to +4. Moves with unlimited pierce never take it. Leaves the pool at the cap, half weight.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +1 | +2 | +4 (max), at 4 picks | not offered | not offered |
| Real | +1 | +2 | +4 | +4 | +4 |

### Chain Hops Up [chain] (add, step 1, no cap)
- **Says:** "Chain Hops Up +1", hint "Chaining attacks jump to one more foe."
- **Does:** `chainHops + n` on chaining moves.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +1 | +2 | +5 | +10 | +25 |

---

## Delivery family

### Range Up [reach] (inc, step 0.15)
- **Says:** "Range Up +15%", hint "Attacks reach farther and shots fly farther."
- **Does:** the root move's range, when range is its reach (travelling, returning, repositioning, falling or location-targeted;
  not one placed on the caster), and a travelling shot's flight time, so it flies farther. `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +15% | +30% | +75% | +150% | +375% |

### Projectile Speed Up [velocity] (inc, step 0.15)
- **Says:** "Projectile Speed Up +15%", hint "Projectiles fly faster and orbits spin faster."
- **Does:** moveSpeed and angularSpeed (spin) of the move and its children. `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +15% | +30% | +75% | +150% | +375% |

### Lifetime Up [time] (inc, step 0.15)
- **Says:** "Lifetime Up +15%", hint "Puddles, traps and placed zones last longer."
- **Does:** the lifetime of placed things only: still inline children (puddles, trail patches, Discharge rings) and a placed world
  emitter's own timer (Toxic Spikes, Will-O-Wisp's turret). Never a plain move's own timer, a travelling shot, or an uncapped
  growth. `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +15% | +30% | +75% | +150% | +375% |

### Attack Speed Up [cooldown] (rate as speed, step 0.15)
- **Says:** "Attack Speed Up +15%", hint "Moves fire more often; lingering and repeating hits tick faster."
- **Does:** `value / (1 + 0.15 × n)` on the move's cd (not on persistent moves), the rehit interval of persistent or ticking
  hitboxes, and an emitter's interval (not a trail's spacing). Never on a pure buff.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +15% | +30% | +75% | +150% | +375% |
| Real casts per second | +15% | +30% | +75% | +150% | +375% |
| Real cooldown multiplier | ×0.870 | ×0.769 | ×0.571 | ×0.400 | ×0.211 |

### Impact Speed Up [delay] (rate as speed, step 0.15, delay floor 50% of base)
- **Says:** "Impact Speed Up +15%", hint "Delayed hits land sooner, up to twice as fast."
- **Does:** `delay / (1 + 0.15 × n)`, never below half the base delay (reached at the 7th pick), so at most twice as fast.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +15% | +30% | +75% | +100% (max) | +100% (max) |
| Real delay multiplier | ×0.870 | ×0.769 | ×0.571 | ×0.500 (floor) | ×0.500 (floor) |

---

## Payload family

### All Damage Up [damage] (inc, step 0.05)
- **Says:** "All Damage Up +5%", hint "Every move hits harder. Adds with the type Damage cards."
- **Does:** basePower × (1 + 0.05 × n); inline children inherit it. Shares its pool with the type Damage cards (see above).
  Was Damage Up at +10% until #84; Brock's loop 1 roster went from 3 to 6 so he keeps +30%.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +5% | +10% | +25% | +50% | +125% |

### Knockback Up [knockback] (inc, step 0.2)
- **Says:** "Knockback Up +20%", hint "Hits push foes farther."
- **Does:** knockback distance × (1 + 0.2 × n).

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +20% | +40% | +100% | +200% | +500% |

### Ailment Chance Up [ailment] (add, step 10, max 100)
- **Says:** "Ailment Chance Up +10 pts", hint "Status ailments land more often, up to a 100% chance."
- **Does:** an ailment's chance + 10 points per pick, up to 100%. Moves already at 100% never take it. The card leaves the pool
  once every taker is at 100%.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | +10 pts | +20 pts | +50 pts | +100 pts | +250 pts |
| Real chance, base 10% | 20% | 30% | 60% | 100% | 100% |
| Real chance, base 30% | 40% | 50% | 80% | 100% | 100% |

### Heal Up [heal] (inc, step 0.15)
- **Says:** "Heal Up +15%", hint "Drain and healing moves heal more."
- **Does:** a heal's fraction × (1 + 0.15 × n): drain (a share of damage dealt, Giga Drain) and heal over time (Recover,
  Synthesis, Moonlight, Aqua Ring). Never Bench Regeneration or berries.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +15% | +30% | +75% | +150% | +375% |

### Shield Up [shield] (inc, step 0.15)
- **Says:** "Shield Up +15%", hint "Shields absorb more damage."
- **Does:** a shield's amount and max × (1 + 0.15 × n). A formula shield (Substitute) is wrapped in the same multiply.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total and real | +15% | +30% | +75% | +150% | +375% |

### Recoil Reduction [recoil] (rate, step 0.15, floor 0)
- **Says:** "Recoil Reduction -15%", with the real numbers below it: "Recoil: 87% of base now, 77% after this pick" (on the
  second pick).
- **Does:** recoil fraction / (1 + 0.15 × n). A shield built from the HP paid (Substitute: 2 × paid) is multiplied by
  (1 + 0.15 × n) to compensate, so it stays full size while you pay less (Jess, 2026-10-31).

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Team sheet total | -13% | -23% | -43% | -60% | -79% |
| Real share of base recoil | 87% | 77% | 57% | 40% | 21% |
