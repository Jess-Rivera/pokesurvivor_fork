# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 (Claude Code, home; shot reach on feature/shot-reach).

## Where we are
- Branch feature/shot-reach (off feature/gym-roster). Riders onto the player and Surge's Electric sets are committed and feel-tested (good for now).
- This session (uncommitted until Jess commits): SHOT REACH FROM FLIGHT built. A leader's shot is a candidate only within speed x lifetime + size, capped at its range (420 default); homing gets no turn credit. Far stance shrinks to the longest ready shot or strike's reach (minus 20 px) so a Psychic user walks in to land it. Rule: docs/BOSS-AUTHORING.md REACH. Code: G.Gyms.reachOf (js/data/gyms.js), GymBrain.ranged() and far mode in js/entities/boss-ai.js.
- Tests: check.js 30/30, boss-owner harness 175, mutations 58/58, smoke-ui pass. smoke-newcombat SKIPPED until its flake is fixed (Jess; TODO Backlog).
- Feel check for Jess: a Shadow Ball / Rock Throw / Mud Shot user holds fire beyond ~345 to 373 px now; no gym uses Psychic yet.

## Next (in order)
1. Tune gyms 2 to 8 (power, tempo, cards). Redo the two lore moveset maps to the Gen-1 order.
2. Fix the smoke-newcombat flake, then restore it to the routine.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open]. Base crit for leaders (currently none, by D10).

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2 (movement scoring), js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
