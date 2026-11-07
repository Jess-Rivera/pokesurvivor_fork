# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07 evening, Quick (work machine). Branch: feature/gym-leader-ai (entity model merged, checks green).

## START HERE (next session, either tool)
1. Jess answers G1 to G11 in docs/proposals/gym-leader-ai-design.md (drafted 2026-11-07, [Proposed]). No code until then.
2. On approval: P1 = slice 9a prose plan (map v2 A1 to A5 plus the rolling windows), then build.
3. Brock feel test (`G.Debug.gym(1)`, `G.Gym.debugLoop = 2`) still owed if not done.

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
