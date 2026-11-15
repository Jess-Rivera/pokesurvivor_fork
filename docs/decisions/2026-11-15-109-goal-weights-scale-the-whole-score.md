# 2026-11-15, #109: goal weights scale the whole score, not just the value (Jess)

Finish won on cost once hits were sized right, so a goal weight (on the value only, about 0.1 to 0.7) could not move it
(Brock Finish 81% even at Finish value x0). Ruling (option 1 of three; per-leader cost profiles and a base value retune
rejected): a plan's net is value minus cost, and its score is net x the goal's utility when the net is above 0, else the
net alone, so a liked goal is never pushed down when its best plan is bad. A goal of utility 0 is never ranked (it was
"worth nothing", which could still win when every other goal netted below 0). Confidence stays inside utility, so it now
scales cost too. The #59 reflex reads a plan's worth by the same rule. Brock's Finish weight is set after a replay of
fresh natural-gate traces (tools/replay-leader-trace.js), not in this ruling.
Plan: docs/ASCII Concept Maps/109 - Weights Scale The Whole Score Plan.md.

Canonical: docs/LEADER-AI.md "GOAL VALUE AND SCORE" and "CHOICE"; #109.
