# DEVLOG

Reverse-chronological log of each working session. Newest entry on top.
Append an entry at the end of every session: what changed, what was decided, what broke, where we stopped.

---

## 2026-10-17 (base-stats slice 2: player HP)
- Bugfix (found in playtest): benched teammates kept a stale level-1 maxHp because only the active
  fighter (pl) runs gainXp. Shuckle's HP didn't rise on level-up, only the active Regieleki's did.
  Fix: player.js adds syncLevel(level) (recompute maxHp for the new level, PRESERVING current-hp
  fraction, so swapping is neither a free heal nor a penalty); game.js, after pl.gainXp levels up,
  calls f.syncLevel(pl.level) on every other roster member. Co-op level sync not touched (deferred MP).
- Added a ?dev debug toggle (js/core/debug.js): Shift+U calls toggleUpgrades(), which clears every
  per-Pokemon upgrade to 0 if any are set, else re-maxes them. Lets you see true base-stat values
  (e.g. raw HP) without maxed perks on top. Also exposed clearUpgrades()/toggleUpgrades() on G.Debug.
  Shift+D/maxAll unchanged. NOTE: it edits the save like maxAll does (not a runtime overlay), fine for
  the ?dev sandbox. No changelog entry (developer-only tool, not player-facing).
  (Context: the earlier "Shuckle showing 102 HP" was the ?dev maxAll perks piled on the new formula,
  not a bug in the HP code. Chespin baseHP 56: L1=24, L2=28 with no upgrades, confirmed correct.)
- Player max HP now derives from the real mainline HP formula and scales with in-run level (1:1).
  js/entities/player.js: added HP_SCALAR=2.0 and hpForLevel(); constructor seeds maxHp from stats[0]
  at level 1; gainXp recomputes maxHp as level rises and tops up current HP by the gain (Option A).
  Full formula (2B + IV + floor(EV/4)) with IV/EV = 0 (deferred); perks.hp still adds on top.
- Verified vs tuner: median mon 24 HP (L1) -> 250 (L50), ~10x run growth. Scalar 2.0 chosen lean on
  purpose. Healing NOT touched this slice (flat heals left as-is; %-conversion is a later slice).
- Enemy HP deliberately NOT converted this slice: enemies still use the tier-scale model (def.hp *
  sc.hp) with no 'level'. Enemy HP via level-from-run-time is the NEXT slice (needs its own level curve;
  entangles tier/elite/boss/co-op scaling).
- Known intended lean-state: fragile early game (24 vs old 99), flat heals strong early / weak late.
- Not yet done: in-browser playtest, commit on feature/base-stats.
- Where we stopped: player HP slice applied + changelog updated; enemy-HP slice is next.

## 2026-10-17 (base-stats slice 1: Speed -> movement)
- PLAYTESTED and feel-approved: movement feels "really slick"; the Shuckle vs Regieleki difference
  reads beautifully. The locked tuning (SPEED_MEDIAN=65, BASE_PX=107, k=1.0, MOVE_MIN=0.5,
  MOVE_MAX=3.0) is confirmed by feel, not just on paper. 0.5x floor = slow-as-identity (not
  miserable), 3.0x ceiling + tanh saturation = dramatic-but-controllable fast mons. Keep as-is.
- Branched (or to branch) feature/base-stats off main. Implemented the first base-stats slice:
  the player's movement speed now derives from the REAL base Speed stat (stats[5]) instead of the
  old pre-baked `78 + 0.42*Speed` value.
- Model (js/entities/player.js, module scope): statValue (mainline formula), moveTransfer (soft-
  saturating g(r)), speedToPx. Constants SPEED_MEDIAN=65, BASE_PX=107, MOVE_K=1.0, MOVE_MAX=3.0,
  MOVE_MIN=0.5 (locked via the interactive tuner; see BALANCE.md). Constructor seeds this.baseSpd =
  speedToPx(mon.stats[5]), with fallback to mon.spd if stats absent. Everything downstream (get spd(),
  update() movement, walk-anim rate) unchanged since baseSpd is still px/s.
- Speed is fixed species identity (level cancels in the ratio), constant within a run; only items/
  upgrades/buffs move it. The other five stats (deferred to later slices) will scale with run level.
- Verified px/s against the tuner: median 107, Shuckle 54 (floored), Regieleki 245. (~2% off the
  pure-ratio tuner at extremes because statValue's +5 does not perfectly cancel; kept the faithful
  mainline formula.)
- IV/EV deferred (see DECISIONS.md): in the formula but fixed 0, no save change this slice.
- Not yet done: changelog.js entry (game-data file, propose-and-approve), in-browser playtest, commit.
- Where we stopped: slice-1 code applied to player.js; ready for playtest + changelog.

## 2026-10-17 (Team Roster merged)
- Merged the Team Roster feature into main via --no-ff ("Merge Team Roster feature") and pushed.
- Went source-only: gitignored the generated build output (index.html, js/app.min.js, version.json;
  tools/cache/ already ignored) and untracked the committed copies with `git rm --cached`. Build is
  regenerated locally at publish time, not version-controlled. GitHub Pages is not used.
- Deleted the merged feature/team branch (local + origin). git branch -a now shows only main.
- SEO/publishing pipeline (export_data.js, make_seo_pages.py) confirmed inherited and dormant; Jess
  only runs `node tools/build.js`.
- Where we stopped: main is clean with Team Roster in. Ready to branch for the next feature.

## 2026-10-17 (later)
- Reviewed the Team Roster feature (changelog-dated 2026-10-16) for merge readiness.
  Spans game.js (roster runtime: 6 slots, manual swap with 5s lockout + 0.5s i-frame,
  faint auto-swap to lowest living slot, run ends only when the whole team is down,
  shared team buffs), menu.js (roster cards + Pokedex picker, commit/remove, lead-slot
  invariant), db.js (normalizeTeam, backward-compatible with old saves), input.js
  (8 rebindable swap binds).
- Verdict: correct and complete, no functional blocker. Save-migration safety honored.
- One i18n fix found: the faint swap-in line in game.js (~L718) was authored in Spanish
  ("entra en combate") with no lang-en.js key, so it is new feature code that broke the
  English-native rule. Fix is to write it in English directly: "<name> enters the fight!".
  All other Spanish strings in the feature are inherited (they have lang-en.js keys) and
  correctly left as-is.
- Where we stopped: i18n diff proposed for Jess to apply; pending that, feature is
  merge-ready pending a git diff against main (Jess runs git).

## 2026-10-17
- Set up the PokeSurvivor AI collaborator agent (in Amazon Quick) and the shared cross-tool
  working model.
- Established the project-docs scaffold in-repo for portability between Amazon Quick (work) and
  Claude Desktop (home): CONTEXT.md, DEVLOG.md, DECISIONS.md, BALANCE.md, TODO.md.
- Rewrote CLAUDE.md to separate Jess's workflow rules (this fork) from the original owner's rules
  (kept as historical reference).
- No game code touched this session. Local-first phase: single-player first, cloud/MP deferred.
- Where we stopped: scaffolding complete, ready to start actual local game work next session.
