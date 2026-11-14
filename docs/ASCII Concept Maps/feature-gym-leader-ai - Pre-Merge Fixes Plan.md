# feature/gym-leader-ai: Pre-Merge Fixes Plan (F2, F4)

From the structural review (decision 2026-11-14-structural-review-new-files-count). Both fixes are behavior-neutral.
F7 is done already (tools and config). F1, F3, F5 and F6 are issues for after the merge.

```mermaid
flowchart LR
  F2["F2 leader-ai.js<br/>1089 to about 975"] --> CK["check.js all passed<br/>MUTATE_ONLY on moved mutants"]
  F4["F4 pause key<br/>4 questions to 1"] --> CK
  F7["F7 mutate output<br/>ignored, untracked"] --> CK
  CK --> FT["Jess: one-minute feel test<br/>(should feel identical)"]
  FT --> M["Merge to main"]
```

## F2: leader settings move into their own file

```mermaid
flowchart TB
  subgraph NOW["leader-ai.js today (1089 lines)"]
    D["Decider logic"]
    S["Settings resolution<br/>settings, intelligence for loop,<br/>setting from intelligence, override warning<br/>(43 lines)"]
    T["Tuning tables<br/>BASE, INTELLIGENCE_CURVES, CONF, UNSTICK,<br/>reflex floor, growth max, warn-at,<br/>swap, line and bag timings (74 lines)"]
  end
  subgraph AFTER["After"]
    D2["leader-ai.js<br/>Decider logic, about 975 lines<br/>plus one alias block"]
    N["NEW js/data/leader-ai-settings.js<br/>G.LeaderSettings<br/>the tables plus the resolution"]
  end
  S --> N
  T --> N
  D --> D2
  D2 -. "G.LeaderAI.BASE and the rest<br/>point at G.LeaderSettings" .-> N
```

| Item | Detail |
|---|---|
| Stays in leader-ai.js | NONE, EPS, FAR, LOG_N, the dev switches (off, seed, capSeed), the Bag class: logic constants, not tuning |
| Why js/data | It is the authored-leader baseline BALANCE.md "Leader AI" tunes; gyms.js already holds helpers beside data (perLoop, validate) |
| Readers | Unchanged. G.LeaderAI keeps every name as an alias, so gyms.js (validator), gym.js, gym-arena.js, leader-belief.js and the harness read what they read today |
| Load order | New script in the dev.html data block after gyms.js; LeaderSettings in the NEED array before LeaderAI. It reads G.U and G.Gyms only when called |
| Docs | LEADER-AI.md code line, BALANCE.md "Leader AI" pointer, ONBOARDING module map, changelog (internal, one line) |
| Tests | leader-ai-mutate: 7 intelligence and curve mutants retarget to the new file (their text moves with it). A wiring check that each alias is the same object as its G.LeaderSettings entry. Harness 16f, 17f, check.js all passed |
| Risk | Low. A missed alias shows as "failed to load" or undefined at gym start, which check.js and smoke-leader-overlay catch |

### Decision

```mermaid
flowchart LR
  Q{"Keep G.LeaderAI.* aliases?"}
  Q -->|"yes (recommended)"| A["One alias block; no reader,<br/>harness or usage-line mutant changes"]
  Q -->|"no"| B["Every reader moves to G.LeaderSettings:<br/>about 60 lines in leader-ai.js plus 5 files;<br/>usage-line mutants (CONF.pull, UNSTICK.tie,<br/>LINE_WAIT) all need new text"]
```

## F4: the pause key asks the pause menu one question

```mermaid
sequenceDiagram
  participant K as Pause key (game.js)
  participant P as G.PauseMenu
  Note over K,P: Today, while paused with the menu open
  K->>P: isOpen?
  K->>P: answerNo? (End Run is asking)
  K->>P: blockResume? (item goes back, pocket asks)
  K->>P: isClosing? then open, else close and resume
  Note over K,P: After
  K->>P: pause key pressed (resume when done)
  P-->>K: handled, or closes and calls resume
  K->>K: state back to playing
```

| Item | Detail |
|---|---|
| Where | game.js togglePause, the paused branch; pause-menu.js gains one entry beside answerNo and blockResume |
| What moves | The order of the four checks moves into the pause menu unchanged: End Run's No first, then the item give-back, then reopen-while-closing, then close and resume |
| What stays | Co-op branch, the Run Review branch after a run, the no-menu fallback, the quiet dev pause |
| Dropped from the review | startRun's three hides: they occur once, so a helper would only move lines (YAGNI) |
| Tests | No mutant pattern sits on those game.js lines (checked). smoke-pause-menu and smoke-pause stay green; run-info-mutate and pokebox-evs-mutate unaffected |
| Feel test | Esc mid-close turns it around; Esc on End Run's prompt answers No; Esc with a held item puts it back first |
| Risk | Low. Same four outcomes, same order |
