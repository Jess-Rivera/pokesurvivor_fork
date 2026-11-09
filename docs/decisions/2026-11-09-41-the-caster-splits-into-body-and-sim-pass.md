## 2026-11-09, #41: the Caster splits into Body and SimPass; a bonded group fires as yours (Jess)
Opening #41. G.GymLeader.Caster mixed three roles (Decider scoring, Body refusals, SimPass wind-up and casts), so it is split and stops existing by that name: its acceptance checks go to the Body (G.GymLeader), its wind-up and casts to the leader's SimPass, its scoring to the Decider (G.LeaderAI). Code names follow the four terms.
A bonded group acts exactly as a bonded group of yours, whatever it holds: a heal bonded into an attack group fires with the group. What goes in a bond is Jess's per-gym balance call. Nothing below the slot is chosen: the Decider presses a slot, the Body accepts or refuses, the SimPass fires the whole group (its wind-up is the longest member's, as today).
The self heal: the Decider scores a heal slot low while the mon is unhurt; the score is a balance value Jess tunes.
Names: item 5's restriction is `wildStatusDivisor`. Built one commit per step.
Canonical: docs/LEADER-AI.md (FRAME, THE AI CHOOSES ITS ATTACKS)
