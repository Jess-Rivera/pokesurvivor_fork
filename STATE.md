# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, end of session (Claude Code). Branch: feature/entity-model (from main; the gym branch is merged).

## Where we are
- Entity model (Jess, 2026-11-05): `PlayerEntity` base (`HumanPlayer`, `GymLeader`, later `WorldBoss`, `Uber`) and `WildEntity` base (`Elite`), with reusable modules and one hit contract. Each family owns its attack and defense calculations. These terms replace strong host and weak host. Plan with all decisions and 12 slices: docs/proposals/host-model-plan.md.
- Slice 1 BUILT and committed: G.WildEntity (G.Enemy still names it), G.Elite in js/entities/elite.js holds only the mods. No behavior change; Elites do not change (Jess). Feel test not confirmed.
- Slice 2 (Team module) PLANNED, detail in the plan, awaiting Jess's OK. No slice 2 code written.
- Gym cards are the leader's, per loop, pooled. Misty loop 1 authored; merged to main, not feel-tested. Onboarding merged, not feel-tested (both wait for playtesters).
- check.js green (43 of 43 harnesses). boss-owner-mutate: 5 stale patterns, fixed at slice 5.

## Next (in order)
1. Jess OKs slice 2; build it, starting with tools/smoke-team.js passing on the CURRENT code before anything moves.
2. Slices 3 (`PlayerEntity` and `HumanPlayer`) and 4 (hit contract), each planned as it comes up. Slices 1 to 4 change nothing in play.
3. Slice 5: `GymLeader`, Misty first. Her Zinc x3 lands at slice 6. Gym cards for gyms 3 to 8 wait for slice 12.
Also: delete merged branches feature/move-shop, fix/stale-mutations and feature/gym-upgrade-authoring; Step 5 feel test; Codex menu with tooltips.

## Watch
- Leaders still fire all moves at once (a playtester saw it, Jess calls it a bug); one active slot lands at slice 8.
- Slice 4 must place STAB and the two damage scalars (1.0, 0.5) before a player can hit a Player entity.
- Two `e.elite` checks remain in the enemy manager (bosses stat, no relocating); could move into `Elite`.
- tools/smoke-ui.js runs over http; Jess plays on file://, so check both.
- Old name still on the rotate prompt, noscript, legal panel, funding popup. Starting with 3 Pokemon changes early balance; Silver income unmeasured.
- Three Misty confusion pulses at 40% could keep the player confused near-permanently: Ailment Up is the first knob.
- Director AI is separate from leader AI and not in this plan; its coordinating enemies conflict with the GDD AI principle [Open].

## Open owner decisions
- Board cleanup: stale `blocked` on #5 (replaced by plan slice 7) and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
