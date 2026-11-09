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

**AI player**:
The one module that drives every Player-entity leader. It acts only through a human's inputs (heading, slot key, swap-mon key, dodge) and sees only the screen. Not the GymBrain, which it replaces.

Rule: docs/LEADER-AI.md "The AI player"

**Body**:
The thing on the field you interact with: the mon a Player entity fields, where its HP, stats, statuses, stages, slots, dodges and swap lock live, and what you can hit and kill. It obeys the rules and decides nothing. Yours is `G.HumanPlayer`; a leader's is `G.GymLeader` (its authored cast rules, `G.GymLeader.Caster`, are part of the body).

_Avoid_: brain (GymBrain was a body and a decider in one)

Rule: docs/branch-rules/feature-gym-leader-ai.md "Why #40 to #42 exist"

**AI** (of a leader):
The "person" on the other side of the screen: it decides (where to go, which slot, when to dodge or swap) and enforces no rule. Code: `G.LeaderAI`, with what it sees (`G.LeaderInfo`) and remembers (`G.LeaderMemory`). Yours is you at the keyboard. Same thing as the AI player.

Rule: docs/LEADER-AI.md "The AI player"

**Controller**:
The only channel between a decider and a body: the seven calls (heading, dodge, shake, swap mon, swap direction, slot keys, cycle). The decider answers, the body reads the answers under its rules. Yours is `G.HumanPlayer.KEYBOARD`; a leader's is its AI's `controller`. Rules live in the body, decisions in the AI, and only the controller crosses between them.

Rule: docs/LEADER-AI.md "YOUR CONTROLS ONLY"

**Sim pass**:
The last step of a Player entity's frame: the game resolving rules and inputs (move timers, heal over time, commitments, due casts, then the shared step). It cares about nothing upstream. Yours is `G.MoveRoute.tick`; a leader's runs `G.MoveSim.turn` at the end of its own frame. The flow for every Player entity: the AI (or you) decides, the controller carries it, the body follows it under its rules, the sim pass resolves.

Rule: docs/decisions/2026-11-09-every-player-entity-runs-one-flow-decide-hands-body-sim.md

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
The check that holds a cast until a target is in reach (retries every 0.05 s). Not the stage Gate.

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
