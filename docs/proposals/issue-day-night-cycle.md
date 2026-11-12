Parked feature, needs its own design dive before any build. Local single-player scope.

## Direction (Jess, 2026-11-12)
- Clock: run time. Each run starts at a random point in the cycle.
- May affect all three: visuals (a night tint), evolution requirements, wild spawns.
- Evolution: time-of-day evolutions (18 species, e.g. Espeon by day, Umbreon by night, Lycanroc, Tyrantrum) set a true/false flag on the copy when that Pokemon is the ACTIVE Pokemon while it is day (or night). Evolving happens later in the Team Menu.

## Open for the design dive
- Cycle length, and how day / dusk / night look.
- Which spawns change at night (could tie into the parked region type maps).
- Performance: a full-screen tint is cheap; lights around the player or glowing moves cost more.
- Save safety: new per-copy day/night flags default to false on old saves.

## References
- Decision: docs/decisions/2026-11-12-acquisition-no-gacha-catch-candy-legendaries.md (T2)
- Map: docs/ASCII Concept Maps/Acquisition v1 - Catch, Candy, Legendaries.txt (rounds 12 and 13)
- No day/night code exists in js/ today (checked 2026-11-12).
