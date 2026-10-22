# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-21 night (Claude Desktop, home).

## Where we are
- Branch feature/items. check.js 18/18 green. F3d-1, F3d-2, F3d-3 all BUILT and browser-tested by Jess (HUD column, chooser, Stone lock, unlock-on-pickup, loadout, Inventory, Shop, in-game dialogs).
- Team Items = run items (label only; code tier 'run'). Team sheet item area has mini tabs Berry | Held Item | Team Items. Shop = Pokemon | Team Items 100k each | Team Upgrades slots 9k / 23k / 60k. Starters Lucky Egg + Amulet Coin. Loadout is by slot.
- Every native confirm() now uses G.UI.ask (in-game dialog, dev.html #scr-ask). New code must never use confirm/alert/prompt.
- F3c: 6 of 8 team items built. DEFERRED by Jess: Amnesia Type, and Paper Skin + Glass Bones (one item), need a type-chart design pass.

## Next (in order)
1. RE-DO MAY BE BROKEN: Jess's log (a1189320, Scorbunny then Clefairy) ends on the final faint at 47.7s with no revive. Unknown if Re-Do was equipped (log does not record items). Check HUD shows it, G.Debug.unlockitem('redo') then G.Debug.loadout('redo'), look for the "Re-Do!" toast. Check js/game.js ~line 794 (pl.runItems after the swap). Planned: add log lines for team item equip and Re-Do firing.
2. Feel-test Brass Knuckles, Pikachu's Tear, Snowball Badge. Then merge feature/items.
3. Outside F3: Kanto gym roster (feature/boss-rework, Misty next), boss damage slice, tileset integration. Touch layout of the bottom-right column deferred (around MP).

## Parked design docs (docs/)
RUN-ITEM-THINK-DOC.md, BULLET-TIME-DESIGN.md, SPEED-IVEV-SLICE.md (blocked on IV/EV storage), PERF-HOTPATH-NOTES.md.

## Open questions for Jess
- Berry bag slots: also buyable under Team Upgrades later?

## Standing rules (full text: CLAUDE.md)
- Local-first: no Firebase/TURN/MP. English-native (inherited Spanish literals are i18n keys). No em-dashes.
- Workflow: prose plan, Jess OKs, then build into the repo. changelog.js + Markdown docs free-edit. Assistant NEVER runs git. New save fields backward compatible.
- Test as a new player with one Pokemon slot. Debug on dev.html?dev.

## Where to look (search, do not read whole)
DECISIONS.md, DEVLOG.md, BALANCE.md, TODO.md, BOSS-REWORK.md, docs/. Archives: docs/*-archive.md. Fast check: node tools/check.js.
