# 2026-11-14, Bait parked in code: the goal choice skips it until #60 rules (Jess)

The 2026-11-09 parking (decision 2026-11-09-59-reflex-weighs-the-plan-bait-parked) blocked the 16e Bait check but left Bait
a live goal. 39a's profile (16f) measured it: Bait ran 97 to 98% of the time for every leader, since any hit landing while
your best revealed move cools reaches it, and its base value 0.14 tops every goal. Now the choice skips parked goals
(G.LeaderPlanner PARKED_GOALS: Bait). The search still plans Bait, so its mechanics stay tested (16d); a Bait goal weight
still validates. It returns when #60 rules on what makes its window real.

Canonical: docs/LEADER-AI.md "The Decider (#49)" GOALS; #60.
