# STATE, current handoff (read this right after CONTEXT.md)

Keep this file under 3 KB. Rewrite it at the end of every session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-20 (Claude Desktop, evening).

## Where we are
- Status slices A to E are built and closed (offline harnesses pass; Jess feel-tests each change). Boss rework: Overworld Elites and the Brock pilot gym are merged.
- Tileset: atlases for Shady Forest, Crystal Cave and Ash Volcano are baked but nothing in js/ loads them yet.
- Item rework (feature/items): DESIGN AGREED, nothing built. Three tiers: ground items (auto-activate on contact), Pokemon items (one per Pokemon, active only while it is on the field), run items (very rare, 2x2 inventory grid starting at 1 slot). Rulings: DECISIONS 2026-10-20 Item rework.
- Repo hygiene pass done 2026-10-20: DECISIONS, DEVLOG, TODO rotated to docs/*-archive.md, this file added.
- Git state is unknown to the assistant. Jess should commit (tileset files, slice E, these docs) and cut feature/items from main.

## Next (in order)
1. Item framework slice F1: data-driven item hooks, per-holder state, run tier, ground tier, port the 11 items (9 to Pokemon tier, Lucky Egg and Amulet Coin to run tier). Then F2 team sheet reassignment plus HUD, F3 ground-item content, PokeAPI import via a rules table, Inventory screen and gacha.
2. Boss damage slice (bosses still use flat def.dmg) and Gym 2 (Misty and Staryu).
3. Tileset integration (loader, generator cleanup, hedge occluder).

## Open questions for Jess (F1)
- Stat items: separate multiplier (keeps today's port identical; assistant's lean) or fed into the additive increase pool?
- Placeholder chance of a run item from a gym leader instead of the Pokemon item (assistant proposed 10%).
- OK to add a tsconfig with checkJs and a tsc --noEmit check (config change)?
- Run item details still open: Stone versus immunity and the soft type chart, Sharp Scissors curve and cap, Round Glasses repeat-chain reading.

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
