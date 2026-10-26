# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-26 morning (Claude Desktop, home).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slice 1 of 7 DONE. Slice 2 PLAN APPROVED, not built. Slices 1 and 2 change no gameplay.
- WORKFLOW (new, per slice): a planning chat writes slice-n.md (plan) and slice-n-codehandoff.md (what a coding chat needs), then a separate CODING chat builds from those files only. Docs: docs/current feature planning/move-schema/ (slice-overview.md first, then only the slice files being worked).
- Slice 2 decisions: NO damage normalization (no E, cone cap, dmg split or per-hit floor); a damage simulator script later decides whether it is needed. flavor_text passes through, accuracy stays a raw fact. Timing line (1000 synthetic moves) wanted. No legacy bridge.
- Slice 2 builds (nothing the game loads): js/data/move-overrides.js, move-handler.js, move-resolver.js, tools/move_parity.js (report + timing line, run by check.js) and a small self-test. Detail: slice-2-codehandoff.md.
- Formula: cd = 0.5 x (35 / PP) for damaging moves (hand cd kept for fire-spin, leaf-storm, gust, flame-wheel and status moves). Power passes through as is.
- Done: upgrade-slice2b-harness.js added to KNOWN_STALE in tools/check.js (17/17 harnesses).

## Next (in order)
1. Jess: commit + push (tools/check.js, STATE.md, DEVLOG.md, slice-2.md, slice-2-codehandoff.md, slice-overview.md).
2. Start a NEW coding chat for slice 2 (prompt is at the end of the handoff). Nothing is left to confirm; it can start building.
3. Jess may try a local LLM (gemma4:12b) on one coding task, suggested: tools/move_parity.js.
4. Slice 3 is a re-plan (new combat path from the ground up), in a new planning chat. Later: damage simulator script (move, upgrades, enemy type and level to damage and enemy HP drop; decides whether normalization is needed), #11 wire lean learnsets, RESUME gyms (#5).

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
