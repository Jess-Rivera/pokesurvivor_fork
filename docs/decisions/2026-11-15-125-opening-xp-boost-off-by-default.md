# 2026-11-15, #125: the opening XP boost is off by default, debug only (Jess)

The opening XP boost (x2 wild-kill XP for the first 3:00, with its "3 Min XP boost!" banner) no longer runs in the game.
Only ?dev G.Debug.xpBoost(true) turns it on, until the page reloads. Why: the boost put you about 2.1 levels over the
world at 3:00 against 0.7 without it (docs/ASCII Concept Maps/125 - XP Boost Comparison.md), against the
2026-11-15-125-xp-tracks-skill-against-the-world-level ruling.
Unchanged: the opening wild HP discount (x0.55 to x1.0 over 0 to 3:00) and the Density Bonus start at 3:00 keep the same window.

Canonical: BALANCE.md (the 2026-11-15 XP boost line) and js/systems/spawner.js.
