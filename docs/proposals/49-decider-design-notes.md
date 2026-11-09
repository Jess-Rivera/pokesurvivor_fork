# #49 design session notes (the Decider: utility goals plus GOAP planning)

Working notes for the #49 design session (branch rules "Slice shape"). Not a spec. When the session closes, its
rulings move to a DECIDER section in docs/LEADER-AI.md plus a decision file, and this file becomes history.
Started 2026-11-09, Jess with Claude Code (home). Read "HANDOFF" first.

## HANDOFF (for the next chat, 2026-11-09)
- Where we are: Belief, Strategy (now goal choice) and the planner's shape are settled ("Planner layer" below,
  decisions 2026-11-09-49-decider-is-utility-goals-plus-goap-planner and
  2026-11-09-49-leader-sharpness-base-plus-loop-growth). The three managers and the Arbiter are SUPERSEDED (Jess,
  2026-11-09): splitting by control channel was both too simple and too complex, since real tactics span channels.
  Their round 1 questions are void; proposal B is moot.
- Next: `/grilling planner details`. The frontier is the "Open" list at the end of this file, starting with each
  goal's target state and value in HP units, then the fixed action list.
- Working rule: emergent, not scripted (see "Design principle"). Recommend scores, never hard rules on top; raise any
  fairness limit that seems to need a hard rule as a question.
- Not started: no code and no LEADER-AI edit. The DECIDER section is written when the session closes.

## Shape (Jess, 2026-11-09): a hybrid, utility goals plus GOAP planning
```
Perception (G.LeaderInfo, screen only) -> Belief (world state, cooldown windows, opponent model)
        |
Goal choice (utility, personality-weighted; the Strategy layer below)
        |
Planner (GOAP: short plans from actions with preconditions, effects, costs)
        |
Executor (runs the current action through the Controller) <- Reflex layer (threat dodge; can interrupt)
        |
Controller -> Body -> SimPass (FRAME, unchanged)
```
- The whole stack is the Decider (FRAME); its commands go to the Controller, never the Body.
- Belief is the planner's world state. Personality enters as goal weights and action cost modifiers (Brock: cheap to
  buff, costly to approach; Misty the reverse).
- Why GOAP: tactics that span channels emerge as plans, e.g. Brock wants to KO your Charmander, Belief says Ember's
  window opens in about 1 s: wait at range, approach as it opens, Rock Tomb (bait and punish from the cooldown window).
- Known risks to design for: replanning churn (short plans, scored commitment), durative and uncertain actions
  (expected costs and effects), authoring cost of preconditions and effects, debuggability (overlay), determinism
  (fixed tie-breaks). Performance is not a concern at this size. HTN was considered and passed over (authored recipes,
  less emergent).
- Multiple targets are deferred (co-op, local-first).

## Earlier rulings still standing
- C. Cooldown inference (Jess, 2026-11-09). Belief may infer your cooldowns from casts it saw, as a belief that can be
  wrong; never the live timer. Refined by the Belief layer below (the learned window; `predictCap` no longer applies).
- D. Opponent modeling scope (Jess, 2026-11-09). #49 builds the framework with today's one exploit (your usual
  lead). More predictions are later slices.

## Belief layer (grilling, Jess 2026-11-09)
- Home: a new per-fight module between G.LeaderInfo and the Decider. It only derives; G.LeaderMemory stays the store of
  raw observations, and Belief rebuilds from Info and Memory, never from the game.
- Rhythm: Belief updates from events on any frame, the instant a thing shows on screen. The reflex delay applies only to
  the AI's actions, never to what it believes. Managers read it on their own clock (think tick, or reflex for dodges).
- Contents: your state (HP, statuses, stages, position, velocity); your moveset (revealed, stale, the own-type guess for
  unrevealed slots); inferred cooldowns; the opponent model; the self-assessment (confidence plus the rolling windows);
  its own state, exact (its own HUD).
- Derived facts are computed once in Belief and read by every manager: the matchup (existing formula), danger (your
  likely next hit on its active mon: revealed moves x readiness x type), opportunity (its best hit on you).
- Your position: a short straight-line extrapolation from your velocity; `aimError` still applies on top.
- Confidence: the value lives in Belief (the reading of how the fight goes); how strongly it pushes intents is
  personality, in Strategy. Both stay authored per leader (`conf*` plus a Strategy weight). Behavior unchanged by the move.
- Dodge split: the `dodgeRead` bag and the reflex decide whether a threat is noticed (Perception; threats are read from
  Perception directly, not through Belief). Whether to spend a charge is a scored, intent-weighted choice on that same
  frame (Arena's reactive dodge).
- Cooldown window (replaces "knows its cooldown length" in LEADER-AI REVEALS and revises ruling C):
  - A reveal tells the leader what the move is. Its window starts centered on the move's base cooldown, with a starting
    width (TUNE). Your real cadence is learned by watching.
  - A clean observation is two casts of one move with its slot kept active between them (the switch ring is visible).
  - Narrowing: on a clean gap inside the window, each edge closes on the gap by the leader's factor, set by `memoryUse`
    (Misty 0.5, Brock 0.8). Worked: window 0.2 to 2.0, gap 1.2: Misty 0.7 to 1.6, Brock 0.4 to 1.84. Deterministic, no
    dice. `memoryUse` no longer blends anything; it is "how fast it learns you".
  - A gap outside the window does not re-center it: the window stretches to cover the gap plus an overshoot, then the
    same narrowing applies. Mirrored for a slower cadence. Overshoot = starting width scaled by `memoryUse` (sharper
    readers overshoot less). Worked: window about 2.0, Ember drops to 1.2, overshoot 1.0: window 0.2 to 2.0.
  - A minimum width (TUNE) means it is never certain; that floor is the cooldown fairness limit. `predictCap` applies
    only to habit predictions (your lead now).
  - Readiness read by considerations: not ready before the window, a ramp across it, ready after it.
  - An unrevealed move (the own-type guess) is always believed ready.
  - Learned gaps live in run memory (raw gaps; the window is rebuilt from them), so the leader starts the next fight of
    the run where it left off. They live and die with the reveal (kept while stale, dropped when seen missing). No
    forgetting on a timer: the window does not widen while a move goes unseen.
- Opponent model: every prediction has one shape (what it predicts, how sure from counts and `learnRate`, whether it acts
  under `predictCap`). #49 builds only your usual lead.
- [Open] Bench cooldowns: belief mirrors the real bench-recharge rule, which waits on Jess's open bench-recharge call.
- Later slices, not #49: reading your other habits (range, swaps).

## Design principle (Jess, 2026-11-09)
Emergent, not scripted: every behavior comes out of a score (considerations x personality weights). No hard-coded hold
times, break conditions, share caps or forced actions on top of the utility. When a fairness limit seems to need a hard
rule, it is raised as a question, never slipped in.

## Strategy layer (grilling, Jess 2026-11-09; re-read as goal choice under the hybrid shape)
Everything below stands as the utility scoring rules. Where it says an intent "hands down a table to the managers",
that part is superseded: under the hybrid, the chosen goal (and its weights) steers the planner instead. Whether the
seven intents become the goals themselves is the first planner-grilling question.
- A fixed set of intents in code; leaders only weight them, never author new ones (#39 stays data).
- Seven intents, each defined by what it values:
  - Pressure: close in, damage, rarely swap, eat weak hits.
  - Trade: fight at its preferred range; normal swap and dodge willingness.
  - Kite: positional; values not being hit (danger) and punishing your approach.
  - Conserve: the old breather; disengage to recover resources (heal, buff, cooldowns); values safety now.
  - Endure: stays engaged, wins on attrition (chip, heals, drains, low-risk trades); values the long-window HP trade.
  - Setup: buff while safe.
  - Finish: you are low, so commit; weighs the value of the KO against the value of its own mon (no HP break line).
- Scoring: each intent's score is considerations read from Belief (confidence, HP lead, danger, opportunity, time since
  it last landed a hit) x the leader's weight for that intent.
- Each intent hands down a fixed table in code: multipliers on the managers' considerations, a range goal, a slot-kind
  preference. Leaders never edit the tables.
- Personality: a leader authors a weight per intent directly (no mapping code). `range`, `risk` and `swapWill` are
  parameters inside the managers' scores.
- Commitment is a consideration, not a hold time: the current intent scores higher for what it has invested (distance
  closed, buff stacks, time in it), with a per-leader weight (stubborn or adaptive).
- Confidence is a consideration in every intent's score (raises Pressure and Finish, lowers Conserve and Endure) and
  also scales commitment toward the intents it favors: a confident leader leans to Pressure and holds it longer; an
  unsure one leans to Conserve and holds that longer. Its strength is the leader's confidence weight.
- Clock: Strategy decides on the think tick; its considerations read the short window (2 s) and the long window, now
  10 s (code differs: built at about 15 s, TUNE). Slow evidence is what keeps it from flickering.
- Triggers lose their forced actions: events (a faint, an HP line, you sending a mon in) feed Belief and move scores;
  authored lines fire on intent changes and events, as voice only. A forced-action hook stays as an unused stub so one
  can be added later. The lead exploit becomes a Team consideration at fight start.
- `randomness` applies at the Strategy level only: a seeded draw weighted by score; `randomness` sets how far down the
  list it reaches. Managers pick their best.
- The breather's 25% share cap is dropped: Conserve stops scoring well once there is nothing left to recover.
- Default leader (no personality): every intent weight 1, baseline settings; the feel test judges it.

## Planner layer (grilling `/grilling planner`, Jess 2026-11-09)
Supersedes the three managers and the Arbiter. Where the Strategy layer above says "managers", read "the planner".
- Goals: the seven intents are the goals. Each has a target state (examples, thresholds open: Finish = your active
  mon fainted; Setup = +N stages and danger low; Conserve = key cooldowns ready and danger low; Pressure = in reach
  with a hit ready; Trade = at its preferred range with a hit ready; Kite = danger low and outside your reach; Endure =
  long-window HP trade positive) and a utility score from the Strategy rules.
- Goal choice: on every think tick it plans for every goal and ranks each (goal, plan) pair by goal value minus plan
  cost; the current plan adds its commitment bonus; `randomness` draws from the ranking (seeded, fixed tie-breaks).
  A great goal with no cheap plan loses.
- One currency: goal values and costs are both in HP traded as a fraction of the opponent's max HP. Cost = expected
  damage taken (danger x duration) minus expected damage dealt (opportunity x hit chance), plus a small time term,
  all read from Belief. A goal's value is its utility x a per-goal value in those units (Finish is worth the KO).
- World state: a compact snapshot from Belief (distance against each own slot's reach, own slot readiness, your
  threat readiness per revealed move from the cooldown window, both sides' HP, statuses and stages, bench matchups,
  dodge charges, active slot). Never read from the game.
- Actions: about 15 tactical verbs fixed in code, each lasting about 0.3 to 2 s and free to span channels (close to
  slot X's reach, hold at range, activate slot X, wait for a window, swap to mon Y, dash in, back off, ...). Each has
  preconditions, expected effects, a cost, a duration estimate, tags, and a steering routine that answers the
  Controller every frame.
- Signature actions: a leader may add named actions to its own pool, built only from the existing preconditions,
  effects and verbs with its own numbers (data, no new code path), e.g. Brock's "Sandbag": hold at range with Defense
  Curl active. #39 stays data.
- Personality on costs: a multiplier per action tag (approach, retreat, buff, swap, dash, wait, attack), with an
  optional per-action override; a missing override takes its tag's value. Plus goal weights (Strategy).
- Search: plans of at most 4 actions; the cheapest plan per goal that reaches its target state (A*, small).
- Replanning: every think tick (the running plan competes with its commitment bonus), and at once when the running
  action's precondition breaks.
- Executor: runs the current action's steering through the seven controller calls; an action ends when its effect
  holds or its time runs out (about 1.5 x its estimate, TUNE, open), then the next action, or a replan if its
  precondition fails.
- Reflex: threat dodges stay reflex (Perception notices, after `reflex`; the spend is a score weighted by the current
  goal). After a dodge the plan resumes if its preconditions hold, else it replans at once.
- Dash in: the gap-closing dodge becomes a planner action; the one-charge reserve is a cost on it, not a rule.
- Swaps: "swap to Y" is a planner action whose effect is the new matchup; `minField` and `swapWill` are cost terms;
  the lead exploit raises its value at fight start. Swaps chain into plans (swap to Onix, then Rock Tomb).
- Misjudgment: a new setting `misjudge`, seeded noise on each candidate plan's cost, drawn once per plan per think
  tick and held for that tick. It is the leader thinking a bad plan is good, unlike `randomness` (picking a worse
  goal on purpose). The commitment bonus keeps noise alone from flipping plans.
- Sharpness grows with the loop: `misjudge`, `memoryUse`, `reflex` and `dodgeRead` each take a per-leader base plus
  a per-loop growth (12 leaders, 6 loops: 24 values per setting). Unauthored values fall back to the code baseline.
  Growth is a fixed step per loop, held inside the setting's valid range (form open). Style settings (goal weights,
  cost multipliers, `range`, `swapWill`, `risk`) stay flat per leader: loop 6 Brock is still a wall, a sharper one,
  and may out-think loop 1 Lance. The four-setting scope is [Proposed] (Jess: "likely"); `misjudge` is approved.
- Learning in the run is separate from sharpness: run memory makes a leader better at you over a run; sharpness is
  how good it is at learning and judging at all.
- Cast timing is fixed: a move fires when ready and its slot is active, so you cannot vary its timing. Your cadence
  on a slot can differ from the move's base cooldown (your stats and cards), which is what the window learns. Your
  counter-play is cycling slots (denies clean observations, costs you damage), swapping, and movement (the
  straight-line position guess misreads a curve). The planner also plans as if you will not react, so baiting its
  commitments works.
- ?dev overlay (sketch, open): the current goal, the plan's steps with their costs, the top three alternatives.

## Spec revisions this session implies (for the LEADER-AI DECIDER rewrite)
- REVEALS: "knows its cooldown length" becomes the learned cooldown window (Belief).
- Ruling C: `predictCap` no longer caps cooldown inference; the window's minimum width does.
- PACING (push, neutral, breather) and its 25% breather cap are replaced by the Strategy intents.
- TRIGGERS: forced actions removed (a stub kept); lines become voice on intent changes and events.
- ROLLING WINDOWS: the long window goes from about 15 s to 10 s.
- DODGE READ BAG: the bag decides noticing only; spending a charge is a scored choice.
- GAP-CLOSING DODGE: becomes the "dash in" planner action; the extra charge kept back becomes a cost.
- SWAP AND SLOT CHOICES: become planner actions; the slice 9 v2 swap thresholds become cost and value terms.
- SETTINGS LIST: adds `misjudge`, signature actions and per-tag cost multipliers; the four sharpness settings take
  a base plus per-loop growth.

## Open
- Each goal's exact target state and thresholds, and each goal's value in HP units.
- The fixed action list (names, preconditions, effects, tags) and the signature action data format.
- Durative and uncertain actions: is the 1.5 x timeout enough; how a hit chance enters effects.
- Growth form: a fixed step per loop (assumed) or a percentage.
- The default leader with no personality; the ?dev overlay contents.
- The done-condition and the end-goal test. Candidate: over a run, a player who stays on one slot gets punished
  more than one who cycles slots; loop 1 Brock loses measurably more scripted duels than loop 6 Brock.
- [Open] Bench cooldowns (waits on Jess's bench-recharge call).
