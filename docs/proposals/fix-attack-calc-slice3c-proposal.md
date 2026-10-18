# fix/attack-calc, slice 3c (swap rule) — PROPOSED (not applied)

Diff: `docs/proposals/fix-attack-calc-slice3c.diff` (2 files: `js/systems/combat.js`, `js/entities/player.js`; dry-run clean; `node --check` passes).
Decision source: Jess 2026-10-18 (DECISIONS "Swap rule decided").

## Behavior
- **Independent cooldowns.** Every slotted move's timer counts down every frame, active or not (clamped at 0 = ready). Only the active group fires. A move that recharged while inactive is "banked" and fires the moment its slot becomes active.
- **35% cap removed.** `setActive` no longer shortens the incoming moves' timers (the bug / exploit).
- **Swap-in fires immediately** if the move is ready. Nothing is delayed.
- **Hold before swapping again (`Player.SWAP_LOCK` = 0.4 s).** After a manual switch you must stay on that slot 0.4 s; swap requests during the hold are ignored (keys 1-4, Q/E, and the touch buttons all go through `setActive`).
- **No hold for game-made switches:** learning a move (`addMove`) switches with `free = true`, and is never blocked. Bond fuse sets the slot directly (unchanged).
- Orbit moves have no cooldown: swapping away removes the orbs (unchanged), swapping back respawns them at once.

## What the hold is for
With independent cooldowns, swapping cannot raise a move's firing rate, so the hold is not a throughput limit. It stops rapid back-and-forth swapping from feeling like free firing from several slots, and it makes each swap a small commitment.

## Side effects to know
- HUD: the cooldown overlay already reads each slot's timer, so inactive slots will now visibly recharge. No HUD change in this diff. No visual for the delay yet.
- A banked Quick Attack (i-frames on cast) works as an on-demand dodge, limited by its cooldown and the delay.
- Co-op: only the active group casts, same as before; nothing new is sent.
- Choice Band unchanged (still blocks swapping).
- Bond groups behave the same, they just no longer have a special role (see TODO "Bond rework").

## Not changed
Buffering a swap pressed during the hold (it is dropped), swap-in grace, burn, Bond rules, DMG_SCALAR.
