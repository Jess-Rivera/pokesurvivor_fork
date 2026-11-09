## 2026-11-09, #42 item 14: two sides, HumanPlayers and everyone else (Jess)
Targeting is by side, written explicitly (not inferred from "has foes()"): a HumanPlayer's attacks target non-HumanPlayer entities; everything else targets HumanPlayers. Leader moves never hit wild enemies, and wild enemies never hurt leaders. It scales to multiplayer as is, since another player is another HumanPlayer. Leaders also leave the enemy list for one Player-entity frame list. Build: #46 (after #43).
Canonical: docs/LEADER-AI.md (FRAME); COMBAT-RULES "Host model"
