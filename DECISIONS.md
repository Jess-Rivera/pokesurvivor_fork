# DECISIONS

A dated log of decisions. It is NOT a register of settled rules: each entry gives the date, a short summary and a `Canonical:` line naming the spec section that holds the rule. When this log and the named spec disagree, the spec wins (CLAUDE.md, "Which document wins").

The full original text of every entry is in docs/DECISIONS-archive.md, which is history. Search it by keyword before assuming a topic was never decided.
Convention: new entries stay at most about 10 lines (date, what was decided, `Canonical:`); long detail belongs in the spec.

## 2026-10-29, Move review rule for Stage 0 and later batches (Jess)
A move counts as reviewed when it has a MOVE-INTENT entry and its data and code match it. Moves without an entry are reviewed with the batch that routes them; any move needing specific disambiguation gets a MOVE-INTENT entry. Scenarios that depend on an open decision are marked blocked, not guessed.
Canonical: docs/current feature planning/move-schema-post-auth/stage-0.md, "Review rule"

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

## 2026-10-28, Q14: Every move defaults to maxStacks 1, including Metal Claw and Meteor Mash (authored 2 today; code default 6 is legacy)
Every move defaults to maxStacks 1, including Metal Claw and Meteor Mash (authored 2 today; code default 6 is legacy). (owner answer Q14)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"

## 2026-10-28, Q15: For a self-buff, maxStacks = min(floor(duration / cooldown), 6), new path only
For a self-buff, maxStacks = min(floor(duration / cooldown), 6), new path only. (owner answer Q15)
Canonical: docs/COMBAT-RULES.md, "Stat stages and maxStacks"

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
