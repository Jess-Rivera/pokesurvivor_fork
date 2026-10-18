# TODO / ISSUES

The backlog. Canonical and in-repo so both tools see the same list.
Keep it simple: move items between sections as they progress. Add a date when an item is opened or closed.

---

## In progress
- Upgrade rework (in-run): slice 1 (delete evolutions + old stat cards) APPLIED 2026-10-18, needs playtest + commit. Slice 2 = mechanic catalogue + six stat cards + 3-step targeting (needs card text, family weights, fan rule for high counts). Rulings: DECISIONS 2026-10-18 "Upgrade rework".
- Balance pass, one branch at a time (DECISIONS 2026-10-17): refactor/enemy-behavior, feature/xp-curve and fix/attack-calc are all DONE, playtested, committed and merged to main
  (Jess, 2026-10-18; branches deleted). Remaining order: status/DoT rework -> tune/damage-hp -> upgrade redesign. Findings and numbers: DEVLOG 2026-10-17 (night) and 2026-10-18.
- Tuning knobs for enemy behavior are the tables at the end of js/data/enemies.js; numbers in BALANCE.md. Class damage weights: CLOSED (final-damage multiplier, DECISIONS 2026-10-18 slice 1c).
- Dev logger: merged with the above. Open logger gap: alive-by-class sample (build only if the ranged mix still feels heavy).

## Up next (local single-player)
- LATER (slice 2): Status mechanics on the player (slow, daze, drowsy, haste aura, secondary Status). DEFERRED HOOK for the cloud phase: the co-op `hz` broadcast must carry the hazard's status field (js/net/coop.js), not touched until the MP phase.
- Rift legendaries are not region-gated (rift.js line 92 filters on p.leg only): a Gen 5 Tornadus appeared in a Kanto run at 2:47 and its flat 55 zone hit one-shot a 53.9 HP player. Jess 2026-10-18: LEAVE THE RIFT FIX ALONE (rifts are planned for removal). The flat boss and legendary damage stays in the Boss damage slice below.
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

## Backlog
- SEO copy pass (opened 2026-10-18): tools/make_seo_pages.py still claims move evolutions (about lines 195, 200, 242, 418-428, 465, 471, 504) and renders an empty evolution column (export sends evo: null). Also prune dormant save fields (stats.evolutions, evoMoves), unused Player.addMaxHp, dead lang-en.js keys.
- Engine ceilings + endgame performance audit (opened 2026-10-18): unbounded upgrades are intended and endgame collapse is accepted, but fix inefficiencies that make it arrive early (projectile array splice, no projectile cap, fan spread = spread x n wraps at high counts, meaningless ceilings like arc 360 make a card ineligible). Do after the card pipeline exists.
- Pause menu redesign / pokemon inspect screen (TABLED 2026-10-18 behind the upgrade rework). Plan: wide pause screen, team strip, click a member for sprite + stat hexagon (white = run-start stat, yellow = in-run % bonus, like the reference image), list of choices taken for that Pokemon, and ALL its moves (not slots) with applied upgrades. Needs a per-Pokemon pick history (Player.picks) and a runBonus() hook.
- Bond rework (its own branch). Opened 2026-10-18, decided with Jess: Bond = Slot Compression + Synergy. Slot compression (a bond frees slots, so you carry more
  moves than the 4 slots; max today 7 moves with one group of 4) stays and grows in value as more moves are added. Synergy (bonded moves interact, for example
  cast-triggered cooldown cuts or same-type bonuses) is new and needs designing. The old job, firing several moves at once, goes away: with independent
  cooldowns (swap rule, fix/attack-calc slice 3c) every slotted move recharges on its own. Open: synergy rules, bond count per run, BOND_MAX, whether more
  than one group can grow, HUD, and rebalancing late-game damage (a 4-move bond was ~4x sustained damage).
- Player-facing battle log (for example a last-3-seconds breakdown on the death screen): DEFERRED by Jess
  2026-10-17, dev logger first. Would reuse the same G.Log records. Not designed further.
- Upgrade rework SLICE 2: 2a committed; 2b APPLIED 2026-10-18 (mechanic cards live, ladders gone, card/Pokemon/move flow, family draw, fan cap, HUD +N badge; uncommitted, needs Jess's dev.html?dev look). NEXT: 2c stat cards (six, per Pokemon) + Type/Kind scoped cards. Open: vitamin names are placeholders; tune FAMILY_W (new moves are ~25% of cards now); mechanic card art; key labels 'SEMICOLON'/'QUOTE' in the Pokemon step; co-op ghosts replay base moves; touch not tested.
- Upgrade system rework (IN DESIGN 2026-10-18, rulings in DECISIONS 2026-10-18 upgrade rework; in-run first, meta-progression on its own branch later). Open design decisions:
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
- Co-op levelStart (game.js) has no empty-offer guard (solo maybeLevelUp does since 2026-10-18); add it when MP resumes.
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
- 2026-10-18: feature/xp-curve and fix/attack-calc (slices 1, 2, 3a+3b, 3c) playtested, committed, merged to main, branches deleted (Jess). Leftovers from them: Dragon Rage / Night Shade fixed-damage path (dmg 0 today), treasure imp XP (events.js spawnThief flat xp 10), prune unused TIERS xp / defFor xp.
- 2026-10-18: feature/xp-curve APPLIED (uncommitted until Jess commits): Medium Fast cost, Gen 5 yield from species base_experience (pokedex.js bx), XP_SCALAR 0.035, big orb = 5% of next level, rock = 1% of next level. TO DO: playtest and retune K from G.Log.pacing(). Bosses/Judgment XP left flat on purpose (boss rework). Legacy: TIERS xp and defFor xp are now unused for wild enemies (prune later).
- 2026-10-18: Region-select confirmed merged to main (Jess).
- 2026-10-17: Pokedex UI redesign (search + region/ownership/sort dropdowns + multi-select
  type/rarity/BST filters, extra-wide layout, BST shown as star tiers, region options as
  "[Gen. #] Region (owned/total)"). Committed on feature/pokedex-ui and merged to main via --no-ff
  ("Merge Pokedex UI feature"), pushed. CSS gotcha fixed mid-build: game CSS must live in
  css/style.css (dev.html does not load css/pages.css).
- 2026-10-17: Merged main (Pokedex UI) INTO feature/base-stats via a merge commit (resolved the
  changelog.js + DEVLOG.md "both appended at top" conflicts, kept both sides), pushed. base-stats now
  carries both tracks. (base-stats later merged to main.)
- 2026-10-17: Damage sub-slice B (player->enemy on the mainline A/D ratio, STAB, scalar 2.0) applied,
  verified, committed + pushed on feature/base-stats.
- 2026-10-17: Set up AI collaborator agent + in-repo project-docs scaffold (CONTEXT, DEVLOG,
  DECISIONS, BALANCE, TODO) + CLAUDE.md rewrite for the two-tool workflow.
- 2026-10-17: Team Roster feature reviewed, i18n fix applied (English swap-in line), merged to
  main (--no-ff) and pushed; feature/team branch deleted. Repo went source-only (build output
  gitignored).
