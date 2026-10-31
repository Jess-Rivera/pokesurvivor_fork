# Slice 5 build handoff (5a trackers, then 5b team cards)

Back to slice-5.md. Written 2026-10-30 (home, Claude Code) for a fresh build chat. Model: Opus (new runtime).
Workflow: CLAUDE.md "Edit boundary" (prose plan in chat, no code, Jess OKs, then build, run `node tools/check.js` and the harnesses, write to the repo). Jess runs all git.

## Read first (and only these)
- Rules: docs/COMBAT-RULES.md "Stat stages" SS1 to SS13 (SS8 now includes the active-group and swap-in rules), combat-architecture:H26.
- 5a map: docs/ASCII Concept Maps/Slice 5a - Stat Stage Trackers.txt (sections 2 to 8 are the build).
- 5b map: docs/ASCII Concept Maps/Slice 5b - Cards From Fields.txt (section 3 is the card list).
- Rulings: slice-5.md "Plan rulings".

## 5a: code facts found 2026-10-30
- js/systems/stages.js: per-host timed lists `h.stg[stat] = [{ n, t, src }]` (add, tick), and the team store `stgTeam` (teamAdd, teamTick, teamSum, TEAM_GRACE, TEAM_LIVE). stgTeam also carries non-stage keys (Aqua Ring `regen`, `crit`, berry `pct_def` / `pct_spd`; player.js `regen` getter and `incOf`). Keep the legacy store working: put trackers in their own store and add them into `stage()`.
- Still writing the legacy lists until 7b: enemy procMove drops on the player, procSelf, SLOW and HASTE carriers, Flamethrower's quiet caster slow (`add(..., quiet)`).
- js/systems/move-effects.js `stat()` (about line 132): foe src is the move id only today; it becomes move@caster (srcOf). Self changes roll once per cast on the cast's FIRST enemy hit (SS2), self drops included. Payload order is damage then stat.
- js/systems/move-sim.js tick (about line 360): only the active group casts; slots with `def.cd == null` are skipped, so pure buffs need a new cast-on-Gate branch, active group only. Swap-in needs no player.js change (Quick, 2026-10-31): setActive only switches the group, and the cast-on-Gate check reads the tracker, so a swapped-in buff with its Gate running already waits and one with no Gate casts that frame.

## 5a: added by Quick, 2026-10-31 (code read)
- Early-outs that skip trackers: stages.js `mul()` and `speedMul()` return 1 when the host has no legacy `stg` / `stgTeam` list, and move-effects.js `defStage` (about line 43) returns 1 when the enemy has no `stg`. Adding trackers to `stage()` is not enough; these three must also see trackers.
- Same early-out in the legacy path: js/systems/combat.js about line 623 (`if (!e.stg) return 1`). Without the fix a legacy move ignores a new-path drop on the same enemy (SS6: one stage per stat).
- The team tracker store must be shared exactly like `stgTeam`. Built (2026-10-31) as a WeakMap in stages.js keyed by the stgTeam object, so it follows game.js line 138's sharing and every harness fixture with no player.js or game.js change; `G.Stages.trackers(h)` shows it in the console.
- HUD readers only see the legacy team store: js/ui/hud.js about lines 252 to 261 (chips, `teamSum`, `teamTimer`) and the feet arcs in player.js about line 713. Without them buffs show nothing under the flag.
- Own trackers can tick in the existing `G.Stages.tick` (it runs for the active member, the bench via `benchUpdate`, and enemies), so BENCH holds with no new call. Team trackers tick in `teamTick` (active member, once per frame). `clear()` (faint, revive) clears own trackers, keeps team ones.
- docs/proposals/move-riders-mutate.js (not in the 5a map): its "team cap ignored" mutation becomes a no-op once the new path stops passing a live cap to teamAdd; retire it. Its two `add()` cap mutations stay only if a harness still catches them (the caster slow still uses that path), else retire them with a one-line reason.
- Stat moves and resolved cds: swords-dance, agility, harden, dragon-dance (cd 8, removed in pass 2); metal-claw 0.5 (10%), meteor-mash 1.75 (20%), leaf-storm persistent; foe drops ice-beam, shadow-ball, flash-cannon, psychic, mud-shot, bulldoze, string-shot, bug-buzz, bubble-beam.
- Pass 2 (after the harness is green): remove `maxStacks` and stat `duration` from docs/move_rework_holding/move-conversions-described.json, move-attributes.js, move-resolver.js, the 4 buff cds in move-overrides.js; validator rejection in tools/validate_moves.js; readers in tools/move_parity.js and tools/move_report.js; Jess re-runs tools/export_moves.js (regenerates moves-generated.js).

## 5b: code facts found 2026-10-30
- Today's cards: js/data/mechanics.js (catalogue, modes add / inc / rate, SCOPED type and kind cards, STATS), js/data/kinds.js (per-kind keys and nouns), js/systems/levelup.js (family draw, FAMILY_W, 2-buff limit on `kind === 'buff'`), js/ui/run-ui.js (choose sheet steps, about lines 79 to 142), js/ui/sheet.js (preview through G.Moves.derive, about line 132), js/data/moves.js addStack / derive.
- New path reads `G.MoveDefs[id]` in move-sim.js (4 places) and move-render.js (2): these read the folded team def.
- Stat cards today: player.js `inc` (per Pokemon) and `addStat`; `badge` is already a run-long bonus for every member, bench included: Vitamins can use that path.
- Bench loop: game.js about line 838 (`benchUpdate`): HP Regen goes there (bench only).
- No mid-run save exists (pause only): the team store is run state, no save migration.
- Gym leaders apply per-move stacks through G.Moves.addStack (gyms.js, gym.js): unchanged until 7a.
- Flag: `G.MoveRoute.on` (?dev&newcombat). Team cards only under the flag; the legacy flow keeps per-move cards until 7b.
- Eligibility counts today (resolved defs): Count Up 17 moves, Pierce Up 16, Time Up 8, Chain Up 3, Delay Down 1 (rock-slide), Recoil Down 1 (substitute).

## Ask Jess at the start of the 5b plan
- Thin cards: build Delay Down and Recoil Down now, or defer like Splash?
- Working names OK for the build (Area Up, Speed Up, ...)?
- Count Up and Pierce Up caps: placeholder numbers in the build, tuned in slice 6.
(Answered 2026-10-31: build both; working names, Speed Up renamed Velocity Up; caps +3 / +4. Lazy rebuild per move id. See slice-5.md.)

## 5b parts A and B status (Quick, 2026-10-31)
- Written: js/systems/team-cards.js (G.TeamCards: store, catalogue with field maps, lazy from-scratch fold, one copy per move id, unchanged refold keeps the object); dev.html tag after move-resolver.js; 'TeamCards' in the NEED array; game.js one store per run on every member. move-sim.js reads through a local defOf (4 sites incl. named emit children), and a live persistent group restarts when a pick changes its def (slot.persistDef); move-render.js HUD ring reads the folded cd. Changelog entry.
- Tests: docs/proposals/team-cards-harness.js (82 checks: store and lazy rows, one row per field card, cardLock, eligible lists, order, readers incl. a static scan for raw G.MoveDefs reads); docs/proposals/team-cards-mutate.js (23 mutations).
- Verified in Quick's sandbox (bundled, not node CLI): the new harness 82/82; move-sim, persist, emit, motion, travel, selfcast, riders, plain, stat-stage and intent harnesses green; all 23 mutations caught. Jess to run `node tools/check.js` and `node docs/proposals/team-cards-mutate.js`.
- Data facts found: Count Up fits 16 moves (Rock Slide out: its copies would land on one point), Pierce Up 17 (Quick Attack's dash plus the Gust, Fairy Wind and Will-O-Wisp shots). Recoil Down on Substitute also shrinks its shield (shield = 2 x HP paid). Time Up on Gust, Fairy Wind and Meteor Mash lengthens their shots' flight.
- Rulings applied (Jess, 2026-10-31): Recoil Down compensates a paid shield (team-cards.js `comp` term, shield stays full size); Time Up placed things only (5 moves: discharge, flame-wheel, toxic, toxic-spikes, will-o-wisp). Harness 85/85, mutations 25/25 (sandbox).
- Persistent restart costs measured (sandbox probe): Toxic's existing puddles survive; Aqua Ring's next heal tick slipped by up to a full 2 s; Fire Spin and Leaf Storm orbs snapped back to their start angles; fresh hit records (an enemy inside can take a tick early, kept); one cast played (animation, sound, Life Orb cost).
- Restart fix BUILT (Jess, "apply all three"): move-sim.js endGroup keepHeal on a card restart, spawnPersistent `carry` (orb phase, restart flag on move:cast), orbits motion adds inst.phase; move-effects.js healOverTime updates frac and per on an existing heal (clock kept); move-render.js skips restart casts. A restart whose gate holds ends the heal. Harness 90/90, mutations 30/30, all move harnesses green (sandbox).
- Next: part C (Gate Reduction and Duration Increase in stages.js / move-effects.js), then D, E, F, G per the build plan section 7.

## 5b parts C to G status (Quick, 2026-10-31)
- Plan: docs/ASCII Concept Maps/Slice 5b - Parts C to G Plan.txt (approved; Jess: F1 sheet move numbers stay legacy, Vitamins uses the Protein / Calcium rule, no bench regen text).
- Written: C stages.js gateOf(selfDrop, mul) and a Duration argument on success / trackOwn / trackTeam (tracker field dl for the HUD); move-effects.js stat() passes the caster team's gateMul and durOf on all three branches; move-sim.js fizzle wait reads the team Gate. D player.js incOf adds the team Vitamins, benchUpdate HP Regen (capped, never a fainted member), new refreshMaxHp. E levelup.js teamFamilies (flag on and not co-op): field cards with a taker and under their cap, one Type card, Gate / Duration with a stat move, HP Regen with 2+ members, Vitamins (3 rows, Protein / Calcium rule), New Move with the no-damage buff test; run-ui.js team cards finish at once, Vitamins picks on the card screen (1-3, Backspace). F team-cards.js summary(), sheet.js Run Cards tab. G debug set newcombat('cards'), G.Debug.cards(id, n). Changelog entry.
- Tests: team-cards-harness.js sections 5 to 9 (147 checks); team-cards-mutate.js 61 mutations (31 new). Retargeted patterns that followed the edited text: stat-stage-mutate (3), move-sim-mutate (1), move-persist-mutate (1); move-selfcast-mutate (2, stale since the A/B restart fix).
- Verified in Quick's sandbox (node stand-in): every harness green except items-f3d2 and move-geom, which the stand-in cannot run (db.js patched before load, vm.runInNewContext) and which touch no changed file; all 9 mutation runners green. Jess to confirm on node.
- 2-buff limit ruling (Jess, 2026-10-31, DECISIONS): self-only. team-cards.js selfOnly replaces the build default "no damage anywhere" (which had also counted Toxic, String Shot, Spikes, Toxic Spikes and Will-O-Wisp). Buffs on the new path: Swords Dance, Agility, Harden, Dragon Dance, Aqua Ring, Substitute. Harness 3 rows, 3 new mutations.

## Not in slice 5
Bond tax (Bond branch), gym Harden (7a), SLOW/HASTE (7b), Dodge Cooldown card (dodge branch), the New Move cards rework, the run identity question.

## 5a pass 2 status (Quick, 2026-10-31)
- Written: maxStacks (10 entries) and stat duration (5) removed from move-conversions-described.json (Ice Beam and Bug Buzz feel notes rewritten); grammar drops both fields (move-attributes.js), resolver H24 exception gone, 4 buff cds removed from move-overrides.js; validate_moves.js self-test rejects both and its resolved cd rule exempts pure buffs; move_report.js reports a pure buff as "casts on its Gate (SS8)"; move_parity.js self-test flipped; riders 3b and selfcast buff checks rewritten, synthetic stat defs stripped. Docs: MOVE-INTENT, COMBAT-RULES, MOVE-AXIS-SCHEMA, combat-architecture H24/H26.
- Aqua Ring (Jess, 10-31): persistent heal aura. move-sim.js lets a shapeless self-heal persistent move spawn one shapeless marker and ends its heal with the group; move-effects.js heal with no duration lasts until endHeal; data persistent, heal 0.0625 per 2, no duration, no cd override; validator heal-needs-duration (+2 self-tests); selfcast section 9 and persist 1b rewritten, aqua-ring-tick rewritten + aqua-ring-aura new, selfcast-mutate 'Aqua Ring stacks' retargeted + 'heal outlives its aura' added; MOVE-INTENT ruling; changelog.
- Verified 2026-10-31 (Jess ran): export_moves.js, check.js green, selfcast-mutate green (after one test-only add: section 9 now also checks that a Pokemon swap ends the heal, which caught 'heal over time survives a swap'). Feel-tested in game. 5a CLOSED; committed and pushed.

## 5a pass 1 status (Quick, 2026-10-31)
- Written: stages.js trackers, move-effects.js rolls and pure buffs, move-sim.js Gate casting, combat.js and hud.js readers, player.js feet arcs, debug set `stages`, changelog.
- Tests written: stat-stage-harness.js and stat-stage-mutate.js (11 mutations); riders, selfcast, persist and plain harnesses moved to trackers; riders-mutate, persist-mutate and sim-mutate patterns updated; 14 intent scenarios (11 edited, 3 new).
- Verified 2026-10-31 (Jess ran): check.js 28/28 harnesses green, move data ok; stat-stage-mutate 11/11, riders-mutate 23/23, selfcast-mutate 35/35. persist-mutate and sim-mutate stop early on the pre-existing stale patterns below. One riders-harness fix along the way (Ice Beam and String Shot lines used a fresh owner per hit).
- ice-beam-climb scenario written 2026-10-31 (cd 1.75 s resolved, no override): 13.5 s, 8 casts, 8 hits, Speed -2. Scenarios now 15 for 5a (11 edited, 4 new).
- Retargeted 2026-10-31 (were stale before 5a, patterns no longer in the code): sim-mutate 'root instances deferred a frame' and 'lens applied twice', persist-mutate 'persistent shapes ignore their radius', motion-mutate 'the hitbox is armed in transit'.
