## 2026-11-13, #53: a trigger's set may not name intelligence, and a set reflex keeps the 0.1 s floor (Jess)
From the #53 plan check (T1, T2). T1: `intelligence` resolves once, at fight start, into the five settings it drives, so
a trigger that sets it would do nothing; the gyms.js validator refuses it (chosen over re-resolving the five when the
trigger fires: more code, nothing asks for it). T2: a trigger's `set` skipped the per-key limits, so a set reflex could
get under REFLEX_FLOOR_SECONDS (0.1 s); the validator now holds it to the floor, as it does an authored reflex. Neither
touches existing data (the only trigger set in gyms.js sets aggression). The other limits on a set, and a set dodgeRead or
predictCap doing nothing (their bags are built once), are #107.
Plan: docs/ASCII Concept Maps/53 - Plan Check.txt.
Canonical: docs/LEADER-AI.md TRIGGERS.
