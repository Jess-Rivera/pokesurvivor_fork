# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-22 (Amazon Quick, work machine).

## Where we are
- feature/items was MERGED to main (Jess). Now on branch rework/gym-progression (Jess cut it with git switch -c).
- This session (2026-10-22, work machine): gym-gate ESCALATION built (first slice of the gym-progression work).
  - Design (DECISIONS 2026-10-22 "Gym gate is a pressure mechanic"): gate opens -> 37 s grace -> every 10 s the wild level AND the gym leader level climb +1, UNCAPPED. Toast each tick. Snap-back to true run level on the win. Gauge on the gate (grace countdown, then "+N ESCALATING").
  - Mechanism: one shared bump G.Gym.escBump(); levelForTime stays pure; read at 2 sites (wild spawn in enemy.js HP+atkLvl, PLAIN wilds only; gym leader in makeDef at entry).
  - Files: js/systems/gym.js, js/data/enemies.js, js/entities/enemy.js, js/ui/hud.js, js/data/changelog.js, + docs. All 5 JS verified to parse (bracket/quote balance); assistant cannot run node. NOT run through check.js or browser yet. No harness yet.
  - Dev test hooks: G.Gym.debugOpen() then wait past 37 s, or G.Gym.debugEsc(n) to jump the bump.

## Next (in order)
1. Jess: node tools/check.js, then browser feel-test the escalation on dev.html?dev. Commit when happy (assistant gives git commands).
2. Gym-sprite DISPLAY FIX (same branch): the gate still draws the rift prop + purple tint in rift.js drawable(); make it read as a gym when rift.gym is set. (This was the original slice-1 idea; escalation jumped ahead of it.)
3. Harness for the escalation clock/bump.
4. Misty + Staryu (next Kanto gym, feature/boss-rework roster).
5. Outside: boss damage slice, tileset integration.

## Architecture direction (2026-10-22): sim/present boundary
Client JS forever; server lang deferred to MP. Standing SP discipline: converge toward a sim/present-EVENT boundary, collision radius out of sprite metadata, injected clock. DIRECTION, pay down as you touch files. Full: DECISIONS 2026-10-22 + docs/SIM-PRESENT-BOUNDARY.md.

## Open questions for Jess
- Escalation: leave it uncapped, or add a cap after real play? (Built uncapped per Jess.)
- Gym gauge: grace shown as text only; want a visible ring/bar too?
- Berry bag slots buyable under Team Upgrades later? Run-item acquisition (gacha / currency / meta unlocks)?

## Standing rules (full text: CLAUDE.md)
- Local-first: no Firebase/TURN/MP. English-native (inherited Spanish literals are i18n keys). No em-dashes.
- Workflow: prose plan, Jess OKs, then build into the repo. changelog.js + Markdown docs free-edit. Assistant NEVER runs git. New save fields backward compatible.
- Test as a new player with one Pokemon slot. Debug on dev.html?dev.

## Where to look (search, do not read whole)
DECISIONS.md, DEVLOG.md, BALANCE.md, TODO.md, BOSS-REWORK.md, docs/. Archives: docs/*-archive.md. Fast check: node tools/check.js.
