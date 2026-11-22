# 139 - Friendship (for 8c, 2026-11-21, [Open])

SUPERSEDED: friendship minutes (F0 to F9) were replaced by the grilling's friendship model (decision
2026-11-21-139-oor-level-candy-sources-friendship-model). Git history holds the old draft.

## Settled
- The copy's friendship field, 0 to 255 (copies.js h, defaults to the species' base friendship), tracked on every
  copy as data for later features (friendship bonuses, boss dialog, the secret end-game fight).
- Evolve thresholds are mainline: 160; 220 for Pichu, Chingling and Swadloon. Friendship lines take no candy.
- Inputs (not a closed list): run time alive raises it; run time fainted and each faint lower it; fatigue at the
  run start scales gains down and losses up; starting at 80%+ fatigue adds an exhausted mult on gains (about 0.5
  at 80% down to 0.1 at 100%, losses untouched). Applied once at the run end, on every end.

## [Open], for its own grilling before 8c
The rates and the exact multiplier curves; which other inputs count; how fatigue is earned and recovered (a stub
until then, own issue).
