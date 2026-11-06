# Plan: Player entities and Wild entities (host model), 2026-11-05

Status: decisions approved by Jess 2026-11-05; the slices below are [Proposed] until Jess approves them. No game code changed yet. Rules: docs/COMBAT-RULES.md "Host model". Evidence and code anchors: docs/proposals/host-model-audit.md (where this plan differs, this plan wins).

## The model [Approved]

- Player entity (old term: strong host): Player, Gym Leader, World Boss, Uber. Has everything a player has; a subclass adds its own rules on top.
- Wild entity (old term: weak host): Wild Enemy, Elite. An Elite is a wild enemy scaled up in size and HP, plus added rules.
- "Host" is also the co-op host, so new text says Player entity and Wild entity. The file names and the COMBAT-RULES heading keep "host model" so old references still resolve.

## Decisions (Jess, 2026-11-05) [Approved]

1. Architecture: option C. A Gym Leader is a thin subclass of `Player` with an AI controller, a Team extracted from `G.Game`, and hit routing.
2. HP: the player formula times an `hpMult`, authored per gym and per loop (with an optional per-mon override). Starting values come from the old 60 s model and a harness reports the resulting fight time. Measured gap: about 12x at level 12, about 30x at level 50, so one fixed value per gym cannot hold.
3. Fight length: 60 s for loop 1, plus 30 s per extra mon, split evenly across the team (starting numbers, TUNE). The enrage clock restarts on each send-out.
4. Hit i-frames: off for leaders. Dodge, swap and dash i-frames stay.
5. One active slot, as the player. The AI picks the slot under the player's slot hold; gyms may author bonds.
6. Voluntary swaps are a core leader feature, not an extra. Faint swaps come first only because they are the base the AI builds on.
7. Status: leaders use one FIXED set of leader status rules, different from the player's, not a per-gym override. The AI shakes off at 3 taps per second.
8. Elites keep knockback immunity and no Fissure KO as added rules, and lose the status cut and the short trap.
9. Dodge: every leader has it. The AI gets a per-gym tuning knob for how often it uses it.
10. Contact damage: removed; a gym may author it back.
11. Progression: level stays gate time + 4 + escalation. Cards, IVs, EVs, nature and items are authored per loop, never a mirror of the player's picks. The heal cap stays per mon until the restriction block holds it.

Not in this plan: the Director (docs/Director AI Proposal.md). It manages the wild population, nothing here needs it and nothing here blocks it. Before it is planned, its "fewer, smarter enemies that coordinate" must be reconciled with the GDD AI principle for wild enemies [Open].

## Corrections to the audit

- Gap 9 said leaders take knockback. The player ignores knockback from damaging hits and only push moves (Roar) move them, so leaders do too.
- Gap 7 called the status change a flip of `strong()`. In practice Elites leave the group, and leaders move to their own fixed set.
- Trap on the player is only a swap lock, so it does nothing to a leader until voluntary swaps exist (slice 8).
- Option C's hit routing is larger than the audit implied. `Player.hurt` and `Enemy.hurt` take different arguments, the move effects choose their path by attacker and not by target, burn and poison have separate paths per class, the player's aim loop scans the enemy list (a leader would aim at itself) and `Player.hurt` shakes the camera.

## Leader status rules [Proposed, numbers need Jess's OK]

| Rule | Player | Leader today | Leader proposed |
|---|---|---|---|
| Freeze length | 2 s | 0.5 s | 1 s |
| Sleep length | 2 to 6 s | 0.5 to 1.5 s | 1 to 3 s |
| No new hard CC after one ends | 2.5 s | 10 s (freeze and sleep only) | 5 s |
| Shake off | by hand, or auto at 3 taps per second | none | always, 3 taps per second |
| Paralysis, confusion, daze, burn, poison | full | full | full |
| Trap | 8 s swap lock | 0.5 s root | 8 s swap lock |
| Berry guards | yes | no | no |

Estimated share of time asleep if the player reapplies as soon as allowed, at the average sleep roll: today about 9%, full player rules with auto-shake about 50%, proposed about 21%. All three numbers are TUNE. The set lives in one table in status.js, the same for every leader. Ubers and World Bosses choose later whether to share it.

## Restriction block [Proposed]

Default allow. A `restrictions` block in js/data/gyms.js at three levels (gym, slot, loop), using the same keys as sets and cards; the narrowest level wins. It starts small in slice 4 and grows only when a slice needs an entry.

Entries: tells on or off (and their lengths), heal limit per fight, contact damage, banned moves, banned cards, dodge rate, swap rate. `hpMult` sits beside it as a plain authored number, since it is scaling and not a restriction. Enrage and tempo stay gym rules, as today.

The validator rejects unknown keys and bad shapes. It does not whitelist behavior, so a new move shape needs no validator change.

## Slices [Proposed]

Each slice is a separate approval and leaves the game playable. Every slice ends with `npm run format`, `node tools/check.js` and the file:// smoke-ui run. Sizes: S under a day, M a day or two, L several days.

**1. Elites become Wild entities (S).** Independent of everything else.
- Files: status.js (Elites leave `strong()`), enemy.js and move-effects.js (the kept protections named as Elite added rules), COMBAT-RULES.
- Tests: elites-harness and the status slice harnesses gain "Elite takes the wild timers", "Elite still ignores knockback", "no Fissure KO"; mutation runner on each.
- Risk: elites get easier to lock down with sleep builds.
- Feel test: fight an overworld elite with a sleep or freeze move. Does it still feel like a fight?

**2. Team extraction, no behavior change (M).**
- Files: a new js/systems/team.js (also added to the dev.html script list and the NEED array in main.js), game.js. The Team owns the roster, active member, swap lock, swap and faint rules and the shared stores (stages, cards, dodges, run items, berries). Toasts, sound and camera stay in `G.Game`, passed in as callbacks. `save.team` loads as today, with no new save fields.
- Tests: new team harness and mutation runner written first against today's behavior (swap lock, faint picks the lowest slot, shared stores stay the same object, bench ticking, Re-Do); smoke-ui swap and faint pass.
- Risk: the player's feel, since this touches the run loop. Co-op's `coopApi` must keep its current shape (deferred, not tested).
- Feel test: swap, faint on a team of 3, bench poison. Nothing should feel different.

**3. Player entity seams, no behavior change (M).**
- Files: player.js. Input goes through a controller (human by default): movement and dodge, plus swap and shake from game.js. Aiming reads the entity's foes. Camera and hurt sound fire only for the human. `isPlayer` is split into "follows Player entity rules" and "is the human" at each call site.
- Tests: input-keys harness, the status harnesses and the move harnesses stay green unchanged, which is the proof; add one harness driving a `Player` from a scripted controller.
- Risk: low, but `isPlayer` is checked in many places, so every site is listed in the slice plan.
- Feel test: one normal run, nothing should change.

**4. Misty's mon as a real leader entity, behind a per-gym switch (L).** The core slice, and the riskiest.
- Files: a new js/entities/gym-leader.js (subclass of `Player`), move-effects.js (routes by target class), enemy.js manager (accepts a leader for queries, updates and drawing), gym.js, gym-arena.js, boss-ai.js (the current brain moved behind a controller), hud.js, status.js (the fixed leader set), gyms.js (switch, `hpMult`, first restrictions: tells, heal limit, contact). Hit i-frames off, contact gone.
- Damage stays on today's numbers: your hit on a leader keeps its current formula against the leader's stats, and the leader's hit on you keeps its current attacker half (STAB, power knob, enrage).
- Every outside reader of a leader body keeps working: the boss bar, kill and achievement events (progress.js), EV class (copies.js), drops, the win trigger, the weather and log checks.
- Other gyms stay on the old brain, so their harnesses keep passing unchanged.
- Tests: a parity harness (same move, same stats, old brain against new entity, damage equal), a new leader harness, the mutation runner, a smoke-ui pass that fights Misty and collects the badge over file://.
- Risks: subtle hit-routing bugs (riders, burn and poison, chains, Substitute), and sprite draw order. The switch is the way out if it goes wrong.
- Balance: contact loss makes Misty a little easier, and the status change makes her easier to lock than today.
- Feel test: `G.Debug.gym()` to Misty. It should look like the same fight, with new status behavior and no touch damage.

**5. Stat pipeline and cards (M).**
- Files: gym-leader.js, gyms.js (validator allows team cards, authored IVs, EVs, nature, items), stats.js only if a formula needs moving into `G.Stats`, COMBAT-RULES:SS10. Misty's Zinc x3 lands here. The `hpMult` harness goes live and reports fight time at each gym's expected levels.
- Tests: leader stats match a player built with the same inputs; a Vitamin changes damage taken; the fight-time report stays near target.
- Balance: leaders get stronger; Misty is re-tuned here, and only Misty.
- Feel test: Misty's bulk now shows up against special moves.

**6. Leader team and faint swaps (M).**
- Files: gym-leader.js (owns a Team), gym-arena.js (spawns the team, send-out beat, win only on team wipe, rewards once), gym.js (fight-length split, enrage restart per send-out), hud.js (team pips). Shared stages and dodges close the [Open] question in COMBAT-RULES:SS13. Retires the all-at-once lineup and replaces arena slice B (issue #5).
- Tests: loop 2 Misty fields 2 mons, one faint swaps, the wipe wins, one badge only; enrage restarts; shared stages carry across a swap; mutation runner.
- Risk: fight length in later loops.
- Feel test: Misty loop 2.

**7. Leader AI, slot choice (M).**
- Files: boss-ai.js, gyms.js (authored bonds). One active slot under the player's hold; the utility score now chooses a slot. Pure buffs only cast while their slot is active, so the AI must visit them. The sensing part (distance, your status, your recent damage) is kept separate from gym rules so it can be reused later, with nothing built for the Director now.
- Tests: scripted scenarios for slot pick, the hold, buff visits and bonded casts; damage output compared with slice 6.
- Balance: leader damage drops, so `power` or `tempo` may need a raise.
- Feel test: does the leader read as a player switching moves?

**8. Leader AI, voluntary swaps (M).**
- Files: boss-ai.js, gyms.js (swap rate). Swaps on bad matchup, low HP or a status, under the player's 5 s swap lock and 0.5 s i-frames. Trap now matters, and bench ticking applies.
- Tests: bad-matchup swap fires, swap lock holds, a trapped leader cannot swap, bench DoT can faint a mon.
- Risk: swap loops that stall a fight, so the AI needs a minimum time on field.
- Feel test: Misty loop 2 with a type advantage. Does the swap feel smart and not annoying?

**9. Leader AI, dodge (S to M).**
- Files: boss-ai.js, gym-leader.js, gyms.js (dodge rate). Uses the player's rules: 150 px in 0.5 s, 2 shared charges, 7 s cooldown, blocked by the same statuses.
- Tests: dodge happens on a threat, charges and cooldown hold, a frozen leader cannot dodge.
- Balance: the largest difficulty jump, and it stacks with tells. Dodge rate is the first knob.
- Feel test: can your skill shots still land?

**10. Remove the allow-list, add terrain and skills (M).**
- Files: gyms.js (`formOf` stops being a gate; validator checks shapes), boss-ai.js (generic aim, reach and tell for any move shape), gym-leader.js (terrain, Fly and Surf).
- Tests: one of each move shape cast by a leader in a scripted fight; banned moves and cards hold; `tools/validate_moves.js` stays green.
- Risk: some shapes may look wrong from a leader, so they get banned or tuned one at a time.
- Feel test: move-lab with new shapes on a leader.

**11. Migrate gyms 2 to 8, delete the old brain (L, one gym per session).**
- Files: gyms.js (switch on, cards, `hpMult` and restrictions per gym), then remove the switch, the old brain, `formOf`, `STRONG_HOST_GATE_MUL` and the Enemy gym branches. BOSS-AUTHORING, GYM-ROSTERS and the gyms sheet updated.
- Tests: the fight-time report for every gym; smoke-ui fights one gym per session; the old-model harnesses retire here.
- Feel test: each gym as it moves over, and this is the natural point to bring in playtesters.

Later, separate plans: the Elite Four, World Boss, Uber. Co-op stays deferred: a deferred-hook note goes to TODO.md at slice 4, since a leader entity is not replicated the way an Enemy is.

## Harnesses that pin the old model

| Harness | Pins | What happens |
|---|---|---|
| gym-harness (55 references) | `formOf`, per-mon cards, slot-0 arena | Misty cases move to the leader harness at slices 4 to 6; the rest retire at 11 |
| boss-owner-harness and -mutate | brain, tells, heals | Stay for the old brain until 11. The 5 stale mutate patterns are fixed at slice 4 |
| boss-split-harness and -mutate | Enemy body plus brain split | Retire at 11 |
| gyms-only-harness and -mutate | gyms as the only boss type | Updated at 4, stays |
| gym-reward-harness | badge package on a body's death | Moves to team wipe at 6 |
| status-sliceC and D2 harnesses | old strong rules | Elite cases at 1, leader cases at 4 |
| stat-stage-harness and -mutate | strong-host Gate, SS13 | Updated at 6 |
| elites-harness | Elite HP, cadence | Gains added rules at 1 |

## Risks across the plan

- Balance moves at every slice from 4 on. Only the migrated gym is re-tuned, and the others stay as they are until their turn.
- Two leader paths exist from slice 4 to slice 11. Keep that window short, and do not add features to the old brain.
- Save safety: no new save fields are expected. Any that appear get the usual null checks.
- Slices 2 and 3 are behavior-neutral by design. If a harness has to change there, stop and find out why.
