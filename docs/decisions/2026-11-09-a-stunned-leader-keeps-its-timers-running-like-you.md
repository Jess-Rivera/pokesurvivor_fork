## 2026-11-09, A stunned leader keeps its timers running, like you (Jess)
Found on slice 5a (#34): while a Player-entity leader is stunned its frame does not run, so its move timers, heal over time and commitments pause; yours keep running while you are stunned. Ruling: no authored difference here. A stunned leader behaves exactly as a stunned player does: the stun blocks its inputs only, and its timers, heal over time and commitments keep running. The fix is tracked in an issue (see DECISIONS.md index line).
Canonical: docs/LEADER-AI.md (YOUR RULES: stuns that block input)
