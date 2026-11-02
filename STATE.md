# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02 (Claude Code, home; branch fix/playtest-kanto-moves, from main).

## Where we are
- Kanto import batch 1 DONE and signed off (111 moves, held out of player pools). Player learnset pools PARKED (Jess 2026-11-02: the imports are for the bosses).
- Gym loop-1 lore sets: slices 1 (per-loop sets, recoil, self-heal, Defense Curl), 2 (dash form, Lt. Surge Quick Attack) and 3 (returns, beam, burst, trail forms: Erika Razor Leaf, Sabrina Psybeam, Giovanni Fury Attack, Koga Toxic) BUILT. None feel-tested yet. Loop 1 is complete for all 8 except the moves still to import. Loops 2 to 6 hold the provisional sets.
- Tests: check.js 30/30, boss-owner 228 checks (17: slice-3 forms), gym harness ALL OK, live loop-1 fights of Erika, Koga, Sabrina, Giovanni on file:// (every new move cast, no page errors). smoke-newcombat SKIPPED (flaky).

## Next (in order)
1. Jess: feel-test loop 1 of each gym (G.Gym.debugLoop, G.Debug.gym). Watch: Lt. Surge's dash tell (0.6 s TUNE), Razor Leaf up to 4 hits point blank (a player dead centre at about 150 px slips between the leaves), Koffing's Toxic trail keeping you poisoned, the new tells (0.5 s returns and beam, 0.45 s burst, all TUNE).
2. Imports: Roar (Blaine), Future Sight and Reflect (Sabrina), Fissure (Giovanni), Self-Destruct (a closer below about 20% HP), Smokescreen (accuracy slice). Detail: TODO.md "GYM LOOP-1 LORE SETS".
3. Then later loops, gym by gym (Psycho Cut still stands in for Psybeam on Porygon and Venomoth). Recoil and heals for the Elite Four come with that phase.
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
