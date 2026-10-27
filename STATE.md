# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-26 (Claude Desktop, coding chat; slice 3c built).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slices 1, 2, 3a, 3b and 3c BUILT. None change gameplay; the game loads none of the new move files.
- Planning docs (all in docs/current feature planning/): combat-architecture.md (APPROVED), combat-validation-and-handoff.md, move-consistency-review.md (section 9 is the single source for decisions). Slice files: docs/current feature planning/move-schema/, start at slice-overview.md.
- Slice 3c: js/systems/move-sim.js (G.MoveSim) and move-effects.js (damage only), harness docs/proposals/move-sim-harness.js (1,930 checks), golden numbers move-sim-golden.py, mutation runner move-sim-mutate.js (24/24 caught). Also shapeOf now scales beam length with the lens, and G.Status.fizzle takes an optional rng (only game-loaded file touched, default unchanged).
- Decided in 3c (S1 to S10, see slice-3c.md): reach-based cast gate for caster static shapes, direction gate on range, aim = owner.aim, turnRate re-pick once, setView for offScreen, pierce counts distinct enemies in sweep order, roots act in their cast frame, nearest ties by id.
- check.js: 19/19 harnesses, I1 guard ok (3 files). ONE known failure: move_parity self-test "empty override" hard-codes hail (test defect).

## Next (in order)
1. Slice 3d (playable behind ?newcombat with a hitbox overlay) in a fresh coding chat. Read slice-3d.md and the "Contracts for 3d" in slice-3c.md.
2. Decide for 3d: do player moves hit props (and do solid props spend pierce, as legacy); Tackle reach feel (no player-body term); ranged moves lost boss priority.
3. Still undecided from 3a: fix the move_parity hail self-test; review section 2.4 validator rules; deep-freeze G.MoveDefs (I2).
4. Still open: orbit radius lens (4c); maxStacks for Leaf Storm and Metal Claw (before 4a); Gust per-shot spread (before 4d); six unowned issues (review 9.7).

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
