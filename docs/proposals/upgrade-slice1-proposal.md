# Upgrade rework, slice 1: delete the old system (PROPOSAL, not applied)

Status: awaiting Jess's approval. Diff: docs/proposals/upgrade-slice1-deletion.diff (applies cleanly with `patch -p1`, dry run verified).
Rulings behind it: DECISIONS 2026-10-18 "Upgrade rework (in-run)".

## What this slice does
Removes move evolutions and the nine old stat cards, plus everything that depended on them. It adds nothing new except two safety guards.
The Lv 1 to 5 move ladders STAY for now (they are replaced by mechanic cards in slice 2), so the game stays playable between slices.
After this slice, a level-up offers only "learn a new move" and "upgrade a move" cards.

## Deleted
- Move evolutions: EVO, EVO_MODS, NEED_NAME, evoInfo, evolve (js/data/moves.js), the evolution card and its guaranteed slot (levelup.js), the gold evolved border in the HUD (hud.js), the evolution card styling (run-ui.js), the `evolved` replay in the co-op ghost cast (combat.js), the `evolve` progress event (progress.js), the evolution fields in the SEO export (tools/export_data.js, kept as `evo: null`).
- The nine old stat cards: the whole STATS table (Vigor, Potencia/Power, Carrera/Sprint, Reflejos/Reflexes, Coraza/Armor, Sintesis/Synthesis, Iman/Magnet, Aprendizaje/Learning, Baya Zidra/Sitrus Berry), their card block, and `Player.statsTaken`.
- Achievements Evolucion, Evolucionista, Maestro de movimientos (evo1, evo25, evoAll) and their goal fix-up line.
- Missions `evolve` (daily) and `wevolve` (weekly).

## Added (two guards)
1. Empty-offer guard (game.js maybeLevelUp). If every move is maxed and all slots are full there is nothing to offer; the old code would open an empty card screen and soft-lock the run. Now the level is consumed and no screen opens. Temporary: slice 2 refills the pool. NOT done for the co-op levelStart path (MP is deferred; see TODO).
2. Old-save mission heal (progress.js ensure). A save made before this change can hold today's `evolve` or `wevolve` mission; the missions screen would crash reading its missing definition. ensure() now drops unknown missions and tops the list back up to 3 daily / 2 weekly.

## Deliberately NOT touched
- Meta-progression (the Upgrades menu perks) and the Player multipliers they feed (atkMul, spdMul, cdMul, dmgReduce, regen, magnet, xpMul, addMaxHp). Meta is a later branch.
- The Lv 1-5 ladders, `m.lvl`, `Moves.levelUp` (slice 2 replaces them).
- Save data: `stats.evolutions` and `evoMoves` stay dormant in the save and in db.js (no migration needed, nothing reads them). Earned achievement ids and unlocked titles for the removed achievements stay in old saves and are ignored (UI loops over the achievement list and skips unknown ids).
- js/net/coop.js (still sends `m.evolved ? 1 : 0`, now always 0), lang-en.js (dead keys, harmless; the old card names are still used by the Upgrades menu), the Spanish SEO copy and generated pages (TODO follow-up), co-op levelStart.

## Verification done (on copies outside the repo, nothing applied)
- `node --check` on all 11 touched files: all pass.
- No remaining references to evoInfo, Moves.evolve, EVO, statsTaken, `.evolved`, the `evolve` event, evo achievement or mission ids anywhere except the dormant save fields, coop.js and lang-en.js noted above.
- Smoke test with stubs: Moves API no longer has the evolution functions; one move + free slots offers 3 cards; four lvl-1 moves offer 3 upgrade cards; four MAXED moves with full slots offer 0 cards (guard path); an upgrade card applies (Ember Lv 1 to 2); achievements and missions files load with no evolution entries.
- Old-save test: a save holding `evolve` (daily) and `wevolve` (weekly) now loads with them replaced and progress on the others kept (coins 5, wkill 10); a second ensure() changes nothing; a fresh save still gets 3 daily and 2 weekly; Progress.text() works for every mission.
- NOT done: an in-browser playtest (do on dev.html?dev).

## Playtest checklist for Jess (dev.html?dev)
1. Level-up screens show only New move and Nv. upgrade cards, no stat or gold evolution cards.
2. A full run to a high level: after all ladders are maxed the game keeps running with no card screen.
3. Missions screen opens with no error (especially if your save had an evolve mission today).
4. Achievements screen opens; the three evolution achievements are gone.
5. HUD move slots draw normally (no gold borders).
6. Team swap and bond still work.

## After approval (I do these)
1. Apply the diff to the repo files.
2. Add a changelog.js entry (free-edit, verified to parse), English in both slots:
   title "Move evolutions and stat cards removed": "Move evolutions and the old stat cards (Power, Sprint, Armor, Vigor and the rest) are gone while the upgrade system is rebuilt. Level-ups now offer new moves and move upgrades only. The evolution achievements and missions were removed."
3. Update docs: DEVLOG entry, TODO (check the SEO follow-up and co-op guard items below), GDD.md sections 7.2c and 2026-10-08 changelog line (mark removed), BALANCE.md Upgrades section.
4. Remind Jess to commit and push.

## Follow-ups to add to TODO
- SEO copy pass: tools/make_seo_pages.py still claims move evolutions (lines about 195, 200, 242, 418-428, 465, 471, 504) and shows an empty evolution column.
- Co-op levelStart needs the same empty-offer guard when MP resumes.
- Dormant save fields (stats.evolutions, evoMoves) and unused addMaxHp can be pruned later.

## Suggested git (Jess runs it; the assistant never runs git)
Branch for the whole rework, since slices build on each other:
  git checkout -b feature/upgrade-rework
After applying and playtesting slice 1:
  git add -A
  git commit -m "Upgrade rework slice 1: remove move evolutions and old stat cards"
