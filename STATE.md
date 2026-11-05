# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-04, evening (Claude Code, home). Branch: fix/playtest-round-1, merging to main.

## Where we are
- POKEBOX steps 1 to 5 merged to main. Step 5b (EV-lowering berries) PARKED until Jess's mockups are in docs/mockups/; settle G1 to G6 (docs/ASCII Concept Maps/Pokebox 5b - EV-Lowering Berries.txt), then build on its own branch off main.
- Playtest round 1 balance BUILT and feel-tested by Jess, going out to playtesters: smaller novas and Flamethrower, Area Up adds covered area on every shape, far fewer wild drops. Numbers: BALANCE.md "Moves" and "Drops / economy".

## Playtester feedback (2026-11-04)
Move Shop wanted; nova and cone with Area Up dominant (fixed, watch); unclear UX (specifics owed by Jess); no reason to switch off your best Pokemon (benched Pokemon do not recharge, ruling 2026-10-20).

## Next (major features, Jess picks)
1. Move Shop: concept map docs/ASCII Concept Maps/Move Shop.txt; no spec yet. Needs a gold economy check on its prices. Recommended first. Gacha overhaul has no definition yet; Jess to say what changes.
2. Tooltips and explanations: one mechanism, then the top confusions; G.MoveInfo already generates move text.
3. Encounter project: Director AI (docs/Director AI Proposal.md, phase 1 is a fixed threat budget), routes per region (no notes in the repo yet), then the hard type chart last. Risk: one-slot players on a resistant route have nothing to swap to.
4. Small candidates: bench recharge test (reverses a ruling, needs Jess's call), the wall bug from Jeremy's notes (Flamethrower through walls), Wide Lens still scales radius directly (about +32% area).
Older queue: run items, upgrade points, fields (#20), accuracy trackers (#21), gym loops.

## Watch
- check.js has ONE known failure, already on main: gyms-only-harness search guard trips on a comment at js/data/enemies.js:34 (Pokebox step 5). Fix is a one-line rewording; awaiting Jess's OK.
- Next playtest: early game pace with less reach and healing, Hyper Voice worth taking, Area Up on melee, gym leaders with these moves.
- smoke-ui can be flaky (rerun); check.js lint is warn-only.
- Board mirror in TODO.md not re-synced since the morning of 2026-11-04.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11, stale labels on closed issues; Pokebox and Move Shop have no issue.
- Boss pool size; sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+: gym mons share raises. O4: badge stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Step 5b; nicknames in runs and search (TODO); co-op IVs and EVs (deferred). Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js hooks, regional forms (#9), item batch 1 steps 4 to 6 (parked).

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
