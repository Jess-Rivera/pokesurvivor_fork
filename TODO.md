# TODO / ISSUES

The backlog. Canonical and in-repo so both tools see the same list.
Keep it simple: move items between sections as they progress. Add a date when an item is opened or closed.

---

## In progress
- Balance pass, one branch at a time (DECISIONS 2026-10-17): fix/enemy-speed (CURRENT, empty) -> fix/attack-calc ->
  feature/xp-curve -> tune/damage-hp -> upgrade redesign. Findings and numbers: DEVLOG 2026-10-17 (night).
- Dev logger: slice 1 plus follow-up (projectile-path HIT_OUT, speeds on hit lines) APPLIED and playtested
  2026-10-17 (branch feature/dev-logger, confirm it is merged to main). Dev-only, console API.
  Open logger gaps: burn/poison ticks unlogged; add live-enemy count per hit.
- Region-select (feature/region-select): APPLIED + verified, awaiting in-browser playtest + commit.
  Opened + built 2026-10-17.

## Up next (local single-player)
- DONE 2026-10-18: class review (hand tuning in docs/proposals/hand-overrides.json).
- REVIEW (Jess): docs/proposals/enemy-behavior-game-proposal.md (slice 1: class table, 9-species cast, runner/tank/bomber changes, Ditto). 5 decisions listed at the top. Nothing applied yet.
- LATER (slice 1b, after the slice 1 playtest): per-class spacing bands for ranged and support units (proposal section "Spacing bands"). Before drafting: check player weapon reach vs the 0.80-0.92 bands and every reader of def.range (bosses).
- LATER (slice 2): Status mechanics on the player (slow, daze, drowsy, haste aura, secondary Status). DEFERRED HOOK for the cloud phase: the co-op `hz` broadcast must carry the hazard's status field (js/net/coop.js), not touched until the MP phase.
- fix/enemy-speed (WIDENED to refactor/enemy-behavior, see DECISIONS 2026-10-17 "Enemy behavior becomes stat-derived"): replace runner x1.6 / bomber x1.25 with a clamp tied to player speed; audit the other class
  multipliers (list in DEVLOG 2026-10-17 night). Opened 2026-10-17.
- fix/attack-calc: multi-pellet moves give every projectile full damage (32 moves have count >= 2). Decide how to
  normalize (divide by count or sqrt(count)), and check which upgrade ladders add pellets. Also: Ember burn ignores
  the ailmentChance field; Enemy.hurt rounds to integers. Opened 2026-10-17.
- feature/xp-curve: Gen-style yield + Medium Fast (n^3) cost curve + scalar (K ~ 0.044 as a start); add real
  base_experience to the dex data. Opened 2026-10-17.
- tune/damage-hp: raise player damage for one-vs-many; retune HP/damage scalars from logs, last. Opened 2026-10-17.
- Boss damage slice: bosses still use the flat def.dmg path (sub-slice C deferred them). Put bosses on
  the A/D ratio (and decide boss "Power": flat vs a boss-move) when ready. Opened 2026-10-17.
- Swap enemy placeholder Power: ENEMY_POWER=40 (flat) -> canonical move power once enemies draw real
  moves (ties into the canonical-learnset plan). Opened 2026-10-17.
- Canonical learnsets: give each species its real movepool (and move power), the shared system that
  lets both player and enemy "Power" be real. Opened 2026-10-17.
- Canonical move procs slice: wire the annotate-only ailment/ailmentChance/flinch/statChance fields on
  moves (added 2026-10-17) into real probabilistic effects; split the overloaded fork `slow` flag
  (speed-drop vs freeze vs paralysis vs weather). Opened 2026-10-17.
- Merge feature/base-stats to main when ready. It now contains the damage work (A+B) AND the Pokedex
  UI (main was merged into base-stats on 2026-10-17), so merging it to main brings main fully current.
- Region-select on Play: see Backlog (designed 2026-10-17, not built).
  (NOW BUILT — see In progress.)

## Backlog
- Player-facing battle log (for example a last-3-seconds breakdown on the death screen): DEFERRED by Jess
  2026-10-17, dev logger first. Would reuse the same G.Log records. Not designed further.
- Upgrade system rework (in-run first, meta-progression on its own branch later). Open design decisions:
  card identity (generic stat cards vs Kind/Type-targeted cards), the first-5-minutes pacing target, in-run
  skip/banish. Known issues to fix in it: flat HP cards (+20 max HP is 83% of L1 HP), unbounded Potencia
  stacking (up to x45), cards not mapped to Atk/SpA/Def/SpD. The dev logger's pacing() table is the first step.
- Region-select on Play (local single-player). DESIGNED 2026-10-17, not built. Player picks a region
  (or All) before a run; only that region's Pokemon spawn as wild enemies + bosses. Eligible pool =
  the chosen gen AND all previous gens (so Kanto = gen 1 only, Paldea = full dex). Fallback for sparse
  BST bands is baked into that rule (pool widens backward); gen-1's thin top tier (T5 = exactly 7,
  high boss bands thin) is ACCEPTED as-is, no special case. Implementation sketch: add a `p.gen <=
  selectedGen` predicate to candidates() and the two boss G.DEX.filter lines in js/data/enemies.js;
  store the pick in module scope via a new G.Enemies.setRegion(gen) (null = All) called before
  rollRun(); add a region-picker screen between the menu Play button (menu.js go==='play' ->
  G.Flow.play()) and the run roll (spawner.js rollRun()). Hordes/events inherit the filter for free
  (they call candidates()). Per-run only, NOT persisted -> save-safe. Independent of sub-slice C.
  Open sub-questions (not needed to build the mechanic): (a) can players pick only unlocked regions
  or any region freely? (b) are rifts/legendaries region-gated too? (c) co-op region choice =
  deferred (local-first). At build time, confirm pickN handles "want > available" gracefully (gen-1
  T5 fits exactly at 7).

## Deferred, cloud / multiplayer phase (do NOT start until Jess switches phase)
- Firebase layer (auth, Firestore, RTDB, cloud saves)
- Cloudflare TURN worker
- Multiplayer / co-op / networking (js/net/: social, net, coop, ranking, signups)
- Friends, rooms, online leaderboards
- Co-op hazard sync: G.Hazards.add's network broadcast serializes a fixed field set, so the sub-slice C
  atkFactor/atkCat on enemy hazards do NOT cross the wire. Revisit when MP resumes (enemy->player
  damage would need the attacker context synced, or recomputed on each client).
- Co-op region choice: startCoop() does not run the region picker, so a co-op run inherits the last
  solo region (harmless while MP is dormant). Decide region handling for co-op in the MP phase
  (host picks? reset to All?).

- MP connection reliability, hosting-provider research, and FPS/CPU/cost reasoning (parked design notes, 2026-10-17): moved to docs/MP-PARKED-NOTES.md. Not read at session start. Open it when the cloud/MP phase begins.

## Done
- 2026-10-17: Pokedex UI redesign (search + region/ownership/sort dropdowns + multi-select
  type/rarity/BST filters, extra-wide layout, BST shown as star tiers, region options as
  "[Gen. #] Region (owned/total)"). Committed on feature/pokedex-ui and merged to main via --no-ff
  ("Merge Pokedex UI feature"), pushed. CSS gotcha fixed mid-build: game CSS must live in
  css/style.css (dev.html does not load css/pages.css).
- 2026-10-17: Merged main (Pokedex UI) INTO feature/base-stats via a merge commit (resolved the
  changelog.js + DEVLOG.md "both appended at top" conflicts, kept both sides), pushed. base-stats now
  carries both tracks. (base-stats -> main merge still pending.)
- 2026-10-17: Damage sub-slice B (player->enemy on the mainline A/D ratio, STAB, scalar 2.0) applied,
  verified, committed + pushed on feature/base-stats.
- 2026-10-17: Set up AI collaborator agent + in-repo project-docs scaffold (CONTEXT, DEVLOG,
  DECISIONS, BALANCE, TODO) + CLAUDE.md rewrite for the two-tool workflow.
- 2026-10-17: Team Roster feature reviewed, i18n fix applied (English swap-in line), merged to
  main (--no-ff) and pushed; feature/team branch deleted. Repo went source-only (build output
  gitignored).
