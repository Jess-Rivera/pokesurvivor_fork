# SIM / PRESENT BOUNDARY (design direction)

- **Role:** Active architecture-direction doc (R-12): direction, not a committed refactor.
- **Owns:** The sim and present boundary and the language-direction reasoning.
- **Does not own:** Module map, build and run (ONBOARDING.md); combat rules (docs/COMBAT-RULES.md); agent rules (CLAUDE.md).
- **Status home:** STATE.md.
- **Last reconciled:** not yet

Status: DIRECTION, not a committed refactor slice. Converge toward this as you touch files; do not stop feature work to do it in one pass.
Opened 2026-10-22 (Amazon Quick, work machine), from a Go-vs-JS conversation that resolved into an architecture question.

## The decision this came out of
Jess is evaluating a future rewrite to Go. Resolved:
- CLIENT stays JS in the browser, forever. The browser is the ship target (goal 1: browser-based bullet heaven), so Go-native (Ebiten) is out and Go-via-WASM only taxes the Canvas/DOM hot path through syscall/js. Nothing about MP changes the client language.
- SERVER language (Node vs Go) is DEFERRED to the MP phase and wants real benchmarks. In a server-authoritative design the authoritative sim server is a separate program written fresh in the MP phase, so the choice does not bleed back into SP. Node = reuse the JS sim modules (same language, same RNG, easier prediction/reconciliation). Go = higher CPU ceiling and cheap goroutines for many rooms per machine, at the cost of maintaining two sim implementations. The one slot where learning Go pays off for this project is that server.
- MP topology (Jess's stated preference): server-side authoritative simulation + WebRTC with TURN. Server-authoritative + WebRTC means the server is itself a WebRTC peer (pion/webrtc if the server is Go), not a pure signaling relay; TURN still just relays when NAT traversal fails. Thousands-of-entities for a 4-player room is achievable in JS (Node) end to end; the binding constraints in order are client render throughput, then snapshot bandwidth, then server sim CPU (Go only touches the last and least binding for a single room).

## The one discipline that makes all of the above cheap
Keep the SIMULATION decoupled from PRESENTATION so the sim can run headless.
- SIM = state and rules: positions, velocities, HP, damage, status/stages, AI decisions, collision, spawning, XP. Deterministic-ish, no browser.
- PRESENTATION = everything you see/hear/touch: Canvas draw, FX (floating numbers, sparks, rings, bursts), Audio, the sprite Animator, HUD, camera shake, DOM, input device reads.

The target shape: the sim EMITS EVENTS ("enemy 7 took 12 dmg, super effective, from dir (dx,dy)"), and a presentation layer CONSUMES them to draw the number, spark, Hurt animation and sound. The sim never calls FX/Audio/Animator itself.

### Why this one change pays off three times
1. Headless testing NOW: the harnesses already run Enemy.update and Combat.tick in Node, but anything through the damage path drags in FX/Audio/Animator, so harnesses stub them or dodge the real hit path (DEVLOG keeps noting "NOT run in a browser", "the real hit path is untested"). With a clean boundary the harness runs the ACTUAL damage path and asserts on emitted events, no stubs.
2. SP perf: a headless sim can move to a Web Worker off the render thread, one lever for the maximized-entity goal in single-player.
3. MP: the authoritative server runs the sim and ships the same events over the wire; clients consume them to render. Works in either server language.

## Known offenders in the current code (verified 2026-10-22, not from memory)
These are the concrete places where sim reaches into presentation. They are the worked examples, not an exhaustive list.

1. Enemy.hurt() (js/entities/enemy.js) is the poster child. It is sim (HP subtract, shield absorb, morale pain, knockback, die() trigger) but calls presentation inline: G.FX.dmgText, G.FX.spark, this.anim.play('Hurt'), G.Audio.sfx('hit') (via showHurt). Target: hurt() mutates state and emits a "hit" event; a presentation layer renders the number/spark/anim/sound. die() has the same shape (burst, ring, camera kick, sfx, plus the loot drops which ARE sim).

2. Collision radius derived from sprite metadata. The Enemy constructor sets this.r = G.Sprites.bodyRadius(dex, scale) and this.bodyH = G.Sprites.bodyHeight(...), and bossScale() reads sprite animMeta. Body/collision radius is a SIM value but is read out of a RENDER asset, so a headless server would need sprite sheets just to size hitboxes. Target: precompute per-species collision radius (and body height) into a data file (ties into the "more accurate hitboxes" TODO: measure opaque pixels offline into data), so the sim reads a number.

3. The loop is browser-driven. game.js loop() uses requestAnimationFrame + performance.now() for the clock, and frame() computes dt from ts. A server runs a fixed-timestep tick on a timer. Entities already take dt (good), so the fix is confined to the top-level loop: inject the clock / step the sim on a passed dt rather than reading rAF/performance.now inside the sim. Note dt is already clamped to 1/30 and scaled by speedK, keep that in the sim step.

4. Enemy.update() mixes a render guard into sim (G.Camera.sees gate before anim.update is fine, but shiny twinkle via G.FX.twinkle and anim.loop calls sit in the same method as movement/terrain/status sim). Lower priority than hurt(); note it so update() eventually splits "think/move" (sim) from "animate/sparkle" (present).

## Scope guardrails (so this does not blow up SP)
- This is DIRECTION. Do not open a big-bang refactor on feature/items mid-flight (Jess is close to SP MVP). Pay it down as you naturally touch a file.
- When you do touch a sim method that calls FX/Audio/Animator, prefer converting it to emit an event over leaving the inline call, and note it here.
- Co-op is already interleaved into game.js (G.Coop branches in hurt(), host/guest sync in the loop). The event boundary SUBSUMES this: once the sim emits events, the host can serialize the same events. Do not design a second parallel path.
- First concrete candidate when ready: lift hurt()/showHurt() onto an event emitter, and point the existing harnesses at the real path. Measure before/after that "NOT run in a browser" shrinks.

## Pointers
- Worked examples live in js/entities/enemy.js (hurt, showHurt, die, update) and js/game.js (loop, frame, update, render, drawScene).
- Related TODO: "More accurate hitboxes" (per-species collision radius from opaque pixels, offline into a data file) is the same work as offender #2, do them together.
- MP background: docs/MP-PARKED-NOTES.md (read when the cloud/MP phase begins).

## Paid down (log)
- 2026-10-22, rework/gym-progression: the event channel EXISTS now: js/core/simbus.js (G.SimBus: on, off, emit, record, stopRecording). Named SimBus because G.Events is the mid-game events system (horde, golden hour). Rules for events are in the simbus.js header: type 'area:name', plain-data payload that carries facts never display text, synchronous, a throwing subscriber is isolated, subscribers register once at boot.
- 2026-10-22: systems/gym.js is now sim-only. Its four presentation calls (escalation toast and sound, the badge line, the calm line) are events: 'gym:escalate' { leader, bump }, 'gym:calm' { leader }, 'gym:badge' { badge, stat, pct }. js/ui/gym-present.js subscribes and owns the words and the sound. The gym harness asserts the events with Spawner and Audio rigged to throw if the sim touches them, and asserts the exact toast text through the real subscriber.
- The first concrete candidate (Enemy.hurt / showHurt onto the bus) is unblocked now that the channel exists.

## Remaining gym-side offenders (convert when the next slice touches them)
- entities/enemy.js gymStart (G.FX.ring, anim.play) and gymCast (G.FX.slash, G.FX.ring, G.FX.sp, anim.play, G.FX.spark in gymShoot): the cast sim and its visuals are interleaved.
- systems/rift.js: openGate and startGym toasts (G.Spawner.say), the arena tick and won() presentation. The multi-mon arena flow (next slice) rewrites the arena tick, so convert these then.
- Reading sim state from presentation (hud.js reads G.Gym.graceLeft, escBump, enrageIn) is the allowed direction and stays.
- New pure data functions follow the same rule: G.Gyms.stageFor and G.Gyms.lineup touch no engine global except the dex table, no clock, no randomness.
