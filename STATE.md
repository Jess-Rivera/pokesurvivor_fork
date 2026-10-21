# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-21 (Amazon Quick, work machine).

## Where we are
- Branch feature/items. check.js 16/16 green. NOT yet feel-tested by Jess.
- Status A-E closed. Boss rework: Elites + Brock gym merged. Tileset atlases baked, nothing loads them.
- Item rework: F1, F2, F3a (ground + berries) done + playtested.
- F3b COMPLETE: all held items. 9 (Muscle Band, Wise Glasses, Scope/Razor crit, Expert Belt, Big Root, Black Sludge, Wide/Zoom lens) + 18 type-damage (one per type, Player.typeBoost, +20% their type). items.js = 61 (36 pokemon, 25 run).
- Damage-layer refactor merged: G.Stats.itemDmgMul + combat.applyHitEffects (both hit sites unified). Behavior-preserving, mainline formula untouched.
- Perf merged: FG1 grid bucket reuse (no per-frame GC); FG2 queryCircleEach zero-alloc (5 callers). FG4 (projectile broad-phase) documented, not built; projectiles stay uncapped by design.
- F3c BUILT (6 of 8): Sharp Scissors + Brass Knuckles (team-HP-scaled speed/dmg, roster 3+ fixed), Snowball Badge (+dmg per killed HP/10000), Re-Do (full revive once/run), Pikachu's Tear (1.1x dmg+speed per fainted), 18 Power Stones (ignore resist+immunity, one-stone-max via group:'stone'). G.Debug.runitem(id) added.
- UI: move cards = collapsed card + hover/tap detail panel (position:fixed overlay, never clipped, opaque).

## Next (in order)
1. Jess: feel-test (dev.html?dev, G.Debug.item / runitem). Check: Stone exclusion (2nd replaces 1st), Re-Do full revive, lens arc/area, hover panel not clipped.
2. F3d Inventory + gacha. gacha-ui.js pulls Pokemon; run-item OWNERSHIP + pre-run loadout is net-new (~2-3 slices). Quick half = in-run 2x2 full-grid chooser (replaces the placeholder prompt). Open Q below.
3. HELD (own design pass): Amnesia Type (active type switches each cast), Paper Skin and Glass Bones (weak to all / all hits super-effective). Both do live type-chart manipulation.
4. Outside F3: Kanto gym roster (feature/boss-rework, Misty next), boss damage slice, tileset integration.

## Parked design docs (docs/, read when starting that work)
RUN-ITEM-THINK-DOC.md, BULLET-TIME-DESIGN.md (prototype ready, solo-only, not built), SPEED-IVEV-SLICE.md (blocked on IV/EV storage), PERF-HOTPATH-NOTES.md.

## Open questions for Jess
- F3d acquisition: run items from the Pokemon gacha, a separate currency, or meta unlocks?

## Standing rules (full text: CLAUDE.md)
- Local-first: no Firebase/TURN/MP until Jess switches phase. English-native (inherited Spanish literals are i18n keys, leave them).
- Workflow: prose plan, Jess OKs, then build into the repo. changelog.js + Markdown docs free-edit.
- Assistant NEVER runs git and cannot run node (Jess runs check.js). No em-dashes. New save fields backward compatible.
- Test as a new player with one Pokemon slot. Debug on dev.html?dev.

## Where to look (search, do not read whole)
DECISIONS.md, DEVLOG.md, BALANCE.md, TODO.md, BOSS-REWORK.md, the docs/ design files. Archives: docs/*-archive.md. Fast check: node tools/check.js.
