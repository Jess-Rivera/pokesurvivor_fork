## 2026-11-05, Gym cards belong to the leader, per loop, pooled; self heals capped by loop (Jess)
A gym's `cards` are the leader's: keyed by loop, the cards gained that loop, the pool for loop N the running sum of 1 to N, held by every mon fielded. Authored schedule, not a mirror of the player's picks; counts are TUNE (Misty loop 1 is 13 stacks, a player holds about 60 upgrades by Brock loop 2). A leader mon may cast self heals (Recover) at most its loop number times per fight, with Recover at hpBelow 35% so the heal counts. Both are authored restrictions under the host model above.
Canonical: docs/BOSS-AUTHORING.md "Cards"; js/data/gyms.js, js/entities/boss-ai.js

