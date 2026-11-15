# #124 Economy pass: slice opening (draft for Jess)

Ruling: docs/decisions/2026-11-15-124-economy-independent-of-xp.md

## Today

```mermaid
flowchart LR
  T[Run time] --> W[World level 1 to 50 over 30 min]
  W --> K[Each kill pays W / 10 Silver]
  W --> P[Move price = 5 x W x your level]
  L[Your level] --> P
  K --> B{Afford?}
  P --> B
```

Income and price both grow with W, so they cancel out. Price also grows with your level and income does not, so the faster you level, the more kills each move costs.

## Proposed

```mermaid
flowchart LR
  W[World level] --> K[Each kill pays W / 10]
  W --> P[Move price = W x a fixed kill count]
  K --> B{Kills per move is the same all run}
  P --> B
  S[Your skill: kills per minute] --> R[Moves per shop visit]
  B --> R
```

Your level drops out of the price, so a move costs the same number of kills from start to finish. Skill (kill rate) alone decides surplus or grind.

## The three opening items

| Item | Draft |
|---|---|
| Goal | Shop prices stop depending on your level; what a move costs is a fixed number of kills all run |
| Done when | Price at a given time is the same at any run level; an average-pace run affords at least one move per shop visit; a slow run affords fewer but can catch up by grinding; Jess feel test |
| End-goal test | New relations in the Silver harness, below |

## Jess's answers (2026-11-15)

- Horizon: over the first 3 to 4 shop visits an average player fills all 4 slots on a team of six (bonds not counted),
  so 3 x 6 = 18 bought moves, about 4 to 6 per visit.
- The Move Trainer (level-up and egg moves) is cheaper than the TM Mart.
- Jess is the average player. An average player needs a couple of runs plus meta upgrades to reach gym 1 or 2.

```mermaid
flowchart LR
  S1[Shop 1 at 2:00] --> G1[Gym 1] --> S2[Shop 2] --> G2[Gym 2] --> S3[Shop 3] --> G3[Gym 3] --> S4[Shop 4]
  S1 -. early runs end around here .-> X[Run over, meta upgrades]
```

Silver resets every run, so the 18-move target is for a run that gets to shop 3 or 4, which is a run after some meta
upgrades. Early runs that end near gym 1 fill part of the team, which fits the restart loop in #125.

## Kill rate: measure it, do not guess

No new code. Jess plays 2 or 3 normal runs; at each shop visit, open the pause menu Run Info and note "Silver earned" and the
run time. That table is the reference average. The price numbers are then set so that table buys 4 to 6 moves per visit.

## End-goal test (relations, written first)

| # | Relation |
|---|---|
| E1 | Same run time, different run levels: the price is equal |
| E2 | Price divided by Silver per kill is the same at every world level |
| E3 | At each shop visit in Jess's recorded runs, Silver earned since the last visit buys 4 to 6 Trainer moves |
| E4 | Cumulative over visits 1 to 4 of those runs, at least 18 Trainer moves are affordable |
| E5 | A Trainer move always costs less than a TM Mart move at the same time |
| E6 | At half the recorded kill rate, fewer moves per visit, and grinding longer always closes the gap |

## Open, needs Jess

| # | Question | Blocks |
|---|---|---|
| O1 | Record the Run Info table (2 or 3 runs) | E3, E4, E6, the price numbers |
| O2 | How much cheaper is a Trainer move than a TM: half, two thirds, or another ratio? | E5's number |
| O3 | Is your team usually six by shop 1, or does the "per visit" count only members you have then? | E3 |
