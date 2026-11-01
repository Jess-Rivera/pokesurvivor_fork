# Slice 7b: flip, purge and merge into main

Back to slice-overview.md. Prior: slice-7a.md. This is the last slice of the branch.

## Objective
The new path is the only player-move path. The legacy code and its legacy behaviors are gone. The branch merges into main.

## Decision D-HAIL (resolved)
- [Approved] (c): Hail leaves the player pool until its toggle skill item exists (MOVE-INTENT hail). Old saves that hold Hail load with Water Gun in its place. (Jess, 2026-11-01; (a) build the toggle here and (b) a plain setWeather cast were declined, since snow chips the player's own team.)

## Scope
- Remove the `?newcombat` flag and routing (H7, D-4); every move runs through G.MoveSim. G.Combat keeps enemy shots, wall cover and contact damage.
- Delete the legacy player-move code in combat.js and the legacy fields it alone used; kinds.js once slice 5 and 7a no longer need it.
- Legacy behaviors removed (each is a [Legacy behavior] naming slice 7): Fire Spin `strip` and `burnHalf` (COMBAT-RULES "Trap, enemies", MOVE-INTENT fire-spin), the `norm` factor (COMBAT-RULES "Damage"), the "duration / cooldown is the cap" stacking with TEAM_LIVE, ROLL_GAP and procSelf (COMBAT-RULES "Stat stages", legacy path), and E1 (verify that enemies can now be trapped on the only path, QA-10). KEEP when the legacy stage code goes: a small fixed-timer stage application for the carrier statuses SLOW and HASTE (COMBAT-RULES "Stat stages", carrier statuses; Jess, 2026-10-30).
- Purge Bubble and any other forgotten move. Save-data safety (CLAUDE.md): a save that holds a purged or pulled move must still load, with a backward-compatible default.
- Brock-only gym fallback (QA-13, Q18), using 7a.
- Patch notes in js/data/changelog.js (free edit; it must still parse).
- Docs: mark the [Legacy behavior] lines removed in COMBAT-RULES and MOVE-INTENT; clear the matching STATE.md gaps; architecture D7 and C8 lose their legacy notes.

- [Approved] D-BUBBLE: Bubble is retired as a move. The starters that open with it (js/data/starters.js: dex 393 and dex 728) open with Water Gun instead, and Bubble leaves the pool. Saves that hold Bubble must still load (Water Gun is the natural default). (Jess, 2026-11-01; found 2026-10-30)

## Tests
All harnesses green with no flag; the I1 guard extended to every file that remains; old saves (with Bubble, Hail and pre-branch move ids) load; a full run to Brock; the stress run from slice 6 repeated with no flag.

## Merge into main (Jess runs all git)
check.js green on the branch, STATE.md and DEVLOG.md updated, a DECISIONS.md log line for the flip, then the assistant gives Jess the exact merge commands (merge main into the branch first if main moved, then the branch into main). After the merge, open the gym-roster move-import branch.

## Steps (plan approved by Jess, 2026-11-01)
- 7b-1 flip: the new path always on (no ?newcombat), team cards the only cards, Bubble and Hail retired (G.Moves.RETIRED), starters 393 and 728 open with Water Gun, save shortcuts (pbind) map a retired move to Water Gun unless the list already binds Water Gun (then that slot clears), vetoes (pban) drop retired moves.
- 7b-2 purge, split (addendum approved by Jess, 2026-11-01):
  - 7b-2a: the legacy player-move engine (combat.js player half, ground fields, orbs, co-op ghost replay; projectile.js player shots), kinds.js, mechanics.js, moves.js down to pools, start table and instance (reading G.MoveDefs), the legacy card offers, the choose screen and the "+N" badges, the flag readers, the 14 legacy-7b lines; legacy-only harnesses retired after a coverage pass.
  - 7b-2b: ROUTED (moved here from 2a: the intent harness and tools/move_report.js read it as text), the legacy stage stacking in stages.js (TEAM_LIVE, ROLL_GAP, procSelf, keep the SLOW / HASTE fixed timer), E1 verified (enemies can be trapped), the norm factor in stats.js, the guard at zero legacy reads with no exempt files, the [Legacy behavior] doc lines, Brock-only confirmed (only Brock is authored).
- 7b-3 docs sweep (ONBOARDING, GLOSSARY, GDD still name kinds.js and mechanics.js), changelog, merge.

## Results
- 7b-1 built 2026-11-01 (Claude Code, home): move-route.js `on` is always true (readers stay until 7b-2); moves.js RETIRED map, pools skip it; menu.js move search skips it; starters.js; db.js pbind and pban; changelog. Tests: check.js 34/34 (boss-owner harness's stand-in player got an inert Tackle slot, since the sim now ticks it), smoke-ui and smoke-newcombat updated for the flip and all pass; save cleanup checked by hand (Bubble/Hail shortcuts and vetoes). Owed: Jess's feel test (a full run to Brock) and the stress run with no flag. Feel test and stress run passed (Jess, 2026-11-01); committed 8b7cbb7.
- 7b-2a built 2026-11-01 (Claude Code, home), about 2,900 lines removed:
  - Game: combat.js is now enemy shots, wall cover and contact only; projectile.js enemy shots only; kinds.js and mechanics.js deleted (dev.html and the main.js NEED list updated); moves.js is pools, RETIRED, start table and a slim instance (id, name, type, cd, t) from G.MoveDefs; the Vitamins stat list moved to G.TeamCards.STATS; levelup.js offers team cards only; the level-up choose screen (scr-choose, sheet choose mode) removed, it only served the legacy cards; "+N" stack badges gone from HUD, bond screen and sheet; player.addStat, debug stack() and stat() gone; move-route.js has no flag and no co-op exception; db.js, debug.js, player.js read G.MoveDefs. Zero legacy-7b lines.
  - Found and kept: the slot swap lock (swapT) was counted down in the legacy G.Combat.tick; it now runs in game.js.
  - Tests: the legacy table is archived at docs/move_rework_holding/legacy-moves.js for move_parity, move_report and the ui-readers parity checks. Retired (legacy only): status B, D3, E2a, upgrade 2a, 2b, 2c. Cut to their engine sections: status A (1-6, 9), C (1-8, 10, 13-15), D1 (1-3, 7), D2 (3-5), E2b (4, 5, 8). check.js 30/30, guards ok, smoke-ui and smoke-newcombat pass, mutation runners clean except three stale mutations that predate this slice (move-sim oscillation, stat-stage inactive pure buff, team-cards persistent upkeep; TODO).
  - Rules with no new-path test after the retirement: the Ailment Chance card (gone with the legacy cards) and legacy Fire Spin strip (a removed legacy behavior). The drain rule is covered by move-riders.
  - js/net/ untouched (D-COOP): coop.js still calls the removed G.Combat.ghostCast and G.Moves.stackTotal; co-op cannot run in this phase (TODO co-op item).
  - Feel test passed (Jess, 2026-11-01); committed 496118a.
- 7b-2b built 2026-11-01 (Claude Code, home):
  - ROUTED gone: G.MoveRoute.routed(id) = a resolved def that is not retired (62 moves; Hail stays out). The intent harness and tools/move_report.js compute the same set from G.MoveDefs and G.Moves.RETIRED.
  - stages.js: procMove, procSelf, teamAdd, TEAM_LIVE, ROLL_GAP, stripPositive and the stgRoll field removed; add() kept for SLOW / HASTE carriers, the commitment slow and debug; the team store kept for berries and team trackers. player.addTeamStage (no callers) and enemy ailRoll (only the legacy procAilments wrote it) removed.
  - stats.js applyDamage: the norm factor removed. No move-path caller passed norm, so damage is unchanged.
  - E1 verified: the Fire Spin and trap-mine intent scenarios trap enemies on the only path. Brock-only confirmed: gyms.js authors Brock alone.
  - Guard final: no exempt game file (js/net/ stays exempt, D-COOP), a legacy-7b tag excuses nothing.
  - Docs: the 7b [Legacy behavior] lines in COMBAT-RULES, MOVE-INTENT (fire-spin), BUFF-TABLE and architecture D7 / C8 became dated history notes. Left for 7b-3: GDD 7.4, and the slice-5 legacy lines (MOVE-INTENT 158, architecture H2) are not 7b's.
  - Tests: check.js 30/30, guards ok, both smokes pass, mutation runners clean but for the three stale move-sim mutations (TODO). Not changed: G.Log.hitOut and its HIT_OUT record have no caller since 7b-2a (dead logging, harmless; cleanup with the 7b-3 sweep).
- Gym teleport hang fixed 2026-11-01 (found by Jess in the 7b-2b feel test; it predates 7b, exposed by the 7b-1 flip): an owner-following persistent move (Fire Spin, Leaf Storm) swept its hitbox across the whole teleport into or out of the arena, and the prop query generated every world chunk on that line. move-sim.js step now treats a jump over 1,000 px in one step as a teleport and sweeps nothing across it. Verified headless with Leaf Storm and Fire Spin, into the arena and back; move-persist harness and mutation runner gained the case (without the fix the query spans 125,000 px).
