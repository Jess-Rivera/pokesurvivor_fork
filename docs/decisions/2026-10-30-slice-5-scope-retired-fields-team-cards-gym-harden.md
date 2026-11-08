## 2026-10-30, Slice 5 scope: retired fields, team cards, gym Harden (Jess)
The retired stat fields (`maxStacks`, `duration`) are removed from the new-path data, resolver defaults and overrides once the tracker harness passes; the validator then rejects them. The Gate and Duration cards are built in the team-wide upgrades branch, not slice 5. Gym Harden moves onto the model in slice 7a. SLOW and HASTE (carrier statuses) stay outside the model on their CARRIER timers; slice 7b keeps a fixed-timer stage application for them.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "Retired stat fields"; docs/COMBAT-RULES.md, "Stat stages" SS10 and SS13; move-schema-post-auth/slice-5.md and slice-7a.md, carrier statuses; slice-7b.md
Superseded in part 2026-10-30: the team cards are built in slice 5b (entry above).

