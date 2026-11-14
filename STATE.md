# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-14 morning, Quick (work). Branch: feature/gym-leader-ai (rules:
docs/branch-rules/feature-gym-leader-ai.md).

## START HERE (next session, either tool)
1. GitHub: run cards B (balance issue), C (#60 comment) and F (test sweep issue) in
   docs/ASCII Concept Maps/39 - Issue Drafts.html; close #30 (check.js passes); close #108 (39b) as not planned,
   since the ruling is not to file it (decision 2026-11-14-39-closes-on-feel-test-no-39b). #39 is closed.
2. Gyms 3 to 8: merge first and migrate after, or migrate on this branch first. #30 went green without migrating,
   so "merge first" is open. Then fix docs/proposals/host-model-plan.md line 152, which disagrees with the branch rules.
3. Full leader-ai-mutate run (--full; not rerun since 16f was rewritten), then the structural review against main,
   then the merge.
4. Brock and Misty tuning (the balance issue); starting notes: 39a - Feel Test Retune Plan.html (not approved).

## Where we are
- 39a built and closed: goal weights and tag multipliers authorable; Brock a wall, Misty tempo; feel test: distinct,
  overtuned. Bait parked in code (decision 2026-11-14-bait-parked-in-code; it won 97 to 98% of think ticks).
- Tests check relations, not values (docs/TEST-FIRST.md step 3, decision 2026-11-14-tests-check-relations-not-values;
  the Move review rule follows it). Mechanics harnesses fight test leaders (tools/test-leaders.js). 16e counter-play,
  learning and sharpness duels retired (their scripted player stood still).
- #30 met: check.js all passed; gym-harness's card count removed; the Zinc check sat on Tackle (melee cushion).
- Tools: MUTATE_ONLY=word,word in tools/mutate-runner.js; harnesses print only failures.
- Plan and map pages are now dark HTML in docs/ASCII Concept Maps/ (not .txt).

## Watch
- Brock 13 and Misty 16 card stacks at level 12, over the 11 a player could hold; warns every run, not filed.
- leader-ai.js 1090 lines, gyms.js about 1254: the structural review flags both.
- A full leader-ai-mutate run takes about 22 min; inside a slice use MUTATE_ONLY.
- Quick writing to the device: read the file back in a separate call (a write once failed to land).
- Jess's Git Bash: noclobber is on (use >|); node output cannot be piped or redirected (winpty).
- GitHub from Quick: api.github.com/search/issues?q=repo:Jess-Rivera/pokesurvivor_fork+is:issue+is:open.

## Open owner decisions
- Gyms 3 to 8 timing (above). #107 (refuse or rebuild the bag); #86; #99; #93; #97 (blocks #95); #60 Bait.
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite
  time limit.

Rules: CLAUDE.md. Today's pages: docs/ASCII Concept Maps/ (39 x2, 39a x2, 39 - Issue Drafts).
