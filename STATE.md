# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-25 evening (Claude Desktop, home).

## Where we are
- ON BRANCH feature-test/new-move-schema (test branch for the #2 implementation check). Slice 1 of 7 DONE (groundwork, nothing the game loads). Slice 2 is PLANNED, not built. Slices 1 and 2 change no gameplay.
- PLAN DOCS: docs/current feature planning/move-schema/slice-overview.md (branch summary, one entry per slice), then ONLY the slice-n.md being worked. slice-2.md is next. The old move-schema-slices.md is a pointer stub.
- DECIDED this session: NO legacy bridge (no derived `kind`, no flat projection in old field names); combat.js will be mostly rewritten later, guided by docs/current feature planning/move-coverage-report.md. New files planned for slice 2: js/data/move-overrides.js (per-move overrides only), js/data/move-handler.js (specials, each with a trigger and optional condition), js/data/move-resolver.js (eager; defaults, derived values, overrides, handlers).
- Formulas: cd = 0.5 x (35 / PP) for damaging moves (4 orbit/trail moves keep hand cd, seed overrides: fire-spin, leaf-storm, gust, flame-wheel). dmg = Power / E (resolver normalizes; e.g. 7 pellets, 42 power gives dmg 6). Legacy dmg equals Power for all 51 damaging moves.
- check.js: 17/18 harnesses. upgrade-slice2b-harness.js fails on a missing docs/move-catalogue-preview.json (deleted in 050437e, pre-existing; candidate for KNOWN_STALE).

## Next (in order)
1. Jess: commit + push (STATE.md, DEVLOG.md, DECISIONS.md, the move-schema/ folder, the edited move-schema-slices.md stub). The untracked docs/ASCII Concept Maps file is not part of this work.
2. Jess answers the 3 open decisions in slice-2.md: (a) E rules (every pellet counts, or keep the legacy cone min(pellets, 3)?), (b) keep the per-hit floor 1 / max(1, E)?, (c) pass API flavor_text through and leave hand desc to the UI slice? Also: want the 1000-move synthetic timing line in check.js (report only)?
3. Then build slice 2 (resolver, overrides, handler skeleton, numeric parity report vs legacy moves.js).
4. Slice 3 is a re-plan (new combat path from the ground up). Later: #11 wire lean learnsets, RESUME gyms (#5).

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
