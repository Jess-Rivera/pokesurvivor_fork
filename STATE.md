# STATE, current handoff (read this right after CONTEXT.md)

Keep this file under 3 KB. Rewrite it at the end of every session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-21 (Amazon Quick, work machine).

## Where we are
- Status slices A to E closed. Boss rework: Elites and Brock pilot gym merged. Tileset atlases baked, nothing loads them yet.
- Item rework (feature/items): F1, F2 done and approved. F3a-1 (ground items, js/data/ground-items.js, pickup kind 'ground') and F3a-2 (status berries) BUILT and playtested 2026-10-20, approved.
- F3a-2: Cheri/Chesto/Pecha/Rawst/Aspear/Persim/Lum drop as ground pickups into a team-wide berry bag (1 slot, upgradeable via save.berrySlots, cap 4; HUD boxes above the team stack, bottom-left for one Pokemon). A berry auto-consumes to block its status (benched Pokemon too); Lum covers the six main statuses, used last. Full bag or duplicate: pickup stays on the ground. Hooks in status.js. Pause sheet shows a Berry bag block (one row per slot with description). G.Debug.ground('pokeball'|'masterball') drops the gacha tickets (both drawn 32 px in the world; Great Ball x1, Master Ball x10). Sheet berry icons use 'ps:' + icon.
- F3b part 1 BUILT + check.js-green 2026-10-21 (NOT yet feel-tested): 7 new Pokemon held items imported from PokeAPI into data/items.js: Muscle Band, Wise Glasses (+10% dmg), Scope Lens, Razor Claw (+5% crit, permanent while active), Expert Belt (+20% on super effective, combat.js both hit paths), Big Root (+30% drain, combat.js drainHeal), Black Sludge (Poison heals 1.5%/s, others chip 1%/s, player.js). All held items now carry a 'ps:' Pokesprite icon; HUD + pause sheet draw def.icon || id. New G.Debug.item(id) force-equips a Pokemon-tier item (separate from ground()). Harness: items-f1-harness.js section 7 added (F3b, near()-based); 16/16 harnesses pass.
- F3b part 2 BUILT 2026-10-21 (NOT yet feel-tested): Wide Lens (+15% area) and Zoom Lens (-50% area + 1.2x dmg) via new Player.moveRadiusMul, applied in combat.js run() on a per-cast copy of m (radius + arc, arc scaling was Jess's call); orbit scaled at its orad reads; reach() takes pl and scales radius-based targeting. items.js now 20 items (18 pokemon, 2 run). Harness count 20/18, section 7 covers both lenses.
- F3b item imports COMPLETE (9 new: 7 part-1 stat/crit/conditional items + 2 lens). Classification of the full PokeAPI held-item set was reviewed in an interactive HTML tool (import/adapt/skip); berries stay in the ground tier; weather rocks + 6-slot switch items parked as adapt for later.
- Next in F3: F3c run items (Stones, Sharp Scissors, Round Glasses), then F3d Inventory screen + gacha.
- CREDITS.md has no Pokesprite line yet (check license). _delete_/headless-stage.tgz is scratch, safe to delete.
- Git: branch feature/items, remote Jess-Rivera/pokesurvivor_fork. F3a-1 and F3a-2 are playtested and approved (2026-10-20). Machine sync steps are in CONTEXT.md session start item 4: give them on every 'catch me up'.

## Next (in order)
1. Run `node tools/check.js` and feel-test all 9 new held items on dev.html?dev (G.Debug.item('scopelens'|'expertbelt'|'blacksludge'|'widelens'|'zoomlens' etc.); for the lenses watch melee arc width, orbit ring size, cone focus). Then F3c run items (Stones, Sharp Scissors, Round Glasses), F3d Inventory + gacha. Also outside F3: boss damage slice, Gym 2 (Misty, Staryu), tileset integration.

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
