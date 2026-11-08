# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-08, Claude Code (home), slice 5a built.
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. Jess feel-tests #34 (slice 5a): Misty and Brock should play as before.
3. Then open #39 (slice 5b, personalities) by agreeing its goal, done check and test.

## Where we are
- Slice 5 split (decision 2026-11-08-leader-ai-slice-5-split-gymbrain-out-first-then-personalities): 5a #34, 5b #39.
- 5a built 2026-11-08 (Needs Playtest): GymBrain is gone from Player-entity leaders. Movement and slot choice are
  G.LeaderAI's (steer, legsOf, pickSlot); the tell, reach filter and heal cap are G.GymLeader.Caster, on your sim
  scheduler (G.MoveSim.turn, castDue hook). Shared tuning G.Boss.TUNE until slice 12. Drift vs GymBrain (accepted):
  at most 3 frames on a cast, 4.6 px. Fixed on the way: the inactive recharge skipped by group, not slot.
- Slices 1 to 4 shipped (#22, #31, #32, #33). Misty aggression 0.68, learnRate 2; Brock 0.35.
- Test: leader-ai-harness.js (470, two parity traces re-recorded on 5a), leader-ai-mutate.js (92/92).
- Found, not acted on: a leader's move timers, heal over time and commitments pause while it is stunned (its frame
  does not run); yours keep running. An unauthored difference: Jess to rule.
- #38 swap keeps moves in flight, #37 font swap: filed, not started. #36 item reveals blocked. Roster UI #35.
- Gyms 3 to 8 stay on the old brain until slice 12. Slice 8 DPS report (Q10) still unread.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30. Lint 0 errors, 72 warnings.

## Next
See TODO.md (the handoff, with issue numbers).

## Watch
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- boss-split-mutate "the arena spawns a plain enemy" is STALE (older than slice 1).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52).
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.

## Open owner decisions
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; the stunned-leader timers.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
