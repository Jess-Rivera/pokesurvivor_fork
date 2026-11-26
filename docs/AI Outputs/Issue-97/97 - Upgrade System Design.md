# 97 - Upgrade System Design (2026-11-23, grilled with Jess, rounds 1 to 4)

The redesign of the permanent upgrades. Replaces the 13 placeholders in js/data/upgrades.js (review:
97 - Upgrade System Review.md). Decision: 2026-11-23-97-upgrade-system-redesign. No code. Ships with the #128 new
save, so old upgrade levels need no migration (2026-11-15-128-exp-candy-unparked-97-ships-with-new-save).

## The system

```mermaid
flowchart LR
  Run[A run] -->|payout| Coins[(PokeCoins)]
  Coins --> Char["Character Upgrades tab<br/>(Main Menu Shop, account-wide)"]
  Coins --> Copy["Upgrade tab<br/>(one copy, Team screen)"]
  Coins --> Items["Shop items<br/>Mints, Ability Capsules, Bottle Caps"]
  Candy[OOR level] -->|raises the caps| Copy
  Candy -->|level 50 to use| Items
  Copy -->|"base stat percent, crit, cooldown, regen, starting moves"| Run
  Char -->|trainer perks| Run
  Items -->|nature, ability slot, IVs on the copy| Run
```

## Rulings

| Topic | Ruling | Tag |
|---|---|---|
| Purpose | Catch-up power and sidegrades; part of the roguelite identity. A poor player restarts stronger (2026-11-15-125-xp-tracks-skill-against-the-world-level). | [Approved] |
| Two homes | Account-wide upgrades live in the Main Menu Shop's Character Upgrades tab; per-copy upgrades in the copy's Upgrade tab (today's Upgrades screen from the Team screen). | [Approved] |
| Currency | PokeCoins for both. | [Approved] |
| Numbers | Caps, prices, the star price factor, the OOR level bands and how many runs maxing takes: set in #131 from traced payouts. Draft below in "Numbers (draft)". | [Approved] |
| Cut | Vitality, Strength, Carapace and Stride (flat or multiplier power outside the stat model), and Wisdom (clashes with #125). | [Approved] |
| EVs | Stay earned only in runs. No upgrade buys EVs. | [Approved] |
| Belt and balls | Belt size and ball quality stay in the Pokeballs tab (#137), not in #97. | [Approved] |

### Per-copy upgrades (Upgrade tab)

| Upgrade | Effect | Rules | Tag |
|---|---|---|---|
| Base stat (one per stat: HP, Atk, Def, SpA, SpD, Spe) | Raises the copy's species base stat by a %, inside the G.Stats formula | A %, so it carries through evolution (Bulbasaur +10%: base HP 45 becomes 49.5; as Ivysaur 60 becomes 66). The raised base keeps its fraction; only the final stat rounds, as today. Same cap and price curve for every stat. Shedinja's HP upgrade shows greyed out, "no effect" (acquisition F2b). | [Approved] |
| Critical Hit | A base crit chance for this copy (today the base is 0) | Adds to the in-run Critical Hit card's chance; x1.5 as now. | [Approved] |
| Reflexes | Cuts this copy's move cooldowns by a % | Move cooldowns only. Gates, the dodge and the swap lock are untouched. | [Approved] |
| Regeneration++ (was Synthesis) | Regenerates a % of max HP per second (scales with HP) | Ticks on the field and on the bench (2026-11-26-97-upgrade-popup-open-questions). Stacks with a Bench Nurse style sidegrade. | [Approved] |
| Starting moves (was Repertoire) | Buy 1: the copy may change its starting move. Buy 2: it starts with 2 moves | Per copy. The second move counts as a filled slot for move prices (2026-11-15-124-move-price-by-slots-filled). The pick list is #150. | [Approved] |
| Caps and the OOR level | The caps of the four power upgrades (base stat, crit, cooldown, regen) rise with the copy's OOR level, in bands | Bands at OOR 1, 10, 20, 40 and 80, to start with (Jess 2026-11-23). See "Numbers (draft)". | [Approved] |
| Price | Every per-copy upgrade, starting moves included, scales with the copy's BST star rating (3 to 7 stars, half-star steps; higher BST pays more) | BST stars, not rarity (Jess 2026-11-23, replacing the A13b rarity stars). Prices grow exponentially per level: the first level or two are cheap, then each costs more and more. | [Approved] |
| A copy that leaves | Sold or released (#146), its upgrades are lost, no refund | | [Approved] |
| Where they compute | The copy's upgrade levels travel in its profile with its IVs, EVs and nature (G.Copies.profileOf, G.Stats.profile); combat reads crit, cooldown and regen from there, so no entity works them out on its own | | [Approved] |
| Leaders | A leader's slot may be authored with any per-copy upgrade, none by default (leader principle) | Not in slice C: #169. Leaders keep a neutral profile until then. | [Approved] |

### Account-wide upgrades (Character Upgrades)

Magnet (pickup range), Card Reroll, Veto, PokeCoin % (lower than today's Fortune), Silver % (new), Berry Pocket,
Team Items Pocket. That is the list for now. [Approved]

### Numbers (draft, 2026-11-23, worked in #131)

Per-copy upgrades are a long-term sink competing with Character Upgrades, shop items and Pokeballs, so maxing a copy
takes many runs (Jess: "a lot", no fixed count). [Approved] The numbers below are [Proposed], to be checked against
real PokeCoin income once #166 (run telemetry) has collected traces.

**Effects and levels**

| Upgrade | Per level | Levels | Cap |
|---|---|---|---|
| Base stat (each of 6) | +1.5% species base | 10 | +15% |
| Critical Hit | +2% crit chance | 5 | 10% |
| Reflexes | -2% move cooldowns | 5 | -10% |
| Regeneration++ | +0.1% max HP per second | 5 | 0.5% per second (a full heal on the bench in 200 s) |
| Starting moves | 1st buy: change the move. 2nd buy: start with 2 | 2 | |

**Prices at 3 stars (BST 300).** A copy pays these times its stars / 3 (x1 at 3 stars, x2.33 at 7 stars), rounded
to 10.

| Upgrade | Price per level | Growth | Total |
|---|---|---|---|
| Base stat | 50, 80, 130, 200, 330, 520, 840, 1,340, 2,150, 3,440 | x1.6 | 9,080 each, 54,480 for six |
| Crit, Reflexes, Regeneration++ | 100, 200, 400, 800, 1,600 | x2 | 3,100 each, 9,300 for three |
| Starting moves | 300, then 2,000 | | 2,300 |

**Bands.** Each band opens 2 levels of every base stat and 1 level each of Crit, Reflexes and Regeneration++. Cost at
3 stars, against an estimated 3,500 PokeCoins for a full run (an estimate from the end-of-run formula; no traced run
has reached gym 1 yet):

| Band | Opens at OOR | Cost | Full runs |
|---|---|---|---|
| 1 | 1 | 1,080 | under 1 |
| 2 | 10 | 2,580 | under 1 |
| 3 | 20 | 6,300 | about 2 |
| 4 | 40 | 15,480 | about 4 to 5 |
| 5 | 80 | 38,340 | about 11 |
| Whole copy | | 63,780 (about 149k at 7 stars) | about 18 (about 42 at 7 stars) |

**Account-wide.** Today's per-level curves stay (Magnet, Card Reroll and Veto already grow x1.4 to x1.9). New:
PokeCoin % at +4% a level, 5 levels (150 growing x1.5); Silver % at +5% a level, 5 levels (100 growing x1.45). The
pockets start at 1 slot; their prices and all account-wide prices are temporary until #166 has data. [Proposed]

### Shop items (not upgrades; new issue)

| Item | Effect | Tag |
|---|---|---|
| Mint | Changes a copy's nature | [Approved] |
| Ability Capsule | Switches a copy's ability slot | [Approved] |
| Bottle Cap | Each one adds IV points toward 31 on one stat; usable on a copy at OOR level 50 or higher (mainline Hyper Training) | [Approved] |

### The stat hex (#95)

The starting band counts everything the copy owns before the run: the raised base, IVs (Bottle Caps included), EVs
and nature. Yellow is only what the run adds. [Approved]

## Sidegrades (child issue 97b, its own grilling)

Per-copy perks that trade or bend a rule, for example "Bench Nurse: heals the other benched Pokemon while this one
is benched" and "Tactician: refreshes every buff on entering the field; this Pokemon's swap cooldown is 10 s".

| Question for 97b | Tag |
|---|---|
| How many a copy holds, how one is bought or unlocked, whether it can be swapped | [Open] |
| The list of sidegrades and each one's numbers | [Open] |
| Whether leaders can be authored with them (the leader principle says yes unless ruled otherwise) | [Open] |

## Build order (after #131 numbers)

```mermaid
flowchart TD
  A[Cut the five upgrades, new save keys] --> B["Base stat percent in G.Stats + the hex starting band, #95"]
  B --> C[Crit, cooldown, regen read from the copy profile]
  C --> D[Starting moves purchases + #150 picker]
  A --> E[Character Upgrades list in the shop]
  A --> F[Shop items: Mints, Ability Capsules, Bottle Caps]
  C --> G[97b sidegrades]
```
