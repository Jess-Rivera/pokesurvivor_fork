## 2026-11-09, #51 opening: slot stance ignored, parity traces retired, the `set` trigger kept (Jess)
The split stays: #51 builds six verbs (Close to reach, Hold at range, Back off, Wait for a window, Use slot, Recover); Dash in, Draw your shot, Dodge your shot and Swap are #52.
1. The planner ignores each slot's authored `stance` (close, far, mixed). Maintain's preferred range is the code baseline `range` until #39 authors it per leader.
2. The two recorded parity traces (docs/proposals/leader-ai-trace.json, the slice 1 trace, and leader-ai-5a-trace.json) are retired as history, since #51 changes behavior by design. The determinism duel (one seed, one trace) replaces them.
3. A trigger's `set` (change a setting for a while, Brock's half-HP aggression 0.5 for 10 s) is not a forced action and stays. Only the forced `slot` and `swap` trigger actions become the unused stub; neither leader authors one.
Canonical: docs/LEADER-AI.md "The Decider (#49)" and "TRIGGERS"
