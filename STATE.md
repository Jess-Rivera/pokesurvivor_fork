# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02 (Claude Code, home; branch fix/playtest-kanto-moves, from main).

## Where we are
- Kanto import batch 1 DONE and signed off (111 moves, held out of player pools). Player learnset pools PARKED (Jess 2026-11-02: the imports are for the bosses); dataset step 1 done.
- Gym loop-1 lore sets, slice 1 BUILT, not yet feel-tested: per-loop sets in gyms.js (`sets` keyed by loop), leader recoil, leader self-heal form, Defense Curl (held from pools). Loop 1 is complete for Brock and Misty; the other six run their castable lore moves (Sabrina's Confusion is a stand-in for Psybeam). Loops 2 to 6 hold the provisional sets.
- Tests: check.js 30/30, intent harness 2151/2151, boss-owner 188 checks, gym harness ALL OK (new 10c per-loop check), smoke-ui pass (one transient ERR_FAILED in four runs; it now logs the URL), all 8 loop-1 leaders fought live on file:// and cast every move. smoke-newcombat SKIPPED (flaky).

## Next (in order)
1. Jess: feel-test loop 1 of each gym (G.Gym.debugLoop, G.Debug.gym). Sign off Defense Curl (one-move batch: defense-curl-once, defense-curl-cap).
2. Gym leader forms, one per slice: dash (Quick Attack), out-and-back (Razor Leaf), beam (Psybeam), trail (Toxic), multi-hit (Fury Attack). Then imports Roar, Future Sight, Reflect, Fissure, Self-Destruct (weight 0 knob), Smokescreen (accuracy slice). Detail: TODO.md "GYM LOOP-1 LORE SETS".
3. Then later loops, gym by gym. Recoil and heals for the Elite Four come with that phase.
4. Cone and area moves ignore walls: needs a line-of-sight ruling, own branch.
5. Readability pass (Jeremy) and part 2 (item drops, New Move card frequency). Ask Jeremy about "Bosses" and "Magnetism".
6. Economy rework once coin data comes in. Fix the smoke-newcombat flake.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] Psych Up, Baton Pass, Swagger. HUD own-drop gap (proposed). Psychic widening [Open]. Base crit for leaders (none, by D10).

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
