# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-22 night (Claude Desktop, home).

## Where we are
- GYM PROGRESSION IS PAUSED. Jess is switching to a new branch, feature/all-moves-import (plan: docs/MOVES-IMPORT-PLAN.md). Reason: gyms 2 to 8 and the Elite Four need moves the catalog lacks (64 imported, 833 classified in docs/move-import-review-v2.json), and there is no learnset data.
- Branch rework/gym-progression holds everything built so far. Jess commits (the assistant never runs git). Pending docs from tonight: GYM-ROSTERS, STATE, TODO, DEVLOG, MOVES-IMPORT-PLAN.
- node tools/check.js: 89 files OK, 18/18 harnesses pass (2026-10-22). Not run in a browser.
- Roster DESIGN done: docs/GYM-ROSTERS.md has all 8 Kanto gyms and the Elite Four locked. Slice A built (data model, SimBus). Only Brock is authored in js/data/gyms.js.

## Next (in order)
1. Jess: commit, branch to feature/all-moves-import.
2. Answer the three open decisions in docs/MOVES-IMPORT-PLAN.md (import all 833 as unbuilt? low-confidence handling? learnset cap).
3. Importer slice (data only), then behavior by kind, then learnsets.
4. RESUME gym-progression after that: author gyms 2 to 8 and E4, then slice B (all-at-once arena flow), gym-sprite display fix, escalation clock harness, regional forms (Alolan Sandslash, Marowak, Golem line), E4 trigger flow and hard-set levels.

## Architecture direction: sim/present boundary
G.SimBus exists. Convert sim calls to FX/Audio/Spawner into events as you touch them; log in docs/SIM-PRESENT-BOUNDARY.md. New pure data functions: no clock, no randomness.

## Open questions for Jess
- Moves import decisions above. Escalation uncapped or capped? Gate gauge ring or bar?
- Berry bag slots buyable under Team Upgrades? Run-item acquisition?

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js and Markdown docs are free-edit. Never run git. New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
DECISIONS.md, DEVLOG.md, BALANCE.md, TODO.md, BOSS-REWORK.md, docs/. Archives: docs/*-archive.md. Fast check: node tools/check.js.
