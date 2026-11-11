# Upgrade cards: what they say vs what they do

Audit for #77 (2026-11-11). Source: js/systems/team-cards.js (catalogue, fold, card text), js/systems/levelup.js (offer and
descriptions), js/entities/player.js (Vitamins, HP Regen). Every number in the tables was measured by running the real fold
(`G.TeamCards.fold`, `gateMul`, `durOf`, `regen`, `vit`) at 1, 2, 5, 10 and 25 picks, not worked out by hand.
The steps, caps and weights are still slice 6 placeholders (team-cards.js header).

## How the cards work

- **Team-wide.** A pick adds one stack to the run's single team store. Every move on every roster member reads it, including
  moves learned later. The order you pick cards in never matters.
- **Three modes.** Each move field folds all its cards at once:

  `value = (base + sum of add) × (1 + sum of inc) / (1 + sum of rate)`, then the field's floor and max.

  - `add` cards add a flat amount (Count, Pierce, Chain, Ailment Chance).
  - `inc` cards add percentages *to each other*, then multiply once: two +15% picks give +30%, not +32.25%.
  - `rate` cards *divide*: n picks give `1 / (1 + n × step)`. The cut shrinks with each pick and never reaches zero.
    This is the #77 mismatch.
- **Card text** (the level-up card's headline and icon) is `stepText`: the raw step, the same on every pick ("-15%", "+1").
- **Run total** (DPS-Upgrades panel and the team sheet's Run Cards tab) is `totalText`. Rate cards show their real cut there.
  Other cards show `picks × step`, and only Count and Pierce know about a cap.
- **cardLock:** a move can block a card's field (its `cardLock` list), so that card never touches that move.

## Summary of mismatches

| Card | Card text says | Real effect | Run total |
|---|---|---|---|
| Cooldown Down | -15% each | -13%, then -23%, -43% at 5 picks | correct |
| Delay Down | -15% each | as Cooldown Down, but stops at -50% (floor) | overstates from the 7th pick (-60%, -79%) |
| Recoil Down | -15% each | as Cooldown Down | correct |
| Gate Reduction | -10% each | -9%, then -17%, -33% at 5 picks | correct (the description's seconds are also correct) |
| Ailment Chance Up | +10 pts each | capped at 100% chance | overstates once a move hits 100% (+250 pts at 25) |
| Presence Up | +15% each | capped at a full circle | overstates once an arc reaches 360° |
| Area Up | +15% | +15% covered area; a circle's radius grows only √1.15, about +7% | matches the card ("area"), not the radius |

Every other card matches its text and its run total.

---

## General family

### Gate Reduction (rate, step 0.1)
- **Says:** "Gate Reduction -10%". Description: "Stat stage Gate X s to Y s: stat changes your team causes climb sooner".
- **Does:** the team's stat stage Gate (base 6.0 s, the wait before a stat stage climbs) becomes `6.0 / (1 + 0.1 × n)`.
  Read by stages.js through move-effects.js. Offered only when a team move changes a stat.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Card text (each pick) | -10% | -10% | -10% | -10% | -10% |
| Run total | -9% | -17% | -33% | -50% | -71% |
| Real Gate | 5.45 s (-9.1%) | 5.00 s (-16.7%) | 4.00 s (-33.3%) | 3.00 s (-50%) | 1.71 s (-71.4%) |

### Duration Increase (inc, step 0.1)
- **Says:** "Duration Increase +10%". Description: "Stat stage Duration X s to Y s: stat changes your team causes last longer".
- **Does:** the team's stat stage Duration (base 6.1 s) becomes `6.1 × (1 + 0.1 × n)`. Offered only when a team move changes a stat.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +10% | +20% | +50% | +100% | +250% |
| Real Duration | 6.71 s | 7.32 s | 9.15 s | 12.2 s | 21.35 s |

### HP Regen (add, step 0.005)
- **Says:** "HP Regen +0.5%/s". Description: "Benched Pokémon regain X% to Y% of their max HP per second".
- **Does:** each *benched* member (never the active one) heals `0.005 × n × max HP` per second (player.js benchUpdate).
  Offered only with 2 or more team members.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +0.5%/s | +1%/s | +2.5%/s | +5%/s | +12.5%/s |
| Bench time from 0 to full HP | 200 s | 100 s | 40 s | 20 s | 8 s |

### Vitamins (add, step 0.05)
- **Says:** "Vitamins +5%". Choose one of 3 random stats (HP Up, Protein, Iron, Calcium, Zinc, Carbos). Protein and Calcium
  are offered only when a team move is physical or special.
- **Does:** each stat stacks separately. The bonus is added to that stat's bonus fraction, alongside stat cards and badges:
  `stat × (1 + other bonuses + 0.05 × n)`. Applies to the whole team, bench and later members included.

| Picks on one stat | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total ("Vitamins: Attack") | +5% | +10% | +25% | +50% | +125% |
| Real stat multiplier (no other bonus) | ×1.05 | ×1.10 | ×1.25 | ×1.50 | ×2.25 |

### Type Damage cards: Fire Damage, Water Damage and so on (inc, step 0.15)
- **Says:** "Fire Damage +15%". One random type per offer, among the types your team's moves use.
- **Does:** basePower of moves of that type × (1 + 0.15 × n). **Shares the same pool as Damage Up**, so the two add:
  2 Damage Up and 2 Fire Damage on a fire move give 1 + 0.2 + 0.3 = ×1.5.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +15% | +30% | +75% | +150% | +375% |
| Real power on that type | ×1.15 | ×1.30 | ×1.75 | ×2.50 | ×4.75 |

---

## Space family

### Area Up (inc, step 0.15, "areal" on radii)
- **Says:** "Area Up +15%".
- **Does:** adds covered area by the same step for every shape (Jess, 2026-11-04).
  - Circle radius (radRadius, and a growing circle's speed and max): `r × √(1 + 0.15 × n)`, so the area grows by 15% per pick.
  - Beam long side (linLength; a wave's linWidth), and orbit radius: `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +15% | +30% | +75% | +150% | +375% |
| Real covered area | +15% | +30% | +75% | +150% | +375% |
| Real circle radius | +7.2% | +14.0% | +32.3% | +58.1% | +117.9% |
| Real beam length / orbit radius | +15% | +30% | +75% | +150% | +375% |

### Presence Up (inc, step 0.15, arc max 360°)
- **Says:** "Presence Up +15%".
- **Does:** the short side: a cone's arc (radArc), a beam's width (a wave's length), a growing arc's speed and max. `× (1 + 0.15 × n)`.
  An arc stops at a full circle; a move whose arc is already full leaves the pool.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +15% | +30% | +75% | +150% | +375% |
| Real width / arc | +15% | +30% | +75% | +150% | +375% (arc capped at 360°) |

Example: a 90° cone reaches 360° at about 20 picks (90 × 4 = 360). After that the run total keeps rising but the arc doesn't.

### Count Up (add, step 1, cap 3, weight 0.5)
- **Says:** "Count Up +1".
- **Does:** `count + n`, up to +3. Only on moves that spread out: a fan, several shapes, an orbit, an emitter's fan, or emissions
  spaced in time. Leaves the pool at the cap, and is offered half as often as other cards.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +1 | +2 | +3 (max) | not offered | not offered |
| Real | +1 | +2 | +3 | +3 | +3 |

### Pierce Up (add, step 1, cap 4, weight 0.5)
- **Says:** "Pierce Up +1".
- **Does:** `pierce + n`, up to +4. Moves with unlimited pierce never take it. Leaves the pool at the cap, half weight.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +1 | +2 | +4 (max), at 4 picks | not offered | not offered |
| Real | +1 | +2 | +4 | +4 | +4 |

### Chain Up (add, step 1, no cap)
- **Says:** "Chain Up +1".
- **Does:** `chainHops + n` on chaining moves.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +1 | +2 | +5 | +10 | +25 |

---

## Delivery family

### Reach Up (inc, step 0.15)
- **Says:** "Reach Up +15%".
- **Does:** the root move's range, when range is its reach (travelling, returning, repositioning, falling or location-targeted;
  not one placed on the caster), and a travelling shot's flight time, so it flies farther. `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +15% | +30% | +75% | +150% | +375% |

### Velocity Up (inc, step 0.15)
- **Says:** "Velocity Up +15%".
- **Does:** moveSpeed and angularSpeed (spin) of the move and its children. `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +15% | +30% | +75% | +150% | +375% |

### Time Up (inc, step 0.15)
- **Says:** "Time Up +15%".
- **Does:** the lifetime of placed things only: still inline children (puddles, trail patches, Discharge rings) and a placed world
  emitter's own timer (Toxic Spikes, Will-O-Wisp's turret). Never a plain move's own timer, a travelling shot, or an uncapped
  growth. `× (1 + 0.15 × n)`.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +15% | +30% | +75% | +150% | +375% |

### Cooldown Down (rate, step 0.15) **mismatch**
- **Says:** "Cooldown Down -15%".
- **Does:** `value / (1 + 0.15 × n)` on the move's cd (not on persistent moves), the rehit interval of persistent or ticking
  hitboxes, and an emitter's interval (not a trail's spacing). Never on a pure buff.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Card text (each pick) | -15% | -15% | -15% | -15% | -15% |
| What the card text implies, added up | -15% | -30% | -75% | -150% | -375% |
| Run total | -13% | -23% | -43% | -60% | -79% |
| Real cooldown multiplier | ×0.870 | ×0.769 | ×0.571 | ×0.400 | ×0.211 |
| Real casts per second (speed) | +15% | +30% | +75% | +150% | +375% |

The last row is why the maths is called "rate": the move *fires* 15% faster per pick, but its cooldown is only 13% shorter.

### Delay Down (rate, step 0.15, floor 50% of base) **mismatch**
- **Says:** "Delay Down -15%".
- **Does:** `delay / (1 + 0.15 × n)`, never below half the base delay (reached at the 7th pick).

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Card text (each pick) | -15% | -15% | -15% | -15% | -15% |
| Run total | -13% | -23% | -43% | -60% | -79% |
| Real delay multiplier | ×0.870 (-13%) | ×0.769 (-23%) | ×0.571 (-43%) | ×0.500 (-50%, floor) | ×0.500 (-50%, floor) |

---

## Payload family

### Damage Up (inc, step 0.1)
- **Says:** "Damage Up +10%".
- **Does:** basePower × (1 + 0.1 × n); inline children inherit it. Shares its pool with the type Damage cards (see above).

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +10% | +20% | +50% | +100% | +250% |

### Knockback Up (inc, step 0.2)
- **Says:** "Knockback Up +20%".
- **Does:** knockback distance × (1 + 0.2 × n).

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +20% | +40% | +100% | +200% | +500% |

### Ailment Chance Up (add, step 10, max 100) **total overstates at the cap**
- **Says:** "Ailment Chance Up +10 pts".
- **Does:** an ailment's chance + 10 points per pick, up to 100%. Moves already at 100% never take it. The card leaves the pool
  once every taker is at 100%.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total | +10 pts | +20 pts | +50 pts | +100 pts | +250 pts |
| Real chance, base 10% | 20% | 30% | 60% | 100% | 100% |
| Real chance, base 30% | 40% | 50% | 80% | 100% | 100% |

### Heal Up (inc, step 0.15)
- **Says:** "Heal Up +15%".
- **Does:** a heal's fraction × (1 + 0.15 × n).

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +15% | +30% | +75% | +150% | +375% |

### Shield Up (inc, step 0.15)
- **Says:** "Shield Up +15%".
- **Does:** a shield's amount and max × (1 + 0.15 × n). A formula shield (Substitute) is wrapped in the same multiply.

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Run total and real | +15% | +30% | +75% | +150% | +375% |

### Recoil Down (rate, step 0.15, floor 0) **mismatch**
- **Says:** "Recoil Down -15%".
- **Does:** recoil fraction / (1 + 0.15 × n). A shield built from the HP paid (Substitute: 2 × paid) is multiplied by
  (1 + 0.15 × n) to compensate, so it stays full size while you pay less (Jess, 2026-10-31).

| Picks | 1 | 2 | 5 | 10 | 25 |
|---|---|---|---|---|---|
| Card text (each pick) | -15% | -15% | -15% | -15% | -15% |
| Run total | -13% | -23% | -43% | -60% | -79% |
| Real recoil multiplier | ×0.870 | ×0.769 | ×0.571 | ×0.400 | ×0.211 |
