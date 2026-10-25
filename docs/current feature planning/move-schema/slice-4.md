# Slice 4: new executors (PLACEHOLDER)

Back to slice-overview.md. Prior slice: slice-3.md.
Executors dispatch on space, delivery and payload, never on kind. Order: individual (active-member-only) buffs, special handlers one at a time with a test each, delivery extras (curve, homing, grow, return and reposition, aimTrack), emit last.

## Known engine gaps (from a search, not a full read of combat.js)
- Emit: 8 moves (discharge, gust, toxic, fairy-wind, toxic-spikes, meteor-mash, will-o-wisp, flame-wheel).
- Individual buffs: 11 of 17 stat effects. Specials: 6 moves. Delivery extras: about 10 moves. Interval re-hit: 5 moves.
- All six ailments used (burn, paralysis, poison, freeze, trap, confusion) already exist in status.js. Caster iframes (quick-attack) unverified.
