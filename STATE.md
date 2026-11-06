# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-06, Quick (work). Branch: feature/entity-model.

## Where we are
- Entity model plan: docs/proposals/host-model-plan.md (12 slices). Slice 1 built and committed; feel test not confirmed.
- Slice 2 (Team module) APPROVED 2026-11-06. D1: the unspent-link count becomes a shared Team store, `pl.bonds` reads it. D2: Team takes only the 5 s team lock; `pl.swapT` is the "slot hold", stays on the fighter. Map: docs/ASCII Concept Maps/Entity Model Slice 2 - Team Module.txt.
- Step 1 WRITTEN, NEVER RUN: tools/smoke-team.js (file://, team of 3). Quick cannot run node here and Playwright is not on the work machine. No team.js, no game code changed.
- check.js last green 43 of 43 (2026-11-05).

## Next (in order)
1. Home: `node tools/check.js`, then `node tools/smoke-team.js` on the CURRENT code. It must pass before anything moves; on a FAIL, find out whether the smoke or the game is wrong first. Unverified spots: the 0.4 s i-frame checks after frames pass; digit keys under a non-default key preset; file:// console noise from the deferred ranking/net layer; a spawn on liquid breaking the full-HP check after Re-Do.
2. Build slice 2: js/systems/team.js (dev.html + NEED), game.js, player.js bonds read, docs/proposals/team-harness.js (44 harnesses), docs/proposals/team-mutate.js. smoke-team stays unchanged and green.
3. Slices 3 and 4, then slice 5 (`GymLeader`, Misty first).
Also: delete merged branches feature/move-shop, fix/stale-mutations, feature/gym-upgrade-authoring; Step 5 feel test; Codex menu with tooltips.

## Watch
- Leaders fire all moves at once; one active slot at slice 8.
- Slice 4 must place STAB and the two damage scalars (1.0, 0.5) before a player can hit a Player entity.
- Two `e.elite` checks remain in the enemy manager. boss-owner-mutate: 5 stale patterns, fixed at slice 5.
- Board mirror is from 2026-11-04; the GitHub API returned empty on 11-06.
- Three Misty confusion pulses at 40% could chain-confuse: Ailment Up is the first knob.
- Director AI is not in this plan; conflicts with the GDD AI principle [Open].

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
