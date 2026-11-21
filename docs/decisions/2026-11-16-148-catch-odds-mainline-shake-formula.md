# 2026-11-16: #148 catch odds use Jess's mainline-style shake formula; capture_rate returns (Jess)

- The catch chance follows Jess's formula (docs/ASCII Concept Maps/pokeball-math-human-made.txt): time stands in for HP,
  then the species' capture_rate, ball, star rarity (1 / 0.75 / 0.5 / 0.25), the badge cap penalty, the early World Level
  bonus, a critical catch and three shake checks. Replaces the star band x ball x (1 + time left) formula and its 90% ceiling.
- A faster win is an easier catch: the time term counts time used, not time left (the txt file's step 1 is flipped).
- pokeapi capture_rate comes back as an input. Overrides round 5 of the Acquisition v1 spec (2026-11-12), which ruled it
  out; the star rarity multiplier and the time term are what make a strong Pokemon hard.
- A critical catch is a guaranteed catch (no shake check). Each throw rolls the critical, then each shake; the catch screen
  wobbles once per passed shake (one on a critical). Plain decimals, not the 4096 integers. "Species in the Pokedex" is
  save.owned; badges are this run's.
- Timer Ball is the ball for a fight that went long: strongest on a slow win (as written in the txt file), clamped to 4x,
  multiplied in with the time term. Built with #137.
- #137 ships Poke, Great and Ultra (Heavy and Timer if wanted); balls that need missing systems (fishing, night, gender,
  sleep, level gaps) get their own issue.

Plan: docs/ASCII Concept Maps/148 - Catch Odds Slice Opening.md.
Canonical: js/systems/catch.js header and its ODDS table.
