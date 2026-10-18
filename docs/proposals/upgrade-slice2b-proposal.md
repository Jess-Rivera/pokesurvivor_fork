# Upgrade rework, slice 2b proposal: mechanic cards go live

Status: PROPOSAL, built and tested in a work copy, NOT applied. 2026-10-18.
Diff: `upgrade-slice2b.diff` (13 files, dry-run clean against the committed 2a state).
Tests: `upgrade-slice2b-harness.js` (offline logic) plus a headless Chromium run of the real screens (results below).
Builds on: `upgrade-slice2-proposal.md` (section 3), your answers 1-7, and 2a (committed).

## What the player sees

1. Level-up: three cards, drawn by family (new move, DPS, Coverage, Utility). Mechanic cards show a step chip ("+15%") and a class tag, and list the moves on the team that can take them.
2. Pick a mechanic card: a Pokemon list appears (team order, key hints are the team swap keys H J K L ; '). Pokemon with no eligible move are dimmed. Fainted Pokemon stay eligible and are tagged "Fainted".
3. Pick a Pokemon: its moves appear. Ineligible moves are dimmed with the reason ("Has no arc", "Arc is already 360°", "Does no damage"). Eligible rows show the concrete text and the before/after number: "+15% Recharge Speed (0.7 s to 0.609 s)". A "+N" chip shows stacks already on that move.
4. If a step has exactly one legal choice it is highlighted for 0.7 s and taken. Click or key skips the wait. Back (button or Backspace) goes one step back; from a move step that followed an auto-skipped Pokemon step it returns to the cards. Rerolls work on the card step only.
5. New Move cards behave as before (active Pokemon, no extra steps).
6. HUD: the move slot shows a "+N" stack badge instead of the Nv dots. Run-end summary and the link screen show "+N" instead of "Nv.N".

## What changes in code

| File | Change |
|---|---|
| `js/data/moves.js` | Ladders, `lvl`, `maxLvl`, `ups`, `levelUp`, `nextUpText`, `applyMods` deleted. `instance(id)` has no level. `addStack` loses the 2a ladder guard. |
| `js/data/mechanics.js` | `preview(m, mech)` (computed with the real `derive`, read-only) and `reason(m, mech)` for the dimmed rows. |
| `js/systems/levelup.js` | Rewritten: `FAMILY_W`, `families()`, `targetsOf()`, `offer(pl, n, roster)`. Mechanic cards are move-specific; a card is only offered if some move on the team can take it. |
| `js/ui/run-ui.js` | The card, Pokemon, move flow with auto-advance, Back, keyboard (`levelKeys`), and `+N` text. |
| `js/game.js` | Passes `roster` to `offer`; callbacks take `(card, target)`; level-up keys delegated to `RunUI.levelKeys()`. |
| `js/ui/hud.js` | Stack badge replaces the level dots. |
| `js/systems/combat.js` | Fan cap in `fireProjectiles` (`min(spread x n, 2 pi (n-1)/n)`); `ghostCast` ignores the old level argument. |
| `js/entities/player.js`, `js/net/coop.js` | Co-op wire shape unchanged; the old level slot now carries the stack total, and the receiver compares by move id only. |
| `js/core/debug.js` | `G.Debug.give(id)` and `G.Debug.stack(mechId, n, moveId)` (?dev only, flag the run as tampered). `G.Game.debugLevelUp()` already existed. |
| `dev.html`, `css/style.css` | Back button, step line, `.card.dim` and `.card.flash`. |
| `tools/export_data.js` | `maxLvl: 0` (the SEO generator still reads the field). |

## Behavior changes you should know about

- Old "up" cards and the Lv 1-5 ladders are gone. Move power now only comes from mechanic cards and new moves.
- New Move is about a quarter of all cards (10 of 40 family weight), where before six new-move candidates at weight 10 each dominated the draw. Expect fewer new moves per run until you tune `FAMILY_W` (one table at the top of `levelup.js`).
- Mechanic cards are per move, so a team with more moves has more legal cards.
- Recharge Speed is `period / (1 + sum)`. Fan spread no longer grows per Count stack; the fan widens with the count and stops just short of a full circle.

## Verification

Offline harness (all pass, also re-ran the 2a harness on the patched tree):
- Ladders, `lvl`, `maxLvl` are gone from every move and instance.
- Preview text equals the catalogue export for all 332 (move, mechanic) pairs; previews never mutate a move and follow stacking.
- 20,000 simulated offers on a 4-Pokemon team: never more than 3 cards, no duplicates, no card without a legal target, family shares match the weights (new move 25.2%, DPS 34.9%, Coverage 24.9%, Utility 15.0%).
- No New Move card when slots are full; no card for a maxed move; an empty offer when nothing is left.

Headless Chromium on dev.html?dev with a 6-Pokemon team (no errors in the run):
- Screens render correctly (screenshots sent with this proposal).
- Full chain with auto-advance: a Buff Stacks card landed on the only legal Pokemon and move with no clicks after the card, and the game resumed.
- Keyboard path: 1 (card), J then Backspace then K (Pokemon), 1 (move) worked and Recharge changed Water Gun from 0.700 s to 0.609 s.
- Arc ceiling: a melee move reached exactly 360° after 13 stacks, then showed "Has no arc" / became ineligible.
- Back after an auto-skipped Pokemon step returns to the cards and the timers stay dead.
- New Move flow still works (moves 2 to 3, game resumes).
- 121 Count stacks on Ember: 121 projectiles with 121 distinct angles in an even ring, no errors.

## Limits and what I did not test

- Not tested: co-op (parked; the wire is unchanged in shape, remote ghosts replay base moves), touch input, the built index.html, sprite art (the test copy had almost no sprites, so Pokemon icons were blank circles; the code path is the existing `G.UI.spriteCanvas`).
- The Pokemon step shows the team slot key as the existing label, so slots 5 and 6 read "SEMICOLON" and "QUOTE". Cosmetic; a label map is a two-line fix if you want it.
- Mechanic cards have no art yet; the icon box shows the step ("+1", "+15%") in the class colour.
- The English chip "Nuevo ·" on new-move cards is the inherited i18n key and is left alone.
- Check 6 of the 2a harness still only proves each engine key is mentioned in its hook, not that a stack behaves right in play. The headless run covers Count, Recharge, Arc, Width, Buff Stacks and Fire Rate paths at the data level, not every mechanic's visible effect.

## To apply (after your OK)

I apply the diff, re-run both harnesses on the real files, add the changelog entry (player-visible), and update DECISIONS, DEVLOG, TODO and GDD. You can then try it fast: open dev.html?dev, `G.Debug.maxAll()` is optional, then `G.Game.debugLevelUp()` in the console (or Shift+D then a run) opens a level-up instantly, and `G.Debug.give('flamethrower')` / `G.Debug.stack('count', 5)` set up a move. No 5-minute playtest needed to see the screens.
