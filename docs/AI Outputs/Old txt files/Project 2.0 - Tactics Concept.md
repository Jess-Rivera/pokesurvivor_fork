# Project 2.0: Pokemon tactics roguelite

Parked until 1.0 ships. Concept only, nothing decided (see "Open calls"). Written 2026-11-14.

An isometric tactics roguelite (FFT, Tactics Ogre Reborn, Triangle Strategy, Into the Breach) built on PokeSurvivor's data
and rules. Free fan game.

## 1. The run

Same skeleton as PokeSurvivor (run, drafts, gym bosses, a collection that persists). Only the fight changes.

```mermaid
flowchart LR
  A["Pick a team<br/>from the Pokebox"] --> B["Region map<br/>branching nodes"]
  B --> C{"Next node"}
  C -->|battle| D["Tactical battle"]
  C -->|event| E["Event: recruit,<br/>item, heal"]
  C -->|shop| F["Move Shop"]
  D -->|won| G["Draft: a move,<br/>an item or a recruit"]
  G --> B
  E --> B
  F --> B
  B --> H["Gym battle<br/>the region's boss map"]
  H -->|won| I["Badge,<br/>next region"]
  I --> B
  D -->|team lost| J["Run ends"]
  H -->|team lost| J
  J --> K["Keep caught copies<br/>and unlocks"]
  K --> A
  classDef boss fill:#3d2f10,stroke:#fbbf24,color:#ececf1
  classDef fight fill:#1e2a44,stroke:#60a5fa,color:#ececf1
  classDef endnode fill:#3d1a1a,stroke:#f87171,color:#ececf1
  class H boss
  class D fight
  class J endnode
```

## 2. What each inspiration brings, and the Pokemon twist

```mermaid
flowchart LR
  subgraph SRC["Inspirations"]
    FFT["Final Fantasy Tactics"]
    TOR["Tactics Ogre Reborn"]
    TRI["Triangle Strategy"]
    ITB["Into the Breach"]
    XCOM["XCOM 2"]
  end
  subgraph MECH["Mechanics in 2.0"]
    HGT["Height: climb limits,<br/>range from high ground,<br/>line of sight"]
    FACE["Facing: side and back<br/>hits land harder"]
    ELEM["Elemental terrain:<br/>attacks change tiles"]
    INTENT["Enemy intent shown<br/>before your turn"]
    PUSH["Push as a main verb"]
    CHUNK["Maps from handmade chunks"]
  end
  subgraph POKE["The Pokemon twist"]
    P1["Flying and Levitate ignore height,<br/>Rock and Ground climb cliffs,<br/>Water types swim"]
    P2["8-way PMD sprites<br/>give facing for free"]
    P3["Surf floods, Thunderbolt chains<br/>through water, Ember burns grass,<br/>Sandstorm hides units"]
    P4["Sleep and paralysis cancel<br/>a telegraphed attack"]
    P5["Gust, Roar, Dragon Tail<br/>shove into hazards"]
    P6["Region type maps pick<br/>chunks, roster, weather"]
  end
  FFT --> HGT --> P1
  TOR --> FACE --> P2
  TRI --> ELEM --> P3
  ITB --> INTENT --> P4
  ITB --> PUSH --> P5
  XCOM --> CHUNK --> P6
  classDef insp fill:#2e1f47,stroke:#c084fc,color:#ececf1
  classDef mech fill:#1e2a44,stroke:#60a5fa,color:#ececf1
  classDef poke fill:#3d2f10,stroke:#fbbf24,color:#ececf1
  class FFT,TOR,TRI,ITB,XCOM insp
  class HGT,FACE,ELEM,INTENT,PUSH,CHUNK mech
  class P1,P2,P3,P4,P5,P6 poke
```

## 3. One battle round

Drawn Into the Breach style (enemies show intent, then you act). A Speed-based turn order like FFT is open call D3.

```mermaid
flowchart TD
  S["Battle start:<br/>place your team on spawn tiles"] --> E1["Enemy phase plans:<br/>target tiles and arrows shown"]
  E1 --> Y["Your phase: each unit moves,<br/>then acts or waits, then picks facing"]
  Y --> R["Resolve each action:<br/>damage, type x terrain,<br/>push, status, tile changes"]
  R --> X["Enemy phase executes<br/>what it telegraphed<br/>unless stopped or moved"]
  X --> W{"Objective met<br/>or your team lost?"}
  W -->|no| E1
  W -->|won| Z["Draft, back to the region map"]
  W -->|lost| L["Run ends"]
  classDef enemy fill:#3d1a1a,stroke:#f87171,color:#ececf1
  classDef you fill:#163a22,stroke:#4ade80,color:#ececf1
  class E1,X enemy
  class Y,R you
```

## 4. Making a map

Handmade chunks laid out at random, then checked. Random height alone tends to make flat or unfair maps.

```mermaid
flowchart LR
  R["Region and biome<br/>from the type maps"] --> C["Pick 4 to 9<br/>handmade chunks"]
  C --> L["Lay them out on<br/>a 12x12 to 16x16 grid"]
  L --> H["Stitch heights,<br/>smooth the seams"]
  H --> V{"Valid?<br/>BFS: every spawn reaches<br/>every objective,<br/>cover is balanced"}
  V -->|no| C
  V -->|yes| O["Place objectives,<br/>spawns, hazards"]
  O --> W["Roll weather and the<br/>enemy roster from the region pool"]
  W --> B["Battle"]
  classDef check fill:#3d2f10,stroke:#fbbf24,color:#ececf1
  class V check
```

## 5. What comes from PokeSurvivor

Green carries over, amber carries over changed, red is left behind.

```mermaid
flowchart LR
  PS["PokeSurvivor 1.0"]
  PS --> K1["Pokedex, moves,<br/>learnsets, type chart"]
  PS --> K2["G.Stats mainline formulas<br/>closer to mainline than now"]
  PS --> K3["Status and stat stages<br/>map onto turns"]
  PS --> K4["Pokebox copies:<br/>IVs, EVs, natures"]
  PS --> K5["Items, gyms,<br/>region progression"]
  PS --> K6["Leader planner:<br/>goals, plans, scores"]
  PS --> K7["BFS pathing,<br/>region type maps"]
  PS --> K8["PMD sprites,<br/>8 directions"]
  PS --> A1["Move shapes<br/>become tile patterns"]
  PS --> A2["Knockback<br/>becomes push"]
  PS --> A3["Weather and hazards<br/>become terrain"]
  PS --> A4["Level-up cards become<br/>the between-battle draft"]
  PS --> A5["Team swap becomes<br/>a bench switch"]
  PS --> D1["Spawner, waves,<br/>tides, density"]
  PS --> D2["Dodge, Shake off,<br/>real-time aim"]
  PS --> D3["XP orbs, magnet"]
  PS --> D4["Spatial grid and<br/>horde perf work"]
  classDef keep fill:#163a22,stroke:#4ade80,color:#ececf1
  classDef adapt fill:#3d2f10,stroke:#fbbf24,color:#ececf1
  classDef drop fill:#3d1a1a,stroke:#f87171,color:#ececf1
  classDef root fill:#2e1f47,stroke:#c084fc,color:#ececf1
  class K1,K2,K3,K4,K5,K6,K7,K8 keep
  class A1,A2,A3,A4,A5 adapt
  class D1,D2,D3,D4 drop
  class PS root
```

## 6. Open calls (undecided)

| # | Question | Options | Why it matters |
|---|---|---|---|
| D1 | Can attacks miss? | Shown hit chance (Fire Emblem, mainline accuracy) or always hit (Into the Breach) | Decides the game's personality: Pokemon feel vs pure puzzle |
| D2 | What happens on a faint? | Permadeath for the run, or faint and back after the battle | How much a loss hurts, and how much the Pokebox matters |
| D3 | Turn order | Phases: all yours, then all theirs (FE, Into the Breach), or a Speed-based timeline (FFT) | Speed as a real stat vs clean telegraphs |
| D4 | Map size | 12x12 or 16x16 | Bigger means more walking per decision |
| D5 | Team on the field | 4 or 6 (bench for the rest) | Turn length and readability |
| D6 | Engine | Godot + GDScript, or Godot + Rust | About 20 units a map: GDScript is enough, and its web export suits a free fan game |

Free fan game: keep it free and never sell anything tied to it. Takedown risk grows with attention either way.
