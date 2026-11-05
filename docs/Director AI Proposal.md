# TheDirector - Enemy Encounter AI

1. Core philosophy
TheDirector isn't simply an enemy spawner. It's an encounter-management system responsible for controlling the overall combat experience.

Your goal was to move away from overwhelming players with large quantities of relatively unintelligent enemies.

Instead, you wanted:

- Fewer, smarter enemies.
- More deliberate enemy compositions.
- Enemies that coordinate and create interesting combat situations.
- Difficulty that responds to player performance.
- Combat that ebbs and flows rather than maintaining constant maximum pressure.
The central idea was that difficulty should come from encounter composition and behavior, not just enemy quantity and health.

1. Dynamic threat budget
You accepted a threat-budget system.

Every enemy archetype has an associated threat cost. TheDirector manages how much threat can be active in an encounter.

For example, your enemy classes included:
Enemy class Combat role
Plain Basic melee pressure
Charger Forces movement
Flanker Attacks from unexpected angles
Bomber Area denial
Beam Sustained directional threat
Lobber Ranged area attacks
Shielder Protects other enemies
Healer Sustains enemy groups
Haster Improves enemy speed or pressure

TheDirector considers not only individual enemy costs but also the synergies between enemy types.

A healer and shielder together, for example, may be substantially more dangerous than their individual threat costs suggest.
3. Utility AI and rolling observation windows
This was one of your more important architectural decisions.

You specifically wanted theDirector to use Utility AI rather than a collection of rigid difficulty thresholds.

The architecture we discussed was:
Observation window

Collect player and encounter performance data

Utility evaluation

Evaluate current combat conditions and desired pressure

Execution

Adjust threat generation, composition, frequency, and coordination

Repeat continuously using updated observations

You wanted two timescales:

Short observation window

- Immediate damage pressure.
- Player being surrounded.
- Recent damage taken.
- Immediate encounter conditions.
Long observation window
- Sustained player DPS.
- Kill rate.
- Player health trends.
- Movement and activity.
- General combat performance.
The distinction matters because you don't want theDirector reacting dramatically to one lucky attack or a momentary spike in damage.

1. Inputs theDirector evaluates
The performance metrics we discussed included:
Metric What it tells theDirector
Player DPS How quickly the player eliminates threats
Damage received How much pressure enemies are applying
HP trend Whether the player is winning or losing attrition
Kill rate How efficiently the player clears enemies
Downtime Whether the player is experiencing insufficient pressure
Movement Whether the player is stationary or actively repositioning

TheDirector uses these observations to evaluate whether the encounter needs more or less pressure.
5. What theDirector controls
Importantly, theDirector has multiple levers. It doesn't simply increase enemy health or spawn more enemies.

It can adjust:

1. Population: How many enemies are active.
2. Composition: Which archetypes appear together.
3. Coordination: How enemies work together.
4. Frequency: How often new threats enter the encounter.
5. Complexity: How challenging the overall encounter becomes.
This is what makes the architecture interesting. Two encounters can have the same threat budget but feel completely different because of their compositions.
6. Important design constraints
We also established several guardrails:

- No rubber-banding: Don't make enemies suddenly stronger because the player is performing well.
- Gradual adjustments: Threat generation should change smoothly.
- Rolling averages: Avoid reacting to isolated events.
- Composition matters: Don't treat all threat points as interchangeable.
- Avoid constant pressure: Allow combat intensity to rise and fall.

1. Your planned implementation sequence
We discussed building this incrementally rather than implementing the entire adaptive AI immediately.
Phase Implementation
1 Fixed threat budget
2 Enemy composition and threat costs
3 Player performance tracking
4 Adaptive Utility AI director

This is important because you can test whether the threat-budget model works before introducing adaptive behavior.
