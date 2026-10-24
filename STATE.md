# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-24 early afternoon (Quick, work machine).

## Where we are
- ON BRANCH feature/all-moves-import (gym progression PAUSED). NO game code touched this session; check.js not run (nothing in js/ changed). All work was project docs + free-edit tooling.
- MOVE-AXIS-SCHEMA.md is canonical. EXTENDED this session: reposition = TWO orthogonal axes: repositionMode (teleport | swept = HOW you travel) + returnToOrigin boolean (WHETHER you snap back to the launch point). New dashMult (swept only; traversal speed = dashMult x caster final move speed, duration derived); new endOn {returned: true}; returnHits (out|outAndBack) only when returnToOrigin:true. Swept return dashes are speed-driven, NOT time-capped. ("return to current position" was rejected as incoherent on a caster dash = that is motion:returns/boomerang.)
- This session's schema + seed decisions ARE NOW RECORDED in DECISIONS.md (2026-10-24 entry). The earlier midday schema leans (SPLASH half-chance, UNLIMITED constant, grow.per, hitPolicy 3-value) were also folded into that entry.

## 64-move decision pass (board #3, blocks #2) - TOOLING BUILT, pass underway
- docs/move_rework_holding/build_move_conversions.py: reads js/data/moves.js (64) + api_move_dataset.json (937) -> move-conversions.json. All 64 matched a raw record (0 homebrew). Re-run after any seed-rule change (import it and call main(); subprocess/importlib are blocked in the on-device sandbox).
- docs/move_rework_holding/move-conversions.json: per move {current, raw, proposed seed, confidence, seedNotes}. 32 high / 32 low confidence.
- docs/move_rework_holding/move-compare.html: review tool. old-left (read-only) / new-right (structured-field editing). Radian WEDGE drawing next to radArc/spread; deg/s readout for rate fields (angularSpeed/aimTrack/turnRate). Export = full record (current+autoSeed+final+changedFields) -> move-conversions-final.json. NOTE file:// blocks fetch, so the tool has a "choose file" fallback to load the JSON.
- SEED RULES (locked, in generator): top-level = verbatim raw lifts only, no polish; ailment in payload ONLY; omit resolver defaults (cd from pp, splash-when-off, hitPolicy when oncePerInstance). pierce only on directional kinds (static areas none; beams UNLIMITED; dashes 0; proj/boomerang/chain/cone real counts). hitPolicy interval+rehit only on aura/orbit/trail. Quick Attack seeded as the return-dash worked example (repositionMode swept + returnToOrigin true + dashMult 10 + returnHits outAndBack).

## Next (in order)
1. Jess: COMMIT + PUSH this session (commands below). Also the still-pending prior-session items: RUN build_pokemon_dataset.py (pokeapi-master/data/v2/csv/), sanity-check pokemon_validation_report.json (~1025 species, forms nested, ~0 warnings; spot-check Charizard forms + Pikachu), drop JSON onto pokemon-viewer.html.
2. WORK THE 64-MOVE PASS in move-compare.html: focus the 32 low-confidence seeds (Flamethrower aimTrack cone, Night Shade aura+level-damage power:null, the nova->expanding-ring conversions, auras/orbits/mines/turrets/trail/dash). seedNotes on each say what to scrutinize. Export move-conversions-final.json when done = the #2 importer's input.
3. THEN #2 importer slice + 64-move conversion harness (go/no-go gate). Then learnsets (#11), RESUME gyms (#5). Engine work for reposition-with-return + dashMult (combat.js dash handler) is propose-and-approve when it lands.

## Deferred to #2 (noted so it is not lost)
- OVERRIDES LAYER (one of #2's four layers: raw / attributes / classification / overrides): moves whose cd is HAND-SET, not PP-derived, pin it here. Buffs are the clear cases (Agility cd 8 / dur 8, Swords Dance, Harden, etc.: cd + dur are tuned, must override the resolver's PP->cd default). The pass tooling intentionally does NOT capture overrides (move-conversions.json omits cd); the current-side of move-compare.html still SHOWS each move's hand-set cd/dur, so the data is visible when #2 builds the overrides layer. Decided 2026-10-24 to defer, not fold into the pass.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js + Markdown docs free-edit. Never run git OR gh (draft commands, Jess runs them). New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
PokeSwarm board + Issues (live backlog; #2 blocked_by #3 only, #4 closed/folded). docs/MOVE-AXIS-SCHEMA.md (canonical). docs/move_rework_holding/ (the pass tooling + conversions JSON). pokeapi-master/data/v2/csv/ (both builders). DECISIONS.md (2026-10-24 entry = this session), BALANCE.md. Fast check: node tools/check.js. NOTE: the OLD move-decisions.json + move-decisions-dashboard.html no longer exist; move-conversions.json replaces them under the new schema.
