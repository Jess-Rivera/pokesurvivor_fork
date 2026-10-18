# DECISIONS

Standing design and workflow rulings. Once something is here, treat it as settled, do not relitigate it.
Add a dated entry whenever a durable decision is made.

---

## 2026-10-18, Slice 1c design answered: shots, support crowd-seeking, contact gap, flanker [Jess]
After the slice 1b playtest ("i really really like how they all play out") Jess answered the four fixes in chat. APPROVED "as written" and APPLIED 2026-10-18 (patched files byte-identical to the tested copies; offline simulation passes): docs/proposals/support-contact-flanker-proposal.md. Jess confirmed retreat = the same speed formula at 1.2, and kept FLANK.rest 1.5 s and the 1.15 retreat edge. Uncommitted code, not yet playtested.
- Shots: for now ONLY the plain shooter's shot life doubles (2.4 s to 4.8 s, speed unchanged). Everything else stays. Jess and Claude will do the per-class "deeper dive" together later. Life is a per-class table (`SHOT_LIFE`) so bosses and fans are not affected.
- Shielder and healer: both seek the largest group of allies (instead of a band) and keep a floor of 0.30 screens from the player. Each gets a weak shot AND a weak melee (0.5x of the final damage), chosen by whether the player is in touching range. Approved as designed.
- Contact gap: walkers stop at 1.15x the radius sum, the hit test reaches 1.3x. Approved.
- Runner is renamed FLANKER and rebuilt: fastest non-Tank plain and fastest non-Tank shooter per tier; max 2 active at once; speed formula `max(own, min(own x mult, 2.0 x player))` with approach x1.6 and retreat x1.2; picks the emptiest of 8 wedges around the player; spirals in at about 140 px; one strike at 1.2x damage (adjustable, raise if it feels weak), holding and retrying up to 1.5 s if the player's i-frames swallow it; then runs to the screen edge and repeats.
- Spawn mix (Jess, after the first slice 1c playtest, option 2 of the class-spread analysis): spawn weight is by FAMILY inside each tier (melee 0.45 / range 0.40 / support 0.15, `FAMILY_SHARE`), not by species count, so a shooter-heavy cast no longer floods the screen. Applied as a quick change, no proposal. Jess: the rest of slice 1c "feels good" (flanker loved, shooters flying further is "very bullet hell", melee flicker gone). Open: measure the real alive-by-class mix (logger sample) if ranged still feels heavy; status species still act as shooters until slice 2.
- Damage multipliers (weak support, flanker strike) apply to the FINAL damage, after the defense step. Scaling the attack factor would not work (the "+2" dominates at low level). This is the narrow, agreed answer to "do class damage weights come back": a multiplier on final damage, per case, not a return of the old per-class table.

## 2026-10-18, Logger additions and slice 1b approved and applied [Jess]
Approved "as written" with Decision A kept at the agreed band numbers for the first playtest (fallback shooter 0.62/0.74, zoner 0.58/0.70 if edge shooters feel unreachable for beam, cone, dash and melee kits). Decision B (runner and shielder tweaks) is still waiting for Jess's description; nothing was changed for it beyond the shielder band.
Applied: spacing bands in `G.Enemies.BANDS`, `Enemy.bandOf()` / `screenDist()`, ability gate follows the band, shielder moves but never shoots, cornered retreat slides along walls. Dev logger: class/runner tags, `s` and alive count per hit, `G.Log.cast()`, `G.Log.bands()`, CAST row in download.

## 2026-10-18, Slice 1 playtest results and two rulings [Jess]
Playtest (Squirtle/Kanto, Charmander/Paldea): the charger warning line is "great", 9 species per tier "felt good, plenty of variety", no framedrops (one single one-second freeze, probably his PC). Runner and shielders "need tweaking" (details pending).
- Rift legendaries stay UN-gated by region. A Kanto run met a Gen 5 Tornadus (rift.js picks from every legendary); Jess ruled to leave it alone since rifts are planned for removal. Do not propose a region filter for rifts.
- Logger additions (class and flags on log lines, a cast dump, a screen-distance and live-count field) and slice 1b (spacing bands) are to be built as ONE proposal: docs/proposals/logger-and-spacing-bands-proposal.md.
- Findings that stay open: normal enemy damage is tiny against the player's level (Squirtle took 57 damage in 2:47 outside one flat 55 boss hit; L12 vs enemy L5 at 2:33), which feeds feature/xp-curve and the Boss damage slice. The cast draw ignores types (a Charmander run drew 5 water types of 9).

## 2026-10-18, Slice 1 approved and applied; charger gets a warning line [applied, uncommitted, awaiting playtest]
Jess answered all 8 proposal decisions YES and approved applying slice 1 on refactor/enemy-behavior (the enemy-behavior-game-proposal.md diffs, unchanged,
plus the generated table js/data/enemy-classes.js, checksum 00327d337b). The classifier now lives in tools/classify_species.py with tools/hand-overrides.json
beside it; `python tools/classify_species.py . --write` regenerates the table. The old hash lists (HEAL/SHIELD/BOMB/SUMMON) are kept inside the script as seed evidence.
- Charger (Jess's ruling): within 200 px it stops and aims for 0.55 s showing a WARNED BEAM, then dashes for 0.42 s at 3.4x speed, and cannot charge again for 1.1 s.
  Only the beam is new. Implementation: the dash direction is now locked at the START of the aim (so the line tells the truth), and a warn-only beam hazard
  (flag `warn`, no damage, local only, never broadcast) is drawn for the aim time, length = the dash distance. Hazards.update removes warn hazards without detonating.
- Spacing bands (slice 1b) are NOT part of this application.

## 2026-10-18, ranged and support spacing bands [agreed, game change pending]
Jess's rulings while reviewing what each class does (full design in docs/proposals/enemy-behavior-game-proposal.md, "Spacing bands"):
- Enemy AI stays simple and readable (survivor-like reference): no dodging, no group tactics. Identity comes from WHERE a class stands and what it telegraphs.
- Ranged and support units hold a per-class distance band, measured on screen (s = hypot(dx/(w/2), dy/(h/2)), 1.0 = screen edge), not one shared range.
  They approach at full speed and RETREAT at 0.8x speed (so you can chase them down), with a narrow hold band so they do not freeze.
  First-guess bands (retreat below / approach above): fan 0.30/0.40, beamer 0.50/0.62, zoner 0.72/0.82, shooter 0.80/0.92 (status shares it
  until slice 2), shielder 0.45/0.58 (movement only), healer 0.70/0.82, summoner 0.70/0.82. Tuned by playtest.
- Cornered units side-step instead of pushing into the wall (retreat direction uses the existing sideT rotation).
- Ability gates follow the band, not def.range. Shielder moves with the band but must never fire shots (its shield stays on its 6 s timer).
- Class damage factors are ignored today (atkFactor path) and the charger has no ground marking; Jess is handling the charger in his own table copy.
  Not yet decided: whether class damage weights come back.

## 2026-10-18, Status support class, secondary Status, and Jess's hand tuning [agreed, game change pending]
Jess's rulings (after reviewing the generated assignments in the class-review page):
- Support gets a 4th class: STATUS (debuffs/ailments on the player, e.g. sleep, paralysis, slow, or buffs on allies, e.g. a speed aura).
  Evidence: sleep/paralysis/confusion/ally-buff moves (strong), DoT ailments and plain debuffs (weaker), abilities (Intimidate, Gooey,
  Plus/Minus...), Pokedex text. A strong attacker (Atk or SpA > 100) with a Status kit stays an attacker and gets Status as a SECONDARY.
- One kind of secondary class is allowed: Status. It rides on top of any primary class; the PRIMARY class alone sets family and cast quota.
  A secondary Status should be weaker than a primary Status (about half duration), so dual-role enemies are not strictly stronger.
- Generated rules are kept as they are (Tank rule HP >= 95 and Speed <= 50, shielder rule, etc.). Jess's hand tuning is layered on top
  and lives in docs/proposals/hand-overrides.json: 26 class changes, 7 extra Tanks (kakuna, forretress, miltank, blissey, wailord,
  drifblim, gigalith), secondary Status on sylveon and pheromosa, and Ditto as a unique behavior (summon-from-cast).
- Ditto: a summoner whose minions are random members of the drawn cast, not copies of itself. Guardrails to build in: minions from the same
  tier or lower, never summoner/healer/bomber, same minion cap as other summoners.
- Game-side notes: the player already has a slow state (slowT, half speed); sleep/paralysis on the player are NEW mechanics and need short
  durations plus a grace window against stunlock. Ally buff = an aura on nearby enemies.

## 2026-10-17, Cast composition rule (9 per tier) and the profile fallback [agreed, script + game change pending]
Jess's rulings:
- Each tier's cast is 9 species: 3-5 Melee, 3-5 Range, 1-2 Support, always totalling 9 (target 4 / 4 / 1). Runner and Tank
  modifiers are applied AFTER the draw (Runner = fastest relative within the drawn cast).
- From tier 2 on, at least 1 of the melee slots is a Charger, Jumper or Bomber, and at least 1 of the range slots is a
  Beamer, Zoner or Fan (the existing "one warned attacker per tier" rule, made per family). Tier 1 stays plain (ease-in).
- Region pools are cumulative (a run of generation N draws from generations 1..N), so only Kanto has no larger pool to
  borrow from. Measured: every pool from Hoenn up can supply 4/4/1 in every tier; Johto T6 fits the flex range; Kanto T6
  has only 8 species (1 melee, 3 range, 4 support) and cannot fill 9. Shortage rule: fill from the other family first,
  then the adjacent tier, and allow repeats.
- Profile fallback ("profile" confidence tier, below "attested"): a species with no confident attested evidence gets a
  deterministic class from type + body (height/weight) + stats instead of silently becoming Plain/Shooter. Plain and
  Shooter stay as real baseline mobs (the density identity); target roughly 30% of the pool. Support stays evidence-only.
  No hash anywhere. Attested evidence (moves, abilities, text) always wins over profile.
- Attack patterns: one signature move is enough to be confident (the two-layer corroboration rule stays for SUPPORT roles
  only). Two or more spread-damage moves count as one Zoner signal.

## 2026-10-17, Enemy taxonomy: top-down families, then class, then body modifiers [agreed, script rework pending]
Supersedes the flat class list. Decided top-down (Jess, 2026-10-17). One class per species, plus optional body modifiers.
- Families and classes:
  - SUPPORT: Healer, Shielder, Summoner. Chosen FIRST, by evidence of a support role. Support units keep their distance
    in the game, so no stat check is needed for the family.
  - MELEE (Atk >= SpA): Plain (chase, the default), Charger, Jumper, Bomber. Bomber is a kamikaze that walks up and
    explodes, so it is Melee and is picked on evidence regardless of stats (Electrode has SpA > Atk but still runs at you).
  - RANGE (SpA > Atk): Shooter (plain ranged, the default), Beamer, Zoner, Fan.
  - MODIFIERS (not classes, stat-derived only): Tank (high HP, low Speed; keeps dmg x1.2 / xp x1.3) and Runner (fastest
    relative within the drawn cast; speed x1.6 / bomber x1.25 multipliers are dropped). A charger can also be a tank.
- Decision order: (1) confident support evidence -> Support; (2) otherwise the stats set the family; (3) evidence picks the
  class inside the family, else the family default (Plain or Shooter); (4) modifiers from stats.
- Because the family is fixed before the class, a class can never contradict the stat delivery (the 131 and 87 conflicts
  from the bottom-up sort cannot occur).
- Evidence rules: prose is used. Move DESCRIPTIONS (effect text + target) are a strong layer. Species Pokedex text is a
  WEAK layer, capped, and is NOT used for the family choice (it agreed with the stat rule only 61% of the time). A
  species needs two independent layers to agree to be CONFIDENT (move + strong ability, or move + species text); a
  signature move alone is LOW. Shielder needs three moves or corroboration (its moves are learned very widely).
- Cast draw (to design next): per-cast quotas (for example at most 1 support per tier and 1 to 2 patterns, the rest
  Plain/Shooter) so class population sizes matter less. Sprites: cast per tier becomes 9 (was 7).
- Evidence data: docs/proposals/classify_species.py and its generated reports (draft; bottom-up version, to be reworked).

## 2026-10-17, Enemy behavior becomes stat-derived (replaces the dex-hash classes) [direction agreed, proposal pending]
Finding: there are no true "classes" chosen from the bag. behaviorOf() in js/data/enemies.js assigns each species a FIXED
behavior from its dex number (HEAL/SHIELD/BOMB/SUMMON lists) plus a hash of the dex number gated by type. The cast itself
(6 tiers x 7 species, drawn per run from BST bands) is a sprite-loading and readability device and STAYS.
Jess's rulings:
- Cast: keep the small drawn cast (6x7 is fine, maybe 6x9). Tiers by BST stay. Guaranteed slots stay (one support per tier,
  one warned attacker from tier 2 on).
- Behavior is derived from the mainline stats, not the hash: the higher of Atk/SpA picks contact vs ranged (the SAME rule
  the damage code uses for category, which also closes the sub-slice C "no enemy category" gap); Speed relative to the cast
  picks the fast flanker; high HP with low Speed is the tank.
- Drop the runner x1.6 and bomber x1.25 speed multipliers (speed is already species identity).
- Species exceptions (healer, shielder, bomber, summoner) stay as character. The roster may EXPAND by lore (see below).
- Lore check (pokeapi-master, 1018 species): of 419 species with Atk ahead of SpA by 15+, only 3 learn mostly special moves;
  of 274 with SpA ahead by 15+, 97 learn mostly special and 21 mostly physical (TM breadth pollutes learnsets, so use the
  STATS, not learnsets). Contact moves are 56% of damaging learnsets for Atk-leaders, 45% for mixed, 37% for SpA-leaders.
  Alakazam/Gengar/Gardevoir/Mewtwo read ranged, Machamp/Golem/Garchomp/Slaking read melee. 325 species (32%) sit within 15
  points (mixed). Caveat: physical = contact is a GAMEPLAY mapping (Rock Blast, Bullet Seed are physical but ranged in fiction).
- Roster expansion by lore: raw learnsets are far too broad (Reflect 311 species, Explosion 89). Level-up learners of the
  signature moves: healer 79, shielder 148, bomber 44; ability-based sets: 66 / 65 / 28; both together: 21 / 22 / 8. The
  current hand lists are mostly consistent (bomber 11/12 learn it by level-up, healer 8/14, shielder 7/14).
- RESOLVED 2026-10-17 (Jess): mixed-stat species follow the higher stat (same rule as damage category); "fast" is Speed
  relative within the drawn cast; tank keeps its dmg x1.2 / xp x1.3; cast size becomes 9 per tier (6x9); roster-expansion
  rule (level-up learner AND ability vs either) is DEFERRED. Branch fix/enemy-speed is renamed in intent to
  refactor/enemy-behavior.
- STILL OPEN: whether delivery (contact vs ranged) is strictly tied to the higher stat or can differ inside the mixed band.

## 2026-10-17, Balance pass: order and intent (Jess's rulings)
- One branch per concern, merged before the next is cut, in this order: fix/enemy-speed, fix/attack-calc,
  feature/xp-curve, tune/damage-hp (pure scalar tuning, last), then the upgrade redesign. Each step is validated
  against a dev-logger run. Reason: each change moves the baseline the next one is tuned on.
- Player damage goes UP to reflect one-versus-many, not 1v1 (intent; the numbers are set last, from log data).
- Enemy speed: a speed bonus must never stack on an already-fast species. Replace the runner x1.6 / bomber x1.25
  multipliers with a clamp tied to the player's speed (exact form decided in the fix/enemy-speed proposal).
- Enemy classes stay as a concept (no per-enemy signature move needed, and they keep the screen readable), but the
  class multipliers get a redesign. Audit list is in the DEVLOG 2026-10-17 (night) entry.
- Attack damage calculation gets fixed: each projectile of a multi-pellet move currently carries the full damage.
- XP direction: move toward mainline-style XP (Gen-style yield with a level-difference term and a turn-based to survivor
  scalar). Finding that informs it: the mainline cost curve (Medium Fast n^3) is what closes the player/enemy level gap;
  the level-difference term alone barely does (DEVLOG finding 11).
- The upgrade redesign is deeper than the card-identity options offered so far; Jess will describe it. Nothing settled yet.

## 2026-10-17, Dev logger: dev-facing, full-granularity, numeric ring buffer (built 2026-10-17)
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

## 2026-10-18, XP curve (feature/xp-curve), Jess's rulings
- Cost curve is mainline Medium Fast (n^3 total). Yield is the Gen 5 scaled formula using each enemy's own species base_experience (PokeAPI), enemy spawn level and the player's level at the kill. XP_SCALAR = 0.035.
- Reason for 0.035 over 0.044: players ending ahead of the waves (the Gen 1-4 variant reached L63 at 30:00) is too fast. The Gen 5 level-difference term is the brake, K sets the pace.
- Bosses and Arceus Judgment legendaries are NOT touched, flat def.xp stays. They get their own feature rework later.
- No player level cap.
- XP orb is "big" when worth at least 5% of the next level (BIG_XP_SHARE, tunable). Breaking a rock drops a flat 1% of the next level's XP (before the xpMul perk and co-op factor).
- Summoner minions pay a quarter of a normal kill of their own species. Tank/elite/shiny/golden are multipliers (xpMul) on the formula result.
- Design source: docs/proposals/xp-curve-proposal.md and xp-curve.diff.

## 2026-10-18, fix/attack-calc: design talk (NO code yet), Jess's rulings and the agreed scope
Diagnosis: the mainline equation gives the damage of ONE USE of a move on ONE target. The game applies it at every event (pellet, tick, orb contact, chain link) and pairs it with a hand-set cooldown, so the per-use damage, the cadence and the multiplicity are each decided outside the equation.
- Cast normalization (Jess's rule): compute the raw cast damage (no upgrades, no STAB), normalize it to the move's BASE pellet count; that is the base of the move. STAB and upgrades multiply every pellet equally. Upgrade-added pellets add real damage (divisor frozen at the base count).
- Division by pellet count applies only to VOLLEY kinds (projectile with count > 1, cone). One-hit-per-target kinds (melee, beam, dash, chain, mine, meteor, nova) keep full power per target, count is coverage. Continuous kinds (orbit, aura, trail, turret) deliver a damage-per-second budget as small ticks (tick damage = budget x tick interval); orbit rehit currently equals the move cooldown (combat.js, rehit: max(0.12, m.cd)).
- Model: every move = a damage-per-second budget per target + a shape (burst chunks at cd, or continuous ticks).
- Cooldown from PP (Jess's idea, agreed): mainline tunes power x PP to roughly 1000-1400 for most moves, so cd proportional to 1/PP (maybe 1/PP^beta, compressed) gives near-equal sustained single-target DPS across moves. NOT yet verified against moves.csv for the 64 moves. This is the move rework, NOT part of fix/attack-calc.
- Swap behavior today (verified): only the active move's timer ticks; setActive caps the incoming move's wait at 35% of its cd. With long PP-derived cooldowns that is a bypass. Needs a ruling in the cooldown branch: independent background cooldowns + a swap lock (Claude's lean), or keep the cap, or compress the cd range.
- Accuracy: no miss roll in the game. Fold it into the data as expected power (power x accuracy/100); few moves affected, never-miss counts as 100.
- Defender level: a BUG, fix in fix/attack-calc. Player->enemy computes the enemy's Def/SpD at the player's level (combat.js hit(), applyDamage(..., pl.level, ...)); it must use the enemy's own level (e.atkLvl). Bosses have atkLvl 0, so they need a fallback. The logger's dStat uses the same level and must follow.
- Rounding: Enemy.hurt rounds to integers; fix with fractional HP and display-only rounding.
- Status/DoT (burn, poison, ailmentChance, stacking): a separate rework, a NEW branch AFTER the cooldown work, because mainline DoT is per turn (burn 1/16 max HP per turn) and the cooldown scale defines our turn length. Evidence it matters: in the 2026-10-18 Arcanine log burn did roughly half to two-thirds of Ember's damage (Mankey 10 of 22 HP, Dratini 14 of 22, Vulpix about 17 of 25), outside the formula and unlogged.
- Interim: log burn and poison ticks in the dev logger inside fix/attack-calc (measurement only) so tuning logs are honest.
- Branch order: fix/attack-calc (cast + tick normalization, defender level, fractional HP, accuracy fold-in, burn/poison tick logging) -> move cooldowns (PP) + swap rule -> status/DoT rework -> tune/damage-hp -> upgrade redesign.

- 2026-10-18 (later, geometry math): Unified rule d = C_cast / E (C_cast = mainline damage of a full use, multi-hit moves count their hits; E = events one target is expected to take per cast, or per cooldown period for continuous kinds, frozen at the move's BASE config). Upgrades that add events add damage, upgrades that add coverage do not.
- Cone (Spray) divisor: design for TYPICAL range (E about 3 for Flamethrower), not point blank (E = pellet count). Point blank therefore overshoots (risk and reward), far targets get less.
- Accuracy: use the Move kind rules workbook mapping (accuracy -> size/area/pierce and Beam kind selection) for geometry, AND fold expected power (power x accuracy/100) into damage. Never-miss counts as 100. No miss roll in the game.
- Aura/Trail delivery (pulse per cooldown vs fixed ticks) is OPEN until the per-move table shows the PP-derived cooldowns.

## 2026-10-18 — fix/attack-calc slice 1 APPLIED
- Enemy Def/SpD now computed at the enemy's own level (e.atkLvl; bosses atkLvl 0 fall back to the attacker's level). Both damage sites in combat.js.
- Enemy HP is fractional. Enemy.hurt takes float damage; shown number and co-op packet stay whole. The min-1 floor moved to combat call sites (floorHit) so slice 2 can floor per cast.
- Type immunity stays softened (x0.3 per types.js); "immunity deals 0" dropped.
- Burn/poison ticks log as DOT lines. Formulas untouched (status rework is a later branch).

## 2026-10-18 — fix/attack-calc decisions (BETA, aura/trail, slicing)
- BETA = 1.0: cooldown = 0.5 * (35 / PP). Applied in the PP-cooldown slice (slice 3).
- Aura and trail keep pulse delivery (aura one pulse per cooldown, puddle one pulse per 0.5 s); no conversion to ticks.
- Slicing: slice 2 = accuracy fold + cone (E = min(pellets, 3)) + boomerang (E = 2), because those divisors do not depend on cooldown. Orbit / trail / aura E depend on the final cooldown, so they ship with slice 3 (PP cooldowns + swap rule).
- Per-cast floor implemented as per-event floor of 1/E.

## 2026-10-18 — fix/attack-calc slice 2 APPLIED
- Per-cast normalization live: move.norm = (acc/100)*hits/E on FINAL per-event damage (Stats.applyDamage); floor = 1/E per event. E: cone min(pellets,3), boomerang 2, others 1. CANON table (pp/acc/hits) added to moves.js. Orbit/trail/aura wait for slice 3.

## 2026-10-18 — fix/attack-calc slices 3a+3b APPLIED
- cd = period = 0.5*(35/PP) (BETA 1.0) for every damaging move except orbit and trail. Status moves (dmg 0) keep hand-tuned cd. Orbit cd stays the re-hit lock; trail cd stays puddle spacing; both use `period` only for the damage budget.
- E: orbit = orbs*(speed/2pi)*period (can be < 1); trail = 2*period/0.5; aura = 1 (full pulse per cooldown). floor = 1/max(1,E).
- Swap rule (slice 3c) NOT done: setActive still caps incoming wait at 35% of cd, now exploitable with long cds (Hydro Pump 3.5 s).
- Found: Dragon Rage / Night Shade have dmg 0 and no fixed-damage path (~0.9 per hit). Needs its own item.
