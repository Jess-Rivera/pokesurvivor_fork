# Reference integrity (Phase 2)

Automated checks run read-only from the repository root with Python and git. Phase 1 grouped 59 reference strings; every probable target it named (25) was re-checked and exists. Documents are cited by repository-relative path.

## Method and results

- Inline markdown links: 9 found in inventoried .md files; 1 broken: README.md:90 -> docs/PUBLICAR.md (CONFIRMED; see F-018).
- Phase 1 probable targets: 25 of 25 exist, so the stale-path groups are confirmed reference defects with a known replacement.
- Inventory paths: all 103 exist on disk.
- Orphan check by basename across all tracked text files (excluding pokeapi-master): of 24 documents Phase 1 called unreferenced, 22 are confirmed unreferenced; 2 are false positives (.github/ISSUE_TEMPLATE/config.yml cited in docs/DEVLOG-archive.md; opencode.json cited in STATE.md). docs/issues-snapshot.md is cited by STATE.md only as a glob (`docs/issues-snapshot.*`).
- Git history for the 'removed-or-never-committed' names: docs/move-catalogue-preview.json, docs/move-decisions-dashboard.html and docs/move-decisions.json each have 2 commits in history (CONFIRMED removed; DECISIONS 2026-10-24 says the old move-decisions files are GONE); design/shady-forest-tileset-spec.md, docs/proposals/_tmp_gym_h2.js and js/data/move-classification.js have no history (SUSPECTED never committed or renamed).

## Reference groups by category (59 groups)

| Category | Groups | Verdict | Example |
|---|---|---|---|
| shorthand-js-relative-or-diff-prefix | 10 | NOT a defect (shorthand; basenames exist) | `combat.js/player.js/stats.js` |
| stale-path-planning-prefix | 8 | CONFIRMED defect (target exists at the probable path) | `planning/combat-architecture.md` |
| removed-or-never-committed | 7 | MIXED, see below | `design/shady-forest-tileset-spec.md` |
| upstream-pipeline-removed-or-parked | 7 | CONFIRMED missing target (parked or removed by DECISIONS; see F-019) | `DOMINIO.md` |
| command-string-not-a-path | 6 | NOT a defect (command strings) | `node tools/build.js` |
| generated-or-gitignored-output | 6 | NOT a defect in itself (gitignored build outputs); instructions that depend on them are F-017 | `app.min.js` |
| declared-gone | 3 | CONFIRMED obsolete reference (a document declares the target gone) | `IMPORT-PLAN.md` |
| probable-rename | 3 | SUSPECTED (rename undocumented; replacement exists) | `AXIS-SCHEMA.md` |
| stale-path-moved | 3 | CONFIRMED defect (target exists at the probable path) | `docs/move_kind_rules.xlsx` |
| planned-port-target | 2 | NOT a defect (planned file) | `gamepad.js` |
| third-party-tool-output-missing | 2 | SUSPECTED low (third-party tool output) | `PONYTAIL-DEBT.md` |
| outside-repo | 1 | NOT a defect | `~/.config/ponytail/config.json` |
| planned-future-artifact | 1 | NOT a defect (planned output) | `docs/move_rework_holding/move-intent-scenarios.json` |

## Confirmed defects worth fixing (all low behavioral impact)

- References using the old folder prefix `planning/...` (8 groups) should point to `docs/current feature planning/...`.
- docs/move_rework_holding/move-consistency-review.md (cited as a path) now lives at docs/current feature planning/move-consistency-review.md; docs/move_kind_rules.xlsx moved to docs/move_rework_holding/; js/world/rift.js is js/systems/rift.js.
- README.md:90 -> docs/PUBLICAR.md (missing; also contradicts DECISIONS.md, F-018).
- ONBOARDING.md and docs/ORIGINAL-OWNER-RULES.md name tools/make_seo_pages.py, deleted 2026-10-20 (F-019).
- CLAUDE.md:34 and CONTEXT.md:41 skip-list name `delete/`, real folder is `_delete_/` (F-022).
- docs/ORIGINAL-OWNER-RULES.md:7 and :27 cite a 'Part 1' that does not exist (F-014).
- DECISIONS.md:138 lists an 'ISSUES' doc that does not exist (F-014).
- BOSS-REWORK.md section 1 cites 'DECISIONS 2026-10-19 boss rework'; that entry exists only in docs/DECISIONS-archive.md:503 (F-003).

## Orphaned and weakly referenced documents

Phase 1 listed 45: 24 with no inbound reference, 19 referenced only from archives or logs, 2 root-level files not referenced by CONTEXT, CLAUDE or STATE (CREDITS.md, LICENSE-NONCOMMERCIAL.md). Most are inert (licences, issue templates, third-party skills, snapshots, historical proposals) and are not defects. Items that need an owner view: FEATURES_GRAB.md (root-level backlog document), the six ponytail/skills SKILL.md files (third-party tooling with no reference), the four ASCII concept maps, and the 11 proposal records under docs/proposals/ referenced only from archives (see F-011, F-024).

## Suspected only (not confirmed)

- AXIS-SCHEMA.md, REWORK.md and TIME-DESIGN.md as shorthand or renamed names for existing documents.
- The three never-in-history names above.
- Ponytail skill references to files its own tooling would create.