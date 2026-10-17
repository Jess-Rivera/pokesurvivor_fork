# DEVLOG

Reverse-chronological log of each working session. Newest entry on top.
Append an entry at the end of every session: what changed, what was decided, what broke, where we stopped.

---

## 2026-10-17 (Pokedex UI redesign, APPLIED on feature/pokedex-ui, not yet playtested/committed)
- LAYOUT TWEAK (same session, after first visual check): (1) widened the dex screen, scoped so other
  screens keep their cap: `#scr-dex .box.wide { width: min(1600px, 98vw) }` (extra-wide, Jess's pick).
  (2) Put Search + Region + Ownership + Sort on ONE level, equal width: added class `ctrl-row` to the
  first control .row in dev.html, and `.dex-controls .ctrl-row { flex-wrap: nowrap }` with
  `.ctrl-row .field { flex: 1 1 0; width: auto; min-width: 0 }` (overrides the global .field width:100%
  that was stacking them into four full-width bars); dir + Clear stay `flex: 0 0 auto`. Chips remain on
  the level below. Added a max-width:760px media query to wrap gracefully on a narrow window.
  Files: css/pages.css (dex-controls block replaced), dev.html (one class added). No logic change.
- CSS FILE GOTCHA (caught when a hard reload showed no change): I had been appending ALL the Pokedex
  CSS to css/pages.css, but the GAME (dev.html) only links css/style.css. pages.css is the ORIGINAL
  owner's stylesheet for the standalone TEXT pages (guia/, pokedex/, 404.html, the crawlable SEO
  pages), not the game, so every rule I added today was inert. The earlier redesign only looked
  styled because it reused classes already in style.css. FIX: moved all .dex-controls / .ctrl-row /
  #scr-dex .box.wide / chip rules into css/style.css, and reverted css/pages.css to the owner's
  original (my edits removed). LESSON: the game loads ONLY css/style.css; never put game CSS in
  pages.css. Earlier changelog/DEVLOG lines saying "css/pages.css" should read "css/style.css".
- NEW BRANCH: feature/pokedex-ui, branched off main (NOT off feature/base-stats). The damage work
  (sub-slices A+B) lives on feature/base-stats, committed + pushed, not yet merged to main. So this
  Pokedex branch does NOT contain the base-stats work; it is an independent UI change. Merge order is
  Jess's call later (both branch off main independently).
- WHAT: redesigned the Pokedex screen (opened from the menu "Pokemon" button and from roster cards)
  from gen-tabs + filter-chips into a real control bar. Replaced #dex-gens and #dex-filters with:
  a name-or-number search box, Region dropdown (All + 9 gens w/ have/total), Ownership dropdown
  (all/own/miss), Sort-by dropdown (Dex#/Name/BST/HP/Atk/Def/SpA/SpD/Spe) + asc/desc toggle, and
  multi-select chip rows for Type (18, OR match), Rarity (1-5), and BST bands (<=300/301-400/401-500/
  501-600/600+). Added a "N shown" count line and a Clear button.
- Grid is now MULTI-GEN (was gen-locked): renders the filtered+sorted list across all regions, so
  search/sort/type actually span the whole dex. Region default = All.
- Sort tweak Jess chose: stat/BST sorts SINK UNOWNED mon to the bottom (owned-first, then stat within
  each group); Dex#/Name sorts are not sunk. Name search matches owned mon only (unowned are "???");
  number search matches all.
- Perf: render-all (no cap, no lazy-render), per Jess. The dex screen is static (no game loop), so a
  one-time full-dex build cost is acceptable; revisit with lazy-render (IntersectionObserver) ONLY if
  opening All-regions visibly hitches.
- FILES: js/ui/menu.js (state obj dexCtrl replaces dexFilter/dexGen; new buildControls/toggle/
  filterSortDex; openDex + renderGrid rewritten; dead dexGen line removed from pickDex), dev.html
  (#scr-dex markup), css/pages.css (.dex-controls etc.), js/data/changelog.js (new entry, English).
  Old .gen-tabs/.gen-tab/.filters CSS left in place, now unused, harmless.
- VERIFIED: menu.js + pages.css + changelog.js balance-check clean (node --check blocked in sandbox).
  Zero remaining dexGen/dexFilter references. All $('dex-*') IDs the control code touches exist in
  dev.html; the 4 not in markup (dex-big/dex-commit/dex-hex/dex-remove) are built dynamically inside
  showDetail's innerHTML, same as before (not a regression).
- Reused existing helpers (did NOT reinvent): G.UI.spriteCanvas, G.UI.stars, G.Icons.rarity,
  G.Gacha.RARITY_NAME, G.U.TYPE_COLOR/TYPE_NAME. BST bands chosen to read naturally; the detail card's
  G.Icons.bstStars (bst/50 -> 7-star) is unchanged.
- No save-schema change: fully save-safe, no migration, no hard reload needed beyond the normal one to
  pick up new JS/CSS.
- NOT done: in-browser playtest; commit. Jess runs git.
- Where we stopped: Pokedex redesign fully applied + verified on disk on feature/pokedex-ui, awaiting
  Jess's in-browser check. Next after that: commit, then back to the damage track (the "fix before
  enemy->player" was this Pokedex task; sub-slice C still pending the enemy-attack-category decision).

## 2026-10-17 (damage slice, sub-slice B: APPLIED + verified, not yet playtested/committed)
- Sub-slice A was committed by Jess first (confirmed). Then applied sub-slice B: player->enemy
  damage on the mainline A/D ratio, split cast-half + impact-half, mathematically identical to the
  single formula. SCALAR 2.0 (locked). Rollout: ALL sites at once (Jess approved all-at-once).
- stats.js (G.Stats): added DMG_SCALAR=2.0, STAB=1.5, PROP_DEF=50, and three functions:
    attackFactor(atkBase, spaBase, level, move, extraMul) -> attacker half = ((2L/5+2)*m.dmg*AtkStat)/50*extraMul
       (AtkStat = Atk for physical / SpA for special via moveCat; extraMul folds in the old pl.atk
        upgrade+buff layer so the ratio stays proportional)
    applyDamage(factor, defBase, spdBase, move, level, stab) -> (factor/DefStat + 2) * STAB? * SCALAR
       (DefStat = Def/SpD via moveCat; +2 after the division, before the multipliers; type*crit stay
        at the call site). STATUS-cat damaging moves route through the NEUTRAL PROP_DEF denominator
        and never get STAB (Jess picked "neutral denominator for status moves", so no phys/spec label
        is forced on toxic/spikes/toxic-spikes/string-shot/substitute/hail/will-o-wisp). No moves.js
        edit needed: they already carry cat:'status'.
    applyDamageProp(factor) -> (factor/PROP_DEF + 2) * SCALAR  (rocks/chests/grass have no Def stat)
- player.js: added baseAtkStat (stats[1]) + baseSpAStat (stats[3]) (fallback 50), myTypes; added
    get atkMulAll (atkMul * atk-buff), moveFactor(m) (attacker half), stabFor(m) (type match). get atk()
    kept as-is for items etc. Atk/SpA now scale with run level via the formula (HP already did).
- combat.js: replaced m.dmg*pl.atk at ALL ~15 attacker sites with pl.moveFactor(m); the ~6 prop sites
    with G.Stats.applyDamageProp(pl.moveFactor(m)). hit() now takes the attacker FACTOR and completes
    the ratio against the enemy's real base Def/SpD via new enemyDefStats(e) (G.DEX_BY[e.dex].stats,
    fallback 50/50 for bosses/minions w/o stats). The resolve() projectile-impact block completes the
    same way; projectile/orb/field spawns now stash move+level+stab so the impact knows cat/STAB.
    Chain keeps its *k*hex on the factor; mine partial-trigger keeps *0.5 on the factor.
- IMPLEMENTATION HICCUP worth noting for next time: several multi-hunk file_edit calls on combat.js
    reported success but did NOT persist (applied against a stale snapshot). Caught it by grepping the
    live file on-device; the real remaining sites (fireProjectiles, nova, boomerang, chain, orbit x2,
    turret-proj stash) were then fixed with a direct on-device write with uniqueness asserts. Final
    guard: 0 occurrences of 'm.dmg * pl.atk' remain. Lesson: after batch edits on a device file, grep
    the live file to confirm, don't trust the success return alone.
- VERIFIED: brace/paren/bracket balance OK on stats.js, player.js, combat.js (node --check is blocked
    in the sandbox, so used a string-aware balance checker). Numeric sanity (Ember pow18 STAB special,
    atk60 vs def65): L1 ~2.8 hits-to-kill -> L50 ~8.9, inside the intended ~3->~12 ramp band. No
    double-division. changelog.js entry added (chg, English both slots) and re-verified parsing.
- NOT done: in-browser playtest; commit. Jess runs git.
- Where we stopped: sub-slice B fully applied + verified on disk, awaiting Jess's playtest. Expect it
    to feel easy (enemies still not balanced vs player damage; damage-vs-enemy-HP tuning is a later
    pass). The naked ramp is intended, do NOT rebalance base stats to flatten it (see DECISIONS).
- Still OPEN / next: (1) playtest on dev.html (hard reload; save-safe, no schema change this slice);
    (2) commit sub-slice B; (3) sub-slice C = enemy->player damage (needs the enemy-attack category
    design gap resolved, see the 2026-10-17 DECISIONS entry on behavior-driven enemy attacks).

## 2026-10-17 (damage slice, sub-slice B: SCOPED + mid-approval, NOTHING APPLIED YET)
- STATUS: sub-slice A is COMPLETE but UNCOMMITTED. sub-slice B is fully designed and approved in
  principle (STAB yes, 2.0x scalar locked) but NO combat.js/player.js/stats.js edits have been made.
  A fresh chat picks up by laying out the sub-slice B diff for approval, then applying it.
- COMMIT THE UNCOMMITTED SUB-SLICE A FIRST (run before starting B):
    git add js/data/moves.js js/core/stats.js tools/gen_move_cats.py DEVLOG.md
    git commit -m "Damage sub-slice A: move physical/special/status categories + moveCat fallback + generator"
- Damage model decided (start mainline, tune toward survivor):
    base = ((2*L/5 + 2) * Power * (Atk/Def)) / 50 + 2, then * STAB(1.5) * type * crit * SCALAR
    SCALAR = 2.0 (locked via the naked-baseline tuner: median move ~3 hits early, ramps to ~12 by 30 min).
  The naked baseline is INTENTIONALLY upgrade-dependent: the ramp is headroom that the draft / move
  upgrades / crit / items fill later. Do NOT "fix" the ramp by rebalancing base stats (see DECISIONS).
- Why the ramp exists (diagnosed, not a bug): enemy HP grows ~10.4x over a run (L1->L50) while mainline
  damage grows ~2.6x, so hits-to-kill climbs on the naked line. In a survivor-like the base character is
  not meant to keep pace alone; the build does. Confirmed with the user; logged as a design decision.
- Player Atk/SpA will scale with level this slice (completes stat-scaling; HP already does, Speed never).
- TWO-PART IMPLEMENTATION (mathematically identical to mainline, split only by spawn-then-impact timing):
    at cast (attacker half, replaces `m.dmg * pl.atk` at ~15 combat.js spawn sites):
       factor = ((2*L/5 + 2) * Power * AtkStat) / 50       // AtkStat = Atk for physical, SpA for special
    at impact (in hit(), where the specific enemy's defense is known):
       dmg = (factor / DefStat + 2) * STAB * type * crit * SCALAR   // DefStat = Def(phys) or SpD(spec)
  The +2 stays on the impact side AFTER the division and BEFORE the multipliers, exactly as mainline.
- Planned functions (single source of truth in js/core/stats.js):
    G.Stats.attackFactor(baseAtk, baseSpA, level, move, scalar?) -> attacker half (picks Atk/SpA via moveCat)
    G.Stats.applyDefense(factor, enemyDef, enemySpD, move) -> (factor/DefStat + 2); type*crit*STAB stay in hit()
- player.js: add baseAtkStat from stats[1] and baseSpAStat from stats[3], scaling with level via G.Stats.
  enemy.js already exposes real base stats via G.DEX_BY[def.dex].stats ([2]=Def, [4]=SpD) at its level-for-time.
- combat.js: replace `m.dmg * pl.atk` at ALL ~15 spawn sites (projectile x3, melee/cone, beam, aura, chain,
  mines, meteor, turret, dash, trail, orbit, patch) with the attacker-factor helper; complete the ratio in hit().
  DECIDED to replace all sites at once (user has not answered the all-at-once vs phased question yet, but the
  recommendation stands: all at once so every move kind is consistent to playtest). CONFIRM on the fresh chat.
- STAB = 1.5x when the move's type matches one of the ACTIVE fighter's species types (G.DEX_BY[pl.dex].types).
- Still OPEN on the fresh chat before applying: (1) confirm all-at-once vs phased rollout; (2) then produce the
  full propose-and-approve diff (stats.js + player.js + combat.js) for approval; (3) apply on approval;
  (4) changelog.js entry (fix/chg) in English; (5) in-browser playtest; (6) commit sub-slice B.
- The 7 "status-but-damaging" moves still need their real phys/spec cat decided when the formula goes live
  (deferred from sub-slice A): toxic, string-shot, spikes, toxic-spikes, hail, will-o-wisp, substitute.
- Damage tuner artifact built this session (naked baseline, scalar knob). NOT yet saved to the repo; user
  was offered docs/tools/ save but chose "give me the scalar" instead. Re-offer if wanted.

## 2026-10-17 (damage slice, sub-slice A: move category data)
- Prep for the damage model (mainline A/D ratio). Added a physical/special/status category to every
  move. All 64 moves in js/data/moves.js use real mainline move IDs, so categories were pulled
  directly from pokeapi-master (move_damage_classes.csv + moves.csv) by ID: 20 physical, 32 special,
  12 status. Each RAW entry now has a `cat` field (after `kind`). moves.js parse-verified.
- G.Stats.moveCat(m) fallback added (js/core/stats.js): returns m.cat if set, else buff->status,
  melee/dash/mine->physical, else special. So a future move missing cat never breaks the damage model.
- tools/gen_move_cats.py (report-only, Python): re-reports each move's correct category from pokeapi
  and flags MISSING/MISMATCH/CUSTOM. Does NOT edit moves.js (stays propose-and-approve). Verified: all
  64 report ok.
- 7 "status-but-damaging" moves (toxic, string-shot, spikes, toxic-spikes, hail, will-o-wisp,
  substitute — pokeapi=status but implemented as damaging field effects) are stamped 'status' for now;
  their real physical/special cat is DEFERRED to sub-slice B when the damage formula needs it.
- ZERO in-game behavior change this sub-slice (nothing reads cat yet). Playtest-neutral.
- Next: sub-slice B (player->enemy damage via the A/D ratio using Atk/SpA vs Def/SpD + cat).
## 2026-10-17 (refactor: shared G.Stats module + enemy speed on identity model)
- Unified all base-stats formulas into a new js/core/stats.js (G.Stats): HP_SCALAR, SPEED_MEDIAN,
  BASE_PX, MOVE_K/MAX/MIN, statValue, hpForLevel, moveTransfer, speedToPx, levelForTime, plus
  scaffold stubs attack/defense/spAtk/spDef for future slices. Single source of truth; retune once.
- Load order: stats.js added right after core/util.js in dev.html AND 'Stats' added to NEED in
  main.js (right after 'U'). New-script-file build rule followed.
- player.js and enemies.js now call G.Stats.* (removed their local duplicate constants/functions).
  Verified all pre-refactor values unchanged (player HP 24->250, speed 54/107/245; enemy HP 24/137/250).
- Enemy SPEED moved onto the identity model (G.Stats.speedToPx from real stats[5]): fixed per species,
  same px/s scale as the player, NO run-time ramp (dropped the old sc.spd = 1+t/1400 enemy speed-up).
  A base-65 enemy and base-65 player now move at the same 107 px/s. Bosses keep their own spd path.
  Runner behavior keeps its x1.6 speed (it's a behavior archetype 'the fast one', not a base-stat).
- Done against a clean commit (easy rollback). Not yet done: in-browser playtest, commit.
## 2026-10-17 (base-stats slice 3: enemy HP, wild only)
- HUD: added the current enemy level as a big number in the TOP-RIGHT corner (hud.js), mirroring the
  run timer's font/color (F(800,26), rgba(255,255,255,.95)) with an "ENEMY LV" subtitle (F(600,10),
  #8fa3c4). Reads G.Enemies.levelForTime(st.time); textAlign reset to left after. Makes the HP/
  difficulty scaling legible to the player (ties to the "escalation should be visible" principle).
- Wild-enemy HP now uses the same mainline formula + 2.0 scalar as the player, from real base HP
  (stats[0]) at a run-time-derived level. enemies.js: added levelForTime (linear L1->L50 over 30 min)
  and enemyHp(); defFor carries baseHp instead of a derived hp; scale(t) drops the hp ramp (carries t).
  enemy.js constructor: wild = G.Enemies.enemyHp(baseHp, sc.t); bosses keep def.hp*bossScale.
  spawner.js: removed the density hpK (3.3-5x), the co-op scaleHp on HP (dormant), and the elite x1.6
  HP bump (kept its dmg/xp bump). Summoner minion fixed to carry baseHp + use the formula (was 0.35x
  summoner hp under the old model). Removed now-dead role HP mults (tank/bomber/runner).
- Consistency verified: base-65 enemy and base-65 player have identical HP at every level (24/134/250
  at L1/25/50). Enemies ~2x-100x less tanky than the old stacked model; INTENDED (not balanced vs
  player damage yet — will feel very easy this slice).
- Phase 2 (post-30-min: [Standard Run] fixed accelerating ramp vs [Unlock Safeties] opt-in DDA with
  boosted rewards, behind the planned 30-min boss gate) is specced in DECISIONS.md, not built.
- Not yet done: in-browser playtest, changelog, commit.
- Where we stopped: wild-enemy HP on the formula; bosses + rift legendary deferred.
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
