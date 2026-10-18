# DEVLOG

Reverse-chronological log of each working session. Newest entry on top.
Append an entry at the end of every session: what changed, what was decided, what broke, where we stopped.

---

> Older entries (every session before the SESSION CLOSE below) are in docs/DEVLOG-archive.md, newest first, verbatim.
> They are NOT read at session start. Open the archive only when you need the detail behind a past decision.

## 2026-10-18 (morning, Claude Desktop, second session) slice 1b + logger APPLIED after slice 1 (UNCOMMITTED, not playtested)
- WHAT: applied the combined proposal (patched files byte-identical to the dry-run copies): enemies.js (BANDS), enemy.js (bandOf, screenDist, band movement and gate, cornered fix), log.js (class tags, s + alive per hit, cast(), bands(), CAST row). English changelog entry added; BALANCE, DECISIONS, TODO updated. Offline cast check rerun on the real tree: 18,000 casts, zero violations.
- NEXT: Jess commits, playtests, runs G.Log.bands() mid-run, sends logs. Decision B (runner and shielder tweaks) still needs his description. Then fix/attack-calc.

## 2026-10-18 (morning, Claude Desktop, second session) slice 1 APPLIED, charger warning line added (UNCOMMITTED, not playtested)
- WHAT: applied the four slice 1 diffs (enemies.js, enemy.js, dev.html, main.js) and the generated table js/data/enemy-classes.js (879 entries, checksum 00327d337b).
  Diffs applied with `patch --binary` since the repo is CRLF. Classifier moved to tools/classify_species.py (+ tools/hand-overrides.json); the old HEAL/SHIELD/BOMB/SUMMON
  hash lists are embedded in it as seed evidence because enemies.js no longer holds them. `--write` regenerates js/data/enemy-classes.js; verified byte-identical to the applied table.
- CHARGER (reconciled with Jess's copy): only the warning beam was new. Aim start now locks the dash direction and adds a warn-only beam hazard (new `warn` flag in
  hazards.js: no damage, removed at its delay, skipped by the co-op broadcast). Beam length = spd x 3.4 x 0.42 + radius, width = body width, red.
- VERIFIED: node --check on all touched JS. Offline sim on the real tree: 18,000 tier casts across 9 regions + All, zero violations (size 9, family mix, specials, plain/shooter
  baseline from tier 2, no duplicate support class, one runner max, never a Tank), minionFromCast and hordes work. NOT run in a browser.
- DOCS: changelog.js entry (English), TODO In progress tidied (region-select merged, branch renamed), DECISIONS and BALANCE entries, proposal status updated.
- NEXT (was): Jess commits, playtests every region with ?dev, sends logs; I check the data. Slice 1b (spacing bands) after that. Logger gaps (burn/poison, live-enemy count) if needed.
- PLAYTEST (same morning, Jess committed first): logs Squirtle/Kanto (died-and-revived at 2:47, ran to 2:56) and Charmander/Paldea (82 s). Confirmed: 9 distinct species in tier 1 both runs, no speed bonus (Kadabra 164 and Magikarp 130 are plain species speed; last night's Eevee 147 and Rattata 188 were the old x1.6). Found: a Gen 5 Tornadus rift legendary in a Kanto run, its flat 55 zone one-shot 53.9 HP (Jess: leave the rift alone); normal incoming damage tiny (57 total in 2:47, 1.36 per hit, 30 of 43 hits were shots, mostly resisted water); player L12 vs enemy L5 at 2:33; Charmander drew 5 of 9 water types. Jess's feel: charger line great, 9 species great, no framedrops, runner and shielders need tweaking (pending detail).
- APPLIED 09:26 (Jess approved as written, Decision A = agreed numbers): docs/proposals/logger-and-spacing-bands-proposal.md, logger additions + slice 1b as one change. Key finding inside: at the agreed bands shooters stand 307 px sideways / 173 px up or down, out of reach for melee, dash, cone, beam and chain kits (today 156 to 176 px). Decision A in the doc. Offline sim: all seven behaviors settle at their inner band edge, the cornered fix un-jams a unit against a wall.

## 2026-10-18 (late morning, Claude Desktop) ranged and support spacing bands designed (NOTHING APPLIED)
- WHAT: design only. Answered "is smarter enemy AI survivor-like?" (no: keep it simple, readable, cheap) and designed per-class distance bands for
  ranged and support units. Added a "Spacing bands" section to docs/proposals/enemy-behavior-game-proposal.md (slice 1b), decisions 6-8, apply step 5.
- FINDINGS: the camera is about 384 px half-width but only about 210-216 px half-height, so bands must be measured on screen, not as a circle.
  def.range also gates healer/summoner abilities (backing out of range stops them). Adding shielder to keepsDistance() as-is would make it
  shoot (special() falls through to a shot). The stuck side-step never reaches the retreat, so cornered units push into walls. Current hold band
  is about 20% of range wide (the freeze zone).
- NOT CHECKED: player weapon reach against the 0.80-0.92 bands, and every reader of def.range (bosses included).
- NEXT: Jess commits the design. Then slice 1 apply, playtest, then draft the slice 1b diff.

## 2026-10-18 (midday, Claude Desktop) game-side proposal written for the enemy refactor (NOTHING APPLIED)
- WHAT: docs/proposals/enemy-behavior-game-proposal.md, real unified diffs for enemies.js, enemy.js, dev.html, main.js plus a new generated
  table (draft: docs/proposals/enemy-classes.draft.js, 879 entries, checksum 00327d337b, deterministic across runs). classify_species.py now also
  emits that table and records each Status species' effects (fx). Verified offline in node (8,100 simulated casts, all rules hold); not run in a browser.
- FINDING: the game's wild pool is G.DEX entries with rarity < 5, so the 16 pseudo-legendaries (Dragonite, Garchomp...) are boss-only. Earlier
  feasibility numbers had wrongly counted them; with the real pool only Kanto and Johto tier 6 need to borrow from the band below.
- NEXT: Jess answers the 5 decisions at the top of the proposal, then I apply on refactor/enemy-behavior and Jess playtests every region.

## 2026-10-18 (morning, Claude Desktop) review done in an interactive page; Status class added; hand tuning captured
- WHAT: no game code changed. The markdown review was too heavy, so the flagged species were reviewed in a private interactive page
  (keep / change / drop per species). Jess made 26 effective class changes, added +Tank to 7 species, Ditto as summon-from-cast, and
  a secondary Status on Sylveon and Pheromosa. Dropped none.
- NEW CLASS: Status (4th support class), 47 species after hand tuning. docs/proposals/classify_species.py now detects it from
  sleep/paralysis/confusion/ally-buff moves, abilities and text; Atk or SpA > 100 species stay attackers and get Status as a secondary
  (14 automatic + 2 hand = 16). Healer dropped 59 -> 50 as Status took the powder-kit species.
- HAND TUNING lives in docs/proposals/hand-overrides.json and is applied by the script after its own pass (so regeneration keeps it).
  Hand-tuned rows are excluded from the review flags. Pre-change script saved nowhere in the repo (scratch only).
- NEXT: the game-side proposal for refactor/enemy-behavior (propose-and-approve, nothing applied): per-species class table incl.
  secondary Status and Ditto's unique, 9-species cast with quotas and the shortage rule, drop runner x1.6 and bomber x1.25,
  Runner = fastest in cast, Tank modifier, Status mechanics on the player. docs/proposals/review-build/ is regenerable, do not commit.

## 2026-10-17 (late night, Claude Desktop) enemy taxonomy designed top-down; full class assignments generated for review
- WHAT: no game code changed. Design + tooling only. Dropped the fix/enemy-speed idea of clamping multipliers; the real finding is that
  enemy "classes" are a fixed function of dex number + a hash (behaviorOf in js/data/enemies.js), with stats used only for tank.
  Replaced by a top-down taxonomy (DECISIONS 2026-10-17 "Enemy taxonomy" and "Cast composition rule"): Support (healer, shielder,
  summoner) > Melee (plain, charger, jumper, bomber) / Range (shooter, beamer, zoner, fan) by Atk vs SpA, plus Tank and Runner as
  stat-derived modifiers. Cast per tier = 9 (3-5 melee, 3-5 range, 1-2 support; from T2 at least 1 melee special and 1 range special).
- TOOL: docs/proposals/classify_species.py (offline, NOT in the game, not yet in tools/). Reads pokeapi-master (stats, level-up moves,
  move descriptions + targets, abilities, Pokedex text, evolution, height/weight). Evidence layers: attested (moves/abilities/text),
  then a deterministic type+body+stats "profile" fallback, then the family default. Support needs two agreeing layers; patterns need one
  signature move. Tunables at the top (profile thresholds: tuned 2026-10-17, plain+shooter about 35% of the pool).
- OUTPUT: docs/proposals/enemy-class-review.md (full assignments + 7 review flag categories + 124 NEW support/bomber species for
  a yes/no), enemy-behavior-report.md/.csv (counts, per-tier and per-region tables, cast feasibility). Old bottom-up versions are in
  docs/proposals/old-bottom-up/.
- FINDINGS: enemy level comes from run time at spawn, not tier (G.Stats.levelForTime), so a species borrowed from a lower BST band
  is only ~7% weaker in base stats (about +1 to +4 levels to match). Shortage rule (Kanto T6 has only 8 species): fill the other
  family first, then widen one band down, repeats last. Only Kanto T6 cannot fill a cast of 9. Text layer is strong for bomber
  and healer (hand-list lift 26x and 6x), weak for shielder and summoner, and agrees with the stat rule on melee/ranged only 61%.
- NOT done / next: Jess reviews enemy-class-review.md (flags F1 to F7 and section N), then: write the game-side proposal
  (refactor/enemy-behavior: generated per-species class table, 9-species cast with family quotas, drop runner x1.6 and bomber x1.25,
  Runner = fastest in the drawn cast) as a propose-and-approve diff. Nothing is committed from this session.

## 2026-10-17 (night) first real logs reviewed: balance findings + plan (branch order set)
- WHAT: logger follow-up applied (combat.js ~667: the PROJECTILE damage path now logs HIT_OUT, it was missed in slice 1;
  hit lines gain `speed <attacker px/s> vs you <your px/s>`; displayed multipliers and levels rounded, log.js NF 16->18).
  Then reviewed three logs: Scorbunny 5:23, Squirtle (died 0:38.7), Scorbunny 1:21. No game-logic code changed.
- FINDINGS (numbers from the logs and the code):
  1. Pacing: first level 0:19, gaps 10-20s to L12, a 52s hole at 2:36-3:28 (boss window, normal spawns pause), then
     L20->L25 in 8s. XP per minute 762 / 1876 / 2629 / 1649 / 6532 / 8650: the late burst is kill density
     (31 -> 102 kills per 30s) plus the 117-xp tier, not the formula's per-kill yield.
  2. Player L24 vs enemy L9 at 5:20. HP = 4L+20 (base 50, HP_SCALAR 2), series-faithful, but the player's level
     (XP clock) outruns the enemies' level (time clock). Player level is the main survival factor.
  3. Threat: 271 total damage in 323s; 70 of 76 hits were 1.3-5.8. Three flat boss hits = 86 (32%); Jolteon 55.5 = 69% of
     HP in one hit. Flat boss damage ignores Def. Player Def/SpD (6-24) sit below the neutral 50, so the defense step
     ADDS damage at low level. 4 regen picks (+0.9/s each) out-heal average incoming (0.84 HP/s).
  4. Cards: stat:atk offered 1 of 25 offers. up:ember offered 11x, picked 0x, because only the ACTIVE slot fires
     (Player.addMove switches active to the new move; activeGroup() = what fires).
  5. Squirtle death: Eevee 147 px/s vs 76 px/s. 17 of 21 hits came from faster enemies, 11 from >1.5x faster; 22
     i-frame blocks (mobbed). Water Gun ~2.8/hit vs enemy HP 25-28, 6 kills in 38s. Starter parity at L1 is near total
     (HP 24 vs 22, Def 5 vs 6) because the flat +5 in statValue swamps base stats at low level.
  6. Eevee's species speed is ~92 px/s; 147 = 92 x 1.6 from the RUNNER promotion (enemies.js 167-168: fastest plain
     enemy in a tier's cast gets x1.6). Bomber gets x1.25. Bonuses are multiplicative on whatever species is picked.
  7. Pellets: cone(), fireProjectiles() and nova() spawn `count` projectiles that EACH carry the full moveFactor.
     Flamethrower (power 90, 7 pellets, pierce 1) measured 3.0 hits per cast (max 16), ~21 DPS at L2 vs Ember ~5.8.
     32 moves have count >= 2. Per-hit power ratio is damped by the formula's +2 (90 vs 40 power = ~1.7x per hit).
  8. Ember burn: every hit adds a stack (max 8, 3s refresh), tick every 0.5s = 1.6 x stacks x (1 + 0.06 x player
     level), ignores SpD and type. The ailmentChance field is not read. Burn ticks call hurt() directly: NOT in the log.
  9. Enemy.hurt rounds damage to an integer (min 1): 1.66 -> 2, 2.76 -> 3, 1.4 -> 1. At 1-3 damage per hit,
     feel-tuning is partly tuning rounding.
  10. Opening luck: Scorbunny's L2 offer included Flamethrower, Squirtle's did not. The L2 card decides the run.
  11. XP replay of the 549 real kills (BST x 0.4 as base-exp proxy, no kill-rate feedback): the Gen 5 level-difference
     term alone moves L@5:00 from 21 to 20. Gen 5 yield + mainline Medium Fast (n^3) cost curve, scaled for a 0:19 first
     level (K ~ 0.044), gives L13 at 5:00 and L15 at run end vs enemy L9 (gap +4 instead of +11). The cost curve is the lever.
- DECIDED: see DECISIONS 2026-10-17 "Balance pass". Branch order: fix/enemy-speed, fix/attack-calc, feature/xp-curve,
  tune/damage-hp, then the upgrade redesign (Jess's redesign is deeper than the card-identity options offered; not yet described).
- WHERE WE STOPPED: on fix/enemy-speed, empty. Next: draft the speed proposal (replace runner x1.6 / bomber x1.25 with a
  clamp tied to the player's speed) together with an enemy-class multiplier audit (below).
- ENEMY CLASS MULTIPLIER AUDIT (verified in code unless marked): runner spd x1.6 and bomber spd x1.25 (enemies.js 125,
  167-168); tank dmg x1.2, xp x1.3 (defFor); ranged shot dmg x0.8, fan x0.7; summoner minion spd x1.1, dmg x0.6,
  xp x0.25 (enemy.js 659-660); boss enrage spd x1.15 below 50% HP (enemy.js ~473); bosses x1.35 HP and x1.2 dmg
  ("tougher" since 10-10); boss speed = clamp(40 + 0.5 x base, 40, 100); first tier has no personalities, one support
  type per tier. TO VERIFY: whether scale(t) dmg ramp (1 + t/420) and the zone/hazard multipliers (x1.05-1.4 on tier
  dmg, enemy.js 488-596) still apply after the A/D damage move, or are dead/flat leftovers.
- LOG GAPS: burn/poison ticks unlogged; no live-enemy count per hit (needed to test mobbing vs fast-enemy).

## 2026-10-17 (evening) dev logger slice 1: APPLIED (playtested the same night, see the entry above this one)
- WHAT: dev-only event log, G.Log (js/systems/log.js). Active only with ?dev. Per-hit damage lines in both
  directions as a waterfall (neutral baseline with defender stat 50, then signed deltas for Def/SpD, STAB, type,
  weather, reduction, melee cushion, crit, floor, summing to FINAL), plus kills with XP dropped, XP collected
  (orb x coop x bonus), card offers and picks, heals, faints and Focus Band saves, and i-frame-blocked hits.
  Console API: G.Log.text(n) / print(n) / pacing() / download() / clear().
- DESIGN: numbers in preallocated typed arrays (newest 8192 records), no allocation or strings at record time.
  Player-facing death-screen view was discussed and DEFERRED by Jess (see TODO backlog).
- FILES: NEW js/systems/log.js. Hooks in dev.html (script tag), js/main.js (NEED 'Log'), js/game.js (clock, reset,
  XP collect), js/entities/player.js (hurt/heal, new 5th param `who`), js/systems/combat.js (hit, enemy shot,
  enemy contact), js/systems/hazards.js, js/entities/enemy.js (atkLvl field, `src: this` on 10 shot/hazard
  sites, kill record), js/systems/levelup.js (offer log + pick wrapper). Exact diffs: docs/proposals/dev-logger-slice1.md.
- VERIFIED: node --check on all 8 touched JS files. Mock test of log.js (waterfalls sum to FINAL, ring wraps).
  Randomized equivalence test, 4000 hits: original hurt() vs new hurt() with log off vs log on give identical
  hp/dead/invuln, and every logged waterfall sums to FINAL within rounding. Damage math is unchanged.
- NOT done: in-browser playtest on dev.html?dev (G.Log.print(30), G.Log.pacing(), confirm FINAL matches the
  on-screen numbers, check framerate at high density with the log on), commit.
- OBSERVATIONS for later (not changed): (1) player->enemy scales the ENEMY's Def/SpD at the PLAYER's level, while
  enemy->player scales the enemy's attack at the enemy's level and the player's Def/SpD at the player's level, so the
  two directions are not symmetric (maybe intended, the logged dStat makes it checkable). (2) Immunity (type x0)
  still deals 1 damage in both directions (floor wins), the opposite of the recommended ruling in the design notes.
- BRANCH NOTE: HEAD is feature/upgrades-inrun, so the logger rides on the upgrade-system branch (it is that
  feature's first measurement tool). Jess's call if he wants it split out before committing.
- ALSO THIS SESSION: trimmed session-start docs (old DEVLOG entries to docs/DEVLOG-archive.md, parked MP notes to
  docs/MP-PARKED-NOTES.md, session-start read now about 41KB). Upgrade-system audit (in-run) recorded in TODO
  backlog: flat HP cards vs the new HP scale, unbounded Potencia stacking, cards not mapped to Atk/SpA/Def/SpD.
- Where we stopped: logger applied and verified on disk. Next: playtest it, use pacing() to measure the first
  5 minutes, then decide upgrade-card identity and the opening target (still open with Jess).

## 2026-10-17 — SESSION CLOSE (read this first)
Big session. Everything below is COMMITTED and PUSHED to `main` (no open branches, working tree clean).
Claude Desktop: `git pull` to get the current tree + all docs. Shipped today, in order:
1. Base-stats feature (branch merged to main --no-ff): Speed->movement, HP (player+enemy), shared
   G.Stats, player->enemy damage sub-slices A+B, enemy->player sub-slice C. The whole combat loop now
   runs on one mainline stat model for WILD enemies.
2. Canonical move-power migration: all 64 moves now carry real mainline base power (in the `dmg`
   field, Approach B), English name + short_effect desc, and annotate-only effect fields (ailment/
   ailmentChance/flinch/statChance — DATA ONLY, not wired). DMG_SCALAR re-centered 2.0 -> 0.47.
3. Pokedex UI redesign (merged): search, region/ownership/sort dropdowns, multi-select type/rarity/BST
   filters, extra-wide layout, BST shown as star tiers.
4. Region-select (merged): Random + 9 gen cards; only the chosen gen AND earlier spawn (wild+bosses);
   G.Enemies.region hook; end-run screen shows "<Region> Run".

KEY TUNABLES (js/core/stats.js): HP_SCALAR 2.0 | DMG_SCALAR 0.47 (player->enemy) | ENEMY_DMG_SCALAR 0.5
(enemy->player; bumped from 0.35 by feel) | ENEMY_POWER 40 (flat PLACEHOLDER). Orthogonal dials: HP vs
damage are independent; power migration only re-solves a DAMAGE scalar, never HP (see DECISIONS).

TOP OPEN ITEMS (next session, see TODO for detail):
- Boss damage slice: bosses still use flat def.dmg (sub-slice C deferred them; atkFactor=null guard).
- Canonical learnsets: give each species its real movepool/power; this RETIRES the flat ENEMY_POWER=40
  placeholder (enemies would draw real move power, same system as the player).
- Canonical move procs: wire the annotate-only move fields into real probabilistic effects; split the
  overloaded fork `slow` flag (speed-drop vs freeze vs paralysis vs weather).
- IV/EV still deferred (in the stat formula, fixed 0, no save storage yet).

WATCH / LOOSE ENDS:
- Enemy damage was tuned by feel to ENEMY_DMG_SCALAR 0.5; may want more playtest at later tiers.
- A few lang-en.js move-name keys went DEAD when move names switched to English (harmless; prunable).
- Co-op deferred hooks: hazard atkFactor/atkCat not serialized over the net; startCoop doesn't run the
  region picker (inherits last solo region). Both fine under local-first.
- Reminder: game CSS lives in css/style.css ONLY (dev.html does not load css/pages.css).

