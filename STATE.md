# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-26 (Claude Desktop, coding chat).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slices 1 and 2 of 7 BUILT. Both change no gameplay and nothing new is loaded by the game.
- WORKFLOW (per slice): a planning chat writes slice-n.md and slice-n-codehandoff.md, a separate CODING chat builds from those files only. Docs: docs/current feature planning/move-schema/ (slice-overview.md first, then only the slice files being worked).
- Slice 2 built: js/data/move-overrides.js (14 empty cd slots), move-handler.js (6 handler declarations), move-resolver.js (G.MoveResolver.resolve, G.MoveDefs), tools/move_parity.js (self-test 9/9, parity, timing; report in docs/current feature planning/move-parity-report.md), hooked into tools/check.js. check.js: 17/17 harnesses, export current, 63/63 valid, parity ok.
- Parity: power matches legacy for all 63. cd: 45 by formula; 5 intended differences (fire-spin, leaf-storm, flame-wheel, bug-buzz last while active so get no cd; gust is now a cast with a normal 0.5 cd); 14 unset (12 status moves plus Dragon Rage, Night Shade): empty entries in move-overrides.js, fill in `cd` to set. Details: slice-2.md.
- Formula: cd = ANCHOR_CD x (ANCHOR_PP / PP) ^ BETA (0.5, 35, 1; constants at the top of move-resolver.js, G.MoveResolver.TUNING), 3 decimals, for Power above 0. No damage normalization. No cd for moves that last while active (endOn notActive). Resolver skips turnRate, aimTrack, returnHits defaults; tools/validate_moves.js --resolved checks the output (63/63). Timing: 1000 synthetic moves resolve in about 16 ms.

## Next (in order)
1. Jess: set the 14 cds in move-overrides.js when decided (empty entries wait there), then mark the parity report (intended / regression).
2. Jess: commit + push (new files, tools/check.js, report, STATE.md, DEVLOG.md, slice docs).
3. Slice 3 is a re-plan (new combat path from the ground up), in a new planning chat. Later: damage simulator script (decides if normalization is needed), #11 wire lean learnsets, RESUME gyms (#5).
4. Jess may try a local LLM (gemma4:12b) on one coding task.

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
