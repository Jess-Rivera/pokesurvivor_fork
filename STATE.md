# STATE, current handoff (read this right after CONTEXT.md)

Keep this file under 3 KB. Rewrite it at the end of every session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-20 (Claude Desktop, night).

## Where we are
- Status slices A to E are built and closed. Boss rework: Overworld Elites and the Brock pilot gym are merged.
- Tileset: atlases for Shady Forest, Crystal Cave and Ash Volcano are baked but nothing in js/ loads them yet.
- Item rework (feature/items): F1 BUILT 2026-10-20 night (harness + headless test pass, Jess has NOT feel-tested yet). Pokemon tier per holder (held effects only while active), run tier shared by the team (1 slot, save.runSlots), 11 items ported (9 Pokemon, Lucky Egg and Amulet Coin run), all item text now English. Gym leader drops one guaranteed item, boss and gym have a placeholder run-item chance (5% / 10%). Rulings: DECISIONS 2026-10-20 (three entries).
- Not built yet: Stones (ignore resistance AND immunity), Sharp Scissors (speed x1.0 at full team HP to x2.0 at 1%, applied last), Round Glasses (crit over 100%, free re-cast after 0.2 s at -100 points). All rulings final.
- tsconfig.json (checkJs, noEmit) added, scope is js/data/items.js only (`tsc -p tsconfig.json`).
- Git state is unknown to the assistant. Jess commits (F1 files, tileset files, slice E, docs) on feature/items. _delete_/headless-stage.tgz is a scratch tarball from the headless test, safe to delete.

## Next (in order)
1. Feel-test F1 (dev.html?dev, one slot). Then F2: team sheet reassignment screen plus HUD polish. F3: ground-item content, PokeAPI import via a rules table, Inventory screen and gacha, run-item content (Stones, Sharp Scissors, Round Glasses).
2. Boss damage slice (bosses still use flat def.dmg) and Gym 2 (Misty and Staryu).
3. Tileset integration (loader, generator cleanup, hedge occluder).

## Open questions for Jess
- None blocking. Tune later: run-item drop chances, what a full run grid should compare against once there are 2+ slots.

## Standing rules (full text: CLAUDE.md)
- Local-first: no Firebase, TURN or multiplayer work until Jess switches phase.
- English-native: new strings in English; inherited Spanish literals are i18n keys, leave them.
- Workflow: prose plan, Jess OKs, then build straight into the repo (CLAUDE.md Edit boundary). changelog.js and the Markdown docs are free-edit.
- The assistant NEVER runs git. No em-dashes in prose. New save fields must be backward compatible.
- Test as a new player with one Pokemon slot. Debug on dev.html?dev, not index.html.

## Where to look (search, do not read whole)
- DECISIONS.md (rulings), DEVLOG.md (recent sessions), BALANCE.md (numbers), TODO.md (backlog), GDD.md, ONBOARDING.md, GLOSSARY.md, BOSS-REWORK.md.
- Archives: docs/DECISIONS-archive.md, docs/DEVLOG-archive.md, docs/TODO-archive.md, docs/MP-PARKED-NOTES.md, docs/ORIGINAL-OWNER-RULES.md.
- Check everything fast: node tools/check.js (syntax of every file, then every harness).
