## 2026-10-25, Move schema slice 1 (feature-test/new-move-schema) [Jess decided]
move-conversions-described.json is the single source of move facts and moves-generated.js is generated from it. `kind` is no longer a schema field. Pierce omitted means unlimited and 0 means dies on first hit. The resolver runs eagerly at load, and schema additions cover grow, stat chance, duration, maxStacks and casterState.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "Top-level move fields"

