# 2026-11-12, Acquisition: no gacha; catch Stage 1s in runs, evolve by candy, legendaries by loop clear (Jess)

Direction: the gacha goes. Luck should not hand out an end-game mon and make starters useless; the game is moving toward a horde ARPG with Pokemon investment and meta progression.
- Tier 1, in run: a rare "[Stage 1] needs help!" event with an arrow; beat its UberElite under X seconds to earn a catch phase; throw Poke Balls from a Pokeball Belt (1 per run at the start, more via meta progression); each failure raises a Flee meter until it runs.
- Tier 2, meta: only evolution gets past Stage 1. Gym Leaders drop Exp Candy; candy levels a copy permanently toward evolution. Runs still start at level 1.
- Tier 3: legendaries via Loop 6 and the Legendary Boss (GDD 12, unchanged).
- Belt (replaces the earlier A11 ruling, same day): new accounts start with a 6-ball belt; balls are consumed per throw and restocked between runs. A miss does not end the event; the Flee meter does.
- B4: meta progression upgrades belt size and ball quality.
- A12 (reopened same day): our own catch equation replaces the mainline formula: the BST ladder combined with the star tier (E3 in the map); time left on the UberElite clock still raises the odds.
- Flee (replaces B3, same day): the Flee meter is keyed to the rescued mon's nature. Easy-sounding natures (Bold, Calm, Lax) allow more misses, hard-sounding ones (Timid, Careful) fewer, the rest a default.
- A2: gacha tickets (x1 "Pokeball", x10 "Master Ball") are retired.
- C1: former ticket payouts give coins; coins pay for restocking balls.
- C3: flee floor is 1 miss.
- C4: belt size stays an upgrade; a run has more than one catch event, scaling with run time.
- A5: strong Stage 1s that never evolve (Snorlax, Lapras, UBs, Paradoxes) are catchable, gated by the catch equation (the 4 star band).
- A10: the permanent candy level is an evolution meter only, no stats.
- N1: the agent's nature buckets stand for now. Speed natures being the hardest to catch is intended (natures move speed via G.Stats.speedToPx, a big early edge).
- N3: the event toast names the nature ("A Timid Dratini needs help!").
- Cadence: every minute the game rolls for a rescue event; each failed roll adds a little to the next.
- EV1: 4% base chance per minute roll, +4% per failed roll, reset after an event (about 1.38 per 10 minutes).
- EV2: the roll keeps going during gyms, elites and other events; a missed rescue is gone.
- EV6: a rescue stays up 60 s.
- EV3: both the rescue event and the Lost Pokemon event recruit Pokemon (Lost Pokemon gains a recruit payout).
- L1: delivering a Lost Pokemon gives a chance to recruit (already built as a 1 in 5 grant in events.js).
- L2: the Lost Pokemon pool is Stage 1 species that have an evolution, from any region (not filtered by the run's region, on purpose).
- EV5: rescue events keep firing when the belt is empty.
- A4: babies count as Stage 1 (Pichu recruitable, Pikachu only by evolving). Sets both the rescue and the Lost pools.
- L1b: the Lost recruit chance is 20% times a star multiplier.
- L1c: Lost recruit chance 20% / 12% / 6% for 1 / 2 / 3 star.
- EV5b: winning a rescue with an empty belt gives the UberElite's drops only.
- A6 direction: every evolution keeps its mainline requirement on top of candy. Stones drop from gyms; friendship = time on the roster in a run; trade has no answer yet (multiplayer is deferred).
- T1 (revised same day): trade evolutions work two ways: a Link Cable (one-time-use item bought in the main menu Shop) or a real trade once multiplayer exists.
- T6: evolution happens in the Team Menu.
- T4: in-run requirements are a true/false flag on the copy; the main menu shows a "ready to evolve" popup.
- T2: time of day comes from a new day/night cycle on run time, each run starting at a random point; the day/night flag needs the mon to be the active Pokemon. Day/night is parked for its own design.
- LC1: trade evolutions that need a held item need the Link Cable and the held item.
- T3b: the 8 moves that move-gated evolutions need and the game lacks (Mimic, Double Hit, Rollout, Taunt, Barb Barrage, Twin Beam, Hyper Drill, Dragon Cheer) get added. That is a move import with its own build plan.
- T5: friendship is minutes on the roster within one run.
- T5b: friendship minutes are set per species (values deferred).
- T5c: being one of the team members for the run counts (not active-only).
- EI: evolution stones drop from gyms; trade held items are bought in the Shop.
- T3: "knows a move" means the move is in that copy's run moveset (an in-run flag).
- LC2: Karrablast evolves to Escavalier with the Link Cable alone; Accelgor waits until Shelmet is in the game.
- T7: the agent's one-off proposals for Shedinja, Kingambit, Alcremie and Gholdengo are accepted, with four rule details open (R1 to R4 in the map; R3: the Kingambit rule cannot happen as written because elites never repeat a species in a run).
Still open: R1 to R4, T5b values, EI2 (Metal Coat and Razor Claw already exist as items), LC3, LC4 (Shop tab, prices), the day/night design, L3, the hover filter, EV4, N2 (flee values), the odds ceiling, A1, A3, A7 to A9, A13 to A15, B5, C2 (banked tickets in saves), ball tier unlocks, the UberElite time limit. Not built. The region type maps are parked and feed tier 1 later.

Canonical: docs/ASCII Concept Maps/Acquisition v1 - Catch, Candy, Legendaries.txt
