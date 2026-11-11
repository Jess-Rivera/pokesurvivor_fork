# DEVLOG

Log of each working session. Append new entries at the END (the file is no longer reverse-chronological).
Keep each entry to about 6 lines: what changed, what was decided, what broke, where we stopped. Details go in DECISIONS or the harness.
Older entries were rotated to docs/DEVLOG-archive.md (latest rotation 2026-11-10). Rotate again when this file passes about 40 KB.

---

## 2026-11-09 (Claude Code, home), #40 built: the leader's frame runs your flow
- Jess ruled: firstWait defaults to 0 (you attack at once, so the leader does); every Player entity runs one flow, decide, hands, body, sim pass (two new decisions; GLOSSARY gained Sim pass).
- Built #40: G.LeaderAI decides with no stun gate, slot presses are queued controller answers; G.GymLeader reads its keys, runs the body, then Caster.frame (first wait, stun cancel with freshness restored, G.MoveSim.turn, the tell); the `firstWait` restriction and validator.
- Tests first: leader-ai-harness section 12 (508 pass), leader-ai-mutate 102/102 (10 new); gym-leader, leader-slots and leader-team harness and mutate sets adapted (one already-stale pattern fixed); smoke-gym passes on file://.
- Both parity traces re-recorded: the order shift alone is at most 2 frames and 5.5 px a cast (one Brock reach-edge flip in the slice 1 trace), then firstWait 0.
- Jess feel-tested #40: passed; closed and shipped. Stopped at: next #41.

## 2026-11-09 (Claude Code, home), #41 built: four roles, the Caster split
- Jess tightened the terms: Decider, Controller, Body, SimPass (a refusal passes nothing on); authoring layers Player, class, instance; the AI chooses its attacks; items 5 and 6 take your baseline; the Caster splits; a bonded group fires as yours; names are descriptive (CLAUDE.md). Four decision files.
- Built #41 in five steps, tests first (leader-ai-harness section 13): dead fields gone, no AI stun exception, `wildStatusDivisor` (off), Body `acceptsAttack` plus G.GymLeader.SimPass plus the attack score in G.LeaderAI, heal whenever due with the Decider moving off a heal-only slot, edge unstick on the Decider (reads the Body's `lastStep`).
- Broke and fixed: the first unstick measured the whole frame (410 false side-steps); the Body now records its own step. Mutation counts are vacuous while a harness is red (memory note).
- Tests: leader-ai 544, gym-leader 161, leader-slots 41 all pass; parity traces unchanged; mutate 113, 59, 22; smoke-gym passes. Filed #43 (movement split), #44 (flat moves both ways).
- Jess short feel test passed; #41 stays in Needs Playtest for playtesters. Stopped at: next #42 items 11 to 15.

## 2026-11-09 (Claude Code, home), #42 ruled; #45 and #37 built; #41 shipped
- Slice 8 Q10 (DPS report) closed as superseded: the report compares two GymBrain versions and broke at leader AI slice 1 (#22).
- #42 items 11 to 15 ruled, closed: 11 the leader's attacks wait on your cast gate, Body reach check out, a move-in score (#47); 12 strongHost out (#45); 13 one swap clock and swap point (into #43); 14 two sides, HumanPlayers and everyone else (#46); 15 autoShake is your accessibility setting, on. My mistake on 11 (I said your moves ignore reach; they have a cast gate) was caught and corrected before the ruling.
- #45 built and shipped (behavior-neutral); #37 Michroma replaces Korataki (Regular weight, files deleted, history left), look approved, shipped.
- PM rule fixed in CLAUDE.md and PM-WORKFLOW: the assistant closes and ships once Jess confirms; Needs Playtest is for feel tests.
- #41 shipped (initial playtest reports good), #43 unblocked. Fixed a pre-existing STALE mutant (boss-owner-mutate "far mode ignores a short ready shot", now 62/62). DEVLOG rotated. Stopped at: open #43 next session.

## 2026-11-09 (Claude Code, home), #43 built (both steps); #48 filed
- #43 opened with Jess: two steps, rulings in decision 2026-11-09-43-movement-split-opening. Test first: a movement trace for you and a Misty mon (14 scenarios, stub map), recorded on the pre-split code.
- Step A (neutral): Body checks acceptHeading, acceptDodge, acceptsCast; G.PlayerEntity.SimPass in js/entities/player-sim-pass.js. Cast refusal is acceptsCast, not acceptsAttack (that would refuse a leader's buffs in a flinch hold). Trace 85/85 unchanged.
- Step B: a leader's frame runs your order (swapStep, fieldFrame, shakeStep, tickSlotLock); G.EnemyMgr.replace keeps the list loop safe. Misty2 5a trace re-recorded (swap one frame earlier, max 2.2 px). Order checks 95/95, mutate 29/29.
- Broke and fixed: the harness's first fence crossed its own midpoint; added a long-frame and a dodge-turn scenario after mutants missed. Pre-existing mutate MISS and STALE recorded in STATE Watch.
- Filed #48 (research: HumanPlayer rules out of game.js). Unblocked #47 and #46. Jess feel test passed; #43 closed and shipped. Next #47.

## 2026-11-09 (Claude Code, home), #47 shipped; #49 design session opened
- #47 (47a, cast gate) feel test passed, closed. STATE and TODO had still named it next; fixed here.
- #49 opened with Jess: a hierarchical AI with belief and opponent modeling. Notes: docs/proposals/49-decider-design-notes.md.
- Belief settled: learned cooldown windows (edges close on clean gaps by a memoryUse factor, stretch plus overshoot on a cadence change, kept for the run), derived facts, confidence value.
- Strategy settled: seven intents, scored commitment, confidence in scores and commitment, triggers become events and voice (stub kept), no caps. Rule: emergent, not scripted.
- The three managers were superseded the same day: Jess chose a hybrid, utility goal choice plus GOAP planning plus a reflex layer. Grilling skill now opens with a play-back. Stopped at: `/grilling planner` next chat.

## 2026-11-09 (Claude Code, home), #49 design session closed
- `/grilling planner`, then `planner details`: the Decider is utility goals plus a GOAP planner plus reflex. Spec: LEADER-AI "The Decider (#49)"; notes file now history.
- Nine goals with outcome targets and per-goal cost profiles (danger only as cost; Jess renamed and added Setback and Bait). Ten verbs, incl. a planned dodge for Bait (Jess), 4-action plans, partial credit.
- New `misjudge`; sharpness grows per loop (base plus growth per leader). Cast timing is fixed (Jess correction), so counter-play is slot cycling.
- Superseded LEADER-AI rules retagged [Legacy behavior] with the #49 slice that removes each. Two decision files, glossary terms.
- Stopped at: the four #49 slice issues and a ?dev Escape pause toggle drafted for Jess's OK.

## 2026-11-09 (Claude Code, home), #54 and #50 built
- #54: G.Debug.quietPause() (?dev, session only) makes Escape, P and the pause button freeze the frame with no menu. Test: tools/smoke-pause.js (file://).
- #50 opening: Jess ruled memoryUse closes each edge by memoryUse itself (higher learns faster; Brock example fixed to 1.0 to 1.36); baseline 0.5, start width 1.8 s, min 0.2 s. Bench cooldowns stay open (they change HumanPlayer too); Belief mirrors the live rule (field time).
- #50 build: G.LeaderBelief (js/systems/leader-belief.js), the Decider's only door. Info times clean gaps in field time and keeps them in run memory; Belief replays them into windows. Matchup and yourAttack moved off the Decider; danger and opportunity via G.Stats.visibleHitFrac. Long window 15 to 10 s.
- Tests: leader-ai-harness section 14 (584 pass), leader-ai-mutate 125/125 (4 retargeted to Belief), smoke-gym and smoke-pause pass. Every harness load list gained leader-belief.js.
- Fix after Jess's console read: a slot switch had made Belief forget the last cast (move believed ready); now it only spoils the next gap.
- Jess feel-tested both: closed. #51 unblocked (ready). Stopped at: #51 opening, next session.

## 2026-11-09 (Claude Code, home), #51 built (#49 slice 2: planner core, executor, overlay)
- Opening ruled: split kept (6 verbs now, 4 in #52); slot stance ignored (range 220); slice 1 and 5a parity traces retired; trigger `set` kept, forced slot and swap refused. Decision 2026-11-09-51-opening-stance-traces-and-set-trigger.
- Built G.LeaderPlanner (nine goals, cost profiles, full search of plans up to 4 actions, commitment bonus, seeded randomness) on a snapshot from G.LeaderBelief; executor in G.LeaderAI; old slot choice, pacing and forced triggers gone. Overlay: goal, steps with costs, top 3 alternatives, window bars.
- Found in the build: hit sizes ignored hpMult (your hit read 117% of a leader mon); plans ran past their payoff; Finish won every tick at any HP. Fixed; four calls left [Proposed] for Jess in LEADER-AI.
- Tests: leader-ai-harness section 15 (568 pass; 15l and 15m add frame-order, risk and confidence checks the retired traces had covered), leader-ai-mutate 131/131, leader-slots-mutate 16/16 (a press-hold check added), gym-leader-mutate 59/59, player-move-trace re-recorded (4 leader scenarios, yours unchanged), smoke-leader-overlay (new, file://) and smoke-gym pass. Planner about 4.4 ms per choice at 4 slots.
- Stopped at: Jess's feel test of #51 and the four build calls.

## 2026-11-09 (Claude Code, home), #55 built (parallel mutation runner)
- Ruled at the opening (Jess): no fail-fast, every harness run completes; low priority and half the cores by default so the PC stays usable (`--full`, `--workers N`).
- Built tools/mutate-runner.js (pool, own temp file per mutant, ordered output, FAIL counts, `-v`, MUTATE_JSON) and tools/mutate-compare.js; all 35 *-mutate.js scripts now just list mutations and call the runner. STALE no longer aborts a run.
- Verified: the old serial scripts and the new ones agree on all 855 verdicts compared; leader-ai-mutate 131/131 in 5 min 56 s (was ~45 min; matches last session's 131/131 on the same code). check.js unchanged (the 2 #30 reds).
- Found: 42 STALE patterns hidden by the old abort-at-first-stale (Prettier reformat), filed as #56.
- Jess confirmed: #55 closed.

## 2026-11-09 (Claude Code, home), #51 closed
- Jess feel-tested Misty and Brock: good. Approved the four build calls (a) to (d) (decision 2026-11-09-51-build-calls-approved); LEADER-AI tag now [Approved].
- The two known planner gaps filed: #57 (circling lowers your hit chance), #58 (your shots along the action's path).
- #52 unblocked (ready). Stopped at: #52 opening with Jess.

## 2026-11-09 (Claude Code, home), #52 built (swap, dash, draw, dodge)
- Opening and seven calls agreed (decisions 2026-11-09-52-opening-stall-guards-dodge-cost-swap-value, 2026-11-09-52-swap-matchup-window-and-duels): stall guards stay gates, swapWill a cost, planned dodge through the bag and reflex, swap worth its later steps plus its matchup over 10 s, the KO term, the kept-back charge, the lead read skips minField.
- Built in the planner, Belief and G.LeaderAI; the old swap choice, the gap-closing dodge and their settings deleted. Harness section 16 written first; old trigger and gap-close sections retired.
- Found while building: the matchup swap never won at range (no trade inside 4 steps), fixed by the long-window term; a dash or planned dodge lost its step when a replan kept it; a Recover planned asleep crashed.
- Three duels (Bait, counter-play, learning) blocked on #59: reflex dodges starve the planned one, and his landed hits cannot depend on what you do. Planner ~3.4 ms per choice, 10.4 ms worst (accepted, watch at the feel test).
- Jess feel-tested: working as intended; #52 closed. Default weights (all 1) move, dodge and retreat a lot and attack less: noted on #39 for authoring.

## 2026-11-09 (Claude Code, home), #59 built (reflex weighs the plan; duels count shots avoided)
- Opening agreed in plain terms: Brock's reflex dodges spend his charges before a planned dodge can use one. Jess: weigh it (not a hard hold); the duels count the share of Fire Blasts avoided (decision 2026-11-09-59-reflex-weighs-the-plan-bait-parked).
- Test first: 16e counter-play and learning count Fire Blasts avoided, summed over 5 seeds (one duel held only ~12 shots). Built: a reflex dodge that would use a planned dodge's charge goes only if your hit beats the plan's worth.
- Result: counter-play 20% vs 26% (was 27 vs 26), learning 29% vs 24%; both pass. Found: the planner never plans a dodge at all (0 in 5 seeds even vs Fire Blast), so Bait was parked on #60 (Jess: cooldowns sit in 0 to 2.5 s).
- Two mutations added; the mutation run skipped (Jess). #53's stale blocked label removed. Stopped at: #59 in Needs Playtest; #53 next.

## 2026-11-10 (Claude Code, home), #61 palettes and the #64 HUD pilot (feature/leader-roster-ui)
- #61: palette settled as a working pool, each colour labelled with a job; status chips for major statuses only (others are on-sprite effects, #71); Shake Off in Lv gold. HUD-STYLE and UI-PALETTES reformatted; tools/grid_rips.py grids the B/W rips for cell references (output git-ignored).
- Portraits: SpriteCollab Normal face, normal and shiny, copied to assets/pokemon/<dex>/Portrait.png by tools/copy_portraits.js (966 normal, 957 shiny). A HUD-and-menus palette ruling was pulled back (asked before the question was clear; #70 closed).
- #64 built and closed: Preact, htm and Signals vendored; js/ui/hud-overlay.js draws the name line, the B2 bar (3x), cut-and-fall HP loss, heal grow, and portrait circles with a gym-colour ring and swap flicker. Smoke test covers dev.html and the built bundle.
- Feel test changes: 4 px circle stroke, whole-circle flicker, 20 px name line (lean on 2x), HP label as browser-slanted italic text (a pixel-stepped italic face was tried and read badly).
- Stopped at: pilot done; owed the work-laptop frame-rate check. Canvas timer and area line overlap the name line until their own slices. Next: rest of #61, #68, #69.

## 2026-11-10 (Claude Code, home), #62 character info panel and the level-up flow (feature/leader-roster-ui)
- #61 ruled a soft dependency (Jess); #62 built: portrait and EXP ring, life meter with current / max, B2 status chips, Shake Off badge (3 flashes a second), B2 move buttons with type-glyph wells, held item, Lv, Silver, timer. Overlay split into a core kit plus one file per panel; the #64 pilot moved unchanged.
- Feel-test rounds: slot profile copied from the rip row for row, the B2 grid back with larger squares, clock-wipe cooldown, flat EXP ring, Lv rattle on a pivot, Lv and held item swapped, Silver lower and popping to 1.5x, cursor corner fixed.
- Level up (decision 2026-11-10-level-up-rattle-then-cards-with-confetti): the number rattles while you play; cards open 1.1 s later with confetti from the popup's corners (js/ui/confetti.js).
- Smoke covers the panel's 1080p layout and the level-up order (a 2 px slot shift fails it). A Vitamins card made one run flaky until the test finished its stat pick. Touch is #72 (deferred).
- Stopped at: #62 in Needs Playtest. Next: #63, #68, #69.

## 2026-11-10 (Claude Code, home), #62 closed and #63 built and closed (feature/leader-roster-ui)
- #62 last round: status chips take the B2 capsule outline (b2-lower Y17 to Z17) with a 4 px shade rim; Jess closed it.
- #63: roster rows (b2-lower Y15 to AA16 box in the first type, portrait circle, name, benched chips inside, HP bar along the bottom), held item squares, 2x2 berry bag, run item boxes (AD4 to AG5, icon in the white patch, name above, live line beside). Jess's plan review reshaped most pieces; only filled slots, team of one hidden.
- Chips, item square, icon canvas and cursor moved into the overlay kit (#62 unchanged). Canvas keeps the old pieces only as the fallback; its buff chips start right of the roster until #66.
- A "two chips cover the name" worry was a test artefact: one major status at a time (COMBAT-RULES), so a row shows one chip. Feel test: the roster "HP" became the life meter's italic text. Spanish species names filed as #73.
- Stopped at: #62 and #63 closed, HUD-STYLE #63 sizes approved. Next: #65, #66, #67; #68 and #69 any time.

## 2026-11-10 (Claude Code, home), #65 built: map panel, weather card, kills line (feature/leader-roster-ui)
- js/ui/hud-map-panel.js: World Level (old ENEMY LV), Region, Map (biome name; named places filed as #75), kills line top centre hidden in arenas. Coins leave the run HUD (Jess). Canvas line, ENEMY LV and weather chip are fallback only.
- Weather card: Jess asked for a slide in with a stopping bounce, slide off, and a Clear Sky card that slides in, holds 2 s and fades (the only fade exit). Feel test reshaped it into the B2 tab (b2-lower Y1 to AA3) at 3x: type colours for the greens, Slate body (#e7e7e7 is not on the Panels and lines palette; white fails on #adadad at 2.2:1), icon behind the stripe, timer inside the lower rim running out toward the edge.
- Icons: Jess swapped in Bulbapedia white icons; tools/rip_weather_icons.py cut the unofficial sheet's 30 circles into unofficial/ as spare art (#74).
- Smoke: a map panel run (placement, text, arena hide, full card sequence, edge, colours, layering). check.js red only on the two #30 harnesses.
- Stopped at: #65 in Needs Playtest awaiting Jess's last look. Next: #66, #67; #68 and #69 any time.

## 2026-11-10 (Claude Code, home), #66 built and closed: DPS-Upgrades panel (feature/leader-roster-ui)
- G.DpsHistory (js/systems/dps-history.js): every second of the run for your team (team damage, slot out at the second's end, each member's own), fed by Player.onDealt (credits the caster, so in-flight moves after a swap count for their caster), advanced in run time by game.js. Harness: docs/proposals/dps-history-harness.js.
- js/ui/hud-dps-panel.js, top left: name and 5 s team DPS, one continuous 30 s sparkline in each Pokemon's type Base with swap ticks (colour changes at the midpoint), the run's team cards. Jess renamed it from "Active Slot"; buff and status chips split to #76 and stay on the canvas.
- Feel test rounds: Michroma for the whole panel (a "module", HUD-STYLE Fonts), Settings > DPS Panel toggle (default on) and DPS Panel Opacity slider (20 to 100%, default 60%), a 10 px % after card totals.
- The panel showed two Cooldown Down picks as -23%: correct, rate cards divide (cd / (1 + stacks x step)); the level-up card's "-15%" reads additive. Filed #77 (wording audit plus Jess's ruling).
- Stopped at: #66 closed, HUD-STYLE #66 Approved, #35 checklist ticked for #62 to #66. Next: #67, #77; #76 waits on Jess.

## 2026-11-10 (Claude Code, home), #67 built: chevron wayfinding arrows and roof labels (feature/leader-roster-ui)
- #67 unblocked by Jess (no longer waits on #61). Off-screen arrows are three chevrons: Attacks/Special for gyms, Attacks/Physical for shops (UI-PALETTES, adopted in HUD-STYLE as Proposed). Loop: snap with a stagger, stop-bounce with a back-to-front shine, strained 1.4 s hold (tremble and sag), slide back, rest. Every number is a CHEVRON_* constant in js/ui/hud.js.
- Feel-test rounds: 28 px tall with 20 / 36 px gaps (14 px with 5 / 15 nested into one block), halo removed, square caps so the ends carry the border, labels in the standard HUD text (Truth And Ideals 20 px, hard #101010 outline).
- On screen the bouncing arrows are gone: "Gym Leader Brock" with "Lv.5 (+n Escalating)" under it over the gym roof, "Move Trainer·58s" over a shop. Off screen: "Gym·Lv.5·10m·29s", "TM Mart·11m·34s".
- shops-harness tracks the renamed constants and checks the roof label. check.js red only on the two #30 harnesses.
- Stopped at: Jess's feel test passed; #67 closed, HUD-STYLE "Wayfinding arrows" Approved. Next: #77; #76 waits on Jess.

## 2026-11-10 (Claude Code, home), #71 spec: on-sprite status icons for all twelve statuses (feature/leader-roster-ui)
- Jess chose the Rescue Team status icon style over the EoS effects (outlined icons read in a swarm). HUD-STYLE "On-sprite status icons (#71)": one row per status; trap is the red X with a glow swipe, sleep and drowsy are text Z's, haste a blue up arrow, paralysis a new lightning wrap; #71 widened to all twelve.
- tools/status_icon_preview.py renders the sheet and a GIF on a Pikachu; confusion uses Jess's confuse-birds.png, split at its uneven separator columns and centred on the four birds.
- Stopped at: #71 in Needs Playtest. Open: several statuses at once; timings Proposed.

## 2026-11-11 (Claude Code, home), #71 settled and #78 built: on-sprite status animations (feature/leader-roster-ui)
- Jess switched #71 to the slowed-down art set, Jess's own Aseprite redraw, so it ships. Rulings, all in HUD-STYLE "On-sprite status icons (#71)":
  - Spots and layering: Jess's placement table (feet, body centre halfway up, above the head). Everything shows at once, the major over minors, and the head reads drowsy, daze, confusion from the bottom.
  - Stat changes: streaks recoloured per stat, several at once on a 3 px circle a third of a loop apart. Haste and Slow show as Speed changes, with the arrows in reserve.
  - Confusion is the birds. Minor statuses get hollow chips in the character panel.
- #78 built: js/ui/status-fx.js; tools/status_anims.js bakes js/data/status-anims.js and the per-stat sheets in assets/status/stats/ (file:// blocks JSON reads and pixel reads). The pills, feet rings and zzz are retired.
- tools/smoke-status-fx.js passes. Headless perf needs GPU flags: without them, 300 statused enemies looked like 40 ms frames, but with the GPU on they hold 60 fps.
- Also: tools/gif_to_sheet.py, tools/status_icon_split.py; deferred #79 for co-op remote status flags.
- Stopped at: Jess's feel test passed, #71 and #78 closed. Next: the old team-raise feet arcs (they double the stat-up effect), then #77.
