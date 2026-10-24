# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-24 midday (Quick, work machine).

## Where we are
- ON BRANCH feature/all-moves-import (gym progression PAUSED). NO game code touched; check.js not run (nothing in js/ changed). All work was docs + a build tool + a viewer.
- MOVE-AXIS-SCHEMA is FINALIZED and canonical at docs/MOVE-AXIS-SCHEMA.md. The old REVISED copy and stale pre-today move-import files were cleaned out; anything move-related Jess kept now lives in docs/move_rework_holding/ (api_move_dataset.json = the 937-move source, two xlsx, json-table-viewer.html, new pokemon-viewer.html).
- NEW: a Pokemon SPECIES dataset builder, pokeapi-master/data/v2/csv/build_pokemon_dataset.py (sibling of build_dataset.py). NOT RUN YET. Outputs api_pokemon_dataset.json + pokemon_validation_report.json into that csv folder.

## Schema decisions settled this session (still need recording in DECISIONS.md)
- SPLASH: carries riders at HALF chance (supersedes the damage-only lean). {radius, falloff, trigger}, default trigger enemyHit, never consumes pierce/hitCap, falloff linear center-to-edge. Non-chance riders (stat/knockback) at half magnitude.
- UNLIMITED pierce/hitCap = named constant, never overload 0.
- grow expands ONE grow.dim (default radRadius); rate via grow.per (time=px/s default, distance=px per px travelled).
- hitPolicy = three values: oncePerInstance (default), interval (needs rehit), onReentry.
- Folded back in: grow.per, iframes (travel+N swept / flat teleport), commitment.cooldown freeze vs freeze(ids).
- PARKED: Size-card-on-pierce-0 edge clip (feel-test); growing-ring collision tolerance (collision code).

## Pokemon dataset spec (frozen, for build_pokemon_dataset.py)
API data ONLY (no sprites, no game fields). One entry per SPECIES off the default pokemon row; functional forms (non-default rows differing in stats/types/abilities) nested in forms[]; cosmetic dropped. resolved_source = current values only (no _past). All generations. National dex called out, all regional dex numbers included. Evolution per-node. Flavor text = highest version_id. Learnsets EXCLUDED (own dataset, #11). Mirrors build_dataset.py + a validation report.

## Next (in order)
1. Jess: COMMIT + PUSH this session (assistant's commands below). Then RUN build_pokemon_dataset.py, sanity-check pokemon_validation_report.json (expect ~1025 species, forms nested, ~0 warnings; spot-check Charizard forms + Pikachu). Drop the JSON onto pokemon-viewer.html.
2. Record the schema decisions above in DECISIONS.md (note they supersede old KG/doc leans). Board still all-in-Triage; drag ready->Accepted, blocked->Blocked when convenient.
3. Resume MOVE IMPORT (board #2, blocked by #3 + #4): settle feel-calls (#4), finish ~19 pending moves (#3), THEN importer slice + 64-move conversion harness (go/no-go gate). Then learnsets (#11), RESUME gyms (#5).

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js + Markdown docs free-edit. Never run git OR gh (draft commands, Jess runs them). New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
PokeSwarm board + Issues (live backlog, 10 open). docs/MOVE-AXIS-SCHEMA.md. docs/move_rework_holding/. pokeapi-master/data/v2/csv/ (both builders). docs/MOVES-IMPORT-PLAN.md, move-decisions.json/-dashboard.html. DECISIONS.md, BALANCE.md. Fast check: node tools/check.js.
