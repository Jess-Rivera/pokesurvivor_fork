# Host model audit (step 1), 2026-11-05

The open decisions below are answered and some findings corrected in docs/proposals/host-model-plan.md (2026-11-05); that plan wins.
Read-only audit. No game code changed. Decision it serves: DECISIONS 2026-11-05 "Host model", rules in docs/COMBAT-RULES.md "Host model".
Question: what separates a gym leader from the player today, and what must change for a leader to follow every player rule, with Jess restricting by hand?
Tags per CLAUDE.md. Size: S under a day, M a day or two, L several days, XL a branch of its own.

## The model (Jess, 2026-11-05)

- Strong Host (all player rules): Player, Gym Leader (hand-authored restrictions), Uber, World Boss.
- Weak Host (wild enemy rules): Elite (a wild enemy scaled up in size and stats, plus added rules), Wild Enemy.
- A leader fields a TEAM that swaps like the player's (not all mons at once). Tells stay for now as an authored AI restriction.

## Five findings that shape everything

1. The leader is an Enemy body with a custom brain, not a player-class entity. `G.Boss.make` builds an `Enemy` (js/entities/enemy.js) and `GymBrain` (js/entities/boss-ai.js) steers it. Almost every player system is therefore absent or re-implemented for it.
2. `Player` is far less coupled than it looks. js/entities/player.js (1326 lines) reads input in exactly two places: `G.Input.axis()` (line 934) and `G.Input.action('dodge')` (line 951). It has one `G.Game` mention (a comment) and one `G.Camera` call. A "controller" seam (an AI driver in place of `G.Input`) is cheap on the Player side.
3. The team layer is NOT in Player. The roster, swap, swap lock (SWAP_LOCK 5 s, SWAP_IFRAME 0.5 s), faint auto-swap (lowest slot first), bench ticking, shared stage store (`stgTeam`), shared dodge charges and the shared team card store all live in the `G.Game` singleton (js/game.js, about lines 160 to 340 and 1085 to 1160). "A leader team that swaps like the player" needs that layer extracted into something a leader can own.
4. Targeting is one-directional. Player moves hit `G.EnemyMgr` entities; an enemy owner's moves hit `owner.foes()` (only the player). A leader that is a Player-class entity but also a target of the player's moves must be reachable from both sides. The MoveSim owner interface (`foes()`, `activeGroup()`, `moveFactor()`, `teamCards`, `slots`) already abstracts this and is the best existing base.
5. "Strong host" means two opposite things today. status.js:59 `strong(h)` is true for boss, elite and gym and FALSE for the player, and strong hosts get the 25% freeze/sleep cut and the trap root. The player's own rules are full timers, a 2.5 s hard-CC grace, berry guards and Shake off. Under the host model the player IS the strong host, so this predicate flips and elites leave it.

## Gap table: leader (today) against the player rule

| # | Area | Player rule | Leader today | Gap and direction | Size |
|---|---|---|---|---|---|
| 1 | Entity and body | Player class, input-driven, camera, UI | Enemy body + GymBrain (`boss-ai.js`), `e.gym` descriptor, 34 `.gym` and 51 `.boss` conditionals in js | Decide the host base (see "Architecture options"). Everything below follows from it | XL |
| 2 | Team and swap | Up to 6 members, one active, swap lock 5 s, 0.5 s i-frames, faint auto-swap, bench keeps ticking (status, DoT, stage drops), shared stage and dodge stores, revive | One body per mon. `spawnLeader` (gym-arena.js:168 to 171) fields slot 0 only. `G.Gym.roster` and `lineup` (gym.js:215, gyms.js) are not used by the arena. Arena slice B (#5) is unbuilt | Extract the team layer from `G.Game` into a reusable Team. A leader owns one Team of N mons (loop N = first N slots). New leader AI: when to swap (faint, matchup, a timer), "sends out X" beat. Win = whole team down. Retires the all-at-once lineup and slice B as written | XL |
| 3 | Move slots and casting | 4 slots (bond groups of fused moves), ONE active slot, swap slots with a hold, auto-fire the active group through `Player.cast` and MoveSim, bonds from gym links, skills (Fly, Surf) in slots | One flat group of up to 4 moves, all active (`activeGroup` filters only `hpBelow`), cast by the brain through `castAt` (a forced cast that bypasses the cast gate), picked by a utility score, with tells | Give a leader the same slot model and active-slot logic, or define the AI as choosing slots. Decide whether bond and fuse apply | L |
| 4 | Allowed moves | Any move in `G.MoveDefs` (175 routed) | `G.Gyms.formOf` allow-lists 12 forms (melee, nova, shot, strike, buff, heal, dash, returns, beam, multi, trail, delayed); `validate()` rejects every other shape (other emitters, delays, persistent, caster states) | Remove the whitelist. `formOf` also encodes AI fit (reach, tell length, stance), so each shape needs generic aim, reach and tell logic. Restrictions become authored bans | L |
| 5 | Level, stats, HP | Level from XP; `maxHpAt` = `hpForLevel(base, level, IV, EV)` x (1 + HP Up) + perks; speed, attack and defense through `statProf` (IV, EV, nature), stat cards, held-item multipliers, badge boosts, stages | Level fixed at gate spawn = `levelForTime + 4` (+ escalation bump, then the 120 s enrage clock x1 to x2). HP from the TTK model `Elites.hpFor(base, tEq, 60 s)` (gym.js makeDef). Attack through `enemyAttackFactor` (stats.js:199): no IV, EV, nature, cards, items. Extra `gym.power` knob | Run the leader through the player's stat pipeline (authored IV, EV, nature and level). Keep the TTK target only if Jess wants it as a restriction. Decide how level and progression are authored per loop | L |
| 6 | Cards and progression | Level-up cards (move cards and team cards: Gate, Duration, HP Regen, Vitamins), permanent Upgrades, Move Shop, held item per Pokemon, run items, berries, perks | Per-loop pooled MOVE cards only, one store per mon body (boss-ai.js:64 to 65). Validator rejects team cards. COMBAT-RULES SS10: "enemies have no cards" | Allow every card incl. Vitamins (this unblocks Misty's Sp. Def x3). One team store per leader Team (like the player's). Author per-loop items, upgrades, berries as needed. Update SS10 | M to L |
| 7 | Status | `strong()` false for the player: full timers, 2.5 s hard-CC grace (status.js:124, 214), berry guard (134, 140, 198), Shake off (354), trap is no-damage plus swap lock | `strong()` true: freeze and sleep at 25% then a 10 s window, trap is a 2 s root cut to 25% (status.js:86, 93, 112, 249, 305) | Flip `strong()`: a leader takes the player's rules. The AI needs a Shake-off equivalent (auto-shake) and berry use. Trap as a swap lock is only meaningful once leaders swap. Elites move to the wild rules (plus whatever Jess keeps as an added rule). Balance impact: leaders become easier to freeze and sleep | M |
| 8 | Stat stages | Team trackers shared across the roster (SS9), Gate and Duration team cards | `e.strongHost` is set on GymBrain only (boss-ai.js:69) and feeds `STRONG_HOST_GATE_MUL` = 1 (a no-op, stages.js:45, move-effects.js:195). Elites do not carry the flag despite SS13's text. Each mon body has its own stages; COMBAT-RULES SS13 leaves "do a gym's mons share raises in loop 2+" [Open] | A leader Team shares one stage store like the player's. That closes the SS13 [Open] question. Drop `STRONG_HOST_GATE_MUL` or keep it as an authored knob | S to M |
| 9 | Taking damage | `Player.hurt`: type chart, defense with `defMul`, `dmgReduce`, i-frames, shield, absorb, Focus Band and similar items, dodge shrink, `push` knockback, flinch | `Enemy.hurt`: no knockback (enemy.js:230 `!boss && !elite`; move-effects.js:291), i-frames only from a leader's Quick Attack, shield, flinch yes. Fissure KO excluded (move-effects.js:268) | Leaders take knockback, items and dodge shrink like the player. Defense side goes through the same pipeline as gap 5. Decide whether Fissure-style KOs stay excluded as a restriction | M |
| 10 | Dodge and movement | `tryDodge`: 150 px in 0.5 s, 2 shared charges, 7 s cooldown, no dodge while frozen, asleep, flinched, pushed, rooted; terrain (lava, liquid, ice glide), Fly and Surf skills, `keepInArena` | Species speed, brain steering (far and close stance, 170 to 300 px), walls only, no dodge, no terrain effects, no skills | Add a dodge decision to the AI (a leader that dodges telegraphed attacks is a large difficulty change, so author it as a restriction or a tuning knob). Terrain and skills follow the same switch | M |
| 11 | Contact damage | None from the player's body (Rocky Helmet reflects only) | Touching the body hurts with the melee move's numbers (combat.js:33 to 60, `e.touchCd` 0.55 s) | An enemy-ism. Under the model it goes unless Jess authors it back as a restriction or added rule | S |
| 12 | Tells | None: moves auto-fire | 0.45 to 0.6 s wind-up per form, 0.35 s recovery, one tell at a time, standing still (boss-ai.js:26 to 47) | Keep as an authored AI restriction on the leader (Jess, 2026-11-05), designed so it can be switched off per gym later | S |
| 13 | Gym-only pressure | n/a | 120 s enrage clock (ramp to x2 damage), gate escalation bump, `gym.power`, `gym.tempo` | These are authored gym rules, not player rules. Keep, in the restriction/authored block | S |
| 14 | Rewards, faint and win | A faint auto-swaps; a team wipe ends the run | `Enemy.die` gym branch (enemy.js:412): badge package, drops, links, 5 s return. One body death = fight over | Per-mon faint swaps in the next mon, no drops; the Team wipe triggers the win. Rewards stay a gym rule | M |
| 15 | Healing restriction | Recover and heals on their own cooldown | NEW this session: leader self heals capped at the loop number per fight, per mon (boss-ai.js `healsLeft`), with Recover at `hpBelow` 35% | The first authored restriction, currently hardcoded. Re-home it in the restriction block. With a Team, decide per mon or per team | S |
| 16 | Co-op | n/a | `foes()` returns the player only | Deferred (CLAUDE.md local-first). Record a deferred hook only | S |

## Weak side: what Elites carry today (to become "wild rules plus added rules")

`e.elite` appears 37 times in js (outside data). Today an Elite is a wild-AI Enemy sized up with HP from the reference model and a power multiplier (js/systems/elites.js), and it is also treated as a strong host in:
- status.js:59 `strong()` (25% freeze and sleep, trap root cut).
- move-effects.js:268 (no Fissure KO) and :291 (no knockback), enemy.js:190, 228, 230, 379, 381, 914 (morale, knockback, spread fear, hit-box and bar rules).
- combat damage and `G.Elites.engage` hooks.
- COMBAT-RULES SS13 (host list).
Direction: list each as an explicit Elite "added rule" (data-driven where possible), keep the wild AI as the default, and drop it from the strong-host set. Decide which of the current protections stay (knockback immunity, status cut) as deliberate added rules.

## What already fits (reuse, do not rebuild)

- One status engine (`G.Status`) and one stage tracker engine (`G.Stages`) for every entity.
- MoveSim owner interface (`foes()`, `activeGroup()`, `moveFactor()`, `teamCards`, `slots`) and `G.MoveEffects`: moves already resolve for a non-player owner.
- `G.TeamCards` store and fold rules (leader cards use the player's rules since 2026-11-05).
- The per-loop sets and pooled per-loop cards (`G.Gyms.cardsFor`) are already player-style progression.
- Player input seam is two calls (finding 2).

## Architecture options (the crux for the Opus chat)

A. Generalize `Player` into a Host base class used by Player and GymLeader, with a controller (human input or AI) and a Team object extracted from `G.Game`. Leader moves hit the player, the player's moves must also reach the leader body (join `EnemyMgr` as a target or widen `foes`). Cleanest for "everything a player can do"; largest refactor (gaps 1 to 3, 9).
B. Keep the Enemy body, port player systems onto it behind flags. Smaller steps, but the allow-list problem returns: every missing player rule is another port, and the two code paths drift.
C. Make the leader a real `Player` instance with an AI controller. Needs the Team extraction and a bidirectional target seam. Likely the best fit if findings 2 and 3 hold.
Jess has not chosen. The audit leans C (or A as its general form).

## Restriction model (sketch, for the plan)

Default allow. Authored `restrictions` at three levels: gym, slot, loop (the same keys as sets and cards). Candidate typed entries: banned moves, banned cards, per-fight cast limits by move or by form (the heal cap), no dodge, no swap, tells on or off, contact damage on or off, HP model (formula or TTK target), enrage on or off. Validator enforces shapes, not a whitelist of behavior.

## Proposed slices (order is a recommendation)

1. Plan: pick the architecture, the Team extraction and the restriction schema (docs only).
2. Team layer extraction from `G.Game` with the player as its first user, no behavior change (harness and smoke-ui first).
3. Controller seam and the Player-class leader (option C), one leader (Misty or Brock) end to end.
4. Stat pipeline for leaders (gap 5, 6), including team cards and Vitamins; Misty's Zinc stacks land here.
5. Status flip and Elite to weak host (gaps 7, 8, 9 and the Elite table), with COMBAT-RULES updates.
6. Restriction block replaces the heal cap and the whitelist; remove `formOf` as a gate (gap 4, 15).
7. Dodge, terrain, skills, tell switch (gaps 10, 12).
8. Re-author gyms 2 to 8 on the new model (the cards sheet: docs/ASCII Concept Maps/Kanto Gyms 2-8 - Mons and Moves.txt), then the Elite Four.

## Open decisions for Jess

1. Architecture A, B or C (above).
2. HP: the player formula at an authored level, or keep the TTK-60 s target as a restriction.
3. Which Elite protections stay as added rules (knockback immunity, status cut, no Fissure KO).
4. A leader's dodge: on by default with a restriction, or off until a gym opts in.
5. Contact damage: removed, or an authored restriction.
6. Leader team swaps: faint-only, or voluntary swaps by AI (matchup, timer).
7. Where a leader's progression lives: authored per loop (cards, items, levels), confirmed schedule not a mirror of the player's picks.
8. Self-heal cap and Misty's cards in the meantime: keep the current per-mon, per-loop cap until the restriction block exists.

## Risks

- Balance: every leader becomes stronger (stat pipeline, cards, dodge) and easier to freeze and sleep (status flip). Gyms 2 to 8 need a feel pass after each slice.
- Existing tests that pin the old model: docs/proposals/gym-harness.js, boss-owner-harness.js, boss-owner-mutate.js, gyms-only-harness.js, boss-split-harness.js (all tied to `formOf`, per-mon cards, slot-0 arena).
- Save safety: no new save fields so far; the Team extraction must keep `save.team` loading as is.
- Name collision: "host" is also the co-op host (`G.Coop.isHost`, GLOSSARY "anfitrión"). Docs say "strong host" and "weak host" in full.

## Code anchors

js/entities/boss-ai.js (GymBrain, TELL, heals, attack), js/data/gyms.js (formOf, validate, cardsFor, schema header), js/systems/gym.js (makeDef:138 to 170, roster:215), js/systems/gym-arena.js (spawnLeader:168), js/entities/player.js (constructor 14 to 137, update 898, input 934 and 951, hurt 629), js/entities/enemy.js (hurt 196 to 250, die gym branch 412, brain delegation 664), js/game.js (roster and swap 160 to 340, faint 1085 to 1160, bench 1149), js/systems/status.js (strong 59, apply 100 to 250, shake 354), js/systems/stages.js:45, js/systems/move-effects.js (193, 268, 284 to 291), js/systems/move-sim.js (owner interface, header), js/systems/combat.js:33 to 60 (contact), js/core/stats.js:199.
