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
- [Approved] Step 3 rulings (Jess 2026-11-05, docs/ASCII Concept Maps/Move Shop step 3 - Buildings and arrows.txt F1 to F5): the gym's off-screen arrow also floats off the character (changes the old screen-edge arrow). Until step 4, walking in shows a one-line "opens soon" notice. The label shows seconds left and blinks for the last 10 s; the building fades out over the last 1 s. In a gym arena the shops are hidden and their minute stops. No shops in co-op until co-op shops exist. Doors spawn at the view radius + 140 to + 320 world px; if either finds no free ground, both retry 2 s later.
- [Approved] Entering pauses the run. Never over another menu. (Jess 2026-11-05, step 4 G3/G4)

## Move Trainer
- [Approved] Shows your roster on the left. The selected member shows a random 4 moves from its level-up and egg pool, ignoring learn levels.
- [Approved] Pick any roster member freely and buy any number of moves for any member.
- [Approved] Selecting a member only chooses who you are shopping for. It does not swap your active Pokemon.
- [Approved] A move the member already knows is not offered, and a bought move leaves its stock. Each member's 4 are rolled once per building, so leaving and returning cannot reroll them. You can walk back in while the building lasts, after stepping off it. (Jess 2026-11-05, step 4 G3/G4)

## TM Mart
- [Approved] Shows your roster on the left and a random 4 TMs, entirely random, so one or more may be unlearnable by your team.
- [Approved] Any TM can be bought any number of times. Each purchase applies it to a single Pokemon that can learn it.
- [Approved] A Pokemon can use a TM when the move is on its TM list or its level-up and egg pool. Members who cannot, or who already know it, are shown as unavailable. (Jess 2026-11-05, step 4 G3/G4)

## Full slots
- [Approved] You can buy until all 4 slots are full. Buying another then asks you to forget a move or cancel.
- [Approved] Bonds are fixed (Jess 2026-11-05): the shop can never forget or replace a bonded move, so the forget step offers loose moves only. A bond changes only through the normal bond screen. A member whose slots are all bonds cannot buy.
- [Approved] Every purchase asks first in the in-game dialog (G.UI.ask), at the moment you would pay; Cancel buys nothing and returns to the offers, or on a forget, to the forget list (Jess 2026-11-05, step 4b, H2). Nothing else in the shop works while the dialog is open.
- [Approved] Ban becomes Shop Rerolls (Jess 2026-11-05, step 4c R1 to R5): every shop building has 1 free reroll (R2), shared by the team (R3), free (R4); R re-rolls the offers for the Pokemon you are shopping for, or the Mart's 4 TMs, avoiding the 4 just shown when the pool allows. The Upgrades catalog's Card Banish is renamed Shop Rerolls (+1 per building per rank, once upgrade points are wired). Old saved bans no longer filter anything (R5); save.pban is kept, unread.
- [Approved] You pay when the purchase is confirmed. A forgotten move gives no refund. The 2-buff learn limit still applies. A purchase does not change your active slot. (Jess 2026-11-05, step 4 G3/G4)

## Pools
- [Proposed] Learnsets come from every game in pokeapi-master/data/v2/csv/pokemon_moves.csv, baked to a generated data file, since file:// cannot fetch and the latest-game dataset (api_learnset_dataset.lean.json) drops too much: 68 species have no TMs in it, Machamp and Alakazam among them.
- Measured for the 177 live moves and the 966 species in the dex, all games: level-up and egg median 9 per species, TM median 19. Every move has a learner. Volt Tackle is the one given by hand (the Pikachu line, tools/export_learnsets.js HAND). Draco Meteor is the one TM-only move. 15 species have no TMs (Caterpie, Ditto, Unown...).
- [Approved] 48 species have under 4 level-up and egg moves (Magikarp 1, Ditto 0). They top up to 4 from their types, then Normal, attacks first, so a Trainer always has stock. Built, step 1.
- [Approved] G.Moves.HELD is gone. Learn levels are ignored. Starting moves are unchanged. Built, step 1.
- [Approved] TMs on the Pokedex and Team screens: later, not in step 4 (Jess 2026-11-05, G2; TODO.md). Until then Draco Meteor, the one TM-only move, is found only in a TM Mart.

## Silver
- [Approved] An in-run currency, Silver, shown in the upper left corner with a counter, using oblong_silver from assets/items/coins/spin_silver.png (row at y 408, 8 frames of 32 px, data in spin_silver.json).
- [Approved] A tactile bump on each coin added, slot machine style.
- [Approved] Each kill pays world level / 10, minimum 1. A run starts with 100.
- [Approved] Price per move: 5 x world level x character level, from the concept map.
- [Approved] Silver is run-only, so it needs no save field. It never adds to PokeCoins, and unspent Silver is lost at the end of the run. World level is the enemy level for the run time (G.Stats.levelForTime). (Jess 2026-11-05, step 2 plan)
- [Approved] Step 2 rulings (Jess 2026-11-05, docs/ASCII Concept Maps/Move Shop step 2 - Silver.txt D1 to D4): the bump is a pop of about 1.3x for 0.18 s on the number only (the coin keeps spinning, no coin bounce; Jess 2026-11-05 after the feel test), restarted on every gain and never queued, the coin's and the digits' bottoms on one ground line, sized up 50% after the feel test (coin 36 px, number 30; Jess 2026-11-05), plus a number that rolls up like a slot reel and lands within 0.25 s of the last gain. Silver is hidden in co-op until co-op shops exist. Every kill pays the same formula, elites, bosses and gym mons included. No sound per coin.
- Estimate, not measured: about 1 to 2 moves per shop if kills keep up with spawns. No income bot (Jess 2026-11-05): judged by feel in playtests, and the price or income are tuned from there.

## Level-ups
- [Approved] New Move cards leave the level-up screen once the shops are in (concept map). BUILT 2026-11-05 (step 5): moves come from the shops only, plus the starting move and the old Starting Moves perk.
- Note: only the active group fires, so a bought move needs its slot key to be used. Worth a line in the shop text.

## Build order
1. BUILT 2026-11-04. Learnset pools: js/data/learnsets.js from tools/export_learnsets.js, G.Moves.poolFor, tmList and canUseTm, HELD gone, level-up cards and the move search read the new pool. Check: docs/proposals/learnset-harness.js.
2. BUILT 2026-11-05 (Quick), feel-tested by Jess the same day. Silver: js/systems/silver.js (G.Silver), the HUD counter (js/ui/hud.js drawSilver), kill income (js/entities/enemy.js kill loop), reset in startRun, assets/items/pickups/silver16.png, G.Debug.silver. Check: docs/proposals/silver-harness.js, mutations silver-mutate.js.
3. BUILT 2026-11-05 (Quick), feel test pending. Buildings: js/systems/shops.js (G.Shops), masks baked to js/data/shop-contact.js by tools/gym_contact.js, schedule hook in js/systems/gym.js onReturn, game.js reset / update / scene, hud.js floatArrow (gym and shops), G.Debug.shops. Check: docs/proposals/shops-harness.js, mutations shops-mutate.js.
4. BUILT and feel-tested 2026-11-05 (Quick). Shop screens: js/ui/shop-ui.js (G.ShopUI) and the scr-shop screen, stock, price, check and buy in js/systems/shops.js, Player.addMove stay option and Player.replaceMove, G.Game.openShop (pause, never over another screen, holds back the bond screen), G.Debug.trainer / mart. 4b purchase confirm and 4c Shop Rerolls also feel-tested. Check: docs/proposals/shop-screens-harness.js, mutations shop-screens-mutate.js.
5. BUILT 2026-11-05 (Quick), feel test pending. New Move cards removed (levelup.js, the run-ui chip); smoke-ui checks a Move Trainer offer for every move; ui-readers and team-cards harnesses check no New Move card is offered. Build order complete.

## Deferred
Co-op shops (local-first): note in TODO.md when step 4 lands. Replacing the 4-move stock count, shop sounds and final art scale are TUNE during the feel tests.
