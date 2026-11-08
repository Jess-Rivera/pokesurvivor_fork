# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-08, Claude Code (home). Branch: chore/docs-cleanup (from main), #26 and #27 committed, not yet pushed or merged.

## START HERE (next session, either tool)
1. Jess pushes and merges chore/docs-cleanup into main (commands in the 2026-11-08 DEVLOG stop line), then pulls main into feature/gym-leader-ai. Do not resume gym work before that.
2. Check that /triage loads in a new session (it did not appear in the skill list this session). Then #28 (architecture skill) is unblocked.
3. Then the gym AI: Jess answers G1 to G11 in docs/proposals/gym-leader-ai-design.md ([Proposed]); order and issue numbers are in TODO.md.

## Where we are
- Workflow overhaul done 2026-11-08: the assistant may commit and manage issues, board and PRs (CLAUDE.md "Git and GitHub", enforced by the hook); TODO.md is a handoff pointing at issue numbers; "catch me up" runs a read-only briefing (CONTEXT.md). Skills adopted: grilling, triage, diagnosing-bugs. Docs: docs/TEST-FIRST.md (say "tdd"), GLOSSARY.md (game language), docs/SPANISH-CODE-REFERENCE.md. landing-skills/ stays untracked until #28 (improve-codebase-architecture) resolves.
- DECISIONS.md is now an index; each decision is a file in docs/decisions/, cited by file name (CLAUDE.md "Cross-document IDs"). Follow-up #29 (promote review CP1 rulings).
- Entity model slices 1 to 8 built; 7b and 8 checks green (Jess). Close-out built, checks owed:
  Brock on G.GymLeader beside Misty (hpMult {1: 16, 2: 12}, Misty's restrictions, no enrage, no touch).
  Map: docs/ASCII Concept Maps/Entity Model Close-Out - Brock Switch.txt.
- Gyms 3 to 8 stay on the old brain for the playtesters (copy in about 4 days). Two leader paths until slice 12.
- Slice 8 DPS report (Q10) still unread: no tempo or power change yet.
- Lint: 7 errors (all in .claude/hooks/guard-git.js, new), 69 warnings in inherited code (do not --fix).
- Red harnesses seen 2026-11-08 on a docs-only branch: gym-harness (Misty loop 1 pool is 13 stacks) and leader-stats-harness (Misty: Zinc softens special hits only). Not investigated.

## Next
See TODO.md (the handoff, with issue numbers).

## Watch
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- If gym-leader-harness section 12 FAILs on defense-curl: Brock's Tackle may starve his buff visit (slice 8 rule).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder inert until the AI dodges.
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52).
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.

## Open owner decisions
- Board cleanup: see TODO.md item 5.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
