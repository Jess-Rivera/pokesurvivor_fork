# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-21 (Claude Desktop, home).

## Where we are
- Branch feature/items. check.js 16/16 green. F3d-1 feel-tested by Jess in the browser (HUD column, chooser with 1 to 4 slots, Stone lock, Sharp Scissors). F3c items otherwise not fully feel-tested.
- Item rework: F1, F2, F3a, F3b done and playtested. F3c built (6 of 8 run items; Amnesia Type, Paper Skin, Glass Bones HELD for a type-chart design pass).
- Player-facing name for run items is now TEAM ITEMS (label only; code stays 'run'). Team sheet item area has mini tabs Berry | Held Item | Team Items.
- F3d-2 BUILT (NOT browser-tested): unlocked team items + pre-run loadout in the save, new Inventory window on the main menu, Pokemon menu entry removed (Team subtext N/X - Y shiny). Slot focus is decoupled from the selection (button joins them), loadout is by slot, menu icons are PokeSprite atlas icons. Starters Lucky Egg + Amulet Coin. Picking up a team item unlocks it for good. Inventory saves immediately.
- F3d-1 BUILT and approved: run items show in a bottom-right column (unlocked slots only, default 1, G.Debug.runslots(n) to unlock up to 4). New item chooser for both tiers: wide cards, NEW item row 1, held item(s) row 2 (chip Slot N), highlighted card = your pick (held by default), Confirm or Leave it. Stone lock: a second Stone can only replace the held Stone.

## Next (in order)
1. Jess: still untested from F3d-2: a loadout actually equipping at run start (full loadout then opens the chooser on a pickup), unlock-on-pickup from a gym or boss drop (toast), Team screen slot-vs-preview decoupling, and the bottom-right column on a touch layout. The Inventory window itself was seen and tuned.
2. F3d-3: rename Gacha tab to Shop, team items for about 100k gold, slot upgrades to 4 (source OPEN).
3. Feel-test Brass Knuckles, Pikachu's Tear, Re-Do, Snowball Badge. HELD: Amnesia Type, Paper Skin, Glass Bones. Outside F3: Kanto gym roster (feature/boss-rework, Misty next), boss damage slice, tileset integration.

## Parked design docs (docs/)
RUN-ITEM-THINK-DOC.md, BULLET-TIME-DESIGN.md, SPEED-IVEV-SLICE.md (blocked on IV/EV storage), PERF-HOTPATH-NOTES.md.

## Open questions for Jess
- How are team item slots 2 to 4 earned or bought?

## Standing rules (full text: CLAUDE.md)
- Local-first: no Firebase/TURN/MP. English-native (inherited Spanish literals are i18n keys). No em-dashes.
- Workflow: prose plan, Jess OKs, then build into the repo. changelog.js + Markdown docs free-edit. Assistant NEVER runs git. New save fields backward compatible.
- Test as a new player with one Pokemon slot. Debug on dev.html?dev.

## Where to look (search, do not read whole)
DECISIONS.md, DEVLOG.md, BALANCE.md, TODO.md, BOSS-REWORK.md, docs/. Archives: docs/*-archive.md. Fast check: node tools/check.js.
