# LEADER-AI, the AI player that drives a Player-entity leader

- **Role:** The single home for how a Player-entity leader decides what to do: what it can see, what it remembers, how it is limited, and how each leader's behavior is authored.
- **Owns:** the AI player, the information model (rosters, reveals), run memory and behavior tracking, the decision loop, the fairness limits, the settings list, confidence, pacing, triggers and lines, the checks.
- **Does not own:** what a leader IS (stats, HP, cards, items, restrictions, team, faint and voluntary swap consequences): docs/COMBAT-RULES.md "Host model". Gym progression and rosters: BOSS-REWORK.md, docs/GYM-ROSTERS.md.
- **Source:** grilling session, Jess 2026-11-08 (decision `2026-11-08-leader-ai-an-ai-player-through-your-controls`), then compared with the 2026-11-07 proposal (docs/proposals/gym-leader-ai-design.md and the slice 9 v2 map, now history); the parts adopted from them are in this file.
- **Code:** slice 1 built 2026-11-08 (#22): G.LeaderAI (js/entities/leader-ai.js), G.LeaderInfo (js/systems/leader-info.js); the leader's swap step in js/systems/gym-arena.js. Slice 2 built 2026-11-08 (#31): the swap and dodge decisions in G.LeaderAI (settings G.LeaderAI.BASE, authored per gym as `ai` in js/data/gyms.js), the threats view in G.LeaderInfo, the bench faint pay in gym-arena.js. Slice 3 built 2026-11-08 (#32): confidence, pacing (the stance is held on GymBrain through `hold`), the dodge lean, the gap-closing dodge, triggers and lines in G.LeaderAI (constants G.LeaderAI.CONF and PACE; Misty and Brock author `ai.aggression`, `ai.triggers` and `ai.lines`), the fight events and rolling windows in G.LeaderInfo. The GymBrain (js/entities/boss-ai.js) still decides movement, slots and casts underneath until slice 5. Test: docs/proposals/leader-ai-harness.js (mutation check: leader-ai-mutate.js). Dev: G.Debug.leaderAI({ swaps, dodges }), and the decision lines in the G.Debug.hitbox() overlay. See "Build order".

## The AI player

- [Approved] ONE MODULE. Every Player-entity leader (Gym Leaders now; Elite Four, Uber and World Boss when they become Player entities) is driven by one AI player module, one per leader team. Each leader's behavior is data in its def (js/data/gyms.js for gyms), never code per leader. It replaces G.Boss.GymBrain on the switched gyms (Misty, Brock) first; gyms 3 to 8 keep the old brain until they switch (slice 12 of the host-model plan). It is separate from the wild Director: no threat budget, no population control.
- [Approved] YOUR CONTROLS ONLY. The AI acts only through the controller your keyboard answers, all seven calls of G.PlayerEntity.IDLE: `axis` (heading), `dodge`, `shake`, `swapSlot` (swap mon), `swapDir`, `slots` (slot keys), `cycles`. It never calls a cast, a swap or a move effect directly. Anything a leader does that a player cannot do is an authored difference (COMBAT-RULES "Host model", LEADER PRINCIPLE), never a hidden power of the AI. Triggers (below) also act through these calls. Shake-off stays on the authored `autoShake` restriction for now; `shake` answers nothing.
- [Approved] YOUR RULES. Its inputs obey your rules: the 0.4 s slot hold, the swap lock and trap lock, send-in i-frames, no swap in the air, the dodge's two charges and cooldowns, stuns that block input. A refused request is a no-op, as yours is.
- [Approved] VISIBLE. Every AI action reads on screen as the same action of yours would (a swap, a dodge, a stance change), never as a hidden number.

## What it can see (the information model)

- [Approved] THE SCREEN ONLY. The AI reads what a human would see on screen: positions, projectiles and hazards in flight, attack tells, HP bars, types, statuses and stage markers, and both rosters. It never reads live cooldown timers, hidden numbers (cards, IVs, EVs, nature, exact stats), RNG or your next input. One information layer produces everything the AI and its memory read, so nothing can reach the AI around it.
- [Approved] ROSTERS. Both sides see the other's full roster from the fight's start: each mon's species and whether it is active, on the bench or fainted. The player side gets a matching leader-roster UI (code differs: not built).
- [Approved] REVEALS, per mon of yours (keyed by its copy's `pokemonUUID`, which a fighter carries as `copyUid`; the team slot stands in when it is null):
  - a move is revealed the first time it is cast on screen ("on screen" means cast at any point since the fight's start, Jess 2026-11-08; no camera check), and then the AI knows everything about it: type, category, power, shape, effects and its cooldown length. Never how much of its live timer is left;
  - a bond is revealed when two different moves of one mon are cast with no slot switch seen between them (Jess 2026-11-08). Only the active slot casts, so both came from one slot; the switch is visible (your setActive ring), so the AI may know it. No time window: a bond whose moves have unlike cooldowns still reveals. Never read from move data or the SimBus;
  - a held item is revealed when its effect shows (a Leftovers heal, a Focus Sash save). Code differs: split out of slice 1 to issue #36 (it may ride an item rework);
  - cards, IVs, EVs, nature and stats are never revealed.
- [Approved] STALE REVEALS. In a later fight of the same run a remembered move still counts as revealed, until it is seen to be missing or for that mon's first 10 s on the field (TUNE), whichever ends first. New moves or items must be revealed again.

## Run memory and behavior tracking

- [Approved] SCOPE. Each leader remembers only its own fights, for the rest of the run. Nothing is shared between leaders and nothing carries into the next run. Per-fight state (field time, swaps used, who was saved at low HP) lives on the AI, never on the mons.
- [Approved] STORAGE. In memory only, run-scoped like Silver: created empty at G.Game.startRun, dropped at endRun, never written to the save (a run has no mid-run resume, so there is nothing to migrate). The leader entity is rebuilt every fight, so the store lives outside it and each fight's leader reads and writes its own record.
  - One record per leader, keyed by gym id.
  - Inside it, one entry per mon of yours (keyed as in REVEALS): its revealed moves, bonds and held item, each with when it was last confirmed; its behavior counts; the reason tags counted against its swaps.
  - One team section: patterns across your team (your usual lead, who you send in after a faint).
  - Only observations are stored. Which patterns a leader believes and exploits is derived from the counts with that leader's settings at each fight, so retuning a leader's learning applies to old observations too.
- [Approved] WHAT IS TRACKED, per mon and per team: slot and bond choices (how often you switch, which you favor); mon swaps (how often, out of which mon, into which); dodges (when, how often); your fighting range.
- [Approved] WHY YOU SWAPPED. Every swap is tagged with the visible context at that moment: your HP was low, you were at a type disadvantage, you were trapped or carried a status, the active slot was on cooldown, a leader mon had just been sent in. The tags are counted per mon ("swaps out under 30% HP 4 times in 5"). Plain rules, no machine learning.
- [Approved] FEED. Observations come only from the information layer, at the moment the thing shows on screen (a cast, a swap, a dodge, an item effect).
- [Approved] ROLLING WINDOWS, per fight: averages over a short window (about 2 s) and a long one (about 15 s, TUNE) of damage it deals and takes, both HP trends, your movement (speed, standing still) and the time since it last landed a hit. They feed confidence and pacing.
- Later, not now: a mid-run resume would save this store with the run (every field null-checked with a default, CLAUDE.md "Save-data migration safety"). Co-op would key entries per human player too; deferred (CLAUDE.md "Local-first").

## The decision loop

- [Approved] TICK. The AI decides on a tick (the `think` interval, baseline 0.25 s, TUNE), never inside a tell or a move commitment. The reflex delay applies on top to anything it reacts to.
- [Approved] TELL READING (Jess, 2026-11-08, after the slice 2 feel test). "Inside a tell" means its wind-up, until the move fires; the 0.35 s recovery after it is not the tell. A think tick that lands inside a tell or a commitment is not skipped: its choice waits for the first frame out of it. Why: at close range GymBrain is in a tell or its recovery about 86% of the time, so with the recovery counted and ticks skipped Misty never swapped and most dodges expired.
- [Approved] HARD GATES FIRST, never scored: your rules (Team.canSwap, tryDodge) and the AI's own gates (the stall guards below, no tell, no commitment). [Open] The full list of AI gates is defined in the slice that first needs each one.
- [Approved] SCORED CHOICES. Each open action (STAY, a slot, a swap to bench mon i, a dodge, a pacing change) gets a score from considerations times the leader's settings. STAY has a baseline, and an action must beat it by a margin, so nothing fires without a reason and choices do not flicker.
- [Approved] DETERMINISTIC RATES. Rates and the prediction cap are fixed counters ("acts 7 times in 10"), not dice. `randomness` draws from a random source seeded per fight; a harness fixes the seed, so every outcome stays hand-derivable.
- [Approved] THREAT, for dodging: one of your live shapes whose path crosses its body soon.
- [Approved] DODGE DIRECTION (Jess, 2026-11-08). Sideways to the threat's path, to the side with more open floor. Later, aggression and confidence lean it: the more aggressive or confident, the more it angles toward you to close distance; the less, the more it angles away. Built (slice 3, #32): it turns by (effective aggression - 0.5) x 2 x `lean` degrees (baseline 45), never past you.
- [Approved] GAP-CLOSING DODGE (Jess, 2026-11-08). With enough effective aggression (baseline 0.7, TUNE) a leader may also dodge with no threat at all, purely to close distance so a short-range move of its own comes into reach. It spends a charge like any dodge, so `dodgeReserve` keeps charges back for threats. It also always keeps one more charge back, even with `dodgeReserve` 0 (Jess, 2026-11-08, decision B). Built (slice 3, #32): on the think tick, with a close move ready and you outside its reach but within one dodge of it, straight at you; never in a breather.
- [Approved] DODGE READ BAG (Jess, 2026-11-08; replaces the same day's roll with a missed-dodge bonus). `dodgeRead` is a shuffle bag: each block of 10 threats holds exactly that many reads (baseline 6), in an order shuffled from its own per-fight seeded source (separate from `randomness`'s). No streak cap: a run across a block join may be longer (Jess, 2026-11-08). Exact over every block, never certain, hand-derivable with the seed fixed. One threat is one of your casts with shapes in flight (a fan counts once). Built in slice 2 (#31).
- [Approved] THREAT TIMING (Jess, 2026-11-08). Threats are noticed on any frame, not only on the think tick; a read threat is answered exactly `reflex` later. A threat is a shape whose path reaches its body within 0.6 s (TUNE). Swaps and every other choice wait for the tick.
- [Approved] Dodges run in every switched fight, loop 1 single-mon fights included (Jess, 2026-11-08).

## Fairness: smart, not oppressive

- [Approved] HUMAN LIMITS are the main fairness levers, all authored per leader: a reflex delay before it responds to anything it sees (dodging, aiming; baseline 0.15 s, TUNE), the think interval, aim error, and a dodge that reads a threat only after the reflex delay and only with a charge left.
- [Approved] PREDICTION CAP. A pattern the leader believes is acted on at most a capped share of the time (default about 70%, TUNE; a very hard leader can author up to about 95%), and still waits out the delays. A prediction is never certain, so you can bait it.
- [Approved] STALL GUARDS. A voluntary swap needs `minField` seconds on the field first (baseline 8 s; a faint swap and Re-Do start the clock too), and at most `swapLimit` voluntary swaps per fight (absent no cap, 0 never).
- [Approved] TELLS stay as an authored difference, on by default for every gym (the existing `tells` restriction); a gym may shorten or remove them.
- [Approved] NO RUBBER BANDING. The leader never changes stats, HP, damage, tempo, cooldowns or any authored number, and never secretly eases off when you are losing or presses when you are winning. Difficulty comes only from its settings and build. Confidence and pacing change behavior only.

## Authoring a leader

- [Approved] ONE FLAT LIST OF SETTINGS, no presets. A setting a leader does not author falls back to one baseline value set in code. Any setting may be keyed per loop, like the build keys. Starter list:
  - Reaction: `reflex` (seconds), `think` (seconds).
  - `aimError`.
  - Dodge: `dodgeRead` (how often it reads a threat), `dodgeReserve` (charges it keeps back).
  - Style: `aggression` (also drives pacing, below), `range` (preferred distance), `risk`, `buffBias`, `swapWill`.
  - Swaps: `minField`, `swapLimit`, and the swap thresholds (below).
  - Memory: `memoryUse` (how much its choices lean on revealed moves and your patterns), `learnRate` (how many observations before it believes a pattern), `exploit` (how hard it acts on a believed pattern), `predictCap` (the prediction cap).
  - `randomness` (0 to 1): how often it tries an option that is not its best, so it does not play like a machine.
  - Confidence: `confStart`, `confSwing`, `confMin`, `confMax`.
- [Approved] SWAP AND SLOT CHOICES weigh the matchup and your revealed moves, scaled by `memoryUse`. Voluntary swaps follow your swap rules, for hard CC, low HP, matchup, a trap or a buff setup, as often as `swapWill` and confidence allow. The slice 9 v2 swap triggers are considerations, with their numbers as the baseline thresholds (TUNE): asleep or frozen with 1.5 s or more left (to the healthiest bench mon); under 25% HP with no self heal left, once per mon (to the best matchup at 50% HP or more); a bench matchup 2x the active's or better (that mon, at 40% HP or more).
- [Approved] MATCHUP, per mon m: offense = its best open damaging move's type x your active mon's types x STAB 1.5; defense = max(0.25, your attack's type x m's types); score = offense / defense. Your attack is your active mon's most threatening revealed move; before any has shown, the AI guesses an attack of your mon's own type (Pikachu: Electric), replaced as soon as a real move shows. Ties (Jess, 2026-11-08): "most threatening" is the highest type multiplier against m, then the higher power; for a two-type mon with no reveal, the guess is the type that hits m harder. Worked: you Bulbasaur with Vine Whip, Staryu 1 / 2 = 0.5, Seel 2 / 2 = 1.0, so Seel comes in after `minField`; you Charmander with Ember, Staryu and Seel both 3 / 0.5 = 6, so no swap.
- [Approved] CONFIDENCE is a runtime value, moved by fight events and the rolling windows: up on hits landed and an HP or kill lead, down on hits taken and its own faints. Low confidence shifts the style settings toward caution and swapping; high toward aggression. Authored: start, swing, floor and ceiling.
  - (Jess, 2026-11-08, slice 3.) One value per leader team, 0 to 1 (baseline start 0.5, floor 0.2, ceiling 0.9, TUNE), not per mon; its own faint drops it. It shifts an EFFECTIVE AGGRESSION (the authored `aggression` nudged up or down by confidence), which is what pacing, the dodge lean and the gap-closing dodge read, and it shifts the swap choice (built as the STAY margin: lower when unsure, higher when sure; there is no separate `swapWill` setting yet). The other style settings (`range`, `risk`, `buffBias`) wait for slice 5.
  - Built (slice 3): what moves it is only what G.LeaderInfo shows: hits from the damage events (fractions of the struck mon's max HP), faints, and the long window's trade. The numbers: BALANCE.md "Leader AI".
- [Approved] PACING, driven by effective aggression. It is what you see: at any moment the leader is in one stance, breather, neutral or push. It is a visible stance change, never a hidden number. Per leader team, not per mon (Jess, 2026-11-08).
  - PUSH: the close stance, walking in to attack. It starts on frustration (a long spell without landing a hit; baseline 6 s, sooner at higher effective aggression) or to press an advantage (high confidence while you are hurt).
  - BREATHER (Jess, 2026-11-08, replaces "far stance, no new tell"): after sustained pressure on you the leader backs off into the far stance and, when the active mon has a buff or heal slot, picks it with the slot keys. Nothing else: moves fire automatically and your controls have no hold fire, so it never withholds a cast. Self-buffs and heals still cast. Higher effective aggression means shorter, rarer breathers.
  - A breather has a maximum share of the whole fight's time (baseline 25%, TUNE); a swap does not reset it. A mon sent in arrives in neutral, which ends a breather.
- [Approved] TRIGGERS, a few per leader, each once unless marked repeating.
  - Conditions: fight start; its own HP crossing a line; a faint (yours or its own); you sending in a mon; time elapsed; starting to exploit a pattern (code differs: slice 4, #33; the others are slice 3, #32).
  - Actions (through your controls): choose a slot, swap to a mon, change a setting for a while, say a line.
  - Built (slice 3; the stall-guard skip approved by Jess, 2026-11-08): authored as `ai.triggers` in js/data/gyms.js (the shape is in the comment above AI_KEYS there; the validator checks it). A trigger waits out a tell or commitment, as every choice does. A slot press obeys your slot hold and a swap your swap rules (lock, trap, Fly); a trigger's swap does not wait for the AI's own stall guards (`minField`, `swapLimit`), since it is authored, but it counts as a voluntary swap. An HP trigger fires when the mon on the field crosses its line from above.
- [Approved] LINES. A leader says short authored lines on screen at triggers and, optionally, on a large confidence swing (in from slice 3, with a cooldown so they do not spam; Jess, 2026-11-08) ("Brock: Let's get serious!"; "You always pull Pikachu when it's hurt, don't you?"). A voluntary swap always shows the ring plus "<leader> switches to <mon>!", with no camera kick and no boss sound. New strings are English only (CLAUDE.md "English-native i18n").
  - Built (slice 3; Jess, 2026-11-08, decision C, the 4 s wait approved at the feel test): a line shows as "<leader>: <line>" on the banner. While another banner is up it waits, at most 4 s, then it is dropped. Swing lines are `ai.lines` { up, down }.

## Checks

- [Approved] A dev overlay and log of every AI decision with its reason and scores.
- [Approved] A headless harness that the limits hold: no response faster than `reflex`, no decision inside a tell or commitment, no dodge with zero charges, no choice that reads a move it has not seen revealed, nothing read that the information layer did not produce.
- [Approved] Each slice opens with its goal, how we know it is done, and the test that validates it (docs/branch-rules/feature-gym-leader-ai.md "Slice shape"); that test is written at the slice's start.
- [Approved] Jess's feel test is the final judge. No win-rate simulation for now.

## Build order

[Approved] One slice each, feel-tested before the next:
1. (Built 2026-11-08, #22; held-item reveals split to #36.) The controls layer and the information model (rosters, reveals). The AI player wraps GymBrain's movement and pickSlot as its `axis` and `slots` answers, so Misty and Brock play exactly as today (behavior-neutral), on the baseline settings.
2. (Built 2026-11-08, #31.) Swap and dodge decisions (the decision loop, the matchup, the stall guards, the dodge bag).
3. (Built 2026-11-08, #32; feel-tested and approved.) Confidence, pacing and triggers (with lines), the dodge lean and the gap-closing dodge.
4. Run memory, behavior tracking and exploiting patterns.
5. Authoring each leader's personality; GymBrain's remaining pieces replaced by the AI player's own.
The leader-roster UI on the player side is its own issue.
