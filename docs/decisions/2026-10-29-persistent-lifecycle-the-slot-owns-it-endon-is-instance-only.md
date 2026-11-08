## 2026-10-29, Persistent lifecycle: the slot owns it, endOn is instance-only (Jess)
`persistent: true` spawns the move while its slot is active and the owner unstunned, ends it on a swap, stun or faint, and respawns it after any instance end, so an aura is `persistent` alone and a pulse is `persistent` plus `endOn` time. A persistent move never lists notActive; a move that is not persistent needs an endOn unless it is a self-cast, whose effects carry their own duration. Supersedes the review 9.2 C13 wording "persistent requires an endOn notActive"; notActive was removed from the six persistent moves.
Canonical: docs/MOVE-AXIS-SCHEMA.md, `persistent` row; combat-architecture section H, H25

