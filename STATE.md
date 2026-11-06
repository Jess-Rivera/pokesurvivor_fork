# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, planning session. Branch: feature/entity-model; slice 1 uncommitted.

## Where we are
- Onboarding (login PokeSwarm, Tab fix, region starter pick) merged to main. Not feel-tested by Jess yet.
- Host model (Jess, 2026-11-05): new terms Player entity (Player, Gym Leader, World Boss, Uber) and Wild entity (Wild Enemy, Elite). Structure approved: `PlayerEntity` and `WildEntity` bases, then sub-entities, with reusable modules and one hit contract. All decisions made; 12 slices: docs/proposals/host-model-plan.md. Slice 1 BUILT (G.WildEntity, G.Elite, no behavior change); Elites do not change (Jess).
- Gym cards are the leader's, per loop, pooled (gyms.js `cards`, G.Gyms.cardsFor). Misty loop 1 authored (13 stacks, Recover hpBelow 35%). Leader self heals capped at the loop number per mon (boss-ai.js healsLeft). Sheet of gyms 2 to 8: docs/ASCII Concept Maps/Kanto Gyms 2-8 - Mons and Moves.txt.
- check.js green (43 of 43 harnesses). boss-owner-mutate: 5 stale patterns, already stale at HEAD.

## Next (in order)
1. Jess feel-tests an Elite (G.Debug.elite(), nothing should change) and commits; then detail and approve slice 2 (Team module).
2. Misty's Sp. Def x3 (Zinc) lands at slice 6. Gym cards for gyms 3 to 8 wait for slice 12.
3. Feel tests of Misty loop 1 and onboarding wait for playtesters (Jess, 2026-11-05).
Also: delete merged branches feature/move-shop and fix/stale-mutations; Step 5 feel test; Codex menu with tooltips.

## Watch
- Old name still on the rotate prompt, noscript, legal panel, funding popup. Retired lang-en.js keys and the quiz markup and data are unused.
- Starting with 3 Pokemon changes early balance; Silver income unmeasured: judge by feel.
- Three Misty confusion pulses at 40% could keep the player confused near-permanently: Ailment Up is the first knob.
- Director AI is separate from leader AI and not in this plan; its coordinating enemies conflict with the GDD AI principle [Open].

## Open owner decisions
- Board cleanup: stale `blocked` on #5 (replaced by plan slice 7) and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
