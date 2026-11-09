## 2026-11-09, #50 opening: the cooldown window's `memoryUse` reading and its code baseline (Jess)
The worked example contradicted itself (Misty's numbers closed each edge by `memoryUse`, Brock's by 1 minus it). Ruled (a): on a clean gap each edge closes on the gap by `memoryUse` itself, so a higher value learns you faster. Brock's corrected example: 0.2 to 2.0, gap 1.2, 0.8 gives 1.0 to 1.36.
Code baseline (the default leader until #39): `memoryUse` 0.5, starting width 1.8 s (centered on the move's base cooldown), minimum width 0.2 s.
Bench cooldowns stay open (they change every Player entity, HumanPlayer too, so Jess is holding the call). Until then Belief mirrors the live rule (player.js benchUpdate: a benched member's cooldowns do not tick), in one place, so the ruling changes both together.
Canonical: docs/LEADER-AI.md "The Decider (#49)" (COOLDOWN WINDOW)
