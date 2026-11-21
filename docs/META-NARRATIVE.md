# PokéSwarm - Meta-Narrative: Pokémon Escaping the Code

## Core Concept

PokéSwarm has a hidden metanarrative in which the Pokémon are unknowingly attempting to escape the code that defines and confines their world.

Each run represents another attempt by the Pokémon to break free. The player believes they're simply taking their team through increasingly difficult regions, defeating Gym Leaders, Elite Four members, and Legendary Pokémon. Beneath that conventional gameplay loop, however, the Pokémon are repeatedly pushing against the boundaries of their simulated existence.

The central inspiration is the escape structure of *Hades*, combined with the environmental storytelling and subtle narrative delivery of *Dark Souls*.

The story should be discovered, not explained.

## Character Awareness

There are two distinct levels of awareness:

**Wild Pokémon and NPC Pokémon**
- They are part of the code and do not understand that their world is artificial.
- They behave naturally within their established personalities.
- They may occasionally exhibit anomalies caused by the underlying code struggling to maintain its rules.
- Their dialogue should never explicitly reference simulations, programming, code, or being trapped.

**The Player's Pokémon**
- These Pokémon are different.
- They gradually become aware of something being wrong with their existence.
- Their repeated attempts to escape are the driving force behind the metanarrative.
- Their awareness is distinct from the ordinary inhabitants of the world.

Pokémon do not speak conversationally in this game. Do not introduce conventional spoken dialogue for them.

## Narrative Delivery Philosophy

The metanarrative must be extremely subtle.

The desired experience is:
1. An individual event or line seems completely ordinary.
2. Additional events occur across subsequent runs and regions.
3. The player gradually recognizes recurring patterns.
4. Previously insignificant details acquire new meaning.
5. The player pieces together the truth without the game explicitly explaining it.

Avoid overt exposition, ominous declarations, fourth-wall-breaking jokes, or characters suddenly behaving like they know they're in a video game.

The writing should preserve each character's established personality.

## Gym Leader Dialogue

Gym Leaders already have dialogue associated with specific gameplay triggers. The metanarrative can introduce extremely rare alternative dialogue lines.

These lines should sound completely natural for the character and have an ordinary interpretation when first encountered.

Example: Brock (Kanto Gym Leader)

Initial line:
"You're just like every other trainer I've seen."

This sounds like an ordinary observation from an experienced Gym Leader.

However, in retrospect, it can suggest that Brock has encountered the same trainer repeatedly across countless attempts.

Potential later progression line:
"How many times do I have to lose to you?"

This line could become available after approximately 400 runs when the player fights Brock.

The progression from the first line to the second should be extremely gradual. The player should not immediately recognize the connection.

Brock's established personality revolves around rock-type Pokémon, foundations, defense, and standing one's ground. Meta-dialogue should remain consistent with that characterization.

## Gameplay Anomalies

The code occasionally fails to enforce the rules of its own world.

These anomalies should initially resemble unusual gameplay behavior or bugs rather than obvious narrative events.

### 1. Incorrectly Typed Elite Pokémon

- Elite Pokémon occasionally spawn with attacks that don't match their expected typing.
- Example: A Charizard that uses Water-type attacks.
- The underlying idea is that the code is struggling to maintain the rules governing individual Pokémon.
- The anomaly should not be explicitly identified or explained to the player.

The exact probability and implementation are still undecided.

### 2. First UI Glitch - Return Home Button

The first intentional interface anomaly occurs after the player defeats Lance, the final Elite Four member in Kanto.

Trigger behavior:
- The player must have defeated Lance at least once.
- The Return Home button glitches the first time the player subsequently chooses to return home.
- If the player chooses to continue toward the Legendary Pokémon instead, the glitch does not occur yet.
- If they later choose to return home after that point, the glitch occurs.
- It happens exactly once across the player's progression.
- It does not repeat on subsequent runs.

The glitch should be brief and unexplained. No accompanying exposition or announcement.

Implementation should use persistent progression state and keep the narrative trigger separate from the button's visual animation.

### 3. Abnormal Damage Anomaly

A later anomaly involves a player's attack dealing approximately 1,000,000% more damage than intended.

This represents the Pokémon momentarily breaking the rules governing their world.

Established probability:
- 1 in 1,048,576 per individual target damage calculation.
- This is a reference to 1 MiB (1,048,576 bytes).
- Damage is calculated independently for every target hit, so each target damage calculation is an independent opportunity.
- The anomaly is intended to be extraordinarily rare.

The game is a horde-style action game with many simultaneous attacks. A typical 60-minute run may generate approximately 70,000-150,000 individual target damage calculations.

At the established probability, the estimated chance of seeing the anomaly in one run is approximately 6.5%-13.3%.

The anomaly should not be announced or explained. It should look like an inexplicable breach in the game's damage rules.

## Progression and Pacing

The game currently has:
- 9 regions.
- 12 bosses per region.
- 108 total boss encounters across the full progression.
- A typical run consisting of approximately 60 minutes.
- A five-minute gameplay cycle for each Gym/boss progression segment.

These encounters provide substantial room to distribute narrative breadcrumbs.

The metanarrative should develop across multiple regions and repeated runs rather than being concentrated in one sequence.

The first UI glitch after Lance is an early milestone, not a major revelation.

Later anomalies and dialogue should gradually build upon the player's accumulated understanding.

## UI and Visual Identity

The game's UI is being unified around a clean, modern aesthetic inspired by Pokémon Black 2 and contemporary cyber aesthetics.

The interface should generally feel:
- Clean.
- Consistent.
- Deliberate.
- Modern.
- Readable.

Glitch effects should be occasional disruptions to this established visual language, not a constant aesthetic.

The contrast is important: the more trustworthy and consistent the ordinary interface feels, the more meaningful an unexpected glitch becomes.

## Creative Constraints

When developing this narrative:

- Do not turn the game into an overt science-fiction story.
- Do not have ordinary NPCs explicitly acknowledge the code.
- Do not give Pokémon conventional conversational dialogue.
- Do not explain anomalies when they happen.
- Do not overuse glitch effects.
- Do not make every unusual encounter a scripted narrative event.
- Preserve established Pokémon personalities and recognizable franchise conventions.
- Favor subtle repetition, environmental clues, rare dialogue variations, and unexplained gameplay anomalies.

**The ultimate goal:** Players should finish the game and realize that the story they were playing was not simply about defeating increasingly powerful Pokémon. It was about a group of Pokémon repeatedly attempting to escape the world that contains them - and the code doing everything it can to keep them there.