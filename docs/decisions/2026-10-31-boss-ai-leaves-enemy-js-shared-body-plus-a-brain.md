## 2026-10-31, Boss AI leaves enemy.js: shared body plus a brain (Jess)
Option B of three (A file move, B brain divorce, C separate Boss class). Every line of boss decision code moves to js/entities/boss-ai.js as a GymBrain attached by G.Boss.make (gyms only, entry above); the Enemy body (HP, hurt, die, status, stages, grid slot) stays shared so player moves and status rules have one copy. C rejected: it duplicates every combat rule (drift) and goes against the one-executor decision. Commit B of slice 7a-0, no behavior change.
Canonical: docs/ASCII Concept Maps/Slice 7a-0 - Gyms Only Plan.txt

