# Slice 3d: playable behind a dev flag

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This is the record of an executed slice. Its decisions are absorbed into docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). Where this text and those documents differ, those documents win. Body below unchanged.

Back to slice-overview.md. Prior slice: slice-3c.md. Next: slice-4a.md.

## Objective
See the supported moves in the real game, with legacy untouched when the flag is off. This is the first slice that can change what the game does, so it follows the full prose-plan-then-OK workflow.

## Reads
Architecture B (where it plugs into the loop), C8 (retained mechanics), the move-render.js table in E. Validation 1.2 (options 3 and 4) and 1.6 Stage 3. Search game.js around the combat tick and the ground and air draw layers; dev.html script list; the NEED array in js/main.js; G.Debug (spawn, give, status, stage, skipTo).

## Build
- Wire js/systems/move-geom.js, move-sim.js, move-effects.js and move-render.js into dev.html and the NEED array.
- Routing by id (D-4, approved): with `?newcombat`, a slot whose move id the new path supports runs through G.MoveSim; every other move stays legacy. The supported list lives in one place and grows with each slice. This is routing by id, not a data bridge; no kind is derived. Removed in slice 7.
- game.js: G.MoveSim.step runs right after G.Combat.tick. G.Combat.resolve keeps enemy shots, wall cover and contact damage.
- Slot objects gain the new fields (cooldown timer, persistent handle) with null-check defaults so the HUD, swaps and saves keep working; the save format is unchanged and old saves load without clearing.
- move-render.js: outline-quality shapes in the move's type color drawn from the sim's own instances, plus the retained telegraph and patch recipes from drawGroundFields and drawAirFields chosen by phase and geometry, not kind.
- Dev hitbox overlay toggle: draws G.MoveGeom.shapeOf for live instances and flashes on 'move:hit'. Debug setup with dummy targets uses G.Debug.
- New-path moves ignore upgrade cards until slice 5.

## Tests
Without the flag: all existing harnesses pass and a short play on dev.html?dev shows no difference. With ?dev&newcombat: the slice 3c canaries are playable, the overlay lines up with the drawn effects, hit flashes appear only on enemies inside the shapes. No visible framerate collapse at high enemy density compared with the flag off at the same G.Debug.skipTo minute (CLAUDE.md performance stance: fix it now).

## Exclusions
Upgrades, riders, anything past the 3c axis set.

## Decisions (Jess, 2026-10-27, accepted as recommended)
- D1 routed list is the 7 canaries only. D2 player moves damage props and solid destructible props spend pierce (grass does not); the cast gate stays enemy-only. D3 Tackle reach stays as built, judged by feel, any fix is data. D4 ranged boss priority stays gone.
- ?newcombat only counts with ?dev. Single-player only.
- Found in review: the sim has no routing filter (7 moves would throw), legacy and sim would both tick a routed slot's timer, the HUD ring reads the legacy cd, Player.cast side effects (Life Orb, animation, sound) and the HUD flash need glue off 'move:cast', and the prop pass is missing. All are covered in slice-3d-codehandoff.md, which is the build plan.

## Proceed when
Jess plays the core set and signs off. Feel issues go to the backlog as issues per docs/PM-WORKFLOW.md (the assistant drafts the commands, Jess runs them).

## What was built (2026-10-27, Claude Code)
- Wiring: dev.html loads move-attributes, moves-generated, move-overrides, move-handler, move-resolver, move-geom, move-sim, move-effects, move-route, move-render after stages.js; their globals are in the NEED array. They load always and stay dormant without the flag.
- js/systems/move-route.js (new, G.MoveRoute): the flag (?dev AND ?newcombat), the ONE routed list (the 7 canaries), routed(id) (also false in co-op), tick (view rectangle, then G.MoveSim.tick), reset. A Pokemon swap clears the benched owner's live instances so a caster shape never rides a body that left the field.
- move-sim.js: setFilter(fn), default allow-all (harness and mutation runner unchanged); a rejected slot is never touched. Props join the collision sweep (G.World.propsInCircle, then G.MoveGeom.contains); a prop is keyed by itself in the hit map; solid props spend pierce, grass never; ties go enemies first, then id. Broad-phase prop pad is 14 px (largest destructible prop).
- move-effects.js: applyProp(inst, p), the legacy prop formula (G.Stats.applyDamageProp of owner.moveFactor), only when the payload deals damage. No event.
- combat.js tick: both loops skip routed slots, only with the flag on (off, the predicate is null and the loops are as before). game.js: sim tick after G.Combat.tick, MoveRender in the ground and air layers, reset at run start and on return to the menu. hud.js: the ring divides by slot.simCd when present, else the legacy cd.
- js/systems/move-render.js (new, G.MoveRender): static shapes as a soft ground patch with the patch inner ring, every shape outlined in type color in the air layer, travelling points as a glowing ball, the overlay (shapeOf recomputed from the sim's inputs, swept segment for points, ring flash on each 'move:hit'). Glue on 'move:cast': finds the routed slot in the active group, sets simCd and castAt, calls Player.cast (animation, sound, Life Orb).
- debug.js: G.Debug.hitbox() toggles the overlay; G.Debug.newcombat() puts the 7 routed moves in 7 slots (cycle slots to try each), stops spawns, turns the overlay on and places 24 dummies (8 directions at 50, 130, 220 px). Note: G.Debug.loadout sets the ITEM loadout, not moves, so the helper sets the slots itself. Dummies are frozen with a permanent sleep (no movement, no attacks, damage never wakes a sleeper) and 1e9 HP.
- tools/smoke-newcombat.js: headless Chromium from C:\Users\boric\tools\playwright (PLAYWRIGHT_DIR overrides), served by python -m http.server. check.js only syntax-checks it.

## Results
- check.js: 19/19 harnesses (move-sim 1,980 checks: filter, prop damage, solid pierce, grass, enemy behind a rock, a broken rock still spends pierce), I1 guard ok on 5 files, only the old hail self-test fails. Mutations 29/29 caught (5 new for 3d).
- Smoke: flag off boots, plays and shows no sim instances and no errors; flag on: all 7 routed moves cast, simCd and castAt set, each active timer falls one frame per frame (no double ticking), 149 hits on dummies, Life Orb costs HP, no errors. Screenshot: flamethrower cone, outline and overlay coincide; numbers only on dummies inside the cone. Density at skipTo(20): about 65 enemies, 16.6 ms/frame both ways (headless is vsync capped, so Jess's playtest is the real density check).
- Not checked by machine: feel, the look of each move, and high density beyond about 70 enemies.

## Backlog drafts (Jess runs them)
Idle prop targeting (D2), ranged boss priority (D4), Tackle reach only if Jess flags it (D3). Commands are in the coding chat's final message.
