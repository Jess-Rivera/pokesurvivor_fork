# Slice 1: data and grammar (DONE 2026-10-25)

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This is the record of an executed slice. Its decisions are absorbed into docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). Where this text and those documents differ, those documents win. Body below unchanged.

Back to slice-overview.md.

## Gate (met)
All 63 moves validate (unknown operations, bad references, cycles and grow without an end condition rejected; the string UNLIMITED maps to the named constant). The coverage report buckets every move by geometry, motion, anchor, targeting and payload. tools/check.js runs the export freshness check and the validator.

## Built
js/data/move-attributes.js (grammar), js/data/moves-generated.js (generated), tools/export_moves.js (--check is a freshness guard), tools/validate_moves.js (self-test 21/21, validation, --report), docs/current feature planning/move-coverage-report.md (generated). Nothing is in dev.html or the main.js NEED array.

## Settled in the slice 1 chat
- Resolver timing: EAGER at load. Reason: gyms.js validates every gym move through Moves.BY_ID at boot and other readers use BY_ID as a plain property. Revisit with a measured 1000-move synthetic run in check.js. Real scaling cost is shipped data size, so the export drops defaults once the list grows (shortcut: export keeps defaults at 63 moves).
- Source of truth: move-conversions-described.json only. move-conversions-final.json never existed in git history.
- Grammar lives in move-attributes.js. The presets file (move-classification.js) is deferred; all 63 moves spell out their geometry and none needs a preset.
- `kind` is NOT a schema field and is dropped from the export, inline emit moves included.
- Grammar additions: grow.max and grow.per, stat chance/duration/maxStacks, casterState as the container for iframes and delay. `hitCap` removed. Applied to docs/MOVE-AXIS-SCHEMA.md.
- Pierce default is UNLIMITED when omitted; pierce 0 is one hit, pierce n passes through n enemies. Quick Attack keeps 0; Aerial Ace and Psychic omit it. Flag for slice 5: a pierce upgrade is meaningless on an unlimited move.
- Spikes lasts until triggered (a timeout is optional, the grammar only requires some endOn). Spread stays in the data (the executor ignores it at count 1). balanceClass stays in the export. `trigger` keeps one legal value set per location. Heal amounts accept both shapes.
- Source fix in described.json: metal-claw team buff is now side self like Swords Dance, Agility, Harden.
- check.js ran 17/18 harnesses; upgrade-slice2b-harness.js fails on a missing docs/move-catalogue-preview.json (deleted in 050437e), a candidate for KNOWN_STALE.
- Gyms share move definitions (gym.js and gyms.js use Moves.BY_ID, instance and addStack; enemy.js boss casts read kind, cd, cat, radius and arc). This matters for slice 7.
