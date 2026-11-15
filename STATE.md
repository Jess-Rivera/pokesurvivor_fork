# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-15, Claude Code (home). Branch: main (balance/109-template-check merged 2026-11-15, 4eb7e1e9). Next branch: one for #124 (economy pass). No branch rules file.

## START HERE (next session, either tool)
1. #109 and #123 closed 2026-11-15 (feel test passed) and merged to main.
2. Next: #124 economy + #125 XP (queue in TODO.md, set 2026-11-15). #111 gyms 3 to 8 is parked.
3. Any time: #121, #120, #110, #57, #58.

## What just landed on main
- Score rule: goal weights scale the whole net (value minus cost) when above 0; weight 0 never ranked. Planned hits
  deal no more than your HP left. Brock Finish 0.35 (replay: Finish 57% to 22%). Misty unchanged.
- #123: movement 0.95x to 1.05x for every Player and wild enemy; dodge recharge 0.8x to 1.2x by Speed (8.75 s to 5.8 s).
- tools/replay-leader-trace.js rescores a saved trace under other weights (plans stay as recorded).
- check.js clean: 60 harnesses (leader-ai 688, speed-band 15); smoke-gym and smoke-leader-overlay pass.
- Findings: docs/ASCII Concept Maps/109 - Round 1 Trace Findings.md (top). Home traces were not at the natural gate.

## Watch
- The trace does not record the leader's level; add it with the next trace change.
- Misty's "Kite" share is Water Pulse landing from outside your reach, not backing off (the label misleads).
- Plain wild chasers now walk within about 10% of each other; class multipliers carry the texture.
- 16i has no parity check of the leader's hit estimate against a real hit on a plain player.
- Brock 13 and Misty 16 card stacks over the 11 a player holds at 12 (#122).
- smoke-status-fx frame check flaky on the work machine.

## Open owner decisions
- #49 (close or umbrella). #107 (trigger limits). #86; #99; #93; #97 (blocks #95); #60 Bait. Acquisition: Accelgor,
  Kingambit, Gholdengo, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite time limit.

Rules: CLAUDE.md.
