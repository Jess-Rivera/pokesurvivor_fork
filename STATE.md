# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-24 evening (Quick, work machine).

## Where we are
- ON BRANCH feature/all-moves-import (gym progression PAUSED). NO game code touched; check.js not run (tool/data only, nothing in js/ changed).
- TWO things in flight this session, both done: (1) the 64-move feel pass (still complete, move-conversions-described.json, 63/64 reviewed, bubble parked). (2) NEW: the learnset extractor for #11.

## Learnset extractor (#11 groundwork, DONE this session)
- docs/move_rework_holding/build_learnset_dataset.py (free-edit tool): third sibling of build_dataset.py (moves) + build_pokemon_dataset.py (species). Same helpers/conventions. Pulls per-pokemon learnsets from pokeapi-master/data/v2/csv.
- Decisions: per pokemon_id (all forms, each carries species_id); LATEST version group per pokemon; ALL methods grouped. --output-dir defaults to the script's folder so a bare run stages into move_rework_holding (not the CSV tree).
- Outputs (staged, ran clean: 1303 learnsets, 75243 entries, 0 warnings):
  - api_learnset_dataset.json (40.07 MB, full fidelity, verbatim source rows).
  - api_learnset_dataset.lean.json (0.76 MB, --lean on by default): pokemon-centric, ids-only, compact. move = [move_id, level] per method; `moves` legend maps id->identifier. SAME 75243 facts (round-trip verified).
  - learnset_validation_report.json.
- Orientation checked: move->pokemon does NOT shrink it (46 MB, bigger). Size is fidelity/formatting, not orientation. Kept pokemon-centric (matches #11).
- KNOWN GAP (design call, not built): form rows (e.g. venusaur-mega) get only their own pokemon_moves (often just `train`/empty). Likely want form->base-species fallback. Tie to #9.

## Next (in order)
1. Jess: COMMIT + PUSH this session. Commands in chat. DECIDE: commit the 40 MB full JSON, or gitignore it and keep only the lean + generator (the full file regenerates in ~5 s).
2. #2 IMPORTER: resolver + 4 data layers + 64-move harness. described.json = authored intent. Resolver handlers: chainDamageFalloff, berrySteal, fixedDamage, levelDamage, statusBonus, setWeather, mine contact-trigger, Ice Beam slow.
3. #11 learnsets: wire the lean dataset into the game (enemy/player "real moves"); decide the form fallback above.
4. RESUME gyms (#5).

## Board note (reconcile on the PokeSwarm board)
- GitHub API returned #2 CLOSED (completed, blocking #3/#4/#11), but Jess reopened #2 ~6h ago (API cached/stale). Treat #2 as OPEN. #4 closing as "not relevant" (its 3 feel-calls decided inside #3). #3 effectively done (described.json complete); closes once #2 consumes it. #11 now has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git is OK; never run `gh` or any git that changes the repo (add/commit/push/pull etc.); `git fetch` is OK: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
