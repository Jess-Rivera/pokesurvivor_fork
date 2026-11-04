# EV Progression, game-specific implementation (Jess's draft, 2026-11-04)

Source design for pokebox step 5. Plan map: docs/ASCII Concept Maps/Pokebox 5 - EVs.txt (open questions there as F1 to F10).

EVs are permanent across runs and are earned through defeating enemies during gameplay.

## Acquisition
- Use each Pokemon species' existing mainline EV yield data.
- Divide the yield by 1,000 to determine its contribution to the run's EV bank.
- For example, defeating a Pokemon that yields 2 Attack EVs in the mainline games contributes 0.002 Attack EVs to the run bank.
- Each of the six EV categories accumulates independently in a separate fractional bank.
- All defeated Pokemon contribute according to their species-specific yields.

## End-of-run allocation
At the end of a run, the player can withdraw whole-number EVs from each of the six banks and distribute them among any Pokemon on their team.

For example, if the run ends with 3.742 Attack EVs, 2.315 Defense EVs and 1.891 Speed EVs, the player can allocate 3 Attack EVs, 2 Defense EVs and 1 Speed EV.

Allocation is flexible:
- Players can distribute a stat category's available EVs across multiple Pokemon.
- EVs cannot be converted between stat categories.
- Players can choose which Pokemon receive each EV.
- Players are not required to withdraw or allocate everything.

## Discard rules
- Fractional EV balances are discarded at the end of the run.
- Whole-number EVs that the player does not withdraw are also discarded.
- No fractional progress carries over between runs.

## Permanent progression
- Withdrawn EVs are permanently applied to the selected Pokemon.
- Existing mainline limits remain: 252 per stat and 510 total per Pokemon.
- EVs persist between runs.

## EV removal
Players can acquire consumable whittling items that remove EVs from a specific stat, allowing them to correct or redistribute a Pokemon's permanent EV investment.

## Design intent
The 1,000:1 conversion is intentional. EV acquisition is supposed to be a substantial long-term grind, not something players complete in a single run despite potentially defeating hundreds or thousands of enemies.

The system uses mainline species EV yields while giving players control over which Pokemon receive the resulting permanent training.
