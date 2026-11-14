# GymLeaderAI design (Director-style trainer AI)   [Proposed]

**HISTORY since 2026-11-08 (Jess).** Replaced by docs/LEADER-AI.md, designed fresh and then compared with this file;
the parts adopted from it are there. G1 to G11 are not answered here. Do not build on this file.

2026-11-07, Quick, branch feature/gym-leader-ai. Awaiting Jess on G1 to G11 (section 10). No code until signed off.
Sources: host-model-plan.md slices 9 to 12; docs/ASCII Concept Maps/Entity Model Slice 9 - Leader Voluntary Swaps.txt
(v2: structure A1 to A5, swap rules Q1 to Q10, carried forward here); docs/Director AI Proposal.md (architecture borrowed);
COMBAT-RULES.md LEADER RULES and LEADER TEAM; GDD.md AI principle.

## 1. What it is
One `G.GymLeaderAI` per leader team: the trainer. The per-mon `GymBrain` stays the hands (movement, slot pick, tells,
casts) and is not changed by this design. The AI's only output is the 7 controller calls your keyboard answers
(Slice 9 map A2), and every action it asks for passes through your rules (Team.canSwap then Team.swap, tryDodge).
So a leader can never do something you cannot.

## 2. What "Director-style" means here, and what it does not
Borrowed from the Director proposal: the observe, evaluate, act loop; utility scoring instead of rigid thresholds; a
short and a long observation window; its guardrails (no rubber-banding, gradual change, rolling averages, ebb and flow);
several levers instead of one; building it in phases, each testable before the next.
Not borrowed: the threat budget, population and archetype composition. Those manage the wild population and stay with
the wild Director, a separate later topic (DECISIONS.md, the entity model entry's last line; host-model-plan.md "Not in this
plan"). The GDD AI principle conflict for wild coordination stays `[Open]` and is untouched: leaders are Player
entities and already dodge and swap (COMBAT-RULES.md LEADER RULES).

## 3. The loop
- Observe, every frame (cheap): update the snapshot and the rolling windows.
- Evaluate, on a decision tick (G5, 0.25 s TUNE), never inside a tell or a move commitment: score each action.
- Act: the winning action becomes the controller's answer on the next frame (swapSlot, later dodge). STAY answers
  nothing. Gates that fail make the request a no-op, exactly as your refused swap is.

## 4. Observation
Snapshot: `sense()` (moved from boss-ai.js, `G.Boss.sense` kept as an alias, Slice 9 map A4) gives distance, her HP
fraction, your major status and your radius; `matchup(m)` gives the offense over defense score of map v2.
Windows (trainer memory on the AI, A5), as rolling averages (G4), short about 2 s and long about 15 s (TUNE):

| Metric | Short | Long | First reader |
|---|---|---|---|
| Damage she takes (your DPS on her) | yes | yes | swaps (P2 optional), pacing (P4) |
| Damage you take from her (her pressure) | yes | yes | pacing (P4) |
| Her HP trend, your HP trend | | yes | pacing (P4) |
| Your movement (average speed; standing still) | | yes | dodge (P3), pacing (P4) |
| Downtime: seconds since she last landed a hit | live | | pacing (P4) |
| Your threats near her (your live shapes whose path crosses her body soon) | live | | dodge (P3) |

Kill rate does not apply (one mon on the field); "faints so far" is the trainer-level stand-in if a phase needs it.
P1 records and shows these in the ?dev overlay only. Nothing reads them until the phase that names them.

## 5. Evaluate: utility with hard gates
Actions: STAY (always available), SWAP to bench slot i (P2), DODGE (P3), PACE (P4, later).
- Hard gates first, never scored: your rules (Team.canSwap: 2+ living, lock 0, not trapped, not in the air; tryDodge:
  charges, cooldown, statuses) and the AI gates of map v2 (no tell, no commitment, MIN_FIELD 8 s, swaps left).
- Score = product of consideration curves (each 0 to 1) times the action's weight. STAY has a constant baseline
  (TUNE), so nothing fires without a reason, and an action must beat STAY by a margin (hysteresis).
- P2 expresses the v2 triggers as considerations: hard CC remaining, low HP (this mon not saved yet), matchup ratio.
  Weights are set so map v2's worked examples come out the same (Bulbasaur with Vine Whip: Seel in after 8 s;
  Charmander with Ember: no swap). The v2 order (hard CC, then low HP, then matchup) becomes the tie-break.
- Deterministic (G6): no randomness, so every harness outcome is hand-derived, as attack() is today. A per-gym rate
  (dodgeRate) is a deterministic accumulator, for example "answers 1 threat in 2", not a dice roll.

## 6. Levers
| Director lever | Leader version | Phase |
|---|---|---|
| Composition | who is on the field: voluntary swaps | P2 (slice 9b) |
| (new) Evasion | dodge, your rules, 2 shared charges | P3 (slice 10) |
| Frequency / pressure | pacing: a short breather (far stance, no new tell) after sustained pressure on you; a push (close stance) after long downtime | P4 (new) |
| Complexity | per-gym and per-loop knobs that switch considerations on and tune them | each phase |
| Coordination | none: one mon on the field. Revisit for the Elite Four or a World Boss | later |
Slot choice stays in GymBrain.pickSlot (A3). Moving it behind controller.slots() later is possible, not planned.

## 7. Guardrails
- No rubber-banding (G7): the AI never changes stats, HP, damage, tempo, cooldowns or any authored number, and never
  reacts to your performance by getting stronger. It only picks actions a human trainer could pick under your rules.
  Difficulty stays authored per gym and loop (hpMult, cards, items, restrictions).
- Smooth: rolling windows, the decision tick, hysteresis over STAY, MIN_FIELD.
- Readable: every trainer action is visible. Swap: ring plus "<leader> switches to <mon>!" (Q8). Dodge: reads as your
  dodge. Pacing: a visible stance change, never a hidden number.
- Fair: it reads what is on screen (your shapes, position, status), never your input, and reacts after a delay (G8,
  0.15 s TUNE) so dodges feel human.
- No stalling: MIN_FIELD and swapLimit cap swaps; a breather has a maximum share of fight time (P4, TUNE). The fight
  timer and enrage rules are unchanged (Q9: each mon keeps its own enrage clock).

## 8. Per-gym knobs (restrictions in js/data/gyms.js; absent means the default)
`swapLimit` (P2, Q6: absent no cap, 0 never), `dodgeRate` (P3), pacing knobs (P4). Keyed per loop like the other
build keys when a gym needs it (G9). Validator rules come with each phase. No separate "AI level" enum.

## 9. Phases (each: build, hand-derived harness and mutate runner, your checks, feel test)
- P1 = slice 9a, unchanged from map v2 (new js/entities/gym-leader-ai.js, controller from the AI, arena reads
  swapSlot through canSwap then swap, EnemyMgr.withdraw, script and NEED), plus the windows recorded and shown in ?dev.
  Behavior-neutral: nothing should feel different.
- P2 = slice 9b, the swap decisions (map v2 Q1 to Q10) inside the utility loop of section 5.
- P3 = slice 10, dodge: answers dodge() on a threat near her, under dodgeRate and the reaction delay.
- P4 = pacing (new, not in host-model-plan.md yet): its own map before any build (G10).
- Slice 11 (move shapes) is independent of the AI. Slice 12 (gyms 3 to 8): each switched gym gets this AI with nothing
  per gym but its knobs.

## 10. Decisions (recommendation first)
- G1 Scope: a trainer AI per leader team, separate from the wild Director; borrow its architecture, not its threat
  budget. rec: yes
- G2 Carry Slice 9 v2 A1 to A5 and Q1 to Q10 forward unchanged as P1 and P2. rec: yes
- G3 Utility scoring with hard gates, the v2 trigger order kept as the tie-break (vs map v2's "first that fires").
  rec: utility, since dodge and pacing must compete with swaps later and a priority list would be rebuilt then
- G4 Windows as rolling averages, short 2 s and long 15 s (TUNE), recorded in P1, read by nothing until P3. This builds
  the data behind map v2 Q10 ("your recent damage") without using it, so Q10 still holds for P2. rec: yes
- G5 Decision tick 0.25 s (TUNE), never inside a tell or commitment. rec: yes
- G6 Deterministic decisions; rates are deterministic accumulators. rec: yes
- G7 No rubber-banding, as written in section 7, made a COMBAT-RULES rule on approval. rec: yes
- G8 Reaction delay 0.15 s (TUNE) before she reads a new threat. rec: yes
- G9 Knobs keyed per loop like the build keys; no AI level enum. rec: yes
- G10 Add pacing as P4, with its own map later; not built on this approval. rec: yes
- G11 This file is the design home until approved; then the rules move to COMBAT-RULES.md LEADER RULES and the slice
  maps, and this file becomes history. rec: yes

## Open
- Whether pacing (P4) and the authored tempo knob overlap; settle in the P4 map.
- Elite Four reuse (BOSS-REWORK.md): likely the same AI; settle when the Elite Four is planned.
