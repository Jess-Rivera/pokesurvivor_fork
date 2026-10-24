# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-24 late afternoon (Quick, work machine).

## Where we are
- ON BRANCH feature/all-moves-import (gym progression PAUSED). NO game code touched this session; check.js not run (nothing in js/ changed). All work = the free-edit described.json.
- THE 64-MOVE FEEL PASS IS DONE. move-conversions-described.json now holds 63 of 64 moves, all reviewStatus: reviewed. bubble is logged in a `forgottenSkips` block (not converted on purpose; remove in the later forgotten-move purge). All 64 accounted for.

## The feel-described conversion pass (COMPLETE)
- docs/move_rework_holding/move-conversions-described.json (free-edit): the live output, source of truth for #2 ALONGSIDE the tool's export. Each record = raw source lifts + schema fields + balanceClass + reviewStatus + feel.
- This session wrote the remaining 36: quick-attack, flamethrower, fire-spin, heat-wave, leaf-storm, discharge, thunderbolt, psychic, mud-shot, gust, hyper-voice, toxic, bulldoze, string-shot, bug-buzz, rock-slide, powder-snow, fairy-wind, dazzling-gleam, dark-pulse, night-shade, spikes, toxic-spikes, hail, meteor-mash, will-o-wisp, substitute, aerial-ace, flame-wheel, bubble-beam, hex, thunder-shock, confusion, psybeam, sludge, wing-attack.

## Next (in order)
1. Jess: COMMIT + PUSH this session (TODO.md, STATE.md, DEVLOG.md, docs/move_rework_holding/move-conversions-described.json). Commands in chat.
2. #2 IMPORTER: build the resolver + 4 data layers + the 64-move conversion harness (go/no-go gate). The described.json records are the authored intent to resolve against.
3. RESOLVER HANDLERS NEEDED (collected from feel notes, must stub or implement at #2): chainDamageFalloff (Thunderbolt/Hex chains), berrySteal (Bug Bite), fixedDamage (Dragon Rage), levelDamage (Night Shade), statusBonus (Hex 2x vs statused), setWeather (Hail), mine contact-trigger (Spikes), Ice Beam slow rider.
4. THEN learnsets (#11), RESUME gyms (#5).

## Board note (reconcile on the PokeSwarm board)
- GitHub API returned #2 CLOSED (completed, blocking #3/#4/#11), but Jess reopened #2 ~6h ago (API was cached/stale). Treat #2 as OPEN: the moves work is in flight until the importer lands. #4 is being closed as "not relevant" (its 3 feel-calls were decided inside the #3 pass). #3 is effectively done (described.json complete); its issue can close once #2 consumes it.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js + Markdown docs free-edit. Never run git OR gh (draft commands, Jess runs them). New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
PokeSwarm board + Issues. docs/MOVE-AXIS-SCHEMA.md (canonical). docs/move_rework_holding/move-conversions-described.json (the pass output). docs/MOVES-IMPORT-PLAN.md. DECISIONS.md, BALANCE.md. Fast check: node tools/check.js.
