# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-03, end of session (Claude Code, home; branch feature/item-rework-v2, from main after fix/ui-upgrade merged).

## Where we are
- ITEM REWORK V2. Detail, rulings and corrected build plan: docs/proposals/item-rework-v2-handoff.md (read it first for item work).
- Committed (16ff37f): one drop table (js/data/drops.js), Oran and Sitrus on kills and elites, docs/ITEMS.md.
- Committed: step 1 (3006c89: every world drop in G.Drops, Oran replaces the heal pickup, a gym leader drops one item; feel-tested good) and the Space restart fix (d7824c8). smoke-ui failed once for an unseen reason (not a region check); watch for it.
- Committed: step 1a (rock and small chest 6 HP) and step 2 (Band, Specs, Muscle Band, Wise Glasses by category; new Choice Specs, Thick Club, Light Ball, Lucky Punch, Leek), 35bc2c6. Step 3 (Eviolite with generated js/data/evolvable.js, Metal Powder, Quick Powder, Bright Powder; 45 Pokemon items) and pickup lines ("Oran Berry: heal 30% HP", G.FX.notice); Jess feel-tested step 3: good.
- NEXT: step 4, split into 4a and 4b (handoff). Not started; show Jess the no-code plan first.
- APPROVED, NOT BUILT: batch 1, steps 4 to 6 (12 ground + 10 more Pokemon items). Jess said go on all recommendations; one step at a time, feel-test between.

## Next (in order)
1. Build batch 1 steps 4a, 4b, 5 and 6 per the handoff, one at a time, with a feel-test between.
2. Jess: say if rocks, chests and the Choice items (steps 1a and 2) felt off; not reported yet.
3. Run items second pass (9 drafted, more needed before bosses go run-only), then upgrade points (TODO.md "Upgrade points catalog").
4. Before the art branch: decide sprite scale, camera zoom and Pixi (benchmark first, own branch).
5. Gameplay queue: fields slice (Reflect), accuracy trackers (Smokescreen), gym loops, line of sight for cones.

## Open owner decisions
- Run-only boss pool: how many distinct run items first (34 with the 9 drafted, 18 are Power Stones).
- Pixel density and sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+: gym mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9). Dodge: no touch button, not synced in co-op (TODO).

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); headless runs must click #tap-start first or keys go to Login.
