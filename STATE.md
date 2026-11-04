# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-04, end of session (Quick, work machine). Branch: feature/pokeboxes, not merged to main.

## Where we are
- POKEBOX step 3 is BUILT and every rule approved (2026-11-04, nine microsteps, one ASCII map each in docs/ASCII Concept Maps/Pokebox 3a-* and 3b-*). Jess ran check.js, the mutation runner (56/56), smoke-ui and format: all good. Not yet feel-tested as a whole.
- What step 3 added: buying Box 3 to 5 from coin price tabs; every source (gacha, rescue, wild shiny, starter, debug) makes a copy through G.DB.obtain, fill removed, no repeat payouts; selling from the box and gacha cards; full boxes warn on a pull and sell on arrival; lock and favorite; nicknames (16, cleaned); Favorites and Locked filter chips; bulk sell (Select mode, Select repeats, gacha Sell repeats).
- Fixes: the top bar coins, the box price tabs and the Shop buttons now redraw on every save write (G.DB.onSave). New debug: G.Debug.tickets(n, m), G.Debug.fillBoxes(leave).
- Spec, rulings and status: docs/proposals/pokebox-plan.md. Prices: BALANCE.md.

## Next
1. Pokebox step 4: IVs and natures apply to stats (G.Stats), the first balance change. No-code plan first.
2. Step 5 (EVs), after the step 5 [Open] list in the plan.
3. Move tuning: Jess has moves from the 10 min playtest, not named yet (#18 Quick Attack / Aerial Ace may be one). Check each against docs/MOVE-INTENT.md, then a plan.
4. Run items second pass, then upgrade points (TODO.md "Upgrade points catalog").
5. Gameplay queue: fields slice (Reflect, #20), accuracy trackers (Smokescreen, #21), gym loops, line of sight for cones.
PARKED: item batch 1 steps 4 to 6 (docs/proposals/item-rework-v2-handoff.md). Do not start unless Jess reopens them.

## Watch
- smoke-ui has been flaky (passes on rerun); check.js reports lint errors warn-only.
- After big multi-edit builds, recheck markers: one stale-copy edit overwrote menu.js work on 2026-11-04.
- At 1280 x 720 the Team detail pane scrolls after about two rows of moves (the Sell row adds height).

## Open owner decisions
- Board cleanup (TODO.md Board mirror lists them): stale `blocked` on #5 and #11, stale labels on closed issues, Pokebox has no issue.
- Run-only boss pool size; pixel density and sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+: gym mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Pokebox steps 4 and 5; nicknames in runs and nickname search (TODO). Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9), item batch 1 steps 4 to 6.

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); headless runs must click #tap-start first or keys go to Login.
