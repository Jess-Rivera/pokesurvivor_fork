# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-22 (Amazon Quick, work machine).

## Where we are
- Branch feature/items. READY TO MERGE once committed (see below). check.js 18/18 green at last home run; work-machine session since then edited game.js, log.js, items.js, hud.js (not re-run here, assistant cannot run node; verified they parse).
- This session (2026-10-22, work machine):
  - Re-Do bug CLOSED. It does fire; root cause of the earlier "no revive" was it not being equipped (items not in the log). Added diagnostic ITEM + REDO log kinds (log.js) and equip/decision log lines (game.js) to prove it; KEPT IN (dev-only, free). Then fixed the UX: Re-Do now resumes on the Pokemon that just fainted (capture activeIdx before the team revive), not slot 1.
  - Run-item HUD slots widened to 3x on desktop: icon | separator | name + live readout. New G.Items.runHud(id, pl) returns {name, desc, live}; Snowball Badge shows "HP collected -> +N% dmg", Brass Knuckles/Sharp Scissors show "+N% dmg/spd" or "inactive - needs 3+ team", Pikachu's Tear "N fainted -> +N%". Static items (Stones, Amulet Coin, Lucky Egg, Re-Do) show name + wrapped desc. Collapses to icon-only on touch or width < 720. Exposed G.Items.snowballTotal.
  - 2 type-chart items (Amnesia Type; Paper Skin + Glass Bones) SPLIT OUT of feature/items to their own backlog entry so the branch can merge.
- Feel-tested OK by Jess this/last session: Brass Knuckles, Pikachu's Tear, Snowball Badge, Re-Do, the new HUD readout.

## Next (in order)
1. Commit + merge feature/items (assistant gives the git commands; Jess runs them).
2. Cut refactor/sim-present from fresh main (see Architecture direction). First slice: lift Enemy.hurt()/showHurt() onto an event emitter and point the harnesses at the real hit path. Worked example + offenders in docs/SIM-PRESENT-BOUNDARY.md.
3. Type-chart held items (own branch, needs a type-chart design pass first). See TODO "Type-chart held items".
4. Outside F3: Kanto gym roster (feature/boss-rework, Misty next), boss damage slice, tileset integration.

## Architecture direction (2026-10-22): sim/present boundary
Client stays JS forever; server language (Node vs Go) deferred to the MP phase. Standing SP discipline: converge the sim toward a sim/present-EVENT boundary (sim emits events, presentation renders FX/Audio/Animator/HUD), keep collision radius out of sprite metadata, keep the clock injected. Pays off 3 ways: real headless harness coverage now, Web-Worker sim for perf, authoritative server later. DIRECTION, not a refactor slice; pay down as you touch files. Full: DECISIONS 2026-10-22 + docs/SIM-PRESENT-BOUNDARY.md.

## Parked design docs (docs/)
RUN-ITEM-THINK-DOC.md, BULLET-TIME-DESIGN.md, SPEED-IVEV-SLICE.md (blocked on IV/EV storage), PERF-HOTPATH-NOTES.md, SIM-PRESENT-BOUNDARY.md.

## Open questions for Jess
- Berry bag slots: also buyable under Team Upgrades later?
- F3d acquisition for run items: gacha, separate currency, or meta unlocks? (Shop currently sells team items at 100k each.)

## Standing rules (full text: CLAUDE.md)
- Local-first: no Firebase/TURN/MP. English-native (inherited Spanish literals are i18n keys). No em-dashes.
- Workflow: prose plan, Jess OKs, then build into the repo. changelog.js + Markdown docs free-edit. Assistant NEVER runs git. New save fields backward compatible.
- Test as a new player with one Pokemon slot. Debug on dev.html?dev.

## Where to look (search, do not read whole)
DECISIONS.md, DEVLOG.md, BALANCE.md, TODO.md, BOSS-REWORK.md, docs/. Archives: docs/*-archive.md. Fast check: node tools/check.js.
