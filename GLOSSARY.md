# PokeSwarm

A local-first, Pokemon-themed survivor-like for the browser. This glossary names the game's own language so design talk, specs and code use one word per idea. Spanish identifiers and folder names are mapped in docs/SPANISH-CODE-REFERENCE.md.

## Language

### Run and progression

**Run**:
One play session, from the start to death or Return Home. Death still commits EVs and progress.

_Avoid_: game, partida

Rule: BOSS-REWORK.md section 4

**Gym**:
A fight at a gate on the map: a type-matched arena against a leader's signature Pokemon with hand-authored moves, at the run-time level + 4. Replaced the rifts.

_Avoid_: rift, grieta

Rule: BOSS-REWORK.md sections 1 and 3

**Elite**:
An overworld wild enemy sized up in size and stats. It follows the wild rules plus its own mods, with no level offset. Replaced the timed bosses.

_Avoid_: boss (as a timed spawn)

Rule: BOSS-REWORK.md section 2; docs/COMBAT-RULES.md "Host model", ELITES DO NOT CHANGE

**Elite Four**:
Four gates that open at once after Gym 8, with levels hard-set per encounter. Not built yet.

Rule: BOSS-REWORK.md section 4

**Badge**:
The reward package of a gym win: a run-long team stat boost, a guaranteed item, a guaranteed level, a Bond, and a full team revive. The Elite Four give it without the revive.

Rule: BOSS-REWORK.md section 3g

**Region Complete**:
All 8 gym leaders and all 4 Elite Four defeated.

Rule: BOSS-REWORK.md section 4

**Loop**:
A run starts at Loop 1. Loop N fields the first N mons of every gym and Elite Four roster, all at once. Six loops per region. Continuing to the next loop is called Keep Going (also "Unlock Safeties").

Rule: BOSS-REWORK.md section 4a (approved, not built)

**Return Home**:
The end-of-region choice that goes back to the main menu with the completion bonus.

Rule: BOSS-REWORK.md section 4a

### Combat entities

**Player entity**:
The combat rule class that has everything a player has. Subclasses add their own rules: Player, Gym Leader, World Boss, Uber.

_Avoid_: strong host

Rule: docs/COMBAT-RULES.md "Host model"

**Wild entity**:
The combat rule class that follows the wild enemy rules: Wild Enemy and Elite.

_Avoid_: weak host

Rule: docs/COMBAT-RULES.md "Host model"

**Host (co-op)**:
The player who owns a co-op room. Not a combat rule class; say "Player entity" or "Wild entity" for those.

_Avoid_: using "host" for the combat classes

Rule: docs/proposals/host-model-audit.md

**Leader principle**:
A leader is treated as just another player's team, controlled by AI. Anything a player can have, a leader can have, and every difference is hand authored per gym, never a hidden built-in rule.

Rule: docs/COMBAT-RULES.md "Host model", LEADER PRINCIPLE

**Gym Leader**:
A subclass of the Player entity that fights a gym. Its HP is the player formula times an authored `hpMult` per gym and loop.

Rule: docs/COMBAT-RULES.md "Host model", LEADER RULES

The four roles below are every Player entity's frame, in order: the Decider decides, the Controller carries, the Body accepts or refuses, the SimPass resolves. Each is blind to the others' jobs.

**Decider**:
Whoever decides for a Player entity: you, or a leader's AI. It takes in the screen only (your eyes; the AI's eyes are `G.LeaderInfo`, plus its own HUD as you see yours) and answers commands to the Controller. It decides and enforces no rule; it keeps no stun check of its own.

_Avoid_: mind, brain (GymBrain was a body and a decider in one)

Rule: docs/LEADER-AI.md "FRAME"

**AI player** (also "the AI", of a leader):
A leader's Decider: the one module that drives every Player-entity leader. Code: `G.LeaderAI`, with what it believes (`G.LeaderBelief`, its only door, #50), what it sees (`G.LeaderInfo`) and remembers (`G.LeaderMemory`). It acts only through the Controller. Not the GymBrain, which it replaces.

Rule: docs/LEADER-AI.md "The AI player"

**Belief** (of a leader):
What a leader's Decider believes about the fight, derived each time it is read from what `G.LeaderInfo` saw and `G.LeaderMemory` kept: your cooldown windows and readiness, the matchup, danger and opportunity, the rolling windows. It only derives and stores no observation. Code: `G.LeaderBelief` (#50). Not perception (`G.LeaderInfo`) and not memory.

_Avoid_: knowledge, model (the opponent model is one part of it)

Rule: docs/LEADER-AI.md "The Decider (#49)" BELIEF

**Cooldown window** (of a leader):
The span of seconds in which a leader believes one of your moves comes back, per revealed move: opened on its base cooldown, narrowed by each clean gap (two casts with the slot kept active), never narrower than the minimum width. Readiness ramps across it. Measured in your mon's field time, so a benched mon's clock waits as its cooldowns do.

Rule: docs/LEADER-AI.md "The Decider (#49)" COOLDOWN WINDOW

**Controller**:
Your hands, or the AI's `controller`: the only channel from the Decider to the Body. It carries the Decider's answers as requests through the seven calls (heading, dodge, shake, swap mon, swap direction, slot keys, cycle) and decides and filters nothing. Yours is `G.HumanPlayer.KEYBOARD`.

_Avoid_: hands as a separate term (it is the Controller)

Rule: docs/LEADER-AI.md "FRAME", "YOUR CONTROLS ONLY"

**Body**:
The mon a Player entity fields: what you can hit and kill. It holds the state (HP, stats, statuses, stages, slots, dodges, locks) and checks each request against its acceptance rules (statuses, locks, authored "allowed to do" restrictions); what it accepts goes to the SimPass, and a refusal passes nothing on. It decides nothing and changes no state itself. Yours is `G.HumanPlayer`; a leader's is `G.GymLeader`. Its checks, on every Player entity: `acceptHeading`, `acceptDodge`, `acceptsCast` (a stun refuses a new cast); a leader adds `acceptsAttack` (#43 step A).

_Avoid_: brain

Rule: docs/LEADER-AI.md "FRAME"

**SimPass**:
The last step of a Player entity's frame: it resolves what the Body accepted and everything nobody asked for (move timers, damage and heal over time, commitments, due casts, other entities' hits), updating the game state. It never asks why. Authored "how it plays out" differences (a tell before release, the enrage) live here. Every Player entity's movement step is `G.PlayerEntity.SimPass` (timers, statuses, over-time effects, the dodge's travel, walking, ice, pushes, flinch recoil, liquid terrain, the target pick), run inside its update (#43). The casts: yours `G.MoveRoute.tick`; a leader's `G.GymLeader.SimPass`, which runs `G.MoveSim.turn` at the end of its own frame.

_Avoid_: sim (alone)

Rule: docs/LEADER-AI.md "FRAME"

**Authoring layers**:
Where a Player entity's differences from you come from, in order: the Player parent (your rules), then its class's authoring (every World Boss is a raid fight), then its instance's (a gym, "Gyarados, World Boss"). A layer with no authoring falls through to the one above. Class authoring is one declared list per class, never checks scattered in code.

Rule: docs/COMBAT-RULES.md "Host model", LEADER PRINCIPLE

**Reveal**:
The moment a leader learns something about one of your mons from the screen: a move when it is cast, a bond when its moves fire together, a held item when its effect shows. Cards and stats are never revealed.

Rule: docs/LEADER-AI.md "What it can see"

**Run memory**:
What a leader remembers of its own fights for the rest of the run: your reveals and behavior counts. In memory only, never saved.

Rule: docs/LEADER-AI.md "Run memory and behavior tracking"

**Pattern**:
A habit of yours the leader has counted (for example, swapping out under 30% HP). It is believed once it has enough observations (`learnRate`) and exploited at most the prediction cap's share of the time.

Rule: docs/LEADER-AI.md "Run memory and behavior tracking", "Fairness"

**Prediction cap**:
The most often a leader acts on a believed pattern (default about 70%, authorable to about 95%), so a prediction is never certain.

Rule: docs/LEADER-AI.md "Fairness"

**Reflex delay / think interval**:
The two reaction limits of the AI player: the reflex delay before it responds to anything it sees (dodging, aiming), and the think interval between slot and swap choices.

Rule: docs/LEADER-AI.md "Fairness"

**Confidence**:
A leader's runtime value, moved by fight events, that shifts its style settings toward caution or aggression. It never changes damage or HP.

Rule: docs/LEADER-AI.md "Authoring a leader"

**Trigger / line**:
A trigger is an authored condition and action on a leader (an HP line, a faint, fight start) that acts through your controls. A line is a short English text the leader says on screen at a trigger or a large confidence swing.

Rule: docs/LEADER-AI.md "Authoring a leader"

**Goal / plan / plan action**:
The planner's three terms inside a leader's Decider. A goal is one of nine fixed in code (Endurance, Maintain, Pressure, Setback, Kite, Buff, Bait, Finish, Conserve), with an outcome target (something landed or gained), a value and a cost profile. A plan is up to 4 plan actions that reach a goal. A plan action is a tactical verb (close to a slot's reach, hold at range, activate a slot, swap to a mon, dash in, back off) with preconditions, expected effects and a cost in HP traded; it answers the Controller every frame.

_Avoid_: "action" alone (moves and the Controller also act); manager (superseded)

Rule: docs/LEADER-AI.md "The Decider (#49)"

**Signature action**:
A plan action one leader adds to its own pool, built only from the existing preconditions, effects and verbs with its own numbers. Authored data, never a new code path.

Rule: docs/LEADER-AI.md "The Decider (#49)"

**Sharpness / style**:
The two kinds of leader setting. Sharpness is how well it learns and judges (`misjudge`, `memoryUse`, `reflex`, `dodgeRead`) and grows with the loop: a per-leader base plus a per-loop growth. Style is how it likes to play (goal weights, cost multipliers, `range`, `swapWill`, `risk`) and stays flat per leader.

Rule: docs/LEADER-AI.md "The Decider (#49)"

**Misjudgment** (`misjudge`):
A sharpness setting: seeded noise on each candidate plan's cost, drawn per think tick, so a leader sometimes thinks a bad plan is good. Not `randomness`, which picks a worse goal on purpose.

Rule: docs/LEADER-AI.md "The Decider (#49)"

### Damage and stats

**Orthogonal dials**:
Three independent scalars: the shared HP scalar, the player-to-enemy damage scalar, and the enemy-to-player damage scalar. A move's Power changes only the damage side, never HP.

Rule: docs/COMBAT-RULES.md "Orthogonal dials"

**Swap rule**:
Every slotted move runs its own cooldown whether active or not. Only the active group fires. A short hold after a swap stops instant back-and-forth swapping.

Rule: docs/COMBAT-RULES.md "Swap rule"

**Bond**:
A group of slotted moves that fire and take hits together (a bonded group). Under rework (Slot Compression and Synergy). What a "Bond" badge reward means is still open.

Rule: docs/COMBAT-RULES.md "Swap rule"

**Stage**:
One step of a stat change from a move, straight from the mainline data (Swords Dance is +2, Leaf Storm is -2).

Rule: docs/COMBAT-RULES.md "Stat stages"

**Cap**:
The plus or minus 6 limit on a stage.

Rule: docs/COMBAT-RULES.md "Stat stages"

### Moves (the move schema)

English-native terms of the move schema rewrite. Owners: docs/MOVE-AXIS-SCHEMA.md (grammar) and docs/current feature planning/combat-architecture.md (runtime); this section only names the terms.

**axis**:
One of the three parts of a move: `space` (shape), `delivery` (where, how it moves, when it ends), `payload` (effects).

**resolved definition**:
A move after defaults, derived values (cd, basePower, range) and overrides; `G.MoveDefs`, deep-frozen.

**routed**:
`G.MoveRoute.routed(id)`: the move has a resolved def and is not retired, so G.MoveSim runs it. The ROUTED list and the `?newcombat` flag were removed in slice 7b.

**legacy path**:
The old `kind`-based player-move code (the player half of combat.js, the old moves.js table, kinds.js, mechanics.js), deleted in slice 7b (2026-11-01). Its table is archived at docs/move_rework_holding/legacy-moves.js for the tools.

**G.MoveInfo**:
js/ui/move-info.js: what the menus, cards, icons and cast animation show about a move (name, type, badge, generated text), read from `G.MoveDefs`.

**badge (move)**:
The small move family glyph on a move icon, derived from the def's shape, motion and anchor for display only, never read by gameplay. Not the gym Badge above.

**7a guard**:
tools/kind-guard.js (run by check.js): fails on any legacy move-table read (`G.Moves.BY_ID`, `G.Kinds`, a move's `kind`) in a game file. Since 7b-2b no file is exempt except js/net/ (D-COOP).

**legacy-7b**:
History: a code comment tag on a legacy read left for slice 7b. None remain, and the guard excuses nothing for it (it still lists a stray tag).

**enemy owner**:
A gym leader mon casting through G.MoveSim as the cast's owner, with its own cards (D-ENEMY, slice 7a).

**instance**:
One live hitbox spawned by a cast (one per `space.count`).

**group**:
The `count` instances of one spawn; a persistent slot keeps one group alive.

**`endOn`**:
The conditions that end an instance (time, wall, offScreen, returned, ownerDeath, notActive).

**persistent**:
`persistent: true`: the slot owns the move's life, no cooldown; ends on a swap, stun or faint, respawns after an instance end (H25).

**aura / pulse**:
A persistent move with no `endOn` / with an `endOn` time, which respawns each cycle.

**self-cast**:
`anchor: self`, a shapeless cast (Swords Dance); its effects carry their own duration, no `endOn`.

**hit policy**:
When one instance may hit the same enemy again: `oncePerInstance`, `interval` (every `rehit` s).

**pierce**:
How many enemies an instance passes through before it ends; UNLIMITED never ends it.

**lens**:
The area multiplier (`moveRadiusMul`) applied to radii, arcs, beam length and orbit radius.

**cast gate**:
The check that holds a cast until a target is in reach (retries every 0.05 s). Not the stage Gate. A leader's attacks wait on it too, as yours (2026-11-09-42-leader-attacks-wait-on-your-cast-gate; built in #47a: the tell starts when the gate would let the move fire, G.MoveSim.gateOpen).

**maxStacks**:
RETIRED 2026-10-30 by the stat stage model; on the new path until slice 5, the live applications one self-buff move may keep on its host.

**stage tracker**:
One per (Pokemon, move, stat) on a recipient: its stages, Gate timer and Duration timer.

Rule: docs/COMBAT-RULES.md "Stat stages"

**stage Gate**:
The minimum time between two climbs of one stage tracker, 6.0 s at base (x2 for self drops). Not the cast gate.

Rule: docs/COMBAT-RULES.md "Stat stages"

**stage Duration**:
How long a stage tracker holds after its last success, 6.1 s at base.

Rule: docs/COMBAT-RULES.md "Stat stages"

### Design language

Words used in plans and refactors. In this codebase a module is usually one `G.*` file under js/.

**Module**:
Anything with an interface and an implementation: a function, a `G.*` file, or a slice that spans several files.
_Avoid_: unit, component, service

Rule: docs/TEST-FIRST.md "Designing for testability"

**Interface**:
Everything a caller must know to use a module correctly: the call shape, but also invariants, ordering, error modes, required setup and timing.
_Avoid_: API, signature

Rule: docs/TEST-FIRST.md "Designing for testability"

**Seam**:
The place where a module's interface lives, where behavior can be changed or observed without editing inside. Tests are written at seams, and each slice's plan names its seams.
_Avoid_: boundary (docs/SIM-PRESENT-BOUNDARY.md keeps its name)

Rule: docs/TEST-FIRST.md "The cycle", step 1

**Depth**:
How much behavior a caller or test gets per unit of interface it must learn. A deep module hides a lot behind a small interface; a shallow one has an interface nearly as complex as its implementation.

Rule: docs/TEST-FIRST.md "Designing for testability"

**Leverage**:
What callers get from depth: one implementation pays back across many call sites and scenarios.

**Locality**:
What maintainers get from depth: change, bugs and knowledge concentrate in one place instead of spreading across callers.

**Deletion test**:
Imagine deleting a module. If the complexity vanishes, it was a pass-through; if it reappears across many callers, the module was earning its keep.

Rule: docs/TEST-FIRST.md "Designing for testability"

### How we work

**Slice**:
One separately planned, built and feel-tested step of a feature, with its own harness scenarios.

Rule: docs/TEST-FIRST.md

**Prose plan**:
The no-code plan in chat that Jess approves before any game-code edit.

Rule: CLAUDE.md "Edit boundary and workflow"

**Feel test**:
Jess playing a change in the browser. It is the last check of every change.

Rule: CLAUDE.md "Edit boundary and workflow"

**Requirement tag**:
`[Approved]`, `[Legacy behavior]`, `[Proposed]` or `[Open]`, the status of a spec rule.

Rule: CLAUDE.md "Requirement tags"

**intent scenario**:
A staged fight in move-intent-scenarios.json with a hand-derived expected outcome.

Rule: docs/MOVE-INTENT.md

**batch review**:
Jess's sign-off of newly routed moves that have no MOVE-INTENT entry.

Rule: CLAUDE.md "Move review rule"

**harness / mutation runner**:
An offline test file under docs/proposals/ run by check.js / a script that breaks the code on purpose to prove the harness catches it.

Rule: docs/TEST-FIRST.md

## Keeping this file

- A glossary, not a spec: each entry says what a thing IS in one or two sentences. The rule lives in the spec named on its `Rule:` line.
- Only this project's terms. General programming terms do not belong.
- English only. Spanish code names go in docs/SPANISH-CODE-REFERENCE.md.
- When a term is resolved in chat, the assistant adds or edits the entry right away and says so in one line. When a word is fuzzy, overloaded, or conflicts with an entry here, or when something said about how a thing works disagrees with the code or spec, the assistant flags it in one line and asks which is right.
- Terms the assistant could not define from the specs: link, tempo, power, enrage. They wait for a grilling session.
