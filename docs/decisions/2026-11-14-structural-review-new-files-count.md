---
title: "structural review of feature/gym-leader-ai: new files count against the 1000-line rule (Jess)"
date: 2026-11-14
issues: []
area: docs
canonical: ".claude/skills/structural-review/SKILL.md, \"The 1000-line rule (adapted)\"."
---
# 2026-11-14, structural review of feature/gym-leader-ai: new files count against the 1000-line rule (Jess)

D1: a file that does not exist on main counts as crossing 1000 lines when the branch brings it in over 1000, whatever
date list names it. For this branch: leader-ai.js (1089) is cut under 1000 before the merge (F2); hud-overlay.js
(1232) is split as the first issue after the merge (F1), an accepted exception since the split is its own slice.
D2: F4 (pause key in game.js) and F7 (committed mutate output) go in before the merge; F3 (planner verb table), F5
(Region Best into run-stats) and F6 (debug.js split) become issues.

Canonical: .claude/skills/structural-review/SKILL.md, "The 1000-line rule (adapted)".
