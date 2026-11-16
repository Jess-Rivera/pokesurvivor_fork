# DEVLOG

Log of each working session. Append new entries at the END (the file is no longer reverse-chronological).
Keep each entry to about 6 lines: what changed, what was decided, what broke, where we stopped. Details go in DECISIONS or the harness.
Older entries were rotated to docs/DEVLOG-archive.md (latest rotation 2026-11-15). Rotate again when this file passes about 40 KB.

---

## 2026-11-12 (Quick, work), #91 built end to end: Run Info, Region Best, Run Stats box
- 91-1 checks passed on the machine after two fixes: boss-owner-harness crashed stringifying stDot (its by is now the
  caster); a STALE Brock cards mutant from #84 re-pointed.
- 91-2: hits carry their move id; Silver earned / spent; Region Best (save.regionBest, solo and clean only, pace delta,
  rules DR1 to DR5, RC1, RC2); Run Info panel (pause-run-info.js, pure sections()); debug runinfo / regionbest /
  recordcheck. Cleanups: shared kit ScrollBox (now draggable), Silver kill pays once, onDealt takes named fields.
- 91-3: Run Stats box, 12 rows scrolling in its 200 px box (Jess kept the size); G.U.compact, fieldSeconds, statusList.
- Tests: run-info harness and mutate runner new (78 checks, 28 mutants); run-stats harness 108; all in Quick's sandbox.
- Broke: a changelog entry mis-nested (parsed fine); smoke read the Statuses tooltip as one string. Both fixed.
- Stopped at: Jess re-runs smoke-pause-menu, feel-tests #91; next is #83. GitHub API empty from Quick all session.

## 2026-11-12 evening (Quick, work), design session: types by region, type maps, acquisition rework
- Built a types-by-region dashboard (docs/type-region-dashboard.html). Found Kanto T6 rolls no hordes, publish needs a missing make_seo_pages.py.
- Region type maps designed then PARKED: 8 type maps + a Stage 3 map per region (Biomes v2, decision filed).
- Acquisition rework decided in direction over 16 rounds: gacha out, rescue catch (UberElite, belt, nature flee), Lost
  Pokemon recruits, candy evolution with mainline requirements, Link Cable. Map Acquisition v1, decision filed.
- Filed by Jess: #101 day/night (parked), #102 tooltips everywhere. Nothing in js/ touched; check.js not run.
- Stopped at: file the acquisition parent issue; #83 checks and close still owed from earlier today.

## 2026-11-12 afternoon (Quick, work), #83 Cards Taken and the shared tooltip layer
- #91 feel test passed. #83 built: Cards Taken is the DPS panel's count list, filtered to this Pokemon's cards
  (G.TeamCards.takenBy), team-only cards show real numbers on hover; the move tooltip gets a before/after "Cards:" line
  from the real fold (G.TeamCards.changes). Detail tooltip widened to 558 px (16 px clear of both side panels).
- Decided: every hover tooltip is the topmost layer; the pause menu draws all of them in one shared TooltipLayer
  (chosen over a CSS lift). Everything else is #102. Two decision files filed.
- Tests: team-cards harness 183/183 (25 new) in Quick's sandbox; both pause smokes rewritten for the layer, NOT run.
- Broke: a few Python writes to the device silently did not land; redone with read-back. A smoke variable clashed
  (sides), caught by the syntax check. The device link dropped once mid-session.
- Stopped at: Jess runs check.js and both smokes, feel-tests, commits; check.js not run this session.

## 2026-11-12 night (Claude Code, home), close #83
- #83 closed: checks green (run from Quick, not logged then), feel test passed. Body now also names the shared
  tooltip layer that shipped with it; comment lists what shipped. #82 has only #92 left.
- Looked at moving the team slots above the ball (under the inventory) to free a tooltip zone below it: fits with
  about 16 px spare, Jess dropped it. No code touched.
- Stopped at: #92 next; acquisition parent issue still to file.

## 2026-11-12 late night (Claude Code, home), end of run: #92 Run Review, #103 End Run, no EVs on quit
- Decided from the End Run mocks: End Run screen, Run Review (pause menu read-only), EV screen redesign (#104), a quit
  gives no EVs (crash keeps them), balls earned show nowhere. Decision file and PAUSE-MENU section 7; #103, #104 filed.
- Built #92 (openReview, read-only panels) and #103 (js/ui/end-run.js, SlotButton moved into the HUD kit,
  quitRun(keepsEvs)). Both feel-tested and closed. Fixed on the way: the old Quit button passed its click as keepsEvs.
- Tests: smoke-pause-menu End Run and Run Review sections, pokebox-evs harness 63/63, mutate 31/31. Its Cards Taken
  400 px check reads 401 since #83 (not ours).
- Stopped at: #104 EV screen next, the last child of #82.

## 2026-11-13 morning (Quick, work), #104 EV screen; #82 closed
- Quick agent aligned to CLAUDE.md (git allowlist, a full commit message every slice); its catch-up, wrap-up and
  board-sync workflows updated to match. No repo change for that.
- Built #104 (js/ui/ev-screen.js): six rows, current EVs white and adds yellow, click 1 / Shift 10 / hold; Learn
  saves then a 2 s toast; Go Home asks. Old scr-evs retired. 104b: fitToStage and createButtonRow in the HUD kit,
  cappedEvs and setEvs in copies.js. 104c: the shared toast restyled (charcoal, teal rim, Michroma), centred pop-in.
- Decided: decision files for the 104 giving rules and the 104c toast look; font rule in HUD-STYLE; toast 1 s was
  too fast, 3 s too long, 2 s it is. Doc tidy: PAUSE-MENU open questions, HUD-STYLE pause colours Approved.
- Tests: pokebox-evs harness 72/72 and 32 mutants caught in Quick's sandbox; Jess ran check.js, the mutate runner
  and the smoke, then committed and pushed (results not logged here). Broke: the smoke's third run reused last
  run's 252 EVs (fixed); the toast's pop animation dropped its centring (old bug, fixed).
- Closed #104 and #82; filed #105 (G.UI.ask restyle) and #106 (menu font, a duplicate of #99).
- Built (approved): PausePokemon and PauseInventory in main.js NEED, with a run-info harness check and 2 mutants.
- Merged feature/pause-menu-rework into feature/gym-leader-ai (78d69120) and pushed; a Windows index.lock rename
  failure on the first try cleared on retry.
- Stopped at: on feature/gym-leader-ai; next is the board fixes, then the acquisition parent issue.

## 2026-11-13 afternoon (Quick, work), #56 closed; #53 designed (leader intelligence)
- #56: a scan of all 37 mutate scripts found 64 STALE (not 42); 63 retargeted (55 reformats, 8 re-aimed), 1 removed
  (shop-screens level-up bans). Closed on the scan; the scripts were not re-run (Git Bash cannot redirect node).
- Board fixes drafted (#99, #106, #102, #29, #86, #101, #74). Leader AI refresher: docs/gym-leader-ai-map.html and a text map.
- #53 decided (decision file 2026-11-13-53): one intelligence per leader drives misjudge, reflex, dodgeRead, memoryUse and
  aimError; two-line curves meeting at the default, nothing perfect at the top; fractional dodge reads; overrides;
  misjudge proportional; growth 0..0.2. LEADER-AI updated. Rule change: misjudge 0.1 at the default.
- Nothing in js/ touched this afternoon; check.js not run.
- Stopped at: #53 plan approved (R2, aimError 10 px at the default, confirmed last). A new chat builds it.

## 2026-11-13 evening (Quick, work), #53 built and closed; four agent skills added
- Skills in .claude/skills (adapted from JordanCoin/codingskills, cursor/plugins, iliaal/ai-skills, with Quick twins):
  coding-principles, structural-review, writing-check, review-feedback. The coding-principles plan check ran on #53.
- #53 built from the approved plan plus A1 to A3, T1 and T2: curves, misjudge noise, fractional reads, validator,
  harness section 17, the sharpness duel, 21 mutants (2 retargeted). leader-ai.js is now 1086 lines.
- Broke: gyms-only-harness's judg ban caught misjudge; fixed in the guard (decision 2026-11-13-53-judgment-guard-...).
- check.js: only the two #30 harnesses red; the mutant result was not reported here. Feel test passed; #53 closed.
- Filed #107 (trigger set limits). Context steering for leaders considered and skipped (movement feels fine).
- Stopped at: #39 next (open the slice: goal, done-condition, test).

## 2026-11-14 morning (Quick, work), 39a built and closed; Bait parked; #30 green; tests check relations
- 39a: goal weights and tag multipliers authorable and wired to the planner; Brock (wall) and Misty (tempo) authored.
  Feel test: distinct, overtuned (Brock closes in too much, Misty runs too much); tuning moves to a balance issue.
  #39 closed; 39b not to be filed (#108 was filed from the first draft: close it).
- Decided: Bait parked in code (it won 97 to 98% of think ticks for every leader); fight-simulation tests dropped
  (their scripted player stood still); tests check relations, not values (TEST-FIRST step 3, CLAUDE.md move rule).
- Broke and fixed: the validator read #53's limits from a placeholder G.LeaderAI; two #59 mutants lost their only
  catchers when the duels went (section 9 checks added); 4 leader-stats mutants targeted the old brain (retargeted).
- #30: check.js all passed. Tools: test leaders, MUTATE_ONLY, failure-only harness output. Plan pages now dark HTML.
- Stopped at: gyms 3 to 8 (merge first or migrate first), then the structural review and the merge.

## 2026-11-14 afternoon (Quick, work), the gym-leader-ai merge and the structural review follow-ups
- Merged feature/gym-leader-ai to main (gyms 3 to 8 ruled to migrate after, slice 12 issue filed), after the
  structural review (Mermaid page) and its pre-merge fixes: F2 leader settings into js/data/leader-ai-settings.js,
  F4 the pause key asks the pause menu once, F7 mutate output untracked.
- Then on their own branches, each merged: F1 hud-overlay.js split into a core plus four hud-kit files (38 kit names,
  smoke-hud-overlay checks the wiring); F3 planner STEP_BY_VERB table (new tools/planner-step-parity.js); F6 dev
  tools into debug-run-screens.js and debug-leader.js (new debug-registry-harness.js). F5 ruled not done.
- Decided: new files count against the 1000-line rule; slice shape is repo-wide (CLAUDE.md); non-code outputs are
  Mermaid .md; the split debug files stay out of NEED. Filed: #121, the planner verb test-gap issue, and others.
- Broke: the first merge never ran (git merge -F - does not read stdin), so check.js showed old main's Misty fails.
  smoke-status-fx's frame check failed once on the work machine (GPU). Every check.js run passed after.
- Stopped at: main clean. Next: open the Brock and Misty tuning slice; rule #49.

## 2026-11-14 evening (Quick, work), #109 template check on balance/109-template-check
- Ordering ruled: template check, gyms 3 to 8, then one eight-gym tuning pass (#122 filed). Target feel ruled from canon:
  Brock a ranged wall, Misty a fast aggressor. Board drift fixed (#112 to #115 closed, blocked-by links set).
- Built (js/ touched): round 1 numbers; a trigger may set goal weights (T3, merged); the dev decision trace; the leader
  reads its whole kit (attackTerms shared with the real hit, fan projectiles, its own defense). 16f-g, 16h, 16i, 13 mutants.
- Broke and fixed: 16f-g read before its trigger fired. My trace misreads (a level 12 Brock, a 4% hit) were wrong.
- Found: Finish wins on cost, so goal weights cannot move it. Stopped at: Jess to rule the Decider scale fix.

## 2026-11-15 (Claude Code, home), #109 round 2 and #123 on balance/109-template-check
- Ruled and built: goal weights scale the whole plan score (net above 0 only; weight 0 never ranked); planned hits deal no
  more than your HP left; Brock Finish 0.35 from tools/replay-leader-trace.js on Jess's home traces. #123: move speed
  0.95 to 1.05 for every Player and wild enemy, Speed sets dodge recharge (0.8 to 1.2); the leader reads it at that rate.
- Tests: 16f rewritten, 16f-g, 16j, speed-band-harness (15); pokebox speed checks to relations; move trace re-recorded.
- Broke and fixed: 16e read a dodge whose threat note fell out of the 40-note log; 15c's hand math counted overkill.
- Second trace: Brock holds (Maintain 35%, Endurance 33%, median 158 px), Misty presses; Brock heals over finishing a
  1% mon (KO bonus 0.3 under a big heal), noted on #122. Jess's feel test passed; #109 and #123 closed.
- Stopped at: merged to main (4eb7e1e9). Next: #111 (gyms 3 to 8) on feature/111-gyms-3-to-8.

## 2026-11-15 afternoon (Claude Code, home), queue reset; #124 economy rule built; #125 boost tools
- Jess parked the leader AI (#111) and set a new queue, filed as #124 to #130 (economy, XP, UI umbrella, Main Menu v3.0,
  acquisition, architecture review, regions); #97 stays the upgrade system.
- Ruled: economy independent of XP; XP bands by skill; Silver 1 per kill from 0; move price by slots filled (Trainer 300
  base, 80/60/20/0; TM Mart 450, thirds and ninths); elite and boss bonuses wait for a trace that reaches gym 1.
- Built: run pace trace (G.Debug.runTrace, tools/run-pace-summary.js, smoke-run-trace); the new price and Silver rule in
  shops.js, silver.js, shop-ui.js; G.Debug.xpBoost(on). Silver and shop harnesses and mutations rewritten to the rule.
- Found: the 3-minute boost makes most of the early lead (+2.1 levels at 3:00 against +0.7 without, from 2 traces).
- Broke and fixed: the trace hook staled one shops mutation; the recorder had to attach after game.js loads.
- Stopped at: #124 in Needs Playtest on balance/124-economy-xp; next a boost-off traced run for #125.

## 2026-11-15 night (Claude Code, home), #124 and #125 closed; #128 acquisition started; #132 to #135 built
- Closed #124, #125 (XP boost now off by default, debug only) and #132, #133, #134, #135 after feel tests. #131 holds the Silver leftovers.
- Ruled: #97 is a full redesign shipping with the acquisition new save; Exp Candy drops unparked; tickets pay coins (40 per x1, 400 per x10);
  rescue event first-build rulings (decisions 2026-11-15-128, -132, -133, -135). #128 split into children #132 to #143.
- Built on feature/128-acquisition: save v4 reset; gacha, slot machine and tickets removed (dead CSS and the gacha copy origin too);
  rescue event (G.Rescue, G.UberElite, generated Stage 1 data, green arrow, rescue-harness with 7 deliberate breaks caught).
- Broke and fixed: Escape on a menu screen read the removed pull overlay; a Co-Authored-By line against CLAUDE.md (dropped).
- Stopped at: #145 filed (move tooltip lacks Physical/Special/Status). Next: #136 catch phase and belt, or #145 first.

## 2026-11-15 late (Claude Code, home), #136 catch phase built
- Opened #136 with goal, done and end-goal test; Jess took every recommendation (decision 2026-11-15-136). Filed #146 (keep-or-sell list).
- Built: a won rescue leaves its Stage 1 30 s; touching it opens a BW catch screen (G.Catch, G.CatchUI); Poke Balls only, belt in the save,
  refilled each run until #137; held catches placed at the run end on the EV flag. G.Debug.catch(). Run Info "Caught this run".
- Tests: rescue-harness parts 5e and 6 (relations; two hand mutants caught), smoke-ui catch flow on a real run.
- Broke and fixed: forcing Math.random for a sure catch also made wild shinies, so the smoke counts rescue copies only.
- Stopped at: #136 in Needs Playtest (works as built; Jess polishes its UI later, with #126). Next: feel test, then #137.

## 2026-11-15 (Claude Code, home), #147 UI Library dev page
- tools/ui-library.html: fonts, working colours (B/W pairs split), SV type palette (live from G.U), pieces (real .type, .toast,
  .hud-text; the rest drawn from HUD-STYLE values), per-screen CSS variables read live and flagged when off-spec, UI-PALETTES sets.
- tools/smoke-ui-library.js: every HUD-STYLE palette hex (116) and UI-PALETTES hex (199) shown, 6 faces load, chips take .type.
  Mutation (one hex changed) fails it. Game CSS class names collided (.card, .grid), so page classes are lib- prefixed.
- Then a Components section (Jess: placeholder content is fine): the HUD kit mounted with lorem names and numbers; move
  slots rebuilt from kit parts, main menu markup copied. Smoke checks each piece draws and its images load.
- Stopped at: Jess looks it over; plan in docs/ASCII Concept Maps/UI Library - Slice Plan.md.
