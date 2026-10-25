# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-25 evening (Claude Desktop, home).

## Where we are
- ON BRANCH feature-test/new-move-schema (test branch for the #2 implementation check). Slice 1 of 7 is DONE: groundwork only, no existing game file changed, nothing the game loads.
- PLAN DOC: docs/current feature planning/move-schema-slices.md (architecture, decisions, slice 1 results, slice 2 kickoff notes). Read it first for #2, then only the slice being worked.
- New files: js/data/move-attributes.js (grammar, G.MoveAttrs), js/data/moves-generated.js (generated, never hand-edit, G.MoveData, 63 moves), tools/export_moves.js (--check is a freshness guard), tools/validate_moves.js (self-test, 63/63 valid, --report writes the coverage report). tools/check.js runs both. NOT in dev.html or main.js NEED yet (slice 3).
- Single source: docs/move_rework_holding/move-conversions-described.json. Edit it, then run node tools/export_moves.js. `kind` is not a schema field (a derived legacy kind comes in slice 2, bridge only).
- Settled: eager resolve; pierce omitted = UNLIMITED (0 = one hit; Quick Attack keeps 0, Aerial Ace and Psychic omit it); spread stays in the data (executor ignores it at count 1); Spikes lasts until triggered; balanceClass stays. Full list: DECISIONS.md 2026-10-25.
- check.js: 17/18 harnesses. upgrade-slice2b-harness.js fails on a missing docs/move-catalogue-preview.json (deleted in 050437e, pre-existing; candidate for KNOWN_STALE).

## Next (in order)
1. Jess: commit + push (new files, edited docs, described.json, check.js). The untracked docs/pokemon things to add/ folder is not part of this work.
2. NEW CHAT: slice 2 (resolver as a pure fold + handler skeleton + parity report). Kickoff notes are at the end of the plan doc.
3. Slice 3: dev.html?newmoves flag (wire dev.html and the NEED array then). Slices 1 to 3 change no gameplay.
4. Later: #11 wire lean learnsets (decide the form->base-species fallback, tie to #9). RESUME gyms (#5).

## Board note
- Treat #2 as OPEN (API showed closed, Jess reopened it). #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
