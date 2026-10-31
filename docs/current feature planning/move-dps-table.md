# Move DPS table (formula, Quick 2026-10-31)

One move, one target. Attacker and target are the median mon (base stats 65/75/68/65/65/65, HP/Atk/Def/SpA/SpD/Spe), same level, no STAB, neutral type, no crit, no stages, no cards. Per hit = the real G.Stats.attackFactor + applyDamage. DPS = per hit x hits on the target per cast / cd (persistent: per hit / rehit). Burn and poison ticks are NOT included. Hand check: Tackle L25 = (12 x 40 x 42 / 50) / 39 + 2 = 12.34.

| # | move | cat | power | cd | per hit L25 | hits/s | DPS L25 | x Tackle | DPS L45 | hit count assumed |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | bubble-beam | spec | 65 | 0.875 | 17.6 | 8.0 | 140.8 | 5.71 | 224.0 | 7 shots stacked |
| 2 | leaf-storm | spec | 117 | persist | 30.1 | 4.0 | 120.3 | 4.88 | 195.2 | 1 hit per rehit 0.25 s |
| 3 | flamethrower | spec | 90 | 1.167 | 23.6 | 4.3 | 101.1 | 4.10 | 162.8 | 5 ticks |
| 4 | razor-leaf | phys | 52.25 | 0.7 | 15.5 | 5.7 | 88.6 | 3.59 | 141.7 | 2 shots stacked, out and back |
| 5 | gust | spec | 40 | 0.5 | 11.6 | 6.0 | 69.6 | 2.82 | 108.0 | 3 children |
| 6 | fairy-wind | spec | 40 | 0.583 | 11.6 | 5.1 | 59.7 | 2.42 | 92.6 | 3 children |
| 7 | flame-wheel | phys | 60 | persist | 17.5 | 3.3 | 58.4 | 2.36 | 93.9 | trail tick 1 per 0.3 s (only while you move) |
| 8 | meteor-mash | phys | 81 | 1.75 | 22.9 | 2.3 | 52.4 | 2.12 | 85.4 | 3 children |
| 9 | night-shade | spec | - | persist | 25.0 | 2.0 | 50.0 | 2.03 | 90.0 | 1 hit per rehit 0.5 s |
| 10 | bug-buzz | spec | 90 | persist | 23.6 | 2.0 | 47.2 | 1.91 | 76.0 | 1 hit per rehit 0.5 s |
| 11 | bug-bite | phys | 60 | 0.42 | 17.5 | 2.4 | 41.7 | 1.69 | 67.1 | 1 hit |
| 12 | discharge | spec | 80 | 1.167 | 21.2 | 1.7 | 36.3 | 1.47 | 58.3 | 2 children |
| 13 | wing-attack | phys | 60 | 0.5 | 17.5 | 2.0 | 35.0 | 1.42 | 56.4 | 1 hit |
| 14 | bonemerang | phys | 45 | 1.75 | 13.6 | 2.3 | 31.2 | 1.26 | 49.5 | 2 shots stacked, out and back |
| 15 | metal-claw | phys | 47.5 | 0.5 | 14.3 | 2.0 | 28.6 | 1.16 | 45.5 | 1 hit |
| 16 | bite | phys | 60 | 0.7 | 17.5 | 1.4 | 25.0 | 1.01 | 40.3 | 1 hit |
| 17 | tackle | phys | 40 | 0.5 | 12.3 | 2.0 | 24.7 | 1.00 | 38.9 | 1 hit |
| 18 | aura-sphere | spec | 80 | 0.875 | 21.2 | 1.1 | 24.2 | 0.98 | 38.9 | 6 shots in a ring, 1 reaches |
| 19 | psycho-cut | phys | 70 | 0.875 | 20.1 | 1.1 | 23.0 | 0.93 | 37.2 | 1 hit |
| 20 | fire-spin | spec | 29.75 | persist | 9.1 | 2.5 | 22.9 | 0.93 | 34.8 | 1 hit per rehit 0.4 s |
| 21 | karate-chop | phys | 50 | 0.7 | 14.9 | 1.4 | 21.3 | 0.86 | 34.0 | 1 hit |
| 22 | quick-attack | phys | 40 | 0.583 | 12.3 | 1.7 | 21.2 | 0.86 | 33.4 | 1 hit |
| 23 | body-slam | phys | 85 | 1.167 | 24.0 | 0.9 | 20.5 | 0.83 | 33.5 | 1 hit |
| 24 | thunderbolt | spec | 90 | 1.167 | 23.6 | 0.9 | 20.2 | 0.82 | 32.6 | chain hops hit others |
| 25 | psybeam | spec | 65 | 0.875 | 17.6 | 1.1 | 20.1 | 0.82 | 32.0 | 1 hit |
| 26 | sludge | spec | 65 | 0.875 | 17.6 | 1.1 | 20.1 | 0.82 | 32.0 | 1 hit |
| 27 | bulldoze | phys | 60 | 0.875 | 17.5 | 1.1 | 20.0 | 0.81 | 32.2 | 1 hit |
| 28 | aerial-ace | phys | 60 | 0.875 | 17.5 | 1.1 | 20.0 | 0.81 | 32.2 | 1 hit |
| 29 | confusion | spec | 50 | 0.7 | 14.0 | 1.4 | 20.0 | 0.81 | 31.4 | 1 hit |
| 30 | thunder-shock | spec | 40 | 0.583 | 11.6 | 1.7 | 19.9 | 0.81 | 30.9 | chain hops hit others |
| 31 | vine-whip | phys | 45 | 0.7 | 13.6 | 1.4 | 19.5 | 0.79 | 30.9 | 1 hit |
| 32 | dark-pulse | spec | 80 | 1.167 | 21.2 | 0.9 | 18.2 | 0.74 | 29.1 | 1 hit |
| 33 | shadow-ball | spec | 80 | 1.2 | 21.2 | 0.8 | 17.7 | 0.72 | 28.3 | 1 hit |
| 34 | lick | phys | 30 | 0.583 | 9.8 | 1.7 | 16.7 | 0.68 | 25.9 | 1 hit |
| 35 | ember | spec | 40 | 0.7 | 11.6 | 1.4 | 16.6 | 0.67 | 25.7 | 1 hit |
| 36 | water-gun | spec | 40 | 0.7 | 11.6 | 1.4 | 16.6 | 0.67 | 25.7 | 1 hit |
| 37 | powder-snow | spec | 40 | 0.7 | 11.6 | 1.4 | 16.6 | 0.67 | 25.7 | 1 hit |
| 38 | ice-beam | spec | 90 | 1.75 | 23.6 | 0.6 | 13.5 | 0.55 | 21.7 | 1 hit |
| 39 | hyper-voice | spec | 90 | 1.75 | 23.6 | 0.6 | 13.5 | 0.55 | 21.7 | 1 hit |
| 40 | psychic | spec | 90 | 1.75 | 23.6 | 0.6 | 13.5 | 0.55 | 21.7 | 1 hit |
| 41 | heat-wave | spec | 85.5 | 1.75 | 22.5 | 0.6 | 12.9 | 0.52 | 20.7 | 1 hit |
| 42 | mud-shot | spec | 52.25 | 1.167 | 14.5 | 0.9 | 12.5 | 0.50 | 19.6 | 6 shots in a ring, 1 reaches |
| 43 | dazzling-gleam | spec | 80 | 1.75 | 21.2 | 0.6 | 12.1 | 0.49 | 19.4 | 1 hit |
| 44 | flash-cannon | spec | 80 | 1.75 | 21.2 | 0.6 | 12.1 | 0.49 | 19.4 | 1 hit |
| 45 | poison-sting | phys | 15 | 0.5 | 5.9 | 2.0 | 11.8 | 0.48 | 17.1 | 1 hit |
| 46 | rock-throw | phys | 45 | 1.167 | 13.6 | 0.9 | 11.7 | 0.47 | 18.5 | 1 hit |
| 47 | giga-drain | spec | 75 | 1.75 | 20.0 | 0.6 | 11.4 | 0.46 | 18.3 | 1 hit |
| 48 | dragon-rage | spec | - | 3.5 | 40.0 | 0.3 | 11.4 | 0.46 | 11.4 | 1 hit |
| 49 | rock-slide | phys | 67.5 | 1.75 | 19.4 | 0.6 | 11.1 | 0.45 | 18.0 | 1 hit |
| 50 | hex | spec | 65 | 1.75 | 17.6 | 0.6 | 10.1 | 0.41 | 16.0 | chain hops hit others |
| 51 | hydro-pump | spec | 88 | 3.5 | 23.1 | 0.3 | 6.6 | 0.27 | 10.6 | 1 hit |

No direct damage: string-shot, swords-dance, dragon-dance, aqua-ring, substitute, agility, harden, toxic, toxic-spikes, will-o-wisp, spikes
