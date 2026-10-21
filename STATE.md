# STATE, current handoff (read this right after CONTEXT.md)

Keep this file under 3 KB. Rewrite it at the end of every session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-20 (Claude Desktop, late night).

## Where we are
- Status slices A to E closed. Boss rework: Elites and Brock pilot gym merged. Tileset atlases baked, nothing loads them yet.
- Item rework (feature/items): F1, F2 done and approved. F3a-1 (ground items, js/data/ground-items.js, pickup kind 'ground') and F3a-2 (status berries) BUILT and playtested 2026-10-20, approved.
- F3a-2: Cheri/Chesto/Pecha/Rawst/Aspear/Persim/Lum drop as ground pickups into a team-wide berry bag (1 slot, upgradeable via save.berrySlots, cap 4; HUD boxes above the team stack, bottom-left for one Pokemon). A berry auto-consumes to block its status (benched Pokemon too); Lum covers the six main statuses, used last. Full bag or duplicate: pickup stays on the ground. Hooks in status.js. Pause sheet shows a Berry bag block (one row per slot with description). G.Debug.ground('pokeball'|'masterball') drops the gacha tickets (both drawn 32 px in the world; Great Ball x1, Master Ball x10). Sheet berry icons use 'ps:' + icon.
- Next in F3: F3b Pokemon item import (rules table), F3c run items (Stones, Sharp Scissors, Round Glasses), F3d Inventory screen + gacha.
- CREDITS.md has no Pokesprite line yet (check license). _delete_/headless-stage.tgz is scratch, safe to delete.
- Git: branch feature/items, remote Jess-Rivera/pokesurvivor_fork. F3a-1 and F3a-2 are playtested and approved (2026-10-20). Machine sync steps are in CONTEXT.md session start item 4: give them on every 'catch me up'.

## Next (in order)
1. F3b Pokemon item import (rules table). Also: boss damage slice, Gym 2 (Misty, Staryu), tileset integration.

## Open questions for Jess
- None right now.

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
