# DECISIONS archive

Rotated out of DECISIONS.md on 2026-10-20, verbatim and in original order. These are history: some are superseded, and DECISIONS.md and STATE.md win on any conflict. Search by keyword.

## 2026-10-18, Opening pacing: XP boost and elite gate [Jess, applied, uncommitted, not playtested]
- Jess's read: after DMG_SCALAR 1.0 the opening is fine on damage, and weak early Pokemon are by design (the lean start stays). The problem is XP cadence (first offer at 1:07 to 1:25, 4 offers in 3:38), not HP or damage.
- Time-based spawn cap: discussed and DROPPED for now. It treats the symptom and would not raise the kill rate. Revisit only if the early swarm still feels unfair.
- 2x XP for wild kills from 0:00 until the first boss slot (3:00), flat, with a "3 Min XP boost!" banner at run start. XP_BOOST is the tuning knob. XP_SCALAR is untouched.
- Elites (the crowded-screen bump) only spawn after the first boss has spawned.
- Testing convention (Jess, 2026-10-19): balance playtests run as a NEW PLAYER, one Pokemon slot. The earlier 3-Pokemon logs hid early deaths (a faint swapped in the next Pokemon: Typhlosion fainted at 0:56 and 1:17 in the two logs); with one slot a faint ends the run, so early survival time becomes a first-class number to read. Slot unlocks and level-up scaling by slot count are a deferred item (TODO Backlog).
- Band-holder ceiling and status chasers (Jess, 2026-10-19): a spawn draw that would be a band-holder is re-drawn when band-holders are already 35% of the units alive (floor 2, up to 8 re-draws), because spawn weights alone cannot work when a single starter's move set cannot reach ranged units, so the alive pool drifts to ranged. Relative to units alive (not to the cap) so it also helps early. Healers / shielders not counted. Status class enemies are plain chasers (melee family) until they have status mechanics (they were plain shooters). Culling at the cap and pressure on idle ranged stay held.
- Spawn mix (Jess, 2026-10-19; supersedes the slice 1c ruling of 45 / 40 / 15): melee / range / support now 60 / 30 / 10, static. Reason: ranged units were killed at about a fifth of their spawn share and piled up out of melee reach. A new MIX log record (alive by family, near count, average distance) will show whether it worked. Held for now: pulling in the ranged spacing bands (dropped 2026-10-19: Jess likes where the bands sit; the ring look is handled by per-unit band jitter and a 0.3 to 0.7 s decision recheck instead), a per-tier share ramp and culling at the cap. Jess runs a one-minute feel test after each code change and does not send a log each time.
- Opening enemy HP discount (Jess, 2026-10-19): wild-enemy HP x0.55 at 0:00 fading linearly to x1.0 at 3:00, time-based (not keyed to player level), same window as the XP boost. Chosen over raising the boost or lowering the early XP costs because it also raises kill throughput, which is what let the swarm grow. Open: whether the XP boost should fade out too instead of stopping at 3:00 (the boost end, the first boss and the elite gate all land at 3:00).
- Canonical type chart (x2, x0.5, immune, no clamp): agreed in principle, ON HOLD at Jess's request. Needs before applying: immune must mean zero damage past the per-hit floors (floorHit in combat.js, Math.max(1) in Player.hurt), a rule for bosses that are immune to a whole team, and an optional "Immune" popup. Two logs show the chart change alone moves mean outgoing damage by about 0.6 to 3%, so it does not confound the scalar test.
- Next: play a normal 3-minute run, note the first-offer time and read G.Log.pacing().

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

## 2026-10-18 — fix/attack-calc slice 3c APPLIED (swap rule)
- Every slotted move recharges independently (combat.js tick); only the active group fires; a recharged inactive move fires the moment its slot becomes active. The 35% incoming cap is removed.
- After a manual swap you must hold the slot Player.SWAP_LOCK = 0.4 s; swap presses during the hold are dropped (no buffering yet). Game-made switches (learning a move) pass free = true.

## 2026-10-18, Upgrade rework slice 1 APPLIED (deletion)
- Move evolutions and the nine old stat cards are removed, plus dependents: evolution achievements (evo1, evo25, evoAll), missions (evolve, wevolve), HUD gold border, ghost-cast evolve replay, evolve progress event, Player.statsTaken. SEO export keeps `evo: null`. Spec and verification: docs/proposals/upgrade-slice1-proposal.md and upgrade-slice1-deletion.diff.
- Added two guards: level-up offers an empty list without opening a screen (no soft-lock once ladders are maxed; co-op levelStart NOT guarded, MP deferred), and Progress.ensure() drops saved missions whose definition no longer exists and tops the list back up.
- Left in place: the Lv 1-5 ladders (slice 2 replaces them), meta Upgrades menu and its Player multipliers, dormant save fields (stats.evolutions, evoMoves).


- 2026-10-18 (Jess), slice 2 proposal answers (docs/proposals/upgrade-slice2-proposal.md): slices 2a/2b/2c applied ONE AT A TIME; rate mechanics are period / (1 + sum) (never reach zero); draft family weights accepted, tuned later; fan-spread cap min(spread x n, 2 pi x (n-1)/n) ships with 2b; New Move cards stay active-Pokemon-only for 2b; HUD "+N" stack badge replaces the level dots until the pause/inspect screen; co-op ghosts replay base moves until MP is un-parked. Vitamin names (HP Up, Protein, Iron, Calcium, Zinc, Carbos) remain placeholders (decision 8 not answered). Next: slice 2a diff, awaiting approval before apply.

## 2026-10-18, Upgrade rework slice 2a APPLIED (data layer)
- Approved by Jess ("apply"). New js/data/kinds.js (15 kinds: engine-read stat keys, card nouns, payload) and js/data/mechanics.js (14 mechanics, modes add/inc/rate, eligibility from the move's own fields + kind keys). moves.js: instances carry mods, plus derive/addStack/stackTotal. dev.html and main.js NEED list updated. Nothing calls addStack yet, so no gameplay change. Ladders stay live until 2b; a laddered move (lvl > 1) refuses addStack.
- Verified offline (docs/proposals/upgrade-slice2a-harness.js, re-run with `NEW=. node docs/proposals/upgrade-slice2a-harness.js .`): eligibility and card text equal the catalogue export for all 64 moves; one stack changes exactly one field by its step; 564 ineligible pairs refused; 50-stack stress finite and order independent; arc clamped; 54 (kind,key) pairs backed by combat.js source text (text match only, not behavioral).

## 2026-10-18, Upgrade rework slice 2b APPLIED (mechanic cards live)
- Approved by Jess ("apply"). Ladders, lvl, maxLvl, levelUp, nextUpText deleted from moves.js. G.LevelUp.offer(pl, n, roster) draws by FAMILY (FAMILY_W: new move 10, DPS 14, Coverage 10, Utility 6), only cards with a legal target on the team. RunUI runs card -> Pokemon -> move with auto-advance (0.7 s flash), Back/Backspace, keyboard (team swap keys for Pokemon, 1-4 for moves). HUD shows +N stacks. Fan cap in fireProjectiles: min(spread x n, 2 pi (n-1)/n). Co-op wire shape unchanged (stack total in the old level slot); remote ghosts replay base moves. Dev helpers: G.Debug.give(id), G.Debug.stack(mechId, n, moveId); G.Game.debugLevelUp() already existed.
- Verified: both offline harnesses pass on the real files; headless Chromium run of the real screens, no errors (card/Pokemon/move flow, auto-advance chain, keyboard, Back, arc ceiling, 121-count ring, new-move flow). Not tested: co-op, touch, built index.html.

## 2026-10-18, Upgrade rework slice 2c APPLIED (stat cards + scoped cards)
- Workflow change (Jess, same day): prose plan in chat, Jess says OK or edits, Claude builds + tests + writes into the repo in one step, no full diffs or separate apply step. Risky changes are flagged in the plan prose and proceed unless Jess denies or edits. Jess approved the 2c plan with "ok".
- Six stat cards, per Pokemon, percentage only, +5% each (placeholder names): HP Up (HP), Protein (Atk), Iron (Def), Calcium (Sp.Atk), Zinc (Sp.Def), Carbos (Speed). Stored as Player.inc = {hp, atk, def, spa, spd, spe}. Flow: card, then Pokemon (no move step). Fainted Pokemon are eligible; HP Up raises their max HP but does not revive.
- Seams: HP = round(hpForLevel x (1 + inc.hp)) + perksHp (gainXp, syncLevel, addStat; HP Up tops current HP up by the gain). Protein/Calcium multiply the attacker factor by (1 + inc) by move category in moveFactor; status moves unaffected. Iron/Zinc are a defMul on the FINAL Def/SpD stat inside applyPlayerDefense (new optional 6th argument), NOT on the base stat: a +5% on the base is lost to the level-1 floor in statValue (found by the harness). Carbos multiplies the spd getter.
- Draw: new family "Stats" (weight 8) holding the six cards. Protein/Calcium are offered only if some Pokemon has a move of that category and are weighted by the best share of the team's damaging moves in that category, floored at 0.25.
- Scoped cards: 18 type + 14 damage-kind mechanics (ids t:<type>, k:<kind>), mode inc, +15%, same key as Increased Effect so they sum. Registered in G.Mechanics.SCOPED / BY_ID, kept OUT of ALL. The draw adds ONE random scope per offer to the DPS family, so 32 scopes cannot flood it. Move-specific (card, Pokemon, move). Buff moves and zero-power moves are not eligible.
- Display: run-end summary lists each Pokemon's stat cards. Bond screen and pause/inspect screen not done.
- Verified: docs/proposals/upgrade-slice2c-harness.js passes (legality for 64 moves x 32 scopes, stacking sums, Player seams, defense never reaches 0, draw); headless Chromium run of the real screens (mouse and keyboard, Backspace, fainted target, scoped 3-step flow, 300 real offers, run-end row) with no page errors. Not tested: co-op, touch.

## 2026-10-18, Slice 2d-1 APPLIED (team summary sheet: pause screen + end-of-run team view)
- Jess's reference: a Pokemon Summary screen (strip of 6 portraits on top, name/level/types header, stats hexagon, held item) in our own visual style. Pause buttons (Continue / Settings / Quit run) take the place of the reference's bottom buttons; a block of the Pokemon's moves (scrollable, because bonding can stack many) replaces the big sprite; the sprite goes beside the name. Split of the work: 2d-1 = the sheet (this entry), 2d-2 = choose mode inside the level-up screen. Jess approved the plan and the split ("yep that split works. lets do slice 2d-1").
- One component, G.Sheet (js/ui/sheet.js), rendered into #pause-sheet (scr-pause) and #team-sheet (new scr-team, opened by the Team summary button on the end-of-run screen; the results card dropped its Moves and stat-card rows because the sheet covers every Pokemon).
- Hexagon (G.StatChart.make opts.bonus / hpText / layered): species base stat as the white lower layer, 60% yellow layer on top = base x (1 + stat-card %), yellow "+X%" beside each number; the yellow layer is skipped while every bonus is 0; values past the outer edge clamp to it (numbers stay true). HP shows real current/max like the reference. Scale is species base-stat terms, not level-scaled (Jess: ok for now, revisit when optimized builds push past the hexagon).
- Move rows: stacks list ("Pierce +2 · Fire Damage +1"), raw current numbers per kind key (Power, recharge, count, pierce, area, ...), and "Hits for about N": one hit through the real damage halves (pl.moveFactor + G.Stats.applyDamage) against a median-Def/SpD enemy at the Pokemon's level, STAB included, no type matchup, no crit. Per-hit chosen over a DPS line (orbit/aura/trail hit on ticks). Jess did not answer the Power-only vs per-hit question explicitly; built the recommended per-hit option.
- The pause screen carries no sound sliders or other settings (Jess, same day); the Settings button opens the existing Settings page over it (Sound tab) and closing returns to the pause sheet.
- Sheet size (Jess, same day): header sprite is 96 px (hero scaling, so giants shrink to fit) filling the header bar; the sheet is content-height (about 740 px at most, was a fixed 900) with a 430 px content area that reserves room for the held item; the hexagon scales down on short screens (30vh) so nothing clips at 1280x720.
- Keys: solo pause only (state 'paused') and the end-of-run team view: swap keys and Left/Right switch Pokemon, Up/Down scroll the moves. In a group game the sheet is click/touch only because the swap keys act in the live game.
- Spanish: only the strings on the screens touched were rewritten as English in source (pause, buttons, run-end results card). lang-en.js entries were NOT removed (chunk matching could alter other texts). Full sweep is a separate slice.
- Verified: headless Chromium run on the real game (open/close pause, strip clicks, swap keys, Left/Right wrap, fainted target, bonded group, buff move lines, Continue, group-style pause, run-end results -> team -> back, narrow viewport overflow) with no errors; sheet damage line equals applyDamage computed directly. Not tested: touch devices, co-op play.

## 2026-10-18, Slice 2d-2 APPLIED (level-up choose mode through the team summary)
- Mechanic, scoped and stat cards open the sheet (scr-choose, title "Apply <card>") instead of the old Pokemon and move steps. New Move cards stay single-step.
- Active Pokemon preselected if eligible, else the first eligible; first eligible move preselected. Ineligible Pokemon are dimmed but viewable; Confirm is disabled and the reason shows.
- Preview: selected move shows before -> after for the stat and one-hit damage; stat cards show a dashed outline on the hexagon and "+10% to +15%" labels.
- Controls: click select, Confirm / double-click / Enter, digits 1-4 pick and confirm a move, swap keys and Left/Right switch Pokemon, Backspace = Back to cards (same offer, no reroll spent). Reroll only on the card step. Auto-advance removed.
- Level-up screen strings translated to English; lang-en.js entries left in place on purpose. Co-op: after confirming, the cards screen returns in its done/waiting state.
