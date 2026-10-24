# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-24 morning (Quick, work machine).

## Where we are
- ON BRANCH feature/all-moves-import (gym progression PAUSED). NO game code touched this session (and none the prior session). check.js not run (nothing in js/ changed).
- NEW THIS SESSION, the project now has a real tracker: GitHub Issues + a Project board named "PokeSwarm" replace the Slack Kanban. The assistant now acts as Jess's PM (this was a founding ask that had been lost; it is written into CLAUDE.md now so it survives tool switches). Playtesters file via issue templates. Full detail: CLAUDE.md "Project management and issue tracking"; playtester guide: CONTRIBUTING.md.
- PokeSwarm = one board, six-column Status (Triage, Accepted, In Progress, Blocked, Needs Playtest, Shipped), two filtered views (Bugs = label:bug, Roadmap = label:feature). 15 labels. 12 issues live (#1 gym sprite fix filed by hand; 11 seeded from TODO.md via tools/seed_issues.sh), all in Triage. TODO.md is being migrated to Issues: the BOARD wins for "what's next".
- MOVE IMPORT is still the active engineering thread. Jess hand-built pokeapi-master/data/v2/csv/api_dataset.json (937 moves, denormalized PokeAPI dump) = the move-data-raw source for the importer. The schema (docs/MOVE-AXIS-SCHEMA.md) and per-move decisions (docs/move-decisions.json, edited via docs/move-decisions-dashboard.html) are built; ~15 approved / ~30 changed / ~19 pending of 64.

## Next (in order)
1. Jess: commit + push this session. Two groups: (a) DEVLOG.md + docs/MOVES-IMPORT-PLAN.md (api_dataset.json logged/wired in); (b) CONTRIBUTING.md + CLAUDE.md + CONTEXT.md + tools/seed_issues.sh + .github/ISSUE_TEMPLATE/config.yml (tracker workflow). Issue templates were already committed to main earlier.
2. Triage the board: everything is in Triage but labels already carry state. Drag the `blocked` issues (arena flow slice B, regional forms, type chart, learnsets) to Blocked; the `ready` ones to Accepted. Optional: create the `needs-playtest` label if not done.
3. Resume the MOVE IMPORT thread: finish reviewing the 19 PENDING moves in the local dashboard (filter to "changed" -> Approve-all is safe; do NOT blanket-approve the pending ones). Settle open feel-calls: Flamethrower normalize true(90)/false(270), Night Shade single vs AoE, Psycho Cut crit (or none per D4 lean).
4. THEN the importer slice (code, prose-plan-then-approve): resolver (null-guard: 110/937 null meta, 1 no flavor_text, stat_chance 0 = guaranteed on status moves, ~13 out-of-model ailments) + four files + a 64-move CONVERSION HARNESS proving the current 64 resolve unchanged (go/no-go gate). Then one caster-agnostic executor; behavior-by-kind; learnsets; RESUME gyms.

## Open schema questions
- UNLIMITED hitCap as 0 or a named constant (lean: named constant). splash riders vs damage-only (lean: damage-only).

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js + Markdown docs free-edit. Never run git OR gh to mutate the tracker (draft commands, Jess runs them). New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
GitHub: the PokeSwarm board + Issues (the live backlog). docs/MOVE-AXIS-SCHEMA.md, docs/move-decisions.json, docs/move-decisions-dashboard.html, docs/MOVES-IMPORT-PLAN.md. DECISIONS.md, BALANCE.md, TODO.md. CONTRIBUTING.md (playtesters). Fast check: node tools/check.js.
