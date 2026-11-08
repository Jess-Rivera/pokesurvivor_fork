# LEADER-AI, the AI player that drives a Player-entity leader

- **Role:** The single home for how a Player-entity leader decides what to do: what it can see, what it remembers, how it is limited, and how each leader's behavior is authored.
- **Owns:** the AI player, the information model (rosters, reveals), run memory and behavior tracking, the fairness limits, the settings list, confidence, triggers and lines, the checks.
- **Does not own:** what a leader IS (stats, HP, cards, items, restrictions, team, faint swaps): docs/COMBAT-RULES.md "Host model". Gym progression and rosters: BOSS-REWORK.md, docs/GYM-ROSTERS.md.
- **Source:** grilling session, Jess 2026-11-08 (decision `2026-11-08-leader-ai-an-ai-player-through-your-controls`). Designed fresh; the frozen docs/proposals/gym-leader-ai-design.md is compared against it afterwards.
- **Code:** not built. Today a leader runs G.Boss.GymBrain (js/entities/boss-ai.js). See "Build order".

## The AI player

- [Approved] ONE MODULE. Every Player-entity leader (Gym Leaders now; Elite Four, Uber and World Boss when they become Player entities) is driven by one AI player module. Each leader's behavior is data in its def (js/data/gyms.js for gyms), never code per leader. It replaces G.Boss.GymBrain on the switched gyms (Misty, Brock) first; gyms 3 to 8 keep the old brain until they switch (slice 12 of the host-model plan).
- [Approved] YOUR CONTROLS ONLY. The AI acts only through the inputs a human player has: a movement heading, the slot key, the swap-mon key and the dodge button. It never calls a cast, a swap or a move effect directly. Anything a leader does that a player cannot do is an authored difference (COMBAT-RULES "Host model", LEADER PRINCIPLE), never a hidden power of the AI. Triggers (below) also act through these inputs.
- [Approved] YOUR RULES. Its inputs obey your rules: the 0.4 s slot hold, the swap lock and trap lock, send-in i-frames, the dodge's two charges and cooldowns, stuns that block input.

## What it can see (the information model)

- [Approved] THE SCREEN ONLY. The AI reads what a human would see on screen: positions, projectiles and hazards in flight, attack tells, HP bars, types, statuses and stage markers, and both rosters. It never reads cooldown timers, hidden numbers (cards, IVs, EVs, nature, exact stats), RNG or your next input. One information layer produces everything the AI and its memory read, so nothing can reach the AI around it.
- [Approved] ROSTERS. Both sides see the other's full roster from the fight's start: each mon's species and whether it is active, on the bench or fainted. The player side gets a matching leader-roster UI (code differs: not built).
- [Approved] REVEALS, per mon of yours (keyed by its copy's `pokemonUUID`, which a fighter carries as `copyUid`; the team slot stands in when it is null):
  - a move is revealed the first time it is cast on screen;
  - a bond is revealed when its moves are seen firing together;
  - a held item is revealed when its effect shows (a Leftovers heal, a Focus Sash save);
  - cards, IVs, EVs, nature and stats are never revealed.
- [Approved] STALE REVEALS. In a later fight of the same run a remembered move still counts as revealed, until it is seen to be missing or for that mon's first 10 s on the field (TUNE), whichever ends first. New moves or items must be revealed again.

## Run memory and behavior tracking

- [Approved] SCOPE. Each leader remembers only its own fights, for the rest of the run. Nothing is shared between leaders and nothing carries into the next run.
- [Approved] STORAGE. In memory only, run-scoped like Silver: created empty at G.Game.startRun, dropped at endRun, never written to the save (a run has no mid-run resume, so there is nothing to migrate). The leader entity is rebuilt every fight, so the store lives outside it and each fight's leader reads and writes its own record.
  - One record per leader, keyed by gym id.
  - Inside it, one entry per mon of yours (keyed as in REVEALS): its revealed moves, bonds and held item, each with when it was last confirmed; its behavior counts; the reason tags counted against its swaps.
  - One team section: patterns across your team (your usual lead, who you send in after a faint).
  - Only observations are stored. Which patterns a leader believes and exploits is derived from the counts with that leader's settings at each fight, so retuning a leader's learning applies to old observations too.
- [Approved] WHAT IS TRACKED, per mon and per team: slot and bond choices (how often you switch, which you favor); mon swaps (how often, out of which mon, into which); dodges (when, how often); your fighting range.
- [Approved] WHY YOU SWAPPED. Every swap is tagged with the visible context at that moment: your HP was low, you were at a type disadvantage, you were trapped or carried a status, the active slot was on cooldown, a leader mon had just been sent in. The tags are counted per mon ("swaps out under 30% HP 4 times in 5"). Plain rules, no machine learning.
- [Approved] FEED. Observations come only from the information layer, at the moment the thing shows on screen (a cast, a swap, a dodge, an item effect).
- Later, not now: a mid-run resume would save this store with the run (every field null-checked with a default, CLAUDE.md "Save-data migration safety"). Co-op would key entries per human player too; deferred (CLAUDE.md "Local-first").

## Fairness: smart, not oppressive

- [Approved] HUMAN LIMITS are the main fairness levers, all authored per leader: a reflex delay before it responds to anything it sees (dodging, aiming), a think interval between slot and swap choices, aim error, and a dodge that reads a threat only after the reflex delay and only with a charge left.
- [Approved] PREDICTION CAP. A pattern the leader believes is acted on at most a capped share of the time (default about 70%, TUNE; a very hard leader can author up to about 95%), and still waits out the delays. A prediction is never certain, so you can bait it.
- [Approved] TELLS stay as an authored difference, on by default for every gym (the existing `tells` restriction); a gym may shorten or remove them.
- [Approved] NO RUBBER BANDING. The leader never secretly eases off when you are losing or presses when you are winning. Difficulty comes only from its settings and build. Confidence changes behavior, never damage or HP.

## Authoring a leader

- [Approved] ONE FLAT LIST OF SETTINGS, no presets. A setting a leader does not author falls back to one baseline value set in code. Starter list:
  - Reaction: `reflex` (seconds), `think` (seconds).
  - `aimError`.
  - Dodge: `dodgeRead` (how often it reads a threat), `dodgeReserve` (charges it keeps back).
  - Style: `aggression`, `range` (preferred distance), `risk`, `buffBias`, `swapWill`.
  - Memory: `memoryUse` (how much its choices lean on revealed moves and your patterns), `learnRate` (how many observations before it believes a pattern), `exploit` (how hard it acts on a believed pattern), `predictCap` (the prediction cap).
  - `randomness` (0 to 1): how often it tries an option that is not its best, so it does not play like a machine.
  - Confidence: `confStart`, `confSwing`, `confMin`, `confMax`.
- [Approved] SWAP AND SLOT CHOICES weigh the type matchup between its mons and your active mon's types, plus your revealed moves (it will not send its Water mon into a Pikachu it has seen use Thunder Wave), scaled by `memoryUse`. Voluntary swaps follow your swap rules, for matchup, low HP, a trap or a buff setup, as often as `swapWill` and confidence allow.
- [Approved] CONFIDENCE is a runtime value, moved by fight events: up on hits landed and an HP or kill lead, down on hits taken and its own faints. Low confidence shifts the style settings toward caution and swapping; high toward aggression. Authored: start, swing, floor and ceiling.
- [Approved] TRIGGERS, a few per leader, each once unless marked repeating.
  - Conditions: fight start; its own HP crossing a line; a faint (yours or its own); you sending in a mon; time elapsed; starting to exploit a pattern.
  - Actions (through your controls): choose a slot, swap to a mon, change a setting for a while, say a line.
- [Approved] LINES. A leader says short authored lines on screen at triggers and, optionally, on a large confidence swing ("Brock: Let's get serious!"; "You always pull Pikachu when it's hurt, don't you?"). New strings are English only (CLAUDE.md "English-native i18n").

## Checks

- [Approved] A dev overlay and log of every AI decision with its reason and scores.
- [Approved] A headless harness that the limits hold: no response faster than `reflex`, no dodge with zero charges, no choice that reads a move it has not seen revealed, nothing read that the information layer did not produce.
- [Approved] Jess's feel test is the final judge. No win-rate simulation for now.

## Build order

[Approved] One slice each, feel-tested before the next (issues filed after the comparison with the frozen proposal):
1. The controls layer and the information model (rosters, reveals), Misty and Brock on the baseline settings.
2. Swap and dodge decisions.
3. Confidence and triggers (with lines).
4. Run memory, behavior tracking and exploiting patterns.
5. Authoring each leader's personality.
The leader-roster UI on the player side is its own issue.
