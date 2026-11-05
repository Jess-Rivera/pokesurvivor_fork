# Move Shop handoff for Quick (2026-11-04, end of the home session)

Read CONTEXT.md, STATE.md and CLAUDE.md first, then docs/proposals/move-shop-plan.md (the spec, it wins over this file). Branch: feature/move-shop. Last commit when this was written: 62417be, "Move Shop step 1".

## Where it stands
- Step 1 (learnset pools) is BUILT and committed. Every one of the 177 live moves has a learner, the Kanto hold is gone, and level-up cards draw from the new pools until step 5.
- Jess has NOT yet reported a feel test of step 1. Ask for the result. Worth trying: the Pokedex search ("volt" should list Pichu, Pikachu and Raichu, never checked on the real screen), Fly and Fissure in a run, the Team detail pane with up to about 22 moves.
- Steps 2 and 3 are planned below. Jess has NOT approved them yet: he asked for this handoff instead of answering. Under the CLAUDE.md edit boundary, get his OK before writing game code or adding assets. The proposal was to build 2 and 3, then pause so he can walk around with the Silver counter and arrows before the shop screens.

## Next: step 2, Silver
1. Make the 16 px silver sheet (next section).
2. A run-only counter in the upper left of the run HUD, using that sheet's first frame or its spin. Check what already sits in that corner of js/ui/hud.js first.
3. A slot machine style bump on each coin added. At high kill rates the bump must stay readable, so restart it rather than queue it.
4. Income: each kill pays world level / 10, minimum 1, and a run starts with 100. World level is G.Stats.levelForTime(t), with no escalation bump. Keep the fraction internally and show whole coins.
5. Silver never touches pl.coins or the end-of-run PokeCoins (js/game.js endRun adds pl.coins to the save). It needs no save field.

## The silver coin image (the same cut as the gold coin)
This cut was NOT made in the home session. It comes from tools/cut_pickup_gifs.py (commit 2ec3687, 2026-11-03), and the steps below were verified on 2026-11-04: run on spin_gold they reproduce assets/items/pickups/coin16.png pixel for pixel, and run in memory on oblong_silver they give a clean 142 x 16 sheet. No silver file has been written yet.

Goal: assets/items/pickups/silver16.png, 142 x 16 px, RGBA, 8 frames in one row, each 16 x 16 with a 2 px gap between frames.

Source: assets/items/coins/spin_silver.png, with spin_silver.json next to it. The sheet is palette mode, so convert it to RGBA first. Cells are 32 x 32 with a 2 px gap, so frame k starts at x = k x 34. Read the row from the JSON, do not hard-code it: frames["oblong_silver 0.png"].frame.y, which is 408 today. Frames last 125 ms each.

The cut is not a normal resize, and a normal resize would blur the pixel art. For each frame:
1. Crop (k x 34, y) to (k x 34 + 32, y + 32).
2. Make a transparent 16 x 16 image.
3. For each output pixel (x, y), look at the 4 source pixels at (2x, 2y), (2x + 1, 2y), (2x, 2y + 1) and (2x + 1, 2y + 1).
4. Keep only the opaque ones (alpha above 0). With fewer than 2, leave the output pixel transparent.
5. With 2 or more, the output pixel takes the most common of those colours, compared as whole RGBA values. A tie takes the first one reached in the order x offset 0 then 1, each with y offset 0 then 1, which is what Python's Counter.most_common does for the function below.
6. Paste the 16 x 16 result into the output sheet at (k x 18, 0).

The function already exists as cut16 in tools/cut_pickup_gifs.py, line 67. Reuse it, do not rewrite it. The gold coin is built at lines 87 to 92 of that tool, so the silver is the same block with spin_silver.png, spin_silver.json, 'oblong_silver 0.png' and silver16.png. The tool also writes js/data/pickup-sprites.js, where the gold entry is `gold: { src, y: 0, n: 8, cell: 16, ms: [125] }`; add a matching `silver` entry the same way.

Run it with: python tools/cut_pickup_gifs.py (needs Pillow and assets/raw/coins.gif), then npx prettier --write js/data/pickup-sprites.js. That rerun rewrites every pickup sheet, so check that git status shows only silver16.png and pickup-sprites.js changed.

Expected result: the alpha box of the whole sheet is (3, 2, 138, 14). The coin spins edge-on, so per-frame alpha boxes are: frame 0 (3, 2, 13, 14), 1 (4, 2, 12, 14), 2 (7, 2, 9, 14), 3 (4, 2, 12, 14), then 4 to 7 repeat those four.

Draw it with image smoothing off, as js/entities/pickup.js drawSprite does for the gold coin (16 art px at 24 world units). file:// cannot fetch JSON, which is why the game reads the layout from pickup-sprites.js and never from a JSON file.

## Then: step 3, buildings and arrows
- Art, already committed in assets/tileset: move-trainer.png (78 x 72) with move-trainer-contact.png, tm-mart.png (64 x 71) with tm-mart-contact.png, all 8-bit RGBA and non-interlaced.
- Masks: generalize tools/gym_contact.js, which bakes a PNG mask into data because Firefox blocks pixel reads on file://. Its --check is in tools/check.js.
- Pattern to follow: js/systems/gym-arena.js, onBuilding, spotClear and openGate. openGate spawns at 380 to 560 px, which can be on screen; shops must spawn beyond G.Camera.outerRadius().
- Spawns: one Trainer and one Mart at 2:00 regardless of the elite, and again 90 s after each gym return (hook: js/systems/gym.js onReturn). Over 90 degrees apart from the player. Retry shortly if the ground is blocked, as openGate's caller does. Nothing spawns inside an arena.
- Each shop lasts 1 minute on the run clock, so it pauses inside a shop screen.
- Arrows: js/ui/hud.js around line 580 draws the gym's. Shops are red. Shop and gym arrows both float about 60 px off the character (proposed: world px, so it holds at any window size), not at the screen edge. Keep the bouncing marker above an on-screen building. Watch for clutter from the gym's long label.
- Art scale: start at 1.5 (the gym is 288 x 248 drawn at 0.5, so about the same size), then tune by feel.
- Walking off and back must not retrigger entry without stepping off first.

## After that: steps 4 and 5
See the spec. Facts found while planning:
- Player.addMove (js/entities/player.js) switches to the new slot, but the spec says a purchase does not change your active slot.
- Nothing removes a move yet (no removeMove or forget in player.js or game.js), so forget or cancel needs it, including a move inside a bonded group.
- Only the active group fires, so a bought move needs its slot key. The spec asks for a line about this in the shop text.
- Step 4 should decide whether the Pokedex and Team screens list TMs. They list the level-up and egg pool only, so Draco Meteor (the one TM-only move) cannot be found there. tools/smoke-ui.js expects this.
- Step 5: js/systems/levelup.js removes the newmove family. js/game.js line 240 (the startMoves perk) also reads the pool. tools/smoke-ui.js checks a New Move card for every move and must change.

## Traps
- The income estimate of about 1 to 2 moves per shop is NOT measured. The one bot run failed: it stalled at level 3 and 24 kills, probably by learning a move that does not attack and never switching back (not confirmed). Fix the bot and measure during step 5.
- The dex has 966 species with ids up to 1024, so never filter by "id up to 966".
- js/data/learnsets.js is generated: rerun node tools/export_learnsets.js after adding moves. Harnesses with a proxied G must set G.Learnsets = null (see team-cards-harness.js).
- Skip smoke-newcombat (flaky). Test on file://. Run npm run format last.

## Parked or waiting on Jess
- gyms-only-harness comment failure: FIXED 2026-11-05 on feature/move-shop (enemies.js header comment reworded).
- tools/pack_itch.js ships all of assets/, including the 308 MB assets/tileset/_not-shipped folder. Jess said to ignore this for now. Do not build for itch without raising it.
- .gitignore line 66 ignores every subfolder of assets/tileset, so new art in a subfolder such as gyms stays out of the repo. Keep the shop art directly in assets/tileset.
- assets/tileset/_not-shipped is not in git, so it is not on the work machine unless Jess copies it.
- Still owed by Jess: the specifics of what testers found unclear (sets the tooltips work), and a call on the bench recharge test.
