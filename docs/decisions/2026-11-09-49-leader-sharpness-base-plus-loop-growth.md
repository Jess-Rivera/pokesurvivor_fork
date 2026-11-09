## 2026-11-09, #49: misjudgment, and leader sharpness grows with the loop (Jess)
New setting `misjudge`: seeded noise on each candidate plan's cost, drawn once per plan per think tick. The leader thinks a bad plan is good, unlike `randomness`, which picks a worse goal on purpose.
Sharpness settings take a per-leader base plus a per-loop growth (12 leaders, 6 loops: 24 values per setting), so loop 6 Brock can out-think loop 1 Lance. `misjudge` is approved; the same shape for `memoryUse`, `reflex` and `dodgeRead` is proposed (Jess: "likely"). Style settings (goal weights, cost multipliers, `range`, `swapWill`, `risk`) stay flat per leader. Run memory (learning you during a run) is separate and stays.
Cast timing is fixed while a slot is active; your counter-play is cycling slots, swapping and moving.
Canonical: docs/LEADER-AI.md (the settings list and the DECIDER section, written when the #49 session closes)
