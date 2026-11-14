# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-14 evening, Quick (work). Branch: balance/109-template-check (off main). No branch rules file.

## START HERE (next session, either tool)
1. #109: rule the Decider scale fix before any round 2 numbers. Finish wins on cost, so goal weights cannot move it
   (Brock Finish 81%, Misty 60% at the natural gate). Options: (1) weights scale the whole score (recommended),
   (2) per-leader cost profiles, (3) raise base values. A rule change: prose plan first. Evidence: docs/ASCII Concept
   Maps/109 - Round 1 Trace Findings.md (top section).
2. Then rerun round 1's numbers with the trace (natural 4:00 gate, Misty's 4 min later), then round 2 if needed.
3. #111 after #109, then #122. Any time: #121, #120, #110, #57, #58.

## Where we are on the branch
- Target feel agreed: Brock a ranged wall, Misty a fast aggressor (decision 2026-11-14-109-brock-and-misty-target-feel).
- Built: round 1 numbers; T3 (a trigger may set goal weights, merged); the dev decision trace (G.Debug.leaderTrace,
  leaderMark; js/core/debug-leader-trace.js); the whole-kit read (Belief sizes its own hit from the real hit contract,
  every projectile of a fan, its own defense; K1 to K4). leader-ai-harness 682 passed; check.js reported clean.
- Traces in tools/cache/ (git-ignored). Ranged moves now win and Brock holds; the scale problem above remains.

## Watch
- G.Debug.gym(n) at 0:00 makes a level 5 leader with its full loop 1 card pool. Test at the natural gate.
- The trace does not record the leader's level; add it with the next trace change.
- 16i has no parity check of the leader's hit estimate against a real hit on a plain player (planned, not built).
- buffValue still sizes an attack buff visible-only (follow-up).
- Brock 13 and Misty 16 card stacks over the 11 a player holds at 12 (#122).
- smoke-status-fx frame check flaky on the work machine. Quick writes to the device: read the file back.
- Merge messages: -F <file>, not stdin. GitHub from Quick: one issue per REST call (lists come back excerpted).

## Open owner decisions
- The #109 scale fix (above). #49. #107 (trigger limits; T3 used the authored limits for goal weights only). #86; #99;
  #93; #97 (blocks #95); #60 Bait. Acquisition: Accelgor, Kingambit, Gholdengo, R1 Shedinja, R4 Alcremie N, ball tiers,
  UberElite time limit.

Rules: CLAUDE.md.
