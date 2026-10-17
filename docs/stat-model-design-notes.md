# PokéSurvivor fork: stat model design notes (2026-10-17)

Status: design only, no code written. Data: 966 species in `js/data/pokedex.js` (`stats:[HP,Atk,Def,SpA,SpD,Spe]`, `bst`). All numbers computed at level 50, untrained (IV 0, EV 0) unless stated.

## 1. Goal
Replace the original author's derived HP / Attack / Speed with the mainline model: base stats + IV + EV + level. Investment ("this is my Pokémon") should be able to beat a better but uninvested base species. Enemies use fixed neutral IVs. Enemy level comes from run time, player level from XP, species gating by enemy level only.

## 2. Equations
Mainline stat (nature ignored):
- Other stats: `S = floor((2B + IV + floor(EV/4)) * L / 100) + 5`
- HP: `HP = floor((2B + IV + floor(EV/4)) * L / 100) + L + 10`, and Shedinja is fixed at 1 HP (bypasses everything).
- Ranges: IV 0-31, EV 0-252 (tests use full investment = IV 31, EV 252).

Identity ratio (level-independent):
- `r = S / S_median(L)`, where S_median is the median species' untrained stat at the same level.
- Level gap between player and enemy is deliberately NOT inside r. It stays unbounded and is the time-pressure lever.

Soft-saturating transfer function (optional bounding):
- `g(r) = exp(w * tanh(k * ln(r) / w))`
- Slope at r = 1 is k. Bounds are e^(-w) and e^(+w). k = 1 means no compression near the median.
- Asymmetric bounds: use w_up for ln r > 0 and w_dn for ln r < 0. Movement uses w_up = ln 2, w_dn = ln 4 (0.25x to 2.0x).

Damage (planned): mainline ratio A/D. Physical vs special class comes from API move data. Floor: if reduction would make a hit 0, it does 1. Full mainline type chart planned (2x / 0.5x / 0x, STAB 1.5x).

Bulk (community term, not a mainline stat): `bulk = HP * Def` (physical) or `HP * SpD` (special). Damage taken scales with attacker/defender, so HP * Def is the survivability that is actually felt.

## 3. Data

### Stat ratio distributions (vs median species, L50)
| Stat | median value | p5 | p25 | p75 | p95 | min | max |
|---|---|---|---|---|---|---|---|
| Speed | 70 | 0.43 | 0.71 | 1.31 | 1.71 | 0.14 | 2.93 |
| Def | 73 | 0.55 | 0.75 | 1.30 | 1.82 | 0.14 | 3.22 |
| SpD | 70 | 0.50 | 0.79 | 1.29 | 1.79 | 0.36 | 3.36 |
| Atk | 80 | 0.44 | 0.75 | 1.29 | 1.69 | 0.12 | 2.33 |
| SpA | 70 | 0.50 | 0.71 | 1.36 | 1.87 | 0.21 | 2.54 |

Offense: only 4 species exceed 2.0x on Atk and 19 on SpA. 55 species are below 0.5x on Atk, 39 on SpA.

### HP (flat `+L+10` term compresses it)
| Level | median HP | p5 | p95 | min / max |
|---|---|---|---|---|
| 5 | 21 | 0.86 | 1.24 | 0.76 / 1.90 |
| 20 | 56 | 0.79 | 1.32 | 0.61 / 2.36 |
| 50 | 125 | 0.76 | 1.36 | 0.56 / 2.52 |
| 100 | 240 | 0.75 | 1.38 | 0.54 / 2.58 |
Raw base HP spread is 0.54-1.69 (p5-p95), max 3.9x. HP scales about linearly with level, as does mainline damage, so HP vs enemy damage is roughly level-invariant.

### Investment on a median species (base 65)
| Level | HP full invest | Speed-type full invest |
|---|---|---|
| 10 | +27% | +50% |
| 50 | +38% | +67% |
| 100 | +39% | +70% |
HP investment is about half as potent as for other stats. Decision: keep faithful.

"My Pokémon" test at L50: full investment on base ~35 (HP) / ~30 (other) beats an untrained median, and breaks even with an untrained base of about 80 (around the 75th percentile). The transfer function is monotone, so it never changes this ordering, only the margin. Example (Speed, k=0.7): base 30 fully invested = 1.12x, base 65 untrained = 1.00x, base 100 untrained = 1.31x.

### Bulk (L50, no investment, real formulas, Shedinja excluded)
- Physical bulk: p5 0.41, p95 1.94, min 0.17, max 3.0.
- Special bulk: p5 0.41, p95 1.87, min 0.21, max 4.7 (Blissey, Chansey, Regice, Lugia on top).
- Candidate Def/SpD bounds (with HP at k=1, 0.5-2.0x), bulk p5-p95: k=1.0 / 0.40-2.5x -> 0.45-1.82; k=0.8 / 0.5-2.0x -> 0.51-1.68 (phys min 0.35 Pichu, max 2.27 Melmetal, special max 2.74); k=0.7 / 0.56-1.8x -> 0.54-1.61; k=0.6 / 0.62-1.6x -> 0.57-1.53.
- Blissey-type lopsided species are accepted as-is (strong on one side, fragile on the other).

### Matchup swing (A_g / D_g, both k=0.8, bounds 0.5-2.0x)
Bounded extremes: best 3.97x, worst 0.25x. Typical one-sided matchups 0.6-1.6x.

### Type chart vs the 966-species pool
Pooled over 18 attacking types: 4x 1.2%, 2x 16.7%, 1x 57.1%, 0.5x 19.6%, 0.25x 2.0%, 0x 3.4%. Mean multiplier per attacking type ranges 0.88 (Normal, never super-effective, 6% immune) to 1.23 (Rock); Ice 1.20, Flying 1.19. Worst-case stack of stat swing x type x STAB is about 24x best / 1/16 worst, but 4x matchups are about 1% of the pool.

### Movement speed
- Old formula: `spd = 78 + 0.42 * Speed`. The UI showed 90 to 144, which corresponds to base Speed about 29 to 157, a 1.6x spread (about 3.4 tiers of 15% across the whole cast).
- Playtest JND: 130 vs 144 (about 11%) indistinguishable, 130 vs 149 (about 15%) noticeable. Design against 15%.
- Tier count: `tiers = ln(X) / ln(1.15) + 1`. Span 0.25 to 2.0 is X = 8 (about 15-16 tiers). 16 tiers exactly needs X = 8.14, so ceiling about 2.0.
- Tier results on the real species (asymmetric 0.25-2.0x bounds):

| k | middle half (p25-p75) | p5-p95 | full cast | Shuckle -> Regieleki |
|---|---|---|---|---|
| 0.7 | 3.0 | 6.5 | 11.4 | 0.35 -> 1.74 |
| 0.8 | 3.4 | 7.2 | 12.2 | 0.33 -> 1.80 |
| 1.0 | 4.2 | 8.6 | 13.3 | 0.29 -> 1.88 |
| 1.2 | 5.0 | 9.8 | 14.0 | 0.27 -> 1.94 |

- Reference (k=0.7 / k=1.0): Shuckle 0.35/0.29, Snorlax 0.63/0.53, Pikachu 1.23/1.33, Garchomp 1.32/1.46, Ninjask 1.62/1.80, Regieleki 1.74/1.88.
- The real species only fill the bounds partially; the bounds mostly catch invested outliers. Busiest 15% bucket at k=1.0 holds 156 species (data clustering, not a curve issue).

## 4. Decision status

Locked / agreed:
- Mainline stat formula with base + IV + EV + level.
- Mainline-style damage ratio; move class from API; floor of 1 damage.
- Enemy level from run time; species gating by enemy level only; fixed neutral enemy IVs.
- Shedinja 1 HP, with Wonder Guard coming later via imported ability/learnset data.
- HP investment stays faithful.
- Full mainline type chart.
- Movement speed is shaped; the Speed stat itself stays raw everywhere else. Bounds 0.25x to 2.0x for now.
- First coding slice (when approved): Speed stat -> movement px/s, with IV/EV feeding in.

Leaning:
- Everything except movement starts raw (no bounding). Worked-out bounds are shelved: HP k=1.0 / 0.5-2.0x, Def/SpD k=0.8 / 0.5-2.0x, offense same. A joint cap on the identity layer at the damage site (apply g to the A/D identity ratio) is the fallback if raw feels bad, so keep bounding in a single place in the damage path.
- Movement k: start at 1.0, try 1.2 if the middle feels mushy.

Open:
- px/s constant the old `spd` feeds into (need code lookup) to define what 1.0x movement means.
- Does immunity (0x) override the floor-of-1 rule? Recommended yes.
- Flat heal/HP sources (regen, Shell Bell cap 4, combat heal cap 6, flat HP perks) need converting to percentages once HP scales with level.
- Enemy move assignment via API; boss handling; leaderboard/end condition (explicitly deferred).
- Enemy level vs time curve to be tuned by feel; known mismatch 450x vs 20x enemy HP growth, which may need a bridge multiplier.

## 5. Housekeeping
Uncommitted: stats, hexagon, BST stars, changelog. Untracked: `js/ui/statchart.js`, `tools/add_base_stats.py`. Rebuild needed: `node tools/build.js && node tools/export_data.js && python tools/make_seo_pages.py`.

## 6. Verification: median base Speed = 65 (corrects the 70 above) (2026-10-17)
The "median value 70" for Speed in section 3 was the median over ALL 1351 rows in pokeapi-master,
which includes alternate forms, megas, regional/battle-only forms that are NOT in the game. Recomputed
against the data that actually governs feel:
- Game roster (js/data/pokedex.js, stats[5]), n=966: median 65, mean 67.1, min 5, max 200, p25 45, p75 87.
- pokeapi-master default forms only (is_default=1), n=1025: median 65, mean 67.2.
- pokeapi-master all rows, n=1351: median 70, mean 72.0 (the old figure).
The game roster and the default-forms API agree (median 65), confirming pokedex.js is a clean
default-forms set. DECISION: SPEED_MEDIAN = 65 is the reference for the movement identity ratio
r = Speed/SPEED_MEDIAN (not 70). Using 70 would benchmark against a median faster than the roster's
actual middle and make the whole cast feel slightly sluggish.
