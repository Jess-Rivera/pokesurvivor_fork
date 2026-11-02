# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 (Claude Code, home; feature/gym-roster done, merging to main).

## Where we are
- feature/gym-roster is DONE (Jess 2026-11-01): all Kanto gym rosters in, riders, Surge sets and shot reach feel-tested. Fast-forwarded into main; next branches start from main. Gym cards wait for playtester feedback.
- SHOT REACH FROM FLIGHT built and feel-tested (Jess: feels good). A leader's shot is a candidate only within speed x lifetime + size, capped at its range (420 default); homing gets no turn credit. Far stance shrinks to the longest ready shot or strike's reach (minus 20 px) so a Psychic user walks in to land it. Rule: docs/BOSS-AUTHORING.md REACH. Code: G.Gyms.reachOf (js/data/gyms.js), GymBrain.ranged() and far mode in js/entities/boss-ai.js.
- Tests: check.js 30/30, boss-owner harness 175, mutations 58/58, smoke-ui pass. smoke-newcombat SKIPPED until its flake is fixed (Jess; TODO Backlog).
- No gym uses Psychic yet, so the walk-in has only been seen in the harness.
- Also this session: docs/KANTO-BOSS-MOVE-IMPORTS.md (177 moves to import, decisions-needed breakdown) and tools/move-lab.html (load a gym's loop lineup, set each mon's cards, see the folded moves, copy the gyms.js blocks).

## Next (in order)
1. Playtesters run the gyms (rosters as built; only Brock's slot 1 has cards). Then add cards and tune power and tempo from their feedback (tools/move-lab.html). Redo the two lore moveset maps to the Gen-1 order.
2. Kanto move imports: the ~24 rulings in docs/KANTO-BOSS-MOVE-IMPORTS.md "Decisions needed", then import in batches. File the Hail toggle issue if missing (D-HAIL).
3. Fix the smoke-newcombat flake, then restore it to the routine.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open]. Base crit for leaders (currently none, by D10).

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2 (movement scoring), js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
