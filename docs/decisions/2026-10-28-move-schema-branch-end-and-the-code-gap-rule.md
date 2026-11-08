## 2026-10-28, Move-schema branch end and the code-gap rule (Jess)
feature-test/new-move-schema merges into main after slice 7b, once all 63 moves run on the new path and the legacy player-move path is deleted. A new branch then imports the gym-roster moves; until then the gym is Brock only. A STATE.md code-gap item is built in this branch only if it is tied to the move-schema work; otherwise it waits for its own branch.
Canonical: docs/current feature planning/move-schema-post-auth/slice-overview.md, "Goal and end of the branch" and "Code-gap rule"

