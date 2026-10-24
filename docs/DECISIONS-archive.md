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

---

## 2026-10-22 Gym roster data model (slice A) and the first sim/present step
- A gym signature is a roster SLOT = an evolution LINE: a stage ladder of dex numbers with the level each stage appears at (G.Gyms.stageFor), default bands 20 and 35 (placeholder). Stage follows the effective level (locked gym level plus the escalation bump), read at entry. Moves, stance, power and tempo are per slot, one set for every stage (Jess ok; per-stage overrides can be added later without breaking data).
- G.Gyms.lineup(entry, loop, level) is the one place "loop N fields the first N" lives (pure, clamps N to 1..roster size). G.Gym.loop is a dev-set accessor (G.Gym.debugLoop, cleared by reset) until the real loop counter exists. G.Gym.roster(g) joins them. The game still fields slot 1 only: the all-at-once arena flow is slice B.
- Brock's six slots are authored (Geodude line, Rhyhorn line, Omanyte line, Kabuto line, Onix to Steelix, Aerodactyl); slots 2 to 6 carry PROVISIONAL move sets (TUNE, no stacks). The default single-mon path is guarded by a regression test (Geodude, Lv 12, HP 1029).
- Validation got stricter (Jess ok): every move kind must be in G.Gyms.BOSS_FORMS (melee, projectile, buff), because Enemy.gymCast only builds those and silently sends every other kind down the projectile path. Also 1 to 4 moves, at least one damaging, unknown fields rejected, ladders checked.
- Sim/present: new js/core/simbus.js (G.SimBus) and js/ui/gym-present.js. systems/gym.js emits 'gym:escalate', 'gym:badge', 'gym:calm' (plain data) and no longer calls Spawner or Audio. Named SimBus because G.Events is the mid-game events system. Details and the remaining offender list: docs/SIM-PRESENT-BOUNDARY.md.
- Roster rulings recorded in docs/GYM-ROSTERS.md the same day: no legendary gym mons (Mewtwo considered and rejected), the Elite Four may reuse gym species and use non-Gen-1 species that pass the canon test, Alolan forms are IN (need dex support, see TODO), Lance's second Dratini-line slot is a pinned stage.
## 2026-10-21, Item rework F3d-3 built: the Shop (feature/items) [Jess decided]
- The Gacha screen is now the SHOP (menu entry "Shop"). Tabs along the top: Pokemon | Team Items | Team Upgrades. The Pokemon tab is the old gacha untouched, with the region (generation) picker moved to a vertical column down the left (widens the shop; below 820 px it is a horizontal scroll again).
- TEAM ITEMS tab: every team item you have NOT unlocked, 100,000 PokeCoins each (flat, Jess will tweak; the Stones are separate listings). Buying unlocks it for good (equip it in Inventory). Owned items are hidden. An in-game confirm dialog guards each purchase (see CONFIRM DIALOG below).
- TEAM UPGRADES tab: team item slots 2, 3, 4 at 9,000 / 23,000 / 60,000 PokeCoins (starting values), bought IN ORDER, saved as save.runSlots. Prices are constants in js/data/items.js (TEAM_ITEM_PRICE, SLOT_PRICES). Logic: G.Items.buyTeamItem / buySlot (harness docs/proposals/items-f3d3-harness.js). Debug: G.Debug.coins(n).
- CONFIRM DIALOG (Jess 2026-10-21): purchases use an IN-GAME dialog, not the browser confirm(): `G.UI.ask(message, { title, ok, cancel, note })` -> Promise<boolean> (dev.html #scr-ask, opens on top of any screen, Enter = confirm, Esc = cancel and the game does not also read that key). Other screens still use the native confirm() (Team discard, logout, delete account, mod tools); convert them with G.UI.ask when wanted.
- NOT DONE: berry bag slots (G.Grounds.berrySlots) are not in Team Upgrades yet; touch layout of the bottom-right team item column still unchecked.

## 2026-10-21, Item rework F3d-2 built: unlocked team items, loadout, Inventory window; Pokemon menu entry removed (feature/items) [Jess decided]
- SAVE: `save.teamItems` { id: { at, from } } = unlocked team items; `save.teamLoadout` [ids] = equipped at run start, in slot order. Old saves get both from migrate (newSave grants the starters, the migrate fill copies them). `G.Items.cleanLoadout` keeps the loadout valid (unlocked only, no duplicates, one per group, within `runSlots`); db.js sanitize calls it.
- STARTERS: every account (new and existing) starts with Lucky Egg AND Amulet Coin unlocked (Jess OK'd the default).
- UNLOCK: picking up a team item (gym leader or boss drop) unlocks it for good, even if you then choose Leave it. Toast "Team item unlocked: X". `G.Debug.item/runitem` go through the same pickup path, so they unlock too. Debug: `G.Debug.unlockitem(id|'all')`, `G.Debug.loadout(ids...)`.
- RUN START: startRun equips `cleanLoadout(save)` through equipRun after the roster is built, so a full loadout means in-run finds open the chooser.
- INVENTORY WINDOW (main menu item "Inventory", scr-inventory): left = unlocked slots only (slot 1 on top), middle = unlocked items grid (no filters), right = detail column with Equip / Unequip / Replace (a second Stone replaces the first). Click a slot to target it; double-click an item to equip or unequip. Changes SAVE IMMEDIATELY (no commit step). Locked items are not shown, only "N of 25 unlocked".
- MENU: the separate "Pokémon" entry is REMOVED (playtester: redundant with Team). Team's subtext is now `N/X - Y shiny`. The scr-dex code is left in place, unreachable from the menu.
- UX FIX (Jess 2026-10-21): the two highlights are DECOUPLED. Inventory: a slot click only moves the target slot, the selected item stays, and the button always names the highlighted slot (Equip to / Move to / Unequip from Slot N, plus a note when it replaces something or removes a same-group Stone). `teamLoadout` is therefore BY SLOT (null = empty, holes kept; cleanLoadout trims trailing empties; run start skips nulls). Team screen: a slot click targets the slot but keeps the previewed Pokemon (Put in Slot N re-labels); double-click a slot to inspect its Pokemon; with nothing previewed a filled slot still shows its own Pokemon.
- MENU ICONS (Jess 2026-10-21): all from the PokeSprite atlas ('ps:'): Play = ball.poke, Team = key-item.adventure-guide, Inventory = key-item.explorer-kit, Upgrades = valuable-item.pearl-string, Gacha = ball.master, Friends = key-item.vs-recorder, Settings = hm.normal (HM01), Missions = key-item.point-card, Ranking = key-item.contest-pass. tools/gen_pokesprite_index.py CATS now also includes key-item, valuable-item and hm (the atlas already had them; the generated index was filtering them out). Re-run `python tools/gen_pokesprite_index.py` after changing CATS.
- NOT DONE: co-op does not sync loadouts (deferred with the rest of MP). db.js `merge` does not union `teamItems` across devices (cloud phase, add it to the 'earned is never lost' list then). Slot unlocks (2 to 4) and the Shop tab are F3d-3.

## 2026-10-21, Item rework F3d plan + F3d-1 built (feature/items) [Jess decided]
- TERMINOLOGY (Jess 2026-10-21): player-facing name for run items is TEAM ITEMS (label change only; code ids and tier 'run' stay). Team sheet item area now has mini tabs: Berry | Held Item | Team Items (no more scrolling).
- RUN-ITEM HUD: a 1-wide column, bottom-right, mirroring the team column. ONLY unlocked slots are drawn (default 1, up to 4; `G.Items.runSlots(save)`). Slot 1 is the bottom box and each unlocked slot stacks above it. Empty unlocked slot = dim dashed box. Debug: `G.Debug.runslots(n)` (saved).
- CHOOSER (run and Pokemon tier, same layout, revised after the first look): two rows of WIDE cards with descriptions, like the level-up cards. Row 1 = the NEW item (chip "New", right side, no text shadow). Row 2 = what you hold (chip "Slot N" for run items, "Held" for the Pokemon item). The HIGHLIGHTED card is your pick. One thing to replace (a lone held item, or a Stone lock): the held card starts highlighted (= keep it), click New to take it instead, then Confirm. Several run slots: nothing is highlighted, click the slot to replace, then Confirm. Leave it always declines. Keys: 1 to 4 pick a card (single: 1 = held, 2 = new), Enter confirms.
- STONE RULE (my reading, Jess's message ended at "Stone Rule", confirm): a Stone found while holding a Stone always opens the chooser, even with a free slot, and can ONLY replace the held Stone (other slots dimmed).
- FOLLOW-UP SLICES: F3d-2 = save field for unlocked run items, permanent unlock when a boss-dropped item is brought into a run, pre-run loadout equipped at run start, new menu option opening a smaller Pokedex-style window (unlocked slots on the side, unlocked items in a grid, description column on the right). Loadout items fill slots at run start, so in-run finds then use the chooser. F3d-3 = rename the Gacha tab to Shop, add a run-items tab (about 100k gold each, a bad-luck valve), slot upgrades to 4 (cost/source still OPEN).

## 2026-10-20, Status Slice E2b, E2d, E2e and close of slice E [Jess decided, branch feature/sliceE]
- SLICE E IS CLOSED (E1, E2a, E2b, E2d, E2e built; the E2c status-projectile visuals were PARKED by Jess, nothing changes for them). Offline harnesses pass; NOT run in a browser.
- SELF-CAST STAT EFFECTS (E2b): a move may carry `self: { stat, n }`, rolled on hit by G.Stages.procSelf with the move's statChance, one roll per move per 0.5 s, each application 6 s. A RAISE is team-wide (Metal Claw +1 Atk 10%, Meteor Mash +1 Atk 20%: each success adds a team application, so chance moves stack toward the +6 clamp). A DROP is per Pokemon (Leaf Storm -2 Sp. Atk, 100%): ONE application per move, renewed while it keeps hitting, so it holds at exactly -2 (an orbit hits every 0.26 s and would otherwise stack -6 in 1.5 s). My call, not Jess's: the 100% drop is single and renewed, chance moves stack.
- BENCH (E2b): game.js calls Player.benchUpdate for every standing non-active member each frame: G.Status.tick and G.Stages.tick (statuses, DoT, own drops). Skill cooldown is the only thing that does not tick. DoT can faint a benched Pokemon; that is SILENT on screen (Player.hurt skips the camera kick, sound, numbers and burst while `benched`, so nothing happens at its stale position) and game.js shows a RED toast ("<name> fainted on the bench!", G.UI.toast tone 'bad'). Regen and Bell heal still only run on the active member.
- FAINT AND REVIVE (E2b): fainting and revive() both call Player.clearEffects (G.Status.clear + G.Stages.clear): every status, DoT and own drop. The badge full revive (reviveTeam) also clears the living. The shared TEAM raises stay (they belong to the team, not to the Pokemon). A revive sets HP to maxHp * frac (the badge passes 1 = 100%; co-op revive keeps its 0.5 default).
- FREEZE AND SLEEP DROP THE PLAYER'S ORBS AND PULSES (E2d; Jess: 'freeze drops all orbs and status'): while G.Status.stunned(pl) the active orbit move clears its orbs every frame (they would otherwise keep hitting and rolling ailments) and orbit() respawns them the frame the stun ends. Interpretation of 'status': the damage-and-ailment tickers the player leaves behind, so trail patches (kind 'patch') stop pulsing and turrets stop firing while the owner is stunned (their life still runs out). Mines and meteors already placed are one-shots and still go off. If Jess meant something narrower, it is one line each in combat.js (tickMove orbit branch, updateFields turret and patch branches).
- AUTO-SHAKE (E2e): setting `autoShake` (default off, Settings > Controls > Accessibility). G.Status.autoShake(h, dt) taps Shake off at SHAKE.auto = 3 taps per second while anything is shakeable (a person can tap up to 12/s); each tap has the normal effect. The HUD prompt reads 'SHAKING OFF...' instead of 'TAP H' while it is on. Frame-rate independent (tested at 30, 60 and 144 fps).
- NOT DONE ON PURPOSE: cures (item rework), co-op hz hook (cloud phase), status projectile visuals (parked; the image-backed Ember orb in vfx.js is a one-line tryout, see DEVLOG), per-Pokemon vs per-move upgrade cards (open, measure DPS vs enemy HP at minutes 10, 20, 30 first).
- BALANCE NOTE: stages are WHOLE numbers only (the stage is the sum of live whole-number applications, no fractional stages). Simulated hour of nonstop hits: Metal Claw (10% per 0.5 s) sits at team Attack +0 about 52% of the time, +1 37%, +2 10%, +3 2%, never above +4 (time average +0.6); Meteor Mash (20%, rolled every 1.4 s because its cooldown is 1.4 s and both meteors count as one roll) +0 39%, +1 41%, +2 16%, +3 4%, highest +5 (average +0.9). The +6 clamp is a ceiling that is practically never reached. Levers if they feel weak: roll chance, stage per success, the 6 s duration. Leaf Storm's -2 Sp. Atk is x0.5 on its own damage while it hits. Watch both in play.

## 2026-10-20, Status Slice E2a: team stage buffs [Jess decided, branch feature/sliceE]
- Slice E2 plan (Jess 2026-10-20): E2a = the player's buff moves become stages (this entry, BUILT). E2b = self-cast stat effects (Leaf Storm, Metal Claw, Meteor Mash) plus benched statuses ticking and faint / revive handling. E2c = orbit and hazard freeze gaps. E2d = accessibility auto-shake (rate still open: about 3 taps/s reads as an aid, about 8 as a free skip). Cures belong to the item rework. The co-op `hz` hook stays deferred.
- SCOPE OF A STAGE: every + stage effect (anything that raises a stat, from a buff move or a self-cast bonus) is TEAM-WIDE. Every - stage effect (enemy-cast or self-cast) is PER POKEMON, on the one that took it (G.Stages on pl, as the E1 slow). The stage of a stat on the player = team raises + own drops, clamped to +-6.
- STORE: one shared object `stgTeam` on every roster member (set in game.js, never reassigned), ticked once per frame by the active member's update (the benched do not update, same as the old shared buffs). Entries { n, t, dur, src } per stat; Aqua Ring's regen lives in the same store under `regen` (n = HP/s per application).
- STAGE LADDERS (Jess 2026-10-20, supersedes the D1 'Speed -6 = x0.25' ruling): each stat has ONE base number B in G.Stages.BASE. A raise of s stages multiplies by (B + s) / B, a drop by B / (B + |s|), the same ladder for raises and drops, on every host (player, wild, elite, boss, gym leader). Attack, Defense, Sp. Atk and Sp. Def start at the mainline B = 2 (+2 x2, +6 x4, -2 x0.5, -6 x0.25). SPEED starts at B = 4: -6 x0.40, -5 x0.44, -4 x0.50, -3 x0.57, -2 x0.67, -1 x0.80, +1 x1.25, +2 x1.50, +3 x1.75, +4 x2.00, +5 x2.25, +6 x2.50 (Jess found +2 Speed at x2 let nothing catch him; he starts Agility at B = 4 and tunes by feel; reaching x2.0 movement takes +4). Consequences: enemy Slow at -2 is x0.67, the -6 crowd pin (Mud Shot, Bulldoze) is x0.40, enemy Haste at +2 is x1.5. Each stat's B is tuned separately as he feels it in testing. DASH DISTANCE (planned dash, not built): Agility scales it on the MAINLINE ladder, B = 2 (+1 x1.5, +2 x2, +6 x4, -1 x0.67, -2 x0.5, -6 x0.25).
- NO EXPLICIT CAP: duration / cooldown is the cap. Every cast is its own application on its own timer. At BASE every buff move has cooldown = duration = 8 s, so exactly one application is live and the stage equals what one cast gives: Swords Dance +2 Attack, Agility +2 Speed, Harden +1 Defense, Dragon Dance +1 Attack and +1 Speed each. Recharge (period / (1 + 0.15 n)) and Duration (x (1 + 0.15 n)) each multiply duration / cooldown, so the sustained stage is about per-cast x (1 + 0.15 r) x (1 + 0.15 d), flickering between the floor and ceiling when the ratio is not whole. The +-6 clamp is the only hard limit (Attack +6 = x4, Speed +6 = x2.5 on its B = 4 ladder). Safety only: 8 live applications per move.
- RETIRED for stage buffs (move field fixed): the Buff Stacks card and Increased Effect (no more flat potency). Aqua Ring keeps Increased Effect (its regen per application, 1.6 HP/s base) but not Buff Stacks. Duration and Recharge stay for all five.
- GRACE: an application stays 0.1 s past its end, and a recast of the same move inside that last 0.1 s renews it instead of stacking, so cooldown = duration holds the stage with no one-frame dip or double.
- WHERE IT IS READ: Attack stage multiplies the attacker factor of PHYSICAL moves only, Sp. Atk stage special moves only, status moves neither (Sp. Atk raisers wait for the move import); Speed stage multiplies final movement speed (no species bounds, as for enemies); Defense / Sp. Defense stage multiplies the player's Def / SpD in the enemy hit ratio (Iron / Zinc multiply with it). The old flat buff reads (atk x, spd x, flat reduction) are deleted.
- BROCK: Harden is the player's stage version now (Jess: the earlier 'leave Brock' ruling waited on this). His authoring is Duration x2 only (Buff Stacks no longer exists for the move): +1 Defense per cast, 10.4 s each, no stage cap below the +-6 clamp. A leader's recovery after a buff cast stays 0.85 s (the move's 8 s cooldown is the player's recast timer; leaders pick moves by weight). Tune by feel if his Harden climbs too far.
- Only the ACTIVE slot group casts (combat.js), so a buff must be selected or bonded to be recast; a benched Pokemon's moves do not tick. A swapped-in buffer casts at once if ready.
- RULINGS FOR E2b (decided here, BUILT in the E2b entry above): everything per-Pokemon (statuses, stages, DoT, drops) KEEPS TICKING on the bench; the only thing that does not tick is skill cooldown. A benched Pokemon can die to poison or burn. A revive (badge full revive, and fainting itself) clears all statuses and effects and sets HP to 100%. A benched death shows a red toast. Self-cast drops (Leaf Storm) are per Pokemon; Metal Claw and Meteor Mash raises are team-wide.
- Balance warning for the feel test: mainline stage numbers are much stronger than the old flat buffs (Swords Dance +2 = x2.0 physical damage for the team at about 100% uptime; the old maximum was +65%). Jess's first test: Agility at +2 / x2.0 movement was 'nuts' (nothing could catch him), hence the Speed ladder above. Jess wants the game harder and build-defining, so it ships as is. Knobs: stage ladders (stages.js BASE, one B per stat), per-move cd / dur / stageN (moves.js, tabled in docs/BUFF-TABLE.md).
- Offline: docs/proposals/status-sliceE2a-harness.js (real Combat.tick casts, both frame orders, jittery frames). Harnesses 2b (buff moves skipped, covered by E2a) and gym (Brock's Harden) updated. upgrade-slice2a-harness.js already crashed before this slice (stale stub, no TYPE_COLOR). NOT run in a browser.

## 2026-10-20, Status Slice E1: statuses on the player [Jess decided, branch feature/sliceE]
- Slice E is split: E1 = enemy-inflicted statuses on the player (this entry); E2 = everything else (player buff moves to stages, self-targeting stat moves, cures, accessibility auto-shake, orbit/hazard freeze gaps, co-op hz hook).
- STATUS CLASS = one status per species, hand-authored by Jess in the Status Roster artifact (63 species: 47 primary + 16 secondary): paralysis 15, slow 11, poison 10, haste 8, confusion 7, sleep 5, daze 4, trap 2, freeze 1. Table = G.Enemies.CARRIER_OF (data/enemies.js).
- Primary carrier: only 2 are ACTIVE at a time (like flankers; haste exempt). Active = behavior 'carrier': holds the close, dodgeable band (BANDS.carrier 0.30/0.40) and fires a status shot every 3.2 s (damage x0.5); inactive ones stay plain chasers. Secondary carrier: keeps its class; its shots and touches carry the status at HALF the duration, at most one per 4 s.
- Sleep species cast drowsy or sleep by weight 2:1 (drowsy:sleep). A sleep shot puts you to sleep with chance 0.6 (stand-in for the move accuracy); DROWSY (zzz marker, 8 s) multiplies every sleep-effect chance by 1.5, capped at 100%.
- New statuses: DAZE = movement heading jitters up to +-35 degrees, re-rolled every 0.2 to 0.4 s and eased, 6 s, no fizzle. SLOW = Speed -1 stage for 6 s (G.Stages on the player; carriers stop at -2). HASTE = a nova (170 px, every 5 s) that gives allies Speed +1 for 6 s, stacking to 2; the caster is excluded, bosses and gym leaders skipped.
- TRAP on the player = no damage, no slow: manual team swaps are locked for 8 s (faint auto-swap still works). Enemies cannot be trapped any more (apply returns 'none').
- FIRE SPIN reworked: strips every beneficial stat stage from the target and burns it for half the normal length (2 turns). Fire types are immune to the burn, not to the strip. Move fields strip, burnHalf.
- HARD CC ON THE PLAYER: every timer is FULL (no 25% cut; bosses, elites and gym leaders keep the 25% cut and 10 s window). After a hard CC (sleep, freeze, paralysis) ends there is a 2.5 s grace with no new hard CC (assumption, TUNE). Major statuses still compete (one at a time).
- SHAKE OFF: each tap takes 0.25 s off the most restrictive mashable status, floor 0.5 s remaining, at most 12 taps per second. Mashable: sleep, freeze, paralysis, confusion, trap, daze. Not mashable: burn, poison, toxic, drowsy, slow, stat drops. Time left falls at 1 + 0.25 x taps/s: paralysis 10 s -> 3.6 s at 8 taps/s, 2.9 s at 12; sleep 4 s -> 1.6 / 1.4; freeze 2 s -> 1.0 / 0.9.
- HUD: statuses sit in the lower-left stack with the buffs (red border, timer bar); a pulsing "TAP H TO SHAKE OFF" chip (tappable on touch) shows while a tap can help. Ring under the feet and a floating zzz while drowsy or asleep.
- CONTROLS: COMPACT default = WASD move, 1-6 team slot, Z / C previous / next team, I J K L skills, H shake off. FULL KEYBOARD preset = WASD, 1-6, Z / C, NUM1-4 skills, NUM+ shake off. Space is reserved for the planned dash (unbound). Settings > Controls has both preset buttons, a conflict warning and Reset (= compact). A saved key set made before E1 keeps its keys; shake_off takes its default only if no saved action uses it, so press "Reset keys" once.
- Offline: docs/proposals/status-sliceE1-harness.js. Harnesses A, B, C, 2c updated for the new trap, Fire Spin and player rules. NOT run in a browser.

## 2026-10-20, Status Slice D CLOSED: D4 dropped / parked [Jess decided, branch feature/status-sliceD]
- Crit stage (move-based crit tiers 12.5% / 50% / 100%) is DROPPED. Jess: the Critical Hit upgrade cards are already a very good card for runs; move-based tiers would devalue the card or stack into guaranteed-crit builds. Mainline crit stages exist because the games have no cards. The crit rules stay as they are (no base chance, +3% per card level, x1.5).
- Multi-hit (rolled pellet count 2 to 5, total = 3.1 x per-hit power, Count card refused via the `fixed` field) is PARKED for the bulk PokeAPI move import: only Bonemerang has a hit count today (the boomerang already hits twice), and the moves it is for (Double Slap, Fury Attack, Pin Missile, Bullet Seed, Rock Blast) arrive with the import. Open questions kept for then: each pellet rolls its own flinch / ailment / stat-drop chance (strong status appliers).
- Slice D = D1 stat stages, D2 flinch, D3 drain. Jess ran browser tests on all of it 2026-10-20. Next in the status roadmap: slice E (status and stages on the player).

## 2026-10-20, Item rework: three-tier model (feature/items) [Jess decided in the design talk; build NOT started]
- Supersedes the earlier "one held item per run" model and the same-day consumable-slot idea. Three tiers, split by where the item lives and how it reaches the player.
- GROUND ITEMS: activate automatically on contact (like today's heal berry pickup). Mostly heal berries and battle items from PokeAPI. Never stored, no inventory.
- POKEMON ITEMS: each Pokemon holds ONE. Passive (Choice Band, Choice Scarf, Eviolite, Expert Belt, Iron Ball and so on) or triggered, and a triggered item may be consumable (used up, slot empties) or not.
- INVENTORY ITEMS (run items): very rare, custom items that change a whole run. Sources: rare boss drops, or meta progression and the gacha. Held in a 2x2 grid (4 slots total). The full game starts at ONE slot and meta progression unlocks more.
- Run item examples (Jess): a Stone per type (Lightning Stone: Electric attacks ignore resistance to Electric); Sharp Scissors (movement speed rises the less total team HP is left); Round Glasses (crit chance can exceed 100%; a crit on a move whose chance is over 100% re-casts it 0.2 s later for free with the chance reduced by 100 points, so 150% becomes a 50% repeat).
- Data note (checked in pokeapi-master): 175 items are flagged holdable and 141 holdable-active; the holdable-passive flag has ZERO rows, so passive versus triggered must come from our own rules table (like move_kind_rules), not from PokeAPI. Category ids give the families (berries, held-items, type-enhancement, plates, choice, stat-boosts, status-cures, healing).
- OPEN (asked of Jess): exact reading of Round Glasses' repeat chain; Stone behaviour against immunity (not only resistance) and its dependence on the still-softened type chart; Sharp Scissors curve and cap; how a Pokemon item reaches a holder (active Pokemon default?); whether held effects run while benched; where Lucky Egg and Amulet Coin land; drop table per source; whether gacha-owned run items are equipped before a run or only found in-run; pickup behaviour when a Pokemon already holds something.

- RULINGS 2026-10-20 (later, Jess answered the open questions): (1) a found Pokemon item goes to the ACTIVE Pokemon; reassignment happens on the team sheet; a swap prompt appears if the holder already carries one. (2) Held effects work ONLY while the holder is the active Pokemon (no benched effects). (3) Lucky Egg and Amulet Coin move to the INVENTORY tier (very rare); a new account may get one or the other for free at start. (4) Drop tiers agreed: ground items from common drops and chests; Pokemon items from chests, elites (the 50% roll) and the gym guaranteed item; run items from a rare gym or boss chance plus the gacha. (5) Gacha run items are managed on an Inventory screen (pre-run loadout), a LATER slice, not part of the framework slice.
- STILL OPEN: Stone vs immunity and the chart dependency, Sharp Scissors curve and cap, Round Glasses repeat-chain reading, TypeScript check experiment (offered, not answered).

- RULINGS 2026-10-20 (evening, Jess closed the remaining opens): (1) Stat items use a SEPARATE multiplier (today's port stays identical), not the additive increase pool. (2) Placeholder gym-leader chance of a run item instead of the Pokemon item is OK (start at 10%). (3) tsconfig with checkJs plus a tsc --noEmit check is OK (config change, goes in the F1 plan). (4) Stones ignore resistance AND immunity for their type. (5) Sharp Scissors: movement speed multiplier scales linearly from 1.0x at 100% team HP to 2.0x at 1% team HP, applied LAST in the speed chain. (6) Round Glasses: keep the earlier reading (crit chance may exceed 100%; a crit on a move over 100% re-casts it 0.2 s later for free with the chance reduced by 100 points). All F1 questions are now closed.

## 2026-10-20 (night), Item rework F1 built (feature/items)
- Roster members are separate Player objects, so a Pokemon item's on()/off() only touches the holder, and `hasItem()` returns false for a benched holder (held effects only on the field). Per-holder state (Focus Sash timer, Shell Bell charge) needed no new storage.
- Run tier: ONE id array shared by every roster member (`pl.runItems`), on()/off() applied to every member by `equipRun` in game.js. Slots: `G.Items.runSlots(save)` (save.runSlots, default 1, cap 4; absent in old saves). A full grid prompts against the LAST item added (placeholder until the Inventory screen).
- Drops: chests and elite roll stay Pokemon items; boss always drops an item with a 5% run chance, gym leader now drops one guaranteed item with a 10% run chance (`G.Items.RUN_CHANCE`, placeholder). Lucky Egg and Amulet Coin no longer drop from chests.
- Item text is now English (names, descs, toasts, scr-item screen). The old Spanish keys stay in lang-en.js, unused.
- Stones, Sharp Scissors, Round Glasses are NOT built (content slice). tsconfig.json (checkJs, noEmit) added with only js/data/items.js in scope; run `tsc -p tsconfig.json`.

- 2026-10-20 (night), F2 rulings: held items move on the pause team sheet only (not the end-of-run summary or level-up choose mode); recipient can be any teammate incl. benched or fainted; the Focus Sash cooldown (sashT) travels with the item (Jess agreed). Toasts: "<Pokemon> got <Item>!" and "Picked up <Item>!".

## 2026-10-20 (night), Item rework F3a-1: ground items
- Scope (Jess): ground tier = X stat items + medicine berries + the berry families below. No cures, revives, Rare Candy or vitamins. Status berries (Cheri, Chesto, Pecha, Rawst, Aspear, Persim, Lum) go in a LATER slice as a berry slot that auto-consumes to negate the status.
- Effects: X Attack/Defense/Sp. Atk/Sp. Def/Speed +1 stage 30 s team-wide; Oran 30%, Sitrus 50% (immediate); type-guard berries (18 types, Chilan = Normal) halve super-effective hits of their type for a flat 10 s (Chilan: every Normal hit); Liechi/Ganlon/Salac/Petaya/Apicot +1 stage 10 s; Starf +2 on one random stat 10 s; Lansat +20% crit 10 s; Kee/Maranga +10% Def/Sp. Def 10 s (stat-card pool); Pinap/Silver/Golden +1/+5/+10 points on the ground drop chance for 60 s. Micle and Custap skipped (no matching mechanic), X Accuracy / Guard Spec / Dire Hit / Max Mushrooms skipped.
- Stacking: the same item renews its timer, different items stack (X Attack + Liechi = +2). All of it lives in the shared team store, so it ticks while benched.
- Drops: wild kill 1% extra roll (+ Pinap bonus), small chest guaranteed Sitrus, big chest guaranteed roll, elite guaranteed Oran (the plain heal pickup) + one roll, bosses and gym leaders unchanged. Roll weights: X 30, heals 25, guards 20, pinch 15, Kee/Maranga 6, Pinaps 4.
- Art: Pokesprite sheet already in assets/items; credit line still to add to CREDITS.md after checking its license.

## 2026-10-20 Item rework F3a-2: status berries (Jess)
- Berry bag: auto-consume to negate the matching status (option A). One team-wide slot at the start, upgradeable (save.berrySlots, default 1, cap 4). Lum covers the six main statuses and is spent last. Toxic counts as Poison. A berry protects benched teammates too.
- A full bag or an already held berry leaves the pickup on the ground (no pull). Roll weights: Cheri, Chesto, Pecha, Rawst, Aspear, Persim 1.5 each, Lum 0.5.
- HUD: bag boxes directly above the first team slot, bottom-left when the team is one Pokemon.

## 2026-10-19, Status Slice D3: drain (Giga Drain) [Jess decided, branch feature/status-sliceD]
- Giga Drain is now ONE projectile (kind projectile, heart-shaped shot) instead of an aura. Power stays at the API-based 75 (Jess: "we're leaving that"). It heals 50% of the damage it ACTUALLY takes off the enemy (overkill past the enemy's HP excluded, shield absorbed counts), UNCAPPED (Jess 2026-10-19: "leave uncapped and we'll see if it's broke"; watch the logs for sustain; the engine still honours an optional `drainCap` fraction of max HP per hit if a move sets one). The old flat cap of 6 and the aura per-enemy heal are removed. Not applied to a teammate's ghost shot.
- Move field `fixed: ['count', 'pierce']`: keys listed can never take upgrade cards (mechanics.js check()); Giga Drain is always one shot and never pierces. Power, Recharge, Size, Range and Speed cards still apply. Reusable for other single-shot moves.
- Jess: saves are not a concern (every run is fresh and no starter has Giga Drain). Move fields: `drain` (fraction of damage dealt), optional `drainCap` (fraction of max HP per hit, unused for now). Mega Drain, Absorb, Leech Life, Drain Punch, Horn Leech, Dream Eater come with the bulk move import.
- Offline: docs/proposals/status-sliceD3-harness.js. NOT run in a browser.

## 2026-10-19, Action bar without boxes + move search [Jess decided, branch feature/status-sliceD]
- Action bar: a single move is the bare icon at 54 px (3x native, no distortion); cooldown shade and cast flash are masked to the icon pixels; the active move gets a yellow silhouette outline (plus the existing raise and name). Empty slots and BONDED groups keep the box (bond = pink border, 2x2 icons).
- Pokedex/Team search also matches moves: a word of the move name starts with the query (min 3 chars) -> every Pokemon whose type pools contain it; Normal-type moves (learnable by all) match only on the full name. Union with name/# matches; unowned Pokemon included for move matches. Ranked: moves whose NAME starts with the query (and name/# hits) first, word-only matches (e.g. Bug Bite for "bit") below.
- Team/Pokedex grids use align-content: start so few results keep their natural cell height.

## 2026-10-19, Player melee reach matches wild contact reach [Jess reported, branch feature/status-sliceD]
- Bug: wild melee hits at CONTACT.hit (1.3) x (e.r + pl.r) centre-to-centre, but the player's melee cast only started when the target centre was within m.radius + 30 (no body radii), and the hit circle was m.radius + e.r (no player radius). Big enemies could hit you before you could cast or reach them.
- Fix (combat.js): the melee hit circle is m.radius + pl.r x CONTACT.hit (the enemy's body is already added by queryCircle), and the cast trigger for melee is that same reach with the target's radius. Holds for any m.radius >= 0.3 x (e.r + pl.r) (all authored melee moves, radius 44+). Other kinds untouched.

## 2026-10-19, Status Slice D2: flinch [Jess decided, branch feature/status-sliceD]
- Flinch from the PokeAPI chance already on the move (Rock Slide 30, Bite 30, Dark Pulse 20; the bulk import will add more). One roll per move per target per 0.5 s (the same gap as ailments and stat drops), so a multi-pellet cast or a tick-kind move is one roll.
- EVERYONE is unrestricted (Jess): wild units, elites, bosses and gym leaders can all flinch, with no window and no lockout. My earlier boss exemption and 3 s limit are dropped (Jess had already declined blanket boss immunity). Frozen or asleep units cannot flinch (they have no action to lose). Co-op copies are skipped (deferred).
- Lost action: a boss or gym cast in progress is cancelled and its next-attack timer restarts as after a normal cast (gym: gymCd and gymRestore); a boss between casts has its timer restarted; a charger's aim or dash is cancelled; a ranged unit's shot timer restarts at its full period; the contact-hit timer restarts (0.55 s). Zones already on the ground are NOT cancelled (the same parked gap as freeze).
- Recoil (Jess's addition): if the unit was moving, it goes BACK (opposite its heading) half its sprite radius at 2.0x its plain speed, then has zero move speed for 0.2 to 0.3 s (random). A unit that was NOT moving gets no recoil but freezes the same 0.2 to 0.3 s (Jess: yes, they freeze too). The contact-hit timer restarts at 0.55 s and does not start counting down until the flinch (recoil and freeze) is over (Jess). Speed used is the plain movement speed (after stages, slow and paralysis) at the moment before the flinch, not a dash or charge speed.
- Ranged shot timers (distance-keepers' special shot and the support weak shot) now ALSO wait out the flinch (Jess 2026-10-20, "Yes. I agree"). Not changed: boss and gym attack timers and the healer's heal timer keep running (a boss or gym cast in progress is cancelled and restarts anyway).
- A wild melee unit's lost action is small (the contact timer is only 0.55 s), so for them the felt effect is the recoil, the freeze and the contact timer starting only after it (about 0.75 to 0.85 s without a contact hit in total); the big effect is on casters, ranged units and gym leaders.

## 2026-10-19, Status Slice D1: stat stages [Jess decided, branch feature/status-sliceD]
- Mainline stat STAGES (-6 to +6, multipliers x0.25 .. x4) for Attack, Defense, Sp. Atk, Sp. Def and Speed, on wild enemies, elites, bosses and gym leaders (G.Stages, js/systems/stages.js). Accuracy and evasion are skipped. Each application lasts 6 s on its own timer (Jess: 'Let's do 6'; the 12 s in BOSS-REWORK 3c was an inherited placeholder, longer than every other effect). The stage is the sum of the live applications, clamped to +-6. No separate floor for bosses and gym leaders (the -3 idea is dropped, 6 s makes it redundant).
- Wired stat drops: Bubble, Bubble Beam, Mud Shot, Bulldoze lower Speed by 1; Psychic, Bug Buzz, Shadow Ball, Flash Cannon lower Sp. Def by 1 (move field `stage: { stat, n }` plus the PokeAPI statChance already in the catalogue). One roll per move per target per 0.5 s (the ailment roll gap); every success is a new application, with NO lockout (Jess: the only lockouts are the freeze and sleep windows; my 2 s per-move lockout was an invention and is removed). Result: 100% moves (Mud Shot, Bulldoze) reach the -6 cap in about 3 s of contact and hold it; 10% moves hold about -1.2 on average, Shadow Ball (20%) about -2.4.
- Where a stage is read: the defender's Def or SpD in the player's damage ratio (applyDamage takes a defMul; status-category moves ignore it), the attacker's Atk or SpA in a gym leader's move factor, and enemy movement (the Speed stage multiplies the FINAL movement speed, x0.25 at -6 to x4 at +6, for every species; it is not bound by the 0.5x to 3.0x species-identity shaping and multiplies with paralysis and trap).
- Not in D1 (deferred to Slice E with the player-stage decision): moves that change the USER's own stats (Leaf Storm, Metal Claw, Meteor Mash have the data but no effect), and the player's own buff moves (Harden, Swords Dance, Agility stay on pl.buffs: auto-cast Harden as stages would reach +6 in about 5 s).
- Gym leaders' buff casts are stages now: +stageN per cast (default 1; Swords Dance and Agility carry stageN 2) on the move's stat (the player's 'spd' buff is Speed), each application lasting the move's dur, stage cap = the move's stacks (max 6). The old flat 7%-per-stack cut (Enemy.defCut, addBuff, buffTick) is deleted. JESS RULED 2026-10-19: leave Brock's Geodude and his Harden as is, no stage cap ('he's fine'; the simulated figures are worst case, since the real Geodude picks Harden by weight among Tackle and Rock Throw). Figures for the record: in the offline 60 s fight Brock's Harden sits at +1 for 28 s, +2 for 9 s, +3 for 3 s and +4 for 5 s (average damage taken x0.68, peaks x0.5 to x0.33) versus the old flat -42% maximum; a stage cap on the authored move stays available as a knob if a feel test says otherwise.
- RULING (Jess 2026-10-19, after Claude had mixed the species Speed shaping into stages): Speed stages are a buff and debuff on the final movement speed, independent of the species-identity bounds. If a unit gets to -6, that is x0.25 (and trap or paralysis multiply on top); no combined floor. Consequence to watch: Mud Shot and Bulldoze pin a crowd at x0.25 within about 3 s of contact, and Sp. Def drops are now stronger (-1 is damage x1.5, -2 is x2; Psychic-type 10% moves hold about -1.2, Shadow Ball about -2.4).
- PROPOSED, not built (D2 to D4, as discussed 2026-10-19): flinch cancels a wild enemy's wind-up or delays its next action about 0.6 s (bosses, elites and gym leaders ignore it); drain heals 50% of damage dealt, capped per cast at a percent of max HP; crit stage maps to 12.5% / 50% / 100% on top of the crit card (no 1/24 base); multi-hit is a rolled pellet count (2 to 5, mainline weights) with total damage fixed at per-hit Power x 3.1.

## 2026-10-19, Team screen: fullscreen party editor on the home menu [Jess decided]
- The six roster cards on the home screen are gone. A `Team` item sits right under Play and opens a fullscreen screen (scr-roster, no topbar): the six slots on the left, the Pokedex filters and grid in the middle, the selected Pokemon on the right (stat hexagon, an Ability line stubbed as 'Coming soon', its moves as a scrollable two-column list). Bottom bar: Back and Commit Team. No held item, no All Boxes or Search.
- It edits a COPY of the team. Nothing is saved until Commit Team (which sets team, partner and partnerShiny like the old commit did); Back discards, and asks first only when there are unsaved edits.
- Three ways to place a Pokemon in the highlighted slot (Jess: allow all three): the 'Put in Slot N' button on the detail card, a double-click on the list cell, or dragging the cell onto any slot. Dragging a team card onto another slot swaps them. Rules kept from before: a Pokemon already on the team swaps with the target slot, Slot 1 can never be empty, only owned Pokemon can be placed, non-lead slots get 'Remove from team'.
- The Pokedex (menu item Pokemon) is now strictly browse-only: pick mode, the pick banner, Commit to Roster and Remove from Roster there are deleted. The Team screen has its own filter state, separate from the Pokedex's. Shared code: the filter bar and grid in menu.js take a view (element-id prefix, filter state, team, selection).
- Touch: HTML5 drag and drop does not fire on touch screens, so the button is the touch path (touch layout stacks the three columns, not tested on a device).

## 2026-10-19, Status Slice C: control statuses on one shared engine [Jess decided]
- One status engine (G.Status) for enemies, elites, bosses, gym leaders and the player; the player is a host in Slice C, so no separate boss or player status system.
- Only one major status at a time: burn, poison (toxic), paralysis, sleep, freeze. Confusion and trap are not major and stack on top.
- Bosses, elites, gym leaders AND the player: freeze and sleep last 25% as long, then a 10 s no-reapply window (prevents infinite stun-lock). Paralysis, slow, trap and confusion work at full strength.
- Freeze 2 s (wild: then a 4 s refreeze window; Fire hit thaws it, never the same instant; Ice immune). Sleep 2-6 s, damage never wakes. Paralysis 10 s, x0.5 movement, 25% of attacks fizzle, Electric immune. Confusion 2-8 s, wander + 50% fizzle. Trap: own state, 1/16 max HP per 2 s turn for 4 turns, x0.25 movement, Ghost immune. A turn is 2 s.
- Trapped and paralysed enemies still attack. Frozen and sleeping ones do not move or attack.
- Fire Spin is a trap (no longer rides on burn); Lick paralyzes for real; the Ailment Chance card works on every wired ailment.
- Slice E keeps: player status sources, cures, the Status support class, drowsy, daze, haste aura, HUD icons beyond the minimal chips, co-op sync.
Add a dated entry whenever a durable decision is made.

---

## 2026-10-19, Brock pilot gym BUILT [Jess, branch feature/boss-rework]
- First gym end to end: gate at 4:00 (level = run-time level then + 4, locked at spawn, shown on the gate), rock arena (the rift arena reused), Geodude with Tackle / Rock Throw / Harden from js/data/gyms.js, badge package on a win. New files js/data/gyms.js, js/systems/gym.js.
- Jess's calls: the badge run boost is a STUB for now (item, level, Bond and full team revive are real); the pilot fight targets about 60 s of focused fire (HP from the elite reference model with TTK 60, not yet feel-tested).
- A team wipe in a gym ends the run (game.js: the arena no longer throws you back for gyms). No arena timer; the enrage starts 120 s after the first hit (damage x1.0 to x2.0 over 30 s). Fury stays off for gyms.
- Random legendary rifts are OFF (RANDOM_RIFTS = false in rift.js). The next elite comes 2:00 after returning from a gate (Elites.afterGate), none while one is alive.
- Gym leaders use the PLAYER's version of each move (Jess, 2026-10-19): Tackle has the player's radius and arc and the same slash visual; Rock Throw has the player's speed, size, life, spread, pierce and projectile visuals; Harden is the player's Harden (7% damage cut per stack, 5 stacks, 7 s shared timer). Only the damage is different: the enemy ratio path with the catalog Power and category (stats.js enemyAttackFactor takes power and cat). A 0.3 to 0.45 s wind-up (Charge animation plus a ring) telegraphs every move, with the aim locked at its start.
- GYM MOVES CARRY UPGRADE STACKS (Jess's call, 2026-10-19): a leader's move is a player move plus authored upgrade-card stacks (`stacks: { mechanicId: n }` on the move line in js/data/gyms.js), applied through the same G.Moves.addStack rules as the player's cards, so Effect adds Power, Count adds projectiles, Recharge shortens the cooldown, Area/Arc/Size/Speed/Duration/Buff Stacks work as they do for the player. The leader's moves also get STAB on its own types. Without stacks a leader was only a stat level-up and felt harmless. The validator rejects a stack the real rules would refuse.
- Gym tuning knobs (2026-10-19): each signature may carry power (damage multiplier) and tempo (attack-rate multiplier), default 1, valid in (0, 5]. They are the answer to 'a lone leader is not a threat' without changing the player's move stats. Brock starts at power 2, tempo 1.4 (TUNE).
- Stat stages are NOT built (they were dropped for the pilot because Harden stays the player's version); they stay in BOSS-REWORK 3c for Slice D.
- Boss forms built: melee = the player's cone swing, projectile (and any kind without a form yet) = the player's projectile, buff = the player's buff cast. The rest of the kinds come with the roster slice.

## 2026-10-19, Overworld Elites BUILT (first slice of the boss rework) [Jess approved the three defaults, branch feature/boss-rework]
- Built to the locked design in BOSS-REWORK.md section 2. An elite is a regular (non-boss) wild Enemy with an `elite` descriptor on a copy of the def, so it reuses wild AI and the ratio damage path. New file js/systems/elites.js (G.Elites).
- Temporary cadence until gyms exist: first elite at 2:00, then every 6:00, one alive at a time. Arceus's Judgment is unhooked (ENABLED = false in judgment.js, nothing else removed yet). Enrage: damage x1.0 to x2.0 over 30 s, starting 60 s after the first hit; no speed bonus.
- BOSS_SLOTS no longer spawns anything (the data stays until the cleanup list). The 25% boss-fight spawn rule is gone; the wild cap and rate are 50% for 60 s after an elite spawns, then ramp back over 30 s.
- Density Bonus replaces the crowd bump: XP only, x1.6 while 54 or more are alive, from 180 s. The XP boost, its banner and the opening HP discount share G.Stats.XP_BOOST_END = 180.
- levelForTime now takes an optional gym-complete argument; it still clamps at L50 past 30:00 (the post-gym ramp is TBD).
- Elite kills still count as boss kills for missions and achievements (progress.js), so those do not go dead while gyms are unbuilt.

## 2026-10-19, Boss rework design: gyms, elites, region completion [Jess + Claude, DESIGN ONLY, branch feature/boss-rework, nothing built]
- Flow: the three old boss systems are replaced. (1) Rifts with legendaries are replaced by GYM fights: a gate on the map leads to a type-matched arena, against that gym leader's signature Pokemon, in the mainline order of the chosen region (Kanto: Brock rock / Geodude, Misty water / Staryu, Lt. Surge electric / Voltorb, and so on). (2) The five BOSS_SLOTS bosses are replaced by overworld ELITES (level offset +1 or +2, sized up). (3) The Arceus fight (judgment.js) is removed entirely.
- Region Complete = finishing the region's main story, as an ORDERED ENCOUNTER LIST stored per region (not a hardcoded 8 + 4, since Alola has no gyms and Galar has no Elite Four). Kanto: 8 gyms then the Elite Four (Champion not decided, adding one later is just another list entry). Target: all 8 gyms done by the 30:00 mark; the Elite Four come after it and are the endgame.
- Gym level = run-time level at the fight + 4, sized up. Species do NOT carry the threat, the +4 offset and the tier table do. Signature Pokemon use HAND-AUTHORED REAL MOVES (real power, type, category, damage via the A/D ratio), not the wild AI and not the old slam / dash / leap + type-picked ranged template.
- Elites: while an elite is alive, wild spawn is halved (replaces the old boss-fight 25% rule). Elites and gym tier values live in one TIER TABLE (level offset, size, HP multiplier, move power rules).
- Badges (gym win): a run-long boost, a guaranteed item, a guaranteed level, a Bond, and a full team revive to 100% HP (fainted members included).
- Death commits EVs and progress (unchanged). Return Home on Region Complete pays a completion bonus. Keep Going (restart the gym roster; each gym fields its first two signatures at once; a bonus per loop) is DEFERRED to its own branch feature/continue-option.
- Level beyond L50 at 30:00 (linear to exponential ramp) stays DEFERRED. Until then the level clamps at L50 and the Elite Four sit on the clamp plus their offset.
- Legendaries return as something else, to be designed later. Do NOT delete the legendary flags, data or rift code in the cleanup; unhook rift spawning only.
- SUPERSEDED: the 'PHASE 2' post-30-minute-boss spec in the 2026-10-17 difficulty entry (Standard Run / Unlock Safeties choice after the Arceus fight). Arceus is gone, so the Region Complete choice replaces it. The linear-to-L50 phase 1 stands.
- OPEN (not decided): gate schedule and elite cadence; arena visuals per type; badge boost definitions (mainline-accurate per region or uniform stat bumps); what a 'Bond' badge reward means until the Bond rework decides; Elite Four rewards; the authored-moves data format; how move Kinds (projectile / zone / beam) translate into telegraphed boss attacks; stat-stage and status moves on bosses (wait for status slices C and D); how multiple casting bosses avoid stacked telegraphs (continue-option).
- Build order: (1) tier table plus elites on the wild ratio path plus the halved spawn; (2) boss HP and size; (3) ONE pilot gym end to end (gate, arena, Brock with authored moves, badge package); (4) Kanto roster; (5) Region Complete and Return Home; (6) cleanup of Arceus and rift spawning.

## 2026-10-19 (late morning, addendum) [Jess, design only]
- A gym's level locks when its gate spawns and is shown on the gate. Elites continue through the Elite Four phase (one elite 2:00 after each return from any gate, none while one is alive). Elite Four give the badge package without the guaranteed full revive.

## 2026-10-19 (midday, gym rules) [Jess]
- Pilot gym is Brock with Geodude only (Tackle, Rock Throw, Harden). Gym failure = the run ends (death is death, commits EVs and progress); the original rift 'spit out at 35% health' is not used. No arena timer; the gym boss enrages 120 s after engagement (TUNE). Type chart untouched for now.

## 2026-10-19 (midday, addendum) [Jess]
- Mainline stat STAGES adopted (-6 to +6, mainline multiplier table, fixed duration per application, TUNE). Boss fury phase is OFF for now.
- Fact: Harden's cooldown is hand-tuned (0.85 s), not PP-derived. Only damaging moves use cd = 0.5 x 35 / PP. Status move cooldowns under stages are a Slice D question.

## 2026-10-19 (midday), Status phasing and DoT on base HP [Jess, design only, tracker: BOSS-REWORK.md 3c]
- Boss status phasing approved: the pilot gym uses damage moves and Harden only; a minimal player status core comes before Gym 3; control statuses and the rest wait for Slice C, which is promoted to right after the pilot.
- DoT percentages (burn, poison, Toxic) apply to the target's base HP, before the tier HP multiplier. Bosses are NOT given blanket status immunity; hard CC and paralysis on bosses and elites are decided in Slice C.
- Stat stages (mainline table, -6 to +6) proposed for all stat buffs and debuffs; awaiting Jess's confirmation.

## 2026-10-19 (late morning), Run flow, Elite Four phase, Return Home, Density Bonus [Jess, design only, tracker: BOSS-REWORK.md sections 1, 2 and 4]
- Run flow: under 30:00 enemy level is linear L1 to L50; from 30:00 it is clamped at L50 until all gyms are beaten; then the slow ramp starts (linear into exponential, math TBD) and the Elite Four phase begins.
- Elite Four phase: all four gates open at once when the player returns from Gym 8, spread out and off screen from each other; gate and direction arrow show the level. Elite Four levels are hard-set per encounter, not time-based, so the player picks the order by difficulty.
- Region Complete = all 8 gym leaders and all 4 Elite Four. Return Home bonus multiplier rises for a total time under 60 min and falls over 90 min. Keep Going (deferred): XP, damage and HP multipliers all go up.
- Density Bonus (the renamed crowd bump) is XP only (x1.6 at 54+ alive, from 180 s). The damage half is dropped. The XP boost, its banner and the opening HP discount read a shared run-time constant (180 s).

## 2026-10-19 (end of morning), Enemy level curve, Density Bonus, run-time constant [Jess, design only, tracker: BOSS-REWORK.md]
- Enemy level: linear L1 to L50 over 0 to 30:00, then clamped at L50 until the region's gym list is complete, then a slow ramp (DEFERRED numbers). levelForTime must take the gym-list completion time as an input, not just the clock. This corrects my earlier note that the post-30 ramp was load-bearing: it only starts after Gym 8, so it affects the Elite Four phase and Keep Going, not the main run. The 'Phase 2' wording in the 2026-10-17 entry stays superseded.
- The crowd bump is KEPT after all, renamed DENSITY BONUS (reverses the 'removed entirely' line above). Open: XP only (recommended) or XP and damage.
- The 3:00 XP boost, its banner and the opening enemy HP discount read a shared run-time constant (XP_BOOST_END = 180 s) instead of BOSS_SLOTS[0].at. No behavior change.

## 2026-10-19 (later still), Gym timing, elite XP and the crowd bump [Jess, design only, tracker: BOSS-REWORK.md]
- Gym timing: Option A. Gym 1 at 4:00, each later gym 4:00 after the previous one is beaten and the player is back on the map. The 'all 8 gyms by 30:00' target is dropped (Gym 8 lands at about 39 to 46 min). The post-30 level ramp stays deferred but becomes the next load-bearing item, since enemy level sits on the L50 clamp afterwards.
- Elite XP = wild yield x the elite's HP multiplier x 1.2.
- The crowd bump (x1.25 damage, x1.6 XP at 54+ alive; DECISIONS 2026-10-18 'elite gate') is REMOVED ENTIRELY, no rename. Supersedes that entry. Needs a constant for the 180 s XP boost and opening HP discount window (both currently read BOSS_SLOTS[0].at).

## 2026-10-19 (later), Overworld Elites LOCKED [Jess, design only, tracker: BOSS-REWORK.md section 2]
- Elites have NO level offset (+1/+2 levels is only +14% stats at L10, +6% at L30). Species region accurate, one BST tier above the highest active wild tier, sized up (0.5 steps, 1.5x to 2x), with an HP multiplier and a power multiplier. HP multiplier is set by a 20 to 30 s focused-fire time-to-kill, not hand-typed. This lifts the 2026-10-18 note that an elite should not be an HP multiplier (that note was about the crowd bump).
- Engagement (first player hit) starts a 60 s timer, then the elite ENRAGES (damage multiplier ramps, maybe move speed).
- On spawn: wild cap 50% (32 of 64) and wild spawn rate halved for 60 s, then ramps back to normal; time-based from the spawn so the swarm cannot be held down by leaving an elite alive. Excess wild units walk off screen and are deleted.
- Cadence: first elite at 2:00, then 2:00 after each return from a gym. Reward: XP, a chance at an item, a guaranteed Berry.
- Gyms: Gym 1 spawns at 4:00, each later gym 4:00 after the previous one is beaten and the player is back on the map. FLAGGED: this puts Gym 8 at 32:00 at the very earliest and about 39 to 46 min in practice, so 'all 8 by 30:00' does not hold. Needs a ruling (BOSS-REWORK.md section 7).
- The crowd bump (x1.25 damage, x1.6 XP at 54+ alive) is renamed SWARM BONUS.

## 2026-10-18, Upgrade rework (in-run): Jess's rulings so far (design talk, NO code yet)
- Move Evolutions are REMOVED entirely. Touches: moves.js (EVO, EVO_MODS, evoInfo, evolve, NEED_NAME), levelup.js (evo card, guaranteed slot), run-ui.js and hud.js (gold styling), combat.js ghostCast flag, achievements (evo1, evo25, evoAll), missions (evolve, wevolve), progress.js 'evolve' event, SEO text. Old save fields (db.js evoMoves, stats.evolutions) stay dormant; null-check wherever unlocked achievement ids are read. Coop `evolved` wire field untouched (MP deferred).
- The old in-run stat cards are REMOVED entirely (Jess: "all the old stat upgrade cards"): Vigor, Potencia (Power), Carrera (Sprint), Reflejos (Reflexes), Coraza (Armor), Sintesis (Synthesis), Iman (Magnet), Aprendizaje (Learning), Baya Zidra (Sitrus Berry). OPEN: confirm the utility ones (cooldown, regen, pickup radius, XP, heal) are gone for good and where those concepts live afterward.
- Model (PoE2 style), three pools: (1) STAT = (Base + flat), where flat is IV + EV (+ meta-progression later); the stat formula's ev slot already exists, 0 today. (2) The six stat cards are their own INCREASE group on top of that stat, additive within the group. (3) Type / move-Kind INCREASE group: "Fire moves +x% damage", "Projectile moves +x%", also stat-scoped by Pokemon type ("Grass Pokemon +x% HP"). Groups multiply each other. "More" multipliers already exist as separate factors (move ladder steps, STAB, crit, type chart).
- In-run upgrades are PERCENTAGE ONLY for now. Jess may add an in-run FLAT increase later in the run (note: a flat added to the base term is multiplied by every increase group, so it is worth more than its face value).
- Card unit is a percent of the final stat (not EV-style points), because mainline EV math scales with level/100 and would be worthless in the first minutes. Additive stacking within a group keeps the worst case linear (about +390% if all ~49 picks went into one stat), so no hard cap at first; check G.Log.pacing() and cap only if needed.
- Slice order: (1) delete evolutions + old stat cards, (2) the pipeline + six stat cards + scoped cards (needs more design talk), (3) the pause/inspect screen (TABLED behind this; its yellow layer becomes literal once cards are real stat increases).
- Deferred: meta-progression upgrades (separate later branch). Flat meta layer (EV) is about +30% on a base-100 stat at any level, larger for low-base stats.
- 2026-10-18 (later), Jess's rulings on the open questions: (1) picks are PER-POKEMON (benched lag handled later). (2) ALL "increased damage" sources are SUMMED in one additive pool (Type, Kind and any other damage % together). (3) Scoped cards are offered only when they apply (you own a matching move, or the Pokemon has the type). (4) Tiers: a flat-valued card with meta-progression unlocking extra tiers is the likely direction; DEFERRED until the base pool works. (5) Card draw is BY FAMILY (pick the family, then the card within it), so catalogue size does not skew odds. (6) The utility cards (cooldown, regen, pickup radius, XP, heal; the original author's) are gone for good.
- 2026-10-18 (later), new direction: MOVE MECHANIC cards replace the fixed per-kind ladders and the utility cards. A mechanic card (cooldown, projectile +1, projectile speed, range, arc width, etc.) applies to a move that actually has that mechanic. Open: targeted (choose the move) vs broadcast, how the card shows its target, per-move damage, value pricing across mechanics, stack caps. See the next DECISIONS entry once settled.
- 2026-10-18 (later still), Jess's rulings on mechanic cards: (a) Targeting is THREE STEPS: pick the card, then the POKEMON (any team member, not only the active one; Pokemon with no eligible target are dimmed), then the MOVE (ineligible moves dimmed). This amends "picks are per-pokemon (active only)": picks go to a chosen Pokemon, which also removes the benched-lag problem. (b) There is a generic "+X% Increased Effect" mechanic: damage moves gain damage, heal moves gain healing, etc. (keyed on the move's Payload axis in docs/move_kind_rules.xlsx). (c) Three value classes (DPS, coverage, utility) accepted. (d) Rate mechanics (recharge, fire rate, speeds) are ADDITIVE "increased rate": rate = base x (1 + sum). (e) Moves have NO level; they hold any number of upgrades ("Ember: +45 projectiles, +150% damage, +200% splash, ..." is intended). (f) Balance is NOT a goal for every pick: "+1 projectile" may simply be the best choice. (g) The upgrade system is designed around the target move system in docs/move_kind_rules.xlsx (19 kinds; the "Allowed flags" column is each kind's mechanic menu).
- 2026-10-18 (clarifications, Jess): (1) docs/move_kind_rules.xlsx is a WIP, not all-encompassing, so the mechanic catalogue must be a flexible data table, not hard-wired to it. (2) Mechanic cards are MOVE-SPECIFIC: Card -> eligible Pokemon -> eligible move. FAINTED team members stay eligible (a revive mechanic is deferred). Any step with exactly one choice AUTO-ADVANCES but is still SHOWN: the Pokemon-select screen pops up, flashes a highlight on the only eligible Pokemon, then moves on to the move step. (3) Unlimited upgrades is the point. Framerate collapse at END GAME from a stacked build is INTENDED; collapse in a normal-length game is not. Engineering limits get a separate look later. Meaningless ceilings (arc already 360, etc.) make a card INELIGIBLE (dimmed and flagged), same as no-target.
- 2026-10-18 (Jess): ALL upgrade cards that touch moves are MOVE-SPECIFIC, including the Type and Kind scoped ones ("Fire moves +x%" means: a card whose eligibility is Fire moves, applied to ONE chosen move). The broadcast reading (apply to every matching move of that Pokemon) is NOT used for now; revisit if per-move feels bad. First catalogue is scoped from the moves currently in the game (text, weights, tiers after slice 1).

## 2026-10-18, Status rework slice A APPLIED (burn + poison on enemies) [Jess approved the plan, branch feature/status-dot]
- Source of truth, checked in pokeapi-master: PokeAPI holds each move's ailment, ailment_chance and min/max turns (our moves already carry the chances), plus prose that corroborates some fractions (Poison Heal heals 1/8 in place of poison damage including bad poison; Wrap 1/16 for 2-5 turns; Leech Seed 1/8; Toxic min/max turns 15, the escalation cap; Toxic Spikes: a second layer badly poisons). It has NO battle-engine table: burn 1/16, poison 1/8, Toxic N/16 and the type immunities are mainline game knowledge, not read from the repo. Its prose is not flawless (Black Sludge says 1/8 and 1/16).
- DoT is a fraction of the enemy's MAX HP per turn. ONE state per status, a re-hit only refreshes the duration (and never resets the tick timer). Stacks are gone: Jess caught that a cap of 8 balanced nothing (8 poison stacks x 1/8 = 100% per turn). Poison level 2 = badly poisoned (Toxic, Toxic Spikes, the poison trap).
- Turn length starts at 2 s per status (a table row each, G.Enemies.STATUS). Faithful anchor 0.5 s (Tackle, PP 35); 2 s is a 4x discount because DoT hits a crowd with no aiming. Duration counted in ticks: burn 4, poison 4, Toxic 8 (a Toxic row of 4 would never kill; at 8 it kills at tick 6).
- Type immunities in (Jess): Fire vs burn, Poison and Steel vs poison and Toxic. Fire Spin (ailment trap) rides on the burn flag and bypasses the Fire immunity until slice C gives trap its own state.
- Chance: rolled at the two applyBurn/applyPoison call sites in combat.js (procAilments). Status-category moves always apply. Jess agreed tick-kind moves roll at most once per 0.5 s per target; built as a general rule (any move, any target, 0.5 s), which also makes a 7-pellet cast ONE roll instead of seven.
- Bosses and rift legendaries: no special case (the boss rework owns them). Co-op: the roll happens before the call, so the wire is unchanged (remote copies still send 'b' and 'p', now with 1 or 2). MP stays deferred.
- Data changes: Toxic poison 1 -> 2 (moves.js), poison trap applyPoison(5) -> applyPoison(2) (interact.js). Logger: DOT lines show % of max HP (record field F[o+6]). Dev helper G.Debug.ignite(kind, radius) (flags the run as tampered).
- Verified: docs/proposals/status-sliceA-harness.js passes against the real stats, enemies, moves, enemy and combat files (tick math for all three states, refresh, immunities, 40,000-trial chance rolls, throttle, Fire Spin bypass, logger line). NOT run in a browser; the live game loop and drawing are untested.

## 2026-10-18, Status rework slice B APPLIED (Ailment Chance card, DoT follows the damage pool, sheet line) [Jess approved the plan]
- Rulings (Jess): the card step is +10 POINTS per stack ("what do you mean by points": percentage points added flat to the chance; Ember 10% > 20% > ... > 100% in 9 stacks); DoT follows the damage pool (yes); no Duration or Potency cards in this slice (DoT strength already rides the damage pool, tick count stays a STATUS table knob until a playtest shows a need).
- New mechanic 'ailchance' (DPS family, mode add, step 10, key `ailmentChance`, clamped to 100 in derive). Eligible only on non-status moves with a live burn or poison flag and a chance of 1 to 99 (6 moves: Ember, Flamethrower, Heat Wave, Flame Wheel, Sludge, Poison Sting). Dimmed with a reason otherwise: Always applies (Will-O-Wisp, Toxic, Toxic Spikes), Chance is already 100% (Fire Spin), Ailment not in the game yet (the 9 paralysis, freeze and confusion moves), Has no ailment (everything else, buffs included). Card text "+10 points Burn Chance" / "+10 points Poison Chance"; preview "10% to 20%".
- `ailmentChance` is now a key in G.Kinds (pushed onto every damage kind, since procAilments rolls on every hit of every damage kind) and in the key vocabulary. procAilments already read `m.ailmentChance` from the live move, so the engine needed nothing else.
- DoT multiplier = G.Moves.dotMul(m) = current Power / base Power of the source move (status moves and unknown sources 1.0). combat.js procAilments passes it to applyBurn(lv, ignoreImmune, mul) and applyPoison(lv, mul); an enemy keeps the strongest multiplier while its state lasts (burnMul, poisonMul), a fresh state takes its own. Co-op wire unchanged (remote copies send the status without the multiplier; MP deferred).
- Sheet: every move with a live ailment shows one line (G.Mechanics.ailmentText, built from the live move), for example "Burn chance 10% per hit: 6.3% max HP every 2 s, 4 times" (wording from Jess: STATUS chance XX% per hit); in Apply mode the line shows the after-state of the selected move. Status moves read "chance always" and Toxic and Toxic Spikes "Bad poison chance always: 6.3% max HP, rising by 6.3% every 2 s, up to 8 times". CSS `.sh-move .ail`.
- Verified: docs/proposals/status-sliceB-harness.js passes against the real files (eligibility for all 64 moves with reasons, 9 and 7 stack caps, clamp, texts and previews, independence from the damage cards and order independence, 40,000-trial rolls with stacks, DoT multiplier through the real Enemy ticks including the strongest-source rule, sheet text); the slice 2b, 2c and A harnesses still pass. The slice 2a harness cannot load any more, because its stub G has no G.U.TYPE_COLOR (needed by the scoped cards since 2c); that predates slice B and was left alone. NOT run in a browser: the sheet screen (layout, the new line) and the level-up card are untested live.

## 2026-10-17, Enemy Speed = fixed species identity (matches the player)
Enemy speed now uses the same Speed-identity model as the player (G.Stats.speedToPx from the enemy's
real base Speed stat[5]), fixed per species, same px/s scale as the player, with NO in-run time ramp
(the old sc.spd = 1 + t/1400 enemy speed-up is removed). Supersedes the pre-identity enemy speed
(tier.spd x spdK reverse-derivation). Difficulty comes from HP/damage/density, not creeping enemy
speed. Exceptions kept: bosses retain their own spd path (out of scope); the 'runner' behavior keeps
its x1.6 (it is a behavior archetype, not a base-stat multiplier).

