# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 (Claude Code, home; riders onto the player on feature/gym-roster).

## Where we are
- Branch feature/gym-roster (off main, pushed, Surge sets included). Next slice on feature/shot-reach (off feature/gym-roster). Kanto gyms 2 to 8 authored and feel-tested; utility picker in.
- This session (uncommitted until Jess commits): RIDERS ONTO THE PLAYER built. Leader hits land ailments (G.Status), foe drops on your tracker, Hex x2, crits (D10 rule; only Psycho Cut crits today), the leader's own raises and drain heal. Flinch on the player (active group cooldowns + 0.3 s hold, recoil, 0.5 s roll gap). Picker opportunity factor (1.5 / 0.75 / 1.25). Rules in COMBAT-RULES and BOSS-AUTHORING.
- Tests: check.js 30/30, boss-owner harness 164, mutations 54/54, smoke-ui pass. smoke-newcombat: all functional checks ok, one resource-load flake per run (different page each time).
- Surge's real Electric sets built (Thunder Shock on 5 of 6 mons, Thunderbolt on the ace below 50% HP; js/data/gyms.js). First cut if too harsh: Voltorb's Thunder Shock.
- Needs Jess's feel run: Surge, a Bite gym and a Body Slam / Lick gym (paralysis and flinch now land; balance risk).

## Next (in order)
1. SHOT REACH FROM FLIGHT (Jess 2026-11-01, branch feature/shot-reach off feature/gym-roster): a leader's shot is a candidate only while you are within what it can actually fly, speed x lifetime + size, instead of the 420 px default range. Fixes every slow shot; the case is Psychic (TODO "Gym follow-ups" (e): 80 px/s for 1.2 s, 70 px wedge, about 166 px, never lands from the far stance's 170 to 300 px). Code: G.Gyms.reachOf (js/data/gyms.js), read by boss-ai.js attack(). Open for the plan: the far stance band (170 to 300 px) vs a short shot's reach (should the brain walk in for it?), and homing shots (Confusion) that turn in flight.
2. Tune gyms 2 to 8. Redo the two lore moveset maps to the Gen-1 order.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open]. Base crit for leaders (currently none, by D10).

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2 (movement scoring), js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
