# BUFF-TABLE, authoring sheet for the player's buff moves

Edit the numbers here, then tell Claude to convert them into `js/data/moves.js` (fields `cd`, `dur`, `stageN`, `stage2`, `amount`).
Rules (stat stages, stage ladders, maxStacks): docs/COMBAT-RULES.md, section "Stat stages and maxStacks". Where this sheet and COMBAT-RULES disagree, COMBAT-RULES wins. Reasoning history: docs/DECISIONS-archive.md, 2026-10-20 Status Slice E2a.

## How it works in one paragraph
Every cast of a buff move is its own timed application on the TEAM (all raises are team-wide). The sheet below describes the legacy
behavior, where how many casts overlap is set by duration / cooldown (the cap rules, including per-move maxStacks, are in COMBAT-RULES "Stat stages and maxStacks"). At base the cooldown equals the duration, so exactly one application is
live and the stage is what one cast gives. Recharge (cooldown / (1 + 0.15 n)) and Duration (duration x (1 + 0.15 n)) cards each multiply
duration / cooldown, and the sustained stage is about: per-cast stages x (1 + 0.15 r) x (1 + 0.15 d). Only moves in the active slot group
cast (selected or bonded).

## Base table (current values)

| Move | Per cast | Cooldown (s) | Duration (s) | Base sustained | Cards that apply |
|---|---|---|---|---|---|
| Swords Dance | +2 Attack (physical moves only) | 8 | 8 | +2 Attack | Recharge, Duration |
| Agility | +2 Speed | 8 | 8 | +2 Speed (x1.5 movement on the B = 4 Speed ladder) | Recharge, Duration |
| Harden | +1 Defense | 8 | 8 | +1 Defense (x1.5) | Recharge, Duration |
| Dragon Dance | +1 Attack and +1 Speed | 8 | 8 | +1 each | Recharge, Duration |
| Aqua Ring | 1.6 HP/s regen per application (not a stage) | 8 | 8 | 1 application | Recharge, Duration, Increased Effect |

Retired for these moves: Buff Stacks (all five), Increased Effect (the four stage moves).

## Sustained stage by investment (r = Recharge stacks, d = Duration stacks)

Multiplier = (1 + 0.15 r) x (1 + 0.15 d). Stage = per-cast x multiplier, rounded between the floor and ceiling (it alternates), clamped to +6.

| r + d split | Multiplier | Harden (+1/cast) | Swords Dance, Agility (+2/cast) |
|---|---|---|---|
| none | 1.00 | +1 | +2 |
| 2 | 1.30 | +1.3 | +2.6 |
| 4 | 1.60 | +1.6 | +3.2 |
| 7 | 2.05 | +2.05 | +4.1 |
| 10 (5 and 5) | 3.06 | +3.1 | +6 (clamped; Agility +6 is only x2.5 movement) |
| 10 (10 and 0) | 2.50 | +2.5 | +5 |

Measured by the offline harness over 200 s with real casts: Harden 4 Recharge = average 1.61, Swords Dance 4 Recharge = 3.23.

## Stage ladders (one base number B per stat, G.Stages.BASE)
The ladder rule and the B values are in COMBAT-RULES "Stat stages and maxStacks" (current B values: see js/systems/stages.js BASE). The table below is derived from them for authoring.

| Stage | -6 | -4 | -2 | +1 | +2 | +4 | +6 |
|---|---|---|---|---|---|---|---|
| B = 2 (Atk, Def, SpA, SpD) | x0.25 | x0.33 | x0.50 | x1.5 | x2.0 | x3.0 | x4.0 |
| B = 4 (Speed, movement) | x0.40 | x0.50 | x0.67 | x1.25 | x1.5 | x2.0 | x2.5 |

Dash Distance (planned dash, not built) will use the B = 2 ladder.

## Things to tune by feel
- Cooldown and duration per move (all 8 / 8 to start; a cooldown a little above 8 s loses uptime at base, a little below stacks briefly).
- The ladder base B per stat (stages.js BASE). Swords Dance +2 is x2.0 physical damage for the team (B = 2); Agility +2 is x1.5 movement (B = 4).
- Aqua Ring's 1.6 HP/s per application (the old four-stack ceiling of 6.4 HP/s is gone).
- Brock's Harden: authored Duration x2 only, so 10.4 s per cast, +1 Defense each; his recovery after a buff cast is 0.85 s.
