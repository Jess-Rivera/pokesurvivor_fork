# MOVE-INTENT, per-move rulings

- **Role:** The single home for rulings about specific moves (QA-04). Skeleton only: rulings arrive in Phase 4 batch B4.
- **Owns:** Per-move intended behavior, keyed by move id, for moves that need specific disambiguation. Moves with no entry here are defined solely by the move data file.
- **Does not own:** General combat rules (docs/COMBAT-RULES.md); move data grammar (docs/MOVE-AXIS-SCHEMA.md); runtime pipeline rules (docs/current feature planning/combat-architecture.md); validation scenarios (docs/current feature planning/combat-validation-and-handoff.md).
- **Status home:** docs/current feature planning/move-schema/slice-overview.md.
- **Last reconciled:** not yet

Precedence: a ruling here beats docs/COMBAT-RULES.md and grammar defaults for the named move, but cannot require anything the grammar cannot express. If a ruling needs something the grammar cannot express, it is recorded as an [Open] grammar gap.

Name collision: the planned file move-intent-scenarios.json (combat-validation-and-handoff.md section 1.4) is a different file. It holds validation scenarios, not rulings.

Tags are defined in CLAUDE.md: [Approved], [Legacy behavior], [Proposed], [Open].

## Per-move rulings
