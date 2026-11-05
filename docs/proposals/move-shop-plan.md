# Move Shop (plan, 2026-11-04)

Source: Jess's design, 2026-11-04, which replaces docs/ASCII Concept Maps/Move Shop.txt where they differ. Branch: feature/move-shop. Tags are defined in CLAUDE.md. The gacha overhaul is a separate branch and is not part of this plan.

## Why
Playtesters asked for it, Jeremy's notes say there are not enough new move upgrades, and it opens the imported moves to players: only 62 of the 178 moves can reach a player today (115 are in G.Moves.HELD, Hail is retired).

## Shops on the map
- [Approved] A shop is a physical building you walk into, using a contact mask like the gyms. Art: assets/tileset/move-trainer.png and tm-mart.png, masks move-trainer-contact.png and tm-mart-contact.png.
- [Approved] A shop always spawns off screen.
- [Approved] A shop has a red arrow, where the gym's is purple. Both the shop and gym arrows float about 60 px off the character, not at the screen edge.
- [Approved] Two shops, one Move Trainer and one TM Mart, spawn at the 2 minute mark, regardless of the elite. (Jess 2026-11-04)
- [Approved] Two shops, one of each, spawn again 90 s after coming back from a gym. (Jess 2026-11-04)
- [Approved] The two are always more than 90 degrees apart as seen from the player, both off screen.
- [Approved] A shop stays for 1 minute, then it is gone. (Jess 2026-11-04)
- [Proposed] Entering pauses the run. Never over another menu.

## Move Trainer
- [Approved] Shows your roster on the left. The selected member shows a random 4 moves from its level-up and egg pool, ignoring learn levels.
- [Approved] Pick any roster member freely and buy any number of moves for any member.
- [Approved] Selecting a member only chooses who you are shopping for. It does not swap your active Pokemon.
- [Proposed] A move the member already knows is not offered, and a bought move leaves its stock. Each member's 4 are rolled once per building, so leaving and returning cannot reroll them. You can walk back in while the building lasts, after stepping off it.

## TM Mart
- [Approved] Shows your roster on the left and a random 4 TMs, entirely random, so one or more may be unlearnable by your team.
- [Approved] Any TM can be bought any number of times. Each purchase applies it to a single Pokemon that can learn it.
- [Proposed] A Pokemon can use a TM when the move is on its TM list or its level-up and egg pool. Members who cannot, or who already know it, are shown as unavailable.

## Full slots
- [Approved] You can buy until all 4 slots are full. Buying another then asks you to forget a move or cancel.
- [Proposed] You pay when the purchase is confirmed. A forgotten move gives no refund. The 2-buff learn limit still applies. A purchase does not change your active slot.

## Pools
- [Proposed] Learnsets come from every game in pokeapi-master/data/v2/csv/pokemon_moves.csv, baked to a generated data file, since file:// cannot fetch and the latest-game dataset (api_learnset_dataset.lean.json) drops too much: 68 species have no TMs in it, Machamp and Alakazam among them.
- Measured for the 177 live moves and the 966 species in the dex, all games: level-up and egg median 9 per species, TM median 19. Every move has a learner. Volt Tackle is the one given by hand (the Pikachu line, tools/export_learnsets.js HAND). Draco Meteor is the one TM-only move. 15 species have no TMs (Caterpie, Ditto, Unown...).
- [Approved] 48 species have under 4 level-up and egg moves (Magikarp 1, Ditto 0). They top up to 4 from their types, then Normal, attacks first, so a Trainer always has stock. Built, step 1.
- [Approved] G.Moves.HELD is gone. Learn levels are ignored. Starting moves are unchanged. Built, step 1.
- Note: the Pokedex and Team screens list the level-up and egg pool only. Step 4 decides whether they also list TMs, so Draco Meteor can be found.

## Silver
- [Approved] An in-run currency, Silver, shown in the upper left corner with a counter, using oblong_silver from assets/items/coins/spin_silver.png (row at y 408, 8 frames of 32 px, data in spin_silver.json).
- [Approved] A tactile bump on each coin added, slot machine style.
- [Approved] Each kill pays world level / 10, minimum 1. A run starts with 100.
- [Approved] Price per move: 5 x world level x character level, from the concept map.
- [Proposed] Silver is run-only, so it needs no save field. It never adds to PokeCoins, and unspent Silver is lost at the end of the run. World level is the enemy level for the run time (G.Stats.levelForTime).
- Estimate, not measured: about 1 to 2 moves per shop if kills keep up with spawns. A fixed bot checks this during the build.

## Level-ups
- [Approved] New Move cards leave the level-up screen once the shops are in (concept map).
- Note: only the active group fires, so a bought move needs its slot key to be used. Worth a line in the shop text.

## Build order
1. BUILT 2026-11-04. Learnset pools: js/data/learnsets.js from tools/export_learnsets.js, G.Moves.poolFor, tmList and canUseTm, HELD gone, level-up cards and the move search read the new pool. Check: docs/proposals/learnset-harness.js.
2. Silver: the counter, kill income, the bump.
3. Buildings: contact masks, spawn rules, red arrows, both arrow types float off the character.
4. Shop screens: Move Trainer, TM Mart, forget or cancel, a debug command to open each.
5. Remove New Move cards, update smoke-ui (it expects them), docs and changelog.

## Deferred
Co-op shops (local-first): note in TODO.md when step 4 lands. Replacing the 4-move stock count, shop sounds and final art scale are TUNE during the feel tests.
