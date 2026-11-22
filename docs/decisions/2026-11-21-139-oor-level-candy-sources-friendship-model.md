---
title: "#139 grilling: the out-of-run level, candy sources, starting moves, the friendship model (Jess)"
date: 2026-11-21
issues: [139]
area: engine
canonical: "docs/AI Outputs/Issue-139/139 - Candy and Evolution Slice Opening.md, then spec section 6 once built."
---
# 2026-11-21: #139 grilling: the out-of-run level, candy sources, starting moves, the friendship model (Jess)

- [Approved] Runs start at level 1. A copy's out-of-run (OOR) level sets only its evolution stage and which moves it
  may start a run with. Narrows A10 ("an evolution meter only").
- [Approved] Candy XP fills the species' mainline growth curve; the OOR level is the mainline level for that XP, up
  to 100 (candy refused at 100). Evolutions with no level keep their normal requirement, no candy (D8 stands).
- [Approved] Candy is a rarity drop: gym leaders 100%, UberElites 50%, elites 15% (TUNE). Gym size rises with gym
  order; an UberElite drops one size below the last gym beaten; an elite drops XS; x loop number. Replaces CD1, CD3.
  Pace: a median line evolves fully in 2 to 3 six-loop clears; level 100 is a long tail (about 75). Tuned for 6
  loops now, tested with G.Debug.candy. [Proposed] the size table (the 8a build plan).
- [Approved] Evolving is a Team menu choice, permanent and optional.
- [Approved] Starting moves: level-up moves at or under the OOR level (newest game), the earlier forms' moves, and
  egg moves. An egg move unlocks at any level once a parent line was ever owned: shares an egg group, learns the
  move by level-up, forms included (Hisuian Goodra's Iron Tail waits on forms). Newest game's egg moves, moves in
  the game only. The picker waits for #97 and takes #150 in.
- [Approved] Friendship: the copy's 0 to 255 field, mainline thresholds (160; 220 Pichu, Chingling, Swadloon),
  tracked on every copy for later features. Alive time up; fainted time and faints down; start-of-run fatigue
  scales gains down and losses up; at 80%+ an exhausted mult also cuts gains. Applied at run end, every end.
  [Open] the calculation (own grilling, blocks 8c). Supersedes F0 and F1 (friendship minutes).
- [Approved] Fatigue 0 to 100%: builds on runs, recovers only in runs sat out, Shop items cut it with diminishing
  returns, never to 0. Stubbed; [Open] numbers.

Canonical: docs/AI Outputs/Issue-139/139 - Candy and Evolution Slice Opening.md, then spec section 6 once built.
