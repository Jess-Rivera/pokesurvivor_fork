# DECISIONS

A dated log of decisions. It is NOT a register of settled rules: each entry gives the date, a short summary and a `Canonical:` line naming the spec section that holds the rule. When this log and the named spec disagree, the spec wins (CLAUDE.md, "Which document wins").

The full original text of every entry is in docs/DECISIONS-archive.md, which is history. Search it by keyword before assuming a topic was never decided.
Convention: new entries stay at most about 10 lines (date, what was decided, `Canonical:`); long detail belongs in the spec.

## 2026-11-03, Rocks and small chests break in 2 to 3 hits (Jess)
A rock and a small chest take roughly 2 to 3 hits of an Ember, Water Gun or Tackle with no upgrades. Flat 6 HP each: 3 hits at level 1, 2 by level 10, 1 from about level 15 to 20, since prop damage grows with level.
Canonical: BALANCE.md "Drops / economy"

## 2026-11-03, Item rework v2: drops, heal pickup, batch 1 rulings (Jess)
Drops: every chance lives in G.Drops. The heal pickup is retired everywhere; Oran takes its place at the same rates (grass, rocks, small chests), and wild kills drop Oran 0.55% or Sitrus 0.40%. A gym leader drops one item, not two, plus its 10 coins.
Batch 1 is 12 ground and 19 Pokemon items. No species-locked items: Thick Club, Light Ball, Lucky Punch, Leek and the two Powders are generic. Eviolite stays, working while the holder can still evolve. Choice Band physical only, Choice Specs special only, both keep the lock; Muscle Band and Wise Glasses become physical and special only. Gems and run items come later.
Rulings: raise items (Weakness Policy and the like) trigger on the holder's hit and raise the TEAM, keeping COMBAT-RULES SCOPE. Covert Cloak becomes Protective Pads and does not block trap. Leek also gives +10% crit. Jaboca and Rowap deal 12.5% of max HP, capped at 60 + 14 x level on bosses, elites and gyms. King's Rock rolls once per target per 0.5 s. Eject Button ignores trap and the swap lock, then starts the lock. Shed Shell also halves the holder's swap lock.
Canonical: docs/ITEMS.md (generated) and js/data/drops.js for drops; docs/proposals/item-rework-v2-handoff.md for batch 1 until it is built

## 2026-11-02, Dodge on Space (Jess)
Space dodges 150 px in 0.5 s along your heading. Two team charges, each with its own cooldown (7 s, TUNE in the 5 to 10 s band), all paused during a dodge, 0.2 s between dodges. No i-frames: the body circle is 20% of normal for the first 0.3 s, so shots miss more and gaps fit. Enemies stay pass-through. On ice the dodge speed is kept until you leave it. Two rings to the right of the Pokemon show recharging charges.
Canonical: docs/COMBAT-RULES.md "Dodge"

## 2026-11-02, Roar, Fissure, Future Sight imported with the proposed numbers (Jess)
Roar is a 160 px ring with no damage that pushes 140 px; a leader's Roar pushes the player (a 0.2 s slide). Fissure is a power-120 strike at accuracy 100 whose 30% KO lands on wild foes only. Future Sight hits a marked spot 2 s later; a leader marks your spot at the cast with no other wind-up. Roar's cd 5 is [Proposed] (TUNE). Balance passes wait for playtesters.
Canonical: docs/MOVE-INTENT.md roar, fissure, future-sight; docs/BOSS-AUTHORING.md "Validation rules"

## 2026-11-02, Leader returns, beam, burst and trail forms in one slice (Jess)
The four remaining leader forms ship as one slice for larger batches. Razor Leaf flies out and back as its data says (two leaves, one hit per leaf per leg). Psybeam is a beam with a warning line. Fury Attack's jabs each re-aim at you. Toxic is a move slot like every other trail move: alive while the mon is out, ended by a stun, a swap or a faint. The Psycho Cut stand-ins for Psybeam in later loops stay for now.
Canonical: docs/BOSS-AUTHORING.md "Validation rules" (gym forms)

## 2026-11-02, Leader dash form; Self-Destruct as a closer (Jess)
A gym leader casts Quick Attack as a dash to your spot locked at its 0.6 s tell (warning line), one hit there, then back; the leader keeps the i-frames and deals no contact damage while dashing. Self-Destruct on a leader scores 0 in the utility pick until the mon is nearly beaten, then it is the finisher; no new weight setting.
Canonical: docs/MOVE-INTENT.md quick-attack and self-destruct; docs/BOSS-AUTHORING.md "Validation rules"

## 2026-11-02, Gym bosses: per-loop lore sets, loop 1 first (Jess)
The point of the Kanto imports is the bosses; player learnset pools are parked. Gyms go one at a time in GYM-ROSTERS order (the Concept Maps are only a moves reference). Each slot holds one move set per loop from the loop it enters; loop 1 of all 8 gyms gets its lore set first. Giovanni's loop 1 is the Stadium Rhydon set (Fury Attack, Earthquake, Body Slam, Fissure). Self-Destruct stays a real faint, on later-loop mons, with utility weight 0. Sabrina uses Confusion as a stand-in for Psybeam until the beam form. A leader pays recoil (never below 1 HP) and casts Recover at mainline strength (half max HP, 12 s cd) whenever hurt.
Canonical: docs/BOSS-AUTHORING.md "Signature fields" and "Validation rules"; js/data/gyms.js

## 2026-11-02, Kanto batch 1 signed off; Sand Tomb cd 2.5; learnsets use the latest game with a level-up list (Jess)
All 111 batch-1 shapes kept as built (no overrides), and the batch scenario table signed off (108 in batchReviewed, Sand Tomb through its own entry). Sand Tomb cd 2.5, so one patch at a time. The move report no longer asks for a cd ruling on a move with no legacy cd. The learnset dataset picks each Pokemon's latest version group that has a level-up list (pokeapi's Champions rows are "train" only and left 197 species with none).
Canonical: docs/MOVE-INTENT.md sand-tomb; docs/move_rework_holding/build_learnset_dataset.py docstring

## 2026-11-02, Surf and Fly are movement skills (Jess)
Surf is a passive: no water or swamp slowdown and x1.25 speed in them while it is in a slot. Fly is pressed on its slot key: 4 s of flight at walk speed over walls, objects and liquids, hits miss, your moves pause with frozen timers, then a 20 s cooldown from landing; landing on a wall costs 1/16 max HP and moves you to the nearest floor, on an object moves you on along your heading. Neither deals damage, autocasts, becomes the active slot or bonds. Fly joins batch 1; the set-4 Fly ruling is superseded.
Canonical: docs/MOVE-INTENT.md surf and fly

## 2026-11-02, Waves: a widening band across the aim (Jess)
Moves that are waves by name (Surf, Sludge Wave, and the original Heat Wave) become a band 16 px deep across the aim that travels at the nearest foe and widens from 60 to 260 px over about 300 px. A line can now grow its width; the range upgrade and the Area card stretch a line's long side (a beam's length, a wave's width), Presence its short side. Waves show the nova badge for now and count as ranged for aiming and as shots for gym leaders.
Canonical: docs/KANTO-BOSS-MOVE-IMPORTS.md "Batch 1 shape rules" rule 6; docs/MOVE-INTENT.md heat-wave

## 2026-11-02, Kanto import batch 1 shape rules (Jess)
Batch 1 shapes now come from five rules instead of per-move picks. (1) Tackle is the default swing; a melee move with an extra (ailment, flinch, crit, drain, foe stat drop) gives up area, and its name picks which way; drawbacks (recoil, own stat drops) cost nothing. (2) Every shot takes its type's look from the original moves, scaled by power; no-damage status shots follow it too. (3) Area moves: hits everyone around in mainline, or a sound or look, is a ring; a damaging spray is a burst. (4) Mine = placed on the field, trail = left behind as the user moves; Toxic stays a trail as a designer pick. (5) Uniques in this batch: Shock Wave homes, the four powders are drifting clouds, Sand Tomb is a sand patch at a foe, Draco Meteor is three falls.
Canonical: docs/KANTO-BOSS-MOVE-IMPORTS.md "Batch 1 shape rules"

## 2026-11-01, Kanto import batch 1: held from pools, multi-hit as quick repeats, simplifications (Jess)
The 110 batch-1 moves (the 114 that map to the schema, minus Mud-Slap, Mirror Shot and Hone Claws, which wait on the accuracy trackers, and Throat Chop, which needs a silence status) join the catalog but stay out of every player pool (G.Moves.HELD) until pools follow mainline learnsets. Multi-hit moves are quick repeats: Double Kick 2, the 2-5 hit moves a fixed 3, full power each. Ancient Power rolls once per stat; Synthesis and Moonlight ignore weather; Earthquake and Surf drop their Dig/Dive bonus and Brick Break its screen break until those exist; Poison Fang inflicts regular poison. Moves that hit every foe split between a ring around the user and a Mud Shot burst. Shapes, numbers and status cooldowns stay proposals until Jess's shape review (tools/kanto-batch1-review.html) and the batch review.
Canonical: docs/KANTO-BOSS-MOVE-IMPORTS.md "Batch 1"

## 2026-11-01, Kanto import rulings set 4: priority ignored, two-turn, rampage, whole-field (Jess)
Priority is not a mechanic: Quick Attack and the six priority imports cast by shape and power; a bonded group casts in slot order (closes the Quick Attack priority question). Fly, Dig, Dive, Bounce vanish with i-frames then strike; Solar Beam charges (instant in sun); Future Sight lands after a delay. Outrage, Thrash, Petal Dance lock in then confuse; Hyper Beam has a recharge lockout. Whole-field moves are team-side fields: weather, Reflect / Light Screen / Safeguard as timed team buffs, Stealth Rock as hazards (Rapid Spin clears them).
Canonical: docs/MOVE-INTENT.md (per move)

## 2026-11-01, Kanto import rulings set 3: odd damage stats and new status mechanics (Jess)
Foul Play, Psyshock, Electro Ball and Grass Knot follow mainline (species weight joins the dex). Protect is a short full block on a long cooldown. Rest is a big heal plus ailment clear with no self-sleep; Yawn is a delayed sleep. Attract (infatuation skip), Disable, Roar (scatter), Focus Energy (crit stage), Magnet Rise (Ground immunity) get real-time analogs; Skill Swap is not imported. Psych Up and Swagger stay with the open stage-manipulation decision.
Canonical: docs/MOVE-INTENT.md (per move)

## 2026-11-01, Kanto import rulings set 2: turn conditions, sleep moves, switching, OHKO (Jess)
Fake Out, Sucker Punch, Focus Punch, High Jump Kick and Feint get real-time analogs (first cast after swap-in, foe mid wind-up, charge cancelled by a hit, 50% crash on a whiff, breaks a guard window). Dream Eater and Nightmare work only on sleeping targets. U-turn hits and clears the swap lock (no auto-swap); Baton Pass waits on the stage-manipulation decision. Fissure KOs wild enemies only (30%); everything else takes a heavy hit. Numbers marked [Proposed] until the batch review.
Canonical: docs/MOVE-INTENT.md (per move)

## 2026-11-01, Kanto import rulings set 1: accuracy/evasion, HP power, reflection, self-KO (Jess)
Accuracy and evasion become stage trackers with the mainline miss chance (Double Team, Minimize, Sand-Attack, Smokescreen, Lock-On, Foresight; Mud-Slap, Mirror Shot, Hone Claws keep their riders). Flail, Reversal, Wring Out use the mainline HP curves. Counter and Mirror Coat are a short stance window reflecting x2. Explosion and Self-Destruct faint the caster for real on both sides (last mon = run over, Re-Do applies). Window lengths and blast sizes are [Proposed] until the batch review.
Canonical: docs/MOVE-INTENT.md (per move), docs/COMBAT-RULES.md "Stat stages" (accuracy and evasion trackers)

## 2026-11-01, Kanto gyms 2 to 8 authored; badge boosts for every Kanto badge (Jess)
Misty, Lt. Surge, Erika, Koga, Sabrina, Blaine and Giovanni join Brock in js/data/gyms.js with their locked rosters (Gen-1 order) and PROVISIONAL move sets from catalog moves that have a gym form; power and tempo 1, no cards yet. Badge boosts, each +10% to one stat for the run: Boulder Atk, Cascade SpD, Thunder Spe, Rainbow HP, Soul Def, Marsh SpA, Volcano SpA, Earth Atk (repeats stack). Brock slots reordered (Onix line to slot 2). Surge has no castable Electric move (Thunder Shock chains), so his mons use Normal and Steel stand-ins until boss casts and riders are widened (next, Jess). Authoring rule found: one melee cone per slot, since the brain only lands its longest-reach melee.
Canonical: js/data/gyms.js (data), BOSS-REWORK.md section 3g (badge boosts), docs/BOSS-AUTHORING.md (authoring rule)

## 2026-11-01, ESLint + Prettier setup choices (Jess: defaults)
ESLint 9 flat config: eslint:recommended plus a short Airbnb-derived set (eqeqeq, no-var, prefer-const, no-shadow, no-unused-vars), not the full Airbnb config (it assumes ES modules and bans patterns this script-global code uses). Warn-only: tools/check.js prints the count and never fails on it. Prettier: single quotes, semicolons, 2-space, width 120, trailing commas es5, LF; .gitattributes and .editorconfig pin LF. One big-bang format commit comes next, its hash in .git-blame-ignore-revs.
Canonical: TODO.md Backlog, "Lint and format tooling"; eslint.config.js; .prettierrc.json

## 2026-11-01, Slice 7b done: one move path (Jess)
The ?newcombat flag is gone: every move, player and gym leader, runs in G.MoveSim from its resolved def. Deleted: the legacy player-move engine (the player half of combat.js, player shots in projectile.js), kinds.js, mechanics.js, the legacy level-up cards and the choose screen, the ROUTED list (routed now means a resolved def that is not retired), the legacy stage stacking and the norm factor. Bubble and Hail retired (D-BUBBLE, D-HAIL). The legacy table is kept only for the tools (docs/move_rework_holding/legacy-moves.js). Not changed: js/net/coop.js still calls removed hooks (deferred, D-COOP). Skipped: the dead G.Log.hitOut cleanup in js/systems/log.js. Each step feel-tested by Jess.
Canonical: docs/current feature planning/move-schema-post-auth/slice-7b.md, "Results"

## 2026-11-01, D-HAIL: Hail leaves the pool until its toggle exists; old saves get Water Gun (Jess)
Option (c). The toggle skill item stays parked (MOVE-INTENT hail) and becomes its own issue after the merge. A save that holds Hail loads with Water Gun. Declined: building the toggle in 7b, and a plain snow cast (snow chips the player's own non-Ice team).
Canonical: docs/current feature planning/move-schema-post-auth/slice-7b.md, "Decision D-HAIL"

## 2026-11-01, D-BUBBLE: Bubble is retired; its starters open with Water Gun (Jess)
Bubble (the 64th legacy move, never converted) leaves the move pool in slice 7b. The two starters that open with it (dex 393 and 728) open with Water Gun instead. Old saves that hold Bubble must still load. Also recorded: the slice 6 stress run was done (Quick did not log it).
Canonical: docs/current feature planning/move-schema-post-auth/slice-7b.md, "Scope"

## 2026-10-31, 7a UI readers: picks 1c, 2a, 3a, 4a (Jess)
Menus, level-up cards, icons, the HUD, the sheet and player.js read the resolved def (G.MoveDefs, through G.MoveInfo for display), never the legacy `kind`. 1c: a move's card text is generated from its def (shape plus effects), not copied from moves.js. 2a: the icon badge comes from the def's shape, motion and anchor (14 badges change, listed in slice-7a.md Results). 3a: player.js gameplay readers migrate: the melee damage-taken cut reads balanceClass, ranged targeting reads a travelling shot or a beam, Life Orb skips persistent defs; the buff test is self-only on both flags. 4a: the sheet's routed rows read the folded def; flag-off rows stay until 7b. The 7a guard (tools/kind-guard.js) fails on any legacy read outside 7b's files; known leftovers are tagged legacy-7b.
Canonical: docs/current feature planning/move-schema-post-auth/slice-7a.md, "Results"

## 2026-10-31, Gym leader mons play like the player: cards per mon, autocast, Tier 1 AI (Jess)
Amends D-ENEMY. Each roster mon is its own sim owner holding upgrade cards (the player's card rules, per mon, no team cards), not hand-set numbers. Its moves autocast through G.MoveSim like the player's (one group, per-move cooldowns, pure buffs on their Gate per SS8); the brain only moves. Mons are drawn at player size, so cone reach is measured from the center like the player's. Every enemy cast keeps a tell with the aim locked at its start (0.5 s shots, 0.45 s melee, 0.3 s buffs; BOSS-REWORK's 0.3 to 0.45 is corrected). Riders: damage only, no knockback on the player. Contact: fixed to Tackle, never swapped. Tempo and power stay as per-mon knobs. Scope: player-like shell plus Tier 1 movement AI in 7a; Tier 2 smart play gets its own branch after the merge.
Canonical: docs/current feature planning/move-schema-post-auth/slice-7a.md, "Blocking decisions"

## 2026-10-31, Gym and Elite Four rosters use the Gen-1 order; anime counts as canon (Jess)
Slot order = the leader's Red/Blue send-out order, one slot per evolution line; the rest fill by final-stage BST, weakest first (ties keep the old order). Picks stay as locked 2026-10-22, since anime is a canon source (Misty keeps the Poliwag line). Jolteon and Flareon start from Eevee. Brock keeps Geodude in slot 1 (7a pilot untouched); Onix moves to slot 2. Ace-first was considered and dropped. The two lore moveset maps and gyms.js slots 2 to 6 still use the old order (TODO).
Canonical: docs/GYM-ROSTERS.md, rules section "GEN-1 ORDER"

## 2026-10-31, Gyms only: rifts, legendary fights and the Judgment are removed (Jess)
Every rift and legendary-fight reference leaves the game; bosses are gym leaders only. The gym arena moves out of rift.js. The pokedex legendary flag stays as a spawn exclusion; old save fields stay readable and are never wiped; js/net/ is deferred. D1: legendaries stay as gacha pulls (rarity 5, pity). D2: Q10, Q11 and the post-loop-6 legendary fights stay as future scope, to be built on a new arena and brain, not rift code. D3: the smaller Master Ball supply is accepted for now (TODO). Supersedes the RiftBrain part of the boss split entry below.
Build follow-up (Jess, same day): all 8 commit A behavior changes approved, including no 'rift' progress event on a gym win, no save.legends write on a gym kill (it was a bug), and the dropped wasted random roll (changes 2, 3, 6 explained in their own map).
Canonical: docs/ASCII Concept Maps/Slice 7a-0 - Gyms Only Plan.txt; Slice 7a-0 - Commit A Changes 2, 3, 6.txt

## 2026-10-31, Boss AI leaves enemy.js: shared body plus a brain (Jess)
Option B of three (A file move, B brain divorce, C separate Boss class). Every line of boss decision code moves to js/entities/boss-ai.js as a GymBrain attached by G.Boss.make (gyms only, entry above); the Enemy body (HP, hurt, die, status, stages, grid slot) stays shared so player moves and status rules have one copy. C rejected: it duplicates every combat rule (drift) and goes against the one-executor decision. Commit B of slice 7a-0, no behavior change.
Canonical: docs/ASCII Concept Maps/Slice 7a-0 - Gyms Only Plan.txt

## 2026-10-31, D-ENEMY: bosses cast through the new move system with an enemy owner; roster sets boss move numbers (Jess)
Option (a): bosses and gym leaders cast through G.MoveSim with an enemy as the owner, scoped to what Brock needs (Q18); other gyms come with the gym-roster branch. No boss-only cast code and no derived `kind`. Brock's upgrade stacks are replaced by numbers set directly in the roster (no team cards on bosses, no G.Moves.addStack).
Canonical: docs/current feature planning/move-schema-post-auth/slice-7a.md, "Blocking decisions"

## 2026-10-31, D-COOP: no co-op work in slice 7a (Jess)
Co-op cannot run in the local-first phase, since the net stack it needs is deferred and does not work, so there is no local co-op behavior to preserve through the flip. 7a does no co-op work; co-op on the new move path is designed in the MP phase (TODO deferred section).
Canonical: docs/current feature planning/move-schema-post-auth/slice-7a.md, "Blocking decisions"

## 2026-10-31, Slice 6 closes at batch 2; Quick Attack and Aerial Ace go to a later fun pass (Jess)
Batch 3 is dropped from slice 6. Quick Attack ("nauseating") and Aerial Ace ("needs a rework") work as intended on the new path, they are just not fun, so this is a balance and fun pass, not a correctness fix. Both move to a TODO Backlog entry for a later feature branch; the open questions D-QA and D-AA (Slice 6 - Batch 1 Plan.txt section 6) go with them. Slice 6 is done once the stress run is recorded or carried; slice 7a is next.
Canonical: docs/current feature planning/move-schema-post-auth/slice-6.md, "Results"

## 2026-10-31, New path primitive path.loop for Fairy Wind (Jess)
Travelling shots gain path.loop { radius, frequency }: the shot circles a base point that keeps travelling straight, so it draws loop-de-loops that drift away from the caster. The loop is centred on the base point, so the first loop goes round the caster and the shot starts one radius across from it; it never turns the base heading, and adds to oscillate. Needed because curve alone traces a closed circle and oscillate is a 1D weave. First user: Fairy Wind (radius 70, 0.6667 Hz, 90 px/s drift, 2 loops in 3 s; retuned and centred after the same-day feel test). Rule change: grammar, runtime and render trail.
Canonical: docs/current feature planning/combat-architecture.md D38; docs/MOVE-AXIS-SCHEMA.md path row

## 2026-10-31, Slice 6 becomes projectile spacing and nova sizing; balance moves to playtest branches (Jess)
The damage simulator and balance pass leave slice 6. Balance passes become their own branches after the game has playtesters, so the numbers are tuned on real play rather than offline tables. Slice 6 is now a feel fix: shot spacing on multi-shot moves (String Shot #15 and others) and nova sizes. Rules do not change, only spacing and size numbers in move data. The slice 6 balance questions (throughput outliers, H13 children power, stage tunables, card steps and caps) carry to the first balance branch.
Canonical: docs/current feature planning/move-schema-post-auth/slice-6.md

## 2026-10-31, 2-buff learn limit on the new path: self-only buffs (Jess)
On the new move path a move counts toward the 2-buff learn limit when every effect in it, emitted children included, lands on its own side: a self or team stat change, a self heal, a shield, a recoil cost. That is the five stat and heal buffs (Swords Dance, Agility, Harden, Dragon Dance, Aqua Ring) plus Substitute. Moves with a foe-side effect but no damage (Toxic, Will-O-Wisp, String Shot, Spikes, Toxic Spikes) are not buffs, since they still act on enemies. Replaces the build default "no damage anywhere". Unrouted moves keep the legacy kind check until 7b.
Canonical: js/systems/team-cards.js selfOnly; docs/current feature planning/move-schema-post-auth/slice-5-handoff.md

## 2026-10-31, ESLint and Prettier wait for the move-schema merge (Jess)
Both tools are adopted, but neither lands until feature-test/new-move-schema merges into main (after 7b), so the branch never has to reconcile a whole-repo reformat. Then one chore branch off main: ESLint (script sourceType, browser globals plus G, ecma 2020, generated and vendored folders ignored, warn-only in check.js at first), and Prettier as one big-bang format commit, listed in .git-blame-ignore-revs. Prettier options are settled at that time, matching the house style (2-space, single quotes, semicolons).
Canonical: TODO.md Backlog, "Lint and format tooling"

## 2026-10-30, Slice 5b card list: team-wide cards grouped by move axis (Jess)
Upgrade cards on the new path are grouped General, Space, Delivery and Payload, each pointing at named move fields. Cooldown Down is added; Reach Up also lengthens flight time; Time Up only touches emitted or spawned things; Count Up only applies where copies spread out; HP Regen heals the bench only; the six stat cards become one Vitamins card with a pick of 3. Retired on the new path: Buff Stacks, the kind-damage cards, Size, Arc, Width, Shot Range, the old Duration, Projectile Speed, Fire Rate. Dodge Cooldown and Splash deferred.
Canonical: docs/ASCII Concept Maps/Slice 5b - Cards From Fields.txt; move-schema-post-auth/slice-5.md

## 2026-10-30, Pure buffs cast only while active; swap-in respects the Gate; Bond tax shape (Jess)
A pure buff casts on its Gate only while its group is active, so a buff alone in its slot is charge-then-swap: it climbs while active and its stages carry onto the next group for the rest of their Duration. A swap-in cast of a pure buff happens only when that move has no Gate running; otherwise it waits for the Gate. Bond tax proposed as 0.5 x Gate x chance on every move in the group, the taxing move included; only changes that help their side (self or team raises, foe drops) are taxed (Bond branch; details still open).
Canonical: docs/COMBAT-RULES.md, "Stat stages" SS8 and the Bond tax line

## 2026-10-30, Upgrade cards go team-wide in slice 5b (Jess)
Every upgrade card becomes a run-wide team bonus ("this run: +15% Fire Damage") on the new path, built in slice 5b. The separate team-wide upgrades branch is folded in, so the two stat stage cards (Gate, Duration) are built in 5b too. Open sub-questions live in the 5b map.
Canonical: move-schema-post-auth/slice-5.md; docs/COMBAT-RULES.md, "Stat stages" SS10; docs/ASCII Concept Maps/Slice 5b - Cards From Fields.txt

## 2026-10-30, Slice 5 scope: retired fields, team cards, gym Harden (Jess)
The retired stat fields (`maxStacks`, `duration`) are removed from the new-path data, resolver defaults and overrides once the tracker harness passes; the validator then rejects them. The Gate and Duration cards are built in the team-wide upgrades branch, not slice 5. Gym Harden moves onto the model in slice 7a. SLOW and HASTE (carrier statuses) stay outside the model on their CARRIER timers; slice 7b keeps a fixed-timer stage application for them.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "Retired stat fields"; docs/COMBAT-RULES.md, "Stat stages" SS10 and SS13; move-schema-post-auth/slice-5.md and slice-7a.md, carrier statuses; slice-7b.md
Superseded in part 2026-10-30: the team cards are built in slice 5b (entry above).

## 2026-10-30, Stat stage model approved: per-move trackers replace maxStacks (Jess)
R1 to R13 of docs/proposals/stat-stage-model.md approved as COMBAT-RULES:SS1 to SS13. One tracker per (Pokemon, move, stat); global Gate 6.0 s and Duration 6.1 s; every success refreshes, a success with the Gate open climbs by the move's pokeapi stages; a dry window resets only that tracker. Self drops climb on Gate x 2. Strong hosts follow the model with STRONG_HOST_GATE_MUL 1 (Brock's Harden reaches +6 in about 30 s). Two team-wide cards (Gate, Duration).
Retires maxStacks, the stat `duration` field, Q13, Q14, Q15 / QA-11, D-FOECAP, D-LEAF, D-MC5 and the per-move stage rulings for Bug Buzz, Ice Beam, Dragon Dance, Leaf Storm, Metal Claw, Meteor Mash and String Shot. Built in slice 5 on this branch, not its own branch. Left [Open]: Bond tax, stage-manipulation moves, raises on foes and whole-field moves.
Canonical: docs/COMBAT-RULES.md, "Stat stages"; docs/MOVE-INTENT.md (the seven moves above); combat-architecture section H, H26; docs/MOVE-AXIS-SCHEMA.md, "Retired stat fields"

## 2026-10-29, D-AIM: aimTrack tracks only within the cone's reach (Jess)
Flamethrower's sticky target counts as "in range" only within min(range 420, 250 + the enemy's radius), the same limit as its cast gate, not range 420. An enemy past reach is dropped and the nearest within reach re-picked; with none the heading holds. Approved with the 4c-3 plan; built.
Canonical: docs/MOVE-INTENT.md, flamethrower; docs/MOVE-AXIS-SCHEMA.md, `aimTrack` row

## 2026-10-29, A root holds every reposition; Quick Attack gets a 3 s cap (Jess)
From the 4c-2 review. Option (a): a rooted movement commitment holds Quick Attack and Aerial Ace at the cast gate until the root ends (option (b), dashes as an escape from your own root, rejected). No current move roots its caster (Flamethrower slows), so this guards future moves; a slowed commitment does not hold a dash. Every swept dash carries an endOn time as a safety net (Quick Attack 3 s); if it fires the owner stays put, no snap back. A one-way swept dash ends `arrived` after its hit at B.
Canonical: docs/MOVE-INTENT.md, quick-attack and aerial-ace

## 2026-10-29, Bug Buzz keeps 100% Sp. Def -1 held at -1, and rehit 0.5 (Jess)
The source's 10% chance stays dropped (the 2026-10-24 Option B design): every hit rolls at 100% and the authored foe cap of 1 holds it at -1, so each enemy in the aura is marked once. Damage stays 90 power every 0.5 s (about 180 Power/s per enemy in range); the throughput goes to the slice 6 balance pass. No data change.
Canonical: docs/MOVE-INTENT.md, bug-buzz

## 2026-10-29, Persistent lifecycle: the slot owns it, endOn is instance-only (Jess)
`persistent: true` spawns the move while its slot is active and the owner unstunned, ends it on a swap, stun or faint, and respawns it after any instance end, so an aura is `persistent` alone and a pulse is `persistent` plus `endOn` time. A persistent move never lists notActive; a move that is not persistent needs an endOn unless it is a self-cast, whose effects carry their own duration. Supersedes the review 9.2 C13 wording "persistent requires an endOn notActive"; notActive was removed from the six persistent moves.
Canonical: docs/MOVE-AXIS-SCHEMA.md, `persistent` row; combat-architecture section H, H25

## 2026-10-29, D-PSY: Psychic re-picks its steering target once (Jess)
After the cast target is lost Psychic re-picks the nearest live enemy once, then flies straight, as D23 already says for every turnRate move. No exception, no new rule; 4c-3 is built as written.
Canonical: docs/MOVE-INTENT.md, psychic; combat-architecture D23

## 2026-10-29, D-FOECAP: only an authored maxStacks caps a foe drop (Jess)
The resolver fills the maxStacks default on self-side stat effects only. Ice Beam and Bug Buzz keep their authored foe cap of 1; every other foe drop stacks to the -6 ladder. No new field.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "maxStacks field rule"; combat-architecture section H, H24
Superseded 2026-10-30 by the stat stage model (DECISIONS 2026-10-30).

## 2026-10-29, D-LEAF: Leaf Storm's self Sp. Atk -2 refreshes on hit (Jess)
The -2 refreshes its 6 s on each hit and holds at -2. An enemy is almost always in reach, so it reads as on while active and lasts 6 s after the last hit, which covers the tail after the move ends. Supersedes the CP3 "held while active" wording; the grammar gap is closed, the 4c-1 handoff P6 and Test 5 stand.
Canonical: docs/MOVE-INTENT.md, leaf-storm
Superseded 2026-10-30 by the stat stage model (DECISIONS 2026-10-30).

## 2026-10-29, Move review rule for Stage 0 and later batches (Jess)
A move counts as reviewed when it has a MOVE-INTENT entry and its data and code match it. Moves without an entry are reviewed with the batch that routes them; any move needing specific disambiguation gets a MOVE-INTENT entry. Scenarios that depend on an open decision are marked blocked, not guessed.
Canonical: CLAUDE.md, "Move review rule" (moved from stage-0.md the same day so it outlives the branch)

## 2026-10-28, Move-schema branch end and the code-gap rule (Jess)
feature-test/new-move-schema merges into main after slice 7b, once all 63 moves run on the new path and the legacy player-move path is deleted. A new branch then imports the gym-roster moves; until then the gym is Brock only. A STATE.md code-gap item is built in this branch only if it is tied to the move-schema work; otherwise it waits for its own branch.
Canonical: docs/current feature planning/move-schema-post-auth/slice-overview.md, "Goal and end of the branch" and "Code-gap rule"

## 2026-10-28, QA-00: Coding is paused until the whole documentation consolidation is done
Coding is paused until the whole documentation consolidation is done. (owner answer QA-00)
Canonical: STATE.md, "Where we are"

## 2026-10-28, QA-01: DECISIONS.md becomes a dated decision log; each entry names the spec that holds the rule
DECISIONS.md becomes a dated decision log; each entry names the spec that holds the rule. (owner answer QA-01)
Canonical: CLAUDE.md, "Which document wins"

## 2026-10-28, QA-02: GDD.md becomes a living umbrella that summarises and points to the subsystem specs
GDD.md becomes a living umbrella that summarises and points to the subsystem specs. (owner answer QA-02)
Canonical: GDD.md, "Where the details live"

## 2026-10-28, QA-03: General combat rules get one home, docs/COMBAT-RULES.md
General combat rules get one home, docs/COMBAT-RULES.md. (owner answer QA-03)
Canonical: CLAUDE.md, "Where current rules live"

## 2026-10-28, QA-04: Per-move rulings get one home, docs/MOVE-INTENT.md, instead of enlarging and renaming the old file
Per-move rulings get one home, docs/MOVE-INTENT.md, instead of enlarging and renaming the old file. (owner answer QA-04)
Canonical: docs/MOVE-INTENT.md, "Per-move rulings"

## 2026-10-28, QA-05: Finish the consolidation first, even if the move-schema slice files and handoffs need updating
Finish the consolidation first, even if the move-schema slice files and handoffs need updating. (owner answer QA-05)
Canonical: CLAUDE.md, "Where current rules live"

## 2026-10-28, QA-06: BOSS-REWORK.md becomes the run progression and encounters spec
BOSS-REWORK.md becomes the run progression and encounters spec. (owner answer QA-06)
Canonical: BOSS-REWORK.md, "1. Overview"

## 2026-10-28, QA-07: Consolidated groups of specs are tagged [Approved]; the four tags are defined once in CLAUDE.md
Consolidated groups of specs are tagged [Approved]; the four tags are defined once in CLAUDE.md. (owner answer QA-07)
Canonical: CLAUDE.md, "Requirement tags"

## 2026-10-28, QA-08: The end-of-region and loop design is recorded: Return Home, Next Region, Unlock Safeties, loops and Keep Going. Approved, not built
The end-of-region and loop design is recorded: Return Home, Next Region, Unlock Safeties, loops and Keep Going. Approved, not built. (owner answer QA-08)
Canonical: BOSS-REWORK.md, "4a. End of region and loops"

## 2026-10-28, QA-10: Fire Spin applies burn and trap and does not strip stat stages
Fire Spin applies burn and trap and does not strip stat stages. (owner answer QA-10)
Canonical: docs/COMBAT-RULES.md, "Trap, enemies"

## 2026-10-28, QA-11: A self-buff's maxStacks is min(floor(duration / cooldown), 6)
A self-buff's maxStacks is min(floor(duration / cooldown), 6). (owner answer QA-11)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"
Superseded 2026-10-30 by the stat stage model (DECISIONS 2026-10-30).

## 2026-10-28, QA-12: The mainline type chart stays on hold
The mainline type chart stays on hold. (owner answer QA-12)
Canonical: docs/COMBAT-RULES.md, "Type chart"

## 2026-10-28, QA-13: Option (a) for gym moves waits for the supporting move import and gets its own branch
Option (a) for gym moves waits for the supporting move import and gets its own branch. (owner answer QA-13)
Canonical: BOSS-REWORK.md, "3a. Gym move vocabulary"

## 2026-10-28, QA-14: Enemies, upgrades and items content is audited before the GDD is consolidated
Enemies, upgrades and items content is audited before the GDD is consolidated. (owner answer QA-14)
Canonical: GDD.md, "Where the details live"

## 2026-10-28, QA-15: Agent rules live only in CLAUDE.md; the Quick agent loads it
Agent rules live only in CLAUDE.md; the Quick agent loads it. (owner answer QA-15)
Canonical: CLAUDE.md, "Where current rules live"

## 2026-10-28, Q1: Boss doc renames and moves happen in a later organization branch; nothing is renamed in this branch
Boss doc renames and moves happen in a later organization branch; nothing is renamed in this branch. (owner answer Q1)
Canonical: TODO.md, "Backlog"

## 2026-10-28, Q2: Gym 1 at 4:00; each later gym 4:00 after the previous gym is beaten and the player has returned
Gym 1 at 4:00; each later gym 4:00 after the previous gym is beaten and the player has returned. (owner answer Q2)
Canonical: BOSS-REWORK.md, "3. Gyms"

## 2026-10-28, Q3: First elite at 2:00; each later elite 2:00 after return; none while one is alive
First elite at 2:00; each later elite 2:00 after return; none while one is alive. (owner answer Q3)
Canonical: BOSS-REWORK.md, "2. Overworld Elites"

## 2026-10-28, Q4: Gate escalation: 37 s grace, then +1 level every 10 s, uncapped
Gate escalation: 37 s grace, then +1 level every 10 s, uncapped. (owner answer Q4)
Canonical: BOSS-REWORK.md, "3f. Gate escalation"

## 2026-10-28, Q5: Level is linear to L50 by 30:00, clamped at L50 until all 8 gyms are beaten, then a post-gym slow ramp, uncapped across loops and Next Region
Level is linear to L50 by 30:00, clamped at L50 until all 8 gyms are beaten, then a post-gym slow ramp, uncapped across loops and Next Region. (owner answer Q5)
Canonical: BOSS-REWORK.md, "4a. End of region and loops"

## 2026-10-28, Q6: The four Elite Four fights start at once with hard-set levels, and the player picks the order
The four Elite Four fights start at once with hard-set levels, and the player picks the order. (owner answer Q6)
Canonical: BOSS-REWORK.md, "3e. Multi-mon gyms"

## 2026-10-28, Q7: Wild level + 4, locked at spawn, plus the escalation bump read at entry
Wild level + 4, locked at spawn, plus the escalation bump read at entry. (owner answer Q7)
Canonical: BOSS-REWORK.md, "3f. Gate escalation"

## 2026-10-28, Q8: Unlock Safeties means "continue to Loop N+1"; the performance-scaled (DDA) version is dropped
Unlock Safeties means "continue to Loop N+1"; the performance-scaled (DDA) version is dropped. (owner answer Q8)
Canonical: BOSS-REWORK.md, "4a. End of region and loops"

## 2026-10-28, Q9: Descendant Mutation: the player's mon's moves and typing go to another mon. Approved, not built
Descendant Mutation: the player's mon's moves and typing go to another mon. Approved, not built. (owner answer Q9)
Canonical: GDD.md, "12. Meta and endgame"

## 2026-10-28, Q10: Arceus is gated on the 9th completion point of The Climb. Approved, not built
Arceus is gated on the 9th completion point of The Climb. Approved, not built. (owner answer Q10)
Canonical: GDD.md, "12. Meta and endgame"

## 2026-10-28, Q11: Shiny tiers, gold-toll re-challenge, Uber modifiers, per-region legendary counts and the one-sitting achievement stay [Proposed]
Shiny tiers, gold-toll re-challenge, Uber modifiers, per-region legendary counts and the one-sitting achievement stay [Proposed]. (owner answer Q11)
Canonical: GDD.md, "12. Meta and endgame"

## 2026-10-28, Q12: The completion bonus (escalating per loop) replaces the 60 and 90 minute time bonus
The completion bonus (escalating per loop) replaces the 60 and 90 minute time bonus. (owner answer Q12)
Canonical: BOSS-REWORK.md, "4a. End of region and loops"

## 2026-10-28, Q13: A self-buff's duration is never shorter than its cooldown
A self-buff's duration is never shorter than its cooldown. (owner answer Q13)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"
Superseded 2026-10-30 by the stat stage model (DECISIONS 2026-10-30).

## 2026-10-28, Q14: Every move defaults to maxStacks 1, including Metal Claw and Meteor Mash (authored 2 today; code default 6 is legacy)
Every move defaults to maxStacks 1, including Metal Claw and Meteor Mash (authored 2 today; code default 6 is legacy). (owner answer Q14)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"
Superseded 2026-10-30 by the stat stage model (DECISIONS 2026-10-30).

## 2026-10-28, Q15: For a self-buff, maxStacks = min(floor(duration / cooldown), 6), new path only
For a self-buff, maxStacks = min(floor(duration / cooldown), 6), new path only. (owner answer Q15)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"
Superseded 2026-10-30 by the stat stage model (DECISIONS 2026-10-30).

## 2026-10-28, Q16: maxStacks applies only to self-buffs; foe debuffs have no per-move cap, only the +-6 ladder
maxStacks applies only to self-buffs; foe debuffs have no per-move cap, only the +-6 ladder. (owner answer Q16)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"

## 2026-10-28, Q17: Fire Spin: burn at the full standard length, trap, no strip
Fire Spin: burn at the full standard length, trap, no strip. (owner answer Q17)
Canonical: docs/COMBAT-RULES.md, "Trap, enemies"

## 2026-10-28, Q18: Slice 7 does not implement gym option (a); after slice 7 the gym is Brock only
Slice 7 does not implement gym option (a); after slice 7 the gym is Brock only. (owner answer Q18)
Canonical: BOSS-REWORK.md, "3a. Gym move vocabulary"

## 2026-10-28, Q19: DECISIONS entries use ISO dates and a Canonical: line naming the section only, no line numbers
DECISIONS entries use ISO dates and a Canonical: line naming the section only, no line numbers. (owner answer Q19)
Canonical: CLAUDE.md, "Which document wins"

## 2026-10-28, Q20: Superseded and converted entries move verbatim to docs/DECISIONS-archive.md
Superseded and converted entries move verbatim to docs/DECISIONS-archive.md. (owner answer Q20)
Canonical: CLAUDE.md, "Which document wins"

## 2026-10-28, Q21: Bulk [Approved] covers only items marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED, signed off or [Jess decided]
Bulk [Approved] covers only items marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED, signed off or [Jess decided]. (owner answer Q21)
Canonical: CLAUDE.md, "Requirement tags"

## 2026-10-28, Q22: The Quick agent loads CLAUDE.md; its instructions change the same day as the agent-rules rewrite
The Quick agent loads CLAUDE.md; its instructions change the same day as the agent-rules rewrite. (owner answer Q22)
Canonical: CLAUDE.md, "Two tools, one repo"

## 2026-10-28, Q23: Unexecuted 4c handoffs get pointers plus a conflict list, not rewritten build steps
Unexecuted 4c handoffs get pointers plus a conflict list, not rewritten build steps. (owner answer Q23)
Canonical: docs/current feature planning/move-schema/slice-4c.md, "Decisions (moved)"

## 2026-10-28, Q24: The owner deletes temp-audit-outputs before the merge
The owner deletes temp-audit-outputs before the merge. (owner answer Q24)
Canonical: TODO.md, "Backlog"

## 2026-10-28, A3-1: The Return Home completion bonus replaces the 60 and 90 minute time bonus (Q12)
The Return Home completion bonus replaces the 60 and 90 minute time bonus (Q12). (owner answer A3-1)
Canonical: BOSS-REWORK.md, "4a. End of region and loops"

## 2026-10-28, A3-2: Q16 stands: maxStacks applies only to self-buffs
Q16 stands: maxStacks applies only to self-buffs. (owner answer A3-2)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"

## 2026-10-24, 64-move pass tooling, seed rules, reposition and dash schema [Jess decided, feature/all-moves-import]
Move re-classification is a full from-scratch pass of all 64 moves against MOVE-AXIS-SCHEMA. Per-move data keeps only raw source lifts at the top level. Pierce, hitPolicy (oncePerInstance default, interval, onReentry) and reposition (repositionMode teleport or swept, returnToOrigin, dashMult, returnHits) rules were set, with Quick Attack as the canonical return dash.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "Settled design decisions (2026-10-24)"

## 2026-10-22, Gym gate is a pressure mechanic (escalation), not come-when-ready [Jess decided, rework/gym-progression]
A gym gate opens a 37 s grace, then every 10 s the wild spawn level and the leader's locked level both rise by 1, uncapped. One shared bump is read at wild spawn and at gym entry, and clears on the win. The escalation clock needs host authority in the cloud phase.
Canonical: BOSS-REWORK.md, "3f. Gate escalation"

## 2026-10-22, Language split and sim/present boundary as the SP architecture direction [Jess decided]
The client stays JS in the browser. The server language is deferred to the multiplayer phase. Standing SP discipline: converge the sim toward a sim/present event boundary, keep collision radius out of sprite metadata and the clock injected. It is a direction, not a refactor slice.
Canonical: docs/SIM-PRESENT-BOUNDARY.md, "The decision this came out of"

## 2026-10-20, No external links in game menus; website files parked
Menus show no outside links. Ko-fi is off by blanking `kofi` in js/data/funding.js, SpriteCollab and PokeAPI credits stay plain text, and the mailto contact line stays. SEO pages and generators live in `_delete_/` and the bundle is built with `--sin-seo`.
Canonical: GDD.md, "1. Concept"

## 2026-10-20, Gacha tickets are Pokeballs and Master Balls
The x1 ticket is a Great Ball icon labelled Pokeball and the x10 ticket is a Master Ball icon labelled Master Ball, in menus and world pickups. Code and save names are unchanged. Ball icons are drawn at 16 or 32 px only.
Canonical: GDD.md, "7.5 Gacha tickets: Pokeballs and Master Balls"

## 2026-10-20, Workflow update: prose plan, then build (standing) [Jess, standing since 2026-10-18]
Claude gives a prose plan in chat, Jess edits or says OK, then Claude builds, runs the harness and tests, and writes straight into the repo. This supersedes the "propose a diff" step of the 2026-10-17 Edit boundary entry. The dividing line, the changelog.js and Markdown free-edit rules and the no-git rule are unchanged.
Canonical: CLAUDE.md, "Edit boundary and workflow"

## 2026-10-17, Massive density is a FEATURE, not a thing to budget down (design north star)
Absurd on-screen density is the game's identity, so entity count is a fixed requirement to design around, not a knob to shrink. Performance is solved without reducing monster count. The one exception is a genuine feel failure, and readability fixes come before spawning fewer enemies. The multiplayer sizing detail is archive-only until the cloud phase.
Canonical: GDD.md, "1. Concept"

## 2026-10-17, HP scalars and damage scalars are ORTHOGONAL dials (move-power migration note)
HP_SCALAR (shared by player and enemy HP) and DMG_SCALAR (player to enemy damage) are independent dials, and move Power is a damage term that never touches HP. After the canonical-power migration only DMG_SCALAR is re-centred, once. Enemy-damage tuning waits for that migration.
Canonical: docs/COMBAT-RULES.md, "Orthogonal dials"

## 2026-10-17, Local-first scope
Build and perfect the local single-player game before any cloud work. Firebase, the Cloudflare TURN worker, the whole js/net stack, friends, rooms and online leaderboards are deferred until Jess switches phase.
Canonical: CLAUDE.md, "Local-first (hard scope boundary)"

## 2026-10-17, English-native development
New user-facing strings are authored in English. Inherited Spanish literals stay as runtime i18n keys, with no new lang-en.js entries or Spanish translations for new strings.
Canonical: CLAUDE.md, "English-native i18n"

## 2026-10-17, Edit boundary (propose-first vs free-edit)
The dividing line is whether a change alters what the game does when run. Game code, js/data/*.js, dev.html, build config and assets are propose-first. Markdown project docs are edited directly. js/data/*.js is game data, so it is propose-first.
Canonical: CLAUDE.md, "Edit boundary and workflow"

## 2026-10-17, Git execution
The assistant never runs git that changes anything. It gives commands and strategy, and Jess runs all git himself.
Canonical: CLAUDE.md, "Git, hard prohibition on changing the repo"

## 2026-10-17, Docs portability
All project docs live in the repo, not in a tool's private memory, so a pull carries them between Claude Desktop and Quick. The repo is the single shared source of truth.
Canonical: CLAUDE.md, "Two tools, one repo"

## 2026-10-17, Remote visibility via local checkout (not a GitHub connector)
No GitHub connector exists and GitHub's dynamic pages cannot be fetched reliably. Remote state reaches the assistant through the local checkout: Jess pulls or checks out the branch and the assistant reads the tree and git metadata.
Canonical: CLAUDE.md, "Two tools, one repo"

## 2026-10-17, Source-only repo: gitignore the build output (Option A)
Generated build output (index.html, js/app.min.js, version.json) is gitignored and regenerated at publish time. GitHub Pages is not used. Revisit with a CI build step if a host later needs committed output.
Canonical: ONBOARDING.md, "3. Build and publish pipeline"

## 2026-10-17, SEO/publishing pipeline is inherited and dormant
tools/export_data.js and tools/make_seo_pages.py belong to the original owner's publishing pipeline, are hardcoded to the original site and repo, and stay untouched until Jess picks a host and decides on public discoverability.
Canonical: ONBOARDING.md, "3. Build and publish pipeline"

## 2026-10-17, Base-stats model: Speed is identity (fixed), the other five scale with run level
HP, Atk, Def, SpA and SpD scale with the in-run level through the mainline formula. Speed is fixed species identity within a run, changes only through items or upgrades, and is the one stat shaped by the transfer function. IV and EV stay at 0.
Canonical: docs/COMBAT-RULES.md, "Stats and HP"

## 2026-10-17, Performance stance
Vision first, trim fat later. Ignore small per-frame millisecond differences, but fix a visible framerate collapse immediately as a feel problem.
Canonical: CLAUDE.md, "Performance stance"

## 2026-10-17, Damage model: mainline formula plus a single survivor scalar
Player to enemy damage uses the mainline formula with STAB 1.5, type and crit multipliers and one locked survivor scalar. Physical moves use Atk against Def, special moves use SpA against SpD, and player Atk and SpA scale with the in-run level.
Canonical: docs/COMBAT-RULES.md, "Damage"

## 2026-10-17, The naked base-stat layer is intentionally upgrade-dependent (do not "fix" the ramp)
With base stats alone, hits-to-kill ramps over a run by design, because the power fantasy comes from the upgrade stack. Do not rebalance base stats to flatten it. Tune the upgrade systems instead.
Canonical: docs/COMBAT-RULES.md, "Stats and HP"

## 2026-10-17, changelog.js is a free-edit exception
js/data/changelog.js is the one js/data file the assistant edits without approval. It must still parse as JS after every edit, since a syntax error breaks the bundle.
Canonical: CLAUDE.md, "Edit boundary and workflow"

## 2026-10-17, Enemy HP model: mainline formula, two-phase difficulty
Enemy HP uses the same mainline formula and scalar as the player, from the enemy's real base HP. Enemy level grows linearly from L1 at 0:00 to L50 at 30:00. The post-30-minute Phase 2 was superseded on 2026-10-28 (Q8, QA-08) and is in the archive.
Canonical: docs/COMBAT-RULES.md, "Stats and HP"

## 2026-10-17, IV/EV deferred pending a persistent-storage design
IV and EV are fixed at 0 and not stored. They need a per-species persistent-storage design of their own, and that slice adds the storage and migration.
Canonical: docs/COMBAT-RULES.md, "Stats and HP"

## 2026-10-17, Stat formulas centralized in G.Stats (js/core/stats.js)
All base-stat formulas live in G.Stats and neither the player nor enemies keep their own copy. New combat-stat formulas and retuning of constants happen there.
Canonical: docs/COMBAT-RULES.md, "G.Stats"

## 2026-10-18, Swap rule decided (Jess)
Every slotted move runs its own independent cooldown, and only the active group fires. A short hold after swapping stops instant back-and-forth swaps, and the swap-in fires at once. Bond is reworked in its own branch.
Canonical: docs/COMBAT-RULES.md, "Swap rule"

## 2026-10-19, Badge boosts and the gym reward (feature/boss-rework) [Jess decided]
Each gym badge gives a run-long team stat boost, with the Boulder Badge at +10% Attack. The gym leader drops no XP and the win grants a guaranteed level. Gym leaders move at their species speed with no modifiers.
Canonical: BOSS-REWORK.md, "3g. Badges and the gym reward"

## 2026-10-21, no native browser dialogs
All confirm sites use G.UI.ask. New code uses G.UI.ask and never confirm, alert or prompt. Spanish messages stay G.T() keys and titles and buttons are English.
Canonical: CLAUDE.md, "Coding conventions"

## 2026-10-25, Move schema slice 1 (feature-test/new-move-schema) [Jess decided]
move-conversions-described.json is the single source of move facts and moves-generated.js is generated from it. `kind` is no longer a schema field. Pierce omitted means unlimited and 0 means dies on first hit. The resolver runs eagerly at load, and schema additions cover grow, stat chance, duration, maxStacks and casterState.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "Top-level move fields"

## 2026-10-25, Move schema slice 2 prep: no legacy bridge, resolver owns normalization
The move schema is built from the ground up with no legacy bridge. File roles were fixed (described.json, move-attributes.js, moves-generated.js, move-overrides.js, move-handler.js, move-resolver.js). Slice 3 as a flag swap was dropped for a re-plan.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "File roles"

## 2026-10-26, Move schema slice 2 plan: normalization is pellet-only
Damage normalization counted only the base projectile count. Superseded by the next entry.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "Formula values"

## 2026-10-26, Move schema slice 2 plan, later same day: normalization removed
Slice 2 has no damage normalization. The resolver derives only cooldown from PP, and power, accuracy and flavor text pass through. Whether normalization is needed is a balance question for a damage simulator.
Canonical: docs/MOVE-AXIS-SCHEMA.md, "Formula values"

## 2026-10-27, Slice 4c planning (Jess)
Slice 4c is split into 4c-1 persistence, 4c-2 returns and repositions, and 4c-3 the rest, each signed off before the next. Psychic stays a growing wedge, Aura Sphere reach is fine, Bonemerang pulls toward the caster, and Rock Slide stays one boulder.
Canonical: docs/MOVE-INTENT.md, "Per-move rulings"

## 2026-10-27, Slice 4c-2 planning (Jess)
The reposition landing point is the target enemy's centre and i-frames cover the whole dash plus 0.3 s. Razor Leaf joins 4c-2 and the pierce budget resets per leg. Quick Attack hits one enemy at the arrival point.
Canonical: docs/MOVE-INTENT.md, "Per-move rulings"; per-leg pierce reset: combat-architecture section H, H22

## 2026-10-27, Slice 4c-3 planning (Jess)
aimTrack is implemented now and changes Flamethrower, with a sticky target rule. Rock Slide's telegraph is a low-opacity ring and its location pick uses the seeded rng. The routed list ends 4c at 33 moves.
Canonical: docs/MOVE-INTENT.md, "Per-move rulings"; seeded-rng location pick: combat-architecture section H, H23

## Older archived entries (heading only)
These were moved verbatim to docs/DECISIONS-archive.md on 2026-10-20. They are history.

Archived entries (heading only):
- 2026-10-18, Opening pacing: XP boost and elite gate
- 2026-10-18, Slice 1c design answered: shots, support crowd-seeking, contact gap, flanker
- 2026-10-18, Logger additions and slice 1b approved and applied
- 2026-10-18, Slice 1 playtest results and two rulings
- 2026-10-18, Slice 1 approved and applied; charger gets a warning line
- 2026-10-18, ranged and support spacing bands
- 2026-10-18, Status support class, secondary Status, and Jess's hand tuning
- 2026-10-17, Cast composition rule (9 per tier) and the profile fallback
- 2026-10-17, Enemy taxonomy: top-down families, then class, then body modifiers
- 2026-10-17, Enemy behavior becomes stat-derived (replaces the dex-hash classes)
- 2026-10-17, Balance pass: order and intent (Jess's rulings)
- 2026-10-17, Dev logger: dev-facing, full-granularity, numeric ring buffer (built 2026-10-17)
- 2026-10-17, Likely MP shape: ONE deliberate high-density room (not multi-room matchmaking)
- 2026-10-17, Region-select scope + sparse-band fallback (DESIGNED, not built)
- 2026-10-17, Enemy attacks are behavior-driven, NOT move-catalog (finding, affects sub-slice C)
- 2026-10-18, XP curve (feature/xp-curve), Jess's rulings
- 2026-10-18, fix/attack-calc: design talk (NO code yet), Jess's rulings and the agreed scope
- 2026-10-18, fix/attack-calc slice 1 APPLIED
- 2026-10-18, fix/attack-calc decisions (BETA, aura/trail, slicing)
- 2026-10-18, fix/attack-calc slice 2 APPLIED
- 2026-10-18, fix/attack-calc slices 3a+3b APPLIED
- 2026-10-18, fix/attack-calc slice 3c APPLIED (swap rule)
- 2026-10-18, Upgrade rework slice 1 APPLIED (deletion)
- 2026-10-18, Upgrade rework slice 2a APPLIED (data layer)
- 2026-10-18, Upgrade rework slice 2b APPLIED (mechanic cards live)
- 2026-10-18, Upgrade rework slice 2c APPLIED (stat cards + scoped cards)
- 2026-10-18, Slice 2d-1 APPLIED (team summary sheet: pause screen + end-of-run team view)
- 2026-10-18, Slice 2d-2 APPLIED (level-up choose mode through the team summary)
