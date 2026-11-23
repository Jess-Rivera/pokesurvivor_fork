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
- [Approved] The drop function (supersedes the separate extra pool; Jess, 2026-11-22 second pass): the ONE flow for
  every loot drop in the game. A table's tiers are rolled rarest first and the roll stops at the first hit; that
  tier's weighted list then picks the result ("nothing" is a valid result; a candy tier is a list of one). Every
  table has a Common tier, which has no chance and is what the roll lands on when nothing rarer hits. A table may
  name only some tiers; a tier it does not name is skipped and its chance falls through to Common. One global set of
  chances for now: Uncommon 1%, Rare 0.4%, Epic 0.1%, Jackpot 0.02%, tunable. The roll count is set per source.
  8a builds it and moves the candy sources only; every other drop moves to it in a later slice.
- [Approved] Tier names, one set for every table, never candy sizes: Common, Uncommon, Rare, Epic, Jackpot.
- [Rejected] (was [Approved] earlier today) "Candy per tier is fixed for every source, a tier at or below the floor
  is no upgrade". It came from reading "upgrade" literally. Jess meant only that a hit above Common is luck on the
  way down to Common. Each table names its own tier contents.
- [Approved] Separate tables per source: Exp Candy is its own table. Gym leaders also roll a second table (items,
  coins, unique drops); in 8a that stays as today's 10 coins and guaranteed item. Elites and UberElites roll one
  mixed table whose Common is the weighted pick: coins 40, item 30, candy (XS) 30, coins and item 15, coins, item
  and candy 5. Roll count: gyms, Elite Four, elites and UberElites roll the loop number.
- [Approved] (Jess, 2026-11-22) Candy tables: gyms 1 to 7 and the Elite Four, Common XS, Uncommon S, Rare M, Epic L, Jackpot XL. Gym 8
  and the last Elite Four on loop 6, Common S, Rare M, Epic L, Jackpot XL (no Uncommon). Elite and UberElite higher
  tiers: Uncommon S, Rare M, Epic L, Jackpot XL. Every roll on Common gives 44,100 XP (the floor, +10%); the
  expected run is about 52,500 XP (+31%). Elite candy is a bonus, outside the target.
- [Approved] The bag keeps counted stacks per size. A drop is banked when earned and kept if the run is lost.
- [Approved] Giving: one candy per press, hold to repeat. A copy refuses candy only at OOR level 100. A copy whose
  next evolution has no level still levels normally (the OOR level also sets which starting moves it may pick).
  "Give until [level]" gives the largest candy that fits, repeated, then the smallest that covers the remainder;
  it may overshoot the level, stops at 100, and reports the level reached if the bag runs out.
- [Approved] The Team menu card shows the OOR level, an XP bar and a tick at the next level-based evolution.
- [Approved] Candy and evolution materials are separate tables per source, rolled by the same G.Drops function. Gym
  leaders and Elite Four roll both; elites and UberElites roll candy (and their floor) only.
- [Approved] A leader's material list is derived from its type. Materials roll once per source per loop (candy rolls
  N times on loop N). Many runs to see a given drop is fine; no pity counter.
- [Approved] Each time a leader is beaten, a stock of exactly one of each evolution material on its tables is added to
  the main menu shop, a new tab, as an expensive consumable used on a copy. Filed as #163.
- [Open] Which materials each type maps to and what a type with no material drops (Rock, Fighting, Ghost); the shop
  price.
- [Approved] (Jess, 2026-11-22) The elite and UberElite mixed table is the whole elite drop: it replaces the old
  guaranteed berry, ground item and 50% item chance, and on loop N it rolls N times. Elite and UberElite counts per
  run are not an 8a input (the harness checks the floor against the gym and Elite Four tables alone). The tier
  chances stay tunable (G.Debug.candy and the harness); no per-source multiplier is built. The Give until input
  control is decided at Part F.
- [Open] "The last Elite Four beaten": the four gates open at once and the order is free (BOSS-REWORK section 4).

Canonical: docs/AI Outputs/Issue-139/139 - Candy and Evolution Slice Opening.md, then spec section 6 once built.
