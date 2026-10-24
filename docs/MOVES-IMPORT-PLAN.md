# Moves import plan (branch feature/all-moves-import)

Status: PLAN, agreed in outline 2026-10-22, nothing built. Jess pauses rework/gym-progression until this lands, because gyms 2 to 8 and the Elite Four cannot be authored without real moves.

## Why now
- The catalog (js/data/moves.js) has 64 moves. docs/move-import-review-v2.json has 833 classified (336 physical, 231 special, 266 status).
- Per-type depth is thin: rock 2, fighting 2, dragon 2, fairy 2, flying 3, ice 3, ghost 3, electric 3, steel 3, dark 3. Bruno (Fighting), Lance (Dragon) and Lorelei (Ice) cannot be built from it.
- Boss forms are limited to melee, projectile, buff (BOSS_FORMS in gyms.js). Enemy.gymCast builds only melee and buff; other kinds fall through to the projectile path.
- No learnset data exists anywhere in the repo.

## Review file facts (v2, 2026-10-19)
- Kinds: melee 187, projectile 122, control 79, buff 73, dash 69, nova 61, beam 39, mend 26, cone 15, ward 23, meteor 23, aura 25, field 21, mine 21, boomerang 12, orbit 12, wall 8, chain 6, trail 3, turret 1, null 7.
- Confidence: 392 moves at cf 2 or lower, 50 flagged for audit, 30 flagged for review. Jess has signed off on 99 (move-import-decisions.json: 98 ok, 1 flag).
- Kinds with no built behavior today: ward, mend, control, field, wall (and several geometry kinds are only partly used).

## Slices
1. Housekeeping: commit roster docs, branch from rework/gym-progression so slice A comes along. STATE.md carries a "paused, resume here" note.
2. Importer, data only: a script turns the reviewed JSON into a generated section of moves.js covering all moves with real stats and a kind. Kinds without behavior load as unbuilt and cannot be picked by anything. Harness proves the existing 64 moves are unchanged.
3. Behavior by kind, priority order: beam, nova, dash, cone, meteor, aura first (bosses and starters need them most). Then control, ward, mend, field, wall (depend on the status system).
4. Learnsets: separate PokeAPI pull into one data file, capped per Pokemon so the file stays small. Gym rosters read from it.
5. Resume gyms: wire gyms 2 to 8 and E4 against real moves; add the matching BOSS_FORMS and Enemy.gymCast forms as each kind gets built.

## Open decisions for Jess
- Import all 833 at once as unbuilt (recommended, one clean pass) or only moves whose kinds already work?
- Low-confidence handling: auto-accept cf 3 or higher (441) and queue the 392 for review, or review only what the 12 gym rosters need first?
- Learnset cap per Pokemon (number) and whether to include egg/TM/tutor moves or level-up only.

## Rules to carry over
Prose plan then Jess OKs before touching moves.js or gyms.js. Never run git. No em-dashes. Backward compatible saves. Keep harnesses green (node tools/check.js).


## Update 10/23/2026
Unify the executor

A boss is a combatant with a moveset and an AI controller, and the player is the same combatant with an input controller. There should be one move executor that takes (caster, move, aim) and does the thing. Only the thing choosing the move and the aim differs.

BOSS_FORMS and Enemy.gymCast then go away as separate code paths. That also removes the bug where unknown kinds fall through to the projectile path.
Each kind gets built once and works for starters, wild enemies, and bosses.
Gym rosters become “species + moveset + AI profile”, which is what the learnset slice wants to feed anyway.
Telegraphing is the one real difference. Bosses need a wind-up the player does not. Make it a per-move parameter (windup, warning shape) that the executor honors only when the caster is hostile, rather than a separate boss version of the move.
The risk is balance. Player moves are tuned for auto-fire cadence, so expect to tune cooldowns per caster type. The stat model design already routes damage through one A/D path, which helps.

We're planning to split a move into three layers

Facts from PokeAPI: type, power, accuracy, class, priority, target, ailment, drain, and so on. Generated, never hand-edited.
Game behavior, as two axes instead of one kind enum:
    Delivery: melee, projectile, beam, cone, nova, meteor, dash, orbit, boomerang, mine, trail, turret, chain, wall, field, aura. These are geometry and movement, written once in code.
    Payload: damage, heal, status, buff, shield, control. These are effects, applied through the status system.
Overrides: hand-tuned per-move values (range, cooldown, width, count), in their own file so regeneration never clobbers them.

Precedence is facts, then classifier output, then human override. Your existing 64 moves become override entries, and the harness proves they are unchanged.

The two-axis split matters because several “unbuilt kinds” are not really kinds. Mend is self-target plus a heal payload. Ward is self-target plus a shield. Control is any delivery plus a status payload. Under the single-enum plan, ward, mend, control, field, and wall are blocked on the status system. With two axes, most of that collapses into a few payload handlers, and only field and wall stay as true new geometry.

On the file format

Keep a generated .js (like your tileset atlases, which work from file:// with no fetch), but treat it as a build artifact. The source of truth is the review JSON plus the overrides file, and a script emits G.MOVES. Nobody edits 833 entries by hand. Learnsets are a separate generated file of move ids per species.

## Update 10/24/2026: the move-data-raw layer already exists (Jess built it by hand)
The "Facts from PokeAPI" layer does NOT need a fresh CSV join. Jess hand-built `pokeapi-master/data/v2/csv/api_dataset.json` (2.68 MB, no AI): the denormalized PokeAPI move dump, one record per move with every aspect pre-joined. This IS the move-data-raw source; the generator reads it instead of joining moves.csv + move_meta.csv + move_effect_prose.csv + move_meta_stat_changes.csv + move_flags.
- Shape: top-level { dataset, language_id 9 (English), version_selection "highest version_groups.order", moves: [...] }. 937 moves. Per move: `source`/`resolved_source` (raw ids: power, pp, accuracy, type_id, damage_class_id, target_id, effect_id, effect_chance, priority), resolved `type`/`damage_class`/`target`, `effect` {short_effect, description}, `meta` {category, ailment, ailment_chance, flinch_chance, stat_chance, drain, healing, crit_rate, min/max_hits, min/max_turns}, `stat_changes` [{stat_id, change}], `flags`, `flavor_text`.
- Coverage: 395 physical / 265 special / 277 status; 174 with stat_changes, 124 with a real ailment, 30 flinch, 28 multi-hit, 22 drain, 18 healing. 937 > the 833 in move-import-review-v2.json, so it is a superset of the classified set.
- RESOLVER MUST null-guard (make these conversion-harness assertions):
  - 110 of 937 moves have `meta == null`. Default ailment "none", all chances 0, no multi-hit.
  - 1 move has no `flavor_text` key.
  - `stat_chance == 0` on a STATUS move means the stat change is GUARANTEED (String Shot/Scary Face/Cotton Spore = -2 spd always), not "never". Distinguish deterministic status-move stat changes from %-chance riders on damaging moves.
  - ~13 ailments are outside our status model (disable, leech-seed, nightmare, yawn, embargo, torment, ingrain, heal-block, perish-song, infatuation, silence, tar-shot, no-type-immunity). Classifier maps the supported set and ignores the rest.
- stat_id map for stat_changes: 1 hp, 2 atk, 3 def, 4 spatk, 5 spdef, 6 speed, 7 accuracy, 8 evasion.
