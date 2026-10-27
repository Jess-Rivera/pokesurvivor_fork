# Slice 3d: playable behind a dev flag

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

## Decisions needed
None.

## Proceed when
Jess plays the core set and signs off. Feel issues go to the backlog as issues per docs/PM-WORKFLOW.md (the assistant drafts the commands, Jess runs them).
