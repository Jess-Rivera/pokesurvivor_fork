## 2026-11-11, side features branch off feature/gym-leader-ai, not main (Jess)
Other features (UI work and the like) branch off feature/gym-leader-ai and merge back into it when done, as feature/leader-roster-ui did. Each finished feature brings the work back to the leader AI branch, which keeps it the main line and keeps Jess returning to it. Main gets everything when gym-leader-ai merges (after #30).
Considered: merging gym-leader-ai into main now (main would carry two red harnesses) or closing it at a checkpoint after #30; Jess chose the side-branch pattern.
Canonical: docs/branch-rules/feature-gym-leader-ai.md ("Standing rulings").
