# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-25 afternoon (Claude Desktop, home).

## Where we are
- ON BRANCH feature-test/new-move-schema (test branch for the #2 implementation check). PLANNING ONLY: nothing in js/ touched, check.js not run.
- PLAN DOC: docs/current feature planning/move-schema-slices.md (architecture, 7 slices with gates, decisions, open items). Read it first for #2, then only the slice being worked.
- Architecture (Jess): move-conversions-described.json (raw db, single file) -> export script -> generated js move data. New handler js (special handlers, new features) + resolver js (data + handler -> final defs). combat.js ends up thin: entity calls move, move does X to entity B, emit outcome. Bridge: resolver also emits a flat projection in old field names so upgrades/HUD keep working. dev.html?newmoves flag, legacy stays default until slice 7.
- Decided: cd and damage are derived (formulas in slice 2). Individual buffs = ACTIVE member only (slice 4). Emit handled in slice 4. Bubble is deprecated ("forgotten"), excluded from the schema pass; its legacy entry is still in moves.js until the purge.
- Learnset extractor (#11 groundwork) is done and committed (lean json + generator; the 40 MB full json is not committed).

## Next (in order)
1. Jess: commit the plan doc + STATE/DEVLOG on this test branch, push.
2. NEW CHAT: slice 1 deep dive (data + grammar + validator, no runtime change). Settle the open items in the plan doc: resolver timing (recommend lazy + memoized), where grammar/presets live, the missing move-conversions-final.json, whether gyms/enemies share move defs.
3. Then slices 2 and 3 (resolver + parity report, then the flag switch). Slices 1 to 3 change no gameplay.
4. Later: #11 wire lean learnsets (decide the form->base-species fallback, tie to #9). RESUME gyms (#5).

## Board note
- Treat #2 as OPEN (API showed closed, Jess reopened it). #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
