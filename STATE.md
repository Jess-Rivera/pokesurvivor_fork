# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07 close-out, Quick (work machine). Branch: feature/entity-model (closing).

## START HERE (next session, either tool)
1. Run the close-out checks: `node tools/check.js`, then the mutate runners gym-leader, leader-stats,
   leader-team, boss-owner, then `node tools/smoke-gym.js` (Misty, Brock, Lt. Surge). Paste any FAIL/MISSED/STALE.
2. Feel test Brock: `G.Debug.gym(1)`, then `G.Gym.debugLoop = 2` (Geodude, then Onix).
3. Green: commit, merge feature/entity-model into main, cut feature/gym-leader-ai (the assistant gives the commands).
4. New branch, first task: the GymLeaderAI design doc (Director-style, see docs/Director AI Proposal.md). No code
   until Jess signs off. Starting material: the slice 9 v2 map and slice 8's sense().

## Where we are
- Entity model slices 1 to 8 built; 7b and 8 checks green (Jess). Close-out built, checks owed:
  Brock on G.GymLeader beside Misty (hpMult {1: 16, 2: 12}, Misty's restrictions, no enrage, no touch).
  Map: docs/ASCII Concept Maps/Entity Model Close-Out - Brock Switch.txt.
- Gyms 3 to 8 stay on the old brain for the playtesters (copy in about 4 days). Two leader paths until slice 12.
- Slice 8 DPS report (Q10) still unread: no tempo or power change yet.
- Lint: 0 errors, 69 warnings in inherited code (do not --fix).

## Next
1. Close-out checks, merge, new branch, design doc.
2. A real gym loop counter (loop is dev-set only: G.Gym.debugLoop).
3. Owed feel tests: win a gym, swap before spending the link, spend it on a benched member; slice 1 Elite fight.
Also: delete merged branches; Codex menu.

## Watch
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- If gym-leader-harness section 12 FAILs on defense-curl: Brock's Tackle may starve his buff visit (slice 8 rule).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder inert until the AI dodges.
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52).
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.
- GitHub API empty again: TODO.md board mirror is from 2026-11-04.

## Open owner decisions
- Board cleanup: close #5 (slice 7a replaced it); stale `blocked` on #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
