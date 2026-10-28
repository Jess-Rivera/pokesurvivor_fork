# DECISIONS

Standing design and workflow rulings. Once something is here, treat it as settled, do not relitigate it.

ARCHIVE: older and superseded entries (mostly 2026-10-17 and 2026-10-18 build records) were moved VERBATIM to docs/DECISIONS-archive.md on 2026-10-20.
Search it by keyword (grep) before assuming a topic was never decided. If an archived entry conflicts with an entry here, this file wins.
Convention: new entries stay at most about 10 lines (the rule and the why); long detail belongs in the harness or proposal doc.

## 2026-10-24, 64-move pass tooling + seed rules + reposition/dash schema [Jess decided, feature/all-moves-import]
- SCOPE RESET: the old move-decisions.json + dashboard are GONE and their verdicts were against a superseded model. Issue #3 is now a FULL from-scratch re-classification of all 64 in-game moves (js/data/moves.js) against MOVE-AXIS-SCHEMA.md; old #4 (Flamethrower/Night Shade/Psycho Cut feel-calls) folded into #3 and closed. #2 blocked_by #3 only.
- TOOL: docs/move_rework_holding/ has build_move_conversions.py (reads moves.js + api_move_dataset.json -> move-conversions.json: per move {current, raw, proposed seed, confidence, seedNotes}) and move-compare.html (old-left/new-right, structured-field editing of the proposed side, radian WEDGE drawings for radArc/spread + deg/s readout for rate fields, full-record diff export). Clean kind-seed only (no prior-decision overlay), low-confidence badge. All free-edit tooling.
- PER-MOVE JSON SHAPE (locked): top-level = verbatim raw-source lifts only (type,category,power,pp,accuracy,priority,flavor_text), NO hand-polishing. Ailment lives in payload ONLY. Omit anything the resolver derives/defaults: no cd (from pp), no splash when off, no hitPolicy when oncePerInstance (the default), no pierce on static areas.
- PIERCE scope: directional instances only. static areas (melee/aura/nova/orbit/mine/meteor/trail) carry NO pierce (hit-all via geometry + hitPolicy). beams = UNLIMITED (named constant, never 999/0). dashes default pierce 0 (single-target lunge; bump by hand for a line-clear dash). projectile/boomerang/chain/cone = real counts.
- hitPolicy: oncePerInstance (default, OMITTED from data) / interval (+rehit, used by persistent areas aura/orbit/trail) / onReentry. Three values, no fourth.
- REPOSITION (schema extended): TWO orthogonal axes, not four mode names. repositionMode = teleport | swept (HOW you travel). returnToOrigin = boolean (WHETHER you come back to the launch point; "return to current position" was rejected as incoherent on a caster dash, that would be motion:returns/boomerang). swept is SPEED-DRIVEN via new field dashMult (traversal speed = dashMult x caster final move speed; duration derived); teleport ignores dashMult. A returnToOrigin:true dash terminates on new endOn condition {returned: true}, NOT a fixed time (any endOn time is a backstop). returnHits (out|outAndBack) only when returnToOrigin:true. Quick Attack = canonical return dash: repositionMode swept, returnToOrigin true, dashMult 10, returnHits outAndBack, endOn [{returned}]. Behavior itself is engine code (propose-and-approve at implementation).

## 2026-10-22, Gym gate is a pressure mechanic (escalation), not come-when-ready [Jess decided, rework/gym-progression]
- A gym gate opens, then a GRACE period (37 s, = the current ~per-level wild time, a deliberate "one free level" window) runs with no penalty. After grace, escalation: every ESC_STEP (10 s) BOTH the wild spawn level AND the gym leader's locked level climb by +1. UNCAPPED on purpose (Jess: "if you delay you get fucked"; gates spawn close, so staying out is a choice). A toast fires each tick ("<leader> gets stronger, and so does the world!").
- Mechanism: ONE shared integer bump, G.Gym.escBump() (0 during grace / no gate). Read at exactly two sites; G.Stats.levelForTime stays PURE (no bump) so the HUD run level and the gate's own base-level calc do not compound. (1) Wild spawn (enemy.js): PLAIN wild only (not boss/gym/elite) adds bump to HP + atkLvl; level is frozen at spawn, so the map ramps as new mobs spawn in hot (slight lag = intended ramp, not a wall). (2) Gym leader (gym.js makeDef): effective level = locked base + escBump() read ONCE at entry (leader is only built when you walk in) -> the longer you wait, the stronger the leader you face.
- Snap-back: on the win (onReturn) the bump clears; new wild spawns read 0 and the map returns to the true run-time level. A "The world calms..." toast fires if the fight was escalated. Wilds already on the map were stashed for the arena, so there is no lingering-hot-enemy carryover.
- Reading A (confirmed): the wild bump is a temporary +N offset removed on win, NOT a restore-to-a-frozen-level. "Proper level for the run time" = levelForTime(now) with no bump.
- Gauge (readability, genre pattern): the gate shows the escalated level, a grace countdown, then "+N ESCALATING"; the opening notice warns about the 37 s window.
- Deferred (cloud/MP): the escalation clock + bump need host authority and sync. SP-only now.

## 2026-10-22, Language split + sim/present boundary as the SP architecture direction [Jess decided]
- CLIENT stays JS in the browser, forever (the ship target is the browser). A Go rewrite is ruled out for the client: Go-native is not a web game, and Go-via-WASM only taxes the Canvas/DOM hot path through syscall/js and kills file:// no-build. A client-language rewrite does NOT make MP easier (MP's cost is netcode + the authoritative server, which is net-new regardless).
- SERVER language (Node vs Go) is DEFERRED to the MP phase and wants benchmarks. The authoritative sim server is a separate program written fresh then, so the choice does not bleed back into SP. Node = reuse the JS sim modules (same RNG, easier prediction/reconciliation); Go = higher CPU ceiling + cheap goroutines for many rooms/machine, at the cost of two sim implementations. That server is the one slot where Go pays off here.
- MP (Jess's stated preference): server-authoritative sim + WebRTC with TURN (the server is itself a WebRTC peer, pion/webrtc if Go; TURN relays on NAT failure). Thousands-of-entities for a 4-player room is achievable JS end to end; binding constraints in order are client render throughput, snapshot bandwidth, server sim CPU.
- STANDING SP DISCIPLINE: converge the sim toward a sim/present-event boundary (the sim mutates state and EMITS events; a presentation layer renders FX/Audio/Animator/HUD from them). Keep collision radius out of sprite metadata (precompute per-species into data), keep the clock injected (sim steps on a passed dt, not rAF/performance.now). Pays off three ways: real headless harness coverage NOW, Web-Worker sim for SP perf, and the authoritative server later. This is DIRECTION (pay down as you touch files), NOT a refactor slice to open mid-feature. Worked example: Enemy.hurt(). Full detail: docs/SIM-PRESENT-BOUNDARY.md.

## 2026-10-20, No external links in game menus; website files parked
- Menus show no links to outside sites. Ko-fi is disabled by blanking `kofi` in js/data/funding.js (guards hide the Support button and run-end ask); restore it to re-enable.
- SpriteCollab and PokeAPI credits stay as plain text (attribution kept, no hyperlink). The mailto contact line stays.
- SEO/website pages and their generators live in `_delete_/` (gitignored). Build the bundle with `--sin-seo`.

## 2026-10-20, Gacha tickets are Pokeballs and Master Balls
- x1 ticket = Great Ball icon, labelled "Pokeball"; x10 ticket = Master Ball icon, labelled "Master Ball". Applies to menus and world pickups. Code/save names (`ticket`, `ticket10`, `t1`, `t10`) are unchanged.
- Ball icons are drawn at 16 or 32 px only, to stay crisp.

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
- 2026-10-18 — fix/attack-calc slice 1 APPLIED
- 2026-10-18 — fix/attack-calc decisions (BETA, aura/trail, slicing)
- 2026-10-18 — fix/attack-calc slice 2 APPLIED
- 2026-10-18 — fix/attack-calc slices 3a+3b APPLIED
- 2026-10-18 — fix/attack-calc slice 3c APPLIED (swap rule)
- 2026-10-18, Upgrade rework slice 1 APPLIED (deletion)
- 2026-10-18, Upgrade rework slice 2a APPLIED (data layer)
- 2026-10-18, Upgrade rework slice 2b APPLIED (mechanic cards live)
- 2026-10-18, Upgrade rework slice 2c APPLIED (stat cards + scoped cards)
- 2026-10-18, Slice 2d-1 APPLIED (team summary sheet: pause screen + end-of-run team view)
- 2026-10-18, Slice 2d-2 APPLIED (level-up choose mode through the team summary)

## 2026-10-20, Workflow update: prose plan, then build (standing; supersedes the 'propose a diff' step of the 2026-10-17 Edit boundary entry) [Jess, standing since 2026-10-18]
- Claude gives a prose plan in chat (what changes, which files, numbers, decisions needed). Jess replies with edits or OK. Claude then builds, runs the harness and headless-browser tests, writes straight into the repo in one step, updates DECISIONS/DEVLOG/TODO/STATE and gives commit commands. No diff files, no separate apply step, no code snippets in chat (describe the change in prose and bullets).
- Risky changes are flagged in the plan prose with why; proceed assuming yes unless Jess denies or edits. Jess feel-tests after each change (about a minute), so applied changes are not described as untested.
- UNCHANGED: the dividing line (does it change what the game does when you run it?), the free-edit exception for js/data/changelog.js, free-edit for the Markdown docs, and the hard rule that the assistant never runs git. Commit messages carry no Co-Authored-By or Claude-Session trailer lines.

## 2026-10-17, Massive density is a FEATURE, not a thing to budget down (design north star)
Jess's explicit goal: the game should deliver "holy f*** I've got 200 mon after me / ME TOO / SHIT
ONLY 200?!" chaos. Absurd on-screen density IS the identity, not a problem to tame. So wherever earlier
notes say "co-op entity budget" / "cap the horde to keep it cheap/sane", reinterpret: entity count is a
FIXED REQUIREMENT to design AROUND, not a knob to shrink. Do NOT nerf the horde to fit a cheap server
or to hit a frame target by subtraction. Instead preserve the carnage and pay for it / engineer for it:
  - Keep density maximal; solve performance with the levers that DON'T reduce monster count:
    (1) server tick 30Hz + client interpolation (halves server CPU, horde unchanged, looks 60fps);
    (2) interest management / culling (server simulates the full horde but only SYNCS each client what's
        near them — keeps bandwidth sane without thinning the swarm);
    (3) spatial-grid / object-pool / draw-batching optimization on the hot path;
    (4) stronger hardware (dedicated-Ryzen VPS) and/or fewer rooms per core — buy capacity, don't cut mobs.
  - Consequence for MP sizing: a maximal-density room has a HIGHER T (sim ms/tick), so expect maybe 1-2
    rooms per dedicated-Ryzen core at 60Hz rather than 5 — and that is a GOOD trade (1-2 rooms of true
    carnage at ~€3-6/mo). Scale by adding cores, not by shrinking hordes.
  - The ONE exception where reducing entities is still legit: a genuine FEEL failure (unreadable screen,
    framerate COLLAPSE e.g. 60->22fps) per the existing performance-stance ruling. Even then, prefer
    readability fixes (culling, visual clarity) over simply spawning fewer enemies.
This supersedes any earlier phrasing that implied trimming entity counts for tidiness/cost as the
default. Default = keep the horde huge; optimize and pay around it.

## 2026-10-17, HP scalars and damage scalars are ORTHOGONAL dials (move-power migration note)
Mental model to avoid re-tuning the wrong thing. There are three independent scalars:
  (1) HP_SCALAR = 2.0  -> multiplies the HP formula. SHARED by player AND enemy HP (G.Stats.hpForLevel).
      Its job is HP consistency (a base-65 player and base-65 enemy have identical HP). Nothing to do
      with damage.
  (2) DMG_SCALAR = 2.0 -> multiplies player->enemy DAMAGE (the A/D ratio, sub-slice B). A damage dial.
  (3) (future) an enemy->player damage scalar when sub-slice C lands (may reuse DMG_SCALAR or get its own).
RULE: move "Power" (m.dmg) is a DAMAGE-side term. Changing it (e.g. the planned migration to canonical
mainline move powers) touches ONLY the damage dial, never HP. So:
  - Migrating move power does NOT require re-solving enemy HP (or player HP, or HP_SCALAR). HP is a
    separate formula; power never enters it. Jess's instinct confirmed, but the reason is "power is a
    damage term, HP is its own formula" -- NOT "player and enemy share the HP scalar" (that shared
    scalar is about HP consistency, unrelated to power).
  - What DOES need re-solving after a power migration: the PLAYER DMG_SCALAR, re-centered once so the
    naked baseline still lands in the target hits-to-kill band (~3-4 early, playtest-confirmed) against
    the UNCHANGED enemy HP curve. Think: Power = relative balance BETWEEN moves; DMG_SCALAR = overall
    damage LEVEL. Orthogonal.
  - When sub-slice C lands, its enemy-damage scalar is solved against PLAYER HP (also unchanged). Same
    mirror logic: HP untouched, tune the damage dial.
Canonical-power migration consequence for C: if enemies also draw canonical move power (the planned
full-learnset system), the enemy-"Power" question (flat vs per-behavior vs signature) largely dissolves
-- both sides use real move powers. So do NOT hand-tune throwaway per-behavior enemy Power constants for
C; either build C AFTER the canonical-power migration, or use an explicitly-temporary flat placeholder.
Also at migration time: review the global `m.dmg = Math.round(m.dmg * 1.2)` baseline bump and the fork's
current ~13-18 power scale vs canonical ~40-150 (median 80) -- it is a scale change, re-solve DMG_SCALAR
once, do not mix the two scales.

## 2026-10-17, Local-first scope
Build and perfect the LOCAL single-player game before any cloud/online work. Deferred until Jess
explicitly switches phase: Firebase (auth, Firestore, RTDB, cloud saves), Cloudflare TURN worker,
and the entire multiplayer/co-op/networking stack (js/net/: social, net, coop, ranking, signups),
plus friends, rooms, online leaderboards. Multiplayer is tied to the cloud work and deferred with it.

## 2026-10-17, English-native development
Jess develops in English, not Spanish. Author all new user-facing strings directly in English.
Inherited Spanish string literals stay as-is (they are the runtime i18n keys via lang-en.js). Do
NOT add lang-en.js entries or Spanish translations for our own new strings. New features render
English-only, and that is intended. Jess is not maintaining the Spanish side.

## 2026-10-17, Edit boundary (propose-first vs free-edit)
Dividing line: "does this change what the game does when you run it?"
- Yes (game code, js/data/*.js, dev.html, build config, assets): PROPOSE-first; on Jess's approval the assistant applies the edit itself (CLAUDE.md governs; Jess does not hand-edit code).
- No (Markdown project docs: CONTEXT/DEVLOG/DECISIONS/BALANCE/TODO/ISSUES): assistant edits directly.
Note: js/data/*.js looks like docs but IS game data (the game loads it), so it is propose-first.

## 2026-10-17, Git execution
The AI assistant never runs git, ever. It provides commands and strategy only; Jess runs all git himself.

## 2026-10-17, Docs portability
All project docs live in-repo (not in a tool's private memory) so git pull carries them to Claude
Desktop at home. The repo is the single shared source of truth between the two tools.

## 2026-10-17, Remote visibility via local checkout (not a GitHub connector)
There is no GitHub connector available, and GitHub's dynamic pages (commits, branches, issues, PRs)
are JS-rendered and cannot be fetched reliably even though the repo (Jess-Rivera/pokesurvivor_fork)
is public (only the static landing page / README fetches). So the bridge between work and home stays
the LOCAL CHECKOUT: when the agent needs to see remote state, Jess pulls or checks out the branch
locally and the agent reads the working tree and git metadata directly. This does not change the Git
rule (Jess still runs all git himself) or the local-first scope.

## 2026-10-17, Source-only repo: gitignore the build output (Option A)
Decision: do NOT version-control generated build output. Jess runs the game locally via dev.html and
only builds (`node tools/build.js`) when he is ready to publish to a host (chosen later). GitHub Pages
is explicitly NOT used ("i dont want Pages"). So the three generated files are now gitignored:
index.html, js/app.min.js, version.json (tools/cache/ was already ignored). They are regenerated at
publish time, not tracked. To stop tracking the already-committed copies, Jess runs (git is his):
  git rm --cached index.html js/app.min.js version.json
This removes them from tracking but keeps them on disk. Rationale: generated artifacts cause pointless
merge conflicts (minified/obfuscated output cannot be meaningfully merged); keeping source-only is the
cleaner practice and ends that friction. If Jess later hosts somewhere that needs committed build
output (e.g. GitHub Pages serving files directly), revisit, the better path then is a CI build step.

## 2026-10-17, SEO/publishing pipeline is inherited and dormant
tools/export_data.js and tools/make_seo_pages.py are the ORIGINAL owner's SEO/publishing pipeline
(generate text pages from game data so a canvas game is crawlable; hardcoded to pokesurvivor.com and
the original repo JPTER78/pokesurvivor). Jess has never run them and only runs `node tools/build.js`.
They stay dormant and untouched until Jess picks a host and decides on public discoverability, at which
point the hardcoded URLs would need rewriting. Their output (tools/cache/gamedata.json and the es/en
SEO page folders) is not maintained by us.

## 2026-10-17, Base-stats model: Speed is identity (fixed), the other five scale with run level
Core rule for the base-stats implementation (see docs/stat-model-design-notes.md for the full analysis):
- The other five stats (HP, Atk, Def, SpA, SpD) scale with the player's IN-RUN LEVEL via the mainline
  formula (level plays the role of the Pokemon's level), so you get stronger as a run progresses. That
  IS the survivor-like power-fantasy ramp.
- SPEED is the deliberate exception: movement reflects the species' Speed IDENTITY and is constant
  within a run (the identity ratio r = Speed/Speed_median cancels level). It changes ONLY via items or
  upgrades (spdMul, Agility-type buffs, liquid/weather), never from leveling up mid-run. Rationale:
  movement that climbs with level would wreck control feel and readability and blur each mon's Speed
  identity.
- Consequence: Speed is also the one stat SHAPED by the transfer function g(r) (bounds 0.25x-2.0x) from
  day one; the other five start raw (single fallback bounding point at the damage site if raw feels bad).
- First coding slice: Speed stat -> movement px/s. 1.0x movement = ~107 px/s (median species; verified
  median base Speed = 65, see below). IV/EV are in the mainline formula but FIXED AT 0 this slice and
  NOT stored (deferred, see the IV/EV ruling below). No save change in slice 1.

## 2026-10-17, Performance stance
Vision first, trim fat later. Ignore small per-frame millisecond differences at this stage. BUT a
visible framerate collapse (e.g. 60fps to ~22fps at high enemy density) is a FEEL problem and is
addressed immediately, not deferred.

## 2026-10-17, Damage model: mainline formula + a single survivor scalar
Player->enemy damage uses the real mainline damage formula, tuned toward survivor feel by ONE scalar:
    base = ((2*L/5 + 2) * Power * (Atk/Def)) / 50 + 2, then * STAB(1.5) * type * crit * SCALAR
    SCALAR = 2.0 (locked).
- L = attacker level (player's in-run level). Atk/Def are the real base stats scaled to level via the
  mainline statValue formula: physical moves use Atk(stats[1]) vs enemy Def(stats[2]); special moves use
  SpA(stats[3]) vs enemy SpD(stats[4]). Category comes from move.cat (sub-slice A) via G.Stats.moveCat.
- STAB = 1.5x when the move type matches one of the active fighter's species types.
- Player Atk/SpA scale with in-run level (like HP); this is required for the ratio to stay proportional.
- Implementation is split (attacker half at cast, defender half at impact) but is mathematically identical
  to the single formula; the +2 stays after the division and before the STAB/type/crit/scalar multipliers.

## 2026-10-17, The naked base-stat layer is intentionally upgrade-dependent (do not "fix" the ramp)
With base stats only (no upgrades), hits-to-kill a common enemy RAMPS over a run (~3 hits early -> ~12 by
30 min at scalar 2.0). This is BY DESIGN, not a balance bug. Root cause is structural and known: enemy HP
grows ~10.4x over a run while mainline damage grows ~2.6x, so the naked line cannot keep pace on its own.
In a survivor-like it is not supposed to: the power fantasy comes from the upgrade stack (level-up draft,
move upgrades, crit, items), which multiplies damage on top of this baseline and fills the headroom. If a
future session sees the naked ramp and is tempted to rebalance base stats to flatten it, DON'T, that would
leave no room for upgrades to matter. The base layer's only job is a sane early hit-count (~2-4) with a
moderate ramp. Tune the upgrade systems to fill the gap, not the base stats to erase it.

## 2026-10-17, changelog.js is a free-edit exception
js/data/changelog.js is the ONE js/data/*.js file exempt from propose-and-approve: it is purely
informational patch notes and does not affect mechanics, so the agent edits it directly without
approval (like the Markdown project docs). Caveat: it IS parsed as JS, so the agent must verify it
still parses after editing (balanced quotes/brackets/commas), since a syntax error there breaks the
bundle. Every other js/data/*.js stays propose-and-approve.

## 2026-10-17, Enemy HP model: mainline formula, two-phase difficulty
Enemy HP uses the SAME mainline formula + 2.0x scalar as the player (HP = (floor(2*baseHP*L/100)
+ L + 10) * 2.0), from the enemy's REAL base HP (stats[0]). This retires the old enemy HP model
(tier.hp flat templates, the baseHp() reverse-derivation `(p.hp-70)/0.45`, and scale(t).hp). The
tier SYSTEM stays for spawn variety/pacing/behaviors/cast selection; only the HP computation moves
to the formula. Levels may exceed mainline 100 (survivor-like); the formula still holds.

Difficulty is two-phase, gated by the planned 30-minute boss:
- PHASE 1 (0-30 min), BUILD NOW: enemy level grows LINEARLY from L1 (0:00) to L50 (30:00). i.e.
  level(t) = 1 + 49 * clamp(t/1800, 0, 1). HP follows via the formula. (Base-65 enemy: ~24 HP at
  start, ~124 HP at 30 min.)
- PHASE 2 (post-30-min): SUPERSEDED 2026-10-28 (Q8, QA-08). The Standard Run / Unlock Safeties choice and the DDA version are dropped; the text moved verbatim to docs/DECISIONS-archive.md ("DECISIONS 2026-10-17 Enemy HP model, PHASE 2"). Current rule: BOSS-REWORK.md section 4a (Unlock Safeties means "continue to Loop N+1").

## 2026-10-17, IV/EV deferred pending a persistent-storage design
Slice 1 (Speed -> movement) does NOT read or store IV/EV. They are part of the mainline stat formula
(statValue takes iv/ev params) but are fixed at 0 for now. Reason: IV/EV need a proper per-species
persistent-storage design (how they are earned/trained, how they are keyed and saved, likely alongside
pbind/pban/pupg which key by dex), and that deserves its own slice rather than bolting an all-zero map
onto the save now. No save-schema change was made for IV/EV this slice, so slice 1 is fully save-safe.
When training/EV is designed, that slice adds the storage + migration.

## 2026-10-17, Stat formulas centralized in G.Stats (js/core/stats.js)
All base-stats formulas live in ONE module, G.Stats (js/core/stats.js): the mainline statValue, HP
(hpForLevel), Speed identity (speedToPx/moveTransfer), the enemy levelForTime curve, the tunable
constants, and scaffold stubs for Attack/Defense/SpA/SpD. Both the player and enemies call G.Stats.*;
neither keeps its own copy. Rule going forward: new combat-stat formulas (and any retuning of
constants like HP_SCALAR or SPEED_MEDIAN) happen in G.Stats, not duplicated per entity. stats.js must
load after core/util.js (listed right after util in dev.html and as 'Stats' in main.js NEED).

## 2026-10-18 — Swap rule decided (Jess)
- Every slotted move runs its own independent cooldown, active or not. Only the active group fires. The 35% incoming-wait cap in setActive is removed (it was the swap exploit).
- A short hold after swapping stops instant back-and-forth swapping (swap-in fires immediately); length is a constant (proposed 0.4 s hold after swapping before you may swap again; the new move fires at once). Built as fix/attack-calc slice 3c.
- Bond is reworked in its own branch: Slot Compression + Synergy (TODO Backlog). The old "fire several moves at once" role is gone once cooldowns are independent.

## 2026-10-19, Badge boosts and the gym reward (feature/boss-rework) [Jess decided]
- Each gym badge carries a run-long team stat boost; Boulder Badge = +10% Attack for the whole team (all roster members). Stored in Player.badge, separate from stat cards, read through incOf().
- The gym leader drops no XP. The win is a toast plus an automatic level bump (guaranteed level, normal level-up cards still open). Item, coins, Bond and full revive unchanged.
- Gym leaders move at their species speed with no modifiers (Jess, 2026-10-19): no 1.1x chase bonus, no 0.55x circling (boss code kept for non-gym bosses); standing still while casting stays.

## 2026-10-21, no native browser dialogs
All confirm() sites now use G.UI.ask (in-game dialog). New code must use G.UI.ask, never confirm/alert/prompt. Spanish messages stay G.T() keys; titles and buttons are English.


## 2026-10-25, Move schema slice 1 (feature-test/new-move-schema) [Jess decided]
- docs/move_rework_holding/move-conversions-described.json is the single source of move facts (move-conversions-final.json never existed). tools/export_moves.js generates js/data/moves-generated.js from it; never hand-edit the output.
- `kind` is no longer a schema field and is stripped from the export. Behavior is read from the axes. A legacy kind is derived in the resolver's bridge projection only (slice 2) and deleted with the legacy path (slice 7). balanceClass stays.
- The resolver runs eagerly at load (one pure fold, the same code check.js runs), since gyms and menus read Moves.BY_ID as a plain property.
- Pierce: omitted means UNLIMITED, 0 means dies on the first hit, n means dies after passing through n enemies. hitCap is removed. Quick Attack keeps 0 (single target by default, so the pierce upgrade card lets it dash through enemies); Aerial Ace and Psychic omit it (they hit everything in their circle or arc).
- Spread stays in the data at any count; the executor ignores it when count is 1 (legacy behavior), so a count upgrade has a fan to use.
- Spikes: a placed mine lasts until triggered and detonates once on contact. A timeout is optional; a triggered instance only needs some endOn.
- Schema additions: grow.max and grow.per, stat chance/duration/maxStacks, casterState as the container for iframes and delay. metal-claw's team buff is side self, like Swords Dance.
- The groundwork files stay out of dev.html and the main.js NEED array until slice 3; check.js already runs the export freshness check and the validator.


## 2026-10-25 (slice 2 prep): no legacy bridge, resolver owns normalization
- The move schema is built from the ground up. `kind` is not derived, carried or bridged; there is no flat projection in old field names. combat.js will be mostly rewritten against the resolved definitions, guided by move-coverage-report.md.
- File roles: described.json (source), move-attributes.js (definitions and defaults), moves-generated.js (generated), move-overrides.js (per-move overrides only), move-handler.js (specials with trigger and optional condition), move-resolver.js (defaults, derived values, overrides, handlers, eager at load).
- Base cooldown and damage are derived: cd = 0.5 x (35 / PP); dmg = Power / E, where E is damage events per target per cast. Upgrades apply in combat.js on top of the normalized dmg.
- Parity report compares numbers only against legacy moves.js. Slice 3 (flag swap) is dropped for a re-plan.

## 2026-10-26 (slice 2 plan): normalization is pellet-only
- E (the divisor in dmg = Power / E) counts ONLY the base projectile count: E = min(count, 3) when count > 1, else 1. The cap is one named tunable (CONE_E), loosened later step by step.
- Dropped from legacy: boomerang E 2 (each pass hits at full power if the enemy is still in the path), orbit passes per period, trail overlap, aura 1, re-hit intervals, and the hits multiplier (only Bonemerang had it; mainline Power for multi-hit moves is already adjusted). No hits field in the schema.
- Per-hit floor stays 1 / max(1, E). Accuracy stays out of dmg (pass-through fact; combat decides expected-value vs miss roll). flavor_text passes through.
- Parity report will show the boomerang, orbit and trail moves differing from legacy by design.

## 2026-10-26 (slice 2 plan, later same day): normalization removed
- Supersedes the earlier 2026-10-25 line (dmg = Power / E) and the pellet-only E entry above. Slice 2 has NO damage normalization: no E, no cone cap, no dmg split, no per-hit floor, no hits field. The resolver derives only cd = 0.5 x (35 / PP); power, accuracy and flavor_text pass through.
- Why: whether normalization is needed is a balance question. A damage simulator script (move, upgrades, enemy type and level, combat factors, output damage and enemy HP drop) will answer it with data. If it is needed it returns as its own step.

## 2026-10-27 (slice 4c planning, Jess)
- 4c is split into 4c-1 persistence, 4c-2 returns and repositions, 4c-3 the rest. Each is signed off before the next.
- Psychic stays a filled growing wedge (steers at the cast target, then the nearest enemy). No arc band, no grammar change.
- Aura Sphere reach is fine. Bonemerang return-leg knockback pulls toward the caster, clamped at the caster's edge.
- The G.MoveDefs deep-freeze (I2) and all review 2.4 validator rules are the first step of 4c-1.
- Orbit radius scales with the lens. Night Shade ships in 4c-1. Rock Slide stays one boulder. String Shot spacing goes to the feel issue and 4d.

## 2026-10-27 (slice 4c-2 planning, Jess)
- Reposition landing point is the target enemy's centre. I-frames cover the whole dash plus a 0.3 s tail. The swept dash holds walking through the existing mvRoot flag (no player.js edit).
- Razor Leaf joins 4c-2 (routed, R2 fixture). The pierce budget resets per leg. Quick Attack hits one enemy at the arrival point, unlike the legacy dash (Q3).

## 2026-10-27 (slice 4c-3 planning, Jess)
- aimTrack gets implemented and changes Flamethrower now. Its target rule is sticky: the cast target while it lives and is in range, then the nearest enemy, re-picked whenever the tracked one is lost.
- Rock Slide's telegraph is a low-opacity ring. Location pick uses the seeded rng. Routed list ends 4c at 33 moves.
