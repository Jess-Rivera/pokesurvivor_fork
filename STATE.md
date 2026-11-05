# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-04, end of session (Claude Code, home). Branch: feature/move-shop. QUICK: read docs/proposals/move-shop-handoff.md next.

## Where we are
- POKEBOX steps 1 to 5 merged to main. Step 5b (EV-lowering berries) PARKED until Jess's mockups are in docs/mockups/; settle G1 to G6 (docs/ASCII Concept Maps/Pokebox 5b - EV-Lowering Berries.txt), then build on its own branch off main.
- MOVE SHOP in progress: spec docs/proposals/move-shop-plan.md. Step 1 (learnset pools, all 177 moves reachable) BUILT, feel test not reported. Steps 2 and 3 (Silver, buildings) planned, NOT yet approved by Jess; then 4 and 5.
- Playtest round 1 balance merged, with Jess's playtesters: smaller novas and Flamethrower, Area Up adds covered area on every shape, far fewer wild drops. Numbers: BALANCE.md "Moves" and "Drops / economy".

## Playtester feedback (2026-11-04)
Move Shop wanted; nova and cone with Area Up dominant (fixed, watch); unclear UX (specifics owed by Jess); no reason to switch off your best Pokemon (benched Pokemon do not recharge, ruling 2026-10-20).

## Next (major features, Jess picks)
1. Move Shop steps 2 to 5 (handoff above). Gacha overhaul is its own later branch.
2. Tooltips and explanations: one mechanism, then the top confusions; G.MoveInfo already generates move text.
3. Encounter project: Director AI (docs/Director AI Proposal.md), routes per region (no notes yet), then the hard type chart last.
4. Small candidates: bench recharge test (reverses a ruling), the wall bug (Flamethrower through walls), Wide Lens (about +32% area).
Older queue: run items, upgrade points, #20, #21, gym loops.

## Watch
- tools/pack_itch.js ships all of assets/, including the 308 MB _not-shipped folder; a skip is parked by Jess.
- check.js has ONE known failure, already on main: gyms-only-harness search guard trips on a comment at js/data/enemies.js:34 (Pokebox step 5). Fix is a one-line rewording; awaiting Jess's OK.
- Next playtest: early game pace, Hyper Voice worth taking, Area Up on melee, gym leaders with these moves.
- smoke-ui can be flaky (rerun); check.js lint is warn-only.
- Board mirror in TODO.md not re-synced since the morning of 2026-11-04.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11, stale labels on closed issues; Pokebox and Move Shop have no issue.
- Boss pool size; sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+: gym mons share raises. O4: badge stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Step 5b; nicknames in runs and search (TODO); co-op IVs and EVs (deferred). Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js hooks, regional forms (#9), item batch 1 steps 4 to 6 (parked).

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
