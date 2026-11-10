## 2026-11-09, #52 opening: stall guards stay gates, the planned dodge's cost, what a swap is worth (Jess)
Jess approved the #52 opening (goal, done-condition, test on the issue) and four calls:
1. `minField` and `swapLimit` stay hard gates on a voluntary swap (FAIRNESS STALL GUARDS wins over the ACTIONS line that called `minField` a cost term). A fairness limit, raised as a question per PRINCIPLE. `swapWill` is the swap's cost term.
2. Dodge your shot costs your hit x (1 - its expected success), the success read through `dodgeRead` and `reflex` (was [Proposed]).
3. A swap is worth what the plan's later steps gain with the incoming mon (its matchup, HP and moves read for danger and opportunity); the send-in i-frames and the swap lock count in its cost. The planner models being asleep or frozen (no hits dealt, danger kept), so the old cc and low-HP swap triggers come out of the scores, never as rules.
4. Planner cost guard: Swap only as a plan's first step; Draw your shot and Dodge your shot at most once per plan. If the choice still runs well past about 4.4 ms, flag it to Jess before cutting depth.
Plan calls approved with the build go-ahead:
5. (A) Damage taken that would bring the leader mon to 0 HP adds the KO bonus (0.3) to that step's damage taken, mirroring Finish, so a nearly fainted mon values swapping out or healing (the old low-HP trigger, as a score).
6. (B) The extra charge kept back is a soft cost: a dodge or dash that spends down to `dodgeReserve` costs your best hit x 0.5.
7. (C) The lead exploit's swap still skips `minField`, as before.
Canonical: docs/LEADER-AI.md "The Decider (#49)", ACTIONS; "Fairness", STALL GUARDS
