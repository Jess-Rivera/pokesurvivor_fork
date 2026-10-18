# DECISIONS

Standing design and workflow rulings. Once something is here, treat it as settled, do not relitigate it.
Add a dated entry whenever a durable decision is made.

---

## 2026-10-17, Dev logger: dev-facing, full-granularity, numeric ring buffer (design locked, not yet built)
Jess's ruling: the battle logger is a DEVELOPER tool only. A player-facing view (for example a last-3-seconds
breakdown on the death screen) was discussed and is explicitly DEFERRED, do not build it now.
- Granularity: full, one record per hit, color-coded by attack type. Damage lines are a waterfall: a neutral
  baseline (defender stat = 50, the same neutral value props use), then one signed delta per stage (Def/SpD,
  STAB, type, weather, reduction, melee cushion, crit, floor), summing exactly to FINAL.
- Also logged: hits blocked by i-frames, heals, faints and Focus Band saves, kills with XP dropped, XP collected
  (orb value x coop x XP bonus), level-up offers and the card picked (rerolls log as new offers).
- Performance rule (density is the identity, see the density ruling): records are numbers in preallocated typed
  arrays (newest 8192), no strings or allocation at record time, text built only on request. Inert without ?dev.
- Access is the console API (G.Log.text/print/pacing/download/clear), no HUD or CSS in this slice.
- Enemies do not use the move catalog yet, so incoming lines name the attack kind (contact/shot/zone/beam) and
  type, not a move. When canonical learnsets land, the record gains the move id.
- Proposal with exact diffs: docs/proposals/dev-logger-slice1.md (propose-and-approve applies).

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

## 2026-10-17, Likely MP shape: ONE deliberate high-density room (not multi-room matchmaking) [deferred]
Jess's leaning for the MP phase (not built; captured so it isn't lost): rather than a general
5-rooms/matchmaking service, the pitch is a SINGLE room — "I spin it up, who's joining me?" — and the
payoff is getting buried in hundreds-to-thousands of mobs. This is a BETTER-scoped goal than multi-room
MP on every axis we worked through:
  - Cost: one room = one sim, so 100% of a dedicated-Ryzen core (~€3/mo, AlphaVPS-class) serves that
    ONE horde. Maximal density gets maximal hardware — can push entity counts far harder than if the
    core were split across 5 rooms. Reframes sizing from "fit 5 rooms on a core" to "how many thousands
    of mobs can one WHOLE core push at a playable tick."
  - Simplicity: no matchmaking/lobby/ranking layer (skips a big chunk of the deferred js/net/ stack).
    "Who's joining me" = share a link/code to a few invited friends. Minimal to build.
  - Reliability: one known host + one relay + a few invited friends = the most tractable form of the
    connection problem.
  - Fits the identity: it's not "a multiplayer service," it's "come get swarmed with me." The
    constraint IS the pitch.
  Still gated by the same benchmark (T = sim ms/tick at the target entity count on the real core); go
  bigger via 30Hz tick + culling + spatial-grid/object-pool optimization, never fewer mobs. One full
  core on one room = the most headroom possible to chase "thousands." Revisit vs multi-room at MP phase.
  6-PLAYER cap idea (Jess, 2026-10-17): with only one room to host, make it a 6-player room to MIRROR
  the 6-slot team roster (nice thematic symmetry). Feasible in the single-room/whole-core model, with
  the honest caveat that players scale load: ~6 players pulling their own swarms ≈ 1.5x the entities of
  4, so T and bandwidth rise accordingly (not "4 plus two free cursors"). Fine here because the whole
  core serves ONE room and the levers (30Hz tick, culling, optimization) absorb it like any density.
  Bonus: a hard 6-player cap IS the game's whole concurrency limit — supersedes the earlier "20 players
  / 5 rooms" framing with an even cleaner, cheaper model: up to 6 players, one room, one core. ACTION
  at MP phase: benchmark T at 6-PLAYER density (not 4), since that's the real worst case.
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

## 2026-10-17, Region-select scope + sparse-band fallback (DESIGNED, not built)
Planned local feature: on Play, the player picks a region (or All); only that region's Pokemon spawn
as wild enemies and bosses for the run. The eligible pool for a chosen region = that region's gen AND
all previous gens (Kanto = gen 1 only; Hoenn = gens 1-3; Paldea = full dex; All = no filter, today's
behavior). This "gen-and-earlier" rule IS the sparse-band fallback: thin BST tiers in a later region
are backfilled by earlier gens automatically, so no separate fallback branch is needed. The one edge
is gen 1 (Kanto), which has no earlier gens: its top wild tier T5 (BST 530-620) holds exactly 7
species (= the cast size, zero variety buffer) and its high boss bands are thin. Jess's ruling:
ACCEPT the gen-1 edge as-is (no special-case code; 7 is enough to fill the cast, late-game variety is
just tight and bosses may repeat). Data backing (wild-eligible, rarity<5): T5 counts per gen were
Kanto 7, Johto 5, Hoenn 6, Sinnoh 10, Unova 4, Kalos 6, Alola 14, Galar 6, Paldea 17 — every gen but
Kanto is rescued by the gen-and-earlier pool. Per-run only, NOT persisted (save-safe). Co-op region
choice is deferred (local-first). Independent of the damage slices. Open sub-questions left for build
time: unlocked-only vs free region pick; whether rifts/legendaries are region-gated; confirm pickN
handles want>available (gen-1 T5 fits exactly).

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
- Yes (game code, js/data/*.js, dev.html, build config, assets): PROPOSE-first, Jess applies by hand.
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
- PHASE 2 (post-30-min), SPEC ONLY until the 30-min boss exists: beating the 30-min boss presents a
  choice:
    * [Standard Run]: a FIXED accelerating ramp (the level-growth slope steepens on a schedule, e.g.
      every 15 min). Predictable, never reactive. Pure skill race.
    * [Unlock Safeties]: "safeties off" (like a safety catch released, NOT a safety net) - enemies
      scale UP to the player's performance (DDA), with boosted rewards (exp, gold, tickets, items) as
      the risk payoff. Opt-in + rewarded, so it does NOT violate the power-fantasy (the player CHOSE
      the danger for loot; genre-legit like VS Curse / Brotato Danger).
      DDA signal: a BLEND (to be finalized when built) of player level-vs-expected, kill rate, and
      HP comfort margin. Composite with tunable weights.
  Phase 2 depends on the 30-min boss (planned, not built) and a reward-multiplier system (not built),
  so it is captured here as design and built when the boss lands.

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

## 2026-10-17, Enemy Speed = fixed species identity (matches the player)
Enemy speed now uses the same Speed-identity model as the player (G.Stats.speedToPx from the enemy's
real base Speed stat[5]), fixed per species, same px/s scale as the player, with NO in-run time ramp
(the old sc.spd = 1 + t/1400 enemy speed-up is removed). Supersedes the pre-identity enemy speed
(tier.spd x spdK reverse-derivation). Difficulty comes from HP/damage/density, not creeping enemy
speed. Exceptions kept: bosses retain their own spd path (out of scope); the 'runner' behavior keeps
its x1.6 (it is a behavior archetype, not a base-stat multiplier).

## 2026-10-17, Enemy attacks are behavior-driven, NOT move-catalog (finding, affects sub-slice C)
Enemies do NOT use the js/data/moves.js catalog. An enemy attacks from its behavior (fan/beamer/
zoner/healer/summoner/default shoot, plus a richer boss set) using raw numbers on its def: this.dmg
(contact), shotDmg() (ranged = def.shotDmg * dmg/def.dmg), and this.atkType = the enemy's PRIMARY
Pokemon type (types[0]), which already feeds the type chart on enemy->player hits. There is NO
physical/special category and NO base attack stat anywhere on the enemy attack path today.
Consequence for the damage redesign:
- Sub-slice B (player->enemy) is clean: player moves have cat + type + base power; we just need the
  enemy's real Def/SpD (stats[2]/stats[4]) as the A/D denominator.
- Sub-slice C (enemy->player) has a design gap to resolve THEN: enemy attacks need a category (to pick
  the enemy's Atk vs SpA and the player's Def vs SpD) OR stay flat-damage with only the player's
  defense applying. Likely derive an enemy attack category from behavior/type (like G.Stats.moveCat
  does for custom moves). Decide when scoping C.
