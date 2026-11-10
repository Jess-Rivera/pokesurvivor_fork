## 2026-11-09, #52 build: a swap's matchup over the long window, the duels' shape, planner cost (Jess)
Three calls made during the #52 build, on gaps found in it:
1. A swap is also worth its matchup over the 10 s long window, as Buff is valued: the swap step takes (your shots' damage per second on the incoming mon minus on the outgoing one) x 10 s and deals (the incoming mon's best hit per second on you minus the outgoing one's) x 10 s, signed. Why: a plan of 4 actions at range sees no trade, so the matchup swap never won (vs Bulbasaur's Vine Whip, Staryu takes 0.048 a second, Seel 0.037: 0.10 over 10 s against the 0.03 swap cost).
2. Duels, option (a): Bait counts a wait for your move as its draw when Brock already stands in your reach; the counter-play and learning duels run against Fire Blast (3.5 s), since Ember's 0.7 s leaves almost no cooldown to read.
3. Planner cost: about 3.4 ms a choice on average, 10.4 ms at worst (Misty close). Accepted; watched at the feel test.
4. Option 1 (after the build): Bait, counter-play and learning stay blocked on #59 (reflex dodges spend the charges a planned dodge needs; the hits Brock lands cannot depend on what you do while he fires whenever ready in your reach); #52 goes to the feel test without them.
Canonical: docs/LEADER-AI.md "The Decider (#49)", ACTIONS and TESTS
