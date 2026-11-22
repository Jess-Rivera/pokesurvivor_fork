# #124 Economy rule: what was built (2026-11-15)

Ruling: docs/decisions/2026-11-15-124-move-price-by-slots-filled.md. Branch: balance/124-economy-xp.

## Silver in, Silver out

```mermaid
flowchart LR
  K[Defeat a Pokemon] -->|+1, any time, any enemy| S[(Silver, run starts at 0)]
  S --> T[Move Trainer]
  S --> M[TM Mart]
  F[Member's slots filled] --> T
  F --> M
  R[Replacing a move] -->|full base| T
  R -->|full base| M
```

## Price ladder

| Slots filled before the buy | Move Trainer (base 300) | TM Mart (base 450) |
|---|---|---|
| 1 (buying slot 2) | 60 (80% off) | 150 (two thirds off) |
| 2 (buying slot 3) | 120 (60% off) | 300 (one third off) |
| 3 (buying slot 4) | 240 (20% off) | 400 (one ninth off) |
| 4, or a replacement | 300 | 450 |

A member that starts with 2 moves begins at the second row. Filling six members from 1 move each at the Trainer: 2,520.

## Files

```mermaid
flowchart TB
  subgraph Game
    SV[js/systems/silver.js: start 0, KILL_PAY 1]
    SH[js/systems/shops.js: PRICES table, price by kind and slots, check picks the replacement price]
    EN[js/entities/enemy.js: kill call takes no time]
    UI[js/ui/shop-ui.js: header shows balance only; member cards show next price; TM cards show 150 to 450]
    GM[js/game.js: comment only]
    DB[js/core/debug-run-screens.js: Run Info sample kills]
  end
  subgraph Checks
    H1[silver-harness 28 checks, mutate 17 of 17]
    H2[shop-screens-harness 81 checks, mutate 35 of 35]
    H3[shops-mutate 15 of 15, one pattern repointed after the trace hook]
    SM[smoke-ui start check now 0; smoke-run-trace 14 of 14]
  end
  subgraph Docs
    D1[decision file + DECISIONS index]
    D2[BALANCE Move price and Silver income]
    D3[move-shop-plan Silver rules]
    D4[changelog 2026-11-15 entry]
  end
```

## Results

| Check | Result |
|---|---|
| node tools/check.js | all passed, 60 harnesses |
| smoke-ui | all passed on the second run (the first timed out in a later, unrelated step) |
| smoke-run-trace | 14 of 14 |
| Shop screen, headless, 212 Silver | Trainer: "1 / 4 slots, next 60", offers at 60. Mart: "Can learn, 150 Silver", TM cards "150 to 450" |

## Not built yet

| Item | Waits on |
|---|---|
| Elite, boss and special encounter bonuses (1 + bonus) | a traced run that reaches gym 1 |
| Shops 2 to 4 check of the 18-move horizon | the same trace |

## Feel test

One run on dev.html?dev: Silver starts at 0 and climbs by 1 a kill; at the first shop each member's next move shows 60;
buying one makes that member's next 120; a full member shows 300 (replaces).
