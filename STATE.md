# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-24 mid-afternoon (Quick, work machine).

## Where we are
- ON BRANCH feature/all-moves-import (gym progression PAUSED). NO game code touched this session; check.js not run (nothing in js/ changed). All work = project docs + free-edit tooling.
- Working board #3 (the 64-move pass). #2 blocked_by #3 only. Doing the pass as a FEEL-FIRST workflow now (see below), not just the tool's structured edit.

## The feel-described conversion pass (NEW workflow this session)
- docs/move_rework_holding/move-conversions-described.json (free-edit): the live output. Jess pulls a move up in the reviewer, describes how it should FEEL, agent maps to schema values + writes the record with a `feel` note. Each record = raw source lifts (verbatim) + schema fields + balanceClass (melee|ranged|other) + reviewStatus + feel. This is a source of truth for #2 ALONGSIDE the tool's move-conversions-final.json export.
- 27 of 64 DONE (all reviewStatus: reviewed): tackle, swords-dance, agility, harden, water-gun, ember, hydro-pump, vine-whip, aqua-ring, razor-leaf, giga-drain, body-slam, poison-sting, bug-bite, rock-throw, ice-beam, karate-chop, aura-sphere, lick, shadow-ball, dragon-rage, dragon-dance, metal-claw, flash-cannon, bite, bonemerang, psycho-cut. (13 ranged / 9 melee / 5 other.)

## Reviewer v2 (move-compare.html, rebuilt this session, free-edit)
- Master-detail: left = filterable/sortable 64-move list (kind/confidence/review/balanceClass/edited; sort order/name/kind/confidence/review); right = old-vs-new editor.
- Now a FULL-schema form: grow, splash, caster-state (iframes/commitment/delay), path (curve/oscillate), cardLock all reachable (render always, show (unset), write only when filled). Structured sub-editors for emit / spawn / multihit(normalize). balanceClass top-level in export; reviewStatus inside final{}, manual only.
- KNOWN GAP (noted, NOT fixed per Jess): normalize only renders inside a multihit payload; schema allows it on any count/tick move (novas, bursts, auras). Needs a non-multihit normalize control.

## Next (in order)
1. Jess: COMMIT + PUSH this session (DEVLOG.md, STATE.md, docs/move_rework_holding/{move-compare.html, move-conversions-described.json}). Commands provided in chat.
2. FINISH the pass, 37 moves left, all low-confidence buckets. NOTE: several novas were WORKED OUT in conversation this session but NOT yet written to described.json: Heat Wave (static ring, growSpeed=radRadius/time), Psychic (static per:time growSpeed 125 OR the traveling-orb variant radRadius10/moveSpeed100/turnRate1/per:distance), Mud Shot (full-circle burst, spread 6.2832 NOT radArc, 6 pellets), Gust (3-pellet fan, spread 0.7, radArc unset). Lock these first next session. Then: 6 auras, 3 meteors, 3 mines, 3 orbits, Flamethrower (+Bubble Beam) cone, chains, trails, 2 turrets (Will-O-Wisp/Substitute = recheck self-cast shield), dashes.
3. THEN #2 importer slice + 64-move conversion harness (go/no-go gate). Then learnsets (#11), RESUME gyms (#5).

## Nova math (settled this session, for the remaining novas)
- growSpeed x endOn-time >= radRadius or the ring never reaches its declared radius. Clean sweep = growSpeed = radRadius / fill-time.
- Nova = motion: static (grow moves the collision EDGE, not the center). motion: travels only for a drifting+expanding ring.
- grow.per: distance STALLS on a static nova (0 travel) — use per: time for static, or switch to motion: travels for a per:distance expanding orb.
- Double-pulse nova = an emit (emitter anchor: caster; emitted rings anchor: world so each wave blooms from its spot = shockwave feel).

## Deferred to #2 (noted so it is not lost)
- OVERRIDES LAYER: hand-set cd values (buffs Agility/Swords Dance/Harden/Dragon Dance cd 8; Bug Bite cd 0.42; Shadow Ball longer cd). The described records carry durations in payloads but NOT cd; cd overrides live in the overrides file/layer at #2.
- Bug Bite berrySteal special + Dragon Rage fixedDamage special + Ice Beam slow rider: schema-expressible but need #2 resolver handlers (or stubs). Flagged in each record's feel note.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js + Markdown docs free-edit. Never run git OR gh (draft commands, Jess runs them). New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
PokeSwarm board + Issues (#2 blocked_by #3, #4 closed/folded). docs/MOVE-AXIS-SCHEMA.md (canonical). docs/move_rework_holding/ (tooling + both conversions JSONs). DECISIONS.md, BALANCE.md. Fast check: node tools/check.js.
