# Plan: Player entities and Wild entities (host model), 2026-11-05

Status: structure, decisions, slice order and leader status numbers approved by Jess 2026-11-05. Each slice is detailed and approved as it comes up, so the slice text below is an outline [Proposed]. No game code changed yet. Rules: docs/COMBAT-RULES.md "Host model". Evidence and code anchors: docs/proposals/host-model-audit.md (where this plan differs, this plan wins).

## The structure [Approved]

Two entity families, built first, then the sub-entities on top:

- `PlayerEntity`: moves, slots, Team, items, dodge, controller. Subclasses: `HumanPlayer` (input, camera, XP, coins, pickups), `GymLeader` (AI controller, `hpMult`, fixed status rules), `WorldBoss` and `Uber` (later plans).
- `WildEntity`: wild AI, morale. Subclass: `Elite` (size, HP, added rules).

No shared parent class above the two families, since they have little code in common. What they share lives in reusable modules: `G.Status`, `G.Stages`, `G.MoveSim`, `G.MoveEffects`, `G.TeamCards`, `G.Stats`, the new Team module, and one hit contract that both families answer.

Terms: Player entity replaces strong host and Wild entity replaces weak host ("host" is also the co-op host). The file names and the COMBAT-RULES heading keep "host model" so old references still resolve.

## Decisions (Jess, 2026-11-05) [Approved]

1. Architecture: the structure above. It replaces the audit's options A, B and C: it is option A's base class, extended to the Wild side.
2. HP: the player formula times an `hpMult`, authored per gym and per loop (with an optional per-mon override). Starting values come from the old 60 s model and a harness reports the resulting fight time. Measured gap: about 12x at level 12, about 30x at level 50, so one fixed value per gym cannot hold.
3. Fight length: 60 s for loop 1, plus 30 s per extra mon, split evenly across the team (starting numbers, TUNE). The enrage clock restarts on each send-out.
4. Hit i-frames: off for leaders. Dodge, swap and dash i-frames stay.
5. One active slot, as the player. The AI picks the slot under the player's slot hold; gyms may author bonds.
6. Voluntary swaps are a core leader feature, not an extra. Faint swaps come first only because they are the base the AI builds on.
7. Status: leaders use one FIXED set of leader status rules (below), different from the player's, not a per-gym override. The AI shakes off at 3 taps per second.
8. Elites do not change how they work (Jess, 2026-11-05, replacing the earlier answer that dropped the status cut). An Elite inherits the wild rules, and its current differences stay as its mods on top, status cut included. A later change to wild entities reaches Elites automatically.
9. Dodge: every leader has it. The AI gets a per-gym tuning knob for how often it uses it.
10. Contact damage: removed; a gym may author it back.
11. Progression: level stays gate time + 4 + escalation. Cards, IVs, EVs, nature and items are authored per loop, never a mirror of the player's picks. The heal cap stays per mon until the restriction block holds it.

Not in this plan: the Director (docs/Director AI Proposal.md). It manages the wild population, nothing here needs it and nothing here blocks it. Before it is planned, its "fewer, smarter enemies that coordinate" must be reconciled with the GDD AI principle for wild enemies [Open].

## Corrections to the audit

- Gap 9 said leaders take knockback. The player ignores knockback from damaging hits and only push moves (Roar) move them, so leaders do too.
- Gap 7 called the status change a flip of `strong()`. In practice Elites keep their status cut as an Elite mod, and leaders move to their own fixed set.
- Trap on the player is only a swap lock, so it does nothing to a leader until voluntary swaps exist (slice 9).
- Hit routing is larger than the audit implied. `Player.hurt` and `Enemy.hurt` take different arguments, the move effects choose their path by attacker and not by target, burn and poison have separate paths per class, the player's aim loop scans the enemy list (a leader would aim at itself) and `Player.hurt` shakes the camera. Slice 4 fixes this once, for both families.

## Leader status rules [Approved, numbers TUNE]

| Rule | Player | Leader today | Leader |
|---|---|---|---|
| Freeze length | 2 s | 0.5 s | 1 s |
| Sleep length | 2 to 6 s | 0.5 to 1.5 s | 1 to 3 s |
| No new hard CC after one ends | 2.5 s | 10 s (freeze and sleep only) | 5 s |
| Shake off | by hand, or auto at 3 taps per second | none | always, 3 taps per second |
| Paralysis, confusion, daze, burn, poison | full | full | full |
| Trap | 8 s swap lock | 0.5 s root | 8 s swap lock |
| Berry guards | yes | no | no |

Estimated share of time asleep if the player reapplies as soon as allowed, at the average sleep roll: today about 9%, full player rules with auto-shake about 50%, this set about 21%. The set lives in one table in status.js, the same for every leader. `WorldBoss` and `Uber` choose later whether to share it.

## Restriction block [Proposed]

Default allow. A `restrictions` block in js/data/gyms.js at three levels (gym, slot, loop), using the same keys as sets and cards; the narrowest level wins. It starts small in slice 5 and grows only when a slice needs an entry.

Entries: tells on or off (and their lengths), heal limit per fight, contact damage, banned moves, banned cards, dodge rate, swap rate. `hpMult` sits beside it as a plain authored number, since it is scaling and not a restriction. Enrage and tempo stay gym rules, as today.

The validator rejects unknown keys and bad shapes. It does not whitelist behavior, so a new move shape needs no validator change.

## Slices

Each slice leaves the game playable and ends with `npm run format`, `node tools/check.js` and the file:// smoke-ui run. Sizes: S under a day, M a day or two, L several days. Slices 1 to 4 are behavior-neutral: harnesses must stay green without edits apart from test fixtures that build the classes, and if one has to change otherwise, stop and find out why.

**1. `WildEntity` and `Elite`, structure only (M). BUILT 2026-11-05.**
- Files: enemy.js (the wild class named `WildEntity`), a new js/entities/elite.js (the `Elite` subclass takes the scattered `e.elite` behavior branches as its mods, including the status cut, knockback immunity and no Fissure KO), spawner.js, status.js and move-effects.js (read the named Elite rule), dev.html, main.js.
- Tests: a new harness pins an Elite's values and mods, shows it inherits a wild rule changed on the base, and shows a plain wild enemy is unchanged; mutation runner; the elites-harness fixture builds the new class.
- Risk: constructor order could give an Elite the wrong HP or size.
- Feel test: fight an overworld elite. Nothing should change.

**2. Team module (M).**
- Files: a new js/systems/team.js (also added to the dev.html script list and the NEED array in main.js), game.js. The Team owns the roster, active member, swap lock, swap and faint rules and the shared stores (stages, cards, dodges, run items, berries). Toasts, sound and camera stay in `G.Game`, passed in as callbacks. `save.team` loads as today, with no new save fields.
- Detail, proposed to Jess 2026-11-05, awaiting his OK. Finding: nothing tests real swapping today (swap lock, swap i-frames, faint pick, Re-Do); harnesses only test `benchUpdate` alone. So step 1 is a new tools/smoke-team.js in a real browser over file://, passing on the CURRENT code first, then unchanged after the move: swap carry, 5 s lock, 0.5 s i-frames, blocked while trapped, flying or fainted; the five stores stay shared and a swap does not refill dodges; run progress carries; faint brings the lowest living slot and clears the lock; bench poison can faint with its toast; Re-Do revives once and resumes on the last to faint; a wipe ends the run; HUD cooldown and swap keys; `pl` matches the Team's active member after every swap, faint and revive.
- Moves to team.js: members, active member, lock and its numbers, store linking, swap rules (a plain answer: OK, locked, trapped), taking the field (end dodge, position, aim, i-frames), next-mon choice, bench ticking. No sound, camera, text or input in the module.
- Bonds (Jess, 2026-11-06) [Approved]: the unspent-link count becomes a sixth shared Team store; `pl.bonds` reads and writes it, and the per-swap copy in `takeField` goes. Bond groups stay per-mon slot data. A Player with no Team keeps its own count. Map: docs/ASCII Concept Maps/Entity Model Slice 2 - Team Module.txt.
- Swap lock naming (Jess, 2026-11-06) [Approved]: the Team takes only the 5 s team swap lock. `pl.swapT` (the hold before switching move slots) is the "slot hold" and stays on the fighter until slice 3.
- Slice 2 approved 2026-11-06. Step 1: tools/smoke-team.js passed 34/34 on the pre-slice code (work machine, file://; one known font noise line, now a note). BUILT 2026-11-06 (Quick): js/systems/team.js (`G.Team`), game.js (`runTeam`, `carryRun`, `field`), player.js `bonds` accessor, dev.html and NEED, docs/proposals/team-harness.js, docs/proposals/team-mutate.js (46 mutations). Awaiting Jess's run of check.js, the smoke and the mutation runner.
- Stays in game.js: swap keys and Shake off (slice 3), effects and messages, run progress (a carry callback), Re-Do, the faint beat, end of run, `equipRun` and level sync (they only need the member list), `buildFighter`, `evTeam`. `pl` stays a plain variable, set in one place. `G.Game` keeps `roster`, `activeIndex`, `swapCooldown`, `swapMax`, `swap()`.
- Tests: tools/smoke-team.js above; new team harness and mutation runner for the module, expected values by hand. Existing harnesses need no edits (the game.js text pins only check `buildFighter`, `evTeam` and wiring that stays); if one has to change, stop and find out why.
- Order of operations is the main risk: each call keeps its current place in the frame, and the lock does not count down during the faint beat.
- Risk: the run loop. Co-op's `coopApi` must keep its current shape (deferred, not tested).
- Feel test: swap, faint on a team of 3, bench poison. Nothing should feel different.

**3. `PlayerEntity` and `HumanPlayer` (M).**
- Detail approved 2026-11-06 (Jess): D1 both classes in player.js; D2 `isPlayer` means "follows Player entity rules" (all 13 sites already are); D3 berry guards stay a Player-entity rule (a leader's berry bag stays empty); D4 the in-play move-slot keys also go through the controller now, same call site, `setActive` not split (slice 8). Map: docs/ASCII Concept Maps/Entity Model Slice 3 - PlayerEntity and HumanPlayer.txt. BUILT 2026-11-06 (Quick): player.js holds `G.PlayerEntity` (rules, IDLE controller, `aimTargets()` [], `aimFallback()` null, `onHurtFeel()` empty), then `G.HumanPlayer` (human fields, enemy list, rocks, hurt sound and camera kick, `gainXp`, `syncLevel` XP target, `netUpdate`, KEYBOARD controller); `G.Player` names the human. game.js: swap keys, Shake off and in-play slot keys ask `pl.controller`. NEED lists PlayerEntity. New docs/proposals/player-entity-harness.js and player-entity-mutate.js (35 mutations). Fixed 11-06: the aim method was first named `foes()`, which G.MoveSim reads as the mark of an enemy owner, so your moves turned on you (6 move harnesses and smoke-newcombat failed); renamed `aimTargets()`.
- Files: player.js split into the base and the human subclass, game.js. Input goes through a controller: movement and dodge, plus swap and shake from game.js. Aiming reads the entity's foes. Camera, hurt sound, XP, coins and pickups belong to the human. `isPlayer` is split into "follows Player entity rules" and "is the human" at each call site.
- Tests: input-keys, status and move harnesses stay green unchanged, which is the proof; add one harness driving a `PlayerEntity` from a scripted controller.
- Risk: the code behind your own character, and `isPlayer` is checked in many places, so the slice plan lists every site.
- Feel test: one normal run, nothing should change.

**4. One hit contract (M).**
- Detail approved 2026-11-06 (Jess), map: docs/ASCII Concept Maps/Entity Model Slice 4 - Hit Contract and Hard Typing.txt. Split: 4a the neutral hit contract (target family runs the defense and picks the side-effect rules; STAB and the scale travel in the hit, today's values); 4b a balance commit: STAB everywhere, wild Power 40 to 27, mainline type chart with true x0 immunity. Rules: COMBAT-RULES "Damage", "Type chart".
- 4a BUILT 2026-11-06 (Quick), awaiting Jess's run. Deviations (map, "AS BUILT"): the wild defense stays in move-effects damage(); boss-ai.js untouched. New docs/proposals/hit-parity-harness.js sections 7 and 8, hit-parity-mutate.js (31).
- Files: move-effects.js, move-sim.js, player.js, enemy.js. Each family owns its attack calculation and its defense calculation (Jess, 2026-11-05: Player entities use the player calculations, Wild entities the wild ones), and `Elite` inherits the wild pair. Each family answers one "take this hit" contract, replacing the split between hits on enemies and hits on the player, including burn and poison. Numbers do not change: your hits keep their formula and a leader's hits on you keep theirs. The slice plan must place STAB and the two damage scalars (1.0 and 0.5), which sit in different halves today, before a player can hit a Player entity.
- Tests: a parity harness pinning damage, riders, chains, Substitute and DoT before and after, written first; move-intent harness unchanged.
- Risk: subtle rider bugs, which is why this comes before any leader work.
- Feel test: a normal run plus one gym, nothing should change.

**5. `GymLeader`, Misty first, behind a per-gym switch (L).**
- Files: a new js/entities/gym-leader.js, enemy.js manager (accepts a leader for queries, updates and drawing), gym.js, gym-arena.js, boss-ai.js (the current brain moved behind a controller), hud.js, status.js (the fixed leader set), gyms.js (switch, `hpMult`, first restrictions: tells, heal limit, contact). Hit i-frames off, contact gone.
- Every outside reader of a leader body keeps working: the boss bar, kill and achievement events (progress.js), EV class (copies.js), drops, the win trigger, the weather and log checks.
- Other gyms stay on the old brain, so their harnesses keep passing unchanged.
- Tests: parity (same move, same stats, old brain against new entity, damage equal), a new leader harness, the mutation runner, a smoke-ui pass that fights Misty and collects the badge over file://.
- Risks: sprite draw order, outside readers. The switch is the way out if it goes wrong.
- Balance: contact loss makes Misty a little easier, and the status change makes her easier to lock than today.
- Feel test: `G.Debug.gym()` to Misty. It should look like the same fight, with new status behavior and no touch damage.

**6. Stat pipeline and cards (M).**
- Files: gym-leader.js, gyms.js (validator allows team cards, authored IVs, EVs, nature, items), stats.js only if a formula needs moving into `G.Stats`, COMBAT-RULES:SS10. Misty's Zinc x3 lands here. The `hpMult` harness goes live and reports fight time at each gym's expected levels.
- Tests: leader stats match a player built with the same inputs; a Vitamin changes damage taken; the fight-time report stays near target.
- Balance: leaders get stronger; Misty is re-tuned here, and only Misty.
- Feel test: Misty's bulk now shows up against special moves.

**7. Leader team and faint swaps (M).**
- Files: gym-leader.js (owns a Team), gym-arena.js (spawns the team, send-out beat, win only on team wipe, rewards once), gym.js (fight-length split, enrage restart per send-out), hud.js (team pips). Shared stages and dodges close the [Open] question in COMBAT-RULES:SS13. Retires the all-at-once lineup and replaces arena slice B (issue #5).
- Tests: loop 2 Misty fields 2 mons, one faint swaps, the wipe wins, one badge only; enrage restarts; shared stages carry across a swap; mutation runner.
- Risk: fight length in later loops.
- Feel test: Misty loop 2.

**8. Leader AI, slot choice (M).**
- Files: boss-ai.js, gyms.js (authored bonds). One active slot under the player's hold; the utility score now chooses a slot. Pure buffs only cast while their slot is active, so the AI must visit them. The sensing part (distance, your status, your recent damage) is kept separate from gym rules so it can be reused later, with nothing built for the Director now.
- Tests: scripted scenarios for slot pick, the hold, buff visits and bonded casts; damage output compared with slice 7.
- Balance: leader damage drops, so `power` or `tempo` may need a raise.
- Feel test: does the leader read as a player switching moves?

**9. Leader AI, voluntary swaps (M).**
- Files: boss-ai.js, gyms.js (swap rate). Swaps on bad matchup, low HP or a status, under the player's 5 s swap lock and 0.5 s i-frames. Trap now matters, and bench ticking applies.
- Tests: bad-matchup swap fires, swap lock holds, a trapped leader cannot swap, bench DoT can faint a mon.
- Risk: swap loops that stall a fight, so the AI needs a minimum time on field.
- Feel test: Misty loop 2 with a type advantage. Does the swap feel smart and not annoying?

**10. Leader AI, dodge (S to M).**
- Files: boss-ai.js, gym-leader.js, gyms.js (dodge rate). Uses the player's rules: 150 px in 0.5 s, 2 shared charges, 7 s cooldown, blocked by the same statuses.
- Tests: dodge happens on a threat, charges and cooldown hold, a frozen leader cannot dodge.
- Balance: the largest difficulty jump, and it stacks with tells. Dodge rate is the first knob.
- Feel test: can your skill shots still land?

**11. Remove the allow-list, add terrain and skills (M).**
- Files: gyms.js (`formOf` stops being a gate; validator checks shapes), boss-ai.js (generic aim, reach and tell for any move shape), gym-leader.js (terrain, Fly and Surf).
- Tests: one of each move shape cast by a leader in a scripted fight; banned moves and cards hold; `tools/validate_moves.js` stays green.
- Risk: some shapes may look wrong from a leader, so they get banned or tuned one at a time.
- Feel test: move-lab with new shapes on a leader.

**12. Migrate gyms 2 to 8, delete the old brain (L, one gym per session).**
- Files: gyms.js (switch on, cards, `hpMult` and restrictions per gym), then remove the switch, the old brain, `formOf`, `STRONG_HOST_GATE_MUL` and the gym branches left in the wild class. BOSS-AUTHORING, GYM-ROSTERS and the gyms sheet updated.
- Tests: the fight-time report for every gym; smoke-ui fights one gym per session; the old-model harnesses retire here.
- Feel test: each gym as it moves over, and this is the natural point to bring in playtesters.

Later, separate plans: the Elite Four, `WorldBoss`, `Uber`. Co-op stays deferred: a deferred-hook note goes to TODO.md at slice 5, since a leader entity is not replicated the way an Enemy is.

## Harnesses that pin the old model

| Harness | Pins | What happens |
|---|---|---|
| gym-harness (55 references) | `formOf`, per-mon cards, slot-0 arena | Misty cases move to the leader harness at slices 5 to 7; the rest retire at 12 |
| boss-owner-harness and -mutate | brain, tells, heals | Stay for the old brain until 12. The 5 stale mutate patterns are fixed at slice 5 |
| boss-split-harness and -mutate | Enemy body plus brain split | Retire at 12 |
| gyms-only-harness and -mutate | gyms as the only boss type | Updated at 5, stays |
| gym-reward-harness | badge package on a body's death | Moves to team wipe at 7 |
| status-sliceC and D2 harnesses | old strong rules | Elite cases stay, leader cases change at 5 |
| stat-stage-harness and -mutate | strong-host Gate, SS13 | Updated at 7 |
| elites-harness | Elite HP, cadence | Fixture builds the new class at 1, expectations unchanged |

## Risks across the plan

- Balance moves at every slice from 5 on. Only the migrated gym is re-tuned, and the others stay as they are until their turn.
- Two leader paths exist from slice 5 to slice 12. This is the one accepted duplication: keep the window short, and do not add features to the old brain.
- Save safety: no new save fields are expected. Any that appear get the usual null checks.
