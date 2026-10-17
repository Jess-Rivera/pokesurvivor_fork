# DECISIONS

Standing design and workflow rulings. Once something is here, treat it as settled, do not relitigate it.
Add a dated entry whenever a durable decision is made.

---

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
