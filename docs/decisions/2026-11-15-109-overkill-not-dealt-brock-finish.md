---
title: "#109: a planned hit deals no more than your HP left; Brock's Finish weight 0.35 (Jess)"
date: 2026-11-15
issues: [109]
area: gyms
canonical: "docs/LEADER-AI.md \"COST\"; BALANCE.md \"Leader AI\"; #109."
---
# 2026-11-15, #109: a planned hit deals no more than your HP left; Brock's Finish weight 0.35 (Jess)

The 2026-11-15 traces showed Brock's Maintain plan counting about a full HP bar dealt when you had 0.024 left, so it beat
Finish right at the KO. Ruling: in the planner a step's damage dealt is capped at your HP not yet dealt earlier in the
same plan, for every goal. With that, Finish wins near a KO on its own. Brock's Finish weight is 0.35 (replay of his
trace: Maintain 73%, Finish 22%, from Finish 57% at weight 1). Misty keeps Finish at 1. Approved without a separate plan
(minor change; trace findings section "Overkill counts as damage dealt").

Canonical: docs/LEADER-AI.md "COST"; BALANCE.md "Leader AI"; #109.
