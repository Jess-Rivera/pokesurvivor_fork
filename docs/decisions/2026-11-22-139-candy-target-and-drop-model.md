---
title: "#139 8a: the candy target, canon sizes, the base drops and the extra pool (Jess)"
date: 2026-11-22
issues: [139]
area: engine
canonical: "docs/AI Outputs/Issue-139/139 - Candy and Evolution Slice Opening.md, then spec section 6 once built."
---
# 2026-11-22: #139 8a: the candy target, canon sizes, the base drops and the extra pool (Jess)

- [Approved] Target: the deterministic base drops of one full run (loop 6 done: 8 gyms and 4 Elite Four per loop)
  let the median 3-stage, fully level-based line reach its last evolution. Median = 40,007 XP (the Charizard line,
  level 36), computed from pokeapi per evolution path (3-stage, every step a level-up: 76 paths, p25 33,084,
  p75 74,088). The earlier "median line 33,084" was that group's 25th percentile, not its median.
- [Approved] Canon candy sizes, never scaled: XS 100, S 800, M 3,000, L 10,000, XL 30,000.
- [Approved] Base drops: gym leaders and Elite Four members, 100%, count = the loop number (21 loop-shares, 252
  drops a full run). Gym 8 drops S every loop, the last Elite Four beaten drops S on loop 6 only, every other
  source drops XS: 44,100 XP, 10% over the target. Gym order no longer sets the size. Replaces CD1.
- [Approved] Drop ladder (supersedes the separate extra pool): a drop table is N rarity tiers rolled rarest first, each
  with its own chance, stopping at the first hit; a hit picks an item from that tier (weighted or not). The bottom
  tier has no chance and is guaranteed. Loop N means N ladder rolls. One new G.Drops entry type, kept in the one place.
- [Approved] Tier names, one set for every table, never candy sizes: Common, Uncommon, Rare, Epic, Jackpot.
- [Proposed] Candy per tier is fixed for every source: Uncommon S, Rare M, Epic L, Jackpot XL. A source supplies only
  its floor, and a tier at or below the floor is no upgrade. (A stepped-from-the-floor rule was rejected: gym 8's XL
  would be 0.12% against 0.02% elsewhere.) First-pass chances per roll: Uncommon 1%, Rare 0.4%, Epic 0.1%,
  Jackpot 0.02%, tunable.
- [Approved] Gyms and Elite Four: the bottom tier is the base candy, so every roll gives at least the base size and a
  rare roll upgrades it. A full run's base (44,100 XP) is a hard floor, upgrades only add. Elites and UberElites: the
  bottom tier is a weighted pick, coins 40, item 30, candy (XS) 30, coins and item 15, coins, item and candy 5. 8a
  moves candy only; the gym's 10 coins and guaranteed item stay as they are.
- [Approved] The bag keeps counted stacks per size. A drop is banked when earned and kept if the run is lost.
- [Approved] Giving: one candy per press, hold to repeat. A copy refuses candy only at OOR level 100. A copy whose
  next evolution has no level still levels normally (the OOR level also sets which starting moves it may pick).
  "Give until [level]" gives the largest candy that fits, repeated, then the smallest that covers the remainder;
  it may overshoot the level, stops at 100, and reports the level reached if the bag runs out.
- [Approved] The Team menu card shows the OOR level, an XP bar and a tick at the next level-based evolution.
- [Approved] Candy and evolution materials are separate ladders per source, rolled by the same G.Drops function. Gym
  leaders and Elite Four roll both; elites and UberElites roll candy (and their floor) only.
- [Approved] A leader's material list is derived from its type. Materials roll once per source per loop (candy rolls
  N times on loop N). Many runs to see a given drop is fine; no pity counter.
- [Approved] Each time a leader is beaten, a stock of exactly one of each evolution material on its tables is added to
  the main menu shop, a new tab, as an expensive consumable used on a copy. Filed as #163.
- [Open] Which materials each type maps to and what a type with no material drops (Rock, Fighting, Ghost); the shop
  price.
- [Open] Whether the elite berry and ground item stay beside the ladder, and how many UberElites and elites a run holds.
  The tier chances stay tunable (G.Debug.candy and the harness); no per-source multiplier is built.
- [Open] "The last Elite Four beaten": the four gates open at once and the order is free (BOSS-REWORK section 4).

Canonical: docs/AI Outputs/Issue-139/139 - Candy and Evolution Slice Opening.md, then spec section 6 once built.
