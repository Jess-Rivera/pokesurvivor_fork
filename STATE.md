# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-04, end of session (Quick, work machine). Branch: feature/pokeboxes, not merged to main.

## Where we are
- POKEBOX steps 1 to 5 BUILT, checked and feel-tested by Jess (2026-11-04).
  - Step 4: a team copy's IVs and nature feed its run stats (G.Stats.profile, G.Copies.profileOf). Enemies 0 IV, neutral.
  - Step 5: EVs from kills into six typed run banks (wild 1/1000, elite 1/500, gym 1x, shiny x2), given out on the "Train your team" screen after the run (#scr-evs), 252 per stat, 510 per Pokemon. Design: docs/proposals/ev-progression.md. Rates are TUNE before playtesters (BALANCE.md "EVs").
  - Ride-along: the dead timed-boss data (BOSS_SLOTS, bossScale, BOSSES) removed from js/data/enemies.js.
- Step 5b (EV-lowering berries) PARKED: Jess is designing the UI in Photoshop at home. Plan map: docs/ASCII Concept Maps/Pokebox 5b - EV-Lowering Berries.txt, decisions G1 to G6 open; the map's panel layout is a placeholder, the mockup wins. Suggested home for mockups: docs/mockups/.
- Spec, rulings, status: docs/proposals/pokebox-plan.md. Maps: docs/ASCII Concept Maps/Pokebox 4 and 5.

## Next
1. Step 5b once the mockups are in the repo: settle G1 to G6, then build.
2. Move tuning: moves from the 10 min playtest, not named yet (#18 Quick Attack / Aerial Ace may be one). Check each against docs/MOVE-INTENT.md, then a plan.
3. Run items second pass, then upgrade points (TODO.md "Upgrade points catalog").
4. Gameplay queue: fields slice (Reflect, #20), accuracy trackers (Smokescreen, #21), gym loops, line of sight for cones.
PARKED: item batch 1 steps 4 to 6 (docs/proposals/item-rework-v2-handoff.md).

## Watch
- smoke-ui has been flaky (passes on rerun); check.js reports lint errors warn-only.
- After big multi-edit builds, recheck markers (a stale-copy edit once overwrote menu.js work).
- At 1280 x 720 the Team detail pane scrolls after about two rows of moves; step 5 added an EVs row.
- Board mirror in TODO.md was not re-synced at this wrap-up (GitHub API returned empty); last good sync this morning.

## Open owner decisions
- Board cleanup (TODO.md Board mirror): stale `blocked` on #5 and #11, stale labels on closed issues, Pokebox has no issue.
- Run-only boss pool size; pixel density and sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+: gym mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Step 5b; nicknames in runs and nickname search (TODO); co-op IVs and EVs (deferred). Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9), item batch 1 steps 4 to 6.

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); headless runs must click #tap-start first or keys go to Login.
