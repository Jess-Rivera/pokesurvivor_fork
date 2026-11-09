# #49 design session notes (the Decider: utility goals plus GOAP planning)

Working notes for the #49 design session (branch rules "Slice shape"). Not a spec. When the session closes, its
rulings move to a DECIDER section in docs/LEADER-AI.md plus a decision file, and this file becomes history.
Started 2026-11-09, Jess with Claude Code (home). Read "HANDOFF" first.

## HANDOFF (for the next chat, 2026-11-09)
- Where we are: Belief is settled. Strategy is settled as utility scoring, but its "intents" must be re-read as GOALS
  under the new shape (below). The three managers and the Arbiter are SUPERSEDED (Jess, 2026-11-09): splitting by
  control channel (swap, movement, slot) was both too simple and too complex, since real tactics span channels. Their
  round 1 grilling questions were never answered and are void; proposal B is moot.
- Next: open `/grilling planner` (the grilling skill now opens with a play-back of the overview and the frontiers).
  Frontiers to play back: the goal list (do the seven intents become goals, or goal weights?); the action set with
  preconditions and effects (likely 12 to 20 actions, each may span channels, e.g. "close in with my melee slot");
  action costs and effects as expected values from Belief, plus personality as action cost modifiers; plan horizon
  (about depth 3 to 4) and when to replan (think tick, or a broken precondition); plan commitment as a scored cost;
  how the reflex layer (threat dodge) interrupts a plan; the ?dev overlay (goal, plan, why); the default leader; then
  the done-condition and the end-goal test.
- Working rule: emergent, not scripted (see "Design principle"). Recommend scores, never hard rules on top; raise any
  fairness limit that seems to need a hard rule as a question.
- Not started: no code, no LEADER-AI edit, no decision file yet. All of that comes when the session closes.

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

## Spec revisions this session implies (for the LEADER-AI DECIDER rewrite)
- REVEALS: "knows its cooldown length" becomes the learned cooldown window (Belief).
- Ruling C: `predictCap` no longer caps cooldown inference; the window's minimum width does.
- PACING (push, neutral, breather) and its 25% breather cap are replaced by the Strategy intents.
- TRIGGERS: forced actions removed (a stub kept); lines become voice on intent changes and events.
- ROLLING WINDOWS: the long window goes from about 15 s to 10 s.
- DODGE READ BAG: the bag decides noticing only; spending a charge is a scored choice.

## Open
- The planner layer: see HANDOFF for the frontiers.
- Each goal's considerations and curves in detail (with the planner).
- [Open] Bench cooldowns (waits on Jess's bench-recharge call).
- Then: the intents list; each manager's options and considerations and their curves; the default leader with no
  personality; the ?dev overlay; the done-condition and the end-goal test.
